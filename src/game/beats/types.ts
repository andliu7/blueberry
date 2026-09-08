/**
 * Beats, as the SURFACES see them. Read this header before trusting anything
 * in this file.
 *
 * A lesson is a SEQUENCE OF BEATS, and a beat is a discriminated union, which
 * is the one structural decision docs/DATA-MODEL.md derives everything else
 * from. The reason, restated because it is the reason this file exists: a
 * lesson holds a mechanism, a sort, a matching pair set and a synthesis gap in
 * the same sequence. If a lesson were `Problem[]`, the non question beats have
 * to be smuggled in as fake problems and every consumer grows an
 * `if (problem.isReallyASort)`. As a union tagged by `kind`, adding a beat
 * type is a new variant plus a new renderer, and the runner, the progress bar
 * and the review queue do not change at all. It is also the shape
 * packages/curriculum already uses for its five answer kinds, so this is a
 * widening of a decision the repo already validated.
 *
 * `mechanism` and `resonance` are BUILT: they are the trainer, playing entries
 * out of demo/reactions.ts, demo/sequences.ts and demo/resonance.ts. They are
 * members of this union anyway, so a lesson is ONE playlist rather than a
 * trainer list beside a concept list. The other five cover the 17 spine nodes
 * that are not arrow pushing: directing effects, blocking strategy, sequencing
 * logic, the oxidation ladder, protecting group logic, the acyl reactivity
 * ladder, the alpha proton pKa hierarchy, kinetic against thermodynamic
 * control, retrosynthesis, basicity against nucleophilicity, phenol acidity,
 * nitro reduction, and syn dihydroxylation.
 *
 * THE MASTERY RULE, in code below and in words here: a beat DECLARES the
 * mastery levels it is allowed to appear at, in `levels`. A runner never
 * infers it. L3 produce is never shown early because no beat that has not
 * declared L3 can be selected for L3, and `levelRuleViolations` refuses a beat
 * that declares a level its kind does not support. The ladder is L0 meet it
 * (guided, cannot fail), L1 guided, L2 recall, L3 produce.
 *
 * THE SEAM, and it is the same seam as app/progress.ts. `MasterySource` is the
 * interface the surfaces read through. The local implementation that will sit
 * behind it keeps a per device copy in localStorage, and that copy is a
 * RENDERING CACHE and an OFFLINE DRAFT, never an entitlement: CLAUDE.md's non
 * negotiables put unlock state, diamonds, ratings and standings server side,
 * and Phase 6 swaps in a Supabase backed source that reconciles this draft
 * against the append only attempt history. A student who edits localStorage
 * has edited a cache. This module is the CONTRACT only: types and pure
 * functions, no storage, no React, no side effects, so anything that imports
 * it pays nothing at import time. The store lives in its own module and reads
 * as an external store (subscribe plus getSnapshot), the same shape as
 * app/progress.ts and packages/interaction/src/store.ts, so a surface reads it
 * with useSyncExternalStore and nothing here imports React.
 */

import type { CauseId, ResolutionKind } from "@blueberry/chem-core";
import type { LessonId } from "@blueberry/curriculum";

/**
 * Plain string aliases, for the reason packages/curriculum/src/ids.ts gives:
 * a brand would stop a BeatId being passed where a NodeId belongs, and it
 * would also mean every authored beat calls a constructor to write a literal.
 *
 * THE INVARIANT, inherited from that file: a BeatId is stable forever once a
 * beat has been attempted. Attempt history is append only and the rating is
 * computed from it. Rewording a prompt keeps the id. Changing what is being
 * asked is a new beat with a new id, and the old one is retired.
 */
export type BeatId = string;
/** A pathway node id, as authored in demo/pathwayMap.ts. */
export type NodeId = string;
export type ConceptId = string;

/**
 * Re-exported rather than redeclared. packages/curriculum already owns LessonId
 * and a second alias with the same name and a different home is how two files
 * end up meaning two things by one word. Type only, so it is erased at build
 * time and costs the bundle nothing.
 */
