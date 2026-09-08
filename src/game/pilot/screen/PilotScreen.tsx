/**
 * The pilot gameplay screen: one mechanism stage, full screen, end to end.
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
 *   <PilotScreen problem={problem} onExit={() => navigate(...)} reducedMotion={rm} />
 *
 * Today it mounts at "#/gallery/pilot-trainer" (dev only, via App.tsx's
 * gallery branch); pointing "#/trainer" or a lesson node at it later means
 * building a PilotProblem from that surface's entry and rendering this
 * component instead of that surface's canvas. Nothing here reads the route.
 *
 * WHO DECIDES WHAT. The interaction machine (packages/interaction) owns
 * every gesture; gradeDrawing (tabs/trainer/grade.ts) owns the verdict;
 * packages/feedback owns the named-cause copy; screenModel.ts owns the
 * five-piece state machine (phases, records, replay, redraw, the
 * exactly-once win). This file only wires them and renders.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { causeCopyEntry } from "@blueberry/feedback";
import type { MechanismStep } from "@blueberry/chem-core";
import {
  canUndo,
  createInteractionStore,
  createMechanismDraft,
  currentDraft,
  inFlightGuide,
  type InteractionEvent,
  type MechanismDraft,
} from "@blueberry/interaction";
import { layoutState, type LayoutHints } from "../../render/layout/layout";
import { buildStepScene } from "../../render/layout/stepScene";
import { createHitTester, type DrawTarget } from "../../tabs/trainer/hitLayout";
import { gradeDrawing, type DrawVerdict } from "../../tabs/trainer/grade";
import { ChipPress } from "../../beats/ChipPress";
import { ExitMark } from "../../beats/chromeIcons";
import { Berry } from "../../mascot/Berry";
import type { BerryBehaviour } from "../../mascot/berryBehaviour";
import type { BerryMood } from "../../mascot/berryMood";
import { costumeForSurface } from "../../mascot/berryCostume";
import { reactionFor, SETTLED_AFTER_MISS, type ReactionOutcome } from "../../mascot/berryReaction";
import { PilotCanvas, type PilotMode } from "./PilotCanvas";
import { annotateScene, pilotTargets } from "./pilotLayout";
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
 * the same query-flag family as PilotCanvas's __pilotTargets.
 */
const EXPOSE_STORE = new URLSearchParams(window.location.search).get("store") === "1";

declare global {
  interface Window {
    __pilotStore?: ReturnType<typeof createInteractionStore>;
  }
}

export interface PilotProblem {
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
  /** Curved arrows appear ONLY in resonance mode. Owner rule for this screen. */
  readonly mode: PilotMode;
  readonly title: string;
  /** The line above the canvas: the task, in the imperative. */
  readonly prompt: string;
  /** The pill under the canvas. */
  readonly hint: string;
  /** The win treatment's one line of chemistry. */
  readonly successLine: string;
}

export interface PilotScreenProps {
  readonly problem: PilotProblem;
  readonly onExit: () => void;
  readonly reducedMotion?: boolean;
}

const WIN_TWEEN_MS = 1400;

