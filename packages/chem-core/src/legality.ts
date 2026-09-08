/**
 * Arrow legality. Is each individual arrow a thing that can be drawn at all?
 *
 * CLAUDE.md gives chem-core four jobs: "valence, mass, formal charge, electron
 * bookkeeping, arrow legality". The first four had homes in bookkeeping.ts and
 * deltas.ts from the start. This file is the fifth, and it exists because the
 * Phase 0 adversary showed the fifth was missing entirely, in
 * good-adversarial-sn2-with-swapped-arrows-producing-identical-declared-deltas.
 *
 * WHY THE DELTA COMPARISON WAS NOT ENOUGH, WHICH IS THE WHOLE ARGUMENT.
 *
 * `declaredDeltas` accumulates a running total keyed by atom id and by unordered
 * atom pair. It never asks whether one arrow's own source and its own sink are
 * near each other. Two arrows that are each individually impossible can be chosen
 * so their combined total is bit for bit identical to the correct pair, and the
 * comparison against `observedDeltas` then passes. Aggregate arithmetic is blind
 * to per arrow geometry by construction, so the fix cannot live in deltas.ts.
 * It has to be a separate pass over each arrow on its own.
 *
 * THE RULE SET, AND THE ARGUMENT FOR EACH RULE.
 *
 * Every rule is evaluated against the step's `from` state, which is where every
 * arrow id resolves, sinks included. See arrows.ts.
 *
 *   RESOLUTION. Every atom and bond an arrow names is in the `from` state. An
 *   arrow anchored to nothing is not a chemistry error, it is a dangling
 *   reference, and everything below would be arithmetic on undefined.
 *
 *   SOURCE DENSITY. An arrow starts on electrons that exist. A `lonePair` source
 *   needs at least one lone pair on the atom it names. A `singleElectron` source
 *   needs at least one unpaired electron, and must carry exactly one electron,
 *   because a lone unpaired electron cannot supply a pair. A `bond` source cannot
 *   move more electrons than the bond holds, which is twice its order.
 *
 *   SOURCE CAPACITY, ACROSS THE WHOLE STEP. Two arrows may both start on the same
 *   lone pair, or on the same bond, and each be legal alone while together they
 *   move electrons that are not there. Br2 homolysis is the case that makes this
 *   rule careful rather than absent: two fishhooks out of one single bond move
 *   two electrons in total, which is exactly what the bond holds and is correct.
 *   Three would not be. So the rule is a ceiling on the sum, not a ban on sharing.
 *
 *   ADJACENCY. THE HEADLINE. An arrow's source site and its sink site must share
 *   an atom.
 *
 *   NON DEGENERACY. An arrow must claim that something moved. A pair taken off an
 *   atom and put back on the same atom, or emptied out of a bond and back into the
 *   same bond, claims nothing while still being adjacent and still being sourced
 *   from real electrons.
 *
 * WHY ADJACENCY IS "SHARE AN ATOM" AND NOT THE WEAKER "SHARE AN ATOM OR BE BONDED".
 *
 * The source site of an arrow is the set of atoms the electrons currently sit on:
 * one atom for a lone pair or an unpaired electron, both ends for a bond. The sink
 * site is the atom the electrons land on, or the two atoms the new bond is drawn
 * between. Every arrow in ordinary mechanism drawing has those two sets
 * overlapping, and the overlap atom is the pivot the electron pair swings around:
 *
 *   nucleophilic attack   lonePair(A)      -> between(A, B)    pivot A
 *   heterolysis           bond(A, B)       -> atom(B)          pivot B
 *   homolysis, twice      bond(A, B)       -> atom(A), atom(B) pivot A, then B
 *   pi bond attacks       bond(A, B)       -> between(B, C)    pivot B
 *   1,2 hydride shift     bond(C2, H)      -> between(C1, H)   pivot H
 *   1,2 alkyl shift       bond(C2, C3)     -> between(C1, C3)  pivot C3
 *   radical recombination singleElectron(A)-> between(A, B)    pivot A
 *   E2, all three arrows  each share their pivot with the next
 *   any pericyclic step   each arrow shares an atom with the bond it feeds
 *
 * We could not construct a curved arrow a teacher would accept whose two sites do
 * not overlap. Long range single electron transfer is real, and it is drawn as a
 * labelled straight arrow between two species, not as a curved arrow, because
 * there is no pair of orbitals for a curved arrow to describe. So the strict rule
 * is the one implemented, and the weaker "or the two sites are joined by an
 * existing bond" is deliberately NOT accepted: an arrow that runs the length of a
 * bond it does not source from and does not form is describing that bond's
 * electrons without saying so.
 *
 * That is a claim about chemistry, and a fixture is the way to argue with it. If
 * a real mechanism turns up whose arrow genuinely has disjoint sites, the rule is
 * one condition wide and the fixture is the evidence for widening it. The failure
 * message names the bonded case explicitly so that argument is easy to start.
 *
 * WHAT THIS FILE STILL CANNOT SEE, STATED SO A GREEN RUN IS NOT READ AS MORE.
 *
 * Adjacency does not rank pivots. `bond(A, B) -> between(A, C)` is the pi bond
 * attack shape, the hydride shift shape, and also the shape of an arrow that
 * hands a departing sigma bond's pair straight to an incoming nucleophile, which
 * is nonsense. Telling the third apart from the first two needs to know which end
 * is the electrophile, and that is reactivity modelling rather than arrow
 * geometry. It is not attempted here and it is not silently approximated.
 */

