/**
 * Bloom levels up (BLOOM-STATES-SPEC.md, C; Duolingo 11), and once per stage,
 * the easter egg MASCOT.md asks for: "Bloom is evolving!"
 *
 * LAZY. Hud.tsx imports this with React.lazy, so nobody downloads it until a
 * stage actually changes; it is never on the #/app first paint.
 *
 * THE LEVEL UP. A full-bleed stage (the page ground with the XP purple mixed
 * in), so the 36px Hud berry is covered rather than doubled: one berry per
 * frame. Bloom dips to 0.95, grows to 1.15 and back on a wrapper (uniform
 * growth cannot be a pose), a glow ring swells from 1 to 1.5 and fades, and
 * the badge rolls from the old level to the new one as the grow peaks. Proud
 * plus celebrate, MASCOT.md's row.
 *
 * THE EASTER EGG, at most once per stage (shouldPlayEvolving, one local key).
 * The stage goes dark, Bloom turns to a glowing silhouette while its little
 * hat flickers between two sizes, a white flash, and Bloom is exactly the
 * same size in a marginally larger hat. Caption, exactly as MASCOT.md writes
 * it: "Bloom did not evolve. Bloom got a hat." Under 2.4s, and a tap skips
 * straight to the level up. Genre trope only: no borrowed sprite, name or
 * sound. While the hat is on, the berry does not hop (the hat is drawn beside
 * the berry and would float off its head); the wrapper's grow carries the
 * celebration instead.
 *
 * REDUCED MOTION: the final frame at once. The hat and the caption when the
 * egg is owed, no flash, no grow, no ring, the new badge.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { BerryProps } from "../Berry";
import { pressClassName } from "../../app/ui/Press";
import { LEVEL_UP } from "../bloomMotion";
import { shouldPlayEvolving } from "./levelChange";
import { evolvingBeats, levelUpBeats } from "./progression";
import "./bloom-progression.css";

/** The highest stage the easter egg has played for. One key, per device. */
const EVOLVED_KEY = "blueberry.bloom.evolvedThrough";

