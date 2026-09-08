/**
 * Test fixtures and a fake hit tester.
 *
 * The fake is the point of geometryPort.ts. It is a lookup table from an exact
 * coordinate to a target, which is enough to drive every rule in the state
 * machine and means not one test here depends on the fingertip model, the
 * tolerance profiles, or anything else in src/geometry/. When that package lands
 * its own tests, the two suites stay independent, and a tolerance change cannot
 * turn a pointer session test red.
 */

import {
  createAtom,
  createBond,
  createSpecies,
  createState,
  type MechanismState,
} from "@blueberry/chem-core";
import type { HitTestOutcome, HitTestQuery, HitTester } from "../src/geometryPort.js";
import {
  createInteractionState,
  reduce,
  type InteractionEvent,
  type InteractionState,
  type Transition,
} from "../src/machine.js";
import type { InteractionEffect } from "../src/effects.js";
import type { InteractionNotice, NoticeId } from "../src/notices.js";
import type { Point2, PointerInput, PointerKind } from "../src/pointer.js";
import type { ShapeDraft } from "../src/shapes/index.js";
import type { HitTarget } from "../src/targets.js";

// ---------------------------------------------------------------------------
// Chemistry fixture: hydroxide plus bromomethane, the SN2 that every course
// teaches first. Two arrows, and both of them are drawable with taps alone.
// ---------------------------------------------------------------------------

export const HYDROXIDE = createSpecies({
  id: "hydroxide",
  label: "hydroxide",
  atoms: [createAtom({ id: "O1", element: "O", formalCharge: -1, lonePairs: 3, implicitHydrogens: 1 })],
});

export const BROMOMETHANE = createSpecies({
  id: "bromomethane",
  label: "bromomethane",
  atoms: [
    createAtom({ id: "C1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "Br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "bond_C1_Br1", a: "C1", b: "Br1", order: 1 })],
});

export function sn2StartingState(): MechanismState {
  return createState({
    id: "sn2-from",
    members: [
      { species: HYDROXIDE, role: "nucleophile" },
      { species: BROMOMETHANE, role: "substrate" },
    ],
  });
}

