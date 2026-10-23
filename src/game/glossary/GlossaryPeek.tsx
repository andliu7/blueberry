/**
 * The glossary entry for one name on a card, in a bottom sheet (owner item
 * 14). Opened by the info icon beside a molecule in the Cards tab
 * (tabs/cards/MoleculeInfo.tsx).
 *
 * Lazy: MoleculeInfo.tsx loads this file with React.lazy on the first tap, so
 * the glossary's data (the RDKit drawings in glossary.generated.ts) never
 * rides along with the Cards tab.
 *
 * It draws the entry with the glossary page's own EntryCard, so a compound
 * looks the same here and there, and links to the full entry on the page.
 * Escape, the backdrop and the Close button all close it.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { hrefForGlossary } from "../app/routes";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { pkaSettings } from "../settings/pka";
import { EntryCard } from "./GlossaryPage";
import { glossaryEntries } from "./glossaryModel";

export default function GlossaryPeek({
  entryId,
  reducedMotion,
  onClose,
}: {
  readonly entryId: string;
  readonly reducedMotion: boolean;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // useSyncExternalStore reads the pKa settings store, the same one the glossary page reads.
  const settings = useSyncExternalStore(pkaSettings.subscribe, pkaSettings.getSnapshot, pkaSettings.getSnapshot);
  // useMemo builds the entry list once per settings change, not on every render.
  const entry = useMemo(() => glossaryEntries(settings, []).find((item) => item.id === entryId) ?? null, [settings, entryId]);

  // showModal cannot be declared in JSX, so an effect opens the dialog once it
  // is in the page. The cleanup hands focus back to the info icon that opened it.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => opener?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      className="ct-peek"
      data-motion={reducedMotion ? "reduced" : "full"}
      aria-label={entry === null ? "Glossary" : "Glossary entry"}
      onClose={onClose}
      onClick={closeOnBackdrop(ref, onClose)}
    >
      <div className="ct-peek__panel">
        <span className="ct-peek__grabber" aria-hidden="true" />
        {entry === null ? (
          <p className="ct-peek__missing">This name is not in the glossary yet.</p>
        ) : (
          <EntryCard entry={entry} focused={false} />
        )}
        <div className="ct-peek__actions">
          <a className="ct-btn ct-btn--outline" href={hrefForGlossary(entry === null ? undefined : entryId)}>
            Open the glossary
          </a>
          <button type="button" className="ct-btn ct-btn--go" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
