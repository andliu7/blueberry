/**
 * Authored read-along explainers for Unit 1's video lessons. Written 30 Oct
 * (round 2 of the unit style guide piece) because no video is filmed: the
 * walk-throughs in lessonPath.ts are quotes lifted from question
 * explanations, which tell a stuck student WHAT to do but never WHY. An
 * explainer is the teaching itself, in the order a tutor would say it, a
 * handful of short cards a student steps through. It is NOT a video and the
 * screen says so ("read-along"); it is also the script the clip will be
 * filmed from, so page and clip will agree.
 *
 * ROUND 4 (30 Oct): a card may carry a drawing (`draw`). The drawing is never
 * typed here. It is a POINTER to a structure the lesson's own question
 * already shows (`{ beat }`, resolved through mcqVisualFor) or to a figure
 * the RDKit script wrote (`{ figure }`, from CD_FIGURES), so every structure
 * on a card is RDKit-derived and sits next to the sentence that explains it.
 * beats/LessonHelp.tsx plays the cards as a narrated drawing: the picture
 * changes with each card and the student may press Listen to hear it read.
 *
 * RULES. Prose in the card; structures only by pointer, never typed here
 * (structures must be derived with RDKit).
 * Each explainer leans only on ideas an earlier lesson taught (`uses` names
 * them; test/u1LessonPath.test.ts holds it to the lesson chain). No
 * arithmetic, no calculator, no trivia. Drafts until the owner signs them
 * off, like the rest of Unit 1.
 */

export interface ExplainerCard {
  /** Four or five words. */
  readonly heading: string;
  /** One to three sentences, at most 320 characters. */
  readonly body: string;
  /**
   * The drawing shown beside this card: one or two pointers, never typed
   * structures. `beat` names a pool question whose drawing (a structure, or
   * one half of a pair via `part`) is reused; `figure` names an RDKit-derived
   * entry of CD_FIGURES and carries its own caption.
   */
  readonly draw?: readonly ExplainerDrawing[];
  /** An energy-diagram scenario id (energy/energyModel.ts SCENARIOS) drawn beside this card. */
  readonly energy?: string;
  /**
   * Show the interactive energy diagram (energy/EnergyLab.tsx) under this card.
   * "temp" opens it on its Cold or warm tab (butadiene and HBr, Unit 1 review suggestion 6).
   */
  readonly lab?: true | "temp";
  /**
   * A turnable 3-D model set (content/u1/models.ts U1_MODEL_SETS) shown under
   * this card (Unit 1 review suggestion 9): endo and exo are spatial ideas.
   */
  readonly model?: string;
}

export type ExplainerDrawing =
  | { readonly beat: string; readonly part?: "a" | "b" }
  | { readonly figure: string; readonly name: string }
  /** A stage A or B worked-example drawing (stage-ab.ts STAGE_AB_WORKED_FIGURES), caption included. */
  | { readonly worked: string };

export interface Explainer {
  /** Honest reading time, in minutes, for the whole card set. */
  readonly minutes: number;
  /**
   * A WORKED EXAMPLE rather than a read-along (ADDED 3 Nov, Unit 1 review
   * suggestion 1): one problem solved step by step, each card narrating the
   * decision at that step. Shown on the lesson preview before the first
   * question, headed "Worked example".
   */
  readonly worked?: true;
  /** Concept ids this explainer leans on; each is taught earlier, or lives in Unit 0. */
  readonly uses: readonly string[];
  readonly cards: readonly ExplainerCard[];
}

