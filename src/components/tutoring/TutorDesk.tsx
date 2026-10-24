import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvailabilityGrid, slotKey } from "@/components/ui/availability-grid";
import { useSession } from "@/lib/useSession";
import {
  STYLE_LABEL,
  addReferral,
  addTimeOff,
  cancelTutorBooking,
  completeTutorSession,
  loadAvailability,
  loadLedger,
  loadMySessions,
  loadRateStatus,
  loadReferrals,
  myTutorRow,
  removeReferral,
  removeTimeOff,
  saveAvailability,
  updateMe,
  type LedgerRow,
  type RateStatus,
  type Referral,
  type TimeOff,
  type TutorRow,
  type TutorSession,
} from "@/lib/tutoring/api";
import { hoursFromRules, rulesFromHours, wallToInstant, type AvailabilityRule } from "@/lib/tutoring/slots";
import { dollars } from "@/lib/tutoring/rules";
import { TutorOnboarding } from "./TutorOnboarding";
import { DashedCard, StatusLine, unmetChecks, whenText, type Message } from "./parts";
import "../schedule.css";

/**
 * The tutor desk, at #/d/tutor: everything a paid tutor does on the site.
 *
 *   (a) the walk-through, until they press Done
 *   (b) weekly hours on the painting grid, plus time off
 *   (c) upcoming sessions with the student's questionnaire; past ones get
 *       Mark done or No-show, which is what writes the ledger
 *   (d) their own rate and what they are owed, read only
 *
 * Lazy (Dashboard.tsx), so none of it loads for anyone who never opens it. The
 * database decides everything; a student who types this address gets "not set
 * up as a tutor" from the page and nothing from the tables.
 */

/** Local storage key for "I have seen the walk-through", only until tutors.onboarded_at says so. */
const SEEN_KEY = "blueberry.tutor.onboarding.seen";

function seenLocally(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeenLocally() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode or blocked storage: the server flag is the real one anyway.
  }
}

