/**
 * OPENING A CHEST, owner pick C1 (20 Oct): three taps, each shaking the box
 * harder while the light behind it grows; the third blows the lid off, white
 * light fills the screen, five diamonds drop in, hover a beat, then fly one
 * by one into the diamond counter, which counts up with a clink per diamond.
 *
 * Lazy (ChestHost.tsx): nobody downloads this until a chest is opened, which
 * keeps it out of the #/app cold load.
 *
 * THE ECONOMY WRITE HAPPENS ON THE THIRD TAP, through `request.open()`, and
 * this file only animates what that returned. Closing before the third tap
 * writes nothing, so the chest stays saved.
 *
 * THE MOVEMENT IS IMPERATIVE ON PURPOSE. React renders the pieces (the chest,
 * the flood, the diamonds) and the Web Animations API moves them, because
 * the paths depend on where the counter sits on screen at that moment and a
 * re-render per frame would be the slow way to draw a 600 ms flight. Every
 * timer and animation is recorded, and the unmount cleanup cancels them all.
 *
 * REDUCED MOTION: one tap opens it, nothing shakes or flies, the counter
 * takes the new balance at once and the result card says what it paid.
 *
 * BLOOM, added 24 Oct (BLOOM-STATES-SPEC.md, C, Chest opened): one berry
 * beside the chest, leaning in and looking at it. Each tap makes it wide eyed
 * and it leans back in; the lid blowing off makes it hop; while the diamonds
 * fly it watches them go up to the counter. The diamonds keep the flight
 * above (owner pick C1) rather than BloomCatch's: Bloom reacts to them, it
 * does not draw a second set.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Berry } from "../mascot/Berry";
import type { BerryBehaviour } from "../mascot/berryBehaviour";
import type { BerryLook, BerryMood } from "../mascot/berryMood";
import { pressClassName } from "../app/ui/Press";
import { bumpHudDiamonds, holdHudDiamonds, hudDiamondsRect } from "../app/ui/hudTargets";
import { playGem } from "../sound/gameSound";
import { ChestArt, GemArt } from "./ChestArt";
import "./chestOpening.css";
import { GEM_COUNT, TAPS_TO_OPEN, counterSteps, paidHeadline, tapChest, tapHint, type OpenResult, type PlayRequest } from "./chestFlow";

type Phase = "tapping" | "bursting" | "flying" | "done";

const LIFT_ATTR = "data-chest-lift";

/** Bloom's face and motion for each phase of the opening. */
const BLOOM_MOOD: Readonly<Record<Phase, BerryMood>> = { tapping: "curious", bursting: "cheer", flying: "cheer", done: "happy" };
/** At the chest, a little down; then up and right, where the counter is. */
const LOOK_AT_CHEST: BerryLook = { x: 1, y: 0.3 };
const LOOK_AT_COUNTER: BerryLook = { x: 1, y: -1 };
/** After a tap's wide eyes, back into the lean. */
const LEAN_AGAIN: readonly BerryBehaviour[] = ["leanIn"];

/** Half a diamond's box, so a translate puts its centre on a point. */
const GEM_HALF_W = 24;
const GEM_HALF_H = 22;

function at(x: number, y: number, scale = 1): string {
  return `translate(${x - GEM_HALF_W}px, ${y - GEM_HALF_H}px) scale(${scale})`;
}

