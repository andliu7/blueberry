/**
 * The reaction table and its search functions.
 *
 * Three groups of tests, and the third is the one that matters most.
 *
 *   THE TABLE. Every row imports, which means every row passed
 *   `createReaction`, and the counts Phase 3 asks to see are printed.
 *
 *   THE SEARCH. Each axis does what its header claims, including the negative
 *   half: an empty query matches nothing rather than everything, and a reagent
 *   search is exact rather than substring.
 *
 *   THE NEAR MISS PAIRS. `docs/COURSE-OUTLINE-ORGO2.md` section 6 lists ten
 *   reagent pairs that must never merge into one equivalence group, and says
 *   why: "merging any of them into one equivalence group deletes the lesson".
 *   Each pair below is a test named after the outline's own row. They are
 *   written as negative assertions on purpose. A positive test that PCC finds
 *   the aldehyde row stays green when PCC also finds the acid row, and the
 *   whole point of the pair is the second half.
 */

import { describe, expect, it } from "vitest";
import { EQUIVALENCE_GROUPS, equivalenceGroupCount } from "../src/reactions/groups.ts";
import { createReaction } from "../src/reactions/reaction.ts";
import {
  reactionById,
  reactionsForTopic,
  searchByClass,
  searchByName,
  searchByProductClass,
  searchByReagent,
  searchBySubstrateClass,
  searchReactions,
} from "../src/reactions/search.ts";
import { REACTIONS, reactionCoverage } from "../src/reactions/table.ts";
import { topicDefinition } from "../src/placement.ts";

/** Ids of the rows a search returned, for readable assertions. */
function ids(reactions: readonly { readonly id: string }[]): readonly string[] {
  return reactions.map((reaction) => reaction.id);
}

