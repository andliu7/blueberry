import { describe, expect, it } from "vitest";
import type { EconomyEvent } from "@blueberry/economy";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { pathStatus } from "../tabs/pathway/sectionStarts";
import { unitSections } from "../tabs/pathway/testOuts";
import { deriveChallenges } from "../tabs/pathway/challengesModel";

const clear = (nodeId: string): EconomyEvent => ({ kind: "node_cleared", nodeId } as unknown as EconomyEvent);

describe("pathway states", () => {
  it("opens the first lesson of every section, with any journal", () => {
    const first = PATHWAY_UNITS[0]!.nodes[0]!.id;
    for (const journal of [[], [clear(first)]]) {
      const { status } = pathStatus(PATHWAY_UNITS, journal);
      for (const unit of PATHWAY_UNITS) {
        for (const section of unitSections(unit)) {
          const id = section.lights[0];
          const live = status.nodes.get(id!);
          if (id === undefined || live === undefined || live.queued) continue;
          expect(live.state, `${unit.id} ${id}`).not.toBe("locked");
        }
      }
    }
  });

  it("finishing a node opens the next one without marking it done", () => {
    const u1 = PATHWAY_UNITS[0]!;
    const [a, b] = u1.nodes.filter((n) => n.kind !== "branch" && n.playable !== undefined);
    const { status } = pathStatus(PATHWAY_UNITS, [clear(a!.id)]);
    expect(status.nodes.get(a!.id)!.state).toMatch(/done|review/);
    expect(["open", "current"]).toContain(status.nodes.get(b!.id)!.state);
  });

  it("challenges: finishing one opens the next, never marks it done", () => {
    const none = deriveChallenges([]);
    expect(none[0]!.state).toBe("current");
    expect(none.slice(1).every((s) => s.state === "locked")).toBe(true);
    const one = deriveChallenges([clear("x")]);
    expect(one[0]!.state).toBe("done");
    expect(one[1]!.state).toBe("current");
    expect(one[1]!.have).toBeLessThan(one[1]!.need);
  });
});

describe("unit 2", () => {
  it("shows no locked first row: the side quest drawn first is open", () => {
    const { status } = pathStatus(PATHWAY_UNITS, []);
    expect(status.nodes.get("u2-nomen")!.state).not.toBe("locked");
    expect(status.nodes.get("u2-huckel")!.state).not.toBe("locked");
  });
});
