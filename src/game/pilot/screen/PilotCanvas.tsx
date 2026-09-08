/**
 * The pilot screen's canvas: the molecules, the annotations, the gesture,
 * the records, the replay, and the win's bond change. One SVG, no pan, no
 * zoom, no carry; the pilot's job is the five-piece loop, and every gesture
 * this canvas takes goes straight into the interaction machine.
 *
 * WHAT DRAWS WHAT, mode by mode, per the owner's rules for this screen:
 *
 *   resonance   The record of a committed push is the tapered curved arrow
 *               (pilot/arrow). In flight the drag is the SMOOTHED arc from
 *               pilot/drag/smoothing, drawn with no head, electrons at the
 *               tip; the ribbon with its head appears at the commit, per the
 *               owner ruling the trainer already carries (no head in flight).
 *   reaction    NO arrow glyph at any point. In flight: the bar's dashed
 *               guide from the grabbed electrons to the pointer (capture
 *               x01), Blueberry-styled. A committed push rests as twin
 *               electron dots on the landing plus the forming bond's
 *               segmented stub; the WIN plays the actual bond change.
 *
 * Lone pairs and hydrogens both come from pilot/annotations/placement, one
 * allocation per atom, so nothing here renders bond-side and the hit target
 * for a lone pair is the dot the student can see.
 *
 * THE PATTERN, NAMED: pointer events are adapted to the machine's
 * PointerInput at this boundary (getScreenCTM keeps pixels and hit geometry
 * in one space), exactly as the trainer's DrawCanvas does; the machine owns
 * every decision about what a press means.
 */

import { useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import {
  targetAtomId,
  targetKey,
  type InFlightGuide,
  type InteractionEvent,
  type MechanismDraft,
  type Point2,
  type PointerInput,
  type PointerKind,
} from "@blueberry/interaction";
import type { StepScene, SceneAtom } from "../../render/layout/stepScene";
import type { Vec } from "../../render/layout/vec";
import { AtomSphere, BondCapsule, ChargeBadge, DepthDefs, SHADOW_FILTER_ID } from "../../render/svg/depth";
import { atomRadius, toPx, type DrawTarget } from "../../tabs/trainer/hitLayout";
import { TaperedArrow } from "../arrow/TaperedArrowSvg";
import { createDragSmoother, type DragSmoother, type SmoothedArrow } from "../drag/smoothing";
import { replayArrows, type RecordedStep } from "./screenModel";
import {
  committedArrowGeometry,
  pilotAnchor,
  pilotCentroid,
  type PilotAtomAnnotations,
} from "./pilotLayout";

export type PilotMode = "resonance" | "reaction";

export interface PilotCanvasProps {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  readonly mode: PilotMode;
  readonly draft: MechanismDraft;
  readonly guide: InFlightGuide | null;
  readonly targets: readonly DrawTarget[];
  /** Placement-module annotations for the from state (the drawing surface). */
  readonly annotations: ReadonlyMap<AtomId, PilotAtomAnnotations>;
  /** And for the to state, which is what the win rests on. */
  readonly toAnnotations: ReadonlyMap<AtomId, PilotAtomAnnotations>;
  readonly dispatch: (event: InteractionEvent) => void;
  /** False once the stage is won or a replay is open: render only, take nothing. */
  readonly interactive: boolean;
  /** The win's bond change, 0 while drawing, driven once to 1 on completion. */
  readonly winT: number;
  /** Non-null while the replay is open: the canvas shows the recorded history. */
  readonly replay: { readonly recorded: readonly RecordedStep[]; readonly scrub: number } | null;
  readonly reducedMotion: boolean;
}

const PAD = 64;

/** Expose drop sites for the capture script, same family as __blueberryTargets. */
const EXPOSE_TARGETS = new URLSearchParams(window.location.search).get("targets") === "1";

declare global {
  interface Window {
    __pilotTargets?: readonly DrawTarget[];
  }
}

function pointerKind(type: string): PointerKind {
  return type === "touch" ? "touch" : type === "pen" ? "pen" : "mouse";
}

function smoothstep(a: number, b: number, t: number): number {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: 0 };
}

