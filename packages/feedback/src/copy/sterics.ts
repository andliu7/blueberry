/**
 * Category: sterics. Three causes, two advisory and one blocking.
 *
 * This category is where the graded chemistry rule in CLAUDE.md bites hardest.
 * Neopentyl SN2 is roughly ten to the minus five relative to ethyl and is
 * explicitly NOT blocked, because the methyl shift to the tertiary cation is the
 * actual lesson and a boolean reject deletes it. So the two advisory entries
 * name the competing pathway in the prose and carry it in `competingRoutes` as
 * well, and neither one tells the student they are wrong.
 *
 * `nucleophile_cannot_reach_backside` is the one that blocks, and its copy says
 * why it is different from the other two rather than leaving the student to
 * wonder why one crowded centre is advice and another is a hard stop.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type StericsCauseId = Extract<
  CauseId,
  "sn2_center_strongly_hindered" | "sn2_at_tertiary_center" | "nucleophile_cannot_reach_backside"
>;

export const STERICS_COPY: Readonly<Record<StericsCauseId, CauseCopy>> = Object.freeze({
  sn2_center_strongly_hindered: {
    whatYouDid:
      "You ran a backside attack on a carbon that has a bulky group sitting right next to it.",
    why: "This reaction happens, and it is very slow. A neopentyl centre goes by SN2 around a hundred thousand times slower than an ethyl one, because the tert-butyl group next door sits in the path the nucleophile has to travel along. Slow enough that a competing route often gets there first: a methyl group shifts across as the leaving group departs, which gives a tertiary carbocation, and the nucleophile or the solvent traps that. The product then has a rearranged carbon skeleton.",
    lookAt: "Keep the SN2 you drew and put the methyl shift beside it, then compare the two products. Which one wins depends on the nucleophile: a strong one in a polar aprotic solvent can still push the slow substitution through unrearranged, while weak nucleophile solvolysis conditions give the rearranged skeleton. The shift is usually what the question is testing, because the product skeleton is not the one you started with.",
    competingRoutes: ["carbocation_rearrangement"],
  },
  sn2_at_tertiary_center: {
    whatYouDid: "You attacked the backside of a carbon that already carries three alkyl groups.",
    why: "Nothing here is impossible, but all three groups sit across the line the nucleophile has to approach along, so backside attack is very slow. A tertiary centre normally ionises first and the nucleophile or the solvent traps the cation, and if the base is strong it takes a proton from a neighbouring carbon and gives the alkene instead.",
    lookAt: "Read the conditions and see which of those two they favour. A weak nucleophile in a polar protic solvent points at ionisation, and a strong or bulky base points at elimination. Draw the ionisation step and check whether it explains the given product better than your route does.",
    competingRoutes: ["sn1", "e2"],
  },
  nucleophile_cannot_reach_backside: {
    whatYouDid: "This step attacks the back face of a carbon that has no reachable back face.",
    why: "At a bridgehead in a small bicyclic system the cage holds that carbon rigid, and the position directly opposite the leaving group points into the ring framework. Nothing can approach from there without tearing the cage apart. A crowded centre is slow; this one is geometrically impossible.",
    lookAt: "Small bridgehead positions do not do backside attack, and for a related geometric reason they do not ionise easily either, because the cation cannot flatten out. Look for the reaction happening somewhere else on the molecule.",
  },
});
