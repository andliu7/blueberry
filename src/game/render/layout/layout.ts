/**
 * State layout: where each atom of a MechanismState sits on the canvas.
 *
 * Pure TypeScript, no React, no DOM. This is deliberately a separate layer from
 * the renderers: chem-core states carry chemistry and no coordinates (correct,
 * per its purity rule), and a renderer needs coordinates. Everything here is
 * presentation. When the Expo app arrives this module can lift into a shared
 * package unchanged; it is kept React-free for exactly that move, and it is not
 * a package today because speculative packages with one consumer are how
 * repositories rot.
 *
 * Units: one standard bond length = 1 scene unit. Renderers scale to pixels.
 *
 * Two sources of positions:
 *   - Authored hints: a fixture or problem ships atom positions, the way CIP
 *     labels are precomputed at authoring time. Preferred whenever the scene
 *     composition matters (a backside attack must LOOK backside).
 *   - Auto layout: a plain breadth-first placement at 120 degree branches for
 *     states nobody authored. It is legible, not beautiful; that is enough for
 *     a fallback and it keeps the renderer contract total over all states.
 */

import type { AtomId, MechanismState, Species } from "@blueberry/chem-core";
import { neighborIds } from "@blueberry/chem-core";
import type { Vec } from "./vec";
import { add, angleOf, fromAngle, normalize, scale, sub, vec } from "./vec";

export interface AtomPlacement {
  readonly pos: Vec;
  /**
   * Direction (radians, xy plane) with the most free space around the atom:
   * away from the mean of its bond directions. The implicit hydrogen arc lives
   * here, per the Alchemie observation that hydrogens on a faint arc beat
   * hydrogens as bonded nodes.
   */
  readonly openAngle: number;
  /**
   * Where the formal charge badge sits: outside the silhouette, rotated off the
   * hydrogen arc so the two never fight for the same pixels.
   */
  readonly badgeAngle: number;
}

export interface StateLayout {
  readonly atoms: ReadonlyMap<AtomId, AtomPlacement>;
}

/** Authored positions, atom id to scene coordinates. z optional, defaults 0. */
export type LayoutHints = Readonly<
  Record<string, { readonly x: number; readonly y: number; readonly z?: number }>
>;

const BOND_LENGTH = 1;
const SPECIES_GAP = 1.6;

/**
 * The open direction around an atom: opposite the average of its bond
 * directions. An unbonded atom opens upward; an atom whose bonds cancel out
 * (perfectly linear) opens perpendicular to its first bond.
 */
function openDirection(species: Species, atomId: AtomId, positions: Map<AtomId, Vec>): number {
  const here = positions.get(atomId);
  if (here === undefined) return -Math.PI / 2;
  let sum = vec(0, 0, 0);
  let bondCount = 0;
  for (const neighbor of neighborIds(species, atomId)) {
    const there = positions.get(neighbor);
    if (there === undefined) continue;
    sum = add(sum, normalize(sub(there, here)));
    bondCount += 1;
  }
  if (bondCount === 0) return -Math.PI / 2;
  const mag = Math.hypot(sum.x, sum.y);
  if (mag < 1e-6) {
    // Linear atom: open perpendicular to the first bond.
    const first = neighborIds(species, atomId)[0];
    const there = first !== undefined ? positions.get(first) : undefined;
    if (there === undefined) return -Math.PI / 2;
    return angleOf(sub(there, here)) + Math.PI / 2;
  }
  return angleOf(scale(sum, -1));
}

/** Breadth-first auto placement of one species, root at origin. */
function autoPlaceSpecies(species: Species): Map<AtomId, Vec> {
  const positions = new Map<AtomId, Vec>();
  const first = species.atoms[0];
  if (first === undefined) return positions;
  positions.set(first.id, vec(0, 0));
  const queue: AtomId[] = [first.id];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    const here = positions.get(current);
    if (here === undefined) continue;
    const unplaced = neighborIds(species, current).filter((id) => !positions.has(id));
    // Fan unplaced neighbors around the open direction at 120 degree steps.
    const base = openDirection(species, current, positions);
    unplaced.forEach((id, index) => {
      const offset = (index - (unplaced.length - 1) / 2) * ((2 * Math.PI) / 3);
      positions.set(id, add(here, fromAngle(base + offset, BOND_LENGTH)));
      queue.push(id);
    });
  }
  return positions;
}

function bounds(positions: Iterable<Vec>): { minX: number; maxX: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  if (minX === Infinity) return { minX: 0, maxX: 0 };
  return { minX, maxX };
}

/**
 * Lay out a full state.
 *
 * With hints: every atom must be hinted; a half-hinted state would silently mix
 * authored and automatic coordinates and produce scenes nobody designed, so it
 * throws instead. Without hints: species are auto-placed and tiled left to
 * right with a gap.
 */
export function layoutState(state: MechanismState, hints?: LayoutHints): StateLayout {
  const positions = new Map<AtomId, Vec>();

  if (hints !== undefined) {
    for (const member of state.members) {
      for (const atom of member.species.atoms) {
        const hint = hints[atom.id];
        if (hint === undefined) {
          throw new Error(
            `layoutState: hints were provided but atom ${atom.id} has none. ` +
              `Hints are all or nothing per state.`,
          );
        }
        positions.set(atom.id, vec(hint.x, hint.y, hint.z ?? 0));
      }
    }
  } else {
    let cursorX = 0;
    for (const member of state.members) {
      const local = autoPlaceSpecies(member.species);
      const { minX, maxX } = bounds(local.values());
      for (const [id, p] of local) {
        positions.set(id, vec(p.x - minX + cursorX, p.y, p.z));
      }
      cursorX += maxX - minX + SPECIES_GAP;
    }
  }

  const atoms = new Map<AtomId, AtomPlacement>();
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      const pos = positions.get(atom.id);
      if (pos === undefined) continue;
      const openAngle = openDirection(member.species, atom.id, positions);
      // Badge sits 130 degrees off the hydrogen arc when the arc is occupied,
      // otherwise it takes the open direction itself.
      const badgeAngle = atom.implicitHydrogens > 0 ? openAngle + 2.27 : openAngle;
      atoms.set(atom.id, { pos, openAngle, badgeAngle });
    }
  }
  return { atoms };
}

export function requirePlacement(layout: StateLayout, atomId: AtomId): AtomPlacement {
  const placement = layout.atoms.get(atomId);
  if (placement === undefined) {
    throw new Error(`No placement for atom ${atomId}`);
  }
  return placement;
}
