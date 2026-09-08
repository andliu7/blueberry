/**
 * The pKa table, as first class data rather than as prose in a prompt.
 *
 * WHY THIS IS A MODULE AND NOT A NUMBER IN AN EXPLANATION STRING.
 * `docs/COURSE-OUTLINE-ORGO2.md` section 7 records that the first question on 6
 * of 6 exams examined is pKa recall on three underlined protons, worth exactly 3
 * points, and that computing Keq from a pKa difference is worth a further 3 to 10
 * points on two of the three exams. Acidity is the course's spine and not one of
 * its topics. Section 5 records the same machinery driving five other topics
 * through the `pka_keq_viability` concept.
 *
 * That machinery is fully mechanical, which is unusual and worth exploiting. With
 * this table, three named causes can be produced with no authoring at all:
 *
 *   this base cannot deprotonate this site, Keq is about 10^-10
 *   the strong base was consumed by a more acidic proton elsewhere in the molecule
 *   this step is drawn irreversible, but the leaving group is good, so it is an
 *   equilibrium
 *
 * CLAUDE.md's feedback specificity axis is measured on the count of distinct
 * named causes and the share of wrong attempts resolving to one. Three causes
 * that need no per problem authoring are worth more than three that do.
 *
 * WHAT THIS TABLE IS NOT. It is not a general pKa reference and must not grow
 * into one. It is the ladder the source course actually teaches, plus the small
 * number of additional values the course's own worked problems require, each
 * marked with where it came from. A value with no `source` is a value nobody can
 * check.
 *
 * PRECISION, STATED HONESTLY. These are class values, taught to one or two
 * significant figures, and the course teaches them as approximations to be
 * compared rather than as measurements. `keqFromPka` therefore returns an order
 * of magnitude estimate and its result should be reported the way the course
 * reports it, as "about 10 to the something", never as a precise equilibrium
 * constant. A checker that demands three significant figures on a number derived
 * from a value taught as "about 16" is checking the wrong thing.
 */

export type PkaSiteId =
  | "protonated_carbonyl"
  | "protonated_alcohol"
  | "hydronium"
  | "carboxylic_acid"
  | "carbonic_acid"
  | "phenol"
  | "ammonium"
  | "beta_dicarbonyl_alpha_ch"
  | "water"
  | "alcohol"
  | "ketone_alpha_ch"
  | "ester_alpha_ch"
  | "terminal_alkyne_ch"
  | "amine_nh"
  | "vinylic_or_aromatic_ch"
  | "alkane_ch";

/**
 * Where the number came from.
 *
 * `course_ladder` means it was read off the source course's own pKa worksheet
 * key. `reagent_reference` means it comes from the owner's PhD reviewed reagent
 * reference. `standard_reference` means neither of those carried it and it is a
 * textbook value, included because a course worked problem needs it. The
 * distinction matters when a student's answer disagrees: a course ladder value
 * is what they were taught and is what they will be marked against.
 */
export type PkaSource = "course_ladder" | "reagent_reference" | "standard_reference";

export interface PkaEntry {
  readonly id: PkaSiteId;
  /** Student facing, so it is a phrase and not an identifier. */
  readonly label: string;
  /** The approximate pKa of the acid. See the precision note in the header. */
  readonly pka: number;
  readonly source: PkaSource;
  /** Why this entry exists, or the mistake it is here to catch. */
  readonly note?: string;
}

export const PKA_TABLE: Readonly<Record<PkaSiteId, PkaEntry>> = Object.freeze({
  protonated_carbonyl: Object.freeze({
    id: "protonated_carbonyl",
    label: "Protonated carbonyl oxygen",
    pka: -7,
    source: "course_ladder",
    note:
      "One of the two negative values that make acid catalysis work. Students learn the neutral " +
      "column and then cannot explain why an acid catalysed step happens at all.",
  }),
  protonated_alcohol: Object.freeze({
    id: "protonated_alcohol",
    label: "Protonated alcohol oxygen",
    pka: 0,
    source: "course_ladder",
    note: "The activated leaving group in every acid mediated alcohol reaction.",
  }),
  hydronium: Object.freeze({
    id: "hydronium",
    label: "Hydronium",
    pka: -1.7,
    source: "standard_reference",
    note: "Needed as the acid formed whenever water is the base in a worked Keq.",
  }),
  carboxylic_acid: Object.freeze({
    id: "carboxylic_acid",
    label: "Carboxylic acid O-H",
    pka: 5,
    source: "course_ladder",
  }),
  carbonic_acid: Object.freeze({
    id: "carbonic_acid",
    label: "Carbonic acid",
    pka: 6.4,
    source: "standard_reference",
    note:
      "The acid formed when bicarbonate deprotonates a carboxylic acid. The acid and base " +
      "extraction problem is a Keq comparison against this value and an alcohol.",
  }),
  phenol: Object.freeze({
    id: "phenol",
    label: "Phenol O-H",
    pka: 10,
    source: "course_ladder",
    note: "Five orders of magnitude more acidic than an alcohol, and the whole point of phenols.",
  }),
  ammonium: Object.freeze({
    id: "ammonium",
    label: "Ammonium N-H",
    pka: 10,
    source: "course_ladder",
    note: "The conjugate acid of an amine. Not to be confused with the amine N-H at 35.",
  }),
  beta_dicarbonyl_alpha_ch: Object.freeze({
    id: "beta_dicarbonyl_alpha_ch",
    label: "Alpha C-H between two carbonyls",
    pka: 10,
    source: "course_ladder",
    note:
      "Ten orders of magnitude more acidic than a simple alpha C-H, and the reason the malonic " +
      "ester and acetoacetic ester routes work. Both values appear on one page of the source key.",
  }),
  water: Object.freeze({
    id: "water",
    label: "Water",
    pka: 15.7,
    source: "course_ladder",
    note: "The course teaches this as 15 to 16 alongside the alcohol value.",
  }),
  alcohol: Object.freeze({
    id: "alcohol",
    label: "Alcohol O-H",
    pka: 16,
    source: "course_ladder",
    note: "At or below the leaving group ceiling, so an alkoxide leaves and the step is reversible.",
  }),
  ketone_alpha_ch: Object.freeze({
    id: "ketone_alpha_ch",
    label: "Alpha C-H of a ketone or aldehyde",
    pka: 20,
    source: "course_ladder",
    note: "Exactly at the leaving group ceiling, which is why enolate chemistry sits where it does.",
  }),
  ester_alpha_ch: Object.freeze({
    id: "ester_alpha_ch",
    label: "Alpha C-H of an ester",
    pka: 25,
    source: "reagent_reference",
    note: "Less acidic than a ketone alpha C-H, which is what makes a crossed Claisen controllable.",
  }),
  terminal_alkyne_ch: Object.freeze({
    id: "terminal_alkyne_ch",
    label: "Terminal alkyne C-H",
    pka: 25,
    source: "standard_reference",
    note:
      "The acetylide is used as a nucleophile from the first week of the course, and this is the " +
      "value that says it cannot survive a protic solvent.",
  }),
  amine_nh: Object.freeze({
    id: "amine_nh",
    label: "Amine N-H",
    pka: 35,
    source: "course_ladder",
    note: "Far less acidic than an alcohol O-H. The reverse is a recorded mistake pattern.",
  }),
  vinylic_or_aromatic_ch: Object.freeze({
    id: "vinylic_or_aromatic_ch",
    label: "Vinylic or aromatic C-H",
    pka: 40,
    source: "course_ladder",
  }),
  alkane_ch: Object.freeze({
    id: "alkane_ch",
    label: "Alkane C-H",
    pka: 50,
    source: "course_ladder",
    note:
      "The bad leaving group. A carbanion does not leave, so a step that would expel one runs " +
      "irreversibly forward instead.",
  }),
});

