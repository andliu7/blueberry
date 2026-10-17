/**
 * The unit guidebooks, by unit id. A unit with no written guide returns null,
 * and the pathway's GUIDEBOOK key falls back to the per lesson page it always
 * opened (pathway-sheet/Guidebook.tsx).
 *
 * Unit 0's guide lands here too when it is written: one row in GUIDES.
 */
import type { UnitGuide } from "./types";
import { U1_GUIDE } from "./u1Guide";

const GUIDES: Readonly<Record<string, UnitGuide>> = {
  u1: U1_GUIDE,
};

export function unitGuideFor(unitId: string): UnitGuide | null {
  return GUIDES[unitId] ?? null;
}

export type { LessonDoor, UnitGuide } from "./types";
