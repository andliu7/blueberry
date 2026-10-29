/**
 * The staff pathway deck model: one lesson as a run of slides, one idea per slide.
 *
 * Pure. Every number and rule on a slide is read from the code that plays it
 * (planLesson, the in-a-row run, the pool and test-out draws), so the deck
 * cannot drift from the product. Where the product has nothing yet (no video
 * is filmed, copy is a draft) the slide says so plainly.
 *
 * It imports no writer: no progress, no storage, no billing.
 */
import { PATHWAY_UNITS, checkpointNodeId, pathwayNode } from "../demo/pathwayMap";
import { challengeable, planLesson, type PlanStep } from "../beats/template";
import { challengePool, isExamRun, practicePool } from "../beats/practice/pools";
import {
  CLEAR_AT,
  POOL_SLACK,
  REQUEUE_GAP,
  RUN_TIERS,
  examPassMark,
  unreachableTiers,
} from "../beats/practice/run";
import { NODE_MOVES } from "../pathway-sheet/nodeDifficulty";
import { DIFFICULTY_RULES } from "../beats/difficulty";
import { takeawayFor } from "../pathway-sheet/takeaways";
import {
  SECTION_TEST_MAX,
  SECTION_TEST_MIN,
  UNIT_EXAM_SIZE,
  testOutFor,
  unitExamId,
  unitSections,
} from "../tabs/pathway/testOuts";
import type { LessonRow, Slide, UnitRow } from "./slides";

export type DeckSection =
  | "overview"
  | "explain"
  | "videos"
  | "questions"
  | "flashcards"
  | "challenge"
  | "overarching"
  | "chosen"
  | "algorithms";

export const SECTION_LABEL: Readonly<Record<DeckSection, string>> = {
  overview: "Overview",
  explain: "Explanation",
  videos: "Videos",
  questions: "Questions",
  flashcards: "Flashcards",
  challenge: "Challenge",
  overarching: "Overarching",
  chosen: "How chosen",
  algorithms: "Algorithms",
};

export interface DeckFact {
  readonly label: string;
  readonly value: string;
}

/** A small drawn picture of a rule, with every number read from the run code. */
export type DeckDiagram =
  | { readonly kind: "run"; readonly clearAt: number; readonly gap: number; readonly tiers: readonly { readonly name: string; readonly at: number }[] }
  | { readonly kind: "failback"; readonly tier: string; readonly at: number; readonly below: boolean }
  | { readonly kind: "pace" }
  | { readonly kind: "pass"; readonly clearAt: number; readonly examPct: number };

export interface DeckSlide {
  /** A picture of the rule, drawn beside the words. */
  readonly diagram?: DeckDiagram;
  readonly id: string;
  readonly section: DeckSection;
  readonly title: string;
  /** The one sentence that carries the idea. */
  readonly lead?: string;
  readonly points?: readonly string[];
  readonly facts?: readonly DeckFact[];
  /** A note that something is a draft or missing. Drawn as a tag. */
  readonly flag?: string;
  /** Set on a question slide: drawn with the shared SlideCard. */
  readonly question?: Slide;
}

const STEP_LABEL: Readonly<Record<string, string>> = {
  meet: "First-meeting questions (cannot fail)",
  mcq: "Graded quick questions",
  match: "Matching board",
  poolMatch: "Matching board (pool)",
  sort: "Ordering ladder",
  poolSort: "Ordering ladder (pool)",
  poolKeq: "Typed pKa to Keq (pool)",
  synthesis: "Synthesis gap",
  mechanism: "Mechanism trainer",
  resonance: "Resonance trainer",
  draw: "Draw it",
  practice: "In-a-row run",
};

const SLOT_LABEL: Readonly<Record<string, string>> = {
  hook: "Hook",
  recognise: "Recognise",
  connect: "Connect",
  order: "Order",
  produce: "Produce",
};


function stepLine(step: PlanStep): string {
  return `${SLOT_LABEL[step.slot] ?? step.slot}: ${STEP_LABEL[step.beat.kind] ?? step.beat.kind}`;
}

/* ------------------------------------------------------------ builders -- */

