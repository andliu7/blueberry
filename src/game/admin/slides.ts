/**
 * The staff viewer's data: every lesson on the map, and each lesson flattened
 * into slides in the order its run plays them.
 *
 * Pure. It walks the same plan the lesson runner walks (planLesson in
 * beats/template.ts), so the viewer and a real run cannot disagree about what
 * a lesson holds. It re-shows content that already ships, chemistry included,
 * and derives nothing new: every structure here comes from the RDKit-built
 * tables the lessons themselves draw from.
 */
import { PATHWAY_UNITS, unitCheckpointNode, type PathwayUnit } from "../demo/pathwayMap";
import { STORY_UNIT } from "../content/u0/story";
import { lessonMcqBeats, lessonMeetBeats, lessonPoolItems, planLesson, type ContentSlot } from "../beats/template";
import { lessonPool, practicePool } from "../beats/practice/pools";
import { MATCH_BOARDS } from "../beats/match/boards";
import { sortContentById } from "../beats/sort/ladders";
import { synthesisGapsForNode } from "../beats/synthesis/corpus";
import { mcqOptionTiles, mcqVisualFor, type McqVisual, type NamedFigure } from "../beats/mcq/mcqFigures";
import type { McqBeat } from "../beats/types";
import type { PoolEntry } from "../content/u1/types";
import type { SortContent } from "../beats/sort/ladders";

export interface LessonRow {
  readonly id: string;
  readonly title: string;
  /** The map's dependency kind: spine, branch, gate or boss. */
  readonly kind: string;
  readonly role?: string;
}

export interface UnitRow {
  readonly unitId: string;
  readonly title: string;
  readonly lessons: readonly LessonRow[];
}

export type SlideKind = "mcq" | "sort" | "match" | "draw" | "synthesis" | "trainer";

export interface SlideChoice {
  readonly id: string;
  readonly text: string;
  readonly correct: boolean;
  readonly why?: string;
  /** The drawn option tile, when the question draws its options. */
  readonly figure?: NamedFigure["figure"];
}

export interface Slide {
  /** The authored id (beat id or pool entry id). Unique within one lesson. */
  readonly id: string;
  readonly kind: SlideKind;
  /** The template slot the step fills (hook, recognise, connect, order, produce). */
  readonly slot: ContentSlot;
  readonly prompt: string;
  readonly brief?: string;
  readonly visual?: McqVisual;
  /** Answer options, as a student sees them. `correct` is for the staff view only. */
  readonly choices?: readonly SlideChoice[];
  /** The cards a student is handed, in a neutral order that does not give the answer away. */
  readonly cards?: readonly string[];
  /** The answer, as lines of text, for the staff view. */
  readonly answer: readonly string[];
  readonly explanation?: string;
  readonly conditions?: string;
  readonly provenance?: string;
  /** True for a draft pool item still waiting on a human check. */
  readonly draft?: boolean;
}

const byText = (a: string, b: string) => a.localeCompare(b);

/** Every unit, Start here first, with the lessons that have something to play. */
export function lessonIndex(): readonly UnitRow[] {
  const units: readonly PathwayUnit[] = [STORY_UNIT, ...PATHWAY_UNITS];
  return units.map((unit) => {
    const nodes = unit.nodes.some((node) => node.id === unitCheckpointNode(unit).id)
      ? unit.nodes
      : [...unit.nodes, unitCheckpointNode(unit)];
    return {
      unitId: unit.id,
      title: unit.title,
      lessons: nodes
        .filter((node) => node.mentionOnly !== true && planLesson(node.id) !== null)
        .map((node) => ({ id: node.id, title: node.title, kind: node.kind, ...(node.role === undefined ? {} : { role: node.role }) })),
    };
  });
}

function poolMeta(entry: PoolEntry) {
  return {
    explanation: entry.explanation,
    ...(entry.conditions === undefined ? {} : { conditions: entry.conditions }),
    provenance: entry.provenance,
    draft: entry.placeholder,
  };
}

function mcqSlide(beat: McqBeat, slot: ContentSlot, entry: PoolEntry | undefined): Slide {
  const tiles = mcqOptionTiles(beat.id, beat.options.map((option) => option.id));
  const visual = mcqVisualFor(beat.id);
  const correct = beat.options.find((option) => option.id === beat.correctOptionId);
  return {
    id: entry?.id ?? beat.id,
    kind: "mcq",
    slot,
    prompt: beat.prompt,
    ...(beat.brief === undefined ? {} : { brief: beat.brief }),
    ...(visual === null ? {} : { visual }),
    choices: beat.options.map((option) => ({
      id: option.id,
      text: option.text,
      correct: option.id === beat.correctOptionId,
      ...(option.why === undefined ? {} : { why: option.why }),
      ...(tiles?.[option.id] === undefined ? {} : { figure: tiles[option.id]!.figure }),
    })),
    answer: correct === undefined ? [] : [correct.text],
    ...(entry === undefined ? {} : poolMeta(entry)),
  };
}

function sortSlide(content: SortContent, slot: ContentSlot, entry?: PoolEntry): Slide {
  const { beat, trackEnds } = content;
  const label = (id: string) => beat.items.find((item) => item.id === id)?.label ?? id;
  return {
    id: entry?.id ?? beat.id,
    kind: "sort",
    slot,
    prompt: beat.prompt,
    ...(beat.brief === undefined ? {} : { brief: beat.brief }),
    cards: beat.items.map((item) => item.label).sort(byText),
    answer: [`${trackEnds.first} first`, ...beat.order.map((id, i) => `${i + 1}. ${label(id)}`), `${trackEnds.last} last`],
    ...(entry === undefined ? {} : poolMeta(entry)),
  };
}

