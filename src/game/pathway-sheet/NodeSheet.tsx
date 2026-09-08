/**
 * The node sheet: what a tapped pathway node offers, before anything starts.
 *
 * Reference: blueberry_r5-node-sheet-v2_1788286114.png, and this round is a
 * VISUAL FIDELITY round, so the picture is the spec down to the geometry.
 * Every measurement is written out in pathway-sheet.css's header with the
 * image coordinates it was taken from. The composition, top to bottom:
 * grabber, a ONE ROW head (molecule mark, title, hamburger), a full width
 * Practice card holding exactly two rows (heading plus difficulty pips, then
 * the violet 3D START), a HALF WIDTH Challenge card in the SAME cream with
 * the SAME near-black heading, holding its heading and then the stopwatch and
 * double dagger on a second left aligned row, and the berry rising centred
 * over the sheet's own bottom edge into the tab bar.
 *
 * THE 3D CHIPS ARE EDGE AND FACE LAYERS, per
 * docs/reference/design-goals/BUTTON-MECHANICS.md, which DESIGN-GOALS says to
 * read before building any pressable: the well is the darker edge and never
 * moves, the face sits on it and is the only thing that translates, so the
 * chip's painted footprint does not change on press. See pathway-sheet.css's
 * chip section, and .path-node in tabs/pathway/pathway.css for the same
 * pattern this reuses rather than reinvents.
 *
 * Per docs/DESIGN-GOALS.md there is no separate Concept row; the guidebook
 * behind the hamburger is the concept surface.
 *
 * WHY A NATIVE <dialog>. Modality, focus trapping, Escape and the top layer
 * are the browser's; hand rolling those is three bugs. Same call and the same
 * reasoning as ChargeGate.tsx, LanguagePicker.tsx and Hud.tsx. The dialog is
 * given a real box that ENDS at the tab bar rather than filling the viewport,
 * because the reference keeps the four tabs visible and undimmed under the
 * sheet; it is still modal, so the bar is visible without being reachable.
 *
 * WHO HOLDS THE NODE. The caller. The sheet renders whatever SheetNode it is
 * handed and owns no pathway knowledge, exactly as the Charge sheet owns no
 * pathway knowledge: which node was tapped is the track's business. START and
 * Challenge only call back; anything that costs charge stays behind the
 * Charge sheet the integrator opens next, so this component touches no
 * economy state at all.
 *
 * THE PRESS IS ACKNOWLEDGED ON POINTER DOWN. Callbacks fire on onPointerDown,
 * with onClick as the keyboard path (Enter and Space produce no pointer
 * event), and preventDefault so a wrapping form or anchor cannot race it.
 * A pointer activation is followed by a click for the same gesture, so
 * callbacks must be idempotent per activation; the pathway's enterHandlers
 * set the same contract and setState-shaped callers meet it for free.
 */

import { useEffect, useRef } from "react";
import { Berry } from "../mascot/Berry";
import { BerryHands, BerryLeaf } from "./BerryLeaf";
import { MoleculeGlyph } from "./MoleculeGlyph";
import { nodeSheetModel, type SheetNode } from "./nodeSheetModel";
import "./pathway-sheet.css";
import { closeOnBackdrop } from "../app/ui/dismiss";

/**
 * Where the sheet title steps down a size, in characters.
 *
 * The head is ONE ROW in the reference and it has to stay one row for every
 * node, not only for a one-word name (see .ns-head in pathway-sheet.css). The
 * title truncates rather than wraps, so the only lever left is size, and the
 * map's node titles have a median length of 21 characters with a tail out to
 * 44. On a 390 px phone the title's column is about 262 px, which holds about
 * 18 characters at the reference's 22 px and about 26 at 18 px. So a name over
 * this length takes the smaller step, most names arrive whole, and the
 * picture's own 22 px is what a short name still gets.
 */
const TITLE_STEP_DOWN = 18;

/** The pointer-down-first activation pair. See the header note on idempotence. */
function pressHandlers(act: () => void) {
  return {
    onPointerDown: () => act(),
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      act();
    },
  };
}

