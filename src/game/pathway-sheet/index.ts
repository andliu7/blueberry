/**
 * The pathway node sheet and its guidebook. Public surface for the integrator.
 *
 * In-tree wiring (preferred): render <NodeSheet> beside the Charge sheet in
 * PathwayTab, holding the open node as state exactly as `gate` is held today,
 * and route the guidebook wherever the shell wants it. Imperative wiring:
 * mountNodeSheet(host, handlers) returns an open/close/dispose controller and
 * carries its own guidebook overlay.
 *
 * TWO CSS HOOKS THE INTEGRATOR MAY SET, and nothing else in this package
 * needs wiring. Both have measured fallbacks, so the surface is correct
 * without either; setting them makes it exact if the shell's chrome moves.
 *
 *   --ns-bottom-inset  the tab bar's height. The sheet's bottom edge lands on
 *                      it, because the reference keeps the four tabs visible
 *                      and undimmed under the sheet. Default 4.75rem plus the
 *                      home-indicator safe area, derived from app/ui/tabs.css
 *                      and locked by test/nodeSheetSeam.test.ts, and 0 above
 *                      48rem where the bar becomes a side rail.
 *   --bb-primary-lip      REQUESTED FROM theme.css, per theme, and the one thing
 *                      this package cannot derive honestly: the darker violet
 *                      under a pressed START. --bb-primary-edge flips lighter at
 *                      night (it is the outline token) so it cannot serve.
 *                      Until it lands, the fallback mixes --bb-primary toward
 *                      --chip-ink, which is the same dark value in both
 *                      themes. theme.css already carries this token family
 *                      (--progress-edge, --chip-face-press).
 *   --gb-top-inset     the sticky header's height, so the guidebook's first
 *                      line starts under it. Default 4.75rem.
 */

export { NodeSheet, type NodeSheetProps } from "./NodeSheet";
export { Guidebook, type GuidebookProps } from "./Guidebook";
/** The one ball-and-stick motif both surfaces draw. Exported so the pathway
 *  can carry the same mark rather than growing a third copy of it. */
export { MoleculeGlyph } from "./MoleculeGlyph";
/** The mascot's leaf and hands, as an accessory layer AROUND the imported
 *  mark (see BerryLeaf.tsx on D4). Exported because the pathway draws the
 *  same character and should carry the same leaf rather than redraw one. */
export { BerryLeaf, BerryHands } from "./BerryLeaf";
export { mountNodeSheet, type NodeSheetController, type NodeSheetHandlers } from "./mount";
export {
  nodeSheetModel,
  difficultyFor,
  PIP_COUNT,
  HUMAN_GATE_MARK,
  type NodeSheetModel,
  type SheetNode,
  type SheetNodeKind,
  type SheetNodeState,
} from "./nodeSheetModel";
export { guidebookFor, type GuidebookContent, type SchemeStep, type StepGlyph } from "./guidebookContent";
