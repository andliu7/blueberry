import type { Check } from "../../check.ts";
import { mutationScore } from "./score.ts";

/**
 * The mutation family. One check today.
 *
 * It is its own directory rather than a file under budgets/ because the thing it gates is
 * not a size or a payload, it is the strength of the test suite itself, and the next check
 * to land here is the same question asked of packages/curriculum when that exists.
 */
export const mutationChecks: readonly Check[] = [mutationScore];
