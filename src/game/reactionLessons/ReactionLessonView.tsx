/**
 * The walk, on screen: the trainer's own molecule on top, one move at a time
 * under it, the action at the bottom (owner rule: eyes stay low).
 *
 * THE STUDENT DRAWS THE ARROWS (Arrow Pusher is the bar). On the attack and
 * release moves the molecule waits at its starting frame, the student drags from
 * where the electrons are to where they go, and the arrow stays on the picture
 * as the atoms then move. The drag is graded against the trainer step's own
 * arrow (drawArrowsOf), so what is drawn here is what the trainer accepts. Two
 * misses draw it for them; "Show me" does it on demand; Continue is always live.
 *
 * Shape and bond length are figures that change (StereoFigures.tsx). The
 * resonance check is on every walk: when there is no second form the card says
 * so and moves on.
 *
 * The picture is MoleculeSvg on the same MechanismStep the trainer draws, so
 * the structures are not redrawn or recalled here.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Press } from "../app/ui/Press";
import { MoleculeSvg } from "../render/svg/MoleculeSvg";
import { layoutState } from "../render/layout/layout";
import { buildStepScene } from "../render/layout/stepScene";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { reactionLessonFor } from "./content";
import { arrowsForMove, drawArrowsOf, gradeArrow, litAtoms, nextTapState, TAP_OPEN, type DrawArrow, type TapState } from "./model";
import { VisualFigure } from "./StereoFigures";
import { bowPath, type Pt } from "./stereoGeometry";

/** Eases the drawn frame toward the move's frame; jumps there under reduced motion. */
function useFrame(target: number, reducedMotion: boolean): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (reducedMotion) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      current.current = from + (target - from) * t;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reducedMotion]);
  return value;
}

/** The body one sentence at a time, so each move is narrated in small beats like the bar's videos. */
export function narrationBeats(body: string): string[] {
  return body.split(/(?<=[.?!])\s+/).map((t) => t.trim()).filter((t) => t.length > 0);
}

type Centers = Readonly<Record<string, Pt>>;

