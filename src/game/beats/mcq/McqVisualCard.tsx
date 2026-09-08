/**
 * The drawn half of an MCQ beat: the picture that sits between the stem and
 * the options, per owner ruling 1 of 2026-09-04.
 *
 * THREE SHAPES, ONE CARD. A scheme is handed straight to `SchemeCard`, which
 * already draws exactly the composition `blueberry_r9-lesson-reaction` locks:
 * near-white paper, species with captions under them, the arrow carrying its
 * conditions. The other two shapes are the same paper with the arrow taken
 * out, so they reuse that card's own class names rather than growing a second
 * stylesheet that would drift from it. `scheme.css` is imported here for the
 * same reason it is imported there: a component that uses the classes owns
 * the import, so the styles cannot go missing on a route that renders this
 * without rendering a scheme.
 *
 * ARIA. The card is `aria-hidden`, matching SchemeCard and the placement
 * tiles: every caption drawn here also appears in the beat's own prompt or
 * brief, and reading the picture aloud would say the question twice.
 */

import { StructureFigure } from "../../onboarding/StructureFigure";
import { SchemeCard } from "../../lesson/SchemeCard";
import type { McqVisual, NamedFigure } from "./mcqFigures";
import "../../lesson/scheme.css";

/*
 * `name` is typed as `string | undefined` rather than as an optional property
 * because the app runs with exactOptionalPropertyTypes: reading an optional
 * field off a union member and passing it on is passing `string | undefined`,
 * and a prop declared optional will not accept that. Boring and explicit.
 */
function Species({ figure, name }: { readonly figure: NamedFigure["figure"]; readonly name: string | undefined }) {
  return (
    <div className="scheme__species">
      <StructureFigure figure={figure} className="scheme__figure" />
      {name === undefined ? null : <span className="scheme__caption">{name}</span>}
    </div>
  );
}

export function McqVisualCard({ visual }: { readonly visual: McqVisual }) {
  if (visual.kind === "scheme") return <SchemeCard scheme={visual.scheme} />;
  if (visual.kind === "pair") {
    return (
      <div className="scheme" aria-hidden>
        <Species figure={visual.a.figure} name={visual.a.name} />
        <Species figure={visual.b.figure} name={visual.b.name} />
      </div>
    );
  }
  return (
    <div className="scheme" aria-hidden>
      <Species figure={visual.figure} name={visual.name} />
    </div>
  );
}
