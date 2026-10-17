import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { ReactionSearch } from "@/components/learn/ReactionSearch";
import { ReactionSheet } from "@/components/learn/ReactionSheet";
import { useLearnReactions } from "@/components/learn/useLearnReactions";
import {
  lessonsFinished,
  lessonsOpened,
} from "@/components/learn/lessonsOpened";
import { DecisionCard } from "@/components/learn/DecisionCard";
import { DECKS } from "@/data/decks";
import { deckCount } from "@/data/types";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import {
  partReactions,
  partsForUnit,
  unitForFamily,
  unitParts,
} from "@/data/learnMap";
import { GAME_HREF } from "@/game/app/routes";
import { LearnRail, useRailNumbers } from "@/components/learn/LearnRail";
import "@/components/learn/learn.css";

/**
 * Learn, `#/learn` (SITE-REPLAN.md sections 3 and 8): the front door to the
 * course's reading. Four parts:
 *
 * 1. The shared page header (shell round 3) with the berry beside it. This is
 *    the only Learn page that keeps him; lessons and units open on their titles.
 * 2. The fifteen units as cards, each counting its lessons, reactions and
 *    practice from the one mapping table (data/learnMap.ts), never typed. First,
 *    since Learn round 2: they are what the page is for. Since round 3 each card
 *    draws its unit's representative reaction (the first reaction of its first
 *    lesson that has one, from the data: its product, named under it) and shows
 *    how many of its lessons this browser has opened. A unit with nothing in it
 *    yet is dashed, so it stops looking live.
 * 3. Reaction search, which is what the old #/reactions page became.
 * 4. The Reference shelf: the reference sheets (pKa, IR, NMR, resonance) and the
 *    Carbonyls decks, which the owner put under Learn on 28 Sep.
 *
 * `#/learn?search=open` (where #/reactions lands) scrolls to the search and
 * focuses it.
 *
 * LEARN ROUND 4: DENSER, AND ONE WAY IN. The unit cards drew one product each,
 * which left units without a reaction as tall blank cards and fitted one unit per
 * phone screen. Units are now compact rows (name, counts, progress), led by one
 * "Continue" card that names the next lesson to open, with that lesson's first
 * reaction drawn under it from 1024px. While a search is active the Reference
 * shelf steps aside, so the results are the page.
 *
 * LEARN ROUND 5: A PICTURE EVERYWHERE. Each unit card shows its unit's picture
 * (the starting material of its first reaction, small; the unit number where the data has
 * no reaction yet), so fifteen cards stop reading as one card repeated. The
 * units with nothing in them yet are one line under the grid, not three dashed
 * cards. The Continue card draws on a phone too, falls back to the unit's
 * reaction when its lesson has none (an Overview), shows the unit's lessons as a
 * row of small discs (done, here, later) and ends on one full-width button.
 *
 * S3 (16 Oct): ONE DECISION AND A RAIL. The page opens on a single decision card (the
 * next lesson, its picture, one button), the way Duolingo's Practice hub and Brilliant's
 * home open on one call. From 1024px a right rail sits beside it (learn/LearnRail.tsx:
 * streak, today's quests, cards due, next office hours), all read from real data on this
 * device or the server, with an honest empty state where there is none. On a phone the
 * rail stacks under the decision card. The layout is CSS grid areas in learn.css.
 */

/** Whether the address asked for the search to be open. Read once per visit. */
function searchRequested(): boolean {
  if (typeof window === "undefined") return false;
  const q = window.location.hash.indexOf("?");
  return (
    q !== -1 &&
    new URLSearchParams(window.location.hash.slice(q + 1)).get("search") ===
      "open"
  );
}

