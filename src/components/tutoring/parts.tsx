import type { ReactNode } from "react";
import type { RateStatus } from "@/lib/tutoring/api";

/**
 * Small pieces the tutoring pages share: the status line under an action and
 * the dashed "not here yet" card. The same classes office hours use
 * (OfficeHoursEditor.tsx), so the two read as one site.
 */

export type Message = { ok: boolean; text: string } | null;

export function StatusLine({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={
        message.ok
          ? "rounded-xl bg-[var(--bb-progress)] px-3 py-2 text-sm font-semibold text-[var(--bb-progress-ink)]"
          : "rounded-xl bg-[var(--bb-warn-wash)] px-3 py-2 text-sm font-semibold text-[var(--bb-warn-ink)]"
      }
    >
      {message.text}
    </p>
  );
}

export function DashedCard({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-xl rounded-2xl border-2 border-dashed border-[var(--site-border)] p-6 text-[var(--bb-deep)]">
      {children}
    </div>
  );
}

/** "Tuesday, November 10, 2:00 PM", in the reader's own zone. */
export const whenText = (d: Date) =>
  d.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The benchmarks still missing, in words, with the numbers the database used. */
export function unmetChecks(s: RateStatus): string[] {
  const r = s.rules;
  const out: string[] = [];
  if (!s.monthsOk) out.push(`${r.minMonths} months with Blueberry`);
  if (!s.ratingOk)
    out.push(`an average of ${r.minAvgRating} over at least ${r.minRatings} ratings (now ${s.avgRating ?? "none"} over ${s.ratingCount})`);
  if (!s.lessonsOk) out.push(`${r.minLessons} lessons (now ${s.lessons})`);
  if (!s.referralsOk) out.push(`${r.minReferrals} referrals (now ${s.referrals})`);
  return out;
}
