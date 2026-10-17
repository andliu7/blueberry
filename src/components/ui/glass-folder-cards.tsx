import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { isReducedMotion } from "@/lib/motionPref";
import "./glass-folder-cards.css";

/**
 * Glass folder cards: a frosted folder whose files fan out when you open it.
 *
 * Rebuilt from Kedhareswer Naidu's "Glassmorphism Folder Cards" on 21st.dev (MIT
 * licence), supplied by the owner on 15 Oct 2026. The source was reconstructed from
 * the published preview bundle, so the behaviour, geometry and the art generator are
 * the original's, rewritten with readable names. Blueberry changes: the art presets
 * are recoloured to the Blueberry palette and renamed for what they now look like,
 * the default demo files are gone (a folder shows only what you pass it), and the
 * pointer lean is skipped under reduced motion. Styles live in glass-folder-cards.css.
 *
 * The folder is drawn in a fixed 340 x 272 coordinate space and scaled to `width`,
 * so the clip paths and the fan maths never have to know the real size.
 *
 * Interaction: hover leans the glass toward the pointer and lifts the files a little;
 * click (or Enter) opens it and fans the files out; Escape, a click outside, or Tab
 * moving focus out of it closes it. Closed, the file names peek out above the glass.
 * Each file is a link when it has an `href`, otherwise a button that calls
 * `onFileSelect`. At most four files show; pass the ones that matter most last, since
 * the last file sits on top of the stack.
 */

/* ------------------------------------------------------------------ *
 * Generated art: a seeded noise painting, made once per recipe and size
 * ------------------------------------------------------------------ */

export type ArtRecipe = {
  /** "streak" stretches the noise into long strokes; "marble" folds it into veins. */
  style: "streak" | "marble";
  /** The colour ramp, darkest-to-lightest or in any order; at least two. */
  colors: string[];
  scale?: number;
  warp?: number;
  angle?: number;
  gloss?: number;
  veins?: number;
};

/**
 * The presets, in Blueberry's palette: lavender ground #efeaf8 and its washes, the
 * #5a3fd8 purple, the #4779ee blue and the deep #2e2b45 ink. The original's five
 * (aurora, ember, dusk, glacier, verdant) were cream, red, orange and green; the
 * recipes' shapes are kept and only the colours changed, so each one is renamed.
 */
export const ART_PRESETS = {
  /** Pale lavender streaks, nearly white. The quietest; the original's glacier. */
  lavender: { style: "streak", colors: ["#f7f5fd", "#e2dbf5", "#c9bdf2", "#efeaf8", "#d6dff8", "#ffffff"], scale: 0.7, warp: 1.6, angle: 0.35, gloss: 0.25, veins: 0 },
  /** Lavender into purple and blue streaks, the original's aurora. */
  tide: { style: "streak", colors: ["#f4f0fb", "#c9d6fa", "#4779ee", "#2e2b45", "#5a3fd8", "#9db6f5", "#eef1fb"], scale: 0.7, warp: 1.4, angle: -0.62, gloss: 0.18, veins: 0 },
  /** Deep ink marbled with purple, the original's ember. */
  iris: { style: "marble", colors: ["#1d1b2e", "#2e2b45", "#463a8c", "#241f3d", "#5a3fd8", "#8f7cf0", "#e2dbf5"], scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.55, veins: 0.6 },
  /** Purple marbled with blue, the original's dusk. */
  berry: { style: "marble", colors: ["#1d1b2e", "#3d3370", "#7a68e0", "#2e2b45", "#4779ee", "#b9c8f7", "#f4f0fb"], scale: 0.75, warp: 3.6, angle: 0.8, gloss: 0.5, veins: 0.5 },
  /** Blue marbled into lavender, the original's verdant. */
  night: { style: "marble", colors: ["#141a33", "#22305e", "#4779ee", "#1d1b2e", "#6f5ae0", "#c9bdf2", "#f7f5fd"], scale: 0.7, warp: 3.4, angle: 2.1, gloss: 0.5, veins: 0.5 },
} satisfies Record<string, ArtRecipe>;

