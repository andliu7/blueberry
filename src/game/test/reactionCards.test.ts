/**
 * Reaction cards: the builder over the authored registry, the reveal that
 * shows only what exists, the #/draw save round trip, the migration out of
 * the dead savedCards store, and the starter seed.
 *
 * THE PINS THAT MATTER MOST, named so a refactor knows what it is defending:
 *
 *   - Nothing on a card is invented. Every chemistry string on a built card
 *     exists character for character in data/reactions.ts, and a reveal
 *     field the data does not state is ABSENT, not filled in.
 *   - The id is derived from the reaction, so a draw save, a migrated save
 *     and a seeded card of the same reaction are ONE card with one schedule.
 *   - The seed happens exactly once. A second call, a later emptiness, or a
 *     store that already has cards must not grow surprise decks.
 *
 * Storage is the same in-memory stub cardStore.test.ts uses, because these
 * paths are exactly where a persistence bug would hide behind a mock.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { REACTIONS, REAGENT_ART } from "../../data/reactions";
import {
  drawCardFor,
  reactionCardFromStaged,
  reactionCardId,
  REAGENT_LABELS,
  stagedReagentLine,
  stagedReagentSteps,
  stageReagentArt,
  stageReagentLabel,
} from "../cards/reactionCard";
import {
  cardFromLegacyEntry,
  LEGACY_SAVED_CARDS_KEY,
  migrateLegacySavedCards,
} from "../cards/migrateSavedCards";
import {
  SEED_FLAG_KEY,
  seedStarterDeck,
  STARTER_DECK_ID,
  STARTER_REACTION_IDS,
  starterCards,
} from "../cards/seed";
import { REVEAL_ORDER } from "../cards/types";
import { createLocalDecks, PERSONAL_DECK_ID } from "../cards/store";
import { cardsIn, dueInDeck, isDue, presentReveal, REVEAL_LABELS } from "../cards/types";
import { CardFace } from "../cards/ui/CardFace";
import { cardFromDraft, EMPTY_EXTRAS } from "../cards/ui/composer";
import { reviewQueue } from "../cards/ui/landing";

/* ------------------------------------------------------------------ */
/* Storage stub, the cardStore.test.ts shape                            */
/* ------------------------------------------------------------------ */

