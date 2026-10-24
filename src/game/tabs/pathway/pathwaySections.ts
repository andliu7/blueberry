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
 * follows. A unit with no checkpoints of its own is cut by topic after the
 * lessons SECTION_ENDS names, or, with none named, every CHUNK lessons. Such a
 * section has no checkpoint, so its chest is its test-out's (testOuts.ts).
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

/**
 * Owner decision, 20 Oct: units with no checkpoints of their own are cut by
 * topic into sections of 3 to 5 lessons, and each section ends on its
 * test-out chest (testOuts.ts). Keyed by the LAST main-line lesson of each
 * section; the value is that section's title.
 */
export const SECTION_ENDS: Readonly<Record<string, string>> = Object.freeze({
  // Units 2 and 6 are checkpoint units (unitShape.ts isCheckpointUnit): their
  // lessons are the gate run, so the only section on the road is the side
  // quests, and the title says so (audit 23 Oct, section 5 #4).
  "u2-nomen": "Side quest: naming benzene rings",
  "u3-sulfo": "Directing and the first reactions",
  "u3-blocking": "Friedel-Crafts and blocking",
  "u3-sequencing": "Changing groups and synthesis",
  "u4-lg-order": "Addition-elimination (SNAr)",
  "u5-oxidation": "Reactions of alcohols",
  "u5-epoxidation": "Ethers and epoxides",
  "u5-anti-diol": "Opening epoxides, making diols",
  "u6-uv": "Side quests: 2D NMR and UV-Vis",
  "u7-protect": "Hydrates and acetals",
  "u7-hydride": "Amines, Grignards and hydrides",
  "u7-to-ch2": "Wittig, enones and C=O to CH₂",
  "u8-to-anhydride": "The reactivity ladder",
  "u8-anhydride": "Down the ladder",
  "u8-nitrile": "Hydrolysis and nitriles",
  "u8-decarb": "Reductions and organometallics",
  "u9-enolate-res": "Enols and α-acidity",
  "u9-halo-base": "Enolates and α-halogenation",
  "u9-intra": "The aldol",
  "u9-crossed-claisen": "The Claisen",
  "u9-acetoacetic": "Alkylating enolates",
  "u9-retro": "Conjugate addition and annulation",
  "u10-nitrile-red": "Basicity and reductions to amines",
  "u10-diazo-sub": "Anilines and diazonium salts",
  "u11-phenoxide": "Phenol acidity and phenoxide",
  "u14-orthogonal": "Protecting amino acids",
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
  const title = checkpoint === null ? (SECTION_ENDS[last?.id ?? ""] ?? `Part ${number}`) : (SECTION_TITLES[checkpoint.id] ?? nameFrom(checkpoint.title));
  return { number, title, stops, checkpoint, chestId: checkpoint === null ? null : chestIdFor(checkpoint.id) };
}

export function splitSections<T>(stops: readonly SectionStop<T>[]): readonly PathSection<T>[] {
  const groups: SectionStop<T>[][] = [];
  const cutBy = stops.some((stop) => stop.checkpoint)
    ? (stop: SectionStop<T>) => stop.checkpoint
    : stops.some((stop) => SECTION_ENDS[stop.id] !== undefined)
      ? (stop: SectionStop<T>) => SECTION_ENDS[stop.id] !== undefined
      : null;
  if (cutBy !== null) {
    // Cut after every checkpoint, or in a unit with none, after every lesson
    // SECTION_ENDS names. Lessons after the last cut are their own section.
    let open: SectionStop<T>[] = [];
    for (const stop of stops) {
      open.push(stop);
      if (cutBy(stop)) {
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
