// Paints the treasure chest of the opening from a small 3-D model, so the shading,
// the hinged lid and the inside all come from one light and one camera instead of
// from hand-placed rectangles. Our own model: no reference art goes in.
//
//   node scripts/gen-chest-model.mjs
//
// Writes src/game/chest/chestPaint.ts (the painted layers, as SVG strings) and
// src/game/chest/chestPaint.css (the colour ramps, so no hex lands in a .tsx).
// Do not hand-edit either file; change this one and run it again.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/game/chest");

/* ---------------------------------------------------------- the camera -- */

const YAW = (21 * Math.PI) / 180;
const PITCH = (26 * Math.PI) / 180;
const FOCAL = 1250;
const cy = Math.cos(YAW);
const sy = Math.sin(YAW);
const cp = Math.cos(PITCH);
const sp = Math.sin(PITCH);

function view([x, y, z]) {
  const xr = x * cy - z * sy;
  const zr = x * sy + z * cy;
  return { x: xr, y: -y * cp + zr * sp, depth: zr * cp + y * sp };
}
function project(p) {
  const v = view(p);
  const k = FOCAL / (FOCAL - v.depth);
  return { x: v.x * k, y: v.y * k, depth: v.depth, k };
}

const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((c) => c / l);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Towards the camera, in model space. */
const TO_CAMERA = norm([sy * cp, sp, cy * cp]);
const LIGHT = norm([-0.5, 0.78, 0.55]);
const FILL = norm([0.8, 0.15, 0.55]);
const HALF = norm(add(LIGHT, TO_CAMERA));

/* ----------------------------------------------------------- the paint -- */

const RAMP_STEPS = 20;
const RAMPS = {
  w: ["#1c0b04", "#42200d", "#713c16", "#a86325", "#d48f45", "#f0bb78"],
  m: ["#2f1900", "#6b4104", "#b0750c", "#e6a91e", "#ffd64f", "#fff0a0", "#fffdf0"],
  g: ["#120603", "#3a1806", "#7c430b", "#c67a14", "#f6b02c", "#ffe690"],
};
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rampColour(stops, t) {
  const at = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  const u = at - i;
  return `#${a.map((c, n) => Math.round(c + (b[n] - c) * u).toString(16).padStart(2, "0")).join("")}`;
}
const cls = (ramp, value) => `${ramp}${Math.max(0, Math.min(RAMP_STEPS - 1, Math.round(value * (RAMP_STEPS - 1))))}`;

function woodValue(n, extra = 0) {
  return 0.2 + 0.56 * Math.max(0, dot(n, LIGHT)) + 0.14 * Math.max(0, dot(n, FILL)) + extra;
}
function metalValue(n, extra = 0) {
  const spec = Math.max(0, dot(n, HALF)) ** 26;
  return 0.16 + 0.42 * Math.max(0, dot(n, LIGHT)) + 0.1 * Math.max(0, dot(n, FILL)) + 0.62 * spec + extra;
}

/* --------------------------------------------------------- the drawing -- */

const round = (n) => Math.round(n * 10) / 10;
const seen = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
function note(p) {
  seen.minX = Math.min(seen.minX, p.x);
  seen.maxX = Math.max(seen.maxX, p.x);
  seen.minY = Math.min(seen.minY, p.y);
  seen.maxY = Math.max(seen.maxY, p.y);
}

class Layer {
  constructor() {
    this.items = [];
  }
  poly(points, name, bias = 0) {
    const projected = points.map(project);
    projected.forEach(note);
    const depth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length + bias;
    this.items.push({ kind: "poly", name, depth, d: `M${projected.map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}Z` });
  }
  line(points, name, bias = 0) {
    const projected = points.map(project);
    const depth = projected.reduce((sum, p) => sum + p.depth, 0) / projected.length + bias;
    this.items.push({ kind: "line", name, depth, d: `M${projected.map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}` });
  }
  dot(point, r, name, bias = 0) {
    const p = project(point);
    this.items.push({ kind: "dot", name, depth: p.depth + bias, x: round(p.x), y: round(p.y), r: round(r * p.k) });
  }
  raw(markup, depth) {
    this.items.push({ kind: "raw", depth, markup });
  }
  /** Serialises, joining runs of one colour into one path. */
  svg(sort = false) {
    const items = sort ? [...this.items].sort((a, b) => a.depth - b.depth) : this.items;
    let out = "";
    let run = null;
    const flush = () => {
      if (run !== null) out += `<path class="${run.name}" d="${run.d}"/>`;
      run = null;
    };
    for (const item of items) {
      if (item.kind === "raw") {
        flush();
        out += item.markup;
      } else if (item.kind === "dot") {
        flush();
        out += `<circle class="${item.name}" cx="${item.x}" cy="${item.y}" r="${item.r}"/>`;
      } else if (run !== null && run.name === item.name) {
        run.d += item.d;
      } else {
        flush();
        run = { name: item.name, d: item.d };
      }
    }
    flush();
    return out;
  }
}

