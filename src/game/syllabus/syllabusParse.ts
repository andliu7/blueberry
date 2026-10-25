/**
 * Reads the schedule out of a pasted syllabus (STATUS C1). Deterministic, no
 * model call, no Apps Script: line by line, it finds a week number, a date,
 * an exam, a holiday or a list of topics, and skips the rest (office hours,
 * grading, policies).
 *
 * What it copes with, each pinned by a fixture in test/fixtures/syllabus:
 *   - a table copied out of a PDF (cells split by tabs or runs of spaces)
 *   - bullets, and "Week 3:", "Wk 3", "W3" headers on their own line or not
 *   - "Week of Sept 8", "Tue 9/2", "10/14", "Oct 14", ranges like "Oct 14-16"
 *   - "Lecture 12" labels, "Exam 2: Ch 15-17", "Midterm", "Final Exam"
 *   - "No class, Thanksgiving" and the like
 *
 * Year inference is local and needs no year in the text: a date more than
 * five months behind today is read as next year's (a spring syllabus pasted
 * in December). Dates are "YYYY-MM-DD" wall-clock strings, never toISOString.
 *
 * Lazy: only the syllabus screen imports this.
 */

export type LineKind = "topic" | "exam" | "holiday" | "skip";

export interface SyllabusLine {
  readonly raw: string;
  readonly kind: LineKind;
  readonly week: number | null;
  readonly date: string | null;
  readonly topics: readonly string[];
  readonly chapters: readonly number[];
  /** The exam's name, "Exam 2" or "Final Exam", on an exam line. */
  readonly title: string | null;
}

const MONTH: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const NOISE =
  /office hours?|grading|grade[sd]?\b|polic(?:y|ies)|integrity|attendance|textbook|required text|e-?mail|@|https?:|www\.|prerequisite|accommodation|late work|instructor|professor|teaching assistant|\bta\b|canvas|elms|blackboard|percent|%|\bpoints?\b|calculator|make-?up|disabilit|syllabus|semester schedule|tentative|subject to change|room\b|lecture hall|section \d{4}|calendar|approximate|\bchem\s*\d{3}|organic chemistry/i;
