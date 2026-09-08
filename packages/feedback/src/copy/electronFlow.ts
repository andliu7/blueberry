/**
 * Category: electron flow. Ten causes, all blocking.
 *
 * The arrow notation is the thing being taught here, not just the thing being
 * used, so every entry ends by sending the student to a concrete feature of the
 * drawing: the tail, the head, the octet, the list of bonds that changed.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type ElectronFlowCauseId = Extract<
  CauseId,
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
>;

export const ELECTRON_FLOW_COPY: Readonly<Record<ElectronFlowCauseId, CauseCopy>> = Object.freeze({
  arrow_source_has_no_electrons: {
    whatYouDid: "This arrow starts at a place with no electrons to give.",
    why: "The tail of an arrow sits on electron density, which means a lone pair or a bond. A positive charge, an empty orbital, or a bare nucleus has nothing to push.",
    lookAt: "Move the tail onto the lone pair or the bond that is doing the donating. If the site it starts from carries a positive charge, that site is the electrophile, so the arrow belongs pointing at it rather than starting from it.",
  },
  arrow_sink_cannot_accept_electrons: {
    whatYouDid: "This arrow points at a site that cannot take the electrons.",
    why: "An atom with a full octet and nothing to give up has no room for a new pair. Either something leaves at the same moment, or the electrons have nowhere to go.",
    lookAt: "Count the octet at the head of the arrow. If it is full, add the arrow that pushes a leaving group off that atom in the same step, or aim at a site that is genuinely electron poor.",
  },
  arrow_drawn_backwards: {
    whatYouDid: "You drew the arrow from the electrophile toward the nucleophile.",
    why: "Arrows track electrons, and electrons go from the electron rich site to the electron poor one. Drawn the other way, the arrow is describing atoms moving, which is not what the notation means.",
    lookAt: "Decide which of the two sites has the lone pair, the negative charge, or the pi bond. That end is the tail. The end carrying the partial positive charge is the head.",
  },
  arrow_count_disagrees_with_deltas: {
    whatYouDid: "Your arrows do not add up to the difference between the two structures you drew.",
    why: "The arrows are the explanation for the change, so the two have to agree. When they do not, either a bond moved with no arrow behind it, or an arrow claims a change that is not in the product you drew.",
    lookAt: "List every bond that differs between the two structures, then match each one to an arrow. Whatever is left unmatched on either list is the gap.",
  },
  arrow_endpoint_not_in_state: {
    whatYouDid: "One end of an arrow points at an atom or bond that is not in this structure.",
    why: "An arrow is anchored to a specific atom, not to a position on the page. An endpoint that names nothing usually means the structure was redrawn after the arrow was placed.",
    lookAt: "Reattach that end to an atom in the current structure. If the atom it was reaching for is genuinely gone, the step before this one is where it went, and the arrow belongs there instead.",
  },
  bond_change_without_arrow: {
    whatYouDid: "A bond formed or broke and there is no arrow for it.",
    why: "Bonds are made and broken by electrons moving, so every change in bonding has an arrow behind it. A bond that changes silently is the part of the step still waiting to be shown.",
    lookAt: "Compare the two structures bond by bond and find the one that changed. Then say where that bond's electrons came from, or where they went, and draw that arrow.",
  },
  too_many_arrows_at_one_center: {
    whatYouDid: "Several independent changes land on one atom in a single step.",
    why: "One elementary step is one transition state. Three unrelated things happening at the same atom means several energy barriers, which is several steps drawn on top of each other.",
    lookAt: "Splitting them apart is the fix. Decide which single change happens first, draw that step and the intermediate it gives, and start the next step from there. Concerted steps such as SN2 and E2 are the exception, and there every bond that changes is part of one continuous flow.",
  },
  radical_arrow_used_in_polar_step: {
    whatYouDid: "This step uses a single barbed fishhook arrow, and nothing in it is a radical.",
    why: "Fishhooks move one electron each and belong to homolysis and radical chains. In a polar step the electrons travel as pairs, so the arrows are full headed.",
    lookAt: "Check the conditions for a radical initiator. Peroxides, light, AIBN, or a halogen with heat mean radicals. Anything else, and every arrow in the step should be a double barbed arrow moving a pair.",
  },
  arrow_endpoints_not_adjacent: {
    whatYouDid: "This arrow runs between two places that are not touching.",
    why: "Electrons do not jump across the page. An arrow starts on a lone pair or a bond and ends on an atom that pair is already attached to, or on a bond being made to it, so the two ends always share an atom. Ends that share nothing describe a teleport rather than a reaction.",
    lookAt: "Find the shared atom. If there is not one, the movement you have in mind takes more than one arrow, so draw the chain: each arrow hands electrons to the next place along, and each one overlaps the one before it.",
  },
  arrow_declares_no_change: {
    whatYouDid: "This arrow starts and ends in the same place.",
    why: "An arrow is a claim that electron density moved. Taking a lone pair off an atom and putting the same pair back on the same atom, or emptying a bond into that same bond, claims nothing happened.",
    lookAt: "Decide what this arrow is meant to do, then move one end. If the pair becomes a bond, the head goes between the two atoms being joined. If a bond becomes a lone pair, the tail goes on the bond and the head goes on the atom that keeps the electrons.",
  },
});
