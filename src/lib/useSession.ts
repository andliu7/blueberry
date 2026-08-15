import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { supabaseConfigured } from "@/lib/supabase";
import type { AccountRole } from "@/lib/account";

/**
 * One answer to "who is signed in".
 *
 * Supabase is now the answer. It used to be Google Identity Services and Clerk
 * at once, which is what produced this week's worst bug: Clerk could hold a
 * session while Apps Script could only verify Google ID tokens, so an owner saw
 * every editing control and could save none of them.
 *
 * The shape is unchanged on purpose. Twenty-odd components read this and none
 * of them had to be touched; only where the answer comes from is different.
 *
 * Google is kept as a fallback for as long as Apps Script still serves decks
 * and the workspace, since those verify a Google ID token and nothing else. It
 * is second, not first, and goes when they do.
 */

export type SessionProvider = "supabase" | "google";

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
/**
 * The last hardcoded role list, kept only for the Google fallback.
 *
 * Supabase reads roles from `profiles`, filled by the signup trigger from
 * `staff_roster`, so adding a TA there is an insert rather than a code change.
 * This set survives only because Apps Script still serves decks and the
 * workspace and knows nothing about that table. It goes when they do.
 *
 * Presentation only either way: the server checks the credential itself on
 * every privileged call and does not care what the browser believes.
 */
const FALLBACK_ROLES: Record<string, AccountRole> = {
  "zeus.andrewliu@gmail.com": "owner",
  "andliu@terpmail.umd.edu": "owner",
  "kaiwalsh@umd.edu": "admin",
  "kwalshfb0416@gmail.com": "admin",
  "vwedekin@umd.edu": "admin",
};

const fallbackRoleFor = (email: string): AccountRole =>
  FALLBACK_ROLES[email.trim().toLowerCase()] ?? "member";

export function useSession(): Session | null {
  const { session: supa } = useSupabaseSession();
  const google = useGoogleAuth();

  const signOutBoth = () => {
    supa?.signOut();
    google.signOut();
  };

  // Supabase first. It is the one that can write, and a leftover Google session
  // should never shadow a deliberate sign-in.
  if (supabaseConfigured && supa) {
    return {
      email: supa.email,
      name: supa.name,
      picture: supa.picture,
      // From `profiles`, not from a list in this file.
      role: supa.role,
      provider: "supabase",
      signOut: signOutBoth,
      // Apps Script cannot verify a Supabase token, so anything still routed
      // there stays unauthenticated until it moves. Deliberately null rather
      // than the access token, so nothing sends a credential the other end
      // will silently fail to check.
      idToken: null,
      canWrite: true,
    };
  }

  if (google.user?.email) {
    return {
      email: google.user.email,
      name: google.user.name ?? null,
      picture: google.user.picture ?? null,
      role: fallbackRoleFor(google.user.email),
      provider: "google",
      signOut: signOutBoth,
      idToken: google.user.idToken,
      canWrite: Boolean(google.user.idToken),
    };
  }

  return null;
}
