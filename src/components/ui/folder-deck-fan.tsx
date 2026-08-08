import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cardArt } from "@/data/testimonialArt";
import { deckHref, deckCount, isReference, type Deck } from "@/data/types";
import { DeckPreviewLightbox } from "@/components/ui/deck-preview-lightbox";

/**
 * The decks inside a folder, tucked into a folder that opens.
 *
 * The cards used to sit permanently fanned across the folder card, which meant
 * every folder on the hub was shouting four pieces of artwork at once and the
 * page read as a wall of cards rather than as a shelf of folders. So the resting
 * state is a shut folder, and the fan is what happens when you reach for it.
 *
 * **Three layers, each on its own rotation.** Back panel and tab behind, cards in
 * the middle, front flap and its shine in front. That ordering is the whole
 * effect: the cards rise from *between* the front and back of the folder, which
 * is what a folder opening actually looks like. A single flat shape with cards
 * sliding out from behind it reads as a card with a picture on it.
 *
 * Adapted from a supplied `3d-folder` component. Kept: the layer construction,
 * the overshooting spring, the tab, the shine. Dropped: its hardcoded three
 * cards, and its colours, which came from shadcn CSS variables this project has
 * never defined and would have rendered as nothing (see `info-card` for the same
 * trap found the hard way). The folder is tinted with the folder's own gradient
 * instead, so each one matches the card it sits on and no new tokens exist.
 */

/**
 * The folder's proportions, written as a lip rather than as two heights.
 *
 * `LIP` is how much of the back panel shows above the front flap, and it is the
 * one measurement that must not move: it is the apparent thickness of the folder,
 * and growing it with the rest turns a folder into a wallet. So the flap is
 * derived from the height rather than set beside it, and making the folder taller
 * cannot accidentally make it look deeper.
 */
const FOLDER_H = 124;
const LIP = 34;
const FLAP_H = FOLDER_H - LIP;

/**
 * Where a tucked card sits, derived from the flap rather than guessed.
 *
 * A shut folder has to show there is something in it, so the card tops clear the
 * flap by `PEEK` and no more. **The card is lifted to reach that line, not scaled
 * up to it.** Scaling was the first attempt and it was wrong: a card big enough
 * to show above a tall flap is a card wider than the folder holding it, so the
 * folder reads as a badge pinned behind a stack rather than as something the
 * cards are inside.
 */
const CARD_H = 150;
const TUCK_SCALE = 0.46;
const PEEK = 10;
const TUCK_Y = FLAP_H + PEEK - CARD_H * TUCK_SCALE;

const SHUT_H = FOLDER_H + 26;
const OPEN_H = FOLDER_H + 90;

/** The supplied easing. It overshoots, which is what makes the flap feel hinged. */
const SPRING = "500ms cubic-bezier(0.34, 1.56, 0.64, 1)";

/**
 * The folder opens, and *then* the cards come up.
 *
 * Run together they read as one blur of movement and the cards appear to pass
 * through the lid. Held apart by a beat, the lid tips and the cards follow it out,
 * which is the order the thing actually happens in. Closing reverses: the cards
 * drop back in first and the flap shuts after them.
 */
const CARD_DELAY = 0.2;
const FLAP_CLOSE_DELAY = "160ms";

/**
 * Whether this device has a real pointer.
 *
 * The folder opens on hover, and on a touch screen that is an interaction that
 * can never happen, so touch gets tap-to-toggle instead. Checked rather than
 * assumed from width: a touch laptop has both.
 */
