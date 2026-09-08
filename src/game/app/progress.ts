/**
 * Progress, as the SHELL sees it. Read this header before trusting anything
 * in this file.
 *
 * CLAUDE.md, non-negotiables: unlock state, diamond balances, ratings and
 * standings are enforced server side, and a client side value is a suggestion.
 * Phase 6 builds that server. Phase 5 has to render a pathway, a balance and a
 * reward moment today, so this file is the SEAM: one interface, ProgressSource,
 * that the tabs read through, and one implementation, the local store below,
 * that keeps a per-device copy in localStorage.
 *
 * What that local copy is: a rendering cache and an offline draft. What it is
 * not: an entitlement. Nothing paid is gated on it (the free tier is tutorial,
 * intro lessons, periodic table, five problems a day, all of which are free
 * here regardless), and Phase 6 replaces `createLocalProgress` with a Supabase
 * backed source that reconciles this draft against the append only attempt
 * history. A student who edits localStorage has edited a cache.
 *
 * WHAT CHANGED AT v2, and it is the reason this file is worth reading twice.
 * docs/ECONOMY.md, Anti-abuse: "Every balance is a derived column:
 * f(attempt history, spend history). Recomputable from scratch." So this store
 * no longer keeps a diamond count, an XP count, a streak, or a charge meter. It
 * keeps the JOURNAL, which is the list of things that happened, and every number
 * on screen comes out of `deriveEconomy(journal, now, options)` in
 * @blueberry/economy. The shape of the local cache is now the same shape the
 * server will hold, which is what makes the Phase 6 swap a change of transport
 * rather than a rewrite.
 *
 * The `options` is the COURSE, and `courseUniverse` below explains at length why
 * leaving it out was a bug rather than a default. In one line: mastery is scored
 * out of a course, and a shell that does not name one is scored out of whatever
 * it happened to unlock.
 *
 * The reward moment reads `lastReceipt` and animates it. It never adds anything
 * up itself: ECONOMY.md, "The client animates what the server concluded."
 *
 * ONE LIMITATION TO KNOW ABOUT. `economy` is recomputed on every commit and not
 * on every render, because useSyncExternalStore needs getSnapshot to return the
 * same object until something actually changes. Charge regenerates with the
 * clock, so a meter left on screen for an hour shows the value it had at the
 * last commit. A surface that needs a live meter should derive it itself with
 * `deriveEconomy(snapshot.journal, new Date().toISOString())` on its own timer,
 * which is cheap and is the honest way to do it. Phase 6's source will poll.
 * Charge does not depend on the course, so that call needs no universe. A
 * surface that re-derives MASTERY that way must pass `courseUniverse(course)`,
 * or it will show a different number from the pathway.
 *
 * The store is an external store (subscribe plus getSnapshot), the same shape
 * as packages/interaction/src/store.ts, so tabs read it with
 * useSyncExternalStore and nothing here imports React.
 */

import type { CourseId, ProblemId, TopicId } from "@blueberry/curriculum";
import { COURSE_UNIVERSE } from "./courseUniverse.generated";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { OPEN_COURSE_IDS } from "./courses";
import { isBetaOn } from "./flags";
import {
  deriveEconomy,
  isEconomyEvent,
  localDate,
  MASTERY_DEFAULT_DIFFICULTY,
  receiptFor,
  type DailyGoalTier,
  type Difficulty,
  type DeriveOptions,
  type EconomyEvent,
  type EconomySnapshot,
  type NodeKind,
  type Receipt,
  type SpendSink,
  type UniverseNode,
} from "@blueberry/economy";

export interface LessonRecord {
  readonly topic: TopicId;
  readonly correct: number;
  readonly attempted: number;
  readonly completedAt: string;
}

export interface ProgressSnapshot {
  /** The course the pathway opens on. Null until the placement quiz or a pick. */
  readonly course: CourseId | null;
  /** The placement's starting frontier. Topics before these render as done. */
  readonly startTopics: readonly TopicId[];
  readonly lessons: Readonly<Record<string, LessonRecord>>;
  readonly attemptedProblems: readonly ProblemId[];
  /** Derived, never stored: `economy.diamonds.balance`. Kept for the tabs that read it. */
  readonly diamonds: number;
  /** Derived: the distinct local dates the journal has any event on. */
  readonly activeDays: readonly string[];
  readonly onboardingDone: boolean;
  readonly displayName: string | null;
  /** The append only history. The only thing this store actually persists. */
  readonly journal: readonly EconomyEvent[];
  /** Every economy number, derived from the journal at the moment of the last commit. */
  readonly economy: EconomySnapshot;
  /** The lines the reward moment animates for the most recent event. */
  readonly lastReceipt: Receipt | null;
}

