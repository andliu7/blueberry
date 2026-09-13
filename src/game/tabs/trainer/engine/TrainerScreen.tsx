/**
 * The trainer engine's screen: one question, full screen, end to end. Built
 * as the pilot screen in the gauntlet and moved here whole; a question is
 * data (question.ts) and this file owns everything else.
 *
 * THE SHELL, top to bottom, per the locked design reference
 * (docs/reference/design-goals/blueberry_r9-lesson-mechanism_1788289491.png):
 * exit chip top left, thin progress strip, the prompt line, the white
 * workbench card filling the remaining height (mascot in its corner), the
 * hint pill, and UNDO / CHECK as two equal chips. REPLAY joins once a graded
 * step exists; REDRAW joins once anything is drawn; when the replay is open
 * a full-width slider under the canvas scrubs the student's own recorded
 * steps. On the win the working chips give way to REPLAY and CONTINUE only
 * (no redraw one press above continue) and a quiet in-canvas Goal-Achieved
 * pill while the chemistry stays on screen, the completion bar set by the
 * Alchemie solve captures (t028).
 *
 * ONE-LINE INTEGRATION, the way placement.ts documents its own: this screen
 * is self-contained and full-viewport, so re-homing it is a mount-point
 * change and nothing else.
 *
 *   <TrainerScreen question={findQuestion(ref)} onExit={() => navigate(...)} reducedMotion={rm} />
 *
 * Today it mounts at "#/gallery/pilot-trainer" (dev only, via App.tsx's
 * gallery branch); pointing "#/trainer" or a lesson node at it later means
 * resolving that surface's entry through question.ts and rendering this
 * component instead of that surface's canvas. Nothing here reads the route.
 *
 * MULTI-STEP. The screen holds the current step index. CONTINUE on a won
 * step that is not the last advances: a fresh interaction document and a
 * fresh screen model over the next step, the same shell and the same
 * mascot. On the last step it reports the solve and exits. A single-step
 * question never sees any of this.
 *
 * WHO DECIDES WHAT. The interaction machine (packages/interaction) owns
 * every gesture; gradeDrawing (grade.ts) owns the verdict; packages/feedback
 * owns the named-cause copy; screenModel.ts owns the five-piece state
 * machine (phases, records, replay, redraw, the exactly-once win); the
 * mistake journal and wrong sound fire on the same verdicts they do in
 * TrainerTab.tsx. This file only wires them and renders.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { SyntheticEvent } from "react";
import { useStepProgress } from "../../../demo/useStepProgress";
import { useEndGestureOnBackground, useTheme } from "../../../app/hooks";
import { causeCopyEntry } from "@blueberry/feedback";
import {
  canUndo,
  createInteractionStore,
  createMechanismDraft,
  currentDraft,
  inFlightGuide,
  type InteractionEvent,
  type MechanismDraft,
} from "@blueberry/interaction";
import { layoutState } from "../../../render/layout/layout";
import { buildStepScene, type StepScene } from "../../../render/layout/stepScene";
import type { MechanismStep } from "@blueberry/chem-core";
import { createHitTester, type DrawTarget } from "../hitLayout";
import { arrowKey, gradeDrawing, type DrawVerdict } from "../grade";
import { matchDistractor } from "../distractors";
import { playWrongSound } from "../feedbackSound";
import { saveMistake } from "../mistakes";
import { ChipPress } from "../../../beats/ChipPress";
import { ExitMark } from "../../../beats/chromeIcons";
import { Berry } from "../../../mascot/Berry";
import { costumeForSurface } from "../../../mascot/berryCostume";
import { useBerryReactions } from "../../../mascot/useBerryReactions";
import { TrainerCanvas } from "./TrainerCanvas";
import { ForkChooser } from "./ForkChooser";
import { StepStrip } from "./StepStrip";
import { gradeBranch, stripNodes, type BranchVerdict } from "./forkModel";
import type { RecordedStep } from "./screenModel";
import { curvedArrowsFor, type TrainerQuestion } from "./question";
import { annotateScene, sceneTargets } from "./screenLayout";
import {
  availableControls,
  checkGraded,
  createScreenState,
  progressFraction,
  redraw,
  setScrub,
  syncAfterUndo,
  toggleReplay,
} from "./screenModel";

/**
 * Expose the live interaction store for the wiring test and capture scripts,
 * the same query-flag family as TrainerCanvas's __pilotTargets.
 */
