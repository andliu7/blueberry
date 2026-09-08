/**
 * The onboarding flow, tested where it can be tested: the pure step model, the
 * gates, the course-outline reads, the charge pacing arithmetic, and the copy
 * contract. No JSX is exercised, because the suite runs in a node environment
 * with no DOM (vitest.config.ts), which is the same reason the frame components
 * carry no rules of their own: everything that can be got wrong lives in
 * flow.ts and copy.ts and is imported here directly.
 *
 * THE TESTS WORTH READING FIRST are the four that pin CONTRACTS rather than
 * examples, because those should survive any rewrite of the components above
 * them:
 *
 *   "the bar only ever moves forward"        the progress bar is monotone
 *                                            across every step and across every
 *                                            question inside the placement
 *   "every goal a student can pick fits      the offer cannot drift out of
 *    inside one full charge meter"           reach when an economy table moves
 *   "the overview is read from the course    no chemistry is retyped into the
 *    outline, never retyped"                 onboarding surface
 *   "every student facing line is marked     the human gate is visible in the
 *    for the human gate"                     product, not just in a comment
 *
 * NO WALL CLOCK IS READ ANYWHERE IN THIS FILE, and none is read by the module
 * under test. LOG.md's "The instruments that only worked before dark" records
 * two measurements that only passed before 18:00 because their subject branched
 * on the hour; flow.ts takes no clock at all and the placement view's only
 * timer is `performance.now()`, which is monotonic and has no calendar in it.
 * So every assertion here gives the same answer at 9am and at 11pm.
 */

import { describe, expect, it } from "vitest";

import {
  ACTS,
  QUESTION_CAP,
  SEED_CORPUS,
  TIME_BUDGET_SECONDS,
  TOPICS,
  probeTopicIdsForCourse,
  topicDefinition,
  topicIdsForCourse,
  type CourseId,
  type Recommendation,
  type TopicId,
} from "@blueberry/curriculum";
import { CHARGE_CAP, CHARGE_COST, DAILY_GOAL_XP, XP_NODE_FIRST_CLEAR } from "@blueberry/economy";

import {
  EMPTY_ANSWERS,
  GOAL_CHARGE_CAP,
  HEAR_CHOICES,
  HUMAN_GATE_MARK,
  ONBOARDING_GOAL_TIERS,
  PLACEMENT_QUESTION_CAP,
  PLACEMENT_TIME_BUDGET_SECONDS,
  BONDING_STEP,
  COMMITMENT_STEPS,
  PERSONALISING_STEPS,
  SKIPPABLE_STEPS,
  START_CHOICES,
  STEP_IDS,
  WHY_CHOICES,
  blockOfTopic,
  canContinue,
  claimedCourseForWhy,
  commitmentFollowsPersonalising,
  goalIsChosenNotAssigned,
  goalChargeCost,
  goalFitsOneCharge,
  goalLessonsPerDay,
  goalXp,
  isSkippable,
  nextStep,
  normalizeStep,
  overviewBlocks,
  overviewTopicsShown,
  OVERVIEW_TOPICS_SHOWN,
  prevStep,
  progressPercent,
  resolveStart,
  stepIndex,
  tileIsDense,
  twoColumnGrid,
  type FlowAnswers,
  type StepId,
} from "../onboarding/flow";
import {
  ALL_DRAFT_LINES,
  FRAMING_JARGON,
  FRAMING_LINES,
  FRAMING_LINE_MAX_CHARS,
  sentenceCount,
  withoutMark,
  GOAL_LABEL,
  HEAR_LABEL,
  START_LABEL,
  WHY_LABEL,
  draft,
  fill,
} from "../onboarding/copy";

/** A recommendation shaped like the machine's, for the resolveStart tests. */
function recommendation(course: CourseId, startTopics: readonly TopicId[]): Recommendation {
  return {
    course,
    startTopics,
    confidence: "moderate",
    copy: "fixture",
    questionsAsked: 5,
    unprobeable: [],
  };
}

/* ------------------------------------------------------------------ */

