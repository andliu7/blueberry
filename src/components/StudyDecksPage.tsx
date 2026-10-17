import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { COURSES, DECK_GROUPS, deckCount, deckHref, foldersUnder, isReference, type Deck } from "@/data/types";
import { useDecks } from "@/lib/useDecks";
import { reviewedCount } from "@/lib/progress";
import { cardsWord, dueAcross } from "@/lib/reviewProgress";
import { isReducedMotion } from "@/lib/motionPref";
import { matchedDeckIds, searchDecks } from "@/lib/searchDecks";
import { DeckSearch } from "@/components/ui/deck-search";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { DeckTile } from "@/components/review/DeckTile";
import { DeckFolders } from "@/components/review/DeckFolders";
import "@/components/review/review.css";

/**
 * Review, at `#/study-decks` (SITE-REPLAN.md section 8 and phase 7).
 *
 * It opens on the decision, as the game's Cards tab does: "Due today", one big number and
 * one button. Then My decks (the ones you have started), then the library as glass
 * folders whose files are the decks (owner, 15 Oct 2026; review/DeckFolders.tsx). A
 * search shows its matches folder by folder as Quizlet-style tiles instead.
 *
 * WHAT WENT, AND WHY. The scrambling "STUDY DECKS" heading and its sticky bar, the
 * release banner (a promo card), the empty "Organic Chemistry I, nothing here yet" group,
 * the folder cards that fanned on hover over a violet gradient, the "Recently added"
 * gradient cards, the cursor spotlight and the 3-D berry under it all. The replan's
 * Review page is the decision and the decks; the berry is in the header on every page.
 *
 * The address stays `#/study-decks`, so every link and bookmark still lands here.
 */
export function StudyDecksPage() {
  const { decks } = useDecks();

  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchDecks(decks, query), [decks, query]);
  const matched = useMemo(() => (query.trim().length >= 2 ? matchedDeckIds(hits) : null), [query, hits]);
  const shown = (d: Deck) => !matched || matched.has(d.id);

  const due = useMemo(() => dueAcross(decks), [decks]);
  const mine = useMemo(
    () => decks.filter((d) => !isReference(d) && reviewedCount(d.id) > 0 && shown(d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [decks, matched],
  );
  // The library in the course's own order (types.ts COURSES): Lessons, then Lab, then
  // Uploaded. A folder with nothing in it is left out, never shown empty.
  const folders = COURSES.flatMap(foldersUnder)
    .map((id) => ({
      group: DECK_GROUPS.find((g) => g.id === id)!,
      decks: decks.filter((d) => (d.group ?? "lab") === id && shown(d)),
    }))
    .filter((f) => f.group && f.decks.length > 0);

  return (
    <main className="min-h-screen pb-8">
      <div className={SITE_CONTAINER}>
        <PageHeader title="Review" subtitle="Flashcard decks for organic chemistry. Rate each card as you go, and the ones you miss come back here." />

        <DueToday decks={decks} count={due.count} deckId={due.deckId} />

        <div className="mt-10">
          <DeckSearch value={query} onChange={setQuery} hits={hits} />
        </div>

        {mine.length > 0 && (
          <section aria-labelledby="my-decks" className="mt-10">
            <h2 id="my-decks" className="mb-4 text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
              My decks
            </h2>
            <div className="rv-row">
              {mine.map((d) => (
                <DeckTile key={d.id} deck={d} />
              ))}
            </div>
          </section>
        )}

        {/* With no search, the library is glass folders (owner, 15 Oct: DeckFolders.tsx).
            A search lists its matches as tiles, folder by folder, below. */}
        {!matched && <DeckFolders decks={decks} />}

        {matched && folders.map(({ group, decks: inFolder }) => (
          <section key={group.id} aria-labelledby={`folder-${group.id}`} className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <h2 id={`folder-${group.id}`} className="text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
                  {group.title}
                </h2>
                <p className="text-sm text-[var(--site-quiet)]">{group.blurb}</p>
              </div>
              <a href={`#/folder/${group.id}`} className="rv-flat -mr-2.5">
                Open folder
                <ArrowRight aria-hidden className="size-4" />
              </a>
            </div>
            <div className="rv-row">
              {inFolder.map((d) => (
                <DeckTile key={d.id} deck={d} />
              ))}
            </div>
          </section>
        ))}

        {matched && folders.length === 0 && (
          <p className="rv-card-box mt-10 p-6 text-[var(--site-quiet)]">No deck matches that. Try a shorter word.</p>
        )}

        <DeckUploadTicket />
        <FeedbackButton />
      </div>
    </main>
  );
}

/**
 * Due today: the cards you marked Missed or Unsure, as one number that counts up, and the
 * one filled button on the page. With nothing due it says so and offers a first deck.
 */
function DueToday({ decks, count, deckId }: { decks: Deck[]; count: number; deckId: string | null }) {
  const shown = useCountUp(count);
  const target = decks.find((d) => d.id === deckId);
  const firstDeck = decks.find((d) => !isReference(d) && reviewedCount(d.id) < deckCount(d));

  return (
    <section aria-labelledby="due-today" className="rv-card-box flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <h2 id="due-today" className="rv-eyebrow">
          Due today
        </h2>
        {/* The number and its word are one line, so the count is never bare. */}
        <p className="mt-1 flex items-baseline gap-2 text-[var(--bb-deep)] [font-family:var(--site-display)]">
          <span className="text-5xl font-black tabular-nums" aria-hidden>
            {shown}
          </span>
          <span className="text-xl font-extrabold" aria-hidden>
            {count === 1 ? "card" : "cards"}
          </span>
          <span className="sr-only">{cardsWord(count)} due</span>
        </p>
        <p className="mt-1 text-sm text-[var(--site-quiet)]">
          {count > 0
            ? "The ones you marked Missed or Unsure."
            : firstDeck
              ? `Nothing due yet. ${firstDeck.short ?? firstDeck.title} is the first deck you have not finished; cards you miss there come back here.`
              : "Nothing marked Missed or Unsure. Rate cards as you go and they come back here."}
        </p>
      </div>
      {count > 0 && target ? (
        <a href={`${deckHref(target)}?due=1`} className="rv-btn">
          Review {target.short ?? target.title}
        </a>
      ) : firstDeck ? (
        <a href={deckHref(firstDeck)} className="rv-btn">
          Start {firstDeck.short ?? firstDeck.title}
        </a>
      ) : null}
    </section>
  );
}

/**
 * Counts from 0 up to `n` over 700ms, easing out, then holds. Under reduced motion it
 * shows `n` at once (motion.md rule 2: the number is the meaning, the count is not).
 */
function useCountUp(n: number): number {
  const animate = !isReducedMotion() && typeof requestAnimationFrame === "function";
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!animate || n === 0) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      setValue(Math.round(n * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, animate]);
  return animate && n > 0 ? value : n;
}

export default StudyDecksPage;
