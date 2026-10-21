/**
 * Unit 10's guidebook (src/game/guide/u10Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit
 * 10 pool and the ladder a lesson plays, RDKit structures byte matched against
 * scripts/guide_u10.py, the lazy load and the page. Everything stays a draft.
 */
import { describe, expect, it } from "vitest";

import { sortContentById } from "../beats/sort/ladders";
import { U10_POOLS } from "../content/u10";
import { U10_GUIDE } from "../guide/u10Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u10", guide: U10_GUIDE, pools: U10_POOLS, script: "scripts/guide_u10.py", minStructures: 40 });

describe("the u10-basicity example", () => {
  // u10-basicity has no pool: its lesson plays this ladder, so the drawing is
  // held to the ladder's own order rather than to a pool answer.
  it("draws the ladder's two fastest nucleophiles, fastest first", () => {
    const ladder = sortContentById("sort-basicity-vs-nucleophilicity")!;
    const drawn = U10_GUIDE.examples["u10-basicity"]!.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.smiles] : []));
    expect(drawn).toEqual(["[SH-]", "[OH-]"]);
    expect(ladder.beat.order.slice(0, 2)).toEqual(["hydrosulfide", "hydroxide"]);
  });
});
