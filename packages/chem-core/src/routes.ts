/**
 * The names of things. Routes, elementary step kinds, and transformation kinds.
 *
 * These are unions rather than free strings for one reason that is worth stating
 * plainly: CLAUDE.md makes "count of distinct named failure causes" a measured
 * win condition, and `correct_alternative_route` has to carry the NAME of the
 * route taken. You cannot count, group, or compare names that are arbitrary
 * strings, and you cannot spot the day somebody writes "SN2" in one file and
 * "Sn2" in another.
 *
 * Adding a route is a one line edit here plus whatever content needs it. That is
 * the intended cost.
 */

/**
 * A named mechanism route, in the sense a textbook chapter uses the word.
 *
 * A route spans several elementary steps. SN1 is a route; "leaving group leaves"
 * is one elementary step inside it.
 */
export type MechanismRoute =
  | "sn1"
  | "sn2"
  | "e1"
  | "e2"
  | "e1cb"
  | "nucleophilic_acyl_substitution"
  | "nucleophilic_addition_carbonyl"
  | "electrophilic_addition_alkene"
  | "electrophilic_aromatic_substitution"
  | "nucleophilic_aromatic_substitution"
  | "radical_halogenation"
  | "radical_addition"
  | "acid_base_proton_transfer"
  /**
   * Not a reaction: no sigma bond forms or breaks and no atom moves. It is a
   * route here because the trainer's resonance hunt grades drawn arrows that
   * interconvert contributing structures, and correct_alternative_route has
   * to be able to NAME what the student pushed. Owner direction 2026-08-26:
   * resonance is a first-class game mode, and it is where the arrows live.
   */
  | "resonance"
  | "carbocation_rearrangement"
  | "oxidation"
  | "reduction"
  | "pericyclic";

/**
 * One elementary step: one transition state, one energy barrier.
 *
 * If a step in the corpus needs two of these to describe it, it is not
 * elementary and should be split. `step_not_elementary` is the named cause.
 * Concerted steps such as SN2 and E2 are single entries here precisely because
 * they are one barrier, even though several bonds change at once.
 */
export type ElementaryStepKind =
  | "proton_transfer"
  | "nucleophilic_attack"
  | "leaving_group_departure"
  | "concerted_substitution"
  | "concerted_elimination"
  | "bond_heterolysis"
  | "bond_homolysis"
  | "pi_bond_attack"
  | "hydride_shift"
  | "alkyl_shift"
  | "ring_opening"
  | "ring_closure"
  | "radical_addition_step"
  | "radical_abstraction"
  | "radical_recombination"
  | "tautomerisation"
  /** Electrons move, nothing else does: one contributing structure to another. */
  | "electron_delocalisation"
  | "coordination"
  | "pericyclic_step";

/**
 * What a transformation DOES, at the level a student would name it out loud.
 *
 * Used by `valid_not_requested`, which has to be able to say "you built an
 * elimination, the question asked for a substitution" rather than just "wrong".
 */
export type TransformationKind =
  | "substitution"
  | "elimination"
  | "addition"
  | "rearrangement"
  | "acid_base"
  | "oxidation"
  | "reduction"
  | "condensation"
  | "hydrolysis"
  | "no_net_change";

const MECHANISM_ROUTE_LABELS: Readonly<Record<MechanismRoute, string>> = Object.freeze({
  sn1: "SN1",
  sn2: "SN2",
  e1: "E1",
  e2: "E2",
  e1cb: "E1cb",
  nucleophilic_acyl_substitution: "nucleophilic acyl substitution",
  nucleophilic_addition_carbonyl: "nucleophilic addition to a carbonyl",
  electrophilic_addition_alkene: "electrophilic addition to an alkene",
  electrophilic_aromatic_substitution: "electrophilic aromatic substitution",
  nucleophilic_aromatic_substitution: "nucleophilic aromatic substitution",
  radical_halogenation: "radical halogenation",
  radical_addition: "radical addition",
  acid_base_proton_transfer: "acid base proton transfer",
  resonance: "resonance delocalisation",
  carbocation_rearrangement: "carbocation rearrangement",
  oxidation: "oxidation",
  reduction: "reduction",
  pericyclic: "pericyclic reaction",
});

/** The human readable name of a route, for feedback text. */
export function routeLabel(route: MechanismRoute): string {
  return MECHANISM_ROUTE_LABELS[route];
}

export function allMechanismRoutes(): readonly MechanismRoute[] {
  return Object.freeze(Object.keys(MECHANISM_ROUTE_LABELS) as MechanismRoute[]);
}
