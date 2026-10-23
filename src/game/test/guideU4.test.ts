/**
 * Unit 4's guidebook (src/game/guide/u4Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 4
 * pool, RDKit structures byte matched against scripts/guide_u4.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U4_POOLS } from "../content/u4";
import { U4_GUIDE } from "../guide/u4Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u4", guide: U4_GUIDE, pools: U4_POOLS, script: "scripts/guide_u4.py", minStructures: 20 });
