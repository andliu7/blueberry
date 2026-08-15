import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/useSession";

/**
 * Why one particular control is not going to work.
 *
 * Shown to someone whose role says staff but whose session cannot write *to the
 * backend this feature happens to use*. That combination was real and invisible:
 * the role resolved correctly, so every editing control appeared, and every save
 * was refused because Apps Script verifies Google ID tokens and nothing else.
 *
 * The important word is *this feature*. Lesson content and calendar dates now
 * live in Supabase and save with the session the user already has, so the notice
 * must not appear there — a warning that shows up next to a control that works
 * is worse than none, because it teaches people to ignore it. Only what still
 * routes through Apps Script passes `backend="apps-script"`.
 *
 * Returns null when there is nothing to explain, so a caller can drop it in
 * without repeating the condition.
 */
export function StaffSignInNotice({
  session,
  action = "This",
  backend = "apps-script",
  className,
}: {
  session: Session | null;
  /** What is unavailable, e.g. "Importing a syllabus", "Asking Blueberry". */
  action?: string;
  /**
   * Which server the feature writes to. Supabase-backed features never need
   * this notice, so passing `"supabase"` is the same as not rendering it — the
   * prop exists so a page can say which it is rather than leaving it implied.
   */
  backend?: "supabase" | "apps-script";
  className?: string;
}) {
  const isStaff = session?.role === "admin" || session?.role === "owner";
  // Keyed on the Google token, not on `canWrite`. A Supabase session writes to
  // Supabase perfectly well; what it cannot do is satisfy Apps Script, which
  // verifies a Google ID token and has never heard of Supabase.
  if (backend === "supabase") return null;
  if (!session || !isStaff || session.idToken) return null;

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-900",
        "dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <KeyRound className="mt-0.5 size-4 shrink-0" />
      <span>
        {action} still runs on the older Google Apps Script backend, which cannot read a
        Supabase sign-in. Editing lessons and the calendar is unaffected and works with
        the account you are signed in with now.
      </span>
    </p>
  );
}

export default StaffSignInNotice;
