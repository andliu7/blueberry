/**
 * A real reaction, drawn: skeletal species on the scheme paper with "+" and an arrow between them.
 * Every structure comes from content/u2energy/figures.generated.ts (RDKit layout, OPSIN-checked
 * names). Species share one scale so a bond is the same length in each.
 */
import { sharedFitBoxes } from "../onboarding/figures";
import { StructureFigure } from "../onboarding/StructureFigure";
import type { GenSpecies } from "../content/u2energy/figures.generated";
import "../lesson/scheme.css";

export type ReactionItem = GenSpecies | string;

const isSymbol = (item: ReactionItem): item is string => typeof item === "string";

export function ReactionRow({ items, label }: { readonly items: readonly ReactionItem[]; readonly label: string }) {
  const species = items.filter((i): i is GenSpecies => !isSymbol(i));
  const boxes = sharedFitBoxes(species.map((s) => s.figure));
  let n = 0;
  return (
    <div className="scheme scheme--large" role="img" aria-label={label}>
      {items.map((item, i) => {
        if (isSymbol(item)) {
          return (
            <span key={`s${i}`} aria-hidden className="shrink-0 px-0.5 text-scale-lg font-semibold text-bb-muted-foreground">
              {item}
            </span>
          );
        }
        const box = boxes[n]!;
        n += 1;
        return (
          <div key={`${item.name}-${i}`} className="scheme__species" aria-hidden>
            <StructureFigure figure={item.figure} className="scheme__figure" box={box} />
            <span className="scheme__caption">{item.name}</span>
            {item.tag === undefined ? null : <span className="scheme__caption font-semibold">{item.tag}</span>}
          </div>
        );
      })}
    </div>
  );
}
