/**
 * Category: conservation. Eleven causes, all blocking.
 *
 * Almost all of these are one mistake wearing different hats: the student is
 * balancing over the substrate instead of over the whole flask. CLAUDE.md,
 * "System boundary": a state is a multiset of species, and conservation is
 * asserted over the multiset. So the copy keeps saying the same thing in the
 * terms of whichever count went wrong, and every `lookAt` sends the student to
 * the other species rather than back to the substrate.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type ConservationCauseId = Extract<
  CauseId,
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
>;

export const CONSERVATION_COPY: Readonly<Record<ConservationCauseId, CauseCopy>> = Object.freeze({
  mass_not_conserved: {
    whatYouDid: "The step ends with a different set of atoms from the one it started with.",
    why: "Atoms are not made or destroyed in a mechanism step. If a proton or a leaving group is gone from one molecule, it is attached to another molecule that is still in the flask.",
    lookAt: "Count each element on both sides of the step, hydrogens included. The element whose count changed points straight at the atom that moved without anywhere to land.",
  },
  charge_not_conserved: {
    whatYouDid: "The total charge is not the same before and after your step.",
    why: "Charge is conserved across everything in the flask, not across one molecule. A protonation looks like it invents a positive charge only because the acid that supplied the proton was left out of the drawing.",
    lookAt: "Add up the charge on every species present, reagents and counterions included. If your substrate gained a plus in this step, something else in the flask gained a minus in the same step.",
  },
  electron_count_not_conserved: {
    whatYouDid: "Your step creates or destroys valence electrons.",
    why: "Arrows move electrons from one place to another. They never add any and never remove any. A total that changes means an arrow is missing, or one arrow has been counted twice.",
    lookAt: "Trace each arrow from tail to head and mark the electrons it carries, two for a full arrow and one for a fishhook. Any bond that changed with no arrow on it is where the missing pair went.",
  },
  proton_source_not_in_state: {
    whatYouDid: "This step takes a proton from something that is not in the flask.",
    why: "Only species that have been drawn can react. Conditions written above the arrow, such as acid or aqueous, tell you what to draw, and it is the drawn species an arrow can reach.",
    lookAt: "Add the acid as a real species first, then push the arrow from your substrate to its proton. Under aqueous acid the donor is hydronium, not a bare proton floating on its own.",
  },
  proton_sink_not_in_state: {
    whatYouDid: "This step pulls a proton off and hands it to nothing.",
    why: "Deprotonation is a transfer, so something accepts that proton, and it has to be a species in the system. The word solvent or workup written above an arrow is not a species.",
    lookAt: "The conditions name the base for you. Under basic conditions it is the base itself. Under acidic conditions it is normally the solvent, or the conjugate base of the acid you protonated with earlier.",
  },
  species_appeared_without_source: {
    whatYouDid: "A molecule shows up in your product that was not there before and was not made by this step.",
    why: "Each step starts from exactly what the step before it produced. Reagents do not walk in part way through a step.",
    lookAt: "If that reagent really is added at this point, make it its own step so the sequence records when it arrives. If not, it was meant to be present from the start, so put it in the first state.",
  },
  species_disappeared_without_sink: {
    whatYouDid: "A molecule is missing from your product and it did not react.",
    why: "A leaving group that departs is still in the flask, as a free ion or a neutral molecule. Nothing leaves the system unless the problem says so.",
    lookAt: "Draw the departed group as its own species, with its charge on it. Bromide, water, and tosylate all stay on the page after they leave.",
  },
  spectator_changed_during_step: {
    whatYouDid: "A species declared a spectator changes during this step.",
    why: "A spectator is left out of the balance on the promise that it does not react. The moment it takes part, that promise is what is wrong, and every count built on it stops meaning anything.",
    lookAt: "If that species really does react here, drop the spectator declaration so it is counted like everything else. If it should not be reacting, the arrow that touches it is the mistake.",
  },
  spectator_declared_without_justification: {
    whatYouDid: "A species is out of the balance with no reason recorded.",
    why: "Excluding something from conservation changes what the checks can catch, so it is a decision rather than a formatting choice. A silent exclusion cannot be reviewed or argued with later.",
    lookAt: "Write the reason down, which is normally that it is a counterion or a bulk solvent molecule that never bonds to anything here. If you cannot write that sentence, it is a participant and belongs in the balance.",
  },
  implicit_hydrogen_changed_without_arrow: {
    whatYouDid: "A hydrogen count changed on an atom and no arrow explains it.",
    why: "Leaving hydrogens undrawn saves space, and they still play by the same rules. A proton that moves is moved by electrons, so it gets an arrow like every other atom.",
    lookAt: "Draw that hydrogen explicitly for this step, then add the arrows that move it: one from the base into the hydrogen, and one from the carbon to hydrogen bond onto the carbon or into the pi bond that is forming.",
  },
  duplicate_species_id_in_state: {
    whatYouDid: "Two separate molecules in this step are sharing one name.",
    why: "Two equivalents of the same reagent are two molecules, and each one needs its own name so an arrow can say which of the two it means. With one name shared, the second molecule is invisible to anything that looks a molecule up, while it still counts toward the totals.",
    lookAt: "Give each copy its own name, then check which one your arrows are actually pointing at. If you only meant one molecule to be there, delete the duplicate rather than renaming it.",
  },
});
