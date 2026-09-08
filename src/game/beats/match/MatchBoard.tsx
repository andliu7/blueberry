/**
 * The matching beat on screen: two columns of cards, and the student pairs
 * them. Read the header of ./board.ts first; this file is the view over that
 * state machine and owns no rules.
 *
 * WHAT THIS DOES THAT THE REFERENCE DOES NOT, because the owner's note on
 * "reference images/matching - not ideal but okay.png" is that this is the one
 * piece to improve on rather than copy. The reference draws four connectors
 * between two scattered columns and grades them on a Continue press. Three
 * things follow from that and all three are fixed here:
 *
 *   A wrong pair gets a reason. ./reasons.ts assembles one per pair, authored
 *   copy first, and it names both cards. The reference says nothing at all.
 *
 *   A right pair clears. The two cards travel toward each other and leave the
 *   board, so what remains is exactly what is still unsolved and the last pair
 *   is one card facing one card. The reference keeps all eight on screen to the
 *   end, so the board is at its most crowded when the student is most stuck.
 *
 *   There is progress inside the board. A counter and a track move the instant
 *   a pair lands, and the same sentence goes into the live region. The
 *   reference has no state between empty and graded.
 *
 * THE PRESENTATION FIELD, and this is a deliberate divergence worth naming.
 * MatchBeat carries `presentation: "connectors" | "columns"`. This build renders
 * columns for both, because connectors and per pair judgement are in tension:
 * a connector board exists to hold several answers at once and be graded
 * together, which is the thing being fixed. A beat authored as connectors is
 * rendered as columns rather than silently half supported, and the divergence
 * comes out of `matchAuthoringProblems` as a WARNING so it reaches the person
 * who authored the beat instead of only the person reading this comment.
 *
 * THE BOARD IS SIZED FOR A PHONE FIRST, which is the surface the reference is
 * a screenshot of. Two things hold that up and they work as a pair. The cards
 * are pills: ./spec.ts caps their text and ./boards.ts keeps every shipped card
 * inside two lines, so four pairs, the target column, the track and the
 * feedback box share one 390 point screen without a scroll. And the columns
 * stay two columns at every width, because a matching board's whole affordance
 * is that a partner is across from you rather than somewhere below you.
 * Stacking would remove the scroll and remove the game with it. The narrow
 * screen is paid for in padding and in `min-w-0`, not in the layout.
 *
 * FOCUS IS PUT BACK after a pair clears. See `focusTargetAfterSettle` in
 * ./board.ts for why: the two buttons unmount and the browser drops focus to
 * <body>, so without this a keyboard student re-tabs the whole page per pair.
 *
 * REACT PATTERNS USED HERE, each named because this codebase is read by someone
 * who is strong in Python and Java:
 *   useReducer      one state object, one pure transition function. Same shape
 *                   as a Java switch over an enum of events; React just calls it.
 *   useRef          a mutable box that survives re renders WITHOUT causing one.
 *                   Used two ways here. As a plain box it holds the start time
 *                   and the fired-once latches. Handed to a JSX element as
 *                   `ref={...}` React fills it with the real DOM node, which is
 *                   the only way to call focus() on something.
 *   useMemo         cache a derived value between renders. Used for the built
 *                   spec, because building it validates the board and throwing
 *                   twice a second would be silly.
 *   useEffect       run something after the DOM is painted, and clean it up.
 *                   Used only for timers and for telling the caller what
 *                   happened.
 */

import { useEffect, useMemo, useReducer, useRef, useState, type RefObject } from "react";
import type { OptionId } from "@blueberry/curriculum";
import type { BeatResult, MasteryLevel, MatchBeat } from "../types";
import type { Card } from "../../cards/types";
import { Press } from "../../app/ui/Press";
import { ChipPress } from "../ChipPress";
import {
  buildMatchBoard,
  isPlayable,
  matchAuthoringProblems,
  textOf,
  type MatchBoardSpec,
} from "./spec";
import {
  beatResultFor,
  cardForMiss,
  focusTargetAfterSettle,
  initialBoardState,
  isPromptLanded,
  isTargetFull,
  reduceBoard,
  shuffledTargetIds,
  visiblePromptIds,
  visibleTargetIds,
  type BoardState,
} from "./board";
import { completionLine, progressLine } from "./reasons";
import "./match.css";

