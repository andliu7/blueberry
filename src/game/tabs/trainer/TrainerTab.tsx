/**
 * The Mechanism Trainer tab. The crown jewel, wired end to end for one step:
 * the Phase 2 interaction machine drives the Phase 4 scene, the shell grades
 * (see grade.ts for exactly how far that honesty extends), packages/feedback
 * supplies the words, and the Phase 4 animation plays the step back when it
 * is right.
 *
 * Two modes on one canvas:
 *   draw   DrawCanvas, fed by the interaction store
 *   play   MoleculeSvg or the lazy Scene3D, driven by useStepProgress
 *
 * The store is created once per step in useMemo and read with
 * useSyncExternalStore, the same pattern the interaction package documents on
 * store.ts. Notices and effects arrive through callbacks; haptics go to
 * navigator.vibrate where it exists, which is the one platform effect the
 * package leaves to the shell.
 *
 * Failure animations, per BUILD-PROMPT.md Phase 5, all without red:
 *   invalid        every drawn arrow snaps back elastically, then the draft
 *                  resets, and the Tier 1 copy for the named cause renders
 *   not requested  legal arrows that are not the step: the leaving group
 *                  that the drawing left in place wobbles and stays, and the
 *                  result is named out loud
 *   incomplete     no animation; the strip says how many arrows remain
 *
 * The URL flags from Phase 4 still work here (?auto=1 loops playback for the
 * frame scripts, ?renderer=3d, ?stats=1), because the measurement scripts
 * load the default route and this is it.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { causeCopyEntry } from "@blueberry/feedback";
import {
  createInteractionStore,
  createMechanismDraft,
  currentDraft,
  inFlightGuide,
  type InteractionNotice,
  type InteractionState,
  type MechanismDraft,
  type Point2,
  type InteractionEvent,
} from "@blueberry/interaction";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import { layoutState } from "../../render/layout/layout";
import { buildStepScene } from "../../render/layout/stepScene";
import { TRAINER_REACTIONS } from "../../demo/reactions";
import type { AtomOrbits } from "./hitLayout";
import { useStepProgress } from "../../demo/useStepProgress";
import { Press } from "../../app/ui/Press";
import { Berry } from "../../mascot/Berry";
import type { BerryBehaviour } from "../../mascot/berryBehaviour";
import type { BerryMood } from "../../mascot/berryMood";
import { costumeForSurface } from "../../mascot/berryCostume";
import { SETTLED_AFTER_MISS, reactionFor, type ReactionOutcome } from "../../mascot/berryReaction";
import { CanvasBackdrop, type BackdropMode } from "./CanvasBackdrop";
import { DrawCanvas, type FailureAnimation } from "./DrawCanvas";
import { applySpeciesOffsets,
  applyAtomOrbits,
  resettleOpenAngles, buildTargets, createHitTester, type DrawTarget, type SpeciesOffsets } from "./hitLayout";
import { arrowKey, gradeDrawing, type DrawVerdict } from "./grade";
import type { ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { matchDistractor, type TrainerDistractor } from "./distractors";
import { playWrongSound } from "./feedbackSound";
import { saveMistake } from "./mistakes";
import { TrainerTools } from "./TrainerTools";
import { RESONANCE_HUNT } from "../../demo/resonance";
import { TRAINER_SEQUENCES } from "../../demo/sequences";
import { ProblemBrowser } from "./ProblemBrowser";
import type { PlayableLink } from "../../demo/pathwayMap";
import { hashParam, hrefForLesson } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";

const Scene3D = lazy(() => import("../../render/three/Scene3D"));

/**
 * One scene per registry entry, built once at module scope. The registry is
 * data; the trainer consumes whichever entry is selected, which is the whole
 * "replicatable for any reaction" claim made executable: nothing below this
 * line knows which reaction it is running.
 */
const FIRST_REACTION = TRAINER_REACTIONS[0] as (typeof TRAINER_REACTIONS)[number];

/**
 * What the trainer can be pointed at. Reactions are single steps; sequences
 * chain steps and run ARROWLESS (owner spec: the electron gesture carries a
 * multi-step problem, no arrow glyphs accumulate); resonance entries are the
 * hunt, and they are where the drawn arrows LIVE (owner spec again).
 */
type Selection =
  | { readonly kind: "reaction"; readonly id: string }
  | { readonly kind: "sequence"; readonly id: string; readonly stepIndex: number }
  | { readonly kind: "resonance"; readonly id: string };

/** Scenes for every playable step everywhere, keyed by the step's own id. */
const SCENES = new Map<string, ReturnType<typeof buildStepScene>>();
for (const entry of TRAINER_REACTIONS) {
  SCENES.set(entry.step.id, buildStepScene(entry.step, layoutState(entry.step.from, entry.fromHints), layoutState(entry.step.to, entry.toHints)));
}
for (const sequence of TRAINER_SEQUENCES) {
  for (const item of sequence.steps) {
    if (!SCENES.has(item.step.id)) {
      SCENES.set(item.step.id, buildStepScene(item.step, layoutState(item.step.from, item.fromHints), layoutState(item.step.to, item.toHints)));
    }
  }
}
for (const entry of RESONANCE_HUNT) {
  SCENES.set(entry.step.id, buildStepScene(entry.step, layoutState(entry.step.from, entry.fromHints), layoutState(entry.step.to, entry.toHints)));
}

