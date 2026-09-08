/**
 * The Charge sheet's model, against real snapshots from real journals.
 *
 * Nothing here builds an EconomySnapshot by hand. Every case runs a journal
 * through `deriveEconomy`, so a price that moves in packages/economy shows up
 * as a failing sentence rather than as a fixture that quietly still passes.
 * Same rule hudModel.test.ts is written under, and the same reason.
 *
 * THE LOAD BEARING TEST IS THE LAST BLOCK. docs/ECONOMY.md's Charge table says
 * a wrong answer costs 0 and calls the row "load bearing. Do not let this
 * drift", and the Supersession section lists "Charge never pricing a mistake"
 * among the mitigations that must not be stripped one at a time. The economy
 * package proves the arithmetic; this file proves the SURFACE, which is where a
 * student would actually see a change: it appends wrong attempts to a journal
 * and asserts the whole model, every number and every sentence, is unchanged.
 * "Never show a charge change anywhere" is a claim about what is on screen, so
 * it is tested against what the screen is told to draw.
 */

import { describe, expect, it } from "vitest";
import {
  CHARGE_CAP,
  CHARGE_COST,
  SINK_COST,
  deriveEconomy,
  type EconomyEvent,
  type NodeKind,
} from "@blueberry/economy";
import { chargeGateModel, formatCountdown, type ChargeGateNode } from "../charge/chargeGateModel";

const TZ = "UTC";
const NOW = "2026-08-28T14:00:00.000Z";

function minutesAgo(minutes: number): string {
  return new Date(Date.parse(NOW) - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * 86_400_000).toISOString();
}

/** Entering a node is what spends charge. Never per question. */
function started(nodeId: string, nodeKind: NodeKind, at: string): EconomyEvent {
  return { kind: "node_started", at, tz: TZ, nodeId, nodeKind };
}

/** A wrong answer, journalled. It earns nothing and it costs nothing. */
function wrong(nodeId: string, problemId: string, at: string): EconomyEvent {
  return { kind: "attempt", at, tz: TZ, nodeId, problemId, correct: false };
}

const NODE: ChargeGateNode = {
  id: "lesson:aromaticity",
  kind: "reaction",
  title: "Electrophilic aromatic substitution",
  href: "#/lesson/u3-arenium",
};

function model(journal: readonly EconomyEvent[], node: ChargeGateNode = NODE, now = NOW) {
  return chargeGateModel(deriveEconomy(journal, now), node);
}

/**
 * Node entries, today, until the meter is below `floor`.
 *
 * It returns a journal rather than a target balance on purpose: charge only
 * comes off in the sizes ECONOMY.md prices, so "leave exactly 3" is not a state
 * this economy can be in, and a helper that pretended otherwise would be
 * asserting against a meter the product cannot show. Callers that need the
 * remaining number read it back off `deriveEconomy`.
 */
function drainBelow(floor: number): EconomyEvent[] {
  const events: EconomyEvent[] = [];
  let spent = 0;
  let i = 0;
  while (CHARGE_CAP - spent >= floor) {
    events.push(started(`seed:${i}`, "reaction", minutesAgo(24 - i)));
    spent += CHARGE_COST.reaction;
    i += 1;
  }
  return events;
}

/** The meter as the derivation reports it, for a test that must not guess. */
function chargeLeft(journal: readonly EconomyEvent[], now = NOW): number {
  return deriveEconomy(journal, now).charge.current;
}

describe("the ready state", () => {
  it("prices a reaction node from rules.ts and never from a literal here", () => {
    const gate = model([]);
    expect(gate.state).toBe("ready");
    expect(gate.cost).toBe(CHARGE_COST.reaction);
    expect(gate.before).toBe(CHARGE_CAP);
    expect(gate.after).toBe(CHARGE_CAP - CHARGE_COST.reaction);
  });

  it("leads with the price, not with the node's name", () => {
    const gate = model([]);
    // The headline slot carries a RULE in all four states, so the ready state
    // puts the price there and the node's own title is drawn above it. A sheet
    // whose headline is sometimes a title and sometimes a notice is two sheets.
    expect(gate.headline).toBe("8 charge to start");
    expect(gate.headline).not.toBe(NODE.title);
    expect(gate.line).toBe("You will have 22 left, and it refills on its own.");
    // The journal is untouched by opening the sheet: the model is a read.
    expect(gate.primaryLabel).toBe("Start");
  });

  it("puts the same shape of headline on every state, so the four read as one surface", () => {
    const drained = drainBelow(CHARGE_COST.reaction);
    const headlines = [
      model([]).headline,
      model([], { ...NODE, kind: "review" }).headline,
      model(drained).headline,
      model([{ kind: "settings", at: daysAgo(20), tz: TZ, examDate: "2026-09-06" }]).headline,
    ];
    // None of them is the node's title, and none of them is empty.
    for (const headline of headlines) {
      expect(headline).not.toBe(NODE.title);
      expect(headline.length).toBeGreaterThan(0);
    }
  });

  it("carries the promise about mistakes in every state that shows a cost", () => {
    for (const kind of ["concept", "reaction", "branch", "quiz"] as const) {
      const gate = model([], { ...NODE, kind });
      expect(gate.promise).toContain("Wrong answers cost nothing");
    }
  });

  it("promises the quiz refund before entry, because ECONOMY.md refunds it on a pass", () => {
    const gate = model([], { ...NODE, kind: "quiz" });
    expect(gate.refund).toBe(true);
    expect(gate.cost).toBe(CHARGE_COST.quiz);
    expect(gate.headline).toBe(`${CHARGE_COST.quiz} charge to start`);
    expect(gate.line).toBe(`All ${CHARGE_COST.quiz} come back when you pass, so a clean run costs nothing.`);
  });
});

