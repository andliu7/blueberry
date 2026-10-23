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
import { CHALLENGE_PARAM, hashParam, hrefForTab, hrefForOnboarding, type Route } from "./app/routes";
import { useProgress, useReducedMotion } from "./app/hooks";
import { TabSkeleton } from "./app/ui/Skeleton";
import { BootReady, Loader } from "./app/Loader";
import { reviewCheckpointFor } from "./tabs/pathway/reviewCheckpoints";
import { progress } from "./app/progress";
import { claimAppOpenGifts, watchEarnedChests } from "./chest/chestFlow";
import { useAuth } from "@/lib/AuthContext";
import { isStaffRole } from "./admin/staff";

const Onboarding = lazy(() => import("./onboarding/Onboarding"));
const BeatRunner = lazy(() => import("./beats/BeatRunner").then((m) => ({ default: m.BeatRunner })));
// The X's "Your progress is saved" sheet (resume/LeaveSheet.tsx), loaded with the lesson.
const LessonLeave = lazy(() => import("./resume/LeaveSheet").then((m) => ({ default: m.LessonLeave })));
// A review checkpoint between lessons (tabs/pathway/reviewCheckpoints.ts) plays its own interleaved run.
const ReviewRun = lazy(() => import("./tabs/pathway/ReviewRun").then((m) => ({ default: m.ReviewRun })));
// A section's chest quiz or a unit exam (tabs/pathway/testOuts.ts) plays its own exam run.
const TestOutRun = lazy(() => import("./tabs/pathway/TestOutRun").then((m) => ({ default: m.TestOutRun })));
/** A test-out id (sectionTestId / unitExamId in tabs/pathway/testOuts.ts), matched here so the entry chunk does not import the map. */
const TEST_OUT_ID = /-(s\d+|unit)-test$/;

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
 * The tapered arrow workbench, at #/gallery/pilot-arrow. Same reasoning as
 * the mascot gallery above: a development surface, lazy so it never lands in
 * a student's payload.
 */
const PilotArrowGallery = lazy(() => import("./tabs/trainer/engine/ArrowGallery"));

/**
 * The trainer engine's workbench, at #/gallery/pilot-trainer. The screen
 * itself is a self-contained { question, onExit } component, so this route
 * is a mount point and nothing else; re-homing "#/trainer" or a lesson onto
 * it later is another mount point. See tabs/trainer/engine/TrainerScreen.tsx.
 */
const PilotTrainerGallery = lazy(() => import("./tabs/trainer/engine/TrainerGallery"));

/**
 * The glossary, at #/app/glossary. Lazy like the tabs: its RDKit drawings and
 * the reaction table are about 25 KB gzipped that a student who never opens it
 * should not download.
 */
const GlossaryPage = lazy(() => import("./glossary/GlossaryPage"));

/** The button and heading sheet, at #/gallery/buttons. Development only, lazy. */
const ButtonGallery = lazy(() => import("./app/ui/ButtonGallery"));

/**
 * The staff lesson viewer, at #/app/admin. Lazy like the glossary, and only
 * mounted for a staff role (AdminGate below), so a student never downloads it.
 */
