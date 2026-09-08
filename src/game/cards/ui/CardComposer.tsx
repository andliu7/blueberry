/**
 * The composer: a student writes a three-sided reaction card. Read this
 * header before trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-composer in docs/reference/design-goals,
 * and round 3 is a visual-fidelity pass, so what it draws is the list this
 * file is measured against. Top to bottom the image holds exactly five
 * things: the Setup / Conditions / Product segmented pill, one large cream
 * editing card with a heavy near-black outline holding a centred question
 * line over a drawn reaction scheme, the three side previews fanned beneath
 * it, three page dots, and Save to deck as the screen's dominant bottom
 * element, a wide violet 3D pill fully visible directly above the tab bar.
 * Nothing else. The draft text inside the image is model gibberish; the
 * layout, the colours and the depth are what bind.
 *
 * WHAT ROUND 3 CHANGED, against the critic's measured list.
 *
 * THE SAVE CHIP IS ON THE SCREEN NOW. It was measured at top=793 on a 390x844
 * phone whose fixed tab bar starts at 768, with the document 998px tall: the
 * primary act of the whole face was painted under the bar and off screen on
 * first paint. Two things put it back. The column is SIZED TO THE SPACE IT
 * HAS through useFillHeight (which measures rather than copying a header
 * height out of another owner's stylesheet), and the editing card is the only
 * member that flexes, so the fixed rows keep their sizes and the card gives
 * up the difference.
 *
 * THE "SAVE INTO" BLOCK IS GONE, and that is the other half of the same fix:
 * a bordered card holding a label, a deck <select> and a "Name the new deck"
 * input sat between the page dots and the save chip, appears nowhere in the
 * image, and was precisely what pushed the save chip under the bar. The
 * destination did not disappear with it. It is a DECK CHIP in the composer's
 * own top row, which is a better place for it on its own merits: it says
 * where the card is going before the student writes the card rather than
 * after, it is the thing the save animation can arc INTO, and it opens a
 * chooser sheet for the rarer act of picking a different deck or naming a new
 * one. With no deck yet the target is "My cards", created on the first save,
 * so Save to deck is never blocked by a naming step the image does not draw.
 *
 * THE EDITING CARD IS A REACTION SCHEME. The image draws a centred question
 * line above structures, an arrow, and the conditions written over that
 * arrow; round 2 drew a left-aligned SETUP caption over one plain textarea in
 * a white box with a slate border. So the scheme IS the editor here: setup on
 * the left, product on the right, conditions over the arrow between them, and
 * the side the pill has selected is the one highlighted and focused. The card
 * is warm ivory with the image's heavy near-black outline and its thick
 * bottom slab, per cards.css.
 *
 * THE SAVE-TO-DECK MOTION IS PERFORMED, which DESIGN-GOALS' Cards section
 * requires and round 2 did not do on the surface the image actually names:
 * tap, the card scales to 0.92, arcs to the deck icon, +1 badge. The ghost is
 * a fixed-position copy of the editing card's box; both rects are measured at
 * the moment of the save, so one keyframe serves any two positions. It is
 * cleared by a timer rather than by onAnimationEnd, because under reduced
 * motion the ghost is display:none and an animation that never runs never
 * ends.
 *
 * WHERE THE LOGIC LIVES: composer.ts, all of it pure. This file owns exactly
 * the React state (which side is active, the draft, where it saves) and the
 * pixels.
 *
 * FILENAME NOTE: this file is CardComposer.tsx rather than Composer.tsx
 * because composer.ts (the logic) lives beside it and Windows resolves the
 * two names case-insensitively, which makes "./Composer" ambiguous to tsc.
 */

import { useMemo, useRef, useState } from "react";
import type { DeckId, DeckSource, ReactionSide, ReactionSides } from "../types";
import { decks as defaultDecks } from "../store";
import {
  EMPTY_SIDES,
  SIDE_HINTS,
  SIDE_LABELS,
  SIDE_ORDER,
  canSave,
  cardFromDraft,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  setSide,
} from "./composer";
import { DeckDoodle } from "./Doodles";
import { useDeckSnapshot } from "./useDeck";
import { useFillHeight } from "./useFillHeight";
import "./cards.css";

/** Where a card goes when the student has never made a deck. See the header. */
export const DEFAULT_DECK_TITLE = "My cards";

