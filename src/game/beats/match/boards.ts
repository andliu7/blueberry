/**
 * Four authored boards, one per content target in this piece's brief: reagent
 * to job, pKa to compound, spectroscopic signal to functional group, and
 * protecting group to what it protects.
 *
 * WHY THE CONTENT LIVES BESIDE THE BEAT rather than in demo/. Every board here
 * belongs to a real pathway node that is one of the 17 spine nodes the trainer
 * cannot play, and the node ids are the ones already in demo/pathwayMap.ts:
 * u5-syn-diol, u9-pka, u6-ir and u5-protecting. Putting the boards in the
 * package that renders them keeps the beat self contained while the shape is
 * still settling; moving them into the authored corpus later is a file move and
 * an id that does not change, per the BeatId invariant in ../types.ts.
 *
 * TWO OF THESE ALREADY EXIST IN packages/curriculum AND ARE NOT DUPLICATED
 * HERE. `org2-match-oxidation-ladder` and `org2-match-acyl-synthesis-jobs` are
 * authored corpus problems with their own distractors, and they are the reagent
 * to job boards for the oxidation ladder and the acyl ladder. These four cover
 * ground those two do not, so a board is authored once and in one place.
 *
 * A CONFLICT WORTH REPORTING RATHER THAN HIDING, and it is about the pKa board.
 * CLAUDE.md makes pKa values professor adjustable: packages/curriculum/src/pka.ts
 * holds the table with sources and a settings layer sits over it with presets
 * and per value overrides. `SortItem` in ../types.ts carries a `pkaSiteId` for
 * exactly that reason. `MatchPair` does not, so a number written into a match
 * target is authored text and no settings layer can reach it. Two things follow
 * and both are deliberate. The right hand cards say "about 5" and "about 13"
 * rather than 4.76 and 13.3, because presets differ by tenths and a band that
 * wide stays true under every table anyone would configure. And the missing
 * field is reported as an integration edit rather than added here, because
 * ../types.ts is not this piece's file to change.
 *
 * A CARD IS A PILL, NOT A PARAGRAPH, and this is the fix that came out of the
 * first review. The reference capture is a phone screenshot, and every pill on
 * it is two or three words, which is why the whole board reads at a glance and
 * a student never scrolls to find a card's partner. The first version of these
 * boards wrote up to seventy characters on a card; in a 390 point viewport that
 * is two columns of roughly 150 points each, so a card wrapped to five or six
 * lines, the two columns lost every row correspondence, and the sentence that
 * is the entire point of this beat sat below the fold. So the rule now, and
 * `CARD_TEXT_CAP` in ./spec.ts reports on it: the CARD carries the claim in as
 * few words as the chemistry allows, and the EXPLANATION lives in `why`, where
 * there is room for it and where the student reads it at the moment it lands.
 * Nothing was made vaguer to fit. Everything cut off a card is still said, one
 * tap later, in a fuller sentence than it had before.
 *
 * Chemistry is stated as it is taught in CHEM 241 and nowhere is a claim made
 * softer to make a card fit. Where a number is approximate the card says about.
 */

import type { MasteryLevel, MatchBeat } from "../types";

/**
 * Every board here declares the same two rungs, and it is written once rather
 * than four times so the ladder rule stays one decision. ../types.ts says a
 * match beat serves L1 and L2: guided pairing, then pairing against decoys.
 * There is no L0 matching board, because L0 cannot fail and a pairing a
 * student cannot get wrong is not a pairing.
 */
const MATCH_LEVELS: readonly MasteryLevel[] = Object.freeze([1, 2]);

