/**
 * A workbench for the tapered curved arrow, at #/gallery/pilot-arrow.
 *
 * A development surface, not a student surface: it exists so a critic can put
 * our arrow beside the design reference
 * (docs/reference/design-goals/blueberry_r9-lesson-mechanism_1788289491.png)
 * without launching a lesson, drawing a mechanism and getting the arrow to
 * commit first.
 *
 * Deliberately styled with inline styles rather than the app's Tailwind tokens.
 * The point of the pilot is that the arrow module stands alone, and a gallery
 * that only renders correctly inside the app's stylesheet would hide a
 * dependency the module is supposed not to have.
 */

import { useState, type CSSProperties } from "react";
import { TaperedArrow } from "./arrow/TaperedArrowSvg";
import {
  DEFAULT_WIDTH_PROFILE,
  taperedArrowGeometry,
  taperedArrowSpinePath,
  type ArrowWidthProfile,
  type Point2,
  type TaperedArrowInput,
} from "./arrow/taperedArrow";

const CREAM = "#f6f4ef";
const INK = "#292524";
const MUTED = "#78716c";
const CARD = "#ffffff";

interface Case {
  readonly title: string;
  readonly note: string;
  readonly input: TaperedArrowInput;
}

const CASES: readonly Case[] = [
  {
    title: "Typical push",
    note: "190 px chord, centroid below. The bow is capped at 32 percent of the chord.",
    input: { from: { x: 55, y: 130 }, to: { x: 245, y: 130 }, away: { x: 150, y: 240 } },
  },
  {
    title: "Centroid above",
    note: "Same chord, molecule on the other side. The bow flips; nothing else changes.",
    input: { from: { x: 55, y: 110 }, to: { x: 245, y: 110 }, away: { x: 150, y: 0 } },
  },
  {
    title: "Short arrow, floor applies",
    note: "50 px chord. 32 percent would be 16 px of bow, so the 18 px floor holds the arc open.",
    input: { from: { x: 120, y: 120 }, to: { x: 170, y: 120 }, away: { x: 145, y: 210 } },
  },
  {
    title: "Long sweep",
    note: "A nucleophile crossing the canvas. The taper has room to be seen.",
    input: { from: { x: 30, y: 160 }, to: { x: 285, y: 90 }, away: { x: 150, y: 260 } },
  },
  {
    title: "Steep chord",
    note: "Vertical travel. The head still lands square on the sink.",
    input: { from: { x: 110, y: 30 }, to: { x: 150, y: 210 }, away: { x: 260, y: 120 } },
  },
  {
    title: "Landing trimmed by an atom",
    note: "sinkRadiusPx 26, the drawn radius of a second row atom plus clearance. The tip stops on the rim.",
    input: { from: { x: 50, y: 140 }, to: { x: 250, y: 110 }, away: { x: 150, y: 240 }, sinkRadiusPx: 26 },
  },
  {
    title: "Degenerate: chord shorter than the head",
    note: "The head scales down to the length available and the shaft is dropped. A truncated head would point nowhere.",
    input: { from: { x: 135, y: 120 }, to: { x: 165, y: 120 }, away: { x: 150, y: 210 }, width: { headLengthPx: 40 } },
  },
  {
    title: "Degenerate: zero length chord",
    note: "Source and sink coincide. Nothing is drawn, because a ribbon around an out-and-back line is a blot.",
    input: { from: { x: 150, y: 120 }, to: { x: 150, y: 120 }, away: { x: 150, y: 220 } },
  },
  {
    title: "Degenerate: sink swallows the curve",
    note: "sinkRadiusPx 120 against a 90 px chord. Nothing is drawn, because the scrap left would read as dirt.",
    input: { from: { x: 105, y: 120 }, to: { x: 195, y: 120 }, away: { x: 150, y: 220 }, sinkRadiusPx: 120 },
  },
];

