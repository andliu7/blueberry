/**
 * Unit 6's guidebook (src/game/guide/u6Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 6
 * pool, RDKit structures byte matched against scripts/guide_u6.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U6_POOLS } from "../content/u6";
import { U6_GUIDE } from "../guide/u6Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u6", guide: U6_GUIDE, pools: U6_POOLS, script: "scripts/guide_u6.py", minStructures: 15 });
