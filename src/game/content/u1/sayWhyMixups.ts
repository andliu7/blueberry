/**
 * The "say why" step's wrong reasons (beats/sayWhy.ts), and the one table
 * that says which rule steps get a say-why at all.
 *
 * CHANGED 4 Nov (checker, seventh pass): OPT-IN, NOT PICKED BY TAG. Six
 * attempts picked the wrong options automatically, from per-lesson lists
 * filtered by rule tags and word cues, and every pass still produced options
 * a student could reject by topic, mix-ups that were the right reason
 * negated, and corrections that restated the right reason word for word.
 * Now nothing is picked automatically. A rule step exists only for an item
 * listed in SAY_WHY_STEPS, and its wrong options are exactly the mix-ups
 * that entry names by id. Coverage shrank (30 rule steps, from 137);
 * the owner's rule is that quality cannot.
 *
 * A mix-up is listed for an item only when all four hold, checked by hand
 * against the item's own options:
 *  1. A student who believed it would pick a WRONG answer on THIS question
 *     (for a draw step, draw a wrong structure they could submit). Each route
 *     to a named wrong option is rebuilt with RDKit and matched to the
 *     option's name with OPSIN by scripts/u1_saywhy_routes.py (5 Nov); the
 *     Diels-Alder routes print the ring relation RDKit measures.
 *  2. It is about the species and the reaction on screen.
 *  3. It is not the right reason negated or restated, and its correction
 *     (`fix`) does not restate the right reason.
 *  4. The right reason does not rule out the wrong answers by itself.
 * An item with fewer than two such mix-ups gets no say-why. One-rule items
 * have no wrong belief left that is not that rule's own negation, or a right
 * reason that names the deciding idea the wrong options lack: the alkyl
 * ladders, the vinyl cation, the MO filling items, the "which end takes the
 * Br" NBS items, the resonance-against-alkyl comparisons (u1-cat-allyl-vs-2,
 * u1-cat-3allyl-vs-3, u1-rad-benzyl-vs-3, whose options include "they tie"),
 * the Diels-Alder ring and dienophile-speed items (u1-cd-da-ring,
 * u1-cd-phile-fastest). CHANGED 5 Nov (checker, eighth pass): those five
 * left, with u1-12v14-draw-14 and u1-hx-hexadiene-cold, where the second
 * mix-up led to no drawable structure, or to a product no more stable than
 * the answer. The halogen "which carbon took the first Br" mix-up went too:
 * with X2 both added atoms are Br, so it cannot change a dihalide.
 *
 * RULES FOR THE TEXT.
 *  - Every mix-up is false as a general rule, so it is never a true reason.
 *  - Stages A to C never name orbitals of a diene, endo or exo, δ, or a ring
 *    relation; ortho, meta and para appear nowhere.
 *  - `fix` says what is true instead, in the unit's own words, without the
 *    retry's answer.
 * Drafts until the owner signs them off, like the rest of Unit 1.
 */

export interface Mixup {
  /** The tempting wrong reason, shown as an option. */
  readonly text: string;
  /** What is true instead, shown when the mix-up is picked. */
  readonly fix: string;
}

