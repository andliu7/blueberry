/**
 * Me: the account tab, and the fourth of the four.
 *
 * WHAT A FOURTH TAB IS FOR. mobile-ui's rule is one screen one job, and the
 * job of this one is everything that is about the STUDENT rather than about
 * the chemistry: who they are, which course they are on, how the app is set up
 * for them, and what is not open yet. Every one of those used to be somewhere
 * else or nowhere at all, which is how an eight tab bar happens: each thing
 * that had no home got a tab.
 *
 * THIS IS WHERE THEME AND LANGUAGE LIVE NOW. They were two ghost buttons in
 * the header, and the header's left half is worth more to the two tools a
 * student reaches for mid problem. A colour scheme is chosen once; a periodic
 * table is opened in the middle of an EAS problem. See Shell.tsx for the trade.
 *
 * THE FLAGGED SURFACES ARE LISTED, NOT HIDDEN. Owner amendment of 2026-08-28:
 * leaderboards, chat and tutor messaging go behind a flag "rather than being
 * deleted". A student who heard the product has leaderboards and finds no
 * mention of them anywhere concludes the product lied; a student who finds a
 * row saying what it is waiting on concludes it is being built. So the rows are
 * here, they say when, and they are links, because their routes resolve.
 *
 * NOTHING HERE IS AN ENTITLEMENT. CLAUDE.md: anything that gates access is
 * enforced server side. This screen reads a client flag to decide what to draw
 * and reads a derived snapshot to show numbers; it decides nothing.
 */

import { useState } from "react";
import { useLanguage, useProgress, useTheme, setTheme } from "../../app/hooks";
import { languageByCode } from "../../app/i18n";
import { LanguageSheet } from "../../app/ui/LanguagePicker";
import { TabIcon } from "../../app/ui/TabIcon";
import { FLAGGED_TABS, hrefForTab, type TabId } from "../../app/routes";
import { isFlagOn, type FlagId } from "../../app/flags";
import { COURSE_LABEL } from "../courses/courseCopy";

/** When each flagged surface opens, in the student's words rather than ours. */
const FLAG_WHEN: Record<FlagId, string> = {
  leaderboards: "Waiting on the server that ranks attempts",
  chat: "Waiting on its per student token meter",
  messages: "Waiting on moderation and a tutor roster",
};

function Row({
  tab,
  title,
  detail,
  trailing,
}: {
  readonly tab: TabId;
  readonly title: string;
  readonly detail: string;
  readonly trailing?: string;
}) {
  return (
    <a href={hrefForTab(tab)} className="press flex min-h-14 items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card px-4 py-3">
      {/* Tinted disc, neutral glyph. Same object and same reasoning as
          app/ui/NotOpenYet.tsx: the fill is the colour, the line work recedes. */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-bb-border bg-[color:var(--tab-active)] text-bb-muted-foreground">
        <TabIcon tab={tab} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-scale-base font-semibold text-bb-foreground">{title}</span>
        <span className="block text-scale-xs text-bb-muted-foreground">{detail}</span>
      </span>
      {trailing === undefined ? null : (
        <span className="shrink-0 text-scale-xs font-semibold text-bb-muted-foreground">{trailing}</span>
      )}
    </a>
  );
}

/**
 * The theme control as a two-option segment rather than a toggle.
 *
 * A toggle says what you will get; a segment says what you have. On a settings
 * screen the second is the useful one, and it is also why the pressed option
 * carries the tint and the border: the current state should be an object, the
 * same way the current tab is.
 */
function ThemeSegment() {
  const theme = useTheme();
  return (
    <div className="flex gap-2" role="group" aria-label="Appearance">
      {(["light", "dark"] as const).map((option) => {
        const on = theme === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onPointerDown={() => setTheme(option)}
            className={`press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 text-scale-sm font-semibold ${
              on
                ? "border-[color:var(--bb-primary-ink)] bg-[color:var(--tab-active)] text-bb-primary-ink"
                : "border-bb-border bg-bb-card text-bb-muted-foreground"
            }`}
          >
            <span aria-hidden>{option === "light" ? "☀" : "☾"}</span>
            {option === "light" ? "Light" : "Dark"}
          </button>
        );
      })}
    </div>
  );
}

