/**
 * Wave 2 rewards (owner picks, 20 Oct): XP that visibly moves, the C1 chest
 * flow, and the daily quests on the Feed. Every number is the economy's; these
 * pins check the screens read it rather than work out their own.
 */

import { describe, expect, it } from "vitest";
import { CHEST_REWARD, questsFor } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { hudModel } from "../app/ui/hudModel";
import { PATHWAY_UNITS, unitCheckpointNode } from "../demo/pathwayMap";
import {
  TAPS_TO_OPEN,
  chestFlow,
  counterSteps,
  dismissOffer,
  earnChestForClear,
  finishPlay,
  openAll,
  openSaved,
  paidHeadline,
  playChest,
  resetChestFlow,
  sectionChestFor,
  tapChest,
  tapHint,
  watchEarnedChests,
} from "../chest/chestFlow";
import { dailyQuestRows } from "../tabs/feed/feedModel";

function freshStore() {
  const store = createLocalProgress();
  store.reset();
  return store;
}

const lessonIds = PATHWAY_UNITS.flatMap((unit) => unit.nodes)
  .filter((node) => node.role !== "quiz")
  .map((node) => node.id);

describe("XP that visibly moves after a lesson", () => {
  it("raises the total, the bar and the line the top bar draws", () => {
    const store = freshStore();
    const before = hudModel(store.getSnapshot().economy).stage;
    store.clearNode(lessonIds[0]!, "concept", { flawless: true, spine: true });
    const after = hudModel(store.getSnapshot().economy).stage;
    expect(after.total).toBeGreaterThan(before.total);
    expect(after.barLabel).not.toBe(before.barLabel);
    expect(after.barLabel).toMatch(/^\d+ XP to the next stage!$/);
    expect(after.barLabel).not.toMatch(/\//);
  });

  it("moves on a replay too, so finishing a lesson again is never a dead end", () => {
    const store = freshStore();
    store.clearNode(lessonIds[0]!, "concept");
    const once = hudModel(store.getSnapshot().economy).stage.total;
    store.clearNode(lessonIds[0]!, "concept");
    expect(hudModel(store.getSnapshot().economy).stage.total).toBeGreaterThan(once);
  });
});

describe("the C1 chest: three taps", () => {
  it("opens on the third tap and not before", () => {
    let taps = 0;
    const seen: boolean[] = [];
    for (let i = 0; i < TAPS_TO_OPEN; i++) {
      const next = tapChest(taps, false);
      taps = next.taps;
      seen.push(next.opens);
    }
    expect(seen).toEqual([false, false, true]);
    expect(tapHint(0)).toBe("Tap the chest");
    expect(tapHint(1)).toBe("Again!");
    expect(tapHint(2)).toBe("One more!");
  });

  it("opens on the first tap under reduced motion", () => {
    expect(tapChest(0, true).opens).toBe(true);
  });

  it("counts the counter up one diamond at a time and ends on the true total", () => {
    expect(counterSteps(100, 15)).toEqual([103, 106, 109, 112, 115]);
    expect(counterSteps(0, 7).at(-1)).toBe(7);
  });

  it("says what it paid, and never a payout for a chest already open", () => {
    expect(paidHeadline({ diamonds: 50, xp: 20 })).toBe("+50 diamonds and +20 XP");
    expect(paidHeadline({ diamonds: 1, xp: 0 })).toBe("+1 diamond");
    expect(paidHeadline({ diamonds: 0, xp: 0 })).toBe("Already opened");
  });
});

describe("chests are earned and saved", () => {
  it("offers the daily gift the moment it is saved, and saving keeps it", () => {
    resetChestFlow();
    const store = freshStore();
    const stop = watchEarnedChests(store);
    store.claimDailyGift();
    stop();
    expect(chestFlow.getState().offer).toHaveLength(1);
    dismissOffer();
    expect(chestFlow.getState().offer).toHaveLength(0);
    expect(store.getSnapshot().economy.chests.saved).toHaveLength(1);
  });

  it("opens a saved chest for its fixed reward, once", () => {
    const store = freshStore();
    store.claimDailyGift();
    const id = store.getSnapshot().economy.chests.saved[0]!.id;
    const balance = store.getSnapshot().economy.diamonds.balance;
    expect(openSaved(store, [id]).diamonds).toBe(CHEST_REWARD.daily_gift.diamonds);
    expect(store.getSnapshot().economy.diamonds.balance).toBe(balance + CHEST_REWARD.daily_gift.diamonds);
    expect(store.getSnapshot().economy.chests.saved).toHaveLength(0);
    expect(openSaved(store, [id]).diamonds).toBe(0);
  });

  it("opens every saved chest at once", () => {
    const store = freshStore();
    store.claimOnboardingGift();
    store.claimDailyGift();
    const paid = openAll(store);
    expect(paid.diamonds).toBe(CHEST_REWARD.onboarding_gift.diamonds + CHEST_REWARD.daily_gift.diamonds);
    expect(paid.xp).toBe(CHEST_REWARD.onboarding_gift.xp);
    expect(store.getSnapshot().economy.chests.saved).toHaveLength(0);
  });

  it("saves a section's chest when its final is cleared, and only then", () => {
    const store = freshStore();
    const checkpoint = unitCheckpointNode(PATHWAY_UNITS.find((unit) => unit.nodes.length > 0)!);
    expect(sectionChestFor(checkpoint.id)).not.toBeNull();
    expect(sectionChestFor(lessonIds[0]!)).toBeNull();
    store.clearNode(checkpoint.id, "concept");
    earnChestForClear(store, checkpoint.id);
    expect(store.getSnapshot().economy.chests.saved.map((chest) => chest.id)).toEqual([sectionChestFor(checkpoint.id)]);
  });

  it("plays one opening at a time", () => {
    resetChestFlow();
    const first = { detail: "a", open: () => ({ diamonds: 0, xp: 0 }) };
    playChest(first);
    playChest({ detail: "b", open: () => ({ diamonds: 0, xp: 0 }) });
    expect(chestFlow.getState().play).toBe(first);
    finishPlay();
    expect(chestFlow.getState().play).toBeNull();
  });
});

describe("the daily quests on the Feed", () => {
  it("are the economy's three: two recurring, then today's rotating one", () => {
    const store = freshStore();
    const snapshot = store.getSnapshot().economy;
    const rows = dailyQuestRows(snapshot);
    expect(rows.map((row) => row.id)).toEqual(snapshot.quests.list.map((quest) => quest.id));
    expect(rows).toHaveLength(3);
    expect(rows.slice(0, 2).map((row) => row.id)).toEqual(["lessons", "train"]);
    expect(rows[2]!.id).toBe(questsFor(snapshot.quests.date)[2]!.id);
    expect(rows.every((row) => !row.done && row.fraction === 0)).toBe(true);
  });

  it("fill as lessons are finished, and finishing one earns its chest", () => {
    const store = freshStore();
    for (const id of lessonIds.slice(0, 3)) store.clearNode(id, "concept");
    const snapshot = store.getSnapshot().economy;
    const lessons = dailyQuestRows(snapshot).find((row) => row.id === "lessons")!;
    expect(lessons.done).toBe(true);
    expect(lessons.reading).toBe("3 / 3");
    expect(snapshot.chests.saved.map((chest) => chest.id)).toContain(lessons.chestId);
    expect(dailyQuestRows(snapshot).find((row) => row.id === "train")!.reading).toMatch(/ min$/);
  });
});
