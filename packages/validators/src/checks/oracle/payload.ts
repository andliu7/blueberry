import {
  IMPLICIT_HYDROGEN,
  LONE_PAIR,
  isSpectator,
  type Atom,
  type Bond,
  type MechanismState,
  type Species,
} from "@blueberry/chem-core";

/**
 * The wire format between this package and packages/validators/python.
 *
 * The shape is documented once, in packages/validators/python/CONTRACT.md, and these
 * types are that document expressed in TypeScript. They are deliberately a field for
 * field copy of the chem-core model rather than a convenient flattening, so that
 * serializeState() below is a transcription with no chemistry in it. Anything clever
 * here would be a second chemistry implementation sitting between the engine and the
 * oracle that is supposed to grade the engine.
 *
 * The two chem-core sentinels travel as their literal string values. They are re-exported
 * from chem-core rather than retyped, because a typo in "@implicitH" would read to the
 * sidecar as a stereo slot naming an atom that does not exist, which it reports, and to a
 * reader here as a working line of code.
 */

export const ORACLE_PROTOCOL = "blueberry-oracle";
export const ORACLE_VERSION = 1;

export const STEREO_SENTINELS = {
  implicitHydrogen: IMPLICIT_HYDROGEN,
  lonePair: LONE_PAIR,
} as const;

export interface AtomStereoPayload {
  readonly kind: "tetrahedral";
  readonly neighbors: readonly string[];
  readonly parity: "clockwise" | "counterclockwise";
  readonly authoredDescriptor: "R" | "S" | null;
}

export interface BondStereoPayload {
  readonly kind: "doubleBond";
  readonly reference: readonly [string, string];
  readonly arrangement: "cis" | "trans";
  readonly authoredDescriptor: "E" | "Z" | null;
}

export interface AtomPayload {
  readonly id: string;
  readonly element: string;
  readonly isotope: number | null;
  readonly formalCharge: number;
  readonly lonePairs: number;
  readonly unpairedElectrons: number;
  readonly implicitHydrogens: number;
  readonly stereo: AtomStereoPayload | null;
}

export interface BondPayload {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  readonly order: number;
  readonly stereo: BondStereoPayload | null;
}

export interface SpeciesPayload {
  readonly id: string;
  readonly label: string | null;
  readonly atoms: readonly AtomPayload[];
  readonly bonds: readonly BondPayload[];
}

/**
 * An author's recorded, attackable claim that RDKit may refuse this state.
 *
 * CLAUDE.md: RDKit aromaticity perception is a model, not ground truth, and legitimate
 * reactive intermediates can fail its sanitisation. This is the same shape as a spectator
 * declaration in chem-core/src/state.ts and for the same reason: an escape hatch that
 * nobody signed is a blanket one. See CONTRACT.md for the four cases the sanitisation
 * check draws from it, two of which are failures.
 */
export interface SanitizationMayFail {
  readonly expectedError: string;
  readonly justification: string;
  readonly declaredBy: string;
}

export interface StatePayload {
  /** Opaque human readable origin. The sidecar echoes it, never parses it. */
  readonly stateRef: string;
  readonly id: string;
  readonly sanitizationMayFail: SanitizationMayFail | null;
  readonly species: readonly SpeciesPayload[];
}

export interface OracleRequest {
  readonly protocol: typeof ORACLE_PROTOCOL;
  readonly version: typeof ORACLE_VERSION;
  readonly states: readonly StatePayload[];
}

/* -------------------------------------------------------------------------- */
/* Response                                                                    */
/* -------------------------------------------------------------------------- */

export interface SanitizationResult {
  readonly ok: boolean;
  readonly errorKind: string | null;
  readonly error: string | null;
}

export interface AtomDescriptorResult {
  readonly atomId: string;
  readonly rdkit: "R" | "S" | null;
  readonly authored: "R" | "S" | null;
  readonly agrees: boolean;
}

export interface BondDescriptorResult {
  readonly bondId: string;
  readonly rdkit: "E" | "Z" | null;
  readonly authored: "E" | "Z" | null;
  readonly agrees: boolean;
}

