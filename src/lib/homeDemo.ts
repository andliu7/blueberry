import { DESTINATIONS, type Destination } from "@/lib/siteNav";

/**
 * The home phone demo's four tabs (SITE-REPLAN.md section 7, beat 2; owner, 7 Oct: Learn,
 * Practice, Review, Schedule).
 *
 * Built from the site's destination list rather than typed, so each tab's "Open" link is the
 * same address the header uses and cannot drift from it. Kept out of the component file so a
 * node test can check the links without rendering anything (src/test/homeDemo.test.ts).
 */
export type DemoTabId = Exclude<Destination["id"], "me">;

export interface DemoTab {
  id: DemoTabId;
  label: string;
  href: string;
  /** The one line under the phone: what this part of the site does. */
  caption: string;
}

const CAPTIONS: Record<DemoTabId, string> = {
  learn: "Each lesson opens onto the reactions it teaches, drawn from their structures.",
  practice: "You push the arrows yourself, and each step comes back named.",
  review: "Flashcards you flip, drawn from the reactions in the lessons.",
  schedule: "Course dates and office hours on one calendar.",
};

const ORDER: readonly DemoTabId[] = ["learn", "practice", "review", "schedule"];

export const DEMO_TABS: readonly DemoTab[] = ORDER.map((id) => {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`homeDemo: no destination "${id}" in siteNav`);
  return { id, label: d.label, href: d.href, caption: CAPTIONS[id] };
});

/** How long each tab plays before the demo moves on by itself, in ms. */
export const DEMO_ADVANCE_MS = 6000;