/**
 * The short band, one panel per chord. On our 72 px bonds a lone pair pushing
 * to the adjacent atom lands a 25 to 50 px chord, so this band is the COMMON
 * case, not the edge case, and round one shipped it broken (a hook at 50, a
 * blob at 30) with no panel showing it. Under MIN_CHORD_PX the head draws
 * alone; from 34 up the whole profile scales with the chord, so a short push
 * is a small arrow rather than an undersized shaft under a full-size head.
 */
const SHORT_BAND: readonly Case[] = [
  {
    title: "25 px chord",
    note: "Under the 34 px minimum. A ribbon would bow more than it travels, so the head draws alone, scaled to the travel.",
    input: { from: { x: 137.5, y: 130 }, to: { x: 162.5, y: 130 }, away: { x: 150, y: 230 } },
  },
  {
    title: "34 px chord, the threshold",
    note: "MIN_CHORD_PX exactly, same value and meaning as hitLayout's MIN_CHORD. The shortest full shaft-and-head ribbon drawn.",
    input: { from: { x: 133, y: 130 }, to: { x: 167, y: 130 }, away: { x: 150, y: 230 } },
  },
  {
    title: "45 px chord",
    note: "A lone pair reaching past one bond. The whole profile is scaled to 45/112 of full size, so the head stays in proportion.",
    input: { from: { x: 127.5, y: 130 }, to: { x: 172.5, y: 130 }, away: { x: 150, y: 230 } },
  },
  {
    title: "60 px chord",
    note: "Most of a bond length of travel. Still under the 112 px profile chord, still scaled down as a whole.",
    input: { from: { x: 120, y: 130 }, to: { x: 180, y: 130 }, away: { x: 150, y: 230 } },
  },
  {
    title: "90 px chord",
    note: "A bond and a bit. Scaled to 90/112; the taper now has room to read.",
    input: { from: { x: 105, y: 130 }, to: { x: 195, y: 130 }, away: { x: 150, y: 230 } },
  },
  {
    title: "140 px chord",
    note: "Past the 112 px profile chord, so this is the full measured profile: 8 to 15 px shaft, 34 px head.",
    input: { from: { x: 80, y: 130 }, to: { x: 220, y: 130 }, away: { x: 150, y: 240 } },
  },
  {
    title: "The corpus case: onto the atom one bond away",
    note: "Sink centre 38 px away, rim at 21. The straight landing leaves 17 px of chord, so the landing swings around the rim until the chord reaches 34, out, over and down, the way it is drawn on paper.",
    input: { from: { x: 106, y: 140 }, to: { x: 144, y: 140 }, away: { x: 125, y: 230 }, sinkRadiusPx: 21 },
  },
];

const PROFILES: readonly { readonly label: string; readonly profile: ArrowWidthProfile }[] = [
  { label: "Default", profile: DEFAULT_WIDTH_PROFILE },
  { label: "Finer", profile: { tailPx: 2, shoulderPx: 6, headPx: 16, headLengthPx: 14 } },
  { label: "Heavier", profile: { tailPx: 6, shoulderPx: 16, headPx: 34, headLengthPx: 26 } },
  { label: "No taper, for contrast", profile: { tailPx: 10, shoulderPx: 10, headPx: 24, headLengthPx: 20 } },
];