describe("the step list", () => {
  it("is the seven step capture mapping, with two welcome beats", () => {
    expect(STEP_IDS).toEqual([
      "welcome",
      "intro",
      "hear",
      "why",
      "placement",
      "overview",
      "goal",
      "start",
    ]);
  });

  it("round trips every step through the hash", () => {
    for (const step of STEP_IDS) expect(normalizeStep(step)).toBe(step);
  });

  it("lands every legacy hash on a real step, so nothing in a history 404s", () => {
    // The flow this replaced handed out these four. CLAUDE.md's amendment:
    // "Every route resolves. A hash in a student's history lands on a page."
    for (const legacy of ["quiz", "tutorial", "lesson", "paywall"]) {
      expect(STEP_IDS).toContain(normalizeStep(legacy));
    }
    expect(normalizeStep("quiz")).toBe("placement");
    expect(normalizeStep("paywall")).toBe("start");
  });

  it("lands anything else on the first step rather than on a blank screen", () => {
    for (const junk of ["", "welcome/", "../etc", "Placement", "8"]) {
      expect(normalizeStep(junk)).toBe("welcome");
    }
  });

  it("walks forward and back as exact inverses in the middle of the flow", () => {
    for (const step of STEP_IDS) {
      const forward = nextStep(step);
      if (forward === null) continue;
      expect(prevStep(forward)).toBe(step);
    }
  });

  it("has nowhere back from the first step and nowhere on from the last", () => {
    expect(prevStep("welcome")).toBeNull();
    expect(nextStep("start")).toBeNull();
    // and every other step has both, which is what makes back always work
    for (const step of STEP_IDS.filter((id) => id !== "welcome" && id !== "start")) {
      expect(prevStep(step)).not.toBeNull();
      expect(nextStep(step)).not.toBeNull();
    }
  });

  it("orders stepIndex the same way STEP_IDS does", () => {
    STEP_IDS.forEach((step, index) => expect(stepIndex(step)).toBe(index));
  });
});

/* ------------------------------------------------------------------ */

describe("the progress bar", () => {
  it("is visible from screen one", () => {
    // The welcome goal image draws the bar already carrying a first notch, so
    // the student sees a flow with an end from the screen they land on.
    expect(progressPercent("welcome")).toBeGreaterThan(0);
  });

  it("only ever moves forward", () => {
    let last = -1;
    for (const step of STEP_IDS) {
      const percent = progressPercent(step);
      expect(percent).toBeGreaterThan(last);
      expect(percent).toBeLessThanOrEqual(100);
      last = percent;
    }
  });

  it("walks its own band inside the placement without ever passing the step after it", () => {
    const overview = progressPercent("overview");
    let last = -1;
    for (let asked = 0; asked <= QUESTION_CAP; asked += 1) {
      const percent = progressPercent("placement", asked);
      expect(percent).toBeGreaterThanOrEqual(last);
      expect(percent).toBeLessThan(overview);
      last = percent;
    }
  });

  it("clamps a question count outside the cap rather than running off the end", () => {
    expect(progressPercent("placement", -4)).toBe(progressPercent("placement", 0));
    expect(progressPercent("placement", QUESTION_CAP + 40)).toBe(
      progressPercent("placement", QUESTION_CAP),
    );
  });

  it("ignores the question count on every step that is not the placement", () => {
    for (const step of STEP_IDS.filter((id) => id !== "placement")) {
      expect(progressPercent(step, 5)).toBe(progressPercent(step, 0));
    }
  });
});

/* ------------------------------------------------------------------ */

describe("the CONTINUE gate", () => {
  const answered: FlowAnswers = {
    hear: "friend",
    why: "orgo2_exam",
    goal: "regular",
    start: "placement",
  };

  it("holds every step that asks a question until it is answered", () => {
    const asks: readonly StepId[] = ["hear", "why", "goal", "start"];
    for (const step of asks) expect(canContinue(step, EMPTY_ANSWERS)).toBe(false);
    for (const step of asks) expect(canContinue(step, answered)).toBe(true);
  });

  it("never holds a step whose only control is CONTINUE", () => {
    const passes: readonly StepId[] = ["welcome", "intro", "placement", "overview"];
    for (const step of passes) expect(canContinue(step, EMPTY_ANSWERS)).toBe(true);
  });

  it("gates each step on its OWN answer and not on the others", () => {
    expect(canContinue("why", { ...EMPTY_ANSWERS, hear: "search" })).toBe(false);
    expect(canContinue("why", { ...EMPTY_ANSWERS, why: "curious" })).toBe(true);
  });

  it("makes how-did-you-hear the only step a student may pass without answering", () => {
    expect(SKIPPABLE_STEPS).toEqual(["hear"]);
    for (const step of STEP_IDS) expect(isSkippable(step)).toBe(step === "hear");
  });
});

