"use client";

import { useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";
import {
  BookmarkPlus,
  ChevronLeft,
  CircleCheck,
  Eye,
  FlaskConical,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { MoleculeCanvas } from "@/components/ui/molecule-canvas";
import { MoleculeArt } from "@/components/ui/lesson-nav";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { REACTIONS, type StagedReaction } from "@/data/reactions";
import { sameStructure } from "@/lib/checkAnswer";
import { saveCard } from "@/lib/savedCards";
import { cn } from "@/lib/utils";

/**
 * Draw the product, then have it marked.
 *
 * On its own route, reached from a reaction, and lazily. Ketcher is about 19MB
 * of WASM: putting it behind a page a student chooses to open keeps it out of
 * the download for everyone who came to read a deck.
 *
 * The marking is Ketcher's own Indigo, not a string comparison. `sameStructure`
 * pushes both the drawing and the expected answer through the same
 * canonicaliser, which is the only comparison that means anything here.
 */

type Verdict =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "right"; smiles: string }
  | { kind: "wrong"; mine: string; theirs: string }
  | { kind: "error"; message: string };

export default function ReactionDrawPage({ reactionId }: { reactionId: string }) {
  const reaction = REACTIONS.find((r) => r.id === reactionId);
  const ketcherRef = useRef<Ketcher | null>(null);
  const [verdict, setVerdict] = useState<Verdict>({ kind: "idle" });
  const [peeked, setPeeked] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!reaction) {
    return (
      <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
        <PageBackground />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600 dark:border-stone-700 dark:text-stone-300">
            No reaction called <span className="font-mono">{reactionId}</span>.{" "}
            <a href="#/lessons" className="font-semibold underline">
              Back to lessons
            </a>
          </p>
        </div>
      </main>
    );
  }

  const check = async () => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    setVerdict({ kind: "checking" });
    const result = await sameStructure(ketcher, reaction.product);
    if ("error" in result) {
      setVerdict({ kind: "error", message: result.error });
      return;
    }
    setVerdict(
      result.ok
        ? { kind: "right", smiles: result.mine }
        : { kind: "wrong", mine: result.mine, theirs: result.theirs },
    );
  };

  const save = async () => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    // Molfile as well as SMILES: SMILES loses the coordinates, and a card that
    // reopens with the structure re-laid-out is not the card they drew.
    let molfile: string | undefined;
    let smiles: string | undefined;
    try {
      molfile = await ketcher.getMolfile();
      smiles = await ketcher.getSmiles();
    } catch {
      /* save the card without the drawing rather than not at all */
    }
    saveCard({
      reactionId: reaction.id,
      front: `${reaction.reactant_labels.join(" + ")} — ${describeReagents(reaction)}`,
      back: reaction.product_label,
      molfile,
      smiles,
      correct: verdict.kind === "right",
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

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
            Draw the product
          </p>
          <h1 className="title-face mt-2 text-4xl leading-none">{reaction.name}</h1>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[330px_1fr]">
          {/* The question. Starting material and conditions, product withheld. */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
              <h2 className="text-sm font-semibold">Starting material</h2>
              <MoleculeArt
                light={reaction.art.start_light}
                dark={reaction.art.start_dark}
                alt={`Structure of ${reaction.reactant_labels.join(" and ")}`}
                className="mx-auto mt-2 h-auto w-full max-w-[300px]"
              />
              <p className="mt-1 text-center text-sm font-semibold">
                {reaction.reactant_labels.join(" + ")}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
              <h2 className="text-sm font-semibold">Conditions</h2>
              <ol className="mt-3 flex flex-col gap-2">
                {reaction.stages.map((stage) => (
                  <li
                    key={stage.order}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-stone-800 dark:bg-stone-900/70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[.65rem] font-bold text-white dark:bg-stone-100 dark:text-stone-900">
                        {stage.order}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                        {stage.role} &middot; {stage.conditions.acid_base}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-sm text-indigo-700 dark:text-indigo-300">
                      {stage.reagents.join("  |  ")}
                    </p>
                    {stage.conditions.temperature_c !== null && (
                      <p className="mt-1 font-mono text-xs text-slate-500 dark:text-stone-400">
                        {stage.conditions.temperature_c} &deg;C
                        {stage.conditions.solvent && `, ${stage.conditions.solvent}`}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* Peeking is allowed and recorded honestly: a saved card notes
                whether the answer was reached or looked up. Hiding the option
                would only mean opening the lessons page in another tab. */}
            <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
              <h2 className="text-sm font-semibold">Stuck?</h2>
              {peeked ? (
                <>
                  <MoleculeArt
                    light={reaction.art.product_light}
                    dark={reaction.art.product_dark}
                    alt={`Structure of ${reaction.product_label}`}
                    className="mx-auto mt-2 h-auto w-full max-w-[300px]"
                  />
                  <p className="mt-1 text-center text-sm font-semibold">
                    {reaction.product_label}
                  </p>
                </>
              ) : (
                <Button variant="outline" className="mt-3 w-full" onClick={() => setPeeked(true)}>
                  <Eye className="size-4" />
                  Show the answer
                </Button>
              )}
            </section>
          </aside>

          <div className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950">
              {/* Height reserved so the page does not jump when the editor
                  finishes loading its engine. */}
              <MoleculeCanvas
                className="h-[520px] w-full"
                onReady={(k) => {
                  ketcherRef.current = k;
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => void check()} disabled={verdict.kind === "checking"}>
                {verdict.kind === "checking" ? (
                  <Loader variant="dots" size="sm" text="Checking" />
                ) : (
                  <>
                    <CircleCheck className="size-4" />
                    Check my answer
                  </>
                )}
              </Button>
              {/* Draw the product by modifying the starting material, which is
                  how it is done on paper. Offered rather than pre-loaded: the
                  exercise is to produce the product, and handing someone the
                  substrate already on the canvas decides for them whether they
                  are recalling a structure or transforming one. */}
              <Button
                variant="outline"
                onClick={() => {
                  void ketcherRef.current?.setMolecule(reaction.reactants.join("."));
                  setVerdict({ kind: "idle" });
                }}
              >
                <FlaskConical className="size-4" />
                Load starting material
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void ketcherRef.current?.setMolecule("");
                  setVerdict({ kind: "idle" });
                }}
              >
                <RotateCcw className="size-4" />
                Clear
              </Button>
              <Button variant="outline" onClick={() => void save()}>
                <BookmarkPlus className="size-4" />
                {saved ? "Saved" : "Save as card"}
              </Button>
            </div>

            <VerdictNote verdict={verdict} productLabel={reaction.product_label} />
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function VerdictNote({ verdict, productLabel }: { verdict: Verdict; productLabel: string }) {
  if (verdict.kind === "idle" || verdict.kind === "checking") return null;

  const tone =
    verdict.kind === "right"
      ? "border-emerald-300 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      : verdict.kind === "wrong"
        ? "border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        : "border-destructive/40 bg-destructive/5 text-destructive";

  return (
    <div className={cn("mt-4 rounded-2xl border-2 p-4", tone)} role="status" aria-live="polite">
      {verdict.kind === "right" && (
        <p className="flex items-center gap-2 font-semibold">
          <CircleCheck className="size-5 shrink-0" />
          That is {productLabel}. Correct.
        </p>
      )}

      {verdict.kind === "wrong" && (
        <>
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-5 shrink-0" />
            Not this one yet.
          </p>
          {/* Both strings shown. Being told "wrong" without being able to see
              what the checker read is the most frustrating way to fail, and the
              difference is usually one atom the student can spot instantly. */}
          <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
            <div>
              <dt className="font-sans font-semibold">You drew</dt>
              <dd className="mt-0.5 break-all">{verdict.mine || "(nothing)"}</dd>
            </div>
            <div>
              <dt className="font-sans font-semibold">Expected</dt>
              <dd className="mt-0.5 break-all">{verdict.theirs}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm">
            Both are canonical, so they differ as structures and not just as text.
          </p>
        </>
      )}

      {verdict.kind === "error" && (
        <p className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <span>The editor could not read that drawing. {verdict.message}</span>
        </p>
      )}
    </div>
  );
}

/** "NaBH4, then H3O+" from the staged reagents, for a card front. */
function describeReagents(reaction: StagedReaction): string {
  return reaction.stages
    .map((s) => s.reagents[s.reagents.length - 1] ?? s.reagents[0] ?? "")
    .filter(Boolean)
    .join("; then ");
}
