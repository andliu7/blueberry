import type { Check } from "../../check.ts";
import { curriculumCorpus } from "./corpus.ts";
import { curriculumQuiz } from "./quiz.ts";

/**
 * The curriculum family.
 *
 * One check today, and it is a family rather than a bare export for the reason
 * the conservation and feedback families are: the next things this suite owes
 * packages/curriculum are already named. The placement quiz's time to a
 * recommendation is a Budgets row with no harness yet, and the significant
 * figure and unit handling has a deliberately broken fixture set in
 * BUILD-PROMPT.md Phase 3's exit condition that no check here reads. Both belong
 * beside this one, and an array is where they go.
 */
export const curriculumChecks: readonly Check[] = [curriculumCorpus, curriculumQuiz];
