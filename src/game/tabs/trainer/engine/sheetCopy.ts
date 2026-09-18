/**
 * What the answer sheet says, for every outcome the trainer can return.
 *
 * ONE SHAPE FOR EVERY OUTCOME. The sheet shows one line, the headline, and
 * holds the rest in layers the student opens one tap at a time: the rule
 * behind the verdict, then where to look. A correct answer holds its
 * explanation behind a quiet "Why?", offered and never forced. Everything the
 * sheet can say is decided here, as data, so FeedbackSheet.tsx only draws.
 *
 * WHERE THE WORDS COME FROM, in the order they are tried:
 *   1. An authored distractor (../distractors.ts) for the exact arrow the
 *      grader flagged. An instructor wrote it for that mistake on that step.
 *   2. For an illegal arrow, the copy for the legality RULE that fired. One
 *      cause in chem-core covers several gestures (a site with no electrons
 *      and a pair already spent both read arrow_source_has_no_electrons), so
 *      the sheet speaks to the gesture. Where the shared registry copy already
 *      describes the gesture, it is used as written.
 *   3. For the outcomes with no cause of their own (every push legal but a
 *      different change, or pushes still missing), copy written for the
 *      trainer, because the shared success causes also serve the lesson beats
 *      and talk about a target structure the trainer never shows.
 *
 * VOICE, per CLAUDE-blueberry-game.md and MASCOT.md: a coach on the student's
 * side, disappointed with them at the problem and never in them. No scolding,
 * no rhetorical questions, no em dashes. Headlines stay short enough to hold
 * one line on a 390 px phone; sheetCopy.test.ts pins the length.
 */

import { causeCopyEntry } from "@blueberry/feedback";
import type { ArrowLegalityRuleId, ElectronFlowArrow, MechanismState, MechanismStep } from "@blueberry/chem-core";
import type { DrawVerdict } from "../grade";
import type { TrainerDistractor } from "../distractors";
import type { BranchVerdict } from "./forkModel";

/** The sheet's colour family. No red anywhere: a miss is neutral, a near miss is the amber family. */
export type SheetTone = "good" | "wrong" | "nearMiss" | "partial";

/** One layer the student opens. `label` is the button that opens it. */
export interface SheetLayer {
  readonly label: string;
  readonly text: string;
}

export interface SheetContent {
  readonly tone: SheetTone;
  /** The one line the sheet opens with. */
  readonly headline: string;
  /** A second, smaller line for a name the student needs at a glance: the route taken on a fork win. */
  readonly caption?: string;
  /** Opened one per tap, in order. */
  readonly layers: readonly SheetLayer[];
}

/** The longest headline that holds one line beside the layer button at 390 px. */
export const HEADLINE_MAX = 32;

/* ------------------------------------------------------------------ */
/* Illegal arrows, one entry per legality rule                         */
/* ------------------------------------------------------------------ */

interface RuleCopy {
  readonly headline: string;
  /** Omitted where the shared registry copy for the rule's cause already describes this gesture. */
  readonly why?: string;
  readonly lookAt?: string;
}

const OFF_THE_MOLECULE: RuleCopy = {
  headline: "That end is off the molecule.",
  why: "An arrow moves electrons between atoms and bonds that are drawn in this step. One end of this one does not sit on anything on the canvas, so it describes electrons going nowhere.",
  lookAt: "Undo the arrow and draw it again, starting on a lone pair or a bond you can see and ending on an atom or between two atoms.",
};

