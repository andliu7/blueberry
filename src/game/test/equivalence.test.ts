/**
 * The owner's EAS report, turned into a test, plus the guard against the fix
 * being too generous.
 *
 * Two directions matter here and they are not symmetric in cost. Rejecting a
 * right answer is unfair and generates support mail. ACCEPTING A WRONG ONE
 * teaches bad chemistry, which CLAUDE.md treats as the more serious failure.
 * So most of this file is about the second: proving that the equivalence rule
 * merges the nitronium oxygens and nothing else.
 */

import { describe, expect, it } from "vitest";

import { createArrow, fromBond, fromLonePair, toAtom, toBondBetween } from "@blueberry/chem-core";

import { TRAINER_SEQUENCES } from "../demo/sequences";
import { canonicalArrowKey, hasEquivalentAtoms } from "../tabs/trainer/equivalence";
import { gradeDrawing } from "../tabs/trainer/grade";

const eas = TRAINER_SEQUENCES.find((s) => s.id === "seq-eas");
if (eas === undefined) throw new Error("seq-eas is missing from the corpus");
const attack = eas.steps[0]!.step;

describe("the EAS nitration step the owner reported", () => {
  it("accepts the authored arrows", () => {
    expect(gradeDrawing(attack, attack.arrows).kind).toBe("correct");
  });

  it("accepts the OTHER N=O pair, which is the bug that was reported", () => {
    // O=N(+)=O. The authored answer relieves the b-no1 pair onto o1. Pushing
    // b-no2 onto o2 is the identical move on the mirror image of the same ion,
    // and before this fix it was graded not_requested.
    const mirrored = [
      attack.arrows[0]!,
      createArrow({ id: "a-no-relief-mirror", source: fromBond("b-no2"), sink: toAtom("o2") }),
    ];
    expect(gradeDrawing(attack, mirrored).kind).toBe("correct");
  });

  it("still refuses the pair pushed onto the WRONG atom", () => {
    // Relieving the N=O bond onto nitrogen rather than oxygen is not a mirror
    // image of anything: it is wrong, and it has to stay wrong.
    const wrong = [
      attack.arrows[0]!,
      createArrow({ id: "a-onto-n", source: fromBond("b-no1"), sink: toAtom("n1") }),
    ];
    expect(gradeDrawing(attack, wrong).kind).not.toBe("correct");
  });

  it("counts drawing BOTH equivalent arrows as one too many", () => {
    // The trap in canonicalising: both arrows collapse to one key, so a set
    // comparison would call this perfect. It is one arrow over.
    const both = [
      attack.arrows[0]!,
      attack.arrows[1]!,
      createArrow({ id: "a-no-relief-mirror", source: fromBond("b-no2"), sink: toAtom("o2") }),
    ];
    const verdict = gradeDrawing(attack, both);
    expect(verdict.kind).toBe("not_requested");
    if (verdict.kind === "not_requested") expect(verdict.extra).toBe(1);
  });
});

describe("the equivalence rule is narrow", () => {
  it("sees the nitronium oxygens as one move", () => {
    const a = createArrow({ id: "x", source: fromBond("b-no1"), sink: toAtom("o1") });
    const b = createArrow({ id: "y", source: fromBond("b-no2"), sink: toAtom("o2") });
    expect(canonicalArrowKey(attack.from, a)).toBe(canonicalArrowKey(attack.from, b));
  });

  it("keeps distinct ring positions distinct", () => {
    // c1 is where the electrophile lands and c2 is its neighbour. If the rule
    // ever merged ring carbons, every EAS answer would grade correct wherever
    // the student attacked, which is the failure mode worth fearing most.
    const atC1 = createArrow({ id: "x", source: fromBond("b12"), sink: toBondBetween("c1", "n1") });
    const atC3 = createArrow({ id: "y", source: fromBond("b34"), sink: toBondBetween("c3", "n1") });
    expect(canonicalArrowKey(attack.from, atC1)).not.toBe(canonicalArrowKey(attack.from, atC3));
  });

  it("keeps the ring's own carbons apart from each other", () => {
    const a = createArrow({ id: "x", source: fromLonePair("c3"), sink: toAtom("c4") });
    const b = createArrow({ id: "y", source: fromLonePair("c5"), sink: toAtom("c6") });
    expect(canonicalArrowKey(attack.from, a)).not.toBe(canonicalArrowKey(attack.from, b));
  });

  it("finds the equivalent atoms it was built for", () => {
    expect(hasEquivalentAtoms(attack.from)).toBe(true);
  });
});

describe("a proton transfer accepts any of the equivalent protons", () => {
  // The EAS case swaps an atom sink. This is the other shape in the corpus: the
  // sink names a PAIR of atoms, and the source is the bond to the proton being
  // taken. Hydronium has three identical protons and a student may grab any.
  const fischer = TRAINER_SEQUENCES.find((s) => s.id === "seq-fischer");
  if (fischer === undefined) throw new Error("seq-fischer is missing from the corpus");
  const protonate = fischer.steps[0]!.step;

  it("accepts the authored proton", () => {
    expect(gradeDrawing(protonate, protonate.arrows).kind).toBe("correct");
  });

  it("accepts a different hydronium proton, which is the same move", () => {
    const other = [
      createArrow({ id: "a-grab-2", source: fromLonePair("fo1"), sink: toBondBetween("fo1", "fh2") }),
      createArrow({ id: "a-release-2", source: fromBond("b-fo3h2"), sink: toAtom("fo3") }),
    ];
    expect(gradeDrawing(protonate, other).kind).toBe("correct");
  });

  it("still refuses a proton taken onto the wrong oxygen", () => {
    const wrong = [
      createArrow({ id: "a-grab-w", source: fromLonePair("fo2"), sink: toBondBetween("fo2", "fh2") }),
      createArrow({ id: "a-release-w", source: fromBond("b-fo3h2"), sink: toAtom("fo3") }),
    ];
    expect(gradeDrawing(protonate, wrong).kind).not.toBe("correct");
  });
});

describe("every authored step still grades its own answer correct", () => {
  // The broad guard. Canonicalising touches every reaction in the corpus, so
  // the whole corpus is walked rather than trusting the one step above.
  it("across every sequence step", () => {
    for (const sequence of TRAINER_SEQUENCES) {
      for (const [i, entry] of sequence.steps.entries()) {
        const verdict = gradeDrawing(entry.step, entry.step.arrows);
        expect(verdict.kind, `${sequence.id} step ${i + 1} (${entry.step.id})`).toBe("correct");
      }
    }
  });
});