/** One seeded random stream: the same chest on every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A grid of tiles across a flat rectangle, `o` + s*u + t*v, each shaded on its own. */
function tiles(layer, o, u, v, nu, nv, paint, bias = 0) {
  for (let i = 0; i < nu; i += 1) {
    for (let j = 0; j < nv; j += 1) {
      const a = i / nu;
      const b = (i + 1) / nu;
      const c = j / nv;
      const d = (j + 1) / nv;
      const at = (s, t) => add(add(o, u, s), v, t);
      layer.poly([at(a, c), at(b, c), at(b, d), at(a, d)], paint((a + b) / 2, (c + d) / 2), bias);
    }
  }
}

const BOX = { halfW: 100, halfD: 60, h: 92, wall: 9, floor: 16 };
const LID = { rise: 50, wall: 8, over: 3 };

/** Planks on a wall, with bevels, seams and grain. `at(s, t)` maps 0..1 to the wall. */
function planks(layer, at, n, count, random, lengthUnits) {
  const lift = (s, t) => at(s, t);
  for (let p = 0; p < count; p += 1) {
    const t0 = p / count;
    const t1 = (p + 1) / count;
    const tone = (random() - 0.5) * 0.09;
    const bevel = 2.4 / (lengthUnits.height / count) / count;
    const columns = 5;
    for (let c = 0; c < columns; c += 1) {
      const s0 = c / columns;
      const s1 = (c + 1) / columns;
      const mid = (t0 + t1) / 2;
      // The face falls off from the light and darkens toward the ground.
      const fall = 0.1 * (0.5 - (s0 + s1) / 2) + 0.17 * (mid - 0.5);
      const wander = (random() - 0.5) * 0.02;
      layer.poly([lift(s0, t0 + bevel), lift(s1, t0 + bevel), lift(s1, t1 - bevel), lift(s0, t1 - bevel)], cls("w", woodValue(n, tone + fall + wander)));
      layer.poly([lift(s0, t1 - bevel), lift(s1, t1 - bevel), lift(s1, t1), lift(s0, t1)], cls("w", woodValue(n, tone + fall + 0.2)));
      layer.poly([lift(s0, t0), lift(s1, t0), lift(s1, t0 + bevel), lift(s0, t0 + bevel)], cls("w", woodValue(n, tone + fall - 0.2)));
    }
    // The seam under the plank.
    layer.line([lift(0, t0), lift(1, t0)], "seam");
    // Grain runs with the plank and wanders.
    const strands = 5;
    for (let g = 0; g < strands; g += 1) {
      const base = t0 + bevel * 1.4 + ((t1 - t0 - bevel * 2.8) * (g + 0.5)) / strands;
      const phase = random() * 6.28;
      const rate = 1.4 + random() * 2.4;
      const depth = (t1 - t0) * 0.09;
      const start = random() * 0.25;
      const end = 0.75 + random() * 0.25;
      const line = [];
      for (let k = 0; k <= 7; k += 1) {
        const s = start + ((end - start) * k) / 7;
        line.push(lift(s, base + Math.sin(phase + s * rate * 6.28) * depth));
      }
      layer.line(line, g % 2 === 0 ? "gr" : "gl");
    }
    // A knot on some planks.
    if (random() > 0.45) {
      const ks = 0.2 + random() * 0.6;
      const kt = (t0 + t1) / 2;
      const ring = (ra, rb) => {
        const pts = [];
        for (let k = 0; k <= 10; k += 1) {
          const angle = (k / 10) * Math.PI * 2;
          pts.push(lift(ks + Math.cos(angle) * ra, kt + Math.sin(angle) * rb));
        }
        return pts;
      };
      layer.line(ring(0.03, (t1 - t0) * 0.2), "gr");
      layer.line(ring(0.014, (t1 - t0) * 0.1), "gr");
    }
  }
}

/** A raised metal band across a wall, rounded across its width so it holds a highlight. */
function strap(layer, a, b, across, outward, count, opts = {}) {
  // a to b is the band's centre line. `across` is half its width, `outward` the wall's normal scaled by the raise.
  const n0 = norm(outward);
  const side = norm(across);
  const lengthwise = opts.segments ?? 12;
  for (let i = 0; i < count; i += 1) {
    const s0 = (i / count) * 2 - 1;
    const s1 = ((i + 1) / count) * 2 - 1;
    const mid = (s0 + s1) / 2;
    const n = norm(add(n0, side, mid * 0.75));
    for (let j = 0; j < lengthwise; j += 1) {
      const t0 = j / lengthwise;
      const t1 = (j + 1) / lengthwise;
      const at = (s, t) => add(add(add(a, add(b, a, -1), t), across, s), outward);
      // A band of reflected sky runs down the metal, so it reads as polished.
      const sheen = 0.09 * Math.sin((t0 + t1) * 3.3 + 0.6) + (opts.extra ?? 0);
      layer.poly([at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)], cls("m", metalValue(n, sheen)), opts.bias ?? 0);
    }
  }
  // Its lit lip and its shaded lip.
  const lip = (s, name) => {
    layer.line([add(add(a, across, s), outward), add(add(b, across, s), outward)], name, (opts.bias ?? 0) + 0.2);
  };
  lip(-1, "mhi");
  lip(1, "mlo");
}

function rivet(layer, p, r, bias = 0) {
  layer.dot(add(p, [0.25, -0.6, 0]), r * 1.25, "rv0", bias);
  layer.dot(p, r, "m13", bias + 0.01);
  layer.dot(add(p, [-0.35, 0.4, 0]), r * 0.5, "m19", bias + 0.02);
}

