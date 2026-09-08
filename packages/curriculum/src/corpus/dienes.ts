/**
 * Allylic chemistry, conjugated diene addition, and the Diels-Alder, Act 1 mid.
 *
 * ONE IDEA RUNS THROUGH ALL SEVEN. A delocalised intermediate has more than one
 * place to react, so the answer is never read off a single structure.
 * `docs/COURSE-OUTLINE-ORGO2.md` records the instructor's own front matter on
 * every exam: if the explanation is resonance, the resonance structures must be
 * drawn for full credit, and it names that as the most explicitly policed failure
 * in the course. Three of the distractors below are exactly that failure, one
 * contributor drawn where two were needed.
 *
 * THE TEMPERATURE PAIR IS AUTHORED AS A PAIR, DELIBERATELY. The low temperature
 * problem and the equilibrating problem use the same substrate and the same
 * reagent and differ only in the conditions line, because the outline lists
 * temperature first among the seven condition axes that decide a graded answer,
 * and because `kinetic_vs_thermodynamic_control` is introduced here and re-tested
 * two acts later on enolates. A student who can only answer one of the two has
 * memorised a product rather than learned the control.
 *
 * The enolate half of that concept is Act 3 and is deliberately not authored
 * here.
 */

import { createMajorProductAnswer, createMultipleChoiceAnswer } from "../answers/choice.js";
import { createProblem, type Problem } from "../problem.js";

