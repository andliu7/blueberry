/**
 * ONE UNIT'S TRAIL, DRAWN INSIDE THAT UNIT'S OWN SECTION.
 *
 * This file exists because of a bug the owner reported twice: "every time I
 * scroll the path lags behind the buttons." It was not a tuning problem and
 * no amount of making a callback faster was going to close it.
 *
 * WHAT WAS WRONG. The trail used to be drawn by PathScene, which is a STICKY,
 * viewport-sized SVG. A sticky element does not move with the page, so every
 * frame the trail had to be re-placed: node positions were read with
 * getBoundingClientRect inside a requestAnimationFrame on scroll and the whole
 * world group was translated to compensate. The compositor scrolls the nodes
 * on its own thread and the callback moves the trail afterwards, so the trail
 * was AT LEAST ONE FRAME BEHIND BY CONSTRUCTION. Scroll-linked JavaScript
 * repaint cannot beat compositor scrolling; that is the architecture, not the
 * implementation.
 *
 * WHAT IS RIGHT. Take JavaScript out of the loop entirely. The trail lives in
 * the SAME SCROLLING LAYER as the nodes it connects: this SVG is a child of
 * the unit's own <section>, absolutely positioned inside it, in normal
 * document flow with the chips. The compositor moves the section, and the
 * nodes and the ribbon are inside it, so there is nothing to synchronise and
 * nothing that can drift. Not one scroll listener in this file, and there
 * must never be one: pathwayTrailLayer.test.ts asserts that.
 *
 * WHY PER UNIT AND NOT ONE TALL SVG. Because the S2 round already recorded
 * what happens: the Orgo II track is about 14500px, and a 390pt phone at 3x
 * turns a full-height layer into roughly 200 MB and kills the renderer. A
 * unit section is a few hundred pixels tall, and there are fourteen of them,
 * each painting only itself.
 *
 * THE BACKGROUND MAY STILL LAG, and PathScene keeps its sticky parallax for
 * that reason. A background is allowed to be a frame behind. A line that
 * connects buttons is not.
 *
 * WHERE MEASUREMENT STILL HAPPENS. Once per layout, in a layout effect, and
 * again when progress moves. That is a read of where the chips landed, which
 * is the trail-is-code rule (the ribbon is derived from the layout, never
 * drawn beside it). It is not scroll-linked, so it costs nothing per frame.
 *
 * THE JOIN BETWEEN UNITS. Each SVG reaches UP past its own top edge as far as
 * the previous unit's last anchor, so the road is continuous across a unit
 * boundary without any unit having to know about the whole track. That read
 * is also layout-time and also scroll-independent, because two boxes in one
 * scrolling layer keep their distance whatever the page does.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flowOrder, trailSegments, type TrailLane, type TrailPoint } from "./trail";

/**
 * How far a unit's SVG may reach above its own top edge to meet the previous
 * unit's last anchor, in pixels.
 *
 * A cap rather than an unbounded reach, because an overlapping box is a
 * hit-testing hazard even with pointer-events off (it is not, here, but the
 * next person to touch this file should not have to know that) and because a
 * gap larger than this means the layout has changed shape and a straight
 * ribbon drawn across it would be a guess. Measured: the largest real gap
 * between a gate arch and the next unit's first chip is about 150px.
 */
const LEAD_MAX_PX = 420;

/**
 * How long one leg of the flow takes, in milliseconds, and it is duplicated
 * in pathway.css as --flow-dur.
 *
 * The value lives in both places on purpose: the CSS owns the animation and
 * this file owns only the CLEANUP timer that drops the flow classes once the
 * run is over. If they drift the worst case is a green stretch that keeps its
 * travel class a little too long or too briefly, which changes nothing on
 * screen, because the class only carries a dash offset that has already
 * finished animating.
 */
const FLOW_LEG_MS = 380;

interface Measured {
  readonly width: number;
  readonly height: number;
  /** How far the box reaches above the section's own top edge. */
  readonly lead: number;
  readonly points: readonly TrailPoint[];
}

const EMPTY: Measured = { width: 0, height: 0, lead: 0, points: [] };

function laneOf(value: string | undefined): TrailLane {
  return value === "left" || value === "right" || value === "loop" ? value : "main";
}

/**
 * Read the chips this unit actually laid down, in DOCUMENT ORDER.
 *
 * Document order is the authority (trail.ts never sorts) and the unit's DOM
 * order is its visual order, so the ribbon threads the chips in the order the
 * track strung them. Coordinates are relative to the SVG's own box, which is
 * the section's box grown upward by `lead`, so nothing here depends on where
 * the page is scrolled to.
 */
