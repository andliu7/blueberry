// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?targets=1&store=1"}

/**
 * The answer sheet. The first half holds every sentence the sheet can say to
 * the voice lint and to one line on a phone; the second mounts the REAL
 * screen, commits arrows through the exposed store the way the other wiring
 * tests do, and reads the sheet back: it rises on Check with one line, opens
 * one layer per tap, reaches the student with an instructor's distractor
 * copy, and offers a Why? on a win without forcing it.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ArrowLegalityRuleId, CauseId, ElectronFlowArrow } from "@blueberry/chem-core";
import { voiceViolations } from "@blueberry/curriculum";
import type { InteractionStore, Point2 } from "@blueberry/interaction";
import { TRAINER_SEQUENCES } from "../demo/sequences";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { RESONANCE_HUNT } from "../demo/resonance";
import { questionFromReaction, questionFromSequence, type TrainerQuestion } from "../tabs/trainer/engine/question";
import { TrainerScreen } from "../tabs/trainer/engine/TrainerScreen";
import { HEADLINE_MAX, RULE_COPY, branchSheet, describeStrays, missSheet, winSheet, type SheetContent } from "../tabs/trainer/engine/sheetCopy";
import { authoredDistractors } from "../tabs/trainer/distractors";
import type { DrawVerdict } from "../tabs/trainer/grade";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------------------------------------------------ */
/* The words                                                            */
/* ------------------------------------------------------------------ */

/** The cause chem-core pairs with each rule, where the sheet falls back to the shared registry copy. */
const CAUSE_OF: Readonly<Partial<Record<ArrowLegalityRuleId, CauseId>>> = {
  endpoints_share_no_atom: "arrow_endpoints_not_adjacent",
  source_has_no_lone_pair: "arrow_source_has_no_electrons",
  arrow_declares_no_change: "arrow_declares_no_change",
};

function invalid(rule: ArrowLegalityRuleId): Extract<DrawVerdict, { kind: "invalid" }> {
  const cause = CAUSE_OF[rule] ?? "arrow_source_has_no_electrons";
  return { kind: "invalid", cause, finding: { arrowId: "a1" as never, rule, cause, expected: "", actual: "" } };
}

/** Every sheet's words through the lesson copy's voice lint: headline, then each layer. */
function lint(sheet: SheetContent): readonly string[] {
  const texts = [sheet.headline, ...sheet.layers.map((layer) => layer.text)];
  return texts.flatMap((text) => voiceViolations({ whatHappened: text, why: text, lookAt: text }).map((v) => `${v.rule}: ${v.text}`));
}

const sn1 = TRAINER_SEQUENCES.find((entry) => entry.id === "seq-sn1");
if (sn1 === undefined) throw new Error("seq-sn1 missing from the registry");
const sn1Question = questionFromSequence(sn1);
const forkStep = sn1Question.steps.findIndex((step) => step.fork !== undefined);
const sn1Fork = sn1Question.steps[forkStep]?.fork;
if (sn1Fork === undefined) throw new Error("seq-sn1 carries no fork");

