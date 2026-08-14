import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/useSession";

/**
 * Why the editing controls are not there.
 *
 * Shown to someone whose role says staff but whose session cannot write. That
 * combination is real and was invisible: signing in through Clerk resolves an
 * owner from their address, so every editing control appeared, and every save
 * was refused because Apps Script only verifies Google ID tokens and a Clerk
 * session has none.
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
  if (!session || !isStaff || session.canWrite) return null;

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
        {action} needs a Google sign-in. You are signed in through Clerk, which the server
        cannot verify yet, so saving would be refused.{" "}
        <a href="#/staff" className="font-semibold underline">
          Sign in with Google
        </a>{" "}
        to make changes.
      </span>
    </p>
  );
}

export default StaffSignInNotice;
