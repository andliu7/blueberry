/**
 * The "Draw it" screen: the prompt, the starting materials, a structure editor
 * and CHECK. The verdict docks in the shared answer tray (AnswerTray.tsx).
 *
 * HOW A MISS PLAYS, rebuilt in U1-P3 round 2 so the student learns from what
 * they drew instead of being handed the answer:
 *
 *   1. First CHECK on a real drawing is the graded answer (onResult fires once,
 *      here). If the drawing is one of the item's named wrong structures
 *      (`beat.misses`, derived by the script), the tray says what it is: "That
 *      is the 1,2 product" plus why it is not this one. Otherwise it gives a
 *      hint worked out from the two InChIs (grade.ts hintFor: a charge, an
 *      atom count, a ring or pi bond off). The answer is NOT shown, and
 *      neither is lookAt, which spells the answer out (round 3).
 *   2. TRY AGAIN closes the tray and leaves their drawing on the board to fix.
 *      SHOW ME skips to step 3.
 *   3. A second miss, or SHOW ME, shows their drawing next to the answer, both
 *      drawn by the same renderer at the same bond length, so the only
 *      difference between the cards is the chemistry. lookAt explains it.
 *
 * CHECK on the very drawing that just missed does not spend the second try:
 * the screen asks for a change first (round 2 critic: TRY AGAIN then CHECK
 * with no edit went straight to the reveal).
 *
 * Only the first try counts for the score. A first-try miss in a lesson comes
 * back in the recycle pass (PoolItemsStep.tsx reports it, template.ts queues
 * it); an in-a-row run requeues it on its own.
 *
 * An empty canvas is never a miss: CHECK says "draw something first".
 *
 * The editor is React.lazy (DrawEditor.tsx), so Ketcher downloads only when
 * this screen mounts. Its box has a fixed height, so nothing jumps when it
 * finishes loading.
 */
import { Suspense, lazy, useEffect, useRef, useState } from "react";

import type { BeatResult, MasteryLevel } from "../types";
import { AnswerTray, TrayWhy } from "../AnswerTray";
import { ChipPress } from "../ChipPress";
import { McqVisualCard } from "../mcq/McqVisualCard";
import { ProductBlank } from "../../lesson/SchemeCard";
import type { McqVisual } from "../mcq/mcqFigures";
import { StructureFigure } from "../../onboarding/StructureFigure";
import { gradeDrawing, hintFor, namedMiss, relativeStereo, withoutStereo } from "./grade";
import type { DrawBeat, DrawMiss } from "./types";
import type { DrawReader } from "./DrawEditor";
import { playCorrect } from "../../sound/gameSound";
import "./draw.css";

const DrawEditor = lazy(() => import("./DrawEditor"));

/**
 * loading: the editor is still arriving. ready: drawing. checking: reading the canvas.
 * retry: first miss, tray offers TRY AGAIN. right: solved. reveal: their drawing beside the answer.
 */
type Phase = "loading" | "ready" | "checking" | "retry" | "right" | "reveal";

export interface DrawBeatViewProps {
  readonly beat: DrawBeat;
  readonly level: MasteryLevel;
  /** Called once, on the first CHECK of a real drawing. */
  readonly onResult: (result: BeatResult) => void;
  readonly onContinue?: () => void;
}

/** The starting materials. Two reactants get a + between them and an arrow to the "What forms?" blank. */
function Reactants({ visual }: { readonly visual: McqVisual }) {
  if (visual.kind !== "pair") return <McqVisualCard visual={visual} />;
  return (
    <div className="scheme draw-beat__pair" aria-hidden>
      <div className="scheme__species">
        <StructureFigure figure={visual.a.figure} className="scheme__figure" />
        {visual.a.name === undefined ? null : <span className="scheme__caption">{visual.a.name}</span>}
      </div>
      <span className="draw-beat__plus">+</span>
      <div className="scheme__species">
        <StructureFigure figure={visual.b.figure} className="scheme__figure" />
        {visual.b.name === undefined ? null : <span className="scheme__caption">{visual.b.name}</span>}
      </div>
      {/* The lesson scheme's drawn arrow and its "What forms?" blank
          (SchemeCard.tsx), so this blank looks like every other one. No
          reagent is written over this arrow: the two reactants are the whole
          question. */}
      <div className="scheme__arrow">
        <span className="scheme__shaft" />
      </div>
      <ProductBlank />
    </div>
  );
}

