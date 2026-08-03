import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cardArt } from "@/data/testimonialArt";
import { deckHref, deckCount, isReference, type Deck } from "@/data/types";

/**
 * The decks inside a folder, drawn as a fanned hand of cards.
 *
 * Each card is a link straight into its deck, so the fan is the navigation
 * rather than a picture of it. That is what let the list of deck-name chips
 * underneath go away.
 *
 * The background stays transparent on purpose: the folder card behind it should
 * still read through the gaps between the cards.
 */
export function FolderDeckFan({ decks, max = 4 }: { decks: Deck[]; max?: number }) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = decks.slice(0, max);
  const n = shown.length;

  // Spread from the middle so the hand stays centred whatever its size.
  const spread = (i: number) => i - (n - 1) / 2;

  return (
    <div
      className="relative mt-3 h-[132px] w-full"
      onMouseLeave={() => setHovered(null)}
    >
      {shown.map((deck, i) => {
        const off = spread(i);
        const active = hovered === i;
        const dimmed = hovered !== null && !active;

        return (
          <motion.a
            key={deck.id}
            href={deckHref(deck)}
            aria-label={`${deck.title}, ${deckCount(deck)} ${isReference(deck) ? "rows" : "cards"}`}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            className="absolute top-0 left-1/2 block origin-bottom rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            style={{ zIndex: active ? 20 : i }}
            initial={false}
            animate={
              reduce
                ? { x: off * 46 - 34, y: 0, rotate: 0 }
                : {
                    // Hovering opens the hand: the active card rises and
                    // straightens, and its neighbours lean further out of the
                    // way instead of staying buried under it.
                    x: off * (active ? 52 : 40) - 34,
                    y: active ? -12 : Math.abs(off) * 4,
                    rotate: active ? 0 : off * 7,
                    scale: active ? 1.08 : dimmed ? 0.96 : 1,
                  }
            }
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            <img
              src={cardArt(deck.motif, deck.from, deck.to)}
              alt=""
              className="h-[112px] w-auto rounded-lg shadow-lg transition-[filter,opacity] duration-200"
              style={{ opacity: dimmed ? 0.55 : 1 }}
              draggable={false}
            />
          </motion.a>
        );
      })}

      {/* Caption for whichever card is under the cursor. Absolutely positioned
          and pointer-events-none so it can never steal the hover it describes,
          which would make it flicker. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <motion.span
          initial={false}
          animate={{ opacity: hovered === null ? 0 : 1, y: hovered === null ? 4 : 0 }}
          transition={{ duration: 0.18 }}
          className="max-w-full truncate rounded-full bg-slate-900/85 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur-sm dark:bg-stone-100/90 dark:text-stone-900"
        >
          {hovered !== null ? (shown[hovered]!.short ?? shown[hovered]!.title) : " "}
        </motion.span>
      </div>
    </div>
  );
}

export default FolderDeckFan;
