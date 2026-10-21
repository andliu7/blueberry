/**
 * Unit 8's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 8 pool entry, and `quote`, words copied exactly from
 * that entry's explanation or its correct option. test/guideU8.test.ts fails
 * a quote the source does not contain, and an idea whose source is not in its
 * own lesson. The `text`, `mistake` and `fix` lines are plain paraphrases.
 *
 * u8-ladder quotes the entries drafted for it in U8_UNWIRED (the same pool
 * file; its lesson plays the acyl sort ladder, so they are not wired yet).
 * Side quests sit in the stage of the lesson they branch from. The drawings
 * are generated: u8Guide.figures.ts, by scripts/guide_u8.py. This file is
 * loaded only when a student opens the Unit 8 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U8_GUIDE_EXAMPLES } from "./u8Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "Stage A",
    title: "The ladder and the mechanism",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u8-ladder",
        ideas: [
          {
            text: "The better the leaving group, the higher the rung: anhydride above ester above amide.",
            mark: "the higher the rung",
            source: "u8-lad-top",
            quote: "Anhydride above ester above amide: the better the leaving group, the higher the rung.",
          },
          {
            text: "Name the group on the C=O carbon first. Cl means acyl chloride, the top rung.",
            source: "u8-lad-meet",
            quote: "Name the group on the C=O carbon first. Cl means acyl chloride, the top rung.",
          },
          {
            text: "Downhill on the ladder is free; uphill needs a reagent that activates the acid first.",
            source: "u8-lad-down",
            quote: "Downhill on the ladder is free; uphill needs a reagent that activates the acid first.",
          },
          {
            text: "Amides sit lowest of the neutral derivatives.",
            source: "u8-lad-bottom",
            quote: "Amides sit lowest of the neutral derivatives.",
          },
        ],
        example: { source: "u8-lad-down", quote: "Acyl chloride to ester is a step down the ladder, so ethanol alone does it." },
      },
      {
        node: "u8-tetrahedral",
        ideas: [
          {
            text: "Add, then eliminate: the leaving group goes, the nucleophile stays, and the C=O is back at the end.",
            mark: "Add, then eliminate",
            source: "u8-tet-net",
            quote: "Add then eliminate: the leaving group goes, the nucleophile stays, and the carbonyl is back at the end.",
          },
          {
            text: "The intermediate keeps every group the carbon had, plus the nucleophile, with O⁻ in place of C=O.",
            source: "u8-tet-int",
            quote: "The intermediate keeps every group the carbon had, plus the nucleophile, and O⁻ in place of C=O.",
          },
          {
            text: "The group that leaves is the one that takes the molecule down the ladder.",
            source: "u8-tet-leave",
            quote: "The group that leaves is the one that takes the molecule down the ladder.",
          },
          {
            text: "Substitution, not addition: the C=O survives and the group on it changes.",
            source: "u8-tet-net",
            quote: "Substitution, not addition: the C=O survives and the group on it changes.",
          },
        ],
        example: { source: "u8-tet-product", quote: "C=O reforms and pushes out chloride." },
      },
      {
        node: "u8-to-acylcl",
        ideas: [
          {
            text: "SOCl₂ turns RCOOH into RCOCl.",
            mark: "RCOOH into RCOCl",
            source: "u8-acl-meet",
            quote: "SOCl₂ turns RCOOH into RCOCl.",
          },
          {
            text: "SOCl₂ leaves as two gases, SO₂ and HCl, which drives the reaction.",
            source: "u8-acl-byproducts",
            quote: "SOCl₂ leaves as two gases, SO₂ and HCl, which drives the reaction.",
          },
          {
            text: "Uphill moves on the ladder need activation; downhill moves do not.",
            source: "u8-acl-uphill",
            quote: "Uphill moves on the ladder need activation; downhill moves do not.",
          },
          {
            text: "Climb once with SOCl₂, then walk down to whatever derivative you need.",
            source: "u8-acl-next",
            quote: "Climb once with SOCl₂, then walk down to whatever derivative you need.",
          },
        ],
        example: { source: "u8-acl-meet", quote: "The OH on the C=O carbon is swapped for Cl. The C=O stays." },
      },
      {
        node: "u8-hvz",
        ideas: [
          {
            text: "HVZ puts one Br on the alpha carbon of an acid.",
            mark: "the alpha carbon",
            source: "u8-hvz-meet",
            quote: "HVZ puts one Br on the alpha carbon of an acid.",
          },
          {
            text: "No alpha H, no HVZ.",
            source: "u8-hvz-none",
            quote: "No alpha H, no HVZ.",
          },
          {
            text: "The alpha bromide is a handle for SN2: with NH₃ it becomes an amino acid.",
            source: "u8-hvz-amino",
            quote: "The alpha bromide is a handle for SN2: here, an amino acid.",
          },
        ],
        example: { source: "u8-hvz-meet", quote: "Br replaces one H on the alpha carbon, next to the C=O." },
      },
      {
        node: "u8-to-anhydride",
        ideas: [
          {
            text: "A 1,4-diacid closes to a five-membered cyclic anhydride on heating.",
            mark: "a five-membered cyclic anhydride",
            source: "u8-anm-succinic",
            quote: "A 1,4-diacid closes to a five-membered cyclic anhydride on heating.",
          },
          {
            text: "A carboxylate plus an acyl chloride gives an anhydride.",
            source: "u8-anm-meet",
            quote: "A carboxylate plus an acyl chloride gives an anhydride.",
          },
          {
            text: "Anhydride means 'without water': the ring closes by losing one H₂O.",
            source: "u8-anm-water",
            quote: "Anhydride means 'without water': the ring closes by losing one H₂O.",
          },
        ],
        example: { source: "u8-anm-succinic", quote: "A 1,4-diacid closes to a five-membered cyclic anhydride on heating." },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting an acid to climb to an acyl chloride on its own.",
        fix: "Uphill needs an activating reagent such as SOCl₂.",
        source: "u8-acl-uphill",
        quote: "Uphill moves on the ladder need activation; downhill moves do not.",
      },
      {
        mistake: "Letting the nucleophile leave again from the tetrahedral intermediate.",
        fix: "The group that leaves is the one that takes the molecule down the ladder.",
        source: "u8-tet-leave",
        quote: "The group that leaves is the one that takes the molecule down the ladder.",
      },
      {
        mistake: "Treating acyl substitution as an addition.",
        fix: "The C=O comes back; only the group on it changes.",
        source: "u8-tet-net",
        quote: "Substitution, not addition: the C=O survives and the group on it changes.",
      },
      {
        mistake: "Brominating a carbon past the alpha carbon in HVZ.",
        fix: "HVZ brominates the alpha carbon only.",
        source: "u8-hvz-where",
        quote: "HVZ brominates the alpha carbon only.",
      },
    ],
  },
  {
    id: "b",
    label: "Stage B",
    title: "Making and breaking esters and amides",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u8-fischer",
        ideas: [
          {
            text: "Fischer: acid plus alcohol, acid catalyst, ester plus water.",
            mark: "ester plus water",
            source: "u8-fis-meet",
            quote: "Fischer: acid plus alcohol, acid catalyst, ester plus water.",
          },
          {
            text: "It is an equilibrium: use excess alcohol or remove water to drive it.",
            source: "u8-fis-drive",
            quote: "Fischer is an equilibrium: use excess alcohol or remove water to drive it.",
          },
          {
            text: "Split an ester at the single-bond C-O: the acyl half was the acid, the alkyl half the alcohol.",
            source: "u8-fis-retro",
            quote: "Split an ester at the single-bond C-O: the acyl half was the acid, the alkyl half the alcohol.",
          },
          {
            text: "An intramolecular Fischer esterification gives a lactone.",
            source: "u8-fis-lactone",
            quote: "An intramolecular Fischer esterification gives a lactone.",
          },
        ],
        example: { source: "u8-fis-meet", quote: "Fischer: acid plus alcohol, acid catalyst, ester plus water." },
      },
      {
        node: "u8-steglich",
        ideas: [
          {
            text: "Steglich: acid plus alcohol, DCC and DMAP, ester.",
            mark: "DCC and DMAP",
            source: "u8-ste-meet",
            quote: "Steglich: acid plus alcohol, DCC and DMAP, ester.",
          },
          {
            text: "Mild conditions suit acid-sensitive or bulky alcohols.",
            source: "u8-ste-tbu",
            quote: "Mild conditions suit acid-sensitive or bulky alcohols.",
          },
          {
            text: "DCC is a dehydrating agent: it soaks up the water.",
            source: "u8-ste-water",
            quote: "DCC is a dehydrating agent: it soaks up the water.",
          },
          {
            text: "With an amine instead of an alcohol, DCC makes an amide.",
            source: "u8-ste-amide",
            quote: "With an amine instead of an alcohol, DCC makes an amide.",
          },
        ],
        example: { source: "u8-ste-tbu", quote: "Steglich is mild, so even a bulky tertiary alcohol forms its ester." },
      },
      {
        node: "u8-diazomethane",
        ideas: [
          {
            text: "Diazomethane turns an acid into its methyl ester.",
            mark: "its methyl ester",
            source: "u8-dzm-meet",
            quote: "Diazomethane turns an acid into its methyl ester.",
          },
          {
            text: "The only byproduct is N₂ gas.",
            source: "u8-dzm-gas",
            quote: "The only byproduct is N₂ gas.",
          },
          {
            text: "Diazomethane picks the acid out of a molecule.",
            source: "u8-dzm-select",
            quote: "Diazomethane picks the acid out of a molecule.",
          },
        ],
        example: { source: "u8-dzm-gas", quote: "The only byproduct is N₂ gas." },
      },
      {
        node: "u8-acylcl-all",
        ideas: [
          {
            text: "Acyl chlorides make every lower derivative: acid, ester, amide, anhydride.",
            mark: "every lower derivative",
            source: "u8-all-match",
            quote: "Acyl chlorides make every lower derivative: acid, ester, amide, anhydride.",
          },
          {
            text: "Amines are bases, so a second equivalent (or pyridine) mops up the HCl.",
            source: "u8-all-two",
            quote: "Amines are bases, so a second equivalent (or pyridine) mops up the HCl.",
          },
          {
            text: "A secondary amine gives an N,N-disubstituted amide.",
            source: "u8-all-dimethyl",
            quote: "A secondary amine gives an N,N-disubstituted amide.",
          },
        ],
        example: { source: "u8-all-match", quote: "Acyl chlorides make every lower derivative: acid, ester, amide, anhydride." },
      },
      {
        node: "u8-anhydride",
        ideas: [
          {
            text: "Anhydrides acylate alcohols just like acyl chlorides, a little slower.",
            mark: "a little slower",
            source: "u8-anh-meet",
            quote: "Anhydrides acylate alcohols just like acyl chlorides, a little slower.",
          },
          {
            text: "One acyl group is wasted as the carboxylic acid.",
            source: "u8-anh-waste",
            quote: "One acyl group is wasted as the carboxylic acid.",
          },
          {
            text: "Acyl chloride, then anhydride, then ester: the ladder sets the speed.",
            source: "u8-anh-vs",
            quote: "Acyl chloride, then anhydride, then ester: the ladder sets the speed.",
          },
          {
            text: "A cyclic anhydride opens to one molecule: half ester, half acid.",
            source: "u8-anh-cyclic",
            quote: "A cyclic anhydride opens to one molecule: half ester, half acid.",
          },
        ],
        example: { source: "u8-anh-waste", quote: "One acyl group is wasted as the carboxylic acid." },
      },
      {
        node: "u8-hydrolysis",
        ideas: [
          {
            text: "Saponification ends at the carboxylate.",
            mark: "ends at the carboxylate",
            source: "u8-hyd-sapon",
            quote: "Saponification ends at the carboxylate.",
          },
          {
            text: "Base hydrolysis is irreversible because it ends on the bottom rung.",
            source: "u8-hyd-irrev",
            quote: "Base hydrolysis is irreversible because it ends on the bottom rung.",
          },
          {
            text: "Acid hydrolysis: ester plus water gives acid plus alcohol, reversibly.",
            source: "u8-hyd-meet",
            quote: "Acid hydrolysis: ester plus water gives acid plus alcohol, reversibly.",
          },
          {
            text: "Saponifying a lactone gives a hydroxy carboxylate.",
            source: "u8-hyd-lactone",
            quote: "Saponifying a lactone gives a hydroxy carboxylate.",
          },
        ],
        example: { source: "u8-hyd-sapon", quote: "Hydroxide swaps OCH₃ for OH, then the acid is deprotonated straight away by base." },
      },
      {
        node: "u8-transester",
        ideas: [
          {
            text: "Transesterification swaps the alkoxy group of an ester.",
            mark: "swaps the alkoxy group",
            source: "u8-tre-meet",
            quote: "Transesterification swaps the alkoxy group of an ester.",
          },
          {
            text: "Keep the acyl part, trade the alkoxy part.",
            source: "u8-tre-propyl",
            quote: "Keep the acyl part, trade the alkoxy part.",
          },
          {
            text: "It is driven by using the new alcohol in excess.",
            source: "u8-tre-excess",
            quote: "Transesterification is driven by using the new alcohol in excess.",
          },
          {
            text: "Alkoxide in its own alcohol gives transesterification.",
            source: "u8-tre-base",
            quote: "Alkoxide in its own alcohol gives transesterification.",
          },
        ],
        example: { source: "u8-tre-meet", quote: "Same rung, new alkyl group." },
      },
      {
        node: "u8-carboxylate-alk",
        ideas: [
          {
            text: "Carboxylate plus a methyl or primary halide gives an ester.",
            mark: "a methyl or primary halide",
            source: "u8-cxa-meet",
            quote: "Carboxylate plus a methyl or primary halide gives an ester.",
          },
          {
            text: "Carboxylate alkylation is O-alkylation.",
            source: "u8-cxa-which",
            quote: "Carboxylate alkylation is O-alkylation.",
          },
          {
            text: "Intramolecular O-alkylation makes a lactone.",
            source: "u8-cxa-ring",
            quote: "Intramolecular O-alkylation makes a lactone.",
          },
        ],
        example: { source: "u8-cxa-meet", quote: "The carboxylate O attacks CH₃ in an SN2 and iodide leaves." },
      },
      {
        node: "u8-amide-hyd",
        ideas: [
          {
            text: "Amide hydrolysis needs forcing conditions because amides are low on the ladder.",
            mark: "forcing conditions",
            source: "u8-amh-why",
            quote: "Amide hydrolysis needs forcing conditions because amides are low on the ladder.",
          },
          {
            text: "Amide hydrolysis gives the acid and the amine (as its salt).",
            source: "u8-amh-meet",
            quote: "Amide hydrolysis gives the acid and the amine (as its salt).",
          },
          {
            text: "A peptide bond is an amide; hydrolysis splits it into the two amino acids.",
            source: "u8-amh-peptide",
            quote: "A peptide bond is an amide; hydrolysis splits it into the two amino acids.",
          },
          {
            text: "Hydrolysing a lactam gives an amino carboxylate.",
            source: "u8-amh-lactam",
            quote: "Hydrolysing a lactam gives an amino carboxylate.",
          },
        ],
        example: { source: "u8-amh-meet", quote: "Water replaces NH₂ on the acyl carbon." },
      },
      {
        node: "u8-nitrile",
        ideas: [
          {
            text: "R-X plus cyanide gives a nitrile one carbon longer.",
            mark: "one carbon longer",
            source: "u8-nit-meet",
            quote: "R-X plus cyanide gives a nitrile one carbon longer.",
          },
          {
            text: "Nitrile plus water, heat, gives the acid.",
            source: "u8-nit-acid",
            quote: "Nitrile plus water, heat, gives the acid.",
          },
          {
            text: "The amide is the halfway point between nitrile and acid.",
            source: "u8-nit-partial",
            quote: "The amide is the halfway point between nitrile and acid.",
          },
          {
            text: "A Grignard on a nitrile gives a ketone after hydrolysis.",
            source: "u8-nit-grignard",
            quote: "A Grignard on a nitrile gives a ketone after hydrolysis.",
          },
        ],
        example: { source: "u8-nit-meet", quote: "R-X plus cyanide gives a nitrile one carbon longer." },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting saponification to run back to the ester.",
        fix: "It ends on the bottom rung, the carboxylate, so it cannot.",
        source: "u8-hyd-irrev",
        quote: "Base hydrolysis is irreversible because it ends on the bottom rung.",
      },
      {
        mistake: "Using one NH₃ per acyl chloride.",
        fix: "HCl forms, and a second equivalent mops it up.",
        source: "u8-all-two",
        quote: "Amines are bases, so a second equivalent (or pyridine) mops up the HCl.",
      },
      {
        mistake: "Swapping the acyl part in a transesterification.",
        fix: "Keep the acyl part, trade the alkoxy part.",
        source: "u8-tre-propyl",
        quote: "Keep the acyl part, trade the alkoxy part.",
      },
      {
        mistake: "Alkylating a carboxylate with a tertiary halide.",
        fix: "Methyl and primary halides only.",
        source: "u8-cxa-halide",
        quote: "Methyl and primary halides only.",
      },
    ],
  },
  {
    id: "c",
    label: "Stage C",
    title: "Reductions and organometallics",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u8-lialh4",
        ideas: [
          {
            text: "LiAlH₄ reduces every rung: acids and esters to alcohols, amides and nitriles to amines.",
            mark: "every rung",
            source: "u8-lah-match",
            quote: "LiAlH₄ reduces every rung: acids and esters to alcohols, amides and nitriles to amines.",
          },
          {
            text: "LiAlH₄ turns an amide into an amine: C=O becomes CH₂.",
            source: "u8-lah-amide",
            quote: "LiAlH₄ turns an amide into an amine: C=O becomes CH₂.",
          },
          {
            text: "Nitriles reduce to primary amines.",
            source: "u8-lah-nitrile",
            quote: "Nitriles reduce to primary amines.",
          },
          {
            text: "A lactone reduces to a diol.",
            source: "u8-lah-lactone",
            quote: "A lactone reduces to a diol.",
          },
        ],
        example: { source: "u8-lah-amide", quote: "LiAlH₄ turns an amide into an amine: C=O becomes CH₂." },
      },
      {
        node: "u8-nabh4",
        ideas: [
          {
            text: "NaBH₄ is for aldehydes and ketones only.",
            mark: "aldehydes and ketones only",
            source: "u8-nab-group",
            quote: "NaBH₄ is for aldehydes and ketones only.",
          },
          {
            text: "NaBH₄ picks the ketone and leaves the ester.",
            source: "u8-nab-meet",
            quote: "NaBH₄ picks the ketone and leaves the ester.",
          },
          {
            text: "Swap NaBH₄ for LiAlH₄ and the ester goes too.",
            source: "u8-nab-lah",
            quote: "Swap NaBH₄ for LiAlH₄ and the ester goes too.",
          },
        ],
        example: { source: "u8-nab-meet", quote: "NaBH₄ reduces the ketone and leaves the ester." },
      },
      {
        node: "u8-dibal",
        ideas: [
          {
            text: "DIBAL-H, one equivalent, cold: ester to aldehyde.",
            mark: "ester to aldehyde",
            source: "u8-dib-meet",
            quote: "DIBAL-H, one equivalent, cold: ester to aldehyde.",
          },
          {
            text: "DIBAL-H stops one step down; LiAlH₄ goes two.",
            source: "u8-dib-ladder",
            quote: "DIBAL-H stops one step down; LiAlH₄ goes two.",
          },
          {
            text: "DIBAL-H on a nitrile gives an aldehyde.",
            source: "u8-dib-nitrile",
            quote: "DIBAL-H on a nitrile gives an aldehyde.",
          },
        ],
        example: { source: "u8-dib-meet", quote: "Cold, the intermediate holds until workup, which releases the aldehyde." },
      },
      {
        node: "u8-organomet",
        ideas: [
          {
            text: "Esters take two Grignards and give tertiary alcohols.",
            mark: "two Grignards",
            source: "u8-org-meet",
            quote: "Esters take two Grignards and give tertiary alcohols.",
          },
          {
            text: "Two identical groups on the carbinol carbon is the fingerprint of ester plus Grignard.",
            source: "u8-org-benzoate",
            quote: "Two identical groups on the carbinol carbon is the fingerprint of ester plus Grignard.",
          },
          {
            text: "A Grignard reagent never survives an O-H.",
            source: "u8-org-acid",
            quote: "A Grignard reagent never survives an O-H.",
          },
          {
            text: "A formate ester gives a secondary alcohol with two identical groups.",
            source: "u8-org-formate",
            quote: "A formate ester gives a secondary alcohol with two identical groups.",
          },
        ],
        example: { source: "u8-org-meet", quote: "Ketones are more reactive than esters, so a second methyl adds at once." },
      },
      {
        node: "u8-weinreb",
        ideas: [
          {
            text: "Only the Weinreb amide protects the ketone from a second addition.",
            mark: "protects the ketone",
            source: "u8-wei-choose",
            quote: "Only the Weinreb amide protects the ketone from a second addition.",
          },
          {
            text: "Weinreb amide plus Grignard gives a ketone.",
            source: "u8-wei-ketone",
            quote: "Weinreb amide plus Grignard gives a ketone.",
          },
          {
            text: "Weinreb amide plus hydride gives an aldehyde.",
            source: "u8-wei-aldehyde",
            quote: "Weinreb amide plus hydride gives an aldehyde.",
          },
        ],
        example: { source: "u8-wei-ketone", quote: "the intermediate is held by a chelate until workup, which releases the ketone." },
      },
      {
        node: "u8-gilman",
        ideas: [
          {
            text: "Cuprate for the ketone, Grignard for the alcohol.",
            mark: "Cuprate for the ketone",
            source: "u8-gil-choose",
            quote: "Cuprate for the ketone, Grignard for the alcohol.",
          },
          {
            text: "Gilman reagents turn acyl chlorides into ketones.",
            source: "u8-gil-meet",
            quote: "Gilman reagents turn acyl chlorides into ketones.",
          },
          {
            text: "Grignard reagents overshoot the ketone; that is why cuprates exist.",
            source: "u8-gil-vs",
            quote: "Grignard reagents overshoot the ketone; that is why cuprates exist.",
          },
        ],
        example: { source: "u8-gil-vs", quote: "Grignard reagents overshoot the ketone; that is why cuprates exist." },
      },
    ],
    mistakes: [
      {
        mistake: "Expecting a Grignard to stop at the ketone on an ester.",
        fix: "The ketone is more reactive than the ester, so a second equivalent adds at once.",
        source: "u8-org-meet",
        quote: "Ketones are more reactive than esters, so a second methyl adds at once.",
      },
      {
        mistake: "Using LiAlH₄ to stop at an aldehyde.",
        fix: "One cold DIBAL-H stops there; LiAlH₄ goes two steps.",
        source: "u8-dib-ladder",
        quote: "DIBAL-H stops one step down; LiAlH₄ goes two.",
      },
      {
        mistake: "Turning an amide into an alcohol with LiAlH₄.",
        fix: "The C=O becomes CH₂ and the N stays: an amine.",
        source: "u8-lah-amide",
        quote: "LiAlH₄ turns an amide into an amine: C=O becomes CH₂.",
      },
      {
        mistake: "Adding a Grignard to a free carboxylic acid.",
        fix: "The O-H destroys it first.",
        source: "u8-org-acid",
        quote: "A Grignard reagent never survives an O-H.",
      },
    ],
  },
  {
    id: "d",
    label: "Stage D",
    title: "Losing CO₂",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u8-decarb",
        ideas: [
          {
            text: "Beta-keto acids lose CO₂ on gentle heating.",
            mark: "Beta-keto acids",
            source: "u8-dec-meet",
            quote: "Beta-keto acids lose CO₂ on gentle heating.",
          },
          {
            text: "Only a CO₂H with a C=O on its alpha carbon decarboxylates easily.",
            source: "u8-dec-which",
            quote: "Only a CO₂H with a C=O on its alpha carbon decarboxylates easily.",
          },
          {
            text: "A six-membered cyclic path is why beta-keto acids decarboxylate easily.",
            source: "u8-dec-ring",
            quote: "A six-membered cyclic path is why beta-keto acids decarboxylate easily.",
          },
          {
            text: "The enol is short lived; the keto form is what you isolate.",
            source: "u8-dec-enol",
            quote: "The enol is short lived; the keto form is what you isolate.",
          },
        ],
        example: { source: "u8-dec-meet", quote: "Beta-keto acids lose CO₂ on gentle heating." },
      },
      {
        node: "u8-kolbe-e",
        ideas: [
          {
            text: "Kolbe: two R-CO₂⁻ give R-R and two CO₂.",
            mark: "R-R",
            source: "u8-kol-meet",
            quote: "Kolbe: two R-CO₂⁻ give R-R and two CO₂.",
          },
          {
            text: "The R groups double; the carboxyl carbons leave.",
            source: "u8-kol-prop",
            quote: "The R groups double; the carboxyl carbons leave.",
          },
          {
            text: "A mixed Kolbe gives a statistical mixture.",
            source: "u8-kol-mixed",
            quote: "A mixed Kolbe gives a statistical mixture.",
          },
        ],
        example: { source: "u8-kol-prop", quote: "Two ethyl radicals join: four carbons." },
      },
      {
        node: "u8-hunsdiecker",
        ideas: [
          {
            text: "Hunsdiecker: RCO₂Ag plus Br₂ gives R-Br.",
            mark: "R-Br",
            source: "u8-hun-meet",
            quote: "Hunsdiecker: RCO₂Ag plus Br₂ gives R-Br.",
          },
          {
            text: "One carbon shorter, every time.",
            source: "u8-hun-count",
            quote: "One carbon shorter, every time.",
          },
          {
            text: "HVZ and Hunsdiecker both use Br₂ on an acid; only Hunsdiecker shortens the chain.",
            source: "u8-hun-vs",
            quote: "Both use Br₂ on an acid; only Hunsdiecker shortens the chain.",
          },
        ],
        example: { source: "u8-hun-meet", quote: "The carboxyl carbon leaves as CO₂ and Br goes where it was: one carbon shorter." },
      },
    ],
    mistakes: [
      {
        mistake: "Heating an acid with no C=O on its alpha carbon and expecting CO₂ to leave.",
        fix: "Only a CO₂H with a C=O on its alpha carbon loses CO₂ easily.",
        source: "u8-dec-which",
        quote: "Only a CO₂H with a C=O on its alpha carbon decarboxylates easily.",
      },
      {
        mistake: "Drawing the enol as the decarboxylation product.",
        fix: "The enol tautomerises: isolate the keto form.",
        source: "u8-dec-enol",
        quote: "The enol is short lived; the keto form is what you isolate.",
      },
      {
        mistake: "Keeping the carboxyl carbon in a Hunsdiecker product.",
        fix: "It leaves as CO₂: one carbon shorter.",
        source: "u8-hun-count",
        quote: "One carbon shorter, every time.",
      },
      {
        mistake: "Expecting one product from a mixed Kolbe.",
        fix: "The radicals pair at random.",
        source: "u8-kol-mixed",
        quote: "A mixed Kolbe gives a statistical mixture.",
      },
    ],
  },
];

export const U8_GUIDE: UnitGuide = {
  unitId: "u8",
  intro:
    "Carboxylic acids and their derivatives, organised by one ladder: which derivative makes which, how the tetrahedral intermediate does it, then the reductions, the organometallics and the reactions that lose CO₂. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U8_GUIDE_EXAMPLES,
  placeholder: true,
};
