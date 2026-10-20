/**
 * Wave 1 quick fixes (STATUS.md, ordered queue items 1 to 4), pinned.
 *
 * 1. "Practice", the US spelling, everywhere a student reads it (owner, 20 Oct).
 * 2. Pressing the unit card paints no dark square box, and the open unit list
 *    says "Free for now."
 * 3. Every course but Organic Chemistry II is a disabled control with a tag:
 *    "Opening next" for Organic Chemistry I, "Not open yet" for the rest.
 * 4. Bloom on the path is a real button that answers a tap with a line.
 *
 * Copy and wiring are READ from the files that draw them, the same way
 * hudAnatomy.test.ts does, because a copy of a stylesheet drifts. PathMascot
 * is rendered through react-dom/server, the one DOM-free way to see it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { closedCourseTag, OPEN_COURSE_IDS } from "../app/courses";
import { BLOOM_LINES, PathMascot, bloomLineFor } from "../tabs/pathway/PathMascot";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

/** Every rule in `css` whose selector list mentions `needle`, comments stripped. */
function rules(css: string, needle: string): { selector: string; body: string }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: { selector: string; body: string }[] = [];
  for (const match of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = (match[1] ?? "").trim();
    if (selector.includes(needle)) found.push({ selector, body: match[2] ?? "" });
  }
  return found;
}

describe("1. Practice, the US spelling", () => {
  const SITE = [
    "../../components/FaqPage.tsx",
    "../../components/LearnPage.tsx",
    "../../components/LessonsPage.tsx",
    "../../components/UnitPage.tsx",
    "../../components/learn/LearnRail.tsx",
    "../../components/learn/ReactionSheet.tsx",
    "../tabs/search/SearchTab.tsx",
  ];

  it("labels the unit's practice link and heading 'Practice this unit'", () => {
    expect(read("../../components/learn/ReactionSheet.tsx")).toContain('label: "Practice this unit"');
    expect(read("../../components/UnitPage.tsx")).toContain(">Practice this unit</h2>");
  });

  it("leaves no 'Practise' or 'to/and practise' in copy a student reads", () => {
    for (const path of SITE) {
      const text = read(path);
      expect(text, path).not.toMatch(/Practise/);
      expect(text, path).not.toMatch(/\b(to|and|I) practise\b|practise in the app|practise \{/);
    }
  });
});

describe("2. the unit card and its list", () => {
  const CSS = read("../tabs/pathway/pathway.css");
  const TAB = read("../tabs/pathway/PathwayTab.tsx");

  it("paints no dark box when the unit pick is pressed", () => {
    const active = rules(CSS, ".path-unitbar__pick:active");
    expect(active.length).toBeGreaterThan(0);
    for (const rule of active) expect(rule.body, rule.selector).not.toMatch(/background/);
  });

  it("says 'Free for now.' while the unit list is open", () => {
    expect(TAB).toMatch(/\{menuOpen \? <p className="path-unitbar__free">Free for now\.<\/p> : null\}/);
  });

  it("sets that line in full foreground ink", () => {
    const [rule] = rules(CSS, ".path-unitbar__free");
    expect(rule?.body).toMatch(/color:\s*var\(--bb-foreground\)/);
  });
});

describe("3. only Organic Chemistry II is selectable", () => {
  it("tags Organic Chemistry I 'Opening next', every other closed course 'Not open yet', the open one nothing", () => {
    expect([...OPEN_COURSE_IDS]).toEqual(["orgo_2"]);
    expect(closedCourseTag("orgo_2")).toBeNull();
    expect(closedCourseTag("orgo_1")).toBe("Opening next");
    for (const course of ["gen_chem_1", "gen_chem_2", "dat", "mcat"] as const) {
      expect(closedCourseTag(course), course).toBe("Not open yet");
    }
  });

  it("disables closed courses and shows their tag in the course sheet", () => {
    const chip = read("../app/ui/CourseChip.tsx");
    expect(chip).toContain("disabled={!openCourse}");
    expect(chip).toContain('aria-disabled={openCourse ? undefined : "true"}');
    expect(chip).toContain("closedCourseTag(id)");
  });

  it("disables closed courses in the pathway's course picker", () => {
    const tab = read("../tabs/pathway/PathwayTab.tsx");
    expect(tab).toContain("disabled={!isCourseOpen(course)}");
    expect(tab).toContain("if (isCourseOpen(course)) progress.setCourse(course, []);");
    expect(tab).toContain("closedCourseTag(course)");
  });

  it("tags closed courses on the Courses tab instead of 'Soon'", () => {
    const tab = read("../tabs/courses/CoursesTab.tsx");
    expect(tab).not.toContain(">Soon<");
    expect(tab).toContain("{closedCourseTag(course)}");
  });
});

describe("4. Bloom on the path is a button", () => {
  const html = renderToStaticMarkup(createElement(PathMascot, { children: () => createElement("i", { "data-berry": "" }) }));

  it("renders a real, named button around the berry, with a live region for his line", () => {
    expect(html).toMatch(/<button type="button" class="path-mascot__btn" aria-label="Bloom, your blueberry. Say hi"><i data-berry=""><\/i><\/button>/);
    expect(html).toContain('role="status"');
    expect(html).not.toContain("aria-hidden");
  });

  it("takes turns through short lines and never says one twice in a row", () => {
    expect(BLOOM_LINES.length).toBeGreaterThanOrEqual(3);
    expect(BLOOM_LINES.length).toBeLessThanOrEqual(4);
    for (const line of BLOOM_LINES) expect(line.length).toBeLessThanOrEqual(24);
    for (let tap = 1; tap <= 12; tap += 1) {
      expect(BLOOM_LINES).toContain(bloomLineFor(tap));
      expect(bloomLineFor(tap + 1)).not.toBe(bloomLineFor(tap));
    }
  });

  it("gives the press at least 44 by 44 and turns pointer events back on", () => {
    const [btn] = rules(read("../tabs/pathway/path-mascot.css"), ".path-mascot__btn").filter((r) => r.selector === ".path-mascot__btn");
    expect(btn?.body).toMatch(/min-width:\s*44px/);
    expect(btn?.body).toMatch(/min-height:\s*44px/);
    expect(btn?.body).toMatch(/pointer-events:\s*auto/);
  });

  it("hands the berry the pathway's reduced-motion flag, so a reduced-motion tap shows the line with no hop", () => {
    const tab = read("../tabs/pathway/PathwayTab.tsx");
    expect(tab).toMatch(/<PathMascot>\s*\{\(move\) => <Berry mood="happy" \{\.\.\.move\} reducedMotion=\{reducedMotion\} sizePx=\{MASCOT_PX\} \/>\}/);
  });
});
