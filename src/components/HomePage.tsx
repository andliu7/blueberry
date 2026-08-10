import { useCallback, useRef } from "react";
import { HomeIntro } from "@/components/HomeIntro";
import { StudyDecksPage } from "@/components/StudyDecksPage";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";

/** The opening animation scrolls into the established Study Decks hub. */
export function HomePage() {
  const deckHubRef = useRef<HTMLElement>(null);
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const showDeckHub = useCallback(() => {
    deckHubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="overflow-x-clip" style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}>
      <HomeIntro onSkip={showDeckHub} onComplete={showDeckHub} autoAdvanceMs={30000} />
      <main ref={deckHubRef}>
        <StudyDecksPage />
      </main>
    </div>
  );
}

export default HomePage;