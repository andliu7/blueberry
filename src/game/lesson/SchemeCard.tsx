/**
 * THE SCHEME CARD: the drawn question at the top of a lesson problem.
 *
 * `blueberry_r9-lesson-reaction` draws it exactly, and it is the single
 * loudest element on that frame: a light card, and inside it the substrate,
 * the reagent, an arrow, and a boxed question mark where the answer goes. Our
 * built screen carried the prompt as prose and nothing else, which is what
 * owner ruling 1 of 2026-09-04 forbids.
 *
 * WHY THE CARD IS COMPOSED IN HTML RATHER THAN DRAWN AS ONE WIDE SVG.
 * `StructureFigure` renders into a fixed 120 by 84 viewBox, which is the
 * right box for one molecule and the wrong one for a three-part scheme: a
 * scheme is roughly three to one, so one SVG would letterbox everything down
 * to about a third of the room it has. So each species keeps its own square
 * figure at full size and the ROW is flexbox. That also gets the captions for
 * free, because a caption is text under a picture and HTML is better at that
 * than SVG is.
 *
 * WHERE THE QUESTION MARK GOES, and it moves. A predict-the-product question
 * gives its reagents and asks for the right hand side, so the box on the
 * right asks. A supply-the-reagents question gives both sides and asks for
 * the arrow, so the ARROW carries the mark and both structures are drawn.
 * lessonFigures.ts models that by which field is absent; nothing here has to
 * know the answer kind.
 *
 * THE CAPTIONS ARE THE MUTED INK AT THE SMALL STEP, per ruling 2: "the
 * structure is drawn and the name sits UNDER it, small and light ... because
 * the name is a label on the thing rather than the thing".
 *
 * ARIA. The card is `aria-hidden` and the problem's own prompt is what a
 * screen reader gets, exactly as the placement tiles do it: every name drawn
 * here is a caption for a structure that is already described in the prompt,
 * and reading the scheme aloud would say the question twice. The one thing a
 * caption carries that the prompt might not (a stereodescriptor) is in the
 * prompt too, because the corpus writes it there.
 */

import type { Figure } from "../onboarding/figures";
import { formulaRuns } from "../onboarding/figures";
import { StructureFigure } from "../onboarding/StructureFigure";
import type { Scheme } from "./lessonFigures";
import "./scheme.css";

/**
 * A condition set in the corpus's own `_` and `^` markup.
 *
 * The same two character grammar `StructureFigure` typesets inside the SVG,
 * reused here so `H_2SO_4` over an arrow and `H_2SO_4` inside a drawing are
 * one notation rather than two. Reading the parser rather than restating it
 * is the point: a change to the grammar cannot leave these two disagreeing.
 */
function Typeset({ text }: { readonly text: string }) {
  return (
    <>
      {formulaRuns(text).map((run, index) =>
        run.level === 1 ? (
          <sub key={index}>{run.text}</sub>
        ) : run.level === 2 ? (
          <sup key={index}>{run.text}</sup>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </>
  );
}

function Species({ figure, name }: { readonly figure: Figure; readonly name: string | undefined }) {
  return (
    <div className="scheme__species">
      <StructureFigure figure={figure} className="scheme__figure" />
      {name !== undefined ? <span className="scheme__caption">{name}</span> : null}
    </div>
  );
}

/** The boxed question mark: where the answer will go once the student gives it. */
function Unknown() {
  return (
    <div className="scheme__species">
      <span className="scheme__unknown">?</span>
    </div>
  );
}

/**
 * The reaction arrow, with whatever is known written over and under it.
 *
 * The shaft is a border rather than an SVG line so it stretches to whatever
 * width the row leaves it, and the head is a rotated square, which is the
 * cheapest arrowhead that stays sharp at any zoom: a CSS border triangle on
 * the shaft itself, so the head needs no element of its own.
 */
function Arrow({ over, under }: { readonly over: string | undefined; readonly under: string | undefined }) {
  return (
    <div className="scheme__arrow">
      <span className="scheme__condition">
        <Typeset text={over ?? "?"} />
      </span>
      <span className="scheme__shaft" />
      <span className="scheme__condition scheme__condition--under">
        {under === undefined ? null : <Typeset text={under} />}
      </span>
    </div>
  );
}

export function SchemeCard({ scheme }: { readonly scheme: Scheme }) {
  return (
    <div className="scheme" aria-hidden>
      <Species figure={scheme.left} name={scheme.leftName} />
      <Arrow over={scheme.over} under={scheme.under} />
      {scheme.right === undefined ? <Unknown /> : <Species figure={scheme.right} name={scheme.rightName} />}
    </div>
  );
}
