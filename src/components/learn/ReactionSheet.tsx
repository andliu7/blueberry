import * as Dialog from "@radix-ui/react-dialog";
import { Dumbbell, PenLine, X } from "lucide-react";
import { ReactionPanel, type ReactionOverrideValues } from "@/components/ui/reaction-panel";
import type { StagedReaction } from "@/data/reactions";
import { LESSON_TOPICS, sectionForFamily } from "@/data/lessonTopics";
import { findUnit, hrefForNode, nodeForReaction, unitForFamily, unitParts } from "@/data/learnMap";

/**
 * The reaction sheet: a reaction card, opened (SITE-REPLAN.md section 3). A bottom
 * sheet on a phone, a side sheet from 1024px, the same shape as the booking sheet.
 *
 * Radix's Dialog under our own styling, because it already moves focus in, keeps
 * Tab inside, closes on Escape and on the scrim, and hands focus back to the card
 * that opened it. Writing that by hand is where sheets usually go wrong.
 *
 * Two actions, as the replan asks: "Draw the product" (the one filled button, at
 * the sheet's foot since Learn round 5) and "Practice this", a text link under it.
 * Practice opens the path node that plays exactly this reaction when one exists;
 * most reactions have none yet (the trainer and the reaction data name things
 * differently, see `nodeForReaction`), so it falls back to the unit's own practice list, and is left out when the student is already on that unit.
 */
export function ReactionSheet({
  reaction,
  onClose,
  canEdit,
  idToken,
  overrides,
  onSaved,
  currentUnit,
}: {
  /** Null keeps the sheet closed. */
  reaction: StagedReaction | null;
  onClose: () => void;
  canEdit: boolean;
  idToken: string | null;
  overrides?: ReactionOverrideValues;
  onSaved?: () => void;
  /** The unit hub the sheet is open on, if any, so it does not link to itself. */
  currentUnit?: string;
}) {
  const unitId = reaction ? unitForFamily(reaction.family) : undefined;
  const unit = unitId ? findUnit(unitId) : undefined;
  const lesson = reaction ? LESSON_TOPICS.find((t) => t.id === sectionForFamily(reaction.family)) : undefined;
  const node = reaction ? nodeForReaction(reaction.id) : undefined;
  const nodeHref = node ? hrefForNode(node) : null;
  const practise = nodeHref
    ? { href: nodeHref, label: "Practice this" }
    : unit && unit.id !== currentUnit
      ? { href: `#/unit/${unit.id}`, label: "Practice this unit" }
      : null;

  return (
    <Dialog.Root open={reaction !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="lrn-scrim" />
        <Dialog.Content className="lrn-sheet" aria-describedby={undefined}>
          {reaction && (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="lrn-eyebrow">
                    {[lesson?.label, unit ? unitParts(unit).number : null].filter(Boolean).join(" · ")}
                  </p>
                  <Dialog.Title className="title-face mt-1 text-2xl leading-tight font-extrabold text-[var(--bb-deep)]">
                    {reaction.name}
                  </Dialog.Title>
                </div>
                <Dialog.Close
                  aria-label="Close"
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bb-deep)] hover:bg-[var(--bb-wash)] focus-visible:outline-3 focus-visible:outline-[var(--ring)]"
                >
                  <X className="size-5" />
                </Dialog.Close>
              </div>

              {/* A `key` that changes with the reaction makes React throw the
                  old panel away and start a new one, back on its Setup side. */}
              <ReactionPanel
                key={reaction.id}
                reaction={reaction}
                canEdit={canEdit}
                idToken={idToken}
                overrides={overrides}
                onSaved={onSaved}
              />

              {/* Learn round 5: one action, at the foot, full width (Brilliant's Start
                  sheet). It sticks to the bottom of the sheet while the chemistry
                  scrolls under it. "Practice" is a text link under it, no longer a
                  second button tier above the drawing. Anchors, not buttons: real
                  routes, so they open in a new tab and back returns here. */}
              <div className="lrn-sheet-foot">
                <a href={`#/draw/${reaction.id}`} className="lrn-btn w-full">
                  <PenLine className="size-4" />
                  Draw the product
                </a>
                {practise && (
                  <a href={practise.href} className="lrn-link inline-flex min-h-11 items-center gap-1.5 self-center text-sm">
                    <Dumbbell className="size-4" aria-hidden />
                    {practise.label}
                  </a>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
