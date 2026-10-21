/**
 * Unit 9's guidebook, the words. Drafts until the owner signs them off.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea, every mistake and every example
 * names `source`, a Unit 9 pool entry or lesson question, and `quote`, words
 * copied exactly from its explanation or its correct option.
 * test/guideU9.test.ts fails a quote the source does not contain, and an idea
 * whose source is not in its own lesson. The `text`, `mistake` and `fix`
 * lines are plain paraphrases of those quotes, nothing more.
 *
 * The stages follow the unit's own split, 9a, 9b and 9c. Side quests sit in
 * the stage of the lesson they branch from. The drawings are generated:
 * u9Guide.figures.ts, by scripts/guide_u9.py. This file is loaded only when
 * a student opens the Unit 9 guide (index.ts).
 */
import type { GuideStage, UnitGuide } from "./types";
import { U9_GUIDE_EXAMPLES } from "./u9Guide.figures";

const STAGES: readonly GuideStage[] = [
  {
    id: "a",
    label: "9a",
    title: "Enols and enolates",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u9-tautomer",
        ideas: [
          {
            text: "An enol is the C=C-OH partner of a C=O: one H and one π bond move.",
            mark: "one H and one π bond move",
            source: "u9-tau-meet",
            quote: "An enol is the C=C-OH partner of a C=O: one H and one π bond move.",
          },
          {
            text: "One enol per distinct α-carbon that carries an H.",
            source: "u9-tau-count",
            quote: "One enol per distinct α-carbon that carries an H.",
          },
          {
            text: "No α-H means no enol and no enolate.",
            source: "u9-tau-none",
            quote: "No α-H means no enol and no enolate.",
          },
          {
            text: "Tautomers have one formula; what moves is an H and a double bond.",
            source: "u9-tau-same",
            quote: "Tautomers have one formula; what moves is an H and a double bond.",
          },
        ],
        example: { source: "u9-tau-meet", quote: "An α-H moves to the oxygen and the C=O becomes C=C." },
      },
      {
        node: "u9-pka",
        ideas: [
          {
            text: "Between two carbonyls is the most acidic C-H in the unit.",
            mark: "Between two carbonyls",
            source: "u9-pka-meet",
            quote: "Between two carbonyls is the most acidic C-H in the unit.",
          },
          {
            text: "The α-proton ladder: two C=O near 10, one ketone near 20, one ester near 25.",
            source: "u9-pka-ladder",
            quote: "The α-proton ladder: two C=O near 10, one ketone near 20, one ester near 25.",
          },
          {
            text: "Full deprotonation needs a base whose conjugate acid is weaker than the C-H.",
            source: "u9-pka-acetone",
            quote: "Full deprotonation needs a base whose conjugate acid is weaker than the C-H.",
          },
          {
            text: "A doubly activated C-H needs only an alkoxide.",
            source: "u9-pka-malonate",
            quote: "A doubly activated C-H needs only an alkoxide.",
          },
        ],
        example: { source: "u9-pka-meet", quote: "Its carbanion is shared by both C=O groups." },
      },
      {
        node: "u9-enolate-res",
        ideas: [
          {
            text: "An enolate is an ambident nucleophile: it can react at O or at the α-carbon.",
            mark: "ambident nucleophile",
            source: "u9-res-atoms",
            quote: "An enolate is an ambident nucleophile: O and the α-carbon.",
          },
          {
            text: "C-alkylation makes a new C-C bond at the α-carbon.",
            source: "u9-res-c",
            quote: "C-alkylation makes a new C-C bond at the α-carbon.",
          },
          {
            text: "O-alkylation gives an enol ether; C-alkylation gives a ketone.",
            source: "u9-res-o",
            quote: "O-alkylation gives an enol ether; C-alkylation gives a ketone.",
          },
          {
            text: "More atoms sharing the charge means a more stable anion and a lower pKa.",
            source: "u9-res-acac",
            quote: "More atoms sharing the charge, more stable anion, lower pKa.",
          },
        ],
        example: { source: "u9-res-atoms", quote: "The charge sits on O in one and on the α-carbon in the other." },
      },
      {
        node: "u9-kvt-enolate",
        ideas: [
          {
            text: "Cold, bulky, irreversible: the kinetic enolate, on the side with more H.",
            mark: "the kinetic enolate",
            source: "u9-kvt-meet",
            quote: "Cold, bulky, irreversible: the kinetic enolate, on the side with more H.",
          },
          {
            text: "Warm and reversible: the thermodynamic, more substituted enolate.",
            source: "u9-kvt-thermo",
            quote: "Warm and reversible: the thermodynamic, more substituted enolate.",
          },
          {
            text: "Kinetic control needs a base the ketone cannot give the proton back to.",
            source: "u9-kvt-conditions",
            quote: "Kinetic control needs a base the ketone cannot give the proton back to.",
          },
          {
            text: "A quaternary α-carbon cannot enolise, so only one enolate exists.",
            source: "u9-kvt-blocked",
            quote: "A quaternary α-carbon cannot enolise, so only one enolate exists.",
          },
        ],
        example: { source: "u9-kvt-meet", quote: "Cold, bulky, irreversible: the kinetic enolate, on the side with more H." },
      },
      {
        node: "u9-halo-acid",
        ideas: [
          {
            text: "Acid: the enol, one halogen.",
            mark: "one halogen",
            source: "u9-ha-meet",
            quote: "Acid: the enol, one halogen.",
          },
          {
            text: "Acid halogenation follows the more substituted enol.",
            source: "u9-ha-butanone",
            quote: "Acid halogenation follows the more substituted enol.",
          },
          {
            text: "Under acid each halogen deactivates the enol, so it stops at one.",
            source: "u9-ha-stop",
            quote: "Under acid, each halogen deactivates the enol",
          },
        ],
        example: { source: "u9-ha-butanone", quote: "Acid forms the more substituted enol, toward the CH₂. Bromine lands there." },
      },
      {
        node: "u9-halo-base",
        ideas: [
          {
            text: "Base: runaway halogenation on one carbon.",
            mark: "runaway halogenation",
            source: "u9-hb-meet",
            quote: "Base: runaway halogenation on one carbon.",
          },
          {
            text: "Each halogen acidifies the next α-H, so base runs to CX₃.",
            source: "u9-hb-why",
            quote: "Each halogen acidifies the next α-H, so base runs to CX₃.",
          },
          {
            text: "Haloform: a methyl ketone becomes a carboxylate one carbon shorter.",
            source: "u9-hb-cleave",
            quote: "Haloform: a methyl ketone becomes a carboxylate one carbon shorter.",
          },
        ],
        example: { source: "u9-hb-meet", quote: "Each Br makes the H left on that carbon more acidic, so the same carbon is hit again and again." },
      },
      {
        node: "u9-haloform",
        ideas: [
          {
            text: "The iodoform test: a methyl ketone gives CHI₃.",
            mark: "a methyl ketone gives CHI₃",
            source: "u9-hf-meet",
            quote: "The iodoform test: a methyl ketone gives CHI₃.",
          },
          {
            text: "Only a methyl ketone, CH₃-C=O, passes.",
            source: "u9-hf-which",
            quote: "Only a methyl ketone, CH₃-C=O, passes.",
          },
          {
            text: "The carboxylate has one carbon fewer than the methyl ketone.",
            source: "u9-hf-anion",
            quote: "The carboxylate has one carbon fewer than the methyl ketone.",
          },
        ],
        example: { source: "u9-hf-meet", quote: "The methyl is iodinated three times, then cleaved off as CHI₃, iodoform." },
      },
    ],
    mistakes: [
      {
        mistake: "Drawing an enol on a carbonyl with no α-H.",
        fix: "No α-H means no enol and no enolate.",
        source: "u9-tau-none",
        quote: "No α-H means no enol and no enolate.",
      },
      {
        mistake: "Using NaOEt to make a plain ketone's enolate completely.",
        fix: "Full deprotonation needs a base whose conjugate acid is weaker than the C-H: LDA.",
        source: "u9-pka-acetone",
        quote: "Full deprotonation needs a base whose conjugate acid is weaker than the C-H.",
      },
      {
        mistake: "Putting the kinetic enolate on the more substituted side.",
        fix: "Cold, bulky LDA takes the side with more H.",
        source: "u9-kvt-meet",
        quote: "Cold, bulky, irreversible: the kinetic enolate, on the side with more H.",
      },
      {
        mistake: "Expecting acid halogenation to run on to CX₃.",
        fix: "Under acid it stops at one; base is the one that runs away.",
        source: "u9-hb-match",
        quote: "Acid: one X. Base: CX₃, then cleavage to a carboxylate and HCX₃.",
      },
    ],
  },
  {
    id: "b",
    label: "9b",
    title: "Aldol and Claisen",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u9-aldol",
        ideas: [
          {
            text: "Aldol addition: enolate plus C=O gives a β-hydroxy carbonyl.",
            mark: "a β-hydroxy carbonyl",
            source: "u9-ald-meet",
            quote: "Aldol addition: enolate plus C=O gives a β-hydroxy carbonyl.",
          },
          {
            text: "The bond joins the nucleophile α-carbon to the electrophile C=O carbon.",
            source: "u9-ald-bond",
            quote: "Nucleophile α-carbon, electrophile C=O carbon.",
          },
          {
            text: "The aldol is reversible: base can cut the new C-C bond again.",
            source: "u9-ald-retro",
            quote: "The aldol is reversible: base can cut the new C-C bond again.",
          },
        ],
        example: { source: "u9-ald-meet", quote: "The new C-C bond links the α-carbon to the carbonyl carbon." },
      },
      {
        node: "u9-mannich",
        ideas: [
          {
            text: "Mannich: enol plus iminium gives a β-amino ketone.",
            mark: "a β-amino ketone",
            source: "u9-ma-meet",
            quote: "Mannich: enol plus iminium gives a β-amino ketone.",
          },
          {
            text: "The iminium carbon is the Mannich electrophile.",
            source: "u9-ma-ion",
            quote: "The iminium carbon is the Mannich electrophile.",
          },
          {
            text: "Iminium formation is a condensation.",
            source: "u9-ma-water",
            quote: "Iminium formation is a condensation.",
          },
        ],
        example: { source: "u9-ma-meet", quote: "Mannich: enol plus iminium gives a β-amino ketone." },
      },
      {
        node: "u9-aldol-cond",
        ideas: [
          {
            text: "Condensation is aldol plus loss of water, by E1cb.",
            mark: "aldol plus loss of water",
            source: "u9-cond-meet",
            quote: "Condensation is aldol plus loss of water, by E1cb.",
          },
          {
            text: "Conjugation with C=O is the driving force.",
            source: "u9-cond-why",
            quote: "Conjugation with C=O is the driving force.",
          },
          {
            text: "E1cb needs an α-H to form the enolate first.",
            source: "u9-cond-stuck",
            quote: "E1cb needs an α-H to form the enolate first.",
          },
        ],
        example: { source: "u9-cond-propanal", quote: "Aldol to the β-hydroxy aldehyde, then water leaves between C2 and C3." },
      },
      {
        node: "u9-knoevenagel",
        ideas: [
          {
            text: "Knoevenagel: aldol condensation with a stabilised donor.",
            mark: "a stabilised donor",
            source: "u9-kn-meet",
            quote: "Knoevenagel: aldol condensation with a stabilised donor.",
          },
          {
            text: "Knoevenagel donors sit between two withdrawing groups.",
            source: "u9-kn-donor",
            quote: "Knoevenagel donors sit between two withdrawing groups.",
          },
          {
            text: "A nitrile activates a CH₂ like a C=O does.",
            source: "u9-kn-cyano",
            quote: "A nitrile activates a CH₂ like a C=O does.",
          },
        ],
        example: { source: "u9-kn-meet", quote: "The doubly activated CH₂ adds to the aldehyde, then water leaves, making C=C." },
      },
      {
        node: "u9-crossed",
        ideas: [
          {
            text: "A partner with no α-H makes a crossed aldol clean.",
            mark: "no α-H",
            source: "u9-cx-meet",
            quote: "A partner with no α-H makes a crossed aldol clean.",
          },
          {
            text: "No α-H: acceptor only.",
            source: "u9-cx-acceptor",
            quote: "No α-H: acceptor only.",
          },
          {
            text: "A preformed enolate controls which partner is the donor.",
            source: "u9-cx-lda",
            quote: "A preformed enolate controls which partner is the donor.",
          },
          {
            text: "Methanal is the best acceptor of all.",
            source: "u9-cx-hcho",
            quote: "Methanal is the best acceptor of all.",
          },
        ],
        example: { source: "u9-cx-meet", quote: "Benzaldehyde has no α-H, so it is only the acceptor." },
      },
      {
        node: "u9-directed",
        ideas: [
          {
            text: "Directed aldol: make one enolate fully, then add the acceptor.",
            mark: "make one enolate fully",
            source: "u9-di-meet",
            quote: "Directed aldol: make one enolate fully, then add the acceptor.",
          },
          {
            text: "Full, irreversible enolate formation first: then one partner, one product.",
            source: "u9-di-why",
            quote: "Full, irreversible enolate formation first: then one partner, one product.",
          },
          {
            text: "The enolate's carbon decides the product's skeleton.",
            source: "u9-di-thermo",
            quote: "The enolate's carbon decides the product's skeleton.",
          },
        ],
        example: { source: "u9-di-meet", quote: "LDA makes the kinetic enolate on the CH₃ side." },
      },
      {
        node: "u9-intra",
        ideas: [
          {
            text: "Five- and six-membered rings win the intramolecular aldol.",
            mark: "Five- and six-membered rings",
            source: "u9-in-meet",
            quote: "Five- and six-membered rings win the intramolecular aldol.",
          },
          {
            text: "Number the ring atoms from the α-carbon to the attacked C=O.",
            source: "u9-in-size",
            quote: "Number the ring atoms from the α-carbon to the attacked C=O.",
          },
          {
            text: "1,5-diketones give six-membered rings.",
            source: "u9-in-which",
            quote: "1,5-diketones give six-membered rings.",
          },
        ],
        example: { source: "u9-in-meet", quote: "A terminal α-carbon reaches the other C=O and closes a five-membered ring." },
      },
      {
        node: "u9-claisen",
        ideas: [
          {
            text: "Claisen: an ester enolate does acyl substitution on another ester.",
            mark: "acyl substitution on another ester",
            source: "u9-cl-meet",
            quote: "Claisen: an ester enolate does acyl substitution on another ester.",
          },
          {
            text: "A full equivalent of base is needed because it is used up.",
            source: "u9-cl-drive",
            quote: "A full equivalent of base is needed because it is used up.",
          },
          {
            text: "A Claisen needs two α-H on the donor: one to react, one to lose at the end.",
            source: "u9-cl-dead",
            quote: "A Claisen needs two α-H on the donor: one to react, one to lose at the end.",
          },
          {
            text: "Match the alkoxide to the ester's alkoxy group.",
            source: "u9-cl-base",
            quote: "Match the alkoxide to the ester's alkoxy group.",
          },
        ],
        example: { source: "u9-cl-meet", quote: "The result is a β-keto ester." },
      },
      {
        node: "u9-reformatsky",
        ideas: [
          {
            text: "Reformatsky: a zinc ester enolate adds to a ketone or aldehyde.",
            mark: "a zinc ester enolate",
            source: "u9-rf-meet",
            quote: "Reformatsky: a zinc ester enolate adds to a ketone or aldehyde.",
          },
          {
            text: "Reformatsky products are β-hydroxy esters, like an ester aldol.",
            source: "u9-rf-beta",
            quote: "Reformatsky products are β-hydroxy esters, like an ester aldol.",
          },
          {
            text: "The carbon that held Br is the one that bonds.",
            source: "u9-rf-chx",
            quote: "The carbon that held Br is the one that bonds.",
          },
        ],
        example: { source: "u9-rf-meet", quote: "Zinc inserts into C-Br to make a zinc enolate." },
      },
      {
        node: "u9-dieckmann",
        ideas: [
          {
            text: "Dieckmann: an intramolecular Claisen to a cyclic β-keto ester.",
            mark: "an intramolecular Claisen",
            source: "u9-dk-meet",
            quote: "Dieckmann: an intramolecular Claisen to a cyclic β-keto ester.",
          },
          {
            text: "Ring size is chain length minus one.",
            source: "u9-dk-which",
            quote: "Ring size is chain length minus one.",
          },
          {
            text: "Dieckmann then decarboxylation makes a cyclic ketone.",
            source: "u9-dk-decarb",
            quote: "Dieckmann then decarboxylation makes a cyclic ketone.",
          },
        ],
        example: { source: "u9-dk-meet", quote: "a Claisen inside one molecule closes a five-membered ring." },
      },
      {
        node: "u9-crossed-claisen",
        ideas: [
          {
            text: "Crossed Claisen: one ester with no α-H as the acceptor.",
            mark: "no α-H as the acceptor",
            source: "u9-cc-meet",
            quote: "Crossed Claisen: one ester with no α-H as the acceptor.",
          },
          {
            text: "Carbonates, formates, benzoates and oxalates have no α-H.",
            source: "u9-cc-acceptor",
            quote: "Carbonates, formates, benzoates and oxalates have no α-H.",
          },
          {
            text: "The more acidic partner is the donor.",
            source: "u9-cc-ketone",
            quote: "The more acidic partner is the donor.",
          },
        ],
        example: { source: "u9-cc-meet", quote: "Ethyl benzoate has no α-H, so only ethyl acetate makes an enolate." },
      },
    ],
    mistakes: [
      {
        mistake: "Putting the aldol OH on the α-carbon.",
        fix: "It sits on the β-carbon.",
        source: "u9-ald-beta",
        quote: "Aldol products are β-hydroxy aldehydes or ketones.",
      },
      {
        mistake: "Mixing two enolisable partners and expecting one product.",
        fix: "Give one partner no α-H, or preform one enolate.",
        source: "u9-cx-meet",
        quote: "A partner with no α-H makes a crossed aldol clean.",
      },
      {
        mistake: "Using a catalytic amount of base for a Claisen.",
        fix: "A full equivalent is needed because it is used up.",
        source: "u9-cl-drive",
        quote: "A full equivalent of base is needed because it is used up.",
      },
      {
        mistake: "Closing a four-membered ring in an intramolecular aldol.",
        fix: "The strained ring loses; five and six win.",
        source: "u9-in-other",
        quote: "The losing ring is the strained one.",
      },
    ],
  },
  {
    id: "c",
    label: "9c",
    title: "Building C-C bonds",
    optional: false,
    checkpoint: null,
    lessons: [
      {
        node: "u9-alkylation",
        ideas: [
          {
            text: "Enolate alkylation makes a new C-C bond at the α-carbon.",
            mark: "a new C-C bond",
            source: "u9-alk-meet",
            quote: "Enolate alkylation makes a new C-C bond at the α-carbon.",
          },
          {
            text: "Enolates need methyl or primary halides.",
            source: "u9-alk-halide",
            quote: "Enolates need methyl or primary halides.",
          },
          {
            text: "The enolate choice sets where the alkyl group goes.",
            source: "u9-alk-kin",
            quote: "The enolate choice sets where the alkyl group goes.",
          },
        ],
        example: { source: "u9-alk-meet", quote: "LDA makes the enolate fully. Its α-carbon attacks CH₃I in SN2." },
      },
      {
        node: "u9-stork",
        ideas: [
          {
            text: "An enamine is an enolate equivalent: the carbon two atoms from N attacks.",
            mark: "an enolate equivalent",
            source: "u9-st-site",
            quote: "An enamine is an enolate equivalent: the carbon two atoms from N attacks.",
          },
          {
            text: "Stork: enamine alkylation, then hydrolysis, alkylates the ketone.",
            source: "u9-st-mei",
            quote: "Stork: enamine alkylation, then hydrolysis, alkylates the ketone.",
          },
          {
            text: "Secondary amine, enamine. Primary amine, imine.",
            source: "u9-st-amine",
            quote: "Secondary amine, enamine. Primary amine, imine.",
          },
        ],
        example: { source: "u9-st-mei", quote: "Stork: enamine alkylation, then hydrolysis, alkylates the ketone." },
      },
      {
        node: "u9-malonic",
        ideas: [
          {
            text: "Malonic synthesis: R-X becomes R-CH₂-CO₂H.",
            mark: "R-CH₂-CO₂H",
            source: "u9-mal-final",
            quote: "Malonic synthesis: R-X becomes R-CH₂-CO₂H.",
          },
          {
            text: "Step one: alkylate the central carbon.",
            source: "u9-mal-meet",
            quote: "Step one of the malonic synthesis: alkylate the central carbon.",
          },
          {
            text: "Two carbonyls let a mild base do the job.",
            source: "u9-mal-base",
            quote: "Two carbonyls let a mild base do the job.",
          },
          {
            text: "A dihalide on malonate closes a ring.",
            source: "u9-mal-ring",
            quote: "A dihalide on malonate closes a ring.",
          },
        ],
        example: { source: "u9-mal-final", quote: "Malonic synthesis: R-X becomes R-CH₂-CO₂H." },
      },
      {
        node: "u9-acetoacetic",
        ideas: [
          {
            text: "Acetoacetic synthesis makes methyl ketones.",
            mark: "methyl ketones",
            source: "u9-aa-final",
            quote: "Acetoacetic synthesis makes methyl ketones.",
          },
          {
            text: "R-X becomes CH₃COCH₂R.",
            source: "u9-aa-benzyl",
            quote: "R-X becomes CH₃COCH₂R.",
          },
          {
            text: "Malonic gives acids, acetoacetic gives methyl ketones.",
            source: "u9-aa-class",
            quote: "Malonic gives acids, acetoacetic gives methyl ketones.",
          },
        ],
        example: { source: "u9-aa-final", quote: "The ester hydrolyses to a β-keto acid, which loses CO₂. What remains is a methyl ketone." },
      },
      {
        node: "u9-michael",
        ideas: [
          {
            text: "Michael: a soft, stabilised nucleophile adds to the β-carbon.",
            mark: "the β-carbon",
            source: "u9-mi-meet",
            quote: "Michael: a soft, stabilised nucleophile adds to the β-carbon.",
          },
          {
            text: "An acceptor is C=C-C=O, or C=C-C≡N.",
            source: "u9-mi-acceptor",
            quote: "Acceptor: C=C-C=O (or C=C-C≡N).",
          },
          {
            text: "Michael donors are usually 1,3-dicarbonyls.",
            source: "u9-mi-donor",
            quote: "Michael donors are usually 1,3-dicarbonyls.",
          },
        ],
        example: { source: "u9-mi-meet", quote: "The malonate carbon adds to the β-carbon, the CH₂ end of the C=C. The ketone survives." },
      },
      {
        node: "u9-cuprate",
        ideas: [
          {
            text: "Cuprate for 1,4; Grignard and RLi for 1,2.",
            mark: "Cuprate for 1,4",
            source: "u9-cu-reagent",
            quote: "Cuprate for 1,4; Grignard and RLi for 1,2.",
          },
          {
            text: "The group on copper is the group that arrives.",
            source: "u9-cu-retro",
            quote: "The group on copper is the group that arrives.",
          },
          {
            text: "1,4-addition can build a quaternary carbon.",
            source: "u9-cu-quat",
            quote: "1,4-addition can build a quaternary carbon.",
          },
        ],
        example: { source: "u9-cu-mvk", quote: "Ethyl bonds to the CH₂ end of the C=C, which extends the chain to six carbons." },
      },
      {
        node: "u9-robinson",
        ideas: [
          {
            text: "Robinson annulation: Michael, then intramolecular aldol condensation, a new six-membered ring.",
            mark: "a new six-membered ring",
            source: "u9-rob-meet",
            quote: "Robinson annulation: Michael, then intramolecular aldol condensation, a new six-membered ring.",
          },
          {
            text: "Step one is a Michael addition, which makes a 1,5-diketone.",
            source: "u9-rob-michael",
            quote: "Step one is a Michael addition, which makes a 1,5-diketone.",
          },
          {
            text: "First join, then close.",
            source: "u9-rob-order",
            quote: "First join, then close.",
          },
        ],
        example: { source: "u9-rob-meet", quote: "Michael addition first, then the new chain's methyl attacks the ring C=O, closing a six-membered ring, and water leaves." },
      },
      {
        node: "u9-retro",
        ideas: [
          {
            text: "Find the methyl ketone, then the R on its α-carbon.",
            mark: "the R on its α-carbon",
            source: "u9-re-aa",
            quote: "Find the methyl ketone, then the R on its α-carbon.",
          },
          {
            text: "Disconnect the α-to-β bond of the β-hydroxy carbonyl.",
            source: "u9-re-aldol",
            quote: "Disconnect the α-to-β bond of the β-hydroxy carbonyl.",
          },
          {
            text: "An enone's C=C marks the aldol bond.",
            source: "u9-re-enone",
            quote: "An enone's C=C marks the aldol bond.",
          },
          {
            text: "A group β to a ketone suggests a conjugate addition.",
            source: "u9-re-cuprate",
            quote: "A group β to a ketone suggests a conjugate addition.",
          },
        ],
        example: { source: "u9-re-aa", quote: "Pentan-2-one is CH₃CO-CH₂-CH₂CH₃: remove CH₃COCH₂ and an ethyl is left." },
      },
    ],
    mistakes: [
      {
        mistake: "Alkylating an enolate with a tertiary halide.",
        fix: "Enolates need methyl or primary halides.",
        source: "u9-alk-halide",
        quote: "Enolates need methyl or primary halides.",
      },
      {
        mistake: "Expecting an acid from the acetoacetic route.",
        fix: "Malonic gives acids; acetoacetic gives methyl ketones.",
        source: "u9-aa-class",
        quote: "Malonic gives acids, acetoacetic gives methyl ketones.",
      },
      {
        mistake: "Adding a Michael donor to the carbonyl carbon.",
        fix: "Conjugate addition is at the β-carbon.",
        source: "u9-mi-site",
        quote: "Conjugate addition is at the β-carbon.",
      },
      {
        mistake: "Using a Grignard for a 1,4-addition.",
        fix: "Cuprates and stabilised enolates add 1,4; Grignards add 1,2.",
        source: "u9-cu-match",
        quote: "Cuprates and stabilised enolates add 1,4; Grignards add 1,2.",
      },
    ],
  },
];

export const U9_GUIDE: UnitGuide = {
  unitId: "u9",
  intro:
    "The carbon next to a C=O, in three parts: how it becomes an enol or an enolate, the aldol and Claisen reactions it drives, then the alkylations and conjugate additions that build new C-C bonds. Read a stage before its lessons, or come back when one trips you up.",
  stages: STAGES,
  examples: U9_GUIDE_EXAMPLES,
  placeholder: true,
};