export const DIENE_PROBLEMS: readonly Problem[] = Object.freeze([
  // ------------------------------------------------------ allylic halogenation

  createProblem({
    id: "org2-nbs-allylic-not-ring",
    course: "orgo_2",
    topic: "allylic_halogenation",
    difficulty: 850,
    prompt:
      "Cyclohexene is treated with N-bromosuccinimide and a trace of a radical initiator, in a " +
      "non polar solvent with the bromine concentration kept very low. Where does the bromine end " +
      "up?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "allylic", text: "On the carbon next to the double bond, giving 3-bromocyclohexene" },
        {
          id: "across-the-double-bond",
          text: "Across the double bond, giving trans-1,2-dibromocyclohexane",
        },
        { id: "vinylic", text: "On one of the double bond carbons, replacing a vinylic hydrogen" },
      ],
      correctOptionId: "allylic",
    }),
    solution: {
      whatHappened: "On the allylic carbon, the sp3 carbon next to the double bond.",
      why:
        "N-bromosuccinimide holds the bromine concentration down to a trace, which is too low for " +
        "the ionic addition across the pi bond to compete. What runs instead is a radical chain, and " +
        "a bromine radical abstracts the hydrogen that gives the most stable radical. The allylic " +
        "hydrogen wins because the radical left behind is delocalised over three carbons, which no " +
        "other position on cyclohexene offers.",
      lookAt:
        "Compare the radical each candidate hydrogen would leave behind. Delocalisation over three " +
        "carbons is worth roughly the same as tertiary substitution.",
    },
    distractors: [
      {
        id: "read-as-br2-addition",
        state: { kind: "multiple_choice", optionId: "across-the-double-bond" },
        explanation: {
          whatHappened:
            "This is the product of molecular bromine adding across the pi bond, which is a different reaction with a different mechanism.",
          why:
            "Bromine at ordinary concentration in dichloromethane gives that anti dibromide through " +
            "a bridged bromonium ion, and it is the reaction NBS is designed to avoid. Keeping the " +
            "bromine concentration at a trace starves the ionic pathway and leaves the radical chain " +
            "as the only thing running.",
          lookAt:
            "Read the reagent and the concentration together. NBS and Br2 deliver the same atom to " +
            "two completely different positions.",
        },
      },
      {
        id: "vinylic-substitution",
        state: { kind: "multiple_choice", optionId: "vinylic" },
        explanation: {
          whatHappened: "This replaces a hydrogen on one of the double bond carbons.",
          why:
            "A vinylic hydrogen sits on an sp2 carbon and its C-H bond is stronger than an sp3 one, " +
            "so abstracting it costs more energy. The radical it would leave behind is also stuck in " +
            "the plane of the ring, at right angles to the pi system, so it gets no delocalisation " +
            "at all. Both facts point the chain away from that position.",
          lookAt:
            "Mark which carbons are sp2 and which are sp3 before choosing a hydrogen. Allylic means " +
            "next to the pi bond, not part of it.",
        },
      },
    ],
    tags: ["nbs", "allylic-radical", "nbs-vs-br2"],
  }),

  createProblem({
    id: "org2-nbs-allylic-two-products",
    course: "orgo_2",
    topic: "allylic_halogenation",
    difficulty: 1300,
    prompt:
      "But-1-ene is treated with N-bromosuccinimide under light. Which monobromide products form?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "both-allylic", text: "3-Bromobut-1-ene and 1-bromobut-2-ene" },
        { id: "one-allylic", text: "3-Bromobut-1-ene only" },
        { id: "dibromide", text: "1,2-Dibromobutane" },
        { id: "markovnikov", text: "2-Bromobutane" },
      ],
      correctOptionId: "both-allylic",
    }),
    solution: {
      whatHappened:
        "Two products, 3-bromobut-1-ene and 1-bromobut-2-ene, because the allylic radical has two " +
        "ends.",
      why:
        "Abstracting an allylic hydrogen from C3 gives a radical whose unpaired electron is shared " +
        "with C1 through the pi system. Drawing only one contributor hides half the molecule's " +
        "reactivity: bromine can be delivered to either end of that three carbon unit. On this " +
        "unsymmetrical radical the two ends are genuinely different carbons, so the two deliveries " +
        "give two different constitutional products.",
      lookAt:
        "Draw both contributors of the radical before drawing any product, then put a bromine on " +
        "each end in turn. Two contributors, two products.",
    },
    distractors: [
      {
        id: "one-contributor-only",
        state: { kind: "multiple_choice", optionId: "one-allylic" },
        explanation: {
          whatHappened:
            "This finds the allylic position correctly and puts the bromine only where the hydrogen came from.",
          why:
            "The hard half is done. What is left is that the radical does not stay where it was " +
            "made: the unpaired electron and the pi bond swap places, which puts equal reactivity on " +
            "C1. A delocalised intermediate reacts at every position that carries the charge or the " +
            "electron, and reporting one of them is reporting half the answer.",
          lookAt:
            "Whenever an intermediate is delocalised, count its reactive positions and expect one " +
            "product per position. The same count applies to the allylic cation in diene addition.",
        },
      },
      {
        id: "read-as-addition",
        state: { kind: "multiple_choice", optionId: "dibromide" },
        explanation: {
          whatHappened: "This adds two bromines across the double bond.",
          why:
            "That is the reaction of molecular bromine at ordinary concentration, and it is the one " +
            "NBS exists to suppress. NBS substitutes a hydrogen and leaves the double bond in place, " +
            "so the product keeps its pi bond and gains one bromine rather than two.",
          lookAt:
            "Count the double bonds in the product against the starting material. Allylic " +
            "bromination keeps it and addition consumes it.",
        },
      },
      {
        id: "markovnikov-applied",
        state: { kind: "multiple_choice", optionId: "markovnikov" },
        explanation: {
          whatHappened:
            "This puts the bromine on the more substituted alkene carbon, which is where an ionic addition of HBr would put it.",
          why:
            "Markovnikov orientation comes from a carbocation deciding the outcome, and no cation " +
            "appears anywhere in a radical chain. The product also still has to carry the double " +
            "bond, and 2-bromobutane has none. This is a rule from a neighbouring reaction applied " +
            "to a mechanism that does not run on it.",
          lookAt:
            "Ask which intermediate the rule you are reaching for is about. Markovnikov is about " +
            "cations, and NBS with light makes radicals.",
        },
      },
    ],
    tags: ["nbs", "allylic-radical", "resonance-required"],
  }),

  // ---------------------------------------------------------- diene addition

  createProblem({
    id: "org2-diene-hbr-equilibrating",
    course: "orgo_2",
    topic: "diene_addition",
    difficulty: 1000,
    prompt:
      "Buta-1,3-diene is treated with one equivalent of hydrogen bromide at 40 degrees Celsius and " +
      "left long enough for the products to equilibrate. Which product dominates?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "one-four", text: "1-Bromobut-2-ene, the 1,4 product" },
        { id: "one-two", text: "3-Bromobut-1-ene, the 1,2 product" },
        {
          id: "fixed-ratio",
          text: "The two stay in a fixed ratio, because temperature does not change a product ratio",
        },
      ],
      correctOptionId: "one-four",
    }),
    solution: {
      whatHappened: "1-Bromobut-2-ene, the 1,4 product, is the major one under equilibrating conditions.",
      why:
        "Both products form from the same allylic cation, and at this temperature both can ionise " +
        "back to it. Once the two are interconverting, which one accumulates is decided by which is " +
        "more stable rather than by which formed faster. The 1,4 product has a disubstituted internal " +
        "double bond and the 1,2 product has a monosubstituted terminal one, so the 1,4 product wins.",
      lookAt:
        "Compare the two products as alkenes, counting alkyl groups on the double bond. That " +
        "comparison only decides the answer once the products can interconvert.",
    },
    distractors: [
      {
        id: "kinetic-at-equilibrium",
        state: { kind: "multiple_choice", optionId: "one-two" },
        explanation: {
          whatHappened:
            "This gives the 1,2 product, which is the one that dominates at low temperature rather than under equilibration.",
          why:
            "The 1,2 product does form faster, because the allylic cation carries more positive " +
            "charge at the secondary carbon and bromide is already sitting next to it when the ion " +
            "pair forms. Forming faster only settles the outcome while the products are stuck where " +
            "they land. Given enough thermal energy to go back, the faster product drains into the " +
            "more stable one.",
          lookAt:
            "Read the conditions line for temperature and for any mention of equilibration. Those " +
            "two words swap the answer on this exact substrate.",
        },
      },
      {
        id: "ratio-declared-fixed",
        state: { kind: "multiple_choice", optionId: "fixed-ratio" },
        explanation: {
          whatHappened: "This treats the product ratio as a property of the reaction rather than of the conditions.",
          why:
            "Temperature does two separate things here. It changes how fast each product forms, and " +
            "more importantly it decides whether the products can go back to the cation at all. " +
            "Below about minus 80 degrees they cannot, and near 40 they can, which is why the same " +
            "flask gives roughly 80 percent one product at one temperature and roughly 85 percent " +
            "the other at the other.",
          lookAt:
            "Separate the two questions the temperature answers: which forms faster, and whether " +
            "either can come back.",
        },
      },
    ],
    tags: ["1-2-vs-1-4", "thermodynamic-control"],
  }),

  createProblem({
    id: "org2-diene-hbr-cold",
    course: "orgo_2",
    topic: "diene_addition",
    difficulty: 1400,
    prompt:
      "Buta-1,3-diene is treated with one equivalent of hydrogen bromide at minus 80 degrees " +
      "Celsius. Which product is the major one, and what makes it the major one?",
    answer: createMajorProductAnswer({
      candidates: [
        { id: "one-two", text: "3-Bromobut-1-ene" },
        { id: "one-four", text: "1-Bromobut-2-ene" },
        { id: "wrong-end", text: "4-Bromobut-1-ene" },
      ],
      reasons: [
        {
          id: "kinetic-ion-pair",
          text: "It forms faster from the allylic cation and the temperature is too low for it to go back",
        },
        {
          id: "more-stable-alkene",
          text: "Its double bond is the more substituted of the two, so it is the more stable product",
        },
        {
          id: "less-hindered-protonation",
          text: "The proton adds to whichever terminal carbon is less hindered",
        },
      ],
      correctCandidateId: "one-two",
      correctReasonId: "kinetic-ion-pair",
    }),
    solution: {
      whatHappened:
        "3-Bromobut-1-ene, the 1,2 product, and it wins because it forms faster and cannot come back.",
      why:
        "The proton adds to C1, which is the only addition that leaves an allylic cation rather than " +
        "a plain primary one. That cation is delocalised over C2 and C4, and the two contributors are " +
        "not equal: C2 is secondary and carries more of the positive charge, and the bromide that " +
        "just left is sitting right beside it. So capture at C2 is faster. At minus 80 degrees " +
        "neither product has the energy to ionise back, so the faster one is the one that " +
        "accumulates.",
      lookAt:
        "Draw both contributors of the allylic cation and mark which carbon carries more of the " +
        "charge. Without the second contributor the 1,4 product cannot be explained at all.",
    },
    distractors: [
      {
        id: "temperature-mapping-inverted",
        state: { kind: "major_product", candidateId: "one-four", reasonId: null },
        explanation: {
          whatHappened:
            "This gives the 1,4 product, which is the one that dominates once the products can equilibrate.",
          why:
            "The 1,4 product really is the more stable of the two, and stability only decides the " +
            "outcome when the products can go back to the cation and re-form. At minus 80 degrees " +
            "they cannot, so the reaction reports which product formed FASTER rather than which is " +
            "better. The mapping is low temperature to 1,2 and warm plus equilibration to 1,4.",
          lookAt:
            "Write the two mappings down as a pair and check the temperature against them before " +
            "choosing. This same pair returns on enolates two acts later.",
        },
      },
      {
        id: "protonated-the-wrong-carbon",
        state: { kind: "major_product", candidateId: "wrong-end", reasonId: null },
        explanation: {
          whatHappened:
            "This adds the proton to C2, which leaves the positive charge on C1 and puts the bromine there.",
          why:
            "Protonating an internal carbon of the diene gives a primary cation with the remaining " +
            "double bond isolated from it, so there is no delocalisation to stabilise it. " +
            "Protonating a terminal carbon gives an allylic cation instead, and the gap between " +
            "those two is large enough that only the allylic route runs.",
          lookAt:
            "Try protonating each carbon of the diene in turn and draw the cation each one leaves. " +
            "Only the terminal ones give a delocalised cation.",
        },
      },
      {
        id: "right-product-stability-argument",
        state: { kind: "major_product", candidateId: "one-two", reasonId: "more-stable-alkene" },
        cause: "right_product_wrong_reason",
        explanation: {
          whatHappened:
            "The product is right and the argument attached to it is the stability argument, which points at the other product.",
          why:
            "3-Bromobut-1-ene has the less substituted double bond of the two, so a stability " +
            "argument selects 1-bromobut-2-ene instead. The reason this product wins in the cold is " +
            "speed, not stability, and saying so is what the graded answer is actually testing.",
          lookAt:
            "Check that the argument would pick the same product if it were applied on its own. " +
            "Here it picks the other one.",
        },
      },
    ],
    tags: ["1-2-vs-1-4", "kinetic-control", "resonance-required"],
  }),

  // -------------------------------------------------------------- Diels-Alder

  createProblem({
    id: "org2-diels-alder-role-assignment",
    course: "orgo_2",
    topic: "diels_alder",
    difficulty: 950,
    prompt:
      "Two partners are offered for a Diels-Alder: 1-methoxybuta-1,3-diene, which carries an " +
      "electron donating group, and methyl acrylate, an alkene carrying an electron withdrawing " +
      "ester. Which assignment of roles gives the fast reaction?",
    answer: createMultipleChoiceAnswer({
      options: [
        {
          id: "donor-diene",
          text: "The methoxy diene is the diene and methyl acrylate is the dienophile",
        },
        {
          id: "reversed",
          text: "Methyl acrylate acts as the diene and the methoxy compound as the dienophile",
        },
        {
          id: "electronics-irrelevant",
          text: "Either assignment works equally, because the reaction only needs four pi electrons meeting two",
        },
      ],
      correctOptionId: "donor-diene",
    }),
    solution: {
      whatHappened:
        "The methoxy compound is the diene and methyl acrylate is the dienophile. That is the fast " +
        "pairing.",
      why:
        "The bond forming interaction is the diene's highest occupied orbital meeting the " +
        "dienophile's lowest empty one, and the rate goes up as the gap between those two closes. " +
        "An electron donating group on the diene raises its occupied orbital, and an electron " +
        "withdrawing group on the dienophile lowers its empty one, so the two substituents work " +
        "from opposite ends on the same gap.",
      lookAt:
        "Read the substituents as orbital energy adjustments, one per partner. Donor on the four " +
        "carbon piece, acceptor on the two carbon piece.",
    },
    distractors: [
      {
        id: "electronics-reversed",
        state: { kind: "multiple_choice", optionId: "reversed" },
        explanation: {
          whatHappened:
            "This puts the electron withdrawing partner in the diene role and the donating one in the dienophile role.",
          why:
            "Methyl acrylate has only two carbons in its pi system, so it cannot be the four carbon " +
            "component whatever its electronics are. Beyond that, the substituents are on the wrong " +
            "partners for the gap: withdrawing from the diene would lower the occupied orbital and " +
            "donating to the dienophile would raise the empty one, which widens the gap and slows " +
            "everything down.",
          lookAt:
            "Count the carbons in each pi system first, because that alone fixes the roles. Then " +
            "check whether the electronics narrow the gap or widen it.",
        },
      },
      {
        id: "electronics-dismissed",
        state: { kind: "multiple_choice", optionId: "electronics-irrelevant" },
        explanation: {
          whatHappened:
            "This treats the reaction as needing only the right pi electron counts, with the substituents as decoration.",
          why:
            "The counts are necessary and they are not sufficient. Butadiene and ethene do react " +
            "together and they need around 200 degrees and high pressure to do it, while a donor " +
            "diene with an acceptor dienophile runs at or near room temperature. Electronics are " +
            "worth orders of magnitude in rate, which is why the requirements checklist names them.",
          lookAt:
            "Keep the four requirements as four separate tests rather than one. Orbital phases, " +
            "s-cis geometry, acceptor on the dienophile, donor on the diene.",
        },
      },
    ],
    tags: ["diels-alder", "homo-lumo", "role-assignment"],
  }),

  createProblem({
    id: "org2-diels-alder-scis-lockout",
    course: "orgo_2",
    topic: "diels_alder",
    difficulty: 1250,
    prompt:
      "Four dienes are each offered an excellent dienophile. Which one fails to give a Diels-Alder " +
      "adduct no matter how good the dienophile is?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "cis-cis-hexadiene", text: "(2Z,4Z)-Hexa-2,4-diene" },
        { id: "trans-trans-hexadiene", text: "(2E,4E)-Hexa-2,4-diene" },
        { id: "cyclopentadiene", text: "Cyclopenta-1,3-diene" },
        { id: "butadiene", text: "Buta-1,3-diene" },
      ],
      correctOptionId: "cis-cis-hexadiene",
    }),
    solution: {
      whatHappened:
        "(2Z,4Z)-Hexa-2,4-diene. Its two methyl groups collide before it can reach the s-cis " +
        "conformation.",
      why:
        "The four carbons of the diene have to lie in a plane with both double bonds pointing the " +
        "same way, so that C1 and C4 are close enough to reach the dienophile at once. Rotating this " +
        "diene into that shape swings its two methyl groups into the same region of space, and the " +
        "clash costs more than the reaction gains. Electronics never get a chance to matter, which " +
        "is why the geometry test comes first.",
      lookAt:
        "Try to draw each diene in s-cis and see what collides. The test is a drawing, not an " +
        "electron count.",
    },
    distractors: [
      {
        id: "trans-trans-rejected",
        state: { kind: "multiple_choice", optionId: "trans-trans-hexadiene" },
        explanation: {
          whatHappened: "This rejects the E,E isomer, reading its trans double bonds as a barrier.",
          why:
            "The E and Z labels describe the double bonds, and s-cis and s-trans describe rotation " +
            "about the single bond between them. Those are separate degrees of freedom. In the E,E " +
            "isomer the two methyls point outward when the diene rotates into s-cis, so nothing " +
            "collides and it reacts well.",
          lookAt:
            "Keep the double bond geometry and the single bond conformation apart. Only the second " +
            "one is what s-cis describes.",
        },
      },
      {
        id: "cyclopentadiene-rejected",
        state: { kind: "multiple_choice", optionId: "cyclopentadiene" },
        explanation: {
          whatHappened: "This rejects cyclopentadiene, on the reasoning that a ring cannot rotate.",
          why:
            "The ring is exactly why it works. Cyclopentadiene is locked in s-cis permanently and " +
            "cannot rotate out of it, so it pays none of the entropy cost that an open chain diene " +
            "pays to get there. It is one of the most reactive dienes known, reactive enough to " +
            "dimerise with itself on standing.",
          lookAt:
            "Ask whether a locked ring is locked in the useful shape or the useless one. Locked in " +
            "s-cis is an advantage.",
        },
      },
      {
        id: "butadiene-rejected",
        state: { kind: "multiple_choice", optionId: "butadiene" },
        explanation: {
          whatHappened: "This rejects butadiene, whose lowest energy conformation really is s-trans.",
          why:
            "Butadiene does sit mostly s-trans at rest, and the barrier between the two " +
            "conformations is small, a few kilojoules. It rotates freely at ordinary temperatures, " +
            "so the small population that is s-cis at any moment is enough to carry the reaction and " +
            "is continuously replenished. Preferring a conformation is not the same as being locked " +
            "out of the other.",
          lookAt:
            "Separate which conformation is preferred from which is reachable. Only an unreachable " +
            "s-cis disqualifies a diene.",
        },
      },
    ],
    tags: ["diels-alder", "s-cis", "conformational-lockout"],
  }),

  createProblem({
    id: "org2-diels-alder-reverse-direction",
    course: "orgo_2",
    topic: "diels_alder",
    difficulty: 1500,
    prompt:
      "A Diels-Alder produces dimethyl cyclohex-4-ene-1,2-dicarboxylate with the two ester groups " +
      "cis to each other on the new ring. Which pair of starting materials was used?",
    answer: createMultipleChoiceAnswer({
      options: [
        { id: "butadiene-maleate", text: "Buta-1,3-diene and dimethyl maleate, the cis dienophile" },
        { id: "butadiene-fumarate", text: "Buta-1,3-diene and dimethyl fumarate, the trans dienophile" },
        { id: "cyclohexadiene-maleate", text: "Cyclohexa-1,3-diene and dimethyl maleate" },
        { id: "triene-maleate", text: "Hexa-1,3,5-triene and dimethyl maleate" },
      ],
      correctOptionId: "butadiene-maleate",
    }),
    solution: {
      whatHappened:
        "Buta-1,3-diene and dimethyl maleate. The diene supplies four carbons of the new six " +
        "membered ring and the dienophile supplies two.",
      why:
        "Running the reaction backwards means cutting the two bonds that were made. Those are the " +
        "two single bonds on either side of the ring's double bond, at the 3 and 6 positions " +
        "counting from the double bond. Cutting them leaves a four carbon diene and a two carbon " +
        "alkene carrying both esters. The esters are cis in the product, and the cycloaddition " +
        "delivers both new bonds to the same face of the dienophile, so they were cis in the " +
        "dienophile too.",
      lookAt:
        "Find the ring's double bond first and count two carbons away in each direction. Those two " +
        "bonds are the ones the reaction made.",
    },
    distractors: [
      {
        id: "cis-trans-flattened",
        state: { kind: "multiple_choice", optionId: "butadiene-fumarate" },
        explanation: {
          whatHappened:
            "The two pieces are cut correctly and the trans dienophile is chosen for a cis product.",
          why:
            "The cycloaddition forms both new bonds on the same face of the dienophile at the same " +
            "moment, so neither carbon ever gets a chance to rotate. Whatever relationship the two " +
            "esters had across the double bond is the relationship they keep on the ring. Trans in, " +
            "trans out; the cis product needs the cis dienophile.",
          lookAt:
            "Carry the geometry across rather than re-deriving it. The stereochemistry of the " +
            "dienophile is preserved, which makes this reaction a test of the starting material.",
        },
      },
      {
        id: "cyclic-diene-chosen",
        state: { kind: "multiple_choice", optionId: "cyclohexadiene-maleate" },
        explanation: {
          whatHappened: "This uses a cyclic diene, which changes the skeleton of the product.",
          why:
            "A cyclic diene brings its own ring along, and the new six membered ring forms across " +
            "it, so the product is a bridged bicyclic rather than a single cyclohexene. The product " +
            "named here has one ring and six carbons in it, which is what an open chain diene gives.",
          lookAt:
            "Count the rings in the product before choosing a diene. One ring means the diene was " +
            "acyclic and the dienophile was too.",
        },
      },
      {
        id: "wrong-pi-count",
        state: { kind: "multiple_choice", optionId: "triene-maleate" },
        explanation: {
          whatHappened: "This offers a six carbon triene as the diene component.",
          why:
            "The Diels-Alder joins a four carbon piece to a two carbon piece to make a six carbon " +
            "ring, and a triene brings six carbons of pi system rather than four. Two of them would " +
            "have to sit outside the new ring, which does not match a product whose ring accounts " +
            "for all six carbons plus the two ester carbons.",
          lookAt:
            "Count carbons on both sides. Four from the diene plus two from the dienophile has to " +
            "equal the six in the new ring.",
        },
      },
    ],
    tags: ["diels-alder", "reverse-direction", "suprafacial"],
  }),
]);
