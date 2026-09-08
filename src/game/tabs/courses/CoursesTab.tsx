/**
 * Courses: the six in CLAUDE.md, each opening to its topics, each topic
 * opening to a lesson over the corpus problems authored for it.
 *
 * The route carries the drill down (#/courses, #/courses/orgo_2,
 * #/courses/orgo_2/aromaticity) so a refresh or a shared link lands on the
 * same screen. DAT and MCAT home no topics by design (placement.ts), so they
 * list every content course's topics through probeTopicIdsForCourse, which is
 * the same rule the placement quiz uses.
 *
 * Free tier: the introductory lessons are free and never gated. Nothing here
 * checks an entitlement, and nothing here should: the paid gate is server side
 * in Phase 6 and the only client side mention of it is the soft card at the
 * end of onboarding.
 */

import { useMemo } from "react";
import {
  ALL_COURSE_IDS,
  probeTopicIdsForCourse,
  topicDefinition,
  type CourseId,
  type TopicId,
} from "@blueberry/curriculum";
import { Pill } from "../../app/ui/Card";
import { hrefForTab } from "../../app/routes";
import { COURSE_COMING, isCourseOpen } from "../../app/courses";
import { navigate } from "../../app/useHashRoute";
import { useProgress } from "../../app/hooks";
import { LessonPlayer } from "../../lesson/LessonPlayer";
// Re-exported so existing importers keep their path while the data itself
// lives outside this lazy chunk. See courseCopy.ts for why.
export {
  COURSE_LABEL,
  COURSE_BLURB,
  COURSE_SHORT,
  COURSE_MARK,
  problemsForTopic,
} from "./courseCopy";
import { COURSE_BLURB, COURSE_LABEL, COURSE_MARK, problemsForTopic } from "./courseCopy";


function isCourseId(value: string): value is CourseId {
  return (ALL_COURSE_IDS as readonly string[]).includes(value);
}


/**
 * The course list, one open course and five greyed.
 *
 * WHY A GREYED CARD AND NOT A MISSING ONE. Owner amendment of 2026-08-28: the
 * closed courses "render greyed with an honest coming treatment, never a dead
 * end and never a broken link". A student who was told this app covers General
 * Chemistry and finds no mention of it concludes the app lied; one who finds a
 * card saying what it is waiting on concludes it is being built. Same reasoning
 * as app/ui/NotOpenYet.tsx, one layer down.
 *
 * THE OPEN ONE LEADS, AND IT IS NOT A SIXTH OF THE SCREEN. Round one drew all
 * six as equal cards in source order, which put the one course a student can
 * actually open fourth, in white, surrounded by five larger-looking greyed ones.
 * That is the hierarchy exactly backwards: the loudest thing on the screen was
 * the part of the product that does not exist yet. So this is two sections and
 * not one grid. The open course is a full width card with the primary border
 * and the entry action on it; the five are a compact list underneath, under a
 * heading that says what they are. mobile-ui's rule that a section extends in
 * one direction only is satisfied by both halves.
 *
 * WHAT "GREYED" MEANS MECHANICALLY, and it is not `opacity: 0.6` on the whole
 * row. Fading a row fades its text with it, and text under an opacity is text
 * that quietly stops meeting the contrast floor in the Budgets table. So a
 * closed row keeps full strength ink and drops the two things that say
 * PRESSABLE: it is a <div> and not an <a>, and it is a dashed outline on the
 * page ground rather than a raised card. What is greyed is the affordance.
 *
 * Each closed row is still announced as unavailable through `aria-disabled`,
 * and the coming line is the accessible reason.
 */
