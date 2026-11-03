/**
 * The interactive energy diagram (energy-keq piece). Two tabs:
 *
 *   Build a step   two sliders, the product's energy and the barrier. The diagram, the Keq and the
 *                  verdict (runs both ways, or one way) move with them. No typing, no calculator.
 *   Walk a path    four scenarios. Step moves the ball one state at a time, with a sentence for each
 *                  move. The student drives it; nothing runs on a timer.
 *
 *   Real reactions  a drawn acid-base step (acetic acid plus hydroxide and so on). The student types
 *                  log10 Keq on their OWN calculator (none here), is marked, and the diagram, Keq and
 *                  verdict follow.
 *   Cold or warm    HBr plus 1,3-butadiene drawn in structures: a temperature switch moves the
 *                  ball to the kinetic or the thermodynamic product.
 *
 * All the arithmetic is energyModel.ts. Sliders are native range inputs so the keyboard works and
 * the focus ring is the browser's own, themed by the token ring below.
 */
import { useId, useState } from "react";
import { EnergyFigure } from "./EnergyFigure";
import { ReactionRow, type ReactionItem } from "./ReactionRow";
import { U2E_BUTADIENE, U2E_CASE_IDS, caseInfo, caseProfile } from "../content/u2energy";
import {
  SCENARIOS,
  checkExponent,
  checkSciKeq,
  classifyKeq,
  parseExponent,
  parseMantissa,
  parseWholeExponent,
  workedKeqSteps,
  rateRatio,
  reverseBarrier,
  forwardBarrier,
  singleStep,
  sciParts,
  stepKeq,
  walk,
  type Scenario,
} from "./energyModel";

const VERDICT: Record<ReturnType<typeof classifyKeq>, { readonly title: string; readonly body: string }> = {
  reversible: { title: "Runs both ways", body: "Keq sits between 10⁻⁷ and 10⁷, so some product turns back into reactant. You get a mixture." },
  "one-way-forward": { title: "One way, forward", body: "Keq is above 10⁷. The product is so far downhill that it does not come back." },
  "one-way-back": { title: "One way, back", body: "Keq is below 10⁻⁷. The reactant is so far downhill that this step barely starts." },
};

function Slider({ label, value, min, max, onChange, unit }: { readonly label: string; readonly value: number; readonly min: number; readonly max: number; readonly onChange: (n: number) => void; readonly unit: string }) {
  const id = useId();
  return (
    <div className="mt-2">
      <label htmlFor={id} className="flex justify-between text-scale-sm font-semibold">
        <span>{label}</span>
        <span className="tabular-nums">{value > 0 && min < 0 ? "+" : ""}{value} {unit}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--bb-primary)]" />
    </div>
  );
}

export function BuildStep() {
  const [product, setProduct] = useState(-4);
  const [barrier, setBarrier] = useState(12);
  const profile = singleStep(product, barrier);
  const keq = stepKeq(profile, 0);
  const cls = classifyKeq(keq);
  const { mantissa, exponent } = sciParts(keq);
  const verdict = VERDICT[cls];
  return (
    <div>
      <EnergyFigure profiles={[profile]} range={[-24, 30]} label={`Energy diagram: product at ${product} kcal per mole, barrier ${barrier}`} />
      <Slider label="Product energy" value={product} min={-20} max={20} onChange={setProduct} unit="kcal/mol" />
      <Slider label="Barrier (forward)" value={barrier} min={2} max={28} onChange={(n) => setBarrier(n)} unit="kcal/mol" />
      <div aria-live="polite" className="mt-3 rounded-xl border-2 border-bb-border bg-bb-card p-3">
        <p className="font-semibold">{verdict.title}</p>
        <p className="mt-1 text-scale-sm">
          Keq is about {mantissa} × 10<sup>{exponent}</sup>. {verdict.body}
        </p>
        <p className="mt-1 text-scale-sm text-bb-muted-foreground">
          Forward barrier {Math.round(forwardBarrier(profile, 0))}, reverse barrier {Math.round(reverseBarrier(profile, 0))} kcal/mol. {lowerHump(forwardBarrier(profile, 0), reverseBarrier(profile, 0))}
        </p>
      </div>
    </div>
  );
}