export function PilotScreen({ problem, onExit, reducedMotion = false }: PilotScreenProps) {
  const { step, mode } = problem;

  const scene = useMemo(
    () => buildStepScene(step, layoutState(step.from, problem.fromHints), layoutState(step.to, problem.toHints)),
    [step, problem.fromHints, problem.toHints],
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
  if (draft.shape !== "mechanism") throw new Error("the pilot screen only holds a mechanism draft");
  const mechanism: MechanismDraft = draft;
  const armedAtom =
    mechanism.armed === null
      ? null
      : mechanism.armed.target.kind === "lonePair" || mechanism.armed.target.kind === "bondEndHandle"
        ? mechanism.armed.target.atomId
        : null;
  const targets = useMemo(
    () => pilotTargets(step, scene, annotations, mechanism.revealedLonePairs, armedAtom),
    [step, scene, annotations, mechanism.revealedLonePairs, armedAtom],
  );
  targetsRef.current = targets;
  const guide = inFlightGuide(machine);
  const dispatch = useCallback((event: InteractionEvent) => void store.dispatch(event), [store]);

  useEffect(() => {
    if (EXPOSE_STORE) window.__pilotStore = store;
  }, [store]);

  // Backgrounding ends any gesture, per the machine's own event for it.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") store.dispatch({ kind: "appBackgrounded", timestampMs: performance.now() });
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onHidden);
    };
  }, [store]);

  /* ---------------- the screen's own machine ---------------- */

  const [model, setModel] = useState(createScreenState);
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
  const [winT, setWinT] = useState(0);
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
    arrowCountRef.current = n;
  }, [mechanism.arrows]);

  /* ---------------- the mascot ---------------- */

  const [behaviour, setBehaviour] = useState<BerryBehaviour>("leanIn");
  const [behaviourKey, setBehaviourKey] = useState(0);
  const [berryMood, setBerryMood] = useState<BerryMood | undefined>(undefined);
  const [berryChain, setBerryChain] = useState<readonly BerryBehaviour[]>([]);
  const [sparkleKey, setSparkleKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [charred, setCharred] = useState(false);
  const runRef = useRef({ correctRun: 0, missRun: 0 });
  const settleTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    },
    [],
  );
  const bump = (next: BerryBehaviour, mood?: BerryMood, chain: readonly BerryBehaviour[] = []) => {
    setBehaviour(next);
    setBehaviourKey((k) => k + 1);
    setBerryMood(mood);
    setBerryChain(chain);
  };
  const react = (outcome: ReactionOutcome) => {
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    const run = runRef.current;
    if (outcome === "correct") {
      run.correctRun += 1;
      run.missRun = 0;
      if (charred) {
        setCharred(false);
        setFlashKey((k) => k + 1);
      }
    } else if (outcome === "wrong") {
      run.correctRun = 0;
      run.missRun += 1;
    }
    const reaction = reactionFor(outcome, run);
    if (reaction.state === "charred") setCharred(true);
    if (reaction.sparkles) setSparkleKey((k) => k + 1);
    bump(reaction.behaviour, reaction.mood, reaction.chain);
    if (reaction.holdMs !== null) {
      settleTimerRef.current = window.setTimeout(
        () => bump(SETTLED_AFTER_MISS.behaviour, SETTLED_AFTER_MISS.mood),
        reducedMotion ? 1 : reaction.holdMs,
      );
    }
  };

  /* ---------------- the win's bond change ---------------- */

  const winRafRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (winRafRef.current !== null) cancelAnimationFrame(winRafRef.current);
    },
    [],
  );
  const startWinTween = useCallback(() => {
    if (reducedMotion) {
      setWinT(1);
      return;
    }
    const startedAt = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - startedAt) / WIN_TWEEN_MS);
      setWinT(k);
      winRafRef.current = k < 1 ? requestAnimationFrame(tick) : null;
    };
    winRafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion]);

  /* ---------------- the controls ---------------- */

  const onCheck = () => {
    const result = gradeDrawing(step, mechanism.arrows);
    const outcome = checkGraded(model, mechanism.arrows, result);
    setModel(outcome.state);
    if (outcome.justWon) {
      setVerdict(null);
      react("correct");
      startWinTween();
      return;
    }
    setVerdict(result);
    if (result.kind === "invalid") {
      react("wrong");
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
    } else if (result.kind === "not_requested") {
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

  const onRedraw = () => {
    setModel(redraw(model));
    setVerdict(null);
    setWinT(0);
    if (winRafRef.current !== null) cancelAnimationFrame(winRafRef.current);
    winRafRef.current = null;
    bump("leanIn");
    setEpoch((n) => n + 1);
  };

  const interactive = !won && !model.replayOpen;
  const controls = availableControls(model, mechanism.arrows.length > 0);
  const undoDisabled = !interactive || !canUndo(machine);
  const checkDisabled = !interactive || mechanism.arrows.length === 0;
  const fraction = progressFraction(model, mechanism.arrows.length, step.arrows.length);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ background: "var(--bb-background)" }} data-pilot-screen>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-3 p-4 pb-5">
        <header className="flex items-center gap-3">
          <button type="button" className="lesson-exit" aria-label="Leave this stage" title="Leave this stage" onClick={onExit}>
            <ExitMark />
          </button>
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
        </header>

        <p className="title-face text-scale-lg font-semibold leading-snug text-bb-foreground">{problem.prompt}</p>

        {/* The workbench card is the frame's one white surface, per the locked
            shell reference (blueberry_r9-lesson-mechanism_1788289491); --bb-card
            on the cream page measured 1.046:1 and read as an outline. */}
        <section
          className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-bb-border"
          style={{ background: "var(--workbench)" }}
        >
          <PilotCanvas
            key={epoch}
            step={step}
            scene={scene}
            mode={mode}
            draft={mechanism}
            guide={guide}
            targets={targets}
            annotations={annotations}
            toAnnotations={toAnnotations}
            dispatch={dispatch}
            interactive={interactive}
            winT={winT}
            replay={model.replayOpen ? { recorded: model.recorded, scrub: model.scrub } : null}
            reducedMotion={reducedMotion}
          />

          {verdict !== null && !won && !model.replayOpen ? (
            <div className="pointer-events-none absolute bottom-3 left-3 right-24">
              <div className="pointer-events-auto max-w-sm">
                <PilotVerdictCard verdict={verdict} onClose={() => setVerdict(null)} />
              </div>
            </div>
          ) : null}

          {won && !model.replayOpen ? (
            <div className="pointer-events-none absolute bottom-3 left-3 right-24 flex flex-col items-start gap-1.5" aria-live="polite">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 bg-bb-card px-4 py-1.5 text-scale-sm font-bold"
                style={{ borderColor: "var(--good)", color: "var(--good-ink)" }}
              >
                ✦ {mode === "resonance" ? "Structure found" : "Goal achieved"}
              </span>
              <p className="max-w-sm text-scale-sm leading-snug text-bb-foreground">{problem.successLine}</p>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-2 right-2">
            <Berry
              behaviour={behaviour}
              behaviourKey={behaviourKey}
              mood={berryMood}
              chain={berryChain}
              sparkleKey={sparkleKey}
              flashKey={flashKey}
              state={charred ? "charred" : "neutral"}
              costume={costumeForSurface("trainer")}
              working={interactive}
              reducedMotion={reducedMotion}
              sizePx={64}
            />
          </div>
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
        ) : won ? null : (
          // On the win the hint disappears rather than rewords: it commands
          // the completed action, and the in-canvas pill plus success line
          // already say the honest thing about the win.
          <div className="rounded-full border-2 border-bb-border bg-bb-card px-5 py-2.5 text-center text-scale-sm font-medium text-bb-foreground">
            {problem.hint}
          </div>
        )}

        {/* Which chips exist per phase is availableControls' ruling, pinned in
            pilotScreen.test.ts: the won rows are REPLAY and CONTINUE only. */}
        {controls.includes("replay") || controls.includes("redraw") ? (
          <div className="flex items-center justify-center gap-3">
            {controls.includes("replay") ? (
              <ChipPress variant="quiet" className="flex-1" onClick={() => setModel(toggleReplay(model))}>
                {model.replayOpen ? "Close replay" : "Replay"}
              </ChipPress>
            ) : null}
            {controls.includes("redraw") ? (
              // One word so the chip holds one line at 390px beside Replay,
              // the same vocabulary as Undo / Check / Replay / Continue.
              <ChipPress variant="quiet" className="flex-1" onClick={onRedraw}>
                Redraw
              </ChipPress>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {controls.includes("continue") ? (
            <ChipPress className="flex-1" onClick={onExit}>
              Continue
            </ChipPress>
          ) : (
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
 * The verdict, in the canvas corner. Tier 1 all the way down: the named
 * cause's authored copy from packages/feedback for anything invalid, plain
 * honest sentences for the rest, no red anywhere, and the subject is always
 * the arrow, never the student.
 */
function PilotVerdictCard({ verdict, onClose }: { readonly verdict: DrawVerdict; readonly onClose: () => void }) {
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
        <section className="fade-in relative rounded-2xl border-2 bg-good-soft p-3 pr-9 text-scale-sm" style={{ borderColor: "var(--good)" }} aria-live="polite">
          {close}
          <p className="font-semibold text-good-ink">{copy.whatYouDid}</p>
        </section>
      );
    }
    case "invalid": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in relative rounded-2xl border-2 border-bb-border bg-bb-card p-3 pr-9" aria-live="polite">
          {close}
          <p className="text-scale-sm font-semibold leading-snug text-bb-foreground">{copy.whatYouDid}</p>
          <p className="mt-1 text-scale-xs leading-snug text-bb-muted-foreground">{copy.why}</p>
        </section>
      );
    }
    case "not_requested":
      return (
        <section className="fade-in relative rounded-2xl border-2 bg-not-requested-soft p-3 pr-9" style={{ borderColor: "var(--not-requested)" }} aria-live="polite">
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
        <section className="fade-in relative rounded-2xl border-2 border-bb-border bg-bb-muted p-3 pr-9" aria-live="polite">
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

export default PilotScreen;