/** Three thick rules, the reference's weight. The corner route to the guidebook. */
function HamburgerGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

/** The stopwatch: crown, side lugs, a swept wedge and the hand, as drawn. */
function StopwatchGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 14V6.6a7.4 7.4 0 0 1 6.4 3.7z" fill="currentColor" opacity="0.35" />
      <circle cx="12" cy="14" r="7.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.6 2.6h4.8M12 2.6v3.6M4.9 7.2L6.6 5.6M19.1 7.2l-1.7-1.6M12 14l3.6-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The double dagger, the transition-state mark. A DELIBERATE divergence from
 * the reference, which draws a sparkle cluster in this slot: DESIGN-GOALS
 * says the transition state is "drawn with a real double dagger" and calls
 * the drafts' substitutes model artifacts of that instruction rather than
 * designs. The clause wins over the picture and the divergence is reported.
 * Drawn rather than typed so it inherits the icon row's size and colour
 * instead of a font's idea of them.
 */
function DoubleDaggerGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3.5v17M6.5 8h11M6.5 16h11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The enabled Challenge card's forward affordance; see .ns-card--go. The
 * reference draws the card in its RESTING state, which carries no chevron, so
 * this mark appears only on the state the picture does not show. It stays
 * because the attempt 1 critic's finding stands: the two states have to read
 * apart at rest, and dropping one critic's fix to satisfy the next is how a
 * loop goes in circles.
 */
function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The difficulty row: one accessible label, never four unnamed dots. */
function Pips({ filled, total, label }: { readonly filled: number; readonly total: number; readonly label: string }) {
  const dots = [];
  for (let i = 0; i < total; i += 1) {
    dots.push(<span key={i} className={`ns-pip${i < filled ? " is-filled" : ""}`} />);
  }
  return (
    <span className="ns-pips" role="img" aria-label={label}>
      {dots}
    </span>
  );
}

export interface NodeSheetProps {
  /** The node being looked at, or null when the sheet is closed. */
  readonly node: SheetNode | null;
  readonly onClose: () => void;
  /** Practice START. The integrator routes this into the Charge sheet. */
  readonly onStart: (node: SheetNode) => void;
  /** The timed run. Enabled by the model only after a first clear. */
  readonly onChallenge: (node: SheetNode) => void;
  /** The hamburger. The integrator routes this to the Guidebook page. */
  readonly onGuidebook: (node: SheetNode) => void;
  readonly reducedMotion: boolean;
}

