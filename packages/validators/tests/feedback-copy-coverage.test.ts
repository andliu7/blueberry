import { describe, expect, it, vi } from "vitest";

import type { CheckContext } from "../src/check.ts";

/**
 * ADVERSARY FINDING, Phase 1, attack surface 6.
 *
 * feedback-copy-coverage has NO negative control anywhere in fixtures/, and it cannot have
 * one there. `feedbackCopyCoverage.run()` in src/checks/feedback/copy-coverage.ts takes a
 * `CheckContext`, the same shape every other check takes, and never reads `context.fixtures`
 * or `context.fixturesDir` at all: every fact it reports comes from two hardcoded imports,
 * `allCauseIds` / `causeCount` / `causeDefinition` from `@blueberry/chem-core`, and
 * `causeCopy` / `copyCoverage` / `copyIsComplete` / `competingRoutesFor` from
 * `@blueberry/feedback`. A cause with no authored copy would have to exist in one of those
 * two packages, and both are outside this adversary's write scope, which is limited to
 * `packages/validators/fixtures/` and `packages/validators/tests/`. No JSON file placed in
 * fixtures/ can change what `allCauseIds()` or `copyCoverage()` return, because the check
 * never looks there. This is exactly the case the brief anticipated: "if you cannot build a
 * control, say so and explain precisely what would be needed."
 *
 * What WOULD be needed, without leaving the write scope: nothing, because the write scope
 * does not include the two source packages the check actually reads, and widening it is
 * exactly the boundary CLAUDE.md's git discipline section draws around an adversary pass.
 * Reaching into packages/chem-core to add a cause with no copy, or into packages/feedback to
 * delete one, would be modifying implementation code to make a fixture true, which the
 * brief calls sabotage when done to a check and is no better when done to the check's data.
 *
 * WHAT THIS FILE DOES INSTEAD, AND WHY IT IS HONEST WORK RATHER THAN A WORKAROUND. vitest's
 * `vi.mock` intercepts a module specifier for every importer in this one test file's module
 * graph, chem-core included. That is not touching chem-core's source on disk, and it does not
 * need to: it exercises the REAL, UNMODIFIED `feedbackCopyCoverage.run()` from
 * ../src/checks/feedback/copy-coverage.ts, imported dynamically after the mock is registered,
 * against a chem-core whose cause registry has one extra id no copy package could possibly
 * have authored for, because the id is invented in this test and exists nowhere else. This is
 * the same technique the Phase 0 adversary used in stereo-descriptors-bond-kind.test.ts: call
 * the real exported function with synthetic input rather than reimplementing its logic, so a
 * pass here is evidence about the shipped check and not about a copy of it.
 */

const FAKE_CAUSE_ID = "adversary_phase_1_test_only_cause_with_no_authored_copy";

vi.mock("@blueberry/chem-core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const realAllCauseIds = actual.allCauseIds as () => readonly string[];
  const realCauseDefinition = actual.causeDefinition as (id: string) => unknown;

  const fakeDefinition = {
    id: FAKE_CAUSE_ID,
    category: "conservation",
    severity: "blocking",
    appliesTo: ["invalid"],
    summary: "synthetic cause injected by feedback-copy-coverage.test.ts, never real",
    teaches: "synthetic cause injected by feedback-copy-coverage.test.ts, never real",
  };

  return {
    ...actual,
    allCauseIds: () => Object.freeze([...realAllCauseIds(), FAKE_CAUSE_ID]),
    causeCount: () => realAllCauseIds().length + 1,
    causeDefinition: (id: string) => (id === FAKE_CAUSE_ID ? fakeDefinition : realCauseDefinition(id)),
  };
});

const emptyContext: CheckContext = {
  repoRoot: "",
  packageRoot: "",
  fixturesDir: "",
  fixtures: [],
};

describe("feedback-copy-coverage, a check with no negative control reachable from fixtures/", () => {
  it("fails when the chem-core cause registry carries an id packages/feedback never authored copy for", async () => {
    const { feedbackCopyCoverage } = await import("../src/checks/feedback/copy-coverage.ts");

    const result = await feedbackCopyCoverage.run(emptyContext);

    expect(result.status).toBe("fail");
    expect(
      result.failures.some(
        (failure) => failure.expected.includes(FAKE_CAUSE_ID) || failure.actual.includes(FAKE_CAUSE_ID),
      ),
    ).toBe(true);

    const coverageBudget = result.budgets?.find(
      (budget) => budget.name === "named causes with authored Tier 1 copy",
    );
    expect(coverageBudget?.passed).toBe(false);
  });
});
