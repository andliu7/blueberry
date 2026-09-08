/**
 * Turning a scheduler interval into the words on a rating button.
 *
 * scheduler.ts returns a number of DAYS, including fractions for the learning
 * steps: the Again step is ten minutes, which is 0.00694 days. Printing that
 * number is useless, so this file is the one place that decides how an
 * interval reads. It computes nothing about the schedule; it only renders a
 * number the scheduler already produced, which is why it lives beside the
 * surface rather than beside the policy.
 *
 * WHY THE BUTTONS CARRY THEIR INTERVALS AT ALL. This is the single most
 * useful thing Anki's review screen does and it costs one line of text: a
 * student pressing Good can see that the card goes away for eight days, so the
 * four buttons stop being a mood rating and start being a choice with a
 * consequence. It is also honesty about a system that is otherwise invisible.
 *
 * Rounding is deliberately coarse and never rounds DOWN to zero: an interval
 * under a minute still says "in a minute", because "in 0 minutes" reads as a
 * bug and the exact figure does not change anybody's press.
 */

const MINUTES_PER_DAY = 24 * 60;

/**
 * TWO FORMS OF THE SAME NUMBER, added in round 3 for the grade chips.
 *
 * `"long"` is the spoken and written form and is still the default: "10 min",
 * "8 days", "3 weeks". It is what an aria-label reads out and what any
 * sentence uses, because "comes back in 3w" is not a sentence.
 *
 * `"short"` is the committed button sheet's own form, which draws the four
 * grades carrying 10m, 1d, 3d and 7d INSIDE their pills. Four chips across a
 * 390px phone are about 88px wide each, so "5 months" does not fit at the
 * size the sheet sets it, and shrinking the type to make it fit would undo
 * the hierarchy the short form exists to serve. Same number, same rounding,
 * same never-zero rule; only the unit is abbreviated.
 *
 * Both forms come from ONE computation, deliberately. Two functions would be
 * two places for the rounding to drift, and the visible chip and the label a
 * screen reader hears would eventually disagree about the same card.
 */
export type IntervalForm = "long" | "short";

/** "10 min", "1 day", "8 days", "3 weeks", "5 months"; or 10m, 1d, 8d, 3w, 5mo. */
export function intervalLabel(days: number, form: IntervalForm = "long"): string {
  const short = form === "short";
  if (!Number.isFinite(days) || days <= 0) return "now";

  if (days < 1) {
    const minutes = Math.max(1, Math.round(days * MINUTES_PER_DAY));
    if (minutes < 60) return short ? `${minutes}m` : `${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (short) return `${hours}h`;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const whole = Math.round(days);
  if (whole < 7) {
    if (short) return `${whole}d`;
    return whole === 1 ? "1 day" : `${whole} days`;
  }
  if (whole < 31) {
    const weeks = Math.round(whole / 7);
    if (short) return `${weeks}w`;
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (whole < 365) {
    const months = Math.round(whole / 30);
    if (short) return `${months}mo`;
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.round((whole / 365) * 10) / 10;
  if (short) return `${years}y`;
  return years === 1 ? "1 year" : `${years} years`;
}
