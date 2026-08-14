"use client";

import { useEffect, useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";
import {
  ChevronLeft,
  CircleCheck,
  Eraser,
  FlaskConical,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { MoleculeCanvas } from "@/components/ui/molecule-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REACTIONS } from "@/data/reactions";
import {
  newTaReactionId,
  parseTaReactions,
  serialiseTaReactions,
  type TaReaction,
} from "@/data/taReactions";
import { setCourseField, useCourse } from "@/lib/useCourse";
import { useSession } from "@/lib/useSession";
import { StaffSignInNotice } from "@/components/ui/staff-signin-notice";
import { cn } from "@/lib/utils";

/**
 * The TA adds a reaction by drawing it.
 *
 * Typing SMILES is the wrong ask of a chemist. `C=CC(C)=O` is not how anyone
 * thinks about methyl vinyl ketone, and a mistyped one produces a structure
 * that parses and is wrong, which is the worst failure available. Drawing it
 * and reading the SMILES back out means the structure is whatever they drew.
 *
 * One canvas, captured twice, rather than two side by side. Two editors mean
 * two Indigo engines, and mechanism_trainer already found that sharing a
 * provider between them deadlocks `setMolecule` — one canvas sidesteps the
 * whole question and halves the memory on a page that already carries 16MB.
 */

const FAMILIES = [...new Set(REACTIONS.map((r) => r.family))].sort();

type Slot = "substrate" | "product";

export default function ReactionComposerPage() {
  const session = useSession();
  const isStaff = session?.role === "admin" || session?.role === "owner";
  // Role alone is not enough: a Clerk session resolves an owner from their
  // address but carries no token the server can verify. See `canWrite`.
  const canEdit = isStaff && Boolean(session?.canWrite);
  const idToken = session?.idToken ?? null;
  const { overrides, refresh } = useCourse();

  const ketcherRef = useRef<Ketcher | null>(null);
  const [draft, setDraft] = useState<TaReaction>(() => blank(session?.email ?? ""));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Everything already added, so a save appends rather than replaces.
  const existing = parseTaReactions(
    overrides?.topics?.find((t) => t.id === "__ta_reactions__")?.blocks,
  );

  useEffect(() => {
    if (session?.email) setDraft((d) => ({ ...d, addedBy: session.email }));
  }, [session?.email]);

  const capture = async (slot: Slot) => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    setError(null);
    try {
      const smiles = (await ketcher.getSmiles()).trim();
      if (!smiles) {
        setError("The canvas is empty. Draw a structure first.");
        return;
      }
      setDraft((d) => ({ ...d, [slot]: smiles }));
    } catch {
      setError("That drawing could not be read. Try simplifying it.");
    }
  };

  const save = async () => {
    if (!draft.name.trim()) return setError("Give the reaction a name.");
    if (!draft.product.trim()) return setError("Capture a product from the canvas.");

    setState("saving");
    setError(null);
    const next = [...existing, { ...draft, addedAt: new Date().toISOString() }];
    const res = await setCourseField({
      kind: "topic",
      id: "__ta_reactions__",
      field: "blocks",
      value: serialiseTaReactions(next),
      idToken,
    });
    setState("idle");
    if (!res.ok) return setError(res.error ?? "That did not save.");

    setState("saved");
    refresh();
    setDraft(blank(session?.email ?? ""));
    void ketcherRef.current?.setMolecule("");
  };

  const remove = async (id: string) => {
    setState("saving");
    const res = await setCourseField({
      kind: "topic",
      id: "__ta_reactions__",
      field: "blocks",
      value: serialiseTaReactions(existing.filter((r) => r.id !== id)),
      idToken,
    });
    setState("idle");
    if (!res.ok) return setError(res.error ?? "That did not save.");
    refresh();
  };

  if (!canEdit) {
    return (
      <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
        <PageBackground />
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
          {/* Two different reasons to be here, and they need different answers.
              Staff who simply signed in the wrong way get told which one works;
              everyone else gets the plain message. */}
          <StaffSignInNotice session={session} action="Adding a reaction" />
          {!isStaff && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-stone-700 dark:text-stone-300">
              Adding reactions is for course staff.{" "}
              <a href="#/lessons" className="font-semibold underline">
                Back to lessons
              </a>
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="#/lessons"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Lessons
        </a>

        <header className="mt-5 rounded-3xl border border-indigo-200/80 bg-white/75 p-6 shadow-sm dark:border-indigo-400/20 dark:bg-stone-950/70">
          <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">
            Staff / add a reaction
          </p>
          <h1 className="title-face mt-2 text-4xl leading-none">Add a reaction</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600 dark:text-stone-300">
            Draw the starting material, capture it, draw the product, capture that. The
            structures are read from what you drew, so there is no SMILES to mistype.
          </p>
          {/* Said up front, not discovered later. */}
          <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Reactions added here are marked as unchecked. The conservation and
              classification checks run in the Python build, not in the browser, so these
              appear with a warning until they are put through it.
            </span>
          </p>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_400px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
              <MoleculeCanvas
                className="h-[520px] w-full"
                onReady={(k) => {
                  ketcherRef.current = k;
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void capture("substrate")}>
                <FlaskConical className="size-4" />
                Capture as starting material
              </Button>
              <Button variant="outline" onClick={() => void capture("product")}>
                <CircleCheck className="size-4" />
                Capture as product
              </Button>
              <Button
                variant="ghost"
                onClick={() => void ketcherRef.current?.setMolecule("")}
              >
                <Eraser className="size-4" />
                Clear canvas
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
              <h2 className="font-semibold">Details</h2>

              <div className="mt-4 flex flex-col gap-4">
                <Field label="Name" htmlFor="ta-name" required>
                  <Input
                    id="ta-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Aldol condensation"
                  />
                </Field>

                <Field label="Family" htmlFor="ta-family">
                  <Select
                    value={draft.family}
                    onValueChange={(family) => setDraft({ ...draft, family })}
                  >
                    <SelectTrigger id="ta-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FAMILIES.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.replace("/", " / ").replace(/-/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Captured
                  label="Starting material"
                  smiles={draft.substrate}
                  name={draft.substrateLabel}
                  onName={(v) => setDraft({ ...draft, substrateLabel: v })}
                  onClear={() => setDraft({ ...draft, substrate: "" })}
                />
                <Captured
                  label="Product"
                  smiles={draft.product}
                  name={draft.productLabel}
                  onName={(v) => setDraft({ ...draft, productLabel: v })}
                  onClear={() => setDraft({ ...draft, product: "" })}
                  required
                />

                <Field label="Reagents" htmlFor="ta-reagents" hint="Separate with | for stages.">
                  <Input
                    id="ta-reagents"
                    value={draft.reagents}
                    onChange={(e) => setDraft({ ...draft, reagents: e.target.value })}
                    placeholder="NaOH | H3O+"
                  />
                </Field>

                <Field label="Conditions" htmlFor="ta-acidbase">
                  <Select
                    value={draft.acidBase}
                    onValueChange={(v) =>
                      setDraft({ ...draft, acidBase: v as TaReaction["acidBase"] })
                    }
                  >
                    <SelectTrigger id="ta-acidbase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="acidic">Acidic</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Notes" htmlFor="ta-notes">
                  <textarea
                    id="ta-notes"
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    rows={3}
                    placeholder="Why this reagent, what to watch for."
                    className="min-h-20 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </Field>

                {error && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                {state === "saved" && (
                  <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <CircleCheck className="size-4" />
                    Added.
                  </p>
                )}

                <Button onClick={() => void save()} disabled={state === "saving"}>
                  {state === "saving" ? (
                    <Loader variant="dots" size="sm" text="Saving" />
                  ) : (
                    <>
                      <Save className="size-4" />
                      Add this reaction
                    </>
                  )}
                </Button>
              </div>
            </section>

            {existing.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
                <h2 className="font-semibold">Added so far ({existing.length})</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {existing.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-stone-700"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="truncate font-mono text-xs text-slate-500 dark:text-stone-400">
                          {r.product}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${r.name}`}
                        onClick={() => void remove(r.id)}
                        className="shrink-0 text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function blank(email: string): TaReaction {
  return {
    id: newTaReactionId(),
    name: "",
    family: FAMILIES[0] ?? "carbonyls/addition",
    substrate: "",
    substrateLabel: "",
    product: "",
    productLabel: "",
    reagents: "",
    acidBase: "neutral",
    notes: "",
    addedBy: email,
    addedAt: "",
  };
}

function Captured({
  label,
  smiles,
  name,
  onName,
  onClear,
  required,
}: {
  label: string;
  smiles: string;
  name: string;
  onName: (v: string) => void;
  onClear: () => void;
  required?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        smiles
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-dashed border-slate-300 dark:border-stone-700",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </span>
        {smiles && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 cursor-pointer px-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            Clear
          </button>
        )}
      </div>
      {smiles ? (
        <>
          <p className="mt-1 break-all font-mono text-xs text-slate-600 dark:text-stone-300">
            {smiles}
          </p>
          <Input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="What to call it"
            className="mt-2 h-10"
          />
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
          Draw it, then press capture.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