interface Playable {
  readonly step: MechanismStep;
  readonly title: string;
  readonly brief: string;
  readonly successLine: string;
  /** Sequences hide arrow glyphs and force the electron gesture. */
  readonly arrowless: boolean;
  /** Resonance success is a FIND and celebrates as one. */
  readonly resonance: boolean;
  /** Set when this step is part of a sequence: progress and total. */
  readonly sequencePosition: { readonly index: number; readonly total: number; readonly last: boolean } | null;
}

function resolveSelection(selection: Selection): Playable {
  if (selection.kind === "reaction") {
    const entry = TRAINER_REACTIONS.find((candidate) => candidate.id === selection.id) ?? FIRST_REACTION;
    return { step: entry.step, title: entry.title, brief: entry.brief, successLine: entry.successLine, arrowless: false, resonance: false, sequencePosition: null };
  }
  if (selection.kind === "sequence") {
    const sequence = TRAINER_SEQUENCES.find((candidate) => candidate.id === selection.id) ?? TRAINER_SEQUENCES[0];
    if (sequence === undefined) throw new Error("no sequences authored");
    const index = Math.min(selection.stepIndex, sequence.steps.length - 1);
    const item = sequence.steps[index];
    if (item === undefined) throw new Error(`sequence ${sequence.id} has no step ${index}`);
    const last = index === sequence.steps.length - 1;
    return {
      step: item.step,
      title: sequence.title,
      brief: item.stepBrief,
      successLine: last ? sequence.successLine : item.stepBrief.replace(/^Step \d+ · /, "Done: "),
      arrowless: true,
      resonance: false,
      sequencePosition: { index, total: sequence.steps.length, last },
    };
  }
  const entry = RESONANCE_HUNT.find((candidate) => candidate.id === selection.id) ?? RESONANCE_HUNT[0];
  if (entry === undefined) throw new Error("no resonance entries authored");
  return { step: entry.step, title: entry.title, brief: entry.brief, successLine: entry.foundLine, arrowless: false, resonance: true, sequencePosition: null };
}

const params = new URLSearchParams(window.location.search);
const AUTO_LOOP = params.get("auto") === "1";
const START_3D = params.get("renderer") === "3d";
const SHOW_STATS = params.get("stats") === "1";
/**
 * Publish the drop sites on `window` for the capture script.
 *
 * The same family as `window.__blueberryFrames` in useStepProgress.ts, and it
 * exists for the same reason: the thing a measurement needs is inside React and
 * nothing in the DOM carries it. Every drop site here is drawn into one SVG
 * with no element of its own, so a script has no selector to click and no way
 * to derive the geometry without reimplementing layout.ts.
 *
 * Behind a flag, so a student's run never publishes it.
 */
const EXPOSE_TARGETS = params.get("targets") === "1";
/** Deep links, for captures, sharing, and the pathway map's nodes. */
/**
 * The deep link, read WHEN ASKED rather than when this module loads.
 *
 * These were three module-scope constants, which is the other half of the
 * reload bug: even with a hash-only link the trainer would have kept showing
 * the mechanism from whichever URL happened to load the bundle, because the
 * values were frozen at import. A function reads the live location every time,
 * and hashParam checks the hash first and the legacy search string second so
 * links already in a student's history still resolve.
 */
function deepLinkSelection(): Selection | null {
  const reaction = hashParam("reaction");
  if (reaction !== null && TRAINER_REACTIONS.some((entry) => entry.id === reaction)) {
    return { kind: "reaction", id: reaction };
  }
  const sequence = hashParam("sequence");
  if (sequence !== null && TRAINER_SEQUENCES.some((entry) => entry.id === sequence)) {
    return { kind: "sequence", id: sequence, stepIndex: 0 };
  }
  const hunt = hashParam("hunt");
  if (hunt !== null && RESONANCE_HUNT.some((entry) => entry.id === hunt)) {
    return { kind: "resonance", id: hunt };
  }
  return null;
}

declare global {
  interface Window {
    __blueberryTargets?: readonly DrawTarget[];
  }
}
const STEP_DURATION_MS = 2000;

function StatsOverlay() {
  const [text, setText] = useState("measuring");
  useEffect(() => {
    let lowest = Infinity;
    const timer = setInterval(() => {
      const frames = window.__blueberryFrames ?? [];
      const now = performance.now();
      const recent = frames.filter((stamp) => now - stamp <= 1000);
      if (recent.length < 2) return;
      const fps = recent.length;
      if (fps < lowest) lowest = fps;
      setText(`${fps} fps, dip ${lowest}`);
    }, 500);
    return () => clearInterval(timer);
  }, []);
  return <div className="absolute left-4 top-4 rounded-lg bg-bb-foreground/80 px-3 py-1.5 font-mono text-scale-sm text-bb-background">{text}</div>;
}

function CanvasSkeleton() {
  return (
    <div className="skeleton flex h-full w-full items-center justify-center rounded-2xl">
      <span className="text-scale-sm font-medium text-bb-muted-foreground">Loading the 3D view</span>
    </div>
  );
}

