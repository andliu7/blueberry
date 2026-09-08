/**
 * THE PLACEMENT'S DRAWN CHEMISTRY, AND THE ONE THING THAT MAKES IT SAFE.
 *
 * Owner ruling 2026-09-04: "EVERY QUESTION CARRIES A VISUAL", and "OPTION
 * CARDS ARE PICTURES WITH CAPTIONS, not captions with pictures". The placement
 * quiz is the one onboarding screen where a real chemistry question appears,
 * so it is the one screen that ruling actually binds, and a previous pass
 * shipped it as prose on the true observation that `ChoiceOption` in
 * packages/curriculum is `{ id, text }` with no figure field.
 *
 * The figures are therefore authored in apps/web/src/onboarding/figures.ts,
 * keyed by the corpus's own `problemId::optionId` pairs, as an explicit shim
 * until that field exists. THIS FILE IS WHAT KEEPS THAT HONEST. A hand written
 * table beside a corpus it does not live in is exactly the kind of thing that
 * silently goes stale: a new question is authored, nobody remembers the table,
 * and a student meets a bare word on the screen that was supposed to be the
 * proof the ruling was implemented.
 *
 * So the coverage test does not read a list of ids. It DRIVES THE REAL QUIZ
 * MACHINE, every claimed course by every answer pattern, collects the problems
 * the walk can actually serve, and asserts a figure for every option of every
 * choice question among them. Add a question to SEED_CORPUS with no figure and
 * this goes red; delete an option and the orphan check goes red the other way.
 *
 * NO WALL CLOCK IS READ HERE AND NONE IS READ BY THE SUBJECT. `elapsedSeconds`
 * is supplied as event data exactly as the shell supplies it, which is what
 * LOG.md's "The instruments that only worked before dark" asks of anything
 * that measures a surface: this file gives the same answer at 9am and at 11pm.
 */

import { describe, expect, it } from "vitest";

import {
  QUESTION_CAP,
  SEED_CORPUS,
  createQuiz,
  reduceQuiz,
  type AnswerState,
  type ChoiceOption,
  type CourseId,
  type Problem,
  type QuizState,
} from "@blueberry/curriculum";

import { figureFor, figureKeys, formulaRuns } from "../onboarding/figures";

/* ------------------------------------------------------------------ */
/* Walking the machine                                                 */
/* ------------------------------------------------------------------ */

/** The claimed courses the funnel can hand the quiz. See flow.claimedCourseForWhy. */
const CLAIMED: readonly (CourseId | null)[] = [
  null,
  "orgo_2",
  "dat",
  "mcat",
  "orgo_1",
  "gen_chem_1",
  "gen_chem_2",
];

/** How the simulated student answers. All three, because the walk branches. */
type Pattern = "right" | "wrong" | "skip";

function optionsOf(problem: Problem): readonly ChoiceOption[] | null {
  const answer = problem.answer;
  if (answer.kind === "multiple_choice") return answer.options;
  if (answer.kind === "major_product") return answer.candidates;
  return null;
}

function answerFor(problem: Problem, pattern: Pattern): AnswerState | null {
  const answer = problem.answer;
  if (answer.kind === "multiple_choice") {
    const wrong = answer.options.find((option) => option.id !== answer.correctOptionId);
    const optionId = pattern === "right" ? answer.correctOptionId : wrong?.id;
    return optionId === undefined ? null : { kind: "multiple_choice", optionId };
  }
  if (answer.kind === "major_product") {
    const wrong = answer.candidates.find((option) => option.id !== answer.correctCandidateId);
    const candidateId = pattern === "right" ? answer.correctCandidateId : wrong?.id;
    if (candidateId === undefined) return null;
    return { kind: "major_product", candidateId, reasonId: answer.correctReasonId };
  }
  // Every other shape is handed to the lesson's own ProblemView, which this
  // walk models as a skip: what it submits is that view's business, and the
  // only thing this file needs from those turns is that the walk moves on.
  return null;
}

/**
 * Every problem the placement can put in front of a student.
 *
 * Deliberately a walk rather than a filter over SEED_CORPUS. What the machine
 * serves depends on the claimed course, on the probe order, and on whether it
 * has gone backwards, and a filter would assert coverage of problems the quiz
 * never asks while missing one it does.
 */
function reachableProblems(): readonly Problem[] {
  const seen = new Set<string>();
  for (const claimed of CLAIMED) {
    for (const pattern of ["right", "wrong", "skip"] as const) {
      let state: QuizState = createQuiz({ problems: SEED_CORPUS, claimedCourse: claimed });
      // The cap plus a couple of turns of headroom, so a walk that goes
      // backwards still terminates rather than looping this test forever.
      for (let turn = 0; turn < QUESTION_CAP + 4 && state.phase !== "finished"; turn += 1) {
        const id = state.currentProblem;
        if (id === null) break;
        seen.add(id);
        const problem = SEED_CORPUS.find((candidate) => candidate.id === id);
        if (problem === undefined) break;
        const submitted = answerFor(problem, pattern);
        state =
          submitted === null
            ? reduceQuiz(state, { kind: "skipped", elapsedSeconds: 5 })
            : reduceQuiz(state, {
                kind: "answerSubmitted",
                state: submitted,
                elapsedSeconds: 5,
              });
      }
    }
  }
  return SEED_CORPUS.filter((problem) => seen.has(problem.id));
}

/* ------------------------------------------------------------------ */
/* Coverage                                                            */
/* ------------------------------------------------------------------ */

