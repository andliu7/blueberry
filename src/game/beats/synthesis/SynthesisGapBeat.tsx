/**
 * The synthesis gap on screen: the route as a row of arrows, one of them blank.
 *
 * WHAT THE SHAPE IS COPIED FROM, and it is copied deliberately. The reference
 * capture `reference images/fill in the blank.png` does four things and this
 * surface does the same four: the sentence carries the blank INLINE so the
 * question and the answer slot are one object, the bank sits directly under it,
 * a chip that has been used greys out in the bank rather than vanishing, and
 * one full width action sits at the bottom. Two of those are not decoration.
 * A chip that vanishes when used leaves a student unable to see what they
 * already tried, and a blank that lives away from the question makes them look
 * in two places to read one thing.
 *
 * THE LADDER IS THE ONLY THING THAT CHANGES BETWEEN RUNGS. At L2 the blank is
 * filled from the bank. At L3 the bank is gone and the blank IS a text input.
 * Same row, same grader, same explanation card. Nothing else moves, because a
 * rung that also changes the layout teaches the layout instead of the chemistry.
 *
 * THE PRESS CONTRACT. Every control here is a `Press` or carries the `press`
 * class from theme.css, which paints the pressed state through `:active` in the
 * same frame the pointer lands, with no JavaScript in the path. Nothing on this
 * surface waits on a network, so there is no busy state to continue into: the
 * press is the whole acknowledgement and it is inside the 100 ms budget by
 * construction.
 *
 * REACT PATTERNS USED HERE, each named once because they are not obvious:
 *   useRef for the attempt clock. A ref rather than state because the start
 *     time is never rendered, and putting it in state would re-render the row
 *     every time it was set.
 *   useMemo for the explanation. It is pure and derived from the result, so
 *     recomputing it on an unrelated render is waste rather than a bug.
 *   A controlled input at L3: React owns the text, the DOM does not.
 *
 * WHAT THIS COMPONENT DOES NOT DO. It does not grade (grade.ts), it does not
 * author (corpus.ts), and it does not decide when a card is offered
 * (cards.ts). It renders, it collects one submission, and it hands the result
 * up. That split is what lets the whole beat be tested in a node environment,
 * which is what apps/web/vitest.config.ts runs.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Press } from "../../app/ui/Press";
import { ChipPress } from "../ChipPress";
import type { BeatResult, MasteryLevel } from "../types";
import { offerCardForMistake, shouldOfferCard, type GapCardOffer } from "./cards";
import { explainSynthesisResult, gradeSynthesisGap, type GapSubmission } from "./grade";
import { levelToPlay } from "./beats";
import { gapStep, type BankOption, type SynthesisGapProblem } from "./problem";
import type { SpeechSeam } from "./speech";

export interface SynthesisGapBeatProps {
  readonly problem: SynthesisGapProblem;
  /** The rung the runner is serving. Clamped by levelToPlay, never raised. */
  readonly level: MasteryLevel;
  readonly reducedMotion: boolean;
  /** Called once, with the graded attempt. The runner records it. */
  readonly onResolved: (result: BeatResult) => void;
  /** Called when a miss is worth a card. The shell shows the toast. */
  readonly onOfferCard?: (offer: GapCardOffer) => void;
  readonly onContinue: () => void;
  /** The spoken answer seam. Nothing supplies one yet; see speech.ts. */
  readonly speech?: SpeechSeam;
  /** Injected so a test can pin the clock. Defaults to the real one. */
  readonly now?: () => Date;
}

const TONE_CLASS = {
  correct: "border-[color:var(--good)] bg-[color:var(--good-soft)]",
  alternative: "border-[color:var(--alt-route)] bg-[color:var(--alt-route-soft)]",
  not_requested: "border-[color:var(--not-requested)] bg-[color:var(--not-requested-soft)]",
  invalid: "border-bb-border bg-bb-muted",
} as const;

const TONE_INK = {
  correct: "text-[color:var(--good-ink)]",
  alternative: "text-[color:var(--alt-route)]",
  not_requested: "text-[color:var(--not-requested)]",
  invalid: "text-bb-foreground",
} as const;

/** A molecule on the row. A name, not a drawing: nothing here renders structures. */
function MoleculeChip({ label, muted = false }: { readonly label: string; readonly muted?: boolean }) {
  return (
    <span
      className={`inline-flex min-h-11 shrink-0 items-center rounded-xl border border-bb-border px-3 py-2 text-scale-sm ${
        muted ? "bg-bb-muted text-bb-muted-foreground" : "bg-bb-card text-bb-card-foreground"
      }`}
    >
      {label}
    </span>
  );
}

