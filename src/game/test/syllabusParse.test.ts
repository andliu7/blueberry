/**
 * The syllabus parser (STATUS C1) on six messy, hand-written syllabus pastes
 * (test/fixtures/syllabus, invented, no real student data): a PDF table, a
 * bulleted week list, a date-led MWF lecture list, a spring term crossing New
 * Year, one buried in policy text with a doubled header, and a terse list.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSyllabus, type SyllabusLine } from "../syllabus/syllabusParse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/syllabus/${name}`, import.meta.url), "utf8");
const FALL = new Date(2026, 7, 20, 12); // pasted 20 Aug 2026
const WINTER = new Date(2026, 11, 1, 12); // pasted 1 Dec 2026, for a spring term

const kept = (lines: readonly SyllabusLine[]) => lines.filter((line) => line.kind !== "skip");
const brief = (line: SyllabusLine) => [line.kind, line.week, line.date, line.title, line.topics.join(" | ")];

describe("parseSyllabus", () => {
  it("reads a table copied out of a PDF, with tabs, a repeated header and a dated final", () => {
    const lines = kept(parseSyllabus(fixture("pdf-table.txt"), FALL));
    expect(lines.map(brief)).toEqual([
      ["topic", 1, "2026-08-26", null, "Conjugated dienes | allylic cations"],
      ["topic", 2, "2026-09-02", null, "Diels-Alder reaction | MO theory"],
      ["topic", 3, "2026-09-09", null, "Aromaticity | Huckel rule"],
      ["topic", 4, "2026-09-16", null, "Electrophilic aromatic substitution"],
      ["topic", 5, "2026-09-23", null, "Friedel-Crafts | directing effects"],
      ["exam", 6, "2026-09-30", "Exam 1", ""],
      ["topic", 7, "2026-10-07", null, "Nucleophilic aromatic substitution | benzyne"],
      ["holiday", 8, "2026-10-14", null, ""],
      ["topic", 9, "2026-10-21", null, "Alcohols | ethers | epoxides"],
      ["topic", 10, "2026-10-28", null, "Aldehydes | ketones"],
      ["exam", 11, "2026-11-04", "Exam 2", ""],
      ["topic", 12, "2026-11-11", null, "Carboxylic acids | derivatives"],
      ["topic", 13, "2026-11-18", null, "Enolates | aldol | Claisen"],
      ["holiday", 14, "2026-11-25", null, ""],
      ["topic", 15, "2026-12-02", null, "Amines | Hofmann elimination"],
      ["exam", 15, "2026-12-14", "Final Exam", ""],
    ]);
    expect(lines[5]!.chapters).toEqual([14, 15, 16]);
    expect(lines[8]!.chapters).toEqual([17, 18]);
  });

  it("carries a week header down a bulleted list and keeps 1,2- vs 1,4- in one piece", () => {
    const lines = kept(parseSyllabus(fixture("bulleted-weeks.txt"), FALL));
    expect(lines.map((line) => [line.kind, line.week, line.topics.length])).toEqual([
      ["topic", 1, 2],
      ["topic", 1, 2],
      ["topic", 2, 2],
      ["topic", 3, 3],
      ["topic", 3, 3],
      ["topic", 4, 4],
      ["topic", 4, 2],
      ["exam", 5, 0],
      ["topic", 6, 2],
      ["topic", 7, 3],
      ["topic", 8, 2],
    ]);
    expect(lines[1]!.topics).toEqual(["Kinetic vs thermodynamic control", "1,2- vs 1,4-addition"]);
    expect(lines[3]!.topics).toEqual(["Aromaticity", "Hückel's rule", "annulenes"]);
    expect(lines.every((line) => line.date === null)).toBe(true);
  });

  it("reads a date-led MWF lecture list: lecture numbers are not weeks, MLK Day is a holiday", () => {
    const lines = kept(parseSyllabus(fixture("mwf-lectures.txt"), WINTER));
    expect(lines.map(brief)).toEqual([
      ["topic", null, "2027-01-12", null, "Course intro | conjugated dienes"],
      ["topic", null, "2027-01-14", null, "Allylic halogenation | NBS"],
      ["topic", null, "2027-01-16", null, "Diels-Alder"],
      ["holiday", null, "2027-01-19", null, ""],
      ["topic", null, "2027-01-21", null, "Aromaticity"],
      ["topic", null, "2027-01-23", null, "Aromatic heterocycles"],
      ["topic", null, "2027-01-26", null, "EAS mechanism"],
      ["topic", null, "2027-01-28", null, "Directing groups"],
      ["topic", null, "2027-01-30", null, "Friedel-Crafts acylation"],
      ["exam", null, "2027-02-02", "Hour Exam 1", ""],
      ["topic", null, "2027-02-04", null, "Alcohols | oxidation | PCC | Jones"],
      ["topic", null, "2027-02-06", null, "Epoxide ring opening"],
    ]);
  });

  it("rolls a spring term across New Year and takes the exam's own day over its week's", () => {
    const lines = kept(parseSyllabus(fixture("spring-new-year.txt"), WINTER));
    expect(lines.map(brief)).toEqual([
      ["holiday", 1, "2026-12-29", null, ""],
      ["topic", 2, "2027-01-05", null, "Spectroscopy | IR | 1H NMR"],
      ["topic", 3, "2027-01-12", null, "13C NMR | DEPT | mass spectrometry"],
      ["topic", 4, "2027-01-19", null, "Aldehydes | ketones | nucleophilic addition"],
      ["topic", 5, "2027-01-26", null, "Acetals | imines | enamines"],
      ["exam", 6, "2027-02-06", "Midterm Exam 1", ""],
      ["topic", 7, "2027-02-09", null, "Carboxylic acid derivatives | Fischer esterification"],
    ]);
  });

  it("skips policy text and a doubled header, keeps a chapter-only line, and never reads an earlier date as the exam day", () => {
    const all = parseSyllabus(fixture("messy-policy.txt"), FALL);
    const lines = kept(all);
    // Instructor, office hours, grading, late work, integrity, both headers: all skipped.
    expect(all.filter((line) => line.kind === "skip")).toHaveLength(8);
    expect(lines.map(brief)).toEqual([
      ["topic", 1, "2026-09-02", null, "Conjugation | resonance"],
      ["topic", 2, "2026-09-09", null, "Aromaticity | benzene"],
      ["topic", 3, "2026-09-16", null, "Electrophilic aromatic substitution | EAS"],
      ["topic", 4, "2026-09-23", null, "Wolff-Kishner | Clemmensen"],
      ["exam", 5, "2026-09-30", "Exam 1", ""],
      ["topic", 6, "2026-10-07", null, ""],
      ["topic", 7, "2026-10-14", null, "Phenols | Claisen rearrangement"],
      ["topic", 8, "2026-10-21", null, "Gabriel synthesis | Hofmann rearrangement | reductive amination"],
      ["topic", 9, "2026-10-28", null, "Photosynthesis in plants"],
      ["exam", 10, "2026-11-04", "Exam 2", ""],
    ]);
    expect(lines[4]!.chapters).toEqual([15, 16, 17]);
    expect(lines[5]!.chapters).toEqual([18]);
  });

  it("reads a terse list with no weeks or dates, slash-separated topics included", () => {
    const lines = kept(parseSyllabus(fixture("terse.txt"), FALL));
    expect(lines.map(brief)).toEqual([
      ["topic", null, null, null, "dienes"],
      ["topic", null, null, null, "EAS"],
      ["topic", null, null, null, "Huckel"],
      ["topic", null, null, null, "benzyne"],
      ["exam", null, null, "Exam 2", ""],
      ["topic", null, null, null, "aldol | Claisen"],
      ["topic", null, null, null, "amines"],
    ]);
  });

  it("reads month names, ranges and two-digit years", () => {
    const [a, b, c] = parseSyllabus("Sept. 8th - 10th  Aromaticity\n10/14/26  Exam 2\nDecember 3, 2026: Amines", FALL);
    expect([a!.date, a!.topics]).toEqual(["2026-09-08", ["Aromaticity"]]);
    expect([b!.kind, b!.date, b!.title]).toEqual(["exam", "2026-10-14", "Exam 2"]);
    expect([c!.date, c!.topics]).toEqual(["2026-12-03", ["Amines"]]);
  });
});