export default function MeTab() {
  const snapshot = useProgress();
  const [languageOpen, setLanguageOpen] = useState(false);
  const code = useLanguage();
  const language = languageByCode(code);
  // The snapshot already carries the derived economy, computed at the last
  // commit against the course universe. Re-deriving here would be a second
  // answer to the same question, and two answers is how a balance disagrees
  // with itself between two surfaces.
  const economy = snapshot.economy;
  const name = snapshot.displayName ?? "Studying solo";
  const course = snapshot.course === null ? null : COURSE_LABEL[snapshot.course];
  const lessonsDone = Object.keys(snapshot.lessons).length;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 p-4 pb-10 md:p-6">
      <section className="flex flex-col gap-3">
        <h1 className="bb-title-face text-scale-2xl font-bold leading-tight text-bb-foreground">{name}</h1>
        <p className="text-scale-sm text-bb-muted-foreground">
          {course === null
            ? "No course picked yet. The pathway will ask you once and then get out of the way."
            : `On ${course}. ${lessonsDone} ${lessonsDone === 1 ? "lesson" : "lessons"} closed so far.`}
        </p>
      </section>

      {/* Three numbers, drawn as one band of colour rather than three chips, so
          the tab has a coloured surface on it and not only outlines. Sticker
          rule 5: colour is a surface, not an accent.

          A plain div rather than <Card>, deliberately: the house card carries a
          `shadow-sm`, and sticker rule 3 allows a shadow only where stacking is
          the meaning. A stat band is chrome. Outline and fill, no shadow. */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-bb-border bg-[color:var(--tab-active)] p-4">
        {[
          { label: "Diamonds", value: economy.diamonds.balance },
          { label: "Day streak", value: economy.streak.current },
          { label: "Active days", value: snapshot.activeDays.length },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <span className="bb-title-face text-scale-2xl font-bold tabular-nums text-bb-primary-ink">{stat.value}</span>
            <span className="text-center text-scale-xs font-semibold text-bb-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">Your studying</h2>
        {/* Courses is COLLAPSED, not deleted: one course does not need a
            browsing tab, and the browsing surface still exists behind this row.
            routes.ts calls this placement "collapsed" for exactly this. */}
        <Row
          tab="courses"
          title="Courses"
          detail="Organic Chemistry II is open. The other five are on their way."
          trailing="1 open"
        />
        <Row tab="periodic" title="Periodic table" detail="Also in the header, on every screen and inside a lesson." />
        <Row tab="search" title="Reaction search" detail="Look a reaction up by its reagents when you forget the name." />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">Settings</h2>
        <ThemeSegment />
        <button
          type="button"
          onPointerDown={() => setLanguageOpen(true)}
          className="press flex min-h-14 items-center gap-3 rounded-2xl border-2 border-bb-border bg-bb-card px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-scale-base font-semibold text-bb-foreground">Language</span>
            <span className="block text-scale-xs text-bb-muted-foreground">
              The interface only. Chemistry notation is the same in every language.
            </span>
          </span>
          <span className="shrink-0 text-scale-sm font-bold text-bb-primary-ink">{language.endonym}</span>
        </button>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">On the way</h2>
        <p className="text-scale-xs text-bb-muted-foreground">
          Built, not open. Each one is waiting on a piece of server it would be dishonest to ship without.
        </p>
        {FLAGGED_TABS.map((tab) => (
          <Row
            key={tab.id}
            tab={tab.id}
            title={tab.label}
            detail={FLAG_WHEN[tab.id as FlagId]}
            trailing={isFlagOn(tab.id as FlagId) ? "On" : "Soon"}
          />
        ))}
      </section>

      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </div>
  );
}