function useHasHover() {
  const [hasHover, setHasHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    setHasHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return hasHover;
}

/**
 * The folder itself, drawn rather than imported.
 *
 * `transformStyle: "flat"` on the wrapper is load-bearing and not obvious. Every
 * folder card on the hub sits inside `TiltCard`, which sets
 * `transform-style: preserve-3d`. Inside a preserved 3D context, transformed
 * children are painted by their computed depth rather than by `z-index`, so the
 * front flap and the back panel — which differ only by a rotation — would sort
 * against each other unpredictably and the cards would surface through the lid.
 * Declaring a flat context here puts `z-index` back in charge.
 */
/**
 * The folder's own colours, which are deliberately not the deck's.
 *
 * It was tinted with each folder's gradient so it matched the card it sat on.
 * That reads as one flat shape: a violet folder on a violet card has nothing to
 * catch an edge against, and the cards inside it are also washes of the same
 * ramp. A neutral graphite folder is the thing every one of those colours is
 * *in*, so the folder reads as an object and the deck art reads as its contents.
 */
const SHELL = {
  tab: "#3f3f46",
  back: "#27272a",
  frontFrom: "#52525b",
  frontTo: "#3f3f46",
};

function FolderShell({
  open,
  reduce,
}: {
  open: boolean;
  reduce: boolean | null;
}) {
  const tilt = (deg: number) => (reduce || !open ? "rotateX(0deg)" : `rotateX(${deg}deg)`);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
      style={{ height: FOLDER_H, perspective: 800, transformStyle: "flat" }}
    >
      <div className="relative" style={{ width: 168, height: FOLDER_H }}>
        {/* Tab, behind everything and peeking over the top edge. */}
        <div
          className="absolute h-4 w-12 rounded-t-md"
          style={{
            top: -12,
            left: 16,
            background: SHELL.tab,
            transformOrigin: "bottom center",
            transform: reduce || !open ? "rotateX(0deg)" : "rotateX(-25deg) translateY(-2px)",
            transition: `transform ${SPRING}`,
            zIndex: 10,
          }}
        />

        {/* Back panel: the pocket the cards sit in. */}
        <div
          className="absolute inset-x-0 bottom-0 rounded-lg shadow-md"
          style={{
            height: FOLDER_H,
            background: SHELL.back,
            transformOrigin: "bottom center",
            transform: tilt(-15),
            transition: `transform ${SPRING}`,
            zIndex: 10,
          }}
        />

        {/* Front flap, which the cards come out from behind. */}
        <div
          className="absolute inset-x-0 bottom-0 rounded-lg shadow-lg"
          style={{
            height: FLAP_H,
            background: `linear-gradient(160deg, ${SHELL.frontFrom}, ${SHELL.frontTo})`,
            transformOrigin: "bottom center",
            transform: reduce || !open ? "rotateX(0deg)" : "rotateX(25deg) translateY(8px)",
            transition: `transform ${SPRING}`,
            transitionDelay: open ? "0ms" : FLAP_CLOSE_DELAY,
            zIndex: 30,
          }}
        />

        {/* Shine on the flap. Rides exactly the same transform, so it stays stuck
            to the surface instead of sliding across it. */}
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-lg"
          style={{
            height: FLAP_H,
            background: "linear-gradient(135deg, rgba(255,255,255,0.34) 0%, transparent 55%)",
            transformOrigin: "bottom center",
            transform: reduce || !open ? "rotateX(0deg)" : "rotateX(25deg) translateY(8px)",
            transition: `transform ${SPRING}`,
            transitionDelay: open ? "0ms" : FLAP_CLOSE_DELAY,
            zIndex: 31,
          }}
        />
      </div>
    </div>
  );
}

