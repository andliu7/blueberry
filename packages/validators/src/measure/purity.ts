import type { BannedRule } from "./banned.ts";
import { bundleForMeasurement, type BundleOutcome } from "./bundle.ts";
import { findDomGlobals, type DomGlobalHit } from "./dom-globals.ts";
import { findBannedReach, formatChain, reachableInputs, type BannedReach } from "./import-graph.ts";

/**
 * The purity analysis, as one function over one built entry point.
 *
 * It is here rather than inside the check so that two callers can run it: the real gate
 * against packages/chem-core/dist, and the self test against the deliberately impure
 * build committed under checks/budgets/impure-build-fixture. BUILD-PROMPT.md names that
 * second one as a required Phase 0 broken fixture, "a chem-core build that transitively
 * reaches React, so the purity gate is shown to fire", and a gate that has never been
 * seen to fire is not a gate.
 *
 * Three findings, deliberately separate, because they fail for different reasons and a
 * reader needs to know which:
 *
 *   importViolations  A banned package is reachable in the built graph, with the chain.
 *   domGlobals        A DOM host global is evaluated in the bundled code.
 *   uninspected       A built module that exists on disk and that the walk never
 *                     reached. Not a violation by itself. It is the gate declaring its
 *                     own blind spot, because a module outside the graph is a module
 *                     whose imports were not examined, and an unstated blind spot is how
 *                     a gate ends up green while the thing it guards is broken.
 */

export interface PurityFindings {
  readonly entryInput: string;
  readonly importViolations: readonly BannedReach[];
  readonly domGlobals: readonly DomGlobalHit[];
  readonly uninspected: readonly string[];
  /** Every input the walk actually reached, sorted. Repo relative. */
  readonly reachedModules: readonly string[];
  readonly modulesInspected: number;
  readonly bundleBytes: number;
  readonly gzipBytes: number;
}

export type PurityOutcome =
  | { readonly kind: "analysed"; readonly findings: PurityFindings }
  | { readonly kind: "bundler-absent"; readonly detail: string }
  | { readonly kind: "build-failed"; readonly messages: readonly string[] };

export interface PurityRequest {
  readonly entryPointAbsolute: string;
  readonly external: readonly string[];
  readonly rules: readonly BannedRule[];
  /**
   * Every built module that ought to be covered, repo relative. The walk's reachable set
   * is subtracted from this to produce `uninspected`. Pass an empty array when coverage
   * is not meaningful for the subject.
   */
  readonly expectedModules: readonly string[];
  /** A prepared bundle, when the caller has already paid for one. */
  readonly preBundled?: BundleOutcome;
  /**
   * Which graph edges count. Defaults to all of them, which is the chem-core answer: a
   * dynamic import of React is still React in the engine. See import-graph.ts.
   */
  readonly followEdge?: (kind: string) => boolean;
}

export async function analysePurity(request: PurityRequest): Promise<PurityOutcome> {
  const outcome =
    request.preBundled ??
    (await bundleForMeasurement({
      entryPointAbsolute: request.entryPointAbsolute,
      external: request.external,
    }));

  if (outcome.kind === "bundler-absent") return { kind: "bundler-absent", detail: outcome.detail };
  if (outcome.kind === "build-failed") return { kind: "build-failed", messages: outcome.messages };

  const followEdge = request.followEdge ?? ((): boolean => true);
  const reachable = reachableInputs(outcome.metafile, outcome.entryInput, followEdge);
  const uninspected = request.expectedModules.filter((module) => !reachable.has(module)).sort();

  return {
    kind: "analysed",
    findings: {
      entryInput: outcome.entryInput,
      importViolations: findBannedReach(
        outcome.metafile,
        outcome.entryInput,
        request.rules,
        followEdge,
      ),
      domGlobals: findDomGlobals(outcome.code),
      uninspected,
      reachedModules: [...reachable].sort(),
      modulesInspected: reachable.size,
      bundleBytes: outcome.rawBytes,
      gzipBytes: outcome.gzipBytes,
    },
  };
}

/** True when nothing at all was found. Used by the self test's negative assertion. */
export function isPure(findings: PurityFindings): boolean {
  return (
    findings.importViolations.length === 0 &&
    findings.domGlobals.length === 0 &&
    findings.uninspected.length === 0
  );
}

export { formatChain };
