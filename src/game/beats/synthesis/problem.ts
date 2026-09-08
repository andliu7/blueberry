/**
 * The synthesis gap: a real multistep route drawn as a row of steps, with
 * exactly one blank in it. Read this header before trusting anything here.
 *
 * WHY THE PROBLEM IS DATA AND NOT A COMPONENT. A synthesis gap is authored
 * content, and the corpus below it is mined out of the owner's own exam and
 * worksheet keys. If the route lived inside JSX, adding a problem would mean
 * editing a component, and a critic could not tell an authoring mistake from a
 * rendering one. As data, a problem is a literal, the constructor refuses a
 * malformed one at IMPORT time (the same discipline packages/curriculum uses in
 * its corpus modules), and the renderer never decides anything.
 *
 * ONE GRADER, TWO INPUT SURFACES, AND THAT IS THE MASTERY LADDER.
 * At L2 the blank is filled from a bank of chips. At L3 the bank is gone and
 * the student types. Both paths end in the SAME curriculum checker, because a
 * chip carries the token list it stands for (`BankOption.answer`) rather than
 * only a label. That is the whole reason the two rungs cannot drift apart: the
 * L2 chip and the L3 typed string are graded by one call.
 *
 * THREE GAP KINDS, THREE CURRICULUM ANSWER KINDS, AND WHICH RUNGS EACH SERVES.
 *
 *   reagent   what goes over the arrow. Graded by `checkReagents`, which is the
 *             answer kind that already models accepted equivalents. L2 and L3.
 *   reactant  the partner that joins at this step. The bank chips carry real
 *             chem-core structures and the pick is graded by `checkStructure`,
 *             so two chips that are the same molecule drawn differently cannot
 *             both be on the board. L2 and L3; at L3 the student types the name
 *             and that string is graded by `checkReagents` like any other
 *             controlled token, because the shell has no structure input yet
 *             (Ketcher is lazy by budget, per CLAUDE.md).
 *   product   what the arrow makes, plus the reason it wins. Graded by
 *             `checkMajorProduct`. L2 ONLY, declared rather than inferred: the
 *             ranking argument is a choice by nature, and packages/curriculum
 *             refuses to grade free prose. A beat may declare FEWER levels than
 *             its kind allows, which is exactly what that rule is for.
 *
 * WHY THE SOURCE IS A REQUIRED FIELD. CLAUDE.md's authoring rule is that real
 * course material is mined for STRUCTURE and the content is ours. Recording the
 * file and the problem number on every entry is what makes that auditable: a
 * reviewer can open the same page and check the chemistry, and nobody has to
 * take a route on trust. A problem with no source does not construct.
 */

import type { MechanismState } from "@blueberry/chem-core";
import {
  assertOptionsValid,
  checkReagents,
  checkStructure,
  createMajorProductAnswer,
  createReagentsAnswer,
  createStructureAnswer,
  structureStateMatches,
  type MajorProductAnswerSpec,
  type ReagentMode,
  type ReagentsAnswerSpec,
  type StructureAnswerSpec,
} from "@blueberry/curriculum";
import type { ConceptId, MasteryLevel, NodeId } from "../types";
import { stepsFromOption } from "./parse";

/** Which piece of the row is missing. */
export type GapKind = "reagent" | "reactant" | "product";

export const GAP_KINDS: readonly GapKind[] = Object.freeze(["reagent", "reactant", "product"]);

/**
 * Where this route came from, by exact filename.
 *
 * `file` is the name as it sits in the owner's `reference images/` folder, which
 * is gitignored, so this is a pointer to a document a person can open rather
 * than a copy of it. `locator` says which problem on which page.
 */
export interface SynthesisSource {
  readonly file: string;
  readonly locator: string;
}

/**
 * One arrow in the row.
 *
 * `null` marks the blank, and there is exactly one `null` in a whole problem.
 * A sentinel rather than an empty string because "" is also what an author
 * writes by accident, and a blank the author did not mean is the one defect
 * this shape can rule out for free.
 */
