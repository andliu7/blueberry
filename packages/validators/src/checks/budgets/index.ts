import type { Check } from "../../check.ts";
import { budgetGateSelfTest } from "./budget-gate-self-test.ts";
import { chemCorePurity } from "./chem-core-purity.ts";
import { chemCoreSize } from "./chem-core-size.ts";
import { gameRoutePayload } from "./game-route-payload.ts";
import { ketcherRouteIsolation } from "./ketcher-route-isolation.ts";

/**
 * The budget and purity gates.
 *
 * Exported as one array so src/checks/index.ts registers them with a single import and
 * a single spread. The registration itself belongs to whoever owns that file; nothing
 * here reaches into it.
 *
 * Order is deliberate and is the order printed in the report. The self test runs last,
 * so a reader sees the four real gates first and the proof that they fire underneath
 * them rather than the other way around.
 *
 *   budget-chem-core-size            150 KB gzipped ceiling, measured from a real bundle
 *   budget-chem-core-purity          no React, DOM, rendering, or RDKit in the built graph
 *   budget-ketcher-route-isolation   no ketcher or @rdkit on the game route's static graph
 *   budget-game-route-payload        400 KB gzipped ceiling, Ketcher excluded
 *   budget-gate-self-test            proof the above fire, on deliberately broken subjects
 *
 * Two of these four have no subject yet, because apps/web is a Phase 3 and Phase 4
 * deliverable. They do not pass vacuously and they do not sit red. What they do instead,
 * and the argument for it, is in src/measure/subject.ts, and the behaviour is asserted
 * every run by the self test rather than described and hoped for.
 */
export const budgetChecks: readonly Check[] = [
  chemCoreSize,
  chemCorePurity,
  ketcherRouteIsolation,
  gameRoutePayload,
  budgetGateSelfTest,
];
