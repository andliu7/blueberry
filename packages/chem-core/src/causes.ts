/**
 * Named causes. A first class registry, not a free string.
 *
 * This file is the feedback win condition made into data. CLAUDE.md records that
 * the bar shows one thing when a student is wrong, a yellow triangle, and that
 * closing that gap is measured by "count of distinct named failure causes" and
 * "percentage of wrong attempts resolving to a named cause rather than a generic
 * failure". Both of those are counts over this registry. A free string cannot be
 * counted, cannot be grouped, cannot be translated, and cannot be tested for
 * coverage, so `NamedCause` carries a `CauseId` from a closed union and any
 * detail it needs as structured references.
 *
 * `CauseId` is written out as a union and the registry is typed
 * `Record<CauseId, CauseDefinition>`. That means adding a member to the union
 * without adding its definition is a compile error, and adding a definition
 * without a union member is also a compile error. The count reported by
 * `causeCount()` is therefore the real number, not the number somebody
 * remembered to update.
 *
 * A cause never contains a rendered sentence. `summary` and `teaches` are the
 * copy, and they live next to the id so a writer can improve the wording without
 * touching any engine code.
 */

import type { ArrowId, AtomId, BondId, SpeciesId, StepId } from "./ids.js";
import type { MechanismRoute } from "./routes.js";

export type CauseCategory =
  | "success"
  | "valence"
  | "conservation"
  | "electron_flow"
  | "stereochemistry"
  | "sterics"
  | "reactivity"
  | "route";

/**
 * How much weight a cause carries.
 *
 * `blocking` means the structure or step is impossible and the attempt is
 * invalid. `advisory` means it is possible but disfavoured, and this is the half
 * of the design that CLAUDE.md calls graded chemistry rather than boolean
 * chemistry: neopentyl SN2 is advisory, not blocking, because the interesting
 * thing about neopentyl is that it is slow enough for the methyl shift to win,
 * and a hard reject deletes the lesson. `informational` is a note that carries no
 * judgment at all.
 */
export type CauseSeverity = "blocking" | "advisory" | "informational";

/** The four outcomes from CLAUDE.md. Repeated here so causes can declare fit. */
export type ResolutionKind =
  | "correct"
  | "correct_alternative_route"
  | "valid_not_requested"
  | "invalid";

export type CauseId =
  // success
  | "matches_requested_route"
  | "alternative_route_same_product"
  | "valid_transformation_not_requested"
  // valence
  | "valence_exceeded"
  | "octet_expanded_on_period_two"
  | "impossible_hydrogen_count"
  | "formal_charge_disagrees_with_structure"
  | "electron_count_not_integral"
  // conservation
  | "mass_not_conserved"
  | "charge_not_conserved"
  | "electron_count_not_conserved"
  | "proton_source_not_in_state"
  | "proton_sink_not_in_state"
  | "species_appeared_without_source"
  | "species_disappeared_without_sink"
  | "spectator_changed_during_step"
  | "spectator_declared_without_justification"
  | "implicit_hydrogen_changed_without_arrow"
  | "duplicate_species_id_in_state"
  // electron flow
  | "arrow_source_has_no_electrons"
  | "arrow_sink_cannot_accept_electrons"
  | "arrow_drawn_backwards"
  | "arrow_count_disagrees_with_deltas"
  | "arrow_endpoint_not_in_state"
  | "bond_change_without_arrow"
  | "too_many_arrows_at_one_center"
  | "radical_arrow_used_in_polar_step"
  | "arrow_endpoints_not_adjacent"
  | "arrow_declares_no_change"
  // stereochemistry
  | "sn2_did_not_invert"
  | "addition_face_wrong"
  | "e2_not_periplanar"
  | "e2_syn_periplanar_unjustified"
  | "stereocenter_created_without_declared_geometry"
  | "stereochemistry_asserted_as_single_product_at_sn1_center"
  // sterics
  | "sn2_center_strongly_hindered"
  | "sn2_at_tertiary_center"
  | "nucleophile_cannot_reach_backside"
  // reactivity
  | "leaving_group_too_poor"
  | "nucleophile_not_present_in_state"
  | "acid_and_base_regime_mixed"
  | "skipped_favourable_rearrangement"
  | "regiochemistry_contradicts_stability"
  | "attacked_wrong_electrophilic_site"
  | "carbocation_on_destabilised_center"
  | "antiaromatic_intermediate_proposed"
  // route
  | "step_out_of_order"
  | "step_not_elementary"
  | "step_kind_disagrees_with_arrows"
  | "reaction_center_not_touched_by_any_arrow"
  | "route_requires_conditions_not_present";