describe("the placement's answer tiles are pictures with captions", () => {
  const reachable = reachableProblems();
  const choiceProblems = reachable.filter((problem) => optionsOf(problem) !== null);

  it("the walk actually reaches choice questions, so the rest of this file means something", () => {
    // A guard on the guard. If the machine or the corpus ever stopped serving
    // choice questions at all, every assertion below would pass vacuously and
    // report that a ruling was implemented when nothing was drawn.
    expect(choiceProblems.length).toBeGreaterThan(10);
  });

  it("every option of every choice question the quiz can serve carries a drawn figure", () => {
    const missing: string[] = [];
    for (const problem of choiceProblems) {
      for (const option of optionsOf(problem) ?? []) {
        if (figureFor(problem.id, option.id) === null) {
          missing.push(`${problem.id}::${option.id}`);
        }
      }
    }
    // Named rather than counted, so the failure tells an author exactly which
    // structure to draw instead of only that one is absent.
    expect(missing).toEqual([]);
  });

  it("no figure is authored for an option that no longer exists", () => {
    const live = new Set<string>();
    for (const problem of SEED_CORPUS) {
      for (const option of optionsOf(problem) ?? []) live.add(`${problem.id}::${option.id}`);
    }
    const orphans = figureKeys().filter((authored) => !live.has(authored));
    expect(orphans).toEqual([]);
  });

  it("every figure draws something", () => {
    // A registered key holding an empty spec would pass the coverage check
    // above and still put a blank tile in front of a student, which is the
    // failure the four identical dashed placeholder frames already were.
    const empty: string[] = [];
    for (const problem of choiceProblems) {
      for (const option of optionsOf(problem) ?? []) {
        const figure = figureFor(problem.id, option.id);
        if (figure === null) continue;
        const marks =
          (figure.bonds?.length ?? 0) + (figure.labels?.length ?? 0) + (figure.rings?.length ?? 0);
        if (marks === 0) empty.push(`${problem.id}::${option.id}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it("the four options of one question are four different pictures", () => {
    // The previous pass drew a dashed picture-frame glyph, identical on all
    // four tiles, and a critic named it: four identical marks over four
    // different answers teach a student nothing. Serialising the spec is a
    // cheap way to assert the drawings actually differ.
    for (const problem of choiceProblems) {
      const drawn = (optionsOf(problem) ?? []).map((option) =>
        JSON.stringify(figureFor(problem.id, option.id)),
      );
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it("every label stays inside the figure's own viewBox", () => {
    // A label placed outside the box is not clipped by anything (the svg has
    // no clip), it simply lands over the tile's caption or off the tile
    // entirely, which is the kind of defect that only shows on the one
    // question nobody screenshotted.
    const outside: string[] = [];
    for (const authored of figureKeys()) {
      const [problemId, optionId] = authored.split("::");
      const figure = figureFor(problemId ?? "", optionId ?? "");
      for (const label of figure?.labels ?? []) {
        if (label.x < 0 || label.x > 120 || label.y < 0 || label.y > 84) outside.push(authored);
      }
      for (const bond of figure?.bonds ?? []) {
        const xs = [bond.x1, bond.x2];
        const ys = [bond.y1, bond.y2];
        if (xs.some((x) => x < -24 || x > 144) || ys.some((y) => y < 0 || y > 84)) {
          outside.push(authored);
        }
      }
    }
    expect(outside).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* The condensed formula parser                                        */
/* ------------------------------------------------------------------ */

describe("condensed formula typesetting", () => {
  it("sets a count under the line and a charge above it", () => {
    expect(formulaRuns("(CH_3)_3C^+")).toEqual([
      { text: "(CH", level: 0 },
      { text: "3", level: 1 },
      { text: ")", level: 0 },
      { text: "3", level: 1 },
      { text: "C", level: 0 },
      { text: "+", level: 2 },
    ]);
  });

  it("takes a braced run when the script is more than one character", () => {
    expect(formulaRuns("X^{2-}")).toEqual([
      { text: "X", level: 0 },
      { text: "2-", level: 2 },
    ]);
  });

  it("a plain formula is one baseline run", () => {
    expect(formulaRuns("CH_3OH")).toEqual([
      { text: "CH", level: 0 },
      { text: "3", level: 1 },
      { text: "OH", level: 0 },
    ]);
  });

  it("a trailing marker with nothing after it is dropped, not rendered", () => {
    // The edge case the parser exists in the data module to be tested on: a
    // stray underscore at the end of an authored label must not put a literal
    // underscore in front of a student.
    expect(formulaRuns("Al_")).toEqual([{ text: "Al", level: 0 }]);
  });

  it("an unclosed brace runs to the end rather than eating the rest", () => {
    expect(formulaRuns("SO_{4")).toEqual([
      { text: "SO", level: 0 },
      { text: "4", level: 1 },
    ]);
  });

  it("round trips every authored label back to its own characters", () => {
    // The parser must not lose or duplicate a character of an authored
    // formula, which is the only way a wrong molecule could reach a student
    // from a right registry entry.
    for (const authored of figureKeys()) {
      const [problemId, optionId] = authored.split("::");
      const figure = figureFor(problemId ?? "", optionId ?? "");
      for (const label of figure?.labels ?? []) {
        const rebuilt = formulaRuns(label.t)
          .map((run) => run.text)
          .join("");
        const stripped = label.t.replace(/[_^{}]/g, "");
        expect(rebuilt).toBe(stripped);
      }
    }
  });
});
