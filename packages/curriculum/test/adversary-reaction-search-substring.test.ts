/**
 * ADVERSARY FINDING: class search on "amine" also returns rows whose only match
 * is "enamine", a different and unrelated functional group.
 *
 * search.ts's own header names the exact failure mode this file goes looking
 * for: "does 'alcohol' wrongly match something like 'sulfonic alcohol' if such a
 * class exists?" No class collides with "alcohol" that way, but "amine" does
 * collide: `ChemicalClass` in reactions/types.ts includes both
 * "primary amine" / "secondary amine" / "tertiary amine" AND "enamine", and
 * "enamine" contains "amine" as a literal substring. `searchByClass` and
 * `searchReactions` match by substring with no hierarchy modelled, per that
 * file's own documented design, so a search for "amine" also returns every row
 * whose only matching class is "enamine".
 *
 * This is a real chemistry confusion and not a cosmetic one: enamine chemistry
 * (nucleophilic_addition_nitrogen, in the "Organic Chemistry II" topic ordering)
 * is nitrogen conjugated into a carbon-carbon double bond, with a completely
 * different reactivity profile from a plain amine. A student searching "amine"
 * the night before an exam, per CLAUDE.md's own framing of this feature, is
 * looking for amine basicity, amine alkylation, or reductive amination, not
 * acetal hydrolysis or enamine formation.
 */

import { describe, expect, it } from "vitest";
import { searchByClass, searchReactions } from "../src/reactions/search.ts";
import { REACTIONS } from "../src/reactions/table.ts";

describe("class search substring collision between amine and enamine", () => {
  it("returns a row whose only matching class is 'enamine' when searching 'amine'", () => {
    const matches = searchByClass("amine", REACTIONS);

    const enamineOnlyMatches = matches.filter((reaction) => {
      const classes = [...reaction.substrateClasses, ...reaction.productClasses];
      const matchedAmineFamily = classes.some((klass) => klass.toLowerCase().includes("amine"));
      // "aryl amine" added after the fix: the original list omitted it, but
      // aniline IS an amine, so a row producing one is a legitimate hit for
      // "amine" and not part of the enamine collision this file pins down.
      const matchedARealAmine = classes.some((klass) =>
        ["primary amine", "secondary amine", "tertiary amine", "aryl amine"].includes(klass),
      );
      return matchedAmineFamily && !matchedARealAmine;
    });

    // This is the failing assertion: a search for "amine" should not surface a
    // row that carries no primary, secondary or tertiary amine class at all,
    // only "enamine". Today it does.
    expect(
      enamineOnlyMatches.map((reaction) => reaction.id),
      "rows matched by 'amine' that carry no real amine class, only 'enamine'",
    ).toEqual([]);
  });

  it("shows the same collision through the combined search box", () => {
    const combined = searchReactions("amine", REACTIONS);
    const enamineFormation = combined.find((match) => match.reaction.id === "enamine-formation");
    // enamine-formation is a legitimate hit on "amine" through its secondary
    // amine reagent, so it is not part of the claim above. The row that IS
    // wrongly reachable is one whose classes carry ONLY "enamine", asserted in
    // the previous test. This test documents that the combined box exhibits the
    // same "class" axis match as the direct searchByClass call, so the defect is
    // not an artifact of calling one function over another.
    expect(enamineFormation?.matchedOn).toContain("class");
  });
});
