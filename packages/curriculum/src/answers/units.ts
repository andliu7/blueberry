/**
 * A small unit registry. Enough for the syllabus, and no more.
 *
 * Closed union plus typed record, the same construction as everything else here,
 * so a unit named in an authored answer that is not in the registry is a compile
 * error at authoring time rather than a grading surprise at 1am.
 *
 * WHY SYMBOL LOOKUP IS CASE SENSITIVE ONLY WHERE CASE CARRIES MEANING.
 *
 * "M" is molar and "m" is metre. A case insensitive symbol match on THAT pair
 * would quietly convert a concentration into a length, and a checker that does
 * that is worse than one that refuses, because it marks a right answer wrong
 * for a reason the student cannot see. But an adversary pass case-folded the
 * whole registry and found the m/M pair is the ONLY collision in it: "ATM",
 * "Torr", "KPA" and every other capitalisation collide with nothing, and
 * rejecting them spends the notation tier on a typo the registry did not need
 * to reject. So the rule is: exact symbol match first; then a case folded
 * match, honoured only when exactly one symbol folds to that key. The m/M
 * family stays exact-only by construction, because both fold to "m" and the
 * fold is therefore ambiguous. Word aliases such as "grams" or "atmospheres"
 * are matched case insensitively as before.
 *
 * WHY TEMPERATURE CARRIES AN OFFSET AND WHY THAT IS FLAGGED.
 *
 * Celsius to kelvin is affine, not a scaling. That makes it safe to convert a
 * temperature and unsafe to convert a temperature DIFFERENCE, and unsafe to use
 * a relative tolerance across the two: 1 percent of 25 degC and 1 percent of
 * 298.15 K are different sizes. `isAffine` is exported so a checker can say so
 * rather than discovering it in a fixture.
 */

export type Dimension =
  | "mass"
  | "amount"
  | "volume"
  | "pressure"
  | "temperature"
  | "energy"
  | "length"
  | "time"
  | "concentration"
  | "wavenumber";

export type UnitSymbol =
  // mass, base g
  | "g"
  | "kg"
  | "mg"
  // amount, base mol
  | "mol"
  | "mmol"
  // volume, base L
  | "L"
  | "mL"
  // pressure, base Pa
  | "Pa"
  | "kPa"
  | "atm"
  | "bar"
  | "torr"
  | "mmHg"
  // temperature, base K
  | "K"
  | "degC"
  // energy, base J
  | "J"
  | "kJ"
  | "cal"
  | "kcal"
  // length, base m
  | "m"
  | "cm"
  | "nm"
  | "pm"
  | "angstrom"
  // time, base s
  | "s"
  | "min"
  | "h"
  // concentration, base M
  | "M"
  | "mM"
  // wavenumber, base cm^-1
  | "cm^-1";

export interface UnitDefinition {
  readonly symbol: UnitSymbol;
  readonly dimension: Dimension;
  /** Multiply by this to reach the dimension's base unit. */
  readonly toBaseFactor: number;
  /** Add this AFTER scaling to reach the base unit. Only temperature uses it. */
  readonly toBaseOffset: number;
  /** Spelled out forms, matched case insensitively. Never single letters. */
  readonly aliases: readonly string[];
}

function unit(
  symbol: UnitSymbol,
  dimension: Dimension,
  toBaseFactor: number,
  aliases: readonly string[],
  toBaseOffset = 0,
): UnitDefinition {
  return Object.freeze({ symbol, dimension, toBaseFactor, toBaseOffset, aliases: Object.freeze([...aliases]) });
}

export const UNITS: Readonly<Record<UnitSymbol, UnitDefinition>> = Object.freeze({
  g: unit("g", "mass", 1, ["gram", "grams"]),
  kg: unit("kg", "mass", 1000, ["kilogram", "kilograms"]),
  mg: unit("mg", "mass", 0.001, ["milligram", "milligrams"]),

  mol: unit("mol", "amount", 1, ["mole", "moles"]),
  mmol: unit("mmol", "amount", 0.001, ["millimole", "millimoles"]),

  L: unit("L", "volume", 1, ["liter", "liters", "litre", "litres", "l"]),
  mL: unit("mL", "volume", 0.001, ["milliliter", "milliliters", "millilitre", "millilitres", "ml", "cm3", "cm^3"]),

  Pa: unit("Pa", "pressure", 1, ["pascal", "pascals"]),
  kPa: unit("kPa", "pressure", 1000, ["kilopascal", "kilopascals"]),
  atm: unit("atm", "pressure", 101325, ["atmosphere", "atmospheres"]),
  bar: unit("bar", "pressure", 100000, ["bars"]),
  torr: unit("torr", "pressure", 101325 / 760, ["torrs"]),
  mmHg: unit("mmHg", "pressure", 101325 / 760, ["millimeters of mercury", "millimetres of mercury"]),

  K: unit("K", "temperature", 1, ["kelvin", "kelvins"]),
  degC: unit("degC", "temperature", 1, ["celsius", "degrees celsius", "centigrade"], 273.15),

  J: unit("J", "energy", 1, ["joule", "joules"]),
  kJ: unit("kJ", "energy", 1000, ["kilojoule", "kilojoules"]),
  cal: unit("cal", "energy", 4.184, ["calorie", "calories"]),
  kcal: unit("kcal", "energy", 4184, ["kilocalorie", "kilocalories"]),

  m: unit("m", "length", 1, ["meter", "meters", "metre", "metres"]),
  cm: unit("cm", "length", 0.01, ["centimeter", "centimeters", "centimetre", "centimetres"]),
  nm: unit("nm", "length", 1e-9, ["nanometer", "nanometers", "nanometre", "nanometres"]),
  pm: unit("pm", "length", 1e-12, ["picometer", "picometers", "picometre", "picometres"]),
  angstrom: unit("angstrom", "length", 1e-10, ["angstroms"]),

  s: unit("s", "time", 1, ["second", "seconds", "sec"]),
  min: unit("min", "time", 60, ["minute", "minutes"]),
  h: unit("h", "time", 3600, ["hour", "hours", "hr"]),

  M: unit("M", "concentration", 1, ["molar"]),
  mM: unit("mM", "concentration", 0.001, ["millimolar"]),

  "cm^-1": unit("cm^-1", "wavenumber", 1, ["wavenumber", "wavenumbers", "reciprocal centimeters", "cm-1"]),
});

