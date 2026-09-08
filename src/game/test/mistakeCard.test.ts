/**
 * The mistake to card bridge, the save choreography, and what the toast puts on
 * screen.
 *
 * These are the parts of cards/Recommendation.tsx that can be wrong SILENTLY. A
 * toast that looks fine can still be handing the review queue a card whose
 * explanation nobody reviewed, or a card whose id changes every session so its
 * interval history belongs to nothing, or a NaN transform that drops the whole
 * animation without an error anywhere.
 *
 * THE CHOREOGRAPHY IS TESTED AS A FUNCTION, not through a browser. Three of the
 * four ways the save can be wrong are invisible on screen: firing twice, firing
 * at the press instead of at the landing, and being lost when the toast is torn
 * down mid flight. startSaveRun takes its timers as a parameter for exactly
 * that reason, so those three are ordinary assertions with fake timers.
 *
 * THE MARKUP IS TESTED THROUGH renderToStaticMarkup. apps/web has no jsdom and
 * no testing-library (see the integration notes), and react-dom/server runs in
 * node today, so the first render is assertable now rather than after a
 * dependency lands: what the student reads, which controls exist, and that the
 * toast names none of our own data structures at them. Click handling and the
 * :active press are the parts that still need a DOM; the press is held by the
 * stylesheet assertion at the foot of this file instead.
 *
 * The copy tests deliberately assert IDENTITY with the authored registries
 * rather than asserting the text reads well. CLAUDE.md forbids promoting
 * generated copy to authored copy, and the only mechanical way to hold that
 * line is to prove every student facing string came out of packages/feedback or
 * out of the authored distractor table character for character.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { allCauseIds } from "@blueberry/chem-core";
import { causeCopy } from "@blueberry/feedback";

import {
  DECK_BOUNCE_CLASS,
  DEFAULT_FLIGHT_SCALE,
  FALLBACK_DECK_RECT,
  FLIGHT_END_MS,
  RECO_CHROME,
  SAVE_END_MS,
  SAVE_PHASES,
  DeckIcon,
  Recommendation,
  arrowFromKey,
  authoredExplanationFor,
  beatCauseFor,
  draftCardFromMistake,
  flightTransform,
  journalDistractorFor,
  mistakeCardId,
  offerFromMistake,
  reactionFor,
  reviewLabel,
  startSaveRun,
  trainerBeatId,
  type SavePhase,
} from "../cards/Recommendation";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { matchDistractor, type TrainerDistractor } from "../tabs/trainer/distractors";
import { arrowKey } from "../tabs/trainer/grade";
import type { SavedMistake } from "../tabs/trainer/mistakes";

/* ------------------------------------------------------------------ */
/* Fixtures                                                             */
/* ------------------------------------------------------------------ */

/**
 * A real FAILURE cause from chem-core's registry, so the Tier 1 path exercises
 * the copy a mistake card would actually carry. Asserted to still exist rather
 * than assumed, because a retired cause would otherwise turn every test below
 * into a green test of the null path.
 */
const REAL_CAUSE = "valence_exceeded";

/**
 * An arrow key with NO authored distractor behind it, so the Tier 1 fixtures
 * stay Tier 1. It has to be chosen deliberately now: the bridge asks the
 * authored table about every journal entry, so any key that happens to be in
 * the table resolves to Tier 2 and a "this is the cause copy" test would be
 * asserting the wrong branch.
 */
const PLAIN_KEY = "2e bond:b-oh -> atom:o1";

/** An arrow key that IS in the authored table for the SN2 step. */
const DISTRACTOR_KEY = "2e lp:o1 -> atom:br1";

const AT = "2026-08-27T10:00:00.000Z";

function mistake(overrides: Partial<SavedMistake> = {}): SavedMistake {
  return {
    reactionId: "sn2",
    arrowKey: PLAIN_KEY,
    verdict: "invalid",
    causeId: REAL_CAUSE,
    distractorMatched: false,
    at: AT,
    ...overrides,
  };
}

const DISTRACTOR: TrainerDistractor = {
  what: "You sent the oxygen's lone pair at bromine.",
  why: "Both ends of that arrow are electron rich.",
  lookAt: "The carbon between them.",
};

/* ------------------------------------------------------------------ */
/* The journal replay                                                   */
/* ------------------------------------------------------------------ */

