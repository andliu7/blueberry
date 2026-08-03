import { useCallback, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DECKS } from "@/data/decks";
import { deckCount, DECK_GROUPS, type Deck } from "@/data/types";

import {
  InfoCard,
  InfoCardContent,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardFooter,
} from "@/components/ui/info-card";
import { DeckSearch } from "@/components/ui/deck-search";
import { FolderDeckFan } from "@/components/ui/folder-deck-fan";
import { matchedDeckIds, type SearchHit } from "@/lib/searchDecks";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

/**
 * The hub: one card per deck, with room to grow.
 *
 * Deliberately not the site root. The existing link is what classmates already
 * have, and making everyone mid-revision click through a landing page to reach
 * the questions would be a worse app for the sake of a nicer front door. This
 * lives at #/home, reached from the small Home link on the title screen.
 */
export function HomePage() {
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  // Stable identity: DeckSearch reports through an effect, so a fresh callback
  // every render would re-fire it on every keystroke's re-render.
  const handleResults = useCallback((next: SearchHit[] | null) => setHits(next), []);
  const matched = useMemo(() => (hits ? matchedDeckIds(hits) : null), [hits]);

  // The pill mirrors the page: this one lists folders, and each folder page
  // lists the decks inside it. Listing every deck here would contradict the
  // decision to move them off the hub.
  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home" },
    ...DECK_GROUPS.filter((g) => DECKS.some((d) => (d.group ?? "lab") === g.id)).map((g) => ({
      id: g.id,
      label: g.title.replace(/\[[^\]]*\]\s*/, ""),
      href: `#/folder/${g.id}`,
    })),
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

        {/* Folders only. The decks themselves are one click away on each
            folder's page, which is what stops this list growing without bound
            as more decks arrive. */}
        <div className="grid gap-7 sm:grid-cols-2">
          {DECK_GROUPS.map((group) => {
            const decks = DECKS.filter(
              (d) => (d.group ?? "lab") === group.id && (!matched || matched.has(d.id)),
            );
            if (decks.length === 0) return null;
            return <DeckFolder key={group.id} group={group} decks={decks} />;
          })}
        </div>

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
        <FolderDeckFan decks={decks} />


        {/* Same treatment as "Check out the GitHub here" in the deck footer:
            the underline sweeps in from the left and the arrow steps out. */}
        <a
          href={`#/folder/${group.id}`}
          className="group/open mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 outline-none dark:text-indigo-300"
        >
          <span className="relative">
            Open folder
            <span
              aria-hidden
              className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover/open:scale-x-100"
            />
          </span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/open:translate-x-1" />
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

export default HomePage;
