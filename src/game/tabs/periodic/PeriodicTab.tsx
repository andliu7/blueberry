/**
 * The interactive periodic table. Bar matched against ptable.com: the 18
 * column layout with the f block below, colour by category, a property
 * selector that recolours the grid, and a detail panel for the selected
 * element. Free, always reachable, works offline (the data is in this chunk
 * and the service worker in public/sw.js keeps the chunk).
 *
 * Layout: CSS grid with explicit column and row placement from gridPosition,
 * so the table is one element per cell and no empty placeholder divs. On a
 * phone it scrolls horizontally inside its own container, which is the one
 * place in the app wide content is allowed to scroll sideways; the page body
 * never does.
 *
 * Every cell is a button of at least 44 by 44 points on touch, the hit floor.
 * The selected symbol is in the URL (#/periodic/Br) so it survives a refresh.
 */

import { useMemo, useState } from "react";
import { Card, Pill } from "../../app/ui/Card";
import { hrefForTab } from "../../app/routes";
import { CATEGORY_LABEL, ELEMENTS, elementBySymbol, gridPosition, type Category, type Element } from "./elements";

type Colouring = "category" | "electronegativity" | "block" | "phase";

/**
 * The ink on an element tile, and it is a literal because the tile's ground is
 * one.
 *
 * The nine category colours below are fixed pale washes that do not move with
 * the theme, so the ink on them cannot be a theme token either. It used to be
 * #1e293b, slate-800. That value measures HSL S 0.326, which the sticker audit
 * scores as a saturated hue on body sized text, and rule 7 of that language is
 * that body copy recedes so the colour can lead. theme.css already settled the
 * same question for --bb-foreground and reached #2a2a42, S 0.222, which reads as
 * the same deep navy and is a near neutral by measurement rather than by
 * assertion. This is that value, for that reason, and the contrast audit reads
 * it where it is actually composed on all nine washes.
 */
const PERIODIC_INK = "#2a2a42";

const CATEGORY_COLOUR: Record<Category, string> = {
  alkali: "#fecaca",
  alkaline: "#fed7aa",
  transition: "#fde68a",
  post_transition: "#bbf7d0",
  metalloid: "#a7f3d0",
  nonmetal: "#bfdbfe",
  noble: "#ddd6fe",
  lanthanide: "#fbcfe8",
  actinide: "#f5d0fe",
};

const BLOCK_COLOUR: Record<Element["block"], string> = { s: "#fecaca", p: "#bfdbfe", d: "#fde68a", f: "#fbcfe8" };
const PHASE_COLOUR: Record<Element["phase"], string> = { solid: "#e7e5e4", liquid: "#bfdbfe", gas: "#ddd6fe", unknown: "#f5f5f4" };

function electronegativityColour(value: number | null): string {
  if (value === null) return "#f5f5f4";
  // 0.7 to 4.0 mapped onto a light-to-saturated violet ramp.
  const t = Math.max(0, Math.min(1, (value - 0.7) / 3.3));
  const light = 96 - t * 46;
  return `hsl(262 70% ${light}%)`;
}

function cellColour(element: Element, colouring: Colouring): string {
  switch (colouring) {
    case "category":
      return CATEGORY_COLOUR[element.category];
    case "electronegativity":
      return electronegativityColour(element.electronegativity);
    case "block":
      return BLOCK_COLOUR[element.block];
    case "phase":
      return PHASE_COLOUR[element.phase];
    default: {
      const unreachable: never = colouring;
      return unreachable;
    }
  }
}

const COLOURINGS: readonly { readonly id: Colouring; readonly label: string }[] = [
  { id: "category", label: "Category" },
  { id: "electronegativity", label: "Electronegativity" },
  { id: "block", label: "Block" },
  { id: "phase", label: "Phase at STP" },
];

