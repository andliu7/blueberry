import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LessonSidebar, type SidebarGroup } from "@/components/ui/lesson-sidebar";
import type { StagedReaction } from "@/data/reactions";
import { LESSON_TOPICS, sectionForFamily } from "@/data/lessonTopics";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import { findUnit, unitForFamily, unitParts, unitsForLesson } from "@/data/learnMap";
import { ReactionCard } from "@/components/learn/ReactionCard";
import { SEARCH_EXAMPLES, searchLessons, searchReactions } from "@/lib/learnSearch";
import { plural } from "@/lib/helpers";

/**
 * Learn's reaction search (SITE-REPLAN.md section 3): "the flat library survives
 * as search". It replaces the old #/reactions page, which listed the same 43
 * reactions a second time with their SMILES printed under them.
 *
 * Empty, it lists every reaction filed under its lesson, folded, so it is also
 * the browse view. Typing or picking a unit turns the hits into reaction cards
 * (Learn round 2: a bare name in a bullet said nothing about why it matched),
 * each with its unit and lesson above its drawn scheme. A result opens the same
 * reaction sheet the lesson cards open, through `onOpen`. Since Learn round 3 the
 * lessons whose text matches are listed above the reactions, as links.
 *
 * Learn round 4: results run the full width, one card per row, so each scheme
 * gets the room to draw as a textbook row. Empty or with nothing found, three
 * example searches are offered as chips. `onSearchingChange` tells the page when
 * a query or unit is active, so it can fold its Reference shelf away.
 */

/** "Unit 7 · Addition": where a hit lives, from the one mapping table. */
function whereItLives(r: StagedReaction): string {
  const unitId = unitForFamily(r.family);
  const unit = unitId ? findUnit(unitId) : undefined;
  const lesson = LESSON_TOPICS.find((t) => t.id === sectionForFamily(r.family));
  return [unit ? unitParts(unit).number : null, lesson?.label].filter(Boolean).join(" · ");
}
export function ReactionSearch({
  reactions,
  onOpen,
  autoFocus = false,
  onSearchingChange,
}: {
  reactions: readonly StagedReaction[];
  onOpen: (id: string) => void;
  autoFocus?: boolean;
  onSearchingChange?: (searching: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("");
  // Set the inputs here, and tell the page in the same step (not from an effect,
  // which would render the page once with a stale value first).
  const change = (nextQuery: string, nextUnit: string) => {
    setQuery(nextQuery);
    setUnit(nextUnit);
    onSearchingChange?.(nextQuery.trim() !== "" || nextUnit !== "");
  };

  // Derived on render from the two inputs, not copied into state: nothing has
  // to be kept in sync by hand. useMemo only skips the work when neither changed.
  const found = useMemo(() => searchReactions(reactions, query, unit || null), [reactions, query, unit]);
  const lessons = useMemo(() => searchLessons(query, unit || null), [query, unit]);
  const groups: SidebarGroup[] = useMemo(
    () =>
      LESSON_TOPICS.map((t) => ({
        id: t.id,
        label: t.label,
        items: found.filter((r) => sectionForFamily(r.family) === t.id).map((r) => ({ id: r.id, label: r.name })),
      })).filter((g) => g.items.length > 0),
    [found],
  );
  const total = found.length;
  const searching = query.trim() !== "" || unit !== "";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Find a reaction</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--site-quiet)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => change(e.target.value, unit)}
            // Focus only when the student came here to search (#/reactions sends
            // them here); a keyboard springing up on every visit is rude on a phone.
            autoFocus={autoFocus}
            placeholder="Name, reagent or starting material"
            className="min-h-11 w-full rounded-xl border-2 border-[var(--site-border)] bg-card py-2 pr-3 pl-9 text-base text-foreground outline-none placeholder:text-[var(--site-faint)] focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
          />
        </label>
        <label className="sm:w-64">
          <span className="sr-only">Filter by unit</span>
          <select
            value={unit}
            onChange={(e) => change(query, e.target.value)}
            className="min-h-11 w-full cursor-pointer rounded-xl border-2 border-[var(--site-border)] bg-card px-3 text-base text-foreground focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
          >
            <option value="">Every unit</option>
            {PATHWAY_UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {unitParts(u).number}: {unitParts(u).name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-sm text-[var(--site-quiet)]" aria-live="polite">
        {total === 0 && lessons.length === 0
          ? "Nothing matches that. Try a reagent, or a starting material."
          : [
              lessons.length ? `${plural(lessons.length, "lesson", "lessons")}` : null,
              `${plural(total, "reaction", "reactions")}`,
            ]
              .filter(Boolean)
              .join(", ")}
      </p>
      {(!searching || (total === 0 && lessons.length === 0)) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--site-quiet)]">Try</span>
          {SEARCH_EXAMPLES.map((term) => (
            <button key={term} type="button" className="lrn-chip" onClick={() => change(term, "")}>
              {term}
            </button>
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <ul aria-label="Lessons" className="mt-3 grid gap-3">
          {lessons.map((t) => {
            const home = findUnit(unitsForLesson(t.id)[0] ?? "");
            return (
              <li key={t.id} className="flex">
                <a href={`#/lessons/${t.id}`} className="lrn-tap gap-1 p-4">
                  <span className="lrn-eyebrow">{["Lesson", home ? unitParts(home).number : null].filter(Boolean).join(" · ")}</span>
                  <span className="title-face text-base leading-tight font-extrabold text-[var(--bb-deep)]">{t.label}</span>
                  <span className="text-sm text-[var(--site-quiet)]">{t.title}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {total > 0 && searching && (
        <ul className="mt-3 grid gap-3">
          {found.map((r) => (
            <li key={r.id} className="flex">
              <ReactionCard reaction={r} onOpen={onOpen} context={whereItLives(r)} />
            </li>
          ))}
        </ul>
      )}
      {total > 0 && !searching && (
        <div className="mt-2">
          {/* Browsing: folded to its lesson names, since unfolded, 43 rows
              pushed everything under it off the page. */}
          <LessonSidebar groups={groups} active={null} onSelect={onOpen} label="Reactions" startClosed showPlanned />
        </div>
      )}
    </div>
  );
}