/** Exported for sheetCopy.test.ts, which holds every rule's copy to the voice lint and the headline length. */
export const RULE_COPY: Readonly<Record<ArrowLegalityRuleId, RuleCopy>> = {
  source_atom_not_in_state: OFF_THE_MOLECULE,
  source_bond_not_in_state: OFF_THE_MOLECULE,
  sink_atom_not_in_state: OFF_THE_MOLECULE,
  source_has_no_lone_pair: {
    headline: "No pair to push from there.",
    why: "Every electron this atom owns is already in a bond, so it has no lone pair for a tail to sit on. Bonding electrons move only when the arrow starts on the bond itself.",
    lookAt: "Start the arrow on one of this atom's bonds, or from an atom that really holds a lone pair.",
  },
  source_has_no_unpaired_electron: {
    headline: "No lone electron there.",
    why: "A fishhook moves a single electron, so its tail sits on a radical or on a bond that is splitting evenly. An atom whose electrons are all paired has no single electron to send.",
    lookAt: "Start the fishhook on the atom that carries the unpaired electron, or on a bond breaking evenly, with one fishhook to each side.",
  },
  single_electron_source_moved_a_pair: {
    headline: "One electron, not a pair.",
    why: "A radical has one electron to give, so an arrow from it moves one electron and is drawn as a fishhook. A full arrow claims two electrons the radical does not have.",
    lookAt: "Draw this one as a fishhook, or start the full arrow on a lone pair or a bond instead.",
  },
  source_bond_overdrawn: {
    headline: "That bond is already spent.",
    why: "A single bond holds one pair, a double bond two, a triple bond three. A full arrow leaving a bond spends one of those pairs, and a fishhook spends one electron. Once the arrows leaving this bond claim more electrons than it holds, there is nothing left to carry.",
    lookAt: "Find the other arrow that already starts on this bond. If both are needed, one of them probably belongs on a lone pair or on the bond next door.",
  },
  lone_pairs_overdrawn: {
    headline: "Those lone pairs are all used.",
    why: "Every arrow from a lone pair spends one whole pair. This atom now has more arrows leaving its lone pairs than it has lone pairs, so the last arrow asks for electrons that are already on their way somewhere else.",
    lookAt: "Count the lone pairs on the atom and the arrows leaving them. If two arrows are doing the same job, undo one; if one should come from a neighbouring bond, move its tail there.",
  },
  unpaired_electrons_overdrawn: {
    headline: "That radical is already spent.",
    why: "A fishhook moves one electron, and an atom with one unpaired electron can send exactly one. A second fishhook from the same atom asks for an electron that is not there.",
    lookAt: "Count the unpaired electrons on the atom, then the fishhooks leaving it, and undo the extra one.",
  },
  endpoints_share_no_atom: {
    headline: "These two ends don't touch.",
    why: "A bond's pair can land on either of the two atoms it joins, or become a new bond from one of them. A lone pair can only become a new bond from the atom that holds it. Either way the arrow's two ends share an atom, and these two share nothing.",
  },
  sink_bonds_an_atom_to_itself: {
    headline: "An atom can't bond to itself.",
    why: "A new bond joins two different atoms and shares a pair between them. This arrow's head asks for a bond from an atom back to that same atom, so there is no second atom to share the pair with.",
    lookAt: "Move the head so it sits between two different atoms: one the moving electrons already sit on, and the new partner they bond it to.",
  },
  arrow_declares_no_change: { headline: "This arrow goes nowhere." },
};

/* ------------------------------------------------------------------ */
/* The builders                                                         */
/* ------------------------------------------------------------------ */

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;
/** Small counts as words, which read as speech rather than as a readout. */
function spell(n: number): string {
  return WORDS[n] ?? String(n);
}
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function distractorSheet(distractor: TrainerDistractor): SheetContent {
  return {
    tone: "wrong",
    headline: distractor.headline,
    layers: [
      { label: "What's off", text: `${distractor.what} ${distractor.why}` },
      { label: "Where to look", text: distractor.lookAt },
    ],
  };
}

/** Element symbols spelled as spoken names, for describing a stray arrow back to its author. */
const ELEMENT_NAMES: Readonly<Record<string, string>> = {
  H: "hydrogen", C: "carbon", N: "nitrogen", O: "oxygen", F: "fluorine", P: "phosphorus",
  S: "sulfur", Cl: "chlorine", Br: "bromine", I: "iodine", Li: "lithium", Mg: "magnesium", Cu: "copper",
};
const SUBSCRIPTS = ["", "", "₂", "₃", "₄"] as const;
const ORDER_MARK = ["", "–", "=", "≡"] as const;

/** "an oxygen", "a carbon"; a label read as letters takes its article from the letter's sound ("an O–H bond", "an N–H bond"). */
function withArticle(phrase: string, spelledAsLetters: boolean): string {
  const first = phrase.charAt(0).toUpperCase();
  const vowelSound = spelledAsLetters ? "AEFHILMNORSX".includes(first) : "AEIOU".includes(first);
  return `${vowelSound ? "an" : "a"} ${phrase}`;
}

/**
 * A describer over one state. Everything it says is read off the state's own
 * atoms and bonds, never recalled: an atom is named by the first fact that
 * singles it out among its element (its charge, a heteroatom it is bonded to,
 * its hydrogen count), and falls back to the indefinite ("a CH₃ carbon") when
 * several atoms share even that. describeStrays below refuses any sentence
 * that ends up reading the same as a correct arrow's.
 */