import type { ElectronFlowArrow, ElectronSink, ElectronSource } from "./arrows.js";
import type { CauseId } from "./causes.js";
import type { ArrowId, AtomId } from "./ids.js";
import type { MechanismState } from "./state.js";
import { atomsAreBonded, findAtomInState, findBondInState } from "./state.js";

/**
 * Which rule an arrow broke.
 *
 * A closed union rather than a message string, for the same reason causes.ts is a
 * registry: a validator groups by it, a report counts it, and an adversary can
 * ask for the rule that has never fired.
 */
export type ArrowLegalityRuleId =
  | "source_atom_not_in_state"
  | "source_bond_not_in_state"
  | "sink_atom_not_in_state"
  | "source_has_no_lone_pair"
  | "source_has_no_unpaired_electron"
  | "single_electron_source_moved_a_pair"
  | "source_bond_overdrawn"
  | "lone_pairs_overdrawn"
  | "unpaired_electrons_overdrawn"
  | "endpoints_share_no_atom"
  | "sink_bonds_an_atom_to_itself"
  | "arrow_declares_no_change";

/**
 * One illegal arrow, and why.
 *
 * `expected` and `actual` are values a human compares at a glance, matching the
 * convention in the validator's CheckFailure. `cause` is the CauseId a student
 * would be shown, so the feedback axis can count what this file reaches.
 */
export interface ArrowLegalityFinding {
  readonly arrowId: ArrowId;
  readonly rule: ArrowLegalityRuleId;
  readonly cause: CauseId;
  readonly expected: string;
  readonly actual: string;
}

/**
 * The atoms an arrow's electrons currently sit on.
 *
 * A bond source contributes BOTH ends, because a bonding pair sits between them
 * and either end can be the pivot. Returns an empty list when a bond id does not
 * resolve, which callers must treat as "unknown", never as "no atoms".
 */
export function sourceAtomIds(source: ElectronSource, state: MechanismState): readonly AtomId[] {
  switch (source.kind) {
    case "lonePair":
    case "singleElectron":
      return [source.atomId];
    case "bond": {
      const found = findBondInState(state, source.bondId);
      return found === undefined ? [] : [found.bond.a, found.bond.b];
    }
  }
}

/** The atoms an arrow's electrons land on or between. */
export function sinkAtomIds(sink: ElectronSink): readonly AtomId[] {
  return sink.kind === "atom" ? [sink.atomId] : [sink.atomIds[0], sink.atomIds[1]];
}

