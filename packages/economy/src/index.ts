/**
 * @blueberry/economy
 *
 * The third engine. XP, Mastery, Diamonds, Charge and Streak, as one pure
 * function of an append only journal and a clock reading handed in from outside.
 *
 * docs/ECONOMY.md is the specification and this package is its executable half.
 * Where a number here disagrees with that document, the document wins.
 *
 * THE ONE DESIGN RULE. Every balance is a DERIVED value, f(journal, now).
 * Nothing is stored as a balance, nowhere, at any layer. That is ECONOMY.md's
 * Anti-abuse section, and it is what makes a server side recomputation able to
 * catch a client that lied: the client can only ever hold a cache of a number
 * the server can recompute from scratch.
 *
 * WHAT IS IN HERE:
 *
 *   journal.ts  The event union and its runtime validator. The only thing
 *               stored. Every event carries `at` and `tz`, so local days are
 *               recomputable and a client clock cannot manufacture one.
 *   rules.ts    Every number in ECONOMY.md as a named frozen constant, with the
 *               table row it came from beside it.
 *   time.ts     Local dates from Intl.DateTimeFormat. No date library.
 *   derive.ts   The derivation, the snapshot shape, and the receipt.
 *
 * NO REACT, NO DOM, NO TIMERS, NO Date.now. `deriveEconomy(journal, now)` takes
 * the clock as an argument, and every test in this package is written against a
 * fixed `now` for that reason. A function in here that read the host clock could
 * not be replayed, and a number that cannot be replayed cannot be audited.
 */

export type {
  DailyGoalTier,
  Difficulty,
  EconomyEvent,
  EconomyEventKind,
  NodeKind,
  SpendSink,
} from "./journal.js";
export { isCalendarDate, isEconomyEvent, readJournal } from "./journal.js";

export type { MasteryRank } from "./rules.js";
export {
  CHARGE_CAP,
  CHARGE_COMBO_MAX,
  CHARGE_COMBO_MIN,
  CHARGE_COST,
  CHARGE_FLAWLESS_BONUS,
  CHARGE_FREE_NODE_KINDS,
  CHARGE_QUIZ_REFUND,
  CHARGE_REGEN_MINUTES,
  CHARGE_REGEN_PER_INTERVAL,
  COSTUME_COST_RANGE,
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
  SINK_COST,
  STREAK_AT_RISK_HOUR,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_MAX_HELD,
  STREAK_MILESTONES,
  STREAK_REPAIR_COST,
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

export type {
  ChargeState,
  DeriveOptions,
  DiamondState,
  EconomySnapshot,
  MasteryState,
  Receipt,
  ReceiptLine,
  StreakSave,
  StreakState,
  UniverseNode,
  XpState,
} from "./derive.js";
export { canAfford, chargeCostFor, crackingNodes, deriveEconomy, emptyEconomy, nextDay, receiptFor } from "./derive.js";

export {
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
  zonedWallTimeToMs,
} from "./time.js";
