/**
 * One pathway node in, one LESSON out: the node's authored beats played in
 * the seven-slot template order, under the recipe strip, closed by the
 * reward slot.
 *
 * WHY THIS FILE EXISTS. Five beat surfaces were built in parallel, each
 * behind its own directory and each with its own props: the MCQ runner wants
 * a node id, the match board wants one MatchBeat, the sort view wants a
 * SortContent, the synthesis beat wants one SynthesisGapProblem. That is the
 * right shape for each of them in isolation and the wrong shape for the
 * pathway, which knows one thing only: the id of the node the student
 * tapped. This file is the adapter between those two facts, and it is the
 * only place that knows all of them exist.
 *
 * WHAT CHANGED WITH THE TEMPLATE (S4 lesson-flow piece). The old runner
 * resolved a node to exactly ONE beat kind and played it, so a node carrying
 * an MCQ and a ladder never showed the ladder. Now template.ts plans every
 * authored beat into the slot ordering (hook, recognise, connect, order,
 * produce, recycle, reward) and this runner plays the plan in sequence, with
 * the recipe strip as the lesson's progress bar and a reward card closing
 * the run. The ordering rule, the run state machine and the strip's segments
 * are pure functions in template.ts, where the suite can hold them; this
 * file owns the useState and the wiring, nothing else. The node-to-ladder
 * table moved there with the plan, and is re-exported below so its readers
 * keep their import path.
 *
 * THE NON-OBVIOUS REACT PATTERN, named per the house rule: the
 * `if (seenNode !== node)` block is React's documented adjust-state-when-a-
 * prop-changes pattern. Setting state during render makes React restart the
 * render with the new state before anything reaches the screen, so a parent
 * that swaps `node` without a key still gets a fresh run rather than the
 * previous node's progress under the new lesson.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not invent content: a node with
 * nothing authored renders the honest empty screen, exactly as before.
 *
 * IT DOES BANK, AND THAT IS A CORRECTION. This header used to say "it does not
 * write progress", and reasoned that a celebration about numbers nobody banked
 * would be a lie with confetti on it. The reasoning was right and the
 * conclusion was backwards. The consequence, measured on 2026-09-05 by
 * finishing #/lesson/u1-kvt at 1 of 1 and diffing localStorage: the stored
 * progress was byte-identical afterwards. No lesson recorded, no diamonds, no
 * streak, the pathway header still reading 0 of 86, the node still open, the
 * trail never turning green. `clearNode` had ZERO callers anywhere in the app
 * while `startNode` was already spending charge to enter, so the Path tab, the
 * product's first destination, took payment and banked nothing.
 *
 * So the fix is not to keep refusing the celebration. It is to make the
 * banking real, which makes the celebration true. The run reports one
 * `node_cleared` when it reaches the reward phase, once, and the reward slot
 * shows the diamonds the store actually returned rather than a number this
 * component made up.
 *
 * WHY THE IMPORT IS DYNAMIC. app/progress touches `document` at module scope
 * and the web suite runs in node with no DOM, which is the same measured
 * reason LessonGems.tsx records for lazy-loading its balance. A static import
 * here would redden every test that mounts a runner.
 */

import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import { mcqBeatsForNode } from "./mcq";
import { MATCH_BOARDS } from "./match";
import { sortContentById } from "./sort";
import { synthesisGapsForNode } from "./synthesis";
import { ToolRail } from "../app/ui/ToolRail";
import { Berry } from "../mascot/Berry";
import { pathwayNode } from "../demo/pathwayMap";
import { ChipPress } from "./ChipPress";
import { ExitMark, GemMark } from "./chromeIcons";
import { RecipeStrip } from "./RecipeStrip";
import {
  currentStep,
  missedMcqIdsFrom,
  planLesson,
  recipeSegments,
  reportRecycle,
  reportStep,
  startRun,
  type LessonRun,
} from "./template";
import "./beat-chrome.css";

// The resolution API lives in template.ts now: one table and one ordering
// for the plan, the pathway and the tests. Re-exported to keep import paths.
export { LADDER_FOR_NODE, nodeHasBeat, resolveBeat, type ResolvedBeat } from "./template";

/** The match boards authored for one pathway node. None gives an empty list. */
function matchBoardsForNode(node: string) {
  return MATCH_BOARDS.filter((board) => board.node === node);
}

/* ------------------------------------------------------------------ */
/* The runner                                                          */
/* ------------------------------------------------------------------ */

