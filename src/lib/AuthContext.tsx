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
  /** Re-read the profile, for when a role changes without a sign-in. */
  refreshRole: () => void;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: "member",
  loading: true,
  refreshRole: () => {},
});

/** `profiles.role` is free text in Postgres. Narrow it once, here. */
function asRole(value: unknown): AccountRole {
  return value === "owner" || value === "admin" ? value : "member";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AccountRole>("member");
  const [loading, setLoading] = useState(supabaseConfigured);
  const [roleNonce, setRoleNonce] = useState(0);

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
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
        // State only. See the note above about the lock.
        setSession(next);
        setLoading(false);
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

    // Subscribe in an effect, undo it in the cleanup: React runs the cleanup on
    // unmount (and twice in dev's StrictMode), so nothing is left listening.
    return () => {
      cancelled = true;
      off();
      window.removeEventListener("storage", onStorage);
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
      return;
    }
    let cancelled = false;
    void getSupabase().then((supabase) => {
      if (cancelled || !supabase) return;
      return supabase
        .from("profiles")
        .select("role")
        // Redundant against RLS, which would filter it anyway, but it lets
        // Postgres use the primary key index instead of scanning then filtering.
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setRole(asRole(data?.role));
        });
    }).catch(() => {
      // No client, so no profile to read: the default role stands.
      if (!cancelled) setRole("member");
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
        refreshRole: () => setRoleNonce((n) => n + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