/** Ethene, for the one case where a pi bond source needs a pivot end. */
export function etheneState(): MechanismState {
  return createState({
    id: "ethene-from",
    members: [
      {
        species: createSpecies({
          id: "ethene",
          atoms: [
            createAtom({ id: "C1", element: "C", implicitHydrogens: 2 }),
            createAtom({ id: "C2", element: "C", implicitHydrogens: 2 }),
          ],
          bonds: [createBond({ id: "bond_C1_C2", a: "C1", b: "C2", order: 2 })],
        }),
        role: "substrate",
      },
      {
        species: createSpecies({
          id: "proton",
          atoms: [createAtom({ id: "H1", element: "H", formalCharge: 1 })],
        }),
        role: "acid",
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Named points. The numbers mean nothing; only which target they map to.
// ---------------------------------------------------------------------------

export const P = {
  oxygenAtom: { x: 10, y: 10 },
  oxygenLonePair: { x: 14, y: 6 },
  oxygenSecondLonePair: { x: 6, y: 14 },
  carbonAtom: { x: 100, y: 10 },
  bromineAtom: { x: 140, y: 10 },
  handleAtCarbon: { x: 110, y: 10 },
  handleAtBromine: { x: 130, y: 10 },
  bondBody: { x: 120, y: 10 },
  nowhere: { x: 500, y: 500 },
  elsewhere: { x: 600, y: 600 },
} as const satisfies Record<string, Point2>;

export function sn2Targets(): TableEntry[] {
  return [
    { point: P.oxygenAtom, target: { kind: "atom", atomId: "O1" } },
    { point: P.oxygenLonePair, target: { kind: "lonePair", atomId: "O1", slotIndex: 0 } },
    { point: P.oxygenSecondLonePair, target: { kind: "lonePair", atomId: "O1", slotIndex: 1 } },
    { point: P.carbonAtom, target: { kind: "atom", atomId: "C1" } },
    { point: P.bromineAtom, target: { kind: "atom", atomId: "Br1" } },
    {
      point: P.handleAtCarbon,
      target: { kind: "bondEndHandle", bondId: "bond_C1_Br1", atomId: "C1" },
    },
    {
      point: P.handleAtBromine,
      target: { kind: "bondEndHandle", bondId: "bond_C1_Br1", atomId: "Br1" },
    },
    { point: P.bondBody, target: { kind: "bondBody", bondId: "bond_C1_Br1" } },
  ];
}

// ---------------------------------------------------------------------------
// The fake hit tester
// ---------------------------------------------------------------------------

export interface TableEntry {
  readonly point: Point2;
  readonly target: HitTarget;
  /** Defaults to Infinity, meaning nothing contested the hit. */
  readonly margin?: number;
  /** When true, the target is only offered while something is armed. */
  readonly onlyWhenArmed?: boolean;
}

export function tableHitTester(entries: readonly TableEntry[]): HitTester {
  const byPoint = new Map<string, TableEntry>();
  for (const entry of entries) {
    byPoint.set(pointKey(entry.point), entry);
  }
  return {
    hitTest(query: HitTestQuery): HitTestOutcome {
      const entry = byPoint.get(pointKey(query.point));
      if (entry === undefined || (entry.onlyWhenArmed === true && query.armedSource === null)) {
        return {
          primary: { kind: "empty", point: query.point },
          candidates: [],
          margin: Number.POSITIVE_INFINITY,
        };
      }
      return {
        primary: entry.target,
        candidates: [{ target: entry.target, score: 0 }],
        margin: entry.margin ?? Number.POSITIVE_INFINITY,
      };
    },
  };
}

function pointKey(point: Point2): string {
  return `${point.x},${point.y}`;
}

// ---------------------------------------------------------------------------
// A driver, so a test reads as a sequence of gestures
// ---------------------------------------------------------------------------

export interface GestureOptions {
  readonly pointerId?: number;
  readonly pointerType?: PointerKind;
  readonly pressure?: number;
  readonly buttonIsPrimary?: boolean;
  readonly timestampMs?: number;
}

export class Driver {
  state: InteractionState;
  notices: InteractionNotice[] = [];
  effects: InteractionEffect[] = [];
  /**
   * Every event kind this driver was asked to send, in order.
   *
   * The tap only corpus harness reads this to prove no drag was involved, rather
   * than trusting the helper that made the gesture. A claim checked against the
   * thing that made it is not a check.
   */
  events: InteractionEvent["kind"][] = [];
  private clock = 0;
  private readonly hitTester: HitTester;

  constructor(draft: ShapeDraft, entries: readonly TableEntry[]) {
    this.state = createInteractionState(draft);
    this.hitTester = tableHitTester(entries);
  }

  send(event: InteractionEvent): Transition {
    this.events.push(event.kind);
    const transition = reduce(this.state, event, { hitTester: this.hitTester });
    this.state = transition.state;
    this.notices.push(...transition.notices);
    this.effects.push(...transition.effects);
    return transition;
  }

  pointer(point: Point2, options: GestureOptions = {}): PointerInput {
    this.clock += 1;
    return {
      pointerId: options.pointerId ?? 1,
      pointerType: options.pointerType ?? "touch",
      point,
      timestampMs: options.timestampMs ?? this.clock,
      ...(options.pressure === undefined ? {} : { pressure: options.pressure }),
      ...(options.buttonIsPrimary === undefined
        ? {}
        : { buttonIsPrimary: options.buttonIsPrimary }),
    };
  }

  down(point: Point2, options: GestureOptions = {}): Transition {
    return this.send({ kind: "pointerDown", pointer: this.pointer(point, options) });
  }

  move(point: Point2, options: GestureOptions = {}): Transition {
    return this.send({ kind: "pointerMove", pointer: this.pointer(point, options) });
  }

  up(point: Point2, options: GestureOptions = {}): Transition {
    return this.send({ kind: "pointerUp", pointer: this.pointer(point, options) });
  }

  cancel(point: Point2, options: GestureOptions = {}): Transition {
    return this.send({ kind: "pointerCancel", pointer: this.pointer(point, options) });
  }

  /** A tap: press and release without ever leaving the target. */
  tap(point: Point2, options: GestureOptions = {}): void {
    this.down(point, options);
    this.up(point, options);
  }

  /** A drag: press here, travel, release there. */
  drag(from: Point2, to: Point2, options: GestureOptions = {}): void {
    this.down(from, options);
    this.move(to, options);
    this.up(to, options);
  }

  background(): Transition {
    this.clock += 1;
    return this.send({ kind: "appBackgrounded", timestampMs: this.clock });
  }

  noticeIds(): NoticeId[] {
    return this.notices.map((item) => item.id);
  }

  sawNotice(id: NoticeId): boolean {
    return this.noticeIds().includes(id);
  }

  clearLog(): void {
    this.notices = [];
    this.effects = [];
    this.events = [];
  }
}
