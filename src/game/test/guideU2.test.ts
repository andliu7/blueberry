/**
 * Unit 2's guidebook (src/game/guide/u2Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 2
 * pool, RDKit structures byte matched against scripts/guide_u2.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U2_POOLS } from "../content/u2";
import { U2_GUIDE } from "../guide/u2Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u2", guide: U2_GUIDE, pools: U2_POOLS, script: "scripts/guide_u2.py", minStructures: 10 });
