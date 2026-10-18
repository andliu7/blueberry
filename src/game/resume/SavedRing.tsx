/**
 * The ring round a half-done lesson on the path.
 *
 * WHY IT EXISTS. Save-as-you-go kept the student's place from round 1, but on
 * the path a lesson left part way looked exactly like one never opened: same
 * chip, same icon, only the tag's word changed. The ring is the lesson bar
 * the student left, bent round the node, so "part way" reads before a tap.
 *
 * Drawn, not animated: it is a state, not a win, and the path is a screen a
 * student scrolls past many times (owner's effects rule, 15 Oct). Hidden from
 * screen readers, because the tag beside it already says CONTINUE and the
 * node's sheet says how many questions are saved.
 */

import "./resume.css";

export function SavedRing({ fraction }: { readonly fraction: number }) {
  const done = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  // One ellipse drawn as two arcs from the top, clockwise, so the fill starts at twelve o'clock.
  const d = "M50 2 A48 48 0 1 1 50 98 A48 48 0 1 1 50 2";
  return (
    <svg className="saved-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-saved-ring={done}>
      <path className="saved-ring__track" d={d} pathLength={100} vectorEffect="non-scaling-stroke" />
      {/* The same arc twice: a dark edge under a bright face, the lesson bar's own two greens,
          so the done part reads on the light sky, the dark sky, a purple chip and a green one. */}
      <path
        className="saved-ring__edge"
        d={d}
        pathLength={100}
        strokeDasharray={`${done} 100`}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="saved-ring__fill"
        d={d}
        pathLength={100}
        strokeDasharray={`${done} 100`}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
