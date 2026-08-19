import { cn } from "@/lib/utils";

/**
 * Full-bleed pastel gradient washes, as a background layer.
 *
 * Adapted from the supplied component. What changed:
 *
 * 1. **No state.** The original carried a `useState` counter that nothing read
 *    or rendered, left over from the scaffold it was generated in. A background
 *    that re-renders on state it does not use is just a re-render.
 * 2. **The gradients are exported separately from the component.** They are
 *    plain CSS strings, and the intro needs to hand one to a `motion.div` it
 *    already animates rather than nest another absolutely positioned div inside.
 * 3. **It fills its parent instead of the screen.** `min-h-screen` on a
 *    background means it cannot be used as the backdrop of anything shorter, and
 *    every caller here already has a sized container.
 * 4. **`aria-hidden`,** since it is decoration and a screen reader has nothing
 *    to gain from it.
 */

/** Violet, cream, pink and blue pooling into the four corners. */
export const AURORA_DREAM = `
  radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175, 109, 255, 0.42), transparent 60%),
  radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255, 235, 170, 0.55), transparent 62%),
  radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255, 100, 180, 0.40), transparent 62%),
  radial-gradient(ellipse 70% 60% at 92% 92%, rgba(120, 190, 255, 0.45), transparent 62%),
  linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)
`;

/** The warmer variant: cream into orange, with a white bloom low-left. */
export const PEACHY_SUNRISE = `
  linear-gradient(180deg,
    rgba(255,247,237,1) 0%,
    rgba(255,237,213,0.8) 25%,
    rgba(254,215,170,0.6) 50%,
    rgba(251,146,60,0.4) 75%,
    rgba(249,115,22,0.3) 100%
  ),
  radial-gradient(circle at 20% 80%, rgba(255,255,255,0.6) 0%, transparent 40%),
  radial-gradient(circle at 80% 20%, rgba(254,215,170,0.5) 0%, transparent 50%),
  radial-gradient(circle at 60% 60%, rgba(252,165,165,0.3) 0%, transparent 45%)
`;

/**
 * The dark-mode counterpart, and the reason this exists.
 *
 * Both variants above bottom out in near-white, so on the dark opening they
 * washed the whole panel out. The page dealt with that by not rendering the
 * glow at all in dark mode, which is why there was no gradient there: it was
 * excluded rather than fixed.
 *
 * Built as tinted pools over a deep base rather than the light palette dimmed.
 * Dimming a light gradient gives you grey; a dark gradient wants its own,
 * more saturated hues at low alpha so the colour survives being dark.
 */
export const MIDNIGHT_BERRY = `
  radial-gradient(ellipse 90% 70% at 12% 10%, rgba(124, 58, 237, 0.34), transparent 62%),
  radial-gradient(ellipse 80% 62% at 82% 28%, rgba(56, 84, 214, 0.30), transparent 64%),
  radial-gradient(ellipse 75% 62% at 22% 84%, rgba(190, 64, 190, 0.24), transparent 64%),
  radial-gradient(ellipse 78% 64% at 92% 88%, rgba(38, 120, 200, 0.26), transparent 64%),
  linear-gradient(180deg, #171327 0%, #120f20 100%)
`;

const VARIANTS = {
  "aurora-dream": AURORA_DREAM,
  "peachy-sunrise": PEACHY_SUNRISE,
  "midnight-berry": MIDNIGHT_BERRY,
} as const;

export function BackgroundGradientGlow({
  variant = "aurora-dream",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ background: VARIANTS[variant] }}
    />
  );
}

export default BackgroundGradientGlow;
