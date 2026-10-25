/**
 * Maps a syllabus's topics onto Blueberry's units, sections and lessons
 * (STATUS C1), and turns the matched lines into a SyllabusPlan.
 *
 * DETERMINISTIC, with a confidence per match:
 *   1.0   the topic is an alias (syllabusAliases.ts) or a map title, exactly
 *   0.8+  an alias sits inside the topic ("Hückel's rule and annulenes")
 *   0.45 to 0.85  the topic's words overlap a unit or lesson title, scaled
 *         by how much of the topic and of the title they cover
 *   capped at 0.45 when another unit scores within 0.1: a lookalike, so flagged
 * Buckets: high >= 0.8, medium >= 0.5, low below, none with no candidate.
 * Low and none are FLAGGED: the screen asks the student to pick a unit or
 * mark the line not covered. A line with chapter numbers and no topic words
 * ("Ch 18") is flagged too, because there is no chapter table to read it.
 *
 * Lazy: only the syllabus screen imports this.
 */
import { PATHWAY_UNITS, unitName, type PathwayNode } from "../demo/pathwayMap";
import { branchSection, unitSections } from "../tabs/pathway/testOuts";
import { SYLLABUS_ALIASES } from "./syllabusAliases";
import type { SyllabusLine } from "./syllabusParse";
import type { SyllabusExam, SyllabusPlan, SyllabusWeek } from "./syllabusPlan";

export interface Candidate {
  readonly unitId: string;
  /** The lesson it names, or null for a whole unit. */
  readonly nodeId: string | null;
  /** The section the lesson sits in, or null for a whole unit. */
  readonly section: number | null;
  readonly confidence: number;
  /** True for an alias or a title hit exactly, or the student's own pick: what may mark a side quest covered. */
  readonly explicit: boolean;
}

export type Bucket = "high" | "medium" | "low" | "none";

export interface TopicMatch {
  readonly topic: string;
  readonly best: Candidate | null;
  /** Every candidate, best first, at most five. */
  readonly candidates: readonly Candidate[];
  readonly bucket: Bucket;
  /** The student's own answer to a flag: a candidate, or "not-covered". Absent until they pick. */
  readonly chosen?: Candidate | "not-covered";
}

export interface MatchedLine {
  readonly line: SyllabusLine;
  readonly matches: readonly TopicMatch[];
}

/* ------------------------------------------------------------------ */
/* Words                                                               */
/* ------------------------------------------------------------------ */

const STOP = new Set([
  "of", "the", "and", "to", "a", "an", "in", "on", "with", "for", "by", "vs", "versus", "via", "from", "as", "its", "their",
  "reaction", "intro", "introduction", "part", "i", "ii", "iii", "review", "chemistry", "cont", "continued", "more", "course",
  "basic", "basics", "overview", "concept", "chapter", "unit", "topic", "organic", "lecture", "selected",
]);

function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") && !/(?:ss|us|is)$/.test(word) ? word.slice(0, -1) : word;
}

/** A phrase as compared words: lower case, accents off, "'s" off, plurals off, filler words off. */
export function wordsOf(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== "" && !STOP.has(word))
    .map(singular);
}

interface Entry {
  readonly words: readonly string[];
  readonly target: string;
  readonly kind: "alias" | "title";
}

let index: { entries: Entry[]; nodes: Map<string, { unitId: string; node: PathwayNode }> } | null = null;

function built() {
  if (index !== null) return index;
  const nodes = new Map<string, { unitId: string; node: PathwayNode }>();
  const entries: Entry[] = [];
  for (const unit of PATHWAY_UNITS) {
    entries.push({ words: wordsOf(unitName(unit.title)), target: unit.id, kind: "title" });
    for (const node of unit.nodes) {
      nodes.set(node.id, { unitId: unit.id, node });
      // "9b · Aldol addition" is matched as "Aldol addition".
      entries.push({ words: wordsOf(node.title.replace(/^\d+[a-z]?\s*·\s*/, "")), target: node.id, kind: "title" });
    }
  }
  for (const [phrase, target] of Object.entries(SYLLABUS_ALIASES)) entries.push({ words: wordsOf(phrase), target, kind: "alias" });
  index = { entries: entries.filter((entry) => entry.words.length > 0), nodes };
  return index;
}

