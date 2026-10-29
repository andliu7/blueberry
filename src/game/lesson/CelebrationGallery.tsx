/**
 * Celebration and reaction pages, at #/app/gallery/celebrate?state=lesson
 * (lesson, perfect, unit, comeback, level, first, miss, streak, league). Development only,
 * lazy, never in a student's payload. One calm page each: Bloom, one headline,
 * one line, three tiles, one button at the bottom. The state picker is a thin
 * row of chips at the very top and is not part of the page a student sees.
 */
import { useEffect, useState } from "react";
import { hashParam } from "../app/routes";
import { CELEBRATIONS, type CelebrationId } from "./celebrations";
import { CelebrationPage } from "./CelebrationPage";
import "./celebration.css";

function pick(): CelebrationId {
  const q = hashParam("state");
  return CELEBRATIONS.find((c) => c.id === q)?.id ?? "lesson";
}

export default function CelebrationGallery() {
  const [id, setId] = useState<CelebrationId>(pick);
  useEffect(() => {
    const on = () => setId(pick());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const c = CELEBRATIONS.find((x) => x.id === id) ?? CELEBRATIONS[0]!;
  const reduced = hashParam("rm") === "1" || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  return (
    <div className="celeb-root">
      <nav className="celeb-chips" aria-label="Celebration pages">
        {CELEBRATIONS.map((x) => (
          <a
            key={x.id}
            className="celeb-chip"
            href={`#/app/gallery/celebrate?state=${x.id}`}
            aria-current={x.id === id ? "page" : undefined}
          >
            {x.chip}
          </a>
        ))}
      </nav>
      <CelebrationPage c={c} reducedMotion={reduced} onCta={() => undefined} />
    </div>
  );
}
