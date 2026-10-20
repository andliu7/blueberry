import SlitTypeFaq, { type FaqItem } from "@/components/ui/slit-type-faq";

/**
 * Questions, at `#/faq`.
 *
 * The owner-supplied slit-type FAQ, recoloured to Blueberry and filled with
 * questions about this site. SiteChrome draws the header and footer around it
 * like any other site page.
 *
 * COLOURS. Light: Blueberry purple #5a3fd8 on the lavender ground (5.67:1).
 * Night: the night nav violet #a99bff on the navy ground (7.46:1). The paper is
 * transparent so the site's own wash shows through instead of a flat band with
 * hard edges, and the text on the purple flood is the ground colour itself
 * (--site-ground flips with `.dark`), so an open answer reads as a cut-out.
 * `onInk` is given outright: the component only computes it from hex values.
 *
 * HASH ROUTER. Copy-link and syncHash are off: they write "#question-id",
 * which on this site is a different route and would leave the page.
 */

// DRAFT COPY for Andrew to rewrite in his own voice. Every answer below is only
// what the repo shows to be true today (src/components/TermsPage.tsx, the
// "coming soon" plan card in src/components/ui/subscription-plans.tsx, the RDKit
// provenance in src/game/content/u1, the booking sheet). No prices, dates or
// promises: where something is not built, it says so.
const ITEMS: FaqItem[] = [
  {
    category: "The course",
    question: "What is Blueberry?",
    answerText:
      "An organic chemistry study site with a learning game inside it. There are review decks, reaction pages and lessons, and the Course is a path of short lessons you play through.",
    answer: (
      <p>
        An organic chemistry study site with a learning game inside it. There are review decks,
        reaction pages and lessons, and the <a href="#/app">Course</a> is a path of short lessons
        you play through.
      </p>
    ),
  },
  {
    category: "The course",
    question: "Which class does it cover?",
    answer:
      "CHEM 241 and 242, organic chemistry at the University of Maryland. It was built by a student while taking the class.",
  },
  {
    category: "Cost",
    question: "Is Blueberry free?",
    answer: "Yes. Nothing is on sale and no price is set. Everything on the site today stays free.",
  },
  {
    category: "Cost",
    question: "What does \"Plans coming soon\" mean?",
    answer:
      "Paid tiers may come later, but none can be bought today and none has a price. What is free now stays free.",
  },
  {
    category: "Chemistry",
    question: "How do you know the chemistry is right?",
    answer:
      "Structures and answers are worked out by RDKit, an open-source chemistry toolkit, in scripts that check each problem before it is added. Nothing is typed from memory. Textbooks such as OpenStax are read as a second check, not copied.",
  },
  {
    category: "Chemistry",
    question: "Can I practice drawing structures?",
    answer:
      "Not in the lessons yet. Drawing practice, where you sketch a molecule for naming and spectroscopy questions, is planned, with no date set.",
  },
  {
    category: "Office hours",
    question: "How do I book office hours?",
    answerText:
      "Open Schedule and sign in, then pick an open time and say what you want to go over. The confirmation lets you add it to your calendar or change the time.",
    answer: (
      <p>
        Open <a href="#/schedule">Schedule</a> and sign in, then pick an open time and say what you
        want to go over. The confirmation lets you add it to your calendar or change the time.
      </p>
    ),
  },
  {
    category: "Account",
    question: "What do you store about me?",
    answerText:
      "Signing in stores your email address, the name your sign-in provider gives, and a role. Course staff can see that; other students cannot. Ratings, notes, the focus timer and your picture stay in your own browser. Accounts are held by Supabase. The Terms page has the details.",
    answer: (
      <>
        <p>
          Signing in stores your email address, the name your sign-in provider gives, and a role.
          Course staff can see that; other students cannot.
        </p>
        <p>
          Ratings, notes, the focus timer and your picture stay in your own browser. Accounts are
          held by Supabase. The <a href="#/terms">Terms page</a> has the details.
        </p>
      </>
    ),
  },
  {
    category: "Account",
    question: "How do I delete my account?",
    answerText: "There is no button for it yet. Ask through the contact page.",
    answer: (
      <p>
        There is no button for it yet. Ask through the <a href="#/contact">contact page</a>.
      </p>
    ),
  },
  {
    category: "Using it",
    question: "Does it work on my phone?",
    answer:
      "Yes. It runs in the browser on phones, tablets and computers, so there is nothing to install. There is no app-store app.",
  },
  {
    category: "Using it",
    question: "I found a wrong answer. How do I report it?",
    answerText:
      "Use the contact form and say which lesson or deck, and what looks wrong. A screenshot helps. On a deck page, the Feedback button works too.",
    answer: (
      <p>
        Use the <a href="#/contact">contact form</a> and say which lesson or deck, and what looks
        wrong. A screenshot helps. On a deck page, the Feedback button works too.
      </p>
    ),
  },
];

const CATEGORIES = ["The course", "Cost", "Chemistry", "Office hours", "Account", "Using it"];

const SYSTEM_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function FaqPage() {
  return (
    <main className="relative min-h-screen">
      <h1 className="sr-only">Frequently asked questions</h1>
      <div className="mx-auto w-full max-w-7xl">
        <SlitTypeFaq
          items={ITEMS}
          headline={"Questions\nanswered"}
          intro="What Blueberry is, what it costs, and how the chemistry is checked."
          categories={CATEGORIES}
          defaultOpen={0}
          palette={{ paper: "transparent", ink: "#5a3fd8", onInk: "var(--site-ground)" }}
          darkPalette={{ paper: "transparent", ink: "#a99bff", onInk: "var(--site-ground)" }}
          theme="auto"
          copyLinks={false}
          syncHash={false}
          contact={{ prompt: "Spotted a mistake, or still stuck?", label: "Send feedback", href: "#/contact" }}
          displayFont="var(--site-display)"
          textFont={SYSTEM_FONT}
        />
      </div>
    </main>
  );
}

export default FaqPage;
