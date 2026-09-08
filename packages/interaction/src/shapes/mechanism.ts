/**
 * The mechanism answer shape: curved arrows over a given starting state.
 *
 * This is the only one of the four shapes chem-core can grade today, and it is
 * the hardest, so it is the one the other three are modelled on rather than the
 * other way round.
 *
 * THE ARM AND COMMIT PATTERN, WHICH ALL FOUR SHAPES SHARE.
 *
 *   nothing armed  + a source target  ->  armed
 *   armed          + the same target  ->  nothing armed        (a toggle, not an error)
 *   armed          + a sink target    ->  the arrow is built, checked, and kept or refused
 *   armed          + empty space      ->  nothing armed
 *
 * Two taps complete an arrow. A drag is the same two selections with the pointer
 * held down in between, so nothing in this file knows or cares which one drove
 * it. That is what "tap only is first class" means here: there is no tap branch.
 *
 * WHY TAPPING AN ATOM TOGGLES ITS LONE PAIRS RATHER THAN EDITING THEM.
 *
 * Revealing lone pairs is a display state, held here because it is something the
 * student did and it has to survive a cancelled drag and be undoable. It is
 * emphatically NOT a change to `lonePairs` on the atom. If a tap could add an
 * electron pair to an oxygen, a student could make a failing conservation check
 * pass by tapping, and the engine would then be grading a structure nobody
 * intended. The structure shape, where building the molecule IS the answer, does
 * edit those counts; see shapes/structure.ts. Same target, two modes, two
 * meanings, and that difference is the entire argument for shapes being modes.
 *
 * A KNOWN GAP, RECORDED RATHER THAN DISCOVERED LATER.
 *
 * chem-core's `StudentAttempt.built` is a `MechanismStep`, which carries a `to`
 * state as well as arrows. A draft here carries arrows and a `from` state. The
 * `to` state has to come from somewhere: either the problem authored it, or the
 * student drew it in the structure shape. `predicted` is where the second case
 * lands, filled by `setPredictedState`. Assembling the two into a MechanismStep
 * is grading, so it belongs to whoever calls the grader, not to this package.
 */

import {
  arrowLegalityFindings,
  duplicateAtomIds,
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  type ArrowLegalityFinding,
  type AtomId,
  type ElectronCount,
  type ElectronFlowArrow,
  type ElectronSource,
  type MechanismState,
} from "@blueberry/chem-core";
import type { InteractionCommand } from "../commands.js";
import { haptic } from "../effects.js";
import type { ArmedSourceHint } from "../geometryPort.js";
import { notice } from "../notices.js";
import { sameTarget, type HitTarget } from "../targets.js";
import { armedAtomId, inferSink } from "./arrowInference.js";
import { changed, emitted, refused, unchanged, type ShapeOutcome } from "./outcome.js";

/** Prefix for arrow ids this package mints. Never collides with authored ids. */
export const STUDENT_ARROW_PREFIX = "student-arrow-";

export interface ArmedElectronSource {
  readonly source: ElectronSource;
  /** The target that armed it, so a second tap on the same thing can disarm. */
  readonly target: HitTarget;
  /**
   * For a bond armed by one of its end handles, the atom that end sits on. Null
   * when the bond was armed by its body, which is what makes a forming bond
   * ambiguous. See arrowInference.ts.
   */
  readonly pivotAtomId: AtomId | null;
}

export interface MechanismDraft {
  readonly shape: "mechanism";
  /** The step's starting state. Authored, and never edited by this shape. */
  readonly state: MechanismState;
  readonly arrows: readonly ElectronFlowArrow[];
  readonly armed: ArmedElectronSource | null;
  /** Applies to the next arrow drawn. Two is polar, one is a fishhook. */
  readonly electrons: ElectronCount;
  /** Atoms whose lone pairs are currently drawn. Display only. Sorted. */
  readonly revealedLonePairs: readonly AtomId[];
  /** Atoms whose implicit hydrogens are currently drawn. Display only. Sorted. */
  readonly revealedHydrogens: readonly AtomId[];
  /** The product state, when the problem asks for one. See the gap note above. */
  readonly predicted: MechanismState | null;
  readonly nextArrowNumber: number;
}

