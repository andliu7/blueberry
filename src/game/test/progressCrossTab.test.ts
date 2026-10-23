// @vitest-environment jsdom

/**
 * A second tab must not erase what the first one saved (owner, item 11: "a
 * display name typed ... does not save").
 *
 * Each progress instance keeps the whole store in memory and every commit
 * writes the WHOLE object back. Before the fix nothing listened for the
 * browser's `storage` event, so a tab opened earlier still held the old store:
 * the name was set in tab B, tab A then cleared a lesson or claimed the day's
 * gift, and tab A's write put `displayName: null` back. The name was gone on
 * the next reload.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createLocalProgress } from "../app/progress";

const KEY = "blueberry.progress.v2";

beforeEach(() => {
  localStorage.clear();
});

describe("progress across two tabs", () => {
  it("keeps a name another tab saved when this tab commits afterwards", () => {
    const tabA = createLocalProgress();

    // Tab B saves the name. It writes the store the way any instance does.
    const tabB = createLocalProgress();
    tabB.setDisplayName("Ada");
    // The browser tells every OTHER tab that the key changed.
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));

    // Tab A commits something unrelated after that.
    tabA.setSettings({ reminderHour: 18 });

    const reloaded = createLocalProgress();
    expect(reloaded.getSnapshot().displayName).toBe("Ada");
  });

  it("tells this tab's subscribers when another tab writes", () => {
    const tabA = createLocalProgress();
    let heard = 0;
    tabA.subscribe(() => {
      heard += 1;
    });
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    localStorage.setItem(KEY, JSON.stringify({ ...raw, displayName: "Grace" }));
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));

    expect(heard).toBe(1);
    expect(tabA.getSnapshot().displayName).toBe("Grace");
  });

  it("ignores other keys", () => {
    const tabA = createLocalProgress();
    let heard = 0;
    tabA.subscribe(() => {
      heard += 1;
    });
    window.dispatchEvent(new StorageEvent("storage", { key: "something.else" }));
    expect(heard).toBe(0);
  });
});
