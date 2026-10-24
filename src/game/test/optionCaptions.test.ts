/**
 * Option captions do not give the answer away (audit 23 Oct, top-25 #11): a
 * graded tile question shows A, B, C under its drawings until Check, and the
 * names once the answer is in. A first meeting keeps its names.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { McqBeatView } from "../beats/mcq/McqBeatView";
import { mcqOptionTiles } from "../beats/mcq/mcqFigures";
import { gradeMcq } from "../beats/mcq/grade";
import { lessonRecogniseBeats } from "../beats/template";
import type { MasteryLevel, McqBeat } from "../beats/types";

const beat = lessonRecogniseBeats("u5-thiols").find(
  (one) => mcqOptionTiles(one.id, one.options.map((option) => option.id)) !== null,
) as McqBeat;

function captions(level: MasteryLevel, answered: boolean): string[] {
  const reveal = answered
    ? gradeMcq({ beat, level, chosenId: beat.correctOptionId, elapsedMs: 1000, at: "2026-10-23T12:00:00.000Z" })
    : null;
  const html = renderToStaticMarkup(
    createElement(McqBeatView, {
      beat,
      level,
      selectedId: answered ? beat.correctOptionId : null,
      reveal,
      progress: { answered: 0, total: 1, fraction: 0, cleared: 0, clearedFraction: 0 },
      primaryLabel: "Check",
      primaryEnabled: false,
      onPrimary: () => {},
      onSelect: () => {},
      onExit: () => {},
      onReport: () => {},
      reported: false,
    }),
  );
  return [...html.matchAll(/class="option-tile__caption"[^>]*>([^<]*)</g)].map((match) => match[1]!);
}

describe("tile captions", () => {
  it("found a drawn question to check", () => {
    expect(beat).toBeDefined();
  });

  it("shows letters before Check on a graded question", () => {
    expect(captions(1, false)).toEqual(beat.options.map((_, i) => String.fromCharCode(65 + i)));
  });

  it("shows the names after Check", () => {
    const tiles = mcqOptionTiles(beat.id, beat.options.map((option) => option.id))!;
    expect(captions(1, true)).toEqual(beat.options.map((option) => tiles[option.id]!.name ?? option.text));
  });

  it("keeps the names on a first meeting, which cannot fail", () => {
    expect(captions(0, false)).toEqual(captions(1, true));
  });
});
