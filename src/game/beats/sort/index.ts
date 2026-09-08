/**
 * Sort the cards: what the rest of the app is allowed to see.
 *
 * A barrel, and a deliberately narrow one. The lesson runner needs the view,
 * the four ladders, and the types on the boundary between them. It does not
 * need the board reducer or the hit testing, which are the view's own
 * machinery; the tests import those directly by path, because a test is
 * allowed to know more than a caller.
 *
 * The pKa settings layer is NOT re-exported. It lives in src/settings/pka.ts
 * and that module is the one authority: `sortBeatPkaConflicts` there is the
 * same function the settings page renders its flags from, so the two surfaces
 * cannot disagree about whether a table contradicts a ladder. A second door
 * onto it from here would be a pointer to a pointer.
 */

export { SortBeatView, type SortBeatViewProps } from "./SortBeatView";
export {
  SORT_LADDERS,
  sortContentById,
  sortContentForNode,
  sortContentForProblem,
  type DistractorMeaning,
  type ItemNote,
  type SortContent,
  type TrackEnds,
} from "./ladders";
export { judgeSort, type JudgeContext, type SortJudgement } from "./judge";
