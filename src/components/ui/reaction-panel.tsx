"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Droplets,
  FlaskConical,
  Info as InfoIcon,
  Minus,
  Pencil,
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
import { StageReagents } from "@/components/ui/reagent-line";
import type { Stage, StagedReaction } from "@/data/reactions";
import { setCourseField } from "@/lib/useCourse";
import { cn } from "@/lib/utils";

/**
 * One reaction, in full: the body of the reaction sheet (SITE-REPLAN.md section 3).
 *
 * Three sides, switched by a segmented pill (DESIGN-GOALS.md, Cards): Setup (what
 * goes in), Conditions (the stages, why this reagent, how it was checked) and
 * Product. It opens on Setup, so the product stays hidden until a student asks
 * for it: "predict the product" is the exercise, and a sheet that shows the
 * answer beside the question is a reference card, not practice.
 *
 * The stages stay apart. Stage 1 is the hydride and stage 2 the acid workup;
 * collapsing them is what produced "NaBH4, acidic conditions".
 *
 * Staff edit in place. The written note and the video are overrides merged over
 * the generated data, so a TA fixing a note never touches the file the checker
 * writes.
 *
 * DRAWN, NEVER SPELLED (owner, 27 Sep). Every molecule here is an RDKit drawing.
 * The molecular formulas that used to sit under the names, and the byproducts
 * line (raw SMILES such as "O=S=O"), are gone; src/test/learn.test.ts asserts no
 * SMILES string from the data reaches the text of this sheet.
 */

/** Acid, base and neutral each get a word and an icon, never a colour alone. */
const ACID_BASE: Record<string, { label: string; Icon: typeof Droplets; chip: string }> = {
  acidic: { label: "acidic", Icon: Droplets, chip: "bg-[var(--bb-wash)] text-[var(--lrn-ink)]" },
  // --lrn-ink, not --bb-blue-ink: the blue measured 4.21:1 on this wash at 12px
  // (critic, 7 Oct). The word and the icon carry acid against base, not the hue.
  basic: { label: "basic", Icon: FlaskConical, chip: "bg-[var(--bb-wash)] text-[var(--lrn-ink)]" },
  neutral: { label: "neutral", Icon: Minus, chip: "bg-muted text-[var(--site-quiet)]" },
};

const ROLE_LABEL: Record<string, string> = {
  reagent: "Reagent",
  workup: "Workup",
  catalyst: "Catalyst",
};

