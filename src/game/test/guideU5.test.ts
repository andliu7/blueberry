/**
 * Unit 5's guidebook (src/game/guide/u5Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 5
 * pool, RDKit structures byte matched against scripts/guide_u5.py, the lazy
 * load and the page. Everything stays a draft.
 */
import { U5_POOLS } from "../content/u5";
import { U5_GUIDE } from "../guide/u5Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u5", guide: U5_GUIDE, pools: U5_POOLS, script: "scripts/guide_u5.py", minStructures: 60 });