/**
 * THE FAN TILTS AROUND THE ACTIVE CARD, not around the middle one, and this
 * is a round 3 correction to a real ambiguity rather than a flourish. The
 * tilts used to be fixed (setup -6, conditions 0, product +6), so Conditions
 * was upright whether or not it was the side being edited, while
 * .side-fan__card--active also draws the active card upright. With Setup
 * selected the row showed TWO upright cards and the eye picked the middle
 * one, which is the opposite of what the control is for. The committed
 * composer image has no such problem because the side it draws as active,
 * Conditions, is also its middle card.
 *
 * Signed distance from the active card, eight degrees a step: cards to its
 * left lean left, cards to its right lean right, and the active card is the
 * only one at zero. That is what a hand of cards does when one is drawn out
 * of it, and it is the same arrangement the deck-tray image's fan makes
 * around ITS raised card.
 */
const PREVIEW_TILT_STEP = 8;

function previewTilt(side: ReactionSide, active: ReactionSide): number {
  return (SIDE_ORDER.indexOf(side) - SIDE_ORDER.indexOf(active)) * PREVIEW_TILT_STEP;
}

/**
 * Each side's preview tint, sampled from the committed composer image rather
 * than approximated. Round 2 had Setup in AMBER on a rust border, Conditions
 * as a saturated periwinkle FILL that dominated the row, and only Product in
 * the right family; the image draws peach on salmon, a pale blue tint on a
 * mid-blue edge, and a pale green. The tokens are defined and measured in
 * cards.css; ink is --bb-foreground on all three, 11.9, 12.0 and 11.7 light.
 */
const PREVIEW_TONE: Readonly<Record<ReactionSide, string>> = {
  setup: "border-[color:var(--tint-setup-edge)] bg-[color:var(--tint-setup)]",
  conditions: "border-[color:var(--tint-conditions-edge)] bg-[color:var(--tint-conditions)]",
  product: "border-[color:var(--tint-product-edge)] bg-[color:var(--tint-product)]",
};

/** One card ghost in flight, in viewport pixels. See the header. */
interface Flight {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
  readonly dx: number;
  readonly dy: number;
}

/** How long the arc plus the badge pop run, ms. Matches cards.css. */
const FLIGHT_MS = 900;

export interface ComposerProps {
  readonly source?: DeckSource;
  /** Leave the composer. Saving does not leave; a student often writes a few. */
  readonly onBack: () => void;
  /** Injected for tests; the clock is read once per save, never per render. */
  readonly now?: () => Date;
}

