import {
  findAtomInState,
  findBondInState,
  neighborIds,
  type AtomId,
  type ElectronFlowArrow,
  type MechanismState,
  type MechanismStep,
} from "@blueberry/chem-core";

/**
 * What the arrows and the two states SAY, as facts a check can assert against.
 *
 * WHY THIS FILE EXISTS, WHICH IS THE PHASE 1 ADVERSARY'S FINDING B.
 *
 * `identity.elementaryStep` is enum checked by the fixture parser and then used to gate
 * three annotation checks by exact string match. Nothing anywhere derives what a step
 * actually is from its arrows and compares the two, so a hydride shift labelled
 * `proton_transfer`, or a pi bond attack labelled `bond_homolysis`, passes every check in
 * the family. `identity.reactionCenters` has the same hole one level down: step.ts says it
 * is "named explicitly rather than derived from the arrows, so that a step whose arrows are
 * wrong can still be talked about", and adds that "the disagreement between these and the
 * arrow endpoints is itself informative". Nothing was reading that disagreement.
 *
 * This file computes the arrow side. `step-identity.ts` and `periplanarity.ts` do the
 * comparing. Nothing here decides what a step is, and nothing here reads
 * `identity.elementaryStep` at all, on purpose: a derivation that consulted the label
 * could not contradict it.
 *
 * EVERY FACT HERE IS READ FROM THE `from` STATE PLUS THE ARROWS, EXCEPT MIGRATION.
 *
 * Arrow ids resolve against `from`, sinks included, which is the rule arrows.ts states.
 * `hydrogenMigrations` is the one function that reads both states, because a migration is
 * by definition a difference between them, and it deliberately reads the arrows a second
 * time to say HOW the hydrogen moved rather than only that it did.
 *
 * UNRESOLVABLE REFERENCES ARE CARRIED, NEVER GUESSED.
 *
 * An arrow naming a bond that is not in the state contributes no atoms here, and
 * `allReferencesResolve` goes false. Callers that need completeness, above all the
 * reaction centre grounding rule, must stand down when it is false: a set of touched atoms
 * assembled from arrows that do not resolve is a smaller set than the truth, and asserting
 * a subset relation against it would report a grounding failure that is really a dangling
 * reference. `conservation-arrow-legality` already owns dangling references and says so
 * with a better message.
 */

/** The two ends and the order of a bond an arrow sources from. */
export interface SourceBond {
  readonly a: AtomId;
  readonly b: AtomId;
  readonly order: number;
}

/** One arrow with its endpoints resolved against the `from` state. */
export interface ResolvedArrow {
  readonly arrow: ElectronFlowArrow;
  /** Atoms the electrons sit on now. Both ends for a bond source. Empty if unresolved. */
  readonly sourceAtomIds: readonly AtomId[];
  /** Atoms the electrons land on or between. Empty if unresolved. */
  readonly sinkAtomIds: readonly AtomId[];
  /** Present only for a `bond` source that resolved. */
  readonly sourceBond?: SourceBond;
  /** Every id this arrow names is in the `from` state. */
  readonly resolves: boolean;
}

export interface StepArrowFacts {
  readonly arrows: readonly ResolvedArrow[];
  /** True when every arrow in the step resolved. See the note on standing down. */
  readonly allReferencesResolve: boolean;
  /** Every atom any resolved arrow starts on, lands on, or bonds. */
  readonly touchedAtomIds: ReadonlySet<AtomId>;
  /**
   * Whether the arrows carry single electron evidence.
   *
   * True if any arrow moves one electron, OR if any arrow sources a `singleElectron`
   * regardless of its count. The second half matters: an arrow drawn from an unpaired
   * electron but declaring two electrons is an illegal arrow that arrow-legality reports,
   * and treating it as polar here would make this file report a mislabelled step on top of
   * a defect that is already named better elsewhere.
   */
  readonly radicalEvidence: boolean;
}

function sinkAtomIdsOf(arrow: ElectronFlowArrow): readonly AtomId[] {
  return arrow.sink.kind === "atom"
    ? [arrow.sink.atomId]
    : [arrow.sink.atomIds[0], arrow.sink.atomIds[1]];
}

