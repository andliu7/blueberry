/**
 * The colour of the page ground behind the whole game, chosen by the student.
 *
 * WHY. The ground is the soft gradient in theme.css (`--bb-ground-top`,
 * `--bb-ground-bottom`, `--bb-ground-glow`): lavender at the top into a pale
 * blue. The owner asked (28 Oct) for a colour setting with a colour wheel,
 * with a deep blue option and the lavender kept.
 *
 * WHAT IT CHANGES. Only those three variables, and nothing that text sits on
 * as a colour of its own. The picked colour gives a HUE; the lightness and
 * saturation are fixed here, so no pick can make the muted text on the ground
 * fall under its contrast (theme.css measured 5.0:1 on the lightest stop). In
 * the light theme the ground stays pale (lightness 88 to 94); in the dark theme
 * it stays deep (lightness 10 to 17).
 *
 * "lavender" writes nothing at all: the page keeps exactly the theme.css values,
 * so the default is a no-op and a student who never opens this setting sees no
 * change. Same store shape as arrowStyle.ts and pka.ts.
 */

import { browserStorage, type SettingsStorage } from "./pka";

export type GroundPreset = "lavender" | "deepblue" | "custom";

export const GROUND_PRESETS: readonly GroundPreset[] = Object.freeze(["lavender", "deepblue", "custom"]);

export interface GroundChoice {
  readonly preset: GroundPreset;
  /** The picked colour, "#rrggbb". Read only when `preset` is "custom". */
  readonly custom: string;
}

/** Lavender stays the default until the owner decides (see the report). */
export const DEFAULT_GROUND: GroundChoice = Object.freeze({ preset: "lavender", custom: "#5a3fd8" });

export const GROUND_KEY = "blueberry.ground.v1";

/** The hue the "Deep blue" preset uses, degrees. */
export const DEEP_BLUE_HUE = 225;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Hue in degrees, 0 to 360, of a "#rrggbb" colour. A grey has no hue; it reads as the default blue-violet. */
export function hueOf(hex: string): number {
  if (!isHex(hex)) return 259;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.02) return 259;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) % 360 + 360) % 360);
}

export interface GroundStops {
  readonly top: string;
  readonly bottom: string;
  readonly glow: string;
}

const wrap = (h: number) => ((Math.round(h) % 360) + 360) % 360;

/** The three ground values for one hue, in the light theme and the dark one. */
export function groundFor(hue: number): { readonly light: GroundStops; readonly dark: GroundStops } {
  const h = wrap(hue);
  const low = wrap(h - 35);
  return {
    light: {
      top: `hsl(${h} 100% 93%)`,
      bottom: `hsl(${low} 100% 90%)`,
      glow: `hsl(${h} 100% 67% / 0.22)`,
    },
    dark: {
      top: `hsl(${h} 55% 17%)`,
      bottom: `hsl(${low} 60% 10%)`,
      glow: `hsl(${h} 65% 62% / 0.28)`,
    },
  };
}

/** The hue a choice stands for, or null for lavender (which writes nothing). */
export function hueForChoice(choice: GroundChoice): number | null {
  if (choice.preset === "deepblue") return DEEP_BLUE_HUE;
  if (choice.preset === "custom") return hueOf(choice.custom);
  return null;
}

/** The stylesheet text for a choice. Empty for lavender. */
export function groundCss(choice: GroundChoice): string {
  const hue = hueForChoice(choice);
  if (hue === null) return "";
  const { light, dark } = groundFor(hue);
  const block = (s: GroundStops) =>
    `--bb-ground-top:${s.top};--bb-ground-bottom:${s.bottom};--bb-ground-glow:${s.glow};`;
  // `html:root` outranks both `:root` and `.dark` in theme.css without !important.
  return `html:root{${block(light)}}html.dark:root{${block(dark)}}`;
}

function isPreset(value: unknown): value is GroundPreset {
  return typeof value === "string" && (GROUND_PRESETS as readonly string[]).includes(value);
}

function load(storage: SettingsStorage): GroundChoice {
  try {
    const raw = storage.getItem(GROUND_KEY);
    if (raw === null) return DEFAULT_GROUND;
    const parsed = JSON.parse(raw) as { preset?: unknown; custom?: unknown };
    return {
      preset: isPreset(parsed.preset) ? parsed.preset : DEFAULT_GROUND.preset,
      custom: isHex(parsed.custom) ? parsed.custom : DEFAULT_GROUND.custom,
    };
  } catch {
    return DEFAULT_GROUND;
  }
}

const STYLE_ID = "bb-ground-override";

/** Writes (or clears) the one style element. A no-op where there is no document. */
export function applyGround(choice: GroundChoice): void {
  if (typeof document === "undefined") return;
  const css = groundCss(choice);
  let el = document.getElementById(STYLE_ID);
  if (!css) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export interface GroundSource {
  getSnapshot(): GroundChoice;
  subscribe(listener: () => void): () => void;
  set(choice: GroundChoice): void;
}

export function createGround(storage: SettingsStorage = browserStorage()): GroundSource {
  let snapshot = load(storage);
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(choice) {
      if (!isPreset(choice.preset) || !isHex(choice.custom)) return;
      if (choice.preset === snapshot.preset && choice.custom === snapshot.custom) return;
      snapshot = { preset: choice.preset, custom: choice.custom };
      storage.setItem(GROUND_KEY, JSON.stringify(snapshot));
      applyGround(snapshot);
      for (const listener of listeners) listener();
    },
  };
}

/** One instance for the app. Importing this module paints the saved ground once. */
export const groundSetting: GroundSource = createGround();
applyGround(groundSetting.getSnapshot());
