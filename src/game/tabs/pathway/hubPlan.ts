/**
 * The EAS hub and its petals, authored once as data. Pure: no React, no DOM.
 *
 * docs/DESIGN-GOALS.md branch vocabulary: "HUB with petals is reserved for
 * categories with three or more families (EAS, the acyl ladder)". The
 * committed shape is the hub diagram in
 * docs/reference/design-goals/blueberry_spec-node-types_1788291072.png. The
 * S3 critic named the absence on the exact unit the goals name: Unit 3,
 * Electrophilic Aromatic Substitution, rendered as a plain winding spine
 * with no hub anywhere in code. This file is the shape, built.
 *
 * WHY THESE NODES. The arenium sigma-complex mechanism is the HUB because it
 * is, in the map's own words, "the mechanism under every node here": every
 * EAS family is the same attack, cation, rearomatize story with a different
 * electrophile. The petals are the four reaction FAMILIES that share it,
 * which satisfies the three-or-more-families condition the goals reserve the
 * shape for: halogenation, nitration, sulfonation, Friedel-Crafts acylation.
 * Directing effects, blocking groups, reductions and sequencing stay on the
 * winding spine below the hub, because those are concepts and consequences
 * of the families rather than families themselves.
 *
 * FOUR petals is also a geometric decision: the spine ribbon passes
 * VERTICALLY through the hub centre (the centre carries the main trail
 * anchor), so the ring is rotated onto the diagonals and the vertical axis
 * stays clear. Five equal shares always park one petal on the top or the
 * bottom of the ring, exactly where the ribbon enters or leaves.
 *
 * This is PRESENTATION, not progress: state still comes from
 * deriveMapPathway, where only unit gates lock, so every petal is freely
 * orderable the moment the unit opens. A test asserts the named ids exist
 * with the kinds this layout assumes, so an authoring rename breaks a test
 * rather than the screen.
 */

export interface HubPlan {
  /** The unit the hub belongs to. */
  readonly unitId: string;
  /** The central node: the shared mechanism every petal runs on. */
  readonly hub: string;
  /** The reaction families around it, clockwise from the top. */
  readonly petals: readonly string[];
}

export const EAS_HUB: HubPlan = {
  unitId: "u3",
  hub: "u3-arenium",
  petals: ["u3-halo", "u3-nitration", "u3-fc-acyl", "u3-sulfo"],
};

/**
 * THE ACYL LADDER, the second and last unit the goals reserve a flower for.
 *
 * Same argument as EAS, in the other functional-group family: the tetrahedral
 * intermediate is the mechanism under every acyl substitution on the map, and
 * the four petals are the reactivity levels that share it. The ladder node
 * itself (u8-ladder, the concept beat) stays on the spine, because the ladder
 * is the ORDERING of the families and not a family.
 */
export const ACYL_HUB: HubPlan = {
  unitId: "u8",
  hub: "u8-tetrahedral",
  petals: ["u8-acylcl-all", "u8-anhydride", "u8-hydrolysis", "u8-amide-hyd"],
};

/**
 * EVERY hub that ships, and the table is deliberately two rows long.
 *
 * docs/DESIGN-GOALS.md reserves the petal flower for "categories with three or
 * more families (EAS, the acyl ladder)". That is a named two-item list, so
 * unitShape.ts reads this table rather than inferring a flower from node
 * counts: the diamond is the DEFAULT unit shape and the hub is the exception,
 * and an exception that a heuristic can grow on its own stops being one. A
 * unit absent from this table cannot render a hub; a row whose nodes have
 * been renamed away degrades to the winding column and breaks a test.
 */
export const HUB_PLANS: readonly HubPlan[] = [EAS_HUB, ACYL_HUB];

/** Every node id the hub layout consumes, for membership tests. */
export function hubMemberIds(plan: HubPlan): ReadonlySet<string> {
  return new Set([plan.hub, ...plan.petals]);
}

export interface PetalPosition {
  /** Percent of the hub container's width, 0 to 100. */
  readonly x: number;
  /** Percent of the hub container's height, 0 to 100. */
  readonly y: number;
}

/** Where the hub's centre sits in its container, in percent. */
export const HUB_CENTRE: PetalPosition = { x: 50, y: 46 };

/**
 * The ring's radii, in container percent, exported so the geometry tests
 * assert the shipped values rather than re-deriving them.
 *
 * WHY NOT 34 ANY MORE. The attempt-2 critic measured the two upper petal
 * labels rendering partly BEHIND the arenium centre chip at 390px: a 34
 * percent ring on the 27rem container left about 36px between an upper
 * petal's chip edge and the centre chip's edge, and a plated label needs
 * about 60. The ring is wider now and the container taller (30rem in
 * pathway.css), so the diagonal gap fits a label between the chips: this
 * probe-measured geometry at 390px is a 96px chip-to-centre gap against a
 * two-line plated label's 47px, where ry 42 left a one-pixel corner graze.
 * rx stays at 38 so that at every count up to eight a petal keeps a chip
 * cell's room inside the container, the bound the geometry test sweeps. Belt
 * and braces, the labels also carry an opaque plate and paint above the
 * centre cell (pathway.css), so even a three-line outlier reads over the
 * chip instead of vanishing behind it.
 */
export const PETAL_RING = { rx: 38, ry: 44 } as const;

/**
 * Petal centres on a ring around the hub, in container percent.
 *
 * Deterministic arithmetic rather than CSS, because the spokes and the chips
 * have to agree on the same points: the spoke svg draws lines from
 * HUB_CENTRE to each of these, and the chips are absolutely positioned on
 * them, so the two can never drift apart. The ring is rotated HALF A SHARE
 * off vertical, so at the shipped even count the petals sit on the
 * diagonals and the vertical axis, which is where the spine ribbon enters
 * and leaves the hub, stays clear. Petals step clockwise in equal shares.
 * The radii are PETAL_RING, sized above so every chip and its plated label
 * stay inside the hub's 30rem tall, max-w-md column with label room
 * between petal and centre.
 */
export function petalPositions(count: number): readonly PetalPosition[] {
  if (count < 1) return [];
  const { rx, ry } = PETAL_RING;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + ((index + 0.5) * 2 * Math.PI) / count;
    return {
      x: Math.round((HUB_CENTRE.x + rx * Math.cos(angle)) * 10) / 10,
      y: Math.round((HUB_CENTRE.y + ry * Math.sin(angle)) * 10) / 10,
    };
  });
}
