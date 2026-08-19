"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { CourseCalendar, type CourseDate } from "@/components/ui/event-manager";
import { Loader } from "@/components/ui/loader";
import { PageBackground } from "@/components/ui/page-background";
import { SyllabusImportTicket } from "@/components/ui/syllabus-import-ticket";
import { useSession } from "@/lib/useSession";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { deleteDate, loadDates, saveDates } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/**
 * The course calendar page, at #/calendar.
 *
 * The grid draws immediately and unconditionally.
 *
 * It used to wait — on a session, then on a fetch — and show a sign-in notice
 * in the meantime, which meant that opening Calendar while signed out, or
 * before the backend was deployed, showed no calendar at all. That was the
 * wrong shape: a month grid is a fact about the month and needs nothing from a
 * server to draw. Only the events on it do. So the page renders the calendar
 * first and treats dates as something that arrives, which also means a slow
 * network degrades to an empty calendar rather than to a blank page.
 */
export default function CalendarPage() {
  const session = useSession();
  const isStaff = session?.role === "admin" || session?.role === "owner";
  // Dates live in Supabase now, so staff can write with the session they
  // already have and the role is the whole question. Presentation only: the
  // policy on `course_dates` re-checks every write regardless.
  const canEdit = isStaff;

  /**
   * The token, not the session.
   *
   * `useSession` builds a fresh object every render, so a `useCallback` keyed
   * on `session` got a new identity each time, which re-fired the effect that
   * depended on it, which re-rendered — "Maximum update depth exceeded", on
   * loop, from the moment the page opened. A string dependency is stable.
   *
   * Still read for the syllabus import, which is the one thing on this page
   * that is genuinely still Apps Script.
   */
  const idToken = session?.idToken ?? null;

  const [dates, setDates] = useState<CourseDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Loads for everyone, signed in or not.
   *
   * It used to refuse without a Google ID token and leave the grid blank with a
   * paragraph about which backend it wanted. The dates are course information,
   * the same as the lessons: `course_dates` allows `anon` to select, so a
   * student who has never signed in sees the exam dates.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    const { dates: rows, error: err } = await loadDates();
    setDates(rows);
    setError(err ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSave = async (next: CourseDate) => {
    setBusy(true);
    const { dates: rows, error: err } = await saveDates([next], idToken);
    setBusy(false);
    if (err) setError(err);
    else {
      setDates(rows);
      setError(null);
    }
  };

  const onRemove = async (id: string) => {
    setBusy(true);
    const { dates: rows, error: err } = await deleteDate(id, idToken);
    setBusy(false);
    if (err) setError(err);
    else {
      setDates(rows);
      setError(null);
    }
  };

  return (
    // Same shell as Lessons and Reactions: background, back link, a compact
    // header bar, then the content.
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />

      {/* The page is exactly one screen tall, and the calendar takes what the
          header and the status line leave. `dvh` rather than `vh` because on a
          phone the address bar changes the viewport and `vh` does not follow it,
          which puts the last grid row under the browser chrome. */}
      <div className="mx-auto flex h-dvh max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="#/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Home
        </a>

        {/* One bar, not a title card.

            This was a `text-5xl` heading, a paragraph, the whole import
            interface inline, and a 160px berry in a bordered box: roughly 450px
            of furniture above a month grid that then could not be seen without
            scrolling. On a calendar the grid *is* the page, so the chrome around
            it earns its height or goes.

            What survived: the breadcrumb, the name, and the count, because the
            count is the one number worth reading before the grid. The berry
            moved to the corner dock, where it already lives on other pages. */}
        <header className="mt-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.7rem] font-semibold tracking-[.18em] text-indigo-600 uppercase dark:text-indigo-300">
              Calendar / CHEM241
            </p>
            <h1 className="title-face mt-1 text-3xl leading-none sm:text-4xl">Course calendar</h1>
          </div>

          <p className="shrink-0 text-sm text-slate-600 dark:text-stone-300">
            {dates.length > 0
              ? `${dates.length} ${dates.length === 1 ? "date" : "dates"}`
              : "Nothing scheduled yet"}
          </p>

          {canEdit && (
            <SyllabusImportTicket
              idToken={idToken}
              onSaved={(rows) => {
                setDates(rows);
                setError(null);
              }}
            />
          )}
        </header>

        {/* A status line, not a gate. Whatever it says, the calendar below is
            already on screen. */}
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
          <StaffSignInNotice session={session} action="Importing a syllabus" />
          <StatusLine session={!!session} loading={loading} busy={busy} error={error} />

          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:p-5 dark:border-stone-800 dark:bg-stone-950/70">
            <CourseCalendar
              dates={dates}
              canEdit={canEdit}
              onCreate={(d) => void onSave({ ...d, id: "" })}
              onUpdate={(id, d) => void onSave({ ...d, id })}
              onDelete={(id) => void onRemove(id)}
            />
          </div>
        </div>
      </div>

    </main>
  );
}

function StatusLine({
  session,
  loading,
  busy,
  error,
}: {
  session: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={line}>
        <span>
          <a href="#/signin" className="font-semibold text-foreground underline">
            Sign in
          </a>{" "}
          to see the course&rsquo;s dates on it.
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={line}>
        <Loader variant="text-shimmer" size="sm" text="Loading dates…" />
      </div>
    );
  }

  if (busy) {
    return (
      <div className={line}>
        <Loader variant="dots" size="sm" text="Saving" />
      </div>
    );
  }

  return null;
}

/* A `div`, not a `p`. The loaders are inline elements now, but this line also
   holds icons and links, and a paragraph is the wrong box for a status strip. */
const line = cn(
  "flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground",
);
