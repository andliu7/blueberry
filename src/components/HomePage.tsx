import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { deckCount, deckHref, DECK_GROUPS, type Deck } from "@/data/types";
import { DECKS } from "@/data/decks";
import { REPO_URL } from "@/data/site";
import { useDecks } from "@/lib/useDecks";

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
import { ExpandableText } from "@/components/ui/expandable-text";
import { DeckSearch } from "@/components/ui/deck-search";
import { FolderDeckFan } from "@/components/ui/folder-deck-fan";
import { matchedDeckIds, type SearchHit } from "@/lib/searchDecks";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { HomeIntro } from "@/components/HomeIntro";
import { FeedbackButton } from "@/components/FeedbackButton";
import { SiteActions } from "@/components/SiteActions";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { TextScramble } from "@/components/ui/text-scramble";
import BoldOnHover from "@/components/ui/bold-on-hover";
import { SpotlightCursor } from "@/components/ui/spotlight-cursor";
import { SURFACE, spotlightFor } from "@/lib/hubSurface";
import { hasSeenIntro, markIntroSeen } from "@/lib/intro";
import { BlueberryBot2D } from "@/components/ui/blueberry-bot-2d";

/**
 * three, fiber and drei are around 600 kB and the hub is where most people
 * land, so none of it is in the first paint. The flat bot renders immediately
 * and is the Suspense fallback, which means the placeholder is the finished
 * article rather than a spinner: if the chunk never arrives, or WebGL is
 * unavailable, what is on screen is already the folder pages' version.
 */
const BlueberryBot3D = lazy(() =>
  import("@/components/ui/blueberry-bot-3d").then((m) => ({ default: m.BlueberryBot3D })),
);

/**
 * The hub: one card per deck, with room to grow.
 *
 * Deliberately not the site root. The existing link is what classmates already
 * have, and making everyone mid-revision click through a landing page to reach
 * the questions would be a worse app for the sake of a nicer front door. This
 * lives at #/home, reached from the small Home link on the title screen.
 */
