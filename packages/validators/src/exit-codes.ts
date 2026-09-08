/**
 * Process exit codes. Stable, because an orchestrator branches on them.
 *
 * The distinction that matters is 1 against 2. Exit 1 means the suite ran and something
 * it checked was wrong. Exit 2 means the suite refused to run because it could not trust
 * itself, and no result was produced at all. Collapsing those into one code loses the
 * difference between "the code under test is broken" and "the evidence is inadmissible".
 */
export const EXIT_OK = 0;
export const EXIT_CHECK_FAILED = 1;
export const EXIT_SUITE_MODIFIED = 2;
export const EXIT_HARNESS_ERROR = 3;
