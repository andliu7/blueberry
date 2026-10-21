/**
 * Tips and quotes, shown one at a time while a page loads (the berry loader) and once per
 * visit on the home page (owner, 20 Oct: "a study tips list so that you can give students
 * study tips and tips on how to use the app as the pages load or when they open the site.
 * There should also be famous quotes to motivate them.").
 *
 * Three lists:
 *   STUDY_TIPS  how to study organic chemistry. Method only, never a chemistry fact: a fact
 *               shown to a student has to come from RDKit or the course key, and a one line
 *               tip is no place for one.
 *   APP_TIPS    how to use Blueberry, each one checked against the code on 21 Oct. When a
 *               feature moves or is renamed, the tip that names it moves with it.
 *   QUOTES      real lines by real people, each with the work it comes from. Every one was
 *               checked against a source before it went in, and the ones that failed the
 *               check are listed at the bottom of this file so nobody adds them back.
 *
 * This file is only ever loaded with `import()`, so none of it is in the first-load bundle.
 *
 * The rotation is at the bottom: a shuffle seeded by the date, walked one step per showing,
 * so every visitor gets a different line each time and never the same line twice in a row.
 */

export type TipKind = "study" | "app" | "quote";

export interface TipLine {
  /** Stable, so "the last line shown" survives this list being reordered. */
  readonly id: string;
  readonly kind: TipKind;
  readonly text: string;
  /** Quotes only: who said or wrote it. */
  readonly author?: string;
  /** Quotes only: where it was said or written, specific enough to look up. */
  readonly source?: string;
  /** True when the tip is about a keyboard key, so a phone never shows it. */
  readonly keyboard?: boolean;
}

/* ------------------------------------------------------------ study tips -- */

export const STUDY_TIPS: readonly TipLine[] = [
  { id: "s-draw-by-hand", kind: "study", text: "Draw every mechanism by hand, arrows and all, before you look at the answer." },
  { id: "s-arrows-electrons", kind: "study", text: "Every curved arrow starts at electrons: a lone pair or a bond. If you cannot point to them, redraw the arrow." },
  { id: "s-mechanism-not-product", kind: "study", text: "Learn the mechanism, not just the product. One mechanism explains a dozen reactions; one memorised product explains one." },
  { id: "s-cover-answer", kind: "study", text: "Work problems with the answer covered. Reading a worked solution feels like learning, and mostly is not." },
  { id: "s-short-often", kind: "study", text: "Twenty minutes a day beats three hours the night before. Short and often is how it sticks." },
  { id: "s-why-wrong", kind: "study", text: "When you miss one, write a single line on why. That line is worth more than the right answer." },
  { id: "s-model-kit", kind: "study", text: "If stereochemistry will not click, build the molecule with a model kit and turn it in your hands." },
  { id: "s-hidden-h", kind: "study", text: "Practise reading skeletal structures until you can see every hidden hydrogen without drawing it." },
  { id: "s-say-it", kind: "study", text: "Explain a mechanism out loud, to a friend or to an empty chair. The gaps show up fast." },
  { id: "s-group-by-job", kind: "study", text: "Group reactions by what they do, like making a carbon to carbon bond, not by which chapter they were in." },
  { id: "s-backwards", kind: "study", text: "Work synthesis problems backwards: start at the product and ask what it could have been one step earlier." },
  { id: "s-exam-conditions", kind: "study", text: "Before an exam, practise the way the exam will be: on paper, no notes, against a timer." },
  { id: "s-mix-types", kind: "study", text: "Mix problem types in one sitting. It feels harder than doing ten of the same kind, and it works better." },
  { id: "s-sleep", kind: "study", text: "Sleep the night before the exam. Memory settles while you sleep, and a tired brain loses easy marks." },
  { id: "s-test-twice", kind: "study", text: "Quiz yourself the day you learn something, then again a few days later. The second time is the one that counts." },
  { id: "s-count-carbons", kind: "study", text: "Count the carbons in the starting material and in the product, then find where each new one came from." },
  { id: "s-charges", kind: "study", text: "Track formal charges at every step. A charge that appears from nowhere means an arrow is missing." },
  { id: "s-reagent-sheet", kind: "study", text: "Keep one page of the reagents you keep mixing up, and rewrite it from memory once a week." },
  { id: "s-office-hours", kind: "study", text: "Bring the exact problem you got stuck on to office hours. A specific question gets a specific answer." },
  { id: "s-read-ahead", kind: "study", text: "Skim the next lecture's section for ten minutes before class, so the lecture is your second look, not your first." },
  { id: "s-one-hint", kind: "study", text: "Stuck for ten minutes? Look at one hint, not the whole answer, then try again." },
  { id: "s-where-electrons", kind: "study", text: "For every step ask two questions: where are the electrons, and where do they want to go?" },
  { id: "s-redo-old", kind: "study", text: "Redo a problem you got wrong last week, with no notes. If it is right now, you learned it." },
  { id: "s-phone-away", kind: "study", text: "Put your phone in another room while you study. Out of reach beats on silent." },
  { id: "s-own-cards", kind: "study", text: "Make your own cards for reagents: the reagent on the front, what it does on the back." },
];

