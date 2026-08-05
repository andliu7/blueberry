import type { ArtMotif } from "@/data/testimonialArt";

/** A plain question with a written answer. */
export interface QAItem {
  mc?: false;
  q: string;
  a: string;
}

/**
 * A multiple choice question. `correct` indexes into `options`.
 *
 * Pass an array for a select-all-that-apply question: the card then lets you
 * tick several options and reveals the answer on a Check button rather than on
 * the first click. The LCTA asks both kinds, so both are worth drilling.
 */
export interface MCItem {
  mc: true;
  q: string;
  options: string[];
  correct: number | number[];
  a: string;
}

export type Question = QAItem | MCItem;

/**
 * One row of a reference deck: a thing to recall, and the value that answers
 * it. `image` names a file in `public/cards`, without the extension.
 */
export interface DeckItem {
  title: string;
  description: string;
  /** The answer, shown on the right: a pKa, a wavenumber, a shift range. */
  badge: string;
  /** Diagram shown on hover, or inline on tap. Omit for a text-only row. */
  image?: string;
}

/** A labelled block of reference rows. */
export interface DeckGroup {
  heading?: string;
  items: DeckItem[];
}

/**
 * Everything the hub and the title screen need, shared by both kinds of deck.
 */
type DeckCommon = {
  /** Used in the URL: `#/deck/<id>`. Keep it short and URL safe. */
  id: string;
  /** Shown on the hub card. The course format, e.g. "[CHEM 242] Lab 3: ...". */
  title: string;
  /**
   * Nav pill label. The full course titles are too long for the pill, so each
   * deck carries a one-word version. Falls back to `title`.
   */
  short?: string;
  /**
   * Hash target, when it is not the default `#/deck/<id>`. Only the Grignard
   * deck sets this: it sits at the bare URL because that is the link people
   * already have, and moving it would break every shared bookmark.
   */
  href?: string;
  /**
   * The title screen heading, split into lines. Two short lines beat one long
   * one: each character is rendered as its own inline-block for the hover
   * effect, so a single long string can break mid-word on a narrow screen.
   */
  titleLines: string[];
  /** One sentence beneath the title screen heading. */
  subtitle: string;
  /** Longer description for the hub card. */
  blurb: string;
  /**
   * What this deck is actually for: the purpose of the experiment and the
   * concepts it tests, or for a reference deck the background behind the
   * chart. Shown once at the top of the deck page, above the questions.
   */
  about?: string;
  /**
   * Why the experiment is run and what it is meant to teach, written in the
   * register of a lab manual rather than of revision notes. Separate from
   * `about` because the two answer different questions: `about` is what you
   * need in your head before the LCTA, this is what the experiment is for.
   */
  purpose?: string;
  /** A lighter aside, shown apart from `purpose` so it cannot be mistaken for it. */
  funFact?: string;
  /** Optional parting line in the deck footer, above the thank-you note. */
  footNote?: string;
  /** Illustration, chosen from the motifs in `testimonialArt.ts`. */
  motif: ArtMotif;
  /**
   * Which folder this deck sits in on the hub. Lab decks are what people
   * arrive for; reference decks are what they look up mid-lab.
   */
  group?: DeckGroupId;
  /**
   * A sub-folder inside Uploaded, by name. Only uploaded decks use this: the
   * built-in groups are fixed and are not something anyone reorganises.
   *
   * Absent means loose, shown at the top level of the folder rather than hidden
   * inside anything.
   */
  shelf?: string;
  /** Gradient for the hub card's artwork well. */
  from: string;
  to: string;
};

export type DeckGroupId = "lab" | "reference" | "uploaded";

/** Folder headings, in the order the hub shows them. */
export const DECK_GROUPS: {
  id: DeckGroupId;
  title: string;
  blurb: string;
  /** Folder card wash, so the two groups are told apart at a glance. */
  from: string;
  to: string;
}[] = [
  {
    id: "lab",
    title: "[CHEM 242] LCTA",
    blurb: "One deck per experiment, written for the lab critical thinking assessment.",
    from: "#4f46e5",
    to: "#7c3aed",
  },
  {
    id: "reference",
    title: "[CHEM 241] Reference sheets",
    blurb: "The charts you look up mid-problem. Hover any row for the diagram.",
    from: "#0891b2",
    to: "#0e7490",
  },
  {
    id: "uploaded",
    // No course prefix. The other two are tied to a specific course; this one
    // holds whatever anyone uploads, which may well not be CHEM 242 at all.
    title: "Uploaded",
    blurb: "Decks added from a text file.",
    from: "#c2410c",
    to: "#ea580c",
  },
];

/**
 * A deck of questions: expandable answers, self-rating, four reading modes.
 * This is the original kind, so `kind` may be left off.
 */
export type StudyDeck = DeckCommon & {
  kind?: "study";
  questions: Question[];
};

/**
 * A deck of reference rows: a scannable table where hovering a row shows the
 * diagram from the class handout.
 *
 * Deliberately a separate kind rather than questions with an image glued on.
 * A pKa ladder is something you read down and compare across, not something you
 * answer one card at a time, and rating fifty individual pKa values would be
 * busywork. The hub treats both kinds the same; only the page differs.
 */
export type ReferenceDeck = DeckCommon & {
  kind: "reference";
  groups: DeckGroup[];
  /**
   * How this deck's diagrams are shown.
   *
   * Per deck rather than global because the pKa structures and a full IR
   * spectrum need opposite treatment: one is a small drawing with the answer
   * printed beside it, the other is a wide chart you need to see all of.
   */
  preview?: {
    width?: number;
    height?: number;
    /**
     * Trim this much off the right edge, e.g. "25%". The pKa sheet prints each
     * value to the right of its structure, so an uncropped preview hands you
     * the answer that quiz mode just blurred.
     */
    cropRight?: string;
    /**
     * Put a magnifying glass over the pinned diagram. Only the pinned copy: the
     * floating panel is pointer-events-none and rides the cursor, so the
     * pointer is never over it to drive a lens.
     */
    magnify?: { lensSize?: number; zoomFactor?: number };
  };
};

export type Deck = StudyDeck | ReferenceDeck;

export function isReference(deck: Deck): deck is ReferenceDeck {
  return deck.kind === "reference";
}

/** How many cards the hub should claim, whichever kind of deck it is. */
export function deckCount(deck: Deck): number {
  return isReference(deck)
    ? deck.groups.reduce((n, g) => n + g.items.length, 0)
    : deck.questions.length;
}

/** Where a deck lives. Defaults to `#/deck/<id>` unless it overrides `href`. */
export function deckHref(deck: Deck): string {
  return deck.href ?? `#/deck/${deck.id}`;
}
