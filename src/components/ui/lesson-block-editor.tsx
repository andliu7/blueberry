"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Code,
  Italic,
  Link as LinkIcon,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { RichText } from "@/components/ui/rich-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MAX_BLOCKS_LENGTH,
  newBlockId,
  serialiseBlocks,
  type LessonBlock,
} from "@/data/lessonBlocks";
import { setCourseField } from "@/lib/useCourse";
import { cn } from "@/lib/utils";

/**
 * The TA's editor for a lesson section.
 *
 * Text boxes are added, reordered, edited and deleted. Formatting is four
 * markers applied to the textarea's live selection, which is why this stays a
 * plain textarea rather than a contenteditable: `selectionStart/End` is a
 * reliable, boring API, and the alternative is a rich-text engine and a node
 * tree for a paragraph that needs one bold phrase in it.
 *
 * A live preview sits under each box. Markdown you cannot see rendered is
 * markdown you get wrong, and the round trip of save-then-look is exactly the
 * friction that stops people fixing a typo.
 */

interface Marker {
  label: string;
  Icon: typeof Bold;
  wrap: [string, string];
  /** Links need a URL before they can be written. */
  prompt?: "url";
}

const MARKERS: Marker[] = [
  { label: "Bold", Icon: Bold, wrap: ["**", "**"] },
  { label: "Italic", Icon: Italic, wrap: ["*", "*"] },
  { label: "Code", Icon: Code, wrap: ["`", "`"] },
  { label: "Link", Icon: LinkIcon, wrap: ["[", "]"], prompt: "url" },
];

export function LessonBlockEditor({
  topicId,
  topicLabel,
  blocks,
  idToken,
  onSaved,
  onCancel,
}: {
  topicId: string;
  topicLabel: string;
  blocks: LessonBlock[];
  idToken: string | null;
  /** Handed the saved list so the page can render it without a refetch. */
  onSaved: (blocks: LessonBlock[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<LessonBlock[]>(blocks);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const bodyRefs = useRef(new Map<string, HTMLTextAreaElement | null>());

  // Switching section while the editor is open must not carry the previous
  // section's text across.
  useEffect(() => {
    setDraft(blocks);
    setState("idle");
    setError(null);
  }, [topicId, blocks]);

  const serialised = serialiseBlocks(draft);
  const tooLong = serialised.length > MAX_BLOCKS_LENGTH;

  const patch = (id: string, change: Partial<LessonBlock>) =>
    setDraft((prev) => prev.map((b) => (b.id === id ? { ...b, ...change } : b)));

  const move = (index: number, by: -1 | 1) =>
    setDraft((prev) => {
      const next = [...prev];
      const to = index + by;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  /**
   * Wrap whatever is selected in the textarea.
   *
   * With nothing selected this inserts the markers and drops the caret between
   * them, so pressing Bold and then typing does what you expect rather than
   * leaving four asterisks to navigate around.
   */
  const applyMarker = (block: LessonBlock, marker: Marker) => {
    const el = bodyRefs.current.get(block.id);
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = block.body.slice(start, end);

    let insert: string;
    let caret: number;

    if (marker.prompt === "url") {
      const url = window.prompt("Link to where? (a full URL, or #/lessons for a page here)");
      if (url === null) return;
      const trimmed = url.trim();
      if (!trimmed) return;
      const label = selected || "link text";
      insert = `[${label}](${trimmed})`;
      caret = start + 1 + label.length;
    } else {
      const [open, close] = marker.wrap;
      insert = `${open}${selected}${close}`;
      caret = selected ? start + insert.length : start + open.length;
    }

    const body = block.body.slice(0, start) + insert + block.body.slice(end);
    patch(block.id, { body });

    // After React writes the new value. Without this the caret jumps to the end
    // and the next keystroke lands in the wrong place.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const save = async () => {
    if (tooLong) return;
    setState("saving");
    setError(null);
    const res = await setCourseField({
      kind: "topic",
      id: topicId,
      field: "blocks",
      value: serialised,
      idToken,
    });
    setState("idle");
    if (!res.ok) {
      setError(res.error ?? "That did not save.");
      return;
    }
    setState("saved");
    onSaved(draft);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <section className="rounded-3xl border-2 border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-950/30 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              Editing {topicLabel}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-indigo-900/80 dark:text-indigo-100/80">
              Saved on top of the built-in writing. Delete everything in a box to remove it;
              clear the whole page to put the original text back.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={state === "saving"}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={state === "saving" || tooLong}>
              {state === "saving" ? <Loader variant="dots" size="sm" text="Saving" /> : "Save page"}
            </Button>
          </div>
        </header>

        {state === "saved" && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CircleCheck className="size-4" />
            Saved.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {/* Warned before Save is pressed, not after the server refuses.
            The value is JSON, so a server-side truncation would cut it
            mid-string and lose the lot. */}
        {tooLong && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              This page is {serialised.length - MAX_BLOCKS_LENGTH} characters over the limit.
              Shorten a box or move some of it into its own section before saving.
            </span>
          </p>
        )}

        <ol className="mt-5 flex flex-col gap-4">
          {draft.map((block, index) => (
            <li
              key={block.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-stone-500">
                  Box {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <IconAction
                    label="Move up"
                    Icon={ChevronUp}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconAction
                    label="Move down"
                    Icon={ChevronDown}
                    disabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <IconAction
                    label={`Delete box ${index + 1}`}
                    Icon={Trash2}
                    destructive
                    onClick={() => setDraft((prev) => prev.filter((b) => b.id !== block.id))}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                <Label htmlFor={`h-${block.id}`}>Heading (optional)</Label>
                <Input
                  id={`h-${block.id}`}
                  value={block.heading ?? ""}
                  onChange={(e) => patch(block.id, { heading: e.target.value })}
                  placeholder="Leave empty for plain text"
                />
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                <Label htmlFor={`b-${block.id}`}>Text</Label>
                <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-input bg-slate-50 p-1 dark:bg-stone-800">
                  {MARKERS.map((marker) => (
                    <Tooltip key={marker.label}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={marker.label}
                          onClick={() => applyMarker(block, marker)}
                          className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                          <marker.Icon className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{marker.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <textarea
                  id={`b-${block.id}`}
                  ref={(el) => {
                    bodyRefs.current.set(block.id, el);
                  }}
                  value={block.body}
                  onChange={(e) => patch(block.id, { body: e.target.value })}
                  rows={4}
                  className="-mt-1.5 min-h-24 w-full resize-y rounded-b-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {block.body.trim() !== "" && (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 dark:border-stone-700 dark:bg-stone-900/70">
                  <p className="mb-1 font-mono text-[.65rem] font-semibold uppercase tracking-wide text-slate-400 dark:text-stone-500">
                    Preview
                  </p>
                  {block.heading && (
                    <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {block.heading}
                    </h3>
                  )}
                  <RichText
                    text={block.body}
                    className="mt-1 text-sm text-slate-600 dark:text-stone-300"
                  />
                </div>
              )}
            </li>
          ))}
        </ol>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() =>
            setDraft((prev) => [...prev, { id: newBlockId(), heading: "", body: "" }])
          }
        >
          <Plus className="size-4" />
          Add a text box
        </Button>
      </section>
    </TooltipProvider>
  );
}

function IconAction({
  label,
  Icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  Icon: typeof Bold;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-40",
            destructive
              ? "text-destructive hover:bg-destructive/10"
              : "text-slate-500 hover:bg-slate-100 dark:text-stone-400 dark:hover:bg-stone-800",
          )}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default LessonBlockEditor;