// Each surface is lazy because the pathway loads long before any of them is
// needed, and CLAUDE.md's budget row counts the game route's initial payload.
// A Suspense fallback that is a blank rectangle is banned by the same file, so
// the fallback below says what it is waiting for.
const McqRunner = lazy(() => import("./mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const MatchBoard = lazy(() => import("./match/MatchBoard").then((m) => ({ default: m.MatchBoard })));
const SortBeatView = lazy(() => import("./sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const SynthesisGapBeat = lazy(() =>
  import("./synthesis/SynthesisGapBeat").then((m) => ({ default: m.SynthesisGapBeat })),
);
const LessonGems = lazy(() => import("./LessonGems"));

export interface BeatRunnerProps {
  /** The pathway node the student tapped, for example "u3-directing". */
  readonly node: string;
  readonly level?: MasteryLevel;
  readonly onExit: () => void;
  /** Honours prefers-reduced-motion. The synthesis beat asks for it by name. */
  readonly reducedMotion?: boolean;
}

/**
 * Plays the node's lesson plan, step by step.
 *
 * Renders nothing but an honest message when the node has no beat. That case
 * should be unreachable from the pathway, which only links nodes that pass
 * nodeHasBeat, but a deep link can still arrive by hand.
 */
export function BeatRunner({ node, level = 1, onExit, reducedMotion = false }: BeatRunnerProps) {
  const plan = useMemo(() => planLesson(node), [node]);

  const [seenNode, setSeenNode] = useState(node);
  const [run, setRun] = useState<LessonRun | null>(() => (plan === null ? null : startRun(plan)));
  // The current MCQ step's within-step CLEARED fraction, for the strip's
  // green fill. Cleared and not answered: a miss moves the student on without
  // moving the green, because a green segment over a screen that says "Not
  // yet" is the bar contradicting the panel under it. See session.ts.
  const [mcqFraction, setMcqFraction] = useState(0);
  // The last graded result of a single-problem step, read when it advances.
  // A ref, not state: recording it must not re-render mid-animation, and
  // nothing draws from it.
  const stepResult = useRef<BeatResult | null>(null);
  /**
   * The diamonds the store actually paid for this run, or null before it has
   * been asked. Not computed here: CLAUDE.md's rule is that every number in
   * the HUD and the reward moment is READ from deriveEconomy, never recomputed
   * by the surface that shows it, because two formulas drift and the student
   * sees a different figure in two places.
   */
  const [banked, setBanked] = useState<number | null>(null);
  /** Which node this runner has already banked, so a re-render cannot double pay. */
  const bankedFor = useRef<string | null>(null);

  // See the header: adjust-state-during-render, so a swapped node never plays
  // the previous node's run.
  if (seenNode !== node) {
    setSeenNode(node);
    setRun(plan === null ? null : startRun(plan));
    setMcqFraction(0);
    stepResult.current = null;
    setBanked(null);
  }

  /**
   * Bank the clear, once, when the run reaches its reward phase.
   *
   * ABOVE the early return on purpose: a hook after a conditional return is
   * the one thing React's rules forbid outright, so this reads `run?.phase`
   * and does nothing until there is a run in the reward phase.
   *
   * The ref is keyed by NODE rather than being a boolean, so that swapping to
   * another node inside the same mounted runner can bank that one too, while
   * any number of re-renders of the same finished run cannot pay twice. The
   * store is idempotent about replays on its own terms (clearNode returns 0
   * diamonds the second time), but relying on that would still append a second
   * node_cleared event to an append-only journal, and the journal is the thing
   * every balance is derived from.
   *
   * The pathway's own vocabulary for a node is spine/branch/gate/boss, while
   * the economy's NodeKind is concept/reaction/branch/... Those are different
   * vocabularies and this is the seam between them: a beat is journalled as a
   * "concept" clear, which is the convention PathwayTab.tsx:866 already states
   * for a lesson node, and the pathway's spine-ness rides along as the `spine`
   * option the economy pays on.
   */
  useEffect(() => {
    if (run?.phase !== "reward") return;
    if (bankedFor.current === node) return;
    bankedFor.current = node;
    const flawless = !run.recycled && run.clearedBeats === run.totalBeats;
    const spine = pathwayNode(node)?.kind === "spine";
    let live = true;
    void import("../app/progress").then(({ progress }) => {
      const diamonds = progress.clearNode(node, "concept", {
        flawless,
        stepsInOneSitting: run.totalBeats,
        spine,
      });
      if (live) setBanked(diamonds);
    });
    return () => {
      live = false;
    };
  }, [run?.phase, run?.recycled, run?.clearedBeats, run?.totalBeats, node]);

  if (plan === null || run === null) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This lesson is still being written. Nothing here is lost: pick another node and come back.</p>
        <button type="button" onClick={onExit}>
          Back to the pathway
        </button>
      </div>
    );
  }

  const step = currentStep(run);
  const segments = recipeSegments(run);

  const advanceStep = (cleared: number, total: number, missedMcqIds?: readonly string[]) => {
    stepResult.current = null;
    setMcqFraction(0);
    setRun((r) =>
      r === null ? r : reportStep(r, { cleared, total, ...(missedMcqIds !== undefined ? { missedMcqIds } : {}) }),
    );
  };

  /** One-problem steps (match, sort, synthesis) advance from their Continue. */
  const advanceSingle = () => {
    const result = stepResult.current;
    advanceStep(result === null || clearsBeat(result) ? 1 : 0, 1);
  };

  // The strip element, one instance whichever slot is playing. For the MCQ
  // surfaces it rides down into the question screen's own top bar
  // (progressSlot), so each screen keeps exactly one bar and one exit, in
  // the committed lesson frame's shape: X, the recipe strip, the counters.
  const inMcq = step?.beat.kind === "mcq" || run.phase === "recycle";
  // The header's counter. LAZY, and LessonGems.tsx's header records the
  // measured reason: its balance comes from app/progress, whose import chain
  // touches `document` at module scope, and the web suite runs in node with
  // no DOM. The fallback is the gem alone rather than a blank gap, so the row
  // never changes width while the module arrives.
  const currency = (
    <Suspense
      fallback={
        <span className="lesson-currency" aria-hidden>
          <GemMark />
        </span>
      }
    >
      <LessonGems />
    </Suspense>
  );
  const strip = (
    <RecipeStrip
      segments={segments}
      {...(inMcq ? { currentFraction: mcqFraction } : {})}
      reducedMotion={reducedMotion}
    />
  );

  return (
    <div className="beat-runner">
      {/* THE TOOLS, INSIDE A LESSON. This is the half of CLAUDE.md's
          "interactive, always reachable" that a tab could never satisfy: a
          student three steps into a directing-effects beat who wants an
          electronegativity had to leave the beat to get it, and leaving was a
          decision they then had to reverse. The rail opens a sheet over this
          screen instead, so the lesson is still underneath it. See
          app/ui/ToolRail.tsx for why these two stopped being tabs. */}
      <header className="beat-runner-tools">
        <ToolRail />
      </header>

      {/* THE HEADER DOES NOT CHANGE SHAPE BETWEEN SCREENS. It used to be
          dropped on the reward slot, which drew its own bare strip instead,
          so the exit vanished on the last screen of the lesson and the strip
          started at a different x than it had on every question before it. A
          student watching the top of the frame saw the chrome rearrange
          itself at the moment they finished. One row: the exit, the strip,
          the count, in the committed frames' own order.

          The MCQ surfaces render this row themselves, because their sheet
          scrolls internally and the row has to sit above that scroller
          rather than above the sheet; they are handed the same strip. */}
      {!inMcq ? (
        <LessonHeader onExit={onExit} strip={strip} currency={currency} />
      ) : null}

      {/* THE STAGE. One surface plays here at a time and it fills what is
          left of the screen: see beat-chrome.css for the measurement that
          made this a real element rather than a bare Suspense boundary
          (Suspense renders no DOM node of its own, so there was nothing for
          the surfaces to grow inside).

          THE GUTTER IS THE STAGE'S, NOT EACH SURFACE'S, and only where the
          surface does not already own one. Measured on a 390px phone: the
          sort ladder, the match board and the synthesis gap all render as a
          bare `<section>` with no padding and no max width, so their prompts
          started at x = 0 and ran to the viewport edge while the X and the
          recipe strip above them sat in a 16px gutter. The MCQ sheet and the
          reward slot each carry `mx-auto max-w-xl` and their own padding,
          because both scroll internally and their sticky action bars have to
          reach the full width; a second gutter around those would double the
          inset and inset the sticky bar. So the class is conditional rather
          than unconditional, and the condition is which surface is playing. */}
      <div className={`beat-runner__stage${inMcq ? "" : " beat-runner__stage--gutter"}`}>
      <Suspense fallback={<p role="status">Loading the lesson.</p>}>
        {step?.beat.kind === "mcq" ? (
          <McqRunner
            node={step.beat.node}
            level={level}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={strip}
            currencySlot={currency}
            onProgress={(progress) => setMcqFraction(progress.clearedFraction)}
            onDone={(results) =>
              advanceStep(results.filter((r) => clearsBeat(r)).length, results.length, missedMcqIdsFrom(results))
            }
          />
        ) : null}
        {step?.beat.kind === "match" ? (
          <MatchBoard
            beat={matchBoardsForNode(step.beat.node)[0]!}
            level={level}
            onComplete={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}
        {step?.beat.kind === "sort" ? (
          <SortBeatView
            content={sortContentById(step.beat.ladderId)!}
            level={level}
            onResult={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}
        {step?.beat.kind === "synthesis" ? (
          <SynthesisGapBeat
            problem={synthesisGapsForNode(step.beat.node)[0]!}
            level={level}
            reducedMotion={reducedMotion}
            onResolved={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}

        {run.phase === "recycle" ? (
          // The recycle slot: the missed quick questions come back, once.
          // Same surface, same rules, only the ones that got away.
          <McqRunner
            node={node}
            level={level}
            beats={mcqBeatsForNode(node).filter((beat) => run.missedMcqIds.includes(beat.id))}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={strip}
            currencySlot={currency}
            onProgress={(progress) => setMcqFraction(progress.clearedFraction)}
            onDone={(results) => {
              setMcqFraction(0);
              setRun((r) =>
                r === null ? r : reportRecycle(r, results.filter((res) => clearsBeat(res)).length, results.length),
              );
            }}
          />
        ) : null}

        {run.phase === "reward" ? (
          <RewardSlot run={run} banked={banked} reducedMotion={reducedMotion} onExit={onExit} />
        ) : null}
      </Suspense>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The header                                                          */
/* ------------------------------------------------------------------ */

/**
 * The committed lesson frames' top row: the exit chip, the progress bar, the
 * currency count. One component so the row cannot drift between the screens
 * that draw it, which is exactly what it had done: the question frame put the
 * X at x = 16 and the strip from x = 72, and the lesson-complete frame had no
 * X at all and started its strip at x = 36.
 *
 * THE COUNT IS A DRAWN GEM AND A NUMBER. Both frames pair the number with an
 * icon; a bare numeral does not say what it counts.
 */
function LessonHeader({
  onExit,
  strip,
  currency,
}: {
  readonly onExit: () => void;
  readonly strip: ReactNode;
  readonly currency: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
      <button
        type="button"
        onPointerDown={onExit}
        aria-label="Leave this lesson"
        title="Leave this lesson"
        className="lesson-exit"
      >
        <ExitMark />
      </button>
      <div className="min-w-0 flex-1">{strip}</div>
      {currency}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The reward slot                                                     */
/* ------------------------------------------------------------------ */

/**
 * The template's closing slot: what this run held, said plainly, in the
 * coach's voice. See the file header for why this is not RewardMoment.
 */
function RewardSlot({
  run,
  banked,
  reducedMotion,
  onExit,
}: {
  readonly run: LessonRun;
  /** Diamonds the store actually paid, or null while the clear is still landing. */
  readonly banked: number | null;
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
}) {
  const cleared = run.clearedBeats + run.recycleCleared;
  const played = run.totalBeats;
  const stillRough = run.recycled ? run.recycleTotal - run.recycleCleared : 0;
  return (
    // CENTRED, NOT BOTTOM-PINNED UNDER A HOLE. The previous build put the
    // strip at the top and pushed this card to the bottom with an `mt-auto`,
    // which on a phone left roughly 600px of bare cream between them: the
    // same dead zone the S3 judge carried against the question screen,
    // reappearing on the screen the lesson ENDS on. The card is centred in
    // what the header leaves, so the frame has a subject.
    <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-6 text-center">
        <Berry mood="cheer" behaviour="celebrate" sizePx={96} reducedMotion={reducedMotion} />
        <h2 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">Lesson complete</h2>
        <p className="text-scale-base text-bb-foreground">
          You cleared {cleared} of {played}
          {run.recycled
            ? `, and brought back ${run.recycleCleared} of the ${run.recycleTotal} that slipped past the first time.`
            : "."}
        </p>
        {/* THE NUMBER THE STORE PAID, not one this screen worked out. It
            appears only once the clear has actually landed, which is why it
            is null-checked rather than defaulted to 0: "+0 diamonds" while a
            dynamic import is still in flight would be a wrong number shown
            confidently, and a moment later it would change under the reader.
            Nothing is claimed here either; the clear is already banked by the
            time this renders, so this is a receipt and not a button. */}
        {banked !== null && banked > 0 ? (
          <p className="lesson-banked">
            <GemMark />
            <span>
              +{banked} {banked === 1 ? "diamond" : "diamonds"}
            </span>
          </p>
        ) : null}
        {stillRough > 0 ? (
          <p className="text-scale-sm text-bb-muted-foreground">
            {stillRough === 1 ? "One is" : `${stillRough} are`} still settling. That is what the next visit is for,
            and this node stays open on the pathway.
          </p>
        ) : null}
        {/* THE CHECK CHIP, NOT THE CLAIM CHIP. The committed button-types
            sheet reserves green for `review` and `claim` and gives `continue`
            the same periwinkle as `check`, and this control banks nothing:
            the file header above is explicit that this slot is a receipt for
            a run the progress store already committed. A green claim chip
            over the word Continue promises a payout the screen does not
            make. */}
        <ChipPress className="mt-2 w-full" onClick={onExit}>
          Continue
        </ChipPress>
      </div>
    </div>
  );
}
