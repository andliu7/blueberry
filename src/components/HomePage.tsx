import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, User, Sparkles } from "lucide-react";
import { DECKS } from "@/data/decks";
import { deckCount, deckHref, DECK_GROUPS, type Deck } from "@/data/types";

import {
  InfoCard,
  InfoCardContent,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardFooter,
} from "@/components/ui/info-card";
import { GlassCard } from "@/components/ui/glass-card";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";
import { reviewedCount } from "@/lib/progress";
import { DeckSearch } from "@/components/ui/deck-search";
import { FolderDeckFan } from "@/components/ui/folder-deck-fan";
import { matchedDeckIds, type SearchHit } from "@/lib/searchDecks";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { HomeIntro } from "@/components/HomeIntro";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
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
const INTRO_KEY = "grignard_lcta_intro_seen_v1";

export function HomePage() {
  /**
   * Shown on a first visit only. Read in the initialiser rather than an effect
   * so a returning visitor never sees the intro flash before it is dismissed.
   */
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return localStorage.getItem(INTRO_KEY) !== "yes";
    } catch {
      return false;
    }
  });

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, "yes");
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const reduce = useReducedMotion();
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  // Stable identity: DeckSearch reports through an effect, so a fresh callback
  // every render would re-fire it on every keystroke's re-render.
  const handleResults = useCallback((next: SearchHit[] | null) => setHits(next), []);
  const matched = useMemo(() => (hits ? matchedDeckIds(hits) : null), [hits]);
  const labDecks = useMemo(
    () => DECKS.filter((d) => (d.group ?? "lab") === "lab" && (!matched || matched.has(d.id))),
    [matched],
  );

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
    <>
      {showIntro && <HomeIntro onSkip={dismissIntro} />}

      <main
        className="relative z-10 min-h-screen bg-[#f6f4ef] px-6 py-8 dark:bg-[#0c0a09]"
        // Rounds the seam and casts a shadow up over the shader, the same
        // curtain treatment the deck title screens already use.
        style={showIntro ? { borderTopLeftRadius: "2rem", borderTopRightRadius: "2rem" } : undefined}
      >
      <div className="mx-auto flex max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <NavPill items={navItems} activeId="home" />
          <div className="flex items-center gap-2">
            <a
              href="#/about"
              className="group inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100"
            >
              <User className="h-3.5 w-3.5" />
              About / Contact
            </a>
            {!showIntro && (
              <button
                onClick={() => setShowIntro(true)}
                title="Replay the opening animation"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-600 backdrop-blur transition-colors hover:text-slate-900 dark:border-stone-700/70 dark:bg-stone-900/50 dark:text-stone-400 dark:hover:text-stone-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Intro
              </button>
            )}
            <AnimatedThemeToggler />
          </div>
        </div>

        <header className="mt-16 mb-12 max-w-2xl">
          <h1 className="title-face text-5xl leading-[1.05] text-slate-900 dark:text-stone-100 sm:text-6xl">
            Home
          </h1>
          <p className="playful-face mt-4 text-lg text-slate-500 dark:text-stone-400">
            Flashcard decks I built to make the rote memorization part of organic
            chemistry a little more fun! Pick a folder to see what's inside and
            choose a deck, or click any card in the stacks below to jump straight
            in.
          </p>
          <p className="playful-face mt-4 text-base text-slate-500 dark:text-stone-400">
            Answers stay hidden until you ask, and you rate yourself as you go so
            the deck can show you what still needs work. Flip the cards over like
            real flashcards, drop into the carousel to drill one question at a
            time, or switch on the laser pointer and scribble over the whole page
            while you think it through.
          </p>
        </header>

        <DeckSearch decks={DECKS} onResults={handleResults} />

        <h2 className="title-face mb-5 text-2xl text-slate-900 sm:text-3xl dark:text-stone-100">
          Study decks
        </h2>

        {/* Folders first, then the lab decks themselves below, since those are
            what most people are here for. */}
        <div className="grid gap-7 sm:grid-cols-2">
          {DECK_GROUPS.map((group) => {
            const decks = DECKS.filter(
              (d) => (d.group ?? "lab") === group.id && (!matched || matched.has(d.id)),
            );
            if (decks.length === 0) return null;
            return <DeckFolder key={group.id} group={group} decks={decks} />;
          })}
        </div>

        {labDecks.length > 0 && (
          <section className="mt-14">
            <h2 className="title-face mb-5 text-2xl text-slate-900 sm:text-3xl dark:text-stone-100">
              Lab practicals
            </h2>
            <div className="grid gap-7 sm:grid-cols-2">
              {labDecks.map((deck, i) => (
                <motion.div
                  key={deck.id}
                  // Same reveal as the intro: blurred and low, settling as it
                  // scrolls into view.
                  initial={reduce ? false : { opacity: 0, y: 40, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ type: "spring", stiffness: 100, damping: 16, mass: 0.75, delay: i * 0.06 }}
                  className="h-full"
                >
                  <GlassCard
                    href={deckHref(deck)}
                    title={deck.title}
                    description={deck.blurb}
                    meta={`${deckCount(deck)} cards`}
                    cta="Start studying"
                    from={deck.from}
                    to={deck.to}
                    motifMarkup={motifMarkup(deck.motif)}
                    motifViewBox={MOTIF_VIEWBOX}
                    progress={{ reviewed: reviewedCount(deck.id), total: deckCount(deck) }}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <DeckUploadTicket />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          {/* Keeps the dotted underline a link is expected to have, and adds the
              sweep the deck footer's GitHub link already uses, so the two do not
              behave differently for no reason. */}
          <a
            href="https://github.com/andliu7/grignard_LCTA"
            target="_blank"
            rel="noreferrer"
            className="group/gh inline-flex items-center gap-1.5 outline-none transition-colors hover:text-slate-600 dark:hover:text-stone-300"
          >
            <span className="relative">
              Source on GitHub
              <span className="absolute right-0 -bottom-1 left-0 border-b border-dotted border-current" />
              <span
                aria-hidden
                className="absolute right-0 -bottom-1 left-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover/gh:scale-x-100"
              />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/gh:translate-x-0.5 group-hover/gh:-translate-y-0.5" />
          </a>
        </footer>
      </div>

      <FeedbackButton />
      </main>
    </>
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
  const isDark = useIsDark();
  const cards = decks.reduce((n, d) => n + deckCount(d), 0);

  return (
    // Tilts like everything else on the site. `overflow-visible` matters: the
    // top card of the fan lifts and scales past the card's edge on hover, and
    // TiltCard clips by default, which sliced the corner off it.
    <TiltCard
      max={6}
      glareColor={isDark ? "rgba(255,255,255,0.9)" : "rgba(99,102,241,0.7)"}
      className="rounded-lg !overflow-visible"
    >
    <InfoCard
      className="!border-transparent"
      style={{
        // A tinted wash rather than plain white, so the two folders read as
        // different places at a glance instead of two identical panels.
        backgroundImage: `linear-gradient(140deg, ${group.from}, ${group.to})`,
      }}
    >
      <InfoCardContent>
        <InfoCardTitle className="text-base !text-white">
          <a
            href={`#/folder/${group.id}`}
            className="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
          >
            {group.title}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </InfoCardTitle>
        <InfoCardDescription className="!text-white/75">{group.blurb}</InfoCardDescription>
        <FolderDeckFan decks={decks} />


        {/* Same treatment as "Check out the GitHub here" in the deck footer:
            the underline sweeps in from the left and the arrow steps out. */}
        <a
          href={`#/folder/${group.id}`}
          className="group/open mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white outline-none"
        >
          <span className="relative">
            Open folder
            <span
              aria-hidden
              className="absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 rounded-full bg-white/80 transition-transform duration-300 ease-out group-hover/open:scale-x-100"
            />
          </span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/open:translate-x-1" />
        </a>

        <InfoCardFooter className="!text-white/70">
          <span className="font-mono">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </span>
          <span className="font-mono">{cards} cards</span>
        </InfoCardFooter>
      </InfoCardContent>
    </InfoCard>
    </TiltCard>
  );
}

export default HomePage;
