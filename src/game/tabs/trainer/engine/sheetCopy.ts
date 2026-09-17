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
import type { ArrowLegalityRuleId, ElectronFlowArrow, MechanismState } from "@blueberry/chem-core";
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

/**
 * The student's own arrow, in words: "from bromine's lone pair onto a carbon".
 * Element names come from the step's state, never from recall; null when the
 * arrow touches something the state cannot name, and the caller drops it.
 */
export function describeArrowInState(state: MechanismState, arrow: ElectronFlowArrow): string | null {
  const elements = new Map<string, string>();
  const bondEnds = new Map<string, readonly [string, string]>();
  const counts = new Map<string, number>();
  for (const member of state.members) {
    for (const atom of member.species.atoms) {
      elements.set(atom.id, atom.element);
      counts.set(atom.element, (counts.get(atom.element) ?? 0) + 1);
    }
    for (const bond of member.species.bonds) bondEnds.set(bond.id, [bond.a, bond.b]);
  }
  // "bromine's lone pair" when the state holds one bromine, "a carbon" when it holds several.
  const spoken = (atomId: string, possessive: boolean): string | null => {
    const element = elements.get(atomId);
    if (element === undefined) return null;
    const name = ELEMENT_NAMES[element] ?? element;
    const unique = (counts.get(element) ?? 0) === 1;
    return unique ? name + (possessive ? "'s" : "") : `a ${name}${possessive ? "'s" : ""}`;
  };
  // Bonds read the way a chemist writes them: carbon first, hydrogen last,
  // otherwise alphabetical, so the pair is "C–Br" and "O–H" whichever end
  // the data lists first.
  const rank = (element: string): string => (element === "C" ? "0" : element === "H" ? "2" : `1${element}`);
  const pairLabel = (first: string | undefined, second: string | undefined): string | null => {
    if (first === undefined || second === undefined) return null;
    const [a, b] = rank(first) <= rank(second) ? [first, second] : [second, first];
    return `${a}–${b}`;
  };
  const bondLabel = (bondId: string): string | null => {
    const ends = bondEnds.get(bondId);
    return ends === undefined ? null : pairLabel(elements.get(ends[0]), elements.get(ends[1]));
  };
  let from: string | null;
  switch (arrow.source.kind) {
    case "lonePair": {
      const owner = spoken(arrow.source.atomId, true);
      from = owner === null ? null : `from ${owner} lone pair`;
      break;
    }
    case "bond": {
      const label = bondLabel(arrow.source.bondId);
      from = label === null ? null : `from the ${label} bond`;
      break;
    }
    case "singleElectron": {
      const owner = spoken(arrow.source.atomId, true);
      from = owner === null ? null : `from ${owner} lone electron`;
      break;
    }
  }
  let to: string | null;
  switch (arrow.sink.kind) {
    case "atom": {
      const target = spoken(arrow.sink.atomId, false);
      to = target === null ? null : `onto ${target}`;
      break;
    }
    case "betweenAtoms": {
      const label = pairLabel(elements.get(arrow.sink.atomIds[0]), elements.get(arrow.sink.atomIds[1]));
      to = label === null ? null : `into a new ${label} bond`;
      break;
    }
  }
  return from === null || to === null ? null : `${from} ${to}`;
}

/**
 * The sheet for a drawing the grader did not accept. `distractor` is the
 * authored copy for the arrow the grader flagged, when an instructor wrote
 * one. `strays` are the student's own extra arrows already put into words
 * (describeArrowInState), so the near-miss sheet can point at them by name.
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
      // careful not to spoil.
      if (strays !== undefined && strays.length === 1) parts.push(`The stray one is your push ${strays[0]}.`);
      else if (strays !== undefined && strays.length > 1) parts.push(`The stray ones are your pushes ${strays.join(", and ")}.`);
      return {
        tone: "nearMiss",
        headline: "Legal, but a different change.",
        layers: [
          {
            label: "What's off",
            text: `Every arrow you drew is legal on its own: each starts on real electrons and ends on an atom or bond that touches where it started. Together they describe a different change from the one this step asks for. ${parts.join(" ")}`.trim(),
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
