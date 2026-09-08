/**
 * What a graded attempt says back. Every result explains itself, correct ones
 * included, per the feedback section of CLAUDE.md.
 *
 * The tier decides the source of the copy, never the tone:
 *   correct             the problem's authored solution
 *   matched_distractor  Tier 2, the authored explanation for that exact mistake
 *   named_cause         Tier 1, the curriculum cause registry's copy
 *   unmatched_wrong     Tier 3, logged; here it says so and offers the chat tab
 *   indeterminate       the shell sent something the checker could not read
 *
 * Colour: --good for correct, the soft purple band for everything else. There
 * is no red on this screen. The student is learning, not being marked down.
 *
 * Split in two on 2026-08-27 for the reaction strip (ReactionStrip.tsx): the
 * HEADLINE sits beside the character in the strip's band and the BODY sits
 * under it. `Feedback` still renders both as one card for any caller that
 * wants the old shape.
 */

import { curriculumCause, type GradingResult } from "@blueberry/curriculum";
import { hrefForTab } from "../app/routes";
import { isFlagOn } from "../app/flags";

function Explain({ what, why, next }: { readonly what: string; readonly why: string; readonly next: string }) {
  return (
    <dl className="flex flex-col gap-2 text-scale-sm">
      <div>
        <dt className="font-semibold text-bb-foreground">What happened</dt>
        <dd className="text-bb-muted-foreground">{what}</dd>
      </div>
      <div>
        <dt className="font-semibold text-bb-foreground">Why</dt>
        <dd className="text-bb-muted-foreground">{why}</dd>
      </div>
      <div>
        <dt className="font-semibold text-bb-foreground">Look at</dt>
        <dd className="text-bb-muted-foreground">{next}</dd>
      </div>
    </dl>
  );
}

/** The one line beside the character. */
export function feedbackHeadline(result: GradingResult): string {
  switch (result.kind) {
    case "correct":
      return "That is it.";
    case "matched_distractor":
      return "Not yet, and this is a common road.";
    case "named_cause":
      return curriculumCause(result.cause).specificity === "notation"
        ? "Right chemistry. The notation slipped."
        : "Close, and there is one idea to check.";
    case "unmatched_wrong":
      return "Not the answer, and not one we anticipated.";
    case "indeterminate":
      return "We could not read that answer.";
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

/** Everything under the headline. */
export function FeedbackBody({ result }: { readonly result: GradingResult }) {
  switch (result.kind) {
    case "correct":
    case "matched_distractor":
      return <Explain what={result.explanation.whatHappened} why={result.explanation.why} next={result.explanation.lookAt} />;
    case "named_cause": {
      // The registry's `summary` is engine facing by contract (causes.ts says
      // never shown to a student), so the body leads with `teaches`, which is
      // the idea to check, and the checker's detail, which names the value.
      // Authored student copy per curriculum cause is an open item in STATUS.
      const cause = curriculumCause(result.cause);
      return (
        <div className="text-scale-sm">
          <p className="text-bb-muted-foreground">{cause.teaches}</p>
          {result.detail !== "" ? <p className="mt-2 text-scale-xs text-bb-muted-foreground">{result.detail}</p> : null}
        </div>
      );
    }
    case "unmatched_wrong":
      // The offer to ask Blueberry is only made when Ask Blueberry is actually
      // on. Owner amendment of 2026-08-28 put chat behind app/flags.ts, and a
      // link that lands on "not open yet" is worse than no link: it spends a
      // student's attention at the exact moment they are already stuck.
      return (
        <p className="text-scale-sm text-bb-muted-foreground">
          That is useful: it means this exact answer needs its own explanation written, and it
          has been logged so one gets authored.{" "}
          {isFlagOn("chat") ? (
            <>
              Until then,{" "}
              <a href={hrefForTab("chat")} className="font-semibold text-bb-primary underline">
                ask Blueberry
              </a>{" "}
              about it, or look at the solution below.
            </>
          ) : (
            <>Look at the solution below, and the worked step it turns on.</>
          )}
        </p>
      );
    case "indeterminate":
      return <p className="text-scale-sm text-bb-muted-foreground">{result.detail}</p>;
    default: {
      const unreachable: never = result;
      return <>{unreachable}</>;
    }
  }
}

/** Headline and body as one card, the pre strip shape. */
export function Feedback({ result }: { readonly result: GradingResult }) {
  const tone =
    result.kind === "correct"
      ? "border-good/40 bg-good-soft"
      : result.kind === "indeterminate"
        ? "border-bb-border bg-bb-muted"
        : "border-bb-primary/30 bg-bb-primary/5";
  const ink = result.kind === "correct" ? "text-good-ink" : "text-bb-foreground";
  return (
    <section className={`fade-in rounded-2xl border p-4 ${tone}`} aria-live="polite">
      <h3 className={`text-scale-base font-semibold ${ink}`}>{feedbackHeadline(result)}</h3>
      <div className="mt-2">
        <FeedbackBody result={result} />
      </div>
    </section>
  );
}
