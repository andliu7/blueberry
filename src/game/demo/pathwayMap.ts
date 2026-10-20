/**
 * The Orgo II pathway map as data: every node of the owner's full inventory
 * (reference images/Orgo_Pathway_Map_Full.pdf), classified by dependency load
 * exactly as the source classifies them. Unit 1 is the exception: it was
 * rebuilt from the owner's whiteboard on 2026-10-07 and no longer mirrors the
 * PDF, which moves the totals to 208 nodes across 15 units.
 *
 *   spine   Required. Blocks downstream units. 105 nodes (Unit 2 draft, 2026-10-17: five gates became spine).
 *   branch  Optional side quest, reachable later at no cost. 97 nodes.
 *   gate    No preparative reactions: checkpoint quiz or parallel track. 5.
 *   boss    Integration node, gated on multiple units. 1.
 *
 * `playable` links a node to a trainer entry that exists TODAY: a reaction id,
 * a sequence id, or a resonance id. A node without one is authoring queue,
 * not absence of intent, and the browser shows it that way. This file is the
 * coverage ledger the waves burn down: when a wave lands, its nodes gain
 * their `playable` link here, and the count on the browser header moves.
 */

import type { NodeKind as EconomyNodeKind } from "@blueberry/economy";
import { lessonTrainerFor } from "../content/u1/lessonTrainers";
// Unit 0 is its own unit, not in PATHWAY_UNITS (see content/u0/story.ts); story.ts imports only types from here.
import { storyNode } from "../content/u0/story";

export type NodeKind = "spine" | "branch" | "gate" | "boss";

export type PlayableLink =
  | { readonly kind: "reaction"; readonly id: string }
  | { readonly kind: "sequence"; readonly id: string }
  | { readonly kind: "resonance"; readonly id: string }
  /**
   * A lesson beat rather than a mechanism: an MCQ, a matching board, a ladder
   * to sort, or a synthesis gap. The id is the node's own id, because a beat is
   * authored for one slot on the map and BeatRunner resolves the node to
   * whichever surface has content for it.
   */
  | { readonly kind: "beat"; readonly id: string };

export interface PathwayNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly title: string;
  readonly blurb: string;
  readonly playable?: PlayableLink;
  /**
   * The course names this topic and teaches nothing to practise on it. Not
   * the authoring queue: a queued node is waiting for content, a mention is
   * not going to get any from this map. The pathway draws it as a line of
   * text rather than a chip, so it cannot be mistaken for a lesson. Set by
   * hand, only on a node whose own blurb already says "Conceptual mention."
   */
  readonly mentionOnly?: true;
  /**
   * A SIDE QUEST'S PREREQUISITES, by id, all in the same unit and authored
   * above it. Owner direction 2026-10-01, "make the lessons follow a
   * predictable path": the main line needs no field, because its AUTHORED
   * ORDER is its unlock order (each lesson opens the next). A branch is off
   * that line, so it says what it waits for here, with what its own content
   * uses from it written beside the node. A branch with no `after` waits for
   * every main-line lesson authored before it. deriveMapPathway
   * (tabs/pathway/pathwayState.ts) reads this; the UI never restates it.
   */
  readonly after?: readonly string[];
  /**
   * WHAT THE STUDENT DOES HERE, owner whiteboard of 2026-09-29, recorded on
   * Unit 1 first. Separate from `kind`, which keeps its meaning of dependency
   * load: a `video` node opens on a short explainer and plays its lesson, a
   * `practice` node plays the in-a-row run (beats/practice/run.ts), a `quiz`
   * node is a stage checkpoint on the main line. A stage quiz is never
   * `kind: "gate"`: the unit's one gate is its synthetic checkpoint
   * (unitCheckpointNode below). Unset on every unit not yet rebuilt.
   * `lesson` says outright what unset means: the plain seven-slot lesson,
   * no explainer first (Unit 0's chapter lessons, content/u0/story.ts).
   */
  readonly role?: NodeRole;
  /** The explainer's planned length in minutes, for a `video` node that has one set. */
  readonly videoMinutes?: number;
  /** Short background videos the guidebook lists in its Background section. */
  readonly backgroundTopics?: readonly BackgroundTopic[];
}

export type NodeRole = "video" | "practice" | "quiz" | "lesson";

/**
 * One short background clip, owner 2026-09-29: the guidebook's fourth part.
 * Rendered through lesson/LessonVideo, so until a clip exists it is the
 * template strip and the page stands without it.
 */
export interface BackgroundTopic {
  readonly id: string;
  readonly title: string;
  /** Planned length, in minutes. A clip under a minute is written as 1. */
  readonly minutes: number;
}

export interface PathwayUnit {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly nodes: readonly PathwayNode[];
  /** What the checkpoint says it is, when the unit has an exam pool rather than the derived mix. */
  readonly examBlurb?: string;
}

/*
 * UNIT 1'S BACKGROUND CLIPS, owner whiteboard 2026-09-29: the guidebook's
 * fourth part. Written once and attached by reference. R/S and E/Z were
 * crossed out on the whiteboard and are deliberately absent.
 */
const BG_CATION: BackgroundTopic = { id: "bg-cation-stability", title: "C⁺ stability", minutes: 2 };
const BG_HOMO_LUMO: BackgroundTopic = { id: "bg-homo-lumo", title: "HOMO/LUMO", minutes: 2 };
// "30 s to 1 min" on the whiteboard; the field is whole minutes, so 1.
const BG_FMO: BackgroundTopic = { id: "bg-fmo", title: "Frontier MO theory", minutes: 1 };
const BG_STAGE_A = [BG_CATION];
const BG_STAGE_D = [BG_HOMO_LUMO, BG_FMO];