export interface CauseDefinition {
  readonly id: CauseId;
  readonly category: CauseCategory;
  readonly severity: CauseSeverity;
  /**
   * Which resolution kinds this cause may be the PRIMARY cause of.
   *
   * A blocking cause belongs only to `invalid`. An advisory cause can sit on a
   * correct answer, which is how "you got there, and here is why the real flask
   * would mostly do something else" gets said without marking it wrong.
   */
  readonly appliesTo: readonly ResolutionKind[];
  /** One line, shown to the student. Present tense, no blame. */
  readonly summary: string;
  /** The chemistry behind it. This is the half that has to teach. */
  readonly teaches: string;
}

function define(
  id: CauseId,
  category: CauseCategory,
  severity: CauseSeverity,
  appliesTo: readonly ResolutionKind[],
  summary: string,
  teaches: string,
): CauseDefinition {
  return Object.freeze({ id, category, severity, appliesTo, summary, teaches });
}

const BLOCKING: readonly ResolutionKind[] = Object.freeze(["invalid"]);
const ANY_VALID: readonly ResolutionKind[] = Object.freeze([
  "correct",
  "correct_alternative_route",
  "valid_not_requested",
]);
const ANYWHERE: readonly ResolutionKind[] = Object.freeze([
  "correct",
  "correct_alternative_route",
  "valid_not_requested",
  "invalid",
]);

