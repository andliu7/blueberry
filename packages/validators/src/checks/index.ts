import type { Check } from "../check.ts";
import { harnessSelfTest } from "./harness-self-test.ts";
import { conservationChecks } from "./conservation/index.ts";
import { budgetChecks } from "./budgets/index.ts";
import { oracleChecks } from "./oracle/index.ts";
import { feedbackChecks } from "./feedback/index.ts";
import { curriculumChecks } from "./curriculum/index.ts";
import { mutationChecks } from "./mutation/index.ts";

/**
 * The check registry.
 *
 * This array is the whole registration mechanism. Adding a check is one import and one
 * array entry here. src/cli.ts is not touched, and there is no side effect registration,
 * no decorator, and no directory scan, so the set of checks that will run is readable in
 * one screen and the order is the order written.
 *
 * Do not add a check that cannot fail. An entry here that always returns pass raises the
 * check count in the report while verifying nothing, which is the exact false confidence
 * the suite exists to prevent.
 */
export const checks: readonly Check[] = [
  harnessSelfTest,
  ...conservationChecks,
  ...budgetChecks,
  ...oracleChecks,
  ...feedbackChecks,
  ...curriculumChecks,
  ...mutationChecks,
];