export default function PilotGallery() {
  // One switch, because the only thing a critic reliably wants to toggle is
  // whether the construction is visible under the finished shape.
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: CREAM, color: INK, padding: "24px 20px 64px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ maxWidth: 1100, margin: "0 auto 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px" }}>Tapered curved arrow</h1>
        <p style={{ margin: "0 0 12px", color: MUTED, maxWidth: 720, lineHeight: 1.5 }}>
          A closed filled outline, not a stroked line, so the ribbon can be thin where the electrons
          leave and thick going into the head. The arrowhead is part of the same outline, so there is
          no seam at the shoulder and no marker element to keep in sync.
        </p>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: MUTED, cursor: "pointer" }}>
          <input type="checkbox" checked={showSkeleton} onChange={(event) => setShowSkeleton(event.target.checked)} />
          Show the construction: spine, source, sink, centroid
        </label>
      </header>

      <section style={{ maxWidth: 1100, margin: "0 auto 28px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>Width profile, as data</h2>
        <div style={grid}>
          {PROFILES.map((entry) => (
            <Panel
              key={entry.label}
              title={entry.label}
              note={`tail ${entry.profile.tailPx}, shoulder ${entry.profile.shoulderPx}, head ${entry.profile.headPx}, head length ${entry.profile.headLengthPx}`}
              input={{ from: { x: 45, y: 140 }, to: { x: 255, y: 110 }, away: { x: 150, y: 250 }, width: entry.profile }}
              showSkeleton={showSkeleton}
            />
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto 28px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>The short band, where mechanisms actually live</h2>
        <div style={grid}>
          {SHORT_BAND.map((entry) => (
            <Panel key={entry.title} title={entry.title} note={entry.note} input={entry.input} showSkeleton={showSkeleton} />
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>Lengths, curvatures, and the honest failures</h2>
        <div style={grid}>
          {CASES.map((entry) => (
            <Panel key={entry.title} title={entry.title} note={entry.note} input={entry.input} showSkeleton={showSkeleton} />
          ))}
        </div>
      </section>
    </div>
  );
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 16,
};

function Panel({
  title,
  note,
  input,
  showSkeleton,
}: {
  readonly title: string;
  readonly note: string;
  readonly input: TaperedArrowInput;
  readonly showSkeleton: boolean;
}) {
  const geometry = taperedArrowGeometry(input);
  const sink = input.sinkRadiusPx ?? 0;

  return (
    <figure style={{ margin: 0, background: CARD, borderRadius: 20, padding: 14, boxShadow: "0 1px 3px rgba(41,37,36,0.10)" }}>
      <svg viewBox="0 0 300 240" width="100%" style={{ display: "block", borderRadius: 14, background: CARD }}>
        {showSkeleton ? <Skeleton input={input} sink={sink} /> : null}
        <TaperedArrow {...input} label={title} />
      </svg>
      <figcaption style={{ marginTop: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <p style={{ margin: "4px 0 6px", fontSize: 12.5, lineHeight: 1.45, color: MUTED }}>{note}</p>
        <div style={{ fontSize: 11.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {geometry.degenerate === null ? "drawn" : geometry.degenerate}
          {" · "}
          {`arc ${geometry.lengthPx.toFixed(1)} px`}
          {" · "}
          {`bow ${geometry.bowPx.toFixed(1)} px`}
          {" · "}
          {`half width ${geometry.tailHalfWidthPx.toFixed(2)} to ${geometry.headHalfWidthPx.toFixed(2)}`}
        </div>
      </figcaption>
    </figure>
  );
}

/** Source, sink, centroid and the bare spine, so the bow rule is visible rather than asserted. */
function Skeleton({ input, sink }: { readonly input: TaperedArrowInput; readonly sink: number }) {
  const spine = taperedArrowSpinePath(input);
  return (
    <g aria-hidden>
      {sink > 0 ? <circle cx={input.to.x} cy={input.to.y} r={sink} fill="none" stroke="#cbd5e1" strokeDasharray="4 4" /> : null}
      {spine === "" ? null : <path d={spine} fill="none" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />}
      <Dot p={input.from} fill="#0ea5e9" label="source" />
      <Dot p={input.to} fill="#f43f5e" label="sink" />
      <Dot p={input.away} fill="#a8a29e" label="centroid" />
    </g>
  );
}

function Dot({ p, fill, label }: { readonly p: Point2; readonly fill: string; readonly label: string }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={3.5} fill={fill} />
      <text x={p.x + 6} y={p.y - 6} fontSize={9} fill={MUTED}>
        {label}
      </text>
    </g>
  );
}
