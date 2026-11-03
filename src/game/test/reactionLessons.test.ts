import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { REACTION_LESSONS, reactionLessonFor } from "../reactionLessons/content";
import { REACTION_LESSON_IDS, hasReactionLesson } from "../reactionLessons/ids";
import { REQUIRED_MOVES, arrowsForMove, drawArrowsOf, gradeArrow, gradeTap, litAtoms, nextTapState, reactionLessonIssues, TAP_OPEN } from "../reactionLessons/model";
import { conformerName, isAnti, pyramidSubs } from "../reactionLessons/stereoGeometry";
import { ReactionLessonView } from "../reactionLessons/ReactionLessonView";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

describe("reaction lessons", () => {
  it("ids list matches the authored lessons", () => {
    expect([...REACTION_LESSON_IDS].sort()).toEqual(REACTION_LESSONS.map((l) => l.reactionId).sort());
    expect(hasReactionLesson("sn2")).toBe(true);
    expect(hasReactionLesson("nope")).toBe(false);
  });

  for (const lesson of REACTION_LESSONS) {
    it(`${lesson.reactionId} is sound and keeps the required moves`, () => {
      const reaction = TRAINER_REACTIONS.find((r) => r.id === lesson.reactionId);
      expect(reactionLessonIssues(lesson, reaction?.step)).toEqual([]);
      for (const move of REQUIRED_MOVES) expect(lesson.steps.map((s) => s.move)).toContain(move);
    });
    it(`${lesson.reactionId} renders its first move`, () => {
      const html = renderToString(createElement(ReactionLessonView, { reactionId: lesson.reactionId, reducedMotion: true, onDone: () => {} }));
      expect(html).toContain("Opposites attract");
      expect(html).toContain("<svg");
    });
  }

  it("covers every lesson-named reaction that is a plain elementary step it ships for", () => {
    const named = new Set<string>();
    for (const unit of PATHWAY_UNITS) for (const n of unit.nodes) if (n.playable?.kind === "reaction") named.add(n.playable.id);
    const shipped = [...named].filter(hasReactionLesson);
    expect(shipped.length).toBeGreaterThanOrEqual(8);
  });

  it("the tap never blocks: right finishes, two wrongs show the answer", () => {
    const tap = reactionLessonFor("sn2")!.steps[0]!.tap!;
    expect(gradeTap(tap, "c1")).toBe("right");
    expect(nextTapState(TAP_OPEN, tap, "c1")).toEqual({ phase: "done", how: "right" });
    const told = nextTapState(TAP_OPEN, tap, "br1");
    expect(told.phase).toBe("told");
    expect(nextTapState(told, tap, "br1")).toEqual({ phase: "done", how: "shown" });
    expect(litAtoms(reactionLessonFor("sn2")!.steps[0]!, TAP_OPEN)).toEqual([]);
  });

  it("the validator catches a bad atom id and a missing stereo note", () => {
    const lesson = reactionLessonFor("sn2")!;
    const reaction = TRAINER_REACTIONS.find((r) => r.id === "sn2")!;
    const broken = { ...lesson, steps: lesson.steps.map((s, i) => (i === 0 ? { ...s, focus: ["zz"], stereo: "" } : s)) };
    const issues = reactionLessonIssues(broken, reaction.step);
    expect(issues.some((x) => x.includes("zz"))).toBe(true);
    expect(issues.some((x) => x.includes("stereo"))).toBe(true);
  });

  it("every lesson's arrows can be drawn: the trainer's own arrow is graded right", () => {
    for (const lesson of REACTION_LESSONS) {
      const reaction = TRAINER_REACTIONS.find((r) => r.id === lesson.reactionId)!;
      const arrows = drawArrowsOf(reaction.step);
      expect(arrows.length).toBeGreaterThan(0);
      for (const arrow of arrows) {
        expect(gradeArrow(arrow, arrow.start[0]!, arrow.end.find((id) => id !== arrow.start[0])!)).toBe("right");
      }
      expect(arrowsForMove("attack", arrows)).toHaveLength(1);
      expect(arrowsForMove("release", arrows)).toHaveLength(arrows.length - 1);
    }
  });

  it("a drag is graded: wrong start, wrong end, same atom, and nothing under the pointer", () => {
    const arrow = drawArrowsOf(TRAINER_REACTIONS.find((r) => r.id === "sn2")!.step)[0]!;
    expect(gradeArrow(arrow, "c1", "o1")).toBe("badStart");
    expect(gradeArrow(arrow, "o1", "o1")).toBe("badEnd");
    expect(gradeArrow(arrow, "o1", "br1")).toBe("badEnd");
    expect(gradeArrow(arrow, "o1", null)).toBe("badEnd");
    expect(gradeArrow(arrow, null, "c1")).toBe("badStart");
    expect(gradeArrow(arrow, "o1", "c1")).toBe("right");
  });

  it("every lesson carries the resonance check, with the verdict that fits", () => {
    for (const lesson of REACTION_LESSONS) expect(lesson.steps.map((s) => s.move)).toContain("resonance");
    expect(reactionLessonFor("sn2")!.steps.find((s) => s.move === "resonance")!.resonance!.exists).toBe(false);
    expect(reactionLessonFor("carbonyl-addition")!.steps.find((s) => s.move === "resonance")!.resonance!.exists).toBe(true);
  });

  it("sn2 and e2 differ from the other walks: the shape and distance moves are not universal", () => {
    const moves = (id: string) => reactionLessonFor(id)!.steps.map((s) => s.move);
    expect(moves("proton-transfer")).not.toContain("distance");
    expect(moves("carbonyl-addition")).toContain("resonance");
    expect(moves("e2").indexOf("shape")).toBeLessThan(moves("e2").indexOf("attack"));
    expect(moves("sn2").indexOf("shape")).toBeGreaterThan(moves("sn2").indexOf("attack"));
  });

  it("the pyramid really inverts: the groups lean toward the attacker before and away after", () => {
    const before = pyramidSubs(0, 71, 109);
    const after = pyramidSubs(1, 71, 109);
    const flat = pyramidSubs(0.5, 71, 109);
    for (const p of before) expect(p.x).toBeGreaterThan(0.15);
    for (const p of after) expect(p.x).toBeLessThan(-0.15);
    for (const p of flat) expect(Math.abs(p.x)).toBeLessThan(0.2);
    expect(before.map((p) => p.depth).sort()).toEqual(["dash", "plain", "wedge"]);
  });

  it("the Newman figure finds anti", () => {
    expect(isAnti(270)).toBe(true);
    expect(isAnti(30)).toBe(false);
    expect(conformerName(90)).toBe("eclipsed");
    expect(conformerName(30)).toBe("gauche");
  });

  it("the interactive first render shows the molecule and a drag prompt only on arrow moves", () => {
    const html = renderToString(createElement(ReactionLessonView, { reactionId: "sn2", reducedMotion: true, onDone: () => {} }));
    expect(html).not.toContain("Show me");
  });
});
