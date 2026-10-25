/**
 * PREMADE SECTION DECKS (STATUS "Owner brief, 23 Oct", D2): one flashcard
 * deck for every section of the path, built from that section's own lessons.
 * Pure: no React, no storage of its own.
 *
 * WHERE THE CARDS COME FROM. scripts/section_decks.py cuts them from each unit
 * guidebook (reaction rows drawn by RDKit, key ideas and common slips that
 * quote the pools) into uN.generated.ts, keyed by LESSON. The section cut
 * happens here, at run time, from unitSections() (tabs/pathway/testOuts.ts),
 * the same cut the path draws. Why: the cut has moved twice this month, and
 * keyed by lesson a re-cut never needs the generator rerun.
 *
 * WHICH DECKS A UNIT HAS (sectionDecksFor):
 *   - one per road section with lessons ("1", "2", ...);
 *   - "side": the unit's side quests the road does not draw, in one deck,
 *     when they make at least SECTION_DECK_MIN cards;
 *   - "all": a checkpoint unit (Units 2 and 6) whose road holds only side
 *     quests, so its one deck is every lesson in the unit (a side-quest-only
 *     deck came out under 8 cards);
 *   - Unit 0 is not on the path: its lessons cut every CHUNK, like a unit
 *     with no checkpoints (pathwaySections.ts).
 *
 * A BROWSE-ONLY CATALOGUE until the student studies it. Pressing Learn copies
 * the deck into their store (adoptSectionDeck) as a "lesson" deck, so the
 * existing scheduler, run and due counts work unchanged. Nothing is seeded
 * on its own.
 *
 * DRAWINGS STAY OUT OF THE STORE. A reaction card carries the tag
 * `secfig:<lesson>:<row>` and the face draws that row of the unit's guide
 * (SectionFigure.tsx), the same tag idea as cardStructure.ts, so cards/types.ts
 * is not widened and adopting a deck does not write drawing data into
 * localStorage.
 */
import type { Card, Deck, DeckSource } from "../types";
import { PATHWAY_UNITS, unitNumber, type PathwayUnit } from "../../demo/pathwayMap";
import { splitSections } from "../../tabs/pathway/pathwaySections";
import { unitSections } from "../../tabs/pathway/testOuts";
import { SECTION_CARD_COUNTS, SECTION_UNIT_LESSONS } from "./index.generated";
import { SECTION_FIGURE_TAG, sectionDeckId } from "./sectionRoute";

/** One premade card as the generator writes it. */
export interface SectionCardSeed {
  readonly id: string;
  readonly lesson: string;
  readonly kind: "reaction" | "idea" | "slip";
  readonly front: string;
  readonly back: string;
  readonly why: string;
  /** Reaction cards: the row of the lesson's guide example this card draws. */
  readonly fig?: number;
  /** Reaction cards: canonical RDKit SMILES, for the suite. */
  readonly reactants?: readonly string[];
  readonly products?: readonly string[];
}

/** The most cards a section deck takes. The rest stay in the generated file. */
export const SECTION_DECK_CAP = 20;
/** The fewest a listed deck holds. A side-quest deck under this is left off (Unit 3's two side quests made 5). */
export const SECTION_DECK_MIN = 8;
/** Every premade card is a draft, like the guide it comes from. Has a ":", so no chip shows it. */
export const DRAFT_TAG = "status:draft";

export interface SectionDeckRef {
  readonly id: string;
  readonly unitId: string;
  readonly key: string;
  /** "Section 2: Friedel-Crafts and blocking". */
  readonly title: string;
  /** "Unit 3". */
  readonly unitLabel: string;
  /** Guide lessons the deck draws from, in road order. */
  readonly lessons: readonly string[];
}

const LOADERS: Readonly<Record<string, () => Promise<readonly SectionCardSeed[]>>> = {
  u0: () => import("./u0.generated").then((m) => m.SECTION_CARDS),
  u1: () => import("./u1.generated").then((m) => m.SECTION_CARDS),
  u2: () => import("./u2.generated").then((m) => m.SECTION_CARDS),
  u3: () => import("./u3.generated").then((m) => m.SECTION_CARDS),
  u4: () => import("./u4.generated").then((m) => m.SECTION_CARDS),
  u5: () => import("./u5.generated").then((m) => m.SECTION_CARDS),
  u6: () => import("./u6.generated").then((m) => m.SECTION_CARDS),
  u7: () => import("./u7.generated").then((m) => m.SECTION_CARDS),
  u8: () => import("./u8.generated").then((m) => m.SECTION_CARDS),
  u9: () => import("./u9.generated").then((m) => m.SECTION_CARDS),
  u10: () => import("./u10.generated").then((m) => m.SECTION_CARDS),
};

/** A unit's premade cards, fetched once per unit as its own small file. */
export function loadUnitCards(unitId: string): Promise<readonly SectionCardSeed[]> {
  const load = LOADERS[unitId];
  return load === undefined ? Promise.resolve([]) : load();
}

/** Units with decks, in course order. */
export const SECTION_UNITS: readonly string[] = Object.keys(LOADERS);

function hasCards(lesson: string): boolean {
  return (SECTION_CARD_COUNTS[lesson] ?? 0) > 0;
}

const refCache = new Map<string, readonly SectionDeckRef[]>();