export function createMechanismDraft(state: MechanismState): MechanismDraft {
  // A constructor cannot emit a notice, so this is the one place the duplicate
  // id hazard is a thrown contract violation rather than a refusal. It runs at
  // problem load, called by the shell or a harness, never inside a reducer, and
  // a problem authored with duplicate ids is a defect to surface at authoring
  // time, not a state a student should ever be handed. Found by the Phase 2
  // pass three adversary; resolution by id is member order dependent otherwise.
  const duplicated = duplicateAtomIds(state);
  if (duplicated.length > 0) {
    throw new Error(
      `createMechanismDraft: atom id${duplicated.length === 1 ? "" : "s"} ${duplicated.join(", ")} appear in more than one species. Every by-id lookup would resolve to whichever species is first`,
    );
  }
  return Object.freeze({
    shape: "mechanism" as const,
    state,
    arrows: Object.freeze([]),
    armed: null,
    electrons: 2 as ElectronCount,
    revealedLonePairs: Object.freeze([]),
    revealedHydrogens: Object.freeze([]),
    predicted: null,
    nextArrowNumber: 1,
  });
}

/** What the hit tester is told about the selection, so it can offer bond sites. */
export function mechanismArmedHint(draft: MechanismDraft): ArmedSourceHint | null {
  if (draft.armed === null) return null;
  return {
    atomId: armedAtomId(draft.armed) ?? draft.armed.pivotAtomId,
    target: draft.armed.target,
  };
}

export function applyToMechanism(
  draft: MechanismDraft,
  command: InteractionCommand,
): ShapeOutcome<MechanismDraft> {
  switch (command.kind) {
    case "selectTarget":
      return selectTarget(draft, command.target);

    case "clearSelection":
      if (draft.armed === null) return unchanged(draft);
      return changed(withArmed(draft, null), "disarmed");

    case "setElectronCount":
      // A mode, not an answer: it decides what the NEXT arrow will be and
      // changes nothing a grader reads about the arrows already drawn.
      if (draft.electrons === command.electrons) return unchanged(draft);
      return changed(Object.freeze({ ...draft, electrons: command.electrons }), "inspected");

    case "setPredictedState": {
      if (draft.predicted === command.state) return unchanged(draft);
      // Same hazard, same refusal as acceptExternalStructure: a whole state
      // arrives at once, often from a Ketcher round trip, and a duplicate atom
      // id would make every later by-id lookup land on whichever species is
      // found first. Found by the Phase 2 pass three adversary after the pass
      // two fix covered only the structure shape's entry point.
      const duplicated = command.state === null ? [] : duplicateAtomIds(command.state);
      if (duplicated.length > 0) {
        return refused(draft, [
          notice(
            "predicted_state_duplicate_atom_ids",
            "refused",
            `the predicted state carries atom id${duplicated.length === 1 ? "" : "s"} ${duplicated.join(", ")} in more than one species, so edits by id would be ambiguous. Fix the ids and hand it over again`,
          ),
        ]);
      }
      // The predicted product IS part of the answer, so this is a commit.
      return changed(Object.freeze({ ...draft, predicted: command.state }), "committed");
    }

    case "submit":
      return emitted(draft, [{ kind: "submitAttempt", draft }]);

    default:
      return refused(draft, [
        notice(
          "command_not_valid_in_this_shape",
          "refused",
          `${command.kind} does nothing in the mechanism shape`,
        ),
      ]);
  }
}

function selectTarget(draft: MechanismDraft, target: HitTarget): ShapeOutcome<MechanismDraft> {
  // The hydrogen arc is an inspection affordance. It answers "how many hydrogens
  // are on this carbon", which a student needs to ask MID arrow, so it must not
  // disturb an armed source.
  if (target.kind === "hydrogenCount") {
    return changed(
      Object.freeze({
        ...draft,
        revealedHydrogens: toggleId(draft.revealedHydrogens, target.atomId),
      }),
      "inspected",
    );
  }

  if (target.kind === "empty") {
    if (draft.armed === null) return unchanged(draft);
    return changed(withArmed(draft, null), "disarmed");
  }

  // Tapping the armed thing again lets it go. Also what a drag that wanders off
  // and comes back to its own source amounts to.
  if (draft.armed !== null && sameTarget(target, draft.armed.target)) {
    return changed(withArmed(draft, null), "disarmed");
  }

  if (draft.armed === null) {
    return armFrom(draft, target);
  }

  return commit(draft, draft.armed, target);
}

