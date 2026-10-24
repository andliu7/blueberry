import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";

import { PATHWAY_UNITS, type PathwayNode, type PathwayUnit } from "@/game/demo/pathwayMap";
import { deriveMapPathway } from "@/game/tabs/pathway/pathwayState";
import { lessonsFinished } from "@/components/learn/lessonsOpened";
import { useLearnReactions } from "@/components/learn/useLearnReactions";
import { ReactionScheme, StructureThumb } from "@/components/learn/ReactionCard";
import type { StagedReaction } from "@/data/reactions";
import { findDeck } from "@/data/decks";
import { hrefForNode, partHref, partLabel, partReactions, partsForUnit, unitForFamily, unitParts, unitReaction } from "@/data/learnMap";
import "@/components/learn/learn.css";
import { plural } from "@/lib/helpers";

/**
 * One unit of Organic Chemistry II, on its own page.
 *
 * The fifteen units were a single scrolling pathway inside the game. As pages
 * they get an address each, which is what makes a unit linkable, shareable and
 * findable: a student sent "#/unit/u7" lands on Aldehydes and Ketones rather
 * than on the top of a track they then have to scroll.
 *
 * The unit list is read from the game's own `pathwayMap`, not copied. That file
 * is pure data with no imports, so nothing of the game's runtime comes with it,
 * and a unit added there appears here without a second edit. Two lists of the
 * same fifteen units is how they drift apart.
 *
 * THE UNIT HUB (SITE-REPLAN.md phase 5, section 3). This page is the spine Learn
 * hangs from, the way a Duolingo unit's guidebook hangs off the unit: the unit's
 * lessons in order; then "Practice this unit", the path's nodes as links into the game;
 * then the decks its lessons use. Which lessons and reactions belong here comes
 * from data/learnMap.ts, a DRAFT table pending the owner's approval.
 *
 * LEARN ROUND 3: A PATH, NOT A DOCUMENT. Under the title, a banner with the
 * unit's counts and progress; then one node per lesson (done, current, later,
 * from `lessonsOpened`); then practice and decks. One docked card holds the
 * only filled button: the first lesson this browser has not opened, or once
 * every lesson is opened, the unit's first practice node. The reaction cards
 * moved off the hub to their lesson pages, where they are taught.
 *
 * LEARN ROUND 4: TWO COLUMNS FROM 1024px. The path on the left; on the right, a
 * card held in view while the path scrolls: the docked next step on top (so its
 * button is on the first screen), then a preview of that lesson, its headline
 * and its first reaction, drawn. A phone keeps one column and the dock at the thumb. It is ONE dock in
 * both: below 1024px its wrapper is `display: contents` (learn.css, `.lrn-aside`),
 * so the dock behaves as if the wrapper were not there and sticks to the bottom
 * of the whole page as before. That keeps exactly one filled button in the page.
 *
 * LEARN ROUND 5: THE NEXT STEP LIVES ON THE PATH. The phone's fixed dock covered
 * the path's labels and the practice cards at the fold. The next step is now a
 * card hung under the current lesson's node, the way a path game opens a node:
 * the lesson's name, a small drawing of its first reaction (or the unit's, for a
 * lesson with none), and one full-width button. Once every lesson is opened it
 * sits under the path instead. It is the hub's one filled button at every width,
 * so the desktop column keeps only the preview. The banner gained the unit's
 * picture, and the unit's developer note ("Gates Units 8, 9, 13, 14.") is gone.
 */

/**
 * What each kind of node is, in words.
 *
 * Words rather than only a colour, because colour cannot be the only carrier of
 * meaning: a student who cannot separate the spine's blue from a branch's amber
 * still has to know which one is required.
 */
const KIND_LABEL: Record<PathwayNode["kind"], string> = {
  spine: "Core",
  branch: "Optional",
  gate: "Checkpoint",
  boss: "Unit test",
};

/* One tag look for all four: the word carries the meaning, and red is for delete
   only (the old "Unit test" tag was rose). */

