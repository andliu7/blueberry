/**
 * The window's three lights, and the site's three card ratings.
 *
 * They are one list, not a coincidence of three circles. Every card gets rated
 * red, yellow or green while you study; the bar counts them across the whole
 * library, and the entry gate's system window draws the same three small and
 * dimmed in its header band because it is the same window, announcing itself
 * before the app behind it is open.
 *
 * In its own module rather than inside `window-chrome` because two components
 * now read it, and a shared constant living in a component file is exactly
 * what `react/only-export-components` is asking not to happen: it costs that
 * file its fast refresh.
 *
 * The dot values are the real macOS colours. A near miss on these reads as a
 * mistake rather than as a reference.
 */

export const LIGHTS = [
  {
    key: "red" as const,
    label: "Shaky",
    dot: "#ff5f57",
    text: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  {
    key: "yellow" as const,
    label: "Getting there",
    dot: "#febc2e",
    text: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-400",
  },
  {
    key: "green" as const,
    label: "Solid",
    dot: "#28c840",
    text: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
];

export type LightKey = (typeof LIGHTS)[number]["key"];