export const SAY_WHY_MIXUPS: Readonly<Record<string, Mixup>> = {
  // Stage A: cations and radicals.
  "cat-ring-locked": {
    text: "A C=C inside a ring is locked, so it cannot share a positive charge.",
    fix: "A ring C=C next to the charged carbon shares the charge just as a chain C=C does.",
  },
  "cat-identical-one": {
    text: "Two identical contributors are really one structure, so allyl has no second contributor.",
    fix: "Identical contributors are still two contributors: the + is shared by both end carbons.",
  },
  "rad-ring-locked": {
    text: "A C=C inside a ring is locked, so it cannot share a radical's odd electron.",
    fix: "A ring C=C next to the radical carbon shares the odd electron just as a chain C=C does.",
  },
  "rad-alkyl-hurts": {
    text: "Alkyl groups destabilise a radical, as they destabilise a carbanion.",
    fix: "A radical carbon is one electron short of an octet, so electron donation from alkyl groups helps it.",
  },
  // Stage B: HX and X2 on dienes. An H+ mix-up stands only against an HX item, a halogen one only against X2.
  "add-inner-proton": {
    text: "H+ adds to an inner carbon of the diene.",
    fix: "H+ adds to an end carbon. Only that leaves a cation next to the other C=C, so the charge can spread.",
  },
  "add-x-on-subst": {
    text: "A halogen on a 3° carbon makes the product more stable, as a 3° carbon steadies a +.",
    fix: "Halogen position does not set which of these products is more stable; the substitution of the C=C does.",
  },
  "hx-less-subst-cation": {
    text: "H+ goes on the end carbon that leaves the less substituted cation.",
    fix: "H+ goes on the end that leaves the better allylic cation, with more carbons on its charged carbons.",
  },
  "kvt-thermo-is-fast": {
    text: "The thermodynamic product is the one that forms faster.",
    fix: "The one that forms faster is the kinetic product; the thermodynamic one sits in the deeper well.",
  },
  // Only on a cold item, where a believer draws the more stable product, the 1,4 one with the more substituted C=C.
  "kvt-stable-is-fast": {
    text: "The more stable product is always the quicker one to form.",
    fix: "How fast a product forms is set by its hump, and how stable it is by its well. The two need not match.",
  },
  "x2-equiv-both": {
    text: "One equivalent of X2 adds to both C=C bonds of a diene.",
    fix: "One equivalent saturates one C=C; it takes two to saturate both.",
  },
  "x2-halonium-closed": {
    text: "X2 adds only 1,2 to a diene, because the halonium ion never opens.",
    fix: "With a diene the halonium ion opens to an allylic cation, so both ends are reachable.",
  },
  // Stage C: NBS.
  "nbs-adds-across": {
    text: "NBS adds Br across the C=C, as a bottle of Br2 does.",
    fix: "NBS keeps Br2 at a trace, too little for Br2 to add across the C=C.",
  },
  "nbs-vinylic": {
    text: "The vinylic C-H, on a carbon of the C=C, breaks first.",
    fix: "A vinylic C-H is one of the strongest C-H bonds: the radical it would leave sits at right angles to the pi bond.",
  },
  "nbs-least-crowded": {
    text: "Br• takes the least crowded H, at the far end of the chain.",
    fix: "Crowding barely matters to Br•. An end CH3 has 1° C-H bonds, the strongest sp3 C-H bonds in the chain.",
  },
  "nbs-conc-br2": {
    text: "Concentrated Br2 makes allylic bromination cleaner.",
    fix: "Allylic selectivity needs Br2 dilute; concentrated Br2 adds across the C=C.",
  },
  "nbs-hbr-peroxide": {
    text: "HBr with a peroxide works by radicals, so it brominates the allylic C-H.",
    fix: "HBr with a peroxide adds H and Br across the C=C, anti-Markovnikov, by a radical chain.",
  },
  // Stage D: Diels-Alder.
  "phile-delta-on-attached": {
    text: "A withdrawing group puts δ+ on the C=C carbon it is attached to.",
    fix: "The pull leaves δ+ on the far CH2 of the dienophile, not on the carbon carrying the group.",
  },
  "diene-c2-delta-far": {
    text: "A donor on diene C2 sends δ− to the far end, C4.",
    fix: "A donor on C2 pushes density onto C1, the end beside it, so δ− sits on C1.",
  },
  // Numbered as the name on screen numbers it: (E)-penta-1,3-diene has its methyl on C4 and its CH2 end at C1.
  "diene-c4-methyl-self": {
    text: "The methyl on diene C4 puts δ− on C4, the carbon it sits on.",
    fix: "A donor on C4 pushes density through the pi system to the far end, so δ− sits on C1, the CH2 end.",
  },
  "st-trans-stabler": {
    text: "The trans product is more stable, so the two esters end up trans.",
    fix: "Which product is more stable does not decide this: once a ring carbon is sp3, nothing here lets it trade its two groups.",
  },
  "st-heat-scramble": {
    text: "Heat flips ring groups between faces after the ring forms, so both relations form.",
    fix: "Moving a group to the other face would mean breaking one of its bonds, and heat alone does not do that here.",
  },
};

