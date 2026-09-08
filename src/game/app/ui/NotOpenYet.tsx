/**
 * What a flagged surface renders while its flag is off.
 *
 * THE RULE THIS EXISTS FOR. Owner amendment of 2026-08-28: leaderboards, chat
 * and tutor messages come out of the bar "rather than being deleted", and
 * "every route must still resolve so a deep link does not 404". A route that
 * resolves to nothing is a 404 with a 200 status code, so it resolves to this.
 *
 * mobile-ui has two empty states and this is neither of them exactly: it is not
 * a first run and it is not a search miss. It is the third case, a destination
 * that exists and is not open, and what it borrows from the other two is the
 * shape: say plainly what is true, do not read as a failure, and always leave a
 * way out that is not the back button.
 *
 * THE VOICE. CLAUDE.md: a coach on the student's side, never scolding, and
 * specific rather than generic. So each line names the ONE thing the surface is
 * waiting on and what is already being kept for it, because "coming soon" tells
 * a student nothing and "your attempts are already counted" tells them their
 * work is not being thrown away.
 */

import { hrefForTab } from "../routes";
import type { FlagId } from "../flags";
import { TabIcon } from "./TabIcon";

interface Notice {
  readonly title: string;
  readonly line: string;
  readonly kept: string;
}

const NOTICES: Record<FlagId, Notice> = {
  leaderboards: {
    title: "Leaderboards are not open yet",
    line: "A rank is only worth reading if it was worked out from real attempts on the server. Until that is true for every row, showing you a board would be showing you a guess.",
    kept: "Your attempts are already going into the history it will rank, so nothing you do between now and then is lost.",
  },
  chat: {
    title: "Ask Blueberry is not open yet",
    line: "It answers with a real model, and the limit on how much it can spend on your behalf has to exist before it says a word.",
    kept: "In the meantime a wrong answer already comes back with a named cause and a written explanation, which is where most of the help was going to come from anyway.",
  },
  messages: {
    title: "Tutor messages are not open yet",
    line: "This one puts you in touch with a person, so there has to be a moderated place for that conversation and a tutor on the other end of it first.",
    kept: "Your mistakes are collecting into a deck as you go, which is exactly the thing worth handing a tutor on day one.",
  },
};

export function NotOpenYet({ surface }: { readonly surface: FlagId }) {
  const notice = NOTICES[surface];
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-10 text-center md:py-16">
      {/* The glyph in a soft tinted disc. The DISC carries the colour and the
          glyph recedes into it, which is sticker rules 5 and 6 in one object:
          colour appears as a surface, and the line work stays neutral so the
          surface is what leads. A purple glyph on a purple disc would be the
          palette twice and the surface never. */}
      <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-bb-border bg-[color:var(--tab-active)] text-bb-muted-foreground">
        <TabIcon tab={surface} className="h-9 w-9" />
      </span>
      <h2 className="bb-title-face text-scale-xl font-semibold text-bb-foreground">{notice.title}</h2>
      <p className="text-scale-base text-bb-muted-foreground">{notice.line}</p>
      <p className="text-scale-sm text-bb-muted-foreground">{notice.kept}</p>
      <a
        href={hrefForTab("pathway")}
        /* THE CUT EDGE. A filled primary control still carries an outline in
           this language, and --bb-primary-edge is the token derived for exactly
           that: one step down the primary's own family so the shape reads from
           either side of itself. Without it this was a bare filled block, which
           the sticker audit was counting as 12 rows of rule 4 across the three
           flagged surfaces. */
        className="press mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-5 text-scale-base font-semibold text-bb-primary-foreground"
      >
        Back to your path
      </a>
    </div>
  );
}
