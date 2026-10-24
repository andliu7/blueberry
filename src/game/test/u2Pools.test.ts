/**
 * Unit 2 (aromaticity) draft pools (src/game/content/u2/pools.ts).
 *
 * WHAT IS PINNED, mirroring u1PoolsAb.test.ts: the pool contract in
 * content/u1/types.ts (every entry a placeholder, unique ids, an explanation
 * and a provenance on every entry), the easy MCQ authoring rules run
 * unchanged, the exact size of every node, the drawing invariants, the exam
 * set aside, and that Unit 2 merges with Unit 1 without a collision.
 *
 * WHAT IS NOT. The chemistry. scripts/u2_pools.py derives it (a Huckel
 * counter cross-checked by a Frost circle and compared with RDKit) and
 * refuses to write the file when an authored key disagrees.
 *
 * CONCEPT IDS. Unit 1 files only CONCEPTS ids. CONCEPTS has no aromaticity,
 * naming or NMR concept, so Unit 2 borrows exactly three TOPICS ids as
 * stand-ins (TOPIC_STAND_INS below), an open owner ruling. Any other id must
 * be a CONCEPTS id; a fourth topic id fails.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CONCEPTS, TOPICS } from "@blueberry/curriculum";
import { mcqAuthoringViolations } from "../beats/mcq/authoring";
import { figuresOf } from "../beats/mcq/mcqFigures";
import type { McqBeat } from "../beats/types";
import { U1_POOLS, mergePools } from "../content/u1";
import type { PoolEntry } from "../content/u1/types";
import { U2_EXAM_IDS, U2_OPTION_TILES, U2_PI_TALLY, U2_POOLS, U2_SORT_FIGURES, U2_VISUALS } from "../content/u2";
import { FIGURE_HEIGHT, FIGURE_WIDTH, type Figure } from "../onboarding/figures";

/**
 * CHANGED 2026-10-17 (wire piece, round 2): Hückel gains a match board and a drawing (5 to 7),
 * NMR a match board (4 to 5), Heterocycles a drawing (12 to 13), Charged two drawings (12 to 14).
 * CHANGED 2026-10-17 (wire piece, round 4): Charged, Annulenes and Heterocycles became seven-slot lessons,
 * so each opens on two new L0 worked examples (14 to 16, 12 to 14, 13 to 15).
 */
// CHANGED 2026-10-23 (content audit #7 and section 6): Hückel gains the Frost worked example, the cyclobutadiene
// Frost circle (moved from Annulenes) and two level 2 items (7 to 11); Charged one level 2 item (16 to 17);
// Annulenes lose the Frost circle and gain one level 2 item (14 stays 14); NMR two level 2 items (5 to 7).
const EXPECTED_SIZES: Readonly<Record<string, number>> = {
  "u2-huckel": 11,
  "u2-annulene": 14,
  "u2-hetero": 15,
  "u2-charged": 17,
  "u2-nmr": 7,
  "u2-nomen": 12,
};

// CHANGED 2026-10-17 (round 4): five lessons now, was Hückel and NMR only. Nomenclature stays the in-a-row set.
const LESSON_NODES = ["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr"];

const entries: readonly (readonly [string, PoolEntry])[] = Object.entries(U2_POOLS).flatMap(([node, pool]) =>
  pool.map((entry) => [node, entry] as const),
);

const mcqs: readonly McqBeat[] = entries.flatMap(([, entry]) => (entry.item.kind === "mcq" ? [entry.item.beat] : []));

/** The beat id and node of any pool item, whichever kind it is. */
function idAndNode(entry: PoolEntry): { readonly id: string; readonly node: string } {
  switch (entry.item.kind) {
    case "mcq":
      return { id: entry.item.beat.id, node: entry.item.beat.node };
    case "sort":
      return { id: entry.item.content.beat.id, node: entry.item.content.beat.node };
    case "match":
      return { id: entry.item.board.beatId, node: entry.item.board.node };
    case "draw": // pool kind added by U1-P3 (2026-10-17); Unit 2 writes four since round 2
      return { id: entry.item.beat.id, node: entry.item.beat.node };
  }
}

