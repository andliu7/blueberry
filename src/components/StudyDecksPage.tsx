import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  COURSES,
  deckCount,
  deckHref,
  DECK_GROUPS,
  foldersUnder,
  type Deck,
} from "@/data/types";
import { Dashboard, useDashboard } from "@/components/Dashboard";
import { SiteHeader } from "@/components/ui/site-header";
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
import { matchedDeckIds, searchDecks } from "@/lib/searchDecks";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
import { TextScramble } from "@/components/ui/text-scramble";
import BoldOnHover from "@/components/ui/bold-on-hover";
import { SpotlightCursor } from "@/components/ui/spotlight-cursor";
import { SURFACE, spotlightFor } from "@/lib/hubSurface";
import { Blueberry } from "@/components/ui/blueberry";
import { SiteFooter } from "@/components/ui/site-footer";
import { moodForProgress } from "@/lib/berryMood";

/**
 * The hub: one card per deck, with room to grow.
 *
 * This is the site root as well as `#/home`. It was not always: the bare URL
 * used to open the Grignard deck, so the link classmates already had landed on
 * questions instead of on a landing page they would have to click through
 * mid-revision. That was right while there was one deck. With eight, a front
 * door that opens onto one arbitrary experiment is the worse introduction.
 */
export function StudyDecksPage() {
  /**
   * The opening lives on the home page now, not here.
   *
   * This used to carry it, because the hub *was* home. Once home became a
   * landing with three doors, the hub became one of the three, and a deck
   * library that replays a title sequence every time you open it is in the way
   * of the one thing it is for. What is left of the machinery — a `showIntro`
   * that was only ever `false`, a seam that faded a page below an opening that
   * is no longer above it, and a scroll that moved the visitor to a section
   * that now starts at the top — came out with it.
   */
  const decksRef = useRef<HTMLElement>(null);

  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  /**
   * The dashboard, closed until asked for.
   *
   * Three ways in, and they do not all land in the same place. The Dashboard
   * pill opens the main navigation, because that is a button that means "show me
   * everything". The search and the "Study Decks" title open the decks panel,
   * because both of them are already about decks and dropping you on an overview
   * would be one more click to get back to what you asked for.
   */
  const dash = useDashboard();
  const toggleBrowse = useCallback(() => dash.toggle("home"), [dash]);

  /**
   * When the bar carries "Study Decks", which is a question with two halves.
   *
   * The title moves up to the bar once its own big heading has left the screen,
   * and lets go again at the end of the section it names. Two observers rather
   * than a scroll threshold, because the second one is what makes this a
   * *category* label instead of a permanent one: a future section passes its own
   * name and gets the same behaviour for free.
   */
  const categoryRef = useRef<HTMLElement>(null);
  const bigHeadingRef = useRef<HTMLDivElement>(null);
  /**
   * `amount: "all"` and a margin the height of the bar, so the handover happens
   * the moment the heading starts sliding under the bar rather than once the
   * whole thing has cleared the screen. Watching the whole header block with
   * "some" meant scrolling past the title, the blurb and Show more before the bar
   * admitted what you were looking at.
   */
  const bigHeadingInView = useInView(bigHeadingRef, {
    amount: "all",
    margin: "-76px 0px 0px 0px",
  });
  const categoryInView = useInView(categoryRef, { amount: "some" });
  const showCategoryTitle = !bigHeadingInView && categoryInView;

  /** Home, from the hub, means the top of the decks rather than the opening. */
  const goHome = useCallback(() => {
    decksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const reduce = useReducedMotion();
  // Bumped to restage the heading; see StudyDecksHeading.
  const [headingReplay, setHeadingReplay] = useState(0);
  // Built-ins plus anything that has been published. Search covers both, so a
  // deck someone uploaded is findable the same way the rest are.
  const { decks: allDecks, published } = useDecks();

  /**
   * The mood the whole library is in, summed across every deck with progress.
   *
   * Summed rather than taken from the best deck, or the berry would look proud
   * of the one you finished while ignoring the four you abandoned.
   */
  const libraryMood = useMemo(() => {
    const rows = allDecks.map((d) => ({ reviewed: reviewedCount(d.id), total: deckCount(d) }));
    const reviewed = rows.reduce((n, r) => n + r.reviewed, 0);
    const total = rows.reduce((n, r) => n + r.total, 0);
    return moodForProgress(reviewed, total);
  }, [allDecks]);

  /**
   * One query, shared by the box in the page and the one in the sticky bar.
   *
   * The search used to live inside `DeckSearch`, which held the query and pushed
   * matches back up through a callback fired from an effect. Two boxes cannot
   * share that: each would keep its own idea of what was typed and both would
   * race to drive the same filter. `searchDecks` is a pure function, so the page
   * runs it and hands both boxes the answer.
   */
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchDecks(allDecks, query), [allDecks, query]);
  const searching = query.trim().length >= 2;
  const matched = useMemo(
    () => (searching ? matchedDeckIds(hits) : null),
    [searching, hits],
  );

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

  return (
    <>
      <main
        ref={decksRef}
        // No horizontal padding here any more. The sticky bar has to span the
        // full width or a 24px channel runs down each side of it with content
        // visibly sliding through, so the padding moved onto the bar and the
        // content column separately.
        className="relative z-10 min-h-screen pb-8"
        style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
      >
        {/* Behind the content, above the surface, so it lights the background
            between the cards without washing over the text on them. */}
        <SpotlightCursor className="z-0" config={spotlightFor(isDark)} />

      {/* Outside the padded column so its banner reaches both edges. */}
      <SiteHeader
        category={showCategoryTitle ? "Study Decks" : null}
        browse={{ open: dash.isOpen, onToggle: toggleBrowse }}
        onCategoryClick={() => dash.open("decks")}
        onHome={goHome}
        onSearch={() => dash.open("decks", { focusSearch: true })}
      />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-6">
        {/*
          Everything that is about decks, in one section.

          This exists so the category title knows where to stop. A sticky element
          is bounded by its containing block, and the same is true of the
          observer driving the title: once this section has scrolled past, the
          bar drops "Study Decks" on its own with no scroll arithmetic to get
          wrong. The bot, the upload ticket and the footer sit outside it,
          because they are page furniture rather than part of the category.

          Study decks are the whole site today and will not be for long. The next
          feature is another section like this one with another name.
        */}
        <section ref={categoryRef}>
        {/*
          The heading, in flow.

          This used to be pinned, along with the blurb and Show more, which meant
          three paragraphs of introduction followed you down the page and printed
          over the folder cards. The bar carries the title now; the words that
          introduce it are read once and left behind.
        */}
        <header className="mt-14 mb-12 max-w-2xl">
          {/* The observer watches the words alone, not the block. The blurb
              underneath is three sentences tall, and including it meant the bar
              stayed empty until all of it had gone. */}
          <div ref={bigHeadingRef} className="w-fit">
            <StudyDecksHeading replayKey={headingReplay} />
          </div>
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

        {/* The bar takes the shortcut once it has a search of its own on
            screen, so `/` never lands on the box you cannot see. */}
        <DeckSearch
          value={query}
          onChange={setQuery}
          hits={hits}
          shortcut={!showCategoryTitle}
        />

        {/*
          Folders grouped by the course they belong to, three to a row.

          Three rather than two because the folders themselves are smaller now:
          at two-up they were wide enough that a fourth folder pushed everything
          below the fold, and the Carbonyls deck landing loose on the hub was
          what made that visible. Smaller cards with space around them leave room
          to grow on hover instead of colliding.
        */}
        <div className="mt-2">
          <div className="space-y-9">
            {COURSES.map((course) => {
              const leaves = foldersUnder(course);
              const groups = DECK_GROUPS.filter((g) => leaves.includes(g.id));
              const visible = groups
                .map((group) => ({
                  group,
                  decks: allDecks.filter(
                    (d) => (d.group ?? "lab") === group.id && (!matched || matched.has(d.id)),
                  ),
                }))
                // Uploaded keeps its folder even when empty, so a published deck
                // has somewhere to land and somewhere to be looked for. With a
                // query typed it hides like the rest, because an empty folder
                // then reads as a result rather than a placeholder.
                .filter(({ group, decks }) => decks.length > 0 || (group.id === "uploaded" && !matched));

              // An empty course is still part of the site. It says so, quietly,
              // rather than vanishing and looking like an oversight.
              const bare = leaves.length === 0;
              if (!visible.length && !bare) return null;

              return (
                <section key={course.id}>
                  <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase dark:text-stone-500">
                    {course.title}
                  </h2>
                  {bare ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400 dark:border-stone-700 dark:text-stone-500">
                      Nothing here yet.
                    </p>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {visible.map(({ group, decks }) => (
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
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
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
        </section>

        {/* The bot, under the decks rather than over them: the hub is somewhere
            people arrive to find a deck quickly, and a toy above the fold would
            be in the way of that.

            The lazy import, the visibility gate and the flat stand-in all moved
            into `Blueberry`, because every page wants the same three things and
            three pages had started writing their own. It wears the mood the
            library is in: proud once most of it is reviewed, focused in the
            middle of the work, curious before any of it is started. */}
        <section className="mt-16 flex flex-col items-center">
          <Blueberry
            mood={libraryMood}
            className="h-72 w-72"
            label="Blueberry, the site's mascot. Drag to spin, click to poke."
          />
          <p className="mt-1 text-center text-xs text-slate-400 dark:text-stone-500">
            Move your cursor around, give him a poke, or drag to spin him.
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
      
      <SiteFooter />
    </main>

      {/* Outside `main` on purpose: `main` is a `relative z-10` stacking
          context, and a fixed panel inside it can never rise above anything
          that context is under. */}
      <Dashboard dash={dash} seedQuery={query} />
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
          {/* Same sweep as "Open folder" below. The two go to the same place, so
              a fade on one and an underline on the other said they were
              different kinds of link. */}
          <a
            href={`#/folder/${group.id}`}
            className="group/title inline-flex items-center gap-1 outline-none"
          >
            <span className="relative">
              {group.title}
              <span
                aria-hidden
                className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-white/80 transition-transform duration-300 ease-out group-hover/title:scale-x-100"
              />
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/title:translate-x-1" />
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

export default StudyDecksPage;
