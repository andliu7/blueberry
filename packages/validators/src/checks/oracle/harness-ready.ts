import type { Check, CheckResult, NotMeasurable } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import { CORPUS_SUFFIX } from "./corpus.ts";
import { oracleRun } from "./run.ts";

/**
 * CHECK: the RDKit oracle can run at all.
 *
 * This is the check that makes a missing Python, a missing RDKit, a crashed sidecar, a
 * failed sidecar self test, or an unreadable corpus file loud. It runs first in the
 * family and it carries the full diagnostic, so the other four can report one line each
 * pointing at it instead of printing the same traceback four times.
 *
 * IT NEVER SKIPS. There is no environment in which this check passes without RDKit having
 * answered. CLAUDE.md's Environment section makes Python 3 with RDKit a requirement of the
 * validator suite, and D3 in docs/INHERITED-DECISIONS.md makes RDKit the oracle that
 * grades chem-core. An oracle that cannot run and reports green would mean the suite
 * claims chem-core has been graded against a reference implementation when nothing graded
 * anything, and every downstream number would be false confidence rather than a mistake.
 *
 * On a passing run it prints what it actually measured: which interpreter answered, which
 * RDKit version, how many states went over, and how long the single spawn took. Those are
 * measurements, not estimates, and they are what tells a reader on a green run that the
 * oracle really did execute.
 */

const CHECK_NAME = "oracle-harness-ready";

export const oracleHarnessReady: Check = {
  name: CHECK_NAME,
  description:
    "the RDKit sidecar starts, its self test passes, and every corpus state comes back with a result",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);

    if (run.kind === "unusable") {
      return failed(run.failures);
    }

    const { corpus, response, interpreter, durationMs } = run.data;
    const speciesCount = corpus.states.reduce((total, state) => total + state.species.length, 0);

    const notMeasurable: NotMeasurable[] = [
      {
        property: "oracle run",
        reason:
          `measured, not skipped: interpreter ${interpreter}, RDKit ${response.rdkitVersion}, ` +
          `Python ${response.pythonVersion}, ${response.selfTest.cases.length} self test ` +
          `case(s) passed, ${corpus.states.length} state(s) and ${speciesCount} species ` +
          `analysed from ${corpus.files.length} corpus file(s) in one spawn taking ` +
          `${Math.round(durationMs)} ms`,
      },
    ];

    // An honest statement of what this run did and did not grade. The oracle exists to
    // grade chem-core against a reference implementation, and right now it is grading an
    // authored JSON corpus, because no chem-core fixture has been serialised into one
    // yet. Leaving that unsaid would let a green oracle family be read as "chem-core
    // agrees with RDKit", which this run did not establish.
    const fromFixtures = context.fixtures.filter((file) => file.endsWith(CORPUS_SUFFIX));
    if (fromFixtures.length === 0) {
      notMeasurable.push({
        property: "chem-core output graded against RDKit",
        reason:
          `no file under ${context.fixturesDir} ends ${CORPUS_SUFFIX}, so every state in ` +
          `this run came from the authored corpus under packages/validators/python/corpus/. ` +
          `That pins RDKit's behaviour and the bridge, and it does not compare chem-core's ` +
          `own output against RDKit. serializeState() in payload.ts is the path that closes ` +
          `this once chem-core fixtures exist`,
      });
    }

    return passed({ notMeasurable });
  },
};
