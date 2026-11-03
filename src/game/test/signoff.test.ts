/**
 * The Unit 1 sign-off page's rules (src/game/signoff/signoff.ts): the verdict
 * table, its parse from disk, the counts, the hand-off text, and where a save
 * lands when the dev server is or is not there.
 */
import { describe, expect, it } from "vitest";

import { U1_POOLS } from "../content/u1";
import type { SaveStorage } from "../resume/lessonSave";
import {
  SIGNOFF_ENDPOINT,
  SIGNOFF_STORAGE_KEY,
  loadVerdicts,
  nextOpen,
  parseVerdicts,
  reviewItems,
  saveVerdicts,
  setComment,
  setVerdict,
  summaryText,
  tally,
  type FetchLike,
} from "../signoff/signoff";

const items = reviewItems(U1_POOLS, (node) => `Title of ${node}`);
const [a, b, c] = items;

function memoryStorage(): SaveStorage & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("the review list", () => {
  it("holds every Unit 1 pool entry once, in pool order", () => {
    const expected = Object.values(U1_POOLS).flat().map((entry) => entry.id);
    expect(items.map((item) => item.id)).toEqual(expected);
    expect(new Set(expected).size).toBe(expected.length);
    expect(items.every((item) => item.entry.placeholder === true)).toBe(true);
  });

  it("names each item's node", () => {
    expect(a!.nodeTitle).toBe(`Title of ${a!.node}`);
    expect(U1_POOLS[a!.node]!.some((entry) => entry.id === a!.id)).toBe(true);
  });
});

describe("the verdict table", () => {
  it("records, changes and keeps verdicts without touching the old table", () => {
    const empty = {};
    const one = setVerdict(empty, a!.id, "approve", "", "t1");
    expect(empty).toEqual({});
    expect(one[a!.id]).toEqual({ verdict: "approve", comment: "", at: "t1" });
    const flipped = setVerdict(one, a!.id, "send-back", "wrong carbon", "t2");
    expect(flipped[a!.id]).toEqual({ verdict: "send-back", comment: "wrong carbon", at: "t2" });
  });

  it("edits a comment only where a verdict exists", () => {
    const one = setVerdict({}, a!.id, "send-back", "", "t1");
    expect(setComment(one, a!.id, "see option C", "t2")[a!.id]).toEqual({ verdict: "send-back", comment: "see option C", at: "t2" });
    expect(setComment(one, b!.id, "draft", "t2")).toBe(one);
  });

  it("counts approved, sent back and open over the page's items only", () => {
    let v = setVerdict({}, a!.id, "approve", "", "t");
    v = setVerdict(v, b!.id, "send-back", "", "t");
    v = setVerdict(v, "deleted-item", "approve", "", "t");
    expect(tally(items, v)).toEqual({ total: items.length, approved: 1, sentBack: 1, open: items.length - 2 });
  });

  it("finds the next item with no verdict, wrapping round", () => {
    let v = setVerdict({}, a!.id, "approve", "", "t");
    expect(nextOpen(items, v, 0)).toBe(1);
    v = setVerdict(v, b!.id, "approve", "", "t");
    expect(nextOpen(items, v, 0)).toBe(2);
    const allButFirst = Object.fromEntries(items.slice(1).map((item) => [item.id, { verdict: "approve" as const, comment: "", at: "t" }]));
    expect(nextOpen(items, allButFirst, 5)).toBe(0);
    const all = { ...allButFirst, [a!.id]: { verdict: "approve" as const, comment: "", at: "t" } };
    expect(nextOpen(items, all, 0)).toBe(-1);
  });
});

describe("parseVerdicts", () => {
  it("keeps good rows and drops malformed ones", () => {
    const parsed = parseVerdicts({
      good: { verdict: "approve", comment: "ok", at: "t" },
      noComment: { verdict: "send-back", at: "t" },
      badVerdict: { verdict: "maybe", comment: "", at: "t" },
      notObject: "approve",
    });
    expect(parsed).toEqual({
      good: { verdict: "approve", comment: "ok", at: "t" },
      noComment: { verdict: "send-back", comment: "", at: "t" },
    });
  });

  it("reads anything that is not an object as an empty table", () => {
    expect(parseVerdicts(null)).toEqual({});
    expect(parseVerdicts([1, 2])).toEqual({});
    expect(parseVerdicts("x")).toEqual({});
  });
});

