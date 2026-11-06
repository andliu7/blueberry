/**
 * OPENING A CHEST, owner pick C1 (20 Oct): three taps, each shaking the box
 * harder while the light behind it grows; the third blows the lid off and white
 * light fills the screen. Coin gauntlet (Nov): the chest is a painted object on
 * real ground (ChestModel.tsx). It squashes as the lid swings back on its hinge,
 * the coins erupt in a tight column, open into a spray, and draw together into one
 * stream that sweeps across the screen into the counter's coin. Each arrival pulses
 * the coin, fills the rail and adds to the number with a clink; the last one slams
 * the total home over the chest. Loose coins and stones hit the ground beside the
 * box with dust and stay there, shining, and gold stays in the box.
 *
 * Lazy (ChestHost.tsx): nobody downloads this until a chest is opened, which
 * keeps it out of the #/app cold load.
 *
 * THE ECONOMY WRITE HAPPENS ON THE THIRD TAP, through `request.open()`, and
 * this file only animates what that returned. Closing before the third tap
 * writes nothing, so the chest stays saved.
 *
 * THE MOVEMENT IS IMPERATIVE ON PURPOSE. React renders the pieces (the chest,
 * the flood, the coins) and the Web Animations API moves them, because the paths
 * depend on where the tally sits on screen at that moment and a re-render per
 * frame would be the slow way to draw them. The paths themselves are in
 * payoutPath.ts. Every timer and animation is recorded, and the unmount cleanup
 * cancels them all.
 *
 * THE COUNT IS HONEST. The tally moves only when a coin lands (`counterSteps`),
 * so what the eye sees arrive is what the number gains, and it ends on the true
 * total however many coins flew.
 *
 * REDUCED MOTION: one tap opens it, nothing shakes or flies, and the words
 * under the chest say what it paid. Both the OS setting and the site's own
 * switch count, html[data-motion="reduced"].
 *
 * JUST THE CHEST (owner, 31 Oct): an opaque layer over the whole app, no top
 * bar, no Bloom, no buttons. The whole screen is one tap target: it opens the
 * chest, and once the chest has paid it continues. The coins fly to the tally on
 * this layer, since the counter in the top bar is hidden.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { deriveEconomy, type EconomyEvent } from "@blueberry/economy";
import { useReducedMotionPref } from "@/lib/motionPref";
import { useProgress } from "../app/hooks";
import { economyOptions } from "../app/progress";
import { CoinGoalBar } from "../app/ui/CoinGoalBar";
import { formatCoins } from "../app/ui/CoinCounter";
import { nextCoinGoal, type CoinGoal } from "../shop/coinGoal";
import { shelfGoals } from "../shop/shelfGoals";
import { CoinNumerals, layoutNumerals } from "../app/ui/CoinNumerals";
import { playCorrect, playGem } from "../sound/gameSound";
import { CoinArt, StoneArt, type StoneTone } from "./ChestArt";
import { ChestFloor, ChestModel, ChestWorld, LID_CLOSED, LID_CRACKED, LID_OPEN, LID_SWING } from "./ChestModel";
import { CHEST_POINTS } from "./chestPaint";
import "./chestOpening.css";
import { TAPS_TO_OPEN, counterSteps, paidHeadline, tapChest, tapHint, type OpenResult, type PlayRequest } from "./chestFlow";
import { PAYOUT_COIN_MAX, coinFlight, launchDelays, payoutCoinCount, scatterSpot, spillFlight, spillThrowFor, type PayoutStage } from "./payoutPath";

/** The loose loot that spills out and stays on the ground: decorative, the flying coins are what is counted. */
const SPILL: readonly ("coin" | StoneTone)[] = Array.from({ length: 26 }, (_unused, i) =>
  i % 7 === 4 ? "ruby" : i % 11 === 7 ? "emerald" : "coin",
);

/** The sparks thrown off by the last landing. */
const SPARK_COUNT = 14;
/** Gold flecks in the eruption, for density: they count for nothing and carry no art. */
const FLECK_COUNT = 26;
/** Puffs of dust and stars of shine, reused in turn as pieces hit the ground. */
const DUST_COUNT = 34;
const GLINT_COUNT = 14;

/** The counter's digits, as a cap height in px: they sit in the rail. */
const RAIL_CAP_PX = 26;
/** The total slammed over the chest at the finish. A long number shrinks to fit. */
const PAYOFF_CAP_PX = 84;
const SIDE_ROOM_PX = 48;

/** The number's width in em: the lettering's slots plus its lean and wall. */
function numberWidthEm(text: string): number {
  return (layoutNumerals(text).boxW + 18) / 100;
}