function lowerHump(forward: number, reverse: number): string {
  const gap = Math.abs(forward - reverse);
  if (gap < 0.5) return "The two humps are level, so each direction is crossed equally often.";
  const { mantissa, exponent } = sciParts(rateRatio(gap));
  const which = forward < reverse ? "forward" : "reverse";
  return `The ${which} hump is lower, so it is crossed about ${mantissa} × 10^${exponent} times as often.`;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function RealReactions() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState<"right" | "flipped" | "wrong" | null>(null);
  const [reveal, setReveal] = useState(false);
  const inputId = useId();
  const c = caseInfo(U2E_CASE_IDS[idx]!);
  const cls = classifyKeq(c.keq);
  const { mantissa, exponent } = sciParts(c.keq);
  const go = (n: number) => {
    setIdx(n);
    setText("");
    setShown(null);
    setReveal(false);
  };
  const check = () => {
    const result = checkExponent(parseExponent(text), c.gap);
    setShown(result);
    if (result === "right") setReveal(true);
  };
  const message =
    shown === "right"
      ? "Yes."
      : shown === "flipped"
        ? "The size is right and the sign is turned round. Take the pKa of the acid formed minus the acid used up."
        : shown === "wrong"
          ? "Not yet. Keq is ten to the power of (pKa formed minus pKa used up). Check both numbers and try again."
          : "";
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reaction">
        {U2E_CASE_IDS.map((id, i) => {
          const one = caseInfo(id);
          return (
            <button key={id} type="button" aria-pressed={i === idx} onClick={() => go(i)} className={`rounded-xl border-2 px-3 py-1.5 text-scale-sm font-semibold ${i === idx ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
              {cap(one.acid.name)} + {one.base.name}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <ReactionRow items={c.row} label={`${c.acid.name} plus ${c.base.name}`} />
      </div>
      <p className="mt-2 text-scale-sm">
        Acid used up: {c.acid.name}, pKa {c.usedPka}. Acid formed: {c.conjAcid.name}, pKa {c.formedPka}.
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={inputId} className="block text-scale-sm font-semibold">
            Keq is 10 to the power of
          </label>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setShown(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim() !== "") check();
            }}
            className="mt-1 w-28 rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 tabular-nums"
          />
        </div>
        <button type="button" disabled={text.trim() === ""} onClick={check} className="rounded-xl border-2 border-bb-primary bg-bb-primary px-4 py-1.5 font-semibold text-bb-primary-foreground disabled:opacity-40">
          Check
        </button>
        <button type="button" onClick={() => setReveal(true)} className="rounded-xl border-2 border-bb-border bg-bb-card px-4 py-1.5 font-semibold">
          Show me
        </button>
      </div>
      <p className="mt-1 text-scale-sm text-bb-muted-foreground">Use your own calculator. Decimals count.</p>
      <p aria-live="polite" className="mt-1 min-h-[1.5rem] text-scale-sm font-semibold">
        {message}
      </p>
      {reveal ? (
        <div className="mt-2">
          <EnergyFigure profiles={[caseProfile(c, false)]} range={[-24, 30]} label={`Energy diagram for ${c.acid.name} plus ${c.base.name}`} />
          <div aria-live="polite" className="mt-2 rounded-xl border-2 border-bb-border bg-bb-card p-3">
            <p className="font-semibold">{VERDICT[cls].title}</p>
            <p className="mt-1 text-scale-sm">
              Keq is 10<sup>{c.gap}</sup>, about {mantissa} × 10<sup>{exponent}</sup>. {VERDICT[cls].body}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ColdOrWarm() {
  const [warm, setWarm] = useState(false);
  const scenario = SCENARIOS.find((s) => s.id === (warm ? "control-warm" : "control"))!;
  const b = U2E_BUTADIENE;
  const row: readonly ReactionItem[] = [b.diene!, "+", b.hbr!, "→", b.kinetic, "or", b.thermo];
  return (
    <div>
      <ReactionRow items={row} label="HBr adds to 1,3-butadiene" />
      <div className="mt-2 flex gap-2" role="group" aria-label="Temperature">
        <button type="button" aria-pressed={!warm} onClick={() => setWarm(false)} className={`rounded-xl border-2 px-3 py-1.5 font-semibold ${!warm ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
          Cold, 0 °C
        </button>
        <button type="button" aria-pressed={warm} onClick={() => setWarm(true)} className={`rounded-xl border-2 px-3 py-1.5 font-semibold ${warm ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
          Warm, 40 °C
        </button>
      </div>
      <div className="mt-2">
        <EnergyFigure profiles={scenario.profiles} at={warm ? "T" : "K"} numbers={false} range={[-24, 22]} label={scenario.title} />
        <p className="text-scale-sm text-bb-muted-foreground">A sketch of the shape, not measured values.</p>
      </div>
      <div aria-live="polite" className="mt-2 rounded-xl border-2 border-bb-border bg-bb-card p-3 text-scale-sm">
        {warm
          ? "Warm, every step can reverse. The 1,2 product climbs back out and material settles into the deeper well: mostly the 1,4 product, the one with the more substituted double bond. Thermodynamic control."
          : "Cold, neither step can be undone. The lower hump is crossed more often, so the 1,2 product forms and stays. Kinetic control."}
      </div>
    </div>
  );
}

export function WalkPath() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id);
  const [at, setAt] = useState(0);
  const scenario: Scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const done = at >= scenario.route.length - 1;
  const result = walk(scenario.profiles, scenario.startId);
  const pick = (id: string) => {
    setScenarioId(id);
    setAt(0);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario">
        {SCENARIOS.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === scenarioId} onClick={() => pick(s.id)} className={`rounded-xl border-2 px-3 py-1.5 text-scale-sm font-semibold ${s.id === scenarioId ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
            {s.title}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <EnergyFigure profiles={scenario.profiles} at={scenario.route[at]} range={[-24, 22]} label={scenario.title} />
      </div>
      <div aria-live="polite" className="mt-2 min-h-[4.5rem] rounded-xl border-2 border-bb-border bg-bb-card p-3 text-scale-sm">
        {at === 0 ? <p>The reaction starts at {scenario.startId}. Press Step to move it.</p> : <p>{scenario.say[at - 1]}</p>}
        {done ? (
          <p className="mt-2 font-semibold">
            {scenario.takeaway}
            {result.deadEnds.length > 0 ? ` Dead end: ${result.deadEnds.join(", ")}.` : ""}
          </p>
        ) : null}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={done} onClick={() => setAt(at + 1)} className="rounded-xl border-2 border-bb-primary bg-bb-primary px-4 py-1.5 font-semibold text-bb-primary-foreground disabled:opacity-40">
          Step
        </button>
        <button type="button" disabled={at === 0} onClick={() => setAt(0)} className="rounded-xl border-2 border-bb-border bg-bb-card px-4 py-1.5 font-semibold disabled:opacity-40">
          Start again
        </button>
      </div>
    </div>
  );
}

/**
 * Work it out: one part at a time, each cleared before the next opens.
 *   1  pKa formed minus pKa used up (the exponent)
 *   2  Keq as a number times a power of ten (own calculator, none here)
 *   3  does the step run both ways, or one way
 * Then the worked solution line by line, and the diagram.
 */
export function WorkItOut() {
  const [idx, setIdx] = useState(0);
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const [gapText, setGapText] = useState("");
  const [mText, setMText] = useState("");
  const [eText, setEText] = useState("");
  const [note, setNote] = useState("");
  const ids = useId();
  const c = caseInfo(U2E_CASE_IDS[idx]!);
  const cls = classifyKeq(c.keq);
  const go = (n: number) => {
    setIdx(n);
    setPart(1);
    setGapText("");
    setMText("");
    setEText("");
    setNote("");
  };
  const advance = (msg: string) => {
    setPart((p) => (p === 1 ? 2 : p === 2 ? 3 : 4));
    setNote(msg);
  };
  const check1 = () => {
    const r = checkExponent(parseExponent(gapText), c.gap);
    if (r === "right") advance("Yes. That gap is the power of ten.");
    else setNote(r === "flipped" ? "Right size, sign turned round. Acid formed minus acid used up." : "Not yet. Subtract the pKa of the acid used up from the pKa of the acid formed.");
  };
  const check2 = () => {
    const r = checkSciKeq(parseMantissa(mText), parseWholeExponent(eText), c.gap);
    if (r === "right") advance("Yes. That is Keq.");
    else setNote(r === "flipped" ? "That is 1 over Keq. Check which way the subtraction went." : "Not yet. Use your own calculator on 10 to the gap, and write it as a number from 1 to 10 times a power of ten.");
  };
  const check3 = (choice: "reversible" | "one-way-forward" | "one-way-back") => {
    if (choice === cls) advance("Yes. Here is the working.");
    else setNote("Not yet. Both ways needs Keq between 10⁻⁷ and 10⁷.");
  };
  const box = "mt-1 rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 tabular-nums";
  const btn = "rounded-xl border-2 border-bb-primary bg-bb-primary px-4 py-1.5 font-semibold text-bb-primary-foreground disabled:opacity-40";
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reaction">
        {U2E_CASE_IDS.map((id, i) => {
          const one = caseInfo(id);
          return (
            <button key={id} type="button" aria-pressed={i === idx} onClick={() => go(i)} className={`rounded-xl border-2 px-3 py-1.5 text-scale-sm font-semibold ${i === idx ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
              {cap(one.acid.name)} + {one.base.name}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <ReactionRow items={c.row} label={`${c.acid.name} plus ${c.base.name}`} />
      </div>
      <p className="mt-2 text-scale-sm">
        Acid used up: {c.acid.name}, pKa {c.usedPka}. Acid formed: {c.conjAcid.name}, pKa {c.formedPka}.
      </p>
      {part === 1 ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor={ids + "g"} className="block text-scale-sm font-semibold">Part 1. pKa formed minus pKa used up</label>
            <input id={ids + "g"} inputMode="decimal" autoComplete="off" value={gapText} onChange={(e) => { setGapText(e.target.value); setNote(""); }} onKeyDown={(e) => { if (e.key === "Enter" && gapText.trim() !== "") check1(); }} className={`${box} w-28`} />
          </div>
          <button type="button" disabled={gapText.trim() === ""} onClick={check1} className={btn}>Check</button>
        </div>
      ) : null}
      {part === 2 ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <p className="w-full text-scale-sm font-semibold">Part 2. Keq = 10 to the {c.gap}. Write it as a number times a power of ten.</p>
          <div>
            <label htmlFor={ids + "m"} className="block text-scale-sm">Number</label>
            <input id={ids + "m"} inputMode="decimal" autoComplete="off" value={mText} onChange={(e) => { setMText(e.target.value); setNote(""); }} className={`${box} w-24`} />
          </div>
          <span className="pb-2 font-semibold">× 10</span>
          <div>
            <label htmlFor={ids + "e"} className="block text-scale-sm">Power</label>
            <input id={ids + "e"} inputMode="numeric" autoComplete="off" value={eText} onChange={(e) => { setEText(e.target.value); setNote(""); }} onKeyDown={(e) => { if (e.key === "Enter" && mText.trim() !== "" && eText.trim() !== "") check2(); }} className={`${box} w-20`} />
          </div>
          <button type="button" disabled={mText.trim() === "" || eText.trim() === ""} onClick={check2} className={btn}>Check</button>
        </div>
      ) : null}
      {part === 3 ? (
        <div className="mt-2">
          <p className="text-scale-sm font-semibold">Part 3. What does that Keq say about the step?</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {([["reversible", "Runs both ways"], ["one-way-forward", "One way, forward"], ["one-way-back", "Barely starts"]] as const).map(([k, name]) => (
              <button key={k} type="button" onClick={() => check3(k)} className="rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 font-semibold">{name}</button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-1 text-scale-sm text-bb-muted-foreground">Use your own calculator. None here.</p>
      <p aria-live="polite" className="mt-1 min-h-[1.5rem] text-scale-sm font-semibold">{note}</p>
      {part === 4 ? (
        <div className="mt-2">
          <ol className="list-decimal rounded-xl border-2 border-bb-border bg-bb-card p-3 pl-8 text-scale-sm">
            {workedKeqSteps(c.formedPka, c.usedPka).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <EnergyFigure profiles={[caseProfile(c, false)]} range={[-24, 30]} label={`Energy diagram for ${c.acid.name} plus ${c.base.name}`} />
        </div>
      ) : null}
    </div>
  );
}

const TABS = [
  ["work", "Work it out"],
  ["real", "Real reactions"],
  ["build", "Build a step"],
  ["walk", "Walk a path"],
  ["temp", "Cold or warm"],
] as const;

export default function EnergyLab() {
  const [tab, setTab] = useState<"build" | "walk" | "real" | "temp" | "work">("work");
  return (
    <section aria-label="Interactive energy diagram" className="rounded-xl border-2 border-bb-border bg-bb-background p-3">
      <h4 className="font-semibold">Try it yourself</h4>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Mode">
        {TABS.map(([id, name]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className={`rounded-xl border-2 px-3 py-1.5 font-semibold ${tab === id ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card"}`}>
            {name}
          </button>
        ))}
      </div>
      <div className="mt-3">{tab === "build" ? <BuildStep /> : tab === "walk" ? <WalkPath /> : tab === "real" ? <RealReactions /> : tab === "work" ? <WorkItOut /> : <ColdOrWarm />}</div>
    </section>
  );
}