/* -------------------------------------------------------------- app tips -- */

/**
 * Each tip names the place in the app where its feature lives, as of 21 Oct:
 *   header tools        src/game/app/routes.ts ("periodic", "search", placement "tool")
 *   Due today           src/components/review/DeckPage.tsx (Missed and Unsure cards)
 *   rating keys         src/components/review/DeckStudy.tsx (RATES: 1, 2, 3; Enter flips)
 *   site search         src/components/GlobalSearch.tsx ("/" and Ctrl+K, site pages only)
 *   charge              src/game/charge/chargeMeterModel.ts ("mistakes never cost charge")
 *   guidebook           src/game/pathway-sheet/NodeSheet.tsx (the guidebook button)
 *   study modes         src/game/tabs/cards/DeckSet.tsx (practice never touches the schedule)
 *   import              src/game/tabs/cards/CardsShelf.tsx (CSV, Anki text, Blueberry JSON)
 *   focus timer         src/components/SchedulePage.tsx FocusCard, src/lib/useFocusTimer.ts
 *   break               src/lib/featureIndex.ts ("Break: Tetris and sound")
 *   arrow style, pKa    src/game/tabs/me/MeTab.tsx (Me, Settings)
 *   quests              src/game/tabs/feed/feedModel.ts (three daily quests)
 */
export const APP_TIPS: readonly TipLine[] = [
  { id: "a-header-tools", kind: "app", text: "The periodic table and reaction search are in the header of every Practice tab, even mid lesson." },
  { id: "a-due-today", kind: "app", text: "Due today in Review holds the cards you marked Missed or Unsure. Clear those first." },
  { id: "a-rate-keys", kind: "app", text: "Studying a deck on a keyboard? Enter flips the card, the arrow keys move, and 1, 2, 3 rate it.", keyboard: true },
  { id: "a-search-key", kind: "app", text: "Press / or Ctrl+K on any site page to search lessons, decks and reactions.", keyboard: true },
  { id: "a-charge-mistakes", kind: "app", text: "Wrong answers never cost charge. Guess, check, and learn from the answer." },
  { id: "a-charge-refills", kind: "app", text: "Out of charge? It refills on its own. Review your cards while you wait." },
  { id: "a-guidebook", kind: "app", text: "Tap a lesson on the path, then its guidebook button, to read the ideas before you play it." },
  { id: "a-practice-modes", kind: "app", text: "Flashcards, Test, Match and Write in the Cards tab are practice. They never change your review schedule." },
  { id: "a-import", kind: "app", text: "Have Anki cards or a spreadsheet of terms? Import them in the Cards tab as a deck of their own." },
  { id: "a-focus", kind: "app", text: "Start a 25 minute focus session from Schedule. The timer stays in the header on every page." },
  { id: "a-eye-rest", kind: "app", text: "The focus timer reminds you to rest your eyes every twenty minutes. Look at something far away." },
  { id: "a-break", kind: "app", text: "Breaks in the focus timer come with Tetris and rain sounds, if you want them." },
  { id: "a-arrow-style", kind: "app", text: "Prefer a different arrow? In Me, then Settings, pick how your drag draws it." },
  { id: "a-pka", kind: "app", text: "Your professor uses different pKa numbers? Set them in Me, then Settings, then pKa values." },
  { id: "a-quests", kind: "app", text: "The Feed tab has three daily quests. They reset every day." },
];

/* ---------------------------------------------------------------- quotes -- */

/**
 * Checked 21 Oct 2026 by web search against the sources named. Translations are named where
 * the wording belongs to a translator. Wording is the source's, letter for letter, except that
 * dashes are written as commas or semicolons.
 */