/** This week's Monday to Sunday, the template the weekly grid paints on. */
function templateWeek(): Date[] {
  const d = new Date();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymdOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function TutorDesk() {
  const session = useSession();
  const signedIn = session?.provider === "supabase";

  const [me, setMe] = useState<TutorRow | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notReady" | "notTutor">("loading");
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [status, setStatus] = useState<RateStatus | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  /** Unsaved painting, or null for "show what is saved". Derived during render, as in OfficeHoursEditor. */
  const [draft, setDraft] = useState<string[] | null>(null);

  const days = useMemo(templateWeek, []);

  const load = useCallback(async () => {
    const row = await myTutorRow();
    if (!row.ok) return row.notReady ? { kind: "notReady" as const } : { kind: "error" as const, error: row.error };
    if (!row.data) return { kind: "notTutor" as const };
    const [avail, sess, rate, led] = await Promise.all([
      loadAvailability(row.data.id),
      loadMySessions(),
      loadRateStatus(row.data.id),
      loadLedger(row.data.id),
    ]);
    return { kind: "ok" as const, row: row.data, avail, sess, rate, led };
  }, []);

  const apply = useCallback((res: Awaited<ReturnType<typeof load>>) => {
    if (res.kind === "notReady") return setState("notReady");
    if (res.kind === "notTutor") return setState("notTutor");
    if (res.kind === "error") {
      setState("ready");
      return setMessage({ ok: false, text: res.error });
    }
    setMe(res.row);
    setState("ready");
    setShowGuide(!res.row.onboardedAt && !seenLocally());
    if (res.avail.ok) {
      setRules(res.avail.data.rules);
      setTimeOff(res.avail.data.timeOff);
    }
    if (res.sess.ok) setSessions(res.sess.data);
    if (res.rate.ok) setStatus(res.rate.data);
    if (res.led.ok) setLedger(res.led.data);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void load().then((res) => live && apply(res));
    return () => {
      live = false;
    };
  }, [signedIn, load, apply]);

  const refresh = async () => apply(await load());

  if (!session) {
    return (
      <DashedCard>
        <a href="#/signin" className="font-bold text-[var(--bb-blue-ink)] underline">
          Sign in
        </a>{" "}
        to open your tutor desk.
      </DashedCard>
    );
  }
  if (!signedIn) return <DashedCard>The tutor desk uses your Blueberry account. Sign in with it to open it.</DashedCard>;
  if (state === "loading") return <p className="text-sm text-[var(--site-quiet)]">Opening your desk.</p>;
  if (state === "notReady") return <DashedCard>Paid tutoring opens soon. Free office hours are posted from Office hours.</DashedCard>;
  if (state === "notTutor" || !me) return <DashedCard>You are not set up as a tutor yet; ask the owner.</DashedCard>;

  // What the grid shows: the unsaved painting, else the saved rules on the template week.
  const savedKeys = hoursFromRules(rules).flatMap(({ weekday, minute }) =>
    days.filter((d) => d.getDay() === weekday).map((d) => slotKey(d, minute)),
  );
  const painted = draft ?? savedKeys;

  const saveHours = async () => {
    setBusy(true);
    const byYmd = new Map(days.map((d) => [ymdOf(d), d.getDay()]));
    const cells = painted.flatMap((key) => {
      const [ymd, time] = key.split("T");
      const weekday = byYmd.get(ymd);
      const [h, m] = time.split(":").map(Number);
      return weekday === undefined ? [] : [{ weekday, minute: h * 60 + m }];
    });
    const next = rulesFromHours(cells);
    const res = await saveAvailability(next);
    setBusy(false);
    if (res.ok) {
      setRules(next);
      setDraft(null);
    }
    setMessage(res.ok ? { ok: true, text: "Saved. Students can book these hours from Book a tutor." } : { ok: false, text: res.error });
  };

  const finishGuide = async () => {
    markSeenLocally();
    setShowGuide(false);
    const res = await updateMe({ onboarded: true });
    if (res.ok) setMe({ ...me, onboardedAt: new Date() });
  };

  const close = async (id: string, outcome: "completed" | "no_show") => {
    setBusy(true);
    const res = await completeTutorSession(id, outcome);
    await refresh();
    setBusy(false);
    setMessage(
      res.ok
        ? { ok: true, text: outcome === "completed" ? "Marked done. It is on your ledger." : "Marked as a no-show." }
        : { ok: false, text: res.error },
    );
  };

  const cancel = async (id: string) => {
    setBusy(true);
    const res = await cancelTutorBooking(id);
    await refresh();
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: "Session cancelled." } : { ok: false, text: res.error });
  };

  const now = Date.now();
  const live = sessions.filter((s) => s.status === "booked");
  const upcoming = live.filter((s) => s.end.getTime() > now);
  const toClose = live.filter((s) => s.end.getTime() <= now);
  const unpaid = ledger.filter((l) => !l.paidAt);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {showGuide ? (
        <TutorOnboarding onDone={() => void finishGuide()} />
      ) : (
        <button type="button" className="sch-quiet self-start" onClick={() => setShowGuide(true)}>
          Show the walk-through again
        </button>
      )}

      <StatusLine message={message} />

      <section aria-labelledby="tutor-upcoming">
        <h3 id="tutor-upcoming" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
          Upcoming sessions
        </h3>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--site-quiet)]">Nobody has booked you yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcoming.map((s) => (
              <SessionCard key={s.id} s={s} now={now}>
                {s.start.getTime() > now && (
                  <button type="button" className="sch-ghost" data-danger disabled={busy} onClick={() => void cancel(s.id)}>
                    Cancel
                  </button>
                )}
              </SessionCard>
            ))}
          </ul>
        )}
      </section>

      {toClose.length > 0 && (
        <section aria-labelledby="tutor-to-close">
          <h3 id="tutor-to-close" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
            How did these go?
          </h3>
          <p className="text-sm text-[var(--site-quiet)]">Mark done records the hour for pay. A no-show records nothing.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {toClose.map((s) => (
              <SessionCard key={s.id} s={s} now={now}>
                <div className="flex gap-2">
                  <button type="button" className="sch-btn" disabled={busy} onClick={() => void close(s.id, "completed")}>
                    Mark done
                  </button>
                  <button type="button" className="sch-ghost" disabled={busy} onClick={() => void close(s.id, "no_show")}>
                    No-show
                  </button>
                </div>
              </SessionCard>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="tutor-hours" className="flex flex-col gap-3 border-t-2 border-[var(--site-border)]/40 pt-4">
        <h3 id="tutor-hours" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
          Your weekly hours
        </h3>
        <p className="text-sm text-[var(--site-quiet)]">
          Paint the hours you can teach. The same pattern repeats every week, in {me.timezone.replace(/_/g, " ")} time.
        </p>
        <AvailabilityGrid days={days} startHour={8} endHour={22} slotMinutes={60} value={painted} onChange={setDraft} />
        <div>
          <button type="button" className="sch-btn" disabled={busy || draft === null} onClick={() => void saveHours()}>
            {busy ? "Saving" : "Save my hours"}
          </button>
        </div>
      </section>

      <TimeOffEditor timeZone={me.timezone} items={timeOff} onChanged={refresh} onMessage={setMessage} />

      <ReferralList tutorId={me.id} onMessage={setMessage} />

      <section aria-labelledby="tutor-pay" className="border-t-2 border-[var(--site-border)]/40 pt-4">
        <h3 id="tutor-pay" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
          Your rate and pay
        </h3>
        {status && (
          <div className="mt-2 text-sm text-[var(--bb-deep)]">
            <p>
              <strong>{dollars(status.rateCents)} an hour</strong> right now.{" "}
              {status.qualified
                ? "You have every benchmark for the raised rate."
                : `For ${dollars(status.rules.raisedRateCents)}: ${unmetChecks(status).join(", ")}.`}
            </p>
            <p className="mt-1">
              Owed: <strong>{dollars(status.unpaidCents)}</strong> for {status.unpaidCount} session
              {status.unpaidCount === 1 ? "" : "s"}. The owner pays by hand and marks them paid here.
            </p>
          </div>
        )}
        {ledger.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {ledger.slice(0, 20).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-card px-3 py-2">
                <span>{whenText(l.sessionEndsAt)}</span>
                <span>
                  {(l.minutes / 60).toFixed(l.minutes % 60 ? 2 : 0)} h at {dollars(l.rateCents)} = {dollars(l.amountCents)},{" "}
                  {l.paidAt ? `paid ${l.paidAt.toLocaleDateString()}` : "not paid yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {unpaid.length === 0 && ledger.length === 0 && (
          <p className="mt-2 text-sm text-[var(--site-quiet)]">Sessions you mark done appear here.</p>
        )}
      </section>
    </div>
  );
}

function SessionCard({ s, now, children }: { s: TutorSession; now: number; children?: React.ReactNode }) {
  const daysToExam = s.examDate
    ? Math.ceil((new Date(`${s.examDate}T23:59:59`).getTime() - now) / 86_400_000)
    : null;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3">
      <div className="min-w-0 text-sm">
        <p className="font-bold text-[var(--bb-deep)]">{whenText(s.start)}</p>
        <p className="text-[var(--site-quiet)]">{s.studentName || s.studentEmail}</p>
        {s.course && (
          <dl className="mt-2 grid gap-1 text-[var(--bb-deep)]">
            <div>
              <dt className="inline font-semibold">Course: </dt>
              <dd className="inline">{s.course}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Stuck on: </dt>
              <dd className="inline">{s.stuckOn}</dd>
            </div>
            {s.examDate && daysToExam !== null && (
              <div>
                <dt className="inline font-semibold">Exam: </dt>
                <dd className="inline">
                  {new Date(`${s.examDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                  {daysToExam >= 0 ? `, in ${daysToExam} day${daysToExam === 1 ? "" : "s"}` : ", already past"}
                </dd>
              </div>
            )}
            {s.style && (
              <div>
                <dt className="inline font-semibold">Style: </dt>
                <dd className="inline">{STYLE_LABEL[s.style]}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
      {children}
    </li>
  );
}

function TimeOffEditor({
  timeZone,
  items,
  onChanged,
  onMessage,
}: {
  timeZone: string;
  items: TimeOff[];
  onChanged: () => Promise<void>;
  onMessage: (m: Message) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!from || !to) return;
    // Whole days, from the start of the first to the end of the last, on the tutor's own clock.
    const start = wallToInstant(from, 0, timeZone);
    const end = wallToInstant(to, 24 * 60, timeZone);
    if (end <= start) return onMessage({ ok: false, text: "The last day is before the first." });
    setBusy(true);
    const res = await addTimeOff(start, end, reason);
    await onChanged();
    setBusy(false);
    if (res.ok) {
      setFrom("");
      setTo("");
      setReason("");
    }
    onMessage(res.ok ? { ok: true, text: "Time off added. Those hours are hidden from students." } : { ok: false, text: res.error });
  };

  const remove = async (id: string) => {
    setBusy(true);
    const res = await removeTimeOff(id);
    await onChanged();
    setBusy(false);
    onMessage(res.ok ? { ok: true, text: "Time off removed." } : { ok: false, text: res.error });
  };

  return (
    <section aria-labelledby="tutor-time-off" className="flex flex-col gap-3 border-t-2 border-[var(--site-border)]/40 pt-4">
      <h3 id="tutor-time-off" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
        Time off
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="off-from">First day</Label>
          <Input id="off-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="off-to">Last day</Label>
          <Input id="off-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5" />
        </div>
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="off-why">Note (only you and the owner see it)</Label>
          <Input id="off-why" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className="mt-1.5" />
        </div>
        <button type="button" className="sch-ghost" disabled={busy || !from || !to} onClick={() => void add()}>
          Add time off
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--site-quiet)]">No time off.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm">
              <span>
                {t.start.toLocaleDateString()} to {new Date(t.end.getTime() - 1).toLocaleDateString()}
                {t.reason && `, ${t.reason}`}
              </span>
              <button type="button" className="sch-quiet" data-danger disabled={busy} onClick={() => void remove(t.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Students the tutor brought to Blueberry. One of the four benchmarks for the
 * raised rate; an address counts once that student has completed a session.
 */
function ReferralList({ tutorId, onMessage }: { tutorId: string; onMessage: (m: Message) => void }) {
  const [items, setItems] = useState<Referral[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchItems = useCallback(() => loadReferrals(tutorId), [tutorId]);

  useEffect(() => {
    let live = true;
    void fetchItems().then((res) => live && res.ok && setItems(res.data));
    return () => {
      live = false;
    };
  }, [fetchItems]);

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setBusy(true);
    const res = await action();
    const fresh = await fetchItems();
    if (fresh.ok) setItems(fresh.data);
    setBusy(false);
    onMessage(res.ok ? { ok: true, text: done } : { ok: false, text: res.error ?? "That did not work." });
    return res.ok;
  };

  return (
    <section aria-labelledby="tutor-referrals" className="flex flex-col gap-3 border-t-2 border-[var(--site-border)]/40 pt-4">
      <h3 id="tutor-referrals" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
        Students you referred
      </h3>
      <p className="text-sm text-[var(--site-quiet)]">
        Add the address a student signs in with. Add them before they book: it counts toward your raise once they finish a session with any tutor, and a student who had already booked tutoring does not count.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => addReferral(email), "Referral added.")) setEmail("");
        }}
      >
        <div className="min-w-[14rem] flex-1">
          <Label htmlFor="ref-email">Their email</Label>
          <Input id="ref-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
        </div>
        <button type="submit" className="sch-ghost" disabled={busy || !email}>
          Add
        </button>
      </form>
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2 text-sm">
              <span>{r.email}</span>
              <button type="button" className="sch-quiet" data-danger disabled={busy} onClick={() => void run(() => removeReferral(r.id), "Referral removed.")}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
