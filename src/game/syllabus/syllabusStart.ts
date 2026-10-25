/**
 * THE PATH FOLLOWS THE SYLLABUS (STATUS C1): the last layer of pathStatus.
 *
 * It moves START, the one "you are here" marker the guide follows, to the
 * first lesson that is ALREADY OPEN, not cleared and authored in this week's
 * syllabus unit, walking the unit's sections in the student's section order
 * and skipping what they marked not covered. A week whose units are all done
 * goes on to the next units in the syllabus order. With no dated weeks it
 * walks the syllabus order from the top.
 *
 * It NEVER opens or locks anything: the old START becomes "open" (it was
 * playable) and the new one becomes "current" (it was open), so the unlock
 * rule (sectionStarts.ts: the first lesson of every section open, the next
 * gated) is exactly what it was. No plan, or nothing open to point at, and
 * the input comes back unchanged, the same object.
 *
 * Pure and light, in the entry chunk with the pathway.
 */
import type { PathwayUnit } from "../demo/pathwayMap";
import type { MapNodeStatus, MapUnitStatus } from "../tabs/pathway/pathwayState";
import type { GatedPathway } from "../tabs/pathway/reviewCheckpoints";
import { unitSections } from "../tabs/pathway/testOuts";
import { sectionKey, syllabusTarget, todayIso, type SyllabusPlan } from "./syllabusPlan";

/** The lesson START should hang over for this plan, or null to leave START where it is. */
export function syllabusStartNode(units: readonly PathwayUnit[], gated: GatedPathway, plan: SyllabusPlan, today: string, cleared: ReadonlySet<string>): string | null {
  const skip = new Set(plan.notCovered);
  for (const unitId of syllabusTarget(plan, today)) {
    const unit = units.find((entry) => entry.id === unitId);
    if (unit === undefined) continue;
    const sections = unitSections(unit);
    const order = plan.sectionOrder[unitId] ?? [];
    const walk = [...order.flatMap((number) => sections.filter((section) => section.number === number)), ...sections.filter((section) => !order.includes(section.number))];
    for (const section of walk) {
      if (skip.has(sectionKey(unitId, section.number))) continue;
      for (const id of section.sources) {
        const live = gated.status.nodes.get(id);
        if (skip.has(id) || cleared.has(id) || live === undefined || live.queued) continue;
        if (live.state === "open" || live.state === "current") return id;
      }
    }
  }
  return null;
}

/** The status with START moved to this week's syllabus lesson. See the header. */
export function withSyllabusStart(
  units: readonly PathwayUnit[],
  gated: GatedPathway,
  plan: SyllabusPlan | null,
  cleared: ReadonlySet<string>,
  today: string = todayIso(),
): GatedPathway {
  if (plan === null) return gated;
  const target = syllabusStartNode(units, gated, plan, today, cleared);
  const was = gated.status.currentNodeId;
  if (target === null || target === was) return gated;

  const nodes = new Map<string, MapNodeStatus>(gated.status.nodes);
  if (was !== null) {
    const old = nodes.get(was);
    if (old !== undefined && old.state === "current") nodes.set(was, { ...old, state: "open" });
  }
  nodes.set(target, { ...nodes.get(target)!, state: "current" });
  const home = units.find((unit) => unit.nodes.some((node) => node.id === target))?.id;
  const unitStatus = new Map<string, MapUnitStatus>();
  for (const [id, entry] of gated.status.units) unitStatus.set(id, { ...entry, active: id === home });
  return { ...gated, status: { ...gated.status, nodes, units: unitStatus, currentNodeId: target } };
}
