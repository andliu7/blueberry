/**
 * The Cards surfaces, in one door.
 *
 * The shell mounts ONE component, CardsHome, and imports it from `cards/ui`
 * rather than from a path that is an implementation detail of this folder.
 * The screens and the pure models behind them are exported too, because the
 * tests address the pure functions and any other surface that wants a single
 * piece (the card face, the run) should not need a second import path.
 *
 * The screens, rebuilt 29 Sep: Home (today and the shelf), DeckScreen, ComposeScreen,
 * Run (the review overlay), and CardFace, the one card every screen draws.
 */

export { CardsHome, adoptMistakeDrafts } from "./CardsHome";
export type { CardsHomeProps } from "./CardsHome";

export { Home, Strip } from "./Home";
export type { HomeProps } from "./Home";

export { DeckScreen } from "./DeckScreen";
export type { DeckScreenProps } from "./DeckScreen";

export { ComposeScreen } from "./ComposeScreen";
export type { ComposeScreenProps } from "./ComposeScreen";

export { Run, GRADE_CHIP, GradeDock } from "./Run";
export type { RunProps } from "./Run";

export { CardFace, Drawing, ReactionScheme, sourceLabel } from "./CardFace";
export type { CardFaceProps } from "./CardFace";

export * from "./session";
export * from "./landing";
export * from "./composer";
export * from "./mastery";
export * from "./cardState";
export * from "./deckView";
export * from "./forecast";
export * from "./predict";
export * from "./runStats";
export * from "./exportDeck";
export * from "./importCsv";
export * from "./importFile";
export * from "./cardsFromBeats";
export { intervalLabel } from "./intervalLabel";
export { knownStructureIds, structureFor, structureIdOf, structureOnCard, STRUCTURE_TAG_PREFIX } from "./cardStructure";
export type { CardStructure } from "./cardStructure";
export { useDeckSnapshot } from "./useDeck";
