/**
 * Sort the cards. The view, and only the view.
 *
 * WHAT THIS FILE IS NOT ALLOWED TO DO, stated first because it is the shape of
 * the whole module. It does not decide where a card may go: board.ts owns that,
 * as pure functions, so a drag and the keyboard cannot drift apart. It does not
 * decide whether an answer is right: judge.ts translates and
 * packages/curriculum grades. It does not know a pKa: pkaSettings.ts resolves
 * every number through the professor adjustable layer. What is left here is
 * turning gestures into moves and state into markup, which is what a React
 * component is for.
 *
 * THREE WAYS IN, ONE SET OF RULES. Every card starts on a rung, shuffled
 * (owner, 2026-10-16: "just sort it within the box"; the old pool below the
 * ladder sat off screen on a phone). Drag a card up or down and the cards
 * between slide to open the gap (board.ts moveToRung). Or tap two cards to swap
 * them, the no-drag path. Or use the keyboard: every card and every empty rung is a real <button>, so
 * Tab reaches them and Enter activates them, and Arrow Up and Arrow Down move a
 * card one rung at a time. The keyboard is not a fallback bolted on afterwards;
 * it is the tap path with a different input device, which is why it took no
 * extra rules.
 *
 * THE PRESS IS CSS, NOT STATE. CLAUDE.md requires the pressed frame on pointer
 * down, before any work. `:active` in sort.css is painted by the browser the
 * same frame the pointer lands, with no JavaScript in the path, so it cannot be
 * late. Which card is SELECTED resolves on release instead, because until the
 * finger lifts nobody knows whether the press was a tap or the start of a drag.
 *
 * THE DRAGGED CARD KEEPS ITS ELEMENT, and this is the bug that shipped once and
 * must not ship again. The card that is being dragged captured the pointer, so
 * it is the element every later pointermove and the pointerup are routed to.
 * The first version swapped it for a `<span>` placeholder the moment the drag
 * passed the threshold; a different element TYPE makes React unmount the old
 * node, and the Pointer Events spec releases capture implicitly when the
 * capturing element leaves the document. Everything after that first frame went
 * to whatever happened to be under the finger: the clone froze in mid air, a
 * release over an empty rung did nothing, and a release over another card ran
 * that card's handler with the wrong id. So the hole the card leaves behind is
 * the SAME `<button>`, carrying `is-ghosted`, which zeroes its paint and keeps
 * its box. That bug was back when this file moved into src/game (the test the
 * old repo pinned it with did not come along); it is fixed again, and the
 * gesture was checked with a real mouse drag in Chrome on 2026-10-16.
 *
 * REACT PATTERNS USED HERE, named because they are the kind of thing that is
 * hard to look up if you have not seen it before:
 *   useRef for values that must NOT trigger a render (the drop rectangles, the
 *     clock the attempt started on). A ref is a mutable box that survives
 *     renders and changing it never re-renders.
 *   setPointerCapture, which is a DOM API rather than a React one: it routes
 *     every later pointermove and pointerup for that finger to the element that
 *     captured it, so a drag does not break when the pointer leaves the card.
 *   functional setState (`setBoard((current) => ...)`) so a move always applies
 *     to the newest board rather than to whatever the handler closed over.
 *   RESET BY KEY: a caller showing a different ladder should render
 *     <SortBeatView key={content.beat.id} ... />. Changing the key makes React
 *     build a fresh component with fresh state, which is the boring way to
 *     reset a form and needs no effect at all.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PKA_TABLE, type OrderingState, type PkaSiteId } from "@blueberry/curriculum";
import { ChipPress } from "../ChipPress";
import { AnswerTray, TrayWhy } from "../AnswerTray";
import { canFail, clearsBeat, type BeatResult, type MasteryLevel } from "../types";
import { playCorrect } from "../../sound/gameSound";
import {
  boardIsComplete,
  boardOrder,
  moveToRung,
  nearestRung,
  nudge,
  placeOf,
  placeOnRung,
  rankedOpening,
  type SortBoard,
  type SortCardId,
  type TargetRect,
} from "./board";
import { judgeSort, type SortJudgement } from "./judge";
import type { SortContent } from "./ladders";
import type { NamedFigure } from "../mcq/mcqFigures";
import { StructureFigure } from "../../onboarding/StructureFigure";
import {
  formatPka,
  pkaSettings as pkaSettingsStore,
  pkaValueFor,
  sortBeatPkaConflicts,
  type PkaSettingsSnapshot,
} from "../../settings/pka";
import "./sort.css";

/** How far a pointer must travel before a press becomes a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  readonly card: SortCardId;
  readonly pointerId: number;
  /** Where the pointer went down, so a tap can be told from a drag. */
  readonly startX: number;
  readonly startY: number;
  /** Where the pointer is now. */
  readonly x: number;
  readonly y: number;
  /** Grab offset inside the card, so the card does not jump to its corner. */
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  /** The card's own left edge: the drag is vertical only, so it reads as a reorder. */
  readonly left: number;
  /** The rung the card was picked up from. */
  readonly from: number;
  /** Distance between one rung and the next, measured at drag start. */
  readonly pitch: number;
  readonly moved: boolean;
  /** The rung it would land on if released now. */
  readonly over: number | null;
}