function mixPx(a: Point2, b: Point2, t: number): Point2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function PilotCanvas({
  step,
  scene,
  mode,
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
}: PilotCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const centroid = useMemo(() => pilotCentroid(scene), [scene]);

  // Replay looks at the from state; the win tween owns t otherwise.
  const t = replay !== null ? 0 : winT;
  const glide = smoothstep(0.15, 0.85, t);

  const posOf = useCallback(
    (atom: SceneAtom): Point2 => toPx(glide <= 0 ? atom.from.pos : lerpVec(atom.from.pos, atom.to.pos, glide)),
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

  const toInput = useCallback((event: ReactPointerEvent<SVGSVGElement>): PointerInput | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const ctm = svg.getScreenCTM();
    if (ctm === null) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {
      pointerId: event.pointerId,
      pointerType: pointerKind(event.pointerType),
      point: { x: point.x, y: point.y },
      timestampMs: event.timeStamp,
      ...(event.pointerType === "pen" ? { pressure: event.pressure } : {}),
      ...(event.pointerType === "mouse" ? { buttonIsPrimary: event.button === 0 || event.buttons === 1 } : {}),
    };
  }, []);

  /* ---------------- the drag smoother (resonance only) ---------------- */

  const smootherRef = useRef<DragSmoother | null>(null);
  const smoothedRef = useRef<SmoothedArrow | null>(null);
  const guideAnchorPx = guide === null ? null : (pilotAnchor(step, scene, annotations, guide.anchor) ?? guide.from);
  const guideKey = guide === null ? null : targetKey(guide.anchor);
  const smootherKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "resonance" || guide === null || guideAnchorPx === null) {
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
  }, [mode, guideKey, guideAnchorPx?.x, guideAnchorPx?.y]);

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
    if (mode === "resonance" && smootherRef.current !== null) {
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
    if (replay !== null) return replayArrows(replay.recorded, replay.scrub);
    return { full: draft.arrows, animating: [] as readonly { readonly arrow: ElectronFlowArrow; readonly t: number }[] };
  }, [replay, draft.arrows]);

  const armedTarget = draft.armed?.target;
  const armedAnchorAtom = guide === null ? null : targetAtomId(guide.anchor);

  const annotationSide: "from" | "to" | "none" =
    replay !== null || t < 0.25 ? "from" : t > 0.75 ? "to" : "none";
  const annotationOpacity =
    annotationSide === "from" ? Math.max(0, 1 - t * 4) : annotationSide === "to" ? Math.min(1, (t - 0.75) * 4) : 0;
  const liveAnnotations = annotationSide === "to" ? toAnnotations : annotations;

  const recordFade = mode === "reaction" ? Math.max(0, 1 - t * 1.6) : 1;

  /* ---------------- render ---------------- */

  return (
    <svg
      ref={svgRef}
      data-pilot-canvas
      viewBox={viewBox}
      role="application"
      aria-label="Draw the electron pushes. Tap an atom to show its lone pairs, tap a lone pair or bond handle to pick the electrons up, then tap or drag to where they go."
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

      {/* Bond end handles: the grab points for bond electrons (capture x02). */}
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
                  r={isArmed ? 8 : 6}
                  fill={isArmed ? "var(--bb-primary)" : "var(--bond-stroke)"}
                  stroke={isArmed ? "var(--bb-primary)" : "none"}
                  strokeWidth={isArmed ? 3 : 0}
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
            const revealed = draft.revealedLonePairs.includes(atom.id);
            return (
              <g key={`ann-${atom.id}`}>
                <PilotHydrogens centre={c} slots={entry.hydrogens} />
                {revealed
                  ? entry.lonePairs.map((slot, slotIndex) => {
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
                        <g key={slotIndex} opacity={dimmed ? 0.3 : 1}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={12}
                            fill={isArmed ? "var(--bb-primary)" : "var(--workbench)"}
                            stroke="var(--bb-primary)"
                            strokeWidth={isArmed ? 2.5 : 1.5}
                            opacity={isArmed ? 0.95 : 0.5}
                          />
                          <circle cx={p.x - ux * 3.2} cy={p.y - uy * 3.2} r={2.4} fill={isArmed ? "#fff" : "var(--bond-stroke)"} />
                          <circle cx={p.x + ux * 3.2} cy={p.y + uy * 3.2} r={2.4} fill={isArmed ? "#fff" : "var(--bond-stroke)"} />
                        </g>
                      );
                    })
                  : null}
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
          <PilotRecord
            key={arrow.id}
            step={step}
            scene={scene}
            annotations={annotations}
            arrow={arrow}
            away={centroid}
            mode={mode}
            t={1}
          />
        ))}
        {shown.animating.map((entry) => (
          <PilotRecord
            key={`anim-${entry.arrow.id}`}
            step={step}
            scene={scene}
            annotations={annotations}
            arrow={entry.arrow}
            away={centroid}
            mode={mode}
            t={entry.t}
          />
        ))}
      </g>

      {/* The gesture in flight. */}
      {interactive && guide !== null && guideAnchorPx !== null ? (
        <g style={{ pointerEvents: "none" }}>
          <SnapRing guide={guide} anchorAtom={armedAnchorAtom} centreOf={centreOf} atomById={atomById} />
          {mode === "resonance" ? (
            <InFlightResonance from={guideAnchorPx} smoothed={smoothedRef.current} fallbackTo={guide.to} />
          ) : (
            <InFlightReaction from={guideAnchorPx} to={guide.to} />
          )}
        </g>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

/** Quiet hydrogen glyphs on the placement ring: a letter over a short tick. */
function PilotHydrogens({ centre, slots }: { readonly centre: Point2; readonly slots: readonly { readonly posPx: Point2; readonly angleSceneRad: number }[] }) {
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
 * One committed push, at replay progress t (1 is fully drawn). Resonance
 * records are the tapered ribbon; reaction records are resting electrons and
 * the forming bond's stub, no arrow glyph anywhere.
 */
function PilotRecord({
  step,
  scene,
  annotations,
  arrow,
  away,
  mode,
  t,
}: {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  readonly annotations: ReadonlyMap<AtomId, PilotAtomAnnotations>;
  readonly arrow: ElectronFlowArrow;
  readonly away: Point2;
  readonly mode: PilotMode;
  readonly t: number;
}) {
  const geometry = committedArrowGeometry(step, scene, annotations, arrow, away);
  const eased = t >= 1 ? 1 : t * (2 - t);
  if (mode === "resonance") {
    if (t >= 1) {
      return (
        <g>
          {geometry.stub !== null ? <BondCapsule a={geometry.stub.a} b={geometry.stub.b} rA={0} rB={0} opacity={0.75} forming /> : null}
          <TaperedArrow from={geometry.from} to={geometry.to} away={away} sinkRadiusPx={geometry.sinkRadiusPx} />
        </g>
      );
    }
    // Growing in under the scrubber: the ribbon reaches toward its landing,
    // profile scaling with the chord, so a young arrow is a small arrow.
    return <TaperedArrow from={geometry.from} to={mixPx(geometry.from, geometry.landing, eased)} away={away} glow={false} />;
  }
  if (t >= 1) {
    return (
      <g>
        {geometry.stub !== null ? <BondCapsule a={geometry.stub.a} b={geometry.stub.b} rA={0} rB={0} opacity={0.75} forming /> : null}
        <circle cx={geometry.landing.x - 3.2} cy={geometry.landing.y} r={2.6} fill="var(--electron-glow)" />
        <circle cx={geometry.landing.x + 3.2} cy={geometry.landing.y} r={2.6} fill="var(--electron-glow)" />
      </g>
    );
  }
  // The scrubber re-performs the gesture: electrons travel the guide line.
  const p = mixPx(geometry.from, geometry.landing, eased);
  return (
    <g>
      <line x1={geometry.from.x} y1={geometry.from.y} x2={p.x} y2={p.y} stroke="var(--bb-primary)" strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" opacity={0.8} />
      <circle cx={p.x} cy={p.y} r={8.5} fill="var(--electron-glow)" opacity={0.85} />
      <circle cx={p.x} cy={p.y} r={5} fill="var(--electron-core)" />
    </g>
  );
}

/** The ring previewing where a release would land, read off the machine's snap. */
function SnapRing({
  guide,
  anchorAtom,
  centreOf,
  atomById,
}: {
  readonly guide: InFlightGuide;
  readonly anchorAtom: AtomId | null;
  readonly centreOf: (id: AtomId) => Point2;
  readonly atomById: ReadonlyMap<AtomId, SceneAtom>;
}) {
  const snapped = guide.snappedTo;
  if (snapped.kind === "empty") return null;
  const snappedAtom = targetAtomId(snapped);
  if (snappedAtom !== null && snappedAtom === anchorAtom) return null;
  if (snapped.kind === "atom" || snapped.kind === "bondEndHandle") {
    const id = snapped.kind === "atom" ? snapped.atomId : snapped.atomId;
    const c = centreOf(id);
    const r = atomRadius(atomById.get(id)?.element ?? "C");
    return <circle cx={c.x} cy={c.y} r={r + 6} fill="none" stroke="var(--bb-primary)" strokeWidth={2.5} opacity={0.8} />;
  }
  if (snapped.kind === "betweenAtomsSite") {
    const a = centreOf(snapped.atomIds[0]);
    const b = centreOf(snapped.atomIds[1]);
    const mid = mixPx(a, b, 0.5);
    return <circle cx={mid.x} cy={mid.y} r={12} fill="none" stroke="var(--bb-primary)" strokeWidth={2.5} opacity={0.8} />;
  }
  return null;
}

/**
 * The resonance drag: the smoothed arc, no head (a sphere has no orientation
 * to get wrong, the ruling the trainer records), electrons riding the tip.
 */
function InFlightResonance({
  from,
  smoothed,
  fallbackTo,
}: {
  readonly from: Point2;
  readonly smoothed: SmoothedArrow | null;
  readonly fallbackTo: Point2;
}) {
  const tip = smoothed?.tip ?? fallbackTo;
  const control = smoothed?.control ?? mixPx(from, tip, 0.5);
  const d = `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${tip.x} ${tip.y}`;
  return (
    <g>
      {/* The casing blends into the surface behind, which is the workbench now, not --bb-card. */}
      <path d={d} fill="none" stroke="var(--workbench)" strokeWidth={8} strokeLinecap="round" opacity={0.9} />
      <path d={d} fill="none" stroke="var(--bb-primary)" strokeWidth={3.5} strokeDasharray="7 6" strokeLinecap="round" />
      <circle cx={tip.x} cy={tip.y} r={13} fill="var(--electron-glow)" opacity={0.55} />
      <circle cx={tip.x} cy={tip.y} r={8.5} fill="var(--electron-glow)" opacity={0.85} />
      <circle cx={tip.x} cy={tip.y} r={5} fill="var(--electron-core)" />
      <circle cx={from.x} cy={from.y} r={3} fill="var(--bb-primary)" />
    </g>
  );
}

/** The reaction drag: the bar's straight dashed guide, electrons at the finger. */
function InFlightReaction({ from, to }: { readonly from: Point2; readonly to: Point2 }) {
  return (
    <g>
      {/* Casing blends into the workbench, same as InFlightResonance: on the
          white bench a cream casing read as a faint warm halo (rejudge note). */}
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--workbench)" strokeWidth={8} strokeLinecap="round" opacity={0.9} />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--bb-primary)" strokeWidth={3.5} strokeDasharray="7 6" strokeLinecap="round" />
      <circle cx={to.x} cy={to.y} r={13} fill="var(--electron-glow)" opacity={0.55} />
      <circle cx={to.x} cy={to.y} r={8.5} fill="var(--electron-glow)" opacity={0.85} />
      <circle cx={to.x} cy={to.y} r={5} fill="var(--electron-core)" />
      <circle cx={from.x} cy={from.y} r={3} fill="var(--bb-primary)" />
    </g>
  );
}
