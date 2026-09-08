/**
 * The streak screen. It plays once, after the reward moment, on the day today
 * first counted, and it is the piece the bar keeps on a page of its own.
 *
 * WHAT IT IS FOR. The reward moment answers "what did this lesson pay". This
 * screen answers a different question, the one docs/ECONOMY.md says the streak
 * exists to answer: "am I still the kind of person who does this". Those are two
 * questions and the bar gives them two screens, which is the single clearest
 * thing to take from it here.
 *
 * WHAT IT IS NOT, and this is the load bearing half. It is never a punishment
 * screen and it never frames a day as something lost. The bar's own version of
 * this screen ends on "Practicing daily grows your streak, but skipping a day
 * resets it!", which is the anxiety loop CLAUDE.md's 2026-08-27 amendment
 * answered rather than adopted: the mitigations are the product, so the same
 * slot on our screen carries the rest day announcement instead. Streak AT RISK
 * belongs to the header alone (P3), and nothing on this screen counts down.
 *
 * EVERY NUMBER IS READ. ECONOMY.md, Anti-abuse: "The client animates what the
 * server concluded." The day count is `receipt.streak.current`, the milestone
 * and its diamonds are receipt lines, the freezes held and the exam window are
 * snapshot fields, and the seven day strip is seven answers from
 * `deriveEconomy` (see streakModel.ts, which explains how and why). Nothing on
 * this screen is added up here.
 *
 * HOW THE SEQUENCE IS ORCHESTRATED. One clock, the same shape RewardMoment.tsx
 * uses: elapsed milliseconds since mount, one requestAnimationFrame loop, every
 * beat a start time on it, a tap skips to the end and reduced motion starts
 * there. The two hooks are deliberately not shared yet: this piece was built
 * with the reward moment frozen, so extracting the hook out of it is a change
 * that belongs to whichever piece is allowed to touch both.
 *
 *   0      the flame lands out of a small spark ring, and the number is
 *          already on screen holding YESTERDAY's count
 *   260    "day streak" arrives under it
 *   420    the number ticks up by one and pops. This is the beat the bar does
 *          not have: it announces a total that was already true, and this
 *          screen shows the day being added
 *   640    the week card arrives, and its squares cascade in from 700, 55 ms
 *          apart, so the row reads
 *          left to right as a week rather than appearing as a block. Today's
 *          square is last and lands with the one halo on the row
 *   1250   the sentence under the hairline
 *   1700   the milestone band, on the days there is one
 *   1950   the freezes
 *   2500   done
 *
 * THE CARD IS MOUNTED FROM FRAME ZERO and only its contents are gated, so the
 * layout never moves under the four frame burst. A screen that reflows between
 * 400 ms and 900 ms is a screen whose stills cannot be compared.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { STREAK_FREEZE_COST, type Receipt } from "@blueberry/economy";
import { Press } from "../app/ui/Press";
import { Berry } from "../mascot/Berry";
import { DiamondMark, FlameMark } from "../app/ui/HudIcons";
import { progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { streakScreenModel, type StreakDayCell, type StreakScreenModel } from "./streakModel";

export interface StreakScreenProps {
  /** The receipt for the clear that made today count. The day number comes off it. */
  readonly receipt: Receipt;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
  readonly continueLabel?: string;
}

interface Beats {
  readonly unit: number;
  readonly tick: number;
  /** The card's own frame. Its squares start one beat later, so it is never empty. */
  readonly cardShell: number;
  readonly cardIn: number;
  readonly cellStep: number;
  readonly note: number;
  readonly milestone: number;
  readonly freezes: number;
  readonly end: number;
}

const BEATS: Beats = Object.freeze({
  unit: 260,
  tick: 420,
  cardShell: 640,
  cardIn: 700,
  cellStep: 55,
  note: 1250,
  milestone: 1700,
  freezes: 1950,
  end: 2500,
});

/**
 * Elapsed milliseconds since mount, on one requestAnimationFrame loop, until
 * `end`. `skip` jumps to the end. Reduced motion starts at the end.
 */
