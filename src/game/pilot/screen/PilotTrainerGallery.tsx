/**
 * The pilot screen's workbench, at #/gallery/pilot-trainer. Dev only, lazy,
 * linked from nothing in the shell, exactly like the other galleries.
 *
 * The switcher between the two judged modes lives HERE, in the wrapper, not
 * in the screen: the screen takes one problem and an exit, and knowing there
 * are two problems to compare is the workbench's business. The two entries
 * are the brief's own: the allyl cation hunt (arrows on) and the SN2 at
 * bromomethane (no arrow glyphs, the electron gesture).
 */

import { useMemo, useState } from "react";
import { useReducedMotion } from "../../app/hooks";
import { RESONANCE_HUNT } from "../../demo/resonance";
import { TRAINER_REACTIONS } from "../../demo/reactions";
import { PilotScreen, type PilotProblem } from "./PilotScreen";

type GalleryMode = "resonance" | "reaction";

function buildProblems(): Record<GalleryMode, PilotProblem> {
  const hunt = RESONANCE_HUNT[0];
  if (hunt === undefined) throw new Error("no resonance entries authored");
  const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2") ?? TRAINER_REACTIONS[0];
  if (sn2 === undefined) throw new Error("no reactions authored");
  return {
    resonance: {
      step: hunt.step,
      fromHints: hunt.fromHints,
      toHints: hunt.toHints,
      mode: "resonance",
      title: hunt.title,
      prompt: "Find the allyl cation's other resonance structure.",
      hint: "Grab the π bond by a handle and send it toward the empty carbon.",
      successLine: hunt.foundLine,
    },
    reaction: {
      step: sn2.step,
      fromHints: sn2.fromHints,
      toHints: sn2.toHints,
      mode: "reaction",
      title: sn2.title,
      prompt: "Push the electrons for this Sₙ2 in one step.",
      hint: "Tap the oxygen to open its lone pairs, and remember the bromide has to let go.",
      successLine: sn2.successLine,
    },
  };
}

export default function PilotTrainerGallery() {
  const reducedMotion = useReducedMotion();
  const problems = useMemo(buildProblems, []);
  const [mode, setMode] = useState<GalleryMode>("resonance");
  const [left, setLeft] = useState(false);

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
      <PilotScreen key={mode} problem={problems[mode]} onExit={() => setLeft(true)} reducedMotion={reducedMotion} />
      {/* The workbench's own control, floated over the screen's header air. */}
      <div className="fixed right-3 top-3 z-50 flex gap-1 rounded-full border-2 border-bb-border bg-bb-card p-1" role="tablist" aria-label="Pilot mode">
        {(["resonance", "reaction"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={mode === candidate}
            className="press min-h-9 rounded-full px-3 text-scale-xs font-semibold"
            style={
              mode === candidate
                ? { background: "var(--bb-primary)", color: "var(--bb-primary-foreground)" }
                : { color: "var(--bb-muted-foreground)" }
            }
            onClick={() => setMode(candidate)}
          >
            {candidate === "resonance" ? "Resonance" : "Reaction"}
          </button>
        ))}
      </div>
    </>
  );
}
