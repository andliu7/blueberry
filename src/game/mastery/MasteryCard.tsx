/**
 * The mastery rank card: the visible answer to the only question a student is
 * actually anxious about, which docs/ECONOMY.md states in its own words as
 * "whether they will be okay on the exam".
 *
 * IT RENDERS, IT NEVER DECIDES. CLAUDE.md: the rating is Elo-like and computed
 * server side from the append-only attempt history, and "the client RENDERS it
 * and never decides it". Phase 6 swaps `app/progress.ts`'s local source for a
 * Supabase-backed one; nothing on this screen changes when it does, because
 * every number here is already read off an `EconomySnapshot` and none of it is
 * computed in a component. `masteryModel.ts` carries the whole reading.
 *
 * THE ORDER ON THE CARD IS ECONOMY.MD'S FIRST PRESENTATION RULE, and it is the
 * one thing here that is not a matter of taste: "Lead with the sentence, not the
 * number. 'You can now predict E2 products' first, 34 second." So, top to
 * bottom:
 *
 *   the badge and its name   the picture first and the word second, per owner
 *                            ruling 2 of 2026-09-04. The mark is what the rank
 *                            IS; the name is a caption on it
 *   the claim                the sentence. Body size, body ink, above the number
 *   the bar and its reading  the number, and it is never larger than the claim
 *   the restore row          only when something is cracking. A count of things
 *                            to do and a one-tap fix, never a number that fell
 *   the ladder               the six ranks, so the badge is legibly scarce
 *
 * WHAT DECAY IS ALLOWED TO LOOK LIKE, and this is the rule this file exists to
 * hold: nothing on this card can render a loss. There is no delta, no arrow, no
 * "was", no red, and no countdown, because ECONOMY.md forbids all of them and
 * DESIGN-TOKENS adds that "a streak, charge or mastery surface never uses the
 * critical or error ramp, never counts down, and never animates a number
 * falling". The restore row is what decay produces instead, and it is phrased
 * as work available rather than ground lost.
 *
 * THE VOICE. A coach on the student's side: no scolding, no "you should have",
 * no rhetorical questions. "3 lessons are cracking. A review brings them back."
 * names what happened and makes the next action feel like three taps, which is
 * what it is.
 */

import type { EconomySnapshot } from "@blueberry/economy";
import {  } from "../beats/ChipPress";
import { hrefForReview } from "../app/routes";
import { RankMark } from "./RankMark";
import { masteryCardModel, type LadderRow } from "./masteryModel";
import "./mastery.css";

/**
 * One rung.
 *
 * EVERY ROW CARRIES ITS MOTIF, including the ones ahead, per owner ruling 4 of
 * 2026-09-04: "a node with no authored content still shows what KIND it will
 * be... an empty chip reads as broken rather than as unauthored". A rank a
 * student has not reached is exactly that chip, so it keeps its mark and takes
 * the dashed queued treatment rather than going blank.
 */
function LadderRung({ row }: { readonly row: LadderRow }) {
  const tone = row.state === "earned" ? "earned" : row.state === "current" ? "current" : "ahead";
  return (
    <li className={`rank-ladder__row rank-ladder__row--${row.state}`}>
      <RankMark motif={row.motif} tone={tone} sizePx={34} glow={row.state === "current"} />
      <span className="min-w-0">
        <span className="rank-ladder__name title-face">{row.name}</span>
        <span className="rank-ladder__claim block">{row.detail}</span>
      </span>
    </li>
  );
}

export interface MasteryCardProps {
  /**
   * The snapshot the store already derived. Taking the snapshot rather than the
   * journal is deliberate: `app/progress.ts` derives once per commit, and a
   * surface that re-derives is a second answer to the same question. If this
   * ever needs a live re-derivation it must pass `courseUniverse(course)`, or
   * it will show a different mastery number from the pathway, which that file
   * says at length.
   */
  readonly economy: EconomySnapshot;
  /** Where the one-tap fix goes. Defaults to the review deck. */
  readonly reviewHref?: string;
  readonly className?: string;
}

export function MasteryCard({ economy, reviewHref = hrefForReview(), className = "" }: MasteryCardProps) {
  const model = masteryCardModel(economy);
  const next = model.next;

  return (
    <section className={`rank-card ${className}`} aria-label={`Mastery: ${model.badge.name}`}>
      <div className="rank-card__head">
        <RankMark motif={model.badge.motif} tone="current" sizePx={68} glow />
        <div className="min-w-0">
          <p className="rank-card__eyebrow">Mastery</p>
          <h2 className="rank-card__name title-face">{model.badge.name}</h2>
        </div>
      </div>

      {/* THE SENTENCE. First, and in the body ink, because it is the thing the
          badge actually claims about the student. */}
      <p className="rank-card__claim">{model.claim}</p>

      {/* The permanent floor, and the only sentence it ever needs. It appears
          only while the visible score sits below the badge's own band, which is
          the one moment the floor is doing visible work. ECONOMY.md: "Taking
          back an earned rank is the most demoralizing thing this system could
          do." So the copy says the opposite plainly and moves on. */}
      {model.held ? <p className="rank-card__held">Yours to keep. A rank never comes back off once you have it.</p> : null}

      <div className="flex flex-col gap-1.5">
        {/*
          A role="img" with one label rather than a progressbar role, because
          what this bar reports is not a task in flight: it is a standing
          reading, and a screen reader that announces it as a live progress
          indicator would be describing something else. The label carries the
          same two facts the caption does, in the same order.
        */}
        <div
          className="rank-bar"
          role="img"
          aria-label={
            next === null
              ? `Mastery ${model.score} of 100. Top of the ladder.`
              : `Mastery ${model.score} of 100. ${model.toGo} to ${next.name}.`
          }
        >
          <div className="rank-bar__fill" style={{ width: `${Math.round(model.fill * 100)}%` }} />
        </div>
        <p className="rank-bar__caption" aria-hidden>
          <span>
            <span className="rank-bar__score title-face">{model.score}</span> of 100
          </span>
          <span>{next === null ? "Top of the ladder" : `${model.toGo} to ${next.name}`}</span>
        </p>
      </div>

      {model.restore === null ? null : (
        <div className="rank-restore">
          <span className="rank-restore__text">
            {model.restore}
            {model.dipCap === null ? null : <span className="rank-restore__promise">{model.dipCap}</span>}
          </span>
          {/* The taxonomy sheet's REVIEW chip, which is the green one. It is a
              link because it goes to a route; see mastery.css for why it wears
              the chip classes rather than being a button. */}
          <a href={reviewHref} className="chip-press chip-press--claim">
            Review
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="rank-card__eyebrow">The ladder</h3>
        <ol className="rank-ladder">
          {model.ladder.map((row) => (
            <LadderRung key={row.name} row={row} />
          ))}
        </ol>
      </div>
    </section>
  );
}
