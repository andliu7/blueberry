/**
 * A typed pKa-to-Keq question (pool kind "keqTyped"). The professor-emphasised skill is computing
 * Keq = 10^(pKa formed − pKa used) by hand, so there are no option tiles to pick from and no
 * calculator in the app: the student uses their own, as they will in the exam.
 *
 * One part at a time, each cleared alone before the next opens:
 *   Part 1  the exponent, pKa formed minus pKa used up
 *   Part 2  Keq as a number times a power of ten
 * Then the worked line-by-line solution, the verdict (runs both ways or one way) and the diagram.
 *
 * Marking is energyModel.ts (checkExponent, checkSciKeq). The first miss is the judged result; a
 * student can keep trying, and Continue opens only when both parts are right.
 */
import { useId, useRef, useState } from "react";
import { AnswerTray, TrayWhy } from "../beats/AnswerTray";
import type { BeatResult, MasteryLevel } from "../beats/types";
import { EnergyFigure } from "./EnergyFigure";
import { ReactionRow } from "./ReactionRow";
import { checkExponent, checkSciKeq, classifyKeq, parseExponent, parseMantissa, parseWholeExponent, workedKeqSteps } from "./energyModel";
import type { KeqTypedSpec } from "./keqTypedSpec";

export interface KeqTypedQuestionProps {
  readonly question: KeqTypedSpec;
  readonly level?: MasteryLevel;
  readonly onResult?: (result: BeatResult) => void;
  readonly onContinue?: () => void;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const box = "mt-1 rounded-xl border-2 border-bb-border bg-bb-card px-3 py-1.5 tabular-nums";
const btn = "rounded-xl border-2 border-bb-primary bg-bb-primary px-4 py-1.5 font-semibold text-bb-primary-foreground disabled:opacity-40";

const VERDICT = {
  reversible: "Keq is between 10⁻⁷ and 10⁷, so the step runs both ways and you get a mixture.",
  "one-way-forward": "Keq is above 10⁷, so the step is one way, forward. The product does not come back.",
  "one-way-back": "Keq is below 10⁻⁷, so this step barely starts.",
} as const;

export function KeqTypedQuestion({ question: q, level = 2, onResult, onContinue }: KeqTypedQuestionProps) {
  const [part, setPart] = useState<1 | 2 | 3>(1);
  const [gapText, setGapText] = useState("");
  const [mText, setMText] = useState("");
  const [eText, setEText] = useState("");
  const [note, setNote] = useState("");
  const missed = useRef(false);
  const sent = useRef(false);
  const started = useRef(Date.now());
  const ids = useId();

  const send = (ok: boolean) => {
    if (sent.current) return;
    sent.current = true;
    const base = { beatId: q.id, level, elapsedMs: Date.now() - started.current, at: new Date().toISOString() } as const;
    onResult?.(ok ? { ...base, kind: "correct", cause: "matches_requested_route" } : { ...base, kind: "valid_not_requested", cause: "no_named_cause_logged", built: "a different Keq" });
  };
  const miss = (msg: string) => {
    missed.current = true;
    setNote(msg);
    send(false);
  };
  const check1 = () => {
    const r = checkExponent(parseExponent(gapText), q.gap);
    if (r === "right") {
      setPart(2);
      setNote("Yes. That gap is the power of ten.");
    } else miss(r === "flipped" ? "Right size, sign turned round. Take the pKa of the acid formed minus the acid used up." : "Not yet. Subtract the pKa of the acid used up from the pKa of the acid formed.");
  };
  const check2 = () => {
    const r = checkSciKeq(parseMantissa(mText), parseWholeExponent(eText), q.gap);
    if (r === "right") {
      setPart(3);
      setNote("");
      if (!missed.current) send(true);
    } else miss(r === "flipped" ? "That is 1 over Keq. Check which way the subtraction went." : "Not yet. Use your own calculator on 10 to the gap, and write it as a number from 1 to 10 times a power of ten.");
  };

  const cls = classifyKeq(10 ** q.gap);
  return (
    <div data-question={q.id}>
      <p className="font-semibold">Work out Keq for this step.</p>
      <div className="mt-2">
        <ReactionRow items={q.row} label={`${q.acidName} plus ${q.baseName}`} />
      </div>
      <p className="mt-2 text-scale-sm">
        Acid used up: {q.acidName}, pKa {q.usedPka}. Acid formed: {q.conjAcidName}, pKa {q.formedPka}.
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
          <p className="w-full text-scale-sm font-semibold">Part 2. Keq = 10 to the {q.gap}. Write it as a number times a power of ten.</p>
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
      {part < 3 ? <p className="mt-1 text-scale-sm text-bb-muted-foreground">Use your own calculator. None here.</p> : null}
      <p aria-live="polite" className="mt-1 min-h-[1.5rem] text-scale-sm font-semibold">{note}</p>
      {part === 3 ? (
        <AnswerTray tone={missed.current ? "wrong" : "right"} title={missed.current ? "Got there" : "Nice!"} actionLabel="Continue" onAction={onContinue} actionDisabled={onContinue === undefined}>
          <TrayWhy lead={`${cap(q.acidName)} to ${q.conjAcidName}. ${VERDICT[cls]}`} />
          <ol className="mt-2 list-decimal pl-5 text-scale-sm">
            {workedKeqSteps(q.formedPka, q.usedPka).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <EnergyFigure profiles={[q.profile]} range={[-24, 30]} label={`Energy diagram for ${q.acidName} plus ${q.baseName}`} />
        </AnswerTray>
      ) : null}
    </div>
  );
}
