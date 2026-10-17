/**
 * The "Draw it" screen: the prompt, the reactants as a drawn scheme, a blank
 * structure editor, and CHECK. The verdict docks in the shared answer tray
 * (AnswerTray.tsx), green or red, the same tray every lesson question uses.
 *
 * ONE TRY, like the MCQ: the first CHECK on a real drawing is the answer. A
 * miss shows the right structure drawn in the tray, so the student compares
 * their drawing with it, and the run's recycle or requeue brings the item back
 * later rather than letting them redraw with the answer on screen.
 *
 * An empty canvas is never a miss: CHECK says "draw something first".
 *
 * The editor is React.lazy (DrawEditor.tsx), so Ketcher downloads only when
 * this screen mounts. Its box has a fixed height, so nothing jumps when it
 * finishes loading.
 */
import { Suspense, lazy, useRef, useState } from "react";

import type { BeatResult, MasteryLevel } from "../types";
import { AnswerTray, TrayWhy } from "../AnswerTray";
import { ChipPress } from "../ChipPress";
import { McqVisualCard } from "../mcq/McqVisualCard";
import { StructureFigure } from "../../onboarding/StructureFigure";
import { gradeDrawing } from "./grade";
import type { DrawBeat } from "./types";
import type { DrawReader } from "./DrawEditor";
import "./draw.css";

const DrawEditor = lazy(() => import("./DrawEditor"));

type Phase = "loading" | "ready" | "checking" | "right" | "wrong";

export interface DrawBeatViewProps {
  readonly beat: DrawBeat;
  readonly level: MasteryLevel;
  /** Called once, on the first CHECK of a real drawing. */
  readonly onResult: (result: BeatResult) => void;
  readonly onContinue?: () => void;
}

export function DrawBeatView({ beat, level, onResult, onContinue }: DrawBeatViewProps) {
  const reader = useRef<DrawReader | null>(null);
  const startedAt = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("loading");
  const [empty, setEmpty] = useState(false);

  const check = async () => {
    if (reader.current === null) return;
    setPhase("checking");
    const verdict = gradeDrawing(await reader.current.inchi(), beat.answer.inchi, beat.stereo);
    if (verdict === "empty") {
      setEmpty(true);
      setPhase("ready");
      return;
    }
    const base = {
      beatId: beat.id,
      level,
      elapsedMs: Date.now() - startedAt.current,
      at: new Date().toISOString(),
    } as const;
    onResult(
      verdict === "right"
        ? { ...base, kind: "correct", cause: "matches_requested_route" }
        : { ...base, kind: "valid_not_requested", cause: "no_named_cause_logged", built: "a different structure" },
    );
    setPhase(verdict);
  };

  const judged = phase === "right" || phase === "wrong";

  return (
    <section className="draw-beat" data-draw={beat.id}>
      <h1 className="draw-beat__prompt">{beat.prompt}</h1>
      {beat.brief === undefined ? null : <p className="draw-beat__brief">{beat.brief}</p>}
      <McqVisualCard visual={beat.visual} />
      <div className="draw-beat__canvas" aria-label="Structure editor">
        <Suspense fallback={<p className="draw-beat__wait" role="status">Loading the drawing board</p>}>
          <DrawEditor
            onReady={(next) => {
              reader.current = next;
              setPhase((now) => (now === "loading" ? "ready" : now));
            }}
          />
        </Suspense>
      </div>
      <p className="draw-beat__how">Draw it on the board, then press Check. Skeletal is fine; no wedges needed.</p>

      {judged ? (
        <AnswerTray
          tone={phase === "right" ? "right" : "wrong"}
          title={phase === "right" ? "Nice!" : "Not quite"}
          actionLabel="Continue"
          onAction={onContinue}
          actionDisabled={onContinue === undefined}
        >
          {phase === "right" ? (
            <TrayWhy lead={beat.why} />
          ) : (
            <>
              <p className="answer-tray__answer">Here is the structure:</p>
              <div className="draw-beat__answer">
                <StructureFigure figure={beat.answer.figure} className="draw-beat__answer-figure" />
                <span className="draw-beat__answer-name">{beat.answer.name}</span>
              </div>
              <TrayWhy lead={beat.lookAt} more={[beat.why]} />
            </>
          )}
        </AnswerTray>
      ) : (
        <div className="draw-beat__actions foot-bleed">
          {empty ? (
            <p className="draw-beat__empty" role="status">
              Draw something first. The board is empty.
            </p>
          ) : null}
          <ChipPress onClick={() => void check()} disabled={phase !== "ready"}>
            {phase === "loading" ? "Loading" : phase === "checking" ? "Checking" : "Check"}
          </ChipPress>
        </div>
      )}
    </section>
  );
}