/** Reagent to job: what four reagents do to the same C=C. Node u5-syn-diol. */
export const ALKENE_OXIDATION_BOARD: MatchBeat = Object.freeze({
  kind: "match",
  id: "match-alkene-oxidation",
  node: "u5-syn-diol",
  conceptIds: ["alkene-oxidation", "syn-vs-anti-addition"],
  levels: MATCH_LEVELS,
  presentation: "columns",
  diamonds: 3,
  prompt: "Match each reagent to what it does to a C=C.",
  brief: "Same alkene every time. What changes is which face the second atom arrives on.",
  pairs: [
    {
      id: "osmium",
      left: "OsO4, then NaHSO3",
      right: "Two OH, same face",
      why:
        "Osmium bridges the alkene in one piece, so both oxygens are delivered from the same " +
        "side. The syn diol is forced by that cyclic osmate ester rather than preferred, and " +
        "the bisulfite step is only there to cleave the osmium back off.",
    },
    {
      id: "epoxide-open",
      left: "mCPBA, then H3O+",
      right: "Two OH, opposite faces",
      why:
        "mCPBA makes the epoxide first, and aqueous acid then opens it: water attacks one " +
        "carbon from the back side while the protonated oxygen leaves from the front. That " +
        "backside attack is what puts the second OH on the far face.",
    },
    {
      id: "ozonolysis",
      left: "O3, then Me2S",
      right: "C=C cut, two carbonyls",
      why:
        "Ozonolysis breaks the C=C rather than adding across it, so each alkene carbon leaves " +
        "as its own carbonyl. Dimethyl sulfide is the reductive workup, which stops the " +
        "fragments at aldehydes and ketones instead of oxidising on to acids.",
    },
    {
      id: "dibromide",
      left: "Br2 in CH2Cl2",
      right: "Two Br, opposite faces",
      why:
        "The bromonium ion covers one face, so bromide has to open it from the other. Anti " +
        "addition is forced by that bridge, the same way the osmate ester forces syn.",
    },
  ],
  decoys: [
    {
      id: "halohydrin",
      text: "One OH and one Br",
      why:
        "That is Br2 in water, where water reaches the bromonium before bromide does. " +
        "Dichloromethane has no water in it, so bromide opens the ring and the product is the " +
        "dibromide.",
    },
  ],
});

/** pKa to compound: the ladder that decides which base a step needs. Node u9-pka. */
export const PKA_LADDER_BOARD: MatchBeat = Object.freeze({
  kind: "match",
  id: "match-pka-ladder",
  node: "u9-pka",
  conceptIds: ["pka-hierarchy", "conjugate-base-stability"],
  levels: MATCH_LEVELS,
  presentation: "columns",
  diamonds: 3,
  prompt: "Match each proton to its pKa.",
  brief:
    "Read the conjugate base rather than the acid. Where the charge can go is what sets the number.",
  pairs: [
    {
      id: "acetic",
      left: "Acetic acid O-H",
      right: "pKa about 5",
      why:
        "The conjugate base spreads its charge over two equivalent oxygens. That resonance is " +
        "worth roughly eleven pKa units against a plain alkoxide.",
    },
    {
      id: "malonate",
      left: "Malonic ester C-H",
      right: "pKa about 13",
      why:
        "The proton meant here is the one between the two ester carbonyls, so the anion " +
        "delocalises into both of them. It is why a malonic ester alkylation runs on sodium " +
        "ethoxide instead of needing LDA.",
    },
    {
      id: "ethanol",
      left: "Ethanol O-H",
      right: "pKa about 16",
      why:
        "An alkoxide has nothing to delocalise into; oxygen's own electronegativity is all that " +
        "is holding the charge. This is the reference point the other three are read against.",
    },
    {
      id: "acetone",
      left: "Acetone alpha C-H",
      right: "pKa about 20",
      why:
        "One carbonyl to delocalise into, and carbon holds charge worse than oxygen does. " +
        "Adding a second carbonyl, as the malonic ester has, drops it about seven units further.",
    },
  ],
  decoys: [
    {
      id: "alkyne-band",
      text: "pKa about 25",
      why:
        "That is roughly a terminal alkyne C-H, and an ordinary ester's own alpha C-H sits there " +
        "too. Nothing on this board is that weakly acidic: every card on the left is either an " +
        "O-H or a carbon flanked by a carbonyl.",
    },
  ],
});

