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
    /*
     * AND HERE IT DECLINES TO NAME IT, which is the honest answer on this
     * step. The drop lands on one of tert-butyl bromide's three methyls, and
     * the three are equivalent, so no phrase points at one of them. The sheet
     * gives the count rather than inventing "a CH3 carbon", and the count
     * sentence is back precisely because nothing was named.
     */
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain("somewhere this step does not.");
    expect(container.querySelector("[data-sheet-layers]")?.textContent).not.toContain("The stray one is");
    // The stray arrow is named back in the student's own terms, from the
    // step's state: the canvas records the drop onto c2 as a forming bond,
    // so the words name that gesture, bromine by name because it is unique.
    expect(container.querySelector("[data-sheet-layers]")?.textContent).toContain("Every arrow you drew is legal on its own");
    press(container, "Where to look");
    expect(openedLayers(container)).toBe(2);
    expect(buttonLabelled(container, "Hide")).toBeDefined();

    press(container, "Got it");
    expect(sheet(container)).toBeNull();
    expect(buttonLabelled(container, "Check")).toBeDefined();
  });

  it("gives the verdict the whole row, with Undo riding on the sheet instead", () => {
    /*
     * Four blind rounds were lost with a correct curve, a stationary rect and
     * the right colour in the right frame. The fifth measured the cause: the
     * bar's button is one full-width slab and the only control on the sheet,
     * while ours was a 173 px chip in a stack of four of the same shape. The
     * copy still tells the student their stray "comes off with Undo", so Undo
     * moves into the sheet's pill row rather than disappearing.
     */
    const { container, store } = mount(sn1Question, 0);
    tap(store(), targetCentre({ kind: "atom", atomId: "br1" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "c2" }));
    press(container, "Check");

    const actionRow = container.querySelector("[data-answer-sheet]")?.parentElement?.querySelector(".chip-press")?.parentElement;
    const chips = [...(actionRow?.querySelectorAll(".chip-press") ?? [])];
    expect(chips.map((chip) => (chip.textContent ?? "").trim())).toEqual(["Got it"]);
    expect(container.querySelector("[data-sheet-undo]")).not.toBeNull();
    // And the row below the sheet carries nothing else while the verdict is up.
    expect(buttonLabelled(container, "Redraw")).toBeUndefined();
    expect(buttonLabelled(container, "Replay")).toBeUndefined();

    // Undo still works from there, and clearing the drawing clears the verdict.
    act(() => container.querySelector<HTMLButtonElement>("[data-sheet-undo]")?.click());
    expect(sheet(container)).toBeNull();
    expect(buttonLabelled(container, "Check")).toBeDefined();
  });

  it("keeps the primary the same slab before and after the answer", () => {
    /*
     * Round six won the blind call by giving the verdict the full row, but
     * bought it by GROWING into place: Check sat beside Undo at half width
     * and the verdict landed full width, so the control under the thumb
     * jumped 185 px in the mount frame. The bar never moves that button, it
     * only recolours it. Both are now the sole child of the action row, so
     * the arrival is one object changing state. jsdom has no layout, so the
     * structural claim is what is pinned here; the pixels are the critic's.
     */
    const { container, store } = mount(sn1Question, 0);
    const actionRow = () => container.querySelector(".chip-press")?.parentElement;
    const labelsIn = (row: Element | null | undefined) => [...(row?.querySelectorAll(".chip-press") ?? [])].map((chip) => (chip.textContent ?? "").trim());

    tap(store(), targetCentre({ kind: "atom", atomId: "br1" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "c2" }));
    // Before: Check alone on its row, with Undo in the quiet row above it.
    const beforeRow = [...container.querySelectorAll(".chip-press")].find((chip) => (chip.textContent ?? "").trim() === "Check")?.parentElement;
    expect(labelsIn(beforeRow)).toEqual(["Check"]);
    expect(buttonLabelled(container, "Undo")).toBeDefined();

    press(container, "Check");
    // After: the verdict alone on that same row.
    const afterRow = [...container.querySelectorAll(".chip-press")].find((chip) => (chip.textContent ?? "").trim() === "Got it")?.parentElement;
    expect(labelsIn(afterRow)).toEqual(["Got it"]);
    expect(actionRow).toBeDefined();
  });

  it("carries the same control rows before the student's first edit as after it", () => {
    /*
     * THE ROW MAY NOT APPEAR UNDER A MOVING FINGER. When the quiet row
     * rendered only once an edit existed, the Undo chip arrived on the first
     * edit and reflowed the board mid-gesture: the canvas lost 68 px, every
     * atom rose 34 px, and a drag released where the target had been landed
     * on nothing. No arrow committed, Check stayed disabled, and the step
     * could not be submitted at all.
     *
     * jsdom has no layout, so what is pinned here is the structural cause
     * rather than the pixels: the same chips are mounted before and after
     * the first edit, with Undo disabled rather than absent. The geometry
     * itself is the critic's to measure in a real browser.
     */
    const { container, store } = mount(sn1Question, 0);
    const chipLabels = () => [...container.querySelectorAll(".chip-press")].map((chip) => (chip.textContent ?? "").trim());
    const undo = () => [...container.querySelectorAll<HTMLButtonElement>(".chip-press")].find((chip) => (chip.textContent ?? "").trim() === "Undo");

    const before = chipLabels();
    expect(before).toContain("Undo");
    expect(undo()?.disabled).toBe(true);

    // The first edit of the step, which is exactly when the row used to appear.
    tap(store(), targetCentre({ kind: "atom", atomId: "br1" }));
    drag(store(), targetCentre({ kind: "lonePair", atomId: "br1" }), targetCentre({ kind: "atom", atomId: "c2" }));

    expect(chipLabels()).toContain("Undo");
    expect(undo()?.disabled).toBe(false);
    // And the arrow really committed, which is what the reflow used to break.
    expect(buttonLabelled(container, "Check")?.disabled).toBe(false);
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

  it("says the pair lands in a bond that is already there, without claiming what it becomes", () => {
    // Hydroxide's pair into the C-Br bond: that bond exists, so nothing NEW
    // forms, and the sentence says where the pair went and then stops. What
    // C-Br would BECOME is not claimed; one arrow does not decide a product.
    const strays = describeStrays(sn2.step, [arrow({ kind: "lonePair", atomId: "o1" }, { kind: "betweenAtoms", atomIds: ["c1", "br1"] })]);
    expect(strays?.[0]).toBe("from a lone pair on oxygen into the C–Br bond");
  });

  it("drops a description too long to read rather than printing it", () => {
    /*
     * The epoxide's ring C-O bond shares its element pair with the other ring
     * bond, so it is named by its ends, and one end is itself an atom only
     * placeable by ITS neighbours. The honest phrase runs past 130 characters
     * with two "between"s in it, which points at nothing a student can follow.
     * A critic found a 254-character version of this in the wild.
     */
    const strays = describeStrays(epoxide.step, [arrow({ kind: "lonePair", atomId: "om" }, { kind: "betweenAtoms", atomIds: ["c1", "o1"] })]);
    expect(strays).toBeNull();
  });

  it("never predicts what a bond becomes, on any legal arrow of any authored step", () => {
    /*
     * THE GUARD THAT REPLACED A GUARD. The sentence used to close with
     * ", making it C=O", gated by a table of per-element bond-order ceilings.
     * A ceiling per element is not a valence: a critic enumerating every legal
     * arrow over sixteen steps caught "making it N=O" on a nitro nitrogen
     * already holding four bonds, and "making it C=N" on a methyl carbon.
     * Both are the five-bonded structures the table was added to prevent.
     * One arrow in isolation does not determine a product, so the clause is
     * gone rather than better-gated, and this pin is over the whole registry.
     */
    for (const entry of TRAINER_SEQUENCES) {
      for (const step of entry.steps) {
        const sink = step.step.from.members.flatMap((member) => member.species.bonds);
        const sources = step.step.from.members.flatMap((member) => member.species.atoms);
        const probes = sink.flatMap((bond) =>
          sources.slice(0, 4).map((atom) => arrow({ kind: "lonePair", atomId: atom.id }, { kind: "betweenAtoms", atomIds: [bond.a, bond.b] })),
        );
        for (const phrase of describeStrays(step.step, probes) ?? []) {
          expect(phrase, `${entry.id}: ${phrase}`).not.toContain("making it");
        }
      }
    }
  });

  it("points at one atom or says nothing: no indefinite name reaches a sentence", () => {
    /*
     * "into a new bond between a CH2 carbon and a CH2 carbon" is two
     * different atoms wearing one phrase. The bond half of the describer
     * checked for this and the sink half did not, so 26 percent of the
     * sentences the same critic generated named something that does not exist
     * on the canvas. Both halves check now.
     */
    for (const entry of TRAINER_SEQUENCES) {
      for (const step of entry.steps) {
        const atoms = step.step.from.members.flatMap((member) => member.species.atoms);
        const probes = atoms.flatMap((from) => atoms.filter((to) => to.id !== from.id).map((to) => arrow({ kind: "lonePair", atomId: from.id }, { kind: "atom", atomId: to.id })));
        for (const phrase of describeStrays(step.step, probes) ?? []) {
          expect(phrase, `${entry.id}: ${phrase}`).not.toMatch(/(onto|to|between|and) an? [A-Z]/);
        }
      }
    }
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
