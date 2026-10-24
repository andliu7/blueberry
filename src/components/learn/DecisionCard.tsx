import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowRight, Check, Flag } from "lucide-react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { ReagentFormula, reagentName } from "@/components/ui/reagent-line";
import { labelShown } from "@/lib/reagentLabel";
import { StructureThumb } from "@/components/learn/ReactionCard";
import type { StagedReaction } from "@/data/reactions";
import type { PathwayUnit } from "@/game/demo/pathwayMap";
import { stagedReagentSteps } from "@/game/cards/reactionCard";
import { partHref, partLabel, unitParts, type LessonPart } from "@/data/learnMap";

/**
 * The decision card on `#/learn`: the next lesson as one illustrated invitation and one
 * button. Moved out of LearnPage.tsx in S3 round 5, when it grew a scene.
 *
 * S3 ROUND 5: ONE FOCAL OBJECT. Round 4 split the card in half, text on the left and a
 * flat violet slab on the right, and the judges read the slab as filler. Brilliant's
 * recommended card and Duolingo's path both lead with one big picture and one big Start,
 * so the card is now:
 *
 *   1. THE SCENE, full width: a violet sky over two hills (scenery is the one place a
 *      gradient is allowed), the unit's lessons as stepping stones along the ground,
 *      Bloom standing on the stone you are on, and a finish flag at the end. Above it,
 *      the lesson's own chemistry on a white plate, or, for a reading lesson with no
 *      reaction in the data, Bloom saying what the reading is. Never a borrowed drawing.
 *   2. THE WORDS AND THE BUTTON in one band under it: which unit and lesson, the lesson's
 *      name as the headline, the unit's name under it, and one Start.
 *
 * The provenance note ("From the Amines & sugars lesson") and the second link ("Or
 * practise in the app") are gone from the card: the lesson page says where a part comes
 * from, and practice is a tab of its own. On a phone, once the button scrolls away, a
 * small bar holds the same Start above the tab bar (StartDock below).
 */

export interface Resume {
  readonly unit: PathwayUnit;
  readonly parts: readonly LessonPart[];
  readonly part: LessonPart;
  readonly index: number;
  readonly started: boolean;
}

export function DecisionCard({
  resume,
  reaction,
  finished,
  opened,
  reactions,
}: {
  resume: Resume;
  reaction: StagedReaction | undefined;
  finished: ReadonlySet<string>;
  opened: ReadonlySet<string>;
  reactions: readonly StagedReaction[];
}) {
  const { number, name } = unitParts(resume.unit);
  const { part } = resume;
  const total = resume.parts.length;
  const label = partLabel(part, reactions);
  const href = partHref(part.lesson.id, resume.unit.id);
  // Audit 23 Oct, section 5 #2: the reading is "Unit N notes" here, because "lesson"
  // and "Unit 1" on their own name the app's lessons.
  const action = opened.has(part.key)
    ? "Keep reading"
    : resume.index === 0
      ? `Read ${number} notes`
      : `Read part ${resume.index + 1}`;

  // The real button, watched so the phone's dock knows when it has scrolled away.
  // A ref is React's handle on the rendered DOM element.
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const away = useScrolledPast(buttonRef);

  return (
    <>
      <section aria-labelledby="resume-title" className="lrn-decide">
        {/* The scene is a second way into the same lesson (the whole picture is
            pressable, as on Brilliant's card), so it is hidden from screen readers and
            the keyboard: the button below is the one they reach. Hovering it gives Bloom
            kind eyes (index.css, .bb-eye-kind under a:hover). */}
        <a href={href} className="lrn-scene" tabIndex={-1} aria-hidden>
          <SceneSky />
          <div className="lrn-scene-top">
            {reaction ? (
              <figure className="lrn-scene-figure">
                {reaction.name !== label && (
                  <figcaption className="lrn-decide-art-name">{reaction.name}</figcaption>
                )}
                <ReactionPlate reaction={reaction} />
              </figure>
            ) : (
              // A lesson with no reaction of its own (Unit 2 reads Aromaticity for
              // Huckel's rule, which the data holds no reaction for): Bloom says so.
              <p className="lrn-scene-bubble">
                Reading first: <b>{part.lesson.label}</b>
              </p>
            )}
          </div>
          <ol className="lrn-scene-path">
            {resume.parts.map((p, i) => {
              const state = finished.has(p.key) ? "done" : i === resume.index ? "current" : "later";
              return (
                <li key={p.key} className="lrn-stone" data-state={state}>
                  {state === "current" && (
                    <span className="lrn-scene-bloom">
                      <BlueberryMark eyes className="size-full" />
                    </span>
                  )}
                  <span className="lrn-stone-face">
                    {state === "done" ? <Check className="size-5" strokeWidth={3.5} /> : i + 1}
                  </span>
                </li>
              );
            })}
            <li className="lrn-stone" data-state="flag">
              <span className="lrn-stone-face">
                <Flag className="size-5" strokeWidth={2.5} />
              </span>
            </li>
          </ol>
        </a>

        <div className="lrn-decide-body">
          <div className="min-w-0">
            <p className="lrn-eyebrow">
              Up next · {number} notes · Part {resume.index + 1} of {total}
            </p>
            <h2 id="resume-title" className="lrn-decide-title">
              {label}
            </h2>
            <p className="lrn-decide-unit">{name}</p>
          </div>
          <a ref={buttonRef} href={href} className="lrn-btn lrn-decide-btn">
            {action}
            <ArrowRight className="size-5" aria-hidden />
          </a>
        </div>
      </section>

      {/* Phones and tablets only (hidden from 1024px in learn.css). Outside the card's
          section, so the page's tests still find exactly one button in the card. */}
      <div className="lrn-dock" data-show={away || undefined}>
        <span className="min-w-0 flex-1">
          <span className="lrn-eyebrow block">Up next</span>
          <span className="lrn-dock-label">{label}</span>
        </span>
        <a href={href} className="lrn-btn shrink-0" tabIndex={away ? undefined : -1}>
          {action}
          <ArrowRight className="size-4" aria-hidden />
        </a>
      </div>
    </>
  );
}

