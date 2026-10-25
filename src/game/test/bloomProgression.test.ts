/**
 * Bloom's progression beats (documentation/BLOOM-STATES-SPEC.md, section C):
 * the pure timings and rules in mascot/progression/progression.ts, plus the
 * static markup of the celebration components. The motion itself is judged by
 * eye; what a diff could break unseen is listed per block.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CATCH, EVOLVING, LESSON_COMPLETE, LEVEL_UP, STREAK_FLAME, UNIT_COMPLETE } from "../mascot/bloomMotion";
import { BloomCatch } from "../mascot/progression/BloomCatch";
import { BloomLessonComplete, BloomUnitComplete } from "../mascot/progression/BloomLessonComplete";
import { BloomXpFlyer } from "../mascot/progression/BloomXpFlyer";
import {
  LESSON_CATCH_START_MS,
  catchBeats,
  celebrationConfetti,
  countUpAt,
  evolvingBeats,
  flameScaleFor,
  lessonRevealAt,
  levelUpBeats,
} from "../mascot/progression/progression";
import { shouldPlayEvolving, stageChanged } from "../mascot/progression/levelChange";

const count = (html: string, cls: string) => html.split(`class="${cls}"`).length - 1;

describe("flameScaleFor", () => {
  it("is 1 at day one, and a restart is just day one", () => {
    expect(flameScaleFor(1)).toBe(1);
    expect(flameScaleFor(0)).toBe(1);
    expect(flameScaleFor(-3)).toBe(1);
    expect(flameScaleFor(Number.NaN)).toBe(1);
  });

  it("grows one step per doubling and never shrinks as the streak grows", () => {
    expect(flameScaleFor(2)).toBeCloseTo(1 + STREAK_FLAME.perDoubling, 6);
    let last = 0;
    for (let d = 1; d <= 400; d += 1) {
      const s = flameScaleFor(d);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it("is capped at 1.6 so the flame stays on the card", () => {
    expect(flameScaleFor(32)).toBeCloseTo(1.6, 6);
    expect(flameScaleFor(365)).toBe(STREAK_FLAME.max);
    expect(flameScaleFor(100000)).toBe(1.6);
  });
});

describe("stageChanged", () => {
  it("fires only when the stage goes up between two readings", () => {
    expect(stageChanged(3, 4)).toBe(true);
    expect(stageChanged(3, 6)).toBe(true);
    expect(stageChanged(4, 4)).toBe(false);
    expect(stageChanged(5, 4)).toBe(false);
  });

  it("never fires on the first reading, so opening the app replays nothing", () => {
    expect(stageChanged(null, 4)).toBe(false);
    expect(stageChanged(4, null)).toBe(false);
  });
});

describe("shouldPlayEvolving", () => {
  it("plays once per stage: a new stage plays, a stage already played does not", () => {
    expect(shouldPlayEvolving(2, 0)).toBe(true);
    expect(shouldPlayEvolving(5, 4)).toBe(true);
    expect(shouldPlayEvolving(4, 4)).toBe(false);
    expect(shouldPlayEvolving(3, 4)).toBe(false);
  });

  it("walking stages up one at a time plays it exactly once each", () => {
    let played = 0;
    let plays = 0;
    for (const stage of [2, 2, 3, 3, 3, 4, 2, 5]) {
      if (shouldPlayEvolving(stage, played)) {
        plays += 1;
        played = stage;
      }
    }
    expect(plays).toBe(4);
    expect(played).toBe(5);
  });
});

describe("the egg and level-up beats", () => {
  it("runs dark, silhouette, flash, reveal in order and ends under 2.4s", () => {
    const b = evolvingBeats();
    expect(b.silhouetteAt).toBe(EVOLVING.darkMs);
    expect(b.flashAt).toBe(EVOLVING.darkMs + EVOLVING.silhouetteMs);
    expect(b.revealAt).toBe(b.flashAt + EVOLVING.flashMs);
    expect(b.doneAt).toBeGreaterThan(b.revealAt);
    expect(b.doneAt).toBeLessThan(EVOLVING.maxTotalMs);
  });

  it("rolls the badge while the grow is up, and ends when the ring has faded", () => {
    const b = levelUpBeats();
    expect(b.growAt).toBe(LEVEL_UP.dipMs);
    expect(b.badgeAt).toBeGreaterThan(b.growAt);
    expect(b.badgeAt + LEVEL_UP.badgeRollMs).toBeLessThanOrEqual(b.growAt + LEVEL_UP.growMs);
    expect(b.doneAt).toBeGreaterThanOrEqual(LEVEL_UP.ringMs);
  });
});

describe("catchBeats", () => {
  it("hangs, falls, rests and flies in the CATCH timings, from any start", () => {
    expect(catchBeats(0)).toEqual({
      fallAt: CATCH.hangMs,
      landAt: CATCH.hangMs + CATCH.fallMs,
      flyAt: CATCH.hangMs + CATCH.fallMs + CATCH.restMs,
      arriveAt: CATCH.hangMs + CATCH.fallMs + CATCH.restMs + CATCH.flyMs,
    });
    expect(catchBeats(1000).fallAt).toBe(1000 + CATCH.hangMs);
  });

  it("starts on the lesson screen only once CONTINUE is live, so it never holds the screen", () => {
    expect(LESSON_CATCH_START_MS).toBe(LESSON_COMPLETE.continueLiveByMs);
  });
});

describe("lessonRevealAt", () => {
  it("puts the headline at 600 and the stats from 800, 120 apart", () => {
    expect(lessonRevealAt(0)).toBe(LESSON_COMPLETE.headlineAtMs);
    expect(lessonRevealAt(1)).toBe(LESSON_COMPLETE.statsFromMs);
    expect(lessonRevealAt(2)).toBe(LESSON_COMPLETE.statsFromMs + LESSON_COMPLETE.statsStaggerMs);
  });

  it("never reveals a line after CONTINUE is live", () => {
    for (let i = 0; i < 40; i += 1) expect(lessonRevealAt(i)).toBeLessThanOrEqual(LESSON_COMPLETE.continueLiveByMs);
  });
});

describe("countUpAt", () => {
  it("starts at 0, ends exactly on the value, and never passes it", () => {
    expect(countUpAt(5, 0, 600)).toBe(0);
    expect(countUpAt(5, 600, 600)).toBe(5);
    expect(countUpAt(5, 9999, 600)).toBe(5);
    let last = 0;
    for (let t = 0; t <= 600; t += 16) {
      const n = countUpAt(37, t, 600);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(last);
      expect(n).toBeLessThanOrEqual(37);
      last = n;
    }
  });

  it("jumps straight to the value when there is no time to count (reduced motion)", () => {
    expect(countUpAt(12, 0, 0)).toBe(12);
    expect(countUpAt(0, 300, 600)).toBe(0);
  });
});

describe("celebrationConfetti", () => {
  it("is deterministic and the size asked for", () => {
    expect(celebrationConfetti(UNIT_COMPLETE.confettiPieces)).toEqual(celebrationConfetti(UNIT_COMPLETE.confettiPieces));
    expect(celebrationConfetti(UNIT_COMPLETE.confettiPieces)).toHaveLength(40);
    expect(celebrationConfetti(0)).toHaveLength(0);
  });

  it("stays inside the layer and inside its delay spread", () => {
    for (const piece of celebrationConfetti(40, 600)) {
      expect(Math.abs(piece.x)).toBeLessThanOrEqual(0.5);
      expect(piece.peakY).toBeLessThan(0);
      expect(piece.fallY).toBeGreaterThan(0);
      expect(piece.delayMs).toBeGreaterThanOrEqual(0);
      expect(piece.delayMs).toBeLessThanOrEqual(600);
    }
  });
});

describe("the celebration components, as markup", () => {
  it("lesson complete draws exactly one berry, confetti, the XP chip and the catch", () => {
    const html = renderToStaticMarkup(
      createElement(BloomLessonComplete, { reducedMotion: false, xp: 20, diamonds: 5 }, [
        createElement("h2", { key: "h" }, "Lesson complete"),
        createElement("p", { key: "p" }, "3 of 3 right."),
      ]),
    );
    expect(html.split('aria-label="Bloom, looking').length - 1).toBe(1);
    expect(count(html, "bloom-pro-flake")).toBe(24);
    expect(html).toContain("+20 XP");
    expect(html).toContain("bloom-catch-gem");
    expect(count(html, "bloom-lc-line")).toBe(2);
  });

  it("lesson complete under reduced motion is the still frame: no confetti, no flight, final counts", () => {
    const html = renderToStaticMarkup(createElement(BloomLessonComplete, { reducedMotion: true, xp: 20, diamonds: 5 }));
    expect(html).toContain('data-reduced="true"');
    expect(html).not.toContain("bloom-pro-flake");
    expect(html).not.toContain("bloom-catch-gem");
    expect(html).toContain("+20 XP");
    expect(html).toMatch(/\+(<!-- -->)?5</);
  });

  it("draws no chip and no catch when nothing was earned or the payout has not landed", () => {
    const html = renderToStaticMarkup(createElement(BloomLessonComplete, { reducedMotion: false, xp: 0, diamonds: null }));
    expect(html).not.toContain("bloom-xp");
    expect(html).not.toContain("bloom-catch");
    expect(renderToStaticMarkup(createElement(BloomXpFlyer, { amount: 0, reducedMotion: false }))).toBe("");
    expect(renderToStaticMarkup(createElement(BloomCatch, { amount: 0, reducedMotion: false }))).toBe("");
  });

  it("unit complete is one berry in front of a trophy with a 40-piece shower", () => {
    const html = renderToStaticMarkup(createElement(BloomUnitComplete, { reducedMotion: false, costume: "referee" }));
    expect(html.split('aria-label="Bloom, looking').length - 1).toBe(1);
    expect(html).toContain("bloom-trophy-art");
    expect(count(html, "bloom-pro-flake")).toBe(40);
    expect(html).toContain("Bloom, looking proud");
  });

  it("unit complete under reduced motion keeps the trophy and drops the confetti", () => {
    const html = renderToStaticMarkup(createElement(BloomUnitComplete, { reducedMotion: true }));
    expect(html).toContain("bloom-trophy-art");
    expect(html).not.toContain("bloom-pro-flake");
  });
});
