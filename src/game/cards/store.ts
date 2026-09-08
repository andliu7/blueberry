/**
 * The card store. Read this header before trusting anything in this file.
 *
 * THE SEAM, in the same words app/progress.ts and tabs/trainer/mistakes.ts use:
 * localStorage here is a RENDERING CACHE and an OFFLINE DRAFT, never an
 * entitlement and never the record of record. Nothing paid is gated on it.
 * Phase 6 replaces `createLocalDecks` with a Supabase backed source that
 * reconciles this draft against the append only attempt history, and the
 * surfaces do not change because they read the `DeckSource` interface in
 * types.ts rather than this file. A student who edits localStorage has edited
 * a cache.
 *
 * THE STORE SHAPE is `subscribe` plus `getSnapshot`, the same external store
 * shape as app/progress.ts and packages/interaction/src/store.ts. A React
 * surface reads it with `useSyncExternalStore`, which is the built in hook for
 * subscribing to state that lives outside React: it takes the two functions
 * below and re-renders when `subscribe` fires. Nothing in this file imports
 * React, and that is the point of the shape.
 *
 * WHY A SNAPSHOT IS REPLACED AND NEVER MUTATED. `useSyncExternalStore` decides
 * whether to re-render by comparing the object identity of the snapshot. Push
 * a card into the existing object and the identity is unchanged, so the screen
 * does not update and the bug looks like a caching problem three files away.
 * Every write here builds a new snapshot object.
 *
 * THE CAP, same reasoning as mistakes.ts: a semester of drilling must not grow
 * an unbounded blob in a five megabyte store. Over CARD_CAP the OLDEST cards go
 * first, and their review states and deck memberships go with them, so the
 * store cannot hold a schedule for a card that no longer exists. Insertion
 * order is what "oldest" means, which is what a string-keyed object preserves.
 *
 * WHAT THIS FILE DOES NOT DECIDE: intervals. Every scheduling question goes to
 * scheduler.ts, so there is exactly one place where "what does hard do" is
 * answered. The clock is injected for the same reason it is injected there.
 */

import type {
  Card,
  CardId,
  Deck,
  DeckId,
  DeckSnapshot,
  DeckSource,
  Rating,
  ReviewState,
} from "./types";
import { EMPTY_DECKS, externalKey } from "./types";
import { rateCard, startCard } from "./scheduler";

const STORAGE_KEY = "blueberry.cards.v1";

/**
 * Roughly a semester of heavy saving. See the cap note in the header.
 * Exported, and overridable per instance, because a cap that cannot be
 * exercised in a test is a cap that gets silently broken by the next edit.
 */
export const CARD_CAP = 2000;

/** Offers waiting on screen. A backlog of toasts is not a feature. */
const RECO_CAP = 25;

/** Ids of offers the student turned down, kept so the same card is not pushed twice. */
const DISMISSED_CAP = 200;

/**
 * The deck a saved mistake lands in when no other deck is named. Exported
 * because the toast's save button and the deck icon's badge both need to name
 * the same deck, and two string literals in two files is how they stop being
 * the same deck.
 */
export const PERSONAL_DECK_ID: DeckId = "deck-personal";
export const PERSONAL_DECK_TITLE = "My cards";

/**
 * What actually goes into localStorage. It is the snapshot plus one field the
 * snapshot does not carry: the offers already turned down. `DeckSnapshot` is
 * another builder's type and widening it for a private bookkeeping list would
 * put a field on every surface that reads a snapshot, so it lives here.
 */
interface StoredDecks {
  readonly snapshot: DeckSnapshot;
  readonly dismissedCardIds: readonly CardId[];
}

const EMPTY_STORED: StoredDecks = Object.freeze({
  snapshot: EMPTY_DECKS,
  dismissedCardIds: [],
});

function load(): StoredDecks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_STORED;
    const parsed = JSON.parse(raw) as Partial<StoredDecks>;
    return {
      snapshot: { ...EMPTY_DECKS, ...(parsed.snapshot ?? {}) },
      dismissedCardIds: parsed.dismissedCardIds ?? [],
    };
  } catch {
    // Blocked storage, private mode, or a payload from an older shape. A
    // session with no cards still works; it just does not remember.
    return EMPTY_STORED;
  }
}

function save(stored: StoredDecks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage full or blocked: the session still works, it just does not persist */
  }
}

/**
 * Drop the oldest cards past the cap, and everything that pointed at them.
 * Pruning the review states and the deck lists in the same pass is what keeps
 * `dueCount` from counting a schedule whose card is gone.
 */
