import { PATHWAY_UNITS, type PathwayNode, type PathwayUnit } from "@/game/demo/pathwayMap";
import { hrefForLesson, hrefForTab } from "@/game/app/routes";
import { LESSON_TOPICS, SECTION_FAMILIES, sectionForFamily, type LessonTopic } from "@/data/lessonTopics";
import type { StagedReaction } from "@/data/reactions";

/**
 * WHICH UNIT EACH LESSON BELONGS TO. The one table Learn reads (SITE-REPLAN.md
 * sections 1 and 3: "every lesson section, reaction, deck and path node hangs off
 * a unit, and every count on the site is generated from that one table").
 *
 * ***********************************************************************
 * DRAFT, PENDING THE OWNER'S APPROVAL. Andrew reserved unit content for
 * himself on 17 Sep. Every row below is copied from the proposal in
 * documentation/DRAFTS-2026-10-07.md section 2, which he has NOT approved.
 * When he rules, change the rows here and nothing else: the Learn index,
 * the unit hubs, the lesson breadcrumbs and the search filter all read
 * this table and nothing else.
 * ***********************************************************************
 *
 * HOW A ROW READS. `units` is every unit the lesson opens, first one being the
 * unit its breadcrumb names. Most lessons sit in one unit. Six split across
 * several, because the site grouped by reaction type and the game groups by
 * teaching order (the drafts doc, "No section fits no unit"). Where a lesson
 * splits, `families` says which unit each of its reaction families goes to; a
 * family not listed goes to the first unit.
 *
 * Which LESSON a reaction sits under is not decided here: that is
 * SECTION_FAMILIES in lessonTopics.ts, read from the reaction's family. So
 * Friedel-Crafts acylation and nitration (family aromaticity/eas) sit under
 * Aromaticity, as the owner approved on 7 Oct; diazonium formation and Sandmeyer
 * (amines/...) stay under Amines & sugars, where the data has always filed them,
 * because the owner has NOT decided whether they move to Aromatics (sources say
 * Amines, he said Aromatics). Nothing here moves them.
 */
export interface LearnMapRow {
  /** A lesson section id from LESSON_TOPICS. */
  readonly section: string;
  /** Unit ids from PATHWAY_UNITS, the breadcrumb's unit first. */
  readonly units: readonly string[];
  /** For a split lesson: reaction family to unit. */
  readonly families?: Readonly<Record<string, string>>;
}

export const LEARN_MAP: readonly LearnMapRow[] = [
  // The seam between addition (7) and acyl substitution (8), so it opens both.
  { section: "overview", units: ["u7", "u8"] },
  { section: "alcohols", units: ["u5"] },
  // NBS is Unit 1's side quest; Diels-Alder stays in Unit 1 (outline D5, D10).
  { section: "dienes", units: ["u1"] },
  {
    section: "aromatics",
    units: ["u2", "u3", "u4"],
    families: { "aromaticity/huckel": "u2", "aromaticity/eas": "u3", "aromaticity/nas": "u4" },
  },
  { section: "addition", units: ["u7"] },
  { section: "substitution", units: ["u8"] },
  // The draft also puts Clemmensen and Wolff-Kishner in Unit 3 (u3-c-to-ch2). A
  // reaction sits in one unit here, so that cross-link is not drawn yet.
  {
    section: "reduction",
    units: ["u7", "u8"],
    families: { "carbonyls/reduction": "u7", "derivatives/reduction": "u8" },
  },
  { section: "oxidation", units: ["u5"] },
  {
    section: "nitrogen",
    units: ["u7", "u8", "u10"],
    families: {
      "carbonyls/imine-enamine": "u7",
      "nitriles/formation": "u8",
      "nitriles/hydrolysis": "u8",
      "nitriles/reduction": "u10",
    },
  },
  { section: "enolate", units: ["u9"] },
  // OPEN in the draft: periodic acid cleavage is "5 or 13, your call". Unit 5 is
  // where the game teaches it (u5-diol-cleave), so the draft value is 5.
  {
    section: "amines",
    units: ["u10", "u5"],
    families: { "carbohydrates/oxidation": "u5" },
  },
  // Unit 13 for the cyclic hemiacetal and Haworth drawing, a worked example with
  // no reaction family of its own.
  {
    section: "cycles",
    units: ["u7", "u8", "u13"],
    families: { "carbonyls/protecting-groups": "u7", "derivatives/hydrolysis": "u8" },
  },
];

const ROW = new Map(LEARN_MAP.map((row) => [row.section, row]));

/** The units a lesson opens, breadcrumb unit first. */
export function unitsForLesson(section: string): readonly string[] {
  return ROW.get(section)?.units ?? [];
}

/** The unit a reaction belongs to, from its family. */
export function unitForFamily(family: string): string | undefined {
  const row = ROW.get(sectionForFamily(family));
  if (!row) return undefined;
  return row.families?.[family] ?? row.units[0];
}

/** The lessons a unit opens, in the course's lesson order. */
export function lessonsForUnit(unitId: string): LessonTopic[] {
  return LESSON_TOPICS.filter((t) => unitsForLesson(t.id).includes(unitId));
}

export function findUnit(unitId: string): PathwayUnit | undefined {
  return PATHWAY_UNITS.find((u) => u.id === unitId);
}

