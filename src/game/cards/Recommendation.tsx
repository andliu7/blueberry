/**
 * The mistake to card bridge, the deck icon it flies to, and the toast that
 * offers the card.
 *
 * WHAT THIS FILE IS FOR. tabs/trainer/mistakes.ts already journals every wrong
 * attempt with its named cause. A journal entry is not a card: it is a
 * reactionId, an arrow key and a cause id. This file turns one into a DRAFT
 * CARD, offers it in a toast, and plays the save animation the owner specified
 * frame by frame. The Anki borrow from CLAUDE.md is the scheduler, not the
 * interface, so the offer is a small coach-voice toast and never a card grid.
 *
 * THE COPY RULE, and it is the reason this file is mostly lookups. CLAUDE.md:
 * "A generated explanation is never cached and replayed as though it were
 * authored." So nothing here writes an explanation. A card's back and why are
 * lifted VERBATIM from copy a person already reviewed:
 *
 *   Tier 2, the anticipated distractor. tabs/trainer/distractors.ts, authored
 *           for that exact arrow on that exact step.
 *   Tier 1, the named cause. packages/feedback, authored for every CauseId in
 *           chem-core's registry.
 *
 * Tier 2 is tried FIRST even though it is the lower tier, and that is not a
 * mistake. CLAUDE.md's Phase 3 refinement says specificity wins over tier
 * number within the two free tiers: a distractor's explanation was written for
 * the exact gesture, and a diagnostic cause is the general case. If neither has
 * copy the card is NOT OFFERED. There is no fallback string, for the reason
 * packages/feedback gives in its own header: a fallback is how the yellow
 * triangle gets back in.
 *
 * THE JOURNAL REPLAY, and it is the fix a critic asked for. SavedMistake keeps
 * `distractorMatched` as a bare boolean, so a Tier 2 card used to be reachable
 * only while the live TrainerDistractor object was still in hand, one tick
 * after the mistake. Everything already on disk resolved to nothing. The fix is
 * `arrowFromKey`: the journal's arrow KEY is a lossless spelling of the arrow
 * (grade.ts builds it from the source kind, the ids and the electron count, and
 * sorts the two atom ids of a forming bond), so it parses back into a real
 * ElectronFlowArrow, and matchDistractor answers on that. No storage shape
 * changed, and a mistake saved last week can be drilled today. The round trip
 * is asserted over every arrow in the reaction registry rather than argued.
 *
 * THE ONLY STRINGS THIS FILE AUTHORS are the two button labels and the review
 * line. They carry no chemistry, and they name nothing the student did not do:
 * "card recommendation" and "card front" are our nouns for our data structures,
 * and the reference mistake screen ("Review 30 recent mistakes!") never once
 * names its own. The count comes from mistakeCount(), so the line is about the
 * student's own pile rather than about this one card.
 *
 * THE ANIMATION, owner specified, and every phase number lives in SAVE_PHASES
 * below rather than in the stylesheet, because the JS timers and the CSS
 * keyframes have to agree and two copies of 560 drift. The component writes the
 * table onto the element as custom properties and save-animation.css reads
 * them. See that file's header for why each phase maps to the motion token it
 * maps to. The sequencing itself is `startSaveRun`, a plain function with
 * injected timers and no React in it, because "the save commits exactly once,
 * on the landing frame, and still commits if the toast is torn down mid
 * flight" is the part that can be silently wrong and it deserves a test that
 * does not need a browser.
 *
 * WHAT IS NOT HERE. No scheduler: what an interval becomes after a rating is
 * scheduler.ts, per cards/types.ts. No storage: saving is `onSave`, and the
 * DeckSource implementation behind it is a rendering cache and an offline
 * draft, never an entitlement. This component renders and animates; it does not
 * decide what a save means.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  allCauseIds,
  createArrow,
  fromBond,
  fromLonePair,
  fromSingleElectron,
  toAtom,
  toBondBetween,
  type CauseId,
  type ElectronFlowArrow,
  type ElectronSink,
  type ElectronSource,
} from "@blueberry/chem-core";
import { causeCopy } from "@blueberry/feedback";

import { TRAINER_REACTIONS, type TrainerReaction } from "../demo/reactions";
import { matchDistractor, type TrainerDistractor } from "../tabs/trainer/distractors";
import { mistakeCount, type SavedMistake } from "../tabs/trainer/mistakes";
import type { BeatCauseId, BeatId } from "../beats/types";
import type { Card, CardId, Reco } from "./types";

import "./save-animation.css";

/* ------------------------------------------------------------------ */
/* The phase table                                                      */
/* ------------------------------------------------------------------ */

