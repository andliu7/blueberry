import { FlaskConical, Sparkles } from "lucide-react";
import { RichText } from "@/components/ui/rich-text";
import { embedUrl, isDirectVideo } from "@/lib/lessonMedia";
import type { LessonBlock } from "@/data/lessonBlocks";
import { cn } from "@/lib/utils";

/**
 * A section's boxes, laid out.
 *
 * The page used to render blocks in two fixed passes: bodies with no heading as
 * paragraphs, then every block with a heading as a card in a two column grid.
 * That worked while a block was only ever text, and it decided the layout for
 * the TA - a box was side by side or full width depending on whether it happened
 * to have a heading, which is not a thing anybody would choose on purpose.
 *
 * One pass now, in the order the TA arranged, with each box carrying its own
 * width. `half` boxes flow into a two column grid and sit beside each other;
 * `full` spans the row. That is Kai's "beside each other or below each other",
 * decided per box.
 *
 * Pure. Everything here also renders inside the editor's preview, so it cannot
 * hold state or reach for a session.
 */

export function LessonBlocks({ blocks, className }: { blocks: LessonBlock[]; className?: string }) {
  if (!blocks.length) return null;

  return (
    // `auto-rows-min` so a short box beside a tall one does not stretch to match
    // it and leave a picture floating in the middle of its own card.
    <div className={cn("grid auto-rows-min gap-4 md:grid-cols-2", className)}>
      {blocks.map((block, i) => (
        <Block key={block.id} block={block} first={i === 0} />
      ))}
    </div>
  );
}

function Block({ block, first }: { block: LessonBlock; first: boolean }) {
  const kind = block.kind ?? "text";
  const half = (block.width ?? "full") === "half";
  // Full width spans both columns; half takes one and lets the next sit beside it.
  const span = half ? "md:col-span-1" : "md:col-span-2";

  /* A plain paragraph rather than a card.
     The opening text of a section is prose, not a boxed aside, and wrapping it
     in a bordered card was what made every lesson read like a form. Only the
     first text block with no heading gets this. */
  if (kind === "text" && !block.heading && first) {
    return (
      <RichText
        text={block.body}
        className={cn("max-w-3xl text-slate-700 md:col-span-2 dark:text-stone-200")}
      />
    );
  }

  if (kind === "text") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-slate-300 bg-slate-100 p-4 dark:border-stone-700 dark:bg-stone-900",
          span,
        )}
      >
        {block.heading && (
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {first ? <FlaskConical className="size-4" /> : <Sparkles className="size-4" />}
            {block.heading}
          </div>
        )}
        <div className={cn("text-sm leading-6 text-slate-700 dark:text-stone-200", block.heading && "mt-2")}>
          <RichText text={block.body} />
        </div>
      </div>
    );
  }

  // Media. The frame is the same either way so a picture and a clip sitting
  // beside each other line up.
  return (
    <figure className={cn("min-w-0 overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 dark:border-stone-700 dark:bg-stone-900", span)}>
      {block.heading && (
        <figcaption className="border-b border-slate-300 px-4 py-2 text-sm font-semibold text-indigo-700 dark:border-stone-700 dark:text-indigo-300">
          {block.heading}
        </figcaption>
      )}

      {kind === "image" ? (
        <img
          src={block.src}
          // The caption doubles as the description. A TA who writes one gets an
          // accessible image for free; one who does not gets an empty alt, which
          // is correct for decoration and better than a filename read aloud.
          alt={block.body?.trim() || ""}
          loading="lazy"
          className="block max-h-[28rem] w-full bg-white object-contain dark:bg-stone-950"
        />
      ) : (
        <Video src={block.src ?? ""} />
      )}

      {block.body?.trim() && (
        <figcaption className="px-4 py-3 text-sm leading-6 text-slate-700 dark:text-stone-200">
          <RichText text={block.body} />
        </figcaption>
      )}
    </figure>
  );
}

/**
 * A clip, however it was given.
 *
 * A YouTube watch link has to become an embed link or the iframe shows
 * "refused to connect"; an uploaded mp4 wants a real `<video>` with controls.
 * Deciding here keeps that out of the editor and out of the page.
 */
function Video({ src }: { src: string }) {
  const embed = embedUrl(src);

  if (embed) {
    return (
      <div className="aspect-video w-full bg-black">
        <iframe
          src={embed}
          title="Lesson video"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full border-0"
        />
      </div>
    );
  }

  if (isDirectVideo(src)) {
    return <video src={src} controls playsInline className="block max-h-[28rem] w-full bg-black" />;
  }

  // Neither an embeddable service nor a video file. Say so rather than render a
  // black rectangle the TA will assume is still loading.
  return (
    <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
      That video link is not a YouTube or Vimeo page and not a video file, so it cannot be
      played here.
    </p>
  );
}

export default LessonBlocks;