function armFrom(draft: MechanismDraft, target: HitTarget): ShapeOutcome<MechanismDraft> {
  switch (target.kind) {
    case "lonePair":
      return armed(draft, fromLonePair(target.atomId), target, target.atomId);
    case "unpairedElectron":
      return armed(draft, fromSingleElectron(target.atomId), target, target.atomId);
    case "bondEndHandle":
      return armed(draft, fromBond(target.bondId), target, target.atomId);
    case "bondBody":
      // Accepted, because the capsule is a far bigger target than the handle and
      // refusing it would punish a fingertip. It only becomes a problem later, if
      // the sink turns out to need a pivot, and the refusal then says so.
      return armed(draft, fromBond(target.bondId), target, null);
    case "atom":
      // Nothing is armed and an atom body is not a source, so this is the reveal
      // toggle. See the header.
      return changed(
        Object.freeze({
          ...draft,
          revealedLonePairs: toggleId(draft.revealedLonePairs, target.atomId),
        }),
        "inspected",
      );
    case "betweenAtomsSite":
      return refused(draft, [
        notice(
          "nothing_selected_for_this_target",
          "refused",
          "a place for a bond to form is somewhere electrons can go, not somewhere they come from",
          { target },
        ),
      ]);
    default:
      return refused(draft, [
        notice(
          "target_not_valid_in_this_shape",
          "refused",
          `${target.kind} belongs to another answer shape`,
          { target },
        ),
      ]);
  }
}

function armed(
  draft: MechanismDraft,
  source: ElectronSource,
  target: HitTarget,
  pivotAtomId: AtomId | null,
): ShapeOutcome<MechanismDraft> {
  return changed(withArmed(draft, { source, target, pivotAtomId }), "armed", [haptic("selection")]);
}

function commit(
  draft: MechanismDraft,
  armedSource: ArmedElectronSource,
  target: HitTarget,
): ShapeOutcome<MechanismDraft> {
  const inference = inferSink(armedSource, target, draft.state);
  if (!inference.ok) {
    // The selection is deliberately kept. The student's next tap should be a
    // second try at the sink, not a repeat of arming the source.
    return refused(
      draft,
      [notice(inference.noticeId, "refused", inference.detail, { target })],
      [haptic("refusal")],
    );
  }

  const arrow = createArrow({
    id: `${STUDENT_ARROW_PREFIX}${draft.nextArrowNumber}`,
    source: armedSource.source,
    sink: inference.sink,
    electrons: draft.electrons,
  });

  const introduced = findingsIntroducedBy(draft.arrows, arrow, draft.state);
  if (introduced.length > 0) {
    return refused(
      draft,
      [
        notice(
          "arrow_refused_by_legality",
          "refused",
          `chem-core refused this arrow: ${introduced.map((f) => f.rule).join(", ")}`,
          { target, legality: introduced },
        ),
      ],
      [haptic("refusal")],
    );
  }

  // Both halves of "the sink consumed the arming" in one word. See the
  // one value, not a set argument in outcome.ts: the arming this command ate
  // was never a state the student could act on afterwards, so `committed` is
  // the whole truth rather than half of it.
  return changed(
    Object.freeze({
      ...draft,
      arrows: Object.freeze([...draft.arrows, arrow]),
      armed: null,
      nextArrowNumber: draft.nextArrowNumber + 1,
    }),
    "committed",
    [haptic("commit")],
  );
}

/**
 * What adding this arrow breaks that was not already broken.
 *
 * Run over the whole arrow list rather than the new arrow alone, because
 * chem-core's capacity rules are aggregate: two arrows can each be fine and the
 * pair still drain a lone pair twice. Comparing before against after attributes
 * that to the arrow that caused it instead of blaming whichever one happens to
 * be reported first.
 */
export function findingsIntroducedBy(
  existing: readonly ElectronFlowArrow[],
  candidate: ElectronFlowArrow,
  state: MechanismState,
): readonly ArrowLegalityFinding[] {
  const before = countByKey(arrowLegalityFindings(existing, state));
  const after = arrowLegalityFindings([...existing, candidate], state);

  const introduced: ArrowLegalityFinding[] = [];
  const seen = new Map<string, number>();
  for (const finding of after) {
    const key = findingKey(finding);
    const used = seen.get(key) ?? 0;
    if (used >= (before.get(key) ?? 0)) {
      introduced.push(finding);
    }
    seen.set(key, used + 1);
  }
  return introduced;
}

function findingKey(finding: ArrowLegalityFinding): string {
  return JSON.stringify([finding.arrowId, finding.rule]);
}

function countByKey(findings: readonly ArrowLegalityFinding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    const key = findingKey(finding);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function withArmed(draft: MechanismDraft, armedSource: ArmedElectronSource | null): MechanismDraft {
  return Object.freeze({ ...draft, armed: armedSource });
}

/** Add or remove one id, keeping the list sorted so two equal sets look equal. */
export function toggleId(ids: readonly AtomId[], id: AtomId): readonly AtomId[] {
  if (ids.includes(id)) {
    return Object.freeze(ids.filter((existing) => existing !== id));
  }
  return Object.freeze([...ids, id].sort());
}
