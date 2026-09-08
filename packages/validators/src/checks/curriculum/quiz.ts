import type { Check, CheckFailure, CheckResult, NotMeasurable } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { BudgetResult } from "../../check.ts";

/**
 * CHECK: the placement quiz reaches a recommendation inside its budgets, and
 * does so deterministically.
 *
 * The Budgets row is under 3 minutes to a course recommendation. Nothing here
 * invents that number: the quiz machine's own bound (elapsed plus a per kind
 * reserve against 180 seconds, and a hard cap of QUESTION_CAP questions) is
 * exercised by a fleet of simulated students running through the REAL machine
 * with the REAL corpus and REAL grading. The walk is a fact; only the seconds
 * are a model, WORST_CASE_SECONDS_BY_KIND, chosen to err high, and this check
 * says so in its own output rather than letting the number read as measured.
 *
 * Determinism is asserted by running the same seeded student twice and
 * comparing paths. A quiz that walks differently on a re-run cannot be
 * debugged, cannot be replayed from an attempt log, and cannot be trusted to
 * place two identical students identically.
 */

const CHECK_NAME = "curriculum-quiz";

export const curriculumQuiz: Check = {
  name: CHECK_NAME,
  description:
    "the placement quiz reaches a recommendation for every simulated student inside the question cap and the modelled 180 second budget, deterministically, on the real corpus",

  async run(): Promise<CheckResult> {
    const failures: CheckFailure[] = [];

    let curriculum: typeof import("@blueberry/curriculum");
    try {
      curriculum = await import("@blueberry/curriculum");
    } catch (error) {
      return failed([
        {
          expected: "the curriculum package to import so the quiz can run",
          actual: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          fixture: "packages/curriculum",
        },
      ]);
    }

    const {
      ALL_COURSE_IDS,
      SEED_CORPUS,
      simulateFleet,
      simulateStudent,
      topicCount,
      QUESTION_CAP,
      TIME_BUDGET_SECONDS,
      WORST_CASE_SECONDS_BY_KIND,
    } = curriculum;

    // Every claimed course plus the no-claim default, because the walk differs
    // per course and a budget met on one is not a budget met on all. DERIVED
    // from the registry, never written out here: an adversary pass proved that
    // a hardcoded copy of this list silently omitted "dat" and "mcat", and the
    // broken walks behind both claims were invisible to this check by
    // construction. A course added to CourseId is in this fleet the moment it
    // exists.
    const courses: readonly (import("@blueberry/curriculum").CourseId | null)[] = [
      ...ALL_COURSE_IDS,
      null,
    ];
    let worstQuestions = 0;
    let worstSeconds = 0;
    const unprobeable = new Set<string>();

    for (const course of courses) {
      const fleet = simulateFleet(SEED_CORPUS, course as never);
      worstQuestions = Math.max(worstQuestions, fleet.worstQuestions);
      worstSeconds = Math.max(worstSeconds, fleet.worstModelledSeconds);
      if (!fleet.allFinished) {
        failures.push({
          expected: `every simulated student claiming ${course ?? "no course"} to reach a recommendation`,
          actual: "at least one walk did not finish",
          fixture: "packages/curriculum/src/quiz/machine.ts",
        });
      }
      for (const result of fleet.results) {
        for (const topic of result.unprobeable) unprobeable.add(topic);
      }
    }

    if (worstQuestions > QUESTION_CAP) {
      failures.push({
        expected: `no walk to exceed the ${QUESTION_CAP} question cap`,
        actual: `${worstQuestions} questions`,
        fixture: "packages/curriculum/src/quiz/machine.ts",
      });
    }
    if (worstSeconds >= TIME_BUDGET_SECONDS) {
      failures.push({
        expected: `worst modelled walk under the ${TIME_BUDGET_SECONDS} second budget`,
        actual: `${worstSeconds} modelled seconds`,
        fixture: "packages/curriculum/src/quiz/machine.ts",
      });
    }

    // Determinism: same seed, same student, same path, asserted by running twice.
    const first = simulateStudent({ problems: SEED_CORPUS, claimedCourse: "gen_chem_1" }, { kind: "mixed", seed: 20260821 });
    const second = simulateStudent({ problems: SEED_CORPUS, claimedCourse: "gen_chem_1" }, { kind: "mixed", seed: 20260821 });
    if (JSON.stringify(first.path) !== JSON.stringify(second.path)) {
      failures.push({
        expected: "the same seeded student to walk the same path twice",
        actual: `first ${first.path.join(",")} against second ${second.path.join(",")}`,
        fixture: "packages/curriculum/src/quiz/simulate.ts",
      });
    }

    if (failures.length > 0) return failed(failures);

    const budgets: BudgetResult[] = [
      {
        name: "placement quiz, worst case questions to a recommendation",
        measured: `${worstQuestions} question(s) across every course and the no-claim default`,
        ceiling: `${QUESTION_CAP} questions`,
        passed: true,
      },
      {
        name: "placement quiz, worst case modelled seconds to a recommendation",
        measured: `${worstSeconds} second(s) under the stated per kind model`,
        ceiling: `${TIME_BUDGET_SECONDS} seconds`,
        passed: true,
      },
    ];

    const notMeasurable: NotMeasurable[] = [
      {
        property: "real student time to a recommendation",
        reason:
          `the seconds above are a MODEL, per kind worst cases of ${Object.entries(WORST_CASE_SECONDS_BY_KIND)
            .map(([kind, seconds]) => `${kind} ${seconds}s`)
            .join(", ")}, chosen to err high. The walk and question counts are facts from the real ` +
          "machine and corpus; the timing becomes a measurement when real attempts exist, Phases 5 and 6.",
      },
      {
        property: "placement accuracy",
        reason:
          "this check proves the quiz terminates inside its budgets and walks deterministically. " +
          "Whether it places students CORRECTLY is judged against real outcomes, which do not exist yet.",
      },
      {
        property: "quiz coverage of the topic registry",
        reason:
          `${unprobeable.size} topic(s) wanted by some walk carried no quiz eligible problem, a corpus ` +
          `thinness fact, not a machine defect: the corpus is ${SEED_CORPUS.length} problems against a ` +
          `${topicCount()} topic registry. Authoring waves close this; padding with fake problems would hide it.`,
      },
    ];

    return passed({ budgets, notMeasurable });
  },
};