export function allUnitSymbols(): readonly UnitSymbol[] {
  return Object.keys(UNITS) as UnitSymbol[];
}

/** Throws on an unknown symbol. A miss here is a defect, not a data case. */
export function unitDefinition(symbol: UnitSymbol): UnitDefinition {
  const definition = UNITS[symbol];
  if (definition === undefined) {
    throw new Error(`Unknown unit symbol: ${String(symbol)}`);
  }
  return definition;
}

const ALIAS_INDEX: ReadonlyMap<string, UnitSymbol> = (() => {
  const index = new Map<string, UnitSymbol>();
  for (const symbol of allUnitSymbols()) {
    for (const alias of unitDefinition(symbol).aliases) {
      const key = alias.toLowerCase();
      const existing = index.get(key);
      if (existing !== undefined && existing !== symbol) {
        // Two units claiming one spelled out name would make resolution depend
        // on key order, which is not a thing a grader may depend on.
        throw new Error(`Unit alias "${alias}" is claimed by both ${existing} and ${symbol}`);
      }
      index.set(key, symbol);
    }
  }
  return index;
})();

/**
 * Case folded symbol lookup, holding only the keys exactly one symbol folds
 * to. "atm" is here; "m" is not, because both "m" and "M" fold to it and an
 * ambiguous fold must stay exact-only. See the file header.
 */
const UNAMBIGUOUS_FOLDED_SYMBOLS: ReadonlyMap<string, UnitSymbol> = (() => {
  const counts = new Map<string, UnitSymbol[]>();
  for (const symbol of Object.keys(UNITS) as UnitSymbol[]) {
    const key = symbol.toLowerCase();
    counts.set(key, [...(counts.get(key) ?? []), symbol]);
  }
  const index = new Map<string, UnitSymbol>();
  for (const [key, symbols] of counts) {
    const only = symbols[0];
    if (symbols.length === 1 && only !== undefined) index.set(key, only);
  }
  return index;
})();

/**
 * Text to unit. `null` means the registry does not know it.
 *
 * Never throws. This is on the grading path, where the input is a student's
 * typing and an unknown unit is an answer to report, not a crash.
 *
 * Resolution order: exact symbol, then spelled out alias, then a case folded
 * symbol where the fold is unambiguous. Order matters: "m" and "M" must hit
 * the exact branch, and they always do because both are registered symbols.
 */
export function resolveUnit(text: string): UnitSymbol | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (Object.prototype.hasOwnProperty.call(UNITS, trimmed)) {
    return trimmed as UnitSymbol;
  }
  const folded = trimmed.toLowerCase();
  return ALIAS_INDEX.get(folded) ?? UNAMBIGUOUS_FOLDED_SYMBOLS.get(folded) ?? null;
}

export function dimensionOf(symbol: UnitSymbol): Dimension {
  return unitDefinition(symbol).dimension;
}

export function sameDimension(a: UnitSymbol, b: UnitSymbol): boolean {
  return dimensionOf(a) === dimensionOf(b);
}

/** True when converting this unit involves an offset, so ratios do not survive it. */
export function isAffine(symbol: UnitSymbol): boolean {
  return unitDefinition(symbol).toBaseOffset !== 0;
}

/**
 * Convert between two units of the same dimension. `null` when they are not.
 *
 * Returning null rather than throwing, for the reason above: the caller is a
 * checker holding student input, and "you answered in grams and the question is
 * about volume" is a result to report.
 */
export function convert(value: number, from: UnitSymbol, to: UnitSymbol): number | null {
  const source = unitDefinition(from);
  const target = unitDefinition(to);
  if (source.dimension !== target.dimension) return null;
  const inBase = value * source.toBaseFactor + source.toBaseOffset;
  return (inBase - target.toBaseOffset) / target.toBaseFactor;
}
