// @vitest-environment jsdom

/**
 * Bloom's reactions, pinned WHERE THEY FIRE (BLOOM-STATES-SPEC.md, section 4),
 * in the pattern of trainerMascotWiring.test.ts: the reaction table is tested in
 * berryReaction.test.ts, and what nothing else covers is that the lesson
 * surfaces actually call it. Delete the react() call in McqRunner's commit
 * handler and the tray berry stands still while every table test stays green.
 *
 * 1. The MCQ outcome rules (session.ts): right means what the combo chip
 *    means, and a second miss on the same beat is "wrong again".
 * 2. The real McqRunner, mounted: Check puts exactly one Bloom in the answer
 *    tray, already wearing the graded face in the same render.
 * 3. Path Bloom's beats (PathMascot.tsx) and the gallery's coverage: every
 *    mood, behaviour, state and costume, and one row per Bible state.
 * 4. BeatRunner mounts the lesson-complete celebration and the streak screen.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { latestOutcome, missedThisItemBefore, startMcqSession, type McqSession } from "../beats/mcq/session";
import { MCQ_BEATS } from "../beats/mcq";
import { McqRunner } from "../beats/mcq/McqRunner";
import type { BeatResult, McqBeat } from "../beats/types";
import { pathMoveFor } from "../tabs/pathway/PathMascot";
import BerryGallery from "../mascot/BerryGallery";
import { BIBLE_ROWS } from "../mascot/bloomBible";
import { BERRY_MOODS } from "../mascot/berryMood";
import { BEHAVIOURS, type BerryBehaviour } from "../mascot/berryBehaviour";
import { BERRY_STATES } from "../mascot/berryState";
import { BERRY_COSTUMES } from "../mascot/berryCostume";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(here, path), "utf8");

/* ------------------------------------------------------- 1. the rules -- */

describe("the MCQ outcome Bloom reacts to", () => {
  const base = { level: 1 as const, cause: "c", elapsedMs: 1, at: "2026-10-24T00:00:00Z" };
  // Cast: the cause ids are a branded union the fixtures do not need to spell.
  const right = (beatId: string): BeatResult => ({ ...base, beatId, kind: "correct" }) as BeatResult;
  const pass = (beatId: string): BeatResult => ({ ...base, beatId, kind: "correct", distractorId: "d1" }) as BeatResult;
  const miss = (beatId: string): BeatResult => ({ ...base, beatId, kind: "invalid" }) as unknown as BeatResult;
  const withResults = (results: readonly BeatResult[]): McqSession => ({ ...startMcqSession([], 1), results });

  it("has nothing to react to before the first commit", () => {
    expect(latestOutcome(withResults([]))).toBeNull();
    expect(missedThisItemBefore(withResults([]))).toBe(false);
  });

  it("reads right the way the combo chip does: a first-meeting pass is a miss", () => {
    expect(latestOutcome(withResults([right("a")]))).toBe("correct");
    expect(latestOutcome(withResults([pass("a")]))).toBe("wrong");
    expect(latestOutcome(withResults([miss("a")]))).toBe("wrong");
  });

  it("calls a second miss on the SAME beat wrong again, and a miss on a new beat plain wrong", () => {
    expect(latestOutcome(withResults([miss("a"), right("b"), miss("a")]))).toBe("wrongAgain");
    expect(latestOutcome(withResults([miss("a"), miss("b")]))).toBe("wrong");
    // A beat missed once and then got right is not a second miss.
    expect(latestOutcome(withResults([miss("a"), right("a")]))).toBe("correct");
    expect(missedThisItemBefore(withResults([right("a"), miss("a")]))).toBe(false);
  });
});

/* -------------------------------------------- 2. the real MCQ runner -- */

let mounted: { root: Root; container: HTMLElement } | null = null;
afterEach(() => {
  if (mounted !== null) {
    const { root, container } = mounted;
    act(() => root.unmount());
    container.remove();
    mounted = null;
  }
});

/** A word-row beat (no picture tiles), so the options are plain buttons with their text. */
function wordBeat(): McqBeat {
  const found = MCQ_BEATS.find((beat) => beat.levels.includes(1) && beat.options.every((o) => o.text.length > 0));
  if (found === undefined) throw new Error("no rung-1 MCQ beat to mount");
  return found;
}

function mountRunner(beat: McqBeat): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  act(() => {
    root.render(createElement(McqRunner, { node: beat.node, level: 1, beats: [beat], onExit: () => undefined, reducedMotion: true, showHowTo: false }));
  });
  return container;
}

function pick(container: HTMLElement, beat: McqBeat, optionId: string): void {
  const option = beat.options.find((o) => o.id === optionId);
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Answer options"] button')];
  const index = beat.options.indexOf(option as (typeof beat.options)[number]);
  const button = buttons[index];
  if (button === undefined) throw new Error(`no option button ${optionId}`);
  act(() => button.click());
  const check = [...container.querySelectorAll("button")].find((b) => (b.textContent ?? "").trim() === "Check");
  if (check === undefined) throw new Error("no Check button");
  act(() => check.click());
}

