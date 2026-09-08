/**
 * The element table.
 *
 * Deliberately small. It covers the elements an undergraduate mechanism course
 * actually draws, plus the metals that show up in reagents. Adding an element is
 * a one line edit; guessing at properties for elements nobody uses is how a
 * lookup table becomes wrong in a place nobody notices.
 *
 * The numbers here are for bookkeeping, not for simulation. `valenceElectrons`
 * is the one that matters most, because formal charge is derived from it:
 *
 *   formalCharge = valenceElectrons - nonbondingElectrons - bondOrderSum
 *
 * where nonbondingElectrons is 2 * lonePairs + unpairedElectrons, and
 * bondOrderSum counts implicit hydrogens as order one bonds.
 */

export type Element =
  | "H"
  | "B"
  | "C"
  | "N"
  | "O"
  | "F"
  | "Si"
  | "P"
  | "S"
  | "Cl"
  | "Br"
  | "I"
  | "Li"
  | "Na"
  | "K"
  | "Mg"
  | "Al"
  | "Zn"
  | "Cu";

export interface ElementProperties {
  readonly symbol: Element;
  readonly atomicNumber: number;
  readonly period: number;
  /** Group electrons for the neutral atom. Drives the formal charge formula. */
  readonly valenceElectrons: number;
  /** Standard atomic weight, for display and for sanity checks only. */
  readonly standardAtomicWeight: number;
  /**
   * Whether the octet rule and the formal charge formula are trustworthy here.
   *
   * False for transition metals, where electron counting needs a different
   * model. A validator should skip octet reasoning on those atoms rather than
   * report a violation it does not understand.
   */
  readonly mainGroup: boolean;
  /**
   * The most valence electrons that may surround this atom before the structure
   * is considered impossible rather than merely unusual.
   *
   * Two for hydrogen and lithium, eight for period two, twelve for period three
   * and below where d orbitals make hypervalency real. This is a ceiling, not an
   * expectation: neutral boron sits happily at six.
   */
  readonly maxValenceElectrons: number;
  /**
   * Bond order sums seen on the neutral, uncharged atom. Used to explain an
   * unusual structure to a student, never to reject one on its own, because a
   * charged atom legitimately sits outside this list.
   */
  readonly commonNeutralValence: readonly number[];
}

export const ELEMENTS: Readonly<Record<Element, ElementProperties>> = Object.freeze({
  H: {
    symbol: "H",
    atomicNumber: 1,
    period: 1,
    valenceElectrons: 1,
    standardAtomicWeight: 1.008,
    mainGroup: true,
    maxValenceElectrons: 2,
    commonNeutralValence: [1],
  },
  B: {
    symbol: "B",
    atomicNumber: 5,
    period: 2,
    valenceElectrons: 3,
    standardAtomicWeight: 10.81,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [3],
  },
  C: {
    symbol: "C",
    atomicNumber: 6,
    period: 2,
    valenceElectrons: 4,
    standardAtomicWeight: 12.011,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [4],
  },
  N: {
    symbol: "N",
    atomicNumber: 7,
    period: 2,
    valenceElectrons: 5,
    standardAtomicWeight: 14.007,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [3],
  },
  O: {
    symbol: "O",
    atomicNumber: 8,
    period: 2,
    valenceElectrons: 6,
    standardAtomicWeight: 15.999,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [2],
  },
  F: {
    symbol: "F",
    atomicNumber: 9,
    period: 2,
    valenceElectrons: 7,
    standardAtomicWeight: 18.998,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [1],
  },
  Si: {
    symbol: "Si",
    atomicNumber: 14,
    period: 3,
    valenceElectrons: 4,
    standardAtomicWeight: 28.085,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [4],
  },
  P: {
    symbol: "P",
    atomicNumber: 15,
    period: 3,
    valenceElectrons: 5,
    standardAtomicWeight: 30.974,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [3, 5],
  },
  S: {
    symbol: "S",
    atomicNumber: 16,
    period: 3,
    valenceElectrons: 6,
    standardAtomicWeight: 32.06,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [2, 4, 6],
  },
  Cl: {
    symbol: "Cl",
    atomicNumber: 17,
    period: 3,
    valenceElectrons: 7,
    standardAtomicWeight: 35.45,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [1],
  },
  Br: {
    symbol: "Br",
    atomicNumber: 35,
    period: 4,
    valenceElectrons: 7,
    standardAtomicWeight: 79.904,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [1],
  },
  I: {
    symbol: "I",
    atomicNumber: 53,
    period: 5,
    valenceElectrons: 7,
    standardAtomicWeight: 126.904,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [1],
  },
  Li: {
    symbol: "Li",
    atomicNumber: 3,
    period: 2,
    valenceElectrons: 1,
    standardAtomicWeight: 6.94,
    mainGroup: true,
    maxValenceElectrons: 2,
    commonNeutralValence: [1],
  },
  Na: {
    symbol: "Na",
    atomicNumber: 11,
    period: 3,
    valenceElectrons: 1,
    standardAtomicWeight: 22.99,
    mainGroup: true,
    maxValenceElectrons: 2,
    commonNeutralValence: [1],
  },
  K: {
    symbol: "K",
    atomicNumber: 19,
    period: 4,
    valenceElectrons: 1,
    standardAtomicWeight: 39.098,
    mainGroup: true,
    maxValenceElectrons: 2,
    commonNeutralValence: [1],
  },
  Mg: {
    symbol: "Mg",
    atomicNumber: 12,
    period: 3,
    valenceElectrons: 2,
    standardAtomicWeight: 24.305,
    mainGroup: true,
    maxValenceElectrons: 8,
    commonNeutralValence: [2],
  },
  Al: {
    symbol: "Al",
    atomicNumber: 13,
    period: 3,
    valenceElectrons: 3,
    standardAtomicWeight: 26.982,
    mainGroup: true,
    maxValenceElectrons: 12,
    commonNeutralValence: [3],
  },
  Zn: {
    symbol: "Zn",
    atomicNumber: 30,
    period: 4,
    valenceElectrons: 12,
    standardAtomicWeight: 65.38,
    mainGroup: false,
    maxValenceElectrons: 18,
    commonNeutralValence: [2],
  },
  Cu: {
    symbol: "Cu",
    atomicNumber: 29,
    period: 4,
    valenceElectrons: 11,
    standardAtomicWeight: 63.546,
    mainGroup: false,
    maxValenceElectrons: 18,
    commonNeutralValence: [1, 2],
  },
});

const ELEMENT_SYMBOLS = Object.freeze(Object.keys(ELEMENTS) as Element[]);

export function allElements(): readonly Element[] {
  return ELEMENT_SYMBOLS;
}

export function isElement(symbol: string): symbol is Element {
  return Object.prototype.hasOwnProperty.call(ELEMENTS, symbol);
}

/**
 * Properties for an element. Throws rather than returning undefined, because
 * every caller in this package has already established the symbol is valid and
 * an optional return here would spread `?.` through all of them.
 */
export function elementProperties(element: Element): ElementProperties {
  const properties = ELEMENTS[element];
  if (properties === undefined) {
    throw new Error(`Unknown element: ${element}`);
  }
  return properties;
}
