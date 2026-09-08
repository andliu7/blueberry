/**
 * The derivation. One pure function of (journal, now) to every number the
 * product shows.
 *
 * docs/ECONOMY.md, Anti-abuse, is the whole design rule and it is worth quoting
 * before reading the code:
 *
 *   "Every balance is a derived column: f(attempt history, spend history).
 *    Recomputable from scratch. A mismatch is an incident, not a support ticket."
 *   "Charge regeneration is computed from server time on read, never accumulated
 *    by a client tick."
 *   "The client animates what the server concluded."
 *
 * So there is no mutable balance anywhere in this package, no timer, and no
 * reading of the host clock. `now` is an argument. The same journal and the same
 * `now` produce the same snapshot, byte for byte, which is what makes a server
 * side recomputation able to catch a client that lied.
 *
 * HOW TO READ THIS FILE. There is one walk over the journal, in timestamp order,
 * which produces the per event awards, the charge simulation and the mastery
 * review history. Everything that is per DAY rather than per event, which is the
 * daily goal bonus, the streak, and the capped visible mastery dip, is a second
 * pass over the calendar afterwards. The two passes are separate because a day
 * boundary is not an event: nothing happens at midnight except that a day ends,
 * and a walk over events cannot see that.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no term anywhere below that subtracts
 * anything for a wrong answer. ECONOMY.md: "Mistakes cost nothing. Charge paces
 * volume. It never prices being wrong," and "Wrong answers are free and
 * journalled. Charging for mistakes is charging for learning." An `attempt` with
 * `correct: false` changes exactly nothing, and test/wrong-answers-free.test.ts
 * proves it against every number in the snapshot.
 */

import type { DailyGoalTier, Difficulty, EconomyEvent, NodeKind } from "./journal.js";
import type { MasteryRank } from "./rules.js";
import {
  CHARGE_CAP,
  CHARGE_COMBO_MAX,
  CHARGE_COMBO_MIN,
  CHARGE_COST,
  CHARGE_FLAWLESS_BONUS,
  CHARGE_QUIZ_REFUND,
  CHARGE_REGEN_MINUTES,
  CHARGE_REGEN_PER_INTERVAL,
  DAILY_GOAL_XP,
  DEFAULT_DAILY_GOAL,
  DIAMONDS_BOSS,
  DIAMONDS_FLAWLESS,
  DIAMONDS_NODE_FIRST_CLEAR,
  DIAMONDS_RESONANCE,
  DIAMONDS_REVIEW_CLEARED,
  DIAMONDS_SEQUENCE_PER_EXTRA_STEP,
  DIAMONDS_SPINE_BONUS,
  DIAMONDS_STREAK_MILESTONE,
  DIAMONDS_UNIT_CLEARED,
  EXAM_WINDOW_DAYS,
  MASTERY_CRACKING_THRESHOLD,
  MASTERY_DEFAULT_DIFFICULTY,
  MASTERY_HALF_LIFE_FACTOR,
  MASTERY_HALF_LIFE_MAX_DAYS,
  MASTERY_HALF_LIFE_START_DAYS,
  MASTERY_MIN_UNIVERSE_DIFFICULTY,
  MASTERY_RANKS,
  MASTERY_VISIBLE_DIP_CAP,
  REST_DAYS_PER_WEEK,
  STREAK_AT_RISK_HOUR,
  STREAK_FREEZE_MAX_HELD,
  STREAK_MILESTONES,
  STREAK_REPAIR_PER_MONTH,
  STREAK_REPAIR_WINDOW_HOURS,
  XP_DAILY_GOAL_MET,
  XP_FLAWLESS_BONUS,
  XP_NODE_FIRST_CLEAR,
  XP_QUIZ_FLAWLESS_BONUS,
  XP_QUIZ_PASSED,
  XP_REPLAY,
  XP_RESONANCE,
  XP_SEQUENCE_PER_EXTRA_STEP,
  nextRankAfter,
  rankFor,
} from "./rules.js";
import {
  MS_PER_DAY,
  addDays,
  dateRange,
  daysBetween,
  endOfLocalDayMs,
  isoWeekKey,
  localDate,
  localHour,
  monthKey,
  safeZone,
} from "./time.js";

/* ------------------------------------------------------------- the shape -- */

export interface XpState {
  readonly total: number;
  /** Earned on the local day `now` falls in, including the goal bonus if met. */
  readonly today: number;
  readonly goalTier: DailyGoalTier;
  readonly goalXp: number;
  readonly goalMet: boolean;
}

