import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useEntitlements } from "@/lib/billing";
import { ADSENSE_CLIENT, ADSENSE_SLOT, PRO_HREF } from "@/lib/ads/adsConfig";
import { clearAdConsent, onAdConsent, readAdConsent, setAdConsent } from "@/lib/ads/consent";
import { loadAdSense, pushAd } from "@/lib/ads/adsense";
import "./ad.css";

/**
 * The inside of an ad slot, a chunk of its own (AdSlot.tsx loads it lazily).
 *
 * In order: nothing until we know whether this is a Pro account; nothing for Pro; a consent
 * card when the viewer has not answered; a one-line "Ads are off" when they said no; the ad
 * itself when they said yes. Google's script is only ever added in that last case.
 */
export default function AdSlotBody({ placement }: { readonly placement: "path" | "feed" | "site" }) {
  const auth = useAuth();
  const ent = useEntitlements();
  // useSyncExternalStore: read a value that lives outside React (localStorage here) and redraw when it changes.
  const consent = useSyncExternalStore(onAdConsent, readAdConsent, () => null);

  // useEntitlements reads "not loading, not Pro" for one render when a user first appears,
  // before its own effect starts the lookup. Waiting one render per user skips that frame,
  // so a Pro account never gets a single ad request.
  const userId = auth.user?.id ?? null;
  const [settledFor, setSettledFor] = useState<string | null | undefined>(undefined);
  useEffect(() => setSettledFor(userId), [userId]);

  const known = !auth.loading && !ent.loading && settledFor === userId;
  if (!known || ent.pro) return null;

  const proLink = (
    <a className="bb-ad__pro" href={PRO_HREF}>
      Remove ads with Pro
    </a>
  );

  if (consent === null) {
    // DRAFT copy for the owner (23 Oct): not final.
    return (
      <aside className="bb-ad bb-ad--ask" data-placement={placement} aria-label="Ads">
        <p className="bb-ad__text">
          Ads help keep Blueberry free. Show ads from Google here? Google may use cookies to pick them.
        </p>
        <div className="bb-ad__actions">
          <button type="button" className="bb-ad__btn bb-ad__btn--yes" onClick={() => setAdConsent("granted")}>
            Allow ads
          </button>
          <button type="button" className="bb-ad__btn" onClick={() => setAdConsent("declined")}>
            No thanks
          </button>
        </div>
        {proLink}
      </aside>
    );
  }

  if (consent === "declined") {
    return (
      <p className="bb-ad bb-ad--off" data-placement={placement}>
        Ads are off. {proLink}{" "}
        <button type="button" className="bb-ad__choices" onClick={clearAdConsent}>
          Ad choices
        </button>
      </p>
    );
  }

  return <AdUnit placement={placement} proLink={proLink} />;
}

/** The ad itself. Its own component so the script loads only once consent is "granted". */
function AdUnit({ placement, proLink }: { readonly placement: string; readonly proLink: ReactNode }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    let live = true;
    loadAdSense(ADSENSE_CLIENT)
      .then(() => {
        if (live && ref.current) pushAd(ref.current);
      })
      .catch(() => {
        /* blocked or offline: the box stays empty under its label */
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <aside className="bb-ad bb-ad--unit" data-placement={placement} aria-label="Advertisement">
      <span className="bb-ad__label">Ad</span>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <span className="bb-ad__foot">
        {proLink}
        <button type="button" className="bb-ad__choices" onClick={clearAdConsent}>
          Ad choices
        </button>
      </span>
    </aside>
  );
}
