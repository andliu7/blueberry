/**
 * Unit 1's lesson chain (content/u1/lessonPath.ts, lessonLinks.ts): lessons
 * build on each other, assume only what an earlier lesson taught, and every
 * stuck student has a path. Also the video slots and the new questions.
 */
import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { U1_POOLS } from "../content/u1";
import { readAlongVisual } from "../beats/readAlongDrawing";
import { U1_EXPLAINERS, U1_LINKS, U1_VIDEO_SLOTS, U1_WALKTHROUGHS, filmingScriptFor, helpPathFor, teacherOf } from "../content/u1/lessonPath";
import { U1_FIRST_STEPS, fadeFirst } from "../content/u1/workedFade";

const UNIT = PATHWAY_UNITS.find((one) => one.id === "u1")!;
const ORDER = UNIT.nodes.map((node) => node.id);
const ENTRY_NODE = new Map<string, { node: string; explanation: string }>();
for (const [node, entries] of Object.entries(U1_POOLS)) for (const e of entries) ENTRY_NODE.set(e.id, { node, explanation: e.explanation });

describe("the lesson chain", () => {
  it("only names lessons that exist on the unit's path", () => {
    for (const node of Object.keys(U1_LINKS)) expect(ORDER, node).toContain(node);
  });

  it("has one teacher for each concept, and no lesson teaches nothing", () => {
    const seen = new Map<string, string>();
    for (const [node, link] of Object.entries(U1_LINKS)) {
      expect(link.teaches.length, node).toBeGreaterThan(0);
      for (const concept of link.teaches) {
        expect(seen.has(concept), `${concept} taught twice`).toBe(false);
        seen.set(concept, node);
      }
    }
  });

  it("assumes only what an earlier lesson taught, or Unit 0", () => {
    for (const [node, link] of Object.entries(U1_LINKS)) {
      for (const concept of link.assumes) {
        if (concept.startsWith("u0:")) continue;
        const teacher = teacherOf(concept);
        expect(teacher, `${node} assumes ${concept}, which nobody teaches`).not.toBeNull();
        expect(ORDER.indexOf(teacher!), `${node} assumes ${concept} from ${teacher}, which comes later`).toBeLessThan(ORDER.indexOf(node));
      }
    }
  });

  it("never makes a spine lesson depend on a side quest", () => {
    for (const [node, link] of Object.entries(U1_LINKS)) {
      if (UNIT.nodes.find((one) => one.id === node)?.kind !== "spine") continue;
      for (const concept of link.assumes) {
        const teacher = teacherOf(concept);
        if (teacher !== null) expect(UNIT.nodes.find((one) => one.id === teacher)?.kind, `${node} needs ${teacher}`).toBe("spine");
      }
    }
  });
});

describe("the walk-throughs", () => {
  it("cover every spine lesson that teaches a procedure", () => {
    for (const node of UNIT.nodes) {
      if (node.kind !== "spine" || node.role === "quiz") continue;
      expect(U1_WALKTHROUGHS[node.id], node.id).toBeDefined();
    }
  });

  it("copy every quote from a pool explanation of this lesson or an earlier one", () => {
    for (const [node, steps] of Object.entries(U1_WALKTHROUGHS)) {
      expect(steps.length, node).toBeGreaterThanOrEqual(2);
      expect(steps.length, node).toBeLessThanOrEqual(4);
      for (const step of steps) {
        const source = ENTRY_NODE.get(step.source);
        expect(source, `${node}: ${step.source} is not a Unit 1 pool entry`).toBeDefined();
        expect(ORDER.indexOf(source!.node), `${node} cites ${step.source} from a later lesson`).toBeLessThanOrEqual(ORDER.indexOf(node));
        expect(source!.explanation, `${node}: "${step.quote}" is not in ${step.source}`).toContain(step.quote);
        expect(step.text.length, step.title).toBeGreaterThan(10);
        expect(step.text, step.title).not.toMatch(/\?|\u2014/);
      }
    }
  });
});

