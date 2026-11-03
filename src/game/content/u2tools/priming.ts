/**
 * The priming preview for the Unit 2 lessons that open the unit (29 Oct 2026, report gap 6:
 * "Unit 2 opens straight on a classify question about benzene before benzene has been
 * introduced"). Same contract as content/u1/priming.ts: a big question, one real guess from
 * the lesson's own pool, a concept map of three to five ideas, and a bridge to the lesson
 * right before on the path. NO NEW CHEMISTRY lives here: every idea and bridge names a
 * source entry and copies a quote from its explanation or its correct option. Drafts.
 *
 * The first lesson (induction) has no lesson before it in Unit 2, so its bridge points back
 * to Units 0 and 1 in words and names no node. Hückel's bridge is resonance, so benzene is
 * met as "six equal bonds" before the four tests ask for a verdict on a ring.
 */
import type { LessonPriming } from "../u1/priming";

export const U2_PRIMING: Readonly<Record<string, LessonPriming>> = {
  "u2-induction": {
    bigIdea: "How can an atom change an acid's strength from two bonds away?",
    guess: "u2t-ind-distance",
    ideas: [
      {
        label: "Electronegative atoms pull",
        source: "u2t-ind-meet-bond",
        quote: "A more electronegative atom holds the shared pair closer",
      },
      {
        label: "Passed along sigma bonds",
        via: ", and that pull is",
        source: "u2t-ind-meet-bond",
        quote: "Induction is that pull passed along a chain of sigma bonds",
      },
      {
        label: "Fades with distance",
        via: ", which",
        source: "u2t-ind-distance",
        quote: "Induction fades with each bond it passes through",
      },
      {
        label: "Adds up with number",
        via: ", but",
        source: "u2t-ind-count",
        quote: "each extra electronegative atom adds to the pull",
      },
    ],
    bridge: {
      node: null,
      title: "From Units 0 and 1",
      text: "Unit 0 gave you charge and resonance. This lesson adds the other way a charge is steadied, and Unit 2 uses both.",
    },
    placeholder: true,
  },
  "u2-keq-pka": {
    bigIdea: "Given two pKa values, which way does the proton go?",
    guess: "u2t-keq-ethoxide-phenol",
    ideas: [
      {
        label: "Higher pKa, weaker acid",
        source: "u2t-keq-meet-weaker",
        quote: "A higher pKa means a weaker acid",
      },
      {
        label: "Weaker acid holds its proton",
        via: ", and",
        source: "u2t-keq-meet-weaker",
        quote: "a weaker acid holds its proton more tightly",
      },
      {
        label: "Rests on the weaker acid",
        via: ", so the equilibrium",
        source: "u2t-keq-ethoxide-phenol",
        quote: "The acid formed is the weaker one",
      },
      {
        label: "The gap says how far",
        via: ", and",
        source: "u2t-keq-size-phenol",
        quote: "Keq is ten to the power of the pKa gap",
      },
      {
        label: "Check the acid formed",
        via: ", so always",
        source: "u2t-keq-alkyne-base",
        quote: "A base wins when its conjugate acid is weaker than the acid it meets",
      },
    ],
    bridge: {
      node: "u2-induction",
      text: "You saw that a nearby Cl makes an acid stronger. Here the strength becomes a number you can compare.",
      source: "u2t-ind-distance",
      quote: "The closer the Cl is to the acid group, the stronger the acid",
    },
    placeholder: true,
  },
  "u2-energy": {
    bigIdea: "When a step can run backwards, where does the reaction end up?",
    guess: "u2e-first-door",
    ideas: [
      {
        label: "Some product turns back",
        source: "u2e-meet-window",
        quote: "the reverse step still happens",
      },
      {
        label: "Reversible steps shuffle",
        via: ", so",
        source: "u2e-first-door",
        quote: "Reversible steps run back and forth",
      },
      {
        label: "A dead end costs time",
        via: ", and one can lead to",
        source: "u2e-meet-deadend",
        quote: "A reversible step can lead to a dead end",
      },
      {
        label: "Then a one way door",
        via: ", until an irreversible step, after which",
        source: "u2e-first-door",
        quote: "the reaction follows that path down the energy graph",
      },
      {
        label: "Hump or well decides",
        via: ", and when two products compete,",
        source: "u2e-kinetic-cold",
        quote: "Cold and irreversible: the product over the lower hump (kinetic) wins.",
      },
    ],
    bridge: {
      node: "u2-keq-pka",
      text: "You turned a pKa gap into a Keq. Here the same Keq is read off a drawing, and it says which steps can reverse.",
      source: "u2t-keq-size-phenol",
      quote: "Keq is ten to the power of the pKa gap",
    },
    placeholder: true,
  },
  "u2-resonance": {
    bigIdea: "What does it mean for a ring's electrons to be shared?",
    guess: "u2t-res-cp-acid",
    ideas: [
      {
        label: "Forms differ in drawing only",
        source: "u2t-res-meet-lengths",
        quote: "Resonance forms differ only in where the pi electrons are drawn",
      },
      {
        label: "One blend",
        via: ", so the real molecule is",
        source: "u2t-res-meet-lengths",
        quote: "The real molecule is one blend",
      },
      {
        label: "Charge runs round a loop",
        via: ", and a charge",
        source: "u2t-res-meet-cp",
        quote: "In a ring of five p orbitals it runs all the way round",
      },
      {
        label: "Steadier base, stronger acid",
        via: ", which makes",
        source: "u2t-res-cp-acid",
        quote: "Acidity follows the conjugate base",
      },
    ],
    bridge: {
      node: "u2-energy",
      text: "A deep well is where material collects. Now ask why a conjugate base sits so low, and resonance is the first answer.",
      source: "u2e-first-door",
      quote: "Reversible steps run back and forth",
    },
    placeholder: true,
  },
  "u2-huckel": {
    bigIdea: "How can you tell, ring by ring, whether the sharing helps or hurts?",
    guess: "u2-huckel-cbd",
    ideas: [
      {
        label: "Four tests, in order",
        source: "u2-huckel-meet-gate",
        quote: "The four tests run in order: cyclic, a p orbital on every ring atom, planar, then 4n + 2 pi electrons.",
      },
      {
        label: "One sp3 carbon breaks the loop",
        via: ", and",
        source: "u2-huckel-meet-gate",
        quote: "One sp3 carbon breaks the loop, so the ring is nonaromatic.",
      },
      {
        label: "4n is antiaromatic",
        via: ", while a flat ring with",
        source: "u2-huckel-cbd",
        quote: "A flat ring with 4n pi electrons is antiaromatic.",
      },
    ],
    bridge: {
      node: "u2-resonance",
      text: "You met benzene as six equal bonds. These tests say when that sharing is a gain and when it is a penalty.",
      source: "u2t-res-meet-lengths",
      quote: "all six benzene C-C bonds are equal",
    },
    placeholder: true,
  },
  "u2-ewg-edg": {
    bigIdea: "How does a group on a ring decide how eager the ring is?",
    guess: "u2t-ewg-cf3",
    ideas: [
      {
        label: "Lone pair donates",
        source: "u2t-ewg-meet-anisole",
        quote: "A lone pair next to a ring can donate into it by resonance",
      },
      {
        label: "A pi acceptor withdraws",
        via: ", while a group that",
        source: "u2t-ewg-meet-nitro",
        quote: "A group that pulls through the pi system withdraws by resonance",
      },
      {
        label: "sp3 group, induction only",
        via: ", and a group on",
        source: "u2t-ewg-cf3",
        quote: "A group on an sp3 carbon cannot reach the pi system, so it works by induction alone",
      },
      {
        label: "Donor speeds, withdrawer slows",
        via: ", so",
        source: "u2t-ewg-eas",
        quote: "A donor raises the ring's density and speeds the reaction",
      },
    ],
    bridge: {
      node: "u2-hetero",
      text: "You tracked where a heteroatom's lone pair sits. That is exactly the question for a donor group on a ring.",
      source: "u2-het-match",
      quote: "an atom already in a ring pi bond keeps its pair in the plane",
    },
    placeholder: true,
  },
  "u2-charged": {
    bigIdea: "Can a ring that carries a charge still be aromatic?",
    guess: "u2-chg-tropylium",
    ideas: [
      { label: "A lone pair joins the ring", source: "u2-chg-cp-anion", quote: "The anion's lone pair joins the ring: 6 pi electrons, aromatic." },
      { label: "Empty orbital counts zero", via: ", while an", source: "u2-chg-meet-cation", quote: "An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken." },
      { label: "Ring class ranks stability", via: ", and", source: "u2-chg-ladder-anion", quote: "Ring class ranks these anions: aromatic, then nonaromatic, then antiaromatic." },
      { label: "Aromatic base, stronger acid", via: ", which makes", source: "u2-chg-acid-pick", quote: "the more stable the base, the stronger the acid" },
    ],
    bridge: { node: "u2-huckel", text: "You counted pi electrons one carbon at a time. Here a charged carbon joins the count.", source: "u2-huckel-meet-count", quote: "Each carbon gives one electron from its p orbital." },
    placeholder: true,
  },
  "u2-annulene": {
    bigIdea: "If a ring's count says antiaromatic, what does the real ring do about it?",
    guess: "u2-ann-18",
    ideas: [
      { label: "Pi count equals ring size", source: "u2-ann-meet-size", quote: "its pi count is its ring size" },
      { label: "Flat 4n costs energy", via: ", but", source: "u2-ann-meet-flat", quote: "Flat, COT would be antiaromatic, which costs energy." },
      { label: "So it bends into a tub", via: ", so it", source: "u2-ann-cot", quote: "so it bends into a tub" },
      { label: "Crowding can twist a ring", via: ", and a crowded ring", source: "u2-ann-10", quote: "cannot lie flat because of its inner H atoms" },
    ],
    bridge: { node: "u2-charged", text: "Charged rings passed or failed on the count alone. Now the ring also has to be able to lie flat.", source: "u2-chg-tropylium", quote: "Tropylium has 6 pi electrons over seven p orbitals: aromatic" },
    placeholder: true,
  },
  "u2-hetero": {
    bigIdea: "Which heteroatom lone pairs join the ring, and which stay out?",
    guess: "u2-het-pyrrole-count",
    ideas: [
      { label: "Does the N have a ring double bond", source: "u2-het-meet-contrast", quote: "does the N already have a ring double bond" },
      { label: "Yes: the pair stays in the plane", via: ", and if it does", source: "u2-het-pyridine-pair", quote: "its pair sits in an sp2 orbital in the plane" },
      { label: "No: the pair joins the ring", via: ", but if not", source: "u2-het-pyrrole-pair", quote: "Pyrrole's N lone pair is in the p orbital and is counted" },
      { label: "A pair outside the ring is a base", via: ", so", source: "u2-het-protonate", quote: "Pyridine is a base because its pair is outside the pi system" },
    ],
    bridge: { node: "u2-annulene", text: "A ring that can bend will. Now ask which atoms in a ring give their lone pair to it.", source: "u2-ann-cot", quote: "so it bends into a tub" },
    placeholder: true,
  },
  "u2-nmr": {
    bigIdea: "What can a spectrum tell you about a ring's electrons?",
    guess: "u2-nmr-both-ends",
    ideas: [
      { label: "Ring current adds outside", source: "u2-nmr-meet-downfield", quote: "the ring current adds to the field outside the ring" },
      { label: "It shields the inside", via: ", but it", source: "u2-nmr-meet-inner", quote: "deshields H outside an aromatic ring and shields H inside it" },
      { label: "Inner H fall below 0 ppm", via: ", so", source: "u2-nmr-shielded", quote: "[18]annulene's inner H sit below 0 ppm" },
      { label: "A tub has no ring current", via: ", while", source: "u2-nmr-cot", quote: "The tub has no ring current" },
    ],
    bridge: { node: "u2-ewg-edg", text: "Donors and withdrawers changed how electron rich a ring is. A ring current is a different kind of electron effect.", source: "u2t-ewg-eas", quote: "An electrophile wants electrons." },
    placeholder: true,
  },
};

