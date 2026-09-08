/**
 * Act 2 of the Organic Chemistry II outline: the carbonyl as electrophile.
 *
 * Authored fresh from the per topic reagent vocabulary in
 * `docs/COURSE-OUTLINE-ORGO2.md` section 6, on the same terms as act1.ts.
 *
 * Three of the outline's ten near miss pairs live in this file, and each is two
 * rows rather than one:
 *
 *   one equivalent of alcohol against excess       hemiacetal against acetal
 *   an acyl chloride with a cuprate against RMgX   ketone against tertiary alcohol
 *   NaBH4 against LiAlH4                           the ester rows are in act1.ts,
 *                                                  under the oxidation ladder topic
 */

import { createReaction } from "../reaction.js";
import type { Reaction } from "../types.js";

export const ACT_2_REACTIONS: readonly Reaction[] = Object.freeze([
  // ---- nucleophilic_addition_carbon --------------------------------------
  createReaction({
    id: "organometallic-addition-to-carbonyl",
    name: "Organometallic addition to an aldehyde or ketone",
    aliases: ["Grignard addition", "Grignard reaction", "organolithium addition", "1,2 addition"],
    transformation:
      "A carbon nucleophile adds straight to the carbonyl carbon. An aldehyde gives a secondary alcohol and a ketone gives a tertiary one.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["secondary alcohol", "tertiary alcohol"],
    reagents: [
      { role: "carbon nucleophile", group: "organometallic_1_2" },
      { role: "solvent", anyOf: ["Et2O", "THF", "diethyl ether"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "strictly anhydrous and aprotic until the workup",
        decides:
          "whether the reagent survives to meet the carbonyl at all. A carbon base near pKa 50 is " +
          "quenched instantly by water, an alcohol, or an N-H.",
      },
      {
        dimension: "workup",
        value: "aqueous acid after the addition",
        decides:
          "whether the answer is the alcohol or the alkoxide. The outline records the alkoxide " +
          "written as the final product as a top Act 2 mistake.",
      },
    ],
    topic: "nucleophilic_addition_carbon",
    note:
      "The outline's near miss pair with a cuprate. These add 1,2 even when the substrate is an " +
      "enone, which is the whole reason the pair is worth teaching.",
  }),
  createReaction({
    id: "grignard-double-addition-to-ester",
    name: "Two equivalents of a Grignard reagent onto an ester",
    aliases: ["Grignard on an ester", "over addition", "tertiary alcohol from an ester"],
    transformation:
      "An ester takes two equivalents of the organometallic and ends as a tertiary alcohol carrying two identical new groups.",
    substrateClasses: ["ester", "acyl chloride"],
    productClasses: ["tertiary alcohol"],
    reagents: [
      { role: "carbon nucleophile", group: "organometallic_1_2" },
      { role: "solvent", anyOf: ["Et2O", "THF"] },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "two equivalents, and it happens whether you meant it or not",
        decides:
          "that the ketone formed halfway is never isolable. It is more reactive than the ester it " +
          "came from, so the second equivalent finds it before any ester is left.",
      },
      {
        dimension: "workup",
        value: "aqueous acid",
        decides: "the alcohol rather than the alkoxide",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
    note:
      "The outline's near miss pair with the cuprate row. Same acyl chloride, two equivalents of " +
      "RMgX gives a tertiary alcohol and one equivalent of R2CuLi gives the ketone.",
  }),
  createReaction({
    id: "cuprate-acyl-chloride-to-ketone",
    name: "Cuprate on an acyl chloride",
    aliases: ["Gilman reagent", "R2CuLi on an acid chloride", "stopping at the ketone"],
    transformation: "An acyl chloride takes one carbon group from a cuprate and stops at the ketone.",
    substrateClasses: ["acyl chloride"],
    productClasses: ["ketone"],
    reagents: [
      { role: "carbon nucleophile", anyOf: ["R2CuLi", "cuprate", "Gilman reagent", "Me2CuLi"] },
      { role: "solvent", anyOf: ["Et2O", "THF"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "cold, usually -78 C to 0 C",
        decides: "that the ketone survives rather than being attacked again",
      },
      {
        dimension: "stoichiometry",
        value: "one equivalent",
        decides:
          "the difference between this row and the Grignard row. A cuprate is soft enough to stop " +
          "after one delivery, which no Grignard reagent does.",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "cyanohydrin-formation",
    name: "Cyanohydrin formation",
    aliases: ["cyanohydrin", "HCN addition", "adding one carbon to a carbonyl"],
    transformation: "Cyanide adds to a carbonyl and the oxygen is protonated, giving a cyanohydrin.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["cyanohydrin", "nitrile"],
    reagents: [
      { role: "cyanide source", group: "cyanohydrin_source" },
      { role: "proton source", anyOf: ["H3O+", "HCl", "mild acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "mildly acidic, or a cyanide salt followed by acid",
        decides:
          "that there is enough cyanide to attack and enough acid to protonate the alkoxide, which " +
          "is a narrow window rather than a free choice",
      },
    ],
    topic: "nucleophilic_addition_carbon",
    note: "The usual one carbon extension, and the nitrile it leaves behind can go on to an acid or an amine.",
  }),
  createReaction({
    id: "wittig-reaction",
    name: "Wittig reaction",
    aliases: ["Wittig", "ylide olefination", "phosphorus ylide"],
    transformation: "A carbonyl carbon becomes an alkene carbon, with the oxygen leaving on phosphorus.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["alkene from a ylide", "alkene"],
    reagents: [
      { role: "ylide", anyOf: ["Ph3P=CH2", "ylide", "phosphorus ylide", "Wittig reagent"] },
      { role: "ylide precursor", anyOf: ["PPh3", "triphenylphosphine", "n-BuLi", "NaH"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "anhydrous, the ylide is made with a strong base first",
        decides: "that the ylide exists when the carbonyl arrives",
      },
      {
        dimension: "temperature",
        value: "a stabilised ylide tends to E, an unstabilised one tends to Z",
        decides:
          "the alkene geometry, which is the part of this reaction a question is usually really about",
      },
    ],
    topic: "nucleophilic_addition_carbon",
  }),

  // ---- nucleophilic_addition_oxygen --------------------------------------
  createReaction({
    id: "hemiacetal-formation",
    name: "Hemiacetal formation",
    aliases: ["hemiacetal", "one equivalent of alcohol", "hemiketal"],
    transformation:
      "One equivalent of alcohol adds to a carbonyl, giving a carbon carrying both an OH and an OR.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["hemiacetal"],
    reagents: [
      { role: "alcohol", anyOf: ["ROH", "CH3OH", "EtOH", "alcohol"] },
      { role: "acid catalyst", anyOf: ["H3O+", "TsOH", "HCl", "trace acid"] },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "one equivalent of alcohol",
        decides:
          "whether the answer is a hemiacetal or an acetal, and it is the outline's own near miss " +
          "pair. Nothing else about the two reactions differs.",
      },
      {
        dimension: "workup",
        value: "the water is left in the flask",
        decides: "that the equilibrium sits back toward the carbonyl rather than moving on",
      },
    ],
    topic: "nucleophilic_addition_oxygen",
  }),
  createReaction({
    id: "acetal-formation",
    name: "Acetal formation",
    aliases: ["acetal", "ketal", "protecting a carbonyl", "excess alcohol"],
    transformation:
      "Excess alcohol replaces the carbonyl oxygen entirely, giving a carbon carrying two OR groups.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["acetal"],
    reagents: [
      { role: "alcohol", anyOf: ["ROH", "CH3OH", "EtOH", "ethylene glycol", "diol"] },
      { role: "acid catalyst", anyOf: ["TsOH", "H2SO4", "HCl", "trace acid"] },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "excess alcohol, or one equivalent of a diol",
        decides:
          "the acetal rather than the hemiacetal. This is the whole content of the near miss pair.",
      },
      {
        dimension: "workup",
        value: "the water is removed as it forms, usually with a Dean-Stark trap",
        decides:
          "which way a freely reversible equilibrium runs. Leave the water in and the carbonyl " +
          "comes back.",
      },
      {
        dimension: "regime",
        value: "acidic, and stable to base afterwards",
        decides:
          "why this is the standard carbonyl protecting group. An acetal ignores a Grignard reagent " +
          "and a hydride, and is removed by aqueous acid when the job is done.",
      },
    ],
    topic: "nucleophilic_addition_oxygen",
  }),
  createReaction({
    id: "acetal-hydrolysis",
    name: "Acetal hydrolysis",
    aliases: ["deprotection", "removing an acetal", "unmasking a carbonyl"],
    transformation: "An acetal is hydrolysed back to the carbonyl it was protecting.",
    substrateClasses: ["acetal", "hemiacetal", "imine", "enamine"],
    productClasses: ["aldehyde", "ketone"],
    reagents: [{ role: "aqueous acid", anyOf: ["H3O+", "aqueous acid", "HCl", "H2SO4"] }],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "excess water",
        decides: "the direction of the same equilibrium the acetal row runs forward",
      },
    ],
    topic: "nucleophilic_addition_oxygen",
    note:
      "Forgetting this step is the outline's recorded protecting group mistake: the group goes on " +
      "and never comes off.",
  }),

  // ---- nucleophilic_addition_nitrogen ------------------------------------
  createReaction({
    id: "imine-formation",
    name: "Imine formation",
    aliases: ["imine", "Schiff base", "condensation with a primary amine"],
    transformation: "A primary amine replaces the carbonyl oxygen with a C=N.",
    substrateClasses: ["aldehyde", "ketone", "primary amine"],
    productClasses: ["imine"],
    reagents: [
      { role: "amine", anyOf: ["RNH2", "primary amine", "NH3", "aniline"] },
      { role: "acid catalyst", anyOf: ["mild acid", "H3O+", "pH 4 to 5 buffer", "TsOH"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "mildly acidic, around pH 4 to 5",
        decides:
          "whether anything forms. Too basic and the OH never leaves, too acidic and the amine is " +
          "protonated and stops being a nucleophile.",
      },
      {
        dimension: "workup",
        value: "water removed",
        decides: "which way the condensation equilibrium sits",
      },
    ],
    topic: "nucleophilic_addition_nitrogen",
    note:
      "Imine or enamine is decided by the AMINE class, never by the carbonyl. The outline records " +
      "choosing from the carbonyl as a top Act 2 mistake.",
  }),
  createReaction({
    id: "enamine-formation",
    name: "Enamine formation",
    aliases: ["enamine", "Stork enamine precursor", "condensation with a secondary amine"],
    transformation:
      "A secondary amine replaces the carbonyl oxygen and, with no N-H left to lose, the double bond goes to carbon.",
    substrateClasses: ["aldehyde", "ketone", "secondary amine"],
    productClasses: ["enamine"],
    reagents: [
      { role: "amine", group: "enamine_secondary_amine" },
      { role: "acid catalyst", anyOf: ["TsOH", "mild acid", "H3O+"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "mildly acidic",
        decides: "the same narrow window the imine row needs, for the same reason",
      },
      {
        dimension: "workup",
        value: "water removed",
        decides: "which way the condensation equilibrium sits",
      },
    ],
    topic: "nucleophilic_addition_nitrogen",
    note: "A tertiary amine gives neither, because it has no N-H at all. That is the third case in the same lesson.",
  }),

  // ---- carboxylic_acids ---------------------------------------------------
  createReaction({
    id: "fischer-esterification",
    name: "Fischer esterification",
    aliases: ["Fischer", "acid plus alcohol", "esterification"],
    transformation: "A carboxylic acid and an alcohol give an ester and water.",
    substrateClasses: ["carboxylic acid"],
    productClasses: ["ester"],
    reagents: [
      { role: "alcohol", anyOf: ["ROH", "CH3OH", "EtOH", "alcohol"] },
      { role: "acid catalyst", group: "fischer_catalyst" },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "excess alcohol, or the water removed",
        decides:
          "whether any ester is left at the end. Every step is reversible, so the answer is " +
          "controlled by Le Chatelier rather than by the mechanism.",
      },
      {
        dimension: "regime",
        value: "acidic throughout",
        decides:
          "that the carbonyl is activated for a weak nucleophile. This is not a route a strong " +
          "base version of exists.",
      },
    ],
    topic: "carboxylic_acids",
  }),
  createReaction({
    id: "acid-to-acyl-chloride",
    name: "Carboxylic acid to acyl chloride",
    aliases: ["making an acid chloride", "thionyl chloride on an acid", "activation"],
    transformation:
      "A carboxylic acid is converted to the acyl chloride, which is the top of the reactivity ladder.",
    substrateClasses: ["carboxylic acid"],
    productClasses: ["acyl chloride"],
    reagents: [
      { role: "activating agent", group: "acid_to_acyl_chloride" },
      { role: "catalyst", anyOf: ["DMF", "pyridine"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "anhydrous, and the by-products are gases",
        decides:
          "that no purification is needed, which is why this is the standard first move when a " +
          "question needs to climb the acyl ladder upward",
      },
    ],
    topic: "carboxylic_acids",
    note:
      "The ladder only runs downhill on its own. Getting from an acid to an amide or an ester in " +
      "one step upward is what this row exists for.",
  }),
  createReaction({
    id: "beta-keto-acid-decarboxylation",
    name: "Decarboxylation of a beta keto acid",
    aliases: ["decarboxylation", "losing CO2", "beta keto acid"],
    transformation: "A carboxylic acid with a carbonyl two carbons away loses CO2 on heating.",
    substrateClasses: ["carboxylic acid", "beta keto ester"],
    productClasses: ["ketone", "carboxylic acid"],
    reagents: [
      { role: "heat", anyOf: ["heat", "warm"] },
      { role: "aqueous acid for the preceding hydrolysis", anyOf: ["H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "heat, and nothing else is needed",
        decides:
          "whether the CO2 leaves. The six membered transition state needs the second carbonyl to " +
          "be exactly beta, so an alpha or a gamma acid simply does not do this.",
      },
    ],
    topic: "carboxylic_acids",
    note:
      "The step the outline records students forgetting at the end of an acetoacetic or malonic " +
      "ester synthesis.",
  }),

  // ---- nucleophilic_acyl_substitution ------------------------------------
  createReaction({
    id: "acyl-chloride-to-amide",
    name: "Amide from an acyl chloride",
    aliases: ["amide formation", "acid chloride plus amine"],
    transformation: "An acyl chloride and an amine give an amide.",
    substrateClasses: ["acyl chloride", "primary amine", "secondary amine"],
    productClasses: ["amide"],
    reagents: [
      { role: "amine", anyOf: ["RNH2", "R2NH", "NH3", "primary amine", "secondary amine"] },
      { role: "acid scavenger", group: "amine_acid_scavenger" },
    ],
    conditions: [
      {
        dimension: "stoichiometry",
        value: "two equivalents of amine, or one plus a separate base",
        decides:
          "whether half the amine is wasted. The HCl released protonates whatever base is nearest, " +
          "and if that is the amine then half of it never reacts.",
      },
      {
        dimension: "regime",
        value: "downhill on the acyl ladder, so it needs no catalyst",
        decides: "that this direction always works and the reverse never does in one step",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "acyl-chloride-to-ester",
    name: "Ester from an acyl chloride or an anhydride",
    aliases: ["acylation of an alcohol", "acetylation", "anhydride plus alcohol"],
    transformation: "An acyl chloride or an acid anhydride and an alcohol give an ester.",
    substrateClasses: ["acyl chloride", "acid anhydride", "primary alcohol", "secondary alcohol", "phenol"],
    productClasses: ["ester"],
    reagents: [
      { role: "alcohol", anyOf: ["ROH", "alcohol", "phenol"] },
      { role: "acid scavenger", group: "amine_acid_scavenger" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "basic or neutral, and irreversible in practice",
        decides:
          "why a question reaches for this rather than Fischer esterification when the alcohol is " +
          "precious or the substrate cannot see strong acid",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "ester-saponification",
    name: "Saponification of an ester",
    aliases: ["saponification", "basic ester hydrolysis", "NaOH on an ester"],
    transformation: "An ester is hydrolysed by hydroxide to the carboxylate salt.",
    substrateClasses: ["ester"],
    productClasses: ["carboxylate salt", "carboxylic acid", "primary alcohol"],
    reagents: [
      { role: "base", anyOf: ["NaOH", "KOH", "LiOH", "hydroxide"] },
      { role: "acidic workup", anyOf: ["H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "basic, and irreversible",
        decides:
          "the direction. The last step deprotonates the acid to a carboxylate, which no alcohol " +
          "will attack, so the reaction cannot run back. The outline records forgetting this as a " +
          "top Act 2 mistake.",
      },
      {
        dimension: "workup",
        value: "acid added at the end",
        decides:
          "whether the answer drawn is the carboxylate or the free acid. Without it the salt is the " +
          "product.",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "amide-hydrolysis",
    name: "Hydrolysis of an amide",
    aliases: ["amide hydrolysis", "breaking an amide"],
    transformation: "An amide is hydrolysed to a carboxylic acid and an amine.",
    substrateClasses: ["amide", "nitrile"],
    productClasses: ["carboxylic acid", "carboxylate salt", "primary amine"],
    reagents: [
      { role: "acid or base", anyOf: ["H3O+", "H2SO4", "NaOH", "KOH"] },
      { role: "heat", anyOf: ["heat", "reflux"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "prolonged heat",
        decides:
          "whether it happens on any useful timescale. An amide is the bottom of the acyl ladder " +
          "and the least reactive of the derivatives.",
      },
      {
        dimension: "regime",
        value: "acidic gives the ammonium salt, basic gives the carboxylate",
        decides: "which two species are drawn as the answer",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "dcc-amide-coupling",
    name: "Direct amide coupling with DCC",
    aliases: ["DCC coupling", "peptide coupling", "EDC coupling"],
    transformation:
      "A carboxylic acid and an amine are joined to an amide without going through the acyl chloride.",
    substrateClasses: ["carboxylic acid", "primary amine", "secondary amine"],
    productClasses: ["amide"],
    reagents: [
      { role: "coupling reagent", group: "amide_coupling" },
      { role: "amine", anyOf: ["RNH2", "R2NH", "amino acid", "primary amine"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "neutral and mild",
        decides:
          "why this route exists at all. It reaches an amide without the strong acid, strong base " +
          "or heat that would racemise a stereocentre next to the carbonyl.",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
  }),
  createReaction({
    id: "nitrile-hydrolysis-to-acid",
    name: "Hydrolysis of a nitrile to a carboxylic acid",
    aliases: ["nitrile hydrolysis", "CN to COOH"],
    transformation: "A nitrile is hydrolysed through the amide to the carboxylic acid.",
    substrateClasses: ["nitrile", "cyanohydrin"],
    productClasses: ["carboxylic acid", "carboxylate salt"],
    reagents: [
      { role: "acid or base with water", anyOf: ["H3O+", "H2SO4", "NaOH", "aqueous acid"] },
      { role: "heat", anyOf: ["heat", "reflux"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "heat",
        decides: "whether it stops at the amide or carries on to the acid",
      },
    ],
    topic: "nucleophilic_acyl_substitution",
    note: "Pairs with the cyanohydrin row as the standard way to add one carbon and end up at an acid.",
  }),
]);
