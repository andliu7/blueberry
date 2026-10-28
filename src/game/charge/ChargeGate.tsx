/**
 * The Charge sheet: what a node costs, said before anything is spent.
 *
 * WHY A SHEET AND NOT A SCREEN. mobile-ui's rule for an in-context choice: a
 * bottom sheet keeps the student where they were. Tapping a node on the pathway
 * and being thrown to a full page about a currency is a context switch for a
 * question that takes one line to answer, and the answer is usually yes. So the
 * track stays visible behind it on the phone, and on a wide viewport the panel
 * centres because there is no bottom edge worth anchoring to.
 *
 * WHY A NATIVE <dialog>. Modality, focus trapping, Escape and the top layer are
 * the browser's. Hand rolling those is three bugs; `showModal()` is none. Same
 * call and the same reasoning as LanguagePicker.tsx and Hud.tsx.
 *
 * THE THREE STATES THE PIECE IS, and the fourth that has to exist:
 *
 *   ready  The cost is DRAWN on the meter as the stretch about to go, and
 *          written once underneath. Pressing Start commits: the ghost retreats
 *          into the fill, the chip carrying the number goes with it, Bloom's
 *          halo thins to the new level, and only then does the route change.
 *          The animation is the receipt.
 *   empty  Bloom flat grey and sleepy, the meter empty with a clock standing in
 *          it, when the next point lands and when the meter is full again, and
 *          the free way out as the PRIMARY action, because it is true.
 *   exam   The meter is REPLACED by a badge that names the window. Drawing it
 *          full would still be drawing a meter, and a meter a student can still
 *          see is a meter a student still counts; the claim is that this
 *          fortnight has none.
 *   free   Review, tutorial and intro cost nothing, ever. The meter is drawn
 *          untouched and the sheet says why it is free in that kind's own words.
 *
 * THE METER ITSELF IS charge/ChargeMeter.tsx, built to the committed states
 * sheet `docs/reference/design-goals/blueberry_spec-meter-states_1788291102.png`
 * and shared with the header. This file decides WHAT is being spent and holds
 * the commit; the meter decides nothing and draws the four pictures.
 *
 * EVERY NUMBER IS READ. docs/ECONOMY.md, Anti-abuse: "The client animates what
 * the server concluded." The cost comes from `chargeCostFor` in the economy
 * package, the balance and the regeneration come off `deriveEconomy`, and the
 * spend is an appended event whose consequences are derived, never assigned.
 * Nothing on this sheet is added up here.
 *
 * THE RELEASE IS THE COMMIT. CLAUDE.md: the pressed state renders on pointer
 * down before any work happens, and that sink (:active) is the instant
 * acknowledgement. Start spends on `onClick`, on release over the key, so a
 * press that slides off spends nothing. Under reduced motion the spend still
 * happens on that release and the route changes immediately: the settled
 * frame is the destination.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { deriveEconomy, type EconomySnapshot } from "@blueberry/economy";
import { Berry } from "../mascot/Berry";
import { ChargeMark, DiamondMark } from "../app/ui/HudIcons";
import { economyOptions, progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { navigate } from "../app/useHashRoute";
import { hrefForReview } from "../app/routes";
import { chargeMeterModel, type ChargeMeterModel } from "./chargeMeterModel";
import { chargeEntryOf, chargeGateModel, type ChargeGateModel, type ChargeGateNode } from "./chargeGateModel";
import "./charge.css";
import "./startpop.css";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { isRestart, restartCopy } from "../resume/restartCopy";

/**
 * How often the sheet re-derives while it is open and nothing has been pressed.
 *
 * A second, because the empty state carries a countdown to the next point and a
 * countdown that does not count is a screenshot. The derivation is pure
 * arithmetic over a short journal, and it stops the moment the student commits:
 * see `phase`, which freezes the model so the numbers the animation is playing
 * cannot move under it.
 */
const TICK_MS = 1000;

/**
 * How long the commit holds the sheet before the route changes.
 *
 * Long enough for the drain to finish and be READ: the doomed pips go out over
 * about 500 ms including their stagger and the halo thins over 620, so a second
 * lands the student on the settled frame rather than cutting the receipt off
 * mid animation. It is skipped entirely under reduced motion, and skipped for a
 * free node, where there is nothing to animate and a wait would be theatre.
 */