export interface SynthesisStep {
  readonly id: string;
  /** Over the arrow. `null` is the blank on a reagent or reactant gap. */
  readonly over: string | null;
  /** The molecule this arrow makes. `null` is the blank on a product gap. */
  readonly produces: string | null;
  /** Authored, shown after the attempt. Why this step is where it is. */
  readonly note?: string;
}

/**
 * One chip in the bank.
 *
 * `why` is the Tier 2 authored explanation for THIS chip: the specific mistake
 * an instructor knows students make here, written once and served forever at
 * zero tokens. `builds` is the field that makes result type three reachable:
 * a chip that is sound chemistry doing a DIFFERENT transformation names what it
 * actually builds, and the student is told that rather than told they are
 * wrong. `structure` is the real chem-core state a reactant chip stands for.
 */
export interface BankOption {
  readonly id: string;
  /** Display text. Subscripts and unicode live here and nowhere else. */
  readonly text: string;
  /** The tokens this chip stands for, step by step. ASCII, never display text. */
  readonly answer?: readonly (readonly string[])[];
  readonly why?: string;
  /** Set when this chip is valid chemistry, just not the requested route. */
  readonly builds?: string;
  /** Reactant gaps only: the structure this chip is. */
  readonly structure?: MechanismState;
}

/** A whole alternative answer that is also correct, carrying its own name. */
export interface TypedRoute {
  readonly label: string;
  readonly steps: readonly (readonly string[])[];
}

/**
 * The L3 answer: what the student types.
 *
 * Handed to `createReagentsAnswer`, so the accepted equivalents and the accepted
 * alternative routes are the curriculum package's, not a second implementation
 * of the same idea. `alternatives` carries a LABEL beside each accepted route,
 * which is what lets a correct answer by a different path be reported as
 * `correct_alternative_route` WITH the route named, per CLAUDE.md result type
 * two. Without the label that result type is a promise in a comment.
 */
export interface TypedAnswerInput {
  readonly mode: ReagentMode;
  readonly steps: readonly (readonly string[])[];
  readonly equivalents?: readonly (readonly string[])[];
  readonly alternatives?: readonly TypedRoute[];
  /** What the empty input says. Imperative, coach voice. */
  readonly placeholder: string;
}

export interface TypedAnswer {
  readonly spec: ReagentsAnswerSpec;
  /** Aligned by index with `spec.acceptedAlternatives`. */
  readonly alternativeLabels: readonly string[];
  readonly placeholder: string;
}

export interface SynthesisGapProblemInput {
  readonly id: string;
  readonly node: NodeId;
  readonly conceptIds: readonly ConceptId[];
  readonly gapKind: GapKind;
  /** One line, imperative. What to do, never what they got wrong. */
  readonly prompt: string;
  readonly brief?: string;
  /** Display name of the starting material, left end of the row. */
  readonly start: string;
  /** Display name of the target, right end of the row. */
  readonly target: string;
  readonly steps: readonly SynthesisStep[];
  readonly bank: readonly BankOption[];
  readonly correctOptionId: string;
  /** Product gaps only: the ranking arguments. */
  readonly reasons?: readonly BankOption[];
  readonly correctReasonId?: string;
  readonly typed?: TypedAnswerInput;
  /** The teaching line, shown after the attempt whatever the mark. */
  readonly why: string;
  readonly source: SynthesisSource;
  readonly diamonds: number;
  /** True when the row is read product first. Retrosynthesis is not a new kind. */
  readonly retro?: boolean;
}

export interface SynthesisGapProblem {
  readonly id: string;
  readonly node: NodeId;
  readonly conceptIds: readonly ConceptId[];
  readonly gapKind: GapKind;
  readonly prompt: string;
  readonly brief?: string;
  readonly start: string;
  readonly target: string;
  readonly steps: readonly SynthesisStep[];
  /** The step carrying the blank. Derived, so it cannot disagree with `steps`. */
  readonly gapStepId: string;
  readonly bank: readonly BankOption[];
  readonly correctOptionId: string;
  readonly reasons: readonly BankOption[];
  readonly correctReasonId: string | null;
  readonly typed: TypedAnswer | null;
  /** Built for a reactant gap. The structure the answer chip stands for. */
  readonly structureSpec: StructureAnswerSpec | null;
  /** Built for a product gap. Candidates plus the ranking arguments. */
  readonly majorProductSpec: MajorProductAnswerSpec | null;
  readonly why: string;
  readonly source: SynthesisSource;
  readonly diamonds: number;
  readonly retro: boolean;
  /** The rungs this problem serves. Product gaps are L2 only; see the header. */
  readonly levels: readonly MasteryLevel[];
}

