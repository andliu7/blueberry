/**
 * The Unit 2 previews (content/u2tools/priming.ts): the same contract as Unit 1's
 * (u1Priming.test.ts), pinned for the five lessons that carry one. Every idea quotes a
 * question in its own lesson word for word, the bridge quotes one in the lesson right before
 * it ON THE PATH, the guess is a drawn MCQ the lesson plays, and everything is a draft.
 */
import { describe, expect, it } from "vitest";
import { mcqVisualFor } from "../beats/mcq/mcqFigures";
import { energyVisualFor } from "../content/u2energy";
import { guessFor, previousOnPath, primingFor, primingSources, quotableText, viaWords } from "../beats/priming";
import { lessonMeetBeats } from "../beats/template";
import { U2_PRIMING, U3_PRIMING } from "../content/u2tools/priming";

const ALL = { ...U2_PRIMING, ...U3_PRIMING };
const NODES = Object.keys(ALL);

function quotes(node: string, source: string, quote: string): boolean {
  const found = primingSources(node).get(source);
  return found !== undefined && quotableText(found).includes(quote);
}

describe("Unit 2 previews", () => {
  it("covers every Unit 2 gate and every Unit 3 lesson that plays, all drafts", () => {
    const want = [
      "u2-induction", "u2-keq-pka", "u2-energy", "u2-resonance", "u2-huckel", "u2-charged", "u2-annulene", "u2-hetero", "u2-ewg-edg", "u2-nmr",
      "u3-arenium", "u3-directing", "u3-halo", "u3-nitration", "u3-sulfo", "u3-fc-alkyl", "u3-fc-acyl", "u3-blocking", "u3-nitro-red",
      "u3-c-to-ch2", "u3-benzylic-ox", "u3-sequencing", "u3-benzylic-br", "u3-birch",
    ];
    expect([...NODES].sort()).toEqual([...want].sort());
    for (const node of NODES) {
      expect(primingFor(node), node).not.toBeNull();
      expect(ALL[node]!.placeholder, node).toBe(true);
    }
  });

  it("quotes only what the lesson itself says", () => {
    for (const node of NODES) {
      const priming = ALL[node]!;
      expect(priming.ideas.length, node).toBeGreaterThanOrEqual(3);
      expect(priming.ideas.length, node).toBeLessThanOrEqual(5);
      priming.ideas.forEach((idea, i) => {
        expect(quotes(node, idea.source, idea.quote), `${node} idea ${idea.label}`).toBe(true);
        if (i > 0) expect(viaWords(idea.via ?? "").length, `${node} link ${idea.label}`).toBeGreaterThan(0);
      });
    }
  });

  it("bridges to the lesson right before it on the path", () => {
    for (const node of NODES) {
      const bridge = ALL[node]!.bridge;
      expect(bridge.node, node).toBe(previousOnPath(node));
      if (bridge.node !== null) expect(quotes(bridge.node, bridge.source, bridge.quote), `${node} bridge`).toBe(true);
    }
  });

  it("guesses a drawn question that is not one of the first meets", () => {
    for (const node of NODES) {
      const guess = guessFor(node);
      expect(guess, node).not.toBeNull();
      expect(mcqVisualFor(guess!.id) ?? energyVisualFor(guess!.id), node).not.toBeNull();
      const meets = lessonMeetBeats(node).map((beat) => beat.id);
      expect(meets.slice(0, 2), node).not.toContain(guess!.id);
    }
  });
});