function overview(lesson: LessonRow, unit: UnitRow, questions: readonly Slide[], steps: readonly PlanStep[]): DeckSlide[] {
  const moves = NODE_MOVES[lesson.id];
  const byKind = new Map<string, number>();
  for (const q of questions) byKind.set(q.kind, (byKind.get(q.kind) ?? 0) + 1);
  const mix = [...byKind].map(([kind, n]) => `${n} ${kind}`).join(", ");
  return [
    {
      id: "overview",
      section: "overview",
      title: lesson.title,
      lead: `${unit.title}. A ${lesson.kind}${lesson.role === undefined ? "" : `, role ${lesson.role}`}.`,
      facts: [
        { label: "Steps in a run", value: String(steps.length) },
        { label: "Questions", value: questions.length === 0 ? "none authored" : `${questions.length} (${mix})` },
        { label: "Difficulty (moves graded)", value: moves === undefined ? "No data: no content behind it" : String(moves) },
      ],
    },
    {
      id: "overview-steps",
      section: "overview",
      title: "The lesson, step by step",
      lead: "A run plays these steps in this order, one per template slot.",
      points: steps.length === 0 ? ["Nothing is authored for this node."] : steps.map(stepLine),
    },
  ];
}

function explain(lesson: LessonRow): DeckSlide[] {
  const take = takeawayFor(lesson.id);
  const blurb = pathwayNode(lesson.id)?.blurb;
  const out: DeckSlide[] = [];
  if (blurb !== undefined) {
    out.push({ id: "explain-blurb", section: "explain", title: "What it covers", lead: blurb });
  }
  out.push(
    take === null
      ? { id: "explain-key", section: "explain", title: "Key idea", lead: "No key idea written for this lesson yet.", flag: "No data" }
      : { id: "explain-key", section: "explain", title: "Key idea (guideline)", lead: take.text, flag: take.placeholder ? "Draft, awaiting owner sign-off" : undefined },
  );
  out.push({
    id: "explain-guide",
    section: "explain",
    title: "The guidebook page",
    lead: "Before a run the student can open a one-page guidebook: intro, the key idea, a five-step worked example, a send-off line.",
    points: [
      "Worked-example arrows carry step numbers only, never reagents, so a draft claims no chemistry.",
      "The whole page carries a draft mark until copy passes the human gate.",
    ],
    flag: "Draft",
  });
  return out;
}

function videos(lesson: LessonRow): DeckSlide[] {
  const node = pathwayNode(lesson.id);
  const topics = node?.backgroundTopics ?? [];
  const explainer =
    node?.role === "video"
      ? `Opens on a short explainer${node.videoMinutes === undefined ? "" : `, planned ${node.videoMinutes} min`}.`
      : "This lesson does not open on an explainer.";
  return [
    {
      id: "videos-explainer",
      section: "videos",
      title: "Explainer video",
      lead: explainer,
      points: [
        "No clip is filmed yet: the lesson shows a marked template strip and stands without it.",
        "A clip never autoplays with sound, is always skippable, and keeps a transcript.",
      ],
      flag: "No data, template only",
    },
    {
      id: "videos-background",
      section: "videos",
      title: "Background clips",
      lead: topics.length === 0 ? "No background clips are listed for this lesson." : "Short clips listed in the guidebook's Background section.",
      points: topics.map((t) => `${t.title} (${t.minutes} min)`),
    },
  ];
}

function flashcards(questions: readonly Slide[]): DeckSlide[] {
  const mcqs = questions.filter((q) => q.kind === "mcq");
  const offered = mcqs.filter((q) => q.draft !== true);
  const withheld = mcqs.length - offered.length;
  const sample = offered.slice(0, 5);
  const out: DeckSlide[] = [
    {
      id: "cards-rule",
      section: "flashcards",
      title: "How a question becomes a flashcard",
      lead: "A missed multiple-choice question is offered as a card; saving it twice updates one card, never two.",
      points: [
        "Front is the question, back is the right answer, and the card carries the author's reason.",
        "The card id is derived from the question id, so rewording keeps it.",
        "A draft question is never offered as a card until it is signed off.",
      ],
      facts: [
        { label: "Could be offered", value: String(offered.length) },
        { label: "Withheld as draft", value: String(withheld) },
      ],
    },
  ];
  if (sample.length > 0) {
    out.push({
      id: "cards-sample",
      section: "flashcards",
      title: "Cards this lesson can offer",
      lead: `The first ${sample.length} of ${offered.length}, front then back.`,
      points: sample.map((q) => `${q.prompt}  ->  ${q.answer[0] ?? "?"}`),
    });
  }
  return out;
}

function challenge(lesson: LessonRow): DeckSlide[] {
  const can = challengeable(lesson.id);
  const set = challengePool(lesson.id).length;
  return [
    {
      id: "challenge-rules",
      section: "challenge",
      title: "Challenge: the same questions, no second chance",
      lead: can ? "A harder run of a cleared lesson." : "This lesson has no Challenge.",
      points: can
        ? [
            "Nothing new is asked: the content is the lesson's own plan.",
            "No hints, no recycle pass.",
            "The first miss ends the run; a pass needs every answer right first time.",
          ]
        : [
            "Mechanism and resonance steps report solves, never misses, so they cannot be graded as a Challenge.",
            "A unit checkpoint is already the unit's own check, so it has none either.",
          ],
      facts: can && set > 0 ? [{ label: "Questions in the set", value: String(set) }] : undefined,
    },
  ];
}