export interface DiamondState {
  /** earned minus spent. A negative balance means the journal holds a spend that
   * was never affordable, which is an incident to investigate, not a number to
   * clamp away. */
  readonly balance: number;
  readonly earned: number;
  readonly spent: number;
}

export interface ChargeState {
  readonly current: number;
  readonly cap: number;
  readonly examWindow: boolean;
  /** Days until the exam, 0 on the day itself. Null when no exam date is set or it has passed. */
  readonly examDaysLeft: number | null;
  /** When the next single point lands. Null at the cap or in the exam window. */
  readonly nextRegenAt: string | null;
  /** When the meter is full again. Null at the cap or in the exam window. */
  readonly fullAt: string | null;
}

export type StreakSave = "rest_day" | "freeze";

export interface StreakState {
  readonly current: number;
  readonly best: number;
  readonly todayCounted: boolean;
  /** Held freezes, capped at STREAK_FREEZE_MAX_HELD. */
  readonly freezes: number;
  /** The date this ISO week's free rest day was auto applied to, if it was. */
  readonly restDayThisWeek: string | null;
  readonly lastCountedDay: string | null;
  /** Set only when today's count crossed a milestone for the first time. */
  readonly milestoneReached: number | null;
  /** Goal unmet today and it is past STREAK_AT_RISK_HOUR locally. */
  readonly atRisk: boolean;
}

export interface MasteryState {
  /** What the model says, 0 to 100. */
  readonly score: number;
  /** What the student is shown. Falls by at most MASTERY_VISIBLE_DIP_CAP a day. */
  readonly visible: number;
  readonly rank: string;
  /** The highest rank ever reached. Once a Mechanist, always a Mechanist. */
  readonly floorRank: string;
  /** Cleared nodes whose strength fell under MASTERY_CRACKING_THRESHOLD. */
  readonly cracking: readonly string[];
  readonly nextRank: { readonly name: string; readonly at: number } | null;
}

export interface EconomySnapshot {
  /** Echoed back so a rendered snapshot can say what it was computed against. */
  readonly now: string;
  /** The zone the day boundaries were read in: the latest event's, or UTC. */
  readonly tz: string;
  readonly xp: XpState;
  readonly diamonds: DiamondState;
  readonly charge: ChargeState;
  readonly streak: StreakState;
  readonly mastery: MasteryState;
  /** Set like: every node id with a first clear. A replay of one of these earns 0. */
  readonly firstClears: Readonly<Record<string, true>>;
}

/** One node of the course the mastery score is measured against. */
export interface UniverseNode {
  readonly nodeId: string;
  readonly difficulty: Difficulty;
}

export interface DeriveOptions {
  /**
   * The course: every node mastery is scored out of, cleared or not.
   *
   * ECONOMY.md says Mastery is "0 to 100 per course", so the denominator is
   * the course and not whatever the journal happened to unlock. Without this
   * the derivation falls back to the unlocked set, which is enough to keep a
   * first clear in Reader but not enough to make the number mean "of the
   * course". A shell that knows the course should pass it.
   *
   * Either denominator is floored at MASTERY_MIN_UNIVERSE_DIFFICULTY, so a
   * course narrower than the floor caps below 100. That is deliberate; the
   * constant says why.
   *
   * A node the journal unlocked that is missing from the universe still
   * counts, on both sides of the fraction, so the score never exceeds 100.
   */
  readonly universe?: readonly UniverseNode[];
}

export interface ReceiptLine {
  readonly label: string;
  readonly amount: number;
}

export interface Receipt {
  readonly xp: readonly ReceiptLine[];
  readonly diamonds: readonly ReceiptLine[];
  readonly charge: { readonly delta: number };
  readonly streak: {
    readonly counted: boolean;
    readonly current: number;
    readonly milestone?: number;
    readonly savedBy?: StreakSave;
  };
  readonly mastery: {
    readonly visibleBefore: number;
    readonly visibleAfter: number;
    readonly rankUp: string | null;
  };
}

/* --------------------------------------------------------- the internals -- */

interface Entry {
  readonly event: EconomyEvent;
  readonly ms: number;
  readonly order: number;
}

interface EventAwards {
  readonly xp: ReceiptLine[];
  readonly diamonds: ReceiptLine[];
}

interface NodeMastery {
  difficulty: number;
  /** Clear and successful review instants, in order. The first is the first clear. */
  readonly moments: number[];
  unlockedAt: number;
}

