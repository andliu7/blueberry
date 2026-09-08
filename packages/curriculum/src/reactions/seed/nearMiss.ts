/**
 * The rows outside Act 1 and Act 2 that the near miss pairs require.
 *
 * WHY THIS FILE EXISTS RATHER THAN BEING FOLDED INTO THE ACT FILES.
 *
 * The seed target for this wave is Act 1 and Act 2. But
 * `docs/COURSE-OUTLINE-ORGO2.md` section 6 lists ten near miss pairs that must
 * never merge into one equivalence group, and four of them have one foot outside
 * those two acts:
 *
 *   HBr against HBr with peroxide        alkene_addition, an Organic I carry
 *   NaOH against a bulky alkoxide        substitution_and_elimination, likewise
 *   LDA cold against an alkoxide warm    enols_and_enolates, Act 3
 *   RMgX against R2CuLi on an enone      conjugate_addition, Act 3
 *
 * A near miss pair is only testable when BOTH sides are in the table. One side
 * present and the other missing does not fail a search, it silently answers a
 * different question, and that is the failure mode this whole file is guarding
 * against. So each of those four pairs is authored here in full, plus the small
 * number of Act 3 anchors those rows would otherwise dangle from.
 *
 * One row here belongs to neither category. Alpha halogenation is authored
 * because the outline's `[EQ alpha halogen: Br2, Cl2]` group would otherwise be
 * declared and used by nothing, and a group no row uses equates nothing. The
 * test that found that is in test/reactions.test.ts and it is the reason this
 * paragraph exists.
 *
 * The Act 3 coverage here is deliberately partial and is not a claim to have
 * seeded Act 3. Enols and enolates carry roughly 54 points of the Act 3 exam by
 * the outline's own measurement, and that block deserves its own wave rather
 * than the handful of rows it takes to make two near miss pairs testable.
 */

import { createReaction } from "../reaction.js";
import type { Reaction } from "../types.js";

