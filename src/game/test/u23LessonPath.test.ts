/**
 * Units 2 and 3 in the Unit 1 lesson shape (content/u23/*, content/lessonChain.ts):
 * every lesson names what it teaches and assumes, every assumption has a teacher
 * earlier on the path, the walk-through quotes are real, the read-along drawings
 * resolve, and a stuck student gets the "earlier lessons" path across units.
 */
import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { U2_POOLS } from "../content/u2";
import { U2T_POOLS } from "../content/u2tools";
import { U2E_POOLS } from "../content/u2energy";
import { U3_POOLS } from "../content/u3";
import { CHAIN_LINKS, chainTeacherOf } from "../content/lessonChain";
import { U23_EXPLAINERS, U23_VIDEO_SLOTS, U23_WALKTHROUGHS } from "../content/u23/lessonPath";
import { filmingScriptFor, helpPathFor } from "../content/u1/lessonPath";
import { readAlongVisual } from "../beats/readAlongDrawing";
import { primingFor } from "../beats/priming";
import { weakPrerequisites } from "../beats/difficulty";

const UNITS = PATHWAY_UNITS.filter((u) => u.id === "u2" || u.id === "u3");
const NODES = UNITS.flatMap((u) => u.nodes);
const ORDER = PATHWAY_UNITS.flatMap((u) => u.nodes.map((n) => n.id));
const ENTRY = new Map<string, { node: string; explanation: string }>();
for (const pools of [U2_POOLS, U2T_POOLS, U2E_POOLS, U3_POOLS]) for (const [node, entries] of Object.entries(pools)) for (const e of entries) ENTRY.set(e.id, { node, explanation: e.explanation });

const LINKED = NODES.filter((n) => n.id in CHAIN_LINKS && !(n.id.startsWith("u1")));

describe("the Unit 2 and 3 lesson chain", () => {
  it("links every playable Unit 2 gate and every Unit 3 lesson with a pool, and only real nodes", () => {
    for (const id of Object.keys(CHAIN_LINKS)) expect(ORDER, id).toContain(id);
    for (const node of NODES) {
      if (node.kind === "branch" && node.playable === undefined) continue; // the empty branch stubs
      if (node.id === "u3-exam") continue;
      expect(CHAIN_LINKS[node.id], node.id).toBeDefined();
    }
  });

  it("has one teacher for each concept, and every assumption is taught earlier or in Unit 0", () => {
    const seen = new Map<string, string>();
    for (const [node, link] of Object.entries(CHAIN_LINKS)) {
      expect(link.teaches.length, node).toBeGreaterThan(0);
      for (const concept of link.teaches) {
        expect(seen.has(concept), `${concept} taught twice`).toBe(false);
        seen.set(concept, node);
      }
    }
    for (const [node, link] of Object.entries(CHAIN_LINKS)) {
      for (const concept of link.assumes) {
        if (concept.startsWith("u0:")) continue;
        const teacher = chainTeacherOf(concept);
        expect(teacher, `${node} assumes ${concept}, which nobody teaches`).not.toBeNull();
        expect(ORDER.indexOf(teacher!), `${node} assumes ${concept} from ${teacher}, which comes later`).toBeLessThan(ORDER.indexOf(node));
      }
    }
  });

  it("never makes a main-line lesson depend on a side quest", () => {
    for (const node of LINKED) {
      if (node.kind === "branch") continue;
      for (const concept of CHAIN_LINKS[node.id]!.assumes) {
        const teacher = chainTeacherOf(concept);
        if (teacher === null) continue;
        const kind = PATHWAY_UNITS.flatMap((u) => u.nodes).find((n) => n.id === teacher)?.kind;
        expect(kind, `${node.id} needs ${teacher}`).not.toBe("branch");
      }
    }
  });

  it("recalls EWG/EDG, resonance and the arenium cation in Unit 3 by naming their lessons", () => {
    expect(CHAIN_LINKS["u3-directing"]!.assumes).toEqual(expect.arrayContaining(["u3:arenium", "u2:donor-withdrawer"]));
    expect(CHAIN_LINKS["u3-arenium"]!.assumes).toContain("u2:ring-resonance");
    for (const id of ["u3-halo", "u3-nitration", "u3-sulfo"]) expect(CHAIN_LINKS[id]!.assumes, id).toEqual(expect.arrayContaining(["u3:arenium", "u3:directing"]));
  });
});

describe("the Unit 2 and 3 walk-throughs", () => {
  it("copy every quote from a pool explanation of this lesson or an earlier one", () => {
    for (const [node, steps] of Object.entries(U23_WALKTHROUGHS)) {
      expect(steps.length, node).toBeGreaterThanOrEqual(2);
      expect(steps.length, node).toBeLessThanOrEqual(4);
      for (const step of steps) {
        const source = ENTRY.get(step.source);
        expect(source, `${node}: ${step.source} is not a Unit 2 or 3 pool entry`).toBeDefined();
        expect(ORDER.indexOf(source!.node), `${node} cites ${step.source} from a later lesson`).toBeLessThanOrEqual(ORDER.indexOf(node));
        expect(source!.explanation, `${node}: "${step.quote}" is not in ${step.source}`).toContain(step.quote);
        expect(step.text.length, step.title).toBeGreaterThan(10);
        expect(step.text, step.title).not.toMatch(/\?|—/);
      }
    }
  });

  it("cover every main-line lesson in the chain", () => {
    for (const node of LINKED) if (node.kind !== "branch" && node.id !== "u2-nomen") expect(U23_WALKTHROUGHS[node.id], node.id).toBeDefined();
  });
});

