/**
 * The priming preview for every Unit 1 lesson (U1-P2, 2026-10-17, round 4).
 *
 * Justin Sung's "priming" (scratchpad/justin-sung.md): before any question,
 * the student builds a rough frame for what is coming, so each question lands
 * on that frame instead of in a vacuum. Each preview has three parts:
 *
 *   1. bigIdea: the question the lesson answers, in one line. A question, not
 *      the answer, so the screen never hands over what the lesson then asks.
 *   2. guess: one real question from this lesson's own pool, with its drawing.
 *      The student commits to an answer before anything is taught (pretesting).
 *      CHECK locks it in WITHOUT the answer: the lesson then teaches it, and
 *      when the question comes up there it is a real first attempt, not recall
 *      of a reveal. The verdict and the why come at the END of the lesson,
 *      which closes the loop. Never one of the lesson's first two screens
 *      (test/u1Priming.test.ts pins that).
 *   3. ideas: three to five ideas, in the order the lesson builds them, shown
 *      as a small concept map: each idea a node, each `via` the joining words
 *      on the link between two nodes. Read top to bottom, the map is one
 *      sentence. The preview SHOWS it (the frame); the end of the lesson asks
 *      the student to REBUILD it from the chips, once they know the ideas.
 *
 * Plus one link back to the lesson right before this one ON THE PATH the
 * student walks (bridge; beats/priming.ts previousOnPath): optional branches
 * are skipped for a spine lesson, so nobody is recapped a lesson they skipped.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every idea and every bridge names `source`,
 * the id of a Unit 1 pool entry or lesson MCQ, and `quote`, words copied
 * exactly from that entry's explanation or its CORRECT option (never a wrong
 * option's text). test/u1Priming.test.ts fails any quote the source does not
 * contain, any idea whose source is not in this lesson, and any bridge whose
 * source is not in the previous lesson. Labels are short paraphrases of the
 * quotes. Everything is a draft until the owner signs it off.
 */

export interface PrimingIdea {
  /** A few words, shown on one chip. */
  readonly label: string;
  /**
   * The words between the chip before this one and this chip, so the whole
   * chain reads as one sentence. The first idea has none.
   */
  readonly via?: string;
  /** A pool entry or MCQ id from THIS lesson. */
  readonly source: string;
  /** Copied exactly from that source's explanation or correct option. */
  readonly quote: string;
}

export type PrimingBridge =
  | {
      /** The unit's first lesson has nothing earlier to link to. */
      readonly node: null;
      readonly title: string;
      readonly text: string;
    }
  | {
      /** The lesson right before this one on the path (previousOnPath). */
      readonly node: string;
      /** One line: the earlier lesson's idea, then how this one picks it up. */
      readonly text: string;
      /** A pool entry or MCQ id from THAT earlier lesson. */
      readonly source: string;
      /** Copied exactly from that source's explanation or correct option. */
      readonly quote: string;
    };

export interface LessonPriming {
  readonly bigIdea: string;
  /**
   * The id of an MCQ this lesson has, asked as the opening guess. Null only
   * for a lesson that plays a single question: guessing it, marked, would be
   * the whole lesson before it starts.
   */
  readonly guess: string | null;
  readonly ideas: readonly PrimingIdea[];
  readonly bridge: PrimingBridge;
  readonly placeholder: true;
}

