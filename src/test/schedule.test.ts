// @vitest-environment jsdom

/**
 * Schedule, SITE-REPLAN.md phase 6: the calendar and office hours on one page.
 *
 * What this file proves, and what it does not:
 * - the old addresses (#/calendar, #/tutoring) land on #/schedule, the route has
 *   a title, and the header's Schedule link points there;
 * - a visitor who is not signed in sees the course dates and is offered sign-in,
 *   never a booking control (the page is mounted for real, with only the
 *   network calls replaced);
 * - the pure helpers (which slots are bookable, the .ics file) behave.
 *
 * It does NOT prove that a booking without a session is refused. That is the
 * database's job, and it is proven against Postgres itself by
 * `supabase/rls-tests/office_hours.sql` (see that file for how to run it).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { redirectFor } from "@/lib/redirects";
import { titleForRoute } from "@/lib/useDocumentTitle";
import { DESTINATIONS, destinationFor } from "@/lib/siteNav";
import { bookable, byDay, toIcs, type OfficeHour } from "@/lib/officeHours";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// A time budget, not a check (schedule round 2): mounting the real page in
// jsdom takes seconds when the whole suite shares the machine, and the 5s
// default cut this test off before its assertions ran. No assertion changed.
vi.setConfig({ testTimeout: 30_000 });

// Signed out, and one exam on the course calendar. Everything else is the real page.
vi.mock("@/lib/useSession", () => ({ useSession: () => null }));
vi.mock("@/lib/calendar", () => ({
  loadDates: async () => ({
    dates: [
      {
        id: "midterm-2",
        title: "Midterm 2",
        kind: "exam",
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 20, 9, 0),
      },
    ],
  }),
  saveDates: async () => ({ dates: [] }),
  deleteDate: async () => ({ dates: [] }),
}));

describe("Schedule's address", () => {
  it("is where #/calendar and #/tutoring now go", () => {
    expect(redirectFor("calendar")).toBe("#/schedule");
    expect(redirectFor("tutoring")).toBe("#/schedule?view=hours");
    expect(redirectFor("schedule")).toBeNull();
  });

  it("has a tab title", () => {
    expect(titleForRoute("schedule")).toBe("blueberry · Schedule");
  });

  it("is the header's Schedule destination", () => {
    expect(DESTINATIONS.find((d) => d.id === "schedule")?.href).toBe("#/schedule");
    expect(destinationFor("schedule")).toBe("schedule");
  });
});

describe("Schedule, signed out", () => {
  let root: Root | null = null;
  let host: HTMLElement | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
  });

  it("shows the course dates, offers sign-in, and offers no booking control", async () => {
    const { default: SchedulePage, SHOW_COURSE_DATES_SIGNED_OUT } = await import("@/components/SchedulePage");
    expect(SHOW_COURSE_DATES_SIGNED_OUT).toBe(true);

    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(createElement(SchedulePage));
    });
    // The dates arrive from an effect; one more turn lets it land.
    await act(async () => {});

    const text = host.textContent ?? "";
    expect(text).toContain("Midterm 2");
    expect(text).toContain("Sign in for your own sessions");
    const signIn = [...host.querySelectorAll("a")].find((a) => a.textContent === "Sign in to book");
    expect(signIn?.getAttribute("href")).toBe("#/signin");
    expect(text).not.toContain("Book a session");
    expect(host.querySelector(".sch-slot")).toBeNull();
  });
});

describe("office-hour helpers", () => {
  const at = (h: number, dayOffset = 1) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, h, 0);
  };
  const slot = (id: string, start: Date, extra: Partial<OfficeHour> = {}): OfficeHour => ({
    id,
    tutorId: "tutor",
    tutorName: "Kai Walsh",
    start,
    minutes: 30,
    location: "CHM 2201",
    booked: false,
    ...extra,
  });

  it("offers only open, future slots that are not your own", () => {
    const slots = [
      slot("open", at(14)),
      slot("taken", at(15), { booked: true }),
      slot("past", at(9, -1)),
      slot("mine", at(16), { tutorId: "me" }),
    ];
    expect(bookable(slots, "me").map((s) => s.id)).toEqual(["open"]);
  });

  it("groups slots by day, in order", () => {
    const grouped = byDay([slot("b", at(15, 2)), slot("a", at(14, 1)), slot("c", at(10, 2))]);
    expect(grouped.map(([, list]) => list.map((s) => s.id))).toEqual([["a"], ["c", "b"]]);
  });

  it("writes an .ics a calendar app can open, escaping its punctuation", () => {
    const s = slot("abc", new Date(Date.UTC(2026, 9, 8, 18, 0)), { location: "CHM 2201, room B" });
    const ics = toIcs(s, "Aldol; step 2", new Date(Date.UTC(2026, 9, 7, 12, 0)));
    expect(ics).toContain("DTSTART:20261008T180000Z");
    expect(ics).toContain("DTEND:20261008T183000Z");
    expect(ics).toContain("SUMMARY:Office hours with Kai Walsh");
    expect(ics).toContain("LOCATION:CHM 2201\\, room B");
    expect(ics).toContain("DESCRIPTION:Aldol\\; step 2");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
