import { lazy, useEffect, useState } from "react";
import { useDecks } from "@/lib/useDecks";
import { isReference, DECK_GROUPS, type DeckGroupId } from "@/data/types";
import { HomePage } from "@/components/HomePage";
import { LoaderGate } from "@/components/ui/blueberry-loader";
import { entryModules, loadEntryGate, loadStartPage } from "@/lib/entryChunks";
import { useHashRoute } from "@/lib/useHashRoute";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { redirectFor } from "@/lib/redirects";
import { Redirect } from "@/components/Redirect";

/**
 * Split by route, because the whole site used to arrive as one 755 kB file.
 * Someone opening a single deck on phone data was downloading the workspace,
 * the admin panel, the contact form and every other page before their first
 * card rendered.
 *
 * `HomePage` is deliberately not lazy: it is the most common landing point and
 * splitting it would trade the bundle win for a blank frame on arrival.
 */
const ReferenceApp = lazy(() =>
  import("@/components/ReferenceApp").then((m) => ({ default: m.ReferenceApp })),
);
const FolderPage = lazy(() =>
  import("@/components/FolderPage").then((m) => ({ default: m.FolderPage })),
);
// Review (SITE-REPLAN.md phase 7): the Review page and a study deck are lazy too, so
// neither is in the entry bundle a visitor to home downloads.
const StudyDecksPage = lazy(() => import("@/components/StudyDecksPage"));
const DeckPage = lazy(() => import("@/components/review/DeckPage"));
const DashboardPage = lazy(() =>
  import("@/components/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const TermsPage = lazy(() =>
  import("@/components/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const ContactPage = lazy(() =>
  import("@/components/ContactPage").then((m) => ({ default: m.ContactPage })),
);
const FaqPage = lazy(() => import("@/components/FaqPage"));
// Only reachable by URL (andliu.dev links it); nothing on the site points here.
const PhonePage = lazy(() => import("@/components/PhonePage"));
const SignInPage = lazy(() =>
  import("@/components/SignInPage").then((m) => ({ default: m.SignInPage })),
);
const LessonsPage = lazy(() => import("@/components/LessonsPage").then((m) => ({ default: m.LessonsPage })));
// The entry gate and the funnel, lazy since phase 4d and warmed from home before the press
// that opens them (src/lib/entryChunks.ts says how, and why that keeps the old promise).
const EntryGateLazy = lazy(() => loadEntryGate().then((m) => ({ default: m.EntryGate })));
const StartPageLazy = lazy(() => loadStartPage().then((m) => ({ default: m.StartPage })));

/**
 * The real component when home has already loaded it, so the press never suspends; `lazy`
 * only for a cold deep link. React pattern: `useState` with an initializer runs once per
 * mount, so the component picked here never changes under a page that is showing (a change
 * would remount it and lose its state, the funnel's answers included).
 */
function EntryGateRoute() {
  const [Gate] = useState(() => entryModules.gate?.EntryGate ?? EntryGateLazy);
  return <Gate />;
}
function StartPageRoute({ step }: { step: string }) {
  const [Start] = useState(() => entryModules.start?.StartPage ?? StartPageLazy);
  return <Start step={step} />;
}
/* Split like the rest: the calendar pulls in the syllabus importer and the
   Radix dialog, and none of that should be in the bundle someone downloads to
   read a deck. */
/**
 * The game, and the one route on this site that is a whole other application.
 *
 * Lazy, and it matters more here than anywhere else: this is 87,000 lines of
 * app plus five engine packages, and a student who only ever reads the lessons
 * should never download it. Everything the game needs, including its own
 * stylesheet, arrives with this chunk.
 */
const GamePage = lazy(() => import("@/components/GamePage"));
/* Lazy because almost nobody lands on it, and its card art (the motif SVGs in
   testimonialArt.ts) was about 5 KB of every #/app cold load. */
const NotFoundPage = lazy(() => import("@/components/ui/404-page-not-found"));
/**
 * One page per unit of Organic Chemistry II. Lazy because a visitor who never
 * opens a unit should not download fifteen of them, and the unit data is 283
 * nodes of prose.
 */
const UnitPage = lazy(() => import("@/components/UnitPage"));
// Schedule: the calendar and office hours on one page (SITE-REPLAN.md phase 6).
const SchedulePage = lazy(() => import("@/components/SchedulePage"));
// Learn's index (SITE-REPLAN.md phase 5): units, reaction search, the Reference shelf.
const LearnPage = lazy(() => import("@/components/LearnPage"));
/* Lazy, and it matters more here than anywhere else on the site: this route
   pulls in Ketcher, which is roughly 19MB of WASM. Behind a page the student
   chooses to open, it stays out of the download for everyone who came to read
   a deck. */
const ReactionDrawPage = lazy(() => import("@/components/ReactionDrawPage"));
/* Also Ketcher, also lazy, for the same reason. */
const ReactionComposerPage = lazy(() => import("@/components/ReactionComposerPage"));
const WorkspaceRoute = lazy(() =>
  import("@/components/WorkspaceRoute").then((m) => ({ default: m.WorkspaceRoute })),
);


/**
 * Wraps a split route so its chunk arrives behind the berry, and the page only
 * shows once the berry's bar has finished. See `LoaderGate`.
 *
 * The loader says nothing but "Loading Blueberry" (to screen readers; on screen
 * it says nothing at all), and that is deliberate. This used to be DeckLoading,
 * which read "Looking for that deck..." while the game's chunk arrived, and was
 * reported as a 404 that never happened. A chunk that is still arriving has
 * nothing to say about whether the thing exists; the deck lookup keeps
 * DeckLoading, where a 404 is a real outcome.
 */
function withBoundary(node: React.ReactNode) {
  return <LoaderGate>{node}</LoaderGate>;
}

/**
 * The root only decides which page is showing. Decks live at #/deck/<id>, with
 * one exception: Grignard answers at the bare URL too, because that is the link
 * people already have and no bookmark of it should break. The hub sits behind
 * #/home, reached from the Home link on the title screen.
 */
export default function App() {
  const route = useHashRoute();
  useDocumentTitle(route);

  /**
   * Every route starts at the top.
   *
   * A hash change does not reset the scroll position, so clicking a deck from
   * halfway down the hub dropped you the same distance down the deck: past the
   * title screen and into the middle of the cards. The deck's own opening is
   * the first thing it wants to show you.
   */
  // A reaction sheet opening over a lesson (`#/lessons/<s>` to `#/lessons/<s>/<r>`)
  // is the same page, so it must not throw the lesson to the top under the sheet.
  const page = route.startsWith("lessons/") ? route.split("/").slice(0, 2).join("/") : route;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  /**
   * The bare URL is the hub.
   *
   * It used to be the Grignard deck, on the reasoning that the link classmates
   * already had should land on questions rather than on a landing page they
   * would have to click through mid-revision. That held while there was one
   * deck. There are eight now, the repository rename moved the address anyway,
   * and a front door that opens onto one arbitrary experiment is a worse
   * introduction than one that shows the shelf.
   *
   * `#/home` still works, so nothing that links to it breaks.
   */
  // Retired addresses first, so a retired route can never be shadowed by the
  // live page that used to answer it. The list is `lib/redirects`.
  const moved = redirectFor(route);
  if (moved) return <Redirect to={moved} />;

  if (route === "" || route === "home") return <HomePage />;
  // The entry moment: the one screen between Get Started and the first
  // question. It is the frame immediately after the most important press on
  // the site, so a chunk fetch there must never show: home warms this chunk
  // before the press (src/lib/entryChunks.ts), and LoaderGate shows nothing
  // for a chunk that is already there. See the note at the top of `EntryGate`.
  if (route === "enter") return withBoundary(<EntryGateRoute />);
  // The funnel itself, and deliberately not the price list: see the note at
  // the top of `StartPage`. Each step is its own address (`#/start/topics`),
  // so the back button walks the flow and a deep link into the middle renders.
  // `#/start` itself is the welcome beat; `EntryGate` skips it and lands on
  // `#/start/course`.
  if (route === "start" || route.startsWith("start/")) {
    return withBoundary(<StartPageRoute step={route.slice(6)} />);
  }
  // The game. It owns every hash under this prefix: "#/app" is the pathway,
  // "#/app/lesson/<node>" a lesson, "#/app/start/welcome" its onboarding. The
  // game parses the tail itself and this branch only decides whose router is
  // in charge, which is why a site route can never shadow a tab of the game's.
  if (route === "app" || route.startsWith("app/")) return withBoundary(<GamePage />);
  // "#/unit/u7" opens Aldehydes and Ketones. Bare "#/unit" falls to the first,
  // and so does an id that does not exist, because a stale link in somebody's
  // notes should land on the course rather than on nothing.
  if (route === "unit" || route.startsWith("unit/")) {
    return withBoundary(<UnitPage unitId={route.slice(5)} />);
  }
  if (route === "study-decks") return withBoundary(<StudyDecksPage />);
  if (route === "learn") return withBoundary(<LearnPage />);
  // `#/lessons/aromatics` opens that section directly, so the hub's topic list
  // can link to a section rather than to the top of the page and a hunt.
  if (route.startsWith("lessons/")) {
    // `#/lessons/enolate` opens a section; `#/lessons/enolate/aldol-addition`
    // opens that reaction's sheet over it, which is where search sends you.
    const [section, reaction] = route.slice(8).split("/");
    return withBoundary(<LessonsPage section={section} reaction={reaction} />);
  }
  if (route === "schedule") return withBoundary(<SchedulePage />);
  if (route === "new-reaction") return withBoundary(<ReactionComposerPage />);
  if (route.startsWith("draw/")) {
    return withBoundary(<ReactionDrawPage reactionId={route.slice(5)} />);
  }
  // `about` is the old address for what is now the contact page. About itself is
  // a card opened over whatever you were looking at, so it has no route at all.
  if (route === "contact" || route === "about") return withBoundary(<ContactPage />);
  if (route === "terms") return withBoundary(<TermsPage />);
  if (route === "faq") return withBoundary(<FaqPage />);
  if (route === "phone") return withBoundary(<PhonePage />);
  // The dashboard is pages now, not a card over the hub. `#/d` is its front
  // page and `#/d/settings` and friends are the sections.
  if (route === "d" || route.startsWith("d/")) {
    return withBoundary(<DashboardPage route={route} />);
  }
  // Unlinked from the nav on purpose; reached from the name on the About card,
  // which now points at the workspace and gets the sign-in card only if there
  // is nobody signed in.
  if (route === "workspace") return withBoundary(<WorkspaceRoute />);
  if (route === "signin") return withBoundary(<SignInPage mode="signin" />);
  if (route === "signup") return withBoundary(<SignInPage mode="signup" />);
  if (route === "staff") return withBoundary(<SignInPage mode="staff" />);

  if (route.startsWith("folder/")) {
    const gid = route.slice(7) as DeckGroupId;
    return DECK_GROUPS.some((g) => g.id === gid) ? (
      withBoundary(<FolderPage key={gid} groupId={gid} />)
    ) : (
      withBoundary(<NotFoundPage what="That folder" detail={`#/${route}`} />)
    );
  }

  // Everything reaching here should be a deck; anything else is a 404.
  if (!route.startsWith("deck/")) {
    return withBoundary(<NotFoundPage detail={`#/${route}`} />);
  }

  return <DeckRoute route={route} />;
}

/**
 * `#/deck/<id>`, the one route that looks a deck up by id.
 *
 * Its own component so `useDecks` runs only here. Called from `App`, it ran on
 * every page, and its first subscriber loads the built-in decks chunk (~38 KB
 * gzipped), which put that chunk on the game's cold load for nothing (validator
 * finding, 2026-10-20). Pages that list decks call `useDecks` themselves.
 */
function DeckRoute({ route }: { route: string }) {
  // Includes the published decks, which arrive a moment after the page does.
  // The router is what makes an uploaded deck reachable at its own URL rather
  // than only visible as a card on the hub.
  const { decks, loading } = useDecks();
  const id = route.slice(5);
  const deck = decks.find((d) => d.id === id);
  /**
   * An unknown deck used to fall through to the hub on the theory that a stale
   * bookmark should land somewhere useful. Silently swapping the page for a
   * different one is worse than saying so: someone following a link to a
   * renamed deck was left wondering whether they had misread it. The 404 says
   * what happened and offers the hub, which lands them in the same place with
   * an explanation.
   *
   * Not while the published decks are still in flight, though. Opening a link to
   * an uploaded deck would otherwise show a 404 for as long as the request took
   * and then replace it with the deck, which reads as the site being broken and
   * then changing its mind.
   */
  if (!deck) {
    return loading ? (
      <DeckLoading />
    ) : (
      withBoundary(<NotFoundPage what="That deck" detail={`#/${route}`} />)
    );
  }
  // Keyed so switching decks remounts rather than carrying the old deck's
  // ratings, open cards and scroll position across.
  if (isReference(deck)) return withBoundary(<ReferenceApp key={deck.id} deck={deck} />);
  return withBoundary(<DeckPage key={deck.id} deck={deck} />);
}

/**
 * Shown only in the gap between asking for a deck that is not built in and
 * hearing back about the published ones. Deliberately plain: a spinner that
 * appears for 300ms is noise, and a skeleton of a deck page would be a lie about
 * what is coming, since the answer is often a 404.
 */
function DeckLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-mono text-sm text-slate-400 dark:text-stone-500">Looking for that deck…</p>
    </div>
  );
}