describe("every sentence the sheet can say", () => {
  const rules = Object.keys(RULE_COPY) as ArrowLegalityRuleId[];

  it("covers every legality rule with a one-line headline and two layers that pass the voice lint", () => {
    expect(rules.length).toBe(12);
    for (const rule of rules) {
      const sheet = missSheet(invalid(rule), null);
      expect(sheet.headline.length, rule).toBeLessThanOrEqual(HEADLINE_MAX);
      expect(sheet.layers.map((layer) => layer.label)).toEqual(["The rule", "Where to look"]);
      expect(lint(sheet), rule).toEqual([]);
    }
  });

  it("gives every authored distractor a one-line headline, and its copy passes the voice lint", () => {
    const all = authoredDistractors();
    expect(all.length).toBe(15);
    for (const distractor of all) {
      const sheet = missSheet(invalid("endpoints_share_no_atom"), distractor);
      expect(sheet.headline).toBe(distractor.headline);
      expect(sheet.headline.length, distractor.headline).toBeLessThanOrEqual(HEADLINE_MAX);
      expect(lint(sheet), distractor.headline).toEqual([]);
    }
  });

  it("says in words what is missing and what is extra when every push is legal but the change is different", () => {
    const sheet = missSheet({ kind: "not_requested", missing: 1, extra: 2, drawn: 3, extras: [] }, null);
    expect(sheet.headline.length).toBeLessThanOrEqual(HEADLINE_MAX);
    expect(sheet.layers[0]?.text).toContain("One of the pushes this step needs is not drawn yet.");
    expect(sheet.layers[0]?.text).toContain("Two of yours go somewhere this step does not.");
    expect(lint(sheet)).toEqual([]);
  });

  it("counts the pushes in and the pushes left on an incomplete drawing", () => {
    const sheet = missSheet({ kind: "incomplete", drawn: 1, needed: 3 }, null);
    expect(sheet.headline).toBe("1 of 3 pushes drawn, all sound.");
    expect(sheet.layers[0]?.text).toContain("Two more pushes");
    expect(lint(sheet)).toEqual([]);
  });

  it("puts the favoured route and the route's own reason first on a wrong branch, then the rule, then where to look", () => {
    const losing = sn1Fork.routes.find((route) => route.cause !== undefined);
    const winning = sn1Fork.routes.find((route) => route.cause === undefined);
    if (losing?.cause === undefined || winning === undefined) throw new Error("the SN1 fork lost a route");
    const sheet = branchSheet({ kind: "not_favoured", route: losing, favoured: winning, cause: losing.cause });
    expect(sheet.headline.length).toBeLessThanOrEqual(HEADLINE_MAX);
    expect(sheet.layers.map((layer) => layer.label)).toEqual(["Why not this route", "The rule", "Where to look"]);
    expect(sheet.layers[0]?.text.toLowerCase()).toContain(winning.label.toLowerCase());
    expect(sheet.layers[0]?.text).toContain(losing.why);
    expect(lint(sheet)).toEqual([]);
  });

  it("offers a Why? on a win only when there is something the screen has not already said", () => {
    expect(winSheet("Goal achieved", null, null).layers).toEqual([]);
    expect(winSheet("Goal achieved", "Back-side attack.", null).layers.map((layer) => layer.label)).toEqual(["Why?"]);
    expect(winSheet("Goal achieved", "x", "Capture by water").caption).toBe("Route: Capture by water");
    expect("You found a resonance structure!".length).toBeLessThanOrEqual(HEADLINE_MAX);
  });
});

/* ------------------------------------------------------------------ */
/* The screen                                                           */
/* ------------------------------------------------------------------ */

let mounted: { root: Root; container: HTMLElement } | null = null;

function mount(question: TrainerQuestion, stepIndex: number): { container: HTMLElement; store: () => InteractionStore } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(TrainerScreen, { question, stepIndex, onExit: () => undefined, reducedMotion: true }));
  });
  return {
    container,
    store: () => {
      const store = window.__pilotStore;
      if (store === undefined) throw new Error("the ?store=1 debug hook did not expose the interaction store");
      return store;
    },
  };
}

afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

let clock = 0;
function pointerAt(point: Point2) {
  clock += 16;
  return { pointerId: 1, pointerType: "touch" as const, point, timestampMs: clock };
}
function targetCentre(match: Record<string, unknown>): Point2 {
  const entries = window.__pilotTargets ?? [];
  const hit = entries.find((entry) =>
    Object.entries(match).every(([key, value]) => (entry.target as unknown as Record<string, unknown>)[key] === value),
  );
  if (hit === undefined) throw new Error(`no target for ${JSON.stringify(match)}`);
  return hit.centre;
}
function tap(store: InteractionStore, point: Point2): void {
  act(() => void store.dispatch({ kind: "pointerDown", pointer: pointerAt(point) }));
  act(() => void store.dispatch({ kind: "pointerUp", pointer: pointerAt(point) }));
}
function drag(store: InteractionStore, from: Point2, to: Point2): void {
  act(() => void store.dispatch({ kind: "pointerDown", pointer: pointerAt(from) }));
  act(() => void store.dispatch({ kind: "pointerMove", pointer: pointerAt({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }) }));
  act(() => void store.dispatch({ kind: "pointerMove", pointer: pointerAt(to) }));
  act(() => void store.dispatch({ kind: "pointerUp", pointer: pointerAt(to) }));
}
function buttonLabelled(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim().startsWith(label));
}
function press(container: HTMLElement, label: string): void {
  const button = buttonLabelled(container, label);
  if (button === undefined) throw new Error(`no rendered button labelled ${label}`);
  if (button.disabled) throw new Error(`button ${label} is disabled`);
  act(() => button.click());
}
function sheet(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>("[data-answer-sheet]");
}
function openedLayers(container: HTMLElement): number {
  return container.querySelector("[data-sheet-layers]")?.children.length ?? 0;
}

