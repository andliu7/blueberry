import type { ArtMotif } from "@/data/testimonialArt";
import { ART_MOTIFS } from "@/data/testimonialArt";
import type { Question, StudyDeck } from "@/data/types";

/**
 * Turns a plain text file into a deck.
 *
 * The format is deliberately forgiving, because the person writing it is
 * writing chemistry questions, not JSON:
 *
 *     title: Example: Distillation
 *     short: Distillation
 *     blurb: Fractional versus simple.
 *     motif: reflux
 *     ---
 *     Q: Why does the thermometer bulb sit level with the side arm?
 *     A: So it reads the vapour temperature.
 *
 *     Q: Which is the rate-limiting step?
 *     - The first
 *     * The second
 *     A: The second, because it has the highest activation energy.
 *
 * A `-` line is a wrong option and `*` marks a correct one. Two or more `*`
 * lines make it select-all-that-apply, which maps onto the `correct: number[]`
 * the card component already supports. Only `title` is required.
 *
 * Parsing happens in the browser so the uploader sees a real preview before
 * anything is sent, and so the server never needs its own copy of this.
 */

export interface ParseResult {
  deck: StudyDeck | null;
  errors: string[];
  warnings: string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "deck";

/** Answers may contain inline HTML. Anything executable is stripped here. */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, "$1=$2#");
}

export function parseDeckText(text: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalised = text.replace(/\r\n?/g, "\n");
  const split = normalised.indexOf("\n---");
  const headerBlock = split === -1 ? "" : normalised.slice(0, split);
  const body = split === -1 ? normalised : normalised.slice(normalised.indexOf("\n", split + 1) + 1);

  if (split === -1) {
    warnings.push("No `---` divider found, so the whole file was read as questions.");
  }

  const header: Record<string, string> = {};
  for (const line of headerBlock.split("\n")) {
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+?)\s*$/);
    if (m) header[m[1]!.toLowerCase()] = m[2]!;
  }

  const title = header.title?.trim();
  if (!title) errors.push("Missing `title:` in the header. Every deck needs one.");

  let motif = (header.motif?.trim() ?? "erlenmeyer") as ArtMotif;
  if (!ART_MOTIFS.includes(motif)) {
    warnings.push(`Unknown motif "${motif}", using erlenmeyer. Valid: ${ART_MOTIFS.join(", ")}.`);
    motif = "erlenmeyer";
  }

  const questions: Question[] = [];
  const blocks = body.split(/\n\s*\n/).filter((b) => b.trim());

  blocks.forEach((block, i) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const qLine = lines.find((l) => /^q\s*:/i.test(l));
    const aIndex = lines.findIndex((l) => /^a\s*:/i.test(l));

    if (!qLine || aIndex === -1) {
      warnings.push(`Block ${i + 1} skipped: needs both a "Q:" and an "A:" line.`);
      return;
    }

    const q = sanitizeHtml(qLine.replace(/^q\s*:\s*/i, ""));
    // An answer may run past its first line, up to the end of the block.
    const a = sanitizeHtml(
      [lines[aIndex]!.replace(/^a\s*:\s*/i, ""), ...lines.slice(aIndex + 1)].join(" ").trim(),
    );

    const optionLines = lines.filter((l) => /^[-*]\s+/.test(l));
    if (optionLines.length === 0) {
      questions.push({ q, a });
      return;
    }

    const options = optionLines.map((l) => sanitizeHtml(l.replace(/^[-*]\s+/, "")));
    const correct = optionLines
      .map((l, idx) => (l.startsWith("*") ? idx : -1))
      .filter((idx) => idx !== -1);

    if (correct.length === 0) {
      warnings.push(`Block ${i + 1} has options but none marked with "*", so it became a plain card.`);
      questions.push({ q, a });
      return;
    }

    questions.push({
      mc: true,
      q,
      options,
      correct: correct.length === 1 ? correct[0]! : correct,
      a,
    });
  });

  if (questions.length === 0) errors.push("No questions found.");
  if (errors.length > 0 || !title) return { deck: null, errors, warnings };

  const id = `u-${header.id?.trim() ? slug(header.id) : slug(title)}`;

  return {
    deck: {
      id,
      title,
      short: header.short?.trim() || title.replace(/\[[^\]]*\]\s*/g, "").slice(0, 18),
      group: "uploaded",
      titleLines: (header.short?.trim() || title).toUpperCase().split(/\s+/).slice(0, 2),
      subtitle: `${questions.length} questions. Hide the answers, rate your recall, and drill until they stick.`,
      blurb: header.blurb?.trim() || `${questions.length} questions, uploaded from a text file.`,
      motif,
      from: header.from?.trim() || "#4338ca",
      to: header.to?.trim() || "#6d28d9",
      questions,
    },
    errors,
    warnings,
  };
}
