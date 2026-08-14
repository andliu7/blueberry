"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileIcon,
  FileText,
  Loader2,
  RotateCcw,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A drop target with a queue of what has been dropped on it.
 *
 * Adapted from the supplied component. What changed and why:
 *
 * 1. **The shadcn colour tokens are gone.** It was written against
 *    `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`
 *    and `text-destructive`, which are CSS variables this project has never
 *    defined. Every one of them resolves to nothing here, so the dropzone would
 *    have rendered as invisible text on a transparent panel. They are the
 *    slate and stone pairs the rest of the site uses.
 * 2. **It does not carry its own `cn`.** The original pastes in `clsx` and
 *    `twMerge` and redefines the helper, which would have meant two copies of it
 *    in the bundle and two places to change a class-merging rule.
 * 3. **The spring and easing table went with it.** Five exported presets, of
 *    which the file used two.
 * 4. **The file-type icon table is down to two.** It could tell a spreadsheet
 *    from an archive from a video; this accepts `.txt` and nothing else, so the
 *    branch was dead weight.
 *
 * Nothing was installed. `clsx`, `tailwind-merge`, `motion` and `lucide-react`
 * are all already here, which is the whole of the suggested dependency list.
 */

export type FileUploadStatus = "queued" | "uploading" | "success" | "error";

export type FileUploadItem = {
  id: string;
  name: string;
  size: number;
  type?: string;
  progress?: number;
  status?: FileUploadStatus;
  error?: string;
  file?: File;
};

export interface FileUploadProps {
  value: FileUploadItem[];
  onValueChange: (items: FileUploadItem[]) => void;
  onFilesAdded?: (items: FileUploadItem[], files: File[]) => void;
  onRemove?: (item: FileUploadItem) => void;
  onRetry?: (item: FileUploadItem) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  title?: string;
  description?: string;
  browseLabel?: string;
  className?: string;
}

const STATUS_LABEL: Record<FileUploadStatus, string> = {
  queued: "Queued",
  uploading: "Reading",
  success: "Ready",
  error: "Failed",
};

const STATUS_TONE: Record<FileUploadStatus, string> = {
  queued: "text-slate-400 dark:text-stone-500",
  uploading: "text-slate-600 dark:text-stone-300",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value >= 10 || exp === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exp]}`;
}

/**
 * Does this file satisfy an `accept` string?
 *
 * Extensions are matched on the filename, not the MIME type, because Windows
 * reports `.txt` as `text/plain` and some tools report it as an empty string,
 * and an empty string is indistinguishable from a file the browser simply could
 * not identify. MIME entries in `accept` are still honoured, including the
 * `image/*` wildcard form, for callers that want them.
 *
 * No `accept` means accept anything, which is what the attribute means on the
 * input itself.
 */