function readEvolvedThrough(): number {
  try {
    const raw = window.localStorage.getItem(EVOLVED_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeEvolvedThrough(stage: number): void {
  try {
    window.localStorage.setItem(EVOLVED_KEY, String(stage));
  } catch {
    // Private window or blocked storage: the joke may play again. Harmless.
  }
}

/** The caption, word for word from MASCOT.md. */
export const EVOLVED_CAPTION = "Bloom did not evolve. Bloom got a hat.";

type Phase = "dark" | "silhouette" | "flash" | "reveal" | "level";

export interface BloomLevelUpProps {
  /**
   * Draws the berry. A render prop (a function the parent passes that returns
   * JSX) rather than an import of Berry here: Hud.tsx already has Berry on the
   * first paint, and this lazy file importing it too made the bundler split
   * Berry into a chunk of its own, which cost the #/app first paint 2 KB gz.
   */
  readonly renderBerry: (props: BerryProps) => ReactNode;
  readonly toStage: number;
  /** The badge text before and after: "Lv 3", "Lv 4". */
  readonly fromBadge: string;
  readonly toBadge: string;
  readonly reducedMotion: boolean;
  readonly onDone: () => void;
}

/** A small top hat. The evolved one is the same drawing, a marginal 15 percent larger (CSS). */
function Hat() {
  return (
    <svg viewBox="0 0 40 30" className="bloom-hat-art" aria-hidden focusable="false">
      <ellipse cx="20" cy="26" rx="19" ry="4" className="bloom-hat-brim" />
      <path d="M9 25V7c0-2 5-4 11-4s11 2 11 4v18c0 1.6-5 3-11 3S9 26.6 9 25z" className="bloom-hat-crown" />
      <path d="M9 19c0 1.6 5 3 11 3s11-1.4 11-3v4c0 1.6-5 3-11 3S9 24.6 9 23z" className="bloom-hat-band" />
    </svg>
  );
}

export default function BloomLevelUp({ renderBerry, toStage, fromBadge, toBadge, reducedMotion, onDone }: BloomLevelUpProps) {
  // Read once at mount. useState's initializer runs before any effect, so the
  // write below cannot make a development double mount skip the joke.
  const [evolving] = useState(() => shouldPlayEvolving(toStage, readEvolvedThrough()));
  const [phase, setPhase] = useState<Phase>(reducedMotion || !evolving ? "level" : "dark");
  const [rolled, setRolled] = useState(reducedMotion);
  const growRef = useRef<HTMLSpanElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (evolving) writeEvolvedThrough(toStage);
  }, [evolving, toStage]);

  // The egg's beats, scheduled once at mount. Each sets the phase once and the
  // motion between is CSS. A tap that already skipped to "level" wins, so a
  // late timer never drags the screen back into the egg.
  useEffect(() => {
    if (phase !== "dark") return;
    const b = evolvingBeats();
    const to = (next: Phase) => () => setPhase((p) => (p === "level" ? p : next));
    const ids = [
      window.setTimeout(to("silhouette"), b.silhouetteAt),
      window.setTimeout(to("flash"), b.flashAt),
      window.setTimeout(to("reveal"), b.revealAt),
      window.setTimeout(to("level"), b.doneAt),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
    // Mount only: the phase it reads is the first one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The level up itself: the grow on the wrapper (Web Animations, because its
  // offsets are worked out from LEVEL_UP and a CSS keyframe cannot read them)
  // and the badge roll on a timer.
  useEffect(() => {
    if (phase !== "level") return;
    continueRef.current?.focus();
    if (reducedMotion) return;
    const beats = levelUpBeats();
    const roll = window.setTimeout(() => setRolled(true), beats.badgeAt);
    const total = LEVEL_UP.dipMs + LEVEL_UP.growMs;
    const node = growRef.current;
    const grow =
      node !== null && typeof node.animate === "function"
        ? node.animate(
            [
              { transform: "scale(1)" },
              { transform: `scale(${LEVEL_UP.dipScale})`, offset: LEVEL_UP.dipMs / total, easing: "cubic-bezier(.35, 1.8, .35, .83)" },
              { transform: `scale(${LEVEL_UP.growScale})`, offset: (LEVEL_UP.dipMs + LEVEL_UP.growMs / 2) / total, easing: "cubic-bezier(.45, 0, .55, 1)" },
              { transform: "scale(1)" },
            ],
            // --bloom-ease-pop into the peak, sine back down. The API cannot read a CSS variable.
            { duration: total, easing: "linear" },
          )
        : null;
    return () => {
      window.clearTimeout(roll);
      grow?.cancel();
    };
  }, [phase, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const level = phase === "level";
  const caption =
    phase === "silhouette" || phase === "flash" ? "Bloom is evolving!" : evolving && (phase === "reveal" || level) ? EVOLVED_CAPTION : null;

  return createPortal(
    <div
      className="bloom-lvl"
      role="dialog"
      aria-modal="true"
      aria-label={`Level up. Bloom reached ${toBadge}.`}
      data-phase={phase}
      data-reduced={reducedMotion ? "true" : undefined}
      // A tap during the egg skips to the level up (on release, the repo's press rule); Continue or Escape closes it.
      onClick={() => {
        if (!level) setPhase("level");
      }}
    >
      {/* Mounted on the flash and kept through the reveal, so it fades out rather than cutting. */}
      {phase === "flash" || phase === "reveal" ? <span className="bloom-lvl-flash" aria-hidden /> : null}
      <div className="bloom-lvl-card">
        <span className="bloom-lvl-stage">
          {level && !reducedMotion ? <span className="bloom-lvl-ring" style={{ animationDuration: `${LEVEL_UP.ringMs}ms` }} aria-hidden /> : null}
          <span ref={growRef} className="bloom-lvl-grow">
            <span className="bloom-lvl-berry" data-silhouette={phase === "silhouette" ? "true" : undefined}>
              {renderBerry({
                mood: level ? "proud" : phase === "reveal" ? "happy" : "curious",
                behaviour: level && !evolving ? "celebrate" : "idle",
                behaviourKey: level ? 1 : 0,
                sizePx: 120,
                reducedMotion,
              })}
              {/* The small hat from the start of the egg; the bigger one from the reveal on. */}
              {evolving ? (
                <span className="bloom-hat" data-size={phase === "reveal" || level ? "big" : "small"} data-flicker={phase === "silhouette" ? "true" : undefined}>
                  <Hat />
                </span>
              ) : null}
            </span>
          </span>
          {level ? (
            <span className="bloom-lvl-badge" data-rolled={rolled ? "true" : undefined} aria-hidden>
              <span className="bloom-lvl-badge-track" style={{ transitionDuration: `${LEVEL_UP.badgeRollMs}ms` }}>
                <span>{fromBadge}</span>
                <span>{toBadge}</span>
              </span>
            </span>
          ) : null}
        </span>
        <p className="bloom-lvl-caption" aria-live="polite">
          {caption ?? " "}
        </p>
        {/* Laid out from the first frame and only revealed at the level up, so Bloom
            does not jump up the screen when the title arrives. Hidden content is
            out of the tab order too, so Continue is not reachable early. */}
        <div className="bloom-lvl-words" style={{ visibility: level ? "visible" : "hidden" }}>
          <h2 className="bb-title-face bloom-lvl-title">Level up</h2>
          <p className="bloom-lvl-said">Bloom reached {toBadge}.</p>
          <button ref={continueRef} type="button" className={pressClassName({ block: true, size: "lg" })} onClick={onDone}>
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