class MemoryStorage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  getItem(key: string): string | null {
    return this.entries.has(key) ? (this.entries.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
}

function installStorage(): void {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
}

const NOON = new Date(2026, 8, 17, 12, 0, 0, 0);
const now = (): Date => NOON;

function registryEntry(id: string) {
  const entry = REACTIONS.find((reaction) => reaction.id === id);
  expect(entry, id).toBeDefined();
  return entry!;
}

beforeEach(() => {
  installStorage();
});

/* ------------------------------------------------------------------ */
/* Building a card from the authored registry                           */
/* ------------------------------------------------------------------ */

describe("a reaction card built from the registry", () => {
  it("carries the authored labels verbatim: reactants, reagents, product", () => {
    const reaction = registryEntry("grignard-addition-ketone");
    const card = reactionCardFromStaged(reaction, NOON);
    expect(card.reaction?.reactants).toBe("acetophenone");
    // "[H3O+]" is the data's SMILES for the workup; the card wears the bottle
    // label REAGENT_LABELS gives it. See reactionCard.ts for each label's
    // justification in the data.
    expect(card.reaction?.reagents).toBe("CH3MgBr; then H3O+");
    expect(card.reaction?.products).toBe("2-phenylpropan-2-ol");
    // The classic triple stays populated, so every older surface renders
    // the card whole: front asks, back answers, why carries the conditions.
    expect(card.front).toBe("acetophenone");
    expect(card.back).toBe("2-phenylpropan-2-ol");
    expect(card.why).toContain("CH3MgBr");
  });

  it("wears a temperature chip only when a stage states one", () => {
    const gilman = reactionCardFromStaged(registryEntry("gilman-to-ketone"), NOON);
    expect(gilman.reaction?.temperature).toBe("-78 °C");
    const grignard = reactionCardFromStaged(registryEntry("grignard-addition-ketone"), NOON);
    expect(grignard.reaction?.temperature).toBeUndefined();
  });

  it("carries the 1,2 vs 1,4 note verbatim where an author wrote one, and nowhere else", () => {
    const michael = registryEntry("michael-addition");
    const card = reactionCardFromStaged(michael, NOON);
    const authoredNote = michael.stages[0]?.conditions.notes ?? "";
    expect(card.reaction?.reveal.selectivity).toBe(authoredNote);

    const grignard = reactionCardFromStaged(registryEntry("grignard-addition-ketone"), NOON);
    expect(grignard.reaction?.reveal.selectivity).toBeUndefined();
  });

  it("leaves every reveal field the data does not state absent, never recalled", () => {
    // The chemistry rule as one assertion: no pKa, Keq or electronegativity
    // exists in data/reactions.ts, so no built card may carry one.
    for (const id of STARTER_REACTION_IDS) {
      const card = reactionCardFromStaged(registryEntry(id), NOON);
      expect(card.reaction?.reveal.pka, id).toBeUndefined();
      expect(card.reaction?.reveal.keq, id).toBeUndefined();
      expect(card.reaction?.reveal.electronegativity, id).toBeUndefined();
      expect(card.reaction?.reveal.resonance, id).toBeUndefined();
    }
  });

  it("derives a stable id, so the same reaction is always the same card", () => {
    expect(reactionCardId("sn2")).toBe("reaction:sn2");
    const first = drawCardFor("grignard-addition-ketone", NOON);
    const second = drawCardFor("grignard-addition-ketone", new Date(2027, 0, 1));
    expect(first?.id).toBe(second?.id);
  });

  it("returns null for a reaction id the registry does not hold", () => {
    expect(drawCardFor("reaction-that-was-deleted", NOON)).toBeNull();
  });

  it("reads each stage's display reagent, the bottle label the data lists last", () => {
    expect(stagedReagentLine(registryEntry("nabh4-reduction"))).toBe("NaBH4; then H3O+");
  });

  it("goes quiet rather than reaching for the most structural token it has", () => {
    /* THE OLD FALLBACK COULD NOT PROTECT. It returned reagents[0] when the
       last token was unmapped, but every stage the table resolves holds ONE
       reagent, so reagents[0] was the same token that just failed; and where
       a stage holds two, the first is the mechanistic species ("[BH4-]"),
       the MORE structural of the pair. The rule reached for the worst
       candidate on the shelf. Now an unlabelled structure yields "" and the
       line drops the stage, so a 44th reaction cannot ship brackets. */
    const bracketed = { reagents: ["[BH4-]"], conditions: { solvent: "", acid_base: "", temperature_c: null, notes: "" } };
    expect(stageReagentLabel(bracketed as never)).toBe("");
    const twoTokens = { reagents: ["[CH3-]", "[AlH4-]"], conditions: { solvent: "", acid_base: "", temperature_c: null, notes: "" } };
    expect(stageReagentLabel(twoTokens as never)).toBe("");
  });

  it("says one reagent once, however many stages lean on it", () => {
    /* "NaOH; then hydroxide" named a second base that is not there, and
       "hydroxide; then hydroxide" was noise: a later stage is often heat or
       time rather than a new bottle. */
    for (const reaction of REACTIONS) {
      const parts = stagedReagentLine(reaction).split("; then ");
      for (let i = 1; i < parts.length; i += 1) expect(parts[i], reaction.id).not.toBe(parts[i - 1]);
    }
  });

  it("does not put a reactant in the flask twice under two spellings", () => {
    /* The diene card read "buta-1,3-diene + acrolein" over a reagent line of
       "acrolein", and the amide card "benzoyl chloride + methylamine" over
       "CH3NH2": three species on a face the data says holds two. */
    for (const reaction of REACTIONS) {
      const card = reactionCardFromStaged(reaction, new Date("2026-01-01T00:00:00.000Z"));
      const reagents = (card.reaction?.reagents ?? "").split("; then ").map((part) => part.trim().toLowerCase()).filter(Boolean);
      const named = reaction.reactant_labels.map((label) => label.trim().toLowerCase());
      for (const piece of reagents) expect(named, `${reaction.id}: ${piece}`).not.toContain(piece);
    }
  });

  it("opens the reveal on the sentence, not on the conditions grid", () => {
    /* "Acid or base" is one word on 32 of the 43 and "Solvent" is absent on
       20, so ordering them first meant every tap opened on two rows of
       lookup table above the one paragraph worth reading. */
    expect(REVEAL_ORDER[0]).toBe("notes");
    expect(REVEAL_ORDER.indexOf("notes")).toBeLessThan(REVEAL_ORDER.indexOf("solvent"));
    expect(REVEAL_ORDER.indexOf("notes")).toBeLessThan(REVEAL_ORDER.indexOf("acidBase"));
  });

  it("never shows a student a SMILES string where a bottle label belongs", () => {
    /* THE CHEMISTRY-TRUTH PIN, and it is held over all 43 authored reactions
       rather than the seeded six. Before REAGENT_LABELS, 18 of the 43 reagent
       lines came out as raw structure strings: imine formation read "CN",
       which a sophomore reads as cyanide when it is methylamine, and
       Wolff-Kishner read "NN" for hydrazine. A square bracket in a reagent
       line is that bug returning. */
    const labels = Object.values(REAGENT_LABELS);
    for (const reaction of REACTIONS) {
      const line = stagedReagentLine(reaction);
      expect(/[[\]]/.test(line), `${reaction.id}: ${line}`).toBe(false);
      // And nothing is invented at the call site: every piece is either a
      // label this module states with its justification, or the data's own
      // word for the species, carried verbatim.
      for (const piece of line.split("; then ")) {
        const authored =
          labels.includes(piece) ||
          reaction.stages.some((stage) => stage.reagents.includes(piece));
        expect(authored, `${reaction.id}: ${piece}`).toBe(true);
      }
    }
  });

  it("labels the named species the way the data itself names them", () => {
    // Each of these is justified by the reaction's own id, notes or
    // reactant_labels. reactionCard.ts's table header cites which, per entry.
    expect(stagedReagentLine(registryEntry("imine-formation"))).toBe("CH3NH2");
    expect(stagedReagentLine(registryEntry("wolff-kishner"))).toBe("H2NNH2; then KOH");
    expect(stagedReagentLine(registryEntry("socl2-acid-to-chloride"))).toBe("SOCl2");
    expect(stagedReagentLine(registryEntry("wittig-olefination"))).toBe("Ph3P=CH2");
    expect(stagedReagentLine(registryEntry("diels-alder"))).toBe("acrolein");
    expect(stagedReagentLine(registryEntry("fischer-esterification"))).toBe("CH3OH");
    // NOT "acetylide": CC#[C-] carries a methyl, so it is prop-1-ynyl, and the
    // product is 1-phenyl-2-butyn-1-ol. A student who read "acetylide" would
    // draw HC#C- and land on the wrong alcohol. A round-two critic caught the
    // label throwing the carbon away; the structure never did.
    expect(stagedReagentLine(registryEntry("acetylide-addition"))).toBe("CH3C#C-; then H3O+");
    // A stage that already lists a bottle label keeps it, counterion and all,
    // rather than being flattened onto the ion's generic name.
    expect(stagedReagentLine(registryEntry("aldol-addition"))).toBe("NaOH");
  });
});

/* ------------------------------------------------------------------ */
/* The reagents are DRAWN                                               */
/* ------------------------------------------------------------------ */

/**
 * THE OWNER'S RULE, 27 and 28 Sep, stated twice: "always draw it out in the
 * skeletal structure", then "also draw out the reagents in the reactions - in
 * the flashcards and in the questions."
 *
 * These are the pins that keep it true as the reaction set grows. The generator
 * holds the other half: scripts/build_curriculum.py fails the build on a reagent
 * token it cannot classify as drawable or prose, so a 44th reaction cannot add a
 * reagent that quietly prints as a formula.
 */
describe("the drawn reagents", () => {
  /** Every reaction's steps, built the way the card face gets them. */
  const stepsFor = (reaction: (typeof REACTIONS)[number]) => stagedReagentSteps(reaction);

  it("draws from a registry, not from the shape of the token", () => {
    /* `CN`, `CO`, `NN`, `BrBr`, `OCCO`, `Br` and `CI` are valid SMILES that
       read like formulas, and `PCC` parses as phosphorus-carbon-carbon while
       `NBS` parses as nitrogen-boron-sulfur. So "draw it if RDKit parses it"
       would put a picture of P-C-C on a card labelled PCC. REAGENT_ART is the
       generator's classification and it is the only thing that knows. */
    for (const token of ["CN", "CO", "NN", "BrBr", "OCCO", "Br", "CI"]) {
      expect(REAGENT_ART[token], token).toBeDefined();
    }
    for (const token of ["PCC", "NBS", "H2CrO4", "DIBALH", "Zn(Hg)", "NaOH", "CH3MgBr"]) {
      expect(REAGENT_ART[token], token).toBeUndefined();
    }
  });

  it("holds no drawing for a reagent no stage asks for", () => {
    // A stale entry is a file shipped for nothing, and worse, a claim about a
    // species the curriculum no longer teaches.
    const used = new Set(
      REACTIONS.flatMap((reaction) => reaction.stages.flatMap((stage) => stage.reagents)),
    );
    for (const token of Object.keys(REAGENT_ART)) expect(used.has(token), token).toBe(true);
  });

  it("draws every reagent whose structure the data carries, and only those", () => {
    /* THE INVENTORY, pinned so it cannot quietly shrink. Six of the 43 have at
       least one stage that still shows text, and each is a gap in the DATA
       rather than in this code:

         grignard-addition-ketone, gilman-to-ketone  stage 1 carries only the
           mechanistic carbanion "[CH3-]". The bottle is CH3MgBr or (CH3)2CuLi,
           covalent organometallics the data has no structure for. Drawing a
           bare methyl anion under the label "CH3MgBr" would teach a student the
           wrong thing goes in the flask.
         clemmensen        "Zn(Hg)" and "HCl", no structure in the data
         jones-oxidation   "H2CrO4", no structure in the data
         dibalh-to-aldehyde  stage 1 is "DIBALH", no structure in the data
         pcc-oxidation     "PCC", no structure in the data

       If the owner adds a SMILES for any of these, this test fails and the list
       above is what gets shortened. That is the point of pinning it. */
    const textOnly = REACTIONS.filter((reaction) =>
      stepsFor(reaction).some((step) => step.art === undefined),
    ).map((reaction) => reaction.id);
    expect(textOnly.sort()).toEqual(
      [
        "clemmensen",
        "dibalh-to-aldehyde",
        "gilman-to-ketone",
        "grignard-addition-ketone",
        "jones-oxidation",
        "pcc-oxidation",
      ].sort(),
    );
  });

  it("never invents a drawing: every one is the registry's, for a token the stage lists", () => {
    for (const reaction of REACTIONS) {
      for (const stage of reaction.stages) {
        const art = stageReagentArt(stage);
        if (art === undefined) continue;
        const source = stage.reagents
          .map((token) => REAGENT_ART[token])
          .find((entry) => entry !== undefined);
        expect(source, `${reaction.id}: ${stage.reagents.join(" | ")}`).toBeDefined();
        expect(art.light).toBe(source?.light);
        expect(art.dark).toBe(source?.dark);
        expect(art.formula).toBe(source?.formula);
      }
    }
  });

  it("ships the file it points at, in both themes", () => {
    /* A path with no file behind it is a broken image on a card, which reads as
       a reagent that does not exist. Checked on disk rather than mocked. */
    const publicDir = fileURLToPath(new URL("../../../public/", import.meta.url));
    for (const [token, drawing] of Object.entries(REAGENT_ART)) {
      expect(drawing.light, token).toBeDefined();
      expect(drawing.dark, token).toBeDefined();
      for (const path of [drawing.light, drawing.dark]) {
        expect(existsSync(join(publicDir, path as string)), `${token}: ${path}`).toBe(true);
      }
      expect(drawing.formula.length, token).toBeGreaterThan(0);
    }
  });

  it("says the same reagents in the same order however it is rendered", () => {
    /* The spoken line and the drawn row are built from ONE list. Two
       assemblies could disagree about which stages appear, and the caption a
       screen reader hears would then name a reagent the eye cannot find. */
    for (const reaction of REACTIONS) {
      const joined = stepsFor(reaction)
        .map((step) => step.label)
        .join("; then ");
      expect(joined, reaction.id).toBe(stagedReagentLine(reaction));
    }
  });

  it("puts the drawing on the card face and keeps the SMILES off it", () => {
    const card = reactionCardFromStaged(registryEntry("wittig-olefination"), NOON);
    const steps = card.reaction?.reagentSteps ?? [];
    expect(steps.length).toBe(1);
    expect(steps[0]?.art?.light).toBeDefined();

    const markup = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: false, onReveal: () => undefined }),
    );
    // The drawing is there...
    expect(markup).toContain(steps[0]?.art?.light as string);
    // ...and the structure string that named it is not. "Ph3P=CH2" is the
    // caption; "[CH2-][P+](c1ccccc1)..." is what the page used to print.
    expect(markup).not.toContain("[CH2-][P+]");
    expect(markup).toContain("Ph3P=CH2");
  });

  it("leaves a hand-written card's reagents exactly as the student typed them", () => {
    /* A composed card has no stages, so it has no steps: nothing is drawn and
       nothing is claimed. Its own words go over the arrow as written, which is
       the fallback branch of the face's Reagents component. */
    const own = cardFromDraft(
      { setup: "my ketone", conditions: "NaBH4 then water", product: "my alcohol" },
      NOON,
      { ...EMPTY_EXTRAS, temperature: "0 °C" },
    );
    expect(own.reaction?.reagents).toBe("NaBH4 then water");
    expect(own.reaction?.reagentSteps).toBeUndefined();
    const markup = renderToStaticMarkup(
      createElement(CardFace, { card: own, revealed: false, onReveal: () => undefined }),
    );
    expect(markup).toContain("NaBH4 then water");
  });
});

