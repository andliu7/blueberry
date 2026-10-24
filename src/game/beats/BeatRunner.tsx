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

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import type { Card, Reco } from "../cards/types";
import type { CardOffer } from "../cards/Recommendation";
import { decks, PERSONAL_DECK_ID } from "../cards/store";
import { isDraftCard } from "./practice/pools";
import { CORRECT_CAUSE } from "./mcq/grade";
import { questionForBeat } from "../tabs/trainer/engine/question";
import { MATCH_BOARDS } from "./match";
import { sortContentById } from "./sort";
import { synthesisGapsForNode } from "./synthesis";
import { Berry } from "../mascot/Berry";
import { pathwayNode } from "../demo/pathwayMap";
import { HUMAN_GATE_MARK } from "../pathway-sheet/nodeSheetModel";
import { showDraftMarks } from "../app/flags";
import { ChipPress } from "./ChipPress";
import { Press } from "../app/ui/Press";
import { ExitMark, GemMark } from "./chromeIcons";
import { RecipeStrip } from "./RecipeStrip";
import { LessonPreview } from "./LessonPreview";
import { LessonRecap } from "./LessonRecap";
import { PoolItemsStep } from "./PoolItemsStep";
import { markPrimed, opensOnPreview, primedThisSession, primingFor } from "./priming";
import {
  challengeable,
  challengeOutcome,
  currentStep,
  lessonHasDraft,
  lessonMeetBeats,
  lessonPoolItems,
  lessonRecogniseBeats,
  missedMcqIdsFrom,
  missedPoolIdsOf,
  planLesson,
  recipeProgress,
  recipeSegments,
  recycleBeatsFor,
  recyclePoolEntriesFor,
  BADGE_LABEL,
  reportRecycle,
  reportStep,
  startRun,
  type LessonRun,
} from "./template";
import { browserStorage, clearSave, loadLesson, resumePool, saveLesson, savedCount, type LessonResume, type McqSave, type PoolSave } from "../resume/lessonSave";
import { ResumePrompt } from "../resume/ResumePrompt";
import { skipAheadTestId, unitIdForNode, type LessonRating, type Pace } from "./pace";
import { hrefForLesson, hrefForReview, hrefForTab } from "../app/routes";
import "./beat-chrome.css";

// The resolution API lives in template.ts now: one table and one ordering
// for the plan, the pathway and the tests. Re-exported to keep import paths.
export { LADDER_FOR_NODE, nodeHasBeat, resolveBeat, type ResolvedBeat } from "./template";
import type { ResolvedBeat } from "./template";
import { plural } from "@/lib/helpers";

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
// The trainer engine, the same screen the Train tab mounts. Fixed and
// full-viewport by construction, so inside a lesson it covers the header and
// the strip exactly as it covers the tab bar: one screen, wherever it opens.
const TrainerScreen = lazy(() => import("../tabs/trainer/engine/TrainerScreen").then((m) => ({ default: m.TrainerScreen })));
// The mistake-to-card toast. Lazy for the same budget reason as the surfaces
// above, and it only mounts once a run has actually produced an offer, so a
// clean run never loads it at all. A null fallback is right here: the toast
// is an overlay, and its honest loading state is absence.
const Recommendation = lazy(() => import("../cards/Recommendation"));
// The in-a-row run, for a node whose plan is a practice step (template.ts).
const PracticeRunner = lazy(() => import("./practice/PracticeRunner").then((m) => ({ default: m.PracticeRunner })));

export interface BeatRunnerProps {
  /** The pathway node the student tapped, for example "u3-directing". */
  readonly node: string;
  readonly level?: MasteryLevel;
  readonly onExit: () => void;
  /** Honours prefers-reduced-motion. The synthesis beat asks for it by name. */
  readonly reducedMotion?: boolean;
  /**
   * Play the node as its CHALLENGE run: no recycle pass, a miss ends the run,
   * and a pass banks `challenge_passed` instead of a clear. See RunMode in
   * template.ts for why that is what "harder" means here.
   */
  readonly challenge?: boolean;
  /**
   * The unit's pace (beats/pace.ts), read by the parent from the journal when
   * the lesson opens. Changes which questions the plan plays; 0 is the
   * authored lesson.
   */
  readonly pace?: Pace;
}

/**
 * Plays the node's lesson plan, step by step.
 *
 * Renders nothing but an honest message when the node has no beat. That case
 * should be unreachable from the pathway, which only links nodes that pass
 * nodeHasBeat, but a deep link can still arrive by hand.
 */