/**
 * These two numbers MUST match --match-land-ms and --match-shake-ms in
 * match.css. They are the delay before the board settles, and a settle that
 * fires early yanks a card out mid animation. The pair is the reason both
 * numbers are written down in two places with this comment beside each.
 */
const LAND_MS = 340;
const SHAKE_MS = 400;

/**
 * Under reduced motion nothing is animating, so the only thing the delay is
 * buying is time to read. A landed pair leaves at once; a rejected pair holds
 * long enough that the amber outline is seen rather than flashed.
 */
function settleDelayMs(outcome: "landed" | "rejected"): number {
  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return outcome === "landed" ? 60 : 700;
  return outcome === "landed" ? LAND_MS : SHAKE_MS;
}

/**
 * Does this element contain whatever currently has keyboard focus?
 *
 * Guarded for a server render, where there is no document at all. `contains`
 * returns true for the element itself, which is what we want: a board that has
 * been focused as a whole still counts as holding it.
 */
function holdsFocus(element: Element | null): boolean {
  if (element === null || typeof document === "undefined") return false;
  const active = document.activeElement;
  return active !== null && element.contains(active);
}

export interface MatchBoardProps {
  readonly beat: MatchBeat;
  /** The rung being served. Decoys appear at L2 and not at L1. */
  readonly level: MasteryLevel;
  /** Fired once, when the last pair lands. */
  readonly onComplete?: (result: BeatResult) => void;
  /**
   * Fired once per missed card, with the card the toast should offer. The deck
   * surface owns the toast, the flight to the deck icon and the plus one badge;
   * this beat owns knowing that a card is worth offering and what is on it.
   */
  readonly onMistakeCard?: (card: Card) => void;
  readonly onContinue?: () => void;
}

export function MatchBoard({
  beat,
  level,
  onComplete,
  onMistakeCard,
  onContinue,
}: MatchBoardProps) {
  // Built once per beat and level. buildMatchBoard validates as it goes, so the
  // problems list is checked first and a bad board never reaches the renderer.
  const problems = useMemo(() => matchAuthoringProblems(beat, level), [beat, level]);
  const spec = useMemo(
    () => (isPlayable(problems) ? buildMatchBoard(beat, level) : null),
    [beat, level, problems],
  );

  if (spec === null) {
    return <AuthoringNotice beatId={beat.id} problems={problems} />;
  }
  // A playable board can still carry WARNING lines: a missing why, a card over
  // the pill cap, a beat authored as connectors. Those are reported ABOVE the
  // board rather than swallowed, because the whole point of returning them as
  // sentences is that a person sees them. `isPlayable` is what decides whether
  // the board renders; it is not what decides whether the warnings are said.
  //
  // Keyed on the board so a new beat starts a genuinely new board rather than
  // inheriting the last one's landed pairs. `key` remounting is the boring way
  // to reset state that belongs to a specific input.
  return (
    <>
      {problems.length === 0 ? null : (
        <AuthoringWarnings beatId={beat.id} problems={problems} />
      )}
      <Board
        key={`${spec.beatId}:${spec.level}`}
        spec={spec}
        {...(onComplete === undefined ? {} : { onComplete })}
        {...(onMistakeCard === undefined ? {} : { onMistakeCard })}
        {...(onContinue === undefined ? {} : { onContinue })}
      />
    </>
  );
}

