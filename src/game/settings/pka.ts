/**
 * The pKa values a STUDENT sees, which are not always the values the engine
 * ships with. Read this header before trusting anything in this file.
 *
 * WHY THIS LAYER EXISTS. `packages/curriculum/src/pka.ts` holds the ladder as
 * first class data with a source on every number, and it is correct. It is
 * also ONE professor's table. The number a student is marked against is the
 * number their own lecturer put on the board, and those disagree in real ways:
 * the course worksheet in `reference images/pKa Values_Names of functional
 * groups.pdf` prints water at 16 and the hydronium ion at about 0, where a
 * standard reference prints 15.7 and -1.7. Showing a student 15.7 when their
 * exam key says 16 teaches them to distrust the app.
 *
 * So this is a LAYER OVER that table and never a fork of it. Nothing here
 * edits `PKA_TABLE`, nothing here adds a rung to it, and adding a rung stays a
 * curriculum change rather than a settings change, because `PkaSiteId` is a
 * closed union and the checkers, causes and authored problems are written
 * against it. What this layer owns is three things: named PRESETS, per value
 * OVERRIDES that live with the profile, and one accessor, `pkaValueFor`, that
 * every beat, card and quiz reads through instead of reading the raw table.
 *
 * THE INTEGRITY LINE, and it is the reason this file is more than a lookup.
 * Displayed NUMBERS are configurable. Authored ORDERINGS ARE NOT. A sort
 * problem that ranks a carboxylic acid above a phenol was written by a person
 * who argued for that order, and it stays true under every table. When a
 * configured value would contradict one, there are three moves and two of them
 * are wrong: discarding the student's number teaches them the app knows better
 * than their lecturer, and re-ordering the problem teaches chemistry nobody
 * reviewed. The third is to APPLY the number, keep grading the authored ladder,
 * and FLAG the disagreement in words. That is `pkaOrderingConflicts`, and it is
 * a report rather than a repair, which is CLAUDE.md's non negotiable applied to
 * data instead of to a test.
 *
 * ADDING A PRESET IS DATA. A preset is an entry in `PKA_PRESETS` carrying only
 * the rungs it disagrees with, plus a source. A value with no source is a value
 * nobody can check, which is `pka.ts`'s own rule and it does not stop being
 * true one layer up.
 *
 * ONE SHIPPED PRESET DELIBERATELY RAISES A FLAG, and that is the feature
 * working rather than a defect. The course worksheet puts the C-H between two
 * carbonyls level with a phenol at 10, and the acidity ladder problem records
 * that tie as an accepted alternative order. Textbooks print diethyl malonate
 * near 13. Under the textbook preset those two rungs are no longer level, so
 * one of the problem's two accepted orders stops matching the numbers, and the
 * app says so. Choosing a softer value to keep the report clean would be
 * exactly the dodge the non negotiable forbids.
 *
 * TWO KNOWN GAPS, written here rather than left for a reader to discover.
 *
 * ONE, the ladder is shorter than the handout it names as its source. The
 * worksheet at `reference images/pKa Values_Names of functional groups.pdf`
 * prints an Amide rung at 15, between water and the alpha proton, and
 * `pKa's_KEY.pdf` problem b marks an amide N-H at exactly that. `PKA_TABLE`
 * has no amide rung, so a student checking a key answer of 15 against a screen
 * headed "The ladder" finds nothing. Page 2 of the same handout also carries
 * HCl, H2SO4, HBr, HI, HF, HNO3, HCN and carbocations, none of them on the
 * ladder either. Adding a rung is a CURRICULUM change: `PkaSiteId` is a closed
 * union and the checkers, causes and authored problems are written against it,
 * so this layer must not and does not paper over it with a preset value for a
 * rung that does not exist. It is escalated, not fixed here.
 *
 * TWO, this screen needs a door. There is no `settings` entry in
 * app/routes.ts, which is the integration agent's file, so `PkaSettings`
 * renders nowhere yet. The reading path is already wired: SortBeatView
 * subscribes to the store below and resolves every card's number through
 * `pkaValueFor`, so a change made here does reach a lesson the moment the
 * route exists.
 *
 * THE SEAM, and it is the same seam as app/progress.ts. `PkaSettingsSource` is
 * what surfaces read through; the local implementation keeps a per device copy
 * in storage and that copy is a RENDERING CACHE and a preference, never an
 * entitlement. Nothing paid is gated on it. Phase 6 swaps in a profile backed
 * source and the surfaces do not change. The store is an external store
 * (subscribe plus getSnapshot), so a surface reads it with useSyncExternalStore
 * and nothing in this file imports React.
 */