const COMMIT_MS = 1000;

/** Where "Review drills are always free" goes. Named by the route table, never typed here. */
export const REVIEW_HREF = hrefForReview();

type Phase = "idle" | "spending";

/**
 * Go where the node points, whatever shape its href is.
 *
 * Two shapes exist on the pathway and only one of them is a hash. A beat is
 * "#/lesson/u3-directing"; a trainer deep link is "?reaction=seq-eas#/trainer",
 * a query AND a hash, because the trainer reads its subject from the search
 * string. `navigate` assigns to location.hash, so handing it the second shape
 * produces "#?reaction=seq-eas#/trainer", which routes to the trainer's default
 * demo and silently loses the reaction the student pressed.
 *
 * This was invisible while the node was a plain anchor, because the browser
 * resolved the href itself. Interposing a sheet made the shell responsible for
 * the navigation, so the shell has to handle both: a hash goes through the
 * router, and anything else is resolved the way the anchor would have.
 */
function go(href: string): void {
  if (href.startsWith("#")) {
    navigate(href);
    return;
  }
  window.location.assign(href);
}

/**
 * The economy against the wall clock, with the store's own course denominator.
 *
 * `economyOptions` hands back the cached universe the pathway and the header
 * both use, so three surfaces reading one journal cannot report three balances.
 * progress.ts's header says exactly why that is not optional.
 */
function useLiveEconomy(live: boolean): EconomySnapshot {
  const snapshot = useProgress();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [live]);
  const { journal, course } = snapshot;
  // `tick` is the point of the hook: it makes the wall clock an input rather
  // than something read once at mount.
  return useMemo(
    () => deriveEconomy(journal, new Date().toISOString(), economyOptions(course)),
    [journal, course, tick],
  );
}

/** The question the card asks. Presentation only; the model's words stay the model's. */
function askOf(state: ChargeGateModel["state"]): string {
  if (state === "empty") return "Recharging";
  return "Ready?";
}

/** The helper under the key is ONE sentence: the first one the model wrote. */
function oneLine(text: string): string {
  const end = text.search(/[.!?](\s|$)/);
  return end < 0 ? text : text.slice(0, end + 1);
}

/** The card's colour follows the node kind, the way a unit's does on the path. */
function hueOf(kind: ChargeGateNode["kind"]): string {
  if (kind === "review") return "rose";
  if (kind === "quiz") return "amber";
  if (kind === "tutorial" || kind === "intro") return "green";
  if (kind === "branch") return "teal";
  return "violet";
}

/** The main key's verb. The price rides beside it as a bolt and a number. */
function goLabel(model: ChargeGateModel): string {
  if (model.state === "empty") return "Review, free";
  if (model.state === "free") return "Start, free";
  return "Start";
}

export interface ChargeGateProps {
  /** The node being entered, or null when the sheet is closed. */
  readonly node: ChargeGateNode | null;
  readonly onClose: () => void;
  readonly reducedMotion: boolean;
  /**
   * Called once the entry is journalled, in place of going to the node's href.
   * The resume screen's START OVER uses it: the student is already on the
   * lesson, so the gate charges a fresh run and hands control back.
   */
  readonly onStarted?: () => void;
  /** What a START OVER erases, for example "4 saved questions"; the sheet names that loss (resume/restartCopy.ts). */
  readonly restartSaved?: string;
}

/**
 * The sheet. One dialog, four states, one commit path.
 *
 * The component is mounted by the pathway and holds no node of its own: which
 * node is being entered is the caller's state, so the pathway can open the
 * sheet from a track node, a side quest, or anywhere else that costs charge,
 * without the sheet knowing what a pathway is.
 */
