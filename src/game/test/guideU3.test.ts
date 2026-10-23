/**
 * Unit 3's guidebook (src/game/guide/u3Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 3
 * pool, RDKit structures byte matched against scripts/guide_u3.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U3_POOLS } from "../content/u3";
import { U3_GUIDE } from "../guide/u3Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u3", guide: U3_GUIDE, pools: U3_POOLS, script: "scripts/guide_u3.py", minStructures: 50 });
