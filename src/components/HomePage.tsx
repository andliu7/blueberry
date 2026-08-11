import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { HomeIntro } from "@/components/HomeIntro";
import { StudyDecksPage } from "@/components/StudyDecksPage";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";

/** The opening and workspace share one route. The intro hands off in place; it
 * never scrolls the document to reveal the hub beneath it. */
export function HomePage() {
  const [entered, setEntered] = useState(false);
  const [openDashboard, setOpenDashboard] = useState(false);
  const reduce = useReducedMotion();
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const enterWorkspace = useCallback(() => {
    setEntered(true);
    setOpenDashboard(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}>
      <motion.div
        aria-hidden={!entered}
        initial={false}
        animate={{ opacity: entered ? 1 : 0, scale: entered ? 1 : 0.975, filter: entered ? "blur(0px)" : "blur(8px)" }}
        transition={reduce ? { duration: 0 } : { duration: 0.42, ease: "easeOut" }}
        className={entered ? "relative" : "pointer-events-none fixed inset-0 overflow-hidden"}
      >
        <StudyDecksPage openDashboard={openDashboard} />
      </motion.div>

      <AnimatePresence>
        {!entered && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto"
            initial={false}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.015, transition: { duration: 0.32, ease: "easeInOut" } }}
          >
            <HomeIntro onSkip={enterWorkspace} onComplete={enterWorkspace} autoAdvanceMs={30000} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HomePage;
