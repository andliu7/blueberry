/**
 * The node sheet's model: which card is pressable, and what the words are.
 *
 * What matters here is the availability MATRIX (queued beats locked in the
 * copy, the challenge waits for a first clear) and the voice contract from
 * CLAUDE.md's feedback section: a coach on the student's side, no scolding
 * constructions, no rhetorical questions. The matrix runs over every state
 * and kind rather than a couple of hand picked cells, because the cell nobody
 * wrote is the one a student finds.
 */

import { describe, expect, it } from "vitest";
import {
  HUMAN_GATE_MARK,
  PIP_COUNT,
  difficultyFor,
  nodeSheetModel,
  type SheetNode,
  type SheetNodeKind,
  type SheetNodeState,
} from "../pathway-sheet/nodeSheetModel";

const KINDS: readonly SheetNodeKind[] = ["spine", "branch", "gate", "boss"];
const STATES: readonly SheetNodeState[] = ["done", "current", "open", "review", "locked"];

function node(over: Partial<SheetNode> = {}): SheetNode {
  return {
    id: "u3-nitration",
    kind: "spine",
    state: "current",
    title: "Nitration",
    blurb: "HNO₃/H₂SO₄, electrophile NO₂⁺.",
    practiceHref: "#/lesson/u3-nitration",
    ...over,
  };
}

describe("practice availability", () => {
  it("is pressable in every unlocked state with content", () => {
    for (const state of ["done", "current", "open", "review"] as const) {
      const model = nodeSheetModel(node({ state }));
      expect(model.practice.enabled, state).toBe(true);
      expect(model.practice.note, state).toBe("");
    }
  });

  it("is not pressable when locked, and the note names the unit gate", () => {
    const model = nodeSheetModel(node({ state: "locked" }));
    expect(model.practice.enabled).toBe(false);
    expect(model.practice.note).toContain("unit before");
  });

  it("a queued node is described as being written, never as failed progress", () => {
    // The authoring queue is our problem, not the student's: the copy must
    // say the content is coming, and must not mention locks or units at all.
    for (const state of STATES) {
      const model = nodeSheetModel(node({ state, practiceHref: null }));
      expect(model.practice.enabled, state).toBe(false);
      expect(model.practice.note.toLowerCase(), state).toContain("writing");
      expect(model.practice.note.toLowerCase(), state).not.toContain("lock");
      expect(model.practice.note.toLowerCase(), state).not.toContain("unit");
    }
  });
});

describe("challenge availability", () => {
  it("opens only after a first clear", () => {
    expect(nodeSheetModel(node({ state: "done" })).challenge.enabled).toBe(true);
    expect(nodeSheetModel(node({ state: "review" })).challenge.enabled).toBe(true);
    for (const state of ["current", "open", "locked"] as const) {
      const model = nodeSheetModel(node({ state }));
      expect(model.challenge.enabled, state).toBe(false);
      expect(model.challenge.note.length, state).toBeGreaterThan(0);
    }
  });

  it("never opens on a node whose practice is unavailable", () => {
    for (const state of STATES) {
      expect(nodeSheetModel(node({ state, practiceHref: null })).challenge.enabled, state).toBe(false);
    }
  });
});

describe("difficulty pips", () => {
  /*
   * THE OLD PIN, AND WHY IT IS GONE. This block used to assert the by-kind
   * default (spine 2, branch 2, gate 3, boss 4). That default is the bug the
   * owner reported: every spine and branch node showed the same two pips, so
   * the row ranked nothing. The pin goes because the behaviour goes, not to
   * make anything pass. What replaces it: the assertion below that an
   * unmeasured node draws no row at all, and test/nodeDifficulty.test.ts,
   * which recomputes the real numbers from the corpus and fails on drift.
   */
  it("has no default: an unmeasured node draws no difficulty row at all", () => {
    for (const kind of KINDS) {
      expect(difficultyFor(node({ kind })), kind).toBeNull();
      expect(nodeSheetModel(node({ kind })).pips, kind).toBeNull();
    }
  });

  it("clamps an out-of-range measured value instead of blanking the sheet", () => {
    expect(difficultyFor(node({ difficulty: 0 }))).toBe(1);
    expect(difficultyFor(node({ difficulty: 99 }))).toBe(PIP_COUNT);
    expect(difficultyFor(node({ difficulty: 2.4 }))).toBe(2);
  });

  it("fills within the row and labels the whole row once", () => {
    for (let measured = 1; measured <= PIP_COUNT; measured += 1) {
      const pips = nodeSheetModel(node({ difficulty: measured })).pips;
      expect(pips, `${measured}`).not.toBeNull();
      expect(pips?.total, `${measured}`).toBe(PIP_COUNT);
      expect(pips?.filled, `${measured}`).toBe(measured);
      expect(pips?.label, `${measured}`).toBe(`Difficulty ${measured} of ${PIP_COUNT}`);
    }
  });
});

describe("the cleared flag and the labels", () => {
  it("marks done and review as cleared, nothing else", () => {
    for (const state of STATES) {
      expect(nodeSheetModel(node({ state })).cleared, state).toBe(state === "done" || state === "review");
    }
  });

  it("names the node in the dialog and hamburger labels", () => {
    const model = nodeSheetModel(node());
    expect(model.label).toContain("Nitration");
    expect(model.guidebookLabel).toContain("guidebook");
    expect(model.guidebookLabel).toContain("Nitration");
  });

  it("gives each kind its own label", () => {
    const labels = new Set(KINDS.map((kind) => nodeSheetModel(node({ kind })).kindLabel));
    expect(labels.size).toBe(KINDS.length);
  });
});

describe("the voice", () => {
  it("no scolding, no rhetorical questions, anywhere the matrix can reach", () => {
    for (const kind of KINDS) {
      for (const state of STATES) {
        for (const practiceHref of ["#/lesson/x", null]) {
          const model = nodeSheetModel(node({ kind, state, practiceHref }));
          const copy = [model.practice.note, model.challenge.note, model.kindLabel, model.label].join(" ");
          expect(copy, `${kind}/${state}`).not.toContain("?");
          expect(copy.toLowerCase(), `${kind}/${state}`).not.toContain("you should");
          expect(copy.toLowerCase(), `${kind}/${state}`).not.toContain("you failed");
        }
      }
    }
  });

  it("the human gate mark carries no em dash, per CLAUDE.md", () => {
    expect(HUMAN_GATE_MARK).not.toMatch(/\u2014/);
  });
});
