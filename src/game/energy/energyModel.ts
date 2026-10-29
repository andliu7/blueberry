/**
 * Energy diagrams and equilibrium, as pure functions (29 Oct 2026, energy-keq piece).
 *
 * The owner's teaching rules, which this file turns into arithmetic so the pool, the lab and
 * the tests can never disagree with each other:
 *
 *   1. A step whose Keq is between 1e-7 and 1e7 runs BOTH ways. The window is about 9.5
 *      kcal/mol of energy difference at room temperature.
 *   2. A reversible step can lead to a DEAD END: a state with no way on except back.
 *   3. Once an IRREVERSIBLE step (Keq outside the window, downhill) is taken, the reaction
 *      follows that path down the graph and does not come back.
 *   4. When two products are reachable, the lowest hump wins if the steps cannot be undone
 *      (kinetic control); the deepest well wins if they can (thermodynamic control).
 *
 * Energies are kcal/mol, free energy, read straight off a diagram. 298 K. The numbers are
 * class estimates, taught to be read by eye, so nothing here promises more than two figures.
 * No wall clock, no DOM, no React.
 */

/** RT at 298.15 K in kcal/mol. */
export const RT_KCAL = 0.5925;
/** kcal/mol per factor of ten in Keq (or in rate): RT ln 10, about 1.364. */
export const KCAL_PER_DECADE = RT_KCAL * Math.LN10;
/** The owner's window: a step is reversible when Keq is inside [1e-7, 1e7]. */
export const KEQ_REVERSIBLE_MIN = 1e-7;
export const KEQ_REVERSIBLE_MAX = 1e7;
/** The same window as an energy gap, about 9.55 kcal/mol. */
export const REVERSIBLE_WINDOW_KCAL = 7 * KCAL_PER_DECADE;

/** Keq from the free energy of the products minus the reactants (kcal/mol). Downhill is a big Keq. */
export function keqFromDeltaG(deltaG: number): number {
  return 10 ** (-deltaG / KCAL_PER_DECADE);
}

export function deltaGFromKeq(keq: number): number {
  return -KCAL_PER_DECADE * Math.log10(keq);
}

/** Keq from two pKa values: the acid formed minus the acid used up, ten to that gap. */
export function keqFromPkas(acidFormedPka: number, acidConsumedPka: number): number {
  return 10 ** (acidFormedPka - acidConsumedPka);
}

export type KeqClass = "one-way-forward" | "reversible" | "one-way-back";

export function classifyKeq(keq: number): KeqClass {
  if (keq > KEQ_REVERSIBLE_MAX) return "one-way-forward";
  if (keq < KEQ_REVERSIBLE_MIN) return "one-way-back";
  return "reversible";
}

/** How many times faster the lower barrier is: a gap of 1.364 kcal/mol is a factor of ten. */
export function rateRatio(barrierGap: number): number {
  return 10 ** (Math.abs(barrierGap) / KCAL_PER_DECADE);
}

/**
 * Keq written the way an exam answer is: two figures and a power of ten, "2.0 x 10^9".
 * Returns the parts so a view can set the exponent as a superscript.
 */