function trim(snapshot: DeckSnapshot, cap: number): DeckSnapshot {
  const ids = Object.keys(snapshot.cards);
  if (ids.length <= cap) return snapshot;

  const keep = new Set(ids.slice(ids.length - cap));
  const cards: Record<CardId, Card> = {};
  for (const id of keep) {
    const card = snapshot.cards[id];
    if (card !== undefined) cards[id] = card;
  }

  const review: Record<CardId, ReviewState> = {};
  for (const [id, state] of Object.entries(snapshot.review)) {
    if (keep.has(id)) review[id] = state;
  }

  const decks: Record<DeckId, Deck> = {};
  for (const [id, deck] of Object.entries(snapshot.decks)) {
    decks[id] = { ...deck, cardIds: deck.cardIds.filter((cardId) => keep.has(cardId)) };
  }

  return {
    cards,
    decks,
    review,
    pendingRecos: snapshot.pendingRecos.filter((reco) => keep.has(reco.cardId)),
  };
}

function withDeck(snapshot: DeckSnapshot, deckId: DeckId, fallback: Deck): DeckSnapshot {
  if (snapshot.decks[deckId] !== undefined) return snapshot;
  return { ...snapshot, decks: { ...snapshot.decks, [deckId]: fallback } };
}

function addToDeck(deck: Deck, cardId: CardId): Deck {
  if (deck.cardIds.includes(cardId)) return deck;
  return { ...deck, cardIds: [...deck.cardIds, cardId] };
}

/**
 * The local implementation, plus two reads the interface does not carry.
 *
 * They are on this type rather than on `DeckSource` on purpose: `DeckSource` is
 * the contract Phase 6 has to satisfy from a server, and every member added to
 * it is a member the server owes. A dismissed-offer list is device local by
 * nature, so it stays on the local shape and the exported singleton is typed as
 * the narrow interface.
 */
export interface LocalDeckSource extends DeckSource {
  /** Whether this card's offer was already turned down on this device. */
  hasDismissed(cardId: CardId): boolean;
  dismissedCount(): number;
}

export interface LocalDeckOptions {
  /** Injected so tests are deterministic. Nothing here reads the clock directly. */
  now?: () => Date;
  /** Defaults to CARD_CAP. Present so the trim rule is testable at a small size. */
  cardCap?: number;
}

