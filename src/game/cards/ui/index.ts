/**
 * The deck surfaces, in one door.
 *
 * A barrel file exists here for one reason: the shell mounts ONE screen,
 * CardsHome, and should import it from `cards/ui` rather than from a path
 * that is an implementation detail of this folder. Everything else in the
 * folder is exported too, because the pure functions are what the tests
 * address and a barrel that hides them would just be a second import path to
 * remember.
 *
 * CardsHome owns the four design-goals faces and the transitions between
 * them: CardsLanding (the Due-today decision), Composer (the three-sided
 * card), DeckTray (the fanned browser), ReviewSession (the loop). The
 * earlier screens stay exported and real: MyDeck is the deck-management hub
 * the CSV import and export flows live on, DeckPicker the choose-first
 * session builder; nothing links to them from the tab today, and their
 * flows' tests keep running against them until those surfaces are re-homed.
 */

export { MyDeck, hubHeadline, hubSubline } from "./MyDeck";
export type { MyDeckProps } from "./MyDeck";

export { DeckPicker } from "./DeckPicker";
export type { DeckPickerProps } from "./DeckPicker";

export { ReviewSession } from "./ReviewSession";
export type { ReviewSessionProps } from "./ReviewSession";

export { CardFace } from "./CardFace";
export type { CardFaceProps } from "./CardFace";

export {
  DECK_KIND_LABELS,
  SCOPE_LABELS,
  buildSession,
  deckRowSubtitle,
  deckRows,
  selectAll,
  selectNone,
  startLabel,
  toggleDeck,
} from "./picker";
export type { DeckRow, SessionOptions, SessionScope } from "./picker";

export {
  REVIEW_DIAMONDS_CAP,
  REVIEW_DIAMONDS_PER_CARD,
  currentCard,
  currentCardId,
  isFinished,
  rateCurrent,
  reveal,
  reviewDiamonds,
  sessionCounter,
  sessionProgress,
  sessionSummary,
  startSession,
  summaryHeadline,
  summaryLine,
} from "./session";
export type { RatingRecord, RatingOutcome, ReviewSessionState, SessionSummary } from "./session";

export {
  CARDLESS_BEAT_KINDS,
  cardFromBeat,
  cardIdForBeat,
  deckFromPlaylist,
  deckIdForLesson,
  skippedBeatsNote,
} from "./cardsFromBeats";
export type { GeneratedDeck } from "./cardsFromBeats";

export {
  APKG_EXPORT_NOTE,
  CSV_HEADER,
  DECK_EXPORT_FORMAT,
  DECK_EXPORT_VERSION,
  csvField,
  csvNote,
  csvTags,
  deckExport,
  downloadFile,
  safeFilename,
  toCsv,
  toJson,
} from "./exportDeck";
export type { DeckExport, ExportedCard } from "./exportDeck";

export {
  APKG_IMPORT_NOTE,
  columnsFrom,
  guessSeparator,
  importCsv,
  importIdNote,
  importSummary,
  importedCardId,
  looksLikeHeader,
  parseDelimited,
  stripHtml,
} from "./importCsv";
export type { ColumnMap, ImportOptions, ImportReport, SkippedRow } from "./importCsv";

export { deckNameFromFilename, readDeckFile } from "./importFile";
export type { ImportFileOptions, ImportResult } from "./importFile";

export { intervalLabel } from "./intervalLabel";
export { knownStructureIds, structureFor, structureIdOf, structureOnCard, STRUCTURE_TAG_PREFIX } from "./cardStructure";
export type { CardStructure } from "./cardStructure";
export { useDeckSnapshot } from "./useDeck";

/* The design-goals faces, added by the R rebuild. CardsHome is the one the
   shell mounts; the rest are exported for tests and for any surface that
   wants a single face (a lesson end linking straight into the composer). */

export { CardsHome, adoptMistakeDrafts } from "./CardsHome";
export type { CardsHomeProps } from "./CardsHome";

export { CardsLanding } from "./CardsLanding";
export type { CardsLandingProps } from "./CardsLanding";

export { Composer, DEFAULT_DECK_TITLE } from "./CardComposer";
export type { ComposerProps } from "./CardComposer";

/* The measured fill-height hook the composer sizes its column with. Exported
   because any surface whose last row has to stay above the tab bar wants it,
   and copying a header height into a second file is how one of them goes
   stale. See its own header. */
export { BOTTOM_RESERVE_FALLBACK, MIN_FILL_HEIGHT, useFillHeight } from "./useFillHeight";
export type { FillHeight } from "./useFillHeight";

export { DeckTray } from "./DeckTray";
export type { DeckTrayProps, TrayKind } from "./DeckTray";

export { AutoBolt, DeckDoodle, DOODLE_VARIANTS, TrayScene } from "./Doodles";
export type { DeckDoodleProps } from "./Doodles";

export {
  PROP_EXTENT,
  SCENE_ARC_TOP,
  SCENE_FAN_TOP,
  SCENE_HEIGHT,
  SCENE_LIFT_COLUMN,
  SCENE_PALETTE,
  SCENE_PROPS,
  SCENE_VIEWBOX,
  SCENE_WIDTH,
  propBox,
} from "./scene";
export type { PropBox, PropTone, SceneProp, ScenePropKind } from "./scene";

export {
  DOODLE_COUNT,
  distinctDoodles,
  MISTAKES_DECK_ID,
  MISTAKES_DECK_TITLE,
  doodleFor,
  heroModel,
  lessonDeckTiles,
  mistakeDeckCards,
  myDeckTiles,
  reviewQueue,
} from "./landing";
export type { DeckTile, HeroModel, TileMarker } from "./landing";

export {
  EMPTY_SIDES,
  SIDE_HINTS,
  SIDE_LABELS,
  SIDE_ORDER,
  canSave,
  cardFromDraft,
  composedCardId,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  setSide,
} from "./composer";

export {
  LEARNING_MASTERY,
  MASTERY_DOTS,
  MATURE_INTERVAL_DAYS,
  cardMastery,
  deckMastery,
  masteryDots,
} from "./mastery";

export {
  FAN_CARD_BORDER,
  FAN_CARD_H,
  FAN_CARD_PAD_X,
  FAN_CARD_W,
  FAN_DROOP_RATE,
  FAN_EDGE_GUTTER,
  FAN_LIFT,
  FAN_LIFT_SCALE,
  FAN_MAX,
  FAN_NAME_OVERHANG,
  FAN_NAME_STRIP,
  FAN_OVERLAP,
  FAN_REFERENCE_WIDTH,
  FAN_ROT_MAX,
  FAN_ROT_SPAN,
  FAN_X_STEP_MAX,
  TRAY_ART,
  fanCapacity,
  fanCards,
  fanLayout,
  fanNameFloor,
  fanNameShift,
  fanStep,
  nameWidthPx,
  rotatedHalfWidth,
  trayCard,
  trayDeckExposure,
  trayLabel,
  trayTitle,
} from "./tray";
export type { FanSlot, TrayCardBox } from "./tray";

export { TrayArt } from "./TrayArt";
export type { TrayArtProps } from "./TrayArt";

export { CARD_STATE_LABELS, cardSchedulerState } from "./cardState";
export type { CardSchedulerState } from "./cardState";

export { StateBadge } from "./StateBadge";
export type { StateBadgeProps } from "./StateBadge";
