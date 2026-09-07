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
 * picture. Nine paths and two labels cost nothing.
 *
 * The chemistry is meant to survive a reader who knows it. Cyanide is a carbon
 * nucleophile, so the first arrow leaves the carbon rather than the nitrogen,
 * and the second moves the C=O pi pair onto oxygen to give the alkoxide. That
 * is the textbook cyanohydrin opening, not decorative arrow pushing.
 */

/**
 * One shared timeline, so every element is keyed to the same six moments:
 * start, first arrow drawn, second arrow drawn, verdict in, hold over, cleared.
 *
 * Shared rather than per-element because the beats have to stay in order, and
 * four independent transitions drift out of step the first time one duration is
 * nudged.
 */
const TIMES = [0, 0.1, 0.22, 0.36, 0.92, 1];
const LOOP = { duration: 6, times: TIMES, repeat: Infinity, ease: "easeInOut" } as const;

/** Apex at the origin, pointing up. Rotated onto the end of each arrow. */
const HEAD = "M 0 0 L -5.5 10.5 L 5.5 10.5 Z";

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

        {/* The two arrows, and the only things that move. */}
        <g
          className="text-fuchsia-500 dark:text-fuchsia-400"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
        >
          {/* Arrow one: the cyanide carbon's lone pair onto the carbonyl carbon. */}
          <motion.path
            d="M 86 144 C 116 148, 150 138, 170 104"
            initial={{ pathLength: 0 }}
            animate={drawn ?? { pathLength: [0, 1, 1, 1, 1, 1], opacity: [1, 1, 1, 1, 1, 0] }}
            transition={loop}
          />
          <motion.path
            d={HEAD}
            transform="translate(170,104) rotate(29)"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={drawn ?? { opacity: [0, 1, 1, 1, 1, 0] }}
            transition={loop}
          />

          {/* Arrow two: the pi pair up onto the oxygen. */}
          <motion.path
            d="M 188 76 C 210 70, 210 46, 190 40"
            initial={{ pathLength: 0 }}
            animate={drawn ?? { pathLength: [0, 0, 1, 1, 1, 1], opacity: [1, 1, 1, 1, 1, 0] }}
            transition={loop}
          />
          <motion.path
            d={HEAD}
            transform="translate(190,40) rotate(-73)"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={drawn ?? { opacity: [0, 0, 1, 1, 1, 0] }}
            transition={loop}
          />
        </g>
      </svg>

      {/* The verdict, which is the half of the game a picture of a molecule
          cannot show: the step comes back named, not ticked. Its space is
          reserved whether or not it is showing, so the tile never reflows
          under the beat. */}
      <motion.div
        className="mt-1 flex justify-center"
        initial={{ opacity: 0, y: 6 }}
        animate={reduce ? { opacity: 1, y: 0 } : { opacity: [0, 0, 0, 1, 1, 0], y: [6, 6, 6, 0, 0, 0] }}
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
