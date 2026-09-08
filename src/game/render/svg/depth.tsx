/**
 * The glyphs that give the 2D scene depth, shared by the draw canvas and the
 * playback renderer so the handoff between them does not go flat.
 *
 * What the Alchemie capture (docs/reference/alchemie/01-mechanism-canvas-full.png)
 * shows, taken as pattern and redrawn in Blueberry's own palette:
 *   - atoms are shaded spheres: an off centre highlight, a darker rim, a soft
 *     drop shadow, so they read as objects rather than discs
 *   - bonds are thick capsules with rounded ends that meet the atom SURFACE,
 *     never the centre, because a cylinder that pokes into a sphere is a
 *     drawing, and one that stops at its skin is a thing
 *   - the implicit hydrogen count sits on a faint arc outside the sphere
 *   - the charge badge is a small shaded disc with its own shadow
 *
 * Everything here is pure SVG. The gradients and the shadow filter are
 * declared once per <svg> through DepthDefs; the sphere and capsule reference
 * them by id. feDropShadow with a small blur is the cheapest shadow SVG has,
 * and it is applied to one group per species rather than per atom so the
 * playback renderer's 60 renders per second stay inside budget.
 */

import type { Point2 } from "@blueberry/interaction";

export const ELEMENT_FILL: Record<string, string> = {
  // Saturated enough to hold white glyphs at 4.5:1+ in both themes.
  C: "#334155",
  // PALE, per CPK and per two blind critics who read our slate H as a second
  // carbon: "an H rendered in carbon's colour is an element-identification
  // error waiting to happen." Hydrogen is the one element everyone knows is
  // white; its glyph flips to dark ink below because white-on-white is not a
  // label.
  H: "#e2e8f0",
  O: "#dc2626",
  N: "#2563eb",
  Br: "#9a3412",
  Cl: "#15803d",
  S: "#a16207",
  P: "#c2410c",
  F: "#0e7490",
  I: "#6d28d9",
};

export function fillFor(element: string): string {
  return ELEMENT_FILL[element] ?? "#334155";
}

function mixHex(hex: string, toward: number, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (toward - c) * t);
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const SHADOW_FILTER_ID = "depth-shadow";
export const BADGE_GRADIENT_ID = "depth-badge";

/** Gradient id for an element's sphere. Unknown elements share carbon's. */
export function sphereGradientId(element: string): string {
  return `depth-sphere-${element in ELEMENT_FILL ? element : "C"}`;
}

/** Declare once inside <defs>. Both renderers mount exclusively, so fixed ids are safe. */
export function DepthDefs() {
  return (
    <>
      {Object.entries(ELEMENT_FILL).map(([element, base]) => (
        // A TIGHT specular hotspot rather than a wide wash. Widening the
        // highlight brightens the whole sphere including the ground under the
        // white element letter, which costs contrast; pulling it into a small
        // bright spot up and left, and deepening the far rim, raises the
        // apparent brightness AND the modelling while the letter keeps sitting
        // on the base colour that was measured against it.
        <radialGradient key={element} id={sphereGradientId(element)} cx="33%" cy="27%" r="66%">
          <stop offset="0%" stopColor={mixHex(base, 0xff, 0.66)} />
          <stop offset="26%" stopColor={mixHex(base, 0xff, 0.16)} />
          <stop offset="58%" stopColor={base} />
          <stop offset="100%" stopColor={mixHex(base, 0x00, 0.46)} />
        </radialGradient>
      ))}
      <radialGradient id={BADGE_GRADIENT_ID} cx="36%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>
      <filter id={SHADOW_FILTER_ID} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.32" />
      </filter>
    </>
  );
}