export interface ClearNodeOptions {
  readonly flawless?: boolean;
  readonly stepsInOneSitting?: number;
  readonly spine?: boolean;
  readonly difficulty?: Difficulty;
}

export interface SettingsFields {
  readonly dailyGoal?: DailyGoalTier;
  readonly examDate?: string | null;
  readonly reminderHour?: number | null;
}

export interface ProgressSource {
  getSnapshot(): ProgressSnapshot;
  subscribe(listener: () => void): () => void;
  setCourse(course: CourseId, startTopics: readonly TopicId[]): void;
  /** A finished lesson. Returns the diamonds earned so the reward moment can show the number. */
  completeLesson(topic: TopicId, correct: number, attempted: number, problemIds: readonly ProblemId[]): number;
  finishOnboarding(): void;
  setDisplayName(name: string): void;
  reset(): void;
  /** Append any economy event. Everything below is a named shortcut for this. */
  append(event: EconomyEvent): Receipt;
  /** Entering a node, which is where charge is spent. Never per question. */
  startNode(nodeId: string, kind: NodeKind): Receipt;
  /** Clearing a node. Returns the diamonds earned, which is 0 on a replay. */
  clearNode(nodeId: string, kind: NodeKind, options?: ClearNodeOptions): number;
  spend(sink: SpendSink, cost: number, ref?: string): Receipt;
  setSettings(fields: SettingsFields): Receipt;
}

const STORAGE_KEY = "blueberry.progress.v2";
const LEGACY_KEY = "blueberry.progress.v1";

/** What actually goes into localStorage. Not a balance in sight. */
interface StoredProgress {
  readonly course: CourseId | null;
  readonly startTopics: readonly TopicId[];
  readonly lessons: Readonly<Record<string, LessonRecord>>;
  readonly attemptedProblems: readonly ProblemId[];
  readonly onboardingDone: boolean;
  readonly displayName: string | null;
  readonly journal: readonly EconomyEvent[];
}

const EMPTY_STORED: StoredProgress = Object.freeze({
  course: null,
  startTopics: [],
  lessons: {},
  attemptedProblems: [],
  onboardingDone: false,
  displayName: null,
  journal: [],
});

/**
 * The node id a lesson clears. Lessons are grouped by topic today (see
 * LessonPlayer's header for why), so the topic is the node.
 */
export function lessonNodeId(topic: TopicId): string {
  return `lesson:${topic}`;
}

/** Difficulty a lesson node is journalled at until the corpus carries one per lesson. */
const LESSON_DIFFICULTY: Difficulty = MASTERY_DEFAULT_DIFFICULTY;

const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5];

function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value);
}

/**
 * What one topic weighs in the mastery fraction.
 *
 * Read out of the generated table rather than out of `topicDefinition`, because
 * this module is reachable from the shell and therefore lives in the game
 * route's entry chunk: importing the authored corpus here put all of it in front
 * of every student (see courseUniverse.generated.ts for the measurement). The
 * table carries whatever difficulty the corpus assigns, so this stays the ONE
 * place a weight is decided and the universe cannot disagree with the clears we
 * journal.
 *
 * An unknown topic falls back rather than throwing: the v1 migration replays
 * topic ids out of a localStorage blob that may name a topic the corpus has
 * since renamed, and a stale cache entry must not take down the store.
 */
function topicDifficulty(topic: TopicId): Difficulty {
  const own = DIFFICULTY_BY_NODE.get(lessonNodeId(topic));
  return isDifficulty(own) ? own : LESSON_DIFFICULTY;
}

