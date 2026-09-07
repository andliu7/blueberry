import type { ReactNode } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { Blueberry } from "@/components/ui/blueberry";
import { cn } from "@/lib/utils";

/**
 * The shared frame every funnel screen sits on, borrowed in shape from
 * `blueberry_game/apps/web/src/onboarding`.
 *
 * One screen, drawn six times: a fat progress bar across the top with a back
 * chevron beside it, a body that scrolls on its own, and a full width action
 * pinned to the bottom that is off until the screen is answered. Nothing below
 * re-lays any of that out, which is the whole reason this file exists first.
 *
 * **What was borrowed and what was not.** The composition is blueberry_game's:
 * the bar, the mascot asking from a bubble, the big option chips, the pinned
 * action, one question per screen. The palette is this site's. blueberry_game
 * draws a green bar on a warm cream ground because that is its own settled
 * direction; painting it here would give Blueberry two identities in one
 * product for no reason beyond the file it was copied from. So the bar keeps
 * the indigo-to-fuchsia gradient the rest of this site already uses.
 *
 * **The press.** Every control here acknowledges on pointer down, through
 * `.bb-press` and `.bb-press-soft` in index.css, which the browser paints the
 * same frame the pointer lands with no JavaScript in the path. The *act* stays
 * on click: pointer down is the acknowledgement, click is the commitment, and
 * a control that navigates on pointer down cannot be cancelled by sliding off
 * it, which is the one gesture anyone has for changing their mind.
 */

export interface FrameProps {
  /** 0 to 100. Visible from screen one; see `progressPercent` in flow.ts. */
  percent: number;
  /** Null on the first step, where there is nowhere back to. */
  onBack: (() => void) | null;
  /**
   * WHERE "OUT OF THIS" GOES, on the one screen that has no step behind it.
   *
   * Without it the welcome beat is a one-way door: the chevron has nothing to
   * point at, so a visitor who arrived by accident can only go forward or sign
   * in. The old page carried a plain "Home" link for exactly this and losing it
   * would be a regression dressed as a redesign.
   *
   * It draws an X rather than a chevron, deliberately. A chevron says "one
   * question back"; an X says "out of this", and those are different promises.
   */
  leaveHref?: string;
  /**
   * Whether the body centres itself in the space it has.
   *
   * The question screens fill their column from the top, because a list of
   * chips that grows should grow downwards rather than shifting the question
   * every time. The welcome and finish beats hold four elements in a full
   * screen, and top-aligning those leaves a third of the page empty between
   * the copy and the action.
   */
  align?: "top" | "centre";
  children: ReactNode;
  /** The pinned bottom band: the action, and any quieter second one. */
  foot: ReactNode;
}

export function Frame({
  percent,
  onBack,
  leaveHref,
  align = "top",
  children,
  foot,
}: FrameProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const leadClass =
    "-ml-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-900/6 hover:text-slate-900 dark:text-stone-400 dark:hover:bg-white/8 dark:hover:text-white";

  return (
    <div className="relative flex h-svh flex-col">
      {/* The header row. The leading control is a sibling of the bar rather
          than floating over it, so the bar can never be pressed by accident on
          a phone where the two would otherwise overlap. */}
      <div className="mx-auto flex w-full max-w-2xl shrink-0 items-center gap-3 px-5 pt-5 sm:px-6">
        {onBack === null && leaveHref ? (
          <a href={leaveHref} aria-label="Leave setup" className={leadClass}>
            <X className="size-5" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onBack?.()}
            aria-label="Back a step"
            aria-hidden={onBack === null || undefined}
            tabIndex={onBack === null ? -1 : undefined}
            className={cn(leadClass, onBack === null && "pointer-events-none opacity-0")}
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {/* A real progressbar role, so the percent reaches a screen reader.
            The bar is deliberately fat: it is the one piece of chrome on the
            screen, and a hairline reads as decoration rather than as position. */}
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
          className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/12"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "mx-auto w-full max-w-2xl px-5 pt-8 pb-6 sm:px-6",
            // `min-h-full` on the inner box rather than the scroller, so
            // centring still lets a body taller than the screen scroll instead
            // of centring itself off both ends of it.
            align === "centre" && "flex min-h-full flex-col justify-center pt-4",
          )}
        >
          {children}
        </div>
      </div>

      {/* THE SCROLL EDGE. A gradient to the page colour pinned above the foot,
          so a set of chips that overflows fades into the action band instead of
          being sliced flat. It is a gradient *to* the page colour drawn *over*
          it, so it is invisible when nothing is under it and no second "is this
          scrollable" state has to be computed and then kept true. */}
      <div
        aria-hidden
        className="pointer-events-none -mt-8 h-8 shrink-0 bg-gradient-to-b from-transparent to-[#f6f4ef] dark:to-[#0c0a09]"
      />

      <div className="mx-auto flex w-full max-w-2xl shrink-0 flex-col items-center gap-2 px-5 pt-2 pb-6 sm:px-6">
        {foot}
      </div>
    </div>
  );
}