export const U1_PRIMING: Readonly<Record<string, LessonPriming>> = {
  // STAGE A, allylic stability.
  "u1-allylic": {
    bigIdea: "What does a C=C do for the carbon right next to it?",
    guess: "u1-allylic-moves",
    ideas: [
      {
        label: "A charge next to a C=C",
        source: "u1-allylic-pick",
        quote: "the charged carbon is bonded to a carbon of a C=C",
      },
      {
        label: "Two contributors",
        via: "can be drawn as",
        source: "u1-allylic-where",
        quote: "the charge sits on C1 in one contributor and on C3 in the other",
      },
      {
        label: "Where electrons are drawn",
        via: "that differ only in",
        source: "u1-allylic-moves",
        quote: "Resonance contributors differ only in where electrons are drawn",
      },
      {
        label: "One blend of both",
        via: ", so the real ion is",
        source: "u1-allylic-moves",
        quote: "the real species is one blend of all its contributors",
      },
    ],
    bridge: { node: null, title: "Start of Unit 1", text: "This is where Unit 1 starts. Every later lesson builds on it." },
    placeholder: true,
  },
  "u1-rank-cation": {
    bigIdea: "Which carbocation is the most stable, and how do you tell?",
    guess: "u1-cat-tbu-vs-allyl",
    ideas: [
      {
        label: "Each carbon on C⁺",
        source: "u1-cat-ladder-alkyl",
        quote: "Each neighbouring carbon donates into the empty p orbital",
      },
      {
        label: "Resonance",
        via: "helps, and so does",
        source: "u1-cat-ladder-allylic",
        quote: "Resonance spreads the charge",
      },
      {
        // Owner swap 2026-10-17: this item is now crotyl vs isopropyl.
        label: "Resonance breaks a tie",
        via: ", so",
        source: "u1-cat-allyl-vs-2",
        quote: "a 2° allylic cation beats a 2° alkyl cation",
      },
      {
        label: "Score both effects",
        via: ", so",
        source: "u1-cat-count-both",
        quote: "Score each cation on resonance and on substitution",
      },
    ],
    bridge: {
      node: "u1-allylic",
      text: "The allyl cation shares its charge between two ends. How much does that sharing help?",
      source: "u1-allylic-where",
      quote: "the real ion shares it between the two ends",
    },
    placeholder: true,
  },
  "u1-rank-anion": {
    bigIdea: "Do carbanions follow the same ladder as carbocations?",
    guess: "u1-ani-flip",
    ideas: [
      {
        label: "Alkyl groups donate density",
        source: "u1-ani-why-alkyl",
        quote: "Alkyl groups donate electron density",
      },
      {
        label: "An electron-rich anion",
        via: ", which hurts",
        source: "u1-ani-why-alkyl",
        quote: "hurts an electron-rich anion",
      },
      {
        label: "Resonance still helps",
        via: ", but",
        source: "u1-ani-ring",
        quote: "Resonance helps an anion just as it helps a cation",
      },
      {
        label: "More s character",
        via: ", and so does",
        source: "u1-ani-why-sp",
        quote: "More s character in the orbital holding the lone pair steadies a carbanion",
      },
    ],
    bridge: {
      node: "u1-rank-cation",
      text: "Carbons on C⁺ donate into its empty orbital. Now the same carbons meet a full one.",
      source: "u1-cat-ladder-alkyl",
      quote: "Each neighbouring carbon donates into the empty p orbital by hyperconjugation",
    },
    placeholder: true,
  },
  "u1-rank-radical": {
    bigIdea: "Do radicals rank like cations or like anions?",
    guess: "u1-rad-benzyl-vs-3",
    ideas: [
      {
        label: "Seven valence electrons",
        source: "u1-rad-why",
        quote: "A radical carbon has seven valence electrons",
      },
      {
        label: "The cation trend, 3° best",
        via: "mean radicals follow",
        source: "u1-rad-trend",
        quote: "they follow the cation trend",
      },
      {
        label: "Allylic and benzylic resonance",
        via: ", but",
        source: "u1-rad-benzyl-vs-3",
        quote: "allylic and benzylic resonance beats substitution",
      },
      {
        label: "Even a 3° alkyl radical",
        via: "beats",
        source: "u1-rad-ring",
        quote: "a 2° allylic radical beats a 3° alkyl one",
      },
    ],
    bridge: {
      node: "u1-rank-anion",
      text: "Alkyl groups help an electron-poor cation and hurt an electron-rich anion. Which side is a radical on?",
      source: "u1-ani-why-alkyl",
      quote: "That helps an electron-poor cation and hurts an electron-rich anion",
    },
    placeholder: true,
  },

  // STAGE B, addition to dienes.
  "u1-12v14": {
    bigIdea: "HBr meets a diene. Why do two products form?",
    guess: "u1-12v14-pick-14",
    ideas: [
      {
        label: "H⁺ adds to the diene",
        source: "u1-12v14-protonate",
        quote: "Protonate an END carbon of the diene",
      },
      {
        label: "An allylic cation",
        via: "to leave",
        source: "u1-12v14-protonate",
        quote: "that is the move that leaves an allylic cation",
      },
      {
        label: "The 1,2 product",
        via: ", and bromide on its two ends gives",
        source: "u1-12v14-which-carbon",
        quote: "C2 gives the 1,2 product",
      },
      {
        label: "The 1,4 product",
        via: "and",
        source: "u1-12v14-which-carbon",
        quote: "C4 gives the 1,4 product",
      },
    ],
    bridge: {
      node: "u1-rank-anion",
      text: "Resonance helps a cation and an anion alike. Here HBr makes an allylic cation, mid-reaction.",
      source: "u1-ani-ring",
      quote: "Resonance helps an anion just as it helps a cation",
    },
    placeholder: true,
  },
  "u1-kvt": {
    bigIdea: "Two products can form. Which one wins, and when?",
    guess: "mcq-kvt-statement",
    ideas: [
      {
        label: "The kinetic product",
        source: "u1-kvt-define-kinetic",
        quote: "The kinetic product has the lowest barrier (lowest transition state), so it forms fastest",
      },
      {
        label: "Cold",
        via: "forms fastest and wins",
        source: "mcq-kvt-cold",
        quote: "Cold locks in whichever product forms fastest",
      },
      {
        label: "The thermodynamic product",
        via: ", while",
        source: "u1-kvt-define-conditions",
        quote: "The thermodynamic product has the lowest G",
      },
      {
        label: "Warm and reversible",
        via: "is most stable and wins",
        source: "u1-kvt-define-conditions",
        quote: "It wins when the reaction is warm and reversible",
      },
    ],
    bridge: {
      node: "u1-12v14",
      text: "One cation gave both the 1,2 and the 1,4 product. Which one ends up in the flask?",
      source: "u1-12v14-which-carbon",
      quote: "C2 gives the 1,2 product and C4 gives the 1,4 product",
    },
    placeholder: true,
  },
  "u1-energy-diagram": {
    bigIdea: "How do you read speed and stability off one diagram?",
    guess: "u1-ed-faster",
    ideas: [
      { label: "Hump height", source: "u1-ed-faster", quote: "TS height is speed" },
      { label: "Well depth", via: "sets speed, and", source: "u1-ed-stable", quote: "Product depth is stability" },
      {
        label: "The lower hump",
        via: "sets stability, so cold goes to",
        source: "u1-ed-cold",
        quote: "Cold and irreversible: the product over the lower hump (kinetic) wins",
      },
      {
        label: "The deeper well",
        via: "and warm goes to",
        source: "u1-ed-warm",
        quote: "Warm and reversible: the product in the deeper well (thermodynamic) wins",
      },
    ],
    bridge: {
      node: "u1-kvt",
      text: "The kinetic product has the lowest barrier. Here you see that barrier on a diagram.",
      source: "u1-kvt-define-kinetic",
      quote: "The kinetic product has the lowest barrier",
    },
    placeholder: true,
  },
  "u1-hx-dienes": {
    bigIdea: "Given a real diene, HX and a temperature, what forms?",
    guess: "u1-hx-isoprene-site",
    ideas: [
      {
        label: "The best allylic cation",
        source: "u1-hx-pentadiene",
        quote: "Protonate to make the best allylic cation first",
      },
      {
        label: "The 1,2 product",
        via: "forms first, then cold gives",
        source: "u1-hx-label-kinetic",
        quote: "The kinetic product is the 1,2 product",
      },
      {
        label: "The more substituted alkene",
        via: "and warm gives",
        source: "u1-hx-label-thermo",
        quote: "the product whose C=C carries more carbons",
      },
      {
        label: "A tie cannot be called",
        via: ", but",
        source: "u1-hx-too-close",
        quote: "When the counts tie, the rule cannot call it",
      },
    ],
    bridge: {
      node: "u1-energy-diagram",
      text: "Cold goes to the lower hump, warm to the deeper well. Now use that on real dienes.",
      source: "u1-ed-cold",
      quote: "Cold and irreversible: the product over the lower hump (kinetic) wins",
    },
    placeholder: true,
  },
  "u1-x2": {
    bigIdea: "Do Br₂ and Cl₂ add to a diene the way HBr does?",
    guess: "u1-x2-cold-cl",
    ideas: [
      { label: "X on C1", source: "u1-x2-pick-14", quote: "X on C1, then X on C2 or C4" },
      {
        label: "The same allylic cation",
        via: "leaves",
        source: "u1-x2-pick-14",
        quote: "X2 adds 1,2 or 1,4 by the same allylic cation as HX",
      },
      {
        label: "The 1,2 dihalide",
        via: ", so cold gives",
        source: "u1-x2-cold-cl",
        quote: "cold gives the 1,2 (kinetic) dihalide",
      },
      {
        label: "The more substituted alkene",
        via: "and warm gives",
        source: "u1-x2-warm-br",
        quote: "gives the dihalide with the more substituted alkene",
      },
    ],
    bridge: {
      node: "u1-hx-dienes",
      text: "With HX, cold gave the 1,2 product. Same question, new reagents: Br₂ and Cl₂.",
      source: "u1-hx-label-kinetic",
      quote: "The kinetic product is the 1,2 product",
    },
    placeholder: true,
  },

  // STAGE C, allylic halogenation.
  "u1-nbs": {
    bigIdea: "How do you put Br on an alkene and keep the C=C?",
    guess: "u1-cd-nbs-initiator",
    ideas: [
      { label: "NBS keeps Br₂ at a trace", source: "u1-cd-nbs-why", quote: "NBS holds Br2 at a trace" },
      {
        label: "Addition stalls",
        via: ", so",
        source: "u1-cd-nbs-why",
        quote: "It keeps Br2 so low that addition stalls",
      },
      {
        label: "A radical chain",
        via: "and",
        source: "u1-cd-nbs-initiator",
        quote: "Either one starts the same allylic radical chain",
      },
      {
        label: "The weakest C-H",
        via: "swaps an H for Br at",
        source: "u1-cd-nbs-weakest",
        quote: "the weakest C-H in the molecule",
      },
    ],
    bridge: {
      node: "u1-x2",
      text: "Plenty of Br₂ adds right across the C=C. Here the C=C has to survive.",
      source: "u1-x2-two-equiv",
      quote: "two Br2 saturate both C=C bonds",
    },
    placeholder: true,
  },
  "u1-nbs-practice": {
    bigIdea: "Given an alkene and NBS, can you draw every product?",
    guess: "u1-cd-nbsp-cyclohexene-count",
    ideas: [
      {
        label: "The allylic H",
        source: "u1-cd-nbsp-hexene-site",
        quote: "An allylic carbon is an sp3 carbon bonded to a C=C carbon",
      },
      {
        label: "An allylic radical",
        via: "goes to Br•, leaving",
        source: "u1-cd-nbsp-abstractor",
        quote: "Br• takes the allylic H to give HBr and the allylic radical",
      },
      {
        label: "Either of its two ends",
        via: "that takes Br at",
        source: "u1-cd-nbsp-hexene-shifted",
        quote: "Draw both contributors of the allylic radical",
      },
      {
        label: "The two ends differ",
        via: ", so check if",
        source: "u1-cd-nbsp-cyclohexene-count",
        quote: "Two products only appear when the radical's two ends differ",
      },
    ],
    bridge: {
      node: "u1-nbs",
      text: "NBS swaps an allylic H for Br and the C=C survives. Now draw the products yourself.",
      source: "u1-cd-nbs-why",
      quote: "the allylic C-H is substituted and the C=C survives",
    },
    placeholder: true,
  },

  // STAGE D, Diels-Alder.
  "u1-mo": {
    bigIdea: "What do π electrons look like as orbitals?",
    guess: "u1-cd-mo-gap",
    ideas: [
      { label: "n p orbitals", source: "u1-cd-mo-count", quote: "n p orbitals make n pi MOs" },
      { label: "n π MOs", via: "make", source: "u1-cd-mo-count", quote: "n p orbitals make n pi MOs" },
      {
        label: "ψk has k minus 1 nodes",
        via: ", where",
        source: "u1-cd-mo-hex-homo",
        quote: "ψk always has k minus one nodes",
      },
      {
        label: "The HOMO and LUMO",
        via: "; fill them to find",
        source: "u1-cd-mo-bd-homo",
        quote: "HOMO is ψ2 (one node), LUMO is ψ3 (two nodes)",
      },
    ],
    bridge: {
      node: "u1-x2",
      text: "After X⁺ adds, the allylic cation shares its charge between C2 and C4. Here are the π orbitals behind that.",
      source: "u1-x2-why-14",
      quote: "the charge sits on C2 in one contributor and C4 in the other",
    },
    placeholder: true,
  },
  "u1-da": {
    bigIdea: "How do a diene and an alkene make a ring?",
    guess: "u1-cd-da-orbitals",
    ideas: [
      {
        label: "The diene's HOMO",
        source: "u1-cd-da-orbitals",
        quote: "the diene's HOMO and the dienophile's LUMO",
      },
      {
        label: "The dienophile's LUMO",
        via: "meets",
        source: "u1-cd-da-orbitals",
        quote: "the diene's HOMO and the dienophile's LUMO",
      },
      { label: "Two new σ bonds", via: "to form", source: "u1-cd-da-ring", quote: "Two new sigma bonds form" },
      {
        label: "A cyclohexene",
        via: "and",
        source: "u1-cd-da-ring",
        quote: "diene plus dienophile give a cyclohexene",
      },
    ],
    bridge: {
      node: "u1-mo",
      text: "Butadiene's HOMO is ψ2. Here that orbital starts a reaction.",
      source: "u1-cd-mo-bd-homo",
      quote: "HOMO is ψ2 (one node)",
    },
    placeholder: true,
  },
  "u1-dienes": {
    bigIdea: "Can every diene do a Diels-Alder?",
    guess: "u1-cd-dienes-edg-locked",
    ideas: [
      { label: "Locked s-cis", source: "u1-cd-dienes-fastest", quote: "locked s-cis is fastest" },
      { label: "Free rotation", via: "is fastest,", source: "u1-cd-dienes-fastest", quote: "free rotation is fine" },
      { label: "Locked s-trans", via: "is fine, and", source: "u1-cd-dienes-fastest", quote: "locked s-trans is out" },
      {
        label: "Its donor groups",
        via: "is out, whatever",
        source: "u1-cd-dienes-edg-locked",
        quote: "however good its donor groups are",
      },
    ],
    bridge: {
      node: "u1-da",
      text: "Both new bonds form at once. That needs both diene ends in reach together.",
      source: "u1-cd-da-concerted",
      quote: "Both at once, in one concerted step",
    },
    placeholder: true,
  },
  "u1-dienophiles": {
    bigIdea: "What makes an alkene a good dienophile?",
    guess: "u1-cd-phile-ether-role",
    ideas: [
      {
        label: "Withdrawing groups",
        source: "u1-cd-phile-fastest",
        quote: "Withdrawing groups (C=O, CN, NO2) on the dienophile lower its LUMO",
      },
      {
        label: "The dienophile's LUMO",
        via: "lower",
        source: "u1-cd-phile-fastest",
        quote: "on the dienophile lower its LUMO",
      },
      { label: "A faster reaction", via: "for", source: "u1-cd-phile-fastest", quote: "speed the reaction" },
      {
        label: "A donor slows it",
        via: ", but",
        source: "u1-cd-phile-fastest",
        quote: "A donor on the dienophile slows it",
      },
    ],
    bridge: {
      node: "u1-dienes",
      text: "The diene has to reach s-cis. Now look at its partner.",
      source: "u1-cd-dienes-edg-locked",
      quote: "A diene that cannot reach s-cis does not react",
    },
    placeholder: true,
  },
  "u1-da-predict": {
    bigIdea: "Can you draw the product, or work back to the start?",
    guess: "u1-cd-pred-anhydride",
    ideas: [
      {
        label: "Number C1 to C6",
        source: "u1-cd-pred-acrolein",
        quote: "Number the diene C1 to C4 and the dienophile C5, C6",
      },
      {
        label: "C1-C6 and C4-C5",
        via: ", and the new bonds are",
        source: "u1-cd-pred-acrolein",
        quote: "New bonds C1-C6 and C4-C5",
      },
      {
        label: "The old C2-C3",
        via: "with the ring C=C at",
        source: "u1-cd-pred-acrolein",
        quote: "new C=C at C2-C3",
      },
      {
        label: "Ortho or para",
        via: "; substituents end up",
        source: "u1-cd-pred-ortho-acrolein",
        quote: "1-Substituted dienes give the ortho (1,2) product; 2-substituted dienes give the para (1,4) product",
      },
    ],
    bridge: {
      node: "u1-dienophiles",
      text: "You know which partners react fast. Now draw what they make.",
      source: "u1-cd-phile-fastest",
      quote: "lower its LUMO and speed the reaction",
    },
    placeholder: true,
  },
  "u1-da-stereo": {
    bigIdea: "Where does each group point in the product?",
    guess: "u1-cd-st-bridged",
    ideas: [
      { label: "Both bonds form on one face", source: "u1-cd-st-cis", quote: "both new bonds to one face" },
      { label: "Cis stays cis", via: ", so", source: "u1-cd-st-cis", quote: "cis stays cis, trans stays trans" },
      {
        label: "Endo forms faster",
        via: "and of endo and exo,",
        source: "u1-cd-st-endo",
        quote: "Endo forms faster even though exo is more stable",
      },
      {
        label: "A bridged bicycle",
        via: "; a cyclic diene gives",
        source: "u1-cd-st-bridged",
        quote: "A cyclic diene gives a bridged bicycle",
      },
    ],
    bridge: {
      node: "u1-da-predict",
      text: "Groups land on set ring carbons. Which face of the ring do they point to?",
      source: "u1-cd-pred-dmb-acn",
      quote: "Groups on diene C2 and C3 end up on the new ring C=C",
    },
    placeholder: true,
  },
  "u1-da-3d": {
    bigIdea: "Can you draw Diels-Alder products in 3D?",
    guess: "u1-cd-3d-fumarate",
    ideas: [
      {
        label: "Cis or trans is copied",
        source: "u1-cd-3d-fumarate",
        quote: "the dienophile's cis or trans relationship is copied onto the ring",
      },
      {
        label: "Endo or exo",
        via: "onto the ring, then draw",
        source: "u1-cd-3d-endo-where",
        quote: "exo is syn to the CH2 bridge, endo is under the C=C bridge",
      },
      {
        label: "Fused or bridged",
        via: ", note",
        source: "u1-cd-3d-fused",
        quote: "A cyclic dienophile gives a fused product; a cyclic diene gives a bridged one.",
      },
      {
        label: "Meso or racemate",
        via: "rings, and check for",
        source: "u1-cd-3d-trans-racemate",
        quote: "A chiral product from achiral starting materials forms as a racemate",
      },
    ],
    bridge: {
      node: "u1-da-stereo",
      text: "Cis stays cis and trans stays trans. Now draw it with wedges and dashes.",
      source: "u1-cd-st-cis",
      quote: "cis stays cis, trans stays trans",
    },
    placeholder: true,
  },

  // Enrichment after Stage D.
  "u1-ied": {
    bigIdea: "What if the diene is the electron-poor partner?",
    // No guess: this lesson plays ONE question, and a marked guess on it
    // would hand the student the whole lesson before it starts.
    guess: null,
    ideas: [
      {
        label: "Donors raise the diene HOMO",
        source: "mcq-ied-roles",
        quote: "Donating groups raise the diene's HOMO",
      },
      {
        label: "Withdrawers lower the LUMO",
        via: "and",
        source: "mcq-ied-roles",
        quote: "withdrawing groups lower the dienophile's LUMO",
      },
      {
        label: "The gap still closes",
        via: "; put each on the other partner and",
        source: "mcq-ied-roles",
        quote: "Put each one on the other partner and the gap still closes",
      },
    ],
    bridge: {
      node: "u1-da",
      text: "The diene's HOMO met the dienophile's LUMO. Now swap who gives and who takes.",
      source: "u1-cd-da-orbitals",
      quote: "the diene's HOMO and the dienophile's LUMO",
    },
    placeholder: true,
  },
};