export const U1_EXPLAINERS: Readonly<Record<string, Explainer>> = {
  /*
   * WORKED EXAMPLES (ADDED 3 Nov, Unit 1 review suggestion 1). One per
   * practice lesson, shown on the lesson preview before the first question
   * (beats/LessonPreview.tsx, DrawnLesson). Each solves one problem the way a
   * tutor would at the board, saying WHY at every step; workedFade.ts then
   * fades it: the lesson's first question carries the first step, the next
   * carries nothing.
   *
   * CHANGED 3 Nov (checker): each example used to solve a question that then
   * came up in its own lesson, so the student re-answered a problem whose
   * answer they had just read, and the score measured recall. Each now solves a
   * DIFFERENT problem of the same kind, on species no question in that lesson
   * draws: cyclopentyl and cyclopent-2-enyl cations, the 2-methylallyl anion,
   * the cyclopent-2-enyl radical, a K/T diagram of its own,
   * 2-ethylbuta-1,3-diene with HBr and with Br2, pent-1-ene with NBS,
   * 2-methoxybutadiene with methyl vinyl ketone, and 2,3-dimethylbutadiene with
   * dimethyl maleate. Every call is derived by the generators (u1_pools_ab.py
   * node_worked; u1_pools_cd.py sections 1, 3 and 5), and each drawing is a
   * worked-example figure the script wrote (`worked`, or `figure`), so none is
   * a question's own drawing. test/u1LessonPath.test.ts holds this.
   */
  "u1-rank-cation": {
    minutes: 2,
    worked: true,
    uses: ["u1:allylic"],
    cards: [
      { heading: "The problem", body: "Rank three cations, most stable first: propyl (1°), cyclopentyl (2°) and cyclopent-2-enyl (2° allylic). Score every one on two things before you rank.", draw: [{ worked: "cation-cyclopentyl" }, { worked: "cation-cyclopentenyl" }] },
      { heading: "Step 1: count carbons", body: "Count the carbons bonded to each charged carbon. Propyl's has one. Cyclopentyl's has two, and so does each end of cyclopent-2-enyl. Each carbon neighbour donates into the empty p orbital, so more is better.", draw: [{ worked: "cation-propyl" }, { worked: "cation-cyclopentyl" }] },
      { heading: "Step 2: look next door", body: "Now look one bond over for a C=C. Only cyclopent-2-enyl has one, so its charge is shared by two carbons. Propyl and cyclopentyl have none, so their charge stays on one carbon.", draw: [{ worked: "cation-cyclopentenyl" }] },
      { heading: "Step 3: put them together", body: "Cyclopent-2-enyl first: as many carbons as cyclopentyl, plus resonance. Then cyclopentyl, 2° against propyl's 1°. A cation that is as good on every count and better on one ranks higher." },
      { heading: "Take this with you", body: "Score every cation on substitution and on resonance. Resonance is worth about one extra carbon, so 1° allylic sits near 2° alkyl, and a cation with both wins." },
    ],
  },
  "u1-rank-anion": {
    minutes: 2,
    worked: true,
    uses: ["u1:allylic", "u1:cation-ranking"],
    cards: [
      { heading: "The problem", body: "Rank three carbanions: isobutyl (1°), isopropyl (2°) and 2-methylallyl. A carbanion carries a full lone pair, so ask what each neighbour does to extra electrons.", draw: [{ worked: "anion-isopropyl" }, { worked: "anion-methallyl" }] },
      { heading: "Step 1: flip the alkyl trend", body: "Alkyl groups push density toward the charged carbon. That helps an empty orbital and hurts a full one, so for anions fewer alkyl groups is better: isobutyl, 1°, beats isopropyl, 2°.", draw: [{ worked: "anion-isobutyl" }, { worked: "anion-isopropyl" }] },
      { heading: "Step 2: check for resonance", body: "The 2-methylallyl lone pair can slide into the C=C next door, so its two CH2 ends share the charge. Its methyl sits on the middle carbon, which never carries the charge, so it costs nothing.", draw: [{ worked: "anion-methallyl" }] },
      { heading: "Step 3: the order", body: "2-Methylallyl first, for resonance with no alkyl group on a charged carbon. Then isobutyl, then isopropyl. If the lone pair sat in an sp or sp2 orbital, more s character would steady it too." },
      { heading: "Take this with you", body: "For anions, resonance and s character help and alkyl groups hurt. Same resonance rule as cations, opposite alkyl rule." },
    ],
  },
  "u1-rank-radical": {
    minutes: 3,
    worked: true,
    uses: ["u1:allylic", "u1:cation-ranking", "u0:radical"],
    cards: [
      { heading: "The problem", body: "Which radical is more stable: cyclopent-2-enyl or tert-butyl? Same two scores as cations, resonance and substitution, but the weights change.", draw: [{ worked: "radical-cyclopentenyl" }, { worked: "radical-tbu" }] },
      { heading: "Step 1: look for resonance", body: "Cyclopent-2-enyl has a C=C next to the radical carbon, so the odd electron is shared by two carbons. tert-Butyl has no C=C at all.", draw: [{ worked: "radical-cyclopentenyl" }] },
      { heading: "Step 2: count carbons", body: "A radical is one electron short of an octet, so carbons on the radical carbon help, as for cations. tert-Butyl is 3°. Each end of cyclopent-2-enyl is only 2°.", draw: [{ worked: "radical-tbu" }] },
      { heading: "Cations and radicals differ", body: "For cations, resonance is worth about one carbon, so 1° allylic sits near 2°. For radicals it is worth more. Alkyl groups help an empty orbital a lot and a half-filled one only a little, so for radicals resonance dominates." },
      { heading: "Step 3: the order", body: "Cyclopent-2-enyl wins. For radicals resonance comes first, so a 2° allylic radical beats a 3° alkyl one. The matching cations would only tie." },
      { heading: "Take this with you", body: "For radicals: resonance first, then substitution. The weaker the help from alkyl groups, the more resonance decides." },
    ],
  },
  "u1-energy-diagram": {
    minutes: 2,
    worked: true,
    uses: ["u1:kinetic-thermo"],
    cards: [
      { heading: "The problem", body: "One start can give K or T. Which is major cold, and which warm? Read both answers straight off the diagram.", draw: [{ worked: "ed-diagram" }] },
      { heading: "Step 1: read the humps", body: "From the start, the hump to K is lower. A lower hump is crossed more often, so K forms faster: K is the kinetic product.", draw: [{ worked: "ed-diagram" }] },
      { heading: "Step 2: read the wells", body: "T sits in the deeper well. A deeper well is more stable, so T is the thermodynamic product. Speed and stability are read separately, and here they disagree.", draw: [{ worked: "ed-diagram" }] },
      { heading: "Step 3: apply the conditions", body: "Cold, nothing climbs back out, so K wins. Warm and reversible, products cross back over the humps and re-sort, so T wins. Try both in the lab below.", lab: true },
      { heading: "Take this with you", body: "Humps are speed, wells are stability. Cold reads the humps, warm reads the wells. Every two-product diagram in this unit works the same way, butadiene and HBr included." },
    ],
  },
  "u1-hx-dienes": {
    minutes: 3,
    worked: true,
    uses: ["u1:diene-addition", "u1:kinetic-thermo"],
    cards: [
      { heading: "The problem", body: "HBr adds to 2-ethylbuta-1,3-diene at minus 80 degrees. Find the major product in three steps: protonate, find the shared charge, read the temperature.", draw: [{ worked: "hx-diene" }] },
      { heading: "Step 1: protonate the right end", body: "H+ goes on an end carbon. On C1, next to the carbon with the ethyl, it leaves the charge on a 3° carbon, shared with C4. On C4 it would leave only a 2° allylic cation. So C1.", draw: [{ worked: "hx-cation" }, { worked: "hx-cation-c4" }] },
      { heading: "Step 2: two places for bromide", body: "The charge is shared by C2 and C4. Bromide on C2 gives the 1,2 product. Bromide on C4 gives the 1,4 product, with the C=C moved to C2=C3.", draw: [{ worked: "hx-p12" }, { worked: "hx-p14" }] },
      { heading: "Step 3: read the temperature", body: "Minus 80 degrees: nothing reverses, so the faster product is locked in. That is 1,2: bromide is still next to C2, and C2 holds more of the charge. The product is 3-bromo-3-methylpent-1-ene." },
      { heading: "If it were warm", body: "At 40 degrees the products re-sort and the one whose C=C carries more carbons wins: here the 1,4 product, three carbons on its C=C against one. Count the carbons every time; do not assume 1,4." },
      { heading: "Take this with you", body: "Protonate the end that gives the better cation, find both charged carbons, then let the temperature choose: cold 1,2, warm the better alkene." },
    ],
  },
  "u1-x2": {
    minutes: 2,
    worked: true,
    uses: ["u1:temperature-picks"],
    cards: [
      { heading: "The problem", body: "One equivalent of Br2 adds to 2-ethylbuta-1,3-diene, the diene from the HX example. Find the 1,4 product. The plan is HX's, with Br+ in the place of H+.", draw: [{ worked: "hx-diene" }] },
      { heading: "You met the bromonium", body: "In Orgo I, Br2 on an alkene made a bromonium ion. With a diene the bromonium opens to an allylic cation, so both ends are reachable. The two lessons agree." },
      { heading: "Step 1: Br+ on C1", body: "Br+ adds to C1, next to the carbon with the ethyl, for the same reason H+ did: the cation left is 3° at C2, and the charge is shared with C4.", draw: [{ worked: "x2-cation" }] },
      { heading: "Step 2: bromide on C4", body: "Bromide on C4 gives the 1,4 product: Br on C1 and C4, and the C=C moves to C2=C3. That is 1,4-dibromo-2-ethylbut-2-ene. Bromide on C2 would give 3,4-dibromo-3-ethylbut-1-ene, the 1,2 product.", draw: [{ worked: "x2-p12" }, { worked: "x2-p14" }] },
      { heading: "Step 3: the temperature", body: "Same rule as HX. Cold keeps the faster 1,2 dihalide. Warm and reversible gives the dihalide whose C=C carries more carbons." },
      { heading: "Take this with you", body: "X2 on a diene: X+ on C1, then X- on C2 or C4. Same allylic cation, same temperature rule as HX." },
    ],
  },
  "u1-nbs-practice": {
    minutes: 2,
    worked: true,
    uses: ["u1:allylic-halogenation"],
    cards: [
      { heading: "The problem", body: "Pent-1-ene meets NBS and light. Find every product. Three steps: find the allylic H, spread the radical, put Br on each end.", draw: [{ figure: "pent1ene", name: "pent-1-ene" }] },
      { heading: "Step 1: find the allylic carbon", body: "C3 is bonded to a carbon of the C=C, so it is allylic. Its C-H is the weakest in the molecule, so the Br radical takes that H." },
      { heading: "Step 2: spread the radical", body: "The radical on C3 is shared with C1 through the C=C. Draw both contributors before you place any Br, because each end can pick one up." },
      { heading: "Step 3: Br on each end", body: "Br on C3 gives 3-bromopent-1-ene. Br on C1 moves the C=C to C2=C3 and gives 1-bromopent-2-ene. Two products.", draw: [{ figure: "bromopent1ene3", name: "3-bromopent-1-ene" }, { figure: "bromopent2ene1", name: "1-bromopent-2-ene" }] },
      { heading: "Take this with you", body: "Find the allylic H, draw both ends of the radical, then count the different products. Light or ROOR does not change them." },
    ],
  },
  "u1-da-predict": {
    minutes: 3,
    worked: true,
    uses: ["u1:dienophile"],
    cards: [
      { heading: "The problem", body: "2-Methoxybuta-1,3-diene plus methyl vinyl ketone, heat. The two partners can line up two ways. Orgo I resonance tells you which way wins.", draw: [{ figure: "methoxybutadiene2", name: "2-methoxybuta-1,3-diene" }, { figure: "mvk", name: "methyl vinyl ketone" }] },
      { heading: "Step 1: the diene's δ− end", body: "The O lone pair pushes in: O forms a double bond to C2, and the C1=C2 pair slides onto C1. So C1, the CH2 beside the OCH3 carbon, is δ−.", draw: [{ figure: "methoxybutadiene2", name: "2-methoxybuta-1,3-diene" }] },
      { heading: "Step 2: the dienophile's δ+ end", body: "The ketone pulls: the C=O pair moves onto O, the C=C pair slides after it, and the far CH2 is left δ+. That is the Orgo I reason a C=O withdraws.", draw: [{ figure: "mvk", name: "methyl vinyl ketone" }] },
      { heading: "Step 3: join δ− to δ+", body: "Bond C1 to the CH2, then close the ring from C4 to the carbon carrying the acetyl group. OCH3 and the acetyl end up across the ring: the 1,4 product. Chemists call it para, a nickname from benzene the aromatic unit explains.", draw: [{ figure: "paraKetoneOMe", name: "the 1,4 product" }] },
      { heading: "The orbital version", body: "Same answer in orbital terms: the diene's biggest HOMO lobe meets the dienophile's biggest LUMO lobe. That is why a 2-substituted diene gives 1,4 and a 1-substituted one gives 1,2." },
      { heading: "Take this with you", body: "Find δ− on the diene, δ+ on the dienophile, join them, then close the ring. Name it 1,2 or 1,4 on the ring." },
    ],
  },
  "u1-da-3d": {
    minutes: 2,
    worked: true,
    uses: ["u1:da-stereo"],
    cards: [
      { heading: "The problem", body: "2,3-Dimethylbutadiene plus dimethyl maleate, heat. Draw the product with wedges. Two rules from the last lesson decide it.", draw: [{ figure: "dimethylbutadiene", name: "2,3-dimethylbuta-1,3-diene" }, { figure: "dimethylmaleate", name: "dimethyl maleate" }] },
      { heading: "Step 1: the flat ring", body: "Close the cyclohexene: new bonds at the diene's ends, the C=C between its old C2 and C3, which keep their methyls, and the two esters on the sp3 carbons the dienophile supplied." },
      { heading: "Step 2: carry the geometry", body: "Maleate's esters are cis, on one side of its C=C. Both new bonds form on one face at once, so they stay cis: draw both esters wedged, or both dashed." },
      { heading: "Step 3: name what forms", body: "The cis diester has a mirror plane through the ring, so it is meso: one compound, not a pair of mirror images. Look for that plane before you call any product a pair.", draw: [{ figure: "st-dmbdiester-cis", name: "the cis diester, meso" }] },
      { heading: "Endo and exo, the same picture", body: "Endo against exo is kinetic against thermodynamic again, the same idea as 1,2 against 1,4: endo has the lower hump. Turn the two adducts below and ask which one each condition keeps.", model: "endo-exo" },
      { heading: "Take this with you", body: "Flat ring first, then cis stays cis, then endo when it is cold. Check for a mirror plane before you call it a pair." },
    ],
  },
  "u1-allylic": {
    minutes: 2,
    uses: ["u0:resonance", "u0:carbocation"],
    cards: [
      { heading: "Why this word matters", body: "Almost every reaction in this unit makes a charged carbon or a radical. Whether that carbon is allylic decides if the charge stays put or spreads out, and spread-out charge is what makes a species stable." },
      { heading: "You already know this", body: "Orgo I: a 3° carbocation beats a 1° one in SN1 because neighbouring C-H and C-C bonds donate into the empty p orbital (hyperconjugation) and alkyl groups push density in (induction). This unit adds a third helper, a C=C next door." },
      { heading: "What allylic means", body: "A carbon is allylic when it is bonded to a carbon of a C=C. Look at the charged carbon, then look one bond over. If you find a double bond there, you are allylic.", draw: [{ beat: "u1-allylic-pick" }] },
      { heading: "Slide the pi pair", body: "The C=C electrons can slide toward the charge. Only electrons move. Every atom stays where it is, so the two drawings are the same molecule seen two ways, which is exactly what resonance means.", draw: [{ beat: "u1-allylic-moves" }] },
      { heading: "Where the charge ends up", body: "After the slide, the charge sits on the far end of the old C=C. The two end carbons share it. The middle carbon never carries it, because it keeps four bonds in every drawing.", draw: [{ beat: "u1-allylic-where" }] },
      { heading: "Take this with you", body: "Allylic means next to a C=C. A charge there is shared by the two end carbons. You will use this in every lesson that follows." },
    ],
  },
  "u1-12v14": {
    minutes: 3,
    uses: ["u1:allylic", "u1:cation-ranking", "u0:hx-addition"],
    cards: [
      { heading: "The surprise", body: "HBr added to a simple alkene gives one product. Added to a conjugated diene it can give two. The reason is the allylic cation from the first lesson." },
      { heading: "Step one: protonate an end", body: "The H+ goes to an END carbon of the diene. That leaves a cation next to the remaining C=C, so it is allylic and the charge can spread. Protonating an inner carbon would leave a cation with nothing to share it with.", draw: [{ beat: "u1-12v14-protonate" }] },
      { heading: "Step two: two places to attack", body: "The charge is shared by two carbons, C2 and C4. The bromide can bond to either one, so one cation gives two products.", draw: [{ beat: "u1-12v14-which-carbon" }] },
      { heading: "Name the products", body: "Bromide on C2 is the 1,2 product: H and Br on neighbouring carbons. Bromide on C4 is the 1,4 product: H on C1, Br on C4, and the double bond moves to sit between C2 and C3.", draw: [{ figure: "bromobutene3", name: "1,2 product: 3-bromobut-1-ene" }, { figure: "bromobutene1", name: "1,4 product: 1-bromobut-2-ene" }] },
      { heading: "Take this with you", body: "Make the allylic cation first, then attack at either charged carbon. Both products climb out of that one cation. Which one wins is the next lesson, and it depends on temperature.", energy: "butadiene-hbr" },
    ],
  },
  "u1-kvt": {
    minutes: 3,
    uses: ["u1:diene-addition", "u0:equilibrium"],
    cards: [
      { heading: "The question left open", body: "A diene plus HBr can give a 1,2 and a 1,4 product from the same cation. Neither is a mistake. Which one you mostly get depends on what you ask of the reaction." },
      { heading: "Two different questions", body: "Which product forms fastest? Which product is the most stable? These are separate questions and can have different answers. Speed is the height of the hump the reaction must climb. Stability is how deep the finished product sits.", draw: [{ beat: "u1-kvt-read-both" }] },
      { heading: "You already know this", body: "Orgo I: ΔG sets Keq and the barrier Ea sets the rate. Hammond adds one more: the transition state looks like the species nearest it in energy, so the more stable cation has the earlier, lower transition state.", energy: "butadiene-hbr" },
      { heading: "Kinetic means fastest", body: "The kinetic product has the lowest hump, so it forms first. When the reaction is cold, products cannot climb back out, so whatever forms fastest is what you keep. For butadiene and HBr that is 1,2, about 71:29 at 0 degrees.", energy: "butadiene-hbr" },
      { heading: "Thermodynamic means most stable", body: "The thermodynamic product sits in the deepest well. When the reaction is warm and reversible, products can climb out, go back and re-sort. Given time, most of the material ends up in the deepest well.", draw: [{ beat: "u1-kvt-settle" }] },
      { heading: "Take this with you", body: "Cold and irreversible: the lower hump wins. Warm and reversible: the deeper well wins, about 15:85 for butadiene and HBr at 40 degrees. Flip the temperature below and watch the ratio change.", lab: "temp" },
    ],
  },
  "u1-nbs": {
    minutes: 2,
    uses: ["u1:allylic", "u0:radical"],
    cards: [
      { heading: "A different goal", body: "Until now Br added across a C=C. Here we want to keep the C=C and swap one allylic H for Br instead. The reagent for that job is NBS." },
      { heading: "Why the allylic H goes first", body: "A radical chain breaks the weakest C-H bond first. The allylic C-H is the weakest, because the radical it leaves is spread over two carbons, the same sharing idea as the allylic cation.", draw: [{ beat: "u1-cd-nbs-weakest" }] },
      { heading: "Why the C=C survives", body: "NBS releases Br2 only a trace at a time. With so little Br2 around, it does not add across the C=C. It only has time to react at the radical, so the allylic H is what gets replaced.", draw: [{ figure: "nbs", name: "NBS: a trace of Br2 at a time" }] },
      { heading: "You already know this", body: "Orgo I alkane halogenation ran the same chain: initiation makes a Br radical, propagation pulls an H off and passes the radical on, termination joins two radicals. Here the H it pulls is allylic." },
      { heading: "Light or ROOR", body: "Light and ROOR do the same job: they start the chain. Which one a question uses does not change the product." },
      { heading: "Take this with you", body: "NBS plus an initiator: find the allylic H, swap it for Br, keep the C=C. Because the radical is shared, the double bond can shift, so check both ends.", draw: [{ figure: "bromocyclohexene3", name: "Br on the allylic carbon, C=C kept" }] },
    ],
  },
  "u1-mo": {
    minutes: 3,
    uses: ["u0:orbitals", "u0:resonance"],
    cards: [
      { heading: "Why orbitals again", body: "Diels-Alder cannot be explained with curved arrows alone. It is explained by which filled orbital meets which empty one. This lesson builds the picture you need." },
      { heading: "n in, n out", body: "Every p orbital in a conjugated chain joins the combination. n p orbitals make n pi molecular orbitals, called MOs. Butadiene has four p orbitals, so it has four MOs.", draw: [{ beat: "u1-cd-mo-count" }] },
      { heading: "Fill from the bottom", body: "Put two electrons in each MO, lowest energy first, like filling seats from the front. Butadiene has four pi electrons, so the bottom two MOs are full.", draw: [{ beat: "u1-cd-mo-bd-homo" }] },
      { heading: "HOMO and LUMO", body: "The highest filled MO is the HOMO. The lowest empty one, just above it, is the LUMO. Reactions happen between a HOMO on one molecule and a LUMO on the other.", draw: [{ beat: "u1-cd-mo-bd-lumo" }] },
      { heading: "You already know this", body: "Orgo I sorted groups into donors and withdrawers. OCH3 donates on a C=C even though O is electronegative: by resonance its lone pair pushes into the pi system, which beats its pull through the sigma bond. Stage D leans on this." },
      { heading: "Take this with you", body: "Count the p orbitals, fill from the bottom, then name the HOMO and the LUMO. That is all the next lesson asks of you." },
    ],
  },
  "u1-da": {
    minutes: 3,
    uses: ["u1:pi-mo"],
    cards: [
      { heading: "A reaction that builds rings", body: "Diels-Alder joins a diene and a dienophile into a six-membered ring in one step. The dienophile is the partner that supplies a C=C. It makes two carbon-carbon bonds at once.", draw: [{ beat: "u1-cd-da-ring" }] },
      { heading: "One step, no intermediate", body: "There is no cation and no radical. Both new sigma bonds form together while the pi bonds shift. That is why this lesson has no ladder of intermediates." },
      { heading: "What the product looks like", body: "Two new sigma bonds form at the diene's ends. The diene's middle single bond becomes the ring's C=C. With an alkene dienophile the product is a cyclohexene; an alkyne keeps one extra C=C.", draw: [{ figure: "cyclohexene", name: "the product: a cyclohexene" }] },
      { heading: "Why it works", body: "The diene's HOMO meets the dienophile's LUMO, with the lobes at the ends in phase, so both ends can bond at once. Orbitals that match mean the reaction is allowed.", draw: [{ beat: "u1-cd-da-orbitals" }] },
      { heading: "Take this with you", body: "Diene plus an alkene dienophile gives a cyclohexene; an alkyne keeps one extra C=C. Two new sigma bonds, and a C=C left between the diene's old C2 and C3." },
    ],
  },
  "u1-dienes": {
    minutes: 2,
    uses: ["u1:diels-alder"],
    cards: [
      { heading: "A diene has to fit", body: "In Diels-Alder both ends of the diene bond to the dienophile at the same time. That only works if the two ends can reach the same side." },
      { heading: "s-cis and s-trans", body: "Rotate about the middle single bond. In s-cis the two C=C bonds sit on the same side, with the ends close together. In s-trans they sit on opposite sides, with the ends far apart.", draw: [{ beat: "u1-cd-dienes-strans" }] },
      { heading: "Check the shape first", body: "Locked s-cis is fastest. A diene that can rotate is fine. Strained s-cis is slow. Locked s-trans does not react at all, because its ends can never reach the dienophile." },
      { heading: "Donors come second", body: "Donor groups on the diene speed the reaction, but only if the diene can reach s-cis first. A diene stuck in s-trans does not react however good its donors are.", draw: [{ beat: "u1-cd-dienes-edg-locked" }] },
      { heading: "Take this with you", body: "Shape first, donors second. If the diene cannot reach s-cis, stop there." },
    ],
  },
  "u1-dienophiles": {
    minutes: 2,
    uses: ["u1:diels-alder", "u1:pi-mo"],
    cards: [
      { heading: "The other partner", body: "The diene supplies electrons from its HOMO. The dienophile has to accept them into its LUMO. So the best dienophile is the one with the most welcoming LUMO.", draw: [{ beat: "u1-cd-phile-acn-role" }] },
      { heading: "Withdrawing groups help", body: "A group such as C=O, CN or NO2 pulls electron density away and lowers the dienophile's LUMO. A lower LUMO sits closer in energy to the diene's HOMO, so the reaction speeds up." },
      { heading: "Where the pull lands", body: "Orgo I resonance shows where. Slide the C=O pair onto O and the C=C pair after it: the far CH2 is left δ+. A donor on a diene does the reverse and leaves one end δ−. The next practice lesson joins the two." },
      { heading: "Donors slow it", body: "A donor group does the opposite: it raises the LUMO and the reaction slows down. This is the mirror of what donors do on the diene.", draw: [{ beat: "u1-cd-phile-ether-role" }] },
      { heading: "Where the group lands", body: "The dienophile's groups end up on the sp3 carbons of the new ring, across the ring from the C=C. The two carbons the dienophile supplied become sp3.", draw: [{ figure: "diestercyclohexene", name: "groups on the sp3 ring carbons" }] },
      { heading: "Take this with you", body: "A fast dienophile has a withdrawing group. In the product, its groups sit on the sp3 carbons." },
    ],
  },
  "u1-da-stereo": {
    minutes: 3,
    uses: ["u1:da-prediction"],
    cards: [
      { heading: "Why stereochemistry shows up", body: "You can already draw the ring. Now ask which way the groups point. Because the reaction happens in one step with both partners meeting face to face, the answer is predictable, not random." },
      { heading: "Cis stays cis", body: "Both new bonds form on the same face of the dienophile at the same moment. So groups that were cis on the dienophile are cis in the product, and trans stays trans.", draw: [{ beat: "u1-cd-st-cis" }] },
      { heading: "Endo is the kinetic choice", body: "The dienophile can approach with its withdrawing groups tucked under the diene (endo) or pointing away (exo). Under kinetic control the tucked-under approach is faster, so endo is the usual product. Turn the models: endo groups point under the C=C, away from the CH2 bridge.", draw: [{ beat: "u1-cd-st-endo" }], model: "endo-exo" },
      { heading: "Inside and outside", body: "Draw the diene s-cis. An end group pointing away from the other end is outside; one pointing into the gap is inside. Outside groups end up cis to each other in the ring; an inside and an outside group end up trans.", draw: [{ beat: "u1-cd-st-inside-outside" }] },
      { heading: "Bridged or fused", body: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one. Look at which partner carries the ring.", draw: [{ beat: "u1-cd-st-bridged" }] },
      { heading: "Take this with you", body: "Keep cis as cis, choose endo, then check bridged against fused. Every stereochemistry question in this unit comes from those three." },
    ],
  },
};
