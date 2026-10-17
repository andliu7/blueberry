import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { COURSES, DECK_GROUPS, deckCount, deckHref, foldersUnder, isReference, type Deck, type DeckGroupId } from "@/data/types";
import { cardsWord } from "@/lib/reviewProgress";
import { GlassFolder, type ArtPreset, type GlassFile } from "@/components/ui/glass-folder-cards";

/**
 * The Review library as glass folders (owner, 15 Oct 2026): one folder per deck folder
 * in types.ts DECK_GROUPS, in the course's own order, each file in it a deck.
 *
 * Everything on a folder is real data: the title is the folder's title, the count is
 * how many decks and cards it holds, and each file opens its deck. A folder shows four
 * files at most, so a bigger one shows its first three decks and, on top, a fourth file
 * that opens the whole folder page (#/folder/<id>), so no deck is out of reach.
 *
 * No corner key. The original's "+" adds a placeholder file, and nothing in Review
 * adds a deck to a built-in folder; uploads have their own ticket at the foot of the page.
 */

/**
 * Each folder gets its own back, all from the Blueberry presets. None is "lavender":
 * on the lavender page ground that back vanishes and the folder reads as a loose card.
 */
const ART: Record<DeckGroupId, ArtPreset> = {
  lab: "tide",
  reference: "night",
  carbonyls: "iris",
  uploaded: "berry",
};

const FILE_SLOTS = 4;

function deckMeta(d: Deck): string {
  const n = deckCount(d);
  return isReference(d) ? `${n} ${n === 1 ? "row" : "rows"}` : cardsWord(n);
}

export type DeckFolderView = { id: DeckGroupId; title: string; meta: string; files: GlassFile[] };

/** The folders as plain data, in the course's order; exported for the review tests. */
export function buildDeckFolders(decks: Deck[]): DeckFolderView[] {
  return COURSES.flatMap(foldersUnder)
    .map((id) => {
      const group = DECK_GROUPS.find((g) => g.id === id);
      const inFolder = decks.filter((d) => (d.group ?? "lab") === id);
      return { id, group, decks: inFolder };
    })
    .filter((f) => f.group && f.decks.length > 0)
    .map(({ id, group, decks: inFolder }) => {
      const toFile = (d: Deck): GlassFile => ({ name: d.short ?? d.title, meta: deckMeta(d), href: deckHref(d) });
      const files: GlassFile[] =
        inFolder.length <= FILE_SLOTS
          ? inFolder.map(toFile)
          : [...inFolder.slice(0, FILE_SLOTS - 1).map(toFile), { name: `All ${inFolder.length} decks`, meta: "Open folder", href: `#/folder/${id}` }];
      const cards = inFolder.reduce((sum, d) => sum + deckCount(d), 0);
      const unit = inFolder.every(isReference) ? (cards === 1 ? "row" : "rows") : cards === 1 ? "card" : "cards";
      return {
        id,
        title: group!.title,
        meta: `${inFolder.length} ${inFolder.length === 1 ? "deck" : "decks"} · ${cards} ${unit}`,
        files,
      };
    });
}

/** Widest a folder is drawn. */
const MAX_WIDTH = 340;
/**
 * Room kept beside a folder for what overhangs it when open: the fanned files reach
 * about 13px past each side and the folded-down glass flap about 21px (measured at
 * 340px wide; both scale with the folder).
 */
const FAN_OVERHANG = 22;

export function DeckFolders({ decks }: { decks: Deck[] }) {
  const folders = useMemo(() => buildDeckFolders(decks), [decks]);

  // One folder open at a time: the page holds which one, and each folder is
  // "controlled" (it is told whether it is open, like a checkbox given `checked`).
  const [openId, setOpenId] = useState<DeckGroupId | null>(null);

  // The folder width follows the real width of one grid column (not the whole
  // section: with two columns a section-wide folder overflows its cell), so it stays
  // right after a resize or a phone rotation. The section already sits inside the
  // page's 16px gutter. useLayoutEffect measures before the browser paints, so the
  // first frame is already the right size; a ResizeObserver reports every later change.
  const gridRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MAX_WIDTH);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      // The computed track list is in px ("358px" or "356px 356px"); the first is enough.
      const column = parseFloat(getComputedStyle(el).gridTemplateColumns) || el.clientWidth;
      setWidth(Math.min(MAX_WIDTH, Math.floor(column) - 2 * FAN_OVERHANG));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section aria-labelledby="library" className="mt-12">
      <h2 id="library" className="mb-2 text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
        Library
      </h2>
      <p className="mb-6 text-sm text-[var(--site-quiet)]">Open a folder, then pick a deck.</p>
      {/* Three across where three fit (a 340px folder plus its side room is 384px, so
          three need about 1,200px), two from 768px, one below that. Two at 640px would
          squeeze each folder to about 250px. The folder carries its own head room for
          the files standing up out of it, so the rows need only a small gap. */}
      <div ref={gridRef} className="grid grid-cols-1 justify-items-center gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {folders.map((f) => (
          <GlassFolder
            key={f.id}
            label={f.title}
            meta={f.meta}
            tone="light"
            art={ART[f.id]}
            seed={f.id.length * 7 + 3}
            files={f.files}
            action="none"
            appear={false}
            open={openId === f.id}
            // The functional update reads the latest value: when a press on folder B
            // closes folder A, A's close must not undo B's open.
            onOpenChange={(next) => setOpenId((cur) => (next ? f.id : cur === f.id ? null : cur))}
            width={width}
          />
        ))}
      </div>
    </section>
  );
}