/**
 * Whether the two sites of an arrow overlap.
 *
 * The single predicate the headline rule turns on, exported separately so a
 * renderer can grey out an illegal arrow while it is being dragged without
 * running the whole finder. Callers must have already checked that the arrow's
 * references resolve; an unresolvable bond source returns false here, which is
 * correct but is a worse message than `source_bond_not_in_state`.
 */
export function arrowEndpointsShareAnAtom(
  arrow: ElectronFlowArrow,
  state: MechanismState,
): boolean {
  const sinks = new Set<AtomId>(sinkAtomIds(arrow.sink));
  return sourceAtomIds(arrow.source, state).some((atomId) => sinks.has(atomId));
}

function describeSource(source: ElectronSource): string {
  switch (source.kind) {
    case "lonePair":
      return `a lone pair on ${source.atomId}`;
    case "singleElectron":
      return `the unpaired electron on ${source.atomId}`;
    case "bond":
      return `bond ${source.bondId}`;
  }
}

function describeSink(sink: ElectronSink): string {
  return sink.kind === "atom"
    ? `atom ${sink.atomId}`
    : `between ${sink.atomIds[0]} and ${sink.atomIds[1]}`;
}

/**
 * Every arrow in one step that is not a drawable arrow, in the order the rules
 * are listed at the top of this file.
 *
 * `arrows` are the step's arrows and `state` is the step's `from` state. The `to`
 * state is deliberately not a parameter: whether an arrow is drawable is a
 * property of where it starts and where it points, not of what the student drew
 * next. Comparing arrows against the product is `deltaMismatches`, and mixing the
 * two would put the aggregate arithmetic back in front of the per arrow geometry,
 * which is exactly the hole this file closes.
 *
 * Every arrow is examined, and every rule it breaks is reported. An adversary
 * reading one finding per run learns one thing per run.
 *
 * Never throws. A malformed arrow comes back as a finding, because a check that
 * explodes has not decided anything.
 */
