/**
 * THE SIDE QUEST RULE ON TEST-OUTS (owner rule, STATUS C1): a side quest the
 * student's syllabus covers joins its unit exam's sources and its own
 * section's (branchSection, syllabusPlan.ts), never what a pass lights, so a
 * side quest stays optional and the unlock rule is untouched. With no
 * syllabus the test is exactly testOutFor's, the main line only.
 *
 * A layer over testOutFor rather than inside it: testOuts.ts is in #/app's
 * first-open chunk, which is over its byte budget, and only the lazy test-out
 * run (TestOutRun.tsx) reads a test's sources. Pure, no React.
 */
import { PATHWAY_UNITS, type PathwayNode, type PathwayUnit } from "../demo/pathwayMap";
import { testOutFor, type TestOut } from "../tabs/pathway/testOuts";
import { branchSection, coveredSideQuests } from "./syllabusPlan";

/** A side quest the syllabus covers, with content to ask from. */
function onSyllabus(node: PathwayNode, covered: ReadonlySet<string>): boolean {
  return node.kind === "branch" && node.playable !== undefined && node.mentionOnly !== true && covered.has(node.id);
}

/** The test-out with this id, with the covered side quests added to its sources, or null for any other id. */
export function syllabusTestOutFor(id: string, units: readonly PathwayUnit[] = PATHWAY_UNITS, covered: ReadonlySet<string> = coveredSideQuests()): TestOut | null {
  const test = testOutFor(id, units);
  if (test === null || covered.size === 0) return test;
  const extra = test.unit.nodes.filter((node) => onSyllabus(node, covered) && (test.section === null || branchSection(test.unit, node) === test.section.number));
  return extra.length === 0 ? test : { ...test, sources: [...test.sources, ...extra.map((node) => node.id)] };
}
