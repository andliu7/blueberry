/**
 * The decision point and the slideshow, as arithmetic.
 *
 * Two grades kept apart: gradeBranch only speaks once the arrows are right,
 * and then it says whether the route was the favoured one. The strip's
 * nodes are one per step plus the product, and never reach ahead of the
 * live step. The registry half holds every authored fork to the shape the
 * engine assumes: exactly one favoured route, a named cause on every other,
 * and each route's step gradeable against its own arrows.
 */

import { describe, expect, it } from "vitest";
import { arrowLegalityFindings } from "@blueberry/chem-core";
import { gradeDrawing } from "../tabs/trainer/grade";
import { chooserOrder, clampView, gradeBranch, highlightedNode, stripNodes } from "../tabs/trainer/engine/forkModel";
import { favouredRoute, questionFromSequence } from "../tabs/trainer/engine/question";
import { TRAINER_SEQUENCES } from "../demo/sequences";

const forked = TRAINER_SEQUENCES.filter((entry) => entry.steps.some((step) => step.fork !== undefined));

describe("the registry's forks", () => {
  it("has at least one authored decision point", () => {
    expect(forked.length).toBeGreaterThanOrEqual(1);
  });

  for (const entry of forked) {
    for (const [index, item] of entry.steps.entries()) {
      const fork = item.fork;
      if (fork === undefined) continue;
      describe(`${entry.id} step ${index + 1}`, () => {
        it("offers two or three routes and exactly one favoured", () => {
          expect(fork.routes.length).toBeGreaterThanOrEqual(2);
          expect(fork.routes.length).toBeLessThanOrEqual(3);
          expect(fork.routes.filter((route) => route.favoured)).toHaveLength(1);
        });

        it("names a cause on every route that is not favoured", () => {
          for (const route of fork.routes) {
            if (!route.favoured) expect(route.cause, route.id).toBeDefined();
          }
        });

        it("plays the favoured route as the step's own arrows", () => {
          expect(favouredRoute(fork).step).toBe(item.step);
        });

        it("states the conditions the choice turns on", () => {
          expect(fork.conditions.trim().length).toBeGreaterThan(0);
        });

        for (const route of fork.routes) {
          it(`${route.id} carries legal arrows that grade correct on its own step`, () => {
            expect(arrowLegalityFindings(route.step.arrows, route.step.from)).toEqual([]);
            expect(gradeDrawing(route.step, route.step.arrows).kind).toBe("correct");
          });
        }
      });
    }
  }
});

describe("gradeBranch", () => {
  const entry = forked[0];
  if (entry === undefined) throw new Error("no fork authored");
  const fork = entry.steps.find((step) => step.fork !== undefined)?.fork;
  if (fork === undefined) throw new Error("no fork");
  const winner = favouredRoute(fork);
  const loser = fork.routes.find((route) => !route.favoured);
  if (loser === undefined) throw new Error("no losing route");

  it("says nothing until the arrows are right", () => {
    expect(gradeBranch(fork, loser, { kind: "incomplete", drawn: 1, needed: 2 })).toBeNull();
    expect(gradeBranch(fork, loser, { kind: "not_requested", missing: 1, extra: 0 })).toBeNull();
  });

  it("passes the favoured route", () => {
    const verdict = gradeBranch(fork, winner, gradeDrawing(winner.step, winner.step.arrows));
    expect(verdict).toEqual({ kind: "favoured", route: winner });
  });

  it("names the cause and the winning route for a branch the conditions do not favour", () => {
    const verdict = gradeBranch(fork, loser, gradeDrawing(loser.step, loser.step.arrows));
    expect(verdict?.kind).toBe("not_favoured");
    if (verdict?.kind !== "not_favoured") return;
    expect(verdict.cause).toBe(loser.cause);
    expect(verdict.favoured).toBe(winner);
  });
});

describe("the chooser's order says nothing", () => {
  it("draws routes in label order, whatever order they were authored in", () => {
    for (const entry of forked) {
      for (const item of entry.steps) {
        if (item.fork === undefined) continue;
        const labels = chooserOrder(item.fork.routes).map((route) => route.label);
        expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
      }
    }
  });

  it("does not put the favoured route first in every fork", () => {
    const firsts = forked.flatMap((entry) =>
      entry.steps.filter((item) => item.fork !== undefined).map((item) => chooserOrder(item.fork!.routes)[0]!.favoured),
    );
    expect(firsts.some((favouredFirst) => !favouredFirst)).toBe(true);
  });
});

describe("the strip", () => {
  it("has no nodes for a single-step question", () => {
    const single = { ...questionFromSequence(forked[0]!), steps: questionFromSequence(forked[0]!).steps.slice(0, 1) };
    expect(stripNodes(single)).toEqual([]);
  });

  it("has one node per step and a product node, and marks the fork", () => {
    const question = questionFromSequence(forked[0]!);
    const nodes = stripNodes(question);
    expect(nodes).toHaveLength(question.steps.length + 1);
    expect(nodes[nodes.length - 1]?.kind).toBe("product");
    expect(nodes.some((node) => node.fork)).toBe(true);
  });

  it("never reaches ahead of the live step", () => {
    expect(clampView(5, 1)).toBe(1);
    expect(clampView(-3, 1)).toBe(0);
    expect(highlightedNode(1, null, false, 3)).toBe(1);
    expect(highlightedNode(1, 0, false, 3)).toBe(0);
    expect(highlightedNode(2, null, true, 3)).toBe(3);
  });
});
