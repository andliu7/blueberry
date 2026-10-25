/**
 * TEST-OUTS, owner brief 17 Oct items 1 and 2 (ordered queue item 12).
 *
 *   - every section's treasure chest is always open, and pressing it offers a
 *     10 to 15 question quiz over that section, longer each section
 *   - every unit has a 20 question exam, open at any time
 *   - passing lights the lessons up (journal event `tested_out`), so the
 *     section turns green and the unit progress bar moves
 *
 * WHAT A PASS LIGHTS. A section's test lights that section AND every earlier
 * section of the unit, so passing it skips ahead the way Duolingo's "jump
 * here" does: the next section's lessons open behind it. A unit exam lights
 * every earlier unit too, with their checkpoints, so passing Unit 4's exam
 * opens Unit 5 from anywhere on the course. Side quests are never lit: they
 * stay optional either way.
 *
 * Pure and light, like reviewCheckpoints.ts: the pathway is in the entry
 * chunk, so this file imports no pool. testOutPool.ts holds the heavy half,
 * and test/testOuts.test.ts holds the two halves equal (TEST_OUT_UNITS below
 * names exactly the units whose lessons carry question pools).
 */
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS, checkpointNodeId, unitNumber, type PathwayNode, type PathwayUnit } from "../../demo/pathwayMap";
import { reviewsAfter } from "./reviewCheckpoints";
import { chestIdFor, splitSections } from "./pathwaySections";
import { roadOf, unitShape } from "./unitShape";
import { prerequisitesOf } from "./pathwayState";
import { coveredSideQuests } from "../../syllabus/syllabusPlan";