export function BeatRunner({ node, level = 1, onExit, reducedMotion = false, challenge = false, pace: paceProp = 0 }: BeatRunnerProps) {
  // The pace is read ONCE, when the lesson opens: useState keeps its first
  // value and ignores later props. This lesson's own clear and rating change
  // the journal (and so the parent's pace) before it ends, and the plan must
  // not change under a run that is still playing it.
  const [pace] = useState(paceProp);
  const plan = useMemo(() => planLesson(node, { pace }), [node, pace]);
  const mode = challenge ? "challenge" : "practice";

  const [seenNode, setSeenNode] = useState(node);
  const [run, setRun] = useState<LessonRun | null>(() => (plan === null ? null : startRun(plan, mode)));
  // The current MCQ step's within-step CLEARED fraction, for the strip's
  // green fill. Cleared and not answered: a miss moves the student on without
  // moving the green, because a green segment over a screen that says "Not
  // yet" is the bar contradicting the panel under it. See session.ts.
  const [mcqFraction, setMcqFraction] = useState(0);
  // The last graded result of a single-problem step, read when it advances.
  // A ref, not state: recording it must not re-render mid-animation, and
  // nothing draws from it.
  const stepResult = useRef<BeatResult | null>(null);
  // A trainer step that draws first (template.ts `draws`): the step index whose
  // drawings are finished, and how they went, so the trainer's result adds to
  // them rather than replacing them. -1 while the drawings are still playing.
  const [drawsDoneAt, setDrawsDoneAt] = useState(-1);
  const drawTally = useRef<{ cleared: number; total: number; missed: readonly string[] }>({ cleared: 0, total: 0, missed: [] });
  // The recycle pass replays missed drawings first, then missed quick
  // questions. Set once the drawings are done, with how they went.
  const [recycleDraws, setRecycleDraws] = useState<{ cleared: number; total: number } | null>(null);
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

  /**
   * The mistake-to-card offer this run is currently showing, or null. The
   * beat surfaces have emitted onOfferCard since they were built; this is
   * the parent that finally passes it. The store's own offer() is the gate:
   * it refuses a card the student already owns or already turned down, so a
   * toast is raised only when the reco actually entered pendingRecos. Saving
   * and dismissing go back through the same seam (saveCard retires the reco,
   * dismissReco counts it), and the toast hides itself, so nothing here has
   * to null the state: a stale offer cannot re-show, because the store
   * refuses it on the next emit.
   */
  const [offer, setOffer] = useState<CardOffer | null>(null);
  const handleOfferCard = useCallback((card: Card, reco: Reco) => {
    // A draft pool question never becomes a flashcard (mayOfferCard in practice/pools.ts); CHANGED 2026-10-17.
    if (isDraftCard(card.id)) return;
    decks.offer(reco);
    const pending = decks.getSnapshot().pendingRecos.some((r) => r.cardId === reco.cardId);
    if (pending) setOffer({ card, reco });
  }, []);

  /**
   * The priming preview (U1-P2): whether this visit still has to show it.
   * Decided once when the runner mounts or the node changes, never on a
   * re-render, so the preview cannot reappear mid-lesson. Not on a Challenge
   * and not on a reopen in the same session (beats/priming.ts says why).
   */
  const [needsPreview, setNeedsPreview] = useState(() =>
    opensOnPreview(node, { challenge, seenThisSession: primedThisSession(node) }),
  );
  /**
   * The preview's loop, closed at the end (U1-P2 round 4). `primed` is set
   * when the student pressed START on this visit's preview, with the guess
   * they locked in (null if they skipped it). When the lesson's own ending
   * says Continue, a primed visit shows LessonRecap first; `recapOpen` is
   * that screen being up.
   */
  const [primed, setPrimed] = useState<{ readonly guess: string | null } | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);

  /**
   * SAVE AS YOU GO (resume/lessonSave.ts). `resume` is a saved position found
   * when the lesson opened, shown as the "pick up where you left off?" screen
   * until the student answers it. `mcqSave` is the open multiple-choice
   * step's answers so far, a ref because it only feeds the next write.
   * `restoredAt` hands those answers to the step that was open, once.
   */
  const [resume, setResume] = useState<LessonResume | null>(() =>
    plan === null ? null : loadLesson(browserStorage(), node, plan, mode),
  );
  const mcqSave = useRef<McqSave | null>(null);
  /** Questions answered in the steps already behind the student, for the saved count. */
  const answeredBefore = useRef(0);
  const [restoredAt, setRestoredAt] = useState<{ readonly step: string; readonly save: McqSave } | null>(null);
  /** The open pool-items step's progress (drawings, ladders, boards), a ref for the same reason. */
  const poolSave = useRef<PoolSave | null>(null);
  /** The saved pool step handed back on CONTINUE, read once by the step it names. */
  const [restoredPool, setRestoredPool] = useState<PoolSave | null>(null);
  // A practice or stage-quiz node saves inside PracticeRunner; this runner must never write or clear its key.
  const practicePlan = plan?.steps[0]?.beat.kind === "practice";
  // A practice run with a bookmark opens on its resume screen, never on the preview first. Read once per node.
  const practiceSavedAtOpen = useMemo(() => practicePlan && savedCount(browserStorage(), node) !== null, [practicePlan, node]);

  // See the header: adjust-state-during-render, so a swapped node never plays
  // the previous node's run.
  if (seenNode !== node) {
    setNeedsPreview(opensOnPreview(node, { challenge, seenThisSession: primedThisSession(node) }));
    setPrimed(null);
    setRecapOpen(false);
    setSeenNode(node);
    setRun(plan === null ? null : startRun(plan, mode));
    setMcqFraction(0);
    stepResult.current = null;
    setDrawsDoneAt(-1);
    drawTally.current = { cleared: 0, total: 0, missed: [] };
    setRecycleDraws(null);
    setBanked(null);
    setOffer(null);
    setResume(null);
    mcqSave.current = null;
    answeredBefore.current = 0;
    setRestoredAt(null);
    poolSave.current = null;
    setRestoredPool(null);
  }

  /**
   * Write the position: the run, the open step's answers, and every count the
   * student has earned so far. Read from this render's state and refs, so the
   * step callbacks below call it as they commit.
   */
  const writePosition = (r: LessonRun) => {
    if (practicePlan) return;
    const drawsDone =
      drawsDoneAt === r.index && r.phase === "content" ? { at: drawsDoneAt, ...drawTally.current } : null;
    const count =
      answeredBefore.current +
      (mcqSave.current?.results.length ?? 0) +
      (poolSave.current?.done.length ?? 0) +
      (drawsDone?.total ?? 0) +
      (r.phase === "recycle" ? (recycleDraws?.total ?? 0) : 0);
    saveLesson(browserStorage(), node, r, mcqSave.current, primed?.guess, count, {
      pool: poolSave.current,
      drawsDone,
      recycleDraws: r.phase === "recycle" ? recycleDraws : null,
      // The lesson bar's fill, so the path can draw the half-done node's ring.
      bar: recipeProgress(recipeSegments(r), mcqSave.current?.fraction ?? 0),
    });
  };

  // Write the position whenever the run moves (a step done, the recycle pass
  // begun, the ending reached, which clears it). Not while the resume screen
  // is up, or the fresh run behind it would overwrite the bookmark it offers.
  useEffect(() => {
    if (run === null || resume !== null) return;
    writePosition(run);
    // writePosition reads the same state listed here; it is a plain function, so it is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, resume, node, primed, drawsDoneAt, recycleDraws]);

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
    // A CHALLENGE NEVER BANKS A CLEAR. The node is already cleared, and a
    // second node_cleared would pay the replay row on top of the pass. A pass
    // journals `challenge_passed`, whose price the economy owns; a fail
    // journals nothing, because the entry charge was spent at the gate and
    // there is nothing else to record.
    if (run.mode === "challenge") {
      if (challengeOutcome(run) !== "passed") {
        setBanked(0);
        return;
      }
      let live = true;
      void import("../app/progress").then(({ progress }) => {
        const diamonds = progress.passChallenge(node);
        if (live) setBanked(diamonds);
      });
      return () => {
        live = false;
      };
    }
    const flawless = !run.recycled && run.clearedBeats === run.totalBeats;
    const spine = pathwayNode(node)?.kind === "spine";
    let live = true;
    void Promise.all([import("../app/progress"), import("../chest/chestFlow")]).then(([{ progress }, { earnChestForClear }]) => {
      const diamonds = progress.clearNode(node, "concept", {
        flawless,
        stepsInOneSitting: run.totalBeats,
        spine,
        // First-try right, so the unit's pace can tell a rough lesson from a mixed one (beats/pace.ts).
        ...(run.totalBeats > 0 ? { cleared: Math.min(run.clearedBeats, run.totalBeats) } : {}),
      });
      // A section final saves its section's chest, offered back on the path.
      earnChestForClear(progress, node);
      if (live) setBanked(diamonds);
    });
    return () => {
      live = false;
    };
  }, [run, node]);

  // A Challenge link typed by hand for a node whose steps cannot report a
  // miss: say so, rather than playing a run that would pass on anything.
  if (challenge && !challengeable(node)) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This lesson has no Challenge yet. Practice is open on the pathway.</p>
        <Press onClick={onExit}>
          Back to the pathway
        </Press>
      </div>
    );
  }

  // THE RESUME SCREEN comes first when this lesson has a saved position.
  if (resume !== null) {
    const answered = resume.answered;
    return (
      <ResumePrompt
        node={node}
        title={pathwayNode(node)?.title ?? ""}
        detail={`${plural(answered, "question", "questions")} done and saved`}
        saved={`${answered} saved ${answered === 1 ? "question" : "questions"}`}
        bar={
          <RecipeStrip
            segments={recipeSegments(resume.run)}
            {...(resume.mcq !== null ? { currentFraction: resume.mcq.fraction ?? 0 } : {})}
            reducedMotion={reducedMotion}
          />
        }
        reducedMotion={reducedMotion}
        onExit={onExit}
        onRestart={() => {
          clearSave(browserStorage(), node);
          answeredBefore.current = 0;
          setResume(null);
        }}
        onContinue={() => {
          const open = resume.open;
          const drawsDone = open.drawsDone ?? null;
          const drawsHere = drawsDone !== null && drawsDone.at === resume.run.index && resume.run.phase === "content";
          const recycled = resume.run.phase === "recycle" ? (open.recycleDraws ?? null) : null;
          mcqSave.current = resume.mcq;
          poolSave.current = open.pool ?? null;
          setRestoredPool(open.pool ?? null);
          // The steps behind: the total less what is still open (answers, items, finished drawings).
          answeredBefore.current = Math.max(
            0,
            resume.answered -
              (resume.mcq?.results.length ?? 0) -
              (open.pool?.done.length ?? 0) -
              (drawsHere ? drawsDone.total : 0) -
              (recycled?.total ?? 0),
          );
          if (drawsHere) {
            drawTally.current = { cleared: drawsDone.cleared, total: drawsDone.total, missed: [...drawsDone.missed] };
            setDrawsDoneAt(drawsDone.at);
          }
          if (recycled !== null) setRecycleDraws(recycled);
          if (resume.mcq !== null) {
            setRestoredAt({ step: `${resume.run.phase}:${resume.run.index}`, save: resume.mcq });
            setMcqFraction(resume.mcq.fraction ?? 0);
          }
          if (resume.primedGuess !== undefined) {
            markPrimed(node);
            setPrimed({ guess: resume.primedGuess });
          }
          setNeedsPreview(false);
          setRun(resume.run);
          setResume(null);
        }}
      />
    );
  }

  // THE PRIMING PREVIEW comes before any question, for a seven-slot lesson
  // and for a practice run alike. START remembers it for the session and
  // drops straight into the plan below.
  const priming = primingFor(node);
  if (needsPreview && !practiceSavedAtOpen && priming !== null && plan !== null) {
    return (
      <LessonPreview
        node={node}
        priming={priming}
        strip={<RecipeStrip segments={recipeSegments(startRun(plan, mode))} reducedMotion={reducedMotion} />}
        reducedMotion={reducedMotion}
        onExit={onExit}
        onStart={(guess) => {
          markPrimed(node);
          setPrimed({ guess });
          setNeedsPreview(false);
        }}
      />
    );
  }

  // THE RECAP, after the lesson's own ending, on a visit that opened on the
  // preview. Its Continue (or SKIP, or X) goes where the ending was going.
  if (recapOpen && primed !== null && priming !== null) {
    return <LessonRecap node={node} priming={priming} picked={primed.guess} reducedMotion={reducedMotion} onDone={onExit} />;
  }
  // The lesson's ending calls this instead of onExit: a primed visit gets the
  // recap first. The X mid-lesson still calls onExit, so leaving early never
  // lands on a recap of a lesson the student did not finish.
  const finish = primed !== null && priming !== null ? () => setRecapOpen(true) : onExit;

  // A practice or stage-quiz node is a run mode, not a seven-slot lesson: the
  // run owns its own header, its ending and its banking (clear at 3 in a row).
  if (plan?.steps[0]?.beat.kind === "practice") {
    return (
      <Suspense fallback={<p role="status">Loading the practice set.</p>}>
        <PracticeRunner key={node} node={node} onExit={onExit} onFinish={finish} reducedMotion={reducedMotion} challenge={challenge} />
      </Suspense>
    );
  }

  if (plan === null || run === null) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This lesson is still being written. Nothing here is lost: pick another node and come back.</p>
        <Press onClick={onExit}>
          Back to the pathway
        </Press>
      </div>
    );
  }

  const step = currentStep(run);
  // A trainer step that opens with drawings names the activity on screen, not the trainer still to come.
  const drawingFirst =
    (step?.beat.kind === "mechanism" || step?.beat.kind === "resonance") &&
    step.beat.draws !== undefined &&
    drawsDoneAt !== run.index;
  const segments = recipeSegments(run).map((segment) =>
    drawingFirst && segment.state === "current" && segment.slot === "produce"
      ? { ...segment, badge: "draw" as const, label: BADGE_LABEL.draw }
      : segment,
  );

  // The open MCQ step's saved answers, if this is the step that was resumed.
  const stepKey = `${run.phase}:${run.index}`;
  const resumeResults = restoredAt?.step === stepKey ? { resumeResults: restoredAt.save.results } : {};
  /** After every answered question: remember the step's answers and write the position. */
  const saveAnswer = (results: readonly BeatResult[], fraction: number) => {
    mcqSave.current = { results, fraction };
    writePosition(run);
  };
  /** A pool-items step's props for save as you go: where to pick up, and the write after each item. */
  const poolSaving = (part: "items" | "draws" | "recycle", ids: readonly string[]) => {
    const tag = `${stepKey}:${part}`;
    return {
      resume: restoredPool?.step === tag ? resumePool(ids, restoredPool) : null,
      onCommit: (done: readonly string[], cleared: number, missed: readonly string[]) => {
        poolSave.current = { step: tag, done, cleared, missed };
        writePosition(run);
      },
    };
  };

  const advanceStep = (
    cleared: number,
    total: number,
    missedMcqIds?: readonly string[],
    missedPoolIds?: readonly string[],
  ) => {
    stepResult.current = null;
    answeredBefore.current += Math.max(total, mcqSave.current?.results.length ?? 0);
    mcqSave.current = null;
    poolSave.current = null;
    setMcqFraction(0);
    setRun((r) =>
      r === null
        ? r
        : reportStep(r, {
            cleared,
            total,
            ...(missedMcqIds !== undefined ? { missedMcqIds } : {}),
            ...(missedPoolIds !== undefined ? { missedPoolIds } : {}),
          }),
    );
  };

  /** One-problem steps (match, sort, synthesis) advance from their Continue. */
  const advanceSingle = () => {
    const result = stepResult.current;
    advanceStep(result === null || clearsBeat(result) ? 1 : 0, 1);
  };

  /** A trainer step with drawings in front: the drawings' tally plus the trainer's one result. */
  const advanceAfterDraws = () => {
    const result = stepResult.current;
    const { cleared, total, missed } = drawTally.current;
    drawTally.current = { cleared: 0, total: 0, missed: [] };
    advanceStep(cleared + (result === null || clearsBeat(result) ? 1 : 0), total + 1, undefined, missed);
  };

  // The strip element, one instance whichever slot is playing. For the MCQ
  // surfaces it rides down into the question screen's own top bar
  // (progressSlot), so each screen keeps exactly one bar and one exit, in
  // the one lesson header shape: X and the bar (A2 round 6).
  const recyclingDraws = run.phase === "recycle" && recycleDraws === null && missedPoolIdsOf(run).length > 0;
  const inMcq = step?.beat.kind === "meet" || step?.beat.kind === "mcq" || (run.phase === "recycle" && !recyclingDraws);
  // The trainer engine is a fixed full-viewport screen with its own exit, so
  // while it plays the lesson chrome underneath is covered but still in the
  // accessibility tree. inert takes the tool rail out of the tab order and
  // the header is not drawn at all: one exit on screen, one exit reachable.
  // A trainer step whose "Draw it" items have not finished yet plays them first, in the lesson chrome.
  const drawsPending = drawingFirst;
  const inEngine = (step?.beat.kind === "mechanism" || step?.beat.kind === "resonance") && !drawsPending;
  const strip = (
    <RecipeStrip
      segments={segments}
      {...(inMcq ? { currentFraction: mcqFraction } : {})}
      reducedMotion={reducedMotion}
    />
  );

  // The pool items each kind of pool step plays, named once so the save can check them.
  const itemEntries =
    step?.beat.kind === "poolSort" || step?.beat.kind === "poolMatch" || step?.beat.kind === "draw"
      ? lessonPoolItems(step.beat.node, step.beat.kind === "poolSort" ? "sort" : step.beat.kind === "poolMatch" ? "match" : "draw")
      : [];
  const drawEntries =
    drawsPending && (step?.beat.kind === "mechanism" || step?.beat.kind === "resonance") ? lessonPoolItems(step.beat.draws ?? "", "draw") : [];
  const recycleEntries = recyclingDraws ? recyclePoolEntriesFor(run.plan, missedPoolIdsOf(run)) : [];

  return (
    <div className="beat-runner">
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
      {!inMcq && !inEngine ? (
        <LessonHeader onExit={onExit} strip={strip} />
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
        {step?.beat.kind === "meet" ? (
          // THE MEET STEP: the first-meeting questions at level 0, where a
          // pick cannot fail and the how-to shows the answer forming. It
          // reports 0 of 0 so nothing here counts for or against the run;
          // the graded rung-1 questions come next (template.ts lessonMeetBeats).
          <McqRunner
            node={step.beat.node}
            level={0}
            beats={lessonMeetBeats(step.beat.node)}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={
              lessonHasDraft(step.beat.node) && showDraftMarks() ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {strip}
                  <p className="text-scale-xs text-bb-muted-foreground">{HUMAN_GATE_MARK}</p>
                </div>
              ) : (
                strip
              )
            }
            onProgress={(progress) => setMcqFraction(progress.fraction)}
            {...resumeResults}
            onCommit={(results, progress) => saveAnswer(results, progress.fraction)}
            onDone={() => advanceStep(0, 0)}
          />
        ) : null}
        {step?.beat.kind === "mcq" ? (
          // Each question at its own rung, L1 before L2, chosen by the pace (template.ts).
          <McqRunner
            node={step.beat.node}
            level="declared"
            beats={lessonRecogniseBeats(step.beat.node, step.beat.pace)}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={
              lessonHasDraft(step.beat.node) && showDraftMarks() ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {strip}
                  <p className="text-scale-xs text-bb-muted-foreground">{HUMAN_GATE_MARK}</p>
                </div>
              ) : (
                strip
              )
            }
            onProgress={(progress) => setMcqFraction(progress.clearedFraction)}
            {...resumeResults}
            onCommit={(results, progress) => saveAnswer(results, progress.clearedFraction)}
            onOfferCard={handleOfferCard}
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
            onOfferCard={(gapOffer) => handleOfferCard(gapOffer.card, gapOffer.reco)}
            onContinue={advanceSingle}
          />
        ) : null}

        {step?.beat.kind === "poolSort" || step?.beat.kind === "poolMatch" || step?.beat.kind === "draw" ? (
          // The node's pool ladders, boards or drawings, one after another (PoolItemsStep.tsx).
          <PoolItemsStep
            key={`${step.beat.kind}:${run.index}`}
            entries={itemEntries}
            {...poolSaving("items", itemEntries.map((one) => one.id))}
            onDone={(cleared, total, missedDraws) => advanceStep(cleared, total, undefined, missedDraws)}
          />
        ) : null}

        {drawsPending && step !== null && (step.beat.kind === "mechanism" || step.beat.kind === "resonance") ? (
          // Produce, part one: draw it. Then the same step hands over to the trainer below.
          <PoolItemsStep
            key={`draws:${run.index}`}
            entries={drawEntries}
            {...poolSaving("draws", drawEntries.map((one) => one.id))}
            onDone={(cleared, total, missed) => {
              poolSave.current = null;
              drawTally.current = { cleared, total, missed };
              setDrawsDoneAt(run.index);
            }}
          />
        ) : null}

        {inEngine && step !== null && (step.beat.kind === "mechanism" || step.beat.kind === "resonance") ? (
          <TrainerBeat
            beat={step.beat}
            level={level}
            reducedMotion={reducedMotion}
            onResult={(result) => {
              stepResult.current = result;
            }}
            onContinue={step.beat.draws !== undefined ? advanceAfterDraws : advanceSingle}
            onExit={onExit}
          />
        ) : null}

        {recyclingDraws ? (
          // The recycle slot, part one: drawings missed on the first try come
          // back, once, before the missed quick questions (U1-P3 round 2).
          <PoolItemsStep
            key="recycle:draws"
            entries={recycleEntries}
            {...poolSaving("recycle", recycleEntries.map((one) => one.id))}
            onDone={(cleared, total) => {
              poolSave.current = null;
              if (run.missedMcqIds.length === 0) {
                setRun((r) => (r === null ? r : reportRecycle(r, cleared, total)));
              } else {
                setRecycleDraws({ cleared, total });
              }
            }}
          />
        ) : null}

        {run.phase === "recycle" && (recycleDraws !== null || missedPoolIdsOf(run).length === 0) && run.missedMcqIds.length > 0 ? (
          // The recycle slot: the missed quick questions come back, once.
          // Same surface, same rules, only the ones that got away.
          <McqRunner
            node={node}
            level="declared"
            beats={recycleBeatsFor(run.plan, run.missedMcqIds)}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={strip}
            onProgress={(progress) => setMcqFraction(progress.clearedFraction)}
            {...resumeResults}
            onCommit={(results, progress) => saveAnswer(results, progress.clearedFraction)}
            onOfferCard={handleOfferCard}
            onDone={(results) => {
              setMcqFraction(0);
              answeredBefore.current += results.length;
              mcqSave.current = null;
              const before = recycleDraws ?? { cleared: 0, total: 0 };
              setRun((r) =>
                r === null
                  ? r
                  : reportRecycle(
                      r,
                      before.cleared + results.filter((res) => clearsBeat(res)).length,
                      before.total + results.length,
                    ),
              );
            }}
          />
        ) : null}

        {run.phase === "reward" ? (
          <RewardSlot
            run={run}
            node={node}
            pace={pace}
            banked={banked}
            reducedMotion={reducedMotion}
            onExit={finish}
            offerSlot={
              // THE MISTAKE-TO-CARD OFFER, HELD UNTIL THE LESSON ENDS (A2
              // round 4). It used to float up the moment a wrong answer was
              // graded, on top of the answer tray: it covered CONTINUE and
              // repeated the tray's explanation word for word. decks.offer
              // already queued it, so it is shown here instead, in the page
              // flow under the summary, and it waits until the student
              // chooses. onSave commits through the seam into the personal
              // deck; onDismiss is counted so the same card is not pushed twice.
              offer !== null ? (
                <Suspense fallback={null}>
                  <Recommendation
                    offer={offer}
                    placement="inline"
                    autoDismissMs={0}
                    reducedMotion={reducedMotion}
                    onSave={(card) => decks.saveCard(card, PERSONAL_DECK_ID)}
                    onDismiss={(card) => decks.dismissReco(card.id)}
                  />
                </Suspense>
              ) : null
            }
          />
        ) : null}
      </Suspense>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The mechanism beat                                                   */
/* ------------------------------------------------------------------ */

/**
 * The engine's contract is one question and one exit; CONTINUE on the last
 * step's win fires onSolved and then onExit. A lesson needs those two exits
 * told apart: a solve advances the plan, the X leaves the lesson. So the
 * result is recorded on onSolved and onExit reads it: recorded means the
 * student pressed CONTINUE, nothing recorded means they left.
 */
function TrainerBeat({
  beat,
  level,
  reducedMotion,
  onResult,
  onContinue,
  onExit,
}: {
  readonly beat: Extract<ResolvedBeat, { kind: "mechanism" | "resonance" }>;
  readonly level: MasteryLevel;
  readonly reducedMotion: boolean;
  readonly onResult: (result: BeatResult) => void;
  readonly onContinue: () => void;
  readonly onExit: () => void;
}) {
  const question = useMemo(() => questionForBeat(beat), [beat]);
  const startedAt = useRef(performance.now());
  const solved = useRef(false);
  if (question === null) {
    return <p role="status">This mechanism is not authored yet. Pick another node and come back.</p>;
  }
  return (
    <TrainerScreen
      question={question}
      reducedMotion={reducedMotion}
      onSolved={() => {
        solved.current = true;
        onResult({
          kind: "correct",
          beatId: question.id,
          level,
          cause: CORRECT_CAUSE,
          elapsedMs: Math.round(performance.now() - startedAt.current),
          at: new Date().toISOString(),
        });
      }}
      onExit={() => (solved.current ? onContinue() : onExit())}
    />
  );
}

/* ------------------------------------------------------------------ */
/* The header                                                          */
/* ------------------------------------------------------------------ */

/**
 * The lesson's top row: the exit chip and the one lesson bar, nothing else
 * (A2 round 6; the gem count and the tools left the header). One component so
 * the row cannot drift between the screens that draw it, which is exactly what
 * it had done: the question frame put the X at x = 16 and the strip from
 * x = 72, and the lesson-complete frame had no X at all.
 */
function LessonHeader({
  onExit,
  strip,
}: {
  readonly onExit: () => void;
  readonly strip: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-3 px-4 pt-3 pb-1 md:px-6">
      {/* onClick, not onPointerDown, so Enter and Space leave too. */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Leave this lesson"
        title="Leave this lesson"
        className="lesson-exit"
      >
        <ExitMark />
      </button>
      <div className="min-w-0 flex-1">{strip}</div>
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
  node,
  pace,
  banked,
  reducedMotion,
  onExit,
  offerSlot,
}: {
  readonly run: LessonRun;
  readonly node: string;
  /** The pace this lesson was planned at. */
  readonly pace: Pace;
  /** Diamonds the store actually paid, or null while the clear is still landing. */
  readonly banked: number | null;
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
  /** The held mistake-to-card offer, laid under the summary card. */
  readonly offerSlot?: ReactNode;
}) {
  const cleared = run.clearedBeats + run.recycleCleared;
  const played = run.totalBeats;
  const stillRough = run.recycled ? run.recycleTotal - run.recycleCleared : 0;
  const outcome = challengeOutcome(run);
  if (outcome !== null) {
    // The Challenge's own ending. Same card, same Continue; what differs is
    // the claim. A fail says what happened and what is still open, never
    // that something was lost: Practice stays open and the node stays done.
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-6 text-center">
          <Berry
            mood={outcome === "passed" ? "cheer" : "focused"}
            behaviour={outcome === "passed" ? "celebrate" : "idle"}
            sizePx={96}
            reducedMotion={reducedMotion}
          />
          <h2 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">
            {outcome === "passed" ? "Challenge passed" : "Not this time"}
          </h2>
          <p className="text-scale-base text-bb-foreground">
            {outcome === "passed"
              ? played === 1
                ? "Right on the first try."
                : `All ${played} right on the first try.`
              : `A miss ends a Challenge. You had ${cleared} of ${played} right when it stopped.`}
          </p>
          {banked !== null && banked > 0 ? (
            <p className="lesson-banked">
              <GemMark />
              <span>
                +{plural(banked, "diamond", "diamonds")}
              </span>
            </p>
          ) : null}
          {outcome === "failed" ? (
            <p className="text-scale-sm text-bb-muted-foreground">
              This node is still cleared, and Practice is open whenever you want another look.
            </p>
          ) : null}
        </div>
        {offerSlot}
        </div>
        <EndingFooter onExit={onExit} />
      </div>
    );
  }
  return (
    // CENTRED, NOT BOTTOM-PINNED UNDER A HOLE. The previous build put the
    // strip at the top and pushed this card to the bottom with an `mt-auto`,
    // which on a phone left roughly 600px of bare cream between them: the
    // same dead zone the S3 judge carried against the question screen,
    // reappearing on the screen the lesson ENDS on. The card is centred in
    // what the header leaves, so the frame has a subject.
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-6 text-center">
        <Berry mood="cheer" behaviour="celebrate" sizePx={96} reducedMotion={reducedMotion} />
        <h2 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">Lesson complete</h2>
        {/* Plain numbers a student reads in one go (A2 round 5; the old line
            "brought back 0 of the 1 that slipped past" needed a second read). */}
        <p className="text-scale-base text-bb-foreground">
          {/* First-try count, so a recycled miss is not counted twice ("3 of 3 right, 1 of 1 fixed"); CHANGED 2026-10-17. */}
          {run.clearedBeats} of {played} right
          {run.recycled ? `, ${run.recycleCleared} of ${run.recycleTotal} fixed on the second try.` : "."}
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
              +{plural(banked, "diamond", "diamonds")}
            </span>
          </p>
        ) : null}
        {stillRough > 0 ? (
          <p className="text-scale-sm text-bb-muted-foreground">
            {stillRough === 1 ? "One question gets" : `${stillRough} questions get`} another look next time.
          </p>
        ) : null}
        {/* THE CHECK CHIP, NOT THE CLAIM CHIP. The committed button-types
            sheet reserves green for `review` and `claim` and gives `continue`
            the same periwinkle as `check`, and this control banks nothing:
            the file header above is explicit that this slot is a receipt for
            a run the progress store already committed. A green claim chip
            over the word Continue promises a payout the screen does not
            make. */}
        <PaceRow node={node} pace={pace} />
      </div>
      {offerSlot}
      </div>
      <EndingFooter onExit={onExit} />
    </div>
  );
}

