/**
 * Ladders keep their drawings everywhere they play (audit 23 Oct, top-25 #25):
 * every unit's ladder figure table is reachable through the one lookup the
 * lesson, the practice run, the test-outs and the review stops all read.
 */
import { describe, expect, it } from "vitest";
import { sortFiguresFor } from "../beats/sortFigures";
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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TABLES = { U0_SORT_FIGURES, U1_SORT_FIGURES, U2_SORT_FIGURES, U3_SORT_FIGURES, U4_SORT_FIGURES, U5_SORT_FIGURES, U7_SORT_FIGURES, U8_SORT_FIGURES, U9_SORT_FIGURES, U10_SORT_FIGURES };

describe("sortFiguresFor", () => {
  it("finds every ladder's drawings in every unit's table", () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const [id, figures] of Object.entries(table)) {
        expect(sortFiguresFor(id), `${name} ${id}`).toBe(figures);
      }
    }
  });

  it("is the lookup every surface that plays a pool ladder reads", () => {
    for (const file of ["../beats/PoolItemsStep.tsx", "../beats/practice/PracticeRunner.tsx", "../tabs/pathway/TestOutRun.tsx", "../tabs/pathway/ReviewRun.tsx"]) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      expect(source, file).toContain("figures={sortFiguresFor(entry.id)}");
      expect(source, file).not.toMatch(/U\d+_SORT_FIGURES\[/);
    }
  });
});
