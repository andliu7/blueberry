/**
 * The words on the Naming and acid-base page and its flashcards. Pure data.
 *
 * The STRUCTURES are not here. Every `key` below names a drawing in
 * guide/nmGuide.figures.ts, which scripts/guide_naming.py writes with RDKit:
 * RDKit finds each example's principal group from the priority table, and
 * OPSIN reads each name back as the drawing, before anything is written.
 * test/namingRef.test.ts checks that this file and the drawings agree.
 *
 * Numbers for pKa are NOT here either: they are read at run time from the
 * student's own pKa table (settings/pka.ts), so the page and the cards never
 * disagree with the Glossary. `{pka:site}` in a text is that number, and
 * `{diff:a-b}` is the pKa of site a minus site b.
 *
 * Priority order follows the usual IUPAC table (the one Clayden prints: acid, sulfonic acid, anhydride, ester, acid halide, amide, nitrile, aldehyde, ketone, alcohol, amine, alkene, alkyne): the
 * highest group present becomes the ending, every other group becomes a
 * prefix.
 */

export interface PriorityRow {
  /** The drawing: guide/nmGuide.figures.ts. */
  readonly key: string;
  /** The principal group id RDKit finds (scripts/guide_naming.py PRIORITY). */
  readonly group: string;
  readonly label: string;
  /** How it ends when it is the principal group. */
  readonly ending: string;
  /** How it is written when something higher on the table wins. */
  readonly prefix: string;
  /** One plain line about the example. */
  readonly note: string;
}

/** Highest priority first. */
export const PRIORITY: readonly PriorityRow[] = [
  { key: "nm-acid", group: "acid", label: "Carboxylic acid", ending: "-oic acid", prefix: "carboxy", note: "On a benzene ring the name is benzoic acid, and the ring carbon holding the acid is C1." },
  { key: "nm-sulfonic-acid", group: "sulfonic-acid", label: "Sulfonic acid", ending: "-sulfonic acid", prefix: "sulfo", note: "Sits just under the carboxylic acid on Clayden's table. In benzenesulfonic acid the S is bonded to the ring, so the ring is the root." },
  { key: "nm-anhydride", group: "anhydride", label: "Anhydride", ending: "-oic anhydride", prefix: "no everyday prefix", note: "Two acids joined through one O, so the name is the acid's name plus the word anhydride. Two benzoic acids minus a water give benzoic anhydride." },
  { key: "nm-ester", group: "ester", label: "Ester", ending: "-oate", prefix: "alkoxycarbonyl", note: "Two words: the alkyl group on the O first, then the acid's -oate." },
  { key: "nm-acyl-chloride", group: "acyl-chloride", label: "Acid chloride", ending: "-oyl chloride", prefix: "chlorocarbonyl", note: "-oic acid becomes -oyl chloride." },
  { key: "nm-amide", group: "amide", label: "Amide", ending: "-amide", prefix: "carbamoyl", note: "-oic acid becomes -amide." },
  { key: "nm-nitrile", group: "nitrile", label: "Nitrile", ending: "-nitrile", prefix: "cyano", note: "The nitrile carbon counts in the chain, so ethanenitrile has two carbons." },
  { key: "nm-aldehyde", group: "aldehyde", label: "Aldehyde", ending: "-al", prefix: "oxo (or formyl)", note: "An aldehyde is always at the end of a chain, so it never needs a number." },
  { key: "nm-ketone", group: "ketone", label: "Ketone", ending: "-one", prefix: "oxo", note: "Acetophenone is the common name. Its systematic name is 1-phenylethan-1-one." },
  { key: "nm-alcohol", group: "alcohol", label: "Alcohol", ending: "-ol", prefix: "hydroxy", note: "Phenol is the common name for hydroxybenzene, and it is the root for its own substituted rings." },
  { key: "nm-amine", group: "amine", label: "Amine", ending: "-amine", prefix: "amino", note: "Aniline is the common name for aminobenzene." },
  { key: "nm-alkene", group: "alkene", label: "Alkene", ending: "-ene", prefix: "alkenyl (ethenyl, ...)", note: "In a ring the double bond is C1 to C2, so cyclohexene needs no number." },
  { key: "nm-alkyne", group: "alkyne", label: "Alkyne", ending: "-yne", prefix: "alkynyl (ethynyl, ...)", note: "Same idea as an alkene, with -yne." },
];