export type { LessonId };

/* ------------------------------------------------------------------ */
/* The mastery ladder                                                   */
/* ------------------------------------------------------------------ */

/**
 * L0 meet it, L1 guided, L2 recall, L3 produce.
 *
 * A number rather than a string union because the ladder is ORDERED and
 * comparisons (`level >= 2`, "never above the level the student has proved")
 * are the whole point. A string union would need a rank table beside it, and
 * the two would drift.
 */
export type MasteryLevel = 0 | 1 | 2 | 3;

export const MASTERY_LEVELS: readonly MasteryLevel[] = Object.freeze([0, 1, 2, 3]);

/** Student facing, in the coach voice: what this rung asks of them. */
export const MASTERY_LABELS: Readonly<Record<MasteryLevel, string>> = Object.freeze({
  0: "Meet it",
  1: "With guides",
  2: "From memory",
  3: "On your own",
});

export function masteryLabel(level: MasteryLevel): string {
  return MASTERY_LABELS[level];
}

export function isMasteryLevel(value: unknown): value is MasteryLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/**
 * L0 cannot fail. That is a contract and not a difficulty setting: a first
 * meeting that can be got wrong is a test, and the ladder's first rung exists
 * so a student sees the idea before anything is asked of them. A runner at L0
 * shows the answer forming and records `correct`.
 */
export function canFail(level: MasteryLevel): boolean {
  return level > 0;
}

/* ------------------------------------------------------------------ */
/* The beat union                                                       */
/* ------------------------------------------------------------------ */

export type BeatKind =
  | "mechanism"
  | "resonance"
  | "trace"
  | "sort"
  | "match"
  | "mcq"
  | "synthesis";

export const BEAT_KINDS: readonly BeatKind[] = Object.freeze([
  "mechanism",
  "resonance",
  "trace",
  "sort",
  "match",
  "mcq",
  "synthesis",
]);

/**
 * The kinds a student can actually reach today. Listed so a coverage report
 * can say so, and kept honest by test/beatCoverage.test.ts.
 *
 * It said ["mechanism", "resonance"] and called them "the two the trainer
 * already plays" long after four more shipped, so every coverage number
 * derived from it would have under-reported the product by two thirds. A
 * constant that describes the build is a constant that goes stale silently;
 * the test beside it now reads BeatRunner and TrainerTab and fails if this
 * list and those files disagree.
 *
 * TRACE IS DELIBERATELY ABSENT AND IS NOT A TYPO. `trace` has 88 authored
 * items, a complete TraceBeatView, and a barrel that exports it, and NOTHING
 * IMPORTS IT: planLesson never schedules a trace step and BeatRunner has no
 * branch that renders one. So it is built content a student cannot reach.
 * DEFAULT_LEVELS below has it serving L0 to L3, the widest ladder of any kind,
 * which makes the gap worth closing rather than deleting. It is recorded here
 * rather than quietly counted as shipped.
 */
export const BUILT_BEAT_KINDS: readonly BeatKind[] = Object.freeze([
  "mechanism",
  "resonance",
  "mcq",
  "match",
  "sort",
  "synthesis",
]);

/**
 * Authored and unreachable. See the note on BUILT_BEAT_KINDS.
 *
 * This exists so the gap is a value a report can print rather than a sentence
 * in a comment nobody runs.
 */
export const AUTHORED_UNREACHABLE_BEAT_KINDS: readonly BeatKind[] = Object.freeze(["trace"]);

/**
 * Which rungs each kind can serve, from the ladder spec.
 *
 *   mcq        L0 to L2. Three options and a wide field at L1, close
 *              distractors at L2.
 *   match      L1 and L2. Guided pairing, then pairing against decoys.
 *   trace      L0 to L3. Guides solid, then faded, then gone, which is the
 *              same beat carrying the whole ladder. See traceGuideStyle.
 *   sort       L2 and L3. Ordering is recall by nature; there is no guided
 *              way to be handed the order and still be sorting.
 *   synthesis  L2 and L3. Fill the gap from a bank, then type the reagent.
 *   mechanism  L1 to L3, and resonance with it. Drawing an arrow can fail, so
 *              it is never the L0 first meeting.
 *
 * An authored beat may declare FEWER levels than its kind allows. It may never
 * declare more, and levelRuleViolations is where that is enforced.
 */