export const PATHWAY_UNITS: readonly PathwayUnit[] = [
  {
    id: "u1",
    title: "Unit 1 · Conjugation, Resonance & Dienes",
    note: "Gates Unit 9's control logic and all of Unit 12.",
    // The exam is a pool (beats/practice/pools.ts), so the checkpoint says that instead of the mix.
    examBlurb: "The unit exam: allylic stability, diene addition and Diels-Alder, in turn. Three in a row passes it.",
    // REBUILT 2026-10-07 from the owner's whiteboard (prompt of 2026-09-29), in four stages, and
    // no longer a mirror of the PDF inventory. The 1 Oct rulings shape it: one main line in
    // dependency order (no D2a | D2b fork, so dienes then dienophiles), side quests beside it,
    // stage quizzes on the line. A node with no `playable` is coming soon and waits for nothing.
    // A practice node gains its link only when its pool exists (content/u1); playable.test.ts
    // fails a link with nothing behind it.
    nodes: [
      // STAGE A, allylic stability.
      { id: "u1-allylic", kind: "spine", role: "video", videoMinutes: 2, title: "Allylic/resonance delocalization", blurb: "Draw and rank the resonance forms of the allyl cation, radical and anion.", playable: { kind: "beat", id: "u1-allylic" }, backgroundTopics: [BG_CATION, BG_HOMO_LUMO] },
      { id: "u1-rank-cation", kind: "spine", role: "practice", title: "Rank carbocation stability", blurb: "Order the ladders, then answer quick questions on substitution and resonance.", playable: { kind: "beat", id: "u1-rank-cation" }, backgroundTopics: BG_STAGE_A },
      { id: "u1-rank-anion", kind: "spine", role: "practice", title: "Rank carbanion stability", blurb: "The alkyl trend flips; resonance and s-character still help.", playable: { kind: "beat", id: "u1-rank-anion" }, backgroundTopics: BG_STAGE_A },
      // Optional, owner 2026-09-29: radicals stay off Practice and the stage quiz.
      { id: "u1-rank-radical", kind: "branch", role: "practice", title: "Rank radical stability", blurb: "Optional: radicals follow the cation trend; allylic and benzylic win.", playable: { kind: "beat", id: "u1-rank-radical" }, after: ["u1-rank-anion"], backgroundTopics: BG_STAGE_A },
      { id: "u1-quiz-a", kind: "spine", role: "quiz", title: "Allylic stability checkpoint", blurb: "Use resonance to find the most stable cation and anion.", playable: { kind: "beat", id: "u1-quiz-a" }, backgroundTopics: BG_STAGE_A },
      // STAGE B, addition to dienes. 12v14 BEFORE kvt, against the whiteboard's order, because
      // the owner's 1 Oct dependency rule wins: mcq-kvt-cold, -warm and -statement all ask for
      // "the 1,2 product" or "the 1,4 product" of HBr and butadiene, which 12v14 teaches.
      // seq-diene protonates butadiene to the allyl cation u1-allylic drills.
      { id: "u1-12v14", kind: "spine", role: "video", title: "1,2- vs 1,4-addition of HX", blurb: "Kinetic 1,2 cold, thermodynamic 1,4 warm.", playable: { kind: "beat", id: "u1-12v14" }, backgroundTopics: BG_STAGE_A },
      { id: "u1-kvt", kind: "spine", role: "video", title: "Kinetic vs thermodynamic control", blurb: "Hammond postulate, reaction coordinate diagrams.", playable: { kind: "beat", id: "u1-kvt" } },
      { id: "u1-energy-diagram", kind: "spine", role: "practice", title: "Energy diagrams and reaction coordinate", blurb: "Read TS height against product depth on a two-product diagram.", playable: { kind: "beat", id: "u1-energy-diagram" } },
      { id: "u1-hx-dienes", kind: "spine", role: "practice", title: "HX + dienes: kinetic or thermodynamic", blurb: "Given a diene, HX and a temperature, give the major product.", backgroundTopics: BG_STAGE_A, playable: { kind: "beat", id: "u1-hx-dienes" } },
      // seq-diene-br2 ends on the 1,4 dihalide, the thermodynamic product kvt explains (owner, 2026-10-01).
      // Role practice per the whiteboard; it keeps its sequence, so it plays that, not a pool run.
      { id: "u1-x2", kind: "spine", role: "practice", title: "X₂ addition to dienes", blurb: "Br₂, Cl₂ → 1,2- and 1,4-dihalides, same allylic-cation logic.", playable: { kind: "beat", id: "u1-x2" } },
      { id: "u1-quiz-b", kind: "spine", role: "quiz", title: "Kinetic/thermo diene addition checkpoint", blurb: "Mixed diene addition: mechanism first, then conditions.", playable: { kind: "beat", id: "u1-quiz-b" } },
      // STAGE C, allylic halogenation: side quests after Stage B (D5 superseded, owner
      // 2026-09-29). Split over two rows because a side lane holds two items
      // (pathwayBranchDensity): the explainer waits for X2, its practice and check for the Stage B
      // quiz the whiteboard hangs them off. mcq-nbs-position is tagged resonance_delocalisation:
      // its answer is the delocalised allylic radical, which Stage A teaches.
      { id: "u1-nbs", kind: "branch", role: "video", title: "Allylic halogenation", blurb: "NBS, hν; low [Br₂] is the whole trick.", playable: { kind: "beat", id: "u1-nbs" }, after: ["u1-x2"] },
      { id: "u1-nbs-practice", kind: "branch", role: "practice", title: "NBS with hν or ROOR, CCl₄", blurb: "Find the allylic H's, draw every product, spot the initiator.", playable: { kind: "beat", id: "u1-nbs-practice" }, after: ["u1-nbs", "u1-quiz-b"] },
      { id: "u1-quiz-c", kind: "branch", role: "quiz", title: "Allylic halogenation check", blurb: "NBS, start to finish.", playable: { kind: "beat", id: "u1-quiz-c" }, after: ["u1-nbs-practice"] },
      // STAGE D, Diels-Alder, the main line to the exam. u1-mo is required, owner 2026-09-29:
      // the Diels-Alder checklist opens with "HOMO and LUMO in phase".
      { id: "u1-mo", kind: "spine", role: "practice", title: "π MO ladders and HOMO/LUMO", blurb: "Build the ladder, count nodes, label HOMO and LUMO.", playable: { kind: "beat", id: "u1-mo" }, backgroundTopics: BG_STAGE_D },
      // SPINE SINCE 2026-10-07 (was a branch), owner 2026-09-29: about 14 exam points with dienes.
      // The diels-alder card (demo/dielsAlder.ts) pushes two kinds of arrow: a pi bond shifting to
      // the next bond (a-da-right), which res-allyl-1's a-shift drills, and a pi bond attacking to
      // make a new sigma bond (a-da-left, a-da-dienophile), which seq-diene's a-pi-grab (u1-12v14)
      // drills first. Both sit above it on the line. Its trace beats self-teach the s-cis diene
      // and the dienophile one at a time.
      { id: "u1-da", kind: "spine", role: "video", videoMinutes: 3, title: "Diels–Alder", blurb: "s-cis diene + EWG dienophile; endo rule, stereospecific.", playable: { kind: "beat", id: "u1-da" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-dienes", kind: "spine", role: "video", title: "Dienes", blurb: "The diene must reach s-cis; locked s-cis is fast.", playable: { kind: "beat", id: "u1-dienes" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-dienophiles", kind: "spine", role: "video", title: "Dienophiles", blurb: "EWGs on the dienophile: C=O, CN, NO₂.", playable: { kind: "beat", id: "u1-dienophiles" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-da-predict", kind: "spine", role: "practice", title: "Predict starting materials or product", blurb: "Forward and backward, with ortho/para regiochemistry.", playable: { kind: "beat", id: "u1-da-predict" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-da-stereo", kind: "spine", role: "video", title: "Diels–Alder stereochemistry", blurb: "Suprafacial, endo, fused and bridged rings.", playable: { kind: "beat", id: "u1-da-stereo" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-da-3d", kind: "spine", role: "practice", title: "3D products", blurb: "Wedge-dash products, endo vs exo, ring cases.", playable: { kind: "beat", id: "u1-da-3d" }, backgroundTopics: BG_STAGE_D },
      { id: "u1-quiz-d", kind: "spine", role: "quiz", title: "Diels–Alder checkpoint", blurb: "The Diels–Alder, start to finish.", playable: { kind: "beat", id: "u1-quiz-d" }, backgroundTopics: BG_STAGE_D },
      // Enrichment after Stage D, unchanged: mcq-ied-roles asks what changes when the
      // Diels-Alder's donor and acceptor roles are swapped, so it waits for the Diels-Alder.
      { id: "u1-ied", kind: "branch", title: "Inverse/hetero Diels–Alder", blurb: "Carbonyl or imine in the cycloaddition.", playable: { kind: "beat", id: "u1-ied" }, after: ["u1-da"] },
      { id: "u1-poly", kind: "branch", title: "Radical polymerization of dienes", blurb: "Conceptual mention.", mentionOnly: true },
    ],
  },
  {
    id: "u2",
    title: "Unit 2 · Aromaticity & Benzene",
    // Draft content since 2026-10-17 (owner: "complete like Unit 1"), so the note names the topics; the old note called it a checkpoint quiz.
    note: "Aromaticity: the four Hückel tests, then charged rings, annulenes and heterocycles. Unlocks Unit 3.",
    // The u2 checkpoint plays an exam pool (beats/practice/pools.ts), so it says so, as Unit 1's does. Draft copy.
    // Round 3: the checkpoint plays as a whole exam (pools.ts isExamRun), so the blurb says that rule, not "three in a row".
    examBlurb: "The unit exam: every question once, Hückel, charged rings, annulenes, heterocycles and ring-current NMR mixed. 80% right first time passes it.",
    nodes: [
      // Unit 2 DRAFT (2026-10-17). KIND STAYS "gate", as briefed: spine would move the owner's inventory pin in
      // reactions.test.ts (100 spine). An all-gate unit is a checkpoint unit (unitShape.ts isCheckpointUnit), so these
      // playable gates draw as the gate run before the unit check. Whether Unit 2 becomes a spine lesson unit is the owner's call.
      // Each row gets a role and its own beat so it plays end to end.
      // Round 4: charged, annulene and hetero are role "video" (a lesson that opens on worked examples, as u1's video
      // nodes do), not "practice": the owner's 2026-10-17 rule is that every lesson node plays the seven-slot lesson,
      // and the in-a-row run hid their last items from a clean run. Nomenclature stays the unit's in-a-row problem set.
      // Charged rings come before annulenes because u2-ann-ladder-cation and u2-ann-azulene lean on charged rings.
      { id: "u2-huckel", kind: "gate", role: "video", title: "Hückel 4n+2 classification", blurb: "Aromatic vs antiaromatic vs nonaromatic.", playable: { kind: "beat", id: "u2-huckel" } },
      { id: "u2-charged", kind: "gate", role: "video", title: "Charged aromatics", blurb: "Cyclopentadienyl anion, tropylium cation.", playable: { kind: "beat", id: "u2-charged" } },
      { id: "u2-annulene", kind: "gate", role: "video", title: "Annulenes and ring size", blurb: "Why cyclooctatetraene tubs out.", playable: { kind: "beat", id: "u2-annulene" } },
      { id: "u2-hetero", kind: "gate", role: "video", title: "Heterocycles", blurb: "Pyridine's lone pair sits out; pyrrole's joins in.", playable: { kind: "beat", id: "u2-hetero" } },
      { id: "u2-nmr", kind: "gate", role: "video", title: "Ring-current NMR signature", blurb: "Deshields outside, shields inside. Links to Unit 6.", playable: { kind: "beat", id: "u2-nmr" } },
      // A side quest off the first lesson: naming benzene rings needs only what Hückel teaches, not the NMR lesson.
      { id: "u2-nomen", kind: "branch", role: "practice", title: "Nomenclature review", blurb: "o/m/p, common names, polycyclics.", playable: { kind: "beat", id: "u2-nomen" }, after: ["u2-huckel"] },
    ],
  },
  {
    id: "u3",
    title: "Unit 3 · Electrophilic Aromatic Substitution",
    note: "Core of the course. Gates Units 4, 10, 11.",
    nodes: [
      { id: "u3-arenium", kind: "spine", title: "Arenium (σ-complex) mechanism", blurb: "Attack → cation → rearomatize: the mechanism under every node here.", playable: { kind: "sequence", id: "seq-eas" } },
      { id: "u3-halo", kind: "spine", title: "Halogenation", blurb: "Cl₂/FeCl₃; Br₂/FeBr₃; I₂ needs an oxidant.", playable: { kind: "sequence", id: "seq-eas-br" } },
      { id: "u3-nitration", kind: "spine", title: "Nitration", blurb: "HNO₃/H₂SO₄, electrophile NO₂⁺.", playable: { kind: "sequence", id: "seq-eas" } },
      { id: "u3-sulfo", kind: "spine", title: "Sulfonation and desulfonation", blurb: "Reversible, which is what makes it a blocking group.", playable: { kind: "sequence", id: "seq-sulfonation" } },
      { id: "u3-fc-acyl", kind: "spine", title: "Friedel–Crafts acylation", blurb: "RCOCl/AlCl₃; no rearrangement, self-limiting.", playable: { kind: "sequence", id: "seq-fc-acyl" } },
      { id: "u3-directing", kind: "spine", title: "Directing effects", blurb: "o/p vs m; activators vs deactivators; the halogen anomaly.", playable: { kind: "beat", id: "u3-directing" } },
      { id: "u3-blocking", kind: "spine", title: "Blocking-group strategy", blurb: "Sulfonate para, react, desulfonate.", playable: { kind: "beat", id: "u3-blocking" } },
      { id: "u3-nitro-red", kind: "spine", title: "Nitro reduction", blurb: "H₂/Pd or metal/HCl → aniline. The bridge into Unit 10.", playable: { kind: "beat", id: "u3-nitro-red" } },
      { id: "u3-c-to-ch2", kind: "spine", title: "Carbonyl → CH₂ after acylation", blurb: "Clemmensen or Wolff–Kishner: the unrearranged alkyl chain.", playable: { kind: "reaction", id: "wolff-extrusion" } },
      { id: "u3-sequencing", kind: "spine", title: "Multistep sequencing logic", blurb: "When to nitrate, reduce, block: order of operations.", playable: { kind: "beat", id: "u3-sequencing" } },
      // Unit 3 side quests with a DRAFT pool (scripts/u3_pools.py), each hung beside the lesson its
      // questions lean on: alkylation is contrasted with acylation (u3-fc-acyl), NBS with ring
      // bromination (u3-halo), and KMnO4 and Birch use the donor and withdrawer classes (u3-directing).
      { id: "u3-fc-alkyl", kind: "branch", title: "Friedel–Crafts alkylation", blurb: "Taught as a failure mode: rearrangement, polyalkylation.", playable: { kind: "beat", id: "u3-fc-alkyl" }, after: ["u3-fc-acyl"] },
      { id: "u3-benzylic-br", kind: "branch", title: "Benzylic bromination", blurb: "NBS, hν; needs a benzylic H.", playable: { kind: "beat", id: "u3-benzylic-br" }, after: ["u3-halo"] },
      { id: "u3-benzylic-ox", kind: "branch", title: "Benzylic oxidation", blurb: "KMnO₄ → ArCOOH; t-Bu survives.", playable: { kind: "beat", id: "u3-benzylic-ox" }, after: ["u3-directing"] },
      { id: "u3-birch", kind: "branch", title: "Birch reduction", blurb: "Na/NH₃(l)/ROH → 1,4-cyclohexadiene.", playable: { kind: "beat", id: "u3-birch" }, after: ["u3-directing"] },
      { id: "u3-gk", kind: "branch", title: "Gattermann–Koch formylation", blurb: "CO, HCl, AlCl₃/CuCl → ArCHO." },
      { id: "u3-ghh", kind: "branch", title: "Gattermann / Houben–Hoesch", blurb: "HCN or RCN, HCl, ZnCl₂." },
      { id: "u3-vilsmeier", kind: "branch", title: "Vilsmeier–Haack", blurb: "POCl₃, DMF; activated rings only." },
      { id: "u3-kolbe", kind: "branch", title: "Kolbe–Schmitt", blurb: "Phenoxide + CO₂ → salicylic acid. Shared with Unit 11." },
      { id: "u3-reimer", kind: "branch", title: "Reimer–Tiemann", blurb: "CHCl₃/NaOH via dichlorocarbene. Shared with Unit 11." },
    ],
  },
  {
    id: "u4",
    title: "Unit 4 · Nucleophilic Aromatic Substitution & Benzyne",
    note: "Short unit: aromatic reactivity inverts.",
    nodes: [
      { id: "u4-snar", kind: "spine", title: "SNAr addition–elimination", blurb: "Aryl halide with o/p EWG + a nucleophile.", playable: { kind: "sequence", id: "seq-snar" } },
      { id: "u4-meisenheimer", kind: "spine", title: "Meisenheimer complex", blurb: "Drawing the charge onto the nitro oxygen is the exam question.", playable: { kind: "sequence", id: "seq-snar" } },
      { id: "u4-lg-order", kind: "spine", title: "Reversed leaving-group order", blurb: "F > Cl > Br > I: addition is rate-determining.", playable: { kind: "sequence", id: "seq-snar" } },
      // Unit 4 side quests with a DRAFT pool (scripts/u4_pools.py): each plays its lesson on the beat route.
      { id: "u4-benzyne", kind: "branch", title: "Benzyne elimination–addition", blurb: "NaNH₂/NH₃; symmetric addition gives a mixture.", playable: { kind: "beat", id: "u4-benzyne" } },
      { id: "u4-isotope", kind: "branch", title: "Isotope-labelling proof", blurb: "¹⁴C chlorobenzene, 50:50 products.", playable: { kind: "beat", id: "u4-isotope" } },
      // Owner 2026-10-20: Dow hangs on u4-snar (hydroxide replacing an aryl Cl, here without the o/p EWG SNAr needs), so no stop carries three.
      { id: "u4-dow", kind: "branch", title: "Dow phenol process", blurb: "Historical.", playable: { kind: "beat", id: "u4-dow" }, after: ["u4-snar"] },
    ],
  },
  {
    id: "u5",
    title: "Unit 5 · Alcohols, Diols, Ethers & Epoxides",
    note: "Highest node count outside Unit 9.",
    nodes: [
      { id: "u5-roh-rx", kind: "spine", title: "Alcohol → alkyl halide", blurb: "SOCl₂, PBr₃, HX; inversion where it matters.", playable: { kind: "sequence", id: "seq-roh-hbr" } },
      { id: "u5-tosylate", kind: "spine", title: "Tosylate / mesylate", blurb: "Bad LG to good LG with retention.", playable: { kind: "sequence", id: "seq-mesylate" } },
      { id: "u5-dehydration", kind: "spine", title: "Dehydration", blurb: "H₂SO₄ Δ (E1, Zaitsev) or POCl₃/pyridine (E2).", playable: { kind: "reaction", id: "e2" } },
      { id: "u5-oxidation", kind: "spine", title: "Oxidation ladder", blurb: "PCC to aldehyde, Jones to acid, 3° no reaction.", playable: { kind: "beat", id: "u5-oxidation" } },
      { id: "u5-williamson", kind: "spine", title: "Williamson ether synthesis", blurb: "Alkoxide + 1° halide, SN2.", playable: { kind: "reaction", id: "williamson" } },
      { id: "u5-protecting", kind: "spine", title: "Protecting-group logic", blurb: "Silyl ethers, benzyl, THP: orthogonality.", playable: { kind: "beat", id: "u5-protecting" } },
      { id: "u5-epoxidation", kind: "spine", title: "Epoxidation", blurb: "mCPBA, syn and stereospecific; or halohydrin + base.", playable: { kind: "reaction", id: "epoxidation" } },
      { id: "u5-ep-acid", kind: "spine", title: "Epoxide opening, acidic", blurb: "More substituted carbon, anti.", playable: { kind: "reaction", id: "epoxide-acidic" } },
      { id: "u5-ep-base", kind: "spine", title: "Epoxide opening, basic", blurb: "Less hindered carbon, anti, clean SN2.", playable: { kind: "reaction", id: "epoxide-basic" } },
      { id: "u5-syn-diol", kind: "spine", title: "Syn-dihydroxylation", blurb: "OsO₄/NMO or cold KMnO₄ → cis-diol.", playable: { kind: "beat", id: "u5-syn-diol" } },
      { id: "u5-anti-diol", kind: "spine", title: "Anti-dihydroxylation", blurb: "mCPBA then H₃O⁺ → trans-diol. Teach as a pair with syn.", playable: { kind: "reaction", id: "epoxide-acidic" } },
      // Unit 5 side quests with a DRAFT pool (scripts/u5_pools.py): each plays its lesson on the beat route and hangs beside the lesson it leans on (`after`), at most two per lesson. u5-sharpless has none (see the u5 owner report).
      { id: "u5-appel", kind: "branch", title: "Appel reaction", blurb: "CBr₄/PPh₃, driven by P=O.", playable: { kind: "beat", id: "u5-appel" }, after: ["u5-roh-rx"] },
      { id: "u5-swern", kind: "branch", title: "Swern / DMP / TEMPO detail", blurb: "Reagent-selection nuance.", playable: { kind: "beat", id: "u5-swern" }, after: ["u5-oxidation"] },
      { id: "u5-alkoxymerc", kind: "branch", title: "Alkoxymercuration", blurb: "Hg(OAc)₂/ROH then NaBH₄; Markovnikov ether.", playable: { kind: "beat", id: "u5-alkoxymerc" }, after: ["u5-williamson"] },
      { id: "u5-cleavage", kind: "branch", title: "Ether cleavage", blurb: "Excess HI/HBr, Δ.", playable: { kind: "beat", id: "u5-cleavage" }, after: ["u5-williamson"] },
      { id: "u5-sharpless", kind: "branch", title: "Sharpless epoxidation", blurb: "Allylic alcohols, chiral DET. Advanced." },
      { id: "u5-diol-cleave", kind: "branch", title: "Oxidative cleavage of diols", blurb: "HIO₄ → two carbonyls.", playable: { kind: "beat", id: "u5-diol-cleave" }, after: ["u5-syn-diol"] },
      { id: "u5-pinacol", kind: "branch", title: "Pinacol rearrangement", blurb: "1,2-diol, H⁺, Δ: the 1,2-shift.", playable: { kind: "beat", id: "u5-pinacol" }, after: ["u5-dehydration"] },
      { id: "u5-thiols", kind: "branch", title: "Thiols and sulfides", blurb: "RSH, R₂S, sulfoxide, sulfone.", playable: { kind: "beat", id: "u5-thiols" }, after: ["u5-oxidation"] },
    ],
  },
  {
    id: "u6",
    title: "Unit 6 · Spectroscopy & Structure Determination",
    note: "Parallel track: one node injected into every downstream problem.",
    nodes: [
      // Unit 6 DRAFT wiring (2026-10-17): each node with a pool from scripts/u6_pools.py plays its lesson on the beat
      // route; kind stays "gate" as Unit 2 does. u6-ir has no pool (IR band values are not derivable; see the u6 owner report).
      { id: "u6-dou", kind: "gate", title: "Degrees of unsaturation", blurb: "Cheapest information in the problem.", playable: { kind: "beat", id: "u6-dou" } },
      { id: "u6-ir", kind: "gate", title: "IR diagnostics", blurb: "C=O ≈ 1700 and its shifts; O–H broad; C≡N ≈ 2250." },
      { id: "u6-hnmr", kind: "gate", title: "¹H NMR", blurb: "Shift, integration, multiplicity, J.", playable: { kind: "beat", id: "u6-hnmr" } },
      { id: "u6-cnmr", kind: "gate", title: "¹³C and DEPT", blurb: "Count, symmetry, CH₃/CH₂/CH/quaternary.", playable: { kind: "beat", id: "u6-cnmr" } },
      { id: "u6-ms", kind: "gate", title: "Mass spectrometry", blurb: "Isotope patterns, α-cleavage, McLafferty.", playable: { kind: "beat", id: "u6-ms" } },
      { id: "u6-2d", kind: "branch", title: "2D NMR", blurb: "COSY, HSQC, HMBC.", playable: { kind: "beat", id: "u6-2d" } },
      { id: "u6-uv", kind: "branch", title: "UV-Vis and conjugation", blurb: "λmax, Woodward–Fieser. Links to Unit 1.", playable: { kind: "beat", id: "u6-uv" } },
    ],
  },
  {
    id: "u7",
    title: "Unit 7 · Aldehydes & Ketones: Nucleophilic Addition",
    note: "Gates Units 8, 9, 13, 14.",
    nodes: [
      { id: "u7-mechanism", kind: "spine", title: "Carbonyl polarity and the addition mechanism", blurb: "Nu attacks C, alkoxide forms, workup protonates.", playable: { kind: "reaction", id: "carbonyl-addition" } },
      { id: "u7-hydration", kind: "spine", title: "Hydration", blurb: "Gem-diol; favored for formaldehyde and chloral.", playable: { kind: "sequence", id: "seq-hydration" } },
      { id: "u7-acetal", kind: "spine", title: "Hemiacetal and acetal", blurb: "Every arrow reversible, pushed both directions.", playable: { kind: "sequence", id: "seq-hemiacetal" } },
      { id: "u7-protect", kind: "spine", title: "Acetal as protecting group", blurb: "Dioxolane on, H₃O⁺ off. Load-bearing downstream.", playable: { kind: "beat", id: "u7-protect" } },
      { id: "u7-imine", kind: "spine", title: "Imine formation", blurb: "1° amine, pH ≈ 4–5; the pH-rate bell curve.", playable: { kind: "reaction", id: "imine-attack" } },
      { id: "u7-enamine", kind: "spine", title: "Enamine formation", blurb: "2° amine; sets up Stork chemistry in Unit 9.", playable: { kind: "reaction", id: "enamine-attack" } },
      { id: "u7-grignard", kind: "spine", title: "Grignard and organolithium addition", blurb: "1°/2°/3° alcohol by carbonyl choice.", playable: { kind: "reaction", id: "grignard-methyl" } },
      { id: "u7-hydride", kind: "spine", title: "Hydride reduction", blurb: "NaBH₄ mild, LiAlH₄ strong.", playable: { kind: "reaction", id: "hydride-reduction" } },
      { id: "u7-wittig", kind: "spine", title: "Wittig olefination", blurb: "Ylide → alkene with unambiguous placement.", playable: { kind: "sequence", id: "seq-wittig" } },
      { id: "u7-12v14", kind: "spine", title: "1,2 vs 1,4 selectivity on enones", blurb: "Hard 1,2, soft 1,4; the node Unit 9 depends on.", playable: { kind: "reaction", id: "grignard-12" } },
      { id: "u7-to-ch2", kind: "spine", title: "Reduction to CH₂", blurb: "Clemmensen, Wolff–Kishner, thioacetal/Raney Ni.", playable: { kind: "reaction", id: "wolff-extrusion" } },
      { id: "u7-cyanohydrin", kind: "branch", title: "Cyanohydrin formation", blurb: "Adds one carbon; nitrile handle for Unit 8.", playable: { kind: "reaction", id: "cyanohydrin" } },
      // Unit 7 side quests with a DRAFT pool (scripts/u7_pools.py) play their lesson on the beat route beside the lesson they lean on (`after`), at most two per lesson. u7-bisulfite has none (see the u7 owner report).
      { id: "u7-bisulfite", kind: "branch", title: "Bisulfite adduct", blurb: "Purification trick, reversible." },
      { id: "u7-thioacetal", kind: "branch", title: "Thioacetal", blurb: "Then Raney Ni desulfurizes.", playable: { kind: "beat", id: "u7-thioacetal" }, after: ["u7-acetal"] },
      { id: "u7-derivative-tests", kind: "branch", title: "Carbonyl derivative tests", blurb: "Oxime, hydrazone, 2,4-DNP, semicarbazone.", playable: { kind: "beat", id: "u7-derivative-tests" }, after: ["u7-imine"] },
      { id: "u7-hwe", kind: "branch", title: "Horner–Wadsworth–Emmons", blurb: "E-enoate selectively.", playable: { kind: "beat", id: "u7-hwe" }, after: ["u7-wittig"] },
      { id: "u7-bv", kind: "branch", title: "Baeyer–Villiger", blurb: "Migratory aptitude 3° > 2° ≈ Ar > 1° > Me.", playable: { kind: "beat", id: "u7-bv" }, after: ["u7-mechanism"] },
      { id: "u7-ald-to-acid", kind: "branch", title: "Aldehyde → carboxylic acid", blurb: "Tollens, Jones, and the tests.", playable: { kind: "beat", id: "u7-ald-to-acid" }, after: ["u7-hydration"] },
      { id: "u7-cannizzaro", kind: "branch", title: "Cannizzaro", blurb: "No-α-H aldehyde disproportionates.", playable: { kind: "beat", id: "u7-cannizzaro" }, after: ["u7-hydride"] },
      { id: "u7-mpv", kind: "branch", title: "Meerwein–Ponndorf–Verley", blurb: "Reversible with Oppenauer.", playable: { kind: "beat", id: "u7-mpv" }, after: ["u7-hydride"] },
    ],
  },
  {
    id: "u8",
    title: "Unit 8 · Carboxylic Acids & Derivatives",
    note: "The reactivity ladder is the organizing principle.",
    nodes: [
      { id: "u8-ladder", kind: "spine", title: "The reactivity ladder", blurb: "Down the ladder free, up only with activation.", playable: { kind: "beat", id: "u8-ladder" } },
      { id: "u8-tetrahedral", kind: "spine", title: "Tetrahedral intermediate mechanism", blurb: "Addition then elimination, under every node here.", playable: { kind: "sequence", id: "seq-acyl" } },
      { id: "u8-to-acylcl", kind: "spine", title: "Acid → acyl chloride", blurb: "SOCl₂, oxalyl chloride: climbing the ladder.", playable: { kind: "sequence", id: "seq-socl2" } },
      { id: "u8-to-anhydride", kind: "spine", title: "Acid → anhydride", blurb: "Heat a diacid, or acid + acyl chloride.", playable: { kind: "sequence", id: "seq-anhydride-make" } },
      { id: "u8-fischer", kind: "spine", title: "Fischer esterification", blurb: "Reversible; drive with excess or remove water.", playable: { kind: "sequence", id: "seq-fischer" } },
      { id: "u8-acylcl-all", kind: "spine", title: "Acyl chloride → everything", blurb: "Ester, amide, anhydride, acid.", playable: { kind: "sequence", id: "seq-acyl" } },
      { id: "u8-anhydride", kind: "spine", title: "Anhydride → ester/amide/acid", blurb: "Same partners, slower, one acyl wasted.", playable: { kind: "sequence", id: "seq-anhydride" } },
      { id: "u8-hydrolysis", kind: "spine", title: "Ester hydrolysis", blurb: "Acidic reversible; saponification irreversible.", playable: { kind: "sequence", id: "seq-sapon" } },
      { id: "u8-transester", kind: "spine", title: "Transesterification", blurb: "Same tetrahedral logic, equilibrium-driven.", playable: { kind: "sequence", id: "seq-transester" } },
      { id: "u8-amide-hyd", kind: "spine", title: "Amide hydrolysis", blurb: "Forcing conditions; why amides resist is the concept.", playable: { kind: "sequence", id: "seq-amide-hyd" } },
      { id: "u8-nitrile", kind: "spine", title: "Nitrile chemistry", blurb: "From R–X + CN⁻ or amide dehydration; hydrolysis back.", playable: { kind: "reaction", id: "grignard-nitrile" } },
      { id: "u8-lialh4", kind: "spine", title: "LiAlH₄ reductions", blurb: "Acid/ester → alcohol; amide → amine; nitrile → amine.", playable: { kind: "sequence", id: "seq-lialh4" } },
      { id: "u8-dibal", kind: "spine", title: "DIBAL-H partial reduction", blurb: "One equivalent, cold: stop at the aldehyde.", playable: { kind: "reaction", id: "dibal-ester" } },
      { id: "u8-organomet", kind: "spine", title: "Organometallics on derivatives", blurb: "Two additions on esters; over-addition unavoidable.", playable: { kind: "sequence", id: "seq-grignard-ester" } },
      { id: "u8-gilman", kind: "spine", title: "Gilman + acyl chloride", blurb: "Stops cleanly at the ketone.", playable: { kind: "sequence", id: "seq-gilman" } },
      { id: "u8-decarb", kind: "spine", title: "Decarboxylation", blurb: "β-keto acids, 6-membered TS. Load-bearing for Unit 9.", playable: { kind: "reaction", id: "decarboxylation" } },
      // Unit 8 side quests with a DRAFT pool (scripts/u8_pools.py) play their lesson on the beat route beside the lesson they lean on (`after`), at most two per lesson.
      { id: "u8-steglich", kind: "branch", title: "Steglich esterification", blurb: "DCC/DMAP; returns for peptides.", playable: { kind: "beat", id: "u8-steglich" }, after: ["u8-fischer"] },
      { id: "u8-diazomethane", kind: "branch", title: "Diazomethane methylation", blurb: "Quantitative and explosive.", playable: { kind: "beat", id: "u8-diazomethane" }, after: ["u8-fischer"] },
      { id: "u8-carboxylate-alk", kind: "branch", title: "Carboxylate alkylation", blurb: "SN2, 1° halides only.", playable: { kind: "beat", id: "u8-carboxylate-alk" }, after: ["u8-transester"] },
      { id: "u8-weinreb", kind: "branch", title: "Weinreb amide", blurb: "The chelate stops over-addition.", playable: { kind: "beat", id: "u8-weinreb" }, after: ["u8-organomet"] },
      { id: "u8-nabh4", kind: "branch", title: "NaBH₄ on derivatives", blurb: "Chemoselectivity node.", playable: { kind: "beat", id: "u8-nabh4" }, after: ["u8-lialh4"] },
      { id: "u8-hvz", kind: "branch", title: "Hell–Volhard–Zelinsky", blurb: "α-bromo acid; mechanistically Unit 9.", playable: { kind: "beat", id: "u8-hvz" }, after: ["u8-to-acylcl"] },
      { id: "u8-kolbe-e", kind: "branch", title: "Kolbe electrolysis", blurb: "Radical dimerization.", playable: { kind: "beat", id: "u8-kolbe-e" }, after: ["u8-decarb"] },
      { id: "u8-hunsdiecker", kind: "branch", title: "Hunsdiecker", blurb: "One carbon shorter.", playable: { kind: "beat", id: "u8-hunsdiecker" }, after: ["u8-decarb"] },
    ],
  },
  {
    id: "u9",
    title: "Unit 9 · Enols & Enolates: α-Carbon Chemistry",
    note: "The spine of the spine, split 9a/9b/9c.",
    nodes: [
      { id: "u9-tautomer", kind: "spine", title: "9a · Keto–enol tautomerism", blurb: "Acid- and base-catalyzed, both directions.", playable: { kind: "sequence", id: "seq-tautomer" } },
      { id: "u9-pka", kind: "spine", title: "9a · α-proton pKa hierarchy", blurb: "The table that decides which base you need.", playable: { kind: "beat", id: "u9-pka" } },
      { id: "u9-enolate-res", kind: "spine", title: "9a · Enolate resonance and geometry", blurb: "Ambident: C- vs O-alkylation.", playable: { kind: "sequence", id: "seq-aldol" } },
      { id: "u9-kvt-enolate", kind: "spine", title: "9a · Kinetic vs thermodynamic enolate", blurb: "LDA cold vs NaOEt warm. Callback to Unit 1.", playable: { kind: "beat", id: "u9-kvt-enolate" } },
      { id: "u9-halo-acid", kind: "spine", title: "9a · α-Halogenation, acid", blurb: "Stops at mono; halogen deactivates the enol.", playable: { kind: "sequence", id: "seq-halo-acid" } },
      { id: "u9-halo-base", kind: "spine", title: "9a · α-Halogenation, base", blurb: "Runs away: each halogen acidifies the rest.", playable: { kind: "reaction", id: "alpha-bromination" } },
      { id: "u9-aldol", kind: "spine", title: "9b · Aldol addition", blurb: "β-hydroxy carbonyl; retro-aldol is a real answer.", playable: { kind: "sequence", id: "seq-aldol" } },
      { id: "u9-aldol-cond", kind: "spine", title: "9b · Aldol condensation", blurb: "E1cb dehydration; conjugation drives it.", playable: { kind: "sequence", id: "seq-condensation" } },
      { id: "u9-crossed", kind: "spine", title: "9b · Crossed / mixed aldol", blurb: "No-α-H partner, or a preformed enolate.", playable: { kind: "sequence", id: "seq-crossed-aldol" } },
      { id: "u9-intra", kind: "spine", title: "9b · Intramolecular aldol", blurb: "5- and 6-membered rings win.", playable: { kind: "reaction", id: "intra-aldol" } },
      { id: "u9-claisen", kind: "spine", title: "9b · Claisen condensation", blurb: "Stoichiometric base pulls the equilibrium.", playable: { kind: "sequence", id: "seq-claisen" } },
      { id: "u9-dieckmann", kind: "spine", title: "9b · Dieckmann", blurb: "Intramolecular Claisen → cyclic β-ketoester.", playable: { kind: "sequence", id: "seq-dieckmann" } },
      { id: "u9-crossed-claisen", kind: "spine", title: "9b · Crossed Claisen", blurb: "One ester with no α-H.", playable: { kind: "sequence", id: "seq-claisen" } },
      { id: "u9-alkylation", kind: "spine", title: "9c · Enolate alkylation", blurb: "Preformed enolate + 1° R–X.", playable: { kind: "reaction", id: "enolate-alkylation" } },
      { id: "u9-malonic", kind: "spine", title: "9c · Malonic ester synthesis", blurb: "Alkylate, hydrolyze, decarboxylate.", playable: { kind: "sequence", id: "seq-malonic" } },
      { id: "u9-acetoacetic", kind: "spine", title: "9c · Acetoacetic ester synthesis", blurb: "Same three-step logic; methyl ketone out.", playable: { kind: "reaction", id: "decarboxylation" } },
      { id: "u9-michael", kind: "spine", title: "9c · Michael addition", blurb: "Soft nucleophile, 1,4.", playable: { kind: "reaction", id: "michael-addition" } },
      { id: "u9-cuprate", kind: "spine", title: "9c · Conjugate organocuprate", blurb: "Unstabilized alkyl delivered 1,4.", playable: { kind: "sequence", id: "seq-gilman-enone" } },
      { id: "u9-robinson", kind: "spine", title: "9c · Robinson annulation", blurb: "Michael then intramolecular aldol condensation.", playable: { kind: "sequence", id: "seq-robinson" } },
      { id: "u9-retro", kind: "spine", title: "9c · Retrosynthetic C–C disconnection", blurb: "The skill the whole unit builds.", playable: { kind: "beat", id: "u9-retro" } },
      { id: "u9-haloform", kind: "branch", title: "Haloform reaction", blurb: "Iodoform and its yellow precipitate.", playable: { kind: "beat", id: "u9-haloform" }, after: ["u9-halo-base"] },
      { id: "u9-stork", kind: "branch", title: "Stork enamine alkylation", blurb: "Softer alternative to enolate alkylation.", playable: { kind: "beat", id: "u9-stork" }, after: ["u9-alkylation"] },
      { id: "u9-mannich", kind: "branch", title: "Mannich reaction", blurb: "β-amino carbonyl; biosynthesis relevance.", playable: { kind: "beat", id: "u9-mannich" }, after: ["u9-aldol"] },
      { id: "u9-knoevenagel", kind: "branch", title: "Knoevenagel", blurb: "Aldol condensation with a stabilized donor.", playable: { kind: "beat", id: "u9-knoevenagel" }, after: ["u9-aldol-cond"] },
      { id: "u9-reformatsky", kind: "branch", title: "Reformatsky", blurb: "Zinc enolate, mild enough not to self-condense.", playable: { kind: "beat", id: "u9-reformatsky" }, after: ["u9-claisen"] },
      { id: "u9-directed", kind: "branch", title: "Directed aldol at low temperature", blurb: "LDA at –78 °C, then the electrophile.", playable: { kind: "beat", id: "u9-directed" }, after: ["u9-crossed"] },
    ],
  },
  {
    id: "u10",
    title: "Unit 10 · Amines",
    note: "Diazonium chemistry is retroactively load-bearing for Unit 3.",
    nodes: [
      { id: "u10-basicity", kind: "spine", title: "Basicity vs nucleophilicity", blurb: "Aliphatic > aryl > amide; pKaH reasoning.", playable: { kind: "beat", id: "u10-basicity" } },
      { id: "u10-red-amination", kind: "spine", title: "Reductive amination", blurb: "NaBH₃CN reduces the iminium, not the carbonyl.", playable: { kind: "reaction", id: "iminium-reduction" } },
      { id: "u10-amide-red", kind: "spine", title: "Amide reduction", blurb: "LiAlH₄, keeping the substitution pattern.", playable: { kind: "reaction", id: "iminium-reduction" } },
      { id: "u10-nitrile-red", kind: "spine", title: "Nitrile reduction", blurb: "Adds one carbon on the way to the amine.", playable: { kind: "reaction", id: "nitrile-hydride" } },
      { id: "u10-nitro-red", kind: "spine", title: "Nitro reduction", blurb: "The Unit 3 to Unit 10 bridge.", playable: { kind: "beat", id: "u10-nitro-red" } },
      { id: "u10-diazonium", kind: "spine", title: "Diazonium formation", blurb: "NaNO₂/HCl at 0–5 °C, no negotiation on temperature.", playable: { kind: "reaction", id: "diazonium-first" } },
      { id: "u10-diazo-sub", kind: "spine", title: "Diazonium substitution", blurb: "Sandmeyer and friends; NH₂ as a temporary director.", playable: { kind: "sequence", id: "seq-diazo-sub" } },
      { id: "u10-acyl-protect", kind: "spine", title: "Amine acylation as protection", blurb: "Ac₂O moderates aniline for controlled EAS.", playable: { kind: "sequence", id: "seq-anhydride" } },
      { id: "u10-direct-alk", kind: "branch", title: "Direct alkylation of ammonia", blurb: "The over-alkylation failure mode.", playable: { kind: "beat", id: "u10-direct-alk" }, after: ["u10-basicity"] },
      { id: "u10-gabriel", kind: "branch", title: "Gabriel synthesis", blurb: "Phthalimide route to pure 1° amines.", playable: { kind: "beat", id: "u10-gabriel" }, after: ["u10-basicity"] },
      { id: "u10-azide", kind: "branch", title: "Azide route", blurb: "R–N₃ then reduce; cleanest 1° amine.", playable: { kind: "beat", id: "u10-azide" }, after: ["u10-nitrile-red"] },
      { id: "u10-hofmann-r", kind: "branch", title: "Hofmann rearrangement", blurb: "Amide to amine, one carbon shorter.", playable: { kind: "beat", id: "u10-hofmann-r" }, after: ["u10-amide-red"] },
      { id: "u10-curtius", kind: "branch", title: "Curtius rearrangement", blurb: "Acyl azide → isocyanate → amine.", playable: { kind: "beat", id: "u10-curtius" }, after: ["u10-amide-red"] },
      { id: "u10-hofmann-e", kind: "branch", title: "Hofmann elimination", blurb: "Exhaustive methylation → anti-Zaitsev alkene.", playable: { kind: "beat", id: "u10-hofmann-e" }, after: ["u10-red-amination"] },
      { id: "u10-cope", kind: "branch", title: "Cope elimination", blurb: "Amine oxide, syn, intramolecular.", playable: { kind: "beat", id: "u10-cope" }, after: ["u10-red-amination"] },
      { id: "u10-azo", kind: "branch", title: "Azo coupling", blurb: "Diazonium as the EAS electrophile: dyes.", playable: { kind: "beat", id: "u10-azo" }, after: ["u10-diazo-sub"] },
    ],
  },
  {
    id: "u11",
    title: "Unit 11 · Phenols",
    note: "Arguably folds into Units 3 and 5.",
    nodes: [
      { id: "u11-acidity", kind: "spine", title: "Phenol acidity", blurb: "pKa about 10; conjugate-base resonance.", playable: { kind: "beat", id: "u11-acidity" } },
      { id: "u11-phenoxide", kind: "spine", title: "Phenoxide as nucleophile", blurb: "Williamson to aryl ethers; esters.", playable: { kind: "reaction", id: "phenoxide-alkylation" } },
      { id: "u11-eas", kind: "branch", title: "EAS on phenol", blurb: "Tribromination without a Lewis acid." },
      { id: "u11-kolbe", kind: "branch", title: "Kolbe–Schmitt", blurb: "Salicylic acid." },
      { id: "u11-reimer", kind: "branch", title: "Reimer–Tiemann", blurb: "Salicylaldehyde via dichlorocarbene." },
      { id: "u11-quinone", kind: "branch", title: "Quinone / hydroquinone redox", blurb: "Reversible two-electron couple." },
      { id: "u11-claisen-r", kind: "branch", title: "Claisen rearrangement", blurb: "[3,3]; also a Unit 12 node." },
    ],
  },
  {
    id: "u12",
    title: "Unit 12 · Pericyclic Reactions",
    note: "Entire unit branches off Unit 1.",
    nodes: [
      { id: "u12-da", kind: "branch", title: "Diels–Alder [4+2]", blurb: "Thermal, endo rule, stereospecific." },
      { id: "u12-22", kind: "branch", title: "[2+2] cycloaddition", blurb: "Photochemical; thermally forbidden." },
      { id: "u12-dipolar", kind: "branch", title: "1,3-Dipolar cycloaddition", blurb: "Five-membered heterocycles." },
      { id: "u12-electro", kind: "branch", title: "Electrocyclic reactions", blurb: "Con/disrotatory by electron count." },
      { id: "u12-cope", kind: "branch", title: "Cope rearrangement", blurb: "[3,3], chair-like TS." },
      { id: "u12-claisen", kind: "branch", title: "Claisen rearrangement", blurb: "[3,3], irreversible when it rearomatizes." },
      { id: "u12-15h", kind: "branch", title: "[1,5]-hydride shifts", blurb: "Cyclopentadiene scrambling." },
      { id: "u12-wh", kind: "branch", title: "Woodward–Hoffmann rules", blurb: "The unifying framework." },
    ],
  },
  {
    id: "u13",
    title: "Unit 13 · Carbohydrates",
    note: "Branches off Unit 7. Terminal.",
    nodes: [
      { id: "u13-fischer", kind: "branch", title: "Fischer projections and D/L", blurb: "R/S from a Fischer projection." },
      { id: "u13-anomers", kind: "branch", title: "Cyclization and anomers", blurb: "Pyranose, furanose, α vs β." },
      { id: "u13-mutarotation", kind: "branch", title: "Mutarotation", blurb: "Through the open chain; Unit 7 chemistry." },
      { id: "u13-glycoside", kind: "branch", title: "Glycoside formation", blurb: "Acetal locks the anomeric center." },
      { id: "u13-protect", kind: "branch", title: "Protecting-group chemistry", blurb: "Permethylation, peracetylation." },
      { id: "u13-oxidation", kind: "branch", title: "Oxidation", blurb: "Aldonic, aldaric, uronic." },
      { id: "u13-tests", kind: "branch", title: "Reducing-sugar tests", blurb: "Tollens, Benedict, Fehling." },
      { id: "u13-reduction", kind: "branch", title: "Reduction", blurb: "Alditols." },
      { id: "u13-kiliani", kind: "branch", title: "Kiliani–Fischer synthesis", blurb: "Chain plus one, epimeric pair." },
      { id: "u13-wohl", kind: "branch", title: "Wohl and Ruff degradation", blurb: "Chain minus one; structure proof partner." },
      { id: "u13-osazone", kind: "branch", title: "Osazone formation", blurb: "C2 epimers converge." },
    ],
  },
  {
    id: "u14",
    title: "Unit 14 · Amino Acids, Peptides & Proteins",
    note: "Branches off Units 7 and 8.",
    nodes: [
      { id: "u14-orthogonal", kind: "spine", title: "Protecting-group orthogonality", blurb: "Boc/TFA, Cbz/H2-Pd, Fmoc/piperidine: three that never touch.", playable: { kind: "beat", id: "u14-orthogonal" } },
      { id: "u14-zwitterion", kind: "branch", title: "Zwitterions and pI", blurb: "Titration curves, isoelectric point." },
      { id: "u14-strecker", kind: "branch", title: "Strecker synthesis", blurb: "Aldehyde + NH3 + HCN, racemic." },
      { id: "u14-sorensen", kind: "branch", title: "Gabriel–malonic (Sorensen)", blurb: "Units 9 and 10 combined." },
      { id: "u14-red-am", kind: "branch", title: "Reductive amination of α-keto acids", blurb: "Unit 10 applied." },
      { id: "u14-coupling", kind: "branch", title: "Peptide coupling", blurb: "DCC or EDC/HOBt; racemization is the risk." },
      { id: "u14-edman", kind: "branch", title: "Edman degradation", blurb: "One residue at a time from the N-terminus." },
      { id: "u14-sanger", kind: "branch", title: "Sanger reagent", blurb: "SNAr labels the N-terminus. Unit 4 callback." },
      { id: "u14-ninhydrin", kind: "branch", title: "Ninhydrin", blurb: "Purple; proline yellow." },
      { id: "u14-geometry", kind: "branch", title: "Peptide-bond geometry", blurb: "Planarity, cis/trans, proline the exception." },
    ],
  },
  {
    id: "u15",
    title: "Unit 15 · Lipids & Capstone",
    note: "One boss node plus a branch cluster.",
    nodes: [
      { id: "u15-boss", kind: "boss", title: "Multistep synthesis design", blurb: "Gated on Units 3, 5, 7, 8, 9. Everything integrates here or is exposed." },
      { id: "u15-sapon", kind: "branch", title: "Saponification of fats", blurb: "Unit 8 hydrolysis on a triglyceride." },
      { id: "u15-hydrog", kind: "branch", title: "Hydrogenation of oils", blurb: "Partial hydrogenation, trans fats." },
      { id: "u15-fatty", kind: "branch", title: "Fatty-acid structure", blurb: "Saturation, packing, melting point." },
      { id: "u15-terpene", kind: "branch", title: "Terpene and steroid biosynthesis", blurb: "Isoprene units, cationic cascades." },
    ],
  },
];

/**
 * A map unit's title is authored as "Unit 1 - Conjugation, Resonance & Dienes"
 * with a middot separator. Callers set the number as an eyebrow and the name as
 * a headline, so the thing a student is looking for is the largest text. A
 * title with no separator has no number to lift, and keeps the whole string as
 * its name rather than inventing one.
 *
 * These lived in PathwayTab.tsx. They moved here, with the data, when the unit
 * CHECKPOINT started naming itself after its unit: a synthetic node cannot be
 * built inside a React component that half the callers cannot import, and the
 * authored title format is this file's own convention. PathwayTab re-exports
 * them, so nothing that already read them from there changed.
 */
export const UNIT_TITLE_SEPARATOR = " · ";

export function unitNumber(title: string): string {
  const at = title.indexOf(UNIT_TITLE_SEPARATOR);
  return at === -1 ? "Unit" : title.slice(0, at);
}

export function unitName(title: string): string {
  const at = title.indexOf(UNIT_TITLE_SEPARATOR);
  return at === -1 ? title : title.slice(at + UNIT_TITLE_SEPARATOR.length);
}

/**
 * THE UNIT CHECKPOINT, and it is a NODE rather than a screen.
 *
 * WHAT WAS MISSING. Ten of the map's 192 nodes are authored `gate` questions
 * and nine of those are in Unit 2, so thirteen of fifteen units simply ended:
 * last lesson, arch, next unit. The arch is a boundary and says so, but nothing
 * on the page ever asked a student to put the unit together, which is the one
 * thing every bar this surface is measured against closes a unit with. That is
 * a missing component, not a weak one.
 *
 * WHAT IT IS NOT. Not an outlined box (PathwayTab records that one was
 * deliberately deleted: the path vocabulary has exactly one shape for an item
 * on the path), not a screen, and not an animation. It is one more chip on the
 * column's own rhythm, wearing the challenge motif, named after the unit,
 * carrying a `beat` link like any other lesson node.
 *
 * IT IS SYNTHETIC AND DELIBERATELY NOT IN `unit.nodes`. A unit's own node list
 * is the coverage ledger and the unlock denominator (pathwayState.ts counts
 * `done` over `playable` off it), so adding fifteen nodes to it would move
 * every gate the student has already passed and change what "this unit is done"
 * means. The checkpoint is derived from the unit instead, exactly as the unit's
 * SHAPE is, and `deriveMapPathway` gives it a state without counting it.
 *
 * The id shares the unit's namespace, so a journal entry for it is readable
 * beside the lessons it mixes.
 */
export function checkpointNodeId(unitId: string): string {
  return `${unitId}-check`;
}

/**
 * The unit a checkpoint id belongs to, or null for any other id. The reverse of
 * checkpointNodeId, matched against the real unit list rather than by sniffing
 * the id's spelling, so renaming the convention cannot leave a caller matching
 * a suffix that no longer means anything.
 */
export function checkpointUnitFor(nodeId: string): PathwayUnit | null {
  return PATHWAY_UNITS.find((unit) => checkpointNodeId(unit.id) === nodeId) ?? null;
}

/**
 * A SECTION FINAL: a section's closing quiz (role "quiz") or the unit
 * checkpoint. Owner 2026-10-20: entering one costs the final price (6 energy,
 * CHARGE_ENTRY_COST.final in @blueberry/economy), not a lesson's 3, and
 * clearing one earns a saved chest.
 */
export function isSectionFinal(node: Pick<PathwayNode, "id" | "role">): boolean {
  return node.role === "quiz" || checkpointUnitFor(node.id) !== null;
}

export function unitCheckpointNode(unit: PathwayUnit): PathwayNode {
  const id = checkpointNodeId(unit.id);
  return {
    id,
    // `gate` is the map's own word for "no preparative reaction, a check", which
    // is what this is; the sheet reads it to title the node "Checkpoint". The
    // track engraves its finish flag by row (PathwayTab), not by this kind.
    kind: "gate",
    title: `${unitName(unit.title)} checkpoint`,
    blurb: unit.examBlurb ?? "A short mixed set, one question from each kind of work in this unit.",
    // A beat, so it plays on the lesson runner the rest of the map already uses.
    // planLesson resolves this id to the mix; see checkpointPlan in beats/template.ts.
    playable: { kind: "beat", id },
  };
}

/** How much of the map is playable today, computed from the data itself. */
export function coverage(): { readonly playable: number; readonly total: number; readonly spinePlayable: number; readonly spineTotal: number } {
  let playable = 0;
  let total = 0;
  let spinePlayable = 0;
  let spineTotal = 0;
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      total += 1;
      if (node.playable !== undefined) playable += 1;
      if (node.kind === "spine") {
        spineTotal += 1;
        if (node.playable !== undefined) spinePlayable += 1;
      }
    }
  }
  return { playable, total, spinePlayable, spineTotal };
}

/**
 * One node by id, or null.
 *
 * Exists because a surface that CLEARS a node has to know two things the node
 * id alone does not carry: whether it is on the spine, which the economy pays
 * differently, and its title for a receipt. BeatRunner is the first caller.
 * Linear scan over roughly 200 nodes, run once when a lesson ends, so an index
 * would be a cache with an invalidation bug and no measurable win.
 */
export function pathwayNode(id: string): PathwayNode | null {
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      if (node.id === id) return node;
    }
  }
  return storyNode(id);
}

