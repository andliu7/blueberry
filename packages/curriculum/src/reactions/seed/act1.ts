/**
 * Act 1 of the Organic Chemistry II outline: pi systems and the aromatic ring.
 *
 * Authored fresh from the per topic reagent vocabulary in
 * `docs/COURSE-OUTLINE-ORGO2.md` section 6. Nothing here is copied from a
 * worksheet, an exam, or a key. The outline's own provenance rule is that the
 * source materials give structure and vocabulary and never content, and a
 * reaction row is vocabulary: it says which reagents do which transformation,
 * which is the same fact in every textbook.
 *
 * The rows are ordered by topic in the outline's teaching order, then by the
 * order a lesson would meet them. Ordering in this file is for a reader. Search
 * results are sorted by the search functions and never by position here.
 */

import { createReaction } from "../reaction.js";
import type { Reaction } from "../types.js";

export const ACT_1_REACTIONS: readonly Reaction[] = Object.freeze([
  // ---- alcohol_leaving_groups --------------------------------------------
  createReaction({
    id: "alcohol-to-alkyl-chloride-socl2",
    name: "Alcohol to alkyl chloride with thionyl chloride",
    aliases: ["thionyl chloride activation", "SOCl2 chlorination"],
    transformation: "A primary or secondary alcohol becomes the alkyl chloride.",
    substrateClasses: ["primary alcohol", "secondary alcohol"],
    productClasses: ["alkyl halide", "primary alkyl halide", "secondary alkyl halide"],
    reagents: [
      { role: "activating agent", anyOf: ["SOCl2", "thionyl chloride"] },
      { role: "acid scavenger", group: "amine_acid_scavenger" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "with pyridine present",
        decides:
          "whether the chloride arrives from the front or the back. With pyridine the added " +
          "chloride attacks from the opposite face and the centre inverts. Without a base the " +
          "internal collapse keeps the original face.",
      },
    ],
    topic: "alcohol_leaving_groups",
    note: "Outline Path A: the OH is activated in place, so no carbocation is formed and no skeleton rearranges.",
  }),
  createReaction({
    id: "alcohol-to-alkyl-bromide-pbr3",
    name: "Alcohol to alkyl bromide with phosphorus tribromide",
    aliases: ["PBr3 bromination"],
    transformation: "A primary or secondary alcohol becomes the alkyl bromide with inversion.",
    substrateClasses: ["primary alcohol", "secondary alcohol"],
    productClasses: ["alkyl halide", "primary alkyl halide", "secondary alkyl halide"],
    reagents: [{ role: "activating agent", anyOf: ["PBr3", "PCl3", "phosphorus tribromide"] }],
    conditions: [
      {
        dimension: "temperature",
        value: "cold, usually near 0 C",
        decides: "whether elimination competes. Warm, the alkene starts to appear.",
      },
    ],
    topic: "alcohol_leaving_groups",
  }),
  createReaction({
    id: "alcohol-to-alkyl-iodide-p-i2",
    name: "Alcohol to alkyl iodide with phosphorus and iodine",
    aliases: ["red phosphorus and iodine", "PI3 in situ"],
    transformation: "A primary or secondary alcohol becomes the alkyl iodide.",
    substrateClasses: ["primary alcohol", "secondary alcohol"],
    productClasses: ["alkyl halide", "primary alkyl halide", "secondary alkyl halide"],
    reagents: [{ role: "activating agent", anyOf: ["P", "red phosphorus", "I2", "PI3"] }],
    conditions: [
      {
        dimension: "regime",
        value: "neutral, the phosphorus reagent is made in the flask",
        decides: "that no strong acid is present, so an acid sensitive group elsewhere survives",
      },
    ],
    topic: "alcohol_leaving_groups",
  }),
  createReaction({
    id: "appel-reaction",
    name: "Appel reaction",
    aliases: ["CBr4 and triphenylphosphine", "Appel halogenation"],
    transformation: "An alcohol becomes the alkyl halide under neutral conditions with inversion.",
    substrateClasses: ["primary alcohol", "secondary alcohol"],
    productClasses: ["alkyl halide", "primary alkyl halide", "secondary alkyl halide"],
    reagents: [
      { role: "halide source", anyOf: ["CBr4", "CCl4", "NBS"] },
      { role: "phosphine", anyOf: ["PPh3", "triphenylphosphine"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "neutral and anhydrous",
        decides: "that acid sensitive substrates survive, which is the reason to choose it over PBr3",
      },
    ],
    topic: "alcohol_leaving_groups",
  }),
  createReaction({
    id: "alcohol-to-sulfonate-ester",
    name: "Tosylation or mesylation of an alcohol",
    aliases: ["making a tosylate", "TsCl activation", "mesylate formation"],
    transformation:
      "An alcohol becomes a sulfonate ester, which is the good leaving group the alcohol was not.",
    substrateClasses: ["primary alcohol", "secondary alcohol"],
    productClasses: ["sulfonate ester"],
    reagents: [
      { role: "sulfonyl chloride", group: "sulfonylating" },
      { role: "acid scavenger", group: "amine_acid_scavenger" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "basic, an amine base is present throughout",
        decides:
          "that the HCl released never protonates the substrate, which is what keeps the " +
          "stereocentre untouched",
      },
      {
        dimension: "workup",
        value: "the C-O bond is never broken",
        decides:
          "that configuration at the carbon is retained in this step. Any inversion happens in the " +
          "NEXT step, when a nucleophile displaces the sulfonate.",
      },
    ],
    topic: "alcohol_leaving_groups",
  }),

  // ---- oxidation_and_reduction_ladder ------------------------------------
  createReaction({
    id: "primary-alcohol-to-aldehyde",
    name: "Partial oxidation of a primary alcohol to an aldehyde",
    aliases: ["PCC oxidation", "Swern oxidation", "Dess-Martin oxidation", "stopping at the aldehyde"],
    transformation: "A primary alcohol is oxidised one rung, to the aldehyde, and stops there.",
    substrateClasses: ["primary alcohol"],
    productClasses: ["aldehyde"],
    reagents: [{ role: "oxidant", group: "ox_stop_at_aldehyde" }],
    conditions: [
      {
        dimension: "solvent",
        value: "anhydrous, typically dichloromethane",
        decides:
          "whether the reaction stops at the aldehyde. Water lets the aldehyde form its hydrate, " +
          "and the hydrate is what gets oxidised on to the acid.",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
    note:
      "The outline's first near miss pair. This row and the Jones row take the same substrate to " +
      "different rungs, so their reagents are never one equivalence group.",
  }),
  createReaction({
    id: "secondary-alcohol-to-ketone",
    name: "Oxidation of a secondary alcohol to a ketone",
    aliases: ["PCC on a secondary alcohol", "ketone by oxidation"],
    transformation: "A secondary alcohol is oxidised to the ketone, which is the top of its ladder.",
    substrateClasses: ["secondary alcohol"],
    productClasses: ["ketone"],
    reagents: [{ role: "oxidant", group: "ox_stop_at_aldehyde" }],
    conditions: [
      {
        dimension: "solvent",
        value: "anhydrous or aqueous, either works",
        decides:
          "nothing here, and that is the point. A ketone has no hydrogen left on the carbinol " +
          "carbon, so there is no next rung and the choice of oxidant stops mattering.",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
  }),
  createReaction({
    id: "primary-alcohol-to-carboxylic-acid",
    name: "Full oxidation of a primary alcohol to a carboxylic acid",
    aliases: ["Jones oxidation", "chromic acid oxidation", "permanganate oxidation"],
    transformation: "A primary alcohol is oxidised two rungs, through the aldehyde, to the acid.",
    substrateClasses: ["primary alcohol", "aldehyde"],
    productClasses: ["carboxylic acid"],
    reagents: [
      { role: "oxidant", group: "ox_to_carboxylic_acid" },
      { role: "acid", anyOf: ["H2SO4", "H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "solvent",
        value: "aqueous",
        decides:
          "that the intermediate aldehyde becomes its hydrate, which is the species that gets " +
          "oxidised again. Take the water away and the reaction stops one rung lower.",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
  }),
  createReaction({
    id: "carbonyl-reduction-to-alcohol",
    name: "Hydride reduction of an aldehyde or ketone",
    aliases: ["NaBH4 reduction", "LiAlH4 reduction", "borohydride reduction"],
    transformation: "An aldehyde becomes a primary alcohol and a ketone becomes a secondary alcohol.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["primary alcohol", "secondary alcohol"],
    reagents: [{ role: "hydride source", group: "hydride_simple_carbonyl" }],
    conditions: [
      {
        dimension: "workup",
        value: "aqueous workup after the hydride step",
        decides:
          "whether the answer is the alcohol or the alkoxide. Without the proton source the " +
          "product drawn is the alkoxide, which the outline records as a top Act 2 mistake.",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
    note:
      "The one row where NaBH4 and LiAlH4 really are interchangeable. The group carries the " +
      "caveat and the ester reduction row deliberately does not use it.",
  }),
  createReaction({
    id: "ester-reduction-to-primary-alcohol",
    name: "Reduction of an ester to a primary alcohol",
    aliases: ["LiAlH4 on an ester", "LAH reduction of an ester"],
    transformation: "An ester is reduced past the aldehyde all the way to the primary alcohol.",
    substrateClasses: ["ester", "carboxylic acid", "amide"],
    productClasses: ["primary alcohol"],
    reagents: [
      { role: "hydride source", anyOf: ["LiAlH4", "LAH", "lithium aluminium hydride"] },
      { role: "solvent", anyOf: ["Et2O", "THF", "diethyl ether"] },
    ],
    conditions: [
      {
        dimension: "workup",
        value: "aqueous workup",
        decides: "the alcohol rather than the aluminium alkoxide",
      },
      {
        dimension: "regime",
        value: "strictly anhydrous until workup",
        decides: "whether the hydride survives at all. LiAlH4 destroys itself in water.",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
    note:
      "The near miss with NaBH4. Sodium borohydride leaves an ester alone, so this row names " +
      "LiAlH4 on its own slot and never the shared hydride group.",
  }),
  createReaction({
    id: "ester-to-aldehyde-dibal",
    name: "Partial reduction of an ester to an aldehyde with DIBAL-H",
    aliases: ["DIBAL", "DIBAL-H reduction", "stopping an ester at the aldehyde"],
    transformation: "An ester is reduced exactly one rung, to the aldehyde.",
    substrateClasses: ["ester", "nitrile"],
    productClasses: ["aldehyde"],
    reagents: [{ role: "hydride source", anyOf: ["DIBAL", "DIBAL-H", "diisobutylaluminium hydride"] }],
    conditions: [
      {
        dimension: "temperature",
        value: "-78 C",
        decides:
          "whether the reaction stops at the aldehyde. Warm, the tetrahedral intermediate " +
          "collapses and a second hydride arrives, giving the primary alcohol instead.",
      },
      {
        dimension: "stoichiometry",
        value: "one equivalent",
        decides: "the same thing the temperature does, from the other side",
      },
    ],
    topic: "oxidation_and_reduction_ladder",
  }),

  // ---- ethers -------------------------------------------------------------
  createReaction({
    id: "williamson-ether-synthesis",
    name: "Williamson ether synthesis",
    aliases: ["Williamson", "alkoxide plus alkyl halide"],
    transformation: "An alkoxide and a primary alkyl halide give an ether.",
    substrateClasses: ["alkoxide", "primary alcohol", "primary alkyl halide"],
    productClasses: ["ether"],
    reagents: [
      { role: "base to form the alkoxide", anyOf: ["NaH", "Na", "NaOH", "K2CO3"] },
      { role: "electrophile", anyOf: ["R-X", "CH3I", "primary alkyl halide", "alkyl tosylate"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "basic, and the halide must be methyl or primary",
        decides:
          "whether an ether forms at all. On a secondary or tertiary halide the alkoxide acts as " +
          "a base instead and the answer is the alkene.",
      },
    ],
    topic: "ethers",
  }),
  createReaction({
    id: "acidic-ether-cleavage",
    name: "Acidic cleavage of an ether",
    aliases: ["ether cleavage", "HI cleavage", "HBr cleavage"],
    transformation: "An ether is cut into an alcohol and an alkyl halide.",
    substrateClasses: ["ether", "aryl ether"],
    productClasses: ["alkyl halide", "primary alcohol", "phenol"],
    reagents: [{ role: "acid", anyOf: ["HI", "HBr", "concentrated HBr"] }],
    conditions: [
      {
        dimension: "regime",
        value: "strongly acidic, hot",
        decides:
          "which C-O bond breaks. The halide attacks the less hindered carbon by SN2, or the more " +
          "substituted one by SN1 if that carbon can hold a cation. On an aryl ether the aryl C-O " +
          "never breaks, so the phenol is always one of the two products.",
      },
      {
        dimension: "stoichiometry",
        value: "excess acid",
        decides: "whether the alcohol produced is itself converted on to a second alkyl halide",
      },
    ],
    topic: "ethers",
  }),

  // ---- epoxides -----------------------------------------------------------
  createReaction({
    id: "alkene-epoxidation-peracid",
    name: "Epoxidation of an alkene with a peracid",
    aliases: ["mCPBA epoxidation", "peracid epoxidation"],
    transformation: "An alkene becomes an epoxide with the alkene geometry preserved.",
    substrateClasses: ["alkene", "cis alkene", "trans alkene"],
    productClasses: ["epoxide"],
    reagents: [{ role: "oxidant", group: "epoxidising_peracid" }],
    conditions: [
      {
        dimension: "regime",
        value: "neutral, one concerted step",
        decides:
          "that cis stays cis and trans stays trans. Nothing rotates because nothing becomes a " +
          "single bond at any point.",
      },
    ],
    topic: "epoxides",
  }),
  createReaction({
    id: "epoxide-opening-basic",
    name: "Epoxide opening under basic conditions",
    aliases: ["basic epoxide opening", "nucleophilic epoxide opening"],
    transformation:
      "A strong nucleophile opens an epoxide at the LESS substituted carbon, giving a substituted alcohol.",
    substrateClasses: ["epoxide"],
    productClasses: ["primary alcohol", "secondary alcohol", "tertiary alcohol"],
    reagents: [{ role: "nucleophile", group: "epoxide_basic_nucleophile" }],
    conditions: [
      {
        dimension: "regime",
        value: "basic or neutral, no acid present",
        decides:
          "the regiochemistry, and it is the whole lesson. With no acid the epoxide is not " +
          "protonated, so the nucleophile makes a plain SN2 choice and goes where there is room.",
      },
      {
        dimension: "workup",
        value: "aqueous workup",
        decides: "the alcohol rather than the alkoxide",
      },
    ],
    topic: "epoxides",
    note: "The outline's near miss pair with the acidic opening. Same substrate, opposite carbon.",
  }),
  createReaction({
    id: "epoxide-opening-acidic",
    name: "Epoxide opening under acidic conditions",
    aliases: ["acidic epoxide opening", "acid catalysed epoxide opening"],
    transformation:
      "A weak nucleophile opens a protonated epoxide at the MORE substituted carbon, giving the anti product.",
    substrateClasses: ["epoxide"],
    productClasses: ["vicinal diol", "ether", "halohydrin"],
    reagents: [
      { role: "acid", anyOf: ["H3O+", "H2SO4", "HBr", "HCl"] },
      { role: "weak nucleophile", anyOf: ["H2O", "CH3OH", "ROH", "Br-", "Cl-"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "acidic",
        decides:
          "the regiochemistry, opposite to the basic case. The protonated epoxide already carries " +
          "partial positive charge on the carbon best able to hold it, so a weak nucleophile is " +
          "pulled there even though it is the crowded one.",
      },
    ],
    topic: "epoxides",
  }),
  createReaction({
    id: "alkene-syn-dihydroxylation",
    name: "Syn dihydroxylation of an alkene",
    aliases: ["osmium tetroxide dihydroxylation", "cold dilute permanganate", "making a cis diol"],
    transformation: "An alkene picks up two hydroxyls on the same face, giving a syn vicinal diol.",
    substrateClasses: ["alkene"],
    productClasses: ["vicinal diol"],
    reagents: [
      { role: "oxidant", group: "syn_dihydroxylation" },
      { role: "reductive workup or co-oxidant", anyOf: ["NaHSO3", "NMO", "H2O2"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "cold",
        decides:
          "whether permanganate stops at the diol or carries on and cleaves the alkene. Osmium " +
          "does not have this problem, which is why it is the reagent a question reaches for when " +
          "the diol is the answer.",
      },
      {
        dimension: "regime",
        value: "basic and dilute for permanganate",
        decides: "the same thing, from the other side",
      },
    ],
    topic: "epoxides",
  }),
  createReaction({
    id: "alkene-anti-dihydroxylation",
    name: "Anti dihydroxylation of an alkene",
    aliases: ["epoxidation then hydrolysis", "trans diol"],
    transformation:
      "An alkene is epoxidised and the epoxide is opened by water, so the two hydroxyls end up on opposite faces.",
    substrateClasses: ["alkene"],
    productClasses: ["vicinal diol"],
    reagents: [
      { role: "epoxidising agent", group: "epoxidising_peracid" },
      { role: "acid and water", anyOf: ["H3O+", "H2O", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "two operations, the peracid first and the aqueous acid second",
        decides:
          "the anti relationship. The backside attack in the second step is where the two " +
          "hydroxyls are forced onto opposite faces.",
      },
    ],
    topic: "epoxides",
    note: "The counterpart to the syn row. Same starting alkene, opposite stereochemical answer.",
  }),
  createReaction({
    id: "halohydrin-to-epoxide",
    name: "Epoxide from a halohydrin",
    aliases: ["intramolecular Williamson", "closing an epoxide"],
    transformation: "A halohydrin closes onto itself under base to give an epoxide.",
    substrateClasses: ["halohydrin"],
    productClasses: ["epoxide"],
    reagents: [{ role: "base", anyOf: ["NaOH", "NaH", "KOH"] }],
    conditions: [
      {
        dimension: "regime",
        value: "basic",
        decides:
          "that the alkoxide forms first. The ring closure is an internal SN2, so the halide and " +
          "the oxygen have to be able to reach anti to each other.",
      },
    ],
    topic: "epoxides",
  }),

  // ---- allylic_halogenation ----------------------------------------------
  createReaction({
    id: "nbs-allylic-bromination",
    name: "Allylic bromination with NBS",
    aliases: ["NBS", "N-bromosuccinimide", "allylic radical bromination"],
    transformation: "An alkene is brominated at the allylic carbon and the double bond stays put.",
    substrateClasses: ["alkene"],
    productClasses: ["allylic halide"],
    reagents: [
      { role: "bromine source", anyOf: ["NBS", "N-bromosuccinimide"] },
      { role: "radical initiator", anyOf: ["light", "hv", "AIBN", "peroxide", "ROOR"] },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "a very low steady concentration of Br2, which is what NBS provides",
        decides:
          "whether the bromine adds across the double bond or substitutes next to it. Enough Br2 " +
          "in the flask and the answer becomes the vicinal dibromide instead.",
      },
      {
        dimension: "regime",
        value: "radical, initiated by light or a peroxide",
        decides: "that the mechanism is abstraction and recombination, never an ionic addition",
      },
    ],
    topic: "allylic_halogenation",
    note:
      "The outline's near miss pair with Br2 and a Lewis acid. NBS never brominates a ring, and " +
      "FeBr3 never brominates a side chain.",
  }),

  // ---- diene_addition -----------------------------------------------------
  createReaction({
    id: "diene-1-2-addition-kinetic",
    name: "1,2 addition to a conjugated diene",
    aliases: ["kinetic addition to a diene", "cold HBr on butadiene"],
    transformation:
      "A conjugated diene picks up HX across the nearer pair of carbons, giving the 1,2 adduct.",
    substrateClasses: ["conjugated diene"],
    productClasses: ["allylic halide", "alkene"],
    reagents: [{ role: "electrophile", anyOf: ["HBr", "HCl", "Br2"] }],
    conditions: [
      {
        dimension: "temperature",
        value: "low, around -80 C",
        decides:
          "which product wins, and it is the whole lesson. Cold, nothing has the energy to go back " +
          "over the barrier, so the product that formed fastest is the product you keep.",
      },
    ],
    topic: "diene_addition",
  }),
  createReaction({
    id: "diene-1-4-addition-thermodynamic",
    name: "1,4 addition to a conjugated diene",
    aliases: ["thermodynamic addition to a diene", "warm HBr on butadiene", "conjugate addition to a diene"],
    transformation:
      "A conjugated diene picks up HX across the outer carbons, giving the more substituted internal alkene.",
    substrateClasses: ["conjugated diene"],
    productClasses: ["allylic halide", "alkene"],
    reagents: [{ role: "electrophile", anyOf: ["HBr", "HCl", "Br2"] }],
    conditions: [
      {
        dimension: "temperature",
        value: "warm, around 40 C or above",
        decides:
          "which product wins. Warm, the first formed adduct can ionise back to the allylic cation " +
          "and the mixture settles on whichever product is lower in energy, which is the one with " +
          "the more substituted double bond.",
      },
    ],
    topic: "diene_addition",
    note:
      "Same reagents as the 1,2 row, same substrate, and only the temperature differs. That is why " +
      "conditions are a first class field in this table.",
  }),

  // ---- diels_alder --------------------------------------------------------
  createReaction({
    id: "diels-alder",
    name: "Diels-Alder cycloaddition",
    aliases: ["Diels Alder", "[4+2] cycloaddition", "diene plus dienophile"],
    transformation: "A conjugated diene and an alkene join in one step to give a cyclohexene.",
    substrateClasses: ["conjugated diene", "alkene", "enone"],
    productClasses: ["cyclohexene", "bicyclic alkene"],
    reagents: [
      {
        role: "dienophile",
        anyOf: ["maleic anhydride", "acrolein", "methyl acrylate", "electron poor alkene", "alkyne"],
      },
      { role: "heat", anyOf: ["heat", "warm toluene", "no catalyst"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "heat, and the diene must be able to reach s-cis",
        decides:
          "whether the reaction happens at all. A diene locked s-trans cannot present both ends to " +
          "the dienophile, and the outline records the s-cis lockout as a top Act 1 mistake.",
      },
      {
        dimension: "regime",
        value: "concerted, one step, no intermediate",
        decides:
          "that every stereochemical relationship in the two starting pieces survives into the ring",
      },
    ],
    topic: "diels_alder",
  }),
  createReaction({
    id: "retro-diels-alder",
    name: "Retro Diels-Alder",
    aliases: ["retro Diels Alder", "cycloreversion"],
    transformation: "A cyclohexene splits back into a diene and a dienophile.",
    substrateClasses: ["cyclohexene", "bicyclic alkene"],
    productClasses: ["conjugated diene", "alkene"],
    reagents: [{ role: "heat", anyOf: ["heat", "strong heat", "flash vacuum pyrolysis"] }],
    conditions: [
      {
        dimension: "temperature",
        value: "considerably hotter than the forward reaction",
        decides: "which direction the same equilibrium runs",
      },
    ],
    topic: "diels_alder",
  }),

  // ---- phenols ------------------------------------------------------------
  createReaction({
    id: "phenol-to-aryl-ether",
    name: "Aryl ether from a phenol",
    aliases: ["phenoxide alkylation", "Williamson on a phenol"],
    transformation: "A phenol is deprotonated and alkylated to give an aryl ether.",
    substrateClasses: ["phenol", "phenoxide"],
    productClasses: ["aryl ether"],
    reagents: [
      { role: "base", anyOf: ["NaOH", "K2CO3", "NaH"] },
      { role: "electrophile", anyOf: ["CH3I", "R-X", "primary alkyl halide", "dimethyl sulfate"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "mildly basic is enough",
        decides:
          "how strong a base the question needs. A phenol near pKa 10 is deprotonated by hydroxide, " +
          "where an ordinary alcohol near pKa 16 is not.",
      },
    ],
    topic: "phenols",
  }),
  createReaction({
    id: "phenol-oxidation-to-quinone",
    name: "Oxidation of a phenol to a quinone",
    aliases: ["quinone formation", "hydroquinone oxidation"],
    transformation: "A phenol or hydroquinone is oxidised to the conjugated diketone.",
    substrateClasses: ["phenol"],
    productClasses: ["quinone"],
    reagents: [{ role: "oxidant", anyOf: ["Na2Cr2O7", "CrO3", "Ag2O", "Fremy's salt"] }],
    conditions: [
      {
        dimension: "regime",
        value: "oxidising, mildly acidic",
        decides: "that the ring gives up its aromaticity, which is why this needs a real oxidant",
      },
    ],
    topic: "phenols",
  }),

  // ---- aromatic_substitution ---------------------------------------------
  createReaction({
    id: "eas-nitration",
    name: "Nitration of an arene",
    aliases: ["nitration", "mixed acid nitration", "HNO3 and H2SO4"],
    transformation: "An arene picks up a nitro group.",
    substrateClasses: ["arene", "alkyl arene"],
    productClasses: ["nitroarene"],
    reagents: [
      { role: "nitrating agent", anyOf: ["HNO3", "nitric acid"] },
      { role: "acid catalyst", anyOf: ["H2SO4", "sulfuric acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "strongly acidic",
        decides:
          "that the real electrophile is the nitronium ion. It also decides that a basic " +
          "substituent such as an amine is protonated first, which flips it from activating to " +
          "strongly deactivating.",
      },
    ],
    topic: "aromatic_substitution",
    note: "The usual route to an aryl amine is this row followed by the nitro reduction row.",
  }),
  createReaction({
    id: "eas-halogenation",
    name: "Halogenation of an arene",
    aliases: ["ring bromination", "bromination with a Lewis acid", "chlorination of benzene"],
    transformation: "An arene picks up a halogen on the ring.",
    substrateClasses: ["arene", "alkyl arene", "phenol"],
    productClasses: ["aryl halide"],
    reagents: [
      { role: "halogen", anyOf: ["Br2", "Cl2", "I2"] },
      { role: "Lewis acid catalyst", group: "lewis_acid_halide" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "Lewis acidic, and the halogen is in real concentration",
        decides:
          "that the ring is brominated rather than the side chain. Take the Lewis acid away and " +
          "supply the bromine slowly instead, and NBS chemistry takes over at the benzylic carbon.",
      },
    ],
    topic: "aromatic_substitution",
    note:
      "The outline's near miss pair with NBS. The Lewis acid group is why a student who searches " +
      "AlBr3 finds the reaction the textbook wrote with FeBr3.",
  }),
  createReaction({
    id: "eas-sulfonation",
    name: "Sulfonation of an arene",
    aliases: ["sulfonation", "fuming sulfuric acid", "oleum"],
    transformation: "An arene picks up a sulfonic acid group, reversibly.",
    substrateClasses: ["arene", "alkyl arene"],
    productClasses: ["arenesulfonic acid"],
    reagents: [{ role: "sulfonating agent", anyOf: ["SO3", "fuming H2SO4", "oleum", "H2SO4"] }],
    conditions: [
      {
        dimension: "regime",
        value: "reversible, unlike every other EAS on this list",
        decides:
          "that it can be used as a temporary blocking group. Hot dilute aqueous acid takes it " +
          "back off once it has done its job.",
      },
    ],
    topic: "aromatic_substitution",
  }),
  createReaction({
    id: "friedel-crafts-alkylation",
    name: "Friedel-Crafts alkylation",
    aliases: ["Friedel Crafts alkylation", "FC alkylation"],
    transformation: "An arene picks up an alkyl group.",
    substrateClasses: ["arene", "alkyl arene"],
    productClasses: ["alkyl arene"],
    reagents: [
      { role: "alkyl source", anyOf: ["R-Cl", "alkyl halide", "alkene", "alcohol"] },
      { role: "Lewis acid catalyst", group: "lewis_acid_halide" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "Lewis acidic, and a carbocation really is formed",
        decides:
          "the two failure modes this reaction is famous for. The cation rearranges before it " +
          "reaches the ring, and the product is more activated than the starting material so it " +
          "gets alkylated again.",
      },
      {
        dimension: "stoichiometry",
        value: "excess arene helps, one equivalent does not",
        decides: "how much polyalkylation shows up in the answer",
      },
    ],
    topic: "aromatic_substitution",
    note:
      "Fails outright on a strongly deactivated ring, which the outline records as a top Act 1 " +
      "mistake pattern.",
  }),
  createReaction({
    id: "friedel-crafts-acylation",
    name: "Friedel-Crafts acylation",
    aliases: ["Friedel Crafts acylation", "FC acylation", "acylium chemistry"],
    transformation: "An arene picks up an acyl group, giving an aryl ketone.",
    substrateClasses: ["arene", "alkyl arene"],
    productClasses: ["aryl ketone", "ketone"],
    reagents: [
      { role: "acyl source", anyOf: ["RCOCl", "acyl chloride", "acid anhydride"] },
      { role: "Lewis acid catalyst", group: "lewis_acid_halide" },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "more than one equivalent of Lewis acid",
        decides:
          "whether the reaction turns over. The ketone product binds the Lewis acid, so a " +
          "catalytic amount is consumed rather than recycled.",
      },
      {
        dimension: "regime",
        value: "the acylium ion cannot rearrange and the product is deactivated",
        decides:
          "that this route gives a clean single addition where alkylation does not. It is why the " +
          "standard way to hang a straight chain on a ring is acylate then reduce.",
      },
    ],
    topic: "aromatic_substitution",
  }),
  createReaction({
    id: "aryl-ketone-to-alkyl-arene",
    name: "Carbonyl to methylene on an arene",
    aliases: ["Clemmensen reduction", "Wolff-Kishner reduction", "deoxygenation of an aryl ketone"],
    transformation: "An aryl ketone is reduced all the way to the CH2, giving a straight alkyl chain.",
    substrateClasses: ["aryl ketone", "ketone", "aldehyde"],
    productClasses: ["alkyl arene", "alkane"],
    reagents: [{ role: "reductant", group: "carbonyl_to_methylene" }],
    conditions: [
      {
        dimension: "regime",
        value: "strongly acidic for Clemmensen, strongly basic for Wolff-Kishner",
        decides:
          "which member of the group a question wants. They reach the same product, so the choice " +
          "is made entirely by what else on the molecule has to survive.",
      },
      {
        dimension: "temperature",
        value: "heat, in both cases",
        decides: "that nothing here is a mild step to slip into the middle of a delicate sequence",
      },
    ],
    topic: "aromatic_substitution",
    note: "The second half of the acylate then reduce route to an unrearranged alkyl chain.",
  }),
  createReaction({
    id: "nitroarene-reduction-to-aniline",
    name: "Reduction of a nitroarene to an aryl amine",
    aliases: ["nitro reduction", "making aniline", "Fe and HCl reduction"],
    transformation: "A nitro group on a ring becomes an amine.",
    substrateClasses: ["nitroarene"],
    productClasses: ["aryl amine", "primary amine"],
    reagents: [{ role: "reductant", group: "nitro_reduction" }],
    conditions: [
      {
        dimension: "regime",
        value: "acidic for the metal routes, neutral for catalytic hydrogenation",
        decides:
          "whether other reducible groups survive. H2 over palladium will also reduce an alkene " +
          "elsewhere in the molecule, and iron in aqueous acid will not.",
      },
    ],
    topic: "aromatic_substitution",
    note:
      "The step that flips a strong deactivator into a strong activator, which is what makes it the " +
      "hinge of most aromatic synthesis ordering questions.",
  }),

  // ---- nucleophilic_aromatic_substitution --------------------------------
  createReaction({
    id: "snar-addition-elimination",
    name: "Nucleophilic aromatic substitution, addition elimination",
    aliases: ["SNAr", "SN Ar", "Meisenheimer route"],
    transformation:
      "A nucleophile replaces a halide on a ring that carries strong electron withdrawing groups.",
    substrateClasses: ["activated aryl halide", "aryl halide"],
    productClasses: ["aryl ether", "aryl amine", "phenol"],
    reagents: [
      { role: "nucleophile", anyOf: ["NaOH", "NaOMe", "NaOEt", "NH3", "amine", "NaSR"] },
      { role: "heat", anyOf: ["heat", "warm"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "the ring needs a strong withdrawing group ortho or para to the halide",
        decides:
          "whether the route works at all. The negative charge in the intermediate has to be able " +
          "to reach that group, and only ortho and para positions can.",
      },
    ],
    topic: "nucleophilic_aromatic_substitution",
  }),
  createReaction({
    id: "benzyne-elimination-addition",
    name: "Benzyne, elimination addition",
    aliases: ["benzyne", "elimination addition", "sodium amide on an aryl halide"],
    transformation:
      "A very strong base pulls a proton next to an unactivated aryl halide and a nucleophile adds to the benzyne that results.",
    substrateClasses: ["aryl halide"],
    productClasses: ["aryl amine", "phenol"],
    reagents: [
      { role: "very strong base", anyOf: ["NaNH2", "sodium amide", "KNH2"] },
      { role: "solvent and nucleophile", anyOf: ["NH3", "liquid ammonia"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "no activating group required, and a base far stronger than SNAr needs",
        decides:
          "which of the two aromatic substitution routes a question is describing. It also decides " +
          "that two products can appear, because the nucleophile may add to either end of the " +
          "benzyne triple bond.",
      },
    ],
    topic: "nucleophilic_aromatic_substitution",
  }),

  // ---- arene_side_chain_chemistry ----------------------------------------
  createReaction({
    id: "benzylic-oxidation-to-benzoic-acid",
    name: "Benzylic oxidation of an alkyl arene",
    aliases: ["side chain oxidation", "permanganate on a side chain", "making benzoic acid"],
    transformation: "Any alkyl side chain with a benzylic hydrogen is cut back to a carboxylic acid.",
    substrateClasses: ["alkyl arene"],
    productClasses: ["benzoic acid", "carboxylic acid"],
    reagents: [
      { role: "oxidant", group: "benzylic_oxidation" },
      { role: "heat", anyOf: ["heat", "hot aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "the benzylic carbon must carry at least one hydrogen",
        decides:
          "whether anything happens. A tert-butyl group has no benzylic hydrogen and survives the " +
          "whole reaction untouched.",
      },
      {
        dimension: "stoichiometry",
        value: "the chain length does not matter",
        decides:
          "that a propyl and a butyl chain give the same benzoic acid, which is the surprise this " +
          "reaction is usually asked about",
      },
    ],
    topic: "arene_side_chain_chemistry",
  }),
  createReaction({
    id: "nbs-benzylic-bromination",
    name: "Benzylic bromination with NBS",
    aliases: ["benzylic NBS", "side chain bromination"],
    transformation: "An alkyl arene is brominated at the benzylic carbon, and the ring is untouched.",
    substrateClasses: ["alkyl arene"],
    productClasses: ["benzylic halide"],
    reagents: [
      { role: "bromine source", anyOf: ["NBS", "N-bromosuccinimide"] },
      { role: "radical initiator", anyOf: ["light", "hv", "AIBN", "peroxide", "ROOR"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "radical, no Lewis acid anywhere",
        decides:
          "ring against side chain. This is the outline's near miss pair with Br2 and FeBr3, and " +
          "the reagents share no token at all, which is the cleanest way a table can keep two " +
          "reactions apart.",
      },
    ],
    topic: "arene_side_chain_chemistry",
  }),

  // ---- alkyne_chemistry ---------------------------------------------------
  createReaction({
    id: "terminal-alkyne-alkylation",
    name: "Alkylation of a terminal alkyne",
    aliases: ["acetylide alkylation", "NaNH2 then R-X", "chain extension with an alkyne"],
    transformation: "A terminal alkyne is deprotonated and the acetylide displaces a primary halide.",
    substrateClasses: ["terminal alkyne"],
    productClasses: ["internal alkyne", "alkyne"],
    reagents: [
      { role: "base", anyOf: ["NaNH2", "sodium amide", "n-BuLi"] },
      { role: "electrophile", anyOf: ["R-X", "CH3I", "primary alkyl halide"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "the halide must be methyl or primary",
        decides:
          "whether a bond is made or an alkene appears. An acetylide near pKa 25 is a strong base " +
          "as well as a nucleophile, so a hindered halide eliminates instead.",
      },
      {
        dimension: "stoichiometry",
        value: "the base first, the halide second, never together",
        decides: "that the base does not simply consume the halide before the acetylide exists",
      },
    ],
    topic: "alkyne_chemistry",
    note: "The standard carbon count builder, which is why the outline lists carbon count constrained synthesis as a question form.",
  }),
  createReaction({
    id: "alkyne-hydration-markovnikov",
    name: "Markovnikov hydration of an alkyne",
    aliases: ["mercuric hydration", "HgSO4 hydration", "making a methyl ketone"],
    transformation: "A terminal alkyne becomes a methyl ketone through the enol.",
    substrateClasses: ["terminal alkyne", "alkyne"],
    productClasses: ["methyl ketone", "ketone"],
    reagents: [
      { role: "catalyst", anyOf: ["HgSO4", "Hg(OAc)2", "mercuric sulfate"] },
      { role: "acid and water", anyOf: ["H2SO4", "H2O", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "acidic, Markovnikov",
        decides:
          "which carbon the oxygen lands on, and therefore whether the answer is a methyl ketone " +
          "or an aldehyde",
      },
    ],
    topic: "alkyne_chemistry",
  }),
  createReaction({
    id: "alkyne-hydroboration-oxidation",
    name: "Hydroboration oxidation of an alkyne",
    aliases: ["anti-Markovnikov alkyne hydration", "disiamylborane", "making an aldehyde from an alkyne"],
    transformation: "A terminal alkyne becomes an aldehyde through the enol.",
    substrateClasses: ["terminal alkyne", "alkyne"],
    productClasses: ["aldehyde"],
    reagents: [
      { role: "borane", anyOf: ["BH3", "disiamylborane", "9-BBN", "Sia2BH"] },
      { role: "oxidative workup", anyOf: ["H2O2", "NaOH", "hydrogen peroxide"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "anti-Markovnikov",
        decides:
          "the opposite regiochemistry to the mercuric route. Same alkyne, same oxidation level, " +
          "different carbon.",
      },
    ],
    topic: "alkyne_chemistry",
  }),
  createReaction({
    id: "alkyne-to-cis-alkene-lindlar",
    name: "Partial reduction of an alkyne to a cis alkene",
    aliases: ["Lindlar", "Lindlar catalyst", "poisoned palladium"],
    transformation: "An internal alkyne is reduced once, delivering both hydrogens to the same face.",
    substrateClasses: ["alkyne", "internal alkyne"],
    productClasses: ["cis alkene", "alkene"],
    reagents: [
      { role: "hydrogen", anyOf: ["H2"] },
      { role: "poisoned catalyst", anyOf: ["Lindlar", "Lindlar catalyst", "Pd/CaCO3 with quinoline"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "the catalyst is deliberately poisoned",
        decides:
          "that the reduction stops at the alkene instead of running on to the alkane. Ordinary " +
          "Pd/C does not stop.",
      },
    ],
    topic: "alkyne_chemistry",
  }),
  createReaction({
    id: "alkyne-to-trans-alkene-dissolving-metal",
    name: "Dissolving metal reduction of an alkyne to a trans alkene",
    aliases: ["Na in liquid ammonia", "dissolving metal reduction", "making a trans alkene"],
    transformation: "An internal alkyne is reduced to the trans alkene through a radical anion.",
    substrateClasses: ["alkyne", "internal alkyne"],
    productClasses: ["trans alkene", "alkene"],
    reagents: [
      { role: "metal", anyOf: ["Na", "Li", "sodium"] },
      { role: "solvent", anyOf: ["NH3", "liquid ammonia"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "-78 C, ammonia kept liquid",
        decides: "that the ammonia is a solvent rather than a gas",
      },
      {
        dimension: "regime",
        value: "single electron transfer, through a vinyl radical anion",
        decides:
          "the trans geometry. The intermediate settles with the two groups apart before the " +
          "second proton arrives.",
      },
    ],
    topic: "alkyne_chemistry",
    note: "The stereochemical opposite of the Lindlar row, from the same starting alkyne.",
  }),
]);