export const DEFAULT_LEVELS: Readonly<Record<BeatKind, readonly MasteryLevel[]>> = Object.freeze({
  mechanism: Object.freeze([1, 2, 3]) as readonly MasteryLevel[],
  resonance: Object.freeze([1, 2, 3]) as readonly MasteryLevel[],
  trace: Object.freeze([0, 1, 2, 3]) as readonly MasteryLevel[],
  sort: Object.freeze([2, 3]) as readonly MasteryLevel[],
  match: Object.freeze([1, 2]) as readonly MasteryLevel[],
  mcq: Object.freeze([0, 1, 2]) as readonly MasteryLevel[],
  synthesis: Object.freeze([2, 3]) as readonly MasteryLevel[],
});

/**
 * What every beat carries, whatever its kind.
 *
 * `conceptIds` is what the end of lesson concept cover reads and what the
 * review queue keys on, per docs/DATA-MODEL.md. `diamonds` uses CLAUDE.md's
 * name for the currency; docs/DATA-MODEL.md calls the same field xp and cash
 * in two places, and CLAUDE.md is the file that wins on conflict.
 */
export interface BeatBase {
  readonly id: BeatId;
  /** The pathway node this beat belongs to. */
  readonly node: NodeId;
  readonly conceptIds: readonly ConceptId[];
  /**
   * THE RULE: the mastery levels this beat is allowed to appear at. A runner
   * picking a beat for a level filters on this and never on the kind, so a
   * beat authored as easy stays easy even though its kind could go harder.
   */
  readonly levels: readonly MasteryLevel[];
  /** One line, imperative, coach voice. What to do, not what they got wrong. */
  readonly prompt: string;
  /** Optional second line: the context that makes the prompt make sense. */
  readonly brief?: string;
  /** Earned on clearing it. Server side truth in Phase 6; a display number here. */
  readonly diamonds?: number;
}

/**
 * The trainer registry entry a mechanism beat plays. Same shape as PlayableLink
 * in demo/pathwayMap.ts, restated here rather than imported, so this contract
 * does not depend on a data module that is authored every week.
 */
export type TrainerRef =
  | { readonly kind: "reaction"; readonly id: string }
  | { readonly kind: "sequence"; readonly id: string };

/** Arrow pushing in the trainer. Built. */
export interface MechanismBeat extends BeatBase {
  readonly kind: "mechanism";
  readonly play: TrainerRef;
  /** Which step, when the entry is a sequence. Absent means the whole entry. */
  readonly stepIndex?: number;
}

/** The resonance hunt in the trainer. Built. */
export interface ResonanceBeat extends BeatBase {
  readonly kind: "resonance";
  readonly resonanceId: string;
  /** How many contributing structures count as done. Default is all of them. */
  readonly formsToFind?: number;
}

/** Solid at L0 and L1, faded at L2, gone at L3. The ladder inside one beat. */
export type GuideStyle = "solid" | "faded" | "none";

export function traceGuideStyle(level: MasteryLevel): GuideStyle {
  if (level <= 1) return "solid";
  if (level === 2) return "faded";
  return "none";
}

export interface TracePoint {
  readonly x: number;
  readonly y: number;
}

export interface TraceStroke {
  readonly id: string;
  /** What this stroke is, said plainly: "the C to O bond", "the lone pair". */
  readonly label: string;
  readonly points: readonly TracePoint[];
}

/**
 * Structure trace: draw the thing, on guides that fade as the level rises.
 *
 * `tolerancePx` is AUTHORED per beat, because a lone pair dot and a six
 * membered ring do not deserve the same slack. It is never widened to make an
 * attempt pass: that is the non negotiable in CLAUDE.md, and a trace that
 * needs a wider tolerance needs a better guide.
 */
