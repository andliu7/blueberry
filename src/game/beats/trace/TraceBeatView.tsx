/**
 * The structure trace beat, as a student plays it.
 *
 * WHAT THIS FILE DECIDES, and it is a short list because everything hard lives
 * somewhere else: which canvas the mastery level calls for, what sentence to
 * say about an outcome, and when to offer a card. The corridor is geometry.ts,
 * the recognition is recognise.ts, the grading is packages/curriculum, and the
 * molecules are content.ts.
 *
 * THE LADDER, and it is `traceGuideStyle` in beats/types.ts made visible:
 *
 *   L0  guides on, and a press draws the stroke. `canFail(0)` is false and that
 *       is a contract: a first meeting that can be got wrong is a test
 *   L1  guides on, trace them. The corridor is generous and drawn
 *   L2  endpoints only. The corridor is still there and is no longer shown, so
 *       the hand has to know the line rather than read it
 *   L3  blank canvas, freehand, recognised and graded against the real answer
 *
 * WHY A MISS AT L1 OR L2 DOES NOT END THE BEAT. Leaving the corridor is not a
 * wrong answer, it is a hand that slipped, and stopping a trace to mark it
 * would teach a student to be careful rather than to be right. The miss is
 * NAMED out loud when it happens ("come back to the line" reads differently
 * from "keep going") and it is counted, so the result the runner records is
 * honest about how it went. At L3, where the student produced rather than
 * traced, a wrong structure IS a wrong answer and is graded as one.
 *
 * THE CARD OFFER, per the Anki borrow in CLAUDE.md: a mistake OFFERS a card, it
 * never saves one. This component builds the card and hands it up through
 * `onOfferCard`; the deck store, the toast that shrinks it and the deck icon
 * that bounces belong to the cards surface, which another piece owns. What is
 * here is the offer and the `why` copy that makes the card worth keeping.
 *
 * VOICE. Every string a student reads in this file was written against
 * CLAUDE.md's rule: name what happened plainly, treat the mistake as the normal
 * step it is, make the next action feel reachable. No "you should have", no
 * rhetorical questions, and the praise is specific to what they actually did.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { Card, Reco } from "../../cards/types";
import { canFail, traceGuideStyle, type BeatResult, type MasteryLevel, type TraceBeat } from "../types";
import type { StrokeOutcome } from "./geometry";
import { FreehandCanvas } from "./FreehandCanvas";
import { GuidedCanvas } from "./GuidedCanvas";
import { ChipPress } from "../ChipPress";
import { traceTarget } from "./content";
import { gradeDrawing, toBeatResult, type Recognition, type TraceOutcome } from "./recognise";
import { formulaOf, type Graph } from "./target";

export interface TraceBeatViewProps {
  readonly beat: TraceBeat;
  readonly level: MasteryLevel;
  /** Fired once, when the beat resolves. The runner records it. */
  readonly onResult: (result: BeatResult) => void;
  /** A card the student may keep. Offered, never saved: the deck surface owns that. */
  readonly onOfferCard?: (card: Card, reco: Reco) => void;
  /** Move on. The lesson runner supplies it; absent means this is the last beat. */
  readonly onContinue?: () => void;
}

/**
 * What to say about a stroke that did not finish.
 *
 * Two sentences, because two different things happened. Collapsing them would
 * lose the feedback axis CLAUDE.md says the product is won on.
 */
function strokeLine(outcome: Exclude<StrokeOutcome, "complete">, label: string): string {
  return outcome === "left_target"
    ? `That one drifted off ${label}. Come back to the line and it will pick you up again.`
    : `Nearly. Keep going to the end of ${label}.`;
}

/** What to say about a finished L3 drawing. Specific to the cause, always. */
function outcomeLine(outcome: TraceOutcome, targetName: string): string {
  if (outcome.kind === "correct") return `That is ${targetName}, drawn from nothing. Well held.`;
  switch (outcome.cause) {
    case "trace_incomplete":
      return "Nothing on the canvas yet. Draw one bond and the rest follows.";
    case "valence_exceeded":
      return `${outcome.detail}. Count the bonds at that atom and take one back off.`;
    case "structure_molecular_formula_differs":
      return "The atoms do not add up yet. Check the formula against what you have drawn.";
    case "structure_is_an_isomer_of_the_answer":
      return "Right atoms, joined up differently. The pieces are all there, so this is a connectivity call, not a counting one.";
    case "structure_charge_differs":
      return "The skeleton is right and the charge is not. Look at which atom is carrying it.";
    case "structure_species_count_differs":
      return "There is more than one piece on the canvas. Join them up, or take the spare one off.";
    default:
      return `Not quite yet: ${outcome.detail}.`;
  }
}

