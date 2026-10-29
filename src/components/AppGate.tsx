import { lazy, useEffect } from "react";
import { LoaderGate } from "@/components/ui/blueberry-loader";
import { useAuth } from "@/lib/AuthContext";
import { appGateFor, isLocalHost } from "@/lib/appGate";
import { rememberReturn } from "@/lib/returnTo";
import { supabaseConfigured } from "@/lib/supabase";

/**
 * The game, and the one route on this site that is a whole other application.
 *
 * Lazy, and it matters more here than anywhere else: this is 87,000 lines of
 * app plus five engine packages, and a student who only ever reads the lessons
 * should never download it. Everything the game needs, including its own
 * stylesheet, arrives with this chunk.
 */
const loadGamePage = () => import("@/components/GamePage");
const GamePage = lazy(loadGamePage);

/**
 * The door to #/app (owner, 23 Oct, G1: "Before anything"). Signed out, the
 * visitor goes to #/signin, which suggests Pro, and returnTo.ts brings them
 * back here once a session appears. It sits at the site router, one level
 * above the game, so the game itself never has to know about signing in.
 *
 * Three states (appGate.ts):
 * - wait: a stored session is restoring. The berry covers it, nothing in the
 *   game mounts yet (no gifts, no onboarding redirect), and the game chunk is
 *   fetched alongside supabase-js instead of after it.
 * - signin: remember the hash, then replace it with #/signin.
 * - game: the game, behind the same LoaderGate every split route uses.
 *
 * LOOP GUARD. This only ever sends #/app* to #/signin. rememberReturn keeps
 * only #/app hashes, so #/signin can never become a return target, and
 * consumeReturn (AuthProvider) fires only when a session exists, which is
 * exactly when this renders the game. An expired stored token goes loader then
 * sign-in once; a failed supabase chunk settles signed out, and the sign-in
 * buttons try the chunk again.
 */
export function AppGate() {
  const { user, loading } = useAuth();
  const state = appGateFor({
    configured: supabaseConfigured,
    loading,
    signedIn: user !== null,
    localHost: isLocalHost(window.location.hostname),
  });

  // Effects run after render, never during it, so the navigation below cannot
  // fire halfway through drawing a page. Both re-run only when the state changes.
  useEffect(() => {
    if (state === "wait") void loadGamePage();
  }, [state]);

  useEffect(() => {
    if (state !== "signin") return;
    rememberReturn(window.location.hash);
    // replace, not a hash set, so Back from #/signin skips this address
    // instead of bouncing #/signin to #/app to #/signin.
    window.location.replace("#/signin");
  }, [state]);

  if (state === "signin") return null;
  // One LoaderGate for both states, so the berry that covered the wait is the
  // same one that covers the chunk and runs its finish once.
  return <LoaderGate waiting={state === "wait"}>{state === "game" && <GamePage />}</LoaderGate>;
}

export default AppGate;