export const CAUSES: Readonly<Record<CauseId, CauseDefinition>> = Object.freeze({
  matches_requested_route: define(
    "matches_requested_route",
    "success",
    "informational",
    ["correct"],
    "This is the requested mechanism, drawn correctly.",
    "Every arrow starts on electron density and ends where those electrons go, and mass, charge, and electron count all balance across the step.",
  ),
  alternative_route_same_product: define(
    "alternative_route_same_product",
    "success",
    "informational",
    ["correct_alternative_route"],
    "This reaches the same product by a different valid route.",
    "More than one mechanism can give the same product. The route you drew is chemically sound; the question was aiming at a different one, and both are worth being able to draw.",
  ),
  valid_transformation_not_requested: define(
    "valid_transformation_not_requested",
    "success",
    "informational",
    ["valid_not_requested"],
    "This is sound chemistry, but it is a different transformation from the one asked for.",
    "Nothing here is impossible. The product you built is not the product the question wanted, which usually means a different site was attacked or a different competing pathway was followed.",
  ),

  valence_exceeded: define(
    "valence_exceeded",
    "valence",
    "blocking",
    BLOCKING,
    "An atom has more bonds than it can hold.",
    "Bonding capacity follows from the number of valence orbitals. Carbon has four; a fifth bond has no orbital to live in.",
  ),
  octet_expanded_on_period_two: define(
    "octet_expanded_on_period_two",
    "valence",
    "blocking",
    BLOCKING,
    "A period two atom has more than eight valence electrons around it.",
    "Nitrogen and oxygen have no d orbitals available, so they cannot expand past an octet. Sulfur and phosphorus can, which is why the same drawing is fine one row down.",
  ),
  impossible_hydrogen_count: define(
    "impossible_hydrogen_count",
    "valence",
    "blocking",
    BLOCKING,
    "An atom has a negative or impossible number of hydrogens.",
    "Implicit hydrogens are real atoms that simply are not drawn. Removing more than are there is not a shorthand, it is a missing atom.",
  ),
  formal_charge_disagrees_with_structure: define(
    "formal_charge_disagrees_with_structure",
    "valence",
    "blocking",
    BLOCKING,
    "The charge written on an atom does not match the electrons drawn around it.",
    "Formal charge is valence electrons minus nonbonding electrons minus bonds. It is not a label chosen separately from the structure; it is read off it.",
  ),
  electron_count_not_integral: define(
    "electron_count_not_integral",
    "valence",
    "blocking",
    BLOCKING,
    "An atom ends up with a fractional number of electrons.",
    "Half arrows come in pairs. A single fishhook that is not matched by another leaves half an electron somewhere, which means one of the two is missing.",
  ),

  mass_not_conserved: define(
    "mass_not_conserved",
    "conservation",
    "blocking",
    BLOCKING,
    "Atoms appear or disappear across this step.",
    "Every atom on the left is on the right. If a proton left, something in the flask is holding it now, and that something has to be drawn.",
  ),
  charge_not_conserved: define(
    "charge_not_conserved",
    "conservation",
    "blocking",
    BLOCKING,
    "Total charge changes across this step.",
    "Charge is conserved over everything present, not over one molecule. A protonation looks like it creates charge only when the acid that supplied the proton is left out of the picture.",
  ),
  electron_count_not_conserved: define(
    "electron_count_not_conserved",
    "conservation",
    "blocking",
    BLOCKING,
    "Valence electrons are created or destroyed across this step.",
    "Arrows move electrons. They never make them. If the totals differ, an arrow is missing or one is drawn twice.",
  ),
  proton_source_not_in_state: define(
    "proton_source_not_in_state",
    "conservation",
    "blocking",
    BLOCKING,
    "A proton arrives from a species that is not present.",
    "A species that is not in the flask cannot donate anything. If the acid is implied by the conditions, it still has to be drawn as a participant before it can hand over a proton.",
  ),
  proton_sink_not_in_state: define(
    "proton_sink_not_in_state",
    "conservation",
    "blocking",
    BLOCKING,
    "A proton leaves to a species that is not present.",
    "Deprotonation needs a base. Something takes that proton, and that something has to be a member of the system, not the word solvent written above an arrow.",
  ),
  species_appeared_without_source: define(
    "species_appeared_without_source",
    "conservation",
    "blocking",
    BLOCKING,
    "A molecule appears that was not there before and was not made by this step.",
    "Every species in the product state either came through the step or was already present. New reagents mid mechanism are a new step, not a silent addition.",
  ),
  species_disappeared_without_sink: define(
    "species_disappeared_without_sink",
    "conservation",
    "blocking",
    BLOCKING,
    "A molecule vanishes without reacting.",
    "Leaving groups leave, they do not evaporate. If it is no longer part of anything, it is still a species in the flask.",
  ),
  spectator_changed_during_step: define(
    "spectator_changed_during_step",
    "conservation",
    "blocking",
    BLOCKING,
    "A species declared a spectator took part in the step.",
    "A spectator is excluded from conservation on the promise that it does not change. The moment it changes, that promise is what is wrong, not the arithmetic.",
  ),
  spectator_declared_without_justification: define(
    "spectator_declared_without_justification",
    "conservation",
    "blocking",
    BLOCKING,
    "A species is excluded from conservation with no recorded reason.",
    "Excluding something from the books is a decision. It gets a named reason and an author, so it can be argued with later.",
  ),
  implicit_hydrogen_changed_without_arrow: define(
    "implicit_hydrogen_changed_without_arrow",
    "conservation",
    "blocking",
    BLOCKING,
    "An undrawn hydrogen count changed and no arrow accounts for it.",
    "Implicit hydrogens are a drawing convenience, not an exemption. A proton that moves has to be moved by an arrow like every other atom.",
  ),
  duplicate_species_id_in_state: define(
    "duplicate_species_id_in_state",
    "conservation",
    "blocking",
    BLOCKING,
    "Two different molecules in this state carry the same name.",
    "Two equivalents of the same reagent are two separate species with two separate names, not one name written twice. Sharing a name makes the second copy invisible to anything that looks a molecule up, while it still counts toward every total.",
  ),

  arrow_source_has_no_electrons: define(
    "arrow_source_has_no_electrons",
    "electron_flow",
    "blocking",
    BLOCKING,
    "This arrow starts somewhere with no electrons to give.",
    "Arrows begin at electron density: a lone pair, or a bond. An arrow starting at an empty orbital or at a positive charge has nothing to move.",
  ),
  arrow_sink_cannot_accept_electrons: define(
    "arrow_sink_cannot_accept_electrons",
    "electron_flow",
    "blocking",
    BLOCKING,
    "This arrow ends somewhere that cannot take more electrons.",
    "An atom with a full octet and no leaving group takes nothing. Either something leaves at the same time, or the electrons have nowhere to go.",
  ),
  arrow_drawn_backwards: define(
    "arrow_drawn_backwards",
    "electron_flow",
    "blocking",
    BLOCKING,
    "This arrow runs from the electrophile toward the nucleophile.",
    "Arrows follow the electrons, always from the electron rich site to the electron poor one. Drawing the reverse describes the atoms moving, not the electrons.",
  ),
  arrow_count_disagrees_with_deltas: define(
    "arrow_count_disagrees_with_deltas",
    "electron_flow",
    "blocking",
    BLOCKING,
    "The arrows do not add up to the structural change they claim to explain.",
    "The change from one structure to the next is fully determined by the arrows. When the two disagree, one of them is the record of what actually happened and the other is a guess.",
  ),
  arrow_endpoint_not_in_state: define(
    "arrow_endpoint_not_in_state",
    "electron_flow",
    "blocking",
    BLOCKING,
    "An arrow points at an atom or bond that is not in this structure.",
    "Arrows are anchored to specific atoms, not to positions on the page. An endpoint that names nothing usually means the structure was redrawn and the arrow was left behind.",
  ),
  bond_change_without_arrow: define(
    "bond_change_without_arrow",
    "electron_flow",
    "blocking",
    BLOCKING,
    "A bond changed and no arrow explains it.",
    "Every bond that forms or breaks is the result of electrons moving, so it has an arrow. A silent bond change is the step you did not show your working for.",
  ),
  too_many_arrows_at_one_center: define(
    "too_many_arrows_at_one_center",
    "electron_flow",
    "blocking",
    BLOCKING,
    "Too much is happening at one atom in a single step.",
    "One elementary step passes through one transition state. When three or more independent changes pile onto one centre, it is really several steps drawn on top of each other.",
  ),
  radical_arrow_used_in_polar_step: define(
    "radical_arrow_used_in_polar_step",
    "electron_flow",
    "blocking",
    BLOCKING,
    "A single electron arrow appears in a step with no radicals.",
    "Fishhooks move one electron at a time and belong to radical chemistry. In a polar step the electrons travel as pairs.",
  ),
  arrow_endpoints_not_adjacent: define(
    "arrow_endpoints_not_adjacent",
    "electron_flow",
    "blocking",
    BLOCKING,
    "This arrow moves electrons between two places that never touch.",
    "Electrons do not jump across a drawing. An arrow starts on a lone pair or a bond and ends on the very atom that pair is already attached to, or on a bond being made to it. If the start and the finish share no atom, the arrow is describing a teleport rather than a reaction.",
  ),
  arrow_declares_no_change: define(
    "arrow_declares_no_change",
    "electron_flow",
    "blocking",
    BLOCKING,
    "This arrow starts and finishes in the same place, so it changes nothing.",
    "An arrow is a claim that electron density moved. One that takes a lone pair off an atom and puts the same pair back on that atom, or that empties a bond into the same bond, makes that claim about nothing at all.",
  ),

  sn2_did_not_invert: define(
    "sn2_did_not_invert",
    "stereochemistry",
    "blocking",
    BLOCKING,
    "The SN2 centre kept its configuration.",
    "The nucleophile attacks opposite the leaving group, so the other three groups flip through like an umbrella in wind. Inversion is not a tendency here, it is the geometry of the transition state.",
  ),
  addition_face_wrong: define(
    "addition_face_wrong",
    "stereochemistry",
    "blocking",
    BLOCKING,
    "The two new groups added to the wrong faces.",
    "Bromination goes through a bridged bromonium ion, so the second bromide has to open it from the back. Anti addition to a cis alkene gives the racemic pair; to a trans alkene it gives the meso compound.",
  ),
  e2_not_periplanar: define(
    "e2_not_periplanar",
    "stereochemistry",
    "blocking",
    BLOCKING,
    "The proton and the leaving group are not in the same plane.",
    "E2 forms a pi bond as the two sigma bonds break, so those two bonds have to be aligned with the developing p orbitals. Near zero or near one hundred and eighty degrees, and nothing in between.",
  ),
  e2_syn_periplanar_unjustified: define(
    "e2_syn_periplanar_unjustified",
    "stereochemistry",
    "advisory",
    ANYWHERE,
    "This is a syn periplanar E2, which needs a reason.",
    "Syn elimination is real in rings and cages where anti geometry cannot be reached. It is not wrong, it is unusual, and the conformational reason it is forced should be stated.",
  ),
  stereocenter_created_without_declared_geometry: define(
    "stereocenter_created_without_declared_geometry",
    "stereochemistry",
    "blocking",
    BLOCKING,
    "A new stereocenter was made and left undefined.",
    "Once a carbon carries four different groups, the two arrangements are different compounds. Leaving it flat on the page does not average them, it just does not say which one was made.",
  ),
  stereochemistry_asserted_as_single_product_at_sn1_center: define(
    "stereochemistry_asserted_as_single_product_at_sn1_center",
    "stereochemistry",
    "advisory",
    ANYWHERE,
    "An SN1 centre is shown as a single configuration.",
    "The carbocation is flat, so the nucleophile can arrive from either face and both products form. Ion pairing shields one face briefly, so inversion is usually in excess, but the other product is still there.",
  ),

  sn2_center_strongly_hindered: define(
    "sn2_center_strongly_hindered",
    "sterics",
    "advisory",
    ANYWHERE,
    "Backside attack here is very slow, so something else usually wins.",
    "A neopentyl centre reacts by SN2 roughly a hundred thousand times slower than ethyl. It is not forbidden, it is simply outrun, most often by a methyl shift to a tertiary cation.",
  ),
  sn2_at_tertiary_center: define(
    "sn2_at_tertiary_center",
    "sterics",
    "advisory",
    ANYWHERE,
    "This is a backside attack on a fully substituted carbon.",
    "Three alkyl groups sit across the trajectory the nucleophile has to travel. Under these conditions the ionisation pathway is normally what happens instead.",
  ),
  nucleophile_cannot_reach_backside: define(
    "nucleophile_cannot_reach_backside",
    "sterics",
    "blocking",
    BLOCKING,
    "The backside of this carbon is not reachable at all.",
    "At a bridgehead in a small bicycle, the geometry that inversion requires cannot be reached without breaking the cage. This is the one steric case that is a hard no rather than a slow yes.",
  ),

  leaving_group_too_poor: define(
    "leaving_group_too_poor",
    "reactivity",
    "advisory",
    ANYWHERE,
    "This group does not leave on its own.",
    "A leaving group has to be stable carrying the electron pair it takes with it. Hydroxide is not, which is why alcohols are protonated first and leave as water.",
  ),
  nucleophile_not_present_in_state: define(
    "nucleophile_not_present_in_state",
    "reactivity",
    "blocking",
    BLOCKING,
    "The nucleophile that attacks here is not in the flask.",
    "The system boundary is what is drawn. A reagent implied by the conditions still has to be a member before it can react.",
  ),
  acid_and_base_regime_mixed: define(
    "acid_and_base_regime_mixed",
    "reactivity",
    "blocking",
    BLOCKING,
    "This mechanism uses a strong acid and a strong base in the same pot.",
    "Under acidic conditions there is no free alkoxide, and under basic conditions there is no protonated carbonyl. Pick the regime the conditions describe and stay in it.",
  ),
  skipped_favourable_rearrangement: define(
    "skipped_favourable_rearrangement",
    "reactivity",
    "advisory",
    ANYWHERE,
    "A much more stable cation was available one shift away.",
    "Hydride and alkyl shifts happen fast when they buy stability. A secondary cation next to a quaternary carbon rarely survives long enough to be captured.",
  ),
  regiochemistry_contradicts_stability: define(
    "regiochemistry_contradicts_stability",
    "reactivity",
    "advisory",
    ANYWHERE,
    "The addition went to the less favourable position.",
    "The electrophile adds so as to leave the more stabilised cation behind. That is all Markovnikov's rule is, and it inverts under radical conditions for the same reason.",
  ),
  attacked_wrong_electrophilic_site: define(
    "attacked_wrong_electrophilic_site",
    "reactivity",
    "advisory",
    ANYWHERE,
    "The nucleophile went to a different electrophilic site.",
    "Molecules often have more than one place to attack. Which one wins depends on charge, orbital overlap, and whether the step can be undone.",
  ),
  carbocation_on_destabilised_center: define(
    "carbocation_on_destabilised_center",
    "reactivity",
    "advisory",
    ANYWHERE,
    "This cation sits on a carbon that cannot support it.",
    "Vinyl, aryl, and primary cations are high enough in energy that a mechanism going through one is usually a sign that a different pathway is operating.",
  ),
  antiaromatic_intermediate_proposed: define(
    "antiaromatic_intermediate_proposed",
    "reactivity",
    "advisory",
    ANYWHERE,
    "This intermediate is antiaromatic.",
    "A planar cyclic system with four n pi electrons is destabilised relative to the open chain version, not stabilised. Real systems avoid it, often by twisting out of plane.",
  ),

  step_out_of_order: define(
    "step_out_of_order",
    "route",
    "blocking",
    BLOCKING,
    "This step cannot happen yet.",
    "The species it needs is made by a later step. Mechanisms are a sequence, and each step starts from what the one before it actually produced.",
  ),
  step_not_elementary: define(
    "step_not_elementary",
    "route",
    "blocking",
    BLOCKING,
    "Several separate steps are drawn as one.",
    "One elementary step is one transition state. Bond formation and an unrelated proton transfer are two barriers, so they are two steps, even when both are inevitable.",
  ),
  step_kind_disagrees_with_arrows: define(
    "step_kind_disagrees_with_arrows",
    "route",
    "blocking",
    BLOCKING,
    "The kind this step is declared to be is not the kind its arrows describe.",
    "A step's kind is a claim about which electrons moved and where they came from, so the arrows settle it and the label only records it. A hydrogen that carries its own bonding pair is a hydride whatever the step is called, a bond whose pair leaves together is heterolysis whatever the step is called, and a step that expels a leaving group alongside the proton is an elimination rather than a proton transfer.",
  ),
  reaction_center_not_touched_by_any_arrow: define(
    "reaction_center_not_touched_by_any_arrow",
    "route",
    "blocking",
    BLOCKING,
    "An atom is declared a reaction centre of this step and no arrow touches it.",
    "The reaction centres of a step are the atoms its arrows start on, land on, or bond. An atom no arrow reaches took no part in the step, so every later claim resting on that declaration, a periplanar geometry above all, is being made about the wrong part of the molecule.",
  ),
  route_requires_conditions_not_present: define(
    "route_requires_conditions_not_present",
    "route",
    "advisory",
    ANY_VALID,
    "This route needs conditions the question did not give.",
    "Route choice is set by the reagents and the solvent as much as by the substrate. A mechanism that would need heat, or a different solvent, is describing a different experiment.",
  ),
});

