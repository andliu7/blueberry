/**
 * The unit guidebooks, by unit id. A unit with no written guide returns null,
 * and the pathway's GUIDEBOOK key falls back to the per lesson page it always
 * opened (pathway-sheet/Guidebook.tsx).
 *
 * Unit 0's guide (u0Guide.ts) is the u0 row, opened from the Unit 0 story.
 */
import type { UnitGuide } from "./types";
import { U0_GUIDE } from "./u0Guide";
import { U1_GUIDE } from "./u1Guide";

const GUIDES: Readonly<Record<string, UnitGuide>> = {
  u0: U0_GUIDE,
  u1: U1_GUIDE,
};

export function unitGuideFor(unitId: string): UnitGuide | null {
  return GUIDES[unitId] ?? null;
}

export type { LessonDoor, UnitGuide } from "./types";