/**
 * The node a PLAYABLE belongs to. The reverse of the lookup above, and the
 * reason it exists is the seam between the map and the trainer.
 *
 * A mechanism node's trainer link carries the playable's id ("williamson",
 * "seq-diene", "res-allyl-1"), never the node's ("u5-williamson"), while the
 * charge gate spent and the pathway's green derive from the NODE id. So a
 * surface that only knows which question it is playing cannot bank a clear
 * without coming back through here.
 *
 * MATCHED ON KIND AS WELL AS ID, because the three registries are separate id
 * spaces and nothing stops a reaction and a sequence from sharing a name.
 *
 * FIRST MATCH IN TEACHING ORDER, and that is a real decision rather than an
 * accident of the loop: ten of the map's playables are shared by two or three
 * nodes (wolff-extrusion on u3-c-to-ch2 and u7-to-ch2, seq-snar on three Unit 4
 * nodes, and eight more), because the same mechanism is genuinely taught twice.
 * The link cannot say which of them was pressed. Every member of every one of
 * those groups is a spine node, so the economy kind and the spine bonus are the
 * same whichever is chosen and only WHICH node turns green differs; the earlier
 * node is the one that introduces the mechanism, so it is the one a clear lands
 * on. Making this exact means putting the node id in the href, which changes a
 * URL students already have in their history: an owner decision, not a fix to
 * smuggle in here.
 */
