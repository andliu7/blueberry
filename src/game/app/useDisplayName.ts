/**
 * The student's name as the game shows it, and the one way to save it.
 *
 * accountName.ts holds the reasoning: the account is where a name is saved,
 * and the name typed on this device is only the fallback when signed out.
 * Me, Leaderboards, Messages, Ask Blueberry and the Feed all read from here,
 * so they never disagree about what to call the student.
 */

import { useAuth } from "@/lib/AuthContext";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import { resolveDisplayName, saveAccountName } from "@/lib/accountName";
import { useProgress } from "./hooks";
import { progress } from "./progress";

export interface DisplayName {
  /** What to call the student, or null when nobody has said. */
  readonly name: string | null;
  readonly signedIn: boolean;
  readonly userId: string | null;
  /**
   * True when signed in, the account row has been read, and the account has
   * no name of its own anywhere: the one case where a name typed on this
   * device before signing in should move up to the account.
   */
  readonly accountNameless: boolean;
  /** The name typed on this device, whatever the account says. */
  readonly localName: string | null;
  /** Save a cleaned name to the account. Resolves with an error message, or null when it saved. */
  readonly save: (clean: string) => Promise<string | null>;
}

// A custom hook: a use* function that composes other hooks, so every tab reads the name the same way.
export function useDisplayName(): DisplayName {
  const { user, profileName, profileLoaded, refreshRole } = useAuth();
  const { session } = useSupabaseSession();
  const { displayName } = useProgress();
  const userId = user?.id ?? null;
  const metaName = session?.name ?? null;

  const save = async (clean: string): Promise<string | null> => {
    if (userId === null) return "Sign in to save your name.";
    const { error } = await saveAccountName(userId, clean);
    if (error !== undefined) return error;
    // Kept on the device too, so Bloom still says it with no connection.
    progress.setDisplayName(clean);
    // Re-reads the profile row, which now carries the new name.
    refreshRole();
    return null;
  };

  return {
    name: resolveDisplayName({ profileName, metaName, localName: displayName }),
    signedIn: userId !== null,
    userId,
    accountNameless: userId !== null && profileLoaded && profileName === null && (metaName ?? "").trim() === "",
    localName: displayName,
    save,
  };
}
