/**
 * The shop, at #/app/pathway/shop (and #/app/shop on its own). Energy, streak
 * freezes and flashcard decks, paid for with coins the student EARNED. There
 * is no real-money row and no random box (shopModel.ts for the rules).
 *
 * Shape, after Clash Royale's shop (layout only): sections under a ribbon
 * header, each a shelf of framed tiles three across. A tile reads top to
 * bottom: name, a rarity line in its colour, framed art with the amount
 * printed on it, then the price on a coin key. Prices climb from a 60 coin
 * refill to a whole unit's decks, and the rarity colour climbs with them.
 * Owned and full items say so in place of the price. Tap any tile and one
 * sheet confirms the purchase.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deriveEconomy, type EconomyEvent } from "@blueberry/economy";
import { useProgress } from "../app/hooks";
import { economyOptions, progress } from "../app/progress";
import { hrefForTab } from "../app/routes";
import { CoinCounter, formatCoins } from "../app/ui/CoinCounter";
import { DiamondMark } from "../app/ui/HudIcons";
import { Press, pressClassName } from "../app/ui/Press";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { adoptSectionDeck, assembleSectionDeck, loadUnitCards } from "../cards/sections/sectionDecks";
import { decks } from "../cards/store";
import {
  DECK_REF_PREFIX,
  DECK_SINK,
  ENERGY_PRICE,
  FREEZE_PAIR_PRICE,
  bestValueIndex,
  RARITY_LABEL,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_MAX_HELD,
  dailyDeals,
  deckOffer,
  energyOffer,
  formatCountdown,
  freezeOffer,
  freezePairOffer,
  msUntilNextPick,
  ownedDeckIds,
  progressToward,
  rarityFor,
  setOffer,
  setPrice,
  setStillToBuy,
  shopDecks,
  unitSets,
  type Offer,
  type ShopDeck,
  type UnitSet,
} from "./shopModel";
import { Confetti, DeckArt, EnergyCell, FreezeArt, FreezePair, IceCrystal, Sparkles, UnitChestArt } from "./ShopArt";
import "./shop.css";

/* ------------------------------------------------------------------ icons -- */

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="shop-tick" aria-hidden focusable="false">
      <path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ items -- */

/** One thing on a shelf, whatever it is: what the tile and the sheet both draw. */
interface Item {
  readonly key: string;
  readonly name: string;
  /** The line under the name, after the rarity: "Unit 3", "Boost". */
  readonly kind: string;
  /** The art frame's fill: deck-0 to deck-5, ice, energy. */
  readonly tone: string;
  readonly art: (className: string) => ReactNode;
  /** Printed across the top of the art, the way a bundle shows its amount: "x12". */
  readonly qty?: string;
  /** The pill under the art. */
  readonly badge: string;
  readonly corner?: string;
  /** A shelf mark from the real numbers ("Best value", "Most cards"), never a made-up discount. */
  readonly stamp?: string;
  readonly offer: Offer;
  /** What the key shows. For a set, only the decks still to buy. */
  readonly price: number;
  /** Shown in place of the price when there is nothing to buy. */
  readonly fullLabel: string;
  readonly blurb: string;
  readonly fullNote: string;
  readonly doneText: string;
  readonly toCards: boolean;
  readonly slots: boolean;
  readonly buy: () => Promise<void>;
}

function shortTitle(title: string): string {
  return title.replace(/^Section \d+:\s*/, "");
}

function sectionTag(deck: ShopDeck): string {
  const key = deck.ref.key;
  return /^\d+$/.test(key) ? `S${key}` : key === "side" ? "Side" : "All";
}

async function adoptAll(list: readonly ShopDeck[]): Promise<void> {
  const byUnit = new Map<string, ShopDeck[]>();
  for (const deck of list) byUnit.set(deck.ref.unitId, [...(byUnit.get(deck.ref.unitId) ?? []), deck]);
  for (const [unitId, unitDecks] of byUnit) {
    try {
      const seeds = await loadUnitCards(unitId);
      for (const deck of unitDecks) adoptSectionDeck(decks, deck.ref, assembleSectionDeck(deck.ref, seeds));
    } catch {
      // The purchase stands; Cards adopts the deck the first time it is opened.
    }
  }
}

/* ------------------------------------------------------------------ parts -- */

function Price({ amount }: { readonly amount: number }) {
  return (
    <span className="shop-price">
      <DiamondMark className="shop-price-coin" />
      {formatCoins(amount)}
    </span>
  );
}