/** Spectroscopic signal to functional group. Node u6-ir. */
export const IR_SIGNAL_BOARD: MatchBeat = Object.freeze({
  kind: "match",
  id: "match-ir-signal",
  node: "u6-ir",
  conceptIds: ["ir-diagnostics", "functional-group-id"],
  levels: MATCH_LEVELS,
  presentation: "columns",
  diamonds: 3,
  prompt: "Match each IR band to the group that makes it.",
  brief:
    "Wavenumbers in cm-1. Where a band sits narrows it down, and how broad it is finishes the job.",
  pairs: [
    {
      id: "ketone",
      left: "Sharp 1715, nothing above 3000",
      right: "A ketone",
      why:
        "1715 is the unstrained C=O reference point. An empty region above 3000 rules out the " +
        "acid, the alcohol and the amine at the same time, which leaves the plain carbonyl.",
    },
    {
      id: "acid",
      left: "Broad 2500 to 3300, C=O 1710",
      right: "A carboxylic acid",
      why:
        "The breadth comes from the hydrogen bonded dimer. A carbonyl with an O-H draped over it " +
        "all the way down to 2500 is the acid's signature, and nothing else makes that shape.",
    },
    {
      id: "nitrile",
      left: "Sharp band near 2250",
      right: "A nitrile",
      why:
        "The triple bond region is almost empty, so anything near 2250 is a triple bond. Sharp " +
        "and strong points to C to N; an alkyne's band is weaker and often missing altogether.",
    },
    {
      id: "amine",
      left: "Two bands, 3350 and 3450",
      right: "A primary amine",
      why:
        "Two bands means two N-H bonds stretching in step and out of step. A secondary amine has " +
        "one N-H and gives one band, so the count reads out the substitution.",
    },
  ],
  decoys: [
    {
      id: "alcohol",
      text: "An alcohol",
      why:
        "An alcohol's O-H is broad too, but it sits around 3300 with no carbonyl beside it. The " +
        "band on this board runs all the way down to 2500 and has a C=O underneath, which is the " +
        "acid dimer rather than a lone O-H.",
    },
  ],
});

/** Protecting group to what it protects. Node u5-protecting. */
export const PROTECTING_GROUP_BOARD: MatchBeat = Object.freeze({
  kind: "match",
  id: "match-protecting-group",
  node: "u5-protecting",
  conceptIds: ["protecting-groups", "orthogonality"],
  levels: MATCH_LEVELS,
  presentation: "columns",
  diamonds: 3,
  prompt: "Match each protecting group to what it protects.",
  brief:
    "A protecting group answers one question: which group would react first if it were left alone?",
  pairs: [
    {
      id: "silyl",
      left: "TBSCl with imidazole",
      right: "An alcohol",
      why:
        "Silicon caps the alcohol's oxygen as a silyl ether, and imidazole is the base that mops " +
        "up the HCl. Fluoride takes it back off, and nothing else in a normal sequence touches " +
        "silicon, which is what orthogonal means here.",
    },
    {
      id: "acetal",
      left: "Ethylene glycol and acid",
      right: "A ketone or aldehyde",
      why:
        "The carbonyl becomes a cyclic acetal, which leaves no electrophilic carbon for a " +
        "Grignard to attack. A trace of acid is enough to run it, and aqueous acid at the end " +
        "brings the carbonyl straight back.",
    },
    {
      id: "boc",
      left: "Boc anhydride",
      right: "An amine",
      why:
        "The amine becomes a carbamate, so its lone pair is tied up and it stops being " +
        "nucleophilic and basic. Trifluoroacetic acid removes it.",
    },
    {
      id: "tms-alkyne",
      left: "n-BuLi, then TMSCl",
      right: "A terminal alkyne C-H",
      why:
        "The alkyne is deprotonated and the acetylide is capped with silicon. That stops the " +
        "terminal C-H being the most acidic proton in the molecule when a strong base arrives " +
        "later.",
    },
  ],
  decoys: [
    {
      id: "alkene",
      text: "An alkene",
      why:
        "None of these four caps a C=C. An alkene is normally protected by converting it into " +
        "something else and back, an epoxide or a dibromide, rather than by hanging a group on it.",
    },
  ],
});

