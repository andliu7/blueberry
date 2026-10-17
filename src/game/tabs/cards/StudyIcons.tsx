/**
 * The cards tab's icons, drawn from flat shapes in the icon palette
 * (theme.css --ic-*): a face colour with its darker lip peeking out under it,
 * the same move as the tab bar's icons. Line glyphs (arrows, star, bin) use
 * currentColor so they take the button's ink.
 *
 * Every icon is decorative (aria-hidden); the button around it carries the
 * words.
 */

type IconProps = { readonly className?: string };

const box = (className?: string) => ({ viewBox: "0 0 32 32", className: className ?? "h-6 w-6", "aria-hidden": true as const });

/** Two stacked cards. */
export function FlashcardsIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <rect x="9" y="5" width="18" height="20" rx="4" fill="var(--ic-blue-lip)" />
      <rect x="9" y="4" width="18" height="19" rx="4" fill="var(--ic-blue)" />
      <rect x="5" y="9" width="18" height="20" rx="4" fill="var(--ic-purple-lip)" />
      <rect x="5" y="8" width="18" height="19" rx="4" fill="var(--ic-purple)" />
      <rect x="9" y="15" width="10" height="3" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** A loop of two arrows: cards that come back. */
export function LearnIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <circle cx="16" cy="17" r="12" fill="var(--ic-green-lip)" />
      <circle cx="16" cy="16" r="12" fill="var(--ic-green)" />
      <path d="M10 15a6 6 0 0 1 10.5-4M22 17a6 6 0 0 1-10.5 4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21.5 7.5v4h-4M10.5 24.5v-4h4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A sheet with ticks. */
export function TestIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <rect x="6" y="4" width="20" height="25" rx="4" fill="var(--ic-orange-lip)" />
      <rect x="6" y="3" width="20" height="24" rx="4" fill="var(--ic-orange)" />
      <path d="M10 11l2 2 3.5-4M10 19l2 2 3.5-4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="10" width="5" height="2.6" rx="1.3" fill="#fff" />
      <rect x="18" y="18" width="5" height="2.6" rx="1.3" fill="#fff" />
    </svg>
  );
}

/** Two tiles that fit together. */
export function MatchIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <rect x="3" y="7" width="13" height="19" rx="4" fill="var(--ic-red-lip)" />
      <rect x="3" y="6" width="13" height="18" rx="4" fill="var(--ic-red)" />
      <rect x="16" y="7" width="13" height="19" rx="4" fill="var(--ic-yellow-lip)" />
      <rect x="16" y="6" width="13" height="18" rx="4" fill="var(--ic-yellow)" />
      <circle cx="16" cy="15" r="3.4" fill="var(--ic-yellow)" />
    </svg>
  );
}

/** A pencil. */
export function WriteIcon({ className }: IconProps) {
  return (
    <svg {...box(className)}>
      <path d="M21 4.5l6.5 6.5L13 25.5 5 27l1.5-8z" fill="var(--ic-purple-lip)" />
      <path d="M21 3.5l6.5 6.5L13 24.5 5 26l1.5-8z" fill="var(--ic-purple)" />
      <path d="M6.5 18L5 26l8-1.5z" fill="var(--ic-skin)" />
      <path d="M5.6 22.4L5 26l3.6-.6z" fill="var(--ic-hair)" />
      <path d="M18 6.5l6.5 6.5" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

export function StarIcon({ filled, className }: IconProps & { readonly filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} aria-hidden="true">
      <path
        d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9L3.4 9.4l6-.7z"
        fill={filled ? "var(--ic-yellow)" : "none"}
        stroke={filled ? "var(--ic-yellow-lip)" : "currentColor"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowIcon({ direction, className }: IconProps & { readonly direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} aria-hidden="true">
      <path
        d={direction === "left" ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} aria-hidden="true">
      <path d="M15 5L8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShuffleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} aria-hidden="true">
      <path
        d="M3 7h3.5c4 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.6M13.6 9.6C14.7 8 15.9 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path
        d="M4 7h16M10 3.5h4M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-12.5M10 11v6M14 11v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} aria-hidden="true">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const MODE_ICONS = {
  flashcards: FlashcardsIcon,
  learn: LearnIcon,
  test: TestIcon,
  match: MatchIcon,
  write: WriteIcon,
} as const;