interface SettingsAt {
  readonly ms: number;
  readonly goal: DailyGoalTier;
  readonly examDate: string | null;
}

interface RunResult {
  readonly snapshot: EconomySnapshot;
  readonly awards: readonly EventAwards[];
  /** The rest day or freeze that bridged the gap before the most recent counted day. */
  readonly bridgedBy: StreakSave | null;
}

function halfLifeDaysAfter(reviews: number): number {
  return Math.min(MASTERY_HALF_LIFE_MAX_DAYS, MASTERY_HALF_LIFE_START_DAYS * Math.pow(MASTERY_HALF_LIFE_FACTOR, reviews));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function settingsAt(timeline: readonly SettingsAt[], ms: number): SettingsAt {
  let found: SettingsAt = { ms: Number.NEGATIVE_INFINITY, goal: DEFAULT_DAILY_GOAL, examDate: null };
  for (const entry of timeline) {
    if (entry.ms <= ms) found = entry;
    else break;
  }
  return found;
}

/**
 * True when `date` sits inside the exam window: EXAM_WINDOW_DAYS before the exam
 * date, through the exam date itself, both ends included.
 */
function inExamWindow(date: string, examDate: string | null): boolean {
  if (examDate === null) return false;
  const left = daysBetween(date, examDate);
  return left >= 0 && left <= EXAM_WINDOW_DAYS;
}

/* ---------------------------------------------------------------- the run -- */

function run(journal: readonly EconomyEvent[], now: string, options: DeriveOptions = {}): RunResult {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    throw new TypeError(`deriveEconomy needs an ISO instant for "now", received ${JSON.stringify(now)}`);
  }

  // Stable sort: timestamp first, original position as the tie break. Two events
  // stamped at the same millisecond keep the order they were appended in, which
  // is what lets a caller record "these attempts, then the clear" atomically.
  const entries: Entry[] = journal
    .map((event, order) => ({ event, ms: Date.parse(event.at), order }))
    .filter((entry) => Number.isFinite(entry.ms))
    .sort((a, b) => (a.ms === b.ms ? a.order - b.order : a.ms - b.ms));

  const awards: EventAwards[] = journal.map(() => ({ xp: [], diamonds: [] }));

  const tz = safeZone(entries.length === 0 ? "UTC" : (entries[entries.length - 1] as Entry).event.tz);
  const today = localDate(nowMs, tz);

  /* --- settings timeline, so a day is judged by the goal in force that day --- */

  const settingsTimeline: SettingsAt[] = [];
  {
    let goal: DailyGoalTier = DEFAULT_DAILY_GOAL;
    let examDate: string | null = null;
    for (const entry of entries) {
      if (entry.event.kind !== "settings") continue;
      if (entry.event.dailyGoal !== undefined) goal = entry.event.dailyGoal;
      if (entry.event.examDate !== undefined) examDate = entry.event.examDate;
      settingsTimeline.push({ ms: entry.ms, goal, examDate });
    }
  }
  const settingsNow = settingsAt(settingsTimeline, nowMs);

  /* --------------------------------- pass one: the walk over the journal --- */

  const firstClears: Record<string, true> = {};
  const resonanceSeen = new Set<string>();
  const nodes = new Map<string, NodeMastery>();
  const xpByDay = new Map<string, number>();
  const dayHasEvent = new Set<string>();
  const freezePurchases: string[] = [];
  const repairs: { readonly ms: number; readonly date: string }[] = [];

  let earned = 0;
  let spent = 0;
  let charge = CHARGE_CAP;
  // The instant whole regeneration intervals are counted from. Held at `now`
  // whenever the meter is full, so a full meter never banks credit.
  let regenAnchor = entries.length === 0 ? nowMs : (entries[0] as Entry).ms;

  const applyRegen = (ms: number): void => {
    if (charge >= CHARGE_CAP) {
      regenAnchor = ms;
      return;
    }
    const interval = CHARGE_REGEN_MINUTES * 60_000;
    const gained = Math.floor((ms - regenAnchor) / interval) * CHARGE_REGEN_PER_INTERVAL;
    if (gained <= 0) return;
    charge = Math.min(CHARGE_CAP, charge + gained);
    regenAnchor = charge >= CHARGE_CAP ? ms : regenAnchor + Math.ceil(gained / CHARGE_REGEN_PER_INTERVAL) * interval;
  };

  const unlock = (nodeId: string, ms: number, difficulty?: number): NodeMastery => {
    const existing = nodes.get(nodeId);
    if (existing !== undefined) {
      if (difficulty !== undefined) existing.difficulty = difficulty;
      return existing;
    }
    const made: NodeMastery = {
      difficulty: difficulty ?? MASTERY_DEFAULT_DIFFICULTY,
      moments: [],
      unlockedAt: ms,
    };
    nodes.set(nodeId, made);
    return made;
  };

  for (const entry of entries) {
    const { event, ms, order } = entry;
    const day = localDate(ms, event.tz);
    dayHasEvent.add(day);
    const line = awards[order] as EventAwards;
    const settings = settingsAt(settingsTimeline, ms);
    const examNow = inExamWindow(day, settings.examDate);

    switch (event.kind) {
      case "node_started": {
        applyRegen(ms);
        // Charge is spent on ENTRY, never per question, and never inside the
        // exam window. Free kinds are already 0 in CHARGE_COST.
        const cost = examNow ? 0 : CHARGE_COST[event.nodeKind];
        charge = Math.max(0, charge - cost);
        unlock(event.nodeId, ms);
        break;
      }

      case "node_cleared": {
        const node = unlock(event.nodeId, ms, event.difficulty);
        const isFirst = firstClears[event.nodeId] === undefined;
        const kind: NodeKind = event.nodeKind;

        if (isFirst) {
          firstClears[event.nodeId] = true;
          const base = XP_NODE_FIRST_CLEAR[kind];
          if (base > 0) line.xp.push({ label: "First clear", amount: base });
          if (event.flawless) line.xp.push({ label: "Flawless", amount: XP_FLAWLESS_BONUS });
          const extraSteps = Math.max(0, event.stepsInOneSitting - 1);
          if (extraSteps > 0) {
            line.xp.push({ label: "One sitting", amount: XP_SEQUENCE_PER_EXTRA_STEP * extraSteps });
          }

          if (kind === "review") {
            line.diamonds.push({ label: "Review drill", amount: DIAMONDS_REVIEW_CLEARED });
          } else if (kind !== "quiz") {
            line.diamonds.push({ label: "First clear", amount: DIAMONDS_NODE_FIRST_CLEAR });
            if (event.spine) line.diamonds.push({ label: "Spine node", amount: DIAMONDS_SPINE_BONUS });
          }
          if (kind !== "quiz") {
            if (event.flawless) line.diamonds.push({ label: "Flawless", amount: DIAMONDS_FLAWLESS });
            if (extraSteps > 0) {
              line.diamonds.push({
                label: "One sitting",
                amount: DIAMONDS_SEQUENCE_PER_EXTRA_STEP * extraSteps,
              });
            }
          }
        } else if (kind === "review") {
          // The one repeatable earner. Re-practice is the one thing worth repeating.
          line.xp.push({ label: "Review drill", amount: XP_NODE_FIRST_CLEAR.review });
          line.diamonds.push({ label: "Review drill", amount: DIAMONDS_REVIEW_CLEARED });
        } else {
          line.xp.push({ label: "Replay", amount: XP_REPLAY });
        }

        // Charge: a flawless clear pays back, on a replay too. A replay costs
        // more to enter than the bonus returns, so this cannot be farmed.
        if (event.flawless) {
          applyRegen(ms);
          charge = Math.min(CHARGE_CAP, charge + CHARGE_FLAWLESS_BONUS);
        }

        node.moments.push(ms);
        break;
      }

      case "quiz_passed": {
        line.xp.push({ label: "Unit quiz passed", amount: XP_QUIZ_PASSED });
        if (event.flawless) line.xp.push({ label: "Flawless quiz", amount: XP_QUIZ_FLAWLESS_BONUS });
        applyRegen(ms);
        charge = Math.min(CHARGE_CAP, charge + CHARGE_QUIZ_REFUND);
        break;
      }

      case "unit_cleared":
        line.diamonds.push({ label: "Unit cleared", amount: DIAMONDS_UNIT_CLEARED });
        break;

      case "boss_cleared":
        line.diamonds.push({ label: "Boss cleared", amount: DIAMONDS_BOSS });
        break;

      case "resonance_found": {
        // Once per node. Hunting supplements, never replaces, and a node whose
        // resonance is already found is not a renewable source of diamonds.
        if (!resonanceSeen.has(event.nodeId)) {
          resonanceSeen.add(event.nodeId);
          line.xp.push({ label: "Resonance found", amount: XP_RESONANCE });
          line.diamonds.push({ label: "Resonance found", amount: DIAMONDS_RESONANCE });
        }
        break;
      }

      case "attempt": {
        // A correct attempt AFTER the node's first clear is a successful review:
        // strength back to 1.0 and the half life doubles. A correct attempt that
        // is part of the clear itself is not, or every clear would count as its
        // own review. A wrong attempt does nothing at all, by design.
        //
        // An attempt does NOT unlock a node either. It cannot happen without a
        // node_started in practice, and if it did, unlocking here would grow the
        // mastery denominator: a wrong answer would then cost mastery, which is
        // the one thing ECONOMY.md says three times must never happen.
        const node = nodes.get(event.nodeId);
        if (node !== undefined && event.correct && firstClears[event.nodeId] !== undefined) {
          node.moments.push(ms);
        }
        break;
      }

      case "spend": {
        spent += event.cost;
        if (event.sink === "charge_topup") {
          applyRegen(ms);
          charge = CHARGE_CAP;
        } else if (event.sink === "streak_freeze") {
          freezePurchases.push(day);
        } else if (event.sink === "streak_repair") {
          repairs.push({ ms, date: day });
        }
        break;
      }

      case "combo_bonus": {
        applyRegen(ms);
        charge = Math.min(CHARGE_CAP, charge + clamp(event.charge, CHARGE_COMBO_MIN, CHARGE_COMBO_MAX));
        break;
      }

      case "settings":
        break;
    }

    let dayXp = xpByDay.get(day) ?? 0;
    for (const item of line.xp) dayXp += item.amount;
    xpByDay.set(day, dayXp);
    for (const item of line.diamonds) earned += item.amount;
  }

  /* ------------------------------------------------ charge, read at `now` --- */

  const examWindowNow = inExamWindow(today, settingsNow.examDate);
  applyRegen(nowMs);
  if (examWindowNow) {
    // "Exam in 9 days. No limits until then." The meter is not merely ignored,
    // it reads full, because a half empty meter that does not bind still worries.
    charge = CHARGE_CAP;
    regenAnchor = nowMs;
  }

  const regenInterval = CHARGE_REGEN_MINUTES * 60_000;
  const chargeState: ChargeState = {
    current: charge,
    cap: CHARGE_CAP,
    examWindow: examWindowNow,
    examDaysLeft:
      settingsNow.examDate === null || daysBetween(today, settingsNow.examDate) < 0
        ? null
        : daysBetween(today, settingsNow.examDate),
    nextRegenAt: charge >= CHARGE_CAP ? null : new Date(regenAnchor + regenInterval).toISOString(),
    fullAt:
      charge >= CHARGE_CAP
        ? null
        : new Date(regenAnchor + Math.ceil((CHARGE_CAP - charge) / CHARGE_REGEN_PER_INTERVAL) * regenInterval).toISOString(),
  };

  /* ------------------------------------------- pass two: over the calendar --- */

  const firstDay = entries.length === 0 ? today : localDate((entries[0] as Entry).ms, (entries[0] as Entry).event.tz);
  const days = daysBetween(firstDay, today) < 0 ? [today] : dateRange(firstDay, today);

  const goalFor = (date: string): DailyGoalTier => settingsAt(settingsTimeline, endOfLocalDayMs(date, tz)).goal;
  const examFor = (date: string): boolean => inExamWindow(date, settingsAt(settingsTimeline, endOfLocalDayMs(date, tz)).examDate);

  let xpTotal = 0;
  const counted = new Set<string>();
  for (const date of days) {
    const base = xpByDay.get(date) ?? 0;
    const goalXp = DAILY_GOAL_XP[goalFor(date)];
    const met = base >= goalXp && base > 0;
    xpTotal += base + (met ? XP_DAILY_GOAL_MET : 0);
    // The streak's bar is the goal. Inside the exam window the requirement drops
    // to opening the app, which is any journalled event that day.
    if (met || (examFor(date) && dayHasEvent.has(date))) counted.add(date);
  }

  const todayBase = xpByDay.get(today) ?? 0;
  const todayGoalTier = goalFor(today);
  const todayGoalXp = DAILY_GOAL_XP[todayGoalTier];
  const todayGoalMet = todayBase >= todayGoalXp && todayBase > 0;

  const xpState: XpState = {
    total: xpTotal,
    today: todayBase + (todayGoalMet ? XP_DAILY_GOAL_MET : 0),
    goalTier: todayGoalTier,
    goalXp: todayGoalXp,
    goalMet: todayGoalMet,
  };

  /* --------------------------------------------------------- the streak --- */

  const freezesBoughtOn = new Map<string, number>();
  for (const date of freezePurchases) freezesBoughtOn.set(date, (freezesBoughtOn.get(date) ?? 0) + 1);

  let current = 0;
  let best = 0;
  let freezes = 0;
  let lastCountedDay: string | null = null;
  const restDayUsed = new Map<string, string>();
  const repairsUsedByMonth = new Map<string, number>();
  const repairsSpent = new Set<number>();
  const milestonesEver = new Set<number>();
  let milestoneToday: number | null = null;
  let pendingSave: StreakSave | null = null;
  let bridgedBy: StreakSave | null = null;

  for (const date of days) {
    const bought = freezesBoughtOn.get(date) ?? 0;
    if (bought > 0) freezes = Math.min(STREAK_FREEZE_MAX_HELD, freezes + bought);

    if (counted.has(date)) {
      current += 1;
      lastCountedDay = date;
      bridgedBy = pendingSave;
      pendingSave = null;
      if (current > best) best = current;
      if (STREAK_MILESTONES.includes(current) && !milestonesEver.has(current)) {
        milestonesEver.add(current);
        if (date === today) milestoneToday = current;
      }
      continue;
    }

    if (date === today) {
      // Today is not over. An unmet goal at 09:00 is not a broken streak, and
      // rendering it as one is the anxiety loop ECONOMY.md's mitigations exist
      // to avoid. Protections are spent when the day ends, not while it runs.
      continue;
    }

    // Order: the free weekly rest day first, then a held freeze, then a repair.
    // Free protection before paid protection, always.
    const week = isoWeekKey(date);
    const restDaysLeft = restDayUsed.has(week) ? 0 : REST_DAYS_PER_WEEK;
    if (current > 0 && restDaysLeft > 0) {
      restDayUsed.set(week, date);
      pendingSave = "rest_day";
      continue;
    }
    if (current > 0 && freezes > 0) {
      freezes -= 1;
      pendingSave = "freeze";
      continue;
    }

    // Out of free protection. A repair bought inside the window buys the streak
    // back, once a calendar month. The break instant is the end of the missed day.
    const breakMs = endOfLocalDayMs(date, tz);
    const repair = repairs.find(
      (candidate) =>
        !repairsSpent.has(candidate.ms) &&
        candidate.ms >= breakMs &&
        candidate.ms <= breakMs + STREAK_REPAIR_WINDOW_HOURS * 3_600_000 &&
        (repairsUsedByMonth.get(monthKey(candidate.date)) ?? 0) < STREAK_REPAIR_PER_MONTH,
    );
    if (current > 0 && repair !== undefined) {
      repairsSpent.add(repair.ms);
      repairsUsedByMonth.set(monthKey(repair.date), (repairsUsedByMonth.get(monthKey(repair.date)) ?? 0) + 1);
      continue;
    }

    current = 0;
    pendingSave = null;
  }

  const thisWeek = isoWeekKey(today);
  const streakState: StreakState = {
    current,
    best,
    todayCounted: counted.has(today),
    freezes,
    restDayThisWeek: restDayUsed.get(thisWeek) ?? null,
    lastCountedDay,
    milestoneReached: milestoneToday,
    atRisk: !counted.has(today) && localHour(nowMs, tz) >= STREAK_AT_RISK_HOUR,
  };

  /* -------------------------------------------------------- the mastery --- */

  const nodeList = [...nodes.entries()];

  // The denominator is the course when the caller named one. A universe node
  // the journal has also seen is weighted at the journal's difficulty on both
  // sides, so the two never disagree and the fraction cannot pass 1. A node the
  // journal unlocked outside the universe is added on both sides for the same
  // reason. With no universe the unlocked set stands in, floored so a single
  // clear cannot read as a whole course: see MASTERY_MIN_UNIVERSE_DIFFICULTY.
  const universe = options.universe;
  const universeById = new Map<string, number>();
  if (universe !== undefined) for (const item of universe) universeById.set(item.nodeId, item.difficulty);
  let universeBase = 0;
  for (const difficulty of universeById.values()) universeBase += difficulty;

  const modelScoreAt = (ms: number): number => {
    let numerator = 0;
    let denominator = universeBase;
    for (const [nodeId, node] of nodeList) {
      if (node.unlockedAt > ms) continue;
      denominator += node.difficulty - (universeById.get(nodeId) ?? 0);
      let reviews = -1;
      let last = Number.NEGATIVE_INFINITY;
      for (const moment of node.moments) {
        if (moment > ms) break;
        reviews += 1;
        last = moment;
      }
      if (reviews < 0) continue;
      const halfLife = halfLifeDaysAfter(reviews);
      const elapsedDays = (ms - last) / MS_PER_DAY;
      numerator += node.difficulty * Math.pow(0.5, elapsedDays / halfLife);
    }
    // The floor applies to both denominators, not only the fallback: three of
    // the four content courses are currently narrower than it, so a named course
    // was reintroducing the same bug. See MASTERY_MIN_UNIVERSE_DIFFICULTY, which
    // carries the arithmetic and the reason the cap on a small course is right.
    denominator = Math.max(denominator, MASTERY_MIN_UNIVERSE_DIFFICULTY);
    return (100 * numerator) / denominator;
  };

  // The visible number is replayed day by day, because the cap is per day: a
  // model that fell 9 points over four days is shown falling 2, 2, 2, 2. Rises
  // are never capped, because a student who did the work sees the work.
  //
  // Each day is sampled at every event instant inside it and again at its end.
  // Sampling only at day ends would lose a peak reached and lost inside one day,
  // and that peak is exactly what the rank floor is a promise about: an earned
  // badge is permanent, so the score that earned it has to be seen.
  const sampleTimes = entries.map((entry) => entry.ms).filter((ms) => ms <= nowMs);
  let visible = 0;
  let floorScore = 0;
  let previousDayEnd: number | null = null;
  const score = modelScoreAt(nowMs);
  let cursor = 0;
  for (let i = 0; i < days.length; i += 1) {
    const date = days[i] as string;
    const dayEnd = i === days.length - 1 ? nowMs : Math.min(endOfLocalDayMs(date, tz), nowMs);
    const samples: number[] = [];
    while (cursor < sampleTimes.length && (sampleTimes[cursor] as number) <= dayEnd) {
      samples.push(sampleTimes[cursor] as number);
      cursor += 1;
    }
    samples.push(dayEnd);
    // A day may fall at most MASTERY_VISIBLE_DIP_CAP below where the last one
    // ended, whatever the model does inside it.
    const dayFloor = previousDayEnd === null ? Number.NEGATIVE_INFINITY : previousDayEnd - MASTERY_VISIBLE_DIP_CAP;
    for (const sample of samples) {
      visible = Math.max(modelScoreAt(sample), dayFloor);
      if (visible > floorScore) floorScore = visible;
    }
    previousDayEnd = visible;
  }

  const cracking: string[] = [];
  for (const [nodeId, node] of nodeList) {
    if (node.moments.length === 0) continue;
    const last = node.moments[node.moments.length - 1] as number;
    const halfLife = halfLifeDaysAfter(node.moments.length - 1);
    const strength = Math.pow(0.5, (nowMs - last) / MS_PER_DAY / halfLife);
    if (strength < MASTERY_CRACKING_THRESHOLD) cracking.push(nodeId);
  }
  cracking.sort();

  const visibleRounded = Math.round(visible * 10) / 10;
  const floorRounded = Math.round(floorScore * 10) / 10;
  const rank = rankFor(visibleRounded);
  const floorRank = rankFor(floorRounded);
  const upcoming = nextRankAfter(rank);

  const masteryState: MasteryState = {
    score: Math.round(score * 10) / 10,
    visible: visibleRounded,
    rank: rank.name,
    floorRank: floorRank.name,
    cracking,
    nextRank: upcoming === null ? null : { name: upcoming.name, at: upcoming.at },
  };

  /* ----------------------------------- the two award kinds day two knows --- */

  let earnedTotal = earned;
  earnedTotal += milestonesEver.size * DIAMONDS_STREAK_MILESTONE;
  // Rank awards are paid on the FLOOR rank, once each, because ranks have a
  // floor: a score that sags and recovers must not pay the same badge twice.
  // The floor is read at the same rounding the badge is displayed at, so the
  // number that paid and the number on screen can never disagree.
  for (const rankRow of MASTERY_RANKS) {
    if (rankRow.diamonds > 0 && floorRounded >= rankRow.at) earnedTotal += rankRow.diamonds;
  }

  const snapshot: EconomySnapshot = {
    now,
    tz,
    xp: xpState,
    diamonds: { balance: earnedTotal - spent, earned: earnedTotal, spent },
    charge: chargeState,
    streak: streakState,
    mastery: masteryState,
    firstClears,
  };

  return { snapshot, awards, bridgedBy };
}

