import { describe, expect, it } from "vitest";
import { REACTIONS } from "@blueberry/curriculum";
import { isWrittenFormula, slotDisplay } from "../tabs/chat/reagentDisplay";

function slotOf(name: RegExp, role: string) {
  const reaction = REACTIONS.find((r) => name.test(r.name));
  const slot = reaction?.reagents.find((s) => s.role === role);
  if (slot === undefined) throw new Error(`no ${role} slot on ${name}`);
  return slot;
}

describe("reaction card reagent display", () => {
  it("tells formulas from spelled out names", () => {
    for (const token of ["NaBH4", "PCC", "n-BuLi", "Ph3P=CH2", "LiAlH4"]) expect(isWrittenFormula(token)).toBe(true);
    for (const token of ["sodium borohydride", "pyridinium chlorochromate", "triphenylphosphine", "Wittig reagent", "ylide"]) {
      expect(isWrittenFormula(token)).toBe(false);
    }
  });

  it("never shows a synonym beside its formula as if it were another reagent", () => {
    for (const reaction of REACTIONS) {
      for (const slot of reaction.reagents) {
        const shown = slotDisplay(slot).tokens;
        expect(shown.length).toBeGreaterThan(0);
        if (slot.anyOf.some(isWrittenFormula)) expect(shown.every(isWrittenFormula)).toBe(true);
      }
    }
  });

  it("says 'or' only on a slot the curriculum groups as interchangeable", () => {
    const wittig = slotOf(/wittig/i, "ylide precursor");
    expect(wittig.group).toBeUndefined();
    expect(slotDisplay(wittig).joiner).toBeNull();
    expect(slotDisplay(wittig).tokens).not.toContain("triphenylphosphine");
    for (const reaction of REACTIONS) {
      for (const slot of reaction.reagents) {
        if (slotDisplay(slot).joiner === "or") expect(slot.group).toBeDefined();
      }
    }
  });

  it("never lists an abbreviation beside the formula it stands for", () => {
    for (const reaction of REACTIONS) {
      for (const slot of reaction.reagents) {
        const shown = slotDisplay(slot).tokens;
        expect(shown.includes("LiAlH4") && shown.includes("LAH")).toBe(false);
        expect(shown.includes("mCPBA") && shown.includes("m-CPBA")).toBe(false);
      }
    }
  });
});
