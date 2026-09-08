/**
 * The pKa settings surface: match the numbers to your professor.
 *
 * WHY THIS SCREEN EXISTS AT ALL, restated from settings/pka.ts because this is
 * the file a reader lands on first. The pKa ladder is the source course's
 * spine, the first question on six of six exams examined is pKa recall, and the
 * number a student is marked against is the number their own lecturer put on
 * the board. Those disagree in real ways: the course handout prints water at 16
 * where a standard reference prints 15.7. A student who sees 15.7 here and 16
 * on their key stops trusting the app, which is a worse outcome than either
 * number being wrong.
 *
 * WHAT THIS SCREEN IS ALLOWED TO CHANGE. Displayed NUMBERS, and nothing else.
 * The authored orderings are not configurable, and where a configured value
 * would contradict one, this page SAYS SO in the flag panel below instead of
 * either throwing the student's number away or quietly re-ordering a problem a
 * person wrote and reviewed. All three of those are decisions in
 * settings/pka.ts; this file only renders them.
 *
 * THE STRUCTURE, top to bottom, and it is deliberately the order of the
 * questions a student asks: what is this, whose table am I on, is anything
 * wrong, and then the ladder itself with the rung they came to change.
 *
 * WHERE THIS SCREEN IS REACHED FROM, stated because today the answer is
 * nowhere. app/routes.ts has no `settings` tab and it belongs to the
 * integration agent, so this component is written and exported and not yet
 * mounted. The READING half is already live: SortBeatView subscribes to the
 * same store and resolves every card's number through `pkaValueFor`, so a
 * number changed here shows up in a lesson the moment the route exists.
 *
 * REACT PATTERNS NAMED, per CLAUDE.md's communication rules.
 *   - `useSyncExternalStore` subscribes this component to the settings store in
 *     settings/pka.ts. That store is a plain object with subscribe and
 *     getSnapshot, the same shape as app/progress.ts, so the state lives
 *     outside React and any other surface reading the same store re-renders
 *     with this one.
 *   - `LadderRow` is a child component per rung holding its own draft text in
 *     `useState`. One state variable in the parent holding sixteen drafts would
 *     re-render every row on every keystroke; a row that owns its own draft
 *     re-renders alone.
 *   - `PresetChooser` uses a ROVING TABINDEX, which is how a real radio group
 *     behaves: one tab stop for the whole group, arrow keys to move inside it.
 *     Its own comment says why claiming role="radio" without it is worse than
 *     not claiming it.
 *   - `useRef` plus `useEffect` for the two places focus and scroll are moved
 *     by hand, because React does neither for you: focusing the field when the
 *     editor opens, and bringing a saved row back into view after the ladder
 *     re-sorts around it.
 *   - `useId` gives the rejection paragraph an id unique to its row, so the
 *     input can point `aria-errormessage` at ITS message and not at another
 *     row's.
 *   - Every control fires on `onPointerDown` for the acknowledgement AND on
 *     `onClick` so a keyboard works, which is safe because the store's setters
 *     are idempotent. That is the CLAUDE.md press contract: the pressed state
 *     is the first frame of feedback and nothing here waits on it.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { Card, Pill } from "../app/ui/Card";
import type { PkaSiteId } from "@blueberry/curriculum";
import {
  PKA_PRESETS,
  formatPka,
  overrideCount,
  parsePkaInput,
  pkaInputRejection,
  pkaOrderingConflicts,
  pkaPreset,
  pkaSettings,
  resolvedLadder,
  type PkaOrderingConflict,
  type PkaSettingsSnapshot,
  type ResolvedPka,
} from "./pka";

/**
 * The settings snapshot, re-rendering the caller when the store commits.
 *
 * Exported so a beat, a card or the quiz reads the same store this page writes,
 * rather than each surface keeping its own copy of the chosen table.
 */
export function usePkaSettings(): PkaSettingsSnapshot {
  return useSyncExternalStore(pkaSettings.subscribe, pkaSettings.getSnapshot);
}

const ORIGIN_LABEL: Readonly<Record<ResolvedPka["origin"], string>> = {
  table: "Course ladder",
  preset: "From this table",
  override: "Yours",
};

