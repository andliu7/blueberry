/**
 * The interactive periodic table. Bar: ptable.com and the RSC periodic table.
 *
 * What it does:
 *  - All 118 elements, the two f rows included. On a wide screen the whole
 *    table fits at once; in the tool sheet it fits the sheet's height as well
 *    as its width, so the actinide row is never cut. On a phone it opens at a
 *    readable size (48px tiles) and you drag sideways; FIT shows the whole
 *    table as an opt-in thumbnail (useZoomPan.ts has the reasoning).
 *  - Scroll wheel and pinch zoom, drag to pan, and minus, plus and fit buttons.
 *  - Tap a tile to select it: it lifts with a ring, the inset in the table's
 *    empty corner shows it big, and the full card below (ElementDetail) shows
 *    every value. DETAILS scrolls to that card.
 *  - The category filters are a sliding segmented switch (approved effect #12):
 *    pick one and that group stays in colour while the rest go flat grey, and
 *    the table pans to the group if it is off screen. The filter row can be
 *    hidden, and that choice is remembered on this device.
 *  - Colour by category, electronegativity or standard state.
 *
 * NO LAYOUT SHIFT. The row under the toolbar is one fixed-height slot. It holds
 * the filter switch, or the key for the electronegativity and state colourings,
 * or (filters hidden) a one-line summary of the selected element. Changing
 * colouring or hiding the filters swaps what is in the slot; nothing below it
 * moves.
 *
 * Data: PubChem (NCBI), through elements.ts. Nothing is typed in by hand.
 *
 * The selected symbol goes into the URL when this is the page (#/app/periodic/Br)
 * so a refresh keeps it. Inside the tool sheet the URL is left alone, because
 * changing the hash there would close the sheet.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hrefForTab } from "../../app/routes";
import { CATEGORIES, CATEGORY_LABEL, ELEMENTS, elementBySymbol, gridPosition, shortMass, type Category, type Element } from "./elements";
import { CATEGORY_COLOUR, EN_BINS, NO_DATA_FILL, PERIODIC_INK, PHASE_COLOUR, PHASE_LABEL, tileColour, tileInk, type Colouring } from "./colours";
import { Configuration, ElementDetail } from "./ElementDetail";
import { SegmentedSwitch, type SegmentOption } from "./SegmentedSwitch";
import { useZoomPan } from "./useZoomPan";
import "./periodic.css";

type Filter = Category | "all";

/** Short labels so the eleven options stay one row on a wide screen. */
const SHORT_LABEL: Record<Category, string> = {
  alkali: "Alkali",
  alkaline: "Alkaline earth",
  transition: "Transition",
  post_transition: "Post-transition",
  metalloid: "Metalloid",
  nonmetal: "Nonmetal",
  halogen: "Halogen",
  noble: "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

const FILTER_OPTIONS: readonly SegmentOption<Filter>[] = [
  { id: "all", label: "All" },
  ...CATEGORIES.map((category) => ({ id: category, label: SHORT_LABEL[category], swatch: CATEGORY_COLOUR[category] })),
];

const COLOURING_OPTIONS: readonly SegmentOption<Colouring>[] = [
  { id: "category", label: "Category" },
  { id: "electronegativity", label: "Electronegativity" },
  { id: "state", label: "State" },
];

const FILTERS_KEY = "bb.periodic.filtersShown";

/** Remembered per device. Storage can throw (private mode), so both sides are guarded. */
function readFiltersShown(): boolean {
  try {
    return window.localStorage.getItem(FILTERS_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeFiltersShown(shown: boolean): void {
  try {
    window.localStorage.setItem(FILTERS_KEY, String(shown));
  } catch {
    // Not remembered this time; the switch still works.
  }
}

/** A finger cannot scroll-wheel, so the hint names the gestures the device has. */
function hintText(): string {
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  return coarse
    ? "Pinch to zoom, drag to move, tap an element for its details."
    : "Scroll or pinch to zoom, drag to move, click an element for its details.";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

const CARBON = elementBySymbol("C") as Element;

export default function PeriodicTab({ selected }: { readonly selected: string | null }) {
  const [picked, setPicked] = useState<Element>(() => (selected === null ? null : elementBySymbol(selected)) ?? CARBON);
  const [colouring, setColouring] = useState<Colouring>("category");
  const [filter, setFilter] = useState<Filter>("all");
  const [filtersShown, setFiltersShown] = useState(readFiltersShown);
  const [hint] = useState(hintText);

  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const zoom = useZoomPan(viewportRef, tableRef);

  /** Pan so these tiles are on screen, if they are not already. */
  const revealTiles = (selector: string, glide: boolean) => {
    const table = tableRef.current;
    if (table === null) return;
    const tiles = [...table.querySelectorAll<HTMLElement>(selector)];
    if (tiles.length === 0) return;
    // offsetLeft and offsetTop are in the table's own pixels: the transform does not change them.
    const left = Math.min(...tiles.map((tile) => tile.offsetLeft));
    const top = Math.min(...tiles.map((tile) => tile.offsetTop));
    const right = Math.max(...tiles.map((tile) => tile.offsetLeft + tile.offsetWidth));
    const bottom = Math.max(...tiles.map((tile) => tile.offsetTop + tile.offsetHeight));
    zoom.reveal({ left, top, width: right - left, height: bottom - top }, glide && !prefersReducedMotion());
  };

  // A deep link (#/app/periodic/Br) opens with that element on screen. Runs
  // before the first paint, after useZoomPan has sized the view, so there is no jump.
  useLayoutEffect(() => {
    if (selected !== null) revealTiles(`[data-number="${picked.number}"]`, false);
    // Mount only: later deep links are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new deep link (typed or followed while the page is open) moves the selection.
  useEffect(() => {
    const element = selected === null ? null : elementBySymbol(selected);
    if (element !== null && element.number !== picked.number) {
      setPicked(element);
      revealTiles(`[data-number="${element.number}"]`, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const pick = (element: Element) => {
    setPicked(element);
    // replaceState, not a hash assignment: it updates the address without a
    // hashchange event, so the shell does not re-route and history is not spammed.
    if (window.location.hash.startsWith(hrefForTab("periodic"))) {
      window.history.replaceState(null, "", hrefForTab("periodic", element.symbol));
    }
  };

  const chooseFilter = (next: Filter) => {
    setFilter(next);
    if (next !== "all") revealTiles(`[data-category="${next}"]`, true);
  };

  const chooseColouring = (next: Colouring) => {
    setColouring(next);
    // The highlight filter is a category filter; it only shows with the category colours.
    if (next !== "category") setFilter("all");
  };

  const toggleFilters = () => {
    const next = !filtersShown;
    setFiltersShown(next);
    writeFiltersShown(next);
    // A hidden filter must not keep dimming the table with no control in sight.
    if (!next) setFilter("all");
  };

  /** The "57-71" and "89-103" markers light the f row they stand for. */
  const showRow = (category: Category) => {
    if (colouring !== "category") setColouring("category");
    if (!filtersShown) {
      setFiltersShown(true);
      writeFiltersShown(true);
    }
    chooseFilter(filter === category ? "all" : category);
  };

  const showDetails = () => {
    detailRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  // Tiles only re-render when something they show changes, not on every zoom frame.
  const tiles = useMemo(
    () =>
      ELEMENTS.map((element) => {
        const position = gridPosition(element);
        const dim = filter !== "all" && element.category !== filter;
        const isPicked = picked.number === element.number;
        return (
          <button
            key={element.number}
            type="button"
            className="pt-tile"
            data-number={element.number}
            data-category={element.category}
            data-dim={dim}
            data-selected={isPicked}
            aria-pressed={isPicked}
            aria-label={`${element.name}, ${element.number}, ${CATEGORY_LABEL[element.category]}`}
            onClick={() => pick(element)}
            style={{ gridColumn: position.column, gridRow: position.row, background: tileColour(element, colouring), color: tileInk(element, colouring) }}
          >
            <span className="pt-tile-number">{element.number}</span>
            <span className="pt-tile-symbol">{element.symbol}</span>
            <span className="pt-tile-name">{element.name}</span>
            <span className="pt-tile-mass">{shortMass(element.mass)}</span>
          </button>
        );
      }),
    // `pick` is a fresh function each render but only calls setters, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, picked, colouring],
  );

  const byCategory = colouring === "category";

  return (
    <div className="pt-root">
      <div className="pt-toolbar">
        <SegmentedSwitch label="Colour by" options={COLOURING_OPTIONS} value={colouring} onChange={chooseColouring} compact />
        <div className="pt-toolbar-actions">
          <button
            type="button"
            className="pt-btn pt-btn--toggle"
            aria-pressed={filtersShown && byCategory}
            disabled={!byCategory}
            title={byCategory ? undefined : "Highlight filters work with the Category colours"}
            onClick={toggleFilters}
          >
            <span className="pt-btn-check" aria-hidden>
              {filtersShown && byCategory ? "✓" : ""}
            </span>
            Filters
          </button>
          <button type="button" className="pt-btn pt-btn--icon" aria-label="Zoom out" disabled={zoom.atFit} onClick={zoom.zoomOut}>
            −
          </button>
          <button type="button" className="pt-btn pt-btn--icon" aria-label="Zoom in" onClick={zoom.zoomIn}>
            +
          </button>
          <button type="button" className="pt-btn" aria-label="Fit the whole table" disabled={zoom.atFit} onClick={zoom.fit}>
            Fit
          </button>
        </div>
      </div>

      <div className="pt-slot">
        {!byCategory ? (
          <Legend colouring={colouring} />
        ) : filtersShown ? (
          <SegmentedSwitch label="Highlight a group" options={FILTER_OPTIONS} value={filter} onChange={chooseFilter} />
        ) : (
          <SelectedSummary element={picked} onDetails={showDetails} />
        )}
      </div>

      <div ref={viewportRef} className="pt-viewport" onClickCapture={zoom.onClickCapture}>
        <div ref={tableRef} className="pt-table" data-filtered={filter !== "all"} role="group" aria-label="Periodic table, 118 elements">
          {tiles}

          <button
            type="button"
            className="pt-marker"
            data-category="lanthanide"
            data-dim={filter !== "all" && filter !== "lanthanide"}
            data-neutral={!byCategory}
            style={{ gridColumn: 3, gridRow: 6, background: CATEGORY_COLOUR.lanthanide, color: PERIODIC_INK }}
            onClick={() => showRow("lanthanide")}
            aria-label="Highlight the lanthanides, 57 to 71"
          >
            57-71
          </button>
          <button
            type="button"
            className="pt-marker"
            data-category="actinide"
            data-dim={filter !== "all" && filter !== "actinide"}
            data-neutral={!byCategory}
            style={{ gridColumn: 3, gridRow: 7, background: CATEGORY_COLOUR.actinide, color: PERIODIC_INK }}
            onClick={() => showRow("actinide")}
            aria-label="Highlight the actinides, 89 to 103"
          >
            89-103
          </button>

          {/* The empty corner over the transition metals, as ptable and RSC use it. */}
          <div className="pt-inset">
            <div className="pt-inset-tile" style={{ background: tileColour(picked, colouring), color: tileInk(picked, colouring) }} aria-hidden>
              <span className="pt-inset-number">{picked.number}</span>
              <span className="pt-inset-symbol">{picked.symbol}</span>
              <span className="pt-inset-mass">{shortMass(picked.mass)}</span>
            </div>
            <div className="pt-inset-text">
              <span className="pt-inset-name">{picked.name}</span>
              <span className="pt-inset-line">{CATEGORY_LABEL[picked.category]}</span>
              <span className="pt-inset-line">
                <Configuration text={picked.configuration} />
              </span>
              <span className="pt-inset-line">Electronegativity {picked.electronegativity ?? "no data"}</span>
              <button type="button" className="pt-inset-more" onClick={showDetails}>
                All facts
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="pt-hint">{hint}</p>

      <div ref={detailRef} className="pt-detail-anchor">
        <ElementDetail element={picked} />
      </div>
    </div>
  );
}

/** The selected element in one line, for the slot when the filters are hidden. */
function SelectedSummary({ element, onDetails }: { readonly element: Element; readonly onDetails: () => void }) {
  return (
    <div className="pt-summary" aria-live="polite">
      <span className="pt-summary-tile" style={{ background: CATEGORY_COLOUR[element.category] }} aria-hidden>
        {element.symbol}
      </span>
      <span className="pt-summary-text">
        <strong>{element.name}</strong>
        <span>
          {CATEGORY_LABEL[element.category]}, {shortMass(element.mass)} u
        </span>
      </span>
      <button type="button" className="pt-btn pt-btn--small" onClick={onDetails}>
        Details
      </button>
    </div>
  );
}

/** The key for the two non-category colourings. Category has the filter row. */
function Legend({ colouring }: { readonly colouring: Colouring }) {
  if (colouring === "electronegativity") {
    return (
      <div className="pt-legend" aria-label="Electronegativity key, Pauling scale">
        <span className="pt-legend-title">Pauling</span>
        <span className="pt-legend-ramp">
          {EN_BINS.map((bin) => (
            <span key={bin.from} className="pt-legend-step" style={{ background: bin.fill, color: bin.ink }}>
              {bin.label === "under 1.0" ? "<1.0" : bin.label}
            </span>
          ))}
        </span>
        <span className="pt-legend-item">
          <span className="pt-legend-swatch" style={{ background: NO_DATA_FILL }} />
          No data
        </span>
      </div>
    );
  }
  return (
    <div className="pt-legend" aria-label="Standard state key">
      {(Object.keys(PHASE_COLOUR) as (keyof typeof PHASE_COLOUR)[]).map((phase) => (
        <span key={phase} className="pt-legend-item">
          <span className="pt-legend-swatch" style={{ background: PHASE_COLOUR[phase] }} />
          {PHASE_LABEL[phase]}
        </span>
      ))}
    </div>
  );
}
