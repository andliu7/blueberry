/**
 * The trainer screen's canvas: the molecules, the annotations, the gesture,
 * the records, the replay, and the win's bond change. One SVG, no pan, no
 * zoom, no carry; the screen's job is the five-piece loop, and every gesture
 * this canvas takes goes straight into the interaction machine.
 *
 * WHAT DRAWS WHAT. The canvas never learns the question's kind. It takes two
 * answers, which TrainerScreen resolves once from the kind and the student's
 * drag style setting (settings/arrowStyle.ts): `dragStyle` for what follows
 * the finger, `curvedArrows` for what a committed push rests as.
 *
 *   drag curved    ONE solid tapered arrow, head included, from the grabbed
 *                  electrons to the smoothed finger (engine/drag/smoothing),
 *                  or to the target once the machine snaps. Owner ruling of
 *                  30 Sep 2026: the head shows WHILE dragging; the earlier
 *                  "no head in flight" ruling is retired.
 *   drag dashed    The straight dashed guide WITH a head (owner ruling of
 *                  30 Sep 2026), to the finger or, snapped, to the landing.
 *   record         The arrow the student drew stays, full length, to the atom
 *                  or bond it was dropped on: the tapered curved arrow, or the
 *                  dashed arrow with its head. The WIN plays the bond change.
 *
 * THE FEEL, beat by beat, all presentation over what the machine and the
 * grader already decided (nothing here changes what commits or what grades):
 *   idle      every lone pair is drawn dark and is grabbable from the first
 *             frame; bond ends carry the joint-coloured handle.
 *   dragging  the snapped target gets a filled halo that throbs, and the
 *             arrow lands exactly where the push will.
 *   commit    the new record draws itself in (220 ms) and a ring leaves
 *             the landing. A push the chemistry refuses shakes off in amber.
 *   verdict   `marks`: on a miss the offending arrow turns the sheet's amber
 *             and the atom it hit is ringed, with a calm green halo on where
 *             those electrons belong; on a win every arrow turns green and
 *             holds before the bond change, while each pair travels its arrow.
 * Reduced motion: every beat renders its resting frame and nothing moves; a
 * win holds the green arrows, then cuts to the product (TrainerScreen).
 *
 * Lone pairs and hydrogens both come from engine/annotations/placement, one
 * allocation per atom, so nothing here renders bond-side and the hit target
 * for a lone pair is the dot the student can see.
 *
 * THE PATTERN, NAMED: pointer events are adapted to the machine's
 * PointerInput at this boundary (getScreenCTM keeps pixels and hit geometry
 * in one space), exactly as the trainer's DrawCanvas does; the machine owns
 * every decision about what a press means.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import {
  targetAtomId,
  targetKey,
  type InFlightGuide,
  type InteractionEvent,
  type MechanismDraft,
  type Point2,
} from "@blueberry/interaction";
import type { StepScene, SceneAtom } from "../../../render/layout/stepScene";
import { lerp, smoothstep } from "../../../render/layout/vec";
import { AtomSphere, BondCapsule, ChargeBadge, DepthDefs, SHADOW_FILTER_ID } from "../../../render/svg/depth";
import { atomRadius, bondMidpoint, bowAwayFrom, mix as mixPx, pointerInputFrom, rimPoint, sceneCentroid, toPx, type DrawTarget } from "../hitLayout";
import { TaperedArrow } from "./arrow/TaperedArrowSvg";
import "./push.css";
import { createDragSmoother, type DragSmoother, type SmoothedArrow } from "./drag/smoothing";
import { replayArrows, type RecordedStep } from "./screenModel";
import { committedArrowGeometry, targetAnchorPx, type AtomAnnotations } from "./screenLayout";

export interface TrainerCanvasProps {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  /** Draw committed pushes as the tapered curved arrow; false is the arrowless record. */
  readonly curvedArrows: boolean;
  /** What follows the finger: the smoothed curved arc, or the straight dashed guide. */
  readonly dragStyle: "curved" | "dashed";
  /** Keep the records drawn over the win (the question kind's own curved record). Defaults to `curvedArrows`. */
  readonly keepRecordsOnWin?: boolean;
  /**
   * The verdict painted on the molecule, in the sheet's own colour: which
   * pushes to mark and how. Null when no verdict is up.
   */
  readonly marks?: CanvasMarks | null;
  /** Counts pushes the machine refused; each increment shakes one off where it was aimed. */
  readonly refusals?: number;
  readonly draft: MechanismDraft;
  readonly guide: InFlightGuide | null;
  readonly targets: readonly DrawTarget[];
  /** Placement-module annotations for the from state (the drawing surface). */
  readonly annotations: ReadonlyMap<AtomId, AtomAnnotations>;
  /** And for the to state, which is what the win rests on. */
  readonly toAnnotations: ReadonlyMap<AtomId, AtomAnnotations>;
  readonly dispatch: (event: InteractionEvent) => void;
  /** False once the stage is won or a replay is open: render only, take nothing. */
  readonly interactive: boolean;
  /** The win's bond change, 0 while drawing, driven once to 1 on completion. */
  readonly winT: number;
  /** Non-null while the replay is open: the canvas shows the recorded history. */
  readonly replay: {
    readonly recorded: readonly RecordedStep[];
    readonly scrub: number;
    /**
     * A look-back: the scrub runs one stretch PAST the record, and that last
     * stretch plays the bond change from the from state (every push drawn)
     * to the settled outcome. So scrub = recorded.length is the pushes, and
     * scrub = recorded.length + 1 is the won picture.
     */
    readonly settledAtEnd?: boolean;
  } | null;
  readonly reducedMotion: boolean;
}

