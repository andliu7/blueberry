import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  getSupabase,
  onSupabaseClient,
  supabaseAuthToRestore,
  supabaseConfigured,
  supabaseStorageKeyPrefix,
} from "@/lib/supabase";
import type { AccountRole } from "@/lib/account";
import { consumeReturn, forgetReturnUnlessSigningIn } from "@/lib/returnTo";

/**
 * One auth subscription for the whole app.
 *
 * This started as a hook that any component could call, which meant every one
 * of the twenty-odd callers opened its own `onAuthStateChange` subscription and
 * ran its own `profiles` query. Same answer, fetched twenty times a page. A
 * context subscribes once and everybody reads the result.
 *
 * **The rule that matters here:** never `await` a Supabase call inside the
 * `onAuthStateChange` callback. That callback runs while the auth library holds
 * an internal lock, and awaiting another Supabase call inside it deadlocks —
 * the page simply stops, with no error to search for. So the callback only sets
 * state, and the profile is fetched by a separate effect watching the user id.
 */

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** From `public.profiles`, filled by the signup trigger from `staff_roster`. */
  role: AccountRole;
  /** True until the first auth answer is known, so pages can avoid a flash. */
  loading: boolean;
  /**
   * `profiles.full_name`: the account's name, the one the game greets with.
   * Null when signed out, when the row has none, or before the row arrives.
   */
  profileName: string | null;
  /** True once the profile row for the current user has been read (or failed to). */
  profileLoaded: boolean;
  /** Re-read the profile, for when a role or the name changes without a sign-in. */
  refreshRole: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: "member",
  loading: true,
  profileName: null,
  profileLoaded: false,
  refreshRole: () => {},
});

/** `profiles.role` is free text in Postgres. Narrow it once, here. */
function asRole(value: unknown): AccountRole {
  return value === "owner" || value === "admin" ? value : "member";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AccountRole>("member");
  // Waiting only when there is a session to restore. A cold signed-out open
  // reads loading=false from the first frame, so the #/app gate (AppGate.tsx)
  // never shows the loader just to say "signed out". React pattern: a lazy
  // initializer, run once on the first render.
  const [loading, setLoading] = useState(() => supabaseConfigured && supabaseAuthToRestore());
  const [roleNonce, setRoleNonce] = useState(0);
  const [profileName, setProfileName] = useState<string | null>(null);
  // Which user the name above belongs to, so a name still loading never reads as "no name".
  const [profileFor, setProfileFor] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attached = false;
    let unsubscribe: (() => void) | null = null;

    // Subscribe once, to whichever client turns up first. `onSupabaseClient`
    // can call this twice in a race, hence the `attached` guard.
    const attach = (supabase: SupabaseClient) => {
      if (cancelled || attached) return;
      attached = true;

      // Whatever is already in localStorage. Without this the first paint is
      // signed-out and then corrects itself, which reads as a flicker on reload.
      void supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
        // Back to the game if the student left it to sign in (returnTo.ts).
        // Synchronous, so the no-await rule below still holds.
        if (data.session) consumeReturn();
      });

      const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
        // State only. See the note above about the lock.
        setSession(next);
        setLoading(false);
        // Only a fresh sign-in returns to the game, not a token refresh or a
        // profile update an hour later.
        if (event === "SIGNED_IN" && next) consumeReturn();
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    };

    // The client arrives as a lazy chunk (see `getSupabase`). Whoever loads it
    // first, a sign-in button or the restore below, this hears about it.
    const off = onSupabaseClient(attach);

    const load = () => {
      void getSupabase().then((supabase) => {
        if (cancelled) return;
        if (!supabase) {
          setLoading(false);
          return;
        }
        attach(supabase);
      }).catch((error: unknown) => {
        // The chunk failed to load. Settle as signed out, the same state as a
        // build without Supabase, rather than leaving every page waiting on
        // `loading` for the rest of the session. The eager client would have
        // failed loudly at startup, so say so in the console too.
        console.error("Blueberry: the Supabase client failed to load, continuing signed out.", error);
        if (!cancelled) setLoading(false);
      });
    };

    // Load on mount only when there is a stored session or a Google redirect
    // to finish. A first-time visitor has neither, and is signed out: the same
    // answer the client would give, without its 53 KB on the first open.
    if (supabaseAuthToRestore()) load();
    else setLoading(false);

    // A sign-in in another tab writes the session key here too. Load the
    // client then, so this tab notices, as it did when the client was eager.
    const prefix = supabaseStorageKeyPrefix();
    const onStorage = (event: StorageEvent) => {
      if (prefix && event.key?.startsWith(prefix) && event.newValue) load();
    };
    window.addEventListener("storage", onStorage);
    const onHash = () => forgetReturnUnlessSigningIn(window.location.hash);
    window.addEventListener("hashchange", onHash);

    // Subscribe in an effect, undo it in the cleanup: React runs the cleanup on
    // unmount (and twice in dev's StrictMode), so nothing is left listening.
    return () => {
      cancelled = true;
      off();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hashchange", onHash);
      unsubscribe?.();
    };
  }, []);

  /**
   * The role, fetched separately.
   *
   * Keyed on the user id rather than the session object: Supabase hands back a
   * new session whenever it refreshes the access token, roughly hourly, and
   * keying on that would refetch the role every time for no reason.
   */
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!supabaseConfigured || !userId) {
      setRole("member");
      setProfileName(null);
      setProfileFor(null);
      return;
    }
    let cancelled = false;
    void getSupabase().then((supabase) => {
      if (cancelled || !supabase) return;
      return supabase
        .from("profiles")
        .select("role, full_name")
        // Redundant against RLS, which would filter it anyway, but it lets
        // Postgres use the primary key index instead of scanning then filtering.
        .eq("id", userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return;
          setRole(asRole(data?.role));
          // A failed read is not "this account has no name": leave it unloaded,
          // so nothing writes a local name over an account name it never saw.
          if (error) return;
          const name = typeof data?.full_name === "string" ? data.full_name.trim() : "";
          setProfileName(name === "" ? null : name);
          setProfileFor(userId);
        });
    }).catch(() => {
      // No client, so no profile to read: the default role stands.
      if (cancelled) return;
      setRole("member");
    });
    return () => {
      cancelled = true;
    };
  }, [userId, roleNonce]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        loading,
        profileName: profileFor === userId ? profileName : null,
        profileLoaded: userId !== null && profileFor === userId,
        refreshRole: () => setRoleNonce((n) => n + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
