/**
 * Unit 9's guidebook (src/game/guide/u9Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 9
 * pool and lesson questions, RDKit structures byte matched against
 * scripts/guide_u9.py, the lazy load and the page. Everything stays a draft.
 */
import { U9_POOLS } from "../content/u9";
import { U9_GUIDE } from "../guide/u9Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u9", guide: U9_GUIDE, pools: U9_POOLS, script: "scripts/guide_u9.py", minStructures: 60 });