import {
  ORDERING_PROBLEMS,
  PKA_TABLE,
  acceptedOrderings,
  pkaEntry,
  type OrderingAnswerSpec,
  type PkaSiteId,
  type PkaSource,
  type Problem,
  type ProblemId,
} from "@blueberry/curriculum";
import {
  DEFAULT_LEVELS,
  authoredOrderConflicts,
  type SortBeat,
  type SortCriterion,
  type SortItem,
} from "../beats/types";
import type { Card, CardSource } from "../cards/types";

/* ------------------------------------------------------------------ */
/* Presets                                                              */
/* ------------------------------------------------------------------ */

/**
 * A plain string, not a union, because a union would make adding a preset a
 * code change in two files. `PKA_PRESETS` is the authority and an id that is
 * not in it resolves to the default rather than crashing: the id can arrive
 * from storage written by an older build.
 */
export type PkaPresetId = string;

export interface PkaPreset {
  readonly id: PkaPresetId;
  /** Student facing. The name a student would use for this table out loud. */
  readonly label: string;
  /** One line: whose table this is and when to pick it. */
  readonly blurb: string;
  /** Where the numbers came from. A preset with no source is not shippable. */
  readonly source: string;
  /**
   * ONLY the rungs this preset disagrees with. Everything unlisted falls
   * through to PKA_TABLE, so a preset stays readable as a diff and a new rung
   * added to the curriculum is inherited by every preset automatically.
   */
  readonly values: Readonly<Partial<Record<PkaSiteId, number>>>;
}

export const COURSE_PRESET_ID: PkaPresetId = "course_worksheet";
export const TEXTBOOK_PRESET_ID: PkaPresetId = "textbook";

export const PKA_PRESETS: readonly PkaPreset[] = Object.freeze([
  Object.freeze({
    id: COURSE_PRESET_ID,
    label: "This course's worksheet",
    blurb: "The ladder as the CHEM 241 pKa handout prints it. Start here if you are in that course.",
    source: "reference images/pKa Values_Names of functional groups.pdf, page 1",
    // The handout groups the hydronium ion with the protonated alcohol at
    // about 0 and prints water at 16 alongside the alcohol, where pka.ts
    // carries the standard reference numbers for both. Two rungs, two
    // differences, and they are the whole diff.
    values: Object.freeze({
      hydronium: 0,
      water: 16,
    }),
  }),
  Object.freeze({
    id: TEXTBOOK_PRESET_ID,
    label: "Standard textbook",
    blurb:
      "The numbers most organic texts print, to one decimal where they give one. Pick this if your key marks to the book.",
    source: "Standard reference values, as carried by the common Organic Chemistry texts",
    values: Object.freeze({
      protonated_alcohol: -2.4,
      carboxylic_acid: 4.8,
      ammonium: 10.6,
      // Diethyl malonate, not acetylacetone. This is the value that breaks the
      // authored tie with phenol, on purpose. See the header.
      beta_dicarbonyl_alpha_ch: 13,
      ketone_alpha_ch: 19,
      amine_nh: 38,
      vinylic_or_aromatic_ch: 43,
    }),
  }),
]);

export const DEFAULT_PRESET_ID: PkaPresetId = COURSE_PRESET_ID;

