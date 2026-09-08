/**
 * The charge meter. One capsule, four states, and a badge that replaces it.
 *
 * THE PICTURE IS THE SPEC:
 * `docs/reference/design-goals/blueberry_spec-meter-states_1788291102.png`, top
 * row. Everything below is read off it rather than invented: the stadium
 * capsule with a heavy dark outline, the inset pill of fill that stops short of
 * the outline on every side, the erlenmeyer seated in the right hand end of the
 * capsule holding the same liquid as the fill, the soft green halo on the full
 * state and on no other, the clock standing inside the empty one, and the 3D
 * chip straddling the top edge while charge is going. chargeMeterModel.ts
 * carries the words and the arithmetic; this file is only the drawing.
 *
 * WHY A CAPSULE AND NOT THIRTY PIPS. The first build of this surface drew the
 * meter as thirty units, which was a good idea for a reason that survives (a
 * student can see WHICH end is leaving) and is not what the committed states
 * sheet draws. The sheet is the specification, so the capsule is the object,
 * and the reason the pips existed is kept inside it: the stretch about to be
 * spent is drawn as an OUTLINED ghost beyond the solid fill, which survives
 * greyscale exactly as outline-against-solid did, and the chip over it carries
 * the number. The measurement drives that count `.charge-pip` are named in the
 * hand-back; they are instruments pointed at the superseded design and this
 * round does not edit them.
 *
 * THE HALO IS PAINT, NOT ELEVATION. `.charge-meter-glow` is a flat fill of
 * --progress-glow with a blur on it, which is how the reference draws it: a
 * coloured light around a full meter. It is deliberately not a box-shadow.
 * DESIGN-GOALS makes the soft glow the completed-state language, and the
 * sticker language's rule 3 is about shadows that imply a stack; a centred
 * halo with no offset implies nothing. It is static in every state, so there is
 * nothing for reduced motion to switch off.
 *
 * ICONS ARE SVG, NEVER RASTER, NEVER EMOJI, per DESIGN-GOALS. The flask reuses
 * the silhouette CourseFlask.tsx already ships, so the product has one flask
 * shape and not two that drift; it loses that one's face, because the header's
 * flask is a course badge and this one is a gauge.
 *
 * COLOUR LIVES IN meter.css. Every fill in here names a custom property the
 * stylesheet sets per state, so a literal hex never enters a component and the
 * contrast gate has one place to read.
 */

import type { CSSProperties } from "react";
import type { ChargeMeterModel } from "./chargeMeterModel";
import "./meter.css";

/**
 * The erlenmeyer, from CourseFlask.tsx. One flask silhouette in the product.
 *
 * Repeated as a constant rather than imported because that module's export is a
 * finished picture (glass tint, violet liquid, a face) and this one is a gauge
 * mark that has to take the meter's own liquid; sharing the COMPONENT would
 * mean adding modes to a glyph, and sharing the PATH is what actually keeps the
 * two from drifting apart in shape.
 */
const FLASK_PATH = "M9.4 3.4h5.2v5.1l4.8 9.2a2.5 2.5 0 0 1-2.2 3.7H6.8a2.5 2.5 0 0 1-2.2-3.7l4.8-9.2z";

/**
 * The endcap, and it is a FILLED GLASS OBJECT rather than an outline.
 *
 * Read off the reference at 6x: the flask has a pale glass body, a darker
 * liquid filling its lower half, a dark outline, and a HALO RING in the page's
 * own colour separating it from whatever it is standing on. All four matter.
 * A first pass drew a bare outline and the meter fill ran straight through it,
 * which turned the endcap into a smear the moment the fill reached it; the
 * glass body is what makes the flask an object sitting IN the capsule rather
 * than a decal printed over it.
 *
 * The liquid sits in the wide part only, which is where liquid in a conical
 * flask actually is, so the level reads as a level and not as a percentage of
 * a triangle. The outline is drawn last, so that level is the one horizontal
 * mark in the object.
 *
 * Empty is genuinely empty: no glass, no liquid, the outline alone. The
 * reference draws it that way and it is the honest picture of a dry vessel.
 */
