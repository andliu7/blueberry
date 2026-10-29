/**
 * The staff lesson viewer (queue item 23, client side). Pins the route, the
 * staff check, that every playable lesson turns into slides with the authored
 * answer marked, what each view and plan draws, and that the plan toggle can
 * never become a grant: the viewer's own files import nothing that writes
 * progress, billing or the server.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ALL_TABS, hrefForAdmin, parseHash } from "../app/routes";
import { isStaffRole } from "../admin/staff";
import { planAccess } from "../admin/planView";
import { lessonIndex, lessonSlides, type Slide } from "../admin/slides";
import { SlideCard } from "../admin/AdminViewer";
import { lessonMcqBeats, nodeHasBeat } from "../beats/template";
import { lessonPool, practicePool } from "../beats/practice/pools";
import { PATHWAY_UNITS } from "../demo/pathwayMap";

const game = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(game, rel), "utf8");

describe("admin route", () => {
  it("parses the viewer with and without a lesson", () => {
    expect(parseHash("#/app/admin")).toEqual({ kind: "admin", node: null });
    expect(parseHash("#/app/admin/u1-allylic")).toEqual({ kind: "admin", node: "u1-allylic" });
    expect(parseHash(hrefForAdmin("u1-allylic"))).toEqual({ kind: "admin", node: "u1-allylic" });
  });

  it("leaves the five tabs parsing as they did, and is not a tab", () => {
    for (const tab of ["pathway", "trainer", "cards", "feed", "me"] as const) {
      expect(parseHash(`#/app/${tab}`)).toEqual({ kind: "tab", tab, rest: [] });
    }
    expect(ALL_TABS.some((tab) => (tab.id as string) === "admin")).toBe(false);
  });
});

describe("staff role", () => {
  it("is admin and owner, never member", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("owner")).toBe(true);
    expect(isStaffRole("member")).toBe(false);
  });
});

describe("slides", () => {
  const index = lessonIndex();

  it("lists every playable map lesson", () => {
    const listed = new Set(index.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)));
    for (const unit of PATHWAY_UNITS) {
      for (const node of unit.nodes) {
        if (node.mentionOnly !== true && nodeHasBeat(node.id)) expect(listed.has(node.id), node.id).toBe(true);
      }
    }
  });

  it("gives every listed lesson at least one slide, with ids unique per lesson", () => {
    for (const unit of index) {
      for (const lesson of unit.lessons) {
        const slides = lessonSlides(lesson.id);
        expect(slides.length, lesson.id).toBeGreaterThan(0);
        const ids = slides.map((slide) => slide.id);
        expect(new Set(ids).size, `${lesson.id} slide ids`).toBe(ids.length);
      }
    }
  });

  it("marks exactly one choice correct on every MCQ slide, the authored correctOptionId", () => {
    // The authored answer for every MCQ any lesson plays, keyed the way a slide
    // is: a pool entry by its entry id, an authored beat by its beat id.
    const authored = new Map<string, string>();
    for (const unit of index) {
      for (const lesson of unit.lessons) {
        for (const beat of lessonMcqBeats(lesson.id)) authored.set(beat.id, beat.correctOptionId);
        for (const entry of [...lessonPool(lesson.id), ...practicePool(lesson.id)]) {
          if (entry.item.kind === "mcq") authored.set(entry.id, entry.item.beat.correctOptionId);
        }
      }
    }
    let checked = 0;
    for (const unit of index) {
      for (const lesson of unit.lessons) {
        for (const slide of lessonSlides(lesson.id)) {
          if (slide.kind !== "mcq") continue;
          const correct = slide.choices!.filter((choice) => choice.correct);
          expect(correct, slide.id).toHaveLength(1);
          expect(authored.has(slide.id), slide.id).toBe(true);
          expect(correct[0]!.id, slide.id).toBe(authored.get(slide.id));
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe("plan view", () => {
  it.each([
    [{ id: "u1-allylic", unitId: "u1", kind: "spine" }, "free", "open"],
    [{ id: "u0-intro", unitId: "u0", kind: "spine" }, "free", "open"],
    [{ id: "u3-directing", unitId: "u3", kind: "spine" }, "free", "pro-only"],
    [{ id: "u3-directing", unitId: "u3", kind: "spine" }, "pro", "open"],
    [{ id: "u3-quiz-a", unitId: "u3", kind: "spine", role: "quiz" }, "free", "open"],
    [{ id: "u3-check", unitId: "u3", kind: "gate" }, "free", "open"],
    [{ id: "u3-s2-test", unitId: "u3", kind: "spine" }, "free", "open"],
  ] as const)("%o on %s is %s", (lesson, plan, expected) => {
    expect(planAccess(lesson, plan)).toBe(expected);
  });

  it("is a view, never a grant: the viewer imports nothing that writes", () => {
    for (const file of ["admin/planView.ts", "admin/AdminViewer.tsx", "admin/slides.ts", "admin/staff.ts"]) {
      const imports = read(file)
        .split("\n")
        .filter((line) => /^\s*import\b|from\s+["']/.test(line))
        .join("\n");
      expect(imports, file).not.toMatch(/app\/progress|@\/lib\/supabase|@\/lib\/billing|\/chest|journal|localStorage/);
    }
  });
});

describe("slide card", () => {
  const slide: Slide = {
    id: "demo-1",
    kind: "mcq",
    slot: "recognise",
    prompt: "Pick the more stable cation",
    choices: [
      { id: "a", text: "The allylic cation", correct: true, why: "Resonance spreads the charge." },
      { id: "b", text: "The primary cation", correct: false },
    ],
    answer: ["The allylic cation"],
    explanation: "Delocalisation lowers the energy of the allylic cation.",
  };
  const render = (view: "admin" | "student", plan: "free" | "pro", access: "open" | "pro-only") =>
    renderToStaticMarkup(createElement(SlideCard, { slide, view, plan, access }));

  it("marks the answer and explains it in the admin view", () => {
    const html = render("admin", "pro", "open");
    expect(html).toContain("Correct: </span>The allylic cation");
    expect(html).toContain("Delocalisation lowers the energy");
    expect(html).toContain("Resonance spreads the charge.");
  });

  it("hides the answer, the why and the id in the student view", () => {
    const html = render("student", "pro", "open");
    expect(html).toContain("The allylic cation");
    expect(html).not.toContain("Correct:");
    expect(html).not.toContain("av-choice--correct");
    expect(html).not.toContain("Delocalisation");
    expect(html).not.toContain("Resonance spreads");
    expect(html).not.toContain("demo-1");
  });

  it("draws the lock and the ad for a Member on a Pro lesson, neither on Pro", () => {
    const member = render("student", "free", "pro-only");
    expect(member).toContain("av-lock");
    expect(member).toContain("av-ad");
    const pro = render("student", "pro", "pro-only");
    expect(pro).not.toContain("av-lock");
    expect(pro).not.toContain("av-ad");
  });
});

describe("wiring", () => {
  it("App lazy loads the viewer behind the staff check", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/const AdminViewer = lazy\(\(\) => import\("\.\/admin\/AdminViewer"\)\)/);
    expect(app).toMatch(/isStaffRole\(role\)/);
    expect(app).toMatch(/route\.kind === "admin"\) return <AdminGate/);
  });

  it("Me shows the viewer row to staff only", () => {
    const me = read("tabs/me/MeTab.tsx");
    expect(me).toMatch(/\{isStaffRole\(role\) \? <AdminRow \/> : null\}/);
    expect(me).toContain('hrefForAdmin("home")');
  });
});
