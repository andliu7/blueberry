"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A word drawn as a swarm of particles that fly in from off screen, hold the
 * letterforms, then scatter and re-form as the next word.
 *
 * Adapted from the supplied component. What changed and why:
 *
 * 1. **It fills its parent instead of being a fixed 1000x500 box.** The intro is
 *    full bleed, so the canvas measures its host through a ResizeObserver and
 *    redraws the current word on resize.
 * 2. **The canvas is cleared, and each particle draws its own trail.** Upstream
 *    faked motion blur by washing the frame with `rgba(0,0,0,0.1)` instead of
 *    clearing it, which only works on a page that is already black. The aurora
 *    and the shader both sit behind this, so it has to stay transparent. Erasing
 *    with `destination-out` looked like the answer and is a trap; see the note
 *    on `Particle.draw`.
 * 3. **Sampling is a 2-D grid, not a 1-D stride over the pixel array.** A stride
 *    big enough to keep the particle count sane on a 1900px canvas samples every
 *    n-th pixel along a row and every pixel down a column, so the word comes out
 *    as vertical streaks. Walking x and y by the same gap gives an even cloud
 *    and makes the count predictable, which matters because upstream's numbers
 *    were tuned for a canvas a third of this size.
 * 4. **Physics scales with the canvas.** Speeds were in pixels per frame against
 *    a 1000px box; at full width the particles took several seconds to cross the
 *    screen. They are now a fraction of the canvas, so a word settles in about
 *    the same time on a phone and on a monitor.
 * 5. **Fixed 60Hz timestep.** Upstream advanced the word every 240 raw frames,
 *    which runs twice as fast on a 120Hz display. Time is accumulated and spent
 *    in fixed steps, so the sequence takes the same wall-clock time everywhere.
 * 6. **Right-click-to-destroy is gone.** It needed `preventDefault` on
 *    `contextmenu` across the whole hero, and silently killing the context menu
 *    on a full-screen element is a bad trade for an easter egg. The pointer
 *    pushes particles around instead, which needs no button and no hijack.
 * 7. Colour is a gradient across the word rather than one random RGB per word.
 *    Random colours are the demo's party trick; this is the front door of the
 *    site and wants the site's own indigo and fuchsia.
 *
 * `words` must be referentially stable. It is an effect dependency, and a fresh
 * array literal on every render would restart the sequence from the first word.
 */

