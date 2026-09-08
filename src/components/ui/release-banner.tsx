import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, FlaskConical } from "lucide-react";
import { markReleasesRead, useUnreadRelease } from "@/components/ui/notifications";
import { cn } from "@/lib/utils";

/**
 * What this site is, said in the page's own column rather than behind a bell.
 *
 * The description already existed and already read well. The problem a blind
 * read against the reference found was where it lived: the only way to it was a
 * 44px unlabelled circle in a bottom-right stack of three unlabelled circles,
 * so the one paragraph that answers "what would I be doing here" was styled as
 * the least important thing on screen. The reference puts its equivalent moment
 * full width, high contrast and verb first, in the primary slot, and a stranger
 * resolves it in under a second.
 *
 * So this is the same entry, given that slot. One sentence, one saturated
 * button with a verb in it, one quiet way out. It is deliberately not a second
 * copy of the panel row: that anatomy is built for a 22rem column and folds its
 * detail away behind More, which is right there and wrong here, because a
 * banner that needs to be expanded before it says anything has spent the slot
 * and bought nothing.
 *
 * **Opaque, not translucent.** Several of the pages it sits on are a full-bleed
 * photograph, and the same blind read said a translucent panel over one loses
 * its edges and reads as a hole punched in the page rather than a layer above
 * it. A solid surface with a ring is the fix, and it costs nothing anywhere
 * else.
 *
 * **It goes away when it is read, and it is not the only door.** Acting on it
 * or dismissing it marks the release read through `markReleasesRead`, which is
 * the same record the notifications panel writes. The entry itself stays in the
 * panel forever: a banner is an announcement, the panel is the archive, and the
 * corner carries the word "Notifications" so the archive is findable without
 * guessing.
 *
 * **This is the ONLY announcement, on every page, read or not.** The read after
 * the one that put this here said the message had ended up in two competing
 * presentations at once, a full-width card in the column and a lit badge in the
 * corner, with nothing saying which was the real one. The first answer was a
 * mount registry that let the corner stand down while this was on screen, which
 * only moved the collision to the pages this is not on: the badge came back,
 * and which surface was the announcement depended on the route.
 *
 * So the choice is now made once and it is made here. This carries it. The
 * corner never counts a release at all, on any page, and there is no registry
 * left to keep the two of them in step. Announcement here, archive there.
 */
export function ReleaseBanner({ className }: { className?: string }) {
  const release = useUnreadRelease();
  const reduce = useReducedMotion();

  // Nothing unread, nothing to announce. The panel still has it.
  if (!release) return null;

  const { action } = release;

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        key={release.id}
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        aria-label={release.title}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ring-1 ring-slate-900/5 sm:p-6",
          "dark:border-stone-800 dark:bg-stone-950 dark:ring-white/10",
          className,
        )}
      >
        {/* The site's accent as a hairline along the top edge, the same way the
            drill banner wears it. A solid indigo fill here would outrank the
            page's own heading, which is not what is being asked for: the button
            is the loud thing, and only the button. */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-from to-brand-to"
        />

        {/* Top-aligned, not centred. Centred against a three-line body left the
            chip floating at the vertical middle of a block whose first line is
            the thing it belongs to, so it read as unattached to anything. */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          {/* Decorative, and it costs a whole row once the layout stacks, so a
              phone does not get it. The eyebrow underneath already names the
              thing, which is the job the glyph was helping with. */}
          <span
            aria-hidden
            className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 sm:flex dark:bg-indigo-500/15"
          >
            <FlaskConical className="size-5 text-indigo-600 dark:text-indigo-300" />
          </span>

          <div className="min-w-0 flex-1">
            {/* The name of the thing, small, above the sentence that sells it.
                Reversing the two would put the biggest type on a noun phrase a
                stranger has no use for yet. */}
            <p className="text-xs font-semibold tracking-[0.14em] text-indigo-600 uppercase dark:text-indigo-300">
              {release.title}
            </p>
            <p className="mt-1.5 text-lg leading-snug font-semibold text-balance text-slate-900 sm:text-xl dark:text-stone-50">
              {release.summary}
            </p>
            {/* Clamped on a phone, whole on a desktop.

                Unclamped, the detail runs eight lines on a 393px screen, which
                pushes the button down into the corner dock's own square and
                puts the Feedback pill on top of the primary CTA. Three lines
                keeps the substance, keeps the shape the reference wins on -
                one sentence, one button, visible together - and the full text
                is one press away in the panel either way. */}
            <p className="mt-2 line-clamp-3 max-w-prose text-sm leading-relaxed text-slate-600 sm:line-clamp-none dark:text-stone-300">
              {release.body}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-52 sm:pt-1">
            {/* The one saturated control on the screen, and it names the doing.
                Same gradient and same `bb-press` ledge as Get Started, so it is
                recognisably the site's primary rather than a banner's own. */}
            <a
              href={action.href}
              {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
              onClick={markReleasesRead}
              className="bb-press flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-5 text-sm font-semibold text-white"
            >
              {action.label}
              {action.external ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </a>

            {/* Quiet, and it says what it does. "Not now" rather than an X in
                the corner: an unlabelled glyph is the thing this whole banner
                exists to stop shipping. */}
            <button
              type="button"
              onClick={markReleasesRead}
              className="min-h-9 cursor-pointer rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98] dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100"
            >
              Not now
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

export default ReleaseBanner;
