/**
 * The drawn half of an energy question: the real reaction in skeletal structures (when the
 * question has one) above the energy diagram, on the same paper the structure cards use
 * (scheme.css). Looked up by beat id in content/u2energy; null for any other question.
 */
import { energyVisualFor } from "../content/u2energy";
import { EnergyFigure } from "./EnergyFigure";
import { ReactionRow } from "./ReactionRow";
import "../lesson/scheme.css";

export function EnergyVisualCard({ beatId }: { readonly beatId: string }) {
  const visual = energyVisualFor(beatId);
  if (visual === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {visual.reaction === undefined ? null : <ReactionRow items={visual.reaction} label={visual.label} />}
      {visual.hideDiagram === true ? null : (
        <div className="scheme flex flex-col items-center">
          <EnergyFigure
            profiles={visual.profiles}
            label={visual.label}
            numbers={visual.numbers ?? true}
            tsNumbers={visual.tsNumbers ?? false}
            range={visual.range ?? [-24, 30]}
          />
          {visual.sketch === true ? <p className="text-scale-sm text-bb-muted-foreground">A sketch of the shape, not measured values.</p> : null}
        </div>
      )}
    </div>
  );
}