/** Remembers, per device, that the "these cards move" nudge has been shown. */
const HINT_KEY = "bb-sort-hinted";

export interface SortBeatViewProps {
  readonly content: SortContent;
  /** The rung of the mastery ladder this is being played at. Recorded on the result. */
  readonly level?: MasteryLevel;
  /** The shuffle seed. Fixed by the caller so a board can be reproduced in a bug report. */
  readonly seed?: number;
  /**
   * The professor adjustable pKa table. Omit it and the beat reads the live
   * settings store, which is the normal case; a caller passes one only to
   * preview a table it has not saved yet.
   */
  readonly settings?: PkaSettingsSnapshot;
  readonly onResult?: (result: BeatResult) => void;
  /**
   * The submitted ranking, in packages/curriculum's own state shape.
   *
   * Here so the lesson player can keep using its existing
   * `onSubmit(state: AnswerState)` contract: it grades the problem itself and
   * this beat is the input surface. A caller that wants the beat's own verdict
   * uses `onResult` instead. Both fire, in that order, on one Check.
   */
  readonly onSubmitOrder?: (state: OrderingState) => void;
  /** Shown as the forward action once the ladder is right. */
  readonly onContinue?: () => void;
  /**
   * A drawing per card, keyed by item id (Unit 1's ladders carry one, owner
   * rule: draw structures, never formulas). A card without one shows its label alone.
   */
  readonly figures?: Readonly<Record<string, NamedFigure>>;
}

