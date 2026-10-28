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
 * THE VOICE. The words live in lib/statusCopy.ts, shared with the 404, so every
 * "not here" screen sounds the same: a coach on the student's side, one line on
 * what the surface is waiting on, one on what is already being kept for it.
 * Bloom is asleep, the empty-state face in lib/berryMood.ts.
 */

import { hrefForTab } from "../routes";
import type { FlagId } from "../flags";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import { NOT_OPEN_ACTION, NOT_OPEN_COPY } from "../../../lib/statusCopy";
import { pressClassName } from "./Press";

export function NotOpenYet({ surface }: { readonly surface: FlagId }) {
  const notice = NOT_OPEN_COPY[surface];
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-10 text-center md:py-16">
      <span aria-hidden className="block h-24 w-24">
        <BlueberryMark eyes mood="sleepy" className="h-full w-full" />
      </span>
      <h2 className="bb-h1 text-bb-foreground">{notice.title}</h2>
      <p className="text-scale-base text-bb-muted-foreground">{notice.line}</p>
      <p className="text-scale-sm text-bb-muted-foreground">{notice.kept}</p>
      <a
        href={hrefForTab("pathway")}
        className={`${pressClassName({ variant: "primary" })} mt-2`}
      >
        {NOT_OPEN_ACTION}
      </a>
    </div>
  );
}
