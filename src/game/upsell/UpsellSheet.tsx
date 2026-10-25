/**
 * The Pro sheet (owner, 23 Oct, G3): after the first completed lesson, then now
 * and then (upsellRule.ts decides when). Lazy, like the chest sheet, and built
 * from the same parts: a bottom <dialog>, Bloom, a headline, the Press buttons.
 *
 * Shape from Duolingo's Super upsell: one headline about what they just did,
 * one picture, what Pro adds, one solid button, one quiet way out.
 *
 * While Pro is not on sale to everyone, the sheet must not dead-end: staff get
 * the test checkout (the real gate is server side, in stripe-checkout), and
 * everyone else gets an honest "coming soon" and a way to be told.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { CHECKOUT_REFUSALS, startCheckout, useEntitlements, usePlanPrices } from "@/lib/billing";
import { getSupabase } from "@/lib/supabase";
import { localDate } from "@blueberry/economy";
import { deviceZone } from "@/lib/helpers";
import { isStaffRole } from "../admin/staff";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { Press } from "../app/ui/Press";
import { useReducedMotion } from "../app/hooks";
import { Berry } from "../mascot/Berry";
import { closeUpsell, type UpsellOffer } from "./upsellFlow";
import {
  afterAskToHear,
  afterCheckout,
  afterDismiss,
  afterProSeen,
  afterShown,
  deviceStorage,
  loadUpsellState,
  saveUpsellState,
  type UpsellState,
} from "./upsellRule";
import "../charge/charge.css";

/**
 * What Pro adds. EVERY LINE MUST ALSO BE ON THE PRO CARD in
 * src/components/ui/subscription-plans.tsx (upsellCopy.test.ts checks it), so
 * this sheet can never promise a feature the plans card does not.
 *
 * AND EVERY LINE MUST BE SOMETHING PRO ACTUALLY GATES. "No ads" is: AdSlotBody
 * draws nothing for a Pro account. The card's other two lines (mechanism
 * practice, importing notes) are free in the game today, so they stay off this
 * sheet, which every student sees after their first lesson.
 */
export const PRO_VALUE: readonly string[] = ["No ads"];

/** Apply one change to the saved schedule. */
function update(change: (state: UpsellState) => UpsellState): void {
  const storage = deviceStorage();
  saveUpsellState(storage, change(loadUpsellState(storage)));
}

function headline(offer: UpsellOffer): string {
  if (offer.firstLesson) return "You finished your first lesson.";
  if (offer.trigger === "streak" && offer.streakDays !== undefined) return `${offer.streakDays} days in a row.`;
  return "Nice work.";
}

function CheckMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function UpsellSheet({ offer }: { readonly offer: UpsellOffer }) {
  const auth = useAuth();
  const ent = useEntitlements();
  const plans = usePlanPrices();
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDialogElement>(null);
  // Refs, not state: each must happen once and none of them redraws anything.
  const counted = useRef(false);
  const settled = useRef(false);

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [told, setTold] = useState<string | null>(null);

  // Nothing is drawn until we know who this is, so a Pro user never sees a frame.
  const ready = !auth.loading && !ent.loading && !plans.loading && (auth.user === null || auth.profileLoaded);
  const visible = ready && !ent.pro;

  useEffect(() => {
    if (!ready || counted.current) return;
    counted.current = true;
    const today = localDate(Date.now(), deviceZone());
    // A Pro user: close, drawing nothing, and back the schedule off so it stops asking.
    if (ent.pro) {
      update((s) => afterProSeen(s, today));
      closeUpsell();
    } else update((s) => afterShown(s, today));
  }, [ready, ent.pro]);

  // showModal cannot be declared in JSX, so an effect opens the dialog once it is drawn.
  useEffect(() => {
    const dialog = ref.current;
    if (visible && dialog !== null && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
  }, [visible]);

  if (!visible) return null;

  const staff = isStaffRole(auth.role);
  // Same rule as the plans card: on sale to everyone, or staff on test keys, and Stripe can quote it.
  const buyable = (plans.checkoutOpen || staff) && plans.prices.some((p) => p.plan === "pro_monthly");
  const staffTest = buyable && !plans.checkoutOpen;

  /** "Not now", Escape and a backdrop tap. Counted once, then closed. */
  const dismiss = () => {
    if (!settled.current) {
      settled.current = true;
      update(afterDismiss);
    }
    closeUpsell();
  };

  const buy = async () => {
    if (busy) return;
    settled.current = true;
    update(afterCheckout);
    setBusy(true);
    setFailed(null);
    const result = await startCheckout("pro_monthly");
    if (result.ok && result.url) {
      // Stripe hosts the payment page, so this leaves the site on purpose.
      window.location.href = result.url;
      return;
    }
    setBusy(false);
    const error = result.error ?? "";
    setFailed(
      error === "not-signed-in" ? "Sign in first." : (CHECKOUT_REFUSALS[error] ?? (error || "That did not work.")),
    );
  };

  const askToHear = async () => {
    if (busy) return;
    settled.current = true;
    setBusy(true);
    let recorded = false;
    try {
      const supabase = auth.user ? await getSupabase() : null;
      if (supabase && auth.user) {
        const { error } = await supabase.from("pro_interest").insert({ user_id: auth.user.id });
        // 23505 is "already there": they asked before, so it is recorded.
        recorded = error === null || error.code === "23505";
      }
    } catch {
      recorded = false;
    }
    update(afterAskToHear);
    setBusy(false);
    // Never claim an email that was not recorded. A missing table, no session or
    // no network all land here. The device keeps only askedToHear, which quiets
    // lesson reminders, so that is all the fallback line promises.
    const deviceOnly = "Saved on this device. We'll ask less often. It didn't reach us, so no email is coming.";
    setTold(recorded ? "Thanks. We'll email you when Pro opens." : deviceOnly);
  };

  return (
    <dialog
      ref={ref}
      className="charge-sheet"
      data-motion={reducedMotion ? "reduced" : "full"}
      aria-labelledby="upsell-title"
      onClose={dismiss}
      onClick={closeOnBackdrop(ref, dismiss)}
    >
      <div className="charge-panel">
        <span className="charge-grabber" aria-hidden />
        <div className="charge-hero">
          <Berry mood="cheer" behaviour="idle" reducedMotion={reducedMotion} sizePx={72} />
        </div>
        <h2 id="upsell-title" className="charge-headline">
          {headline(offer)}
        </h2>
        <p className="charge-line">Pro is for the parts that cost something to run.</p>
        {PRO_VALUE.map((line) => (
          <p key={line} className="charge-promise">
            <CheckMark className="charge-promise-mark" />
            <span>{line}</span>
          </p>
        ))}

        {told !== null ? (
          <>
            <p className="charge-line" role="status">
              {told}
            </p>
            <Press block size="lg" onClick={closeUpsell} data-upsell="done">
              Done
            </Press>
          </>
        ) : buyable ? (
          <>
            <Press block size="lg" onClick={buy} disabled={busy} data-upsell="checkout" data-track="pro.checkout.paywall" data-cta>
              {busy ? "Opening Stripe" : staffTest ? "Try the test checkout" : "Get Pro"}
            </Press>
            {staffTest && <p className="charge-note">Staff only. Stripe test mode: card 4242 4242 4242 4242, any future date, any CVC.</p>}
            {failed && (
              <p className="charge-note" role="alert">
                {failed}
              </p>
            )}
            <Press block variant="ghost" onClick={dismiss} data-upsell="not-now" data-track="paywall.not_now">
              Not now
            </Press>
          </>
        ) : (
          <>
            <p className="charge-line">Pro is coming soon. Nothing is on sale yet.</p>
            <Press block size="lg" onClick={askToHear} disabled={busy} data-upsell="tell-me" data-track="paywall.tell_me" data-cta>
              Tell me when it opens
            </Press>
            <Press block variant="ghost" onClick={dismiss} data-upsell="not-now" data-track="paywall.not_now">
              Not now
            </Press>
          </>
        )}
        <p className="charge-note">Everything on the site today stays free.</p>
      </div>
    </dialog>
  );
}
