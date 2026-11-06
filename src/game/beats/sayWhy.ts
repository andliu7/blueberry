/**
 * "SAY WHY" FIRST WHEN A MISTAKE COMES BACK (ADDED 3 Nov, Unit 1 review
 * suggestion 3; the owner's standing rule that mistakes are replayed with
 * "say why"). When a missed question returns, in an in-a-row run's requeue or
 * a lesson's recycle pass, the student first answers a REASON question, then
 * meets the question itself again. Retrieving the reason, not the answer, is
 * what carries over to a new diene on the exam.
 *
 * Two kinds of reason question, both built from content that already exists,
 * so no chemistry enters here:
 *
 *   paired   a pool question that already asks the reason behind another
 *            (SAY_WHY_PAIRS). It is played as itself, under a `why:` id so the
 *            runner can tell it from the real retry; its drawing and tiles
 *            still resolve (mcqFigures.ts strips the prefix).
 *   rule     otherwise, and only for an item listed in SAY_WHY_STEPS
 *            (content/u1/sayWhyMixups.ts): "pick the reason that decides
 *            it", the item's reason against the two mix-ups its entry names.
 *            Played under a `whyrule:` id: the question's drawing shows, its
 *            option tiles do not, because the options are reasons, not
 *            molecules.
 *
 * CHANGED 4 Nov (checker, seventh pass): OPT-IN. Six passes picked the wrong
 * options automatically, by rule tags and word cues over per-lesson lists,
 * and kept producing options a student could reject by topic alone, or that
 * were the right reason negated. Now an item gets a rule step only when its
 * wrong reasons are listed for it by hand, each one a belief that leads to a
 * wrong answer on that very question. An item with no entry replays as
 * before. The right reason's place moves from question to question
 * (McqBeatView never shuffles), so its position carries no pattern.
 *
 * Both play at level 0, where nothing can fail (types.ts canFail), so the
 * step is calm and decision-light: it teaches, it never costs a run.
 */
import type { McqBeat } from "./types";
import type { PoolEntry } from "../content/u1/types";
import { SAY_WHY_MIXUPS, SAY_WHY_STEPS } from "../content/u1/sayWhyMixups";

export const WHY_PAIRED = "why:";
export const WHY_RULE = "whyrule:";

/** Whether a beat id is a say-why step, not a real question. */
export function isSayWhyId(id: string): boolean {
  return id.startsWith(WHY_PAIRED) || id.startsWith(WHY_RULE);
}

/** The real question a say-why id stands in front of. */
export function sayWhyTarget(id: string): string {
  return id.startsWith(WHY_RULE) ? id.slice(WHY_RULE.length) : id.startsWith(WHY_PAIRED) ? id.slice(WHY_PAIRED.length) : id;
}

/**
 * A missed question, and the pool question that asks the reason it turns on:
 * the same reaction, or the same partner, asked as "why". test/sayWhy.test.ts
 * holds every id to a real Unit 1 pool MCQ.
 *
 * CHANGED 3 Nov (checker): u1-cd-3d-hexadiene (the 2E,4E diene) is unpaired:
 * the inside/outside question is about the 2E,4Z diene.
 * CHANGED 4 Nov (checker, seventh pass): u1-12v14-pick-14, u1-hx-label-kinetic,
 * u1-hx-draw-isoprene-cold and u1-qb-isoprene-warm are unpaired. Their
 * paired questions' answers are labels ("C4", "C1", "From H+ on C1"), so the
 * wrong option's feedback read "The reason is: C4", an answer, not a reason.
 * CHANGED 5 Nov (checker, eighth pass): u1-cd-pred-ortho-ome and
 * u1-cd-pred-ortho-acrolein are unpaired for the same reason. Their paired
 * questions ask "pick the end" and "pick the C=C carbon", so the feedback
 * read "The reason is: C4, the far end of the diene", a carbon, not a reason.
 * A paired question must ask for a reason, and its right option must be one.
 */
export const SAY_WHY_PAIRS: Readonly<Record<string, string>> = {
  "u1-x2-pick-14": "u1-x2-why-14",
  "u1-x2-pentadiene-14": "u1-x2-why-14",
};

