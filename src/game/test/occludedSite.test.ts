/**
 * A forming-bond site is never offered THROUGH another atom.
 *
 * The bug this pins, reported by the owner in the first minute of dragging on
 * the real canvas: hydroxide attacking bromomethane lays out linearly, O-C-Br,
 * and with the oxygen armed a betweenAtomsSite was offered for every unbonded
 * pair, (O, C) and (O, Br) both. The (O, Br) site is centred on the midpoint of
 * O and Br, which in a linear layout sits exactly ON the carbon. So a drag from
 * the oxygen toward the carbon entered the (O, Br) site's circle before it ever
 * reached the carbon, that site won the hit test, and the arrow snapped to
 * bromine. "Which shouldn't even be allowed" is the correct reading: a sigma
 * bond cannot form through the middle of another atom.
 *
 * The same phantom site is what a blind critic in round 8 described as a dashed
 * line crossing the carbon and continuing onto the C-Br bond, read as a second
 * electron path toward the bond that breaks. One bug, two sightings.
 */

import { describe, expect, it } from "vitest";

import { layoutState } from "../render/layout/layout";
import { buildStepScene } from "../render/layout/stepScene";
import { buildTargets } from "../tabs/trainer/hitLayout";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../demo/sn2Step";

const scene = buildStepScene(
  SN2_DEMO_STEP,
  layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS),
  layoutState(SN2_DEMO_STEP.to, SN2_TO_HINTS),
);

function betweenSites(armed: string) {
  return buildTargets(SN2_DEMO_STEP, scene, [], armed)
    .map((entry) => entry.target)
    .filter((target) => target.kind === "betweenAtomsSite");
}

describe("betweenAtomsSite occlusion", () => {
  it("does not offer O to Br through the carbon when the oxygen is armed", () => {
    const pairs = betweenSites("o1").map((site) => (site.kind === "betweenAtomsSite" ? [...site.atomIds].sort().join("~") : ""));
    expect(pairs).not.toContain(["br1", "o1"].sort().join("~"));
  });

  it("still offers the O to C site, which is the answer's own sink", () => {
    const pairs = betweenSites("o1").map((site) => (site.kind === "betweenAtomsSite" ? [...site.atomIds].sort().join("~") : ""));
    expect(pairs).toContain(["c1", "o1"].sort().join("~"));
  });

  it("is symmetric: bromine armed cannot reach the oxygen through the carbon either", () => {
    const pairs = betweenSites("br1").map((site) => (site.kind === "betweenAtomsSite" ? [...site.atomIds].sort().join("~") : ""));
    expect(pairs).not.toContain(["br1", "o1"].sort().join("~"));
  });

  it("the middle atom itself keeps its unoccluded site: carbon armed still reaches oxygen", () => {
    // The hydroxide hydrogen is explicit now (owner ruling 2026-08-25) and it
    // sits off the O-C-Br axis, so the axis still holds exactly three atoms.
    // Arming the CARBON asks the rule the question from the middle atom's own
    // seat: its line to the oxygen crosses nothing, so the site must survive.
    // A fix that deleted every long site would be worse than the bug.
    const pairs = betweenSites("c1").map((site) => (site.kind === "betweenAtomsSite" ? [...site.atomIds].sort().join("~") : ""));
    expect(pairs).toContain(["c1", "o1"].sort().join("~"));
  });
});
