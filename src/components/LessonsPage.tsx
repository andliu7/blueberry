import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { LessonBlockEditor } from "@/components/ui/lesson-block-editor";
import { LessonBlocks } from "@/components/ui/lesson-blocks";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { ReactionCard, ReactionScheme } from "@/components/learn/ReactionCard";
import { ReactionSheet } from "@/components/learn/ReactionSheet";
import { useLearnReactions } from "@/components/learn/useLearnReactions";
import { markLessonFinished, markLessonOpened } from "@/components/learn/lessonsOpened";
import { ReagentFormula } from "@/components/ui/reagent-line";
import { defaultBlocksFor, parseBlocks, type LessonBlock } from "@/data/lessonBlocks";
import { LESSON_TOPICS, SECTION_FAMILIES } from "@/data/lessonTopics";
import { WORKED_EXAMPLE_REACTION, WORKED_EXAMPLE_SCHEME } from "@/data/workedExamples";
import {
  findUnit,
  hrefForNode,
  partHref,
  partKey,
  partLabel,
  partsForUnit,
  unitForFamily,
  unitParts,
  unitsForLesson,
  type LessonPart,
} from "@/data/learnMap";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";
import "@/components/learn/learn.css";

/**
 * One lesson, `#/lessons/<section>` (SITE-REPLAN.md sections 3 and 8).
 *
 * It opens on its own title, in the shared page header, with one link up to its
 * unit (the header's Learn tab is the level above that); the CHEM241 card with
 * the berry now lives on the Learn index only. Its
 * reactions sit inside it as cards, and a card opens the reaction sheet in
 * place, the way Duolingo's guidebook hangs off a unit rather than living in a
 * second library.
 *
 * THE ADDRESS IS THE STATE. Which lesson shows, and which reaction's sheet is
 * open, both come from the address (`section`, `reaction`, passed in by the
 * router), not from state kept here. So `#/lessons/enolate/aldol-addition`
 * opens that sheet from anywhere, a card press is a real history entry (the
 * phone's back gesture closes the sheet), and the old deep links keep working.
 *
 * The lesson's words are not touched here: they are the owner's (reserved 17 Sep)
 * and staff edit them through LessonBlockEditor, exactly as before.
 *
 * LEARN ROUND 3: SCOPED TO ITS UNIT, AND NEVER A DEAD END. The sidebar (and the
 * phone's chip row) lists only the lessons of the unit in the back link,
 * numbered, the current one a tinted pill. The page ends on "Up next": the
 * unit's next lesson, or after its last lesson the unit's practice, or the next
 * unit. That card holds the page's one filled button; "Open study deck" is the
 * outlined one beside the lesson text.
 *
 * LEARN ROUND 4: CHEMISTRY ON THE FIRST SCREEN. The lesson's first reaction card
 * is lifted to the top: above the text on a phone, beside it from 1280px (where
 * the 60%-empty "Practice this section" card used to be; its "Open study deck"
 * moved into the Up next card). Worked examples whose chemistry is a reaction in
 * the data (RDKit decides: data/workedExamples.ts) are drawn with the same
 * scheme as the reaction cards, in place of their generated picture.
 *
 * LEARN ROUND 6: EVERY worked example is that scheme now: the rest are drawn from
 * the structures their old picture was generated from (data/workedExamples.ts
 * again), and the typed conditions row under each is gone. The page ends on one
 * full-width block: a done mark, the lesson's reaction count, where next, and one
 * full-width button; "Open study deck" is a quiet link under it.
 *
 * S3 ROUND 5: A PART IS ITS OWN PAGE, AND READING ENDS ON THE SITE.
 * - A lesson read for a unit that is not its home (`?unit=`, e.g. Unit 5 reading the
 *   periodic acid part of Amines & sugars) is titled by the part ("Periodic acid
 *   cleavage"), shows only that unit's reactions, and folds the lesson's full text and
 *   worked examples under "The whole Amines & sugars lesson". Before, the Learn card
 *   promised periodic acid and the page opened on amines, diazonium salts and Sandmeyer.
 *   A part with no reaction of its own keeps the text open, since the text is all it has.
 *   The lesson's words themselves are untouched (the owner's).
 * - After a unit's last lesson the end block's button is "Finish lesson", back to Learn,
 *   which then shows what comes next. Practice is a quiet link under it that finishes
 *   the lesson too. Before, the only way to finish was a button into the app's trainer,
 *   under a heading that named a practice sequence, not the next lesson.
 */
