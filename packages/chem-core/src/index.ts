/**
 * @blueberry/chem-core
 *
 * The mechanism engine's data model. Pure TypeScript. No React, no DOM, no
 * rendering, no `three`, no RDKit, and no dependencies at all.
 *
 * What is in here, in the order it is worth reading:
 *
 *   ids.ts          Identifier aliases, and the invariant that atom ids are
 *                   stable across a step. Read this first.
 *   elements.ts     The element table. Formal charge is derived from it.
 *   atom.ts         Atoms and tetrahedral geometry. No CIP, ever.
 *   bond.ts         Bonds and double bond geometry. Orders 1, 2, 3 only.
 *   species.ts      One connected molecule or ion.
 *   state.ts        A multiset of species, and spectator declarations.
 *                   This is the system boundary rule.
 *   arrows.ts       Declared electron flow: source, sink, count.
 *   legality.ts     Whether one arrow is drawable at all, judged against the
 *                   `from` state alone. The per arrow half of the arrow check.
 *   routes.ts       The names of routes, elementary steps, transformations.
 *   step.ts         AXIS ONE. What a step is.
 *   causes.ts       The named cause registry. Countable by construction.
 *   resolution.ts   AXIS TWO. What an attempt resolved to.
 *   bookkeeping.ts  Counters for mass, charge, and electrons. Not checks.
 *   deltas.ts       What the arrows claim, and what the states show, computed
 *                   separately so comparing them means something.
 *   edit.ts         Immutable structural edits.
 *
 * Three things this package deliberately does not do, each with the reason
 * written at the top of the file that would otherwise host it:
 *
 *   It does not compute CIP descriptors. RDKit does, in CI, and the label is
 *   copied in at authoring time. See atom.ts and VERIFICATION.md S4.
 *
 *   It does not perceive aromaticity or canonicalise structures. That is
 *   Indigo's job and RDKit's job. See D3 in docs/INHERITED-DECISIONS.md.
 *
 *   It does not compute the product of a step from its arrows. If it did, the
 *   arrows would agree with the product by construction and the check that they
 *   agree would be checking nothing. See arrows.ts.
 */

export type { AtomId, BondId, SpeciesId, StateId, StepId, ArrowId, PathwayId, AttemptId } from "./ids.js";
export type { StereoNeighbor, Point3 } from "./ids.js";
export {
  RESERVED_ID_PREFIX,
  IMPLICIT_HYDROGEN,
  LONE_PAIR,
  isSentinelId,
  isImplicitHydrogenSlot,
  isLonePairSlot,
} from "./ids.js";

export type { Element, ElementProperties } from "./elements.js";
export { ELEMENTS, allElements, isElement, elementProperties } from "./elements.js";

export type { Atom, AtomInput, AtomStereo, TetrahedralStereo, StereoParity } from "./atom.js";
export { createAtom, nonbondingElectrons, nuclideKey, atomNuclideKey } from "./atom.js";

export type { Bond, BondInput, BondOrder, BondStereo, DoubleBondStereo } from "./bond.js";
export {
  createBond,
  atomPairKey,
  bondPairKey,
  parseAtomPairKey,
  otherEnd,
  bondTouches,
} from "./bond.js";

export type { Species, SpeciesInput, DeclaredTorsion } from "./species.js";
export {
  createSpecies,
  findAtom,
  requireAtom,
  findBond,
  requireBond,
  findBondBetween,
  bondsAt,
  neighborIds,
  danglingBondIds,
  connectedComponentCount,
} from "./species.js";

export type {
  MechanismState,
  MechanismStateInput,
  StateMember,
  SpeciesRole,
  SpectatorDeclaration,
  SpectatorReason,
  AtomLocation,
  BondLocation,
} from "./state.js";
export {
  createState,
  isSpectator,
  spectatorDeclarationFor,
  participatingMembers,
  spectatorMembers,
  orphanSpectatorDeclarations,
  findSpecies,
  findMember,
  findAtomInState,
  findBondInState,
  atomsAreBonded,
  duplicateAtomIds,
  duplicateSpeciesIds,
  speciesIdOccurrences,
  allAtoms,
  membersWithRole,
} from "./state.js";

export type {
  ElectronFlowArrow,
  ElectronFlowArrowInput,
  ElectronSource,
  ElectronSink,
  ElectronCount,
} from "./arrows.js";
export {
  createArrow,
  fromLonePair,
  fromBond,
  fromSingleElectron,
  toAtom,
  toBondBetween,
  referencedAtomIds,
  referencedBondIds,
} from "./arrows.js";

export type { ArrowLegalityRuleId, ArrowLegalityFinding } from "./legality.js";
export {
  arrowLegalityFindings,
  arrowEndpointsShareAnAtom,
  sourceAtomIds,
  sinkAtomIds,
} from "./legality.js";

export type { MechanismRoute, ElementaryStepKind, TransformationKind } from "./routes.js";
export { routeLabel, allMechanismRoutes } from "./routes.js";

export type {
  StepIdentity,
  MechanismStep,
  MechanismStepInput,
  MechanismPathway,
  MechanismPathwayInput,
  AuthoredAnnotation,
} from "./step.js";
export { createStep, createPathway, initialState, finalState } from "./step.js";

export type {
  CauseId,
  CauseDefinition,
  CauseCategory,
  CauseSeverity,
  CauseSubject,
  NamedCause,
  NamedCauseInput,
} from "./causes.js";
export {
  CAUSES,
  namedCause,
  causeDefinition,
  allCauseIds,
  causeCount,
  causeIdsByCategory,
  causeIdsBySeverity,
  causeAppliesTo,
} from "./causes.js";

export type {
  ResolutionKind,
  AttemptResolution,
  StudentAttempt,
  TransformationDescriptor,
} from "./resolution.js";
export {
  isChemicallyValid,
  reachesRequestedProduct,
  resolutionCauses,
  primaryCauseIsConsistent,
  blockingAdvisories,
  distinctCauseCount,
  countByKind,
} from "./resolution.js";

export type { NuclideCounts, ConservedTotals, ConservedTotalsOptions } from "./bookkeeping.js";
export {
  nuclideCounts,
  nuclideCountsOfMany,
  approximateMass,
  molecularFormula,
  bondOrderSumAt,
  derivedFormalCharge,
  valenceElectronsAround,
  speciesCharge,
  valenceElectronCount,
  conservedTotals,
  nuclideDifference,
  atomKey,
} from "./bookkeeping.js";

export type {
  AtomElectronDelta,
  BondElectronDelta,
  ElectronDeltaSet,
  DeltaMismatch,
} from "./deltas.js";
export { declaredDeltas, observedDeltas, deltaMismatches } from "./deltas.js";

export type { AtomPatch, ClearableAtomField } from "./edit.js";
export {
  withAtomPatch,
  withAddedAtom,
  withoutAtom,
  withAddedBond,
  withoutBond,
  withBondOrder,
  withBondStereo,
  withMember,
  withoutMember,
  withReplacedSpecies,
  declareSpectator,
  withdrawSpectator,
  copyStateAs,
} from "./edit.js";