/** The unit a target id names, or null for an id that is not on the map. */
export function unitOfTarget(target: string): string | null {
  if (PATHWAY_UNITS.some((unit) => unit.id === target)) return target;
  return built().nodes.get(target)?.unitId ?? null;
}

/** The section a lesson sits in, by the map's own section cut. */
export function sectionOfNode(unitId: string, nodeId: string): number | null {
  const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId);
  if (unit === undefined) return null;
  const node = unit.nodes.find((entry) => entry.id === nodeId);
  if (node === undefined) return null;
  if (node.kind === "branch") return branchSection(unit, node);
  return unitSections(unit).find((section) => section.lights.includes(nodeId))?.number ?? null;
}

function candidateFor(target: string, confidence: number, explicit: boolean): Candidate | null {
  const unitId = unitOfTarget(target);
  if (unitId === null) return null;
  const nodeId = target === unitId ? null : target;
  return { unitId, nodeId, section: nodeId === null ? null : sectionOfNode(unitId, nodeId), confidence, explicit };
}

/** A whole unit as a candidate, for the student's own pick. */
export function unitCandidate(unitId: string): Candidate {
  return { unitId, nodeId: null, section: null, confidence: 1, explicit: true };
}

function contains(haystack: readonly string[], needle: readonly string[]): boolean {
  for (let at = 0; at + needle.length <= haystack.length; at += 1) {
    if (needle.every((word, i) => haystack[at + i] === word)) return true;
  }
  return false;
}

export function bucketOf(confidence: number | null): Bucket {
  if (confidence === null) return "none";
  return confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
}

/** Matches one topic phrase. See the header for the scores. */
export function matchTopic(topic: string): TopicMatch {
  const words = wordsOf(topic);
  const scores = new Map<string, { confidence: number; explicit: boolean }>();
  const offer = (target: string, confidence: number, explicit: boolean) => {
    const was = scores.get(target);
    if (was === undefined || confidence > was.confidence) scores.set(target, { confidence, explicit });
  };
  if (words.length > 0) {
    const joined = words.join(" ");
    for (const entry of built().entries) {
      if (entry.words.join(" ") === joined) offer(entry.target, 1, true);
      else if (entry.kind === "alias" && contains(words, entry.words)) offer(entry.target, 0.8 + 0.15 * (entry.words.length / words.length), false);
      else if (entry.kind === "title") {
        const overlap = words.filter((word) => word.length >= 3 && entry.words.includes(word)).length;
        if (overlap > 0) offer(entry.target, 0.45 + 0.4 * (overlap / words.length) * Math.sqrt(overlap / entry.words.length), false);
      }
    }
  }
  let candidates = [...scores.entries()]
    .flatMap(([target, score]) => {
      const candidate = candidateFor(target, Math.round(score.confidence * 100) / 100, score.explicit);
      return candidate === null ? [] : [candidate];
    })
    // Best first; on a tie a lesson beats its whole unit, then map order.
    .sort((a, b) => b.confidence - a.confidence || (a.nodeId === null ? 1 : 0) - (b.nodeId === null ? 1 : 0));
  const top = candidates[0];
  // A lookalike: two different units score the same, so neither is trusted.
  if (top !== undefined && top.confidence < 1) {
    const rival = candidates.find((candidate) => candidate.unitId !== top.unitId);
    if (rival !== undefined && top.confidence - rival.confidence < 0.1) {
      candidates = [{ ...top, confidence: Math.min(top.confidence, 0.45) }, ...candidates.slice(1)];
    }
  }
  candidates = candidates.slice(0, 5);
  const best = candidates[0] ?? null;
  return { topic, best, candidates, bucket: bucketOf(best?.confidence ?? null) };
}

/** Topic and exam lines, each topic matched. Skipped and holiday lines are dropped. */
export function matchLines(lines: readonly SyllabusLine[]): MatchedLine[] {
  return lines.flatMap((line): MatchedLine[] => {
    if (line.kind === "skip" || line.kind === "holiday") return [];
    const matches = line.topics.map(matchTopic).filter((match) => wordsOf(match.topic).length > 0);
    if (line.kind === "topic" && matches.length === 0 && line.chapters.length > 0) {
      return [{ line, matches: [{ topic: `Ch ${line.chapters.join(", ")}`, best: null, candidates: [], bucket: "none" }] }];
    }
    if (line.kind === "topic" && matches.length === 0) return [];
    return [{ line, matches }];
  });
}

