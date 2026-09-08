/**
 * Putting a real structure on the front of a card. Read this header before
 * trusting anything in this file.
 *
 * THE PROBLEM. A chemistry flashcard whose front is only words is a worse
 * card than the same question with the skeleton drawn on it, and the reference
 * deck picker's own card front (docs/reference/competitors/
 * orgosolver-02-flashcard-decks.png, right hand phone) puts the structure
 * above the question for exactly that reason. We already have a renderer that
 * draws structures correctly, apps/web/src/render/svg, and it is the same one
 * the trainer uses, so a card and a lesson never disagree about what acetone
 * looks like.
 *
 * THE PROBLEM WITH THE PROBLEM. `Card` in cards/types.ts has no molecule
 * field, and that file is a contract another builder owns. Widening a shared
 * contract to serve one surface is how contracts stop meaning anything, so
 * this file uses the field the card already has: a TAG. A card tagged
 * `structure:sn2-bromomethane` draws the `sn2-bromomethane` entry from the
 * trainer's reaction registry. Tags are already free text carrying `node:` and
 * concept ids, so this is the same idea one more time rather than a new one.
 *
 * WHY THE FROM STATE AND NOT THE STEP. The renderer animates a step from
 * `progress` 0 to 1. At 0 the arrows have zero opacity and the atoms sit where
 * the reactants sit, so the card front shows the STARTING structures with no
 * mechanism given away. That matters: a card front that draws the answer is
 * not a card. `reducedMotion` is deliberately false here rather than passed
 * through, because that flag makes the renderer jump to a mid step frame,
 * which is right for someone watching an animation and wrong for a still.
 * Nothing on this surface moves either way.
 *
 * Scenes are built once and cached in a module level Map. Building one walks
 * the whole species multiset, and a review session re-renders on every tap.
 */

import type { MechanismStep } from "@blueberry/chem-core";
import type { Card } from "../types";
import { layoutState } from "../../render/layout/layout";
import { buildStepScene, type StepScene } from "../../render/layout/stepScene";
import { TRAINER_REACTIONS } from "../../demo/reactions";

/** A card tagged `structure:<reactionId>` draws that reaction's reactants. */
export const STRUCTURE_TAG_PREFIX = "structure:";

export interface CardStructure {
  readonly step: MechanismStep;
  readonly scene: StepScene;
  /** For the img role's label, so a screen reader gets more than "diagram". */
  readonly label: string;
}

/** The id a card names, or null when it names none. First tag wins. */
export function structureIdOf(card: Card): string | null {
  for (const tag of card.tags) {
    if (tag.startsWith(STRUCTURE_TAG_PREFIX)) {
      const id = tag.slice(STRUCTURE_TAG_PREFIX.length);
      if (id.length > 0) return id;
    }
  }
  return null;
}

const CACHE = new Map<string, CardStructure>();

/**
 * Resolve a structure id to something the renderer can draw.
 *
 * Returns null rather than throwing for an id nothing matches, because a tag
 * is authored text and an authoring typo should cost a card its picture, not
 * the whole review session. The surface renders the words alone in that case.
 */
export function structureFor(id: string): CardStructure | null {
  const cached = CACHE.get(id);
  if (cached !== undefined) return cached;

  const reaction = TRAINER_REACTIONS.find((entry) => entry.id === id);
  if (reaction === undefined) return null;

  const built: CardStructure = {
    step: reaction.step,
    scene: buildStepScene(
      reaction.step,
      layoutState(reaction.step.from, reaction.fromHints),
      layoutState(reaction.step.to, reaction.toHints),
    ),
    label: `${reaction.title}, starting structures`,
  };
  CACHE.set(id, built);
  return built;
}

/** The whole lookup in one call, which is what the card face actually wants. */
export function structureOnCard(card: Card): CardStructure | null {
  const id = structureIdOf(card);
  return id === null ? null : structureFor(id);
}

/** Every id a card could legally name. Useful to an authoring check. */
export function knownStructureIds(): readonly string[] {
  return TRAINER_REACTIONS.map((entry) => entry.id);
}