function FlaskEndcap({ dry }: { readonly dry: boolean }) {
  return (
    <svg className="charge-meter-flask" viewBox="0 0 24 24" aria-hidden focusable="false">
      <defs>
        <clipPath id="charge-meter-flask-clip">
          <path d={FLASK_PATH} />
        </clipPath>
      </defs>
      {/* The halo, under everything: a fat stroke in the surface's own colour,
          so the flask keeps its own edge where the fill runs behind it. */}
      <path d={FLASK_PATH} fill="none" stroke="var(--meter-halo)" strokeWidth="3.6" strokeLinejoin="round" />
      {dry ? null : (
        <>
          <path d={FLASK_PATH} fill="var(--meter-glass)" />
          <rect x="0" y="12.4" width="24" height="12" fill="var(--meter-liquid)" clipPath="url(#charge-meter-flask-clip)" />
        </>
      )}
      <path d={FLASK_PATH} fill="none" stroke="var(--meter-ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 3.4h7" fill="none" stroke="var(--meter-ink)" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The clock, and it is the empty state's whole argument.
 *
 * What a student at zero needs is not the amount, which they can see, but that
 * it comes back on its own. The states sheet puts a clock inside the empty
 * capsule and prints "refills over time" beneath it; both are here.
 */
function ClockMark() {
  return (
    <svg className="charge-meter-clock" viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="var(--meter-quiet)" strokeWidth="1.7" />
      <path
        d="M12 6.9V12l3.5 2.4"
        fill="none"
        stroke="var(--meter-quiet)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The open book on the exam badge, drawn as the states sheet draws it: two
 * leaves rising from a centre spine, filled, no page rules.
 */
function BookMark() {
  return (
    <svg className="charge-meter-book" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M12 6.4C10.1 5 8 4.5 5 4.5A1.5 1.5 0 0 0 3.5 6v11A1.5 1.5 0 0 0 5 18.5c3 0 5.1.5 7 1.9V6.4z"
        fill="currentColor"
      />
      <path
        d="M12 6.4c1.9-1.4 4-1.9 7-1.9A1.5 1.5 0 0 1 20.5 6v11a1.5 1.5 0 0 1-1.5 1.5c-3 0-5.1.5-7 1.9V6.4z"
        fill="currentColor"
        opacity="0.72"
      />
    </svg>
  );
}

/**
 * What stands where the meter stood, for the fortnight before the exam.
 *
 * A SPEECH BUBBLE, NOT A BAND, and that is the states sheet's own answer to a
 * problem the first build of this surface found the hard way. Its exam
 * treatment was a full width saturated field with white bold text, sitting two
 * elements above a full width saturated button with white bold text, and at
 * phone scale the two read as two buttons. That finding is kept and answered
 * rather than dropped: this object is half width, pale, ink coloured rather
 * than white, and carries a tail, so nothing about it says "press me".
 *
 * THE TAIL POINTS DOWN, at the slot the meter came out of. It is the mark that
 * makes the badge a remark about the meter rather than a replacement gauge.
 */
function ExamBadge({ model }: { readonly model: ChargeMeterModel }) {
  return (
    <span className="charge-exam-band" role="img" aria-label={model.label}>
      <span className="charge-exam-word">{model.examWord}</span>
      <span className="charge-exam-sep" aria-hidden>
        ·
      </span>
      <span className="charge-exam-status">{model.examStatus}</span>
      <BookMark />
    </span>
  );
}

export interface ChargeMeterProps {
  readonly model: ChargeMeterModel;
  /**
   * True once the spend has been COMMITTED rather than previewed. The ghost
   * beyond the fill retreats to nothing and the chip goes with it, so the drain
   * is the receipt for a press that already happened.
   */
  readonly committed?: boolean;
  /**
   * Draw the line under the meter. On by default, because the only state that
   * has one is the empty state and its line is the promise that mistakes never
   * cost charge, which is the piece of copy this surface exists to carry. A
   * caller that already prints that promise in its own words passes false.
   */
  readonly caption?: boolean;
}

/**
 * The meter. Give it a model; it draws one of four pictures.
 *
 * It holds no state and reads no clock: `chargeMeterModel` is derived by the
 * caller from a snapshot, so a caller that wants the countdown to move
 * re-derives and hands a new model in. Nothing here counts anything down.
 */
export function ChargeMeter({ model, committed = false, caption = true }: ChargeMeterProps) {
  if (model.state === "exam") {
    return (
      <div className="charge-meter" data-meter-state="exam">
        <ExamBadge model={model} />
      </div>
    );
  }

  /**
   * The ghost and the chip STAY MOUNTED through the commit and animate away,
   * which is the whole receipt: unmounting them would blink the spend out of
   * existence between two frames and leave the student with nothing to read.
   * `split` is what tracks the commit, so the fill's right cap rounds back at
   * the same rate the ghost retreats.
   */
  const leaving = model.leaveFraction > 0;
  const split = leaving && !committed;
  const style = {
    "--meter-keep": model.keepFraction.toFixed(4),
    "--meter-leave": (committed ? 0 : model.leaveFraction).toFixed(4),
    "--meter-chip-at": (committed ? model.keepFraction : model.chipAt).toFixed(4),
  } as CSSProperties;

  return (
    <div
      className="charge-meter"
      data-meter-state={model.state}
      /* The FILL'S COLOUR hangs off this, not off the state: green while the
         meter is merely holding charge, violet while charge is going out. See
         `spendingNow` in chargeMeterModel.ts for why. */
      data-meter-flow={model.spendingNow ? "out" : "still"}
      data-meter-committed={committed ? "yes" : "no"}
    >
      <div className="charge-meter-rail" style={style}>
        {model.glow ? <span className="charge-meter-glow" aria-hidden /> : null}
        <span className="charge-meter-track" role="img" aria-label={model.label}>
          {/* THE FILL THAT STAYS. Solid, and rounded on the right only while
              nothing is leaving, so the fill and its ghost read as one pill
              with a seam rather than as two separate lozenges.

              NOT RENDERED AT ZERO. The fill carries a real 1px boundary, and a
              zero width element with a boundary still paints two pixels of it:
              an empty meter grew a coloured stub at its left end, which reads
              as one point of charge that the number beside it says is not
              there. */}
          {model.keepFraction > 0 ? <span className="charge-meter-keep" data-split={split ? "yes" : "no"} /> : null}
          {/* THE STRETCH ABOUT TO GO. Outlined rather than solid, which is the
              one distinction that survives greyscale, and dashed, because a
              solid outline at this size reads as a second full segment. */}
          {leaving ? <span className="charge-meter-leave" /> : null}
          {model.state === "empty" ? <ClockMark /> : null}
          <FlaskEndcap dry={model.flask === "dry"} />
        </span>
        {/* THE CHIP, straddling the top edge over the stretch it names. A 3D
            pressable chip's own shape per BUTTON-MECHANICS.md, face over edge,
            though this one is a marker and not a control: it says what is
            leaving, it is not something to press. */}
        {leaving ? (
          <span className="charge-meter-chip" aria-hidden>
            {model.chipLabel}
          </span>
        ) : null}
      </div>
      {caption && model.caption !== "" ? <p className="charge-meter-caption">{model.caption}</p> : null}
    </div>
  );
}
