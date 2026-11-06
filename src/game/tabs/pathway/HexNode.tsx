/**
 * The path node as a hexagon ring (piece "hex", opt in through
 * app/ui/hexLook.ts until it wins on #/app/gallery/hex).
 *
 * A regular flat-topped hexagon 80px across, so 69.3px tall, over a lip of
 * the same hexagon shifted down by --node-lip. The chip's own colours paint
 * it (--node-face, --node-edge, --node-line, --node-glyph), so every state the
 * round chip has, the ring has, with no new tokens.
 *
 * The bonds: drawn ON the face as a thin line ring (round 3), the glyph
 * shrunk to keep 6px clear of them (ringLayout in hexGeometry.ts). An open,
 * current or done node is benzene (Kekule set a); a locked or unwritten node
 * is cyclohexane, the ring with no double bonds. A press turns the
 * three inner lines 60 degrees onto the other Kekule structure, and the
 * current node does the same slowly on its own, resonance as the "this one"
 * signal. pathway.css paints all of it.
 */

import { RingDrawing } from "../../app/ui/HexFrame";
import { hexHeight, hexPath } from "../../app/ui/hexGeometry";
import "./hexNode.css";

const D = 80;
const R = D / 2;
const H = hexHeight(R);
const CY = H / 2;
const FACE = hexPath(R, CY, R, 6);

export function HexNodeLip() {
  return (
    <svg className="hx-node__lip" viewBox={`0 0 ${D} ${H}`} aria-hidden focusable="false">
      <path d={FACE} />
    </svg>
  );
}

/** The face and its molecule. A locked or queued node is cyclohexane: the ring, no double bonds. */
export function HexNodeFace({ aromatic }: { readonly aromatic: boolean }) {
  return (
    <svg className={`hx-node__ring ${aromatic ? "" : "hx-node__ring--sat"}`} viewBox={`0 0 ${D} ${H}`} aria-hidden focusable="false">
      <path className="hx-node__fill" d={FACE} />
      <RingDrawing cx={R} cy={CY} r={R} />
    </svg>
  );
}
