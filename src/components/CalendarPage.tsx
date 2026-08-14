"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { CourseCalendar, type CourseDate } from "@/components/ui/event-manager";
import { Blueberry } from "@/components/ui/blueberry";
import { Loader } from "@/components/ui/loader";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { SyllabusImportTicket } from "@/components/ui/syllabus-import-ticket";
import { useSession } from "@/lib/useSession";
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
  const canEdit = session?.role === "admin" || session?.role === "owner";

  /**
   * The token, not the session.
   *
   * `useSession` builds a fresh object every render, so a `useCallback` keyed
   * on `session` got a new identity each time, which re-fired the effect that
   * depended on it, which re-rendered — "Maximum update depth exceeded", on
   * loop, from the moment the page opened. A string dependency is stable.
   */
  const idToken = session?.idToken ?? null;

  const [dates, setDates] = useState<CourseDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!idToken) return;
    setLoading(true);
    const { dates: rows, error: err } = await loadDates(idToken);
    setDates(rows);
    setError(err ?? null);
    setLoading(false);
  }, [idToken]);

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
    // Same shell as Lessons and Reactions: background, back link, header card
    // with the berry, then the content. This page used to be a bare centred
    // column on the site's default background, which made it look like it
    // belonged to a different product.
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="#/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Home
        </a>

        <header className="mt-5 grid gap-5 rounded-3xl border border-indigo-200/80 bg-white/75 p-6 shadow-sm dark:border-indigo-400/20 dark:bg-stone-950/70 lg:grid-cols-[1fr_270px]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">
              Calendar / CHEM241
            </p>
            <h1 className="title-face mt-3 text-5xl leading-none">Course calendar</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-stone-300">
              Exams, deadlines and labs for the term.
              {canEdit && " Upload a syllabus and it fills itself in."}
            </p>
            {canEdit && (
              <div className="mt-5">
                <SyllabusImportTicket
                  idToken={idToken}
                  onSaved={(rows) => {
                    setDates(rows);
                    setError(null);
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/70 p-4 dark:border-indigo-400/30 dark:bg-indigo-950/25">
            <Blueberry
              mood="reading"
              interactive
              onActivate={() => {
                window.location.hash = "#/home";
              }}
              className="h-40 w-40"
              label="Blueberry, keeping track. Press to go home, drag to spin."
            />
            <p className="mt-2 text-center text-sm text-indigo-900/75 dark:text-indigo-100/75">
              {dates.length > 0
                ? `${dates.length} dates on the calendar.`
                : "Nothing on the calendar yet."}
            </p>
          </div>
        </header>

        {/* A status line, not a gate. Whatever it says, the calendar below is
            already on screen. */}
        <div className="mt-5 flex flex-col gap-5">
          <StatusLine session={!!session} loading={loading} busy={busy} error={error} />

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70 sm:p-6">
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

      <SiteFooter />
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
