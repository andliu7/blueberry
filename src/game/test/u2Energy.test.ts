/**
 * The energy diagrams and Keq lesson (u2-energy): wired into the map, plays meet then graded
 * questions, every answer is derived from the model or the course pKa table, and every question
 * is drawn.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EnergyLab, { BuildStep, ColdOrWarm, WalkPath } from "../energy/EnergyLab";
import { KeqTypedQuestion } from "../energy/KeqTypedQuestion";
import { EnergyVisualCard } from "../energy/EnergyVisualCard";
import { PATHWAY_UNITS } from "../demo/pathwayMap";
import { U2E_BUTADIENE, U2E_CASE_IDS, U2E_ENOLATE, U2E_NODE, U2E_POOLS, caseInfo, energyVisualFor } from "../content/u2energy";
import { lessonPool } from "../beats/practice/pools";
import { lessonMeetBeats, lessonPoolItems, lessonRecogniseBeats, planLesson } from "../beats/template";
import { startMcqSession, levelNow } from "../beats/mcq/session";
import { U23_EXPLAINERS } from "../content/u23/lessonPath";
import { SCENARIOS, checkExponent, checkSciKeq, keqFromPkas, log10KeqFromPkas, parseExponent, parseMantissa, profileIsValid, sciParts } from "../energy/energyModel";

const entries = U2E_POOLS[U2E_NODE] ?? [];

describe("the u2-energy lesson", () => {
  it("sits right after pKa on the Unit 2 path and plays a lesson", () => {
    const ids = PATHWAY_UNITS.find((u) => u.id === "u2")!.nodes.map((n) => n.id);
    expect(ids.indexOf("u2-energy")).toBe(ids.indexOf("u2-keq-pka") + 1);
    expect(planLesson("u2-energy")?.steps.map((s) => s.beat.kind)).toEqual(["meet", "mcq", "poolKeq"]);
  });

  it("opens on meet questions, plays every item once and grades two or more at rung 2 last", () => {
    const meet = lessonMeetBeats("u2-energy").map((b) => b.id);
    const session = startMcqSession(lessonRecogniseBeats("u2-energy"), "declared");
    const graded = session.beats.map((b) => b.id);
    expect(meet.length).toBe(3);
    expect([...meet, ...graded].sort()).toEqual(entries.filter((e) => e.item.kind === "mcq").map((e) => e.id).sort());
    const rungs = session.beats.map((_, index) => levelNow({ ...session, index }));
    expect(rungs.filter((r) => r === 2).length).toBeGreaterThanOrEqual(2);
    expect([...rungs].sort()).toEqual(rungs);
    expect(lessonPool("u2-energy").length).toBe(entries.length);
  });

  it("draws every question as an energy diagram with valid profiles", () => {
    for (const e of entries) {
      const v = energyVisualFor(e.id);
      expect(v, e.id).not.toBeNull();
      for (const p of v!.profiles) expect(profileIsValid(p), e.id).toBe(true);
    }
  });

  it("keeps every entry a draft with a provenance, three options, one correct", () => {
    for (const e of entries) {
      expect(e.placeholder).toBe(true);
      expect(e.provenance.length).toBeGreaterThan(10);
      if (e.item.kind === "keqTyped") continue; // typed: no options by design
      if (e.item.kind !== "mcq") throw new Error("mcq only");
      const b = e.item.beat;
      expect(b.options).toHaveLength(3);
      expect(new Set(b.options.map((o) => o.text)).size, e.id).toBe(3);
      expect(b.options.filter((o) => o.id === b.correctOptionId)).toHaveLength(1);
    }
  });

  it("types the pKa to Keq calculations: no option tiles, answers match the table", () => {
    const calc = entries.filter((e) => e.id.startsWith("u2e-calc-"));
    expect(calc.length).toBeGreaterThanOrEqual(5);
    for (const e of calc) {
      expect(e.item.kind, e.id).toBe("keqTyped");
      if (e.item.kind !== "keqTyped") continue;
      const c = caseInfo(e.id.replace("u2e-calc-", ""));
      expect(e.item.question.gap, e.id).toBe(c.gap);
      expect(e.item.question.gap).toBeCloseTo(log10KeqFromPkas(c.formedPka, c.usedPka), 5);
      expect(checkSciKeq(parseMantissa(String(sciParts(keqFromPkas(c.formedPka, c.usedPka)).mantissa)), sciParts(keqFromPkas(c.formedPka, c.usedPka)).exponent, c.gap), e.id).toBe("right");
    }
  });

  it("plays the typed items as a graded lesson step, in the produce slot", () => {
    const step = planLesson("u2-energy")!.steps.at(-1)!;
    expect(step.beat.kind).toBe("poolKeq");
    expect(step.slot).toBe("produce");
    expect(lessonPoolItems("u2-energy", "keqTyped").length).toBeGreaterThanOrEqual(5);
  });

  it("marks the typed question one part at a time, and a tile cannot be picked", () => {
    const e = entries.find((x) => x.id === "u2e-calc-acetic-hydroxide")!;
    if (e.item.kind !== "keqTyped") throw new Error("typed");
    const html = renderToStaticMarkup(createElement(KeqTypedQuestion, { question: e.item.question }));
    expect(html).toContain("Part 1");
    expect(html).not.toContain("Part 2");
    expect(html).toContain("Use your own calculator");
    expect(html).not.toMatch(/NaN|undefined|aria-pressed/);
    expect(html).toContain("<svg");
  });

  it("has a read-along that opens on why, ends on the lab, and points at real scenarios", () => {
    const ex = U23_EXPLAINERS["u2-energy"]!;
    expect(ex.cards[0]!.heading).toMatch(/why/i);
    expect(ex.cards.at(-1)!.lab).toBe(true);
    for (const c of ex.cards) if (c.energy !== undefined) expect(SCENARIOS.map((s) => s.id)).toContain(c.energy);
  });
});

describe("the energy views render", () => {
  it("draws the lab with its sliders, verdict and scenario buttons", () => {
    const lab = renderToStaticMarkup(createElement(EnergyLab));
    expect(lab).toContain("Build a step");
    expect(lab).toContain("Cold or warm");
    const html = renderToStaticMarkup(createElement(BuildStep));
    expect(html).toContain('type="range"');
    expect(html).toContain("Runs both ways");
    expect(html).not.toMatch(/NaN|undefined/);
    expect(renderToStaticMarkup(createElement(WalkPath))).not.toMatch(/NaN|undefined/);
    const temp = renderToStaticMarkup(createElement(ColdOrWarm));
    expect(temp).toContain("Kinetic control");
    expect(temp).toContain("1,3-butadiene");
  });

  it("draws an energy question as an svg and nothing for a structure question", () => {
    expect(renderToStaticMarkup(createElement(EnergyVisualCard, { beatId: "u2e-meet-window" }))).toContain("<svg");
    expect(renderToStaticMarkup(createElement(EnergyVisualCard, { beatId: "u2t-keq-meet-gap" }))).toBe("");
  });

  it("ties every question to a drawn real reaction or a read-the-diagram figure", () => {
    const drawn = entries.filter((e) => energyVisualFor(e.id)?.reaction !== undefined);
    const abstract = entries.filter((e) => energyVisualFor(e.id)?.reaction === undefined).map((e) => e.id);
    expect(drawn.length).toBeGreaterThanOrEqual(entries.length - 2);
    expect(abstract.sort()).toEqual(["u2e-first-door", "u2e-side-deadend"]);
    for (const e of drawn) {
      for (const item of energyVisualFor(e.id)!.reaction!) {
        if (typeof item === "string") continue;
        expect((item.figure.bonds?.length ?? 0) + (item.figure.labels?.length ?? 0), `${e.id} ${item.name}`).toBeGreaterThan(0);
      }
    }
  });

  it("states the acid, the base and the acid formed in every pKa to Keq question", () => {
    const calc = entries.filter((e) => e.id.startsWith("u2e-calc-"));
    for (const e of calc) {
      if (e.item.kind !== "keqTyped") continue;
      const c = caseInfo(e.id.replace("u2e-calc-", ""));
      const html = renderToStaticMarkup(createElement(KeqTypedQuestion, { question: e.item.question })).toLowerCase();
      expect(html, e.id).toContain(c.acid.name);
      expect(html, e.id).toContain(c.conjAcid.name);
      expect(html, e.id).toContain(`pka ${c.usedPka}`);
      expect(html, e.id).toContain(`pka ${c.formedPka}`);
    }
  });

  it("has questions that make the student read the diagram: numbers drawn, not stated", () => {
    for (const id of ["u2e-read-dg", "u2e-read-barrier", "u2e-read-reverse", "u2e-read-keq"]) {
      const v = energyVisualFor(id);
      expect(v?.tsNumbers, id).toBe(true);
      const e = entries.find((x) => x.id === id)!;
      if (e.item.kind !== "mcq") throw new Error("mcq");
      expect(e.item.beat.prompt, id).not.toMatch(/\d+ kcal/);
    }
  });

  it("teaches kinetic versus thermodynamic control on butadiene and on enolates, from counted structures", () => {
    expect(U2E_BUTADIENE.alkeneSubstituents.thermo).toBeGreaterThan(U2E_BUTADIENE.alkeneSubstituents.kinetic);
    expect(U2E_ENOLATE.alkeneSubstituents.thermo).toBeGreaterThan(U2E_ENOLATE.alkeneSubstituents.kinetic);
    for (const id of ["u2e-kinetic-cold", "u2e-thermo-warm", "u2e-bd-which", "u2e-enolate-lda", "u2e-enolate-ethoxide"]) {
      expect(entries.some((e) => e.id === id), id).toBe(true);
      expect(energyVisualFor(id)?.reaction, id).toBeDefined();
    }
  });

  it("marks a typed exponent: right, flipped, or wrong", () => {
    const c = caseInfo("acetic-hydroxide");
    expect(c.gap).toBeCloseTo(10.7, 5);
    expect(log10KeqFromPkas(c.formedPka, c.usedPka)).toBeCloseTo(10.7, 5);
    expect(checkExponent(parseExponent("10.7"), c.gap)).toBe("right");
    expect(checkExponent(parseExponent("−10.7"), c.gap)).toBe("flipped");
    expect(checkExponent(parseExponent("11"), c.gap)).toBe("wrong");
    expect(checkExponent(parseExponent("abc"), c.gap)).toBe("wrong");
    expect(checkExponent(0.1, caseInfo("ethanol-hydroxide").gap)).toBe("wrong");
    expect(U2E_CASE_IDS.length).toBeGreaterThanOrEqual(8);
  });

  it("renders the lab with a real reaction by default", () => {
    const html = renderToStaticMarkup(createElement(EnergyLab));
    expect(html).toContain("Real reactions");
    expect(html).toContain("Use your own calculator");
    expect(html).toContain("Acetic acid");
  });
});
