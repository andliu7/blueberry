// @vitest-environment jsdom

/**
 * Booking on Schedule, schedule round 2: the confirmation and the sheet's focus.
 *
 * The real page and the real sheet are mounted; only the network calls are
 * replaced. What this pins:
 * - the race the round 1 critic hit: the insert succeeds but the reload that
 *   follows does not show the new booking yet. The sheet must still land on
 *   "You are booked", because the card is drawn from the insert's own row;
 * - a refused insert keeps the sheet open on the form, with the reason shown,
 *   even when the reload drops the slot because someone else took it;
 * - Escape from the sheet hands focus back to the control that opened it
 *   (WCAG 2.4.3); it used to land on BODY.
 *
 * Whether the database allows the insert is not this file's job: that is
 * `supabase/rls-tests/office_hours.sql`, against Postgres itself.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Booking, OfficeHour } from "@/lib/officeHours";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// A time budget, not a check: mounting the real page in jsdom takes seconds when
// the whole suite shares the machine, and vitest's 5s default then cuts a test
// off before its assertions run. Every assertion below is unchanged by this.
vi.setConfig({ testTimeout: 30_000 });

const net = vi.hoisted(() => ({
  load: vi.fn(),
  book: vi.fn(),
}));

vi.mock("@/lib/useSession", () => ({
  useSession: () => ({
    email: "student.one@test.local",
    name: "Student One",
    picture: null,
    role: "student",
    provider: "supabase",
    signOut: () => {},
    idToken: null,
  }),
}));
vi.mock("@/lib/calendar", () => ({
  loadDates: async () => ({ dates: [] }),
  saveDates: async () => ({ dates: [] }),
  deleteDate: async () => ({ dates: [] }),
}));
vi.mock("@/lib/officeHours", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/officeHours")>()),
  currentUserId: async () => "me",
  loadOfficeHours: net.load,
  bookOfficeHour: net.book,
}));

const tomorrowAt = (h: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, h, 0);
};
const SLOT: OfficeHour = {
  id: "s1",
  tutorId: "kai",
  tutorName: "Kai Walsh",
  start: tomorrowAt(14),
  minutes: 30,
  location: "CHM 2201",
  booked: false,
};
const NEW_BOOKING: Booking = {
  id: "b-new",
  slotId: "s1",
  studentId: "me",
  studentEmail: "student.one@test.local",
  studentName: "Student One",
  note: "",
};

let root: Root | null = null;
let host: HTMLElement | null = null;

/**
 * Waits for the page to reach a state, rather than for a fixed time: the full
 * suite runs under load, and a 20ms tick that is enough alone is not enough
 * there. `vi.waitFor` retries the check until it passes; each try first lets
 * React flush whatever has already arrived (an empty `act`), with no fixed
 * sleep inside it. It gives up after twenty seconds and the assertion that
 * follows reports what is missing.
 */
async function until(ready: () => boolean) {
  await vi
    .waitFor(
      async () => {
        await act(async () => {});
        if (!ready()) throw new Error("not there yet");
      },
      { timeout: 20_000 },
    )
    .catch(() => {});
}

async function mount() {
  const { default: SchedulePage } = await import("@/components/SchedulePage");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(createElement(SchedulePage));
  });
  // Loaded once the "Find a time" column has its slot buttons and "Book a session".
  await until(() => Boolean(host!.querySelector('.sch-slot[aria-label^="Book"]')));
}

async function press(el: Element | null | undefined, settled: () => boolean) {
  expect(el, "control to press").toBeTruthy();
  await act(async () => {
    (el as HTMLElement).focus();
    (el as HTMLElement).click();
  });
  await until(settled);
}

const sheet = () => document.querySelector(".sch-sheet");
const buttonIn = (scope: ParentNode | null, text: string) =>
  [...(scope?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.trim().startsWith(text));

// Load the page module once, outside any test's time budget: the first import
// compiles the page and its sheet, which is slow when the whole suite is running.
beforeAll(async () => {
  await import("@/components/SchedulePage");
}, 60_000);

beforeEach(() => {
  net.load.mockReset();
  net.book.mockReset();
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  document.body.innerHTML = "";
});

describe("confirming a booking", () => {
  it("shows the confirmation from the insert's own row when the reload has not caught up", async () => {
    // Every reload, including the one after the insert, returns the slot as
    // still open and no bookings: the race.
    net.load.mockResolvedValue({ slots: [SLOT], bookings: [] });
    net.book.mockResolvedValue({ ok: true, booking: NEW_BOOKING });
    await mount();

    await press(host!.querySelector('.sch-slot[aria-label^="Book"]'), () => Boolean(buttonIn(sheet(), "Confirm")));
    expect(sheet()).not.toBeNull();
    // Settled once the booking call has answered and the reload after it has run.
    await press(buttonIn(sheet(), "Confirm"), () => net.load.mock.calls.length >= 2 && !buttonIn(sheet(), "Booking"));

    expect(net.book).toHaveBeenCalledWith(expect.objectContaining({ slotId: "s1" }));
    expect(net.load.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(sheet(), "the sheet must not close silently").not.toBeNull();
    const text = sheet()!.textContent ?? "";
    expect(text).toContain("You are booked");
    expect(text).toContain("Office hours with Kai Walsh");
    expect(buttonIn(sheet(), "Add to calendar")).toBeTruthy();
  });

  it("keeps the sheet open with the reason when the insert is refused", async () => {
    net.load.mockResolvedValueOnce({ slots: [SLOT], bookings: [] });
    // After the refusal the reload no longer has the slot: someone else took it.
    net.load.mockResolvedValue({ slots: [{ ...SLOT, booked: true }], bookings: [] });
    net.book.mockResolvedValue({ ok: false, error: "Someone booked that time a moment ago. Pick another." });
    await mount();

    await press(host!.querySelector('.sch-slot[aria-label^="Book"]'), () => Boolean(buttonIn(sheet(), "Confirm")));
    await press(buttonIn(sheet(), "Confirm"), () => net.load.mock.calls.length >= 2 && !buttonIn(sheet(), "Booking"));

    expect(sheet()).not.toBeNull();
    const alert = sheet()!.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Someone booked that time a moment ago. Pick another.");
    expect(sheet()!.textContent).not.toContain("You are booked");
    expect(buttonIn(sheet(), "Confirm"), "the form stays, so the student can go back").toBeTruthy();
  });
});

describe("the sheet's focus", () => {
  it("returns focus to the control that opened it on Escape", async () => {
    net.load.mockResolvedValue({ slots: [SLOT], bookings: [] });
    await mount();

    const opener = buttonIn(host, "Book a session");
    await press(opener, () => Boolean(sheet()?.contains(document.activeElement)));
    expect(sheet()).not.toBeNull();
    expect(sheet()!.contains(document.activeElement), "focus moved into the sheet").toBe(true);

    await act(async () => {
      document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    // Radix returns focus a task after the sheet unmounts, so wait for both.
    await until(() => sheet() === null && document.activeElement === opener);

    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
