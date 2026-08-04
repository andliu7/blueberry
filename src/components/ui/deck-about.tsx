import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BookOpen, FlaskConical, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The standing explanation at the top of a deck, as one panel with three tabs.
 *
 * The three are different registers and reading them as one block flattens all
 * of them. `purpose` is the lab manual's framing of why the experiment exists,
 * `about` is revision notes for what you need in your head before the LCTA, and
 * `funFact` is an aside kept visibly apart so nobody reads a joke as chemistry.
 *
 * Stacked, they pushed the first question most of a screen down the page. Tabs
 * keep all three one click away while costing the height of one of them.
 *
 * The panel itself is still never hidden entirely, and the tab strip does not
 * remember being closed. This is the thing you want on a first visit and skim
 * past on the tenth, and a panel that stayed shut would hide it from exactly the
 * person who came back because they are still lost.
 */

type TabId = "purpose" | "about" | "fun";

const TABS: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "purpose", label: "Purpose", icon: FlaskConical },
  { id: "about", label: "What this covers", icon: BookOpen },
  { id: "fun", label: "Fun fact", icon: Lightbulb },
];

function Paragraphs({ text }: { text: string }) {
  // Blank lines are paragraph breaks.
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </>
  );
}

export function DeckAbout({
  text,
  purpose,
  funFact,
}: {
  text?: string;
  purpose?: string;
  funFact?: string;
}) {
  const reduce = useReducedMotion();
  const content: Record<TabId, string | undefined> = {
    purpose,
    about: text,
    fun: funFact,
  };

  const available = TABS.filter((t) => content[t.id]);
  // Opens on the revision notes rather than on the purpose. Someone arriving at
  // a deck page is usually here to study, not to read the aims of the lab.
  const [active, setActive] = useState<TabId>(() =>
    content.about ? "about" : (available[0]?.id ?? "about"),
  );

  if (available.length === 0) return null;

  const shown = content[active] ? active : available[0]!.id;

  return (
    <section className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-400/5">
      {available.length > 1 && (
        <div role="tablist" aria-label="About this deck" className="mb-4 flex flex-wrap gap-1.5">
          {available.map(({ id, label, icon: Icon }) => {
            const selected = id === shown;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => setActive(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.7rem] font-bold tracking-wider uppercase transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-indigo-400",
                  selected
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "text-indigo-600/70 hover:bg-indigo-100/70 hover:text-indigo-700 dark:text-indigo-300/70 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-200",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      <motion.div
        key={shown}
        role="tabpanel"
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="space-y-3 text-[0.95rem] leading-relaxed text-slate-700 dark:text-stone-300"
      >
        <Paragraphs text={content[shown]!} />
      </motion.div>
    </section>
  );
}

export default DeckAbout;