/**
 * Where a cause points.
 *
 * Structured references, never prose. A renderer highlights the atom; a report
 * groups by species; an adversary asserts the reference resolves to something
 * that exists.
 */
export type CauseSubject =
  | { readonly kind: "atom"; readonly atomId: AtomId }
  | { readonly kind: "bond"; readonly bondId: BondId }
  | { readonly kind: "atomPair"; readonly atomIds: readonly [AtomId, AtomId] }
  | { readonly kind: "species"; readonly speciesId: SpeciesId }
  | { readonly kind: "arrow"; readonly arrowId: ArrowId }
  | { readonly kind: "step"; readonly stepId: StepId };

/**
 * An instance of a cause, pointing at the thing that caused it.
 *
 * `relatedRoute` is how "strongly disfavored, competing pathway likely" names
 * the competing pathway, which CLAUDE.md requires by name. It is a
 * `MechanismRoute`, not a sentence, so the pathway named can be linked, counted,
 * and checked against the corpus.
 */
export interface NamedCause {
  readonly id: CauseId;
  readonly subjects: readonly CauseSubject[];
  readonly relatedRoute?: MechanismRoute;
}

export interface NamedCauseInput {
  readonly id: CauseId;
  readonly subjects?: readonly CauseSubject[];
  readonly relatedRoute?: MechanismRoute;
}