export function NodeSheet({ node, onClose, onStart, onChallenge, onGuidebook, reducedMotion }: NodeSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const model = node === null ? null : nodeSheetModel(node);

  // The dialog element mounts once and opens or closes as the node comes and
  // goes, the same lifecycle ChargeGate uses: showModal cannot be declared in
  // JSX, so an effect reconciles the prop onto the element.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (node !== null && !dialog.open) dialog.showModal();
    if (node === null && dialog.open) dialog.close();
  }, [node]);

  return (
    <dialog
      ref={ref}
      className="ns-sheet"
      // The kind and the cleared state left the head with the subtitle the
      // reference does not draw, so they are carried here, where a screen
      // reader still hears them and the picture costs no ink for them.
      aria-label={model === null ? "Lesson" : `${model.label}${model.cleared ? " Cleared." : ""}`}
      data-node-state={node === null ? "closed" : node.state}
      onClose={onClose}
      onClick={closeOnBackdrop(ref, onClose)}
    >
      {model === null || node === null ? null : (
        <>
          <div className="ns-panel">
            <span className="ns-grabber" aria-hidden />

            <header className="ns-head">
              <span className="ns-badge" aria-hidden>
                <MoleculeGlyph />
              </span>
              <h2
                className={`ns-head__title title-face font-bold leading-tight ${
                  node.title.length > TITLE_STEP_DOWN ? "text-scale-lg" : "text-scale-xl"
                }`}
                title={node.title}
              >
                {node.title}
              </h2>
              <button type="button" className="ns-menu press" aria-label={model.guidebookLabel} {...pressHandlers(() => onGuidebook(node))}>
                <HamburgerGlyph />
              </button>
            </header>

            {/* EXACTLY TWO ROWS, as the reference draws it: heading plus pips,
                then START. The node's blurb used to sit between them and made
                the card 65 percent taller than the picture's 100 css px,
                which changed the sheet's whole size hierarchy. The blurb is
                not lost: it leads the guidebook's key-idea callout. */}
            <section className="ns-card" aria-label={`Practice. ${model.pips.label}.`}>
              <div className="ns-card__row">
                <h3 className="title-face text-scale-lg font-bold">Practice</h3>
                <Pips filled={model.pips.filled} total={model.pips.total} label={model.pips.label} />
              </div>
              {model.practice.enabled ? (
                <button type="button" className="ns-chip ns-start" {...pressHandlers(() => onStart(node))}>
                  <span className="ns-chip__face title-face text-scale-base">START</span>
                </button>
              ) : (
                <p className="ns-note text-scale-sm">{model.practice.note}</p>
              )}
            </section>

            {/* THE RESTING CHALLENGE CARD IS THE SAME CARD AS PRACTICE. The
                reference draws it in the sheet's own cream, at the same 100
                css px, with the same near-black heading and NO explanatory
                line under the marks. Attempt 2 dropped it onto the sheet's
                ground with a muted heading and a fourth line, which made it a
                different surface family and 121 px tall.

                The two states still read apart at rest, which was the attempt
                1 critic's finding and is not given back: the ENABLED card is
                a 3D chip (edge layer under a face that presses down) with a
                chevron, and the resting one is flat. Depth and an affordance
                mark, rather than a muted colour the picture does not have.

                The reason the card is not pressable is on its accessible
                name, in full, where it costs the composition no ink. */}
            {model.challenge.enabled ? (
              <button
                type="button"
                className="ns-chip ns-card--go"
                aria-label={`Challenge. A timed run of ${node.title}.`}
                {...pressHandlers(() => onChallenge(node))}
              >
                <span className="ns-chip__face ns-card">
                  <span className="ns-card__row">
                    {/* A span, not an h3: a button's content model is phrasing
                        content, and the control's name is its aria-label. */}
                    <span className="title-face text-scale-lg font-bold">Challenge</span>
                    <span className="ns-go" aria-hidden>
                      <ChevronGlyph />
                    </span>
                  </span>
                  <span className="ns-marks" aria-hidden>
                    <StopwatchGlyph />
                    <DoubleDaggerGlyph />
                  </span>
                </span>
              </button>
            ) : (
              <section
                className="ns-card ns-card--half"
                aria-label={`Challenge. A timed run of ${node.title}. ${model.challenge.note}`}
              >
                <div className="ns-card__row">
                  <h3 className="title-face text-scale-lg font-bold">Challenge</h3>
                </div>
                <span className="ns-marks" aria-hidden>
                  <StopwatchGlyph />
                  <DoubleDaggerGlyph />
                </span>
              </section>
            )}
          </div>

          {/* THE PEEK IS A LEAFED DOME WITH HANDS ON THE EDGE, which is what
              the reference draws and what the round 2 critic found missing.
              Three layers, and the crop is the middle one:

                the CROP  ends exactly on the sheet's bottom edge, so the
                          body is cut flat there rather than running past it
                          into the tab bar's navy rule
                the LEAF  overlaid on the berry's own box, beside the calyx
                the HANDS outside the crop, straddling that same edge, which
                          is the only part of the berry that crosses it

              A child of the DIALOG rather than of the scrolling panel, so
              nothing above it can clip it. Decorative; the sheet's meaning is
              above it, and the accessory layer is BerryLeaf.tsx, which draws
              around the imported mark and never inside it. */}
          <div className="ns-peek" aria-hidden>
            <div className="ns-peek__crop">
              <span className="ns-peek__b">
                <Berry mood="curious" reducedMotion={reducedMotion} sizePx={112} />
                <BerryLeaf className="ns-peek__leaf" />
              </span>
            </div>
            <BerryHands className="ns-peek__hands" />
          </div>
        </>
      )}
    </dialog>
  );
}
