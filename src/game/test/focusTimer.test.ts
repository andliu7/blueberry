// @vitest-environment jsdom
/**
 * The focus timer remade on 3 Nov to match the second-brain one (components/FocusTimer.tsx,
 * lib/useFocusTimer.ts, lib/ambience.ts, lib/sounds.ts). Cases ported from second-brain's
 * web/tests/focus-timer.test.tsx, rewritten for this suite (createElement, no Testing Library),
 * plus the one thing this repo needs that the second brain did not: one clock shared by the
 * site's header button and the game's views.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusCard, FocusTimer } from "@/components/FocusTimer";
import { FOCUS_KEY, formatClock, resetFocusStoreForTests } from "@/lib/useFocusTimer";
import { AMBIENCE_KEY, resetAmbienceForTests } from "@/lib/ambience";
import { COIN_SECONDS, playCoin, resetSoundsForTests } from "@/lib/sounds";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../components/focus-timer.css"), "utf8");

/* ------------------------------------------------------------- harness -- */

const mounted: { root: Root; host: HTMLElement }[] = [];
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push({ root, host });
  return { host, unmount: () => act(() => root.unmount()) };
}
const all = (root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>("button, summary")];
const byName = (name: string | RegExp, root: ParentNode = document) =>
  all(root).find((b) => {
    const label = b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "";
    return typeof name === "string" ? label === name : name.test(label);
  });
const click = (el: Element | undefined | null) => {
  expect(el, "element to click").toBeTruthy();
  act(() => {
    el!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};
const field = (label: string) => [...document.querySelectorAll("label")].find((l) => l.textContent?.trim().startsWith(label))!.querySelector("input, select") as HTMLInputElement | HTMLSelectElement;
function setValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}
const region = () => document.querySelector<HTMLElement>("[aria-label='Focus timer']")!;
const bigClock = () => document.querySelector(".ft-clock strong")?.textContent;
const forward = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  // Only Date and the interval are faked; setTimeout stays real for React.
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  localStorage.clear();
  resetFocusStoreForTests();
  resetAmbienceForTests();
  resetSoundsForTests();
});
afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop()!;
    act(() => root.unmount());
    host.remove();
  }
  resetFocusStoreForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* ---------------------------------------------------------------- clock -- */

