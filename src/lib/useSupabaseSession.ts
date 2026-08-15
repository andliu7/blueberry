import { authRedirectTo, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import type { AccountRole } from "@/lib/account";

/**
 * The signed-in user, shaped the way the rest of the site already expects.
 *
 * Reads from `AuthProvider` rather than subscribing itself, so twenty callers
 * cost one subscription and one profile query rather than twenty of each.
 *
 * Two long-standing bugs close by construction here. `role` comes from the
 * `profiles` row that the signup trigger fills from `staff_roster`, so the
 * hardcoded owner and admin email sets are gone and adding a TA is an insert.
 * And `canWrite` is simply whether there is a session: Supabase's JWT *is* the
 * credential the server checks, so the situation that caused this week's worst
 * bug — an owner holding a session with nothing the backend could verify —
 * cannot happen again.
 */

export interface SupabaseSession {
  email: string;
  name: string | null;
  picture: string | null;
  role: AccountRole;
  accessToken: string | null;
  canWrite: boolean;
  signOut: () => void;
}

export function useSupabaseSession(): {
  session: SupabaseSession | null;
  loading: boolean;
} {
  const { session, user, role, loading } = useAuth();

  if (!user) return { session: null, loading };

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = meta?.[key];
      if (typeof value === "string" && value) return value;
    }
    return null;
  };

  return {
    loading,
    session: {
      email: user.email ?? "",
      // Google sends `full_name`; the signup form writes the same key, so one
      // lookup covers both ways in. `name` is Google's older field.
      name: pick("full_name", "name"),
      picture: pick("avatar_url", "picture"),
      role,
      accessToken: session?.access_token ?? null,
      canWrite: true,
      signOut: () => void supabase?.auth.signOut(),
    },
  };
}

/**
 * Send someone to Google.
 *
 * `authRedirectTo()` returns the current page *without* its hash, because this
 * site routes on the hash and Supabase puts its own tokens there on the way
 * back. Handing Google a URL that already contains `#/signin` loses one or the
 * other.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (!supabase) return { error: "Sign-in is not configured." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authRedirectTo() },
  });
  return error ? { error: error.message } : {};
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: "Sign-in is not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

/**
 * `full_name` and `institution` go in `options.data`, which Supabase stores as
 * `raw_user_meta_data`. The signup trigger reads exactly those two keys back
 * out, so the names have to match the migration or the profile arrives blank.
 *
 * This is the piece Clerk made awkward: arbitrary signup fields reaching your
 * own table without a webhook in between.
 */
export async function signUpWithEmail(args: {
  email: string;
  password: string;
  fullName: string;
  institution: string;
}): Promise<{ error?: string; needsConfirmation?: boolean }> {
  if (!supabase) return { error: "Sign-in is not configured." };
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: authRedirectTo(),
      data: { full_name: args.fullName, institution: args.institution },
    },
  });
  if (error) return { error: error.message };
  // A user with no session means confirmation is on and the email has gone.
  return { needsConfirmation: !data.session };
}