/* ------------------------------------------------------------------ */
/* The reveal shows only what is present                                */
/* ------------------------------------------------------------------ */

describe("the reveal", () => {
  it("presents nothing from an empty reveal, and skips blank fields", () => {
    expect(presentReveal({})).toEqual([]);
    const entries = presentReveal({ pka: "4.76", resonance: "   " });
    expect(entries.map((entry) => entry.field)).toEqual(["pka"]);
    expect(entries[0]?.label).toBe(REVEAL_LABELS.pka);
  });

  it("renders only the fields the author supplied, under their labels", () => {
    const card = cardFromDraft(
      { setup: "acetic acid + water", conditions: "room temperature", product: "acetate" },
      NOON,
      { ...EMPTY_EXTRAS, pka: "4.76" },
    );
    const html = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(html).toContain("pKa");
    expect(html).toContain("4.76");
    for (const missing of [
      REVEAL_LABELS.keq,
      REVEAL_LABELS.selectivity,
      REVEAL_LABELS.electronegativity,
      REVEAL_LABELS.resonance,
    ]) {
      expect(html.includes(missing), missing).toBe(false);
    }
  });

  it("withholds the product until the reveal, and shows it after", () => {
    const card = drawCardFor("gilman-to-ketone", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;

    const front = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: false, onReveal: () => undefined }),
    );
    expect(front).toContain("benzoyl chloride");
    expect(front).toContain("(CH3)2CuLi");
    expect(front).toContain("-78 °C");
    expect(front.includes("acetophenone")).toBe(false);
    expect(front).toContain("Tap to reveal the answer");

    const back = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(back).toContain("acetophenone");
  });

  /* THE LESSONS ROW'S TWO EXTRAS, carried onto the card 25 Sep. Both are
     read back through the rendered markup with its tags stripped, because
     the formula is set with <sub> around every digit run. */
  const text = (html: string) => html.replace(/<[^>]+>/g, "");

  it("prints RDKit's formula under each name, the product's only after the reveal", () => {
    const card = drawCardFor("gilman-to-ketone", NOON);
    const reaction = REACTIONS.find((entry) => entry.id === "gilman-to-ketone");
    expect(card).not.toBeNull();
    expect(reaction).toBeDefined();
    if (card === null || reaction === undefined) return;
    // Benzoyl chloride and acetophenone have different formulas, so the two
    // sides can be told apart in the markup.
    const [reactantFormula] = reaction.reactant_formulas;
    expect(reactantFormula).not.toBe(reaction.product_formula);

    const front = text(
      renderToStaticMarkup(createElement(CardFace, { card, revealed: false, onReveal: () => undefined })),
    );
    expect(front).toContain(reactantFormula);
    expect(front.includes(reaction.product_formula)).toBe(false);
    expect(front).toContain("Product hidden");

    const back = text(
      renderToStaticMarkup(createElement(CardFace, { card, revealed: true, onReveal: () => undefined })),
    );
    expect(back).toContain(reactantFormula);
    expect(back).toContain(reaction.product_formula);
  });

  it("keeps the reaction's name for the back, because the name can be the answer", () => {
    const card = drawCardFor("wolff-kishner", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;
    expect(card.reaction?.name).toBe("Wolff-Kishner reduction");

    const front = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: false, onReveal: () => undefined }),
    );
    expect(front.includes("Wolff-Kishner reduction")).toBe(false);
    const back = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(back).toContain("Wolff-Kishner reduction");
  });

  it("folds solvent and acid/base into one Conditions line of chips", () => {
    const card = drawCardFor("lialh4-reduction", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;
    const back = renderToStaticMarkup(
      createElement(CardFace, { card, revealed: true, onReveal: () => undefined }),
    );
    expect(back).toContain("Conditions");
    expect(back).toContain("rxn-chip--basic");
    expect(back).toContain("rxn-chip--acidic");
    // The old labelled rows are gone; the words themselves are chips now.
    expect(back.includes(REVEAL_LABELS.acidBase)).toBe(false);
    expect(back.includes(REVEAL_LABELS.solvent)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* The composer's extras                                                */
/* ------------------------------------------------------------------ */

describe("the composer's extras", () => {
  const SIDES = { setup: "cyclopentene + NBS", conditions: "hv, heat", product: "3-bromocyclopentene" };

  it("changes nothing when every extra is blank", () => {
    expect(cardFromDraft(SIDES, NOON).reaction).toBeUndefined();
    expect(cardFromDraft(SIDES, NOON, EMPTY_EXTRAS).reaction).toBeUndefined();
  });

  it("maps the three sides onto the reaction face when an extra is written", () => {
    const card = cardFromDraft(SIDES, NOON, { ...EMPTY_EXTRAS, temperature: "25 °C" });
    expect(card.reaction).toEqual({
      reactants: SIDES.setup,
      reagents: SIDES.conditions,
      products: SIDES.product,
      temperature: "25 °C",
      reveal: {},
    });
    // The three-sided face still travels too; nothing about sides changed.
    expect(card.sides).toEqual(SIDES);
  });
});

/* ------------------------------------------------------------------ */
/* The draw page round trip                                             */
/* ------------------------------------------------------------------ */

describe("saving from #/draw", () => {
  it("lands in the personal deck, due immediately, in the review queue", () => {
    const store = createLocalDecks({ now });
    const card = drawCardFor("grignard-addition-ketone", NOON);
    expect(card).not.toBeNull();
    if (card === null) return;
    store.saveCard(card, PERSONAL_DECK_ID);

    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, PERSONAL_DECK_ID).map((held) => held.id)).toEqual([card.id]);
    const state = snapshot.review[card.id];
    expect(state && isDue(state, NOON)).toBe(true);
    expect(dueInDeck(snapshot, PERSONAL_DECK_ID, NOON)).toBe(1);
    // The landing's REVIEW queue is the session the hero starts.
    expect(reviewQueue(snapshot, [], NOON).map((queued) => queued.id)).toContain(card.id);
  });

  it("saving the same reaction twice keeps one card and its earned schedule", () => {
    const store = createLocalDecks({ now });
    const card = drawCardFor("grignard-addition-ketone", NOON);
    if (card === null) return;
    store.saveCard(card, PERSONAL_DECK_ID);
    store.rate(card.id, "good");
    const scheduled = store.getSnapshot().review[card.id];

    store.saveCard(drawCardFor("grignard-addition-ketone", new Date(2027, 0, 1))!, PERSONAL_DECK_ID);
    const snapshot = store.getSnapshot();
    expect(cardsIn(snapshot, PERSONAL_DECK_ID)).toHaveLength(1);
    expect(snapshot.review[card.id]).toEqual(scheduled);
  });
});

/* ------------------------------------------------------------------ */
/* The migration out of the dead store                                  */
/* ------------------------------------------------------------------ */

describe("migrating blueberry_saved_cards_v1", () => {
  const LEGACY = [
    {
      id: "abc-1",
      reactionId: "grignard-addition-ketone",
      front: "acetophenone, CH3MgBr",
      back: "2-phenylpropan-2-ol",
      molfile: "\n  Ketcher\n",
      smiles: "CC(C)(O)c1ccccc1",
      correct: true,
      at: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "abc-2",
      reactionId: "reaction-that-was-deleted",
      front: "the old front",
      back: "the old back",
      correct: false,
      at: "2026-08-02T10:00:00.000Z",
    },
    { id: "abc-3", front: "no reaction id at all" },
  ];

  it("walks every readable entry into the personal deck and removes the key", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify(LEGACY));
    const store = createLocalDecks({ now });

    const migrated = migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);
    expect(migrated).toBe(2);
    expect(localStorage.getItem(LEGACY_SAVED_CARDS_KEY)).toBeNull();

    const snapshot = store.getSnapshot();
    const held = cardsIn(snapshot, PERSONAL_DECK_ID);
    expect(held).toHaveLength(2);
    expect(dueInDeck(snapshot, PERSONAL_DECK_ID, NOON)).toBe(2);
  });

  it("rebuilds a resolvable entry through the same builder a fresh save uses", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify([LEGACY[0]]));
    const store = createLocalDecks({ now });
    migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);

    const card = store.getSnapshot().cards["reaction:grignard-addition-ketone"];
    expect(card?.reaction?.products).toBe("2-phenylpropan-2-ol");
    // Same derived id, so a later draw save updates rather than duplicates.
    store.saveCard(drawCardFor("grignard-addition-ketone", NOON)!, PERSONAL_DECK_ID);
    expect(cardsIn(store.getSnapshot(), PERSONAL_DECK_ID)).toHaveLength(1);
  });

  it("keeps a gone reaction's own words verbatim rather than inventing a face", () => {
    const card = cardFromLegacyEntry(LEGACY[1], NOON);
    expect(card?.front).toBe("the old front");
    expect(card?.back).toBe("the old back");
    expect(card?.reaction).toBeUndefined();
    expect(card?.source).toEqual({
      kind: "reaction",
      reactionId: "reaction-that-was-deleted",
      at: "2026-08-02T10:00:00.000Z",
    });
  });

  it("is a no-op the second time: the key is gone", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, JSON.stringify(LEGACY));
    const store = createLocalDecks({ now });
    migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON);
    expect(migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON)).toBe(0);
    expect(cardsIn(store.getSnapshot(), PERSONAL_DECK_ID)).toHaveLength(2);
  });

  it("survives a corrupt payload, and clears the unreadable key", () => {
    localStorage.setItem(LEGACY_SAVED_CARDS_KEY, "{not json");
    const store = createLocalDecks({ now });
    expect(migrateLegacySavedCards(store, PERSONAL_DECK_ID, NOON)).toBe(0);
    expect(localStorage.getItem(LEGACY_SAVED_CARDS_KEY)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* The starter seed                                                     */
/* ------------------------------------------------------------------ */

describe("the starter deck seed", () => {
  it("builds every starter card from the registry, reaction-faced", () => {
    const cards = starterCards(NOON);
    expect(cards).toHaveLength(STARTER_REACTION_IDS.length);
    for (const card of cards) {
      expect(card.reaction).toBeDefined();
      expect(card.source.kind).toBe("reaction");
    }
  });

  it("seeds once into an empty store, all cards due today", () => {
    const store = createLocalDecks({ now });
    expect(seedStarterDeck(store, NOON)).toBe(true);

    const snapshot = store.getSnapshot();
    const held = cardsIn(snapshot, STARTER_DECK_ID);
    expect(held).toHaveLength(STARTER_REACTION_IDS.length);
    expect(dueInDeck(snapshot, STARTER_DECK_ID, NOON)).toBe(STARTER_REACTION_IDS.length);
    expect(localStorage.getItem(SEED_FLAG_KEY)).not.toBeNull();
  });

  it("appears exactly once: a second call adds nothing", () => {
    const store = createLocalDecks({ now });
    seedStarterDeck(store, NOON);
    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(cardsIn(store.getSnapshot(), STARTER_DECK_ID)).toHaveLength(
      STARTER_REACTION_IDS.length,
    );
  });

  it("does not resurrect a card the student deleted", () => {
    const store = createLocalDecks({ now });
    seedStarterDeck(store, NOON);
    const first = cardsIn(store.getSnapshot(), STARTER_DECK_ID)[0];
    if (first === undefined) return;
    store.removeCard(first.id);
    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(store.getSnapshot().cards[first.id]).toBeUndefined();
  });

  it("declines a store that already holds cards, and stays declined", () => {
    const store = createLocalDecks({ now });
    const existing = drawCardFor("nabh4-reduction", NOON);
    if (existing === null) return;
    store.saveCard(existing, PERSONAL_DECK_ID);

    expect(seedStarterDeck(store, NOON)).toBe(false);
    expect(store.getSnapshot().decks[STARTER_DECK_ID]).toBeUndefined();
    // The flag is written on the declining pass too: that student is past
    // first-run, so a later empty store does not suddenly sprout the deck.
    store.removeCard(existing.id);
    expect(seedStarterDeck(store, NOON)).toBe(false);
  });

  it("does not seed when storage cannot remember that it seeded", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      blocked as unknown as Storage;
    const store = createLocalDecks({ now });
    expect(seedStarterDeck(store, NOON)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Nothing invented, held mechanically                                  */
/* ------------------------------------------------------------------ */

describe("every chemistry string on a built card is authored", () => {
  it("comes character for character out of data/reactions.ts", () => {
    for (const id of STARTER_REACTION_IDS) {
      const entry = registryEntry(id);
      const card = reactionCardFromStaged(entry, NOON);
      const face = card.reaction;
      expect(face, id).toBeDefined();
      if (face === undefined) continue;

      expect(face.reactants).toBe(entry.reactant_labels.join(" + "));
      expect(face.products).toBe(entry.product_label);
      for (const piece of face.reagents.split("; then ")) {
        const listed =
          Object.values(REAGENT_LABELS).includes(piece) ||
          entry.stages.some((stage) => stage.reagents.includes(piece));
        expect(listed, `${id}: ${piece}`).toBe(true);
      }

      /* THE REVEAL IS THE DATA'S OWN WORDS TOO. Each field is checked against
         the stage field it was read off, so a value that came from anywhere
         else fails here rather than reaching a student. */
      const notes = entry.stages.map((stage) => stage.conditions.notes);
      if (face.reveal.selectivity !== undefined) {
        expect(notes.includes(face.reveal.selectivity), id).toBe(true);
      }
      for (const sentence of (face.reveal.notes ?? "").split("\n")) {
        const stripped = sentence.replace(/^\d+\. /, "");
        if (stripped.length > 0) expect(notes.includes(stripped), `${id}: ${stripped}`).toBe(true);
      }
      for (const piece of (face.reveal.solvent ?? "").split(", then ")) {
        if (piece.length > 0) {
          const stated = entry.stages.some((stage) => stage.conditions.solvent === piece);
          expect(stated, `${id}: ${piece}`).toBe(true);
        }
      }
      for (const piece of (face.reveal.acidBase ?? "").split(", then ")) {
        if (piece.length > 0) {
          const stated = entry.stages.some((stage) => stage.conditions.acid_base === piece);
          expect(stated, `${id}: ${piece}`).toBe(true);
        }
      }

      // And the drawings are the registry's paths, not built ones.
      expect(face.art?.startLight).toBe(entry.art.start_light);
      expect(face.art?.productDark).toBe(entry.art.product_dark);
    }
  });

  it("carries RDKit's formulas and the registry's name verbatim, or not at all", () => {
    for (const reaction of REACTIONS) {
      const face = reactionCardFromStaged(reaction, NOON).reaction;
      expect(face, reaction.id).toBeDefined();
      if (face === undefined) continue;
      expect(face.name, reaction.id).toBe(reaction.name);
      for (const formula of face.reactantFormulas ?? []) {
        expect(reaction.reactant_formulas, reaction.id).toContain(formula);
      }
      if (face.productFormula !== undefined) {
        expect(face.productFormula, reaction.id).toBe(reaction.product_formula);
      }
    }
    // And a card a student composed carries none of the three.
    const composed = cardFromDraft(
      { setup: "a", conditions: "b", product: "c" },
      NOON,
      { ...EMPTY_EXTRAS, temperature: "25 °C" },
    ).reaction;
    expect(composed?.name).toBeUndefined();
    expect(composed?.reactantFormulas).toBeUndefined();
    expect(composed?.productFormula).toBeUndefined();
  });

  it("gives every authored reaction a reveal that pays for the tap", () => {
    /* WHY THIS IS HELD OVER ALL 43. Round 3's reveal could only ever emit
       `selectivity`, and exactly 2 of the 43 reactions carry a note that
       mentions 1,2 or 1,4, so the headline feature was empty on 41 of them.
       Every stage states a note, so every card now has something behind the
       tap; a card that does not is the regression. */
    for (const reaction of REACTIONS) {
      const card = reactionCardFromStaged(reaction, NOON);
      const shown = presentReveal(card.reaction?.reveal ?? {});
      expect(shown.length, reaction.id).toBeGreaterThan(0);
    }
  });
});
