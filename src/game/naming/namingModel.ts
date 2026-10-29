/**
 * The Naming and acid-base reference as data the page and the cards share.
 * Pure: no React, no storage. Words are in namingContent.ts, structures in
 * guide/nmGuide.figures.ts (RDKit), and pKa numbers come from the student's
 * own table passed in as a snapshot.
 */
import type { PkaSiteId } from "@blueberry/curriculum";
import { formatPka, pkaValueFor, type PkaSettingsSnapshot } from "../settings/pka";
import type { Card, Deck } from "../cards/types";
import { NM_GUIDE } from "../guide/nmGuide";
import type { GuidePanel } from "../guide/types";
import { ACID_BASE, ACID_BASE_RULE, ACID_BASE_RULE_ASK, ARIO, ARIO_INTRO, ARIO_INTRO_ASK, PREFIX_ONLY, PRIORITY, RULES } from "./namingContent";

export const NAMING_DECK_ID = "deck-naming-acidbase";
export const NAMING_DECK_TITLE = "Naming and acid-base";
const DRAFT_TAG = "status:draft";

type Mol = Extract<GuidePanel, { kind: "mol" }>;

/** The drawing's panels for a key, or an empty list when the key is unknown. */
export function panelsFor(key: string): readonly GuidePanel[] {
  return NM_GUIDE.examples[key]?.panels ?? [];
}

/** The structure a naming example is about: its larger, named drawing. */
export function focusMol(key: string): Mol | null {
  const found = panelsFor(key).find((panel): panel is Mol => panel.kind === "mol" && panel.focus === true);
  return found ?? null;
}

/**
 * Fills the `{pka:site}` and `{diff:a-b}` slots from the student's own pKa
 * table. An unknown site is left visible as written rather than guessed.
 */
export function fillPka(text: string, settings: PkaSettingsSnapshot): string {
  return text
    .replace(/\{pka:([a-z_]+)\}/g, (whole, id: string) => {
      try {
        return formatPka(pkaValueFor(settings, id as PkaSiteId));
      } catch {
        return whole;
      }
    })
    .replace(/\{diff:([a-z_]+)-([a-z_]+)\}/g, (whole, a: string, b: string) => {
      try {
        const gap = pkaValueFor(settings, a as PkaSiteId) - pkaValueFor(settings, b as PkaSiteId);
        return formatPka(Math.round(gap * 10) / 10);
      } catch {
        return whole;
      }
    });
}

/** Strips tags for a plain card answer: the page keeps them, the card does not need them. */
function card(id: string, front: string, back: string, why: string, figureKey: string | null): Card {
  const tags = [DRAFT_TAG, "topic:naming-acidbase"];
  if (figureKey !== null) tags.push(`secfig:${figureKey}:0`);
  return {
    id: `nm:${id}`,
    front,
    back,
    why,
    tags,
    source: { kind: "lesson", lessonId: figureKey ?? "nm-rules", beatId: `nm:${id}` },
  };
}

/** The mol's name, which the generator checked against its drawing. */
function nameOf(key: string): string {
  return focusMol(key)?.name ?? key;
}

/** Every card of the deck, built fresh so the pKa numbers match the student's table. */
export function namingCards(settings: PkaSettingsSnapshot): readonly Card[] {
  const out: Card[] = [];
  for (const row of PRIORITY) {
    const name = nameOf(row.key);
    out.push(card(`${row.key}:name`, "Name this molecule.", name, `Highest group on the table: ${row.label.toLowerCase()}, so the ending is ${row.ending}. ${row.note}`, row.key));
    out.push(card(`${row.key}:ending`, `What ending does a ${row.label.toLowerCase()} give when it is the primary group?`, row.ending, `As a prefix, when something higher wins: ${row.prefix}.`, null));
  }
  for (const row of PREFIX_ONLY) {
    out.push(card(`${row.key}:name`, "Name this molecule.", nameOf(row.key), `${row.label}: no ending, so it is a prefix (${row.prefix}). ${row.note}`, row.key));
  }
  for (const rule of RULES) {
    out.push(card(`rule:${rule.id}`, rule.ask, rule.answer, rule.text, rule.key));
  }
  for (const topic of ACID_BASE) {
    out.push(card(`ab:${topic.key}`, topic.ask, fillPka(topic.text, settings), "Your pKa table sets the numbers here (Settings, pKa).", topic.key));
  }
  out.push(card("ario:intro", ARIO_INTRO_ASK, "Atom, Resonance, Induction, Orbital. Compare the conjugate bases: the more stable the A- left behind, the stronger the acid. The first factor where the two acids differ usually decides.", ARIO_INTRO, null));
  for (const topic of ARIO) {
    out.push(card(`ario:${topic.key}`, topic.ask, fillPka(topic.text, settings), "Your pKa table sets the numbers here (Settings, pKa).", topic.key));
  }
  out.push(card("ab:rule", ACID_BASE_RULE_ASK, ACID_BASE_RULE, "K for HA + B- giving A- + HB is 10 to the power (pKa of HB minus pKa of HA).", null));
  return out;
}

export function namingDeck(): Deck {
  return { id: NAMING_DECK_ID, title: NAMING_DECK_TITLE, kind: "lesson", cardIds: [] };
}
