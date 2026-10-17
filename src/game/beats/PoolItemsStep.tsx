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
 */
import { Suspense, lazy, useRef, useState } from "react";

import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import type { PoolEntry } from "../content/u1/types";
import { U1_SORT_FIGURES } from "../content/u1";
import { U2_SORT_FIGURES } from "../content/u2";

const SortBeatView = lazy(() => import("./sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const MatchBoardFromSpec = lazy(() => import("./match/MatchBoard").then((m) => ({ default: m.Board })));
const DrawBeatView = lazy(() => import("./draw/DrawBeatView").then((m) => ({ default: m.DrawBeatView })));

/** The first failable rung an item allows, so a miss counts; its first rung otherwise. */
export function poolItemLevel(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

export interface PoolItemsStepProps {
  readonly entries: readonly PoolEntry[];
  /** Called once, after the last item's Continue: how many cleared on the first try, of how many. */
  readonly onDone: (cleared: number, total: number) => void;
}

export function PoolItemsStep({ entries, onDone }: PoolItemsStepProps) {
  const [index, setIndex] = useState(0);
  const first = useRef<BeatResult | null>(null);
  const cleared = useRef(0);

  const keep = (result: BeatResult) => {
    if (first.current === null) first.current = result;
  };
  const next = () => {
    if (first.current !== null && clearsBeat(first.current)) cleared.current += 1;
    first.current = null;
    if (index + 1 >= entries.length) onDone(cleared.current, entries.length);
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
          figures={U1_SORT_FIGURES[entry.id] ?? U2_SORT_FIGURES[entry.id]}
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
