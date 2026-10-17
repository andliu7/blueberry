/**
 * Which drawn worked example goes with which reaction-table row, so Bloom's
 * answer card can show structures instead of only words.
 *
 * The drawings are not made here. They are the RDKit drawings the Learn pages
 * already ship (src/data/reactions.ts, `art.start_thumb_*` and
 * `art.product_thumb_*`). This file only pairs a curriculum row with a staged
 * example of the SAME transformation.
 *
 * HOW EACH PAIR WAS CHECKED (2026-10-16, RDKit 2026.03): every staged
 * example's starting material and product were parsed from their SMILES and
 * matched against functional-group SMARTS (ketone, aldehyde, primary and
 * secondary alcohol, ester, acyl chloride, acid, alkene, epoxide and so on).
 * A pair is listed only when the starting material carries one of the row's
 * substrate classes and the product one of its product classes. The SMILES
 * that check ran on are pinned below, and askModel.test.ts fails if the data
 * under a pair ever changes, so a pair can never silently start pointing at a
 * different molecule. Rows with no clean example (amide and nitrile
 * hydrolysis, alpha halogenation under acid) have no pair and show no drawing.
 */

import { REACTIONS as STAGED, type StagedReaction } from "@/data/reactions";

export interface ExamplePair {
  /** The staged example's id in src/data/reactions.ts. */
  readonly staged: string;
  /** The SMILES the RDKit check ran on: first reactant, then product. */
  readonly start: string;
  readonly product: string;
}

export const REACTION_EXAMPLES: Readonly<Record<string, ExamplePair>> = {
  "carbonyl-reduction-to-alcohol": { staged: "nabh4-reduction", start: "CC(=O)c1ccccc1", product: "CC(O)c1ccccc1" },
  "ester-reduction-to-primary-alcohol": { staged: "lialh4-reduction", start: "COC(=O)c1ccccc1", product: "OCc1ccccc1" },
  "organometallic-addition-to-carbonyl": { staged: "grignard-addition-ketone", start: "CC(=O)c1ccccc1", product: "CC(C)(O)c1ccccc1" },
  "cyanohydrin-formation": { staged: "cyanohydrin", start: "O=Cc1ccccc1", product: "N#CC(O)c1ccccc1" },
  "wittig-reaction": { staged: "wittig-olefination", start: "CC(=O)c1ccccc1", product: "C=C(C)c1ccccc1" },
  "imine-formation": { staged: "imine-formation", start: "CC(=O)c1ccccc1", product: "C/N=C(\\C)c1ccccc1" },
  "acetal-formation": { staged: "acetal-protection", start: "CC(=O)c1ccccc1", product: "CC1(c2ccccc2)OCCO1" },
  "aryl-ketone-to-alkyl-arene": { staged: "clemmensen", start: "CC(=O)c1ccccc1", product: "CCc1ccccc1" },
  "primary-alcohol-to-carboxylic-acid": { staged: "jones-oxidation", start: "OCc1ccccc1", product: "O=C(O)c1ccccc1" },
  "primary-alcohol-to-aldehyde": { staged: "pcc-oxidation", start: "CCCCO", product: "CCCC=O" },
  "acid-to-acyl-chloride": { staged: "socl2-acid-to-chloride", start: "O=C(O)c1ccccc1", product: "O=C(Cl)c1ccccc1" },
  "fischer-esterification": { staged: "fischer-esterification", start: "O=C(O)c1ccccc1", product: "COC(=O)c1ccccc1" },
  "acyl-chloride-to-amide": { staged: "acidchloride-to-amide", start: "O=C(Cl)c1ccccc1", product: "CNC(=O)c1ccccc1" },
  "cuprate-acyl-chloride-to-ketone": { staged: "gilman-to-ketone", start: "O=C(Cl)c1ccccc1", product: "CC(=O)c1ccccc1" },
  "ester-to-aldehyde-dibal": { staged: "dibalh-to-aldehyde", start: "COC(=O)c1ccccc1", product: "O=Cc1ccccc1" },
  "aldol-condensation": { staged: "aldol-condensation", start: "CC=O", product: "CC=CC=O" },
  "claisen-condensation": { staged: "claisen-condensation", start: "CCOC(C)=O", product: "CCOC(=O)CC(C)=O" },
  "alcohol-to-alkyl-bromide-pbr3": { staged: "alcohol-pbr3", start: "CCCCO", product: "CCCCBr" },
  "alkene-epoxidation-peracid": { staged: "epoxidation-mcpba", start: "CC=CC", product: "CC1OC1C" },
  "epoxide-opening-basic": { staged: "epoxide-opening-base", start: "CC1(C)CO1", product: "COCC(C)(C)O" },
  "nbs-allylic-bromination": { staged: "nbs-allylic", start: "C=CCC", product: "C=CC(C)Br" },
  "diene-1-4-addition-thermodynamic": { staged: "diene-1-4-addition", start: "C=CC=C", product: "CC=CCBr" },
  "diels-alder": { staged: "diels-alder", start: "C=CC=C", product: "O=CC1CC=CCC1" },
  "eas-halogenation": { staged: "eas-bromination", start: "c1ccccc1", product: "Brc1ccccc1" },
  "friedel-crafts-acylation": { staged: "friedel-crafts-acylation", start: "c1ccccc1", product: "CC(=O)c1ccccc1" },
  "eas-nitration": { staged: "nitration", start: "c1ccccc1", product: "O=[N+]([O-])c1ccccc1" },
  "acidic-ether-cleavage": { staged: "ether-cleavage", start: "CCOC(C)(C)C", product: "CCO" },
};

/** The drawn example for a reaction-table row, or undefined when it has none. */
export function exampleFor(reactionId: string): StagedReaction | undefined {
  const pair = REACTION_EXAMPLES[reactionId];
  if (pair === undefined) return undefined;
  return STAGED.find((staged) => staged.id === pair.staged);
}