/** A verdict on the molecule: `good` is the win's green, `near` the miss sheet's amber (never red). */
export interface CanvasMarks {
  readonly tone: "good" | "near";
  readonly arrowIds: readonly string[];
  /** On a miss: authored arrows whose landing gets a calm halo, "these electrons go here". */
  readonly hints?: readonly ElectronFlowArrow[];
}

const TONE_COLOUR: Record<CanvasMarks["tone"], string> = { good: "var(--good)", near: "var(--not-requested)" };

/** How long a fresh record takes to draw itself in. Under the 250 ms a commit may take to feel instant. */
const COMMIT_MS = 220;

/**
 * Margin around the atoms in the view box. 44 rather than the old 64: the
 * canvas is width-bound on a phone, so every unit here is molecule size
 * lost, and round two measured ours at about a third of the reference's
 * scale. 44 still clears an atom's lone pairs (radius + 7, plus the dot)
 * and its charge badge at the edge; hit circles only grow with the scale.
 */
const PAD = 44;

/** Expose drop sites for the capture script, same family as __blueberryTargets. */
const EXPOSE_TARGETS = new URLSearchParams(window.location.search).get("targets") === "1";

declare global {
  interface Window {
    __pilotTargets?: readonly DrawTarget[];
  }
}

export function TrainerCanvas({
  step,
  scene,
  curvedArrows,
  dragStyle,
  keepRecordsOnWin = curvedArrows,
  marks = null,
  refusals = 0,
  draft,
  guide,
  targets,
  annotations,
  toAnnotations,
  dispatch,
  interactive,
  winT,
  replay,
  reducedMotion,
}: TrainerCanvasProps) {
  const curvedDrag = dragStyle === "curved";
  const svgRef = useRef<SVGSVGElement>(null);
  const centroid = useMemo(() => sceneCentroid(scene), [scene]);

  // Replay looks at the from state; the win tween owns t otherwise.
  const t =
    replay !== null
      ? replay.settledAtEnd === true
        ? Math.min(1, Math.max(0, replay.scrub - replay.recorded.length))
        : 0
      : winT;
  const glide = smoothstep(0.15, 0.85, t);

  const posOf = useCallback(
    (atom: SceneAtom): Point2 => toPx(glide <= 0 ? atom.from.pos : lerp(atom.from.pos, atom.to.pos, glide)),
    [glide],
  );
  const atomById = useMemo(() => new Map(scene.atoms.map((atom) => [atom.id, atom])), [scene]);
  const centreOf = useCallback(
    (id: AtomId): Point2 => {
      const atom = atomById.get(id);
      return atom === undefined ? centroid : posOf(atom);
    },
    [atomById, posOf, centroid],
  );

  /* ---------------- pointer adapter ---------------- */

  const toInput = (event: ReactPointerEvent<SVGSVGElement>) => pointerInputFrom(svgRef.current, event);

  /* ---------------- the drag smoother (curved arrows only) ---------------- */

  const smootherRef = useRef<DragSmoother | null>(null);
  const smoothedRef = useRef<SmoothedArrow | null>(null);
  const guideAnchorPx = guide === null ? null : (targetAnchorPx(step, scene, annotations, guide.anchor) ?? guide.from);
  const guideKey = guide === null ? null : targetKey(guide.anchor);
  const smootherKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!curvedDrag || guide === null || guideAnchorPx === null) {
      smootherRef.current = null;
      smoothedRef.current = null;
      smootherKeyRef.current = null;
      return;
    }
    if (smootherKeyRef.current !== guideKey || smootherRef.current === null) {
      const smoother = createDragSmoother(guideAnchorPx, centroid);
      smoothedRef.current = smoother.push({ x: guide.to.x, y: guide.to.y, tMs: performance.now() });
      smootherRef.current = smoother;
      smootherKeyRef.current = guideKey;
    }
    // The guide object changes identity every move; the smoother must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curvedDrag, guideKey, guideAnchorPx?.x, guideAnchorPx?.y]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is a nicety; the press is not.
    }
    dispatch({ kind: "pointerDown", pointer });
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    if (curvedDrag && smootherRef.current !== null) {
      // Pushed BEFORE the dispatch so the render the dispatch triggers reads
      // this frame's arc, not last frame's.
      smoothedRef.current = smootherRef.current.push({
        x: pointer.point.x,
        y: pointer.point.y,
        tMs: pointer.timestampMs,
      });
    }
    dispatch({ kind: "pointerMove", pointer });
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    dispatch({ kind: "pointerUp", pointer });
  };
  const onPointerCancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    dispatch({ kind: "pointerCancel", pointer });
  };

  useEffect(() => {
    if (EXPOSE_TARGETS) window.__pilotTargets = targets;
  }, [targets]);

  /* ---------------- view box over both endpoints ---------------- */

  const viewBox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const atom of scene.atoms) {
      for (const p of [atom.from.pos, atom.to.pos]) {
        const q = toPx(p);
        minX = Math.min(minX, q.x);
        maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y);
        maxY = Math.max(maxY, q.y);
      }
    }
    return `${minX - PAD} ${minY - PAD} ${maxX - minX + 2 * PAD} ${maxY - minY + 2 * PAD}`;
  }, [scene]);

  /* ---------------- what the records show right now ---------------- */

  const shown = useMemo(() => {
    if (replay !== null) return replayArrows(replay.recorded, Math.min(replay.scrub, replay.recorded.length));
    return { full: draft.arrows, animating: [] as readonly { readonly arrow: ElectronFlowArrow; readonly t: number }[] };
  }, [replay, draft.arrows]);

  const armedTarget = draft.armed?.target;

  const annotationSide: "from" | "to" | "none" =
    (replay !== null && replay.settledAtEnd !== true) || t < 0.25 ? "from" : t > 0.75 ? "to" : "none";
  const annotationOpacity =
    annotationSide === "from" ? Math.max(0, 1 - t * 4) : annotationSide === "to" ? Math.min(1, (t - 0.75) * 4) : 0;
  const liveAnnotations = annotationSide === "to" ? toAnnotations : annotations;

  // Records are drawn on the FROM geometry. A resonance find barely moves an
  // atom, so its arrows stay over the win; a reaction's atoms travel, and an
  // arrow left behind points into empty space (measured with the curved
  // setting on the SN2: the arrow hung where the bromine had been). So only
  // the kind's own curved record stays; every other record fades as the
  // bond change plays and the travelling pairs carry the consequence.
  const recordFade = curvedArrows && keepRecordsOnWin ? 1 : Math.max(0, 1 - t * 1.6);

  /* ---------------- the commit beat ---------------- */

  // A push that just committed draws itself in over COMMIT_MS instead of
  // appearing whole, and a ring leaves its landing. The set of ids seen so
  // far lives in a ref (a value that survives renders without causing one),
  // so an undo or a fresh document does not replay the beat.
  const [fresh, setFresh] = useState<{ readonly id: string; readonly t: number } | null>(null);
  const [landed, setLanded] = useState<{ readonly id: string; readonly at: Point2 } | null>(null);
  const seenIdsRef = useRef<ReadonlySet<string>>(new Set(draft.arrows.map((arrow) => arrow.id)));
  useEffect(() => {
    const seen = seenIdsRef.current;
    const added = draft.arrows.find((arrow) => !seen.has(arrow.id));
    seenIdsRef.current = new Set(draft.arrows.map((arrow) => arrow.id));
    if (draft.arrows.length === 0) setLanded(null);
    if (added === undefined || !interactive) return;
    setLanded({ id: added.id, at: committedArrowGeometry(step, scene, annotations, added, centroid).landing });
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COMMIT_MS);
      setFresh(progress >= 1 ? null : { id: added.id, t: progress });
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    setFresh({ id: added.id, t: 0 });
    raf = requestAnimationFrame(tick);
    // A frame loop that never gets frames (a background tab) must not leave
    // the record half drawn, so a timer lands it whatever rAF does.
    const settle = window.setTimeout(() => setFresh(null), COMMIT_MS + 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      setFresh(null);
    };
    // Only a change in the arrow list is a commit; the geometry inputs are fixed per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.arrows]);

  /* ---------------- the snap, and a refusal where it was aimed ---------------- */

  const snap = guide !== null && guideAnchorPx !== null ? snapPreview(step, scene, guide, guideAnchorPx, centreOf, atomById) : null;
  // Where the last snapped target was, read when the machine refuses a push:
  // the refusal arrives on release, after the guide has already gone.
  const lastSnapRef = useRef<SnapPreview | null>(null);
  if (snap !== null) lastSnapRef.current = snap;
  const [refused, setRefused] = useState<{ readonly n: number; readonly at: SnapPreview } | null>(null);
  useEffect(() => {
    const at = lastSnapRef.current;
    if (refusals === 0 || at === null) return;
    setRefused({ n: refusals, at });
    const clear = window.setTimeout(() => setRefused(null), 600);
    return () => window.clearTimeout(clear);
  }, [refusals]);

  /* ---------------- the win's consequence ---------------- */

  // Each push's pair travels its own arrow while the bond change plays, one
  // after another in draw order. Only on the live win: the replay scrubber
  // already re-performs the gestures its own way.
  const travelling =
    replay === null && winT > 0 && winT < 1 && !reducedMotion
      ? draft.arrows.map((arrow, index) => {
          // Every pair has left by 0.3 and landed by 0.75, before the bonds settle at 0.8.
          const startAt = draft.arrows.length <= 1 ? 0 : (index / (draft.arrows.length - 1)) * 0.3;
          const local = Math.min(1, Math.max(0, (winT - startAt) / 0.45));
          return { arrow, local };
        })
      : [];
  const toneOf = (id: string): CanvasMarks["tone"] | undefined =>
    marks !== null && marks.arrowIds.includes(id) ? marks.tone : undefined;

  /* ---------------- render ---------------- */

  return (
    <svg
      ref={svgRef}
      data-pilot-canvas
      data-win-t={t.toFixed(2)}
      viewBox={viewBox}
      role="application"
      aria-label="Draw the electron pushes. Tap or drag a lone pair or bond handle to pick the electrons up, then drop them where they go."
      className="h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerCancel : undefined}
    >
      <defs>
        <DepthDefs />
      </defs>

      {/* Bonds, with the win's bond change on t. */}
      <g filter={`url(#${SHADOW_FILTER_ID})`}>
        {scene.bonds.map((bond) => {
          const a = centreOf(bond.a);
          const b = centreOf(bond.b);
          const rA = atomRadius(atomById.get(bond.a)?.element ?? "C");
          const rB = atomRadius(atomById.get(bond.b)?.element ?? "C");
          if (bond.phase === "forming") {
            // While drawing, the committed stub record is the only preview.
            if (t <= 0) return null;
            const grow = smoothstep(0.2, 0.8, t);
            return (
              <BondCapsule
                key={bond.key}
                a={a}
                b={b}
                rA={rA}
                rB={rB}
                order={bond.order}
                forming={t < 0.8}
                opacity={Math.min(1, 0.25 + grow)}
              />
            );
          }
          if (bond.phase === "breaking") {
            const opacity = 1 - smoothstep(0.25, 0.8, t);
            if (opacity <= 0.01) return null;
            return <BondCapsule key={bond.key} a={a} b={b} rA={rA} rB={rB} order={bond.order} opacity={opacity} />;
          }
          // Persistent, possibly changing order: rest states draw their own
          // order; mid-tween draws the larger with the pi rod on a fade, the
          // same schedule MoleculeSvg plays.
          const order = t <= 0 ? bond.order : t >= 1 ? bond.toOrder : Math.max(bond.order, bond.toOrder);
          const extraRodOpacity =
            t <= 0 || t >= 1 || bond.order === bond.toOrder
              ? 1
              : bond.toOrder > bond.order
                ? smoothstep(0.25, 0.8, t)
                : 1 - smoothstep(0.25, 0.8, t);
          return (
            <BondCapsule key={bond.key} a={a} b={b} rA={rA} rB={rB} order={order} extraRodOpacity={extraRodOpacity} />
          );
        })}
      </g>

      {/* Bond end handles: the grab points for bond electrons (capture x02).
          A joint-coloured ball in the rod's colour ring, the Alchemie
          handle PHASE-6-VERDICT measured us losing to: a grey dot the same
          colour as the rod read as part of the rod, not as a thing to grab.
          The hit circle is the tester's (22 px radius on touch), not this. */}
      {interactive
        ? targets
            .filter((entry) => entry.target.kind === "bondEndHandle")
            .map((entry) => {
              const isArmed = armedTarget !== undefined && targetKey(entry.target) === targetKey(armedTarget);
              return (
                <circle
                  key={targetKey(entry.target)}
                  cx={entry.centre.x}
                  cy={entry.centre.y}
                  r={isArmed ? 8 : 6.5}
                  fill={isArmed ? "var(--bb-primary)" : "var(--bond-joint)"}
                  stroke={isArmed ? "var(--bb-primary)" : "var(--bond-joint-ring)"}
                  strokeWidth={isArmed ? 3 : 2}
                />
              );
            })
        : null}

      {/* Atom bodies. */}
      <g filter={`url(#${SHADOW_FILTER_ID})`}>
        {scene.atoms.map((atom) => {
          const c = posOf(atom);
          const r = atomRadius(atom.element);
          const fromBadge = {
            x: c.x + (r + 1) * Math.cos(-atom.from.badgeAngle),
            y: c.y + (r + 1) * Math.sin(-atom.from.badgeAngle),
          };
          const toBadge = {
            x: c.x + (r + 1) * Math.cos(-atom.to.badgeAngle),
            y: c.y + (r + 1) * Math.sin(-atom.to.badgeAngle),
          };
          const toward = smoothstep(0.35, 0.7, t);
          return (
            <g key={atom.id}>
              <AtomSphere centre={c} r={r} element={atom.element} />
              <ChargeBadge at={fromBadge} charge={atom.fromCharge} opacity={1 - toward} />
              <ChargeBadge at={toBadge} charge={atom.toCharge} opacity={toward} />
            </g>
          );
        })}
      </g>

      {/* Hydrogens and lone pairs, from the placement module. */}
      {annotationOpacity > 0.01 ? (
        <g opacity={annotationOpacity}>
          {scene.atoms.map((atom) => {
            const entry = liveAnnotations.get(atom.id);
            if (entry === undefined) return null;
            const c = posOf(atom);
            // Every lone pair is drawn, dark and at full contrast, and is
            // grabbable from the first frame: no tap-to-open step. Round two's
            // critic scored the old hidden pairs (and the grey ghost dots that
            // replaced them) as the molecule never saying "drag from here".
            return (
              <g key={`ann-${atom.id}`}>
                <Hydrogens centre={c} slots={entry.hydrogens} />
                {entry.lonePairs.map((slot, slotIndex) => {
                  const isArmed =
                    armedTarget?.kind === "lonePair" &&
                    armedTarget.atomId === atom.id &&
                    armedTarget.slotIndex === slotIndex;
                  const anyArmedHere = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id;
                  const dimmed = anyArmedHere && !isArmed;
                  const aScr = -slot.angleSceneRad;
                  const ux = -Math.sin(aScr);
                  const uy = Math.cos(aScr);
                  const p = slot.posPx;
                  return (
                    <g key={slotIndex} opacity={dimmed ? 0.35 : 1} data-lone-pair>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={11}
                        fill={isArmed ? "var(--bb-primary)" : "none"}
                        stroke="var(--bb-primary)"
                        strokeWidth={isArmed ? 2.5 : 1.25}
                        opacity={isArmed ? 0.95 : interactive ? 0.4 : 0}
                      />
                      <circle cx={p.x - ux * 3.4} cy={p.y - uy * 3.4} r={2.8} fill={isArmed ? "#fff" : "var(--bb-foreground)"} />
                      <circle cx={p.x + ux * 3.4} cy={p.y + uy * 3.4} r={2.8} fill={isArmed ? "#fff" : "var(--bb-foreground)"} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      ) : null}

      {/* The question's subject, marked at rest: quiet halos on the reaction centres. */}
      {interactive && t <= 0
        ? step.identity.reactionCenters.map((atomId) => {
            const centre = centreOf(atomId);
            const r = atomRadius(atomById.get(atomId)?.element ?? "C");
            return (
              <g key={`centre-${atomId}`} style={{ pointerEvents: "none" }}>
                <circle cx={centre.x} cy={centre.y} r={r + 8} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.28} />
                <circle
                  cx={centre.x}
                  cy={centre.y}
                  r={r + 8}
                  fill="none"
                  stroke="var(--bb-primary)"
                  strokeWidth={2}
                  opacity={0.5}
                  className={reducedMotion ? undefined : "centre-breathe"}
                />
              </g>
            );
          })
        : null}

      {/* The records: full, then any the scrubber is animating in. */}
      <g style={{ pointerEvents: "none" }} opacity={recordFade}>
        {shown.full.map((arrow) => (
          <Record
            key={arrow.id}
            step={step}
            scene={scene}
            annotations={annotations}
            arrow={arrow}
            away={centroid}
            curved={curvedArrows}
            t={fresh !== null && fresh.id === arrow.id ? fresh.t : 1}
            tone={toneOf(arrow.id)}
            reducedMotion={reducedMotion}
          />
        ))}
        {shown.animating.map((entry) => (
          <Record
            key={`anim-${entry.arrow.id}`}
            step={step}
            scene={scene}
            annotations={annotations}
            arrow={entry.arrow}
            away={centroid}
            curved={curvedArrows}
            t={entry.t}
          />
        ))}
      </g>

      {/* On a miss, where the same electrons should have gone: a calm filled
          halo in the win's green, quieter than the amber ring on what was hit. */}
      {marks !== null && marks.tone === "near"
        ? (marks.hints ?? []).map((hint) => {
            const geometry = committedArrowGeometry(step, scene, annotations, hint, centroid);
            const at = geometry.targetAtom !== null ? geometry.to : geometry.landing;
            const r = geometry.targetAtom !== null ? geometry.sinkRadiusPx + 4 : 16;
            return (
              <g key={`hint-${hint.id}`} style={{ pointerEvents: "none" }} data-push-hint>
                <circle cx={at.x} cy={at.y} r={r} fill="var(--good)" opacity={0.16} />
                <circle cx={at.x} cy={at.y} r={r} fill="none" stroke="var(--good)" strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
              </g>
            );
          })
        : null}

      {/* The commit's ring, keyed on the push so each commit plays it once. */}
      {landed !== null && interactive && !reducedMotion ? (
        <circle
          key={`land-${landed.id}`}
          cx={landed.at.x}
          cy={landed.at.y}
          r={12}
          fill="none"
          stroke="var(--bb-primary)"
          strokeWidth={3}
          className="push-land-ring"
          style={{ pointerEvents: "none" }}
          data-push-landed
        />
      ) : null}

      {/* The win's consequence: each pair travelling its own arrow. */}
      {travelling.length > 0 ? (
        <g style={{ pointerEvents: "none" }} data-push-travel>
          {travelling.map(({ arrow, local }) => {
            if (local <= 0 || local >= 1) return null;
            const geometry = committedArrowGeometry(step, scene, annotations, arrow, centroid);
            const eased = local * local * (3 - 2 * local);
            const at = curvedArrows ? quadAt(geometry.from, bowAwayFrom(geometry.from, geometry.landing, centroid, 34), geometry.landing, eased) : mixPx(geometry.from, geometry.landing, eased);
            return <ElectronPair key={`travel-${arrow.id}`} at={at} />;
          })}
        </g>
      ) : null}

      {/* A push the chemistry refused, shaken off where it was aimed. */}
      {refused !== null ? (
        <circle
          key={`refused-${refused.n}`}
          cx={refused.at.centre.x}
          cy={refused.at.centre.y}
          r={refused.at.r + 7}
          fill="none"
          stroke="var(--not-requested)"
          strokeWidth={3}
          className={reducedMotion ? undefined : "push-refuse"}
          style={{ pointerEvents: "none" }}
          data-push-refused
        />
      ) : null}

      {/* The gesture in flight. */}
      {interactive && guide !== null && guideAnchorPx !== null ? (
        <g style={{ pointerEvents: "none" }} data-drag-style={dragStyle} data-snapped={snap !== null ? "" : undefined}>
          {snap !== null ? <SnapHalo snap={snap} reducedMotion={reducedMotion} /> : null}
          {curvedDrag ? (
            <InFlightCurved from={guideAnchorPx} smoothed={smoothedRef.current} fallbackTo={guide.to} snap={snap} away={centroid} />
          ) : (
            <InFlightArrowless from={guideAnchorPx} to={guide.to} snap={snap} />
          )}
        </g>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

/** Quiet hydrogen glyphs on the placement ring: a letter over a short tick. */
function Hydrogens({ centre, slots }: { readonly centre: Point2; readonly slots: readonly { readonly posPx: Point2; readonly angleSceneRad: number }[] }) {
  if (slots.length === 0) return null;
  return (
    <g>
      {slots.map((slot, index) => {
        const aScr = -slot.angleSceneRad;
        const arcR = Math.hypot(slot.posPx.x - centre.x, slot.posPx.y - centre.y) - 6;
        const TICK = 0.32;
        const start = { x: centre.x + arcR * Math.cos(aScr - TICK), y: centre.y + arcR * Math.sin(aScr - TICK) };
        const end = { x: centre.x + arcR * Math.cos(aScr + TICK), y: centre.y + arcR * Math.sin(aScr + TICK) };
        return (
          <g key={index}>
            <path
              d={`M ${start.x} ${start.y} A ${arcR} ${arcR} 0 0 1 ${end.x} ${end.y}`}
              fill="none"
              stroke="var(--scene-faint)"
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.6}
            />
            <text
              x={slot.posPx.x}
              y={slot.posPx.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10.5}
              fontWeight={600}
              fill="var(--scene-faint)"
            >
              H
            </text>
          </g>
        );
      })}
    </g>
  );
}

/**
 * One committed push, at progress t (1 is fully drawn). The record IS the
 * arrow the student drew, full length, from the electrons to the atom or bond
 * it was dropped on: the tapered curved arrow in the curved style, the
 * straight dashed guide with a head in the dashed style. Round two's critic
 * measured the old records (a 60 px hook, or two resting dots) as the
 * student's arrow disappearing at the moment it should be rewarded.
 *
 * A `tone` is the verdict painted on it: the arrow itself takes the colour,
 * and the atom it was dropped on is ringed, so the mark points at WHERE.
 */
function Record({
  step,
  scene,
  annotations,
  arrow,
  away,
  curved,
  t,
  tone,
  reducedMotion = true,
}: {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  readonly annotations: ReadonlyMap<AtomId, AtomAnnotations>;
  readonly arrow: ElectronFlowArrow;
  readonly away: Point2;
  readonly curved: boolean;
  readonly t: number;
  readonly tone?: CanvasMarks["tone"];
  readonly reducedMotion?: boolean;
}) {
  const geometry = committedArrowGeometry(step, scene, annotations, arrow, away);
  const eased = t >= 1 ? 1 : t * (2 - t);
  const colour = tone === undefined ? undefined : TONE_COLOUR[tone];
  const mark =
    colour === undefined ? null : (
      <circle
        className={reducedMotion ? undefined : "push-mark-pop"}
        data-push-mark={tone}
        cx={geometry.targetAtom !== null ? geometry.to.x : geometry.landing.x}
        cy={geometry.targetAtom !== null ? geometry.to.y : geometry.landing.y}
        r={geometry.targetAtom !== null ? geometry.sinkRadiusPx + 3 : 15}
        fill="none"
        stroke={colour}
        strokeWidth={3.5}
      />
    );
  if (curved) {
    // No forming-bond stub under the ribbon: on a push to a far atom it ran
    // straight through whatever sat between (O to Br through carbon), which
    // read as carbon being the thing marked. The arrow alone says it.
    if (t >= 1) {
      return (
        <g data-push-record="curved">
          {mark}
          <TaperedArrow
            from={geometry.from}
            to={geometry.to}
            away={away}
            sinkRadiusPx={geometry.sinkRadiusPx}
            {...(colour !== undefined ? { fill: colour } : {})}
          />
        </g>
      );
    }
    // Growing in (the commit beat, or the scrubber): the ribbon reaches
    // toward its landing, so a young arrow is a short arrow.
    return <TaperedArrow from={geometry.from} to={mixPx(geometry.from, geometry.landing, eased)} away={away} glow={false} />;
  }
  return (
    <g data-push-record="dashed">
      {t >= 1 ? mark : null}
      <DashedArrow from={geometry.from} to={mixPx(geometry.from, geometry.landing, eased)} colour={colour ?? "var(--bb-primary)"} />
    </g>
  );
}

/**
 * The straight dashed guide with a head: the dashed style's arrow, in flight
 * and at rest. The head is a solid triangle so the direction reads at a
 * glance; the dashes say "this bond is being made", the head says which way
 * the electrons went.
 */
function DashedArrow({ from, to, colour }: { readonly from: Point2; readonly to: Point2; readonly colour: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  const HEAD = 13;
  const base = { x: to.x - ux * HEAD, y: to.y - uy * HEAD };
  const wing = 6.5;
  const head = `M ${to.x} ${to.y} L ${base.x - uy * wing} ${base.y + ux * wing} L ${base.x + uy * wing} ${base.y - ux * wing} Z`;
  return (
    <g>
      {/* Casing blends into the workbench so the dashes read on any rod they cross. */}
      <line x1={from.x} y1={from.y} x2={base.x} y2={base.y} stroke="var(--workbench)" strokeWidth={8} strokeLinecap="round" opacity={0.9} />
      <line x1={from.x} y1={from.y} x2={base.x} y2={base.y} stroke={colour} strokeWidth={4} strokeDasharray="8 6" strokeLinecap="round" />
      <path d={head} fill={colour} stroke="var(--workbench)" strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

/** A travelling pair: glow and core, the same glyph the drag and the replay carry. */
function ElectronPair({ at }: { readonly at: Point2 }) {
  return (
    <g>
      <circle cx={at.x} cy={at.y} r={8.5} fill="var(--electron-glow)" opacity={0.85} />
      <circle cx={at.x} cy={at.y} r={5} fill="var(--electron-core)" />
    </g>
  );
}

/** A point on the quadratic from a through control c to b. */
function quadAt(a: Point2, c: Point2, b: Point2, t: number): Point2 {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/**
 * Where a release would land, read off the machine's own snap. The machine
 * decides what is snapped (hit test, slop, margin); this only says where it
 * is drawn, so the preview can never promise a landing the release misses.
 */
interface SnapPreview {
  /** The thing to highlight: an atom, a bond's middle, or an open bond site. */
  readonly centre: Point2;
  readonly r: number;
  /** Where the electrons would sit: on the rim facing the source, or on the bond. */
  readonly landing: Point2;
  /** What the committed ribbon would be aimed at, and the trim it lands with. */
  readonly aim: Point2;
  readonly sinkRadiusPx: number;
}

function snapPreview(
  step: MechanismStep,
  scene: StepScene,
  guide: InFlightGuide,
  from: Point2,
  centreOf: (id: AtomId) => Point2,
  atomById: ReadonlyMap<AtomId, SceneAtom>,
): SnapPreview | null {
  const snapped = guide.snappedTo;
  const anchor = guide.anchor;
  if (snapped.kind === "empty" || targetKey(snapped) === targetKey(anchor)) return null;
  // A lone pair onto its own atom is the no-op chem-core names on Check; it
  // is not a landing worth advertising. A bond pair onto one of its own ends
  // IS a landing (every leaving group), so only the lone pair case is skipped.
  if (anchor.kind === "lonePair" && targetAtomId(snapped) === anchor.atomId) return null;
  if (snapped.kind === "atom" || snapped.kind === "lonePair") {
    const centre = centreOf(snapped.atomId);
    const r = atomRadius(atomById.get(snapped.atomId)?.element ?? "C");
    return { centre, r, landing: rimPoint(centre, from, r + 6), aim: centre, sinkRadiusPx: r + 6 };
  }
  if (snapped.kind === "bondEndHandle") {
    // "Into this bond": the landing is the bond's middle, as the record draws it.
    const mid = bondMidpoint(step, scene, snapped.bondId) ?? centreOf(snapped.atomId);
    return { centre: mid, r: 12, landing: mid, aim: mid, sinkRadiusPx: 10 };
  }
  if (snapped.kind === "betweenAtomsSite") {
    const mid = mixPx(centreOf(snapped.atomIds[0]), centreOf(snapped.atomIds[1]), 0.5);
    return { centre: mid, r: 12, landing: mid, aim: mid, sinkRadiusPx: 8 };
  }
  return null;
}

/** The target under the finger: a filled halo and a heavy ring that throbs. */
function SnapHalo({ snap, reducedMotion }: { readonly snap: SnapPreview; readonly reducedMotion: boolean }) {
  return (
    <g className={reducedMotion ? undefined : "push-snap-throb"} data-snap-halo>
      <circle cx={snap.centre.x} cy={snap.centre.y} r={snap.r + 9} fill="var(--bb-primary)" opacity={0.16} />
      <circle cx={snap.centre.x} cy={snap.centre.y} r={snap.r + 7} fill="none" stroke="var(--bb-primary)" strokeWidth={3.5} />
    </g>
  );
}

/**
 * The curved drag: ONE solid headed arrow from the grabbed electrons to the
 * smoothed finger, the same tapered arrow the push commits as, so what the
 * student drags is what they keep. Snapped, it lands on the target instead of
 * the finger. Round two's critic read the old dashed line between a source
 * disc and a cursor ring as "a lasso, not an arrow", and the snapped preview
 * (a dashed line inside a pale ribbon) as unfinished. The head shows while
 * dragging by owner ruling of 30 Sep 2026.
 */
function InFlightCurved({
  from,
  smoothed,
  fallbackTo,
  snap,
  away,
}: {
  readonly from: Point2;
  readonly smoothed: SmoothedArrow | null;
  readonly fallbackTo: Point2;
  readonly snap: SnapPreview | null;
  readonly away: Point2;
}) {
  const tip = smoothed?.tip ?? fallbackTo;
  return snap !== null ? (
    <TaperedArrow from={from} to={snap.aim} away={away} sinkRadiusPx={snap.sinkRadiusPx} glow={false} />
  ) : (
    <TaperedArrow from={from} to={tip} away={away} glow={false} />
  );
}

/**
 * The straight dashed drag: the dashed guide with a head at the finger, or at
 * the landing once snapped. No electron blob rides the tip any more, because
 * on a snap it sat on the target's letter and hid it (round two critic).
 */
function InFlightArrowless({ from, to, snap }: { readonly from: Point2; readonly to: Point2; readonly snap: SnapPreview | null }) {
  return <DashedArrow from={from} to={snap?.landing ?? to} colour="var(--bb-primary)" />;
}