export function ChargeGate({ node, onClose, reducedMotion, onStarted, restartSaved }: ChargeGateProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  /** The model at the instant of the commit, so the animation's endpoints hold still. */
  const [frozen, setFrozen] = useState<ChargeGateModel | null>(null);
  const [frozenMeter, setFrozenMeter] = useState<ChargeMeterModel | null>(null);
  const timer = useRef<number | null>(null);
  /**
   * Where the tapped node was, read off the element that held focus when the
   * sheet opened. The card hangs under that node with a notch pointing at it,
   * over the live path, so the pathway needs no wiring and a caller that opens
   * the sheet from elsewhere (no node focused) gets the bottom sheet instead.
   */
  const [anchor, setAnchor] = useState<{ readonly bottom: number; readonly x: number } | null>(null);
  const [place, setPlace] = useState<{ readonly top: number; readonly notch: number; readonly side: "l" | "r" } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (node === null) {
      setAnchor(null);
      setPlace(null);
      return;
    }
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || el === document.body || el.closest("dialog") !== null) {
      setAnchor(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setAnchor(r.width === 0 ? null : { bottom: r.bottom, x: r.left + r.width / 2 });
  }, [node]);

  const economy = useLiveEconomy(node !== null && phase === "idle");
  const live = useMemo(() => {
    if (node === null) return null;
    const model = chargeGateModel(economy, node);
    return restartSaved === undefined ? model : restartCopy(model, restartSaved);
  }, [economy, node, restartSaved]);
  /**
   * The meter, and the SPEND IS ONLY PASSED WHEN IT CAN ACTUALLY HAPPEN.
   *
   * `cost` is what the node prices at, which is not the same question as what
   * is about to leave: in the empty state the cost is larger than the balance,
   * and handing that to the meter would draw every point a student has left as
   * leaving, which is both wrong and the exact anxiety this surface is written
   * against. So the ghost appears in `ready` and nowhere else.
   */
  const liveMeter = useMemo(
    () => (live === null ? null : chargeMeterModel(economy, { spend: live.state === "ready" ? live.cost : 0 })),
    [economy, live],
  );
  const model = phase === "spending" ? frozen : live;
  /**
   * FROZEN SEPARATELY, and it has to be. The commit appends `node_started`
   * first, so one render later the live snapshot already reports the balance
   * AFTER the spend and the meter would have nothing left to drain. Holding the
   * model taken at the press keeps the animation's endpoints still, which is
   * the same reason the gate model is frozen one line above.
   */
  const meter = phase === "spending" ? frozenMeter : liveMeter;

  const cardKey = model === null ? "" : `${model.state}${meter === null ? 0 : 1}${model.topUp === null ? 0 : 1}`;
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (anchor === null || card === null || window.innerWidth >= 768) {
      setPlace(null);
      return;
    }
    const width = card.offsetWidth;
    const left = (window.innerWidth - width) / 2;
    const roomAbove = 12;
    let { bottom } = anchor;
    // Not enough room under the node: slide the path up so the card still fits below it.
    const need = bottom + 20 + card.offsetHeight + 12 - window.innerHeight;
    if (need > 0) {
      const before = window.scrollY;
      window.scrollBy(0, need);
      bottom -= window.scrollY - before;
    }
    const top = Math.max(roomAbove, Math.min(bottom + 20, window.innerHeight - card.offsetHeight - 12));
    const notch = Math.max(28, Math.min(width - 28, anchor.x - left));
    // Bloom stands to the side the node is NOT on, so he never covers what was tapped.
    setPlace({ top, notch, side: notch < width / 2 ? "r" : "l" });
  }, [anchor, cardKey]);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (node !== null && !dialog.open) dialog.showModal();
    if (node === null && dialog.open) dialog.close();
  }, [node]);

  // A sheet that is dismissed mid commit must not navigate afterwards.
  useEffect(() => {
    if (node !== null) return;
    setPhase("idle");
    setFrozen(null);
    setFrozenMeter(null);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, [node]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /**
   * The commit. Everything that costs anything happens here and nowhere else.
   *
   * The order matters and it is the order docs/ECONOMY.md describes: the event
   * is appended FIRST, so the balance on screen a moment later is derived from
   * a journal that already contains the spend, and the animation is playing a
   * conclusion rather than predicting one. `node_started` is what spends charge;
   * the derivation prices it from CHARGE_COST and this file never subtracts.
   */
  const start = (): void => {
    if (model === null || phase === "spending") return;
    setFrozen(model);
    setFrozenMeter(meter);
    progress.startNode(model.node.id, model.node.kind, chargeEntryOf(model.node));
    const enter = () => {
      if (onStarted !== undefined) onStarted();
      else go(model.node.href);
      onClose();
    };
    if (reducedMotion || model.cost === 0) {
      enter();
      return;
    }
    setPhase("spending");
    timer.current = window.setTimeout(enter, COMMIT_MS);
  };

  const topUp = (): void => {
    if (model === null || model.topUp === null || !model.topUp.affordable) return;
    // A spend, journalled like any other. The meter it refills is derived from
    // the same journal one line later, so the sheet updates itself.
    progress.spend("charge_topup", model.topUp.cost, model.node.id);
  };

  return (
    <dialog
      ref={ref}
      className={`charge-sheet start-pop${place === null ? "" : " sp-anchored"}`}
      data-bloom={place === null ? "r" : place.side}
      data-charge-state={model === null ? "closed" : model.state}
      data-charge-phase={phase}
      aria-label={model === null ? "Charge" : model.label}
      onClose={onClose}
      onClick={closeOnBackdrop(ref, onClose)}
    >
      {model === null ? null : (
        <div
          ref={cardRef}
          className="sp-card"
          data-hue={hueOf(model.node.kind)}
          style={place === null ? undefined : ({ "--sp-top": `${place.top}px`, "--sp-notch": `${place.notch}px` } as CSSProperties)}
        >
          {place === null ? null : <span className="sp-notch" aria-hidden />}
          <div className="sp-bloom" aria-hidden>
            <Berry
              state="charged"
              chargeLevel={
                model.state === "exam" ? 1 : model.cap <= 0 ? 0 : (phase === "spending" ? model.after : model.before) / model.cap
              }
              mood={model.state === "empty" ? "sleepy" : "happy"}
              behaviour={model.state === "empty" ? "sleepy" : phase === "spending" ? "celebrate" : "wave"}
              reducedMotion={reducedMotion}
              sizePx={116}
            />
          </div>
          <div className="sp-top">
            <span className="sp-chip">{model.kindLabel}</span>
            <button type="button" className="sp-x" aria-label="Close" data-charge-close onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="sp-words">
            <h2 className="sp-ask">{askOf(model.state)}</h2>
            <p className="sp-name">{model.node.title}</p>
            {meter === null || model.state !== "ready" ? null : (
              <span className="sr-only">{`Charge ${model.before} of ${model.cap}, ${model.cost} to start`}</span>
            )}
          </div>

          {isRestart(model, restartSaved) ? (
            <button type="button" className="sp-go" data-charge-keep onClick={onClose}>
              {model.dismissLabel}
            </button>
          ) : null}

          <button
            type="button"
            className={isRestart(model, restartSaved) ? "sp-quiet restart-erase" : "sp-go"}
            data-charge-primary
            data-track="lesson.start"
            data-cta
            onClick={() => {
              if (model.state === "empty") {
                navigate(REVIEW_HREF);
                onClose();
                return;
              }
              start();
            }}
          >
            {isRestart(model, restartSaved) ? (
              model.primaryLabel
            ) : (
              <>
                <span>{goLabel(model)}</span>
                {model.state === "ready" ? (
                  <span className="sp-cost">
                    <ChargeMark className="sp-bolt" />
                    {model.cost}
                  </span>
                ) : null}
              </>
            )}
          </button>

          {model.topUp === null ? null : (
            <button type="button" className="sp-quiet" data-charge-topup disabled={!model.topUp.affordable} onClick={topUp}>
              <DiamondMark className="h-5 w-5 shrink-0" />
              <span>{model.topUp.label}</span>
            </button>
          )}
          {model.topUp === null ? null : <p className="sp-promise">{model.topUp.note}</p>}

          {model.topUp !== null || meter === null ? null : (
            model.state === "ready" ? null : <p className="sp-line">{oneLine(model.headline)}</p>
          )}

          {isRestart(model, restartSaved) ? null : (
            <button type="button" className="sp-quiet sp-dismiss" onClick={onClose}>
              {model.dismissLabel}
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
