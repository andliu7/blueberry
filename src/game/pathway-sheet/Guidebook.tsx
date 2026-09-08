/**
 * The guidebook page: the concept surface behind the node sheet's hamburger.
 *
 * Reference: blueberry_r5-guidebook_1788286119.png. The format is locked by
 * docs/DESIGN-GOALS.md: a text-and-image explainer, a key-idea callout card,
 * and a numbered worked-example strip; body text in the neutral content face
 * (no .bb-title-face on anything a student reads as content). The draft text in
 * the reference image is model gibberish; the layout is what binds.
 *
 * THE COPY IS PLACEHOLDER, and the page says so. Every GuidebookContent this
 * phase can produce carries placeholder:true (see guidebookContent.ts), and a
 * placeholder page renders the gate-mark pill so a draft can never pass as a
 * reviewed lesson. When authored copy lands after the human gate, the flag
 * flips in data and the pill leaves with it; nothing here changes.
 *
 * The figures are deliberately abstract line art (a ring, an arrow, shapes),
 * not a drawn mechanism: a specific mechanism drawing in a generic component
 * would be wrong chemistry on most of the 192 nodes it renders for.
 */

import {  } from "../mascot/Berry";
import { SectionBerry } from "./SectionBerry";
import { MoleculeGlyph } from "./MoleculeGlyph";
import type { GuidebookContent, SchemeStep } from "./guidebookContent";
import "./pathway-sheet.css";

/** Pointer-down-first activation, same contract as the sheet's buttons. */
function pressHandlers(act: () => void) {
  return {
    onPointerDown: () => act(),
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      act();
    },
  };
}

/**
 * The back control is an ARROW WITH A SHAFT, and it is wider than it is tall:
 * the reference's dark-pixel bbox is 27 by 22. A bare chevron is 8 by 15,
 * taller than wide, which is a different motif and reads as one at a glance.
 */
function BackGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20 12H4.5m0 0l6.8-6.8M4.5 12l6.8 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The page's environment: PLACED props, not scatter, per DESIGN-GOALS'
 * background doctrine, and drawn from the committed art kit's own family
 * (blueberry_artkit-prop-sheet: terrace edge tiles, outlined erlenmeyers with
 * a liquid level, flourishes).
 *
 * THE REFERENCE DRAWS LAYERED TERRACE STEPS, NOT A DOME. Attempt 2 shipped
 * one 272 by 160 semicircle right-anchored behind the callout and a second
 * far below, and the critic named it: the picture has a broad LOW shoulder
 * whose crest runs from behind the figure card off the right edge, a second
 * lower step behind the callout, a third rising from the left further down,
 * and a thin curled antenna standing on the first crest.
 *
 * EACH PROP IS ANCHORED TO THE SECTION IT SITS BEHIND, not to an offset down
 * the page. That is the fix for the placement bug rather than a new number: a
 * title that wraps to two lines, or a draft pill that comes and goes, moves
 * every absolute offset below it, and an anchored prop moves with the thing
 * it belongs to.
 *
 * The mechanics, named because they are the non-obvious part: the prop is
 * absolutely positioned inside its section with z-index -1, and the section
 * is a stacking context, so the prop paints under that section's own content
 * and above the page behind it without needing a rule on any sibling.
 */