export function SortBeatView({
  content,
  level = 2,
  seed = 7,
  settings,
  onResult,
  onSubmitOrder,
  onContinue,
  figures,
}: SortBeatViewProps) {
  // useSyncExternalStore is React's supported way to read a store that lives
  // outside React (subscribe plus getSnapshot). It is what app/progress.ts and
  // the interaction store are already read with, so the pattern is not new here.
  const liveSettings = useSyncExternalStore(
    pkaSettingsStore.subscribe,
    pkaSettingsStore.getSnapshot,
    pkaSettingsStore.getSnapshot,
  );
  const table = settings ?? liveSettings;
  const itemIds = useMemo(() => content.beat.items.map((item) => item.id), [content]);
  const [board, setBoard] = useState<SortBoard>(() =>
    rankedOpening(itemIds, seed, content.spec.correctOrder),
  );
  const [selected, setSelected] = useState<SortCardId | null>(null);
  const [judgement, setJudgement] = useState<SortJudgement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Refs: mutable boxes that survive renders and never cause one.
  const rectsRef = useRef<readonly TargetRect[]>([]);
  const rungRefs = useRef<(HTMLLIElement | null)[]>([]);
  const startedAtRef = useRef<number>(Date.now());
  const openingRef = useRef<SortBoard>(board);

  // The first ranking a student ever meets nudges its top card once, so it is
  // obvious the cards move. Lazy useState initializer: read storage once, on mount.
  const [hinting, setHinting] = useState(() => {
    try {
      return window.localStorage.getItem(HINT_KEY) === null;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!hinting) return;
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage blocked: the nudge just shows again next time */
    }
    const stop = window.setTimeout(() => setHinting(false), 2600);
    return () => window.clearTimeout(stop);
  }, [hinting]);

  const judged = judgement !== null && judgement.status === "judged";
  const complete = boardIsComplete(board);
  // CHECK stays grey until the student has moved a card. The ladder opens full
  // but never solved, so a live CHECK on first paint only invited a free miss.
  // Every move returns a new board object, so "still the opening object" means
  // nothing has moved yet.
  const untouched = board === openingRef.current;
  const conflicts = useMemo(
    () => sortBeatPkaConflicts(content.beat, table),
    [content, table],
  );
  // The numbers appear only after the check, so the ladder is not given away,
  // and they appear even when a conflict is flagged: the flag's own copy
  // promises the student their number is still the number shown, and hiding it
  // would make that sentence false.
  const showValues = judged;

  const itemById = useMemo(() => {
    const map = new Map<string, (typeof content.beat.items)[number]>();
    for (const item of content.beat.items) map.set(item.id, item);
    return map;
  }, [content]);

  /** Every rung, measured ONCE at drag start. See board.ts on why this is not read per frame. */
  function collectRects(): readonly TargetRect[] {
    const rects: TargetRect[] = [];
    rungRefs.current.forEach((element, index) => {
      const rect = element?.getBoundingClientRect();
      if (rect === undefined) return;
      rects.push({
        target: { kind: "slot", index },
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
    });
    return rects;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, card: SortCardId) {
    if (judged) return;
    setHinting(false);
    // The pressed frame is already painted by :active. This only starts the drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    const rects = collectRects();
    rectsRef.current = rects;
    const rect = event.currentTarget.getBoundingClientRect();
    const from = board.slots.indexOf(card);
    setDrag({
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      width: rect.width,
      left: rect.left,
      from,
      pitch: rects.length > 1 ? (rects[1]?.top ?? 0) - (rects[0]?.top ?? 0) : 0,
      moved: false,
      over: null,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    setDrag((current) => {
      if (current === null || current.pointerId !== event.pointerId) return current;
      const travelled =
        Math.abs(event.clientX - current.startX) + Math.abs(event.clientY - current.startY);
      const moved = current.moved || travelled > DRAG_THRESHOLD_PX;
      return {
        ...current,
        x: event.clientX,
        y: event.clientY,
        moved,
        over: moved ? nearestRung(rectsRef.current, event.clientY) : null,
      };
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>, card: SortCardId) {
    const current = drag;
    setDrag(null);
    if (current === null || current.pointerId !== event.pointerId) return;

    if (current.moved) {
      const target = nearestRung(rectsRef.current, event.clientY);
      if (target !== null) {
        setBoard((live) => moveToRung(live, card, target));
      }
      setSelected(null);
      return;
    }

    // A tap. Either this card is being picked up, or a card already picked up
    // swaps rungs with this one (the no-drag path, and the one a switch user takes).
    if (selected !== null && selected !== card) {
      const moving = selected;
      setBoard((live) => {
        // Where the tapped card sits is read from the LIVE board inside the
        // updater, not from the render this handler closed over.
        const here = placeOf(live, card);
        return here !== null && here.where === "slot" ? placeOnRung(live, moving, here.index) : live;
      });
      setSelected(null);
      return;
    }
    setSelected(selected === card ? null : card);
  }

  function handleCardKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, card: SortCardId) {
    if (judged) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setBoard((live) => nudge(live, card, event.key === "ArrowUp" ? -1 : 1));
    }
  }

  /**
   * How far a ranked card slides while another is dragged past it, so the
   * ladder opens a gap where the dragged card would land.
   */
  function slideFor(index: number): number {
    if (drag === null || !drag.moved || drag.over === null || drag.from < 0) return 0;
    if (drag.from < index && index <= drag.over) return -drag.pitch;
    if (drag.over <= index && index < drag.from) return drag.pitch;
    return 0;
  }

  function handleEmptyRung(index: number) {
    if (judged || selected === null) return;
    const moving = selected;
    setBoard((live) => placeOnRung(live, moving, index));
    setSelected(null);
  }

  function check() {
    const judgedNow = judgeSort(content, board, {
      level,
      elapsedMs: Date.now() - startedAtRef.current,
      at: new Date().toISOString(),
    });
    setJudgement(judgedNow);
    setSelected(null);
    if (judgedNow.status !== "judged") return;
    if (onSubmitOrder !== undefined) {
      onSubmitOrder({ kind: "ordering", order: boardOrder(board) });
    }
    if (clearsBeat(judgedNow.result)) playCorrect();
    if (onResult !== undefined) onResult(judgedNow.result);
  }

  function adjust() {
    setJudgement(null);
    startedAtRef.current = Date.now();
  }

  const nearest = judged && judgement.status === "judged" ? judgement.breakdown.nearest : null;
  const cleared =
    judged &&
    judgement.status === "judged" &&
    (judgement.result.kind === "correct" || judgement.result.kind === "correct_alternative_route");

  function cardMarkClass(card: SortCardId, index: number): string {
    if (nearest === null) return "";
    return nearest[index] === card ? " is-correct" : " is-misplaced";
  }

  function renderCard(card: SortCardId, options: { readonly ranked: boolean; readonly index: number }) {
    const item = itemById.get(card);
    if (item === undefined) return null;
    // SortItem.pkaSiteId is a plain string on the beat contract, so it is
    // checked against the real table before it is used as a key. Same guard the
    // settings layer's own sortItemValue applies, for the same reason: an
    // authored typo must read as "no number here" rather than throw at a
    // student mid lesson.
    const site =
      item.pkaSiteId !== undefined && item.pkaSiteId in PKA_TABLE
        ? (item.pkaSiteId as PkaSiteId)
        : null;
    const value = site === null ? null : pkaValueFor(table, site);
    // The dragged card's OWN button stays mounted, painted as a hole: it holds the
    // pointer capture, and swapping it for another element ends the drag (header).
    const ghosted = drag !== null && drag.card === card && drag.moved;
    const slide = options.ranked ? slideFor(options.index) : 0;
    const classes = [
      "sort-card",
      options.ranked ? " is-ranked" : "",
      ghosted ? " is-ghosted" : "",
      hinting && options.ranked && options.index === 0 ? " is-hinting" : "",
      selected === card ? " is-selected" : "",
      options.ranked ? cardMarkClass(card, options.index) : "",
    ].join("");
    const position = options.ranked ? `rung ${options.index + 1}` : "the card pool";
    const body = (
      <>
        <span className="sort-card__edge" aria-hidden />
        <span className="sort-card__face">
          {figures?.[card] === undefined ? null : (
            <StructureFigure figure={figures[card].figure} className="sort-card__figure" />
          )}
          <span className="sort-card__label">{item.label}</span>
          {showValues && value !== null ? (
            <span className="sort-card__pka">pKa {formatPka(value)}</span>
          ) : null}
          {judged ? null : (
            <span className="sort-card__grip" aria-hidden>
              ⋮⋮
            </span>
          )}
          {/* The right-or-move mark, so colour is never the only signal. */}
          {judged && options.ranked && nearest !== null ? (
            <span className="sort-card__mark">{nearest[options.index] === card ? "✓" : "Move"}</span>
          ) : null}
        </span>
        {judged && item.why !== undefined ? (
          <span className="sort-card__why">{item.why}</span>
        ) : null}
      </>
    );

    // Once the attempt is judged the card stops being a control and becomes
    // what it now is: a labelled result carrying its reason. A disabled button
    // would drop out of the tab order and take that reason with it, which is
    // the sentence a student most wants to read at that moment.
    if (judged) {
      return (
        <div key={card} className={classes}>
          {body}
        </div>
      );
    }

    return (
      <button
        key={card}
        type="button"
        className={classes}
        style={slide === 0 ? undefined : { transform: `translateY(${slide}px)` }}
        aria-pressed={selected === card}
        aria-label={`${item.label}, in ${position}`}
        onPointerDown={(event) => handlePointerDown(event, card)}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerUp(event, card)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(event) => handleCardKeyDown(event, card)}
      >
        {body}
      </button>
    );
  }

  const draggedItem = drag === null ? undefined : itemById.get(drag.card);

  return (
    <section className="sort-beat">
      {/* The prompt is the screen's one heading, so heading navigation in a
          screen reader lands on the question. */}
      <h1 className="sort-beat__prompt">{content.beat.prompt}</h1>
      {content.beat.brief === undefined ? null : (
        <p className="sort-beat__brief">{content.beat.brief}</p>
      )}
      <p className="sort-beat__how">
        Drag a card up or down to put the ladder in order, or tap two cards to swap them.
        {/* The keyboard half is hidden on touch screens (sort.css), where it
            only pushed the ladder down. */}
        <span className="sort-beat__keys"> On a keyboard, Tab to a card and use Arrow Up and Arrow Down to move it.</span>
      </p>

      {conflicts.map((conflict) => (
        <div className="sort-conflict" role="status" key={`${conflict.earlier.itemId}-${conflict.later.itemId}`}>
          <b>Your pKa table ranks two of these the other way.</b> {conflict.message}
        </div>
      ))}

      <div className="sort-track">
        <div className="sort-track__end">{content.trackEnds.first}</div>
        <div className="sort-track__body">
          <div className="sort-track__rail" aria-hidden />
          <ol className="sort-track__rungs">
            {board.slots.map((card, index) => {
              const armed = selected !== null && card === null;
              const over = drag !== null && drag.over === index;
              return (
                <li
                  key={index}
                  className="sort-rung"
                  ref={(element) => {
                    rungRefs.current[index] = element;
                  }}
                >
                  <span className="sort-rung__number" aria-hidden>
                    {index + 1}
                  </span>
                  <div className="sort-rung__socket">
                    {card === null ? (
                      <button
                        type="button"
                        className={`sort-slot-empty${armed ? " is-armed" : ""}${over ? " is-over" : ""}`}
                        onClick={() => handleEmptyRung(index)}
                        disabled={judged}
                        aria-label={
                          selected === null
                            ? `Rung ${index + 1}, empty`
                            : `Put the selected card on rung ${index + 1}`
                        }
                      >
                        {selected === null ? "Empty rung" : "Put it here"}
                      </button>
                    ) : (
                      renderCard(card, { ranked: true, index })
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="sort-track__end">{content.trackEnds.last}</div>
      </div>

      {/* THE FOOTER, docked at the bottom of the lesson (sticky in sort.css).
          Before the check it holds one full-width CHECK. After the check the
          SAME slot becomes the shared answer tray (AnswerTray.tsx), green with
          KEEP GOING when the ladder is right and red with TRY AGAIN when it is
          not: the same tray every lesson type uses (A2 round 4). */}
      {judged && judgement !== null && judgement.status === "judged" ? (
        <AnswerTray
          tone={cleared ? "right" : "wrong"}
          title={cleared ? "Nice!" : "Not quite"}
          actionLabel={cleared ? "Keep going" : "Try again"}
          onAction={cleared ? onContinue : adjust}
          actionDisabled={cleared && onContinue === undefined}
        >
          <p className="answer-tray__answer">{judgement.headline}</p>
          {judgement.explanation === null ? null : (
            <>
              {/* The tray stays short: the headline, one line on show, and the
                  rest folded behind a native <details>. A right ladder shows
                  the why. A wrong one shows what to look at next, because an
                  authored distractor's why describes the tempting reasoning,
                  and its first sentence alone can read as approval ("so the
                  ranking work is done"). A2 round 6. */}
              {cleared ? (
                <TrayWhy
                  lead={judgement.explanation.why}
                  more={[judgement.explanation.whatHappened, judgement.explanation.lookAt]}
                />
              ) : (
                <TrayWhy
                  lead={judgement.explanation.lookAt}
                  more={[judgement.explanation.why, judgement.explanation.whatHappened]}
                />
              )}
            </>
          )}
          {!canFail(level) ? <p>First meeting: this one is a look, not a test.</p> : null}
        </AnswerTray>
      ) : (
        <div className="sort-beat__actions foot-bleed">
          <ChipPress onClick={check} disabled={!complete || untouched}>
            Check
          </ChipPress>
          {!canFail(level) ? (
            <span className="sort-beat__how">First meeting: this one is a look, not a test.</span>
          ) : null}
        </div>
      )}

      {drag !== null && drag.moved && draggedItem !== undefined ? (
        <div
          className="sort-card is-dragging"
          style={{
            left: `${drag.left}px`,
            top: `${drag.y - drag.dy}px`,
            width: `${drag.width}px`,
          }}
          aria-hidden
        >
          <span className="sort-card__edge" />
          <span className="sort-card__face">
            {figures?.[drag.card] === undefined ? null : (
              <StructureFigure figure={figures[drag.card].figure} className="sort-card__figure" />
            )}
            <span className="sort-card__label">{draggedItem.label}</span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
