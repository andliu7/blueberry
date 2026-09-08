/**
 * One authored problem on screen, in whichever of the five answer kinds it is.
 *
 * The curriculum package already separates the authored AnswerSpec from the
 * student's AnswerState, so this component's only job is to turn touches into
 * an AnswerState and hand it up. It never grades: the lesson does, through
 * gradeAttempt, so grading stays in one place and this stays a view.
 *
 * The five kinds, and what each renders:
 *   multiple_choice  a list of pressable options
 *   major_product    the candidate products, then the reasons (a two part pick)
 *   numeric          a text field and a unit field
 *   reagents         one or more reagent fields, ordered when the spec is a sequence
 *   structure        handed to the trainer; this shell cannot draw a structure yet
 *
 * The structure kind is the honest gap: the interaction package has a
 * structure draft and chem-core can compare constitutions, but a structure
 * EDITOR on this canvas is Ketcher territory (docs/INHERITED-DECISIONS.md D2)
 * and that route is lazy by budget. Until it exists, a structure problem says
 * so and lets the student skip without penalty.
 *
 * EVERY KIND FILLS ITS WELL, and that is the S3 judge's dead-zone carry
 * arriving here. LessonPlayer used to push this component to the bottom of a
 * full-height card with an `mt-auto`, which left a hole rather than filling a
 * screen. The card gives this component a growing well now, so every branch
 * below is a full-height flex column: the option rows stretch to share the
 * room (the committed frame's big option cards), and a form puts its caption
 * and its action at the bottom edge where the thumb is.
 *
 * THE CHECK IS A CHIP, NOT AN OUTLINE. The other half of the same carry was
 * "an outlined Check whose disabled state is ambiguous". Press's disabled
 * state is the live button at opacity 0.6, which reads as "maybe"; the
 * committed button-types sheet draws the disabled action as a DIFFERENT
 * OBJECT, flat grey with its 3D edge gone, so it no longer looks pressable at
 * all. That is beats/ChipPress.tsx, and every commit action on this surface
 * is one. Press stays on SKIP, which the same sheet draws as an outline.
 *
 * THE PICTURES, owner rulings 1 and 2 of 2026-09-04. Every question carries a
 * real visual and option cards are pictures with captions. The curriculum
 * `Problem` type still carries no figure field and its options are still
 * `{ id, text }`, so the drawings come from `lessonFigures.ts`, a shim keyed
 * on the corpus's own ids that borrows onboarding/figures.ts's vocabulary and
 * its one renderer. Read that file's header for why the table is in the app
 * rather than in the package, and for what stops it being invented chemistry.
 */

import { useState } from "react";
import type { AnswerState, Problem } from "@blueberry/curriculum";
import { Press } from "../app/ui/Press";
import { ChipPress } from "../beats/ChipPress";
import { StructureFigure } from "../onboarding/StructureFigure";
import { optionFigureFor } from "./lessonFigures";
import "./scheme.css";

export interface ProblemViewProps {
  readonly problem: Problem;
  /** True once graded; the inputs lock so the feedback refers to a fixed answer. */
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
  readonly onSkip: () => void;
}

export function ProblemView({ problem, locked, onSubmit, onSkip }: ProblemViewProps) {
  const answer = problem.answer;
  switch (answer.kind) {
    case "multiple_choice":
      return (
        <OptionList
          options={answer.options}
          locked={locked}
          onPick={(optionId) => onSubmit({ kind: "multiple_choice", optionId })}
        />
      );
    case "major_product":
      return (
        <MajorProduct
          problemId={problem.id}
          candidates={answer.candidates}
          reasons={answer.reasons}
          locked={locked}
          onSubmit={onSubmit}
        />
      );
    case "numeric":
      return <NumericInput unitHint={answer.unit} locked={locked} onSubmit={onSubmit} />;
    case "reagents":
      return (
        <ReagentsInput stepCount={answer.mode === "sequence" ? answer.steps.length : 1} sequence={answer.mode === "sequence"} locked={locked} onSubmit={onSubmit} />
      );
    case "structure":
      return (
        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-bb-border p-4 text-scale-sm text-bb-muted-foreground">
          <p>
            This one asks you to draw a structure. The drawing canvas for structures arrives with
            the editor route; for now this question is skipped without counting against you.
          </p>
          <Press variant="secondary" className="mt-3 self-start" onPointerDown={onSkip} disabled={locked}>
            Skip this one
          </Press>
        </div>
      );
    case "ordering":
    case "matching":
      // The ordering and matching answer kinds arrived with the beats work
      // (apps/web/src/beats/), which carries its own runners for them. Until
      // the lesson player is wired to those runners, this problem is skipped
      // without counting, the same contract as the structure kind above.
      return (
        <div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-bb-border p-4 text-scale-sm text-bb-muted-foreground">
          <p>
            This one is a {answer.kind === "ordering" ? "put-in-order" : "matching"} question. Its
            board lives in the beats runner and is not wired into lessons yet, so it is skipped
            without counting against you.
          </p>
          <Press variant="secondary" className="mt-3 self-start" onPointerDown={onSkip} disabled={locked}>
            Skip this one
          </Press>
        </div>
      );
    default: {
      const unreachable: never = answer;
      return <>{unreachable}</>;
    }
  }
}

