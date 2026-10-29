/**
 * The shop, at #/app/shop. Reached from the diamond counter's sheet, not the
 * bar. Streak freezes and decks, paid for with diamonds the student EARNED.
 * There is no real-money row and no random box (shopModel.ts for the rules).
 *
 * Shape, from the layout of the top learning apps' stores (style only): a
 * header with a close key and the balance at top right, a "My Items" row that
 * scrolls sideways, then a list of rows. Tap a row and a bottom sheet asks
 * once: a primary key with the price on it and a plain "No thanks" under it.
 * A row that cannot be bought goes quiet and says how far away it is, which
 * is kinder than a dead button.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deriveEconomy, type EconomyEvent } from "@blueberry/economy";
import { useProgress } from "../app/hooks";
import { economyOptions, progress } from "../app/progress";
import { hrefForTab } from "../app/routes";
import { DiamondMark } from "../app/ui/HudIcons";
import { Press, pressClassName } from "../app/ui/Press";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { adoptSectionDeck, assembleSectionDeck, loadUnitCards } from "../cards/sections/sectionDecks";
import { decks } from "../cards/store";
import {
  DECK_REF_PREFIX,
  DECK_SINK,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_MAX_HELD,
  deckOffer,
  freezeOffer,
  ownedDeckIds,
  progressToward,
  shopDecks,
  type Offer,
  type ShopDeck,
} from "./shopModel";
import { Confetti, DeckStack, IceCrystal, Sparkles } from "./ShopArt";
import "./shop.css";

/* ------------------------------------------------------------------ icons -- */

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className="shop-check" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-4 w-4">
        <path d="M5.5 12.5l4.2 4.2L18.5 8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ parts -- */

function Price({ amount, muted = false }: { readonly amount: number; readonly muted?: boolean }) {
  return (
    <span className="shop-price" data-muted={muted ? "true" : undefined}>
      <DiamondMark className="h-5 w-5" />
      {amount}
    </span>
  );
}

function MyItem({ icon, tone, name, status, empty = false }: { readonly icon: ReactNode; readonly tone: "ice" | "deck"; readonly name: string; readonly status: string; readonly empty?: boolean }) {
  return (
    <li className="shop-item" data-empty={empty ? "true" : undefined}>
      <span className="shop-item-art" data-tone={tone}>
        {icon}
      </span>
      <span className="shop-item-name">{name}</span>
      <span className="shop-item-status">{status}</span>
    </li>
  );
}

function deckHue(id: string, shelf: readonly ShopDeck[]): number {
  const i = shelf.findIndex((d) => d.id === id);
  return i < 0 ? 0 : i;
}

function FreezeHero({ held, offer, onPress }: { readonly held: number; readonly offer: Offer; readonly onPress: () => void }) {
  const quiet = offer.kind !== "buy";
  return (
    <button type="button" className="shop-hero" data-quiet={quiet ? "true" : undefined} data-offer={offer.kind} onClick={onPress}>
      <Sparkles />
      <span className="shop-hero-tag">Streak Freeze</span>
      <span className="shop-hero-art">
        <IceCrystal className="h-full w-full" />
      </span>
      <span className="shop-hero-text">
        <span className="shop-hero-name">Miss a day. Keep your streak.</span>
        <span className="shop-hero-pips" aria-label={`You hold ${held} of ${STREAK_FREEZE_MAX_HELD}`}>
          {Array.from({ length: STREAK_FREEZE_MAX_HELD }, (_, i) => (
            <span key={i} data-on={i < held ? "true" : "false"}>
              <IceCrystal className="h-full w-full" glow={false} />
            </span>
          ))}
          <span className="shop-hero-held">
            You hold {held} of {STREAK_FREEZE_MAX_HELD}
          </span>
        </span>
      </span>
      <span className="shop-hero-buy" data-offer={offer.kind}>
        {offer.kind === "full" ? <span className="shop-word">Full</span> : <Price amount={STREAK_FREEZE_COST} />}
        {offer.kind === "buy" ? <span className="shop-hero-go">Get</span> : null}
      </span>
    </button>
  );
}