function conceptIdsOf(entry: PoolEntry): readonly string[] {
  if (entry.item.kind === "mcq") return entry.item.beat.conceptIds;
  if (entry.item.kind === "sort") return entry.item.content.beat.conceptIds;
  if (entry.item.kind === "draw") return entry.item.beat.conceptIds;
  return [];
}

function everyFigure(): readonly { readonly where: string; readonly figure: Figure }[] {
  const out: { where: string; figure: Figure }[] = [];
  for (const [id, visual] of Object.entries(U2_VISUALS)) {
    for (const { where, figure } of figuresOf(visual)) out.push({ where: `${id} ${where}`, figure });
  }
  for (const [id, tiles] of Object.entries(U2_OPTION_TILES)) {
    for (const [option, tile] of Object.entries(tiles)) out.push({ where: `${id}::${option}`, figure: tile.figure });
  }
  for (const [id, cards] of Object.entries(U2_SORT_FIGURES)) {
    for (const [card, tile] of Object.entries(cards)) out.push({ where: `${id}::${card}`, figure: tile.figure });
  }
  return out;
}

describe("u2 draft pools", () => {
  it("covers exactly the Unit 2 nodes, at the authored sizes", () => {
    const sizes = Object.fromEntries(Object.entries(U2_POOLS).map(([node, pool]) => [node, pool.length]));
    expect(sizes).toEqual(EXPECTED_SIZES);
  });

  it("marks every entry as a placeholder", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [, entry] of entries) expect(entry.placeholder, entry.id).toBe(true);
  });

  it("uses each id once, and keys every beat to the pool it sits in", () => {
    const seen = new Set<string>();
    for (const [node, entry] of entries) {
      expect(seen.has(entry.id), `${entry.id} appears twice`).toBe(false);
      seen.add(entry.id);
      expect(entry.id.startsWith("u2-"), entry.id).toBe(true);
      const beat = idAndNode(entry);
      expect(beat.id, entry.id).toBe(entry.id);
      expect(beat.node, entry.id).toBe(node);
    }
  });

  it("carries an explanation and a provenance naming the script and the OpenStax check on every entry", () => {
    for (const [, entry] of entries) {
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.provenance, entry.id).toContain("scripts/u2_pools.py");
      expect(entry.provenance, entry.id).toMatch(/OpenStax Organic Chemistry 15\.\d \(CC BY-NC-SA\), read as a check only/);
    }
  });

  it("passes the easy MCQ authoring rules, unchanged", () => {
    expect(mcqs.length).toBeGreaterThan(0);
    expect(mcqAuthoringViolations(mcqs)).toEqual([]);
  });

  // CHANGED 2026-10-17 (round 2): lessons were MCQ only; each now carries a match board (connect) and Hückel a
  // drawing (produce), so the kinds are pinned exactly and the MCQ rule below still holds for every MCQ.
  // CHANGED 2026-10-17 (round 4): the three former runs are pinned too, each with exactly two L0 worked examples.
  // CHANGED 2026-10-23 (content audit #7 and section 6): Hückel has three L0 worked examples (the Frost circle is
  // new), and every lesson has at least two level 2 items.
  // CHANGED 2026-10-24 (audit top-25 #1 landed): level 2 items are rung 2 only, was rung 1 and 2, which the
  // declared-rung lesson played at rung 1.
  it("gives each lesson its MCQs (its meet questions at L0, the rest at rung 1, two or more at rung 2) and its exact boards, ladders and drawings", () => {
    const WANT: Readonly<Record<string, Readonly<Record<string, number>>>> = {
      "u2-huckel": { mcq: 9, match: 1, draw: 1 },
      "u2-charged": { mcq: 13, sort: 2, draw: 2 },
      "u2-annulene": { mcq: 12, match: 1, sort: 1 },
      "u2-hetero": { mcq: 13, match: 1, draw: 1 },
      "u2-nmr": { mcq: 6, match: 1 },
    };
    const MEET: Readonly<Record<string, number>> = { "u2-huckel": 3 };
    for (const node of LESSON_NODES) {
      const pool = U2_POOLS[node] ?? [];
      const counts: Record<string, number> = {};
      for (const entry of pool) counts[entry.item.kind] = (counts[entry.item.kind] ?? 0) + 1;
      expect(counts, node).toEqual(WANT[node]);
      const levels = pool.flatMap((entry) => (entry.item.kind === "mcq" ? [entry.item.beat.levels] : []));
      const meet = MEET[node] ?? 2;
      const level2 = levels.filter((l) => l.length === 1 && l[0] === 2).length;
      expect(levels.filter((l) => l.length === 1 && l[0] === 0).length, node).toBe(meet);
      expect(level2, node).toBeGreaterThanOrEqual(2);
      expect(levels.filter((l) => l.length === 1 && l[0] === 1).length, node).toBe(levels.length - meet - level2);
    }
  });

  it("gives every practice run except the nomenclature branch a mix of kinds", () => {
    const kinds = (node: string) => new Set((U2_POOLS[node] ?? []).map((entry) => entry.item.kind));
    expect(kinds("u2-annulene").has("sort")).toBe(true);
    expect(kinds("u2-annulene").has("match")).toBe(true);
    expect(kinds("u2-hetero").has("match")).toBe(true);
    expect(kinds("u2-charged").has("sort")).toBe(true);
    // Added 2026-10-17 (round 2): a produce step in the runs that teach a new species.
    expect(kinds("u2-charged").has("draw")).toBe(true);
    expect(kinds("u2-hetero").has("draw")).toBe(true);
  });

  // Added 2026-10-17 (round 2): a run ends at 10 in a row, so a ladder, board or drawing authored at the end of
  // a pool was never met in normal play. u2_pools.py spreads them to positions 2, 4, 6 and 8.
  // CHANGED 2026-10-17 (round 2b), stricter: the old set allowed index 11, which a flawless run (stops at 10) never meets.
  it("puts every run's non-MCQ items where a run that stops at 10 in a row still meets them", () => {
    for (const node of ["u2-charged", "u2-annulene", "u2-hetero"]) {
      const pool = U2_POOLS[node] ?? [];
      const at = pool.flatMap((entry, i) => (entry.item.kind === "mcq" ? [] : [i]));
      expect(at.length, node).toBeGreaterThanOrEqual(2);
      for (const i of at) expect([2, 4, 6, 8], `${node} item ${i}`).toContain(i);
      for (const i of at) expect(i, `${node} item ${i} sits past a flawless run's stop`).toBeLessThan(10);
    }
  });

  it("does not park the answer in one position across the set", () => {
    const counts = new Map<number, number>();
    for (const beat of mcqs) {
      const index = beat.options.findIndex((option) => option.id === beat.correctOptionId);
      counts.set(index, (counts.get(index) ?? 0) + 1);
    }
    for (const [index, count] of counts) {
      expect(count, `index ${index} holds ${count} of ${mcqs.length}`).toBeLessThanOrEqual(mcqs.length / 2);
    }
  });

  it("files every item under CONCEPTS ids, plus only the three named topic stand-ins", () => {
    const TOPIC_STAND_INS = ["aromaticity", "iupac_nomenclature", "spectroscopy_nmr"];
    for (const id of TOPIC_STAND_INS) expect(Object.keys(TOPICS), id).toContain(id);
    const known = new Set([...Object.keys(CONCEPTS), ...TOPIC_STAND_INS]);
    for (const [, entry] of entries) {
      const ids = conceptIdsOf(entry);
      if (entry.item.kind !== "match") expect(ids.length, entry.id).toBeGreaterThan(0);
      for (const id of ids) expect(known.has(id), `${entry.id} ${id}`).toBe(true);
    }
  });

  it("has no em dash anywhere", () => {
    const all = JSON.stringify([U2_POOLS, U2_VISUALS, U2_OPTION_TILES, U2_SORT_FIGURES]);
    expect(all.includes(String.fromCharCode(0x2014))).toBe(false);
  });

  // CHANGED 2026-10-17 (round 2): 10 was below the owner's 12 item floor for Prodigy (run.ts POOL_SLACK), so the
  // checkpoint said "too few for Prodigy" and then paid Prodigy. Now 14, at least two from every lesson and run.
  it("sets aside 14 real exam ids from the runs and lessons, at least two from each, none from the nomenclature branch", () => {
    expect(U2_EXAM_IDS.length).toBe(14);
    expect(new Set(U2_EXAM_IDS).size).toBe(14);
    for (const node of ["u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-nmr"]) {
      const own = new Set((U2_POOLS[node] ?? []).map((entry) => entry.id));
      expect(U2_EXAM_IDS.filter((id) => own.has(id)).length, node).toBeGreaterThanOrEqual(2);
    }
    const nomen = new Set((U2_POOLS["u2-nomen"] ?? []).map((entry) => entry.id));
    const all = new Set(entries.map(([, entry]) => entry.id));
    for (const id of U2_EXAM_IDS) {
      expect(all.has(id), id).toBe(true);
      expect(nomen.has(id), id).toBe(false);
    }
  });

  it("merges with Unit 1 with no node or id collision", () => {
    expect(() => mergePools(U1_POOLS, U2_POOLS)).not.toThrow();
  });
});

