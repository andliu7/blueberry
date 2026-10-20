/**
 * Unit 1 takeaways, the owner's whiteboard table of 2026-09-29, one per node.
 *
 * EVERY ONE IS A DRAFT. `placeholder` is the literal `true`, the same rule as
 * content/u1/types.ts: nothing here reaches a student as authored copy until
 * the owner signs it off at the human gate. The guidebook's key-idea card reads
 * this and keeps its draft mark while the flag is true.
 *
 * Kept out of demo/pathwayMap.ts on purpose: the map sits in the game's entry
 * chunk, and this is copy only the guidebook needs.
 */

export interface Takeaway {
  readonly text: string;
  readonly placeholder: true;
}

const draft = (text: string): Takeaway => ({ text, placeholder: true });

export const TAKEAWAYS: Readonly<Record<string, Takeaway>> = Object.freeze({
  "u1-allylic": draft(
    "An allylic cation, radical or anion is shared between C1 and C3 through the neighbouring π bond. Resonance moves electrons, never atoms, and more contributors means more stable.",
  ),
  "u1-rank-cation": draft(
    "Substitution and resonance both stabilize a cation: 3° > 2° > 1° > methyl, and a 1° allylic cation is about as stable as a 2° alkyl one. Count both effects.",
  ),
  "u1-rank-anion": draft(
    "The alkyl trend flips: methyl > 1° > 2° > 3°. Resonance still stabilizes, and more s-character helps.",
  ),
  "u1-rank-radical": draft(
    "Radicals follow the cation trend (3° > 2° > 1°), and allylic and benzylic radicals are the best. The allylic radical is the intermediate in NBS bromination.",
  ),
  "u1-quiz-a": draft("Draw every contributor before you rank."),
  "u1-kvt": draft(
    "The kinetic product has the lowest Ea (lowest TS), so it forms fastest and wins when cold and irreversible. The thermodynamic product has the lowest G, so it wins when warm and reversible.",
  ),
  "u1-energy-diagram": draft("TS height is speed and product depth is stability. They can point at different products."),
  "u1-12v14": draft(
    "Protonating the end carbon gives an allylic cation, and the nucleophile attacks C2 (1,2) or C4 (1,4). Both contributors are needed to explain the 1,4 product. For butadiene + HBr, 1,2 is major at −80 °C (kinetic) and 1,4 is major at 40 °C (thermodynamic, the more substituted alkene).",
  ),
  "u1-hx-dienes": draft(
    "Protonate to make the best allylic cation, then let temperature choose. Decide thermo by alkene substitution, not by \"1,4 always wins\".",
  ),
  "u1-x2": draft("Br₂ and Cl₂ give 1,2- and 1,4-dihalides by the same allylic cation logic and the same temperature rule."),
  "u1-quiz-b": draft("Mechanism first, then conditions."),
  "u1-nbs": draft(
    "A radical chain swaps an allylic H for Br. NBS keeps Br₂ low so it doesn't add across the alkene, and it does not brominate aromatic rings. Radical resonance can shift the alkene, which gives mixtures.",
  ),
  "u1-nbs-practice": draft(
    "Light and peroxide are interchangeable initiators, so the product is the same. Find the weakest C–H (allylic), then draw both resonance products.",
  ),
  "u1-mo": draft("More conjugation shrinks the HOMO–LUMO gap, which shifts absorption to longer wavelength."),
  "u1-da": draft(
    "A diene and a dienophile make a cyclohexene in one concerted step. The checklist is: HOMO and LUMO in phase, s-cis diene, EWG on the dienophile, EDG on the diene.",
  ),
  "u1-dienes": draft(
    "The diene must reach s-cis. Locked s-cis (cyclopentadiene) is fast, and a diene that can't reach s-cis is out regardless of its electronics.",
  ),
  "u1-dienophiles": draft(
    "EWGs (C=O, CN, NO₂) activate a dienophile. Answer role questions in the form \"diene or dienophile, more likely X because Y\".",
  ),
  "u1-da-predict": draft(
    "Going backward: the ring's C=C was the diene's C2–C3, so break the two σ bonds across from it. 1-substituted dienes give \"ortho\" and 2-substituted give \"para\".",
  ),
  "u1-da-stereo": draft(
    "Addition is suprafacial, so cis stays cis. Endo is the kinetic product. A cyclic dienophile gives a fused bicyclic, and a cyclic diene gives a bridged one.",
  ),
  "u1-da-3d": draft("Draw the substituents that stay cis on the same face. Chiral products form as racemates."),
});

export function takeawayFor(nodeId: string): Takeaway | null {
  return TAKEAWAYS[nodeId] ?? null;
}