describe("the focus timer button", () => {
  it("starts as a quiet button, opens to a card, and Escape closes it back to the button", () => {
    mount(createElement(FocusTimer));
    expect(region()).toHaveProperty("className", expect.stringContaining("is-idle"));
    click(byName("Focus"));
    expect(byName("Start focus")).toBeTruthy();
    expect(bigClock()).toBe("25:00");
    act(() => {
      region().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(byName("Start focus")).toBeUndefined();
    expect(document.activeElement).toBe(byName("Focus"));
  });

  it("counts down, starts the eye rest on its own at twenty minutes, resumes, and survives a reload", () => {
    const first = mount(createElement(FocusTimer));
    click(byName("Focus"));
    click(byName("Start focus"));
    forward(5 * 60_000);
    expect(bigClock()).toBe("20:00");
    expect(document.body.textContent).toContain("Next eye rest in 15:00");
    forward(15 * 60_000 + 250);
    expect(region().className).toContain("phase-eyeRest");
    expect(bigClock()).toBe("00:20");
    forward(20_000 + 250);
    expect(region().className).toContain("phase-focus");
    expect(bigClock()).toBe("05:00");
    click(byName("Settings"));
    expect(document.body.textContent).toContain("Rests taken this session: 1");
    // A reload: the clock comes back from the stored start stamp, the card closed until asked.
    first.unmount();
    resetFocusStoreForTests();
    mount(createElement(FocusTimer));
    forward(250);
    expect(region().className).toContain("is-running");
    click(byName(/Focusing, 05:00 left/));
    expect(bigClock()).toBe("05:00");
    forward(5 * 60_000 + 250);
    expect(region().className).toContain("phase-break");
    forward(5 * 60_000 + 250);
    expect(region().className).toContain("phase-idle");
    expect(JSON.parse(localStorage.getItem(FOCUS_KEY) || "{}").phase).toBe("idle");
  });

  it("pause banks the minutes and Start continues them; settings change the block length", () => {
    mount(createElement(FocusTimer));
    click(byName("Focus"));
    click(byName("Start focus"));
    forward(3 * 60_000 + 250);
    click(byName("Pause"));
    expect(document.body.textContent).toContain("3 min banked. Start continues it.");
    expect(bigClock()).toBe("22:00");
    click(byName("Start focus"));
    forward(250);
    expect(bigClock()).toBe("22:00");
    click(byName("Reset the timer"));
    expect(bigClock()).toBe("25:00");
    click(byName("Settings"));
    setValue(field("Focus, minutes"), "50");
    expect(bigClock()).toBe("50:00");
    expect(formatClock(61_000)).toBe("01:01");
  });

  it("shows a minutes badge while running, and the card is anchored below the button", () => {
    mount(createElement(FocusTimer));
    expect(document.querySelector(".ft-badge")).toBeNull();
    click(byName("Focus"));
    click(byName("Start focus"));
    forward(250);
    expect(document.querySelector(".ft-badge")?.textContent).toBe("25m");
    forward(90_000);
    expect(document.querySelector(".ft-badge")?.textContent).toBe("24m");
    expect(css).toMatch(/\.ft-card \{\s*position: absolute;\s*right: 0;\s*top: calc\(100% \+ 8px\)/);
    expect(css).not.toMatch(/gradient\(/);
  });

  it("opening Settings widens the card and closing it restores the compact size; the widening respects reduced motion", () => {
    mount(createElement(FocusTimer));
    click(byName("Focus"));
    const card = document.querySelector(".ft-card")!;
    expect(card.className).not.toContain("is-wide");
    click(byName("Settings"));
    expect(card.className).toContain("is-wide");
    click(byName("Settings"));
    expect(card.className).not.toContain("is-wide");
    expect(css).toMatch(/\.ft-card\.is-wide \{ width: min\(420px, calc\(100vw - 32px\)\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*html:not\(\[data-motion="reduced"\]\) \.ft-card \{ transition: width/);
  });

  it("is one clock: the site button and the game's full card read and drive the same session", () => {
    mount(createElement(FocusTimer, { placement: "site" }));
    const page = mount(createElement(FocusCard, { look: "game" }));
    click(byName("Start focus", page.host));
    forward(60_250);
    expect(page.host.querySelector(".ft-clock strong")?.textContent).toBe("24:00");
    expect(document.querySelector(".ft-badge")?.textContent).toBe("24m");
    // The game look uses the game's 3D key, the site look its own lipped key.
    expect(byName("Pause", page.host)?.className).toContain("btn3d");
  });

  it("the game's corner button stays hidden until a session runs", () => {
    const { host } = mount(createElement(FocusTimer, { placement: "game" }));
    expect(host.querySelector(".ft-toggle")).toBeNull();
    const page = mount(createElement(FocusCard));
    click(byName("Start focus", page.host));
    expect(host.querySelector(".ft-toggle")).not.toBeNull();
    // A phase change opens the corner card on its own.
    expect(host.querySelector(".ft-card")).not.toBeNull();
  });
});

/* -------------------------------------------------------- sound, pop-out -- */

// jsdom has no Web Audio, so a fake AudioContext records the graph.
type Call = [string, number, number?];
class FakeParam {
  value = 0;
  calls: Call[] = [];
  private rec(kind: string, v: number, t?: number) {
    this.calls.push([kind, v, t]);
    this.value = v;
    return this;
  }
  setValueAtTime(v: number, t: number) { return this.rec("set", v, t); }
  linearRampToValueAtTime(v: number, t: number) { return this.rec("linear", v, t); }
  exponentialRampToValueAtTime(v: number, t: number) { return this.rec("exp", v, t); }
  cancelScheduledValues() { return this; }
}
class FakeNode {
  outputs: unknown[] = [];
  connect<T>(to: T) { this.outputs.push(to); return to; }
  disconnect() {}
}
class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  playbackRate = new FakeParam();
  starts: number[] = [];
  stops: number[] = [];
  start(t = 0) { this.starts.push(t); }
  stop(t = 0) { this.stops.push(t); }
}
class FakeOsc extends FakeSource { type = "sine"; frequency = new FakeParam(); }
class FakeGain extends FakeNode { gain = new FakeParam(); }
const made = { contexts: [] as FakeAudioContext[], sources: [] as FakeSource[], oscillators: [] as FakeOsc[], gains: [] as FakeGain[] };
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 3000;
  state = "running";
  destination = new FakeNode();
  constructor() { made.contexts.push(this); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createBuffer(_c: number, length: number) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  createBufferSource() { const s = new FakeSource(); made.sources.push(s); return s; }
  createOscillator() { const o = new FakeOsc(); made.oscillators.push(o); return o; }
  createGain() { const g = new FakeGain(); made.gains.push(g); return g; }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: "", frequency: new FakeParam(), Q: new FakeParam() }); }
  createStereoPanner() { return Object.assign(new FakeNode(), { pan: new FakeParam() }); }
}
const master = () => made.gains.find((g) => g.outputs.some((o) => made.contexts.some((c) => c.destination === o)))!;
const beds = () => made.sources.filter((s) => s.loop);
const tones = () => made.oscillators.filter((o) => o.frequency.value > 800);

describe("ambient sound, the end-of-focus sound, and the pop-out", () => {
  beforeEach(() => {
    made.contexts.length = 0;
    made.sources.length = 0;
    made.oscillators.length = 0;
    made.gains.length = 0;
    localStorage.removeItem(AMBIENCE_KEY);
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });
  const openWith = (sound: string) => {
    mount(createElement(FocusTimer));
    click(byName("Focus"));
    click(byName("Settings"));
    setValue(field("Sound"), sound);
  };

  it("Play builds the chosen bed and fades it in; Pause stops every source; with no sound chosen, Play opens Settings", () => {
    mount(createElement(FocusTimer));
    click(byName("Focus"));
    click(byName("Play sound"));
    expect(document.querySelector(".ft-card")?.className).toContain("is-wide");
    expect(made.contexts).toHaveLength(0);
    setValue(field("Sound"), "brown");
    expect(made.contexts).toHaveLength(0); // no context before the click that asks for sound
    click(byName("Play sound"));
    expect(made.contexts).toHaveLength(1);
    expect(beds()).toHaveLength(2); // the two coprime-length buffers
    const gain = master();
    expect(gain.gain.calls.at(-1)).toEqual(["exp", 0.5, 0.9]);
    click(byName("Pause sound"));
    expect(beds().every((s) => s.stops.length === 1)).toBe(true);
    expect(gain.gain.value).toBeCloseTo(0.0001);
    expect(tones()).toHaveLength(0); // stopping by hand is not the end of a block
    // Fire: a flickering brown bed with crackles, the flicker's two sub-hertz oscillators on top.
    setValue(field("Sound"), "fire");
    click(byName("Play sound"));
    expect(made.sources.filter((s) => !s.loop).length).toBeGreaterThan(0);
    expect(made.oscillators.filter((o) => o.frequency.value > 0.2 && o.frequency.value < 1)).toHaveLength(2);
  });

  it("the block running out stops the sound at once and rings the chime; pausing a block does too, with coins if chosen", () => {
    openWith("white");
    setValue(field("Focus, minutes"), "1");
    click(byName("Play sound"));
    click(byName("Start focus"));
    forward(30_000);
    expect(beds().every((s) => s.stops.length === 0)).toBe(true);
    forward(30_000 + 250);
    expect(region().className).toContain("phase-break");
    expect(beds().every((s) => s.stops.length === 1 && s.stops[0] <= 0.3)).toBe(true);
    expect(byName("Play sound")).toBeTruthy();
    expect(tones().map((o) => o.frequency.value).sort((a, b) => a - b)).toEqual([880, 1318.5]);
    expect(tones().every((o) => o.starts[0] > 0)).toBe(true); // after the fade, not over it
    setValue(field("When focus ends"), "coins");
    click(byName("Pause"));
    click(byName("Play sound"));
    click(byName("Start focus"));
    const before = tones().length;
    click(byName("Pause"));
    expect(beds().every((s) => s.stops.length === 1)).toBe(true);
    expect(tones().length - before).toBeGreaterThanOrEqual(5);
  });

  it("a block that runs out with no bed playing still rings the end sound; None is silent", () => {
    openWith("off");
    setValue(field("Focus, minutes"), "1");
    click(byName("Start focus")); // the click that unlocks audio
    forward(60_250);
    expect(tones().map((o) => o.frequency.value).sort((a, b) => a - b)).toEqual([880, 1318.5]);
    click(byName("Reset the timer"));
    setValue(field("When focus ends"), "none");
    const count = tones().length;
    click(byName("Start focus"));
    forward(60_250);
    expect(tones().length).toBe(count);
  });

  it("playCoin schedules a ching and three to five clinks, all silent within 0.8 s", () => {
    const ctx = new FakeAudioContext();
    playCoin(ctx as unknown as AudioContext, 0.5, 0);
    const oscs = [...made.oscillators];
    expect(oscs.length).toBeGreaterThanOrEqual(5);
    expect(oscs.length).toBeLessThanOrEqual(7);
    expect(oscs[0].frequency.value).toBeCloseTo(1975.5);
    expect(oscs[1].frequency.value / oscs[0].frequency.value).toBeCloseTo(1.006, 3);
    expect(COIN_SECONDS).toBeLessThan(0.8);
    expect(oscs.every((o) => o.starts[0] >= 0 && o.stops[0] <= COIN_SECONDS)).toBe(true);
  });

  it("Pop out shows only with Document Picture-in-Picture, and renders the live timer into the new window", async () => {
    const first = mount(createElement(FocusTimer));
    click(byName("Focus"));
    expect(byName("Pop out")).toBeUndefined();
    first.unmount();
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const win = frame.contentWindow as Window;
    const doc = win.document;
    const requestWindow = vi.fn(async () => win);
    vi.stubGlobal("documentPictureInPicture", { requestWindow });
    mount(createElement(FocusTimer));
    click(byName("Focus"));
    await act(async () => {
      byName("Pop out")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(requestWindow).toHaveBeenCalledWith({ width: 320, height: 240 });
    expect(doc.body.querySelector(".ft-pip")).not.toBeNull();
    expect(doc.body.querySelector(".ft-clock strong")?.textContent).toBe("25:00");
    expect(document.body.textContent).toContain("The timer is in its own window.");
    click(byName("Start focus", doc.body));
    forward(60_250);
    expect(doc.body.querySelector(".ft-clock strong")?.textContent).toBe("24:00");
    expect(document.querySelector(".ft-badge")?.textContent).toBe("24m");
    act(() => {
      win.dispatchEvent(new Event("pagehide"));
    });
    expect(doc.body.querySelector(".ft-pip")).toBeNull();
    expect(bigClock()).toBe("24:00");
    frame.remove();
  });
});
