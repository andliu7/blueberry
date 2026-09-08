/**
 * The lesson header's currency counter: a drawn gem and the student's gem
 * balance, which is what both committed lesson frames put at the right end of
 * that row (blueberry_r9-lesson-mechanism pairs its number with a flask and
 * flame, blueberry_r9-lesson-reaction with a gem).
 *
 * WHY THIS IS ITS OWN FILE AND WHY THE RUNNER LOADS IT LAZILY. The balance
 * comes from `app/progress`, and that module's import chain reaches
 * `app/i18n.ts`, which touches `document` at module scope. The web suite runs
 * in a NODE environment with no DOM, so a static import of it from
 * BeatRunner.tsx made `test/beatRunner.test.ts` and `test/reactions.test.ts`
 * fail on import with "document is not defined" before a single assertion
 * ran. Measured, not guessed: those two files import the runner and nothing
 * else changed. A `React.lazy` boundary keeps the chain out of module scope,
 * which is the same reason the runner already lazy-loads its four beat
 * surfaces.
 *
 * THE BALANCE IS DERIVED THE WAY app/ui/Hud.tsx DERIVES IT, with the course
 * as the mastery denominator. That file records why and it is not a detail:
 * mastery rank awards pay diamonds and mastery is scored out of a course, so
 * a snapshot derived WITHOUT the course reports a different balance, 262
 * against 137 on the P3 seed. A lesson header disagreeing with the header the
 * student just came from is worse than no counter at all.
 *
 * THE CLOCK IS AN INPUT, not something read on every render: the journal and
 * the course are the dependencies, so this recomputes when the student's own
 * history changes. It deliberately does not tick, because a count that moves
 * mid-question is a distraction neither committed frame has, and the balance
 * is re-derived the next time a lesson opens.
 */

import { useMemo } from "react";
import { deriveEconomy } from "@blueberry/economy";

import { economyOptions } from "../app/progress";
import { useProgress } from "../app/hooks";
import { GemMark } from "./chromeIcons";
import "./beat-chrome.css";

export default function LessonGems() {
  const snapshot = useProgress();
  const gems = useMemo(
    () => deriveEconomy(snapshot.journal, new Date().toISOString(), economyOptions(snapshot.course)).diamonds.balance,
    [snapshot.journal, snapshot.course],
  );
  return (
    <span className="lesson-currency" aria-label={`${gems} gems`}>
      <GemMark />
      {gems}
    </span>
  );
}