/** Falls back rather than throwing: an unknown id can arrive from storage. */
export function pkaPreset(id: PkaPresetId): PkaPreset {
  const found = PKA_PRESETS.find((preset) => preset.id === id);
  if (found !== undefined) return found;
  const fallback = PKA_PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID);
  if (fallback === undefined) {
    throw new Error("PKA_PRESETS is missing its default preset, which is an authoring defect");
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Settings, and the one accessor                                       */
/* ------------------------------------------------------------------ */

export interface PkaSettingsSnapshot {
  readonly presetId: PkaPresetId;
  /** Per value, on top of the preset. The student's own corrections. */
  readonly overrides: Readonly<Partial<Record<PkaSiteId, number>>>;
}

export const DEFAULT_PKA_SETTINGS: PkaSettingsSnapshot = Object.freeze({
  presetId: DEFAULT_PRESET_ID,
  overrides: Object.freeze({}),
});

/** Where a displayed number came from. Shown beside it, so nothing is a mystery. */
export type PkaOrigin = "table" | "preset" | "override";

export interface ResolvedPka {
  readonly id: PkaSiteId;
  /** Student facing, from the curriculum table. Presets never rename a rung. */
  readonly label: string;
  /** What to display. */
  readonly value: number;
  readonly origin: PkaOrigin;
  /** What the shipped table says, so a row can show what it was changed from. */
  readonly baseValue: number;
  readonly source: PkaSource;
  readonly note?: string;
  /** The preset that supplied the value, when origin is "preset". */
  readonly presetLabel?: string;
}

/**
 * THE ACCESSOR. Beats, cards and quizzes call this and never `pkaValue`.
 *
 * Resolution order is table, then preset, then override, each one winning over
 * the one before it. Three layers is the whole model.
 */
export function pkaValueFor(settings: PkaSettingsSnapshot, id: PkaSiteId): number {
  const override = settings.overrides[id];
  if (override !== undefined) return override;
  const preset = pkaPreset(settings.presetId).values[id];
  if (preset !== undefined) return preset;
  return pkaEntry(id).pka;
}

/** The same lookup, with the provenance a settings row needs to explain itself. */
export function resolvePka(settings: PkaSettingsSnapshot, id: PkaSiteId): ResolvedPka {
  const entry = pkaEntry(id);
  const preset = pkaPreset(settings.presetId);
  const override = settings.overrides[id];
  const presetValue = preset.values[id];

  const base = {
    id,
    label: entry.label,
    baseValue: entry.pka,
    source: entry.source,
    ...(entry.note === undefined ? {} : { note: entry.note }),
  };

  if (override !== undefined) {
    return { ...base, value: override, origin: "override" };
  }
  if (presetValue !== undefined) {
    return { ...base, value: presetValue, origin: "preset", presetLabel: preset.label };
  }
  return { ...base, value: entry.pka, origin: "table" };
}

/**
 * Every rung, most acidic first, which is the order the handout prints and the
 * order a student reads a ladder in. Ties keep the table's own order, so the
 * list does not reshuffle under the reader when two rungs meet.
 */
export function resolvedLadder(settings: PkaSettingsSnapshot): readonly ResolvedPka[] {
  const ids = Object.keys(PKA_TABLE) as PkaSiteId[];
  return ids
    .map((id, index) => ({ resolved: resolvePka(settings, id), index }))
    .sort((a, b) => a.resolved.value - b.resolved.value || a.index - b.index)
    .map((row) => row.resolved);
}

/** How many rungs this student has moved away from the preset. */
export function overrideCount(settings: PkaSettingsSnapshot): number {
  return Object.keys(settings.overrides).length;
}

/**
 * One or two significant figures, the way the course teaches them. See the
 * precision note in pka.ts: a value taught as "about 16" is not a measurement,
 * so it is never padded out to three digits.
 */
export function formatPka(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/* ------------------------------------------------------------------ */
/* What a student is allowed to type                                    */
/* ------------------------------------------------------------------ */

/**
 * The widest range any rung in this product can honestly take. The shipped
 * table runs -7 to 50 and the handout's second page reaches -10, so the window
 * is generous on both ends: this rejects a typo, not an opinion.
 */
export const PKA_INPUT_MIN = -25;
export const PKA_INPUT_MAX = 65;

/**
 * Whether a number is allowed to be STORED as an override, which is a
 * different question from whether a student typed it well.
 *
 * ONE PLACE, and that is the point of it being here rather than inline twice.
 * The setter and the loader both ask this. When only the loader asked, a value
 * written by any caller that was not this form survived the session and then
 * vanished on the next reload, which is the worst of both answers: the student
 * saw it work, and it did not. A floor that only the reader enforces is not a
 * floor.
 */
export function isStorablePka(value: number): boolean {
  return Number.isFinite(value) && value >= PKA_INPUT_MIN && value <= PKA_INPUT_MAX;
}

/**
 * Why a typed value cannot be stored, in the coach voice, or null when it can.
 *
 * Not a boolean, because a rejection a student cannot read is a rejection they
 * cannot act on. Takes the raw text so it can tell "not a number" apart from
 * "off the ladder".
 */
export function pkaInputRejection(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Type a number here, or clear the row to go back to the table value.";
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return `A pKa is a plain number, like 4.8 or -7. "${trimmed}" is not one yet.`;
  }
  if (value < PKA_INPUT_MIN || value > PKA_INPUT_MAX) {
    return `Every rung in this course sits between ${PKA_INPUT_MIN} and ${PKA_INPUT_MAX}, so ${formatPka(value)} looks like a slipped digit or a lost minus sign.`;
  }
  return null;
}

/** The parsed value, or null when `pkaInputRejection` would have something to say. */
export function parsePkaInput(raw: string): number | null {
  if (pkaInputRejection(raw) !== null) return null;
  return Number(raw.trim());
}

/* ------------------------------------------------------------------ */
/* The authored orderings, and where a table would contradict one       */
/* ------------------------------------------------------------------ */

/**
 * Which authored ordering problems are DRIVEN by pKa, and which rung each item
 * stands on.
 *
 * WHY THIS IS AUTHORED AND NOT INFERRED. A `Problem` carries `pkaSites`, and on
 * the acidity ladder that array happens to be in the same order as the answer's
 * items. Nothing says it has to be: `pkaSites` describes the prompt's
 * underlined protons and `items` describes the cards a student drags, and
 * zipping two lists that are only accidentally parallel is how a check quietly
 * starts comparing the wrong pair. So the link is written down, and
 * `pkaLinkDefects` fails loudly if the corpus moves underneath it.
 *
 * `direction` describes the pKa NUMBER along the authored order, not the word
 * in the prompt. "Most acidic first" means the numbers rise, so it is
 * ascending. Saying it in terms of the number is the only version the checker
 * can act on.
 *
 * The acyl reactivity ladder is deliberately absent. It ranks by reactivity
 * toward nucleophilic acyl substitution, which the leaving group pKa explains
 * but does not define, and a check that pretended otherwise would flag a table
 * for disagreeing with something it was never asserting.
 */
export interface PkaLadderLink {
  readonly problemId: ProblemId;
  readonly criterion: SortCriterion;
  readonly direction: "ascending" | "descending";
  /** Answer item id to pKa rung. Every item of the problem must appear. */
  readonly sites: Readonly<Record<string, PkaSiteId>>;
}

export const PKA_LADDER_LINKS: readonly PkaLadderLink[] = Object.freeze([
  Object.freeze({
    problemId: "org2-order-acidity-ladder",
    criterion: "pka" as SortCriterion,
    direction: "ascending" as const,
    sites: Object.freeze({
      "carboxylic-acid": "carboxylic_acid" as PkaSiteId,
      phenol: "phenol" as PkaSiteId,
      "beta-dicarbonyl": "beta_dicarbonyl_alpha_ch" as PkaSiteId,
      "ketone-alpha": "ketone_alpha_ch" as PkaSiteId,
    }),
  }),
]);

export interface PkaLinkDefect {
  readonly problemId: ProblemId;
  readonly message: string;
}

function orderingSpecOf(problem: Problem): OrderingAnswerSpec | null {
  return problem.answer.kind === "ordering" ? problem.answer : null;
}

/**
 * Where a link no longer matches the corpus it points at.
 *
 * This is the check that stops the conflict report from passing by accident. A
 * renamed item id would otherwise leave an item with no value, and an item with
 * no value is SKIPPED by `authoredOrderConflicts` by design, so the report would
 * go quiet exactly when it should be loudest. A test asserts this list is
 * empty, which turns a silent skip into a failing build.
 */
export function pkaLinkDefects(): readonly PkaLinkDefect[] {
  const defects: PkaLinkDefect[] = [];
  const seen = new Set<ProblemId>();

  for (const link of PKA_LADDER_LINKS) {
    if (seen.has(link.problemId)) {
      defects.push({ problemId: link.problemId, message: "is linked twice" });
      continue;
    }
    seen.add(link.problemId);

    const problem = ORDERING_PROBLEMS.find((candidate) => candidate.id === link.problemId);
    if (problem === undefined) {
      defects.push({ problemId: link.problemId, message: "is not an ordering problem in the corpus" });
      continue;
    }
    const spec = orderingSpecOf(problem);
    if (spec === null) {
      defects.push({ problemId: link.problemId, message: "does not carry an ordering answer" });
      continue;
    }

    const itemIds = new Set(spec.items.map((item) => item.id));
    for (const linkedId of Object.keys(link.sites)) {
      if (!itemIds.has(linkedId)) {
        defects.push({
          problemId: link.problemId,
          message: `links item "${linkedId}", which the problem no longer has`,
        });
      }
    }
    for (const item of spec.items) {
      if (link.sites[item.id] === undefined) {
        defects.push({
          problemId: link.problemId,
          message: `item "${item.id}" has no pKa rung, so it would be skipped silently`,
        });
      }
    }

    const bySite = new Map<PkaSiteId, string>();
    for (const [itemId, siteId] of Object.entries(link.sites)) {
      const already = bySite.get(siteId);
      if (already !== undefined) {
        defects.push({
          problemId: link.problemId,
          message: `items "${already}" and "${itemId}" both stand on rung "${siteId}", so they can never be ranked apart`,
        });
      }
      bySite.set(siteId, itemId);
    }
  }
  return defects;
}

/**
 * The three ways a table can contradict an authored ladder.
 *
 * `order_flipped` is the severe one: the numbers rank two rungs the opposite
 * way to the authored answer. `tie_broken` is a table separating two rungs the
 * problem records as interchangeable. `tie_unrecorded` is the mirror image: a
 * table levelling two rungs the problem ranks strictly, with no accepted
 * alternative saying either order is fine, so the numbers stop deciding.
 */
export type PkaConflictKind = "order_flipped" | "tie_broken" | "tie_unrecorded";

export interface PkaConflictSide {
  readonly itemId: string;
  readonly siteId: PkaSiteId;
  readonly label: string;
  readonly value: number;
}

export interface PkaOrderingConflict {
  readonly problemId: ProblemId;
  readonly kind: PkaConflictKind;
  /** What the first position means, in the authored problem's own words. */
  readonly criterion: string;
  /** The rung the authored order puts first of the two. */
  readonly earlier: PkaConflictSide;
  readonly later: PkaConflictSide;
  /** Coach voice, ready to render. Names what happened and what is unchanged. */
  readonly message: string;
}

/**
 * A rung as one of these flags names it.
 *
 * The label is the ANSWER ITEM's own wording ("A phenol O-H"), not the pKa
 * table's ("Phenol O-H"), because the student is looking at the card they just
 * dragged and a flag that renames it makes them hunt for what it means.
 */
function sideOf(
  settings: PkaSettingsSnapshot,
  link: PkaLadderLink,
  itemId: string,
  label: string,
): PkaConflictSide | null {
  const siteId = link.sites[itemId];
  if (siteId === undefined) return null;
  return { itemId, siteId, label, value: pkaValueFor(settings, siteId) };
}

/**
 * A label written for the start of a sentence, dropped into the middle of one.
 * "A phenol O-H" becomes "a phenol O-H". Two capitals in a row are left alone,
 * so a reagent name like "PCC" survives.
 */
function midSentence(label: string): string {
  const first = label.charAt(0);
  const second = label.charAt(1);
  if (first !== first.toLowerCase() && second !== "" && second !== second.toLowerCase()) {
    return label;
  }
  return first.toLowerCase() + label.slice(1);
}

/**
 * A `SortBeat` built from an authored ordering problem, so the corpus check and
 * a hand authored sort beat run through the SAME comparison.
 *
 * `authoredOrderConflicts` in beats/types.ts is the one implementation of "do
 * these values contradict this order". Rewriting the loop here would leave two
 * versions of the rule to keep in step, and the first time they drifted the
 * report would depend on which surface asked.
 */
function sortBeatFrom(
  problem: Problem,
  spec: OrderingAnswerSpec,
  link: PkaLadderLink,
  order: readonly string[],
  beatId: string,
): SortBeat {
  const items: SortItem[] = spec.items.map((item) => {
    const siteId = link.sites[item.id];
    return {
      id: item.id,
      label: item.text,
      ...(siteId === undefined ? {} : { pkaSiteId: siteId }),
    };
  });
  return {
    id: beatId,
    kind: "sort",
    node: problem.topic,
    conceptIds: [],
    levels: DEFAULT_LEVELS.sort,
    prompt: problem.prompt,
    criterion: link.criterion,
    direction: link.direction,
    items,
    order: [...order],
  };
}

/** The lookup `authoredOrderConflicts` takes, closed over the student's table. */
export function sortItemValue(
  settings: PkaSettingsSnapshot,
): (item: SortItem) => number | undefined {
  return (item) => {
    if (item.pkaSiteId === undefined) return undefined;
    if (!(item.pkaSiteId in PKA_TABLE)) return undefined;
    return pkaValueFor(settings, item.pkaSiteId as PkaSiteId);
  };
}

/**
 * A hand authored sort beat, checked against the student's table.
 *
 * Exported for the beat surfaces: a sort beat renders its flag the same way the
 * settings page does, from the same function, so the two can never disagree
 * about whether there is a problem.
 */
export function sortBeatPkaConflicts(
  beat: SortBeat,
  settings: PkaSettingsSnapshot,
): readonly PkaOrderingConflict[] {
  const byId = new Map(beat.items.map((item) => [item.id, item]));
  return authoredOrderConflicts(beat, sortItemValue(settings)).map((conflict) => {
    const earlierItem = byId.get(conflict.earlierId);
    const laterItem = byId.get(conflict.laterId);
    const earlier: PkaConflictSide = {
      itemId: conflict.earlierId,
      siteId: (earlierItem?.pkaSiteId ?? conflict.earlierId) as PkaSiteId,
      label: earlierItem?.label ?? conflict.earlierId,
      value: conflict.earlierValue,
    };
    const later: PkaConflictSide = {
      itemId: conflict.laterId,
      siteId: (laterItem?.pkaSiteId ?? conflict.laterId) as PkaSiteId,
      label: laterItem?.label ?? conflict.laterId,
      value: conflict.laterValue,
    };
    return {
      problemId: beat.id,
      kind: "order_flipped" as PkaConflictKind,
      criterion: beat.criterion,
      earlier,
      later,
      message: flippedMessage(earlier, later),
    };
  });
}

/**
 * The three flags, in the coach voice, and every one of them says what did NOT
 * change. A student reading these has just found their lecturer and this app
 * disagreeing, which is unsettling on its own; the sentence that settles it is
 * that their number was kept and the question was not quietly rewritten.
 */
function flippedMessage(earlier: PkaConflictSide, later: PkaConflictSide): string {
  return (
    `Your table puts ${midSentence(later.label)} at ${formatPka(later.value)} and ` +
    `${midSentence(earlier.label)} at ${formatPka(earlier.value)}, which ranks those two the ` +
    `opposite way to the answer this question is marked on. Your number is still the number ` +
    `shown, and the question still grades on the ladder it was written with. The flag is here so ` +
    `you can take it to your professor, rather than the app picking a side quietly.`
  );
}

function tieBrokenMessage(earlier: PkaConflictSide, later: PkaConflictSide): string {
  return (
    `${earlier.label} and ${midSentence(later.label)} are level in this question, so either ` +
    `order between them is accepted. Your table separates them, ${midSentence(earlier.label)} at ` +
    `${formatPka(earlier.value)} and ${midSentence(later.label)} at ${formatPka(later.value)}, so ` +
    `one of those two accepted orders no longer matches your numbers. Both still grade as correct.`
  );
}

function tieUnrecordedMessage(earlier: PkaConflictSide, later: PkaConflictSide): string {
  return (
    `Your table gives ${midSentence(earlier.label)} and ${midSentence(later.label)} the same ` +
    `value, ${formatPka(earlier.value)}. This question ranks ${midSentence(earlier.label)} first ` +
    `and records no tie between them, so the numbers no longer say which of the two comes first. ` +
    `The authored order is what it grades on.`
  );
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const CONFLICT_RANK: Readonly<Record<PkaConflictKind, number>> = {
  order_flipped: 3,
  tie_broken: 2,
  tie_unrecorded: 1,
};

/**
 * Every authored ordering in the corpus, checked against this table.
 *
 * A pair is reported once. A table that flips a rung will usually flip it in
 * the primary order AND in an accepted alternative, and those are one
 * disagreement said twice; the more specific reading wins, which is the same
 * rule `answers/ordering.ts` uses when it picks which accepted order to
 * diagnose a wrong submission against.
 */
export function pkaOrderingConflicts(
  settings: PkaSettingsSnapshot,
): readonly PkaOrderingConflict[] {
  const byPair = new Map<string, PkaOrderingConflict>();

  const keep = (conflict: PkaOrderingConflict) => {
    const key = `${conflict.problemId}::${pairKey(conflict.earlier.itemId, conflict.later.itemId)}`;
    const existing = byPair.get(key);
    if (existing !== undefined && CONFLICT_RANK[existing.kind] >= CONFLICT_RANK[conflict.kind]) {
      return;
    }
    byPair.set(key, conflict);
  };

  for (const link of PKA_LADDER_LINKS) {
    const problem = ORDERING_PROBLEMS.find((candidate) => candidate.id === link.problemId);
    if (problem === undefined) continue;
    const spec = orderingSpecOf(problem);
    if (spec === null) continue;

    const labelOf = new Map(spec.items.map((item) => [item.id, item.text]));
    const orders = acceptedOrderings(spec);
    orders.forEach((order, index) => {
      const beat = sortBeatFrom(problem, spec, link, order, problem.id);
      for (const conflict of sortBeatPkaConflicts(beat, settings)) {
        keep(
          index === 0
            ? { ...conflict, criterion: spec.criterion }
            : {
                ...conflict,
                criterion: spec.criterion,
                kind: "tie_broken",
                message: tieBrokenMessage(conflict.earlier, conflict.later),
              },
        );
      }
    });

    // The mirror case: two rungs the problem ranks strictly that this table
    // levels. authoredOrderConflicts cannot see it, because equal values do not
    // flip an order; they empty it of meaning, which is a different sentence.
    for (let index = 0; index + 1 < spec.correctOrder.length; index += 1) {
      const earlierId = spec.correctOrder[index];
      const laterId = spec.correctOrder[index + 1];
      if (earlierId === undefined || laterId === undefined) continue;
      const earlier = sideOf(settings, link, earlierId, labelOf.get(earlierId) ?? earlierId);
      const later = sideOf(settings, link, laterId, labelOf.get(laterId) ?? laterId);
      if (earlier === null || later === null) continue;
      if (earlier.value !== later.value) continue;
      const recorded = orders.some((order) => order.indexOf(laterId) < order.indexOf(earlierId));
      if (recorded) continue;
      keep({
        problemId: problem.id,
        kind: "tie_unrecorded",
        criterion: spec.criterion,
        earlier,
        later,
        message: tieUnrecordedMessage(earlier, later),
      });
    }
  }

  return [...byPair.values()];
}

/** The flags for one problem, for a lesson surface that only cares about its own. */
export function pkaConflictsForProblem(
  settings: PkaSettingsSnapshot,
  problemId: ProblemId,
): readonly PkaOrderingConflict[] {
  return pkaOrderingConflicts(settings).filter((conflict) => conflict.problemId === problemId);
}

/* ------------------------------------------------------------------ */
/* Cards                                                                */
/* ------------------------------------------------------------------ */

/**
 * A pKa rung as a flashcard, with the number the student has configured.
 *
 * This is the reason the accessor exists rather than fifteen call sites reading
 * `PKA_TABLE`. A card is reviewed cold weeks later, and a card showing 15.7
 * when the exam key says 16 is worse than no card.
 *
 * The CardId is derived from the rung and is STABLE across a preset switch,
 * which is the invariant cards/types.ts states: changing the number on the back
 * is not asking a different question, so the review history survives. `source`
 * is supplied by the caller, because only the caller knows whether this card
 * came out of a lesson, out of a mistake, or out of an import.
 */
export function pkaCard(
  siteId: PkaSiteId,
  settings: PkaSettingsSnapshot,
  source: CardSource,
): Card {
  const resolved = resolvePka(settings, siteId);
  const provenance =
    resolved.origin === "override"
      ? "This is the value you set, so it is the one you will be marked against."
      : resolved.origin === "preset"
        ? `This is the ${resolved.presetLabel ?? "chosen"} value.`
        : "This is the value the course ladder ships with.";
  return {
    id: `pka:${siteId}`,
    front: `About what pKa is ${resolved.label.toLowerCase()}?`,
    back: `About ${formatPka(resolved.value)}`,
    why: resolved.note === undefined ? provenance : `${resolved.note} ${provenance}`,
    tags: ["pka", "ladder", siteId],
    source,
  };
}

/* ------------------------------------------------------------------ */
/* The store                                                            */
/* ------------------------------------------------------------------ */

export const PKA_SETTINGS_KEY = "blueberry.pka.v1";

/**
 * The two methods this file needs from localStorage, named so a test can pass a
 * Map and so a browser with storage blocked degrades to a session-only choice
 * rather than a crash.
 */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage when there is one, and a no-op when there is not. */
export function browserStorage(): SettingsStorage {
  return {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage blocked: the choice lasts for the session */
      }
    },
  };
}

