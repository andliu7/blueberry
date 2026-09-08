import type { BannedRule } from "./banned.ts";
import type { Metafile } from "./bundle.ts";

/**
 * Walking a built module graph.
 *
 * BUILD-PROMPT.md: "An import graph assertion, run against built output rather than
 * source". The reason that phrase is there is that a source scan answers a different
 * question. `grep -r react packages/chem-core/src` finds the word React in the header
 * comment that says there is no React, and misses `import(someComputedName)` and a
 * re-export chain three files deep. The metafile esbuild emits while bundling the real
 * dist/ output is the actual graph the actual bundler actually built, so it agrees with
 * what would ship by construction.
 *
 * Everything here is a pure function over that metafile. No file system, no bundler.
 */

export interface BannedReach {
  readonly rule: BannedRule;
  /** The specifier that tripped the rule, as written in the importing module. */
  readonly specifier: string;
  /**
   * Entry first, banned specifier last. This is the chain printed in the failure, and
   * it is the whole point of the check: "chem-core reaches React" is not actionable,
   * "index.js imports geometry.js imports render-hint.js imports react" is.
   */
  readonly chain: readonly string[];
}

/**
 * npm package name implied by a bundler path, whether it is a bare specifier or a
 * resolved path inside node_modules.
 *
 * Both forms are checked because the two arise from different failure modes. A bare
 * specifier appears when the package was externalized. A node_modules path appears when
 * it was installed and inlined. A rule that only understood one of them would be blind
 * to half the ways the violation can reach the graph.
 */
function candidateSpecifiers(record: { path: string; original?: string }): string[] {
  const candidates: string[] = [];
  if (record.original !== undefined && record.original !== "") candidates.push(record.original);
  candidates.push(record.path);

  const normalized = record.path.split("\\").join("/");
  const marker = "node_modules/";
  const lastIndex = normalized.lastIndexOf(marker);
  if (lastIndex >= 0) candidates.push(normalized.slice(lastIndex + marker.length));

  return candidates;
}

function firstMatchingRule(
  rules: readonly BannedRule[],
  candidates: readonly string[],
): { rule: BannedRule; specifier: string } | null {
  for (const rule of rules) {
    for (const candidate of candidates) {
      if (rule.matches(candidate)) return { rule, specifier: candidate };
    }
  }
  return null;
}

/**
 * Every input reachable from the entry, by breadth first search over the metafile.
 *
 * Used for the coverage assertion: a .js file sitting in dist/ that this walk never
 * visits is a module the purity gate did not inspect, and a gate with an unstated blind
 * spot is worse than a gate with a stated one.
 */
export function reachableInputs(
  metafile: Metafile,
  entryInput: string,
  followEdge: (kind: string) => boolean = () => true,
): Set<string> {
  const seen = new Set<string>([entryInput]);
  const queue: string[] = [entryInput];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    const input = metafile.inputs[current];
    if (input === undefined) continue;
    for (const record of input.imports) {
      if (!followEdge(record.kind)) continue;
      if (record.external === true) continue;
      if (metafile.inputs[record.path] === undefined) continue;
      if (seen.has(record.path)) continue;
      seen.add(record.path);
      queue.push(record.path);
    }
  }

  return seen;
}

/**
 * Shortest import chain from the entry to each distinct banned package it reaches.
 *
 * Breadth first, so the chain printed is the shortest one, which is the one a human can
 * actually go and delete. One result per banned package rather than per import site: a
 * package pulled in from six files is one architectural mistake, and printing it six
 * times buries the other five findings.
 */
export function findBannedReach(
  metafile: Metafile,
  entryInput: string,
  rules: readonly BannedRule[],
  followEdge: (kind: string) => boolean = () => true,
): BannedReach[] {
  const parents = new Map<string, string>();
  const seen = new Set<string>([entryInput]);
  const queue: string[] = [entryInput];
  const found = new Map<string, BannedReach>();

  const chainTo = (node: string): string[] => {
    const chain: string[] = [node];
    let cursor: string | undefined = parents.get(node);
    while (cursor !== undefined) {
      chain.push(cursor);
      cursor = parents.get(cursor);
    }
    return chain.reverse();
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    const input = metafile.inputs[current];
    if (input === undefined) continue;

    for (const record of input.imports) {
      // Filtered first, so a banned package behind a filtered edge is neither reported
      // nor traversed. For the game route that is the point: a dynamic import of
      // ketcher-standalone is the required architecture and must not be a finding.
      if (!followEdge(record.kind)) continue;

      const candidates = candidateSpecifiers(record);
      const match = firstMatchingRule(rules, candidates);

      if (match !== null) {
        if (!found.has(match.rule.name)) {
          found.set(match.rule.name, {
            rule: match.rule,
            specifier: match.specifier,
            chain: [...chainTo(current), match.specifier],
          });
        }
        continue;
      }

      if (record.external === true) continue;
      if (metafile.inputs[record.path] === undefined) continue;
      if (seen.has(record.path)) continue;
      seen.add(record.path);
      parents.set(record.path, current);
      queue.push(record.path);
    }
  }

  return [...found.values()];
}

/** Render a chain the way it is printed in a failure. */
export function formatChain(chain: readonly string[]): string {
  return chain.join(" -> ");
}

/**
 * Edge filters.
 *
 * The two gates in this directory need different answers to the same question, and the
 * difference is the whole Ketcher rule.
 *
 * chem-core follows every edge. A dynamic `import("react")` inside the engine is still
 * React inside the engine; laziness does not make it pure.
 *
 * The game route follows static edges only. CLAUDE.md: "Ketcher route: lazy only. Must
 * never be reachable from the game route's initial chunk." Reaching ketcher-standalone
 * through a dynamic import is the required architecture, not a violation. Reaching it
 * through a static import is 15.5 MB in front of every student. A gate that could not
 * tell those apart would either forbid the editor entirely or permit the failure it
 * exists to catch.
 */
export function followEveryEdge(): boolean {
  return true;
}

export function followStaticEdgesOnly(kind: string): boolean {
  return kind !== "dynamic-import";
}