export function sciParts(value: number): { readonly mantissa: string; readonly exponent: number } {
  if (!(value > 0) || !Number.isFinite(value)) return { mantissa: "0", exponent: 0 };
  let exponent = Math.floor(Math.log10(value));
  let mantissa = value / 10 ** exponent;
  if (Number(mantissa.toFixed(1)) >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  return { mantissa: mantissa.toFixed(1), exponent };
}

const SUPERSCRIPT: Readonly<Record<string, string>> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

/** Plain-text form for answer buttons, "2.0 × 10⁹". */
export function sciText(value: number): string {
  const { mantissa, exponent } = sciParts(value);
  return `${mantissa} × 10${String(exponent).split("").map((c) => SUPERSCRIPT[c] ?? c).join("")}`;
}

/* ------------------------------------------------------------------ */
/* Profiles: the diagram as data                                         */
/* ------------------------------------------------------------------ */

export interface EnergyState {
  readonly id: string;
  readonly label: string;
  /** Free energy, kcal/mol, on any shared zero. */
  readonly energy: number;
}

/** One path through the diagram: states in order, and the transition state energy between each pair. */
export interface EnergyProfile {
  readonly states: readonly EnergyState[];
  /** `ts[i]` is the top of the hump between `states[i]` and `states[i + 1]`, absolute. */
  readonly ts: readonly number[];
}

export function profileIsValid(profile: EnergyProfile): boolean {
  if (profile.states.length < 2 || profile.ts.length !== profile.states.length - 1) return false;
  return profile.ts.every((top, i) => top >= Math.max(profile.states[i]!.energy, profile.states[i + 1]!.energy));
}

/** Forward barrier of step i: transition state minus the state it leaves. */
export function forwardBarrier(profile: EnergyProfile, step: number): number {
  return profile.ts[step]! - profile.states[step]!.energy;
}

export function reverseBarrier(profile: EnergyProfile, step: number): number {
  return profile.ts[step]! - profile.states[step + 1]!.energy;
}

export function stepDeltaG(profile: EnergyProfile, step: number): number {
  return profile.states[step + 1]!.energy - profile.states[step]!.energy;
}

export function stepKeq(profile: EnergyProfile, step: number): number {
  return keqFromDeltaG(stepDeltaG(profile, step));
}

/** A single step with the given product energy and forward barrier (reactant at zero). */
export function singleStep(productEnergy: number, forward: number): EnergyProfile {
  const top = Math.max(0, productEnergy) + Math.max(forward - Math.max(0, productEnergy), 0.5);
  return {
    states: [
      { id: "R", label: "Reactant", energy: 0 },
      { id: "P", label: "Product", energy: productEnergy },
    ],
    ts: [Math.max(top, forward)],
  };
}

/* ------------------------------------------------------------------ */
/* The walk: where does the reaction end up                              */
/* ------------------------------------------------------------------ */

interface Edge {
  readonly from: string;
  readonly to: string;
  /** Top of the hump, absolute. */
  readonly ts: number;
}

export interface Sink {
  /** The states the reaction can still shuffle between at the bottom. */
  readonly members: readonly string[];
  /** Where it mostly sits: the lowest member. */
  readonly resting: string;
  /** The lowest hump on the way in from the reversible pool, absolute, or null when it starts there. */
  readonly entryTs: number | null;
}

export interface WalkResult {
  /** Every state the reaction can reach from the start. */
  readonly reachable: readonly string[];
  /** The start and everything it can get back from: the states that run both ways. */
  readonly pool: readonly string[];
  /** Reversible side branches with no way on: reached, and only left by going back. */
  readonly deadEnds: readonly string[];
  /** Places it can end: sets with no way down and out. */
  readonly sinks: readonly Sink[];
  /** The sink the lowest hump leads to, which wins when steps cannot be undone. */
  readonly kinetic: Sink;
  /** The sink with the deepest well, which wins when steps can be undone. */
  readonly thermodynamic: Sink;
}

function edgesOf(profiles: readonly EnergyProfile[]): { energy: Map<string, number>; edges: Edge[] } {
  const energy = new Map<string, number>();
  const edges: Edge[] = [];
  for (const profile of profiles) {
    profile.states.forEach((s) => energy.set(s.id, s.energy));
    profile.ts.forEach((ts, i) => edges.push({ from: profile.states[i]!.id, to: profile.states[i + 1]!.id, ts }));
  }
  return { energy, edges };
}

/**
 * Can the reaction go from `a` to `b` along this step? Downhill always can. Uphill can only while
 * the climb stays inside the reversible window; past it the reverse step never happens.
 */
function canTraverse(energy: Map<string, number>, a: string, b: string): boolean {
  return energy.get(b)! - energy.get(a)! <= REVERSIBLE_WINDOW_KCAL + 1e-9;
}

/**
 * Walk one or more profiles that share state ids (two products off one reactant share the reactant's id).
 * Pure graph reasoning over the owner's rules: see the header.
 */
export function walk(profiles: readonly EnergyProfile[], startId: string): WalkResult {
  const { energy, edges } = edgesOf(profiles);
  const moves = new Map<string, Edge[]>();
  const add = (from: string, edge: Edge) => moves.set(from, [...(moves.get(from) ?? []), edge]);
  for (const e of edges) {
    if (canTraverse(energy, e.from, e.to)) add(e.from, e);
    if (canTraverse(energy, e.to, e.from)) add(e.to, { from: e.to, to: e.from, ts: e.ts });
  }
  const reach = (from: string): Set<string> => {
    const seen = new Set<string>([from]);
    const queue = [from];
    while (queue.length > 0) {
      const at = queue.pop()!;
      for (const m of moves.get(at) ?? []) if (!seen.has(m.to)) { seen.add(m.to); queue.push(m.to); }
    }
    return seen;
  };
  const reachFrom = new Map<string, Set<string>>();
  for (const id of energy.keys()) reachFrom.set(id, reach(id));
  const reachable = [...reachFrom.get(startId)!];
  const classOf = (id: string): string[] => reachable.filter((o) => reachFrom.get(id)!.has(o) && reachFrom.get(o)!.has(id)).sort();
  const classes = new Map<string, string[]>();
  for (const id of reachable) classes.set(id, classOf(id));
  const uniqueClasses = new Map<string, string[]>();
  for (const members of classes.values()) uniqueClasses.set(members.join("|"), members);

  const terminal = [...uniqueClasses.values()].filter((members) =>
    members.every((id) => [...reachFrom.get(id)!].every((o) => members.includes(o))),
  );
  const poolMembers = classes.get(startId)!;
  const poolIsTerminal = terminal.some((members) => members.join("|") === poolMembers.join("|"));

  const lowest = (ids: readonly string[]) => ids.reduce((a, b) => (energy.get(b)! < energy.get(a)! ? b : a));
  const poolLow = lowest(poolMembers);
  const entryTsFor = (members: readonly string[]): number | null => {
    if (members.includes(startId)) return null;
    let best: number | null = null;
    for (const from of poolMembers) {
      for (const m of moves.get(from) ?? []) {
        if (members.includes(m.to) && (best === null || m.ts < best)) best = m.ts;
      }
    }
    return best;
  };
  const sinks: Sink[] = terminal.map((members) => ({ members, resting: lowest(members), entryTs: entryTsFor(members) }));

  // A dead end hangs off the pool by one step and offers no way on.
  const deadEnds: string[] = [];
  if (!poolIsTerminal) {
    for (const id of reachable) {
      if (id === startId || poolMembers.includes(id) === false) continue;
      const degree = edges.filter((e) => e.from === id || e.to === id).length;
      if (degree === 1) deadEnds.push(id);
    }
  } else {
    for (const id of reachable) {
      if (id === startId) continue;
      const degree = edges.filter((e) => e.from === id || e.to === id).length;
      if (degree === 1 && id !== poolLow) deadEnds.push(id);
    }
  }

  const byBarrier = [...sinks].sort((a, b) => (a.entryTs ?? -Infinity) - (b.entryTs ?? -Infinity));
  const byDepth = [...sinks].sort((a, b) => energy.get(a.resting)! - energy.get(b.resting)!);
  return {
    reachable,
    pool: poolMembers,
    deadEnds,
    sinks,
    kinetic: byBarrier[0]!,
    thermodynamic: byDepth[0]!,
  };
}

/* ------------------------------------------------------------------ */
/* The lab scenarios, shared by the interactive diagram and the pool     */
/* ------------------------------------------------------------------ */

export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly profiles: readonly EnergyProfile[];
  readonly startId: string;
  /** The states the ball visits when the student presses Step, in order. */
  readonly route: readonly string[];
  /** What each press of Step says, one line per route entry after the first. */
  readonly say: readonly string[];
  /** One sentence for the end: what the student should now be able to state. */
  readonly takeaway: string;
}