interface Vec {
  x: number;
  y: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ParticleWord {
  /** Also the accessible label, including for a shape. */
  text: string;
  /**
   * How long this beat holds, overriding the sequence's `wordMs`.
   *
   * For the beat that is worth looking at longer than the ones around it. The
   * name resolving out of the swarm is the whole reason the opening exists, and
   * it was getting exactly as long as the two expression changes that follow
   * it, which are variations on a silhouette you have already read.
   */
  holdMs?: number;
  /** Gradient endpoints, read left to right across the word. */
  from: string;
  to: string;
  /**
   * Draw a shape instead of the text.
   *
   * A shape takes its colours from the drawing itself rather than from `from`
   * and `to`: the logo is lit from the upper left and shaded round to a deep
   * violet, and a flat left-to-right gradient would throw that away.
   */
  shape?: "blueberry";
  /**
   * The berry's expression, when `shape` is set.
   *
   * `shut` is the safe one and the default. An open eye is a solid dark oval,
   * and a swarm of particles resolving into two dark holes reads as damage on
   * the fruit rather than as a face, which is why this drawing had closed eyes
   * only for a long time. What rescues `open` is the specular dot inside each
   * one: a highlight is what the eye uses to tell a pupil from a hole, so the
   * sparkle is load-bearing rather than decoration.
   */
  eyes?: "open" | "shut";
  /** Two soft patches on the cheeks. Reads best with `eyes: "shut"`. */
  blush?: boolean;
  /**
   * Multiplies saturation, for shapes that draw their own colours.
   *
   * Darkening alone pulls every channel toward black, which is exactly what
   * takes the life out of a berry on a pale background. Pushing saturation
   * first and then darkening a little keeps it a blueberry rather than a grey
   * ball with a blue memory.
   */
  vivid?: number;
  /**
   * Multiplies the sampled colour, for shapes that draw their own.
   *
   * The berry is lit for a near-black opening, so on the pastel one it arrived
   * as a pale smudge you could barely pick out. `from` and `to` cannot fix that
   * because a shape ignores them by design, so light mode darkens the drawing
   * instead of recolouring it, keeping the logo's own shading.
   */
  shade?: number;
}

/**
 * The logo, drawn with canvas primitives rather than loaded as an image.
 *
 * `drawImage` from an SVG data URI would mean an async load in the middle of
 * `setWord`, which is called synchronously from the animation loop and on every
 * resize. The mark is a circle, five petals and a dot, so drawing it directly is
 * both simpler and instant.
 *
 * Kept in step with `BlueberryMark` by eye. It only has to survive being
 * sampled on a grid and thrown across the screen, so it is the silhouette and
 * the shading that matter, not the exact control points.
 */
function drawBlueberry(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  face: { eyes: "open" | "shut"; blush: boolean } = { eyes: "shut", blush: false },
) {
  const r = size * 0.46;
  const bodyY = cy + size * 0.04;

  const body = ctx.createRadialGradient(
    cx - r * 0.34,
    bodyY - r * 0.44,
    r * 0.08,
    cx,
    bodyY,
    r * 1.2,
  );
  body.addColorStop(0, "#7dd3fc");
  body.addColorStop(0.28, "#4f86f7");
  body.addColorStop(0.66, "#6d3fe0");
  body.addColorStop(1, "#3b1d8f");

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, bodyY, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight, upper left.
  ctx.save();
  ctx.translate(cx - r * 0.56, bodyY - r * 0.42);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.26, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The calyx: five lobes on top, squashed vertically because a crown lying
  // flat on a sphere is foreshortened seen from the side.
  const lobe = r * 0.48;
  ctx.save();
  ctx.translate(cx, bodyY - r * 0.82);
  ctx.scale(1, 0.62);
  ctx.fillStyle = "#2c3fb0";
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((i * 72 * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -lobe);
    ctx.bezierCurveTo(lobe * 0.25, -lobe * 0.6, lobe * 0.34, -lobe * 0.25, lobe * 0.24, 0);
    ctx.bezierCurveTo(lobe * 0.14, lobe * 0.2, -lobe * 0.14, lobe * 0.2, -lobe * 0.24, 0);
    ctx.bezierCurveTo(-lobe * 0.34, -lobe * 0.25, -lobe * 0.25, -lobe * 0.6, 0, -lobe);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#241f7a";
  ctx.beginPath();
  ctx.arc(0, 0, lobe * 0.33, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /**
   * The eyes, in the same proportions as the SVG mark.
   *
   * Both are drawn at the same place and size so the two beats of the opening
   * are recognisably the same face doing two things, rather than two faces.
   *
   * Traced with `stroke` and then filled by the sampler, which reads the pixels
   * back rather than the path, so the line width has to be generous enough to
   * survive the sampling grid.
   */
  const eyeR = r * 0.185;
  const eyeY = bodyY - r * 0.02;
  ctx.strokeStyle = "#0b0b14";
  ctx.lineWidth = Math.max(2, r * 0.115);
  ctx.lineCap = "round";
  for (const dir of [-1, 1]) {
    // 0.37 rather than 0.305: the first spacing crowded the middle of the face.
    const ex = cx + dir * r * 0.37;
    if (face.eyes === "open") {
      ctx.fillStyle = "#0b0b14";
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeR * 0.66, eyeR * 1.12, 0, 0, Math.PI * 2);
      ctx.fill();
      // The sparkle. Without it the two ovals read as holes punched in the
      // fruit; with it they read as looking at you.
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(ex - eyeR * 0.24, eyeY - eyeR * 0.44, eyeR * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(ex - eyeR, eyeY + eyeR * 0.42);
      ctx.quadraticCurveTo(ex, eyeY - eyeR * 0.78, ex + eyeR, eyeY + eyeR * 0.42);
      ctx.stroke();
    }
  }

  // Cheeks. Outboard of the eyes and below them, which is where blush sits on a
  // face; level with the eyes it reads as two more eyes.
  if (face.blush) {
    ctx.fillStyle = "rgba(255,122,158,0.62)";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + dir * r * 0.6, bodyY + r * 0.2, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#0b0b14";
  }

  // The smile: shallow and wide, matching the mark. Deeper turns the berry into
  // a cartoon mouth, and at particle density it would close into a blob.
  const smileW = r * 0.24;
  const smileY = bodyY + r * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx - smileW, smileY);
  ctx.quadraticCurveTo(cx, smileY + smileW * 0.68, cx + smileW, smileY);
  ctx.stroke();
}

/**
 * One thing the swarm draws, at a place and size of your choosing.
 *
 * A beat is a list of these rather than a single centred word, which is what
 * lets the last beat of the opening land the wordmark and the mascot on the
 * exact spots the real hero occupies. The swarm resolves *into* the page
 * instead of into a picture the page then replaces.
 *
 * Coordinates are canvas-space CSS pixels. `placeFor` is handed the canvas's
 * own rect so a caller can measure a DOM element and subtract.
 */
export type ParticleItem =
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
      /** Defaults to the display face the rest of the sequence uses. */
      family?: string;
      weight?: string;
      /**
       * A CSS length, copied off the element being matched.
       *
       * The site's display face carries `letter-spacing: 0.02em`, which canvas
       * does not apply on its own, so a swarm aiming at a real heading would
       * land about a character narrow across a ten-letter word and the
       * cross-fade would show a shuffle. Chrome and Firefox honour this;
       * Safari ignores it and gets the slightly tight version, which is a
       * fraction of a letter and only visible for the length of a fade.
       */
      letterSpacing?: string;
    }
  | {
      kind: "blueberry";
      x: number;
      y: number;
      /** The box the mark is drawn into. Centred beats use `fontSize * 1.15`. */
      size: number;
      eyes?: "open" | "shut";
      blush?: boolean;
    };

export interface ParticlePlacement {
  items: ParticleItem[];
}

const SIM_STEP_MS = 1000 / 60;
/** Square drawn per particle, in CSS pixels. */
const POINT_SIZE = 2;
/** Longest motion-blur streak a particle draws behind itself, in CSS pixels. */
const MAX_STREAK = 16;
/** Ceiling on live particles, so a long word on a wide monitor stays cheap. */
const MAX_PARTICLES = 4200;
/** Same display face as the rest of the site. */
const FONT_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif';

/**
 * One type size for the whole sequence, chosen so the widest word fits.
 *
 * Sizing each word to the canvas on its own is the obvious thing and it looks
 * wrong: WELCOME comes out at a sensible size and TO fills the screen, so the
 * sequence lurches between scales instead of reading as one title changing.
 *
 * The sampling gap follows the type size. A gap tuned for a monitor leaves a
 * phone with a few hundred particles and the word stops being legible.
 */
function layoutFor(
  ctx: CanvasRenderingContext2D,
  words: ParticleWord[],
  width: number,
  height: number,
) {
  const probe = 100;
  ctx.font = `bold ${probe}px ${FONT_FAMILY}`;
  const widest = words.reduce((w, word) => Math.max(w, ctx.measureText(word.text).width), 1);

  const targetWidth = Math.min(width * 0.8, 1100);
  const fontSize = Math.max(40, Math.min((probe * targetWidth) / widest, height * 0.3));
  return { fontSize };
}

/**
 * The sampling grid, chosen per drawing rather than once per sequence.
 *
 * It used to follow the sequence's single type size, which was right while
 * every beat was the same height. The landing beat is not: the wordmark shrinks
 * to the heading's own size on its way to the corner, and a gap tuned for
 * 200px type sampled across a 96px heading gives four particles per letter and
 * a word you cannot read.
 */
function gapFor(size: number) {
  return Math.max(2, Math.min(5, Math.round(size / 40)));
}

/**
 * Saturation and brightness correction, for a drawing that carries its own
 * colours onto a background it was not lit for. See `vivid` and `shade`.
 */
function tone(raw: Rgb, vivid: number, shade: number): Rgb {
  if (vivid === 1 && shade === 1) return raw;
  // Rec. 601 luma, so pushing away from grey keeps the perceived lightness
  // roughly where the drawing put it.
  const grey = 0.299 * raw.r + 0.587 * raw.g + 0.114 * raw.b;
  const push = (c: number) =>
    Math.max(0, Math.min(255, Math.round((grey + (c - grey) * vivid) * shade)));
  return { r: push(raw.r), g: push(raw.g), b: push(raw.b) };
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

class Particle {
  pos: Vec = { x: 0, y: 0 };
  vel: Vec = { x: 0, y: 0 };
  acc: Vec = { x: 0, y: 0 };
  target: Vec = { x: 0, y: 0 };

  closeEnoughTarget = 100;
  maxSpeed = 1;
  maxForce = 0.1;
  isKilled = false;

  startColor: Rgb = { r: 0, g: 0, b: 0 };
  targetColor: Rgb = { r: 0, g: 0, b: 0 };
  colorWeight = 0;
  colorBlendRate = 0.01;
  /** 1 while alive, driven to 0 once killed so the exit is a fade, not a jump. */
  alpha = 1;

  move() {
    // Ease off as the target gets close, otherwise particles overshoot and
    // oscillate around the letterform instead of settling into it.
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);
    const proximity = distance < this.closeEnoughTarget ? distance / this.closeEnoughTarget : 1;

    if (distance > 0) {
      const desiredX = (dx / distance) * this.maxSpeed * proximity;
      const desiredY = (dy / distance) * this.maxSpeed * proximity;

      let steerX = desiredX - this.vel.x;
      let steerY = desiredY - this.vel.y;
      const steerMag = Math.hypot(steerX, steerY);
      if (steerMag > this.maxForce) {
        steerX = (steerX / steerMag) * this.maxForce;
        steerY = (steerY / steerMag) * this.maxForce;
      }

      this.acc.x += steerX;
      this.acc.y += steerY;
    }

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;

    if (this.colorWeight < 1) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    }
    if (this.isKilled) {
      this.alpha = Math.max(0, this.alpha - 0.02);
    }
  }

