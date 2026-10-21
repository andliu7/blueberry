// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}
/**
 * Sound effects and the sound setting (src/game/sound).
 *
 * The owner's rules (20 Oct 2026): sound is on by default, the student can
 * turn it off, and off means silent. A fake AudioContext counts the
 * oscillators that would have played, so "silent" is a number, not a hope.
 *
 * `?flags=` keeps the beta flags from seeding the journal with synthetic
 * events (see cardsReward.test.ts).
 */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readJournal, type EconomyEvent } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { createSound, soundOnFrom, type SoundContext } from "../sound/sound";

/** A stand-in AudioContext that counts oscillators started. */
function fakeContext(): SoundContext & { started: number; resumed: number } {
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
  const fake = {
    started: 0,
    resumed: 0,
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    state: "running" as AudioContextState,
    resume() {
      fake.resumed += 1;
      return Promise.resolve();
    },
    suspend() {
      return Promise.resolve();
    },
    createOscillator() {
      return {
        type: "sine",
        frequency: param(),
        connect() {},
        start() {
          fake.started += 1;
        },
        stop() {},
      } as unknown as OscillatorNode;
    },
    createGain() {
      return { gain: param(), connect() {} } as unknown as GainNode;
    },
  };
  return fake;
}

const AT = "2026-10-21T12:00:00.000Z";
const settings = (fields: Partial<{ sound: boolean; reminderHour: number }>): EconomyEvent =>
  ({ kind: "settings", at: AT, tz: "UTC", ...fields }) as EconomyEvent;

beforeEach(() => {
  localStorage.clear();
});

describe("the sound engine", () => {
  it("plays nothing before the first gesture creates the context", () => {
    const ctx = fakeContext();
    const sound = createSound({ makeContext: () => ctx });
    sound.sfx.correct();
    sound.sfx.gem();
    expect(ctx.started).toBe(0);
  });

  it("plays the correct chime and the gem once unlocked and on", () => {
    const ctx = fakeContext();
    const sound = createSound({ makeContext: () => ctx });
    sound.init();
    sound.sfx.correct();
    const afterCorrect = ctx.started;
    expect(afterCorrect).toBeGreaterThanOrEqual(2);
    sound.sfx.gem();
    expect(ctx.started).toBeGreaterThan(afterCorrect);
  });

  it("is on by default", () => {
    expect(createSound({ makeContext: () => fakeContext() }).on).toBe(true);
  });

  it("plays nothing at all when off, even after a gesture", () => {
    const ctx = fakeContext();
    const sound = createSound({ makeContext: () => ctx });
    sound.init();
    sound.setOn(false);
    sound.sfx.correct();
    sound.sfx.gem();
    sound.sfx.wrong();
    sound.tone(440, 0.1);
    expect(ctx.started).toBe(0);
  });

  it("does not even create a context while off", () => {
    let made = 0;
    const sound = createSound({
      makeContext: () => {
        made += 1;
        return fakeContext();
      },
    });
    sound.setOn(false);
    sound.init();
    expect(made).toBe(0);
  });

  it("survives a browser with no audio at all", () => {
    const sound = createSound({ makeContext: () => null });
    sound.init();
    expect(() => sound.sfx.correct()).not.toThrow();
  });
});

describe("the sound setting", () => {
  it("is on when the journal never mentions it", () => {
    expect(soundOnFrom([])).toBe(true);
    expect(soundOnFrom([settings({ reminderHour: 9 })])).toBe(true);
  });

  it("follows the latest settings event that names it", () => {
    expect(soundOnFrom([settings({ sound: false })])).toBe(false);
    expect(soundOnFrom([settings({ sound: false }), settings({ reminderHour: 9 })])).toBe(false);
    expect(soundOnFrom([settings({ sound: false }), settings({ sound: true })])).toBe(true);
  });

  it("survives the journal validator, and a non-boolean does not", () => {
    expect(readJournal([settings({ sound: false })])).toHaveLength(1);
    expect(readJournal([{ kind: "settings", at: AT, tz: "UTC", sound: "off" }])).toHaveLength(0);
  });

  it("persists through the progress store and a reload", () => {
    const first = createLocalProgress();
    first.setSettings({ sound: false });
    expect(soundOnFrom(first.getSnapshot().journal)).toBe(false);
    // A second store reads the same localStorage, which is a page reload.
    const reloaded = createLocalProgress();
    expect(soundOnFrom(reloaded.getSnapshot().journal)).toBe(false);
  });
});