/* -------------------------------------------------------------- the box -- */

function drawBox() {
  const layer = new Layer();
  const { halfW: W, halfD: D, h: H } = BOX;
  const random = rng(11);

  // The plinth under the box, so the walls do not simply stop.
  tiles(layer, [-W - 3, 0, D + 3], [2 * W + 6, 0, 0], [0, 7, 0], 8, 1, () => cls("w", 0.18));
  tiles(layer, [W + 3, 0, D + 3], [0, 0, -2 * D - 6], [0, 7, 0], 5, 1, () => cls("w", 0.11));

  // The right wall, in shade.
  const right = [1, 0, 0];
  planks(layer, (s, t) => [W, 5 + t * (H - 5), D - s * 2 * D], right, 3, random, { height: H });
  // The front wall, in the light.
  const front = [0, 0, 1];
  planks(layer, (s, t) => [-W + s * 2 * W, 5 + t * (H - 5), D], front, 3, random, { height: H });

  // Metal: the straps go first, the rim bands over them.
  for (const x of [-60, 60]) {
    strap(layer, [x, 0, D], [x, H, D], [13, 0, 0], [0, 0, 3.4], 6);
    for (const y of [20, 42, 64]) {
      rivet(layer, [x - 7.5, y, D + 3.8], 2.3);
      rivet(layer, [x + 7.5, y, D + 3.8], 2.3);
    }
  }
  strap(layer, [W, 0, 0], [W, H, 0], [0, 0, -13], [3.4, 0, 0], 5);
  for (const y of [20, 42, 64]) {
    rivet(layer, [W + 3.8, y, -7], 2.1);
    rivet(layer, [W + 3.8, y, 7], 2.1);
  }
  // Bands round the top and the foot of the walls.
  const band = (y0, y1, extra) => {
    strap(layer, [-W - 2, (y0 + y1) / 2, D], [W + 2, (y0 + y1) / 2, D], [0, (y0 - y1) / 2, 0], [0, 0, 4.2], 4, { segments: 12, extra });
    strap(layer, [W, (y0 + y1) / 2, D + 2], [W, (y0 + y1) / 2, -D - 2], [0, (y0 - y1) / 2, 0], [4.2, 0, 0], 4, { segments: 6, extra: extra - 0.05 });
  };
  band(0, 10, -0.12);
  band(H - 11, H, 0.02);
  // The corner cap, where the two bands meet: square, thick, riveted.
  tiles(layer, [W - 9, 0, D + 4.2], [13.2, 0, 0], [0, H, 0], 3, 12, (s, t) => cls("m", metalValue(norm([s * 0.9 - 0.2, 0, 1]), 0.08 * Math.sin(t * 6.6))));
  tiles(layer, [W + 4.2, 0, D + 4.2], [0, 0, -13], [0, H, 0], 3, 12, (s, t) => cls("m", metalValue(norm([1, 0, 0.5 - s]), 0.07 * Math.sin(t * 6.6))));
  tiles(layer, [-W - 4.2, 0, D + 4.2], [13, 0, 0], [0, H, 0], 3, 12, (s, t) => cls("m", metalValue(norm([s * 0.9 - 0.5, 0, 1]), 0.08 * Math.sin(t * 6.6))));
  for (const y of [18, H / 2, H - 20]) {
    rivet(layer, [W - 2.5, y, D + 4.8], 2);
    rivet(layer, [-W + 2.5, y, D + 4.8], 2);
  }

  return layer;
}

/** The lock plate, fixed to the box. Stays on when the lid goes. */
function drawPlate() {
  const layer = new Layer();
  const { halfD: D, h: H } = BOX;
  const z = D + 5.6;
  const outline = [
    [-17, H + 0.5],
    [17, H + 0.5],
    [20, H - 8],
    [20, H - 30],
    [12, H - 42],
    [0, H - 48],
    [-12, H - 42],
    [-20, H - 30],
    [-20, H - 8],
  ];
  layer.poly(outline.map(([x, y]) => [x + 1.2, y - 1.6, z - 1.2]), "rv0");
  layer.poly(outline.map(([x, y]) => [x, y, z]), cls("m", 0.56));
  // A raised middle, lit from the upper left.
  const inner = outline.map(([x, y]) => [x * 0.82, H - 22 + (y - (H - 22)) * 0.84, z + 0.5]);
  layer.poly(inner, cls("m", 0.82));
  layer.poly([inner[0], inner[1], inner[8].map((c, i) => (i === 0 ? 8 : c))], cls("m", 0.96));
  layer.poly([[1, H - 16, z + 0.7], [17, H - 12, z + 0.7], [15, H - 34, z + 0.7], [0, H - 42, z + 0.7]], cls("m", 0.66));
  // The keyhole.
  layer.dot([0, H - 21, z + 0.8], 4.8, "rv0");
  layer.poly([[-2.6, H - 22, z + 0.8], [2.6, H - 22, z + 0.8], [4, H - 34, z + 0.8], [-4, H - 34, z + 0.8]], "rv0");
  for (const [x, y] of [[-14, H - 6], [14, H - 6], [-14, H - 30], [14, H - 30]]) rivet(layer, [x, y, z + 0.9], 1.8);
  return layer;
}

