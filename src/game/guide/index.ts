/**
 * The unit guidebooks, by unit id. A unit with no written guide returns null,
 * and the pathway's GUIDEBOOK key falls back to the per lesson page it always
 * opened (pathway-sheet/Guidebook.tsx).
 *
 * Unit 0's guide (u0Guide.ts) is the u0 row, opened from the Unit 0 story.
 *
 * Two kinds of row, on purpose:
 *   - GUIDES, Units 0 and 1, ship with the path, as they always have;
 *   - LATER, Units 2 and 7 to 10, are each fetched the first time a student
 *     opens that unit's guide. The game's first load sits at its 400 KB
 *     budget, and these guides are mostly drawing data, so a static import
 *     here would put all of them on every first load. A dynamic import()
 *     makes Vite split each one into its own small file instead.
 */
import type { UnitGuide } from "./types";
import { U0_GUIDE } from "./u0Guide";
import { U1_GUIDE } from "./u1Guide";

const GUIDES: Readonly<Record<string, UnitGuide>> = {
  u0: U0_GUIDE,
  u1: U1_GUIDE,
};

const LATER: Readonly<Record<string, () => Promise<UnitGuide>>> = {
  u2: () => import("./u2Guide").then((m) => m.U2_GUIDE),
  u4: () => import("./u4Guide").then((m) => m.U4_GUIDE),
  u7: () => import("./u7Guide").then((m) => m.U7_GUIDE),
  u8: () => import("./u8Guide").then((m) => m.U8_GUIDE),
  u9: () => import("./u9Guide").then((m) => m.U9_GUIDE),
  u10: () => import("./u10Guide").then((m) => m.U10_GUIDE),
};

/** The LATER guides already fetched, so a second open is instant. */
const fetched = new Map<string, UnitGuide>();

/**
 * The guide for a unit, if it is here right now: always for Units 0 and 1,
 * and for a LATER unit once loadUnitGuide has fetched it. Null otherwise.
 */
export function unitGuideFor(unitId: string): UnitGuide | null {
  return GUIDES[unitId] ?? fetched.get(unitId) ?? null;
}

/** Whether the unit has a written guide at all, fetched yet or not. */
export function hasUnitGuide(unitId: string): boolean {
  return unitId in GUIDES || unitId in LATER;
}

/** Fetches a unit's guide (once), then resolves with it. Null for a unit with none. */
export async function loadUnitGuide(unitId: string): Promise<UnitGuide | null> {
  const ready = unitGuideFor(unitId);
  if (ready !== null) return ready;
  const load = LATER[unitId];
  if (load === undefined) return null;
  const guide = await load();
  fetched.set(unitId, guide);
  return guide;
}

export type { LessonDoor, UnitGuide } from "./types";