/** Groups with no ending: they are only ever prefixes, written in alphabetical order. */
export const PREFIX_ONLY: readonly PriorityRow[] = [
  { key: "nm-halide", group: "prefix-only", label: "Halide", ending: "none", prefix: "fluoro, chloro, bromo, iodo", note: "A halogen is always a prefix, however many other groups there are." },
  { key: "nm-nitro", group: "prefix-only", label: "Nitro", ending: "none", prefix: "nitro", note: "Always a prefix." },
  { key: "nm-ether", group: "prefix-only", label: "Ether", ending: "none", prefix: "alkoxy (methoxy, ethoxy, ...)", note: "The O and its alkyl group together are one prefix. Methoxybenzene is also called anisole." },
];

export interface RuleStep {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** A drawing that shows the rule. */
  readonly key: string;
  /** Card: the question and the short answer. */
  readonly ask: string;
  readonly answer: string;
}

/** The rules in the order a student applies them to a structure. */
export const RULES: readonly RuleStep[] = [
  {
    id: "choose",
    title: "1. Pick the primary group",
    text: "Find every group on the molecule and take the one highest on the table. It becomes the ending. Every other group is named as a prefix. In 4-oxopentanoic acid the acid beats the ketone, so the ketone is written \"oxo\" in front.",
    key: "nm-oxo",
    ask: "A molecule has a ketone and a carboxylic acid. Which one gives the ending?",
    answer: "The acid, because it is higher on the table. The ketone becomes the prefix oxo, as in 4-oxopentanoic acid.",
  },
  {
    id: "root",
    title: "2. Find the root",
    text: "The root is the longest chain that holds the primary group, or the ring it sits on. Count its carbons: meth, eth, prop, but, pent, hex, hept, oct, non, dec. A ring adds cyclo-, and a benzene ring is its own root: benzoic acid, phenol, aniline.",
    key: "nm-keto-ol",
    ask: "How is the root chain chosen?",
    answer: "The longest chain that contains the primary group, or the ring it is on. Its carbon count gives meth, eth, prop, but, pent, hex.",
  },
  {
    id: "number",
    title: "3. Number from the end that gives the primary group the lowest number",
    text: "Primary group first, then double and triple bonds, then the prefixes. In a ring the primary group's carbon is C1. In 4-hydroxybutan-2-one the ketone gets 2, so the alcohol is 4, not 1. If that still leaves a tie, rules 10 and 11 break it.",
    key: "nm-ring-acid",
    ask: "Which gets the lowest number: the primary group, a double bond, or a prefix?",
    answer: "The primary group first, then double and triple bonds, then the prefixes. In a ring the primary group carbon is C1.",
  },
  {
    id: "an-en",
    title: "4. an, en or yn, and when the e is dropped",
    text: "The middle of the name says the bonds in the chain: -an- for all single bonds, -en- for a double bond, -yn- for a triple bond. The final e of -ane or -ene is dropped when the ending starts with a vowel (propanoic acid, butan-2-ol, but-3-en-2-ol) and kept when it starts with a consonant (propanenitrile, butane-1,4-diol).",
    key: "nm-diol",
    ask: "When is the final e of -ane or -ene dropped?",
    answer: "Before an ending that starts with a vowel: butan-2-ol, propanoic acid. It stays before a consonant: propanenitrile, butane-1,4-diol.",
  },
  {
    id: "keep-e",
    title: "Keep the e before a consonant",
    text: "Nitrile starts with n and diol starts with d, so the e stays. Acid, ol, one and al start with vowels, so it goes.",
    key: "nm-nitrile-e",
    ask: "Why is it propanenitrile but propanoic acid?",
    answer: "Nitrile starts with a consonant, so the e of propane stays. Oic starts with a vowel, so the e is dropped.",
  },
  {
    id: "locant",
    title: "5. Where the number goes",
    text: "Current IUPAC puts each number just before the part it describes: but-3-en-2-ol, propan-2-ol, cyclohexan-1-one. Older books and many exams put one number at the front instead: 2-propanol, 2-butanone. Both name the same molecule. A number that can only be 1, such as the double bond in cyclohexene, is left out.",
    key: "nm-en-ol",
    ask: "Where does the locant number go in but-3-en-2-ol, and what is the older way of writing it?",
    answer: "Just before the part it describes: -3-en and -2-ol. The older style puts one number at the front, like 2-butanol. Same molecule.",
  },
  {
    id: "prefixes",
    title: "6. Prefixes go before the root, in alphabetical order",
    text: "Each prefix gets its own number. Sort them alphabetically and ignore di, tri and tetra when sorting. In 2-bromo-4-chlorophenol bromo comes before chloro, even though the chlorine has the higher number.",
    key: "nm-alpha",
    ask: "In what order are prefixes written in a name?",
    answer: "Alphabetical, ignoring di, tri and tetra. Bromo comes before chloro: 2-bromo-4-chlorophenol.",
  },
  {
    id: "ring",
    title: "7. Rings with an ending",
    text: "With a ring that has an ending, the primary group is C1. Then count round the ring the way that gives the other groups the lowest numbers. Write the 1 in modern names (2-methylcyclohexan-1-one).",
    key: "nm-ring-ketone",
    ask: "On a ring with a ketone, which carbon is C1?",
    answer: "The ketone carbon. Then count the way that gives the other groups the lowest numbers: 2-methylcyclohexan-1-one.",
  },
  {
    id: "ring-suffix",
    title: "8. A group on a ring: -carboxylic acid, -carbaldehyde, -carbonitrile",
    text: "The carbon inside COOH, CHO or CN is not a ring carbon, so the group is hung on the ring and the ending gets longer: the ring name plus carboxylic acid, carbaldehyde or carbonitrile. The ring carbon holding the group is C1, and the 1 is not written. Benzene is the exception, with its own roots: benzoic acid, benzaldehyde, benzonitrile. The same group at the end of a chain is part of the chain: hexane gives hexanoic acid, but cyclohexane gives cyclohexanecarboxylic acid.",
    key: "nm-ring-cooh",
    ask: "What is a COOH on a cyclohexane ring called, and why is it not cyclohexanoic acid?",
    answer: "Cyclohexanecarboxylic acid. The acid carbon is not a ring carbon, so it is added as carboxylic acid. The same goes for -carbaldehyde (CHO) and -carbonitrile (CN). Benzene is the exception: benzoic acid, benzaldehyde, benzonitrile.",
  },
  {
    id: "ring-cho",
    title: "The aldehyde and the nitrile on a ring",
    text: "Cyclohexanecarbaldehyde has the CHO on the ring, and cyclohexanecarbonitrile has the CN on it. The e of cyclohexane stays, because carb starts with a consonant.",
    key: "nm-ring-cho",
    ask: "Name a cyclohexane ring with a CHO group, and then one with a CN group.",
    answer: "Cyclohexanecarbaldehyde and cyclohexanecarbonitrile. Both keep the e of cyclohexane because carb starts with a consonant.",
  },
  {
    id: "ring-cn",
    title: "Cyclohexanecarbonitrile",
    text: "Same ring, with a nitrile. The nitrile carbon is outside the ring, so the ring has six carbons and the name has carbonitrile on the end.",
    key: "nm-ring-cn",
    ask: "How many carbons are in the ring of cyclohexanecarbonitrile, and where is the nitrile carbon?",
    answer: "Six in the ring. The nitrile carbon is outside it, which is why the ending is carbonitrile.",
  },
  {
    id: "multiplier",
    title: "9. Two or more of the same group: di, tri, tetra, one number each",
    text: "Write one locant for every copy, in order, separated by commas, and put di, tri or tetra before the part. Propane-1,2,3-triol has three OH groups, and the e of propane stays because triol starts with a consonant. Commas go between numbers, hyphens between numbers and letters.",
    key: "nm-triol",
    ask: "How do you name three OH groups on propane, and how do you write the numbers?",
    answer: "Propane-1,2,3-triol. One number per OH, commas between numbers, a hyphen between numbers and letters, and tri before the ending.",
  },
  {
    id: "multiplier-prefix",
    title: "Multipliers on prefixes",
    text: "In 2,4,6-tribromophenol the OH is the primary group, so it is C1. The three bromines then get 2, 4 and 6, the lowest set possible. Tri is ignored when you put prefixes in alphabetical order.",
    key: "nm-tribromo",
    ask: "In 2,4,6-tribromophenol, which group is C1 and why are the bromines 2, 4, 6?",
    answer: "The OH is the primary group, so it is C1. Counting from there gives the three bromines the lowest set, 2,4,6.",
  },
  {
    id: "first-diff",
    title: "10. A tie: the first point of difference",
    text: "When the primary group does not settle the direction (or there is none), count both ways round and compare the two sets of numbers one position at a time. The first position where they differ decides, and the lower number wins. For three methyls on benzene the sets are 1,2,4 and 1,3,4. They differ first at the second number, 2 against 3, so the name is 1,2,4-trimethylbenzene.",
    key: "nm-first-diff",
    ask: "Two ways of numbering give 1,2,4 and 1,3,4. Which is right, and what is the rule?",
    answer: "1,2,4. Compare the sets one position at a time and take the first place they differ: the lower number wins. 1,2,4-trimethylbenzene.",
  },
  {
    id: "alpha-tie",
    title: "11. Still a tie: alphabetical order",
    text: "If both directions give the same set of numbers, the group that comes first alphabetically gets the lower number. In 1-bromo-3-chlorobenzene both directions give 1,3. Bromo comes before chloro, so the bromine is 1.",
    key: "nm-alpha-tie",
    ask: "Both directions give the locants 1,3 for a bromine and a chlorine on benzene. Which gets 1?",
    answer: "The bromine, because bromo comes first alphabetically: 1-bromo-3-chlorobenzene.",
  },
  {
    id: "n-amide",
    title: "12. Groups on the nitrogen of an amide or amine: N-",
    text: "A substituent on the N gets the locant N, not a number. N-methylbenzamide is benzamide with a methyl on the nitrogen. Two on the same N are written N,N-dimethyl.",
    key: "nm-n-amide",
    ask: "How do you show a methyl on the nitrogen of benzamide?",
    answer: "With the locant N: N-methylbenzamide. Two groups on the same N are N,N-dimethyl.",
  },
  {
    id: "n-aniline",
    title: "N,N on aniline",
    text: "Benzene is its own root, so the groups on the nitrogen of aniline are N-prefixes too. N,N-dimethylaniline has two methyls on the nitrogen and nothing on the ring.",
    key: "nm-n-aniline",
    ask: "What is aniline with two methyl groups on the nitrogen called?",
    answer: "N,N-dimethylaniline.",
  },
  {
    id: "n-amine",
    title: "A tertiary amine: the longest chain is the root",
    text: "Pick the longest carbon chain on the N as the root, and name the other groups as N-prefixes in alphabetical order, each with its own N. In N-ethyl-N-methylpropan-1-amine propane is the longest chain, and ethyl comes before methyl.",
    key: "nm-n-amine",
    ask: "How is CH3CH2CH2N(CH3)CH2CH3 named?",
    answer: "N-ethyl-N-methylpropan-1-amine. Propyl is the longest chain, so it is the root, and the two N groups are prefixes in alphabetical order.",
  },
];

