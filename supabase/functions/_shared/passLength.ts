/**
 * How long a semester pass lasts: 6 months from the moment it is bought.
 *
 * Owner, 1 Nov 2026. It replaces one end date set by hand each semester. This
 * file has no imports and no Deno globals, so the site's vitest suite can import
 * it and pin the rule.
 */

export const PASS_MONTHS = 6;

/**
 * The same day 6 months on, in UTC. A day the end month does not have lands on
 * that month's last day, so 31 Aug runs to 28 Feb and not into March.
 */
export function passEndsAfter(bought: Date): Date {
  const end = new Date(bought);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + PASS_MONTHS);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(bought.getUTCDate(), lastDay));
  return end;
}
