/**
 * The professor adjustable pKa layer.
 *
 * The three cases the task names are the last three describes: a preset switch
 * changes the displayed values, an override survives a reload, and an override
 * that would flip an authored ordering is detected and reported rather than
 * discarded or applied in silence.
 *
 * Everything here is pure or runs over an injected storage, so the suite stays
 * in the node environment the rest of apps/web/test uses. `createPkaSettings`
 * takes its storage as a parameter for exactly that reason.
 */

import { describe, expect, it } from "vitest";
import { PKA_TABLE } from "@blueberry/curriculum";
import { DEFAULT_LEVELS, type SortBeat } from "../beats/types";
import { SORT_LADDERS } from "../beats/sort/ladders";
import type { CardSource } from "../cards/types";
import {
  COURSE_PRESET_ID,
  DEFAULT_PKA_SETTINGS,
  PKA_INPUT_MAX,
  PKA_INPUT_MIN,
  PKA_LADDER_LINKS,
  PKA_PRESETS,
  PKA_SETTINGS_KEY,
  TEXTBOOK_PRESET_ID,
  createPkaSettings,
  formatPka,
  isStorablePka,
  overrideCount,
  parsePkaInput,
  pkaCard,
  pkaInputRejection,
  pkaLinkDefects,
  pkaOrderingConflicts,
  pkaValueFor,
  resolvePka,
  resolvedLadder,
  sortBeatPkaConflicts,
  sortItemValue,
  type PkaSettingsSnapshot,
  type SettingsStorage,
} from "../settings/pka";

