/**
 * The guidebook drafts, over the REAL map.
 *
 * The check that carries the weight: every draft this generator can produce
 * is marked placeholder, because DESIGN-GOALS makes the copy a human-gate
 * deliverable and a draft that can pass as authored is the promotion
 * CLAUDE.md's feedback section forbids. The rest is format: the goals lock a
 * numbered worked-example strip, so the numbering is asserted consecutive
 * from 1, and the key idea must be the node's own authored blurb rather than
 * generated chemistry, which is the line between placeholder layout and
 * placeholder claims.
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { guidebookFor } from "../pathway-sheet/guidebookContent";
import { takeawayFor } from "../pathway-sheet/takeaways";
import { HUMAN_GATE_MARK, type SheetNode } from "../pathway-sheet/nodeSheetModel";

/** Every node on the owner's map, shaped the way the sheet receives one. */
function allNodes(): SheetNode[] {
  const nodes: SheetNode[] = [];
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      nodes.push({
        id: node.id,
        kind: node.kind,
        state: "open",
        title: node.title,
        blurb: node.blurb,
        practiceHref: node.playable === undefined ? null : "#/x",
      });
    }
  }
  return nodes;
}

describe("guidebookFor, over all map nodes", () => {
  const nodes = allNodes();

  it("walks the real inventory, not a toy fixture", () => {
    expect(nodes.length).toBeGreaterThan(100);
  });

  it("every draft is marked placeholder and carries the gate mark", () => {
    for (const node of nodes) {
      const content = guidebookFor(node);
      expect(content.placeholder, node.id).toBe(true);
      expect(content.gateMark, node.id).toBe(HUMAN_GATE_MARK);
    }
  });

  it("titles the page with the node and keys the callout to the authored blurb", () => {
    for (const node of nodes) {
      const content = guidebookFor(node);
      expect(content.title, node.id).toBe(node.title);
      // The one chemistry sentence in a draft is the map's own authored line.
      // A generated chemistry claim here would be wrong on some node.
      // CHANGED 2026-10-07, owner whiteboard 2026-09-29: a node with a takeaway
      // (pathway-sheet/takeaways.ts, the owner's own draft line) shows that
      // instead, marked as a draft on the card; every other node is unchanged.
      const takeaway = takeawayFor(node.id);
      expect(content.keyIdea, node.id).toBe(takeaway?.text ?? node.blurb);
      expect(content.keyIdeaDraft, node.id).toBe(takeaway !== null);
      expect(content.intro, node.id).toContain(node.title);
    }
  });

  it("numbers the worked example consecutively from 1, over five drawn structures", () => {
    // Re-specified against the reference after the attempt 2 critic measured
    // the worked-example card: it is ART DOMINANT, one caption line over a
    // FIVE structure scheme, not six caption lines over three rings. The
    // numbering rule the goals lock ("numbered worked-example strip") is
    // unchanged and now rides the scheme's own structures.
    for (const node of nodes) {
      const worked = guidebookFor(node).workedExample;
      expect(worked.scheme.length, node.id).toBe(5);
      expect(worked.lead.length, node.id).toBeGreaterThan(0);
      worked.scheme.forEach((step, i) => {
        expect(step.n, `${node.id} step ${i}`).toBe(i + 1);
        // Every step is describable: the scheme is one labelled graphic and
        // this is the sentence a screen reader hears for this structure.
        expect(step.said.length, `${node.id} step ${i}`).toBeGreaterThan(0);
        // The first structure has no arrow leading into it, so no label.
        expect(step.overArrow === null, `${node.id} step ${i}`).toBe(i === 0);
      });
    }
  });

  it("the scheme asserts no chemistry a draft has not earned", () => {
    // A fabricated reagent or byproduct on a nomenclature node is wrong
    // chemistry, and wrong chemistry in a draft is still wrong chemistry. So
    // the arrow labels are step numbers and the byproduct term is neutral.
    const FORMULA = /(H2O|H2SO4|HNO3|O3|NaOH|Br2|HCl|NH3|CO2)/i;
    for (const node of nodes.slice(0, 40)) {
      const worked = guidebookFor(node).workedExample;
      for (const step of worked.scheme) {
        if (step.overArrow !== null) {
          expect(step.overArrow, node.id).toMatch(/^[1-9]$/);
        }
      }
      expect(worked.byproduct ?? "", node.id).not.toMatch(FORMULA);
    }
  });

  it("badges by kind, distinctly", () => {
    const badges = new Set(
      (["spine", "branch", "gate", "boss"] as const).map(
        (kind) => guidebookFor({ id: "x", kind, state: "open", title: "T", blurb: "B", practiceHref: null }).badge,
      ),
    );
    expect(badges.size).toBe(4);
  });

  it("holds the voice: no scolding, no rhetorical questions, no em dashes", () => {
    for (const node of nodes.slice(0, 30)) {
      const content = guidebookFor(node);
      const copy = [
        content.intro,
        content.workedExample.lead,
        ...content.workedExample.scheme.map((step) => step.said),
        // The page's closing line, which is where the method copy lives now
        // that the fourth checklist card is gone (see guidebookContent.ts's
        // `closing`: the reference ends on a mascot block, not a card).
        content.closing.line,
      ].join(" ");
      expect(copy).not.toContain("?");
      expect(copy.toLowerCase()).not.toContain("you should have");
      expect(copy).not.toMatch(/\u2014/);
    }
  });
});

describe("the Background section, owner amendment 2026-09-29", () => {
  const sheet = (id: string): SheetNode => {
    const node = PATHWAY_UNITS.flatMap((unit) => unit.nodes).find((entry) => entry.id === id)!;
    return { id, kind: node.kind, state: "open", title: node.title, blurb: node.blurb, practiceHref: null };
  };
  const topics = (id: string) => guidebookFor(sheet(id)).background.map((topic) => topic.id);

  it("attaches the whiteboard's three clips where it put them, and no R/S or E/Z", () => {
    expect(topics("u1-allylic")).toEqual(["bg-cation-stability", "bg-homo-lumo"]);
    for (const id of ["u1-rank-cation", "u1-rank-anion", "u1-rank-radical", "u1-quiz-a", "u1-12v14", "u1-hx-dienes"]) {
      expect(topics(id), id).toEqual(["bg-cation-stability"]);
    }
    for (const id of ["u1-mo", "u1-da", "u1-dienes", "u1-dienophiles", "u1-da-predict", "u1-da-stereo", "u1-da-3d", "u1-quiz-d"]) {
      expect(topics(id), id).toEqual(["bg-homo-lumo", "bg-fmo"]);
    }
    expect(topics("u1-kvt")).toEqual([]);
    const all = PATHWAY_UNITS.flatMap((unit) => unit.nodes).flatMap((node) => node.backgroundTopics ?? []);
    for (const topic of all) expect(topic.title, topic.id).not.toMatch(/R\/S|E\/Z/);
  });

  it("gives A1 a draft key idea from its takeaway", () => {
    const page = guidebookFor(sheet("u1-allylic"));
    expect(page.keyIdea).toBe(takeawayFor("u1-allylic")!.text);
    expect(page.keyIdeaDraft).toBe(true);
    expect(page.placeholder).toBe(true);
  });
});