const s = (id: string, label: string, energy: number): EnergyState => ({ id, label, energy });

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "dead-end",
    title: "A reversible step into a dead end",
    profiles: [
      { states: [s("A", "A", 0), s("B", "B", 4), s("C", "C", -16)], ts: [10, 6] },
    ].map((p) => p as EnergyProfile),
    startId: "A",
    route: ["A", "B", "A", "B", "C"],
    say: [
      "A to B costs 4 kcal/mol, far inside the window, so the step runs both ways.",
      "B has nothing ahead of it but a tall hump. It goes back to A. That is a dead end, and it costs nothing but time.",
      "A tries again. Each trip across the first hump is a fresh chance to find a way on.",
      "From B the step to C drops 20 kcal/mol, outside the window. Keq is near 10¹⁴, so it never reverses.",
    ],
    takeaway: "Reversible steps shuffle back and forth. The first irreversible step is a one-way door, and the reaction ends up on its far side.",
  },
  {
    id: "one-way",
    title: "Once irreversible, down the graph",
    profiles: [
      { states: [s("R", "Reactant", 0), s("I", "Intermediate", -3), s("P", "Product", -22)], ts: [8, 5] },
    ].map((p) => p as EnergyProfile),
    startId: "R",
    route: ["R", "I", "P"],
    say: [
      "R to I drops only 3 kcal/mol. Keq is about 10², inside the window, so I can slip back to R.",
      "I to P drops 19 kcal/mol. Keq is about 10¹⁴, outside the window. P does not come back.",
    ],
    takeaway: "Follow the path down. Wherever a step falls past the window, the reaction does not return up it.",
  },
  {
    id: "control",
    title: "Kinetic or thermodynamic product",
    profiles: [
      { states: [s("A", "Reactant", 0), s("K", "Kinetic product", -12)], ts: [8] },
      { states: [s("A", "Reactant", 0), s("T", "Thermodynamic product", -20)], ts: [14] },
    ].map((p) => p as EnergyProfile),
    startId: "A",
    route: ["A", "K"],
    say: ["Both products fall past the window, so neither step reverses. The lower hump, 8 against 14, is crossed far more often, so K forms and stays."],
    takeaway: "Cold, with steps that cannot be undone: the lower hump wins (kinetic). Warm, with steps that can: the deeper well wins (thermodynamic).",
  },
  {
    id: "control-warm",
    title: "The same reaction, warm and reversible",
    profiles: [
      { states: [s("A", "Reactant", 0), s("K", "Kinetic product", -6)], ts: [8] },
      { states: [s("A", "Reactant", 0), s("T", "Thermodynamic product", -8)], ts: [14] },
    ].map((p) => p as EnergyProfile),
    startId: "A",
    route: ["A", "K", "A", "T"],
    say: [
      "K forms first, as before, and A to K drops only 6, inside the window.",
      "So K can climb back out to A. Nothing locks it in.",
      "Given time A finds the other route, and T sits 2 kcal/mol lower than K, so over many trips T collects the material.",
    ],
    takeaway: "When every step can run backwards the products trade places until the deepest well holds most of the material.",
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((one) => one.id === id);
}

