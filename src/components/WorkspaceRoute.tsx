import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { SignInPage } from "@/components/SignInPage";
import { WorkspacePage } from "@/components/WorkspacePage";

/**
 * The door to the workspace, and the lock on it.
 *
 * `WorkspacePage` needs a signed-in `GoogleUser`, so until now it had no route
 * at all — the component existed and nothing could reach it. This is the piece
 * that was missing: one address, `#/workspace`, that shows the workspace when
 * there is a user and the sign-in card when there is not.
 *
 * Signing in is the gate rather than a separate redirect, so the name on the
 * About card can point straight here. A visitor who clicks it sees exactly what
 * they saw before — a sign-in that turns most people away — and Andrew, already
 * signed in, lands in the workspace instead of at a card telling him he is
 * signed in and offering him the home page.
 *
 * `ready` matters. The Google script resolves the existing session
 * asynchronously, so for the first moment after a reload `user` is null even
 * when someone is signed in. Rendering the sign-in card during that gap would
 * flash "sign in" at someone who already has, and then yank it away.
 */
export function WorkspaceRoute() {
  const auth = useGoogleAuth();

  if (!auth.user) {
    // Blank rather than a spinner while the session resolves: it is a few
    // hundred milliseconds, and a spinner that brief reads as a flicker.
    if (!auth.ready && auth.configured) return <div className="min-h-screen bg-[#171327]" />;
    return <SignInPage mode="staff" />;
  }

  return <WorkspacePage user={auth.user} />;
}

export default WorkspaceRoute;
