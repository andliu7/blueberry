/**
 * The two screens after the home page's "Start the first lesson": the entry gate (`#/enter`)
 * and the funnel (`#/start/...`). Split out of the entry bundle in phase 4d of
 * SITE-REPLAN.md, and warmed from home so the press never waits on them.
 *
 * WHY THEY WERE EAGER, AND HOW THIS KEEPS THE PROMISE. App.tsx loaded both eagerly so the
 * frame after the most important press on the site would never be a loading state. They are
 * split now. Since 17 Oct home's buttons skip them and go straight to the game, so nothing
 * warms them; they load only on a direct link to `#/enter` or `#/start`.
 *
 * Warming the chunk is not enough on its own, which was measured, not guessed: `React.lazy`
 * still suspends once on its first render even when the module is already loaded, and React
 * holds a revealed fallback for up to about 300 ms, long enough for LoaderGate to draw its
 * berry (401 ms from press to screen on the production build). So each load also keeps the
 * loaded module here, in `entryModules`, and App.tsx renders the real component directly
 * when it is there. Only a cold deep link goes through `lazy`.
 *
 * One function per chunk, shared by App: the same `import()` specifier is the same chunk,
 * fetched once.
 */
export const entryModules: {
  gate?: typeof import("@/components/EntryGate");
  start?: typeof import("@/components/StartPage");
} = {};

export const loadEntryGate = () => import("@/components/EntryGate").then((m) => (entryModules.gate = m));
export const loadStartPage = () => import("@/components/StartPage").then((m) => (entryModules.start = m));

