/**
 * The student's own activity feed, read from the local journal.
 *
 * Only the student's real events become posts: a lesson cleared (flawless
 * called out), a unit or checkpoint passed, a challenge beaten, a card review
 * finished. Nothing about other people, because nothing about other people is
 * on this device. Pure, so it is testable without a DOM; titles are looked up
 * through the function the caller passes in.
 */

import { daysBetween, localDate, type EconomyEvent } from "@blueberry/economy";
import { plural } from "@/lib/helpers";

export type ActivityKind = "cleared" | "flawless" | "unit" | "quiz" | "challenge" | "cards" | "boss";

export interface ActivityItem {
  readonly key: string;
  readonly kind: ActivityKind;
  readonly text: string;
  /** "Today", "Yesterday" or "3 days ago", in the event's own timezone. */
  readonly when: string;
}

function whenLabel(at: string, tz: string, now: string): string {
  const days = daysBetween(localDate(Date.parse(at), tz), localDate(Date.parse(now), tz));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function post(event: EconomyEvent, titleFor: (id: string) => string | null): { kind: ActivityKind; text: string } | null {
  switch (event.kind) {
    case "node_cleared": {
      const title = titleFor(event.nodeId) ?? "a lesson";
      return event.flawless
        ? { kind: "flawless", text: `Cleared ${title} without a single slip` }
        : { kind: "cleared", text: `Cleared ${title}` };
    }
    case "unit_cleared":
      return { kind: "unit", text: `Finished ${titleFor(event.unitId) ?? "a unit"}` };
    case "quiz_passed":
      return { kind: "quiz", text: event.flawless ? "Aced a checkpoint" : "Passed a checkpoint" };
    case "challenge_passed":
      return { kind: "challenge", text: `Beat the challenge on ${titleFor(event.nodeId) ?? "a lesson"}` };
    case "cards_reviewed":
      return event.graded > 0 ? { kind: "cards", text: `Reviewed ${plural(event.graded, "card", "cards")}` } : null;
    case "boss_cleared":
      return { kind: "boss", text: "Beat a boss level" };
    default:
      return null;
  }
}

/** Newest first, at most `limit` posts. */
export function activityFeed(
  journal: readonly EconomyEvent[],
  titleFor: (id: string) => string | null,
  now: string,
  limit = 8,
): readonly ActivityItem[] {
  const items: ActivityItem[] = [];
  for (let index = journal.length - 1; index >= 0 && items.length < limit; index -= 1) {
    const event = journal[index];
    if (event === undefined) continue;
    // Beta unlocks (?flags=unlockall) stamp their clears at the epoch. They
    // are not wins the student earned, so they never become posts.
    if (!(Date.parse(event.at) > 0)) continue;
    const made = post(event, titleFor);
    if (made === null) continue;
    items.push({ key: `${index}-${event.kind}`, ...made, when: whenLabel(event.at, event.tz, now) });
  }
  return items;
}
