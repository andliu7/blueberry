/**
 * The authored walks, one per reaction the pathway lessons already name and the
 * trainer can draw. Words and atom ids only: the structures are the trainer's.
 *
 * Voice: plain, calm, the reason before the rule. No bond lengths in numbers
 * (they would be recalled, not derived); the lessons say shorter, longer,
 * stronger, weaker, and why that decides which bond gives. No dashes.
 */

import { reactionLesson, type MoveText, type ReactionLesson, type Visual } from "./model";

type ShapeBlock = MoveText & { readonly visual: Visual; readonly before?: boolean };

/** Bond rows for every carbonyl addition: the σ half stays, the π half gives. */
const CARBONYL_BONDS: Visual = {
  kind: "bonds",
  prompt: "A C=O is two bonds in one. Tap the half that breaks.",
  rows: [
    { label: "C=O σ half (on the axis between the nuclei)", length: "short", a: { sym: "C", charge: "plus", size: "large" }, b: { sym: "O", charge: "minus", size: "large" } },
    { label: "C=O π half (above and below, further out)", length: "long", a: { sym: "C", charge: "plus", size: "large" }, b: { sym: "O", charge: "minus", size: "large" }, gives: true },
  ],
  right: "The π half. It sits further from the nuclei, so it is held more loosely, and the carbon end is the positive one the nucleophile is drawn to. The σ half keeps the carbon and oxygen together.",
  wrong: "Think about where the two halves live. One is on the line between the nuclei, close and tight. The other is above and below it, further out and easier to pull on.",
};

/** The flat-to-tetrahedral shape every addition to formaldehyde shares. */
function additionShape(nu: string, carbon: string): ShapeBlock {
  return {
    body: "Slide the reaction. The carbonyl carbon starts flat, with three groups in one plane, so the nucleophile can come from the top face or the bottom face. As the new bond closes, the carbon turns tetrahedral and the three old groups bend away from the incoming group.",
    stereo: "With two identical hydrogens both faces give the same product. If the carbon ended with four different groups, the two faces would give the two mirror-image products in equal amounts.",
    focus: [carbon],
    visual: { kind: "pyramid", nu, subs: ["O", "H", "H"], from: 90, to: 109, caption: "Formaldehyde, as in this reaction." },
  };
}


const CARBONYL_RESONANCE =
  "A carbonyl has a second form: the π electrons sit on oxygen, so oxygen is negative and carbon is positive. The neutral C=O is the major contributor because every atom has a full octet, but the charge-separated form is why carbon is attacked. The minor form decides where the nucleophile goes.";