/**
 * THE MASTERY DENOMINATOR, and the reason this function exists at all.
 *
 * Mastery is "0 to 100 per course" (docs/ECONOMY.md), so the score has to be
 * divided by the whole course. The economy package can only see the journal, and
 * a node is unlocked there by node_started or node_cleared. This shell never
 * journals node_started for a lesson: LessonPlayer goes straight to
 * completeLesson, which appends the attempts and the clear. So without this, a
 * student's first finished lesson was one node cleared out of one node unlocked,
 * which is 100 percent, Exam Ready, and a receipt paying every rank award for one
 * lesson. deriveEconomy floors every denominator at
 * MASTERY_MIN_UNIVERSE_DIFFICULTY so that can never be a catastrophe; naming the
 * course is what makes the number MEAN something.
 *
 * The ids have to be the ids the journal uses, so this goes through
 * `lessonNodeId` exactly as `completeLesson` does. DAT and MCAT home no topics
 * and probe all four content courses, which is the right universe for a review
 * course: it is what they are actually measured over.
 *
 * KNOWN GAP, and it is content rather than code. Gen Chem I homes 3 topics,
 * Gen Chem II 2 and Organic I 9, all narrower than the floor, so mastery on
 * those three caps below 100 until they are authored out. test/masteryUniverse
 * keeps the ledger of which courses those are.
 */
export function courseUniverse(course: CourseId): readonly UniverseNode[] {
  const rows = COURSE_UNIVERSE[course] ?? [];
  return rows.map(([nodeId, difficulty]) => ({ nodeId, difficulty }));
}

/**
 * Every node's weight, flattened across courses so a topic's difficulty is one
 * lookup rather than a scan. Courses overlap (DAT and MCAT probe all four
 * content courses), and a node that appears twice carries the same weight in
 * both, so last write wins is not a conflict.
 */
const DIFFICULTY_BY_NODE: ReadonlyMap<string, Difficulty> = new Map(
  Object.values(COURSE_UNIVERSE).flatMap((rows) => rows.map(([nodeId, difficulty]) => [nodeId, difficulty] as const)),
);

/** Built once per course, because the course graph is static content. */
const universeCache = new Map<CourseId, readonly UniverseNode[]>();

/**
 * The derive options for a course, cached.
 *
 * Exported because the header HUD re-derives against the wall clock (this
 * file's own header says a live meter should), and a re-derivation that does
 * not pass the course reports a different DIAMOND balance, not merely a
 * different mastery: rank awards pay diamonds and mastery is scored out of a
 * course. Two surfaces reading the same journal must read the same denominator.
 */
export function economyOptions(course: CourseId | null): DeriveOptions | undefined {
  return deriveOptions(course);
}

function deriveOptions(course: CourseId | null): DeriveOptions | undefined {
  if (course === null) return undefined;
  const cached = universeCache.get(course);
  if (cached !== undefined) return { universe: cached };
  const built = courseUniverse(course);
  universeCache.set(course, built);
  return { universe: built };
}

function nowIso(): string {
  return new Date().toISOString();
}

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The two beta exploration flags, applied at the ONE seam every surface reads.
 *
 * Owner request 2026-09-03: walk the whole product without grinding for it.
 * They are applied here, in the projection, rather than inside any screen,
 * because that is the single place the tabs, the pathway, the HUD and the
 * charge gate all read from, so none of them can disagree about what is open.
 * `packages/economy` is untouched: it stays a pure function of the journal, and
 * a flag that reached into it would make the ledger lie about its own history.
 * This overrides the PROJECTION, not the record.
 *
 * Neither grants anything. Unlock state and any balance that costs money are
 * server enforced per CLAUDE.md; when Phase 6 lands, this keeps drawing a local
 * preview and the server keeps saying no. See app/flags.ts for the argument.
 */
