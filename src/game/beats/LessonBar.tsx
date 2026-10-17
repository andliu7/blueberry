/**
 * The one lesson progress bar (A2 round 6).
 *
 * Every lesson screen in /app opens on the same header: the exit, then this
 * bar. It used to be two different things: the seven-slot lesson drew a
 * capsule of beat-type icon pucks (eye, flask, gem) that judges read as
 * "cryptic icons, not progress", and the practice run drew a thin bar with a
 * floating caption. Now both draw this: a 16px rounded track with a green
 * fill, the shape every reference lesson frame uses.
 *
 * A stateless view. The fraction arrives computed (template.ts recipeProgress
 * for a lesson, the run count for practice), so nothing here decides progress.
 */

import "./beat-chrome.css";

export interface LessonBarProps {
  /** 0 to 1. Clamped here, so a caller cannot draw past either end. */
  readonly fraction: number;
  /** What the bar measures, read to a screen reader ("Lesson progress"). */
  readonly label: string;
  readonly reducedMotion?: boolean;
}

export function LessonBar({ fraction, label, reducedMotion = false }: LessonBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div
      className={`lesson-bar${reducedMotion ? " lesson-bar--still" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      {/* No fill at all at 0, rather than a sliver: a 2px green cap on the
          left edge read as a rendering glitch (A2 round 5 critic). */}
      {percent > 0 ? <span className="lesson-bar__fill" style={{ width: `${percent}%` }} /> : null}
    </div>
  );
}