function measureUnit(section: HTMLElement): Measured {
  const box = section.getBoundingClientRect();
  if (box.width < 1) return EMPTY;

  // The previous unit's last anchor, which is its gate arch. The lead-in is
  // what keeps the road continuous across the unit boundary.
  let lead = 0;
  let leadPoint: TrailPoint | null = null;
  const previous = section.previousElementSibling;
  if (previous instanceof HTMLElement && previous.dataset.unitId !== undefined) {
    const anchors = previous.querySelectorAll<HTMLElement>("[data-trail]");
    const last = anchors[anchors.length - 1];
    if (last !== undefined) {
      const rect = last.getBoundingClientRect();
      const centreY = rect.top + rect.height / 2;
      lead = Math.max(0, Math.min(LEAD_MAX_PX, box.top - centreY));
      leadPoint = {
        x: rect.left - box.left + rect.width / 2,
        y: centreY - box.top + lead,
        lane: laneOf(last.dataset.trail),
        done: last.dataset.trailDone === "true",
        gate: last.dataset.trailGate === "true",
      };
    }
  }

  const points: TrailPoint[] = leadPoint === null ? [] : [leadPoint];
  for (const anchor of section.querySelectorAll<HTMLElement>("[data-trail]")) {
    const rect = anchor.getBoundingClientRect();
    points.push({
      x: rect.left - box.left + rect.width / 2,
      y: rect.top - box.top + lead + rect.height / 2,
      lane: laneOf(anchor.dataset.trail),
      done: anchor.dataset.trailDone === "true",
      gate: anchor.dataset.trailGate === "true",
    });
  }
  return { width: box.width, height: box.height + lead, lead, points };
}

/**
 * The unit's ribbon.
 *
 * It measures its OWN PARENT rather than taking a ref to it, which is the
 * same trick PathScene uses and for the same recorded reason: React attaches
 * refs bottom up, so a ref handed down from the section is still null when
 * this component's layout effect first runs, and an effect that returns early
 * on a null ref never runs again. `svg.parentElement` is always attached by
 * the time the svg's own ref exists.
 */