/** One rule step: its right reason (the explanation's first sentence when absent) and its wrong reasons by id. */
export interface SayWhyStep {
  readonly reason?: string;
  readonly mixups: readonly string[];
}

const WARM_REFORM = "The products can re-form, so the more stable one builds up.";
const COLD = "Nothing reverses, so the product that forms faster stays.";
const JOIN = "Join the diene's δ− end to the dienophile's δ+ end.";
const FIND_DONOR = "Find the donor's δ− end, then join it to the dienophile's δ+ end.";
const FIND_SUBST = "Find the substituent's δ− end, then join it to the dienophile's δ+ end.";
const NO_ROTATE = "Both sigma bonds form at once, so neither dienophile carbon can rotate.";
const TWO_SUBST = ["phile-delta-on-attached", "diene-c2-delta-far"] as const;

/**
 * THE ALLOWLIST. Every Unit 1 rule step, and the only mix-ups it may offer.
 * The comment on each line names the wrong option each mix-up leads to;
 * scripts/u1_saywhy_routes.py rebuilds each of those routes with RDKit and
 * matches it to the option's name with OPSIN. test/sayWhy.test.ts fails if a
 * step offers anything else, and runs every Unit 1 item through the builder.
 */
export const SAY_WHY_STEPS: Readonly<Record<string, SayWhyStep>> = {
  // Cations and radicals.
  "u1-qa-no-resonance": { mixups: ["cat-ring-locked", "cat-identical-one"] }, // cyclohex-2-enyl; allyl
  "u1-rad-ring": { reason: "For radicals, resonance counts for more than substitution.", mixups: ["rad-ring-locked", "rad-alkyl-hurts"] }, // 3° above allylic; 2° above 3°
  // HX on dienes.
  // A believer in either mix-up picks the 1,2 product, Cl or Br on the 3° carbon: the kinetic one.
  "u1-hx-label-thermo": { mixups: ["kvt-thermo-is-fast", "add-x-on-subst"] }, // 4-chloro-4-methylpent-2-ene, both
  "u1-qb-mp2-warm": { reason: "The products can re-form, so the one with the more substituted alkene wins.", mixups: ["add-x-on-subst", "kvt-thermo-is-fast"] }, // 4-bromo-4-methylpent-2-ene, both
  "u1-hx-dmb-warm": { reason: "The products can re-form, so the one with the more substituted alkene wins.", mixups: ["add-x-on-subst", "add-inner-proton"] }, // 3-bromo-2,3-dimethylbut-1-ene; 4-bromo-2,3-dimethylbut-1-ene
  "u1-hx-mp4-warm": { reason: "The more stable product wins, and alkene substitution decides which.", mixups: ["add-x-on-subst", "hx-less-subst-cation"] }, // 4-bromo-4-methylpent-2-ene; 3-bromo-4-methylpent-1-ene or 1-bromo-4-methylpent-2-ene
  "u1-hx-dmb-cold": { reason: COLD, mixups: ["add-inner-proton", "kvt-stable-is-fast"] }, // 4-bromo-2,3-dimethylbut-1-ene; 1-bromo-2,3-dimethylbut-2-ene
  // X2 on dienes.
  "u1-x2-warm-br": { reason: WARM_REFORM, mixups: ["x2-equiv-both", "x2-halonium-closed"] }, // 1,2,3,4-tetrabromobutane; 3,4-dibromobut-1-ene
  "u1-x2-dmb-warm": { reason: WARM_REFORM, mixups: ["x2-equiv-both", "x2-halonium-closed"] }, // the tetrachloride; 3,4-dichloro-2,3-dimethylbut-1-ene
  "u1-x2-isoprene-warm": { reason: "Products re-form, so the dihalide with the better alkene wins.", mixups: ["x2-halonium-closed", "add-x-on-subst"] }, // either 1,2 dibromide; 3,4-dibromo-3-methylbut-1-ene
  "u1-qb-isoprene-cl2": { reason: "Products re-form, so the dihalide with the better alkene wins.", mixups: ["x2-halonium-closed", "add-x-on-subst"] }, // either 1,2 dichloride; 3,4-dichloro-3-methylbut-1-ene
  "u1-x2-draw-warm": { reason: "The more stable dibromide wins; alkene substitution decides which.", mixups: ["x2-halonium-closed", "x2-equiv-both"] }, // 3,4-dibromobut-1-ene; 1,2,3,4-tetrabromobutane
  "u1-x2-dmb-cold": { reason: COLD, mixups: ["x2-equiv-both", "kvt-stable-is-fast"] }, // 1,2,3,4-tetrabromo-2,3-dimethylbutane; 1,4-dibromo-2,3-dimethylbut-2-ene
  // NBS.
  "u1-cd-nbsp-cyclopentene": { reason: "Put Br on the allylic carbon, then check the shifted product.", mixups: ["nbs-adds-across", "nbs-vinylic"] }, // trans-1,2-dibromide; 1-bromocyclopentene
  "u1-cd-nbsp-hexene-site": { reason: "NBS takes the H whose radical can be shared by resonance.", mixups: ["nbs-vinylic", "nbs-least-crowded"] }, // C2; C6
  "u1-cd-nbsp-isobutylene": { reason: "Equivalent allylic H and equivalent radical ends give one product.", mixups: ["nbs-adds-across", "nbs-vinylic"] }, // the 1,2-dibromide; 1-bromo-2-methylpropene
  "u1-cd-nbsp-reagents": { mixups: ["nbs-conc-br2", "nbs-hbr-peroxide"] }, // a Br2 reagent; HBr with a peroxide
  "u1-cd-nbs-draw-cyclopentene": { reason: "Br goes on the allylic carbon, and both radical ends match.", mixups: ["nbs-adds-across", "nbs-vinylic"] },
  "u1-cd-qc-draw-isobutylene": { mixups: ["nbs-adds-across", "nbs-vinylic"] },
  // Diels-Alder.
  // Regiochemistry, a 2-substituted diene (isoprene, 2-methoxybutadiene): the true δ− end is C1, beside the
  // group. Either mix-up joins diene C1 to the dienophile carbon that carries the group (directly, or by
  // sending C4 to the CH2), and RDKit puts the two groups 1,3 on the ring. Neither leads to 1,2; no
  // pairing of a 2-substituted diene's ends gives a 1,2 product.
  "u1-cd-pred-para-ester": { reason: JOIN, mixups: TWO_SUBST }, // 1,3 on the ring
  "u1-cd-pred-para-ome": { reason: FIND_DONOR, mixups: TWO_SUBST }, // 1,3 on the ring
  "u1-cd-pred-draw-para": { reason: FIND_SUBST, mixups: TWO_SUBST }, // 3-methylcyclohex-3-ene-1-carbaldehyde
  "u1-cd-qd-para-ketone": { reason: JOIN, mixups: TWO_SUBST }, // ketone 1,3 to the methyl
  "u1-cd-ex-para-ome-ester": { reason: FIND_DONOR, mixups: TWO_SUBST }, // ester 1,3 to the OCH3
  "u1-cd-exam-draw-mvk": { reason: FIND_SUBST, mixups: TWO_SUBST }, // the ketone 1,3 to the methyl
  // (E)-Penta-1,3-diene, methyl on C4: the true δ− end is C1. Either mix-up joins C1 to the carbon with the ester: 1,3.
  "u1-cd-qd-ortho-ester": { reason: JOIN, mixups: ["phile-delta-on-attached", "diene-c4-methyl-self"] }, // ester 1,3 to the methyl
  // Stereospecificity, the cis dienophile: trans; a mixture.
  "u1-cd-st-cis": { reason: NO_ROTATE, mixups: ["st-trans-stabler", "st-heat-scramble"] },
  "u1-cd-st-draw-maleate": { reason: NO_ROTATE, mixups: ["st-trans-stabler", "st-heat-scramble"] },
  "u1-cd-3d-maleate": { reason: NO_ROTATE, mixups: ["st-trans-stabler", "st-heat-scramble"] },
};