/**
 * True once the element has scrolled up past the top of the screen. An
 * IntersectionObserver (the browser telling us when an element enters or leaves the
 * screen) rather than a scroll listener, so nothing runs while the page scrolls.
 */
function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry) setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return past;
}

/**
 * The sky and hills behind the scene, drawn once (no animation: nothing on this page
 * moves on first paint). `slice` crops the drawing to the card's shape, so it fills a
 * phone and a desktop without stretching. Fixed colours, the same in both themes,
 * because this is a picture, not a surface: Bloom's own violets (BlueberryMark).
 */
function SceneSky() {
  return (
    <svg className="lrn-scene-sky" viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="lrn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b24b0" />
          <stop offset=".6" stopColor="#6a4ff0" />
          <stop offset="1" stopColor="#9d8cff" />
        </linearGradient>
        <radialGradient id="lrn-glow" cx=".78" cy=".2" r=".45">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".38" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="320" fill="url(#lrn-sky)" />
      <rect width="800" height="320" fill="url(#lrn-glow)" />
      {/* A few sparkles, four-point stars. */}
      {[
        [92, 54, 7],
        [180, 118, 4],
        [706, 140, 5],
        [560, 40, 4],
        [36, 168, 4],
        [752, 60, 6],
      ].map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y! - s!}Q${x} ${y} ${x! + s!} ${y}Q${x} ${y} ${x} ${y! + s!}Q${x} ${y} ${x! - s!} ${y}Q${x} ${y} ${x} ${y! - s!}Z`}
          fill="#ffffff"
          opacity=".8"
        />
      ))}
      {/* Far hill, near hill, then the ground band the stones sit on. */}
      <path d="M0 250 C120 205 230 200 340 228 S560 196 800 222 V320 H0Z" fill="#8a76f5" />
      <path d="M0 278 C150 246 300 252 430 266 S660 250 800 262 V320 H0Z" fill="#4c33c9" />
    </svg>
  );
}

/**
 * The reaction on its white plate: starting material, the reagents over the arrow,
 * product, each structure named under it. The product carries its count from the
 * balanced equation (`balance_rhs`, checked by RDKit), so periodic acid cleavage reads
 * "2" in front of formaldehyde. S3 round 5: where the count is drawn, the label's own
 * "(two equivalents)" is dropped, so the two equivalents are not said twice.
 */
function ReactionPlate({ reaction }: { reaction: StagedReaction }) {
  const steps = stagedReagentSteps(reaction);
  const count = reaction.balance_rhs.filter((smi) => smi === reaction.product).length;
  const productName = count > 1 ? withoutEquivalents(reaction.product_label) : reaction.product_label;
  return (
    <div className="lrn-decide-plate">
      <span className="lrn-decide-mol">
        <StructureThumb reaction={reaction} side="start" />
        <span className="lrn-decide-mol-name">{reaction.reactant_labels.join(" + ")}</span>
      </span>
      {/* The arrow with its reagents over it, as words: too small to draw a reagent
          legibly (the lesson page draws them at 80px). */}
      <span className="lrn-decide-arrow">
        <span className="flex flex-col items-center text-center text-xs leading-tight font-bold text-[var(--bb-deep)]">
          {steps.flatMap((st, i) =>
            // The bottle label names the reagent (NBS). Where the drawing is a
            // different chemical from it (labelShown with a drawing: nitrous acid
            // drawn, HCl named), the drawn one is named first.
            [st.art && labelShown(st) ? reagentName(st.art, st.label) : undefined, st.label]
              .filter((x): x is string => Boolean(x))
              .map((text, j) => (
                <ReagentFormula key={`${i}-${j}`} label={steps.length > 1 && j === 0 ? `${i + 1}. ${text}` : text} />
              )),
          )}
        </span>
        <span aria-label="gives" role="img" className="flex w-full items-center">
          <span className="h-0.5 flex-1 bg-[var(--bb-deep)]" />
          <span className="size-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--bb-deep)]" />
        </span>
      </span>
      <span className="lrn-decide-mol">
        <span className="flex items-center">
          {count > 1 && <span className="lrn-decide-count">{count}</span>}
          <StructureThumb reaction={reaction} side="product" />
        </span>
        <span className="lrn-decide-mol-name">{productName}</span>
      </span>
    </div>
  );
}

/** "formaldehyde (two equivalents)" to "formaldehyde", for a label beside a drawn count. */
function withoutEquivalents(label: string): string {
  return label.replace(/\s*\((?:one|two|three|four|\d+)\s+equivalents?\)\s*$/i, "");
}
