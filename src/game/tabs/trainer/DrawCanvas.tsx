/**
 * The interactive canvas: the step's `from` state with the student's arrows
 * over it, fed by pointer events into the interaction store.
 *
 * Why this is not MoleculeSvg with extra props: MoleculeSvg is one of two
 * implementations of the renderer contract (2D and 3D), and that contract is
 * a pure projection of a precomputed scene plus a progress number. Teaching
 * it about armed sources, in flight guides and bond handles would push the
 * same props into the 3D renderer, where they mean nothing. So the draw mode
 * is its own SVG that shares the scene, the pixel scale, the element colours
 * and the depth glyphs (render/svg/depth.tsx), and the playback after a
 * correct answer hands off to MoleculeSvg.
 *
 * Pointer plumbing, the one place DOM types appear: a PointerEvent becomes a
 * PointerInput at this boundary. Coordinates go through the SVG's screen CTM
 * so the point is in the same pixel space the targets were computed in,
 * whatever size the canvas renders at. touch-action: none is palm rejection
 * for pen and lets a drag start without the page scrolling. setPointerCapture
 * keeps move and up events coming after the pointer leaves the SVG.
 *
 * MOVING A MOLECULE. The interaction machine has no movement threshold on
 * purpose (machine.ts, "why movement distance is not used to classify
 * anything"), so picking a species up and carrying it cannot be one of its
 * rules. It is this file's: a press the hit tester resolves to an atom BODY,
 * while nothing is armed, is a drag candidate. Once the pointer travels past
 * DRAG_START_PX the canvas owns the gesture: the species offset follows the
 * pointer and the machine is sent nothing until release, when it receives a
 * pointerUp at the original press point so R2 sees a plain tap and the
 * session closes. The press itself still went to the machine at pointer down
 * (R1 revealed the lone pairs, which is the acknowledgement), so a carry is
 * a tap with a journey in the middle, exactly the shape the machine expects.
 *
 * The attachments lag. Atoms move with the pointer; the bonds, hydrogen arcs
 * and lone pair dots of that species sit in a second group whose transform
 * has a 120 ms overshoot transition. Every move retargets it, so they trail
 * and then settle when the hand stops. Transform only, so the compositor
 * does the work; reduced motion drops the transition and they move as one.
 *
 * Lone pairs render for revealed atoms (tap an atom to reveal, which is the
 * machine's rule, not this file's), bond end handles render on every bond,
 * and between-atom sites render only while a source is armed.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { inferSink, targetAtomId, type ArmedElectronSource, type HitTarget, type InFlightGuide, type InteractionEvent, type MechanismDraft, type PointerInput, type PointerKind, type Point2 } from "@blueberry/interaction";
import type { StepScene } from "../../render/layout/stepScene";
import { AtomSphere, BondCapsule, ChargeBadge, DepthDefs, HydrogenArc, hydrogenDirections, sphereGradientId, SHADOW_FILTER_ID } from "../../render/svg/depth";
import {
  atomCentre,
  atomRadius,
  bondIdFor,
  bondMidpoint,
  bowAwayFrom,
  landingOnRim,
  createHitTester,
  lonePairSlots,
  mix,
  nearestLonePairSlot,
  rimPoint,
  sceneCentroid,
  speciesOf,
  targetAnchor,
  toPx,
  applyAtomOrbits,
  resettleOpenAngles,
  orbitPoint,
  terminalNeighbor,
  type AtomOrbits,
  type DrawTarget,
  type SpeciesOffsets,
} from "./hitLayout";

/** Pixels of travel before a press on an atom body becomes a carry. */
const DRAG_START_PX = 6;

export type FailureAnimation =
  | { readonly kind: "snapBack"; readonly key: number }
  | { readonly kind: "wobble"; readonly atomIds: readonly AtomId[]; readonly key: number }
  | null;

export interface DrawCanvasProps {
  readonly step: MechanismStep;
  /**
   * The last rejected arrow, HELD on the canvas in warning colour until the
   * student touches the canvas again. A blind critic caught the alternative:
   * the machine's undo erased the wrong arrow before the card could be read,
   * so the canvas showed nothing wrong while the words described a mistake,
   * and "the failure moment shows no failure". The draft no longer contains
   * this arrow; it is drawn from this prop alone.
   */
  readonly rejected: { readonly arrow: ElectronFlowArrow; readonly key: number } | null;
  /**
   * Sequences run without arrow glyphs, owner spec 2026-08-26: the electron
   * gesture carries the drawing, and a committed arrow renders as its
   * forming-bond stub plus a resting electron pair at the landing, never a
   * curve with a head.
   */
  readonly arrowless?: boolean;
  /** Bumped by the shell's Re-centre control; the canvas refits its view. */
  readonly recenterSignal?: number;
  /** The resonance hunt is where the arrows LIVE: force the arrow primitive. */
  readonly forceArrows?: boolean;
  /** The authored scene. Frames the view box so the canvas never chases a drag. */
  readonly scene: StepScene;
  /** The live scene: authored positions plus where each species was carried. Everything draws from this. */
  readonly live: StepScene;
  readonly offsets: SpeciesOffsets;
  readonly onSpeciesMove: (speciesId: string, offset: Point2) => void;
  readonly orbits: AtomOrbits;
  /** The orbit drag's write path: an absolute px offset for one atom. */
  readonly onAtomOrbit: (atomId: AtomId, offset: Point2) => void;
  readonly draft: MechanismDraft;
  readonly guide: InFlightGuide | null;
  readonly targets: readonly DrawTarget[];
  readonly dispatch: (event: InteractionEvent) => void;
  readonly failure: FailureAnimation;
  readonly reducedMotion: boolean;
}

/**
 * The bar's rejection mark: a rounded equilateral triangle, yellow, with a bold
 * exclamation, sitting on the atom that refused the electrons. Drawn inline
 * rather than in depth.tsx because it is trainer feedback, not scene depth:
 * the 2D and 3D renderers never show one.
 */
function WarningTriangle({ at }: { readonly at: Point2 }) {
  const R = 13;
  const points = [0, 1, 2]
    .map((i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      return `${at.x + R * Math.cos(angle)},${at.y + R * Math.sin(angle)}`;
    })
    .join(" ");
  return (
    <g className="fade-in" style={{ pointerEvents: "none" }}>
      <polygon points={points} fill="var(--warn-soft-solid)" stroke="var(--warn)" strokeWidth={3} strokeLinejoin="round" />
      <line x1={at.x} y1={at.y - 4.5} x2={at.x} y2={at.y + 1.5} stroke="var(--warn-ink-strong)" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={at.x} cy={at.y + 5.2} r={1.5} fill="var(--warn-ink-strong)" />
    </g>
  );
}

/**
 * The Alchemie reveal, owner spec 2026-08-26: tap a carbon and its hydrogens
 * appear FROM it, bonds extending out "and almost grab the hydrogens". Real
 * small spheres on real rods, launched from the atom centre on a spring, the
 * rod fading in as it stretches. Positions come from the same distribution
 * the resting glyphs use, so nothing jumps when the reveal closes.
 */
