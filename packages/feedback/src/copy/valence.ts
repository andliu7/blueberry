/**
 * Category: valence. Five causes, all blocking.
 *
 * These are the structures that cannot exist at all, so the copy does not hedge.
 * Each `lookAt` names a specific count to do at a specific atom, because the fix
 * for a valence error is always arithmetic on one centre.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type ValenceCauseId = Extract<
  CauseId,
  | "valence_exceeded"
  | "octet_expanded_on_period_two"
  | "impossible_hydrogen_count"
  | "formal_charge_disagrees_with_structure"
  | "electron_count_not_integral"
>;

export const VALENCE_COPY: Readonly<Record<ValenceCauseId, CauseCopy>> = Object.freeze({
  valence_exceeded: {
    whatYouDid: "That atom has more bonds than it can hold.",
    why: "How many bonds an atom can make is set by how many valence orbitals it has. Carbon has four, neutral nitrogen three plus a lone pair, neutral oxygen two plus two lone pairs. A fifth bond on carbon has no orbital to live in.",
    lookAt: "Count the bonds at the highlighted atom, taking a double bond as two and a triple as three, then add the hydrogens that are not drawn. If something new bonded here, something else has to leave in the same step, and that departure needs its own arrow.",
  },
  octet_expanded_on_period_two: {
    whatYouDid: "There are more than eight valence electrons around a second row atom here.",
    why: "Carbon, nitrogen, oxygen, and fluorine have one 2s and three 2p orbitals and nothing else low enough in energy to use. Four orbitals hold eight electrons, and that is the ceiling. Third row elements such as sulfur and phosphorus can carry more, which is why the same drawing one row down is fine.",
    lookAt: "Add up lone pair electrons plus bonding electrons at that atom. If you need a new bond there, draw the bond that breaks at the same time, so the count stays at eight.",
  },
  impossible_hydrogen_count: {
    whatYouDid: "This step takes more hydrogens off an atom than it had.",
    why: "Hydrogens that are not drawn are still real atoms. An atom cannot carry a negative number of them, so the structure this step lands on has no way to exist.",
    lookAt: "Write the implicit hydrogens onto the highlighted atom before you move anything. Then check that the proton you took really was on that carbon and not on the neighbouring one.",
  },
  formal_charge_disagrees_with_structure: {
    whatYouDid: "The charge on that atom does not match the electrons drawn around it.",
    why: "Formal charge is not chosen separately from the drawing, it falls out of it. It is the free atom's valence electron count, minus the electrons in its lone pairs, minus one for each bond. Oxygen with three bonds and one lone pair comes out at plus one no matter what symbol sits beside it.",
    lookAt: "That subtraction at the highlighted atom settles which half to fix. If it gives the charge you wanted, the structure is right and the symbol is wrong. If it does not, a bond or a lone pair is in the wrong place.",
  },
  electron_count_not_integral: {
    whatYouDid: "An atom is left holding a fraction of an electron.",
    why: "A single barbed arrow, a fishhook, moves one electron. Homolysis sends one electron to each fragment, so fishhooks come in pairs. A lone fishhook accounts for one electron of the bond and leaves the other one unassigned, which is where the fraction comes from.",
    lookAt: "Find the second fishhook and draw it. Both electrons of the breaking bond go somewhere, so there are always two arrows leaving that bond, one to each side.",
  },
});
