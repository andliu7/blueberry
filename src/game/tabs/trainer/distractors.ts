/**
 * Authored Tier 2 distractors for the demo step: the wrong arrows an
 * instructor KNOWS students draw on an SN2, each with copy written for that
 * exact mistake. Matched on mechanism state (the arrow's own key), never on
 * prose, per the feedback contract in CLAUDE.md.
 *
 * The first entry exists because the owner drew it and read the wrong
 * explanation. Sending hydroxide's electrons at bromine got back a generic
 * "bromide still has no reason to leave", which answers a different mistake.
 * The real reason the arrow is wrong is electrostatic: both ends of it are
 * electron rich. The copy leads with that.
 *
 * Voice per CLAUDE.md: a coach on the student's side. Name what happened
 * plainly, treat it as the normal step it is, make the next action feel
 * within reach. No scolding, no rhetorical questions.
 */

import type { ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { arrowKey } from "./grade";

export interface TrainerDistractor {
  /** The answer sheet's one line: the mistake named in a few words. */
  readonly headline: string;
  /** What the student did, plainly. */
  readonly what: string;
  /** Why the chemistry says no. */
  readonly why: string;
  /** Where to look instead. */
  readonly lookAt: string;
}

/**
 * Keyed by the offending arrow's key. Two spellings of the same idea both
 * land here: dropping ON bromine (an atom sink) and dropping between O and Br
 * (a forming-bond sink) are the same mistake with two gestures.
 */
const SN2_DEMO_DISTRACTORS: Readonly<Record<string, TrainerDistractor>> = {
  "2e lp:o1 -> atom:br1": {
    headline: "Bromine won't take that pair.",
    what: "You sent the oxygen's lone pair at bromine.",
    why: "Both ends of that arrow are electron rich. Hydroxide carries a full negative charge, and the C–Br bond leans its density onto bromine, so bromine already wears a partial negative charge. Like charges repel: there is nothing at bromine for a nucleophile to hold on to.",
    lookAt: "The carbon between them. Bromine pulls the C–Br bond's density onto itself, which leaves that carbon slightly positive, and slightly positive is exactly what a nucleophile hunts. Attack it from the side opposite bromine.",
  },
  "2e lp:o1 -> between:br1+o1": {
    headline: "No O–Br bond forms here.",
    what: "You aimed the oxygen's lone pair at bromine, as a new O–Br bond.",
    why: "Both ends of that bond would be electron rich. Hydroxide is a full anion, and the C–Br bond leans its density onto bromine, so bromine wears a partial negative charge already. Like charges repel, and no bond forms between two centres that are both pushing electrons away.",
    lookAt: "The carbon between them. It is the one electron-poor atom on this canvas, and the backside of it, opposite bromine, is where the attack lands.",
  },
  "2e bond:b-cbr -> atom:c1": {
    headline: "That pair belongs on bromine.",
    what: "You collapsed the C–Br bond onto the carbon.",
    why: "That parks both electrons on carbon and makes a carbanion. This carbon is already taking the incoming pair from oxygen in the same step, so the old pair has to leave with bromine rather than pile on: two new pairs arriving at one small atom is too much.",
    lookAt: "Bromine. It is the atom that can hold a full negative charge comfortably, which is what makes it a good leaving group: send the bond's electrons there and it departs as bromide.",
  },
};

/**
 * Per-step distractor tables. The SN2 set above keeps its name; new steps add
 * their own entries here, keyed by step id then arrow key.
 */
const DISTRACTORS_BY_STEP: Readonly<Record<string, Readonly<Record<string, TrainerDistractor>>>> = {
  /* ---------------------------------------------------------------- */
  /* Resonance: the allyl cation, C1=C2-C3(+)                          */
  /*                                                                    */
  /* THE RULE these all teach. A resonance arrow moves ONE pair ONE     */
  /* position: a pi bond to the next bond along, a lone pair into the   */
  /* bond beside it, or a pi bond up onto the atom at its own end.      */
  /* Nothing travels further than that in a single structure, because a */
  /* contributing structure is a redrawing of the SAME molecule and not */
  /* a reaction that had time to happen.                                */
  /* ---------------------------------------------------------------- */
  "res-allyl-a-to-b": {
    "2e bond:b12 -> between:c1+c3": {
      headline: "C1 and C3 aren't neighbours.",
      what: "You sent the pi bond straight from C1 across to C3.",
      why: "C2 sits between C1 and C3, so that arrow would build a bond between two atoms that never touch. You are right that C1 is part of the pi system, and the electrons do reach C3: each resonance arrow shifts a pair by one position, so the pi bond slides from C1=C2 into the C2-C3 bond, and the positive charge lands on C1 because that is the end the pair left.",
      lookAt: "The C2-C3 bond, the one next door to the pi bond you are holding.",
    },
    "2e bond:b12 -> atom:c1": {
      headline: "That creates extra charges.",
      what: "You collapsed the pi bond onto C1.",
      why: "That parks both electrons on C1 as a lone pair and a minus, leaves C2 with only three bonds and a new plus, and C3 keeps its plus: three charges where the molecule had one. A contributing structure with more charge than the one you started from is a worse description of the real molecule. Send the pair along the chain into the C2-C3 bond instead and the one plus simply moves.",
      lookAt: "The C2-C3 bond, the one that touches the positive carbon. Push the pair one position along.",
    },
    "2e bond:b12 -> atom:c2": {
      headline: "The pair stopped short of C3.",
      what: "You collapsed the pi bond onto C2, the middle carbon.",
      why: "C2 would take the lone pair and a minus while C1 is left with a new plus and C3 keeps its own: the pair landed between the two ends instead of relieving either. C3 is the atom missing electrons, and the pair reaches it through the C2-C3 bond.",
      lookAt: "The C2-C3 bond: carry the pair one position further, into the bond beside the empty orbital.",
    },
    "2e bond:b23 -> between:c1+c2": {
      headline: "Sigma bonds stay put.",
      what: "You moved the single bond between C2 and C3.",
      why: "Resonance only ever moves pi electrons and lone pairs. A sigma bond is the skeleton, and moving one would rearrange which atoms are joined to which, which makes a different molecule rather than another way of drawing this one. The rule of thumb: same atoms, same connectivity, only the pi electrons and lone pairs are allowed to move.",
      lookAt: "The double bond. It is the only thing on this molecule allowed to move.",
    },
  },

  /* The same cation read the other way. Its correct answer is the       */
  /* mirror of the one above, so its wrong answers are the mirror too.   */
  "res-allyl-b-to-a": {
    "2e bond:b23 -> between:c1+c3": {
      headline: "C3 and C1 aren't neighbours.",
      what: "You sent the pi bond straight from C3 across to C1.",
      why: "C2 stands between C3 and C1, so that arrow joins two atoms that never touch. The pi system does reach all three carbons, but a single contributing structure only ever shifts a pair by one position. Slide the pi bond into the C1-C2 bond and the charge moves to C3.",
      lookAt: "The C1-C2 bond, one position along from where the pair is now.",
    },
    "2e bond:b23 -> atom:c3": {
      headline: "That creates extra charges.",
      what: "You collapsed the pi bond onto C3.",
      why: "Both electrons sit on C3 as a lone pair with a minus, C2 is left with only three bonds and a new plus, and C1 keeps its plus: three charges where the molecule had one. That is a legal drawing and a poor contributing structure, because the good ones keep charge to a minimum. Push the pair into the neighbouring bond instead.",
      lookAt: "The C1-C2 bond, the one that touches the positive carbon. Push the pair one position along.",
    },
  },

  /* ---------------------------------------------------------------- */
  /* Resonance: acetate. Two arrows, and the order they teach matters. */
  /* ---------------------------------------------------------------- */
  "res-acetate-a-to-b": {
    "2e lp:o2 -> between:c1+o2": {
      headline: "The methyl carbon is full.",
      what: "You sent the oxygen's lone pair at the methyl carbon.",
      why: "That builds a bond to C1, the CH3 carbon, which already has four bonds and no room for a fifth. The carbon you want is C2, the carbonyl carbon the two oxygens share: it is the one the pi system runs through, and the only one that can take a pair while handing one on.",
      lookAt: "C2, the carbon sitting between the two oxygens.",
    },
    "2e bond:b-co1 -> atom:o2": {
      headline: "That pair can't reach O2.",
      what: "You pushed the C=O pi bond onto the far oxygen.",
      why: "The pair in that pi bond belongs to C2 and O1, so it can only land on one of those two. Sending it to O2, on the other side of the carbon, would move electrons two positions in one arrow. Drop it onto its own oxygen, O1, and let the other oxygen's lone pair come in to replace it: two arrows, each one step.",
      lookAt: "O1, the oxygen at the other end of the pi bond you are pushing.",
    },
    "2e bond:b-co1 -> between:c1+c2": {
      headline: "The methyl group stays out.",
      what: "You pushed the carbonyl pi bond into the C-C bond.",
      why: "That would put a double bond between the carbonyl carbon and the methyl group, and the methyl carbon has three hydrogens and nowhere to put another bond. Resonance in a carboxylate runs across the O-C-O unit only: the two oxygens and the carbon between them share the pair, and the methyl group is a spectator.",
      lookAt: "O1, the oxygen this pi bond already touches. The whole delocalisation lives on O-C-O.",
    },
  },

  "sn2-demo-step": SN2_DEMO_DISTRACTORS,
  "epoxide-basic": {
    "2e lp:om -> between:c2+om": {
      headline: "Basic conditions pick the CH₂.",
      what: "You attacked the more substituted carbon.",
      why: "With a strong nucleophile and no acid this is a plain SN2, and SN2 cares about sterics: the CH₂ end is the open door, the CH end has a methyl group standing in it. Regiochemistry flips only when acid puts real positive charge on the substituted carbon.",
      lookAt: "The CH₂ carbon of the ring, the less hindered one. Backside attack there, and the ring strain shoves the oxygen off.",
    },
  },
  "epoxide-acidic": {
    "2e lp:ow -> between:c1+ow": {
      headline: "Acid moves the attack to the CH.",
      what: "You attacked the less substituted carbon.",
      why: "That is the basic-conditions answer. Here the ring is protonated, so the C–O bonds are already letting go, and the more substituted carbon carries the bigger share of the positive charge as its C–O bond stretches: it behaves partly like a carbocation, and that is where a weak nucleophile lands.",
      lookAt: "The CH carbon, the one with the methyl. Under acid, charge beats sterics.",
    },
  },
  "alkene-protonation-hbr": {
    "2e bond:b-cc -> between:c2+h1": {
      headline: "That leaves a primary cation.",
      what: "You protonated the middle carbon.",
      why: "Putting the H there parks the positive charge on the end carbon: a primary cation, with only one neighbour to share the load. Protonating the CH₂ end instead leaves the charge on the middle carbon, secondary, steadied by both alkyl groups. The proton goes wherever it makes the more stable cation.",
      lookAt: "The CH₂ end of the double bond. Send the π bond's electrons to the proton as H–Br lets go, and check where the + ends up.",
    },
  },
};

/** Every authored distractor, for the checks that hold their copy to the answer sheet's rules. */
export function authoredDistractors(): readonly TrainerDistractor[] {
  return Object.values(DISTRACTORS_BY_STEP).flatMap((table) => Object.values(table));
}

/** The authored distractor for an arrow, or null when no one anticipated it. */
export function matchDistractor(step: MechanismStep, arrow: ElectronFlowArrow): TrainerDistractor | null {
  return DISTRACTORS_BY_STEP[step.id]?.[arrowKey(arrow)] ?? null;
}
