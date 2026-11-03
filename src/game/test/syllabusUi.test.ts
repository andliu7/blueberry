// @vitest-environment jsdom

/**
 * The syllabus screen (STATUS C1), mounted for real: paste a messy syllabus,
 * read the flags, answer them, move a unit, mark one not covered, save, and
 * read the store. A .ts file with createElement because the suite's include
 * pattern is *.test.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import SyllabusSettings from "../syllabus/SyllabusSettings";
import { syllabusStore } from "../syllabus/syllabusPlan";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom rewrites import.meta.url, so the fixture is found from the repo root.
const fixture = (name: string) => readFileSync(join(process.cwd(), "src/game/test/fixtures/syllabus", name), "utf8");

let host: HTMLDivElement;
let root: Root;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(SyllabusSettings)));
}

beforeEach(() => {
  syllabusStore.replace(null);
  mount();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  syllabusStore.replace(null);
});

/** Types into a React-controlled textarea: set through the native setter, then fire input. */
function type(field: HTMLTextAreaElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function choose(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  act(() => {
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function button(label: string, within: ParentNode = host): HTMLButtonElement {
  const found = [...within.querySelectorAll("button")].find((b) => b.textContent === label || b.getAttribute("aria-label") === label);
  if (found === undefined) throw new Error(`no button "${label}"`);
  return found;
}

const order = () => [...host.querySelectorAll("[data-unit]")].map((row) => row.getAttribute("data-unit"));
const text = () => host.textContent ?? "";

function paste(name: string) {
  type(host.querySelector("textarea")!, fixture(name));
  act(() => button("Read my syllabus").click());
}

describe("the syllabus screen", () => {
  it("shows the flagged lines first, and they can be answered by hand", () => {
    paste("messy-policy.txt");
    expect(text()).toContain("Check these (2)");
    const flags = [...host.querySelectorAll('[data-flag="true"]')];
    expect(flags.map((flag) => flag.querySelector("p.font-bold")?.textContent)).toEqual(["Ch 18", "Photosynthesis in plants"]);
    expect(order()).toEqual(["u1", "u2", "u3", "u11", "u10"]);

    // "Ch 18" is Unit 5 in this course; the photosynthesis line is not covered.
    choose(host.querySelector('select[aria-label="Pick a unit for Ch 18"]')!, "u5");
    act(() => button("Not covered", host.querySelector('[data-flag="true"]')!).click());
    expect(text()).toContain("All checked");
    expect(text()).toContain("You answered 2");
    expect(order()).toEqual(["u1", "u2", "u3", "u5", "u11", "u10"]);
  });

  it("moves a unit, marks one not covered, saves, and the store holds it", () => {
    paste("pdf-table.txt");
    expect(text()).toContain("Not saved yet.");
    act(() => button("Move Unit 2 up").click());
    const u5 = host.querySelector('[data-unit="u5"]')!;
    act(() => button("Not covered", u5).click());
    expect(host.querySelector('[data-unit="u5"]')!.getAttribute("data-off")).toBe("true");
    act(() => button("Save my syllabus").click());

    const saved = syllabusStore.getSnapshot()!;
    expect(saved.unitOrder).toEqual(["u2", "u1", "u3", "u4", "u5", "u7", "u8", "u9", "u10"]);
    expect(saved.notCovered).toEqual(["u5"]);
    expect([...saved.sideQuests].sort()).toEqual(["u10-hofmann-e", "u4-benzyne"]);
    expect(text()).toContain("Saved. Your path follows this order now.");
    expect(button("Save my syllabus").disabled).toBe(true);
  });

  it("switches a side quest off before saving", () => {
    paste("pdf-table.txt");
    const benzyne = [...host.querySelectorAll('[data-unit="u4"] input[role="switch"]')].find((input) => input.parentElement?.textContent?.includes("Benzyne")) as HTMLInputElement;
    expect(benzyne.checked).toBe(true);
    act(() => benzyne.click());
    act(() => button("Save my syllabus").click());
    expect(syllabusStore.getSnapshot()!.sideQuests).toEqual(["u10-hofmann-e"]);
  });

  it("reopens on the saved plan, and Clear empties it", () => {
    paste("terse.txt");
    act(() => button("Save my syllabus").click());
    act(() => root.unmount());
    host.remove();
    mount();
    expect(order()).toEqual(["u1", "u3", "u2", "u4", "u9", "u10"]);
    expect(text()).toContain("Saved on this device");
    act(() => button("Clear").click());
    expect(syllabusStore.getSnapshot()).toBeNull();
    expect(order()).toEqual([]);
    expect(text()).toContain("Cleared. Your path is back to Blueberry's order.");
  });

  it("adds a unit the syllabus did not name", () => {
    paste("terse.txt");
    act(() => button("Add Unit 6").click());
    expect(order()).toEqual(["u1", "u3", "u2", "u4", "u9", "u10", "u6"]);
  });

  it("sets a unit's week from the screen, and the saved plan holds it (C1 fix round)", () => {
    paste("terse.txt");
    choose(host.querySelector('select[aria-label="Week for Unit 3"]')!, "5");
    act(() => button("Save my syllabus").click());
    expect(syllabusStore.getSnapshot()!.weeks).toEqual([{ week: 5, start: null, unitIds: ["u3"] }]);
  });

  it("marks a single lesson not covered", () => {
    paste("terse.txt");
    const boxes = [...host.querySelectorAll('[data-unit="u1"] ul ul input[type="checkbox"]')] as HTMLInputElement[];
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes.every((box) => box.checked)).toBe(true);
    act(() => boxes[0]!.click());
    act(() => button("Save my syllabus").click());
    const off = syllabusStore.getSnapshot()!.notCovered;
    expect(off.length).toBe(1);
    expect(off[0]).toMatch(/^u1-/);
  });

  it("asks for the first day of Week 1 only when the weeks have no dates", () => {
    type(host.querySelector("textarea")!, "Week 1: Dienes\nWeek 2: Aromaticity");
    act(() => button("Read my syllabus").click());
    expect(text()).toContain("When does Week 1 start?");
    const field = host.querySelector('input[type="date"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    act(() => {
      setter?.call(field, "2026-08-24");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => button("Save my syllabus").click());
    expect(syllabusStore.getSnapshot()!.termStart).toBe("2026-08-24");
    act(() => button("Clear").click());
    paste("pdf-table.txt");
    expect(text()).not.toContain("When does Week 1 start?");
  });

  it("shows a plan the account sync adopts while the screen is open, when nothing is unsaved", () => {
    expect(order()).toEqual([]);
    act(() => syllabusStore.replace({ version: 1, updatedAt: 9, weeks: [], unitOrder: ["u7", "u8"], sectionOrder: {}, notCovered: [], sideQuests: [], exams: [] }));
    expect(order()).toEqual(["u7", "u8"]);
  });

  it("keeps unsaved edits when the sync adopts a plan underneath", () => {
    paste("terse.txt");
    act(() => syllabusStore.replace({ version: 1, updatedAt: 9, weeks: [], unitOrder: ["u7"], sectionOrder: {}, notCovered: [], sideQuests: [], exams: [] }));
    expect(order()).toEqual(["u1", "u3", "u2", "u4", "u9", "u10"]);
  });
});
