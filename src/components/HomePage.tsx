import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { DECKS } from "@/data/decks";
import { deckHref, deckCount, isReference, DECK_GROUPS, type Deck } from "@/data/types";
import { MOTIF_VIEWBOX, motifMarkup, cardArt } from "@/data/testimonialArt";
import {
  InfoCard,
  InfoCardContent,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardMedia,
  InfoCardFooter,
} from "@/components/ui/info-card";
import { DeckSearch } from "@/components/ui/deck-search";
import { matchedDeckIds, type SearchHit } from "@/lib/searchDecks";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * The hub: one card per deck, with room to grow.
 *
 * Deliberately not the site root. The existing link is what classmates already
 * have, and making everyone mid-revision click through a landing page to reach
 * the questions would be a worse app for the sake of a nicer front door. This
 * lives at #/home, reached from the small Home link on the title screen.
 */
export function HomePage() {
  const reduce = useReducedMotion();
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  // Stable identity: DeckSearch reports through an effect, so a fresh callback
  // every render would re-fire it on every keystroke's re-render.
  const handleResults = useCallback((next: SearchHit[] | null) => setHits(next), []);
  const matched = useMemo(() => (hits ? matchedDeckIds(hits) : null), [hits]);

  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home" },
    // The pill gets the short name: the full course titles are far too long to
    // sit side by side in it.
    ...DECKS.map((d) => ({ id: d.id, label: d.short ?? d.title, href: deckHref(d) })),
  ];

  return (
    <main className="min-h-screen bg-[#f6f4ef] dark:bg-[#0c0a09] px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <NavPill items={navItems} activeId="home" />
          <AnimatedThemeToggler />
        </div>

        <header className="mt-16 mb-12 max-w-2xl">
          <h1 className="title-face text-5xl leading-[1.05] text-slate-900 dark:text-stone-100 sm:text-6xl">
            Study decks
          </h1>
          <p className="playful-face mt-4 text-lg text-slate-500 dark:text-stone-400">
            Everything I use to study for CHEM 241 and 242, mostly the night before.
            Lab practical questions, plus the pKa, IR, NMR and resonance sheets I
            always end up digging for. Answers stay hidden until you ask for them.
          </p>
        </header>

        <DeckSearch decks={DECKS} onResults={handleResults} />

        {DECK_GROUPS.map((group) => {
          const decks = DECKS.filter(
            (d) => (d.group ?? "lab") === group.id && (!matched || matched.has(d.id)),
          );
          if (decks.length === 0) return null;
          return (
            <section key={group.id} className="mb-14">
              <DeckFolder group={group} decks={decks} />
              {/* Roomier than a tight gutter: these cards tilt out of the plane
                  on hover, and the raised corner used to clip its neighbour. */}
              <div className="mt-6 grid gap-7 sm:grid-cols-2">
                {decks.map((deck, i) => (
                  <DeckCard key={deck.id} deck={deck} index={i} reduce={reduce} />
                ))}

              </div>
            </section>
          );
        })}

        <DeckUploadTicket />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          <a
            href="https://github.com/andliu7/grignard_LCTA"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-600 dark:hover:text-stone-300"
          >
            Source on GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}

/**
 * A folder heading for one group of decks.
 *
 * The stacked artwork is the decks themselves: `cardArt()` already renders a
 * motif onto its gradient as a self-contained SVG data URI, so the fan needs no
 * new image assets and nothing that can 404. Hovering spreads the stack, which
 * is what makes this read as a folder rather than a heading with a picture.
 */
function DeckFolder({
  group,
  decks,
}: {
  group: (typeof DECK_GROUPS)[number];
  decks: Deck[];
}) {
  /**
   * The upstream media styling assumes landscape screenshots: `w-full` with no
   * height, so the height falls out of the aspect ratio. This artwork is
   * portrait 240x320, which made each image 546px tall and burst out of the
   * card. Fixing the height and letting the width follow keeps them card
   * shaped, and `object-contain` stops the motif being cropped away.
   */
  const media = useMemo(
    () =>
      decks.slice(0, 3).map((d) => ({
        src: cardArt(d.motif, d.from, d.to),
        alt: d.title,
        className: "mx-auto block h-[104px] w-auto rounded-md object-contain",
      })),
    [decks],
  );
  const cards = decks.reduce((n, d) => n + deckCount(d), 0);

  return (
    <InfoCard className="max-w-sm">
      <InfoCardContent>
        <InfoCardTitle className="text-base">
          <a
            href={`#/folder/${group.id}`}
            className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-300"
          >
            {group.title}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </InfoCardTitle>
        <InfoCardDescription>{group.blurb}</InfoCardDescription>
        {/* Shorter at rest than the images are tall, so the stack peeks out of
            the folder and has somewhere to open into on hover. */}
        <InfoCardMedia media={media} shrinkHeight={74} expandHeight={128} />

        {/* Every deck in the folder, linked. The fanned artwork says how many
            are in here; these say which, and get you into one in a single
            click instead of scrolling to find its card. */}
        <nav className="mt-2 flex flex-wrap gap-1.5">
          {decks.map((d) => (
            <a
              key={d.id}
              href={deckHref(d)}
              className="rounded-full border border-slate-200 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-300"
            >
              {d.short ?? d.title}
            </a>
          ))}
        </nav>

        <a
          href={`#/folder/${group.id}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300"
        >
          Open folder
          <ArrowRight className="h-3 w-3" />
        </a>

        <InfoCardFooter>
          <span className="font-mono">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </span>
          <span className="font-mono">{cards} cards</span>
        </InfoCardFooter>
      </InfoCardContent>
    </InfoCard>
  );
}

function DeckCard({
  deck,
  index,
  reduce,
}: {
  deck: Deck;
  index: number;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
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
      />
    </motion.div>
  );
}

export default HomePage;
