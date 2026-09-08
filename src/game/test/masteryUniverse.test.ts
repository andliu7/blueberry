/**
 * The mastery denominator, as the WEB SHELL supplies it.
 *
 * @blueberry/economy scores mastery out of a course universe the caller hands
 * in, and falls back to the unlocked set floored at
 * MASTERY_MIN_UNIVERSE_DIFFICULTY when nobody names one. The package's own tests
 * prove that arithmetic. What they cannot prove is the thing that actually broke:
 * whether THIS shell hands in a universe whose node ids are the ids it journals.
 *
 * The bug. LessonPlayer finishes a lesson by calling completeLesson, which
 * appends the attempts and one node_cleared. It never appends node_started, so
 * the economy saw one node unlocked and one node cleared: 100 percent mastery,
 * rank Exam Ready, and a receipt paying every rank award for a single lesson.
 * A universe built from ids that did not match the journal's would look correct
 * and reintroduce the same bug quietly, which is why the first test here compares
 * the two id sets rather than trusting them to agree.
 */

import { describe, expect, it } from "vitest";
import { ALL_COURSE_IDS, probeTopicIdsForCourse, type CourseId } from "@blueberry/curriculum";
import { deriveEconomy, MASTERY_MIN_UNIVERSE_DIFFICULTY } from "@blueberry/economy";
import { courseUniverse, createLocalProgress, lessonNodeId } from "../app/progress";

describe("the course universe", () => {
  it("names a node for every topic the course probes", () => {
    for (const course of ALL_COURSE_IDS) {
      const topics = probeTopicIdsForCourse(course);
      const universe = courseUniverse(course);
      expect(universe.map((node) => node.nodeId)).toEqual(topics.map((topic) => lessonNodeId(topic)));
    }
  });

  it("uses the same node ids the store journals a clear under", () => {
    // The one assertion that would have caught a universe built from raw topic
    // ids: it would divide correctly and match nothing, so every clear would sit
    // outside the course and the score would be right for the wrong reason.
    for (const course of ALL_COURSE_IDS) {
      const ids = new Set(courseUniverse(course).map((node) => node.nodeId));
      for (const topic of probeTopicIdsForCourse(course)) {
        expect(ids.has(lessonNodeId(topic))).toBe(true);
      }
    }
  });

  it("weighs every node on the 1 to 5 scale", () => {
    for (const course of ALL_COURSE_IDS) {
      for (const node of courseUniverse(course)) {
        expect([1, 2, 3, 4, 5]).toContain(node.difficulty);
      }
    }
  });

  it("records which courses are still narrower than the mastery floor", () => {
    // NOT a decoration. Naming the course was supposed to make the denominator
    // honest, and for three of the four content courses it made it worse: the
    // curriculum homes 3 topics in General Chemistry I, 2 in General Chemistry
    // II and 9 in Organic Chemistry I, so one finished lesson of Gen Chem I was
    // 100 * 3 / 9, rank Mechanist, 250 diamonds. The economy floors every
    // denominator at MASTERY_MIN_UNIVERSE_DIFFICULTY for that reason.
    //
    // This test is the ledger of that content gap. When those courses are
    // authored out past the floor it goes red, and the right response is to move
    // the course into the wide list, not to soften the assertion.
    const narrow: CourseId[] = [];
    const wide: CourseId[] = [];
    for (const course of ALL_COURSE_IDS) {
      const total = courseUniverse(course).reduce((sum, node) => sum + node.difficulty, 0);
      (total < MASTERY_MIN_UNIVERSE_DIFFICULTY ? narrow : wide).push(course);
    }
    expect(narrow).toEqual(["gen_chem_1", "gen_chem_2", "orgo_1"]);
    expect(wide).toEqual(["orgo_2", "dat", "mcat"]);
  });

  it("does not let a narrow course claim Exam Ready for clearing all of it", () => {
    // Three topics of General Chemistry I is not a General Chemistry I course,
    // and the rank claims are claims about ability. ECONOMY.md on exactly this:
    // "Do not make the claim until the data supports it."
    const store = createLocalProgress();
    store.reset();
    store.setCourse("gen_chem_1", []);
    for (const topic of probeTopicIdsForCourse("gen_chem_1")) {
      store.completeLesson(topic, 3, 3, ["p1", "p2", "p3"]);
    }
    const { economy } = store.getSnapshot();
    expect(economy.mastery.score).toBeLessThan(30);
    expect(economy.mastery.floorRank).not.toBe("Exam Ready");
  });
});