describe("the sheet on the screen", () => {
  it("rises on a miss with one line, opens one layer per tap, and Got it puts Check back", () => {
    const { container, store } = mount(sn1Question, 0);
    // Bromine's lone pair sent to a methyl carbon. The canvas only ever draws
    // legal arrow shapes, so a drop in the wrong place is a legal push toward a
    // different change: the miss students actually meet.
    tap(store(), targetCentre({ kind: "atom", atomId: "br1" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "c2" }));
    press(container, "Check");

    expect(sheet(container)?.getAttribute("data-answer-sheet")).toBe("nearMiss");
    expect(container.querySelector("[data-sheet-headline]")?.textContent).toBe("Legal, but a different change.");
    expect(openedLayers(container)).toBe(0);
    expect(buttonLabelled(container, "Check")).toBeUndefined();

    press(container, "What's off");
    expect(openedLayers(container)).toBe(1);
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain("somewhere this step does not.");
    // The stray arrow is named back in the student's own terms, from the
    // step's state: the canvas records the drop onto c2 as a forming bond,
    // so the words name that gesture, bromine by name because it is unique.
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain("Your push, from a lone pair on bromine into a new bond between bromine and");
    press(container, "Where to look");
    expect(openedLayers(container)).toBe(2);
    expect(buttonLabelled(container, "Hide")).toBeDefined();

    press(container, "Got it");
    expect(sheet(container)).toBeNull();
    expect(buttonLabelled(container, "Check")).toBeDefined();
  });

  it("reaches the student with the instructor's copy when the mistake is one they anticipated", () => {
    const entry = TRAINER_REACTIONS.find((reaction) => reaction.id === "epoxide-basic");
    if (entry === undefined) throw new Error("epoxide-basic missing from the registry");
    const { container, store } = mount(questionFromReaction(entry), 0);
    // Methoxide at the MORE substituted ring carbon: legal, and the classic wrong regiochemistry.
    tap(store(), targetCentre({ kind: "atom", atomId: "om" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "om" }), targetCentre({ kind: "atom", atomId: "c2" }));
    press(container, "Check");

    expect(container.querySelector("[data-sheet-headline]")?.textContent).toBe("Basic conditions pick the CH₂.");
    press(container, "What's off");
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain("You attacked the more substituted carbon.");
  });

  it("names the route on a fork win and keeps its reason behind a Why? the student can take or leave", () => {
    const { container, store } = mount(sn1Question, forkStep);
    const capture = container.querySelector<HTMLButtonElement>('[data-fork-route="route-capture"]');
    if (capture === null) throw new Error("no capture puck");
    act(() => capture.click());
    tap(store(), targetCentre({ kind: "atom", atomId: "ow" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "ow" }), targetCentre({ kind: "atom", atomId: "c0" }));
    press(container, "Check");

    expect(sheet(container)?.getAttribute("data-answer-sheet")).toBe("good");
    expect(container.querySelector("[data-sheet-headline]")?.textContent).toBe("Goal achieved");
    expect(container.querySelector("[data-sheet-caption]")?.textContent).toBe("Route: Capture by water");
    expect(openedLayers(container)).toBe(0);
    press(container, "Why?");
    expect(openedLayers(container)).toBe(1);
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain(sn1Question.successLine);
    expect(buttonLabelled(container, "Continue")).toBeDefined();
  });

  it("offers no Why? on an early step whose prompt already said what happened", () => {
    const { container, store } = mount(sn1Question, 0);
    drag(store(), targetCentre({ kind: "bondEndHandle", bondId: "b-0br", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "br1" }));
    press(container, "Check");
    expect(sheet(container)?.getAttribute("data-answer-sheet")).toBe("good");
    // The headline is the step's own fact, not "Goal achieved": mid-sequence
    // that pill reads as done when two steps remain.
    expect(container.querySelector("[data-sheet-headline]")?.textContent).toBe("Bromine left with the pair.");
    expect(buttonLabelled(container, "Why?")).toBeUndefined();
    expect(buttonLabelled(container, "Continue")).toBeDefined();
  });
});