/* ----------------------------------------------------------- the inside -- */

function drawInside() {
  const layer = new Layer();
  const { halfW: W, halfD: D, h: H, wall, floor } = BOX;
  const iW = W - wall;
  const iD = D - wall;
  // Light rises from the gold, so the walls brighten toward it and toward the middle.
  const glowBack = (s, t) => cls("g", 0.1 + 0.62 * (1 - t) ** 1.5 + 0.22 * (1 - Math.abs(s - 0.5) * 2) * (1 - t * 0.7));
  const glowSide = (s, t) => cls("g", 0.06 + 0.56 * (1 - t) ** 1.5 + 0.2 * s * (1 - t));
  tiles(layer, [-iW, floor, -iD], [2 * iW, 0, 0], [0, H - floor, 0], 10, 8, glowBack);
  tiles(layer, [-iW, floor, iD], [0, 0, -2 * iD], [0, H - floor, 0], 6, 8, (s, t) => glowSide(1 - s, t));
  tiles(layer, [-iW, floor, iD], [2 * iW, 0, 0], [0, 0, -2 * iD], 4, 3, () => cls("g", 0.5));
  // The plank seams on the inner walls, in dark.
  for (const y of [floor + 25, floor + 51]) {
    layer.line([[-iW, y, -iD], [iW, y, -iD]], "seam");
    layer.line([[-iW, y, iD], [-iW, y, -iD]], "seam");
  }
  layer.line([[-iW, floor, -iD], [-iW, H, -iD]], "seam");
  return layer;
}

/** The top of the walls: thick wood, then the metal lip, lit from the gold inside. */
function drawRimBack() {
  const layer = new Layer();
  const { halfW: W, halfD: D, h: H, wall } = BOX;
  const iW = W - wall;
  const iD = D - wall;
  const top = [0, 1, 0];
  layer.poly([[-W, H, -D], [W, H, -D], [W, H, -iD], [-W, H, -iD]], cls("w", woodValue(top, 0.1)));
  layer.poly([[-W, H, D], [-W, H, -D], [-iW, H, -D], [-iW, H, D]], cls("w", woodValue(top, 0.12)));
  layer.line([[-iW, H, -iD], [iW, H, -iD]], "ghi");
  layer.line([[-iW, H, iD], [-iW, H, -iD]], "ghi");
  return layer;
}
function drawRimFront() {
  const layer = new Layer();
  const { halfW: W, halfD: D, h: H, wall } = BOX;
  const iW = W - wall;
  const iD = D - wall;
  const top = [0, 1, 0];
  layer.poly([[iW, H, -D], [W, H, -D], [W, H, D], [iW, H, D]], cls("w", woodValue(top, 0.02)));
  layer.poly([[-W, H, iD], [W, H, iD], [W, H, D], [-W, H, D]], cls("w", woodValue(top, 0.14)));
  // The grain on the front lip.
  const random = rng(5);
  for (let i = 0; i < 4; i += 1) {
    const z = iD + 1.2 + i * 1.8;
    const pts = [];
    for (let k = 0; k <= 8; k += 1) pts.push([-W + 2 + ((2 * W - 4) * k) / 8, H, z + Math.sin(k * 0.9 + random() * 2) * 0.5]);
    layer.line(pts, "gr");
  }
  layer.line([[-iW, H, iD], [iW, H, iD]], "ghi");
  layer.line([[iW, H, iD], [iW, H, -iD]], "ghi");
  layer.line([[-W, H, D], [W, H, D]], "mhi");
  return layer;
}

/* -------------------------------------------------------------- the lid -- */

