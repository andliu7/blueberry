import { useCallback, useEffect, useState } from "react";
import { postToAppsScript } from "@/lib/appsScript";
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
 */
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

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    void postToAppsScript("course", {}).then((body) => {
      if (cancelled) return;
      // A failure here is not worth surfacing: the built-in content is already
      // on screen and correct, just without whatever the TA has since fixed.
      if (body.ok && body.overrides) setOverrides(body.overrides as CourseOverrides);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  const merged = overrides
    ? applyOverrides(overrides)
    : { units: UNITS, topics: TOPICS, reactions: REACTIONS };

  return { ...merged, overrides, loading, refresh };
}

/** Writes one field. An empty value clears the override back to the shipped text. */
export async function setCourseField(args: {
  kind: "topic" | "reaction";
  id: string;
  field: string;
  value: string;
  idToken: string | null;
}): Promise<{ ok: boolean; error?: string; overrides?: CourseOverrides }> {
  const body = await postToAppsScript("setCourse", args);
  if (!body.ok) {
    return {
      ok: false,
      error:
        body.error === "unreachable"
          ? "Could not reach the server."
          : ((body.error as string) ?? "That did not save."),
    };
  }
  return { ok: true, overrides: body.overrides as CourseOverrides };
}
