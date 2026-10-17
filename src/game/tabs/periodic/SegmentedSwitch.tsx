/**
 * The sliding segmented switch (approved effect #12): ONE row on a tinted
 * track, and one white thumb with a lip that slides under the chosen option.
 *
 * Placement rules from the owner, and how this meets them:
 *  - Nothing animates on first paint. The thumb is placed before paint and only
 *    gets its slide transition after the student has tapped once (`slid`).
 *  - No layout shift. The thumb is absolutely positioned behind the buttons, so
 *    moving it never moves anything else, and the row never wraps, so the
 *    control is the same height whatever is chosen.
 *  - Reduced motion: periodic.css drops the transition, the thumb jumps.
 *
 * When there are more options than fit (the eleven category filters on a
 * phone or in the tool sheet), the row scrolls sideways inside itself, and
 * the edge that has more options past it fades out, so it reads as "more this
 * way" rather than as the end of the list.
 */

import { useLayoutEffect, useRef, useState } from "react";

export interface SegmentOption<T extends string> {
  readonly id: T;
  readonly label: string;
  /** Optional colour chip before the label, the category's own fill. */
  readonly swatch?: string;
}

export function SegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  label,
  compact = false,
}: {
  readonly options: readonly SegmentOption<T>[];
  readonly value: T;
  readonly onChange: (next: T) => void;
  readonly label: string;
  readonly compact?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ readonly left: number; readonly width: number } | null>(null);
  const [slid, setSlid] = useState(false);

  /*
   * useLayoutEffect, not useEffect: it runs after React writes the DOM but
   * before the browser paints, so the thumb is measured and placed in the same
   * frame and never flashes at the wrong option. A ResizeObserver re-measures
   * when the font loads or the screen turns, which changes button widths.
   */
  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (row === null || track === null) return;
    const measure = () => {
      const button = row.querySelector<HTMLElement>(`[data-segment="${value}"]`);
      if (button !== null) setThumb({ left: button.offsetLeft, width: button.offsetWidth });
      updateFades(track);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(track);
    return () => observer.disconnect();
  }, [value]);

  const choose = (next: T, button: HTMLButtonElement) => {
    setSlid(true);
    onChange(next);
    // Keep the chosen option in view when the track scrolls sideways.
    button.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <div
      ref={trackRef}
      className={`pt-seg ${compact ? "pt-seg--compact" : ""}`}
      onScroll={(event) => updateFades(event.currentTarget)}
    >
      <div ref={rowRef} className="pt-seg-row" role="radiogroup" aria-label={label}>
        {thumb === null ? null : (
          <span
            className={`pt-seg-thumb ${slid ? "pt-seg-thumb--slide" : ""}`}
            style={{ left: thumb.left, width: thumb.width }}
            aria-hidden
          />
        )}
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            data-segment={option.id}
            className="pt-seg-option"
            onClick={(event) => choose(option.id, event.currentTarget)}
          >
            {option.swatch === undefined ? null : <span className="pt-seg-swatch" style={{ background: option.swatch }} aria-hidden />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mark which edges have more options past them; periodic.css fades those edges. */
function updateFades(track: HTMLElement) {
  const left = track.scrollLeft > 1;
  const right = track.scrollLeft + track.clientWidth < track.scrollWidth - 1;
  track.dataset.fade = left && right ? "both" : left ? "left" : right ? "right" : "none";
}