  /** Nudged away from the pointer, so the swarm reacts to a cursor crossing it. */
  push(from: Vec, radius: number, strength: number) {
    const dx = this.pos.x - from.x;
    const dy = this.pos.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d > radius) return;
    const falloff = (1 - d / radius) * strength;
    this.acc.x += (dx / d) * falloff;
    this.acc.y += (dy / d) * falloff;
  }

  /**
   * A dot, stretched backwards along whichever axis it is moving fastest on.
   *
   * This is the motion blur, and it replaces the trail the original faked by
   * washing the frame with a translucent black every frame instead of clearing
   * it. That trick cannot be undone: canvas alpha is 8-bit, so repeatedly
   * multiplying it by 0.84 rounds 1 back to 1 and never reaches 0, and every
   * pixel a particle had ever crossed kept a permanent speck. The result was a
   * starfield that grew denser for as long as the page was open.
   *
   * Drawing the streak instead means the canvas can be cleared outright each
   * frame, and it is still one `fillRect` per particle. The streak is
   * axis-aligned rather than along the true velocity, which at a 2px dot moving
   * 30px a frame is not a difference anyone can see.
   */
  draw(ctx: CanvasRenderingContext2D) {
    const c = mixRgb(this.startColor, this.targetColor, this.colorWeight);
    ctx.fillStyle = `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${this.alpha})`;

    const vx = this.vel.x;
    const vy = this.vel.y;
    if (Math.abs(vx) > Math.abs(vy)) {
      const len = Math.min(Math.abs(vx), MAX_STREAK) + POINT_SIZE;
      ctx.fillRect(vx < 0 ? this.pos.x : this.pos.x + POINT_SIZE - len, this.pos.y, len, POINT_SIZE);
    } else {
      const len = Math.min(Math.abs(vy), MAX_STREAK) + POINT_SIZE;
      ctx.fillRect(this.pos.x, vy < 0 ? this.pos.y : this.pos.y + POINT_SIZE - len, POINT_SIZE, len);
    }
  }

  /** Sends the particle back out of frame and starts it fading. */
  kill(width: number, height: number) {
    if (this.isKilled) return;
    const away = randomEdgePos(width, height);
    this.target.x = away.x;
    this.target.y = away.y;
    // Freeze the colour where the blend had got to, so the exit does not also
    // snap to a different hue on its way out.
    const c = mixRgb(this.startColor, this.targetColor, this.colorWeight);
    this.startColor = c;
    this.targetColor = c;
    this.colorWeight = 1;
    this.isKilled = true;
  }
}