const LESSONS: readonly ReactionLesson[] = [
  reactionLesson({
    reactionId: "sn2",
    title: "Sₙ2 at bromomethane",
    attract: {
      body: "Bromine pulls the shared electrons toward itself, so the carbon it holds is a little positive and bromine a little negative. Hydroxide is fully negative. A negative charge is drawn to a positive one, and that pull is the whole reason the reaction starts.",
      stereo: "The carbon is tetrahedral. Three hydrogens sit on one side and bromine on the other, which leaves an open lane on the side opposite bromine.",
      focus: ["o1", "c1", "br1"],
      tap: { prompt: "Tap the atom the hydroxide is drawn to.", correct: ["c1"], right: "Yes. Carbon is the electron-poor end of the C-Br bond, so the negative oxygen heads for it.", wrong: "Look at which end of the C-Br bond is short of electrons. Bromine is pulling them, so the other end is the positive one." },
    },
    attack: {
      body: "Arrow one starts on an oxygen lone pair, because that is where the extra electrons are, and ends between oxygen and carbon, because that is the bond being made. The nucleophile gives, the electrophile takes.",
      stereo: "The oxygen comes in from the side opposite bromine. Two negatives would repel on the near side, and the back lane is where the carbon's empty-feeling orbital points.",
      focus: ["o1"],
      tap: { prompt: "Tap the atom that gives the electrons.", correct: ["o1"], right: "Right. The lone pair on oxygen is the electron source, so arrow one leaves from there.", wrong: "The giver is the negative atom with a lone pair to share, not the carbon." },
    },
    distance: {
      body: "Carbon cannot hold five bonds, so as the C-O bond forms the C-Br bond has to let go in the same moment. Bromine is a large atom, so its bond to carbon is long and weak, which is why it is the one that gives.",
      stereo: "While one bond forms and one breaks, the three hydrogens flatten toward a plane, like an umbrella being pushed through.",
      focus: ["c1", "br1"],
      visual: {
        kind: "bonds",
        prompt: "Two bonds hang on the carbon. Tap the one that gives.",
        rows: [
          { label: "C-H", length: "short", a: { sym: "C" }, b: { sym: "H" } },
          { label: "C-Br", length: "long", a: { sym: "C", charge: "plus", size: "small" }, b: { sym: "Br", charge: "minus", size: "small" }, gives: true },
        ],
        right: "The C-Br bond. Bromine is a large atom, so the bond is long, the shared electrons are spread thin, and it is weak. The short C-H bond is held tightly and stays.",
        wrong: "Compare the two lengths. The shorter bond is held more tightly. The longer one has less overlap, so it is the one that lets go.",
      },
    },
    shape: {
      body: "Slide the reaction and watch the carbon. Before, the three groups lean away from the leaving group. Halfway they lie flat, with the nucleophile, the carbon and the leaving group on one straight line. After, they lean the other way: the carbon has been turned inside out, which only happens when the attack comes from the back.",
      stereo: "Inversion of configuration. Every group that was on one side is now on the other, so the three-dimensional arrangement is the mirror image of the start.",
      focus: ["c1"],
      visual: { kind: "pyramid", nu: "HO", lg: "Br", subs: ["Et", "Me", "H"], from: 71, to: 109, caption: "Bromomethane has three identical hydrogens, so it cannot show the flip. This is the same move at a carbon with three different groups." },
    },
    resonance: {
      exists: false,
      body: "Check: hydroxide has one negative oxygen with no π bond or positive atom beside it to share the charge with, and bromomethane has only single bonds. There is no second form for either, so the charge stays where it is. Checked, decided, moving on.",
      stereo: "Nothing to redraw: with no second form, the shape is the one you already see. The carbon stays tetrahedral.",
      focus: ["c1","br1"],
    },
    release: {
      body: "Arrow two starts on the C-Br bond and ends on bromine, because bromine takes both electrons with it as bromide. The two arrows happen together: the hole opens as the new bond closes.",
      stereo: "The umbrella finishes turning inside out. At a stereocentre this is inversion of configuration, every time, because the attack is from the back.",
      focus: ["br1", "c1"],
    },
    result: {
      body: "Bromide is now a stable negative ion with a full shell, and the carbon has traded bromine for oxygen. One step, no intermediate.",
      stereo: "Here the carbon carries three hydrogens, so the inversion cannot be seen. Put a stereocentre there and its configuration flips.",
      focus: ["o1", "c1"],
    },
  }),

  reactionLesson({
    reactionId: "proton-transfer",
    title: "Proton transfer",
    attract: {
      body: "Chlorine is far more electronegative than hydrogen, so the proton is the positive end of H-Cl. Ammonia has a lone pair on nitrogen, a pocket of negative charge. The lone pair is drawn to the positive proton.",
      stereo: "Ammonia is a pyramid with the lone pair as its fourth point, so the lone pair points out of one face and the proton can walk straight in.",
      focus: ["n1", "h1", "cl1"],
      tap: { prompt: "Tap the atom that will be taken.", correct: ["h1"], right: "Yes. The proton is positive and small, and it is the thing that moves.", wrong: "A proton is what an acid gives away. Find the hydrogen on the acid." },
    },
    attack: {
      body: "Arrow one starts on the nitrogen lone pair and points at the space between nitrogen and hydrogen, the bond being made.",
      stereo: "The proton is tiny, so it can approach from any direction; the lone pair side of the nitrogen is the one it takes.",
      focus: ["n1"],
      tap: { prompt: "Tap the atom the arrow starts from.", correct: ["n1"], right: "Right. Nitrogen's lone pair is the electron source.", wrong: "Arrows start where electrons are. The acid has none to spare here; look at ammonia." },
    },
    resonance: {
      exists: false,
      body: "Check: ammonia has a lone pair but no π bond next to it to delocalise into, and H-Cl has only a single bond. No second form for either. Checked, decided, moving on.",
      stereo: "No second form means no flattening from shared electrons. Nitrogen stays a pyramid until the proton arrives.",
      focus: ["n1","h1","cl1"],
    },
    release: {
      body: "Arrow two starts on the H-Cl bond and ends on chlorine. Hydrogen cannot keep two bonds, so as nitrogen takes the proton chlorine keeps the electrons and leaves as chloride.",
      stereo: "Nitrogen changes from a three-bond pyramid to four bonds, so it becomes tetrahedral.",
      focus: ["cl1", "h1"],
    },
    result: {
      body: "Nitrogen gained a bond and lost its lone pair, so it is now positive. Chlorine gained the electrons, so it is negative. Charge is conserved: zero in, zero out.",
      stereo: "Ammonium is tetrahedral and all four hydrogens are equivalent, so there is nothing to label.",
      focus: ["n1", "cl1"],
    },
  }),

  reactionLesson({
    reactionId: "carbonyl-addition",
    title: "Carbonyl addition",
    attract: {
      body: "Oxygen pulls the shared electrons in C=O toward itself, so carbon is the positive end and oxygen the negative end. Hydroxide is negative, so it is drawn to the positive carbon and kept away from the negative oxygen.",
      stereo: "The carbonyl carbon is flat (trigonal planar), so the nucleophile can arrive above or below the plane.",
      focus: ["c1", "o2", "o1"],
      tap: { prompt: "Tap the electron-poor atom.", correct: ["c1"], right: "Yes. Oxygen hogs the electrons, which leaves the carbon positive.", wrong: "Oxygen is more electronegative, so it holds the electrons. The other end of C=O is the one that is short." },
    },
    attack: {
      body: "Arrow one goes from the hydroxide lone pair to the carbon. But carbon already has four bonds, so something has to give at the same time.",
      stereo: "The hydroxide comes in perpendicular to the flat carbonyl, along the pathway that avoids oxygen's electron cloud.",
      focus: ["o1"],
      tap: { prompt: "Tap the atom the arrow starts from.", correct: ["o1"], right: "Right. The lone pair on the hydroxide oxygen is the source.", wrong: "The arrow starts on the nucleophile, which is the negative species with a lone pair." },
    },
    distance: {
      body: "A double bond is shorter and stronger than a single bond overall, but it is made of two different bonds. The σ bond is the short, strong one. The π bond is the weaker half, further from the nuclei, and it is the one that breaks. The C-O σ bond stays put.",
      stereo: "Only the π half lets go, so the σ framework keeps the carbon's position and the carbon turns from flat to pyramidal.",
      focus: ["c1", "o2"],
      visual: CARBONYL_BONDS,
    },
    resonance: {
      exists: true,
      body: CARBONYL_RESONANCE,
      stereo: "Both forms are flat. Resonance is why the carbon is flat to start with, so the two faces really are equivalent.",
      focus: ["c1", "o2"],
    },
    shape: additionShape("HO", "c1"),
    release: {
      body: "Arrow two starts on the π bond and ends on oxygen, so oxygen takes both electrons and becomes an alkoxide. It is the second form from the resonance check actually happening.",
      stereo: "The carbon is now tetrahedral. If its two other groups were different it would be a new stereocentre, and with a flat start both faces are equally likely, so you get an equal mix of both.",
      focus: ["o2", "c1"],
    },
    result: {
      body: "The carbon now has a single bond to each of four atoms and oxygen carries the negative charge. Adding acid later puts a proton on oxygen to give the alcohol.",
      stereo: "Here the two groups on carbon are identical hydrogens, so there is no stereocentre. With two different groups you would get a racemic pair.",
      focus: ["c1", "o2"],
    },
  }),

  reactionLesson({
    reactionId: "e2",
    title: "E2 elimination",
    attract: {
      body: "Bromine makes the carbon it holds positive, and that pull also makes the hydrogen on the neighbouring carbon slightly acidic. Hydroxide is negative, so it is drawn to that hydrogen.",
      stereo: "Set up the geometry first: the C-H being removed and the C-Br leaving must lie in the same plane on opposite sides. That is anti-periplanar.",
      focus: ["o1", "hb", "br1"],
      tap: { prompt: "Tap the hydrogen the base will take.", correct: ["hb"], right: "Yes. It sits on the carbon next to the one holding bromine.", wrong: "A base takes a proton. Find the hydrogen on the carbon beside the C-Br carbon." },
    },
    shape: {
      before: true,
      body: "Turn the front carbon until its hydrogen sits opposite the bromine. E2 needs the C-H bond and the C-Br bond in one plane on opposite sides (anti-periplanar), because the C-H electrons slide into the space the C-Br bond is leaving, and that overlap is best when the two bonds are in line.",
      stereo: "Anti-periplanar is a conformation, not a different molecule: rotate the single bond and it appears. Only a hydrogen that can reach the anti position is removed.",
      focus: ["hb", "br1"],
      visual: { kind: "anti", hydrogen: "H", leaving: "Br", caption: "Newman projection down the C-C bond." },
    },
    attack: {
      body: "Arrow one goes from the oxygen lone pair to the hydrogen. The base is pulling a proton off, so it attacks a hydrogen, not a carbon. This is the main difference from Sₙ2.",
      stereo: "The base reaches the hydrogen that lies anti to bromine, on the far side from the leaving group.",
      focus: ["o1"],
      tap: { prompt: "Tap the base.", correct: ["o1"], right: "Right. Its lone pair does the grabbing.", wrong: "The base is the negative species with a lone pair." },
    },
    distance: {
      body: "The C-H bond is short and strong, but the C-Br bond is long and weak, so bromine is the group that can leave. The electrons from C-H slide into the space between the two carbons and make a π bond, which is a shorter C=C than the old C-C.",
      stereo: "The two carbons flatten as the π bond forms, so the groups on them end up in one plane.",
      focus: ["c1", "c2", "br1"],
      visual: {
        kind: "bonds",
        prompt: "The base pulls on this carbon's neighbour. Tap the bond that leaves.",
        rows: [
          { label: "C-H", length: "short", a: { sym: "C" }, b: { sym: "H", charge: "plus", size: "small" } },
          { label: "C-Br", length: "long", a: { sym: "C", charge: "plus", size: "small" }, b: { sym: "Br", charge: "minus", size: "small" }, gives: true },
        ],
        right: "The C-Br bond is the long, weak one, so bromine is the group that can leave. The C-H electrons are taken by the base's pull and become the new π bond.",
        wrong: "The leaving group goes with the longer, weaker bond. Compare the two drawn lengths.",
      },
    },
    resonance: {
      exists: false,
      body: "Check: the alkyl halide has only single bonds, and hydroxide has nothing beside its negative oxygen to share the charge with. No second form, so no major or minor contributor to weigh. Checked, decided, moving on. The π bond that forms next is new, not a resonance form of anything here.",
      stereo: "Both carbons are still tetrahedral. They only flatten once the π bond forms in the next move.",
      focus: ["c1","c2","br1"],
    },
    release: {
      body: "Arrow two starts on the C-H bond and ends between the carbons, making the π bond. Arrow three starts on the C-Br bond and ends on bromine. All three arrows are one step.",
      stereo: "Anti elimination fixes the result: groups that were on the same side in the reacting conformer end up cis, and those on opposite sides end up trans.",
      focus: ["c1", "c2", "br1"],
    },
    result: {
      body: "Water forms on one side and bromide leaves on the other, and the carbons are now joined by a double bond. Because bromide leaves in the same step, there is no carbocation.",
      stereo: "This alkene has no E or Z label because one carbon has two hydrogens. With different groups on both ends you would assign one.",
      focus: ["c1", "c2"],
    },
  }),

  reactionLesson({
    reactionId: "williamson",
    title: "Williamson ether",
    attract: {
      body: "Methoxide holds a full negative charge on oxygen. The carbon on the halide is positive because bromine pulls electrons away from it. The two attract.",
      stereo: "As in any Sₙ2, the carbon is tetrahedral and the lane opposite bromine is open.",
      focus: ["om", "c1", "br1"],
      tap: { prompt: "Tap the electrophile.", correct: ["c1"], right: "Yes. The carbon next to bromine is the electron-poor one.", wrong: "The electrophile is the electron-poor atom. Bromine holds the electrons, so look at what it is attached to." },
    },
    attack: {
      body: "Arrow one starts on an oxygen lone pair and lands between oxygen and carbon, the same move as hydroxide on bromomethane. The alkoxide is a stronger nucleophile than neutral alcohol, which is why the alcohol is deprotonated first.",
      stereo: "It attacks from the back side, opposite bromine.",
      focus: ["om"],
      tap: { prompt: "Tap the atom that gives the electrons.", correct: ["om"], right: "Right. The oxygen of methoxide is the source.", wrong: "The source is the negative atom with a lone pair." },
    },
    shape: {
      body: "Slide the reaction and watch the carbon. Before, the three groups lean away from the leaving group. Halfway they lie flat, with the nucleophile, the carbon and the leaving group on one straight line. After, they lean the other way: the carbon has been turned inside out, which only happens when the attack comes from the back.",
      stereo: "Inversion of configuration. Every group that was on one side is now on the other, so the three-dimensional arrangement is the mirror image of the start.",
      focus: ["c1"],
      visual: { kind: "pyramid", nu: "CH₃O", lg: "Br", subs: ["Et", "Me", "H"], from: 71, to: 109, caption: "Drawn with three different groups so the flip can be seen. The reaction in the picture has identical hydrogens." },
    },
    resonance: {
      exists: false,
      body: "Check: methoxide puts its negative charge on an oxygen whose only neighbours are a carbon and hydrogens, with no π bond to share it into. Bromoalkane has only single bonds. No second form. Checked, decided, moving on.",
      stereo: "No delocalisation, so the carbon and the oxygen keep their tetrahedral shapes.",
      focus: ["om","c1","br1"],
    },
    release: {
      body: "Arrow two starts on the C-Br bond and ends on bromine, which leaves as bromide.",
      stereo: "Inversion at the carbon, because attack comes from the back.",
      focus: ["br1", "c1"],
    },
    result: {
      body: "Oxygen now has two carbon neighbours: an ether. The new C-O bond replaced the C-Br bond.",
      stereo: "If the halide carbon were a stereocentre its configuration would be inverted. Here it is a methyl, so there is nothing to see.",
      focus: ["om", "c1"],
    },
  }),

  reactionLesson({
    reactionId: "epoxide-basic",
    title: "Epoxide, basic opening",
    attract: {
      body: "Oxygen in the ring pulls electrons from both carbons, so both are a little positive. Methoxide is fully negative and is drawn to them. Under base nothing has activated the ring, so the choice between the two carbons is not yet made.",
      stereo: "The three ring atoms sit in one plane at about 60 degrees, so the substituents point above and below it.",
      focus: ["om", "c1", "c2"],
      tap: { prompt: "Tap the carbon with fewer groups attached.", correct: ["c1"], right: "Yes. It carries only hydrogens besides the ring, so it is the open one.", wrong: "Compare the two ring carbons. One has an extra carbon group on it; the other is the open, less crowded one." },
    },
    attack: {
      body: "Arrow one starts on the oxygen lone pair of methoxide and ends between oxygen and the less crowded ring carbon. A strong nucleophile does not wait for a carbocation, so sterics decide.",
      stereo: "It attacks from the face opposite the ring oxygen, a back-side Sₙ2.",
      focus: ["om", "c1"],
      tap: { prompt: "Tap the carbon that is attacked.", correct: ["c1"], right: "Right. A strong nucleophile goes where it is easiest to reach.", wrong: "With a strong nucleophile and no acid, the easiest carbon wins, which is the less crowded one." },
    },
    distance: {
      body: "A three-membered ring cannot make its ideal bond angles, so it is strained and its C-O bonds are weak and easy to break. That strain is what lets an alkoxide, normally a poor leaving group, leave. Strain release is the driving force.",
      stereo: "As the C-O bond breaks, the ring opens and the attacked carbon is inverted.",
      focus: ["c1", "o1", "c2"],
      visual: {
        kind: "bonds",
        prompt: "Tap the bond that is easiest to break.",
        rows: [
          { label: "C-O in an open-chain ether", length: "medium", a: { sym: "C", charge: "plus", size: "small" }, b: { sym: "O", charge: "minus", size: "small" } },
          { label: "C-O in the strained three-membered ring", length: "long", a: { sym: "C", charge: "plus", size: "large" }, b: { sym: "O", charge: "minus", size: "large" }, gives: true },
        ],
        right: "The ring bond. A three-membered ring cannot make its ideal angles, so its C-O bonds are stretched and carry a larger partial charge. Opening the ring releases that strain.",
        wrong: "A ring squeezed into three atoms is under strain. Which of these two bonds is the stretched one?",
      },
    },
    shape: {
      body: "Slide the reaction and watch the carbon. Before, the three groups lean away from the leaving group. Halfway they lie flat, with the nucleophile, the carbon and the leaving group on one straight line. After, they lean the other way: the carbon has been turned inside out, which only happens when the attack comes from the back.",
      stereo: "Inversion of configuration. Every group that was on one side is now on the other, so the three-dimensional arrangement is the mirror image of the start.",
      focus: ["c1"],
      visual: { kind: "pyramid", nu: "CH₃O", lg: "ring O", subs: ["CH", "H", "H"], from: 71, to: 109, caption: "The attacked carbon here holds two hydrogens, so the flip is hidden, but the umbrella still turns. With two different groups instead of the hydrogens you would see the mirror image." },
    },
    resonance: {
      exists: false,
      body: "Check: the epoxide ring has only single bonds, and methoxide has no π bond beside its negative oxygen. No second form on either side. Checked, decided, moving on.",
      stereo: "The ring carbons stay tetrahedral, bent into a strained three-membered ring.",
      focus: ["om","c1","o1"],
    },
    release: {
      body: "Arrow two starts on the C-O bond to the attacked carbon and ends on the ring oxygen, which becomes an alkoxide.",
      stereo: "The nucleophile and the new O- end up on opposite sides of the old ring, which is anti addition.",
      focus: ["o1", "c1"],
    },
    result: {
      body: "The ring is open: methoxy on the less crowded carbon, alkoxide on the other. A later acid workup protonates the alkoxide to an alcohol.",
      stereo: "On a ring epoxide this gives the trans product, because the ring oxygen and the nucleophile end up opposite.",
      focus: ["c1", "c2", "o1"],
    },
  }),

  reactionLesson({
    reactionId: "epoxide-acidic",
    title: "Epoxide, acidic opening",
    attract: {
      body: "With acid, the ring oxygen is protonated and carries a positive charge. That makes it pull electrons from both carbons much harder, so each carbon is more positive than before. The neutral water is a weak nucleophile and needs that extra pull.",
      stereo: "The ring is still flat in the three-atom plane; protonation changes the charge, not the shape.",
      focus: ["o1", "c1", "c2", "ow"],
      tap: { prompt: "Tap the atom that carries the positive charge.", correct: ["o1"], right: "Yes. The protonated ring oxygen is the positive one, and it is what pulls on both carbons.", wrong: "Look at the atom that has taken the extra proton: the oxygen in the ring." },
    },
    attack: {
      body: "Arrow one starts on a water lone pair and ends between water's oxygen and a ring carbon. The question is which carbon.",
      stereo: "The water approaches from the back, opposite the ring oxygen.",
      focus: ["ow"],
      tap: { prompt: "Tap the carbon that is attacked.", correct: ["c2"], right: "Right. The more substituted carbon takes the hit, and the next move explains why.", wrong: "Under acid it is the more substituted carbon. The next move gives the reason." },
    },
    distance: {
      body: "With the oxygen protonated, both C-O bonds stretch and weaken. The bond to the more substituted carbon stretches further, because that carbon can better carry positive charge. So that carbon holds the larger share of the positive charge and is the better target. The transition state sits between Sₙ2 and a full carbocation.",
      stereo: "The stretched bond is the one whose carbon is attacked from behind, so inversion still happens there.",
      focus: ["c2", "o1", "c1"],
      visual: {
        kind: "bonds",
        prompt: "Both C-O bonds stretch once the oxygen is protonated. Tap the one that stretches further.",
        rows: [
          { label: "C-O to the less substituted carbon", length: "medium", a: { sym: "C", charge: "plus", size: "small" }, b: { sym: "O", charge: "minus", size: "small" } },
          { label: "C-O to the more substituted carbon", length: "long", a: { sym: "C", charge: "plus", size: "large" }, b: { sym: "O", charge: "minus", size: "small" }, gives: true },
        ],
        right: "The bond to the more substituted carbon. That carbon is better at carrying positive charge, so its bond stretches further and it holds the larger share of the charge, which makes it the better target.",
        wrong: "Ask which carbon is better at holding a positive charge. More alkyl groups help. That carbon's bond stretches further.",
      },
    },
    resonance: {
      exists: false,
      body: "Check: the protonated epoxide has only single bonds and no lone pair next to a positive carbon to share it. No resonance. What helps the substituted carbon is hyperconjugation from its alkyl groups, a smaller effect that works through the bonds. Move on.",
      stereo: "Because there is no flat carbocation, the back-side lane is still needed and the attack stays anti.",
      focus: ["c2"],
    },
    shape: {
      body: "Slide the reaction and watch the carbon. Before, the three groups lean away from the leaving group. Halfway they lie flat, with the nucleophile, the carbon and the leaving group on one straight line. After, they lean the other way: the carbon has been turned inside out, which only happens when the attack comes from the back.",
      stereo: "Inversion of configuration. Every group that was on one side is now on the other, so the three-dimensional arrangement is the mirror image of the start.",
      focus: ["c2"],
      visual: { kind: "pyramid", nu: "H₂O", lg: "ring O", subs: ["CH₂", "CH₃", "H"], from: 71, to: 109, caption: "This is the attacked carbon in the picture: three different groups, so it is a stereocentre and the product's arrangement is the mirror image of the start there." },
    },
    release: {
      body: "Arrow two starts on the C-O bond at the attacked carbon and ends on the ring oxygen, which becomes a neutral alcohol OH.",
      stereo: "The water ends up opposite the new OH, so again it is anti.",
      focus: ["o1", "c2"],
    },
    result: {
      body: "Water is now bonded to the more substituted carbon and carries a positive charge. A proton then leaves it to give a neutral alcohol.",
      stereo: "Both the acid and the base routes give anti products; they differ in which carbon is attacked.",
      focus: ["c2", "ow", "o1"],
    },
  }),

  reactionLesson({
    reactionId: "grignard-methyl",
    title: "Grignard addition",
    attract: {
      body: "Magnesium gives its electrons to carbon, so the carbon of the Grignard acts like a carbanion: a carbon with a full negative charge. The carbonyl carbon is positive. Negative toward positive.",
      stereo: "The carbonyl is flat, so the carbanion can reach either face.",
      focus: ["cg", "cf", "of"],
      tap: { prompt: "Tap the electrophile.", correct: ["cf"], right: "Yes. The carbonyl carbon is short of electrons because oxygen holds them.", wrong: "The electrophile is the electron-poor atom, and in C=O that is not the oxygen." },
    },
    attack: {
      body: "Arrow one starts on the carbanion's lone pair and ends between the two carbons. This makes a new C-C bond, which is why the Grignard is a chain-building reaction.",
      stereo: "It adds to one face of the flat carbonyl. Which face is chance, unless something nearby is chiral.",
      focus: ["cg"],
      tap: { prompt: "Tap the carbon that gives the electrons.", correct: ["cg"], right: "Right. The carbanion carbon is the electron source.", wrong: "The giver carries the negative charge. It is the carbon of the Grignard, not the carbonyl." },
    },
    distance: {
      body: "As before, the C=O π bond is the weak half and is the one that breaks, while the σ bond stays. The new C-C bond is strong and a carbanion is a very poor leaving group, so this addition does not run backwards.",
      stereo: "The carbonyl carbon changes from flat to tetrahedral as the π bond goes.",
      focus: ["cf", "of"],
      visual: CARBONYL_BONDS,
    },
    resonance: {
      exists: true,
      body: CARBONYL_RESONANCE,
      stereo: "The carbonyl is flat in both forms, so both faces are open to attack.",
      focus: ["cf", "of"],
    },
    shape: additionShape("CH₃", "cf"),
    release: {
      body: "Arrow two starts on the π bond and ends on oxygen. Oxygen takes both electrons and becomes an alkoxide.",
      stereo: "The new carbon is tetrahedral. If its groups were all different it would be a stereocentre and the two faces would give an equal mix of both.",
      focus: ["of", "cf"],
    },
    result: {
      body: "A new C-C bond, and an alkoxide on oxygen. It must be a separate workup step, with acid added after, that gives the alcohol; the acid cannot be there while the Grignard is, or it would destroy the Grignard first.",
      stereo: "With formaldehyde as here, the carbon has two hydrogens, so no stereocentre. A ketone would give a racemic tertiary alcohol.",
      focus: ["cg", "cf", "of"],
    },
  }),

  reactionLesson({
    reactionId: "hydride-reduction",
    title: "Hydride reduction",
    attract: {
      body: "Hydride is a hydrogen with two electrons and a negative charge, delivered by NaBH₄. The carbonyl carbon is positive. The negative hydride is drawn to it.",
      stereo: "The carbonyl is flat, so hydride can reach either face.",
      focus: ["h9", "cf", "of"],
      tap: { prompt: "Tap the atom hydride is drawn to.", correct: ["cf"], right: "Yes. Carbon is the positive end of C=O.", wrong: "Oxygen is already holding the electrons. The hydride goes to the other end." },
    },
    attack: {
      body: "Arrow one starts on the hydride and ends between hydrogen and carbon. Hydride has no lone pair drawn on a bigger atom, so the arrow starts on the hydrogen itself.",
      stereo: "It adds to one face of the carbonyl plane.",
      focus: ["h9"],
      tap: { prompt: "Tap the atom that gives the electrons.", correct: ["h9"], right: "Right. The hydride carries the pair.", wrong: "The source is the negative one, the hydride." },
    },
    distance: {
      body: "Hydrogen is the smallest atom, so hydride can reach a crowded carbonyl carbon where a bulky nucleophile cannot. The C=O π bond is the weak half, and it is the one that breaks.",
      stereo: "The carbon goes from flat to tetrahedral as the hydride adds.",
      focus: ["cf", "of"],
      visual: CARBONYL_BONDS,
    },
    resonance: {
      exists: true,
      body: CARBONYL_RESONANCE,
      stereo: "Both forms are flat, which is why either face can be attacked.",
      focus: ["cf", "of"],
    },
    shape: additionShape("H", "cf"),
    release: {
      body: "Arrow two starts on the π bond and ends on oxygen, giving an alkoxide.",
      stereo: "The new C-H bond sits on one face. With two different groups on carbon, an equal mix of both faces results.",
      focus: ["of", "cf"],
    },
    result: {
      body: "The carbon gained a hydrogen and the oxygen carries a negative charge. Workup with a proton source gives the alcohol: the carbonyl has been reduced.",
      stereo: "In this model the carbon holds two hydrogens already, so there is no stereocentre. A ketone would give a racemic alcohol.",
      focus: ["h9", "cf", "of"],
    },
  }),

  reactionLesson({
    reactionId: "cyanohydrin",
    title: "Cyanohydrin attack",
    attract: {
      body: "Cyanide carries its negative charge on carbon. The carbonyl carbon is positive. So a carbon-based negative is drawn to a carbon-based positive.",
      stereo: "The carbonyl is flat, so cyanide can approach from either face.",
      focus: ["c9", "c1", "o1"],
      tap: { prompt: "Tap the nucleophilic atom of cyanide.", correct: ["c9"], right: "Yes. The charge and the lone pair that attacks are on carbon.", wrong: "Cyanide has two atoms. The negative charge is drawn on the carbon." },
    },
    attack: {
      body: "Arrow one starts on the carbon lone pair and ends between that carbon and the carbonyl carbon. A new C-C bond forms.",
      stereo: "Cyanide is a straight, thin group, so it meets the flat carbonyl with little crowding from either face.",
      focus: ["c9"],
      tap: { prompt: "Tap the atom that gives the electrons.", correct: ["c9"], right: "Right. The cyanide carbon is the source.", wrong: "The source is the negative atom, which is the carbon of cyanide." },
    },
    distance: {
      body: "The C≡N triple bond is the shortest and strongest of the bonds here, so it stays intact and the new C-C bond forms next to it. The weak link is the C=O π bond, which is the one that breaks.",
      stereo: "C-C≡N is linear, so the new group adds a straight rod to the tetrahedral carbon.",
      focus: ["c9", "n1", "c1"],
      visual: CARBONYL_BONDS,
    },
    resonance: {
      exists: true,
      body: "Cyanide can be drawn with the charge on nitrogen, but that leaves carbon with only six electrons, so it is a minor form. The charge-on-carbon form is the major contributor, and the reaction goes through carbon. The carbonyl also has its usual second form, which is why its carbon is attacked.",
      stereo: "The major form keeps the C≡N linear, which is what the picture shows.",
      focus: ["c9", "n1"],
    },
    shape: additionShape("NC", "c1"),
    release: {
      body: "Arrow two starts on the C=O π bond and ends on oxygen, giving an alkoxide.",
      stereo: "The carbonyl carbon is tetrahedral now. With two different groups it would be a stereocentre, formed as a racemic mix.",
      focus: ["o1", "c1"],
    },
    result: {
      body: "A new carbon is attached, and the alkoxide picks up a proton to give a cyanohydrin. The nitrile can later be hydrolysed or reduced, which is why this step matters.",
      stereo: "Here the carbon has two hydrogens, so no stereocentre. An aldehyde other than formaldehyde would give a racemic cyanohydrin.",
      focus: ["c9", "c1", "o1"],
    },
  }),

  reactionLesson({
    reactionId: "imine-attack",
    title: "Imine, first bond",
    attract: {
      body: "The nitrogen of the amine has a lone pair, and nitrogen is less electronegative than oxygen, so that lone pair is available. The carbonyl carbon is positive. The lone pair is drawn to it.",
      stereo: "The carbonyl is flat; the amine can approach either face.",
      focus: ["nm", "cf", "of"],
      tap: { prompt: "Tap the atom that will attack.", correct: ["nm"], right: "Yes. Nitrogen's lone pair is the electron source.", wrong: "Look for the lone pair that is free to give. It is on the amine, not on the carbonyl oxygen." },
    },
    attack: {
      body: "Arrow one starts on the nitrogen lone pair and ends between nitrogen and the carbonyl carbon.",
      stereo: "It adds to one face of the flat carbonyl.",
      focus: ["nm"],
      tap: { prompt: "Tap the carbon being attacked.", correct: ["cf"], right: "Right. It is the carbon of the C=O.", wrong: "The target is the positive end of the C=O, and it is a carbon." },
    },
    distance: {
      body: "Nitrogen's lone pair is a weaker nucleophile than a full negative charge, so the reaction is slower, but it is still a lone pair ready to share. Again it is the C=O π bond that breaks.",
      stereo: "Nitrogen goes from three bonds to four, so it turns from a pyramid to a tetrahedron.",
      focus: ["cf", "of", "nm"],
      visual: CARBONYL_BONDS,
    },
    resonance: {
      exists: true,
      body: CARBONYL_RESONANCE,
      stereo: "Both forms of the carbonyl are flat.",
      focus: ["cf", "of"],
    },
    shape: additionShape("RNH₂", "cf"),
    release: {
      body: "Arrow two starts on the π bond and ends on oxygen. Now oxygen is negative and nitrogen, having shared its lone pair, is positive.",
      stereo: "The carbon is tetrahedral. If its groups differ it is a new stereocentre, formed as an equal mix.",
      focus: ["of", "cf", "nm"],
    },
    result: {
      body: "The product has a positive nitrogen and a negative oxygen on neighbouring atoms: a zwitterion. A proton then moves from nitrogen to oxygen, and later water leaves to finish the imine.",
      stereo: "The final C=N will have its own E or Z geometry, decided in the last step, not this one.",
      focus: ["nm", "of"],
    },
  }),

  reactionLesson({
    reactionId: "alkene-protonation",
    title: "Propene + HBr",
    attract: {
      body: "The π bond of an alkene is a cloud of electrons above and below the molecule, so it is the negative partner here. H-Br has a positive hydrogen, because bromine pulls electrons away. The cloud is drawn to the proton.",
      stereo: "The alkene is flat, so the proton can approach either face of the π bond.",
      focus: ["c1", "c2", "h1"],
      tap: { prompt: "Tap the atom that will be attacked.", correct: ["h1"], right: "Yes. The hydrogen of H-Br is the positive end.", wrong: "The alkene is the electron source this time. The target is the positive end of H-Br." },
    },
    attack: {
      body: "Arrow one starts on the C=C π bond, not on an atom, and ends on the hydrogen. This time electrons come from a bond, so the arrow starts on the bond itself.",
      stereo: "The proton adds to one face of the flat alkene.",
      focus: ["c1", "c2"],
      tap: { prompt: "Tap the carbon that receives the proton.", correct: ["c1"], right: "Right. The proton goes to the CH₂ end, so that the positive charge ends up on the more substituted carbon.", wrong: "Think about which carbocation is more stable. The proton goes to the end that leaves the charge on the more substituted carbon." },
    },
    distance: {
      body: "The π bond is the weaker, outer half of the double bond, so it is the electron-rich part that reacts while the σ bond holds the carbons together. The H-Br bond is long and weak, so it breaks easily.",
      stereo: "The carbon that gets the proton turns from flat to tetrahedral. The other carbon is now positive and stays flat.",
      focus: ["c1", "c2", "h1", "br1"],
      visual: {
        kind: "bonds",
        prompt: "A C=C is two bonds in one. Tap the half that reacts.",
        rows: [
          { label: "C=C σ half (between the nuclei)", length: "short", a: { sym: "C" }, b: { sym: "C" } },
          { label: "C=C π half (above and below, further out)", length: "long", a: { sym: "C", charge: "minus", size: "small" }, b: { sym: "C", charge: "minus", size: "small" }, gives: true },
        ],
        right: "The π half. It is the outer, electron-rich part, so it reaches out to the proton while the σ half holds the carbons together.",
        wrong: "One half sits between the nuclei, close and tight. The other is above and below, further out and easier to reach.",
      },
    },
    resonance: {
      exists: false,
      body: "Check: the cation that forms has no π bond or lone pair next to it, so there is no resonance form. It is stabilised by hyperconjugation from neighbouring alkyl groups instead, which is why the more substituted carbon is better. Move on.",
      stereo: "The positive carbon has only three groups, so it is flat. Bromide can attack either face in the next step.",
      focus: ["c2"],
    },
    release: {
      body: "Arrow two starts on the H-Br bond and ends on bromine, which leaves as bromide. The proton is already taken by carbon, so bromine keeps the electrons.",
      stereo: "Bromide is now free and will meet the flat carbocation from either side.",
      focus: ["br1", "h1"],
    },
    result: {
      body: "A secondary carbocation and a bromide ion. The positive carbon is on the more substituted side, which is Markovnikov's rule explained: the more stable cation forms.",
      stereo: "Because the cation is flat, bromide can add to either face, giving an equal mix of both at a new stereocentre if there is one.",
      focus: ["c2", "br1"],
    },
  }),
];

const BY_ID: ReadonlyMap<string, ReactionLesson> = new Map(LESSONS.map((lesson) => [lesson.reactionId, lesson]));

/** The walk for a trainer reaction id, or undefined when none is authored. */
export function reactionLessonFor(reactionId: string): ReactionLesson | undefined {
  return BY_ID.get(reactionId);
}

export const REACTION_LESSONS: readonly ReactionLesson[] = LESSONS;