export function DrawBeatView({ beat, level, onResult, onContinue }: DrawBeatViewProps) {
  const reader = useRef<DrawReader | null>(null);
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("loading");
  const [empty, setEmpty] = useState(false);
  // True when the board holds a drawing the editor could not read (CHECK again usually works).
  const [unreadable, setUnreadable] = useState(false);
  // True while the board still holds the exact drawing that last missed.
  const [unchanged, setUnchanged] = useState(false);
  // The graded form (grade.ts) of the drawing that last missed, to spot a re-check with no edit.
  const lastMiss = useRef<string | null>(null);
  // The hint for an unnamed miss, from comparing the two InChIs.
  const [hint, setHint] = useState("");
  const [tries, setTries] = useState(0);
  // The named wrong structure the last drawing matched, if any.
  const [miss, setMiss] = useState<DrawMiss | null>(null);
  // The student's own drawing as an image, for the side-by-side reveal.
  const [mine, setMine] = useState<string | null>(null);
  // The answer drawn by the same renderer as `mine`; null falls back to the app's figure.
  const [theirs, setTheirs] = useState<string | null>(null);

  // The board's box, so a first miss can bring the student's drawing into view.
  const canvas = useRef<HTMLDivElement | null>(null);

  // useEffect runs after React has drawn the tray. On a phone the tray covered
  // the drawing it was talking about (round 2 judges), so a first miss scrolls
  // until the board's bottom edge sits just above the tray. draw.css gives the
  // section room below for that scroll.
  useEffect(() => {
    if (phase !== "retry" || canvas.current === null) return;
    const tray = document.querySelector<HTMLElement>(".answer-tray");
    canvas.current.style.scrollMarginBottom = `${tray?.offsetHeight ?? 0}px`;
    canvas.current.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [phase]);

  /**
   * Show their drawing beside the answer. `matched` is the named miss the
   * drawing was, passed in rather than read from state because a fresh
   * setMiss is not visible inside the same check() call. A named miss is
   * redrawn from its canonical SMILES, like the answer, so the two cards lay
   * out the same way round; any other drawing is pictured as drawn.
   */
  const reveal = async (matched: DrawMiss | null) => {
    if (reader.current !== null) {
      setMine(
        matched?.smiles === undefined
          ? await reader.current.picture()
          : await reader.current.pictureOf(matched.smiles),
      );
      setTheirs(await reader.current.pictureOf(beat.answer.smiles));
    }
    setPhase("reveal");
  };

  const check = async () => {
    if (reader.current === null) return;
    setPhase("checking");
    const drawn = await reader.current.inchi();
    if (drawn === null) {
      // Not a try and not "empty": the board could not be read this time.
      setUnreadable(true);
      setPhase("ready");
      return;
    }
    setUnreadable(false);
    const verdict = gradeDrawing(drawn, beat.answer.inchi, beat.stereo);
    if (verdict === "empty") {
      setEmpty(true);
      setPhase("ready");
      return;
    }
    setEmpty(false);
    const graded = beat.stereo ? relativeStereo(drawn) : withoutStereo(drawn);
    if (verdict === "wrong" && graded === lastMiss.current) {
      // Same drawing as the miss: not a new try. Ask for a change first.
      setUnchanged(true);
      setPhase("ready");
      return;
    }
    setUnchanged(false);
    lastMiss.current = verdict === "wrong" ? graded : null;
    const named = verdict === "wrong" ? namedMiss(drawn, beat.misses, beat.stereo) : null;
    setMiss(named);
    setHint(named === null && verdict === "wrong" ? hintFor(drawn, beat.answer.inchi) : "");
    const attempt = tries + 1;
    setTries(attempt);
    if (attempt === 1) {
      const base = {
        beatId: beat.id,
        level,
        elapsedMs: Date.now() - startedAt.current,
        at: new Date().toISOString(),
      } as const;
      onResult(
        verdict === "right"
          ? { ...base, kind: "correct", cause: "matches_requested_route" }
          : named !== null
            ? { ...base, kind: "valid_not_requested", cause: "chose_authored_distractor", distractorId: named.id, built: named.name }
            : { ...base, kind: "valid_not_requested", cause: "no_named_cause_logged", built: "a different structure" },
      );
    }
    if (verdict === "right") {
      playCorrect();
      setPhase("right");
    } else if (attempt === 1) setPhase("retry");
    else await reveal(named);
  };

  const missTitle = miss === null ? "Not this one yet" : `That is ${miss.name}`;

  return (
    <section className="draw-beat" data-draw={beat.id} data-draw-phase={phase}>
      <h1 className="draw-beat__prompt">{beat.prompt}</h1>
      {beat.brief === undefined ? null : <p className="draw-beat__brief">{beat.brief}</p>}
      <Reactants visual={beat.visual} />
      <p className="draw-beat__how">
        Pick a key, then tap the board. Tap an atom to grow a bond from it, or tap a bond to make it the kind you picked.
        {beat.stereo ? " For a wedge or dash, pick it, then tap the ring carbon the group hangs from." : ""}
      </p>
      <div className="draw-beat__canvas" aria-label="Structure editor" ref={canvas}>
        <Suspense fallback={<p className="draw-beat__wait" role="status">Loading the drawing board</p>}>
          <DrawEditor
            stereo={beat.stereo}
            onReady={(next) => {
              reader.current = next;
              setPhase((now) => (now === "loading" ? "ready" : now));
            }}
          />
        </Suspense>
      </div>

      {phase === "right" ? (
        <AnswerTray
          tone="right"
          title={tries === 1 ? "Nice!" : "Fixed it"}
          actionLabel="Continue"
          onAction={onContinue}
          actionDisabled={onContinue === undefined}
        >
          <TrayWhy lead={beat.why} />
        </AnswerTray>
      ) : null}

      {phase === "retry" ? (
        <AnswerTray
          tone="wrong"
          title={missTitle}
          actionLabel="Try again"
          onAction={() => setPhase("ready")}
          secondary={
            <button type="button" className="draw-beat__showme press" onClick={() => void reveal(miss)}>
              Show me
            </button>
          }
        >
          {miss === null ? <p className="draw-beat__look">{hint}</p> : <p>{miss.says}</p>}
        </AnswerTray>
      ) : null}

      {phase === "reveal" ? (
        <AnswerTray
          tone="wrong"
          title={tries >= 2 && miss !== null ? missTitle : "Compare the two"}
          actionLabel="Continue"
          onAction={onContinue}
          actionDisabled={onContinue === undefined}
        >
          <div className="draw-beat__compare">
            <figure className="draw-beat__card">
              {mine === null ? (
                <span className="draw-beat__card-empty">Your drawing</span>
              ) : (
                <img src={mine} alt="Your drawing" className="draw-beat__mine" />
              )}
              <figcaption>Yours</figcaption>
            </figure>
            <figure className="draw-beat__card draw-beat__card--answer">
              {theirs === null ? (
                <StructureFigure figure={beat.answer.figure} className="draw-beat__answer-figure" />
              ) : (
                <img src={theirs} alt={beat.answer.name} className="draw-beat__mine" />
              )}
              <figcaption>{beat.answer.name}</figcaption>
            </figure>
          </div>
          {miss === null ? null : <p>{miss.says}</p>}
          <p className="draw-beat__look">{beat.lookAt}</p>
          <TrayWhy lead={beat.why} />
        </AnswerTray>
      ) : null}

      {phase === "loading" || phase === "ready" || phase === "checking" ? (
        <div className="draw-beat__actions foot-bleed">
          {empty ? (
            <p className="draw-beat__empty" role="status">
              Draw something first. The board is empty.
            </p>
          ) : null}
          {unreadable ? (
            <p className="draw-beat__empty" role="status">
              Could not read that drawing. Check again, or redraw any loose bond.
            </p>
          ) : null}
          {unchanged ? (
            <p className="draw-beat__empty" role="status">
              That is the same drawing as before. Change something, then check.
            </p>
          ) : null}
          {tries === 1 && !unchanged ? (
            <p className="draw-beat__empty" role="status">
              Second try. Fix your drawing, then check again.
            </p>
          ) : null}
          <ChipPress onClick={() => void check()} disabled={phase !== "ready"}>
            {phase === "loading" ? "Loading" : phase === "checking" ? "Checking" : "Check"}
          </ChipPress>
        </div>
      ) : null}
    </section>
  );
}
