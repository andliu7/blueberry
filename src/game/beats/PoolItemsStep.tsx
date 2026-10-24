/**
 * One lesson step that plays a node's pool items of one kind in a row: its
 * ladders, its match boards or its "Draw it" items (template.ts, U1-P3).
 *
 * The surfaces are the existing ones, unchanged: the sort ladder, the match
 * board, and the draw beat. Each item mounts with `key={entry.id}`, React's
 * plain way to throw the previous item's state away when the next one shows.
 *
 * THE FIRST JUDGED RESULT COUNTS, the same rule the in-a-row run keeps
 * (PracticeRunner.tsx): a ladder can be adjusted until it is right, so a
 * later "right" must not hide the first miss from the step's honest count.
 *
 * A DRAWING MISSED ON THE FIRST TRY COMES BACK (U1-P3 round 2): its id goes to
 * onDone, the run queues it, and the lesson's recycle pass ("The ones that got
 * away", template.ts) plays it again after the other steps. Ladders and boards
 * are not queued: the student already fixes those on the spot until they are right.
 */
import { Suspense, lazy, useRef, useState } from "react";

import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import type { PoolEntry } from "../content/u1/types";
import type { PoolResume } from "../resume/lessonSave";
import { sortFiguresFor } from "./sortFigures";

const SortBeatView = lazy(() => import("./sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const MatchBoardFromSpec = lazy(() => import("./match/MatchBoard").then((m) => ({ default: m.Board })));
const DrawBeatView = lazy(() => import("./draw/DrawBeatView").then((m) => ({ default: m.DrawBeatView })));

/** The first failable rung an item allows, so a miss counts; its first rung otherwise. */
function poolItemLevel(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

export interface PoolItemsStepProps {
  readonly entries: readonly PoolEntry[];
  /**
   * Called once, after the last item's Continue: how many cleared on the first
   * try, of how many, and the ids of the drawings missed on the first try.
   */
  readonly onDone: (cleared: number, total: number, missedDrawIds: readonly string[]) => void;
  /** Save as you go (resume/lessonSave.ts): where a saved step picks up. Read on mount only. */
  readonly resume?: PoolResume | null;
  /** When an item but the last is first judged: the ids finished so far and the tally, so the lesson can save them. */
  readonly onCommit?: (done: readonly string[], cleared: number, missedDrawIds: readonly string[]) => void;
}

export function PoolItemsStep({ entries, onDone, resume = null, onCommit }: PoolItemsStepProps) {
  const [index, setIndex] = useState(resume?.index ?? 0);
  const first = useRef<BeatResult | null>(null);
  const cleared = useRef(resume?.cleared ?? 0);
  const missedDraws = useRef<string[]>(resume === null ? [] : [...resume.missed]);

  const keep = (result: BeatResult) => {
    if (first.current !== null) return;
    first.current = result;
    // Saved the moment it is judged, as if its Continue were pressed, so a
    // reload lands on the next item. The last item is not: its Continue ends
    // the step, and the lesson saves that move itself.
    if (onCommit === undefined || index + 1 >= entries.length) return;
    const ok = clearsBeat(result);
    const missedNow = !ok && entries[index]?.item.kind === "draw" ? [...missedDraws.current, entries[index]!.id] : [...missedDraws.current];
    onCommit(entries.slice(0, index + 1).map((one) => one.id), cleared.current + (ok ? 1 : 0), missedNow);
  };
  const next = () => {
    if (first.current !== null && clearsBeat(first.current)) cleared.current += 1;
    else if (first.current !== null && entries[index]?.item.kind === "draw") missedDraws.current.push(entries[index]!.id);
    first.current = null;
    if (index + 1 >= entries.length) onDone(cleared.current, entries.length, missedDraws.current);
    else setIndex(index + 1);
  };

  const entry = entries[index];
  if (entry === undefined) return null;
  const item = entry.item;
  return (
    <Suspense fallback={<p role="status">Loading the next problem.</p>}>
      {item.kind === "sort" ? (
        <SortBeatView
          key={entry.id}
          content={item.content}
          level={poolItemLevel(item.content.beat.levels)}
          figures={sortFiguresFor(entry.id)}
          onResult={keep}
          onContinue={next}
        />
      ) : null}
      {item.kind === "match" ? (
        <MatchBoardFromSpec key={entry.id} spec={item.board} onComplete={keep} onContinue={next} />
      ) : null}
      {item.kind === "draw" ? (
        <DrawBeatView key={entry.id} beat={item.beat} level={poolItemLevel(item.beat.levels)} onResult={keep} onContinue={next} />
      ) : null}
    </Suspense>
  );
}