/**
 * The save choreography, owner specified 2026-08-27, in milliseconds from the
 * press.
 *
 * ONE table, read by both halves. The component schedules its timers from it
 * and writes it onto the DOM node as custom properties that save-animation.css
 * consumes, so there is exactly one place to change a number and no way for the
 * stylesheet and the state machine to disagree about when the flight ends.
 *
 * Which design token each phase is: `press` is --dur-instant (80ms), and it has
 * to stay inside CLAUDE.md's 100ms interaction budget. `fly` is --dur-slow
 * (380ms) exactly. `lift` at 180ms and `bounce` at 160ms have no token yet;
 * save-animation.css asks for --dur-lift and --dur-bounce with these as the
 * fallback, so the tokens win the moment they exist. Reported as an integration
 * edit rather than invented in place.
 */
export const SAVE_PHASES = Object.freeze({
  /** Pointer down to visible pressed state. Inside the 100ms budget. */
  press: 80,
  /** Toast dismisses, card lifts, 0.92 to 1.02, shadow grows. */
  lift: 180,
  /** The flight to the deck icon. Curved, rotating, scaling down. */
  fly: 380,
  /** Squash and stretch on the deck icon, badge pops. */
  bounce: 160,
  /** Reduced motion: the card fades where it stands. No flight. */
  fade: 140,
});

/** When the flight ends, measured from the press. The owner's 560. */
export const FLIGHT_END_MS = SAVE_PHASES.lift + SAVE_PHASES.fly;

/** When the whole thing is over. The owner's 720. */
export const SAVE_END_MS = FLIGHT_END_MS + SAVE_PHASES.bounce;

/** How small the card gets when no deck icon reports a size. The owner's 0.16. */
export const DEFAULT_FLIGHT_SCALE = 0.16;

/**
 * How long an ignored offer stays on screen.
 *
 * The offer must never become a decision the student has to make mid problem,
 * so the third option is doing nothing: it leaves on its own, and the mistake
 * is in the journal either way, reachable from the review line at the foot of
 * the toast. Long enough to read two sentences without hurrying, short enough
 * that it is gone before the next arrow is drawn.
 */
export const AUTO_DISMISS_MS = 9000;

/**
 * Where the card flies when the shell has not handed us a deck icon element.
 * Top left, one 44 by 44 hit target inset by a 16px gutter, so the fallback is
 * still aimed at where the icon lives rather than at the corner pixel.
 */
export const FALLBACK_DECK_RECT: FlightRect = Object.freeze({
  left: 16,
  top: 16,
  width: 44,
  height: 44,
});

/* ------------------------------------------------------------------ */
/* The bridge: a journal entry becomes a draft card                     */
/* ------------------------------------------------------------------ */

/**
 * The three fields every authored explanation in this repo has, whichever tier
 * it came from. packages/feedback calls them whatYouDid / why / lookAt and
 * distractors.ts calls them what / why / lookAt; they are the same three jobs,
 * so the bridge normalises once here rather than at four call sites.
 */
export interface AuthoredExplanation {
  /** What the student did, plainly. Becomes the toast's own line. */
  readonly what: string;
  /** The chemistry reason. Becomes the card's `why`. */
  readonly why: string;
  /** Where to look instead. Becomes the card's back. */
  readonly lookAt: string;
  /** Which tier this came from, for the log and for the tests. */
  readonly tier: 1 | 2;
}

/**
 * chem-core's cause ids as a Set, built once.
 *
 * `causeCopy` THROWS on an unknown id, by design, and the journal's causeId is
 * a plain `string` that came out of localStorage. A student on an older build,
 * or a cause retired between releases, must not crash a toast. So the id is
 * checked against the registry before the lookup rather than caught after it:
 * a missing card is a card not offered, and an exception is a broken screen.
 */
const KNOWN_CAUSE_IDS: ReadonlySet<string> = new Set<string>(allCauseIds());

/** The registry entry a journal line points at, or null when it is gone. */
export function reactionFor(reactionId: string): TrainerReaction | null {
  return TRAINER_REACTIONS.find((entry) => entry.id === reactionId) ?? null;
}

