/**
 * The drawing on a premade section card (sectionDecks.ts): one row of the
 * unit guide's mini example, the same RDKit drawing the guidebook shows.
 * The front draws what goes in and the arrow with its reagents; the back
 * draws the product. Drawn by GuideMol at a fixed bond length, so a ring is
 * never shrunk to fit the card (the audit's "molecule too small").
 *
 * The guide is fetched the first time a card from its unit is drawn
 * (loadUnitGuide splits each unit's guide into its own file). Until then a
 * quiet box holds the space; the card's words are complete without it. The
 * guide index itself is a dynamic import too, so a card face (and every
 * screen that imports one) does not pull Units 0 and 1's guides in with it.
 */
import { useEffect, useState, type CSSProperties } from "react";
import type { Card } from "../types";
import { GuideMol } from "../../guide/GuideMol";
import type { GuidePanel, UnitGuide } from "../../guide/types";
import { sectionFigureOf } from "./sectionRoute";
import "./sectionFigure.css";

type GuideIndex = typeof import("../../guide");
let guideIndex: GuideIndex | null = null;

/** Fetches a unit's guide for the card faces (once), then resolves with it. Null for a unit with none. */
export async function loadSectionGuide(unitId: string): Promise<UnitGuide | null> {
  guideIndex ??= await import("../../guide");
  return guideIndex.loadUnitGuide(unitId);
}

type Mol = Extract<GuidePanel, { kind: "mol" }>;
type Arrow = Extract<GuidePanel, { kind: "arrow" }>;

/** The row's starting materials, arrow and products, or null when the guide has no such row. */
export function figureRow(guide: UnitGuide, lesson: string, row: number): { readonly lead: readonly Mol[]; readonly arrow: Arrow; readonly result: readonly Mol[] } | null {
  const panels = guide.examples[lesson]?.panels;
  if (panels === undefined) return null;
  const rows: GuidePanel[][] = [[]];
  for (const panel of panels) {
    if (panel.kind === "break") rows.push([]);
    else rows[rows.length - 1]!.push(panel);
  }
  const picked = rows[row];
  if (picked === undefined) return null;
  const at = picked.findIndex((panel) => panel.kind === "arrow");
  if (at < 0) return null;
  const mols = (list: readonly GuidePanel[]) => list.filter((panel): panel is Mol => panel.kind === "mol");
  return { lead: mols(picked.slice(0, at)), arrow: picked[at] as Arrow, result: mols(picked.slice(at + 1)) };
}

function Mols({ mols, size }: { readonly mols: readonly Mol[]; readonly size: "big" | "small" }) {
  return (
    <div className="ct-secfig__mols">
      {mols.map((mol, at) => (
        // --w is the drawing's own width in guide units; the CSS turns it into px.
        <span key={at} className={`ct-secfig__mol ct-secfig__mol--${size}`} style={{ "--w": mol.figure.w } as CSSProperties}>
          <GuideMol figure={mol.figure} />
        </span>
      ))}
    </div>
  );
}

export function SectionFigure({ card, side, size }: { readonly card: Card; readonly side: "front" | "back"; readonly size: "big" | "small" }) {
  const ref = sectionFigureOf(card);
  const unitId = ref?.unitId ?? null;
  // Read synchronously first: a guide fetched once draws at once from then on.
  const [guide, setGuide] = useState<UnitGuide | null>(() => (unitId === null ? null : (guideIndex?.unitGuideFor(unitId) ?? null)));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (unitId === null || guide !== null) return;
    // `live` stops a fetch that finishes after this card left the screen from setting state.
    let live = true;
    loadSectionGuide(unitId).then(
      (loaded) => {
        if (!live) return;
        if (loaded === null) setFailed(true);
        else setGuide(loaded);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [unitId, guide]);

  if (ref === null || failed) return null;
  if (guide === null) return <div className={`ct-secfig ct-secfig--wait ct-secfig--${size}`} aria-hidden="true" />;
  const row = figureRow(guide, ref.lesson, ref.row);
  if (row === null) return null;
  const names = (mols: readonly Mol[]) => mols.map((mol) => mol.name ?? "structure").join(" + ");
  return (
    <div className={`ct-secfig ct-secfig--${size}`} role="img" aria-label={side === "front" ? names(row.lead) : names(row.result)}>
      {side === "front" ? (
        <>
          <Mols mols={row.lead} size={size} />
          <div className="ct-secfig__arrow" aria-hidden="true">
            <svg viewBox="0 0 16 40">
              <path d="M8 2v34M2.5 30 8 36l5.5-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="ct-secfig__reagents">
              <span>{row.arrow.over}</span>
              {row.arrow.under !== undefined && <span className="ct-secfig__under">{row.arrow.under}</span>}
            </span>
          </div>
        </>
      ) : (
        <Mols mols={row.result} size={size} />
      )}
    </div>
  );
}