/** The candidate a match counts as: the student's pick, else the best unless it is flagged. */
export function accepted(match: TopicMatch): Candidate | null {
  if (match.chosen === "not-covered") return null;
  if (match.chosen !== undefined) return match.chosen;
  return match.bucket === "high" || match.bucket === "medium" ? match.best : null;
}

/** True when the student still has to answer this match (exam lines never ask). */
export function isFlagged(row: MatchedLine, match: TopicMatch): boolean {
  return row.line.kind === "topic" && match.chosen === undefined && (match.bucket === "low" || match.bucket === "none");
}

/* ------------------------------------------------------------------ */
/* The plan                                                             */
/* ------------------------------------------------------------------ */

function dayNumber(date: string): number {
  return Math.round(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000);
}

/** Week numbers from dates, for a syllabus with dates and no week column: Monday to Sunday, from the first date's week. */
function weekFromDates(rows: readonly MatchedLine[]): (row: MatchedLine) => number | null {
  if (rows.some((row) => row.line.week !== null)) return (row) => row.line.week;
  const dated = rows.flatMap((row) => (row.line.date === null ? [] : [dayNumber(row.line.date)]));
  if (dated.length === 0) return () => null;
  const first = Math.min(...dated);
  // 1970-01-01 was a Thursday, so (day + 3) mod 7 is days since Monday.
  const monday = first - ((first + 3) % 7);
  return (row) => (row.line.date === null ? null : Math.floor((dayNumber(row.line.date) - monday) / 7) + 1);
}

/** The plan the matched lines describe. Pure: `now` stamps it. */
export function buildPlan(rows: readonly MatchedLine[], now: number = Date.now()): SyllabusPlan {
  const weekOf = weekFromDates(rows);
  const unitOrder: string[] = [];
  const sectionsSeen = new Map<string, number[]>();
  const weeks = new Map<number, { start: string | null; unitIds: string[] }>();
  const exams: SyllabusExam[] = [];
  const sideQuests = new Set<string>();
  let sinceExam: string[] = [];

  for (const row of rows) {
    const picks = row.matches.flatMap((match) => {
      const pick = accepted(match);
      return pick === null ? [] : [pick];
    });
    if (row.line.kind === "exam") {
      const named = picks.map((pick) => pick.unitId);
      exams.push({ date: row.line.date, title: row.line.title ?? "Exam", unitIds: [...new Set([...sinceExam, ...named])] });
      sinceExam = [];
      continue;
    }
    const week = weekOf(row);
    if (week !== null && !weeks.has(week)) weeks.set(week, { start: null, unitIds: [] });
    const entry = week === null ? null : weeks.get(week)!;
    if (entry !== null && row.line.date !== null && (entry.start === null || row.line.date < entry.start)) entry.start = row.line.date;
    for (const pick of picks) {
      if (!unitOrder.includes(pick.unitId)) unitOrder.push(pick.unitId);
      if (!sinceExam.includes(pick.unitId)) sinceExam.push(pick.unitId);
      if (entry !== null && !entry.unitIds.includes(pick.unitId)) entry.unitIds.push(pick.unitId);
      if (pick.section !== null) {
        const seen = sectionsSeen.get(pick.unitId) ?? [];
        if (!seen.includes(pick.section)) seen.push(pick.section);
        sectionsSeen.set(pick.unitId, seen);
      }
      if (pick.explicit && pick.nodeId !== null && built().nodes.get(pick.nodeId)?.node.kind === "branch") sideQuests.add(pick.nodeId);
    }
  }

  const sectionOrder: Record<string, number[]> = {};
  for (const unitId of unitOrder) {
    const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId)!;
    const all = unitSections(unit).map((section) => section.number);
    const seen = (sectionsSeen.get(unitId) ?? []).filter((number) => all.includes(number));
    sectionOrder[unitId] = [...seen, ...all.filter((number) => !seen.includes(number))];
  }
  const weekList: SyllabusWeek[] = [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([week, entry]) => ({ week, start: entry.start, unitIds: entry.unitIds }));

  return { version: 1, updatedAt: now, weeks: weekList, unitOrder, sectionOrder, notCovered: [], sideQuests: [...sideQuests], exams };
}