function Detail({ element }: { readonly element: Element }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-bb-border text-bb-foreground"
          style={{ background: CATEGORY_COLOUR[element.category], color: PERIODIC_INK }}
        >
          <span className="text-scale-xs">{element.number}</span>
          <span className="bb-title-face text-scale-2xl font-semibold leading-none">{element.symbol}</span>
        </div>
        <div>
          <h2 className="bb-title-face text-scale-xl font-semibold">{element.name}</h2>
          <Pill>{CATEGORY_LABEL[element.category]}</Pill>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-scale-sm">
        <dt className="text-bb-muted-foreground">Atomic mass</dt>
        <dd className="font-mono">
          {element.massIsNominal ? `[${element.mass}]` : element.mass}
        </dd>
        <dt className="text-bb-muted-foreground">Electronegativity</dt>
        <dd className="font-mono">{element.electronegativity ?? "–"}</dd>
        <dt className="text-bb-muted-foreground">Configuration</dt>
        <dd className="font-mono">{element.configuration}</dd>
        <dt className="text-bb-muted-foreground">Group, period</dt>
        <dd className="font-mono">
          {element.group ?? "f"}, {element.period}
        </dd>
        <dt className="text-bb-muted-foreground">Block</dt>
        <dd className="font-mono">{element.block}</dd>
        <dt className="text-bb-muted-foreground">Phase at STP</dt>
        <dd className="font-mono">{element.phase}</dd>
      </dl>
      {element.massIsNominal ? (
        <p className="text-scale-xs text-bb-muted-foreground">No stable isotope. The bracketed mass is the mass number of the longest lived one.</p>
      ) : null}
    </Card>
  );
}

export default function PeriodicTab({ selected }: { readonly selected: string | null }) {
  const [colouring, setColouring] = useState<Colouring>("category");
  const [hover, setHover] = useState<Element | null>(null);
  const chosen = useMemo(() => (selected === null ? null : elementBySymbol(selected)), [selected]);
  const shown = hover ?? chosen ?? elementBySymbol("C");

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Colour by">
        {COLOURINGS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={colouring === option.id}
            onPointerDown={() => setColouring(option.id)}
            className={`press min-h-11 rounded-full px-4 text-scale-sm font-semibold ${
              colouring === option.id
                ? "border border-[color:var(--bb-primary-edge)] bg-bb-primary text-bb-primary-foreground"
                : "border border-bb-border bg-bb-card text-bb-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-x-auto rounded-2xl border border-bb-border bg-bb-card p-3">
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(18, minmax(2.75rem, 1fr))", gridTemplateRows: "repeat(10, 2.75rem)", minWidth: "52rem" }}
            role="grid"
            aria-label="Periodic table"
          >
            {ELEMENTS.map((element) => {
              const position = gridPosition(element);
              const isChosen = chosen?.number === element.number;
              return (
                <a
                  key={element.number}
                  href={hrefForTab("periodic", element.symbol)}
                  role="gridcell"
                  aria-label={`${element.name}, ${element.number}`}
                  aria-selected={isChosen}
                  onPointerEnter={() => setHover(element)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(element)}
                  onBlur={() => setHover(null)}
                  className={`press flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl border text-[#2a2a42] ${
                    isChosen ? "border-bb-primary ring-2 ring-bb-primary/40" : "border-black/10"
                  }`}
                  style={{
                    gridColumn: position.column,
                    gridRow: position.row,
                    background: cellColour(element, colouring),
                  }}
                >
                  <span className="text-[0.6rem] leading-none opacity-70">{element.number}</span>
                  <span className="text-scale-sm font-bold leading-tight">{element.symbol}</span>
                </a>
              );
            })}
          </div>
          {colouring === "category" ? (
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-scale-xs text-bb-muted-foreground">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((category) => (
                <li key={category} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm border border-black/10" style={{ background: CATEGORY_COLOUR[category] }} aria-hidden />
                  {CATEGORY_LABEL[category]}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {shown !== null ? <Detail element={shown} /> : null}
      </div>
    </div>
  );
}