function FigureProps() {
  return (
    <div className="gb-prop gb-prop--figrow" aria-hidden>
      {/* Step one: a BROAD LOW shoulder. Its crest sits left of centre and
          then runs flat off the right edge, which is what the reference draws
          behind the figure card. preserveAspectRatio none, so the shape
          stretches to whatever width the column gives it. */}
      <svg className="gb-prop__step-one" viewBox="0 0 320 110" preserveAspectRatio="none">
        <path d="M320 110V26c-20-14-64-22-116-10C152 28 84 66 0 110z" fill="currentColor" />
      </svg>
      {/* The antenna: a thin stalk off the crest ending in a small curl. The
          reference draws it at image x 600..620, y 485..545. */}
      <svg className="gb-prop__antenna" viewBox="0 0 40 60">
        <path
          d="M8 58L25 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M25 20a7 7 0 1 1 6.6 6.2a3.6 3.6 0 1 1-4.2-4.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {/* Step two: lower, flatter, and wider still, crossing behind the KEY
          IDEA callout and running off the right edge under step one. */}
      <svg className="gb-prop__step-two" viewBox="0 0 320 90" preserveAspectRatio="none">
        <path d="M320 90V20c-30-12-78-16-140-2C118 32 56 60 0 90z" fill="currentColor" />
      </svg>
      {/* The two erlenmeyers, each with a rim, a LIQUID LEVEL and, on the
          taller one, two rising bubbles. Bare outlines were the attempt 2
          version; the art kit's flask carries liquid and so does the
          reference's pair. Thin strokes: this is scenery, not a UI line. */}
      <svg className="gb-prop__flasks" viewBox="0 0 120 110">
        <path
          d="M25 66h32l6.9 21a7 7 0 0 1-6.5 10H24.6A7 7 0 0 1 18.1 87z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M61 70h29l6 18a6 6 0 0 1-5.6 9H60.6A6 6 0 0 1 55 88z"
          fill="currentColor"
          opacity="0.55"
        />
        <path
          d="M31 9h20M35 9v27L18 87a7 7 0 0 0 6.6 10h32.8A7 7 0 0 0 64 87L47 36V9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M66 22h19M70 22v22L55 88a6 6 0 0 0 5.6 9h29.5A6 6 0 0 0 96 88L81 44V22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="50" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="31" cy="59" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </div>
  );
}

/**
 * Step three, and the last of the reference's terraces: it RISES FROM THE
 * LEFT under the worked example and runs down to the right, which is the
 * mirror of step one above it. Attempt 2 drew a second right-anchored dome
 * here, so the page had the same shape twice instead of a descending terrace.
 */
