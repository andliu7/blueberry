/**
 * The tap only corpus harness.
 *
 * BUILD-PROMPT PHASE 2: "Every mechanism must also be completable tap only, with
 * no drag gesture at any point." One demonstration proves nothing about a corpus,
 * so this file replays EVERY good fixture in packages/validators/fixtures through
 * the real state machine, one authored step at a time, using nothing but
 * pointerDown and pointerUp at the same point.
 *
 * WHY THE REAL FIXTURE PARSER AND NOT A LOCAL READER.
 *
 * `parseFixture` in packages/validators is the only thing in this repository that
 * turns fixture bytes into chem-core objects, and it enforces the schema while it
 * does so. A second reader here would be a second opinion on what a fixture says,
 * and the two would drift. The import crosses a package boundary by relative path
 * because packages/validators publishes no entry point: it is a dev only package
 * whose scripts run its sources directly. That is awkward and it is recorded here
 * rather than worked around, because the alternative is worse.
 *
 * Nothing in this file writes to fixtures/ or to packages/validators. It reads.
 *
 * WHAT "TAP ONLY" MEANS HERE, PRECISELY.
 *
 * A tap is a pointerDown and a pointerUp at the SAME point, with no pointerMove
 * between them. `Driver.tap` is the only gesture this harness calls, and
 * `assertNoDragEvents` below re-checks that by inspecting the event log rather
 * than trusting the driver.
 *
 * The one non pointer event used is the `command` event carrying
 * `setElectronCount`, needed for the fishhook steps. That is a button in the
 * shell's own chrome, not a gesture, and commands.ts is explicit that the pointer
 * free entry point can do everything a tap can. It is counted and reported
 * separately so the claim stays honest.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  atomsAreBonded,
  findAtomInState,
  findBondBetween,
  findBondInState,
  type ElectronFlowArrow,
  type ElectronSink,
  type ElectronSource,
  type MechanismState,
  type MechanismStep,
} from "@blueberry/chem-core";

import { parseFixture } from "../../validators/src/checks/conservation/fixture-schema.ts";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import type { InteractionEvent } from "../src/machine.js";
import type { Point2 } from "../src/pointer.js";
import { targetKey, type HitTarget } from "../src/targets.js";
import { Driver, type TableEntry } from "./support.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(HERE, "..", "..", "validators", "fixtures");
const FIXTURE_SUFFIX = ".fixture.json";

export interface CorpusFixture {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly MechanismStep[];
}

/**
 * Every fixture whose own `expect.kind` is "good", parsed by the real parser.
 *
 * A fixture that declares it must be refused by the loader is skipped, because it
 * never becomes a pathway at all. Any other parse failure is thrown, not skipped:
 * a harness that silently drops what it cannot read is a harness that reports a
 * clean sweep of a corpus it never opened.
 */
export function loadGoodFixtures(): readonly CorpusFixture[] {
  const files = fs
    .readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith(FIXTURE_SUFFIX))
    .sort();

  const good: CorpusFixture[] = [];
  for (const name of files) {
    const absolute = path.join(FIXTURES_DIR, name);
    const text = fs.readFileSync(absolute, "utf8");
    let loaded;
    try {
      loaded = parseFixture(text, absolute, name);
    } catch (error) {
      // A fixture the loader refuses is only allowed past here if it never
      // claimed to be good in the first place. A GOOD fixture that will not
      // parse is a real problem and must not be swallowed, because a harness
      // that silently drops what it cannot read reports a clean sweep of a
      // corpus it never opened.
      if (declaredKind(text) === "good") {
        throw new Error(`${name} declares itself good but did not parse: ${String(error)}`);
      }
      continue;
    }
    if (loaded.expect.kind !== "good") continue;
    good.push({ id: loaded.id, title: loaded.title, steps: loaded.pathway.steps });
  }
  return good;
}

