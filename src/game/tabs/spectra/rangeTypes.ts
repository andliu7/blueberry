/** Shapes of rangeChart.generated.ts, written by scripts/gen_spectra.py --ranges. */

export type RangeMode = "ir" | "h1" | "c13";

/** The bond or atom family, which picks the box colour (O red, N blue, C slate, C=O amber, halogen green). */
export type RangeFamily = "O" | "N" | "C" | "CO" | "X";

export interface RangeMolecule {
  readonly smiles: string;
  readonly name: string;
  /** RDKit drawing, viewBox cropped to the molecule, the feature filled with var(--sp-hl). */
  readonly svg: string;
  /** The generator's additive estimate for the highlighted H or C (NMR only), when it falls in the box. */
  readonly estimate?: number;
}

export interface RangeShift {
  /** ewg: a withdrawing neighbour; edg: a donating one; conj: conjugation; strain: ring strain; hbond: hydrogen bonding. */
  readonly kind: "ewg" | "edg" | "conj" | "strain" | "hbond";
  readonly label: string;
  readonly hi: number;
  readonly lo: number;
  readonly why: string;
  readonly example?: RangeMolecule;
}

export interface RangeBox {
  readonly id: string;
  readonly mode: RangeMode;
  readonly family: RangeFamily;
  /** Two to six characters on the card, e.g. "O–H". */
  readonly label: string;
  readonly title: string;
  /** What the box represents, in plain words: "An H on an O". */
  readonly represents: string;
  readonly hi: number;
  readonly lo: number;
  readonly shape: "broad" | "sharp";
  /** IR only. */
  readonly strength?: "strong" | "medium" | "weak";
  readonly why: string;
  readonly example: RangeMolecule;
  readonly shifts: readonly RangeShift[];
}