function HydrogenReveal({ centre, r, count, bondAngles, openAngle, reducedMotion }: { readonly centre: Point2; readonly r: number; readonly count: number; readonly bondAngles: readonly number[]; readonly openAngle: number; readonly reducedMotion: boolean }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOut(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const reach = r + 30;
  const hr = 11;
  return (
    <g>
      {hydrogenDirections(count, bondAngles, openAngle).map((angle, index) => {
        const hx = centre.x + reach * Math.cos(angle);
        const hy = centre.y + reach * Math.sin(angle);
        const rimX = centre.x + (r - 1) * Math.cos(angle);
        const rimY = centre.y + (r - 1) * Math.sin(angle);
        const shown = out || reducedMotion;
        return (
          <g key={index}>
            <line
              x1={rimX}
              y1={rimY}
              x2={hx - hr * Math.cos(angle)}
              y2={hy - hr * Math.sin(angle)}
              stroke="var(--bond-stroke)"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={shown ? 0.9 : 0}
              style={{ transition: reducedMotion ? "none" : "opacity 200ms ease-out 90ms" }}
            />
            <g
              style={{
                transform: shown ? "translate(0px, 0px)" : `translate(${centre.x - hx}px, ${centre.y - hy}px)`,
                transition: reducedMotion ? "none" : "transform 300ms cubic-bezier(0.2, 0.8, 0.3, 1.25)",
              }}
            >
              <circle cx={hx} cy={hy} r={hr} fill={`url(#${sphereGradientId("H")})`} stroke="#0f172a" strokeOpacity={0.18} strokeWidth={1} />
              <text x={hx} y={hy} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#334155">
                H
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

function pointerKind(type: string): PointerKind {
  if (type === "pen") return "pen";
  if (type === "touch") return "touch";
  return "mouse";
}

function sameTargetLoose(a: HitTarget, b: HitTarget | undefined): boolean {
  if (b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** How far a curve's control point sits off its chord, in px. */
const BOW_PX = 34;
/**
 * Clearance between an arrowhead and the surface it points at.
 *
 * The head is a marker 7 units wide on a 3px stroke, so it occupies roughly
 * 20px along the path BEHIND its tip. A 3px gap therefore seated the tip just
 * off the sphere while the body of the triangle lay across the element letter,
 * which a blind critic read as the destination atom being hidden by the very
 * mark meant to point at it. The gap is the whole head plus air.
 */
const LAND_GAP = 16;
/** How far the armed lone pair dots glide toward the pointer, at most. */
const LP_GLIDE_PX = 7;

/**
 * A sink resolved to geometry. An atom sink lands on that atom's SURFACE, on
 * the side the curve arrives from. A between-atoms sink is a forming bond: a
 * dashed stub between the two atom surfaces, and the arrow lands on its middle.
 * `ring` is where a drop-site highlight is drawn and how big.
 */
interface SinkGeometry {
  readonly landing: Point2;
  readonly stub: { readonly a: Point2; readonly b: Point2 } | null;
  readonly ring: { readonly centre: Point2; readonly r: number };
}

/**
 * Directions of every bond leaving an atom, forming bonds included, in scene
 * radians (y up, as atom positions are stored). HydrogenArc distributes the
 * implicit hydrogens in the gaps between these, the way the bar's videos
 * place them. Forming bonds count: a nucleophile's corridor is a direction
 * hydrogens must clear, which is what the old reaction-centre quarter-turn
 * approximated with a hardcoded rotation.
 */
function bondAnglesAt(scene: StepScene, atomId: AtomId): number[] {
  const here = scene.atoms.find((atom) => atom.id === atomId);
  if (here === undefined) return [];
  const angles: number[] = [];
  for (const bond of scene.bonds) {
    if (bond.a !== atomId && bond.b !== atomId) continue;
    const otherId = bond.a === atomId ? bond.b : bond.a;
    const other = scene.atoms.find((atom) => atom.id === otherId);
    if (other === undefined) continue;
    angles.push(Math.atan2(other.from.pos.y - here.from.pos.y, other.from.pos.x - here.from.pos.x));
  }
  return angles;
}


/**
 * Which in flight primitive to draw. Round 8 of the trainer gauntlet is a blind
 * A/B, so both have to be reachable from one build.
 *
 * "electron" is the shipped default per the owner ruling of 2026-08-25: the
 * electrons ride the tether as a lit sphere, and the arrowhead appears only on
 * the committed arrow. `?primitive=arrow` restores the round 1 to 7 behaviour so
 * a critic can be handed both captures with the labels stripped.
 *
 * Read once at module scope rather than from a hook: it never changes within a
 * session, and a prop would have to be threaded through four components that
 * have no other reason to know about it.
 */
const PRIMITIVE: "electron" | "arrow" =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("primitive") === "arrow"
    ? "arrow"
    : "electron";

function elementRadius(scene: StepScene, atomId: AtomId): number {
  return atomRadius(scene.atoms.find((atom) => atom.id === atomId)?.element ?? "C");
}

function atomSinkGeometry(scene: StepScene, atomId: AtomId, from: Point2, centroid: Point2): SinkGeometry {
  const centre = atomCentre(scene, atomId);
  const r = elementRadius(scene, atomId);
  return { landing: landingOnRim(centre, r, from, centroid, LAND_GAP), stub: null, ring: { centre, r: r + 7 } };
}

/**
 * A forming bond as a sink. The arrow lands OFF the bond axis, on the side the
 * electrons arrive from, not on the axis itself.
 *
 * Landing on the midpoint put the arrowhead on the same line as the rod that
 * is forming there, so the head had to arrive along that line and a blind
 * critic read the whole gesture as running backwards, out of the bond and into
 * the nucleophile. Offsetting the landing perpendicular gives the head a
 * direction that points AT the new bond from outside it, which is how the
 * notation is drawn on paper, and it keeps the arrow clear of the rod.
 */
function bondSinkGeometry(scene: StepScene, atomIds: readonly [AtomId, AtomId], from?: Point2): SinkGeometry {
  const ca = atomCentre(scene, atomIds[0]);
  const cb = atomCentre(scene, atomIds[1]);
  const a = rimPoint(ca, cb, elementRadius(scene, atomIds[0]) + 1);
  const b = rimPoint(cb, ca, elementRadius(scene, atomIds[1]) + 1);
  const mid = mix(a, b, 0.5);
  // The arrow points at the ATOM BEING ATTACKED, not at the midpoint of the
  // bond that will form there. Formally the electrons end up in the middle of
  // the new bond, and that is what the earlier version drew; but every
  // textbook, and the owner's own course keys, draw the nucleophile's arrow
  // landing on the electrophilic atom, and a head parked in the empty space
  // between two atoms reads as an arrow that stopped short. Which atom: the
  // one further from the source, because the near one is where the electrons
  // are leaving from.
  const far = from === undefined
    ? atomIds[1]
    : Math.hypot(ca.x - from.x, ca.y - from.y) >= Math.hypot(cb.x - from.x, cb.y - from.y)
      ? atomIds[0]
      : atomIds[1];
  const farCentre = atomCentre(scene, far);
  const source = from ?? mid;
  // Same rule as an atom sink: a source close to the far atom would otherwise
  // land on top of itself. Inert where there is already room, which is every
  // nucleophile arrow in the corpus today.
  const landing = landingOnRim(farCentre, elementRadius(scene, far), source, sceneCentroid(scene), LAND_GAP);
  return { landing, stub: { a, b }, ring: { centre: farCentre, r: elementRadius(scene, far) + 7 } };
}

/** Committed arrow: source anchor from the slot or bond it left, sink per the rules above. */
function committedArrowGeometry(step: MechanismStep, scene: StepScene, arrow: ElectronFlowArrow, centroid: Point2): { from: Point2; sink: SinkGeometry } {
  const sinkCentre =
    arrow.sink.kind === "atom"
      ? atomCentre(scene, arrow.sink.atomId)
      : mix(atomCentre(scene, arrow.sink.atomIds[0]), atomCentre(scene, arrow.sink.atomIds[1]), 0.5);
  let from: Point2;
  switch (arrow.source.kind) {
    case "lonePair":
    case "singleElectron":
      // The committed arrow does not remember which slot was tapped; the slot
      // facing the sink is the one the electrons left from.
      from = nearestLonePairSlot(scene, arrow.source.atomId, sinkCentre);
      break;
    case "bond":
      from = bondMidpoint(step, scene, arrow.source.bondId) ?? sinkCentre;
      break;
    default: {
      const unreachable: never = arrow.source;
      from = unreachable;
    }
  }
  const sink = arrow.sink.kind === "atom" ? atomSinkGeometry(scene, arrow.sink.atomId, from, centroid) : bondSinkGeometry(scene, arrow.sink.atomIds, from);
  return { from, sink };
}

/** The atom a committed arrow's electrons leave from: the lone pair's atom, or the first atom of the bond. */
function sourceAtomId(step: MechanismStep, arrow: ElectronFlowArrow): AtomId | null {
  if (arrow.source.kind !== "bond") return arrow.source.atomId;
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) if (bond.id === arrow.source.bondId) return bond.a;
  }
  return null;
}

function curveAway(from: Point2, to: Point2, centroid: Point2): string {
  const ctrl = bowAwayFrom(from, to, centroid, BOW_PX);
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
}

/**
 * The in flight guide, resolved: where it starts, where it ends, and what it
 * would land on. The landing is whatever the machine's own inference says a
 * release on `snappedTo` would make (a lone pair dropped on an atom forms a
 * bond to it, so the arrow lands on the forming bond's stub, not the atom's
 * centre), so the preview and the committed arrow cannot disagree. `hovered`
 * is the atom under the pointer, for a halo, when the landing is not on it.
 */
function guideGeometry(step: MechanismStep, scene: StepScene, guide: InFlightGuide, armed: ArmedElectronSource | null, centroid: Point2): { from: Point2; to: Point2; sink: SinkGeometry | null; hovered: AtomId | null; away: Point2 } {
  const from = targetAnchor(step, scene, guide.anchor) ?? guide.from;
  const snapped = guide.snappedTo;
  const overOwnSource = sameTargetLoose(snapped, guide.anchor) || (snapped.kind !== "empty" && targetAtomId(snapped) !== null && targetAtomId(snapped) === targetAtomId(guide.anchor));
  const inferred = armed === null || overOwnSource ? null : inferSink(armed, snapped, step.from);
  if (inferred !== null && inferred.ok) {
    const hovered = snapped.kind === "atom" ? snapped.atomId : null;
    if (inferred.sink.kind === "atom") {
      const sink = atomSinkGeometry(scene, inferred.sink.atomId, from, centroid);
      return { from, to: sink.landing, sink, hovered: null, away: centroid };
    }
    const sink = bondSinkGeometry(scene, inferred.sink.atomIds, from);
    return { from, to: sink.landing, sink, hovered, away: centroid };
  }
  // Over nothing the machine would accept: the head rides the finger, per x01.
  return { from, to: guide.to, sink: null, hovered: null, away: centroid };
}

/**
 * The bond that stretches while you drag, per docs/reference/alchemie/extra/x02.
 *
 * Two cases, one shape. Pulling a bond's end handle stretches THAT bond: the
 * end you did not grab stays put on its atom and the other end follows the
 * finger. Pulling a lone pair stretches the bond you are ABOUT to make: it
 * reaches out of the atom the electrons are leaving. Either way a student sees
 * a physical thing being pulled rather than a line being specified, which is
 * the whole difference between this and a diagram.
 *
 * Returns null when the gesture is not one that stretches a bond.
 */
interface Stretch {
  readonly from: Point2;
  readonly to: Point2;
  readonly rFrom: number;
  /** Radius to inset the far end by: the receiving atom's, or 0 at a free pointer. */
  readonly toRadius: number;
  /** True while the release would land somewhere the machine accepts. */
  readonly landing: boolean;
  /** A bond being pulled apart, rather than one being formed. */
  readonly existing: boolean;
}

function stretchGeometry(step: MechanismStep, scene: StepScene, guide: InFlightGuide, sink: SinkGeometry | null, sinkAtom: AtomId | null): Stretch | null {
  const anchor = guide.anchor;
  // ZERO, always. `head` below is already a point ON a surface: a bond sink
  // gives the far atom's rim, an atom sink gives its rim plus the land gap.
  // Passing the atom's radius as well inset the rod a second time and left it
  // stopping a whole radius short of the atom it was supposed to attach to.
  void sinkAtom;
  const toRadius = 0;
  // NO ROD UNLESS IT LANDS ON AN ATOM. A bond is a claim that two atoms are
  // joined, so a rod whose far end floats in the canvas is a claim about
  // nothing; a blind critic called it exactly that, a capsule terminating in
  // empty space. While the pointer is over nothing the machine would accept,
  // the dashed guide alone carries the gesture and no bond is asserted.
  if (sink === null) return null;
  // The rod reaches the far ATOM, not the arrow's landing point. The arrow
  // lands in the middle of the bond it forms, which is where the electrons go;
  // the bond itself spans the whole gap and attaches.
  const head = sink.stub?.b ?? sink.landing;

  if (anchor.kind === "bondEndHandle") {
    for (const bond of scene.bonds) {
      if (bondIdFor(step, bond.a, bond.b) !== anchor.bondId) continue;
      // The end that stays is the one you did not grab.
      const anchoredAt = bond.a === anchor.atomId ? bond.b : bond.a;
      return {
        from: atomCentre(scene, anchoredAt),
        to: head,
        rFrom: elementRadius(scene, anchoredAt),
        toRadius,
        landing: sink !== null,
        existing: true,
      };
    }
    return null;
  }

  if (anchor.kind === "lonePair" || anchor.kind === "unpairedElectron") {
    return {
      from: atomCentre(scene, anchor.atomId),
      to: head,
      rFrom: elementRadius(scene, anchor.atomId),
      toRadius,
      landing: sink !== null,
      existing: false,
    };
  }

  return null;
}

interface Carry {
  readonly pointerId: number;
  readonly kind: "species" | "orbit";
  readonly speciesId: string;
  /** Orbit only: the atom being swung and the neighbour it swings around. */
  readonly atomId: AtomId | null;
  readonly neighbourId: AtomId | null;
  /** Orbit only: the bond's px radius at press time, held constant for the drag. */
  readonly radiusPx: number;
  /** Orbit only: where the atom would sit with NO orbit offset, so offset = constrained - base. */
  readonly basePx: Point2;
  readonly down: PointerInput;
  readonly startOffset: Point2;
  /** False until the pointer has travelled DRAG_START_PX; until then the machine still owns the press. */
  active: boolean;
}

export function DrawCanvas({ step, scene, live, offsets, onSpeciesMove, orbits, onAtomOrbit, draft, guide, targets, dispatch, failure, reducedMotion, rejected, arrowless = false, forceArrows = false, recenterSignal = 0 }: DrawCanvasProps) {
  const primitive: "electron" | "arrow" = arrowless ? "electron" : forceArrows ? "arrow" : PRIMITIVE;
  const svgRef = useRef<SVGSVGElement>(null);
  const carryRef = useRef<Carry | null>(null);
  const panRef = useRef<{ pointerId: number; clientX: number; clientY: number; cx: number; cy: number; scale: number; down: PointerInput; active: boolean } | null>(null);
  /**
   * The active orbit, mirrored into state so it can RENDER. A video-frame
   * critic put it plainly: the one frame whose whole job is "pointer held"
   * showed nothing kinetic, so the swing read as three separate static
   * molecules. While this is set the canvas draws the circle the atom rides
   * (dashed, the path that exists only during the hold) and a halo on the
   * swung atom. The ref stays the gesture's source of truth; this is display.
   */
  const [activeOrbit, setActiveOrbit] = useState<{ readonly atomId: AtomId; readonly neighbourId: AtomId; readonly radiusPx: number } | null>(null);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  // The same hit tester the machine uses, over the same live targets, so the
  // canvas and the machine agree about what "on an atom body" means.
  const hitTester = useMemo(() => createHitTester(() => targetsRef.current), []);
  const owner = useMemo(() => speciesOf(step), [step]);

  /**
   * What the species render blocks draw from: the authored scene with the
   * ORBITS applied and open angles re-settled, and nothing else. Species
   * carry offsets are deliberately absent, because those blocks sit inside
   * per-species groups whose CSS transform already applies them; adding the
   * offset to the coordinates too would shift a carried molecule twice.
   *
   * This exists because the first orbit capture proved the render was blind
   * to orbits: targets and bonds read `live` while the spheres read the
   * authored scene, so the hydrogen's hit circle swung around the oxygen and
   * the hydrogen itself stayed put, leaving two ball joints floating where
   * the bond thought its atom was.
   */
  const drawScene = useMemo(() => resettleOpenAngles(applyAtomOrbits(scene, orbits)), [scene, orbits]);

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

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (released before this ran, or not a
      // pointer the browser is tracking). Capture is a nicety; the press is not.
    }
    if (carryRef.current === null && panRef.current === null && draft.armed === null) {
      const hit = hitTester.hitTest({ point: pointer.point, pointerType: pointer.pointerType, armedSource: null });
      if (hit.primary.kind === "empty") {
        // Dragging the SCREEN, not a molecule: pan the window. Client px are
        // the stable frame here, because the viewBox itself moves under the
        // gesture; scene units per client px is fixed at press time.
        const svg = svgRef.current;
        const rect = svg?.getBoundingClientRect();
        if (rect !== undefined && rect.width > 0) {
          panRef.current = {
            pointerId: pointer.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            cx: zcx,
            cy: zcy,
            scale: zw / rect.width,
            down: pointer,
            active: false,
          };
        }
      } else if (hit.primary.kind === "atom") {
        const speciesId = owner.get(hit.primary.atomId);
        if (speciesId !== undefined) {
          // A terminal atom SWINGS around its one neighbour, per the Alchemie
          // videos: drag the hydrogen and it circles the oxygen, bond
          // following, the rest of the molecule staying put. Everything else
          // carries the whole species, exactly as before. The radius is taken
          // at press time and held, so the bond cannot creep during the drag.
          const neighbourId = terminalNeighbor(step, hit.primary.atomId);
          if (neighbourId !== null) {
            const atomPx = atomCentre(live, hit.primary.atomId);
            const neighbourPx = atomCentre(live, neighbourId);
            const currentOrbit = orbits[hit.primary.atomId] ?? { x: 0, y: 0 };
            carryRef.current = {
              pointerId: pointer.pointerId,
              kind: "orbit",
              speciesId,
              atomId: hit.primary.atomId,
              neighbourId,
              radiusPx: Math.hypot(atomPx.x - neighbourPx.x, atomPx.y - neighbourPx.y),
              basePx: { x: atomPx.x - currentOrbit.x, y: atomPx.y - currentOrbit.y },
              down: pointer,
              startOffset: currentOrbit,
              active: false,
            };
          } else {
            carryRef.current = {
              pointerId: pointer.pointerId,
              kind: "species",
              speciesId,
              atomId: null,
              neighbourId: null,
              radiusPx: 0,
              basePx: { x: 0, y: 0 },
              down: pointer,
              startOffset: offsets[speciesId] ?? { x: 0, y: 0 },
              active: false,
            };
          }
        }
      }
    }
    dispatch({ kind: "pointerDown", pointer });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    const pan = panRef.current;
    if (pan !== null && pan.pointerId === pointer.pointerId) {
      const dx = event.clientX - pan.clientX;
      const dy = event.clientY - pan.clientY;
      if (!pan.active && Math.hypot(dx, dy) > DRAG_START_PX) pan.active = true;
      if (pan.active) {
        setZoom((prev) => ({ k: prev.k, cx: pan.cx - dx * pan.scale, cy: pan.cy - dy * pan.scale }));
        return;
      }
    }
    const carry = carryRef.current;
    if (carry !== null && carry.pointerId === pointer.pointerId) {
      const dx = pointer.point.x - carry.down.point.x;
      const dy = pointer.point.y - carry.down.point.y;
      if (!carry.active && Math.hypot(dx, dy) > DRAG_START_PX) {
        carry.active = true;
        if (carry.kind === "orbit" && carry.atomId !== null && carry.neighbourId !== null) {
          setActiveOrbit({ atomId: carry.atomId, neighbourId: carry.neighbourId, radiusPx: carry.radiusPx });
        }
      }
      if (carry.active) {
        if (carry.kind === "orbit" && carry.atomId !== null && carry.neighbourId !== null) {
          // The neighbour is read LIVE, not from press time: if the molecule
          // itself was carried earlier the circle's centre moved with it.
          const neighbourPx = atomCentre(live, carry.neighbourId);
          const constrained = orbitPoint(neighbourPx, carry.radiusPx, pointer.point);
          onAtomOrbit(carry.atomId, { x: constrained.x - carry.basePx.x, y: constrained.y - carry.basePx.y });
        } else {
          onSpeciesMove(carry.speciesId, clampToFrame(carry.speciesId, { x: carry.startOffset.x + dx, y: carry.startOffset.y + dy }));
        }
        return;
      }
    }
    dispatch({ kind: "pointerMove", pointer });
  };

  /**
   * The swung atom RETURNS on release. Owner ruling, 2026-08-26: "the
   * orientation of the atoms around a molecule should wiggle around as I
   * drag it but go back to its stereochemical position." The orbit was
   * persistent before this; now it is a wiggle, and the return is a damped
   * spring rather than a snap, because the hand just gave the atom energy
   * and matter settles, it does not teleport. Reduced motion snaps.
   */
  const springRef = useRef<number | null>(null);
  const springBack = useCallback(
    (atomId: AtomId, from: Point2) => {
      if (springRef.current !== null) cancelAnimationFrame(springRef.current);
      if (reducedMotion) {
        onAtomOrbit(atomId, { x: 0, y: 0 });
        return;
      }
      const startedAt = performance.now();
      const DURATION = 420;
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / DURATION);
        // Damped oscillation: two visible wobbles, then home.
        const envelope = Math.exp(-4.2 * t) * Math.cos(9 * t);
        if (t >= 1) {
          onAtomOrbit(atomId, { x: 0, y: 0 });
          springRef.current = null;
          return;
        }
        onAtomOrbit(atomId, { x: from.x * envelope, y: from.y * envelope });
        springRef.current = requestAnimationFrame(tick);
      };
      springRef.current = requestAnimationFrame(tick);
    },
    [onAtomOrbit, reducedMotion],
  );

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    const pan = panRef.current;
    if (pan !== null && pan.pointerId === pointer.pointerId) {
      panRef.current = null;
      if (pan.active) {
        // The pan was the canvas's; the machine sees a plain tap at the press.
        dispatch({ kind: "pointerUp", pointer: { ...pointer, point: pan.down.point } });
        return;
      }
    }
    const carry = carryRef.current;
    if (carry !== null && carry.pointerId === pointer.pointerId) {
      carryRef.current = null;
      setActiveOrbit(null);
      if (carry.kind === "orbit" && carry.active && carry.atomId !== null) {
        springBack(carry.atomId, orbits[carry.atomId] ?? { x: 0, y: 0 });
      }
      if (carry.active) {
        // The carry was the canvas's; the machine sees a tap where the press landed.
        dispatch({ kind: "pointerUp", pointer: { ...pointer, point: carry.down.point } });
        return;
      }
    }
    dispatch({ kind: "pointerUp", pointer });
  };

  const onPointerCancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    if (panRef.current?.pointerId === pointer.pointerId) panRef.current = null;
    if (carryRef.current?.pointerId === pointer.pointerId) {
      carryRef.current = null;
      setActiveOrbit(null);
    }
    dispatch({ kind: "pointerCancel", pointer });
  };

  /**
   * ZOOM, owner request 2026-08-26: "you can zoom out on the whole thing",
   * bounded rather than infinite. Implemented on the viewBox, not on a
   * transform group: getScreenCTM already maps pointer to scene coordinates
   * through the viewBox, so scaling the viewBox zooms hit testing, targets
   * and rendering together with zero further changes. Wheel zooms toward the
   * cursor; the buttons in the corner serve touch; reset refits.
   */
  const [zoom, setZoom] = useState<{ readonly k: number; readonly cx: number | null; readonly cy: number | null }>({ k: 1, cx: null, cy: null });
  useEffect(() => {
    if (recenterSignal > 0) setZoom({ k: 1, cx: null, cy: null });
  }, [recenterSignal]);

  // View box from the AUTHORED from positions, same padding as MoleculeSvg.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const atom of scene.atoms) {
    const q = toPx(atom.from.pos);
    minX = Math.min(minX, q.x);
    maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y);
    maxY = Math.max(maxY, q.y);
  }
  const PAD = 64;
  const baseX = minX - PAD;
  const baseY = minY - PAD;
  const baseW = maxX - minX + 2 * PAD;
  const baseH = maxY - minY + 2 * PAD;
  // The zoomed window: k > 1 is closer, k < 1 is the whole thing plus air.
  const zw = baseW / zoom.k;
  const zh = baseH / zoom.k;
  const zcx = zoom.cx ?? baseX + baseW / 2;
  const zcy = zoom.cy ?? baseY + baseH / 2;
  const viewBox = `${zcx - zw / 2} ${zcy - zh / 2} ${zw} ${zh}`;

  const zoomBy = (factor: number, focal?: Point2) => {
    setZoom((prev) => {
      const k = Math.min(3, Math.max(0.45, prev.k * factor));
      if (k === prev.k) return prev;
      const cx = prev.cx ?? baseX + baseW / 2;
      const cy = prev.cy ?? baseY + baseH / 2;
      if (focal === undefined) return { k, cx, cy };
      // Keep the focal scene point fixed under the cursor across the zoom.
      const ratio = prev.k / k;
      return { k, cx: focal.x + (cx - focal.x) * ratio, cy: focal.y + (cy - focal.y) * ratio };
    });
  };

  const onWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg === null) return;
    const ctm = svg.getScreenCTM();
    if (ctm === null) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    zoomBy(Math.exp(-event.deltaY * 0.0016), { x: point.x, y: point.y });
  };

  // A carried species stays inside the frame. The frame does not follow the
  // molecule (that would cancel the drag visually), so the offset is clamped
  // to keep every atom of the species at least an atom's width from the edge.
  const clampToFrame = (speciesId: string, offset: Point2): Point2 => {
    const MARGIN = 30;
    let lo = { x: -Infinity, y: -Infinity };
    let hi = { x: Infinity, y: Infinity };
    for (const atom of scene.atoms) {
      if (owner.get(atom.id) !== speciesId) continue;
      const c = toPx(atom.from.pos);
      lo = { x: Math.max(lo.x, minX - PAD + MARGIN - c.x), y: Math.max(lo.y, minY - PAD + MARGIN - c.y) };
      hi = { x: Math.min(hi.x, maxX + PAD - MARGIN - c.x), y: Math.min(hi.y, maxY + PAD - MARGIN - c.y) };
    }
    return { x: Math.min(hi.x, Math.max(lo.x, offset.x)), y: Math.min(hi.y, Math.max(lo.y, offset.y)) };
  };

  const armedTarget = draft.armed?.target;
  const wobbling = failure?.kind === "wobble" ? new Set(failure.atomIds) : new Set<AtomId>();
  const snapping = failure?.kind === "snapBack";

  // Arrow geometry from the LIVE scene, because arrows span species and must
  // follow a carried molecule. A curve bows away from the centroid of the
  // species its electrons LEAVE, so it arcs outward from that molecule rather
  // than across it; the whole scene's centroid is the fallback when the source
  // atom is unknown.
  const awayFrom = (atomId: AtomId | null): Point2 => {
    const speciesId = atomId === null ? undefined : owner.get(atomId);
    if (speciesId === undefined) return sceneCentroid(live);
    return sceneCentroid({ ...live, atoms: live.atoms.filter((atom) => owner.get(atom.id) === speciesId) });
  };
  const inFlight = guide === null ? null : guideGeometry(step, live, guide, draft.armed, awayFrom(targetAtomId(guide.anchor)));
  const sinkAtomForStretch =
    inFlight === null || inFlight.sink === null
      ? null
      : inFlight.sink.stub !== null && guide !== null
        ? (() => {
            const snapped = guide.snappedTo;
            return snapped.kind === "atom" ? snapped.atomId : (targetAtomId(snapped) ?? null);
          })()
        : inFlight.hovered;
  const stretch = guide === null || inFlight === null ? null : stretchGeometry(step, live, guide, inFlight.sink, sinkAtomForStretch);
  // The armed lone pair's dots glide a little toward the pointer while it
  // drags, so the electrons visibly start to move. The halo stays put: the
  // dots are the electrons, the halo is the slot.
  const glideOf = (slot: Point2): Point2 => {
    if (guide === null) return { x: 0, y: 0 };
    const dx = guide.to.x - slot.x;
    const dy = guide.to.y - slot.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return { x: 0, y: 0 };
    const k = Math.min(LP_GLIDE_PX, len * 0.15) / len;
    return { x: dx * k, y: dy * k };
  };

  // Species groups. Each species draws its atoms and attachments in AUTHORED
  // coordinates inside a <g> translated by its offset, so the carry is one
  // transform per group and the attachments' lag is one transition per group.
  const speciesIds = [...new Set(owner.values())];
  /**
   * No lag any more. The 120 ms overshoot on the attachments was designed as
   * a "settling" flourish, and the owner's hands-on verdict was final: "it's
   * really laggy, the bonds do not follow the molecules." A molecule is rigid;
   * its bonds move with it in the same frame. The constant stays for the
   * armed-slot glide, which is the one lag that still earns its keep.
   */
  const lagStyle = (speciesId: string): CSSProperties => {
    const offset = offsets[speciesId] ?? { x: 0, y: 0 };
    return { transform: `translate(${offset.x}px, ${offset.y}px)` };
  };
  const bodyStyle = (speciesId: string): CSSProperties => {
    const offset = offsets[speciesId] ?? { x: 0, y: 0 };
    return { transform: `translate(${offset.x}px, ${offset.y}px)` };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="application"
      aria-label="Draw the mechanism. Tap an atom to show its lone pairs, tap a lone pair or bond handle to start an arrow, tap where it should go. Press and drag an atom to move its molecule."
      className="h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
    >
      <defs>
        <DepthDefs />
        {/* markerUnits="userSpaceOnUse" pins the head to scene units. The
            default, strokeWidth, multiplied a 7 unit marker by a 3.5px stroke
            into a 24 unit triangle: larger than the 21 unit atoms it points
            at, which is why it read as a shape parked on the molecule rather
            than as the tip of an arrow. A head is now about two thirds of an
            atom radius whatever the stroke does. */}
        <marker id="draw-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0.6 L 10 5 L 0 9.4 z" fill="var(--bb-primary)" />
        </marker>
                <marker id="draw-arrowhead-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M 0 0.6 L 10 5 L 0 9.4 z" fill="var(--warn)" />
        </marker>
      </defs>

      {/* Attachments per species, on the lag: bonds, hydrogen arcs, lone pair dots. */}
      {speciesIds.map((speciesId) => (
        <g key={`lag-${speciesId}`} style={lagStyle(speciesId)} filter={`url(#${SHADOW_FILTER_ID})`}>
          {drawScene.bonds
            .filter((bond) => bond.phase !== "forming" && owner.get(bond.a) === speciesId)
            .map((bond) => (
              <BondCapsule
                key={bond.key}
                a={atomCentre(drawScene, bond.a)}
                b={atomCentre(drawScene, bond.b)}
                rA={atomRadius(drawScene.atoms.find((atom) => atom.id === bond.a)?.element ?? "C")}
                rB={atomRadius(drawScene.atoms.find((atom) => atom.id === bond.b)?.element ?? "C")}
                order={bond.order}
                // The leaving group is not a bystander in its own departure,
                // which is how a blind critic put it: mid-drag the canvas
                // otherwise shows an intact C-Br, a forming O-C and three
                // hydrogens, which reads as a five-bonded carbon. While the
                // in-flight gesture has a resolved landing, every bond this
                // step BREAKS loosens its grip: dimmer, visibly letting go.
                // The scene already classifies phases, so this is a read, not
                // a guess.
                opacity={inFlight?.sink !== null && inFlight !== null && bond.phase === "breaking" ? 0.45 : 1}
              />
            ))}
          {drawScene.atoms
            .filter((atom) => owner.get(atom.id) === speciesId)
            .map((atom) => {
              const c = toPx(atom.from.pos);
              const r = atomRadius(atom.element);
              const revealed = draft.revealedLonePairs.includes(atom.id);
              return (
                <g key={atom.id}>
                  {/* The lone pair fan's direction joins the hydrogen keep-outs,
                      so on an atom carrying both, the hydrogens land on the FAR
                      side of the lone pairs. Owner ruling 2026-08-26. */}
                  {revealed && atom.fromImplicitH > 0 ? (
                    <HydrogenReveal
                      centre={c}
                      r={r}
                      count={atom.fromImplicitH}
                      bondAngles={[...bondAnglesAt(drawScene, atom.id), ...(atom.fromLonePairs > 0 ? [atom.from.openAngle + Math.PI] : [])]}
                      openAngle={atom.from.openAngle}
                      reducedMotion={reducedMotion}
                    />
                  ) : (
                    <HydrogenArc
                      centre={c}
                      openAngle={atom.from.openAngle}
                      count={atom.fromImplicitH}
                      r={r}
                      bondAngles={[...bondAnglesAt(drawScene, atom.id), ...(atom.fromLonePairs > 0 ? [atom.from.openAngle + Math.PI] : [])]}
                    />
                  )}
                  {revealed
                    ? lonePairSlots(drawScene, atom.id).map((slot, index) => {
                        const armedSlot = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id && armedTarget.slotIndex === index;
                        // Glide is measured against the live slot (the lag group is
                        // in authored coordinates, so the offset is species local either way).
                        const glide = armedSlot ? glideOf(lonePairSlots(live, atom.id)[index] ?? slot) : { x: 0, y: 0 };
                        // Once one pair is armed the others step back, so the
                        // source of the gesture is unambiguous. Before anything
                        // is armed they are equal: all are equally choosable.
                        const anyArmedHere = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id;
                        const dimmed = anyArmedHere && !armedSlot;
                        return (
                          <g key={index} opacity={dimmed ? 0.3 : 1}>
                            <circle cx={slot.x} cy={slot.y} r={12} fill={armedSlot ? "var(--bb-primary)" : "var(--bb-card)"} stroke="var(--bb-primary)" strokeWidth={armedSlot ? 2.5 : 1.5} opacity={armedSlot ? 0.95 : 0.5} />
                            <g style={{ transform: `translate(${glide.x}px, ${glide.y}px)`, transition: reducedMotion ? "none" : "transform 60ms ease-out" }}>
                              <circle cx={slot.x - 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                              <circle cx={slot.x + 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                            </g>
                          </g>
                        );
                      })
                    : // NOTHING at rest, per the owner ruling of 2026-08-25 and per
                      // the bar: Alchemie's canvas shows no lone pairs until the
                      // atom is tapped (IMG_1644 resting against IMG_1641 revealed).
                      // This reverses the round 3 decision to draw them faintly.
                      // That decision was made to help a student FIND the pairs,
                      // and it bought discoverability by putting five quiet rings
                      // on an atom the student had not asked about, which is
                      // clutter on every canvas to help only the first one. The
                      // tutorial strip already says to tap the atom, and the tap
                      // acknowledges by revealing, which is its own lesson.
                      null}
                </g>
              );
            })}
        </g>
      ))}

      {/* Bond end handles, the drag target per the Alchemie capture x02. Live positions, no lag. */}
      {targets
        .filter((entry) => entry.target.kind === "bondEndHandle")
        .map((entry) => (
          <circle
            key={JSON.stringify(entry.target)}
            cx={entry.centre.x}
            cy={entry.centre.y}
            // A ball joint on the atom's skin, the way the capture draws it:
            // filled and light, the same family as the capsule, so it reads as
            // the end of the bond rather than as a ring floating over it.
            r={sameTargetLoose(entry.target, armedTarget) ? 8 : 6}
            fill={sameTargetLoose(entry.target, armedTarget) ? "var(--bb-primary)" : "var(--bond-stroke)"}
            stroke={sameTargetLoose(entry.target, armedTarget) ? "var(--bb-primary)" : "none"}
            strokeWidth={sameTargetLoose(entry.target, armedTarget) ? 3 : 0}
          />
        ))}

      {/* Atom bodies per species, moving with the pointer. */}
      {speciesIds.map((speciesId) => (
        <g key={`body-${speciesId}`} style={bodyStyle(speciesId)} filter={`url(#${SHADOW_FILTER_ID})`}>
          {drawScene.atoms
            .filter((atom) => owner.get(atom.id) === speciesId)
            .map((atom) => {
              const c = toPx(atom.from.pos);
              const r = atomRadius(atom.element);
              // The armed lone pair slot already fills solid; a ring around the
              // whole atom would read as a drop site, which it is not.
              // ON the rim, overlapping the sphere by nearly half the chip:
              // at r+6 the chip floated detached, and the round 4 critic read
              // a dark disc beside a red oxygen as possibly a fourth atom,
              // because in this language dark spheres are carbon. Anchoring
              // it half-over the silhouette makes it unmistakably a label on
              // the atom rather than a body near it.
              const badgeAt = { x: c.x + (r + 1) * Math.cos(-atom.from.badgeAngle), y: c.y + (r + 1) * Math.sin(-atom.from.badgeAngle) };
              return (
                <g key={atom.id} className={wobbling.has(atom.id) ? "wobble" : undefined} style={{ cursor: "grab" }}>
                  <AtomSphere centre={c} r={r} element={atom.element} />
                  <ChargeBadge at={badgeAt} charge={atom.fromCharge} />
                  {/* The failure mark ON the molecule, the bar's language for a
                      rejected drop (IMG_1647 to IMG_1650): a rounded yellow
                      warning triangle riding the atom that could not take the
                      electrons, for exactly as long as the wobble runs. Yellow
                      per the anti-requirements: chemically wrong is a warning,
                      never error red. The card below the canvas says WHY; this
                      says WHERE, and a student mid-gesture reads the canvas
                      before the card. */}
                  {wobbling.has(atom.id) ? <WarningTriangle at={{ x: c.x + r * 0.55, y: c.y - r * 0.95 }} /> : null}
                </g>
              );
            })}
        </g>
      ))}

      {/* Between atom sites, offered while a source is armed: the forming bond
          a drop there would make, as a faint stub between the two surfaces. */}
      {targets
        .filter((entry) => entry.target.kind === "betweenAtomsSite")
        .map((entry) => {
          if (entry.target.kind !== "betweenAtomsSite") return null;
          const { stub } = bondSinkGeometry(live, entry.target.atomIds);
          if (stub === null) return null;
          return <line key={JSON.stringify(entry.target)} x1={stub.a.x} y1={stub.a.y} x2={stub.b.x} y2={stub.b.y} stroke="var(--bb-primary)" strokeWidth={2.5} strokeDasharray="3 6" strokeLinecap="round" opacity={0.22} />;
        })}

      {/* The student's arrows, from live positions because they span species.
          Each starts on its source (lone pair slot or bond middle) and ends on
          its sink's surface, or on the dashed stub of the bond it forms. */}
      {draft.arrows.map((arrow) => {
        const centroid = awayFrom(sourceAtomId(step, arrow));
        const { from, sink } = committedArrowGeometry(step, live, arrow, centroid);
        const to = sink.landing;
        return (
          <g key={arrow.id} className={snapping ? "snap-back" : undefined} style={snapping ? ({ "--snap-dx": `${(to.x - from.x) * 0.6}px`, "--snap-dy": `${(to.y - from.y) * 0.6}px` } as CSSProperties) : undefined}>
            {/* The bond this arrow makes, as the SAME rod every other bond is,
                segmented because it does not exist yet. A hairline dash of a
                different colour and a third the width is a measurement guide,
                not a bond, which is how a blind critic read it. */}
            {sink.stub !== null ? <BondCapsule a={sink.stub.a} b={sink.stub.b} rA={0} rB={0} opacity={0.75} forming /> : null}
            {/* A halo in the canvas colour under the stroke. An arrow that
                crosses a hydrogen letter or a lone pair otherwise appears cut
                into pieces by them, which is what a blind critic saw. */}
            {arrowless ? (
              <>
                {/* The electrons, arrived and resting: twin dots at the
                    landing. The stub above already says which bond they
                    became; no curve, no head, per the sequence mode's rule. */}
                <circle cx={to.x - 3.2} cy={to.y} r={2.6} fill="var(--electron-glow)" />
                <circle cx={to.x + 3.2} cy={to.y} r={2.6} fill="var(--electron-glow)" />
              </>
            ) : (
              <>
                <path d={curveAway(from, to, centroid)} fill="none" stroke="var(--bb-card)" strokeWidth={7} strokeLinecap="round" opacity={0.9} />
                <path d={curveAway(from, to, centroid)} fill="none" stroke="var(--bb-primary)" strokeWidth={3} strokeLinecap="round" markerEnd="url(#draw-arrowhead)" />
              </>
            )}
          </g>
        );
      })}

      {/* The question's own subject, marked at rest: a quiet halo on each
          reaction centre. Three rounds of critics said the same thing in
          different words: nothing on the resting canvas answers "what is
          about to react with what", and with lone pairs hidden until tap
          (owner ruling) the scene otherwise carries zero targeting cues. The
          centres come from the step's own identity, so this marks WHERE the
          question lives without revealing a single arrow, which keeps the
          anti-requirement: no mechanism shown before the attempt. */}
      {step.identity.reactionCenters.map((atomId) => {
        const centre = atomCentre(live, atomId);
        const r = elementRadius(live, atomId);
        return (
          <g key={`centre-${atomId}`} style={{ pointerEvents: "none" }}>
            <circle cx={centre.x} cy={centre.y} r={r + 8} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.28} />
            <circle cx={centre.x} cy={centre.y} r={r + 8} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.5} className={reducedMotion ? undefined : "centre-breathe"} />
          </g>
        );
      })}

      {/* The orbit in progress: the circle the atom rides, dashed because it
          exists only while the pointer holds it, and a halo on the swung atom
          so the grabbed thing is visibly grabbed. */}
      {activeOrbit !== null
        ? (() => {
            const centre = atomCentre(live, activeOrbit.neighbourId);
            const swung = atomCentre(live, activeOrbit.atomId);
            const r = elementRadius(live, activeOrbit.atomId);
            return (
              <g style={{ pointerEvents: "none" }}>
                <circle cx={centre.x} cy={centre.y} r={activeOrbit.radiusPx} fill="none" stroke="var(--bb-primary)" strokeWidth={1.6} strokeDasharray="4 7" opacity={0.4} />
                <circle cx={swung.x} cy={swung.y} r={r + 6} fill="none" stroke="var(--bb-primary)" strokeWidth={2.5} opacity={0.8} />
              </g>
            );
          })()
        : null}

      {/* The rejected arrow, frozen in warning colour with the bar's triangle
          on the atom it wrongly targeted. Stays until the next touch, so the
          canvas and the card tell the same story for as long as the card is
          on screen. */}
      {rejected !== null
        ? (() => {
            const centroid = awayFrom(sourceAtomId(step, rejected.arrow));
            const { from } = committedArrowGeometry(step, live, rejected.arrow, centroid);
            // The ghost lands ON the atom the student wrongly targeted, not on
            // a stub midpoint: for the O-to-Br mistake the inferred bond's
            // middle sits behind the carbon, and an arrow ending there tells
            // the wrong story. The card names bromine; the ghost points at it.
            const sinkAtom = rejected.arrow.sink.kind === "atom" ? rejected.arrow.sink.atomId : rejected.arrow.sink.atomIds[1];
            const c = atomCentre(live, sinkAtom);
            const r = elementRadius(live, sinkAtom);
            const landing = landingOnRim(c, r, from, centroid, LAND_GAP);
            return (
              <g key={rejected.key} style={{ pointerEvents: "none" }}>
                <path d={curveAway(from, landing, centroid)} fill="none" stroke="var(--bb-card)" strokeWidth={7} strokeLinecap="round" opacity={0.9} />
                <path d={curveAway(from, landing, centroid)} fill="none" stroke="var(--warn)" strokeWidth={3} strokeDasharray="7 6" strokeLinecap="round" markerEnd="url(#draw-arrowhead-warn)" />
                <WarningTriangle at={{ x: c.x + r * 0.55, y: c.y - r * 0.95 }} />
              </g>
            );
          })()
        : null}

      {/* The dashed in flight guide, per capture x01: starts on the source,
          head at the finger, or on the drop site once the release would land
          there. The site itself gets a ring so the student sees the landing
          before letting go. The machine's snappedTo decides which; this only draws it. */}
      {inFlight !== null ? (
        <g style={{ pointerEvents: "none" }}>
          {/* The bond being pulled. Drawn UNDER the guide and the stub so the
              arrow stays the thing you read first. An existing bond keeps its
              own colour as it stretches; a forming one arrives in the accent,
              faint until the release would actually land. */}
          {/* THE SAME ROD as every other bond, not a bar of a different colour
              laid over the atoms. A blind critic put it plainly: the canvas was
              speaking two bond languages at once, a shaded cylinder with joints
              for the real bond and a flat purple rectangle for the forming one,
              and the flat one crossed both spheres instead of meeting them. A
              forming bond is the same object in a provisional STATE, so it is
              a BondCapsule at reduced opacity: same shading, same ball joints
              on the same surfaces. Purple now belongs to the arrow alone. */}
          {stretch !== null ? (
            <BondCapsule
              a={stretch.from}
              b={stretch.to}
              rA={stretch.rFrom}
              rB={stretch.toRadius}
              opacity={stretch.existing ? 0.9 : 0.5}
              // A stretch toward a bond that does not exist yet is a FORMING
              // bond and has to say so. It did not pass this, so the O-C stretch
              // drew as a solid rod at half opacity: same shading, same joints,
              // same silhouette as the real C-Br bond beside it. Opacity alone
              // does not read as provisional, it reads as further away.
              forming={!stretch.existing}
            />
          ) : null}
          {inFlight.sink?.stub && stretch === null ? <BondCapsule a={inFlight.sink.stub.a} b={inFlight.sink.stub.b} rA={0} rB={0} opacity={0.6} forming /> : null}
          {inFlight.hovered !== null ? <circle cx={atomCentre(live, inFlight.hovered).x} cy={atomCentre(live, inFlight.hovered).y} r={elementRadius(live, inFlight.hovered) + 6} fill="none" stroke="var(--bb-primary)" strokeWidth={2} opacity={0.45} /> : null}
          {inFlight.sink !== null ? (
            <>
              {inFlight.sink.stub === null ? <circle cx={inFlight.sink.ring.centre.x} cy={inFlight.sink.ring.centre.y} r={inFlight.sink.ring.r + 2} fill="var(--bb-primary)" opacity={0.12} /> : null}
              <circle cx={inFlight.sink.ring.centre.x} cy={inFlight.sink.ring.centre.y} r={inFlight.sink.ring.r} fill="none" stroke="var(--bb-primary)" strokeWidth={inFlight.sink.stub === null ? 3 : 2.5} opacity={0.95} />
            </>
          ) : null}
          <path d={curveAway(inFlight.from, inFlight.to, inFlight.away)} fill="none" stroke="var(--bb-card)" strokeWidth={8} strokeLinecap="round" opacity={0.9} />
          <path
            d={curveAway(inFlight.from, inFlight.to, inFlight.away)}
            fill="none"
            stroke="var(--bb-primary)"
            // The guide carries the same weight and saturation as its head. A
            // thin translucent line under a solid arrowhead reads as two
            // different marks rather than one gesture, which is what a blind
            // critic saw: the head looked placed and the tail looked like a
            // hint. One stroke, one opacity.
            strokeWidth={3.5}
            strokeDasharray={reducedMotion ? undefined : "7 6"}
            strokeLinecap="round"
            // THE IN FLIGHT HEAD IS THE OWNER DECISION OF 2026-08-25.
            //
            // Alchemie draws no arrowhead at any point: what the student drags
            // is the ELECTRONS, a lit sphere on a dashed tether (IMG_1640,
            // IMG_1645). Rounds 4 to 7 of this loop each found a defect that
            // was a property of drawing a head mid-drag: its size against the
            // atoms, where it landed, which way it pointed, and a backwards
            // tangent on a short chord. None of those exist if the leading end
            // is a sphere, because a sphere has no orientation to get wrong.
            //
            // The ruling was BOTH: no head in flight, a real curved arrow with
            // a head once the step is committed, so the gesture matches the bar
            // and the record matches what CHEM 241 grades on paper.
            markerEnd={primitive === "arrow" ? "url(#draw-arrowhead)" : undefined}
          />
          {primitive === "arrow" ? null : (
            <>
              {/* The electrons in flight. A warm halo, then the sphere: the
                  same two part mark the bar uses, sized to read at a glance
                  beside a 21 unit atom without competing with it. */}
              <circle cx={inFlight.to.x} cy={inFlight.to.y} r={13} fill="var(--electron-glow)" opacity={0.55} />
              <circle cx={inFlight.to.x} cy={inFlight.to.y} r={8.5} fill="var(--electron-glow)" opacity={0.85} />
              <circle cx={inFlight.to.x} cy={inFlight.to.y} r={5} fill="var(--electron-core)" />
            </>
          )}
          <circle cx={inFlight.from.x} cy={inFlight.from.y} r={3} fill="var(--bb-primary)" />
        </g>
      ) : null}
    </svg>
  );
}
