// @vitest-environment jsdom

/**
 * The Schedule calendar's month cells and colours, schedule round 2.
 *
 * Round 1's critic found a cell with four items showing one chip and a 2px
 * sliver, with no "+N more", and Exams and Deadlines in one shared violet.
 * This pins both fixes: the cell draws as many chips as it holds and says how
 * many more there are, and each of the five categories has its own colour,
 * clear of WCAG's 3:1 as a mark and 4.5:1 for the ink on its chip, in light and
 * night. The colours are read from the token files, so a palette change that
 * breaks a ratio fails here. The browser shots in the round 2 log show the same
 * cells at 1440 and 390.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CourseCalendar, type CourseDate, type ScheduleItem } from "@/components/ui/event-manager";
import { BookingSheet } from "@/components/BookingSheet";
import {
  CELL_ROW_PX,
  WEEKDAY_NAMES,
  WEEK_STARTS_ON,
  cellEntries,
  chipCapacity,
  fitCell,
  fitChips,
  leadDays,
  nothingLine,
} from "@/lib/calendarCells";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// A time budget, not a check: the first render in jsdom is slow under a full
// suite's load. No assertion depends on it.
vi.setConfig({ testTimeout: 30_000 });

const read = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const scheduleCss = read("components/schedule.css");
const tokensCss = read("tokens.css");
const indexCss = read("index.css");

/** The value a custom property ends up with for `:root` or `.dark`: the last one wins. */
function token(css: string, block: ":root" | ".dark", name: string): string | undefined {
  let value: string | undefined;
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim() !== block) continue;
    const m = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(body);
    if (m) value = m[1];
  }
  return value;
}
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
/** CSS `color-mix(in srgb, a p%, b)`. */
function mix(a: string, b: string, p: number) {
  const [A, B] = [rgb(a), rgb(b)];
  return `#${A.map((v, i) => Math.round(v * p + B[i] * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
}
/** The chip tint's share of its colour for a theme, from schedule.css's `--chip-mix`. */
function chipMix(block: ":root" | ".dark"): number {
  let value: number | undefined;
  for (const [, sel, body] of scheduleCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim() !== block) continue;
    const m = /--chip-mix\s*:\s*(\d+)%/.exec(body);
    if (m) value = Number(m[1]) / 100;
  }
  return value!;
}
function hue(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("a month cell never hides an item without saying so", () => {
  it("holds four chip rows at the desktop row height", () => {
    expect(chipCapacity(CELL_ROW_PX)).toBe(4);
    expect(chipCapacity(CELL_ROW_PX - 20)).toBe(3);
  });

  it("draws everything that fits, else one fewer and '+N more'", () => {
    expect(fitChips(4, 4)).toEqual({ shown: 4, more: 0 });
    expect(fitChips(5, 4)).toEqual({ shown: 3, more: 2 });
    expect(fitChips(4, 3)).toEqual({ shown: 2, more: 2 });
    expect(fitChips(0, 4)).toEqual({ shown: 0, more: 0 });
  });

  it("says which empty days there are in one line", () => {
    const d = (n: number) => new Date(2026, 9, 4 + n); // Sun 4 Oct 2026 onward
    expect(nothingLine([d(0)])).toMatch(/^Nothing on \S+$/);
    expect(nothingLine([d(0), d(1), d(2)])).toMatch(/^Nothing on \S+ to \S+$/);
  });

  describe("rendered", () => {
    let root: Root | null = null;
    let host: HTMLElement | null = null;
    afterEach(() => {
      act(() => root?.unmount());
      host?.remove();
    });

    const today = new Date();
    const on = (day: number, h: number) => new Date(today.getFullYear(), today.getMonth(), day, h, 0);
    const dated = (n: number, day: number): CourseDate[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `d${day}-${i}`,
        title: `Item ${i + 1}`,
        kind: i === 0 ? "exam" : i === 1 ? "assignment" : "lecture",
        start: on(day, 9 + i),
      }));

    async function render(dates: CourseDate[]) {
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root!.render(createElement(CourseCalendar, { dates }));
      });
      return (day: number) => host!.querySelector(`[data-day="${on(day, 0).getTime()}"]`)!;
    }

    it("shows all four items in a cell that holds four", async () => {
      const cell = await render(dated(4, 8));
      expect(cell(8).querySelectorAll(".sch-chip")).toHaveLength(4);
      expect(cell(8).textContent).not.toContain("more");
    });

    it("shows three and '+2 more' for five", async () => {
      const cell = await render(dated(5, 9));
      expect(cell(9).querySelectorAll(".sch-chip")).toHaveLength(3);
      expect(cell(9).textContent).toContain("+2 more");
      // The phone's bars: two and a count.
      expect(cell(9).querySelectorAll(".sch-bar")).toHaveLength(2);
      expect(cell(9).textContent).toContain("+3");
    });

    it("draws five filter chips, each with its own colour and its own icon", async () => {
      await render([]);
      const marks = [...host!.querySelectorAll("button[aria-pressed] svg.sch-mark")].slice(0, 5);
      expect(marks.map((m) => m.getAttribute("data-cat"))).toEqual(["exam", "due", "class", "hours", "mine"]);
      const icons = marks.map((m) => [...m.classList].find((c) => c.startsWith("lucide-") && c !== "lucide-icon"));
      expect(new Set(icons).size, "five different icons").toBe(5);
    });

    it("gives an exam and a deadline different categories", async () => {
      const cell = await render(dated(2, 10));
      const cats = [...cell(10).querySelectorAll(".sch-chip")].map((c) => c.getAttribute("data-cat"));
      expect(cats).toEqual(["exam", "due"]);
    });
  });
});

describe("the five categories are five marks", () => {
  // Where each category's colour comes from (schedule.css maps --cat-* to these).
  const SOURCE: Record<string, [string, string]> = {
    exam: [tokensCss, "--site-nav-line"],
    due: [scheduleCss, "--site-due"],
    class: [tokensCss, "--site-border"],
    hours: [scheduleCss, "--site-touch"],
    mine: [tokensCss, "--bb-progress-edge"],
  };

  it("maps every category to its source token in the stylesheet", () => {
    const want: Record<string, string> = {
      exam: "--site-nav-line",
      due: "--site-due",
      class: "--site-border",
      hours: "--site-touch",
      mine: "--bb-progress-edge",
    };
    for (const [cat, name] of Object.entries(want)) {
      expect(scheduleCss).toMatch(new RegExp(`--cat-${cat}:\\s*var\\(${name}\\)`));
      expect(scheduleCss).toMatch(new RegExp(`\\[data-cat="${cat}"\\]\\s*\\{\\s*--cat:\\s*var\\(--cat-${cat}\\)`));
    }
  });

  for (const theme of [":root", ".dark"] as const) {
    it(`clears 3:1 as a mark and 4.5:1 for chip ink, ${theme === ":root" ? "light" : "night"}`, () => {
      const card = token(indexCss, theme, "--card")!;
      const ink = token(tokensCss, theme, "--bb-deep")!;
      const colours: Record<string, string> = {};
      for (const [cat, [css, name]] of Object.entries(SOURCE)) {
        const value = token(css, theme, name) ?? token(css, ":root", name);
        expect(value, `${cat} ${theme}`).toBeDefined();
        colours[cat] = value!;
        expect(contrast(value!, card), `${cat} mark on the card`).toBeGreaterThanOrEqual(3);
        expect(contrast(ink, mix(value!, card, chipMix(theme))), `${cat} ink on its chip`).toBeGreaterThanOrEqual(4.5);
      }
      // The chip draws its tint from --chip-mix, and an exam's filled chip carries its own ink.
      expect(scheduleCss).toMatch(/\.sch-chip\s*\{[^}]*color-mix\(in srgb, var\(--cat\) var\(--chip-mix\), var\(--card\)\)/);
      expect(scheduleCss).toMatch(/\.sch-chip\[data-strong\]\s*\{\s*background:\s*var\(--cat\);\s*color:\s*var\(--cat-exam-on\)/);
      const examOn = token(scheduleCss, theme, "--cat-exam-on")!;
      expect(contrast(examOn, colours.exam), "ink on a filled exam chip").toBeGreaterThanOrEqual(4.5);
      // Exams and Deadlines no longer share a colour: at least 45 degrees of hue apart.
      const gap = Math.abs(hue(colours.exam) - hue(colours.due));
      expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(45);
    });
  }

  it("draws a deadline's phone bar hollow, so exam and deadline differ in shape too", () => {
    expect(scheduleCss).toMatch(/\.sch-bar\[data-cat="due"\]\s*\{[^}]*background:\s*transparent/);
  });
});

describe("My sessions rows are green fill with dark ink", () => {
  it("is AA in both themes, and calmer than the lime at night", () => {
    expect(scheduleCss).toMatch(/\.sch-mine\s*\{\s*background:\s*var\(--bb-progress\);\s*color:\s*var\(--bb-progress-ink\)/);
    expect(scheduleCss).toMatch(/\.dark \.sch-mine\s*\{\s*background:\s*var\(--bb-progress-edge\);\s*color:\s*var\(--site-ground\)/);
    const day = contrast(token(tokensCss, ":root", "--bb-progress-ink")!, token(tokensCss, ":root", "--bb-progress")!);
    const nightFill = token(tokensCss, ".dark", "--bb-progress-edge")!;
    const night = contrast(token(tokensCss, ".dark", "--site-ground")!, nightFill);
    expect(day).toBeGreaterThanOrEqual(4.5);
    expect(night).toBeGreaterThanOrEqual(4.5);
    // Calmer: the night fill is darker than the lime it replaces.
    expect(luminance(nightFill)).toBeLessThan(luminance(token(tokensCss, ".dark", "--bb-progress")!));
  });
});

describe("a month cell puts what matters first (schedule round 3)", () => {
  const t = (h: number) => new Date(2026, 9, 8, h);
  const entry = (id: string, kind: string, h: number) => ({ id, kind, start: t(h) });
  // The critic's busy Oct 8: reading quiz, lab, three open slots, my session, a deadline.
  const busy = [
    entry("quiz", "quiz", 9),
    entry("s1", "open-slot", 14),
    entry("lab", "lab", 14),
    entry("s2", "open-slot", 15),
    entry("mine", "my-session", 14),
    entry("s3", "open-slot", 15),
    entry("due", "assignment", 23),
  ];

  it("orders exam, quiz, deadline, my session, class, then open times", () => {
    const order = cellEntries([...busy, entry("mid", "exam", 18), entry("lec", "lecture", 11)]).map((e) =>
      e.type === "open" ? `open:${e.count}` : e.item.id,
    );
    expect(order).toEqual(["mid", "quiz", "due", "mine", "lec", "lab", "open:3"]);
  });

  it("folds every open slot of the day into one entry", () => {
    const entries = cellEntries(busy);
    expect(entries.filter((e) => e.type === "open")).toEqual([{ type: "open", count: 3 }]);
    expect(entries).toHaveLength(5);
    expect(cellEntries([entry("a", "lecture", 9)]).some((e) => e.type === "open")).toBe(false);
  });

  it("never hides an exam, a deadline or my session behind '+N more'", () => {
    const entries = cellEntries(busy);
    for (const capacity of [1, 2, 3, 4]) {
      const { shown, more } = fitCell(entries, capacity);
      const hidden = entries.slice(shown);
      expect(shown + more).toBe(entries.length);
      expect(
        hidden.every((e) => e.type === "open" || ["lecture", "lab", "office-hours"].includes(e.item.kind)),
        `capacity ${capacity}`,
      ).toBe(true);
    }
    expect(fitCell(entries, 4)).toEqual({ shown: 3, more: 2 });
  });

  describe("rendered", () => {
    let root: Root | null = null;
    let host: HTMLElement | null = null;
    afterEach(() => {
      act(() => root?.unmount());
      host?.remove();
    });

    it("draws the busy day as quiz, deadline, my session, '+2 more', and an exam filled", async () => {
      const now = new Date();
      const at = (day: number, h: number) => new Date(now.getFullYear(), now.getMonth(), day, h);
      const dates: CourseDate[] = [
        { id: "q", title: "Reading quiz", kind: "quiz", start: at(8, 9) },
        { id: "l", title: "Lab 7", kind: "lab", start: at(8, 14) },
        { id: "d", title: "Mechanism map due", kind: "assignment", start: at(8, 23) },
        { id: "x", title: "Midterm 2", kind: "exam", start: at(20, 9) },
        { id: "q5", title: "Quiz 5", kind: "quiz", start: at(20, 10) },
      ];
      const items: ScheduleItem[] = [
        { id: "s1", title: "Office hours, Kai", kind: "open-slot", start: at(8, 14) },
        { id: "s2", title: "Office hours, Kai", kind: "open-slot", start: at(8, 15) },
        { id: "s3", title: "Office hours, Kai", kind: "open-slot", start: at(8, 15) },
        { id: "m", title: "Session with Kai", kind: "my-session", start: at(8, 14) },
      ];
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root!.render(createElement(CourseCalendar, { dates, items }));
      });
      const cell = (day: number) => host!.querySelector(`[data-day="${at(day, 0).getTime()}"]`)!;
      const chips = [...cell(8).querySelectorAll(".sch-chip")].map((c) => c.textContent);
      expect(chips).toEqual(["Reading quiz", "Mechanism map due", "Session with Kai"]);
      expect(cell(8).textContent).toContain("+2 more");
      // The exam is filled; the quiz on the same day is not.
      const mid = [...cell(20).querySelectorAll(".sch-chip")];
      expect(mid.map((c) => c.textContent)).toEqual(["Midterm 2", "Quiz 5"]);
      expect(mid[0].hasAttribute("data-strong")).toBe(true);
      expect(mid[1].hasAttribute("data-strong")).toBe(false);
    });

    it("collapses a day of open slots into one 'N open times' chip", async () => {
      const now = new Date();
      const at = (h: number) => new Date(now.getFullYear(), now.getMonth(), 12, h);
      const items: ScheduleItem[] = [10, 11, 14].map((h) => ({
        id: `o${h}`,
        title: "Office hours, Kai",
        kind: "open-slot" as const,
        start: at(h),
      }));
      host = document.createElement("div");
      document.body.appendChild(host);
      root = createRoot(host);
      await act(async () => {
        root!.render(createElement(CourseCalendar, { items }));
      });
      const cell = host!.querySelector(`[data-day="${at(0).getTime()}"]`)!;
      expect([...cell.querySelectorAll(".sch-chip")].map((c) => c.textContent)).toEqual(["3 open times"]);
      expect(cell.querySelectorAll(".sch-bar")).toHaveLength(1);
    });
  });
});

describe("one week start for the page and the booking sheet", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    document.body.innerHTML = "";
  });

  it("is Sunday, and the names and blanks follow it", () => {
    expect(WEEK_STARTS_ON).toBe(0);
    expect(WEEKDAY_NAMES).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(leadDays(new Date(2026, 9, 1))).toBe(4); // Thu 1 Oct 2026
    expect(leadDays(new Date(2026, 10, 1))).toBe(0); // Sun 1 Nov 2026
  });

  it("puts a date in the same column on the page and in the sheet", async () => {
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), 12, 14);
    const slot = { id: "s", tutorId: "k", tutorName: "Kai Walsh", start: day, minutes: 30, location: "", booked: false };
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        createElement(
          "div",
          null,
          createElement(CourseCalendar, { items: [{ id: "o", title: "Office hours", kind: "open-slot", start: day }] }),
          createElement(BookingSheet, {
            state: { mode: "book" },
            slots: [slot],
            busy: false,
            error: null,
            onConfirm: () => {},
            onMove: () => {},
            onCancel: () => {},
            onClose: () => {},
          }),
        ),
      );
    });
    const column = (day.getDay() - WEEK_STARTS_ON + 7) % 7;
    // The page: the header runs from the week start, and the day's cell sits in its column.
    const pageCells = [...host!.querySelectorAll("[data-day]")];
    const pageAt = pageCells.findIndex((c) => c.getAttribute("data-day") === String(new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()));
    expect(pageAt % 7).toBe(column);
    // The sheet: the same header, and the open day in the same column.
    const sheetGrid = document.querySelector(".sch-sheet .grid-cols-7")!;
    const cells = [...sheetGrid.children];
    expect(cells.slice(0, 7).map((c) => c.textContent)).toEqual(WEEKDAY_NAMES);
    const openAt = cells.slice(7).findIndex((c) => c.hasAttribute("data-open"));
    expect(openAt % 7).toBe(column);
  });
});

describe("open days in the booking sheet", () => {
  it("are ringed in the blue touch, at least 3:1 on the sheet in both themes", () => {
    expect(scheduleCss).toMatch(/\.sch-day\[data-open\]\s*\{[^}]*box-shadow:\s*inset 0 0 0 2px var\(--site-touch\)/);
    for (const theme of [":root", ".dark"] as const) {
      const ring = token(scheduleCss, theme, "--site-touch")!;
      const sheet = token(tokensCss, theme, "--bb-sheet")!;
      expect(contrast(ring, sheet), theme).toBeGreaterThanOrEqual(3);
    }
  });
});