/** The first sentence of an explanation, the rule it opens with. */
export function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return (match?.[1] ?? text).trim();
}

/**
 * The reason a say-why step offers as right: the explanation's first
 * sentence, or its first two when the first is too short to stand alone
 * ("Contributors are not equal." needs "The one with the charge on the more
 * substituted carbon counts for more."). Capped so its length is no hint.
 */
export function reasonOf(text: string): string {
  const first = firstSentence(text);
  if (first.length >= 45) return first;
  const rest = text.trim().slice(first.length).trim();
  const second = rest.length > 0 ? firstSentence(rest) : "";
  const both = `${first} ${second}`.trim();
  return second.length > 0 && both.length <= 150 ? both : first;
}

/** A small stable hash, so the same missed question always gets the same step. */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function nodeOf(entry: PoolEntry): string {
  return entry.item.kind === "mcq" || entry.item.kind === "draw" ? entry.item.beat.node : "";
}

/** The question's own prompt, whatever kind of item it is. */
export function promptOf(entry: PoolEntry): string {
  const item = entry.item;
  if (item.kind === "mcq" || item.kind === "draw") return item.beat.prompt;
  if (item.kind === "sort") return item.content.beat.prompt;
  if (item.kind === "match") return item.board.prompt;
  return "";
}

/** Lower case, punctuation and spacing dropped, so two wordings of one sentence compare equal. */
export function normalizeReason(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9°+−δψ]+/g, " ").trim();
}

/** The correct option's text of a missed MCQ, or null for any other kind. */
function answerOf(entry: PoolEntry): string | null {
  if (entry.item.kind !== "mcq") return null;
  const beat = entry.item.beat;
  return beat.options.find((option) => option.id === beat.correctOptionId)?.text ?? null;
}

/** Words too common to tell one option from another. */
const STOP = new Set(
  "the and for from with are its this that these those than then not but which what when where each both all any more most less only also into onto over here there their they them was can may has have had give gives given".split(" "),
);

/**
 * The words that carry a text's meaning, compared across options. Labels keep
 * their case (diagram labels "A", "B", gaps "x", "y", "z"; an "A" opening a
 * sentence before a lower-case word is the article), carbons and orbitals stay
 * whole ("C4", "ψ3"), and a plural matches its singular.
 */
export function keyWordsOf(text: string): Set<string> {
  const out = new Set<string>();
  const re = /[A-Za-z0-9ψδ°+−•]+/g;
  for (let match = re.exec(text); match !== null; match = re.exec(text)) {
    const raw = match[0];
    if (/^[ABxyz]$/.test(raw)) {
      const before = text.slice(0, match.index).trimEnd();
      const article = raw === "A" && (before === "" || /[.:;!?]$/.test(before)) && /^ [a-z]/.test(text.slice(match.index + 1));
      if (!article) out.add(`label:${raw}`);
      continue;
    }
    const word = raw.toLowerCase().replace(/•$/, "");
    if (SYMBOL.test(word)) {
      out.add(word);
      continue;
    }
    if (word.length < 3 || STOP.has(word)) continue;
    out.add(word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word);
  }
  return out;
}

/**
 * ADDED 4 Nov (checker, sixth pass). Phrases that say one thing in different
 * words, folded to one token before options and reasons are compared, so a
 * paraphrase ("the lower hump wins" for "A, the faster one", "on a single
 * face" for "on the same face", "donate" for "push") counts as the same word.
 */
const SYNONYMS: readonly (readonly [RegExp, string])[] = [
  [/\b(lower|lowest|smaller) (hump|barrier|TS|transition state)\b|\bkinetic\b|\bforms? (faster|first)\b|\bfaster\b/gi, " FOLDFASTER "],
  [/\b(deeper|deepest|lower) (well|valley)\b|\bthermodynamic\b|\bmore stable\b|\bbetter (alkene|C=C)\b/gi, " FOLDSTABLER "],
  [/\bdonat\w*|\bpush\w*/gi, " FOLDPUSH "],
  [/\b(the )?(same|single|one) face\b/gi, " FOLDSAMEFACE "],
  [/\bnext to (the |a )?(C=C|double bond)|\bbonded to a C=C carbon|\ballylic carbon\b/gi, " FOLDNEXTTOCC "],
  [/\bmore substituted\b|\bcarries more carbons\b|\bmore carbons on\b/gi, " FOLDMORESUBST "],
];

