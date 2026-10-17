import { useEffect, useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { deckAllows, questionsAsGroups, type StudyDeck } from "@/data/types";
import type { Status } from "@/components/QuestionCard";
import { HoverDeck } from "@/components/ui/hover-deck";
import { DeckAbout } from "@/components/ui/deck-about";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import { FeedbackButton } from "@/components/FeedbackButton";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { SITE_NAME } from "@/data/site";
import { loadSaved, progressKey } from "@/lib/progress";
import { cardsWord, tallyWords } from "@/lib/reviewProgress";
import { DeckStudy, ReagentsHiddenContext } from "@/components/review/DeckStudy";
import { deckCategories, hasReagents, hideReagents } from "@/lib/deckFilters";
import { DeckMatch, DeckTest, DeckWrite, MODE_WORDS, ModeSwitch, type StudyMode } from "@/components/review/StudyModes";
import { TermList, useStars } from "@/components/review/TermList";
import "@/components/review/review.css";

/** Matches the crop the generator writes onto each card (the table view's preview). */
const TABLE_PREVIEW = { width: 420, height: 168, cropRight: "37%" };

const isDue = (s: Status | undefined) => s === "red" || s === "yellow";

/** The reagents switch is remembered per device, like the reference deck's toggles. */
const REAGENTS_KEY = "bb-deck-reagents";

function readReagentsShown(): boolean {
  try {
    return localStorage.getItem(REAGENTS_KEY) !== "hidden";
  } catch {
    return true;
  }
}

/**
 * A study deck at `#/deck/<id>` (SITE-REPLAN.md phase 7): it opens on its first card.
 *
 * WHAT CHANGED, AND WHY. The page used to open on a toolbar of six gradient buttons, three
 * coloured dots with bare numbers, a tabbed explanation and a banner, and the first card
 * sat below all of it, past the first screen of a phone. Now the order is Quizlet's set
 * page: a compact title, the card, then everything else. The six ways to lay the cards
 * out (list, carousel, scroll, stack, gallery, table) became two jobs: STUDY, the card at
 * the top, and BROWSE, every card as a list (or the table, on decks of drawings) further
 * down. Carousel, stack, focus and drill were four ways of showing one card at a time,
 * which the study card now is.
 *
 * QUIZLET'S SET PAGE, ROUND 3 (owner, 15 Oct: "Decks are Quizlet-style"). Under the title
 * sits a row of study modes, Flashcards, Learn, Test, Match and Write, and the list at the
 * bottom is Quizlet's term list: question and answer side by side, a star on each row.
 * Learn is the study card over the cards not yet Got it, where a Missed or Unsure card goes
 * back to the end of the pass until you get it. Test, Match and Write are StudyModes.tsx.
 *
 * Ratings are saved in this browser under the same key as before, so nobody's progress is
 * lost (owner, 17 Sep: card saving stays local).
 *
 * Lazy (App.tsx), so a visitor who never opens a deck never downloads this page.
 */
export function DeckPage({ deck }: { deck: StudyDeck }) {
  /**
   * REAGENTS (owner, 2026-10-16). With the switch off, every forward reaction card shows
   * "?" where its reagents were, in the prompt here and over the arrow in its drawing
   * (Figure, through ReagentsHiddenContext). The cards keep their indexes, so ratings
   * and stars are untouched by the switch.
   */
  const [reagentsShown, setReagentsShown] = useState(readReagentsShown);
  const hasReagentCards = useMemo(() => deck.questions.some(hasReagents), [deck.questions]);
  const toggleReagents = () =>
    setReagentsShown((shown) => {
      try {
        localStorage.setItem(REAGENTS_KEY, shown ? "hidden" : "shown");
      } catch {
        /* private mode: the switch just is not remembered */
      }
      return !shown;
    });
  const questions = useMemo(
    () =>
      reagentsShown
        ? deck.questions
        : deck.questions.map((q) => (hasReagents(q) ? { ...q, q: hideReagents(q.q) } : q)),
    [deck.questions, reagentsShown],
  );
  // `useState` with a function runs it once, on the first render: the saved ratings are
  // read from storage before anything paints, so no save can overwrite them first.
  const [status, setStatus] = useState<Record<number, Status>>(() => loadSaved(deck.id).status ?? {});
  const [note, setNote] = useState(() => {
    const saved = loadSaved(deck.id).note;
    return typeof saved === "string" ? saved : "";
  });
  useEffect(() => {
    try {
      localStorage.setItem(progressKey(deck.id), JSON.stringify({ status, note }));
    } catch {
      /* private mode: progress just is not kept */
    }
  }, [status, note, deck.id]);

  const ratings = deckAllows(deck.features, "ratings");

  /**
   * CATEGORIES (owner, 2026-10-16: "sort by category, esp for large groups like
   * carbonyls"). A chip narrows every study mode and the card list to one category.
   * `all` is the cards in scope, still as indexes into the deck, so a rating, a star and
   * a Learn pass all keep the same card numbers whichever category is open.
   */
  const categories = useMemo(() => deckCategories(deck.questions), [deck.questions]);
  const [category, setCategory] = useState<string | null>(null);
  const everyIndex = useMemo(() => deck.questions.map((_, i) => i), [deck.questions]);
  const indexesFor = (label: string | null): number[] =>
    label === null ? everyIndex : [...(categories.find((c) => c.label === label)?.indexes ?? everyIndex)];
  const all = useMemo(
    () => (category === null ? everyIndex : [...(categories.find((c) => c.label === category)?.indexes ?? everyIndex)]),
    [category, categories, everyIndex],
  );
  // Test, Match and Write take a plain list of cards; this is the category's.
  const inScope = useMemo(() => all.map((i) => questions[i]!), [all, questions]);

  /**
   * One pass through the study card: which cards, in which order, and what to call it.
   *
   * The list is fixed when the pass starts. A "Missed and Unsure" pass that dropped each
   * card the moment you rated it Got it would shift every later card one place under you.
   * Review's Due today button opens a deck with `?due=1`, which starts on that pass.
   */
  const [pass, setPass] = useState(() => {
    const wantsDue = new URLSearchParams(window.location.hash.split("?")[1] ?? "").has("due");
    const due = all.filter((i) => isDue(status[i + 1]));
    return wantsDue && due.length
      ? { id: 0, label: "Missed and Unsure", queue: due }
      : { id: 0, label: "Every card", queue: all };
  });
  const [shuffled, setShuffled] = useState(false);
  const [starred, toggleStar] = useStars(deck.id);
  const PASS_LABEL = { missed: "Missed and Unsure", all: "Every card", starred: "Starred", learn: "Learn" } as const;
  const startPass = (which: keyof typeof PASS_LABEL, order: number[] = all) => {
    const queue =
      which === "missed"
        ? order.filter((i) => isDue(status[i + 1]))
        : which === "starred"
          ? order.filter((i) => starred.includes(i))
          : which === "learn"
            ? // Learn starts on what is not Got it yet, or on everything once it all is.
              order.filter((i) => status[i + 1] !== "green").length > 0
              ? order.filter((i) => status[i + 1] !== "green")
              : order
            : order;
    setPass((p) => ({ id: p.id + 1, label: PASS_LABEL[which], queue }));
  };

  // The study mode row. Learn needs ratings, so a deck that turned them off has four.
  const [mode, setMode] = useState<StudyMode>("flashcards");
  const modes: StudyMode[] = ratings
    ? ["flashcards", "learn", "test", "match", "write"]
    : ["flashcards", "test", "match", "write"];
  const chooseMode = (m: StudyMode) => {
    setMode(m);
    if (m === "learn") startPass("learn");
    else if (m === "flashcards") startPass("all");
  };
  const chooseCategory = (label: string | null) => {
    setCategory(label);
    setShuffled(false);
    startPass(mode === "learn" ? "learn" : "all", indexesFor(label));
  };
  const toggleShuffle = () => {
    const order = [...all];
    if (!shuffled) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
    }
    setShuffled(!shuffled);
    startPass(pass.label === "Missed and Unsure" ? "missed" : pass.label === "Starred" ? "starred" : "all", order);
  };

  const tally = useMemo(() => {
    const t = { red: 0, yellow: 0, green: 0 };
    for (const s of Object.values(status)) if (s === "red" || s === "yellow" || s === "green") t[s]++;
    return t;
  }, [status]);

  // Browse: every card, those still to learn, or the starred ones; and the table on decks
  // of drawings.
  const tableGroups = useMemo(() => questionsAsGroups(questions), [questions]);
  const [table, setTable] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "needs" | "starred">("all");
  const listed = all.filter((i) =>
    listFilter === "needs" ? (status[i + 1] ?? "none") !== "green" : listFilter === "starred" ? starred.includes(i) : true,
  );

  const rate = (num: number, s: Status) => setStatus((st) => ({ ...st, [num]: s }));
  /**
   * In Learn, a card you rate Missed or Unsure goes back on the end of the pass, so the
   * pass only ends once every card in it is Got it. The study card keeps its place: it is
   * the same pass (same key), just one card longer.
   */
  const rateInStudy = (num: number, s: Status) => {
    rate(num, s);
    if (pass.label === "Learn" && s !== "green") setPass((p) => ({ ...p, queue: [...p.queue, num - 1] }));
  };
  const reset = () => {
    setStatus({});
    setNote("");
    setMode("flashcards");
    setPass((p) => ({ id: p.id + 1, label: "Every card", queue: all }));
    try {
      localStorage.removeItem(progressKey(deck.id));
    } catch {
      /* ignore */
    }
  };

  return (
    <ReagentsHiddenContext.Provider value={!reagentsShown}>
    <main className="rv-deck min-h-screen pb-16">
      <div className={SITE_CONTAINER}>
        <PageHeader back={{ href: "#/study-decks", label: "Review" }} title={deck.title} />

        <div className="mx-auto max-w-2xl">
          <ModeSwitch modes={modes} mode={mode} onChange={chooseMode} />

          {(categories.length > 0 || hasReagentCards) && (
            <div className="rv-deck-tools">
              {categories.length > 0 && (
                <div className="rv-cats" role="group" aria-label="Category">
                  <button type="button" className="rv-chip" aria-pressed={category === null} onClick={() => chooseCategory(null)}>
                    All ({deck.questions.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      className="rv-chip"
                      aria-pressed={category === c.label}
                      onClick={() => chooseCategory(c.label)}
                    >
                      {c.label} ({c.indexes.length})
                    </button>
                  ))}
                </div>
              )}
              {hasReagentCards && (
                <button type="button" className="rv-switch" role="switch" aria-checked={reagentsShown} onClick={toggleReagents}>
                  <span className="rv-switch__track" aria-hidden>
                    <span className="rv-switch__thumb" />
                  </span>
                  Reagents {reagentsShown ? "shown" : "hidden"}
                </button>
              )}
            </div>
          )}

          <div id="study-panel" role="tabpanel" aria-label={MODE_WORDS[mode]} className="mt-6">
            {(mode === "flashcards" || mode === "learn") && (
              <>
                {mode === "learn" && (
                  <p className="mb-3 text-sm text-[var(--site-quiet)]">
                    The cards you have not got yet. Rate one Missed or Unsure and it comes back at the end.
                  </p>
                )}
                <DeckStudy
                  // A new pass is a new key, so the card goes back to the first one, question up.
                  key={pass.id}
                  questions={questions}
                  queue={pass.queue}
                  status={status}
                  label={pass.label}
                  onRate={ratings ? rateInStudy : null}
                  onStudyAgain={(which) => startPass(mode === "learn" ? "learn" : which)}
                />

                {/* Progress in words (replan section 8), under the card it counts. */}
                {ratings && (
                  <p className="mt-4 text-sm text-[var(--site-quiet)]">
                    {tallyWords(tally)} · {cardsWord(questions.length)}
                  </p>
                )}
                {mode === "flashcards" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {deckAllows(deck.features, "shuffle") && (
                      <button type="button" className="rv-flat" aria-pressed={shuffled} onClick={toggleShuffle}>
                        <Shuffle aria-hidden className="size-4" />
                        {shuffled ? "In order" : "Shuffle"}
                      </button>
                    )}
                    {ratings && pass.label === "Every card" && tally.red + tally.yellow > 0 && (
                      <button type="button" className="rv-flat" onClick={() => startPass("missed")}>
                        Study Missed and Unsure
                      </button>
                    )}
                    {pass.label === "Every card" && starred.length > 0 && (
                      <button type="button" className="rv-flat" onClick={() => startPass("starred")}>
                        Study the {starred.length} starred
                      </button>
                    )}
                    {pass.label !== "Every card" && (
                      <button type="button" className="rv-flat" onClick={() => startPass("all")}>
                        Study every card
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {/* Keyed by category, so a new category starts the mode over on its cards. */}
            {mode === "test" && <DeckTest key={category ?? ""} questions={inScope} />}
            {mode === "match" && <DeckMatch key={category ?? ""} questions={inScope} deckId={deck.id} />}
            {mode === "write" && (
              <DeckWrite
                key={category ?? ""}
                questions={inScope}
                // Write numbers its own list from 1; map that back to the deck's card number.
                onRate={ratings ? (num, s) => rate(all[num - 1]! + 1, s) : null}
              />
            )}
          </div>
        </div>

        <section aria-labelledby="every-card" className="mx-auto mt-14 max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="every-card" className="text-2xl font-extrabold text-[var(--bb-deep)] [font-family:var(--site-display)]">
              {category === null ? `Cards in this deck (${questions.length})` : `${category} (${all.length})`}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {tableGroups.length > 0 && (
                <button type="button" className="rv-chip" aria-pressed={table} onClick={() => setTable((t) => !t)}>
                  Table
                </button>
              )}
              {!table && (
                <>
                  <button type="button" className="rv-chip" aria-pressed={listFilter === "all"} onClick={() => setListFilter("all")}>
                    All
                  </button>
                  {ratings && (
                    <button type="button" className="rv-chip" aria-pressed={listFilter === "needs"} onClick={() => setListFilter("needs")}>
                      Not yet Got it
                    </button>
                  )}
                  <button type="button" className="rv-chip" aria-pressed={listFilter === "starred"} onClick={() => setListFilter("starred")}>
                    Starred ({starred.length})
                  </button>
                </>
              )}
              {deckAllows(deck.features, "reset") && (
                <ButtonHoldAndRelease
                  onConfirm={reset}
                  holdDuration={1200}
                  label="Hold to reset"
                  holdingLabel="Keep holding"
                  className="h-11 min-w-0 px-3"
                />
              )}
            </div>
          </div>

          {table ? (
            // Scanning every reaction at once shows which share a mechanism, which one
            // card at a time cannot. Hover previews stay off (owner, 15 Oct): a row opens
            // its drawing when tapped.
            <HoverDeck groups={tableGroups} quizMode hoverPreview={false} preview={TABLE_PREVIEW} />
          ) : listed.length > 0 ? (
            <TermList questions={questions} indexes={listed} status={status} starred={starred} onStar={toggleStar} />
          ) : (
            <p className="rv-card-box p-6 text-[var(--site-quiet)]">
              {listFilter === "starred" ? "Nothing starred yet. Tap the star on a card to keep it here." : "Every card here is Got it."}
            </p>
          )}
        </section>

        <div className="mx-auto mt-14 max-w-3xl">
          <DeckAbout text={deck.about} purpose={deck.purpose} funFact={deck.funFact} />
          <div className="mt-12 text-center text-sm text-[var(--site-quiet)]">
            {deck.footNote && <p>{deck.footNote}</p>}
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              Thank you for visiting {SITE_NAME}! I appreciate your time and interest in my work! If
              you have any questions, please feel free to reach out through my feedback form below!
            </p>
          </div>
          <FeedbackButton placeholder="What would make this more useful before the LCTA?" />
        </div>
      </div>
    </main>
    </ReagentsHiddenContext.Provider>
  );
}

export default DeckPage;
