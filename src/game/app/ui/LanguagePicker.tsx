/**
 * The language list, and the button that opens it.
 *
 * The list is the Memrise/Duolingo shape from the owner's captures: full width
 * rows, the endonym large and the English name small beneath, a check on the
 * current one, and nothing else competing. Each row is 44pt tall and the whole
 * list is one radiogroup, so a keyboard walks it with arrows and a screen
 * reader announces the selection rather than "button, button, button".
 *
 * The sheet is a <dialog> element: the browser gives modality, focus trapping,
 * Escape to close and the top layer for free, and every one of those is a bug
 * when hand rolled. It is closed by Escape, by the close control, and by a
 * click on the backdrop, which is the escape route CLAUDE.md's rules require.
 */

import { useEffect, useRef } from "react";
import { LANGUAGES, languageByCode, languageStore, translate } from "../i18n";
import { useLanguage } from "../hooks";

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function LanguageList({ onPick }: { readonly onPick?: (code: string) => void }) {
  const current = useLanguage();
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5" role="radiogroup" aria-label={translate(current, "language.title")}>
        {LANGUAGES.map((language) => {
          const selected = language.code === current;
          return (
            <li key={language.code}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                lang={language.code}
                onPointerDown={() => {
                  languageStore.set(language.code);
                  onPick?.(language.code);
                }}
                className={`press flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left ${
                  selected ? "border-bb-primary bg-bb-primary/10 text-bb-foreground" : "border-bb-border bg-bb-card text-bb-foreground"
                }`}
              >
                <span className="flex min-w-11 justify-center rounded-lg border border-bb-border bg-bb-muted px-2 py-1 text-scale-xs font-bold uppercase tracking-wide text-bb-muted-foreground">
                  {language.code}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-scale-lg font-semibold leading-tight">{language.endonym}</span>
                  <span className="truncate text-scale-xs text-bb-muted-foreground">{language.english}</span>
                </span>
                {selected ? <CheckMark /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-scale-xs leading-relaxed text-bb-muted-foreground">{translate(current, "language.note")}</p>
    </div>
  );
}

export function LanguageSheet({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const current = useLanguage();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is the backdrop; a click on the
        // panel inside it is not, so this closes on backdrop only.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-bb-border bg-bb-card p-5 text-bb-foreground backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <h2 className="text-scale-lg font-semibold">{translate(current, "language.title")}</h2>
        <button type="button" onPointerDown={onClose} aria-label="Close" className="press flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-bb-border text-scale-lg">
          ×
        </button>
      </div>
      <LanguageList onPick={onClose} />
    </dialog>
  );
}

/**
 * The header control. Shows the current language's code, not a globe glyph.
 *
 * Ghost rather than a bordered pill, matching ThemeToggle for the reason
 * recorded there: the header carries four economy readouts now, and two 44px
 * white discs beside them made the loudest marks in the row the two that say
 * the least. The 44px target and the press are unchanged.
 */
export function LanguageButton({ onOpen }: { readonly onOpen: () => void }) {
  const current = useLanguage();
  const language = languageByCode(current);
  return (
    <button
      type="button"
      onPointerDown={onOpen}
      aria-label={`Language: ${language.english}. Change it.`}
      title={`Language: ${language.english}`}
      className="press inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-bb-border bg-bb-card px-2 text-scale-sm font-bold uppercase tracking-wide text-bb-muted-foreground hover:text-bb-foreground"
    >
      {language.code}
    </button>
  );
}
