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
  /** Show the interactive energy diagram (energy/EnergyLab.tsx) under this card. */
  readonly lab?: true;
}

export type ExplainerDrawing =
  | { readonly beat: string; readonly part?: "a" | "b" }
  | { readonly figure: string; readonly name: string };

export interface Explainer {
  /** Honest reading time, in minutes, for the whole card set. */
  readonly minutes: number;
  /** Concept ids this explainer leans on; each is taught earlier, or lives in Unit 0. */
  readonly uses: readonly string[];
  readonly cards: readonly ExplainerCard[];
}

export const U1_EXPLAINERS: Readonly<Record<string, Explainer>> = {
  "u1-allylic": {
    minutes: 2,
    uses: ["u0:resonance", "u0:carbocation"],
    cards: [
      { heading: "Why this word matters", body: "Almost every reaction in this unit makes a charged carbon or a radical. Whether that carbon is allylic decides if the charge stays put or spreads out, and spread-out charge is what makes a species stable." },
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
      { heading: "Take this with you", body: "Make the allylic cation first, then attack at either charged carbon. Which product wins is the next lesson, and it depends on temperature." },
    ],
  },
  "u1-kvt": {
    minutes: 3,
    uses: ["u1:diene-addition"],
    cards: [
      { heading: "The question left open", body: "A diene plus HBr can give a 1,2 and a 1,4 product from the same cation. Neither is a mistake. Which one you mostly get depends on what you ask of the reaction." },
      { heading: "Two different questions", body: "Which product forms fastest? Which product is the most stable? These are separate questions and can have different answers. Speed is the height of the hump the reaction must climb. Stability is how deep the finished product sits.", draw: [{ beat: "u1-kvt-read-both" }] },
      { heading: "Kinetic means fastest", body: "The kinetic product has the lowest hump, so it forms first. When the reaction is cold, products cannot climb back out, so whatever forms fastest is what you keep.", draw: [{ beat: "u1-kvt-define-kinetic" }] },
      { heading: "Thermodynamic means most stable", body: "The thermodynamic product sits in the deepest well. When the reaction is warm and reversible, products can climb out, go back and re-sort. Given time, most of the material ends up in the deepest well.", draw: [{ beat: "u1-kvt-settle" }] },
      { heading: "Take this with you", body: "Cold and irreversible: the lower hump wins. Warm and reversible: the deeper well wins. Read speed from the hump and stability from the well, and never mix them up." },
    ],
  },
  "u1-nbs": {
    minutes: 2,
    uses: ["u1:allylic", "u0:radical"],
    cards: [
      { heading: "A different goal", body: "Until now Br added across a C=C. Here we want to keep the C=C and swap one allylic H for Br instead. The reagent for that job is NBS." },
      { heading: "Why the allylic H goes first", body: "A radical chain breaks the weakest C-H bond first. The allylic C-H is the weakest, because the radical it leaves is spread over two carbons, the same sharing idea as the allylic cation.", draw: [{ beat: "u1-cd-nbs-weakest" }] },
      { heading: "Why the C=C survives", body: "NBS releases Br2 only a trace at a time. With so little Br2 around, it does not add across the C=C. It only has time to react at the radical, so the allylic H is what gets replaced.", draw: [{ figure: "nbs", name: "NBS: a trace of Br2 at a time" }] },
      { heading: "Light or ROOR", body: "Light and ROOR do the same job: they start the chain. Which one a question uses does not change the product." },
      { heading: "Take this with you", body: "NBS plus an initiator: find the allylic H, swap it for Br, keep the C=C. Because the radical is shared, the double bond can shift, so check both ends.", draw: [{ figure: "bromocyclohexene3", name: "Br on the allylic carbon, C=C kept" }] },
    ],
  },
  "u1-mo": {
    minutes: 3,
    uses: ["u0:orbitals"],
    cards: [
      { heading: "Why orbitals again", body: "Diels-Alder cannot be explained with curved arrows alone. It is explained by which filled orbital meets which empty one. This lesson builds the picture you need." },
      { heading: "n in, n out", body: "Every p orbital in a conjugated chain joins the combination. n p orbitals make n pi molecular orbitals, called MOs. Butadiene has four p orbitals, so it has four MOs.", draw: [{ beat: "u1-cd-mo-count" }] },
      { heading: "Fill from the bottom", body: "Put two electrons in each MO, lowest energy first, like filling seats from the front. Butadiene has four pi electrons, so the bottom two MOs are full.", draw: [{ beat: "u1-cd-mo-bd-homo" }] },
      { heading: "HOMO and LUMO", body: "The highest filled MO is the HOMO. The lowest empty one, just above it, is the LUMO. Reactions happen between a HOMO on one molecule and a LUMO on the other.", draw: [{ beat: "u1-cd-mo-bd-lumo" }] },
      { heading: "Take this with you", body: "Count the p orbitals, fill from the bottom, then name the HOMO and the LUMO. That is all the next lesson asks of you." },
    ],
  },
  "u1-da": {
    minutes: 3,
    uses: ["u1:pi-mo"],
    cards: [
      { heading: "A reaction that builds rings", body: "Diels-Alder joins a diene and a dienophile into a six-membered ring in one step. The dienophile is the partner that supplies a C=C. It makes two carbon-carbon bonds at once.", draw: [{ beat: "u1-cd-da-ring" }] },
      { heading: "One step, no intermediate", body: "There is no cation and no radical. Both new sigma bonds form together while the pi bonds shift. That is why this lesson has no ladder of intermediates." },
      { heading: "What the product looks like", body: "Two new sigma bonds form at the diene's ends. The diene's middle single bond becomes the ring's one C=C. So the product is always a cyclohexene.", draw: [{ figure: "cyclohexene", name: "the product: a cyclohexene" }] },
      { heading: "Why it works", body: "The diene's HOMO meets the dienophile's LUMO, with the lobes at the ends in phase, so both ends can bond at once. Orbitals that match mean the reaction is allowed.", draw: [{ beat: "u1-cd-da-orbitals" }] },
      { heading: "Take this with you", body: "Diene plus dienophile gives a cyclohexene. Two new sigma bonds, and one C=C left between the diene's old C2 and C3." },
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
      { heading: "Endo is the kinetic choice", body: "The dienophile can approach with its withdrawing groups tucked under the diene (endo) or pointing away (exo). Under kinetic control the tucked-under approach is faster, so endo is the usual product.", draw: [{ beat: "u1-cd-st-endo" }] },
      { heading: "Bridged or fused", body: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one. Look at which partner carries the ring.", draw: [{ beat: "u1-cd-st-bridged" }] },
      { heading: "Take this with you", body: "Keep cis as cis, choose endo, then check bridged against fused. Every stereochemistry question in this unit comes from those three." },
    ],
  },
};
