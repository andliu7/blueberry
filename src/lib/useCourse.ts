import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  applyOverrides,
  type CourseOverrides,
  type Reaction,
  type Topic,
  type Unit,
  REACTIONS,
  TOPICS,
  UNITS,
} from "@/data/topics";

/**
 * The course, with staff edits merged in.
 *
 * Starts from the built-in data and renders it immediately, then swaps in the
 * merged version when the overrides arrive. Nothing here ever waits on the
 * network to show a topic — the same lesson learned on the calendar page,
 * which used to show a blank screen while it decided whether it was allowed to
 * draw a month.
 *
 * Reads from Supabase rather than Apps Script. That move is what makes staff
 * editing work at all: Apps Script verifies a Google ID token, a Supabase
 * session has none, so an owner saw every editing control and could save none
 * of them. Here the JWT the client already holds *is* the credential, and the
 * policy on the table decides the rest.
 */

/** One row of `course_overrides`, which is one edited field. */
interface OverrideRow {
  kind: "topic" | "reaction";
  entity_id: string;
  field: string;
  value: string;
}

/**
 * Flat rows to the nested shape `applyOverrides` wants.
 *
 * Rows arrive one per field, so several rows fold into one entry keyed by id.
 */
function toOverrides(rows: OverrideRow[]): CourseOverrides {
  /**
   * `id` is stated separately from the free-text fields because it is the one
   * key that is always present and always a string. Without it the folded entry
   * is a bare `Record<string, string>`, which does not satisfy `TopicOverride`
   * and turns the cast below into a lie the compiler is right to reject.
   */
  type Entry = { id: string } & Record<string, string>;
  const byKind = {
    topic: new Map<string, Entry>(),
    reaction: new Map<string, Entry>(),
  };

  for (const row of rows) {
    const bucket = byKind[row.kind];
    if (!bucket) continue;
    const entry = bucket.get(row.entity_id) ?? { id: row.entity_id };
    entry[row.field] = row.value;
    bucket.set(row.entity_id, entry);
  }

  return {
    topics: [...byKind.topic.values()] as CourseOverrides["topics"],
    reactions: [...byKind.reaction.values()] as CourseOverrides["reactions"],
  };
}

export function useCourse(): {
  units: Unit[];
  topics: Topic[];
  reactions: Reaction[];
  /**
   * The raw override rows, before merging.
   *
   * `applyOverrides` deliberately ignores ids it does not recognise, which is
   * right for the built-in topic list but wrong for the generated reaction set:
   * a video saved against `nabh4-reduction` is a real edit to a real reaction
   * that simply does not live in `topics.ts`. Anything keyed by an id from
   * another source reads it from here.
   */
  overrides: CourseOverrides | null;
  loading: boolean;
  /** Re-fetch, for the editor to call after it saves. */
  refresh: () => void;
} {
  const [overrides, setOverrides] = useState<CourseOverrides | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    void supabase
      .from("course_overrides")
      .select("kind, entity_id, field, value")
      .then(({ data, error }) => {
        if (cancelled) return;
        // A failure here is not worth surfacing: the built-in content is already
        // on screen and correct, just without whatever the TA has since fixed.
        if (!error && data) setOverrides(toOverrides(data as OverrideRow[]));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const merged = overrides
    ? applyOverrides(overrides)
    : { units: UNITS, topics: TOPICS, reactions: REACTIONS };

  return { ...merged, overrides, loading, refresh };
}

/**
 * Writes one field.
 *
 * An empty value clears the override back to the shipped text, so it deletes
 * the row rather than storing `''`. Leaving an empty row behind would work, but
 * it makes "has this ever been edited" unanswerable and the table grows a row
 * for every field anyone has ever touched and reverted.
 *
 * `idToken` is still in the signature and still ignored. Every caller passes
 * it, and removing it is a separate edit across a dozen components; the point
 * of this change is that nothing needs it any more.
 */
export async function setCourseField(args: {
  kind: "topic" | "reaction";
  id: string;
  field: string;
  value: string;
  idToken?: string | null;
}): Promise<{ ok: boolean; error?: string; overrides?: CourseOverrides }> {
  if (!supabase) return { ok: false, error: "Editing is not configured for this build." };

  const { kind, id, field } = args;
  const value = args.value ?? "";

  const { error } = value
    ? await supabase
        .from("course_overrides")
        .upsert(
          { kind, entity_id: id, field, value, updated_at: new Date().toISOString() },
          { onConflict: "kind,entity_id,field" },
        )
    : await supabase
        .from("course_overrides")
        .delete()
        .eq("kind", kind)
        .eq("entity_id", id)
        .eq("field", field);

  if (error) return { ok: false, error: describeWrite(error) };

  // Read back rather than trusting the local edit, so the caller ends up with
  // exactly what the table holds and a rejected write cannot look like a
  // successful one.
  const { data } = await supabase
    .from("course_overrides")
    .select("kind, entity_id, field, value");

  return { ok: true, overrides: toOverrides((data ?? []) as OverrideRow[]) };
}

/**
 * Postgres error codes are not sentences, and the two that matter here mean
 * very different things to whoever is reading the message.
 */
export function describeWrite(error: { code?: string; message?: string }): string {
  if (error.code === "42501")
    return "Your account is not staff, so that change was refused.";
  if (error.code === "PGRST301" || error.code === "401")
    return "Your sign-in has expired. Sign in again to save.";
  return error.message || "That did not save.";
}
