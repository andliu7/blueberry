/**
 * The trainer screen's workbench, at #/gallery/pilot-trainer. Dev only, lazy,
 * linked from nothing in the shell, exactly like the other galleries.
 *
 * The switcher between the judged questions lives HERE, in the wrapper, not
 * in the screen: the screen takes one question and an exit, and knowing
 * there are several to compare is the workbench's business. The two entries
 * are the brief's own, the allyl cation hunt (arrows on) and the SN2 at
 * bromomethane (no arrow glyphs, the electron gesture). A sequence, so the
 * multi-step advance can be driven by hand, is reached by `?sequence=<id>`
 * in the query, the old trainer's own address for one; it replaces the pair
 * so the switcher never grows over the frozen reference footprint.
 */

import { useState } from "react";
import { useReducedMotion } from "../../../app/hooks";
import { findQuestion, type QuestionRef } from "./question";
import { TrainerScreen } from "./TrainerScreen";

const SEQUENCE_ID = new URLSearchParams(window.location.search).get("sequence");
const REFS: readonly { readonly label: string; readonly ref: QuestionRef }[] =
  SEQUENCE_ID === null
    ? [
        { label: "Resonance", ref: { kind: "resonance", id: "res-allyl-1" } },
        { label: "Reaction", ref: { kind: "reaction", id: "sn2" } },
      ]
    : [{ label: "Sequence", ref: { kind: "sequence", id: SEQUENCE_ID } }];
const QUESTIONS = REFS.map((entry) => findQuestion(entry.ref));

export default function TrainerGallery() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(false);
  const question = QUESTIONS[index];
  if (question === undefined) throw new Error(`no workbench question ${index}`);
  if (question === null) {
    return <p className="p-6 text-scale-sm text-bb-muted-foreground">No question is authored with the id "{REFS[index]?.ref.id}".</p>;
  }

  if (left) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6" style={{ background: "var(--bb-background)" }}>
        <p className="text-scale-lg font-semibold text-bb-foreground">You left the stage.</p>
        <p className="max-w-sm text-center text-scale-sm text-bb-muted-foreground">
          In the product this hand-off belongs to the lesson: the full-bleed celebration and the next node. The workbench only proves the exit fires.
        </p>
        <button
          type="button"
          className="press min-h-11 rounded-full border-2 border-bb-border bg-bb-card px-5 text-scale-sm font-semibold text-bb-foreground"
          onClick={() => setLeft(false)}
        >
          Back into the stage
        </button>
      </div>
    );
  }

  return (
    <>
      <TrainerScreen key={index} question={question} onExit={() => setLeft(true)} reducedMotion={reducedMotion} />
      {/* The workbench's own control, floated over the screen's header air. */}
      <div className="fixed right-3 top-3 z-50 flex gap-1 rounded-full border-2 border-bb-border bg-bb-card p-1" role="tablist" aria-label="Workbench question">
        {REFS.map((entry, candidate) => (
          <button
            key={entry.label}
            type="button"
            role="tab"
            aria-selected={index === candidate}
            className="press min-h-9 rounded-full px-3 text-scale-xs font-semibold"
            style={
              index === candidate
                ? { background: "var(--bb-primary)", color: "var(--bb-primary-foreground)" }
                : { color: "var(--bb-muted-foreground)" }
            }
            onClick={() => setIndex(candidate)}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </>
  );
}