export interface PkaSettingsSource {
  getSnapshot(): PkaSettingsSnapshot;
  subscribe(listener: () => void): () => void;
  setPreset(id: PkaPresetId): void;
  /**
   * True when the value was stored, false when it was refused for being off
   * the ladder. A return value rather than a throw, because refusing is a
   * normal answer to a slipped digit and not an exceptional one. See
   * `isStorablePka`: the setter enforces the same range the loader does, so a
   * value that is accepted here is a value that comes back after a reload.
   */
  setOverride(site: PkaSiteId, value: number): boolean;
  clearOverride(site: PkaSiteId): void;
  clearAllOverrides(): void;
  reset(): void;
}

/** Anything that is not a finite number on a real rung is dropped on the way in. */
function sanitiseOverrides(raw: unknown): Partial<Record<PkaSiteId, number>> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Partial<Record<PkaSiteId, number>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in PKA_TABLE)) continue;
    if (typeof value !== "number" || !isStorablePka(value)) continue;
    out[key as PkaSiteId] = value;
  }
  return out;
}

function load(storage: SettingsStorage): PkaSettingsSnapshot {
  try {
    const raw = storage.getItem(PKA_SETTINGS_KEY);
    if (raw === null) return DEFAULT_PKA_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PkaSettingsSnapshot>;
    const presetId = typeof parsed.presetId === "string" ? parsed.presetId : DEFAULT_PRESET_ID;
    return {
      // pkaPreset falls back on an unknown id, so a preset removed in a later
      // build reads as the default instead of showing an empty table.
      presetId: pkaPreset(presetId).id,
      overrides: sanitiseOverrides(parsed.overrides),
    };
  } catch {
    return DEFAULT_PKA_SETTINGS;
  }
}