/** Counts a number up from 1 to `target` with an ease out. */
function useCountUp(target: number, run: boolean, duration = 750): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || target <= 0) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.max(1, Math.round(target * (1 - (1 - t) ** 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return run ? value : 0;
}

type Phase = "tapping" | "bursting" | "flying" | "done";

/** The finished screen has a line above the hint: the XP, or in words what it paid. */
const phaseDoneWithLine = (phase: Phase, headline: string): boolean => phase === "done" && headline !== "";

/** A tap this soon after the chest pays is the opening tap landing twice, not "continue". */
const CONTINUE_GUARD_MS = 350;

/**
 * A coin with real thickness, for flight: the drawn face in front, a plain back
 * behind it and a milled edge between them, so edge-on it is a sliver of gold and
 * not nothing. Its tilt and speed come from the coin's number.
 */
function SpinningCoin({ i }: { readonly i: number }) {
  const style = {
    "--coin-tilt": `${((i * 47) % 50) - 25}deg`,
    "--coin-turn": `${380 + ((i * 61) % 240)}ms`,
    "--coin-from": `${(i * 83) % 360}deg`,
    "--coin-way": i % 2 === 0 ? "normal" : "reverse",
  } as CSSProperties;
  return (
    <span className="chest-coin__tilt" style={style}>
      <span className="chest-coin__spin">
        <i className="chest-coin__back" />
        <i className="chest-coin__rib" />
        <CoinArt className="chest-coin__face" />
      </span>
    </span>
  );
}

export default function ChestOpening({
  request,
  reducedMotion: osReducedMotion,
  onClose,
}: {
  readonly request: PlayRequest;
  readonly reducedMotion: boolean;
  readonly onClose: () => void;
}) {
  const siteReducedMotion = useReducedMotionPref();
  const snapshot = useProgress();
  const reducedMotion = osReducedMotion || siteReducedMotion;
  const [phase, setPhase] = useState<Phase>("tapping");
  const [taps, setTaps] = useState(0);
  // Bumped per tap so the shake animation restarts (a fresh key remounts nothing,
  // it only toggles the class off and on through the effect below).
  const [shake, setShake] = useState(0);
  const [paid, setPaid] = useState<OpenResult | null>(null);
  const [tally, setTally] = useState(0);
  // True once the coins have left the box: the heap drops, and what stays still shines.
  const [emptied, setEmptied] = useState(false);
  const [lid, setLid] = useState(LID_CLOSED);

  const tapRef = useRef<HTMLButtonElement>(null);
  const rigRef = useRef<HTMLSpanElement>(null);
  const chestRef = useRef<HTMLSpanElement>(null);
  const contactRef = useRef<HTMLSpanElement>(null);
  const payoffRef = useRef<HTMLParagraphElement>(null);
  const payoffRaysRef = useRef<HTMLSpanElement>(null);
  const dustRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const glintRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const fleckRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dustNext = useRef(0);
  const glintNext = useRef(0);
  const floodRef = useRef<HTMLSpanElement>(null);
  const tallyRef = useRef<HTMLParagraphElement>(null);
  const tallyRowRef = useRef<HTMLSpanElement>(null);
  const tallyCoinRef = useRef<HTMLSpanElement>(null);
  const tallyFlashRef = useRef<HTMLSpanElement>(null);
  const fxRef = useRef<HTMLSpanElement>(null);
  const flyerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const spillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const doneAt = useRef(0);
  const timers = useRef<number[]>([]);
  const animations = useRef<Animation[]>([]);
  const punch = useRef<Animation | null>(null);
  const flash = useRef<Animation | null>(null);
  const gulp = useRef<Animation | null>(null);
  const alive = useRef(true);
  // Whether a goal card will stand under the words, read by the burst's spill.
  const goalRef = useRef(false);
  const goalDecided = useRef(false);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms));
    });

  // Focus moves onto the tap target on arrival, so Enter and Space work at once,
  // and every loose end is cleaned on the way out.
  useEffect(() => {
    alive.current = true;
    tapRef.current?.focus();
    return () => {
      alive.current = false;
      for (const id of timers.current) window.clearTimeout(id);
      for (const animation of animations.current) animation.cancel();
    };
  }, []);

  useEffect(() => {
    if (phase === "done") doneAt.current = performance.now();
  }, [phase]);

  // Restart the shake on every tap: drop the class, force a reflow, add it back.
  useEffect(() => {
    const chest = chestRef.current;
    if (shake === 0 || chest === null || reducedMotion) return;
    chest.classList.remove("is-shaking");
    void chest.offsetWidth;
    chest.classList.add("is-shaking");
  }, [shake, reducedMotion]);

  // Escape leaves before the chest is open (it stays saved) and after.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (phase === "tapping" || phase === "done")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const animate = (el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null => {
    if (typeof (el as HTMLElement).animate !== "function") return null;
    const animation = (el as HTMLElement).animate(keyframes, options);
    animations.current.push(animation);
    return animation;
  };

  /** The box's weight: it squashes onto its feet and the shadow under it spreads, by `force` from 0 to 1. */
  const thump = (force: number, duration: number) => {
    const chest = chestRef.current;
    if (chest !== null) {
      const x = 0.1 * force;
      const y = 0.16 * force;
      animate(
        chest,
        [
          { transform: "none", easing: "cubic-bezier(.3, 0, .6, 1)" },
          { transform: `scale(${1 + x}, ${1 - y})`, offset: 0.16, easing: "cubic-bezier(.2, .7, .3, 1)" },
          { transform: `translateY(${-26 * force}px) scale(${1 - x * 0.8}, ${1 + y})`, offset: 0.4, easing: "cubic-bezier(.5, 0, .8, .4)" },
          { transform: `scale(${1 + x * 0.6}, ${1 - y * 0.55})`, offset: 0.62, easing: "cubic-bezier(.2, .7, .3, 1)" },
          { transform: `scale(${1 - x * 0.2}, ${1 + y * 0.2})`, offset: 0.82 },
          { transform: "none" },
        ],
        { duration },
      );
    }
    const contact = contactRef.current;
    if (contact !== null) {
      animate(
        contact,
        [
          { transform: "none", opacity: 1 },
          { transform: `scaleX(${1 + 0.16 * force})`, opacity: 1, offset: 0.16 },
          { transform: `scale(${1 - 0.14 * force}, ${1 - 0.1 * force})`, opacity: 0.6, offset: 0.4 },
          { transform: `scaleX(${1 + 0.1 * force})`, opacity: 1, offset: 0.62 },
          { transform: "none", opacity: 1 },
        ],
        { duration },
      );
    }
  };

  /** Dust kicks up where something hit the ground. Each puff is one of a pool, used in turn. */
  const puff = (x: number, y: number, delay: number, size: number) => {
    const el = dustRefs.current[dustNext.current % DUST_COUNT];
    dustNext.current += 1;
    if (el === undefined || el === null) return;
    const half = el.offsetWidth / 2;
    const n = dustNext.current;
    const drift = ((n * 37) % 31) - 15;
    const from = `translate(${x - half}px, ${y - half}px)`;
    animate(
      el,
      [
        { opacity: 0.9, transform: `${from} scale(${0.3 * size})`, easing: "cubic-bezier(.1, .7, .3, 1)" },
        { opacity: 0.55, transform: `${from} translate(${drift * 0.7}px, ${-9 * size}px) scale(${size})`, offset: 0.4, easing: "ease-out" },
        { opacity: 0, transform: `${from} translate(${drift}px, ${-18 * size}px) scale(${1.45 * size})` },
      ],
      { duration: 560 + (n % 4) * 90, delay, fill: "forwards" },
    );
  };

  /** A star of light off a piece of gold as it hits. */
  const glint = (x: number, y: number, delay: number) => {
    const el = glintRefs.current[glintNext.current % GLINT_COUNT];
    glintNext.current += 1;
    if (el === undefined || el === null) return;
    const half = el.offsetWidth / 2;
    const from = `translate(${x - half}px, ${y - half}px)`;
    animate(
      el,
      [
        { opacity: 0, transform: `${from} scale(0.2) rotate(0deg)` },
        { opacity: 1, transform: `${from} scale(1.15) rotate(25deg)`, offset: 0.3 },
        { opacity: 0, transform: `${from} scale(0.3) rotate(50deg)` },
      ],
      { duration: 340, delay, fill: "forwards" },
    );
  };

  /** A coin arrived: the counter's coin gulps it, and the whole counter kicks, harder as it fills. */
  const landing = (progress: number) => {
    const row = tallyRowRef.current;
    if (row !== null) {
      punch.current?.cancel();
      const kick = 1.04 + 0.05 * progress;
      punch.current = animate(row, [{ transform: `scale(${kick})` }, { transform: "scale(1)" }], { duration: 170, easing: "cubic-bezier(.2, .8, .3, 1)" });
    }
    const coin = tallyCoinRef.current;
    if (coin !== null) {
      gulp.current?.cancel();
      gulp.current = animate(coin, [{ transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 190, easing: "cubic-bezier(.2, .8, .3, 1)" });
    }
    const light = tallyFlashRef.current;
    if (light !== null) {
      flash.current?.cancel();
      flash.current = animate(
        light,
        [
          { opacity: 1, transform: "scale(0.7)" },
          { opacity: 0, transform: "scale(1.5)" },
        ],
        { duration: 240, easing: "ease-out" },
      );
    }
  };

  /** The last coin is in: the counter rings, the total slams down over the chest, and the box takes the blow. */
  const finish = () => {
    playCorrect();
    punch.current?.cancel();
    gulp.current?.cancel();
    const row = tallyRowRef.current;
    if (row !== null) {
      animate(
        row,
        [
          { transform: "scale(1.22)", easing: "cubic-bezier(.3, 0, .3, 1)" },
          { transform: "scale(0.96)", offset: 0.4, easing: "ease-in-out" },
          { transform: "scale(1)" },
        ],
        { duration: 420 },
      );
    }
    const coin = tallyCoinRef.current;
    if (coin !== null) {
      animate(coin, [{ transform: "perspective(300px) rotateY(0deg)" }, { transform: "perspective(300px) rotateY(720deg)" }], {
        duration: 720,
        easing: "cubic-bezier(.16, 1, .3, 1)",
      });
    }
    // The total has counted up over the box with the landings: the last one rings it.
    const payoff = payoffRef.current;
    if (payoff !== null) {
      animate(
        payoff,
        [
          { opacity: 1, transform: "scale(1.24)", easing: "cubic-bezier(.3, 0, .3, 1)" },
          { opacity: 1, transform: "scale(0.95)", offset: 0.4, easing: "ease-in-out" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 460, fill: "forwards" },
      );
    }
    // The total lands on the box: it takes the weight, and the ground takes that.
    timers.current.push(
      window.setTimeout(() => {
        if (!alive.current) return;
        thump(0.55, 420);
        const rig = rigRef.current?.getBoundingClientRect();
        if (rig === undefined) return;
        const y = rig.top + rig.height * CHEST_POINTS.baseFront.y;
        for (let i = 0; i < 6; i += 1) puff(rig.left + rig.width * (0.04 + (i / 5) * 0.8), y + 14 + (i % 3) * 5 - (i / 5) * 26, i * 12, 0.95);
      }, 170),
    );
    const fx = fxRef.current;
    if (fx === null) return;
    const ring = fx.querySelector(".chest-open__ring");
    if (ring !== null) {
      animate(
        ring,
        [
          { opacity: 1, transform: "scale(0.25)" },
          { opacity: 0, transform: "scale(2.2)" },
        ],
        { duration: 560, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "forwards" },
      );
    }
    fx.querySelectorAll(".chest-open__spark").forEach((spark, i) => {
      const angle = (i / SPARK_COUNT) * Math.PI * 2 + 0.2;
      const reach = 66 + ((i * 37) % 60);
      const x = Math.cos(angle) * reach * 1.1;
      const y = Math.sin(angle) * reach * 0.9;
      animate(
        spark,
        [
          { opacity: 1, transform: "translate(0, 0) scale(1.1) rotate(0deg)", easing: "cubic-bezier(.12, .8, .3, 1)" },
          { opacity: 1, transform: `translate(${x * 0.9}px, ${y * 0.9}px) scale(0.9) rotate(120deg)`, offset: 0.55, easing: "ease-in" },
          { opacity: 0, transform: `translate(${x}px, ${y + 46}px) scale(0.2) rotate(200deg)` },
        ],
        { duration: 760 + (i % 4) * 70, fill: "forwards" },
      );
    });
  };

  const burst = async () => {
    const result = request.open();
    const count = payoutCoinCount(result.diamonds);
    setPaid(result);
    setPhase("bursting");
    // The pieces mount with this render; give React a beat before they are moved.
    await wait(30);
    if (!alive.current) return;

    const rig = rigRef.current?.getBoundingClientRect();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const rigLeft = rig?.left ?? w * 0.15;
    const rigTop = rig?.top ?? h * 0.3;
    const rigW = rig?.width ?? w * 0.7;
    const rigH = rig?.height ?? w * 0.7;
    const cx = rigLeft + rigW * CHEST_POINTS.mouth.x;
    const mouthY = rigTop + rigH * CHEST_POINTS.mouth.y;
    const groundY = rigTop + rigH * CHEST_POINTS.baseFront.y;

    // The lid swings back on its hinge, past its rest, and drops back to it.
    [...LID_SWING, 4, LID_OPEN].forEach((frame, i) => {
      timers.current.push(window.setTimeout(() => setLid(frame), [70, 125, 190, 265, 450, 550][i] ?? 0));
    });
    // The box drives down into the ground as it goes, then rides the recoil.
    thump(1, 620);
    for (let i = 0; i < 8; i += 1) {
      const across = (i + 0.5) / 8;
      puff(rigLeft + rigW * (0.02 + across * 0.92), groundY + 16 - across * 34, i * 8, 1.35);
    }
    const flood = floodRef.current;
    if (flood !== null) {
      flood.style.left = `${cx}px`;
      flood.style.top = `${mouthY}px`;
      animate(
        flood,
        [
          { transform: "scale(0)", opacity: 0.9 },
          { transform: "scale(30)", opacity: 0.66, offset: 0.2 },
          { transform: "scale(32)", opacity: 0 },
        ],
        { duration: 520, easing: "cubic-bezier(.19, 1, .22, 1)", fill: "forwards" },
      );
    }

    // Flecks of gold in the eruption: thick and bright, and gone by the ground.
    fleckRefs.current.forEach((el, i) => {
      if (el === null) return;
      const half = el.offsetWidth / 2;
      const vx = (((i * 0.6180339887) % 1) - 0.5) * 460;
      const vy = -(700 + ((i * 53) % 100) * 6.5);
      const t = 0.52 + ((i * 29) % 40) / 100;
      const frames = Array.from({ length: 9 }, (_unused, n) => {
        const u = (n / 8) * t;
        return { transform: `translate(${cx + vx * u - half}px, ${mouthY + vy * u + 1100 * u * u - half}px) scale(${1 - (n / 8) * 0.55})`, opacity: n === 8 ? 0 : 1, offset: n / 8 };
      });
      animate(el, frames, { duration: Math.round(t * 1000), delay: 10 + i * 17, easing: "linear", fill: "forwards" });
    });

    // The spill: loose coins and stones thrown low out of the heap. They hit the
    // ground in front of and beside the box, kicking dust, bounce and stay there.
    const halfBox = rigW * 0.46;
    const roomX = Math.min(190, w / 2 - 28);
    // The goal card under the words needs about 80px more of the ground's foot.
    const roomY = Math.max(46, Math.min(h - groundY - (goalRef.current ? 240 : 158), 134));
    spillRefs.current.forEach((el, i) => {
      if (el === null) return;
      const spot = scatterSpot(i, SPILL.length, roomX, roomY);
      // Nothing comes to rest inside the box's feet.
      const floorY = Math.max(spot.y, Math.abs(spot.x) < halfBox ? 10 + (1 - Math.abs(spot.x) / halfBox) * 14 : -8);
      const depth = Math.max(0, floorY) / roomY;
      const scale = (0.74 + 0.5 * depth) * (i % 7 === 0 ? 1.18 : 1);
      const peak = Math.min(190, Math.max(90, mouthY - 90)) * (0.5 + (((i * 53) % 100) / 100) * 0.5);
      const vy = -Math.sqrt(2 * 2600 * peak);
      const floor = groundY - mouthY + floorY;
      const vx = spillThrowFor(spot.x, vy, floor);
      const spin = (i % 2 === 0 ? -360 : 360) + ((i * 29) % 44) - 22;
      const half = el.offsetWidth / 2;
      const { frames, duration, firstHit } = spillFlight(vx, vy, floor);
      const delay = 90 + i * 34;
      const place = (x: number, y: number, r: number, k: number) => `translate(${cx + x - half}px, ${mouthY + y - half}px) rotate(${r}deg) scale(${k * scale})`;
      el.style.zIndex = String(79 + Math.round(depth * 3) - 3);
      animate(
        el,
        frames.map((f) => ({ transform: place(f.x, f.y, spin * f.turn, f.offset === 0 ? 0.55 : 1), opacity: 1, offset: f.offset })),
        { duration, delay, easing: "linear", fill: "forwards" },
      );
      const hitAt = delay + firstHit * 1000;
      const hitX = cx + spot.x * 0.84;
      const hitY = mouthY + floor + half * 0.4;
      puff(hitX, hitY, hitAt, 0.75 + depth * 0.5);
      if (i % 3 === 0) puff(hitX + (i % 2 === 0 ? 14 : -14), hitY + 2, hitAt + 20, 0.6 + depth * 0.4);
      if (i % 2 === 0) glint(hitX, hitY - half * 0.8, hitAt);
      // It stops flipping as it comes to rest, and lies flat on the ground.
      timers.current.push(window.setTimeout(() => el.classList.add("is-landed"), delay + duration));
    });

    // Only as many as were paid fly; the rest of the pool never shows.
    flyerRefs.current.slice(count).forEach((el) => {
      if (el !== null) el.style.display = "none";
    });
    const els = flyerRefs.current.slice(0, count).filter((el): el is HTMLSpanElement => el !== null);
    if (els.length === 0) {
      await wait(900);
      if (!alive.current) return;
      setEmptied(true);
      setPhase("done");
      return;
    }

    // Everything aims at where the tally sits now, before its entrance moves it.
    const coin = tallyCoinRef.current?.getBoundingClientRect();
    const row = tallyRef.current?.getBoundingClientRect();
    const to = coin === undefined ? { x: w - 50, y: 50 } : { x: coin.left + coin.width / 2, y: coin.top + coin.height / 2 };
    const rowBottom = row === undefined ? 90 : row.bottom;
    if (fxRef.current !== null) {
      fxRef.current.style.left = `${to.x}px`;
      fxRef.current.style.top = `${to.y}px`;
    }
    const stage: PayoutStage = {
      from: { x: cx, y: mouthY },
      to,
      rise: Math.min(300, Math.max(90, mouthY - rowBottom - 24)),
      reach: Math.min(170, w / 2 - 44),
    };
    // Round 3: the amount rises out of the open box and stands over it, counting
    // with the landings, so the box, the number and the tally read one payout.
    const payoffEl = payoffRef.current;
    if (payoffEl !== null) {
      const box = payoffEl.getBoundingClientRect();
      const dy = Math.round(mouthY - (box.top + box.height / 2));
      animate(
        payoffEl,
        [
          { opacity: 0, transform: `translateY(${dy}px) scale(0.2)` },
          { opacity: 1, transform: `translateY(${Math.round(dy * 0.6)}px) scale(0.5)`, offset: 0.12 },
          { opacity: 1, transform: "translateY(-10px) scale(1.1)", offset: 0.62 },
          { opacity: 1, transform: "none" },
        ],
        { duration: 640, delay: 300, easing: "cubic-bezier(.2, .85, .3, 1)", fill: "forwards" },
      );
      const rays = payoffRaysRef.current;
      if (rays !== null) {
        animate(
          rays,
          [
            { opacity: 0, transform: "scale(0.25)" },
            { opacity: 1, transform: "scale(1.1)", offset: 0.34 },
            { opacity: 0.6, transform: "scale(1)" },
          ],
          { duration: 1100, delay: 420, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "forwards" },
        );
      }
    }
    if (tallyRef.current !== null) {
      animate(
        tallyRef.current,
        [
          { opacity: 0, transform: "translateY(-14px) scale(0.6)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 300, delay: 120, easing: "cubic-bezier(.2, 1.4, .4, 1)", fill: "forwards" },
      );
    }

    // The fountain. The number moves when a coin lands, in the order they land.
    const steps = counterSteps(0, result.diamonds, els.length);
    const delays = launchDelays(els.length);
    let landed = 0;
    let firstHang = Infinity;
    els.forEach((el, i) => {
      const flight = coinFlight(i, stage);
      const delay = delays[i] ?? 0;
      firstHang = Math.min(firstHang, delay + flight.hang);
      const half = el.offsetWidth / 2;
      const motion = animate(
        el,
        flight.frames.map((f) => ({ transform: `translate(${f.x - half}px, ${f.y - half}px) scale(${f.scale})`, opacity: 1, offset: f.offset })),
        { duration: flight.duration, delay, easing: "linear", fill: "forwards" },
      );
      const land = () => {
        if (!alive.current) return;
        el.style.visibility = "hidden";
        landed += 1;
        setTally(steps[landed - 1] ?? result.diamonds);
        playGem();
        if (landed < els.length) {
          landing(landed / els.length);
          return;
        }
        finish();
        timers.current.push(window.setTimeout(() => setPhase("done"), 520));
      };
      if (motion === null) land();
      else motion.onfinish = land;
    });

    // Every surge out of the mouth rocks the box a little, less as it empties.
    for (let n = 1; n <= 4; n += 1) {
      timers.current.push(
        window.setTimeout(() => {
          if (alive.current) thump(0.32 - n * 0.05, 240);
        }, 520 + n * 150),
      );
    }

    // The heap drains as the column leaves.
    const lastLaunch = delays[delays.length - 1] ?? 0;
    await wait(Math.max(260, lastLaunch * 0.7));
    if (!alive.current) return;
    setEmptied(true);
    const untilPull = firstHang - Math.max(260, lastLaunch * 0.7);
    if (untilPull > 0) await wait(untilPull);
    if (!alive.current) return;
    setPhase((now) => (now === "bursting" ? "flying" : now));
  };

  const tap = () => {
    if (phase === "done") {
      if (performance.now() - doneAt.current >= CONTINUE_GUARD_MS) onClose();
      return;
    }
    if (phase !== "tapping") return;
    const next = tapChest(taps, reducedMotion);
    setTaps(next.taps);
    setShake((n) => n + 1);
    if (!next.opens) {
      // The lid lifts on its hinge and drops: light leaks out, and it is heavy.
      setLid(LID_CRACKED);
      timers.current.push(window.setTimeout(() => setLid(LID_CLOSED), 150));
      return;
    }
    if (reducedMotion) {
      setPaid(request.open());
      setLid(LID_OPEN);
      setEmptied(true);
      setPhase("done");
      playGem();
      return;
    }
    setPhase("bursting");
    setLid(LID_CRACKED);
    // The third shake swings widest, then the lid goes.
    timers.current.push(
      window.setTimeout(() => {
        if (alive.current) void burst();
      }, 380),
    );
  };

  const open = phase !== "tapping";
  // The tally stays up through the finish: it is what the chest paid, already counted.
  const tallyOn = paid !== null && paid.diamonds > 0 && !reducedMotion;
  // What the coins move toward (round 2): worked out once, after the open wrote
  // the payout, from the same balance the header reads. The bar fills with the tally.
  const [goal, setGoal] = useState<CoinGoal | null>(null);
  // The balance the counter climbs from (round 4): the counter at the top always
  // reads a balance, never a gain and never an empty rail. The goal's own
  // numbers when there is one, so the card and the counter agree to the coin.
  const [walletFrom, setWalletFrom] = useState<number | null>(null);
  useEffect(() => {
    if (paid === null || paid.diamonds <= 0 || goalDecided.current) return;
    goalDecided.current = true;
    const after = deriveEconomy(snapshot.journal, new Date().toISOString(), economyOptions(snapshot.course)).diamonds.balance;
    const next = request.goal !== undefined ? request.goal(paid) : nextCoinGoal(after - paid.diamonds, after, shelfGoals(snapshot.journal as readonly EconomyEvent[]));
    goalRef.current = next !== null;
    setGoal(next);
    setWalletFrom(Math.max(0, next !== null ? next.from : after - paid.diamonds));
  }, [paid, request, snapshot]);
  const goalOn = goal !== null && (phase === "flying" || phase === "done");
  const goalShown = goal === null ? 0 : phase === "done" || !tallyOn ? goal.to : goal.from + tally;
  const countX = useCountUp(paid?.xp ?? 0, phase === "done" && !reducedMotion);
  // How bright the light behind the box is: grows per tap, full at the burst.
  // It never cuts out: the light eases down to what the gold left in the box still gives.
  const light = phase === "tapping" ? taps * 0.3 : phase === "bursting" ? 1 : phase === "flying" ? 0.82 : 0.58;
  const swing = phase === "tapping" ? `${taps * 4}deg` : "12deg";
  const tapLabel =
    phase === "done"
      ? "Continue"
      : open
        ? "Treasure chest, opening"
        : `Treasure chest. Tap ${TAPS_TO_OPEN - taps} more ${TAPS_TO_OPEN - taps === 1 ? "time" : "times"} to open it`;

  // What the words at the foot still have to say. The tally already says the coins.
  let headline = "";
  if (paid !== null) {
    if (!tallyOn) headline = paidHeadline(paid);
    else if (paid.xp > 0) headline = `+${countX} XP`;
  }

  // How much ground the words need under them: see .chest-world__foot.
  const wordsSize = goal !== null && phase !== "tapping" ? "goal" : paid === null || !phaseDoneWithLine(phase, headline) ? "short" : tallyOn ? "line" : "tall";

  // Width is reserved for the final number, so the coin never moves as digits arrive.
  const finalText = `+${paid?.diamonds ?? 0}`;
  const finalEm = numberWidthEm(finalText);
  const roomPx = (typeof window === "undefined" ? 390 : window.innerWidth) - SIDE_ROOM_PX;
  const railCap = Math.min(RAIL_CAP_PX, (roomPx * 0.6) / finalEm);
  const payoffCap = Math.min(PAYOFF_CAP_PX, roomPx / finalEm);
  const totalCoins = paid?.diamonds ?? 0;

  const railFill = totalCoins > 0 ? Math.min(100, (tally / totalCoins) * 100) : 0;
  // The counter's reading: the balance, climbing by each landing. Its width is the final balance's.
  const walletText = walletFrom === null ? "" : formatCoins(walletFrom + tally);
  const walletEm = numberWidthEm(formatCoins((walletFrom ?? 0) + totalCoins));
  const walletCap = Math.min(RAIL_CAP_PX, (roomPx * 0.6) / walletEm);

  // Built once, on arrival and while nothing moves, so the burst does not stall to
  // mount them: the tally re-renders per landing, and these never need to.
  const hasLoot = !reducedMotion;
  const flyerEls = useMemo(
    () =>
      Array.from({ length: hasLoot ? PAYOUT_COIN_MAX : 0 }, (_unused, i) => (
        <span
          key={i}
          ref={(el) => {
            flyerRefs.current[i] = el;
          }}
          className="chest-coin"
          style={{ opacity: 0 }}
          aria-hidden
        >
          <SpinningCoin i={i} />
        </span>
      )),
    [hasLoot],
  );
  const spillEls = useMemo(
    () =>
      hasLoot
        ? SPILL.map((kind, i) => (
            <span
              key={i}
              ref={(el) => {
                spillRefs.current[i] = el;
              }}
              className="chest-spray"
              style={{ opacity: 0 }}
              aria-hidden
            >
              <i className="chest-spray__shade" />
              {kind === "coin" ? <SpinningCoin i={i + 40} /> : <StoneArt tone={kind} />}
              {i % 2 === 0 ? <i className="chest-spray__shine" style={{ animationDelay: `${(i * 311) % 2400}ms` }} /> : null}
            </span>
          ))
        : null,
    [hasLoot],
  );
  const hitEls = useMemo(
    () =>
      hasLoot ? (
        <>
          {Array.from({ length: FLECK_COUNT }, (_unused, i) => (
            <span
              key={`f${i}`}
              ref={(el) => {
                fleckRefs.current[i] = el;
              }}
              className="chest-fleck"
              style={{ opacity: 0 }}
              aria-hidden
            />
          ))}
          {Array.from({ length: DUST_COUNT }, (_unused, i) => (
            <span
              key={`d${i}`}
              ref={(el) => {
                dustRefs.current[i] = el;
              }}
              className="chest-dust"
              style={{ opacity: 0 }}
              aria-hidden
            />
          ))}
          {Array.from({ length: GLINT_COUNT }, (_unused, i) => (
            <span
              key={`g${i}`}
              ref={(el) => {
                glintRefs.current[i] = el;
              }}
              className="chest-glint"
              style={{ opacity: 0 }}
              aria-hidden
            />
          ))}
        </>
      ) : null,
    [hasLoot],
  );

  return (
    <div className="chest-open" role="dialog" aria-modal="true" aria-label="Treasure chest" data-chest-phase={phase} data-words={wordsSize}>
      {/* The whole screen is the one control. It draws nothing of its own. */}
      <button ref={tapRef} type="button" className="chest-open__tap" onClick={tap} aria-label={tapLabel} aria-disabled={phase === "bursting" || phase === "flying"} />

      <ChestWorld />
      {tallyOn ? (
        <span className="chest-open__payoff-rays" aria-hidden>
          <span ref={payoffRaysRef} className="chest-open__sunburst">
            <i />
          </span>
        </span>
      ) : null}

      <span ref={rigRef} className="chest-open__rig" style={{ "--light": light } as CSSProperties} aria-hidden>
        <ChestFloor />
        <span className="chest-open__pool" />
        <span ref={contactRef} className="chest-open__contact" />
        <span ref={chestRef} className="chest-open__chest" style={{ "--a": swing } as CSSProperties}>
          <span className="chest-open__beam" />
          <span className="chest-open__glow" />
          <span className="chest-open__rays">
            <i />
          </span>
          <ChestModel lid={lid} drained={emptied} />
          <i className="chest-open__star chest-open__star--a" />
          <i className="chest-open__star chest-open__star--b" />
          <i className="chest-open__star chest-open__star--c" />
        </span>
      </span>
      <span className="chest-world__foot" aria-hidden />

      <div className="chest-open__words">
        {phase === "done" && paid !== null ? (
          <div role="status">
            <h2 className="chest-open__amount" aria-label={paidHeadline(paid)}>
              <span aria-hidden>{headline}</span>
            </h2>
            {/* With a goal card under it, the card says what matters; the source is still read out. */}
            <p className={goal === null ? "chest-open__detail" : "sr-only"}>{request.detail}</p>
          </div>
        ) : null}
        {goalOn && goal !== null ? <CoinGoalBar goal={goal} shown={goalShown} className="chest-open__goal" /> : null}
        <p className={`chest-open__hint${phase === "done" ? " is-continue" : ""}`} aria-live="polite">
          {phase === "tapping" ? tapHint(taps) : phase === "done" ? "Tap to continue" : ""}
        </p>
      </div>

      {tallyOn ? (
        <p ref={payoffRef} className="chest-open__payoff" style={{ opacity: 0 }} aria-hidden>
          <span className="chest-open__payoff-num" style={{ fontSize: `${payoffCap}px`, width: `${finalEm}em` }}>
            {/* The whole payout from the burst on (round 4): it never reads +0. */}
            <CoinNumerals text={finalText} />
          </span>
        </p>
      ) : null}

      {tallyOn ? (
        <span ref={fxRef} className="chest-open__fx" aria-hidden>
          <span className="chest-open__ring" />
          {Array.from({ length: SPARK_COUNT }, (_unused, i) => (
            <i key={i} className="chest-open__spark" />
          ))}
        </span>
      ) : null}

      {tallyOn ? (
        <p ref={tallyRef} className="chest-open__tally" style={{ opacity: 0 }} aria-hidden>
          <span ref={tallyRowRef} className="chest-open__tally-row">
            <span className="chest-open__tally-rail">
              <span className="chest-open__tally-fill" style={{ width: `${railFill}%` }} />
              <span className="chest-open__tally-num" style={{ fontSize: `${walletCap}px`, width: `${walletEm}em` }} data-tally={tally}>
                <CoinNumerals text={walletText} />
              </span>
            </span>
            <span className="chest-open__tally-gem">
              <span ref={tallyFlashRef} className="chest-open__tally-flash" />
              <span ref={tallyCoinRef} className="chest-open__tally-coin">
                <CoinArt />
              </span>
            </span>
          </span>
          {/* The payout as a chip under the balance, the header's own +N. */}
          <span className="chest-open__tally-gain" style={{ fontSize: `${Math.round(railCap * 0.62)}px` }}>
            <CoinNumerals text={finalText} />
          </span>
        </p>
      ) : null}

      <span ref={floodRef} className="chest-open__flood" aria-hidden />

      {spillEls}
      {hitEls}
      {flyerEls}
    </div>
  );
}
