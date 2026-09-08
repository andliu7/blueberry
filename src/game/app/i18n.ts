/**
 * The language a student reads the app in.
 *
 * WHAT THIS IS AND IS NOT, because the difference decides where the money
 * goes. This module carries the CHROME: the tab names, the buttons, the
 * headings, the encouragement. It does not carry chemistry. A prompt, a
 * reagent name, an authored explanation and every named cause stay in the
 * language they were authored in, and they are not run through `t()`, because
 * a mistranslated "periplanar" or a softened "strongly disfavored" teaches
 * wrong chemistry, and packages/feedback's copy was reviewed by a person in
 * one language. Translating content is a Phase 7 question with a server, a
 * cost and a review step; translating chrome is a table.
 *
 * THE TABLE IS ENGLISH ONLY TODAY, and that is deliberate rather than
 * unfinished. Wiring every shell string through `t()` now is the part that is
 * expensive to retrofit: a string typed inline in JSX is invisible to any
 * later extraction pass. Adding a second column is cheap once the calls exist.
 * The picker says so plainly rather than implying a translation that is not
 * there, per the voice contract: no promise the product cannot keep.
 *
 * The twelve are the most spoken languages by total speakers, which is the
 * list a student recognises; each carries its own endonym, because a language
 * list that names languages in English is a list for English speakers.
 */

export interface Language {
  /** BCP 47 primary subtag. Stored, and set on <html lang>. */
  readonly code: string;
  /** The name in the language itself. What a speaker looks for. */
  readonly endonym: string;
  /** The English name, small, for a student scanning an unfamiliar script. */
  readonly english: string;
  /** True when the script runs right to left, so the shell can set dir. */
  readonly rtl?: boolean;
}

export const LANGUAGES: readonly Language[] = Object.freeze([
  { code: "en", endonym: "English", english: "English" },
  { code: "zh", endonym: "中文", english: "Chinese" },
  { code: "hi", endonym: "हिन्दी", english: "Hindi" },
  { code: "es", endonym: "Español", english: "Spanish" },
  { code: "fr", endonym: "Français", english: "French" },
  { code: "ar", endonym: "العربية", english: "Arabic", rtl: true },
  { code: "bn", endonym: "বাংলা", english: "Bengali" },
  { code: "pt", endonym: "Português", english: "Portuguese" },
  { code: "ru", endonym: "Русский", english: "Russian" },
  { code: "ur", endonym: "اردو", english: "Urdu", rtl: true },
  { code: "ja", endonym: "日本語", english: "Japanese" },
  { code: "ko", endonym: "한국어", english: "Korean" },
]);

export function languageByCode(code: string): Language {
  return LANGUAGES.find((language) => language.code === code) ?? (LANGUAGES[0] as Language);
}

const STORAGE_KEY = "blueberry.language.v1";

/**
 * An external store, the same shape as progress.ts, so the shell reads it with
 * useSyncExternalStore and nothing here imports React.
 */
export interface LanguageStore {
  getSnapshot(): string;
  subscribe(listener: () => void): () => void;
  set(code: string): void;
}

function initial(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && LANGUAGES.some((language) => language.code === stored)) return stored;
  } catch {
    /* storage blocked: fall through to the browser's own preference */
  }
  // The browser already knows; asking a student to state it again on a device
  // that could have told us is a question we did not need to ask.
  const preferred = typeof navigator === "undefined" ? "en" : (navigator.language ?? "en").slice(0, 2);
  return LANGUAGES.some((language) => language.code === preferred) ? preferred : "en";
}

export function createLanguageStore(): LanguageStore {
  let code = initial();
  const listeners = new Set<() => void>();
  const apply = () => {
    const language = languageByCode(code);
    document.documentElement.lang = language.code;
    document.documentElement.dir = language.rtl === true ? "rtl" : "ltr";
  };
  apply();
  return {
    getSnapshot: () => code,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next) {
      if (!LANGUAGES.some((language) => language.code === next)) return;
      code = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage blocked: the choice lasts for the session */
      }
      apply();
      for (const listener of listeners) listener();
    },
  };
}

export const languageStore: LanguageStore = createLanguageStore();

/**
 * The shell's string table.
 *
 * One entry per user facing string in the chrome. `t` falls back to the key's
 * English when a language has no entry, which is every language today, so a
 * partially translated table degrades to English per string rather than
 * showing a blank or a key name.
 */
export type StringKey =
  | "tab.trainer"
  | "tab.pathway"
  | "tab.courses"
  | "tab.search"
  | "tab.leaderboards"
  | "tab.periodic"
  | "tab.chat"
  | "tab.messages"
  | "action.continue"
  | "action.check"
  | "action.startOver"
  | "action.showMore"
  | "action.showLess"
  | "action.skip"
  | "language.title"
  | "language.note"
  | "leaderboard.today"
  | "leaderboard.week"
  | "leaderboard.month";

const EN: Readonly<Record<StringKey, string>> = Object.freeze({
  "tab.trainer": "Mechanism Trainer",
  "tab.pathway": "Pathway",
  "tab.courses": "Courses",
  "tab.search": "Reaction search",
  "tab.leaderboards": "Leaderboards",
  "tab.periodic": "Periodic table",
  "tab.chat": "AI chat",
  "tab.messages": "Tutor messages",
  "action.continue": "Continue",
  "action.check": "Check the step",
  "action.startOver": "Start over",
  "action.showMore": "Show more",
  "action.showLess": "Show less",
  "action.skip": "Skip",
  "language.title": "Choose your language",
  "language.note":
    "This sets the app's buttons and menus. Lessons and chemistry stay in English for now, because a translation nobody has checked is worse than none.",
  "leaderboard.today": "Today",
  "leaderboard.week": "This week",
  "leaderboard.month": "This month",
});

/** Per language overrides. Empty until a translation has been reviewed. */
const TABLES: Readonly<Record<string, Partial<Record<StringKey, string>>>> = Object.freeze({
  en: EN,
});

export function translate(code: string, key: StringKey): string {
  return TABLES[code]?.[key] ?? EN[key];
}