function DeckCard({ deck, hue, offer, onPress }: { readonly deck: ShopDeck; readonly hue: number; readonly offer: Offer; readonly onPress: () => void }) {
  const quiet = offer.kind !== "buy";
  return (
    <button type="button" className="shop-card" data-hue={hue % 4} data-quiet={quiet ? "true" : undefined} data-offer={offer.kind} onClick={onPress}>
      <span className="shop-card-art">
        <DeckStack hue={hue} className="h-full w-full" />
      </span>
      <span className="shop-row-name">{deck.title}</span>
      <span className="shop-row-sub">
        {deck.unitLabel} · {deck.cards} cards
      </span>
      <span className="shop-card-buy">
        {offer.kind === "owned" ? <span className="shop-word">Owned</span> : <Price amount={deck.price} />}
        {offer.kind === "buy" ? <span className="shop-card-go">Get</span> : null}
      </span>
      {offer.kind === "short" ? <span className="shop-card-need">{offer.need} to go</span> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ sheet -- */

type Pick = { readonly kind: "freeze" } | { readonly kind: "deck"; readonly deck: ShopDeck };

function BuySheet({
  pick,
  balance,
  held,
  owned,
  onClose,
}: {
  readonly pick: Pick | null;
  readonly balance: number;
  readonly held: number;
  readonly owned: ReadonlySet<string>;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (pick !== null && !dialog.open) {
      setDone(false);
      setBusy(false);
      dialog.showModal();
    }
    if (pick === null && dialog.open) dialog.close();
  }, [pick]);

  const isFreeze = pick?.kind === "freeze";
  const offer: Offer | null =
    pick === null ? null : pick.kind === "freeze" ? freezeOffer(balance, held) : deckOffer(balance, owned.has(pick.deck.id), pick.deck.price);

  const buy = async () => {
    if (pick === null || offer === null || offer.kind !== "buy" || busy) return;
    setBusy(true);
    if (pick.kind === "freeze") {
      progress.spend("streak_freeze", STREAK_FREEZE_COST, "shop");
    } else {
      progress.spend(DECK_SINK, pick.deck.price, `${DECK_REF_PREFIX}${pick.deck.id}`);
      try {
        const seeds = await loadUnitCards(pick.deck.ref.unitId);
        adoptSectionDeck(decks, pick.deck.ref, assembleSectionDeck(pick.deck.ref, seeds));
      } catch {
        // The purchase stands; Cards adopts the deck the first time it is opened.
      }
    }
    setBusy(false);
    setDone(true);
  };

  const name = pick === null ? "" : isFreeze ? "1-day streak freeze" : pick.deck.title;
  const price = offer !== null && (offer.kind === "buy" || offer.kind === "short") ? offer.price : 0;

  return (
    <dialog ref={ref} className="shop-sheet" onClose={onClose} onClick={closeOnBackdrop(ref, onClose)} aria-label={pick === null ? "Shop item" : name}>
      {pick === null || offer === null ? null : (
        <div className="shop-sheet-body">
          <span className="shop-grab" aria-hidden />
          <div className="shop-sheet-top">
            <span className="shop-sheet-eyebrow">{done ? "All yours" : isFreeze ? "Streak Freeze" : pick.deck.unitLabel}</span>
            <span className="shop-balance" aria-label={`${balance} diamonds`}>
              <DiamondMark className="h-5 w-5" />
              {balance}
            </span>
          </div>

          <h2 className="shop-sheet-title">
            {done
              ? isFreeze
                ? "Freeze ready. Your streak has a safety net."
                : "Added to your Cards."
              : isFreeze
                ? "Protect your streak for a day you miss"
                : `Study ${pick.deck.title.toLowerCase()} as a deck`}
          </h2>

          <div className="shop-sheet-art" data-hue={isFreeze ? undefined : deckHue(pick.deck.id, shopDecks()) % 4} data-done={done ? "true" : undefined} data-tone={isFreeze ? "ice" : "deck"}>
            {done ? <><Sparkles /><Confetti /></> : null}
            {isFreeze ? <IceCrystal className="h-full w-full" /> : <DeckStack hue={deckHue(pick.deck.id, shopDecks())} className="h-full w-full" />}
          </div>

          {isFreeze ? (
            <div className="shop-slots" role="img" aria-label={`${done ? held : held} of ${STREAK_FREEZE_MAX_HELD} freezes held`}>
              {Array.from({ length: STREAK_FREEZE_MAX_HELD }, (_, i) => (
                <span key={i} className="shop-slot" data-held={i < held ? "true" : "false"} data-new={done && i === held - 1 ? "true" : undefined}>
                  <IceCrystal className="h-full w-full" glow={false} />
                  <span className="shop-slot-n">{i + 1}</span>
                </span>
              ))}
            </div>
          ) : null}

          {done ? null : (
            <div className="shop-option" aria-label="Selected item">
              <span className="shop-tile shop-tile--sm" data-tone={isFreeze ? "ice" : "deck"}>
                {isFreeze ? <IceCrystal className="h-full w-full" glow={false} /> : <DeckStack hue={deckHue(pick.deck.id, shopDecks())} className="h-full w-full" />}
              </span>
              <span className="shop-row-text">
                <span className="shop-row-name">{name}</span>
                <span className="shop-row-sub">
                  {isFreeze ? `Covers one missed day. You hold ${held} of ${STREAK_FREEZE_MAX_HELD}.` : `${pick.deck.cards} cards, spaced for you`}
                </span>
              </span>
              <Price amount={price} />
              <CheckBadge />
            </div>
          )}

          {offer.kind === "buy" && !done ? <p className="shop-after">You will have {offer.left} diamonds left.</p> : null}
          {offer.kind === "short" ? (
            <div className="shop-short" role="status">
              <span className="shop-meter" aria-hidden>
                <span style={{ width: `${Math.round(progressToward(balance, offer.price) * 100)}%` }} />
              </span>
              <span>
                {offer.need} more diamonds to go. Clearing a lesson earns them.
              </span>
            </div>
          ) : null}
          {offer.kind === "full" && !done ? <p className="shop-after">Both freezes are ready. Each one is used on its own.</p> : null}
          {offer.kind === "owned" && !done ? <p className="shop-after">This deck is already in your Cards.</p> : null}

          <div className="shop-actions">
            {done ? (
              !isFreeze ? (
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
                {isFreeze ? "Get freeze" : "Get deck"}
                <DiamondMark className="h-5 w-5" />
                {offer.price}
              </Press>
            ) : offer.kind === "short" ? (
              <a href={hrefForTab("pathway")} className={pressClassName({ block: true })}>
                Earn diamonds
              </a>
            ) : (
              <Press block disabled>
                {offer.kind === "full" ? "Full" : "Owned"}
              </Press>
            )}
            {done ? (
              !isFreeze ? (
                <button type="button" className="shop-decline" onClick={onClose}>
                  Back to shop
                </button>
              ) : null
            ) : (
              <button type="button" className="shop-decline" onClick={onClose}>
                No thanks
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------- page -- */

export default function ShopPage({ reducedMotion, embedded = false }: { readonly reducedMotion: boolean; readonly embedded?: boolean }) {
  const snapshot = useProgress();
  const [pick, setPick] = useState<Pick | null>(null);
  // The SAME derivation the header counter uses (course denominator included),
  // so the shop and the header can never show two balances for one currency.
  const economy = useMemo(
    () => deriveEconomy(snapshot.journal, new Date().toISOString(), economyOptions(snapshot.course)),
    [snapshot.journal, snapshot.course],
  );
  const balance = economy.diamonds.balance;
  const held = economy.streak.freezes;
  const shelf = useMemo(() => shopDecks(), []);
  const owned = useMemo(() => ownedDeckIds(snapshot.journal as readonly EconomyEvent[]), [snapshot.journal]);
  const ownedDecks = shelf.filter((deck) => owned.has(deck.id));

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
        <span className="shop-balance shop-balance--head" aria-label={`${balance} diamonds`}>
          <DiamondMark className="h-6 w-6" />
          {balance}
        </span>
      </header>

      <main className="shop-main pb-safe">
        <section aria-labelledby="shop-freeze">
          <FreezeHero held={held} offer={freezeOffer(balance, held)} onPress={() => setPick({ kind: "freeze" })} />
        </section>

        {held > 0 || ownedDecks.length > 0 ? (
        <section aria-labelledby="shop-mine">
          <h2 id="shop-mine" className="shop-h2">
            My Items
          </h2>
          <ul className="shop-items">
            {held > 0 ? (
              <MyItem tone="ice" icon={<IceCrystal className="h-full w-full" glow={false} />} name="Streak Freeze" status={`${held} of ${STREAK_FREEZE_MAX_HELD} ready`} />
            ) : null}
            {ownedDecks.map((deck) => (
              <MyItem key={deck.id} tone="deck" icon={<DeckStack hue={deckHue(deck.id, shelf)} className="h-full w-full" />} name={deck.title} status={`${deck.cards} cards`} />
            ))}
          </ul>
        </section>
        ) : null}

        <section aria-labelledby="shop-decks">
          <h2 id="shop-decks" className="shop-h2">
            Decks
          </h2>
          <div className="shop-grid">
            {shelf.map((deck, i) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                hue={i}
                offer={deckOffer(balance, owned.has(deck.id), deck.price)}
                onPress={() => setPick({ kind: "deck", deck })}
              />
            ))}
          </div>
        </section>

        <p className="shop-note">
          <DiamondMark className="h-6 w-6" />
          <span>Every price is paid in diamonds you earn by learning. Nothing here costs real money.</span>
        </p>
      </main>

      <BuySheet pick={pick} balance={balance} held={held} owned={owned} onClose={() => setPick(null)} />
    </div>
  );
}