/**
 * The exact shape grade.ts writes: "2e lp:o1 -> atom:br1".
 *
 * Written as one anchored pattern rather than three splits so a key that is not
 * one of ours fails as a whole instead of half parsing into an arrow that names
 * atoms nobody has.
 */
const ARROW_KEY_PATTERN = /^([12])e (lp|bond|se):(.+) -> (atom|between):(.+)$/;

/**
 * The journal's arrow key, parsed back into the arrow that produced it.
 *
 * The inverse of grade.ts's `arrowKey`, and it is exact rather than approximate
 * because that function is a total spelling of the arrow: the electron count,
 * the source kind with its atom or bond id, and the sink with its one atom id
 * or its two sorted ones. The one thing it does not preserve is the arrow's own
 * ARROW ID, which no lookup uses; this mints a stable replay id instead so two
 * parses of the same key are the same arrow.
 *
 * Returns null on anything that is not one of our keys, because a journal line
 * from an older build is a card not offered, never a throw inside a toast.
 */
export function arrowFromKey(key: string): ElectronFlowArrow | null {
  const match = ARROW_KEY_PATTERN.exec(key);
  if (match === null) return null;
  const [, electrons, sourceKind, sourceId, sinkKind, sinkId] = match;
  if (
    electrons === undefined ||
    sourceKind === undefined ||
    sourceId === undefined ||
    sinkKind === undefined ||
    sinkId === undefined
  ) {
    return null;
  }

  let source: ElectronSource;
  if (sourceKind === "lp") source = fromLonePair(sourceId);
  else if (sourceKind === "bond") source = fromBond(sourceId);
  else source = fromSingleElectron(sourceId);

  let sink: ElectronSink;
  if (sinkKind === "atom") {
    sink = toAtom(sinkId);
  } else {
    const [a, b] = sinkId.split("+");
    if (a === undefined || b === undefined || a === "" || b === "") return null;
    sink = toBondBetween(a, b);
  }

  return createArrow({ id: `replay:${key}`, electrons: electrons === "1" ? 1 : 2, source, sink });
}

/**
 * The authored Tier 2 distractor for a journal entry, rebuilt from storage.
 *
 * This is what makes the mistake hub possible: every entry on disk can be asked
 * whether an instructor anticipated it, without the trainer being on screen.
 * `distractorMatched` on the entry is not consulted, and that is deliberate.
 * It records what the app believed at the time, and the authored table is what
 * is true now: a distractor added since then should light up an old mistake,
 * and one retired since then should stop claiming copy that no longer exists.
 */
export function journalDistractorFor(mistake: SavedMistake): TrainerDistractor | null {
  const reaction = reactionFor(mistake.reactionId);
  if (reaction === null) return null;
  const arrow = arrowFromKey(mistake.arrowKey);
  if (arrow === null) return null;
  return matchDistractor(reaction.step, arrow);
}

/**
 * The authored explanation for one mistake, or null when nobody wrote one.
 *
 * Tier 2 before Tier 1, per this file's header: the distractor was authored for
 * this exact arrow, the cause was authored for the general case, and CLAUDE.md
 * settles ties in favour of the more specific sentence.
 *
 * `distractor` is the LIVE object the trainer matched a tick ago. When it is
 * null the table is asked again from the journal, so a card rebuilt weeks later
 * carries the same sentence the toast carried at the time.
 */
export function authoredExplanationFor(
  mistake: SavedMistake,
  distractor: TrainerDistractor | null,
): AuthoredExplanation | null {
  const authored = distractor ?? journalDistractorFor(mistake);
  if (authored !== null) {
    return { what: authored.what, why: authored.why, lookAt: authored.lookAt, tier: 2 };
  }
  const { causeId } = mistake;
  if (causeId === null || !KNOWN_CAUSE_IDS.has(causeId)) return null;
  const copy = causeCopy(causeId as CauseId);
  return { what: copy.whatYouDid, why: copy.why, lookAt: copy.lookAt, tier: 1 };
}

/**
 * The card's stable identity.
 *
 * cards/types.ts: "a CardId is stable forever once the card has been reviewed",
 * and a card whose id changes has an interval history belonging to nothing. So
 * the id is DERIVED from what the card asks, never minted from a clock or a
 * counter: the same wrong arrow on the same reaction is the same card, drawn
 * again next week, and saving it twice updates one card rather than growing a
 * duplicate with its own schedule.
 */