/* ------------------------------------------------------------- the API --- */

/**
 * The whole package in one call. Pure: same journal and same `now`, same result.
 */
export function deriveEconomy(journal: readonly EconomyEvent[], now: string, options?: DeriveOptions): EconomySnapshot {
  return run(journal, now, options).snapshot;
}

/**
 * The lines the reward moment animates for one event.
 *
 * `journal` is the history BEFORE `event`. The receipt is the difference between
 * deriving without it and deriving with it, which is why nothing here can drift
 * from the snapshot: there is one set of rules and this reads it twice.
 *
 * ECONOMY.md: "The client animates what the server concluded. The reward moment
 * plays from the server's receipt, never from local math."
 */
export function receiptFor(
  journal: readonly EconomyEvent[],
  event: EconomyEvent,
  now: string,
  options?: DeriveOptions,
): Receipt {
  // Both sides read the same universe, so a rank up on the receipt is a rank
  // up in the snapshot and never an artefact of a different denominator.
  const before = run(journal, now, options);
  const after = run([...journal, event], now, options);
  const mine = after.awards[after.awards.length - 1] ?? { xp: [], diamonds: [] };

  const xp: ReceiptLine[] = [...mine.xp];
  const diamonds: ReceiptLine[] = [...mine.diamonds];

  // Threshold awards belong to the event that crossed them, and only the
  // before/after comparison can say which event that was.
  if (after.snapshot.xp.goalMet && !before.snapshot.xp.goalMet) {
    xp.push({ label: "Daily goal", amount: XP_DAILY_GOAL_MET });
  }
  const milestone = after.snapshot.streak.milestoneReached;
  if (milestone !== null && before.snapshot.streak.milestoneReached === null) {
    diamonds.push({ label: `${milestone} day streak`, amount: DIAMONDS_STREAK_MILESTONE });
  }
  // A rank up is a change in the FLOOR rank, not in the current one, because the
  // floor is what the badge and the award are keyed to. Every rank crossed is
  // paid, not only the highest, so a single event that jumps two bands cannot
  // quietly swallow one of the awards.
  const wasAt = MASTERY_RANKS.findIndex((candidate) => candidate.name === before.snapshot.mastery.floorRank);
  const nowAt = MASTERY_RANKS.findIndex((candidate) => candidate.name === after.snapshot.mastery.floorRank);
  const rankUp = nowAt > wasAt ? after.snapshot.mastery.floorRank : null;
  for (let index = wasAt + 1; index <= nowAt; index += 1) {
    const row = MASTERY_RANKS[index] as MasteryRank;
    if (row.diamonds > 0) diamonds.push({ label: `New rank: ${row.name}`, amount: row.diamonds });
  }

  const counted = after.snapshot.streak.todayCounted;
  const justCounted = counted && !before.snapshot.streak.todayCounted;

  return {
    xp,
    diamonds,
    charge: { delta: after.snapshot.charge.current - before.snapshot.charge.current },
    streak: {
      counted,
      current: after.snapshot.streak.current,
      ...(milestone !== null && before.snapshot.streak.milestoneReached === null ? { milestone } : {}),
      ...(justCounted && after.bridgedBy !== null ? { savedBy: after.bridgedBy } : {}),
    },
    mastery: {
      visibleBefore: before.snapshot.mastery.visible,
      visibleAfter: after.snapshot.mastery.visible,
      rankUp,
    },
  };
}

/** A snapshot for a student with no history. Handy as a render default. */
export function emptyEconomy(now: string): EconomySnapshot {
  return deriveEconomy([], now);
}

/** Node ids whose strength has fallen far enough to ask for a review. */
export function crackingNodes(snapshot: EconomySnapshot): readonly string[] {
  return snapshot.mastery.cracking;
}

/** Charge the given node kind would cost right now. 0 inside the exam window. */
export function chargeCostFor(kind: NodeKind, snapshot: EconomySnapshot): number {
  return snapshot.charge.examWindow ? 0 : CHARGE_COST[kind];
}

/** Whether the student can enter this node kind right now. */
export function canAfford(kind: NodeKind, snapshot: EconomySnapshot): boolean {
  return snapshot.charge.current >= chargeCostFor(kind, snapshot);
}

/** The next date after `date`, in the student's civil calendar. Exported for callers building day strips. */
export function nextDay(date: string): string {
  return addDays(date, 1);
}