export interface TraceBeat extends BeatBase {
  readonly kind: "trace";
  readonly moleculeId: string;
  readonly strokes: readonly TraceStroke[];
  readonly tolerancePx?: number;
}

/**
 * What a sort beat orders by. Closed, because each member is a different
 * teaching claim and a free string would let an author invent a criterion the
 * app cannot explain.
 */
export type SortCriterion =
  | "pka"
  | "acidity"
  | "basicity"
  | "nucleophilicity"
  | "acyl_reactivity"
  | "oxidation_level"
  | "carbocation_stability"
  | "sn2_rate"
  | "ring_activation";

export interface SortItem {
  readonly id: string;
  readonly label: string;
  readonly moleculeId?: string;
  /**
   * Links this item to packages/curriculum's pKa table, which is PROFESSOR
   * ADJUSTABLE: a settings layer sits over that table with named presets and
   * per value overrides. The link is what lets authoredOrderConflicts check a
   * custom table against the authored ordering below.
   */
  readonly pkaSiteId?: string;
  /** Why this item sits where it sits. Authored, shown after the attempt. */
  readonly why?: string;
}

/**
 * Sort the cards: the acyl ladder, the pKa hierarchy, the oxidation ladder.
 *
 * THE ORDERING IS THE TRUTH, not the numbers. `order` is authored and stays
 * true under every pKa table a professor configures, which is why grading
 * compares positions and never values. Where a custom value would flip this
 * ordering, the app FLAGS the conflict rather than teaching it, and
 * authoredOrderConflicts is the function that finds it.
 */
export interface SortBeat extends BeatBase {
  readonly kind: "sort";
  readonly criterion: SortCriterion;
  readonly direction: "ascending" | "descending";
  readonly items: readonly SortItem[];
  /** Item ids, first to last, in the authored order. */
  readonly order: readonly string[];
  /** Where the set came from, when it was lifted off a real exam front page. */
  readonly sourceExam?: string;
}

export interface MatchPair {
  readonly id: string;
  readonly left: string;
  readonly right: string;
  readonly why?: string;
}

/** A right hand item that pairs with nothing. Empty at L1, close ones at L2. */
export interface MatchDecoy {
  readonly id: string;
  readonly text: string;
  /** Why it looks right and is not. This is the Tier 2 copy for this decoy. */
  readonly why?: string;
}

/**
 * Matching. `presentation` is the same field docs/DATA-MODEL.md names:
 * connectors are drawn lines between two scattered columns, columns are two
 * lists a student pairs row by row. It is authored because a five pair set
 * reads well as connectors and a twelve pair set does not.
 */
export interface MatchBeat extends BeatBase {
  readonly kind: "match";
  readonly presentation: "connectors" | "columns";
  readonly pairs: readonly MatchPair[];
  readonly decoys?: readonly MatchDecoy[];
}

/**
 * One option. `why` is the Tier 2 authored explanation for THIS option, which
 * is what CLAUDE.md's feedback tiers ask for: the specific mistake an
 * instructor knows students make on this exact question, written once.
 * `cause` names the diagnostic cause when one applies.
 */
export interface BeatOption {
  readonly id: string;
  readonly text: string;
  readonly why?: string;
  readonly cause?: BeatCauseId;
}

/** Easy MCQ. Three options at L1, close distractors at L2. */
export interface McqBeat extends BeatBase {
  readonly kind: "mcq";
  readonly options: readonly BeatOption[];
  readonly correctOptionId: string;
  /** Drawn beside the question when the question is about a structure. */
  readonly moleculeId?: string;
}

/**
 * One position in a synthesis. Exactly one of `given` and `accepts` is filled:
 * a given step is shown, a gap is answered. `accepts` holds the authored
 * reagent plus its accepted equivalents, which is the reagent answer shape
 * CLAUDE.md's answer shape table already describes.
 */
