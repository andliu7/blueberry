/**
 * Click the backdrop to close. One implementation, for every sheet in the app.
 *
 * THE BUG. Owner, 2026-09-05: "I should be able to click outside of the pop-up
 * and close pop-ups that slide up like that. For example, whenever I click the
 * course, it doesn't react if I click at the top of the screen where the pop-up
 * is not." Five surfaces call `showModal()` and only LanguagePicker handled it,
 * so four of them trapped a student who had opened a sheet by accident and
 * reached for the obvious way out. Escape works, but Escape is a keyboard and
 * the target device is a phone.
 *
 * WHY THIS WORKS. A modal `<dialog>` paints its backdrop with `::backdrop`,
 * which is not a separate element: a click anywhere on that backdrop has the
 * DIALOG ELEMENT ITSELF as its target, while a click on anything inside the
 * sheet has that child as its target. So the test is one identity comparison,
 * and it needs no overlay div, no capture-phase listener and no geometry.
 *
 * IT IS ONE HELPER RATHER THAN FIVE COPIES because the codebase's rule is that
 * an instruction has one authoritative home. The version that already worked
 * was four lines inside LanguagePicker, which is exactly the shape of thing
 * that gets copied four times and then drifts in three of them.
 *
 * WHY NOT `closedby="any"`. The platform grew a light-dismiss attribute for
 * this and it is the right long-term answer, but Safari is the target here
 * (CLAUDE.md: iOS first) and it cannot be relied on there yet. This works
 * everywhere and costs one comparison.
 *
 * THE ONE THING A CALLER MUST GET RIGHT: the dialog's own padding is part of
 * the dialog element, so a sheet with padding on the <dialog> closes when its
 * padding is clicked. Put padding on a child. Every sheet here already does.
 */

import type { MouseEvent, RefObject } from "react";

export function closeOnBackdrop<T extends HTMLElement>(
  ref: RefObject<HTMLDialogElement | null>,
  onClose: () => void,
): (event: MouseEvent<T>) => void {
  return (event: MouseEvent<T>) => {
    if (event.target === ref.current) onClose();
  };
}
