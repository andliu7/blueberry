/**
 * Every Unit 1 lesson opens on its priming preview (U1-P2, 2026-10-17).
 *
 * What is pinned:
 * 1. Every playable Unit 1 node that is a lesson (not a stage quiz, not a
 *    mention) has a preview, and BeatRunner's first screen for it IS that
 *    preview, rendered, with its guess, before any lesson question.
 * 2. The preview says nothing the lesson does not: every idea quotes, word for
 *    word, the explanation or CORRECT option of a question in THIS lesson; the
 *    bridge quotes one in the PREVIOUS lesson; the guess is a question this
 *    lesson plays, with a drawing. Every item stays a draft.
 * 3. Its shape is a primer, not a lesson: one line, 3 to 5 ideas that read as
 *    one sentence, every link carrying real words, and a link back to the
 *    lesson right before it ON THE PATH the student walks (optional branches
 *    are skipped for a spine lesson), never the one before it in the array.
 * 4. It shows once per visit: never on a Challenge, never on a same-session
 *    reopen. The guess is marked (at the end of the lesson, LessonRecap) with
 *    the lesson's own why, and it is never one of the first two questions the
 *    lesson itself plays, so the lesson does not open on a repeat.
 * 5. The map rebuilt at the end starts with its chips out of order.
 *
 * The clicks themselves (lock after CHECK, skip, the recap's verdict and the
 * map rebuild) are pinned in u1PrimingPlay.test.ts, which needs a DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BeatRunner } from "../beats/BeatRunner";
import { mcqVisualFor } from "../beats/mcq/mcqFigures";
import {
  guessFor,
  guessPayoff,
  mapPoolOrder,
  opensOnPreview,
  previousOnPath,
  primingFor,
  primingSources,
  quotableText,
  revisitVerdict,
  viaWords,
} from "../beats/priming";
import { lessonMcqBeats, lessonMeetBeats, planLesson } from "../beats/template";
import { beatAllowedAt } from "../beats/types";
import { U1_PRIMING } from "../content/u1/priming";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

const U1 = PATHWAY_UNITS.find((unit) => unit.id === "u1")!;
const LESSONS = U1.nodes.filter((node) => node.playable !== undefined && node.role !== "quiz" && !node.mentionOnly);
const LESSON_IDS = LESSONS.map((node) => node.id);

/** Whether `quote` appears word for word in what `source` (a question in `node`'s lesson) says. */
function quotes(node: string, source: string, quote: string): boolean {
  const found = primingSources(node).get(source);
  return found !== undefined && quotableText(found).includes(quote);
}

describe("every Unit 1 lesson opens on its preview", () => {
  it("covers the nineteen lesson nodes and no quiz", () => {
    expect(LESSONS.length).toBe(19);
    for (const node of LESSONS) expect(primingFor(node.id), node.id).not.toBeNull();
    for (const node of U1.nodes.filter((n) => n.role === "quiz")) expect(primingFor(node.id), node.id).toBeNull();
    // No stray entry for a node that is not a Unit 1 lesson.
    for (const id of Object.keys(U1_PRIMING)) expect(LESSON_IDS, id).toContain(id);
  });

  it("renders the preview, with its guess, as the first screen, before any lesson question", () => {
    for (const node of LESSONS) {
      expect(planLesson(node.id), node.id).not.toBeNull();
      const html = renderToStaticMarkup(createElement(BeatRunner, { node: node.id, onExit: () => {} }));
      expect(html, node.id).toContain(`data-preview="${node.id}"`);
      const guess = guessFor(node.id);
      if (guess === null) {
        // No guess: the preview opens straight on the map, shown whole.
        expect(html, node.id).toContain("The map of this lesson");
        expect(html, node.id).toContain("primer-chain__chip");
        expect(html, node.id).not.toContain("primer-pool__chip");
        expect(html, node.id).toContain("Start lesson");
        expect(html, node.id).not.toContain("mcq-sheet");
        continue;
      }
      expect(html, node.id).toContain("Quick guess");
      // Pick, then CHECK; SKIP passes the guess.
      expect(html, node.id).toContain(">Check<");
      expect(html, node.id).toContain(">Skip<");
      // renderToStaticMarkup escapes text, so look for the escaped form.
      const escaped = (text: string) =>
        text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#x27;");
      for (const option of guess.options) expect(html, `${node.id}: ${option.text}`).toContain(escaped(option.text));
      // The question screen itself has not mounted yet.
      expect(html, node.id).not.toContain("mcq-sheet");
      // The map waits until the guess is checked or skipped.
      expect(html, node.id).not.toContain("primer-chain");
    }
  });
});

