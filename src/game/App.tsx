/**
 * The root. Reads the hash route once, and either runs onboarding or renders
 * the shell around the current tab.
 *
 * Onboarding is lazy for the same reason the tabs are: a returning student
 * never downloads it. A first visit with no stored progress is redirected into
 * it; skipping is always available inside and leads to the trainer, not to a
 * wall, per BUILD-PROMPT.md Phase 5.
 *
 * The URL flags the Phase 4 measurement scripts rely on (?auto=1, ?stats=1,
 * ?renderer=3d) are read by the trainer tab, which is where the canvas lives,
 * so `measure:headless` and `measure:device` keep working against the default
 * route.
 */

import { lazy, Suspense, useEffect } from "react";
import { Shell } from "./app/Shell";
import { useHashRoute, navigate } from "./app/useHashRoute";
import { hrefForTab, hrefForOnboarding, type Route } from "./app/routes";
import { useProgress, useReducedMotion } from "./app/hooks";
import { TabSkeleton } from "./app/ui/Skeleton";
import { BootReady, Loader } from "./app/Loader";

const Onboarding = lazy(() => import("./onboarding/Onboarding"));
const BeatRunner = lazy(() => import("./beats/BeatRunner").then((m) => ({ default: m.BeatRunner })));

/**
 * The mascot gallery, a development surface at #/gallery/berry.
 *
 * Lazy for the same reason everything else here is, and for one more: it
 * imports every state, every costume and a control panel, none of which a
 * student ever sees. React.lazy puts the whole subtree in its own chunk, so
 * the game route's initial payload does not reach it and the budget gate in
 * packages/validators keeps measuring the app rather than the workbench.
 */
const BerryGallery = lazy(() => import("./mascot/BerryGallery"));

/**
 * The pilot arrow workbench, at #/gallery/pilot-arrow. Same reasoning as the
 * mascot gallery above: a development surface, lazy so it never lands in a
 * student's payload.
 */
const PilotArrowGallery = lazy(() => import("./pilot/PilotGallery"));

/**
 * The pilot gameplay screen's workbench, at #/gallery/pilot-trainer. The
 * screen itself is a self-contained { problem, onExit } component, so this
 * route is a mount point and nothing else; re-homing "#/trainer" or a lesson
 * onto it later is another mount point. See pilot/screen/PilotScreen.tsx.
 */
const PilotTrainerGallery = lazy(() => import("./pilot/screen/PilotTrainerGallery"));

const params = new URLSearchParams(window.location.search);
/** The measurement scripts need the canvas with no onboarding in front of it. */
const MEASURING = params.get("auto") === "1" || params.get("stats") === "1" || params.get("targets") === "1";

export default function App() {
  const route = useHashRoute();
  const snapshot = useProgress();
  const reducedMotion = useReducedMotion();

  // The gallery is exempt from the onboarding redirect: it is a development
  // surface whose audience is a critic with a fresh profile, and a workbench
  // that first demands a placement quiz is a workbench nobody reaches.
  const needsOnboarding = !snapshot.onboardingDone && !MEASURING && route.kind !== "gallery";
  useEffect(() => {
    if (needsOnboarding && route.kind !== "onboarding") navigate(hrefForOnboarding("welcome"));
  }, [needsOnboarding, route.kind]);

  // THE FRONT DOOR WRAPS EVERY ROUTE. The loader is a fixed layer over the
  // whole app, and the app renders underneath it the whole time, which is what
  // makes the reveal a reveal: the page behind the field was already in
  // position and at rest before the field parted. See app/Loader.tsx.
  //
  // <BootReady/> sits inside each Suspense boundary rather than beside it. A
  // component inside a boundary does not mount until every sibling in that
  // boundary has resolved, so its first effect is the honest moment "the page
  // behind the loader is now in position".
  return (
    <>
      <Loader reducedMotion={reducedMotion} />
      <Body route={route} reducedMotion={reducedMotion} needsOnboarding={needsOnboarding} />
    </>
  );
}

function Body({
  route,
  reducedMotion,
  needsOnboarding,
}: {
  readonly route: Route;
  readonly reducedMotion: boolean;
  readonly needsOnboarding: boolean;
}) {
  if (route.kind === "gallery") {
    // The gallery route already carries a name (routes.ts parses it); until now
    // every name landed on the mascot. Branching on it here is the whole wiring
    // the pilot needs, and it touches no trainer file.
    if (route.name === "pilot-arrow") {
      return (
        <Suspense fallback={<TabSkeleton label="the arrow workbench" />}>
          <BootReady />
          <PilotArrowGallery />
        </Suspense>
      );
    }
    if (route.name === "pilot-trainer") {
      return (
        <Suspense fallback={<TabSkeleton label="the pilot trainer" />}>
          <BootReady />
          <PilotTrainerGallery />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<TabSkeleton label="the mascot gallery" />}>
        <BootReady />
        <BerryGallery reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (route.kind === "onboarding") {
    return (
      <Suspense fallback={<TabSkeleton label="the placement quiz" />}>
        <BootReady />
        <Onboarding step={route.step} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (route.kind === "lesson") {
    return (
      <Suspense fallback={<TabSkeleton label="the lesson" />}>
        <BootReady />
        <BeatRunner
          node={route.node}
          reducedMotion={reducedMotion}
          onExit={() => navigate(hrefForTab("pathway"))}
        />
      </Suspense>
    );
  }

  if (needsOnboarding) return <TabSkeleton label="Blueberry" />;

  return <Shell route={route} />;
}
