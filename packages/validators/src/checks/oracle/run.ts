import type { CheckContext, CheckFailure } from "../../check.ts";
import { buildRequest, loadCorpus, type CorpusSequence, type CorpusState, type LoadedCorpus } from "./corpus.ts";
import type { OracleResponse, StateResult } from "./payload.ts";
import { callSidecar } from "./sidecar.ts";

/**
 * One oracle run for the whole suite.
 *
 * The corpus is read and the sidecar is spawned exactly once per process, and all five
 * oracle checks read the same response. See sidecar.ts for why: interpreter startup
 * dominates the cost, and five spawns would make the oracle the slowest thing in the
 * suite for no extra information.
 *
 * The memo is keyed on the fixtures directory so a caller that hands this a different
 * corpus gets a different run rather than the first one's answer. The promise is cached,
 * not the value, so two checks starting at the same time share the one spawn.
 *
 * THERE IS NO PASSING PATH THROUGH A FAILED RUN. `unusable` carries the reason and every
 * check turns it into a failure. Nothing here can return a result that lets a check
 * report pass without the oracle having answered.
 */

export type ResultByRef = ReadonlyMap<string, StateResult>;

export interface OracleData {
  readonly corpus: LoadedCorpus;
  readonly response: OracleResponse;
  readonly resultByRef: ResultByRef;
  readonly interpreter: string;
  readonly durationMs: number;
}

export type OracleRun =
  | { readonly kind: "ready"; readonly data: OracleData }
  | { readonly kind: "unusable"; readonly failures: readonly CheckFailure[] };

/** The fixture path printed when a failure belongs to the oracle plumbing, not a state. */
export const HARNESS_FIXTURE = "packages/validators/python/oracle_sidecar.py";

function harnessFailure(expected: string, actual: string, fixture = HARNESS_FIXTURE): CheckFailure {
  return { expected, actual, fixture };
}

async function performRun(context: CheckContext): Promise<OracleRun> {
  const corpus = await loadCorpus(context.fixtures);

  if (corpus.errors.length > 0) {
    return {
      kind: "unusable",
      failures: corpus.errors.map((error) =>
        harnessFailure(
          "every oracle corpus file matches CONTRACT.md, section Corpus files",
          error,
          "packages/validators/python/CONTRACT.md",
        ),
      ),
    };
  }

  if (corpus.states.length === 0) {
    return {
      kind: "unusable",
      failures: [
        harnessFailure(
          "at least one oracle corpus state",
          `${corpus.files.length} corpus file(s) produced 0 states. An oracle run over an ` +
            `empty corpus grades nothing, and reporting that as a pass is the failure this ` +
            `package exists to prevent`,
          "packages/validators/python/corpus/",
        ),
      ],
    };
  }

  const outcome = await callSidecar(buildRequest(corpus));

  if (outcome.kind === "failed") {
    return {
      kind: "unusable",
      failures: [
        harnessFailure(
          "the RDKit sidecar answers, and its self test passes",
          outcome.summary,
        ),
        // One CheckFailure per evidence line. The report prints expected and actual on
        // their own lines, so a traceback carried in a single `actual` would land as one
        // unwrapped blob. Repeating the real expectation on every line of a traceback
        // reads worse than saying plainly what these lines are.
        ...outcome.detail.map((line) => harnessFailure("(evidence for the failure above)", line)),
      ],
    };
  }

  // Every state sent must come back, exactly once, under the ref it was sent with. A
  // response that quietly drops a state would take that state's checks with it.
  const resultByRef = new Map<string, StateResult>();
  const duplicates: string[] = [];
  const unexpected: string[] = [];
  const sentRefs = new Set(corpus.states.map((state) => state.stateRef));

  for (const result of outcome.response.states) {
    const ref = result.stateRef;
    if (typeof ref !== "string" || !sentRefs.has(ref)) {
      unexpected.push(String(ref));
      continue;
    }
    if (resultByRef.has(ref)) {
      duplicates.push(ref);
      continue;
    }
    resultByRef.set(ref, result);
  }

  const missing = corpus.states
    .map((state) => state.stateRef)
    .filter((ref) => !resultByRef.has(ref));

  const plumbing: CheckFailure[] = [];
  for (const ref of missing) {
    plumbing.push(
      harnessFailure("a result for every state sent", `no result came back for ${ref}`),
    );
  }
  for (const ref of duplicates) {
    plumbing.push(
      harnessFailure("one result per state sent", `two results came back for ${ref}`),
    );
  }
  for (const ref of unexpected) {
    plumbing.push(
      harnessFailure(
        "results only for states that were sent",
        `a result came back under ${JSON.stringify(ref)}, which was never sent`,
      ),
    );
  }
  if (plumbing.length > 0) {
    return { kind: "unusable", failures: plumbing };
  }

  return {
    kind: "ready",
    data: {
      corpus,
      response: outcome.response,
      resultByRef,
      interpreter: outcome.interpreter,
      durationMs: outcome.durationMs,
    },
  };
}

let memo: { readonly key: string; readonly run: Promise<OracleRun> } | null = null;

export function oracleRun(context: CheckContext): Promise<OracleRun> {
  const key = context.fixturesDir;
  if (memo !== null && memo.key === key) return memo.run;
  const run = performRun(context);
  memo = { key, run };
  return run;
}

/** Test seam. Nothing in a check calls this; the gate self test does. */
export function resetOracleRunMemo(): void {
  memo = null;
}

/**
 * The one failure every content check reports when the oracle could not run.
 *
 * Short on purpose. The full diagnostic is printed once, by oracle-harness-ready, and
 * repeating forty lines of traceback under each of four checks buries it.
 */
export function unusableFailure(checkName: string, states: number | null): CheckFailure {
  return {
    expected:
      states === null
        ? "oracle results to check"
        : `oracle results for ${states} corpus state(s)`,
    actual:
      `the oracle did not run, so ${checkName} verified nothing. The reason is printed ` +
      `under oracle-harness-ready above`,
    fixture: HARNESS_FIXTURE,
  };
}

export type { CorpusSequence, CorpusState, LoadedCorpus };