export const QUOTES: readonly TipLine[] = [
  {
    id: "q-newton-giants", kind: "quote",
    text: "If I have seen further it is by standing on the shoulders of Giants.",
    author: "Isaac Newton", source: "Letter to Robert Hooke, 5 February 1675/6",
  },
  {
    id: "q-pasteur-prepared", kind: "quote",
    text: "In the fields of observation chance favors only the prepared mind.",
    author: "Louis Pasteur", source: "Lecture at the University of Lille, 7 December 1854",
  },
  {
    id: "q-einstein-questioning", kind: "quote",
    text: "The important thing is not to stop questioning. Curiosity has its own reason for existence.",
    author: "Albert Einstein", source: "Interview with William Miller, LIFE, 2 May 1955",
  },
  {
    id: "q-feynman-fool", kind: "quote",
    text: "The first principle is that you must not fool yourself, and you are the easiest person to fool.",
    author: "Richard Feynman", source: "\"Cargo Cult Science\", Caltech commencement address, 1974",
  },
  {
    id: "q-feynman-create", kind: "quote",
    text: "What I cannot create, I do not understand.",
    author: "Richard Feynman", source: "His Caltech blackboard, February 1988 (photograph, Caltech Archives)",
  },
  {
    id: "q-feynman-names", kind: "quote",
    text: "I learned very early the difference between knowing the name of something and knowing something.",
    author: "Richard Feynman", source: "What Do You Care What Other People Think? (1988), \"The Making of a Scientist\"",
  },
  {
    id: "q-seneca-dare", kind: "quote",
    text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.",
    author: "Seneca", source: "Letters to Lucilius, Letter 104",
  },
  {
    id: "q-seneca-postponing", kind: "quote",
    text: "While we are postponing, life speeds by.",
    author: "Seneca", source: "Letters to Lucilius, Letter 1 (trans. Richard M. Gummere)",
  },
  {
    id: "q-aurelius-way", kind: "quote",
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius", source: "Meditations 5.20 (trans. Gregory Hays)",
  },
  {
    id: "q-douglass-struggle", kind: "quote",
    text: "If there is no struggle there is no progress.",
    author: "Frederick Douglass", source: "West India Emancipation speech, Canandaigua, New York, August 1857",
  },
  {
    id: "q-washington-obstacles", kind: "quote",
    text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which he has overcome while trying to succeed.",
    author: "Booker T. Washington", source: "Up From Slavery (1901), chapter 2",
  },
  {
    id: "q-kennedy-hard", kind: "quote",
    text: "We choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard.",
    author: "John F. Kennedy", source: "Address at Rice University, 12 September 1962",
  },
  {
    id: "q-beckett-fail-better", kind: "quote",
    text: "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.",
    author: "Samuel Beckett", source: "Worstward Ho (1983)",
  },
  {
    id: "q-king-keep-moving", kind: "quote",
    text: "If you can't fly, run; if you can't run, walk; if you can't walk, crawl; but by all means keep moving.",
    author: "Martin Luther King Jr.", source: "\"Keep Moving from This Mountain\", Spelman College, 10 April 1960",
  },
  {
    id: "q-aristotle-doing", kind: "quote",
    text: "For the things we have to learn before we can do them, we learn by doing them.",
    author: "Aristotle", source: "Nicomachean Ethics, Book II (trans. W. D. Ross)",
  },
  {
    id: "q-confucius-thought", kind: "quote",
    text: "Learning without thought is labour lost; thought without learning is perilous.",
    author: "Confucius", source: "Analects 2.15 (trans. James Legge)",
  },
  {
    id: "q-mandela-education", kind: "quote",
    text: "Education is the most powerful weapon we can use to change the world.",
    author: "Nelson Mandela", source: "Speech at the launch of Mindset Network, Johannesburg, 16 July 2003",
  },
  {
    id: "q-franklin-diligence", kind: "quote",
    text: "Diligence is the mother of good luck.",
    author: "Benjamin Franklin", source: "The Way to Wealth (1758), as Poor Richard",
  },
  {
    id: "q-roosevelt-cannot", kind: "quote",
    text: "You must do the thing you think you cannot do.",
    author: "Eleanor Roosevelt", source: "You Learn by Living (1960)",
  },
  {
    id: "q-curie-perseverance", kind: "quote",
    text: "Life is not easy for any of us. But what of that? We must have perseverance and above all confidence in ourselves.",
    author: "Marie Curie", source: "as quoted in Eve Curie, Madame Curie (1937)",
  },
  {
    id: "q-curie-remains", kind: "quote",
    text: "One never notices what has been done; one can only see what remains to be done.",
    author: "Marie Curie", source: "Letter to her brother, 1894",
  },
];