describe("the preview says nothing the lesson does not", () => {
  it("quotes every idea word for word from a question in this lesson", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      for (const idea of priming.ideas) {
        expect(primingSources(node).has(idea.source), `${node}: ${idea.source} is not in this lesson`).toBe(true);
        expect(quotes(node, idea.source, idea.quote), `${node}: "${idea.quote}" is not in ${idea.source}`).toBe(true);
      }
    }
  });

  it("quotes the bridge word for word from a question in the earlier lesson", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      const bridge = priming.bridge;
      if (bridge.node === null) continue;
      expect(quotes(bridge.node, bridge.source, bridge.quote), `${node}: "${bridge.quote}" is not in ${bridge.source}`).toBe(
        true,
      );
    }
  });

  it("asks a guess this lesson plays, with its drawing", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      // The one exception: a lesson that plays a single question. A marked
      // guess on it would be the whole lesson before it starts.
      if (lessonMcqBeats(node).length === 1) {
        expect(priming.guess, node).toBeNull();
        continue;
      }
      const guess = guessFor(node);
      expect(guess, `${node}: ${priming.guess}`).not.toBeNull();
      expect(guess!.id).toBe(priming.guess);
      expect(mcqVisualFor(guess!.id), `${node}: ${priming.guess} has no drawing`).not.toBeNull();
      expect(guess!.options.length, node).toBeGreaterThanOrEqual(2);
      expect(guess!.options.length, node).toBeLessThanOrEqual(4);
    }
  });

  it("never asks a question the lesson opens on: not its first or second screen", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      if (priming.guess === null) continue;
      const kinds = planLesson(node)!.steps.map((step) => step.beat.kind);
      // A practice run draws its order at play time; nothing fixed to check.
      if (kinds.includes("practice")) continue;
      const played = [
        ...(kinds.includes("meet") ? lessonMeetBeats(node) : []),
        ...(kinds.includes("mcq") ? lessonMcqBeats(node).filter((beat) => beatAllowedAt(beat, 1)) : []),
      ].map((beat) => beat.id);
      expect(played.slice(0, 2), `${node}: the guess ${priming.guess} opens the lesson`).not.toContain(priming.guess);
    }
  });

  it("keeps every preview a draft", () => {
    for (const priming of Object.values(U1_PRIMING)) expect(priming.placeholder).toBe(true);
  });
});

describe("it is a primer, short enough to read in under 30 seconds", () => {
  it("asks one question, then 3 to 5 short ideas joined into one sentence", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      expect(priming.bigIdea.length, node).toBeLessThanOrEqual(90);
      // A question, so the first line never hands over what the lesson asks.
      expect(priming.bigIdea.trim().endsWith("?"), node).toBe(true);
      expect(priming.ideas.length, node).toBeGreaterThanOrEqual(3);
      expect(priming.ideas.length, node).toBeLessThanOrEqual(5);
      priming.ideas.forEach((idea, index) => {
        expect(idea.label.length, `${node}: ${idea.label}`).toBeLessThanOrEqual(30);
        if (index === 0) expect(idea.via, `${node}: the first idea starts the sentence`).toBeUndefined();
        // Every link between two nodes carries words, not just a comma.
        else expect(viaWords(idea.via ?? ""), `${node}: the link to "${idea.label}" has no words`).toMatch(/[A-Za-z]/);
      });
      const words = [priming.bigIdea, priming.bridge.text, ...priming.ideas.flatMap((i) => [i.label, i.via ?? ""])]
        .join(" ")
        .split(/\s+/).length;
      // About 200 words a minute: 75 words is well under 30 seconds.
      expect(words, node).toBeLessThanOrEqual(75);
    }
  });

  it("links back to the lesson right before it on the path the student walks, except the unit's first", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      expect(priming.bridge.node, node).toBe(previousOnPath(node));
    }
  });

  it("walks the path, not the array: skipped branches and quizzes are never the last lesson", () => {
    // The unit's first lesson has nothing before it.
    expect(previousOnPath("u1-allylic")).toBeNull();
    // A spine lesson after an optional branch links to the spine lesson before
    // the branch, not the branch (and not the stage quiz between them).
    expect(previousOnPath("u1-12v14")).toBe("u1-rank-anion");
    expect(previousOnPath("u1-mo")).toBe("u1-x2");
    // A branch links to the node it hangs off.
    expect(previousOnPath("u1-rank-radical")).toBe("u1-rank-anion");
    expect(previousOnPath("u1-nbs")).toBe("u1-x2");
    expect(previousOnPath("u1-nbs-practice")).toBe("u1-nbs");
    expect(previousOnPath("u1-ied")).toBe("u1-da");
    // No spine lesson's bridge is ever an optional branch.
    for (const node of LESSONS) {
      if (node.kind !== "spine") continue;
      const back = previousOnPath(node.id);
      if (back === null) continue;
      expect(LESSONS.find((n) => n.id === back)?.kind, `${node.id} -> ${back}`).toBe("spine");
    }
  });
});