/**
 * A unit's picture (Learn round 5): the first reaction of its first lesson that
 * has one, in the unit's lesson order; failing that, any reaction filed under the
 * unit. Undefined for a unit with no reaction in the data yet. Read from the data,
 * so a reaction added there changes the picture without a second edit.
 */
export function unitReaction(unitId: string, reactions: readonly StagedReaction[]): StagedReaction | undefined {
  const mine = reactions.filter((r) => unitForFamily(r.family) === unitId);
  for (const lesson of lessonsForUnit(unitId)) {
    const hit = mine.find((r) => sectionForFamily(r.family) === lesson.id);
    if (hit) return hit;
  }
  return mine[0];
}

/** "Unit 7 · Aldehydes & Ketones: ..." split into its two halves. */
export function unitParts(unit: PathwayUnit): { number: string; name: string } {
  const [number, name] = unit.title.split(" · ");
  return { number: number ?? unit.title, name: name ?? unit.title };
}

/**
 * Where a path node opens in the game, or null when it has nothing to play yet.
 *
 * The same rule as `hrefForPlayable` in src/game/tabs/pathway/PathwayTab.tsx,
 * which is private to the game: a beat is a lesson route, anything else opens
 * the trainer with its id as a parameter INSIDE the hash. Both halves go through
 * routes.ts, so the "#/app" prefix is never typed here. If the game changes how
 * it links a node, change both.
 */
export function hrefForNode(node: PathwayNode): string | null {
  const link = node.playable;
  if (!link) return null;
  if (link.kind === "beat") return hrefForLesson(link.id);
  const param = link.kind === "reaction" ? "reaction" : link.kind === "sequence" ? "sequence" : "hunt";
  return `${hrefForTab("trainer")}?${param}=${encodeURIComponent(link.id)}`;
}

/**
 * The path node that plays exactly this reaction, when one does. Matched on the
 * id only: the trainer's mechanism ids and the reaction data's ids are separate
 * vocabularies that agree on very few names, and guessing a match by name would
 * be a chemistry claim. Where none matches, the sheet offers the unit instead.
 */
export function nodeForReaction(reactionId: string): PathwayNode | undefined {
  for (const unit of PATHWAY_UNITS) {
    const node = unit.nodes.find((n) => n.playable?.kind === "reaction" && n.playable.id === reactionId);
    if (node) return node;
  }
  return undefined;
}

/**
 * S3 ROUND 4: A LESSON SHARED BY SEVERAL UNITS IS READ ONCE PER UNIT.
 *
 * Aromaticity opens Units 2, 3 and 4. Counting it as one lesson meant reading it once
 * put a tick on three units, and Unit 5's "periodic acid" lesson dropped the student
 * into Unit 10's flow. So progress is kept per PART: one lesson as one unit reads it.
 *
 * A part's key is the lesson id in its first (breadcrumb) unit, so every record saved
 * before this change still means what it meant, and `lesson@unit` in any other unit.
 * A part's address is the lesson page with `?unit=` for the non-first units, so the
 * page knows which unit it was opened from (its back link, its menu, its "Up next").
 */
export interface LessonPart {
  readonly lesson: LessonTopic;
  readonly unitId: string;
  /** What the finished and opened records store. */
  readonly key: string;
  /** True when the lesson also opens other units. */
  readonly shared: boolean;
}

export function partKey(lessonId: string, unitId: string | undefined): string {
  const units = unitsForLesson(lessonId);
  return !unitId || units[0] === unitId || !units.includes(unitId) ? lessonId : `${lessonId}@${unitId}`;
}

/** The lesson page as this unit reads it. */
export function partHref(lessonId: string, unitId: string | undefined): string {
  const key = partKey(lessonId, unitId);
  return key === lessonId ? `#/lessons/${lessonId}` : `#/lessons/${lessonId}?unit=${unitId}`;
}

/** A unit's lessons as parts, in the course's lesson order. */
export function partsForUnit(unitId: string): LessonPart[] {
  return lessonsForUnit(unitId).map((lesson) => ({
    lesson,
    unitId,
    key: partKey(lesson.id, unitId),
    shared: unitsForLesson(lesson.id).length > 1,
  }));
}

/** The reactions of one lesson that belong to one unit, in the lesson's family order. */
export function partReactions(
  lessonId: string,
  unitId: string,
  reactions: readonly StagedReaction[],
): StagedReaction[] {
  return (SECTION_FAMILIES[lessonId] ?? []).flatMap((family) =>
    unitForFamily(family) === unitId ? reactions.filter((r) => r.family === family) : [],
  );
}

/**
 * The line a part is named by. The lesson's own label, except a part read from a unit
 * other than its first, which is named by its one reaction when it has exactly one
 * (Unit 5 reads "Periodic acid cleavage", never "Amines & sugars"), else "<lesson>, for
 * Unit 3".
 */
export function partLabel(part: LessonPart, reactions: readonly StagedReaction[]): string {
  if (part.key === part.lesson.id) return part.lesson.label;
  const mine = partReactions(part.lesson.id, part.unitId, reactions);
  if (mine.length === 1) return mine[0]!.name;
  const unit = findUnit(part.unitId);
  return `${part.lesson.label}, for ${unit ? unitParts(unit).number : part.unitId}`;
}
