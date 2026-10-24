/**
 * Unit 10's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 10 pool entry or the ladder a lesson plays, and
 * `quote`, words copied exactly from it. test/guideU10.test.ts fails a quote
 * the source does not contain, and an idea whose source is not in its own
 * lesson. The `text`, `mistake` and `fix` lines are plain paraphrases.
 *
 * u10-basicity has no pool yet: its lesson plays the nucleophilicity sort
 * ladder (sort-basicity-vs-nucleophilicity), so its words quote that ladder.
 * Side quests sit in the stage of the lesson they branch from. The drawings
 * are generated: u10Guide.figures.ts, by scripts/guide_u10.py. This file is
 * loaded only when a student opens the Unit 10 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U10_GUIDE_EXAMPLES } from "./u10Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Nucleophiles and making amines",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u10-basicity",
        ideas: [
          {
            text: "How fast a nucleophile attacks is a rate, not an equilibrium, so the basicity ladder is not the answer.",
            mark: "a rate, not an equilibrium",
            source: "sort-basicity-vs-nucleophilicity",
            quote: "This is a rate, not an equilibrium, so the basicity ladder is not the answer here.",
          },
          {
            text: "Big, polarisable, weakly solvated HS⁻ reaches the carbon first.",
            source: "sort-basicity-vs-nucleophilicity",
            quote: "Big and polarisable, weakly solvated, so its electrons reach the carbon first.",
          },
          {
            text: "OH⁻ is the stronger base but the slower nucleophile: small and well solvated.",
            source: "sort-basicity-vs-nucleophilicity",
            quote: "The stronger base of the top two, and the slower nucleophile here. Small and well solvated.",
          },
          {
            text: "Neutral water comes last on both ladders.",
            source: "sort-basicity-vs-nucleophilicity",
            quote: "Neutral, so it comes last on both the basicity and the nucleophilicity ladder.",
          },
        ],
        example: { source: "sort-basicity-vs-nucleophilicity", quote: "Big and polarisable, weakly solvated, so its electrons reach the carbon first." },
      },
      {
        node: "u10-direct-alk",
        ideas: [
          {
            text: "Over alkylation: every amine product is another nucleophile.",
            mark: "every amine product is another nucleophile",
            source: "u10-da-why",
            quote: "Over alkylation: every amine product is another nucleophile.",
          },
          {
            text: "With excess R-X, direct alkylation of NH₃ runs to the quaternary salt.",
            source: "u10-da-meet",
            quote: "With excess R-X, direct alkylation of NH₃ runs to the quaternary salt.",
          },
          {
            text: "Count the N-H, then add one for the lone pair.",
            source: "u10-da-once",
            quote: "Count the N-H, then add one for the lone pair.",
          },
        ],
        example: { source: "u10-da-meet", quote: "With excess R-X, direct alkylation of NH₃ runs to the quaternary salt." },
      },
      {
        node: "u10-gabriel",
        ideas: [
          {
            text: "Gabriel: one clean primary amine.",
            mark: "one clean primary amine",
            source: "u10-gb-class",
            quote: "Gabriel: one clean primary amine.",
          },
          {
            text: "Gabriel swaps Br for NH₂ and adds no carbon.",
            source: "u10-gb-retro",
            quote: "Gabriel swaps Br for NH₂ and adds no carbon.",
          },
          {
            text: "It works through SN2, so it wants a primary halide.",
            source: "u10-gb-halide",
            quote: "Gabriel works through SN2, so it wants a primary halide.",
          },
        ],
        example: { source: "u10-gb-free", quote: "Step two frees a pure primary amine." },
      },
      {
        node: "u10-red-amination",
        ideas: [
          {
            text: "Reductive amination: C=O plus N-H, then reduce, gives a new C-N single bond.",
            mark: "a new C-N single bond",
            source: "u10-ra-meet",
            quote: "Reductive amination: C=O plus N-H, then reduce, gives a new C-N single bond.",
          },
          {
            text: "NaBH₃CN reduces the iminium, not the C=O, so amine and carbonyl can share one pot.",
            source: "u10-ra-select",
            quote: "NaBH₃CN reduces the iminium, not the C=O, so amine and carbonyl can share one pot.",
          },
          {
            text: "Each reductive amination adds one carbon group to N.",
            source: "u10-ra-class",
            quote: "Each reductive amination adds one carbon group to N.",
          },
        ],
        example: { source: "u10-ra-meet", quote: "The amine and ketone make an iminium, and NaBH₃CN delivers H to its carbon." },
      },
      {
        node: "u10-hofmann-e",
        ideas: [
          {
            text: "Hofmann elimination: the less substituted alkene wins.",
            mark: "the less substituted alkene wins",
            source: "u10-he-meet",
            quote: "Hofmann elimination: the less substituted alkene wins.",
          },
          {
            text: "Step one is to make N(CH₃)₃⁺ a leaving group.",
            source: "u10-he-salt",
            quote: "Step one of a Hofmann elimination: make N(CH₃)₃⁺ a leaving group.",
          },
          {
            text: "A primary amine takes three CH₃.",
            source: "u10-he-mei",
            quote: "A primary amine takes three CH₃.",
          },
        ],
        example: { source: "u10-he-meet", quote: "Hydroxide takes an H from the less hindered CH₃ end, because the bulky N(CH₃)₃⁺ group crowds the inside CH₂" },
      },
      {
        node: "u10-cope",
        ideas: [
          {
            text: "Heat the N-oxide: an alkene and a hydroxylamine.",
            mark: "an alkene and a hydroxylamine",
            source: "u10-co-heat",
            quote: "Heat the N-oxide: an alkene and a hydroxylamine.",
          },
          {
            text: "Step one of a Cope elimination is the N-oxide.",
            source: "u10-co-meet",
            quote: "Step one of a Cope elimination: the N-oxide.",
          },
          {
            text: "Cope starts from a tertiary amine.",
            source: "u10-co-start",
            quote: "Cope starts from a tertiary amine.",
          },
        ],
        example: { source: "u10-co-heat", quote: "The O⁻ takes a β-H and the C-N bond breaks" },
      },
      {
        node: "u10-amide-red",
        ideas: [
          {
            text: "LiAlH₄ turns C(=O)N into CH₂N.",
            mark: "C(=O)N into CH₂N",
            source: "u10-ar-meet",
            quote: "LiAlH₄ turns C(=O)N into CH₂N.",
          },
          {
            text: "Same carbons, same N substitution; only the C=O becomes CH₂.",
            source: "u10-ar-keep",
            quote: "Same carbons, same N substitution; only the C=O becomes CH₂.",
          },
          {
            text: "A cyclic amide gives a cyclic amine.",
            source: "u10-ar-lactam",
            quote: "A cyclic amide gives a cyclic amine.",
          },
        ],
        example: { source: "u10-ar-2deg", quote: "A secondary amide gives a secondary amine." },
      },
      {
        node: "u10-hofmann-r",
        ideas: [
          {
            text: "Hofmann rearrangement: R-C(=O)NH₂ to R-NH₂, one carbon shorter.",
            mark: "one carbon shorter",
            source: "u10-hr-meet",
            quote: "R-C(=O)NH₂ to R-NH₂, one carbon shorter.",
          },
          {
            text: "Only a primary amide rearranges.",
            source: "u10-hr-cannot",
            quote: "Only a primary amide rearranges.",
          },
          {
            text: "Work back: add one C(=O) between the carbon and the N.",
            source: "u10-hr-retro",
            quote: "Work back: add one C(=O) between the carbon and the N.",
          },
        ],
        example: { source: "u10-hr-meet", quote: "The carbonyl carbon is lost and the ring ends bonded straight to N." },
      },
      {
        node: "u10-curtius",
        ideas: [
          {
            text: "Curtius, like Hofmann: one carbon shorter.",
            mark: "one carbon shorter",
            source: "u10-cu-count",
            quote: "Curtius, like Hofmann: one carbon shorter.",
          },
          {
            text: "Heat turns the acyl azide into an isocyanate.",
            source: "u10-cu-iso",
            quote: "Heat turns the acyl azide into an isocyanate.",
          },
          {
            text: "Water on R-N=C=O gives R-NH₂ and CO₂.",
            source: "u10-cu-water",
            quote: "Water on R-N=C=O gives R-NH₂ and CO₂.",
          },
        ],
        example: { source: "u10-cu-iso", quote: "N₂ leaves and the ring ends on N, with the C=O carbon now in N=C=O." },
      },
      {
        node: "u10-nitrile-red",
        ideas: [
          {
            text: "NaCN then LiAlH₄: one more carbon, ending in CH₂NH₂.",
            mark: "one more carbon",
            source: "u10-nr-route",
            quote: "NaCN then LiAlH₄: one more carbon, ending in CH₂NH₂.",
          },
          {
            text: "R-C≡N with LiAlH₄ gives R-CH₂-NH₂.",
            source: "u10-nr-meet",
            quote: "R-C≡N with LiAlH₄ gives R-CH₂-NH₂.",
          },
          {
            text: "Nitrile reduction is a clean primary amine route.",
            source: "u10-nr-class",
            quote: "Nitrile reduction is a clean primary amine route.",
          },
        ],
        example: { source: "u10-nr-route", quote: "Cyanide adds one carbon by SN2, and reducing that C≡N gives CH₂NH₂." },
      },
      {
        node: "u10-azide",
        ideas: [
          {
            text: "The azide route keeps the carbon count.",
            mark: "keeps the carbon count",
            source: "u10-az-count",
            quote: "The azide route keeps the carbon count.",
          },
          {
            text: "R-N₃ reduces to R-NH₂.",
            source: "u10-az-red",
            quote: "R-N₃ reduces to R-NH₂.",
          },
          {
            text: "Azide gives one clean primary amine.",
            source: "u10-az-bn",
            quote: "Azide gives one clean primary amine.",
          },
        ],
        example: { source: "u10-az-red", quote: "The N bonded to carbon stays and gains two H. The other two N leave as N₂." },
      },
    ],
    mistakes: [
      {
        mistake: "Making a primary amine by alkylating NH₃ directly.",
        fix: "Every product is another nucleophile, so it over alkylates; use Gabriel or azide.",
        source: "u10-da-why",
        quote: "Over alkylation: every amine product is another nucleophile.",
      },
      {
        mistake: "Adding a carbon in the Gabriel or azide route.",
        fix: "Both keep the carbon count; only the nitrile route adds one.",
        source: "u10-gb-retro",
        quote: "Gabriel swaps Br for NH₂ and adds no carbon.",
      },
      {
        mistake: "Picking the Zaitsev alkene in a Hofmann elimination.",
        fix: "The less substituted alkene wins.",
        source: "u10-he-tert",
        quote: "Hofmann elimination prefers the less substituted alkene.",
      },
      {
        mistake: "Keeping the C=O carbon in a Hofmann rearrangement.",
        fix: "It is lost: one carbon shorter.",
        source: "u10-hr-count",
        quote: "Hofmann: lose the C=O carbon.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Aryl amines and diazonium salts",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u10-nitro-red",
        ideas: [
          {
            text: "Ar-NO₂ to Ar-NH₂: the standard way onto an aryl amine.",
            mark: "the standard way onto an aryl amine",
            source: "u10-no-meet",
            quote: "Ar-NO₂ to Ar-NH₂: the standard way onto an aryl amine.",
          },
          {
            text: "One reduction flips a meta director into an ortho/para director.",
            source: "u10-no-director",
            quote: "One reduction flips a meta director into an ortho/para director.",
          },
          {
            text: "Metal and acid are selective for Ar-NO₂.",
            source: "u10-no-acid",
            quote: "Metal and acid are selective for Ar-NO₂.",
          },
        ],
        example: { source: "u10-no-meet", quote: "Both O atoms leave and the N gains two H. The ring stays aromatic." },
      },
      {
        node: "u10-acyl-protect",
        ideas: [
          {
            text: "Protection works by sharing the lone pair, not removing it.",
            mark: "sharing the lone pair",
            source: "u10-ap-why",
            quote: "Protection works by sharing the lone pair, not removing it.",
          },
          {
            text: "Free aniline is too activated to stop at one Br.",
            source: "u10-ap-over",
            quote: "Free aniline is too activated to stop at one Br.",
          },
          {
            text: "Protected aniline brominates once, para.",
            source: "u10-ap-para",
            quote: "Protected aniline brominates once, para.",
          },
          {
            text: "Protect, react, deprotect.",
            source: "u10-ap-route",
            quote: "Protect, react, deprotect.",
          },
        ],
        example: { source: "u10-ap-para", quote: "Protected aniline brominates once, para." },
      },
      {
        node: "u10-diazonium",
        ideas: [
          {
            text: "Ar-NH₂ with NaNO₂ and HCl at 0 to 5 °C gives Ar-N₂⁺.",
            mark: "at 0 to 5 °C",
            source: "u10-dz-meet",
            quote: "Ar-NH₂ with NaNO₂ and HCl at 0 to 5 °C gives Ar-N₂⁺.",
          },
          {
            text: "Only a primary aryl amine gives a usable diazonium salt.",
            source: "u10-dz-which",
            quote: "Only a primary aryl amine gives a usable diazonium salt.",
          },
          {
            text: "Ar-N₂⁺ swaps N₂ for a new group.",
            source: "u10-dz-leaves",
            quote: "Ar-N₂⁺ swaps N₂ for a new group.",
          },
        ],
        example: { source: "u10-dz-meet", quote: "The NH₂ becomes N≡N⁺ on the same ring carbon: the diazonium ion." },
      },
      {
        node: "u10-diazo-sub",
        ideas: [
          {
            text: "Cl, Br and CN come in with copper; I with KI; F with HBF₄ and heat; H with H₃PO₂.",
            mark: "CN come in with copper",
            source: "u10-ds-match",
            quote: "Cl, Br, CN with copper; I with KI; F with HBF₄ and heat; H with H₃PO₂.",
          },
          {
            text: "H₃PO₂ deletes the group: the NH₂ was only a temporary director.",
            source: "u10-ds-h",
            quote: "H₃PO₂ deletes the group: the NH₂ was only a temporary director.",
          },
          {
            text: "Warm water on Ar-N₂⁺ gives a phenol.",
            source: "u10-ds-oh",
            quote: "Warm water on Ar-N₂⁺ gives a phenol.",
          },
        ],
        example: { source: "u10-ds-match", quote: "Cl, Br, CN with copper; I with KI; F with HBF₄ and heat; H with H₃PO₂." },
      },
      {
        node: "u10-azo",
        ideas: [
          {
            text: "Azo coupling: Ar-N₂⁺ is the electrophile, para to the activating group.",
            mark: "para to the activating group",
            source: "u10-az2-meet",
            quote: "Azo coupling: Ar-N₂⁺ is the electrophile, para to the activating group.",
          },
          {
            text: "The partner needs OH or NR₂ on the ring.",
            source: "u10-az2-partner",
            quote: "The partner needs OH or NR₂ on the ring.",
          },
          {
            text: "Para blocked: coupling goes ortho.",
            source: "u10-az2-blocked",
            quote: "Para blocked: coupling goes ortho.",
          },
        ],
        example: { source: "u10-az2-meet", quote: "The N=N link joins two rings: an azo dye." },
      },
    ],
    mistakes: [
      {
        mistake: "Making a diazonium salt from a secondary aryl amine.",
        fix: "Only a primary aryl amine gives a usable diazonium salt.",
        source: "u10-dz-which",
        quote: "Only a primary aryl amine gives a usable diazonium salt.",
      },
      {
        mistake: "Expecting free aniline to stop at one bromine.",
        fix: "It is too activated; protect it as the amide first.",
        source: "u10-ap-over",
        quote: "Free aniline is too activated to stop at one Br.",
      },
      {
        mistake: "Leaving the N on the ring after H₃PO₂.",
        fix: "H₃PO₂ replaces N₂ with H: the group is deleted.",
        source: "u10-ds-h",
        quote: "H₃PO₂ deletes the group: the NH₂ was only a temporary director.",
      },
      {
        mistake: "Coupling a diazonium salt onto plain benzene.",
        fix: "The partner needs OH or NR₂ on the ring.",
        source: "u10-az2-partner",
        quote: "The partner needs OH or NR₂ on the ring.",
      },
    ],
  },
];

export const U10_GUIDE: UnitGuide = {
  unitId: "u10",
  intro:
    "Amines: how fast they attack, the clean ways to make them, then aryl amines and the diazonium salts that turn an NH₂ into almost anything. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U10_GUIDE_EXAMPLES,
  placeholder: true,
};