const RATINGS: readonly { readonly rating: LessonRating; readonly label: string }[] = [
  { rating: "too_easy", label: "Too easy" },
  { rating: "about_right", label: "About right" },
  { rating: "too_hard", label: "Too hard" },
];

/**
 * THE PACE ROW (audit 23 Oct, section 4): an optional one-tap read of the
 * lesson, journalled as lesson_rated, which sets the unit's pace for the next
 * lesson (beats/pace.ts). Nothing is locked and no diamond moves. Under it,
 * what the pace offers: the guide and the flashcards when it was hard, the
 * section test as "Skip ahead" when it was easy. The tap, once made, decides
 * which; before that, the pace this lesson was played at does.
 */
function PaceRow({ node, pace }: { readonly node: string; readonly pace: Pace }) {
  const [rated, setRated] = useState<LessonRating | null>(null);
  const rate = (rating: LessonRating) => {
    setRated(rating);
    // Dynamic for the reason the banking above gives: app/progress touches the DOM at module scope.
    void import("../app/progress").then(({ progress }) => progress.rateLesson(node, rating));
  };
  const leaning: Pace = rated === null ? pace : rated === "too_easy" ? 1 : rated === "too_hard" ? -1 : 0;
  const unitId = unitIdForNode(node);
  const testId = leaning === 1 ? skipAheadTestId(node) : null;
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <p className="text-scale-sm text-bb-muted-foreground">{rated === null ? "How was that?" : "Thanks. The next lesson will adjust."}</p>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="How was this lesson?">
        {RATINGS.map(({ rating, label }) => (
          <button
            key={rating}
            type="button"
            aria-pressed={rated === rating}
            onClick={() => rate(rating)}
            className={`rounded-xl border-2 px-3 py-1.5 text-scale-sm font-semibold ${
              rated === rating ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card text-bb-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {leaning === -1 ? (
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-scale-sm">
          {unitId !== null ? (
            <a className="font-semibold text-bb-primary-ink underline" href={`${hrefForTab("pathway")}?unit=${unitId}&guide=${unitId}`}>
              Read the guide for this lesson
            </a>
          ) : null}
          <a className="font-semibold text-bb-primary-ink underline" href={hrefForReview()}>
            Review your flashcards
          </a>
        </p>
      ) : null}
      {testId !== null ? (
        <a className="text-scale-sm font-semibold text-bb-primary-ink underline" href={hrefForLesson(testId)}>
          Skip ahead: take the section test
        </a>
      ) : null}
    </div>
  );
}

/**
 * CONTINUE on the lesson's last screen sits where CHECK and CONTINUE sat on
 * every screen before it: a footer docked at the bottom, full width (A2 round
 * 5). It used to sit inside the summary card, mid-screen, the one place in the
 * lesson the way forward moved.
 */
function EndingFooter({ onExit }: { readonly onExit: () => void }) {
  return (
    <div className="lesson-end__foot beat-action-bar foot-bleed pb-safe shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
      <ChipPress className="w-full" onClick={onExit}>
        Continue
      </ChipPress>
    </div>
  );
}