/** The fixture's own `expect.kind`, read without the schema, for the refusal case. */
function declaredKind(text: string): string | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== "object" || raw === null) return null;
    const expect = (raw as { expect?: unknown }).expect;
    if (typeof expect !== "object" || expect === null) return null;
    const kind = (expect as { kind?: unknown }).kind;
    return typeof kind === "string" ? kind : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Turning an authored arrow into the two things a student taps
// ---------------------------------------------------------------------------

/**
 * The target a student presses to arm this arrow's electrons.
 *
 * A bond source resolves to the END HANDLE rather than the bond body, and the end
 * chosen is the one the arrow's own chemistry names: for a bond forming sink, the
 * atom of the bond that the new bond is made from. That is exactly the
 * information x02-bond-handle-drag.png says the handle carries, and picking it
 * here is what makes the tap path able to express a pi bond attacking at one
 * specific carbon.
 */
export function sourceTargetFor(
  source: ElectronSource,
  sink: ElectronSink,
  state: MechanismState,
): HitTarget {
  switch (source.kind) {
    case "lonePair":
      return { kind: "lonePair", atomId: source.atomId, slotIndex: 0 };
    case "singleElectron":
      return { kind: "unpairedElectron", atomId: source.atomId };
    case "bond": {
      const found = findBondInState(state, source.bondId);
      if (found === undefined) {
        throw new Error(`bond ${source.bondId} is not in state ${state.id}`);
      }
      const { a, b } = found.bond;
      const pivot = pivotFor(sink, a, b);
      return { kind: "bondEndHandle", bondId: source.bondId, atomId: pivot };
    }
  }
}

function pivotFor(sink: ElectronSink, a: string, b: string): string {
  if (sink.kind === "betweenAtoms") {
    // The end the new bond forms from is the one of the bond's atoms that the
    // sink names. chem-core's endpoints_share_no_atom rule guarantees there is
    // one on any arrow a good fixture carries.
    const [p, q] = sink.atomIds;
    if (p === a || q === a) return a;
    if (p === b || q === b) return b;
    return a;
  }
  // The pair collapses onto one atom, and neither end is a pivot for that. Grab
  // the handle at the far end, which is the end the electrons leave.
  return sink.atomId === a ? b : a;
}

/**
 * The target a student presses to land the electrons.
 *
 * A pair of atoms that are already bonded is a real drawn capsule, so that is
 * what gets tapped. A pair that is not bonded yet has nothing drawn between them,
 * and the bond formation site the geometry package offers while a source is armed
 * is the only thing there. Both read as `betweenAtoms` to chem-core.
 */
export function sinkTargetFor(sink: ElectronSink, state: MechanismState): HitTarget {
  if (sink.kind === "atom") {
    return { kind: "atom", atomId: sink.atomId };
  }
  const [p, q] = sink.atomIds;
  if (atomsAreBonded(state, p, q)) {
    const found = findAtomInState(state, p);
    if (found !== undefined) {
      const bond = findBondBetween(found.species, p, q);
      if (bond !== undefined) return { kind: "bondBody", bondId: bond.id };
    }
  }
  return { kind: "betweenAtomsSite", atomIds: [p, q] };
}

// ---------------------------------------------------------------------------
// The replay
// ---------------------------------------------------------------------------

export interface StepReplay {
  readonly stepId: string;
  readonly ok: boolean;
  /** Empty when ok. One line per thing that went wrong. */
  readonly problems: readonly string[];
  readonly taps: number;
  readonly electronCountCommands: number;
  readonly committed: readonly string[];
  readonly authored: readonly string[];
  readonly events: readonly InteractionEvent["kind"][];
}

/**
 * Replay one authored step with taps alone and report what the machine committed.
 *
 * Two taps per arrow: one to arm the source, one to land it. Nothing else.
 */
