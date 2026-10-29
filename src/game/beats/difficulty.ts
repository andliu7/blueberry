/**
 * THE DIFFICULTY ALGORITHM: easier, same or harder for the next lesson.
 * Written down in documentation/UNIT-STYLE-GUIDE.md section 5; this file is
 * the code of those rules and test/difficulty.test.ts pins each one.
 *
 * It is layered on pace.ts, not a replacement. pace.ts answers "how has this
 * student been doing across the unit" (rules R1 to R4). This file adds the two
 * things a unit-wide number cannot see:
 *
 *   R5 PREREQUISITE. A lesson is only as easy as what it assumes. If a lesson
 *      this one assumes (content/u1/lessonLinks.ts, U1_LINKS) was last cleared
 *      under 75% first-try, this lesson plays at most at pace 0: the meet step
 *      stays and L2 does not jump the queue. The weak lessons are named, so
 *      the lesson can offer them back. It never LOWERS pace below what R1 to
 *      R4 gave; it only stops a +1 from skipping the ground this lesson stands on.
 *   R6 STUCK. Two clears of THIS lesson in a row, both under 50% first-try,
 *      since the student's last tap on it, means the lesson is not landing.
 *      Pace is -1 and the help path (walk-through, earlier lessons, guide) is
 *      offered. The tap wins over R6: "About right" or "Too easy" after the
 *      second clear ends it.
 *
 * Direction follows the final pace: -1 is "easier" than the authored lesson,
 * +1 is "harder", 0 is "same".
 *
 * Pure functions of the journal, like pace.ts: nothing is stored, nothing is
 * locked, no diamond moves. Never a timer, and never "harder" meaning more
 * obscure; harder means less scaffolding on the same ideas.
 */
import type { EconomyEvent } from "@blueberry/economy";
import { CHAIN_LINKS, CHAIN_ORDER, chainTeacherOf } from "../content/lessonChain";
import { clearAccuracy, FLAWLESS_RUN_FOR_HARDER, paceFor, ROUGH_BELOW, unitIdForNode, type Pace } from "./pace";

type Cleared = Extract<EconomyEvent, { kind: "node_cleared" }>;

/** A prerequisite last cleared under this first-try share is "weak". */
export const WEAK_PREREQ_BELOW = 0.75;
/** A clear under this first-try share counts toward "stuck". */
export const STUCK_BELOW = 0.5;
/** Clears in a row, on one lesson, that make a student stuck. */
export const STUCK_CLEARS = 2;

export interface DifficultyRule {
  readonly id: "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
  readonly name: string;
  /** One plain sentence, built from the constants so it cannot drift from the code. */
  readonly text: string;
}

const pct = (share: number): string => `${Math.round(share * 100)}%`;

/**
 * The six rules as words, in the order they apply. The staff slideshow
 * (admin/deckModel.ts) prints this table, and test/difficultyRules.test.ts
 * pins each row to behaviour, so the slide and the code say the same thing.
 */
export const DIFFICULTY_RULES: readonly DifficultyRule[] = [
  { id: "R1", name: "A tap wins", text: "Too easy sets the next lesson harder, About right sets it as written, Too hard sets it easier, and the count of flawless lessons starts again." },
  { id: "R2", name: "Flawless twice", text: `${FLAWLESS_RUN_FOR_HARDER} flawless lessons in a row make the next one harder. One flawless lesson lifts easier back to as written.` },
  { id: "R3", name: "Rough means easier", text: `Under ${pct(ROUGH_BELOW)} right first try on a lesson makes the next one easier. Exactly ${pct(ROUGH_BELOW)} is not rough.` },
  { id: "R4", name: "Mixed settles", text: `Any other result, some misses but at least ${pct(ROUGH_BELOW)} right, settles pace at as written. A lesson with no count is never read as rough.` },
  { id: "R5", name: "Prerequisite", text: `If a lesson this one builds on was last cleared under ${pct(WEAK_PREREQ_BELOW)} first try, this lesson is never made harder. Its warm-up stays.` },
  { id: "R6", name: "Stuck", text: `${STUCK_CLEARS} clears of the same lesson in a row, each under ${pct(STUCK_BELOW)} first try, with no tap since, make it easier and offer help.` },
];

