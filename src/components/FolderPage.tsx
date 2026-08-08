import { useCallback, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useDecks } from "@/lib/useDecks";
import {
  DECK_GROUPS,
  deckCount,
  deckHref,
  isReference,
  type DeckGroupId,
} from "@/data/types";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";
import { GlassCard } from "@/components/ui/glass-card";
import { DeckSearch } from "@/components/ui/deck-search";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { UploadedFolderView } from "@/components/UploadedFolderView";
import { BlueberryBot2D } from "@/components/ui/blueberry-bot-2d";
import { FeedbackButton } from "@/components/FeedbackButton";
import { matchedDeckIds, searchDecks } from "@/lib/searchDecks";
import { reviewedCount } from "@/lib/progress";
import { CourseTreeSidebar } from "@/components/ui/course-tree";
import { SiteHeader } from "@/components/ui/site-header";
import { SpotlightCursor } from "@/components/ui/spotlight-cursor";
import { SURFACE, spotlightFor } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";

/**
 * One folder's decks on their own page, at `#/folder/<id>`.
 *
 * The hub still shows everything, so this is not the only way in. It exists
 * because a folder you can open is a more honest folder than a heading, and
 * because it gives each group a shareable URL.
 */
export function FolderPage({ groupId }: { groupId: DeckGroupId }) {
  const reduce = useReducedMotion();
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  // Same shape as the hub: the page owns the query and runs the search, so the
  // box is only a box. See `DeckSearch` for why it stopped doing this itself.
  const [query, setQuery] = useState("");

  const [browseOpen, setBrowseOpen] = useState(false);
  const toggleBrowse = useCallback(() => setBrowseOpen((o) => !o), []);

  // Same rule as the hub's: hand over as the heading starts sliding under the
  // bar rather than once it has fully cleared the screen.
  const headingRef = useRef<HTMLElement>(null);
  const headingInView = useInView(headingRef, {
    amount: "all",
    margin: "-76px 0px 0px 0px",
  });
  const pastHeading = !headingInView;

  const group = DECK_GROUPS.find((g) => g.id === groupId);
  const { decks: allDecks, shelves } = useDecks();
  const all = useMemo(
    () => allDecks.filter((d) => (d.group ?? "lab") === groupId),
    [allDecks, groupId],
  );
  const hits = useMemo(() => searchDecks(all, query), [all, query]);
  const searching = query.trim().length >= 2;
  const matched = useMemo(
    () => (searching ? matchedDeckIds(hits) : null),
    [searching, hits],
  );
  const decks = matched ? all.filter((d) => matched.has(d.id)) : all;

  if (!group) return null;

  const cards = all.reduce((n, d) => n + deckCount(d), 0);

  return (
    // Same surface and same spotlight as the hub: a folder is the hub with one
    // group open, so it should not look like a different site.
    <main
      className="relative min-h-screen pb-8"
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
    >
      <SpotlightCursor className="z-0" config={spotlightFor(isDark)} />
      {/* Same handover as the hub: the folder's name moves up to the bar once
          its own heading has scrolled under it, so you always know which folder
          you are in. A folder page is one category deep, so the whole page is
          the category and the title never has to let go. */}
      <SiteHeader
        category={pastHeading ? group.title : null}
        browse={{ open: browseOpen, onToggle: toggleBrowse }}
        search={{ value: query, onChange: setQuery, hits }}
      />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-6">
        <header ref={headingRef} className="mt-12 mb-10 max-w-2xl">
          <a
            href="#/home"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            All decks
          </a>
          <h1 className="title-face mt-3 text-4xl leading-[1.05] text-slate-900 sm:text-5xl dark:text-stone-100">
            {group.title}
          </h1>
          <p className="playful-face mt-4 text-lg text-slate-500 dark:text-stone-400">
            {group.blurb}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-400 dark:text-stone-500">
            {all.length} {all.length === 1 ? "deck" : "decks"} · {cards} cards
          </p>
        </header>

        <DeckSearch value={query} onChange={setQuery} hits={hits} />

        {/* Uploaded is the one group anyone can rearrange, so it draws itself:
            sub-folders, and the controls to manage them when signed in. The
            other two are fixed and stay a plain grid. */}
        {groupId === "uploaded" ? (
          <UploadedFolderView decks={decks} shelves={shelves} searching={Boolean(matched)} />
        ) : (
        <div className="grid gap-7 sm:grid-cols-2">
          {decks.map((deck, i) => (
            <motion.div
              key={deck.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="h-full"
            >
              <GlassCard
                href={deckHref(deck)}
                title={deck.title}
                description={deck.blurb}
                meta={`${deckCount(deck)} ${isReference(deck) ? "rows" : "cards"}`}
                cta={isReference(deck) ? "Open reference" : "Start studying"}
                from={deck.from}
                to={deck.to}
                motifMarkup={motifMarkup(deck.motif)}
                motifViewBox={MOTIF_VIEWBOX}
                // Reference decks are not rated, so they never show a bar.
                progress={
                  isReference(deck)
                    ? undefined
                    : { reviewed: reviewedCount(deck.id), total: deckCount(deck) }
                }
              />
            </motion.div>
          ))}
        </div>
        )}

        {/* Repeated at the foot as well as the head: after scrolling a folder
            of cards, the link at the top is a long way back up. */}
        <a
          href="#/home"
          className="group mt-12 inline-flex w-fit items-center gap-1.5 self-end text-sm font-bold text-indigo-600 outline-none dark:text-indigo-300"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="relative">
            Back to all decks
            <span
              aria-hidden
              className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
            />
          </span>
        </a>

        {/* The flat bot here rather than the three.js one. A folder page is a
            step on the way to a deck, and it should not pull 600 kB to decorate
            a page nobody stays on. */}
        <div className="mt-14 flex justify-center">
          <BlueberryBot2D
            className="w-full max-w-lg"
            says="Hello! How are you enjoying Blueberry today? Give us some feedback at the bottom right!"
          />
        </div>

        <DeckUploadTicket />
      </div>

      <FeedbackButton />
      <CourseTreeSidebar decks={allDecks} open={browseOpen} onToggle={toggleBrowse} />
    </main>
  );
}

export default FolderPage;
