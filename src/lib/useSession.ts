import { useClerk, useUser } from "@clerk/clerk-react";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { clerkConfigured } from "@/lib/clerk";
import type { AccountRole } from "@/lib/account";

/**
 * One answer to "who is signed in", from two providers.
 *
 * Clerk holds member accounts and Google still holds staff, because Apps Script
 * verifies Google ID tokens itself and has never seen a Clerk one. Both are live
 * at once, and every screen that asked only Google was blind to half the users:
 * a Clerk member looked signed out, and a stale Google session hid the Clerk
 * form entirely.
 *
 * Clerk wins when both are present. It is the newer, deliberate sign-in, and the
 * Google session is usually a leftover from before.
 */

export type SessionProvider = "clerk" | "google";

export interface Session {
  email: string;
  name: string | null;
  picture: string | null;
  role: AccountRole;
  provider: SessionProvider;
  /** Ends every session, not just the one that is showing. */
  signOut: () => void;
  /** Google's raw token, for Apps Script. Absent for Clerk members. */
  idToken: string | null;
}

/**
 * Staff are still decided by address.
 *
 * Presentation only, and deliberately so: this decides which buttons appear,
 * never what the server allows. Apps Script checks the token itself on every
 * privileged call and does not care what the browser believes.
 */
const OWNER_EMAILS = new Set(["zeus.andrewliu@gmail.com", "andliu@terpmail.umd.edu"]);

function roleFor(email: string, clerkRole?: unknown): AccountRole {
  const at = email.trim().toLowerCase();
  if (OWNER_EMAILS.has(at)) return "owner";
  // `publicMetadata` is server-written, so it can be trusted for display in a
  // way `unsafeMetadata` never could.
  if (clerkRole === "admin" || clerkRole === "owner") return clerkRole;
  return "member";
}

/**
 * Two implementations, chosen once at module load.
 *
 * `clerkConfigured` is a build-time constant, so this branch never changes
 * between renders and the hook order stays stable. Calling Clerk's hooks with
 * no provider above them would throw, which is why they cannot simply be called
 * and ignored.
 */
function useClerkSide() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  if (!isLoaded || !isSignedIn || !user) {
    return { email: null, name: null, picture: null, role: undefined, signOut: () => clerk.signOut() };
  }
  return {
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName ?? user.username ?? null,
    picture: user.imageUrl ?? null,
    role: (user.publicMetadata as { role?: unknown } | undefined)?.role,
    signOut: () => void clerk.signOut(),
  };
}

function useNoClerkSide() {
  return { email: null, name: null, picture: null, role: undefined, signOut: () => {} };
}

const useClerkUser = clerkConfigured ? useClerkSide : useNoClerkSide;

export function useSession(): Session | null {
  const google = useGoogleAuth();
  const clerk = useClerkUser();

  const signOutBoth = () => {
    clerk.signOut();
    google.signOut();
  };

  if (clerk.email) {
    return {
      email: clerk.email,
      name: clerk.name,
      picture: clerk.picture,
      role: roleFor(clerk.email, clerk.role),
      provider: "clerk",
      signOut: signOutBoth,
      idToken: null,
    };
  }

  if (google.user?.email) {
    return {
      email: google.user.email,
      name: google.user.name ?? null,
      picture: google.user.picture ?? null,
      role: roleFor(google.user.email),
      provider: "google",
      signOut: signOutBoth,
      idToken: google.user.idToken,
    };
  }

  return null;
}