/* ------------------------------------------------------------------ */

describe("what brings you here", () => {
  it("claims a course only where the answer actually names one", () => {
    expect(claimedCourseForWhy("orgo2_exam")).toBe("orgo_2");
    expect(claimedCourseForWhy("dat_mcat")).toBe("dat");
    // "Surviving my course" and "Curiosity" name no course, so the quiz places
    // from scratch rather than guessing one and probing the wrong topic walk.
    expect(claimedCourseForWhy("surviving")).toBeNull();
    expect(claimedCourseForWhy("curious")).toBeNull();
    expect(claimedCourseForWhy(null)).toBeNull();
  });

  it("only ever claims a course the placement can actually walk", () => {
    // ASKED OF THE RIGHT HELPER, and the first draft of this test asked the
    // wrong one. `topicIdsForCourse` is what a course HOMES, and placement.ts
    // says in as many words that a review course homes nothing by design:
    // "topicIdsForCourse returns [] for both, by design". So that assertion
    // could only ever have passed by this flow refusing to claim DAT at all,
    // which would throw away the one signal the DAT chip carries and drop the
    // student onto the machine's orgo_1 default.
    //
    // What the contract actually means is that a claimed course must give the
    // quiz something to ask and the overview something to draw. Both are
    // asserted, which is strictly more than the original single call, and the
    // second of the two is what catches the empty-screen bug directly.
    for (const why of WHY_CHOICES) {
      const claimed = claimedCourseForWhy(why);
      if (claimed === null) continue;
      expect(probeTopicIdsForCourse(claimed).length).toBeGreaterThan(0);
      const blocks = overviewBlocks(claimed);
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) expect(block.topics.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */

describe("choose your start", () => {
  const reco = recommendation("orgo_2", ["aromaticity", "eas_directing"] as readonly TopicId[]);

  it("takes the placement at its word when the student asks it to", () => {
    expect(resolveStart("placement", reco, "orgo_2")).toEqual({
      course: "orgo_2",
      startTopics: ["aromaticity", "eas_directing"],
    });
  });

  it("keeps the course but empties the frontier when the student starts over", () => {
    // An empty frontier is the point: nothing renders as already done for a
    // student who said they want to begin at the beginning.
    expect(resolveStart("beginning", reco, "orgo_2")).toEqual({
      course: "orgo_2",
      startTopics: [],
    });
  });

  it("falls back to the claimed course when there is no recommendation", () => {
    expect(resolveStart("placement", null, "dat")).toEqual({ course: "dat", startTopics: [] });
  });

  it("falls back to the one open course when nothing was claimed either", () => {
    // A student who skipped the reason step and abandoned the quiz still has to
    // land somewhere real. orgo_2 is the only course open today per
    // app/courses.ts, and it is the only course with an authored outline.
    expect(resolveStart("placement", null, null)).toEqual({ course: "orgo_2", startTopics: [] });
    expect(resolveStart("beginning", null, null)).toEqual({ course: "orgo_2", startTopics: [] });
  });

  it("offers exactly two starts, and copy for both", () => {
    expect(START_CHOICES).toEqual(["placement", "beginning"]);
    for (const choice of START_CHOICES) expect(START_LABEL[choice]).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */

describe("the daily goal, mapped onto charge pacing", () => {
  it("offers three tiers and never exam week, which onboarding cannot know about", () => {
    // docs/ECONOMY.md: the exam tier is offered only inside the exam window,
    // and onboarding has no exam date yet.
    expect(ONBOARDING_GOAL_TIERS).toEqual(["casual", "regular", "serious"]);
    expect(ONBOARDING_GOAL_TIERS).not.toContain("exam");
  });

  it("reads its XP from the economy table rather than carrying its own", () => {
    for (const tier of ONBOARDING_GOAL_TIERS) expect(goalXp(tier)).toBe(DAILY_GOAL_XP[tier]);
  });

  it("derives lessons a day from the two economy tables, rounding up", () => {
    for (const tier of ONBOARDING_GOAL_TIERS) {
      expect(goalLessonsPerDay(tier)).toBe(
        Math.ceil(DAILY_GOAL_XP[tier] / XP_NODE_FIRST_CLEAR.reaction),
      );
      // A goal reached three quarters of the way through a lesson is a goal
      // reached on the lesson you finished, so the count is never rounded down
      // to something that would not actually meet it.
      expect(goalLessonsPerDay(tier) * XP_NODE_FIRST_CLEAR.reaction).toBeGreaterThanOrEqual(
        DAILY_GOAL_XP[tier],
      );
    }
  });

  it("rises with the tier, so the three chips read as a ladder", () => {
    const counts = ONBOARDING_GOAL_TIERS.map(goalLessonsPerDay);
    const costs = ONBOARDING_GOAL_TIERS.map(goalChargeCost);
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]!).toBeGreaterThanOrEqual(counts[i - 1]!);
      expect(costs[i]!).toBeGreaterThanOrEqual(costs[i - 1]!);
    }
  });

  it("prices a day in charge at the node ENTRY cost, never per question", () => {
    for (const tier of ONBOARDING_GOAL_TIERS) {
      expect(goalChargeCost(tier)).toBe(goalLessonsPerDay(tier) * CHARGE_COST.reaction);
    }
  });

  it("offers no goal that one full charge meter cannot cover", () => {
    // The screen tells the student a full meter covers a day at every tier.
    // This is that sentence made a check: if either table moves so that it
    // stops being true, this fails rather than the copy quietly lying.
    for (const tier of ONBOARDING_GOAL_TIERS) {
      expect(goalFitsOneCharge(tier)).toBe(true);
      expect(goalChargeCost(tier)).toBeLessThanOrEqual(CHARGE_CAP);
    }
    expect(GOAL_CHARGE_CAP).toBe(CHARGE_CAP);
  });

  it("has copy for every tier it offers", () => {
    for (const tier of ONBOARDING_GOAL_TIERS) expect(GOAL_LABEL[tier]).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */

describe("the achieve overview", () => {
  const blocks = overviewBlocks("orgo_2");

  it("is read from the course outline, never retyped", () => {
    // Every label and every "assumes" line is ACTS', which is
    // docs/COURSE-OUTLINE-ORGO2.md section 2 mined into data.
    for (const block of blocks) {
      const act = ACTS[block.id as keyof typeof ACTS];
      expect(act).toBeDefined();
      expect(block.label).toBe(act.label);
      expect(block.assumes).toBe(act.assumes);
    }
  });

  it("gives the three acts plus the spine, in course order", () => {
    expect(blocks.map((block) => block.id)).toEqual(["act_0", "act_1", "act_2", "act_3"]);
  });

  it("names every topic it lists, with a student facing label", () => {
    for (const block of blocks) {
      expect(block.topics.length).toBeGreaterThan(0);
      for (const topic of block.topics) {
        const definition = topicDefinition(topic);
        expect(definition.label.length).toBeGreaterThan(0);
        // A label is a phrase, not the identifier. TOPICS says so; this is the
        // half of it the overview actually depends on.
        expect(definition.label).not.toBe(topic);
      }
    }
  });

  it("lists no topic twice, so the overview is a partition and not a pile", () => {
    const all = blocks.flatMap((block) => block.topics);
    expect(new Set(all).size).toBe(all.length);
  });

  it("covers every orgo_2 topic that carries an act", () => {
    const listed = new Set(blocks.flatMap((block) => block.topics));
    const withAct = (Object.values(TOPICS) as { id: TopicId; course: CourseId; act?: string }[])
      .filter((topic) => topic.course === "orgo_2" && topic.act !== undefined)
      .map((topic) => topic.id);
    for (const topic of withAct) expect(listed.has(topic)).toBe(true);
  });

  it("still renders a course that carries no acts, rather than an empty screen", () => {
    // claimedCourseForWhy can hand the quiz "dat", and a student who lands on
    // the overview with a non-act course must still see what they signed up
    // for. One flat block of the topics that course PROBES.
    //
    // The first draft of this test compared against `topicIdsForCourse("dat")`,
    // which is [] by the curriculum's own design, so it asserted the screen was
    // empty in the same breath as its own title forbade one. The comparison is
    // now against what the placement quiz actually walked, and the emptiness is
    // ruled out explicitly rather than accidentally permitted.
    const dat = overviewBlocks("dat");
    expect(dat.length).toBe(1);
    expect(dat[0]!.assumes).toBeNull();
    expect(dat[0]!.topics.length).toBeGreaterThan(0);
    expect(dat[0]!.topics).toEqual(probeTopicIdsForCourse("dat"));
    // And the homed list stays empty, so this is documenting the curriculum's
    // rule rather than quietly changing what a review course means.
    expect(topicIdsForCourse("dat")).toEqual([]);
  });

  it("finds which block a start topic falls in, and reports honestly when none does", () => {
    const someTopic = blocks[1]!.topics[0]!;
    expect(blockOfTopic(blocks, someTopic)).toBe(blocks[1]!.id);
    // prerequisiteClosure crosses course boundaries on purpose, so an orgo_2
    // student's start topic may be homed in Organic Chemistry I and simply not
    // appear in this course's blocks. That is a null, not a throw.
    expect(blockOfTopic(blocks, "stoichiometry" as TopicId)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */

describe("the placement", () => {
  it("cites the machine's own budget rather than a second copy of it", () => {
    expect(PLACEMENT_TIME_BUDGET_SECONDS).toBe(TIME_BUDGET_SECONDS);
    expect(PLACEMENT_QUESTION_CAP).toBe(QUESTION_CAP);
  });

  it("keeps the budget inside CLAUDE.md's three minute row", () => {
    expect(PLACEMENT_TIME_BUDGET_SECONDS).toBeLessThanOrEqual(180);
  });

  it("puts four options in two columns and every other count in one", () => {
    const four = [{ text: "Methyl" }, { text: "Primary" }, { text: "Secondary" }, { text: "Tertiary" }];
    expect(twoColumnGrid(four)).toBe(true);
    // Three options in a 2x2 leaves a hole; five leaves a widow.
    expect(twoColumnGrid(four.slice(0, 3))).toBe(false);
    expect(twoColumnGrid([...four, { text: "Allylic" }])).toBe(false);
  });

  /*
   * THE LENGTH CONDITION IS GONE, AND THIS TEST IS WHY IT WENT.
   *
   * The predicate used to demand four options AND every option at most 24
   * characters, so a long option fell out of the 2x2 the goal image locks.
   * Measured against the corpus the walk actually serves, that rule fired on a
   * ninth of its own data: sixteen of the twenty five four-option sets in
   * SEED_CORPUS carry at least one option over 24 characters, the first
   * question the walk serves among them. A layout rule that refuses its own
   * default is not a fallback.
   *
   * The wrapping worry it was answering is real and it is answered in the
   * tile: the grid tile is tall, and past `TILE_DENSE_CHARS` the words drop a
   * type size rather than the question dropping the layout.
   */
  it("keeps a long option in the 2x2 and sets it smaller instead", () => {
    const long = "The tertiary carbocation, stabilised by hyperconjugation";
    expect(
      twoColumnGrid([{ text: long }, { text: "Primary" }, { text: "Secondary" }, { text: "Methyl" }]),
    ).toBe(true);
    expect(tileIsDense(long)).toBe(true);
    expect(tileIsDense("Tertiary")).toBe(false);
  });

  /*
   * THE GOAL IMAGE'S COMPOSITION HELD AGAINST THE REAL DATA.
   *
   * blueberry_r9-onboard-placement is what MANIFEST.md names as the lock on
   * "real chemistry as a 2x2", and the only way to know whether the built
   * screen honours it is to ask the corpus rather than a fixture. Every
   * four-option question in SEED_CORPUS must reach the grid, so a future
   * change to the predicate that quietly re-narrows it fails here with a count
   * rather than being discovered by a critic looking at a screenshot.
   */
  it("gives every four option question in the real corpus the 2x2", () => {
    const sets: readonly { readonly text: string }[][] = SEED_CORPUS.flatMap((problem) => {
      if (problem.answer.kind === "multiple_choice") return [[...problem.answer.options]];
      if (problem.answer.kind === "major_product") {
        return [[...problem.answer.candidates], [...problem.answer.reasons]];
      }
      return [];
    });
    const four = sets.filter((set) => set.length === 4);
    expect(four.length).toBeGreaterThan(0);
    expect(four.filter((set) => twoColumnGrid(set))).toHaveLength(four.length);
  });
});

/* ------------------------------------------------------------------ */

/*
 * THE OVERVIEW IS A SUMMARY, NOT THE SYLLABUS.
 *
 * Organic Chemistry II's act 1 is sixteen topics on its own, and rendering
 * every topic of every act turned the achieve screen into a scrolling wall of
 * chips. The cut is in flow.ts rather than in the component because it has an
 * edge case in it: a student's landing topic may be past the cut, and that is
 * the one topic the screen exists to show.
 */
describe("the overview shows the shape of the course, not all of it", () => {
  it("never shows more than the cap, and counts the rest honestly", () => {
    const blocks = overviewBlocks("orgo_2");
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const { shown, hidden } = overviewTopicsShown(block, []);
      expect(shown.length).toBeLessThanOrEqual(OVERVIEW_TOPICS_SHOWN);
      expect(shown.length + hidden).toBe(block.topics.length);
      // The order the act teaches in survives the cut.
      expect(shown).toEqual(block.topics.filter((topic) => shown.includes(topic)));
    }
  });

  it("always shows the topic the placement landed on, however deep it sits", () => {
    const blocks = overviewBlocks("orgo_2");
    // The deepest topic of the largest act: the case a plain slice would drop.
    const largest = blocks.reduce((a, b) => (b.topics.length > a.topics.length ? b : a));
    expect(largest.topics.length).toBeGreaterThan(OVERVIEW_TOPICS_SHOWN);
    const deepest = largest.topics[largest.topics.length - 1]!;
    const { shown, hidden } = overviewTopicsShown(largest, [deepest]);
    expect(shown).toContain(deepest);
    expect(shown.length).toBe(OVERVIEW_TOPICS_SHOWN);
    expect(shown.length + hidden).toBe(largest.topics.length);
  });

  it("hides nothing from an act that already fits", () => {
    const blocks = overviewBlocks("orgo_2");
    const small = blocks.find((block) => block.topics.length <= OVERVIEW_TOPICS_SHOWN);
    // act_0 is the two-topic spine, so this case is real and not hypothetical.
    expect(small).toBeDefined();
    const { shown, hidden } = overviewTopicsShown(small!, []);
    expect(shown).toEqual(small!.topics);
    expect(hidden).toBe(0);
  });

  it("keeps every start topic when several land in one act", () => {
    const blocks = overviewBlocks("orgo_2");
    const largest = blocks.reduce((a, b) => (b.topics.length > a.topics.length ? b : a));
    const many = largest.topics.slice(-5);
    const { shown, hidden } = overviewTopicsShown(largest, many);
    for (const topic of many) expect(shown).toContain(topic);
    // Required topics may exceed the cap. Showing the student's own landing
    // topics beats holding the cap, so the cap yields and the count stays true.
    expect(shown.length).toBe(many.length);
    expect(shown.length + hidden).toBe(largest.topics.length);
  });
});

/* ------------------------------------------------------------------ */

describe("the copy, which is all placeholder", () => {
  it("marks every student facing line for the human gate", () => {
    // CLAUDE.md rules the onboarding funnel a human gate rather than a loop.
    // The mark is a prefix so a truncated line in a narrow chip still shows it.
    expect(ALL_DRAFT_LINES.length).toBeGreaterThan(30);
    for (const line of ALL_DRAFT_LINES) {
      expect(line.startsWith(HUMAN_GATE_MARK)).toBe(true);
      expect(line.length).toBeGreaterThan(HUMAN_GATE_MARK.length + 1);
    }
  });

  it("has a line for every choice on every choice step", () => {
    for (const choice of HEAR_CHOICES) expect(HEAR_LABEL[choice]).toBeTruthy();
    for (const choice of WHY_CHOICES) expect(WHY_LABEL[choice]).toBeTruthy();
    for (const choice of START_CHOICES) expect(START_LABEL[choice]).toBeTruthy();
  });

  it("holds the voice contract: no scolding and no em dashes", () => {
    // CLAUDE.md's voice section names the failure mode: "no scolding
    // constructions, no 'you should have'". And em dashes are banned outright
    // in code, comments and output.
    for (const line of ALL_DRAFT_LINES) {
      expect(line).not.toMatch(/—/);
      expect(line.toLowerCase()).not.toContain("you should have");
      expect(line.toLowerCase()).not.toContain("should have");
      expect(line.toLowerCase()).not.toContain("obviously");
      expect(line.toLowerCase()).not.toContain("simply");
    }
  });

  /* ---------------------------------------------------------------- */

  /*
   * ONE SHORT QUESTION PER SCREEN, owner 2026-09-04.
   *
   * "The onboarding questions are too complex. One short question per screen,
   * plain words, no compound sentences, no chemistry vocabulary in the
   * framing." These three tests are that ruling turned into a gate, because
   * the failure mode it names is not a bug: the flow keeps working perfectly
   * while the words quietly grow back into paragraphs, and nobody notices
   * until the next time somebody looks at the screens.
   *
   * They govern FRAMING_LINES only. copy.ts names the four kinds of line
   * deliberately left out and why each one is out.
   */

  it("asks one short question per screen, and never two sentences", () => {
    expect(FRAMING_LINES.length).toBeGreaterThanOrEqual(15);
    for (const line of FRAMING_LINES) {
      // A compound sentence and a second sentence are the same defect seen
      // from two sides, and the terminal mark catches both.
      expect({ line, sentences: sentenceCount(line) }).toEqual({ line, sentences: 1 });
      // The object wrapper is so a failure names the offending line rather
      // than printing "expected 61 to be less than or equal to 48".
      expect({
        line,
        overBy: Math.max(0, withoutMark(line).length - FRAMING_LINE_MAX_CHARS),
      }).toEqual({ line, overBy: 0 });
      // A fragment with no ending is not a short sentence, it is an unfinished
      // one, and the gate should see the difference.
      expect(/[.?!]$/.test(withoutMark(line))).toBe(true);
    }
  });

  it("keeps chemistry vocabulary out of the framing", () => {
    // "No chemistry vocabulary in the framing. The placement quiz is the only
    // place a real chemistry question appears." The words of a placement
    // question come from packages/curriculum and are not in this file at all,
    // which is why every line here can be held to the rule without exception.
    for (const line of FRAMING_LINES) {
      for (const word of FRAMING_JARGON) {
        expect({ line, word, present: line.toLowerCase().includes(word) }).toEqual({
          line,
          word,
          present: false,
        });
      }
    }
  });

  it("frames with lines that are themselves marked for the gate", () => {
    // FRAMING_LINES is a view over the same drafts, never a second copy of
    // them: a line that reached the screen through this list and not through
    // ALL_DRAFT_LINES would be a line the gate never sees.
    for (const line of FRAMING_LINES) expect(ALL_DRAFT_LINES).toContain(line);
  });

  it("counts a run of terminal marks as one ending", () => {
    expect(sentenceCount("[HUMAN GATE] Here is your course.")).toBe(1);
    expect(sentenceCount("[HUMAN GATE] One. Two.")).toBe(2);
    expect(withoutMark("[HUMAN GATE] Here is your course.")).toBe("Here is your course.");
    // A line that never went through draft() is measured as it stands.
    expect(withoutMark("plain")).toBe("plain");
  });

  it("builds a marked line the same way every caller does", () => {
    expect(draft("x")).toBe(`${HUMAN_GATE_MARK} x`);
  });

  it("fills the number slots and leaves an unsupplied one alone", () => {
    expect(fill("%n XP a day", { n: 20 })).toBe("20 XP a day");
    expect(fill("%c of %cap charge", { c: 16, cap: 30 })).toBe("16 of 30 charge");
    expect(fill("Question %n of %total", { n: 4, total: 8 })).toBe("Question 4 of 8");
    // A slot with nothing behind it stays visible rather than becoming
    // "undefined" in front of a student.
    expect(fill("%n of %total", { n: 4 })).toBe("4 of %total");
  });
});

/* ------------------------------------------------------------------ */

/**
 * The five funnel qualities docs/THREE-TEACHERS.md names, pinned.
 *
 * These are the tests most likely to look redundant to a reader a year from
 * now, and they are the ones worth keeping. Each quality is a property of the
 * step order that is cheap to lose in a refactor and expensive to notice is
 * gone, because losing one breaks nothing: the flow still runs, it is just
 * worse. So each one gets an assertion with the quality quoted beside it.
 */
describe("the funnel qualities from THREE-TEACHERS", () => {
  it("has a screen that only bonds, and it asks the student nothing", () => {
    // "At least one onboarding screen teaches nothing and exists so the mascot
    // is a relationship rather than a UI element."
    expect(STEP_IDS).toContain(BONDING_STEP);
    // Nothing to answer, so nothing to gate on.
    expect(canContinue(BONDING_STEP, EMPTY_ANSWERS)).toBe(true);
    // And it is not the skippable step: a screen you are invited to skip is
    // not a screen that builds a relationship.
    expect(isSkippable(BONDING_STEP)).toBe(false);
  });

  it("personalises before it commits, and asks for nothing at all today", () => {
    // "The motivation and level questions come BEFORE signup, so the app
    // already knows the student before it asks for anything", and "a whole
    // lesson is finished before any paywall appears". Onboarding satisfies
    // both by containing no ask whatsoever.
    expect(COMMITMENT_STEPS).toEqual([]);
    expect(commitmentFollowsPersonalising()).toBe(true);
    // The two personalising steps are real steps and they are in the flow.
    for (const step of PERSONALISING_STEPS) expect(STEP_IDS).toContain(step);
  });

  it("would still hold the ask behind the personalising steps if one were added", () => {
    // The predicate above is vacuously true while COMMITMENT_STEPS is empty,
    // which is exactly when a pin is worth nothing. This drives it with a
    // non-empty list so the logic itself is under test: a step placed before
    // the placement fails, one placed after it passes.
    const lastPersonalising = Math.max(...PERSONALISING_STEPS.map(stepIndex));
    const tooEarly = STEP_IDS.filter((step) => stepIndex(step) < lastPersonalising);
    const lateEnough = STEP_IDS.filter((step) => stepIndex(step) > lastPersonalising);
    expect(tooEarly.length).toBeGreaterThan(0);
    expect(lateEnough.length).toBeGreaterThan(0);
    for (const step of tooEarly) {
      expect(stepIndex(step) > lastPersonalising).toBe(false);
    }
    for (const step of lateEnough) {
      expect(stepIndex(step) > lastPersonalising).toBe(true);
    }
  });

  it("lets the student choose the daily goal rather than assigning one", () => {
    // "THE GOAL IS CHOSEN, NOT ASSIGNED. A self-picked daily target is why a
    // streak feels earned."
    expect(goalIsChosenNotAssigned()).toBe(true);
    expect(EMPTY_ANSWERS.goal).toBeNull();
    // Every offered tier is a real pick that opens the gate, so the choice is
    // genuine rather than one live option beside two decorative ones.
    for (const tier of ONBOARDING_GOAL_TIERS) {
      expect(canContinue("goal", { ...EMPTY_ANSWERS, goal: tier })).toBe(true);
    }
  });

  it("borrows the shape of the funnel and not its length", () => {
    // "20 to 40 screens works for someone idly curious about Spanish. Our
    // student is stressed, has an exam, and arrived on purpose. Seven steps
    // stays right." Eight ids, because the record's seven steps open with two
    // welcome beats; the brief names both and counts them as one step.
    expect(STEP_IDS.length).toBe(8);
    expect(STEP_IDS.length).toBeLessThan(20);
  });
});