function applyBetaFlags(snapshot: ProgressSnapshot): ProgressSnapshot {
  const unlockAll = isBetaOn("unlockall");
  const infiniteCharge = isBetaOn("infinitecharge");
  if (!unlockAll && !infiniteCharge) return snapshot;

  let next = snapshot;

  // BETA PICKS A COURSE, and this is the whole reason "none of the buttons
  // work" was true on a fresh device. Everything below keys off the course:
  // the universe, the pathway's nodes, the unlock events. On a device that has
  // not finished onboarding the course is null, so the pathway rendered ZERO
  // nodes, and a screen with no buttons is indistinguishable from a screen
  // whose buttons are broken. Beta exists so the owner can walk the product
  // without grinding, and a walk that dead-ends on an empty first screen is
  // not that. OPEN_COURSE_IDS is the single list of what may be selected, so
  // this takes its head rather than naming a course here and going stale.
  if (unlockAll && next.course === null) {
    const first = OPEN_COURSE_IDS[0];
    if (first !== undefined) next = { ...next, course: first, onboardingDone: true };
  }

  // NEXT, not snapshot: the block above may have just chosen the course, and
  // testing the original here is what made every earlier attempt do nothing on
  // a fresh device. The parameter is the world before beta; `next` is the world
  // beta is describing, and every clause after the first must read that one.
  const betaCourse = next.course;
  if (unlockAll && betaCourse !== null) {
    // THE FIX THAT MAKES THIS ACTUALLY WORK, and the reason it did not before.
    // The pathway does NOT read `lessons`. pathwayState.ts derives `cleared`
    // from node_cleared EVENTS IN THE JOURNAL (see its switch on event.kind),
    // and a unit is reachable only when the unit before it has no unfinished
    // playable nodes. So filling `lessons` unlocked nothing and the owner
    // asked three times before this was traced. The flag now appends the
    // events the pathway actually reads, which is also the honest shape: a
    // preview of the world where those events exist, rather than a special
    // case wired into the pathway's own logic.
    const at = BETA_COMPLETED_AT;
    const tz = "UTC";
    const synthetic: EconomyEvent[] = [];

    // UNLOCK IN THE PATHWAY'S OWN VOCABULARY. The first attempt cleared node
    // ids from courseUniverse, which are "lesson:<topic>", while the pathway's
    // nodes are "u1-allylic" and friends: a different id space entirely, so
    // nothing matched and nothing unlocked. pathwayState reads
    // `finished = passedUnits.has(unit.id) || every playable node done`, and
    // passedUnits comes from unit_cleared. One event per unit unlocks the whole
    // track without inventing node ids.
    for (const unit of PATHWAY_UNITS) {
      synthetic.push({ kind: "unit_cleared", at, tz, unitId: unit.id });
    }

    // And a realistic opening state, because UNLOCKED is not COMPLETED and the
    // difference matters on screen: with nothing finished the trail is violet
    // end to end, which is truthful but is not what the adopted design shows.
    // Clearing the first few spine nodes of unit one puts a walked stretch,
    // its join and the road ahead on the first screen, which is the picture
    // the references draw and the one worth developing against.
    const opening = ["u1-allylic", "u1-12v14", "u1-kvt"];
    for (const nodeId of opening) {
      synthetic.push({
        kind: "node_cleared",
        at,
        tz,
        nodeId,
        nodeKind: "reaction",
        flawless: false,
        stepsInOneSitting: 1,
        spine: true,
        difficulty: 3,
      });
    }

    // The economy still wants the universe's own ids for mastery, which is a
    // different question from what the pathway draws.
    for (const node of courseUniverse(betaCourse)) {
      synthetic.push({
        kind: "node_cleared",
        at,
        tz,
        nodeId: node.nodeId,
        nodeKind: "concept",
        flawless: false,
        stepsInOneSitting: 1,
        spine: true,
        difficulty: node.difficulty,
      });
    }
    next = { ...next, journal: [...synthetic, ...next.journal] };

    // Kept as well: some surfaces read the lesson record rather than the
    // journal, and the two must not disagree about what is finished.
    const lessons: Record<string, LessonRecord> = { ...snapshot.lessons };
    for (const node of courseUniverse(betaCourse)) {
      // The record is keyed by topic; the universe carries node ids, which are
      // lessonNodeId(topic), so the topic is the tail. Non lesson nodes have no
      // topic and are skipped rather than guessed at.
      if (!node.nodeId.startsWith("lesson:")) continue;
      const topic = node.nodeId.slice("lesson:".length) as TopicId;
      if (lessons[topic] !== undefined) continue;
      lessons[topic] = {
        topic,
        correct: 1,
        attempted: 1,
        completedAt: BETA_COMPLETED_AT,
      };
    }
    next = { ...next, lessons };
  }

  if (infiniteCharge) {
    next = {
      ...next,
      economy: {
        ...next.economy,
        charge: {
          ...next.economy.charge,
          current: next.economy.charge.cap,
          nextRegenAt: null,
          fullAt: null,
        },
      },
    };
  }

  return next;
}

/** A fixed stamp, so a beta unlock never looks like a real completion date. */
const BETA_COMPLETED_AT = "1970-01-01T00:00:00.000Z";

function project(stored: StoredProgress, receipt: Receipt | null, now: string): ProgressSnapshot {
  const economy = deriveEconomy(stored.journal, now, deriveOptions(stored.course));
  const days = new Set<string>();
  for (const event of stored.journal) {
    const ms = Date.parse(event.at);
    if (Number.isFinite(ms)) days.add(localDate(ms, event.tz));
  }
  return applyBetaFlags({
    course: stored.course,
    startTopics: stored.startTopics,
    lessons: stored.lessons,
    attemptedProblems: stored.attemptedProblems,
    diamonds: economy.diamonds.balance,
    activeDays: [...days].sort(),
    onboardingDone: stored.onboardingDone,
    displayName: stored.displayName,
    journal: stored.journal,
    economy,
    lastReceipt: receipt,
  });
}

