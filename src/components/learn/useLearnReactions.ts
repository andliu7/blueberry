import { REACTIONS, type StagedReaction } from "@/data/reactions";
import { parseTaReactions, toStagedReaction } from "@/data/taReactions";
import type { ReactionOverrideValues } from "@/components/ui/reaction-panel";
import { useCourse } from "@/lib/useCourse";
import { useSession } from "@/lib/useSession";

/**
 * Everything the Learn pages need to show reactions, in one hook (a "custom
 * hook": a function whose name starts with `use` so it may call other hooks).
 * The lesson page, the unit hub and the Learn index each used to assemble this
 * themselves, and three copies of the TA merge is how one of them forgets it.
 *
 * - `reactions`: the generated, checked set, plus any reactions staff added
 *   (saved as a course override), merged in where they belong. Staff-added ones
 *   have not been through the conservation pipeline, and the sheet's "How this
 *   was checked" says so.
 * - `canEdit`: presentation only. The policy on `course_overrides` re-checks
 *   every write.
 */
export function useLearnReactions() {
  const session = useSession();
  const { overrides, refresh } = useCourse();
  const ta = parseTaReactions(overrides?.topics?.find((x) => x.id === "__ta_reactions__")?.blocks).map(
    toStagedReaction,
  );
  const reactions: StagedReaction[] = [...REACTIONS, ...ta];
  const canEdit = session?.role === "admin" || session?.role === "owner";

  /** Staff edits for one reaction, keyed by its id wherever it is shown. */
  const overrideFor = (id: string): ReactionOverrideValues | undefined => {
    const o = overrides?.reactions?.find((r) => r.id === id);
    return o ? { videoUrl: o.videoUrl, whyThisReagent: o.whyThisReagent } : undefined;
  };

  return { reactions, overrides, refresh, session, canEdit, overrideFor };
}
