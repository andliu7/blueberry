/**
 * The mastery rank card and the rank-up moment, as DATA. No React, no DOM, no
 * colours, and no clock.
 *
 * WHAT THIS FILE IS NOT. It is not a second mastery derivation. CLAUDE.md:
 * the rating is computed server side from the append-only attempt history and
 * "the client RENDERS it and never decides it", and docs/ECONOMY.md's
 * Anti-abuse section says the same thing about every balance. So every number
 * below is READ off an `EconomySnapshot` that `deriveEconomy` already produced,
 * and the two places that could have been quietly reimplemented here are not:
 *
 *   the visible score   `snapshot.mastery.visible`, which packages/economy
 *                       already replays day by day with the dip cap applied.
 *                       This file never touches `mastery.score`, the raw model
 *                       number, because ECONOMY.md's presentation rules say the
 *                       model may be harsh and the display may not be.
 *   the rank ladder     `MASTERY_RANKS`, `rankFor` and `nextRankAfter` from the
 *                       package. The thresholds are not restated here; a table
 *                       copied into a view is a table that goes stale.
 *
 * THE FIVE PRESENTATION RULES ECONOMY.md CALLS NON-OPTIONAL, and where each one
 * lands, because these are the whole reason this model exists instead of the
 * card reading the snapshot directly:
 *
 *   "Lead with the sentence, not the number."  `claim` is a field of its own and
 *      the view puts it above `score`. The rank's claim is what the badge means;
 *      the number is a reading of how far through the band the student is.
 *   "Never render decay as a loss."  There is deliberately NO delta field here.
 *      Nothing in this model can express "you dropped 3", because the only way
 *      to draw that is to have the number to draw it from. What decay produces
 *      instead is `restore`, the cracking count with its one-tap fix.
 *   "Cap the visible dip at 2 points a day."  Enforced upstream; surfaced here
 *      as `dipCap` so the reassurance sentence quotes the constant rather than
 *      a literal, and cannot drift away from what the engine actually does.
 *   "Ranks have a floor."  `badge` is the FLOOR rank, always, never the current
 *      one. `held` is true when the two disagree, which is the only moment the
 *      floor is doing visible work, and it is what the copy explains.
 *   "Never show Mastery inside a node."  Not expressible here; it is a placement
 *      rule and it is stated in index.ts for whoever mounts this.
 *
 * THE ONE PLACE THIS DIVERGES FROM `snapshot.mastery.nextRank`, and it is
 * deliberate. That field is `nextRankAfter(rankFor(visible))`, keyed to the
 * CURRENT rank. When a score has sagged below an earned badge, the current rank
 * is lower than the floor, so that field names a rank the student already holds:
 * the card would show a Mechanist badge and "next up: Mechanist" underneath it.
 * `next` here is `nextRankAfter(badge)`, keyed to the floor, so it always names
 * the next UNEARNED rank. Same function, from the same package, applied to the
 * row the badge is actually drawn from.
 */

import {
  MASTERY_RANKS,
  MASTERY_VISIBLE_DIP_CAP,
  nextRankAfter,
  type EconomySnapshot,
  type MasteryRank,
  type Receipt,
} from "@blueberry/economy";

/* --------------------------------------------------------------- motifs -- */

/**
 * The mark drawn on a rank badge.
 *
 * OWNER RULING 4 OF 2026-09-04 APPLIED TO THIS SURFACE: every node carries its
 * motif, and "an empty chip reads as broken rather than as unauthored". A rank
 * badge is a chip, so it carries one too, and rulings 1 and 2 decide the order:
 * the badge is the PICTURE and the rank name is its caption, small and in the
 * muted ink, never the other way round.
 *
 * The six are a ladder of arrows getting longer, which is what the ranks
 * themselves are: a structure you can read, one arrow, one prediction, a route
 * forward, a route backward, and the rosette at the end.
 */
export type RankMotif = "structure" | "arrow" | "predict" | "route" | "retro" | "rosette";

/**
 * Rank name to motif. Keyed by NAME rather than by index so that a rank added
 * to `MASTERY_RANKS` in the middle of the ladder does not silently reassign
 * five other marks.
 *
 * `rankMotif` returns null for a name that is not in here, and the view draws
 * the dashed queued treatment for a null. That is ruling 4's own answer for
 * unauthored content, and it is why this does not throw: a rank the package
 * gained and this file has not caught up with should render as "a rank whose
 * mark is not drawn yet", not as a crash on the profile tab.
 * `test/masteryCard.test.ts` asserts every rank shipping today has one, so the
 * null path is a real fallback rather than a place to leave work.
 */