export const EMPTY_PROGRESS: ProgressSnapshot = Object.freeze(project(EMPTY_STORED, null, nowIso()));

/**
 * v1 stored a diamond balance, an activeDays list and a lesson record per topic.
 * Only the last of those survives, because a balance is no longer a thing this
 * store is allowed to hold.
 *
 * THE MIGRATION IS LOSSY, and here is exactly how, so nobody is surprised later:
 *
 *   The old diamond balance is dropped. The new one is recomputed from the
 *   migrated clears, so it will land near the old number but not on it.
 *   v1 paid 10 plus 2 a correct answer; the economy pays 10 for a first clear
 *   plus the spine and flawless bonuses.
 *
 *   Which problems were answered correctly was never recorded, only how many.
 *   The migrated attempts mark the first `correct` of the topic's problems right
 *   and the rest wrong. The counts are true; the attribution is a guess.
 *
 *   Nothing was recorded per node about charge, flawlessness or steps, so every
 *   migrated clear is a plain non-flawless single step clear.
 *
 *   Streaks start from the migrated clear dates. A v1 student with a long
 *   history of active days but few completed lessons starts at a short streak.
 *
 * This is acceptable because the cache is a cache. It is written down because a
 * silently lossy migration is how a support ticket becomes a mystery.
 */
function migrateFromV1(raw: string): StoredProgress {
  const parsed = JSON.parse(raw) as Partial<{
    course: CourseId | null;
    startTopics: readonly TopicId[];
    lessons: Record<string, LessonRecord>;
    attemptedProblems: readonly ProblemId[];
    onboardingDone: boolean;
    displayName: string | null;
  }>;

  const tz = localZone();
  const lessons = parsed.lessons ?? {};
  const journal: EconomyEvent[] = [];
  const records = Object.values(lessons).filter((record): record is LessonRecord => record !== null && record !== undefined);
  records.sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt));

  for (const record of records) {
    const at = Number.isFinite(Date.parse(record.completedAt)) ? record.completedAt : nowIso();
    const nodeId = lessonNodeId(record.topic);
    for (let i = 0; i < record.attempted; i += 1) {
      journal.push({ kind: "attempt", at, tz, nodeId, problemId: `${nodeId}#${i}`, correct: i < record.correct });
    }
    journal.push({
      kind: "node_cleared",
      at,
      tz,
      nodeId,
      nodeKind: "concept",
      flawless: false,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: topicDifficulty(record.topic),
    });
  }

  return {
    course: parsed.course ?? null,
    startTopics: parsed.startTopics ?? [],
    lessons,
    attemptedProblems: parsed.attemptedProblems ?? [],
    onboardingDone: parsed.onboardingDone ?? false,
    displayName: parsed.displayName ?? null,
    journal,
  };
}

function load(): StoredProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<StoredProgress>;
      const journal = Array.isArray(parsed.journal) ? parsed.journal.filter(isEconomyEvent) : [];
      return { ...EMPTY_STORED, ...parsed, journal };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) return migrateFromV1(legacy);
    return EMPTY_STORED;
  } catch {
    return EMPTY_STORED;
  }
}

function save(stored: StoredProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage blocked: the session still works, it just does not persist */
  }
}