export function LessonsPage({ section, reaction }: { section?: string; reaction?: string } = {}) {
  /* An id that does not exist falls back to the overview rather than an empty
     page, since a stale link from somebody's notes should land somewhere useful. */
  const t = LESSON_TOPICS.find((x) => x.id === section) ?? LESSON_TOPICS[0]!;
  const { reactions, canEdit, session, refresh, overrides, overrideFor } = useLearnReactions();
  const open = reaction ? (reactions.find((r) => r.id === reaction) ?? null) : null;

  /* S3 ROUND 4: WHICH UNIT THIS LESSON WAS OPENED FROM. A lesson shared by several units
     (Aromaticity opens Units 2 to 4) is read once per unit, and `?unit=u3` in the address
     says which. That unit is the back link, the menu, "Up next" and the record the end
     button writes, so Unit 5's periodic acid lesson keeps the student in Unit 5 rather
     than handing them to Unit 10. Without it, the lesson's first unit, as before. */
  const asked = unitFromAddress();
  const units = unitsForLesson(t.id).map(findUnit).filter((u) => u !== undefined);
  const home = units.find((u) => u.id === asked) ?? units[0];
  const also = units.filter((u) => u !== home);
  const key = partKey(t.id, home?.id);
  /* S3 round 5: read as a PART (a unit that is not the lesson's home), the page is that
     unit's part only. `part` is that unit's reading of the lesson, for its title. */
  const part = home && key !== t.id ? partsForUnit(home.id).find((p) => p.key === key) : undefined;
  const all = reactions.filter((r) => (SECTION_FAMILIES[t.id] ?? []).includes(r.family));
  const own = part ? all.filter((r) => unitForFamily(r.family) === home!.id) : [];
  const mine = part ? own : all;
  /* The lesson's full text folds away only when the part has chemistry of its own to
     show; a part with none keeps the text, which is all it has. */
  const folded = own.length > 0;

  /* The section's writing: the TA's boxes if they have saved any, otherwise the
     built-in text converted to the same shape. A section nobody has touched must
     read exactly as it did before this feature existed, and a stored value that
     will not parse falls back the same way rather than blanking the page. */
  const blocks: LessonBlock[] = parseBlocks(overrides?.topics?.find((x) => x.id === t.id)?.blocks) ?? defaultBlocksFor(t);
  /* Which section is being edited, rather than a yes or no: moving to another
     section ends the edit by itself, with no effect needed to reset it. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingPage = editingId === t.id;
  const setEditingPage = (on: boolean) => setEditingId(on ? t.id : null);
  /* Applied locally on save so the page updates without waiting for a refetch.
     Keyed by section, so it can never leak onto another one. */
  const [justSaved, setJustSaved] = useState<{ id: string; blocks: LessonBlock[] } | null>(null);
  const shown = justSaved && justSaved.id === t.id ? justSaved.blocks : blocks;
  /* Remember the lesson was opened, so its unit hub can offer the next one.
     An effect because it writes to storage, which a render must not do. */
  useEffect(() => markLessonOpened(key), [key]);

  /* S3 round 3: the lesson counts as FINISHED only when the end block's button is
     pressed. Round 2 also counted scrolling the end block into view, so skimming to
     the bottom finished a lesson; that is gone. Opening it is not enough either:
     Learn's decision card moves on from this, not from "opened". */

  /* A deep link to a reaction scrolls its card into view under the sheet, so
     closing the sheet leaves you at the card you asked for. One frame late,
     because the router's scroll-to-top runs after this page's effects (React runs
     a child's effects before its parent's). */
  useEffect(() => {
    if (!reaction) return;
    const id = requestAnimationFrame(() => document.getElementById(`rx-${reaction}`)?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(id);
  }, [reaction]);

  /* Whether this page pushed the open sheet onto history. A ref, not state:
     React keeps it between renders, and changing it never re-renders the page. */
  const pushed = useRef(false);
  // The `?unit=` rides along, so the sheet opening and closing keeps the unit.
  const query = asked ? `?unit=${asked}` : "";
  const openSheet = (id: string) => {
    pushed.current = true;
    window.location.hash = `#/lessons/${t.id}/${id}${query}`;
  };
  const closeSheet = () => {
    // Opened by a press here: step back, so back and close agree. Opened by a
    // link from outside: replace, so closing never leaves the site.
    if (pushed.current) window.history.back();
    else window.location.replace(`#/lessons/${t.id}${query}`);
    pushed.current = false;
  };

  /* This unit's lessons, in order (the unit is the back link's). A lesson filed
     under no unit falls back to the whole list rather than an empty menu. */
  const inUnit: LessonPart[] = home
    ? partsForUnit(home.id)
    : LESSON_TOPICS.map((lesson) => ({ lesson, unitId: "", key: lesson.id, shared: false }));
  const menu = inUnit.map((p) => ({
    id: p.lesson.id,
    href: home ? partHref(p.lesson.id, home.id) : `#/lessons/${p.lesson.id}`,
    label: home ? partLabel(p, reactions) : p.lesson.label,
  }));
  const next = upNext(t.id, menu, home?.id);
  /* The first reaction sits at the top of the page (Learn round 4), the rest in
     the list below. Not while staff edit the text, which takes the whole width. */
  const lifted = editingPage ? undefined : mine[0];
  const rest = lifted ? mine.slice(1) : mine;

  return (
    <main className="learn relative min-h-screen text-foreground">
      <div className={`${SITE_CONTAINER} pb-10`}>
        {/* The shared page header (shell round 3). Its one link goes up a level,
            to the lesson's unit; Learn itself is the header's Learn tab. */}
        <PageHeader
          back={home ? { href: `#/unit/${home.id}`, label: unitParts(home).number } : { href: "#/learn", label: "Learn" }}
          title={part ? partLabel(part, reactions) : t.title}
          subtitle={
            part ? (
              <>
                From the {t.label} lesson, read for {unitParts(home!).number}.
              </>
            ) : (
            <>
              {t.label}
              {also.length > 0 && (
                <>
                  {". Also in "}
                  {also.map((u, i) => (
                    <span key={u.id}>
                      {i > 0 && (i === also.length - 1 ? " and " : ", ")}
                      <a href={`#/unit/${u.id}`} className="lrn-link">
                        {unitParts(u).number}
                      </a>
                    </span>
                  ))}
                </>
              )}
            </>
            )
          }
        />

        {/* The phone's lesson menu: a row of chips under the title. The desktop
            sidebar is the same list down the side. */}
        <nav aria-label={home ? `${unitParts(home).number} lessons` : "Lessons"} className="lrn-row lg:hidden">
          {menu.map((x, i) => (
            <a key={x.id} href={x.href} aria-current={x.id === t.id ? "page" : undefined} className="lrn-chip">
              {i + 1}. {x.label}
            </a>
          ))}
        </nav>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[220px_1fr]">
          <nav aria-label={home ? `${unitParts(home).number} lessons` : "Lessons"} className="lrn-card hidden p-2 lg:block">
            {home && <p className="lrn-eyebrow px-2.5 pt-2 pb-1">{unitParts(home).number}</p>}
            <ol className="flex flex-col gap-0.5">
              {menu.map((x, i) => (
                <li key={x.id}>
                  <a href={x.href} aria-current={x.id === t.id ? "page" : undefined} className="lrn-side">
                    <span>{i + 1}</span>
                    {x.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0">
            {editingPage ? (
              <LessonBlockEditor
                topicId={t.id}
                topicLabel={t.label}
                blocks={shown}
                idToken={session?.idToken ?? null}
                onSaved={(next) => {
                  setJustSaved({ id: t.id, blocks: next });
                  setEditingPage(false);
                  refresh();
                }}
                onCancel={() => setEditingPage(false)}
              />
            ) : (
              <section className="grid items-start gap-5 xl:grid-cols-2">
                {/* First in the source, so a phone shows it above the text; from
                    1280px it moves to the right of the text. */}
                {lifted && (
                  <div className="xl:order-last">
                    <ReactionCard reaction={lifted} onOpen={openSheet} context={`Reaction 1 of ${mine.length}`} />
                  </div>
                )}
                {folded ? (
                  <details className="lrn-card lrn-fold">
                    <summary className="lrn-fold-sum">
                      <span>
                        <span className="lrn-eyebrow block">For context</span>
                        <span className="title-face text-lg font-extrabold text-[var(--bb-deep)]">
                          The whole {t.label} lesson
                        </span>
                        <span className="block text-sm text-[var(--site-quiet)]">
                          It also covers other units&rsquo; chemistry. This page counts for {unitParts(home!).number}.
                        </span>
                      </span>
                      <ChevronDown className="lrn-fold-chev size-5 shrink-0" aria-hidden />
                    </summary>
                    <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                      <LessonBlocks blocks={shown} />
                    </div>
                  </details>
                ) : (
                <article className="lrn-card p-6 sm:p-8">
                  {/* Staff controls top right, labelled: where an edit affordance is
                      looked for, saying what it does without being pointed at. */}
                  {canEdit && (
                    <div className="mb-4 flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => setEditingPage(true)} className="lrn-ghost">
                        <Pencil className="size-4 shrink-0" />
                        Edit page
                      </button>
                      <a href="#/new-reaction" className="lrn-ghost">
                        <Plus className="size-4 shrink-0" />
                        Add reaction
                      </a>
                    </div>
                  )}
                  {/* The section's text boxes, in the TA's order, each carrying its
                      own width. See `LessonBlocks`. */}
                  <LessonBlocks blocks={shown} />
                  {/* Staff whose sign-in cannot write get the reason instead of a
                      button that would fail. Renders nothing for anyone else. */}
                  <StaffSignInNotice session={session} action="Editing this page" backend="supabase" className="mt-6" />
                </article>
                )}
              </section>
            )}

            {rest.length > 0 && (
              <section aria-labelledby="reactions-title" className="mt-8">
                <h2 id="reactions-title" className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">
                  Reactions in this lesson
                </h2>
                <p className="mt-1 text-sm text-[var(--site-quiet)]">Open one for its conditions, then its product.</p>
                {/* Two across up to 1280px, each scheme a column; one across from there,
                    each scheme the textbook row (learn.css, `.lrn-scheme`). */}
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  {rest.map((r) => (
                    <ReactionCard
                      key={r.id}
                      reaction={r}
                      onOpen={openSheet}
                      context={lifted ? `Reaction ${mine.indexOf(r) + 1} of ${mine.length}` : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* The worked examples are the whole lesson's; a part page leaves them to it. */}
            {t.examples.length > 0 && !folded && (
              <section aria-labelledby="examples-title" className="mt-8">
                <h2 id="examples-title" className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">
                  Worked examples
                </h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {t.examples.map(([a, , c, d]) => {
                    /* From the reaction data when RDKit found its chemistry there,
                       else from its own generated data. The generator refuses an
                       example with neither, so one of the two is always there. */
                    const drawn =
                      reactions.find((r) => r.id === WORKED_EXAMPLE_REACTION[d!]) ?? WORKED_EXAMPLE_SCHEME[d!];
                    return (
                      <article key={a} id={`wx-${d!.replace(/\.svg$/, "")}`} className="lrn-card flex flex-col gap-3 p-4">
                        {/* Typeset, not reworded: "Carbonyl to CH2" reads CH₂ (Learn round 5). */}
                        <h3 className="text-sm font-semibold">
                          <ReagentFormula label={a!} />
                        </h3>
                        {drawn && <ReactionScheme reaction={drawn} />}
                        <p className="text-sm">
                          <b>Product:</b> {c}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Up next: where the student goes when this lesson is read, so no
                lesson ends at the footer. Learn round 6: an end block, full width,
                with one full-width button (a lesson-complete screen's shape). */}
            <section aria-labelledby="next-title" className="lrn-end mt-10">
              <div className="flex items-center gap-4">
                <span className="lrn-done-mark" aria-hidden>
                  <Check className="size-7" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="lrn-eyebrow">
                    End of lesson
                    {mine.length > 0 ? ` · ${mine.length} ${mine.length === 1 ? "reaction" : "reactions"} in this lesson` : ""}
                  </p>
                  <h2 id="next-title" className="title-face mt-1 text-2xl leading-tight font-extrabold text-[var(--bb-deep)]">
                    {next.href === "#/learn" ? next.title : `Next: ${next.title}`}
                  </h2>
                  {/* "Lesson 3 of 5", "Practice Unit 7": the eyebrow upNext writes, minus "Up next". */}
                  {next.href === "#/learn" && (
                    <p className="mt-1 text-sm text-[var(--site-quiet)]">Learn opens on what comes next.</p>
                  )}
                  {next.eyebrow !== "Up next" && (
                    <p className="mt-1 text-sm text-[var(--site-quiet)]">{next.eyebrow.replace(/^Up next · /, "")}</p>
                  )}
                </div>
              </div>
              <a href={next.href} onClick={() => markLessonFinished(key)} className="lrn-btn mt-5 w-full">
                {next.action}
                <ArrowRight className="size-4" aria-hidden />
              </a>
              {/* After a unit's last lesson: practice is the quiet way on, and it finishes
                  the lesson too, as the button does. */}
              {next.practice && (
                <a
                  href={next.practice.href}
                  onClick={() => markLessonFinished(key)}
                  className="lrn-link mt-1 flex min-h-11 items-center justify-center gap-1 text-sm"
                >
                  Or finish and practice {next.practice.unit} in the app
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              )}
              {/* S3 round 4: only where a deck drills this lesson (lessonTopics.ts `deck`). */}
              {t.deck && (
                <a href={`#/deck/${t.deck}`} className="lrn-link mt-1 flex min-h-11 items-center justify-center text-sm">
                  Open study deck
                </a>
              )}
            </section>
          </div>
        </div>
      </div>

      <ReactionSheet
        reaction={open}
        onClose={closeSheet}
        canEdit={canEdit}
        idToken={session?.idToken ?? null}
        overrides={open ? overrideFor(open.id) : undefined}
        onSaved={refresh}
      />
    </main>
  );
}

/** The `?unit=` of the address, if any (the router drops everything after "?"). */
function unitFromAddress(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const q = window.location.hash.indexOf("?");
  return q === -1 ? undefined : (new URLSearchParams(window.location.hash.slice(q + 1)).get("unit") ?? undefined);
}

/**
 * Where a lesson leads: the next lesson in its unit; after the unit's last lesson,
 * "Finish lesson" back to Learn (whose card then shows what comes next), with the unit's
 * first practice offered as a quiet second way on. Every branch returns a step, so no
 * lesson dead-ends, and every one can be finished without leaving the site.
 */
function upNext(
  id: string,
  lessons: readonly { id: string; label: string; href: string }[],
  unitId: string | undefined,
): {
  eyebrow: string;
  title: string;
  action: string;
  href: string;
  practice?: { href: string; unit: string };
} {
  const i = lessons.findIndex((x) => x.id === id);
  const lesson = i >= 0 ? lessons[i + 1] : undefined;
  if (lesson) {
    return { eyebrow: `Up next · Lesson ${i + 2} of ${lessons.length}`, title: lesson.label, action: "Next lesson", href: lesson.href };
  }
  const unit = PATHWAY_UNITS.find((u) => u.id === unitId);
  const node = unit?.nodes.find((n) => n.playable && !n.mentionOnly);
  const practiceHref = node ? hrefForNode(node) : null;
  return {
    eyebrow: "Up next",
    title: unit ? `That is ${unitParts(unit).number} read` : "That is every lesson read",
    action: "Finish lesson",
    href: "#/learn",
    practice: unit && practiceHref ? { href: practiceHref, unit: unitParts(unit).number } : undefined,
  };
}
