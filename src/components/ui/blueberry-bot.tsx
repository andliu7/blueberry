"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { askBlueberry } from "@/lib/askBlueberry";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { PromptInput } from "@/components/ui/ai-chat-input";
import { RailSlot, RAIL } from "@/components/ui/corner-dock";
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

    // The Edge Function, not Apps Script. Apps Script verified Google ID tokens
    // and nothing else, so a Supabase session had nothing to send it and was
    // refused however genuinely signed in it was. supabase-js attaches the
    // caller's JWT here, and Supabase verifies it before the function runs.
    const body = await askBlueberry(next);
    setState("idle");

    if (body.ok && typeof body.text === "string") {
      setThought(body.text);
      setTurns([...next, { role: "assistant", content: body.text }]);
    } else {
      // Auth is named rather than swallowed. The old branch printed "that did
      // not work" for a refusal and offered no way to fix it, which is why the
      // sign-out looked like a mystery.
      setThought(
        body.error === "not-signed-in"
          ? "Ask Blueberry needs you signed in. Open #/signin and try again."
          : body.error === "unreachable"
            ? "Could not reach Blueberry. Check the connection and try again."
            : ((body.error as string) ?? "That did not work."),
      );
    }
  };

  const scale = reduced ? 1 : thinking ? 1.04 : state === "hover" ? 1.08 : state === "active" ? 0.92 : 1;

  return (
    /* A member of the shared corner rail, not a chip of its own.

       It was a 56px berry with a breathing halo, floating above three other
       corner controls of similar weight, and a blind read against the
       reference counted them and could not rank them. It is the same berry at
       the rail's own 44px now, first in the row, and the halo it breathes at
       rest went with the pill: an idle glow is a control asking to be pressed,
       and this one is not the thing the page is asking for. The working ring
       stays, because that one is state rather than decoration. */
    <RailSlot order={RAIL.assistant}>
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

              {/* The composer grows with the question instead of scrolling one
                  line sideways. A mechanism question is two sentences more
                  often than it is five words, and a field that hides the start
                  of what you typed is a field you cannot proofread.

                  `collapsible` off: inside a dialog opened for this one
                  purpose, a pill that has to be clicked open is a step that
                  buys nothing. `autoFocus` moves focus into the card, so a
                  keyboard or screen-reader user is not left on the button
                  behind the scrim. */}
              <div className="border-t border-slate-200 p-2.5 dark:border-stone-700">
                <PromptInput
                  value={draft}
                  onChange={setDraft}
                  onSubmit={(text) => void send(text)}
                  busy={thinking}
                  collapsible={false}
                  autoFocus
                  label="Ask Blueberry a question"
                  placeholder="Ask about a mechanism…"
                />
              </div>
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
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-full"
      >
        {/* The halo, while it is working and only then. It used to breathe at
            rest too, which reads as alive when the control is alone on a page
            and reads as a fourth thing competing when it is one of four in a
            corner. Thinking is worth a glow; idling is not. */}
        {thinking && (
          <motion.span
            aria-hidden
            animate={reduced ? {} : { scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-indigo-500/40 blur-md"
          />
        )}

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

        {/* Sized and lit like a subordinate, because that is what it is here.
            At `size-9` with `blueberry-glow-art` it was a saturated orb next to
            three 16px glyphs, so the next blind read still found no rank in the
            row: the loudest thing in the corner was the mascot and the captioned
            entry it sits beside came second. The mark is the same mark, at the
            scale of the glyphs it shares the rail with, and it picks the glow
            back up on hover where a glow means a pointer rather than a shout.
            Everywhere else it keeps its full size; this is the rail only. */}
        <BlueberryMark
          eyes
          className={cn(
            "relative size-7 transition-[filter] duration-300",
            state === "hover" && "blueberry-glow-art brightness-110",
          )}
        />
      </motion.button>
    </RailSlot>
  );
}

export default BlueberryBot;