export function createPkaSettings(storage: SettingsStorage = browserStorage()): PkaSettingsSource {
  let snapshot = load(storage);
  const listeners = new Set<() => void>();

  const commit = (next: PkaSettingsSnapshot) => {
    snapshot = next;
    try {
      storage.setItem(PKA_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: the choice lasts for the session */
    }
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreset(id) {
      // Idempotent on purpose. The settings page fires this on pointer down for
      // the instant acknowledgement AND on click so the keyboard works, and a
      // no-op second call is cheaper than tracking which event got there first.
      const resolved = pkaPreset(id).id;
      if (resolved === snapshot.presetId) return;
      commit({ ...snapshot, presetId: resolved });
    },
    setOverride(site, value) {
      // The same range the loader enforces, asked in the same function. A
      // value refused here is refused everywhere, so nothing can be stored
      // that would silently revert on the next reload.
      if (!isStorablePka(value)) return false;
      if (snapshot.overrides[site] === value) return true;
      commit({ ...snapshot, overrides: { ...snapshot.overrides, [site]: value } });
      return true;
    },
    clearOverride(site) {
      if (snapshot.overrides[site] === undefined) return;
      const next = { ...snapshot.overrides };
      delete next[site];
      commit({ ...snapshot, overrides: next });
    },
    clearAllOverrides() {
      if (overrideCount(snapshot) === 0) return;
      commit({ ...snapshot, overrides: {} });
    },
    reset() {
      commit(DEFAULT_PKA_SETTINGS);
    },
  };
}

/** One instance for the app. Module scope, like `progress` in app/progress.ts. */
export const pkaSettings: PkaSettingsSource = createPkaSettings();
