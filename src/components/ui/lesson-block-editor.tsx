"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Code,
  Columns2,
  Film,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Plus,
  RectangleHorizontal,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { RichText } from "@/components/ui/rich-text";
import { LessonBlocks } from "@/components/ui/lesson-blocks";
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
  type LessonBlockKind,
} from "@/data/lessonBlocks";
import { isImage, isVideo, uploadLessonMedia } from "@/lib/lessonMedia";
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
   * Reordering by drag, with the buttons kept.
   *
   * The arrows are not redundant: dragging is unavailable to a keyboard user and
   * awkward on a phone, and this editor has to work on both. The handle is the
   * fast path, not the only one.
   */
  const [dragId, setDragId] = useState<string | null>(null);

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setDraft((prev) => {
      const from = prev.findIndex((b) => b.id === dragId);
      const to = prev.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  };

  /** Files in flight, by block id, so each box can say it is working. */
  const [uploading, setUploading] = useState<Set<string>>(new Set());

  const markUploading = (id: string, on: boolean) =>
    setUploading((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Send one file to the bucket and point an existing block at it. */
  const uploadInto = async (blockId: string, file: File) => {
    setError(null);
    markUploading(blockId, true);
    const res = await uploadLessonMedia(file, topicId);
    markUploading(blockId, false);
    if (res.error) {
      setError(res.error);
      return;
    }
    patch(blockId, {
      src: res.url,
      kind: isVideo(file) ? "video" : "image",
    });
  };

  /**
   * Files dropped anywhere on the editor become new boxes at the end.
   *
   * Dropping several at once is the common case - a TA has a folder of
   * mechanism screenshots - so each file gets its own box rather than the first
   * winning and the rest being discarded silently.
   */
  const onDropFiles = async (files: FileList) => {
    const list = [...files].filter((f) => isImage(f) || isVideo(f));
    if (!list.length) return;

    const created = list.map((file) => ({
      id: newBlockId(),
      heading: "",
      body: "",
      kind: (isVideo(file) ? "video" : "image") as LessonBlockKind,
      width: "half" as const,
      src: "",
    }));
    setDraft((prev) => [...prev, ...created]);

    // Sequential rather than parallel: a handful of 10 MB files uploaded at once
    // on university wifi is how you get four timeouts instead of four pictures.
    for (let i = 0; i < list.length; i++) {
      await uploadInto(created[i].id, list[i]);
    }
  };

  const [dropActive, setDropActive] = useState(false);

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
      <section
        onDragOver={(e) => {
          // Only for files. Without this check, dragging a box's own handle
          // over the editor lights the whole thing up as a drop zone.
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={(e) => {
          // `relatedTarget` outside the section, rather than any leave event:
          // moving between two children fires leave on the parent as well.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDropActive(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDropActive(false);
          void onDropFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-3xl border-2 bg-indigo-50/50 p-5 transition-colors dark:bg-indigo-950/30 sm:p-6",
          dropActive
            ? "border-dashed border-blue-500 bg-blue-50/60 dark:bg-blue-950/30"
            : "border-indigo-300 dark:border-indigo-800",
        )}
      >
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
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.stopPropagation();
                dropOn(block.id);
              }}
              className={cn(
                "rounded-2xl border bg-white p-4 transition-opacity dark:bg-stone-900",
                dragId === block.id
                  ? "border-indigo-400 opacity-50"
                  : "border-slate-200 dark:border-stone-700",
              )}
            >
              {uploading.has(block.id) && (
                <p className="mb-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Uploading…
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                  {/* The grab handle. Only this is draggable, not the whole box:
                      making the card draggable means selecting text inside a
                      textarea starts a drag instead. */}
                  <span
                    draggable
                    onDragStart={() => setDragId(block.id)}
                    onDragEnd={() => setDragId(null)}
                    aria-hidden
                    className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:text-stone-500 dark:hover:bg-stone-800"
                    title="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  {(block.kind ?? "text") === "image"
                    ? "Picture"
                    : (block.kind ?? "text") === "video"
                      ? "Video"
                      : "Text"}{" "}
                  {index + 1}
                </span>

                <div className="flex items-center gap-1">
                  {/* Beside each other, or below. This is the whole of Kai's
                      layout request: a half box shares its row with the next
                      half box, a full box takes the row to itself. */}
                  <button
                    type="button"
                    onClick={() =>
                      patch(block.id, {
                        width: (block.width ?? "full") === "full" ? "half" : "full",
                      })
                    }
                    className="mr-1 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
                    title="Full width, or half so another box can sit beside it"
                  >
                    {(block.width ?? "full") === "full" ? (
                      <>
                        <RectangleHorizontal className="size-3.5" />
                        Full width
                      </>
                    ) : (
                      <>
                        <Columns2 className="size-3.5" />
                        Half
                      </>
                    )}
                  </button>
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

              {/* Where the picture or the clip lives.
                  Shown only for media boxes, and it takes either a link or a
                  file, because the two ways a TA will reach for this are "I
                  have a YouTube URL" and "I have a file on my desktop". */}
              {(block.kind ?? "text") !== "text" && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <Label htmlFor={`s-${block.id}`}>
                    {block.kind === "video" ? "YouTube link, or a video file" : "Picture"}
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id={`s-${block.id}`}
                      value={block.src ?? ""}
                      onChange={(e) => patch(block.id, { src: e.target.value })}
                      placeholder={
                        block.kind === "video"
                          ? "https://www.youtube.com/watch?v=..."
                          : "Drop a file anywhere, or paste a link"
                      }
                      className="min-w-0 flex-1"
                    />
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-200 dark:hover:border-indigo-500">
                      <Upload className="size-4" />
                      Choose file
                      <input
                        type="file"
                        accept={block.kind === "video" ? "video/*" : "image/*"}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          // Cleared so choosing the same file twice still fires.
                          e.target.value = "";
                          if (file) void uploadInto(block.id, file);
                        }}
                      />
                    </label>
                  </div>

                  {block.src && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-stone-700">
                      <LessonBlocks blocks={[{ ...block, heading: undefined, body: "" }]} />
                    </div>
                  )}
                </div>
              )}

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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setDraft((prev) => [...prev, { id: newBlockId(), heading: "", body: "" }])
            }
          >
            <Plus className="size-4" />
            Add a text box
          </Button>
          {/* Pictures and clips default to half width, because the reason to add
              one is usually to put it beside something. */}
          <Button
            variant="outline"
            onClick={() =>
              setDraft((prev) => [
                ...prev,
                { id: newBlockId(), heading: "", body: "", kind: "image", width: "half", src: "" },
              ])
            }
          >
            <ImageIcon className="size-4" />
            Add a picture
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setDraft((prev) => [
                ...prev,
                { id: newBlockId(), heading: "", body: "", kind: "video", width: "half", src: "" },
              ])
            }
          >
            <Film className="size-4" />
            Add a video
          </Button>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-stone-300">
          Drop pictures or short clips anywhere on this panel and they become boxes. For a long
          video, paste a YouTube link rather than uploading the file.
        </p>
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