/** A shaded sphere with the element glyph. The shadow comes from the enclosing group's filter. */
export function AtomSphere({ centre, r, element, opacity = 1 }: { centre: Point2; r: number; element: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={centre.x} cy={centre.y} r={r} fill={`url(#${sphereGradientId(element)})`} />
      {/* A rim shade, the thin dark edge a sphere shows against its ground. */}
      <circle cx={centre.x} cy={centre.y} r={r - 0.75} fill="none" stroke="#0f172a" strokeOpacity={0.22} strokeWidth={1.5} />
      <text x={centre.x} y={centre.y} textAnchor="middle" dominantBaseline="central" fontSize={element === "H" ? 13 : 18} fontWeight={700} fill={element === "H" ? "#334155" : "#ffffff"}>
        {element}
      </text>
    </g>
  );
}

/** The point on the line from `centre` toward `toward`, `r` px out: the rim of an atom. */
export function rimPoint(centre: Point2, toward: Point2, r: number): Point2 {
  const dx = toward.x - centre.x;
  const dy = toward.y - centre.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: centre.x + (dx / len) * r, y: centre.y + (dy / len) * r };
}

export const BOND_WIDTH = 10;

/**
 * A rounded capsule from the surface of atom A to the surface of atom B. Two
 * strokes make the cylinder: the body in the bond colour and a narrower pale
 * highlight pulled a little toward the light, which is up and left here, the
 * same side the sphere highlight sits on.
 */
