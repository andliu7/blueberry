import { it } from "vitest";
import { PATHWAY_UNITS } from "../../demo/pathwayMap";
import { unitSections } from "../../tabs/pathway/testOuts";
import { unitShape } from "../../tabs/pathway/unitShape";
it("dump", () => {
  for (const unit of PATHWAY_UNITS) {
    const col = unitShape(unit).column;
    const secs = unitSections(unit);
    console.log(`== ${unit.id} ${unit.title} | sections: ${secs.map(s=>`${s.title}[${s.lights.length}]${s.checkpointId?"cp":""}`).join(" / ")}`);
    for (const n of col) console.log(`  ${n.id} | ${n.title} | ${n.playable ? "P" : "-"}`);
  }
});
