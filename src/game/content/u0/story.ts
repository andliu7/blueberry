/**
 * Unit 0 ("Start here"), the story. Hand written, data only. DRAFT COPY: every
 * line a student reads here waits for the owner's sign off.
 *
 * THE STORY. Bloom finds a lab notebook with its pages missing. Each chapter
 * gets one page back: an animated scene (the `video` node, played in-app as
 * stepped drawings and curved arrows, no real video) and then a short lesson
 * on that chapter's pool (content/u0/pools.ts). Chapter 9 unfolds the map of
 * all fifteen units, and that map is the unit picker.
 *
 * HOW THE NODES PLAY TODAY (round 2). A chapter's second node has role
 * `lesson`, not `practice`: it plays its whole pool once, in the seven-slot
 * lesson (tap, match, drag, draw), under the lesson's one progress strip.
 * A `practice` node plays the in-a-row run, which tiers at "3 for Pro", stops
 * early and can end before a tutorial has shown every control (critic, round
 * 1). The scene node plays its "guess first" question (primeItem, level 0,
 * ungraded), then the steps below as a tap-through card (beats/StoryScene.tsx,
 * 23 Oct) until the animated scene player is built.
 *
 * WHY UNIT 0 IS NOT IN PATHWAY_UNITS. Adding it would move the inventory pins
 * (208 nodes over 15 units, the spine counts, coverage()) and deriveMapPathway
 * would lock Unit 1 behind an unfinished Unit 0 for every existing student. So
 * Unit 0 is its own PathwayUnit-shaped constant, and pathwayNode() falls back to
 * storyNode() below when no map node matches.
 *
 * NO CHEMISTRY IS TYPED HERE. Every drawing is a key into U0_STORY_FIGURES,
 * which scripts/u0_pools.py writes with RDKit, and every highlighted atom and
 * every arrow end is read from that file's named atoms and bonds (the EN rule
 * delta plus carbon, the CIP stereocentre, the leaving group), never counted by
 * hand. Narration only paraphrases what the pool explanations already say.
 * The delta plus carbon is found by the bond polarity rule on the script's
 * cited electronegativity table, not by Gasteiger charges (see the report).
 *
 * IMPORTS. pathwayMap.ts imports this file, so this file takes only TYPES from
 * it (`import type` is erased at build time, so there is no import cycle at
 * runtime). It reads figures.ts and never pools.ts, so the big pools file stays
 * out of the chunk the pathway map ships in.
 */
import type { PathwayNode, PathwayUnit } from "../../demo/pathwayMap";
import type { BerryMood } from "../../mascot/berryMood";
import { U0_STORY_FIGURES, type StoryFigureId } from "./figures";

/** The control a step invites the student to try on the drawing. */
export type TryIt = "tap" | "drag" | "match" | "draw" | "arrow";

/**
 * One curved arrow on a scene drawing, by RDKit atom index (and bonds as their
 * two atom indexes). The tail is where the electrons are, the head where they go:
 * set one `from` and one `to`.
 */
export interface StoryArrow {
  readonly fromAtom?: number;
  readonly fromBond?: readonly [number, number];
  readonly toAtom?: number;
  readonly toBond?: readonly [number, number];
}

export interface StoryStep {
  /** Bloom's line. One or two short sentences, never disappointed in the student (documentation/MASCOT.md). */
  readonly narration: string;
  /** Bloom's face for the line. */
  readonly mood: BerryMood;
  /** The drawing, a key into the generated U0_STORY_FIGURES. A narration-only step has none. */
  readonly figure?: StoryFigureId;
  /** Atoms drawn in colour, by RDKit index into the figure's SMILES. */
  readonly highlights?: readonly number[];
  /** Curved arrows drawn on the figure, in the order they animate. */
  readonly arrows?: readonly StoryArrow[];
  /** A control to try on this step. */
  readonly tryIt?: TryIt;
  /** A chart drawn in place of a molecule: "sn" is U0_SN_CHART (pools.ts), chapter 7's decision table. */
  readonly chart?: "sn";
}

export interface StoryScene {
  readonly steps: readonly StoryStep[];
}