export function HomePage() {
  const [showIntro, setShowIntro] = useState(true);

  // Read once on mount, before the mark below is set, so a first arrival still
  // sees the opening. See `lib/intro` for which arrivals count as first.
  const [seenIntro] = useState(hasSeenIntro);
  useEffect(markIntroSeen, []);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    window.scrollTo({ top: 0 });
  }, []);

  /**
   * The opening does not move the page. It resolves the words, brings the
   * shader up behind them, shows the cue, and then waits.
   *
   * It did carry you down to the decks on its own for a while, which turned the
   * last beat of the sequence into being thrown somewhere you had not asked to
   * go. Landing on it and leaving is a fair thing to want to do with a front
   * door, so the descent is the visitor's.
   */
  const decksRef = useRef<HTMLElement>(null);

  /**
   * Already seen: start at the decks rather than at the top of a 220vh column.
   *
   * The opening stays mounted above rather than being torn out, so it is still
   * there to scroll up to. Jumping rather than gliding, because this is where
   * the page should have opened, not somewhere it is taking you.
   */
  useEffect(() => {
    if (!seenIntro || !showIntro) return;
    decksRef.current?.scrollIntoView({ block: "start" });
  }, [seenIntro, showIntro]);

  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  /**
   * Whether the opening has been scrolled clear of the screen.
   *
   * The spotlight canvas is fixed to the viewport, so it would sit over the
   * intro if it mounted with the page.
   */
  const [pastIntro, setPastIntro] = useState(!showIntro || seenIntro);
  useEffect(() => {
    if (!showIntro) {
      setPastIntro(true);
      return;
    }
    const check = () => setPastIntro(window.scrollY > window.innerHeight * 1.05);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [showIntro]);

  const reduce = useReducedMotion();
  // Bumped to restage the heading; see StudyDecksHeading.
  const [headingReplay, setHeadingReplay] = useState(0);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  // Stable identity: DeckSearch reports through an effect, so a fresh callback
  // every render would re-fire it on every keystroke's re-render.
  const handleResults = useCallback((next: SearchHit[] | null) => setHits(next), []);
  const matched = useMemo(() => (hits ? matchedDeckIds(hits) : null), [hits]);

  // Built-ins plus anything that has been published. Search covers both, so a
  // deck someone uploaded is findable the same way the rest are.
  const { decks: allDecks, published } = useDecks();

  /**
   * The newest uploads, shown under the folders.
   *
   * This used to list the lab decks, which meant the hub showed the CHEM 242
   * folder and then immediately showed everything inside it, so the folder was
   * decoration. Recent uploads are the thing that actually changes between
   * visits, and they are the reason to come back to the hub rather than
   * bookmarking a deck.
   *
   * Newest first is the sheet's own row order reversed, since publishing
   * appends. Republishing a deck overwrites its original row rather than adding
   * one, so a corrected re-upload keeps its old position instead of jumping to
   * the front. Worth knowing, and not worth a timestamp column to fix.
   */
  const recentUploads = useMemo(
    () =>
      [
        // Built-ins carrying an `added` date come first, newest of those first.
        // A new lab deck is the biggest thing that can change between visits,
        // and before this the hub had no way to say so: it went into the CHEM
        // 242 folder and the only sign anything had happened was the count on
        // the folder card going up by one.
        ...DECKS.filter((d) => d.added).sort((a, b) => (a.added! < b.added! ? 1 : -1)),
        ...[...published].reverse(),
      ]
        .filter((d) => !matched || matched.has(d.id))
        .slice(0, 4),
    [published, matched],
  );

  // The pill mirrors the page: this one lists folders, and each folder page
  // lists the decks inside it. Listing every deck here would contradict the
  // decision to move them off the hub.
  //
  // Uploaded is always listed, even with nothing in it, because it is where a
  // deck you have just published goes and it should be somewhere you can look
  // before there is anything to see.
  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home", icon: <BlueberryMark eyes className="h-[2.6rem] w-[2.6rem]" /> },
    ...DECK_GROUPS.filter(
      (g) => g.id === "uploaded" || allDecks.some((d) => (d.group ?? "lab") === g.id),
    ).map((g) => ({
      id: g.id,
      label: g.title.replace(/\[[^\]]*\]\s*/, ""),
      href: `#/folder/${g.id}`,
    })),
  ];

  return (
    <>
      {showIntro && <HomeIntro onSkip={dismissIntro} settled={seenIntro} />}

      <main
        ref={decksRef}
        className="relative z-10 min-h-screen px-6 py-8"
        style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
      >
        {/* The seam.

            This used to be a rounded, shadowed edge that slid up over the intro
            as a hard line: one page ending and another starting on the same
            frame. Instead the surface fades in over the 220px above its own top
            edge, so the aurora underneath dissolves into the deck background
            rather than being covered by it. The strip sits outside the element's
            box, which is also why it is gone by the time you are actually
            reading the decks: at rest the top of `main` is the top of the
            screen and the strip is above it. */}
        {showIntro && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-56 h-56"
            style={{ backgroundImage: `linear-gradient(180deg, transparent, ${surface.base})` }}
          />
        )}

        {/* Behind the content, above the surface, so it lights the background
            between the cards without washing over the text on them. */}
        {pastIntro && <SpotlightCursor className="z-0" config={spotlightFor(isDark)} />}

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <NavPill items={navItems} activeId="home" />
          <div className="flex items-center gap-2">
            <SiteActions />
            <AnimatedThemeToggler />
          </div>
        </div>

        <header className="mt-16 mb-12 max-w-2xl">
          <StudyDecksHeading replayKey={headingReplay} />
          {/* One sentence by default. The full version ran to two paragraphs
              and pushed the decks themselves below the fold. */}
          <ExpandableText
            // Opening the blurb restages the heading above it, so the two read
            // as one block responding rather than the text growing on its own.
            onToggle={() => setHeadingReplay((n) => n + 1)}
            // The heading restages and the new copy decrypts in underneath it,
            // so the two read as one block responding to the click.
            scramble
            className="playful-face mt-4 text-lg text-slate-500 dark:text-stone-400"
            text={
              "Flashcard decks I built to make the rote memorization part of organic chemistry a little more fun! " +
              "Pick a folder to see what's inside and choose a deck, or click any card in the stacks below to jump straight in. " +
              "Answers stay hidden until you ask, and you rate yourself as you go so the deck can show you what still needs work. " +
              "Flip the cards over like real flashcards, drop into the carousel to drill one question at a time, or switch on the laser pointer and scribble over the whole page while you think it through."
            }
          />
        </header>

        <DeckSearch decks={allDecks} onResults={handleResults} />

        {/* Folders first, then the lab decks themselves below, since those are
            what most people are here for. */}
        <div className="grid gap-7 sm:grid-cols-2">
          {DECK_GROUPS.map((group) => {
            const decks = allDecks.filter(
              (d) => (d.group ?? "lab") === group.id && (!matched || matched.has(d.id)),
            );
            // Uploaded keeps its folder even with nothing in it, so there is
            // somewhere for a published deck to land and somewhere to look for
            // one. Every other folder hides when empty, since a course folder
            // with no decks in it is just a dead end.
            //
            // A search is the exception: with a query typed, an Uploaded folder
            // showing zero decks is a result, not a placeholder, and leaving it
            // on screen would look like it matched.
            if (decks.length === 0 && (group.id !== "uploaded" || matched)) return null;
            return (
              <DeckFolder
                key={group.id}
                group={group}
                decks={decks}
                emptyNote={
                  group.id === "uploaded"
                    ? "Nothing here yet. Decks published from a .txt file land in this folder."
                    : undefined
                }
              />
            );
          })}
        </div>

        {recentUploads.length > 0 && (
          <section className="mt-14">
            <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="title-face text-2xl text-slate-900 sm:text-3xl dark:text-stone-100">
                Recently added
              </h2>
              {/* Not "uploaded" any more, because the list is mixed: a new lab
                  deck ships with the site and never passes through the sheet.
                  The link still goes to Uploaded, since that is the only one of
                  the two sources you can browse as a folder. */}
              <a
                href="#/folder/uploaded"
                className="group/all font-mono text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-stone-500 dark:hover:text-stone-300"
              >
                see all
                <span className="ml-1 inline-block transition-transform group-hover/all:translate-x-0.5">
                  &rarr;
                </span>
              </a>
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              {recentUploads.map((deck, i) => (
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

        {/* The bot, under the decks rather than over them: the hub is somewhere
            people arrive to find a deck quickly, and a toy above the fold would
            be in the way of that. */}
        <section className="mt-16 flex flex-col items-center">
          <Suspense fallback={<BlueberryBot2D className="h-72 w-72" />}>
            <BlueberryBot3D className="h-72 w-72" />
          </Suspense>
          <p className="mt-1 text-center text-xs text-slate-400 dark:text-stone-500">
            Move your cursor around and see what he does.
          </p>
        </section>

        <DeckUploadTicket />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          {/* Keeps the dotted underline a link is expected to have, and adds the
              sweep the deck footer's GitHub link already uses, so the two do not
              behave differently for no reason. */}
          <a
            href={REPO_URL}
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

const HEADING_TEXT = "STUDY DECKS";
const HEADING_CLASS =
  "title-face text-5xl leading-[1.05] text-slate-900 dark:text-stone-100 sm:text-6xl";

/**
 * The hub's heading, which arrives in two beats.
 *
 * It resolves out of random letters whenever it comes into view, and then pops
 * letter by letter the way the deck titles do when you hover them. The pop plays
 * itself, because you arrive here by scrolling and there is no cursor anywhere
 * near the words to set it off.
 *
 * It replays on every arrival rather than only the first. Scrolling down from
 * the opening is the moment the heading is meant to introduce, and that is a
 * moment you have every time you come back up and go down again.
 *
 * Two components rather than one because they want the text in incompatible
 * shapes: `TextScramble` swaps the whole string on a timer, `BoldOnHover` needs
 * every character to be its own animated box. Handing over at the moment the
 * scramble lands is what lets each do the thing it is good at.
 */
function StudyDecksHeading({ replayKey = 0 }: { replayKey?: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.6 });
  const [settled, setSettled] = useState(false);

  // Back to letters whenever it leaves the screen, or whenever the caller bumps
  // the key, so the next arrival has something to resolve out of.
  useEffect(() => {
    if (!inView) setSettled(false);
  }, [inView]);

  useEffect(() => {
    if (replayKey > 0) setSettled(false);
  }, [replayKey]);

  // Reduced motion gets the words, plainly, with the hover pop still available.
  if (reduce) {
    return (
      <h1 ref={ref} className={HEADING_CLASS}>
        <BoldOnHover text={HEADING_TEXT} initialWeight={400} hoverWeight={800} />
      </h1>
    );
  }

  return (
    <h1
      ref={ref}
      className={HEADING_CLASS}
      // Held back until it is on screen, so the scramble is not already over by
      // the time the page arrives here.
      style={{ opacity: inView ? 1 : 0, transition: "opacity 200ms ease-out" }}
    >
      {settled ? (
        <BoldOnHover
          text={HEADING_TEXT}
          initialWeight={400}
          hoverWeight={800}
          hoverScale={1.18}
          hoverLift={-5}
          autoPlay
          autoPlayDelay={120}
          autoPlayHold={620}
        />
      ) : (
        <TextScramble
          as="span"
          trigger={inView}
          duration={0.9}
          speed={0.03}
          characterSet="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
          onScrambleComplete={() => setSettled(true)}
        >
          {HEADING_TEXT}
        </TextScramble>
      )}
    </h1>
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
  emptyNote,
}: {
  group: (typeof DECK_GROUPS)[number];
  decks: Deck[];
  /** Stands in for the fan when the folder has nothing in it yet. */
  emptyNote?: string;
}) {
  const isDark = useIsDark();
  const cards = decks.reduce((n, d) => n + deckCount(d), 0);

  /**
   * The whole card is a way into the folder, not just the two links on it.
   *
   * Most of a folder card is the fanned deck art and the space around it, and
   * clicking that did nothing at all, which reads as a broken card rather than
   * a decorative one. Anything that is already a link keeps its own
   * destination: the deck cards in the fan still go to their decks, and the
   * title and Open folder links are untouched. The links are also what keeps
   * this reachable from a keyboard, which a click handler on a div is not.
   */
  const openFolder = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    window.location.hash = `#/folder/${group.id}`;
  };

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
      onClick={openFolder}
      className="!border-transparent cursor-pointer"
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
        {decks.length > 0 ? (
          <FolderDeckFan decks={decks} />
        ) : (
          // Roughly the height the fan would take, so an empty folder is the
          // same size as a full one and the grid does not go ragged.
          <p className="mt-4 flex min-h-[7.5rem] items-center rounded-lg border border-dashed border-white/30 px-4 text-xs leading-relaxed text-white/70">
            {emptyNote}
          </p>
        )}


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
