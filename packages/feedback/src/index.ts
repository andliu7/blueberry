/**
 * @blueberry/feedback
 *
 * Tier 1 authored teaching copy for every named cause in `@blueberry/chem-core`.
 * Pure TypeScript. No React, no DOM. One dependency, chem-core, for its types
 * and its cause registry.
 *
 * The direction of the dependency is a rule, not an accident: chem-core must
 * never import this package. The engine has to be able to resolve an attempt
 * with no copy loaded at all, and the copy has to be rewritable by a person who
 * is not touching engine code.
 *
 * What is in here, in the order it is worth reading:
 *
 *   types.ts        The three fields every entry has, and why there are three.
 *   copy/*.ts       The copy itself, one file per cause category. This is the
 *                   part a reviewer reads. Everything else is plumbing.
 *   registry.ts     Assembly, lookup, and the coverage check the feedback axis
 *                   reports a number from.
 *   attempt.ts      Turning a resolved attempt into ordered feedback items.
 *   review.ts       The whole copy set as Markdown, for human review.
 *   cli.ts          `npm run review`. The only file that writes to stdout.
 *
 * Two things this package deliberately does not do. It does not assemble
 * sentences from fragments, because copy a person reviewed is the only copy a
 * student should read. And it does not carry a fallback string for an
 * unrecognised cause: a missing entry throws, because a fallback is how a
 * yellow triangle gets back in.
 */

export type { CauseCopy, CauseCopyEntry, CopyCoverage } from "./types.ts";

export {
  CAUSE_COPY,
  causeCopy,
  causeCopyEntry,
  copiedCauseIds,
  copyCount,
  copyCoverage,
  copyIsComplete,
  copyEntriesByCategory,
  copyEntriesBySeverity,
  competingRoutesFor,
} from "./registry.ts";

export type { FeedbackItem } from "./attempt.ts";
export {
  feedbackForResolution,
  feedbackForCause,
  resolutionIsFullyCopied,
} from "./attempt.ts";

export { renderCopyReview } from "./review.ts";

export { SUCCESS_COPY } from "./copy/success.ts";
export { VALENCE_COPY } from "./copy/valence.ts";
export { CONSERVATION_COPY } from "./copy/conservation.ts";
export { ELECTRON_FLOW_COPY } from "./copy/electronFlow.ts";
export { STEREOCHEMISTRY_COPY } from "./copy/stereochemistry.ts";
export { STERICS_COPY } from "./copy/sterics.ts";
export { REACTIVITY_COPY } from "./copy/reactivity.ts";
export { ROUTE_COPY } from "./copy/route.ts";
