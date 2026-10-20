/**
 * The store's side of the owner's 2026-10-20 economy: gifts, saved chests,
 * "open all", and the section final price at the charge sheet. The rules live
 * in packages/economy and are tested there; these pin that the API the HUD
 * and chest UI call journals the right events and reads the right numbers.
 *
 * Runs in node with no window, so no beta flag is on and no synthetic
 * node_cleared event reaches the journal (the DEV flags trap).
 */

import { describe, expect, it } from "vitest";
import { CHARGE_COST, CHARGE_ENTRY_COST, CHEST_REWARD, deriveEconomy } from "@blueberry/economy";
import { createLocalProgress } from "../app/progress";
import { chargeEntryOf, chargeGateModel } from "../charge/chargeGateModel";
import { isSectionFinal, PATHWAY_UNITS, unitCheckpointNode } from "../demo/pathwayMap";

function freshStore() {
  const store = createLocalProgress();
  store.reset();
  return store;
}

describe("the gifts", () => {
  it("saves the onboarding gift once, ever", () => {
    const store = freshStore();
    const first = store.claimOnboardingGift();
    expect(first?.chestsEarned.map((chest) => chest.source)).toEqual(["onboarding_gift"]);
    expect(store.claimOnboardingGift()).toBeNull();
    expect(store.getSnapshot().journal.filter((event) => event.kind === "chest_earned")).toHaveLength(1);
    expect(store.getSnapshot().economy.chests.saved).toHaveLength(1);
  });

  it("saves one daily gift for today and journals nothing on a second open", () => {
    const store = freshStore();
    expect(store.claimDailyGift()?.chestsEarned.map((chest) => chest.source)).toEqual(["daily_gift"]);
    expect(store.claimDailyGift()).toBeNull();
    expect(store.getSnapshot().journal).toHaveLength(1);
  });
});

describe("saved chests", () => {
  it("open one by one or all at once, and every diamond reaches the balance", () => {
    const store = freshStore();
    store.claimOnboardingGift();
    store.claimDailyGift();
    store.earnSectionChest("u1-chest-a");
    const before = store.getSnapshot().economy;
    expect(before.chests.saved).toHaveLength(3);
    const promised = before.chests.savedReward;
    expect(promised.diamonds).toBe(
      CHEST_REWARD.onboarding_gift.diamonds + CHEST_REWARD.daily_gift.diamonds + CHEST_REWARD.section_final.diamonds,
    );

    const one = store.openChest(before.chests.saved[0]!.id);
    expect(one).toBe(CHEST_REWARD.onboarding_gift.diamonds);
    const rest = store.openAllChests();
    expect(one + rest).toBe(promised.diamonds);

    const after = store.getSnapshot();
    expect(after.economy.chests.saved).toEqual([]);
    expect(after.economy.diamonds.balance - before.diamonds.balance).toBe(promised.diamonds);
    // The receipt the reward moment plays carries every chest "open all" opened.
    expect(after.lastReceipt?.diamonds.map((line) => line.label)).toEqual(["Daily gift", "Treasure chest"]);
    expect(store.openAllChests()).toBe(0);
  });

  it("does not save a section chest twice", () => {
    const store = freshStore();
    expect(store.earnSectionChest("u1-chest-a").chestsEarned).toHaveLength(1);
    expect(store.earnSectionChest("u1-chest-a").chestsEarned).toEqual([]);
    expect(store.getSnapshot().economy.chests.saved).toHaveLength(1);
  });

  it("still pays a pathway chest opened the old way, with no chest earned first", () => {
    const store = freshStore();
    expect(store.openChest("u1-chest-a")).toBe(CHEST_REWARD.section_final.diamonds);
    expect(store.openChest("u1-chest-a")).toBe(0);
  });
});

describe("daily quests through the store", () => {
  it("lists today's three and completes the lessons quest on the third clear", () => {
    const store = freshStore();
    expect(store.getSnapshot().economy.quests.list).toHaveLength(3);
    for (const id of ["q1", "q2", "q3"]) {
      store.startNode(id, "concept");
      store.clearNode(id, "concept");
    }
    const { economy, lastReceipt } = store.getSnapshot();
    expect(lastReceipt?.questsCompleted).toContain("lessons");
    expect(economy.quests.list[0]).toMatchObject({ id: "lessons", done: true });
    expect(economy.chests.saved.some((chest) => chest.source === "daily_quest")).toBe(true);
  });
});

describe("the section final price at the charge sheet", () => {
  const now = "2026-10-20T14:00:00.000Z";
  const unit = PATHWAY_UNITS[0]!;

  it("knows a section quiz and a unit checkpoint are finals, and a lesson is not", () => {
    const quiz = unit.nodes.find((node) => node.role === "quiz");
    const lesson = unit.nodes.find((node) => node.role !== "quiz");
    expect(quiz).toBeDefined();
    expect(isSectionFinal(quiz!)).toBe(true);
    expect(isSectionFinal(unitCheckpointNode(unit))).toBe(true);
    expect(isSectionFinal(lesson!)).toBe(false);
  });

  it("prices a final at 6 and a lesson at 3, and journals the same entry it priced", () => {
    const door = { id: "u1-quiz-a", kind: "concept" as const, title: "Checkpoint", href: "#/app/lesson/u1-quiz-a" };
    const snapshot = deriveEconomy([], now);
    expect(chargeGateModel(snapshot, door).cost).toBe(CHARGE_COST.concept);
    expect(chargeGateModel(snapshot, { ...door, final: true }).cost).toBe(CHARGE_ENTRY_COST.final);
    expect(chargeEntryOf({ ...door, final: true })).toBe("final");
    expect(chargeEntryOf({ ...door, challenge: true, final: true })).toBe("challenge");

    const store = freshStore();
    const before = store.getSnapshot().economy.charge.current;
    store.startNode(door.id, door.kind, chargeEntryOf({ ...door, final: true }));
    expect(before - store.getSnapshot().economy.charge.current).toBe(CHARGE_ENTRY_COST.final);
  });
});