describe("an arrow key parsed back into an arrow", () => {
  it("round trips every arrow in the reaction registry", () => {
    // The whole replay rests on this: if the key is a lossless spelling of the
    // arrow then a mistake on disk can be asked about the authored table, and
    // if it is not then the not_requested half of the journal is dead copy.
    let checked = 0;
    for (const reaction of TRAINER_REACTIONS) {
      for (const arrow of reaction.step.arrows) {
        const key = arrowKey(arrow);
        const parsed = arrowFromKey(key);
        expect(parsed, key).not.toBeNull();
        if (parsed !== null) expect(arrowKey(parsed)).toBe(key);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(4);
  });

  it("round trips the three source kinds and both sink kinds", () => {
    for (const key of [
      "2e lp:o1 -> atom:br1",
      "2e bond:b-cbr -> atom:c1",
      "1e se:c1 -> between:c1+o2",
      "2e lp:o1 -> between:br1+o1",
    ]) {
      const parsed = arrowFromKey(key);
      expect(parsed, key).not.toBeNull();
      if (parsed !== null) expect(arrowKey(parsed)).toBe(key);
    }
  });

  it("keeps the electron count, so a radical key is not read as a pair", () => {
    expect(arrowFromKey("1e se:c1 -> atom:o2")?.electrons).toBe(1);
    expect(arrowFromKey("2e lp:o1 -> atom:c1")?.electrons).toBe(2);
  });

  it("returns null on a key from some other build rather than throwing", () => {
    for (const junk of ["", "nonsense", "3e lp:o1 -> atom:br1", "2e wat:o1 -> atom:br1", "2e lp:o1 -> between:o1"]) {
      expect(() => arrowFromKey(junk)).not.toThrow();
      expect(arrowFromKey(junk), junk).toBeNull();
    }
  });
});

describe("rebuilding a Tier 2 card from the journal alone", () => {
  it("finds the authored distractor from nothing but a stored key", () => {
    // The defect this fixes: the journal keeps distractorMatched as a bare
    // boolean, so before this a Tier 2 card was only reachable while the live
    // TrainerDistractor object was still in hand, one tick after the mistake.
    const found = journalDistractorFor(mistake({ arrowKey: DISTRACTOR_KEY, causeId: null }));
    expect(found).not.toBeNull();
  });

  it("finds the same object the trainer would have matched live", () => {
    const reaction = reactionFor("sn2");
    const arrow = arrowFromKey(DISTRACTOR_KEY);
    expect(reaction).not.toBeNull();
    expect(arrow).not.toBeNull();
    if (reaction === null || arrow === null) return;
    expect(journalDistractorFor(mistake({ arrowKey: DISTRACTOR_KEY }))).toBe(
      matchDistractor(reaction.step, arrow),
    );
  });

  it("carries that copy into a card for a not_requested entry, which stores causeId null", () => {
    // TrainerTab writes causeId: null for every not_requested attempt, so this
    // entry has no Tier 1 fallback at all. Before the replay it produced no
    // card; now it produces the specific one.
    const entry = mistake({ arrowKey: DISTRACTOR_KEY, verdict: "not_requested", causeId: null, distractorMatched: true });
    const card = draftCardFromMistake(entry);
    expect(card).not.toBeNull();
    if (card?.source.kind === "mistake") expect(card.source.cause).toBe("chose_authored_distractor");
  });

  it("ignores the stored distractorMatched flag and asks the table instead", () => {
    // The flag records what the app believed then; the authored table is what
    // is true now. A distractor authored since should light up an old mistake.
    const stale = mistake({ arrowKey: DISTRACTOR_KEY, causeId: null, distractorMatched: false });
    expect(authoredExplanationFor(stale, null)?.tier).toBe(2);
    const overclaimed = mistake({ arrowKey: PLAIN_KEY, causeId: null, distractorMatched: true });
    expect(authoredExplanationFor(overclaimed, null)).toBeNull();
  });

  it("offers nothing for a reaction whose step has no authored table", () => {
    expect(journalDistractorFor(mistake({ reactionId: "reaction-that-was-deleted" }))).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Which authored copy wins                                             */
/* ------------------------------------------------------------------ */

describe("the authored explanation a mistake resolves to", () => {
  it("is built on a cause chem-core still defines", () => {
    expect(allCauseIds()).toContain(REAL_CAUSE);
  });

  it("takes Tier 1 copy verbatim out of packages/feedback when no distractor matched", () => {
    const found = authoredExplanationFor(mistake(), null);
    const authored = causeCopy(REAL_CAUSE);
    expect(found).toEqual({
      what: authored.whatYouDid,
      why: authored.why,
      lookAt: authored.lookAt,
      tier: 1,
    });
  });

  it("prefers the Tier 2 distractor over the Tier 1 cause, because it is more specific", () => {
    // CLAUDE.md's Phase 3 refinement: within the two free tiers, specificity
    // wins over tier number. The distractor was authored for this exact arrow.
    const found = authoredExplanationFor(mistake(), DISTRACTOR);
    expect(found?.tier).toBe(2);
    expect(found?.lookAt).toBe(DISTRACTOR.lookAt);
    expect(found?.lookAt).not.toBe(causeCopy(REAL_CAUSE).lookAt);
  });

  it("prefers the live distractor over the one the journal would rebuild", () => {
    const found = authoredExplanationFor(mistake({ arrowKey: DISTRACTOR_KEY }), DISTRACTOR);
    expect(found?.lookAt).toBe(DISTRACTOR.lookAt);
  });

  it("returns nothing when no copy exists, rather than a fallback sentence", () => {
    expect(authoredExplanationFor(mistake({ causeId: null }), null)).toBeNull();
  });

  it("returns nothing for a cause id chem-core does not define, and does not throw", () => {
    // causeCopy throws by design on an unknown id, and the journal's causeId
    // came out of localStorage on a possibly older build. A missing card is
    // acceptable; an exception inside a toast is not.
    const stale = mistake({ causeId: "cause_retired_two_releases_ago" });
    expect(() => authoredExplanationFor(stale, null)).not.toThrow();
    expect(authoredExplanationFor(stale, null)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* The draft card                                                       */
/* ------------------------------------------------------------------ */

describe("a journal entry becoming a draft card", () => {
  it("carries the authored copy through unchanged: back is lookAt, why is why", () => {
    const card = draftCardFromMistake(mistake());
    const authored = causeCopy(REAL_CAUSE);
    expect(card?.back).toBe(authored.lookAt);
    expect(card?.why).toBe(authored.why);
  });

  it("asks the question the student actually faced on the front", () => {
    const reaction = reactionFor("sn2");
    const card = draftCardFromMistake(mistake());
    expect(reaction).not.toBeNull();
    expect(card?.front).toContain(reaction?.title ?? "");
    expect(card?.front).toContain(reaction?.brief ?? "");
  });

  it("records a mistake source carrying the named cause and the time it happened", () => {
    const card = draftCardFromMistake(mistake());
    expect(card?.source).toEqual({
      kind: "mistake",
      beatId: trainerBeatId("sn2"),
      cause: REAL_CAUSE,
      at: AT,
    });
  });

  it("names the Tier 2 hit as the shape cause it is, not as a chemistry cause", () => {
    const card = draftCardFromMistake(mistake({ causeId: null, distractorMatched: true }), {
      distractor: DISTRACTOR,
    });
    expect(card?.source.kind).toBe("mistake");
    if (card?.source.kind === "mistake") {
      expect(card.source.cause).toBe("chose_authored_distractor");
    }
  });

  it("uses the real beat id when a lesson playlist supplies one", () => {
    const card = draftCardFromMistake(mistake(), { beatId: "org2-u3-sn2-01" });
    if (card?.source.kind === "mistake") {
      expect(card.source.beatId).toBe("org2-u3-sn2-01");
    }
  });

  it("offers nothing for a reaction that is no longer in the registry", () => {
    expect(draftCardFromMistake(mistake({ reactionId: "reaction-that-was-deleted" }))).toBeNull();
  });

  it("offers nothing when nobody authored copy for what happened", () => {
    expect(draftCardFromMistake(mistake({ causeId: null }))).toBeNull();
  });

  it("writes no student facing string that is not authored somewhere else", () => {
    // The whole non-negotiable in one assertion: every sentence a student reads
    // off this card exists character for character in a reviewed registry.
    const authored = causeCopy(REAL_CAUSE);
    const card = draftCardFromMistake(mistake());
    const registryStrings = [authored.whatYouDid, authored.why, authored.lookAt];
    expect(registryStrings).toContain(card?.back);
    expect(registryStrings).toContain(card?.why);
  });
});

/* ------------------------------------------------------------------ */
/* Identity                                                             */
/* ------------------------------------------------------------------ */

describe("the card id", () => {
  it("is stable across sessions: the same wrong arrow is the same card", () => {
    // cards/types.ts: a card whose id changes has an interval history that now
    // belongs to nothing. Two attempts an hour apart must not become two cards.
    const first = mistakeCardId(mistake({ at: "2026-08-27T10:00:00.000Z" }));
    const second = mistakeCardId(mistake({ at: "2026-08-27T11:30:00.000Z" }));
    expect(first).toBe(second);
  });

  it("separates two different wrong arrows on the same reaction", () => {
    expect(mistakeCardId(mistake({ arrowKey: "2e bond:b-cbr -> atom:c1" }))).not.toBe(
      mistakeCardId(mistake()),
    );
  });

  it("separates the same shaped arrow on two different reactions", () => {
    expect(mistakeCardId(mistake({ reactionId: "proton-transfer" }))).not.toBe(
      mistakeCardId(mistake()),
    );
  });

  it("agrees with the id the offer carries", () => {
    const offer = offerFromMistake(mistake(), new Date(AT));
    expect(offer?.reco.cardId).toBe(offer?.card.id);
    expect(offer?.card.id).toBe(mistakeCardId(mistake()));
  });
});

/* ------------------------------------------------------------------ */
/* The offer                                                            */
/* ------------------------------------------------------------------ */

describe("the toast's own line", () => {
  it("is the authored what-you-did sentence, never a generic one", () => {
    // cards/types.ts asks for a reason authored per cause: "this one catches
    // people out on the ring position" reads as seen, "you got this wrong"
    // does not.
    const offer = offerFromMistake(mistake(), new Date(AT));
    expect(offer?.reco.reason).toBe(causeCopy(REAL_CAUSE).whatYouDid);
  });

  it("takes the distractor's sentence when one matched", () => {
    const offer = offerFromMistake(mistake({ causeId: null }), new Date(AT), {
      distractor: DISTRACTOR,
    });
    expect(offer?.reco.reason).toBe(DISTRACTOR.what);
  });

  it("stamps seenAt from the clock it was handed, so it stays pure", () => {
    const offer = offerFromMistake(mistake(), new Date("2026-01-02T03:04:05.000Z"));
    expect(offer?.reco.seenAt).toBe("2026-01-02T03:04:05.000Z");
  });

  it("offers nothing when the card would have been nothing", () => {
    expect(offerFromMistake(mistake({ causeId: null }), new Date(AT))).toBeNull();
  });
});

describe("beatCauseFor", () => {
  it("passes a Tier 1 chemistry cause straight through", () => {
    const explanation = authoredExplanationFor(mistake(), null);
    expect(explanation).not.toBeNull();
    if (explanation !== null) expect(beatCauseFor(mistake(), explanation)).toBe(REAL_CAUSE);
  });
});

/* ------------------------------------------------------------------ */
/* The flight                                                           */
/* ------------------------------------------------------------------ */

describe("the flight geometry", () => {
  const card = { left: 100, top: 500, width: 400, height: 160 };

  it("travels centre to centre", () => {
    const target = { left: 16, top: 16, width: 44, height: 44 };
    const { dx, dy } = flightTransform(card, target);
    expect(dx).toBe(16 + 22 - (100 + 200));
    expect(dy).toBe(16 + 22 - (500 + 80));
  });

  it("goes up and to the left, because the deck icon is in the top left", () => {
    const { dx, dy } = flightTransform(card, FALLBACK_DECK_RECT);
    expect(dx).toBeLessThan(0);
    expect(dy).toBeLessThan(0);
  });

  it("shrinks to the deck icon's own width when both are measurable", () => {
    const { scale } = flightTransform(card, { left: 16, top: 16, width: 40, height: 40 });
    expect(scale).toBeCloseTo(0.1, 10);
  });

  it("clamps a very large target so the flight still reads as a shrink", () => {
    const { scale } = flightTransform(card, { left: 0, top: 0, width: 4000, height: 4000 });
    expect(scale).toBeLessThanOrEqual(0.3);
  });

  it("clamps a very small target so the card does not vanish before it lands", () => {
    const { scale } = flightTransform(card, { left: 0, top: 0, width: 1, height: 1 });
    expect(scale).toBeGreaterThanOrEqual(0.08);
  });

  it("falls back to the owner's 0.16 rather than producing NaN on a zero width rect", () => {
    // A NaN inside a transform silently drops the entire animation: no error,
    // no console line, just a card that never moves. This is the guard.
    const hidden = { left: 0, top: 0, width: 0, height: 0 };
    expect(flightTransform(card, hidden).scale).toBe(DEFAULT_FLIGHT_SCALE);
    expect(Number.isNaN(flightTransform(hidden, hidden).dx)).toBe(false);
    expect(flightTransform(hidden, FALLBACK_DECK_RECT).scale).toBe(DEFAULT_FLIGHT_SCALE);
  });
});

/* ------------------------------------------------------------------ */
/* The phase table                                                      */
/* ------------------------------------------------------------------ */

describe("the save choreography", () => {
  it("acknowledges the press inside CLAUDE.md's 100ms interaction budget", () => {
    expect(SAVE_PHASES.press).toBeLessThan(100);
  });

  it("lands the card at 560ms and finishes at 720ms, the owner's numbers", () => {
    expect(FLIGHT_END_MS).toBe(560);
    expect(SAVE_END_MS).toBe(720);
  });

  it("spends exactly the 180 and 380 the spec names on the lift and the flight", () => {
    expect(SAVE_PHASES.lift).toBe(180);
    expect(SAVE_PHASES.fly).toBe(380);
    expect(SAVE_PHASES.bounce).toBe(160);
  });
});

/* ------------------------------------------------------------------ */
/* The save run, driven on fake timers                                  */
/* ------------------------------------------------------------------ */

interface Recorded {
  readonly phases: SavePhase[];
  readonly bounces: boolean[];
  commits: number;
}

function startRecorded(reducedMotion: boolean): { readonly log: Recorded; readonly run: ReturnType<typeof startSaveRun> } {
  const log: Recorded = { phases: [], bounces: [], commits: 0 };
  const run = startSaveRun({
    reducedMotion,
    onPhase: (phase) => log.phases.push(phase),
    commit: () => {
      log.commits += 1;
    },
    bounce: (on) => log.bounces.push(on),
  });
  return { log, run };
}

describe("the save run", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves nothing at the press: the card has not landed yet", () => {
    const { log } = startRecorded(false);
    expect(log.commits).toBe(0);
    vi.advanceTimersByTime(FLIGHT_END_MS - 1);
    expect(log.commits).toBe(0);
  });

  it("saves exactly once, on the landing frame", () => {
    const { log } = startRecorded(false);
    vi.advanceTimersByTime(FLIGHT_END_MS);
    expect(log.commits).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(log.commits).toBe(1);
  });

  it("walks the four phases in order", () => {
    const { log } = startRecorded(false);
    vi.advanceTimersByTime(SAVE_END_MS);
    expect(log.phases).toEqual(["lifting", "flying", "landing", "gone"]);
  });

  it("bounces the deck icon on the landing frame and lets go at the end", () => {
    const { log } = startRecorded(false);
    vi.advanceTimersByTime(FLIGHT_END_MS);
    expect(log.bounces).toEqual([true]);
    vi.advanceTimersByTime(SAVE_PHASES.bounce);
    expect(log.bounces).toEqual([true, false]);
  });

  it("still saves, exactly once, when the toast is torn down mid flight", () => {
    // The unmount path. Losing a save because the student navigated away is the
    // worst kind of quiet bug, so the animation is never what makes it real.
    const { log, run } = startRecorded(false);
    vi.advanceTimersByTime(300);
    expect(log.commits).toBe(0);
    run.abort();
    expect(log.commits).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(log.commits).toBe(1);
    expect(run.committed()).toBe(true);
  });

  it("does not save twice when the teardown comes after the landing", () => {
    const { log, run } = startRecorded(false);
    vi.advanceTimersByTime(FLIGHT_END_MS);
    run.abort();
    expect(log.commits).toBe(1);
  });

  it("takes the class off the deck icon when aborted mid bounce", () => {
    // The icon belongs to the shell. Leaving a class on someone else's element
    // is a squashed icon that never comes back.
    const { log, run } = startRecorded(false);
    vi.advanceTimersByTime(FLIGHT_END_MS);
    run.abort();
    expect(log.bounces).toEqual([true, false]);
  });

  it("cancels its timers on abort, so no phase arrives after the teardown", () => {
    const { log, run } = startRecorded(false);
    vi.advanceTimersByTime(300);
    run.abort();
    const seen = [...log.phases];
    vi.advanceTimersByTime(5000);
    expect(log.phases).toEqual(seen);
  });

  it("fades in place under reduced motion, with no flight and no bounce", () => {
    // Owner: "the card fades in place and the badge increments. No flight."
    const { log } = startRecorded(true);
    vi.advanceTimersByTime(SAVE_PHASES.fade);
    expect(log.phases).toEqual(["fading", "gone"]);
    expect(log.bounces).toEqual([]);
  });

  it("still increments the badge under reduced motion", () => {
    // Less travel is the request. Less information is not.
    const { log } = startRecorded(true);
    expect(log.commits).toBe(0);
    vi.advanceTimersByTime(SAVE_PHASES.fade);
    expect(log.commits).toBe(1);
  });

  it("saves on abort under reduced motion too", () => {
    const { log, run } = startRecorded(true);
    run.abort();
    expect(log.commits).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* What the toast renders                                               */
/* ------------------------------------------------------------------ */

const OFFER = offerFromMistake(mistake(), new Date(AT));

function render(props: Partial<Parameters<typeof Recommendation>[0]> = {}): string {
  return renderToStaticMarkup(
    createElement(Recommendation, {
      offer: OFFER,
      onSave: () => undefined,
      onDismiss: () => undefined,
      mistakeTotal: 12,
      ...props,
    }),
  );
}

describe("what the toast puts on screen", () => {
  it("has an offer to render at all", () => {
    expect(OFFER).not.toBeNull();
  });

  it("renders nothing when there is no offer", () => {
    expect(render({ offer: null })).toBe("");
  });

  it("leads with the authored what-you-did sentence", () => {
    expect(render()).toContain(causeCopy(REAL_CAUSE).whatYouDid);
  });

  it("shows the prompt the student faced", () => {
    expect(render()).toContain(reactionFor("sn2")?.title ?? "IMPOSSIBLE");
  });

  it("offers both the save and the way out", () => {
    const html = render();
    expect(html).toContain(RECO_CHROME.save);
    expect(html).toContain(RECO_CHROME.dismiss);
  });

  it("names none of our own data structures at the student", () => {
    // The reference mistake screen says "Review 30 recent mistakes!" and lists
    // the prompts. It never says "card front" or "recommendation".
    const html = render();
    for (const noun of ["Card recommendation", "Card front", "reco", "CardOffer", "distractor"]) {
      expect(html.includes(noun), noun).toBe(false);
    }
  });

  it("offers the batch drill with the student's own count in it", () => {
    expect(render({ onReview: () => undefined })).toContain("Review 12 recent mistakes");
  });

  it("says nothing about reviewing when there is nowhere to send them", () => {
    expect(render()).not.toContain("Review");
  });

  it("says nothing about reviewing when the pile is empty", () => {
    expect(render({ onReview: () => undefined, mistakeTotal: 0 })).not.toContain("Review");
  });

  it("announces itself politely rather than interrupting", () => {
    // Non blocking is the requirement: the student must be able to draw the
    // next arrow with the toast still up.
    expect(render()).toContain('aria-live="polite"');
  });

  it("starts in the offered phase, so the entrance animation has something to key on", () => {
    expect(render()).toContain('data-phase="offered"');
  });
});

describe("the deck icon the card flies to", () => {
  it("carries the badge hook the stylesheet animates", () => {
    const html = renderToStaticMarkup(createElement(DeckIcon, { count: 7 }));
    expect(html).toContain("data-deck-badge");
    expect(html).toContain(">7<");
  });

  it("carries the attribute the toast finds it by", () => {
    expect(renderToStaticMarkup(createElement(DeckIcon, { count: 0 }))).toContain("data-deck-icon");
  });

  it("floats in the top left by default, and steps aside when the shell places it", () => {
    expect(renderToStaticMarkup(createElement(DeckIcon, { count: 1 }))).toContain("deck-icon--floating");
    expect(renderToStaticMarkup(createElement(DeckIcon, { count: 1, floating: false }))).not.toContain(
      "deck-icon--floating",
    );
  });

  it("says how many cards are in it, in words, for a screen reader", () => {
    expect(renderToStaticMarkup(createElement(DeckIcon, { count: 1 }))).toContain("1 card");
    expect(renderToStaticMarkup(createElement(DeckIcon, { count: 4 }))).toContain("4 cards");
  });
});

/* ------------------------------------------------------------------ */
/* Voice                                                                */
/* ------------------------------------------------------------------ */

describe("the voice of the chrome this file authors", () => {
  // Only the interface copy is ours. The chemistry sentences belong to the
  // authored registries and are reviewed there, so they are not linted here.
  // Imported rather than retyped: a lint over a second copy of a label guards
  // a string nobody ships.
  const CHROME = [...Object.values(RECO_CHROME), reviewLabel(1), reviewLabel(30)];

  it("carries no scolding construction and asks no rhetorical question", () => {
    const banned = [/you should have/i, /\?/, /simply/i, /just /i, /obviously/i];
    for (const line of CHROME) {
      for (const pattern of banned) {
        expect(pattern.test(line), `${line} against ${String(pattern)}`).toBe(false);
      }
    }
  });

  it("gives the student a way out that is not framed as a loss", () => {
    expect(CHROME).toContain("Not now");
  });

  it("counts in the student's own words, singular and plural", () => {
    expect(reviewLabel(1)).toBe("Review 1 recent mistake");
    expect(reviewLabel(30)).toBe("Review 30 recent mistakes");
  });
});

/* ------------------------------------------------------------------ */
/* The stylesheet's half of the contract                                */
/* ------------------------------------------------------------------ */

/**
 * The press acknowledgement is a CSS :active rule, deliberately: a React state
 * set on pointerdown costs a render before it can paint, and CLAUDE.md asks for
 * the press to be FIRST rather than usually first. That makes it untestable
 * without a browser, so what is asserted here is that the rule exists and says
 * what the owner asked for. It would otherwise be the one part of the
 * choreography that could be deleted in a refactor with every test still green.
 */
const CSS = readFileSync(
  fileURLToPath(new URL("../cards/save-animation.css", import.meta.url)),
  "utf8",
);

/**
 * Every @keyframes BODY in a stylesheet, brace matched.
 *
 * Written the long way on purpose. The first version of this check did
 * `CSS.split("@keyframes").slice(1)`, which is not the keyframes: it is
 * everything in the file after the first one, ordinary rules included. It
 * failed on the deck icon's `min-width: 2.75rem`, which is the 44px minimum hit
 * target CLAUDE.md requires, so the check was rejecting correct code while
 * still being unable to say which block a property was actually in.
 */
function keyframeBlocks(css: string): string[] {
  const blocks: string[] = [];
  let at = css.indexOf("@keyframes");
  while (at !== -1) {
    const open = css.indexOf("{", at);
    if (open === -1) break;
    let depth = 0;
    let i = open;
    for (; i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(css.slice(open + 1, i));
    at = css.indexOf("@keyframes", i);
  }
  return blocks;
}

describe("the stylesheet", () => {
  it("acknowledges the press on pointer down, at the owner's 0.92", () => {
    expect(CSS).toContain(".mistake-toast__card:has(.mistake-toast__save:active)");
    expect(CSS).toContain("scale(0.92)");
  });

  it("animates transform and opacity only, never a layout property", () => {
    // Animating width, height, top or left drops the sequence off the
    // compositor and the 60fps row in the budgets table with it.
    const keyframeBodies = keyframeBlocks(CSS).join("\n");
    for (const layoutProperty of ["width:", "height:", "top:", "left:", "margin", "padding"]) {
      expect(keyframeBodies.includes(layoutProperty), layoutProperty).toBe(false);
    }
  });

  it("declares the catch and the badge pop the run drives", () => {
    expect(CSS).toContain(`.${DECK_BOUNCE_CLASS}`);
    expect(CSS).toContain("[data-deck-badge]");
  });

  it("draws the deck icon it flies to, rather than only naming it", () => {
    expect(CSS).toContain(".deck-icon--floating");
  });

  it("holds the 44px minimum hit target on every control it draws", () => {
    // 2.75rem is 44px. CLAUDE.md's floor, and a toast is exactly where a small
    // secondary control gets away with less.
    const controls = CSS.split(/\n(?=\.)/).filter((rule) =>
      /^\.(mistake-toast__save|mistake-toast__dismiss|mistake-toast__review|deck-icon)\s*\{/.test(rule),
    );
    expect(controls.length).toBe(4);
    for (const rule of controls) {
      expect(/min-(height|width): 2\.75rem/.test(rule), rule.split("\n")[0]).toBe(true);
    }
  });

  it("stops the travel under reduced motion but keeps the press", () => {
    const reduced = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced.length).toBeGreaterThan(0);
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain(".mistake-toast__save");
  });
});
