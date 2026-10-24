/**
 * A pasted pKa sheet, read into the student's own values (STATUS C2: a pasted
 * sheet changes only that student's numbers).
 *
 * Three pure steps, so each one is tested on its own against messy pastes:
 *   parsePkaSheet     text to lines, each a name and ONE number, or a reason
 *   matchPkaSheet     names to rungs, through pkaAliases.json
 *   summarisePaste    what would change against the student's current table
 *
 * WHY IT REFUSES RATHER THAN GUESSES. A wrong number on a rung is worse than no
 * number: the student is marked against it. So a line with two numbers, a
 * range, a value off the ladder, or a name that is not a known alias is
 * reported back and applied nowhere, and two lines that put different numbers
 * on one rung leave that rung alone and say so.
 *
 * Imported only by PkaSettings.tsx, which is a lazy chunk. Never import this
 * from pka.ts: SortBeatView and the glossary pull that in.
 */

import { pkaEntry, type PkaSiteId } from "@blueberry/curriculum";
import { aliasIndex, isKnownNoRung, normaliseSpeciesName } from "./pkaAliases";
import { isStorablePka, pkaValueFor, type PkaSettingsSnapshot } from "./pka";

export type PasteProblem = "no_number" | "no_name" | "two_numbers" | "range" | "out_of_range";

export type PasteLine =
  | {
      readonly raw: string;
      readonly name: string;
      readonly value: number;
      /** Other text cells on the row (a formula, a conjugate base), tried as aliases in order. */
      readonly extras: readonly string[];
    }
  | { readonly raw: string; readonly problem: PasteProblem };

/* ------------------------------------------------------------------ */
/* Parse                                                                */
/* ------------------------------------------------------------------ */

const LIST_MARKER = /^\s*(?:\d+[.)]|[-*•])\s+/;
/** One number as a whole token: "4.76", "-7", "−7", "~16", "≈15.7". */
const NUMBER = /^(?:~|≈)?([-−]?\d+(?:\.\d+)?)$/;
/** The same with a comma decimal, allowed only where it cannot be a CSV comma. */
const NUMBER_COMMA = /^(?:~|≈)?([-−]?\d+(?:[.,]\d+)?)$/;
/** "15-16", "15–16" as one token. */
const RANGE_TOKEN = /^[-−]?\d+(?:\.\d+)?[-–—−]\d+(?:\.\d+)?$/;
const RANGE_JOINER = /^(?:-|–|—|−|to)$/i;
/** Tokens that sit between a name and its number without being either. */
const FILLER = /^(?:-|–|—|\||:|=|~|≈|about|approx\.?|approximately|ca\.?|pka|pka:|pka=)$/i;
/** Words a header row is made of, once "pKa" is taken out ("Acid  pKa", "Compound,pKa,Conjugate base"). */
const HEADER_WORDS = new Set([
  "acid", "acids", "compound", "compounds", "species", "name", "value", "values", "conjugate",
  "base", "bases", "structure", "formula", "functional", "group", "groups", "type", "table", "of", "and",
]);

/**
 * Cells: tabs when the row has any, otherwise commas, semicolons or runs of two
 * or more spaces. Double quotes protect a comma, as CSV does, and a comma with
 * a digit on each side is never a separator, so "1,3-dicarbonyl" stays whole.
 */
function splitCells(line: string): { cells: string[]; tabbed: boolean } {
  if (line.includes("\t")) {
    return { cells: line.split("\t").map(unquote), tabbed: true };
  }
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line.charAt(i);
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted) {
      const between = /\d/.test(line.charAt(i - 1)) && /\d/.test(line.charAt(i + 1));
      if ((ch === "," && !between) || ch === ";") {
        cells.push(current);
        current = "";
        continue;
      }
      if (ch === " " && line.charAt(i + 1) === " ") {
        cells.push(current);
        current = "";
        while (line.charAt(i + 1) === " ") i += 1;
        continue;
      }
    }
    current += ch;
  }
  cells.push(current);
  return { cells: cells.map(unquote), tabbed: false };
}

function unquote(cell: string): string {
  return cell.trim().replace(/^"(.*)"$/, "$1").trim();
}

function toNumber(text: string): number {
  return Number(text.replace("−", "-").replace(",", "."));
}

interface ReadRow {
  readonly chunks: string[];
  readonly values: number[];
  readonly range: boolean;
}

