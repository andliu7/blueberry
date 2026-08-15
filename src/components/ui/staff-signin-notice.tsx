import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/useSession";

/**
 * Why the editing controls are not there.
 *
 * Shown to someone whose role says staff but whose session cannot write *here*.
 * That combination is real and was invisible: the role resolves correctly, so
 * every editing control appeared, and every save was refused because Apps
 * Script verifies Google ID tokens and nothing else.
 *
 * A control that silently vanishes teaches nothing, and one that appears and
 * then fails teaches the wrong thing. This says which sign-in is needed and
 * links to it.
 *
 * Returns null when there is nothing to explain, so a caller can drop it in
 * without repeating the condition.
 */
export function StaffSignInNotice({
  session,
  action = "Editing",
  className,
}: {
  session: Session | null;
  /** What is unavailable, e.g. "Editing", "Importing a syllabus". */
  action?: string;
  className?: string;
}) {
  const isStaff = session?.role === "admin" || session?.role === "owner";
  // Keyed on the Google token, not on `canWrite`. A Supabase session can write
  // to Supabase perfectly well; what it cannot do is satisfy Apps Script, which
  // verifies a Google ID token and has never heard of Supabase. Until the
  // remaining routes move, those two facts are both true at once.
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
        {action} still saves through the older Google Apps Script backend, which cannot
        verify a Supabase sign-in. Until that moves across,{" "}
        <a href="#/staff" className="font-semibold underline">
          sign in with Google
        </a>{" "}
        to make changes here.
      </span>
    </p>
  );
}

export default StaffSignInNotice;