function drawLid(degrees, detail) {
  const layer = new Layer();
  const { halfW: W, halfD: D, h: H } = BOX;
  const theta = (degrees * Math.PI) / 180;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const hinge = (p) => {
    const dz = p[2] + D;
    const dy = p[1] - H;
    return [p[0], H + dz * s + dy * c, -D + dz * c - dy * s];
  };
  const turn = (n) => [n[0], n[2] * s + n[1] * c, n[2] * c - n[1] * s];
  const rise = LID.rise;
  const over = LID.over;
  const STEPS = 12;
  const rimAt = (phi, off = 0) => {
    // A half-round arch across the depth, `off` outward from the surface.
    const n = norm([0, Math.sin(phi) * D, Math.cos(phi) * rise]);
    return { y: H + rise * Math.sin(phi) + n[1] * off, z: D * Math.cos(phi) + n[2] * off, n };
  };
  const visible = (p, n) => dot(n, norm(add(TO_CAMERA.map((c) => c * FOCAL), p, -1))) > 0;
  const quad = (pts, n, name, bias = 0) => {
    const moved = pts.map(hinge);
    const middle = moved.reduce((sum, p) => add(sum, p), [0, 0, 0]).map((v) => v / moved.length);
    if (visible(middle, turn(n))) layer.poly(moved, name, bias);
  };
  const seg = (i) => (i / STEPS) * Math.PI;
  const random = rng(23);
  const litOuter = (n, extra = 0) => woodValue(turn(n), extra);

  // The inside of the arch: dark wood lit from below by the gold.
  for (let i = 0; i < STEPS; i += 1) {
    const a = rimAt(seg(i), -LID.wall);
    const b = rimAt(seg(i + 1), -LID.wall);
    const n = rimAt(seg(i + 0.5)).n.map((v) => -v);
    const near = 1 - i / STEPS; // 1 at the front edge, which swings up highest
    for (let cell = 0; cell < 7; cell += 1) {
      const x0 = -W + 6 + (2 * (W - 6) * cell) / 7;
      const x1 = -W + 6 + (2 * (W - 6) * (cell + 1)) / 7;
      const mid = 1 - Math.abs((x0 + x1) / (2 * (W - 6)));
      const v = 0.16 + 0.6 * (1 - near) ** 1.15 + 0.16 * mid * (1 - near);
      quad([[x0, a.y, a.z], [x1, a.y, a.z], [x1, b.y, b.z], [x0, b.y, b.z]], n, cls("g", v), -2000);
    }
    if (i % 3 === 0 && i > 0) {
      const moved = [[-W + 6, a.y, a.z], [W - 6, a.y, a.z]].map(hinge);
      if (visible(moved[0], turn(n))) layer.line(moved, "seam2", -1500);
    }
  }
  // The inner end walls of the arch.
  for (const [x, nx] of [[-W + 6, 1], [W - 6, -1]]) {
    for (let i = 0; i < STEPS; i += 1) {
      const a = rimAt(seg(i), -LID.wall);
      const b = rimAt(seg(i + 1), -LID.wall);
      quad([[x, H, a.z], [x, a.y, a.z], [x, b.y, b.z], [x, H, b.z]], [nx, 0, 0], cls("g", 0.14 + 0.42 * (i / STEPS)), -1400);
    }
  }

  // The outside of the arch: planks along it, each its own tone.
  for (let i = 0; i < STEPS; i += 1) {
    const plank = Math.floor(i / 3);
    const tone = [0.03, -0.04, 0.05, -0.02][plank] ?? 0;
    const a = rimAt(seg(i));
    const b = rimAt(seg(i + 1));
    const n = rimAt(seg(i + 0.5)).n;
    for (let cell = 0; cell < 3; cell += 1) {
      const x0 = -W - over + (2 * (W + over) * cell) / 3;
      const x1 = -W - over + (2 * (W + over) * (cell + 1)) / 3;
      const fall = 0.06 * (0.5 - (x0 + x1) / (4 * W));
      quad([[x0, a.y, a.z], [x1, a.y, a.z], [x1, b.y, b.z], [x0, b.y, b.z]], n, cls("w", litOuter(n, tone + fall)));
    }
    if (i % 3 === 0 && i > 0) {
      const moved = [[-W - over, a.y, a.z], [W + over, a.y, a.z]].map(hinge);
      if (visible(moved[0], turn(n))) {
        layer.line(moved, "seam", 500);
        const lit = [[-W - over, a.y + 0.9, a.z], [W + over, a.y + 0.9, a.z]].map(hinge);
        layer.line(lit, "gl", 510);
      }
    }
    if (detail) {
      for (let g = 0; g < 2; g += 1) {
        const phi = seg(i + 0.3 + g * 0.4);
        const pts = [];
        const phase = random() * 6;
        const start = -W + random() * 40;
        const end = W - random() * 40;
        for (let k = 0; k <= 6; k += 1) {
          const offset = Math.sin(phase + k) * 0.015;
          const r = rimAt(phi + offset);
          pts.push(hinge([start + ((end - start) * k) / 6, r.y, r.z]));
        }
        if (visible(pts[0], turn(n))) layer.line(pts, g === 0 ? "gr" : "gl", 520);
      }
    }
  }

  // The end of the arch: thick, solid wood.
  for (const [x, nx] of [[W + over, 1], [-W - over, -1]]) {
    for (let i = 0; i < STEPS; i += 1) {
      const a = rimAt(seg(i));
      const b = rimAt(seg(i + 1));
      const mid = (i + 0.5) / STEPS;
      quad([[x, H, a.z], [x, a.y, a.z], [x, b.y, b.z], [x, H, b.z]], [nx, 0, 0], cls("w", litOuter([nx, 0, 0], 0.1 * Math.sin(mid * 3.14) - 0.02)), 600);
    }
  }
  // The two thick edges of the arch, front and back.
  for (const phi of [0, Math.PI]) {
    const n = [0, -1, 0];
    const outer = rimAt(phi);
    const inner = rimAt(phi, -LID.wall);
    quad([[-W - over, H, outer.z], [W + over, H, outer.z], [W + over, H, inner.z], [-W - over, H, inner.z]], n, cls("g", 0.42), 650);
  }

  // Metal over the wood: two straps, the edge bands and the hasp.
  const band = (x0, x1, f0, f1, raise, name, cells, bias, extra = 0) => {
    const steps = Math.max(1, Math.round(((f1 - f0) / Math.PI) * STEPS));
    for (let i = 0; i < steps; i += 1) {
      const pa = f0 + ((f1 - f0) * i) / steps;
      const pb = f0 + ((f1 - f0) * (i + 1)) / steps;
      const a = rimAt(pa, raise);
      const b = rimAt(pb, raise);
      const nBase = rimAt((pa + pb) / 2).n;
      for (let cell = 0; cell < cells; cell += 1) {
        const s0 = cell / cells;
        const s1 = (cell + 1) / cells;
        const across = (s0 + s1) - 1;
        const n = norm(add(nBase, [1, 0, 0], across * 0.75));
        const value = metalValue(turn(n), extra);
        quad(
          [[x0 + (x1 - x0) * s0, a.y, a.z], [x0 + (x1 - x0) * s1, a.y, a.z], [x0 + (x1 - x0) * s1, b.y, b.z], [x0 + (x1 - x0) * s0, b.y, b.z]],
          nBase,
          cls(name, value),
          bias,
        );
      }
    }
  };
  for (const x of [-60, 60]) band(x - 13, x + 13, 0, Math.PI, 3.2, "m", 6, 800);
  band(-W - over - 1, W + over + 1, 0, 0.2, 3.6, "m", 3, 900, -0.04);
  band(-W - over - 1, W + over + 1, Math.PI - 0.2, Math.PI, 3.6, "m", 3, 900, -0.06);
  band(-11, 11, 0, 0.52, 5, "m", 5, 950, 0.02);
  if (detail) {
    for (const x of [-60, 60]) {
      for (const f of [0.55, 1.1, 1.65, 2.2, 2.7]) {
        const r = rimAt(f, 4);
        const n = turn(r.n);
        for (const dx of [-7.5, 7.5]) {
          const p = hinge([x + dx, r.y, r.z]);
          if (visible(p, n)) rivet(layer, p, 2.2, 1000);
        }
      }
    }
    const end = rimAt(0.4, 6);
    const p = hinge([0, end.y, end.z]);
    if (visible(p, turn(end.n))) rivet(layer, p, 2.6, 1000);
  }
  return layer;
}