describe("the need-help path", () => {
  it("starts with the worked example, then the walk-through, and ends with the guide", () => {
    // CHANGED 3 Nov (Unit 1 review suggestion 1): practice lessons carry a worked example now.
    const rows = helpPathFor("u1-hx-dienes");
    expect(rows[0]?.kind).toBe("explainer");
    expect(rows[1]?.kind).toBe("walkthrough");
    expect(rows.at(-1)?.kind).toBe("guide");
  });

  it("points at the lessons the node assumes, nearest first", () => {
    const replays = helpPathFor("u1-hx-dienes").flatMap((row) => (row.kind === "replay" ? [row.node] : []));
    expect(replays).toEqual(["u1-energy-diagram", "u1-kvt", "u1-12v14"]);
  });

  it("offers Unit 0 for an assumption that lives there, and nothing for a quiz", () => {
    expect(helpPathFor("u1-allylic").some((row) => row.kind === "unit0")).toBe(true);
    expect(helpPathFor("u1-quiz-a")).toEqual([]);
  });
});

describe("the video slots", () => {
  it("give every video lesson a slot, none filmed, each with a script", () => {
    for (const node of UNIT.nodes) {
      if (node.role !== "video" || node.mentionOnly === true || node.kind === undefined) continue;
      if (!(node.id in U1_LINKS)) continue;
      expect(U1_VIDEO_SLOTS[node.id], node.id).toBeDefined();
    }
    for (const slot of Object.values(U1_VIDEO_SLOTS)) {
      expect(slot.status).toBe("not-filmed");
      expect(slot.shows.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("the filming scripts", () => {
  it("cover every slot, use every card once, and keep every shot spoken or on screen", () => {
    for (const node of Object.keys(U1_VIDEO_SLOTS)) {
      const script = filmingScriptFor(node);
      expect(script, node).not.toBeNull();
      const spoken = [script!.opening, ...script!.shots.flatMap((s) => s.say), script!.closing];
      expect(spoken, node).toEqual(U1_EXPLAINERS[node]!.cards.map((c) => c.body));
      expect(script!.shots.length, node).toBe(U1_VIDEO_SLOTS[node]!.shows.length);
      expect(script!.transcript.length, node).toBeGreaterThan(200);
    }
    expect(filmingScriptFor("u1-quiz-a")).toBeNull();
  });
});

describe("the added questions", () => {
  it("lift the thin video lessons above three questions and past rung 0", () => {
    for (const node of ["u1-kvt", "u1-12v14"]) {
      const levels = (U1_POOLS[node] ?? []).flatMap((e) => (e.item.kind === "mcq" ? [e.item.beat.levels?.[0] ?? 1] : []));
      expect(levels.length, node).toBeGreaterThanOrEqual(5);
      expect(Math.max(...levels), node).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("the read-along explainers", () => {
  it("cover every video lesson and the pi MO lesson, with 4 to 6 short cards", () => {
    for (const node of [...Object.keys(U1_VIDEO_SLOTS), "u1-mo"]) {
      const ex = U1_EXPLAINERS[node];
      expect(ex, node).toBeDefined();
      expect(ex!.cards.length, node).toBeGreaterThanOrEqual(4);
      expect(ex!.cards.length, node).toBeLessThanOrEqual(6);
      for (const card of ex!.cards) {
        expect(card.body.length, `${node}: ${card.heading}`).toBeLessThanOrEqual(320);
        expect(`${card.heading} ${card.body}`, `${node}: ${card.heading}`).not.toMatch(/—/);
      }
    }
  });

  it("lean only on ideas an earlier lesson taught, or Unit 0", () => {
    for (const [node, ex] of Object.entries(U1_EXPLAINERS)) {
      for (const concept of ex.uses) {
        if (concept.startsWith("u0:")) continue;
        const teacher = teacherOf(concept);
        expect(teacher, `${node} uses ${concept}`).not.toBeNull();
        expect(ORDER.indexOf(teacher!), `${node} uses ${concept} from ${teacher}`).toBeLessThan(ORDER.indexOf(node));
      }
      // The explainer may not lean on more than the lesson itself assumes.
      for (const concept of ex.uses) expect(U1_LINKS[node]!.assumes, `${node}`).toContain(concept);
    }
  });

  it("draw a structure beside at least two cards of every explainer, all by pointer", () => {
    for (const [node, ex] of Object.entries(U1_EXPLAINERS)) {
      const drawn = ex.cards.filter((c) => c.draw !== undefined);
      expect(drawn.length, node).toBeGreaterThanOrEqual(2);
      for (const card of drawn) {
        const visual = readAlongVisual(card.draw);
        expect(visual, `${node}: ${card.heading} resolves to a structure or a pair`).not.toBeNull();
        expect(card.draw!.length, `${node}: ${card.heading}`).toBeLessThanOrEqual(2);
        for (const ref of card.draw!) {
          if ("beat" in ref) {
            // A drawing from a later lesson would show something not yet taught.
            const home = ENTRY_NODE.get(ref.beat)?.node;
            expect(home, `${node}: ${ref.beat} is a pool question`).toBeDefined();
            expect(ORDER.indexOf(home!), `${node}: ${ref.beat} from ${home}`).toBeLessThanOrEqual(ORDER.indexOf(node));
          }
          if ("figure" in ref) expect(ref.name.length, `${node}: ${ref.figure} caption`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("opens the help path with the explainer when there is one", () => {
    expect(helpPathFor("u1-kvt")[0]?.kind).toBe("explainer");
    expect(helpPathFor("u1-rank-anion")[0]?.kind).toBe("explainer");
    expect(helpPathFor("u1-quiz-a")).toEqual([]);
  });

  // ADDED 3 Nov (Unit 1 review suggestion 1): one worked example per practice lesson, faded by its first step.
  it("gives every practice lesson the review named a worked example with a first step to fade", () => {
    for (const node of ["u1-rank-cation", "u1-rank-anion", "u1-rank-radical", "u1-energy-diagram", "u1-hx-dienes", "u1-x2", "u1-nbs-practice", "u1-da-predict", "u1-da-3d"]) {
      const ex = U1_EXPLAINERS[node];
      expect(ex?.worked, node).toBe(true);
      expect(ex!.cards.length, node).toBeGreaterThanOrEqual(4);
      expect(ex!.cards.length, node).toBeLessThanOrEqual(6);
      expect(U1_FIRST_STEPS[node]?.length ?? 0, node).toBeGreaterThan(10);
      expect(U1_FIRST_STEPS[node]!.length, node).toBeLessThanOrEqual(140);
      // The fade: the first question carries the step, the second does not.
      const two = fadeFirst(node, [{ brief: "a" }, { brief: "b" }]);
      expect(two[0]!.brief, node).toBe(`${U1_FIRST_STEPS[node]} a`);
      expect(two[1]!.brief, node).toBe("b");
      for (const card of ex!.cards) expect(card.body.length, `${node}: ${card.heading}`).toBeLessThanOrEqual(320);
    }
  });

  // ADDED 3 Nov (checker): a worked example that solved one of its own lesson's questions turned that
  // question into recall. A worked example now draws only its own worked-example figures, never a pool
  // question's drawing, and its first card's drawing is a problem no question in the lesson draws.
  it("solves a problem of its own in every worked example, not one of the lesson's questions", () => {
    for (const [node, ex] of Object.entries(U1_EXPLAINERS)) {
      if (ex.worked !== true) continue;
      for (const card of ex.cards) {
        for (const ref of card.draw ?? []) {
          expect("beat" in ref, `${node}: ${card.heading} draws a pool question`).toBe(false);
        }
      }
    }
  });

  // ADDED 3 Nov (Unit 1 review suggestion 5): one "you already know this" Orgo I callback per stage.
  it("opens each stage's first lesson with an Orgo I callback card", () => {
    for (const node of ["u1-allylic", "u1-kvt", "u1-nbs", "u1-mo"]) {
      expect(U1_EXPLAINERS[node]!.cards.some((c) => c.heading === "You already know this"), node).toBe(true);
    }
  });
});
