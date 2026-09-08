import type { Check } from "../../check.ts";
import { oracleAromaticityStability } from "./aromaticity.ts";
import { oracleGateSelfTest } from "./gate-self-test.ts";
import { oracleHarnessReady } from "./harness-ready.ts";
import { oracleMesoDetection } from "./meso.ts";
import { oracleSanitization } from "./sanitization.ts";
import { oracleStereoDescriptors } from "./stereo-descriptors.ts";

/**
 * The RDKit oracle check family.
 *
 * D3 in docs/INHERITED-DECISIONS.md gives these checks one job: be the reference
 * implementation that grades chem-core's TypeScript. RDKit runs in CI only, in a Python
 * sidecar, and never ships. Nothing in this directory is reachable from apps/web,
 * apps/mobile, or packages/chem-core.
 *
 * Order is the order printed in the report, and it is the order a failure is easiest to
 * read in.
 *
 *   oracle-harness-ready           the sidecar started, self tested, and answered
 *   oracle-sanitization            RDKit accepts every state, or fails exactly as declared
 *   oracle-stereo-descriptors      every authored R/S and E/Z equals rdCIPLabeler's answer
 *   oracle-meso-detection          every authored expect.meso equals RDKit's answer
 *   oracle-aromaticity-stability   perception holds where an author claimed it would
 *   oracle-gate-self-test          proof the four above fire on input built to break them
 *
 * oracle-harness-ready is first because every other check in the family reports one line
 * pointing at it when the sidecar could not run, and a pointer that appears above the
 * thing it points at is a worse report. The self test is last for the reason the budget
 * family gives: a reader should see the real checks first and the proof that they fire
 * underneath them.
 *
 * THE ONE THING THIS FAMILY WILL NOT DO IS SKIP. A missing Python, a missing RDKit, a
 * crashed sidecar, a failed sidecar self test, or a corpus file that will not parse all
 * produce failures, never a quiet pass. An oracle that cannot run and reports green means
 * the suite claims chem-core was graded against a reference implementation when nothing
 * graded anything, and that is a worse outcome than having no oracle at all.
 *
 * WHAT A GREEN RUN OF THIS FAMILY DOES NOT MEAN. It does not mean chem-core agrees with
 * RDKit. Until a chem-core fixture is serialised through serializeState() in payload.ts
 * and lands in packages/validators/fixtures/ as an .oracle.json, every state here is
 * authored JSON, and oracle-harness-ready says so in the NOT MEASURABLE HERE section on
 * every run rather than leaving the gap to be inferred.
 *
 * ADJUDICATION ITEMS ARE NOT PASSES. CLAUDE.md sends aromaticity disagreements and
 * sanitisation failures on legitimate reactive intermediates to a human rather than
 * auto-failing them. Those items are carried in the notMeasurable channel under an
 * ADJUDICATION prefix, with the argument for why that is the wrong permanent home, and
 * what the right one is, at the top of ./adjudication.ts.
 */
export const oracleChecks: readonly Check[] = [
  oracleHarnessReady,
  oracleSanitization,
  oracleStereoDescriptors,
  oracleMesoDetection,
  oracleAromaticityStability,
  oracleGateSelfTest,
];