export type ArtPreset = keyof typeof ART_PRESETS;
type Art = ArtPreset | ArtRecipe | "none";

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A small seeded random number generator (mulberry32): same seed, same art. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, to turn a file name into a stable seed. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Seeded gradient noise summed over octaves (fractal Brownian motion). */
function makeFbm(seed: number) {
  const random = rng(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  const order: number[] = [];
  for (let i = 0; i < 256; i++) order.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = order[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = random() * Math.PI * 2;
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const g00 = perm[X + perm[Y]] * 2;
    const g10 = perm[X + 1 + perm[Y]] * 2;
    const g01 = perm[X + perm[Y + 1]] * 2;
    const g11 = perm[X + 1 + perm[Y + 1]] * 2;
    const n00 = grad[g00] * fx + grad[g00 + 1] * fy;
    const n10 = grad[g10] * (fx - 1) + grad[g10 + 1] * fy;
    const n01 = grad[g01] * fx + grad[g01 + 1] * (fy - 1);
    const n11 = grad[g11] * (fx - 1) + grad[g11 + 1] * (fy - 1);
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    return n00 + u * (n10 - n00) + v * (n01 - n00 + u * (n11 - n01 - n10 + n00));
  };
  return (x: number, y: number, octaves: number) => {
    let sum = 0;
    let amp = 0.5;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x, y);
      const nx = 1.6 * x + 1.2 * y + 7.1;
      y = -1.2 * x + 1.6 * y + 3.3;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

type ArtJob = { width: number; height: number; pixels: Uint8ClampedArray<ArrayBuffer>; step: (rows: number) => boolean };

/**
 * One painting as a job that runs a few rows at a time, so building it never blocks
 * a frame. The noise field is sampled at half resolution, upsampled with a cubic,
 * then coloured along the ramp with a little light and gloss.
 */
function createArtJob(width: number, height: number, recipe: ArtRecipe, seed: number): ArtJob {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const ramp = recipe.colors.length >= 2 ? recipe.colors : ["#111111", "#eeeeee"];
  const stops = ramp.map((c, i) => ({ t: i / (ramp.length - 1), c: hexToRgb(c) }));
  const scale = recipe.scale ?? 0.7;
  const warp = recipe.warp ?? 3;
  const gloss = recipe.gloss ?? 0.4;
  const veins = recipe.veins ?? 0;
  const streak = recipe.style === "streak";
  const fbm = makeFbm(seed * 977 + 13);
  const random = rng(seed + 1);
  const ox = random() * 50;
  const oy = random() * 50;
  const angle = (recipe.angle ?? 0) + (random() - 0.5) * 0.5;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const unit = Math.min(w, h);
  const cw = Math.ceil(w / 2) + 3;
  const ch = Math.ceil(h / 2) + 3;
  const coarse = new Float32Array(cw * ch);
  const coarseWarp = new Float32Array(cw * ch);
  const field = new Float32Array(w * h);
  const warpField = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  let row = 0;

  const fieldRow = (r: number) => {
    for (let c = 0; c < cw; c++) {
      const u = ((c - 1) * 2 - w / 2) / unit;
      const v = ((r - 1) * 2 - h / 2) / unit;
      let x = (u * cos - v * sin) * scale;
      let y = (u * sin + v * cos) * scale;
      if (streak) {
        x *= 0.14;
        y *= 2.2;
      }
      x += ox;
      y += oy;
      const a = fbm(x, y, 3);
      const b = fbm(x + 5.2, y + 1.3, 3);
      const p = fbm(x + warp * a + 1.7, y + warp * b + 9.2, 3);
      const q = fbm(x + warp * a + 8.3, y + warp * b + 2.8, 3);
      coarse[r * cw + c] = fbm(x + warp * p, y + warp * q, 4);
      coarseWarp[r * cw + c] = Math.sqrt(a * a + b * b);
    }
  };

  const upsample = () => {
    const cubic = (a: number, b: number, c: number, d: number) => (-a + 9 * b + 9 * c - d) / 16;
    const wide = new Float32Array(w * ch);
    for (let r = 0; r < ch; r++) {
      const base = r * cw;
      for (let x = 0; x < w; x++) {
        const m = (x >> 1) + 1;
        wide[r * w + x] = x & 1 ? cubic(coarse[base + m - 1], coarse[base + m], coarse[base + m + 1], coarse[base + m + 2]) : coarse[base + m];
      }
    }
    for (let y = 0; y < h; y++) {
      const o = (y >> 1) + 1;
      for (let x = 0; x < w; x++) {
        field[y * w + x] = y & 1 ? cubic(wide[(o - 1) * w + x], wide[o * w + x], wide[(o + 1) * w + x], wide[(o + 2) * w + x]) : wide[o * w + x];
        const m = (x >> 1) + 1;
        const here = coarseWarp[o * cw + m];
        const top = x & 1 ? (here + coarseWarp[o * cw + m + 1]) / 2 : here;
        const below = y & 1 ? (x & 1 ? (coarseWarp[(o + 1) * cw + m] + coarseWarp[(o + 1) * cw + m + 1]) / 2 : coarseWarp[(o + 1) * cw + m]) : top;
        warpField[y * w + x] = (top + below) / 2;
      }
    }
  };

  const colorize = () => {
    // Normalise on the 2nd to 98th percentile, sampled, so one outlier cannot wash it out.
    const samples: number[] = [];
    const stride = Math.max(1, Math.floor(field.length / 4096));
    for (let i = 0; i < field.length; i += stride) samples.push(field[i]);
    samples.sort((a, b) => a - b);
    const lo = samples[Math.floor(samples.length * 0.02)];
    const k = 1 / (samples[Math.floor(samples.length * 0.98)] - lo || 1);
    const lx = -0.55;
    const ly = -0.65;
    const lz = 0.52;
    const bump = k * unit * 0.012;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let t = (field[i] - lo) * k;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let s = 1;
        while (s < stops.length - 1 && stops[s].t < t) s++;
        const a = stops[s - 1];
        const b = stops[s];
        let f = (t - a.t) / (b.t - a.t || 1);
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        f = f * f * (3 - 2 * f);
        const dx = (field[x < w - 1 ? i + 1 : i] - field[x > 0 ? i - 1 : i]) * bump;
        const dy = (field[y < h - 1 ? i + w : i] - field[y > 0 ? i - w : i]) * bump;
        const light = (-dx * lx - dy * ly + lz) / Math.sqrt(dx * dx + dy * dy + 1);
        const spec = Math.pow(light > 0 ? light : 0, 24) * gloss * 255;
        const grain = 1 + 0.035 * Math.sin(t * 150 + warpField[i] * 24);
        const vein = veins * Math.max(0, 1 - Math.abs(warpField[i] - 0.42) * 14) * 0.6;
        const shade = (0.82 + 0.28 * light) * grain * (1 - vein);
        pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * shade + spec;
        pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * shade + spec;
        pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * shade + spec;
        pixels[i * 4 + 3] = 255;
      }
  };

  return {
    width: w,
    height: h,
    pixels,
    step(rows) {
      if (row >= ch) return true;
      const end = Math.min(ch, row + Math.max(1, rows));
      while (row < end) fieldRow(row++);
      if (row < ch) return false;
      upsample();
      colorize();
      return true;
    },
  };
}

/** Folder backs (priority 0) are painted before file sheets (priority 1). */
type QueueEntry = { job: ArtJob; priority: number; done: (c: HTMLCanvasElement) => void };
const paintCache = new Map<string, Promise<HTMLCanvasElement>>();
const queue: QueueEntry[] = [];
let pumping = false;

/** Runs queued jobs for at most 7ms per frame, so several folders never drop frames. */
function pump() {
  if (pumping) return;
  pumping = true;
  const tick = () => {
    const budget = performance.now() + 7;
    while (queue.length && performance.now() < budget) {
      const entry = queue[0];
      if (entry.job.step(4)) {
        queue.shift();
        const canvas = document.createElement("canvas");
        canvas.width = entry.job.width;
        canvas.height = entry.job.height;
        // No 2-D context (a test DOM, a blocked canvas) leaves the folder its plain gradient.
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.putImageData(new ImageData(entry.job.pixels, canvas.width, canvas.height), 0, 0);
        entry.done(canvas);
      }
    }
    if (queue.length) requestAnimationFrame(tick);
    else pumping = false;
  };
  requestAnimationFrame(tick);
}

/** One painting per recipe, seed and size for the whole page, however many folders ask. */
function paint(recipe: ArtRecipe, seed: number, w: number, h: number, priority: number) {
  const key = JSON.stringify([recipe, seed, w, h]);
  let made = paintCache.get(key);
  if (!made) {
    made = new Promise((resolve) => {
      let at = queue.length;
      while (at > 1 && queue[at - 1].priority > priority) at--;
      queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority, done: resolve });
      pump();
    });
    paintCache.set(key, made);
  }
  return made;
}