const EXPOSE_STORE = new URLSearchParams(window.location.search).get("store") === "1";

declare global {
  interface Window {
    __pilotStore?: ReturnType<typeof createInteractionStore>;
  }
}

export interface TrainerScreenProps {
  readonly question: TrainerQuestion;
  /** Where to start in a multi-step question. Clamped to the last step. */
  readonly stepIndex?: number;
  readonly onExit: () => void;
  /** Fires once, on CONTINUE from the last step's win, before onExit. */
  readonly onSolved?: () => void;
  readonly reducedMotion?: boolean;
}

const WIN_TWEEN_MS = 1400;

export function TrainerScreen({ question, stepIndex: startIndex = 0, onExit, onSolved, reducedMotion = false }: TrainerScreenProps) {
  const lastIndex = question.steps.length - 1;
  const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(0, startIndex), lastIndex));
  const current = question.steps[stepIndex];
  if (current === undefined) throw new Error(`question ${question.id} has no step ${stepIndex}`);
  /* ---------------- the decision point ---------------- */

  // At a fork the canvas plays the CHOSEN route's own step; until a route is
  // chosen the intermediate is shown under the chooser and nothing can be
  // drawn. The step's own arrows are the favoured route, so a step without a
  // fork, or a fork not yet chosen, reads exactly as before.
  const fork = current.fork;
  const [chosenRoute, setChosenRoute] = useState<string | null>(null);
  const route = fork !== undefined && chosenRoute !== null ? (fork.routes.find((candidate) => candidate.id === chosenRoute) ?? null) : null;
  const played = route !== null ? route : current;
  const { step } = played;
  const choosing = fork !== undefined && route === null;
  const dark = useTheme() === "dark";
  const [branchVerdict, setBranchVerdict] = useState<BranchVerdict | null>(null);

  /* ---------------- the slideshow ---------------- */

  // Each completed step's recorded pushes, kept so the strip can show how
  // the student got here; and which step, if any, they are looking back at.
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  // Where the look-back's own scrubber sits; null means the end, the settled outcome.
  const [historyScrub, setHistoryScrub] = useState<number | null>(null);
  const lookBack = (index: number | null) => {
    setHistoryScrub(null);
    setViewIndex(index);
  };
  const curvedArrows = curvedArrowsFor(question.kind);

  const scene = useMemo(
    () => buildStepScene(step, layoutState(step.from, played.fromHints), layoutState(step.to, played.toHints)),
    [step, played.fromHints, played.toHints],
  );
  const stepScenes = useMemo(
    () => question.steps.map((entry) => buildStepScene(entry.step, layoutState(entry.step.from, entry.fromHints), layoutState(entry.step.to, entry.toHints))),
    [question],
  );
  const annotations = useMemo(() => annotateScene(scene, "from"), [scene]);
  const toAnnotations = useMemo(() => annotateScene(scene, "to"), [scene]);

  /* ---------------- the interaction machine ---------------- */

  // A fresh epoch is a fresh document over the SAME step: the machine has an
  // undo stack but no "clear" command by design, so draw-it-again builds a
  // new document rather than unwinding fifty entries.
  const [epoch, setEpoch] = useState(0);
  const targetsRef = useRef<readonly DrawTarget[]>([]);
  const store = useMemo(
    () =>
      createInteractionStore({
        initialDraft: createMechanismDraft(step.from),
        environment: { hitTester: createHitTester(() => targetsRef.current) },
        onEffect: (effect) => {
          if (effect.kind === "haptic" && typeof navigator.vibrate === "function") navigator.vibrate(12);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, epoch],
  );
  const machine = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const draft = currentDraft(machine);
  if (draft.shape !== "mechanism") throw new Error("the trainer screen only holds a mechanism draft");
  const mechanism: MechanismDraft = draft;
  const armedAtom =
    mechanism.armed === null
      ? null
      : mechanism.armed.target.kind === "lonePair" || mechanism.armed.target.kind === "bondEndHandle"
        ? mechanism.armed.target.atomId
        : null;
  const targets = useMemo(
    () => sceneTargets(step, scene, annotations, mechanism.revealedLonePairs, armedAtom),
    [step, scene, annotations, mechanism.revealedLonePairs, armedAtom],
  );
  targetsRef.current = targets;
  const guide = inFlightGuide(machine);
  const dispatch = useCallback((event: InteractionEvent) => void store.dispatch(event), [store]);

  useEffect(() => {
    if (EXPOSE_STORE) window.__pilotStore = store;
  }, [store]);

  useEndGestureOnBackground(store);

  /* ---------------- the screen's own machine ---------------- */

  const [model, setModel] = useState(createScreenState);
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
  const won = model.phase === "won";

  // The record follows the drawing. A falling arrow count is an undo or a
  // rolled-back press and must unwind the recorded steps the scrubber reads;
  // any change at all makes the last verdict stale.
  const arrowCountRef = useRef(0);
  useEffect(() => {
    const n = mechanism.arrows.length;
    if (n === arrowCountRef.current) return;
    if (n < arrowCountRef.current) setModel((current) => syncAfterUndo(current, mechanism.arrows));
    setVerdict(null);
    setBranchVerdict(null);
    arrowCountRef.current = n;
  }, [mechanism.arrows]);

  /* ---------------- the mascot ---------------- */

  const { berry, bump, react } = useBerryReactions(reducedMotion, "leanIn");

  /* ---------------- the win's bond change ---------------- */

  // The same frame driver the trainer's playback uses: 0 while drawing,
  // driven once to 1 on the win, scrubbed straight to 1 under reduced motion.
  const win = useStepProgress(WIN_TWEEN_MS, false);

  /* ---------------- the controls ---------------- */

  const onCheck = () => {
    const result = gradeDrawing(step, mechanism.arrows);
    if (fork !== undefined && route !== null) {
      // The second grade. Right arrows on a route the conditions do not
      // favour is not a win and not an invalid drawing: it is a named cause,
      // advisory, from the same registry a wrong arrow draws on.
      const branch = gradeBranch(fork, route, result);
      if (branch !== null && branch.kind === "not_favoured") {
        setBranchVerdict(branch);
        setVerdict(null);
        // Not journaled as an arrow mistake: the arrows were right. The
        // mistake journal has no branch kind yet; when it does, this is
        // where the record goes.
        playWrongSound();
        react("nearMiss");
        return;
      }
    }
    const outcome = checkGraded(model, mechanism.arrows, result);
    setModel(outcome.state);
    if (outcome.justWon) {
      setVerdict(null);
      react("correct");
      if (reducedMotion) win.scrub(1);
      else win.play();
      return;
    }
    setVerdict(result);
    // The mistake journal and the wrong sound, on the same verdicts and with
    // the same record TrainerTab.tsx writes: the journal keys on the step's
    // own id, and the last arrow is the one the grader found wanting.
    const last = mechanism.arrows[mechanism.arrows.length - 1];
    if (result.kind === "invalid") {
      if (last !== undefined) {
        saveMistake({ reactionId: step.id, arrowKey: arrowKey(last), verdict: "invalid", causeId: result.cause, distractorMatched: false, at: new Date().toISOString() });
      }
      playWrongSound();
      react("wrong");
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
    } else if (result.kind === "not_requested") {
      if (last !== undefined) {
        saveMistake({ reactionId: step.id, arrowKey: arrowKey(last), verdict: "not_requested", causeId: null, distractorMatched: matchDistractor(step, last) !== null, at: new Date().toISOString() });
      }
      playWrongSound();
      react("nearMiss");
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
    } else {
      bump("leanIn");
    }
  };

  const onUndo = () => {
    // One graded or in-progress push per press: the machine pops one entry,
    // which is a committed arrow, an arming, or a lone pair reveal, and the
    // arrow-count effect above unwinds the recorded steps to match.
    store.dispatch({ kind: "command", command: { kind: "undo" } });
  };

  // A clean screen over whichever step comes next: redraw pairs it with a
  // fresh document over the SAME step, advancing with the next step's own.
  const resetStage = () => {
    setModel(redraw(model));
    setVerdict(null);
    win.scrub(0);
    bump("leanIn");
  };

  const onRedraw = () => {
    resetStage();
    setChosenRoute(null);
    setBranchVerdict(null);
    setEpoch((n) => n + 1);
  };

  // Back to the fork: a fresh document over the intermediate, no route chosen.
  const onChooseAgain = () => {
    setBranchVerdict(null);
    setChosenRoute(null);
    resetStage();
    setEpoch((n) => n + 1);
  };

  const onContinue = () => {
    if (stepIndex < lastIndex) {
      setHistory((entries) => {
        const next = entries.slice();
        next[stepIndex] = { recorded: model.recorded, revealed: mechanism.revealedLonePairs };
        return next;
      });
      setChosenRoute(null);
      setBranchVerdict(null);
      setViewIndex(null);
      resetStage();
      setStepIndex(stepIndex + 1);
      return;
    }
    onSolved?.();
    onExit();
  };

  const viewing = viewIndex !== null && viewIndex < stepIndex ? viewIndex : null;
  const viewed = viewing !== null ? question.steps[viewing] : undefined;
  const nodes = stripNodes(question);
  const interactive = !won && !model.replayOpen && !choosing && viewing === null && branchVerdict === null;
  // The chooser is on screen. In dark theme the workbench darkens under the
  // molecule while it is; ForkChooser's comment says why the themes differ.
  const chooserOpen = choosing && viewing === null && !won;
  const controls = availableControls(model, mechanism.arrows.length > 0);
  const undoDisabled = !interactive || !canUndo(machine);
  const checkDisabled = !interactive || mechanism.arrows.length === 0;
  // The strip spans the whole question: a single step reads its own fraction.
  const fraction = (stepIndex + progressFraction(model, mechanism.arrows.length, step.arrows.length)) / question.steps.length;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ background: "var(--bb-background)" }} data-pilot-screen>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-3 p-4 pb-5">
        <header className="flex items-center gap-3">
          <button type="button" className="lesson-exit" aria-label="Leave this stage" title="Leave this stage" onClick={onExit}>
            <ExitMark />
          </button>
          {nodes.length > 0 ? (
            <div className="flex-1">
              <StepStrip
                nodes={nodes}
                stepIndex={stepIndex}
                viewIndex={viewing}
                won={won}
                onView={lookBack}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : (
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--bb-muted)" }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Math.round(fraction * 100) / 100}
            aria-label="Stage progress"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${fraction * 100}%`, background: "var(--progress-edge)", transition: reducedMotion ? "none" : "width 300ms ease" }}
            />
          </div>
          )}
        </header>

        <p className="bb-title-face text-scale-lg font-semibold leading-snug text-bb-foreground">
          {viewed !== undefined ? viewed.prompt : fork !== undefined && !won ? (route !== null ? `${route.label}. Draw the arrows for this route.` : fork.prompt) : current.prompt}
        </p>

        {/* The workbench card is the frame's one white surface, per the locked
            shell reference (blueberry_r9-lesson-mechanism_1788289491); --bb-card
            on the cream page measured 1.046:1 and read as an outline. */}
        <section
          className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-bb-border"
          style={{
            background: chooserOpen && dark ? "color-mix(in srgb, black 50%, var(--workbench))" : "var(--workbench)",
            // Near black there is no brightness left to spend (the dark step
            // tops out near 1.4:1), so the frame turning the accent colour is
            // the cue that does not depend on luminance, in both themes.
            borderColor: chooserOpen ? "var(--bb-primary-bright)" : undefined,
          }}
        >
          {viewing !== null && viewed !== undefined ? (
            <>
              <HistoryCanvas
                key={`history-${viewing}`}
                step={viewed.step}
                scene={stepScenes[viewing] ?? scene}
                recorded={history[viewing]?.recorded ?? []}
                revealed={history[viewing]?.revealed ?? []}
                scrub={historyScrub ?? (history[viewing]?.recorded ?? []).length}
                curvedArrows={curvedArrows}
                reducedMotion={reducedMotion}
              />
              <span
                className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border-2 bg-bb-card px-3 py-1 text-scale-xs font-bold"
                style={{ borderColor: "var(--good)", color: "var(--good-ink)" }}
                data-history-label
              >
                ✓ Step {viewing + 1}, done
              </span>
            </>
          ) : (
            <TrainerCanvas
              key={`${stepIndex}-${chosenRoute ?? "step"}-${epoch}`}
              step={step}
              scene={scene}
              curvedArrows={curvedArrows}
              draft={mechanism}
              guide={guide}
              targets={targets}
              annotations={annotations}
              toAnnotations={toAnnotations}
              dispatch={dispatch}
              interactive={interactive}
              winT={win.progress}
              replay={model.replayOpen ? { recorded: model.recorded, scrub: model.scrub } : null}
              reducedMotion={reducedMotion}
            />
          )}

          {chooserOpen ? (
            <ForkChooser
              fork={fork}
              onChoose={(picked) => {
                setChosenRoute(picked.id);
                bump("leanIn");
              }}
            />
          ) : null}


          {verdict !== null && !won && !model.replayOpen && viewing === null ? (
            <div className="pointer-events-none absolute bottom-3 left-3 right-24">
              <div className="pointer-events-auto max-w-sm">
                <VerdictCard verdict={verdict} onClose={() => setVerdict(null)} />
              </div>
            </div>
          ) : null}

          {won && !model.replayOpen && viewing === null ? (
            <div className="pointer-events-none absolute bottom-3 left-3 right-24 flex flex-col items-start gap-1.5" aria-live="polite">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 bg-bb-card px-4 py-1.5 text-scale-sm font-bold"
                style={{ borderColor: "var(--good)", color: "var(--good-ink)" }}
              >
                ✦ {question.wonPill}
              </span>
              <p className="max-w-sm text-scale-sm leading-snug text-bb-foreground">{stepIndex === lastIndex ? question.successLine : current.prompt}</p>
              {route !== null ? (
                <p className="max-w-sm text-scale-xs leading-snug text-bb-muted-foreground">
                  Route: {route.label}. {route.why}
                </p>
              ) : null}
            </div>
          ) : null}

          {choosing || branchVerdict !== null ? null : (
          <div className="pointer-events-none absolute bottom-2 right-2">
            <Berry
              {...berry}
              costume={costumeForSurface("trainer")}
              working={interactive}
              reducedMotion={reducedMotion}
              sizePx={64}
            />
          </div>
          )}
        </section>

        {model.replayOpen ? (
          <label className="flex min-h-11 items-center gap-3">
            <span className="text-scale-sm font-semibold text-bb-muted-foreground">Steps</span>
            <input
              type="range"
              min={0}
              max={model.recorded.length * 1000}
              value={Math.round(model.scrub * 1000)}
              onChange={(event) => setModel(setScrub(model, Number(event.currentTarget.value) / 1000))}
              onKeyDown={(event) => {
                // The native step is one slider unit, 1/1000 of a recorded
                // step, which reads as a dead key. Arrows move a visible 5%
                // of a step; pointer drags stay continuous either way.
                const delta =
                  event.key === "ArrowRight" || event.key === "ArrowUp"
                    ? 0.05
                    : event.key === "ArrowLeft" || event.key === "ArrowDown"
                      ? -0.05
                      : null;
                if (delta === null) return;
                event.preventDefault();
                setModel(setScrub(model, model.scrub + delta));
              }}
              className="w-full accent-[var(--bb-primary)]"
              aria-label="Scrub back and forth through your recorded steps"
            />
          </label>
        ) : viewing !== null ? (
          // Looking back: pull the completed step's electrons back and forth.
          <label className="flex min-h-11 items-center gap-3">
            <span className="text-scale-sm font-semibold text-bb-muted-foreground">Step {viewing + 1}</span>
            <input
              type="range"
              min={0}
              max={((history[viewing]?.recorded ?? []).length + 1) * 1000}
              value={Math.round((historyScrub ?? (history[viewing]?.recorded ?? []).length) * 1000)}
              list={`history-ticks-${viewing}`}
              onChange={(event) => setHistoryScrub(Number(event.currentTarget.value) / 1000)}
              onKeyDown={(event) => {
                const delta =
                  event.key === "ArrowRight" || event.key === "ArrowUp"
                    ? 0.05
                    : event.key === "ArrowLeft" || event.key === "ArrowDown"
                      ? -0.05
                      : null;
                if (delta === null) return;
                event.preventDefault();
                const max = (history[viewing]?.recorded ?? []).length + 1;
                setHistoryScrub(Math.min(max, Math.max(0, (historyScrub ?? (history[viewing]?.recorded ?? []).length) + delta)));
              }}
              className="w-full accent-[var(--bb-primary)]"
              aria-label="Scrub back and forth through the pushes that completed this step, then on to its outcome"
              data-history-scrub
            />
            <datalist id={`history-ticks-${viewing}`}>
              <option value={(history[viewing]?.recorded ?? []).length * 1000} label="pushes" />
            </datalist>
            <span className="text-scale-xs font-semibold text-bb-muted-foreground">outcome</span>
          </label>
        ) : branchVerdict !== null && branchVerdict.kind === "not_favoured" && !won ? (
          <BranchCard verdict={branchVerdict} onChooseAgain={onChooseAgain} />
        ) : won || fork !== undefined ? null : (
          // On the win the hint disappears rather than rewords: it commands
          // the completed action, and the in-canvas pill plus success line
          // already say the honest thing about the win. At a decision point
          // the conditions line is the hint, and a hint pill here would be
          // the one place left for the answer to leak.
          <div className="rounded-full border-2 border-bb-border bg-bb-card px-5 py-2.5 text-center text-scale-sm font-medium text-bb-foreground">
            {current.hint}
          </div>
        )}

        {/* Which chips exist per phase is availableControls' ruling, pinned in
            pilotScreen.test.ts: the won rows are REPLAY and CONTINUE only. */}
        {viewing === null && branchVerdict === null && (controls.includes("replay") || controls.includes("redraw") || (route !== null && !won)) ? (
          <div className="flex items-center justify-center gap-3">
            {route !== null && !won && !controls.includes("redraw") ? (
              <ChipPress variant="quiet" className="flex-1" onClick={onChooseAgain}>
                Change route
              </ChipPress>
            ) : null}
            {controls.includes("replay") ? (
              <ChipPress variant="quiet" className="flex-1" onClick={() => setModel(toggleReplay(model))}>
                {model.replayOpen ? "Close replay" : "Replay"}
              </ChipPress>
            ) : null}
            {controls.includes("redraw") ? (
              // One word so the chip holds one line at 390px beside Replay,
              // the same vocabulary as Undo / Check / Replay / Continue.
              <ChipPress variant="quiet" className="flex-1" onClick={onRedraw}>
                {route !== null ? "Change route" : "Redraw"}
              </ChipPress>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {viewing !== null ? (
            <ChipPress variant="quiet" className="flex-1" onClick={() => setViewIndex(null)}>
              Back to step {stepIndex + 1}
            </ChipPress>
          ) : controls.includes("continue") ? (
            <ChipPress className="flex-1" onClick={onContinue}>
              Continue
            </ChipPress>
          ) : choosing || branchVerdict !== null ? null : (
            <>
              <ChipPress variant="quiet" className="flex-1" disabled={undoDisabled} onClick={onUndo}>
                Undo
              </ChipPress>
              <ChipPress className="flex-1" disabled={checkDisabled} onClick={onCheck}>
                Check
              </ChipPress>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A step already taken, read only: its state and the pushes that completed
 * it, drawn by the same canvas the live step uses so the two never differ.
 */
/** One completed step, as the student left it: the pushes they recorded and the lone pairs they had opened. */
interface HistoryEntry {
  readonly recorded: readonly RecordedStep[];
  readonly revealed: readonly string[];
}

function HistoryCanvas({
  step,
  scene,
  recorded,
  revealed,
  scrub,
  curvedArrows,
  reducedMotion,
}: {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  readonly recorded: readonly RecordedStep[];
  readonly revealed: readonly string[];
  readonly scrub: number;
  readonly curvedArrows: boolean;
  readonly reducedMotion: boolean;
}) {
  const annotations = useMemo(() => annotateScene(scene, "from"), [scene]);
  const toAnnotations = useMemo(() => annotateScene(scene, "to"), [scene]);
  // The canvas's own replay over the step's record: scrubbed back it shows
  // the from state with the pushes appearing one by one, and at the end of
  // the record it settles into the won picture, bond change and all.
  const draft = useMemo(() => {
    const fresh = createMechanismDraft(step.from);
    if (fresh.shape !== "mechanism") throw new Error("history holds a mechanism draft");
    // The pairs the student opened to do the step: without them the look-back is not the picture they drew on.
    return { ...fresh, revealedLonePairs: revealed };
  }, [step, revealed]);
  return (
    <TrainerCanvas
      step={step}
      scene={scene}
      curvedArrows={curvedArrows}
      draft={draft}
      guide={null}
      targets={[]}
      annotations={annotations}
      toAnnotations={toAnnotations}
      dispatch={() => undefined}
      interactive={false}
      winT={1}
      replay={{ recorded, scrub, settledAtEnd: true }}
      reducedMotion={reducedMotion}
    />
  );
}

/**
 * The second grade's card. The arrows were right; the route was not the one
 * the conditions favour. Same registry copy a wrong arrow gets, and one way
 * out: back to the fork.
 */
/** Height of the branch card's top fade, 1.5rem, matching its h-6 class. */
const FADE_PX = 24;

function BranchCard({ verdict, onChooseAgain }: { readonly verdict: Extract<BranchVerdict, { kind: "not_favoured" }>; readonly onChooseAgain: () => void }) {
  const copy = causeCopyEntry(verdict.cause);
  // The text block is capped so the exit chip never leaves the screen, which
  // means text can sit below its edge. `more` is true while it does, and
  // drives the fade that tells the student to scroll.
  const textBox = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const [above, setAbove] = useState(false);
  const measure = () => {
    const box = textBox.current;
    if (box === null) return;
    setMore(box.scrollHeight - box.scrollTop - box.clientHeight > 1);
    setAbove(box.scrollTop > 1);
  };
  useEffect(measure, []);
  // Opening the disclosure adds text at the bottom of a capped box, where a
  // small screen would hide all of it. Scroll the summary to just under the
  // top fade (FADE_PX, the h-6 below) so the tap visibly does something and
  // the label the student tapped is not itself washed out.
  const onToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const box = textBox.current;
    const details = event.currentTarget;
    if (box !== null && details.open) {
      // Floored: the box can sit at a fractional y, and a rounded-up scroll
      // would lift the summary half a pixel into the fade.
      box.scrollTop = Math.floor(box.scrollTop + details.getBoundingClientRect().top - box.getBoundingClientRect().top - FADE_PX - 1);
    }
    measure();
  };
  return (
    <section className="fade-in rounded-2xl border-2 border-bb-border bg-bb-card p-3" aria-live="polite" data-branch-verdict>
      <p className="text-scale-xs font-semibold leading-snug" style={{ color: "var(--good-ink)" }}>
        Arrows right. These conditions favour: {verdict.favoured.label}.
      </p>
      <div className="relative mt-1">
      <div ref={textBox} className="max-h-[26vh] overflow-y-auto" onScroll={measure} data-branch-text>
      <p className="text-scale-sm font-semibold leading-snug text-bb-foreground">{copy.whatYouDid}</p>
      <p className="mt-1 text-scale-xs leading-snug text-bb-foreground">{verdict.route.why}</p>
      <details className="mt-1 text-scale-xs leading-snug text-bb-muted-foreground" onToggle={onToggle}>
        <summary className="cursor-pointer font-semibold text-bb-foreground">Why, and what to look at</summary>
        <p className="mt-1">{copy.why}</p>
        <p className="mt-1">{copy.lookAt}</p>
      </details>
      </div>
      {above ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-6"
          style={{ background: "linear-gradient(to top, transparent, var(--bb-card))" }}
          aria-hidden
          data-branch-above
        />
      ) : null}
      {more ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bb-card))" }}
          aria-hidden
          data-branch-more
        />
      ) : null}
      </div>
      <ChipPress variant="quiet" className="mt-2 w-full" onClick={onChooseAgain}>
        Choose another route
      </ChipPress>
    </section>
  );
}

/**
 * The verdict, in the canvas corner. Tier 1 all the way down: the named
 * cause's authored copy from packages/feedback for anything invalid, plain
 * honest sentences for the rest, no red anywhere, and the subject is always
 * the arrow, never the student.
 */
function VerdictCard({ verdict, onClose }: { readonly verdict: DrawVerdict; readonly onClose: () => void }) {
  const close = (
    <button
      type="button"
      aria-label="Dismiss feedback"
      className="press absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-scale-sm font-semibold text-bb-muted-foreground"
      onClick={onClose}
    >
      ×
    </button>
  );
  switch (verdict.kind) {
    case "correct": {
      // Reached only through the win treatment, which replaces this card, but
      // the union says it exists so it renders honestly rather than throwing.
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in relative rounded-2xl border-2 bg-good-soft p-3 pr-9 text-scale-sm" style={{ borderColor: "var(--good)" }} data-arrow-verdict aria-live="polite">
          {close}
          <p className="font-semibold text-good-ink">{copy.whatYouDid}</p>
        </section>
      );
    }
    case "invalid": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in relative rounded-2xl border-2 border-bb-border bg-bb-card p-3 pr-9" data-arrow-verdict aria-live="polite">
          {close}
          <p className="text-scale-sm font-semibold leading-snug text-bb-foreground">{copy.whatYouDid}</p>
          <p className="mt-1 text-scale-xs leading-snug text-bb-muted-foreground">{copy.why}</p>
        </section>
      );
    }
    case "not_requested":
      return (
        <section className="fade-in relative rounded-2xl border-2 bg-not-requested-soft p-3 pr-9" style={{ borderColor: "var(--not-requested)" }} data-arrow-verdict aria-live="polite">
          {close}
          <p className="text-scale-sm font-semibold leading-snug" style={{ color: "var(--not-requested)" }}>
            Every push you drew is legal, and together they describe a different change than this step asks for.
          </p>
          <p className="mt-1 text-scale-xs leading-snug text-bb-foreground">
            {verdict.missing > 0 ? `${verdict.missing} of the pushes this step needs ${verdict.missing === 1 ? "has" : "have"} not been drawn. ` : ""}
            {verdict.extra > 0 ? `${verdict.extra} push${verdict.extra === 1 ? " goes" : "es go"} somewhere this step does not.` : ""}
          </p>
        </section>
      );
    case "incomplete":
      return (
        <section className="fade-in relative rounded-2xl border-2 border-bb-border bg-bb-muted p-3 pr-9" data-arrow-verdict aria-live="polite">
          {close}
          <p className="text-scale-sm font-semibold leading-snug text-bb-foreground">
            {verdict.drawn} of {verdict.needed} pushes in, and everything drawn holds up. Something still has to move.
          </p>
        </section>
      );
    default: {
      const unreachable: never = verdict;
      return <>{unreachable}</>;
    }
  }
}

export default TrainerScreen;
