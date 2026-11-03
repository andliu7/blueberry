// @vitest-environment jsdom
/**
 * The syllabus layer stays off #/app's first open (STATUS C1). The map's hook
 * (syllabus/useSyllabusMap.ts) carries copies of the store's key and save
 * event instead of importing the store, so those copies must match, and every
 * save must fire the event the hook listens for.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_EVENT, PLAN_KEY } from "../syllabus/useSyllabusMap";
import { SYLLABUS_EVENT, SYLLABUS_KEY, syllabusStore, type SyllabusPlan } from "../syllabus/syllabusPlan";

const plan: SyllabusPlan = { version: 1, updatedAt: 1, weeks: [], unitOrder: ["u3"], sectionOrder: {}, notCovered: [], sideQuests: [], exams: [] };

describe("the map's hook and the store agree", () => {
  it("on the storage key and the save event", () => {
    expect(PLAN_KEY).toBe(SYLLABUS_KEY);
    expect(PLAN_EVENT).toBe(SYLLABUS_EVENT);
  });

  it("every save and every clear fires the event", () => {
    let fired = 0;
    const count = () => (fired += 1);
    window.addEventListener(PLAN_EVENT, count);
    syllabusStore.replace(plan);
    syllabusStore.replace(null);
    window.removeEventListener(PLAN_EVENT, count);
    expect(fired).toBe(2);
  });
});

describe("first-open files import no syllabus code statically", () => {
  // These are in #/app's first-open chunk; the syllabus reaches them only by dynamic import or a prop.
  const files = ["tabs/pathway/PathwayTab.tsx", "tabs/pathway/testOuts.ts", "pathway-sheet/nodeSheetModel.ts", "syllabus/useSyllabusMap.ts"];
  for (const file of files) {
    it(file, () => {
      const source = readFileSync(path.join(path.resolve(__dirname, ".."), file), "utf8");
      const statics = [...source.matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gms)].map((match) => match[1]!).filter((path) => /syllabus\//.test(path) || /^\.\/syllabus/.test(path));
      expect(statics, file).toEqual(file.startsWith("tabs/pathway/PathwayTab") ? ["../../syllabus/useSyllabusMap"] : []);
    });
  }
});
