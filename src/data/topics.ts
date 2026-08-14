/**
 * The course, as data.
 *
 * Until now "topics" existed twice and properly nowhere: as a hardcoded array
 * inside `LessonsPage`, and as the names of flashcard decks. Neither could be
 * edited without a deploy, and neither knew about the other. This is the shape
 * everything else writes into — the lessons page reads it, the syllabus import
 * tags dates against it, and the TA's edits merge over it.
 *
 * Built-in content is the floor, not the truth. `applyOverrides` merges staff
 * edits on top by id, the same way `useDecks` merges published decks over the
 * ones that ship in the bundle. That means a TA can fix a summary without
 * touching this file, and nothing they do can delete the fallback underneath.
 */

export interface Reaction {
  id: string;
  name: string;
  topicId: string;
  /** What it does, in one line. */
  summary: string;
  /** The part students actually ask about: why this reagent and not another. */
  whyThisReagent?: string;
  /** Set by staff, not shipped. */
  videoUrl?: string;
  /** Links to an existing flashcard deck, by the id `findDeck` uses. */
  deckId?: string;
}

export interface Topic {
  id: string;
  name: string;
  unitId: string;
  blurb: string;
  reactionIds: string[];
}

export interface Unit {
  id: string;
  name: string;
  /** One line on what ties the topics together. */
  blurb: string;
  topicIds: string[];
}

/**
 * Organic Chemistry II.
 *
 * Two units, in the order Andrew laid them out: the Diels–Alder arc first,
 * then the wider theory and the carbonyl block underneath it. HOMO/LUMO sits
 * at the top of the second unit rather than the first on purpose — it is the
 * explanation for what the first unit just did, and it lands better as "here
 * is why that worked" than as theory before the reaction.
 */
export const UNITS: Unit[] = [
  {
    id: "pericyclic",
    name: "π systems and the Diels–Alder",
    blurb: "From a single double bond to the reaction that uses four of them at once.",
    topicIds: ["alkenes", "dienes", "diels-alder"],
  },
  {
    id: "structure",
    name: "Why those reactions work",
    blurb: "The orbital picture underneath, and the two big families it explains.",
    topicIds: ["homo-lumo", "aromaticity", "carbonyls"],
  },
];

export const TOPICS: Topic[] = [
  {
    id: "alkenes",
    // Named for both readings: the functional group and the bond that makes it
    // reactive. Course sections call this one or the other.
    name: "Alkenes and π bonds",
    unitId: "pericyclic",
    blurb:
      "A π bond is electron density sitting above and below the σ framework, loosely held and pointing outwards. Everything alkenes do follows from that.",
    reactionIds: ["electrophilic-addition", "hydroboration", "halogenation", "epoxidation"],
  },
  {
    id: "dienes",
    name: "Dienes and conjugation",
    unitId: "pericyclic",
    blurb:
      "Two π bonds one single bond apart stop behaving like two π bonds. The delocalised intermediate is what makes 1,4-addition possible at all.",
    reactionIds: ["conjugate-addition", "kinetic-thermodynamic"],
  },
  {
    id: "diels-alder",
    name: "Dienophiles and the Diels–Alder",
    unitId: "pericyclic",
    blurb:
      "A diene and a dienophile make two σ bonds and a ring in one step, with no intermediate. Stereochemistry is set by the geometry of the approach.",
    reactionIds: ["diels-alder", "endo-rule", "s-cis"],
  },
  {
    id: "homo-lumo",
    name: "HOMO and LUMO",
    unitId: "structure",
    blurb:
      "Reactions happen where a filled orbital meets an empty one of similar energy. Get the frontier orbitals right and the electronics of the last unit stop being a rule to memorise.",
    reactionIds: ["frontier-orbitals", "electron-demand"],
  },
  {
    id: "aromaticity",
    name: "Aromaticity",
    unitId: "structure",
    blurb:
      "Cyclic, planar, fully conjugated, and 4n+2 π electrons. All four, or it is not aromatic — and the exceptions are where the exam questions live.",
    reactionIds: ["huckel", "electrophilic-aromatic-substitution"],
  },
  {
    id: "carbonyls",
    name: "Carbonyls",
    unitId: "structure",
    blurb:
      "A polarised double bond with a hungry carbon. Addition, substitution and enolate chemistry are three answers to the same electrophile.",
    reactionIds: ["nucleophilic-addition", "acyl-substitution", "enolates"],
  },
];