/** Every premade deck a unit has, in the order the Cards tab lists them. */
export function sectionDecksFor(unitId: string, units: readonly PathwayUnit[] = PATHWAY_UNITS): readonly SectionDeckRef[] {
  const cached = refCache.get(unitId);
  if (cached !== undefined) return cached;
  const guideLessons = (SECTION_UNIT_LESSONS[unitId] ?? []).filter(hasCards);
  const make = (key: string, title: string, unitLabel: string, lessons: readonly string[]): SectionDeckRef => ({
    id: sectionDeckId(unitId, key),
    unitId,
    key,
    title,
    unitLabel,
    lessons,
  });
  let refs: SectionDeckRef[] = [];
  const unit = units.find((entry) => entry.id === unitId);
  if (unit === undefined) {
    // Unit 0: not a pathway unit, so cut its lessons like a unit with no checkpoints.
    const parts = splitSections(guideLessons.map((id) => ({ id, title: id, checkpoint: false, item: id })));
    refs = parts.map((part) => make(String(part.number), `Part ${part.number}`, "Unit 0", part.stops.map((stop) => stop.id)));
  } else {
    const unitLabel = unitNumber(unit.title);
    const sections = unitSections(unit).map((section) => ({ section, lessons: section.sources.filter(hasCards) }));
    const onRoad = sections.filter((entry) => entry.lessons.length > 0);
    if (onRoad.length === 0) {
      if (guideLessons.length > 0) refs.push(make("all", `${unitLabel} lessons`, unitLabel, guideLessons));
    } else {
      for (const { section, lessons } of onRoad) refs.push(make(String(section.number), `Section ${section.number}: ${section.title}`, unitLabel, lessons));
      const taken = new Set(onRoad.flatMap((entry) => entry.lessons));
      const side = guideLessons.filter((lesson) => !taken.has(lesson));
      const sideDeck = make("side", "Side quests", unitLabel, side);
      if (sectionDeckSize(sideDeck) >= SECTION_DECK_MIN) refs.push(sideDeck);
    }
  }
  refCache.set(unitId, refs);
  return refs;
}

/** The deck a route names, or null. */
export function sectionDeckRef(unitId: string, key: string): SectionDeckRef | null {
  return sectionDecksFor(unitId).find((ref) => ref.key === key) ?? null;
}

/** The deck that holds this road section, for the path's link: null when the section has none. */
export function deckKeyForSection(unitId: string, sectionNumber: number): string | null {
  const ref = sectionDeckRef(unitId, String(sectionNumber)) ?? sectionDeckRef(unitId, "all");
  return ref?.key ?? null;
}

/**
 * The deck a Cards tab route opens. The path links every section by its
 * number (sectionRoute.ts cannot know the deck keys without loading this
 * file), so a checkpoint unit's one section, "1", opens its "all" deck.
 */
export function resolveSectionDeck(unitId: string, key: string): SectionDeckRef | null {
  const direct = sectionDeckRef(unitId, key);
  if (direct !== null || !/^\d+$/.test(key)) return direct;
  const fallback = deckKeyForSection(unitId, Number(key));
  return fallback === null ? null : sectionDeckRef(unitId, fallback);
}

/** How many cards the deck holds, from the small index, without loading any cards. */
export function sectionDeckSize(ref: SectionDeckRef): number {
  const total = ref.lessons.reduce((sum, lesson) => sum + (SECTION_CARD_COUNTS[lesson] ?? 0), 0);
  return Math.min(SECTION_DECK_CAP, total);
}

export function cardFromSeed(seed: SectionCardSeed): Card {
  const tags = [`node:${seed.lesson}`, DRAFT_TAG];
  if (seed.fig !== undefined) tags.push(`${SECTION_FIGURE_TAG}${seed.lesson}:${seed.fig}`);
  return {
    id: seed.id,
    front: seed.front,
    back: seed.back,
    why: seed.why,
    tags,
    source: { kind: "lesson", lessonId: seed.lesson, beatId: seed.id },
  };
}

/**
 * The deck's cards: taken round robin across its lessons (each lesson's first
 * card, then each one's second, ...) up to SECTION_DECK_CAP, so every lesson
 * is in the deck even when the section has more cards than fit.
 */
export function assembleSectionDeck(ref: SectionDeckRef, seeds: readonly SectionCardSeed[]): readonly Card[] {
  const byLesson = ref.lessons.map((lesson) => seeds.filter((seed) => seed.lesson === lesson));
  const out: SectionCardSeed[] = [];
  for (let round = 0; out.length < SECTION_DECK_CAP; round += 1) {
    const before = out.length;
    for (const list of byLesson) {
      const seed = list[round];
      if (seed !== undefined && out.length < SECTION_DECK_CAP) out.push(seed);
    }
    if (out.length === before) break;
  }
  return out.map(cardFromSeed);
}

/**
 * Copies a premade deck into the student's store, once. createDeck never
 * overwrites a deck, and saveCard is keyed by card id, so pressing Learn
 * twice adds nothing and keeps every review state.
 */
export function adoptSectionDeck(source: DeckSource, ref: SectionDeckRef, cards: readonly Card[]): void {
  const deck: Deck = { id: ref.id, title: `${ref.unitLabel} · ${ref.title}`, kind: "lesson", cardIds: [] };
  source.createDeck(deck);
  for (const card of cards) source.saveCard(card, ref.id);
}