const AdminViewer = lazy(() => import("./admin/AdminViewer"));

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
  // The staff viewer is exempt for the same reason: an admin on a fresh device
  // opens it to read lessons, not to take the placement quiz.
  const needsOnboarding = !snapshot.onboardingDone && !MEASURING && route.kind !== "gallery" && route.kind !== "admin";
  useEffect(() => {
    if (needsOnboarding && route.kind !== "onboarding") navigate(hrefForOnboarding("welcome"));
  }, [needsOnboarding, route.kind]);

  // CHESTS ARE EARNED AND SAVED (owner, 20 Oct). The watcher lives here, at
  // the root, because a lesson runs outside the Shell: a chest earned there
  // is queued now and offered back on the path (chest/ChestHost.tsx). It is
  // declared before the gift claim so it is already listening when the
  // onboarding gift and today's daily gift land. The measurement scripts get
  // no gifts, so a sheet never sits over the surface they measure.
  useEffect(() => watchEarnedChests(progress), []);
  useEffect(() => {
    // No gift sheet over the staff viewer either.
    if (!needsOnboarding && !MEASURING && route.kind !== "gallery" && route.kind !== "admin") claimAppOpenGifts(progress);
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
    if (route.name === "buttons") {
      return (
        <Suspense fallback={<TabSkeleton label="the button sheet" />}>
          <BootReady />
          <ButtonGallery />
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

  if (route.kind === "admin") return <AdminGate node={route.node} />;

  if (route.kind === "onboarding") {
    return (
      <Suspense fallback={<TabSkeleton label="the placement quiz" />}>
        <BootReady />
        <Onboarding step={route.step} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (route.kind === "lesson" && reviewCheckpointFor(route.node) !== null) {
    return (
      <Suspense fallback={<TabSkeleton label="the review" />}>
        <BootReady />
        <ReviewRun key={route.node} id={route.node} reducedMotion={reducedMotion} onExit={() => navigate(hrefForTab("pathway"))} />
      </Suspense>
    );
  }

  if (route.kind === "lesson" && TEST_OUT_ID.test(route.node)) {
    return (
      <Suspense fallback={<TabSkeleton label="the test-out" />}>
        <BootReady />
        <TestOutRun key={route.node} id={route.node} reducedMotion={reducedMotion} onExit={() => navigate(hrefForTab("pathway"))} />
      </Suspense>
    );
  }

  if (route.kind === "lesson") {
    const challenge = hashParam(CHALLENGE_PARAM) === "1";
    return (
      <Suspense fallback={<TabSkeleton label="the lesson" />}>
        <BootReady />
        {/* Keyed on node AND mode: a key change makes React throw the old
            runner away and mount a fresh one, so a Practice run can never
            carry its progress into a Challenge on the same node. */}
        <LessonLeave
          node={route.node}
          saves={!challenge}
          reducedMotion={reducedMotion}
          onLeave={() => navigate(hrefForTab("pathway"))}
        >
          {(exit) => (
            <BeatRunner
              key={`${route.node}:${challenge ? "challenge" : "practice"}`}
              node={route.node}
              challenge={challenge}
              reducedMotion={reducedMotion}
              onExit={exit}
            />
          )}
        </LessonLeave>
      </Suspense>
    );
  }

  if (needsOnboarding) return <TabSkeleton label="Blueberry" />;

  if (route.kind === "glossary") {
    return (
      <Suspense fallback={<TabSkeleton label="the glossary" />}>
        <BootReady />
        <GlossaryPage entry={route.entry} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  return <Shell route={route} />;
}

/**
 * Who may open the staff viewer. The role is the site's own (useAuth reads
 * public.profiles), so this draws UI only; RLS is the gate on anything that
 * writes. A non-staff visitor is sent to the path and never fetches the chunk.
 */
function AdminGate({ node }: { readonly node: string | null }) {
  const { role, loading, user, profileLoaded } = useAuth();
  // Signed in but the profile row not read yet: the role still reads "member",
  // so wait rather than bounce an admin to the path.
  const waiting = loading || (user !== null && !profileLoaded && !isStaffRole(role));
  const staff = isStaffRole(role);

  // Every hook runs before any early return: React matches hooks by call
  // order, so a hook skipped on one render would break the next.
  useEffect(() => {
    if (!waiting && !staff) navigate(hrefForTab("pathway"));
  }, [waiting, staff]);

  if (waiting || !staff) {
    return (
      <>
        <BootReady />
        <TabSkeleton label="Blueberry" />
      </>
    );
  }
  return (
    <Suspense fallback={<TabSkeleton label="the lesson viewer" />}>
      <BootReady />
      <AdminViewer node={node} />
    </Suspense>
  );
}