/** One row's text chunks and numbers. A chunk is a run of text tokens inside one cell. */
function readRow(line: string): ReadRow {
  // "pKa=4.8" and "water:15.7" read as a label, then a number.
  const spaced = line.replace(/\s*([=:])\s*(?=[-−~≈]?\d)/g, " $1 ");
  const { cells, tabbed } = splitCells(spaced);
  const chunks: string[] = [];
  const values: number[] = [];
  let range = false;

  for (const cell of cells) {
    if (cell === "") continue;
    const tokens = cell.split(/\s+/).filter((t) => t !== "");
    const wholeCell = tokens.length === 1;
    const pattern = tabbed || wholeCell ? NUMBER_COMMA : NUMBER;
    let text: string[] = [];
    const flush = () => {
      const chunk = stripFiller(text);
      if (chunk !== "") chunks.push(chunk);
      text = [];
    };
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i] ?? "";
      if (RANGE_TOKEN.test(token)) {
        range = true;
        continue;
      }
      const number = pattern.exec(token);
      if (number !== null) {
        // "15 to 16", "15 - 16": a number, a joiner, a number.
        const joiner = tokens[i + 1] ?? "";
        const after = tokens[i + 2] ?? "";
        if (RANGE_JOINER.test(joiner) && pattern.test(after)) {
          range = true;
          i += 2;
          continue;
        }
        flush();
        values.push(toNumber(number[1] ?? ""));
        continue;
      }
      text.push(token);
    }
    flush();
  }
  return { chunks, values, range };
}

/** Drop separators and "about" / "pKa =" words from the ends of a name. */
function stripFiller(tokens: readonly string[]): string {
  let start = 0;
  let end = tokens.length;
  while (start < end && FILLER.test(tokens[start] ?? "")) start += 1;
  while (end > start && FILLER.test(tokens[end - 1] ?? "")) end -= 1;
  return tokens.slice(start, end).join(" ");
}

function isHeader(chunks: readonly string[]): boolean {
  const words = chunks
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return false;
  return words.every((word) => word === "pka" || HEADER_WORDS.has(word));
}

export function parsePkaSheet(text: string): PasteLine[] {
  const out: PasteLine[] = [];
  /** A name with no number yet, waiting for a number-only line under it (a PDF copy). */
  let pending: { raw: string; name: string; extras: string[] } | null = null;

  const settle = () => {
    if (pending !== null) out.push({ raw: pending.raw, problem: "no_number" });
    pending = null;
  };

  for (const rawLine of text.split(/\r?\n|\r/)) {
    const raw = rawLine.trim();
    if (raw === "") continue;
    const row = readRow(raw.replace(LIST_MARKER, ""));
    const distinct = [...new Set(row.values)];

    if (row.chunks.length === 0 && distinct.length === 1 && !row.range && pending !== null) {
      const { raw: nameRaw, name, extras } = pending as { raw: string; name: string; extras: string[] };
      pending = null;
      const value = distinct[0] ?? Number.NaN;
      const joined = `${nameRaw} ${raw}`;
      out.push(isStorablePka(value) ? { raw: joined, name, value, extras } : { raw: joined, problem: "out_of_range" });
      continue;
    }

    if (row.values.length === 0 && !row.range) {
      settle();
      if (isHeader(row.chunks)) continue;
      pending = { raw, name: row.chunks[0] ?? "", extras: row.chunks.slice(1) };
      continue;
    }

    settle();
    if (row.range) {
      out.push({ raw, problem: "range" });
    } else if (distinct.length > 1) {
      out.push({ raw, problem: "two_numbers" });
    } else if (row.chunks.length === 0) {
      out.push({ raw, problem: "no_name" });
    } else {
      const value = distinct[0] ?? Number.NaN;
      out.push(
        isStorablePka(value)
          ? { raw, name: row.chunks[0] ?? "", value, extras: row.chunks.slice(1) }
          : { raw, problem: "out_of_range" },
      );
    }
  }
  settle();
  return out;
}

/* ------------------------------------------------------------------ */
/* Match                                                                */
/* ------------------------------------------------------------------ */

export interface PasteMatch {
  readonly matched: readonly { readonly siteId: PkaSiteId; readonly value: number; readonly raw: string }[];
  readonly noRung: readonly { readonly raw: string; readonly name: string }[];
  readonly unknown: readonly { readonly raw: string; readonly name: string }[];
  readonly rejected: readonly { readonly raw: string; readonly problem: PasteProblem }[];
  readonly conflicts: readonly {
    readonly siteId: PkaSiteId;
    readonly entries: readonly { readonly raw: string; readonly value: number }[];
  }[];
}

function lookup(name: string): PkaSiteId | undefined {
  return aliasIndex().get(normaliseSpeciesName(name));
}