export function pathwayNodeForPlayable(kind: PlayableLink["kind"], id: string): PathwayNode | null {
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      const link = node.playable;
      if (link !== undefined && link.kind === kind && link.id === id) return node;
      // A lesson that ends on the trainer still owns that trainer's clear from the Train tab.
      const trainer = lessonTrainerFor(node.id);
      if (trainer !== undefined && trainer.kind === kind && trainer.id === id) return node;
    }
  }
  return null;
}

/**
 * The economy's NodeKind for a map node, which is what it is PRICED at.
 *
 * MOVED HERE FROM PathwayTab.tsx, where it was private, because two surfaces
 * now need the same answer and they must not be able to disagree: ChargeGate
 * spends against this kind on the way in (`startNode`) and the surface that
 * banks the clear pays out against it on the way out (`clearNode`). Two copies
 * of this mapping is a student paying for one row and clearing another.
 *
 * The pathway's vocabulary is spine/branch/gate/boss and the economy's is
 * concept/reaction/branch/quiz/review/tutorial/intro. The two lists are not the
 * same list, so the mapping is written down once here rather than guessed at
 * each call site:
 *
 *   branch          -> branch. Same word, same price, and the map's side quests are
 *                      exactly what that row is for.
 *   spine, a beat   -> concept. A beat is recognition and ranking work, which is
 *                      what the concept row is priced against.
 *   spine, anything -> reaction. Arrow work: a reaction, a sequence, a
 *                      resonance hunt. Since owner 2026-10-20 every lesson
 *                      kind costs the same 3, so this row no longer moves price.
 *   boss            -> quiz. UNREACHABLE TODAY, and flagged rather than settled:
 *                      the map's one boss carries no `playable`, so no press can
 *                      arrive here. ECONOMY.md prices no boss, and quiz is the
 *                      closest priced row (an assessment, refunded on a pass).
 *                      An owner decision before a boss is authored.
 *
 *   gate            -> concept, and this row is NEW and is a reported
 *                      divergence rather than a settled price. Gates used to be
 *                      unreachable here ("they render as the unit gate and its
 *                      checkpoint strip and are not pressable"), which stopped
 *                      being true when the unit CHECKPOINT became a pressable
 *                      node carrying a beat link. A checkpoint is an assessment
 *                      and ECONOMY.md's closest priced row is `quiz`, refunded
 *                      on a pass, which is arguably what it should cost. It is
 *                      priced as a CONCEPT anyway, because BeatRunner banks
 *                      every beat clear as "concept" with a literal, so pricing
 *                      the door at quiz would make the student pay against one
 *                      row and clear against another: the exact defect the note
 *                      above this function exists to prevent. Moving both to
 *                      quiz together is an owner decision about money, not a fix
 *                      to smuggle in beside a layout change. Owner 2026-10-20
 *                      settled the PRICE without moving the kind: a checkpoint
 *                      or a section's closing quiz is entered with
 *                      `entry: "final"` (6, CHARGE_ENTRY_COST; see
 *                      isSectionFinal) and still clears as a concept.
 */
