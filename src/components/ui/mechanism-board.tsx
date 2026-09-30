import { motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A mechanism being drawn, on a loop.
 *
 * The home board's biggest tile is the game, and the game is not a thing an
 * icon can describe. What separates it from a flashcard is that the student
 * pushes the arrows and the step comes back marked, so the tile shows exactly
 * that in about six seconds: cyanide attacks the ketone, the pi bond drops onto
 * the oxygen, the step is named and correct.
 *
 * Hand-drawn SVG rather than the real editor, deliberately. `ui/molecule-canvas`
 * is the real one and it drags in roughly 19MB of Ketcher WASM, and `HomePage`
 * is the one route that is not even code-split because it is where most people
 * land. The last thing this tile may do is pull in a drawing engine to draw a
 * picture. A dozen paths and circles and two labels cost nothing.
 *
 * It plays the push the way the game's trainer now feels (TrainerCanvas.tsx):
 * the electrons glow before anything is touched, the arrow grows under a
 * finger, the target lights as the finger arrives, release lands the head,
 * and the verdict turns the arrows themselves green. The cyanide carbon's one
 * lone pair is drawn as two dots; RDKit on [C-]#N gives that carbon two
 * nonbonding electrons.
 *
 * The chemistry is meant to survive a reader who knows it. Cyanide is a carbon
 * nucleophile, so the first arrow leaves the carbon rather than the nitrogen,
 * and the second moves the C=O pi pair onto oxygen to give the alkoxide. That
 * is the textbook cyanohydrin opening, not decorative arrow pushing.
 */

/**
 * One shared timeline, so every element is keyed to the same sixteen moments,
 * and the tile plays the game's own push rather than two arrows appearing:
 *
 *   0     the cyanide pair glows, nothing touched yet
 *   1-5   a finger drags from the pair; the arrow follows it as it goes, and
 *         the carbonyl carbon lights up as the finger arrives (the snap)
 *   6     release: the head lands and a ring leaves the carbon (the commit)
 *   7-11  the finger takes the pi pair up to the oxygen, same beats
 *   12    release
 *   13    the verdict: both arrows turn green with the named step
 *   14-15 hold, then clear
 *
 * Shared rather than per-element because the beats have to stay in order, and
 * independent transitions drift out of step the first time one is nudged.
 * The finger's keyframes are points ON each arrow's own cubic (at a quarter,
 * a half, three quarters), so the arrow grows exactly under it.
 */
const TIMES = [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46, 0.52, 0.56, 0.92, 1];
const LOOP = { duration: 6.5, times: TIMES, repeat: Infinity, ease: "linear" } as const;

/** A keyframe row: one value per moment in TIMES. */
// Mutable on purpose: motion's keyframe type does not take a readonly array.
type Row = number[];
const FINGER_X: Row = [86, 86, 109, 132, 153, 170, 170, 188, 200, 205, 201, 190, 190, 190, 190, 190];
const FINGER_Y: Row = [144, 144, 144, 138, 125, 104, 104, 76, 69, 58, 47, 40, 40, 40, 40, 40];
const FINGER_ON: Row = [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0];
const ARROW_ONE: Row = [0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const ARROW_TWO: Row = [0, 0, 0, 0, 0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1, 1];
const HEAD_ONE: Row = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
const HEAD_TWO: Row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0];
const SHOWN: Row = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
/** The snap: the target lights as the finger arrives, then rings outward on release. */
const SNAP_ONE: Row = [0, 0, 0, 0, 0.9, 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const SNAP_ONE_R: Row = [11, 11, 11, 11, 11, 11, 20, 20, 20, 20, 20, 20, 20, 20, 20, 11];
const SNAP_TWO: Row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0.9, 0, 0, 0, 0];
const SNAP_TWO_R: Row = [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 20, 20, 20, 11];
/** The pair glows until the finger lifts it. */
const PAIR_GLOW: Row = [0.85, 0.85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.85];
const VERDICT: Row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0];

/** Apex at the origin, pointing up. Rotated onto the end of each arrow. */
const HEAD = "M 0 0 L -5.5 10.5 L 5.5 10.5 Z";
const ARROW_ONE_D = "M 86 144 C 116 148, 150 138, 170 104";
const ARROW_TWO_D = "M 188 76 C 210 70, 210 46, 190 40";

