/**
 * Which header tools a screen may show.
 *
 * Owner rule, 29 Oct: the periodic table and the NMR and IR tool are HIDDEN in challenges
 * and tests, so the student answers from memory. Study screens show everything.
 *
 * A screen that is an assessment wraps itself in <AssessmentScope>; ToolRail and the shell's
 * tools menu call useVisibleTools() and never learn why a tool is missing.
 */

import { createContext, useContext, type ReactNode } from "react";
import { TOOL_TABS, type TabDefinition } from "../routes";

/** Tools that carry reference data a test must not hand out. */
export const REFERENCE_TOOLS: ReadonlySet<string> = new Set(["periodic", "spectra"]);

const AssessmentContext = createContext(false);

export function AssessmentScope({ children, active = true }: { readonly children: ReactNode; readonly active?: boolean }) {
  return <AssessmentContext.Provider value={active}>{children}</AssessmentContext.Provider>;
}

export function useInAssessment(): boolean {
  return useContext(AssessmentContext);
}

export function visibleTools(assessment: boolean): readonly TabDefinition[] {
  return assessment ? TOOL_TABS.filter((t) => !REFERENCE_TOOLS.has(t.id)) : TOOL_TABS;
}

export function useVisibleTools(): readonly TabDefinition[] {
  return visibleTools(useInAssessment());
}
