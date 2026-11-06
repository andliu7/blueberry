/**
 * "Say why" first when a mistake comes back (beats/sayWhy.ts, Unit 1 review
 * suggestion 3). The reason step is built from content that already exists,
 * plays at level 0 so it cannot fail, and never changes the question it
 * stands in front of.
 *
 * CHANGED 4 Nov (checker, seventh pass): say-why is opt-in. A rule step
 * exists only for an item in SAY_WHY_STEPS (content/u1/sayWhyMixups.ts), and
 * its wrong options are exactly the mix-ups listed for it there. The tests
 * that held the old automatic pick (lesson lists, rule tags, word cues) are
 * gone with it; the per-item checks over every Unit 1 item stay.
 * CHANGED 5 Nov (checker, eighth pass): the steps the checker found still
 * failing a criterion are off the allowlist, and pinned below.
 */
import { describe, expect, it } from "vitest";
import { U1_POOLS } from "../content/u1";
import { SAY_WHY_PAIRS, canonical, givesAway, isSayWhyId, normalizeReason, promptOf, reasonOf, sayWhyBeatFor, sayWhyTarget, withSayWhy } from "../beats/sayWhy";
import { mcqOptionTiles, mcqVisualFor } from "../beats/mcq/mcqFigures";
import { SAY_WHY_MIXUPS, SAY_WHY_STEPS } from "../content/u1/sayWhyMixups";
import { canFail, declaredLevel } from "../beats/types";

const ALL = Object.values(U1_POOLS).flat();
const byId = new Map(ALL.map((entry) => [entry.id, entry]));
const nodeOf = (entry: (typeof ALL)[number]) => (entry.item.kind === "mcq" || entry.item.kind === "draw" ? entry.item.beat.node : "");
const mixupByText = (text: string) => Object.entries(SAY_WHY_MIXUPS).find(([, one]) => one.text === text);

