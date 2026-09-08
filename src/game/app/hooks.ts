/**
 * The shell's shared hooks. Each is a custom hook, a function named use* that
 * composes React hooks so the same subscription logic is written once.
 */

import { useSyncExternalStore } from "react";
import { progress, type ProgressSnapshot } from "./progress";
import { languageStore } from "./i18n";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when the OS asks for reduced motion. Decided once here, passed down as props. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion);
}

/** The progress snapshot. Re-renders the caller when the store commits. */
export function useProgress(): ProgressSnapshot {
  return useSyncExternalStore(progress.subscribe, progress.getSnapshot);
}

/** The chosen language code. See i18n.ts for what it does and does not cover. */
export function useLanguage(): string {
  return useSyncExternalStore(languageStore.subscribe, languageStore.getSnapshot);
}

function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** The theme class on <html>, which the pre-paint script in index.html sets first. */
export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribeTheme, readTheme);
}

export function setTheme(theme: "light" | "dark"): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage blocked: the choice lasts for the session */
  }
}