/**
 * A point on a ring just outside the canvas, in a random direction.
 *
 * Sized off the half-diagonal rather than the wider side. A fraction of the
 * width puts the ring inside the corners on a wide canvas, and particles that
 * are meant to fly in from off screen instead blink into existence in the middle
 * of the picture. The half-diagonal is the smallest radius that clears every
 * corner at any aspect ratio, and staying close to it keeps the flight short.
 */
function randomEdgePos(width: number, height: number): Vec {
  const angle = Math.random() * Math.PI * 2;
  const mag = (Math.hypot(width, height) / 2) * 1.06;
  return {
    x: width / 2 + Math.cos(angle) * mag,
    y: height / 2 + Math.sin(angle) * mag,
  };
}

/**
 * Radius 1 of three, and the smallest of them.
 *
 * This is the tight local displacement right at the cursor. It is a texture
 * detail, not a feature: the two larger radii on this page, the bubble reveal
 * and the drifting silhouettes, are the ones doing the work.
 *
 * Raised from 110 and 1.6, which was too subtle to notice. The ceiling is
 * legibility: past roughly 190 the word stops reading as "blueberry." while the
 * cursor is inside it, and a wordmark you have to move away from to read is a
 * worse trade than a quiet effect. Particles ease back on their own the moment
 * the cursor leaves, which is the existing seek behaviour and needs nothing
 * here.
 */