/** Clock time in the page, ticking each half minute, for the daily countdown. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Ribbon({ id, tone, title, sub }: { readonly id: string; readonly tone: "deal" | "boost" | "deck"; readonly title: string; readonly sub: ReactNode }) {
  return (
    <header className="shop-ribbon-wrap">
      <h2 id={id} className="shop-ribbon" data-tone={tone}>
        <span>{title}</span>
      </h2>
      <p className="shop-ribbon-sub">{sub}</p>
    </header>
  );
}

/** The key at the foot of a tile: the price on a coin key, or the reason there is none. */
function TileFoot({ item }: { readonly item: Item }) {
  const { offer } = item;
  if (offer.kind === "owned" || offer.kind === "full") {
    return (
      <span className="shop-foot" data-offer={offer.kind}>
        <CheckIcon />
        {item.fullLabel}
      </span>
    );
  }
  return (
    <span className="shop-foot" data-offer={offer.kind}>
      <span className="shop-key">
        <Price amount={item.price} />
      </span>
    </span>
  );
}

/**
 * The framed art. The frame's shape is the rarity: a rounded card for common
 * and rare, cut corners for epic, a six-sided gold frame for legendary.
 */
function ArtFrame({ item, sheet = false, done = false }: { readonly item: Item; readonly sheet?: boolean; readonly done?: boolean }) {
  const gone = item.offer.kind === "owned" || item.offer.kind === "full";
  return (
    <span className={sheet ? "shop-tile-art shop-tile-art--sheet" : "shop-tile-art"}>
      <span className="shop-art-frame">
        <span className="shop-art-inner">
          {item.qty === undefined ? null : <span className="shop-qty">{item.qty}</span>}
          <span className="shop-art-pic" data-done={done ? "true" : undefined}>
            {done ? (
              <>
                <Sparkles />
                <Confetti />
              </>
            ) : null}
            {item.art("shop-art-svg")}
          </span>
        </span>
      </span>
      {!sheet && !gone && item.stamp !== undefined ? <span className="shop-stamp">{item.stamp}</span> : null}
      {!sheet && gone ? (
        <span className="shop-gone" aria-hidden>
          <CheckIcon />
        </span>
      ) : null}
      <span className="shop-badge">{item.badge}</span>
    </span>
  );
}

function Tile({ item, onPress }: { readonly item: Item; readonly onPress: () => void }) {
  const rarity = rarityFor(item.price);
  const { offer } = item;
  const label = `${item.name}. ${RARITY_LABEL[rarity]}, ${item.kind}. ${item.qty ?? item.badge}.${item.stamp === undefined ? "" : ` ${item.stamp}.`} ${
    offer.kind === "owned" || offer.kind === "full" ? item.fullLabel : `${item.price} coins${offer.kind === "short" ? `, ${offer.need} to go` : ""}`
  }`;
  return (
    <button
      type="button"
      className="shop-tile"
      data-shop-tile
      data-rarity={rarity}
      data-offer={offer.kind}
      data-best={item.stamp !== undefined && offer.kind !== "owned" ? "true" : undefined}
      onClick={onPress}
      aria-label={label}
    >
      {item.corner !== undefined ? <span className="shop-corner">{item.corner}</span> : null}
      <span className="shop-tile-head">
        <span className="shop-tile-rarity">{RARITY_LABEL[rarity]}</span>
        <span className="shop-tile-name">{item.name}</span>
        <span className="shop-tile-kind">{item.kind}</span>
      </span>
      <ArtFrame item={item} />
      <TileFoot item={item} />
    </button>
  );
}

/* ------------------------------------------------------------------ sheet -- */