/* ---------------------------------------------------------------- acid and base */

export interface AcidBaseTopic {
  readonly key: string;
  readonly title: string;
  /** Plain text with `{pka:site}` and `{diff:a-b}` slots, see the header. */
  readonly text: string;
  /** Card: the question. */
  readonly ask: string;
}

export const ACID_BASE: readonly AcidBaseTopic[] = [
  {
    key: "nm-ab-ammonium",
    title: "H+ is not ammonium",
    text: "H+ is a bare proton, the thing an acid hands over. In water it is really H3O+ (pKa {pka:hydronium}). Ammonium, NH4+, is ammonia that has already taken a proton, so it is an acid itself (pKa about {pka:ammonium}) and can hand the proton back. Same charge, different jobs.",
    ask: "Is H+ the same thing as ammonium, NH4+?",
  },
  {
    key: "nm-ab-amine",
    title: "An amine in acid becomes an ammonium",
    text: "The nitrogen lone pair takes the proton. The ion you get is the amine's conjugate acid, named with ammonium (methylammonium). Its pKa is about {pka:ammonium}, well above hydronium's {pka:hydronium}, so an acid pushes the amine across to the ammonium.",
    ask: "What does an amine become when you add acid, and why?",
  },
  {
    key: "nm-ab-acetate",
    title: "Why a carboxylic acid becomes acetate in base",
    text: "The O-H of a carboxylic acid has a pKa of about {pka:carboxylic_acid}. Hydroxide's partner is water, with a pKa of about {pka:water}. A proton moves toward the weaker acid, the one with the higher pKa, so it leaves the acid and lands on hydroxide. The equilibrium lies about 10^{diff:water-carboxylic_acid} to 1 toward acetate. The anion is steady because of resonance: the charge and the C=O swap places, so each O atom carries half of the charge. That sharing is the reason the acid sits at {pka:carboxylic_acid} and not near the alcohol at {pka:alcohol}, although both lose an O-H proton.",
    ask: "Why does acetic acid turn into acetate when you add hydroxide?",
  },
  {
    key: "nm-ab-benzoate",
    title: "The name changes: -oic acid becomes -oate",
    text: "Take the proton off benzoic acid and the name drops \"acid\" and ends -oate: benzoate. With sodium hydroxide you get sodium benzoate, with the cation named first.",
    ask: "What is benzoic acid called after hydroxide takes its proton?",
  },
  {
    key: "nm-ab-phenoxide",
    title: "Phenol versus an alcohol",
    text: "Phenol (pKa about {pka:phenol}) is a far stronger acid than an alcohol (about {pka:alcohol}), about 10^{diff:alcohol-phenol} times. Both lose an O-H proton, so the atom is the same. The difference is resonance: the phenoxide charge is not stuck on the oxygen, it delocalises into the ring, onto the ortho and para carbons. An alkoxide has nowhere to send its charge. Hydroxide's partner water sits at {pka:water}, so hydroxide can take the phenol proton and make phenoxide, while an alcohol, at water's level, stays almost entirely as the alcohol.",
    ask: "Why can hydroxide deprotonate phenol but hardly touch ethanol?",
  },
];

