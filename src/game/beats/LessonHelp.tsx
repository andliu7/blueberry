/**
 * The NEED-HELP path for a Unit 1 lesson: a quiet fold that opens a short
 * walk-through, the earlier lessons this one builds on, the Unit 0 refreshers
 * and the guide. Rows come from content/u1/lessonPath.ts (helpPathFor); it
 * renders nothing for a node with no entry there, so other units are
 * untouched. Calm and optional: closed by default, no score, no cost.
 * Loaded lazily by its two callers so the walk-through prose stays out of
 * the entry chunk.
 */
import { pathwayNode } from "../demo/pathwayMap";
import { guideParam } from "../guide/guideLink";
import { hrefForLesson, hrefForTab } from "../app/routes";
import { Suspense, lazy, useEffect, useState } from "react";
import { McqVisualCard } from "./mcq/McqVisualCard";
import { readAlongVisual } from "./readAlongDrawing";
import { EnergyFigure } from "../energy/EnergyFigure";
import { scenarioById } from "../energy/energyModel";
import type { Explainer } from "../content/u1/lessonExplainers";
import { helpPathFor } from "../content/u1/lessonPath";

const EnergyLab = lazy(() => import("../energy/EnergyLab"));
// The turnable 3-D models (Unit 1 review suggestion 9), loaded only on a card that has one.
const ModelSet = lazy(() => import("./ModelSet"));

/**
 * The narrated drawing: one card at a time, each beside the structure it is
 * about, with Listen to hear the card read aloud and Play to hear them all in
 * turn. Speech is the browser's own, started only by a press, never on load.
 * It is not a filmed video, and the heading says so.
 */
function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  const speak = (text: string, onEnd: () => void): (() => void) => {
    if (!supported) return () => undefined;
    let live = true;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => {
      if (live) onEnd();
    };
    u.onerror = () => {
      live = false;
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return () => {
      live = false;
      window.speechSynthesis.cancel();
    };
  };
  return { supported, speak };
}

