/**
 * Unit 8's guidebook (src/game/guide/u8Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 8
 * pool, RDKit structures byte matched against scripts/guide_u8.py, the lazy
 * load and the page. u8-ladder's pool is wired since 23 Oct, so every quote
 * comes from U8_POOLS. Everything stays a draft.
 */
import { U8_POOLS } from "../content/u8";
import { U8_GUIDE } from "../guide/u8Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u8", guide: U8_GUIDE, pools: U8_POOLS, script: "scripts/guide_u8.py", minStructures: 50 });