/**
 * The rungs a line names. In order: the whole name; its parts split on "/" or
 * " or " (the course sheet prints "Hydronium / protonated alcohol" on one row,
 * and every part that matches gets the value); a parenthetical ("Ethanoic acid
 * (CH3COOH)"); then the row's other text cells.
 */
function rungsFor(name: string, extras: readonly string[]): PkaSiteId[] {
  const whole = lookup(name);
  if (whole !== undefined) return [whole];

  const parts = name.split(/\s*\/\s*|\s+or\s+/i).filter((part) => part.trim() !== "");
  if (parts.length > 1) {
    const found = [...new Set(parts.map(lookup).filter((id): id is PkaSiteId => id !== undefined))];
    if (found.length > 0) return found;
  }

  for (const inner of name.matchAll(/\(([^)]*)\)/g)) {
    const id = lookup(inner[1] ?? "");
    if (id !== undefined) return [id];
  }

  for (const extra of extras) {
    const id = lookup(extra);
    if (id !== undefined) return [id];
  }
  return [];
}

function namesNoRung(name: string, extras: readonly string[]): boolean {
  const parts = name.split(/\s*\/\s*|\s+or\s+/i);
  return [name, ...parts, ...extras].some((candidate) => isKnownNoRung(candidate));
}

export function matchPkaSheet(lines: readonly PasteLine[]): PasteMatch {
  const bySite = new Map<PkaSiteId, { raw: string; value: number }[]>();
  const noRung: { raw: string; name: string }[] = [];
  const unknown: { raw: string; name: string }[] = [];
  const rejected: { raw: string; problem: PasteProblem }[] = [];

  for (const line of lines) {
    if ("problem" in line) {
      rejected.push({ raw: line.raw, problem: line.problem });
      continue;
    }
    const rungs = rungsFor(line.name, line.extras);
    if (rungs.length === 0) {
      (namesNoRung(line.name, line.extras) ? noRung : unknown).push({ raw: line.raw, name: line.name });
      continue;
    }
    for (const siteId of rungs) {
      const list = bySite.get(siteId) ?? [];
      list.push({ raw: line.raw, value: line.value });
      bySite.set(siteId, list);
    }
  }

  const matched: { siteId: PkaSiteId; value: number; raw: string }[] = [];
  const conflicts: { siteId: PkaSiteId; entries: { raw: string; value: number }[] }[] = [];
  for (const [siteId, entries] of bySite) {
    const values = new Set(entries.map((entry) => entry.value));
    const first = entries[0];
    if (first === undefined) continue;
    // Identical duplicates collapse into one; different values touch nothing.
    if (values.size === 1) matched.push({ siteId, value: first.value, raw: first.raw });
    else conflicts.push({ siteId, entries });
  }
  return { matched, noRung, unknown, rejected, conflicts };
}

/* ------------------------------------------------------------------ */
/* Summarise                                                            */
/* ------------------------------------------------------------------ */

export interface PasteSummary {
  readonly changed: readonly { readonly siteId: PkaSiteId; readonly label: string; readonly from: number; readonly to: number }[];
  readonly unchanged: readonly { readonly siteId: PkaSiteId; readonly label: string; readonly value: number }[];
  readonly noRung: PasteMatch["noRung"];
  readonly unknown: PasteMatch["unknown"];
  readonly rejected: PasteMatch["rejected"];
  readonly conflicts: PasteMatch["conflicts"];
}

/**
 * What the paste would do to this student's table. `from` is the value they
 * see now (preset or their own); a value equal to it is "already the same" and
 * is not stored as an override, so a paste of the whole sheet does not pin
 * every rung against a later table switch.
 */
export function summarisePaste(settings: PkaSettingsSnapshot, match: PasteMatch): PasteSummary {
  const changed: { siteId: PkaSiteId; label: string; from: number; to: number }[] = [];
  const unchanged: { siteId: PkaSiteId; label: string; value: number }[] = [];
  for (const { siteId, value } of match.matched) {
    const label = pkaEntry(siteId).label;
    const from = pkaValueFor(settings, siteId);
    if (from === value) unchanged.push({ siteId, label, value });
    else changed.push({ siteId, label, from, to: value });
  }
  return {
    changed,
    unchanged,
    noRung: match.noRung,
    unknown: match.unknown,
    rejected: match.rejected,
    conflicts: match.conflicts,
  };
}

/** Changed rows as the store's batch write takes them. */
export function overridesFrom(summary: PasteSummary): Partial<Record<PkaSiteId, number>> {
  const out: Partial<Record<PkaSiteId, number>> = {};
  for (const row of summary.changed) out[row.siteId] = row.to;
  return out;
}