export const REACTIONS: Reaction[] = [
  {
    id: "electrophilic-addition",
    name: "Electrophilic addition",
    topicId: "alkenes",
    summary: "The π bond attacks an electrophile; a nucleophile catches the carbocation that forms.",
    whyThisReagent:
      "Markovnikov's rule is not a rule so much as a consequence — the electrophile adds where it leaves the more stable carbocation.",
  },
  {
    id: "hydroboration",
    name: "Hydroboration–oxidation",
    topicId: "alkenes",
    summary: "Adds water across the double bond with anti-Markovnikov regiochemistry, syn.",
    whyThisReagent:
      "BH₃ over acid-catalysed hydration because there is no carbocation: boron and hydrogen add in one concerted step, so nothing rearranges and the OH lands on the less substituted carbon.",
  },
  {
    id: "halogenation",
    name: "Halogenation",
    topicId: "alkenes",
    summary: "Br₂ or Cl₂ adds across the double bond, anti, through a cyclic halonium ion.",
    whyThisReagent:
      "The halonium bridge is the whole explanation for the anti stereochemistry — the nucleophile can only reach the face the bridge is not on.",
  },
  {
    id: "epoxidation",
    name: "Epoxidation",
    topicId: "alkenes",
    summary: "A peroxyacid delivers one oxygen to the π bond, giving a three-membered ring.",
    whyThisReagent:
      "mCPBA transfers oxygen in one step and keeps the alkene's stereochemistry, which acid-mediated routes do not.",
  },
  {
    id: "conjugate-addition",
    name: "1,2- versus 1,4-addition",
    topicId: "dienes",
    summary:
      "Adding to a conjugated diene gives two products, because the allylic cation is shared across three carbons.",
  },
  {
    id: "kinetic-thermodynamic",
    name: "Kinetic and thermodynamic control",
    topicId: "dienes",
    summary:
      "Cold gives the product that forms fastest; warm and reversible gives the one that is most stable.",
    whyThisReagent:
      "Temperature is the variable being examined here, not the reagent. Low temperature traps the 1,2 product; higher temperature lets it revert and settle on the more substituted 1,4 alkene.",
  },
  {
    id: "diels-alder",
    name: "The Diels–Alder reaction",
    topicId: "diels-alder",
    summary:
      "A [4+2] cycloaddition: four π electrons from the diene, two from the dienophile, one concerted step, one new ring.",
    whyThisReagent:
      "An electron-withdrawing group on the dienophile lowers its LUMO, closing the gap to the diene's HOMO. That is the whole reason a plain alkene is a poor dienophile.",
  },
  {
    id: "endo-rule",
    name: "The endo rule",
    topicId: "diels-alder",
    summary:
      "The substituent tucks under the forming ring rather than pointing away, giving the endo product under kinetic control.",
  },
  {
    id: "s-cis",
    name: "The s-cis requirement",
    topicId: "diels-alder",
    summary:
      "The diene has to reach s-cis for both ends to touch the dienophile. A diene locked s-trans simply does not react.",
  },
  {
    id: "frontier-orbitals",
    name: "Frontier orbitals",
    topicId: "homo-lumo",
    summary:
      "The highest filled orbital on one partner and the lowest empty one on the other. The smaller the gap, the faster the reaction.",
  },
  {
    id: "electron-demand",
    name: "Normal and inverse demand",
    topicId: "homo-lumo",
    summary:
      "Normally the diene donates and the dienophile accepts. Flip the substituents and the roles flip with them.",
    whyThisReagent:
      "Electron-donating groups raise the diene's HOMO; electron-withdrawing groups lower the dienophile's LUMO. Both close the same gap from opposite sides.",
  },
  {
    id: "huckel",
    name: "Hückel's rule",
    topicId: "aromaticity",
    summary: "4n+2 π electrons in a cyclic, planar, fully conjugated ring. 4n is antiaromatic.",
  },
  {
    id: "electrophilic-aromatic-substitution",
    name: "Electrophilic aromatic substitution",
    topicId: "aromaticity",
    summary:
      "The ring attacks an electrophile, then loses a proton to get its aromaticity back rather than keeping the addition product.",
    whyThisReagent:
      "Substitution rather than addition because restoring the aromatic sextet is worth more than the new σ bond addition would give.",
  },
  {
    id: "nucleophilic-addition",
    name: "Nucleophilic addition",
    topicId: "carbonyls",
    summary: "A nucleophile attacks the carbonyl carbon; the π electrons fold onto oxygen.",
  },
  {
    id: "acyl-substitution",
    name: "Nucleophilic acyl substitution",
    topicId: "carbonyls",
    summary:
      "Addition, then loss of a leaving group — which is why esters and acid chlorides substitute where aldehydes only add.",
  },
  {
    id: "enolates",
    name: "Enolates",
    topicId: "carbonyls",
    summary:
      "Deprotonate alpha to the carbonyl and the nucleophile becomes the carbon, not the oxygen's partner.",
    whyThisReagent:
      "LDA over an alkoxide because it is bulky and strong enough to deprotonate completely and irreversibly, so you get the enolate you drew rather than an equilibrium mixture with the ketone still present.",
  },
];