export function mistakeCardId(mistake: SavedMistake): CardId {
  return `mistake:${mistake.reactionId}:${mistake.arrowKey}`;
}

/**
 * The beat this mistake belongs to.
 *
 * The trainer plays entries out of demo/reactions.ts, and no authored BeatSpec
 * points at them yet, so there is no real BeatId to record. BeatId is a plain
 * string alias, so this derives a stable one from the reaction rather than
 * inventing a number: it is honest about being a trainer reaction and it stays
 * the same across sessions. When a lesson playlist plays a real mechanism beat
 * it passes its own id through `beatId` instead.
 */
export function trainerBeatId(reactionId: string): BeatId {
  return `trainer:reaction:${reactionId}`;
}

/** The named cause a mistake card drills. Tier 2 hits have their own shape cause. */
export function beatCauseFor(
  mistake: SavedMistake,
  explanation: AuthoredExplanation,
): BeatCauseId {
  if (explanation.tier === 2) return "chose_authored_distractor";
  return mistake.causeId as BeatCauseId;
}

export interface DraftCardOptions {
  /** The Tier 2 distractor the trainer matched at the moment of the mistake. */
  readonly distractor?: TrainerDistractor | null;
  /** The real beat id, when a lesson playlist is driving rather than free play. */
  readonly beatId?: BeatId;
}

/**
 * One journal entry becomes one draft card, or nothing.
 *
 * Returns null on three honest cases, and each of them is a card NOT OFFERED
 * rather than a card with a placeholder in it: the reaction is no longer in the
 * registry, the cause id is not one chem-core defines, or nobody has authored
 * copy for what happened.
 *
 * The front is the prompt the student actually faced, title and brief joined,
 * because a card reviewed cold six weeks later has to say which problem it is
 * about. The back is the authored "look at this instead" and `why` is the
 * authored chemistry, which is exactly the split cards/types.ts asks for:
 * front asks, back answers, why teaches.
 */
export function draftCardFromMistake(
  mistake: SavedMistake,
  options: DraftCardOptions = {},
): Card | null {
  const reaction = reactionFor(mistake.reactionId);
  if (reaction === null) return null;

  const explanation = authoredExplanationFor(mistake, options.distractor ?? null);
  if (explanation === null) return null;

  const cause = beatCauseFor(mistake, explanation);
  return {
    id: mistakeCardId(mistake),
    front: `${reaction.title}. ${reaction.brief}`,
    back: explanation.lookAt,
    why: explanation.why,
    tags: ["mistake", reaction.id, cause],
    source: {
      kind: "mistake",
      beatId: options.beatId ?? trainerBeatId(reaction.id),
      cause,
      at: mistake.at,
    },
  };
}

/** A card the app is offering, paired with the toast line that offers it. */
export interface CardOffer {
  readonly card: Card;
  readonly reco: Reco;
}

/**
 * The offer a mistake produces, or null when no card is offered.
 *
 * `reco.reason` is the authored "what you did" sentence and nothing else.
 * cards/types.ts asks for a reason authored per cause rather than a generic
 * line, because "you got this wrong" reads as noise and "you sent the oxygen's
 * lone pair at bromine" reads as being seen. `now` is a parameter so this stays
 * pure and a test can ask about a fixed instant.
 */
export function offerFromMistake(
  mistake: SavedMistake,
  now: Date,
  options: DraftCardOptions = {},
): CardOffer | null {
  const card = draftCardFromMistake(mistake, options);
  if (card === null) return null;
  const explanation = authoredExplanationFor(mistake, options.distractor ?? null);
  if (explanation === null) return null;
  return {
    card,
    reco: { cardId: card.id, reason: explanation.what, seenAt: now.toISOString() },
  };
}

/* ------------------------------------------------------------------ */
/* The flight geometry                                                  */
/* ------------------------------------------------------------------ */

/** The four numbers this file needs off a DOMRect. Plain, so a test can build one. */
export interface FlightRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface FlightTransform {
  /** Viewport pixels to travel. Negative is left and up. */
  readonly dx: number;
  readonly dy: number;
  /** What the card scales to on arrival. */
  readonly scale: number;
}

/** Below this the card is a dot; above it the flight does not read as a shrink. */
const MIN_FLIGHT_SCALE = 0.08;
const MAX_FLIGHT_SCALE = 0.3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Centre to centre, plus how far to shrink.
 *
 * Pure and takes plain rectangles, so the arithmetic that decides where the
 * card lands is tested in node rather than eyeballed in a browser. The card
 * scales to the deck icon's own width where one is measurable, and to the
 * owner's 0.16 where it is not, because a degenerate rect (a hidden icon, a
 * zero width measurement) must not produce NaN in a transform: a NaN transform
 * silently drops the whole animation.
 */
