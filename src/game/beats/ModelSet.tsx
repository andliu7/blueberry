/**
 * A named set of turnable 3-D models (content/u1/models.ts), the default
 * export so callers can load it lazily: the models and their viewer stay out
 * of every chunk until a card or an answered question asks for one.
 */
import { modelSet } from "../content/u1/models";
import Model3DPair from "./Model3DView";

export default function ModelSet({ set }: { readonly set: string }) {
  const models = modelSet(set);
  if (models === null) return null;
  return (
    <div>
      <Model3DPair models={models} />
      <p className="mt-1 text-center text-scale-xs text-bb-muted-foreground">Drag to turn. The CH2 bridge starts at the top.</p>
    </div>
  );
}
