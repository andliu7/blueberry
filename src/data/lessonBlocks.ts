/**
 * A lesson section's writing, as an ordered list the TA owns.
 *
 * The page used to render four fixed fields per section: title, lead, mechanism,
 * difference. Editing meant a pencil on each of the four, and wanting a fifth
 * box meant a code change. Blocks remove that ceiling: the TA adds, reorders and
 * deletes them, and the shape does not need revisiting when somebody wants one
 * more.
 *
 * Bodies are markdown-lite rather than a rich-text node tree, because the whole
 * list is serialised into one Google Sheet cell. As markdown that cell stays
 * legible to a person who opens the sheet; as a Slate tree it does not.
 */

/**
 * What a box holds. Text unless it says otherwise, so every block written
 * before this field existed still parses as exactly what it was.
 */
export type LessonBlockKind = "text" | "image" | "video";

/**
 * How wide the box sits.
 *
 * `half` is what makes two boxes sit side by side: the page lays blocks out in
 * a two column grid and a `full` block spans both. Kai asked to arrange boxes
 * beside each other or below each other, and this is that choice, per box,
 * rather than a layout mode for the whole page.
 */
export type LessonBlockWidth = "full" | "half";

export interface LessonBlock {
  id: string;
  /** Optional. A block with no heading renders as body text alone. */
  heading?: string;
  /** `**bold**`, `*italic*`, `` `code` ``, `[text](url)`. */
  body: string;
  /** Defaults to `text`. */
  kind?: LessonBlockKind;
  /**
   * For an image or video block: where the file is.
   *
   * Either a public URL from the `lesson-media` bucket, or for video a YouTube
   * or Vimeo link. `body` stays the caption in both cases, so a picture can
   * carry a sentence without needing a second block underneath it.
   */
  src?: string;
  /** Defaults to `full`. */
  width?: LessonBlockWidth;
}

/** The shape `LessonsPage` already holds for a section. */
export interface LessonTopicSource {
  id: string;
  title: string;
  lead: string;
  mechanism: string;
  difference: string;
}

export const newBlockId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * The built-in writing, as blocks.
 *
 * This is what makes the change invisible until somebody edits something: a
 * section with no override renders exactly the text it rendered before. It also
 * means the TA opens the editor onto the real writing rather than a blank page,
 * which is the difference between correcting a sentence and being asked to
 * produce one.
 *
 * `title` stays out of the block list. It is the section's heading, not a box
 * inside it, and folding it in would let a TA delete the thing the page is
 * named after.
 */
export function defaultBlocksFor(topic: LessonTopicSource): LessonBlock[] {
  const blocks: LessonBlock[] = [{ id: `${topic.id}-lead`, body: topic.lead }];
  if (topic.mechanism) {
    blocks.push({ id: `${topic.id}-mechanism`, heading: "Mechanism", body: topic.mechanism });
  }
  if (topic.difference) {
    blocks.push({
      id: `${topic.id}-difference`,
      heading: "What to distinguish",
      body: topic.difference,
    });
  }
  return blocks;
}

/**
 * Parse a stored override. Never throws.
 *
 * Returns null for anything unusable, and the caller falls back to the built-in
 * text. That matters more than it looks: the value is JSON in a sheet cell, so
 * it can be truncated by a length cap, hand-mangled by someone editing the
 * sheet directly, or left over from an older shape. A section quietly showing
 * its original writing is a far better failure than a blank one.
 */
export function parseBlocks(raw: unknown): LessonBlock[] | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const blocks: LessonBlock[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const body = typeof row.body === "string" ? row.body : "";
    const heading = typeof row.heading === "string" ? row.heading.trim() : "";
    const kind: LessonBlockKind =
      row.kind === "image" || row.kind === "video" ? row.kind : "text";
    const src = typeof row.src === "string" ? row.src.trim() : "";

    // A block with nothing in it is an empty box; drop it rather than render a
    // gap somebody has to work out how to delete. A media block counts as full
    // when it has a source, even with no caption and no heading, because the
    // picture is the content.
    const empty = kind === "text" ? !body.trim() && !heading : !src;
    if (empty) continue;

    blocks.push({
      id: typeof row.id === "string" && row.id ? row.id : newBlockId(),
      heading: heading || undefined,
      body,
      kind,
      src: src || undefined,
      width: row.width === "half" ? "half" : "full",
    });
  }
  return blocks.length > 0 ? blocks : null;
}

/** What goes in the `course_overrides` row. */
export const serialiseBlocks = (blocks: LessonBlock[]) =>
  JSON.stringify(
    blocks
      .filter((b) =>
        (b.kind ?? "text") === "text"
          ? b.body.trim() !== "" || (b.heading ?? "").trim() !== ""
          : Boolean(b.src?.trim()),
      )
      .map((b) => ({
        id: b.id,
        heading: b.heading || undefined,
        body: b.body,
        // Omitted when they are the defaults, so a page of plain text
        // serialises to exactly what it did before these fields existed.
        kind: (b.kind ?? "text") === "text" ? undefined : b.kind,
        src: b.src || undefined,
        width: (b.width ?? "full") === "full" ? undefined : b.width,
      })),
  );

/**
 * A sanity ceiling on one section's JSON.
 *
 * This was 5000 because Apps Script silently truncated a sheet cell at that
 * length, and truncating serialised JSON destroys the whole list rather than
 * the tail of a sentence. The store is a Postgres `text` column now, which has
 * no such limit, but a cap is still worth keeping: it is the difference between
 * a TA pasting an entire textbook chapter and finding out later.
 *
 * Raised because image and video blocks carry URLs, and a bucket URL is around
 * 120 characters. Ten pictures in a section is 1200 characters of nothing but
 * addresses, which the old ceiling did not allow for.
 */
export const MAX_BLOCKS_LENGTH = 20000;
