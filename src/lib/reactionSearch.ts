import { REACTIONS } from "@/data/reactions";
import { sectionForFamily } from "@/data/lessonTopics";
import type { Feature } from "@/lib/featureIndex";

/**
 * Every validated reaction, as something you can search for.
 *
 * Typing "aldol" used to return the Lessons page, on the strength of the word
 * "mechanism" in its blurb. That is the search telling you roughly where the
 * building is when you asked for a room in it: the reactions are the most
 * specific thing on this site and they were the one thing not indexed.
 *
 * Built from `REACTIONS` rather than written by hand, so a reaction added by
 * the generator is searchable the moment it exists and cannot fall out of sync
 * with a list somebody has to remember to update.
 */

/**
 * Words somebody would type that are not in the reaction's own name.
 *
 * Deliberately mechanical: the family, the reaction type and the reagent labels
 * that the data already carries. Nothing here is a chemistry claim of mine -
 * every string comes from the generated file, which was built and checked by
 * the RDKit pipeline. Inventing synonyms is exactly where a wrong one would get
 * in, so "self aldol" and "crossed aldol" are matched by the words already in
 * the names rather than by a table I made up.
 */
function keywordsFor(r: (typeof REACTIONS)[number]): string[] {
  const words = new Set<string>();

  // `derivatives/substitution` -> `derivatives`, `substitution`.
  for (const part of r.family.split("/")) words.add(part);
  if (r.reaction_type) words.add(r.reaction_type.toLowerCase());

  // The names of what goes in and what comes out. Searching for the product is
  // a real way people look for a reaction: "how do I make benzoic acid".
  for (const label of [...(r.reactant_labels ?? []), r.product_label]) {
    if (typeof label === "string" && label.trim()) words.add(label.toLowerCase());
  }

  words.add("reaction");
  words.add("mechanism");
  return [...words];
}

/**
 * Where a reaction opens.
 *
 * `#/lessons/<section>/<id>` puts you in the written section with that
 * reaction's panel already open, which is the page that has the reagents, the
 * conditions, the stages and the product. Sending people to a bare reaction
 * list instead would be one more click to the thing they named.
 */
export const reactionHref = (id: string, family: string) =>
  `#/lessons/${sectionForFamily(family)}/${id}`;

export function reactionFeatures(): Feature[] {
  return REACTIONS.map((r) => ({
    id: `reaction:${r.id}`,
    label: r.name,
    blurb:
      r.reactant_labels?.length && r.product_label
        ? `${r.reactant_labels.join(" + ")} to ${r.product_label}`
        : r.reaction_type || "Reaction",
    kind: "reaction" as const,
    href: reactionHref(r.id, r.family),
    keywords: keywordsFor(r),
  }));
}
