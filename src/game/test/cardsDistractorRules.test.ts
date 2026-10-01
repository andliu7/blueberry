/**
 * Round 5 pins on the predict step's wrong options, beside the round 2 to 4
 * pins in cardsRun.test.ts (which are unchanged). Each names the critic
 * finding it stops from coming back. Rules 5 to 7 are in the header of
 * scripts/build_card_distractors.py.
 */

import { describe, expect, it } from "vitest";
import { REACTIONS } from "../../data/reactions";
import { PREDICT_ANSWERS, PREDICT_DISTRACTORS, PREDICT_GAPS } from "../cards/predictDistractors.generated";

const PREDICTED = REACTIONS.filter((reaction) => !PREDICT_GAPS.includes(reaction.id));

/** Carbons in a SMILES string; Cl, Ca, Cu, Cr and Co are not carbon. */
function smilesCarbons(smiles: string): number {
  return (smiles.match(/Cl|Ca|Cu|Cr|Co|C|c/g) ?? []).filter((atom) => atom === "C" || atom === "c").length;
}

/** Net charge read off the SMILES text: every + or - sits inside a bracket atom. */
function textCharge(smiles: string): number {
  let net = 0;
  for (const atom of smiles.match(/\[[^\]]*\]/g) ?? []) {
    const sign = atom.match(/([+-])(\d*)\]$/);
    if (sign === null) continue;
    const size = sign[2] === "" ? 1 : Number(sign[2]);
    net += sign[1] === "+" ? size : -size;
  }
  return net;
}

/** The same characters in another order: "C=CC(Br)C" is "C=CC(C)Br". */
function sameSpecies(a: string, b: string): boolean {
  return [...a].sort().join("") === [...b].sort().join("");
}

const reagentsOf = (reaction: (typeof REACTIONS)[number]) => reaction.stages.flatMap((stage) => stage.reagents).sort();

describe("no option class only the wrong options carry (rule 5)", () => {
  /* ROUND 3 CRITIC: answers were never charged and never enols, while two
     wrong options were alkoxides and six were enols, so "never pick the
     charged one or the enol" scored 0.45 blind against 0.33. A class that only
     wrong options carry, anywhere in the deck, is that tell. */
  /* ROUND 4 CRITIC: the next class over. Every ether the start lacked sat
     on a wrong option ("on-oxygen"), none on an answer: 0.38 blind. The
     generator writes newEther from RDKit (an ether O the starts do not have). */
  type Option = { readonly charge: number; readonly enol: boolean; readonly newEther: boolean };
  const classes = {
    charged: (option: Option) => option.charge !== 0,
    "enol, enolate or enamine": (option: Option) => option.enol,
    "a new ether": (option: Option) => option.newEther,
  } as const;

  it("states every option's new-ether class, answer included", () => {
    for (const reaction of PREDICTED) {
      expect(typeof PREDICT_ANSWERS[reaction.id]?.newEther, reaction.id).toBe("boolean");
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) expect(typeof d.newEther, d.smiles).toBe("boolean");
    }
  });

  it("reads the generator's charge the same way the SMILES text does", () => {
    for (const reaction of PREDICTED) {
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) expect(d.charge, d.smiles).toBe(textCharge(d.smiles));
      expect(PREDICT_ANSWERS[reaction.id]?.charge, reaction.id).toBe(textCharge(reaction.product));
    }
  });

  for (const [name, has] of Object.entries(classes)) {
    it(`never lets only wrong options be ${name}`, () => {
      let answers = 0;
      let wrong = 0;
      let avoidScore = 0;
      for (const reaction of PREDICTED) {
        const answer = PREDICT_ANSWERS[reaction.id]!;
        const options = [answer, ...(PREDICT_DISTRACTORS[reaction.id] ?? [])];
        const flagged = options.map((option) => has(option));
        if (flagged[0]) answers += 1;
        wrong += flagged.slice(1).filter(Boolean).length;
        // "Never pick one of these": guess among the rest (all three if all are flagged).
        const kept = flagged.filter((flag) => !flag).length;
        avoidScore += flagged[0] ? (kept === 0 ? 1 / 3 : 0) : 1 / kept;
      }
      if (wrong > 0) expect(answers, `${wrong} wrong options are ${name}, no answer is`).toBeGreaterThan(0);
      const bound = 1 / 3 + 2 * Math.sqrt((1 / 3) * (2 / 3) / PREDICTED.length);
      expect(avoidScore / PREDICTED.length, `avoid ${name}`).toBeLessThanOrEqual(bound);
    });
  }
});

