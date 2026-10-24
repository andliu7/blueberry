/**
 * Unit 10's guidebook (src/game/guide/u10Guide.ts), pinned by the shared unit
 * guide checks (guideSuite.ts): coverage, word for word quotes from the Unit
 * 10 pool, RDKit structures byte matched against
 * scripts/guide_u10.py, the lazy load and the page. Everything stays a draft.
 */
import { describe, expect, it } from "vitest";

import { U10_POOLS, U10_SORT_FIGURES } from "../content/u10";
import { U10_GUIDE } from "../guide/u10Guide";
import { describeUnitGuide } from "./guideSuite";

describeUnitGuide({ unitId: "u10", guide: U10_GUIDE, pools: U10_POOLS, script: "scripts/guide_u10.py", minStructures: 40 });

describe("the u10-basicity example", () => {
  // The drawing is held to the lesson's own amine sort (u10-bas-ladder), card
  // for card in the sort's order, rather than to a single pool answer.
  it("draws the amine sort's three amines, strongest base first", () => {
    const entry = U10_POOLS["u10-basicity"]!.find((item) => item.id === "u10-bas-ladder")!;
    if (entry.item.kind !== "sort") throw new Error("u10-bas-ladder is not a sort");
    const figures = U10_SORT_FIGURES["u10-bas-ladder"]!;
    const sortNames = entry.item.content.beat.order.map((card) => figures[card]!.name);
    const drawn = U10_GUIDE.examples["u10-basicity"]!.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.smiles] : []));
    expect(drawn).toEqual(["NC1CCCCC1", "Nc1ccccc1", "CC(N)=O"]);
    expect(entry.item.content.beat.order).toEqual(["chxa", "anil", "amide"]);
    const drawnNames = U10_GUIDE.examples["u10-basicity"]!.panels.flatMap((panel) => (panel.kind === "mol" ? [panel.name] : []));
    expect(drawnNames.map((name) => name.split(":")[0])).toEqual(sortNames);
  });
});
