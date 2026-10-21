/**
 * Unit 8's guidebook (src/game/guide/u8Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit 8
 * pool, RDKit structures byte matched against scripts/guide_u8.py, the lazy
 * load and the page. u8-ladder has no wired pool (its lesson plays the acyl
 * sort ladder), so its words quote the entries drafted for it in U8_UNWIRED.
 * Everything stays a draft.
 */
import { U8_POOLS, U8_UNWIRED } from "../content/u8";
import { U8_GUIDE } from "../guide/u8Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u8", guide: U8_GUIDE, pools: { ...U8_POOLS, ...U8_UNWIRED }, script: "scripts/guide_u8.py", minStructures: 50 });