describe("shown once per visit, not on retries", () => {
  it("opens on a first visit only", () => {
    expect(opensOnPreview("u1-kvt", { challenge: false, seenThisSession: false })).toBe(true);
    expect(opensOnPreview("u1-kvt", { challenge: false, seenThisSession: true })).toBe(false);
    expect(opensOnPreview("u1-kvt", { challenge: true, seenThisSession: false })).toBe(false);
    expect(opensOnPreview("u1-quiz-a", { challenge: false, seenThisSession: false })).toBe(false);
  });

  it("does not open a Challenge run on the preview", () => {
    const html = renderToStaticMarkup(createElement(BeatRunner, { node: "u1-kvt", onExit: () => {}, challenge: true }));
    expect(html).not.toContain("data-preview");
  });
});

describe("the recap marks the guess", () => {
  it("says right for the correct option and gives the answer for any other, with the lesson's own why", () => {
    for (const node of Object.keys(U1_PRIMING)) {
      const guess = guessFor(node);
      if (guess === null) continue;
      const correct = guess.options.find((option) => option.id === guess.correctOptionId)!;
      for (const option of guess.options) {
        const payoff = guessPayoff(node, option.id)!;
        expect(payoff.right, `${node}: ${option.id}`).toBe(option.id === correct.id);
        expect(payoff.answer).toBe(correct.text);
        expect(payoff.chosen).toBe(option.text);
        expect(payoff.why.length, `${node}: no why`).toBeGreaterThan(0);
        expect(quotableText(primingSources(node).get(guess.id)!), node).toContain(payoff.why);
      }
      expect(guessPayoff(node, "no-such-option")).toBeNull();
    }
  });
});

describe("the prediction revisit marks the yes or no (owner, queue item 17)", () => {
  it("is right exactly when 'still agree' matches whether the prediction was right, with the lesson's answer and why", () => {
    for (const node of Object.keys(U1_PRIMING)) {
      const guess = guessFor(node);
      if (guess === null) continue;
      for (const option of guess.options) {
        const payoff = guessPayoff(node, option.id)!;
        for (const stillAgree of [true, false]) {
          const verdict = revisitVerdict(node, option.id, stillAgree)!;
          expect(verdict.right, `${node}: ${option.id} agree=${stillAgree}`).toBe(stillAgree === payoff.right);
          expect(verdict.predictionRight).toBe(payoff.right);
          expect(verdict.answer).toBe(payoff.answer);
          expect(verdict.why).toBe(payoff.why);
        }
      }
      expect(revisitVerdict(node, "no-such-option", true)).toBeNull();
    }
  });

  it("names each of the four cases in its own words", () => {
    const guess = guessFor("u1-kvt")!;
    const wrong = guess.options.find((option) => option.id !== guess.correctOptionId)!;
    expect(revisitVerdict("u1-kvt", guess.correctOptionId, true)!.title).toBe("You called it!");
    expect(revisitVerdict("u1-kvt", guess.correctOptionId, false)!.title).toBe("Your first call was right");
    expect(revisitVerdict("u1-kvt", wrong.id, true)!.title).toBe("Not quite");
    expect(revisitVerdict("u1-kvt", wrong.id, false)!.title).toBe("Right to change your mind!");
  });
});

describe("the map rebuilt at the end starts scrambled", () => {
  it("lays the chips out of order, each idea exactly once", () => {
    for (const [node, priming] of Object.entries(U1_PRIMING)) {
      const order = mapPoolOrder(priming.ideas);
      expect([...order].sort((a, b) => a - b), node).toEqual(priming.ideas.map((_, index) => index));
      expect(order, `${node}: the chips start in the answer order`).not.toEqual(priming.ideas.map((_, index) => index));
    }
  });
});
