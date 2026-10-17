/**
 * A UNIT READ AS CHAPTERS. Pure: no React, no DOM.
 *
 * Owner, 2026-10-17: "I want more distinct checkpoints inside of each unit bc
 * the unit is quite long looking ... there is a visual break so it doesn't
 * feel like it's continuing forever. treasure boxes should be treasure boxes."
 *
 * So the road is cut into SECTIONS. A section is a short run of lessons that
 * ends on a checkpoint (a stage quiz, or a review stop from
 * reviewCheckpoints.ts). Clearing that checkpoint earns the section's
 * treasure chest, and a divider with the next section's number and name
 * follows. A unit with no checkpoints at all (a draft unit) is cut every
 * CHUNK lessons instead, with dividers and no chests, because there is
 * nothing to earn a chest with.
 */

/** One stop on the road, as the section split needs to see it. */
export interface SectionStop<T> {
  readonly id: string;
  readonly title: string;
  /** A stage quiz or a review stop: it ends a section. */
  readonly checkpoint: boolean;
  readonly item: T;
}

export interface PathSection<T> {
  /** 1-based, for "Section 2". */
  readonly number: number;
  readonly title: string;
  readonly stops: readonly SectionStop<T>[];
  /** The checkpoint that ends this section, or null. */
  readonly checkpoint: SectionStop<T> | null;
  /** The chest the checkpoint earns, or null when nothing ends the section. */
  readonly chestId: string | null;
}

/** Lessons per section in a unit with no checkpoints of its own. */
export const CHUNK = 5;

/**
 * Section names for Unit 1, keyed by the checkpoint that ends the section.
 * Authored here rather than in demo/pathwayMap.ts, which three other lanes
 * share; they are the chapter titles a student reads, not content.
 */
export const SECTION_TITLES: Readonly<Record<string, string>> = Object.freeze({
  "u1-quiz-a": "Resonance and stability",
  "u1-quiz-b": "Adding HX and X₂ to dienes",
  "u1-review-d": "Meet the Diels-Alder",
  "u1-quiz-d": "Diels-Alder products",
});

/** The chest a checkpoint earns. Journalled under this id when opened. */
export function chestIdFor(checkpointId: string): string {
  return `${checkpointId}-chest`;
}

/** A checkpoint's own title with the word "checkpoint" or "check" taken off the end. */
function nameFrom(title: string): string {
  return title.replace(/\s+(concept check|checkpoint|check|review)$/i, "").trim();
}

function sectionOf<T>(number: number, stops: readonly SectionStop<T>[]): PathSection<T> {
  const last = stops[stops.length - 1];
  const checkpoint = last !== undefined && last.checkpoint ? last : null;
  const title = checkpoint === null ? `Part ${number}` : (SECTION_TITLES[checkpoint.id] ?? nameFrom(checkpoint.title));
  return { number, title, stops, checkpoint, chestId: checkpoint === null ? null : chestIdFor(checkpoint.id) };
}

export function splitSections<T>(stops: readonly SectionStop<T>[]): readonly PathSection<T>[] {
  const groups: SectionStop<T>[][] = [];
  if (stops.some((stop) => stop.checkpoint)) {
    // Cut after every checkpoint. Lessons after the last one are their own section.
    let open: SectionStop<T>[] = [];
    for (const stop of stops) {
      open.push(stop);
      if (stop.checkpoint) {
        groups.push(open);
        open = [];
      }
    }
    if (open.length > 0) groups.push(open);
  } else {
    // No checkpoints: as few sections of at most CHUNK as will hold the road,
    // with the lessons shared out evenly so no section is a stub (12 is 4, 4, 4).
    const count = Math.ceil(stops.length / CHUNK);
    let from = 0;
    for (let at = 0; at < count; at += 1) {
      const size = Math.ceil((stops.length - from) / (count - at));
      groups.push(stops.slice(from, from + size));
      from += size;
    }
  }
  return groups.map((group, at) => sectionOf(at + 1, group));
}