export const NEAR_MISS_REACTIONS: readonly Reaction[] = Object.freeze([
  // ---- alkene_addition, the carried Organic Chemistry I topic -------------
  createReaction({
    id: "hydrohalogenation-markovnikov",
    name: "Markovnikov addition of HBr to an alkene",
    aliases: ["hydrohalogenation", "HBr addition", "Markovnikov addition"],
    transformation:
      "HBr adds across an alkene with the halogen landing on the more substituted carbon.",
    substrateClasses: ["alkene"],
    productClasses: ["alkyl halide", "secondary alkyl halide", "tertiary alkyl halide"],
    reagents: [{ role: "acid", anyOf: ["HBr", "HCl", "HI"] }],
    conditions: [
      {
        dimension: "regime",
        value: "ionic, through a carbocation, with no peroxide present",
        decides:
          "which carbon the bromine lands on. The proton adds first and goes wherever leaves the " +
          "more stable cation, and the bromide then follows the charge.",
      },
      {
        dimension: "temperature",
        value: "room temperature is enough",
        decides: "nothing about regiochemistry here, which is why the peroxide is the tell",
      },
    ],
    topic: "alkene_addition",
    note:
      "The outline's near miss pair with the peroxide route. The reagent token HBr is shared, so " +
      "the two rows are separated by the peroxide slot and by the regime, never by the acid.",
  }),
  createReaction({
    id: "hydrobromination-anti-markovnikov",
    name: "Anti-Markovnikov addition of HBr with peroxide",
    aliases: ["radical HBr addition", "peroxide effect", "anti-Markovnikov hydrobromination"],
    transformation:
      "HBr adds across an alkene with the bromine landing on the LESS substituted carbon.",
    substrateClasses: ["alkene"],
    productClasses: ["alkyl halide", "primary alkyl halide"],
    reagents: [
      { role: "acid", anyOf: ["HBr"] },
      { role: "radical initiator", anyOf: ["ROOR", "peroxide", "H2O2", "AIBN", "light", "hv"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "radical, and only HBr does this",
        decides:
          "the regiochemistry, and it is the entire lesson. The bromine radical adds first and adds " +
          "where it leaves the more stable carbon radical, which is the opposite carbon to the " +
          "ionic route. HCl and HI do not work this way, so the peroxide trick is HBr only.",
      },
    ],
    topic: "alkene_addition",
  }),

  // ---- substitution_and_elimination, the carried Organic Chemistry I topic
  createReaction({
    id: "e2-zaitsev",
    name: "E2 elimination to the Zaitsev alkene",
    aliases: ["E2", "Zaitsev elimination", "hydroxide elimination"],
    transformation:
      "A small strong base removes a proton anti to the leaving group and gives the more substituted alkene.",
    substrateClasses: ["secondary alkyl halide", "tertiary alkyl halide", "sulfonate ester"],
    productClasses: ["alkene"],
    reagents: [
      { role: "base", anyOf: ["NaOH", "KOH", "NaOEt", "NaOMe", "hydroxide", "ethoxide"] },
      { role: "heat", anyOf: ["heat", "warm"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "a small base, so it can reach the crowded proton",
        decides:
          "which alkene wins. A small base takes the proton that leads to the more substituted, " +
          "lower energy alkene.",
      },
      {
        dimension: "temperature",
        value: "heat, which favours elimination over substitution",
        decides: "whether the answer is the alkene or the substitution product",
      },
    ],
    topic: "substitution_and_elimination",
    note:
      "The outline's near miss pair with a bulky alkoxide. Same substrate, same mechanism, " +
      "different alkene, and the only difference is the size of the base.",
  }),
  createReaction({
    id: "e2-hofmann",
    name: "E2 elimination to the Hofmann alkene",
    aliases: ["Hofmann elimination", "bulky base elimination", "tert-butoxide elimination"],
    transformation:
      "A hindered base removes the most accessible proton and gives the LESS substituted alkene.",
    substrateClasses: ["secondary alkyl halide", "tertiary alkyl halide", "sulfonate ester"],
    productClasses: ["alkene"],
    reagents: [
      { role: "base", group: "bulky_alkoxide" },
      { role: "heat", anyOf: ["heat", "warm"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "a bulky base, which cannot reach the crowded proton",
        decides:
          "which alkene wins, and it is the whole pair. The base takes what it can reach rather " +
          "than what would give the better alkene.",
      },
    ],
    topic: "substitution_and_elimination",
  }),

  // ---- enols_and_enolates, Act 3 -----------------------------------------
  createReaction({
    id: "kinetic-enolate-formation",
    name: "Kinetic enolate with LDA",
    aliases: ["LDA", "lithium diisopropylamide", "kinetic enolate"],
    transformation:
      "A strong hindered base removes the most accessible alpha proton and gives the LESS substituted enolate.",
    substrateClasses: ["ketone", "ester"],
    productClasses: ["kinetic enolate", "enol"],
    reagents: [
      { role: "base", anyOf: ["LDA", "lithium diisopropylamide", "LiHMDS", "KHMDS"] },
      { role: "solvent", anyOf: ["THF", "Et2O"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "-78 C",
        decides:
          "which enolate you get, together with the base. Cold, nothing equilibrates, so the " +
          "enolate that formed fastest is the one that stays.",
      },
      {
        dimension: "stoichiometry",
        value: "one full equivalent of base, added to the ketone",
        decides:
          "that the deprotonation is complete and irreversible, so no unreacted ketone is left for " +
          "the enolate to condense with",
      },
    ],
    topic: "enols_and_enolates",
    note:
      "The outline's near miss pair with a warm alkoxide. Both give an enolate from the same " +
      "ketone, at different carbons.",
  }),
  createReaction({
    id: "thermodynamic-enolate-formation",
    name: "Thermodynamic enolate with an alkoxide",
    aliases: ["thermodynamic enolate", "NaOEt enolate", "equilibrating conditions"],
    transformation:
      "A weaker base at room temperature lets the enolates equilibrate, and the MORE substituted one wins.",
    substrateClasses: ["ketone", "ester"],
    productClasses: ["thermodynamic enolate", "enol"],
    reagents: [
      { role: "base", anyOf: ["NaOEt", "NaOMe", "KOtBu", "ethoxide", "alkoxide"] },
      { role: "solvent", anyOf: ["EtOH", "MeOH", "the matching alcohol"] },
    ],
    conditions: [
      {
        dimension: "temperature",
        value: "room temperature or warmer",
        decides:
          "that protons come on and off freely, so the mixture settles on the more substituted, " +
          "more conjugated enolate",
      },
      {
        dimension: "stoichiometry",
        value: "catalytic base, an equilibrium rather than a full deprotonation",
        decides: "the same thing from the other side, and it is why the ketone is never fully consumed",
      },
    ],
    topic: "enols_and_enolates",
  }),
  createReaction({
    id: "aldol-condensation",
    name: "Aldol condensation",
    aliases: ["aldol", "aldol reaction", "base catalysed aldol"],
    transformation:
      "An enolate adds to a second carbonyl, giving a beta hydroxy carbonyl that dehydrates to an enone on heating.",
    substrateClasses: ["aldehyde", "ketone"],
    productClasses: ["beta hydroxy carbonyl", "enone"],
    reagents: [{ role: "base", group: "aldol_base" }],
    conditions: [
      {
        dimension: "temperature",
        value: "cold stops at the beta hydroxy carbonyl, heat carries on to the enone",
        decides: "which of the two products the question is asking for",
      },
      {
        dimension: "stoichiometry",
        value: "catalytic base",
        decides:
          "that the enolate is present in small amounts alongside plenty of unreacted carbonyl, " +
          "which is exactly what the reaction needs",
      },
    ],
    topic: "aldol_and_claisen",
  }),
  createReaction({
    id: "claisen-condensation",
    name: "Claisen condensation",
    aliases: ["Claisen", "ester condensation"],
    transformation: "An ester enolate substitutes onto a second ester, giving a beta keto ester.",
    substrateClasses: ["ester"],
    productClasses: ["beta keto ester"],
    reagents: [
      { role: "base", anyOf: ["NaOEt", "NaOMe", "alkoxide"] },
      { role: "acidic workup", anyOf: ["H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "the alkoxide base must match the ester's own alkoxy group",
        decides:
          "whether the product is one ester or a mixture. A mismatched pair transesterifies and " +
          "the outline records exactly that as a top Act 3 mistake.",
      },
      {
        dimension: "stoichiometry",
        value: "a full equivalent of base",
        decides:
          "whether the reaction goes to completion. The final deprotonation of the beta keto ester " +
          "is what pulls an otherwise unfavourable equilibrium over, and it consumes base.",
      },
    ],
    topic: "aldol_and_claisen",
    note: "A Claisen is acyl substitution with an enolate nucleophile, which is the outline's own framing.",
  }),

  createReaction({
    id: "alpha-halogenation-acidic",
    name: "Alpha halogenation of a ketone under acid",
    aliases: ["alpha bromination", "acid catalysed halogenation", "enol halogenation"],
    transformation: "A ketone picks up one halogen on the carbon next to the carbonyl.",
    substrateClasses: ["ketone", "aldehyde", "enol"],
    productClasses: ["alpha halo carbonyl", "ketone"],
    reagents: [
      { role: "halogen", group: "alpha_halogen" },
      { role: "acid catalyst", anyOf: ["AcOH", "acetic acid", "H3O+", "HCl"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "acidic, through the enol",
        decides:
          "how many halogens end up on the molecule. Under acid the product is deactivated toward " +
          "a second enolisation, so it stops at one. Under base the opposite is true and the " +
          "reaction runs to the trihalide.",
      },
      {
        dimension: "stoichiometry",
        value: "one equivalent of halogen",
        decides: "the same thing from the other side",
      },
    ],
    topic: "enols_and_enolates",
  }),

  // ---- conjugate_addition, Act 3 -----------------------------------------
  createReaction({
    id: "cuprate-conjugate-addition",
    name: "Conjugate addition of a cuprate to an enone",
    aliases: ["1,4 addition", "Michael addition with a cuprate", "Gilman conjugate addition"],
    transformation: "A cuprate adds to the beta carbon of an enone, leaving the carbonyl intact.",
    substrateClasses: ["enone"],
    productClasses: ["1,4 addition product", "ketone"],
    reagents: [
      { role: "carbon nucleophile", anyOf: ["R2CuLi", "cuprate", "Gilman reagent", "Me2CuLi"] },
      { role: "acidic workup", anyOf: ["H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "a soft nucleophile, so it goes to the soft site",
        decides:
          "1,4 against 1,2, and the outline is explicit that the choice is made by the " +
          "NUCLEOPHILE and not by the substrate. Deciding it from the enone is a recorded top " +
          "Act 3 mistake.",
      },
    ],
    topic: "conjugate_addition",
    note: "The outline's near miss pair with a Grignard reagent on the same enone.",
  }),
  createReaction({
    id: "grignard-1-2-addition-to-enone",
    name: "Direct addition of a Grignard reagent to an enone",
    aliases: ["1,2 addition to an enone", "Grignard on an enone"],
    transformation:
      "A hard carbon nucleophile adds straight to the carbonyl carbon of an enone, giving an allylic alcohol.",
    substrateClasses: ["enone"],
    productClasses: ["tertiary alcohol", "secondary alcohol", "alkene"],
    reagents: [
      { role: "carbon nucleophile", group: "organometallic_1_2" },
      { role: "acidic workup", anyOf: ["H3O+", "aqueous acid"] },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "a hard nucleophile, so it goes to the hard site",
        decides: "1,2 against 1,4, the other half of the same pair",
      },
      {
        dimension: "temperature",
        value: "cold, and anhydrous throughout",
        decides: "that the reagent survives and that the addition stays under control",
      },
    ],
    topic: "conjugate_addition",
  }),

  // ---- amines, Act 3 ------------------------------------------------------
  createReaction({
    id: "reductive-amination",
    name: "Reductive amination",
    aliases: ["reductive amination", "NaBH3CN with an amine", "making an amine from a ketone"],
    transformation:
      "A carbonyl and an amine condense to an imine or iminium, which is reduced in the same flask to the amine.",
    substrateClasses: ["aldehyde", "ketone", "primary amine", "secondary amine"],
    productClasses: ["primary amine", "secondary amine", "tertiary amine"],
    reagents: [
      { role: "amine", anyOf: ["NH3", "RNH2", "R2NH", "primary amine", "secondary amine"] },
      { role: "reductant", group: "reductive_amination_reductant" },
    ],
    conditions: [
      {
        dimension: "regime",
        value: "mildly acidic, around pH 4 to 6",
        decides:
          "that the iminium forms and that the mild hydride is selective for it rather than for " +
          "the starting carbonyl. A stronger hydride such as NaBH4 reduces the ketone before any " +
          "imine appears.",
      },
      {
        dimension: "stoichiometry",
        value: "one equivalent of amine",
        decides:
          "how much over alkylation appears. This route controls it far better than alkylating an " +
          "amine with a halide, which is why it exists.",
      },
    ],
    topic: "amines",
  }),
]);
