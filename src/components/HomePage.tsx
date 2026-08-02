import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { DECKS, type Deck } from "@/data/decks";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";

/**
 * The hub: one card per deck, with room to grow.
 *
 * Deliberately not the site root. The existing link is what classmates already
 * have, and making everyone mid-revision click through a landing page to reach
 * the questions would be a worse app for the sake of a nicer front door. This
 * lives at #/home, reached from the small Home link on the title screen.
 */
export function HomePage() {
  const isDark = useIsDark();
  const reduce = useReducedMotion();

  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home" },
    ...DECKS.map((d) => ({ id: d.id, label: d.title, href: d.href })),
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
            Question sets built for the ten minutes before a lab practical. Pick
            one, hide the answers, and drill until they stick.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {DECKS.map((deck, i) => (
            <DeckCard key={deck.id} deck={deck} index={i} isDark={isDark} reduce={reduce} />
          ))}
          <PlaceholderCard index={DECKS.length} reduce={reduce} />
        </div>

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

function DeckCard({
  deck,
  index,
  isDark,
  reduce,
}: {
  deck: Deck;
  index: number;
  isDark: boolean;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
    >
      <TiltCard
        max={6}
        glareColor={isDark ? "rgba(255,255,255,0.9)" : "rgba(99,102,241,0.7)"}
        className="rounded-2xl"
      >
        <a
          href={deck.href}
          className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-stone-800 dark:bg-stone-900"
        >
          {/* The motif is drawn to fit rather than set as a cover image: the
              artwork is portrait 240x320 and this well is wide and short, so
              `object-cover` cropped the reaction down to two stray bonds. */}
          <div
            aria-hidden
            className="mb-4 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl"
            style={{ background: `linear-gradient(135deg, ${deck.from}, ${deck.to})` }}
          >
            <svg
              viewBox={MOTIF_VIEWBOX}
              className="h-full w-auto py-3 text-white/90"
              dangerouslySetInnerHTML={{ __html: motifMarkup(deck.motif) }}
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-stone-100">
              {deck.title}
            </h2>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300">
              {deck.count} cards
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-stone-400">
            {deck.subtitle}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
            Start studying
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </a>
      </TiltCard>
    </motion.div>
  );
}

/** Holds the shape of the grid open, so one deck does not look like a mistake. */
function PlaceholderCard({ index, reduce }: { index: number; reduce: boolean | null }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-stone-700"
    >
      <span
        aria-hidden
        className="mb-3 text-slate-300 dark:text-stone-700"
        dangerouslySetInnerHTML={{
          __html: `<svg viewBox="${MOTIF_VIEWBOX}" width="56" height="74" fill="none">${motifMarkup(
            "erlenmeyer",
          )}</svg>`,
        }}
      />
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 dark:text-stone-500">
        <Plus className="h-4 w-4" />
        More decks to come
      </p>
      <p className="mt-1 max-w-[16rem] text-xs text-slate-400 dark:text-stone-600">
        Each one is a list of questions and answers, dropped in as a single file.
      </p>
    </motion.div>
  );
}

export default HomePage;
