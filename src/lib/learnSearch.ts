import type { StagedReaction } from "@/data/reactions";
import { REACTION_GROUPS, REAGENT_NAMES } from "@/data/learnIndex";
import { LESSON_TOPICS, sectionForFamily, type LessonTopic } from "@/data/lessonTopics";
import { stageReagentLabel } from "@/game/cards/reactionCard";
import { unitForFamily, unitsForLesson } from "@/data/learnMap";

/**
 * Learn's search: find a reaction by its name, a reagent, or what goes in and
 * comes out (SITE-REPLAN.md section 3, "the lookup a student does the night
 * before an exam"), optionally inside one unit; and the lessons that talk about it.
 *
 * Every word searched comes from the generated data, never from a synonym list
 * written here: an invented synonym is where a wrong one would get in.
 *
 * LEARN ROUND 3: WHAT A REACTION IS FOUND BY. "Grignard reagent" found nothing
 * and "ketone" found 2 of the 13 reactions with a ketone in them, because only
 * names and bottle labels were indexed. Now also:
 *   - the functional groups RDKit finds in the starting material and product
 *     (REACTION_GROUPS, scripts/build_learn_index.py), so "ketone" finds every
 *     reaction that starts from or makes one;
 *   - each drawn reagent's name (REAGENT_NAMES, PubChem's title for the drawn
 *     structure), so "borohydride" finds what "NaBH4" finds;
 *   - each stage's role in the data ("reagent", "workup", "catalyst"), which is
 *     what lets "Grignard reagent" mean the Grignard reactions;
 *   - the title and label of the lesson the reaction sits under.
 *
 * Every typed word has to match somewhere (AND, not OR), so "grignard ketone"
 * narrows instead of widening. A word ending in "s" also matches without it, so
 * "ketones" finds what "ketone" finds.
 */
function reactionWords(r: StagedReaction): string {
  const groups = REACTION_GROUPS[r.id];
  const lesson = LESSON_TOPICS.find((t) => t.id === sectionForFamily(r.family));
  const words = [
    r.name,
    r.reaction_type,
    ...r.family.split("/"),
    ...r.reactant_labels,
    r.product_label,
    ...r.stages.map(stageReagentLabel),
    ...r.stages.flatMap((s) => s.reagents.map((t) => REAGENT_NAMES[t] ?? "")),
    ...r.stages.map((s) => s.role),
    ...(groups ? [...groups.start, ...groups.product] : []),
    lesson?.label ?? "",
    lesson?.title ?? "",
  ];
  return normalise(words.filter(Boolean).join(" "));
}

/** The words of a lesson: its names, its text and its worked examples' titles. */
function lessonWords(t: LessonTopic): string {
  return normalise([t.label, t.title, t.lead, t.mechanism, t.difference, ...t.examples.map((e) => e[0] ?? "")].join(" "));
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[-_/]/g, " ");
}

/** The query as words, each also tried without a plural "s". */
function terms(query: string): string[][] {
  return normalise(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? [w, w.slice(0, -1)] : [w]));
}

function matches(haystack: string, query: string[][]): boolean {
  return query.every((forms) => forms.some((f) => haystack.includes(f)));
}

export function searchReactions(
  reactions: readonly StagedReaction[],
  query: string,
  unitId: string | null = null,
): StagedReaction[] {
  const q = terms(query);
  return reactions.filter((r) => {
    if (unitId && unitForFamily(r.family) !== unitId) return false;
    return matches(reactionWords(r), q);
  });
}

/** Lessons whose words hold every typed word. Empty for an empty query. */
export function searchLessons(query: string, unitId: string | null = null): LessonTopic[] {
  const q = terms(query);
  if (q.length === 0) return [];
  return LESSON_TOPICS.filter((t) => (!unitId || unitsForLesson(t.id).includes(unitId)) && matches(lessonWords(t), q));
}

/** Example searches the search offers as chips (Learn round 4); learn.test.ts checks each finds a reaction. */
export const SEARCH_EXAMPLES = ["Grignard", "aldol", "ester"] as const;
