"use client";

import { useState } from "react";
import { FileUp, TriangleAlert, X } from "lucide-react";
import { FileUpload, type FileUploadItem } from "@/components/ui/be-ui-file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseDate } from "@/components/ui/event-manager";
import { importSyllabus, saveDates } from "@/lib/calendar";
import { cn } from "@/lib/utils";

/**
 * Upload a syllabus, check what was read, save it.
 *
 * Built as a ticket rather than a panel bolted to the calendar page, because
 * the import is not really a calendar feature — it is a thing you do
 * occasionally, from wherever you happen to be, and it should not need you to
 * navigate somewhere first. Same shape as `DeckUploadTicket`, same dropzone
 * component, so there is one upload interaction on this site rather than two.
 *
 * The step that matters is the middle one. What comes back from the model is a
 * proposal, not an answer: dates printed without a year are the ones it gets
 * wrong, and an import that silently put the wrong midterm in front of a class
 * would be worse than having no import at all.
 */

const KIND_LABELS: Record<CourseDate["kind"], string> = {
  exam: "Exam",
  quiz: "Quiz",
  assignment: "Assignment",
  lecture: "Lecture",
  lab: "Lab",
  "office-hours": "Office hours",
};

const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export interface SyllabusImportTicketProps {
  idToken: string | null;
  /** Handed the full refreshed list once something is saved. */
  onSaved?: (dates: CourseDate[]) => void;
  className?: string;
}

export function SyllabusImportTicket({
  idToken,
  onSaved,
  className,
}: SyllabusImportTicketProps) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<FileUploadItem[]>([]);
  const [status, setStatus] = useState<"idle" | "reading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CourseDate[] | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  const reset = () => {
    setQueue([]);
    setDraft(null);
    setDropped(new Set());
    setError(null);
    setStatus("idle");
  };

  const onFile = async (file: File) => {
    setStatus("reading");
    setError(null);
    setDraft(null);
    const { dates, error: err } = await importSyllabus(file, idToken);
    setStatus("idle");
    if (err) return setError(err);
    if (dates.length === 0) return setError("No dates could be read from that PDF.");
    setDraft(dates);
    setDropped(new Set());
  };

  const commit = async () => {
    if (!draft) return;
    const keep = draft.filter((d) => !dropped.has(d.id));
    if (keep.length === 0) return reset();

    setStatus("saving");
    // Drafts carry a placeholder id so React can key them. Clearing it is what
    // tells the backend these are new rows, not edits to a row called "draft-0".
    const { dates, error: err } = await saveDates(
      keep.map((d) => ({ ...d, id: "" })),
      idToken,
    );
    setStatus("idle");
    if (err) return setError(err);
    onSaved?.(dates);
    reset();
    setOpen(false);
  };

  const patch = (id: string, change: Partial<CourseDate>) =>
    setDraft((prev) => prev?.map((d) => (d.id === id ? { ...d, ...change } : d)) ?? null);

  const toggle = (id: string) =>
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className={className}>
        <FileUp className="size-4" />
        Import a syllabus
      </Button>
    );
  }

  const keeping = draft ? draft.length - dropped.size : 0;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        draft && "border-2 border-indigo-300 dark:border-indigo-800",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">
            {draft ? `Found ${draft.length} ${draft.length === 1 ? "date" : "dates"}` : "Import a syllabus"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft
              ? "Check these before saving. Dates printed without a year are the ones it gets wrong."
              : "A PDF under 3MB. Nothing is saved until you have looked at what it found."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Close"
          className="-mr-1 -mt-1 shrink-0 text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {!draft && (
        <div className="mt-3">
          <FileUpload
            value={queue}
            onValueChange={setQueue}
            onFilesAdded={(_added, files) => files[0] && void onFile(files[0])}
            onRemove={reset}
            accept=".pdf,application/pdf"
            maxFiles={1}
            title="Drop a syllabus PDF here"
            description="One file. Read once, then shown to you before anything is saved."
          />
        </div>
      )}

      {status === "reading" && (
        <div className="mt-4 flex items-center gap-3">
          <Loader variant="bars" size="sm" text="Reading the syllabus" />
          <Loader variant="text-shimmer" size="sm" text="Reading the syllabus…" />
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {draft && (
        <>
          <ul className="mt-4 flex flex-col gap-3">
            {draft.map((d) => {
              const off = dropped.has(d.id);
              return (
                <li
                  key={d.id}
                  className={cn("rounded-xl border border-border p-3 transition", off && "opacity-50")}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => toggle(d.id)}
                      aria-label={`Include ${d.title}`}
                      className="mt-3 size-4 shrink-0 cursor-pointer accent-indigo-500"
                    />
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor={`t-${d.id}`}>Title</Label>
                        <Input
                          id={`t-${d.id}`}
                          value={d.title}
                          disabled={off}
                          onChange={(e) => patch(d.id, { title: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`k-${d.id}`}>Kind</Label>
                        <Select
                          value={d.kind}
                          disabled={off}
                          onValueChange={(kind) => patch(d.id, { kind: kind as CourseDate["kind"] })}
                        >
                          <SelectTrigger id={`k-${d.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(KIND_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`s-${d.id}`}>Starts</Label>
                        <Input
                          id={`s-${d.id}`}
                          type="datetime-local"
                          disabled={off}
                          value={toLocalInput(d.start)}
                          onChange={(e) => {
                            const next = new Date(e.target.value);
                            if (!Number.isNaN(next.getTime())) patch(d.id, { start: next });
                          }}
                        />
                      </div>
                      {d.detail && (
                        <p className="text-xs text-muted-foreground sm:col-span-2">{d.detail}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={reset} disabled={status === "saving"}>
              Start over
            </Button>
            <Button onClick={() => void commit()} disabled={status === "saving" || keeping === 0}>
              {status === "saving" ? (
                <Loader variant="dots" size="sm" text="Saving" />
              ) : (
                `Save ${keeping} to the calendar`
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

export default SyllabusImportTicket;