export interface StoryChapter {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  /** The notebook page this chapter recovers, as the page's heading. */
  readonly page: string;
  /** The `video` node that plays the scene. */
  readonly sceneNode: string;
  /** The `practice` node: its id is the chapter's pool key in U0_POOLS. */
  readonly practiceNode: string;
  /**
   * The ungraded "guess first" question that opens the scene (Justin Sung's
   * priming, scratchpad research): a level 0 MCQ in the SCENE node's own pool,
   * never one of the chapter's practice items (round 2: reusing them meant the
   * same question ungraded, then graded, then in the test out).
   */
  readonly primeItem: string;
  readonly bloomIntro: string;
  readonly bloomOutro: string;
  readonly scene: StoryScene;
  /** An existing arrow card the scene hands over to (demo/resonance.ts RESONANCE_HUNT id), by id. */
  readonly arrowCard?: string;
  /** An existing mechanism step the scene replays (demo/sn2Step.ts SN2_DEMO_STEP.id), by id. */
  readonly mechanismStep?: string;
  /** The scene ends by opening the unit picker (chapter 9's map). */
  readonly opensPicker?: true;
}

const F = U0_STORY_FIGURES;

/*
 * The chapters, in teaching order. Draft copy throughout.
 */
export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: "u0-ch1",
    number: 1,
    title: "Your lab bench",
    page: "Page 1: the bench",
    sceneNode: "u0-controls-scene",
    practiceNode: "u0-controls",
    primeItem: "u0-prime-ch1",
    bloomIntro: "Oh! A lab notebook, and most of its pages are missing. Help me find them?",
    bloomOutro: "Page one is back in the book. Your bench is ready.",
    arrowCard: "res-acetate",
    scene: {
      steps: [
        { narration: "This is your bench. Every page we find starts with a drawing, like ethanol here.", mood: "curious", figure: "ethanol" },
        { narration: "Tap to pick. Try tapping the O-H.", mood: "happy", figure: "ethanol", highlights: [F.ethanol.atoms.o], tryIt: "tap" },
        { narration: "Some cards come in a pile. Drag them into order.", mood: "focused", tryIt: "drag" },
        { narration: "Match cards pair two things up, like a drawing and its formula.", mood: "focused", tryIt: "match" },
        { narration: "Draw cards hand you a sketchpad. You will build ethanol yourself.", mood: "excited", figure: "ethanol", tryIt: "draw" },
        {
          narration: "Last tool: the curved arrow. Drag from the electrons to where they go.",
          mood: "cheer",
          figure: "acetate",
          highlights: [F.acetate.atoms.oMinus],
          arrows: [{ fromAtom: F.acetate.atoms.oMinus, toBond: F.acetate.bonds.co }],
          tryIt: "arrow",
        },
      ],
    },
  },
  {
    id: "u0-ch2",
    number: 2,
    title: "Bonds and formal charge",
    page: "Page 2: who owns which electrons",
    sceneNode: "u0-bonding-scene",
    practiceNode: "u0-bonding",
    primeItem: "u0-prime-ch2",
    bloomIntro: "This page is all about bonds. Guess first, then we will check together.",
    bloomOutro: "Page two! Formal charge is just bookkeeping.",
    scene: {
      steps: [
        { narration: "Water's O makes two bonds and keeps two lone pairs.", mood: "reading", figure: "water", highlights: [F.water.atoms.o] },
        { narration: "Formal charge: the electrons an atom brought, minus the ones it owns.", mood: "thinking" },
        { narration: "In ammonium, N has four bonds and no lone pair. It owns 4 of its 5, so it is +1.", mood: "focused", figure: "ammonium", highlights: [F.ammonium.atoms.n] },
        { narration: "Hydroxide's O owns 7 against the 6 it brought. That is minus 1.", mood: "happy", figure: "hydroxide", highlights: [F.hydroxide.atoms.o] },
      ],
    },
  },
  {
    id: "u0-ch3",
    number: 3,
    title: "Resonance",
    page: "Page 3: one ion, two drawings",
    sceneNode: "u0-resonance-scene",
    practiceNode: "u0-resonance",
    primeItem: "u0-prime-ch3",
    bloomIntro: "This page has two drawings of the same ion. Which one is right? Guess.",
    bloomOutro: "Page three. Both drawings were right, together.",
    scene: {
      steps: [
        { narration: "Acetate. The minus sits on this O.", mood: "curious", figure: "acetate", highlights: [F.acetate.atoms.oMinus] },
        {
          narration: "Push its lone pair in, and the pi bond's pair steps out onto the other O.",
          mood: "focused",
          figure: "acetate",
          arrows: [
            { fromAtom: F.acetate.atoms.oMinus, toBond: F.acetate.bonds.co },
            { fromBond: F.acetate.bonds.cDoubleO, toAtom: F.acetate.atoms.oDouble },
          ],
          tryIt: "arrow",
        },
        { narration: "Now the minus is on the other O. Same atoms; only electrons moved.", mood: "excited", figure: "acetateB", highlights: [F.acetateB.atoms.oMinus] },
        { narration: "The real ion is a blend of both: the charge is shared by both O atoms.", mood: "proud", figure: "acetate", highlights: [F.acetate.atoms.oMinus, F.acetate.atoms.oDouble] },
      ],
    },
  },
  {
    id: "u0-ch4",
    number: 4,
    title: "Acids and bases",
    page: "Page 4: who gives up the H⁺",
    sceneNode: "u0-acids-scene",
    practiceNode: "u0-acids",
    primeItem: "u0-prime-ch4",
    bloomIntro: "A page on acids. Which one gives up its H⁺ more easily? Take a guess.",
    bloomOutro: "Page four. Lower pKa, stronger acid.",
    scene: {
      steps: [
        { narration: "Acetic acid. An acid gives away an H⁺, and this O-H is the one to go.", mood: "reading", figure: "aceticAcid", highlights: [F.aceticAcid.atoms.oh] },
        { narration: "What is left is the conjugate base, acetate. Its O keeps the pair.", mood: "focused", figure: "acetate", highlights: [F.acetate.atoms.oMinus] },
        { narration: "Acetate shares its charge over two O atoms. A steadier base means a stronger acid.", mood: "happy", figure: "acetate", highlights: [F.acetate.atoms.oMinus, F.acetate.atoms.oDouble] },
        { narration: "Water can give one up too, and becomes hydroxide. It holds on much harder.", mood: "thinking", figure: "hydroxide", highlights: [F.hydroxide.atoms.o] },
      ],
    },
  },
  {
    id: "u0-ch5",
    number: 5,
    title: "Nucleophiles and electrophiles",
    page: "Page 5: rich meets poor",
    sceneNode: "u0-nuc-elec-scene",
    practiceNode: "u0-nuc-elec",
    primeItem: "u0-prime-ch5",
    bloomIntro: "This page pairs things up: who gives electrons, and who takes them? Guess first.",
    bloomOutro: "Page five. Every reaction ahead starts with this pairing.",
    scene: {
      steps: [
        { narration: "Hydroxide has lone pairs and a minus. It has a pair to give: a nucleophile.", mood: "curious", figure: "hydroxide", highlights: [F.hydroxide.atoms.o] },
        { narration: "In bromomethane, Br pulls on the C-Br bond, so the carbon is delta plus: an electrophile.", mood: "focused", figure: "bromomethane", highlights: [F.bromomethane.atoms.deltaPlus] },
        { narration: "Electron rich goes to electron poor. Keep that pairing in your pocket.", mood: "happy", figure: "sn2Start", highlights: [F.sn2Start.atoms.nucleophile, F.sn2Start.atoms.carbon] },
      ],
    },
  },
  {
    id: "u0-ch6",
    number: 6,
    title: "Curved arrows",
    page: "Page 6: how electrons move",
    sceneNode: "u0-arrows-scene",
    practiceNode: "u0-arrows",
    primeItem: "u0-prime-ch6",
    mechanismStep: "sn2-demo-step",
    bloomIntro: "A page of arrows. Where do you think the first one starts?",
    bloomOutro: "Page six. Arrows start at electrons, every time.",
    scene: {
      steps: [
        {
          narration: "The first arrow starts at the O lone pair and ends on the delta plus carbon.",
          mood: "focused",
          figure: "sn2Start",
          highlights: [F.sn2Start.atoms.nucleophile],
          arrows: [{ fromAtom: F.sn2Start.atoms.nucleophile, toAtom: F.sn2Start.atoms.carbon }],
          tryIt: "arrow",
        },
        {
          narration: "The second starts on the C-Br bond and ends on Br, which leaves with both electrons.",
          mood: "focused",
          figure: "sn2Start",
          highlights: [F.sn2Start.atoms.leaving],
          arrows: [
            { fromAtom: F.sn2Start.atoms.nucleophile, toAtom: F.sn2Start.atoms.carbon },
            { fromBond: F.sn2Start.bonds.cbr, toAtom: F.sn2Start.atoms.leaving },
          ],
        },
        { narration: "Follow the arrows and you get methanol and bromide.", mood: "cheer", figure: "sn2End" },
      ],
    },
  },
  {
    id: "u0-ch7",
    number: 7,
    title: "SN1, SN2, E1, E2 at a glance",
    page: "Page 7: four ways a bromide reacts",
    sceneNode: "u0-subst-elim-scene",
    practiceNode: "u0-subst-elim",
    primeItem: "u0-prime-ch7",
    bloomIntro: "This page is a decision chart. Guess which way the first one goes.",
    bloomOutro: "Page seven. Carbon, reagent, solvent: that is the whole chart.",
    scene: {
      steps: [
        { narration: "Count the carbons on the C-Br carbon. Here there are three: a 3° carbon.", mood: "thinking", figure: "tbubr", highlights: [F.tbubr.atoms.carbon] },
        { narration: "In water, Br leaves first and a 3° cation forms. Water adds to it: SN1.", mood: "focused", figure: "tbuCation", highlights: [F.tbuCation.atoms.carbon] },
        { narration: "Warm it instead, and the cation can lose an H from next door: E1.", mood: "curious", figure: "tbuCation", highlights: [F.tbuCation.atoms.beta] },
        { narration: "That makes 2-methylpropene. SN1 and E1 share the cation, so they come together.", mood: "focused", figure: "e1Alkene" },
        { narration: "Give 2-bromobutane a strong base: it pulls an H off this neighbour as Br leaves. E2.", mood: "focused", figure: "bromobutane2", highlights: [F.bromobutane2.atoms.beta, F.bromobutane2.atoms.carbon] },
        { narration: "Of the alkenes E2 can make, the more substituted one wins: but-2-ene.", mood: "proud", figure: "but2ene" },
        { narration: "A methyl carbon is the opposite: open at the back, so a good nucleophile walks in. SN2.", mood: "happy", figure: "bromomethane", highlights: [F.bromomethane.atoms.deltaPlus] },
        { narration: "Here is the whole chart: the carbon's class down the side, the reagent across the top.", mood: "proud", chart: "sn" },
      ],
    },
  },
  {
    id: "u0-ch8",
    number: 8,
    title: "Stereochemistry basics",
    page: "Page 8: left hand, right hand",
    sceneNode: "u0-stereo-scene",
    practiceNode: "u0-stereo",
    primeItem: "u0-prime-ch8",
    bloomIntro: "The last review page is about shape in 3D. Guess how many stereocentres first.",
    bloomOutro: "Page eight. The notebook is almost whole.",
    scene: {
      steps: [
        { narration: "This carbon holds four different groups: a stereocentre.", mood: "curious", figure: "rButanol", highlights: [F.rButanol.atoms.stereocentre] },
        { narration: "Rank its groups by atomic number: OH first, H last.", mood: "focused", figure: "rButanol", highlights: [F.rButanol.atoms.stereocentre] },
        { narration: "Point H away from you, then trace 1 to 2 to 3. Clockwise is R, and this one is R.", mood: "focused", figure: "rButanol", highlights: [F.rButanol.atoms.stereocentre] },
        { narration: "Its mirror image turns the other way: S. The two are enantiomers.", mood: "excited", figure: "sButanol", highlights: [F.sButanol.atoms.stereocentre] },
        { narration: "On an alkene, top groups on opposite sides make E. This is (E)-2-butene.", mood: "happy", figure: "eButene", highlights: [...F.eButene.bonds.alkene] },
      ],
    },
  },
  {
    id: "u0-ch9",
    number: 9,
    title: "A peek at Orgo II",
    page: "The map",
    sceneNode: "u0-preview-scene",
    practiceNode: "u0-preview",
    primeItem: "u0-prime-ch9",
    opensPicker: true,
    bloomIntro: "The last page folds out. It is a map! Which ring do you think is special?",
    bloomOutro: "The notebook is whole. Pick any unit on the map and let's go.",
    scene: {
      steps: [
        { narration: "Benzene. A flat ring of p orbitals with six pi electrons, and extra stable. Units 2 to 4.", mood: "excited", figure: "benzene" },
        { narration: "A diene and a C=C close a six-membered ring in one step. That is Unit 1.", mood: "curious", figure: "cyclohexene" },
        { narration: "Fifteen units in all. Each one starts from a page you just found.", mood: "proud" },
      ],
    },
  },
];

