/**
 * The info icon beside a molecule's name on a card, and the sheet it opens
 * (owner item 14). Tapping the icon shows that compound's or reagent's
 * glossary entry: its structure, what each part of the name means, and the
 * EWG / EDG note when it has one.
 *
 * Small and in the Cards tab's own chunk. The glossary itself (GlossaryPeek
 * and the data behind it) is a separate chunk that loads on the first tap.
 */
import { lazy, Suspense, type MouseEvent } from "react";

// React.lazy: the glossary data loads on the first tap, not with the Cards tab.
const GlossaryPeek = lazy(() => import("../../glossary/GlossaryPeek"));

export function InfoButton({
  label,
  entryId,
  onOpen,
}: {
  readonly label: string;
  readonly entryId: string;
  readonly onOpen: (entryId: string) => void;
}) {
  return (
    <button
      type="button"
      className="ct-info"
      aria-label={`About ${label}`}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        // The card row or tile around the icon may react to a tap; this tap is only for the icon.
        event.stopPropagation();
        onOpen(entryId);
      }}
    >
      <InfoIcon />
    </button>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="ct-info__icon" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10" cy="6.2" r="1.25" fill="currentColor" />
      <path d="M10 9.2v5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The same, written out as a chip with the name in it. Flashcards shows a row
 * of these under the card, since nothing can be pressed inside the flip button.
 */
export function InfoChip({
  label,
  entryId,
  onOpen,
}: {
  readonly label: string;
  readonly entryId: string;
  readonly onOpen: (entryId: string) => void;
}) {
  return (
    <button type="button" className="ct-info-chip" aria-label={`About ${label}`} onClick={() => onOpen(entryId)}>
      <span>{label}</span>
      <InfoIcon />
    </button>
  );
}

/**
 * Mounts the sheet while an entry is open. The open entry lives with the
 * caller (DeckSet), so one sheet serves every study mode.
 */
export function GlossaryPeekHost({
  entryId,
  reducedMotion,
  onClose,
}: {
  readonly entryId: string | null;
  readonly reducedMotion: boolean;
  readonly onClose: () => void;
}) {
  if (entryId === null) return null;
  return (
    // Suspense shows nothing while the glossary chunk downloads, then the sheet.
    <Suspense fallback={null}>
      <GlossaryPeek entryId={entryId} reducedMotion={reducedMotion} onClose={onClose} />
    </Suspense>
  );
}