/** A text with every SYNONYMS phrase folded to its token. */
export function canonical(text: string): string {
  return SYNONYMS.reduce((out, [re, token]) => out.replace(re, token), text);
}

/** A carbon, an orbital, a charge or a reagent: one token that can be a whole answer. */
const SYMBOL = /^(c\d+|ψ\d+|\d+°?|δ[+−]|br2|cl2|br)$/;

/** A count, or "the same compound", in a text shown before a "how many" question. */
const COUNTS = /\b(one|two|three|four|five|six|single|\d)\s+(different\s+|constitutional\s+)?(products?|compounds?|(pi\s+)?MOs?|nodes?)\b|same compound|same product|identical/i;

/**
 * Whether a text shown before the retry gives its answer away. CHANGED 4 Nov
 * (checker, fifth pass): matching the whole right option missed short answers
 * ("C4", "A", "ψ3", "Br2") and paraphrases. A text now gives the answer away
 * when, among the words that tell the options apart, it shares more with the
 * right option than with any wrong one, so a student could pick by matching
 * words; or, for a "how many" question, when it states a count or calls the
 * products the same compound. Paraphrases that share no word are held by the
 * hand-built allowlist (content/u1/sayWhyMixups.ts SAY_WHY_STEPS) and the
 * named cases in test/sayWhy.test.ts.
 *
 * `symbolsOnly` is for a mix-up and its correction. Those are about the
 * lesson, not this question, so ordinary words they share with an option
 * mean little; only a label, carbon, orbital or reagent that points at the
 * right option alone (or the whole option, or a count) counts.
 */
export function givesAway(entry: PoolEntry, text: string, symbolsOnly = false): boolean {
  if (/how many/i.test(promptOf(entry)) && COUNTS.test(text)) return true;
  if (entry.item.kind !== "mcq") return false;
  const beat = entry.item.beat;
  const answer = answerOf(entry);
  const said = normalizeReason(text);
  if (answer !== null && normalizeReason(answer).length >= 4 && ` ${said} `.includes(` ${normalizeReason(answer)} `)) return true;
  const keep = (word: string) => !symbolsOnly || word.startsWith("label:") || SYMBOL.test(word);
  const sets = beat.options.map((option) => ({ right: option.id === beat.correctOptionId, words: new Set([...keyWordsOf(canonical(option.text))].filter(keep)) }));
  // A word every option carries cannot point at one of them.
  const common = new Set([...(sets[0]?.words ?? [])].filter((word) => sets.every((one) => one.words.has(word))));
  const words = keyWordsOf(canonical(text));
  const score = (set: Set<string>) => [...set].filter((word) => words.has(word) && !common.has(word)).length;
  const right = Math.max(0, ...sets.filter((one) => one.right).map((one) => score(one.words)));
  const wrong = Math.max(0, ...sets.filter((one) => !one.right).map((one) => score(one.words)));
  if (right > 0 && right > wrong) return true;
  // A folded phrase (SYNONYMS) the reason shares with the right option and with no wrong one is the answer
  // in other words, however many ordinary words the reason shares with a wrong option.
  const folded = (value: string) => new Set(canonical(value).match(/FOLD[A-Z]+/g) ?? []);
  const said2 = folded(text);
  const rightFolds = beat.options.filter((option) => option.id === beat.correctOptionId).flatMap((option) => [...folded(option.text)]);
  const wrongFolds = new Set(beat.options.filter((option) => option.id !== beat.correctOptionId).flatMap((option) => [...folded(option.text)]));
  return rightFolds.some((token) => said2.has(token) && !wrongFolds.has(token));
}

