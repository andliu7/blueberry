/**
 * The recipe strip: a lesson's progress, drawn as the one plain lesson bar.
 *
 * A2 ROUND 6, WHAT CHANGED AND WHY. This used to draw a capsule of beat-type
 * badges (an eye for the first look, a flask for the build, a gem for the
 * reward) riding on a green flow. Two blind judges and the critic read it the
 * same way: a row of cryptic icon pills, not a progress bar, and the first
 * segment's green showed as a half circle poking out of the pill. The bar the
 * product is judged against is one plain track that fills. So the strip now
 * draws LessonBar.tsx, the same bar the practice run draws, and the recipe
 * (which beats, in which order, which one you are on) moves to the screen
 * reader list underneath, where it is still the most useful thing to hear.
 *
 * A CONTROLLED, STATELESS VIEW. The segments arrive computed (template.ts's
 * recipeSegments) and so does the length of the fill (template.ts's
 * recipeProgress), because the web suite has no DOM and any rule living in
 * JSX is a rule nothing can test. This file only draws.
 *
 * THE FILL NEVER RUNS OVER A MISS. `recipeProgress` takes a CLEARED
 * fraction, not an answered one, so a wrong answer never fills the bar while
 * the tray underneath says "Not quite".
 */

import { LessonBar } from "./LessonBar";
import { recipeProgress, type RecipeSegment } from "./template";
import "./beat-chrome.css";

const STATE_WORD: Readonly<Record<RecipeSegment["state"], string>> = {
  done: "done",
  current: "you are here",
  todo: "coming up",
};

export interface RecipeStripProps {
  readonly segments: readonly RecipeSegment[];
  /**
   * 0 to 1: how far through the CURRENT segment's own beats the student has
   * CLEARED. Never how many they have answered: see the file header. Omit it
   * for single-beat segments, where partway does not exist.
   */
  readonly currentFraction?: number;
  readonly reducedMotion?: boolean;
  readonly className?: string;
}

/**
 * What a screen reader hears for one segment: "Rank the cations, you are
 * here". Pulled out of the JSX so the suite can pin it: the reward segment of
 * a fresh run must say "coming up", never "done".
 */
export function segmentSpoken(segment: RecipeSegment): string {
  return `${segment.label}, ${STATE_WORD[segment.state]}`;
}

export function RecipeStrip({ segments, currentFraction, reducedMotion = false, className = "" }: RecipeStripProps) {
  const position = segments.findIndex((segment) => segment.state === "current");
  const flow = recipeProgress(segments, currentFraction ?? 0);
  return (
    <div className={`recipe-strip ${className}`}>
      <LessonBar fraction={flow} label="Lesson progress" reducedMotion={reducedMotion} />
      <ol
        className="sr-only"
        aria-label={`Lesson recipe, ${position < 0 ? segments.length : position + 1} of ${segments.length}`}
      >
        {segments.map((segment, index) => (
          <li
            key={`${segment.slot}-${index}`}
            aria-current={segment.state === "current" ? "step" : undefined}
          >
            {segmentSpoken(segment)}
          </li>
        ))}
      </ol>
    </div>
  );
}
