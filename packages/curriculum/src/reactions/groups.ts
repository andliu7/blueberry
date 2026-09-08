/**
 * The equivalence groups, transcribed from `docs/COURSE-OUTLINE-ORGO2.md`
 * section 6, "Reagent vocabulary, equivalence groups, and the near miss pairs".
 *
 * Each group is one job in one reaction type, and every member does that job.
 * The outline's own rule holds over the whole file: "Equivalence is per reaction
 * type, not per reagent." So a token may appear in two groups and that is not a
 * defect. `SOCl2` turns an alcohol into an alkyl chloride and a carboxylic acid
 * into an acyl chloride, and those are two different jobs; `KMnO4` takes a
 * primary alcohol to an acid, dihydroxylates an alkene when it is cold and
 * dilute, and oxidises a benzylic position, which is three. See the header of
 * types.ts for why that is legal here and illegal inside one problem's authored
 * answer.
 *
 * MEMBER TOKENS ARE SEARCH TOKENS. They are written the way a student types
 * them, which means the same reagent often appears twice, once as a formula and
 * once as a name. That is deliberate: the whole point of this table is the
 * student who cannot remember the name, and half remembering "the periodinane
 * one" is the normal case.
 *
 * THE THREE GROUPS THAT CARRY A CAVEAT are the three that appear in the
 * outline's near miss table. The caveat is the boundary, and staying inside it
 * is an authoring judgement made row by row. Nothing in code can check it,
 * which is stated here rather than implied.
 *
 * ONE AUTHORED ADDITION, RECORDED. The Lewis acid group in the outline reads
 * "AlCl3, FeCl3, FeBr3". `AlBr3` is added to it here. It is the aluminium
 * partner of FeBr3 in exactly the same job, it is standard in the bromination
 * and Friedel-Crafts literature, and a student who has seen it written that way
 * and searches for it should not be told the reaction does not exist. This is an
 * extension of the outline's vocabulary, not a correction of it.
 */

import type { EquivalenceGroup, EquivalenceGroupId } from "./types.js";