/**
 * Unit 3's first two lessons (29 Oct 2026), previewed on the same contract so the step from Unit 2
 * into the mechanism is not cold: the first lesson bridges back in words to the donor and withdrawer
 * review, and the directing lesson bridges to the arenium lesson right before it. Drafts.
 */
export const U3_PRIMING: Readonly<Record<string, LessonPriming>> = {
  "u3-arenium": {
    bigIdea: "What does an electrophile do to a ring that is worth keeping?",
    guess: "u3-aren-count",
    ideas: [
      {
        label: "Substitution keeps the ring",
        source: "u3-aren-which",
        quote: "Substitution keeps the aromatic ring; addition would destroy it.",
      },
      {
        label: "Attack makes one sp3 carbon",
        via: ", because",
        source: "u3-aren-sp3",
        quote: "The attacked carbon goes sp3.",
      },
      {
        label: "The charge is shared",
        via: ", and the cation",
        source: "u3-aren-count",
        quote: "the + walks ortho, para, ortho around the five sp2 carbons",
      },
      {
        label: "A base restores the ring",
        via: ", then",
        source: "u3-aren-rearom",
        quote: "A base takes the H+ off the sp3 carbon and the ring is aromatic again.",
      },
    ],
    bridge: {
      node: null,
      title: "From Unit 2",
      text: "You ranked donors and withdrawers by how they feed or drain a ring. Here an electrophile meets that ring, and the cation it makes is a resonance problem.",
    },
    placeholder: true,
  },
  "u3-directing": {
    bigIdea: "Where does a second group go, and why does the first one decide it?",
    guess: "u3-dir-compete",
    ideas: [
      {
        label: "Donors send o/p",
        source: "u3-dir-phenol",
        quote: "OH is an o/p director and a strong activator",
      },
      {
        label: "Withdrawers send meta",
        via: ", while",
        source: "u3-dir-cf3",
        quote: "CF3 is a meta director and a deactivator, by induction alone.",
      },
      {
        label: "Halogens split the job",
        via: ", and",
        source: "u3-dir-bromo",
        quote: "induction sets the rate, the lone pair sets the position",
      },
      {
        label: "The stronger activator wins",
        via: ", so when groups disagree",
        source: "u3-dir-compete",
        quote: "the stronger activator decides",
      },
    ],
    bridge: {
      node: "u3-arenium",
      text: "The sigma complex is a cation, and more resonance forms make it steadier. That is the whole reason a group directs.",
      source: "u3-aren-tert",
      quote: "Meta attack never does, which is why CH3 directs ortho and para.",
    },
    placeholder: true,
  },
  "u3-halo": {
    bigIdea: "What happens when the arenium mechanism meets its first real electrophile?",
    guess: "u3-halo-anisole",
    ideas: [
      { label: "Substitution keeps the ring", source: "u3-halo-meet", quote: "one C-H becomes C-Br and the ring stays aromatic" },
      { label: "A matching Lewis acid", via: ", with", source: "u3-halo-cl", quote: "The Lewis acid carries the same halogen so it cannot scramble the product." },
      { label: "Directors still steer", via: ", and", source: "u3-halo-anisole", quote: "OMe is an o/p director" },
      { label: "Side chains need radicals", via: ", while", source: "u3-halo-vs-nbs", quote: "The benzylic C-H needs radical conditions instead." },
    ],
    bridge: { node: "u3-directing", text: "Directing effects tell you where an electrophile goes. Halogenation is the simplest electrophile to test that on.", source: "u3-dir-bromo", quote: "induction sets the rate, the lone pair sets the position" },
    placeholder: true,
  },
  "u3-nitration": {
    bigIdea: "Why is nitration the reaction you place on purpose in a synthesis?",
    guess: "u3-nit-chloro",
    ideas: [
      { label: "NO2 replaces a ring H", source: "u3-nit-meet", quote: "Nitration puts NO2 on the ring" },
      { label: "The electrophile is NO2+", via: ", using", source: "u3-nit-electrophile", quote: "The nitronium ion, NO2+, is the electrophile." },
      { label: "It stops at one", via: ", and", source: "u3-nit-stop", quote: "so the mononitro product is less reactive than benzene and the reaction stops at one" },
      { label: "The next group goes meta", via: ", sending", source: "u3-nit-second", quote: "The first nitro group directs the second one meta" },
    ],
    bridge: { node: "u3-halo", text: "Halogenation needed a Lewis acid that matched the halogen. Nitration makes its electrophile with acid instead.", source: "u3-halo-cl", quote: "The Lewis acid carries the same halogen" },
    placeholder: true,
  },
  "u3-sulfo": {
    bigIdea: "Which ring reaction can be undone, and why would you want that?",
    guess: "u3-sul-ptsa",
    ideas: [
      { label: "SO3H joins the ring", source: "u3-sul-meet", quote: "Sulfonation puts SO3H on the ring" },
      { label: "It is reversible", via: ", and", source: "u3-sul-reverse", quote: "Sulfonation is reversible." },
      { label: "It is a meta director", via: ", but while on the ring it is", source: "u3-sul-directs", quote: "SO3H is a meta director and a deactivator" },
    ],
    bridge: { node: "u3-nitration", text: "Nitration stopped after one group and could not be undone. Sulfonation differs on both counts.", source: "u3-nit-stop", quote: "A nitro group is a deactivator" },
    placeholder: true,
  },
  "u3-fc-alkyl": {
    bigIdea: "Why is the obvious way to add a carbon chain to a ring a trap?",
    guess: "u3-alk-poly",
    ideas: [
      { label: "The ring bonds to the cation", source: "u3-alk-meet", quote: "and the ring bonds to that carbon" },
      { label: "A primary cation shifts", via: ", but a", source: "u3-alk-propyl", quote: "The primary cation takes a hydride from the next carbon and becomes secondary." },
      { label: "The product alkylates again", via: ", and", source: "u3-alk-poly", quote: "Each alkyl group activates the ring" },
      { label: "A strong withdrawer stops it", via: ", and nothing happens on a ring with", source: "u3-alk-fails", quote: "Friedel-Crafts fails on rings carrying a strong withdrawer such as NO2." },
    ],
    bridge: { node: "u3-sulfo", text: "Sulfonation could be undone. Alkylation brings a different problem: the electrophile can move.", source: "u3-sul-reverse", quote: "Sulfonation is reversible." },
    placeholder: true,
  },
  "u3-fc-acyl": {
    bigIdea: "How do you put a straight carbon chain on a ring, once?",
    guess: "u3-acyl-norearr",
    ideas: [
      { label: "Acylation gives an aryl ketone", source: "u3-acyl-meet", quote: "gives acetophenone, an aryl ketone" },
      { label: "The acylium ion cannot move", via: ", through", source: "u3-acyl-ion", quote: "Its resonance form with C triple bond O+ is why it never rearranges." },
      { label: "The chain arrives straight", via: ", so", source: "u3-acyl-norearr", quote: "Acylation delivers the chain unrearranged" },
      { label: "It stops at one", via: ", and", source: "u3-acyl-once", quote: "acylation stops at one" },
    ],
    bridge: { node: "u3-fc-alkyl", text: "Alkylation rearranged and kept going. Acylation is the same idea with the electrophile fixed.", source: "u3-alk-poly", quote: "Acylation does not have this problem." },
    placeholder: true,
  },
  "u3-blocking": {
    bigIdea: "How do you get only the ortho product from a group that gives both?",
    guess: "u3-blk-anisole",
    ideas: [
      { label: "An o/p director gives both", source: "u3-blk-without", quote: "CH3 directs both ortho and para, so both form." },
      { label: "A blocker must come off", via: ", so use one that", source: "u3-blk-why-so3h", quote: "A blocking group must come off at the end." },
      { label: "Sulfonation reverses", via: ", which sulfonation does because", source: "u3-blk-remove", quote: "Hot dilute acid reverses sulfonation" },
      { label: "The director does the rest", via: ", and then", source: "u3-blk-step2", quote: "With para blocked, CH3 steers bromine ortho" },
    ],
    bridge: { node: "u3-fc-acyl", text: "Acylation put a ketone on in one clean step. Blocking is about getting one position when a group gives two.", source: "u3-acyl-once", quote: "The aryl ketone is a deactivated ring" },
    placeholder: true,
  },
  "u3-nitro-red": {
    bigIdea: "What does the ring become when its nitro group is reduced?",
    guess: "u3-nred-acid",
    ideas: [
      { label: "Each NO2 becomes NH2", source: "u3-nred-mnt", quote: "Nitro reduction turns each ArNO2 into ArNH2" },
      { label: "The ring flips to an activator", via: ", which", source: "u3-nred-flip", quote: "flips the ring from a meta deactivator to an o/p activator" },
      { label: "Oxygen out, hydrogen in", via: ", and the change is", source: "u3-nred-formula", quote: "oxygen out, hydrogen in, a reduction" },
    ],
    bridge: { node: "u3-blocking", text: "The blocker came off with acid. This time the group stays and changes what it is.", source: "u3-blk-step3", quote: "Hot dilute acid takes off only the SO3H." },
    placeholder: true,
  },
  "u3-c-to-ch2": {
    bigIdea: "How do you get a straight alkyl chain without the rearrangement?",
    guess: "u3-ch2-butyro",
    ideas: [
      { label: "C=O becomes CH2", source: "u3-ch2-meet", quote: "turns the aryl ketone's C=O into CH2" },
      { label: "Acylate first", via: ", after you", source: "u3-ch2-why", quote: "the acyl group goes on straight" },
      { label: "The director flips", via: ", and", source: "u3-ch2-flip", quote: "acyl (meta, deactivating) becomes alkyl (o/p, activating)" },
      { label: "Either reagent ends at CH2", via: ", and", source: "u3-ch2-wk", quote: "Wolff-Kishner also ends at CH2" },
    ],
    bridge: { node: "u3-nitro-red", text: "Reducing a nitro group flipped the director. Reducing a ketone flips it again.", source: "u3-nred-flip", quote: "That flip is a sequencing tool." },
    placeholder: true,
  },
  "u3-benzylic-ox": {
    bigIdea: "Which side chains survive an oxidant, and which are cut back?",
    guess: "u3-box-pxylene",
    ideas: [
      { label: "A benzylic carbon goes to COOH", source: "u3-box-meet", quote: "KMnO4 oxidises the benzylic carbon all the way to COOH." },
      { label: "The chain is cut back", via: ", and", source: "u3-box-ethyl", quote: "The whole chain is cut back to one carbon" },
      { label: "No benzylic H, no reaction", via: ", but", source: "u3-box-tbu-alone", quote: "No benzylic H, no reaction." },
      { label: "The director flips", via: ", and", source: "u3-box-flip", quote: "Oxidising CH3 to COOH flips o/p to meta." },
    ],
    bridge: { node: "u3-c-to-ch2", text: "Reducing a ketone flipped the director. Oxidising a methyl does the same in the other direction.", source: "u3-ch2-flip", quote: "Order matters in a synthesis." },
    placeholder: true,
  },
  "u3-sequencing": {
    bigIdea: "When there are several steps, which one goes first?",
    guess: "u3-seq-pbr",
    ideas: [
      { label: "Put the right director on first", source: "u3-seq-mbr", quote: "Put the group that directs where you need on first." },
      { label: "Nitrate while it points the right way", via: ", or", source: "u3-seq-pnba", quote: "Nitrate while the group on the ring points where you need it." },
      { label: "Friedel-Crafts early", via: ", and", source: "u3-seq-acyl-first", quote: "Do the Friedel-Crafts step before any strong withdrawer goes on." },
      { label: "Reduce last", via: ", then", source: "u3-seq-mbra", quote: "reducing NO2 to NH2 last" },
    ],
    bridge: { node: "u3-benzylic-ox", text: "Oxidation flipped a director to meta. Sequencing is deciding when to use each flip.", source: "u3-box-flip", quote: "Use it to reach meta patterns that an alkyl group cannot give." },
    placeholder: true,
  },
  "u3-benzylic-br": {
    bigIdea: "Why does a side chain brominate where the ring does not?",
    guess: "u3-bbr-propyl",
    ideas: [
      { label: "The ring stabilises the radical", source: "u3-bbr-meet", quote: "the sp3 carbon bonded to the ring, whose radical the ring stabilises" },
      { label: "It needs a benzylic H", via: ", so", source: "u3-bbr-tbu", quote: "No benzylic H, no benzylic bromination." },
      { label: "Count the benzylic H", via: ", and", source: "u3-bbr-count", quote: "Only the CH2 bonded to the ring is benzylic" },
    ],
    bridge: { node: "u3-halo", text: "Ring bromination used a Lewis acid. This one uses radical conditions on the side chain.", source: "u3-halo-vs-nbs", quote: "The benzylic C-H needs radical conditions instead." },
    placeholder: true,
  },
  "u3-birch": {
    bigIdea: "What does a dissolving metal do to a ring?",
    guess: "u3-bir-acid",
    ideas: [
      { label: "Two para carbons gain H", source: "u3-bir-meet", quote: "Birch reduction adds H to two para carbons" },
      { label: "The product is not aromatic", via: ", leaving", source: "u3-bir-conj", quote: "The Birch product has isolated C=C bonds and no aromaticity." },
      { label: "A donor's carbon stays sp2", via: ", and", source: "u3-bir-anisole", quote: "OMe is a donor, so its carbon stays on a C=C." },
      { label: "A withdrawer's carbon goes sp3", via: ", while", source: "u3-bir-acid", quote: "COOH is a withdrawer, so its carbon goes sp3" },
    ],
    bridge: { node: "u3-directing", text: "Donor and withdrawer classes decided where substitution went. They decide where the hydrogens go here too.", source: "u3-dir-phenol", quote: "OH is an o/p director and a strong activator" },
    placeholder: true,
  },
};
