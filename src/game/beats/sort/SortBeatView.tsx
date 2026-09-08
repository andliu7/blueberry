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
 * THREE WAYS IN, ONE SET OF RULES. Drag a card onto a rung. Or tap a card, then
 * tap a rung, which is the path that works on a phone and is the path the
 * reference capture ("Tap / Drag the node to fill in the blank") offers first.
 * Or use the keyboard: every card and every empty rung is a real <button>, so
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
 * its box. test/sortDrag.test.tsx pins the whole gesture against exactly this.
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
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { PKA_TABLE, type OrderingState, type PkaSiteId } from "@blueberry/curriculum";
import { ChipPress } from "../ChipPress";
import { canFail, type BeatResult, type MasteryLevel } from "../types";
import {
  boardIsComplete,
  boardOrder,
  emptyRungCount,
  hitTarget,
  nudge,
  placeOf,
  placeOnRung,
  returnToPool,
  applyDrop,
  openingBoard,
  type DropTarget,
  type SortBoard,
  type SortCardId,
  type TargetRect,
} from "./board";
import { judgeSort, type SortJudgement } from "./judge";
import type { SortContent } from "./ladders";
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
  readonly moved: boolean;
  readonly over: DropTarget | null;
}

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
}

export function SortBeatView({
  content,
  level = 2,
  seed = 7,
  settings,
  onResult,
  onSubmitOrder,
  onContinue,
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
  const [board, setBoard] = useState<SortBoard>(() => openingBoard(itemIds, seed));
  const [selected, setSelected] = useState<SortCardId | null>(null);
  const [judgement, setJudgement] = useState<SortJudgement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Refs: mutable boxes that survive renders and never cause one.
  const rectsRef = useRef<readonly TargetRect[]>([]);
  const rungRefs = useRef<(HTMLLIElement | null)[]>([]);
  const poolRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const judged = judgement !== null && judgement.status === "judged";
  const complete = boardIsComplete(board);
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

  /**
   * Every drop target, measured ONCE at drag start. See board.ts on why this is
   * not read per frame. The pool goes in first and the rungs after, because
   * hitTarget lets the later rect win.
   */
  function collectRects(): readonly TargetRect[] {
    const rects: TargetRect[] = [];
    const pool = poolRef.current?.getBoundingClientRect();
    if (pool !== undefined) {
      rects.push({
        target: { kind: "pool" },
        left: pool.left,
        top: pool.top,
        right: pool.right,
        bottom: pool.bottom,
      });
    }
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
    // The pressed frame is already painted by :active. This only starts the drag.
    event.currentTarget.setPointerCapture(event.pointerId);
    rectsRef.current = collectRects();
    const rect = event.currentTarget.getBoundingClientRect();
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
        over: moved ? hitTarget(rectsRef.current, event.clientX, event.clientY) : null,
      };
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>, card: SortCardId) {
    const current = drag;
    setDrag(null);
    if (current === null || current.pointerId !== event.pointerId) return;

    if (current.moved) {
      const target = hitTarget(rectsRef.current, event.clientX, event.clientY);
      if (target !== null) {
        setBoard((live) => applyDrop(live, card, target));
      }
      setSelected(null);
      return;
    }

    // A tap. Either this card is being picked up, or a card already picked up
    // is being dropped onto whatever this card is sitting on.
    if (selected !== null && selected !== card) {
      const moving = selected;
      setBoard((live) => {
        // Where the tapped card sits is read from the LIVE board inside the
        // updater, not from the render this handler closed over.
        const here = placeOf(live, card);
        return here !== null && here.where === "slot"
          ? placeOnRung(live, moving, here.index)
          : returnToPool(live, moving);
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
  const sound =
    judged && judgement.status === "judged" && judgement.result.kind === "valid_not_requested";

  function cardMarkClass(card: SortCardId, index: number): string {
    if (nearest === null) return "";
    return nearest[index] === card ? " is-correct" : " is-misplaced";
  }

  function renderCard(card: SortCardId, options: { readonly ranked: boolean; readonly index: number }) {
    const item = itemById.get(card);
    if (item === undefined) return null;
    if (drag !== null && drag.card === card && drag.moved) {
      // The hole the card left, so nothing under the finger jumps.
      return <span key={card} className="sort-card-ghost" aria-hidden />;
    }
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
    const classes = [
      "sort-card",
      options.ranked ? " is-ranked" : "",
      selected === card ? " is-selected" : "",
      options.ranked ? cardMarkClass(card, options.index) : "",
    ].join("");
    const position = options.ranked ? `rung ${options.index + 1}` : "the card pool";
    const body = (
      <>
        <span className="sort-card__edge" aria-hidden />
        <span className="sort-card__face">
          <span className="sort-card__label">{item.label}</span>
          {showValues && value !== null ? (
            <span className="sort-card__pka">pKa {formatPka(value)}</span>
          ) : null}
          {judged ? null : (
            <span className="sort-card__grip" aria-hidden>
              ⋮⋮
            </span>
          )}
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
      <p className="sort-beat__prompt">{content.beat.prompt}</p>
      {content.beat.brief === undefined ? null : (
        <p className="sort-beat__brief">{content.beat.brief}</p>
      )}
      <p className="sort-beat__how">
        Drag a card onto a rung, or tap the card and then the rung. On a keyboard, Tab to a card and
        use Arrow Up and Arrow Down to move it.
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
              const over =
                drag !== null && drag.over !== null && drag.over.kind === "slot"
                  ? drag.over.index === index
                  : false;
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

      <div
        className={`sort-pool${drag?.over?.kind === "pool" ? " is-over" : ""}`}
        ref={poolRef}
        aria-label="Cards not yet ranked"
      >
        {board.pool.length === 0 ? (
          <p className="sort-pool__empty">Every card is on the track.</p>
        ) : (
          board.pool.map((card) => renderCard(card, { ranked: false, index: -1 }))
        )}
      </div>

      {/* THE COMMIT IS A CHIP, and its disabled state is a different object.
          The S3 judge's carry against the question screen was an outlined
          Check whose disabled state was ambiguous; this row held the same
          defect, because a ladder is incomplete far more often than it is
          complete and the student was reading a dimmed button to find out.
          ChipPress is the committed button-types sheet's own construction:
          the sheet's periwinkle check face over a darker bottom edge while
          it is live, and the sheet's cool grey-blue disabled pill, which is
          a different object rather than a dimmer one, while it is not. */}
      <div className="sort-beat__actions">
        {judged ? (
          cleared ? (
            <ChipPress onClick={onContinue} disabled={onContinue === undefined}>
              Keep going
            </ChipPress>
          ) : (
            <ChipPress variant="quiet" onClick={adjust}>
              Adjust the ladder
            </ChipPress>
          )
        ) : (
          <ChipPress onClick={check} disabled={!complete}>
            Check
          </ChipPress>
        )}
        {!judged && !complete ? (
          <span className="sort-beat__how">
            {emptyRungCount(board)} still to place.
          </span>
        ) : null}
        {!canFail(level) ? (
          <span className="sort-beat__how">First meeting: this one is a look, not a test.</span>
        ) : null}
      </div>

      {judgement !== null && judgement.status === "judged" ? (
        <div
          className={`sort-feedback${cleared ? " is-correct" : ""}${sound ? " is-sound" : ""}`}
          role="status"
        >
          {judgement.tier === null ? null : (
            <span className="sort-feedback__tier">
              {judgement.tier === 2 ? "Anticipated answer" : `Tier ${judgement.tier}`}
            </span>
          )}
          <p className="sort-feedback__headline">{judgement.headline}</p>
          {judgement.explanation === null ? null : (
            <>
              <p className="sort-feedback__field">{judgement.explanation.whatHappened}</p>
              <p className="sort-feedback__field">{judgement.explanation.why}</p>
              <p className="sort-feedback__field">
                <b>Look at</b> {judgement.explanation.lookAt}
              </p>
            </>
          )}
        </div>
      ) : null}

      {drag !== null && drag.moved && draggedItem !== undefined ? (
        <div
          className="sort-card is-dragging"
          style={{
            left: `${drag.x - drag.dx}px`,
            top: `${drag.y - drag.dy}px`,
            width: `${drag.width}px`,
          }}
          aria-hidden
        >
          <span className="sort-card__edge" />
          <span className="sort-card__face">
            <span className="sort-card__label">{draggedItem.label}</span>
          </span>
        </div>
      ) : null}
    </section>
  );
}