export const EQUIVALENCE_GROUPS: Readonly<Record<EquivalenceGroupId, EquivalenceGroup>> =
  Object.freeze({
    ox_stop_at_aldehyde: Object.freeze({
      id: "ox_stop_at_aldehyde",
      label: "Oxidants that stop at the aldehyde",
      members: Object.freeze([
        "PCC",
        "pyridinium chlorochromate",
        "PDC",
        "pyridinium dichromate",
        "Dess-Martin periodinane",
        "DMP",
        "Swern",
        "Swern oxidation",
        "DMSO",
        "oxalyl chloride",
        "TEMPO",
      ]),
      source: "outline section 6, [EQ stop at aldehyde: PCC, PDC, Dess-Martin, Swern, TEMPO]",
      caveat:
        "Interchangeable for the oxidation level reached, not for the conditions. Swern is run " +
        "cold and anhydrous and Dess-Martin is not, so a substrate that will not survive one may " +
        "still survive another.",
    }),
    ox_to_carboxylic_acid: Object.freeze({
      id: "ox_to_carboxylic_acid",
      label: "Oxidants that carry a primary alcohol through to the acid",
      members: Object.freeze([
        "Jones",
        "Jones reagent",
        "CrO3",
        "chromic acid",
        "H2CrO4",
        "Na2Cr2O7",
        "K2Cr2O7",
        "dichromate",
        "KMnO4",
        "potassium permanganate",
      ]),
      source: "outline section 6, [EQ go to acid: Jones, CrO3 with H2SO4, dichromate, permanganate]",
    }),
    hydride_simple_carbonyl: Object.freeze({
      id: "hydride_simple_carbonyl",
      label: "Hydride sources for a plain aldehyde or ketone",
      members: Object.freeze([
        "NaBH4",
        "sodium borohydride",
        "LiAlH4",
        "LAH",
        "lithium aluminium hydride",
        "lithium aluminum hydride",
      ]),
      source: "outline section 6, [EQ simple ketone and aldehyde reduction: NaBH4, LiAlH4]",
      caveat:
        "Aldehydes and ketones only. This is the outline's own near miss pair: NaBH4 leaves an " +
        "ester, an acid, an amide and a nitrile alone, and LiAlH4 does not. A row whose substrate " +
        "is any of those names LiAlH4 on its own slot and must not use this group.",
    }),
    lewis_acid_halide: Object.freeze({
      id: "lewis_acid_halide",
      label: "Lewis acids that polarise a halogen or an alkyl halide",
      members: Object.freeze(["AlCl3", "AlBr3", "FeCl3", "FeBr3"]),
      source: "outline section 6, [EQ Lewis acid: AlCl3, FeCl3, FeBr3], plus AlBr3, see file header",
    }),
    epoxidising_peracid: Object.freeze({
      id: "epoxidising_peracid",
      label: "Peracids that epoxidise an alkene",
      members: Object.freeze([
        "mCPBA",
        "m-CPBA",
        "meta-chloroperoxybenzoic acid",
        "peroxyacetic acid",
        "peracetic acid",
      ]),
      source: "outline section 6, [EQ epoxidising: mCPBA, peroxyacetic acid]",
    }),
    syn_dihydroxylation: Object.freeze({
      id: "syn_dihydroxylation",
      label: "Reagents that add two hydroxyls to the same face",
      members: Object.freeze([
        "OsO4",
        "osmium tetroxide",
        "NMO",
        "cold dilute KMnO4",
        "KMnO4",
      ]),
      source: "outline section 6, [EQ syn dihydroxylation: OsO4, cold dilute permanganate]",
      caveat:
        "Permanganate is in this group only when it is cold, dilute and basic. Warm or acidic it " +
        "cleaves the alkene, which is a different row and a different product.",
    }),
    epoxide_basic_nucleophile: Object.freeze({
      id: "epoxide_basic_nucleophile",
      label: "Nucleophiles that open an epoxide under basic conditions",
      members: Object.freeze([
        "alkoxide",
        "NaOMe",
        "NaOEt",
        "thiolate",
        "NaSR",
        "cyanide",
        "NaCN",
        "azide",
        "NaN3",
        "RMgX",
        "RLi",
        "LiAlH4",
        "cuprate",
        "R2CuLi",
      ]),
      source:
        "outline section 6, [EQ basic opening nucleophile: alkoxide, thiolate, cyanide, azide, " +
        "RMgX, RLi, hydride, cuprate]",
    }),
    carbonyl_to_methylene: Object.freeze({
      id: "carbonyl_to_methylene",
      label: "Reductions that take a carbonyl all the way to a methylene",
      members: Object.freeze([
        "Zn(Hg)",
        "zinc amalgam",
        "Clemmensen",
        "N2H4",
        "hydrazine",
        "Wolff-Kishner",
        "KOH",
        "thioacetal with Raney nickel",
        "Raney nickel",
      ]),
      source:
        "outline section 6, [EQ carbonyl to methylene: dissolving zinc amalgam; hydrazine with " +
        "strong base and heat; thioacetal then Raney nickel]",
      caveat:
        "Interchangeable for the transformation, not for the regime. Clemmensen is strongly " +
        "acidic, Wolff-Kishner is strongly basic, and the thioacetal route is neutral. Which one " +
        "a question wants is decided by what else on the substrate has to survive.",
    }),
    nitro_reduction: Object.freeze({
      id: "nitro_reduction",
      label: "Reductants that take a nitro group to an amine",
      members: Object.freeze([
        "H2",
        "Pd/C",
        "Pt",
        "Ni",
        "Fe",
        "Sn",
        "SnCl2",
        "Zn",
        "HCl",
      ]),
      source:
        "outline section 6, [EQ nitro reduction: H2 over Pd or Pt or Ni; Fe with HCl; Sn with " +
        "HCl; SnCl2; Zn with HCl]",
    }),
    benzylic_oxidation: Object.freeze({
      id: "benzylic_oxidation",
      label: "Oxidants that cut a side chain back to the benzylic carbon",
      members: Object.freeze([
        "KMnO4",
        "potassium permanganate",
        "Na2Cr2O7",
        "K2Cr2O7",
        "dichromate",
        "CrO3",
      ]),
      source: "outline section 6, [EQ benzylic oxidation: permanganate, dichromate with acid]",
    }),
    organometallic_1_2: Object.freeze({
      id: "organometallic_1_2",
      label: "Carbon nucleophiles that add straight to a carbonyl carbon",
      members: Object.freeze([
        "RMgX",
        "RMgBr",
        "CH3MgBr",
        "Grignard",
        "Grignard reagent",
        "RLi",
        "CH3Li",
        "n-BuLi",
      ]),
      source: "outline section 6, [EQ methyl delivery: CH3MgBr, CH3Li]",
      caveat:
        "The outline's near miss pair with R2CuLi. These add 1,2. A cuprate adds 1,4 to the same " +
        "substrate, so no row may put both in one slot.",
    }),
    cyanohydrin_source: Object.freeze({
      id: "cyanohydrin_source",
      label: "Ways to deliver cyanide to a carbonyl",
      members: Object.freeze(["HCN", "NaCN", "KCN", "TMSCN"]),
      source: "outline section 6, [EQ cyanohydrin: HCN; cyanide salt then acid; TMSCN]",
    }),
    enamine_secondary_amine: Object.freeze({
      id: "enamine_secondary_amine",
      label: "Secondary amines used to make an enamine",
      members: Object.freeze(["pyrrolidine", "morpholine", "piperidine", "secondary amine"]),
      source:
        "outline section 6, [EQ secondary amine for enamines: pyrrolidine, morpholine, piperidine]",
    }),
    acid_to_acyl_chloride: Object.freeze({
      id: "acid_to_acyl_chloride",
      label: "Reagents that turn a carboxylic acid into an acyl chloride",
      members: Object.freeze(["SOCl2", "thionyl chloride", "oxalyl chloride", "PCl3", "PCl5"]),
      source:
        "outline section 6, [EQ acid to acyl chloride: SOCl2; oxalyl chloride with DMF; PCl3; PCl5]",
    }),
    fischer_catalyst: Object.freeze({
      id: "fischer_catalyst",
      label: "Acid catalysts for a Fischer esterification",
      members: Object.freeze(["H2SO4", "TsOH", "p-toluenesulfonic acid", "HCl"]),
      source: "outline section 6, [EQ Fischer catalyst: H2SO4, TsOH]",
    }),
    amide_coupling: Object.freeze({
      id: "amide_coupling",
      label: "Coupling reagents that join an acid to an amine directly",
      members: Object.freeze(["DCC", "DMAP", "EDC"]),
      source: "outline section 6, [EQ coupling: DCC with DMAP, EDC]",
    }),
    aldol_base: Object.freeze({
      id: "aldol_base",
      label: "Hydroxide bases for an aldol",
      members: Object.freeze(["NaOH", "KOH", "hydroxide"]),
      source: "outline section 6, [EQ aldol base: NaOH, KOH]",
    }),
    alpha_halogen: Object.freeze({
      id: "alpha_halogen",
      label: "Halogens for an alpha halogenation",
      members: Object.freeze(["Br2", "Cl2"]),
      source: "outline section 6, [EQ alpha halogen: Br2, Cl2]",
    }),
    reductive_amination_reductant: Object.freeze({
      id: "reductive_amination_reductant",
      label: "Reductants mild enough to reduce an iminium and not the carbonyl",
      members: Object.freeze(["NaBH3CN", "NaBH(OAc)3", "H2", "Ni", "Raney nickel"]),
      source:
        "outline section 6, [EQ reductive amination reductant: NaBH3CN, NaBH(OAc)3, H2 over Ni]",
    }),
    sulfonylating: Object.freeze({
      id: "sulfonylating",
      label: "Sulfonyl chlorides that convert an alcohol into a sulfonate ester",
      members: Object.freeze(["TsCl", "MsCl", "TfCl", "tosyl chloride", "mesyl chloride"]),
      source: "outline section 6, [EQ sulfonate: TsCl, MsCl, TfCl]",
    }),
    amine_acid_scavenger: Object.freeze({
      id: "amine_acid_scavenger",
      label: "Amine bases that mop up the acid a step generates",
      members: Object.freeze(["pyridine", "Et3N", "triethylamine", "DMAP", "DIPEA"]),
      source:
        "outline section 6, the sulfonate group's own condition, 'with pyridine or a tertiary " +
        "amine base'",
    }),
    bulky_alkoxide: Object.freeze({
      id: "bulky_alkoxide",
      label: "Hindered alkoxide bases",
      members: Object.freeze([
        "KOtBu",
        "NaOtBu",
        "potassium tert-butoxide",
        "tert-butoxide",
      ]),
      source: "outline section 6 near miss table, NaOH versus a bulky alkoxide",
      caveat:
        "The outline's near miss pair with hydroxide and small alkoxides. A bulky base gives the " +
        "Hofmann alkene, a small one gives Zaitsev, so no elimination row may put both in one slot.",
    }),
  });

/** Throws on an unknown id, because a reference that does not resolve is a defect. */
export function equivalenceGroup(id: EquivalenceGroupId): EquivalenceGroup {
  const group = EQUIVALENCE_GROUPS[id];
  if (group === undefined) {
    throw new Error(`Unknown equivalence group id: ${String(id)}`);
  }
  return group;
}

export function allEquivalenceGroupIds(): readonly EquivalenceGroupId[] {
  return Object.keys(EQUIVALENCE_GROUPS).sort() as EquivalenceGroupId[];
}

export function equivalenceGroupCount(): number {
  return allEquivalenceGroupIds().length;
}