export function arrowLegalityFindings(
  arrows: readonly ElectronFlowArrow[],
  state: MechanismState,
): readonly ArrowLegalityFinding[] {
  const findings: ArrowLegalityFinding[] = [];

  // Running totals for the capacity rules. Filled on the first pass, judged after.
  const lonePairElectronsDrawn = new Map<AtomId, number>();
  const unpairedElectronsDrawn = new Map<AtomId, number>();
  const bondElectronsDrawn = new Map<string, number>();
  const bondOrderById = new Map<string, number>();

  const add = (map: Map<string, number>, key: string, amount: number): void => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };

  for (const arrow of arrows) {
    let sourceResolves = true;
    let sinkResolves = true;

    // RESOLUTION.
    if (arrow.source.kind === "bond") {
      const found = findBondInState(state, arrow.source.bondId);
      if (found === undefined) {
        sourceResolves = false;
        findings.push({
          arrowId: arrow.id,
          rule: "source_bond_not_in_state",
          cause: "arrow_endpoint_not_in_state",
          expected: `bond ${arrow.source.bondId} to be a bond in state ${state.id}`,
          actual: "no species here has a bond with that id, so there is no pair to move",
        });
      } else {
        bondOrderById.set(arrow.source.bondId, found.bond.order);
        add(bondElectronsDrawn, arrow.source.bondId, arrow.electrons);
      }
    } else {
      const located = findAtomInState(state, arrow.source.atomId);
      if (located === undefined) {
        sourceResolves = false;
        findings.push({
          arrowId: arrow.id,
          rule: "source_atom_not_in_state",
          cause: "arrow_endpoint_not_in_state",
          expected: `atom ${arrow.source.atomId} to be present in state ${state.id}`,
          actual: "it is not in any species here, so the arrow starts on nothing",
        });
      }
    }

    for (const atomId of sinkAtomIds(arrow.sink)) {
      if (findAtomInState(state, atomId) === undefined) {
        sinkResolves = false;
        findings.push({
          arrowId: arrow.id,
          rule: "sink_atom_not_in_state",
          cause: "arrow_endpoint_not_in_state",
          expected: `atom ${atomId} to be present in state ${state.id}`,
          actual: "it is not in any species here, so the arrow points at nothing",
        });
      }
    }

    // SOURCE DENSITY.
    if (sourceResolves && arrow.source.kind === "lonePair") {
      const located = findAtomInState(state, arrow.source.atomId);
      const lonePairs = located?.atom.lonePairs ?? 0;
      if (lonePairs < 1) {
        findings.push({
          arrowId: arrow.id,
          rule: "source_has_no_lone_pair",
          cause: "arrow_source_has_no_electrons",
          expected: `at least one lone pair on ${arrow.source.atomId} for this arrow to start from`,
          actual: `it carries ${lonePairs}`,
        });
      }
      add(lonePairElectronsDrawn, arrow.source.atomId, arrow.electrons);
    }

    if (sourceResolves && arrow.source.kind === "singleElectron") {
      const located = findAtomInState(state, arrow.source.atomId);
      const unpaired = located?.atom.unpairedElectrons ?? 0;
      if (unpaired < 1) {
        findings.push({
          arrowId: arrow.id,
          rule: "source_has_no_unpaired_electron",
          cause: "arrow_source_has_no_electrons",
          expected: `at least one unpaired electron on ${arrow.source.atomId}`,
          actual: `it carries ${unpaired}`,
        });
      }
      if (arrow.electrons !== 1) {
        findings.push({
          arrowId: arrow.id,
          rule: "single_electron_source_moved_a_pair",
          cause: "electron_count_not_integral",
          expected: "a singleElectron source moves exactly 1 electron",
          actual: `this arrow moves ${arrow.electrons}, which is more than the source holds`,
        });
      }
      add(unpairedElectronsDrawn, arrow.source.atomId, arrow.electrons);
    }

    if (sourceResolves && arrow.source.kind === "bond") {
      const order = bondOrderById.get(arrow.source.bondId) ?? 0;
      if (arrow.electrons > order * 2) {
        findings.push({
          arrowId: arrow.id,
          rule: "source_bond_overdrawn",
          cause: "arrow_source_has_no_electrons",
          expected: `at most ${order * 2} electrons out of bond ${arrow.source.bondId}, which is order ${order}`,
          actual: `this arrow alone moves ${arrow.electrons}`,
        });
      }
    }

    if (!sourceResolves || !sinkResolves) continue;

    // NON DEGENERACY, before adjacency, because a degenerate arrow always passes
    // adjacency and "it shares an atom" would be a confusing thing to be told.
    const sinks = sinkAtomIds(arrow.sink);
    if (arrow.sink.kind === "betweenAtoms" && sinks[0] === sinks[1]) {
      findings.push({
        arrowId: arrow.id,
        rule: "sink_bonds_an_atom_to_itself",
        cause: "arrow_sink_cannot_accept_electrons",
        expected: "a bond forming sink names two different atoms",
        actual: `both ends are ${sinks[0]}, and an atom cannot bond to itself`,
      });
      continue;
    }

    const sources = sourceAtomIds(arrow.source, state);
    const sameSite =
      sources.length === sinks.length &&
      new Set<AtomId>([...sources, ...sinks]).size === sources.length;
    if (sameSite) {
      findings.push({
        arrowId: arrow.id,
        rule: "arrow_declares_no_change",
        cause: "arrow_declares_no_change",
        expected: "an arrow moves electrons from one place to a different place",
        actual:
          `it runs from ${describeSource(arrow.source)} to ${describeSink(arrow.sink)}, which is ` +
          `the same site, so it declares a change of zero everywhere`,
      });
      continue;
    }

    // ADJACENCY. THE HEADLINE.
    const sinkSet = new Set<AtomId>(sinks);
    const pivots = sources.filter((atomId) => sinkSet.has(atomId));
    if (pivots.length === 0) {
      const bonded = sources.some((from) => sinks.some((to) => atomsAreBonded(state, from, to)));
      findings.push({
        arrowId: arrow.id,
        rule: "endpoints_share_no_atom",
        cause: "arrow_endpoints_not_adjacent",
        expected:
          `the source site {${sources.join(", ")}} and the sink site {${sinks.join(", ")}} to ` +
          `share an atom, which is the pivot the electron pair swings around`,
        actual:
          `they share none, so ${describeSource(arrow.source)} reaches ${describeSink(arrow.sink)} ` +
          `across empty space. ` +
          (bonded
            ? "The two sites are joined by an existing bond, which is still not enough: an " +
              "arrow that runs the length of a bond it neither sources from nor forms is " +
              "moving that bond's electrons without saying so"
            : "There is not even a bond between them in this state"),
      });
    }
  }

  // SOURCE CAPACITY, over the whole step.
  for (const [atomId, electrons] of [...lonePairElectronsDrawn].sort()) {
    const located = findAtomInState(state, atomId);
    const available = (located?.atom.lonePairs ?? 0) * 2;
    if (electrons > available) {
      findings.push({
        arrowId: arrowsTouchingLonePairsAt(arrows, atomId),
        rule: "lone_pairs_overdrawn",
        cause: "arrow_source_has_no_electrons",
        expected: `at most ${available} electrons drawn from lone pairs on ${atomId}`,
        actual: `the arrows in this step draw ${electrons} between them`,
      });
    }
  }

  for (const [atomId, electrons] of [...unpairedElectronsDrawn].sort()) {
    const located = findAtomInState(state, atomId);
    const available = located?.atom.unpairedElectrons ?? 0;
    if (electrons > available) {
      findings.push({
        arrowId: arrowsTouchingUnpairedAt(arrows, atomId),
        rule: "unpaired_electrons_overdrawn",
        cause: "arrow_source_has_no_electrons",
        expected: `at most ${available} electrons drawn from unpaired electrons on ${atomId}`,
        actual: `the arrows in this step draw ${electrons} between them`,
      });
    }
  }

  for (const [bondId, electrons] of [...bondElectronsDrawn].sort()) {
    const order = bondOrderById.get(bondId) ?? 0;
    if (electrons > order * 2) {
      findings.push({
        arrowId: arrowsSourcingBond(arrows, bondId),
        rule: "source_bond_overdrawn",
        cause: "arrow_source_has_no_electrons",
        expected: `at most ${order * 2} electrons drawn from bond ${bondId}, which is order ${order}`,
        actual: `the arrows in this step draw ${electrons} between them`,
      });
    }
  }

  return Object.freeze(findings);
}

/**
 * The arrows implicated in an aggregate finding, joined into one id string.
 *
 * A capacity violation is a property of a SET of arrows, not of one of them, and
 * naming only the last one to arrive would send a reader to an arrow that is fine
 * on its own. `ArrowId` is a plain string alias, so a joined list is a legal value
 * and reads correctly in a report.
 */
function arrowsTouchingLonePairsAt(
  arrows: readonly ElectronFlowArrow[],
  atomId: AtomId,
): ArrowId {
  return arrows
    .filter((arrow) => arrow.source.kind === "lonePair" && arrow.source.atomId === atomId)
    .map((arrow) => arrow.id)
    .join(" + ");
}

function arrowsTouchingUnpairedAt(arrows: readonly ElectronFlowArrow[], atomId: AtomId): ArrowId {
  return arrows
    .filter((arrow) => arrow.source.kind === "singleElectron" && arrow.source.atomId === atomId)
    .map((arrow) => arrow.id)
    .join(" + ");
}

function arrowsSourcingBond(arrows: readonly ElectronFlowArrow[], bondId: string): ArrowId {
  return arrows
    .filter((arrow) => arrow.source.kind === "bond" && arrow.source.bondId === bondId)
    .map((arrow) => arrow.id)
    .join(" + ");
}