const recipeOf = (art: ArtPreset | ArtRecipe): ArtRecipe => (typeof art === "string" ? ART_PRESETS[art] : art);

function ArtCanvas({ art, seed, w, h, density, priority, className }: {
  art: ArtPreset | ArtRecipe;
  seed: number;
  w: number;
  h: number;
  density: number;
  priority: number;
  className: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  // The recipe as a string, so a new object with the same values does not repaint.
  const recipe = JSON.stringify(recipeOf(art));
  const pw = Math.round(w * density);
  const ph = Math.round(h * density);
  useEffect(() => {
    let live = true;
    setReady(false);
    paint(JSON.parse(recipe), seed, pw, ph, priority).then((source) => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.getContext("2d")?.drawImage(source, 0, 0);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [recipe, seed, pw, ph, priority]);
  return <canvas ref={ref} aria-hidden="true" className={className} data-ready={ready || undefined} style={{ width: w, height: h, maxWidth: "none" }} />;
}

/* ------------------------------------------------------------------ *
 * The folder
 * ------------------------------------------------------------------ */

const W = 340;
const H = 272;
/**
 * Head room above the folder for the files that stand up out of it. Closed, the top
 * of the back file sits 44px above the stage and hovered 51px; open, the fan reaches
 * 64px above it, and the file under the pointer lifts 18px more, into the gap above.
 * Keep in step with the --gf-lift and --gf-stack values in glass-folder-cards.css.
 */
const HEAD = 64;
const POCKET_TOP = 74;
const POCKET_H = H - POCKET_TOP;
const SHEET_W = 272;
const SHEET_H = 184;
const MAX_SHEETS = 4;
const BACK_PATH = "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
const FRONT_PATH = `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${POCKET_H - 22}A22 22 0 0 1 318 ${POCKET_H}L22 ${POCKET_H}A22 22 0 0 1 0 ${POCKET_H - 22}Z`;

/** Where a file sits in the fan: -1 at the left, 1 at the right, 0 when alone. */
const fanSlot = (i: number, n: number) => (n <= 1 ? 0 : (i / (n - 1)) * 2 - 1);

export type GlassFile = {
  name: string;
  meta?: string;
  art?: ArtPreset | ArtRecipe;
  image?: string;
  /** A link: the sheet is an <a>, so it opens like any link (middle click included). */
  href?: string;
};

export type GlassMenuItem = { label: string; danger?: boolean; onSelect?: () => void };

export type GlassFolderProps = {
  label?: string;
  /** Under the label. Defaults to "N items". */
  meta?: string;
  tone?: "light" | "dark";
  art?: Art;
  seed?: number;
  image?: string;
  files?: GlassFile[];
  /** The key in the corner: "add" a file, "more" opens a menu, "none" draws no key. */
  action?: "add" | "more" | "none";
  onAdd?: (files: GlassFile[]) => GlassFile | void;
  onFilesChange?: (files: GlassFile[]) => void;
  menu?: GlassMenuItem[];
  labelPlacement?: "bottom-left" | "top-left" | "top-right";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFileSelect?: (file: GlassFile, index: number) => void;
  width?: number;
  /** Assemble when scrolled into view. Off means it is simply there. */
  appear?: boolean;
  appearDelay?: number;
  className?: string;
  style?: CSSProperties;
};

/** The files as a string, to notice when the caller hands over a different list. */
const filesKey = (files: GlassFile[]) => JSON.stringify(files.map((f) => [f.name, f.meta, f.href, f.image, f.art]));

export function GlassFolder({
  label = "My Files",
  meta,
  tone = "light",
  art = "tide",
  seed = 3,
  image,
  files = [],
  action = "add",
  onAdd,
  onFilesChange,
  menu = [],
  labelPlacement = "bottom-left",
  open,
  defaultOpen = false,
  onOpenChange,
  onFileSelect,
  width = W,
  appear = true,
  appearDelay = 0,
  className,
  style,
}: GlassFolderProps) {
  // useId gives a page-unique id per folder, for the SVG gradient and the menu's aria link.
  const uid = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const keyRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState(files);
  // Stable keys per file, so a dropped-in file animates and the others do not remount.
  const ids = useRef(files.map((_, i) => i));
  const nextId = useRef(files.length);
  // React pattern, "adjust state while rendering": when the caller passes a different
  // list (decks finished loading, say), take it over now instead of in an effect,
  // so the stale list is never painted.
  const [seenKey, setSeenKey] = useState(() => filesKey(files));
  const incomingKey = filesKey(files);
  if (incomingKey !== seenKey) {
    setSeenKey(incomingKey);
    setItems(files);
    ids.current = files.map((_, i) => i);
    nextId.current = files.length;
  }

  const [dropped, setDropped] = useState<number | null>(null);
  const [bumps, setBumps] = useState(0);
  // Controlled or uncontrolled, like an <input>: `open` wins when given.
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const isOpen = open ?? ownOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [entered, setEntered] = useState(!appear);

  const k = width / W;
  const density = Math.min(1.5, Math.max(1, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1)) * k;

  // Assemble once, the first time a quarter of it is on screen.
  useEffect(() => {
    if (!appear) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined" || isReducedMotion()) {
      setEntered(true);
      return;
    }
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          timer = window.setTimeout(() => setEntered(true), appearDelay);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [appear, appearDelay]);

  // The lean: pointer position written to two CSS variables, at most once a frame.
  // Not React state, so moving the mouse never re-renders. Mouse and pen only.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const write = () => {
      raf = 0;
      el.style.setProperty("--gf-px", px.toFixed(3));
      el.style.setProperty("--gf-py", py.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch" || isReducedMotion()) return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const leave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(write);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // A closed folder's files are out of the tab order and unclickable.
  useEffect(() => {
    filesRef.current?.toggleAttribute("inert", !isOpen);
  }, [isOpen]);

  // Escape closes the menu, then the folder; a press outside closes either.
  useEffect(() => {
    if (!isOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        keyRef.current?.focus();
      } else {
        setOpen(false);
        hitRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuOpen && !menuRef.current?.contains(target) && !keyRef.current?.contains(target)) setMenuOpen(false);
      if (isOpen && !menuOpen && !rootRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [isOpen, menuOpen, setOpen]);

  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [menuOpen]);

  const addFile = () => {
    const file = onAdd?.(items) || { name: `Untitled ${items.length + 1}`, meta: "Just now" };
    const next = [...items, file];
    const id = nextId.current++;
    ids.current = [...ids.current, id];
    setItems(next);
    setDropped(id);
    setBumps((b) => b + 1);
    onFilesChange?.(next);
  };

  const menuItems: GlassMenuItem[] = [{ label: isOpen ? "Close folder" : "Open folder", onSelect: () => setOpen(!isOpen) }, ...menu];

  const onMenuKey = (e: React.KeyboardEvent) => {
    const all = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const at = all.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      all[(i + all.length) % all.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(all.length - 1);
    else if (e.key === "Tab") setMenuOpen(false);
  };

  const first = Math.max(0, items.length - MAX_SHEETS);
  const shown = items.slice(first);
  const count = items.length;
  const metaText = meta ?? `${count} ${count === 1 ? "item" : "items"}`;
  // The meta line rolls in only when it changes after the first paint (owner rule:
  // nothing animates on first page paint). Same "adjust state while rendering"
  // pattern as the file list above: the change is noticed here, not in an effect.
  const [seenMeta, setSeenMeta] = useState(metaText);
  const [metaRolls, setMetaRolls] = useState(false);
  if (metaText !== seenMeta) {
    setSeenMeta(metaText);
    setMetaRolls(true);
  }
  // Read aloud as "10 decks, 332 cards" rather than "10 decks dot 332 cards".
  const spokenMeta = metaText.replace(/\s*·\s*/g, ", ");

  return (
    <div
      ref={rootRef}
      className={"gf-root" + (className ? " " + className : "")}
      data-tone={tone}
      data-open={isOpen || undefined}
      data-entered={entered || undefined}
      data-place={labelPlacement}
      // appear={false} means "simply there": the art also arrives without its fade.
      data-still={!appear || undefined}
      style={{ width, height: (H + HEAD) * k, ...style }}
      // A closed folder's files peek out but are inert, so a press on them lands
      // here and opens the folder, as a press on the glass does. Keyboard users have
      // the glass button itself.
      onClick={(e) => {
        if (!isOpen && !hitRef.current?.contains(e.target as Node) && !keyRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(true);
      }}
      // Tab moving focus out of an open folder closes it, so an open fan is never
      // left behind. Only a real move to another element counts: relatedTarget is
      // null for a press on blank space, which the outside-press handler covers.
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (isOpen && next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <div className="gf-stage" style={{ transform: `translateY(${HEAD * k}px) scale(${k})` }}>
        <div className="gf-tilt">
          <div className="gf-shadow" aria-hidden="true" />
          <div className="gf-back" style={{ clipPath: `path('${BACK_PATH}')` }} aria-hidden="true">
            {image ? (
              <img className="gf-art" src={image} alt="" width={W + 24} height={H + 24} draggable={false} />
            ) : art !== "none" ? (
              <ArtCanvas className="gf-art" art={art} seed={seed} w={W + 24} h={H + 24} density={density} priority={0} />
            ) : null}
            <div className="gf-back-sheen" />
          </div>
          <svg className="gf-rim gf-back-rim" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <path d={BACK_PATH} />
          </svg>

          {/* The front pocket is keyed on the bump count, so adding a file remounts it
              and replays its squash animation. */}
          <div key={bumps} className={"gf-front" + (bumps ? " gf-front--bump" : "")} style={{ clipPath: `path('${FRONT_PATH}')` }}>
            <div className="gf-tint" aria-hidden="true" />
            <div className="gf-spec" aria-hidden="true" />
            <svg className="gf-rim gf-front-rim" viewBox={`0 0 ${W} ${POCKET_H}`} aria-hidden="true">
              <defs>
                <linearGradient id={`gf-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="0.35" stopColor="#fff" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
                </linearGradient>
              </defs>
              <path d={FRONT_PATH} stroke={`url(#gf-rim-${uid})`} />
            </svg>
            <button
              ref={hitRef}
              type="button"
              className="gf-hit"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Close" : "Open"} ${label}, ${spokenMeta}`}
              onClick={() => {
                setMenuOpen(false);
                setOpen(!isOpen);
              }}
            />
            <div className="gf-label">
              <span className="gf-title">{label}</span>
              {/* Keyed on the text, so a new value remounts the span and replays the roll. */}
              <span key={metaText} className={"gf-meta" + (metaRolls ? " gf-meta--roll" : "")}>
                {metaText}
              </span>
            </div>
          </div>

          <div ref={filesRef} className="gf-files" role="list" aria-label={`${label} contents`}>
            {shown.map((file, i) => {
              const id = ids.current[first + i];
              const jitter = rng(hashString(file.name) + id);
              const hasArt = !!(file.art || file.image);
              const body = (
                <>
                  {hasArt ? (
                    file.image ? (
                      <img className="gf-sheet-art" src={file.image} alt="" width={SHEET_W} height={SHEET_H} draggable={false} />
                    ) : (
                      <ArtCanvas className="gf-sheet-art" art={file.art!} seed={hashString(file.name) % 997} w={SHEET_W} h={SHEET_H} density={Math.min(density, 1.25)} priority={1} />
                    )
                  ) : (
                    <span className="gf-lines" aria-hidden="true">
                      <i style={{ width: "86%" }} />
                      <i style={{ width: "92%" }} />
                      <i style={{ width: "64%" }} />
                      <i style={{ width: "88%" }} />
                      <i style={{ width: "42%" }} />
                    </span>
                  )}
                  <span className="gf-sheet-head">
                    <span className="gf-sheet-name">{file.name}</span>
                    {file.meta ? <span className="gf-sheet-meta">{file.meta}</span> : null}
                  </span>
                </>
              );
              const sheet = {
                className: "gf-sheet" + (hasArt ? " gf-sheet--art" : "") + (id === dropped ? " gf-sheet--drop" : ""),
                style: {
                  "--gf-slot": fanSlot(i, shown.length),
                  "--gf-depth": shown.length - 1 - i,
                  "--gf-jx": ((jitter() - 0.5) * 10).toFixed(2) + "px",
                  "--gf-jr": ((jitter() - 0.5) * 3.2).toFixed(2) + "deg",
                  zIndex: i + 1,
                } as CSSProperties,
                onAnimationEnd: id === dropped ? () => setDropped(null) : undefined,
              };
              return (
                <div key={id} role="listitem" className="gf-sheet-slot">
                  {file.href ? (
                    <a {...sheet} href={file.href} onClick={() => onFileSelect?.(file, first + i)}>
                      {body}
                    </a>
                  ) : (
                    <button {...sheet} type="button" onClick={() => onFileSelect?.(file, first + i)}>
                      {body}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {action !== "none" ? (
            <button
              ref={keyRef}
              type="button"
              className={`gf-key gf-key--${action}`}
              aria-label={action === "add" ? `Add a file to ${label}` : `More options for ${label}`}
              aria-haspopup={action === "more" ? "menu" : undefined}
              aria-expanded={action === "more" ? menuOpen : undefined}
              aria-controls={action === "more" ? `gf-menu-${uid}` : undefined}
              onClick={() => (action === "add" ? addFile() : setMenuOpen((m) => !m))}
            >
              {action === "add" ? (
                <svg key={bumps} className="gf-glyph gf-glyph--plus" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4.5v15M4.5 12h15" />
                </svg>
              ) : (
                <svg className="gf-glyph gf-glyph--more" viewBox="0 0 30 12" aria-hidden="true">
                  <rect x="1" y="1.5" width="8" height="9" rx="3.4" />
                  <rect x="11" y="1.5" width="8" height="9" rx="3.4" />
                  <rect x="21" y="1.5" width="8" height="9" rx="3.4" />
                </svg>
              )}
            </button>
          ) : null}

          {action === "more" ? (
            <div ref={menuRef} id={`gf-menu-${uid}`} role="menu" aria-label={`${label} options`} className="gf-menu" data-open={menuOpen || undefined} onKeyDown={onMenuKey}>
              {menuItems.map((item, i) => (
                <button
                  key={item.label + i}
                  type="button"
                  role="menuitem"
                  tabIndex={menuOpen ? -1 : undefined}
                  disabled={!menuOpen}
                  className={"gf-menu-item" + (item.danger ? " gf-menu-item--danger" : "")}
                  onClick={() => {
                    setMenuOpen(false);
                    keyRef.current?.focus();
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GlassFolder;