describe("u2 sort ladders and match boards", () => {
  const sorts = entries.flatMap(([, entry]) => (entry.item.kind === "sort" ? [entry.item.content] : []));
  const boards = entries.flatMap(([, entry]) => (entry.item.kind === "match" ? [entry.item.board] : []));

  it("exist, so these blocks cannot pass vacuously", () => {
    expect(sorts.length).toBeGreaterThan(0);
    expect(boards.length).toBeGreaterThan(0);
  });

  it("render the order the judge grades against, with a reason on every card", () => {
    for (const content of sorts) {
      expect(content.beat.order, content.beat.id).toEqual(content.spec.correctOrder);
      for (const item of content.beat.items) expect(item.why?.trim(), `${content.beat.id}::${item.id}`).toBeTruthy();
    }
  });

  it("draw every sort card", () => {
    for (const content of sorts) {
      const drawn = U2_SORT_FIGURES[content.beat.id];
      expect(drawn, content.beat.id).toBeDefined();
      expect(Object.keys(drawn ?? {}).sort()).toEqual(content.beat.items.map((item) => item.id).sort());
    }
  });

  it("explain every pairing on every board", () => {
    for (const board of boards) {
      expect(Object.keys(board.whyByPrompt).length, board.beatId).toBe(board.answer.prompts.length);
      for (const why of Object.values(board.whyByPrompt)) expect(why.trim(), board.beatId).not.toBe("");
    }
  });
});

