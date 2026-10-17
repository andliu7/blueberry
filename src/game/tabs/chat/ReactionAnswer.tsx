/**
 * One reaction as Bloom's answer: a single colour-coded card with the
 * structures drawn, the reagents typeset with real subscripts, and one action.
 *
 * Everything on it is data: the row from the curriculum's reaction table, and,
 * when reactionExamples.ts pairs one, the RDKit drawings of a worked example
 * the Learn pages already ship. Nothing chemical is written here.
 */

import { topicDefinition, type Reaction } from "@blueberry/curriculum";
import { ReagentFormula } from "@/components/ui/reagent-line";
import { stagedReagentSteps } from "@/game/cards/reactionCard";
import { hrefForTab } from "../../app/routes";
import { exampleFor } from "./reactionExamples";
import { slotDisplay } from "./reagentDisplay";

/** A reagent name, typeset: digits after a letter drop to subscripts (NaBH4 reads NaBH₄), a trailing charge rises. */
function Token({ token }: { readonly token: string }) {
  return <ReagentFormula label={token} className="!font-display !font-extrabold !text-bb-foreground" />;
}

/**
 * One RDKit thumbnail. Always the LIGHT drawing on a white plate, in both
 * themes, the way a textbook page is printed: the dark drawings are light ink
 * meant for a dark ground and would vanish on the plate.
 */
function Thumb({ file, alt }: { readonly file: string | undefined; readonly alt: string }) {
  if (file === undefined) return null;
  return <img src={import.meta.env.BASE_URL + file} alt={alt} width={120} height={88} className="h-[88px] w-[120px] max-w-none shrink-0 object-contain" />;
}

function Scheme({ reactionId }: { readonly reactionId: string }) {
  const example = exampleFor(reactionId);
  if (example === undefined) return null;
  const steps = stagedReagentSteps(example);
  return (
    <figure className="flex flex-col gap-1">
      <div className="flex items-center justify-center gap-1 overflow-x-auto rounded-2xl bg-white px-1 py-1">
        <Thumb file={example.art.start_thumb_light ?? example.art.start_light} alt={`Structure of ${example.reactant_labels.join(" and ")}`} />
        {/* Capped width: on a wide card a flex-1 arrow stretched to ~290px and left the reagents tiny beside it. */}
        <span className="flex w-24 shrink-0 flex-col items-center gap-0.5 text-[#1d1b3a] md:w-32">
          {steps.map((step, index) => (
            <span key={step.label} className="text-center text-[0.8125rem] leading-tight font-bold md:text-sm">
              {steps.length > 1 ? `${index + 1}. ` : ""}
              <ReagentFormula label={step.label} className="!text-[#1d1b3a]" />
            </span>
          ))}
          <span aria-label="gives" role="img" className="flex w-full items-center">
            <span className="h-0.5 flex-1 bg-[#1d1b3a]" />
            <span className="size-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[#1d1b3a]" />
          </span>
        </span>
        <Thumb file={example.art.product_thumb_light ?? example.art.product_light} alt={`Structure of ${example.product_label}`} />
      </div>
      <figcaption className="text-center text-xs font-bold text-bb-muted-foreground">
        Example: {example.reactant_labels[0]} to {example.product_label}
      </figcaption>
    </figure>
  );
}

export function ReactionAnswer({
  reaction,
  others,
  onAsk,
}: {
  readonly reaction: Reaction;
  /** Next matches, each a one-tap follow-up that asks Bloom for that reaction by name. */
  readonly others: readonly Reaction[];
  readonly onAsk: (question: string) => void;
}) {
  const topic = topicDefinition(reaction.topic);
  return (
    <article className="social-pop overflow-hidden rounded-2xl border-2 border-bb-primary bg-bb-card">
      <header className="bg-bb-primary px-4 py-3 text-white">
        <p className="font-display text-xs font-black tracking-wide uppercase opacity-90">Reaction</p>
        <h3 className="font-display text-lg leading-tight font-extrabold">{reaction.name}</h3>
      </header>
      <div className="flex flex-col gap-3 p-3">
        <Scheme reactionId={reaction.id} />
        <p className="text-[0.95rem] leading-snug text-bb-foreground">{reaction.transformation}</p>
        <ul className="flex flex-col gap-1.5" aria-label="Reagents">
          {reaction.reagents.map((slot) => {
            // "or" only where the curriculum says the reagents are interchangeable (reagentDisplay.ts).
            const { tokens, joiner } = slotDisplay(slot);
            return (
              <li key={slot.role} className="flex flex-wrap items-baseline gap-x-1.5 text-[0.95rem] text-bb-foreground">
                <span className="mr-1 font-display text-xs font-black tracking-wide text-bb-muted-foreground uppercase">{slot.role}</span>
                {tokens.map((token, index) => (
                  <span key={token} className="font-bold">
                    {index > 0 ? <span className="mr-1.5 font-normal text-bb-muted-foreground">{joiner ?? "·"}</span> : null}
                    <Token token={token} />
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-bold text-bb-muted-foreground">Topic: {topic.label}</p>
        <a href={hrefForTab("courses", reaction.course, reaction.topic)} className="btn3d btn3d--primary w-full">
          Learn it
        </a>
        {others.length > 0 ? (
          <div className="flex flex-col gap-1 border-t-2 border-[color:var(--btn-line)] pt-2">
            <p className="font-display text-xs font-black tracking-wide text-bb-muted-foreground uppercase">Also matches</p>
            {others.map((other) => (
              <button
                key={other.id}
                type="button"
                onClick={() => onAsk(other.name)}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2 text-left text-[0.95rem] font-bold text-bb-foreground hover:bg-[color:var(--btn-ghost-hover)]"
              >
                {other.name}
                <span aria-hidden="true" className="text-lg text-bb-muted-foreground">›</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