/** Resolve every arrow of a step against its `from` state. Never throws. */
export function stepArrowFacts(step: MechanismStep): StepArrowFacts {
  const state = step.from;
  const arrows: ResolvedArrow[] = [];
  const touched = new Set<AtomId>();
  let allResolve = true;
  let radical = false;

  for (const arrow of step.arrows) {
    if (arrow.electrons === 1 || arrow.source.kind === "singleElectron") radical = true;

    let resolves = true;
    let sourceAtomIds: readonly AtomId[] = [];
    let sourceBond: SourceBond | undefined;

    if (arrow.source.kind === "bond") {
      const located = findBondInState(state, arrow.source.bondId);
      if (located === undefined) {
        resolves = false;
      } else {
        sourceBond = { a: located.bond.a, b: located.bond.b, order: located.bond.order };
        sourceAtomIds = [located.bond.a, located.bond.b];
      }
    } else if (findAtomInState(state, arrow.source.atomId) === undefined) {
      resolves = false;
    } else {
      sourceAtomIds = [arrow.source.atomId];
    }

    const sinkAtomIds = sinkAtomIdsOf(arrow);
    for (const atomId of sinkAtomIds) {
      if (findAtomInState(state, atomId) === undefined) resolves = false;
    }

    if (resolves) {
      for (const atomId of sourceAtomIds) touched.add(atomId);
      for (const atomId of sinkAtomIds) touched.add(atomId);
    } else {
      allResolve = false;
    }

    arrows.push({
      arrow,
      sourceAtomIds,
      sinkAtomIds: resolves ? sinkAtomIds : [],
      ...(sourceBond === undefined ? {} : { sourceBond }),
      resolves,
    });
  }

  return {
    arrows,
    allReferencesResolve: allResolve,
    touchedAtomIds: touched,
    radicalEvidence: radical,
  };
}

/**
 * The arrows of one step, grouped so that two arrows are in the same group whenever they
 * share an atom, transitively.
 *
 * A purely mechanical fact about the drawing, and deliberately nothing more. It says which
 * arrows are drawn head to tail into one continuous push of electrons and which are not.
 * It does NOT say that separate groups are separate steps: that is a chemical judgement
 * and it lives in `step-elementarity.ts`, which adds a bond distance test on top before it
 * will say anything. Every genuinely concerted multi centre step in the corpus, E2, the
 * four centre hydroboration, radical propagation, comes back as ONE group here, because a
 * cyclic or linear array of curved arrows shares an atom at every join.
 *
 * Unresolved arrows contribute no atoms and are therefore each alone in their own group.
 * Callers must stand down when `allReferencesResolve` is false, for the reason at the top
 * of this file.
 */
export interface ArrowCluster {
  readonly arrowIds: readonly string[];
  readonly atomIds: ReadonlySet<AtomId>;
}

export function arrowClusters(facts: StepArrowFacts): readonly ArrowCluster[] {
  const clusters: { arrowIds: string[]; atomIds: Set<AtomId> }[] = [];

  for (const resolved of facts.arrows) {
    const atomIds = new Set<AtomId>([...resolved.sourceAtomIds, ...resolved.sinkAtomIds]);
    const touching = clusters.filter((cluster) =>
      [...atomIds].some((atomId) => cluster.atomIds.has(atomId)),
    );

    if (touching.length === 0) {
      clusters.push({ arrowIds: [resolved.arrow.id], atomIds });
      continue;
    }

    // Merge every cluster this arrow reaches into the first of them, then drop the rest.
    const target = touching[0] as { arrowIds: string[]; atomIds: Set<AtomId> };
    target.arrowIds.push(resolved.arrow.id);
    for (const atomId of atomIds) target.atomIds.add(atomId);
    for (const other of touching.slice(1)) {
      target.arrowIds.push(...other.arrowIds);
      for (const atomId of other.atomIds) target.atomIds.add(atomId);
      clusters.splice(clusters.indexOf(other), 1);
    }
  }

  return clusters.map((cluster) => ({
    arrowIds: [...cluster.arrowIds].sort(),
    atomIds: cluster.atomIds,
  }));
}