describe("u2 drawings", () => {
  it("give every MCQ a question drawing, and every tiled MCQ a full set of distinct, named options", () => {
    for (const beat of mcqs) {
      const visual = U2_VISUALS[beat.id];
      const tiles = U2_OPTION_TILES[beat.id];
      expect(visual, `${beat.id} would reach a student as prose`).toBeDefined();
      if (tiles !== undefined) {
        expect(Object.keys(tiles).sort(), beat.id).toEqual(beat.options.map((option) => option.id).sort());
        const drawn = Object.values(tiles).map((tile) => JSON.stringify(tile.figure));
        expect(new Set(drawn).size, `${beat.id} draws two options the same`).toBe(drawn.length);
        for (const tile of Object.values(tiles)) expect(tile.name, beat.id).toBeTruthy();
      }
    }
  });

  it("keys no drawing to a beat that does not exist", () => {
    const ids = new Set(mcqs.map((beat) => beat.id));
    for (const key of [...Object.keys(U2_VISUALS), ...Object.keys(U2_OPTION_TILES)]) expect(ids.has(key), key).toBe(true);
  });

  it("draws something in every figure, inside the viewBox, with no zero length bond", () => {
    const figures = everyFigure();
    expect(figures.length).toBeGreaterThan(0);
    for (const { where, figure } of figures) {
      const marks = (figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0);
      expect(marks, `${where} is empty`).toBeGreaterThan(0);
      for (const bond of figure.bonds ?? []) {
        for (const x of [bond.x1, bond.x2]) {
          expect(x, where).toBeGreaterThanOrEqual(0);
          expect(x, where).toBeLessThanOrEqual(FIGURE_WIDTH);
        }
        for (const y of [bond.y1, bond.y2]) {
          expect(y, where).toBeGreaterThanOrEqual(0);
          expect(y, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
        }
        expect(Math.hypot(bond.x2 - bond.x1, bond.y2 - bond.y1), where).toBeGreaterThan(1);
      }
      for (const ring of figure.rings ?? []) {
        expect(ring.x - ring.r, where).toBeGreaterThanOrEqual(0);
        expect(ring.x + ring.r, where).toBeLessThanOrEqual(FIGURE_WIDTH);
        expect(ring.y - ring.r, where).toBeGreaterThanOrEqual(0);
        expect(ring.y + ring.r, where).toBeLessThanOrEqual(FIGURE_HEIGHT);
      }
    }
  });
});

describe("u2 copy does not give the answer away", () => {
  it("never captions the question drawing with the right option's text", () => {
    for (const beat of mcqs) {
      const right = beat.options.find((option) => option.id === beat.correctOptionId)?.text.toLowerCase() ?? "";
      const visual = U2_VISUALS[beat.id];
      const captions =
        visual === undefined ? [] : visual.kind === "pair" ? [visual.a.name, visual.b.name] : visual.kind === "structure" ? [visual.name] : [];
      for (const caption of captions) {
        expect((caption ?? "").toLowerCase().includes(right), `${beat.id}: caption "${caption}" names the answer`).toBe(false);
      }
    }
  });

  it("never draws the stem as the one option tile with the same skeleton", () => {
    // A pick the circled atom question draws one molecule on every tile, so
    // its stem matching all of them points at none. Matching exactly one does.
    for (const beat of mcqs) {
      const visual = U2_VISUALS[beat.id];
      const tiles = U2_OPTION_TILES[beat.id];
      if (visual === undefined || tiles === undefined) continue;
      const stems = visual.kind === "structure" ? [visual.figure] : visual.kind === "pair" ? [visual.a.figure, visual.b.figure] : [];
      for (const stem of stems) {
        const same = Object.entries(tiles).filter(([, tile]) => JSON.stringify(tile.figure.bonds) === JSON.stringify(stem.bonds));
        expect(same.length === 1, `${beat.id}: the stem drawing is option ${same[0]?.[0]}'s molecule`).toBe(false);
      }
    }
  });

  it("never starts a sentence with a capital N for Huckel's n", () => {
    const all = JSON.stringify(U2_POOLS);
    expect(all.match(/(^|[.:] )N = \d/g) ?? []).toEqual([]);
  });

  it("says which n it wants whenever it asks for n, so the 4n reading is never marked wrong", () => {
    // 8 is 4n with n = 2 and 4n + 2 with n = 1.5: "find n" alone has two right answers.
    const asks = mcqs.filter((beat) => /\bfind n\b/i.test(beat.prompt));
    expect(asks.length).toBeGreaterThan(0);
    for (const beat of asks) expect(beat.prompt, beat.id).toMatch(/n in 4n \+ 2/);
  });

  it("draws a pick the atom question as one molecule with its offered atoms lettered, not one copy per option", () => {
    const picks = mcqs.filter((beat) => /lettered/.test(beat.prompt));
    expect(picks.length).toBe(3);
    for (const beat of picks) {
      expect(U2_OPTION_TILES[beat.id], beat.id).toBeUndefined();
      const drawn = figuresOf(U2_VISUALS[beat.id]!).flatMap(({ figure }) => (figure.labels ?? []).map((label) => label.t));
      for (const option of beat.options) {
        // CHANGED 2026-10-23 (content audit, close behind): lower case letters, so a lettered ring atom never reads as a carbon label.
        const letter = /^Atom ([a-d]),/.exec(option.text)?.[1];
        expect(letter, `${beat.id} ${option.id}`).toBeDefined();
        expect(drawn, `${beat.id} ${option.id}`).toContain(letter);
      }
    }
  });

  it("draws the Frost questions as an empty circle with drawn fillings to pick from", () => {
    const frost = mcqs.filter((beat) => beat.id.includes("frost"));
    expect(frost.length).toBeGreaterThanOrEqual(3);
    for (const beat of frost) {
      const visual = U2_VISUALS[beat.id];
      expect(visual?.kind, beat.id).toBe("structure");
      if (visual?.kind !== "structure") continue;
      expect(visual.figure.rings?.length, `${beat.id} has no circle`).toBe(1);
      // Electrons are written as up and down arrow characters on the level
      // bars; the empty diagram has none, and its one arrow bond is the energy axis.
      const electronsIn = (figure: Figure) =>
        (figure.labels ?? []).reduce((sum, label) => sum + (label.t.match(/[↑↓]/g)?.length ?? 0), 0);
      const arrowsIn = (figure: Figure) => (figure.bonds ?? []).filter((bond) => bond.arrow === true).length;
      expect(arrowsIn(visual.figure), `${beat.id} has no energy axis`).toBe(1);
      expect(electronsIn(visual.figure), `${beat.id} arrives pre-filled`).toBe(0);
      const tiles = U2_OPTION_TILES[beat.id];
      expect(tiles, beat.id).toBeDefined();
      for (const tile of Object.values(tiles ?? {})) expect(electronsIn(tile.figure), beat.id).toBeGreaterThan(0);
    }
  });
});

describe("u2 owner report", () => {
  it("lists every item whose provenance asks for an owner ruling", () => {
    const report = readFileSync(fileURLToPath(new URL("../../../scripts/u2_pools_report.md", import.meta.url)), "utf8");
    const section = report.split("## 4.")[1]?.split("## 5.")[0] ?? "";
    const listed = new Set([...section.matchAll(/^- (u2-[a-z0-9-]+):/gm)].map((m) => m[1]));
    const flagged = entries.filter(([, entry]) => entry.provenance.includes("NEEDS OWNER RULING")).map(([, entry]) => idAndNode(entry).id);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.filter((id) => !listed.has(id))).toEqual([]);
    expect([...listed].filter((id) => !flagged.includes(id))).toEqual([]);
  });
});

