/**
 * The Lessons list (#/app/admin/lessons, 3 Nov): one row per map lesson, status
 * cards whose counts add up, and the unit filter and search narrowing both the
 * rows and the counts. Also pins that the list page draws a table, not an empty
 * "pick a lesson" pane, and that the deck no longer scrolls inside itself.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonsList } from "../admin/AdminViewer";
import { filterCounts, lessonTable, matchesFilter, scopeRows, unitShort } from "../admin/lessonTable";
import { lessonIndex, lessonSlides } from "../admin/slides";

const units = lessonIndex();
const rows = lessonTable(units, lessonSlides);

describe("lesson table", () => {
  it("has one row per listed lesson, in map order", () => {
    expect(rows.map((r) => r.id)).toEqual(units.flatMap((u) => u.lessons.map((l) => l.id)));
  });

  it("counts each lesson's questions from its slides", () => {
    const row = rows.find((r) => r.id === "u3-directing")!;
    expect(row.questions).toBe(lessonSlides("u3-directing").length);
    expect(row.unitShort).toBe("Unit 3");
    expect(row.access).toBe("pro-only");
  });

  it("splits All into Free and Pro only with nothing lost", () => {
    const counts = filterCounts(rows);
    expect(counts.all).toBe(rows.length);
    expect(counts.free + counts.pro).toBe(counts.all);
    expect(counts.checks).toBeGreaterThan(0);
  });

  it("narrows by unit and by search, and the tab counts follow", () => {
    const u3 = scopeRows(rows, "u3", "");
    expect(u3.length).toBeGreaterThan(0);
    expect(u3.every((r) => r.unitId === "u3")).toBe(true);
    expect(filterCounts(u3).all).toBe(u3.length);
    const found = scopeRows(rows, null, "DIRECTING");
    expect(found.map((r) => r.id)).toContain("u3-directing");
    expect(scopeRows(rows, null, "no lesson is called this")).toHaveLength(0);
    expect(rows.filter((r) => matchesFilter(r, "pro")).every((r) => r.access === "pro-only")).toBe(true);
  });

  it("shortens a unit title to its number", () => {
    expect(unitShort("Unit 3 · Electrophilic Aromatic Substitution")).toBe("Unit 3");
  });
});

describe("lessons list page", () => {
  const noop = () => undefined;
  const render = (query: string) =>
    renderToStaticMarkup(
      createElement(LessonsList, {
        rows,
        units,
        filter: "all",
        onFilter: noop,
        unitId: null,
        onUnit: noop,
        query,
        onQuery: noop,
      }),
    );

  it("draws a table of every lesson with a results count", () => {
    const html = render("");
    expect(html).toContain('class="al-table"');
    expect(html).toContain(`${rows.length} results`);
    expect(html).toContain("Directing effects");
    expect(html).not.toMatch(/pick a lesson/i);
  });

  it("says so when nothing matches", () => {
    expect(render("no lesson is called this")).toContain("No lessons match these filters.");
  });
});

describe("deck layout", () => {
  const css = readFileSync(path.resolve(__dirname, "../admin/admin.css"), "utf8");
  it("lets the page scroll the slide instead of a scrollbar inside the deck", () => {
    const stage = css.match(/\n\.pd-stage \{[^}]*\}/)![0];
    expect(stage).not.toMatch(/overflow-y:\s*auto/);
    expect(stage).not.toMatch(/max-height/);
  });
  it("keeps a tall slide's top reachable when presenting", () => {
    expect(css).toMatch(/\.pd--present \.pd-stage \{[^}]*align-content: safe center/);
  });
});