function matchesAccept(file: File, accept?: string): boolean {
  const rules = (accept ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

/** "a .pdf file", "a .txt file", "an accepted file type" — for the message. */
function describeAccept(accept?: string): string {
  const extensions = (accept ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("."));
  if (extensions.length === 0) return "an accepted file type";
  if (extensions.length === 1) return `a ${extensions[0]} file`;
  return `one of ${extensions.join(", ")}`;
}

export function createFileUploadItem(file: File, index = 0): FileUploadItem {
  return {
    id: `${Date.now()}-${index}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    progress: 0,
    status: "uploading",
    file,
  };
}

function StatusIcon({ status }: { status: FileUploadStatus }) {
  const reduce = useReducedMotion() ?? false;
  const cls = "h-4 w-4";
  return (
    <span className={cn("grid h-6 w-6 place-items-center", STATUS_TONE[status])}>
      {status === "success" ? (
        <CheckCircle2 className={cls} />
      ) : status === "error" ? (
        <AlertCircle className={cls} />
      ) : status === "uploading" ? (
        <Loader2 className={cn(cls, "animate-spin", reduce && "animate-none")} />
      ) : (
        <FileIcon className={cls} />
      )}
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  );
}

export function FileUpload({
  value: items,
  onValueChange,
  onFilesAdded,
  onRemove,
  onRetry,
  accept,
  multiple = false,
  maxFiles,
  disabled = false,
  title = "Drop a file here",
  description = "or browse for one",
  browseLabel = "Browse",
  className,
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Counted, not a boolean: dragging over a child fires `dragleave` on the
  // parent, so a flag alone flickers the whole time the pointer is inside.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const [rejected, setRejected] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (disabled || incoming.length === 0) return;

      /**
       * The real check on the file type, taken from `accept`.
       *
       * `accept` on the input is only a hint to the file picker's filter, and it
       * does nothing at all for a drag and drop: the browser hands over whatever
       * was dragged, `.docx` and `.pdf` included. Without a check here the file
       * reached the parser, which found no `Q:` lines in the binary and reported
       * "No questions found", which is true and completely unhelpful.
       *
       * This used to hardcode `.txt`, because the component was written for deck
       * uploads and its one rule was never wired to its one prop. That made
       * `accept` a lie: the syllabus importer asked for `.pdf`, the picker
       * offered PDFs, and the dropzone then refused every one of them for not
       * being a text file. The rule now follows the prop.
       */
      const bad = incoming.find((f) => !matchesAccept(f, accept));
      if (bad) {
        setRejected(`${bad.name} is not ${describeAccept(accept)}. Try a different file.`);
        return;
      }
      setRejected(null);

      const slots = maxFiles === undefined ? incoming.length : maxFiles - items.length;
      if (slots <= 0) return;
      const files = incoming.slice(0, multiple ? slots : Math.min(1, slots));
      const added = files.map((file, i) => createFileUploadItem(file, i));
      if (added.length === 0) return;
      onValueChange([...items, ...added]);
      onFilesAdded?.(added, files);
    },
    [disabled, items, maxFiles, multiple, onFilesAdded, onValueChange],
  );

  const maxReached = maxFiles !== undefined && items.length >= maxFiles;

  return (
    <div className={cn("w-full space-y-3", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        aria-label="Upload a deck file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || maxReached}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          addFiles(Array.from(e.currentTarget.files ?? []));
          e.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled || maxReached}
        data-dragging={dragging}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          if (disabled || maxReached) return;
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (disabled || maxReached) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (disabled || maxReached) return;
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          if (disabled || maxReached) return;
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-5 text-left outline-none",
          "border border-dashed border-slate-300 bg-white/60 dark:border-stone-700 dark:bg-stone-900/50",
          "transition-[border-color,transform,background-color] duration-200 active:scale-[0.99]",
          "hover:border-indigo-400 dark:hover:border-indigo-400",
          "data-[dragging=true]:border-indigo-500 data-[dragging=true]:bg-indigo-50/70",
          "dark:data-[dragging=true]:bg-indigo-400/10",
          "focus-visible:ring-2 focus-visible:ring-indigo-400",
          "disabled:pointer-events-none disabled:opacity-55",
        )}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300">
          <UploadCloud className="h-6 w-6" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-stone-100">
            {maxReached ? "File attached" : title}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-stone-400">
            {maxReached ? "Remove it to choose another" : description}
          </span>
        </span>

        <span className="shrink-0 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors group-hover:bg-slate-50 dark:border-stone-700 dark:text-stone-200 dark:group-hover:bg-white/5">
          {browseLabel}
        </span>
      </button>

      {rejected && (
        <p className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {rejected}
        </p>
      )}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const status = item.status ?? "queued";
            const progress = status === "success" ? 100 : Math.max(0, Math.min(100, item.progress ?? 0));
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-stone-800 dark:text-stone-400">
                    <FileText className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-stone-100">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-stone-400">
                          {formatBytes(item.size)}
                          {status === "error" && item.error ? ` · ${item.error}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <StatusIcon status={status} />
                        {status === "error" && (
                          <button
                            type="button"
                            onClick={() => onRetry?.(item)}
                            aria-label={`Retry ${item.name}`}
                            className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onValueChange(items.filter((e) => e.id !== item.id));
                            onRemove?.(item);
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {(status === "uploading" || status === "success") && (
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                        aria-label={`${item.name} progress`}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-stone-800"
                      >
                        <motion.div
                          className={cn(
                            "h-full origin-left rounded-full",
                            status === "success" ? "bg-emerald-500" : "bg-indigo-500",
                          )}
                          initial={false}
                          animate={{ scaleX: progress / 100 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export default FileUpload;