export function MechanismBoard({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  /**
   * With the preference set the whole thing renders at its last beat: both
   * arrows drawn, the verdict up. The point of the tile is the finished
   * picture, and that survives having the animation taken away from it.
   */
  const loop = reduce ? undefined : LOOP;
  const drawn = reduce ? { pathLength: 1, opacity: 1 } : undefined;

  // The clear-out fades rather than un-draws. Rubbing an arrow out backwards
  // looked like the answer being taken away, and the heads went first, which
  // left two headless curves on screen for half a second.

  return (
    <div className={cn("flex flex-col", className)}>
      <svg
        // Cropped to the drawing rather than to a round number. A viewBox with
        // margin in it is margin the tile cannot use, and this art sits beside
        // a headline that wants the room.
        viewBox="34 18 194 149"
        className="w-full"
        role="img"
        aria-label="A ketone with a cyanide nucleophile. One curved arrow runs from the cyanide carbon to the carbonyl carbon, a second moves the carbon oxygen pi bond onto the oxygen."
      >
        {/* The structure, static. It stays on screen between beats so the tile
            still reads as chemistry at any moment somebody happens to look. */}
        <g
          className="text-slate-800 dark:text-stone-100"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        >
          {/* C=O, drawn as two lines rather than one thick one, because a
              double bond a student can count is the whole point of the arrow
              that is about to move it. */}
          <line x1={172} y1={90} x2={172} y2={52} />
          <line x1={180} y1={90} x2={180} y2={52} />
          {/* The two methyls off the carbonyl carbon at (176, 96). */}
          <line x1={176} y1={96} x2={134} y2={120} />
          <line x1={176} y1={96} x2={218} y2={120} />
        </g>

        <g className="text-slate-800 dark:text-stone-100" fill="currentColor">
          <text x={176} y={44} textAnchor="middle" fontSize={19} fontWeight={600}>
            O
          </text>
          <text x={44} y={152} fontSize={17} fontWeight={600}>
            N&#8801;C
            <tspan dy={-7} fontSize={12}>
              &#8722;
            </tspan>
          </text>
        </g>

        {/* The glowing pair on the cyanide carbon: what the student grabs.
            Amber is the game's electron colour, drawn from Tailwind's own
            family because this tile is site chrome, not game canvas. At
            x 91, clear of the charge's minus sign, which x 86 sat on. */}
        <g className="text-amber-500 dark:text-amber-300" fill="currentColor">
          <motion.circle
            cx={91}
            cy={144}
            r={8}
            initial={{ opacity: reduce ? 0 : 0.85 }}
            animate={reduce ? { opacity: 0 } : { opacity: PAIR_GLOW }}
            transition={loop}
            fillOpacity={0.35}
          />
          <circle cx={91} cy={141} r={1.9} />
          <circle cx={91} cy={147} r={1.9} />
        </g>

        {/* The snap: each target lights as the finger arrives and rings out
            on release. Rendered only when the loop runs. */}
        {reduce ? null : (
          <g className="text-blue-500 dark:text-blue-400" stroke="currentColor" fill="none" strokeWidth={2.4}>
            <motion.circle cx={176} cy={96} initial={{ opacity: 0, r: 11 }} animate={{ opacity: SNAP_ONE, r: SNAP_ONE_R }} transition={loop} />
            <motion.circle cx={176} cy={37} initial={{ opacity: 0, r: 11 }} animate={{ opacity: SNAP_TWO, r: SNAP_TWO_R }} transition={loop} />
          </g>
        )}

        {/* The two arrows, growing under the finger. */}
        <g
          className="text-blue-500 dark:text-blue-400"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        >
          <motion.path
            d={ARROW_ONE_D}
            initial={{ pathLength: 0 }}
            animate={drawn ?? { pathLength: ARROW_ONE, opacity: SHOWN }}
            transition={loop}
          />
          <motion.path
            d={HEAD}
            transform="translate(170,104) rotate(29)"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={drawn ?? { opacity: HEAD_ONE }}
            transition={loop}
          />
          <motion.path
            d={ARROW_TWO_D}
            initial={{ pathLength: 0 }}
            animate={drawn ?? { pathLength: ARROW_TWO, opacity: SHOWN }}
            transition={loop}
          />
          <motion.path
            d={HEAD}
            transform="translate(190,40) rotate(-73)"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={drawn ?? { opacity: HEAD_TWO }}
            transition={loop}
          />
        </g>

        {/* The verdict on the arrows themselves: a green copy laid over the
            blue at the moment the step is marked, the same instant as the
            pill below, so "correct" is said where the chemistry is. */}
        <motion.g
          className="text-emerald-600 dark:text-emerald-400"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={reduce ? { opacity: 1 } : { opacity: VERDICT }}
          transition={loop}
        >
          <path d={ARROW_ONE_D} />
          <path d={HEAD} transform="translate(170,104) rotate(29)" fill="currentColor" stroke="none" />
          <path d={ARROW_TWO_D} />
          <path d={HEAD} transform="translate(190,40) rotate(-73)" fill="currentColor" stroke="none" />
        </motion.g>

        {/* The finger: a touch point that carries the pair along each arrow. */}
        {reduce ? null : (
          <motion.circle
            r={6}
            className="text-slate-800 dark:text-stone-100"
            fill="currentColor"
            fillOpacity={0.18}
            stroke="currentColor"
            strokeWidth={1.6}
            initial={{ cx: FINGER_X[0], cy: FINGER_Y[0], opacity: 0 }}
            animate={{ cx: FINGER_X, cy: FINGER_Y, opacity: FINGER_ON }}
            transition={loop}
          />
        )}
      </svg>

      {/* The verdict, which is the half of the game a picture of a molecule
          cannot show: the step comes back named, not ticked. Its space is
          reserved whether or not it is showing, so the tile never reflows
          under the beat. */}
      <motion.div
        className="mt-1 flex justify-center"
        initial={{ opacity: 0, y: 6 }}
        animate={reduce ? { opacity: 1, y: 0 } : { opacity: VERDICT, y: VERDICT.map((v) => (v > 0 ? 0 : 6)) }}
        transition={loop}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
          <Check className="size-3.5" />
          <span className="text-xs font-semibold">Correct &middot; nucleophilic addition</span>
        </span>
      </motion.div>
    </div>
  );
}

export default MechanismBoard;