function stateDescriber(state: MechanismState) {
  const atoms = new Map<string, { element: string; charge: number; hydrogens: number; neighbours: string[] }>();
  const bonds: { id: string; a: string; b: string; order: number }[] = [];
  for (const member of state.members) {
    for (const atom of member.species.atoms) atoms.set(atom.id, { element: atom.element, charge: atom.formalCharge, hydrogens: atom.implicitHydrogens, neighbours: [] });
    for (const bond of member.species.bonds) bonds.push({ id: bond.id, a: bond.a, b: bond.b, order: bond.order });
  }
  for (const bond of bonds) {
    const [a, b] = [atoms.get(bond.a), atoms.get(bond.b)];
    if (a === undefined || b === undefined) continue;
    if (b.element === "H") a.hydrogens += 1;
    else a.neighbours.push(b.element);
    if (a.element === "H") b.hydrogens += 1;
    else b.neighbours.push(a.element);
  }
  const sameElement = (element: string) => [...atoms.values()].filter((other) => other.element === element);

  const atomPhrase = (atomId: string): string | null => {
    const atom = atoms.get(atomId);
    if (atom === undefined) return null;
    const name = ELEMENT_NAMES[atom.element] ?? atom.element;
    const peers = sameElement(atom.element);
    if (peers.length === 1) return atom.element === "C" || atom.element === "H" ? `the ${name}` : name;
    if (atom.charge !== 0 && peers.filter((peer) => Math.sign(peer.charge) === Math.sign(atom.charge)).length === 1) {
      return `the ${atom.charge > 0 ? "positive" : "negative"} ${name}`;
    }
    for (const partner of [...new Set(atom.neighbours)].filter((element) => element !== "C").sort()) {
      if (peers.filter((peer) => peer.neighbours.includes(partner)).length === 1) return `the ${name} bonded to ${ELEMENT_NAMES[partner] ?? partner}`;
    }
    const group = atom.hydrogens === 0 ? null : `${atom.element}H${SUBSCRIPTS[atom.hydrogens] ?? atom.hydrogens}`;
    if (group === null) return null;
    const sharing = peers.filter((peer) => peer.hydrogens === atom.hydrogens).length;
    return sharing === 1 ? `the ${group} ${name}` : `${withArticle(group, true)} ${name}`;
  };

  // Bonds read the way a chemist writes them: carbon first, hydrogen last,
  // otherwise alphabetical, with the order showing ("C=O", never "C–O" for a
  // carbonyl). "the" only when no other bond in the state reads the same.
  const rank = (element: string): string => (element === "C" ? "0" : element === "H" ? "2" : `1${element}`);
  const label = (a: string, b: string, order: number): string | null => {
    const [first, second] = [atoms.get(a)?.element, atoms.get(b)?.element];
    const mark = ORDER_MARK[order];
    if (first === undefined || second === undefined || mark === undefined) return null;
    const [left, right] = rank(first) <= rank(second) ? [first, second] : [second, first];
    return `${left}${mark}${right}`;
  };
  const bondPhrase = (bond: { a: string; b: string; order: number }): string | null => {
    const own = label(bond.a, bond.b, bond.order);
    if (own === null) return null;
    const alike = bonds.filter((other) => label(other.a, other.b, other.order) === own).length;
    return alike === 1 ? `the ${own} bond` : `${withArticle(own, true)} bond`;
  };

  return (arrow: ElectronFlowArrow): string | null => {
    let from: string | null = null;
    if (arrow.source.kind === "bond") {
      const bondId = arrow.source.bondId;
      const bond = bonds.find((candidate) => candidate.id === bondId);
      const phrase = bond === undefined ? null : bondPhrase(bond);
      from = phrase === null ? null : `from ${phrase}`;
    } else {
      const owner = atomPhrase(arrow.source.atomId);
      from = owner === null ? null : `from ${arrow.source.kind === "lonePair" ? "a lone pair" : "the unpaired electron"} on ${owner}`;
    }
    let to: string | null = null;
    if (arrow.sink.kind === "atom") {
      const target = atomPhrase(arrow.sink.atomId);
      to = target === null ? null : `onto ${target}`;
    } else {
      const [a, b] = arrow.sink.atomIds;
      const existing = bonds.find((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
      if (existing !== undefined) {
        // No new connection forms here: the pair raises a bond that already exists.
        const phrase = bondPhrase(existing);
        const raised = label(existing.a, existing.b, existing.order + 1);
        to = phrase === null || raised === null ? null : `into ${phrase}, making it ${raised}`;
      } else {
        // The pair's own atom first, so the sentence reads the way the push was drawn.
        const ownerFirst = arrow.source.kind !== "bond" && arrow.source.atomId === b;
        const [near, far] = [atomPhrase(ownerFirst ? b : a), atomPhrase(ownerFirst ? a : b)];
        to = near === null || far === null ? null : `into a new bond between ${near} and ${far}`;
      }
    }
    return from === null || to === null ? null : `${from} ${to}`;
  };
}

/**
 * The student's own extra arrows, in words, or null when they cannot be named
 * honestly. All or nothing: if any one of them has no clean description, or
 * reads the same as one of the step's CORRECT arrows (two attacks that differ
 * only in which of several like atoms they land on), nothing is named, because
 * a sentence that describes the right answer as the stray is worse than the
 * count alone.
 */
export function describeStrays(step: MechanismStep, extras: readonly ElectronFlowArrow[]): readonly string[] | null {
  const describe = stateDescriber(step.from);
  const correct = new Set(step.arrows.map(describe));
  const named: string[] = [];
  for (const arrow of extras) {
    const phrase = describe(arrow);
    if (phrase === null || correct.has(phrase)) return null;
    named.push(phrase);
  }
  return named.length > 0 ? named : null;
}

/**
 * The sheet for a drawing the grader did not accept. `distractor` is the
 * authored copy for the arrow the grader flagged, when an instructor wrote
 * one. `strays` are the student's own extra arrows already put into words
 * (describeStrays), so the near-miss sheet can point at them by name.
 */
export function missSheet(verdict: Exclude<DrawVerdict, { kind: "correct" }>, distractor: TrainerDistractor | null, strays?: readonly string[]): SheetContent {
  if (distractor !== null) return distractorSheet(distractor);
  switch (verdict.kind) {
    case "invalid": {
      const rule = RULE_COPY[verdict.finding.rule];
      const shared = causeCopyEntry(verdict.cause);
      return {
        tone: "wrong",
        headline: rule.headline,
        layers: [
          { label: "The rule", text: rule.why ?? `${shared.whatYouDid} ${shared.why}` },
          { label: "Where to look", text: rule.lookAt ?? shared.lookAt },
        ],
      };
    }
    case "not_requested": {
      const parts: string[] = [];
      if (verdict.missing > 0) parts.push(`${capitalise(spell(verdict.missing))} of the pushes this step needs ${verdict.missing === 1 ? "is" : "are"} not drawn yet.`);
      if (verdict.extra > 0) parts.push(`${capitalise(spell(verdict.extra))} of yours ${verdict.extra === 1 ? "goes" : "go"} somewhere this step does not.`);
      // Name the student's own stray arrows, never the missing ones: naming a
      // missing push would hand over the answer the incomplete copy is
      // careful not to spoil. It leads the layer, because it is the only
      // sentence about THIS drawing and a stressed student reads one.
      let named = "";
      if (strays !== undefined && strays.length > 0) {
        const list = strays.length === 1 ? strays[0] : `${strays.slice(0, -1).join(", ")} and ${strays[strays.length - 1]}`;
        named =
          verdict.drawn === 1
            ? `Your push, ${list}, is not one this step makes. `
            : strays.length === 1
              ? `The stray one is your push ${list}. `
              : `The stray ones are your pushes ${list}. `;
      }
      return {
        tone: "nearMiss",
        headline: "Legal, but a different change.",
        layers: [
          {
            label: "What's off",
            text: `${named}Every arrow you drew is legal on its own: each starts on real electrons and ends on an atom or bond that touches where it started. Together they describe a different change from the one this step asks for. ${parts.join(" ")}`.trim(),
          },
          {
            label: "Where to look",
            text: "Read the step at the top again and name every bond it says forms or breaks. Keep the pushes that make those changes, and any arrow that matches none of them comes off with Undo.",
          },
        ],
      };
    }
    case "incomplete": {
      const left = verdict.needed - verdict.drawn;
      return {
        tone: "partial",
        headline: `${verdict.drawn} of ${verdict.needed} pushes drawn, all sound.`,
        layers: [
          {
            label: "What's left",
            text: `${left === 1 ? "One more push" : `${capitalise(spell(left))} more pushes`} and the step is complete: a step is finished when every bond that forms or breaks has electrons moving to make it happen.`,
          },
          {
            label: "Where to look",
            text: "Look at both ends of your last arrow. An atom that just gained a pair often has to give one up in the same step, and an atom that just lost one often needs a new pair. The missing push usually starts or ends there.",
          },
        ],
      };
    }
    default: {
      const unreachable: never = verdict;
      return unreachable;
    }
  }
}

/** The sheet for right arrows on a route the conditions do not favour. */
export function branchSheet(verdict: Extract<BranchVerdict, { kind: "not_favoured" }>): SheetContent {
  const copy = causeCopyEntry(verdict.cause);
  return {
    tone: "nearMiss",
    headline: "Arrows right, not this route.",
    layers: [
      { label: "Why not this route", text: `Under these conditions the favoured route is "${verdict.favoured.label}". ${verdict.route.why}` },
      { label: "The rule", text: copy.why },
      { label: "Where to look", text: copy.lookAt },
    ],
  };
}

/**
 * The sheet on a win. `explanation` is the authored line for the step (the
 * question's success line, or the chosen route's reason on an earlier step);
 * null when the prompt at the top already says it, so the Why? has nothing
 * new to offer and is not shown.
 */
export function winSheet(headline: string, explanation: string | null, routeLabel: string | null): SheetContent {
  return {
    tone: "good",
    headline,
    ...(routeLabel !== null ? { caption: `Route: ${routeLabel}` } : {}),
    layers: explanation !== null ? [{ label: "Why?", text: explanation }] : [],
  };
}
