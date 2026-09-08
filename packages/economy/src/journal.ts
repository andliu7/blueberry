/**
 * The journal: the only thing this package stores.
 *
 * docs/ECONOMY.md, Anti-abuse: "Every balance is a derived column:
 * f(attempt history, spend history). Recomputable from scratch. A mismatch is an
 * incident, not a support ticket."
 *
 * So there is no balance type in this package. There is an append only list of
 * things that happened, and `deriveEconomy` is a pure function of that list and
 * a clock reading passed in from outside. Nothing here calls Date.now, reads a
 * timer, or touches a DOM. A caller that wants "now" supplies it.
 *
 * WHY EVERY EVENT CARRIES `tz`. Streak days and daily goals are counted in the
 * student's local time, and the same file says a client clock must not be able
 * to manufacture a day. Storing the IANA zone on the event, rather than a
 * precomputed local date, means the day boundary is recomputable from the
 * journal alone: the timestamp is absolute and the zone says how to read it. A
 * student who flies to Tokyo gets Tokyo days from that event onward, and their
 * old days do not silently move.
 *
 * WHY `combo_bonus` CARRIES A NUMBER. The combo mini game pays 2 to 6 charge,
 * and the amount is a server decision. The client records what the server
 * concluded, which is the same rule as the reward moment: the client animates,
 * it does not compute.
 */

/** The node kinds the pathway has. Charge prices and XP awards are per kind. */
export type NodeKind = "concept" | "reaction" | "branch" | "quiz" | "review" | "tutorial" | "intro";

/** Everything diamonds can be spent on. docs/ECONOMY.md, Sinks. */
export type SpendSink =
  | "costume"
  | "pathway_theme"
  | "canvas_skin"
  | "cloud_clear"
  | "pen_colour"
  | "streak_freeze"
  | "streak_repair"
  | "charge_topup";

/** The daily goal the student picked at onboarding. It is the streak's bar. */
export type DailyGoalTier = "casual" | "regular" | "serious" | "exam";

/** Node difficulty, the mastery weight. Same 1 to 5 scale as the curriculum package. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

interface EventBase {
  /** Absolute time, ISO 8601 with an offset or Z. */
  readonly at: string;
  /** IANA timezone the student was in, so local days are recomputable. */
  readonly tz: string;
}

export type EconomyEvent =
  | (EventBase & {
      readonly kind: "node_started";
      readonly nodeId: string;
      readonly nodeKind: NodeKind;
    })
  | (EventBase & {
      readonly kind: "node_cleared";
      readonly nodeId: string;
      readonly nodeKind: NodeKind;
      /** No wrong arrow on any step. First clear only, never on a replay. */
      readonly flawless: boolean;
      /** Steps completed in one sitting. 1 for a single step node. */
      readonly stepsInOneSitting: number;
      /** On the exam weighted spine, rather than a side branch. */
      readonly spine: boolean;
      readonly difficulty: Difficulty;
    })
  | (EventBase & { readonly kind: "quiz_passed"; readonly unitId: string; readonly flawless: boolean })
  | (EventBase & { readonly kind: "unit_cleared"; readonly unitId: string })
  | (EventBase & { readonly kind: "boss_cleared"; readonly bossId: string })
  | (EventBase & { readonly kind: "resonance_found"; readonly nodeId: string })
  | (EventBase & {
      readonly kind: "attempt";
      readonly nodeId: string;
      readonly problemId: string;
      readonly correct: boolean;
    })
  | (EventBase & {
      readonly kind: "spend";
      readonly sink: SpendSink;
      readonly cost: number;
      readonly ref?: string;
    })
  | (EventBase & { readonly kind: "combo_bonus"; readonly charge: number })
  | (EventBase & {
      readonly kind: "settings";
      readonly dailyGoal?: DailyGoalTier;
      readonly examDate?: string | null;
      readonly reminderHour?: number | null;
    });

export type EconomyEventKind = EconomyEvent["kind"];

