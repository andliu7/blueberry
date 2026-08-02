"use client";

import { useId, useRef, useState } from "react";
import { motion } from "motion/react";

/**
 * Animated Theme Toggler — sun↔moon morph.
 *
 * Sun rays shrink and rotate away.
 * Center circle swells into a moon body.
 * A mask carves the crescent. Spring physics throughout.
 * A soft switch-click sounds on toggle.
 */

/* ── Types ── */

export interface AnimatedThemeTogglerProps {
  sound?: boolean;
  /** localStorage key the choice is written to. */
  storageKey?: string;
}

/* ── Audio ── */

let _ctx: AudioContext | null = null;
let _buf: AudioBuffer | null = null;

function audioCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function ensureBuf(ac: AudioContext): AudioBuffer {
  if (_buf && _buf.sampleRate === ac.sampleRate) return _buf;
  const rate = ac.sampleRate;
  const len = Math.floor(rate * 0.006);
  const buf = ac.createBuffer(1, len, rate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const sine = Math.sin(2 * Math.PI * 3400 * t);
    const noise = Math.random() * 2 - 1;
    ch[i] = (sine * 0.6 + noise * 0.4) * (1 - t) ** 3;
  }
  _buf = buf;
  return buf;
}

function tick(last: { current: number }) {
  const now = performance.now();
  if (now - last.current < 80) return;
  last.current = now;
  try {
    const ac = audioCtx();
    const buf = ensureBuf(ac);
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buf;
    gain.gain.value = 0.08;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  } catch {
    /* silent */
  }
}

/* ── Component ── */

export function AnimatedThemeToggler({
  sound = true,
  storageKey = "theme",
}: AnimatedThemeTogglerProps) {
  const rawId = useId();
  const maskId = `att${rawId.replace(/:/g, "")}`;
  const lastSnd = useRef(0);

  // Seeded from the class the pre-paint script in index.html already applied.
  // Reading it in an effect instead would render the sun for a frame and then
  // flip, and `initial={false}` already suppresses any mount animation.
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = () => {
    const root = document.documentElement;
    // Crossfade every themed surface together for the length of the swap.
    // Without this the untransitioned elements flip a beat ahead of the body.
    root.classList.add("theme-transition");
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      root.classList.remove("theme-transition");
      swapTimer.current = null;
    }, 260);

    const dark = root.classList.toggle("dark");
    setIsDark(dark);
    // Persist, so the choice survives a reload and the pre-paint script can
    // restore it before anything renders.
    try {
      localStorage.setItem(storageKey, dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
    if (sound) tick(lastSnd);
  };

  const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <>
      <style>{`
        .att-btn{--at-ink:rgba(0,0,0,0.82)}
        .dark .att-btn,[data-theme="dark"] .att-btn{--at-ink:rgba(255,255,255,0.82)}
      `}</style>
      <motion.button
        className="att-btn"
        onClick={toggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.86 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--at-ink)",
          borderRadius: 8,
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        aria-pressed={isDark}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{ rotate: isDark ? 270 : 0 }}
          transition={spring}
          style={{ overflow: "visible" }}
        >
          {/* Mask carves the crescent from the center circle */}
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.circle
              initial={false}
              animate={{ cx: isDark ? 17 : 33, cy: isDark ? 8 : 0 }}
              transition={spring}
              r="9"
              fill="black"
            />
          </mask>

          {/* Center body — small sun circle or large crescent moon */}
          <motion.circle
            cx="12"
            cy="12"
            fill="currentColor"
            stroke="none"
            mask={`url(#${maskId})`}
            initial={false}
            animate={{ r: isDark ? 9 : 5 }}
            transition={spring}
          />

          {/* Rays — shrink and rotate when dark */}
          <motion.g
            initial={false}
            animate={{
              opacity: isDark ? 0 : 1,
              scale: isDark ? 0 : 1,
              rotate: isDark ? -30 : 0,
            }}
            transition={spring}
            style={{ transformOrigin: "12px 12px" }}
          >
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="5.64" y1="5.64" x2="4.22" y2="4.22" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            <line x1="5.64" y1="18.36" x2="4.22" y2="19.78" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          </motion.g>
        </motion.svg>
      </motion.button>
    </>
  );
}

export default AnimatedThemeToggler;
