import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

/**
 * Clerk's answer, published as context from inside the provider.
 *
 * The problem this solves: `useSession` used to pick between a Clerk
 * implementation and a stub using `clerkConfigured`, a build-time constant.
 * That constant says a key existed when the site was compiled. It does not say
 * a provider is mounted right now, and the two come apart the moment clerk.js
 * fails to load, because `ClerkBoundary` then re-renders the whole site
 * *without* the provider. Every page still calling `useUser` threw
 * "useUser can only be used within the <ClerkProvider /> component", which
 * blanked the page. A worse outage than the one the boundary was catching.
 *
 * Branching inside `useSession` on a context flag would fix the crash but calls
 * a hook conditionally, which is fragile however carefully it is reasoned about
 * and which the linter is right to reject. So the branch moves out of the hook
 * and into the tree: this bridge is mounted only under `ClerkProvider`, and
 * anywhere it is absent the context keeps its signed-out default. `useSession`
 * then calls exactly one hook, unconditionally, forever.
 */

export interface ClerkSide {
  email: string | null;
  name: string | null;
  picture: string | null;
  role: unknown;
  signOut: () => void;
}

/** The honest answer when Clerk is not mounted: nobody is signed in through it. */
const SIGNED_OUT: ClerkSide = {
  email: null,
  name: null,
  picture: null,
  role: undefined,
  signOut: () => {},
};

const ClerkSessionContext = createContext<ClerkSide>(SIGNED_OUT);

export function useClerkSession(): ClerkSide {
  return useContext(ClerkSessionContext);
}

export function ClerkUserBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();

  // Memoised on the fields actually read. Without this the value is a new
  // object every render and every consumer of the context re-renders with it,
  // which on this site means the dashboard, the lessons page and the bot.
  const value = useMemo<ClerkSide>(() => {
    const signOut = () => void clerk.signOut();
    if (!isLoaded || !isSignedIn || !user) return { ...SIGNED_OUT, signOut };
    return {
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: user.fullName ?? user.username ?? null,
      picture: user.imageUrl ?? null,
      role: (user.publicMetadata as { role?: unknown } | undefined)?.role,
      signOut,
    };
  }, [isLoaded, isSignedIn, user, clerk]);

  return <ClerkSessionContext.Provider value={value}>{children}</ClerkSessionContext.Provider>;
}
