import type { Check, CheckFailure, CheckResult, NotMeasurable } from "../../check.ts";
import { failed, passed } from "../../check.ts";

/**
 * The authored curriculum corpus, counted on every validator run.
 *
 * WHY THIS CHECK EXISTS.
 *
 * BUILD-PROMPT.md Phase 3's exit condition asks for two numbers by name:
 * "answer checking correct on an authored corpus with fixture count reported"
 * and "Percentage of authored problems carrying at least one Tier 2 distractor
 * reported as a number". Both were true before this file and neither was
 * VISIBLE: they were printed by `npm test -w packages/curriculum` and by nothing
 * else, so a validator run could report SUITE: pass while saying nothing at all
 * about the half of the product that is not mechanisms.
 *
 * feedback-named-causes already says so in its own words. Its notMeasurable
 * entry reads: "packages/curriculum now exists and carries authored distractors,
 * but no check in this suite reads its corpus yet". This is that check, and that
 * entry is updated alongside it.
 *
 * WHAT IT ACTUALLY VERIFIES, AS OPPOSED TO WHAT IT REPORTS.
 *
 * `createProblem` and `createReaction` refuse a defective row at construction
 * time, and the corpus modules call them at module scope. So IMPORTING
 * @blueberry/curriculum runs every one of those refusals over every authored
 * row. That is the strongest thing this check does and it is worth being plain
 * about the mechanism: the check proves the corpus IMPORTS, and the import is
 * what proves the corpus is sound. A corpus that fails to import is a failing
 * check here, and the message carries the constructor's own text, which names
 * the offending problem or reaction id.
 *
 * On top of that the check re-runs two of those properties itself rather than
 * trusting the import:
 *
 *   every distractor grades WRONG through the real checker
 *   no two distractors on one problem sit at the same point in answer space
 *
 * Both are already enforced by `createProblem`. Re-running them here is not
 * redundancy for its own sake: it means that if a future refactor ever moves a
 * refusal out of the constructor and into a test, this suite still reports the
 * property rather than silently losing it. The cost is one pass over 16
 * problems.
 *
 * WHY THE SUBJECT IS ALLOWED TO BE ITS OWN GRADER, STATED RATHER THAN HIDDEN.
 *
 * `checkAnswer` comes from the same package as the corpus it is grading here.
 * That is the same exposure the conservation family already carries against
 * chem-core, and it is recorded in integrity.ts under the chem-core
 * declaration: a check that reads the subject as a VOCABULARY is a narrower
 * exposure than one that reads it as an ANSWER KEY. Nothing in this file
 * compares an authored row against an independent reference. What it says is
 * that the corpus and its checker are CONSISTENT with each other, plus a set of
 * counts. It cannot say the chemistry is right, and it does not claim to. The
 * RDKit oracle is the only thing in this suite that grades chemistry against an
 * outside implementation, and it does not reach this package.
 *
 * WHY THE FLOORS ARE WHERE THEY ARE.
 *
 * Every ceiling below is copied from a bar that already exists somewhere in the
 * repository, never invented here:
 *
 *   100 percent distractor coverage   packages/curriculum/test/corpus.test.ts
 *                                     asserts `coverage.withNone` is empty and
 *                                     the percentage is 100. That is the
 *                                     committed invariant, so the validator
 *                                     reports it against the same bar rather
 *                                     than a softer one.
 *   two distractors per problem       the same file's
 *                                     `distractorsTotal >= problems * 2`.
 *   all five answer kinds exercised   `ANSWER_KINDS` from the package, and that
 *                                     file's "exercises every answer kind this
 *                                     package owns".
 *   fifteen problems                  that file's own floor, written as a lower
 *                                     bound for the reason its header gives: an
 *                                     exact count is a line somebody edits down
 *                                     when the corpus shrinks.
 *   forty reaction rows               the wave two seed target for the reaction
 *                                     database, and the same non decreasing
 *                                     argument as the fixture count in cli.ts.
 */

