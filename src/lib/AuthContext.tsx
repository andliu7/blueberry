import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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
  const [loading, setLoading] = useState(Boolean(supabase));
  const [roleNonce, setRoleNonce] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

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

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
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
    if (!supabase || !userId) {
      setRole("member");
      return;
    }
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("role")
      // Redundant against RLS, which would filter it anyway, but it lets
      // Postgres use the primary key index instead of scanning then filtering.
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRole(asRole(data?.role));
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