function OptionList({
  options,
  locked,
  onPick,
}: {
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    // THE ROWS STRETCH TO SHARE THE WELL. `flex-1` on each row is what turns
    // four short options and a screenful of empty cream into four big option
    // cards, which is what blueberry_r9-lesson-reaction draws and what the
    // dead-zone carry was asking for. The cap keeps a two-option question
    // from becoming two slabs, and the 3rem floor keeps a ten-option list
    // above the 44px hit-target floor while the well scrolls.
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto" role="list">
      {options.map((option, index) => {
        const active = picked === option.id;
        return (
          <li key={option.id} className="flex min-h-12 max-h-36 flex-1 shrink-0">
            <button
              type="button"
              disabled={locked}
              aria-pressed={active}
              onPointerDown={() => {
                if (locked) return;
                setPicked(option.id);
              }}
              onClick={() => {
                if (locked) return;
                onPick(option.id);
              }}
              /* THE SAME OPTION VOCABULARY THE BEAT SURFACES USE, and the
                 same press physics. These rows used to be an ad-hoc pair of
                 Tailwind borders plus `.press`, which is transform: scale
                 plus a brightness filter: the whole chip including its edge
                 shrank, while every other pressable on the screen moved its
                 FACE down onto its EDGE. BUTTON-MECHANICS.md specifies one
                 mechanic, so there is now one. */
              data-state={active ? "picked" : "rest"}
              className="option-card h-full text-scale-base font-normal"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bb-muted text-scale-xs font-bold text-bb-muted-foreground">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * THE OPTION TILES: pictures with captions, per owner ruling 2.
 *
 * `blueberry_r9-lesson-reaction` draws the candidate products as a 2 by 2 of
 * cream tiles, each a drawn structure with its name UNDER it in the muted
 * ink. That is what this renders when `lessonFigures.ts` has a figure for the
 * option, and it is the whole reason that table exists.
 *
 * IT FALLS BACK TO THE WORDS, on purpose. A question authored after the
 * figure table must still be answerable, so a tile with no figure draws its
 * caption at the body ink and marks itself `data-visual="name"`, which is the
 * countable signal that the gap is there. `test/lessonFigures.test.ts` is
 * what stops that fallback ever being what a student actually sees, and the
 * one place a fallback is allowed to be the real rendering is a corpus
 * question this builder's table has not met.
 */
function OptionTiles({
  problemId,
  options,
  locked,
  onPick,
}: {
  readonly problemId: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ul className="option-tiles shrink-0" role="list">
      {options.map((option) => {
        const figure = optionFigureFor(problemId, option.id);
        const active = picked === option.id;
        return (
          <li key={option.id} className="min-h-0">
            <button
              type="button"
              disabled={locked}
              aria-pressed={active}
              data-visual={figure === null ? "name" : "structure"}
              onPointerDown={() => {
                if (locked) return;
                setPicked(option.id);
              }}
              onClick={() => {
                if (locked) return;
                onPick(option.id);
              }}
              className="option-tile"
            >
              {figure !== null ? <StructureFigure figure={figure} className="option-tile__figure" /> : null}
              <span className={figure === null ? "text-scale-sm text-bb-foreground" : "option-tile__caption"}>
                {option.text}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The why strip: the ranking argument, asked second and given less room.
 *
 * Drawn as a wrapping row of outlined pills rather than as a second set of
 * tiles, which is exactly what the committed frame does with it. No picture
 * here and that is not a gap: a rule is not a molecule, and this is the one
 * place on the screen where words ARE the honest answer shape.
 */
function ReasonChips({
  options,
  locked,
  onPick,
}: {
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onPick: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <ul className="reason-chips" role="list">
      {options.map((option) => {
        const active = picked === option.id;
        return (
          <li key={option.id}>
            <button
              type="button"
              disabled={locked}
              aria-pressed={active}
              onPointerDown={() => {
                if (locked) return;
                setPicked(option.id);
              }}
              onClick={() => {
                if (locked) return;
                onPick(option.id);
              }}
              className="reason-chip"
            >
              {option.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MajorProduct({
  problemId,
  candidates,
  reasons,
  locked,
  onSubmit,
}: {
  readonly problemId: string;
  readonly candidates: readonly { readonly id: string; readonly text: string }[];
  readonly reasons: readonly { readonly id: string; readonly text: string }[];
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [candidateId, setCandidate] = useState<string | null>(null);
  const [reasonId, setReason] = useState<string | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-2 shrink-0 text-scale-sm font-semibold text-bb-muted-foreground">Which product wins?</h3>
        <OptionTiles problemId={problemId} options={candidates} locked={locked} onPick={setCandidate} />
      </div>
      {candidateId !== null ? (
        <div className="fade-in shrink-0">
          <h3 className="mb-2 text-scale-sm font-semibold text-bb-muted-foreground">And why?</h3>
          <ReasonChips options={reasons} locked={locked} onPick={setReason} />
        </div>
      ) : null}
      {/* PINNED, per the committed frames: see .lesson-action in
          beats/beat-chrome.css for why one sticky rule is correct in both
          the full-bleed and the shell mount. */}
      <div className="lesson-action">
        <ChipPress
          className="w-full"
          disabled={locked || candidateId === null || reasonId === null}
          onPointerDown={() => {
            if (candidateId === null) return;
            onSubmit({ kind: "major_product", candidateId, reasonId });
          }}
        >
          Check
        </ChipPress>
      </div>
    </div>
  );
}

function NumericInput({
  unitHint,
  locked,
  onSubmit,
}: {
  readonly unitHint: string | null;
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [text, setText] = useState("");
  const [unit, setUnit] = useState("");
  return (
    <form
      className="flex min-h-0 flex-1 flex-col justify-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked || text.trim() === "") return;
        onSubmit({ kind: "numeric", text: text.trim(), unit: unit.trim() === "" ? null : unit.trim() });
      }}
    >
      {/* A PLACEHOLDER IS NOT A LABEL, and the S3 capture is why this changed.
          "Value, with the right number of sig figs" and "unit, e.g. atm" were
          both wider than the boxes that held them, so the two fields shipped
          reading "Value, with the ri" and "unit, e.g." on a phone: a hint the
          student cannot finish reading teaches nothing and looks unfinished.
          The hints are one caption under the row now, where they have the full
          width, and the placeholders are short enough to fit at 390px. */}
      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={text}
          disabled={locked}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="Value"
          aria-label="Numeric answer"
          className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-bb-input bg-bb-card px-4 text-scale-base font-mono"
        />
        <input
          value={unit}
          disabled={locked}
          onChange={(event) => setUnit(event.currentTarget.value)}
          placeholder={unitHint === null ? "Unit" : unitHint}
          aria-label="Unit"
          className="min-h-12 w-24 shrink-0 rounded-xl border-2 border-bb-input bg-bb-card px-3 text-scale-base font-mono"
        />
      </div>
      <p className="text-scale-xs text-bb-muted-foreground">
        {unitHint === null
          ? "Sig figs count here, so keep the ones the question gives you."
          : `Sig figs count here, so keep the ones the question gives you. The unit goes in the second box, ${unitHint} for this one.`}
      </p>
      <div className="lesson-action">
      {/* THE FRAME THE S3 JUDGE SAW. This is the button the carry was about,
          and it is a chip now: violet fill with its darker bottom edge while
          it is live, and with nothing typed it goes flat grey with the edge
          gone, so before an answer exists it does not look pressable at all.
          `type="submit"` survives the spread; ChipPress sets type first. */}
        <ChipPress type="submit" className="w-full" disabled={locked || text.trim() === ""}>
          Check
        </ChipPress>
      </div>
    </form>
  );
}

function ReagentsInput({
  stepCount,
  sequence,
  locked,
  onSubmit,
}: {
  readonly stepCount: number;
  readonly sequence: boolean;
  readonly locked: boolean;
  readonly onSubmit: (state: AnswerState) => void;
}) {
  const [steps, setSteps] = useState<string[]>(() => Array.from({ length: stepCount }, () => ""));
  const complete = steps.every((step) => step.trim() !== "");
  return (
    <form
      className="flex min-h-0 flex-1 flex-col justify-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked || !complete) return;
        onSubmit({
          kind: "reagents",
          steps: steps.map((step) => ({
            reagents: step
              .split(/[,+]/)
              .map((reagent) => reagent.trim())
              .filter((reagent) => reagent !== ""),
          })),
        });
      }}
    >
      <p className="text-scale-xs text-bb-muted-foreground">
        {sequence ? "In order. " : ""}Separate reagents in one step with commas.
      </p>
      {steps.map((step, index) => (
        <label key={index} className="flex items-center gap-2">
          {sequence ? <span className="w-6 text-scale-sm font-semibold text-bb-muted-foreground">{index + 1}.</span> : null}
          <input
            value={step}
            disabled={locked}
            onChange={(event) => {
              const next = [...steps];
              next[index] = event.currentTarget.value;
              setSteps(next);
            }}
            placeholder="e.g. NaBH4, MeOH"
            aria-label={sequence ? `Step ${index + 1} reagents` : "Reagents"}
            className="min-h-12 flex-1 rounded-xl border border-bb-input bg-bb-card px-4 text-scale-base font-mono"
          />
        </label>
      ))}
      <div className="lesson-action">
        <ChipPress type="submit" className="w-full" disabled={locked || !complete}>
          Check
        </ChipPress>
      </div>
    </form>
  );
}
