/**
 * THE SHARED FRAME. Built first, on purpose, because it is the deliverable.
 *
 * The three committed goal images (blueberry_r9-onboard-welcome, -question and
 * -placement) draw one screen three times: a fat progress bar filling green
 * across the top, a mascot asking from a speech bubble, big option chips with a
 * picked state, and a full width action pinned to the bottom that is off until
 * a choice is made. Seven steps share that; nothing below re-lays it out.
 *
 * WHAT IS IN HERE AND WHAT IS NOT. This module owns the frame and the two chip
 * families. It owns no flow: it never reads the hash, never writes progress,
 * and holds no answer. The step components pass what to draw and what to do,
 * which is what lets flow.ts stay pure and testable and lets this stay a set of
 * presentational components with no branching to get wrong.
 *
 * THE PRESS, and this is the contract that matters most: every control here
 * acknowledges on POINTER DOWN. The acknowledgement is `:active` in
 * onboarding.css, which the browser paints the same frame the pointer lands
 * with no JavaScript in the path, so it cannot miss the 100 ms budget however
 * slow the handler behind it is. That is also why the ACT is on `onClick` and
 * never on `onPointerDown` for anything that navigates: pointer down is the
 * acknowledgement, click is the commitment, and a control that navigates on
 * pointer down cannot be cancelled by sliding off it, which is the one gesture
 * a student has for changing their mind.
 *
 * TWO COLUMN WIDTHS, BOTH MEASURED OFF THE IMAGES, and they are not a style
 * choice this file made. blueberry_r9-onboard-question runs the bar, the chips
 * and CONTINUE from x 92 to 680 of a 768 wide render, a 76.5 percent column.
 * blueberry_r9-onboard-placement runs its header row and its 2x2 from x 45 to
 * 725 of the same render, an 88 percent column, and the welcome image draws
 * its bar just as wide. So a question step is the narrow column and the
 * placement question and the welcome beat are the wide one. `column` is that
 * choice, made once here and read by `--ob-gutter`.
 */

import type { CSSProperties, ReactNode } from "react";
import { Berry } from "../mascot/Berry";
import { BackIcon, CheckIcon, CloseIcon } from "./icons";
import {
  BACK_LABEL,
  GATE_NOTICE,
  HUMAN_GATE_MARK,
  LEAVE_LABEL,
  PROGRESS_LABEL,
  withoutMark,
} from "./copy";
import "./onboarding.css";

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export interface FrameProps {
  /** 0 to 100. The bar is visible from screen one, per the welcome image. */
  readonly percent: number;
  /** Null on the first step, where there is nowhere back to. */
  readonly onBack: (() => void) | null;
  /**
   * WHICH MARK THE LEADING CONTROL DRAWS, and it is not a style choice.
   * blueberry_r9-onboard-question draws a chevron and
   * blueberry_r9-onboard-placement draws an X. A chevron says "one question
   * back"; an X says "out of this". The placement is the only step a student
   * may want to leave as a whole, so it is the only one that asks for "leave".
   *
   * It also decides WHERE the control sits. The question image draws nothing
   * beside its bar, so the chevron hangs in the page gutter and the bar keeps
   * the whole column. The placement image draws the X INLINE at the head of
   * the row, which is why the bar there starts at 64 rather than at 23 and is
   * shorter than the column it sits in. Two images, two placements, one flag.
   */
  readonly leading?: "back" | "leave";
  /** Narrow is the question image's column; wide is the placement's. */
  readonly column?: "narrow" | "wide";
  /**
   * The small control at the RIGHT END OF THE HEADER ROW.
   * blueberry_r9-onboard-placement draws a 37 by 19 grey pill there, the third
   * element of a three element row, and an earlier pass removed it on the
   * argument that an empty pill is chrome pretending to be a meter. That
   * argument was right about the pill being empty and wrong about the fix:
   * the image draws three things in that row and the bar's start and width
   * both depend on all three being present. So the pill is drawn and it is
   * given the one job the placement actually has spare, skipping a question,
   * which also gets a second primary weight stadium out of the pinned foot.
   */
  readonly trailing?: ReactNode;
  /**
   * THE BAR WITH ITS NUMERAL INSIDE IT, which only the welcome image draws.
   * It draws a taller track with a warm tan outline, a cream interior, "5%"
   * set inside it and the fill reading as a round green cap at that mark. The
   * question and placement images draw a shorter unoutlined track with no
   * numeral, so the numeral is a welcome-beat variant rather than the default.
   */
  readonly barNumeral?: boolean;
  readonly children: ReactNode;
  /** The pinned bottom band: the action, and any second action. */
  readonly foot: ReactNode;
  /**
   * A FULL BLEED DECORATION BEHIND THE PAGE, and it exists because a negative
   * margin could not do the job.
   *
   * The welcome image draws the rise running off both screen edges with only
   * its top curve visible. The previous pass tried that with
   * `width: calc(100% + 2rem); margin-left: -1rem` on an element inside
   * `.ob__body`, and it arrived as a rectangle with three hard edges: the body
   * carries `overflow-y: auto` so its overflow-x computes to `auto` too, and
   * the bleed was clipped at the content box. CSS has no way to overflow one
   * axis of a scroll container.
   *
   * So the backdrop is a SIBLING of the scrolling body rather than a child of
   * it, absolutely positioned against `.ob` (which never scrolls) and painted
   * behind everything. Nothing about it is in flow, so it cannot push the
   * action off the screen either.
   */
  readonly backdrop?: ReactNode;
  /** Reserves air under the last option for the peeking mascot. Placement. */
  readonly peek?: boolean;
}