describe("u2 pi tally (data for production beats)", () => {
  const tallies = Object.entries(U2_PI_TALLY);

  it("exists for the species the pools draw", () => {
    expect(tallies.length).toBeGreaterThan(20);
    for (const name of ["benzene", "pyrrole", "pyridine", "furan", "imidazole", "cp_anion", "tropylium", "cyclobutadiene"]) {
      expect(U2_PI_TALLY[name], name).toBeDefined();
    }
  });

  it("adds every atom's share up to the ring's pi count, and n follows from it", () => {
    for (const [name, tally] of tallies) {
      if (tally.pi === null) {
        expect(tally.verdict, name).toBe("nonaromatic");
        expect(tally.atoms.some((atom) => atom.pi === null), name).toBe(true);
        continue;
      }
      const sum = tally.atoms.reduce((total, atom) => total + (atom.pi ?? 0), 0);
      expect(sum, name).toBe(tally.pi);
      expect(tally.n, name).toBe((tally.pi - 2) / 4);
      if (tally.frostLevelsBottomUp !== null) {
        expect(tally.frostLevelsBottomUp.reduce((a, b) => a + b, 0), name).toBe(tally.pi);
      }
    }
  });

  it("places every atom inside its figure", () => {
    for (const [name, tally] of tallies) {
      for (const atom of tally.atoms) {
        expect(atom.x, name).toBeGreaterThanOrEqual(0);
        expect(atom.x, name).toBeLessThanOrEqual(FIGURE_WIDTH);
        expect(atom.y, name).toBeGreaterThanOrEqual(0);
        expect(atom.y, name).toBeLessThanOrEqual(FIGURE_HEIGHT);
      }
    }
  });
});
