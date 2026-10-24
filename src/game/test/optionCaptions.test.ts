/**
 * Option captions do not give the answer away (audit 23 Oct, top-25 #11): a
 * graded tile question shows A, B, C under its drawings until Check, and the
 * names once the answer is in. A first meeting (L0) too: the audit's three
 examples are all L0, so they are checked here by id.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { McqBeatView } from "../beats/mcq/McqBeatView";
import { mcqOptionTiles } from "../beats/mcq/mcqFigures";
import { gradeMcq } from "../beats/mcq/grade";
import { lessonMeetBeats, lessonRecogniseBeats } from "../beats/template";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import type { MasteryLevel, McqBeat } from "../beats/types";

const drawn = lessonRecogniseBeats("u5-thiols").find(
  (one) => mcqOptionTiles(one.id, one.options.map((option) => option.id)) !== null,
) as McqBeat;

function captions(level: MasteryLevel, answered: boolean, beat: McqBeat = drawn): string[] {
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
    expect(drawn).toBeDefined();
  });

  it("shows letters before Check on a graded question", () => {
    expect(captions(1, false)).toEqual(drawn.options.map((_, i) => String.fromCharCode(65 + i)));
  });

  it("shows the names after Check", () => {
    const tiles = mcqOptionTiles(drawn.id, drawn.options.map((option) => option.id))!;
    expect(captions(1, true)).toEqual(drawn.options.map((option) => tiles[option.id]!.name ?? option.text));
  });

  // "Pick the thiol." (u5), "Acetic anhydride meets methanol. Pick the ester."
  // (u8) and "Pick the allylic cation." (u1): each tile's name was the answer.
  const AUDIT_L0 = ["u5-th-meet", "u8-anh-meet", "u1-allylic-pick"];
  const meetBeats = PATHWAY_UNITS.flatMap((unit) => unit.nodes.flatMap((node) => lessonMeetBeats(node.id)));

  it.each(AUDIT_L0)("shows letters before Check on the first meeting %s", (id) => {
    const meet = meetBeats.find((one) => one.id === id);
    expect(meet).toBeDefined();
    expect(mcqOptionTiles(meet!.id, meet!.options.map((option) => option.id))).not.toBeNull();
    expect(captions(0, false, meet)).toEqual(meet!.options.map((_, i) => String.fromCharCode(65 + i)));
  });

  it.each(AUDIT_L0)("names the tiles of %s after Check", (id) => {
    const meet = meetBeats.find((one) => one.id === id)!;
    const tiles = mcqOptionTiles(meet.id, meet.options.map((option) => option.id))!;
    expect(captions(0, true, meet)).toEqual(meet.options.map((option) => tiles[option.id]!.name ?? option.text));
  });
});
