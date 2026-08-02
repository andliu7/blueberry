import { useRef, useState } from "react";
import type { Question } from "@/data/questions";
import { PressDepth } from "@/components/ui/press-depth";
import { cn } from "@/lib/utils";
import { useMathJaxTypeset } from "@/lib/useMathJaxTypeset";

export type Status = "none" | "red" | "yellow" | "green";

const statusStyles: Record<Status, string> = {
  none: "bg-white border-gray-200",
  red: "bg-red-50 border-red-300",
  yellow: "bg-yellow-50 border-yellow-300",
  green: "bg-green-50 border-green-300",
};

export function QuestionCard({
  num,
  item,
  status,
  onRate,
  isActive = true,
  open: openProp,
  onOpenChange,
}: {
  num: number;
  item: Question;
  status: Status;
  onRate: (color: Status) => void;
  isActive?: boolean;
  /** Supply with onOpenChange to let a parent drive expand/collapse all. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const open = openProp ?? uncontrolledOpen;

  const toggle = () => {
    setUncontrolledOpen(!open);
    onOpenChange?.(!open);
  };

  const bodyRef = useRef<HTMLDivElement>(null);
  useMathJaxTypeset([open, selected], bodyRef);

  if (!isActive) return null;

  return (
    <div ref={bodyRef} className={cn("rounded-lg shadow-sm border transition-colors", statusStyles[status])}>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full text-left p-5 flex justify-between items-start hover:bg-black/[0.02] transition"
      >
        <div className="flex-1 pr-4">
          <span className="text-indigo-600 font-bold text-sm block mb-1 font-mono">
            Question {num}
            {item.mc ? " · Multiple Choice" : ""}
          </span>
          <h3 className="font-semibold text-gray-800 leading-tight">{item.q}</h3>
        </div>
        <svg
          className={cn("w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform", open && "rotate-180")}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-5 border-t border-gray-100 bg-indigo-50/50">
          {item.mc ? (
            <>
              <div className="space-y-2">
                {item.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded border text-sm transition",
                      selected === null && "border-slate-200 bg-slate-50 hover:bg-slate-100",
                      selected !== null && i === item.correct && "bg-green-100 border-green-400 text-green-800",
                      selected !== null && i === selected && i !== item.correct && "bg-red-100 border-red-300 text-red-800",
                      selected !== null && i !== selected && i !== item.correct && "border-slate-200 bg-slate-50 opacity-60",
                    )}
                  >
                    <span className="font-mono font-bold mr-2">{String.fromCharCode(97 + i)})</span>
                    {opt}
                  </button>
                ))}
              </div>
              {selected !== null && (
                <p
                  className="text-gray-800 leading-relaxed mt-4 pt-4 border-t border-indigo-100"
                  dangerouslySetInnerHTML={{ __html: item.a }}
                />
              )}
            </>
          ) : (
            <p className="text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.a }} />
          )}

          <div className="mt-4 pt-4 border-t border-indigo-100 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mr-auto">
              Rate your recall:
            </span>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-red-100 !text-red-700 !border-red-200"
              onClick={() => onRate("red")}
            >
              Review
            </PressDepth>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-yellow-100 !text-yellow-700 !border-yellow-200"
              onClick={() => onRate("yellow")}
            >
              Almost
            </PressDepth>
            <PressDepth
              depth={2}
              className="!h-7 !px-3 !text-xs !font-bold !bg-green-100 !text-green-700 !border-green-200"
              onClick={() => onRate("green")}
            >
              Got It
            </PressDepth>
          </div>
        </div>
      )}
    </div>
  );
}