/** The test out quiz. Passing it finishes Unit 0 without the chapters. */
export const STORY_CHECK_NODE = "u0-check";

/**
 * Clearing either of these finishes Unit 0 and opens the unit picker: the last
 * chapter's practice (the map), or the test out quiz.
 */
export const U0_FINISH_NODES: readonly string[] = ["u0-preview", STORY_CHECK_NODE];

function sceneNodeOf(chapter: StoryChapter): PathwayNode {
  return {
    id: chapter.sceneNode,
    kind: "spine",
    role: "video",
    title: chapter.title,
    blurb: `Chapter ${chapter.number}: ${chapter.page}. Bloom shows the idea, step by step.`,
    playable: { kind: "beat", id: chapter.sceneNode },
  };
}

// Role `lesson`, so the pool plays once through in the seven-slot lesson (see the header).
function practiceNodeOf(chapter: StoryChapter): PathwayNode {
  return {
    id: chapter.practiceNode,
    kind: "spine",
    role: "lesson",
    title: `${chapter.title}: try it`,
    blurb: `Every card in chapter ${chapter.number}, once each.`,
    playable: { kind: "beat", id: chapter.practiceNode },
  };
}

const CHECK_NODE: PathwayNode = {
  id: STORY_CHECK_NODE,
  // The unit checkpoint is the map's one `gate` (see unitCheckpointNode in pathwayMap.ts).
  kind: "gate",
  role: "quiz",
  title: "Test out",
  blurb: "Know Orgo I already? A mixed quiz from chapters 2 to 8. Pass it to skip to the map.",
  playable: { kind: "beat", id: STORY_CHECK_NODE },
};

