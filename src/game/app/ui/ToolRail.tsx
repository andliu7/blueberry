/**
 * The header tools: the periodic table and the reaction search, reachable from
 * every tab and from inside a lesson.
 *
 * WHY THESE TWO ARE NOT TABS. Owner amendment of 2026-08-28, and mobile-ui says
 * the same thing in one line: "tabs are DESTINATIONS. Tools you reach for mid
 * task (a lookup, a reference table, search) belong in the header or a sheet,
 * not a tab. That reframing usually collapses a six-tab argument into four."
 *
 * A student does not decide to go to the periodic table. They are three steps
 * into an EAS problem and want to check an electronegativity. A tab makes that
 * a departure: the lesson unmounts, the progress bar goes, and coming back is a
 * second decision. A sheet makes it a glance. So the tools moved UP into the
 * header rather than out of the product, which is why CLAUDE.md's "interactive,
 * always reachable" is better served here than it was by a tab: the tab was not
 * reachable from inside a lesson at all, and this is.
 *
 * BOTH ARE STILL ROUTES. #/periodic and #/search resolve exactly as before, so
 * a bookmark, a shared link and the back button all work, and the deep link
 * #/periodic/Br still selects bromine. The route is the fallback and the shared
 * link; the sheet is the normal way in.
 *
 * LAZY, BOTH OF THEM. The periodic table carries 118 elements of data and the
 * search carries the reaction database. Neither belongs in the entry chunk that
 * a student opening a mechanism downloads, and CLAUDE.md's rule is that a heavy
 * import sits behind React.lazy with a real loading state and never a blank
 * rectangle. The skeleton is that state.
 *
 * WHY A <dialog>. Modality, focus trapping, Escape to close and the top layer,
 * all from the platform. Hand rolling those is three bugs. Same call and the
 * same comment as LanguagePicker.tsx and Hud.tsx.
 *
 * THE BUTTONS CARRY AN OUTLINE, and that is a deliberate difference from the
 * readouts beside them. Sticker rule 3: an outline is what makes an element
 * read as a pressable cut-out. The HUD's numbers are readings and are flat; a
 * tool is an object you pick up, so it gets a border. The header's two halves
 * are then two different KINDS of thing rather than seven chips at one weight,
 * which is the finding the P3 round already paid for.
 */

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TOOL_TABS, hrefForTab, type ToolId } from "../routes";
import { TabIcon } from "./TabIcon";
import { TabSkeleton } from "./Skeleton";
import "./tools.css";
import { closeOnBackdrop } from "./dismiss";

const PeriodicTab = lazy(() => import("../../tabs/periodic/PeriodicTab"));
const SearchTab = lazy(() => import("../../tabs/search/SearchTab"));

/**
 * The two buttons. `size` is "regular" in the shell header and "compact" in a
 * lesson header, where the row also carries a leave control, a progress bar and
 * a counter; the target stays 44 in both, only the padding moves.
 */
export function ToolButtons({
  onOpen,
  className = "",
}: {
  readonly onOpen: (tool: ToolId) => void;
  readonly className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${className}`} role="group" aria-label="Tools">
      {TOOL_TABS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          data-tool={tool.id}
          onPointerDown={() => onOpen(tool.id as ToolId)}
          aria-haspopup="dialog"
          aria-label={`Open the ${tool.label.toLowerCase()}`}
          title={tool.label}
          // Full ink, not muted. Round one drew these at muted-foreground and
          // they read as two empty boxes beside a header of coloured readouts:
          // the outline said "pressable" and the pale glyph said "disabled",
          // which is two controls arguing with each other.
          className="press inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-bb-border bg-bb-card text-bb-foreground"
        >
          <TabIcon tab={tool.id} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}

/**
 * The sheet. One dialog for both tools, because only one can be open and two
 * dialogs would be two focus traps to keep straight.
 *
 * The header of the sheet carries the tool's name, a link to the tool's own
 * route ("Open as a page"), and a close. The link is not decoration: it is the
 * visible equivalent of the deep link, so a student who wants the table on a
 * screen of its own has a way there that is not typing a hash.
 */
export function ToolSheet({ tool, onClose }: { readonly tool: ToolId | null; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (tool !== null && !dialog.open) dialog.showModal();
    if (tool === null && dialog.open) dialog.close();
  }, [tool]);

  const definition = tool === null ? undefined : TOOL_TABS.find((entry) => entry.id === tool);

  return (
    <dialog
      ref={ref}
      data-tool-sheet={tool ?? "closed"}
      onClose={onClose}
      onClick={closeOnBackdrop(ref, onClose)}
      className="tool-sheet"
      aria-label={definition === undefined ? "Tools" : definition.label}
    >
      {tool === null || definition === undefined ? null : (
        <div className="tool-panel">
          <span className="tool-grabber" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2 className="title-face text-scale-lg font-semibold text-bb-foreground">{definition.label}</h2>
            <div className="flex items-center gap-1.5">
              <a
                href={hrefForTab(tool)}
                onPointerDown={onClose}
                className="press inline-flex min-h-11 items-center rounded-xl border-2 border-bb-border bg-bb-card px-3 text-scale-sm font-semibold text-bb-muted-foreground"
              >
                Open as a page
              </a>
              <button
                type="button"
                onPointerDown={onClose}
                aria-label="Close"
                className="press inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-bb-border bg-bb-card text-scale-lg text-bb-muted-foreground"
              >
                ×
              </button>
            </div>
          </div>
          <div className="tool-body">
            <Suspense fallback={<TabSkeleton label={definition.label} />}>
              {tool === "periodic" ? <PeriodicTab selected={null} /> : <SearchTab query="" />}
            </Suspense>
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * The pair, with the open state owned here. Drop this into any header.
 *
 * The shell uses it, and so does the lesson player, which is the half of "always
 * reachable" a tab could never satisfy.
 */
export function ToolRail({ className = "" }: { readonly className?: string }) {
  const [open, setOpen] = useState<ToolId | null>(null);
  return (
    <>
      <ToolButtons onOpen={setOpen} className={className} />
      <ToolSheet tool={open} onClose={() => setOpen(null)} />
    </>
  );
}
