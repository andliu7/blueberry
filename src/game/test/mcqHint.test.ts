/**
 * The Hint key on a lesson question (owner, 25 Oct, Q9: "add hint").
 * What it shows, what it greys out, how a hinted answer is counted, where
 * Bloom's ring sits, and that graded finals never offer it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PATHWAY_UNITS, checkpointNodeId } from "../demo/pathwayMap";
import { U0_GUIDE } from "../guide/u0Guide";
import { U1_GUIDE } from "../guide/u1Guide";
import { MCQ_BEATS } from "../beats/mcq/content";
import { guideIdeasFor, hintNudge, hintOptionId, hintUnitFor, nudgeIsSafe, PLAIN_NUDGE } from "../beats/mcq/hint";
import { McqBeatView, type McqBeatViewProps } from "../beats/mcq/McqBeatView";
import {
  advance,
  canCommit,
  commitPick,
  currentRun,
  ruledOutId,
  selectOption,
  sessionProgress,
  startMcqSession,
  takeHint,
} from "../beats/mcq/session";
import { hintsAllowed, lessonMcqBeats, reportStep, runFlawless, startRun, planLesson } from "../beats/template";
import { clearsBeat, rightFirstTry, type McqBeat } from "../beats/types";

const AT = { at: "2026-10-25T00:00:00Z", elapsedMs: 1000 };

/** Every quick question a lesson can serve: the authored ones and the pooled ones. */
function everyBeat(): readonly McqBeat[] {
  const seen = new Map<string, McqBeat>();
  for (const beat of MCQ_BEATS) seen.set(beat.id, beat);
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      for (const beat of lessonMcqBeats(node.id)) seen.set(beat.id, beat);
    }
  }
  return [...seen.values()];
}

const GUIDES = { u0: U0_GUIDE, u1: U1_GUIDE } as const;
function ideasFor(beat: McqBeat) {
  const unit = hintUnitFor(beat.node);
  const guide = unit === "u0" || unit === "u1" ? GUIDES[unit] : null;
  return guideIdeasFor(guide, beat.node);
}
function keyOf(beat: McqBeat): string {
  return beat.options.find((option) => option.id === beat.correctOptionId)!.text;
}

describe("the nudge", () => {
  const beats = everyBeat();

  it("walks a real set of questions", () => {
    expect(beats.length).toBeGreaterThan(20);
  });

  it("never equals or contains the keyed answer's text, with or without the guide", () => {
    for (const beat of beats) {
      for (const nudge of [hintNudge(beat), hintNudge(beat, ideasFor(beat))]) {
        expect(nudge.text.trim().toLowerCase(), beat.id).not.toBe(keyOf(beat).trim().toLowerCase());
        expect(nudgeIsSafe(nudge.text, beat), beat.id).toBe(true);
        const key = keyOf(beat).toLowerCase();
        if (key.length > 3) expect(nudge.text.toLowerCase().includes(key), beat.id).toBe(false);
      }
    }
  });

  it("only ever quotes words already written for the question or its lesson", () => {
    for (const beat of beats) {
      const ideas = ideasFor(beat);
      const nudge = hintNudge(beat, ideas);
      const written = [
        ...ideas.map((idea) => idea.text),
        ...beat.options.map((option) => option.why ?? ""),
        beat.brief ?? "",
        PLAIN_NUDGE,
      ];
      expect(written.some((line) => line.includes(nudge.text)), beat.id).toBe(true);
    }
  });

  it("matches the key as whole words", () => {
    const beat = { ...beats[0]!, options: [{ id: "k", text: "One" }, { id: "w", text: "Two" }], correctOptionId: "k" };
    expect(nudgeIsSafe("It gives one product.", beat)).toBe(false);
    expect(nudgeIsSafe("Weigh the options.", beat)).toBe(true);
  });

  it("matches a longer key anywhere, so a lookalike word never carries it", () => {
    const beat = { ...beats[0]!, options: [{ id: "k", text: "Ethanol" }, { id: "w", text: "Methanol" }], correctOptionId: "k" };
    expect(nudgeIsSafe("Methanol would come from a methyl ester.", beat)).toBe(false);
    expect(nudgeIsSafe("Look at the ester's alkoxy group.", beat)).toBe(true);
  });

  it("skips a line that names the answer and falls to the next source", () => {
    const beat: McqBeat = {
      ...beats[0]!,
      id: "probe",
      options: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta", why: "Alpha is right, not this. More after." },
      ],
      correctOptionId: "a",
    };
    expect(hintNudge(beat, [{ text: "Weigh what each reagent does.", source: "other" }])).toEqual({
      text: "Weigh what each reagent does.",
      source: "lesson",
    });
  });

  it("prefers the greyed option's slip, first sentence only, and never the guide line drawn from this question", () => {
    const beat: McqBeat = {
      ...beats[0]!,
      id: "probe",
      options: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta", why: "A slip line. The key is the other one." },
      ],
      correctOptionId: "a",
    };
    const ideas = [
      { text: "The rule this question tests. More after.", source: "probe" },
      { text: "The lesson's key idea.", source: "other" },
    ];
    expect(hintNudge(beat, ideas)).toEqual({ text: "A slip line.", source: "slip" });
    const noSlip: McqBeat = { ...beat, options: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] };
    expect(hintNudge(noSlip, ideas)).toEqual({ text: "The lesson's key idea.", source: "lesson" });
    expect(hintNudge(noSlip, [ideas[0]!]).text).not.toContain("The rule this question tests");
  });
});

