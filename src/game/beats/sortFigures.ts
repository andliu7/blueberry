/**
 * THE ONE LOOKUP FOR A POOL LADDER'S DRAWINGS, by pool entry id.
 *
 * Each unit's generated pools carry their own table of ladder figures. The
 * lesson step (PoolItemsStep) used to chain seven of them by hand while the
 * practice run, the test-outs and the review stops chained only Unit 1 and
 * Unit 2, so a ladder from any later unit lost its drawings the moment it
 * reached a test (audit 23 Oct, top-25 #25). One function now, read by all of
 * them, so a new unit is added in one place. Every table here comes from a
 * module the pools already load, so it adds no download.
 */
import type { NamedFigure } from "./mcq/mcqFigures";
import { U0_SORT_FIGURES } from "../content/u0";
import { U1_SORT_FIGURES } from "../content/u1";
import { U2_SORT_FIGURES } from "../content/u2";
import { U3_SORT_FIGURES } from "../content/u3";
import { U4_SORT_FIGURES } from "../content/u4";
import { U5_SORT_FIGURES } from "../content/u5";
import { U7_SORT_FIGURES } from "../content/u7";
import { U8_SORT_FIGURES } from "../content/u8";
import { U9_SORT_FIGURES } from "../content/u9";
import { U10_SORT_FIGURES } from "../content/u10";

type FigureTable = Readonly<Record<string, Readonly<Record<string, NamedFigure>>>>;

const TABLES: readonly FigureTable[] = [
  U1_SORT_FIGURES,
  U2_SORT_FIGURES,
  U3_SORT_FIGURES,
  U4_SORT_FIGURES,
  U5_SORT_FIGURES,
  U7_SORT_FIGURES,
  U8_SORT_FIGURES,
  U9_SORT_FIGURES,
  U10_SORT_FIGURES,
  U0_SORT_FIGURES,
];

/** The drawings for one pool ladder, or undefined when none were generated for it. */
export function sortFiguresFor(entryId: string): Readonly<Record<string, NamedFigure>> | undefined {
  for (const table of TABLES) {
    const found = table[entryId];
    if (found !== undefined) return found;
  }
  return undefined;
}