export function createLocalDecks(options: LocalDeckOptions = {}): LocalDeckSource {
  const now = options.now ?? (() => new Date());
  const cardCap = options.cardCap ?? CARD_CAP;

  let stored = load();
  const listeners = new Set<() => void>();

  const commit = (next: StoredDecks): void => {
    stored = { snapshot: trim(next.snapshot, cardCap), dismissedCardIds: next.dismissedCardIds };
    save(stored);
    for (const listener of listeners) listener();
  };

  const commitSnapshot = (snapshot: DeckSnapshot): void => {
    commit({ snapshot, dismissedCardIds: stored.dismissedCardIds });
  };

  return {
    getSnapshot: () => stored.snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    saveCard(card, deckId) {
      // A missing deck is created rather than dropping the save on the floor.
      // A surface that wants a deck with a real title calls createDeck first;
      // the fallback title is the id, which is visible and therefore fixable,
      // where a silently discarded card is neither.
      const base = withDeck(stored.snapshot, deckId, {
        id: deckId,
        title: deckId === PERSONAL_DECK_ID ? PERSONAL_DECK_TITLE : deckId,
        kind: "personal",
        cardIds: [],
      });
      const deck = base.decks[deckId];
      if (deck === undefined) return;

      // A card saved twice keeps the schedule it already earned. Re-saving is
      // how a student fixes a typo on the front, and resetting the interval
      // for that would quietly delete weeks of retention.
      const existingReview = base.review[card.id];
      const review =
        existingReview === undefined
          ? { ...base.review, [card.id]: startCard(card.id, now()) }
          : base.review;

      commitSnapshot({
        cards: { ...base.cards, [card.id]: card },
        decks: { ...base.decks, [deckId]: addToDeck(deck, card.id) },
        review,
        // Saving IS accepting the offer, so the toast for this card retires.
        pendingRecos: base.pendingRecos.filter((reco) => reco.cardId !== card.id),
      });
    },

    offer(reco) {
      const snapshot = stored.snapshot;
      const alreadyOffered = snapshot.pendingRecos.some((r) => r.cardId === reco.cardId);
      const alreadyOwned = snapshot.cards[reco.cardId] !== undefined;
      const alreadyRefused = stored.dismissedCardIds.includes(reco.cardId);
      if (alreadyOffered || alreadyOwned || alreadyRefused) return;

      commitSnapshot({
        ...snapshot,
        pendingRecos: [...snapshot.pendingRecos, reco].slice(-RECO_CAP),
      });
    },

    dismissReco(cardId) {
      const snapshot = stored.snapshot;
      const dismissed = stored.dismissedCardIds.includes(cardId)
        ? stored.dismissedCardIds
        : [...stored.dismissedCardIds, cardId].slice(-DISMISSED_CAP);

      commit({
        snapshot: {
          ...snapshot,
          pendingRecos: snapshot.pendingRecos.filter((reco) => reco.cardId !== cardId),
        },
        dismissedCardIds: dismissed,
      });
    },

    rate(cardId, rating: Rating) {
      const snapshot = stored.snapshot;
      if (snapshot.cards[cardId] === undefined) return;
      const at = now();
      const current = snapshot.review[cardId] ?? startCard(cardId, at);

      // rateCard builds a fresh state with explicit fields, so a suspended
      // flag on `current` does not survive it. That is the resume-on-rating
      // rule from types.ts holding by construction: a student who opens a
      // paused card and rates it has restarted its schedule on purpose.
      commitSnapshot({
        ...snapshot,
        review: { ...snapshot.review, [cardId]: rateCard(current, rating, at) },
      });
    },

    setSuspended(cardId, suspended) {
      const snapshot = stored.snapshot;
      if (snapshot.cards[cardId] === undefined) return;
      const current = snapshot.review[cardId] ?? startCard(cardId, now());
      if ((current.suspended === true) === suspended) return;

      // Resuming DELETES the flag rather than writing false, so a resumed
      // state is byte identical to one that was never paused and the stored
      // blob does not grow a field per card that never uses it.
      const next = suspended
        ? { ...current, suspended: true }
        : (({ suspended: _dropped, ...rest }) => rest)(current);

      commitSnapshot({
        ...snapshot,
        review: { ...snapshot.review, [cardId]: next },
      });
    },

    createDeck(deck) {
      // An existing deck is left exactly as it is. Overwriting would drop the
      // cardIds already in it, and a deck that empties itself when a surface
      // re-declares it on mount is a bug that reads as data loss.
      commitSnapshot(withDeck(stored.snapshot, deck.id, deck));
    },

    importCards(deckId, cards) {
      if (cards.length === 0) return;

      const first = cards[0];
      const firstName =
        first !== undefined && first.source.kind === "import" ? first.source.deckName : deckId;
      let snapshot = withDeck(stored.snapshot, deckId, {
        id: deckId,
        title: firstName,
        kind: "dat",
        cardIds: [],
      });

      // The dedupe index: external key to the id we already store it under.
      // Re-importing the owner's DAT deck must UPDATE those cards, and the
      // update has to keep our id, because the review state points at it.
      const byExternal = new Map<string, CardId>();
      for (const existing of Object.values(snapshot.cards)) {
        const key = externalKey(existing);
        if (key !== null) byExternal.set(key, existing.id);
      }

      const nextCards: Record<CardId, Card> = { ...snapshot.cards };
      const nextReview: Record<CardId, ReviewState> = { ...snapshot.review };
      let deck = snapshot.decks[deckId] ?? { id: deckId, title: firstName, kind: "dat" as const, cardIds: [] };

      for (const incoming of cards) {
        const key = externalKey(incoming);
        const known = key === null ? undefined : byExternal.get(key);
        const id = known ?? incoming.id;

        nextCards[id] = { ...incoming, id };
        if (nextReview[id] === undefined) nextReview[id] = startCard(id, now());
        if (key !== null) byExternal.set(key, id);
        deck = addToDeck(deck, id);
      }

      snapshot = { ...snapshot, cards: nextCards, review: nextReview, decks: { ...snapshot.decks, [deckId]: deck } };
      commitSnapshot(snapshot);
    },

    removeCard(cardId) {
      const snapshot = stored.snapshot;
      if (snapshot.cards[cardId] === undefined) return;

      const cards = { ...snapshot.cards };
      delete cards[cardId];
      const review = { ...snapshot.review };
      delete review[cardId];

      const decks: Record<DeckId, Deck> = {};
      for (const [id, deck] of Object.entries(snapshot.decks)) {
        decks[id] = { ...deck, cardIds: deck.cardIds.filter((held) => held !== cardId) };
      }

      commitSnapshot({
        cards,
        decks,
        review,
        pendingRecos: snapshot.pendingRecos.filter((reco) => reco.cardId !== cardId),
      });
    },

    reset() {
      commit(EMPTY_STORED);
    },

    hasDismissed(cardId) {
      return stored.dismissedCardIds.includes(cardId);
    },

    dismissedCount() {
      return stored.dismissedCardIds.length;
    },
  };
}

/**
 * One instance for the app, module scope, exactly like `progress` in
 * app/progress.ts. Typed as the narrow `DeckSource` so a surface written
 * against it keeps working when Phase 6 swaps a server backed source in.
 */
export const decks: DeckSource = createLocalDecks();
