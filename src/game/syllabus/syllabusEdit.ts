/**
 * The syllabus screen's state (STATUS C1), as a pure reducer the screen runs
 * through useReducer, so every hand adjustment is one testable step:
 *
 *   read           a fresh paste: the matched lines and the plan they make
 *   load           a saved plan, reopened (no lines: there is nothing to re-flag)
 *   resolve        answer a flag: pick a unit, or mark the topic not covered
 *   moveUnit       up or down in the syllabus order
 *   moveSection    up or down inside its unit (what "next up" walks first)
 *   toggleCovered  a unit, a section ("u3/s2") or a lesson in or out
 *   addUnit        put a unit the syllabus did not name onto it
 *   toggleSideQuest  count a side quest on quizzes and exams, or stop
 *   assignWeek     move a unit to another week
 *
 * Resolving a flag rebuilds the plan from the lines but keeps every hand
 * edit made so far: the order the student set, their sections, their not
 * covered marks and side quest switches.
 *
 * Lazy: only the syllabus screen imports this.
 */
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { unitSections } from "../tabs/pathway/testOuts";
import { buildPlan, type Candidate, type MatchedLine } from "./syllabusMatch";
import type { SyllabusPlan } from "./syllabusPlan";

export interface EditState {
  readonly rows: readonly MatchedLine[];
  readonly plan: SyllabusPlan | null;
}

export type EditAction =
  | { readonly type: "read"; readonly rows: readonly MatchedLine[]; readonly now?: number }
  | { readonly type: "load"; readonly plan: SyllabusPlan | null }
  | { readonly type: "resolve"; readonly row: number; readonly topic: number; readonly choice: Candidate | "not-covered" }
  | { readonly type: "moveUnit"; readonly unitId: string; readonly by: -1 | 1 }
  | { readonly type: "moveSection"; readonly unitId: string; readonly section: number; readonly by: -1 | 1 }
  | { readonly type: "toggleCovered"; readonly key: string }
  | { readonly type: "addUnit"; readonly unitId: string }
  | { readonly type: "toggleSideQuest"; readonly nodeId: string }
  | { readonly type: "assignWeek"; readonly unitId: string; readonly week: number | null }
  | { readonly type: "clear" };

export const EMPTY_EDIT: EditState = { rows: [], plan: null };

/** An empty plan, for edits made before anything was pasted. */
function blank(): SyllabusPlan {
  return { version: 1, updatedAt: 0, weeks: [], unitOrder: [], sectionOrder: {}, notCovered: [], sideQuests: [], exams: [] };
}

function swap<T>(list: readonly T[], at: number, by: -1 | 1): readonly T[] {
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[at], next[to]] = [next[to]!, next[at]!];
  return next;
}

function toggle(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

/** `prev`'s order kept, ids no longer in `next` dropped, new ids placed after the id before them in `next`. */
export function mergeOrder(prev: readonly string[], next: readonly string[]): string[] {
  const out = prev.filter((id) => next.includes(id));
  next.forEach((id, at) => {
    if (out.includes(id)) return;
    const before = next.slice(0, at).reverse().find((entry) => out.includes(entry));
    out.splice(before === undefined ? 0 : out.indexOf(before) + 1, 0, id);
  });
  return out;
}

function rebuild(state: EditState, rows: readonly MatchedLine[]): EditState {
  const fresh = buildPlan(rows);
  const old = state.plan;
  if (old === null) return { rows, plan: fresh };
  const derivedSideQuests = new Set(buildPlan(state.rows).sideQuests);
  // Side quests the student switched on by hand stay on; ones they switched off stay off.
  const handOn = old.sideQuests.filter((id) => !derivedSideQuests.has(id));
  const handOff = [...derivedSideQuests].filter((id) => !old.sideQuests.includes(id));
  const unitOrder = mergeOrder(old.unitOrder, fresh.unitOrder);
  return {
    rows,
    plan: {
      ...fresh,
      unitOrder,
      sectionOrder: Object.fromEntries(unitOrder.map((id) => [id, old.sectionOrder[id] ?? fresh.sectionOrder[id] ?? []])),
      notCovered: old.notCovered,
      sideQuests: [...new Set([...fresh.sideQuests.filter((id) => !handOff.includes(id)), ...handOn])],
    },
  };
}

export function syllabusEdit(state: EditState, action: EditAction): EditState {
  if (action.type === "read") return { rows: action.rows, plan: buildPlan(action.rows, action.now) };
  if (action.type === "load") return { rows: [], plan: action.plan };
  if (action.type === "clear") return EMPTY_EDIT;
  if (action.type === "resolve") {
    const rows = state.rows.map((row, at) =>
      at !== action.row ? row : { ...row, matches: row.matches.map((match, i) => (i === action.topic ? { ...match, chosen: action.choice } : match)) },
    );
    return rebuild(state, rows);
  }

  const plan = state.plan ?? blank();
  const next = (change: Partial<SyllabusPlan>): EditState => ({ ...state, plan: { ...plan, ...change } });
  switch (action.type) {
    case "moveUnit":
      return next({ unitOrder: swap(plan.unitOrder, plan.unitOrder.indexOf(action.unitId), action.by) });
    case "moveSection": {
      const unit = PATHWAY_UNITS.find((entry) => entry.id === action.unitId);
      const order = plan.sectionOrder[action.unitId] ?? (unit === undefined ? [] : unitSections(unit).map((section) => section.number));
      return next({ sectionOrder: { ...plan.sectionOrder, [action.unitId]: swap(order, order.indexOf(action.section), action.by) } });
    }
    case "toggleCovered":
      return next({ notCovered: toggle(plan.notCovered, action.key) });
    case "addUnit": {
      if (plan.unitOrder.includes(action.unitId)) return next({ notCovered: plan.notCovered.filter((id) => id !== action.unitId) });
      const unit = PATHWAY_UNITS.find((entry) => entry.id === action.unitId);
      if (unit === undefined) return state;
      return next({
        unitOrder: [...plan.unitOrder, action.unitId],
        sectionOrder: { ...plan.sectionOrder, [action.unitId]: unitSections(unit).map((section) => section.number) },
        notCovered: plan.notCovered.filter((id) => id !== action.unitId),
      });
    }
    case "toggleSideQuest":
      return next({ sideQuests: toggle(plan.sideQuests, action.nodeId) });
    case "assignWeek": {
      const weeks = plan.weeks
        .map((week) => ({ ...week, unitIds: week.unitIds.filter((id) => id !== action.unitId) }))
        .map((week) => (week.week === action.week ? { ...week, unitIds: [...week.unitIds, action.unitId] } : week));
      if (action.week !== null && !weeks.some((week) => week.week === action.week)) weeks.push({ week: action.week, start: null, unitIds: [action.unitId] });
      return next({ weeks: weeks.sort((a, b) => a.week - b.week) });
    }
  }
}