const DISPERSE_RADIUS = 155;
const DISPERSE_STRENGTH = 2.3;

export interface ParticleTextEffectProps {
  /** The sequence to play. Must be referentially stable; see the note above. */
  words: ParticleWord[];
  /** How long each word holds before the next one takes over. */
  wordMs?: number;
  /** Time after the last word arrives before `onFinished` fires. */
  settleMs?: number;
  /** Repeat from the first word instead of holding on the last. */
  loop?: boolean;
  /** Let the pointer shove particles around. */
  interactive?: boolean;
  onWordChange?: (index: number) => void;
  /** Fires once the final word has had `settleMs` to arrive and read. */
  onFinished?: () => void;
  /**
   * Draw a beat somewhere other than the middle, and as more than one thing.
   *
   * Read at the moment the beat starts rather than taken from `words`, and
   * called again on every resize. That is deliberate: the coordinates the
   * opening wants are measured off the hero's own DOM after it has laid out,
   * and `words` is an effect dependency — a value that changed once the layout
   * was known would restart the whole sequence from the first beat.
   *
   * Return `null` for the centred default.
   */
  placeFor?: (index: number, canvas: DOMRect) => ParticlePlacement | null;
  className?: string;
  /** Announced to screen readers, which get no canvas. */
  label?: string;
}

