/**
 * The short form video slot inside a lesson, per the content pipeline rules in
 * CLAUDE.md: never autoplaying with sound, always skippable, transcript stored
 * with the video, and the lesson stands without it.
 *
 * Today no video exists, so this renders the slot with the real chrome and
 * says "Template" on its face, the same honesty the sibling repo's
 * lesson-video.tsx practises: a convincing placeholder that is not marked as
 * one is a trap for whoever opens the page next. When a clip lands, `src`
 * becomes a real URL and the <video> element below takes over: `muted` by
 * default, `controls` on, no `autoplay` attribute, ever.
 *
 * THE UNFILMED SLOT IS A STRIP, NOT A HERO, and that is a measured fix rather
 * than a taste one. The placeholder used to render at the real player's 16:9,
 * which on a 390 by 844 phone is about 220 CSS pixels of near-black card
 * sitting between the lesson's top bar and its question: the first thing the
 * student sees on a free lesson was a rectangle saying nothing is filmed, and
 * the question itself opened below the fold. CLAUDE.md's content pipeline is
 * explicit that "nothing in the free tier depends on video being present, so
 * lessons must stand without them"; a slot that costs a quarter of the screen
 * to say it is empty is that lesson not standing. So the UNFILMED state is a
 * one-row strip that keeps every promise the hero kept (it is marked as a
 * template, it names the concept, it is skippable, the transcript is reachable)
 * and gives the room back to the chemistry. A REAL clip keeps the 16:9 player,
 * because then the room is buying something.
 */

import { useState } from "react";

export interface LessonVideoProps {
  readonly title: string;
  readonly src?: string;
  readonly transcript?: string;
  readonly onSkip: () => void;
}

export function LessonVideo({ title, src, transcript, onSkip }: LessonVideoProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptToggle = (
    <button
      type="button"
      className="press min-h-11 shrink-0 px-2 text-scale-sm font-semibold text-bb-primary"
      onPointerDown={() => setShowTranscript((s) => !s)}
    >
      {showTranscript ? "Hide transcript" : "Transcript"}
    </button>
  );
  const transcriptBody = showTranscript ? (
    <p className="rounded-xl bg-bb-muted p-3 text-scale-sm text-bb-muted-foreground">
      {transcript ?? "The transcript is stored with the video and arrives with it."}
    </p>
  ) : null;

  // The unfilmed slot: a strip. See the header for the measurement.
  if (src === undefined) {
    return (
      <figure className="flex shrink-0 flex-col gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-bb-border bg-bb-muted px-3 py-2">
          <span className="shrink-0 rounded-full border border-bb-border px-2 py-0.5 text-scale-xs font-semibold uppercase tracking-wide text-bb-muted-foreground">
            Template
          </span>
          <p className="min-w-0 flex-1 truncate text-scale-sm text-bb-muted-foreground">
            <span className="font-semibold text-bb-foreground">{title}</span> video, about a minute, from Kai. Not
            filmed yet.
          </p>
          {transcriptToggle}
          <button
            type="button"
            onPointerDown={onSkip}
            aria-label="Skip the video and go to the questions"
            title="Skip the video and go to the questions"
            className="press flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-2 border-bb-border text-scale-base font-semibold text-bb-muted-foreground"
          >
            &#10005;
          </button>
        </div>
        {transcriptBody}
      </figure>
    );
  }

  return (
    <figure className="flex shrink-0 flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-bb-border bg-bb-foreground/90">
        <video src={src} controls muted playsInline preload="metadata" className="h-full w-full" aria-label={title}>
          {transcript !== undefined ? <track kind="captions" label="Transcript" /> : null}
        </video>
        <button
          type="button"
          onPointerDown={onSkip}
          className="press absolute right-3 top-3 min-h-11 rounded-full border-2 border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground"
        >
          Skip video
        </button>
      </div>
      <figcaption className="flex items-center justify-between text-scale-xs text-bb-muted-foreground">
        <span>{title}</span>
        {transcriptToggle}
      </figcaption>
      {transcriptBody}
    </figure>
  );
}
