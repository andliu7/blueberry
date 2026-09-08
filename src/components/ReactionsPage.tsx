import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  CircleCheck,
  CircleDot,
  Droplets,
  FlaskConical,
  Info as InfoIcon,
  Layers,
  Minus,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Blueberry } from "@/components/ui/blueberry";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { LessonSidebar } from "@/components/ui/lesson-sidebar";
import { REACTIONS, type Stage, type StagedReaction } from "@/data/reactions";
import { cn } from "@/lib/utils";

/**
 * The validated reaction set, on the page.
 *
 * Same shell as the carbonyl lessons board on purpose: background, back link,
 * header card with the berry, sidebar and content. A student who has learned
 * where things are on one page should not have to learn it again here.
 *
 * The one thing this page does that no other does is show the stages apart.
 * That is not decoration. A reduction is stage 1 (hydride, basic) and stage 2
 * (aqueous acid), and the single flattened "conditions" line is what produced
 * "sodium borohydride, acidic conditions". If the UI collapses them back into
 * one row, the data model was pointless.
 */

/**
 * Acid, base and neutral each get a word, an icon and a colour.
 *
 * Never the colour alone. This is the single most load-bearing fact on the
 * page, and a red badge means nothing to the part of the class that cannot
 * separate red from green.
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

const TIER_NAME: Record<number, string> = {
  1: "Tier 1 / Carbonyl core",
  2: "Tier 2 / Reduction and oxidation",
  3: "Tier 3 / Enolates",
  4: "Tier 4 / Synthesis strategy",
};

/** "carbonyls/addition" reads better as "Carbonyls / addition". */
function prettyFamily(family: string) {
  const [group, kind] = family.split("/");
  const title = group.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return kind ? `${title} / ${kind.replace(/-/g, " ")}` : title;
}

export function ReactionsPage() {
  const [activeId, setActiveId] = useState(REACTIONS[0]?.id ?? "");
  const reaction = useMemo(
    () => REACTIONS.find((r) => r.id === activeId) ?? REACTIONS[0],
    [activeId],
  );

  // Grouped by tier so the sidebar shows the shape of the subject, and so the
  // order matches the build order in the procedure: tier 1 is the foundation
  // everything else leans on.
  const sidebarItems = useMemo(
    () =>
      [...REACTIONS]
        .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
        .map((r) => ({ id: r.id, label: r.name })),
    [],
  );

  if (!reaction) return null;

  return (
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="#/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Home
        </a>

        <header className="mt-5 grid gap-5 rounded-3xl border border-indigo-200/80 bg-white/75 p-6 shadow-sm dark:border-indigo-400/20 dark:bg-stone-950/70 lg:grid-cols-[1fr_270px]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">
              Reactions / CHEM241
            </p>
            <h1 className="title-face mt-3 text-5xl leading-none">Reactions</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-600 dark:text-stone-300">
              Every reaction here has been through RDKit for structure and conservation, and
              had its type checked against a classifier. Conditions are shown stage by stage,
              because a hydride reduction and its acid workup are two different things.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/70 p-4 dark:border-indigo-400/30 dark:bg-indigo-950/25">
            <Blueberry
              mood="reading"
              interactive
              onActivate={() => {
                window.location.hash = "#/home";
              }}
              className="h-40 w-40"
              label="Blueberry, reading along. Press to go home, drag to spin."
            />
            <p className="mt-2 text-center text-sm text-indigo-900/75 dark:text-indigo-100/75">
              {REACTIONS.length} validated. Start at tier 1 if the tetrahedral intermediate is
              still doing too much work.
            </p>
          </div>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[240px_1fr]">
          <LessonSidebar topics={sidebarItems} active={reaction.id} onSelect={setActiveId} />

          <div className="min-w-0">
            <ReactionDetail reaction={reaction} />
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

function ReactionDetail({ reaction }: { reaction: StagedReaction }) {
  const flagged = reaction.validation.status !== "ok";

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-[1fr_290px]">
        <article className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950/70 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-blue-700 dark:text-blue-300">
              {prettyFamily(reaction.family)}
            </p>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[.7rem] font-semibold text-slate-600 dark:bg-stone-800 dark:text-stone-300">
              {TIER_NAME[reaction.tier] ?? `Tier ${reaction.tier}`}
            </span>
          </div>

          <h2 className="title-face mt-3 text-4xl leading-tight">{reaction.name}</h2>

          {/* Substrate to product, before any of the detail. It is the question
              the page is answering and it should not need scrolling to find. */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-stone-800 dark:bg-stone-900/70">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Start
              </p>
              <p className="font-semibold">{reaction.reactant_labels.join(" + ")}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-slate-500 dark:text-stone-400">
                {reaction.reactants.join(" . ")}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-indigo-500" aria-label="gives" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                Product
              </p>
              <p className="font-semibold">{reaction.product_label}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-slate-500 dark:text-stone-400">
                {reaction.product}
              </p>
            </div>
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Info title="Reaction type" icon={<FlaskConical className="size-4" />}>
              {reaction.reaction_type}
              {reaction.validation.classifier_label && (
                <>
                  {" "}
                  <span className="text-slate-500 dark:text-stone-400">
                    (classifier agreed: {reaction.validation.classifier_label})
                  </span>
                </>
              )}
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
        </article>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
            <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-300" />
            <h3 className="mt-3 font-semibold">How this was checked</h3>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <Check label="Structures" value={reaction.validation.checks.parse ?? "not run"} />
              <Check
                label="Conservation"
                value={reaction.validation.checks.conservation ?? "not run"}
              />
              <Check
                label="Classification"
                value={reaction.validation.checks.classification ?? "not run"}
              />
            </dl>

            {/* Provenance stated plainly, never dressed up. Section 11: an
                ai-proposed reaction must never be relabelled ta-verified. */}
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-stone-800 dark:text-stone-400">
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

          {flagged && (
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/80 p-5 dark:border-amber-800 dark:bg-amber-950/40">
              <TriangleAlert className="size-5 text-amber-700 dark:text-amber-300" />
              <h3 className="mt-3 font-semibold text-amber-900 dark:text-amber-100">
                Flagged for review
              </h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm leading-6 text-amber-900/85 dark:text-amber-100/85">
                {reaction.validation.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950/70">
            <Layers className="size-5 text-indigo-600 dark:text-indigo-300" />
            <h3 className="mt-3 font-semibold">Practice</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-stone-300">
              The carbonyl decks drill these as flashcards.
            </p>
            <a
              href="#/deck/carbonyl-all"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-from to-brand-to px-4 text-sm font-semibold text-white"
            >
              <Layers className="size-4" />
              Open study deck <ArrowRight className="size-4" />
            </a>
          </div>
        </aside>
      </section>

      {reaction.intermediates.length > 0 && (
        <section className="mt-5">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[.16em] text-slate-500 dark:text-stone-400">
            Intermediates
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-stone-300">
            What the mechanism passes through on the way. These are what a drawn answer gets
            compared against.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {reaction.intermediates.map((smiles) => (
              <li
                key={smiles}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-stone-800 dark:bg-stone-950"
              >
                {smiles}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
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
          Byproducts:{" "}
          <span className="font-mono">{stage.byproducts.join(", ")}</span>
        </p>
      )}
    </li>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  const good = /^(ok|BALANCED|REDOX_OK|agrees)$/.test(value);
  const bad = value === "MISMATCH" || value.includes("FAIL");
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-600 dark:text-stone-300">{label}</dt>
      <dd
        className={cn(
          "flex items-center gap-1 text-right font-mono text-xs font-semibold",
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

export default ReactionsPage;