export function ParticleTextEffect({
  words,
  wordMs = 1600,
  settleMs = 900,
  loop = false,
  interactive = true,
  onWordChange,
  onFinished,
  placeFor,
  className,
  label,
}: ParticleTextEffectProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // Held in refs so an inline arrow from the parent does not restart the
  // sequence on every parent render.
  const onWordChangeRef = useRef(onWordChange);
  const onFinishedRef = useRef(onFinished);
  const placeForRef = useRef(placeFor);
  onWordChangeRef.current = onWordChange;
  onFinishedRef.current = onFinished;
  placeForRef.current = placeFor;

  useEffect(() => {
    if (reduce) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    const pointer: Vec & { active: boolean } = { x: 0, y: 0, active: false };

    let width = 0;
    let height = 0;
    let fontSize = 0;
    /** Canvas size relative to the 1000px box the original numbers were tuned on. */
    let scale = 1;
    let raf = 0;
    let stopped = false;
    let lastTime = 0;
    let carry = 0;
    let step = 0;
    let wordIndex = -1;
    let announcedFinish = false;

    const settleSteps = Math.max(1, Math.round(settleMs / SIM_STEP_MS));

    /**
     * Where each beat starts, in simulation steps.
     *
     * Beats used to share one duration, so `wordMs` divided into `step` gave
     * the current index directly. They do not have to any more: a word can ask
     * for longer with `holdMs`, which is how the name gets to stand still for a
     * moment while the expressions after it stay quick. Cumulative boundaries
     * rather than division, and a lookup that walks them.
     */
    const starts: number[] = [];
    {
      let at = 0;
      for (const w of words) {
        starts.push(at);
        at += Math.max(1, Math.round((w.holdMs ?? wordMs) / SIM_STEP_MS));
      }
    }

    /** The index whose window contains `s`, or `words.length` once past the end. */
    const indexAt = (s: number) => {
      let i = starts.length - 1;
      while (i > 0 && s < starts[i]!) i--;
      const lastHold = Math.max(
        1,
        Math.round((words[words.length - 1]!.holdMs ?? wordMs) / SIM_STEP_MS),
      );
      if (s >= starts[starts.length - 1]! + lastHold) return words.length;
      return i;
    };

    /**
     * Rasterises a word off screen and hands every particle a pixel of it.
     *
     * `keepIndex` is for a resize: the same word is laid out again at the new
     * size without counting as a new word in the sequence.
     */
    const setWord = (index: number, keepIndex = false) => {
      const word = words[index];
      if (!word || width === 0 || height === 0) return;

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;

      /**
       * What this beat is made of.
       *
       * The default is the one centred drawing this component has always done.
       * A placement replaces it wholesale, which is how the opening's last beat
       * puts the wordmark in the corner and the mascot on the right at the same
       * moment, out of the one swarm.
       */
      const placement = placeForRef.current?.(index, canvas.getBoundingClientRect()) ?? null;
      const items: ParticleItem[] =
        placement && placement.items.length > 0
          ? placement.items
          : word.shape === "blueberry"
            ? [
                {
                  kind: "blueberry",
                  x: width / 2,
                  y: height / 2,
                  // Sized off the type, so the mark lands about as tall as the
                  // words that preceded it rather than jumping scale.
                  size: fontSize * 1.15,
                  eyes: word.eyes ?? "shut",
                  blush: word.blush ?? false,
                },
              ]
            : [{ kind: "text", text: word.text, x: width / 2, y: height / 2, fontSize }];

      const from = hexToRgb(word.from);
      const to = hexToRgb(word.to);
      const shade = word.shade ?? 1;
      const vivid = word.vivid ?? 1;

      /**
       * One item at a time, each rasterised alone and sampled alone.
       *
       * Drawing them together and deciding per pixel which colour rule applied
       * is the obvious shortcut and it does not work: the rule would have to be
       * "flat white means text", and the berry's specular highlight is near
       * enough to white to be mistaken for it. Sampling separately also gives
       * each text item a gradient across its own width rather than across
       * whatever the widest thing on the canvas happened to be.
       */
      const coords: (Vec & { rgb: Rgb })[] = [];
      for (const item of items) {
        offCtx.clearRect(0, 0, width, height);
        if (item.kind === "blueberry") {
          drawBlueberry(offCtx, item.x, item.y, item.size, {
            eyes: item.eyes ?? "shut",
            blush: item.blush ?? false,
          });
        } else {
          offCtx.font = `${item.weight ?? "bold"} ${item.fontSize}px ${item.family ?? FONT_FAMILY}`;
          // Not in every engine's typings, and absent in Safari. Assigning an
          // unknown property to a context is harmless where it is unsupported.
          (offCtx as unknown as { letterSpacing: string }).letterSpacing =
            item.letterSpacing ?? "0px";
          offCtx.fillStyle = "white";
          offCtx.textAlign = item.align ?? "center";
          offCtx.textBaseline = item.baseline ?? "middle";
          offCtx.fillText(item.text, item.x, item.y);
        }

        const pixels = offCtx.getImageData(0, 0, width, height).data;
        const step = gapFor(item.kind === "blueberry" ? item.size / 1.15 : item.fontSize);

        const hits: (Vec & { rgb?: Rgb })[] = [];
        let minX = Infinity;
        let maxX = -Infinity;
        for (let y = 0; y < height; y += step) {
          for (let x = 0; x < width; x += step) {
            const at = (y * width + x) * 4;
            if (pixels[at + 3]! > 128) {
              // A shape carries its own shading, so each particle keeps the
              // colour of the pixel it came from. Text is flat white and takes
              // the gradient instead.
              hits.push(
                item.kind === "blueberry"
                  ? { x, y, rgb: { r: pixels[at]!, g: pixels[at + 1]!, b: pixels[at + 2]! } }
                  : { x, y },
              );
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
        }

        const span = Math.max(1, maxX - minX);
        for (const hit of hits) {
          coords.push({
            x: hit.x,
            y: hit.y,
            rgb: tone(hit.rgb ?? mixRgb(from, to, (hit.x - minX) / span), vivid, shade),
          });
        }
      }
      if (coords.length === 0) return;

      // Shuffled so particles claim scattered pixels rather than sweeping the
      // word top to bottom, and so the cap below takes an even subset.
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }
      const wanted = coords.slice(0, MAX_PARTICLES);

      wanted.forEach((coord, i) => {
        let p = particles[i];
        const fresh = !p;
        if (!p) {
          p = new Particle();
          const spawn = randomEdgePos(width, height);
          p.pos.x = spawn.x;
          p.pos.y = spawn.y;
          particles.push(p);
        }

        p.isKilled = false;
        p.alpha = 1;
        // Measured rather than guessed. At the supplied speeds a word took a
        // median 1.45s to assemble with a tail past 2s, so against a 1.5s hold
        // it was legible for a blink before scattering again. Faster, and over
        // a narrower range so the stragglers do not drag the tail out: median
        // 0.6s and 99th percentile 0.95s, holding across phone, laptop and
        // desktop widths in both orientations.
        p.maxSpeed = (Math.random() * 4 + 8) * scale * 2.4;
        p.maxForce = p.maxSpeed * 0.16;
        p.closeEnoughTarget = 110 * scale;
        p.colorBlendRate = Math.random() * 0.028 + 0.008;

        const colour = coord.rgb;
        // A new particle arrives already the right colour. Blending it up from
        // the class default would mean flying in as a black dot, which is
        // invisible on the black opening and then a smudge over the shader.
        p.startColor = fresh ? colour : mixRgb(p.startColor, p.targetColor, p.colorWeight);
        p.targetColor = colour;
        p.colorWeight = fresh ? 1 : 0;
        p.target.x = coord.x;
        p.target.y = coord.y;
      });

      for (let i = wanted.length; i < particles.length; i++) {
        particles[i].kill(width, height);
      }

      if (!keepIndex) onWordChangeRef.current?.(index);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      if (nextW === width && nextH === height) return;

      width = nextW;
      height = nextH;
      scale = Math.max(width, height) / 1000;
      // Capped: the particles are 2px squares, so a 3x backing store costs a
      // lot of fill rate and buys almost nothing.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // Everything below works in CSS pixels.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ({ fontSize } = layoutFor(ctx, words, width, height));

      if (wordIndex >= 0) setWord(wordIndex, true);
    };

    const simulate = () => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (interactive && pointer.active) {
          p.push(pointer, DISPERSE_RADIUS * scale, DISPERSE_STRENGTH * scale);
        }
        p.move();
        if (
          p.isKilled &&
          (p.alpha <= 0 ||
            p.pos.x < -40 ||
            p.pos.x > width + 40 ||
            p.pos.y < -40 ||
            p.pos.y > height + 40)
        ) {
          particles.splice(i, 1);
        }
      }
    };

    const frame = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(frame);

      if (lastTime === 0) lastTime = now;
      // Clamped: coming back from a background tab hands over a delta of many
      // seconds, and replaying all of it at once teleports the whole swarm.
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;
      carry += delta;

      while (carry >= SIM_STEP_MS) {
        carry -= SIM_STEP_MS;

        const due = indexAt(step);
        if (due !== wordIndex) {
          if (due < words.length) {
            wordIndex = due;
            setWord(wordIndex);
          } else if (loop) {
            step = 0;
            wordIndex = 0;
            setWord(0);
          }
        }

        const lastStart = starts[starts.length - 1] ?? 0;
        if (!loop && !announcedFinish && step >= lastStart + settleSteps) {
          announcedFinish = true;
          onFinishedRef.current?.();
        }

        simulate();
        step++;
      }

      // Cleared outright, leaving the canvas transparent so the aurora and the
      // shader behind it show through. The trailing is drawn per particle; see
      // the note on `Particle.draw` for why it is not done by washing the frame.
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) p.draw(ctx);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };
    if (interactive) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
    }

    // A tab that goes to the background stops getting frames, so the first
    // delta on the way back would be the whole time away. Reset the clock.
    const onVisibility = () => {
      lastTime = 0;
      carry = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(frame);

    /**
     * Re-measure once the font set is settled, in case the first layout was
     * done against a fallback face and came out the wrong width.
     *
     * Deliberately not a gate on starting. `document.fonts.ready` waits for the
     * document's `load` event as well as for the fonts, so one slow image
     * anywhere on the page would hold the entire opening at a black screen.
     * Measured here mid-build: the promise was still pending long after the
     * hub had rendered, with `document.fonts.status` already "loaded". The site
     * sets its display face from a system stack, so the first measurement is
     * almost always right and this is only insurance.
     */
    document.fonts?.ready.then(() => {
      if (stopped || width === 0) return;
      const next = layoutFor(ctx, words, width, height);
      if (Math.abs(next.fontSize - fontSize) < 0.5) return;
      fontSize = next.fontSize;
      if (wordIndex >= 0) setWord(wordIndex, true);
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [words, wordMs, settleMs, loop, interactive, reduce]);

  // Reduced motion gets the destination without the journey: the last word,
  // held still, and the sequence reported as finished so the page moves on.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!reduce || finishedRef.current) return;
    finishedRef.current = true;
    onFinishedRef.current?.();
  }, [reduce]);

  const last = words[words.length - 1];

  return (
    <div ref={hostRef} className={cn("relative h-full w-full", className)}>
      {reduce ? (
        <div className="flex h-full w-full items-center justify-center px-6">
          <span
            className="title-face text-6xl font-bold tracking-tight sm:text-8xl"
            style={{
              backgroundImage: `linear-gradient(90deg, ${last?.from}, ${last?.to})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {last?.text}
          </span>
        </div>
      ) : (
        <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
      )}
      <span className="sr-only">{label ?? words.map((w) => w.text).join(" ")}</span>
    </div>
  );
}

export default ParticleTextEffect;

