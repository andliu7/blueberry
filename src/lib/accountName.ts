import { getSupabase } from "@/lib/supabase";

/**
 * The student's name, one answer for the site and the game (owner, item 11).
 *
 * There were three stores that never met: the game's local `displayName`, the
 * site's signup form, and the account (`profiles.full_name`, which Google
 * sign-in already fills). A name typed in the game lived in one browser only,
 * so it was missing in the iPad home-screen app, on another device, and after
 * Safari cleared storage. The account is now the one place a name is saved;
 * the local copy is what the game falls back to when nobody is signed in.
 *
 * `profiles_update_own` and the column grant on `full_name`
 * (20260815181500_role_hardening.sql) already let a student update their own
 * name, so this needs no server change.
 */

/** Save the account's name. Resolves with an error message when it did not save. */
export async function saveAccountName(userId: string, name: string): Promise<{ error?: string }> {
  try {
    const supabase = await getSupabase();
    if (!supabase) return { error: "Sign-in is not set up here, so the name cannot be saved." };
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
    return error ? { error: "Your name did not save. Check your connection and try again." } : {};
  } catch {
    return { error: "Your name did not save. Check your connection and try again." };
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Which name to show. The account row wins, then the sign-in's own metadata
 * (the signup form's or Google's name), then the name typed on this device.
 */
export function resolveDisplayName(input: {
  readonly profileName: string | null | undefined;
  readonly metaName: string | null | undefined;
  readonly localName: string | null | undefined;
}): string | null {
  return clean(input.profileName) ?? clean(input.metaName) ?? clean(input.localName);
}

/** The first word of a name, for a greeting: "Ada Lovelace" says hi to Ada. */
export function firstNameOf(name: string | null | undefined): string | null {
  return clean(name)?.split(/\s+/)[0] ?? null;
}