const REAGENT_LEVELS: readonly MasteryLevel[] = Object.freeze([2, 3]);
const PRODUCT_LEVELS: readonly MasteryLevel[] = Object.freeze([2]);

/** Which rungs a gap kind can serve. Declared here, enforced in the constructor. */
export function levelsForGapKind(gapKind: GapKind): readonly MasteryLevel[] {
  return gapKind === "product" ? PRODUCT_LEVELS : REAGENT_LEVELS;
}

function requireText(value: string, label: string): void {
  if (value.trim() === "") {
    throw new Error(`${label} is empty`);
  }
}

function blankPositions(steps: readonly SynthesisStep[]): {
  readonly overBlanks: readonly string[];
  readonly producesBlanks: readonly string[];
} {
  const overBlanks: string[] = [];
  const producesBlanks: string[] = [];
  for (const step of steps) {
    if (step.over === null) overBlanks.push(step.id);
    if (step.produces === null) producesBlanks.push(step.id);
  }
  return { overBlanks, producesBlanks };
}

function toChoiceOptions(options: readonly BankOption[]) {
  return options.map((option) => ({ id: option.id, text: option.text }));
}

/**
 * Refuses a malformed problem, at import time.
 *
 * Every check here is a defect class that would otherwise reach a student: a
 * row with two blanks or none, a bank whose right answer the grader would mark
 * wrong, two reactant chips that are secretly the same molecule, a chip that
 * claims to build something and does not say what. None of them is repaired
 * quietly, because a repaired authoring mistake is an authoring mistake nobody
 * ever fixes.
 */