export default function UnitTrail({
  stamp,
  reducedMotion,
}: {
  /**
   * A progress fingerprint for this unit. Done colouring is read off the DOM,
   * and clearing a lesson changes the DOM without changing any prop, so the
   * measurement re-runs when this string moves.
   */
  readonly stamp: string;
  readonly reducedMotion: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [measured, setMeasured] = useState<Measured>(EMPTY);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const section = svg?.parentElement ?? null;
    if (svg === null || section === null) return;
    const read = () => setMeasured(measureUnit(section));
    read();
    // The lead-in depends on the PREVIOUS section's height as well as this
    // one's, so both are observed. Without the second observer a unit above
    // that grows (a font swap, an authoring wave) would leave this unit's
    // join reaching to where the old gate used to be.
    const observer = new ResizeObserver(read);
    observer.observe(section);
    const previous = section.previousElementSibling;
    if (previous instanceof HTMLElement) observer.observe(previous);
    window.addEventListener("resize", read, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [stamp]);

  const segments = useMemo(() => trailSegments(measured.points), [measured]);

  /*
   * THE FLOW, and why it is a ref plus a state rather than one or the other.
   *
   * The ref remembers what was done at the last paint, which is the only way
   * to know what has JUST been finished: `done` alone cannot tell a stretch
   * the student walked five minutes ago from one they walked this second. The
   * state carries the ranks the renderer stamps onto the animating paths, and
   * it is cleared on a timer once the run has played, so a stretch goes back
   * to the plain static done rendering (with its soft glow) instead of
   * keeping an animation class forever.
   */
  const previousDone = useRef<readonly boolean[] | null>(null);
  const [flow, setFlow] = useState<readonly number[]>([]);

  /*
   * THE TIMER IS A REF, NOT AN EFFECT CLEANUP, and that is a bug fixed rather
   * than a preference. A ResizeObserver can fire mid-run (a font swap, a
   * sibling growing), which re-measures and re-runs this effect. If the timer
   * lived in the cleanup, React would cancel it on that re-run and, on the
   * early return below, never arm a replacement: the animating stretches would
   * keep their flow class for the rest of the session, which means keeping
   * their dash offset and losing their glow. Held in a ref, one run's timer
   * survives an unrelated re-measure and is cleared only on unmount.
   */
  const flowTimer = useRef(0);
  useEffect(
    () => () => {
      if (flowTimer.current !== 0) window.clearTimeout(flowTimer.current);
    },
    [],
  );

  useEffect(() => {
    const done = segments.map((segment) => segment.done);
    const history = previousDone.current;
    previousDone.current = done;
    if (reducedMotion) {
      // The colour changes without the travel, which is the goals' wording.
      setFlow([]);
      return;
    }
    // No history means this is the first paint of this unit. Nothing has just
    // been finished, so nothing travels: see flowOrder.
    if (history === null) return;
    const ranks = flowOrder(segments, history);
    const legs = ranks.reduce((most, rank) => Math.max(most, rank + 1), 0);
    // Nothing new. Leave any run that is still playing alone rather than
    // cutting it: a re-measure is not a reason to stop the green mid-journey.
    if (legs === 0) return;
    setFlow(ranks);
    if (flowTimer.current !== 0) window.clearTimeout(flowTimer.current);
    flowTimer.current = window.setTimeout(() => {
      flowTimer.current = 0;
      setFlow([]);
    }, legs * FLOW_LEG_MS + 120);
  }, [segments, reducedMotion]);

  if (measured.width < 1 || segments.length === 0) {
    // The element still renders, because its parentElement is how the effect
    // above finds the section to measure. An empty box measures once and then
    // fills in; a missing box never measures at all.
    return <svg ref={svgRef} className="path-unit-trail" aria-hidden focusable="false" />;
  }

  const roads = segments.map((segment, index) => ({ segment, index })).filter((entry) => !entry.segment.loop);
  const loops = segments.map((segment, index) => ({ segment, index })).filter((entry) => entry.segment.loop);

  return (
    <svg
      ref={svgRef}
      className="path-unit-trail"
      viewBox={`0 0 ${measured.width.toFixed(1)} ${measured.height.toFixed(1)}`}
      width={measured.width}
      height={measured.height}
      style={{ top: `${-measured.lead}px`, height: `${measured.height}px` }}
      aria-hidden
      focusable="false"
    >
      <g className="path-trail">
        {/* The detour: rim then fill on one shape, the way the road is drawn.
            Never green, because enrichment is not progress. */}
        {loops.map((entry) => (
          <path key={`loop-edge-${entry.index}`} className="path-trail__loop-edge" d={entry.segment.d} />
        ))}
        {loops.map((entry) => (
          <path key={`loop-${entry.index}`} className="path-trail__loop" d={entry.segment.d} />
        ))}
        {/*
          THE ROAD AHEAD, drawn for EVERY stretch including the walked ones.
          It is the plain violet family per DESIGN-GOALS 2026-09-04, and it is
          the bed the green rides on: a done stretch is the same road with the
          progress green laid over it, which is what lets the green be
          revealed progressively rather than swapped.

          Edges first, then fills, so consecutive segments join seamlessly
          instead of each segment's edge overpainting its neighbour's fill.
        */}
        {roads.map((entry) => (
          <path key={`edge-${entry.index}`} className="path-trail__edge" d={entry.segment.d} />
        ))}
        {roads.map((entry) => (
          <path key={`fill-${entry.index}`} className="path-trail__fill" d={entry.segment.d} />
        ))}
        {/*
          THE WALKED STRETCH. pathLength="1" normalises every path to a unit
          length, so one dash offset animation travels the whole stretch
          whatever its pixel length is, and a short leg and a long leg take
          the same time. The stagger is --flow-index; the CSS owns the timing.

          FILL-ONLY, per the goals' measured rule: the green here is an 8px
          fill riding an 11px rim in --progress-edge, never a hairline and
          never text.
        */}
        {roads
          .filter((entry) => entry.segment.done)
          .map((entry) => {
            const rank = flow[entry.index] ?? -1;
            const style = rank < 0 ? undefined : ({ "--flow-index": rank } as React.CSSProperties);
            const travelling = rank < 0 ? "" : " path-trail__done--flow";
            return (
              <g key={`done-${entry.index}`} className={`path-trail__done${travelling}`} style={style}>
                <path className="path-trail__edge path-trail__edge--done" pathLength={1} d={entry.segment.d} />
                <path className="path-trail__fill path-trail__fill--done" pathLength={1} d={entry.segment.d} />
              </g>
            );
          })}
      </g>
    </svg>
  );
}