export function flightTransform(card: FlightRect, target: FlightRect): FlightTransform {
  const dx = target.left + target.width / 2 - (card.left + card.width / 2);
  const dy = target.top + target.height / 2 - (card.top + card.height / 2);
  const measurable = card.width > 0 && target.width > 0;
  const scale = measurable
    ? clamp(target.width / card.width, MIN_FLIGHT_SCALE, MAX_FLIGHT_SCALE)
    : DEFAULT_FLIGHT_SCALE;
  return { dx, dy, scale };
}

function rectOf(element: HTMLElement | null): FlightRect | null {
  if (element === null) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/* ------------------------------------------------------------------ */
/* The deck icon, and how the toast finds it                            */
/* ------------------------------------------------------------------ */

/** The class the deck icon wears while it squashes. Its badge pops with it. */
export const DECK_BOUNCE_CLASS = "deck-icon--catching";

/** The attribute that marks the element the card flies to. */
export const DECK_ICON_ATTRIBUTE = "data-deck-icon";

/**
 * The mounted deck icon, as a module level registry.
 *
 * NAMED BECAUSE IT IS NOT A NORMAL REACT PATTERN. The toast and the icon are in
 * different parts of the tree, and the toast has to find the icon's live
 * element to measure it and to put a class on it for 160ms. The React answers
 * are a context provider wrapping both, or a ref threaded down through every
 * component in between. Both make every screen in the app carry a provider for
 * one animation. This is one module scoped variable, written by the icon's own
 * ref callback and read by the toast, and it is honest about its one weakness:
 * exactly one deck icon can be mounted at a time, which is true of a fixed
 * element in the top left corner.
 *
 * The querySelector fallback is what makes this a CONTRACT rather than a
 * coupling. A shell that draws its own icon and never imports DeckIcon still
 * works, as long as it puts data-deck-icon on the element and data-deck-badge
 * on the count.
 */
let mountedDeckIcon: HTMLElement | null = null;

/** The element the card flies to: the mounted icon, the shell's own, or nothing. */
export function deckIconElement(): HTMLElement | null {
  if (mountedDeckIcon !== null && mountedDeckIcon.isConnected) return mountedDeckIcon;
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[${DECK_ICON_ATTRIBUTE}]`);
}

export interface DeckIconProps {
  /** How many cards are in the deck. Rendered on the badge that pops. */
  readonly count: number;
  /** Opening the deck. The hub is cards/ui/MyDeck; this only says "go there". */
  readonly onClick?: () => void;
  /**
   * Fixed to the top left corner, which is where the owner put it. A shell that
   * wants the icon inside its own header passes false and places it itself.
   */
  readonly floating?: boolean;
  /** What a screen reader says. Given a default so the shell cannot forget. */
  readonly label?: string;
}

/**
 * The deck icon in the top left, and the badge the save increments.
 *
 * It lives in this file rather than in cards/ui because it is one half of the
 * animation contract: save-animation.css names .deck-icon--catching and
 * [data-deck-badge], and a hook declared in one folder and honoured in another
 * is how the first version of this shipped with a card flying to an empty
 * corner. The screens a student browses (the hub, the picker, the session) are
 * cards/ui's; this is the 44 by 44 target the card lands on.
 */
export function DeckIcon({ count, onClick, floating = true, label }: DeckIconProps) {
  // A ref CALLBACK rather than useRef: it runs on mount with the element and on
  // unmount with null, which is exactly when the registry above needs updating.
  const register = useCallback((element: HTMLButtonElement | null) => {
    if (element !== null) mountedDeckIcon = element;
    else if (mountedDeckIcon !== null && !mountedDeckIcon.isConnected) mountedDeckIcon = null;
  }, []);

  const spoken = label ?? `${DECK_CHROME.deck}, ${count} ${count === 1 ? "card" : "cards"}`;
  return (
    <button
      type="button"
      ref={register}
      className={floating ? "deck-icon deck-icon--floating" : "deck-icon"}
      data-deck-icon=""
      onClick={onClick}
      aria-label={spoken}
    >
      <span className="deck-icon__glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="6.5" width="12" height="14" rx="2.5" />
          <path d="M8 4.5h9a2.5 2.5 0 0 1 2.5 2.5v11" />
        </svg>
      </span>
      <span className="deck-icon__badge" data-deck-badge="">
        {count}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The save run                                                         */
/* ------------------------------------------------------------------ */

export type SavePhase = "offered" | "lifting" | "flying" | "landing" | "fading" | "gone";

type TimerId = ReturnType<typeof setTimeout>;

/** Injected so a test can drive the choreography without a browser or a wait. */
export interface SaveTimers {
  readonly start: (fn: () => void, ms: number) => TimerId;
  readonly stop: (id: TimerId) => void;
}

const DEFAULT_TIMERS: SaveTimers = {
  start: (fn, ms) => setTimeout(fn, ms),
  stop: (id) => clearTimeout(id),
};

export interface SaveRunOptions {
  readonly reducedMotion: boolean;
  /** Where the phase goes next. In the component this is setState. */
  readonly onPhase: (phase: SavePhase) => void;
  /** Make the save real. Called exactly once per run, whatever happens. */
  readonly commit: () => void;
  /** Put the squash class on the deck icon, and take it off again. */
  readonly bounce?: (on: boolean) => void;
  readonly timers?: SaveTimers;
}

export interface SaveRun {
  /** Stop early: cancel the timers, clean up the icon, and commit if needed. */
  readonly abort: () => void;
  readonly committed: () => boolean;
}

/**
 * The whole save sequence, with no React in it.
 *
 * WHY IT IS A FUNCTION AND NOT A useEffect. Three of the four things that can
 * be wrong here are invisible on screen: the save firing twice (a duplicate
 * card with its own interval history), the save firing at the press instead of
 * at the landing (the badge increments before the card gets there), and the
 * save being LOST when the student navigates away mid flight. Written as a
 * plain function with injected timers, all three are ordinary assertions.
 *
 * THE RULE THE WHOLE THING EXISTS FOR: the animation is never what makes a save
 * real. `commit` runs on the landing frame in the normal case, on the fade in
 * the reduced motion case, and immediately on abort in every other case, and a
 * flag makes sure it is exactly once.
 */
export function startSaveRun(options: SaveRunOptions): SaveRun {
  const timers = options.timers ?? DEFAULT_TIMERS;
  const pending: TimerId[] = [];
  let committed = false;
  let bounced = false;

  const commitOnce = (): void => {
    if (committed) return;
    committed = true;
    options.commit();
  };

  const at = (ms: number, fn: () => void): void => {
    pending.push(timers.start(fn, ms));
  };

  const stopBounce = (): void => {
    if (!bounced) return;
    bounced = false;
    options.bounce?.(false);
  };

  if (options.reducedMotion) {
    // Owner: "the card fades in place and the badge increments. No flight."
    // The badge still moves, because a reduced motion preference asks for less
    // travel and not for less information.
    options.onPhase("fading");
    at(SAVE_PHASES.fade, () => {
      commitOnce();
      options.onPhase("gone");
    });
  } else {
    options.onPhase("lifting");
    at(SAVE_PHASES.lift, () => options.onPhase("flying"));
    at(FLIGHT_END_MS, () => {
      // The landing frame. The save commits HERE, so the badge increments in
      // the same frame the icon squashes and the two read as one event.
      commitOnce();
      options.onPhase("landing");
      bounced = true;
      options.bounce?.(true);
    });
    at(SAVE_END_MS, () => {
      stopBounce();
      options.onPhase("gone");
    });
  }

  return {
    abort: () => {
      for (const id of pending) timers.stop(id);
      pending.length = 0;
      stopBounce();
      commitOnce();
    },
    committed: () => committed,
  };
}

/* ------------------------------------------------------------------ */
/* The toast                                                            */
/* ------------------------------------------------------------------ */

/**
 * The OS preference, read at the moment of the save rather than subscribed to.
 *
 * app/hooks.ts owns `useReducedMotion` and its own header says the value is
 * "decided once here, passed down as props", which is why this component takes
 * `reducedMotion` as a prop. This is only the fallback for a caller that did
 * not pass one, and reading it at save time is enough: the preference matters
 * for exactly one decision, made once, at the press. Guarded because the
 * function is also reachable from a non browser environment.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The only strings this file authors. Interface copy, not explanation copy:
 * nothing here carries a chemistry claim, and the sentences a student learns
 * from all come out of the authored registries.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no "Card recommendation" eyebrow and no
 * "Card front" label any more. Those named OUR data structures at the student,
 * and the reference mistake screen never does that: it says "Review 30 recent
 * mistakes!" and lists the prompts. The authored what-you-did sentence leads
 * instead, because it is the specific one, and the count line at the foot is
 * about the student's own pile.
 *
 * Exported so the voice test lints the same strings the toast renders. Two
 * copies of a label, one in a component and one in a test, is how a lint ends
 * up guarding a string nobody ships.
 */
export const RECO_CHROME = Object.freeze({
  save: "Save to your deck",
  dismiss: "Not now",
});

/** The deck icon's spoken name. Separate because the icon renders without a toast. */
export const DECK_CHROME = Object.freeze({
  deck: "Your deck",
});

/**
 * The batch line, and the one tap out of per-mistake decisions.
 *
 * The reference's whole mistake screen is one sentence with a number in it and
 * one button under it. This is that sentence, sized to the student's real pile
 * rather than to this card: a student who does not want to think about one
 * wrong arrow can go and drill everything recent instead.
 */
export function reviewLabel(count: number): string {
  if (count === 1) return "Review 1 recent mistake";
  return `Review ${count} recent mistakes`;
}

export interface RecommendationProps {
  /** The offer to show, or null for no toast at all. */
  readonly offer: CardOffer | null;
  /**
   * Save it. Called ONCE, at the moment the card lands, so the deck badge
   * increments on the same frame the icon bounces. A cleanup commits it early
   * if the toast is torn down mid flight, because a save must never depend on
   * an animation finishing.
   */
  readonly onSave: (card: Card) => void;
  /** The student said not now, pressed Escape, or let it time out. */
  readonly onDismiss: (card: Card) => void;
  /**
   * Open the mistake hub. When it is absent the review line is not rendered,
   * so a surface with nowhere to send the student does not offer to send them.
   */
  readonly onReview?: () => void;
  /**
   * The deck icon in the top left, as a getter rather than a ref object.
   *
   * A getter because the icon lives in the shell, which owns its own tree: the
   * shell hands us a way to FIND the element at flight time instead of a ref
   * whose current value we would be reading across a component boundary. The
   * default finds a mounted DeckIcon, or any element carrying data-deck-icon.
   */
  readonly deckIcon?: () => HTMLElement | null;
  /**
   * The shell's already-decided reduced motion value. Pass it: app/hooks.ts
   * subscribes once and hands it down, and that is the convention here. Omitted,
   * the component reads the media query itself at the press.
   */
  readonly reducedMotion?: boolean;
  /** How many mistakes the review line offers. Defaults to the journal's count. */
  readonly mistakeTotal?: number;
  /** How long an ignored offer stays. 0 keeps it until the student acts. */
  readonly autoDismissMs?: number;
}

/**
 * The offer toast, and the whole save choreography.
 *
 * NON BLOCKING is a requirement, not a nicety: this sits above the canvas, has
 * no scrim, takes no focus, and `aria-live="polite"` announces it without
 * interrupting. A student who ignores it can draw the next arrow straight away,
 * and after AUTO_DISMISS_MS it leaves on its own. Escape closes it too, so a
 * keyboard user is never made to tab into a live region to get rid of it.
 */
export function Recommendation({
  offer,
  onSave,
  onDismiss,
  onReview,
  deckIcon = deckIconElement,
  reducedMotion,
  mistakeTotal,
  autoDismissMs = AUTO_DISMISS_MS,
}: RecommendationProps) {
  const [phase, setPhase] = useState<SavePhase>("offered");
  const [flight, setFlight] = useState<FlightTransform | null>(null);

  // The CARD is measured, not the frame around it: the frame is a full width
  // strip so that taps beside the card pass through to the canvas, and its
  // centre is the middle of the viewport rather than the middle of the card.
  //
  // Measuring it at click time is safe because getBoundingClientRect reports
  // the TRANSFORMED box and the card is at identity then: the press transform
  // is released on pointer up, before click, and the entrance animation ends at
  // identity. A click landing inside that 220ms entrance measures a box up to 2
  // percent small, which moves the landing by a pixel or two and is not worth a
  // second element to avoid.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const runRef = useRef<SaveRun | null>(null);
  const bouncedRef = useRef<HTMLElement | null>(null);
  const onSaveRef = useRef(onSave);

  const cardId = offer?.card.id ?? null;

  // The "latest value" ref pattern, named because it is not obvious: the run
  // below outlives the render that started it, so it would otherwise call the
  // onSave that was current at the press even if the parent has since swapped
  // it. Keeping the current one in a ref, updated in an effect rather than
  // during render, gives the run today's function without restarting anything.
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  // A new offer resets the machine, and the CLEANUP is the teardown: it runs on
  // a new card and on unmount alike, aborting a flight that is still going.
  // Abort commits, so losing a save because the student navigated away mid
  // flight cannot happen. The animation is never what makes a save real.
  useEffect(() => {
    setPhase("offered");
    setFlight(null);
    return () => {
      runRef.current?.abort();
      runRef.current = null;
      bouncedRef.current = null;
    };
  }, [cardId]);

  const handleSave = useCallback(() => {
    if (offer === null || runRef.current !== null) return;
    const card = offer.card;
    const reduced = reducedMotion ?? prefersReducedMotion();

    if (!reduced) {
      const from = rectOf(cardRef.current);
      const to = rectOf(deckIcon()) ?? FALLBACK_DECK_RECT;
      setFlight(from === null ? null : flightTransform(from, to));
    }

    runRef.current = startSaveRun({
      reducedMotion: reduced,
      onPhase: setPhase,
      commit: () => onSaveRef.current(card),
      bounce: (on) => {
        if (on) {
          const icon = deckIcon();
          if (icon === null) return;
          icon.classList.add(DECK_BOUNCE_CLASS);
          bouncedRef.current = icon;
          return;
        }
        bouncedRef.current?.classList.remove(DECK_BOUNCE_CLASS);
        bouncedRef.current = null;
      },
    });
  }, [offer, reducedMotion, deckIcon]);

  const handleDismiss = useCallback(() => {
    if (offer === null || runRef.current !== null) return;
    // The toast closes ITSELF. It used to report the dismissal and wait for a
    // parent to null the offer, which meant a parent that did not do that left
    // a toast on screen forever.
    setPhase("gone");
    onDismiss(offer.card);
  }, [offer, onDismiss]);

  // Escape closes it, and an ignored offer closes itself. Both are the same
  // exit, so they run through the same handler and are counted the same way.
  useEffect(() => {
    if (offer === null || phase !== "offered" || typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", onKey);
    const timer = autoDismissMs > 0 ? setTimeout(handleDismiss, autoDismissMs) : null;
    return () => {
      document.removeEventListener("keydown", onKey);
      if (timer !== null) clearTimeout(timer);
    };
  }, [offer, phase, autoDismissMs, handleDismiss]);

  // Recomputed per offer rather than per render: mistakeCount() parses the
  // journal out of localStorage, and the toast re-renders on every phase.
  const total = useMemo(
    () => mistakeTotal ?? mistakeCount(),
    [mistakeTotal, cardId],
  );

  if (offer === null || phase === "gone") return null;

  const { card, reco } = offer;
  // Custom properties on an inline style need the cast: React types `style` as
  // CSSProperties, which has no index signature for --custom names.
  const style = {
    "--sa-press": `${SAVE_PHASES.press}ms`,
    "--sa-lift": `${SAVE_PHASES.lift}ms`,
    "--sa-fly": `${SAVE_PHASES.fly}ms`,
    "--sa-fade": `${SAVE_PHASES.fade}ms`,
    "--sa-dx": `${flight?.dx ?? 0}px`,
    "--sa-dy": `${flight?.dy ?? 0}px`,
    "--sa-scale": `${flight?.scale ?? DEFAULT_FLIGHT_SCALE}`,
  } as CSSProperties;

  return (
    <div className="mistake-toast" style={style} data-phase={phase} role="status" aria-live="polite">
      <div className="mistake-toast__card" ref={cardRef}>
        <p className="mistake-toast__reason">{reco.reason}</p>
        <p className="mistake-toast__front">{card.front}</p>
        <div className="mistake-toast__actions">
          <button type="button" className="mistake-toast__save" onClick={handleSave}>
            {RECO_CHROME.save}
          </button>
          <button type="button" className="mistake-toast__dismiss" onClick={handleDismiss}>
            {RECO_CHROME.dismiss}
          </button>
        </div>
        {onReview !== undefined && total > 0 ? (
          <button type="button" className="mistake-toast__review" onClick={onReview}>
            {reviewLabel(total)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default Recommendation;
