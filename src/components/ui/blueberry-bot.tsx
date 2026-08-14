"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { postToAppsScript } from "@/lib/appsScript";
import { useSession } from "@/lib/useSession";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, X } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { DockSlot, DOCK } from "@/components/ui/corner-dock";
import { cn } from "@/lib/utils";

/**
 * The berry as a bot: one control with four states and a panel behind it.
 *
 * States are a single string rather than four booleans, because they are
 * mutually exclusive and the bug in every version of this that uses booleans is
 * the frame where two of them are true. `thinking` outranks pointer state: once
 * it is working, moving the mouse away should not make it look idle.
 *
 * Every transition is a spring rather than a duration, so an interruption
 * blends instead of snapping. That is the whole difference between this feeling
 * elastic and feeling like four separate animations taking turns.
 *
 * `motion`, not `framer-motion`: same library, newer name, already a dependency
 * here. Installing the old package would ship it twice.
 */

type BotState = "idle" | "hover" | "active" | "thinking";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 22, mass: 0.7 };

export function BlueberryBot() {
  const [state, setState] = useState<BotState>("idle");
  const [open, setOpen] = useState(false);
  const [thought, setThought] = useState<string | null>(null);
  /** The last thing asked, so the panel can show what the answer answers. */
  const [asked, setAsked] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  /** Full history, sent each turn: the API is stateless. */
  const [turns, setTurns] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const session = useSession();
  const reduced = useReducedMotion();

  /**
   * Escape closes it.
   *
   * On `document`, not as `onKeyDown` on the scrim: a plain `div` is not
   * focusable, so it never receives a key event and the handler that used to
   * sit there could not have fired once.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const thinking = state === "thinking";

  /**
   * A real request, through Apps Script.
   *
   * The browser never sees the Anthropic key: it posts to the same web app that
   * already handles feedback and decks, and that script holds the key in its
   * Script Properties. A `VITE_` value would be inlined into the public bundle,
   * which is the one place a key must never be.
   */
  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    setState("thinking");
    setThought(null);
    setAsked(question);
    const next = [...turns, { role: "user" as const, content: question }];
    setTurns(next);

    // The token goes with every turn. This is not the gate — a browser can send
    // anything — it is what lets the script verify who is asking. The gate is
    // the check on the other end.
    const body = await postToAppsScript("chat", {
      messages: next,
      idToken: session?.idToken ?? null,
    });
    setState("idle");

    if (body.ok && typeof body.text === "string") {
      setThought(body.text);
      setTurns([...next, { role: "assistant", content: body.text }]);
    } else {
      setThought(
        body.error === "unreachable"
          ? "Could not reach Blueberry. Check the connection and try again."
          : ((body.error as string) ?? "That did not work."),
      );
    }
  };

  const scale = reduced ? 1 : thinking ? 1.04 : state === "hover" ? 1.08 : state === "active" ? 0.92 : 1;

  return (
    <DockSlot order={DOCK.focus + 5} className="flex flex-col items-end gap-2">
      {/* A card in the middle of the screen, like About.

          It used to hang off the button as a 22rem panel wedged into a corner
          that already holds three other controls, which left a conversation
          reading through a slot. Centred, it gets the room a conversation
          needs, and the dimmed scrim behind it is what says the rest of the
          page is waiting rather than merely covered. */}
      {/* Portal outside, AnimatePresence inside. The other way round renders
          nothing at all: AnimatePresence filters its children through
          `isValidElement`, and a portal is `REACT_PORTAL_TYPE` rather than
          `REACT_ELEMENT_TYPE`, so it was dropped silently and the card never
          mounted however many times you clicked. `break-room.tsx` already
          does it in this order. */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="ask-blueberry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
              onClick={() => setOpen(false)}
              role="presentation"
              className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/60"
            >
              <motion.div
                role="dialog"
                aria-modal
                aria-label="Ask Blueberry"
                onClick={(e) => e.stopPropagation()}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                transition={SPRING}
                className="w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
              >
            <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-stone-700">
              <BlueberryMark eyes className="size-6 shrink-0" />
              <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-stone-100">
                Ask Blueberry
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-64 min-h-24 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-600 dark:text-stone-300">
              {asked && (
                <p className="mb-2 text-xs font-semibold text-slate-400 dark:text-stone-500">
                  {asked}
                </p>
              )}
              {thinking ? (
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-stone-500">
                  Thinking
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={reduced ? {} : { opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                      className="size-1 rounded-full bg-current"
                    />
                  ))}
                </span>
              ) : (
                (thought ?? "Ask about a mechanism, a reagent, or what a deck is getting at.")
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
                setDraft("");
              }}
              className="flex items-center gap-2 border-t border-slate-200 p-2.5 dark:border-stone-700"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about a mechanism…"
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              />
              <button
                type="submit"
                disabled={thinking || !draft.trim()}
                aria-label="Send"
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                <ArrowUp className="size-4" />
                </button>
              </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <motion.button
        type="button"
        aria-label={open ? "Close Blueberry" : "Ask Blueberry"}
        aria-expanded={open}
        /* Opening is a plain `onClick`, not motion's `onTap`.

           `onTap` resolves from a pointerdown/pointerup pair on the element
           itself, which is fragile for a control sitting inside a portal that
           other things overlap: a sequence motion does not recognise leaves
           the button looking pressed and doing nothing. `onClick` is the
           browser's own definition of activation and comes with keyboard
           support for free. The motion handlers stay, but only for how the
           button looks while it is being pressed. */
        onClick={() => {
          setState("idle");
          setOpen((o) => !o);
        }}
        onHoverStart={() => !thinking && setState("hover")}
        onHoverEnd={() => !thinking && setState("idle")}
        onTapStart={() => !thinking && setState("active")}
        onTapCancel={() => !thinking && setState("idle")}
        animate={{ scale }}
        transition={SPRING}
        className="relative flex size-14 cursor-pointer items-center justify-center rounded-full"
      >
        {/* Breathing halo. Slow and low-contrast at rest so it reads as alive
            rather than as something demanding to be clicked. */}
        <motion.span
          aria-hidden
          animate={
            reduced
              ? {}
              : thinking
                ? { scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }
                : { scale: [1, 1.12, 1], opacity: [0.35, 0.12, 0.35] }
          }
          transition={{ duration: thinking ? 1.1 : 3.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-indigo-500/40 blur-md"
        />

        {/* The working ring: a conic sweep that only spins while thinking, so
            the state is legible without reading anything. */}
        <motion.span
          aria-hidden
          animate={reduced ? {} : { rotate: thinking ? 360 : 0 }}
          transition={
            thinking
              ? { duration: 1.1, repeat: Infinity, ease: "linear" }
              : { duration: 0.4 }
          }
          className={cn(
            "absolute inset-[-3px] rounded-full transition-opacity duration-300",
            thinking ? "opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(129,140,248,0.9) 90deg, transparent 200deg)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          }}
        />

        <BlueberryMark
          eyes
          className={cn(
            "blueberry-glow-art relative size-11 transition-[filter] duration-300",
            state === "hover" && "brightness-110",
          )}
        />
      </motion.button>
    </DockSlot>
  );
}

export default BlueberryBot;