function poolEntrySlide(entry: PoolEntry, slot: ContentSlot): Slide {
  const { item } = entry;
  if (item.kind === "mcq") return mcqSlide(item.beat, slot, entry);
  if (item.kind === "sort") return sortSlide(item.content, slot, entry);
  if (item.kind === "match") {
    const { board } = item;
    return {
      id: entry.id,
      kind: "match",
      slot,
      prompt: board.prompt,
      ...(board.brief === undefined ? {} : { brief: board.brief }),
      cards: Object.values(board.text).sort(byText),
      answer: board.answer.pairs.map((pair) => `${board.text[pair.promptId] ?? pair.promptId} goes with ${board.text[pair.targetId] ?? pair.targetId}`),
      ...poolMeta(entry),
    };
  }
  const beat = item.beat;
  return {
    id: entry.id,
    kind: "draw",
    slot,
    prompt: beat.prompt,
    ...(beat.brief === undefined ? {} : { brief: beat.brief }),
    visual: beat.visual,
    answer: [beat.answer.name, `SMILES ${beat.answer.smiles}`, beat.why],
    ...poolMeta(entry),
  };
}

function mcqStepSlides(beats: readonly McqBeat[], node: string, slot: ContentSlot): Slide[] {
  const pool = lessonPool(node);
  return beats.map((beat) =>
    mcqSlide(beat, slot, pool.find((entry) => entry.item.kind === "mcq" && entry.item.beat.id === beat.id)),
  );
}

function trainerSlide(id: string, label: string): Slide {
  return {
    id: `trainer:${id}`,
    kind: "trainer",
    slot: "produce",
    prompt: `Arrow pushing: ${label} ${id}`,
    brief: "This step plays in the trainer. Use Play this lesson to see it.",
    answer: [`Trainer ${label} ${id}`],
  };
}

/** A lesson's slides, in the order its run plays them. Empty for a node with nothing authored. */
export function lessonSlides(node: string): readonly Slide[] {
  const plan = planLesson(node);
  if (plan === null) return [];
  const slides: Slide[] = [];
  for (const { slot, beat } of plan.steps) {
    switch (beat.kind) {
      case "meet":
        slides.push(...mcqStepSlides(lessonMeetBeats(beat.node), beat.node, slot));
        break;
      case "mcq": {
        // The meet step already showed the first-meeting questions; the graded step plays the rest.
        const meet = new Set(lessonMeetBeats(beat.node).map((b) => b.id));
        slides.push(...mcqStepSlides(lessonMcqBeats(beat.node).filter((b) => !meet.has(b.id)), beat.node, slot));
        break;
      }
      case "match":
        for (const board of MATCH_BOARDS.filter((b) => b.node === beat.node)) {
          slides.push({
            id: board.id,
            kind: "match",
            slot,
            prompt: board.prompt,
            ...(board.brief === undefined ? {} : { brief: board.brief }),
            cards: [...board.pairs.flatMap((p) => [p.left, p.right]), ...(board.decoys ?? []).map((d) => d.text)].sort(byText),
            answer: board.pairs.map((p) => `${p.left} goes with ${p.right}${p.why === undefined ? "" : `: ${p.why}`}`),
          });
        }
        break;
      case "sort": {
        const content = sortContentById(beat.ladderId);
        if (content !== undefined) slides.push(sortSlide(content, slot));
        break;
      }
      case "poolSort":
        slides.push(...lessonPoolItems(beat.node, "sort").map((entry) => poolEntrySlide(entry, slot)));
        break;
      case "poolMatch":
        slides.push(...lessonPoolItems(beat.node, "match").map((entry) => poolEntrySlide(entry, slot)));
        break;
      case "draw":
        slides.push(...lessonPoolItems(beat.node, "draw").map((entry) => poolEntrySlide(entry, slot)));
        break;
      case "synthesis":
        for (const gap of synthesisGapsForNode(beat.node)) {
          const route = gap.steps.map((step) => `${step.over ?? "?"} gives ${step.produces ?? "?"}`);
          const correct = gap.bank.find((option) => option.id === gap.correctOptionId);
          slides.push({
            id: gap.id,
            kind: "synthesis",
            slot,
            prompt: gap.prompt,
            ...(gap.brief === undefined ? {} : { brief: gap.brief }),
            cards: [`From ${gap.start} to ${gap.target}`, ...route],
            choices: gap.bank.map((option) => ({
              id: option.id,
              text: option.text,
              correct: option.id === gap.correctOptionId,
              ...(option.why === undefined ? {} : { why: option.why }),
            })),
            answer: correct === undefined ? [] : [correct.text],
            explanation: gap.why,
          });
        }
        break;
      case "mechanism":
        if (beat.draws !== undefined) {
          slides.push(...lessonPoolItems(beat.draws, "draw").map((entry) => poolEntrySlide(entry, slot)));
        }
        slides.push(trainerSlide(beat.play.id, beat.play.kind));
        break;
      case "resonance":
        if (beat.draws !== undefined) {
          slides.push(...lessonPoolItems(beat.draws, "draw").map((entry) => poolEntrySlide(entry, slot)));
        }
        slides.push(trainerSlide(beat.resonanceId, "resonance"));
        break;
      case "practice":
        slides.push(...practicePool(beat.node).map((entry) => poolEntrySlide(entry, slot)));
        break;
    }
  }
  return slides;
}
