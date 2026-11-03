/**
 * The student's saved syllabus plan (STATUS C1) and the code that reads it,
 * or null with no plan. Used by the map (PathwayTab) and the social tabs
 * (useStudyState), so both put START in the same place.
 *
 * IN THE ENTRY CHUNK, SO IT IMPORTS NOTHING OF THE SYLLABUS. #/app's first
 * open is over its byte budget. This hook only reads whether the storage key
 * is set and listens for the event every save fires; the store, the week
 * logic and the side quest rule come in one DYNAMIC IMPORT
 * (syllabusStart.ts), fetched only once a plan exists. PLAN_KEY and
 * PLAN_EVENT copy SYLLABUS_KEY and SYLLABUS_EVENT (syllabusPlan.ts) as
 * literals for that reason; test/syllabusPayload.test.ts pins that they match.
 */
import { useEffect, useMemo, useState } from "react";

export const PLAN_KEY = "blueberry.syllabus.v1";
export const PLAN_EVENT = "blueberry:syllabus";

type SyllabusMap = typeof import("./syllabusStart");
type Plan = NonNullable<ReturnType<SyllabusMap["savedPlan"]>>;

function planStored(): boolean {
  try {
    return localStorage.getItem(PLAN_KEY) !== null;
  } catch {
    return false;
  }
}

export function useSyllabusMap(): { readonly map: SyllabusMap; readonly plan: Plan; readonly covered: ReadonlySet<string> } | null {
  // A counter bumped on every save, so the plan below is read again.
  const [saves, setSaves] = useState(0);
  useEffect(() => {
    const bump = () => setSaves((count) => count + 1);
    window.addEventListener(PLAN_EVENT, bump);
    return () => window.removeEventListener(PLAN_EVENT, bump);
  }, []);
  // useState holds the module once the dynamic import lands. A save this
  // session (saves > 0) loads it too, for a browser that blocks storage.
  const [map, setMap] = useState<SyllabusMap | null>(null);
  useEffect(() => {
    if (map !== null || (saves === 0 && !planStored())) return;
    let live = true;
    void import("./syllabusStart").then((module) => {
      if (live) setMap(module);
    });
    return () => {
      live = false;
    };
  }, [saves, map]);
  // useMemo: sanitise the saved plan once per save, not on every render. `saves` is the signal that it changed.
  return useMemo(() => {
    const plan = map === null ? null : map.savedPlan();
    return map === null || plan === null ? null : { map, plan, covered: map.coveredSideQuests(plan) };
  }, [map, saves]);
}