const MOTIF_BY_RANK: Readonly<Record<string, RankMotif>> = Object.freeze({
  Reader: "structure",
  "Arrow Pusher": "arrow",
  Mechanist: "predict",
  Synthesist: "route",
  Retrosynthesist: "retro",
  "Exam Ready": "rosette",
});

export function rankMotif(name: string): RankMotif | null {
  return MOTIF_BY_RANK[name] ?? null;
}

/* -------------------------------------------------------------- readings -- */

/** One rank, as everything a view needs to draw it. */
export interface RankReading {
  readonly name: string;
  /** The lowest visible score that holds this rank. */
  readonly at: number;
  /** What the rank claims the student can do. ECONOMY.md's Mastery table. */
  readonly claim: string;
  /** Position on the ladder, 0 at Reader. */
  readonly index: number;
  /** Null when no mark is drawn for this rank yet. See rankMotif. */
  readonly motif: RankMotif | null;
}

/** Where a ladder row sits relative to the badge the student holds. */
export type LadderState = "earned" | "current" | "ahead";

export interface LadderRow extends RankReading {
  readonly state: LadderState;
  /**
   * The line under the rank's name on the ladder.
   *
   * IT IS THE CLAIM ON EVERY ROW BUT THE CURRENT ONE, and that exception is
   * what keeps the card from printing one sentence twice. The claim of the rank
   * a student holds is already the card's headline, three lines above, and the
   * S3 blind verdict was won on the bar's habit of showing a number with no
   * account of itself against ours of never repeating one. So the row a student
   * is standing on says where they are instead, which is the only thing the
   * ladder can tell them that the headline has not.
   */
  readonly detail: string;
}

export interface MasteryCardModel {
  /**
   * The permanent badge: the FLOOR rank, never the current one.
   * ECONOMY.md: "Once a Mechanist, always a Mechanist. The badge is permanent
   * even if the score sags. Taking back an earned rank is the most demoralizing
   * thing this system could do."
   */
  readonly badge: RankReading;
  /**
   * True when the visible score has fallen below the badge's own band, so the
   * floor is the only reason the badge is still there. The view says so in one
   * calm sentence; it never draws the gap.
   */
  readonly held: boolean;
  /** The sentence that leads. Same text as `badge.claim`, named for the view. */
  readonly claim: string;
  /**
   * The number, floored to a whole point.
   *
   * FLOOR RATHER THAN ROUND, and it matters. `rankFor` reads the visible score
   * at one decimal, so a student at 15.6 is a Reader; rounding for display
   * would print 16 beside a Reader badge, and 16 is where Arrow Pusher starts.
   * Flooring can never print a number that contradicts the badge beside it.
   */
  readonly score: number;
  /** The next UNEARNED rank, or null at the top of the ladder. */
  readonly next: RankReading | null;
  /** Points from `score` to `next.at`. 0 at the top of the ladder. */
  readonly toGo: number;
  /**
   * How far across the current band, 0 to 1, for the progress bar. 1 at the top
   * of the ladder, and 0 rather than negative when a sagged score sits below
   * the badge's own floor.
   */
  readonly fill: number;
  /** Cleared nodes whose strength has decayed under the review threshold. */
  readonly crackingCount: number;
  /**
   * The restore line, or null when nothing is cracking. ECONOMY.md: not "you
   * dropped 3 points", but "4 reactions are cracking, review to restore".
   */
  readonly restore: string | null;
  /**
   * The standing promise about the number, shown only beside `restore`.
   *
   * Null when nothing is cracking, on purpose: telling a student on day one
   * that their score cannot fall by more than 2 a day introduces falling. It
   * belongs where falling is already on the table, and there it is the most
   * reassuring sentence on the card.
   */
  readonly dipCap: string | null;
  /** The whole ladder, in order, for the reasons beneath the badge. */
  readonly ladder: readonly LadderRow[];
}

function readingFor(row: MasteryRank, index: number): RankReading {
  return { name: row.name, at: row.at, claim: row.claim, index, motif: rankMotif(row.name) };
}

function rowByName(name: string): { readonly row: MasteryRank; readonly index: number } {
  const index = MASTERY_RANKS.findIndex((candidate) => candidate.name === name);
  // Reader is the floor of the ladder and rankFor never returns undefined, so
  // an unknown name can only mean the snapshot came from a different build.
  // Falling back to Reader keeps the card drawable; it never invents a rank.
  const safe = index < 0 ? 0 : index;
  return { row: MASTERY_RANKS[safe] as MasteryRank, index: safe };
}