const CONFLICT_HEADLINE: Readonly<Record<PkaOrderingConflict["kind"], string>> = {
  order_flipped: "Your numbers rank two of these the other way round",
  tie_broken: "Two rungs this question treats as level are not level in your table",
  tie_unrecorded: "Two rungs this question ranks apart are level in your table",
};

export default function PkaSettings() {
  const settings = usePkaSettings();
  const preset = pkaPreset(settings.presetId);
  const ladder = resolvedLadder(settings);
  const conflicts = pkaOrderingConflicts(settings);
  const changed = overrideCount(settings);

  /**
   * The rung the student just saved, so it can be found again after the list
   * re-sorts. `resolvedLadder` orders by value, so changing a number MOVES the
   * row: without this, the row a student was looking at silently jumps
   * somewhere else in a sixteen row list and they have to hunt for it.
   */
  const [saved, setSaved] = useState<PkaSiteId | null>(null);
  // The mark is dropped the moment that rung stops being an override, so
  // "Use the table value" and "Clear my changes" both clean it up without
  // either of them having to know it exists. Derived from the store rather
  // than cleared on a timer: a timer would need a test to be told to wait.
  const justSaved = saved !== null && settings.overrides[saved] !== undefined ? saved : null;
  const savedRung = justSaved === null ? null : (ladder.find((r) => r.id === justSaved) ?? null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <header>
        <h1 className="text-scale-xl font-semibold leading-tight">pKa values</h1>
        <p className="mt-1 text-scale-sm text-bb-muted-foreground">
          Different courses teach slightly different numbers for the same rung. Pick the table your
          class uses, and change any single value your professor writes differently. Everything in
          the app reads these numbers: lessons, cards and the quiz.
        </p>
      </header>

      <Card>
        <h2 className="text-scale-base font-semibold">Which table</h2>
        <PresetChooser selectedId={preset.id} />
        <p className="mt-3 text-scale-xs text-bb-muted-foreground">
          Your own changes sit on top of whichever table is selected, so switching tables keeps
          them.
        </p>
      </Card>

      {conflicts.length > 0 ? (
        /* Amber and not red. Red is for errors, per the token rules, and this
           is not one: the numbers are applied, the questions still grade, and
           the only thing that has happened is that two sources disagree. */
        <section
          aria-label="Conflicts with authored questions"
          className="rounded-2xl border p-5"
          style={{
            background: "var(--warn-soft-solid)",
            borderColor: "var(--warn)",
            color: "var(--warn-ink-strong)",
          }}
        >
          <h2 className="text-scale-base font-semibold">
            {conflicts.length === 1
              ? "One question disagrees with your table"
              : `${conflicts.length} questions disagree with your table`}
          </h2>
          <p className="mt-1 text-scale-sm">
            Nothing has been changed for you. Your numbers are the numbers shown everywhere, and
            these questions still grade on the order they were written with. This list is here so
            you know where the two part company before an exam does it for you.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {conflicts.map((conflict) => (
              <li
                key={`${conflict.problemId}:${conflict.earlier.itemId}:${conflict.later.itemId}`}
                className="rounded-[12px] border p-3"
                style={{ borderColor: "var(--warn)" }}
              >
                <p className="text-scale-sm font-semibold">{CONFLICT_HEADLINE[conflict.kind]}</p>
                {/* No opacity here, deliberately. --warn-ink-strong on
                    --warn-soft-solid is 6.37:1 in light and 7.80:1 in dark, and
                    those are the audited pairs. Fading it to 80 percent drops
                    the light pair to 4.17:1, under AA for normal text, and it
                    is the one theme the fade was invisible in. */}
                <p className="mt-1 text-scale-xs">Ranked by {conflict.criterion}</p>
                <p className="mt-1 text-scale-sm">{conflict.message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-scale-base font-semibold">The ladder</h2>
          <span className="text-scale-xs text-bb-muted-foreground">Most acidic first</span>
        </div>
        <ul className="mt-2 divide-y divide-bb-border">
          {ladder.map((rung) => (
            <LadderRow
              key={rung.id}
              rung={rung}
              justSaved={rung.id === justSaved}
              onSaved={setSaved}
            />
          ))}
        </ul>
        {/* A live region rather than a toast. The list re-sorted under the
            reader, so a screen reader is told where the row went and a sighted
            reader gets the same sentence in the same place. */}
        <p className="mt-2 text-scale-xs text-bb-muted-foreground" role="status" aria-live="polite">
          {savedRung === null
            ? ""
            : `Saved. ${savedRung.label} is now ${formatPka(savedRung.value)}, at position ${
                ladder.indexOf(savedRung) + 1
              } of ${ladder.length} on the ladder.`}
        </p>
      </Card>

      <Card>
        <h2 className="text-scale-base font-semibold">Start over</h2>
        <p className="mt-1 text-scale-sm text-bb-muted-foreground">
          {changed === 0
            ? "You have not changed any single value yet."
            : changed === 1
              ? "You have changed one value."
              : `You have changed ${changed} values.`}{" "}
          Clearing them puts every rung back to the selected table.
        </p>
        <button
          type="button"
          disabled={changed === 0}
          onPointerDown={() => pkaSettings.clearAllOverrides()}
          onClick={() => pkaSettings.clearAllOverrides()}
          className="press mt-3 min-h-11 rounded-2xl border-2 border-bb-input bg-bb-card px-4 font-semibold disabled:opacity-50"
        >
          Clear my changes
        </button>
      </Card>
    </div>
  );
}

/**
 * The table picker, as a real radio group and not as buttons wearing the role.
 *
 * ROVING TABINDEX, named because it is the non obvious React pattern here and
 * because the previous version claimed `role="radio"` without it. A radio group
 * is ONE tab stop: Tab lands on the checked option, and the arrow keys move
 * between the options inside it. That is done by giving exactly one button
 * `tabIndex={0}` and the rest `tabIndex={-1}`, then moving focus by hand on an
 * arrow key. Without it, a keyboard user Tabs through every option one at a
 * time, which is the listbox behaviour, not the radio behaviour the role
 * promises a screen reader.
 *
 * The refs array is how focus gets moved: React does not focus anything for
 * you, so the group keeps a DOM node per option and calls `.focus()` on the
 * one it just selected.
 */
function PresetChooser({ selectedId }: { readonly selectedId: string }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    PKA_PRESETS.findIndex((option) => option.id === selectedId),
  );

  /** Select and focus in one move, which is what a radio arrow key does. */
  const moveTo = (index: number) => {
    const wrapped = (index + PKA_PRESETS.length) % PKA_PRESETS.length;
    const option = PKA_PRESETS[wrapped];
    if (option === undefined) return;
    pkaSettings.setPreset(option.id);
    buttons.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moveTo(selectedIndex + 1);
        return;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moveTo(selectedIndex - 1);
        return;
      case "Home":
        event.preventDefault();
        moveTo(0);
        return;
      case "End":
        event.preventDefault();
        moveTo(PKA_PRESETS.length - 1);
        return;
      default:
    }
  };

  return (
    <div
      className="mt-3 flex flex-col gap-2"
      role="radiogroup"
      aria-label="pKa table"
      onKeyDown={onKeyDown}
    >
      {PKA_PRESETS.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            onPointerDown={() => pkaSettings.setPreset(option.id)}
            onClick={() => pkaSettings.setPreset(option.id)}
            className={`press min-h-11 rounded-[12px] border p-3 text-left ${
              selected ? "border-bb-primary bg-bb-primary/10" : "border-bb-border bg-bb-card hover:bg-bb-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  selected ? "border-bb-primary bg-bb-primary" : "border-bb-input"
                }`}
              />
              <span className="text-scale-base font-semibold">{option.label}</span>
            </span>
            <span className="mt-1 block text-scale-sm text-bb-muted-foreground">{option.blurb}</span>
            <span className="mt-1 block text-scale-xs text-bb-muted-foreground">
              Source: {option.source}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * One rung. Owns its own draft text, so typing in this row does not re-render
 * the other fifteen.
 */
function LadderRow({
  rung,
  justSaved,
  onSaved,
}: {
  readonly rung: ResolvedPka;
  readonly justSaved: boolean;
  readonly onSaved: (id: PkaSiteId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(formatPka(rung.value));
  const [rejection, setRejection] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLLIElement | null>(null);
  /** A generated id, unique per row, so the input can point at ITS rejection. */
  const rejectionId = `${useId()}-rejection`;

  // Focus the field the moment the editor opens. On a phone the alternative is
  // tap Change, then tap the box, and the second tap is the one people miss.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The list re-sorts by value, so a saved row can land off screen. Bring it
  // back. `block: "nearest"` scrolls the least that works, so a row already in
  // view does not jump.
  useEffect(() => {
    if (justSaved) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [justSaved]);

  const startEditing = () => {
    setDraft(formatPka(rung.value));
    setRejection(null);
    setOpen(true);
  };

  const submit = () => {
    const problem = pkaInputRejection(draft);
    if (problem !== null) {
      setRejection(problem);
      return;
    }
    const value = parsePkaInput(draft);
    if (value === null) return;
    // The setter enforces the same range and can still refuse. Say so rather
    // than closing the editor on a value that was not stored.
    if (!pkaSettings.setOverride(rung.id, value)) {
      setRejection(pkaInputRejection(draft) ?? "That value could not be saved. Try another.");
      return;
    }
    setRejection(null);
    setOpen(false);
    onSaved(rung.id);
  };

  return (
    <li
      ref={rowRef}
      className={
        justSaved
          ? "-mx-2 rounded-[12px] border border-bb-primary bg-bb-primary/10 px-2 py-2.5"
          : "py-2.5"
      }
    >
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-scale-sm font-medium leading-snug">{rung.label}</span>
          {rung.origin === "override" ? (
            <span className="block text-scale-xs text-bb-muted-foreground">
              This table says {formatPka(rung.baseValue)}.
            </span>
          ) : null}
        </span>
        <span className="text-scale-base font-bold tabular-nums">{formatPka(rung.value)}</span>
        <Pill tone={rung.origin === "override" ? "primary" : "muted"}>
          {ORIGIN_LABEL[rung.origin]}
        </Pill>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Change the pKa of ${rung.label}`}
          /* onClick alone, unlike the buttons above: this one TOGGLES, so
             firing on pointer down and again on click would open and close it
             in one press. The pressed state still lands on pointer down,
             because .press does it in CSS with :active and never waits on JS. */
          onClick={() => (open ? setOpen(false) : startEditing())}
          className="press min-h-11 rounded-2xl border-2 border-bb-input px-3 text-scale-sm font-semibold"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      {open ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            inputMode="decimal"
            autoComplete="off"
            aria-label={`pKa of ${rung.label}`}
            aria-invalid={rejection !== null}
            /* Both attributes, on purpose. `aria-errormessage` is the correct
               one and `aria-describedby` is the one every screen reader
               already supports, so a reader hears the reason either way. Point
               them at the paragraph below, which carries this exact id: without
               it the field announces "invalid" and never says why. */
            {...(rejection === null
              ? {}
              : { "aria-errormessage": rejectionId, "aria-describedby": rejectionId })}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setRejection(null);
            }}
            className="min-h-11 w-28 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-base tabular-nums"
          />
          <button
            type="submit"
            className="press min-h-11 rounded-2xl border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary px-4 font-semibold text-bb-primary-foreground"
          >
            Save
          </button>
          {rung.origin === "override" ? (
            <button
              type="button"
              onPointerDown={() => {
                pkaSettings.clearOverride(rung.id);
                setOpen(false);
              }}
              onClick={() => {
                pkaSettings.clearOverride(rung.id);
                setOpen(false);
              }}
              className="press min-h-11 rounded-2xl border-2 border-bb-input px-3 text-scale-sm font-semibold"
            >
              Use the table value
            </button>
          ) : null}
          {rejection === null ? (
            <p className="basis-full text-scale-xs text-bb-muted-foreground">
              {rung.note ?? `Where this one came from: ${rung.source.replace(/_/g, " ")}.`}
            </p>
          ) : (
            <p
              id={rejectionId}
              className="basis-full text-scale-xs font-medium"
              style={{ color: "var(--warn-ink-strong)" }}
              role="alert"
            >
              {rejection}
            </p>
          )}
        </form>
      ) : null}
    </li>
  );
}
