"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  CircleDot,
  Droplets,
  Eye,
  EyeOff,
  FlaskConical,
  Info as InfoIcon,
  Minus,
  Pencil,
  PenLine,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { MoleculeArt } from "@/components/ui/lesson-nav";
import type { Stage, StagedReaction } from "@/data/reactions";
import { setCourseField } from "@/lib/useCourse";
import { cn } from "@/lib/utils";

/**
 * One reaction, in full.
 *
 * Three things this does that a flat reaction card cannot:
 *
 * 1. The product hides. "Predict the product" is the exercise, and a page that
 *    shows the answer next to the question is a reference sheet, not practice.
 * 2. The stages stay apart. Stage 1 is the hydride and stage 2 is the acid
 *    workup, and collapsing them is what produced "NaBH4, acidic conditions".
 * 3. Staff can edit in place. The written summary and the video live in the
 *    sheet as overrides, merged over the generated data, so a TA fixing a note
 *    never touches the file the checker writes.
 */

const ACID_BASE: Record<string, { label: string; Icon: typeof Droplets; chip: string }> = {
  acidic: {
    label: "acidic",
    Icon: Droplets,
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900",
  },
  basic: {
    label: "basic",
    Icon: FlaskConical,
    chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900",
  },
  neutral: {
    label: "neutral",
    Icon: Minus,
    chip: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700",
  },
};

const ROLE_LABEL: Record<string, string> = {
  reagent: "Reagent",
  workup: "Workup",
  catalyst: "Catalyst",
};

export interface ReactionOverrideValues {
  videoUrl?: string;
  whyThisReagent?: string;
}