/**
 * Nodes open from the very start, whatever is cleared: the first scene, and
 * the test out, so a student who knows Orgo I can skip without playing
 * chapters 2 to 8 first (round 2 critic: a test out behind every chapter is
 * not a skip). The map honours this list; spine order alone would lock it.
 */
export const U0_OPEN_FROM_START: readonly string[] = ["u0-controls-scene", STORY_CHECK_NODE];

/**
 * Unit 0 in the PathwayUnit shape. The test out sits right after chapter 1,
 * once the student has used a card, and before the Orgo I review. The title is "Unit 0" + UNIT_TITLE_SEPARATOR
 * + "Start here", written out because this file may only import pathwayMap's
 * types; test/u0Pools.test.ts pins it against the separator.
 */
export const STORY_UNIT: PathwayUnit = {
  id: "u0",
  title: "Unit 0 · Start here",
  note: "The tutorial new students start in. Finishing it, or testing out, opens the unit picker.",
  examBlurb: CHECK_NODE.blurb,
  nodes: [
    ...STORY_CHAPTERS.slice(0, 1).flatMap((chapter) => [sceneNodeOf(chapter), practiceNodeOf(chapter)]),
    CHECK_NODE,
    ...STORY_CHAPTERS.slice(1).flatMap((chapter) => [sceneNodeOf(chapter), practiceNodeOf(chapter)]),
  ],
};

export const STORY_NODE_IDS: readonly string[] = STORY_UNIT.nodes.map((node) => node.id);

/** A Unit 0 node by id, or null. pathwayNode() falls back to this. */
export function storyNode(id: string): PathwayNode | null {
  return STORY_UNIT.nodes.find((node) => node.id === id) ?? null;
}

/**
 * The chapter whose scene this node plays, or null for every other node.
 * BeatRunner plays that scene as a tap-through card (beats/StoryScene.tsx)
 * right after the node's guess-first question, inside the same meet step, so
 * the guess still comes before the answer (content audit 23 Oct, top-25 #5).
 */
export function sceneChapterFor(nodeId: string): StoryChapter | null {
  return STORY_CHAPTERS.find((chapter) => chapter.sceneNode === nodeId) ?? null;
}

/** The chapter a scene or practice node belongs to, or null. */
export function storyChapterFor(nodeId: string): StoryChapter | null {
  return STORY_CHAPTERS.find((chapter) => chapter.sceneNode === nodeId || chapter.practiceNode === nodeId) ?? null;
}