export type ReactionSide = "setup" | "conditions" | "product";
const SIDES: { id: ReactionSide; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "conditions", label: "Conditions" },
  { id: "product", label: "Product" },
];

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
  initialSide = "setup",
}: {
  reaction: StagedReaction;
  canEdit: boolean;
  idToken: string | null;
  overrides?: ReactionOverrideValues;
  onSaved?: () => void;
  initialSide?: ReactionSide;
}) {
  // Starts on Setup. The sheet gives this panel `key={reaction.id}`, so a new
  // reaction is a fresh panel back on Setup: leaving Product showing would
  // quietly reveal the next reaction's answer too.
  const [side, setSide] = useState<ReactionSide>(initialSide);
  const [editing, setEditing] = useState(false);
  const flagged = reaction.validation.status !== "ok";

  return (
    <div>
      <div role="tablist" aria-label="Reaction sides" className="lrn-seg">
        {SIDES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`side-${s.id}`}
            aria-selected={side === s.id}
            aria-controls="reaction-side"
            onClick={() => setSide(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div id="reaction-side" role="tabpanel" aria-labelledby={`side-${side}`} className="mt-4">
        {side === "setup" && (
          <>
            <figure className="m-0 rounded-2xl border-2 border-[var(--site-border)] bg-card p-3">
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
            <h3 className="lrn-eyebrow mt-5">What you add, in order</h3>
            <ol className="mt-2 flex flex-col gap-2" data-reagents>
              {reaction.stages.map((stage) => (
                <li key={stage.order} className="flex items-center gap-3">
                  <StageNumber order={stage.order} />
                  <div className="min-w-0">
                    <StageReagents stage={stage} />
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 flex items-center gap-2 text-sm text-[var(--site-quiet)]">
              What comes out? Draw it, then check the Product side.
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </p>
          </>
        )}

        {side === "conditions" && (
          <>
            <ol className="flex flex-col gap-3">
              {reaction.stages.map((stage) => (
                <StageRow key={stage.order} stage={stage} />
              ))}
            </ol>

            {overrides?.whyThisReagent && (
              <div className="mt-5 rounded-2xl bg-[var(--bb-wash)] p-4">
                <h3 className="text-sm font-semibold text-[var(--bb-deep)]">Why this reagent</h3>
                <p className="mt-1 text-sm leading-6">{overrides.whyThisReagent}</p>
              </div>
            )}

            {overrides?.videoUrl && (
              <div className="mt-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Video className="size-4 text-[var(--lrn-ink)]" />
                  Walkthrough
                </h3>
                <div className="aspect-video overflow-hidden rounded-2xl border-2 border-[var(--site-border)] bg-black">
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info title="Reaction type" icon={<FlaskConical className="size-4" />}>
                {reaction.reaction_type}
              </Info>
              <Info
                title={reaction.reversible ? "Reversible" : "Not reversible"}
                icon={<RefreshCw className="size-4" />}
              >
                {/* Learn round 2: the "Committed at stage N ... reversible scaffolding"
                    line was the pipeline's vocabulary, not a student's. Where it
                    stood the card says nothing; the owner has the gap. */}
                {reaction.reversible
                  ? "An equilibrium. Drive it by removing a product or using an excess."
                  : reaction.committed_step_index
                    ? null
                    : "Runs to completion."}
              </Info>
            </div>

            {/* How the pipeline checked it ("BALANCED", "Source: professor-slide")
                is for the staff who sign reactions off, not for a student. */}
            {canEdit && <ChecksStrip reaction={reaction} flagged={flagged} />}
          </>
        )}

        {side === "product" && (
          <figure className="m-0 rounded-2xl border-2 border-[var(--site-border)] bg-card p-3">
            <MoleculeArt
              light={reaction.art.product_light}
              dark={reaction.art.product_dark}
              alt={`Structure of ${reaction.product_label}`}
              className="mx-auto h-auto w-full max-w-[340px]"
            />
            <figcaption className="mt-1 text-center text-sm font-semibold">{reaction.product_label}</figcaption>
          </figure>
        )}
      </div>

      {canEdit && (
        <div className="mt-5">
          <Button variant="outline" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
            <Pencil className="size-4" />
            {editing ? "Done editing" : "Edit"}
          </Button>
        </div>
      )}
      {editing && (
        <StaffEditor reaction={reaction} idToken={idToken} overrides={overrides} onSaved={onSaved} />
      )}
    </div>
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
    <section className="mt-4 rounded-2xl border-2 border-[var(--site-border)] bg-[var(--bb-wash)] p-5">
      <h3 className="flex items-center gap-2 font-semibold text-[var(--bb-deep)]">
        <Pencil className="size-4" />
        Staff edit
      </h3>
      <p className="mt-1 text-sm">
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
            <span className="flex items-center gap-1 text-sm font-medium">
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
        "mt-5 rounded-2xl border-2 p-4",
        flagged ? "border-[var(--bb-warn)] bg-[var(--bb-warn-wash)]" : "border-[var(--site-border)] bg-card",
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {flagged ? (
          <TriangleAlert className="size-4 text-[var(--bb-warn-ink)]" />
        ) : (
          <ShieldCheck className="size-4 text-[var(--lrn-ink)]" />
        )}
        How this was checked
      </h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <Check label="Structures" value={reaction.validation.checks.parse ?? "not run"} />
        <Check label="Conservation" value={reaction.validation.checks.conservation ?? "not run"} />
        <Check label="Classification" value={reaction.validation.checks.classification ?? "not run"} />
      </dl>
      <p className="mt-3 border-t border-[var(--site-border)] pt-3 text-xs leading-5 text-[var(--site-quiet)]">
        Source: <span className="font-semibold text-foreground">{reaction.provenance}</span>.{" "}
        {reaction.provenance === "ta-verified"
          ? "Signed off by course staff."
          : "Not yet signed off by course staff. Conditions are not machine-checkable."}
      </p>
    </div>
  );
}

function StageNumber({ order }: { order: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bb-deep)] text-xs font-bold text-card">
      {order}
    </span>
  );
}

function StageRow({ stage }: { stage: Stage }) {
  const ab = ACID_BASE[stage.conditions.acid_base] ?? ACID_BASE.neutral;
  const { Icon } = ab;

  return (
    <li className="rounded-2xl border-2 border-[var(--site-border)] bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StageNumber order={stage.order} />
        <span className="text-sm font-semibold">{ROLE_LABEL[stage.role] ?? stage.role}</span>
        <span className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold", ab.chip)}>
          <Icon className="size-3" />
          {ab.label}
        </span>
        {stage.conditions.temperature_c !== null && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold">
            {stage.conditions.temperature_c} &deg;C
          </span>
        )}
        {stage.conditions.solvent && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{stage.conditions.solvent}</span>
        )}
      </div>

      <div data-reagents className="mt-2">
        <StageReagents stage={stage} />
      </div>
      {stage.conditions.notes && <p className="mt-2 text-sm leading-6">{stage.conditions.notes}</p>}
    </li>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  const good = /^(ok|BALANCED|REDOX_OK|agrees)$/.test(value);
  const bad = value === "MISMATCH" || value.includes("FAIL");
  return (
    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
      <dt className="text-[var(--site-quiet)]">{label}</dt>
      <dd
        className={cn(
          "flex items-center gap-1 text-xs font-semibold",
          bad ? "text-[var(--bb-warn-ink)]" : "text-foreground",
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
    <div className="rounded-2xl border-2 border-[var(--site-border)] bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--lrn-ink)]">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </div>
  );
}
