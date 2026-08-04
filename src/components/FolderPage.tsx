import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { DECKS } from "@/data/decks";
import {
  DECK_GROUPS,
  deckCount,
  deckHref,
  isReference,
  type DeckGroupId,
} from "@/data/types";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GlassCard } from "@/components/ui/glass-card";
import { DeckSearch } from "@/components/ui/deck-search";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { FeedbackButton } from "@/components/FeedbackButton";
import { SiteActions } from "@/components/SiteActions";
import { matchedDeckIds, type SearchHit } from "@/lib/searchDecks";
import { reviewedCount } from "@/lib/progress";
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
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const handleResults = useCallback((next: SearchHit[] | null) => setHits(next), []);
  const matched = useMemo(() => (hits ? matchedDeckIds(hits) : null), [hits]);

  const group = DECK_GROUPS.find((g) => g.id === groupId);
  const all = useMemo(() => DECKS.filter((d) => (d.group ?? "lab") === groupId), [groupId]);
  const decks = matched ? all.filter((d) => matched.has(d.id)) : all;

  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home" },
    ...all.map((d) => ({ id: d.id, label: d.short ?? d.title, href: deckHref(d) })),
  ];

  if (!group) return null;

  const cards = all.reduce((n, d) => n + deckCount(d), 0);

  return (
    // Same surface and same spotlight as the hub: a folder is the hub with one
    // group open, so it should not look like a different site.
    <main
      className="relative min-h-screen px-6 py-8"
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
    >
      <SpotlightCursor className="z-0" config={spotlightFor(isDark)} />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <NavPill items={navItems} activeId="home" />
          <div className="flex items-center gap-2">
            <SiteActions />
            <AnimatedThemeToggler />
          </div>
        </div>

        <header className="mt-16 mb-10 max-w-2xl">
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

        <DeckSearch decks={all} onResults={handleResults} />

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

        <DeckUploadTicket />
      </div>

      <FeedbackButton />
    </main>
  );
}

export default FolderPage;
