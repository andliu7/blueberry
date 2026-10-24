// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost/?flags="}

/**
 * Learn's right rail (S3, 16 Oct). The rule it is held to: real data on this device
 * or an honest empty state, never a made-up number.
 *
 * 1. A NEW VISITOR sees no run, seven empty days ending today, three quests at
 *    zero, nothing due, and a sign-in prompt for office hours. Nothing invented.
 * 3. S3 round 4: A LESSON FINISHED ON THE SITE TODAY moves the rail: the lesson count,
 *    a one-day run, today lit in the week, and the "Finish a lesson" quest done. Before,
 *    reading never counted, so the rail sat at zero beside "6 of 12 finished".
 * 2. A CARD MARKED MISSED on a study deck shows up as due, and the row links to the
 *    deck that holds it.
 *
 * Office hours reads Supabase, which only answers a signed-in student; the session
 * hook is mocked to "signed out" so the test needs no network (vi.mock is hoisted above
 * the imports, so the rail gets the mock). The URL carries `flags=` so the dev beta flags
 * do not inject their synthetic journal (a "new visitor" would otherwise have cleared
 * u1-allylic); that is flags.ts's own off switch, not a looser check.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DECKS } from "@/data/decks";
import { isReference } from "@/data/types";

// Known-slow file, explicit timeout (owner, 2026-10-20). Each test renders the
// rail with its real data in jsdom; solo the slowest takes ~3.1 s, so a busy
// `npm test` pool pushed them past the 5 s default. 15 s is ~4x that. No
// assertion changes.
vi.setConfig({ testTimeout: 15_000 });
import { progressKey } from "@/lib/progress";
import { LearnRail, useRailNumbers } from "@/components/learn/LearnRail";
import { markLessonFinished } from "@/components/learn/lessonsOpened";

vi.mock("@/lib/useSupabaseSession", () => ({
  useSupabaseSession: () => ({ session: null, loading: false }),
}));

let root: Root | null = null;
let host: HTMLElement | null = null;

async function renderRail() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    // LearnPage reads the numbers once and hands them to the rail; this does the same.
    root!.render(createElement(() => createElement(LearnRail, { numbers: useRailNumbers() })));
  });
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});

describe("Learn rail, a new visitor", () => {
  it("shows honest empty states and no invented numbers", async () => {
    localStorage.clear();
    const el = await renderRail();
    const text = el.textContent ?? "";

    expect(text).toContain("Start a run today");
    expect(text).toMatch(/0 of \d+unit notes read/);
    // The app's lessons, counted as the Path counts them (audit 23 Oct, section 5 #2).
    expect(text).toMatch(/0 of \d+ lessons done in the app/);
    // Seven days, exactly one of them today, none counted.
    const days = el.querySelectorAll(".lrn-week li");
    expect(days).toHaveLength(7);
    expect(el.querySelectorAll(".lrn-week li[data-today]")).toHaveLength(1);
    expect(el.querySelectorAll(".lrn-week li[data-counted]")).toHaveLength(0);

    expect(text).toContain("Today’s quests");
    expect(text).toMatch(/0 of 3 done/);
    // The empty run says what starts one (reading counts as well as the app), and every
    // quest has a bar, read as a count. S3 round 4: the first quest is the site's own.
    expect(text).toContain("Read a note here or practice in the app.");
    expect(el.querySelectorAll(".lrn-quest-bar")).toHaveLength(3);
    expect(text).not.toContain("Today is open");
    // S3 round 5: a spoken separator between the quest and its count.
    expect(text).toContain("Read a unit note: 0 / 1");
    expect(text).toContain("Nothing due");

    // Signed out: the office hours card offers sign-in, it does not guess a time.
    expect(text).toContain("Sign in to see times");
    expect(el.querySelector('a[href="#/signin"]')).not.toBeNull();
  });
});

describe("Learn rail, a card marked Missed", () => {
  it("counts it as due and links to its deck", async () => {
    const deck = DECKS.find((d) => !isReference(d));
    expect(deck, "there is a study deck to rate (the check can fail)").toBeDefined();
    localStorage.setItem(progressKey(deck!.id), JSON.stringify({ status: { 0: "red", 1: "yellow", 2: "green" } }));

    const el = await renderRail();
    const row = el.querySelector(`a[href="#/deck/${deck!.id}"]`);
    expect(row).not.toBeNull();
    // Missed plus Unsure is two; Got it does not count.
    expect(row!.textContent).toMatch(/^2/);
    expect(el.textContent).not.toContain("Nothing due");
  });
});

describe("Learn rail, a lesson finished on the site today", () => {
  it("lights today, starts a one-day run and completes the reading quest", async () => {
    // markLessonFinished is what the end-of-lesson button calls.
    markLessonFinished("dienes");
    const el = await renderRail();
    const text = el.textContent ?? "";
    expect(text).toMatch(/1 of \d+unit notes read/);
    expect(text).toContain("1 day in a row");
    expect(el.querySelectorAll(".lrn-week li[data-counted]")).toHaveLength(1);
    expect(el.querySelector(".lrn-week li[data-today]")?.hasAttribute("data-counted")).toBe(true);
    expect(text).toMatch(/1 of 3 done/);
    expect(text).toContain("Read a unit note: 1 / 1");
  });

  it("a lesson finished before the log existed counts as a lesson but lights no day", async () => {
    localStorage.setItem("blueberry_lessons_finished_v1", JSON.stringify(["dienes"]));
    const el = await renderRail();
    expect(el.textContent).toMatch(/1 of \d+unit notes read/);
    expect(el.querySelectorAll(".lrn-week li[data-counted]")).toHaveLength(0);
    expect(el.textContent).toContain("Start a run today");
  });
});