export function ReadAlong({ explainer }: { readonly explainer: Explainer }) {
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState<"off" | "one" | "all">("off");
  const { supported, speak } = useSpeech();
  const card = explainer.cards[at]!;
  const last = at === explainer.cards.length - 1;
  const visual = readAlongVisual(card.draw);
  const scenario = card.energy === undefined ? undefined : scenarioById(card.energy);

  // Speak the current card while a mode is on; Play moves on when a card ends.
  useEffect(() => {
    if (mode === "off") return undefined;
    return speak(`${card.heading}. ${card.body}`, () => {
      if (mode === "all" && !last) setAt((n) => n + 1);
      else setMode("off");
    });
    // speak is stable in effect; the card and mode are what restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, at]);

  const go = (n: number) => {
    setMode("off");
    setAt(n);
  };
  return (
    <section aria-label={explainer.worked === true ? "Worked example" : "Narrated drawing"} className="rounded-xl border-2 border-bb-border bg-bb-background p-3">
      <h4 className="font-semibold">
        {explainer.worked === true ? (
          <>
            Worked example, step by step <span className="font-normal text-bb-muted-foreground">(about {explainer.minutes} min)</span>
          </>
        ) : (
          <>
            Show me it drawn <span className="font-normal text-bb-muted-foreground">(narrated drawing, about {explainer.minutes} min, not a filmed video)</span>
          </>
        )}
      </h4>
      {visual === null ? null : (
        <div className="mt-2 flex justify-center rounded-xl border border-bb-border bg-bb-card p-2">
          <McqVisualCard visual={visual} />
        </div>
      )}
      {scenario === undefined ? null : (
        <div className="mt-2 flex justify-center rounded-xl border border-bb-border bg-bb-card p-2">
          <EnergyFigure profiles={scenario.profiles} label={scenario.title} range={[-24, 22]} />
        </div>
      )}
      <div aria-live="polite" className="mt-2">
        <p className="text-scale-xs text-bb-muted-foreground">Card {at + 1} of {explainer.cards.length}</p>
        <p className="mt-1 font-semibold">{card.heading}</p>
        <p className="mt-1">{card.body}</p>
      </div>
      {card.lab !== undefined ? (
        <div className="mt-3">
          <Suspense fallback={null}>
            <EnergyLab start={card.lab === "temp" ? "temp" : "work"} />
          </Suspense>
        </div>
      ) : null}
      {card.model !== undefined ? (
        <div className="mt-3 rounded-xl border border-bb-border bg-bb-card p-2">
          <Suspense fallback={null}>
            <ModelSet set={card.model} />
          </Suspense>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={at === 0} onClick={() => go(at - 1)} className="rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 font-semibold disabled:opacity-40">
          Back
        </button>
        <button type="button" disabled={last} onClick={() => go(at + 1)} className="rounded-xl border-2 border-bb-primary bg-bb-primary px-3 py-1.5 font-semibold text-bb-primary-foreground disabled:opacity-40">
          Next
        </button>
        {supported ? (
          <>
            <button type="button" onClick={() => setMode(mode === "one" ? "off" : "one")} aria-pressed={mode === "one"} className="rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 font-semibold">
              {mode === "one" ? "Stop" : "Listen"}
            </button>
            <button type="button" onClick={() => setMode(mode === "all" ? "off" : "all")} aria-pressed={mode === "all"} className="rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 font-semibold">
              {mode === "all" ? "Stop playing" : at === 0 ? "Play all" : "Play from here"}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The narrated drawing shown on its own, open on the lesson preview for a
 * video lesson, so the teaching is in front of the student and not behind a
 * "need help" fold. Renders nothing for a lesson with no explainer.
 */
export function DrawnLesson({ node }: { readonly node: string }) {
  const row = helpPathFor(node).find((r) => r.kind === "explainer");
  if (row === undefined || row.kind !== "explainer") return null;
  return <ReadAlong explainer={row.explainer} />;
}

export default function LessonHelp({
  node,
  stage = null,
  openNow = false,
  skipExplainer = false,
}: {
  readonly node: string;
  readonly stage?: string | null;
  readonly openNow?: boolean;
  /** True when the narrated drawing is already on screen above this fold. */
  readonly skipExplainer?: boolean;
}) {
  const unit = node.split("-")[0] ?? "u1";
  const rows = helpPathFor(node).filter((r) => !(skipExplainer && r.kind === "explainer"));
  if (rows.length === 0) return null;
  return (
    <details open={openNow} className="lesson-help w-full rounded-2xl border-2 border-bb-border bg-bb-card p-3 text-left text-scale-sm text-bb-foreground">
      <summary className="cursor-pointer font-semibold text-bb-primary-ink">Need help with this lesson?</summary>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row, i) => {
          if (row.kind === "explainer") return <ReadAlong key={i} explainer={row.explainer} />;
          if (row.kind === "walkthrough") {
            return (
              <section key={i} aria-label="Walk through it step by step">
                <h4 className="font-semibold">Walk through it, one step at a time</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  {row.steps.map((step) => (
                    <li key={step.title}>
                      <strong>{step.title}.</strong> {step.text}
                    </li>
                  ))}
                </ol>
              </section>
            );
          }
          if (row.kind === "replay") {
            return (
              <p key={i}>
                Not following? This builds on <strong>{row.label}</strong>.{" "}
                <a className="font-semibold text-bb-primary-ink underline" href={hrefForLesson(row.node)}>
                  Replay {pathwayNode(row.node)?.title ?? "that lesson"}
                </a>
              </p>
            );
          }
          if (row.kind === "unit0") {
            return (
              <p key={i}>
                Also assumed from Unit 0: <strong>{row.label}</strong>.{row.primer !== undefined ? ` ${row.primer}` : ""}{" "}
                <a className="font-semibold text-bb-primary-ink underline" href={`${hrefForTab("pathway")}?unit=u0`}>
                  Open Unit 0
                </a>
              </p>
            );
          }
          return (
            <p key={i}>
              <a className="font-semibold text-bb-primary-ink underline" href={`${hrefForTab("pathway")}?unit=${unit}&guide=${guideParam({ unit, stage })}`}>
                Read the unit guide
              </a>
            </p>
          );
        })}
      </div>
    </details>
  );
}