function useStageClock(end: number, reducedMotion: boolean, skipped: boolean): number {
  const [elapsed, setElapsed] = useState(reducedMotion ? end : 0);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion || skipped) {
      setElapsed(end);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(end, now - started);
      setElapsed(t);
      if (t < end) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [end, reducedMotion, skipped]);
  return elapsed;
}

/* ------------------------------------------------------------- the glyphs -- */

/**
 * The three marks the strip needs, in the same house style as HudIcons.tsx:
 * filled silhouettes with no hairline strokes, drawn at 24 and read at 18.
 * `currentColor` throughout, because the square around each one already carries
 * the hue that says which kind of day it is.
 */
function CheckMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M9.6 17.4 4.4 12.2a1.6 1.6 0 0 1 2.3-2.3l2.9 2.9 7.7-7.7a1.6 1.6 0 1 1 2.3 2.3z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * The rest day. A LEAF, which is the vocabulary the committed states sheet
 * draws (blueberry_spec-meter-states_1788291102.png: "rest day, streak safe"
 * is a flame carrying a leaf). This used to be a crescent moon, which was a
 * reasonable idea for a night off and was not the product's own word for it;
 * the sheet is the spec and a second symbol for one state is how a vocabulary
 * stops being one. Drawn as a thing rather than as a hole, same as before.
 */
function LeafMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M20.4 3.6c0 8.6-3.6 13.4-9.2 13.4-2.2 0-3.9-.7-5-1.9 1.4-4.2 4.4-6.6 9.1-7.6-4.9.2-8.4 2.4-10.2 6.6C3.4 9.6 6.6 5.4 12.3 4.4c2.8-.5 5.5-.4 8.1-.8z"
        fill="currentColor"
      />
      <path d="M4.6 20.4c.9-2.6 2.2-4.8 4-6.6l1.1 1.1c-1.6 1.6-2.8 3.5-3.6 5.9z" fill="currentColor" />
    </svg>
  );
}

/** A held freeze, spent. Six arms and a core; nothing about it is a warning. */
function FreezeMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.6v18.8M4.1 7.1l15.8 9.8M19.9 7.1 4.1 16.9" />
        <path d="M9.2 4.7 12 6.6l2.8-1.9M9.2 19.3 12 17.4l2.8 1.9" />
      </g>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

/** The exam banner's mark. A calendar, because the window is a date and not an alarm. */
function CalendarMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V9H4z" fill="currentColor" />
      <path
        d="M4 10.5h16v7A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"
        fill="currentColor"
        fillOpacity="0.45"
      />
    </svg>
  );
}

const DAY_GLYPH: Readonly<Record<StreakDayCell["kind"], ((props: { readonly className?: string }) => ReactElement) | null>> = {
  counted: CheckMark,
  rest: LeafMark,
  freeze: FreezeMark,
  // A day that broke the run and a day still open both draw an empty ring. The
  // ring is the state; a cross or an exclamation in it would be the loss
  // framing this screen exists without.
  missed: null,
  pending: null,
};

const KIND_WORD: Readonly<Record<StreakDayCell["kind"], string>> = {
  counted: "counted",
  rest: "rest day",
  freeze: "covered by a freeze",
  missed: "no goal met",
  pending: "today, still open",
};

/* -------------------------------------------------------------- the sparks -- */

/** Twelve pieces thrown from behind the flame. Deliberately smaller than the
 *  reward moment's burst: this screen has one subject and confetti across the
 *  whole of it would compete with the number. */
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + (i % 2 === 0 ? 0.2 : -0.15);
  const distance = 96 + (i % 3) * 34;
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance * 0.8) - 24,
    delay: (i % 4) * 45,
    deep: i % 3 === 0,
  };
});

/* --------------------------------------------------------------- the parts -- */