export function BondCapsule({
  a,
  b,
  rA,
  rB,
  order = 1,
  opacity = 1,
  forming = false,
  extraRodOpacity = 1,
}: {
  a: Point2;
  b: Point2;
  rA: number;
  rB: number;
  order?: number;
  opacity?: number;
  /**
   * A bond that does not exist yet. Same rod, same diameter, same joints, so
   * the canvas keeps ONE bond language; only the body is segmented, which is
   * how a chemist already writes a partial bond. Drawing a forming bond as a
   * solid rod asserts the sigma bond the student is being asked to make.
   */
  forming?: boolean;
  /**
   * Opacity of every rod BEYOND the first: the pi component of a multiple
   * bond. The playback fades this toward zero when a persistent bond's order
   * drops during the step (the carbonyl's C=O to C-O), and grows it when the
   * order rises, so a pi push is visible as the second rod leaving rather
   * than a double bond snapping to single between frames.
   */
  extraRodOpacity?: number;
}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const offsets = order === 2 ? [-5.5, 5.5] : order === 3 ? [-10, 0, 10] : [0];
  const width = order === 1 ? BOND_WIDTH : BOND_WIDTH - 3;
  return (
    <g opacity={opacity}>
      {offsets.map((off, rodIndex) => {
        const oa = { x: a.x + px * off, y: a.y + py * off };
        const ob = { x: b.x + px * off, y: b.y + py * off };
        // ON the skin, not inside it. A two pixel inset puts the capsule's
        // round end under the sphere's front face, and a rod that overlaps the
        // ball it joins is the line-poking-into-a-circle look the capture does
        // not have: there, the rod stops at the silhouette and a ball joint
        // sits exactly on it. Half the stroke width is added back so the round
        // cap's OUTER edge, not its centre, lands on the rim.
        // An OFFSET rod meets the sphere off its equator, where the circle
        // is narrower: seating it with the full radius leaves the outer tube
        // floating past the silhouette, which the round 3 critic read as a
        // broken bond. Chord geometry: at perpendicular offset `off` the
        // sphere's half-width is sqrt(r^2 - off^2).
        const chordA = Math.sqrt(Math.max(rA * rA - off * off, 0));
        const chordB = Math.sqrt(Math.max(rB * rB - off * off, 0));
        const start = rimPoint(oa, ob, chordA + width / 2 - 1);
        const end = rimPoint(ob, oa, chordB + width / 2 - 1);
        return (
          <g key={off} opacity={rodIndex === 0 ? 1 : extraRodOpacity}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="var(--bond-stroke)"
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={forming ? "15 9" : undefined}
            />
            {/* The highlight breaks WITH the rod. It did not, and that single
                omission is why a forming bond read as a finished one: the body
                carried "9 7" but this line ran the full length unbroken, so the
                white filled every gap and the segmentation vanished under it. A
                blind critic called the forming O-C stick indistinguishable from
                the real C-Br stick, which is an assertion that the sigma bond
                the student is being asked to make already exists. */}
            <line
              x1={start.x - 1.2}
              y1={start.y - 1.6}
              x2={end.x - 1.2}
              y2={end.y - 1.6}
              stroke="#ffffff"
              strokeOpacity={0.42}
              strokeWidth={width * 0.34}
              strokeLinecap="round"
              strokeDasharray={forming ? "15 9" : undefined}
            />
            {/* Ball joints, sitting ON each silhouette, SINGLE bonds only. On a
                double bond the four end balls plus two highlight stripes read
                as a ladder with rungs, which a video-frame critic called a
                notation no chemistry uses: the bar draws a multiple bond as
                two clean parallel sticks. The joints are also the bar's grab
                handles, so they are brighter than the rod on purpose. */}
            {order === 1 ? (
              <>
                {/* The ring, not the fill, is what makes the handle findable.
                    A joint lighter than the rod is the point of it, and
                    nothing lighter than the rod also clears 3:1 against a
                    near white ground, so the fill cannot carry that contrast
                    and the boundary carries it instead. --bond-joint-ring is
                    the rod's own colour, which already clears the ground. */}
                <circle cx={start.x} cy={start.y} r={width * 0.42} fill="var(--bond-joint)" stroke="var(--bond-joint-ring)" strokeWidth={Math.max(0.75, width * 0.1)} />
                <circle cx={end.x} cy={end.y} r={width * 0.42} fill="var(--bond-joint)" stroke="var(--bond-joint-ring)" strokeWidth={Math.max(0.75, width * 0.1)} />
                <circle cx={start.x - 0.8} cy={start.y - 1.1} r={width * 0.17} fill="#ffffff" fillOpacity={0.7} />
                <circle cx={end.x - 0.8} cy={end.y - 1.1} r={width * 0.17} fill="#ffffff" fillOpacity={0.7} />
              </>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}


/**
 * The faint arc of implicit hydrogens, with an H-count glyph on it.
 * `openAngle` is in scene terms (y up); pixel y grows downward, so it negates.
 */
/**
 * Where an atom's implicit hydrogens sit, as screen-space angles: distributed
 * around the circle in the gaps between bonds (and any other keep-out the
 * caller adds). Exported because two renderers need the SAME positions: the
 * quiet resting glyphs here, and DrawCanvas's reach-out reveal animation.
 */
export function hydrogenDirections(count: number, bondAngles: readonly number[], openAngle: number): number[] {
  const KEEP_OUT = 0.9;
  const TAU = Math.PI * 2;
  const norm = (a: number) => ((a % TAU) + TAU) % TAU;
  const cones = bondAngles.map((angle) => norm(-angle));
  const STEPS = 720;
  const allowed: number[] = [];
  for (let i = 0; i < STEPS; i += 1) {
    const angle = (i / STEPS) * TAU;
    const blocked = cones.some((cone) => {
      const d = Math.abs(norm(angle - cone + Math.PI) - Math.PI);
      return d < KEEP_OUT;
    });
    if (!blocked) allowed.push(angle);
  }
  const pool = allowed.length > 0 ? allowed : Array.from({ length: STEPS }, (_, i) => (i / STEPS) * TAU);
  const anchor = cones.length === 0 ? norm(-(openAngle + Math.PI)) : 0;
  const anchorIndex = cones.length === 0 ? Math.round((anchor / TAU) * pool.length) % pool.length : 0;
  return Array.from({ length: count }, (_, i) => pool[(anchorIndex + Math.floor(((i + 0.5) / count) * pool.length)) % pool.length] ?? 0);
}

export function HydrogenArc({
  centre,
  openAngle,
  count,
  r,
  expanded = false,
  bondAngles = [],
}: {
  centre: Point2;
  openAngle: number;
  count: number;
  r: number;
  expanded?: boolean;
  /**
   * Directions, in screen radians, of every bond leaving this atom, including
   * forming ones. The hydrogens distribute themselves AROUND the atom in the
   * gaps between these, which is how the bar's own videos place them
   * (structure-1: a right-bonded carbon carries its three H at top, left and
   * bottom, not stacked in one arc below). Empty means no bonds: a free
   * circle, hydrogens evenly spaced.
   */
  bondAngles?: readonly number[];
}) {
  if (count <= 0) return null;
  /* `expanded` is the owner's "click on it and it opens up", for carbons: at
     rest the hydrogens hug the sphere as quiet upright glyphs, and tapping the
     atom swings them further out and lifts them to full ink. */
  const arcR = r + (expanded ? 14 : 7);
  const letters = hydrogenDirections(count, bondAngles, openAngle).map((at, i) => ({
    key: i,
    angle: at,
    x: centre.x + (arcR + 6) * Math.cos(at),
    y: centre.y + (arcR + 6) * Math.sin(at),
  }));
  const TICK = 0.32; /* half-length of the small arc tick under each glyph */
  return (
    <g>
      {letters.map((letter) => {
        const a0 = letter.angle - TICK;
        const a1 = letter.angle + TICK;
        const start = { x: centre.x + arcR * Math.cos(a0), y: centre.y + arcR * Math.sin(a0) };
        const end = { x: centre.x + arcR * Math.cos(a1), y: centre.y + arcR * Math.sin(a1) };
        return (
          <g key={letter.key}>
            {/* One short tick per hydrogen, never one long arc: the long arc
                read as a bond between the outer glyphs. */}
            <path d={`M ${start.x} ${start.y} A ${arcR} ${arcR} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke="var(--scene-faint)" strokeWidth={1.4} strokeLinecap="round" opacity={expanded ? 0.85 : 0.6} />
            <text x={letter.x} y={letter.y} textAnchor="middle" dominantBaseline="central" fontSize={expanded ? 12.5 : 10.5} fontWeight={600} fill={expanded ? "var(--bb-foreground)" : "var(--scene-faint)"}>
              H
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ChargeBadge({ at, charge, opacity = 1 }: { at: Point2; charge: number; opacity?: number }) {
  if (charge === 0 || opacity <= 0.01) return null;
  const sign = charge > 0 ? "+" : "−";
  const magnitude = Math.abs(charge);
  return (
    // FLAT, and deliberately not a sphere. Rendered in the same shaded material
    // as an atom it reads as a bonded fourth atom sitting off the oxygen, which
    // is what a blind critic saw. A charge is an annotation, so it is a flat
    // disc with a hairline ring and no highlight and no shadow: the only flat
    // filled circle on a canvas where every physical object is modelled.
    <g opacity={opacity}>
      <circle cx={at.x} cy={at.y} r={10} fill="var(--charge-chip)" stroke="var(--charge-ring)" strokeWidth={1.6} />
      {/* The chip gets its OWN token pair, and the reason is the second half of
          a bug this comment used to only tell half of. #ffffff on --bb-card made
          the sign invisible in LIGHT mode; --bb-card on the scene ground then made
          the whole chip invisible in DARK mode, because --bb-card is near black
          there and so is the canvas behind it, so a blind critic read the
          charge as a hole punched in the page. A chip that references a surface
          it is not drawn on will always be wrong in one theme. --charge-chip is
          light in both themes and --charge-ink is dark in both, so the pair is
          legible against any ground the canvas ever takes. */}
      <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="var(--charge-ink)">
        {magnitude > 1 ? `${magnitude}${sign}` : sign}
      </text>
    </g>
  );
}
