"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The prompt field: a pill that opens into a growing composer.
 *
 * Adapted rather than pasted. The version this came from carried a model
 * picker, an effort picker, and image attachments, and none of the three can
 * tell the truth here yet: the site talks to one model, the Apps Script pins
 * effort server-side, and `handleChat_` takes string content, so an attach
 * button would take a photo and drop it. A control that shows a choice the app
 * cannot act on is worse than no control.
 *
 * What is left is the part that earns its place — the field grows with the
 * answer instead of scrolling a single line, and the send button morphs
 * between its three jobs rather than swapping.
 */

/** One line of text plus padding. Also the collapsed pill height. */
const MIN_HEIGHT = 48;
/** About six lines. Past this it scrolls, and the fades appear. */
const MAX_HEIGHT = 160;

/** The overshoot the original used. Worth keeping: it reads as elastic. */
const SPRING = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";

/* Speech recognition is still prefixed and still not in lib.dom, so it needs
   describing here. Only the members actually used — a fuller type would be
   fiction, since the shape varies by browser. */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

/**
 * Resolved once, at module load.
 *
 * The dictated-text fallback in the original typed a hardcoded sentence about
 * Framer Motion when the microphone was unavailable — a demo prop that would
 * put words in a student's mouth. Where there is no speech API there is no mic
 * button: an absent control is honest, a fake one is not.
 */
const SpeechRecognitionCtor: RecognitionCtor | undefined =
  typeof window === "undefined"
    ? undefined
    : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition);

const BAND_COUNT = 5;

export interface PromptInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Controlled value. Leave off for uncontrolled. */
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  /** Read-only while a reply is in flight. */
  busy?: boolean;
  /** Starts as a pill and opens on click. Off inside a dialog, where the field is the only thing to do. */
  collapsible?: boolean;
  autoFocus?: boolean;
  label?: string;
}