export function createSynthesisGapProblem(input: SynthesisGapProblemInput): SynthesisGapProblem {
  requireText(input.id, "problem id");
  requireText(input.node, `problem ${input.id} node`);
  requireText(input.prompt, `problem ${input.id} prompt`);
  requireText(input.start, `problem ${input.id} start`);
  requireText(input.target, `problem ${input.id} target`);
  requireText(input.why, `problem ${input.id} why`);
  requireText(input.source.file, `problem ${input.id} source file`);
  requireText(input.source.locator, `problem ${input.id} source locator`);

  if (input.conceptIds.length === 0) {
    throw new Error(`problem ${input.id} exercises no concept, so nothing can review it`);
  }
  if (input.steps.length < 2) {
    throw new Error(`problem ${input.id} has ${input.steps.length} step(s); a synthesis has at least two`);
  }
  if (input.diamonds < 0) {
    throw new Error(`problem ${input.id} awards a negative number of diamonds`);
  }

  const seenStepIds = new Set<string>();
  for (const step of input.steps) {
    requireText(step.id, `problem ${input.id} has a step with an empty id`);
    if (seenStepIds.has(step.id)) {
      throw new Error(`problem ${input.id} has two steps with id ${step.id}`);
    }
    seenStepIds.add(step.id);
  }

  const { overBlanks, producesBlanks } = blankPositions(input.steps);
  const totalBlanks = overBlanks.length + producesBlanks.length;
  if (totalBlanks !== 1) {
    throw new Error(
      `problem ${input.id} has ${totalBlanks} blanks; a synthesis gap has exactly one`,
    );
  }
  const wantsProductBlank = input.gapKind === "product";
  const gapStepId = wantsProductBlank ? producesBlanks[0] : overBlanks[0];
  if (gapStepId === undefined) {
    throw new Error(
      `problem ${input.id} is a ${input.gapKind} gap, so the blank belongs ` +
        `${wantsProductBlank ? "on what the step makes" : "over the arrow"}, and it is on the other one`,
    );
  }

  assertOptionsValid(toChoiceOptions(input.bank), `problem ${input.id} bank`);
  const bankIds = new Set(input.bank.map((option) => option.id));
  if (!bankIds.has(input.correctOptionId)) {
    throw new Error(`problem ${input.id} names ${input.correctOptionId} as correct, and it is not in the bank`);
  }
  for (const option of input.bank) {
    if (option.builds !== undefined) requireText(option.builds, `problem ${input.id} chip ${option.id} builds`);
    if (option.id !== input.correctOptionId && option.builds === undefined && option.why === undefined) {
      throw new Error(
        `problem ${input.id} chip ${option.id} is a wrong answer with no authored explanation, ` +
          `so a student who picks it gets a generic sentence where Tier 2 copy belongs`,
      );
    }
  }

  /* ---------------- reactant gaps: real structures, all distinct ------------- */

  let structureSpec: StructureAnswerSpec | null = null;
  if (input.gapKind === "reactant") {
    for (const option of input.bank) {
      if (option.structure === undefined) {
        throw new Error(
          `problem ${input.id} is a reactant gap and chip ${option.id} carries no structure, ` +
            `so checkStructure has nothing to compare`,
        );
      }
    }
    const answerOption = input.bank.find((option) => option.id === input.correctOptionId);
    // Checked above; this narrows for the compiler.
    if (answerOption?.structure === undefined) {
      throw new Error(`problem ${input.id} answer chip carries no structure`);
    }
    structureSpec = createStructureAnswer(answerOption.structure);
    for (const option of input.bank) {
      if (option.id === input.correctOptionId || option.structure === undefined) continue;
      const sameMolecule = structureStateMatches(
        { kind: "structure", state: answerOption.structure },
        { kind: "structure", state: option.structure },
      );
      if (sameMolecule) {
        throw new Error(
          `problem ${input.id} chip ${option.id} is the same molecule as the answer drawn differently, ` +
            `so it would be marked wrong for being right`,
        );
      }
    }
  } else {
    for (const option of input.bank) {
      if (option.structure !== undefined) {
        throw new Error(
          `problem ${input.id} is a ${input.gapKind} gap and chip ${option.id} carries a structure, ` +
            `which nothing here would grade`,
        );
      }
    }
  }

  /* ---------------- product gaps: candidates plus the argument -------------- */

  let majorProductSpec: MajorProductAnswerSpec | null = null;
  const reasons = input.reasons ?? [];
  if (input.gapKind === "product") {
    if (input.correctReasonId === undefined) {
      throw new Error(
        `problem ${input.id} is a product gap with no correct reason. ` +
          `CLAUDE.md's major product shape is the product AND the reason it wins`,
      );
    }
    majorProductSpec = createMajorProductAnswer({
      candidates: toChoiceOptions(input.bank),
      reasons: toChoiceOptions(reasons),
      correctCandidateId: input.correctOptionId,
      correctReasonId: input.correctReasonId,
    });
    for (const reason of reasons) {
      if (reason.id !== input.correctReasonId && reason.why === undefined) {
        throw new Error(`problem ${input.id} reason ${reason.id} is wrong and carries no explanation`);
      }
    }
  } else if (reasons.length > 0) {
    throw new Error(
      `problem ${input.id} is a ${input.gapKind} gap and carries ranking arguments, which only a product gap asks for`,
    );
  }

  /* ---------------- typed answers, and the bank agreeing with them ---------- */

  let typed: TypedAnswer | null = null;
  if (input.gapKind === "product") {
    if (input.typed !== undefined) {
      throw new Error(
        `problem ${input.id} is a product gap and carries a typed answer. ` +
          `The ranking argument is a choice, so this gap is L2 only`,
      );
    }
  } else {
    if (input.typed === undefined) {
      throw new Error(`problem ${input.id} serves L3 and has no typed answer for the student to produce`);
    }
    requireText(input.typed.placeholder, `problem ${input.id} typed placeholder`);
    const alternatives = input.typed.alternatives ?? [];
    for (const route of alternatives) {
      requireText(route.label, `problem ${input.id} has an accepted route with no name`);
    }
    const spec = createReagentsAnswer({
      mode: input.typed.mode,
      direction: input.retro === true ? "retrosynthesis" : "forward",
      steps: input.typed.steps.map((tokens) => ({ reagents: tokens })),
      ...(input.typed.equivalents === undefined ? {} : { equivalents: input.typed.equivalents }),
      acceptedAlternatives: alternatives.map((route) =>
        route.steps.map((tokens) => ({ reagents: tokens })),
      ),
    });
    typed = {
      spec,
      alternativeLabels: Object.freeze(alternatives.map((route) => route.label)),
      placeholder: input.typed.placeholder,
    };

    // Every chip must say what it stands for, or the two rungs grade different
    // things and only one of them is ever reviewed.
    for (const option of input.bank) {
      if (option.answer === undefined) {
        throw new Error(
          `problem ${input.id} chip ${option.id} carries no token answer, so the L2 pick and the ` +
            `L3 typed path would be graded by different rules`,
        );
      }
      if (option.answer.length === 0 || option.answer.some((tokens) => tokens.length === 0)) {
        throw new Error(`problem ${input.id} chip ${option.id} has an empty token step`);
      }
      if (option.id === input.correctOptionId) continue;
      // A wrong chip the grader would accept is the worst authoring defect this
      // shape allows: the student picks the chip labelled wrong, is told they
      // are right, and the authored explanation beside it never runs.
      const accepted = checkReagents(spec, {
        kind: "reagents",
        steps: stepsFromOption(option),
      });
      if (accepted.outcome === "correct") {
        throw new Error(
          `problem ${input.id} chip ${option.id} is offered as a wrong answer and the reagent ` +
            `checker accepts it, so it is either an accepted alternative or a duplicate of the answer`,
        );
      }
    }
  }

  return Object.freeze({
    id: input.id,
    node: input.node,
    conceptIds: Object.freeze([...input.conceptIds]),
    gapKind: input.gapKind,
    prompt: input.prompt,
    ...(input.brief === undefined ? {} : { brief: input.brief }),
    start: input.start,
    target: input.target,
    steps: Object.freeze(input.steps.map((step) => Object.freeze({ ...step }))),
    gapStepId,
    bank: Object.freeze(input.bank.map((option) => Object.freeze({ ...option }))),
    correctOptionId: input.correctOptionId,
    reasons: Object.freeze(reasons.map((reason) => Object.freeze({ ...reason }))),
    correctReasonId: input.correctReasonId ?? null,
    typed,
    structureSpec,
    majorProductSpec,
    why: input.why,
    source: input.source,
    diamonds: input.diamonds,
    retro: input.retro === true,
    levels: levelsForGapKind(input.gapKind),
  });
}