describe("say why first", () => {
  it("pairs each missed question with a real Unit 1 reason MCQ", () => {
    for (const [missed, reason] of Object.entries(SAY_WHY_PAIRS)) {
      expect(byId.get(missed), missed).toBeDefined();
      expect(byId.get(reason)?.item.kind, reason).toBe("mcq");
    }
  });

  it("asks the paired reason under a why: id, at level 0, with its drawing and tiles", () => {
    const missed = byId.get("u1-x2-pick-14")!;
    const why = sayWhyBeatFor(missed, U1_POOLS["u1-x2"] ?? [], ALL)!;
    expect(why.id).toBe("why:u1-x2-why-14");
    expect(isSayWhyId(why.id)).toBe(true);
    expect(sayWhyTarget(why.id)).toBe("u1-x2-why-14");
    expect(canFail(declaredLevel(why.levels))).toBe(false);
    expect(mcqVisualFor(why.id)).toEqual(mcqVisualFor("u1-x2-why-14"));
  });

  it("otherwise asks for the reason against its two listed mix-ups, with no tiles", () => {
    const pool = U1_POOLS["u1-x2"] ?? [];
    const missed = pool.find((entry) => entry.id === "u1-x2-isoprene-warm")!;
    const why = sayWhyBeatFor(missed, pool, ALL)!;
    expect(why.id).toBe("whyrule:u1-x2-isoprene-warm");
    expect(why.options).toHaveLength(3);
    expect(why.options.find((o) => o.id === why.correctOptionId)!.text).toBe(SAY_WHY_STEPS["u1-x2-isoprene-warm"]!.reason ?? reasonOf(missed.explanation));
    expect(new Set(why.options.map((o) => o.text)).size).toBe(3);
    expect(mcqOptionTiles(why.id, why.options.map((o) => o.id))).toBeNull();
    expect(canFail(declaredLevel(why.levels))).toBe(false);
  });

  it("moves the right rule between first, middle and last, since options are never shuffled", () => {
    const places = new Set<number>();
    for (const entries of Object.values(U1_POOLS)) {
      for (const entry of entries) {
        const why = sayWhyBeatFor(entry, entries, ALL);
        if (why !== null && why.id.startsWith("whyrule:")) places.add(why.options.findIndex((o) => o.id === why.correctOptionId));
      }
    }
    expect([...places].sort()).toEqual([0, 1, 2]);
  });

  // Every Unit 1 pool item through the builder.
  describe("on every Unit 1 item", () => {
    const all = Object.entries(U1_POOLS).flatMap(([node, entries]) =>
      entries.flatMap((entry) => {
        const why = sayWhyBeatFor(entry, entries, ALL);
        return why === null ? [] : [{ node: nodeOf(entry) || node, entry, why }];
      }),
    );
    type Step = (typeof all)[number]["why"];
    const right = (why: Step) => why.options.find((o) => o.id === why.correctOptionId)!;
    const wrongs = (why: Step) => why.options.filter((o) => o.id !== why.correctOptionId);
    const ruleSteps = all.filter(({ why }) => why.id.startsWith("whyrule:"));

    // ADDED 4 Nov (checker, seventh pass): THE ALLOWLIST. A step with an option outside its entry fails here.
    it("offers on every rule step only mix-ups its allowlist entry names, and builds every entry", () => {
      for (const { entry, why } of ruleSteps) {
        const step = SAY_WHY_STEPS[entry.id];
        expect(step, `${entry.id} has a rule step but no allowlist entry`).toBeDefined();
        const allowed = new Set(step!.mixups.map((id) => SAY_WHY_MIXUPS[id]?.text));
        expect(wrongs(why), entry.id).toHaveLength(2);
        for (const option of wrongs(why)) {
          expect(allowed.has(option.text), `${entry.id}: "${option.text}" is not on its allowlist`).toBe(true);
          expect(option.why, entry.id).toBe(`A common mix-up. ${mixupByText(option.text)![1].fix} This question turns on: ${right(why).text}`);
        }
      }
      for (const [id, step] of Object.entries(SAY_WHY_STEPS)) {
        expect(byId.get(id), `${id} is not a Unit 1 item`).toBeDefined();
        expect(SAY_WHY_PAIRS[id], `${id} is paired and listed`).toBeUndefined();
        expect(step.mixups.length, id).toBeGreaterThanOrEqual(2);
        expect(step.mixups.length, id).toBeLessThanOrEqual(3);
        expect(new Set(step.mixups).size, id).toBe(step.mixups.length);
        for (const mixup of step.mixups) expect(SAY_WHY_MIXUPS[mixup], `${id}: ${mixup}`).toBeDefined();
        expect(ruleSteps.some(({ entry }) => entry.id === id), `${id} is listed but builds no step`).toBe(true);
      }
      // Coverage may shrink; quality may not. Still enough steps across the unit to matter.
      expect(ruleSteps.length).toBeGreaterThanOrEqual(29);
    });

    it("gives every listed mix-up a correction, and no template text", () => {
      for (const [id, one] of Object.entries(SAY_WHY_MIXUPS)) {
        expect(one.fix.length, id).toBeGreaterThan(20);
        expect(one.text, id).not.toMatch(/\bX\b|\bY\b|—/);
        expect(one.text.length, id).toBeLessThanOrEqual(100);
        expect(Object.values(SAY_WHY_STEPS).some((step) => step.mixups.includes(id)), `${id} is listed for no item`).toBe(true);
      }
    });

    it("never shows stages A to C a Diels-Alder idea, and never ortho, meta or para", () => {
      const LATER = /HOMO|LUMO|endo|exo|dienophile|δ|Diels|s-cis|s-trans|on the ring|ψ/i;
      for (const { node, entry, why } of ruleSteps) {
        for (const option of wrongs(why)) {
          expect(option.text, entry.id).not.toMatch(/ortho|meta\b|para\b/i);
          if (/^u1-(rank-|quiz-a|12v14|kvt|energy|hx|x2|quiz-b|nbs|quiz-c)/.test(node)) {
            expect(`${option.text} ${option.why}`, `${entry.id}: ${option.text}`).not.toMatch(LATER);
          }
        }
      }
    });

    // Owner, 3 Nov: "no clear winner" and "too close to call" are never an answer, the say-why one included.
    it("never offers 'no clear winner' or 'too close to call' as an option", () => {
      for (const { entry, why } of all) {
        for (const option of why.options) expect(option.text, entry.id).not.toMatch(/no clear winner|too close to call|cannot be called/i);
      }
    });

    // Criterion 2: about the reaction on screen. No H+ on a halogen question, no halogen on an HX one.
    it("keeps the wrong options on the question's own reaction", () => {
      const tested = { hx: 0, x2: 0 };
      for (const { entry, why } of ruleSteps) {
        const text = `${promptOf(entry)} ${entry.explanation}`;
        const halogen = /\b(Br2|Cl2|X2)\b|dihal|dibrom|dichlor/i.test(text);
        const hx = /\b(HBr|HCl|HX)\b/.test(text);
        for (const option of wrongs(why)) {
          if (halogen && !hx) expect(option.text, `${entry.id}: ${option.text}`).not.toMatch(/H\+|proton/i);
          if (hx && !halogen) expect(option.text, `${entry.id}: ${option.text}`).not.toMatch(/Br2|Cl2|X2|halonium|bromonium|halogen atom/i);
        }
        if (halogen && !hx) tested.x2 += 1;
        if (hx && !halogen) tested.hx += 1;
      }
      expect(tested.hx).toBeGreaterThanOrEqual(4);
      expect(tested.x2).toBeGreaterThanOrEqual(4);
    });

    /** Ideas a reason can weigh, in the test's own words, so a negation in other wording still shows. */
    const IDEAS: Readonly<Record<string, RegExp>> = {
      resonance: /resonan|shared? (with|by|over)|delocal|spreads? the charge/i,
      substitution: /substitut|alkyl|carbon neighbours|carbons (bonded|on)|\b[123]° (alkyl|radical|cation|anion)|tertiary|secondary/i,
      speed: /hump|faster|\brate\b|barrier|kinetic/i,
      stability: /\bwells?\b|stable|thermodynamic|deeper/i,
      temperature: /\bcold\b|\bwarm/i,
      reversal: /revers|climb back|re-sort|locked in|turn into each other/i,
      sCharacter: /s character|\bsp[23]?\b/i,
      face: /\bfaces?\b|rotate|\bcis\b|\btrans\b/i,
    };
    const ideasOf = (text: string) => new Set(Object.entries(IDEAS).filter(([, re]) => re.test(text)).map(([name]) => name));
    const words = (text: string) => new Set(normalizeReason(text).split(" ").filter((w) => w.length > 3));
    const overlap = (a: string, b: string) => {
      const x = words(a);
      const y = words(b);
      return [...x].filter((w) => y.has(w)).length / Math.max(1, Math.min(x.size, y.size));
    };

    // Criterion 3: not the right reason negated or restated, and the correction does not restate it either.
    it("never offers the right reason restated, in a mix-up or in its correction", () => {
      for (const { entry, why } of ruleSteps) {
        const reason = right(why).text;
        const reasonIdeas = ideasOf(reason);
        for (const option of wrongs(why)) {
          const fix = mixupByText(option.text)![1].fix;
          for (const [what, text] of [["mix-up", option.text], ["correction", fix]] as const) {
            expect(normalizeReason(text), `${entry.id}: ${what}`).not.toBe(normalizeReason(reason));
            expect(normalizeReason(text).includes(normalizeReason(reason)), `${entry.id}: the ${what} contains the reason`).toBe(false);
            expect(overlap(text, reason), `${entry.id}: the ${what} "${text}" shares most of its words with "${reason}"`).toBeLessThan(0.6);
          }
          // A reason that weighs two ideas (resonance against substitution, hump against well) never stands
          // beside a mix-up that weighs the same ones, whichever way round it puts them.
          if (reasonIdeas.size >= 2) {
            const optionIdeas = ideasOf(option.text);
            expect([...reasonIdeas].every((idea) => optionIdeas.has(idea)), `${entry.id}: "${option.text}" weighs the same ideas as "${reason}"`).toBe(false);
          }
        }
      }
    });

    // The step stands in front of the retry, so nothing in it names the retry's answer.
    it("never gives away the retry's answer, in the options or in any feedback", () => {
      for (const { entry, why } of ruleSteps) {
        const reason = right(why).text;
        expect(givesAway(entry, reason), `${entry.id}: ${reason}`).toBe(false);
        expect(right(why).why, entry.id).toBe(`Right. ${reason}`);
        for (const option of wrongs(why)) {
          const fix = mixupByText(option.text)![1].fix;
          expect(givesAway(entry, option.text, true), `${entry.id}: ${option.text}`).toBe(false);
          expect(givesAway(entry, fix, true), `${entry.id}: ${fix}`).toBe(false);
        }
      }
    });

    /**
     * Outcomes a reason must never state, whatever the item: a product type, a ring relation, an order, a
     * "these are not equal" that rules an option out, or a temperature shortcut ("warm gives 1,4").
     */
    const OUTCOME = /(?<!1,2 and )\b1,[24] (product|dihalide|dibromide|dichloride)|end up (cis|trans)|(cis|trans) stays|stays? (cis|trans)|gives a (bridged|fused)|\((para|ortho|meta)\)|cyclohexa-1,4-diene|\d° > \d°|> methyl|sp > sp2|not equal|shorter climb|warm[^.]*\b1,4\b|cold[^.]*\b1,2\b/i;

    it("states no outcome in any reason, on any kind of item", () => {
      let others = 0;
      for (const { entry, why } of ruleSteps) {
        expect(right(why).text, `${entry.id}: ${right(why).text}`).not.toMatch(OUTCOME);
        // The retry's answer is never in a correction either: a cis or trans result, a product type, an order.
        for (const option of wrongs(why)) expect(mixupByText(option.text)![1].fix, entry.id).not.toMatch(OUTCOME);
        if (entry.item.kind !== "mcq") others += 1;
      }
      // Draw, sort and match steps are checked too, not skipped.
      expect(others).toBeGreaterThanOrEqual(8);
    });

    it("never paraphrases the right option: phrases with one meaning fold together first", () => {
      const cases: readonly [string, string][] = [
        ["u1-ed-cold", "Cold and irreversible: the product over the lower hump (kinetic) wins."],
        ["u1-ed-warm", "Warm and reversible: the product in the deeper well (thermodynamic) wins."],
        ["u1-ani-why-alkyl", "Alkyl groups donate electron density. That helps an electron-poor cation and hurts an electron-rich anion."],
        ["u1-cd-st-cis", "The two new sigma bonds form together, on a single face of the dienophile."],
        ["u1-cd-nbsp-hexene-site", "An allylic carbon is an sp3 carbon bonded to a C=C carbon."],
      ];
      for (const [id, text] of cases) expect(givesAway(byId.get(id)!, text), id).toBe(true);
      expect(canonical("the lower hump")).toMatch(/FOLDFASTER/);
      for (const { entry, why } of ruleSteps) {
        if (entry.item.kind !== "mcq") continue;
        const beat = entry.item.beat;
        const answer = canonical(beat.options.find((o) => o.id === beat.correctOptionId)!.text);
        for (const token of answer.match(/FOLD[A-Z]+/g) ?? []) {
          expect(canonical(right(why).text), `${entry.id}: the reason says ${token}`).not.toContain(token);
        }
      }
    });

    it("gives a paired step's feedback as a reason, never the retry's answer", () => {
      const paired = all.filter(({ why }) => why.id.startsWith("why:"));
      expect(paired.length).toBeGreaterThanOrEqual(2);
      for (const { entry, why } of paired) {
        // Low finding, seventh and eighth passes: "The reason is: C4." and "The reason is: C4, the far end of
        // the diene." are answers. The paired question asks for a reason, and its right option names no single
        // carbon, end or label as the thing picked.
        const asked = byId.get(sayWhyTarget(why.id))!;
        expect(promptOf(asked), entry.id).toMatch(/reason|why/i);
        expect(promptOf(asked), entry.id).not.toMatch(/pick the (end|carbon|C=C carbon|atom)/i);
        expect(right(why).text, entry.id).not.toMatch(/^((C\d|ψ\d|[A-Z])([,.]|$)|From H\+ on C\d|The CH\d? (end|next))/);
        for (const option of why.options) {
          const said = option.why ?? "";
          expect(givesAway(entry, said), `${entry.id}: ${said}`).toBe(false);
          expect(said, entry.id).not.toMatch(OUTCOME);
          expect(said.replace(right(why).text, ""), entry.id).not.toMatch(/1,4 product|1,2 product|far end/);
        }
        expect(right(why).why, entry.id).toBe("Right. Hold on to that reason for the next question.");
      }
      for (const id of ["u1-12v14-pick-14", "u1-hx-label-kinetic", "u1-hx-draw-isoprene-cold", "u1-qb-isoprene-warm", "u1-cd-pred-ortho-ome", "u1-cd-pred-ortho-acrolein"]) {
        expect(SAY_WHY_PAIRS[id], id).toBeUndefined();
      }
    });

    // The seventh-pass checker's findings, pinned so a later edit cannot bring one back.
    it("no longer offers the mix-ups the seventh-pass checker rejected", () => {
      // (c) negations of the right reason, or corrections that restate it.
      const negation: Readonly<Record<string, RegExp>> = {
        "u1-cat-ladder-allylic": /./,
        "u1-cat-middle-methyl": /./,
        "u1-qa-best-anion": /./,
        "u1-qa-ladder-anion": /./,
        "u1-ani-ladder-res": /./,
        "u1-ani-ring": /./,
        "u1-rad-benzyl-vs-3": /substitution beats resonance|Alkyl groups destabilise/,
        "u1-rad-ring": /p orbital is empty|substitution beats resonance/,
      };
      for (const [id, bad] of Object.entries(negation)) {
        const step = ruleSteps.find(({ entry }) => entry.id === id);
        if (step === undefined) continue;
        for (const option of wrongs(step.why)) expect(option.text, id).not.toMatch(bad);
      }
      for (const { entry, why } of ruleSteps) {
        for (const option of wrongs(why)) {
          expect(option.text, entry.id).not.toMatch(/pull electron density away from a positive carbon/);
          // The correction that read as the right option word for word.
          expect(mixupByText(option.text)![1].fix, entry.id).not.toMatch(/so resonance counts for more|donation from alkyl groups hurts it/);
        }
      }
      // (b) off topic: no Diels-Alder stereo step offers a mix-up about another part of the reaction.
      const offTopic = /endo|exo|bridge|fused|enantiomer|racem|chiral|dienophile must be|partner with two|O on a C=C/i;
      for (const id of ["u1-cd-3d-maleate", "u1-cd-st-draw-maleate", "u1-cd-st-cis", "u1-cd-qd-ortho-ester", "u1-cd-qd-para-ketone"]) {
        const step = ruleSteps.find(({ entry }) => entry.id === id);
        expect(step, id).toBeDefined();
        for (const option of wrongs(step!.why)) expect(option.text, id).not.toMatch(offTopic);
      }
      for (const id of [
        "u1-cd-3d-fumarate", "u1-cd-3d-draw-fumarate", "u1-cd-st-inside-outside-product", "u1-cd-3d-hexadiene", "u1-cd-qd-zz",
        "u1-cd-qd-retro-bicyclic", "u1-cat-pentadienyl", "u1-qa-heptatrienyl", "u1-cat-vinyl",
        // (d) the right reason ruled out both wrong answers by itself.
        "u1-cd-nbsp-tetramethyl-count",
      ]) {
        expect(SAY_WHY_STEPS[id], id).toBeUndefined();
      }
      // Low: one name for the C4 allylic cation, the name of the structure drawn.
      for (const entry of ALL) expect(JSON.stringify(entry), entry.id).not.toMatch(/crotyl cation is|but-2-enyl/i);
    });

    // The eighth-pass checker's findings, pinned the same way.
    it("no longer lists the steps the eighth-pass checker rejected", () => {
      // Criterion 4, or criterion 3, with no honest replacement: off the allowlist.
      // Criterion 1: the second mix-up led to no drawable product, or to one no more stable than the answer.
      for (const id of [
        "u1-cat-allyl-vs-2", "u1-cat-3allyl-vs-3", "u1-rad-benzyl-vs-3", "u1-cd-da-ring", "u1-cd-phile-fastest",
        "u1-12v14-draw-14", "u1-hx-hexadiene-cold",
      ]) {
        expect(byId.get(id), id).toBeDefined();
        expect(SAY_WHY_STEPS[id], id).toBeUndefined();
        expect(ruleSteps.some(({ entry }) => entry.id === id), id).toBe(false);
      }
      // Criterion 1 on u1-x2-dmb-cold: with X2 both added atoms are Br, so "which carbon took the first Br"
      // leads to the right dihalide. Neither it nor the halide-on-the-middle-carbon mix-up exists any more.
      const gone = /first halogen atom adds to an inner carbon|bond to the middle carbon|p orbital is empty|Heat joins one C=C|donor on the dienophile speeds|C=C next door is a carbon neighbour/i;
      for (const one of Object.values(SAY_WHY_MIXUPS)) expect(`${one.text} ${one.fix}`).not.toMatch(gone);
      const dmbCold = SAY_WHY_STEPS["u1-x2-dmb-cold"];
      expect(dmbCold?.mixups).toEqual(["x2-equiv-both", "kvt-stable-is-fast"]);
      // Minor: the mix-up on (E)-penta-1,3-diene numbers the diene as its name does, methyl on C4.
      const penta = SAY_WHY_STEPS["u1-cd-qd-ortho-ester"]!.mixups.map((id) => SAY_WHY_MIXUPS[id]!);
      for (const one of penta) expect(`${one.text} ${one.fix}`).not.toMatch(/diene C1|group on C1|donor on C1/);
      expect(promptOf(byId.get("u1-cd-qd-ortho-ester")!)).toMatch(/Penta-1,3-diene/);
    });

    // Items the earlier passes found have no honest reason step: the question asks for the reason itself, or
    // every true reason is its answer. None of them is on the allowlist.
    it("lists no item whose every true reason is its answer", () => {
      for (const id of [
        "u1-12v14-why-fast", "u1-cd-qd-edg-effect", "u1-cd-nbs-why", "u1-cd-3d-endo-where", "u1-cd-dienes-edg-locked", "u1-12v14-which-carbon",
        "u1-cd-qc-br-source", "u1-cd-nbs-initiator", "u1-cd-qc-peroxide", "u1-cd-3d-one-centre", "u1-cd-3d-trans-racemate", "u1-cd-3d-cis-meso",
        "u1-cd-3d-exo-heat", "u1-cd-ex-fumarate-full", "u1-cat-major", "u1-ani-major", "u1-rad-major", "u1-qa-prenyl-cation", "u1-qa-prenyl-anion",
        "u1-ani-why-alkyl", "u1-qb-rule", "u1-ed-cold", "u1-ed-warm", "u1-qb-diagram-cold", "u1-qb-diagram-warm", "u1-ed-goes-back", "u1-x2-chd-14",
        "u1-cd-mo-allyl-node", "u1-cd-st-draw-norbornene", "u1-cat-ladder-alkyl", "u1-ani-ladder-alkyl", "u1-ani-ladder-s", "u1-rad-alkyl",
        "u1-rad-draw-bromination", "u1-x2-why-14",
      ]) {
        expect(byId.get(id), id).toBeDefined();
        expect(SAY_WHY_STEPS[id], id).toBeUndefined();
        expect(ruleSteps.some(({ entry }) => entry.id === id), id).toBe(false);
      }
    });

    // Every case an earlier checker named, with the giveaway it quoted. Each has no rule step, or one whose
    // options and feedback never carry that giveaway.
    it("no longer gives away the earlier checkers' named answers", () => {
      const named: Readonly<Record<string, RegExp>> = {
        "u1-cd-qc-isobutylene-count": /same compound|one product/i,
        "u1-rad-benzyl-vs-3": /benzylic radical is more stable/,
        "u1-cd-pred-dmb-acn": /end up on the new ring C=C/,
        "u1-cd-qd-ortho-ester": /1,2 product|ortho/,
        "u1-cd-st-cis": /cis stays cis|single face|same face/,
        "u1-cd-3d-maleate": /cis diester/,
        "u1-cd-3d-junction": /stay cis|endo or exo/,
        "u1-x2-warm-br": /1,4 dibromide/,
        "u1-rad-ring": /beats a 3° alkyl one/,
        "u1-cd-st-draw-maleate": /end up cis/,
        "u1-cd-pred-draw-para": /1,4 product|para/,
        "u1-cd-exam-draw-mvk": /1,4 product|para/,
        "u1-x2-draw-warm": /1,4 dibromide/,
        "u1-hx-dmb-cold": /gives the 1,2|1,2 \(kinetic\)|1,2 product forms faster/,
        "u1-x2-dmb-cold": /gives the 1,2|1,2 dihalide|1,2 product forms faster/,
        "u1-hx-hexadiene-cold": /1,2 product forms faster/,
      };
      for (const [id, bad] of Object.entries(named)) {
        expect(byId.get(id), id).toBeDefined();
        const step = all.find((one) => one.entry.id === id);
        if (step === undefined || !step.why.id.startsWith("whyrule:")) continue;
        for (const option of step.why.options) expect(`${option.text} ${option.why}`, id).not.toMatch(bad);
      }
    });
  });

  it("puts each reason just before its question in a recycle list", () => {
    const pool = U1_POOLS["u1-x2"] ?? [];
    const beats = pool.flatMap((entry) => (entry.item.kind === "mcq" && sayWhyBeatFor(entry, pool, ALL) !== null ? [entry.item.beat] : [])).slice(0, 2);
    const out = withSayWhy(beats, pool, ALL);
    expect(out.filter((b) => !isSayWhyId(b.id))).toEqual(beats);
    expect(isSayWhyId(out[0]!.id)).toBe(true);
    expect(out[1]).toBe(beats[0]);
  });
});