export function createLocalProgress(): ProgressSource {
  let stored = load();
  let receipt: Receipt | null = null;
  let snapshot = project(stored, receipt, nowIso());
  const listeners = new Set<() => void>();

  const commit = (next: StoredProgress, nextReceipt: Receipt | null): void => {
    stored = next;
    receipt = nextReceipt;
    snapshot = project(stored, receipt, nowIso());
    save(next);
    for (const listener of listeners) listener();
  };

  /** Append one event and keep its receipt, which is what the reward moment plays. */
  const appendOne = (make: (at: string, tz: string) => EconomyEvent): Receipt => {
    const at = nowIso();
    const event = make(at, localZone());
    // The receipt and the snapshot must read the same course, or a rank up on
    // the reward moment would not be a rank up on the pathway.
    const next = receiptFor(stored.journal, event, at, deriveOptions(stored.course));
    commit({ ...stored, journal: [...stored.journal, event] }, next);
    return next;
  };

  /** Append events that earn nothing on their own, without disturbing lastReceipt. */
  const appendQuietly = (events: readonly EconomyEvent[]): void => {
    if (events.length === 0) return;
    commit({ ...stored, journal: [...stored.journal, ...events] }, receipt);
  };

  /** A settings change has no lines to animate. This is what "nothing happened" looks like. */
  const emptyReceipt = (): Receipt => ({
    xp: [],
    diamonds: [],
    charge: { delta: 0 },
    streak: { counted: snapshot.economy.streak.todayCounted, current: snapshot.economy.streak.current },
    mastery: {
      visibleBefore: snapshot.economy.mastery.visible,
      visibleAfter: snapshot.economy.mastery.visible,
      rankUp: null,
    },
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setCourse(course, startTopics) {
      commit({ ...stored, course, startTopics: [...startTopics] }, receipt);
    },
    completeLesson(topic, correct, attempted, problemIds) {
      const at = nowIso();
      const tz = localZone();
      const nodeId = lessonNodeId(topic);

      // The attempts go in BEFORE the clear, at the same instant. The derivation
      // sorts by timestamp and keeps append order on a tie, so they read as part
      // of the clear rather than as reviews of it, which is what they were.
      // Which problems were right is not tracked per problem by the lesson
      // player, so the first `correct` of them carry the flag: the counts are
      // true and the attribution is a guess, same as the v1 migration.
      const attempts: EconomyEvent[] = problemIds.map((problemId, i) => ({
        kind: "attempt",
        at,
        tz,
        nodeId,
        problemId,
        correct: i < correct,
      }));
      const clear: EconomyEvent = {
        kind: "node_cleared",
        at,
        tz,
        nodeId,
        nodeKind: "concept",
        flawless: attempted > 0 && correct === attempted,
        stepsInOneSitting: 1,
        spine: true,
        // The same weight the course universe gives this topic, so the node
        // cannot be worth more in the numerator than it is in the denominator.
        difficulty: topicDifficulty(topic),
      };

      const journal = [...stored.journal, ...attempts];
      const next = receiptFor(journal, clear, at, deriveOptions(stored.course));
      commit(
        {
          ...stored,
          lessons: { ...stored.lessons, [topic]: { topic, correct, attempted, completedAt: at } },
          attemptedProblems: [...new Set([...stored.attemptedProblems, ...problemIds])],
          journal: [...journal, clear],
        },
        next,
      );
      return next.diamonds.reduce((sum, line) => sum + line.amount, 0);
    },
    finishOnboarding() {
      commit({ ...stored, onboardingDone: true }, receipt);
    },
    setDisplayName(name) {
      commit({ ...stored, displayName: name.trim() === "" ? null : name.trim() }, receipt);
    },
    reset() {
      commit(EMPTY_STORED, null);
    },
    append(event) {
      const next = receiptFor(stored.journal, event, nowIso(), deriveOptions(stored.course));
      commit({ ...stored, journal: [...stored.journal, event] }, next);
      return next;
    },
    startNode(nodeId, kind) {
      return appendOne((at, tz) => ({ kind: "node_started", at, tz, nodeId, nodeKind: kind }));
    },
    clearNode(nodeId, kind, options = {}) {
      const next = appendOne((at, tz) => ({
        kind: "node_cleared",
        at,
        tz,
        nodeId,
        nodeKind: kind,
        flawless: options.flawless ?? false,
        stepsInOneSitting: options.stepsInOneSitting ?? 1,
        spine: options.spine ?? false,
        difficulty: options.difficulty ?? LESSON_DIFFICULTY,
      }));
      return next.diamonds.reduce((sum, line) => sum + line.amount, 0);
    },
    spend(sink, cost, ref) {
      return appendOne((at, tz) =>
        ref === undefined ? { kind: "spend", at, tz, sink, cost } : { kind: "spend", at, tz, sink, cost, ref },
      );
    },
    setSettings(fields) {
      // A settings change earns nothing, so it does not replace a reward moment
      // the student has not seen yet. It still has to reach the journal.
      const at = nowIso();
      const event: EconomyEvent = { kind: "settings", at, tz: localZone(), ...fields };
      appendQuietly([event]);
      return emptyReceipt();
    },
  };
}

/** One instance for the app. Module scope, like the step scene in Phase 4. */
export const progress: ProgressSource = createLocalProgress();