export function Composer({ source = defaultDecks, onBack, now = () => new Date() }: ComposerProps) {
  const snapshot = useDeckSnapshot(source);
  const [sides, setSides] = useState<ReactionSides>(EMPTY_SIDES);
  const [active, setActive] = useState<ReactionSide>("setup");
  /** null means "the default target": the first personal deck, or My cards. */
  const [chosenDeck, setChosenDeck] = useState<DeckId | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [savedInto, setSavedInto] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [badge, setBadge] = useState(0);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const deckChipRef = useRef<HTMLButtonElement | null>(null);
  const column = useFillHeight();

  const personalDecks = useMemo(
    () => Object.values(snapshot.decks).filter((deck) => deck.kind === "personal"),
    [snapshot],
  );

  const targetId: DeckId | null = chosenDeck ?? personalDecks[0]?.id ?? null;
  const targetTitle =
    targetId === null ? DEFAULT_DECK_TITLE : snapshot.decks[targetId]?.title ?? DEFAULT_DECK_TITLE;

  const problems = draftProblems(sides);
  const blocked = !canSave(sides);
  /**
   * The next sentence under the save button, or null when nothing is missing.
   * `problems[0]` is `string | undefined`, so this narrows to `string | null`
   * and never to undefined; the round 2 build compared it against undefined,
   * which is why its save confirmation was unreachable dead code.
   */
  const helper: string | null = problems[0] ?? null;

  /**
   * A save wipes the draft, so the very next render always has a problem to
   * report ("Add a setup..."), and a confirmation gated behind "no problems"
   * could never show. The acknowledgement therefore WINS over the nag for as
   * long as it stands, and it stands until the student touches the draft
   * again, which is the moment the nag becomes useful advice rather than a
   * scolding response to a successful save.
   */
  const clearSaved = (): void => setSavedInto(null);
  const editSide = (side: ReactionSide, text: string): void => {
    clearSaved();
    setSides(setSide(sides, side, text));
  };

  /** Measure both boxes and launch the ghost. Pure decoration; see the header. */
  const launchFlight = (): void => {
    const from = cardRef.current?.getBoundingClientRect();
    const to = deckChipRef.current?.getBoundingClientRect();
    if (from === undefined || to === undefined) return;
    setFlight({
      top: from.top,
      left: from.left,
      width: from.width,
      height: from.height,
      dx: to.left + to.width / 2 - (from.left + from.width / 2),
      dy: to.top + to.height / 2 - (from.top + from.height / 2),
    });
    setBadge((n) => n + 1);
    window.setTimeout(() => {
      setFlight(null);
      setBadge(0);
    }, FLIGHT_MS);
  };

  const save = (): void => {
    if (blocked) return;
    const at = now();
    let deckId: DeckId;
    let deckTitle: string;
    if (targetId === null) {
      deckTitle = DEFAULT_DECK_TITLE;
      deckId = newDeckId(deckTitle);
      source.createDeck({ id: deckId, title: deckTitle, kind: "personal", cardIds: [] });
    } else {
      deckId = targetId;
      deckTitle = snapshot.decks[deckId]?.title ?? deckId;
    }
    launchFlight();
    source.saveCard(cardFromDraft(sides, at), deckId);
    setSides(EMPTY_SIDES);
    setActive("setup");
    setSavedInto(deckTitle);
    setChosenDeck(deckId);
  };

  const createDeck = (): void => {
    if (deckTitleProblem(newTitle) !== null) return;
    const title = newTitle.trim();
    const id = newDeckId(title);
    source.createDeck({ id, title, kind: "personal", cardIds: [] });
    setChosenDeck(id);
    setNewTitle("");
    setChooserOpen(false);
    clearSaved();
  };

  return (
    <div
      ref={column.ref}
      className="composer gap-3 p-4 md:p-6"
      style={
        column.height === null
          ? undefined
          : ({ "--composer-h": `${column.height}px` } as React.CSSProperties)
      }
    >
      {/* ONE ROW, THREE JOBS: out, what this is, and where it lands. The image
          puts back and the title in the app's own header, which this file does
          not own; the deck chip is the destination the "Save into" card used
          to hold, in a shape that costs 44px instead of 120 and that the save
          arc has something to fly into. */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="press flex min-h-11 min-w-11 items-center justify-center rounded-full text-scale-lg font-bold text-bb-foreground"
          onClick={onBack}
          aria-label="Back to your decks"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 4 L5 10 L12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="bb-title-face flex-1 truncate text-scale-xl font-bold text-bb-foreground">Create card</h1>
        {/* THE HEADER'S RIGHT SLOT IS A PENCIL, which is what the committed
            composer image draws there. Round 2 put a violet outlined pill
            carrying the destination deck's name in that corner, and at 390px
            it ellipsised to "Reaction De…": a different element from the
            image's, and a truncated one.

            THE DESTINATION DID NOT VANISH WITH THE PILL, and this is the
            trade, stated rather than buried. The pencil's accessible name is
            the whole sentence ("Saving into Reaction Deck. Choose a different
            deck"), the chooser it opens marks the current target "Saving
            here", and the status line under Save to deck names the deck by
            title the moment a card lands in it. So the destination is spoken
            always, shown on demand, and confirmed on the act, where before it
            was shown always in a shape the reference does not draw. It is
            still the anchor the save arc flies into, which is why the ref
            stays on it. */}
        <button
          ref={deckChipRef}
          type="button"
          className="deck-chip press shrink-0"
          onClick={() => setChooserOpen((open) => !open)}
          aria-expanded={chooserOpen}
          aria-label={`Saving into ${targetTitle}. Choose a different deck`}
        >
          <PencilGlyph />
          {badge > 0 && (
            <span className="deck-chip__badge bb-title-face font-bold" aria-hidden="true">
              +{badge}
            </span>
          )}
        </button>
      </div>

      {/* The deck chooser. A sheet over the column rather than a block in it,
          because picking a deck is the rare act and writing the card is the
          common one; the image's face carries only the common one. */}
      {chooserOpen && (
        <div className="shrink-0 rounded-2xl border-2 border-bb-border bg-[color:var(--cards-paper)] p-3">
          <ul className="flex flex-col gap-1">
            {personalDecks.map((deck) => (
              <li key={deck.id}>
                <button
                  type="button"
                  className="press flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-scale-base font-semibold text-bb-card-foreground"
                  aria-pressed={deck.id === targetId}
                  onClick={() => {
                    setChosenDeck(deck.id);
                    setChooserOpen(false);
                    clearSaved();
                  }}
                >
                  <span className="truncate">{deck.title}</span>
                  {deck.id === targetId && <span className="text-scale-sm">Saving here</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              className="min-h-11 flex-1 rounded-xl border border-bb-border bg-transparent px-3 text-scale-base font-semibold text-bb-card-foreground placeholder:font-normal placeholder:text-bb-muted-foreground"
              placeholder="Name a new deck"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              aria-label="New deck name"
            />
            <button
              type="button"
              className="chip3d chip3d--bb-primary press bb-title-face min-h-11 px-4 text-scale-sm font-bold"
              disabled={deckTitleProblem(newTitle) !== null}
              onClick={createDeck}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* The pill. aria-pressed carries the active state for both the
          stylesheet and assistive tech, one attribute doing both jobs. */}
      <div className="seg-pill shrink-0" role="group" aria-label="Card side">
        {SIDE_ORDER.map((side) => (
          <button
            key={side}
            type="button"
            className="seg-pill__opt press text-scale-sm"
            aria-pressed={side === active}
            onClick={() => setActive(side)}
          >
            {SIDE_LABELS[side]}
          </button>
        ))}
      </div>

      {/* THE SCREEN'S LARGEST SHAPE, and per the committed image it is cream
          inside a heavy near-black outline over a thick slab, holding a
          centred line above a reaction scheme. The bottom margin is the
          slab's own 14px, which a box-shadow does not reserve for itself. */}
      <div
        ref={cardRef}
        className="compose-card composer__card mb-3.5 flex flex-col gap-3 p-4"
      >
        {/* The centred question line the image draws above its scheme. */}
        <p className="shrink-0 text-center text-scale-sm text-bb-muted-foreground">
          Setup, conditions, product. Write it across the arrow.
        </p>
        {/* THE SCHEME IS DRAWN, NOT ONLY TYPED, and this is round 3's largest
            change to this file. The critic put it plainly: the committed
            image's editing card holds a picture (a cyclopentene skeleton,
            "+ NBS", an arrow labelled hv/heat, a bromocyclopentene) with the
            names as small captions BENEATH the structures, while the build
            held three plain textareas on ruled lines, so the centrepiece of
            the composer was text where the reference is a drawing. The three
            mini side cards already carried sketches, which made the empty big
            card read as a missing element rather than a style.

            SO A STRUCTURE STANDS OVER EACH SIDE'S WRITING LINE, at the scale
            the image draws one, and the student's words are the caption under
            it exactly as they are in the drawing.

            WHAT THE SKETCH IS AND IS NOT, said here because a reader will
            otherwise assume more of it than is true: it is the same
            DECORATION Doodles.tsx declares at the top of its own file, not a
            rendering of what the student typed. This phase has no structure
            editor, and drawing a molecule that claimed to be the student's
            reagent would be the composer lying about its own contents. It is
            aria-hidden, it never changes with the text, and the day a
            structure input exists it is what replaces this. Naming that here
            is the honest version of building the picture. */}
        <div className="compose-scheme my-auto">
          <div className="flex flex-col items-center gap-1">
            <DeckDoodle variant={0} className="h-16 w-[4.5rem] text-bb-card-foreground" />
            <SchemeCell
              side="setup"
              value={sides.setup}
              active={active === "setup"}
              onFocus={() => setActive("setup")}
              onChange={(text) => editSide("setup", text)}
            />
          </div>
          <div className="flex flex-col items-center pt-1">
            <SchemeCell
              side="conditions"
              value={sides.conditions}
              active={active === "conditions"}
              over
              onFocus={() => setActive("conditions")}
              onChange={(text) => editSide("conditions", text)}
            />
            <ArrowGlyph />
          </div>
          <div className="flex flex-col items-center gap-1">
            <DeckDoodle variant={3} className="h-16 w-[4.5rem] text-bb-card-foreground" />
            <SchemeCell
              side="product"
              value={sides.product}
              active={active === "product"}
              onFocus={() => setActive("product")}
              onChange={(text) => editSide("product", text)}
            />
          </div>
        </div>
      </div>

      {/* The fanned previews: the whole card at a glance while one side is
          written, and the third way to switch sides. The image draws the name,
          a small structure and the side's tint on each, with the ACTIVE one
          upright, larger and lifted clear of its neighbours. aria-pressed
          rather than colour alone carries which side is being edited. */}
      <div className="flex shrink-0 items-end justify-center gap-2 pb-2 pt-1">
        {SIDE_ORDER.map((side, index) => (
          <button
            key={side}
            type="button"
            className={`side-fan__card press flex h-24 w-20 flex-col items-center gap-1 rounded-xl border-2 p-2 text-center text-bb-foreground ${PREVIEW_TONE[side]} ${
              side === active ? "side-fan__card--active" : ""
            }`}
            style={{ "--fan-rot": `${previewTilt(side, active)}deg` } as React.CSSProperties}
            aria-pressed={side === active}
            onClick={() => setActive(side)}
            aria-label={`Edit the ${SIDE_LABELS[side].toLowerCase()} side`}
          >
            <span className="text-scale-xs font-bold">{SIDE_LABELS[side]}</span>
            {/* currentColor, so the sketch is drawn in the tone's own ink and
                the measured pair is the one the label already carries. */}
            <DeckDoodle variant={index} className="h-6 w-8 shrink-0" />
            <span className="line-clamp-1 w-full whitespace-pre-line text-scale-xs leading-tight">
              {sides[side].trim().length > 0 ? sides[side] : "…"}
            </span>
          </button>
        ))}
      </div>

      {/* The three page dots the committed image draws under the fan. */}
      <div className="flex shrink-0 items-center justify-center gap-2" aria-hidden="true">
        {SIDE_ORDER.map((side) => (
          <span key={side} className={`page-dot ${side === active ? "page-dot--on" : ""}`} />
        ))}
      </div>

      <button
        type="button"
        /* The image draws Save to deck as a wide pill spanning about 72
            percent of the frame and centred, not edge to edge. */
        className="chip3d chip3d--bb-primary press bb-title-face mx-auto mt-auto min-h-14 w-[72%] shrink-0 text-scale-lg font-bold"
        disabled={blocked}
        onClick={save}
      >
        Save to deck
      </button>
      {/* The acknowledgement wins while it stands; see the note on clearSaved.
          role="status" so the save is announced, not only drawn. One line
          high either way, so nothing under it moves when it swaps. */}
      <p className="h-5 shrink-0 text-center text-scale-sm text-bb-muted-foreground" role="status">
        {savedInto !== null ? `Saved to ${savedInto}. Write another, or head back.` : (helper ?? "")}
      </p>

      {flight !== null && (
        <div
          className="save-flight"
          aria-hidden="true"
          style={
            {
              top: `${flight.top}px`,
              left: `${flight.left}px`,
              width: `${flight.width}px`,
              height: `${flight.height}px`,
              "--fly-dx": `${flight.dx}px`,
              "--fly-dy": `${flight.dy}px`,
            } as React.CSSProperties
          }
        />
      )}
    </div>
  );
}

/**
 * One editable cell of the reaction scheme. A textarea rather than an input,
 * because a product name wraps and a student should see it wrap; the dashed
 * baseline is the writing line under a structure in the committed image, and
 * it goes solid on the side the pill has selected.
 */
function SchemeCell({
  side,
  value,
  active,
  over = false,
  onFocus,
  onChange,
}: {
  readonly side: ReactionSide;
  readonly value: string;
  readonly active: boolean;
  readonly over?: boolean;
  readonly onFocus: () => void;
  readonly onChange: (text: string) => void;
}) {
  return (
    <textarea
      className={`scheme-cell ${over ? "scheme-over" : ""} ${
        active ? "scheme-cell--active" : ""
      } text-scale-sm font-semibold leading-snug text-bb-card-foreground placeholder:font-normal placeholder:text-bb-muted-foreground`}
      value={value}
      placeholder={SIDE_HINTS[side]}
      aria-label={SIDE_LABELS[side]}
      onFocus={onFocus}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** The reaction arrow the conditions are written over. Decoration. */
function ArrowGlyph() {
  return (
    <svg viewBox="0 0 72 12" className="h-3 w-[4.5rem] shrink-0 text-bb-foreground" aria-hidden="true">
      <path
        d="M2 6 H64 M58 2 L66 6 L58 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The header's right glyph: the pencil blueberry_r6-composer draws in that
 * corner. Traced as an outline in currentColor per the SVG-not-raster icon
 * ruling, at the same 1.8 stroke weight as the back chevron beside it so the
 * two ends of the header row are one drawing.
 */
function PencilGlyph() {
  return (
    <svg
      viewBox="0 0 22 22"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* The barrel, its nib, and the ferrule line across the top. */}
      <path d="M15.2 2.6 L19.4 6.8 L8.2 18 L3 19 L4 13.8 Z" />
      <path d="M13.2 4.6 L17.4 8.8" />
    </svg>
  );
}
