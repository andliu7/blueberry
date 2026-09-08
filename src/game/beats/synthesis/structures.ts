/**
 * The structures a reactant gap's chips stand for, built through chem-core's
 * real constructors.
 *
 * WHY REAL SPECIES AND NOT LABELS. A reactant gap could be graded by comparing
 * chip ids, and it would be right every time until the day an author puts the
 * same molecule on the board twice under two names. Handing the comparison to
 * `checkStructure` means the board is graded on constitution, so a duplicate
 * chip is caught by the constructor in problem.ts rather than by a student who
 * picked the "wrong" chip and was told they were wrong for being right.
 *
 * HYDROGENS ARE IMPLICIT HERE, which is the opposite of the trainer's rule and
 * for a different reason. On the trainer canvas a hydrogen that MOVES has to be
 * a real sphere, because an arrow lands on it. Nothing here is drawn and nothing
 * pushes an arrow: these species exist to be compared. `implicitHydrogens` is
 * part of chem-core's atom label, so the comparison counts them either way, and
 * writing ten hydrogen atoms per epoxide would add ten chances to mistype one.
 *
 * LONE PAIRS ARE WRITTEN AND CONSISTENT. `atomLabel` in
 * packages/curriculum/src/answers/structure.ts includes `lonePairs`, so two
 * ethers that disagree about their oxygen's lone pairs are not the same
 * molecule as far as the checker is concerned. Every ether oxygen below carries
 * two.
 */

import { createAtom, createBond, createSpecies, createState, type MechanismState } from "@blueberry/chem-core";

interface OxiranePlan {
  readonly id: string;
  /** Implicit hydrogen count on the ring CH, then on each chain carbon in order. */
  readonly ringCarbonHydrogens: number;
  readonly chain: readonly number[];
  /** Which chain carbon each later chain carbon hangs off. Index 0 is the ring CH. */
  readonly attachments: readonly number[];
}

/**
 * Every candidate here is an epoxide, so the ring is built once and the chain
 * is the only thing that differs. A shared builder rather than four hand
 * written species: four copies of the same three ring bonds is four chances for
 * one of them to be wrong in a way nothing notices.
 */
function buildOxirane(plan: OxiranePlan): MechanismState {
  const atoms = [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: plan.ringCarbonHydrogens }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
  ];
  const bonds = [
    createBond({ id: "b-c1c2", a: "c1", b: "c2" }),
    createBond({ id: "b-c1o1", a: "c1", b: "o1" }),
    createBond({ id: "b-c2o1", a: "c2", b: "o1" }),
  ];
  plan.chain.forEach((hydrogens, index) => {
    const id = `k${index + 1}`;
    atoms.push(createAtom({ id, element: "C", implicitHydrogens: hydrogens }));
    const parentIndex = plan.attachments[index];
    const parent = parentIndex === 0 ? "c2" : `k${parentIndex}`;
    bonds.push(createBond({ id: `b-${parent}${id}`, a: parent, b: id }));
  });

  return createState({
    id: `st-${plan.id}`,
    members: [
      {
        species: createSpecies({ id: `sp-${plan.id}`, atoms, bonds }),
        role: "substrate",
      },
    ],
  });
}

/** Oxirane itself. C2H4O. Adds two carbons and no branch. */
export const OXIRANE: MechanismState = buildOxirane({
  id: "oxirane",
  ringCarbonHydrogens: 2,
  chain: [],
  attachments: [],
});

/** 2-Methyloxirane, propylene oxide. C3H6O. */
export const METHYLOXIRANE: MechanismState = buildOxirane({
  id: "methyloxirane",
  ringCarbonHydrogens: 1,
  chain: [3],
  attachments: [0],
});

/**
 * 2-Isopropyloxirane, the answer on the bromobenzene route. C5H10O.
 * Ring CH carries a CH, which carries two CH3.
 */
export const ISOPROPYLOXIRANE: MechanismState = buildOxirane({
  id: "isopropyloxirane",
  ringCarbonHydrogens: 1,
  chain: [1, 3, 3],
  attachments: [0, 1, 1],
});

/**
 * 2-Propyloxirane, 1,2-epoxypentane. C5H10O, the SAME formula as the answer and
 * a different graph, which is the point: it forces the isomorphism search to do
 * real work rather than stopping at the formula gate.
 */
export const PROPYLOXIRANE: MechanismState = buildOxirane({
  id: "propyloxirane",
  ringCarbonHydrogens: 1,
  chain: [2, 2, 3],
  attachments: [0, 1, 2],
});