describe("the app's sound, wired to the setting", () => {
  let contexts: ReturnType<typeof fakeContext>[] = [];

  beforeEach(() => {
    contexts = [];
    vi.resetModules();
    // `new AudioContext()` hands back a counting fake.
    vi.stubGlobal(
      "AudioContext",
      function FakeAudioContext() {
        const ctx = fakeContext();
        contexts.push(ctx);
        return ctx;
      } as unknown as typeof AudioContext,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const started = () => contexts.reduce((sum, ctx) => sum + ctx.started, 0);

  it("plays on a correct answer after a tap, by default", async () => {
    const { playCorrect } = await import("../sound/gameSound");
    document.dispatchEvent(new Event("pointerdown"));
    playCorrect();
    expect(started()).toBeGreaterThan(0);
  });

  it("plays nothing, correct, gem or wrong, once the student turns sound off", async () => {
    const { progress } = await import("../app/progress");
    const { playCorrect, playGem, playWrong } = await import("../sound/gameSound");
    document.dispatchEvent(new Event("pointerdown"));
    progress.setSettings({ sound: false });
    playCorrect();
    playGem();
    playWrong();
    expect(started()).toBe(0);
  });

  it("drops gem sounds closer together than GEM_GAP_MS, so a big chest does not pile up", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(AT));
      const { playGem, GEM_GAP_MS } = await import("../sound/gameSound");
      document.dispatchEvent(new Event("pointerdown"));
      playGem();
      const one = started();
      expect(one).toBeGreaterThan(0);
      // Five more in the same instant: none of them play.
      for (let i = 0; i < 5; i += 1) playGem();
      expect(started()).toBe(one);
      // After the gap, the next one plays.
      vi.setSystemTime(new Date(Date.parse(AT) + GEM_GAP_MS));
      playGem();
      expect(started()).toBe(one * 2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("a correct answer in the Cards tab", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;
  let contexts: ReturnType<typeof fakeContext>[] = [];

  beforeEach(() => {
    contexts = [];
    vi.resetModules();
    vi.stubGlobal(
      "AudioContext",
      function FakeAudioContext() {
        const ctx = fakeContext();
        contexts.push(ctx);
        return ctx;
      } as unknown as typeof AudioContext,
    );
  });

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
    vi.unstubAllGlobals();
  });

  const started = () => contexts.reduce((sum, ctx) => sum + ctx.started, 0);

  /**
   * Test mode seeds its shuffle from Date.now(), so a fixed clock gives the
   * same question and option order on every render. The first render learns
   * which option is right (the one that turns data-state="correct"); the next
   * two press a right and a wrong option on a fresh screen and count sounds.
   */
  it("Test mode chimes on a right pick and stays quiet on a wrong one", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(AT));
      const { TestMode } = await import("../tabs/cards/TestMode");
      const { questionCardFromDraft } = await import("../cards/ui/composer");
      const cards = ["one", "two", "three", "four"].map((word) =>
        questionCardFromDraft({ front: `Question ${word}?`, back: `Answer ${word}`, why: "" }, new Date(AT)),
      );
      host = document.createElement("div");
      document.body.append(host);
      const options = () => [...host!.querySelectorAll<HTMLButtonElement>(".ct-option")];
      const fresh = () => {
        act(() => root?.unmount());
        root = createRoot(host!);
        act(() => root!.render(createElement(TestMode, { cards, reducedMotion: true, onStarMissed: () => {} })));
      };

      fresh();
      expect(options().length).toBeGreaterThan(1);
      act(() => options()[0]!.click());
      const rightIndex = options().findIndex((button) => button.dataset.state === "correct");
      const wrongIndex = options().findIndex((button) => button.dataset.state !== "correct");
      expect(rightIndex).toBeGreaterThanOrEqual(0);
      expect(wrongIndex).toBeGreaterThanOrEqual(0);

      // Unlock audio, then count from zero.
      document.dispatchEvent(new Event("pointerdown"));
      const before = started();

      fresh();
      act(() => options()[wrongIndex]!.click());
      expect(started()).toBe(before);

      fresh();
      act(() => options()[rightIndex]!.click());
      expect(started()).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * The review run's "call the product" pick. Run seeds its option shuffle
   * with `${Date.now()}:0` on a card's first showing, so with a fixed clock
   * predictionChoices with the same seed says which button is the product.
   */
  it("a review run chimes on a right call and stays quiet on a wrong one", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(AT));
      const { Run } = await import("../cards/ui/Run");
      const { REACTIONS } = await import("../../data/reactions");
      const { reactionCardFromStaged } = await import("../cards/reactionCard");
      const { predictionChoices } = await import("../cards/ui/predict");
      const { createLocalDecks } = await import("../cards/store");
      const reaction = REACTIONS.find((entry) => entry.id === "lialh4-reduction")!;
      const card = reactionCardFromStaged(reaction, new Date(AT));
      const choices = predictionChoices(card, REACTIONS, undefined, undefined, `${Date.now()}:0`)!;
      const rightIndex = choices.findIndex((option) => option.correct);
      const wrongIndex = choices.findIndex((option) => !option.correct);
      expect(rightIndex).toBeGreaterThanOrEqual(0);
      expect(wrongIndex).toBeGreaterThanOrEqual(0);

      host = document.createElement("div");
      document.body.append(host);
      const options = () => [...host!.querySelectorAll<HTMLButtonElement>(".predict__option")];
      const fresh = () => {
        act(() => root?.unmount());
        root = createRoot(host!);
        const source = createLocalDecks({ now: () => new Date(AT) });
        act(() => root!.render(createElement(Run, { cards: [card], source, journal: [], onExit: () => undefined })));
      };

      document.dispatchEvent(new Event("pointerdown"));
      const before = started();

      fresh();
      expect(options()).toHaveLength(choices.length);
      act(() => options()[wrongIndex]!.click());
      expect(started()).toBe(before);

      fresh();
      act(() => options()[rightIndex]!.click());
      expect(started()).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the Sound switch", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it("reads on by default and writes off to the journal when pressed", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.resetModules();
    const { progress } = await import("../app/progress");
    const { SoundToggle } = await import("../sound/SoundToggle");
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(createElement(SoundToggle)));
    const button = host.querySelector<HTMLButtonElement>("[data-sound-toggle]")!;
    expect(button.getAttribute("role")).toBe("switch");
    expect(button.getAttribute("aria-checked")).toBe("true");
    act(() => button.click());
    expect(button.getAttribute("aria-checked")).toBe("false");
    expect(soundOnFrom(progress.getSnapshot().journal)).toBe(false);
  });
});