/** The step carrying the blank. Never undefined: the constructor derived the id. */
export function gapStep(problem: SynthesisGapProblem): SynthesisStep {
  const step = problem.steps.find((candidate) => candidate.id === problem.gapStepId);
  if (step === undefined) {
    throw new Error(`problem ${problem.id} lost its gap step ${problem.gapStepId}`);
  }
  return step;
}

export function bankOption(
  problem: SynthesisGapProblem,
  optionId: string,
): BankOption | undefined {
  return problem.bank.find((option) => option.id === optionId);
}

export function reasonOption(
  problem: SynthesisGapProblem,
  reasonId: string,
): BankOption | undefined {
  return problem.reasons.find((reason) => reason.id === reasonId);
}

/** The chip the answer is. Used by the reveal and by the card generator. */
export function answerOption(problem: SynthesisGapProblem): BankOption {
  const option = bankOption(problem, problem.correctOptionId);
  if (option === undefined) {
    throw new Error(`problem ${problem.id} lost its answer chip ${problem.correctOptionId}`);
  }
  return option;
}

/**
 * A last authoring guard the constructor cannot run on its own.
 *
 * `checkStructure` is the authority on a reactant gap, so a problem's answer
 * chip must actually pass it. Running that inside the constructor would mean
 * every import pays for a graph isomorphism; running it as a named check that
 * the test suite calls keeps the import cheap and the guarantee real. Reported,
 * never repaired.
 */
export function structureAnswerIsSelfConsistent(problem: SynthesisGapProblem): boolean {
  if (problem.structureSpec === null) return true;
  const option = answerOption(problem);
  if (option.structure === undefined) return false;
  return checkStructure(problem.structureSpec, {
    kind: "structure",
    state: option.structure,
  }).outcome === "correct";
}