export default function ChestOpening({
  request,
  reducedMotion,
  onClose,
}: {
  readonly request: PlayRequest;
  readonly reducedMotion: boolean;
  readonly onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("tapping");
  const [taps, setTaps] = useState(0);
  // Bumped per tap so the shake animation restarts (a fresh key remounts nothing,
  // it only toggles the class off and on through the effect below).
  const [shake, setShake] = useState(0);
  const [paid, setPaid] = useState<OpenResult | null>(null);
  const [gems, setGems] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const chestRef = useRef<HTMLButtonElement>(null);
  const floodRef = useRef<HTMLSpanElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const gemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timers = useRef<number[]>([]);
  const animations = useRef<Animation[]>([]);
  const alive = useRef(true);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(window.setTimeout(resolve, ms));
    });

  // Focus moves into the layer on arrival (the layer, not the chest, so no
  // focus ring frames the chest), and every loose end is cleaned on the way out.
  useEffect(() => {
    alive.current = true;
    rootRef.current?.focus();
    return () => {
      alive.current = false;
      for (const id of timers.current) window.clearTimeout(id);
      for (const animation of animations.current) animation.cancel();
      document.documentElement.removeAttribute(LIFT_ATTR);
      holdHudDiamonds(null);
    };
  }, []);

  useEffect(() => {
    if (phase === "done") continueRef.current?.focus();
  }, [phase]);

  // Restart the shake on every tap: drop the class, force a reflow, add it back.
  useEffect(() => {
    const chest = chestRef.current;
    if (shake === 0 || chest === null || reducedMotion) return;
    chest.classList.remove("is-shaking");
    void chest.offsetWidth;
    chest.classList.add("is-shaking");
  }, [shake, reducedMotion]);

  const close = () => {
    document.documentElement.removeAttribute(LIFT_ATTR);
    holdHudDiamonds(null);
    onClose();
  };

  // Escape leaves before the chest is open (it stays saved) and after.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (phase === "tapping" || phase === "done")) close();
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

  const burst = async () => {
    const result = request.open();
    // Every diamond starts in the air: the counter holds its old number.
    holdHudDiamonds(Math.max(0, result.diamonds));
    const count = Math.min(GEM_COUNT, Math.max(0, result.diamonds));
    setPaid(result);
    setGems(count);
    setPhase("bursting");
    document.documentElement.setAttribute(LIFT_ATTR, "");

    const chest = chestRef.current?.getBoundingClientRect();
    const cx = chest === undefined ? window.innerWidth / 2 : chest.left + chest.width / 2;
    const cy = chest === undefined ? window.innerHeight / 2 : chest.top + chest.height / 2;
    const flood = floodRef.current;
    if (flood !== null) {
      flood.style.left = `${cx}px`;
      flood.style.top = `${cy}px`;
      animate(
        flood,
        [
          { transform: "scale(0)", opacity: 1 },
          { transform: "scale(30)", opacity: 1, offset: 0.55 },
          { transform: "scale(30)", opacity: 1, offset: 0.75 },
          { transform: "scale(32)", opacity: 0 },
        ],
        { duration: 1500, easing: "cubic-bezier(.19, 1, .22, 1)", fill: "forwards" },
      );
    }
    await wait(900);
    if (!alive.current) return;

    const els = gemRefs.current.slice(0, count).filter((el): el is HTMLSpanElement => el !== null);
    if (els.length === 0) {
      holdHudDiamonds(null);
      setPhase("done");
      return;
    }

    // Drop in from above the screen to a shallow arc over the chest, kept
    // inside the viewport on a narrow phone.
    const gap = Math.min(62, (window.innerWidth - 64) / Math.max(1, els.length - 1));
    const slots = els.map((_el, i) => {
      const o = i - (els.length - 1) / 2;
      return { x: cx + o * gap, y: Math.max(120, cy - 150) + Math.abs(o) * 22 };
    });
    els.forEach((el, i) => {
      const slot = slots[i]!;
      animate(
        el,
        [
          { transform: at(slot.x + (i - 2) * 6, -60 - i * 20), opacity: 1 },
          { transform: at(slot.x, slot.y), opacity: 1 },
        ],
        { duration: 620 + i * 70, delay: i * 60, easing: "cubic-bezier(.34, 1.56, .64, 1)", fill: "forwards" },
      );
    });
    await wait(1000);
    if (!alive.current) return;
    for (const el of els) el.firstElementChild?.classList.add("is-hover");
    await wait(650);
    if (!alive.current) return;

    setPhase("flying");
    // How many have landed after each one; the counter shows the rest still flying.
    const steps = counterSteps(0, result.diamonds, els.length);
    const rect = hudDiamondsRect();
    const tx = rect === null ? window.innerWidth - 40 : rect.left + rect.width / 2;
    const ty = rect === null ? 28 : rect.top + rect.height / 2;
    els.forEach((el, i) => {
      timers.current.push(
        window.setTimeout(() => {
          const from = slots[i]!;
          el.firstElementChild?.classList.remove("is-hover");
          const flight = animate(
            el,
            [
              { transform: at(from.x, from.y, 1), opacity: 1 },
              { transform: at((from.x + tx) / 2, (from.y + ty) / 2 - 30, 0.85), opacity: 1, offset: 0.45 },
              { transform: at(tx, ty, 0.42), opacity: 1 },
            ],
            { duration: 480, easing: "cubic-bezier(.76, 0, .24, 1)", fill: "forwards" },
          );
          const land = () => {
            if (!alive.current) return;
            el.style.visibility = "hidden";
            holdHudDiamonds(result.diamonds - steps[i]!);
            bumpHudDiamonds();
            playGem();
            if (i === els.length - 1) {
              timers.current.push(
                window.setTimeout(() => {
                  holdHudDiamonds(null);
                  setPhase("done");
                }, 260),
              );
            }
          };
          if (flight === null) land();
          else flight.onfinish = land;
        }, i * 110),
      );
    });
  };

  const tap = () => {
    if (phase !== "tapping") return;
    const next = tapChest(taps, reducedMotion);
    setTaps(next.taps);
    setShake((n) => n + 1);
    if (!next.opens) return;
    if (reducedMotion) {
      setPaid(request.open());
      setPhase("done");
      playGem();
      return;
    }
    setPhase("bursting");
    // The third shake swings widest, then the lid goes.
    timers.current.push(
      window.setTimeout(() => {
        if (alive.current) void burst();
      }, 380),
    );
  };

  const open = phase !== "tapping";
  // How bright the light behind the box is: grows per tap, full at the burst.
  const light = phase === "tapping" ? taps * 0.35 : phase === "bursting" ? 1 : 0.6;
  const swing = phase === "tapping" ? `${taps * 4}deg` : "12deg";
  const bloomBehaviour: BerryBehaviour =
    phase === "tapping" ? (shake > 0 ? "wideEyed" : "leanIn") : phase === "bursting" ? "bounce" : "idle";

  return (
    <div ref={rootRef} tabIndex={-1} className="chest-open" role="dialog" aria-modal="true" aria-label="Treasure chest" data-chest-phase={phase}>
      {phase === "tapping" ? (
        <button type="button" className="chest-open__close" onClick={close}>
          Later
        </button>
      ) : null}

      <div className="chest-open__seat">
      <span className="chest-open__bloom" aria-hidden>
        {/* behaviourKey={shake} replays the wide eyes on every tap, even though the behaviour name stays the same. */}
        <Berry
          mood={BLOOM_MOOD[phase]}
          behaviour={bloomBehaviour}
          behaviourKey={phase === "tapping" ? shake : 0}
          chain={phase === "tapping" ? LEAN_AGAIN : undefined}
          lookAt={phase === "flying" ? LOOK_AT_COUNTER : LOOK_AT_CHEST}
          sizePx={64}
          reducedMotion={reducedMotion}
        />
      </span>
      <button
        ref={chestRef}
        type="button"
        className={`chest-open__chest${phase === "bursting" && !reducedMotion ? " is-burst" : ""}`}
        style={{ "--light": light, "--a": swing } as CSSProperties}
        onClick={tap}
        aria-label={open ? "Treasure chest, open" : `Treasure chest. Tap ${TAPS_TO_OPEN - taps} more ${TAPS_TO_OPEN - taps === 1 ? "time" : "times"} to open it`}
        aria-disabled={open}
      >
        <span className="chest-open__glow" aria-hidden />
        <span className="chest-open__rays" aria-hidden>
          <i />
        </span>
        <ChestArt open={open && paid !== null} />
      </button>
      </div>

      <p className="chest-open__hint" aria-live="polite">
        {phase === "tapping" ? tapHint(taps) : ""}
      </p>
      <span className="chest-open__dots" aria-hidden style={{ visibility: phase === "tapping" ? "visible" : "hidden" }}>
        {Array.from({ length: reducedMotion ? 1 : TAPS_TO_OPEN }, (_unused, i) => (
          <i key={i} className={i < taps ? "is-on" : ""} />
        ))}
      </span>

      <span ref={floodRef} className="chest-open__flood" aria-hidden />

      {Array.from({ length: gems }, (_unused, i) => (
        <span
          key={i}
          ref={(el) => {
            gemRefs.current[i] = el;
          }}
          className="chest-gem"
          style={{ opacity: 0 }}
          aria-hidden
        >
          <span className="chest-gem__bob">
            <span className="chest-gem__spin">
              <GemArt />
            </span>
          </span>
        </span>
      ))}

      {phase === "done" && paid !== null ? (
        <div className="chest-open__result" role="status">
          <h2 className="chest-open__amount">{paidHeadline(paid)}</h2>
          <p className="chest-open__detail">{request.detail}</p>
          <button ref={continueRef} type="button" className={pressClassName({ block: true, size: "lg" })} onClick={close} data-chest-continue>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
