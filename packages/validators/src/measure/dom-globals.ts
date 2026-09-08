import { DOM_GLOBALS } from "./banned.ts";

/**
 * The "no DOM" half of the chem-core purity rule.
 *
 * The import graph catches `import ... from "react"`. It cannot catch
 * `document.createElement`, because the DOM is not a package: it is a set of host
 * globals with no import statement to find. So this is a token scan, and it is honest
 * about being one.
 *
 * It runs on the minified bundle rather than on source. Two reasons, and the first one
 * is not cosmetic:
 *
 *   1. Source is full of prose. chem-core's own index.ts header contains the words
 *      "no DOM" and "No React". A scan over source text reports the file that documents
 *      the rule as the file that breaks it. Minification strips comments, so the only
 *      remaining occurrences of these identifiers are ones the code actually evaluates.
 *   2. BUILD-PROMPT.md asks for built output, not source text.
 *
 * Stated blind spots, so nobody has to discover them:
 *   - `globalThis["docu" + "ment"]` is not caught. Nothing short of running the module
 *     would catch it, and that is not what this gate is.
 *   - A string literal containing the word `window` is a false positive. If that ever
 *     fires, it is reported and someone renames the string. It is not a reason to
 *     weaken the scan, per the non-negotiable in CLAUDE.md.
 */

export interface DomGlobalHit {
  readonly identifier: string;
  readonly occurrences: number;
  /** A short window of surrounding minified code, so the hit can be located. */
  readonly excerpt: string;
}

export function findDomGlobals(minifiedCode: string): DomGlobalHit[] {
  const hits: DomGlobalHit[] = [];

  for (const identifier of DOM_GLOBALS) {
    // Word boundaries only. `windowSize` and `myDocument` are not hits, and a property
    // access like `.document` is, because a bundler cannot rename a host global.
    const pattern = new RegExp(`\\b${identifier}\\b`, "g");
    const matches = [...minifiedCode.matchAll(pattern)];
    if (matches.length === 0) continue;

    const first = matches[0];
    const at = first?.index ?? 0;
    hits.push({
      identifier,
      occurrences: matches.length,
      excerpt: minifiedCode.slice(Math.max(0, at - 40), at + 60).split("\n").join(" "),
    });
  }

  return hits;
}
