import type { Check } from "../../check.ts";
import { feedbackCopyCoverage } from "./copy-coverage.ts";
import { feedbackNamedCauses } from "./named-causes.ts";

/**
 * The feedback axis family.
 *
 * Two checks, one export, same arrangement as the conservation family. They answer the
 * two halves of the measured column in CLAUDE.md's feedback row:
 *
 *   named-causes    how many distinct causes are REACHABLE, and what percentage of wrong
 *                   attempts resolve to one rather than to a generic failure
 *   copy-coverage   whether every cause a student can be shown has authored copy
 *
 * Order is the order a failure is easiest to read in. A missing cause is worth knowing
 * about before you are told how many causes have copy.
 */
export const feedbackChecks: readonly Check[] = [feedbackNamedCauses, feedbackCopyCoverage];