export function LearnPage() {
  const { reactions, canEdit, session, refresh, overrideFor } =
    useLearnReactions();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? (reactions.find((r) => r.id === openId) ?? null) : null;
  const [wantsSearch] = useState(searchRequested);
  // Read once per visit: initial state from a function runs on the first render only.
  // S3 round 2: progress is FINISHED lessons (read to the end); "opened" only picks
  // the button's verb, so pressing Back out of a lesson no longer moves the card on.
  const [finished] = useState(lessonsFinished);
  const [opened] = useState(lessonsOpened);
  // Streak, quests and cards due, read once for the rail.
  const railNumbers = useRailNumbers();

  // After the router's own scroll-to-top, which runs after this page's effects
  // (React runs a child's effects before its parent's), hence the frame's wait.
  useEffect(() => {
    if (!wantsSearch) return;
    const id = requestAnimationFrame(() =>
      document.getElementById("find")?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(id);
  }, [wantsSearch]);

  const reference = DECKS.filter((d) => d.group === "reference");
  const carbonyls = DECKS.filter((d) => d.group === "carbonyls");

  const unitCounts = useMemo(
    () =>
      new Map(
        PATHWAY_UNITS.map((u) => {
          // S3 round 4: a unit's lessons are its PARTS (data/learnMap.ts), so reading
          // Aromaticity for Unit 2 ticks Unit 2 and not Units 3 and 4 as well.
          const parts = partsForUnit(u.id);
          return [
            u.id,
            {
              lessons: parts.length,
              finished: parts.filter((p) => finished.has(p.key)).length,
              reactions: reactions.filter(
                (r) => unitForFamily(r.family) === u.id,
              ).length,
              practice: u.nodes.filter((n) => n.playable).length,
            },
          ];
        }),
      ),
    [reactions, finished],
  );
  const resume = resumeAt(finished);
  // The picture on the decision card: the first reaction of THIS unit's part of the
  // lesson, in the lesson's own family order. S3 round 4: never a reaction from another
  // unit (Unit 2's card drew Unit 3's bromination) and never a stand-in; a part with no
  // reaction of its own gets the unit's number instead of a drawing.
  const resumeReaction = resume
    ? partReactions(resume.part.lesson.id, resume.unit.id, reactions)[0]
    : undefined;
  // Units with nothing in them yet. S3 round 3: they stay on the path as dashed
  // "Coming later" stops, so its numbers run 1 to 15 without a gap.
  const later = PATHWAY_UNITS.filter((u) => {
    const c = unitCounts.get(u.id)!;
    return !c.lessons && !c.reactions && !c.practice;
  });
  // Whether the search has a query or a unit picked; the shelf steps aside while it does.
  const [searching, setSearching] = useState(false);

  return (
    <main className="learn relative min-h-screen text-foreground">
      <div className={`${SITE_CONTAINER} pb-10`}>
        {/* S3 round 5: the title alone. The course line under it made the header 186px
            tall, and the card is what the page is for. */}
        <PageHeader className="pt-5 pb-3 md:pt-6 md:pb-4" title="Learn" />

        {/* S3: two columns from 1024px. The decision card and the unit path on the
            left, the rail on the right, held in view while the page scrolls. On a
            phone the grid areas stack: card, the rail, the path, then the rest
            (S3 round 3: the streak and due cards sat three screens down under the
            path, so no phone user saw them). */}
        <div className="lrn-layout">
          <div className="lrn-layout-main">
            {resume ? (
              <DecisionCard
                resume={resume}
                reaction={resumeReaction}
                finished={finished}
                opened={opened}
                reactions={reactions}
              />
            ) : (
              <section
                aria-labelledby="resume-title"
                className="lrn-decide lrn-decide-plain"
              >
                <div className="lrn-decide-body">
                  <p className="lrn-eyebrow">All caught up</p>
                  <h2 id="resume-title" className="lrn-decide-title">
                    Every lesson is finished.
                  </h2>
                  <p className="text-[var(--site-quiet)]">
                    Practice is where it sticks now.
                  </p>
                  <a
                    href={GAME_HREF}
                    className="lrn-btn lrn-decide-btn mt-4 w-full"
                  >
                    Practise in the app
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </section>
            )}
          </div>

          <aside
            id="rail"
            className="lrn-layout-rail scroll-mt-20"
            aria-label="Your day"
          >
            <LearnRail numbers={railNumbers} />
          </aside>

          {/* S3 round 2: the units as one path, the course's progress spine. Each stop is
              a disc on a line: finished units green with a tick, the unit you are in
              filled violet with a "You are here" tag, the rest outlined. The line turns
              green under every finished unit. */}
          <section aria-labelledby="units-title" className="lrn-layout-units">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2
                id="units-title"
                className="title-face text-2xl font-extrabold text-[var(--bb-deep)]"
              >
                The path
              </h2>
              <p className="text-sm text-[var(--site-quiet)]">
                One stop per unit, in teaching order.
              </p>
            </div>
            <ol className="lrn-spine mt-4">
              {PATHWAY_UNITS.map((u) => {
                const { number, name } = unitParts(u);
                const c = unitCounts.get(u.id)!;
                // S3 round 3: "started" (some lessons finished, not all) draws a green arc
                // round the disc, and "soon" is a unit with nothing in it yet.
                const state = later.includes(u)
                  ? "soon"
                  : c.lessons > 0 && c.finished === c.lessons
                    ? "done"
                    : resume && u.id === resume.unit.id
                      ? "current"
                      : c.finished > 0
                        ? "started"
                        : "later";
                // How much of the arc is green, 0 to 100, read by the CSS as --pct.
                const pct = c.lessons
                  ? Math.round((100 * c.finished) / c.lessons)
                  : 0;
                // S3 round 4: a "Coming later" stop is not a link. Its page only said
                // there was nothing yet, so the arrow promised a place that was empty.
                const Stop = state === "soon" ? "div" : "a";
                return (
                  <li key={u.id} data-state={state}>
                    <Stop
                      href={state === "soon" ? undefined : `#/unit/${u.id}`}
                      className="lrn-stop"
                      aria-current={state === "current" ? "step" : undefined}
                    >
                      <span
                        className="lrn-stop-node"
                        aria-hidden
                        style={{ "--pct": pct } as CSSProperties}
                      >
                        {state === "done" ? (
                          <Check className="size-6" strokeWidth={3} />
                        ) : (
                          number.replace(/^Unit /, "")
                        )}
                      </span>
                      <span className="lrn-stop-card">
                        <span className="lrn-stop-body">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="lrn-eyebrow">{number}</span>
                            {state === "current" && (
                              <span className="lrn-here">You are here</span>
                            )}
                            {state === "done" && (
                              <span className="lrn-tag">Finished</span>
                            )}
                            {state === "soon" && (
                              <span className="lrn-tag">Coming later</span>
                            )}
                          </span>
                          <span className="title-face block leading-tight font-extrabold text-[var(--bb-deep)]">
                            {name}
                          </span>
                          <span className="block text-sm text-[var(--site-quiet)]">
                            {[
                              c.lessons
                                ? `${c.finished} of ${c.lessons} ${c.lessons === 1 ? "lesson" : "lessons"} finished`
                                : null,
                              c.reactions
                                ? `${c.reactions} ${c.reactions === 1 ? "reaction" : "reactions"}`
                                : null,
                              c.practice ? `${c.practice} to practise` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "No lessons or practice yet"}
                          </span>
                        </span>
                        {state === "soon" ? (
                          <Clock
                            className="size-5 shrink-0 text-[var(--site-quiet)]"
                            aria-hidden
                          />
                        ) : (
                          <ArrowRight
                            className="size-5 shrink-0 text-[var(--lrn-ink)]"
                            aria-hidden
                          />
                        )}
                      </span>
                    </Stop>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="lrn-layout-rest">
            <section
              id="find"
              aria-labelledby="find-title"
              className="scroll-mt-24"
            >
              <h2
                id="find-title"
                className="title-face text-2xl font-extrabold text-[var(--bb-deep)]"
              >
                Find a reaction
              </h2>
              <div className="mt-3">
                <ReactionSearch
                  reactions={reactions}
                  onOpen={setOpenId}
                  autoFocus={wantsSearch}
                  onSearchingChange={setSearching}
                />
              </div>
            </section>

            {!searching && (
              <section aria-labelledby="shelf-title" className="mt-10">
                <h2
                  id="shelf-title"
                  className="title-face text-2xl font-extrabold text-[var(--bb-deep)]"
                >
                  Reference
                </h2>
                <p className="mt-1 text-sm text-[var(--site-quiet)]">
                  The charts you look up mid-problem, and the carbonyl decks.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {reference.map((d) => (
                    <ShelfTile
                      key={d.id}
                      href={`#/deck/${d.id}`}
                      title={d.title}
                      meta={`${deckCount(d)} rows`}
                    />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
                    Carbonyls
                  </h3>
                  <a
                    href="#/folder/carbonyls"
                    className="lrn-link inline-flex min-h-11 items-center gap-1 text-sm"
                  >
                    The whole folder <ArrowRight className="size-4" />
                  </a>
                </div>
                <div className="lrn-row mt-2">
                  {carbonyls.map((d) => (
                    <div key={d.id} className="w-60 shrink-0">
                      <ShelfTile
                        href={`#/deck/${d.id}`}
                        title={d.title}
                        meta={`${deckCount(d)} cards`}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <ReactionSheet
        reaction={open}
        onClose={() => setOpenId(null)}
        canEdit={canEdit}
        idToken={session?.idToken ?? null}
        overrides={open ? overrideFor(open.id) : undefined}
        onSaved={refresh}
      />
    </main>
  );
}

/**
 * Where the decision card points: the first unit with a lesson finished and one
 * not yet finished; failing that, the first unit with a lesson not yet finished
 * (Lesson 1 of Unit 1 for a new visitor). Null once every lesson is finished.
 * S3 round 2: reads FINISHED lessons, so opening a lesson and pressing Back
 * leaves the card where it was. S3 round 4: a unit's lessons are its parts
 * (data/learnMap.ts), so a lesson read for Unit 2 does not finish Unit 3.
 */
function resumeAt(finished: ReadonlySet<string>) {
  const units = PATHWAY_UNITS.map((unit) => ({
    unit,
    parts: partsForUnit(unit.id),
  }));
  const unread = (u: (typeof units)[number]) =>
    u.parts.some((p) => !finished.has(p.key));
  const begun = (u: (typeof units)[number]) =>
    u.parts.some((p) => finished.has(p.key));
  const pick = units.find((u) => unread(u) && begun(u)) ?? units.find(unread);
  if (!pick) return null;
  const index = pick.parts.findIndex((p) => !finished.has(p.key));
  return {
    unit: pick.unit,
    parts: pick.parts,
    part: pick.parts[index]!,
    index,
    started: begun(pick),
  };
}

function ShelfTile({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <a href={href} className="lrn-tap h-full gap-1 p-4">
      <BookOpen className="size-5 text-[var(--lrn-ink)]" aria-hidden />
      <span className="title-face leading-tight font-extrabold text-[var(--bb-deep)]">
        {title}
      </span>
      <span className="text-sm text-[var(--site-quiet)]">{meta}</span>
    </a>
  );
}

export default LearnPage;