export interface SynthesisSlot {
  readonly id: string;
  readonly given?: string;
  readonly accepts?: readonly string[];
  readonly why?: string;
}

/**
 * Synthesis gap. At L2 the student picks from `bank`; at L3 the bank is not
 * offered and they type the reagent. A retrosynthesis beat is this same beat
 * read backwards, per CLAUDE.md, and is NOT a separate kind.
 */
export interface SynthesisBeat extends BeatBase {
  readonly kind: "synthesis";
  readonly startMoleculeId: string;
  readonly targetMoleculeId: string;
  readonly slots: readonly SynthesisSlot[];
  /** Reagent chips offered at L2. Ignored at L3, where the student produces. */
  readonly bank?: readonly string[];
  /** True when the sequence is given product first: retrosynthesis. */
  readonly retro?: boolean;
}

export type BeatSpec =
  | MechanismBeat
  | ResonanceBeat
  | TraceBeat
  | SortBeat
  | MatchBeat
  | McqBeat
  | SynthesisBeat;

/** A lesson is one playlist, mechanisms and concepts in the same sequence. */
export interface LessonPlaylist {
  readonly lessonId: LessonId;
  readonly node: NodeId;
  readonly title: string;
  readonly beats: readonly BeatSpec[];
}

/* ------------------------------------------------------------------ */
/* The level rule, enforced                                             */
/* ------------------------------------------------------------------ */

export function beatAllowedAt(beat: BeatSpec, level: MasteryLevel): boolean {
  return beat.levels.includes(level);
}

export function beatsForLevel(
  beats: readonly BeatSpec[],
  level: MasteryLevel,
): readonly BeatSpec[] {
  return beats.filter((beat) => beatAllowedAt(beat, level));
}

/** The highest rung this playlist can currently reach. Null when it has none. */
export function highestLevelIn(beats: readonly BeatSpec[]): MasteryLevel | null {
  let highest: MasteryLevel | null = null;
  for (const beat of beats) {
    for (const level of beat.levels) {
      if (highest === null || level > highest) highest = level;
    }
  }
  return highest;
}

export interface LevelRuleViolation {
  readonly beatId: BeatId;
  readonly message: string;
}

/**
 * The authoring check behind the rule in this file's header. Reported, never
 * repaired: a beat that claims a level its kind cannot serve is an authoring
 * mistake, and quietly narrowing its declaration would hide it.
 */
export function levelRuleViolations(beats: readonly BeatSpec[]): readonly LevelRuleViolation[] {
  const violations: LevelRuleViolation[] = [];
  for (const beat of beats) {
    const allowed = DEFAULT_LEVELS[beat.kind];
    if (beat.levels.length === 0) {
      violations.push({ beatId: beat.id, message: "declares no mastery level, so it can never be selected" });
    }
    const seen = new Set<MasteryLevel>();
    for (const level of beat.levels) {
      if (seen.has(level)) {
        violations.push({ beatId: beat.id, message: `declares level ${level} twice` });
      }
      seen.add(level);
      if (!allowed.includes(level)) {
        violations.push({
          beatId: beat.id,
          message: `declares level ${level}, which a ${beat.kind} beat does not serve`,
        });
      }
    }
  }
  return violations;
}

/* ------------------------------------------------------------------ */
/* Sorting under a professor adjustable table                           */
/* ------------------------------------------------------------------ */

export interface OrderingConflict {
  readonly beatId: BeatId;
  readonly earlierId: string;
  readonly laterId: string;
  readonly earlierValue: number;
  readonly laterValue: number;
}

/**
 * Where a supplied value table contradicts the authored ordering.
 *
 * pKa values are professor adjustable: packages/curriculum/src/pka.ts holds the
 * table as first class data with sources, and a settings owned layer over it
 * carries named presets plus per value overrides. Authored ORDERINGS stay true
 * under every table. When a custom value would flip one, the honest move is to
 * FLAG it, because the alternatives are both wrong: teaching the custom order
 * contradicts an authored explanation a person wrote, and teaching the authored
 * order beside a number that disagrees with it teaches a student to distrust
 * the numbers.
 *
 * Pure: `valueOf` is supplied by the caller, so this function never reads
 * settings and never reads the pKa table itself. An item with no value is
 * skipped rather than assumed.
 */