export function PromptInput({
  onSubmit,
  placeholder = "Ask anything",
  className,
  value: controlledValue,
  onChange,
  defaultValue = "",
  busy = false,
  collapsible = true,
  autoFocus = false,
  label = "Prompt",
}: PromptInputProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlledValue ?? uncontrolled;

  const [open, setOpen] = useState(!collapsible);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [scrolls, setScrolls] = useState(false);
  const [recording, setRecording] = useState(false);
  const [bands, setBands] = useState<number[]>(() => new Array(BAND_COUNT).fill(0));

  const reduced = useReducedMotion();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const topFadeRef = useRef<HTMLDivElement>(null);
  const bottomFadeRef = useRef<HTMLDivElement>(null);

  /* Recording resources, all torn down together. Held in refs rather than
     state because stopping must not wait for a render — a live microphone is
     not something to leave running for a frame longer than it has to be. */
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  /** What the field held when dictation started, so interim results replace rather than repeat. */
  const baselineRef = useRef("");

  const hasText = value.trim() !== "";

  const setValue = useCallback(
    (next: string) => {
      if (controlledValue === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [controlledValue, onChange],
  );

  const updateFades = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (topFadeRef.current) {
      topFadeRef.current.style.opacity = String(Math.min(scrollTop / 20, 1));
    }
    if (bottomFadeRef.current) {
      const below = scrollHeight - clientHeight - scrollTop;
      bottomFadeRef.current.style.opacity = String(Math.min(Math.max(below - 8, 0) / 10, 1));
    }
  }, []);

  // Grow to fit, up to a ceiling. Measuring means collapsing to zero first —
  // `scrollHeight` on an element already tall enough reports the height it has,
  // not the height it needs, so a field that grew would never shrink again.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const needed = el.scrollHeight;
    const next = Math.max(MIN_HEIGHT, Math.min(needed, MAX_HEIGHT));
    el.style.height = `${next}px`;
    setHeight(next);
    setScrolls(needed > MAX_HEIGHT);
    updateFades();
  }, [value, open, updateFades]);

  useEffect(() => {
    if (!open || !autoFocus) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open, autoFocus]);

  // Dictation lands at the bottom of the field, so keep the bottom in view.
  useEffect(() => {
    if (!recording || !textareaRef.current) return;
    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
  }, [value, recording]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setRecording(false);
    setBands(new Array(BAND_COUNT).fill(0));
  }, []);

  // Never leave the microphone open behind an unmounted component. The dialog
  // this sits in is removed from the tree on close, which is exactly the path
  // where a forgotten track keeps the browser's recording indicator lit.
  useEffect(() => stopRecording, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!SpeechRecognitionCtor) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Denied or unavailable. Nothing to say about it — the field still works.
      return;
    }
    streamRef.current = stream;
    setRecording(true);

    // The bars are the whole reason to touch the audio graph: without them
    // there is no way to tell "listening" from "broken".
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtor && !reduced) {
      const ctx = new AudioCtor();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const step = Math.floor(data.length / BAND_COUNT);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        setBands(
          Array.from({ length: BAND_COUNT }, (_, i) => {
            let sum = 0;
            for (let j = 0; j < step; j++) sum += data[i * step + j];
            return sum / step / 255;
          }),
        );
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    baselineRef.current = value;

    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) {
        baselineRef.current = (baselineRef.current ? baselineRef.current + " " : "") + final;
      }
      setValue((baselineRef.current + (interim ? " " + interim : "")).trim());
    };
    recognition.onerror = stopRecording;
    recognition.onend = stopRecording;

    recognitionRef.current = recognition;
    recognition.start();
  }, [reduced, setValue, stopRecording, value]);

  const submit = () => {
    if (!hasText || busy) return;
    if (recording) stopRecording();
    onSubmit?.(value);
    setValue("");
    if (collapsible) setOpen(false);
  };

  // Three jobs, one button, mutually exclusive: stop what is running, send what
  // is written, or start listening. Ordered so that stopping always wins.
  const action = recording ? "stop" : hasText ? "send" : "mic";
  const canDictate = SpeechRecognitionCtor !== undefined;
  const actionDisabled = busy || (action === "mic" && !canDictate);

  return (
    <div
      ref={rootRef}
      onBlur={(e) => {
        if (rootRef.current?.contains(e.relatedTarget as Node)) return;
        if (collapsible && !hasText && !recording) setOpen(false);
      }}
      className={cn("relative w-full", className)}
      style={{
        maxWidth: collapsible ? (open ? 480 : 320) : undefined,
        transition: reduced ? undefined : `max-width 0.4s ${SPRING}`,
      }}
    >
      <div
        onMouseDown={(e) => {
          // Clicking the surface should put the caret in the field, not steal
          // focus away from it.
          if (open && e.target !== textareaRef.current && !recording) {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }}
        style={{
          height: open ? height : MIN_HEIGHT,
          transition: reduced ? undefined : "height 0.15s ease-out",
        }}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white",
          "focus-within:border-indigo-400 dark:border-stone-700 dark:bg-stone-900",
          open ? "cursor-text" : "cursor-pointer",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onScroll={updateFades}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label={label}
          readOnly={busy || recording}
          rows={1}
          className={cn(
            "absolute inset-x-0 top-0 z-[1] w-full resize-none bg-transparent py-3 pl-4 pr-16",
            "text-sm leading-[22px] text-slate-800 outline-none",
            "placeholder:text-slate-400 dark:text-stone-200 dark:placeholder:text-stone-500",
            "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-stone-600",
            scrolls ? "overflow-y-auto" : "overflow-y-hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />

        {/* Fades, not a hard edge: text that stops mid-word at a border reads as
            broken, whereas text that dissolves reads as continuing. */}
        <div
          ref={topFadeRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-4 top-0 z-[2] h-6 bg-gradient-to-b from-white to-transparent dark:from-stone-900"
        />
        <div
          ref={bottomFadeRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-4 bottom-0 z-[2] h-6 bg-gradient-to-t from-white to-transparent dark:from-stone-900"
        />

        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open ${label.toLowerCase()}`}
            className={cn(
              "absolute inset-0 z-[1] cursor-text py-3 pl-4 pr-16 text-left text-sm leading-[22px] text-slate-400 outline-none dark:text-stone-500",
              open ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            {placeholder}
          </button>
        )}

        {/* Level meter, left of the button it belongs to. */}
        <div
          aria-hidden
          className={cn(
            "absolute bottom-0 right-14 z-[3] flex h-12 items-center justify-end gap-[3px] transition-all duration-300",
            recording ? "w-14 opacity-100" : "w-0 translate-x-3 opacity-0",
          )}
        >
          {bands.map((level, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-indigo-500 transition-[height] duration-75 ease-out"
              style={{ height: `${Math.max(4, level * 22)}px` }}
            />
          ))}
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (action === "stop") stopRecording();
            else if (action === "send") submit();
            else void startRecording();
          }}
          disabled={actionDisabled}
          aria-label={
            action === "stop" ? "Stop dictating" : action === "send" ? "Send" : "Dictate"
          }
          /* 44px, the touch-target floor. The original was 32px, which is under
             the bar on every mobile guideline and is the one control here that
             has to be hit first time. */
          className={cn(
            "absolute bottom-0.5 right-0.5 z-[3] flex size-11 items-center justify-center rounded-xl",
            "bg-slate-900 text-white transition hover:bg-slate-700",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {/* All three stacked and cross-faded, so the button never blinks
              empty between jobs. */}
          <span className="relative flex size-full items-center justify-center">
            <Icon show={action === "send"} reduced={reduced}>
              <ArrowUp className="size-4" />
            </Icon>
            <Icon show={action === "mic"} reduced={reduced}>
              <Mic className="size-4" />
            </Icon>
            <Icon show={action === "stop"} reduced={reduced}>
              <Square className="size-3.5 fill-current" />
            </Icon>
          </span>
        </button>
      </div>
    </div>
  );
}

function Icon({
  show,
  reduced,
  children,
}: {
  show: boolean;
  reduced: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        !reduced && "transition-all duration-300",
        show ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0",
        !reduced && !show && "rotate-45",
      )}
      style={!reduced ? { transitionTimingFunction: SPRING } : undefined}
    >
      {children}
    </span>
  );
}

export default PromptInput;
