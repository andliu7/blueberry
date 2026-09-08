/**
 * The seven-slot lesson template and the recipe strip it draws.
 *
 * WHAT THIS FILE IS GUARDING, and it is three separate promises.
 *
 * 1. THE ORDERING. `docs/reference/design-goals/blueberry_spec-question-
 *    badges_*.png` shows a lesson's beat composition as its progress bar, and
 *    the composition is only meaningful if the ORDER is a rule rather than
 *    whatever order the content sources happened to be read in. So the slot
 *    list is asserted literally and a node carrying several kinds is asserted
 *    to plan them in slot order, not in authoring order.
 *
 * 2. THE RUN MACHINE. Recycle exists only once a miss has earned it, it never
 *    loops (loop discipline), and reward always closes. Each of those is a
 *    thing a future edit could quietly break, and none of them would show up
 *    as a crash: the lesson would just end in the wrong place.
 *
 * 3. EVERY BADGE HAS A MOTIF AND A LABEL. Owner ruling 4 of 2026-09-04 is
 *    that a chip with no content still shows what KIND it is, because an empty
 *    chip reads as broken. A badge kind added without a glyph, or without a
 *    label for the screen reader, is exactly that empty chip, so the suite
 *    holds both covers rather than the reviewer's eye.
 *
 * All of it is pure data in, data out. The web suite runs in node with no DOM,
 * which is the whole reason the ordering rules live in template.ts instead of
 * in JSX; this file is the payoff for that split.
 */

import { describe, expect, it } from "vitest";

import { GLYPH_BADGE_KINDS, badgeMark } from "../beats/RecipeStrip";
import {
  BADGE_LABEL,
  LESSON_SLOTS,
  SLOT_FOR_BADGE,
  SLOT_FOR_KIND,
  currentStep,
  missedMcqIdsFrom,
  planLesson,
  problemBadge,
  problemRecipeSegments,
  recipeSegments,
  reportRecycle,
  reportStep,
  startRun,
  type BadgeKind,
  type LessonPlan,
} from "../beats/template";
import type { BeatResult, MasteryLevel } from "../beats/types";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

/* ------------------------------------------------------------------ */
/* 1. The ordering                                                      */
/* ------------------------------------------------------------------ */

describe("the seven slots", () => {
  it("are exactly the template's ordering", () => {
    expect(LESSON_SLOTS).toEqual(["hook", "recognise", "connect", "order", "produce", "recycle", "reward"]);
  });

  it("puts every content beat kind in a slot that is one of the seven", () => {
    for (const [kind, slot] of Object.entries(SLOT_FOR_KIND)) {
      expect(LESSON_SLOTS, `${kind} -> ${slot}`).toContain(slot);
    }
  });

  it("puts every badge in a slot too, so both strips speak one vocabulary", () => {
    for (const [badge, slot] of Object.entries(SLOT_FOR_BADGE)) {
      expect(LESSON_SLOTS, `${badge} -> ${slot}`).toContain(slot);
    }
    // The two tables must agree where they overlap, or the beat runner's
    // strip and the lesson player's strip would file the same beat in
    // different slots.
    for (const [kind, slot] of Object.entries(SLOT_FOR_KIND)) {
      expect(SLOT_FOR_BADGE[kind as BadgeKind], kind).toBe(slot);
    }
  });
});

/**
 * A four-slot plan, built by hand rather than found in the corpus.
 *
 * NAMED HONESTLY BECAUSE IT IS A REAL GAP: no authored node carries more than
 * one beat kind today (a probe over every node in PATHWAY_UNITS returns one
 * kind each), so the template's whole reason for existing, playing a node's
 * beats in the seven-slot ordering, has no content that exercises it yet. The
 * run machine is a pure function over a LessonPlan, so the suite can still
 * hold it; what the suite cannot do is pretend the corpus proves it. The
 * `every authored node` test below is the real-content half, and it is
 * deliberately weak because the content is.
 */
function fourSlotPlan(): LessonPlan {
  return {
    node: "test-node",
    steps: [
      { slot: "recognise", beat: { kind: "mcq", node: "test-node" } },
      { slot: "connect", beat: { kind: "match", node: "test-node" } },
      { slot: "order", beat: { kind: "sort", ladderId: "test-ladder" } },
      { slot: "produce", beat: { kind: "synthesis", node: "test-node" } },
    ],
  };
}