/* ---------------------------------------------------------- the treasure -- */

const COIN_DEF = `<g id="crc"><path d="M-9 0a9 5.2 0 0 1 18 0v2.6a9 5.2 0 0 1-18 0z" class="cc-edge cc-outline" stroke-width=".9" stroke-linejoin="round"/><ellipse rx="9" ry="5.2" class="cc-rim"/><ellipse cy=".1" rx="6.5" ry="3.6" class="cc-recess"/><ellipse cy=".3" rx="6" ry="3.2" class="cc-face"/><path d="M-5-2.2a6.5 3.4 0 0 1 4-1.6" class="cc-shine" stroke-width="1.2" stroke-linecap="round"/></g>`;
const FACETS = `<path d="M-7-2.5L-3.6-7H3.6L7-2.5 0 8Z" class="jw-1"/><path d="M-3.6-7H3.6L2.6-2.5H-2.6Z" class="jw-2"/><path d="M-7-2.5H-2.6L0 8Z" class="jw-3"/><path d="M7-2.5H2.6L0 8Z" class="jw-4"/><path d="M-7-2.5L-3.6-7H3.6L7-2.5 0 8Z" class="jw-edge" stroke-width="1.1" stroke-linejoin="round"/><path d="M-2.4-5.6H.6L-.6-3.4H-3.2Z" class="jw-shine"/>`;
const DEFS =
  COIN_DEF +
  `<g id="crr" class="jw jw--ruby">${FACETS}</g><g id="cre" class="jw jw--emerald">${FACETS}</g>` +
  `<radialGradient id="cr-mouth" cx=".5" cy=".62" r=".6"><stop offset="0" class="crs-a"/><stop offset=".55" class="crs-b"/><stop offset="1" class="crs-c"/></radialGradient>`;

function drawHoard({ base, height, centerZ, coins, seed, stones }) {
  const layer = new Layer();
  const { halfW: W, halfD: D, wall } = BOX;
  const iW = W - wall - 1;
  const iD = D - wall - 1;
  const surface = (x, z) => base + height * Math.max(0, 1 - (x / iW) ** 2) ** 0.8 * Math.max(0, 1 - ((z - centerZ) / (iD + Math.abs(centerZ))) ** 2) ** 0.8;
  const grad = (x, z) => {
    const e = 2;
    return norm([surface(x - e, z) - surface(x + e, z), 2 * e, surface(x, z - e) - surface(x, z + e)]);
  };
  const NX = 8;
  const NZ = 5;
  for (let j = 0; j < NZ; j += 1) {
    for (let i = 0; i < NX; i += 1) {
      const x0 = -iW + (2 * iW * i) / NX;
      const x1 = -iW + (2 * iW * (i + 1)) / NX;
      const z0 = -iD + (2 * iD * j) / NZ;
      const z1 = -iD + (2 * iD * (j + 1)) / NZ;
      const n = grad((x0 + x1) / 2, (z0 + z1) / 2);
      layer.poly(
        [[x0, surface(x0, z0), z0], [x1, surface(x1, z0), z0], [x1, surface(x1, z1), z1], [x0, surface(x0, z1), z1]],
        cls("m", 0.16 + 0.26 * Math.max(0, dot(n, LIGHT))),
      );
    }
  }
  const random = rng(seed);
  const placed = [];
  for (let i = 0; i < coins; i += 1) {
    // Even across the mound, with no grid in it.
    const angle = i * 2.39996;
    const radius = Math.sqrt((i + 0.5) / coins);
    const x = Math.cos(angle) * radius * iW * 0.96;
    const z = centerZ * 0.3 + Math.sin(angle) * radius * iD * 0.96;
    placed.push({ x, z, y: surface(x, z) + 1.5, kind: "c", turn: (random() - 0.5) * 44, size: 1.32 + random() * 0.34 });
  }
  for (const stone of stones) placed.push({ ...stone, y: surface(stone.x, stone.z) + 7, size: 1.5 });
  const sorted = placed.map((p) => ({ ...p, at: project([p.x, p.y, p.z]) })).sort((a, b) => a.at.depth - b.at.depth);
  let out = "";
  for (const p of sorted) {
    note(p.at);
    const scale = round(p.size * p.at.k * 100) / 100;
    out += `<use href="#${p.kind === "c" ? "crc" : p.kind}" transform="translate(${round(p.at.x)} ${round(p.at.y)})rotate(${round(p.turn)})scale(${scale})"/>`;
  }
  return layer.svg() + out;
}