export function authoredOrderConflicts(
  beat: SortBeat,
  valueOf: (item: SortItem) => number | undefined,
): readonly OrderingConflict[] {
  const byId = new Map(beat.items.map((item) => [item.id, item]));
  const conflicts: OrderingConflict[] = [];
  for (let index = 0; index + 1 < beat.order.length; index += 1) {
    const earlier = byId.get(beat.order[index] ?? "");
    const later = byId.get(beat.order[index + 1] ?? "");
    if (earlier === undefined || later === undefined) continue;
    const earlierValue = valueOf(earlier);
    const laterValue = valueOf(later);
    if (earlierValue === undefined || laterValue === undefined) continue;
    const flipped =
      beat.direction === "ascending" ? earlierValue > laterValue : earlierValue < laterValue;
    if (flipped) {
      conflicts.push({
        beatId: beat.id,
        earlierId: earlier.id,
        laterId: later.id,
        earlierValue,
        laterValue,
      });
    }
  }
  return conflicts;
}

/* ------------------------------------------------------------------ */
/* Results                                                              */
/* ------------------------------------------------------------------ */

/**
 * Named causes for the ANSWER SHAPE, not for chemistry.
 *
 * Chemistry causes belong to chem-core's registry and are reached through
 * `CauseId` below; packages/feedback carries their authored student copy, and
 * nothing here duplicates either. These are the causes the five new beat types
 * need and chem-core has no opinion about: an ordering that is off by one pair
 * is not a valence error. Closed, so the count is a property of the code, and
 * deliberately NOT written as a number in any prose file, because a literal
 * goes stale the first time a builder adds one.
 *
 * The student facing copy for these is authoring work, reviewed at a content
 * gate, and it lives with the rest of the authored copy. The ids here are
 * engine facing: a log line and a validator report.
 */
export type BeatShapeCauseId =
  | "order_adjacent_pair_swapped"
  | "order_fully_reversed"
  | "order_used_a_different_criterion"
  | "matched_by_name_not_by_property"
  | "matched_all_but_one_pair"
  | "chose_authored_distractor"
  | "trace_left_the_target"
  | "trace_incomplete"
  | "synthesis_step_out_of_order"
  | "synthesis_step_missing"
  | "reagent_right_class_wrong_reagent"
  | "no_named_cause_logged";

export const BEAT_SHAPE_CAUSES: readonly BeatShapeCauseId[] = Object.freeze([
  "order_adjacent_pair_swapped",
  "order_fully_reversed",
  "order_used_a_different_criterion",
  "matched_by_name_not_by_property",
  "matched_all_but_one_pair",
  "chose_authored_distractor",
  "trace_left_the_target",
  "trace_incomplete",
  "synthesis_step_out_of_order",
  "synthesis_step_missing",
  "reagent_right_class_wrong_reagent",
  "no_named_cause_logged",
]);

export function beatShapeCauseCount(): number {
  return BEAT_SHAPE_CAUSES.length;
}

export function isBeatShapeCause(cause: BeatCauseId): cause is BeatShapeCauseId {
  return (BEAT_SHAPE_CAUSES as readonly string[]).includes(cause);
}

/** Every beat result names a cause: chem-core's registry, or a shape cause. */
export type BeatCauseId = CauseId | BeatShapeCauseId;

interface BeatResultBase {
  readonly beatId: BeatId;
  /** The rung it was played at, so the ladder can be reconstructed from history. */
  readonly level: MasteryLevel;
  readonly cause: BeatCauseId;
  /** Set when an authored distractor matched. This is a Tier 2 hit. */
  readonly distractorId?: string;
  readonly elapsedMs: number;
  /** ISO 8601. */
  readonly at: string;
}

