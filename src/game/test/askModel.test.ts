import { describe, expect, it } from "vitest";
import { answer, answerText, rankedReactions, STARTER_QUESTIONS, type AskState } from "../tabs/chat/askModel";

const fresh: AskState = { streak: 0, todayCounted: false, cardsDue: 0, nextLesson: "Rank carbocation stability", hasCourse: true, xpToday: 0 };

describe("Ask Bloom answers", () => {
  it("drops mid-word name hits: 'hydride' never finds 'anhydride'", () => {
    const found = rankedReactions("hydride");
    expect(found.length).toBeGreaterThan(0);
    for (const reaction of found) expect(reaction.name.toLowerCase()).not.toMatch(/anhydride/);
    expect(found[0]?.name.toLowerCase()).toMatch(/(^|[^a-z])hydride/);
  });

  it("answers a reagent question with one reaction card from the table", () => {
    const reply = answer("What does NaBH4 do?", fresh);
    expect(reply.kind).toBe("reaction");
    if (reply.kind === "reaction") {
      expect(reply.reaction.reagents.some((slot) => slot.anyOf.includes("NaBH4"))).toBe(true);
      expect(reply.others.length).toBeLessThanOrEqual(3);
      expect(reply.others).not.toContain(reply.reaction);
    }
  });

  it("reads a direction: an alcohol FROM an aldehyde, never a reaction that makes an aldehyde", () => {
    const reply = answer("how do I make an alcohol from an aldehyde", fresh);
    expect(reply.kind).toBe("reaction");
    if (reply.kind === "reaction") {
      expect(reply.reaction.substrateClasses).toContain("aldehyde");
      expect(reply.reaction.productClasses.some((klass) => klass.includes("alcohol"))).toBe(true);
    }
    const reverse = answer("aldehyde to alcohol", fresh);
    expect(reverse.kind === "reaction" && reverse.reaction.substrateClasses.includes("aldehyde")).toBe(true);
  });

  it("says plainly when no one-step reaction joins the two ends", () => {
    const reply = answer("from an epoxide to a nitroarene", fresh);
    expect(reply.kind).toBe("text");
    expect(reply.text).toMatch(/don't have a one-step reaction/);
  });

  it("study words do not hijack chemistry questions", () => {
    const grignard = answer("what lesson covers Grignard", fresh, () => "Nucleophilic addition");
    expect(grignard.kind).toBe("reaction");
    expect(grignard.text).toContain("Nucleophilic addition");
    // Teaching order: the plain carbonyl addition first, not the enone special case.
    expect(grignard.kind === "reaction" && grignard.reaction.id).toBe("organometallic-addition-to-carbonyl");
    const aldol = answer("review aldol", fresh);
    expect(aldol.kind === "reaction" && /aldol/i.test(aldol.reaction.name)).toBe(true);
  });

  it("answers the next-lesson question with the real lesson title", () => {
    const reply = answer("What should I study next?", fresh);
    expect(reply.kind).toBe("text");
    expect(reply.text).toContain("Rank carbocation stability");
  });

  it("reads cards due and streak from state, never a made-up number", () => {
    expect(answer("How many cards are due?", { ...fresh, cardsDue: 4 }).text).toContain("4 cards are due");
    expect(answer("what's my streak", { ...fresh, streak: 3, todayCounted: true }).text).toContain("3 day streak");
  });

  it("a follow-up that sends a reaction's exact name gets exactly that reaction", () => {
    const reply = answer("Alcohol to alkyl chloride with thionyl chloride", fresh);
    expect(reply.kind === "reaction" && reply.reaction.id).toBe("alcohol-to-alkyl-chloride-socl2");
  });

  it("says plainly when nothing matches", () => {
    const reply = answer("zzqx blorf", fresh);
    expect(reply.kind).toBe("text");
    expect(reply.text).toMatch(/couldn't find/);
  });

  it("every starter question gets a useful answer, not a miss", () => {
    for (const question of STARTER_QUESTIONS) {
      expect(answer(question, fresh).text).not.toMatch(/couldn't find|don't have/);
    }
  });

  it("the plain-text form carries the same reaction as the card", () => {
    const reply = answer("What does PCC do?", fresh);
    expect(reply.kind).toBe("reaction");
    if (reply.kind === "reaction") expect(answerText(reply)).toContain(reply.reaction.name);
  });
});

describe("the drawn example under a reaction card", () => {
  it("every pair points at the molecules the RDKit check ran on", async () => {
    const { REACTION_EXAMPLES, exampleFor } = await import("../tabs/chat/reactionExamples");
    const { REACTIONS } = await import("@blueberry/curriculum");
    for (const [id, pair] of Object.entries(REACTION_EXAMPLES)) {
      expect(REACTIONS.some((reaction) => reaction.id === id), id).toBe(true);
      const staged = exampleFor(id);
      expect(staged?.reactants[0], id).toBe(pair.start);
      expect(staged?.product, id).toBe(pair.product);
      expect(staged?.art.start_thumb_light, id).toBeTruthy();
      expect(staged?.art.product_thumb_light, id).toBeTruthy();
    }
  });
});