/* -------------------------------------------------------------- the floor -- */

/** Tufts, pebbles and flowers on the ground round the chest: the ground reads as ground. */
function drawFloor() {
  const random = rng(77);
  let out = "";
  const baseY = project([0, 0, BOX.halfD]).y;
  const items = [];
  for (let i = 0; i < 46; i += 1) {
    const x = (random() - 0.5) * 900;
    const y = baseY - 70 + random() ** 1.5 * 420;
    if (Math.abs(x) < 140 && y < baseY + 26) continue;
    items.push({ x, y, kind: i % 7 === 3 ? "p" : i % 9 === 4 ? "f" : "t" });
  }
  items.sort((a, b) => a.y - b.y);
  for (const { x, y, kind } of items) {
    const k = 0.7 + ((y - (baseY - 70)) / 420) * 0.9;
    const sx = round(x);
    const sy = round(y);
    if (kind === "t") {
      // Three thin blades, each leaning its own way.
      const h = (8 + random() * 7) * k;
      const blade = (dx, lean, tall) =>
        `M${round(sx + dx - 1.5 * k)} ${sy}Q${round(sx + dx + lean * 0.3)} ${round(sy - tall * 0.6)} ${round(sx + dx + lean)} ${round(sy - tall)}Q${round(sx + dx + lean * 0.5 + 1.2 * k)} ${round(sy - tall * 0.5)} ${round(sx + dx + 1.5 * k)} ${sy}Z`;
      out += `<path class="cf-tuft" d="${blade(-3 * k, -3.4 * k, h * 0.74)}${blade(0, 1.2 * k, h)}${blade(3 * k, 4 * k, h * 0.66)}"/>`;
    } else if (kind === "p") {
      const rx = round((6 + random() * 5) * k);
      const ry = round(rx * 0.55);
      out += `<ellipse class="cf-pebble-shade" cx="${sx + 1}" cy="${sy + 1.5}" rx="${rx}" ry="${ry}"/><ellipse class="cf-pebble" cx="${sx}" cy="${sy}" rx="${round(rx * 0.92)}" ry="${round(ry * 0.8)}"/>`;
    } else {
      const r = round(2.6 * k);
      out += `<path class="cf-tuft" d="M${sx - 1} ${sy}V${round(sy - 8 * k)}H${sx + 1}V${sy}Z"/><circle class="cf-flower" cx="${sx}" cy="${round(sy - 9 * k)}" r="${r}"/><circle class="cf-flower-mid" cx="${sx}" cy="${round(sy - 9 * k)}" r="${round(r * 0.42)}"/>`;
    }
  }
  return out;
}

/* ---------------------------------------------------------- put together -- */

const LID_FRAMES = [
  { degrees: 0, slot: "front", detail: true },
  { degrees: 10, slot: "front", detail: true },
  { degrees: 38, slot: "front", detail: false },
  { degrees: 72, slot: "back", detail: false },
  { degrees: 114, slot: "back", detail: false },
  { degrees: 103, slot: "back", detail: true },
];
const lidFrames = LID_FRAMES.map((frame, i) => ({ ...frame, i, svg: drawLid(frame.degrees, frame.detail).svg(true) }));
const lidSlot = (slot) => lidFrames.filter((f) => f.slot === slot).map((f) => `<g class="cr-f cr-f${f.i}">${f.svg}</g>`).join("");

const inside = drawInside().svg();
const rimBack = drawRimBack().svg();
const rimFront = drawRimFront().svg();
const box = drawBox().svg();
const plate = drawPlate().svg();