/**
 * The four outcomes, and they are the repo's four rather than a new set.
 *
 * A union rather than one interface with optional fields, for the reason
 * chem-core's resolution.ts gives: CLAUDE.md requires case two to carry the
 * route taken and case three to carry the name of what was actually built.
 * With optional fields those are promises in a comment. As a union they are
 * compile errors when missing. Every case carries a cause, including correct,
 * because a student who guesses right has learned nothing unless they are told
 * what they were recognised as doing.
 */
export type BeatResult =
  | (BeatResultBase & { readonly kind: "correct" })
  | (BeatResultBase & {
      readonly kind: "correct_alternative_route";
      /** The route they took, named. Required, per CLAUDE.md result type two. */
      readonly routeTaken: string;
    })
  | (BeatResultBase & {
      readonly kind: "valid_not_requested";
      /** What they actually built, named. Required, per result type three. */
      readonly built: string;
    })
  | (BeatResultBase & { readonly kind: "invalid" });

export type BeatOutcome = BeatResult["kind"];

/**
 * Compile time proof that a beat's four outcomes are chem-core's four.
 *
 * The pattern, named because it is not obvious: `Assert` only accepts `true`,
 * so a type alias built on it fails the build when its argument is `false`.
 * `NoExtras` is `true` when A has no member B lacks. Both directions checked
 * means neither side can grow a fifth outcome the other does not have, and
 * finding that out from the compiler is cheaper than finding it out from a
 * grading report. Nothing is emitted: these are types only.
 */
type Assert<T extends true> = T;
type NoExtras<A, B> = [Exclude<A, B>] extends [never] ? true : false;

export type BeatOutcomeCoversResolutionKind = Assert<NoExtras<BeatOutcome, ResolutionKind>>;
export type ResolutionKindCoversBeatOutcome = Assert<NoExtras<ResolutionKind, BeatOutcome>>;

/** Chemically or logically sound, whatever the mark. Mirrors isChemicallyValid. */
export function isSound(result: BeatResult): boolean {
  return result.kind !== "invalid";
}

/** Whether this result advances the node. The other two are sound and not done. */
export function clearsBeat(result: BeatResult): boolean {
  return result.kind === "correct" || result.kind === "correct_alternative_route";
}

/* ------------------------------------------------------------------ */
/* The seam                                                             */
/* ------------------------------------------------------------------ */

export interface NodeMastery {
  readonly node: NodeId;
  readonly level: MasteryLevel;
  readonly clearedBeatIds: readonly BeatId[];
  /** ISO 8601, or null when the node has never been opened. */
  readonly lastPlayedAt: string | null;
}

export interface MasterySnapshot {
  readonly nodes: Readonly<Record<NodeId, NodeMastery>>;
}

export const EMPTY_MASTERY: MasterySnapshot = Object.freeze({ nodes: {} });

/**
 * What the surfaces read through.
 *
 * The local implementation behind this is a rendering cache and an offline
 * draft, never an entitlement: nothing paid is gated on it, and Phase 6
 * replaces it with a Supabase backed source that recomputes the level from the
 * append only attempt history. `subscribe` plus `getSnapshot` is the external
 * store shape, so a surface reads it with useSyncExternalStore and nothing in
 * this file imports React.
 */
export interface MasterySource {
  getSnapshot(): MasterySnapshot;
  subscribe(listener: () => void): () => void;
  levelFor(node: NodeId): MasteryLevel;
  /** Record one played beat. The implementation decides whether the level rises. */
  record(node: NodeId, result: BeatResult): void;
  reset(): void;
}

/** Pure read of a snapshot. A node nobody has opened is at L0, not missing. */
export function levelIn(snapshot: MasterySnapshot, node: NodeId): MasteryLevel {
  return snapshot.nodes[node]?.level ?? 0;
}

/** The rung to serve next: never above what the student has proved. */
export function levelToServe(snapshot: MasterySnapshot, node: NodeId): MasteryLevel {
  return levelIn(snapshot, node);
}
