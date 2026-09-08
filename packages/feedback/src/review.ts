/**
 * Rendering the whole copy set as Markdown, for human review.
 *
 * The brief for this package says copy is data and a reviewer has to be able to
 * read all of it without reading TypeScript. The data lives in
 * `src/copy/*.ts` because that is what gives the compile time guarantee that
 * every cause is covered, and losing that guarantee to gain a JSON file is a bad
 * trade. So this renderer is the other half: `npm run review -w
 * @blueberry/feedback` prints every entry as Markdown, grouped by category, with
 * severity and the competing pathways shown.
 *
 * It writes to stdout rather than to a committed file on purpose. A generated
 * document checked in next to its source drifts the first time somebody edits
 * one and not the other, and then the reviewed copy and the served copy are two
 * different things.
 *
 * The renderer throws if any authored entry failed to appear in a section. That
 * is a real risk here, since the section list below is written out by hand, and
 * a category added to chem-core would otherwise silently drop its causes out of
 * the review document while leaving them live in the product.
 */

import type { CauseCategory } from "@blueberry/chem-core";
import { causeDefinition, routeLabel } from "@blueberry/chem-core";

import type { CauseCopyEntry } from "./types.ts";
import { copyCount, copyCoverage, copyEntriesByCategory } from "./registry.ts";

const CATEGORY_ORDER: readonly CauseCategory[] = Object.freeze([
  "success",
  "valence",
  "conservation",
  "electron_flow",
  "stereochemistry",
  "sterics",
  "reactivity",
  "route",
]);

const CATEGORY_TITLES: Readonly<Record<CauseCategory, string>> = Object.freeze({
  success: "Success",
  valence: "Valence",
  conservation: "Conservation",
  electron_flow: "Electron flow",
  stereochemistry: "Stereochemistry",
  sterics: "Sterics",
  reactivity: "Reactivity",
  route: "Route",
});

function renderEntry(entry: CauseCopyEntry): string {
  const definition = causeDefinition(entry.id);
  const lines: string[] = [];
  lines.push(`### ${entry.id}`);
  lines.push("");
  lines.push(`Severity: ${definition.severity}. Applies to: ${definition.appliesTo.join(", ")}.`);
  lines.push("");
  lines.push(`**What you did.** ${entry.whatYouDid}`);
  lines.push("");
  lines.push(`**Why.** ${entry.why}`);
  lines.push("");
  lines.push(`**What to look at.** ${entry.lookAt}`);
  const competing = entry.competingRoutes ?? [];
  if (competing.length > 0) {
    lines.push("");
    lines.push(`Competing pathways named: ${competing.map(routeLabel).join(", ")}.`);
  }
  lines.push("");
  return lines.join("\n");
}

/** The full copy set as a Markdown document. Pure. No file access, no console. */
export function renderCopyReview(): string {
  const coverage = copyCoverage();
  const out: string[] = [];
  out.push("# Tier 1 feedback copy");
  out.push("");
  out.push(
    "Authored teaching copy for every named cause in chem-core. Generated from " +
      "packages/feedback/src/copy by `npm run review -w @blueberry/feedback`. Do not edit this " +
      "output; edit the copy files.",
  );
  out.push("");
  out.push(`Causes defined by chem-core: ${coverage.defined}.`);
  out.push(`Causes with authored copy: ${coverage.covered}.`);
  if (coverage.missing.length > 0) {
    out.push(`Missing copy: ${coverage.missing.join(", ")}.`);
  }
  if (coverage.extra.length > 0) {
    out.push(`Copy for unknown causes: ${coverage.extra.join(", ")}.`);
  }
  out.push("");

  let rendered = 0;
  for (const category of CATEGORY_ORDER) {
    const entries = copyEntriesByCategory(category);
    if (entries.length === 0) {
      continue;
    }
    out.push(`## ${CATEGORY_TITLES[category]}`);
    out.push("");
    for (const entry of entries) {
      out.push(renderEntry(entry));
      rendered += 1;
    }
  }

  if (rendered !== copyCount()) {
    throw new Error(
      `Review rendered ${rendered} entries but ${copyCount()} are authored. ` +
        "A cause category is missing from CATEGORY_ORDER in review.ts.",
    );
  }

  return out.join("\n");
}
