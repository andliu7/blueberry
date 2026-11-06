/**
 * A turnable ball-and-stick model (ADDED 3 Nov, Unit 1 review suggestion 9):
 * the types the generated models use, and the pure maths that turns one and
 * lays it out flat. No chemistry here: coordinates come from RDKit
 * (scripts/u1_pools_cd.py section 7c). Drawn by Model3DView.tsx as plain SVG,
 * so no 3-D library is loaded for it.
 */

export interface Model3DAtom {
  readonly el: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Model3DBond {
  readonly a: number;
  readonly b: number;
  readonly order?: 2;
}

export interface Model3D {
  readonly smiles: string;
  /** endo or exo for each dienophile substituent, measured on these coordinates. */
  readonly labels: readonly string[];
  readonly atoms: readonly Model3DAtom[];
  readonly bonds: readonly Model3DBond[];
}

export interface PlacedAtom {
  readonly index: number;
  readonly el: string;
  /** Screen position, y down, in the model's own units. */
  readonly sx: number;
  readonly sy: number;
  /** Toward the viewer is larger. */
  readonly depth: number;
}

/**
 * Turn the model by `yaw` (about the vertical axis) then `pitch` (about the
 * horizontal one), both in radians, and project it straight on: x right, y up
 * on the page, z toward the viewer.
 */
export function place(model: Model3D, yaw: number, pitch: number): readonly PlacedAtom[] {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return model.atoms.map((atom, index) => {
    const x1 = atom.x * cy + atom.z * sy;
    const z1 = -atom.x * sy + atom.z * cy;
    const y2 = atom.y * cp - z1 * sp;
    const z2 = atom.y * sp + z1 * cp;
    return { index, el: atom.el, sx: x1, sy: -y2, depth: z2 };
  });
}

/** The largest distance of any atom from the centre, for a frame that fits every turn. */
export function radius(model: Model3D): number {
  return Math.max(1, ...model.atoms.map((a) => Math.hypot(a.x, a.y, a.z)));
}
