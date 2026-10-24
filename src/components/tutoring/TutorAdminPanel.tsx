import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/useSession";
import {
  inviteTutor,
  listTutors,
  loadLedger,
  loadPayRules,
  markPaid,
  savePayRules,
  setTutorActive,
  type LedgerRow,
  type TutorWithStatus,
} from "@/lib/tutoring/api";
import { DEFAULT_PAY_RULES, dollars, type PayRules } from "@/lib/tutoring/rules";
import { DashedCard, StatusLine, unmetChecks, whenText, type Message } from "./parts";
import "../schedule.css";

/**
 * Tutors, at #/d/tutors: the owner's and TAs' side of paid tutoring (T1, T2).
 *
 *   - Bring a tutor in: an email, a name and when they started. The row links
 *     itself to their account when they sign in with that address.
 *   - Every tutor's standing: linked yet, months, ratings, lessons, referrals,
 *     $25 or $30 with the missing benchmarks named, and what is owed.
 *   - The unpaid ledger per tutor, with Mark paid. No money moves through the
 *     site (owner, 23 Oct): you pay by hand, then record it here.
 *   - The pay benchmarks, editable.
 *
 * The staff notice below is courtesy; RLS is the lock. A student who types the
 * address reads nothing and can write nothing.
 */

export default function TutorAdminPanel() {
  const session = useSession();
  const isStaff = (session?.role === "admin" || session?.role === "owner") && session.provider === "supabase";

  const [tutors, setTutors] = useState<TutorWithStatus[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "notReady">("loading");
  const [message, setMessage] = useState<Message>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => listTutors(), []);

  useEffect(() => {
    if (!isStaff) return;
    let live = true;
    void load().then((res) => {
      if (!live) return;
      if (!res.ok && res.notReady) return setState("notReady");
      setState("ready");
      if (res.ok) setTutors(res.data);
      else setMessage({ ok: false, text: res.error });
    });
    return () => {
      live = false;
    };
  }, [isStaff, load]);

  const refresh = async () => {
    const res = await load();
    if (res.ok) setTutors(res.data);
  };

  if (!isStaff) {
    return <DashedCard>Managing tutors is for course staff. Sign in with the address on the course roster.</DashedCard>;
  }
  if (state === "loading") return <p className="text-sm text-[var(--site-quiet)]">Loading tutors.</p>;
  if (state === "notReady") {
    return (
      <DashedCard>
        Paid tutoring is built but not switched on: apply the migration
        <code className="mx-1">supabase/migrations/20261024120000_tutoring.sql</code>
        and this page fills in.
      </DashedCard>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <StatusLine message={message} />
      <InviteForm onDone={refresh} onMessage={setMessage} />

      <section aria-labelledby="tutor-list">
        <h3 id="tutor-list" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
          Tutors
        </h3>
        {tutors.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--site-quiet)]">No tutors yet. Bring one in above.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {tutors.map(({ tutor, status }) => {
              const months = Math.floor((Date.now() - tutor.startedAt.getTime()) / (30.44 * 86_400_000));
              return (
                <li key={tutor.id} className="rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3 text-sm text-[var(--bb-deep)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {tutor.displayName}
                        {!tutor.active && <span className="ml-2 font-semibold text-[var(--site-quiet)]">(inactive)</span>}
                      </p>
                      <p className="text-[var(--site-quiet)]">
                        {tutor.email}, {tutor.userId ? "signed in" : "has not signed in yet"}
                      </p>
                      {status && (
                        <p className="mt-1">
                          {months} month{months === 1 ? "" : "s"}, rating {status.avgRating ?? "none"} over {status.ratingCount}, {status.lessons} lessons,{" "}
                          {status.referrals} referrals
                        </p>
                      )}
                    </div>
                    {status && (
                      <div className="text-right">
                        <span
                          className={
                            status.qualified
                              ? "inline-block rounded-full bg-[var(--bb-progress)] px-3 py-1 font-extrabold text-[var(--bb-progress-ink)]"
                              : "inline-block rounded-full bg-[var(--bb-wash)] px-3 py-1 font-extrabold"
                          }
                        >
                          {dollars(status.rateCents)}/h
                        </span>
                        <p className="mt-1 font-semibold">Owed {dollars(status.unpaidCents)}</p>
                      </div>
                    )}
                  </div>
                  {status && !status.qualified && (
                    <p className="mt-1 text-[var(--site-quiet)]">Missing for {dollars(status.rules.raisedRateCents)}: {unmetChecks(status).join("; ")}.</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="sch-quiet"
                      aria-expanded={open === tutor.id}
                      onClick={() => setOpen(open === tutor.id ? null : tutor.id)}
                    >
                      {open === tutor.id ? "Hide unpaid sessions" : `Unpaid sessions (${status?.unpaidCount ?? 0})`}
                    </button>
                    <button
                      type="button"
                      className="sch-quiet"
                      data-danger={tutor.active ? "" : undefined}
                      onClick={async () => {
                        const res = await setTutorActive(tutor.id, !tutor.active);
                        await refresh();
                        setMessage(res.ok ? { ok: true, text: tutor.active ? "Deactivated. Their hours are hidden." : "Active again." } : { ok: false, text: res.error });
                      }}
                    >
                      {tutor.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                  {open === tutor.id && <UnpaidLedger tutorId={tutor.id} onPaid={refresh} onMessage={setMessage} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PayRulesEditor onMessage={setMessage} onSaved={refresh} />
    </div>
  );
}

function InviteForm({ onDone, onMessage }: { onDone: () => Promise<void>; onMessage: (m: Message) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [started, setStarted] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState<{ email: string; name: string } | null>(null);

  const link = `${window.location.origin}${window.location.pathname}#/d/tutor`;
  const letter = invited
    ? `Hi ${invited.name.split(" ")[0]},\n\nYou are set up as a Blueberry tutor. Sign in at ${link} with ${invited.email}; a short walk-through shows you how to set your hours and read what students send before a session.\n\nPay is $25 an hour to start, recorded per session on your desk.`
    : "";

  const submit = async () => {
    setBusy(true);
    const res = await inviteTutor(email, name, new Date(`${started}T12:00:00`));
    setBusy(false);
    if (res.ok) {
      setInvited({ email: email.trim().toLowerCase(), name: name.trim() });
      setEmail("");
      setName("");
      await onDone();
    }
    onMessage(res.ok ? { ok: true, text: "Added. Send them the message below." } : { ok: false, text: res.error });
  };

  return (
    <section aria-labelledby="invite-tutor" className="flex flex-col gap-3">
      <h3 id="invite-tutor" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
        Bring a tutor in
      </h3>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="min-w-[14rem] flex-1">
          <Label htmlFor="inv-email">Their email</Label>
          <Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
        </div>
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor="inv-name">Name</Label>
          <Input id="inv-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="inv-start">Started with Blueberry</Label>
          <Input id="inv-start" type="date" required value={started} onChange={(e) => setStarted(e.target.value)} className="mt-1.5" />
        </div>
        <button type="submit" className="sch-btn" disabled={busy || !email || !name}>
          {busy ? "Adding" : "Add tutor"}
        </button>
      </form>
      {invited && (
        <div className="rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3 text-sm">
          <Label htmlFor="inv-letter">Invite message</Label>
          <textarea id="inv-letter" readOnly value={letter} rows={6} className="mt-1.5 w-full rounded-xl border-2 border-[var(--site-border)] bg-transparent p-2" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="sch-ghost" onClick={() => void navigator.clipboard?.writeText(letter)}>
              Copy
            </button>
            <a
              className="sch-ghost"
              href={`mailto:${invited.email}?subject=${encodeURIComponent("You are a Blueberry tutor")}&body=${encodeURIComponent(letter)}`}
            >
              Open in email
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function UnpaidLedger({ tutorId, onPaid, onMessage }: { tutorId: string; onPaid: () => Promise<void>; onMessage: (m: Message) => void }) {
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchRows = useCallback(() => loadLedger(tutorId), [tutorId]);

  useEffect(() => {
    let live = true;
    void fetchRows().then((res) => {
      if (!live) return;
      const unpaid = res.ok ? res.data.filter((r) => !r.paidAt) : [];
      setRows(unpaid);
      setPicked(new Set(unpaid.map((r) => r.id)));
    });
    return () => {
      live = false;
    };
  }, [fetchRows]);

  if (rows === null) return <p className="mt-2 text-[var(--site-quiet)]">Loading sessions.</p>;
  if (rows.length === 0) return <p className="mt-2 text-[var(--site-quiet)]">Nothing unpaid.</p>;

  const total = rows.filter((r) => picked.has(r.id)).reduce((a, r) => a + r.amountCents, 0);
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const pay = async () => {
    setBusy(true);
    const res = await markPaid([...picked], note);
    const fresh = await fetchRows();
    if (fresh.ok) {
      const unpaid = fresh.data.filter((r) => !r.paidAt);
      setRows(unpaid);
      setPicked(new Set());
    }
    await onPaid();
    setBusy(false);
    onMessage(res.ok ? { ok: true, text: `Marked ${dollars(total)} paid.` } : { ok: false, text: res.error });
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 hover:bg-[var(--bb-wash)]">
              <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
              <span className="flex-1">{whenText(r.sessionEndsAt)}</span>
              <span>
                {(r.minutes / 60).toFixed(r.minutes % 60 ? 2 : 0)} h at {dollars(r.rateCents)} = <strong>{dollars(r.amountCents)}</strong>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor={`paid-note-${tutorId}`}>Note (optional)</Label>
          <Input id={`paid-note-${tutorId}`} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Venmo, 24 Oct" className="mt-1.5" />
        </div>
        <button type="button" className="sch-btn" disabled={busy || picked.size === 0} onClick={() => void pay()}>
          Mark {dollars(total)} paid
        </button>
      </div>
    </div>
  );
}

const RULE_FIELDS: { key: keyof PayRules; label: string; step: string; cents?: boolean }[] = [
  { key: "baseRateCents", label: "Starting rate ($/hour)", step: "0.5", cents: true },
  { key: "raisedRateCents", label: "Raised rate ($/hour)", step: "0.5", cents: true },
  { key: "minMonths", label: "Months with Blueberry", step: "1" },
  { key: "minAvgRating", label: "Average rating at least", step: "0.1" },
  { key: "minRatings", label: "Ratings at least", step: "1" },
  { key: "minLessons", label: "Lessons at least", step: "1" },
  { key: "minReferrals", label: "Referrals at least", step: "1" },
];

function PayRulesEditor({ onMessage, onSaved }: { onMessage: (m: Message) => void; onSaved: () => Promise<void> }) {
  const [rules, setRules] = useState<PayRules>(DEFAULT_PAY_RULES);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void loadPayRules().then((res) => live && res.ok && setRules(res.data));
    return () => {
      live = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    const res = await savePayRules(rules);
    await onSaved();
    setBusy(false);
    onMessage(res.ok ? { ok: true, text: "Benchmarks saved. New sessions are priced with them." } : { ok: false, text: res.error });
  };

  return (
    <section aria-labelledby="pay-rules" className="flex flex-col gap-3 border-t-2 border-[var(--site-border)]/40 pt-4">
      <h3 id="pay-rules" className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
        Pay benchmarks
      </h3>
      <p className="text-sm text-[var(--site-quiet)]">
        A tutor earns the raised rate once every line holds. Sessions already on the ledger keep the rate they were paid at.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RULE_FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={`rule-${f.key}`}>{f.label}</Label>
            <Input
              id={`rule-${f.key}`}
              type="number"
              min="0"
              step={f.step}
              value={f.cents ? rules[f.key] / 100 : rules[f.key]}
              onChange={(e) => {
                const n = Number(e.target.value);
                setRules({ ...rules, [f.key]: f.cents ? Math.round(n * 100) : n });
              }}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
      <div>
        <button type="button" className="sch-ghost" disabled={busy} onClick={() => void save()}>
          Save benchmarks
        </button>
      </div>
    </section>
  );
}