/** Every Bloom on screen is a Berry root ([data-state]) with a face (.bb-eyes[data-mood]). */
const blooms = (root: ParentNode) => [...root.querySelectorAll("[data-state] .bb-eyes")].map((eyes) => eyes.getAttribute("data-mood"));

describe("McqRunner reacts on the grade", () => {
  it("stands one working berry on the action bar before the answer", () => {
    const beat = wordBeat();
    const container = mountRunner(beat);
    expect(blooms(container)).toHaveLength(1);
    expect(container.querySelector("[data-answer-tray]")).toBeNull();
  });

  it("a right answer: exactly one Bloom on screen, in the tray, happy in the same render", () => {
    const beat = wordBeat();
    const container = mountRunner(beat);
    pick(container, beat, beat.correctOptionId);
    const tray = container.querySelector("[data-answer-tray]");
    expect(tray).not.toBeNull();
    expect(blooms(tray as Element)).toEqual(["happy"]);
    expect(blooms(container)).toHaveLength(1);
  });

  it("a wrong answer: the same one Bloom, with the sad beat, and no sparkles", () => {
    const beat = wordBeat();
    const container = mountRunner(beat);
    const wrong = beat.options.find((o) => o.id !== beat.correctOptionId);
    if (wrong === undefined) throw new Error("beat has no wrong option");
    pick(container, beat, wrong.id);
    const tray = container.querySelector("[data-answer-tray]") as Element;
    expect(blooms(tray)).toEqual(["sad"]);
    expect(blooms(container)).toHaveLength(1);
    expect(tray.querySelector(".berry-sparkles")).toBeNull();
  });

  it("calls react in the commit handler, before the session update it batches with", () => {
    const src = read("../beats/mcq/McqRunner.tsx");
    const commit = src.slice(src.indexOf("const committed = commitPick("), src.indexOf("const report = () =>"));
    expect(commit).toMatch(/reactions\.react\(outcome\)/);
    expect(commit.indexOf("reactions.react(outcome)")).toBeLessThan(commit.indexOf("setSession(committed.session)"));
  });
});

/* ------------------------------------------- 3. the path, the gallery -- */

describe("path Bloom's beats", () => {
  it("rests leaning in, hops on a tap or an unlock, and sighs once when bored", () => {
    expect(pathMoveFor("rest").behaviour).toBe("leanIn");
    expect(pathMoveFor("tap")).toMatchObject({ behaviour: "bounce", chain: ["leanIn"] });
    expect(pathMoveFor("unlock")).toEqual(pathMoveFor("tap"));
    const bored = pathMoveFor("bored");
    expect(bored).toMatchObject({ behaviour: "sigh", mood: "sleepy", lookAt: { x: 0, y: 0 } });
    // A sigh never loops: it is a reactive behaviour that returns to rest.
    expect(BEHAVIOURS.sigh.family).not.toBe("ambient");
  });

  it("never sets a mood outside the bored beat, so the row's own happy face stands", () => {
    for (const beat of ["rest", "tap", "unlock"] as const) expect("mood" in pathMoveFor(beat)).toBe(false);
  });
});

describe("the gallery shows everything", () => {
  const html = renderToStaticMarkup(createElement(BerryGallery, { reducedMotion: true }));

  it("every mood, every behaviour, every state and every costume", () => {
    for (const mood of BERRY_MOODS) expect(html).toContain(`data-gallery-mood="${mood}"`);
    for (const name of Object.keys(BEHAVIOURS) as BerryBehaviour[]) expect(html).toContain(`data-gallery-behaviour="${name}"`);
    for (const state of BERRY_STATES) expect(html).toContain(`data-state="${state}"`);
    for (const costume of BERRY_COSTUMES) expect(html).toMatch(new RegExp(`>${costume}<`));
  });

  it("one row per Bible state, parked rows drawn as parked with a reason", () => {
    expect(html.split('data-bible-row="').length - 1).toBe(BIBLE_ROWS.length);
    for (const row of BIBLE_ROWS) {
      expect(row.note.length).toBeGreaterThan(0);
      expect(row.decision === "built").toBe(row.demo !== undefined);
    }
    expect(html).toContain("Reduced motion (the still poses)");
  });

  it("is reachable from the staff viewer", () => {
    expect(read("../admin/AdminHome.tsx")).toMatch(/href: hrefForGallery\(\)/);
  });
});

/* ------------------------------------------------ 4. the lesson's end -- */

describe("BeatRunner's ending", () => {
  const src = read("../beats/BeatRunner.tsx");

  it("celebrates with BloomLessonComplete, fed the numbers the store paid", () => {
    expect(src).toMatch(/<BloomLessonComplete reducedMotion=\{reducedMotion\} xp=\{xp\} diamonds=\{banked\}/);
  });

  it("follows the reward with the streak screen only when today counted for the first time", () => {
    // The streak page now rides on the celebration (owner's celebration pages): it is shown
    // only when today counted for the first time, and the celebration is told so.
    expect(src).toMatch(/const firstToday = !countedBefore && receipt\.streak\.counted/);
    expect(src).toMatch(/firstToday,/);
  });
});
