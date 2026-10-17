"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { askBlueberry } from "@/lib/askBlueberry";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { PromptInput } from "@/components/ui/ai-chat-input";

/**
 * The berry as a bot: a panel in the middle of the screen, opened from the
 * account menu (see the effect below).
 *
 * Its state is a single string rather than booleans, because "idle" and
 * "thinking" are mutually exclusive and the bug in every boolean version is the
 * frame where both are true. The panel arrives on a spring, so an interruption
 * blends instead of snapping.
 *
 * `motion`, not `framer-motion`: same library, newer name, already a dependency
 * here. Installing the old package would ship it twice.
 */

type BotState = "idle" | "thinking";

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

  /**
   * Opened by an event, not by a button of its own (2026-10-07). The button was a
   * member of the corner rail, and the replan removes that rail (SITE-REPLAN.md
   * section 6): the account menu in the site header now has "Ask Blueberry", and
   * it dispatches `blueberry:open-bot`. The same pattern the focus timer already
   * uses with `blueberry:open-focus`, so nothing has to pass state between them.
   */
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("blueberry:open-bot", openIt);
    return () => window.removeEventListener("blueberry:open-bot", openIt);
  }, []);

  return (
    <>
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

    </>
  );
}

export default BlueberryBot;