/** A storage a test can hold, read and hand to a second store. */
function fakeStorage(initial?: Record<string, string>): SettingsStorage & {
  readonly map: Map<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

const withPreset = (presetId: string): PkaSettingsSnapshot => ({ presetId, overrides: {} });

describe("presets are a layer over the curriculum table, never a fork of it", () => {
  it("leaves PKA_TABLE alone whatever is configured", () => {
    const before = PKA_TABLE.water.pka;
    pkaValueFor(withPreset(TEXTBOOK_PRESET_ID), "water");
    pkaValueFor({ presetId: COURSE_PRESET_ID, overrides: { water: 1 } }, "water");
    expect(PKA_TABLE.water.pka).toBe(before);
  });

  it("every preset carries a source, because a value nobody can check is not shippable", () => {
    for (const preset of PKA_PRESETS) {
      expect(preset.source.trim().length).toBeGreaterThan(0);
      expect(preset.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("an unknown preset id falls back to the default rather than emptying the table", () => {
    expect(pkaValueFor(withPreset("a-preset-from-a-later-build"), "water")).toBe(
      pkaValueFor(withPreset(COURSE_PRESET_ID), "water"),
    );
  });
});

describe("a preset switch changes the displayed values", () => {
  it("moves the two rungs the course worksheet prints differently", () => {
    // The worksheet groups the hydronium ion with the protonated alcohol at
    // about 0 and prints water at 16. pka.ts carries the standard reference
    // numbers, -1.7 and 15.7.
    const course = withPreset(COURSE_PRESET_ID);
    const textbook = withPreset(TEXTBOOK_PRESET_ID);

    expect(pkaValueFor(course, "hydronium")).toBe(0);
    expect(pkaValueFor(course, "water")).toBe(16);

    expect(pkaValueFor(textbook, "hydronium")).toBe(PKA_TABLE.hydronium.pka);
    expect(pkaValueFor(textbook, "water")).toBe(PKA_TABLE.water.pka);
    expect(pkaValueFor(textbook, "carboxylic_acid")).toBe(4.8);
    expect(pkaValueFor(textbook, "ammonium")).toBe(10.6);
  });

  it("reports where each displayed number came from", () => {
    const course = resolvePka(withPreset(COURSE_PRESET_ID), "water");
    expect(course.origin).toBe("preset");
    expect(course.baseValue).toBe(PKA_TABLE.water.pka);

    const untouched = resolvePka(withPreset(COURSE_PRESET_ID), "alkane_ch");
    expect(untouched.origin).toBe("table");

    const mine = resolvePka({ presetId: COURSE_PRESET_ID, overrides: { alkane_ch: 51 } }, "alkane_ch");
    expect(mine.origin).toBe("override");
    expect(mine.value).toBe(51);
    expect(mine.baseValue).toBe(PKA_TABLE.alkane_ch.pka);
  });

  it("orders the ladder most acidic first, under whichever table is chosen", () => {
    const ladder = resolvedLadder(withPreset(TEXTBOOK_PRESET_ID));
    expect(ladder.length).toBe(Object.keys(PKA_TABLE).length);
    for (let index = 1; index < ladder.length; index += 1) {
      const previous = ladder[index - 1];
      const current = ladder[index];
      if (previous === undefined || current === undefined) throw new Error("ladder gap");
      expect(previous.value).toBeLessThanOrEqual(current.value);
    }
  });

  it("a card shows the configured number, not the shipped one", () => {
    const source: CardSource = { kind: "lesson", lessonId: "l-pka", beatId: "b-pka" };
    const course = pkaCard("water", withPreset(COURSE_PRESET_ID), source);
    const textbook = pkaCard("water", withPreset(TEXTBOOK_PRESET_ID), source);

    expect(course.back).toBe("About 16");
    expect(textbook.back).toBe("About 15.7");
    // The id is stable across the switch: the same question, a different number.
    expect(course.id).toBe(textbook.id);
  });
});

describe("an override persists", () => {
  it("survives a reload, which is a second store over the same storage", () => {
    const storage = fakeStorage();
    const first = createPkaSettings(storage);

    first.setPreset(TEXTBOOK_PRESET_ID);
    first.setOverride("phenol", 9.5);
    expect(pkaValueFor(first.getSnapshot(), "phenol")).toBe(9.5);

    const reloaded = createPkaSettings(storage);
    expect(reloaded.getSnapshot().presetId).toBe(TEXTBOOK_PRESET_ID);
    expect(reloaded.getSnapshot().overrides.phenol).toBe(9.5);
    expect(pkaValueFor(reloaded.getSnapshot(), "phenol")).toBe(9.5);
  });

  it("wins over the preset, and clearing it hands the rung back", () => {
    const store = createPkaSettings(fakeStorage());
    store.setPreset(TEXTBOOK_PRESET_ID);
    store.setOverride("carboxylic_acid", 4.2);
    expect(pkaValueFor(store.getSnapshot(), "carboxylic_acid")).toBe(4.2);

    store.clearOverride("carboxylic_acid");
    expect(pkaValueFor(store.getSnapshot(), "carboxylic_acid")).toBe(4.8);
    expect(overrideCount(store.getSnapshot())).toBe(0);
  });

  it("notifies subscribers, and stops when they unsubscribe", () => {
    const store = createPkaSettings(fakeStorage());
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.setOverride("phenol", 9);
    expect(calls).toBe(1);
    // Idempotent: setting the same value again is not a change.
    store.setOverride("phenol", 9);
    expect(calls).toBe(1);
    unsubscribe();
    store.setOverride("phenol", 8);
    expect(calls).toBe(1);
  });

  it("drops junk that arrives from storage rather than rendering it", () => {
    const storage = fakeStorage({
      [PKA_SETTINGS_KEY]: JSON.stringify({
        presetId: 42,
        overrides: { phenol: "nine", not_a_rung: 3, alkane_ch: 900, water: 14 },
      }),
    });
    const snapshot = createPkaSettings(storage).getSnapshot();
    expect(snapshot.presetId).toBe(COURSE_PRESET_ID);
    expect(snapshot.overrides).toEqual({ water: 14 });
  });

  it("refuses an off the ladder value AT THE SETTER, not only on the way back in", () => {
    // The regression this is here for: when only `sanitiseOverrides` checked
    // the range, a caller that was not the settings form could store 900, see
    // it work for the whole session, and lose it on the next reload. A floor
    // the writer does not enforce is not a floor.
    const storage = fakeStorage();
    const store = createPkaSettings(storage);

    expect(store.setOverride("phenol", PKA_INPUT_MAX + 1)).toBe(false);
    expect(store.setOverride("phenol", PKA_INPUT_MIN - 1)).toBe(false);
    expect(store.setOverride("phenol", Number.NaN)).toBe(false);
    expect(store.setOverride("phenol", Number.POSITIVE_INFINITY)).toBe(false);
    expect(store.getSnapshot().overrides).toEqual({});

    // The ends themselves are inside the window, so this rejects a typo and
    // not an opinion.
    expect(store.setOverride("phenol", PKA_INPUT_MAX)).toBe(true);
    expect(store.setOverride("phenol", PKA_INPUT_MIN)).toBe(true);
    expect(store.getSnapshot().overrides.phenol).toBe(PKA_INPUT_MIN);

    // What the setter accepted is what a reload gives back, which is the
    // property the two checks agreeing actually buys.
    expect(createPkaSettings(storage).getSnapshot().overrides.phenol).toBe(PKA_INPUT_MIN);
  });

  it("agrees with what the form would have told the student", () => {
    // One range, asked two ways. `pkaInputRejection` speaks to a student and
    // `isStorablePka` speaks to a caller, and a value the first accepts that
    // the second refuses would be a save that quietly does nothing.
    const store = createPkaSettings(fakeStorage());
    for (const raw of ["-25", "-24.9", "0", "4.8", "65", "65.1", "-30", "480", "1e9"]) {
      const typed = parsePkaInput(raw);
      const readable = pkaInputRejection(raw) === null;
      expect(readable).toBe(typed !== null);
      if (typed === null) continue;
      expect(isStorablePka(typed)).toBe(true);
      expect(store.setOverride("phenol", typed)).toBe(true);
    }
  });

  it("refuses a typed value that is not a number or is off the ladder, and says why", () => {
    expect(pkaInputRejection("4.8")).toBeNull();
    expect(pkaInputRejection("-7")).toBeNull();
    expect(parsePkaInput(" 10 ")).toBe(10);

    expect(pkaInputRejection("about ten")).toContain("plain number");
    expect(pkaInputRejection("")).toContain("Type a number");
    expect(pkaInputRejection("480")).toContain("slipped digit");
    expect(parsePkaInput("480")).toBeNull();
  });
});

describe("authored orderings stay true under every table", () => {
  it("the corpus links still match the corpus", () => {
    // A renamed item id would leave that item with no value, and an item with
    // no value is skipped by the conflict check, so this is the assertion that
    // stops the report going quiet exactly when it matters.
    expect(pkaLinkDefects()).toEqual([]);
    expect(PKA_LADDER_LINKS.length).toBeGreaterThan(0);
  });

  it("the shipped default table contradicts nothing", () => {
    expect(pkaOrderingConflicts(DEFAULT_PKA_SETTINGS)).toEqual([]);
  });

  it("an override that flips an authored ladder is detected and reported", () => {
    // The acidity ladder is authored carboxylic acid, then phenol, then the
    // malonic ester C-H, then a plain ketone. A professor who teaches phenol at
    // 3 puts it above the carboxylic acid, which the authored answer does not.
    const settings: PkaSettingsSnapshot = {
      presetId: COURSE_PRESET_ID,
      overrides: { phenol: 3 },
    };
    const conflicts = pkaOrderingConflicts(settings);
    const flipped = conflicts.filter((conflict) => conflict.kind === "order_flipped");

    expect(flipped.length).toBe(1);
    const only = flipped[0];
    if (only === undefined) throw new Error("expected a flipped ordering");
    expect(only.problemId).toBe("org2-order-acidity-ladder");
    expect(only.earlier.itemId).toBe("carboxylic-acid");
    expect(only.later.itemId).toBe("phenol");
    expect(only.earlier.value).toBe(5);
    expect(only.later.value).toBe(3);
    // The report is a sentence a student can act on, and it says what did NOT
    // change: the number stays theirs and the question still grades as authored.
    // The flag names the CARD the student dragged, in the problem's own words.
    expect(only.message).toContain("phenol O-H");
    expect(only.message).toContain("carboxylic acid O-H");
    expect(only.message.toLowerCase()).toContain("still");
  });

  it("applies the flipping override anyway, because discarding it is the wrong fix", () => {
    const settings: PkaSettingsSnapshot = {
      presetId: COURSE_PRESET_ID,
      overrides: { phenol: 3 },
    };
    expect(pkaValueFor(settings, "phenol")).toBe(3);
    expect(resolvePka(settings, "phenol").origin).toBe("override");
  });

  it("names a broken tie as a broken tie, not as a flipped ladder", () => {
    // The course worksheet puts a phenol and the C-H between two carbonyls both
    // at 10, and the problem records that tie as an accepted alternative order.
    // The textbook preset prints the malonic ester near 13, so those two stop
    // being level. This is a shipped preset raising a real flag on purpose.
    const conflicts = pkaOrderingConflicts(withPreset(TEXTBOOK_PRESET_ID));
    expect(conflicts.length).toBe(1);
    const only = conflicts[0];
    if (only === undefined) throw new Error("expected a broken tie");
    expect(only.kind).toBe("tie_broken");
    expect(new Set([only.earlier.itemId, only.later.itemId])).toEqual(
      new Set(["beta-dicarbonyl", "phenol"]),
    );
    expect(only.message).toContain("either order between them is accepted");
  });

  it("flags a table that levels two rungs the problem ranks strictly", () => {
    // No accepted alternative records a tie between the carboxylic acid and the
    // phenol, so a table that makes them equal leaves the numbers unable to
    // decide. That is a different sentence from a flip and it gets one.
    const settings: PkaSettingsSnapshot = {
      presetId: COURSE_PRESET_ID,
      overrides: { phenol: 5 },
    };
    const conflicts = pkaOrderingConflicts(settings);
    const levelled = conflicts.filter((conflict) => conflict.kind === "tie_unrecorded");
    expect(levelled.length).toBe(1);
    const only = levelled[0];
    if (only === undefined) throw new Error("expected a levelled pair");
    expect(only.earlier.itemId).toBe("carboxylic-acid");
    expect(only.later.itemId).toBe("phenol");
    expect(only.message).toContain("the same value");
  });

  it("reports one disagreement once, taking the more specific reading", () => {
    // phenol at 3 flips the primary order AND breaks the recorded tie. The
    // carboxylic acid pair and the malonic ester pair are two different
    // disagreements, so two flags; neither pair is reported twice.
    const conflicts = pkaOrderingConflicts({
      presetId: COURSE_PRESET_ID,
      overrides: { phenol: 3 },
    });
    const pairs = conflicts.map((conflict) =>
      [conflict.earlier.itemId, conflict.later.itemId].sort().join("|"),
    );
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(conflicts.length).toBe(2);
  });

  it("checks a hand authored sort beat through the same function", () => {
    const beat: SortBeat = {
      id: "beat-acidity-demo",
      kind: "sort",
      node: "pka_and_acidity",
      conceptIds: ["pka_ladder"],
      levels: DEFAULT_LEVELS.sort,
      prompt: "Put these in order, most acidic first.",
      criterion: "pka",
      direction: "ascending",
      items: [
        { id: "acid", label: "Carboxylic acid O-H", pkaSiteId: "carboxylic_acid" },
        { id: "alcohol", label: "Alcohol O-H", pkaSiteId: "alcohol" },
      ],
      order: ["acid", "alcohol"],
    };

    expect(sortBeatPkaConflicts(beat, DEFAULT_PKA_SETTINGS)).toEqual([]);

    const flipped = sortBeatPkaConflicts(beat, {
      presetId: COURSE_PRESET_ID,
      overrides: { alcohol: 2 },
    });
    expect(flipped.length).toBe(1);
    expect(flipped[0]?.earlier.itemId).toBe("acid");
    expect(flipped[0]?.later.itemId).toBe("alcohol");
  });
});

describe("one layer, and the sort beat is on it", () => {
  // The critic's finding this exists to close: for a while there were two pKa
  // settings layers with two snapshot shapes and two accessors, and the only
  // real consumer read the other one. There is now one, and the number a sort
  // card prints comes out of it. `sortItemValue` is the exact lookup
  // SortBeatView passes to the conflict check and reads each card's value
  // through, so testing it is testing what a student sees.
  const acidity = SORT_LADDERS.find((content) => content.beat.id === "sort-pka-hierarchy");

  it("every shipped ladder built on pKa rungs is one the settings page reports on", () => {
    // The gap this closes, and it is the quiet kind. `pkaOrderingConflicts`
    // walks PKA_LADDER_LINKS, and a link can only point at a problem in the
    // curriculum corpus. A pKa ladder authored straight into ladders.ts, with
    // its problem built locally, would render pKa numbers on its cards and
    // never appear in the conflict panel, so a student could set a value that
    // contradicts it and be told nothing. Nobody would notice, because the
    // panel would look clean. This turns that into a failing build: a new pKa
    // ladder either goes into the corpus with a link beside it, or this test
    // says out loud that it is unreported.
    const linkedProblems = new Set(PKA_LADDER_LINKS.map((link) => link.problemId));
    for (const content of SORT_LADDERS) {
      const rungs = content.beat.items.filter((item) => item.pkaSiteId !== undefined);
      if (rungs.length === 0) continue;
      expect({ beat: content.beat.id, linked: linkedProblems.has(content.problem.id) }).toEqual({
        beat: content.beat.id,
        linked: true,
      });

      // And the link stands on the same rungs the cards print, so the panel
      // reports the pair the student is actually looking at.
      const link = PKA_LADDER_LINKS.find((candidate) => candidate.problemId === content.problem.id);
      if (link === undefined) throw new Error(`no link for ${content.problem.id}`);
      for (const item of rungs) {
        expect({ item: item.id, site: link.sites[item.id] }).toEqual({
          item: item.id,
          site: item.pkaSiteId,
        });
      }
    }
  });

  it("the shipped acidity ladder is still built on pKa rungs", () => {
    if (acidity === undefined) throw new Error("sort-pka-hierarchy is missing from SORT_LADDERS");
    expect(acidity.beat.items.every((item) => item.pkaSiteId !== undefined)).toBe(true);
  });

  it("a card in a lesson prints the student's number, not the shipped one", () => {
    if (acidity === undefined) throw new Error("sort-pka-hierarchy is missing from SORT_LADDERS");
    const phenolCard = acidity.beat.items.find((item) => item.pkaSiteId === "phenol");
    if (phenolCard === undefined) throw new Error("the acidity ladder has no phenol card");

    expect(sortItemValue(DEFAULT_PKA_SETTINGS)(phenolCard)).toBe(PKA_TABLE.phenol.pka);
    expect(sortItemValue({ presetId: COURSE_PRESET_ID, overrides: { phenol: 9.5 } })(phenolCard)).toBe(
      9.5,
    );
  });

  it("leaves a card with no rung alone rather than inventing one for it", () => {
    // The acyl ladder is ranked by reactivity and not by pKa. A lookup that
    // guessed a number there would flag conflicts on a question pKa has no
    // opinion about.
    const acyl = SORT_LADDERS.find((content) => content.beat.criterion !== "pka");
    if (acyl === undefined) throw new Error("expected a ladder ranked by something other than pKa");
    for (const item of acyl.beat.items) {
      expect(sortItemValue(DEFAULT_PKA_SETTINGS)(item)).toBeUndefined();
    }
  });
});

describe("formatting keeps the precision the course teaches", () => {
  it("prints a whole number whole and a decimal to its own digits", () => {
    expect(formatPka(16)).toBe("16");
    expect(formatPka(15.7)).toBe("15.7");
    expect(formatPka(-1.7)).toBe("-1.7");
    expect(formatPka(-7)).toBe("-7");
  });
});