export const ALL_LINES: readonly TipLine[] = [...STUDY_TIPS, ...APP_TIPS, ...QUOTES];

/* -------------------------------------------------------------- rotation -- */

/**
 * mulberry32: a tiny seeded random number generator. Same seed, same sequence, which is
 * what makes "seeded per day" work: every visitor's shuffle for a given date is the same.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day number for a date, counted in the visitor's own time zone. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** 0 .. n-1 in an order fixed by `day` (a Fisher-Yates shuffle with the seeded generator). */
export function dayOrder(n: number, day: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(day);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * The line to show, as a pure function so it can be tested without storage.
 *
 * `count` is how many lines this visitor has already been shown today. Walking a shuffle
 * one step at a time never repeats a line until all of them have been seen, and two
 * neighbours in a shuffle are always different lines, including the wrap from the last
 * back to the first. The one place a repeat could sneak in is the day boundary (the last
 * line of yesterday's walk could open today's), which is what `lastId` guards: if the next
 * line is the one shown last, step over it.
 *
 * Returns the line and the count to store for next time.
 */
export function pickLine(
  lines: readonly TipLine[],
  day: number,
  count: number,
  lastId: string | null,
): { line: TipLine; count: number } {
  const order = dayOrder(lines.length, day);
  let step = count;
  let line = lines[order[step % lines.length]];
  if (lines.length > 1 && line.id === lastId) {
    step += 1;
    line = lines[order[step % lines.length]];
  }
  return { line, count: step + 1 };
}

const STORE_KEY = "blueberry_tip";

/**
 * The next line for this visitor, remembered in localStorage so the loader and the home
 * page share one walk and never show the same line back to back. Storage can be missing
 * (private mode, blocked site data); then every call still returns a line, just without
 * the memory. Keyboard tips are left out on touch screens.
 */
export function nextLine(now: Date = new Date()): TipLine {
  const touch = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches === true;
  const lines = touch ? ALL_LINES.filter((l) => !l.keyboard) : ALL_LINES;
  const today = dayNumber(now);

  let saved: { day?: number; count?: number; last?: string } = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") ?? {};
  } catch {
    /* no storage, or a value this version did not write: start the day fresh */
  }
  const count = saved.day === today && typeof saved.count === "number" ? saved.count : 0;
  const picked = pickLine(lines, today, count, typeof saved.last === "string" ? saved.last : null);

  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ day: today, count: picked.count, last: picked.line.id }));
  } catch {
    /* as above: the line still shows, it just is not remembered */
  }
  return picked.line;
}

/*
 * LEFT OUT, and why (checked 21 Oct 2026). Do not add these back without a primary source.
 *
 *   "Genius is one percent inspiration, ninety-nine percent perspiration." (Edison)
 *       The exact wording first appears in Harper's Monthly in 1932, a year after he died;
 *       earlier versions give other percentages. Wording not his for certain.
 *   "I have not failed. I've just found 10,000 ways that won't work." (Edison)
 *       No contemporary source.
 *   "Learning is not attained by chance, it must be sought for with ardor..." (Abigail Adams)
 *       Not found in her letters to John Quincy Adams in the Adams Papers, the letter it is
 *       usually credited to included. Only quote sites carry it.
 *   "Nothing in the world is worth having or worth doing unless it means effort..."
 *   (Theodore Roosevelt)
 *       Credited to two different speeches (Syracuse 1903, Des Moines 1910); neither confirmed.
 *   "Far better is it to dare mighty things..." (Theodore Roosevelt, 1899)
 *       Real, but the word order differs between the 1899 newspaper text and the 1901 book,
 *       and the primary text could not be opened to settle it.
 *   "Nothing in life is to be feared, it is only to be understood." (Marie Curie)
 *       Only in secondary books, decades later, with no primary source.
 *   "We are what we repeatedly do. Excellence, then, is not an act, but a habit." (Aristotle)
 *       Will Durant's 1926 summary of Aristotle, not Aristotle.
 *   "Success is not final, failure is not fatal..." (Churchill)
 *       Not found in anything Churchill said or wrote.
 *   "It always seems impossible until it's done." (Mandela)
 *       No speech or text found.
 *   "Education is not the filling of a pail but the lighting of a fire." (Yeats)
 *       Not Yeats; a loose paraphrase of Plutarch's On Listening.
 *   "Education is the most powerful weapon which you can use..." (Mandela, the common wording)
 *       Kept in the 2003 speech's own wording, "we can use", instead.
 */
