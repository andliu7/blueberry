/**
 * Lesson decks are generated, not authored.
 *
 * The claim is that a lesson deck costs nothing, because the beats already
 * carry a prompt, an authored answer and a reason. These tests hold the claim
 * to each beat kind in turn, and they pin the two kinds that deliberately
 * produce NO card. That second half matters more than the first: a silent
 * omission would show up as a deck that is shorter than its lesson and nobody
 * would know why.
 */

import { describe, expect, it } from "vitest";

import type { BeatSpec, LessonPlaylist } from "../beats/types";
import {
  CARDLESS_BEAT_KINDS,
  cardFromBeat,
  cardIdForBeat,
  deckFromPlaylist,
  deckIdForLesson,
  skippedBeatsNote,
} from "../cards/ui/cardsFromBeats";

const BASE = { node: "n1", conceptIds: ["enolates"], levels: [2] as const };

const MECHANISM: BeatSpec = {
  ...BASE,
  id: "b-mech",
  kind: "mechanism",
  levels: [1, 2, 3],
  prompt: "Push the arrows for the aldol addition",
  play: { kind: "reaction", id: "aldol" },
};

const MCQ: BeatSpec = {
  ...BASE,
  id: "b-mcq",
  kind: "mcq",
  levels: [1, 2],
  prompt: "Which proton comes off first?",
  options: [
    { id: "o1", text: "The alpha proton", why: "It sits between two carbonyls, so its conjugate base is delocalised over both." },
    { id: "o2", text: "The vinyl proton", why: "Nothing stabilises that anion." },
  ],
  correctOptionId: "o1",
};

const SORT: BeatSpec = {
  ...BASE,
  id: "b-sort",
  kind: "sort",
  levels: [2, 3],
  prompt: "Rank these by acidity",
  criterion: "acidity",
  direction: "descending",
  items: [
    { id: "i1", label: "carboxylic acid", why: "Two oxygens share the charge." },
    { id: "i2", label: "phenol", why: "The ring shares the charge." },
    { id: "i3", label: "ketone alpha C-H", why: "One carbonyl shares the charge." },
  ],
  order: ["i1", "i2", "i3"],
};

const MATCH: BeatSpec = {
  ...BASE,
  id: "b-match",
  kind: "match",
  levels: [1, 2],
  prompt: "Match the reagent to what it does",
  presentation: "columns",
  pairs: [
    { id: "p1", left: "PCC", right: "alcohol to aldehyde", why: "No water, so it stops at the aldehyde." },
    { id: "p2", left: "LiAlH4", right: "ester to alcohol" },
  ],
};

const SYNTHESIS: BeatSpec = {
  ...BASE,
  id: "b-synth",
  kind: "synthesis",
  levels: [2, 3],
  prompt: "Fill the gap",
  startMoleculeId: "m1",
  targetMoleculeId: "m2",
  slots: [
    { id: "s1", given: "Br2, FeBr3" },
    { id: "s2", accepts: ["Mg, then CO2", "Mg ether then CO2"], why: "The Grignard is the carbon nucleophile here." },
  ],
};

const TRACE: BeatSpec = {
  ...BASE,
  id: "b-trace",
  kind: "trace",
  levels: [0, 1],
  prompt: "Draw the enolate",
  brief: "The negative charge sits on the oxygen.",
  moleculeId: "m3",
  strokes: [
    { id: "s1", label: "the C to O bond", points: [{ x: 0, y: 0 }] },
    { id: "s2", label: "the lone pair", points: [{ x: 1, y: 1 }] },
  ],
};

describe("the two kinds that make no card", () => {
  it("names them, so a surface can explain the gap", () => {
    expect([...CARDLESS_BEAT_KINDS].sort()).toEqual(["mechanism", "resonance"]);
  });

  it("returns null for a mechanism rather than a card saying open the trainer", () => {
    expect(cardFromBeat(MECHANISM, "l1")).toBeNull();
  });
});

describe("a card from each kind that can carry one", () => {
  it("mcq: the answer is the correct option, and the why is its authored line", () => {
    const card = cardFromBeat(MCQ, "l1")!;
    expect(card.front).toBe("Which proton comes off first?");
    expect(card.back).toBe("The alpha proton");
    expect(card.why).toContain("delocalised over both");
  });

  it("sort: the answer is the authored order, read in the authored direction", () => {
    const card = cardFromBeat(SORT, "l1")!;
    expect(card.back).toBe("By acidity, highest first: carboxylic acid, phenol, ketone alpha C-H");
    expect(card.why).toContain("Two oxygens share the charge.");
  });

  it("match: the answer is the pairing, one pair per line", () => {
    const card = cardFromBeat(MATCH, "l1")!;
    expect(card.back).toBe("PCC goes with alcohol to aldehyde\nLiAlH4 goes with ester to alcohol");
  });

  it("synthesis: given steps and gaps both land, and alternatives are offered", () => {
    const card = cardFromBeat(SYNTHESIS, "l1")!;
    expect(card.back).toBe("1. Br2, FeBr3\n2. Mg, then CO2 or Mg ether then CO2");
  });

  it("trace: the answer is what there was to draw", () => {
    const card = cardFromBeat(TRACE, "l1")!;
    expect(card.back).toBe("the C to O bond\nthe lone pair");
    expect(card.why).toBe("The negative charge sits on the oxygen.");
  });

  it("every card carries its lesson and its beat, so a fix reaches both", () => {
    const card = cardFromBeat(MCQ, "l1")!;
    expect(card.source).toEqual({ kind: "lesson", lessonId: "l1", beatId: "b-mcq" });
    expect(card.tags).toContain("enolates");
    expect(card.tags).toContain("node:n1");
  });
});

describe("card ids are stable", () => {
  it("derives from the beat id, which is the invariant one level down", () => {
    expect(cardIdForBeat("b-mcq")).toBe("beat:b-mcq");
    const reworded: BeatSpec = { ...MCQ, prompt: "Which proton leaves first?" };
    expect(cardFromBeat(reworded, "l1")!.id).toBe(cardFromBeat(MCQ, "l1")!.id);
  });
});

describe("a whole lesson", () => {
  const playlist: LessonPlaylist = {
    lessonId: "l-enolates",
    node: "n1",
    title: "Enolates",
    beats: [MECHANISM, MCQ, SORT, MATCH, SYNTHESIS, TRACE],
  };

  it("builds a deck of exactly the cards that exist", () => {
    const generated = deckFromPlaylist(playlist);
    expect(generated.deck.id).toBe(deckIdForLesson("l-enolates"));
    expect(generated.deck.title).toBe("Enolates");
    expect(generated.deck.kind).toBe("lesson");
    expect(generated.cards).toHaveLength(5);
    expect(generated.deck.cardIds).toEqual(generated.cards.map((card) => card.id));
  });

  it("reports the beats it could not carry rather than hiding them", () => {
    const generated = deckFromPlaylist(playlist);
    expect(generated.skippedBeatIds).toEqual(["b-mech"]);
    expect(skippedBeatsNote(generated)).toBe(
      "1 arrow-pushing step comes back in the trainer instead, where you can draw it.",
    );
  });

  it("says nothing when there is nothing to say", () => {
    expect(skippedBeatsNote(deckFromPlaylist({ ...playlist, beats: [MCQ] }))).toBeNull();
  });
});
