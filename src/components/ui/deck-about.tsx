import { BookOpen } from "lucide-react";

/**
 * The standing explanation at the top of a deck: why the experiment is run and
 * which ideas it tests, or the background behind a reference chart.
 *
 * Deliberately not collapsible. It is the thing you want on the first visit and
 * skim past on the tenth, and a panel that remembers being closed would hide it
 * from exactly the person who has come back because they are still lost.
 */
export function DeckAbout({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <section className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-400/5">
      <h2 className="mb-2 flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-300">
        <BookOpen className="h-3.5 w-3.5" />
        What this covers
      </h2>
      {/* Blank lines are paragraph breaks. These run to three paragraphs and
          read as a wall without them. */}
      <div className="space-y-3 text-[0.95rem] leading-relaxed text-slate-700 dark:text-stone-300">
        {text.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

export default DeckAbout;
