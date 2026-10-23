/**
 * A stable id from free text: "Jones" gives "jones", "H3O+" gives "h3o".
 *
 * Its own file so the Cards tab can build glossary ids (cardLinks.ts) without
 * importing glossaryModel.ts, which pulls in the whole generated data file.
 */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