export function Frame({
  percent,
  onBack,
  leading = "back",
  column = "narrow",
  trailing,
  barNumeral = false,
  children,
  foot,
  backdrop,
  peek = false,
}: FrameProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const leave = leading === "leave";
  const lead = (
    <button
      type="button"
      className="ob-back"
      data-place={leave ? "inline" : "gutter"}
      data-empty={onBack === null ? "true" : "false"}
      aria-label={withoutMark(leave ? LEAVE_LABEL : BACK_LABEL)}
      aria-hidden={onBack === null || undefined}
      tabIndex={onBack === null ? -1 : undefined}
      onClick={() => onBack?.()}
    >
      {leave ? <CloseIcon width={22} height={22} /> : <BackIcon width={22} height={22} />}
    </button>
  );

  return (
    <div className="ob" data-column={column} data-peek={peek ? "true" : "false"}>
      {backdrop === undefined ? null : <div className="ob__backdrop">{backdrop}</div>}
      {/*
        THE GUTTER PLACEMENT IS A CHILD OF `.ob`, NOT OF THE HEADER ROW, and the
        nesting is the whole point rather than an accident of markup. It is
        absolutely positioned into the page GUTTER so it sits at the screen
        edge beside the bar without taking any width out of it, and an absolute
        box resolves against its nearest positioned ancestor: inside
        `.ob__head` that would be the header's content box, which starts after
        the gutter, and the control landed inside the column instead of beside
        it. Out here `.ob` is the containing block and the gutter is reachable.
        The INLINE placement is the opposite case and belongs in the row.
      */}
      {leave ? null : lead}
      <div className="ob__head">
        {leave ? lead : null}
        {/*
          A real progressbar role, so the percent reaches a screen reader on
          the six screens that draw no numeral, and matches the one that does.
        */}
        <div
          className="ob-bar"
          data-numeral={barNumeral ? "true" : "false"}
          role="progressbar"
          aria-label={withoutMark(PROGRESS_LABEL)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
        >
          <div className="ob-bar__fill" style={{ width: `${clamped}%` }} />
          {barNumeral ? <span className="ob-bar__numeral">{Math.round(clamped)}%</span> : null}
        </div>
        {trailing === undefined ? null : <div className="ob__trail">{trailing}</div>}
      </div>
      <div className="ob__body">{children}</div>
      {/* THE SCROLL EDGE. A gradient to the page colour pinned above the foot,
          so a set that overflows fades into the action band instead of being
          sliced flat. It is a gradient TO the page colour drawn OVER the page
          colour, so it is invisible when nothing is under it and no second "is
          this scrollable" state has to be computed and then kept true. */}
      <div className="ob__edge" data-on={backdrop === undefined ? "true" : "false"} aria-hidden />
      <div className="ob__foot">{foot}</div>
      {/*
        THE GATE DECLARATION, BACK ON THE SCREEN AND COSTING THE BAR NOTHING.
        A previous pass drew the mark at the end of the header row, which took
        79px out of a 358px header and left the progress bar at 55 percent of
        the frame where all three images draw about 76. The pass after that
        removed it entirely, which meant eight screens of draft copy presented
        as finished copy with no signal at all. It is a strip now: one line
        under the action, outside every column, in the muted ink, on every
        screen of the flow. CLAUDE.md makes this funnel a human gate, so a
        reviewer opening #/start/welcome is owed the sentence that says so.
      */}
      <p className="ob-gate">
        <span className="ob-gate__mark">{HUMAN_GATE_MARK}</span> {withoutMark(GATE_NOTICE)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The mascot asks                                                     */
/* ------------------------------------------------------------------ */

export interface AskProps {
  readonly line: string;
  readonly reducedMotion: boolean;
  /** The berry's size. The question image draws him at 57 css beside the bubble. */
  readonly berryPx?: number;
}

/**
 * Berry, then the bubble. Exactly one mascot instance per screen: the sticker
 * audit's rule 10 scores a second one, and the pathway goals say the same thing
 * in prose ("there is exactly ONE Berry on screen").
 *
 * 57, MEASURED, not 76. blueberry_r9-onboard-question draws the asking berry at
 * 57 css beside a bubble whose face is 70.6 css tall; at 76 he was a third
 * larger than the image and took enough of the row that a two line question
 * wrapped to three.
 */
export function Ask({ line, reducedMotion, berryPx = 57 }: AskProps) {
  return (
    <div className="ob-ask">
      {/* EYES OPEN. blueberry_r9-onboard-question draws Berry watching the
          student with round open eyes, which is the `curious` mood; `happy`
          renders the kind closed-eye smile, which reads as Berry pleased with
          himself rather than Berry waiting for an answer. The mascot itself is
          imported and never redrawn (D4), so matching the image is a matter of
          asking it for the right face. */}
      <Berry
        className="ob-ask__berry"
        behaviour="idle"
        mood="curious"
        reducedMotion={reducedMotion}
        sizePx={berryPx}
      />
      <p className="ob-bubble">{withoutMark(line)}</p>
    </div>
  );
}

/**
 * THE HERO: Berry large and centred with the greeting over his shoulder, which
 * is the welcome image's composition and not the row every other step uses.
 *
 * THE BUBBLE'S OFFSET IS DERIVED FROM HIS SIZE, and that is the fix for a
 * defect the previous pass shipped. The bubble was anchored with rem constants
 * (`left: 52%`, `bottom: calc(100% - 8.75rem)`) hand tuned for a 186px berry,
 * so at the 132px the placement's own hero screens use, the bubble's lower
 * edge landed 48 pixels inside his head and the tail pointed into his crown. A
 * hand tuned constant is only correct at the one size it was tuned at, and
 * this class is used at two.
 *
 * So the size travels into CSS as `--ob-berry` and every offset in
 * `.ob-welcome__hero` is a fraction of it. The composition is the same
 * composition at 132 or at 186, which is the property the constant never had.
 * Naming the pattern, since this codebase's reader asked for that: a CSS
 * CUSTOM PROPERTY SET FROM A REACT PROP is the ordinary way to let a
 * stylesheet do arithmetic on a value only the component knows.
 */
export function Hero({
  line,
  reducedMotion,
  sizePx,
  behaviour = "wave",
  mood = "curious",
  bottomAnchored = false,
  children,
}: {
  readonly line: string;
  readonly reducedMotion: boolean;
  readonly sizePx: number;
  readonly behaviour?: "wave" | "idle";
  readonly mood?: "curious" | "happy";
  /** The welcome beat owns its lower third; the others centre themselves. */
  readonly bottomAnchored?: boolean;
  readonly children?: ReactNode;
}) {
  const style = { "--ob-berry": `${sizePx}px` } as CSSProperties;
  return (
    <div className="ob-welcome" data-hero={bottomAnchored ? "welcome" : "centred"}>
      <div className="ob-welcome__hero" style={style}>
        <Berry
          className="ob-welcome__berry"
          behaviour={behaviour}
          mood={mood}
          reducedMotion={reducedMotion}
          sizePx={sizePx}
        />
        <p className="ob-bubble ob-welcome__bubble">{withoutMark(line)}</p>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The option chip                                                     */
/* ------------------------------------------------------------------ */

export interface ChipProps {
  readonly picked: boolean;
  readonly onPick: () => void;
  readonly icon?: ReactNode;
  readonly label: string;
  /** A second line under the label. The goal step's XP and charge line. */
  readonly meta?: string | null;
}

/**
 * The big option chip of the question image: icon, label, and a check that
 * appears when it is picked.
 *
 * `aria-pressed` is both the accessible state and the CSS hook, so the picked
 * outline cannot drift away from what a screen reader is told. `data-stacking`
 * is the sticker audit's opt-in for the stacked edge (a solid box-shadow with
 * no blur, offset only on Y), which is BUTTON-MECHANICS' construction and not
 * the drop shadow rule 3 bans.
 */
export function Chip({ picked, onPick, icon, label, meta = null }: ChipProps) {
  return (
    <button
      type="button"
      className="ob-chip"
      aria-pressed={picked}
      data-stacking=""
      onClick={onPick}
    >
      {icon === undefined ? null : <span className="ob-chip__icon">{icon}</span>}
      <span className="ob-chip__label">
        {withoutMark(label)}
        {meta === null ? null : <span className="ob-chip__meta">{withoutMark(meta)}</span>}
      </span>
      {picked ? <CheckIcon className="ob-chip__check" /> : null}
    </button>
  );
}

/** The chip list. Two columns only where the layout actually reads; see flow.ts. */
export function ChipList({ grid = false, children }: { readonly grid?: boolean; readonly children: ReactNode }) {
  return <ul className={grid ? "ob-options ob-options--grid" : "ob-options"}>{children}</ul>;
}

/* ------------------------------------------------------------------ */
/* The actions                                                         */
/* ------------------------------------------------------------------ */

export interface ActionProps {
  readonly label: string;
  /** CONTINUE is gated on a choice. Disabled is a state, never a hidden button. */
  readonly disabled?: boolean;
  /**
   * THE PRIMARY ACTION IS A ROUNDED RECTANGLE ALMOST EVERYWHERE, and a stadium
   * on exactly one screen. blueberry_r9-onboard-question draws CONTINUE and
   * blueberry_r9-onboard-placement draws CHECK as rectangles with a corner
   * radius around 12 to 14 CSS pixels; only blueberry_r9-onboard-welcome draws
   * GET STARTED as a full stadium. A previous pass used 9999px for all three,
   * which matched one image out of three. The default is therefore the
   * majority shape and the welcome beat opts into the other one.
   */
  readonly shape?: "rect" | "stadium";
  readonly onPress: () => void;
}

export function Action({ label, disabled = false, shape = "rect", onPress }: ActionProps) {
  return (
    <button
      type="button"
      className="ob-cta"
      data-shape={shape}
      disabled={disabled}
      data-stacking=""
      onClick={onPress}
    >
      {withoutMark(label)}
    </button>
  );
}

/**
 * SKIP AS THE HEADER ROW'S TRAILING PILL, which is where the placement image
 * has room for it.
 *
 * The previous pass drew skip as `blueberry_spec-button-types` draws it, a
 * full width violet outlined stadium, and stacked it under CHECK. The taxonomy
 * image is right that skip is a real button; the placement image is right that
 * its foot holds ONE control, and a second 48px primary weight stadium made
 * the pinned band 74px taller than the image draws it. This is both: a real
 * button, in the one place the composition has room for it.
 *
 * THE 44px TARGET WINS OVER THE 37 by 19 PILL, and the divergence is
 * deliberate and reported here rather than discovered. CLAUDE.md's Budgets row
 * is a 44 by 44 minimum hit target and the image's pill is smaller than that
 * in both axes. So the BUTTON is 44 tall and the PILL inside it is the image's
 * size, which is the same expanded-hit-area construction DESIGN-GOALS already
 * rules for the trainer's lone pair handles: the drawn mark stays small, the
 * touch target does not.
 */
export function TrailingSkip({
  label,
  short,
  onPress,
}: {
  /** The full sentence. Stays the control's accessible name. */
  readonly label: string;
  /** The one word that fits inside the image's 37px pill. */
  readonly short: string;
  readonly onPress: () => void;
}) {
  return (
    <button
      type="button"
      className="ob-headskip"
      aria-label={withoutMark(label)}
      onClick={onPress}
    >
      <span className="ob-headskip__pill">{withoutMark(short)}</span>
    </button>
  );
}

/**
 * The underlined link under an action: "I already have an account" on the
 * welcome beat, and "skip" on the how-did-you-hear step.
 *
 * Deliberately quieter than any filled control. The welcome image draws the
 * returning-student link this way, and the how-did-you-hear step borrows it
 * for the same reason the placement borrows the header pill: the question
 * image's foot holds one control, and skipping is not a second answer.
 */
export function QuietAction({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <button type="button" className="ob-quiet" onClick={onPress}>
      {withoutMark(label)}
    </button>
  );
}