describe("the reaction table", () => {
  it("imports, which means every row passed the constructor", () => {
    expect(REACTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it("has unique reaction ids", () => {
    expect(new Set(REACTIONS.map((reaction) => reaction.id)).size).toBe(REACTIONS.length);
  });

  it("files every row on a topic in the 46 topic pathway graph", () => {
    for (const reaction of REACTIONS) {
      expect(() => topicDefinition(reaction.topic)).not.toThrow();
    }
  });

  it("derives act and course from the topic rather than authoring them twice", () => {
    for (const reaction of REACTIONS) {
      const topic = topicDefinition(reaction.topic);
      expect(reaction.course, reaction.id).toBe(topic.course);
      expect(reaction.act, reaction.id).toBe(topic.act);
    }
  });

  it("gives every row at least one reagent slot, one substrate class and one product class", () => {
    for (const reaction of REACTIONS) {
      expect(reaction.reagents.length, reaction.id).toBeGreaterThan(0);
      expect(reaction.substrateClasses.length, reaction.id).toBeGreaterThan(0);
      expect(reaction.productClasses.length, reaction.id).toBeGreaterThan(0);
    }
  });

  it("says what every condition decides, because the outline makes conditions answer determining", () => {
    for (const reaction of REACTIONS) {
      for (const condition of reaction.conditions) {
        expect(condition.decides.trim(), `${reaction.id}/${condition.dimension}`).not.toBe("");
      }
    }
  });

  it("resolves every group backed slot to that group's members and nothing else", () => {
    for (const reaction of REACTIONS) {
      for (const slot of reaction.reagents) {
        if (slot.group === undefined) continue;
        expect([...slot.anyOf], `${reaction.id}/${slot.role}`).toEqual([
          ...EQUIVALENCE_GROUPS[slot.group].members,
        ]);
      }
    }
  });

  it("uses every equivalence group it declares, so the group list does not only grow", () => {
    const used = new Set(
      REACTIONS.flatMap((reaction) =>
        reaction.reagents.map((slot) => slot.group).filter((group) => group !== undefined),
      ),
    );
    const unused = Object.keys(EQUIVALENCE_GROUPS).filter((id) => !used.has(id as never));
    expect(unused, "an equivalence group no row uses equates nothing").toEqual([]);
    expect(used.size).toBe(equivalenceGroupCount());
  });

  it("reports coverage, including the topics deliberately left empty", () => {
    const coverage = reactionCoverage();
    console.log(
      `reactions: ${coverage.reactions} rows, ` +
        `by act ${JSON.stringify(coverage.byAct)}, ` +
        `${Object.keys(coverage.byTopic).length} topics with rows, ` +
        `${coverage.topicsWithNoRows.length} topics with none`,
    );
    console.log(`rows by topic: ${JSON.stringify(coverage.byTopic)}`);
    expect(coverage.reactions).toBe(REACTIONS.length);
    // The seed targets Act 1 and Act 2. Both must be genuinely covered.
    expect(coverage.byAct["act_1"] ?? 0).toBeGreaterThanOrEqual(20);
    expect(coverage.byAct["act_2"] ?? 0).toBeGreaterThanOrEqual(10);
  });

  it("throws with the row id when a row is malformed", () => {
    expect(() =>
      createReaction({
        id: "broken-slot-names-both",
        name: "Broken",
        transformation: "Nothing becomes nothing.",
        substrateClasses: ["alkene"],
        productClasses: ["alkane"],
        reagents: [{ role: "oxidant", group: "ox_stop_at_aldehyde", anyOf: ["PCC"] }],
        conditions: [],
        topic: "epoxides",
      }),
    ).toThrow(/broken-slot-names-both/);
  });

  it("refuses a condition that does not say what it decides", () => {
    expect(() =>
      createReaction({
        id: "broken-condition",
        name: "Broken",
        transformation: "Nothing becomes nothing.",
        substrateClasses: ["alkene"],
        productClasses: ["alkane"],
        reagents: [{ role: "oxidant", anyOf: ["PCC"] }],
        conditions: [{ dimension: "temperature", value: "cold", decides: "  " }],
        topic: "epoxides",
      }),
    ).toThrow(/decides/);
  });

  it("refuses a row filed on a topic the pathway graph does not know", () => {
    expect(() =>
      createReaction({
        id: "broken-topic",
        name: "Broken",
        transformation: "Nothing becomes nothing.",
        substrateClasses: ["alkene"],
        productClasses: ["alkane"],
        reagents: [{ role: "oxidant", anyOf: ["PCC"] }],
        conditions: [],
        topic: "not_a_topic" as never,
      }),
    ).toThrow(/Unknown topic id/);
  });
});

describe("searching by reagent", () => {
  it("is case and whitespace insensitive, because a student types what they remember", () => {
    expect(ids(searchByReagent("nabh4"))).toEqual(ids(searchByReagent("  NaBH4 ")));
    expect(searchByReagent("nabh4").length).toBeGreaterThan(0);
  });

  it("is exact rather than substring, so H2 does not drag in every H2SO4 reaction", () => {
    const hydrogen = ids(searchByReagent("H2"));
    expect(hydrogen).toContain("nitroarene-reduction-to-aniline");
    expect(hydrogen).not.toContain("eas-nitration");
    expect(hydrogen).not.toContain("fischer-esterification");
  });

  it("applies the equivalence group: AlBr3 finds what the textbook wrote with FeBr3", () => {
    const viaAluminium = ids(searchByReagent("AlBr3"));
    const viaIron = ids(searchByReagent("FeBr3"));
    expect(viaAluminium).toEqual(viaIron);
    expect(viaAluminium).toContain("eas-halogenation");
    expect(viaAluminium).toContain("friedel-crafts-acylation");
  });

  it("lets one reagent belong to two groups, because equivalence is per reaction type", () => {
    // SOCl2 activates an alcohol to a chloride and an acid to an acyl chloride.
    // Those are two jobs and two groups, and a global reagent to group map could
    // not hold both.
    const thionyl = ids(searchByReagent("SOCl2"));
    expect(thionyl).toContain("alcohol-to-alkyl-chloride-socl2");
    expect(thionyl).toContain("acid-to-acyl-chloride");
  });

  it("returns nothing for an empty query, rather than everything", () => {
    expect(searchByReagent("")).toEqual([]);
    expect(searchByReagent("   ")).toEqual([]);
  });

  it("returns the same order every time", () => {
    expect(ids(searchByReagent("KMnO4"))).toEqual(ids(searchByReagent("KMnO4")));
    expect(ids(searchByReagent("KMnO4"))).toEqual([...ids(searchByReagent("KMnO4"))].sort());
  });
});

describe("searching by substrate and product class", () => {
  it("reaches a specific class from the general word, with no hierarchy modelled", () => {
    const alcohols = ids(searchBySubstrateClass("alcohol"));
    expect(alcohols).toContain("primary-alcohol-to-aldehyde");
    expect(alcohols).toContain("secondary-alcohol-to-ketone");
  });

  it("separates the two directions", () => {
    expect(ids(searchByProductClass("aldehyde"))).toContain("primary-alcohol-to-aldehyde");
    expect(ids(searchBySubstrateClass("aldehyde"))).not.toContain("primary-alcohol-to-aldehyde");
  });

  it("searches either end when the student does not know which end they have", () => {
    const either = ids(searchByClass("epoxide"));
    expect(either).toContain("alkene-epoxidation-peracid");
    expect(either).toContain("epoxide-opening-basic");
  });

  it("returns nothing for an empty query", () => {
    expect(searchByClass("")).toEqual([]);
  });
});

describe("searching by name and alias", () => {
  it("finds a reaction from a half remembered name", () => {
    expect(ids(searchByName("kishner"))).toContain("aryl-ketone-to-alkyl-arene");
    expect(ids(searchByName("Diels"))).toContain("diels-alder");
  });

  it("finds a reaction from an alias nobody put in the name", () => {
    expect(ids(searchByName("Gilman"))).toContain("cuprate-acyl-chloride-to-ketone");
    expect(ids(searchByName("saponification"))).toContain("ester-saponification");
  });

  it("returns nothing for an empty query", () => {
    expect(searchByName("")).toEqual([]);
  });
});

describe("the combined search", () => {
  it("records which axes a row matched on", () => {
    const matches = searchReactions("Grignard");
    expect(matches.length).toBeGreaterThan(0);
    const first = matches[0];
    expect(first?.matchedOn.length).toBeGreaterThan(0);
  });

  it("orders name matches before reagent matches before class matches", () => {
    const matches = searchReactions("epoxide");
    const bestAxes = matches.map((match) => match.matchedOn[0]);
    const firstClass = bestAxes.indexOf("class");
    const lastName = bestAxes.lastIndexOf("name");
    if (firstClass !== -1 && lastName !== -1) expect(lastName).toBeLessThan(firstClass);
  });

  it("is deterministic", () => {
    expect(searchReactions("alcohol").map((m) => m.reaction.id)).toEqual(
      searchReactions("alcohol").map((m) => m.reaction.id),
    );
  });

  it("returns nothing for an empty query", () => {
    expect(searchReactions("  ")).toEqual([]);
  });
});

describe("topic lookup and direct lookup", () => {
  it("lists the rows filed under one topic", () => {
    expect(ids(reactionsForTopic("epoxides")).length).toBeGreaterThanOrEqual(4);
  });

  it("throws on an id the table does not carry", () => {
    expect(() => reactionById("no-such-reaction")).toThrow(/No reaction with id/);
  });
});

/**
 * The ten pairs from `docs/COURSE-OUTLINE-ORGO2.md` section 6, "Near miss pairs
 * that must never merge". Each test is named after its row in that table.
 */
describe("near miss pairs that must never merge", () => {
  it("PCC or PDC versus Jones or chromic acid: stops at the aldehyde versus goes to the acid", () => {
    const stopsAtAldehyde = ids(searchByReagent("PCC"));
    expect(stopsAtAldehyde).toContain("primary-alcohol-to-aldehyde");
    expect(stopsAtAldehyde).not.toContain("primary-alcohol-to-carboxylic-acid");

    const goesToAcid = ids(searchByReagent("Jones"));
    expect(goesToAcid).toContain("primary-alcohol-to-carboxylic-acid");
    expect(goesToAcid).not.toContain("primary-alcohol-to-aldehyde");

    // And the same statement made about the data rather than about a search:
    // no slot on any row carries a member of both oxidant groups.
    for (const reaction of REACTIONS) {
      for (const slot of reaction.reagents) {
        const tokens = new Set(slot.anyOf);
        expect(tokens.has("PCC") && tokens.has("Jones"), `${reaction.id}/${slot.role}`).toBe(false);
      }
    }
  });

  it("RMgX versus R2CuLi: 1,2 addition versus 1,4 addition", () => {
    const cuprate = ids(searchByReagent("R2CuLi"));
    expect(cuprate).toContain("cuprate-conjugate-addition");
    expect(cuprate).not.toContain("grignard-1-2-addition-to-enone");

    const grignard = ids(searchByReagent("CH3MgBr"));
    expect(grignard).toContain("grignard-1-2-addition-to-enone");
    expect(grignard).not.toContain("cuprate-conjugate-addition");
  });

  it("NaOH versus a bulky alkoxide: Zaitsev versus Hofmann alkene", () => {
    const small = ids(searchByReagent("NaOH"));
    expect(small).toContain("e2-zaitsev");
    expect(small).not.toContain("e2-hofmann");

    const bulky = ids(searchByReagent("KOtBu"));
    expect(bulky).toContain("e2-hofmann");
    expect(bulky).not.toContain("e2-zaitsev");
  });

  it("HBr versus HBr with peroxide: Markovnikov versus anti-Markovnikov", () => {
    // The reagent token is genuinely shared, so this pair is separated by the
    // initiator slot and by the regime, not by the acid. Both halves are asserted.
    const acid = ids(searchByReagent("HBr"));
    expect(acid).toContain("hydrohalogenation-markovnikov");
    expect(acid).toContain("hydrobromination-anti-markovnikov");

    const peroxide = ids(searchByReagent("ROOR"));
    expect(peroxide).toContain("hydrobromination-anti-markovnikov");
    expect(peroxide).not.toContain("hydrohalogenation-markovnikov");

    // Two rows, never one merged row with a shrugging condition.
    expect(reactionById("hydrohalogenation-markovnikov").productClasses).not.toEqual(
      reactionById("hydrobromination-anti-markovnikov").productClasses,
    );
  });

  it("LDA at low temperature versus alkoxide at room temperature: kinetic versus thermodynamic enolate", () => {
    const cold = ids(searchByReagent("LDA"));
    expect(cold).toContain("kinetic-enolate-formation");
    expect(cold).not.toContain("thermodynamic-enolate-formation");

    const warm = ids(searchByReagent("NaOEt"));
    expect(warm).toContain("thermodynamic-enolate-formation");
    expect(warm).not.toContain("kinetic-enolate-formation");

    const kinetic = reactionById("kinetic-enolate-formation");
    expect(kinetic.conditions.some((c) => c.dimension === "temperature")).toBe(true);
  });

  it("NaBH4 versus LiAlH4: equivalent only on aldehydes and ketones", () => {
    const borohydride = ids(searchByReagent("NaBH4"));
    expect(borohydride).toContain("carbonyl-reduction-to-alcohol");
    expect(borohydride).not.toContain("ester-reduction-to-primary-alcohol");

    const lah = ids(searchByReagent("LiAlH4"));
    expect(lah).toContain("carbonyl-reduction-to-alcohol");
    expect(lah).toContain("ester-reduction-to-primary-alcohol");

    // The group that equates them carries the boundary in writing.
    expect(EQUIVALENCE_GROUPS.hydride_simple_carbonyl.caveat).toBeDefined();
  });

  it("epoxide under acid versus under base: opposite regiochemistry on the same substrate", () => {
    const basic = ids(searchByReagent("NaOMe"));
    expect(basic).toContain("epoxide-opening-basic");
    expect(basic).not.toContain("epoxide-opening-acidic");

    const acidic = ids(searchByReagent("H3O+"));
    expect(acidic).toContain("epoxide-opening-acidic");
    expect(acidic).not.toContain("epoxide-opening-basic");
  });

  it("one equivalent versus excess alcohol: hemiacetal versus acetal", () => {
    // Same reagents on purpose. Stoichiometry is what separates them, so the
    // assertion is on the conditions rather than on the reagent search.
    const alcohol = ids(searchByReagent("CH3OH"));
    expect(alcohol).toContain("hemiacetal-formation");
    expect(alcohol).toContain("acetal-formation");

    const hemiacetal = reactionById("hemiacetal-formation");
    const acetal = reactionById("acetal-formation");
    const stoich = (id: string, row: typeof hemiacetal): string => {
      const found = row.conditions.find((c) => c.dimension === "stoichiometry");
      if (found === undefined) throw new Error(`${id} records no stoichiometry condition`);
      return found.value;
    };
    expect(stoich("hemiacetal-formation", hemiacetal)).not.toBe(
      stoich("acetal-formation", acetal),
    );
    expect(hemiacetal.productClasses).not.toEqual(acetal.productClasses);
  });

  it("acid chloride plus one equivalent cuprate versus two equivalents of RMgX: ketone versus tertiary alcohol", () => {
    const cuprate = ids(searchByReagent("Me2CuLi"));
    expect(cuprate).toContain("cuprate-acyl-chloride-to-ketone");
    expect(cuprate).not.toContain("grignard-double-addition-to-ester");

    const grignard = ids(searchByReagent("RMgX"));
    expect(grignard).toContain("grignard-double-addition-to-ester");
    expect(grignard).not.toContain("cuprate-acyl-chloride-to-ketone");

    expect(reactionById("cuprate-acyl-chloride-to-ketone").productClasses).toContain("ketone");
    expect(reactionById("grignard-double-addition-to-ester").productClasses).toContain(
      "tertiary alcohol",
    );
  });

  it("NBS versus Br2 with a Lewis acid: benzylic radical position versus the ring", () => {
    const nbs = ids(searchByReagent("NBS"));
    expect(nbs).toContain("nbs-benzylic-bromination");
    expect(nbs).toContain("nbs-allylic-bromination");
    expect(nbs).not.toContain("eas-halogenation");

    const lewisAcid = ids(searchByReagent("FeBr3"));
    expect(lewisAcid).toContain("eas-halogenation");
    expect(lewisAcid).not.toContain("nbs-benzylic-bromination");
    expect(lewisAcid).not.toContain("nbs-allylic-bromination");
  });
});