const stones = [
  { x: -30, z: -6, kind: "crr", turn: -14 },
  { x: 44, z: 6, kind: "cre", turn: 14 },
  { x: 8, z: 18, kind: "crr", turn: 20 },
  { x: -66, z: 10, kind: "cre", turn: -22 },
];
const full = drawHoard({ base: 66, height: 56, centerZ: -6, coins: 62, seed: 3, stones });
const low = drawHoard({ base: 46, height: 37, centerZ: -18, coins: 30, seed: 9, stones: stones.slice(0, 2).map((s) => ({ ...s, z: s.z - 22 })) });
// The mouth, for the glow that lies over the walls and the gold.
const mouthPoints = [
  [-BOX.halfW + BOX.wall, BOX.h, -BOX.halfD + BOX.wall],
  [BOX.halfW - BOX.wall, BOX.h, -BOX.halfD + BOX.wall],
  [BOX.halfW - BOX.wall, BOX.h, BOX.halfD - BOX.wall],
  [-BOX.halfW + BOX.wall, BOX.h, BOX.halfD - BOX.wall],
].map(project);
const mouthGlow = `<path class="cr-mouth" fill="url(#cr-mouth)" d="M${mouthPoints.map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}Z"/>`;

const floor = drawFloor();

const pad = 6;
const vx = Math.floor(seen.minX - pad);
const vy = Math.floor(seen.minY - pad);
const vw = Math.ceil(seen.maxX - seen.minX + pad * 2);
const vh = Math.ceil(seen.maxY - seen.minY + pad * 2);
const share = (p) => ({ x: round(((p.x - vx) / vw) * 1000) / 1000, y: round(((p.y - vy) / vh) * 1000) / 1000 });
const mouthAt = project([0, BOX.h + 8, -6]);
const baseFront = project([0, 0, BOX.halfD + 3]);
const baseBack = project([0, 0, -BOX.halfD - 3]);
const leftAt = project([-BOX.halfW - 4, 0, BOX.halfD]);
const rightAt = project([BOX.halfW + 4, 0, -BOX.halfD]);
const foot = [
  [-BOX.halfW - 4, 0, BOX.halfD + 4],
  [BOX.halfW + 4, 0, BOX.halfD + 4],
  [BOX.halfW + 4, 0, -BOX.halfD - 4],
  [-BOX.halfW - 4, 0, -BOX.halfD - 4],
].map(project);
// The shadow the sun throws: the footprint, slid away from the light, along the ground.
const cast = `M${foot.map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}Z`;
const castFar = `M${[foot[1], { x: foot[1].x + 92, y: foot[1].y - 12 }, { x: foot[2].x + 92, y: foot[2].y - 16 }, foot[2]].map((p) => `${round(p.x)} ${round(p.y)}`).join("L")}Z`;

const ts = `// GENERATED by scripts/gen-chest-model.mjs. Do not edit: change that script and run it.
// The chest of the opening, painted from a small 3-D model under one light. These
// strings are our own static markup. ChestModel.tsx places them.
export const CHEST_VIEW = ${JSON.stringify({ x: vx, y: vy, w: vw, h: vh })} as const;
/** Shares of the drawing's box: where coins leave from, and where the box meets the ground. */
export const CHEST_POINTS = ${JSON.stringify({ mouth: share(mouthAt), baseFront: share(baseFront), baseBack: share(baseBack), left: share(leftAt), right: share(rightAt) })} as const;
/** Lid frames, closed to thrown back, and how far open each is in degrees. */
export const LID_DEGREES = ${JSON.stringify(LID_FRAMES.map((f) => f.degrees))} as const;
export const CHEST_LAYERS = ${JSON.stringify({ defs: DEFS, lidBack: lidSlot("back"), inside, rimBack, mouthGlow, full, low, rimFront, box, plate, lidFront: lidSlot("front"), cast, castFar, floor })} as const;
`;
writeFileSync(resolve(OUT, "chestPaint.ts"), ts);

const rampCss = Object.entries(RAMPS)
  .map(([name, stops]) =>
    Array.from({ length: RAMP_STEPS }, (_unused, i) => {
      const colour = rampColour(stops, i / (RAMP_STEPS - 1));
      return `.${name}${i}{fill:${colour};stroke:${colour}}`;
    }).join(""),
  )
  .join("\n");
const css = `/* GENERATED by scripts/gen-chest-model.mjs: the colour ramps of the painted chest. */
.chest-model path,.chest-model circle{stroke-width:.35;stroke-linejoin:round}
${rampCss}
.chest-model .seam{fill:none;stroke:#120602;stroke-width:1.5;stroke-linecap:round}
.chest-model .seam2{fill:none;stroke:#1c0b04;stroke-opacity:.55;stroke-width:1;stroke-linecap:round}
.chest-model .gr{fill:none;stroke:#1c0b04;stroke-opacity:.42;stroke-width:.7;stroke-linecap:round}
.chest-model .gl{fill:none;stroke:#ffdba8;stroke-opacity:.22;stroke-width:.6;stroke-linecap:round}
.chest-model .ghi{fill:none;stroke:#ffdf80;stroke-width:1.5;stroke-linecap:round}
.chest-model .mhi{fill:none;stroke:#fffbd6;stroke-opacity:.9;stroke-width:.8;stroke-linecap:round}
.chest-model .mlo{fill:none;stroke:#2f1900;stroke-opacity:.85;stroke-width:1.1;stroke-linecap:round}
.chest-model .rv0{fill:#2a1500;stroke:#2a1500}
`;
writeFileSync(resolve(OUT, "chestPaint.css"), css);
console.log("view", vx, vy, vw, vh, "ts bytes", ts.length, "css bytes", css.length);
console.log("points", share(mouthAt), share(baseFront), share(baseBack));