export function ReactionPanel({
  reaction,
  canEdit,
  idToken,
  overrides,
  onSaved,
}: {
  reaction: StagedReaction;
  canEdit: boolean;
  idToken: string | null;
  overrides?: ReactionOverrideValues;
  onSaved?: () => void;
}) {
  /**
   * Hidden by default only if the reaction is being met for the first time.
   *
   * Resets whenever the reaction changes: leaving the previous answer revealed
   * would quietly show the next one too, which is the one thing this control
   * exists to prevent.
   */
  const [showProduct, setShowProduct] = useState(false);
  useEffect(() => setShowProduct(false), [reaction.id]);

  const [editing, setEditing] = useState(false);
  const flagged = reaction.validation.status !== "ok";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950/70 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-fuchsia-700 dark:text-fuchsia-300">
            {reaction.family.replace("/", " / ").replace(/-/g, " ")}
          </p>
          <h2 className="title-face mt-2 text-3xl leading-tight sm:text-4xl">{reaction.name}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* An anchor, not a button with a click handler: it is a real route,
              so it should be shareable, openable in a new tab, and reachable by
              the browser's own back button. */}
          <Button asChild>
            <a href={`#/draw/${reaction.id}`}>
              <PenLine className="size-4" />
              Draw the product
            </a>
          </Button>
          {canEdit && (
            <Button
              variant={editing ? "secondary" : "outline"}
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
            >
              <Pencil className="size-4" />
              {editing ? "Done editing" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {/* The scheme. Start on the left, product on the right, and the product
          covered until asked for. */}
      <div className="mt-6 grid items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/70 sm:grid-cols-[1fr_auto_1fr]">
        <figure className="m-0">
          <MoleculeArt
            light={reaction.art.start_light}
            dark={reaction.art.start_dark}
            alt={`Structure of ${reaction.reactant_labels.join(" and ")}`}
            className="mx-auto h-auto w-full max-w-[340px]"
          />
          <figcaption className="mt-1 text-center text-sm font-semibold">
            {reaction.reactant_labels.join(" + ")}
          </figcaption>
        </figure>

        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-stone-500">
          <ArrowRight className="size-6 rotate-90 sm:rotate-0" aria-label="gives" />
        </div>

        <figure className="m-0">
          <div className="relative">
            <div className={cn(!showProduct && "blur-lg select-none")} aria-hidden={!showProduct}>
              <MoleculeArt
                light={reaction.art.product_light}
                dark={reaction.art.product_dark}
                alt={showProduct ? `Structure of ${reaction.product_label}` : ""}
                className="mx-auto h-auto w-full max-w-[340px]"
              />
            </div>
            {!showProduct && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button variant="secondary" onClick={() => setShowProduct(true)}>
                  <Eye className="size-4" />
                  Show product
                </Button>
              </div>
            )}
          </div>
          <figcaption className="mt-1 flex items-center justify-center gap-2 text-center text-sm font-semibold">
            {showProduct ? (
              <>
                {reaction.product_label}
                <button
                  type="button"
                  onClick={() => setShowProduct(false)}
                  className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  <EyeOff className="size-3.5" />
                  Hide
                </button>
              </>
            ) : (
              <span className="text-slate-400 dark:text-stone-500">Product hidden</span>
            )}
          </figcaption>
        </figure>
      </div>

      <h3 className="mt-7 font-mono text-xs font-semibold uppercase tracking-[.16em] text-slate-500 dark:text-stone-400">
        Conditions, stage by stage
      </h3>
      <ol className="mt-3 flex flex-col gap-3">
        {reaction.stages.map((stage) => (
          <StageRow
            key={stage.order}
            stage={stage}
            committed={reaction.committed_step_index === stage.order}
          />
        ))}
      </ol>

      {overrides?.whyThisReagent && (
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
          <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
            Why this reagent
          </h3>
          <p className="mt-1 text-sm leading-6 text-indigo-900/85 dark:text-indigo-100/85">
            {overrides.whyThisReagent}
          </p>
        </div>
      )}

      {overrides?.videoUrl && (
        <div className="mt-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Video className="size-4 text-indigo-600 dark:text-indigo-300" />
            Walkthrough
          </h3>
          <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-stone-800">
            <iframe
              src={overrides.videoUrl}
              title={`Walkthrough for ${reaction.name}`}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Info title="Reaction type" icon={<FlaskConical className="size-4" />}>
          {reaction.reaction_type}
        </Info>
        <Info
          title={reaction.reversible ? "Reversible" : "Not reversible"}
          icon={<RefreshCw className="size-4" />}
        >
          {reaction.reversible
            ? "An equilibrium. Drive it by removing a product or using an excess."
            : reaction.committed_step_index
              ? `Committed at stage ${reaction.committed_step_index}. Everything before that is reversible scaffolding.`
              : "Runs to completion."}
        </Info>
      </div>

      <ChecksStrip reaction={reaction} flagged={flagged} />

      {editing && (
        <StaffEditor
          reaction={reaction}
          idToken={idToken}
          overrides={overrides}
          onSaved={onSaved}
        />
      )}
    </article>
  );
}

function StaffEditor({
  reaction,
  idToken,
  overrides,
  onSaved,
}: {
  reaction: StagedReaction;
  idToken: string | null;
  overrides?: ReactionOverrideValues;
  onSaved?: () => void;
}) {
  const [video, setVideo] = useState(overrides?.videoUrl ?? "");
  const [why, setWhy] = useState(overrides?.whyThisReagent ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVideo(overrides?.videoUrl ?? "");
    setWhy(overrides?.whyThisReagent ?? "");
    setState("idle");
    setError(null);
  }, [reaction.id, overrides?.videoUrl, overrides?.whyThisReagent]);

  const save = async () => {
    setState("saving");
    setError(null);
    for (const [field, value] of [
      ["videoUrl", video],
      ["whyThisReagent", why],
    ] as const) {
      const res = await setCourseField({
        kind: "reaction",
        id: reaction.id,
        field,
        value,
        idToken,
      });
      if (!res.ok) {
        setState("idle");
        setError(res.error ?? "That did not save.");
        return;
      }
    }
    setState("saved");
    onSaved?.();
  };

  return (
    <section className="mt-6 rounded-2xl border-2 border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-950/30">
      <h3 className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-100">
        <Pencil className="size-4" />
        Staff edit
      </h3>
      <p className="mt-1 text-sm text-indigo-900/80 dark:text-indigo-100/80">
        Saved as an override on top of the generated data. Clearing a field puts the original
        back. Structures and conditions are not editable here: those come from the checked
        pipeline, and a hand edit would go around the conservation checks.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`why-${reaction.id}`}>Why this reagent</Label>
          <textarea
            id={`why-${reaction.id}`}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            placeholder="The thing students actually ask. Why LDA and not an alkoxide."
            className="min-h-20 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`video-${reaction.id}`}>Walkthrough video</Label>
          <Input
            id={`video-${reaction.id}`}
            type="url"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://..."
          />
          {/* Said plainly rather than shipping a file picker that cannot work.
              A video file has to live somewhere with signed, expiring links, or
              an unlisted link gets shared and the subscription means nothing.
              That storage does not exist yet. */}
          <p className="text-xs text-muted-foreground">
            An embed URL for now. Direct file upload needs private storage with expiring
            links, which is not built yet, and an unlisted link is shareable.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {state === "saved" && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CircleCheck className="size-4" />
              Saved
            </span>
          )}
          <Button onClick={() => void save()} disabled={state === "saving"}>
            {state === "saving" ? (
              <Loader variant="dots" size="sm" text="Saving" />
            ) : (
              <>
                <Save className="size-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ChecksStrip({ reaction, flagged }: { reaction: StagedReaction; flagged: boolean }) {
  return (
    <div
      className={cn(
        "mt-6 rounded-2xl border p-4",
        flagged
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30"
          : "border-slate-200 bg-slate-50/80 dark:border-stone-800 dark:bg-stone-900/70",
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {flagged ? (
          <TriangleAlert className="size-4 text-amber-700 dark:text-amber-300" />
        ) : (
          <ShieldCheck className="size-4 text-indigo-600 dark:text-indigo-300" />
        )}
        How this was checked
      </h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <Check label="Structures" value={reaction.validation.checks.parse ?? "not run"} />
        <Check label="Conservation" value={reaction.validation.checks.conservation ?? "not run"} />
        <Check
          label="Classification"
          value={reaction.validation.checks.classification ?? "not run"}
        />
      </dl>
      <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-stone-800 dark:text-stone-400">
        Source:{" "}
        <span className="font-mono font-semibold text-slate-700 dark:text-stone-200">
          {reaction.provenance}
        </span>
        .{" "}
        {reaction.provenance === "ta-verified"
          ? "Signed off by course staff."
          : "Not yet signed off by course staff. Conditions are not machine-checkable."}
      </p>
    </div>
  );
}

function StageRow({ stage, committed }: { stage: Stage; committed: boolean }) {
  const ab = ACID_BASE[stage.conditions.acid_base] ?? ACID_BASE.neutral;
  const { Icon } = ab;

  return (
    <li
      className={cn(
        "rounded-2xl border p-4",
        committed
          ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/30"
          : "border-slate-200 bg-slate-50/80 dark:border-stone-800 dark:bg-stone-900/70",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-xs font-bold text-white dark:bg-stone-100 dark:text-stone-900">
          {stage.order}
        </span>
        <span className="text-sm font-semibold">{ROLE_LABEL[stage.role] ?? stage.role}</span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[.7rem] font-semibold ring-1",
            ab.chip,
          )}
        >
          <Icon className="size-3" />
          {ab.label}
        </span>
        {stage.conditions.temperature_c !== null && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[.7rem] font-semibold text-slate-600 dark:bg-stone-800 dark:text-stone-300">
            {stage.conditions.temperature_c} &deg;C
          </span>
        )}
        {stage.conditions.solvent && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[.7rem] text-slate-600 dark:bg-stone-800 dark:text-stone-300">
            {stage.conditions.solvent}
          </span>
        )}
        {committed && (
          <span className="ml-auto flex items-center gap-1 text-[.7rem] font-semibold text-indigo-700 dark:text-indigo-300">
            <CircleDot className="size-3" />
            committed step
          </span>
        )}
      </div>

      <p className="mt-2 font-mono text-sm text-indigo-700 dark:text-indigo-300">
        {stage.reagents.join("  |  ")}
      </p>
      {stage.conditions.notes && (
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">
          {stage.conditions.notes}
        </p>
      )}
      {stage.byproducts.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-stone-400">
          Byproducts: <span className="font-mono">{stage.byproducts.join(", ")}</span>
        </p>
      )}
    </li>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  const good = /^(ok|BALANCED|REDOX_OK|agrees)$/.test(value);
  const bad = value === "MISMATCH" || value.includes("FAIL");
  return (
    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
      <dt className="text-slate-600 dark:text-stone-300">{label}</dt>
      <dd
        className={cn(
          "flex items-center gap-1 font-mono text-xs font-semibold",
          good && "text-emerald-700 dark:text-emerald-300",
          bad && "text-amber-700 dark:text-amber-300",
          !good && !bad && "text-slate-500 dark:text-stone-400",
        )}
      >
        {good && <CircleCheck className="size-3.5 shrink-0" />}
        {bad && <TriangleAlert className="size-3.5 shrink-0" />}
        {!good && !bad && <InfoIcon className="size-3.5 shrink-0" />}
        {value.replace(/\(.*\)/, "").trim()}
      </dd>
    </div>
  );
}

function Info({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/70">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">{children}</p>
    </div>
  );
}