function overarching(lesson: LessonRow, unit: UnitRow): DeckSlide[] {
  const out: DeckSlide[] = [];
  const checkpoint = checkpointNodeId(unit.unitId);
  const exam = isExamRun(checkpoint);
  out.push({
    id: "over-checkpoint",
    section: "overarching",
    title: "The unit checkpoint",
    lead: "One check across the unit. It takes the first step of each template slot from the unit's main-line lessons and leaves side quests off.",
    points: [
      "A first meeting is left out, since it cannot fail.",
      exam
        ? `Here it plays as a unit exam: every problem is played, a miss comes back once, and it passes on ${examPassMark(100)}% right first time.`
        : "Here it plays as a mix of the unit's steps.",
      "A side quest the student's syllabus covers lends one question each.",
    ],
  });
  const unitDef = PATHWAY_UNITS.find((u) => u.id === unit.unitId);
  if (unitDef === undefined) {
    out.push({ id: "over-tests", section: "overarching", title: "Test-outs", lead: "This unit has no section tests or unit exam.", flag: "No data" });
    return out;
  }
  const section = unitSections(unitDef).find((s) => s.sources.includes(lesson.id));
  const sectionTest = section?.testId == null ? null : testOutFor(section.testId);
  const unitTest = testOutFor(unitExamId(unit.unitId));
  out.push({
    id: "over-tests",
    section: "overarching",
    title: "Test-outs: skip ahead by proving it",
    lead: "Overarching questions come from the lessons' own pools, not new writing.",
    facts: [
      { label: "This lesson's section test", value: sectionTest === null ? "none" : `${sectionTest.title}, up to ${sectionTest.size} questions` },
      { label: "Unit exam", value: unitTest === null ? "none" : `up to ${UNIT_EXAM_SIZE} questions` },
      { label: "Section test size range", value: `${SECTION_TEST_MIN} to ${SECTION_TEST_MAX}, longer each section` },
    ],
    points: ["A pass lights the lessons it covers. Tools such as NMR, IR and the periodic table stay hidden in tests."],
  });
  return out;
}

function chosen(lesson: LessonRow): DeckSlide[] {
  const run = practicePool(lesson.id).length;
  return [
    {
      id: "chosen-lesson",
      section: "chosen",
      title: "Which questions a lesson asks",
      lead: "Authored order, graded by rung.",
      points: [
        "Meet step: questions written for a first meeting only (rung 0). Nothing rides on them.",
        "Recognise step: each question plays at its own declared rung, rung 1 first, then 2, then 3.",
        "Ahead (+1): the harder questions first, then at most two rung-1. Needs two harder questions or it plays as normal.",
        "Struggling (-1): rung 1 only, meet step kept.",
        run > 0 ? `This lesson is an in-a-row run over a pool of ${run}, in authored order.` : "This lesson is a seven-slot lesson, not a run.",
      ],
    },
    {
      id: "chosen-recycle",
      section: "chosen",
      title: "What comes back",
      lead: "One recycle pass after the content, never more.",
      points: [
        "Only questions missed at a rung that can fail come back; a first meeting cannot fail.",
        "A Challenge has no recycle pass.",
      ],
    },
    {
      id: "chosen-testout",
      section: "chosen",
      title: "How a test-out is drawn",
      lead: "Conceptual, harder than the lessons, and mixed.",
      points: [
        "Naming questions and naming lessons are left out.",
        "Each lesson's questions are taken hardest first, held-out twins before the lesson's own screen.",
        "Ladders and boards fill up to a third, then multiple choice fills the rest; a non-multiple-choice lands every third question.",
        "Interleaved by lesson, so any stretch samples every lesson. Drawing questions are left out.",
      ],
    },
  ];
}

/** The words of the difficulty rules named, straight from the code's own table. */
function rule(...ids: readonly string[]): string[] {
  return DIFFICULTY_RULES.filter((r) => ids.includes(r.id)).map((r) => `${r.id}, ${r.name}: ${r.text}`);
}