export function TraceBeatView({ beat, level, onResult, onOfferCard, onContinue }: TraceBeatViewProps) {
  const target = traceTarget(beat.moleculeId);
  const guide = traceGuideStyle(level);
  const startedAt = useRef(Date.now());
  const resolved = useRef(false);

  const [note, setNote] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [outcome, setOutcome] = useState<TraceOutcome | null>(null);
  const drawnRef = useRef<Graph>({ vertices: [], edges: [] });
  const [drawnCount, setDrawnCount] = useState(0);

  const formula = useMemo(
    () => (target === undefined ? "" : formulaOf({ vertices: target.vertices, edges: target.edges })),
    [target],
  );

  const offerCard = useCallback(
    (result: BeatResult, why: string) => {
      if (onOfferCard === undefined || target === undefined) return;
      const at = new Date().toISOString();
      const card: Card = {
        id: `card-${beat.id}-${result.cause}`,
        front: `${beat.prompt} (${formula})`,
        back: target.name,
        why,
        tags: ["structure", "trace", ...beat.conceptIds],
        source: { kind: "mistake", beatId: beat.id, cause: result.cause, at },
      };
      const reco: Reco = {
        cardId: card.id,
        reason: "This one is worth seeing again in a few days.",
        seenAt: at,
      };
      onOfferCard(card, reco);
    },
    [beat.conceptIds, beat.id, beat.prompt, formula, onOfferCard, target],
  );

  const resolve = useCallback(
    (next: TraceOutcome) => {
      if (resolved.current && next.kind !== "correct") return;
      const result = toBeatResult(next, {
        beatId: beat.id,
        level,
        elapsedMs: Date.now() - startedAt.current,
        at: new Date().toISOString(),
      });
      setOutcome(next);
      if (next.kind === "correct") {
        resolved.current = true;
        onResult(result);
      } else if (target !== undefined) {
        offerCard(result, outcomeLine(next, target.name));
      }
    },
    [beat.id, level, offerCard, onResult, target],
  );

  const onStrokeMiss = useCallback(
    (strokeId: string, missOutcome: Exclude<StrokeOutcome, "complete">) => {
      const label = beat.strokes.find((stroke) => stroke.id === strokeId)?.label ?? "that stroke";
      setMisses((count) => count + 1);
      setNote(strokeLine(missOutcome, label));
    },
    [beat.strokes],
  );

  const onGuidedComplete = useCallback(() => {
    if (resolved.current || target === undefined) return;
    setNote(null);
    resolve({
      kind: "correct",
      cause: "matches_requested_route",
      detail: canFail(level)
        ? `every stroke of ${target.name}, on the line`
        : `${target.name}, met`,
    });
  }, [level, resolve, target]);

  const onGraphChange = useCallback((graph: Graph, _recognition: Recognition) => {
    drawnRef.current = graph;
    setDrawnCount(graph.edges.length);
  }, []);

  if (target === undefined) {
    // Reported rather than rendered blank, per CLAUDE.md: a missing molecule is
    // an authoring bug and `traceContentProblems()` names it at build time.
    return (
      <p style={{ color: "var(--bb-muted-foreground)" }}>
        This beat names the molecule {beat.moleculeId}, which is not in the trace registry yet.
      </p>
    );
  }

  const freehand = guide === "none";
  const cleared = outcome !== null && outcome.kind === "correct";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4, 16px)" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "var(--space-1, 4px)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--text-scale-xl, 1.35rem)", color: "var(--bb-foreground)" }}>
          {beat.prompt}
        </h2>
        {beat.brief !== undefined && (
          <p style={{ margin: 0, color: "var(--bb-muted-foreground)", lineHeight: "var(--leading-normal, 1.5)" }}>
            {beat.brief}
          </p>
        )}
        {freehand && (
          <p style={{ margin: 0, color: "var(--bb-muted-foreground)", fontFamily: "var(--font-mono, monospace)" }}>
            {formula}
          </p>
        )}
      </header>

      {freehand ? (
        <FreehandCanvas target={target} onGraphChange={onGraphChange} />
      ) : (
        <GuidedCanvas
          // Remount on a level change so a fresh ladder rung starts a fresh
          // canvas rather than inheriting the last one's finished strokes.
          key={`${beat.id}-${level}`}
          target={target}
          guide={guide}
          tolerancePx={beat.tolerancePx ?? 22}
          cannotFail={!canFail(level)}
          onStrokeMiss={onStrokeMiss}
          onComplete={onGuidedComplete}
        />
      )}

      {note !== null && !cleared && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "var(--space-3, 12px)",
            borderRadius: "var(--radius-card, 14px)",
            background: "var(--warn-soft, var(--bb-muted))",
            color: "var(--warn-ink, var(--bb-foreground))",
          }}
        >
          {note}
        </p>
      )}

      {outcome !== null && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "var(--space-3, 12px)",
            borderRadius: "var(--radius-card, 14px)",
            background: cleared ? "var(--good-soft, var(--bb-muted))" : "var(--warn-soft, var(--bb-muted))",
            color: cleared ? "var(--good-ink, var(--bb-foreground))" : "var(--warn-ink, var(--bb-foreground))",
          }}
        >
          {outcomeLine(outcome, target.name)}
          {cleared && misses > 0 && ` You found the line again ${misses === 1 ? "once" : `${misses} times`} on the way.`}
        </p>
      )}

      <footer style={{ display: "flex", gap: "var(--space-2, 8px)", alignItems: "center" }}>
        {freehand && !cleared && (
          <ChipPress
            disabled={drawnCount === 0}
            onClick={() => resolve(gradeDrawing(target, drawnRef.current))}
          >
            Check
          </ChipPress>
        )}
        {cleared && onContinue !== undefined && <ChipPress onClick={onContinue}>Continue</ChipPress>}
        {beat.diamonds !== undefined && cleared && (
          <span style={{ color: "var(--diamond)", fontWeight: 700 }}>+{beat.diamonds}</span>
        )}
      </footer>
    </section>
  );
}