/** Units whose lessons have question pools to draw a test from (content/u1 to u10). */
export const TEST_OUT_UNITS: ReadonlySet<string> = new Set(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9", "u10"]);

/** Questions in a unit exam. */
export const UNIT_EXAM_SIZE = 20;
/** The first section's test, and the last's. Sections between step up evenly. */
export const SECTION_TEST_MIN = 10;
export const SECTION_TEST_MAX = 15;

export interface UnitSection {
  readonly number: number;
  readonly title: string;
  /** Main-line lessons with content, and the section's review stops: what a pass lights. */
  readonly lights: readonly string[];
  /** The map lessons the test draws its questions from. */
  readonly sources: readonly string[];
  /** The chest at the section's end: the checkpoint's chest, or the test's own. */
  readonly chestId: string;
  /** The stage quiz or review stop that ends the section, or null for a section cut by length. */
  readonly checkpointId: string | null;
  /** The section's test-out, or null when the unit has no question pools. */
  readonly testId: string | null;
}

export interface TestOut {
  readonly id: string;
  readonly kind: "section" | "unit";
  readonly unit: PathwayUnit;
  /** For a section test; null for a unit exam. */
  readonly section: UnitSection | null;
  readonly title: string;
  /** How many questions it asks, at most: a smaller pool asks what it has. */
  readonly size: number;
  readonly sources: readonly string[];
  /** Node ids a pass journals as cleared. */
  readonly lights: readonly string[];
  /** The chest a pass earns, or null. */
  readonly chestId: string | null;
}

function sectionTestId(unitId: string, section: number): string {
  return `${unitId}-s${section}-test`;
}

export function unitExamId(unitId: string): string {
  return `${unitId}-unit-test`;
}

// Side quests stay off quizzes and exams by default: the owner's syllabus rule, STATUS.md "Owner brief, 23 Oct" (C1).
function onLine(node: PathwayNode): boolean {
  return node.kind !== "branch" && node.playable !== undefined;
}

/** A side quest the student's syllabus covers, with content to ask from (syllabus/syllabusPlan.ts). */
function onSyllabus(node: PathwayNode, covered: ReadonlySet<string>): boolean {
  return node.kind === "branch" && node.playable !== undefined && node.mentionOnly !== true && covered.has(node.id);
}

/**
 * The section a side quest belongs to: the latest section holding one of its
 * prerequisites (a prerequisite that is itself a side quest is followed back
 * to the main line). The last section when nothing places it.
 */
export function branchSection(unit: PathwayUnit, node: PathwayNode, seen: ReadonlySet<string> = new Set()): number {
  const sections = unitSections(unit);
  let found = 0;
  for (const id of prerequisitesOf(unit, node)) {
    const holder = sections.find((section) => section.sources.includes(id) || section.lights.includes(id));
    const before = unit.nodes.find((entry) => entry.id === id);
    const at = holder !== undefined ? holder.number : before !== undefined && before.kind === "branch" && !seen.has(id) ? branchSection(unit, before, new Set([...seen, node.id])) : 0;
    found = Math.max(found, at);
  }
  return found === 0 ? (sections[sections.length - 1]?.number ?? 1) : found;
}

const sectionCache = new Map<string, readonly UnitSection[]>();

/**
 * The unit's sections, cut exactly as the pathway draws them: the road's stops
 * (roadOf), review stops after their lesson, a stage quiz or review ending a
 * section (PathwayTab builds the same list for splitSections).
 */
export function unitSections(unit: PathwayUnit): readonly UnitSection[] {
  const cached = sectionCache.get(unit.id);
  if (cached !== undefined) return cached;
  const stops = roadOf(unit, unitShape(unit)).flatMap((stop) => [
    { id: stop.node.id, title: stop.node.title, checkpoint: stop.node.role === "quiz" && stop.soon.length === 0, item: stop.node as PathwayNode | null },
    ...reviewsAfter(stop.node.id).map((review) => ({ id: review.id, title: review.title, checkpoint: true, item: null as PathwayNode | null })),
  ]);
  const testable = TEST_OUT_UNITS.has(unit.id);
  const sections = splitSections(stops).map((section): UnitSection => {
    const sources = section.stops.flatMap((stop) => (stop.item !== null && onLine(stop.item) ? [stop.item.id] : []));
    const lights = section.stops.flatMap((stop) => (stop.item === null || onLine(stop.item) ? [stop.id] : []));
    const testId = testable && sources.length > 0 ? sectionTestId(unit.id, section.number) : null;
    const checkpointId = section.checkpoint?.id ?? null;
    return {
      number: section.number,
      title: section.title,
      lights,
      sources,
      chestId: checkpointId !== null ? chestIdFor(checkpointId) : `${sectionTestId(unit.id, section.number)}-chest`,
      checkpointId,
      testId,
    };
  });
  sectionCache.set(unit.id, sections);
  return sections;
}

/** Longer each section: SECTION_TEST_MIN for the first, SECTION_TEST_MAX for the last. */
export function sectionTestSize(number: number, count: number): number {
  if (count <= 1) return SECTION_TEST_MAX;
  return Math.round(SECTION_TEST_MIN + ((SECTION_TEST_MAX - SECTION_TEST_MIN) * (number - 1)) / (count - 1));
}

/** Everything a unit exam pass lights in one unit: its line, its review stops and its checkpoint. */
function unitLights(unit: PathwayUnit): readonly string[] {
  const line = unit.nodes.filter(onLine).map((node) => node.id);
  if (line.length === 0) return [];
  const reviews = unit.nodes.flatMap((node) => reviewsAfter(node.id).map((review) => review.id));
  return [...line, ...reviews, checkpointNodeId(unit.id)];
}

/**
 * The test-out with this id, or null for any other id. `covered` is the side
 * quests the student's syllabus covers (owner rule, STATUS C1): each joins the
 * unit exam's sources and its own section's, never what a pass lights, so a
 * side quest stays optional and the unlock rule is untouched. Empty, the
 * default with no syllabus, is the main line only.
 */
export function testOutFor(id: string, units: readonly PathwayUnit[] = PATHWAY_UNITS, covered: ReadonlySet<string> = coveredSideQuests()): TestOut | null {
  for (const [at, unit] of units.entries()) {
    if (!TEST_OUT_UNITS.has(unit.id)) continue;
    if (id === unitExamId(unit.id)) {
      return {
        id,
        kind: "unit",
        unit,
        section: null,
        title: `${unitNumber(unit.title)} exam`,
        size: UNIT_EXAM_SIZE,
        sources: unit.nodes.filter((node) => onLine(node) || onSyllabus(node, covered)).map((node) => node.id),
        lights: units.slice(0, at + 1).flatMap(unitLights),
        chestId: null,
      };
    }
    const sections = unitSections(unit);
    const section = sections.find((entry) => entry.testId === id);
    if (section === undefined) continue;
    return {
      id,
      kind: "section",
      unit,
      section,
      title: `Section ${section.number} test-out`,
      size: sectionTestSize(section.number, sections.length),
      sources: [...section.sources, ...unit.nodes.filter((node) => onSyllabus(node, covered) && branchSection(unit, node) === section.number).map((node) => node.id)],
      lights: sections.filter((entry) => entry.number <= section.number).flatMap((entry) => entry.lights),
      chestId: section.chestId,
    };
  }
  return null;
}

/** Test ids the journal holds a pass for. */
export function passedTests(journal: readonly EconomyEvent[]): ReadonlySet<string> {
  const passed = new Set<string>();
  for (const event of journal) if (event.kind === "tested_out") passed.add(event.testId);
  return passed;
}