/**
 * The reason question to ask before a missed question is replayed, or null
 * when there is nothing honest to ask. `everywhere` is every Unit 1 pool
 * entry; a paired reason question may live in an earlier lesson's pool.
 *
 * CHANGED 4 Nov (checker, seventh pass): a rule step is built only for an
 * item in SAY_WHY_STEPS, from exactly the mix-ups listed for it. Nothing is
 * picked by tag, cue or lesson list any more.
 */
export function sayWhyBeatFor(missed: PoolEntry, pool: readonly PoolEntry[], everywhere: readonly PoolEntry[] = pool): McqBeat | null {
  const pairedId = SAY_WHY_PAIRS[missed.id];
  if (pairedId !== undefined) {
    const paired = everywhere.find((entry) => entry.id === pairedId) ?? null;
    if (paired !== null && paired.item.kind === "mcq") {
      const beat = paired.item.beat;
      const rightText = beat.options.find((option) => option.id === beat.correctOptionId)?.text ?? "";
      // CHANGED 4 Nov (checker, sixth pass): the paired question's own feedback explains how its answer
      // leads to the retry's ("Bromide there puts Br on C4 ...: the 1,4 product"), and the retry comes
      // next. The step now confirms the reason and stops; the full explanation follows the retry.
      const options = beat.options.map((option) => ({
        ...option,
        why: option.id === beat.correctOptionId ? "Right. Hold on to that reason for the next question." : `Not this one. The reason is: ${rightText}.`,
      }));
      return { ...beat, options, id: `${WHY_PAIRED}${paired.id}`, levels: [0], brief: "Before you try that one again: the reason first." };
    }
  }
  const step = SAY_WHY_STEPS[missed.id];
  if (step === undefined) return null;
  const own = step.reason ?? reasonOf(missed.explanation);
  const listed = step.mixups.flatMap((id) => {
    const one = SAY_WHY_MIXUPS[id];
    return one === undefined ? [] : [one];
  });
  if (own.length < 12 || listed.length < 2) return null;
  // A sort or match item carries no node of its own; it shares its pool's.
  const node = nodeOf(missed) || pool.map(nodeOf).find((one) => one !== "") || "";
  const concepts = missed.item.kind === "mcq" || missed.item.kind === "draw" ? missed.item.beat.conceptIds : [];
  const h = hashOf(missed.id);
  // Two of the listed mix-ups; with three listed, the item's hash picks which two, the same every time.
  const first = h % listed.length;
  const second = (first + 1 + (Math.floor(h / listed.length) % (listed.length - 1))) % listed.length;
  const wrong = [listed[first]!, listed[second]!].map((one, i) => ({
    id: i === 0 ? "mixup-a" : "mixup-b",
    text: one.text,
    why: `A common mix-up. ${one.fix} This question turns on: ${own}`,
  }));
  // CHANGED 4 Nov (checker, fifth pass): never the full explanation. It reaches the
  // question's answer, and the retry comes next; the student meets the explanation
  // after the retry.
  const right = { id: "this", text: own, why: `Right. ${own}` };
  // The right reason's place moves with the question (first, middle or last),
  // so after a few steps its position is no hint.
  const at = Math.floor(h / 7) % 3;
  return {
    kind: "mcq",
    id: `${WHY_RULE}${missed.id}`,
    node,
    conceptIds: concepts,
    levels: [0],
    prompt: "Before you try again: pick the reason that decides this question.",
    brief: "Same question as the one you missed. Two of these are common mix-ups.",
    correctOptionId: "this",
    options: [...wrong.slice(0, at), right, ...wrong.slice(at)],
  };
}

/**
 * A lesson's recycle list with each missed question's reason asked just before
 * it. `pool` is every pool entry the lesson plays; a question with no pool
 * entry (an authored MCQ) is replayed as before.
 */
export function withSayWhy(beats: readonly McqBeat[], pool: readonly PoolEntry[], everywhere: readonly PoolEntry[] = pool): readonly McqBeat[] {
  const out: McqBeat[] = [];
  for (const beat of beats) {
    const entry = pool.find((one) => one.id === beat.id);
    const why = entry === undefined ? null : sayWhyBeatFor(entry, pool, everywhere);
    if (why !== null) out.push(why);
    out.push(beat);
  }
  return out;
}