describe("no wrong option the card itself makes (rule 6)", () => {
  it("never marks wrong a species the balance releases, or the product of the same experiment on another card", () => {
    for (const reaction of PREDICTED) {
      const twins = REACTIONS.filter(
        (other) =>
          other.reactants.join(".") === reaction.reactants.join(".") &&
          reagentsOf(other).join(".") === reagentsOf(reaction).join("."),
      );
      // ownProducts is RDKit-canonical; the registry writes SMILES its own
      // way, so this checks each listed species is there by its characters
      // (an exact canonical match is not available without RDKit here).
      const listed = PREDICT_ANSWERS[reaction.id]?.ownProducts ?? [];
      for (const species of [...reaction.balance_rhs, ...twins.map((other) => other.product)]) {
        expect(listed.some((own) => sameSpecies(own, species)), `${reaction.id} lists ${species}`).toBe(true);
      }
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) expect(listed, reaction.id).not.toContain(d.smiles);
    }
  });

  it("does not mark the NBS card's other allyl end wrong: its own radical makes it", () => {
    // Non-vacuous: the generator derived it as the card's own product.
    expect(PREDICT_ANSWERS["nbs-allylic"]?.ownProducts).toContain("CC=CCBr");
    expect((PREDICT_DISTRACTORS["nbs-allylic"] ?? []).map((d) => d.smiles)).not.toContain("CC=CCBr");
  });
});

describe("no wrong option that needs a reagent the card lacks (rule 7)", () => {
  it("holds no more carbon than the starts and consumed reagents supply, unless the card's reagent acts twice", () => {
    for (const reaction of PREDICTED) {
      const consumed = reaction.balance_lhs.filter((s) => !reaction.reactants.some((r) => sameSpecies(r, s)));
      const supply = [...reaction.reactants, ...consumed].reduce((sum, s) => sum + smilesCarbons(s), 0);
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) {
        if (d.kind === "over") continue;
        expect(smilesCarbons(d.smiles), `${reaction.id}: ${d.smiles}`).toBeLessThanOrEqual(supply);
      }
    }
    // The round 3 filler: the ethylene ketal, carbons from a diol the card never shows.
    expect((PREDICT_DISTRACTORS["grignard-addition-ketone"] ?? []).map((d) => d.smiles)).not.toContain("CC1(c2ccccc2)OCCO1");
  });

  it("offers a reduction only with a reductant and an oxidation only with an oxidant", () => {
    for (const reaction of PREDICTED) {
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) {
        if (d.kind === "reduced") expect(reaction.redox && reaction.reaction_type.includes("reduction"), reaction.id).toBe(true);
        if (d.kind === "unsaturated" || d.kind === "oxidised") {
          expect(reaction.redox && reaction.reaction_type.includes("oxidation"), reaction.id).toBe(true);
        }
      }
    }
  });

  /* ROUND 4 CRITIC: rule 7 gated redox by edit KIND, so an "on-oxygen" move
     that leaves the attacked carbonyl carbon with an H it never had (the
     methyl ether of 1-phenylethanol on the Grignard card) passed as a
     non-redox edit. The generator now maps each start's C=O carbon into the
     option with RDKit and writes carbonylGainsH; on a card with no reductant
     it must be false. */
  it("never gives a start's carbonyl carbon an H the card has no reductant for", () => {
    for (const reaction of PREDICTED) {
      const reductant = reaction.redox && reaction.reaction_type.includes("reduction");
      for (const d of PREDICT_DISTRACTORS[reaction.id] ?? []) {
        expect(typeof d.carbonylGainsH, d.smiles).toBe("boolean");
        if (!reductant) expect(d.carbonylGainsH, `${reaction.id}: ${d.smiles}`).toBe(false);
      }
    }
    // The four the critic named, by structure.
    const all = Object.values(PREDICT_DISTRACTORS).flat().map((d) => d.smiles);
    for (const named of ["COC(C)c1ccccc1", "CCOCC=O", "CC#COCc1ccccc1", "N#COCc1ccccc1"]) {
      expect(all, named).not.toContain(named);
    }
  });
});