// ---------------------------------------------------------------- overrides

/** A staff edit. Only the fields present are applied. */
export interface TopicOverride {
  id: string;
  name?: string;
  blurb?: string;
  /** The section heading on the lessons page. */
  title?: string;
  /**
   * The TA's rewritten text boxes, as serialised `LessonBlock[]`.
   *
   * Kept as the raw string rather than a parsed array: it arrives from a sheet
   * cell and may be truncated, hand-edited or left over from an older shape, so
   * parsing belongs at the point of use where a failure can fall back to the
   * built-in writing. See `parseBlocks` in `src/data/lessonBlocks.ts`.
   */
  blocks?: string;
}

export interface ReactionOverride {
  id: string;
  name?: string;
  summary?: string;
  whyThisReagent?: string;
  videoUrl?: string;
  deckId?: string;
}

export interface CourseOverrides {
  topics?: TopicOverride[];
  reactions?: ReactionOverride[];
}

/**
 * Built-in content with staff edits merged over it.
 *
 * Merged by id and field by field, so an override that only sets `videoUrl`
 * leaves the written summary alone. Unknown ids are ignored rather than
 * appended: staff can currently correct what exists, not invent topics, which
 * is the smaller and safer half of the feature to ship first.
 */
export function applyOverrides(overrides: CourseOverrides | null | undefined): {
  units: Unit[];
  topics: Topic[];
  reactions: Reaction[];
} {
  if (!overrides) return { units: UNITS, topics: TOPICS, reactions: REACTIONS };

  const topicEdits = new Map((overrides.topics ?? []).map((o) => [o.id, o]));
  const reactionEdits = new Map((overrides.reactions ?? []).map((o) => [o.id, o]));

  const clean = <T extends object>(edit: T | undefined) => {
    if (!edit) return {};
    // An override that arrives as an empty string means "cleared", but one that
    // arrives as undefined means "not set" — dropping the latter is what keeps
    // a partial edit from wiping fields it never mentioned.
    return Object.fromEntries(
      Object.entries(edit).filter(([key, value]) => key !== "id" && value !== undefined),
    );
  };

  return {
    units: UNITS,
    topics: TOPICS.map((t) => ({ ...t, ...clean(topicEdits.get(t.id)) })),
    reactions: REACTIONS.map((r) => ({ ...r, ...clean(reactionEdits.get(r.id)) })),
  };
}

export const findTopic = (id: string) => TOPICS.find((t) => t.id === id) ?? null;
export const reactionsFor = (topicId: string) => REACTIONS.filter((r) => r.topicId === topicId);

/** e.g. "6 topics across 2 units" — for the homepage tile. */
export const courseSummary = () =>
  `${TOPICS.length} topics across ${UNITS.length} units`;
