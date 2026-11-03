// @vitest-environment jsdom
import { it } from "vitest";
import { progress } from "@/game/app/progress";
import { deriveMapPathway } from "@/game/tabs/pathway/pathwayState";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
it("j", () => {
  const g = progress.getSnapshot();
  console.log(JSON.stringify(g.journal.slice(0, 5)), g.journal.length);
  const p = deriveMapPathway(PATHWAY_UNITS, g.journal);
  console.log(p.doneCount, p.playableCount, [...p.nodes].filter(([,s]) => s.state === "done").map(([id]) => id));
});