/**
 * How the electrons travelled with a hydrogen that changed heavy atom.
 *
 * THIS IS THE DISCRIMINATION THE ADVERSARY ASKED FOR, AND IT IS THE ONLY ONE IN THIS FILE
 * THAT IS ABOUT CHEMISTRY RATHER THAN ABOUT GRAPHS.
 *
 *   `donated`  the acceptor supplied the pair. The bond forming arrow starts on the
 *              acceptor, pivots on the acceptor, and the hydrogen arrives as a bare
 *              nucleus. That is a proton transfer, and it is how every proton transfer in
 *              the corpus is drawn: lonePair(base) -> between(base, H).
 *   `carried`  the hydrogen brought its own bonding pair. The bond forming arrow starts on
 *              the old X-H bond and pivots on the hydrogen itself. That is a hydride, and
 *              legality.ts's own table names the shape: bond(C2, H) -> between(C1, H),
 *              pivot H.
 *   `mixed`    both, which is what a radical abstraction genuinely looks like: one fishhook
 *              out of the abstractor's unpaired electron and one out of the X-H bond.
 *              Reported as mixed rather than arbitrated, because it is neither of the two.
 *   `undeclared` the hydrogen moved and no arrow explains the bond that formed. That is
 *              `conservation-electron-flow`'s finding, not this one's.
 *
 * WHAT IS DELIBERATELY NOT DETECTED. A hydrogen that lives only in `implicitHydrogens`.
 * No arrow can name it, so no arrow can say which electrons went with it, and the honest
 * answer is that this file cannot see it. `deltaMismatches` already reports an implicit
 * hydrogen change with no arrow behind it under `implicit_hydrogen_changed_without_arrow`.
 *
 * Only the simple case is reported: exactly one heavy neighbour lost and exactly one
 * gained. A hydrogen that changes two neighbours at once is not a migration this file
 * knows how to describe, and describing it anyway would be a guess.
 */
export type HydrogenMigrationMode = "donated" | "carried" | "mixed" | "undeclared";

export interface HydrogenMigration {
  readonly hydrogenId: AtomId;
  /** The atom it was bonded to in `from`. */
  readonly leftId: AtomId;
  /** The atom it is bonded to in `to`. */
  readonly arrivedId: AtomId;
  readonly mode: HydrogenMigrationMode;
}

function neighboursInState(state: MechanismState, atomId: AtomId): ReadonlySet<AtomId> {
  const located = findAtomInState(state, atomId);
  if (located === undefined) return new Set<AtomId>();
  return new Set<AtomId>(neighborIds(located.species, atomId));
}

function sameSet(left: readonly AtomId[], right: ReadonlySet<AtomId>): boolean {
  if (left.length !== right.size) return false;
  return left.every((atomId) => right.has(atomId));
}

