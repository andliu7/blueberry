/**
 * The names a pasted pKa sheet may use for each rung (STATUS C2).
 *
 * The data lives in pkaAliases.json so scripts/check_pka_aliases.py can read
 * the SAME list with RDKit and check every SMILES against its rung's SMARTS.
 * This file only gives it types and the one name normaliser both sides of a
 * lookup go through.
 *
 * WHAT IS ON PURPOSE MISSING. Substituted compounds (TFA, p-nitrophenol,
 * benzoic acid) are never aliases: their pKa is not the rung's value, and
 * matching them would quietly put a wrong number on the rung. A student whose
 * sheet lists them gets "no match" and can set the rung by hand.
 *
 * Pure data and string work: no React, and nothing from the curriculum beyond
 * the `PkaSiteId` type, so it costs nothing where it is imported.
 */

import type { PkaSiteId } from "@blueberry/curriculum";
import data from "./pkaAliases.json";

export interface AliasEntry {
  readonly name: string;
  /** The parent compound, checked by RDKit against the rung's SMARTS. */
  readonly smiles?: string;
}

export const PKA_ALIASES = data.aliases as unknown as Readonly<Record<PkaSiteId, readonly AliasEntry[]>>;

/** The rung patterns the RDKit check uses. Exported for the test that keys line up. */
export const PKA_RUNG_SMARTS = data.rungSmarts as unknown as Readonly<Record<PkaSiteId, string>>;

/**
 * Species the course sheet prints that have no rung on Blueberry's ladder yet
 * (the HX acids, HCN, carbocations, amides), keyed by the site deck row that
 * prints each one (DeckItem.pkaSheetId). A pasted value for one is kept for
 * that deck row only (pkaSheet.ts); lessons have no rung to use it on.
 */
export const PKA_SHEET_ALIASES = data.sheetRows as unknown as Readonly<Record<string, readonly AliasEntry[]>>;

/** The row patterns the RDKit check uses for those species. */
export const PKA_SHEET_SMARTS = data.sheetSmarts as unknown as Readonly<Record<string, string>>;

/**
 * Every name in PKA_SHEET_ALIASES. They get their own message rather than
 * "unknown", because the student typed a real thing correctly.
 */
export const PKA_KNOWN_NO_RUNG: readonly string[] = Object.values(PKA_SHEET_ALIASES).flatMap((entries) =>
  entries.map((entry) => entry.name),
);

const SUBSCRIPTS: Readonly<Record<string, string>> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-",
};

/** Words that trail a species name on a sheet without changing which rung it is. */
const TRAILING = /\s+(?:proton|protons|hydrogen|o-h|c-h|n-h)$/;

/**
 * One spelling per species, so "H₂O", "h2o" and "Water (H2O):" compare equal
 * to their alias.
 *
 * Lowercase; subscript and superscript digits to ASCII; the minus sign and the
 * en and em dashes to a hyphen; "β" to "beta"; drop quotes, a parenthetical, a
 * trailing "pKa", ":" or "="; collapse whitespace; drop a leading "the" and a
 * trailing "proton", "O-H", "C-H" or "N-H".
 */
export function normaliseSpeciesName(raw: string): string {
  let name = raw
    .replace(/[₀-₉⁰-⁹⁺⁻]/g, (ch) => SUBSCRIPTS[ch] ?? ch)
    .replace(/[‐-―−]/g, "-")
    .replace(/β/g, "beta")
    .replace(/α/g, "alpha")
    .toLowerCase()
    .replace(/["'‘’“”]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Trailing punctuation and a "pKa" label, in any order ("water pKa:", "water:").
  for (;;) {
    const next = name.replace(/\s*(?:[:=.*]|pka)$/, "").trim();
    if (next === name) break;
    name = next;
  }
  name = name.replace(/^the\s+/, "");
  name = name.replace(TRAILING, "").trim();
  return name;
}

/** Normalised name to rung. Built once; a collision is a test failure, not a runtime choice. */
let index: Map<string, PkaSiteId> | null = null;

export function aliasIndex(): ReadonlyMap<string, PkaSiteId> {
  if (index !== null) return index;
  index = new Map();
  for (const [site, entries] of Object.entries(PKA_ALIASES) as [PkaSiteId, readonly AliasEntry[]][]) {
    for (const entry of entries) index.set(normaliseSpeciesName(entry.name), site);
  }
  return index;
}

/** Normalised name to sheet row, for the species with no rung. */
let sheet: Map<string, string> | null = null;

export function sheetIndex(): ReadonlyMap<string, string> {
  if (sheet !== null) return sheet;
  sheet = new Map();
  for (const [row, entries] of Object.entries(PKA_SHEET_ALIASES)) {
    for (const entry of entries) sheet.set(normaliseSpeciesName(entry.name), row);
  }
  return sheet;
}

export function isKnownNoRung(name: string): boolean {
  return sheetIndex().has(normaliseSpeciesName(name));
}