function algorithms(lesson: LessonRow): DeckSlide[] {
  const pool = practicePool(lesson.id).length;
  const master = RUN_TIERS[1];
  const tiers = RUN_TIERS.map((t) => `${t.name} at ${t.at}`).join(", ");
  const short = pool > 0 ? unreachableTiers(pool).map((t) => t.name) : [];
  return [
    {
      id: "algo-run",
      section: "algorithms",
      title: "The in-a-row run",
      diagram: { kind: "run", clearAt: CLEAR_AT, gap: REQUEUE_GAP, tiers: RUN_TIERS.map((t) => ({ name: t.name, at: t.at })) },
      lead: `A node clears after ${CLEAR_AT} right in a row, not after a fixed set.`,
      points: [
        "A right answer adds one to the run.",
        `A miss comes back ${REQUEUE_GAP} problems later, once per session.`,
        `Tiers: ${tiers}. Going past the first is optional.`,
      ],
      facts: pool > 0 ? [{ label: "This pool", value: `${pool} problems${short.length > 0 ? `; ${short.join(", ")} not reachable (a tier needs its length plus ${POOL_SLACK} spare)` : ""}` }] : undefined,
    },
    {
      id: "algo-failback",
      section: "algorithms",
      title: "Fail back one",
      diagram: { kind: "failback", tier: master.name, at: master.at, below: false },
      lead: `From ${master.name} (${master.at}) up, a miss steps back one problem, not to zero.`,
    },
    {
      id: "algo-failback-low",
      section: "algorithms",
      title: `Below ${master.name}`,
      diagram: { kind: "failback", tier: master.name, at: master.at, below: true },
      lead: `Below ${master.name} a miss resets the run to 0, so the first clear stays earned.`,
      points: ["Challenge and exams keep their own rules and are not softened."],
    },
    {
      id: "algo-pace",
      section: "algorithms",
      title: "Easier or harder next time: pace",
      diagram: { kind: "pace" },
      lead: "Pace is worked out from the history each time, never stored. It runs from easier (-1) through as written (0) to harder (+1).",
      points: rule("R2", "R3", "R4"),
    },
    {
      id: "algo-pace-tap",
      section: "algorithms",
      title: "A tap wins",
      lead: "The one-tap rating after a lesson overrides the history.",
      points: [...rule("R1"), "A trainer lesson reports solves only, so only its tap counts."],
    },
    {
      id: "algo-pace-context",
      section: "algorithms",
      title: "Two rules about this lesson",
      lead: "These look at one lesson, not the whole unit. They apply in Units 1 to 3.",
      points: rule("R5", "R6"),
    },
    {
      id: "algo-pace-effect",
      section: "algorithms",
      title: "What easier and harder change",
      lead: "Harder means less scaffolding on the same ideas, never more obscure ones.",
      points: [
        "Harder: no meet step, the lesson's harder questions first. Needs two or more of them, else it plays as written.",
        "As written: meet step, then guided, then recall.",
        "Easier: meet step kept, guided questions only, and the reward card points at the guide, flashcards and help.",
      ],
    },
    {
      id: "algo-pass",
      section: "algorithms",
      title: "Passing: run, Challenge, exam",
      diagram: { kind: "pass", clearAt: CLEAR_AT, examPct: examPassMark(100) },
      lead: "Three rules for three kinds of run.",
      points: [
        `Run: best run of ${CLEAR_AT} or more clears.`,
        "Challenge: every problem right first time, first miss ends it.",
        `Exam: ${examPassMark(100)}% right first time (owner to confirm); every problem is played.`,
      ],
    },
  ];
}

/** The whole deck for one lesson: concept slides, then its questions. */
export function pathwayDeck(
  lesson: LessonRow,
  unit: UnitRow,
  questions: readonly Slide[],
): readonly DeckSlide[] {
  const steps = planLesson(lesson.id)?.steps ?? [];
  return [
    ...overview(lesson, unit, questions, steps),
    ...explain(lesson),
    ...videos(lesson),
    ...questions.map((question): DeckSlide => ({ id: `q:${question.id}`, section: "questions", title: question.prompt, question })),
    ...(questions.length === 0
      ? [{ id: "q-none", section: "questions" as const, title: "No questions authored", lead: "This lesson has no questions to show.", flag: "No data" }]
      : []),
    ...flashcards(questions),
    ...challenge(lesson),
    ...overarching(lesson, unit),
    ...chosen(lesson),
    ...algorithms(lesson),
  ];
}

/** Sections in deck order with the index of each one's first slide. */
export function sectionStarts(deck: readonly DeckSlide[]): readonly { readonly section: DeckSection; readonly at: number; readonly count: number }[] {
  const out: { section: DeckSection; at: number; count: number }[] = [];
  deck.forEach((slide, at) => {
    const last = out[out.length - 1];
    if (last !== undefined && last.section === slide.section) last.count += 1;
    else out.push({ section: slide.section, at, count: 1 });
  });
  return out;
}
