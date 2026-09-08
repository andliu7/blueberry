/**
 * PHASE 2 EXIT CONDITION: tap only completion verified across the full corpus.
 *
 * Not one demonstration. Every good fixture in packages/validators/fixtures, every
 * step of it, replayed through the real state machine with nothing but pointerDown
 * and pointerUp at the same point, asserting that the arrows the machine committed
 * are the arrows the fixture authored.
 *
 * If a fixture cannot be completed tap only, that is a finding about the machine
 * and it is reported by name here rather than special cased away.
 */

import { describe, expect, it } from "vitest";

import { loadGoodFixtures, replayStepTapOnly, type StepReplay } from "./corpus.js";

const FIXTURES = loadGoodFixtures();

interface FixtureResult {
  readonly id: string;
  readonly steps: readonly StepReplay[];
  readonly ok: boolean;
}

const RESULTS: readonly FixtureResult[] = FIXTURES.map((fixture) => {
  const steps = fixture.steps.map(replayStepTapOnly);
  return { id: fixture.id, steps, ok: steps.every((step) => step.ok) };
});

function failures(): readonly string[] {
  return RESULTS.filter((result) => !result.ok).flatMap((result) =>
    result.steps
      .filter((step) => !step.ok)
      .map((step) => `${result.id} / ${step.stepId}: ${step.problems.join("; ")}`),
  );
}

describe("the corpus is real before anything is claimed about it", () => {
  it("finds good fixtures, and would fail rather than report a sweep of nothing", () => {
    // A number here would go stale the first time a fixture is authored, and a
    // harness that passes on an empty corpus is the exact failure the validators
    // package exists to prevent. So: a floor, not a literal.
    expect(FIXTURES.length).toBeGreaterThanOrEqual(40);
  });

  it("every good fixture carries at least one step with at least one arrow", () => {
    const empty = FIXTURES.filter(
      (fixture) =>
        fixture.steps.length === 0 || fixture.steps.every((step) => step.arrows.length === 0),
    ).map((fixture) => fixture.id);
    expect(empty).toEqual([]);
  });
});

describe("tap only completion across the full corpus", () => {
  it("every good fixture completes with taps alone, and the arrows match the authored ones", () => {
    expect(failures()).toEqual([]);
    expect(RESULTS.filter((result) => result.ok).length).toBe(RESULTS.length);
  });

  it("not one pointerMove or pointerCancel was sent anywhere in the corpus", () => {
    const drags = RESULTS.flatMap((result) =>
      result.steps.flatMap((step) =>
        step.events.filter((kind) => kind === "pointerMove" || kind === "pointerCancel"),
      ),
    );
    expect(drags).toEqual([]);
  });

  it("costs exactly two taps per authored arrow, which is the ergonomics claim", () => {
    const mismatched = RESULTS.flatMap((result) =>
      result.steps
        .filter((step) => step.taps !== step.authored.length * 2)
        .map((step) => `${result.id} / ${step.stepId}: ${step.taps} taps for ${step.authored.length} arrows`),
    );
    expect(mismatched).toEqual([]);
  });

  it("reports the corpus numbers", () => {
    const steps = RESULTS.reduce((sum, result) => sum + result.steps.length, 0);
    const arrows = RESULTS.reduce(
      (sum, result) => sum + result.steps.reduce((n, step) => n + step.authored.length, 0),
      0,
    );
    const taps = RESULTS.reduce(
      (sum, result) => sum + result.steps.reduce((n, step) => n + step.taps, 0),
      0,
    );
    const electronCommands = RESULTS.reduce(
      (sum, result) => sum + result.steps.reduce((n, step) => n + step.electronCountCommands, 0),
      0,
    );
    // eslint-disable-next-line no-console
    console.log(
      `TAP ONLY CORPUS: ${RESULTS.filter((r) => r.ok).length} of ${RESULTS.length} good fixtures, ` +
        `${steps} steps, ${arrows} authored arrows, ${taps} taps, ` +
        `${electronCommands} electron count commands`,
    );
    expect(arrows * 2).toBe(taps);
  });
});

describe("each good fixture, named, so a failure says which one", () => {
  for (const result of RESULTS) {
    it(`${result.id} is completable tap only`, () => {
      const problems = result.steps.filter((step) => !step.ok);
      expect(problems.map((step) => `${step.stepId}: ${step.problems.join("; ")}`)).toEqual([]);
    });
  }
});