describe("naming the student's own stray arrow", () => {
  const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2");
  const epoxide = TRAINER_REACTIONS.find((entry) => entry.id === "epoxide-basic");
  if (sn2 === undefined || epoxide === undefined) throw new Error("the demo reactions moved");

  /** The arrow a student draws, built from the step's own ids. */
  function arrow(source: ElectronFlowArrow["source"], sink: ElectronFlowArrow["sink"]): ElectronFlowArrow {
    return { id: "stray" as ElectronFlowArrow["id"], electrons: 2, source, sink };
  }

  it("says which push is the stray one, in the student's own terms", () => {
    // Bromine's lone pair sent at a carbon: bromine is the only bromine here,
    // so it is named outright, and the carbon takes the descriptor that
    // separates it from the others.
    const strays = describeStrays(sn2.step, [arrow({ kind: "lonePair", atomId: "br1" }, { kind: "atom", atomId: "c1" })]);
    expect(strays).not.toBeNull();
    expect(strays?.[0]).toContain("from a lone pair on bromine onto ");
    expect(strays?.[0]).not.toContain(" a oxygen");
    expect(strays?.[0]).not.toContain(" a iodine");
  });

  it("says a bond is being raised rather than newly made when the two atoms already touch", () => {
    const strays = describeStrays(sn2.step, [arrow({ kind: "lonePair", atomId: "br1" }, { kind: "betweenAtoms", atomIds: ["c1", "br1"] })]);
    expect(strays?.[0]).toContain("making it");
    expect(strays?.[0]).not.toContain("a new bond");
  });

  it("stays silent rather than describing the stray in the same words as the right answer", () => {
    // The guard is all or nothing: if any stray would be described in the
    // same words as one of the step's own arrows, the student would read
    // the right answer labelled as their mistake, so nothing is named. An
    // authored arrow standing in as the stray is the sharpest case of it.
    const key = epoxide.step.arrows[0];
    if (key === undefined) throw new Error("epoxide-basic lost its authored arrow");
    const sameWords = describeStrays(epoxide.step, [{ ...key, id: "stray" as ElectronFlowArrow["id"] }]);
    expect(sameWords).toBeNull();
  });
});

describe("the per-step win lines", () => {
  it("keeps shouting out of every sheet-visible line: no all-caps words in wonLines or successLines", () => {
    // Real acronyms and formulas stay; emphasis caps (MORE, DOWN, WANT) do
    // not survive the sheet's voice rules. Round two's copy critic found six.
    const ALLOWED = new Set(["EAS", "THF", "DMSO", "DMF", "LDA", "NBS", "HCN", "DIBAL", "PADPED"]);
    const shouting = (text: string) => (text.match(/\b[A-Z]{3,}\b/g) ?? []).filter((word) => !ALLOWED.has(word));
    for (const entry of TRAINER_SEQUENCES) {
      expect(shouting(entry.successLine), `${entry.id} successLine`).toEqual([]);
      for (const [index, step] of entry.steps.entries()) {
        if (step.wonLine !== undefined) expect(shouting(step.wonLine), `${entry.id} step ${index + 1}`).toEqual([]);
      }
    }
    // Every other line the sheet can speak: a single-step reaction's success
    // line and a resonance find both reach the win sheet's Why?.
    for (const entry of TRAINER_REACTIONS) expect(shouting(entry.successLine), `${entry.id} successLine`).toEqual([]);
    for (const entry of RESONANCE_HUNT) expect(shouting(entry.foundLine), `${entry.id} foundLine`).toEqual([]);
  });

  it("gives every non-final sequence step a wonLine that holds one line and passes the voice lint", () => {
    for (const entry of TRAINER_SEQUENCES) {
      for (const [index, step] of entry.steps.entries()) {
        if (index === entry.steps.length - 1) continue;
        const line = step.wonLine;
        expect(line, `${entry.id} step ${index + 1}`).toBeDefined();
        if (line === undefined) continue;
        expect(line.length, `${entry.id} step ${index + 1}: ${line}`).toBeLessThanOrEqual(HEADLINE_MAX);
        expect(voiceViolations({ whatHappened: line, why: line, lookAt: line }), line).toEqual([]);
      }
    }
  });
});
