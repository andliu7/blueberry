/**
 * The hexagon key's drawing: an SVG lip, an SVG face, a line drawing of the
 * ring on the face, and a focus ring, all sized to the button it sits in. It
 * is drawn, not clipped: a clip-path would cut away the lip and the focus
 * ring, which both live outside the face.
 *
 * ROUND KEYS ONLY (round 3, 3 Nov judges). A regular flat-topped hexagon, at
 * least 64px across. Text keys stay the rounded .btn3d: stretched to a text
 * label's width the hexagon stopped reading as a ring.
 *
 * On the face sits the molecule as a textbook draws it: a thin hexagon for
 * the six C-C bonds, inset from the face's edge, and the second line of each
 * double bond inset again. ringLayout (hexGeometry.ts) sizes the glyph so it
 * keeps 6px clear of every bond line.
 *
 * What the bonds mean (hex.css paints it, nothing here decides it):
 *   filled keys   benzene, Kekule set a
 *   pressed       the other Kekule structure, set b: resonance, the same
 *                 molecule drawn the other way, not a reaction. Round 4: the
 *                 two sets cross-fade in place while the ring stays still
 *                 (a turning group made rest and pressed read as two icons)
 *   secondary     cyclohexane: the ring, no double bonds
 *   disabled      a faded cyclohexane
 *   busy          the double bonds draw in one at a time
 *
 * The press itself is the shared .btn3d press: the whole key drops by the lip
 * and the lip is hidden, on :active, with no JavaScript in the path. The only
 * script here is measuring the button so the paths fit it.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { hexHeight, hexPath, kekuleLines, linesPath, ringLayout, ringPath, type KekuleSet, type Point } from "./hexGeometry";

/** One Kekule set's three inner lines, each its own path so "busy" can draw them in turn. */
export function Bonds({ lines, set }: { readonly lines: readonly (readonly [Point, Point])[]; readonly set: KekuleSet }) {
  return (
    <g className={`hx-kek hx-kek--${set}`}>
      {lines.map((line, i) => (
        <path key={i} className="hx-bond" style={{ "--i": i } as CSSProperties} d={linesPath([line])} />
      ))}
    </g>
  );
}

/**
 * The molecule drawn on a face of circumradius r centred at (cx, cy): the
 * ring of six single bonds, then BOTH Kekule sets' inner lines. CSS shows set
 * a at rest and set b while pressed (round 4: a cross-fade in place, so the
 * ring and the glyph never move and rest and pressed read as one key).
 */
export function RingDrawing({ cx, cy, r }: { readonly cx: number; readonly cy: number; readonly r: number }) {
  const { ringR, bondInset, stroke } = ringLayout(r);
  return (
    <g className="hx-mol" style={{ "--hx-stroke": `${stroke}px` } as CSSProperties}>
      <path className="hx-ring" d={ringPath(cx, cy, ringR)} />
      <Bonds lines={kekuleLines(cx, cy, ringR, "a", bondInset, 0.15)} set="a" />
      <Bonds lines={kekuleLines(cx, cy, ringR, "b", bondInset, 0.15)} set="b" />
    </g>
  );
}

/** How far outside the shape the focus ring sits, in px. */
const FOCUS_GAP = 4;

export function HexFrame({ lip }: { readonly lip: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const read = () => setW(host.offsetWidth);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const r = w / 2;
  const h = hexHeight(r);
  const cy = h / 2;
  let body: ReactNode = null;
  if (w > 0) {
    const face = hexPath(r, cy, r);
    const focusR = r + (FOCUS_GAP * 2) / Math.sqrt(3);
    body = (
      <>
        <path className="hx-focus" d={hexPath(r, cy + lip / 2, focusR + lip / 3)} />
        <path className="hx-lip hx-hit" d={face} transform={`translate(0 ${lip})`} />
        <path className="hx-face hx-hit" d={face} />
        <RingDrawing cx={r} cy={cy} r={r} />
      </>
    );
  }

  return (
    <svg
      ref={ref}
      className="hx-svg"
      width={w || 1}
      height={(h || 1) + lip}
      viewBox={`0 0 ${w || 1} ${(h || 1) + lip}`}
      aria-hidden
      focusable="false"
    >
      {body}
    </svg>
  );
}