describe("the free state", () => {
  it("is free for exactly the kinds ECONOMY.md prices at zero", () => {
    for (const kind of ["review", "tutorial", "intro"] as const) {
      const gate = model([], { ...NODE, kind });
      expect(CHARGE_COST[kind]).toBe(0);
      expect(gate.state).toBe("free");
      expect(gate.cost).toBe(0);
      expect(gate.after).toBe(gate.before);
    }
  });

  it("says why a review drill is free in the drill's own words", () => {
    const gate = model([], { ...NODE, kind: "review" });
    expect(gate.headline).toBe("Review drills are always free");
    expect(gate.line).toBe("Nothing that repairs your memory is ever gated.");
  });

  it("names the tutorial and the intro lessons rather than saying free twice", () => {
    expect(model([], { ...NODE, kind: "tutorial" }).headline).toBe("The tutorial is always free");
    expect(model([], { ...NODE, kind: "intro" }).headline).toBe("Intro lessons are always free");
  });

  it("is still free with an empty meter, because a drill is never gated", () => {
    const gate = model(drainBelow(CHARGE_COST.reaction), { ...NODE, kind: "review" });
    expect(gate.state).toBe("free");
  });
});

describe("the empty state", () => {
  const journal = drainBelow(CHARGE_COST.reaction);

  it("appears when the meter is short of the cost, and never before", () => {
    expect(chargeLeft(journal)).toBeLessThan(CHARGE_COST.reaction);
    expect(model(journal).state).toBe("empty");
    // One entry back is still affordable, so the sheet is not a mood.
    expect(model(journal.slice(0, -1)).state).toBe("ready");
  });

  it("names what it costs, what is there, and when the next point lands", () => {
    const gate = model(journal);
    expect(gate.line).toContain(`cost ${CHARGE_COST.reaction}`);
    expect(gate.line).toContain(`you have ${chargeLeft(journal)}`);
    expect(gate.line).toContain("Next point in");
    expect(gate.refill).not.toBeNull();
  });

  it("opens the sentence with a real plural, in a real capital", () => {
    // "unit quizs cost 10" is what a template's plural rule produces, and it
    // opened the sentence in lower case besides. Both are the kind of thing a
    // student notices and nothing else catches.
    const drained = drainBelow(CHARGE_COST.quiz);
    expect(model(drained, { ...NODE, kind: "quiz" }).line).toContain("Unit quizzes cost");
    expect(model(journal).line).toContain("Reaction nodes cost");
    expect(model(drainBelow(CHARGE_COST.concept), { ...NODE, kind: "concept" }).line).toContain("Concept nodes cost");
    for (const kind of ["concept", "reaction", "branch", "quiz"] as const) {
      const line = model(drainBelow(CHARGE_COST[kind]), { ...NODE, kind }).line;
      expect(line[0]).toBe(line[0]?.toUpperCase());
      expect(line).not.toMatch(/\bquizs\b/);
    }
  });

  it("offers the free way out as the primary action, because it is the true one", () => {
    expect(model(journal).primaryLabel).toBe("Review drills are always free");
  });

  it("prices the top up from SINK_COST and says whether it is affordable", () => {
    const poor = model(journal);
    expect(poor.topUp?.cost).toBe(SINK_COST.charge_topup);
    expect(poor.topUp?.affordable).toBe(false);

    // Two spine clears and a streak milestone put a real balance behind it.
    const rich = model([
      ...journal,
      { kind: "boss_cleared", at: daysAgo(1), tz: TZ, bossId: "u15-boss" },
    ]);
    expect(rich.topUp?.affordable).toBe(true);
    expect(rich.topUp?.label).toContain(String(SINK_COST.charge_topup));
  });

  it("says out loud that none of the drain was a wrong answer", () => {
    expect(model(journal).promise).toContain("Being wrong has never cost you charge");
  });

  it("reads the refill from the derivation rather than counting down locally", () => {
    const gate = model(journal);
    // nextFraction is 1 minus the remaining share of one regeneration interval,
    // so it is between 0 and 1 and it moves with `now` and with nothing else.
    expect(gate.refill!.nextFraction).toBeGreaterThanOrEqual(0);
    expect(gate.refill!.nextFraction).toBeLessThanOrEqual(1);
    // Five minutes on, still inside the same interval: the fraction has moved
    // and nothing else has. Crossing a boundary would reset it to zero, which
    // is correct and is why the step is deliberately short of one.
    const later = model(journal, NODE, new Date(Date.parse(NOW) + 5 * 60_000).toISOString());
    expect(later.refill!.nextFraction).toBeGreaterThan(gate.refill!.nextFraction);
  });
});