function CourseList() {
  const snapshot = useProgress();
  const open = ALL_COURSE_IDS.filter((course) => isCourseOpen(course));
  const closed = ALL_COURSE_IDS.filter((course) => !isCourseOpen(course));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-10 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">Courses</h1>
        <p className="text-scale-sm text-bb-muted-foreground">
          One is open. The other five are scoped, and they arrive in the order below.
        </p>
      </div>

      {open.map((course) => {
        const topics = probeTopicIdsForCourse(course);
        const done = topics.filter((topic) => snapshot.lessons[topic] !== undefined).length;
        return (
          /* THE OUTLINE IS ON THE PRESSABLE, not on a box inside it.
             It used to be on the inner div, so the thing a student actually
             presses had no cut edge of its own and the audit counted 8 rows of
             rule 4 on it. Moving it up is also one box instead of two, which is
             the note Hud.tsx already carries: a pill inside a pill is two
             boxes. The primary border is still the only one on the screen, and
             it still says "this is the one thing you can press". */
          <a
            key={course}
            href={hrefForTab("courses", course)}
            className="press block rounded-2xl border-2 border-[color:var(--bb-primary-ink)] bg-bb-card"
          >
            <div className="flex flex-col gap-3 p-5">
              {/* THE EMBLEM SITS BESIDE THE NAME AND NOTHING ELSE SHARES THAT
                  ROW. At 390px the mark takes 56 of the card's width and the
                  status pill took another 90, which left "Organic Chemistry II"
                  about 150px and broke it over two lines with the pill floating
                  beside the first. The pill is a status, so it belongs on the
                  status row at the bottom with the count it qualifies. */}
              <div className="flex items-center gap-3">
                {/* THE DISC CARRIES THE COLOUR AND THE MARK RECEDES INTO IT.
                    Same object and same reasoning as app/ui/NotOpenYet.tsx and
                    the Me tab's rows: colour appears as a SURFACE, per sticker
                    rules 5 and 6, and a purple monogram on a purple tint would
                    be the palette twice and the surface never. The outline is
                    the one place the hue is allowed to be line work, because
                    that is what says the object is pressable. */}
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:var(--bb-primary-ink)] bg-[color:var(--tab-active)] font-bold text-bb-foreground ${
                    COURSE_MARK[course].length > 2 ? "text-scale-sm" : "text-scale-lg"
                  }`}
                >
                  {COURSE_MARK[course]}
                </span>
                <h2 className="bb-title-face min-w-0 flex-1 text-scale-xl font-bold leading-tight text-bb-foreground">
                  {COURSE_LABEL[course]}
                </h2>
              </div>
              <p className="text-scale-sm text-bb-muted-foreground">{COURSE_BLURB[course]}</p>
              {/* NO BUTTON INSIDE THE CARD. The whole card is the link, and a
                  filled pill inside a link is a control inside a control: two
                  press targets for one action, and mobile-ui's "do not nest"
                  applied to affordances rather than to padding. It is also what
                  the reference course picker does, which is nothing: the tile
                  IS the button. */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-scale-xs font-semibold text-bb-muted-foreground">
                  {done} of {topics.length} topics done
                </span>
                {snapshot.course === course ? <Pill tone="primary">Your track</Pill> : null}
              </div>
            </div>
          </a>
        );
      })}

      <section className="flex flex-col gap-2">
        <h2 className="text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">Being authored</h2>
        {closed.map((course) => (
          <div
            key={course}
            aria-disabled
            className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-bb-border px-4 py-3"
          >
            {/* The same emblem, neutral rather than coloured, and its edge stays
                SOLID while the row's goes dashed. The dashed outline is the one
                thing on the row that says "not yet", and repeating it on the
                mark inside made the mark read as a ghost of an emblem rather
                than as the course's emblem. What is greyed is the affordance,
                which is the row; the identity is still an object. */}
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-bb-border bg-bb-muted font-bold text-bb-muted-foreground ${
                COURSE_MARK[course].length > 2 ? "text-scale-xs" : "text-scale-sm"
              }`}
            >
              {COURSE_MARK[course]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* The name is --bb-muted-foreground, and that is a measured choice
                rather than a fade. It is 8.5:1 on this ground in light and
                6.9:1 in dark, both well over the AA floor, so the row is
                legible at full strength while reading as inactive. What is NOT
                done is an opacity over the card: an opacity multiplies the
                contrast of everything under it, and a row that is quietly
                below the floor is worse than a row that is loud. */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="bb-title-face text-scale-base font-semibold text-bb-muted-foreground">{COURSE_LABEL[course]}</h3>
              <span className="shrink-0 text-scale-xs font-semibold text-bb-muted-foreground">Soon</span>
            </div>
            <p className="text-scale-xs text-bb-muted-foreground">{COURSE_COMING[course]}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * What `#/courses/gen_chem_1` renders. Not a 404 and not an empty topic list.
 *
 * The link is gone from the list above, but the route is not, and a hash a
 * student typed or kept in a bookmark has to land somewhere true. It also
 * catches the one case the list cannot: a placement that recommended a course
 * before that course was authored.
 */
function CourseComingSoon({ course }: { readonly course: CourseId }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-10 text-center md:py-16">
      <span className="rounded-full border-2 border-bb-border bg-bb-muted px-3 py-1 text-scale-xs font-bold text-bb-muted-foreground">
        Being authored
      </span>
      <h1 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">{COURSE_LABEL[course]}</h1>
      <p className="text-scale-base text-bb-muted-foreground">{COURSE_BLURB[course]}</p>
      <p className="text-scale-sm font-medium text-bb-muted-foreground">{COURSE_COMING[course]}</p>
      <a
        href={hrefForTab("courses", "orgo_2")}
        className="press mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-5 text-scale-base font-semibold text-bb-primary-foreground"
      >
        Open Organic Chemistry II
      </a>
      <a href={hrefForTab("courses")} className="press inline-flex min-h-11 items-center text-scale-sm font-semibold text-bb-muted-foreground">
        All courses
      </a>
    </div>
  );
}

function TopicList({ course }: { readonly course: CourseId }) {
  const snapshot = useProgress();
  const topics = useMemo(() => probeTopicIdsForCourse(course), [course]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4 md:p-6">
      <a href={hrefForTab("courses")} className="press inline-flex min-h-11 items-center text-scale-sm font-semibold text-bb-muted-foreground">
        ← All courses
      </a>
      <h2 className="bb-title-face text-scale-2xl font-semibold">{COURSE_LABEL[course]}</h2>
      <p className="text-scale-sm text-bb-muted-foreground">{COURSE_BLURB[course]}</p>
      <ol className="flex flex-col gap-2">
        {topics.map((topic, index) => {
          const definition = topicDefinition(topic);
          const count = problemsForTopic(topic).length;
          const record = snapshot.lessons[topic];
          return (
            <li key={topic}>
              <a
                href={count > 0 ? hrefForTab("courses", course, topic) : undefined}
                aria-disabled={count === 0}
                className={`press flex min-h-14 items-center gap-3 rounded-2xl border border-bb-border bg-bb-card px-4 py-2 ${count === 0 ? "opacity-60" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-scale-xs font-bold ${
                    record !== undefined ? "bg-good-soft text-good-ink" : "bg-bb-muted text-bb-muted-foreground"
                  }`}
                >
                  {record !== undefined ? "✓" : index + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-scale-base font-medium">{definition.label}</span>
                  <span className="block text-scale-xs text-bb-muted-foreground">
                    {count === 0 ? "Problems not yet authored" : `${count} problem${count === 1 ? "" : "s"}`}
                    {definition.course !== course ? ` · from ${COURSE_LABEL[definition.course]}` : ""}
                  </span>
                </span>
                {record !== undefined ? (
                  <span className="text-scale-xs text-bb-muted-foreground">
                    {record.correct}/{record.attempted}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function CoursesTab({ rest, reducedMotion }: { readonly rest: readonly string[]; readonly reducedMotion: boolean }) {
  const courseParam = rest[0];
  const topicParam = rest[1];

  if (courseParam === undefined || !isCourseId(courseParam)) return <CourseList />;
  // A closed course resolves to its own honest screen at every depth, so
  // #/courses/gen_chem_1 and #/courses/gen_chem_1/gas_laws both land somewhere
  // true rather than on an empty list or a lesson with no problems in it.
  if (!isCourseOpen(courseParam)) return <CourseComingSoon course={courseParam} />;
  if (topicParam === undefined) return <TopicList course={courseParam} />;

  let topic: TopicId;
  try {
    topic = topicDefinition(topicParam as TopicId).id;
  } catch {
    return <TopicList course={courseParam} />;
  }
  return (
    <LessonPlayer
      key={topic}
      topic={topic}
      problems={problemsForTopic(topic)}
      reducedMotion={reducedMotion}
      onExit={() => navigate(hrefForTab("courses", courseParam))}
    />
  );
}