export function economyKindFor(mapKind: NodeKind, link: PlayableLink): EconomyNodeKind {
  if (mapKind === "branch") return "branch";
  if (mapKind === "boss") return "quiz";
  return link.kind === "beat" ? "concept" : "reaction";
}

/**
 * Whether a map node can be played as a CHALLENGE, read off the map alone.
 *
 * The rule itself is challengeable() in beats/template.ts: every step of the
 * node's lesson must be able to report a miss. That function reads the whole
 * authored content, which the pathway (entry chunk) must not import, so this
 * is the same rule said in the map's vocabulary: a beat node's lesson is MCQ,
 * match, ladder and synthesis steps only, while a trainer node carries an
 * engine step, and a unit checkpoint is already the unit's check.
 * test/challengeMode.test.ts holds the two equal over every node on the map.
 */
export function hasChallengeRun(node: PathwayNode): boolean {
  // A beat lesson that closes on the trainer (content/u1/lessonTrainers.ts) has an engine step too.
  // The unit's synthetic checkpoint has none. It used to be found by `kind !== "gate"`, but Unit 2's draft rows are
  // gate-kind practice runs (2026-10-17), so the checkpoint is now found by its id; no other gate on the map is playable.
  return checkpointUnitFor(node.id) === null && node.playable?.kind === "beat" && lessonTrainerFor(node.id) === undefined;
}