export function replayStepTapOnly(step: MechanismStep): StepReplay {
  const problems: string[] = [];
  const state = step.from;

  const points = new Map<string, Point2>();
  const entries: TableEntry[] = [];
  let next = 0;
  const pointFor = (target: HitTarget): Point2 => {
    const key = targetKey(target);
    const existing = points.get(key);
    if (existing !== undefined) return existing;
    next += 1;
    const point = { x: next * 17, y: next * 23 };
    points.set(key, point);
    entries.push({
      point,
      target,
      // A bond formation site does not exist on screen until something is armed.
      // Modelling that here is what keeps the fake honest about the real one.
      ...(target.kind === "betweenAtomsSite" ? { onlyWhenArmed: true } : {}),
    });
    return point;
  };

  interface Plan {
    readonly arrow: ElectronFlowArrow;
    readonly source: Point2;
    readonly sink: Point2;
  }

  const plans: Plan[] = [];
  for (const arrow of step.arrows) {
    try {
      plans.push({
        arrow,
        source: pointFor(sourceTargetFor(arrow.source, arrow.sink, state)),
        sink: pointFor(sinkTargetFor(arrow.sink, state)),
      });
    } catch (error) {
      problems.push(`arrow ${arrow.id} has no tappable target: ${String(error)}`);
    }
  }

  const driver = new Driver(createMechanismDraft(state), entries);

  let taps = 0;
  let electronCountCommands = 0;
  let electrons: 1 | 2 = 2;

  for (const plan of plans) {
    if (plan.arrow.electrons !== electrons) {
      electrons = plan.arrow.electrons;
      electronCountCommands += 1;
      driver.send({ kind: "command", command: { kind: "setElectronCount", electrons } });
    }
    driver.tap(plan.source);
    driver.tap(plan.sink);
    taps += 2;
  }

  const draft = draftOf(driver);
  const committed = draft.arrows.map(arrowKey);
  const authored = step.arrows.map(arrowKey);

  for (const refusal of driver.notices.filter((item) => item.severity === "refused")) {
    problems.push(`refused: ${refusal.id} (${refusal.detail})`);
  }
  if (draft.armed !== null) {
    problems.push("a source was left armed at the end of the step");
  }
  if (committed.length !== authored.length || committed.some((k, i) => k !== authored[i])) {
    problems.push(`committed ${JSON.stringify(committed)}, authored ${JSON.stringify(authored)}`);
  }
  for (const problem of assertNoDragEvents(driver.events)) problems.push(problem);

  return {
    stepId: step.id,
    ok: problems.length === 0,
    problems,
    taps,
    electronCountCommands,
    committed,
    authored,
    events: driver.events,
  };
}

function draftOf(driver: Driver): MechanismDraft {
  const draft = driver.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

/**
 * The event log has to be free of anything a drag needs.
 *
 * Checked from the log rather than taken on trust from the driver, because the
 * whole claim of this harness is about what was sent, and a claim checked against
 * the thing that made it is not a check.
 */
export function assertNoDragEvents(kinds: readonly InteractionEvent["kind"][]): readonly string[] {
  const problems: string[] = [];
  for (const kind of kinds) {
    if (kind === "pointerMove") problems.push("a pointerMove was sent, which is a drag");
    if (kind === "pointerCancel") problems.push("a pointerCancel was sent");
  }
  return problems;
}

/** Identity of an arrow ignoring its id, since student ids are minted locally. */
export function arrowKey(arrow: ElectronFlowArrow): string {
  return JSON.stringify([arrow.electrons, sourceKey(arrow.source), sinkKey(arrow.sink)]);
}

function sourceKey(source: ElectronSource): unknown {
  return source.kind === "bond" ? [source.kind, source.bondId] : [source.kind, source.atomId];
}

function sinkKey(sink: ElectronSink): unknown {
  if (sink.kind === "atom") return [sink.kind, sink.atomId];
  // chem-core treats the pair as unordered, so the key has to as well.
  const [a, b] = sink.atomIds;
  return a <= b ? [sink.kind, a, b] : [sink.kind, b, a];
}