describe("the exam window", () => {
  const examJournal: readonly EconomyEvent[] = [
    { kind: "settings", at: daysAgo(20), tz: TZ, examDate: "2026-09-06" },
    ...drainBelow(CHARGE_COST.reaction),
  ];

  it("costs nothing whatever the node is and whatever the meter says", () => {
    const gate = model(examJournal);
    expect(gate.state).toBe("exam");
    expect(gate.cost).toBe(0);
    expect(gate.primaryLabel).toBe("Start");
  });

  it("writes the sentence ECONOMY.md writes", () => {
    const gate = model(examJournal);
    expect(gate.headline).toBe("Exam in 9 days. No limits until then.");
  });

  it("does not count down at the exam itself, where a countdown is the wrong gesture", () => {
    const eve: readonly EconomyEvent[] = [{ kind: "settings", at: daysAgo(20), tz: TZ, examDate: "2026-08-29" }];
    expect(model(eve).headline).toBe("Exam tomorrow. No limits until it is done.");
  });

  it("draws no meter to read: the refill and the top up are both absent", () => {
    const gate = model(examJournal);
    expect(gate.refill).toBeNull();
    expect(gate.topUp).toBeNull();
  });
});

describe("countdown wording", () => {
  it("never shows a bare count of seconds", () => {
    expect(formatCountdown(20_000)).toBe("under a minute");
    expect(formatCountdown(14 * 60_000)).toBe("14 min");
    expect(formatCountdown(0)).toBe("any moment");
    expect(formatCountdown(Number.NaN)).toBe("any moment");
  });
});

/* ==========================================================================
 * A WRONG ANSWER NEVER SHOWS A CHARGE CHANGE ANYWHERE.
 *
 * docs/ECONOMY.md, Charge: "A wrong answer | 0 | Load bearing. Do not let this
 * drift." The economy package proves the arithmetic. This proves the surface,
 * which is the only place a student could ever see it drift.
 *
 * The assertion is deliberately on the WHOLE model rather than on `cost` and
 * `before`. A future change that priced a mistake somewhere subtler, in the
 * refill estimate, in the top up note, in a sentence that said "you lost one",
 * would slip past a test that only compared two integers. Comparing the model
 * catches any of those, because every word on the sheet is in it.
 * ========================================================================== */
describe("wrong answers are free, and the sheet says nothing different about them", () => {
  const kinds: readonly NodeKind[] = ["concept", "reaction", "branch", "quiz", "review", "tutorial", "intro"];

  /** Ten wrong answers on the node the student is about to enter. */
  function withMisses(journal: readonly EconomyEvent[]): readonly EconomyEvent[] {
    const misses: EconomyEvent[] = [];
    for (let i = 0; i < 10; i += 1) misses.push(wrong(NODE.id, `p${i}`, minutesAgo(3)));
    return [...journal, ...misses];
  }

  const cases: readonly { readonly name: string; readonly journal: readonly EconomyEvent[] }[] = [
    { name: "ready", journal: [] },
    { name: "empty", journal: drainBelow(CHARGE_COST.reaction) },
    { name: "exam", journal: [{ kind: "settings", at: daysAgo(20), tz: TZ, examDate: "2026-09-06" }] },
  ];

  for (const scenario of cases) {
    for (const kind of kinds) {
      it(`${scenario.name}, ${kind}: ten wrong answers change nothing on the sheet`, () => {
        const node = { ...NODE, kind };
        const before = model(scenario.journal, node);
        const after = model(withMisses(scenario.journal), node);
        expect(after).toEqual(before);
      });
    }
  }

  it("a wrong answer does not move the meter itself either", () => {
    const journal = drainBelow(CHARGE_COST.quiz);
    const before = deriveEconomy(journal, NOW).charge.current;
    const after = deriveEconomy(withMisses(journal), NOW).charge.current;
    expect(after).toBe(before);
  });

  it("no sentence on the sheet ever prices a mistake", () => {
    for (const scenario of cases) {
      for (const kind of kinds) {
        const gate = model(withMisses(scenario.journal), { ...NODE, kind });
        const prose = `${gate.headline} ${gate.line} ${gate.promise} ${gate.primaryLabel} ${gate.label}`;
        // The only sentences about wrongness on this surface say it is free.
        expect(prose).not.toMatch(/wrong answers? costs? \d/i);
        expect(prose).not.toMatch(/mistakes? costs? \d/i);
        expect(prose).not.toMatch(/lost|lose|penalt/i);
      }
    }
  });
});