/** One arrow, with whatever sits over it. */
function StepArrow({ children }: { readonly children: ReactNode }) {
  return (
    <span className="flex shrink-0 flex-col items-center gap-1 px-1">
      <span className="text-center text-scale-xs leading-snug text-bb-muted-foreground">{children}</span>
      <svg width="56" height="10" viewBox="0 0 56 10" aria-hidden focusable="false">
        <path
          d="M0 5 H48 M44 1.5 L49 5 L44 8.5"
          fill="none"
          stroke="var(--bond-stroke)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** The blank itself. Dashed until it holds something, filled once it does. */
function Blank({
  children,
  filled,
  onClear,
}: {
  readonly children: ReactNode;
  readonly filled: boolean;
  readonly onClear?: () => void;
}) {
  const shell = `inline-flex min-h-11 min-w-[7rem] items-center justify-center rounded-xl px-3 py-2 text-scale-sm ${
    filled
      ? "border border-[color:var(--bb-primary)] bg-[color:var(--bb-primary)]/10 text-[color:var(--bb-primary-ink)] font-semibold"
      : "border-2 border-dashed border-bb-border text-bb-muted-foreground"
  }`;
  if (onClear === undefined) return <span className={shell}>{children}</span>;
  return (
    <button type="button" onClick={onClear} className={`press ${shell}`} aria-label="Clear the blank">
      {children}
    </button>
  );
}

/** A bank chip. Greys out once used, exactly as the reference capture does. */
function Chip({
  option,
  used,
  onPick,
}: {
  readonly option: BankOption;
  readonly used: boolean;
  readonly onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={used}
      className={`press inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-scale-sm font-medium ${
        used
          ? "border-bb-border bg-bb-muted text-bb-muted-foreground"
          : "border-bb-border bg-bb-card text-bb-card-foreground"
      }`}
    >
      {option.text}
    </button>
  );
}

export function SynthesisGapBeat({
  problem,
  level,
  reducedMotion,
  onResolved,
  onOfferCard,
  onContinue,
  speech,
  now = () => new Date(),
}: SynthesisGapBeatProps) {
  const playedLevel = levelToPlay(problem, level);
  const banked = playedLevel < 3;

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<BeatResult | null>(null);
  // Not rendered, so a ref rather than state: see the header.
  const startedAt = useRef(now().getTime());
  const blankRef = useRef<HTMLLIElement | null>(null);

  // A six step route is wider than a phone, and the blank is the only part
  // worth looking at first. Honouring the reduced motion setting here rather
  // than animating anything: the jump still happens, it just does not slide.
  useEffect(() => {
    blankRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [problem.id, reducedMotion]);

  const step = gapStep(problem);
  // The target sits at the end of the row and reads as the destination; the
  // intermediates are on the way, so they are the muted ones.
  const lastStepId = problem.steps[problem.steps.length - 1]?.id ?? "";
  const picked = pickedId === null ? undefined : problem.bank.find((option) => option.id === pickedId);
  const needsReason = problem.gapKind === "product";
  const answered = banked
    ? picked !== undefined && (!needsReason || reasonId !== null)
    : text.trim() !== "";

  const explanation = useMemo(
    () => (result === null ? null : explainSynthesisResult(problem, result)),
    [problem, result],
  );

  const check = () => {
    if (result !== null || !answered) return;
    const submission: GapSubmission = banked
      ? { mode: "picked", optionId: pickedId ?? "", reasonId }
      : { mode: "typed", text };
    const at = now();
    const graded = gradeSynthesisGap({
      problem,
      submission,
      level: playedLevel,
      elapsedMs: Math.max(0, at.getTime() - startedAt.current),
      now: at,
    });
    setResult(graded);
    onResolved(graded);
    if (shouldOfferCard(graded) && onOfferCard !== undefined) {
      onOfferCard(offerCardForMistake(problem, graded, at));
    }
  };

  const blankContent = () => {
    if (result !== null) return explanation?.answerText ?? "";
    if (banked) return picked?.text ?? "add the missing piece";
    return text.trim() === "" ? problem.typed?.placeholder ?? "type it" : text;
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-scale-xl font-semibold text-bb-foreground">{problem.prompt}</h2>
        {problem.brief === undefined ? null : (
          <p className="text-scale-sm leading-normal text-bb-muted-foreground">{problem.brief}</p>
        )}
      </header>

      {/* The row. It scrolls inside itself so the page never scrolls sideways. */}
      <ol className="flex items-end gap-1 overflow-x-auto pb-2" aria-label="The route, one arrow at a time">
        <li className="flex shrink-0 items-end">
          <MoleculeChip label={problem.start} />
        </li>
        {problem.steps.map((rowStep) => {
          const isGap = rowStep.id === problem.gapStepId;
          const gapIsOverArrow = isGap && problem.gapKind !== "product";
          const gapIsProduct = isGap && problem.gapKind === "product";
          return (
            <li
              key={rowStep.id}
              ref={isGap ? blankRef : null}
              className="flex shrink-0 items-end"
            >
              {gapIsOverArrow ? (
                <StepArrow>
                  <Blank
                    filled={result !== null || picked !== undefined || text.trim() !== ""}
                    {...(banked && picked !== undefined && result === null
                      ? { onClear: () => setPickedId(null) }
                      : {})}
                  >
                    {blankContent()}
                  </Blank>
                </StepArrow>
              ) : (
                <StepArrow>{rowStep.over ?? ""}</StepArrow>
              )}
              {gapIsProduct ? (
                <Blank
                  filled={result !== null || picked !== undefined}
                  {...(picked !== undefined && result === null ? { onClear: () => setPickedId(null) } : {})}
                >
                  {blankContent()}
                </Blank>
              ) : (
                <MoleculeChip label={rowStep.produces ?? ""} muted={rowStep.id !== lastStepId} />
              )}
            </li>
          );
        })}
      </ol>

      {result === null && banked ? (
        <div className="flex flex-col gap-2">
          <p className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
            Tap the piece that belongs in the blank
          </p>
          <div className="flex flex-wrap gap-2">
            {problem.bank.map((option) => (
              <Chip
                key={option.id}
                option={option}
                used={option.id === pickedId}
                onPick={() => setPickedId(option.id === pickedId ? null : option.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {result === null && banked && needsReason && picked !== undefined ? (
        <div className="flex flex-col gap-2">
          <p className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
            And the reason it wins
          </p>
          <div className="flex flex-col gap-2">
            {problem.reasons.map((reason) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => setReasonId(reason.id === reasonId ? null : reason.id)}
                aria-pressed={reason.id === reasonId}
                className={`press min-h-11 rounded-xl border px-4 py-2 text-left text-scale-sm ${
                  reason.id === reasonId
                    ? "border-[color:var(--bb-primary)] bg-[color:var(--bb-primary)]/10 text-[color:var(--bb-primary-ink)]"
                    : "border-bb-border bg-bb-card text-bb-card-foreground"
                }`}
              >
                {reason.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {result === null && !banked ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${problem.id}-typed`} className="text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
            {problem.typed?.placeholder ?? "Type your answer"}
          </label>
          <input
            id={`${problem.id}-typed`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") check();
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="min-h-11 rounded-xl border border-bb-input bg-bb-card px-4 py-2 text-scale-base text-bb-card-foreground outline-none focus-visible:border-[color:var(--bb-ring)]"
          />
          {/* The spoken answer seam. Renders only when a provider supplies one,
              so today this is exactly zero pixels and zero bytes of recogniser. */}
          {speech?.available === true ? (
            <Press
              variant="secondary"
              onClick={() => speech.listen((spoken) => setText(spoken))}
              className="self-start"
            >
              {speech.label}
            </Press>
          ) : null}
        </div>
      ) : null}

      {/* THE COMMIT IS A CHIP, per the committed button-types sheet and the
          S3 judge's carry: before an answer exists this goes flat grey with
          its bottom edge gone, so "nothing chosen yet" is a visible fact
          rather than a dimmed guess. */}
      {explanation === null ? (
        <ChipPress onClick={check} disabled={!answered} className="w-full">
          Check
        </ChipPress>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={`rounded-2xl border p-4 ${TONE_CLASS[explanation.tone]}`}>
            <p className={`text-scale-base font-semibold ${TONE_INK[explanation.tone]}`}>
              {explanation.headline}
            </p>
            <p className="mt-1 text-scale-sm leading-normal text-bb-foreground">{explanation.body}</p>
            <p className="mt-3 text-scale-sm leading-normal text-bb-muted-foreground">{explanation.why}</p>
            {step.note === undefined || step.note === explanation.why ? null : (
              <p className="mt-2 text-scale-xs leading-normal text-bb-muted-foreground">{step.note}</p>
            )}
          </div>
          <p className="text-scale-xs text-bb-muted-foreground">
            Route from {problem.source.file}, {problem.source.locator}.
          </p>
          <ChipPress onClick={onContinue} className="w-full">
            Continue
          </ChipPress>
        </div>
      )}
    </section>
  );
}

export default SynthesisGapBeat;