export interface MesoResult {
  readonly isMeso: boolean;
  readonly definedTetrahedralCenters: number;
  readonly canonicalSmiles: string;
  readonly mirrorCanonicalSmiles: string;
}

export interface SpeciesResult {
  readonly id: string;
  readonly label: string | null;
  readonly sanitization: SanitizationResult;
  readonly canonicalSmiles: string | null;
  readonly atomDescriptors: readonly AtomDescriptorResult[];
  readonly bondDescriptors: readonly BondDescriptorResult[];
  readonly unspecifiedPotentialStereo: readonly { readonly kind: string; readonly ref: string | null }[];
  readonly meso: MesoResult | null;
  readonly aromaticAtomIds: readonly string[];
  readonly aromaticBondIds: readonly string[];
  readonly aromaticRingCount: number | null;
}

export interface StateResult {
  readonly stateRef: string;
  readonly id: string;
  readonly sanitizationMayFail: SanitizationMayFail | null;
  readonly species: readonly SpeciesResult[];
  readonly buildErrors: readonly string[];
}

export interface SelfTestCase {
  readonly name: string;
  readonly expected: string;
  readonly actual: string | null;
  readonly passed: boolean;
}

export interface OracleResponse {
  readonly protocol: string;
  readonly version: number;
  readonly rdkitVersion: string;
  readonly pythonVersion: string;
  readonly selfTest: { readonly passed: boolean; readonly cases: readonly SelfTestCase[] };
  readonly states: readonly StateResult[];
  readonly fatal: string | null;
}

/* -------------------------------------------------------------------------- */
/* Serialisation from chem-core                                                */
/* -------------------------------------------------------------------------- */

function serializeAtom(atom: Atom): AtomPayload {
  const stereo = atom.stereo;
  return {
    id: atom.id,
    element: atom.element,
    isotope: atom.isotope ?? null,
    formalCharge: atom.formalCharge,
    lonePairs: atom.lonePairs,
    unpairedElectrons: atom.unpairedElectrons,
    implicitHydrogens: atom.implicitHydrogens,
    stereo:
      stereo === undefined
        ? null
        : {
            kind: "tetrahedral",
            neighbors: [...stereo.neighbors],
            parity: stereo.parity,
            authoredDescriptor: stereo.authoredDescriptor ?? null,
          },
  };
}

function serializeBond(bond: Bond): BondPayload {
  const stereo = bond.stereo;
  return {
    id: bond.id,
    a: bond.a,
    b: bond.b,
    order: bond.order,
    stereo:
      stereo === undefined
        ? null
        : {
            kind: "doubleBond",
            reference: [stereo.reference[0], stereo.reference[1]],
            arrangement: stereo.arrangement,
            authoredDescriptor: stereo.authoredDescriptor ?? null,
          },
  };
}

export function serializeSpecies(species: Species): SpeciesPayload {
  return {
    id: species.id,
    label: species.label ?? null,
    atoms: species.atoms.map(serializeAtom),
    bonds: species.bonds.map(serializeBond),
  };
}

/**
 * Serialise a chem-core state for the oracle.
 *
 * Spectators are sent. They are excluded from conservation, which is a chem-core concern,
 * and they are still real molecules whose valence RDKit has an opinion about. A spectator
 * that does not sanitise is worth knowing about even though nothing is conserved across
 * it, and dropping it here would mean the oracle grades a different system than the
 * engine does.
 *
 * `role`, spectator justifications, and declared torsions are not sent, because RDKit has
 * no opinion about any of them and a field on the wire that nothing reads is a field that
 * will one day be wrong without anybody noticing.
 */
export function serializeState(
  state: MechanismState,
  stateRef: string,
  sanitizationMayFail: SanitizationMayFail | null = null,
): StatePayload {
  return {
    stateRef,
    id: state.id,
    sanitizationMayFail,
    species: state.members.map((member) => serializeSpecies(member.species)),
  };
}

/** Species ids in a state that carry a spectator declaration. Reporting only. */
export function spectatorSpeciesIds(state: MechanismState): readonly string[] {
  return state.members
    .filter((member) => isSpectator(state, member.species.id))
    .map((member) => member.species.id);
}
