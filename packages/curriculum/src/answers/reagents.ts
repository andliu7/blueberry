/**
 * Supply the reagents, and the ordered synthesis that is the same shape read
 * backwards.
 *
 * CLAUDE.md is explicit that a synthesis is not a fifth answer shape: "the
 * product is given and the reagents are the answer. It is not a fifth shape, and
 * it must not become one, because retrosynthesis grading is the same comparison
 * run in the other direction." So `direction` is a field on this answer and the
 * comparison below does not read it. It is there for the prompt, the pathway,
 * and any later analysis that wants to count retrosynthesis attempts separately.
 * If a function in this file ever branches on it, something has gone wrong.
 *
 * WHY A REAGENT IS A TOKEN AND NOT FREE TEXT.
 *
 * Matching is exact after whitespace normalisation, plus authored equivalence
 * groups. That is only honest because the student does not type these: CLAUDE.md
 * gives Phase 2's interaction layer a reagent input mode, so the tokens arriving
 * here come from a controlled vocabulary the same way an option id does. The
 * alternative, guessing that "sodium borohydride" and "NaBH4" and "nabh 4" are
 * one thing, is a natural language problem wearing a chemistry problem's coat,
 * and getting it wrong marks right answers wrong.
 *
 * Equivalence groups are the authored escape hatch for the cases that are real
 * chemistry rather than spelling: PCC and Swern conditions for the same partial
 * oxidation, LiAlH4 and NaBH4 where either will do the reduction.
 */

import type { CurriculumCauseId } from "../causes.js";

export interface ReagentStep {
  /** The reagents present together in one flask, in no particular order. */
  readonly reagents: readonly string[];
  /** Optional authored note, such as "then aqueous workup". Never compared. */
  readonly label?: string;
}

export interface ReagentState {
  readonly kind: "reagents";
  readonly steps: readonly ReagentStep[];
}

export type ReagentMode = "set" | "sequence";
export type ReagentDirection = "forward" | "retrosynthesis";

export interface ReagentsAnswerSpec {
  readonly kind: "reagents";
  readonly mode: ReagentMode;
  readonly direction: ReagentDirection;
  readonly steps: readonly ReagentStep[];
  /**
   * Groups of interchangeable reagents. Every member of a group compares equal
   * to every other member.
   */
  readonly equivalents: readonly (readonly string[])[];
  /**
   * Whole answers that are also accepted, for a route that is genuinely
   * different rather than a spelling of the same one.
   *
   * This is the reagent shape's version of chem-core's
   * `correct_alternative_route`: a student who got there another legitimate way
   * is correct, and marking them wrong generates support mail.
   */
  readonly acceptedAlternatives: readonly (readonly ReagentStep[])[];
}

export interface ReagentsAnswerInput {
  readonly mode: ReagentMode;
  readonly direction?: ReagentDirection;
  readonly steps: readonly ReagentStep[];
  readonly equivalents?: readonly (readonly string[])[];
  readonly acceptedAlternatives?: readonly (readonly ReagentStep[])[];
}

/** Whitespace only. Case is preserved, because CO and Co are different things. */
export function normaliseReagent(token: string): string {
  return token.trim().replace(/\s+/g, " ");
}

type EquivalenceIndex = ReadonlyMap<string, string>;

function buildEquivalenceIndex(groups: readonly (readonly string[])[]): EquivalenceIndex {
  const index = new Map<string, string>();
  for (const group of groups) {
    const canonical = normaliseReagent(group[0] ?? "");
    if (canonical === "") {
      throw new Error("an equivalence group is empty");
    }
    if (group.length < 2) {
      throw new Error(`equivalence group ${canonical} has one member, so it equates nothing`);
    }
    for (const member of group) {
      const key = normaliseReagent(member);
      const existing = index.get(key);
      if (existing !== undefined && existing !== canonical) {
        throw new Error(`reagent ${key} is in two equivalence groups, ${existing} and ${canonical}`);
      }
      index.set(key, canonical);
    }
  }
  return index;
}

function canonicalise(token: string, index: EquivalenceIndex): string {
  const normalised = normaliseReagent(token);
  return index.get(normalised) ?? normalised;
}

function canonicalStep(step: ReagentStep, index: EquivalenceIndex): ReadonlySet<string> {
  return new Set(step.reagents.map((reagent) => canonicalise(reagent, index)));
}