/**
 * The rank card, from a snapshot the caller already derived.
 *
 * It takes the snapshot rather than a journal for the reason
 * `app/progress.ts` records at length: the store derives once per commit, and a
 * surface that re-derives is a second answer to the same question. Two answers
 * is how a balance starts disagreeing with itself between two screens.
 */
export function masteryCardModel(snapshot: EconomySnapshot): MasteryCardModel {
  const mastery = snapshot.mastery;
  const { row: badgeRow, index: badgeIndex } = rowByName(mastery.floorRank);
  const badge = readingFor(badgeRow, badgeIndex);
  const upcoming = nextRankAfter(badgeRow);
  const next = upcoming === null ? null : readingFor(upcoming, badgeIndex + 1);

  const score = Math.floor(mastery.visible);
  const toGo = next === null ? 0 : Math.max(0, next.at - score);
  const span = next === null ? 0 : next.at - badge.at;
  const fill = next === null ? 1 : span <= 0 ? 1 : Math.min(1, Math.max(0, (score - badge.at) / span));

  const cracking = mastery.cracking.length;
  const restore =
    cracking === 0
      ? null
      : cracking === 1
        ? "1 lesson is cracking. One review brings it back."
        : `${cracking} lessons are cracking. A review brings them back.`;
  const dipCap =
    cracking === 0 ? null : `This number never falls by more than ${MASTERY_VISIBLE_DIP_CAP} in a day.`;

  const ladder = MASTERY_RANKS.map((row, index): LadderRow => {
    const state: LadderState = index < badgeIndex ? "earned" : index === badgeIndex ? "current" : "ahead";
    return { ...readingFor(row, index), state, detail: state === "current" ? "You are here" : row.claim };
  });

  return {
    badge,
    held: mastery.rank !== mastery.floorRank,
    claim: badge.claim,
    score,
    next,
    toGo,
    fill,
    crackingCount: cracking,
    restore,
    dipCap,
    ladder,
  };
}

/* ------------------------------------------------------------- the moment -- */

/**
 * The label `receiptFor` writes for a rank award. Restated here as a prefix
 * because this model READS those lines rather than recomputing the award, and
 * a prefix is the smallest coupling that does that.
 */
const RANK_LINE_PREFIX = "New rank: ";

export interface RankUpModel {
  /** The hero. One thing, per the P2 celebration hierarchy. */
  readonly badge: RankReading;
  /** The reason the badge means something. It sits under the name, not over it. */
  readonly claim: string;
  /**
   * Every rank this one event crossed, lowest first, ending in `badge.name`.
   * `receiptFor` pays each crossed rank rather than only the highest, so a
   * moment that named only the top one would celebrate less than was paid.
   */
  readonly crossed: readonly string[];
  /**
   * The diamonds the rank awards paid, summed from the receipt's own lines.
   *
   * NOT A SECOND COPY OF A NUMBER ON SCREEN. The reward moment shows a diamond
   * TOTAL and carries its receipt lines only as the card's accessible name, so
   * this figure appears as visible text exactly once in the whole sequence,
   * here, where it is the itemisation of one line of that total. 0 when the
   * receipt carries no rank line, which the view then draws no chip for.
   */
  readonly diamonds: number;
  /** The next unearned rank, or null at the top of the ladder. */
  readonly next: RankReading | null;
}

/**
 * The moment, or null when this receipt did not cross a rank.
 *
 * A RANK UP IS A CHANGE IN THE FLOOR RANK, which is what `receiptFor` already
 * decided: the floor is what the badge and the award are keyed to, so a score
 * wobbling back over a threshold it has crossed before is not a rank up and
 * does not get a celebration. This function only reads that decision.
 */
export function rankUpFromReceipt(receipt: Receipt): RankUpModel | null {
  const name = receipt.mastery.rankUp;
  if (name === null) return null;

  const { row, index } = rowByName(name);
  const badge = readingFor(row, index);
  const upcoming = nextRankAfter(row);

  const lines = receipt.diamonds.filter((line) => line.label.startsWith(RANK_LINE_PREFIX));
  let diamonds = 0;
  for (const line of lines) diamonds += line.amount;
  const crossed = lines.map((line) => line.label.slice(RANK_LINE_PREFIX.length));

  return {
    badge,
    claim: badge.claim,
    // Reader pays nothing and so writes no line, and a rank up into a band
    // whose award is 0 would leave `crossed` empty. The rank that actually
    // changed is always worth naming, so it stands in.
    crossed: crossed.length === 0 ? [badge.name] : crossed,
    diamonds,
    next: upcoming === null ? null : readingFor(upcoming, index + 1),
  };
}