describe("a first finished lesson", () => {
  const firstTopicOf = (course: CourseId) => {
    const topic = probeTopicIdsForCourse(course)[0];
    if (topic === undefined) throw new Error(`${course} probes no topics`);
    return topic;
  };

  it("lands in Reader and pays for the clear alone, on every course", () => {
    for (const course of ALL_COURSE_IDS) {
      const store = createLocalProgress();
      store.reset();
      store.setCourse(course, []);
      store.completeLesson(firstTopicOf(course), 3, 3, ["p1", "p2", "p3"]);
      const { economy } = store.getSnapshot();
      expect(economy.mastery.rank).toBe("Reader");
      expect(economy.mastery.floorRank).toBe("Reader");
      // Ten for the first clear, five because a lesson node is a spine node,
      // five because three of three correct is flawless. What is NOT here is
      // rank money, which is the whole bug.
      expect(economy.diamonds.earned).toBe(20);
    }
  });

  it("moves the score by exactly one node's share of the course", () => {
    // The precise claim, and it is the one the fix is for: a finished lesson is
    // worth its own weight out of the course, and nothing more.
    //
    // ECONOMY.md wants more than that: "a single node should move it a point at
    // most." That needs a course of about a hundred nodes at difficulty 3, and
    // Organic Chemistry II has 32 topics with one lesson node each, so a lesson
    // is 3.1 points today. The gap closes when lesson nodes are finer than
    // topics; it is recorded here rather than papered over with a loose bound.
    for (const course of ["orgo_2", "dat", "mcat"] as const) {
      const total = courseUniverse(course).reduce((sum, node) => sum + node.difficulty, 0);
      const share = Math.round(((100 * 3) / total) * 10) / 10;
      const store = createLocalProgress();
      store.reset();
      store.setCourse(course, []);
      store.completeLesson(firstTopicOf(course), 3, 3, ["p1", "p2", "p3"]);
      expect(store.getSnapshot().economy.mastery.score).toBe(share);
      expect(share).toBeLessThan(4);
    }
  });

  it("stays in Reader even before a course has been picked", () => {
    // course is null until the placement quiz or a pick, so the store passes no
    // universe and the economy's floor is the only thing holding the number down.
    const store = createLocalProgress();
    store.reset();
    store.clearNode("lesson:aromaticity", "concept");
    const { economy } = store.getSnapshot();
    expect(economy.mastery.rank).toBe("Reader");
    expect(economy.diamonds.earned).toBe(10);
  });

  it("gives the reward moment the same rank the pathway shows", () => {
    // receiptFor and deriveEconomy must read one universe. If only the snapshot
    // saw the course, the receipt would announce a rank up the pathway denies.
    const course: CourseId = "orgo_2";
    const store = createLocalProgress();
    store.reset();
    store.setCourse(course, []);
    store.completeLesson(firstTopicOf(course), 2, 3, ["p1", "p2", "p3"]);
    const snapshot = store.getSnapshot();
    expect(snapshot.lastReceipt?.mastery.rankUp).toBeNull();
    const replayed = deriveEconomy(snapshot.journal, snapshot.economy.now, { universe: courseUniverse(course) });
    expect(replayed.mastery.visible).toBe(snapshot.economy.mastery.visible);
    expect(snapshot.lastReceipt?.mastery.visibleAfter).toBe(snapshot.economy.mastery.visible);
  });
});