/**
 * The leaving group ceiling the source course teaches, and it is a threshold, not
 * a gradient.
 *
 * The rule as the key states it: if a step creates a leaving group whose
 * conjugate acid pKa is at or below 20, the step is reversible. If the leaving
 * group is bad, the worked example being a carbanion at about 50, the step is
 * irreversible forward. The whole equilibrium arrow selection question form rests
 * on this one number.
 */
export const GOOD_LEAVING_GROUP_PKA_CEILING = 20;

export function allPkaSiteIds(): readonly PkaSiteId[] {
  return Object.keys(PKA_TABLE) as PkaSiteId[];
}

/** Throws on an unknown id, because a lookup miss here is an authoring defect. */
export function pkaEntry(id: PkaSiteId): PkaEntry {
  const entry = PKA_TABLE[id];
  if (entry === undefined) {
    throw new Error(`Unknown pKa site id: ${String(id)}`);
  }
  return entry;
}

export function pkaValue(id: PkaSiteId): number {
  return pkaEntry(id).pka;
}

/**
 * `Keq = 10^(pKa of the acid formed - pKa of the acid consumed)`.
 *
 * Stated in the source key in exactly that form, and it is the direction students
 * reverse. The acid CONSUMED is the one on the reactant side that gives up its
 * proton. The acid FORMED is the conjugate acid of the base that took it.
 *
 * Both arguments are plain numbers rather than `PkaSiteId`, because half the
 * worked problems supply a pKa in the prompt for a site that is not on the
 * ladder. Use `pkaValue` to feed it from the table.
 */
export function keqFromPka(acidFormedPka: number, acidConsumedPka: number): number {
  return 10 ** (acidFormedPka - acidConsumedPka);
}

/**
 * Whether a leaving group leaves, from the pKa of its conjugate acid.
 *
 * True means the step is an equilibrium. False means it runs forward. See the
 * ceiling constant above for the rule this encodes.
 */
export function isGoodLeavingGroup(conjugateAcidPka: number): boolean {
  return conjugateAcidPka <= GOOD_LEAVING_GROUP_PKA_CEILING;
}

/**
 * The site a base actually deprotonates, which is a whole molecule comparison.
 *
 * The recorded mistake pattern is a student removing the proton nearest the
 * reacting site rather than the most acidic one in the molecule. Ties are
 * returned as ties: the source course teaches a Keq of 1 case deliberately, so
 * that the answer reads as a comparison and not as a rule, and collapsing a tie
 * to whichever came first in an array would delete that lesson.
 */
export function mostAcidicSites(sites: readonly PkaSiteId[]): readonly PkaSiteId[] {
  if (sites.length === 0) return [];
  const lowest = Math.min(...sites.map(pkaValue));
  return sites.filter((id) => pkaValue(id) === lowest);
}

/**
 * A pKa site named in a problem prompt.
 *
 * This is what makes the table first class rather than a lookup nobody calls. The
 * exam's opening question underlines three protons and asks for a pKa for each.
 * Authored as three of these, the blanks are typed data: a validator can check the
 * authored numeric answer against the table, a diagnostic can name which ladder
 * rung the student reached for instead, and the reverse question form, ranking
 * sites within one molecule, is the same data read differently.
 *
 * `anchor` is the label the prompt uses for the proton, "Ha" or "the underlined
 * O-H". It is free text because it belongs to one problem's wording and is never
 * counted across problems.
 */
export interface PkaSiteReference {
  readonly siteId: PkaSiteId;
  readonly anchor: string;
}