/**
 * What a node asks you to DO, which is a different question from what it is.
 *
 * `kind` says whether a node is required; `playable.kind` says whether you draw
 * a mechanism, rank resonance forms or order a sequence. They read as one field
 * at a glance and are not, which is worth naming because conflating them is
 * exactly the mistake this file was first written with.
 */
const PLAYABLE_LABEL: Record<string, string> = {
  beat: "Drill",
  reaction: "Reaction",
  resonance: "Resonance",
  sequence: "Sequence",
};

/** Horizontal travel, in pixels, before a drag counts as a swipe. */
const SWIPE_PX = 64;
/** How much steeper than horizontal a drag may be before it is a scroll. */
const SWIPE_SLOPE = 1.2;

export function UnitPage({ unitId }: { unitId?: string }) {
  const index = Math.max(
    0,
    PATHWAY_UNITS.findIndex((u) => u.id === unitId),
  );
  const unit = PATHWAY_UNITS[index]!;
  const previous = index > 0 ? PATHWAY_UNITS[index - 1] : null;
  const next = index < PATHWAY_UNITS.length - 1 ? PATHWAY_UNITS[index + 1] : null;

  const surfaceRef = useRef<HTMLDivElement>(null);

  /**
   * Swipe across, and the arrow keys, both walk the units.
   *
   * The gesture is measured on pointer events rather than touch, so a trackpad
   * drag and a finger take the same path. Two guards keep it from firing on an
   * ordinary scroll: it has to travel far enough, and it has to be more
   * horizontal than vertical. Without the second one a diagonal flick down the
   * page navigates, which is the worst kind of surprise on a phone.
   */
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;

    const go = (unitTo: { id: string } | null) => {
      if (unitTo) window.location.hash = `#/unit/${unitTo.id}`;
    };

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      tracking = true;
    };

    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SWIPE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_SLOPE) return;
      // Dragging the page to the right pulls the previous unit in from the
      // left, which is the direction every carousel and every phone back
      // gesture already means.
      go(dx > 0 ? previous : next);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (e.key === "ArrowRight") go(next);
      if (e.key === "ArrowLeft") go(previous);
    };

    el.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [previous, next]);

  const { number: unitNumber, name: unitName } = unitParts(unit);
  const { reactions } = useLearnReactions();
  // S3 round 4: the unit's lessons are its PARTS (data/learnMap.ts): a lesson shared with
  // other units is read, finished and named per unit, and opens with `?unit=` so the
  // lesson page keeps the student here. `id` is the part's key, what the records store.
  const lessons = partsForUnit(unit.id).map((p) => ({
    id: p.key,
    lessonId: p.lesson.id,
    label: partLabel(p, reactions),
    title: p.lesson.title,
    deck: p.lesson.deck,
    href: partHref(p.lesson.id, unit.id),
  }));
  const inUnit = reactions.filter((r) => unitForFamily(r.family) === unit.id);
  const decks = [...new Set(lessons.flatMap((t) => (t.deck ? [t.deck] : [])))]
    .map(findDeck)
    .filter((d) => d !== undefined);
  const playable = unit.nodes.filter((n) => n.playable && !n.mentionOnly);
  const waiting = unit.nodes.filter((n) => !n.playable && !n.mentionOnly).length;
  // The app's lesson count, by the Path's own rule (audit 23 Oct, section 5 #2): the same
  // number the Path and the Learn rail say. Side quests are listed below but not counted.
  const appLessons = deriveMapPathway([unit], []).units.get(unit.id)?.playable ?? 0;
  // Read once per visit: initial state from a function runs on the first render only.
  // S3 round 2: "done" means finished (read to the end), not merely opened.
  const [opened] = useState(lessonsFinished);
  const step = nextStep(lessons, opened, playable, next);
  const done = lessons.filter((t) => opened.has(t.id)).length;
  // The first lesson not yet opened is "current"; opened lessons are "done";
  // everything else is "later". Opened out of order still counts as done,
  // since the record is per lesson.
  const current = lessons.find((t) => !opened.has(t.id))?.id;
  // The current lesson's own reactions, for the node's count and the preview.
  const reactionsOf = (lessonId: string) => partReactions(lessonId, unit.id, reactions);
  const preview = lessons.find((t) => t.id === current);
  const previewReaction = preview ? reactionsOf(preview.lessonId)[0] : undefined;
  // The unit's own picture, for the banner, and for the next-step card when its
  // lesson has no reaction (an Overview).
  const cover = unitReaction(unit.id, reactions);
  // What the next step draws: the lesson's first reaction, else the unit's.
  const shown = preview ? (previewReaction ?? cover) : undefined;
  const stepCard = (caret: boolean) => <NextStep step={step} reaction={shown} caret={caret} />;

  return (
    <div ref={surfaceRef} className="learn min-h-svh touch-pan-y">
      <main className={`${SITE_CONTAINER} pb-10`}>
        {/* The shared page header (shell round 3), one link up to Learn. */}
        <PageHeader
          back={{ href: "#/learn", label: "Learn" }}
          title={unitName}
          // A smaller title on a phone (learn.css), so a long unit name takes
          // two lines rather than four. "Unit 7 of 15" moved into the banner, so
          // the next step's button reaches the first screen of a phone.
          className="lrn-hub-head pb-4"
        />

        <div className={preview ? "lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-10" : undefined}>
          <div className="min-w-0">
            {/* The unit's banner: what is in it, and how far this browser has come. */}
            <section aria-label="Your progress" className="lrn-card mb-6 flex items-center gap-4 p-4">
              {/* The unit's picture: the starting material of its first reaction. */}
              {cover && (
                <span className="lrn-cover shrink-0 p-1">
                  <StructureThumb reaction={cover} side="start" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="lrn-eyebrow">
                  {unitNumber} of {PATHWAY_UNITS.length}
                </p>
                <p className="mt-1 text-sm text-[var(--site-quiet)]">
                  {[
                    // Audit 23 Oct, section 5 #2: the readings are unit notes; "lesson" means the app's lessons.
                    lessons.length ? `${plural(lessons.length, "note", "notes")}` : null,
                    inUnit.length ? `${plural(inUnit.length, "reaction", "reactions")}` : null,
                    appLessons ? `${plural(appLessons, "lesson", "lessons")} in the app` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Coming later"}
                </p>
                {lessons.length > 0 && (
                  <>
                    <p className="title-face mt-1 text-base font-extrabold text-[var(--bb-deep)]">
                      {done} of {plural(lessons.length, "note", "notes")} read
                    </p>
                    <div className="lrn-bar mt-2" aria-hidden>
                      <span style={{ width: `${(100 * done) / lessons.length}%` }} />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* LEARN ROUND 3: THE PATH. One node per lesson, in order, each a link to
                the lesson page. Its state comes from `lessonsOpened`: done (green, a
                tick), current (ringed) or later. The reaction cards that used to fill
                this page live on their lesson pages, one press away. */}
            <section aria-labelledby="lessons-title">
              {/* Named for a screen reader; on screen the path says it (Learn round 5:
                  the heading's line was the room the next step's button needed). */}
              <h2 id="lessons-title" className="sr-only">
                Unit notes
              </h2>
              {lessons.length === 0 ? (
                <>
                  <p className="text-[var(--site-quiet)]">No notes for this unit yet. Its practice is below.</p>
                  <div className="mt-4 max-w-md">{stepCard(false)}</div>
                </>
              ) : (
                <ol className="lrn-path">
                  {lessons.map((t, i) => {
                    const state = opened.has(t.id) ? "done" : t.id === current ? "current" : "later";
                    const count = reactionsOf(t.lessonId).length;
                    return (
                      <li
                        key={t.id}
                        // A gentle S (0, right, 0, left), so the column reads as a road.
                        // Set on the row, so the node and the caret of the card under it
                        // both read it (a CSS custom property inherits).
                        style={{ "--sway": `${Math.round(Math.sin((i * Math.PI) / 2) * 28)}px` } as CSSProperties}
                      >
                        <a
                          href={t.href}
                          data-state={state}
                          aria-current={state === "current" ? "step" : undefined}
                          className="lrn-node"
                        >
                          <span className="lrn-disc">
                            {state === "done" ? <Check className="size-7" strokeWidth={3} aria-hidden /> : i + 1}
                            {/* Learn round 6: the current node says so in words, over it. */}
                            {state === "current" && (
                              <span className="lrn-node-tag" aria-hidden>
                                Next
                              </span>
                            )}
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="lrn-eyebrow">
                              Lesson {i + 1}
                              {state === "done" ? ", finished" : ""}
                              {count > 0 ? ` · ${plural(count, "reaction", "reactions")}` : ""}
                            </span>
                            <span className="lrn-title">{t.label}</span>
                            {/* The lesson's headline, where there is room for it. */}
                            <span className="hidden text-sm text-[var(--site-quiet)] lg:block">{t.title}</span>
                          </span>
                        </a>
                        {state === "current" && stepCard(true)}
                      </li>
                    );
                  })}
                </ol>
              )}
              {/* Every lesson opened: the next step (practice, or the next unit)
                  sits under the path rather than under a node. */}
              {lessons.length > 0 && !current && <div className="mx-auto mt-4 max-w-md">{stepCard(false)}</div>}
            </section>

            <section aria-labelledby="practise-title" className="mt-10">
              <h2 id="practise-title" className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">Practice this unit</h2>
              {playable.length === 0 ? (
                <p className="mt-2 text-[var(--site-quiet)]">Practice for this unit is on the way.</p>
              ) : (
                <ol className="mt-3 grid gap-3 sm:grid-cols-2">
                  {/* Title and tags only: the nodes' blurbs are the game's own copy
                      (pathwayMap.ts) and some spell formulas, which Learn does not print. */}
                  {playable.map((node) => (
                    <li key={node.id}>
                      <a href={hrefForNode(node)!} className="lrn-tap h-full gap-1 p-4">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {/* "Core" is on nearly every node and tells a student nothing;
                              only the kinds that differ get a tag (Learn round 5). */}
                          {node.kind !== "spine" && <span className="lrn-tag">{KIND_LABEL[node.kind]}</span>}
                          {node.playable && (
                            <span className="lrn-tag">{PLAYABLE_LABEL[node.playable.kind] ?? node.playable.kind}</span>
                          )}
                        </span>
                        <span className="mt-1 font-semibold text-[var(--bb-deep)]">{node.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
              {waiting > 0 && playable.length > 0 && (
                <p className="mt-3 text-sm text-[var(--site-quiet)]">
                  {waiting} more {waiting === 1 ? "lesson is" : "lessons are"} on the way.
                </p>
              )}
            </section>

            {decks.length > 0 && (
              <section aria-labelledby="decks-title" className="mt-10">
                <h2 id="decks-title" className="title-face text-2xl font-extrabold text-[var(--bb-deep)]">Decks</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {decks.map((d) => (
                    <a key={d.id} href={`#/deck/${d.id}`} className="lrn-tap gap-1 p-4">
                      <BookOpen className="size-5 text-[var(--lrn-ink)]" aria-hidden />
                      <span className="title-face font-extrabold text-[var(--bb-deep)]">{d.title}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* The way onward, at the foot, where somebody who has read the unit is
                actually looking. Both ends are named rather than labelled "next", so
                the destination is readable before the press. Swipe and the arrow keys
                still walk the units; real buttons replaced the 10px hint saying so. */}
            <nav aria-label="Units" className="mt-12 grid gap-3 border-t-2 border-[var(--site-border)] pt-6 sm:grid-cols-2">
              {previous ? (
                <a href={`#/unit/${previous.id}`} className="lrn-tap min-h-16 justify-center px-5 py-3">
                  <span className="lrn-eyebrow flex items-center gap-1.5">
                    <ArrowLeft className="size-3.5" aria-hidden />
                    Previous
                  </span>
                  <span className="mt-1 text-sm font-semibold text-[var(--bb-deep)]">{previous.title}</span>
                </a>
              ) : (
                <span aria-hidden />
              )}
              {next ? (
                <a href={`#/unit/${next.id}`} className="lrn-tap min-h-16 justify-center px-5 py-3 text-right sm:items-end">
                  <span className="lrn-eyebrow flex items-center justify-end gap-1.5">
                    Next
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                  <span className="mt-1 text-sm font-semibold text-[var(--bb-deep)]">{next.title}</span>
                </a>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          </div>

          {/* The right column from 1024px: a preview of the current lesson, its
              headline and first reaction drawn at full size, held in view while
              the path scrolls. Hidden below 1024px (learn.css, `.lrn-aside`). The
              button is the card on the path, so the page has one at every width. */}
          {preview && (
            <section aria-labelledby="preview-title" className="lrn-aside bb-glow">
              <p className="lrn-eyebrow">{step.eyebrow}</p>
              <h2 id="preview-title" className="title-face mt-1 text-xl leading-tight font-extrabold text-[var(--bb-deep)]">
                {preview.title}
              </h2>
              {shown && (
                <div className="mt-4">
                  <ReactionScheme reaction={shown} />
                  <p className="mt-2 text-center text-sm text-[var(--site-quiet)]">{shown.name}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * The next step as a card hung on the path (Learn round 5): its name, a small
 * drawing, and the hub's one filled button, full width. `caret` points it at the
 * node above (its x follows the node's sway). The drawing is a phone's; from
 * 1024px the preview column draws the whole reaction instead.
 */
function NextStep({
  step,
  reaction,
  caret,
}: {
  step: ReturnType<typeof nextStep>;
  reaction: StagedReaction | undefined;
  caret: boolean;
}) {
  return (
    <div className="lrn-pop" data-caret={caret ? "" : undefined}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="lrn-eyebrow">{step.eyebrow}</p>
          <p className="title-face mt-1 text-xl leading-tight font-extrabold text-[var(--bb-deep)]">{step.title}</p>
        </div>
        {/* Beside the name rather than under it, so the button stays on a
            phone's first screen. Its alt names the product. */}
        {reaction && (
          <span className="lrn-cover shrink-0 px-1 lg:hidden">
            <StructureThumb reaction={reaction} side="product" />
          </span>
        )}
      </div>
      <a href={step.href} className="lrn-btn mt-4 w-full">
        {step.action}
        <ArrowRight className="size-4" aria-hidden />
      </a>
    </div>
  );
}

/**
 * The hub's one next step: the first lesson not yet opened, else the unit's
 * first practice node, else the next unit, else back to Learn. Every branch
 * returns a step, so the dock is never empty. Lessons are numbered in the
 * unit's order.
 */
function nextStep(
  lessons: readonly { id: string; label: string; href: string }[],
  opened: ReadonlySet<string>,
  playable: readonly PathwayNode[],
  nextUnit: PathwayUnit | null,
): { eyebrow: string; title: string; action: string; href: string } {
  const i = lessons.findIndex((t) => !opened.has(t.id));
  const lesson = lessons[i];
  if (lesson) {
    const started = lessons.some((t) => opened.has(t.id));
    return {
      eyebrow: `Note ${i + 1} of ${lessons.length}`,
      title: lesson.label,
      action: started ? "Continue" : "Start",
      href: lesson.href,
    };
  }
  const node = playable[0];
  const href = node ? hrefForNode(node) : null;
  if (node && href) return { eyebrow: "Practice", title: node.title, action: "Start", href };
  if (nextUnit) return { eyebrow: "Up next", title: unitParts(nextUnit).name, action: "Next unit", href: `#/unit/${nextUnit.id}` };
  return { eyebrow: "Every unit", title: "Learn", action: "Back to Learn", href: "#/learn" };
}

export default UnitPage;
