/**
 * The answer tray: what every lesson question says back once CHECK is pressed.
 *
 * ONE COMPONENT FOR EVERY LESSON TYPE (A2 round 4). The MCQ used to answer in
 * a lilac card inside the scrolling column and the ladder used to answer in a
 * yellow footer with no icon, so the same moment looked like two products. Now
 * both dock this tray in the slot CHECK sat in: a full-width footer, green
 * when right and red when wrong, with an icon disc, a short title, the
 * explanation and one key in the tray's own colour (CONTINUE, or whatever the
 * next step is). Owner direction 2026-10-15, item 2.
 *
 * Accessibility: a right answer is a polite `status`, a wrong one an `alert`,
 * and focus moves to the key when the tray appears, so a keyboard user is one
 * Enter from moving on and a screen reader hears the verdict. Colour never
 * carries the meaning alone: the icon is a tick or a cross and the title says
 * it in words.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { ChipPress } from "./ChipPress";
import "./beat-chrome.css";
import "./bloom-tray.css";

export type TrayTone = "right" | "wrong";

export interface AnswerTrayProps {
  readonly tone: TrayTone;
  /** Short and spoken: "Nice!", "Not quite". */
  readonly title: string;
  /** The explanation. Plain text or a few paragraphs. */
  readonly children?: ReactNode;
  /** The key's label, for example "Continue". Rendered uppercase by the key. */
  readonly actionLabel: string;
  readonly onAction?: () => void;
  readonly actionDisabled?: boolean;
  /** An optional second, quieter key beside the main one (for example "Try again"). */
  readonly secondary?: ReactNode;
  /**
   * Right answers in a row, including this one. From 2 up, a right tray shows
   * an "N IN A ROW" chip by the title (owner direction 2026-10-15, item 2).
   */
  readonly combo?: number;
  /** A short chip by the title for anything else worth one glance ("First look, no penalty"). */
  readonly badge?: string;
  /**
   * The one Bloom for this verdict, drawn at the right of the title row
   * (BLOOM-STATES-SPEC.md, section 4). The surface hands over the berry
   * already reacting; the tray only gives it a place.
   */
  readonly mascot?: ReactNode;
}

/**
 * Split authored prose into its first sentence and the rest. A sentence ends at
 * ". ", "! " or "? " followed by a capital, so "1.4" or "e.g. the" never splits.
 * The words are the author's own; this only decides which part shows first.
 */
export function firstSentence(text: string): { readonly first: string; readonly rest: string } {
  const match = /^(.+?[.!?])\s+(?=[A-Z])/.exec(text);
  if (match === null) return { first: text, rest: "" };
  return { first: match[1], rest: text.slice(match[0].length) };
}

/**
 * The tray's explanation: the first sentence of `lead` on show, and the rest of
 * it plus `more` behind a native <details>, which opens and closes itself with
 * no React state.
 *
 * `yours` is why the student's own pick was wrong. Audit 23 Oct, section 5 #6:
 * it was folded under "Why?" and a first-timer never found it, so it now shows
 * by default under "Why yours isn't it" (a <details> rendered open: the
 * student can still fold it, and React only sets `open` on the first render).
 */
export function TrayWhy({ lead, more = [], yours }: { readonly lead: string; readonly more?: readonly string[]; readonly yours?: string }) {
  const { first, rest } = firstSentence(lead);
  const ownWhy = yours !== undefined && yours.length > 0 && yours !== lead ? yours : null;
  const extra = [rest, ...more.filter((part) => part !== lead && part !== ownWhy)].filter((part) => part.length > 0);
  return (
    <>
      <p>{first}</p>
      {ownWhy !== null ? (
        <details className="answer-tray__more" open>
          <summary>Why yours isn&rsquo;t it</summary>
          <p>{ownWhy}</p>
        </details>
      ) : null}
      {extra.length > 0 ? (
        <details className="answer-tray__more">
          <summary>Why?</summary>
          {extra.map((part) => (
            <p key={part}>{part}</p>
          ))}
        </details>
      ) : null}
    </>
  );
}

function TrayIcon({ tone }: { readonly tone: TrayTone }) {
  return (
    <span className="answer-tray__icon" aria-hidden>
      <svg viewBox="0 0 24 24" width="22" height="22">
        {tone === "right" ? (
          <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M7 7 17 17M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

export function AnswerTray({ tone, title, children, actionLabel, onAction, actionDisabled, secondary, combo, badge, mascot }: AnswerTrayProps) {
  const showCombo = tone === "right" && combo !== undefined && combo >= 2;
  const keyRef = useRef<HTMLButtonElement | null>(null);

  // Focus the key the frame the tray appears. A ref plus a mount effect is the
  // ordinary React way to touch a DOM node after it renders.
  useEffect(() => {
    keyRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className={`answer-tray answer-tray--${tone} beat-action-bar foot-bleed pb-safe sticky bottom-0 shrink-0`}
      role={tone === "right" ? "status" : "alert"}
      data-answer-tray={tone}
    >
      <div className="answer-tray__row">
        <div className="answer-tray__text">
          <div className="answer-tray__head">
            <TrayIcon tone={tone} />
            <h2 className="answer-tray__title bb-h2">{title}</h2>
            {/* The chip pops in (0 to 1.15 to 1) on a combo milestone, the beat Bloom bounces on. */}
            {showCombo ? (
              <span className="answer-tray__combo" data-milestone={combo === 3 || combo === 5 || combo === 8 ? "" : undefined}>
                {combo} in a row
              </span>
            ) : null}
            {!showCombo && badge !== undefined ? <span className="answer-tray__badge">{badge}</span> : null}
            {mascot !== undefined ? (
              <span className="answer-tray__bloom" aria-hidden>
                {mascot}
              </span>
            ) : null}
          </div>
          {children !== undefined ? <div className="answer-tray__body">{children}</div> : null}
        </div>
        <div className="answer-tray__actions">
          {secondary}
          {/* ONE ring pulse off the key on a right answer. CSS only, and it runs
              once because the tray mounts once per answer. */}
          {tone === "right" ? <span className="answer-tray__pulse" aria-hidden /> : null}
          <ChipPress
            ref={keyRef}
            variant={tone === "right" ? "won" : "near"}
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionLabel}
          </ChipPress>
        </div>
      </div>
    </div>
  );
}
