/**
 * "Open now / Save for later" (owner, 20 Oct): the sheet a freshly earned
 * chest arrives in. Lazy, like the opening (ChestHost.tsx).
 *
 * Saving needs no code: the economy already holds the chest until it is
 * opened, so "Save for later" only closes the sheet, and the chest waits in
 * Me with the rest.
 */
import { useEffect, useRef } from "react";
import type { SavedChest } from "@blueberry/economy";
import { progress } from "../app/progress";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { Press } from "../app/ui/Press";
import { ChestArt } from "./ChestArt";
import { CHEST_COPY, dismissOffer, offerHeadline, openSaved, playChest } from "./chestFlow";
import "../charge/charge.css";

export default function ChestSheet({
  chests,
  reducedMotion,
}: {
  readonly chests: readonly SavedChest[];
  readonly reducedMotion: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal cannot be declared in JSX, so an effect opens the dialog once mounted.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog !== null && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
  }, []);

  const one = chests.length === 1;
  const first = chests[0]!;
  const ids = chests.map((chest) => chest.id);

  const openNow = () => {
    dismissOffer();
    playChest({
      detail: one ? `From your ${CHEST_COPY[first.source].title.toLowerCase()}` : `From ${chests.length} chests`,
      open: () => openSaved(progress, ids),
    });
  };

  return (
    <dialog
      ref={ref}
      className="charge-sheet chest-offer"
      data-motion={reducedMotion ? "reduced" : "full"}
      aria-labelledby="chest-offer-title"
      onClose={dismissOffer}
      onClick={closeOnBackdrop(ref, dismissOffer)}
    >
      <div className="charge-panel">
        <span className="charge-grabber" aria-hidden />
        <ChestArt className="chest-offer__art" />
        <h2 id="chest-offer-title" className="charge-headline">
          {offerHeadline(chests)}
        </h2>
        <p className="charge-line">{one ? CHEST_COPY[first.source].why : "Open them now, or keep them for later."}</p>
        <Press block size="lg" onClick={openNow} data-chest-offer="open">
          Open now
        </Press>
        <Press block variant="ghost" onClick={dismissOffer} data-chest-offer="save">
          Save for later
        </Press>
        <p className="charge-line">Saved chests wait in Me.</p>
      </div>
    </dialog>
  );
}