export function FolderDeckFan({
  decks,
  max = 4,
}: {
  decks: Deck[];
  max?: number;
}) {
  const reduce = useReducedMotion();
  const hasHover = useHasHover();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  /** Which deck the preview is showing, and the card it should grow out of. */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const shown = decks.slice(0, max);
  const n = shown.length;
  const hiddenCount = decks.length - n;

  // Spread from the middle so the hand stays centred whatever its size. The
  // supplied component hardcoded three cards and three literal rotations; this
  // has to cope with a folder of nine.
  const spread = (i: number) => i - (n - 1) / 2;

  const openPreview = (i: number) => {
    const el = cardRefs.current[i];
    if (el) setSourceRect(el.getBoundingClientRect());
    setPreviewIndex(i);
  };

  return (
    <>
      <motion.div
        // Scaled down below `sm`: the spread is fixed in pixels, so at a phone
        // width the outer cards would otherwise run past the edge of the folder.
        className="relative mt-3 w-full origin-top scale-[0.72] sm:scale-100"
        // The band is only as tall as it needs to be. At a fixed height a shut
        // folder sat under a third of a card's worth of nothing, which made every
        // folder on the hub look like it had failed to load something.
        initial={false}
        animate={{ height: open ? OPEN_H : SHUT_H }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        onMouseEnter={() => hasHover && setOpen(true)}
        onMouseLeave={() => {
          setHovered(null);
          // Stays open while the preview is up: the fan is what the preview grew
          // out of, and tucking it away underneath would strand it.
          if (hasHover && previewIndex === null) setOpen(false);
        }}
      >
        <FolderShell open={open} reduce={reduce} />

        {/*
          The folder is also a control, for touch and for the keyboard.

          A real button rather than a click handler on the shell, because the
          folder card above this checks `closest("a, button")` before treating a
          click as "go to the folder page" — so this being a button is what stops
          opening the folder from also navigating away from it.

          z-index 1 puts it between the back panel and the front flap, which is
          where the shut cards are, so an open card is always above it and takes
          its own hover.
        */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          onFocus={() => setOpen(true)}
          aria-expanded={open}
          aria-label={
            open
              ? "Close the folder"
              : `Open the folder: ${decks.length} ${decks.length === 1 ? "deck" : "decks"} inside`
          }
          className="absolute inset-x-0 bottom-0 mx-auto w-[168px] cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          style={{ height: FOLDER_H, zIndex: 1 }}
        />

        {shown.map((deck, i) => {
          const off = spread(i);
          const active = open && hovered === i;
          const dimmed = open && hovered !== null && !active;

          return (
            // Centred by flexbox rather than by subtracting half a card width.
            //
            // Anchored to the bottom of the band, so the shut state can scale the
            // cards down into the folder without working out where their bottom
            // edge ended up: at `origin-bottom` a scale leaves the bottom put.
            //
            // These wrappers are the full width of the fan and all sit in the
            // same place, stacked. Left alone they are the hit target across that
            // whole band, and since the last one in the DOM wins, the first card
            // would be buried under three invisible sheets. So the wrapper takes
            // no pointer events and the card takes them back. The z-index lives
            // here too, so paint order and hit order agree.
            <div
              key={deck.id}
              className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center"
              // Shut, the cards sit at 1, behind the flap at 30. Open, they come
              // out over it.
              style={{ zIndex: open ? (active ? 40 : 20 + i) : 1 }}
            >
              <motion.a
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                href={deckHref(deck)}
                aria-label={`${deck.title}, ${deckCount(deck)} ${isReference(deck) ? "rows" : "cards"}`}
                // Out of the tab order while shut: they are behind the flap and
                // invisible, and tabbing onto one would scroll to a card nobody
                // can see.
                tabIndex={open ? 0 : -1}
                aria-hidden={!open}
                onMouseEnter={() => open && setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                onClick={(e) => {
                  // The href is the fallback that keeps this a real link for
                  // middle-click, ctrl-click and screen readers. A plain click
                  // gets the preview instead.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault();
                  openPreview(i);
                }}
                className={[
                  "block origin-bottom rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white",
                  open ? "pointer-events-auto" : "pointer-events-none",
                ].join(" ")}
                initial={false}
                animate={
                  !open
                    ? // Tucked: shrunk into the folder, squared up, with just
                      // enough of the top edge over the flap to say there is
                      // something in there.
                      { x: off * 13, y: -TUCK_Y, rotate: off * 2, scale: TUCK_SCALE }
                    : reduce
                      ? { x: off * 56, y: -22, rotate: 0, scale: 1 }
                      : {
                          // Hovering opens the hand further: the active card
                          // rises and straightens, and its neighbours lean out of
                          // the way instead of staying buried under it.
                          //
                          // 56 rather than 62 at rest: four cards spread at 62
                          // reach 149px from the middle, and the folder card is
                          // only about 148px wide either side of it, so the outer
                          // cards were landing on the folder next door. The
                          // active card still swings wider, because that one is
                          // under the cursor and meant to break the row.
                          x: off * (active ? 72 : 56),
                          y: (active ? -38 : -22) + Math.abs(off) * 5,
                          rotate: active ? 0 : off * 7,
                          scale: active ? 1.08 : dimmed ? 0.96 : 1,
                        }
                }
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 26,
                  // Waits for the lid on the way out, and leads it on the way
                  // back in. Not applied while the folder is already open, or
                  // hovering one card would stall the others behind a delay.
                  delay: open && hovered === null ? CARD_DELAY : 0,
                }}
              >
                <img
                  src={cardArt(deck.motif, deck.from, deck.to, deck.art)}
                  alt=""
                  className="h-[150px] w-auto rounded-lg shadow-lg transition-[filter,opacity] duration-200"
                  style={{ opacity: dimmed ? 0.55 : 1 }}
                  draggable={false}
                />
              </motion.a>
            </div>
          );
        })}

        {/* No count printed on the folder. It sat over the tucked card tops,
            where it read as a label on the cards rather than on the folder, and
            the card's own footer already prints "N decks · N cards" directly
            underneath — so this was the same number twice on one card. */}

        {/* Open, the caption names whichever card is under the cursor. Absolutely
            positioned and pointer-events-none so it can never steal the hover it
            describes, which would make it flicker. */}
        {open && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center"
            style={{ zIndex: 50 }}
          >
            <motion.span
              initial={false}
              animate={{ opacity: hovered === null ? 0 : 1, y: hovered === null ? 4 : 0 }}
              transition={{ duration: 0.18 }}
              className="max-w-full truncate rounded-full bg-slate-900/85 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur-sm dark:bg-stone-100/90 dark:text-stone-900"
            >
              {hovered !== null ? (shown[hovered]!.short ?? shown[hovered]!.title) : " "}
            </motion.span>
          </div>
        )}

        {/* Said only once the folder is open, because until then the count on the
            flap already covers it. */}
        {open && hiddenCount > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
            style={{ zIndex: 50 }}
          >
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-semibold text-white/85 backdrop-blur-sm">
              +{hiddenCount} more inside
            </span>
          </div>
        )}
      </motion.div>

      {/* Every deck in the folder, not just the fanned ones, so the arrows can
          walk past the four on show into the rest. */}
      <DeckPreviewLightbox
        decks={decks}
        currentIndex={previewIndex ?? 0}
        isOpen={previewIndex !== null}
        onClose={() => {
          setPreviewIndex(null);
          setSourceRect(null);
        }}
        sourceRect={sourceRect}
        onNavigate={(i) => {
          setPreviewIndex(i);
          // Re-aim at the card now being shown, when it is one of the fanned
          // ones, so closing collapses back to the right place.
          const el = cardRefs.current[i];
          if (el) setSourceRect(el.getBoundingClientRect());
        }}
      />
    </>
  );
}

export default FolderDeckFan;