describe("the Copy for Claude text", () => {
  it("lists sent-back items with their comments, then approved ids, then the rest", () => {
    let v = setVerdict({}, a!.id, "approve", "", "t");
    v = setVerdict(v, b!.id, "send-back", "Option B is also right\nat low temperature", "t");
    v = setVerdict(v, c!.id, "send-back", "  ", "t");
    const text = summaryText(items, v, "2026-10-23");
    const lines = text.split("\n");
    expect(lines[0]).toBe(`Unit 1 sign-off, 2026-10-23. ${items.length} items: 1 approved, 2 sent back, ${items.length - 3} not reviewed yet.`);
    expect(text).toContain("Verdicts file: documentation/unit1-signoff.json");
    expect(text).toContain(`SENT BACK (2)\n- ${b!.id} (${b!.entry.item.kind}, ${b!.node}: Title of ${b!.node})\n  Comment: Option B is also right / at low temperature`);
    expect(text).toContain(`- ${c!.id} (${c!.entry.item.kind}, ${c!.node}: Title of ${c!.node})\n  Comment: (no comment)`);
    expect(text).toContain(`APPROVED (1)\n${a!.id}`);
    expect(text).toContain(`NOT REVIEWED YET (${items.length - 3})\n${items[3]!.id}, `);
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });

  it("says None for empty sections and drops the not-reviewed list when all are done", () => {
    const all = Object.fromEntries(items.map((item) => [item.id, { verdict: "approve" as const, comment: "", at: "t" }]));
    const text = summaryText(items, all, "2026-10-23");
    expect(text).toContain("SENT BACK (0)\nNone.");
    expect(text).not.toContain("NOT REVIEWED YET");
    expect(summaryText(items, {}, "d")).toContain("APPROVED (0)\nNone.");
  });
});

describe("load and save", () => {
  const table = { x: { verdict: "approve" as const, comment: "", at: "t" } };

  it("saves to the file through the dev server and leaves the browser alone", async () => {
    const storage = memoryStorage();
    const calls: { input: string; method?: string; body?: string }[] = [];
    const fetcher: FetchLike = async (input, init) => {
      calls.push({ input, method: init?.method, body: init?.body });
      return { ok: true, json: async () => ({}) };
    };
    expect(await saveVerdicts(table, fetcher, storage)).toBe("file");
    expect(calls).toEqual([{ input: SIGNOFF_ENDPOINT, method: "PUT", body: JSON.stringify(table) }]);
    expect(storage.data.size).toBe(0);
  });

  it("falls back to the browser when the dev server fails or is gone", async () => {
    const refused: FetchLike = async () => ({ ok: false, json: async () => ({}) });
    const gone: FetchLike = async () => {
      throw new Error("offline");
    };
    for (const fetcher of [refused, gone]) {
      const storage = memoryStorage();
      expect(await saveVerdicts(table, fetcher, storage)).toBe("browser");
      expect(storage.data.get(SIGNOFF_STORAGE_KEY)).toBe(JSON.stringify(table));
      expect(await loadVerdicts(fetcher, storage)).toEqual({ verdicts: table, from: "browser" });
    }
    expect(await saveVerdicts(table, gone, null)).toBe("nowhere");
  });

  it("loads the file first, parsed", async () => {
    const storage = memoryStorage();
    storage.setItem(SIGNOFF_STORAGE_KEY, JSON.stringify({ y: { verdict: "approve", comment: "", at: "t" } }));
    const fetcher: FetchLike = async () => ({ ok: true, json: async () => ({ ...table, bad: { verdict: "?" } }) });
    expect(await loadVerdicts(fetcher, storage)).toEqual({ verdicts: table, from: "file" });
  });
});