describe("the Unit 2 and 3 read-alongs", () => {
  it("cover every video gate and every Unit 3 main-line lesson, with 3 to 6 short cards", () => {
    for (const node of NODES) {
      if (node.id === "u3-exam" || (node.role !== "video" && !(node.kind === "spine" && node.id.startsWith("u3")))) continue;
      const ex = U23_EXPLAINERS[node.id];
      expect(ex, node.id).toBeDefined();
      expect(ex!.cards.length, node.id).toBeGreaterThanOrEqual(3);
      expect(ex!.cards.length, node.id).toBeLessThanOrEqual(6);
    }
  });

  it("start with why, stay short, avoid em dashes, and lean only on what the lesson assumes or teaches", () => {
    for (const [node, ex] of Object.entries(U23_EXPLAINERS)) {
      const link = CHAIN_LINKS[node]!;
      expect(link, node).toBeDefined();
      for (const concept of ex.uses) expect([...link.assumes, ...link.teaches], `${node} uses ${concept}`).toContain(concept);
      for (const card of ex.cards) {
        expect(card.body.length, `${node} / ${card.heading}`).toBeLessThanOrEqual(320);
        expect(`${card.heading} ${card.body}`, node).not.toMatch(/—|calculator/i);
      }
    }
  });

  it("only draw questions the lesson already draws, and each drawing resolves", () => {
    for (const [node, ex] of Object.entries(U23_EXPLAINERS)) {
      for (const card of ex.cards) {
        if (card.draw === undefined) continue;
        for (const ref of card.draw) {
          if (!("beat" in ref)) continue;
          const source = ENTRY.get(ref.beat);
          expect(source, `${node}: ${ref.beat}`).toBeDefined();
          expect(ORDER.indexOf(source!.node), `${node} draws ${ref.beat} from a later lesson`).toBeLessThanOrEqual(ORDER.indexOf(node));
        }
        expect(readAlongVisual(card.draw), `${node} / ${card.heading}`).not.toBeNull();
      }
    }
  });
});

describe("the video slots and filming scripts", () => {
  it("give every explainer a slot, none filmed, and a script built from its cards", () => {
    for (const node of Object.keys(U23_EXPLAINERS)) {
      const slot = U23_VIDEO_SLOTS[node];
      expect(slot, node).toBeDefined();
      expect(slot!.status).toBe("not-filmed");
      expect(slot!.shows.length).toBeGreaterThanOrEqual(3);
      const script = filmingScriptFor(node);
      expect(script, node).not.toBeNull();
      expect([script!.opening, ...script!.shots.flatMap((s) => s.say), script!.closing], node).toEqual(U23_EXPLAINERS[node]!.cards.map((c) => c.body));
    }
  });
});

describe("the need-help path across units", () => {
  it("sends a stuck Unit 3 student back to the Unit 2 and Unit 3 lessons that teach what it assumes", () => {
    const rows = helpPathFor("u3-directing");
    expect(rows[0]?.kind).toBe("explainer");
    expect(rows.at(-1)?.kind).toBe("guide");
    const replays = rows.flatMap((row) => (row.kind === "replay" ? [row.node] : []));
    expect(replays).toEqual(["u3-arenium", "u2-ewg-edg", "u2-induction"]);
  });

  it("reaches Unit 1 from the arenium lesson and Unit 0 from the first Unit 2 lesson", () => {
    expect(helpPathFor("u3-arenium").flatMap((row) => (row.kind === "replay" ? [row.node] : []))).toContain("u1-rank-cation");
    expect(helpPathFor("u2-induction").some((row) => row.kind === "unit0")).toBe(true);
  });

  it("flags a weak earlier lesson for a Unit 3 node, as Unit 1 does", () => {
    const journal = [
      { kind: "node_cleared", at: "2026-10-01T12:00:00.000Z", tz: "America/New_York", nodeId: "u3-arenium", nodeKind: "concept", flawless: false, stepsInOneSitting: 4, spine: true, difficulty: 2, cleared: 2 },
    ] as unknown as Parameters<typeof weakPrerequisites>[0];
    expect(weakPrerequisites(journal, "u3-directing")).toEqual(["u3-arenium"]);
    expect(weakPrerequisites(journal, "u3-birch")).toEqual([]);
  });
});

describe("the previews", () => {
  it("now cover every Unit 2 gate and every Unit 3 lesson that plays", () => {
    for (const node of NODES) {
      if (node.id === "u3-exam" || node.playable === undefined) continue;
      if (node.id === "u2-nomen" || node.id === "u2-nomen-priority") continue;
      expect(primingFor(node.id), node.id).not.toBeNull();
    }
  });
});