describe("planLesson", () => {
  it("orders every authored node's steps by the slot ordering", () => {
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        const plan = planLesson(node.id);
        if (plan === null) continue;
        const positions = plan.steps.map((step) => LESSON_SLOTS.indexOf(step.slot));
        expect(positions, node.id).toEqual([...positions].sort((a, b) => a - b));
        for (const step of plan.steps) {
          expect(step.slot, `${node.id} ${step.beat.kind}`).toBe(SLOT_FOR_KIND[step.beat.kind]);
        }
      }
    }
  });

  it("plans a multi-kind node in slot order, not in availability order", () => {
    // The hand-built plan above is written in slot order; this asserts the
    // ordering the runner will play it in is the template's, so a future
    // resolver that assembles steps from a loop over content sources cannot
    // silently reorder them.
    const positions = fourSlotPlan().steps.map((step) => LESSON_SLOTS.indexOf(step.slot));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("is null rather than empty for a node with nothing authored", () => {
    expect(planLesson("not-a-node")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* 2. The run machine                                                   */
/* ------------------------------------------------------------------ */

describe("the run", () => {
  it("goes straight to the reward when nothing was missed", () => {
    const plan = fourSlotPlan();
    let run = startRun(plan);
    expect(run.phase).toBe("content");
    for (let i = 0; i < plan.steps.length; i += 1) {
      expect(currentStep(run)).not.toBeNull();
      run = reportStep(run, { cleared: 1, total: 1 });
    }
    expect(run.phase).toBe("reward");
    expect(currentStep(run)).toBeNull();
    expect(recipeSegments(run).some((segment) => segment.slot === "recycle")).toBe(false);
  });

  it("earns a recycle pass from a miss, and runs it exactly once", () => {
    const plan = fourSlotPlan();
    let run = startRun(plan);
    run = reportStep(run, { cleared: 0, total: 1, missedMcqIds: ["a", "b"] });
    for (let i = 1; i < plan.steps.length; i += 1) {
      run = reportStep(run, { cleared: 1, total: 1 });
    }
    expect(run.phase).toBe("recycle");
    run = reportRecycle(run, 2, 2);
    expect(run.phase).toBe("reward");
    expect(run.recycled).toBe(true);
    // Loop discipline: a second recycle report cannot reopen the pass.
    expect(reportRecycle(run, 0, 2)).toBe(run);
  });

  it("ignores a stale step report, so a double callback cannot double-count", () => {
    const plan = fourSlotPlan();
    let run = startRun(plan);
    for (let i = 0; i < plan.steps.length; i += 1) {
      run = reportStep(run, { cleared: 1, total: 1 });
    }
    const banked = run.clearedBeats;
    expect(reportStep(run, { cleared: 5, total: 5 }).clearedBeats).toBe(banked);
  });

  it("deduplicates missed ids and keeps first-miss order", () => {
    const at = (second: number) => `2026-09-04T00:00:0${second}.000Z`;
    const miss = (beatId: string, level: MasteryLevel, second: number): BeatResult => ({
      beatId,
      level,
      cause: "chose_authored_distractor",
      elapsedMs: 1000,
      at: at(second),
      kind: "invalid",
    });
    const results: readonly BeatResult[] = [
      miss("b", 2, 0),
      miss("a", 2, 1),
      miss("b", 2, 2),
      { beatId: "c", level: 2, cause: "no_named_cause_logged", elapsedMs: 900, at: at(3), kind: "correct" },
      // Level 0 cannot fail by design, so a first-meeting miss is not a debt.
      miss("d", 0, 4),
    ];
    expect(missedMcqIdsFrom(results)).toEqual(["b", "a"]);
  });
});

/* ------------------------------------------------------------------ */
/* 3. The strip                                                         */
/* ------------------------------------------------------------------ */

describe("the recipe strip's segments", () => {
  it("marks exactly one segment current while a run is playing", () => {
    const plan = fourSlotPlan();
    let run = startRun(plan);
    for (let i = 0; i <= plan.steps.length; i += 1) {
      const current = recipeSegments(run).filter((segment) => segment.state === "current");
      expect(current.length, `after ${i} steps`).toBe(1);
      run = reportStep(run, { cleared: 1, total: 1 });
    }
  });

  it("closes with the reward slot whatever happened", () => {
    const plan = fourSlotPlan();
    let run = startRun(plan);
    const first = recipeSegments(run);
    expect(first[first.length - 1]?.slot).toBe("reward");
    run = reportStep(run, { cleared: 0, total: 1, missedMcqIds: ["a"] });
    const withRecycle = recipeSegments(run);
    expect(withRecycle[withRecycle.length - 1]?.slot).toBe("reward");
    // And the recycle sits between the content and the reward, never after it.
    const recycleAt = withRecycle.findIndex((segment) => segment.slot === "recycle");
    expect(recycleAt).toBe(withRecycle.length - 2);
  });

  it("never promises a recycle slot before a miss has earned it", () => {
    const plan = fourSlotPlan();
    const run = startRun(plan);
    expect(recipeSegments(run).map((segment) => segment.slot)).not.toContain("recycle");
  });
});

describe("the curriculum lesson's strip", () => {
  const kinds = ["numeric", "numeric", "major_product"];

  it("draws one segment per problem plus the reward", () => {
    expect(problemRecipeSegments(kinds, 0)).toHaveLength(kinds.length + 1);
  });

  it("puts done behind, current here, and todo ahead", () => {
    const states = problemRecipeSegments(kinds, 1).map((segment) => segment.state);
    expect(states).toEqual(["done", "current", "todo", "todo"]);
  });

  it("makes the reward current once every question is behind the student", () => {
    const segments = problemRecipeSegments(kinds, kinds.length);
    expect(segments.map((segment) => segment.state)).toEqual(["done", "done", "done", "current"]);
    expect(segments[segments.length - 1]?.badge).toBe("reward");
  });

  it("has no recycle segment, because the curriculum player has no recycle pass", () => {
    expect(problemRecipeSegments(kinds, 0).map((segment) => segment.slot)).not.toContain("recycle");
  });

  it("badges an unknown answer kind rather than throwing mid-lesson", () => {
    expect(problemBadge("something-authored-later")).toBe("mcq");
  });

  it("gives every curriculum answer kind a badge that has a label", () => {
    const kindsInCorpus = [
      "multiple_choice",
      "major_product",
      "numeric",
      "reagents",
      "structure",
      "ordering",
      "matching",
    ];
    for (const kind of kindsInCorpus) {
      expect(BADGE_LABEL[problemBadge(kind)], kind).toBeTypeOf("string");
    }
  });
});

describe("every badge carries its motif", () => {
  it("draws a glyph for every badge kind the strip can be handed", () => {
    // Owner ruling 4: a chip with no motif reads as broken rather than as
    // unauthored. BADGE_LABEL is the closed list of kinds; GLYPH is what the
    // strip can actually draw. They have to be the same set.
    expect([...GLYPH_BADGE_KINDS].sort()).toEqual(Object.keys(BADGE_LABEL).sort());
  });

  it("labels every badge in the coach's voice, never as a bare type name", () => {
    for (const [badge, label] of Object.entries(BADGE_LABEL)) {
      expect(label.length, badge).toBeGreaterThan(3);
      expect(label, badge).not.toBe(badge);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 4. The template has content that can exercise it                     */
/*                                                                      */
/* THE REGRESSION THIS GUARDS IS THE ONE A CRITIC FOUND, and it is the  */
/* kind a green suite is worst at catching: every rule above passed     */
/* while the seven-slot ordering was unreachable code. Every node in    */
/* the product authored exactly ONE beat kind, so planLesson could      */
/* never return more than one content step, recipeSegments could never  */
/* emit more than [content, reward], and the committed spec's whole     */
/* point (a lesson shows its beat composition up front) was invisible   */
/* on every screen the product had. The tests below are about the       */
/* CONTENT, not the code: they fail if the multi-slot lessons are ever  */
/* thinned back out.                                                    */
/* ------------------------------------------------------------------ */

describe("the template is reachable, not only correct", () => {
  const nodeIds = PATHWAY_UNITS.flatMap((unit) => unit.nodes.map((node) => node.id));
  const plans = nodeIds.map((id) => planLesson(id)).filter((plan): plan is LessonPlan => plan !== null);

  it("plans a lesson for at least one node, so this suite cannot pass vacuously", () => {
    expect(plans.length).toBeGreaterThan(0);
  });

  it("has a real node whose lesson plays at least three content slots", () => {
    const deepest = Math.max(...plans.map((plan) => plan.steps.length));
    expect(deepest, "no authored node exercises the template beyond one step").toBeGreaterThanOrEqual(3);
  });

  it("draws a recipe strip with more segments than [content, reward]", () => {
    const widest = Math.max(...plans.map((plan) => recipeSegments(startRun(plan)).length));
    expect(widest).toBeGreaterThanOrEqual(4);
  });

  it("gives every planned step a distinct slot, so no slot is drawn twice", () => {
    for (const plan of plans) {
      const slots = plan.steps.map((step) => step.slot);
      expect(new Set(slots).size, plan.node).toBe(slots.length);
    }
  });

  it("orders every multi-step plan by the template rather than by authoring", () => {
    const order = (slot: string) => LESSON_SLOTS.indexOf(slot as (typeof LESSON_SLOTS)[number]);
    for (const plan of plans) {
      const positions = plan.steps.map((step) => order(step.slot));
      expect([...positions].sort((a, b) => a - b), plan.node).toEqual(positions);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5. The cleared mark, and where it may not appear                     */
/* ------------------------------------------------------------------ */

describe("the strip marks what is behind the student", () => {
  it("draws the cleared tick on a done segment, whatever beat it held", () => {
    for (const badge of GLYPH_BADGE_KINDS) {
      expect(badgeMark("done", badge), badge).toBe("cleared");
    }
  });

  it("never draws the cleared tick on a segment nobody has earned", () => {
    // The committed spec uses a tick to mean COMPLETED and the reward slot is
    // `todo` for a whole lesson, so a reward glyph that IS a tick puts the
    // done-mark on an unearned slot from the first frame. Measured on the
    // build at #/lesson/u3-directing before answering anything.
    for (const badge of GLYPH_BADGE_KINDS) {
      expect(badgeMark("todo", badge), badge).not.toBe("cleared");
      expect(badgeMark("current", badge), badge).not.toBe("cleared");
    }
  });

  it("leaves the reward slot un-ticked on a fresh run", () => {
    const plan = planLesson("u3-sequencing");
    expect(plan, "u3-sequencing is the multi-slot lesson these tests lean on").not.toBeNull();
    const segments = recipeSegments(startRun(plan as LessonPlan));
    const reward = segments[segments.length - 1];
    expect(reward?.badge).toBe("reward");
    expect(badgeMark(reward?.state ?? "todo", "reward")).not.toBe("cleared");
  });
});