const HOLIDAY = /no class|holiday|thanksgiving|spring break|fall break|winter break|labor day|reading day|\bmlk\b|veterans|university closed|campus closed|recess|no lecture/i;
const HEADER_WORDS = new Set(["week", "wk", "date", "dates", "day", "days", "topic", "topics", "reading", "readings", "lecture", "lectures", "chapter", "chapters", "ch", "assignment", "assignments", "due", "notes", "class", "homework", "hw", "content", "material", "schedule", "#", "no", "and", "section", "sections"]);
/** Words that are never a topic on their own. */
const FILLER = /^(?:review|reviews|intro|introduction|overview|cont(?:inued|'d|d)?|part \w+|wrap[- ]?up|catch[- ]?up|tba|tbd|lab|quiz \d*|quiz|problem set \d*|ps ?\d+|hw ?\d+|homework ?\d*|reading|notes|discussion|recitation|in[- ]class|and|of|the|due|optional|topics?|exam review|onward|weeks? \d+(?:\s*[-–]\s*\d+)?)$/i;

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The year for a month and day with none written: this year, or next if that is over five months gone. */
function inferYear(month: number, day: number, today: Date): number {
  const monthsBehind = today.getMonth() + 1 - month + (today.getDate() - day) / 31;
  return monthsBehind > 5 ? today.getFullYear() + 1 : today.getFullYear();
}

function fullYear(text: string): number {
  const n = Number(text);
  return n < 100 ? 2000 + n : n;
}

interface Found {
  readonly date: string | null;
  readonly rest: string;
}

/** The first date on the line, and the line with it (and any range end) cut out. */
function takeDate(text: string, today: Date): Found {
  const named = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?(?:\s*[-–]\s*(?:[a-z]{3,9}\.?\s+)?\d{1,2}(?:st|nd|rd|th)?\b)?/i.exec(text);
  const numeric = /(?<![\d.])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?:\s*[-–]\s*\d{1,2}(?:\/\d{1,2})?(?:\/\d{2,4})?)?(?![\d.])/.exec(text);
  const pick = named !== null && (numeric === null || named.index <= numeric.index) ? named : numeric;
  if (pick === null) return { date: null, rest: text };
  let month: number;
  const day = Number(pick[2]);
  if (pick === named) month = MONTH[pick[1]!.toLowerCase()]!;
  else month = Number(pick[1]);
  const year = pick[3] !== undefined ? fullYear(pick[3]) : inferYear(month, day, today);
  const date = iso(year, month, day);
  if (date === null) return { date: null, rest: text };
  return { date, rest: text.slice(0, pick.index) + " " + text.slice(pick.index + pick[0].length) };
}

/** "Ch 15-17", "Ch. 16, 18", "Chapters 15 & 16", "Sec 15.2": every chapter number named, and the line without them. */
function takeChapters(text: string): { readonly chapters: number[]; readonly rest: string } {
  const chapters: number[] = [];
  const rest = text.replace(/\b(?:ch|chs|chap|chapters?|sec|sections?|§)\.?\s*(\d{1,2}(?:\.\d{1,2})?(?:\s*(?:[-–,&]|and|to)\s*\d{1,2}(?:\.\d{1,2})?)*)/gi, (_all, list: string) => {
    for (const part of list.split(/\s*(?:,|&|and)\s*/i)) {
      const range = /^(\d{1,2})(?:\.\d+)?\s*(?:[-–]|to)\s*(\d{1,2})(?:\.\d+)?$/.exec(part.trim());
      if (range !== null) {
        const from = Number(range[1]);
        const to = Number(range[2]);
        for (let n = from; n <= to && n - from < 10; n += 1) chapters.push(n);
      } else {
        const one = /^(\d{1,2})/.exec(part.trim());
        if (one !== null) chapters.push(Number(one[1]));
      }
    }
    return " ";
  });
  return { chapters: [...new Set(chapters)], rest };
}

/** Splits what is left into topic phrases and drops filler. */
function topicsOf(text: string): string[] {
  return (
    text
      // "1,2- vs 1,4-addition" keeps its commas: they are inside a name, not between topics.
      .replace(/(\d),(\d)/g, "$1\u0001$2")
      .replace(/\bvs\./gi, "vs")
      .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)|\b\d{1,2}:\d{2}\b/gi, " ")
      .replace(/\((?:cont(?:inued|'d|d)?\.?)\)/gi, " ")
      .replace(/[()[\]{}]/g, ",")
      .replace(/\bpp?\.\s*\d+(?:\s*[-–]\s*\d+)?/gi, " ")
      .replace(/\b(?:read(?:ing)?|hw|homework|problem set|ps)\s*\d*\s*(?:due)?\s*:?/gi, ",")
      .split(/\s*(?:[,;|/]|\s&\s|\band\b|\s[-–\u2014]\s|:|\.\s|\s\+\s)\s*/i)
      .map((part) => part.replace(/\u0001/g, ",").replace(/^[\s\-–*.'"]+|[\s\-–*.,'"]+$/g, "").replace(/\s+/g, " "))
      .filter((part) => /[a-z]{2}/i.test(part) && !FILLER.test(part) && !/^\d+$/.test(part))
  );
}

function isHeader(text: string): boolean {
  const words = text.toLowerCase().split(/[^a-z#]+/).filter(Boolean);
  return words.length >= 2 && words.every((word) => HEADER_WORDS.has(word));
}

const WEEKDAY = /\b(?:mon(?:day)?|tues?(?:day)?|wed(?:nesday)?|thu(?:rs?)?(?:day)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|mwf|tth|tr)\b\.?/gi;
const BULLET = /^\s*(?:[-*•·◦▪●>]+|\(?[a-z]\)|\d{1,2}[.)](?![\d/]))\s+/i;
const EXAM = /\b((?:hour\s+)?(?:mid-?term(?:\s+exam)?|exam)(?:\s*#?\s*\d{1,2})?|test\s*#?\s*\d{1,2}|final(?:\s+exam)?)\b/i;

/** Reads every line of a pasted syllabus. Blank lines are dropped; every other line comes back, skipped or not. */
export function parseSyllabus(text: string, today: Date = new Date()): SyllabusLine[] {
  const out: SyllabusLine[] = [];
  let carryWeek: number | null = null;
  let lastWeek = 0;
  // A bare number in a table's first column is the week only when the header said so.
  let tableHasWeek = false;
  for (const original of text.split(/\r?\n/)) {
    const raw = original.trim();
    if (raw === "") continue;
    const skip = (): void => {
      out.push({ raw, kind: "skip", week: carryWeek, date: null, topics: [], chapters: [], title: null });
    };
    // Table cells become commas, so "3  9/8  Aromaticity" splits like "3, 9/8, Aromaticity".
    let line = raw.replace(BULLET, "").replace(/\t+| {3,}|\s*\|\s*/g, " , ");
    if (isHeader(line)) {
      if (/\b(?:week|wk)\b/i.test(line)) tableHasWeek = true;
      skip();
      continue;
    }

    let week: number | null = null;
    const weekWord = /\b(?:week|wk)\.?\s*#?\s*(\d{1,2})\b|^\s*w(\d{1,2})\b/i.exec(line);
    if (weekWord !== null) {
      week = Number(weekWord[1] ?? weekWord[2]);
      line = line.slice(0, weekWord.index) + " " + line.slice(weekWord.index + weekWord[0].length);
    }
    const weekOf = /\bweek\s+of\b/i.exec(line);
    if (weekOf !== null) {
      line = line.replace(weekOf[0], " ");
      if (week === null) week = lastWeek + 1;
    }
    // A table's first cell can be the bare week number: "3 , 9/8 , Aromaticity".
    // Under a header with no week column it is a lecture number, and goes.
    const leadNumber = /^\s*(\d{1,2})\s+,/.exec(line);
    if (leadNumber !== null) {
      if (week === null && tableHasWeek) week = Number(leadNumber[1]);
      line = line.slice(leadNumber[0].length);
    }
    line = line.replace(/\b(?:lecture|lec|class|day|session)\s*#?\s*\d{1,3}\b\.?/gi, " ");

    const found = takeDate(line, today);
    const date = found.date;
    line = found.rest.replace(WEEKDAY, " ");
    // A second date on the line (a range across months, a table's end column) is not a topic.
    // On an exam line it is the exam's own day: "Week of Feb 2   Midterm 1 - Feb 6".
    const second = takeDate(line, today);
    line = second.rest;

    // Policy text is skipped, unless it is a dated exam line ("Final Exam, Room 1201, Dec 14").
    if (NOISE.test(line) && !(EXAM.test(line) && (date !== null || week !== null))) {
      if (week !== null) carryWeek = week;
      skip();
      continue;
    }
    if (week !== null) {
      carryWeek = week;
      lastWeek = Math.max(lastWeek, week);
    }
    const lineWeek = week ?? carryWeek;

    if (HOLIDAY.test(line)) {
      out.push({ raw, kind: "holiday", week: lineWeek, date, topics: [], chapters: [], title: null });
      continue;
    }

    const { chapters, rest } = takeChapters(line);
    const exam = EXAM.exec(rest);
    if (exam !== null && !/\bfinal\s+(?:grade|project|paper)/i.test(rest)) {
      const title = exam[1]!.replace(/\s+/g, " ").replace(/#\s*/, "").trim();
      const nice = title.charAt(0).toUpperCase() + title.slice(1);
      const after = rest.slice(0, exam.index) + " " + rest.slice(exam.index + exam[0].length);
      const topics = topicsOf(after.replace(/\b(?:exam|cumulative|in class|covers?|covering|material)\b/gi, " "));
      out.push({ raw, kind: "exam", week: lineWeek, date: second.date !== null && (date === null || second.date >= date) ? second.date : date, topics, chapters, title: /^final$/i.test(nice) ? "Final Exam" : nice });
      continue;
    }

    const topics = topicsOf(rest);
    // "Ch 18" with no topic words is kept, so the student is asked to map it by hand.
    if (topics.length === 0 && chapters.length === 0) {
      skip();
      continue;
    }
    out.push({ raw, kind: "topic", week: lineWeek, date, topics, chapters, title: null });
  }
  return out;
}
