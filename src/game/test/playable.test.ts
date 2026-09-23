/**
 * Every registry reaction is PLAYABLE: its authored answer can be entered
 * through the real interaction machine, command by command, and grades
 * correct. Not a geometry test; this walks the exact selectTarget path a
 * finger produces, so a reaction that renders but cannot be solved fails
 * here.
 *
 * Written while chasing an owner report: "the carbonyl is not pushing the
 * bond to the oxygen to form the tetrahedral intermediate." Whatever layer
 * that bug lives in, this test pins the machine layer's half.
 */

import { describe, expect, it } from "vitest";

import { createInteractionStore, createMechanismDraft, currentDraft, type HitTarget } from "@blueberry/interaction";
import type { ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { gradeDrawing } from "../tabs/trainer/grade";
import { TRAINER_REACTIONS } from "../demo/reactions";
import { RESONANCE_HUNT } from "../demo/resonance";
import { TRAINER_SEQUENCES } from "../demo/sequences";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { nodeHasBeat } from "../beats/template";

/** The tap sequence that enters one authored arrow, as HitTargets. */
function tapsFor(step: MechanismStep, arrow: ElectronFlowArrow): HitTarget[] {
  const taps: HitTarget[] = [];
  if (arrow.source.kind === "lonePair") {
    // Reveal the atom's lone pairs, arm slot 0, then the sink.
    taps.push({ kind: "atom", atomId: arrow.source.atomId });
    taps.push({ kind: "lonePair", atomId: arrow.source.atomId, slotIndex: 0 });
  } else if (arrow.source.kind === "bond") {
    // Arm the bond by the end handle nearest where the electrons go, which
    // is what the tutorial teaches and what a finger does.
    const pivot = arrow.sink.kind === "atom" ? arrow.sink.atomId : arrow.sink.atomIds[1];
    // The pivot must be one of the bond's own atoms; find the bond.
    let a: string | null = null;
    let b: string | null = null;
    for (const member of step.from.members) {
      for (const bond of member.species.bonds) {
        if (bond.id === arrow.source.bondId) {
          a = bond.a;
          b = bond.b;
        }
      }
    }
    if (a === null || b === null) throw new Error(`bond ${arrow.source.bondId} not in from state`);
    const end = pivot === a || pivot === b ? pivot : b;
    taps.push({ kind: "bondEndHandle", bondId: arrow.source.bondId, atomId: end });
  } else {
    throw new Error(`unhandled source kind ${arrow.source.kind}`);
  }
  if (arrow.sink.kind === "atom") {
    taps.push({ kind: "atom", atomId: arrow.sink.atomId });
  } else {
    taps.push({ kind: "betweenAtomsSite", atomIds: [arrow.sink.atomIds[0], arrow.sink.atomIds[1]] });
  }
  return taps;
}

/** Everything the picker can point at, flattened to (label, step). */
const ALL_PLAYABLE = [
  ...TRAINER_REACTIONS.map((entry) => ({ label: entry.title, step: entry.step })),
  ...TRAINER_SEQUENCES.flatMap((sequence) => sequence.steps.map((item, index) => ({ label: `${sequence.title} step ${index + 1}`, step: item.step }))),
  ...RESONANCE_HUNT.map((entry) => ({ label: `resonance: ${entry.title}`, step: entry.step })),
];

describe("every playable step goes through the machine", () => {
  for (const reaction of ALL_PLAYABLE) {
    it(`${reaction.label}: the authored answer enters and grades correct`, () => {
      const store = createInteractionStore({
        initialDraft: createMechanismDraft(reaction.step.from),
        environment: {
          hitTester: {
            hitTest: () => {
              throw new Error("this walk uses selectTarget commands, never the hit tester");
            },
          },
        },
      });
      const notices: string[] = [];
      store.subscribe(() => undefined);

      for (const arrow of reaction.step.arrows) {
        for (const tap of tapsFor(reaction.step, arrow)) {
          store.dispatch({ kind: "command", command: { kind: "selectTarget", target: tap } });
        }
      }

      const draft = currentDraft(store.getSnapshot());
      if (draft.shape !== "mechanism") throw new Error("not a mechanism draft");
      expect(
        draft.arrows.length,
        `arrows committed for ${reaction.step.id}; notices: ${notices.join(", ")}`,
      ).toBe(reaction.step.arrows.length);
      expect(gradeDrawing(reaction.step, draft.arrows).kind).toBe("correct");
    });
  }
});

/* ------------------------------------------------------------------ */
/* The map's own links                                                  */
/* ------------------------------------------------------------------ */

/**
 * A `playable` link that names nothing is a card on the map that opens an
 * empty screen, and the coverage number on the browser header counts it as
 * done. The suite above proves that every AUTHORED step can be entered; this
 * proves the other direction, that every node claiming to be playable has a
 * step to enter.
 *
 * Scoped to Unit 1 because Unit 1 is the unit being burned down and a pin that
 * fails for an unrelated wave is a pin that gets deleted. The helper takes a
 * unit id, so widening it later is one line rather than a rewrite.
 */
const REACTION_IDS = new Set(TRAINER_REACTIONS.map((entry) => entry.id));
const SEQUENCE_IDS = new Set(TRAINER_SEQUENCES.map((entry) => entry.id));
const RESONANCE_IDS = new Set(RESONANCE_HUNT.map((entry) => entry.id));

function nodesOf(unitId: string) {
  const unit = PATHWAY_UNITS.find((candidate) => candidate.id === unitId);
  if (unit === undefined) throw new Error(`no unit ${unitId} on the pathway map`);
  return unit.nodes;
}

describe("every u1 playable link resolves to real content", () => {
  it("has something to resolve, so this suite cannot pass vacuously", () => {
    expect(nodesOf("u1").filter((node) => node.playable !== undefined).length).toBeGreaterThan(0);
  });

  for (const node of nodesOf("u1")) {
    const link = node.playable;
    if (link === undefined) continue;
    it(`${node.id} resolves its ${link.kind} link "${link.id}"`, () => {
      switch (link.kind) {
        case "reaction":
          expect(REACTION_IDS.has(link.id), `no TRAINER_REACTIONS entry ${link.id}`).toBe(true);
          break;
        case "sequence":
          expect(SEQUENCE_IDS.has(link.id), `no TRAINER_SEQUENCES entry ${link.id}`).toBe(true);
          break;
        case "resonance":
          expect(RESONANCE_IDS.has(link.id), `no RESONANCE_HUNT entry ${link.id}`).toBe(true);
          break;
        case "beat":
          // A beat's id is the node's own, per PlayableLink's own comment, and
          // the thing that has to exist is a lesson plan for it.
          expect(link.id, "a beat link names its own node").toBe(node.id);
          expect(nodeHasBeat(link.id), `nothing authored for beat node ${link.id}`).toBe(true);
          break;
      }
    });
  }
});