export type Direction = "easier" | "same" | "harder";

export interface Advice {
  readonly pace: Pace;
  readonly direction: Direction;
  /** The lessons this one assumes that were last cleared weakly (R5), nearest first. */
  readonly weakPrerequisites: readonly string[];
  /** R6: the lesson is not landing; the need-help path should be offered. */
  readonly stuck: boolean;
  /** Plain sentences, one per rule that changed the result. */
  readonly reasons: readonly string[];
}

function ordered(journal: readonly EconomyEvent[]): readonly EconomyEvent[] {
  return journal
    .map((event, i) => ({ event, i, ms: Date.parse(event.at) }))
    .sort((a, b) => a.ms - b.ms || a.i - b.i)
    .map((one) => one.event);
}

/** The accuracy of the most recent clear of a node, or undefined when it has none. */
function lastAccuracy(events: readonly EconomyEvent[], nodeId: string): number | null | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (event.kind === "node_cleared" && event.nodeId === nodeId) return clearAccuracy(event);
  }
  return undefined;
}

/** R5: the lessons `nodeId` assumes that were last cleared under WEAK_PREREQ_BELOW, nearest first. */
export function weakPrerequisites(journal: readonly EconomyEvent[], nodeId: string): readonly string[] {
  const link = CHAIN_LINKS[nodeId];
  if (link === undefined) return [];
  const events = ordered(journal);
  const order = CHAIN_ORDER;
  const weak = new Set<string>();
  for (const concept of link.assumes) {
    const teacher = chainTeacherOf(concept);
    if (teacher === null) continue;
    const accuracy = lastAccuracy(events, teacher);
    // No count means the clear cannot be read as weak, as in pace.ts.
    if (accuracy !== undefined && accuracy !== null && accuracy < WEAK_PREREQ_BELOW) weak.add(teacher);
  }
  return [...weak].sort((a, b) => order.indexOf(b) - order.indexOf(a));
}

/** R6: whether the last STUCK_CLEARS clears of this lesson were all rough, with no tap on it since. */
export function isStuck(journal: readonly EconomyEvent[], nodeId: string): boolean {
  const events = ordered(journal).filter((event) => (event.kind === "node_cleared" || event.kind === "lesson_rated") && event.nodeId === nodeId);
  const lastTap = events.map((event) => event.kind).lastIndexOf("lesson_rated");
  const clears = events.slice(lastTap + 1).filter((event): event is Cleared => event.kind === "node_cleared");
  if (clears.length < STUCK_CLEARS) return false;
  return clears.slice(-STUCK_CLEARS).every((event) => {
    const accuracy = clearAccuracy(event);
    return accuracy !== null && accuracy < STUCK_BELOW;
  });
}

/** What the next lesson on `nodeId` should play like, and why. */
export function adviceForNode(journal: readonly EconomyEvent[], nodeId: string): Advice {
  const unitId = unitIdForNode(nodeId);
  const base: Pace = unitId === null ? 0 : paceFor(journal, unitId);
  let pace: Pace = base;
  const reasons: string[] = [];

  const weak = weakPrerequisites(journal, nodeId);
  if (weak.length > 0 && pace === 1) {
    pace = 0;
    reasons.push("A lesson this one builds on went roughly, so it keeps its warm-up.");
  }

  const stuck = isStuck(journal, nodeId);
  if (stuck && pace !== -1) {
    pace = -1;
    reasons.push("The last two tries at this lesson went roughly, so it plays gently and offers help.");
  }

  const direction: Direction = pace === -1 ? "easier" : pace === 1 ? "harder" : "same";
  return { pace, direction, weakPrerequisites: weak, stuck, reasons };
}