function Board({
  spec,
  onComplete,
  onMistakeCard,
  onContinue,
}: {
  readonly spec: MatchBoardSpec;
  readonly onComplete?: (result: BeatResult) => void;
  readonly onMistakeCard?: (card: Card) => void;
  readonly onContinue?: () => void;
}) {
  const [state, dispatch] = useReducer(
    (current: BoardState, action: Parameters<typeof reduceBoard>[2]) =>
      reduceBoard(spec, current, action),
    undefined,
    initialBoardState,
  );
  const [showWorkings, setShowWorkings] = useState(false);

  const startedAt = useRef(Date.now());
  const completionReported = useRef(false);
  const missesReported = useRef(0);

  // Three refs into the DOM, used only to move focus. A ref on a JSX element is
  // React's escape hatch to the real node: it is set after the browser paints
  // and changing it never re-renders anything.
  const boardRef = useRef<HTMLElement | null>(null);
  const promptListRef = useRef<HTMLUListElement | null>(null);
  const completionRef = useRef<HTMLDivElement | null>(null);
  // Read BEFORE the settle, because afterwards the button is already gone and
  // the answer would always be "focus is on body".
  const focusWasOnTheBoard = useRef(false);

  const total = spec.answer.prompts.length;
  const landed = state.landed.length;
  const complete = landed === total;

  const targetOrder = useMemo(() => shuffledTargetIds(spec), [spec]);
  const prompts = visiblePromptIds(spec, state);
  const visibleTargets = new Set(visibleTargetIds(spec, state));
  const targets = targetOrder.filter((id) => visibleTargets.has(id));

  // The settle timer. Cleaning it up on unmount is what the returned function
  // is for; without it a board that closes mid animation dispatches into a
  // reducer nobody is listening to.
  useEffect(() => {
    const pending = state.pending;
    if (pending === null) return;
    const timer = window.setTimeout(() => {
      focusWasOnTheBoard.current = holdsFocus(boardRef.current);
      dispatch({ kind: "settle" });
    }, settleDelayMs(pending.outcome));
    return () => window.clearTimeout(timer);
  }, [state.pending]);

  // Focus repair, run after the settle has already removed the landed cards.
  // The decision is `focusTargetAfterSettle` in ./board.ts and is tested there;
  // everything here is the two DOM reads that decision needs plus the focus()
  // call itself.
  useEffect(() => {
    const target = focusTargetAfterSettle(spec, state, {
      focusWasOnTheBoard: focusWasOnTheBoard.current,
      focusStillOnTheBoard: holdsFocus(boardRef.current),
    });
    if (target === "none") return;
    focusWasOnTheBoard.current = false;
    const next =
      target === "next-prompt"
        ? promptListRef.current?.querySelector<HTMLButtonElement>("button")
        : completionRef.current?.querySelector<HTMLButtonElement>("button");
    next?.focus();
  }, [spec, state]);

  // One card offered per miss, in order, and never the same miss twice. The ref
  // is the high water mark rather than a boolean, so several misses in a row
  // each get their card.
  useEffect(() => {
    if (onMistakeCard === undefined) return;
    while (missesReported.current < state.misses.length) {
      const miss = state.misses[missesReported.current];
      missesReported.current += 1;
      if (miss !== undefined) onMistakeCard(cardForMiss(spec, miss, new Date().toISOString()));
    }
  }, [state.misses, spec, onMistakeCard]);

  useEffect(() => {
    if (!complete || completionReported.current || onComplete === undefined) return;
    completionReported.current = true;
    onComplete(
      beatResultFor(spec, state, {
        elapsedMs: Date.now() - startedAt.current,
        at: new Date().toISOString(),
      }),
    );
  }, [complete, spec, state, onComplete]);

  const selected = state.selected;
  const pending = state.pending;
  const hint =
    selected === null
      ? "Pick a card, then pick where it goes."
      : `${textOf(spec, selected.id)} is in hand. Now pick its partner.`;

  return (
    <section className="match-board flex flex-col gap-3 sm:gap-4" ref={boardRef}>
      <header className="flex flex-col gap-1">
        <h2 className="bb-title-face text-scale-base font-semibold text-bb-foreground sm:text-scale-lg">
          {spec.prompt}
        </h2>
        {spec.brief === undefined ? null : (
          <p className="text-scale-sm text-bb-muted-foreground">{spec.brief}</p>
        )}
      </header>

      <Progress landed={landed} total={total} />

      {/* Two columns at every width. See the header: the partner being ACROSS
          from you is the affordance, and stacking would trade a scroll the
          pills already removed for the loss of the whole spatial idea. */}
      {/* THE BOARD FILLS THE SCREEN, the S3 judge's dead-zone carry applied
          here. Measured on a 390 by 844 phone: four short cards and four
          short targets left about 500px of bare cream under the board, which
          is the same hole the question screen had. The grid is the growing
          child now and `items-stretch` lets each column's rows share the room
          it gets, so a four pair board reads as a full screen of big tap
          targets rather than as a diagram parked at the top. */}
      <div className="grid min-h-0 flex-1 grid-cols-2 items-stretch gap-2 sm:gap-3">
        <Column
          heading="Cards"
          ids={prompts}
          spec={spec}
          state={state}
          side="prompt"
          listRef={promptListRef}
          onPick={(id) => dispatch({ kind: "pick", side: "prompt", id })}
        />
        <Column
          heading="Where each one goes"
          ids={targets}
          spec={spec}
          state={state}
          side="target"
          onPick={(id) => dispatch({ kind: "pick", side: "target", id })}
        />
      </div>

      {/* role=status plus aria-live=polite: the browser reads the new sentence
          after it finishes what it is saying, which is right for feedback and
          wrong for an alarm. The message outlives the animation on purpose.

          The progress sentence is INSIDE this box rather than beside the track,
          and that is the whole reason the box is laid out this way. A bar with
          an aria-valuenow is announced when a screen reader lands on it, which
          is not the same as being told; "two of four matched" has to arrive at
          the moment the pair lands, in the same breath as the reason it landed.
          reasons.ts `progressLine` documents this and it has to stay true. */}
      <div
        role="status"
        aria-live="polite"
        className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-scale-sm ${
          state.lastMessage === null
            ? "border-bb-border bg-bb-card text-bb-muted-foreground"
            : state.lastMessage.tone === "landed"
              ? "border-good bg-good-soft text-good-ink"
              : "border-not-requested bg-not-requested-soft text-not-requested"
        }`}
      >
        {state.lastMessage === null ? (
          <p>{hint}</p>
        ) : (
          <>
            <p className="font-semibold">{state.lastMessage.headline}</p>
            {state.lastMessage.detail === undefined ? null : (
              <p className="opacity-90">{state.lastMessage.detail}</p>
            )}
          </>
        )}
        <p className="text-scale-xs opacity-75">{progressLine(landed, total)}</p>
      </div>

      {complete && pending === null ? (
        <div
          ref={completionRef}
          className="fade-in flex flex-col gap-3 rounded-2xl border border-good bg-good-soft p-4"
        >
          <p className="text-scale-base font-semibold text-good-ink">
            {completionLine(total, state.misses.length)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Press
              variant="secondary"
              onPointerDown={() => setShowWorkings((shown) => !shown)}
              aria-expanded={showWorkings}
            >
              {showWorkings ? "Hide the reasons" : "See every pairing"}
            </Press>
            {onContinue === undefined ? null : (
              <ChipPress onPointerDown={onContinue}>Continue</ChipPress>
            )}
          </div>
          {showWorkings ? <Workings spec={spec} state={state} /> : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The track, and a bare count beside it.
 *
 * The SENTENCE is not here. It lives in the live region above, because that is
 * the element a screen reader is told about when it changes, and the count here
 * is `aria-hidden` so the same fact is not read out twice in two wordings. What
 * is left is what a bar is actually good at: a shape a student takes in without
 * reading, and one number they can glance at.
 */
function Progress({ landed, total }: { readonly landed: number; readonly total: number }) {
  const percent = total === 0 ? 0 : Math.round((landed / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-bb-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={landed}
        aria-label="Pairs matched"
      >
        <div className="match-track-fill h-full rounded-full bg-good" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-scale-xs font-semibold tabular-nums text-bb-muted-foreground" aria-hidden="true">
        {landed}/{total}
      </p>
    </div>
  );
}

function Column({
  heading,
  ids,
  spec,
  state,
  side,
  listRef,
  onPick,
}: {
  readonly heading: string;
  readonly ids: readonly OptionId[];
  readonly spec: MatchBoardSpec;
  readonly state: BoardState;
  readonly side: "prompt" | "target";
  /** Only the prompt column passes one. The focus repair reads it. */
  readonly listRef?: RefObject<HTMLUListElement | null>;
  readonly onPick: (id: OptionId) => void;
}) {
  const pending = state.pending;
  return (
    // min-w-0 on a grid child: without it a long word refuses to wrap and the
    // column pushes the grid wider than the screen. This is the one Tailwind
    // incantation in this file that is not self explanatory.
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <h3 className="truncate text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
        {heading}
      </h3>
      {/* The rows share the column's room rather than parking at the top:
          `flex-1` on the list and on each row, capped so a two pair board does
          not become two slabs, floored above the 44px hit target, and centred
          so what the cap leaves over splits evenly instead of pooling into one
          hole under the board. */}
      <ul
        className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-y-auto"
        role="list"
        ref={listRef}
      >
        {ids.map((id) => {
          const inPending =
            pending !== null && (side === "prompt" ? pending.promptId : pending.targetId) === id;
          const landing = inPending && pending?.outcome === "landed";
          const rejected = inPending && pending?.outcome === "rejected";
          const held = state.selected?.side === side && state.selected.id === id;
          const gone =
            side === "prompt" ? isPromptLanded(state, id) : isTargetFull(spec, state, id);

          const motion = landing
            ? side === "prompt"
              ? "match-landing-left"
              : "match-landing-right"
            : rejected
              ? "match-rejected"
              : "";
          const skin = landing
            ? "border-good bg-good-soft text-good-ink"
            : rejected
              ? "border-not-requested bg-not-requested-soft text-not-requested"
              : held
                ? "border-bb-primary bg-bb-primary/10 text-bb-foreground"
                : "border-bb-border bg-bb-card text-bb-foreground";

          return (
            <li key={id} className="flex min-h-12 max-h-40 flex-1 shrink-0">
              <button
                type="button"
                // The press contract: selection happens on pointer down, before
                // anything else, so the acknowledgement is the first frame.
                // Keyboard gets its own handler because a key press never emits
                // a pointer event, and having both a click and a pointer down
                // handler on one button is how a tap fires twice.
                onPointerDown={() => {
                  if (!gone) onPick(id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (!gone) onPick(id);
                }}
                aria-pressed={held}
                aria-disabled={gone || undefined}
                className={`press flex h-full min-h-11 w-full items-center break-words hyphens-auto rounded-xl border px-2.5 py-2.5 text-left text-scale-sm leading-snug sm:px-3 sm:py-3 ${skin} ${motion}`}
              >
                {textOf(spec, id)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Every pairing with its authored reason, after the board is done.
 *
 * A student who matched all four correctly on the first try has been told
 * nothing yet, and CLAUDE.md is explicit that a correct answer still owes an
 * explanation because a student who guesses right has learned nothing. This is
 * where that debt is paid, and it is opt in rather than a wall of text on the
 * celebration.
 */
function Workings({
  spec,
  state,
}: {
  readonly spec: MatchBoardSpec;
  readonly state: BoardState;
}) {
  return (
    <ul className="flex flex-col gap-2 text-scale-sm" role="list">
      {state.landed.map((pair) => (
        <li key={pair.promptId} className="rounded-xl border border-bb-border bg-bb-card p-3">
          <p className="font-semibold text-bb-foreground">
            {textOf(spec, pair.promptId)} to {textOf(spec, pair.targetId)}
          </p>
          {spec.whyByPrompt[pair.promptId] === undefined ? null : (
            <p className="mt-1 text-bb-muted-foreground">{spec.whyByPrompt[pair.promptId]}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * An unplayable board says so in the app rather than throwing into a blank
 * screen. Reported, never repaired: the fix is in the authored beat, and this
 * card names the beat and every sentence needed to find it.
 */
/**
 * The board plays, and something about how it is authored is still worth
 * saying. A card over the pill cap, a pairing with no explanation behind it, a
 * beat asking for connectors on a board that judges one pair at a time.
 *
 * It is drawn quietly and above the board rather than hidden behind a flag,
 * because a warning nobody renders is a warning nobody reads, and this is the
 * only surface where the author and the sentence are in the same place.
 */
function AuthoringWarnings({
  beatId,
  problems,
}: {
  readonly beatId: string;
  readonly problems: readonly string[];
}) {
  return (
    <div className="mb-3 rounded-xl border border-dashed border-bb-border px-3 py-2 text-scale-xs text-bb-muted-foreground">
      <p className="font-semibold">Authoring notes on {beatId}</p>
      <ul className="mt-1 list-disc pl-4" role="list">
        {problems.map((problem) => (
          <li key={problem}>{problem.replace(/^WARNING:\s*/, "")}</li>
        ))}
      </ul>
    </div>
  );
}

function AuthoringNotice({
  beatId,
  problems,
}: {
  readonly beatId: string;
  readonly problems: readonly string[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-bb-border p-4 text-scale-sm text-bb-muted-foreground">
      <p className="font-semibold text-bb-foreground">This board is not ready to play.</p>
      <p className="mt-1">
        Nothing here is your fault: the beat {beatId} is authored in a way the grader cannot
        accept, so it is being held back rather than shown wrong.
      </p>
      <ul className="mt-2 list-disc pl-5" role="list">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}