function WeekStrip({ model, now }: { readonly model: StreakScreenModel; readonly now: number }) {
  return (
    <div className="streak-week" role="img" aria-label={weekLabel(model)}>
      {model.week.map((cell, index) => {
        const Glyph = DAY_GLYPH[cell.kind];
        return (
          <div key={cell.date} className="streak-day" data-kind={cell.kind} data-today={cell.today ? "true" : "false"}>
            <span className="streak-day-letter">{cell.letter}</span>
            <span
              className="streak-day-slot"
              data-in={now >= BEATS.cardIn + index * BEATS.cellStep ? "true" : "false"}
            >
              {Glyph === null ? null : <Glyph />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The strip's one sentence for a screen reader, so seven squares are not seven nothings. */
function weekLabel(model: StreakScreenModel): string {
  return `This week: ${model.week.map((cell) => `${cell.weekday} ${KIND_WORD[cell.kind]}`).join(", ")}`;
}

function MilestoneBand({ model }: { readonly model: StreakScreenModel }) {
  const milestone = model.milestone;
  if (milestone === null) return null;
  return (
    <div
      className="streak-milestone"
      /* The number is NOT repeated here: the hero above already says it, and
         the same number twice on one screen is the hierarchy fault the reward
         moment's round 2 ruling was written about. What this band adds is that
         the day was scarce, and what it paid. */
      aria-label={`Milestone. ${milestone.line}${milestone.diamonds > 0 ? ` Paid ${milestone.diamonds} diamonds.` : ""}`}
    >
      <span className="streak-milestone-band">Milestone</span>
      <span className="streak-milestone-line">{milestone.line}</span>
      {milestone.diamonds > 0 ? (
        <span className="streak-milestone-pay" aria-hidden>
          <DiamondMark className="h-4 w-4" />+{milestone.diamonds}
        </span>
      ) : null}
    </div>
  );
}

function FreezeRow({ model }: { readonly model: StreakScreenModel }) {
  const { freezes } = model;
  const slots = [];
  for (let i = 0; i < freezes.max; i += 1) {
    slots.push(
      <span key={i} className="streak-freeze-slot" data-held={i < freezes.held ? "true" : "false"}>
        <FreezeMark />
      </span>,
    );
  }
  const blocked = freezes.full || !freezes.affordable;
  return (
    <div className="streak-freeze" data-freezes={freezes.held}>
      <span className="streak-freeze-slots" role="img" aria-label={`${freezes.held} of ${freezes.max} streak freezes held`}>
        {slots}
      </span>
      <span className="streak-freeze-text">{freezes.line}</span>
      <button
        type="button"
        className="press streak-freeze-buy"
        data-buy-freeze
        disabled={blocked}
        // The press is handled on pointer down and the spend is synchronous, so
        // the acknowledgement and the new slot land in the same frame. That is
        // CLAUDE.md's press contract with nothing async in the way.
        onPointerDown={(event) => {
          event.stopPropagation();
          if (blocked) return;
          progress.spend("streak_freeze", STREAK_FREEZE_COST, "streak-screen");
        }}
        aria-label={
          freezes.full
            ? "Streak freezes full"
            : freezes.affordable
              ? `Buy a streak freeze for ${freezes.cost} diamonds`
              : `A streak freeze costs ${freezes.cost} diamonds. Not enough yet.`
        }
      >
        {freezes.full ? (
          "Full"
        ) : (
          <>
            <DiamondMark className="h-4 w-4" />
            {freezes.cost}
          </>
        )}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- the screen */

export function StreakScreen({ receipt, reducedMotion, onContinue, continueLabel = "Continue" }: StreakScreenProps) {
  const snapshot = useProgress();
  const [skipped, setSkipped] = useState(false);
  const now = useStageClock(BEATS.end, reducedMotion, skipped);

  // The clock the model is derived against, read ONCE at mount. A model that
  // re-derived on every frame would redraw the week strip sixty times a second
  // and could roll over midnight mid animation.
  const [openedAt] = useState(() => new Date().toISOString());
  const model = useMemo(
    () => streakScreenModel({ journal: snapshot.journal, snapshot: snapshot.economy, receipt, now: openedAt }),
    [snapshot.journal, snapshot.economy, receipt, openedAt],
  );

  const done = now >= BEATS.end;
  const ticked = now >= BEATS.tick;
  // The number holds yesterday's count until the tick. Day one has nothing to
  // tick from, so it opens on 1 rather than on a 0 that would read as a bug.
  const shown = ticked || model.days <= 1 ? model.days : model.days - 1;
  const show = (at: number) => now >= at;
  const reveal = (at: number) => (show(at) ? "streak-reveal" : "streak-hidden");

  return (
    <div
      className="streak-stage fixed inset-0 z-30 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={model.label}
      data-streak={done ? "done" : "playing"}
      data-streak-days={model.days}
      data-streak-saved={model.saved === null ? "" : model.saved.kind}
      data-streak-milestone={model.milestone === null ? "" : model.milestone.day}
      data-streak-exam={model.exam === null ? "false" : "true"}
      data-streak-freezes={model.freezes.held}
      onPointerDown={() => {
        if (!done) setSkipped(true);
      }}
    >

      <div className="relative mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-4 md:max-w-lg md:gap-5 md:px-6">
        {/* The exam window, at the top, because it changes what everything under
            it means: inside the window the day counts for opening the app. */}
        {model.exam === null ? null : (
          <p className={`${reveal(120)} streak-exam`}>
            <CalendarMark />
            {model.exam.line}
          </p>
        )}

        {/* The hero: one glyph, one number, two words. */}
        <div className="relative flex shrink-0 flex-col items-center">
          {reducedMotion ? null : (
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {SPARKS.map((spark, i) => (
                <span
                  key={i}
                  className={`streak-spark ${spark.deep ? "streak-spark--deep" : ""}`}
                  style={{ "--dx": `${spark.dx}px`, "--dy": `${spark.dy}px`, "--delay": `${spark.delay}ms` } as CSSProperties}
                />
              ))}
            </div>
          )}
          <span className="streak-hero-flame" aria-hidden>
            <FlameMark lit className="h-32 w-32 md:h-40 md:w-40" />
          </span>
          <div className="streak-number-row flex flex-col items-center" data-landed={ticked ? "true" : "false"}>
            <span className="streak-number text-streak-ink" aria-hidden>
              {shown}
            </span>
            <span className={`${reveal(BEATS.unit)} streak-unit mt-2 font-bold text-streak-ink`} aria-hidden>
              {model.unit}
            </span>
          </div>
        </div>

        {/* The week and the one sentence under it, the bar's own split.
            The shell fades in at its own beat and the squares follow 60 ms
            later, so no frame of the burst catches an empty white box: the
            card is MOUNTED from the first frame to hold the layout still, and
            only its opacity waits. */}
        <section className={`${reveal(BEATS.cardShell)} streak-card shrink-0`} aria-label="This week">
          <WeekStrip model={model} now={now} />
          <p className={`${reveal(BEATS.note)} streak-note`} data-saved={model.saved === null ? "false" : "true"}>
            {/* docs/MASCOT.md, Progression: "Streak saved by a rest day" is
                `calm` plus `wave`, a composition of code that already exists.
                It is here and nowhere else on the screen, because this is the
                one sentence that is Bloom telling the student something rather
                than the app reporting a number. The bar's own streak screen
                has no character on it at all. */}
            {model.saved === null ? null : (
              <span className="streak-note-berry" aria-hidden>
                <Berry mood="calm" behaviour="wave" behaviourKey={1} reducedMotion={reducedMotion} sizePx={44} />
              </span>
            )}
            {/* ONE span around the whole sentence, not two children plus a bare
                text node: the band is a flex row when Bloom is in it, and a
                bare text node would become a flex ITEM, taking the row's gap
                between the weekday and the rest of its own sentence.

                The weekday is set in the streak ink because it is the fact the
                sentence is announcing. streakModel puts it first in the string
                by construction (see lineFor), which is what makes this split
                safe rather than a search through prose. */}
            <span className="streak-note-text">
              {model.saved === null || !model.line.startsWith(model.saved.weekday) ? (
                model.line
              ) : (
                <>
                  <span className="streak-note-strong">{model.saved.weekday}</span>
                  {model.line.slice(model.saved.weekday.length)}
                </>
              )}
            </span>
          </p>
        </section>

        {model.milestone === null ? null : (
          <div className={`${reveal(BEATS.milestone)} w-full shrink-0`}>
            <MilestoneBand model={model} />
          </div>
        )}

        <div className={`${reveal(BEATS.freezes)} w-full shrink-0`}>
          <FreezeRow model={model} />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md shrink-0 p-4 pb-safe md:max-w-lg md:p-6">
        <Press
          onPointerDown={(event) => {
            event.stopPropagation();
            onContinue();
          }}
          className="w-full"
        >
          {continueLabel}
        </Press>
      </div>
    </div>
  );
}
