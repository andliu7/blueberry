/** Shapes of the data scripts/gen_spectra.py writes (RDKit-derived, never typed by hand). */

export interface H1Peak {
  readonly shift: number;
  readonly nH: number;
  /** s, d, t, q, quint, sext, sept or m. */
  readonly mult: string;
  readonly env: string;
  readonly exch: boolean;
  /** Coupling constant in Hz used to draw the multiplet (a typical vicinal value, not a measurement). */
  readonly j: number;
  /** Heavy-atom indices (into the compound's coords) that carry this signal's H. */
  readonly atoms: readonly number[];
}

export interface C13Peak {
  readonly shift: number;
  readonly nC: number;
  readonly env: string;
  readonly atoms: readonly number[];
}

export interface IrBand {
  readonly lo: number;
  readonly hi: number;
  readonly label: string;
  readonly strength: "strong" | "medium" | "weak";
  readonly broad: boolean;
}

export interface SpectraCompound {
  readonly id: string;
  readonly smiles: string;
  /** Search label only; the structure and peaks come from the SMILES. */
  readonly name: string;
  readonly formula: string;
  readonly dou: number;
  readonly svg: string;
  /** Each atom's [x, y] inside the 260 x 190 viewBox of `svg`, from RDKit's drawer. */
  readonly coords: readonly (readonly [number, number])[];
  readonly h1: readonly H1Peak[];
  readonly c13: readonly C13Peak[];
  readonly ir: readonly IrBand[];
}

export interface DrawnMolecule {
  readonly smiles: string;
  readonly svg: string;
  readonly formula: string;
  /** Atom positions in the svg's 260 x 190 viewBox. Only the answer options carry them. */
  readonly coords?: readonly (readonly [number, number])[];
}

export interface NmrProductQuestion {
  readonly id: string;
  readonly start: DrawnMolecule;
  readonly reagent: string;
  readonly options: readonly DrawnMolecule[];
  readonly answer: number;
  readonly product: {
    readonly formula: string;
    readonly dou: number;
    readonly h1: readonly H1Peak[];
    readonly c13: readonly C13Peak[];
    readonly ir: readonly IrBand[];
  };
}