function BuySheet({
  item,
  balance,
  held,
  onClose,
  reducedMotion,
}: {
  readonly item: Item | null;
  readonly balance: number;
  readonly held: number;
  readonly onClose: () => void;
  readonly reducedMotion: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = item !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      setDone(false);
      setBusy(false);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const buy = async () => {
    if (item === null || item.offer.kind !== "buy" || busy) return;
    setBusy(true);
    await item.buy();
    setBusy(false);
    setDone(true);
  };

  const offer = item?.offer ?? null;
  const rarity = item === null ? "common" : rarityFor(item.price);

  return (
    <dialog ref={ref} className="shop-sheet" onClose={onClose} onClick={closeOnBackdrop(ref, onClose)} aria-label={item === null ? "Shop item" : item.name}>
      {item === null || offer === null ? null : (
        <div className="shop-sheet-body" data-rarity={rarity}>
          <span className="shop-grab" aria-hidden />
          <div className="shop-sheet-top">
            <h2 className="shop-ribbon shop-ribbon--sheet" data-tone="sheet">
              <span>{done ? "All yours" : item.name}</span>
            </h2>
            <button type="button" className="shop-sheet-x" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="shop-sheet-stage" data-rarity={rarity}>
            <span className="shop-tile-rarity shop-tile-rarity--sheet">{RARITY_LABEL[rarity]}</span>
            <ArtFrame item={item} sheet done={done} />
          </div>

          <p className="shop-sheet-rarity">{item.kind}</p>
          <p className="shop-sheet-title">{done ? item.doneText : item.blurb}</p>

          {item.slots ? (
            <div className="shop-slots" role="img" aria-label={`${held} of ${STREAK_FREEZE_MAX_HELD} freezes held`}>
              {Array.from({ length: STREAK_FREEZE_MAX_HELD }, (_, i) => (
                <span key={i} className="shop-slot" data-held={i < held ? "true" : "false"}>
                  <IceCrystal className="h-full w-full" glow={false} />
                </span>
              ))}
            </div>
          ) : null}

          <div className="shop-sheet-wallet">
            <span>You have</span>
            <span className="shop-balance" role="img" aria-label={`${balance} coins`}>
              <CoinCounter value={balance} reducedMotion={reducedMotion} mark={<DiamondMark heavy className="h-full w-full" />} />
            </span>
          </div>

          {offer.kind === "buy" && !done ? <p className="shop-after">After this you will have {formatCoins(offer.left)} coins.</p> : null}
          {offer.kind === "short" ? (
            <div className="shop-short" role="status">
              <span className="shop-meter" aria-hidden>
                <span style={{ width: `${Math.round(progressToward(balance, offer.price) * 100)}%` }} />
              </span>
              <span>{formatCoins(offer.need)} more coins to go. Clearing a lesson earns them.</span>
            </div>
          ) : null}
          {(offer.kind === "full" || offer.kind === "owned") && !done ? <p className="shop-after">{item.fullNote}</p> : null}

          <div className="shop-actions">
            {done ? (
              item.toCards ? (
                <a href={hrefForTab("cards")} className={pressClassName({ block: true })}>
                  Open my cards
                </a>
              ) : (
                <Press block onClick={onClose}>
                  Done
                </Press>
              )
            ) : offer.kind === "buy" ? (
              <Press block busy={busy} onClick={() => void buy()}>
                Buy for
                <DiamondMark className="h-6 w-6" />
                {formatCoins(offer.price)}
              </Press>
            ) : offer.kind === "short" ? (
              <a href={hrefForTab("pathway")} className={pressClassName({ block: true })}>
                Earn coins
              </a>
            ) : (
              <Press block disabled>
                {item.fullLabel}
              </Press>
            )}
            <button type="button" className="shop-decline" onClick={onClose}>
              {done ? "Back to shop" : "No thanks"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------- page -- */

export default function ShopPage({ reducedMotion, embedded = false }: { readonly reducedMotion: boolean; readonly embedded?: boolean }) {
  const snapshot = useProgress();
  const now = useNow();
  const [pickKey, setPickKey] = useState<string | null>(null);
  // The SAME derivation the header counter uses (course denominator included),
  // so the shop and the header can never show two balances for one currency.
  const economy = useMemo(
    () => deriveEconomy(snapshot.journal, new Date().toISOString(), economyOptions(snapshot.course)),
    [snapshot.journal, snapshot.course],
  );
  const balance = economy.diamonds.balance;
  const held = economy.streak.freezes;
  const charge = economy.charge;
  const shelf = useMemo(() => shopDecks(), []);
  const sets = useMemo(() => unitSets(), []);
  const owned = useMemo(() => ownedDeckIds(snapshot.journal as readonly EconomyEvent[]), [snapshot.journal]);
  const deals = dailyDeals(shelf, now);
  const unitHue = (unitId: string) => Math.max(0, sets.findIndex((set) => set.unitId === unitId));

  const dealBest = bestValueIndex(deals.map((deck) => ({ amount: deck.cards, price: deck.price })));
  const setMost = bestValueIndex(sets.map((set) => ({ amount: set.cards, price: 1 })));

  const deckItem = (deck: ShopDeck, index: number): Item => ({
    key: `deck:${deck.id}`,
    name: shortTitle(deck.title),
    kind: deck.unitLabel,
    tone: `deck-${unitHue(deck.ref.unitId) % 6}`,
    art: (cls) => (
      <DeckArt hue={unitHue(deck.ref.unitId)} tag={`${deck.unitLabel.replace("Unit ", "U")} · ${sectionTag(deck)}`} molKey={deck.id} cards={deck.cards} shine={index === dealBest} className={cls} />
    ),
    qty: `x${deck.cards}`,
    badge: "1 deck",
    corner: "Today only",
    stamp: index === dealBest ? "Best value" : undefined,
    offer: deckOffer(balance, owned.has(deck.id), deck.price),
    price: deck.price,
    fullLabel: "Owned",
    blurb: `${deck.unitLabel}, ${deck.title.toLowerCase()}. ${deck.cards} flashcards, spaced for you.`,
    fullNote: "This deck is already in your Cards.",
    doneText: "Added to your Cards.",
    toCards: true,
    slots: false,
    buy: async () => {
      progress.spend(DECK_SINK, deck.price, `${DECK_REF_PREFIX}${deck.id}`);
      await adoptAll([deck]);
    },
  });

  const setItem = (set: UnitSet, index: number): Item => {
    const toBuy = setStillToBuy(set, owned);
    const have = set.decks.length - toBuy.length;
    const price = setPrice(set, owned);
    return {
      key: set.id,
      name: set.name,
      kind: `${set.unitLabel} set`,
      tone: `deck-${unitHue(set.unitId) % 6}`,
      art: (cls) => <UnitChestArt hue={unitHue(set.unitId)} decks={set.decks.length} tag={set.unitLabel} molKey={set.id} className={cls} />,
      qty: `x${set.cards}`,
      badge: `${set.decks.length} ${set.decks.length === 1 ? "deck" : "decks"}`,
      corner: have > 0 && toBuy.length > 0 ? `${have}/${set.decks.length} owned` : undefined,
      stamp: index === setMost ? "Most cards" : undefined,
      offer: setOffer(balance, set, owned),
      // Fully owned, the key would read 0; the rarity still reads off the whole set.
      price: price === 0 ? set.decks.length * (set.decks[0]?.price ?? 0) : price,
      fullLabel: "Owned",
      blurb:
        have > 0
          ? `Every ${set.unitLabel} deck, ${set.cards} cards. You own ${have} already, so you pay for the other ${toBuy.length}.`
          : `Every ${set.unitLabel} deck in one go: ${set.decks.length} ${set.decks.length === 1 ? "deck" : "decks"}, ${set.cards} cards.`,
      fullNote: `Every ${set.unitLabel} deck is already in your Cards.`,
      doneText: `${set.unitLabel} is in your Cards, every section.`,
      toCards: true,
      slots: false,
      buy: async () => {
        for (const deck of toBuy) progress.spend(DECK_SINK, deck.price, `${DECK_REF_PREFIX}${deck.id}`);
        await adoptAll(toBuy);
      },
    };
  };

  const missing = Math.max(0, charge.cap - charge.current);
  const boosts: readonly Item[] = [
    {
      key: "energy",
      name: "Energy refill",
      kind: "Boost",
      tone: "energy",
      art: (cls) => <EnergyCell className={cls} />,
      qty: charge.examWindow || missing === 0 ? "Full" : `+${missing}`,
      badge: `${charge.current}/${charge.cap}`,
      offer: energyOffer(balance, charge.current, charge.cap, charge.examWindow),
      price: ENERGY_PRICE,
      fullLabel: "Full",
      blurb: `Fills your energy back to ${charge.cap}, so the next lesson can start now.`,
      fullNote: charge.examWindow ? "Energy is off in the two weeks before your exam. Study as much as you like." : "Your energy is already full.",
      doneText: "Energy full. Go learn something.",
      toCards: false,
      slots: false,
      buy: async () => {
        progress.spend("charge_topup", ENERGY_PRICE, "shop");
      },
    },
    {
      key: "freeze",
      name: "Streak Freeze",
      kind: "Boost",
      tone: "ice",
      art: (cls) => <FreezeArt className={cls} />,
      qty: "x1",
      badge: `${held}/${STREAK_FREEZE_MAX_HELD} held`,
      corner: `${STREAK_FREEZE_MAX_HELD - held}/${STREAK_FREEZE_MAX_HELD} left`,
      offer: freezeOffer(balance, held),
      price: STREAK_FREEZE_COST,
      fullLabel: "Full",
      blurb: "Miss a day and keep your streak. One freeze covers one missed day.",
      fullNote: "Both freezes are ready. Each one is used on its own.",
      doneText: "Freeze ready. Your streak has a safety net.",
      toCards: false,
      slots: true,
      buy: async () => {
        progress.spend("streak_freeze", STREAK_FREEZE_COST, "shop");
      },
    },
    {
      key: "freeze-pair",
      name: "Freeze pair",
      kind: "Boost",
      tone: "ice",
      art: (cls) => <FreezePair className={cls} />,
      qty: `x${STREAK_FREEZE_MAX_HELD}`,
      badge: "2 slots",
      offer: freezePairOffer(balance, held),
      price: FREEZE_PAIR_PRICE,
      fullLabel: held >= STREAK_FREEZE_MAX_HELD ? "Full" : "No room",
      blurb: `Two freezes at once, ${STREAK_FREEZE_COST} coins each. Two missed days covered.`,
      fullNote: held >= STREAK_FREEZE_MAX_HELD ? "Both freezes are ready. Each one is used on its own." : "You hold one already, so only one more fits. Buy a single freeze instead.",
      doneText: "Both slots full. Your streak has two safety nets.",
      toCards: false,
      slots: true,
      buy: async () => {
        for (let i = 0; i < STREAK_FREEZE_MAX_HELD; i += 1) progress.spend("streak_freeze", STREAK_FREEZE_COST, "shop");
      },
    },
  ];

  const dealItems = deals.map(deckItem);
  const setItems = sets.map(setItem);
  const all = [...dealItems, ...boosts, ...setItems];
  const picked = pickKey === null ? null : (all.find((item) => item.key === pickKey) ?? null);

  const close = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign(hrefForTab("pathway"));
  };

  return (
    <div className="shop-page" data-embedded={embedded ? "true" : undefined} data-reduced={reducedMotion ? "true" : undefined}>
      {/* Embedded under the Path header, the header already shows the balance; a second counter here is what once disagreed with it. */}
      <header className="shop-header pt-safe" hidden={embedded}>
        <button type="button" className="shop-close" onClick={close} aria-label="Close shop">
          <CloseIcon />
        </button>
        <h1 className="shop-title">Shop</h1>
        <span className="shop-balance shop-balance--head" role="img" aria-label={`${balance} coins`}>
          <CoinCounter value={balance} reducedMotion={reducedMotion} mark={<DiamondMark heavy className="h-full w-full" />} />
        </span>
      </header>

      <main className="shop-main pb-safe">
        {dealItems.length > 0 ? (
          <section className="shop-section" aria-labelledby="shop-daily">
            <Ribbon
              id="shop-daily"
              tone="deal"
              title="Daily deals"
              sub={
                <>
                  <ClockIcon />
                  New decks in <b>{formatCountdown(msUntilNextPick(now))}</b>
                </>
              }
            />
            <div className="shop-shelf" data-shelf="daily">
              {dealItems.map((item) => (
                <Tile key={item.key} item={item} onPress={() => setPickKey(item.key)} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="shop-section" aria-labelledby="shop-boosts">
          <Ribbon id="shop-boosts" tone="boost" title="Boosts" sub="Energy now, and a streak that survives a missed day." />
          <div className="shop-shelf" data-shelf="boosts">
            {boosts.map((item) => (
              <Tile key={item.key} item={item} onPress={() => setPickKey(item.key)} />
            ))}
          </div>
        </section>

        {setItems.length > 0 ? (
          <section className="shop-section" aria-labelledby="shop-sets">
            <Ribbon id="shop-sets" tone="deck" title="Unit sets" sub="Every deck in a unit. You only pay for the ones you lack." />
            <div className="shop-shelf" data-shelf="sets">
              {setItems.map((item) => (
                <Tile key={item.key} item={item} onPress={() => setPickKey(item.key)} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="shop-note">
          <DiamondMark className="h-5 w-5" />
          <span>Every price is paid in coins you earn by learning. Nothing here costs real money.</span>
        </p>
      </main>

      <BuySheet item={picked} balance={balance} held={held} onClose={() => setPickKey(null)} reducedMotion={reducedMotion} />
    </div>
  );
}
