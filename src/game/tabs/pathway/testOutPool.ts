/**
 * What a test-out asks (testOuts.ts says which tests exist and what a pass
 * lights). Drawn from the lessons' own pools, so nothing here authors a
 * question: every entry is the draft its lesson owns (placeholder: true), and
 * the run carries the draft mark like any other run.
 *
 * THE DRAW, owner brief 17 Oct item 1:
 *   - conceptual, light on nomenclature: a naming lesson's pool and any
 *     question that asks for a name are left out
 *   - harder than the lessons: each lesson's questions are taken hardest
 *     first (the highest mastery rung the item declares)
 *   - a mix of answer shapes: the drag-and-drop ladders and matching boards
 *     the section has go in first, then the MCQs fill the rest
 *   - interleaved by lesson, so any stretch of the test samples every lesson
 *
 * Draw items (the structure editor) are left out: a test-out is a quick
 * sitting, and the editor is a multi-MB lazy load per question.
 *
 * Kept apart from testOuts.ts because the pools pull every unit's content in,
 * and the pathway itself must not.
 */
import { interleave, lessonPool, practicePool } from "../../beats/practice/pools";
import type { PoolEntry } from "../../content/u1/types";
import type { TestOut } from "./testOuts";

export interface TestOutEntry {
  readonly entry: PoolEntry;
  /** The lesson this problem came from, handed to the surfaces that look things up by node. */
  readonly source: string;
}

/** Questions that ask for a name rather than about structure or behaviour. */
const ASKS_FOR_A_NAME = /\b(IUPAC|name of|named|nomenclature)\b/i;

function asksForName(entry: PoolEntry): boolean {
  return entry.item.kind === "mcq" && ASKS_FOR_A_NAME.test(entry.item.beat.prompt);
}

/** The highest rung an item declares; a matching board declares none, so it counts as a middle rung. */
function rungOf(entry: PoolEntry): number {
  const item = entry.item;
  if (item.kind === "mcq") return Math.max(...item.beat.levels);
  if (item.kind === "sort") return Math.max(...item.content.beat.levels);
  return 2;
}

/** A lesson's questions a test may ask, hardest first; ties keep authored order. */
export function candidatesOf(node: string): readonly TestOutEntry[] {
  if (node.includes("nomen")) return [];
  return [...lessonPool(node), ...practicePool(node)]
    .filter((entry) => entry.item.kind !== "draw" && !asksForName(entry))
    .map((entry, at) => ({ entry, at }))
    .sort((a, b) => rungOf(b.entry) - rungOf(a.entry) || a.at - b.at)
    .map(({ entry }) => ({ entry, source: node }));
}

/**
 * The test's questions, at most `test.size`. The ladders and boards go in
 * first (up to a third of the test), then MCQs, each list interleaved by
 * lesson; the two are then dealt so a non-MCQ lands every third question.
 */
export function testOutPool(test: Pick<TestOut, "size" | "sources">): readonly TestOutEntry[] {
  const lessons = test.sources.map(candidatesOf);
  const all = interleave(...lessons);
  const seen = new Set<string>();
  const unique = all.filter((one) => !seen.has(one.entry.id) && seen.add(one.entry.id));
  const others = unique.filter((one) => one.entry.item.kind !== "mcq").slice(0, Math.floor(test.size / 3));
  const mcqs = unique.filter((one) => one.entry.item.kind === "mcq").slice(0, test.size - others.length);
  const out: TestOutEntry[] = [];
  let o = 0;
  let m = 0;
  while (out.length < test.size && (o < others.length || m < mcqs.length)) {
    const otherTurn = out.length % 3 === 1;
    if ((otherTurn && o < others.length) || m >= mcqs.length) out.push(others[o++]!);
    else out.push(mcqs[m++]!);
  }
  return out;
}