export function namedCause(input: NamedCauseInput): NamedCause {
  return Object.freeze({
    id: input.id,
    subjects: Object.freeze([...(input.subjects ?? [])]),
    ...(input.relatedRoute === undefined ? {} : { relatedRoute: input.relatedRoute }),
  });
}

export function causeDefinition(id: CauseId): CauseDefinition {
  const definition = CAUSES[id];
  if (definition === undefined) {
    throw new Error(`Unknown cause id: ${id}`);
  }
  return definition;
}

/**
 * Every defined cause id.
 *
 * The measured win condition on the feedback axis is a count over this. Read it
 * from here rather than counting by hand.
 */
export function allCauseIds(): readonly CauseId[] {
  return Object.freeze(Object.keys(CAUSES) as CauseId[]);
}

/** How many distinct named causes exist. The number the feedback axis reports. */
export function causeCount(): number {
  return allCauseIds().length;
}

export function causeIdsByCategory(category: CauseCategory): readonly CauseId[] {
  return allCauseIds().filter((id) => causeDefinition(id).category === category);
}

export function causeIdsBySeverity(severity: CauseSeverity): readonly CauseId[] {
  return allCauseIds().filter((id) => causeDefinition(id).severity === severity);
}

/** Whether a cause is allowed to be the primary cause of a given resolution. */
export function causeAppliesTo(id: CauseId, kind: ResolutionKind): boolean {
  return causeDefinition(id).appliesTo.includes(kind);
}