/**
 * Reagent to job, on the multistep sequencing node. Node u3-sequencing.
 *
 * AUTHORED SO ONE LESSON IN THE PRODUCT PLAYS MORE THAN ONE SLOT. The
 * seven-slot template in ../template.ts was real code that no content could
 * exercise: every node authored exactly one beat KIND, so a lesson plan never
 * had more than one content step and the recipe strip never drew more than
 * [content, reward]. u3-sequencing already carried three SYNTHESIS gaps, and
 * mcq/content.ts's SEQUENCING set now gives it the recognise rung, so this
 * board is the connect rung and the node plays recognise, connect, produce and
 * reward, with recycle when a miss earns it.
 *
 * WHY THIS BOARD IS THE RIGHT CONNECT RUNG FOR THIS NODE rather than filler.
 * Sequencing is the one EAS topic where knowing each reaction is not enough:
 * the exam question is which reagent does which JOB, so that the jobs can be
 * put in an order. The synthesis gaps downstream ask for the order. This asks
 * for the vocabulary the order is built from, which is the connect slot's own
 * definition, and every left card here is a reagent set that appears in one of
 * those gaps.
 *
 * The decoy is the mistake the course's own exams keep catching: reaching for
 * bromination when the sequence asked for sulfonation, because both are "put
 * something on so you can take it off later".
 */
export const SEQUENCING_JOBS_BOARD: MatchBeat = Object.freeze({
  kind: "match",
  id: "match-sequencing-jobs",
  node: "u3-sequencing",
  conceptIds: ["eas-sequencing", "directing-effects"],
  levels: MATCH_LEVELS,
  presentation: "columns",
  diamonds: 4,
  prompt: "Match each reagent set to the job it does in a sequence.",
  brief: "Same benzene every time. What changes is what the ring is carrying afterwards.",
  pairs: [
    {
      id: "nitration",
      left: "HNO3, H2SO4",
      right: "Nitro group on",
      why:
        "Nitration puts a strong deactivator on the ring, and that is usually the point: it " +
        "shuts the ring down so a later step cannot go twice, and it is the group that gets " +
        "reduced to an amine once the hard chemistry is over.",
    },
    {
      id: "reduction",
      left: "Sn, HCl, then NaOH",
      right: "Nitro down to amine",
      why:
        "The same nitrogen, three oxidation states later. Doing it at the END is what makes " +
        "nitration worth reaching for, because an amine on the ring first would have been " +
        "protonated by every acidic step in the sequence.",
    },
    {
      id: "sulfonation",
      left: "SO3, H2SO4",
      right: "Blocker on, para",
      why:
        "Sulfonation is the reversible one, and reversibility is the whole feature. The " +
        "sulfonic acid parks on para, the next step is forced to ortho, and dilute hot acid " +
        "takes the blocker back off.",
    },
    {
      id: "acylation",
      left: "CH3COCl, AlCl3",
      right: "Acyl group on, once",
      why:
        "Acylation stops after one because the ketone it leaves deactivates the ring. That is " +
        "why the sequence reaches for it rather than alkylation, and a Clemmensen or Wolff " +
        "Kishner afterwards turns the C=O into the CH2 an alkylation would have overshot.",
    },
  ],
  decoys: [
    {
      id: "bromination",
      text: "Bromine on, ortho para",
      why:
        "Bromination is a real step and it is not this one. It belongs with Br2 and FeBr3, and " +
        "the bromine it leaves behind is permanent, so it cannot do the park-and-remove job " +
        "sulfonation was chosen for.",
    },
  ],
});

export const MATCH_BOARDS: readonly MatchBeat[] = Object.freeze([
  ALKENE_OXIDATION_BOARD,
  PKA_LADDER_BOARD,
  IR_SIGNAL_BOARD,
  PROTECTING_GROUP_BOARD,
  SEQUENCING_JOBS_BOARD,
]);

export function matchBoardById(id: string): MatchBeat | undefined {
  return MATCH_BOARDS.find((board) => board.id === id);
}
