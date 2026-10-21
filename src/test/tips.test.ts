// @vitest-environment jsdom
/**
 * The tips and quotes list (owner, 20 Oct) and its rotation: the right number of each,
 * every quote with an author and a source, short enough to read during a load, and a
 * rotation that is seeded by the day and never shows the same line twice in a row.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { ALL_LINES, APP_TIPS, QUOTES, STUDY_TIPS, dayNumber, dayOrder, nextLine, pickLine } from "@/data/tips";

describe("the list", () => {
  it("has about 25 study tips, 15 app tips and 20 quotes", () => {
    expect(STUDY_TIPS.length).toBeGreaterThanOrEqual(25);
    expect(APP_TIPS.length).toBeGreaterThanOrEqual(15);
    expect(QUOTES.length).toBeGreaterThanOrEqual(20);
    expect(STUDY_TIPS.every((l) => l.kind === "study")).toBe(true);
    expect(APP_TIPS.every((l) => l.kind === "app")).toBe(true);
    expect(QUOTES.every((l) => l.kind === "quote")).toBe(true);
  });

  it("gives every line its own id", () => {
    const ids = ALL_LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every quote an author and a source, and no tip either", () => {
    for (const q of QUOTES) {
      expect(q.author, q.id).toBeTruthy();
      expect(q.source, q.id).toBeTruthy();
    }
    for (const t of [...STUDY_TIPS, ...APP_TIPS]) {
      expect(t.author, t.id).toBeUndefined();
      expect(t.source, t.id).toBeUndefined();
    }
  });

  it("keeps every line short enough to read during a load", () => {
    for (const l of ALL_LINES) expect(l.text.length, l.id).toBeLessThanOrEqual(160);
  });

  it("has no em or en dash anywhere in the file", () => {
    expect(readFileSync("src/data/tips.ts", "utf8")).not.toMatch(/[–—]/);
  });
});

describe("the rotation", () => {
  it("shuffles the same way for everyone on the same day, and differently the next day", () => {
    expect(dayOrder(60, 20_000)).toEqual(dayOrder(60, 20_000));
    expect(dayOrder(60, 20_000)).not.toEqual(dayOrder(60, 20_001));
    expect([...dayOrder(60, 20_000)].sort((a, b) => a - b)).toEqual(Array.from({ length: 60 }, (_, i) => i));
  });

  it("counts days in the visitor's own time zone", () => {
    expect(dayNumber(new Date(2026, 9, 21, 0, 5))).toBe(dayNumber(new Date(2026, 9, 21, 23, 55)));
    expect(dayNumber(new Date(2026, 9, 22, 0, 5))).toBe(dayNumber(new Date(2026, 9, 21, 12)) + 1);
  });

  it("walks every line once before any repeats, and never shows one twice in a row", () => {
    const seen: string[] = [];
    let count = 0;
    let last: string | null = null;
    for (let i = 0; i < ALL_LINES.length * 3; i++) {
      const picked = pickLine(ALL_LINES, 20_400, count, last);
      expect(picked.line.id).not.toBe(last);
      seen.push(picked.line.id);
      count = picked.count;
      last = picked.line.id;
    }
    expect(new Set(seen.slice(0, ALL_LINES.length)).size).toBe(ALL_LINES.length);
  });

  it("does not repeat across midnight, when yesterday's last line opens today's walk", () => {
    for (let day = 20_000; day < 20_200; day++) {
      const first = pickLine(ALL_LINES, day, 0, null).line;
      // Pretend yesterday ended on exactly the line today starts with.
      const picked = pickLine(ALL_LINES, day, 0, first.id);
      expect(picked.line.id).not.toBe(first.id);
    }
  });
});

describe("nextLine, with storage", () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = ((query: string) => ({ matches: false, media: query })) as unknown as typeof window.matchMedia;
  });

  it("gives a new line on every call the same day", () => {
    const at = new Date(2026, 9, 21, 9);
    let last = "";
    for (let i = 0; i < 100; i++) {
      const line = nextLine(at);
      expect(line.id).not.toBe(last);
      last = line.id;
    }
  });

  it("starts the walk over on a new day without repeating the last line", () => {
    const before = nextLine(new Date(2026, 9, 21, 23, 59));
    const after = nextLine(new Date(2026, 9, 22, 0, 1));
    expect(after.id).not.toBe(before.id);
    expect(JSON.parse(localStorage.getItem("blueberry_tip")!).day).toBe(dayNumber(new Date(2026, 9, 22)));
  });

  it("leaves keyboard tips out on a touch screen", () => {
    window.matchMedia = ((query: string) => ({ matches: query === "(hover: none)", media: query })) as unknown as typeof window.matchMedia;
    const at = new Date(2026, 9, 21, 9);
    for (let i = 0; i < ALL_LINES.length * 2; i++) expect(nextLine(at).keyboard).not.toBe(true);
  });

  it("still returns a line when storage throws", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(nextLine(new Date(2026, 9, 21)).text.length).toBeGreaterThan(0);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
