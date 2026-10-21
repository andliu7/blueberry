/**
 * Unit 7's guidebook (src/game/guide/u7Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 7
 * pool, RDKit structures byte matched against scripts/guide_u7.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U7_POOLS } from "../content/u7";
import { U7_GUIDE } from "../guide/u7Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u7", guide: U7_GUIDE, pools: U7_POOLS, script: "scripts/guide_u7.py", minStructures: 40 });