/* Berry asks */

/**
 * Berry, then the bubble, in a row above the options.
 *
 * Exactly one berry per screen. He wears `curious` rather than `happy` here on
 * purpose: `happy` is the kind closed-eye smile, which reads as Berry pleased
 * with himself, and this is Berry waiting for an answer.
 */
export function Ask({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Blueberry
        mood="curious"
        flat
        interactive={false}
        label="Blueberry, asking"
        className="mt-1 size-12 shrink-0 sm:size-14"
      />
      <p className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white/85 px-4 py-3 text-lg leading-snug font-semibold text-slate-900 dark:border-stone-700 dark:bg-stone-900/75 dark:text-stone-50">
        {children}
      </p>
    </div>
  );
}

/**
 * Berry large with the greeting beside him: the welcome and finish beats'
 * composition, not the row every other step uses.
 */
export function Hero({
  line,
  mood = "curious",
  children,
}: {
  line: string;
  mood?: "curious" | "happy" | "proud" | "cheer";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <div className="flex items-end gap-2">
        <Blueberry mood={mood} label="Blueberry" className="size-28 shrink-0 sm:size-36" />
        <p className="mb-6 max-w-[13rem] rounded-2xl rounded-bl-sm border border-slate-200 bg-white/85 px-4 py-2.5 text-left text-base leading-snug font-semibold text-slate-900 dark:border-stone-700 dark:bg-stone-900/75 dark:text-stone-50">
          {line}
        </p>
      </div>
      {children}
    </div>
  );
}

/* The option chip */

export interface ChipProps {
  picked: boolean;
  onPick: () => void;
  icon?: ReactNode;
  label: string;
  /** A second line under the label, for whatever the choice costs or means. */
  meta?: string | null;
}

/**
 * The big option: icon, label, and a check that appears once it is picked.
 *
 * `aria-pressed` is both the accessible state and the styling hook, so the
 * picked outline cannot drift away from what a screen reader is told.
 */
export function Chip({ picked, onPick, icon, label, meta = null }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className={cn(
        "bb-press-soft flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors",
        picked
          ? "border-indigo-500 bg-indigo-50/90 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-50"
          : "border-slate-300 bg-white/80 text-slate-800 hover:border-slate-400 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-600",
      )}
    >
      {icon && <span className="grid size-7 shrink-0 place-items-center">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{label}</span>
        {meta && (
          <span className="mt-0.5 block text-sm font-normal text-slate-600 dark:text-stone-400">
            {meta}
          </span>
        )}
      </span>
      {picked && <Check className="size-5 shrink-0 text-indigo-600 dark:text-indigo-300" />}
    </button>
  );
}

export function ChipList({ children }: { children: ReactNode }) {
  return <ul className="mt-6 grid gap-2.5">{children}</ul>;
}

/* The actions */

export interface ActionProps {
  label: string;
  /** Gated on an answer. Disabled is a state, never a hidden button. */
  disabled?: boolean;
  /** The welcome beat's full stadium; every other screen is a rectangle. */
  shape?: "rect" | "stadium";
  onPress: () => void;
}

export function Action({ label, disabled = false, shape = "rect", onPress }: ActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={cn(
        "w-full px-6 py-3.5 text-center text-base font-semibold transition-colors",
        shape === "stadium" ? "rounded-full" : "rounded-2xl",
        // The ledge comes off with the button. `.bb-press` is plain CSS outside
        // Tailwind's layers, so a `disabled:shadow-none` utility would lose the
        // specificity tie; not applying the class at all is the honest fix.
        disabled
          ? "cursor-not-allowed bg-slate-900/10 text-slate-400 dark:bg-white/10 dark:text-stone-500"
          : "bb-press cursor-pointer bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The underlined link under an action: "I already have an account" on the
 * welcome beat, "not sure yet" on the exam date. Deliberately quieter than any
 * filled control, because leaving a step is not a second answer to it.
 */
export function QuietAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-stone-300 dark:decoration-stone-600 dark:hover:text-white"
    >
      {label}
    </button>
  );
}
