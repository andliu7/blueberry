import { Component, type ReactNode } from "react";

/**
 * Keeps a Clerk failure from taking the site with it.
 *
 * `ClerkProvider` throws when `clerk.js` cannot be fetched
 * (`failed_to_load_clerk_js_timeout`), and a throw during render unmounts the
 * whole tree: the site went white because an auth provider on one page could
 * not reach a CDN. Every deck, the timer and the break room work signed out,
 * so none of them should depend on that request succeeding.
 *
 * On failure this renders the same children *without* the provider. Anything
 * asking Clerk for a user then sees no user, which is the correct answer when
 * Clerk is unreachable, and the sign-in card falls back to Google.
 *
 * A class component because `componentDidCatch` has no hook equivalent. This
 * is the one thing React still requires a class for.
 */
export class ClerkBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Left as a warning rather than swallowed: a silent auth outage is worse
    // than a noisy one, and this is the only trace of it.
    console.warn("[blueberry] Clerk did not load; continuing without it.", error);
  }

  render() {
    // The fallback is the same tree without `ClerkProvider` and without
    // `ClerkUserBridge`, so `useSession` reads the bridge context's signed-out
    // default instead of calling Clerk hooks that have no provider above them.
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default ClerkBoundary;