/* ---------------------------------------------------------------- why the numbers differ */

export const ARIO_INTRO =
  "The pKa list is not random. Four questions explain every number on it, and they let you predict the direction for an acid you have not seen. Look at the conjugate base, the A- left behind when HA loses its proton: the more stable A- is, the stronger the acid. Ask in this order, A, R, I, O. The first question where the two acids differ usually decides.";

export const ARIO_INTRO_ASK = "What four questions explain why one acid is stronger than another, and what do you compare?";

export const ARIO: readonly AcidBaseTopic[] = [
  {
    key: "nm-ario-atom",
    title: "A: Atom. Which atom holds the charge?",
    text: "Across a row, the more electronegative atom holds a negative charge better: O-H in an alcohol (pKa {pka:alcohol}), N-H in an amine ({pka:amine_nh}), C-H in an alkane ({pka:alkane_ch}). Down a column, the bigger atom spreads the charge over more volume, so a thiol S-H is more acidic than an alcohol O-H.",
    ask: "A: Atom. How does the atom that holds the negative charge change acidity?",
  },
  {
    key: "nm-ario-phenoxide",
    title: "R: Resonance. Can the charge spread out?",
    text: "If the conjugate base can delocalise its charge, it is more stable and the acid is stronger. Phenoxide puts part of the charge on the ortho and para carbons of the ring, which is why phenol ({pka:phenol}) beats an alcohol ({pka:alcohol}).",
    ask: "R: Resonance. Why is phenoxide more stable than ethoxide?",
  },
  {
    key: "nm-ario-carboxylate",
    title: "R: Resonance in a carboxylate",
    text: "Acetate has two O atoms that share one negative charge, so each carries half. That is the main reason a carboxylic acid ({pka:carboxylic_acid}) is so much stronger than an alcohol ({pka:alcohol}).",
    ask: "R: Resonance. Why is acetate more stable than an alkoxide?",
  },
  {
    key: "nm-ario-induction",
    title: "I: Induction. Do nearby atoms pull electrons?",
    text: "Electronegative atoms such as F, Cl and O pull electron density through the sigma bonds and steady the negative charge. More of them is stronger: trifluoroacetic acid beats chloroacetic acid, which beats acetic acid. Closer is stronger too, and the effect fades quickly with each bond between the atom and the acid group.",
    ask: "I: Induction. Why is chloroacetic acid a stronger acid than acetic acid, and what happens as the Cl moves away?",
  },
  {
    key: "nm-ario-orbital",
    title: "O: Orbital. How much s character?",
    text: "When the charge sits on carbon, the orbital matters. An s orbital is closer to the nucleus than a p orbital, so more s character holds the lone pair better: sp (50% s) beats sp2 (33%) beats sp3 (25%). That is why a terminal alkyne C-H ({pka:terminal_alkyne_ch}) is far more acidic than an alkene or aromatic C-H ({pka:vinylic_or_aromatic_ch}), which beats an alkane C-H ({pka:alkane_ch}).",
    ask: "O: Orbital. Why is an alkyne C-H more acidic than an alkane C-H?",
  },
  {
    key: "nm-ario-predict",
    title: "Try it on an acid you have not seen",
    text: "Which is stronger, phenol or 4-nitrophenol? A: both lose an O-H, a tie. R: the nitro group is para, so the phenoxide charge can also move onto the nitro oxygens, one more place to sit. I: the nitro group pulls electrons too. Both point the same way, so 4-nitrophenol is the stronger acid.",
    ask: "Which is the stronger acid, phenol or 4-nitrophenol, and which ARIO factors say so?",
  },
];

export const ACID_BASE_RULE =
  "Compare the pKa of the acid you have with the pKa of the acid that would form. The proton moves toward the higher pKa, the weaker acid. Each pKa unit is a factor of ten.";

export const ACID_BASE_RULE_ASK = "A proton can go one of two ways. How do you tell which?";
