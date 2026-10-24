import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import { allUnitNotes } from "@/data/learnMap";
import { REACTIONS } from "@/data/reactions";
import { DECKS } from "@/data/decks";
import { deckCount } from "@/data/types";
import { plural } from "@/lib/helpers";

/**
 * THE COUNTS. Every number the home page states about the course comes from here
 * (SITE-REPLAN.md section 1, "One taxonomy": the audit found four different counts for
 * the same course, 6 topics, 12 sections, 15 units and 208 nodes, because each page
 * typed or computed its own).
 *
 * This module holds no data and no rows. It reads the tables that already own each
 * fact and counts them:
 * - units: the game's fifteen units (`PATHWAY_UNITS`), the spine every lesson, reaction,
 *   deck and node hangs off. `src/data/learnMap.ts` maps the lessons onto those units
 *   (a draft pending the owner, section 1), and it reads the same `PATHWAY_UNITS`, so the
 *   two cannot disagree about how many units there are.
 * - notes: the unit notes (`allUnitNotes` in learnMap.ts), the same list the Learn rail
 *   counts, so home and Learn say one number (audit 23 Oct, section 5 #2). The app's
 *   lessons are counted by the Path's own rule (pathwayState.ts deriveMapPathway), never here.
 * - reactions: the checked reactions (`src/data/reactions.ts`, generated and RDKit-validated).
 * - decks and cards: the built-in deck library (`DECKS`), the same list Study Decks opens on.
 *
 * `src/test/taxonomy.test.ts` checks each count against its table and scans the home files
 * for a number typed next to one of these nouns.
 */
export interface SiteCounts {
  units: number;
  notes: number;
  reactions: number;
  decks: number;
  cards: number;
}

export function siteCounts(): SiteCounts {
  return {
    units: PATHWAY_UNITS.length,
    notes: allUnitNotes().length,
    reactions: REACTIONS.length,
    decks: DECKS.length,
    cards: DECKS.reduce((n, d) => n + deckCount(d), 0),
  };
}

/** "1 unit", "15 units". The noun is passed in singular; English plurals here all take -s. */
export function counted(n: number, noun: string): string {
  return plural(n, noun, `${noun}s`);
}

/** The one count line on each of home's destination cards (beat 3). Schedule has none: its
 *  dates live in the database, not in a table this module can count at build time. */
export function homeCardCounts(c: SiteCounts = siteCounts()) {
  return {
    // "unit notes", not "lessons": a lesson is the app's (audit 23 Oct, section 5 #2).
    learn: `${counted(c.notes, "unit note")}, ${counted(c.reactions, "reaction")}`,
    practice: `${counted(c.units, "unit")} on the path`,
    review: `${counted(c.decks, "deck")}, ${counted(c.cards, "card")}`,
  } as const;
}
