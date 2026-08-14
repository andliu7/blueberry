import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useClerkSession } from "@/lib/clerk-session";
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
  /**
   * Whether this session can actually perform a privileged write.
   *
   * Not the same question as `role`, and conflating the two shipped a real bug:
   * an owner signed in through Clerk saw every editing control, because the
   * role resolved from their address, and then every save was refused because
   * there was no credential to send. `verify_` in Apps Script only understands
   * Google ID tokens, and a Clerk session has none.
   *
   * So the UI asks this instead. Deciding it here means no page has to
   * rediscover the reasoning, and when the backend learns to verify Clerk this
   * becomes true for both providers in one edit.
   *
   * Still presentation only. The server re-verifies on every call regardless.
   */
  canWrite: boolean;
}

/**
 * Staff are still decided by address.
 *
 * Presentation only, and deliberately so: this decides which buttons appear,
 * never what the server allows. Apps Script checks the token itself on every
 * privileged call and does not care what the browser believes.
 */
const OWNER_EMAILS = new Set(["zeus.andrewliu@gmail.com", "andliu@terpmail.umd.edu"]);

/**
 * The course TAs, from the CHEM241 syllabus.
 *
 * `admin`, not `owner`. Owners are the hardcoded floor that cannot be removed
 * through a web page; a TA should be able to run tutoring and edit lessons
 * without also being able to change who has access.
 *
 * These are UMD Google Workspace addresses, which is the point: the backend
 * verifies Google ID tokens, so a TA signing in with their university account
 * already has a credential the server accepts. No Clerk work is needed for them
 * to work today.
 */
const ADMIN_EMAILS = new Set(["kaiwalsh@umd.edu", "vwedekin@umd.edu"]);

function roleFor(email: string, clerkRole?: unknown): AccountRole {
  const at = email.trim().toLowerCase();
  if (OWNER_EMAILS.has(at)) return "owner";
  if (ADMIN_EMAILS.has(at)) return "admin";
  // `publicMetadata` is server-written, so it can be trusted for display in a
  // way `unsafeMetadata` never could.
  if (clerkRole === "admin" || clerkRole === "owner") return clerkRole;
  return "member";
}

export function useSession(): Session | null {
  const google = useGoogleAuth();
  /**
   * One hook, always, whether or not Clerk is mounted.
   *
   * This used to pick between a Clerk implementation and a stub based on
   * `clerkConfigured`, which reports whether a key existed at build time, not
   * whether a provider is above you now. When clerk.js failed to load and
   * `ClerkBoundary` re-rendered the site without the provider, the Clerk hooks
   * were still being called and threw hard enough to blank the page. The
   * branch now lives in the tree instead: see `ClerkUserBridge`.
   */
  const clerk = useClerkSession();

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
      // Nothing the server can check. See `canWrite` above.
      canWrite: false,
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
      canWrite: Boolean(google.user.idToken),
    };
  }

  return null;
}
