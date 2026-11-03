/**
 * A product-from-NMR question. The reaction is shown (the starting material drawn and the
 * reagents over the arrow), the student is given the PRODUCT's 1H NMR as a peak table, and
 * picks which drawn structure it is. IR is a minor aid behind a button.
 *
 * The structures, the product and the peaks all come from scripts/gen_spectra.py: the
 * product is run through RDKit from a reaction SMARTS, and the decoys are the other things
 * the same start would give under other conditions. The generator refuses to emit a
 * question whose options share a 1H fingerprint, so the spectrum always decides.
 *
 * No NMR tool is offered while this runs: in a challenge or test the reference tools are
 * hidden (app/ui/toolAccess.tsx), and the peak table here is the whole of the data. There is
 * no calculator. After the check, the right structure is drawn and each signal row rings the
 * atoms it comes from, so the student sees WHY the spectrum fits.
 *
 * It is a lesson/practice/challenge item (pool kind "nmrProduct"), played by PoolItemsStep
 * and PracticeRunner through this view.
 */

import { useRef, useState } from "react";
import "./spectra.css";
import { AnswerTray, TrayWhy } from "../../beats/AnswerTray";
import type { BeatResult, MasteryLevel } from "../../beats/types";
import { irAid, peakRows } from "./spectraModel";
import { StructureView } from "./StructureView";
import type { NmrProductQuestion as Question } from "./spectraTypes";

export interface NmrProductQuestionProps {
  readonly question: Question;
  readonly level?: MasteryLevel;
  readonly onResult?: (result: BeatResult) => void;
  readonly onContinue?: () => void;
  /** Legacy hook for callers that only want a boolean. */
  readonly onAnswer?: (correct: boolean) => void;
}

/** The sentence under the verdict, built from the derived peak list. */
export function nmrProductWhy(q: Question): string {
  const n = q.product.h1.length;
  const h = q.product.h1.reduce((s, p) => s + p.nH, 0);
  const odd = q.product.h1.find((p) => p.exch);
  return `The product is ${q.product.formula}: ${n} signal${n === 1 ? "" : "s"} adding to ${h}H${odd === undefined ? "" : `, the broad ${odd.shift.toFixed(1)} ppm one being an exchangeable O-H or N-H`}. Only the structure drawn in green gives that count and splitting.`;
}

export function NmrProductQuestion({ question, level = 1, onResult, onContinue, onAnswer }: NmrProductQuestionProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [showIr, setShowIr] = useState(false);
  const [hover, setHover] = useState<readonly number[]>([]);
  const started = useRef(Date.now());
  const rows = peakRows(question.product.h1);
  const right = question.options[question.answer];

  const check = () => {
    if (picked === null) return;
    setChecked(true);
    const ok = picked === question.answer;
    onAnswer?.(ok);
    const base = { beatId: question.id, level, elapsedMs: Date.now() - started.current, at: new Date().toISOString() } as const;
    const chosen = question.options[picked];
    onResult?.(
      ok
        ? { ...base, kind: "correct", cause: "matches_requested_route" }
        : { ...base, kind: "valid_not_requested", cause: "chose_authored_distractor", distractorId: chosen.smiles, built: chosen.formula },
    );
  };

  return (
    <div className="nq" data-question={question.id}>
      <div className="nq-scheme" aria-label="The reaction">
        <div className="nq-mol" dangerouslySetInnerHTML={{ __html: question.start.svg }} />
        <div className="nq-arrow">{question.reagent}</div>
        <span className="nq-q" aria-hidden>
          ?
        </span>
      </div>
      <p className="nq-q">This is the 1H NMR of the product. Which structure is it?</p>
      <table className="nq-peaks">
        <caption className="sp-sub">Product, 1H NMR ({question.product.formula})</caption>
        <thead>
          <tr>
            <th scope="col">δ (ppm)</th>
            <th scope="col">Integral</th>
            <th scope="col">Splitting</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.shift + r.integral + r.split}
              onMouseEnter={() => (checked ? setHover(question.product.h1[i].atoms) : undefined)}
              onMouseLeave={() => setHover([])}
              tabIndex={checked ? 0 : undefined}
              onFocus={() => (checked ? setHover(question.product.h1[i].atoms) : undefined)}
              onBlur={() => setHover([])}
            >
              <td>{r.shift}</td>
              <td>{r.integral}</td>
              <td>{r.split}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showIr ? (
        <p className="nq-aid">{irAid(question.product.ir)}</p>
      ) : (
        <button type="button" className="pt-btn pt-btn--small" onClick={() => setShowIr(true)}>
          IR hint
        </button>
      )}
      <div className="nq-options" role="group" aria-label="Choose the product">
        {question.options.map((o, i) => (
          <button
            key={o.smiles}
            type="button"
            className="nq-option"
            aria-pressed={picked === i}
            disabled={checked}
            data-state={checked ? (i === question.answer ? "right" : picked === i ? "wrong" : undefined) : undefined}
            onClick={() => setPicked(i)}
            aria-label={`Option ${i + 1}, formula ${o.formula}`}
          >
            <span dangerouslySetInnerHTML={{ __html: o.svg }} />
          </button>
        ))}
      </div>
      {checked ? null : (
        <button type="button" className="pt-btn" disabled={picked === null} onClick={check}>
          Check
        </button>
      )}
      {checked ? (
        <AnswerTray
          tone={picked === question.answer ? "right" : "wrong"}
          title={picked === question.answer ? "Nice!" : "Not this one"}
          actionLabel="Continue"
          onAction={onContinue}
          actionDisabled={onContinue === undefined}
        >
          <TrayWhy lead={nmrProductWhy(question)} />
          {right.coords === undefined ? null : (
            <div className="nq-link">
              <StructureView compound={right} atoms={hover} />
              <p className="nq-aid">Hover or tab to a row of the table: the ringed atoms give that signal.</p>
            </div>
          )}
        </AnswerTray>
      ) : null}
    </div>
  );
}