function stepKey(step: ReagentStep, index: EquivalenceIndex): string {
  return [...canonicalStep(step, index)].sort().join(" + ");
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function sequencesEqual(
  a: readonly ReagentStep[],
  b: readonly ReagentStep[],
  index: EquivalenceIndex,
): boolean {
  if (a.length !== b.length) return false;
  return a.every((step, position) => {
    const other = b[position];
    return other !== undefined && setsEqual(canonicalStep(step, index), canonicalStep(other, index));
  });
}

export function createReagentsAnswer(input: ReagentsAnswerInput): ReagentsAnswerSpec {
  if (input.steps.length === 0) {
    throw new Error("a reagent answer with no steps says nothing");
  }
  if (input.mode === "set" && input.steps.length !== 1) {
    throw new Error(
      `mode "set" is one unordered flask and this answer has ${input.steps.length} steps. ` +
        `Use mode "sequence" if the order matters.`,
    );
  }
  for (const step of input.steps) {
    if (step.reagents.length === 0) {
      throw new Error("a reagent step with no reagents says nothing");
    }
    for (const reagent of step.reagents) {
      if (normaliseReagent(reagent) === "") {
        throw new Error("a reagent step contains an empty reagent token");
      }
    }
  }
  const equivalents = input.equivalents ?? [];
  // Throws on a malformed group. Building it here rather than lazily means the
  // defect surfaces when the corpus module is imported.
  buildEquivalenceIndex(equivalents);

  return Object.freeze({
    kind: "reagents" as const,
    mode: input.mode,
    direction: input.direction ?? "forward",
    steps: Object.freeze(input.steps.map((step) => Object.freeze({ ...step }))),
    equivalents: Object.freeze(equivalents.map((group) => Object.freeze([...group]))),
    acceptedAlternatives: Object.freeze(
      (input.acceptedAlternatives ?? []).map((alternative) =>
        Object.freeze(alternative.map((step) => Object.freeze({ ...step }))),
      ),
    ),
  });
}

export type ReagentVerdict =
  | { readonly outcome: "correct" }
  | { readonly outcome: "wrong"; readonly cause: CurriculumCauseId; readonly detail: string };

export function checkReagents(spec: ReagentsAnswerSpec, state: ReagentState): ReagentVerdict {
  const index = buildEquivalenceIndex(spec.equivalents);

  if (state.steps.length === 0) {
    return { outcome: "wrong", cause: "reagent_set_incomplete", detail: "no reagents submitted" };
  }
  if (sequencesEqual(spec.steps, state.steps, index)) return { outcome: "correct" };
  for (const alternative of spec.acceptedAlternatives) {
    if (sequencesEqual(alternative, state.steps, index)) return { outcome: "correct" };
  }

  if (spec.mode === "sequence") {
    if (state.steps.length !== spec.steps.length) {
      return {
        outcome: "wrong",
        cause: "synthesis_step_count_wrong",
        detail: `${state.steps.length} step(s) submitted, ${spec.steps.length} expected`,
      };
    }
    const expectedKeys = spec.steps.map((step) => stepKey(step, index)).sort();
    const submittedKeys = state.steps.map((step) => stepKey(step, index)).sort();
    if (expectedKeys.every((key, position) => key === submittedKeys[position])) {
      return {
        outcome: "wrong",
        cause: "synthesis_steps_out_of_order",
        detail: `the right steps in the order ${state.steps
          .map((step) => stepKey(step, index))
          .join(" then ")}`,
      };
    }
  }

  // Fall through to a whole answer set comparison. For a sequence this
  // deliberately ignores which step a reagent was in: at this point the student
  // has a different set of reagents, not a different arrangement of the same
  // ones, and naming the missing reagent is more use than naming the step.
  const expected = new Set(spec.steps.flatMap((step) => [...canonicalStep(step, index)]));
  const submitted = new Set(state.steps.flatMap((step) => [...canonicalStep(step, index)]));
  const missing = [...expected].filter((reagent) => !submitted.has(reagent));
  const extra = [...submitted].filter((reagent) => !expected.has(reagent));

  if (missing.length > 0 && extra.length === 0) {
    return {
      outcome: "wrong",
      cause: "reagent_set_incomplete",
      detail: `missing ${missing.join(", ")}`,
    };
  }
  if (extra.length > 0 && missing.length === 0) {
    return {
      outcome: "wrong",
      cause: "reagent_set_has_extra_reagent",
      detail: `extra ${extra.join(", ")}`,
    };
  }
  return {
    outcome: "wrong",
    cause: "reagent_set_does_not_match",
    detail: `missing ${missing.join(", ") || "nothing"}, extra ${extra.join(", ") || "nothing"}`,
  };
}

/**
 * Distractor matching for reagents: the same sequence comparison used for
 * correctness, run against the predicted wrong answer.
 *
 * The equivalence groups come from the problem's authored answer, so a
 * distractor written as "LiAlH4" also catches a student who chose the reagent
 * the author declared equivalent to it. That is the intended reading: the groups
 * describe the chemistry, not one particular answer.
 */
export function reagentStateMatches(
  target: ReagentState,
  submitted: ReagentState,
  equivalents: readonly (readonly string[])[],
  mode: ReagentMode,
): boolean {
  const index = buildEquivalenceIndex(equivalents);
  if (mode === "set") {
    const targetSet = new Set(target.steps.flatMap((step) => [...canonicalStep(step, index)]));
    const submittedSet = new Set(submitted.steps.flatMap((step) => [...canonicalStep(step, index)]));
    return setsEqual(targetSet, submittedSet);
  }
  return sequencesEqual(target.steps, submitted.steps, index);
}
