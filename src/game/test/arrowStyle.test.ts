/**
 * The drag style setting: what each option resolves to, that the default is
 * exactly the per-question rule question.ts has always applied, and that the
 * choice survives a reload the way the pKa settings do. The grading half of
 * "presentation only" is pinned in pilotArrowStyleWiring.test.ts, which
 * mounts the real screen.
 */

import { describe, expect, it } from "vitest";
import {
  ARROW_STYLE_KEY,
  arrowPresentation,
  createArrowStyle,
  DEFAULT_ARROW_STYLE,
  type ArrowStyle,
} from "../settings/arrowStyle";
import { curvedArrowsFor, type QuestionKind } from "../tabs/trainer/engine/question";

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

const KINDS: readonly QuestionKind[] = ["reaction", "sequence", "resonance"];

describe("arrowPresentation", () => {
  it("defaults to today's per-question rule for every kind", () => {
    expect(DEFAULT_ARROW_STYLE).toBe("auto");
    for (const kind of KINDS) {
      const curved = curvedArrowsFor(kind);
      expect(arrowPresentation("auto", curved)).toEqual({ drag: curved ? "curved" : "dashed", curvedRecord: curved });
    }
  });

  it("curved draws and keeps the curved arrow on every kind", () => {
    for (const kind of KINDS) expect(arrowPresentation("curved", curvedArrowsFor(kind))).toEqual({ drag: "curved", curvedRecord: true });
  });

  it("dashed drags the straight guide; the push rests as the arrow on resonance and the forming bond elsewhere", () => {
    expect(arrowPresentation("dashed", curvedArrowsFor("resonance"))).toEqual({ drag: "dashed", curvedRecord: true });
    expect(arrowPresentation("dashed", curvedArrowsFor("reaction"))).toEqual({ drag: "dashed", curvedRecord: false });
    expect(arrowPresentation("dashed", curvedArrowsFor("sequence"))).toEqual({ drag: "dashed", curvedRecord: false });
  });
});

describe("the arrow style store", () => {
  it("starts at the default with nothing stored", () => {
    expect(createArrowStyle(memoryStorage()).getSnapshot()).toBe("auto");
  });

  it("persists a choice across a reload and notifies once per real change", () => {
    const storage = memoryStorage();
    const first = createArrowStyle(storage);
    let calls = 0;
    first.subscribe(() => {
      calls += 1;
    });
    first.set("dashed");
    first.set("dashed");
    expect(calls).toBe(1);
    expect(createArrowStyle(storage).getSnapshot()).toBe("dashed");
  });

  it("reads an unknown or corrupt stored value as the default", () => {
    expect(createArrowStyle(memoryStorage({ [ARROW_STYLE_KEY]: JSON.stringify({ style: "wavy" }) })).getSnapshot()).toBe("auto");
    expect(createArrowStyle(memoryStorage({ [ARROW_STYLE_KEY]: "{not json" })).getSnapshot()).toBe("auto");
  });

  it("refuses a value that is not a style", () => {
    const storage = memoryStorage();
    const source = createArrowStyle(storage);
    source.set("wavy" as ArrowStyle);
    expect(source.getSnapshot()).toBe("auto");
    expect(storage.map.size).toBe(0);
  });
});
