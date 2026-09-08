import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { FOUNDING_SEATS } from "@/data/site";

/**
 * The social proof on the front page, and the only kind available before
 * launch that is not a lie.
 *
 * There are no reviews. There are no users. A carousel of invented students
 * saying the site changed their grade is the single fastest way to lose
 * somebody who then finds out, and it would be sitting six inches from a button
 * that asks for money. So what goes here instead is a number that is true: how
 * many people have actually taken a founding seat.
 *
 * **It renders nothing until the number is real.** No table, no Supabase, a
 * failed query, or a count of zero, and the component returns `null` and the
 * hero closes up around the gap. That is deliberate and it is the whole design:
 * an empty space says nothing, while "0 of 100 seats taken" says nobody wanted
 * it. Never start a user at 0 applies to the seller as well.
 *
 * The bar is the loss-aversion half of the same fact. "37 taken" is a
 * statistic; "63 left" is a deadline, and they are the same sentence.
 *
 * The table this reads is not created yet. It wants:
 *
 * ```sql
 * create table public.founding_members (
 *   id uuid primary key default gen_random_uuid(),
 *   email text not null unique,
 *   created_at timestamptz not null default now()
 * );
 * alter table public.founding_members enable row level security;
 * -- Anyone may count. Nobody may read an address.
 * create policy "count is public" on public.founding_members for select
 *   using (false);
 * ```
 *
 * `head: true` with `count: "exact"` returns the count and no rows, so a policy
 * that grants no rows still yields a number. That is the point: the tally is
 * public, the list is not.
 */
export function FoundingSeats({ className }: { className?: string }) {
  const [taken, setTaken] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    void supabase
      .from("founding_members")
      .select("*", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (!live || error || typeof count !== "number") return;
        setTaken(count);
      });

    return () => {
      live = false;
    };
  }, []);

  // See the note above: silence beats a zero.
  if (taken === null || taken <= 0) return null;

  const left = Math.max(0, FOUNDING_SEATS - taken);
  const filled = Math.min(100, Math.round((taken / FOUNDING_SEATS) * 100));

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <p className="text-xs font-medium text-slate-700 dark:text-stone-300">
        <span className="font-semibold text-slate-900 dark:text-white">{taken}</span> of the first{" "}
        {FOUNDING_SEATS} founding seats taken
        {left > 0 && (
          <span className="text-slate-500 dark:text-stone-400">
            {" · "}
            {left} left
          </span>
        )}
      </p>

      <div
        className="h-1 w-44 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/15"
        role="progressbar"
        aria-valuenow={taken}
        aria-valuemin={0}
        aria-valuemax={FOUNDING_SEATS}
        aria-label="Founding seats taken"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-from to-brand-to"
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  );
}

export default FoundingSeats;