function TailProps() {
  return (
    <div className="gb-prop gb-prop--tail" aria-hidden>
      <svg className="gb-prop__step-three" viewBox="0 0 320 110" preserveAspectRatio="none">
        <path d="M0 110V34c26-16 74-24 132-12 58 12 122 48 188 88z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** A hexagon ring at (cx, cy): the one structure glyph every node shares. */
function ringPoints(cx: number, cy: number, r: number): string {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * The explainer figure: structure, arrow, abstract outcome shapes, echoing
 * the reference's schematic card. Colour goes through tokens only, and every
 * shape is decoration inside one labelled figure, never a lone mark.
 */
function ExplainerFigure() {
  return (
    <svg viewBox="0 0 200 90" role="img" aria-label="Schematic: a starting structure transforms into products">
      <polygon points={ringPoints(42, 45, 24)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      {/* The inner bonds, so the ring reads as a ring and not a hexagon. */}
      <path
        d="M43.7 27.7L56.1 34.9M56.1 55.1L43.7 62.3M26.2 37.8v14.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M78 45h34m0 0l-8-6m8 6l-8 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Three outcome shapes, MUTED and neutral, matching what the reference
          samples: a grey-violet circle (149,146,177), a pale blue rounded
          rect (156,201,232) and a khaki-olive triangle (195,194,137). They
          used to be var(--bb-primary) and var(--progress), which spent the brand
          violet and the PROGRESS semantic on decoration inside a figure that
          reports no progress at all. Each shape keeps its currentColor
          outline, so the contrast audit resolves it on the boundary rather
          than on the muted fill. */}
      <circle
        cx="132"
        cy="30"
        r="11"
        fill="color-mix(in srgb, var(--bb-border) 65%, var(--tab-active))"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="154"
        y="21"
        width="28"
        height="16"
        rx="4"
        fill="color-mix(in srgb, var(--diamond) 45%, var(--bb-card))"
        stroke="currentColor"
        strokeWidth="2"
      />
      <polygon
        points="145,74 161,49 177,74"
        fill="color-mix(in srgb, color-mix(in srgb, var(--warn) 50%, var(--progress-edge)) 40%, var(--bb-secondary))"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Geometry for the scheme, so the numbers below read as arithmetic, not magic. */
const STEP_PITCH = 74;
const FIRST_CX = 26;
const RING_R = 17;
const SCHEME_CY = 40;

/**
 * The worked-example scheme, and this card's ART IS THE CONTENT.
 *
 * The reference gives about 58 percent of the card's height to a wide FIVE
 * structure scheme, with reagent labels set OVER the arrows and a byproduct
 * term after the last structure, and only about 15 percent to one caption
 * line above it. Attempt 2 drew six lines of caption over a three-ring
 * scheme with bare arrows, which read as a text list with an illustration
 * under it: the reference's hierarchy inverted.
 *
 * So: five structures, four labelled arrows, a step number under each
 * structure, a byproduct term at the end. The arrow labels are step numbers
 * rather than reagents, because this component renders for every node on the
 * map and a fabricated reagent would be wrong chemistry in a draft; see
 * guidebookContent.ts for the full reasoning and for where authored
 * conditions land instead.
 */
function StripArt({
  scheme,
  byproduct,
  label,
}: {
  readonly scheme: readonly SchemeStep[];
  readonly byproduct: string | null;
  readonly label: string;
}) {
  const lastCx = FIRST_CX + (scheme.length - 1) * STEP_PITCH;
  const width = lastCx + RING_R + (byproduct === null ? 14 : 96);
  return (
    <svg viewBox={`0 0 ${width} 84`} role="img" aria-label={label}>
      {scheme.map((step, i) => {
        const cx = FIRST_CX + i * STEP_PITCH;
        const arrowFrom = cx + RING_R + 4;
        const arrowTo = cx + STEP_PITCH - RING_R - 4;
        return (
          <g key={step.n}>
            {/* The arrow INTO this step, with its label riding over it, which
                is where the reference sets its conditions. */}
            {i > 0 ? (
              <g>
                <path
                  d={`M${arrowFrom - STEP_PITCH} ${SCHEME_CY}h${arrowTo - arrowFrom}m0 0l-6-4.5m6 4.5l-6 4.5`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {step.overArrow === null ? null : (
                  // Smaller and lighter than the structure number below it,
                  // as the reference sets its own over-arrow labels: the
                  // condition line is an annotation on the arrow, the number
                  // under a structure is that structure's name.
                  <text
                    x={cx - STEP_PITCH / 2}
                    y={SCHEME_CY - 8}
                    fontSize="11"
                    fontWeight="500"
                    fill="currentColor"
                    textAnchor="middle"
                  >
                    {step.overArrow}
                  </text>
                )}
              </g>
            ) : null}

            <polygon
              points={ringPoints(cx, SCHEME_CY, RING_R)}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* The inner bonds, so each structure reads as a ring. */}
            <path
              d={`M${cx + 1.2} ${SCHEME_CY - 12.2}L${cx + 10} ${SCHEME_CY - 7.1}M${cx + 10} ${SCHEME_CY + 7.1}L${
                cx + 1.2
              } ${SCHEME_CY + 12.2}M${cx - 11.2} ${SCHEME_CY - 5}v10`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {step.glyph === "arrows" ? (
              <path
                d={`M${cx + 12} ${SCHEME_CY - 14}c10-6 18 0 15 10m0 0l1-6m-1 6l-6-2`}
                fill="none"
                stroke="var(--bb-primary-ink)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : null}
            {step.glyph === "adduct" || step.glyph === "product" ? (
              <g>
                <path
                  d={`M${cx + 14.7} ${SCHEME_CY - 8.5}L${cx + 22} ${SCHEME_CY - 14}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx={cx + 25.5} cy={SCHEME_CY - 16.5} r="5" fill="var(--tab-active)" stroke="currentColor" strokeWidth="1.8" />
              </g>
            ) : null}
            {/* A second landed mark on the final structure, so the last step
                reads as further along than the one before it. */}
            {step.glyph === "product" ? (
              <path
                d={`M${cx - 14.7} ${SCHEME_CY + 8.5}L${cx - 22} ${SCHEME_CY + 14}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : null}
            {/* The number rides UNDER its structure, as the reference numbers
                its scheme, and the STARTING structure carries none: in the
                reference the numbers under the structures begin at 2, because
                the thing you were handed does not need naming. That also
                keeps every drawn label distinct from the arrow label beside
                it, so nothing reads as the same token twice. */}
            {step.n === 1 ? null : (
              <text x={cx} y={SCHEME_CY + 36} fontSize="13" fontWeight="700" fill="currentColor" textAnchor="middle">
                {step.n}
              </text>
            )}
          </g>
        );
      })}
      {byproduct === null ? null : (
        <text x={lastCx + RING_R + 14} y={SCHEME_CY + 4} fontSize="13" fill="currentColor">
          + {byproduct}
        </text>
      )}
    </svg>
  );
}

export interface GuidebookProps {
  readonly content: GuidebookContent;
  readonly onBack: () => void;
  readonly reducedMotion: boolean;
}

export function Guidebook({ content, onBack, reducedMotion }: GuidebookProps) {
  const worked = content.workedExample;
  // The scheme is one labelled graphic. Its steps are real content, so the
  // accessible name spells the sequence out rather than saying "diagram".
  const artLabel = `${worked.heading}: ${worked.scheme.map((step) => `${step.n}, ${step.said}`).join("; ")}${
    worked.byproduct === null ? "" : `; plus ${worked.byproduct}`
  }.`;

  return (
    <article className="gb-page" data-placeholder-copy={content.placeholder ? "human-gate" : undefined} aria-label={`Guidebook: ${content.title}`}>
      <button type="button" className="gb-back press" aria-label="Back" {...pressHandlers(onBack)}>
        <BackGlyph />
      </button>

      <header className="gb-head">
        <h1 className="text-scale-2xl font-bold leading-tight">{content.title}</h1>
        <span className="gb-badge text-scale-sm">
          <MoleculeGlyph />
          {content.badge}
        </span>
      </header>

      {content.placeholder ? <p className="gb-draft text-scale-xs">{content.gateMark}</p> : null}

      <p className="gb-intro text-scale-base">{content.intro}</p>

      <div className="gb-figrow">
        <FigureProps />
        <figure className="gb-figure">
          <ExplainerFigure />
        </figure>
        <aside className="gb-callout" aria-label="Key idea">
          <p className="gb-callout__cap text-scale-xs">Key idea</p>
          <p className="gb-callout__body text-scale-sm">{content.keyIdea}</p>
        </aside>
      </div>

      <h2 className="gb-section-head bb-title-face text-scale-xl font-bold">
        <SectionBerry mood="focused" reducedMotion={reducedMotion} />
        {worked.heading}
      </h2>

      {/* THE TAIL BLOCK: the worked-example card and the closing mascot, held
          together so the third terrace can sit behind BOTH of them. Anchored
          to the heading instead, the terrace started above its own first line
          and cut a diagonal straight across the words, which is what the
          round 2 critic saw. */}
      <div className="gb-tail">
        <TailProps />

        {/* ONE caption line, then the art. See StripArt's note: this card's
            hierarchy is the measurement the attempt 2 critic rejected. */}
        <section className="gb-strip" aria-label={worked.heading}>
          <p className="gb-strip__lead text-scale-sm">
            <span className="gb-strip__n" aria-hidden>
              1.
            </span>
            {worked.lead}
          </p>
          <div className="gb-strip__art">
            <StripArt scheme={worked.scheme} byproduct={worked.byproduct} label={artLabel} />
          </div>
        </section>

        {/* HOW THE PAGE ENDS: the reference closes on a mascot block, a
            leafed berry beside its own heading with a line under it, and no
            card. The build ended on a fourth card, which is one part more
            than DESIGN-GOALS locks for this page. */}
        <h2 className="gb-section-head bb-title-face text-scale-xl font-bold">
          <SectionBerry mood="curious" reducedMotion={reducedMotion} />
          {content.closing.heading}
        </h2>
        <p className="gb-closing text-scale-base">{content.closing.line}</p>
      </div>
    </article>
  );
}