function centreOf(centers: Centers, ids: readonly string[]): Pt | null {
  const pts = ids.map((id) => centers[id]).filter((p): p is Pt => p !== undefined);
  if (pts.length === 0) return null;
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

export interface ReactionLessonViewProps {
  /** A trainer reaction id with an authored walk (ids.ts). */
  readonly reactionId: string;
  readonly reducedMotion: boolean;
  /** The last move's Continue, or Skip. */
  readonly onDone: () => void;
}

export function ReactionLessonView({ reactionId, reducedMotion, onDone }: ReactionLessonViewProps) {
  const lesson = reactionLessonFor(reactionId);
  const reaction = TRAINER_REACTIONS.find((entry) => entry.id === reactionId);
  const scene = useMemo(
    () =>
      reaction === undefined
        ? null
        : // The trainer's own arrows are held back: the student's drawn ones stand in for them.
          { ...buildStepScene(reaction.step, layoutState(reaction.step.from, reaction.fromHints), layoutState(reaction.step.to, reaction.toHints)), arrows: [] },
    [reaction],
  );
  const arrows = useMemo(() => (reaction === undefined ? [] : drawArrowsOf(reaction.step)), [reaction]);

  const [index, setIndex] = useState(0);
  const [tapState, setTapState] = useState<TapState>(TAP_OPEN);
  const [toldWhy, setToldWhy] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<readonly string[]>([]);
  const [misses, setMisses] = useState(0);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [pointer, setPointer] = useState<Pt | null>(null);
  const [centers, setCenters] = useState<Centers>({});
  const [resonanceSaid, setResonanceSaid] = useState<boolean | null>(null);
  const [shown, setShown] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const step = lesson?.steps[index];
  const moveArrows: readonly DrawArrow[] = step === undefined ? [] : arrowsForMove(step.move, arrows);
  const pending = moveArrows.find((a) => !drawn.includes(a.id));
  const drawing = pending !== undefined;
  const frame = useFrame(drawing ? 0 : (step?.frame ?? 0), reducedMotion);
  const hasFigure = step?.visual !== undefined;

  /* Measure atom centres in stage coordinates, so overlay arrows follow the atoms as they move. */
  const measure = () => {
    const stage = stageRef.current;
    if (stage === null) return;
    const box = stage.getBoundingClientRect();
    const next: Record<string, Pt> = {};
    stage.querySelectorAll<SVGElement>("[data-atom-id]").forEach((node) => {
      const r = node.getBoundingClientRect();
      next[node.getAttribute("data-atom-id") ?? ""] = { x: Math.round(r.left + r.width / 2 - box.left), y: Math.round(r.top + r.height / 2 - box.top) };
    });
    setCenters((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  };
  useLayoutEffect(() => {
    measure();
  });
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* The drag: follow the pointer, and on release read the atom under it. */
  const settle = (arrow: DrawArrow, startId: string | null, endId: string | null) => {
    const verdict = gradeArrow(arrow, startId, endId);
    if (verdict === "right") {
      setDrawn((d) => [...d, arrow.id]);
      setMisses(0);
      setToldWhy(
        step?.move === "attack" && step.tap !== undefined
          ? step.tap.right
          : "Yes. The pair leaves the bond that is breaking and lands where it can be held.",
      );
      return;
    }
    const nextMisses = misses + 1;
    if (nextMisses >= 2) {
      setDrawn((d) => [...d, arrow.id]);
      setMisses(0);
      setToldWhy("Here is the arrow. The reason is just below.");
      return;
    }
    setMisses(nextMisses);
    setToldWhy(
      verdict === "badStart"
        ? startId !== null && arrow.end.includes(startId)
          ? "That atom is where the electrons arrive, not where they start. Back up: start on the lone pair or breaking bond that gives them."
          : "Arrows start where the electrons are: on a lone pair or on a bond that is breaking. That spot has neither, so start from the one that does."
        : endId === null
          ? "The arrow landed on empty space. Drop the head right on an atom."
          : endId === startId
            ? "That is the atom you started from. The electrons have to travel to a different atom."
            : arrow.start.includes(endId)
              ? "That atom is giving the electrons, so they cannot also land there. Aim at the atom that needs them."
              : "Right start. The electrons need a place to be held: drop on the atom that takes them as a new bond or a new lone pair.",
    );
  };
  const pendingId = pending?.id;
  useEffect(() => {
    if (dragFrom === null || pending === undefined) return;
    const rel = (e: PointerEvent): Pt => {
      const box = stageRef.current?.getBoundingClientRect();
      return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) };
    };
    const move = (e: PointerEvent) => setPointer(rel(e));
    const up = (e: PointerEvent) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-atom-id]");
      const endId = hit?.getAttribute("data-atom-id") ?? null;
      const from = dragFrom;
      setDragFrom(null);
      setPointer(null);
      settle(pending, from, endId);
    };
    const cancel = () => {
      setDragFrom(null);
      setPointer(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    // settle reads the latest misses/step through its closure on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragFrom, pendingId, misses, index]);

  if (lesson === undefined || reaction === undefined || scene === null || step === undefined) return null;

  const last = index === lesson.steps.length - 1;
  const lit = drawing ? [] : litAtoms(step, tapState);
  const tapMode = step.tap !== undefined && !drawing && moveArrows.length === 0;
  const title =
    (step.move === "attack" || step.move === "release") && moveArrows.length === 0
      ? step.move === "attack"
        ? "The attack"
        : "Where the electrons go"
      : step.title;
  const gateOpen = drawing ? false : step.tap === undefined || moveArrows.length > 0 || tapState.phase === "done";
  const resonanceGate = step.resonance !== undefined && resonanceSaid === null;

  const onAtom = (atomId: string) => {
    if (drawing) {
      setDragFrom(atomId);
      setToldWhy(null);
      return;
    }
    const tap = step.tap;
    if (tap === undefined || !tapMode || tapState.phase === "done") return;
    const next = nextTapState(tapState, tap, atomId);
    setTapState(next);
    setToldWhy(next.phase === "done" ? tap.right : tap.wrong);
  };

  const showMe = () => {
    if (pending === undefined) return;
    setDrawn((d) => [...d, pending.id]);
    setMisses(0);
    setToldWhy("Here is the arrow. The reason is just below.");
  };

  const beats = narrationBeats(step.body);
  const total = beats.length + 1; // the sentences, then the "in space" note
  const more = gateOpen && !resonanceGate && shown < total;

  const advance = () => {
    if (more) {
      setShown(shown + 1);
      return;
    }
    if (last) {
      onDone();
      return;
    }
    setIndex(index + 1);
    setTapState(TAP_OPEN);
    setToldWhy(null);
    setMisses(0);
    setDragFrom(null);
    setPointer(null);
    setResonanceSaid(null);
    setShown(1);
  };

  /* Overlay: every arrow drawn so far, plus the one being dragged. */
  const pathFor = (arrow: DrawArrow): string | null => {
    const a = centreOf(centers, arrow.start);
    const b = centreOf(centers, arrow.end);
    return a === null || b === null ? null : bowPath(a, b).d;
  };
  const dragStart = dragFrom === null ? null : (centers[dragFrom] ?? null);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 pb-3" aria-label={`${lesson.title}, step by step`}>
      <ol className="m-0 flex list-none gap-1.5 p-0" aria-label={`Move ${index + 1} of ${lesson.steps.length}`}>
        {lesson.steps.map((one, i) => (
          <li key={one.move} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-bb-primary" : "bg-bb-border"}`} aria-current={i === index ? "step" : undefined} />
        ))}
      </ol>

      {hasFigure ? null : (
        <div
          ref={stageRef}
          className="relative rounded-2xl border-2 border-bb-border bg-bb-card p-2"
          style={{ height: "min(40vh, 280px)", touchAction: drawing ? "none" : "auto" }}
        >
          <MoleculeSvg
            step={reaction.step}
            scene={scene}
            progress={frame}
            reducedMotion={false}
            selectedAtomIds={lit}
            {...(drawing || tapMode ? { onAtomPointerDown: onAtom } : {})}
          />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <marker id="walk-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--bb-primary, #5a3fd8)" />
              </marker>
            </defs>
            {arrows
              .filter((a) => (step.move === "attack" || step.move === "release") && drawn.includes(a.id))
              .map((a) => {
                const d = pathFor(a);
                return d === null ? null : (
                  <path key={a.id} d={d} fill="none" stroke="var(--bb-primary, #5a3fd8)" strokeWidth={3.5} strokeLinecap="round" markerEnd="url(#walk-arrowhead)" />
                );
              })}
            {dragStart !== null && pointer !== null ? (
              <path
                d={bowPath(dragStart, pointer).d}
                fill="none"
                stroke="var(--bb-primary, #5a3fd8)"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeDasharray="2 7"
                markerEnd="url(#walk-arrowhead)"
              />
            ) : null}
          </svg>
        </div>
      )}

      <div className="flex flex-col gap-2" aria-live="polite">
        <h2 className="m-0 font-display text-scale-lg font-extrabold text-bb-foreground">{title}</h2>
        {tapMode && step.tap !== undefined ? <p className="m-0 text-scale-base font-semibold text-bb-primary">{step.tap.prompt}</p> : null}
        {drawing ? (
          <p className="m-0 text-scale-base font-semibold text-bb-primary">
            {step.move === "attack"
              ? "Drag from where the electrons start to where they go. The arrow is your move."
              : moveArrows.length > 1
                ? "Draw the next arrow. Drag from the electrons to where they land."
                : "Draw the second arrow: drag from the bond that breaks to the atom that keeps its electrons."}
          </p>
        ) : null}
        {toldWhy !== null ? <p className="m-0 rounded-xl border-2 border-bb-border bg-bb-card px-3 py-2 text-scale-base">{toldWhy}</p> : null}

        {step.visual !== undefined ? <VisualFigure key={`${reactionId}:${step.move}`} visual={step.visual} /> : null}

        {step.resonance !== undefined ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-scale-base font-semibold text-bb-primary">Decide: is there a second resonance form worth weighing?</p>
            {resonanceSaid === null ? (
              <div className="flex gap-2">
                <Press variant="secondary" onClick={() => setResonanceSaid(true)}>
                  Yes, one exists
                </Press>
                <Press variant="secondary" onClick={() => setResonanceSaid(false)}>
                  No, move on
                </Press>
              </div>
            ) : (
              <p className="m-0 text-scale-sm font-semibold text-bb-muted-foreground">
                {resonanceSaid === step.resonance.exists
                  ? step.resonance.exists
                    ? "Right, a second form exists."
                    : "Right. Checked, decided, moving on."
                  : step.resonance.exists
                    ? "Not quite: a second form does exist."
                    : "Not quite: there is no second form."}
              </p>
            )}
          </div>
        ) : null}

        {gateOpen && !resonanceGate ? (
          <>
            <p className="m-0 text-scale-base leading-relaxed">
              {beats.slice(0, shown).map((sentence, i) => (
                <span key={i} className={i === shown - 1 && !reducedMotion ? "walk-beat-in inline-block" : undefined}>
                  {sentence}{" "}
                </span>
              ))}
            </p>
            {shown >= total ? (
              <p className="m-0 rounded-xl border-2 border-bb-border px-3 py-2 text-scale-sm text-bb-muted-foreground">
                <span className="font-semibold text-bb-foreground">In space. </span>
                {step.stereo}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
        <Press variant="ghost" onClick={onDone}>
          Skip to drawing
        </Press>
        {drawing ? (
          <Press variant="secondary" onClick={showMe}>
            Show me
          </Press>
        ) : null}
        <Press onClick={advance}>{more ? "Next" : last ? "Now draw it" : "Continue"}</Press>
      </div>
    </section>
  );
}