const MINIMUM_PROBLEMS = 15;
const REQUIRED_DISTRACTOR_COVERAGE_PERCENT = 100;
const MINIMUM_DISTRACTORS_PER_PROBLEM = 2;
const MINIMUM_REACTION_ROWS = 40;

/** The package path, written once so the failure messages agree with each other. */
const CORPUS_PATH = "packages/curriculum/src/corpus/";
const REACTIONS_PATH = "packages/curriculum/src/reactions/";

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

/**
 * A missing build is a different sentence from a defective corpus.
 *
 * @blueberry/curriculum resolves to its dist/, so a repository that has never
 * been built produces ERR_MODULE_NOT_FOUND, which is a tooling state and not an
 * authoring defect. Reporting the two the same way would send a reader looking
 * for a broken problem that does not exist.
 */
function isMissingBuild(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export const curriculumCorpus: Check = {
  name: "curriculum-corpus",
  description:
    "the authored curriculum corpus imports, every distractor grades wrong and sits at its own point in answer space, and the problem count, Tier 2 distractor coverage percentage, per answer kind coverage and reaction table size are reported as numbers",

  async run(): Promise<CheckResult> {
    const failures: CheckFailure[] = [];
    // Counted separately from `failures`, because the soundness budget row below is a
    // statement about distractors and folding a reaction count shortfall into it would
    // print a percentage that is about something else.
    let soundnessFailures = 0;

    // The import IS the soundness assertion. Everything createProblem and
    // createReaction refuse runs here, at module scope, before any of the code
    // below executes.
    let curriculum: typeof import("@blueberry/curriculum");
    try {
      curriculum = await import("@blueberry/curriculum");
    } catch (error) {
      const detail = describeError(error);
      return failed([
        {
          expected:
            "the authored curriculum corpus to import, which is what runs createProblem and " +
            "createReaction over every authored row",
          actual: isMissingBuild(error)
            ? `${detail}. packages/curriculum/dist is missing, so this is a build state and not ` +
              `an authoring defect. Run npm run build before the suite.`
            : `${detail}. The constructor names the offending id in that message; nothing else ` +
              `in the corpus was examined, because the module never finished loading.`,
          fixture: CORPUS_PATH,
        },
      ]);
    }

    const {
      ANSWER_KINDS,
      SEED_CORPUS,
      REACTIONS,
      checkAnswer,
      distractorCoverage,
      reactionCoverage,
      statesMatch,
      topicDefinition,
    } = curriculum;

    const coverage = distractorCoverage(SEED_CORPUS);

    if (SEED_CORPUS.length === 0) {
      return failed([
        {
          expected: "at least one authored problem, so the numbers below mean something",
          actual: "the corpus imported and is empty, which would report 0 percent of 0 as a pass",
          fixture: CORPUS_PATH,
        },
      ]);
    }

    // Soundness, re-run rather than assumed. See the header for why.
    for (const problem of SEED_CORPUS) {
      for (const distractor of problem.distractors) {
        const verdict = checkAnswer(problem.answer, distractor.state);
        if (verdict.outcome !== "wrong") {
          soundnessFailures += 1;
          failures.push({
            expected: `distractor ${distractor.id} to grade wrong through the real checker`,
            actual:
              `it graded "${verdict.outcome}". A predicted wrong answer the checker does not ` +
              `mark wrong is either a second correct answer the author did not mean, or a bug in ` +
              `the ${problem.answer.kind} checker. Both need a person.`,
            fixture: `${CORPUS_PATH} ${problem.id}`,
          });
        }
      }

      for (let i = 0; i < problem.distractors.length; i += 1) {
        for (let j = i + 1; j < problem.distractors.length; j += 1) {
          const left = problem.distractors[i];
          const right = problem.distractors[j];
          if (left === undefined || right === undefined) continue;
          if (statesMatch(problem.answer, left.state, right.state, left.tolerance)) {
            soundnessFailures += 1;
            failures.push({
              expected: `distractors ${left.id} and ${right.id} to sit at different points in answer space`,
              actual:
                "they match each other, so which authored explanation a student sees depends on " +
                "the order they happen to be written in",
              fixture: `${CORPUS_PATH} ${problem.id}`,
            });
          }
        }
      }

      // A problem filed on a topic outside the 46 topic registry is invisible to
      // the pathway and to mastery, so its distractors teach nobody.
      try {
        topicDefinition(problem.topic);
      } catch (error) {
        soundnessFailures += 1;
        failures.push({
          expected: `problem ${problem.id} to be filed on a topic in the pathway graph`,
          actual: describeError(error),
          fixture: `${CORPUS_PATH} ${problem.id}`,
        });
      }
    }

    if (coverage.withNone.length > 0) {
      failures.push({
        expected: `every authored problem to carry at least one Tier 2 distractor`,
        actual:
          `${coverage.withNone.length} carry none: ${coverage.withNone.join(", ")}. Every wrong ` +
          `attempt on those problems falls straight through to Tier 3, which is the tail the ` +
          `AI budget in CLAUDE.md is a ceiling on.`,
        fixture: CORPUS_PATH,
      });
    }

    const kindCounts = new Map<string, { problems: number; distractors: number }>();
    for (const kind of ANSWER_KINDS) kindCounts.set(kind, { problems: 0, distractors: 0 });
    for (const problem of SEED_CORPUS) {
      const entry = kindCounts.get(problem.answer.kind);
      if (entry === undefined) {
        failures.push({
          expected: `problem ${problem.id} to use one of the ${ANSWER_KINDS.length} answer kinds this package owns`,
          actual: `it uses "${problem.answer.kind}", which is not one of them`,
          fixture: `${CORPUS_PATH} ${problem.id}`,
        });
        continue;
      }
      entry.problems += 1;
      entry.distractors += problem.distractors.length;
    }

    const unexercised = [...kindCounts]
      .filter(([, entry]) => entry.problems === 0)
      .map(([kind]) => kind);
    if (unexercised.length > 0) {
      failures.push({
        expected: `every answer kind the package owns to be exercised by at least one authored problem`,
        actual:
          `${unexercised.join(", ")} ${unexercised.length === 1 ? "has" : "have"} no authored ` +
          `problem, so ${unexercised.length === 1 ? "that checker has" : "those checkers have"} ` +
          `never been pointed at real chemistry`,
        fixture: CORPUS_PATH,
      });
    }

    const reactions = reactionCoverage(REACTIONS);
    if (reactions.reactions < MINIMUM_REACTION_ROWS) {
      failures.push({
        expected: `at least ${MINIMUM_REACTION_ROWS} rows in the reaction table`,
        actual:
          `${reactions.reactions}. CLAUDE.md makes reaction search a product surface, and a table ` +
          `that shrinks below the seed is a table a student searches and does not find their ` +
          `reaction in.`,
        fixture: REACTIONS_PATH,
      });
    }

    const distractorsPerProblem = coverage.distractorsTotal / coverage.problems;
    if (coverage.problems < MINIMUM_PROBLEMS) {
      failures.push({
        expected: `at least ${MINIMUM_PROBLEMS} authored problems`,
        actual: `${coverage.problems}`,
        fixture: CORPUS_PATH,
      });
    }
    if (distractorsPerProblem < MINIMUM_DISTRACTORS_PER_PROBLEM) {
      failures.push({
        expected: `at least ${MINIMUM_DISTRACTORS_PER_PROBLEM} distractors per problem on average`,
        actual: `${distractorsPerProblem.toFixed(2)}`,
        fixture: CORPUS_PATH,
      });
    }

    const kindLine = [...kindCounts]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, entry]) => `${kind} ${entry.problems}p/${entry.distractors}d`)
      .join(", ");

    const topics = new Set(SEED_CORPUS.map((problem) => problem.topic));
    const courses = new Set(SEED_CORPUS.map((problem) => problem.course));

    const budgets = [
      {
        name: "authored curriculum problems",
        measured: `${coverage.problems} problems across ${topics.size} topic(s) and ${courses.size} course(s)`,
        ceiling: `at least ${MINIMUM_PROBLEMS}`,
        passed: coverage.problems >= MINIMUM_PROBLEMS,
      },
      {
        name: "problems carrying at least one Tier 2 distractor",
        measured:
          `${coverage.percentWithAtLeastOne.toFixed(1)} percent ` +
          `(${coverage.withAtLeastOne} of ${coverage.problems})`,
        ceiling: `${REQUIRED_DISTRACTOR_COVERAGE_PERCENT} percent`,
        passed: coverage.percentWithAtLeastOne >= REQUIRED_DISTRACTOR_COVERAGE_PERCENT,
      },
      {
        name: "authored Tier 2 distractors",
        measured: `${coverage.distractorsTotal} total, ${distractorsPerProblem.toFixed(2)} per problem`,
        ceiling: `at least ${MINIMUM_DISTRACTORS_PER_PROBLEM} per problem`,
        passed: distractorsPerProblem >= MINIMUM_DISTRACTORS_PER_PROBLEM,
      },
      {
        name: "answer kinds exercised by the corpus",
        measured: `${ANSWER_KINDS.length - unexercised.length} of ${ANSWER_KINDS.length} (${kindLine})`,
        ceiling: `all ${ANSWER_KINDS.length}`,
        passed: unexercised.length === 0,
      },
      {
        name: "corpus soundness, re-run over the authored data",
        measured:
          `${coverage.distractorsTotal} distractor(s) graded wrong, ` +
          `${percent(coverage.distractorsTotal - soundnessFailures, coverage.distractorsTotal).toFixed(1)} ` +
          `percent clean, and no two distractors on one problem share a point`,
        ceiling: "every distractor grades wrong and every pair is distinct",
        passed: soundnessFailures === 0,
      },
      {
        name: "reaction table rows, searchable by reagent, class and name",
        measured:
          `${reactions.reactions} rows over ${Object.keys(reactions.byTopic).length} topic(s), ` +
          `by act ${Object.entries(reactions.byAct)
            .map(([act, count]) => `${act} ${count}`)
            .join(", ")}`,
        ceiling: `at least ${MINIMUM_REACTION_ROWS}`,
        passed: reactions.reactions >= MINIMUM_REACTION_ROWS,
      },
    ];

    const notMeasurable: NotMeasurable[] = [
      {
        property: "whether the authored chemistry is correct",
        reason:
          "This check grades the corpus with the corpus's own checker, so it reports that the two " +
          "agree and that the counts are what they are. It cannot tell a right answer from a " +
          "confidently wrong one. The RDKit oracle is the only part of this suite that grades " +
          "chemistry against an outside implementation and it does not reach packages/curriculum. " +
          "Authored content is a human review gate per CLAUDE.md.",
      },
      {
        property: "the Tier 2 resolution rate on attempts from outside the corpus",
        reason:
          "Every input the corpus tests are run against is a distractor an author wrote, so a 100 " +
          "percent match rate is a corpus invariant and not a field measurement. The Budgets row " +
          "for wrong attempts resolved without a model call needs attempts arriving from real " +
          "students, which is Phase 5's shell and Phase 6's attempt history. The number above is " +
          "COVERAGE, meaning how many problems could resolve at Tier 2 at all, which is a " +
          "different and weaker claim.",
      },
      {
        property: "whether the reaction table's coverage is enough for a real exam",
        reason:
          `${reactions.topicsWithNoRows.length} of the topics in the pathway registry carry no ` +
          "reaction row. Most are empty on purpose in this wave: the seed targets the Act 1 and " +
          "Act 2 vocabulary of docs/COURSE-OUTLINE-ORGO2.md plus the rows its near miss pairs " +
          "need. Act 3's enolate block, which the outline measures at roughly 54 points of the " +
          "Act 3 exam, and every General Chemistry topic are genuinely absent. A row count says " +
          "nothing about whether the right rows are present.",
      },
    ];

    if (failures.length > 0) return failed(failures, { budgets, notMeasurable });
    return passed({ budgets, notMeasurable });
  },
};
