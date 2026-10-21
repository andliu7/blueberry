import "./phone-page.css";

/**
 * #/phone: the course inside a phone frame (owner, 2026-10-21, relayed from the andliu.dev
 * session: "'Open it on your phone' should open the practice tab with the phone-like
 * interface ... an extra tab link that you can't access through just clicking buttons").
 *
 * Reachable only by URL. Nothing on the site links here; andliu.dev's "Open it on your phone"
 * pill does. The phone shows the real game (#/app) in an iframe of this same site, so it is
 * the live app, not a screenshot, and it keeps the visitor's own progress (same origin, same
 * localStorage).
 *
 * The store labels are deliberately NOT buttons: the apps are not listed yet. No link, no
 * pointer, no hover or press state, not focusable, and read by a screen reader as one line of
 * status text. No Apple or Google badge artwork either: their badge rules only allow it for
 * apps that are actually in the store.
 *
 * On a real phone (narrow screen) the frame steps aside: the app fills the screen and the
 * labels sit under it, rather than a phone drawn inside a phone. phone-page.css does that.
 */
export function PhonePage() {
  // Same page, same query, game route. Built from location so it works on localhost and on
  // GitHub Pages under /blueberry/ alike.
  const appSrc = `${window.location.pathname}${window.location.search}#/app`;

  return (
    <main className="phone-page">
      <div className="phone-page__device">
        <div className="phone-page__screen">
          <div className="phone-page__island" aria-hidden="true" />
          <iframe className="phone-page__app" src={appSrc} title="Blueberry, the course" />
        </div>
      </div>

      <p className="phone-page__stores" aria-label="App Store and Google Play: coming soon">
        <span aria-hidden="true">App Store</span>
        <span className="phone-page__dot" aria-hidden="true" />
        <span aria-hidden="true">Google Play</span>
        <span className="phone-page__soon" aria-hidden="true">Coming soon</span>
      </p>
    </main>
  );
}

export default PhonePage;