describe("the greyed option", () => {
  it("is never the key, and is the same every time", () => {
    for (const beat of everyBeat()) {
      const out = hintOptionId(beat);
      expect(out, beat.id).not.toBe(beat.correctOptionId);
      expect(beat.options.some((option) => option.id === out), beat.id).toBe(true);
      expect(hintOptionId(beat)).toBe(out);
    }
  });

  it("cannot be picked, and a pick sitting on it is cleared", () => {
    const beat = MCQ_BEATS.find((b) => b.levels.includes(1))!;
    const out = hintOptionId(beat)!;
    const picked = selectOption(startMcqSession([beat], 1), out);
    expect(picked.selectedId).toBe(out);
    const hinted = takeHint(picked);
    expect(ruledOutId(hinted)).toBe(out);
    expect(hinted.selectedId).toBeNull();
    expect(canCommit(hinted)).toBe(false);
    expect(selectOption(hinted, out).selectedId).toBeNull();
  });
});

describe("first-try accounting", () => {
  const beat = MCQ_BEATS.find((b) => b.levels.includes(1))!;

  it("a right answer after Hint clears, but is not right first try and breaks the combo", () => {
    const session = selectOption(takeHint(startMcqSession([beat, beat], 1)), beat.correctOptionId);
    const committed = commitPick(session, AT)!;
    const result = committed.session.results[0]!;
    expect(result.hinted).toBe(true);
    expect(clearsBeat(result)).toBe(true);
    expect(rightFirstTry(result)).toBe(false);
    expect(currentRun(committed.session)).toBe(0);
    // The strip still fills: green says you moved.
    expect(sessionProgress(committed.session).cleared).toBe(1);
  });

  it("Hint is spent per question: the next one starts fresh", () => {
    const committed = commitPick(selectOption(takeHint(startMcqSession([beat, beat], 1)), beat.correctOptionId), AT)!;
    const next = advance(committed.session);
    expect(next.hintUsed).toBeUndefined();
    const second = commitPick(selectOption(next, beat.correctOptionId), AT)!;
    expect(second.session.results[1]!.hinted).toBeUndefined();
    expect(rightFirstTry(second.session.results[1]!)).toBe(true);
  });

  it("a lesson with a hinted answer is not flawless", () => {
    const node = PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((n) => planLesson(n.id)?.steps.length === 1)?.id
      ?? PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((n) => planLesson(n.id) !== null)!.id;
    const plan = planLesson(node)!;
    let run = startRun(plan);
    for (let i = 0; i < plan.steps.length; i += 1) run = reportStep(run, { cleared: 2, total: 2 });
    expect(runFlawless(run)).toBe(true);
    let hinted = startRun(plan);
    for (let i = 0; i < plan.steps.length; i += 1) {
      hinted = reportStep(hinted, i === 0 ? { cleared: 1, total: 2, hinted: 1 } : { cleared: 2, total: 2 });
    }
    expect(hinted.hintedBeats).toBe(1);
    expect(runFlawless(hinted)).toBe(false);
  });
});