export interface TrainerTabProps {
  readonly reducedMotion: boolean;
  /** Onboarding: show the guidance strip and report the first correct answer. */
  readonly tutorial?: boolean;
  readonly onSolved?: () => void;
}

const TUTORIAL_STEPS = [
  "Tap the oxygen to show its lone pairs.",
  "Tap one lone pair. It is now the source of an arrow.",
  "Tap the carbon, or the space between O and C, to send the pair there.",
  "Now the leaving group: tap the handle on the C–Br bond nearest bromine, then tap bromine.",
  "The step checks itself the moment the last arrow lands.",
];

export function TrainerTab({ reducedMotion, tutorial = false, onSolved }: TrainerTabProps) {
  // The tutorial is authored against the SN2 step and stays pinned to it;
  // everywhere else the student picks from the registry, the sequences or
  // the resonance hunt.
  const [selection, setSelection] = useState<Selection>(
    () => deepLinkSelection() ?? { kind: "reaction", id: FIRST_REACTION.id },
  );

  /**
   * Follow a deep link that arrives while the trainer is ALREADY on screen.
   *
   * Going from the pathway to a mechanism mounts this component fresh, so the
   * initialiser above covers the common path. Going from one mechanism to
   * another does not: the route is still "trainer", React keeps the instance,
   * and only the hash moves. Without this the student would press a different
   * node and stay on the one they were already doing.
   *
   * It only ever applies a link that RESOLVES, so a hash carrying no deep link
   * (the plain "#/trainer" of the tab bar) leaves the student's own pick alone
   * rather than snapping them back to the first reaction.
   */
  useEffect(() => {
    const follow = () => {
      const next = deepLinkSelection();
      if (next !== null) setSelection(next);
    };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);
  const playable = resolveSelection(tutorial ? { kind: "reaction", id: FIRST_REACTION.id } : selection);

  const canvasRef = useRef<HTMLElement | null>(null);
  // Which water. A resonance hunt gets still water it can ripple; a step that
  // is a resonance form opening a site gets the hybrid, violet resolving into
  // the current that attacks it; everything else is a mechanism and flows.
  const backdropMode: BackdropMode = playable.resonance
    ? "resonance"
    : playable.step.identity.route === "resonance"
      ? "hybrid"
      : "mechanism";
  const step = playable.step;
  const scene = SCENES.get(step.id);
  if (scene === undefined) throw new Error(`no scene for step ${step.id}`);
  // The mistake journal and the distractor card key on the step's own id.
  const reaction = { id: step.id, successLine: playable.successLine };
  const [mode, setMode] = useState<"draw" | "play">(AUTO_LOOP ? "play" : "draw");
  const [renderer, setRenderer] = useState<"2d" | "3d">(START_3D ? "3d" : "2d");
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
  const [distractor, setDistractor] = useState<TrainerDistractor | null>(null);
  const [rejected, setRejected] = useState<{ readonly arrow: ElectronFlowArrow; readonly key: number } | null>(null);
  /** Every verdict this session, newest first, for the plus-menu history. */
  const [history, setHistory] = useState<readonly { readonly line: string; readonly kind: string; readonly at: string }[]>([]);
  const [failure, setFailure] = useState<FailureAnimation>(null);
  const [notice, setNotice] = useState<InteractionNotice | null>(null);
  const [behaviour, setBehaviour] = useState<BerryBehaviour>("idle");
  const [behaviourKey, setBehaviourKey] = useState(0);
  // Bloom's reaction axes, piece P1. `mood` undefined lets the behaviour's own
  // face show (leanIn is focused); a reaction sets it explicitly. The run
  // counters and the charred flag are the same three-miss rule the lesson
  // player applies, read from the same table in berryReaction.ts.
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
  const { progress, playing, play, scrub } = useStepProgress(STEP_DURATION_MS, AUTO_LOOP);

  // The targets depend on the draft (revealed lone pairs, the armed atom), and
  // the hit tester reads them through a ref so the store never needs rebuilding
  // mid-drawing. A reset bumps `epoch`, which builds a fresh store over a fresh
  // draft: the machine has an undo stack but no "clear" command by design, and
  // a new document is the honest way to start over.
  const [epoch, setEpoch] = useState(0);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const targetsRef = useRef<readonly DrawTarget[]>([]);
  const store = useMemo(
    () =>
      createInteractionStore({
        initialDraft: createMechanismDraft(step.from),
        environment: { hitTester: createHitTester(() => targetsRef.current) },
        onEffect: (effect) => {
          if (effect.kind === "haptic" && typeof navigator.vibrate === "function") navigator.vibrate(12);
        },
        onNotice: (item) => {
          setNotice(item);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, epoch],
  );
  const state: InteractionState = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const draft = currentDraft(state);
  if (draft.shape !== "mechanism") throw new Error("the trainer only holds a mechanism draft");
  const mechanism: MechanismDraft = draft;
  const armedAtom = mechanism.armed === null ? null : mechanism.armed.target.kind === "lonePair" || mechanism.armed.target.kind === "bondEndHandle" ? mechanism.armed.target.atomId : null;
  // Where each species has been carried, in px. The live scene is the authored
  // one plus these, and it is what the targets and the canvas read, so a drop
  // site stays on its atom wherever the student put the molecule. Positions
  // survive a reset on purpose: an arrangement is not an answer.
  const [offsets, setOffsets] = useState<SpeciesOffsets>({});
  const [orbits, setOrbits] = useState<AtomOrbits>({});
  // Species carry, then per-atom orbit, then the re-settle: open angles are
  // re-derived from where the bonds point NOW, which is what makes the lone
  // pairs and hydrogen arcs migrate as a swung atom circles its neighbour.
  const live = useMemo(() => resettleOpenAngles(applyAtomOrbits(applySpeciesOffsets(scene, step, offsets), orbits)), [scene, step, offsets, orbits]);
  const onSpeciesMove = useCallback((speciesId: string, offset: Point2) => setOffsets((prev) => ({ ...prev, [speciesId]: offset })), []);
  const onAtomOrbit = useCallback((atomId: string, offset: Point2) => setOrbits((prev: AtomOrbits) => ({ ...prev, [atomId]: offset })), []);
  const targets = useMemo(() => buildTargets(step, live, mechanism.revealedLonePairs, armedAtom), [step, live, mechanism.revealedLonePairs, armedAtom]);
  targetsRef.current = targets;
  useEffect(() => {
    if (EXPOSE_TARGETS) window.__blueberryTargets = targets;
  }, [targets]);
  const guide = inFlightGuide(state);

  // The held failure clears the moment the student touches the canvas again:
  // the card has been read or it has not, and either way a new gesture means
  // the old mistake is no longer the story.
  const canvasDispatch = useCallback(
    (event: InteractionEvent) => {
      if (event.kind === "pointerDown") setRejected(null);
      store.dispatch(event);
    },
    [store],
  );

  // Backgrounding ends any gesture, per the machine's appBackgrounded event.
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

  useEffect(() => {
    if (AUTO_LOOP && !reducedMotion) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = (next: BerryBehaviour, mood?: BerryMood, chain: readonly BerryBehaviour[] = []) => {
    setBehaviour(next);
    setBehaviourKey((k) => k + 1);
    setBerryMood(mood);
    setBerryChain(chain);
  };

  /**
   * A graded arrow as a mascot reaction. Mapping, and the one assumption in
   * it: chem-core's `not_requested` is a legal arrow the requested route did
   * not ask for, which is the "valid, not requested" near miss in CLAUDE.md's
   * result types, so it gets thinking plus leanIn rather than the wrong
   * answer's squash. `invalid` is the wrong answer.
   */
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

  /**
   * IMMEDIATE grading, owner requirement 2026-08-25: every committed arrow is
   * judged the moment it lands, with a sound, the failure animated, and the
   * explanation on screen, and no button between the mistake and the feedback.
   * The Check button is gone; this effect is what replaced it.
   *
   * Only the count going UP grades. The count goes down when the machine's own
   * undo takes a wrong arrow back, and regrading that transition would judge
   * the revert as if the student had drawn something.
   *
   * The revert itself: because every earlier arrow already passed this gate,
   * the offending arrow is always the LAST one, so one undo puts the draft
   * back exactly where it was before the mistake. That is the owner's "go
   * back to what we had", and it is why this dispatches undo rather than
   * nuking the draft with a fresh epoch: the arrows the student got right
   * stay earned.
   */
  const gradedCountRef = useRef(0);
  useEffect(() => {
    const drawn = mechanism.arrows.length;
    if (drawn <= gradedCountRef.current) {
      gradedCountRef.current = drawn;
      return;
    }
    gradedCountRef.current = drawn;
    const result = gradeDrawing(step, mechanism.arrows);
    setVerdict(result);
    setHistory((prev) => [{ line: plainLine(result, playable.successLine), kind: result.kind, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    setRejected(null);

    if (result.kind === "correct") {
      // The success copy and the playback ARE the reward for this step; the
      // tutorial's Continue button below hands off only when the student
      // chooses, never on a timer and never before the copy has been read.
      setDistractor(null);
      react("correct");
      setMode("play");
      if (!reducedMotion) play();
      return;
    }
    if (result.kind === "invalid") {
      const offending = mechanism.arrows[mechanism.arrows.length - 1];
      if (offending !== undefined) {
        saveMistake({ reactionId: reaction.id, arrowKey: arrowKey(offending), verdict: "invalid", causeId: result.cause, distractorMatched: false, at: new Date().toISOString() });
      }
      setDistractor(null);
      playWrongSound();
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
      react("wrong");
      setFailure({ kind: "snapBack", key: Date.now() });
      window.setTimeout(() => {
        setFailure(null);
        store.dispatch({ kind: "command", command: { kind: "undo" } });
      }, reducedMotion ? 1 : 430);
      return;
    }
    if (result.kind === "not_requested") {
      // The molecule tried it and it did not work: name the exact mistake if
      // an instructor anticipated it (Tier 2), wobble the atom the electrons
      // were wrongly sent to, then take the one wrong arrow back.
      const last = mechanism.arrows[mechanism.arrows.length - 1];
      const matched = last !== undefined ? matchDistractor(step, last) : null;
      if (last !== undefined) {
        saveMistake({ reactionId: reaction.id, arrowKey: arrowKey(last), verdict: "not_requested", causeId: null, distractorMatched: matched !== null, at: new Date().toISOString() });
      }
      setDistractor(matched);
      playWrongSound();
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
      react("nearMiss");
      const sentTo = last === undefined ? null : last.sink.kind === "atom" ? last.sink.atomId : last.sink.atomIds[1];
      setFailure({ kind: "wobble", atomIds: sentTo === null ? [] : [sentTo], key: Date.now() });
      window.setTimeout(() => {
        setFailure(null);
        // The ghost replaces the real arrow in the SAME frame the undo takes
        // it: during the wobble the committed render carries the evidence, and
        // setting the ghost any earlier drew both at once, casing on casing.
        if (last !== undefined) setRejected({ arrow: last, key: Date.now() });
        store.dispatch({ kind: "command", command: { kind: "undo" } });
      }, reducedMotion ? 1 : 500);
      return;
    }
    // Incomplete: legal so far. Quiet card, no sound; progress is not an error.
    setDistractor(null);
    bump("leanIn");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanism.arrows, step, reaction.id, playable.successLine, play, reducedMotion, store]);

  const pickSelection = (next: Selection) => {
    setSelection(next);
    setVerdict(null);
    setDistractor(null);
    setRejected(null);
    setFailure(null);
    setNotice(null);
    setOffsets({});
    setOrbits({});
    gradedCountRef.current = 0;
    setMode("draw");
    scrub(0);
    bump("leanIn");
    setEpoch((n) => n + 1);
  };

  /**
   * A node picked in the problem browser, sent where that node actually lives.
   *
   * THE BUG THIS CLOSES. A PlayableLink has four kinds and the trainer's
   * Selection has three, because a BEAT is not a mechanism: it is an MCQ, a
   * matching board, a ladder or a synthesis gap, and BeatRunner plays it at
   * "#/lesson/<node>". The old handler was an if / else-if / else over the
   * four, so a beat fell into the bare else and was dispatched as
   * { kind: "resonance", id: <node id> }. resolveSelection then does
   * `RESONANCE_HUNT.find(...) ?? RESONANCE_HUNT[0]`, so every one of the map's
   * beat nodes silently opened the allyl cation hunt instead of its lesson.
   * Silently is the expensive part: no error, no empty state, just the wrong
   * chemistry under the right title.
   *
   * PathwayTab.hrefForPlayable has always got this right, so the two callers
   * disagreed and only one of them was reachable from the trainer.
   *
   * The switch is exhaustive on purpose and the default asserts `never`: a
   * fifth PlayableLink kind is now a compile error here rather than another
   * silent redirect to whatever the last branch happened to be.
   */
  const openPlayable = (link: PlayableLink) => {
    switch (link.kind) {
      case "reaction":
        pickSelection({ kind: "reaction", id: link.id });
        return;
      case "sequence":
        pickSelection({ kind: "sequence", id: link.id, stepIndex: 0 });
        return;
      case "resonance":
        pickSelection({ kind: "resonance", id: link.id });
        return;
      case "beat":
        navigate(hrefForLesson(link.id));
        return;
      default: {
        const unreachable: never = link;
        throw new Error(`unhandled playable kind: ${JSON.stringify(unreachable)}`);
      }
    }
  };

  const reset = () => {
    setVerdict(null);
    setDistractor(null);
    setRejected(null);
    gradedCountRef.current = 0;
    setNotice(null);
    setMode("draw");
    scrub(0);
    bump("leanIn");
    setEpoch((n) => n + 1);
  };

  const tutorialIndex = (() => {
    if (!tutorial) return -1;
    if (mechanism.arrows.length >= 2) return 4;
    if (mechanism.arrows.length === 1) return 3;
    if (mechanism.armed !== null) return 2;
    if (mechanism.revealedLonePairs.length > 0) return 1;
    return 0;
  })();

  const renderProps = { step, scene, progress, reducedMotion } as const;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="bb-title-face text-scale-xl font-semibold">{playable.title}</h2>
          <p className="text-scale-sm text-bb-muted-foreground">{playable.brief}</p>
          {!tutorial ? (
            <ProblemBrowser
              currentTitle={playable.title}
              onPick={openPlayable}
            />
          ) : null}
          {playable.sequencePosition !== null ? (
            <p className="mt-1 text-scale-xs font-semibold text-bb-primary">
              Step {playable.sequencePosition.index + 1} of {playable.sequencePosition.total}
            </p>
          ) : null}
          {playable.resonance ? (
            <p className="mt-1 text-scale-xs text-bb-muted-foreground">One species on purpose: nothing reacts here, only the electrons move.</p>
          ) : null}
        </div>
        <Berry
          behaviour={behaviour}
          behaviourKey={behaviourKey}
          mood={berryMood}
          chain={berryChain}
          sparkleKey={sparkleKey}
          flashKey={flashKey}
          state={charred ? "charred" : "neutral"}
          costume={costumeForSurface("trainer")}
          working={mode === "draw"}
          reducedMotion={reducedMotion}
          sizePx={72}
        />
      </header>

      {tutorialIndex >= 0 ? (
        <ol className="flex flex-col gap-1 rounded-2xl border border-bb-primary/30 bg-bb-primary/5 p-3 text-scale-sm" aria-label="Tutorial">
          {TUTORIAL_STEPS.map((text, index) => (
            <li key={text} className={index === tutorialIndex ? "font-semibold text-bb-foreground" : index < tutorialIndex ? "text-good-ink line-through" : "text-bb-muted-foreground"}>
              {index + 1}. {text}
            </li>
          ))}
        </ol>
      ) : null}

      <section
        // The canvas gets its own GROUND, not the card colour: a modelled atom
        // needs a surface to sit on.
        //
        // IT IS A FLAT FILL NOW. The two-stop ramp was there because a blind
        // critic said the darkest atom lost its lower edge on a flat ground,
        // and sticker rule 2 forbids gradients on chrome outright. Both are
        // answered by the plate being a CREAM step darker than the card rather
        // than a near-white one: the edge the critic wanted comes from the 2px
        // border and from the plate reading as a different surface, not from a
        // ramp inside it.
        ref={canvasRef}
        className="relative min-h-72 flex-1 overflow-hidden rounded-2xl border-2 border-bb-border"
        style={{ minHeight: "20rem", background: "var(--scene-ground-bottom)" }}
      >
        {/* Behind everything, and pointer-events: none throughout, so it can
            never take a pointer the arrow machine wanted. */}
        <CanvasBackdrop mode={backdropMode} surface={canvasRef} reducedMotion={reducedMotion} />
        {mode === "draw" ? (
          <DrawCanvas key={epoch} step={step} scene={scene} live={live} offsets={offsets} onSpeciesMove={onSpeciesMove} orbits={orbits} onAtomOrbit={onAtomOrbit} draft={mechanism} guide={guide} targets={targets} dispatch={canvasDispatch} failure={failure} reducedMotion={reducedMotion} rejected={rejected} arrowless={playable.arrowless} forceArrows={playable.resonance} recenterSignal={recenterSignal} />
        ) : renderer === "2d" ? (
          <MoleculeSvg {...renderProps} />
        ) : (
          <Suspense fallback={<CanvasSkeleton />}>
            <Scene3D {...renderProps} />
          </Suspense>
        )}
        {SHOW_STATS ? <StatsOverlay /> : null}
        {mode === "play" ? (
          <button
            type="button"
            className="press absolute right-4 top-4 min-h-11 min-w-11 rounded-full border-2 border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground"
            onPointerDown={() => setRenderer((r) => (r === "2d" ? "3d" : "2d"))}
            aria-label={renderer === "2d" ? "Switch to the 3D view" : "Switch to the 2D view"}
            title={renderer === "2d" ? "Switch to the 3D view" : "Switch to the 2D view"}
          >
            {renderer === "2d" ? "3D" : "2D"}
          </button>
        ) : null}

        {/* Feedback lives in the CORNER, closable, revisitable from the
            plus-menu history. The first centred version buried the molecule
            and blocked the second arrow; the owner's words were "now it's
            unplayable", and a card that costs the canvas costs everything. */}
        {verdict !== null ? (
          <div className="pointer-events-none absolute bottom-3 left-3 max-w-sm">
            <div className="pointer-events-auto">
              <VerdictCard verdict={verdict} distractor={distractor} successLine={reaction.successLine} footer={mode === "draw" ? { drawn: mechanism.arrows.length, needed: step.arrows.length, onStartOver: reset } : null} resonance={playable.resonance} onClose={() => setVerdict(null)} />
            </div>
          </div>
        ) : null}

        <TrainerTools step={step} scene={scene} progress={mode === "play" ? progress : 0} reducedMotion={reducedMotion} history={history} onRecenter={() => setRecenterSignal((n) => n + 1)} />
      </section>

      {notice !== null && isContestedNotice(notice) ? (
        <p className="text-scale-xs text-bb-muted-foreground" aria-live="polite">
          Two things were close under that tap. The nearer one was taken; tap again to change it.
        </p>
      ) : null}

      <section className="flex flex-wrap items-center gap-3">
        {mode === "draw" ? (
          <>
            <span className="text-scale-sm text-bb-muted-foreground">
              {/* Student words. "Source armed" is engine vocabulary, and a
                  blind critic caught it leaking into the one line that is
                  always on screen. */}
              {mechanism.arrows.length} of {step.arrows.length} arrows drawn
              {mechanism.armed !== null ? " · electrons in hand" : ""}
            </span>
            {mechanism.arrows.length > 0 ? (
              <Press variant="ghost" onPointerDown={reset}>
                Start over
              </Press>
            ) : null}
          </>
        ) : (
          <>
            <Press onPointerDown={play} disabled={reducedMotion} title={reducedMotion ? "Motion is reduced; the frame shown is the whole step" : undefined}>
              {playing ? "Replay" : "Play step"}
            </Press>
            <label className="flex min-h-11 flex-1 items-center gap-3">
              <span className="text-scale-sm text-bb-muted-foreground">Scrub</span>
              <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(event) => scrub(Number(event.currentTarget.value) / 1000)} className="w-full accent-[var(--bb-primary)]" aria-label="Scrub through the step" />
            </label>
            <Press variant="secondary" onPointerDown={reset}>
              Draw it again
            </Press>
            {playable.sequencePosition !== null && !playable.sequencePosition.last && verdict?.kind === "correct" && selection.kind === "sequence" ? (
              <Press variant="reward" onPointerDown={() => pickSelection({ kind: "sequence", id: selection.id, stepIndex: playable.sequencePosition === null ? 0 : playable.sequencePosition.index + 1 })}>
                Next step
              </Press>
            ) : null}
            {onSolved !== undefined && verdict?.kind === "correct" ? (
              <Press variant="reward" onPointerDown={onSolved}>
                Continue
              </Press>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function isContestedNotice(notice: InteractionNotice): boolean {
  return notice.id === "target_was_ambiguous";
}

/**
 * The plain English line, per arrow legality rule. Authored copy, held to the
 * voice contract in CLAUDE.md: it names what happened in the drawing, treats
 * the mistake as the normal step it is, and points at the next thing to look
 * at. The subject is the arrow, never the student.
 *
 * These are deliberately NOT the registry's `whatYouDid`, which is a paragraph.
 * This is the one sentence a stressed student reads in two seconds; the
 * paragraph is one press away under Show more.
 */
const PLAIN_BY_RULE: Record<string, string> = {
  source_has_no_lone_pair: "That arrow starts on an atom with no lone pair to give.",
  source_has_no_unpaired_electron: "A fishhook needs a single unpaired electron to start from, and that atom has none.",
  single_electron_source_moved_a_pair: "A fishhook moves one electron; that arrow moved a pair.",
  source_bond_overdrawn: "That bond is being asked for more electrons than it holds.",
  lone_pairs_overdrawn: "That atom is being asked for more lone pair electrons than it has.",
  unpaired_electrons_overdrawn: "That atom is being asked for more unpaired electrons than it has.",
  endpoints_share_no_atom: "The arrow's start and finish are not connected, so the electrons have nowhere to travel.",
  sink_bonds_an_atom_to_itself: "That arrow would bond an atom to itself.",
  arrow_declares_no_change: "That arrow ends where it started, so nothing moves.",
  source_atom_not_in_state: "That arrow starts on something that is not in this reaction.",
  source_bond_not_in_state: "That arrow starts on a bond that is not in this reaction.",
  sink_atom_not_in_state: "That arrow points at something that is not in this reaction.",
};

/** One sentence per verdict. The headline, and often all a student needs. */
function plainLine(verdict: DrawVerdict, successLine: string): string {
  switch (verdict.kind) {
    case "correct":
      return successLine;
    case "invalid":
      return PLAIN_BY_RULE[verdict.finding.rule] ?? "That arrow cannot move electrons the way it is drawn.";
    case "not_requested":
      // NEUTRAL on purpose: this line shows for every reaction in the
      // registry, and its first draft said "the bromide still has no reason
      // to leave" to a student doing a Michael addition with no bromine on
      // the canvas. The owner caught it live. Copy that names a species
      // belongs to a distractor or a per-reaction hint, never here.
      return verdict.missing > 0
        ? "Every arrow you drew is legal, and the step is not finished: something this reaction needs has not moved yet."
        : "Every arrow you drew is legal, and together they describe a different transformation than this one.";
    case "incomplete":
      return `${verdict.drawn} of ${verdict.needed} arrows, ${verdict.drawn === 1 ? "and it holds up" : "all legal so far"}. One more: something has to break.`;
    default: {
      const unreachable: never = verdict;
      return unreachable;
    }
  }
}

/**
 * The detail, behind one press. `<details>` is the native disclosure: it is
 * keyboard operable and screen reader announced without any state of ours, and
 * the summary carries the press class so the acknowledgement paints on pointer
 * down like every other control.
 */
function ShowMore({ children }: { readonly children: ReactNode }) {
  return (
    <details className="mt-2 group">
      <summary className="press inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-2xl border-2 border-bb-border px-3 text-scale-sm font-semibold text-bb-primary-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span className="group-open:hidden">Show more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </details>
  );
}

function Detail({ label, text }: { readonly label: string; readonly text: string }) {
  return (
    <div>
      <h4 className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">{label}</h4>
      <p className="text-scale-sm text-bb-foreground">{text}</p>
    </div>
  );
}

interface CardFooter {
  readonly drawn: number;
  readonly needed: number;
  readonly onStartOver: () => void;
}

function CardFooterRow({ footer }: { readonly footer: CardFooter | null }) {
  if (footer === null) return null;
  return (
    <div className="mt-2 flex items-center justify-between border-t border-bb-border/60 pt-2">
      <span className="text-scale-xs text-bb-muted-foreground">
        {footer.drawn} of {footer.needed} arrows drawn
      </span>
      <button type="button" className="press min-h-9 rounded-full px-3 text-scale-xs font-semibold text-bb-muted-foreground hover:text-bb-foreground" onPointerDown={footer.onStartOver}>
        Start over
      </button>
    </div>
  );
}

function CardClose({ onClose }: { readonly onClose: (() => void) | null }) {
  if (onClose === null) return null;
  return (
    <button type="button" aria-label="Dismiss feedback" title="Dismiss feedback" className="press absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-scale-sm font-semibold text-bb-muted-foreground hover:text-bb-foreground" onPointerDown={onClose}>
      ×
    </button>
  );
}

function VerdictCard({ verdict, distractor = null, successLine, footer = null, resonance = false, onClose = null }: { readonly verdict: DrawVerdict; readonly distractor?: TrainerDistractor | null; readonly successLine: string; readonly footer?: CardFooter | null; readonly resonance?: boolean; readonly onClose?: (() => void) | null }) {
  const line = plainLine(verdict, successLine);

  switch (verdict.kind) {
    case "correct": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in relative rounded-2xl border-2 border-[color:var(--good)] bg-good-soft p-4 pr-9" aria-live="polite">
          <CardClose onClose={onClose} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-good px-2.5 py-0.5 text-scale-xs font-bold text-white">{resonance ? "✦ Resonance!" : "Correct"}</span>
          </div>
          <p className="mt-1.5 text-scale-lg font-semibold leading-snug text-good-ink">{line}</p>
          <ShowMore>
            <Detail label="What you did" text={copy.whatYouDid} />
            <Detail label="Why" text={copy.why} />
            <Detail label="Look at" text={copy.lookAt} />
          </ShowMore>
          <CardFooterRow footer={footer} />
        </section>
      );
    }
    case "invalid": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in relative rounded-2xl border-2 border-[color:var(--bb-primary-ink)] bg-bb-primary/5 p-4 pr-9" aria-live="polite">
          <CardClose onClose={onClose} />
          <p className="text-scale-lg font-semibold leading-snug text-bb-foreground">{line}</p>
          <ShowMore>
            <Detail label="What you did" text={copy.whatYouDid} />
            <Detail label="Why" text={copy.why} />
            <Detail label="Look at" text={copy.lookAt} />
          </ShowMore>
          <CardFooterRow footer={footer} />
        </section>
      );
    }
    case "not_requested":
      // An authored distractor is the specific mistake an instructor predicted,
      // and specificity wins over tier number per CLAUDE.md: when one matched,
      // its copy IS the card, headline included, and the generic concerted-step
      // paragraph never shows. The owner hit the generic path drawing O to Br
      // and it answered a different mistake than the one made.
      if (distractor !== null) {
        // The why is VISIBLE, not folded: a blind critic caught the default
        // state of the card being pure diagnosis with the entire teaching
        // collapsed behind Show more "at the exact moment of confusion".
        // Only the where-to-look-next stays behind the fold.
        return (
          <section className="fade-in relative rounded-2xl border-2 border-not-requested bg-not-requested-soft p-4 pr-9" aria-live="polite">
          <CardClose onClose={onClose} />
            <p className="text-scale-lg font-semibold leading-snug text-not-requested">{distractor.what}</p>
            <p className="mt-1.5 text-scale-sm text-bb-foreground">{distractor.why}</p>
            <ShowMore>
              <Detail label="Look at" text={distractor.lookAt} />
            </ShowMore>
            <CardFooterRow footer={footer} />
          </section>
        );
      }
      return (
        <section className="fade-in relative rounded-2xl border-2 border-not-requested bg-not-requested-soft p-4 pr-9" aria-live="polite">
          <CardClose onClose={onClose} />
          <p className="text-scale-lg font-semibold leading-snug text-not-requested">{line}</p>
          <ShowMore>
            <Detail
              label="What you did"
              text={
                [
                  verdict.missing > 0 ? `${verdict.missing} of the arrows this step needs ${verdict.missing === 1 ? "is" : "are"} not drawn` : "",
                  verdict.extra > 0 ? `${verdict.extra} arrow${verdict.extra === 1 ? "" : "s"} go${verdict.extra === 1 ? "es" : ""} somewhere this step does not` : "",
                ]
                  .filter((part) => part !== "")
                  .join(", and ") + "."
              }
            />
            <Detail
              label="Why"
              text="Electrons are conserved: every bond that forms needs electrons from somewhere, and every atom keeps a legal count. When the drawn arrows are each fine alone but the step is wrong together, the mismatch is in what still has to move."
            />
            <Detail
              label="Look at"
              text="The arrows this step still needs. Compare what changed between your drawing and the target: which bond has not broken yet, or which electrons went somewhere this reaction does not send them."
            />
          </ShowMore>
          <CardFooterRow footer={footer} />
        </section>
      );
    case "incomplete":
      return (
        <section className="fade-in relative rounded-2xl border-2 border-bb-border bg-bb-muted p-4 pr-9" aria-live="polite">
          <CardClose onClose={onClose} />
          <p className="text-scale-lg font-semibold leading-snug text-bb-foreground">{line}</p>
          <ShowMore>
            <Detail label="Why" text="Every arrow you have drawn holds up on its own. A step is finished when every electron pair that has to move has moved, and at least one has not yet." />
            <Detail label="Look at" text="Which bond has to break for this product to exist, and which atom keeps those electrons." />
          </ShowMore>
          <CardFooterRow footer={footer} />
        </section>
      );
    default: {
      const unreachable: never = verdict;
      return <>{unreachable}</>;
    }
  }
}
