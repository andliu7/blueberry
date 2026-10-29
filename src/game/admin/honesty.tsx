/**
 * One honesty vocabulary for every admin board.
 *
 * The rule (owner, 29 Oct): an admin number is either real, and its footnote names
 * where it came from, or it is not shown as a number at all. A part with no data
 * source is a tile marked "No data, example" with an example graph drawn from
 * invented shape only. Nothing guessed ever wears the look of a real figure.
 *
 * The bar is the Stripe Dashboard home: a figure, its source, and a calm empty
 * state when there is nothing to read yet.
 */
import type { ReactNode } from "react";

export const EXAMPLE_LABEL = "No data, example";

/** The small dashed pill that marks a tile as an example. */
export function ExampleBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`ah-tag is-example ${className}`.trim()} data-testid="example-badge">
      {EXAMPLE_LABEL}
    </span>
  );
}

/** The small green pill that marks a tile as read from the database. */
export function LiveBadge({ className = "" }: { className?: string }) {
  return <span className={`ah-tag is-live ${className}`.trim()}>Live</span>;
}

/**
 * The footnote under a tile. Live: "Source: ...". Example: why there is no data,
 * and what will feed it. Always rendered, so a reader never has to guess.
 */
export function SourceNote({ live, source, why }: { live: boolean; source: string; why?: string }) {
  return (
    <p className={`ah-source${live ? "" : " is-example"}`} data-testid={live ? "source-note" : "example-note"}>
      {live ? (
        <>Source: {source}.</>
      ) : (
        <>
          {why ? `${why} ` : ""}Feeds from {source} once connected.
        </>
      )}
    </p>
  );
}

/** Wrap content that is example-only so assistive tech and the eye both read it as such. */
export function ExampleWash({ children }: { children: ReactNode }) {
  return (
    <div className="ah-wash" role="group" aria-label={`${EXAMPLE_LABEL}, not real figures`}>
      {children}
    </div>
  );
}

/** Where each admin part comes from, in plain words. One place, so footnotes cannot drift. */
export const SOURCES = {
  signups: "profiles table, created_at, counted per day",
  active: "progress_events table, learners with any lesson event in the period",
  paying: "entitlements table, learners with an active Pro entitlement (needs staff read migration)",
  today: "progress_events (activity in the last 15 minutes) and profiles (sign-ups today)",
  feed: "profiles and progress_events, newest first, no names",
  money: "Stripe, which the app cannot read yet",
  status: "an uptime monitor, which is not connected yet",
  visits: "analytics_events table, distinct anon_id on screen_view",
} as const;
