import { useState } from "react";
import { ShieldCheck, UserPlus, Crown, AlertTriangle } from "lucide-react";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import { postToAppsScript } from "@/lib/appsScript";
import type { AdminEntry } from "@/lib/workspace";
import { timeAgo } from "@/lib/workspace";

/**
 * Who may sign in, and the controls to change it.
 *
 * Two tiers, and the difference between them is the reason this is safe to put
 * on a web page at all. Owners come from the script's own ALLOWLIST and cannot
 * be removed here; invited admins are rows in a sheet and can. Without that
 * floor there is a sequence of perfectly ordinary clicks that removes the last
 * admin and locks the project out of its own backend, with no way back except
 * editing the Apps Script by hand.
 *
 * Adding someone here does not create an account or send anything. It records
 * an address, and Google decides whether the person signing in actually owns it.
 * That is why the address check is loose: a typo cannot let anyone in, it just
 * means the invite never matches a real sign-in.
 */
export function AdminPanel({
  admins,
  owners,
  you,
  idToken,
  onChanged,
}: {
  admins: AdminEntry[];
  owners: string[];
  you: string;
  idToken: string;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const call = async (key: string, type: "addAdmin" | "removeAdmin", value: string) => {
    setBusy(key);
    setError("");
    setNote("");
    const body = await postToAppsScript(type, { idToken, email: value });
    setBusy(null);
    if (body.ok) {
      if (type === "addAdmin") {
        setEmail("");
        setNote(`${value} can now sign in. Nothing was emailed to them.`);
      }
      onChanged();
    } else {
      setError(
        body.error === "unreachable"
          ? "Could not reach the workspace endpoint."
          : (body.error ?? "The server refused that."),
      );
    }
  };

  return (
    <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-stone-100">
        <ShieldCheck className="h-4 w-4" />
        Who can sign in
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
        Adding an address lets that Google account into this workspace and the deck
        controls. It does not send an invitation, so tell them yourself.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = email.trim().toLowerCase();
          if (value) void call("add", "addAdmin", value);
        }}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <UserPlus className="h-4 w-4 shrink-0 text-slate-400 dark:text-stone-500" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@terpmail.umd.edu"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
        />
        <button
          type="submit"
          disabled={busy === "add" || email.trim() === ""}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy === "add" ? "Adding…" : "Give access"}
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {note && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{note}</p>}

      <ul className="mt-5 space-y-2">
        {owners.map((owner) => (
          <li
            key={owner}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-stone-800"
          >
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-stone-300">
              {owner}
              {owner === you && <span className="ml-2 text-slate-400">(you)</span>}
            </span>
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
              Owner
            </span>
          </li>
        ))}

        {admins.map((admin) => (
          <li
            key={admin.email}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-stone-800"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-stone-300">
              {admin.email}
              {admin.email === you && <span className="ml-2 text-slate-400">(you)</span>}
            </span>
            <span className="shrink-0 font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
              {admin.addedBy ? `added by ${admin.addedBy.split("@")[0]}` : ""}{" "}
              {admin.at ? timeAgo(admin.at) : ""}
            </span>
            <ButtonHoldAndRelease
              onConfirm={() => void call("rm-" + admin.email, "removeAdmin", admin.email)}
              holdDuration={1400}
              label={admin.email === you ? "Remove me" : "Remove"}
              holdingLabel="Hold…"
              className="h-7 min-w-0 shrink-0 px-2 text-[0.7rem]"
            />
          </li>
        ))}
      </ul>

      {admins.length === 0 && (
        <p className="mt-3 text-xs text-slate-400 dark:text-stone-500">
          No invited admins yet. Owners are set in the Apps Script and cannot be removed
          from here, which is what stops this page locking everyone out.
        </p>
      )}
    </section>
  );
}

export default AdminPanel;