export function hydrogenMigrations(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly HydrogenMigration[] {
  const migrations: HydrogenMigration[] = [];

  for (const member of step.from.members) {
    for (const atom of member.species.atoms) {
      if (atom.element !== "H") continue;
      if (findAtomInState(step.to, atom.id) === undefined) continue;

      const before = neighboursInState(step.from, atom.id);
      const after = neighboursInState(step.to, atom.id);
      const lost = [...before].filter((neighbourId) => !after.has(neighbourId));
      const gained = [...after].filter((neighbourId) => !before.has(neighbourId));
      if (lost.length !== 1 || gained.length !== 1) continue;

      const leftId = lost[0] as AtomId;
      const arrivedId = gained[0] as AtomId;
      const target = new Set<AtomId>([arrivedId, atom.id]);

      let carried = false;
      let donated = false;
      for (const resolved of facts.arrows) {
        if (!resolved.resolves) continue;
        if (!sameSet(resolved.sinkAtomIds, target)) continue;
        const bond = resolved.sourceBond;
        if (bond !== undefined && sameSet([bond.a, bond.b], new Set<AtomId>([leftId, atom.id]))) {
          carried = true;
        } else if (
          resolved.sourceAtomIds.includes(arrivedId) &&
          !resolved.sourceAtomIds.includes(atom.id)
        ) {
          donated = true;
        }
      }

      const mode: HydrogenMigrationMode =
        carried && donated ? "mixed" : carried ? "carried" : donated ? "donated" : "undeclared";
      migrations.push({ hydrogenId: atom.id, leftId, arrivedId, mode });
    }
  }

  migrations.sort((left, right) => left.hydrogenId.localeCompare(right.hydrogenId));
  return migrations;
}

/**
 * A sigma bond between two heavy atoms, fully broken, with both electrons localising on
 * one end. A leaving group departing, in other words.
 *
 * THREE CONDITIONS, EACH LOAD BEARING.
 *
 *   order 1. A pi bond arrow, `bond(C=O) -> atom(O)`, has the same source and sink shape
 *   and is not a departure at all: the two atoms stay bonded and the bond order drops by
 *   one. Every carbonyl in the corpus is drawn that way, so counting order 2 here would
 *   report a departure in the middle of correct chemistry.
 *
 *   neither end is hydrogen. `bond(O-H) -> atom(O)` is the other half of an ordinary
 *   proton transfer, where the bonding pair goes back to the atom the proton is leaving.
 *   Counting that as a departure would fire on every deprotonation in the corpus.
 *
 *   the sink is an atom, and it is one end of that same bond. Electrons localising as a
 *   lone pair on the atom that kept them. An arrow out of a sigma bond that goes on to
 *   form a new bond is a migration, and `hydrogenMigrations` handles the hydrogen case of
 *   it; that is a different shape and a different meaning.
 */
export interface HeavySigmaDeparture {
  readonly arrowId: string;
  readonly bond: SourceBond;
  /** The end the pair localised on: the leaving group. */
  readonly departingId: AtomId;
  /** The other end: the atom left behind, normally the electrophilic carbon. */
  readonly retainedId: AtomId;
}

export function heavySigmaDepartures(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly HeavySigmaDeparture[] {
  const departures: HeavySigmaDeparture[] = [];

  for (const resolved of facts.arrows) {
    if (!resolved.resolves) continue;
    const bond = resolved.sourceBond;
    if (bond === undefined || bond.order !== 1) continue;
    if (resolved.arrow.sink.kind !== "atom") continue;

    const elementOf = (atomId: AtomId): string | undefined =>
      findAtomInState(step.from, atomId)?.atom.element;
    if (elementOf(bond.a) === "H" || elementOf(bond.b) === "H") continue;

    const sinkAtomId = resolved.arrow.sink.atomId;
    if (sinkAtomId !== bond.a && sinkAtomId !== bond.b) continue;

    departures.push({
      arrowId: resolved.arrow.id,
      bond,
      departingId: sinkAtomId,
      retainedId: sinkAtomId === bond.a ? bond.b : bond.a,
    });
  }

  return departures;
}

/**
 * A new bond this step's arrows say is forming, with its two ends told apart.
 *
 * WHY THE TWO ENDS HAVE TO BE TOLD APART, WHICH IS THE FOURTH PASS ADVERSARY'S FINDING.
 *
 * `heavySigmaDepartures` above answers "which atom did the leaving group leave". Until
 * this function existed, `rate-comparison.ts` used that answer as though it were also the
 * answer to "which atom is under attack", and its own docstring said so as settled fact.
 * The two are the same atom in an ordinary SN2 and they are NOT the same atom in an SN2
 * prime, the allylic shift, where the nucleophile bonds to the far end of the alkene and
 * the leaving group departs from the near end, three atoms away. chem-core has no separate
 * route for SN2 prime, so a real one is legitimately authored as `concerted_substitution`
 * on route `sn2`, and every steric test then ran on the wrong carbon.
 *
 * So the attacked atom is derived from the arrow that FORMS THE BOND TO IT rather than
 * from the departure. That is the arrow whose sink is a `betweenAtoms` pair, and the pair
 * has a near end and a far end:
 *
 *   `donorId`     the end the electrons are already on. It is in the arrow's own source,
 *                 which is what makes it the pivot: a lone pair arrow pivots on the atom
 *                 carrying the lone pair, and a bond arrow pivots on the shared end of the
 *                 bond it came out of.
 *   `acceptorId`  the other end. The atom the electrons are being pushed AT, which is what
 *                 "the atom under attack" means and is the only end a backside trajectory
 *                 question can be asked about.
 *
 * TWO SHAPES ARE DELIBERATELY NOT REPORTED, AND BOTH ARE ALREADY OWNED ELSEWHERE.
 *
 * Neither end of the sink pair appears in the arrow's source. The arrow does not touch the
 * bond it claims to make, so there is no pivot to read and naming either end would be a
 * guess. `conservation-arrow-legality` owns that with a better message.
 *
 * BOTH ends appear in the source, which happens when a bond source and a `betweenAtoms`
 * sink name the same two atoms. That is an arrow declaring no change, and
 * `conservation-arrow-legality` owns that too, under `arrow_declares_no_change`.
 *
 * WHAT THIS IS NOT. It is not a claim that the acceptor is an electrophile, that the donor
 * is a nucleophile, or that the bond survives into the `to` state. It reads the drawing.
 * Every chemical judgement on top of it belongs to the caller, and `rate-comparison.ts`
 * makes exactly one: a carbon under attack with a quaternary carbon beside it is hindered.
 */
export interface BondFormation {
  readonly arrowId: string;
  /** The end the electrons come from: the arrow's pivot. */
  readonly donorId: AtomId;
  /** The end the electrons are pushed at: the atom under attack. */
  readonly acceptorId: AtomId;
}

export function bondFormations(facts: StepArrowFacts): readonly BondFormation[] {
  const formations: BondFormation[] = [];

  for (const resolved of facts.arrows) {
    if (!resolved.resolves) continue;
    if (resolved.arrow.sink.kind !== "betweenAtoms") continue;

    const left = resolved.arrow.sink.atomIds[0];
    const right = resolved.arrow.sink.atomIds[1];
    if (left === right) continue;

    const source = new Set<AtomId>(resolved.sourceAtomIds);
    const pivots = [left, right].filter((atomId) => source.has(atomId));
    // Not one pivot: either the arrow does not touch the bond it makes, or it declares no
    // change at all. Both are arrow-legality's findings and both are named better there.
    if (pivots.length !== 1) continue;

    const donorId = pivots[0] as AtomId;
    formations.push({
      arrowId: resolved.arrow.id,
      donorId,
      acceptorId: donorId === left ? right : left,
    });
  }

  return formations;
}

/**
 * The four atoms an E2 dihedral is measured over, derived from the arrows alone.
 *
 * H-Cbeta-Calpha-LG. The hydrogen the base takes, the carbon it came off, the carbon the
 * leaving group is on, and the leaving group. Those are the four atoms whose alignment E2
 * turns on, and every one of them is named by an arrow in a correctly drawn E2, so the
 * quartet is derivable rather than authored.
 *
 * Returns undefined when the step is not drawn in a shape this can read: no single
 * hydrogen migration, no single heavy departure, or the two carbons not bonded to each
 * other. That is the honest answer and callers must treat it as "cannot say", never as
 * "the torsion is wrong". A check that guessed a quartet out of an unusual but correct
 * drawing would fail correct chemistry, which is worse than a documented blind spot.
 */
export interface E2Quartet {
  readonly hydrogenId: AtomId;
  readonly betaId: AtomId;
  readonly alphaId: AtomId;
  readonly leavingGroupId: AtomId;
}

export function deriveE2Quartet(
  step: MechanismStep,
  facts: StepArrowFacts,
): E2Quartet | undefined {
  if (!facts.allReferencesResolve || step.arrows.length === 0) return undefined;

  const migrations = hydrogenMigrations(step, facts);
  if (migrations.length !== 1) return undefined;
  const migration = migrations[0] as HydrogenMigration;

  const departures = heavySigmaDepartures(step, facts);
  if (departures.length !== 1) return undefined;
  const departure = departures[0] as HeavySigmaDeparture;

  const betaId = migration.leftId;
  const alphaId = departure.retainedId;
  if (betaId === alphaId) return undefined;
  if (!neighboursInState(step.from, betaId).has(alphaId)) return undefined;

  return {
    hydrogenId: migration.hydrogenId,
    betaId,
    alphaId,
    leavingGroupId: departure.departingId,
  };
}

/** The four atom ids of a quartet, as a set, for comparing against a declared torsion. */
export function quartetAtomIds(quartet: E2Quartet): ReadonlySet<AtomId> {
  return new Set<AtomId>([
    quartet.hydrogenId,
    quartet.betaId,
    quartet.alphaId,
    quartet.leavingGroupId,
  ]);
}
