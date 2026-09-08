/**
 * Category: success. Three causes.
 *
 * CLAUDE.md: "A correct step says why it was right, because a student who
 * guesses correctly has learned nothing." So these three get the same three
 * fields as every failure. `whatYouDid` says what was recognised, `why` says
 * what made it work, and `lookAt` gives the thing to carry to the next problem
 * rather than praise.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type SuccessCauseId = Extract<
  CauseId,
  "matches_requested_route" | "alternative_route_same_product" | "valid_transformation_not_requested"
>;

export const SUCCESS_COPY: Readonly<Record<SuccessCauseId, CauseCopy>> = Object.freeze({
  matches_requested_route: {
    whatYouDid: "You drew the mechanism the question asked for, and every arrow lands where it should.",
    why: "Each arrow starts on real electron density, a lone pair or a bond, and ends somewhere that can take it. Mass, charge, and electron count all balance across the step, so nothing appeared out of nowhere and nothing went missing.",
    lookAt: "Name the nucleophile and the electrophile in this step out loud. If you can do that without looking back at the drawing, the step will transfer to a molecule you have not seen before.",
  },
  alternative_route_same_product: {
    whatYouDid: "You reached the right product by a different route from the one the question had in mind.",
    why: "More than one mechanism can end at the same structure. Every step you drew holds up on its own, which makes this a second correct answer rather than a near miss.",
    lookAt: "Put your route next to the one that was asked for and find the step where they separate. The conditions in the question, solvent, base strength, temperature, are what decide which of the two a real flask takes.",
  },
  valid_transformation_not_requested: {
    whatYouDid: "This is a real reaction, and it is a different one from the reaction the question asked for.",
    why: "Every step you drew is chemically sound. The product is a different compound, which almost always means a different site was attacked or a competing pathway was followed to the end.",
    lookAt: "The target structure is the fastest way in. Mark every bond in it that differs from the starting material, and those bonds name the atoms that have to be joined and the ones that have to come apart.",
  },
});