function view(extra: Partial<McqBeatViewProps>) {
  const beat = MCQ_BEATS.find((b) => b.levels.includes(1))!;
  const props: McqBeatViewProps = {
    beat,
    level: 1,
    selectedId: null,
    reveal: null,
    progress: { answered: 0, total: 1, fraction: 0, cleared: 0, clearedFraction: 0 },
    primaryLabel: "Check",
    primaryEnabled: false,
    onPrimary: () => {},
    onSelect: () => {},
    onExit: () => {},
    onReport: () => {},
    reported: false,
    ...extra,
  };
  return { beat, html: renderToStaticMarkup(createElement(McqBeatView, props)) };
}
const HINT = { used: false, nudge: null, ruledOutId: null, onHint: () => {}, ringKey: 0 };

describe("the Hint key on screen", () => {
  it("is a real, labelled button beside Check", () => {
    const { html } = view({ hint: HINT });
    expect(html).toMatch(/<button type="button" aria-label="Hint: [^"]+" class="[^"]*mcq-hint__key/);
    expect(html).toContain("mcq-hint__check");
  });

  it("wears Bloom's hint ring when one is offered, and the tray's Why? no longer does", () => {
    const { html } = view({ hint: { ...HINT, ringKey: 2 } });
    expect(html).toMatch(/mcq-hint__key[\s\S]*bloom-hint-ring[\s\S]*<\/button>/);
    expect(view({ hint: HINT }).html).not.toContain("bloom-hint-ring");
  });

  it("shows the nudge and marks the greyed option once pressed", () => {
    const beat = MCQ_BEATS.find((b) => b.levels.includes(1))!;
    const out = hintOptionId(beat)!;
    const { html } = view({ hint: { ...HINT, used: true, nudge: "A nudge.", ruledOutId: out } });
    expect(html).toContain('role="status"');
    expect(html).toContain("A nudge.");
    expect(html).toContain('data-out="true"');
    expect(html).toContain("ruled out by the hint");
    expect(html).toContain('aria-label="Hint used"');
  });

  it("is absent when no hint is handed down", () => {
    expect(view({}).html).not.toContain("mcq-hint__key");
  });
});

describe("graded finals stay hint-free", () => {
  const lesson = PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((n) => n.role !== "quiz" && planLesson(n.id) !== null)!;
  const quiz = PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((n) => n.role === "quiz");

  it("a Practice lesson offers Hint", () => {
    expect(hintsAllowed(lesson.id, "practice")).toBe(true);
  });

  it("a Challenge, a unit checkpoint and a section quiz do not", () => {
    expect(hintsAllowed(lesson.id, "challenge")).toBe(false);
    expect(hintsAllowed(checkpointNodeId(PATHWAY_UNITS[1]!.id), "practice")).toBe(false);
    if (quiz !== undefined) expect(hintsAllowed(quiz.id, "practice")).toBe(false);
  });

  it("test-outs, unit exams and review stops never turn it on, and McqRunner defaults it off", () => {
    const src = (path: string) => readFileSync(resolve(__dirname, path), "utf8");
    for (const file of ["../tabs/pathway/TestOutRun.tsx", "../beats/practice/PracticeRunner.tsx", "../tabs/pathway/ReviewRun.tsx"]) {
      expect(src(file), file).not.toMatch(/\bhints[={]/);
    }
    expect(src("../beats/mcq/McqRunner.tsx")).toContain("hints = false");
    // BeatRunner passes it only through the rule above.
    for (const match of src("../beats/BeatRunner.tsx").matchAll(/hints=\{([^}]*)\}/g)) {
      expect(match[1]).toMatch(/^hintsAllowed\(/);
    }
  });
});
