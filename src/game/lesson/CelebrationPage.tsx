/**
 * One celebration page: Bloom, one headline, one line, three tiles, one button
 * at the bottom. Used by the real lesson end (LessonPlayer, on the student's
 * own results) and by the dev gallery.
 */
import { Berry } from "../mascot/Berry";
import { Press } from "../app/ui/Press";
import type { Celebration } from "./celebrations";
import { CelebrationHero } from "./CelebrationHero";
import "./celebration.css";

const SPARKS = [0, 1, 2, 3, 4, 5];

export function CelebrationPage({
  c,
  reducedMotion,
  onCta,
}: {
  readonly c: Celebration;
  readonly reducedMotion: boolean;
  readonly onCta: () => void;
}) {
  return (
    <section className="celeb" data-rm={reducedMotion ? "1" : undefined} data-wash={c.wash} data-celebration={c.id} aria-labelledby="celeb-title">
      <div className="celeb-stage">
        {c.sparkles && !reducedMotion
          ? SPARKS.map((i) => <span key={i} className="celeb-spark" style={{ ["--i" as string]: i }} aria-hidden />)
          : null}
        <CelebrationHero key={c.id} c={c} reduced={reducedMotion}>
          <Berry
            mood={c.mood}
            behaviour={c.behaviour}
            sparkleKey={c.sparkles ? 1 : 0}
            reducedMotion={reducedMotion}
            sizePx={c.bloom.size}
          />
        </CelebrationHero>
      </div>
      <div className="celeb-copy">
        <h1 id="celeb-title" className="celeb-title">{c.title}</h1>
        <p className="celeb-line">{c.line}</p>
      </div>
      <ul className="celeb-tiles">
        {c.tiles.map((t, i) => (
          <li key={t.label} className="celeb-tile" data-tone={t.tone} style={{ ["--k" as string]: i }}>
            <span className="celeb-tile-head">{t.label}</span>
            <span className="celeb-tile-value">{t.value}</span>
          </li>
        ))}
      </ul>
      <div className="celeb-foot">
        <Press block size="lg" onClick={onCta}>{c.cta}</Press>
      </div>
    </section>
  );
}