/* ------------------------------------------------------------------ */
/* Free entry: log10 Keq from a pKa pair                                 */
/* ------------------------------------------------------------------ */

/** log10 Keq for an acid-base step: pKa of the acid formed minus pKa of the acid used up. */
export function log10KeqFromPkas(acidFormedPka: number, acidConsumedPka: number): number {
  return Math.round((acidFormedPka - acidConsumedPka) * 10) / 10;
}

/**
 * Marks a typed exponent. The course teaches pKa as a class value to one or two figures, so the
 * answer is right within 0.15 of a power of ten; the exact exponent with its sign flipped is
 * reported separately because that is the commonest slip.
 */
export function checkExponent(entered: number, truth: number): "right" | "flipped" | "wrong" {
  if (!Number.isFinite(entered)) return "wrong";
  if (Math.abs(entered - truth) <= 0.15) return "right";
  if (truth !== 0 && Math.abs(entered + truth) <= 0.15) return "flipped";
  return "wrong";
}

/** Parses "10.7", "-0.3", "+4", with a true minus sign allowed. NaN when it is not a number. */
export function parseExponent(text: string): number {
  const cleaned = text.trim().replace(/[−–]/g, "-").replace(/^\+/, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/* ------------------------------------------------------------------ */
/* Free entry: Keq written as a number times a power of ten              */
/* ------------------------------------------------------------------ */

/** Parses a positive decimal such as "6.3" or "0.5". NaN when it is not one. */
export function parseMantissa(text: string): number {
  const cleaned = text.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return Number.NaN;
  const n = Number(cleaned);
  return n > 0 ? n : Number.NaN;
}

/** Parses a whole-number exponent, true minus allowed. NaN otherwise. */
export function parseWholeExponent(text: string): number {
  const cleaned = text.trim().replace(/[−–]/g, "-").replace(/^\+/, "");
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/**
 * Marks "mantissa x 10^exponent" against the true Keq (ten to the pKa gap). Right within a factor of
 * 10^0.15 (about 1.4), so a student who rounds the gap is not punished. "flipped" means the
 * reciprocal, the commonest slip (acid used minus acid formed).
 */
export function checkSciKeq(mantissa: number, exponent: number, gap: number): "right" | "flipped" | "wrong" {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent) || mantissa <= 0) return "wrong";
  const entered = Math.log10(mantissa) + exponent;
  if (Math.abs(entered - gap) <= 0.15) return "right";
  if (gap !== 0 && Math.abs(entered + gap) <= 0.15) return "flipped";
  return "wrong";
}

/** The worked solution for a pKa pair, one line per step, so the arithmetic is shown, not just the answer. */
export function workedKeqSteps(formedPka: number, usedPka: number): readonly string[] {
  const gap = log10KeqFromPkas(formedPka, usedPka);
  const keq = 10 ** gap;
  const { mantissa, exponent } = sciParts(keq);
  const cls = classifyKeq(keq);
  const verdict =
    cls === "reversible"
      ? "Between 10⁻⁷ and 10⁷, so the step runs both ways."
      : cls === "one-way-forward"
        ? "Above 10⁷, so the step is irreversible: it runs forward and stays."
        : "Below 10⁻⁷, so this step barely starts.";
  return [
    "Keq = 10^(pKa of the acid formed − pKa of the acid used up).",
    `Gap: ${formedPka} − ${usedPka} = ${gap}.`,
    `Keq = 10^${gap}. On a calculator, 10^${gap} = ${mantissa} × 10^${exponent}.`,
    verdict,
  ];
}