const NODE_KINDS: readonly NodeKind[] = ["concept", "reaction", "branch", "quiz", "review", "tutorial", "intro"];

const SPEND_SINKS: readonly SpendSink[] = [
  "costume",
  "pathway_theme",
  "canvas_skin",
  "cloud_clear",
  "pen_colour",
  "streak_freeze",
  "streak_repair",
  "charge_topup",
];

const GOAL_TIERS: readonly DailyGoalTier[] = ["casual", "regular", "serious", "exam"];

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isIsoInstant(x: unknown): x is string {
  return typeof x === "string" && x.length > 0 && Number.isFinite(Date.parse(x));
}

/** YYYY-MM-DD, and a real calendar date rather than 2026-02-31. */
export function isCalendarDate(x: unknown): x is string {
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const ms = Date.parse(`${x}T00:00:00Z`);
  if (!Number.isFinite(ms)) return false;
  return new Date(ms).toISOString().slice(0, 10) === x;
}

function isTimezone(x: unknown): x is string {
  if (typeof x !== "string" || x.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: x });
    return true;
  } catch {
    return false;
  }
}

function isPositiveInt(x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) && x > 0;
}

function isNonNegativeNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0;
}

function nonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

/**
 * Structural validation for a value read back out of storage. The client store
 * writes JSON into localStorage, and localStorage is a place a student can
 * edit, so nothing loaded from it is trusted to be the shape it claims.
 *
 * This is a shape check and not an authorisation check. Phase 6's server is what
 * decides whether an event is allowed to exist; this only decides whether the
 * derivation can read it without throwing.
 */
export function isEconomyEvent(x: unknown): x is EconomyEvent {
  if (!isRecord(x)) return false;
  if (!isIsoInstant(x["at"])) return false;
  if (!isTimezone(x["tz"])) return false;

  switch (x["kind"]) {
    case "node_started":
      return nonEmptyString(x["nodeId"]) && NODE_KINDS.includes(x["nodeKind"] as NodeKind);
    case "node_cleared":
      return (
        nonEmptyString(x["nodeId"]) &&
        NODE_KINDS.includes(x["nodeKind"] as NodeKind) &&
        typeof x["flawless"] === "boolean" &&
        isPositiveInt(x["stepsInOneSitting"]) &&
        typeof x["spine"] === "boolean" &&
        isPositiveInt(x["difficulty"]) &&
        (x["difficulty"] as number) <= 5
      );
    case "quiz_passed":
      return nonEmptyString(x["unitId"]) && typeof x["flawless"] === "boolean";
    case "unit_cleared":
      return nonEmptyString(x["unitId"]);
    case "boss_cleared":
      return nonEmptyString(x["bossId"]);
    case "resonance_found":
      return nonEmptyString(x["nodeId"]);
    case "attempt":
      return nonEmptyString(x["nodeId"]) && nonEmptyString(x["problemId"]) && typeof x["correct"] === "boolean";
    case "spend":
      return (
        SPEND_SINKS.includes(x["sink"] as SpendSink) &&
        isNonNegativeNumber(x["cost"]) &&
        (x["ref"] === undefined || nonEmptyString(x["ref"]))
      );
    case "combo_bonus":
      return isPositiveInt(x["charge"]);
    case "settings":
      return (
        (x["dailyGoal"] === undefined || GOAL_TIERS.includes(x["dailyGoal"] as DailyGoalTier)) &&
        (x["examDate"] === undefined || x["examDate"] === null || isCalendarDate(x["examDate"])) &&
        (x["reminderHour"] === undefined ||
          x["reminderHour"] === null ||
          (typeof x["reminderHour"] === "number" &&
            Number.isInteger(x["reminderHour"]) &&
            x["reminderHour"] >= 0 &&
            x["reminderHour"] <= 23))
      );
    default:
      return false;
  }
}

/** Filter an unknown array down to the events that survive validation. */
export function readJournal(x: unknown): readonly EconomyEvent[] {
  if (!Array.isArray(x)) return [];
  return x.filter(isEconomyEvent);
}
