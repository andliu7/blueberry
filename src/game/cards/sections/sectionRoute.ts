/**
 * Where a premade section deck lives, and nothing else. Kept this small on
 * purpose: the pathway (in the game's first load) imports it to put a
 * "Flashcards for this section" link under each section, and the cards and
 * drawings stay in the Cards tab's own lazy files (sectionDecks.ts).
 *
 *   #/app/cards/section/<unitId>/<key>/<mode>
 *
 * `key` is a section number ("1", "2"), "side" for a unit's side quests, or
 * "all" for a checkpoint unit whose road has no lessons of its own.
 */
import type { Card } from "../types";
import { hrefForTab } from "../../app/routes";

/** Units with a guidebook, so with premade decks (scripts/section_decks.py). */
export const SECTION_DECK_UNITS: ReadonlySet<string> = new Set(["u0", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"]);

export function sectionDeckId(unitId: string, key: string): string {
  return `section-${unitId}-${key}`;
}

export function sectionDeckHref(unitId: string, key: string, mode?: string): string {
  return mode === undefined ? hrefForTab("cards", "section", unitId, key) : hrefForTab("cards", "section", unitId, key, mode);
}

/** The deck a Cards tab route names (route.rest after the tab), or null. */
export function parseSectionRoute(rest: readonly string[]): { readonly unitId: string; readonly key: string; readonly mode: string | undefined } | null {
  if (rest[0] !== "section" || rest[1] === undefined || rest[2] === undefined) return null;
  if (!SECTION_DECK_UNITS.has(rest[1])) return null;
  return { unitId: rest[1], key: rest[2], mode: rest[3] };
}

/** A premade reaction card's tag: `secfig:<lesson>:<row>`, the guide row it draws. */
export const SECTION_FIGURE_TAG = "secfig:";

/** The guide row a card draws, or null for a card with no drawing. Here, not in sectionDecks.ts, so a card face can ask without loading the decks. */
export function sectionFigureOf(card: Card): { readonly unitId: string; readonly lesson: string; readonly row: number } | null {
  const tag = card.tags.find((entry) => entry.startsWith(SECTION_FIGURE_TAG));
  if (tag === undefined) return null;
  const [lesson, row] = tag.slice(SECTION_FIGURE_TAG.length).split(":");
  if (lesson === undefined || row === undefined || !/^\d+$/.test(row)) return null;
  return { unitId: lesson.split("-")[0]!, lesson, row: Number(row) };
}
