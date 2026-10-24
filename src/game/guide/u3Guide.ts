/**
 * Unit 3's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 3 pool entry (or a lesson MCQ), and `quote`, words
 * copied exactly from that entry's explanation or its correct option.
 * test/guideU3.test.ts fails a quote the source does not contain, and an idea
 * whose source is not in its own lesson. The `text`, `mistake` and `fix` lines
 * are plain paraphrases of those quotes, nothing more.
 *
 * Side quests sit in the stage of the lesson they branch from, straight after
 * it, so a student meets them beside it. The drawings are generated:
 * u3Guide.figures.ts, by scripts/guide_u3.py. This file is loaded only when a
 * student opens the Unit 3 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U3_GUIDE_EXAMPLES } from "./u3Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "Attack, and where it lands",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u3-arenium",
        ideas: [
          {
            text: "The sigma complex spreads its + over three carbons: the two ortho to the sp³ carbon and the one para to it.",
            mark: "ortho to the sp³ carbon and the one para to it",
            source: "u3-aren-meet-where",
            quote: "The arenium (sigma complex) cation spreads its + over three carbons: the two ortho to the sp3 carbon and the one para to it.",
          },
          {
            text: "One sp³ carbon breaks the ring's loop of p orbitals, so the sigma complex is not aromatic.",
            source: "u3-aren-sp3",
            quote: "One sp3 carbon breaks the ring's loop of p orbitals, so the sigma complex is not aromatic.",
          },
          {
            text: "A base takes the H⁺ off the sp³ carbon and the ring is aromatic again.",
            source: "u3-aren-rearom",
            quote: "A base takes the H+ off the sp3 carbon and the ring is aromatic again.",
          },
          {
            text: "Substitution keeps the aromatic ring; addition would destroy it. That is why EAS is substitution.",
            source: "u3-aren-which",
            quote: "Substitution keeps the aromatic ring; addition would destroy it. That single difference is why EAS is substitution.",
          },
        ],
        example: {
          source: "u3-aren-rearom",
          quote: "Losing that H+ puts its bond pair back into the ring: six pi electrons on six sp2 carbons, aromatic again. That is bromobenzene.",
        },
      },
      {
        node: "u3-directing",
        ideas: [
          {
            text: "A lone pair on the first atom makes a group an o/p director and an activator: oxygen's lone pair stabilises the sigma complex.",
            mark: "o/p director and an activator",
            source: "u3-dir-phenol",
            quote: "OH is an o/p director and a strong activator: oxygen's lone pair stabilises the sigma complex.",
          },
          {
            text: "Alkyl groups are o/p directors and weak activators.",
            source: "u3-dir-ethyl",
            quote: "Alkyl groups are o/p directors and weak activators.",
          },
          {
            text: "Halogens deactivate the ring but direct o/p: induction sets the rate, the lone pair sets the position.",
            source: "u3-dir-bromo",
            quote: "Halogens deactivate the ring but direct o/p: induction sets the rate, the lone pair sets the position.",
          },
          {
            text: "A multiple bond to N or O on the first atom makes a meta director and a deactivator.",
            source: "u3-dir-cn",
            quote: "A nitrile is a meta director and a deactivator: a multiple bond to N on the first atom.",
          },
        ],
        example: {
          source: "u3-dir-compete",
          quote: "When two groups disagree, the stronger activator decides. OMe beats CH3, so Br goes ortho to the OMe.",
        },
      },
      {
        node: "u3-birch",
        ideas: [
          {
            text: "Birch reduction adds H to two para carbons and leaves a nonconjugated 1,4-diene.",
            mark: "a nonconjugated 1,4-diene",
            source: "u3-bir-meet",
            quote: "Birch reduction adds H to two para carbons and leaves a nonconjugated 1,4-diene.",
          },
          {
            text: "A donor's carbon stays on a C=C.",
            source: "u3-bir-anisole",
            quote: "OMe is a donor, so its carbon stays on a C=C.",
          },
          {
            text: "The Birch product has isolated C=C bonds and no aromaticity.",
            source: "u3-bir-conj",
            quote: "The Birch product has isolated C=C bonds and no aromaticity.",
          },
        ],
        example: { source: "u3-bir-acid", quote: "COOH is a withdrawer, so its carbon goes sp3 and the C=C bonds sit away from it." },
      },
      {
        node: "u3-halo",
        ideas: [
          {
            text: "Br₂ and FeBr₃ swap one ring C-H for C-Br, and the ring stays aromatic.",
            mark: "the ring stays aromatic",
            source: "u3-halo-meet",
            quote: "Benzene with Br2 and FeBr3 gives bromobenzene: one C-H becomes C-Br and the ring stays aromatic.",
          },
          {
            text: "The Lewis acid carries the same halogen, so it cannot scramble the product.",
            source: "u3-halo-cl",
            quote: "The Lewis acid carries the same halogen so it cannot scramble the product.",
          },
          {
            text: "NO₂ withdraws electrons and directs meta.",
            source: "u3-halo-nitro",
            quote: "NO2 withdraws electrons and directs meta",
          },
        ],
        example: { source: "u3-halo-tol-out", quote: "CH3 directs ortho and para. Both of those form; meta is the minor one." },
      },
      {
        node: "u3-benzylic-br",
        ideas: [
          {
            text: "NBS and light brominate the benzylic carbon: the sp³ carbon bonded to the ring, whose radical the ring stabilises.",
            mark: "the benzylic carbon",
            source: "u3-bbr-meet",
            quote: "NBS and light brominate the benzylic carbon: the sp3 carbon bonded to the ring, whose radical the ring stabilises.",
          },
          {
            text: "No benzylic H, no benzylic bromination.",
            source: "u3-bbr-tbu",
            quote: "No benzylic H, no benzylic bromination.",
          },
        ],
        example: { source: "u3-bbr-ethyl", quote: "Only the CH2 next to the ring is benzylic. Its radical is stabilised by the ring, so Br goes there." },
      },
      {
        node: "u3-nitration",
        ideas: [
          {
            text: "The nitronium ion, NO₂⁺, is the electrophile.",
            mark: "NO₂⁺",
            source: "u3-nit-electrophile",
            quote: "The nitronium ion, NO2+, is the electrophile.",
          },
          {
            text: "Nitration puts NO₂ on the ring: benzene gives nitrobenzene.",
            source: "u3-nit-meet",
            quote: "Nitration puts NO2 on the ring: benzene gives nitrobenzene.",
          },
          {
            text: "A nitro group deactivates, so the reaction stops at one under mild conditions.",
            source: "u3-nit-stop",
            quote: "A nitro group is a deactivator, so the mononitro product is less reactive than benzene and the reaction stops at one.",
          },
        ],
        example: { source: "u3-nit-ester", quote: "The ester carbonyl is a withdrawer, so nitration goes meta: methyl 3-nitrobenzoate." },
      },
      {
        node: "u3-sulfo",
        ideas: [
          {
            text: "Sulfonation is the EAS that runs backwards: it is reversible.",
            mark: "it is reversible",
            source: "u3-sul-reverse",
            quote: "Sulfonation is reversible.",
          },
          {
            text: "Sulfonation puts SO₃H on the ring, through a new C-S bond: benzenesulfonic acid.",
            source: "u3-sul-meet",
            quote: "Sulfonation puts SO3H on the ring, through a new C-S bond: benzenesulfonic acid.",
          },
          {
            text: "SO₃H is a meta director and a deactivator, the same class as NO₂.",
            source: "u3-sul-directs",
            quote: "SO3H is a meta director and a deactivator, the same class as NO2.",
          },
        ],
        example: { source: "u3-sul-reverse", quote: "Desulfonation: hot dilute acid takes the SO3H off and puts H back." },
      },
    ],
    mistakes: [
      {
        mistake: "Adding Br₂ across the ring, as with an alkene.",
        fix: "Lose H⁺ instead, and the ring is aromatic again.",
        source: "u3-aren-rearom",
        quote: "Adding bromide instead would leave a nonaromatic diene.",
      },
      {
        mistake: "Putting the + on the sp³ carbon in a sigma complex form.",
        fix: "The + walks ortho, para, ortho; the sp³ carbon never carries it.",
        source: "u3-aren-count",
        quote: "The sp3 carbon never carries it.",
      },
      {
        mistake: "Calling a halogen a meta director because it deactivates.",
        fix: "Halogens deactivate but still direct o/p.",
        source: "u3-nit-chloro",
        quote: "Chlorine deactivates the ring but still directs ortho and para.",
      },
      {
        mistake: "Letting the weaker activator decide when two groups disagree.",
        fix: "The stronger activator decides.",
        source: "u3-dir-compete",
        quote: "When two groups disagree, the stronger activator decides.",
      },
      {
        mistake: "Brominating the side chain with Br₂ and FeBr₃.",
        fix: "A Lewis acid sends the electrophile to the ring. The benzylic C-H needs radical conditions.",
        source: "u3-halo-vs-nbs",
        quote: "The benzylic C-H needs radical conditions instead.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Friedel-Crafts and blocking",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u3-fc-alkyl",
        ideas: [
          {
            text: "The cation shifts to the best carbon one shift away, and the ring bonds to that carbon.",
            mark: "the ring bonds to that carbon",
            source: "u3-alk-propyl",
            quote: "The cation from 1-chloropropane ends up secondary (shift: hydride), and the ring bonds to that carbon.",
          },
          {
            text: "Each alkyl group activates the ring, so the product outcompetes benzene: polyalkylation.",
            source: "u3-alk-poly",
            quote: "Each alkyl group activates the ring, so the product outcompetes benzene: polyalkylation.",
          },
          {
            text: "With no H on the next carbon, a methyl shifts instead.",
            source: "u3-alk-neopentyl",
            quote: "The neighbouring carbon has no H, so a methyl shifts instead.",
          },
        ],
        example: { source: "u3-alk-propyl", quote: "The primary cation takes a hydride from the next carbon and becomes secondary." },
      },
      {
        node: "u3-fc-acyl",
        ideas: [
          {
            text: "The acylium ion is the electrophile. Its form with C≡O⁺ is why it never rearranges.",
            mark: "never rearranges",
            source: "u3-acyl-ion",
            quote: "Its resonance form with C triple bond O+ is why it never rearranges.",
          },
          {
            text: "The aryl ketone is a deactivated ring, so acylation stops at one.",
            source: "u3-acyl-once",
            quote: "The aryl ketone is a deactivated ring, so acylation stops at one.",
          },
          {
            text: "Friedel-Crafts reactions fail on rings carrying a strong withdrawer such as NO₂.",
            source: "u3-acyl-fails",
            quote: "Friedel-Crafts acylation and alkylation fail on rings carrying a strong withdrawer such as NO2.",
          },
        ],
        example: {
          source: "u3-acyl-norearr",
          quote: "The acylium ion cannot rearrange, so the three-carbon chain arrives straight, attached through its C=O carbon.",
        },
      },
      {
        node: "u3-blocking",
        ideas: [
          {
            text: "A blocking group must come off at the end. Sulfonation is reversible; nitration is not.",
            mark: "must come off at the end",
            source: "u3-blk-why-so3h",
            quote: "A blocking group must come off at the end. Sulfonation is reversible; nitration is not",
          },
          {
            text: "With para blocked, CH₃ steers bromine ortho, and SO₃H agrees because that carbon is meta to it.",
            source: "u3-blk-step2",
            quote: "With para blocked, CH3 steers bromine ortho, and SO3H agrees because that carbon is meta to it.",
          },
          {
            text: "Hot dilute acid reverses sulfonation; concentrated SO₃ drives it forward.",
            source: "u3-blk-remove",
            quote: "Hot dilute acid reverses sulfonation; concentrated SO3 drives it forward.",
          },
        ],
        example: { source: "u3-blk-anisole", quote: "removing SO3H at the end gives the pure ortho product." },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting a straight chain from Friedel-Crafts alkylation with 1-chloropropane.",
        fix: "Acylate then reduce: direct alkylation gives mainly isopropylbenzene.",
        source: "u3-ch2-why",
        quote: "Direct alkylation gives mainly isopropylbenzene.",
      },
      {
        mistake: "Running Friedel-Crafts on nitrobenzene.",
        fix: "Friedel-Crafts fails on strongly deactivated rings: nitrobenzene comes back unchanged.",
        source: "u3-acyl-fails",
        quote: "Friedel-Crafts reactions fail on strongly deactivated rings, so nitrobenzene comes back unchanged.",
      },
      {
        mistake: "Brominating toluene and expecting the ortho product alone.",
        fix: "Both ortho and para form. Block para to get ortho cleanly.",
        source: "u3-blk-without",
        quote: "Toluene alone gives ortho and para together. Blocking para is how you get the ortho product cleanly.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Changing a group, and planning",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u3-nitro-red",
        ideas: [
          {
            text: "Nitro reduction turns each ArNO₂ into ArNH₂.",
            mark: "ArNH₂",
            source: "u3-nred-pnt",
            quote: "Nitro reduction turns each ArNO2 into ArNH2",
          },
          {
            text: "Reducing NO₂ to NH₂ flips the ring from a meta deactivator to an o/p activator. That flip is a sequencing tool.",
            source: "u3-nred-flip",
            quote: "Reducing NO2 to NH2 flips the ring from a meta deactivator to an o/p activator. That flip is a sequencing tool.",
          },
          {
            text: "Oxygen out, hydrogen in: a reduction.",
            source: "u3-nred-formula",
            quote: "oxygen out, hydrogen in, a reduction.",
          },
        ],
        example: { source: "u3-nred-mnt", quote: "Every NO2 becomes NH2 and nothing else on the ring changes." },
      },
      {
        node: "u3-c-to-ch2",
        ideas: [
          {
            text: "Acylate then reduce: the acyl group goes on straight and C=O becomes CH₂.",
            mark: "C=O becomes CH₂",
            source: "u3-ch2-why",
            quote: "Acylate then reduce: the acyl group goes on straight and C=O becomes CH2.",
          },
          {
            text: "Reducing the ketone flips the director: acyl (meta, deactivating) becomes alkyl (o/p, activating).",
            source: "u3-ch2-flip",
            quote: "Reducing the ketone flips the director: acyl (meta, deactivating) becomes alkyl (o/p, activating).",
          },
          {
            text: "Wolff-Kishner and Clemmensen give the same CH₂ product; one runs in base, the other in acid.",
            source: "u3-ch2-wk",
            quote: "Wolff-Kishner and Clemmensen give the same CH2 product; one runs in base, the other in acid.",
          },
        ],
        example: { source: "u3-ch2-meet", quote: "Clemmensen (or Wolff-Kishner) turns the aryl ketone's C=O into CH2" },
      },
      {
        node: "u3-benzylic-ox",
        ideas: [
          {
            text: "Every side chain with a benzylic H is cut back to COOH; a side chain with no benzylic H survives.",
            mark: "cut back to COOH",
            source: "u3-box-meet",
            quote: "Every side chain with a benzylic H is cut back to COOH; a side chain with no benzylic H survives.",
          },
          {
            text: "Oxidising CH₃ to COOH flips o/p to meta.",
            source: "u3-box-flip",
            quote: "Oxidising CH3 to COOH flips o/p to meta.",
          },
        ],
        example: {
          source: "u3-box-tbu",
          quote: "The CH3 has benzylic H and becomes COOH. The tert-butyl carbon bonded to the ring has no H, so it survives.",
        },
      },
      {
        node: "u3-sequencing",
        ideas: [
          {
            text: "Put the group that directs where you need on first.",
            mark: "on first",
            source: "u3-seq-mbr",
            quote: "Put the group that directs where you need on first.",
          },
          {
            text: "Nitrate while the group on the ring points where you need it.",
            source: "u3-seq-pnba",
            quote: "Nitrate while the group on the ring points where you need it.",
          },
          {
            text: "Do the Friedel-Crafts step before any strong withdrawer goes on.",
            source: "u3-seq-acyl-first",
            quote: "Do the Friedel-Crafts step before any strong withdrawer goes on.",
          },
        ],
        example: { source: "u3-seq-mbr", quote: "Put the group that directs where you need on first." },
      },
    ],
    mistakes: [
      {
        mistake: "Using NO₂ as a blocking group.",
        fix: "Reducing NO₂ gives NH₂, not H, so it never comes off.",
        source: "u3-blk-why-so3h",
        quote: "Nitration has no such reverse step, and reducing NO2 gives NH2, not H.",
      },
      {
        mistake: "Oxidising a tert-butyl group with KMnO₄.",
        fix: "No benzylic H, no reaction.",
        source: "u3-box-tbu-alone",
        quote: "No benzylic H, no reaction. tert-Butyl groups survive KMnO4.",
      },
      {
        mistake: "Oxidising CH₃ to COOH before nitrating when the target is para.",
        fix: "COOH directs meta. Nitrate first while CH₃ points para, then oxidise.",
        source: "u3-seq-pnba",
        quote: "CH3 sends the nitro group para (and ortho); KMnO4 then turns CH3 into COOH.",
      },
    ],
  },
];

export const U3_GUIDE: UnitGuide = {
  unitId: "u3",
  intro:
    "How an electrophile replaces an H on a benzene ring: the sigma complex, where each group sends the next one, the five reactions, and how to order steps to reach a target. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U3_GUIDE_EXAMPLES,
  placeholder: true,
};
