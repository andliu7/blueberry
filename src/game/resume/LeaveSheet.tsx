/**
 * "Your progress is saved." The sheet the lesson's X opens when there is
 * something saved to keep.
 *
 * WHY IT EXISTS. Save-as-you-go worked from round 1, but the moment a student
 * left looked the same as before the fix: X went straight to the path, with
 * nothing to say the four answers they had given were kept. The owner's
 * complaint was that progress "doesn't seem to save", so the leaving moment
 * is where the student is told: what is kept, and what happens next time.
 *
 * WHEN IT SHOWS. Only when the lesson's bookmark holds at least one answer
 * (savedCount in lessonSave.ts). Nothing answered yet, the lesson's own
 * ending (which clears the bookmark first), or a Challenge (which never
 * saves): X leaves at once, because there is nothing to report.
 *
 * The resume screen's X never opens it (leaveNow.ts): that screen already
 * says the work is saved, and a second sheet on top of it was the stack the
 * effects rule forbids. It also says what is NOT banked yet: XP, diamonds and
 * streak are paid when the lesson is finished (leaveRewardLine).
 *
 * KEEP GOING is the primary key, Escape and the backdrop do the same, and the
 * dialog stays mounted so the browser hands focus back to the X on close.
 * Calm on purpose: the panel slides in like every sheet, nothing celebrates.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { pathwayNode } from "../demo/pathwayMap";
import { Berry } from "../mascot/Berry";
import { closeOnBackdrop } from "../app/ui/dismiss";
import { Press } from "../app/ui/Press";
import { browserStorage, savedCount } from "./lessonSave";
import { SavedMark } from "./ResumePrompt";
import { LeaveNow } from "./leaveNow";
import { leaveRewardLine } from "./restartCopy";
import { progress } from "../app/progress";
import "../charge/charge.css";
import "./resume.css";
import { plural } from "@/lib/helpers";

export interface LessonLeaveProps {
  readonly node: string;
  /** False for a Challenge: it never saves, so a Practice bookmark on the same node must not be reported. */
  readonly saves: boolean;
  readonly reducedMotion: boolean;
  /** Actually leave (back to the path). */
  readonly onLeave: () => void;
  /** Render prop: the lesson, handed the exit that asks first when there is a save. */
  readonly children: (exit: () => void) => ReactNode;
}

export function LessonLeave({ node, saves, reducedMotion, onLeave, children }: LessonLeaveProps) {
  const ref = useRef<HTMLDialogElement>(null);
  /** The saved count the open sheet reports, or null while it is closed. */
  const [saved, setSaved] = useState<number | null>(null);

  // showModal cannot be declared in JSX, so an effect reconciles the state onto the element.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (saved !== null && !dialog.open) dialog.showModal();
    if (saved === null && dialog.open) dialog.close();
  }, [saved]);

  const exit = () => {
    const count = saves ? savedCount(browserStorage(), node) : null;
    if (count === null) onLeave();
    else setSaved(count);
  };
  const stay = () => setSaved(null);
  const title = pathwayNode(node)?.title ?? "";

  return (
    <>
      <LeaveNow.Provider value={onLeave}>{children(exit)}</LeaveNow.Provider>
      <dialog
        ref={ref}
        className="charge-sheet leave-sheet"
        data-motion={reducedMotion ? "reduced" : "full"}
        aria-labelledby="leave-sheet-title"
        onClose={stay}
        onClick={closeOnBackdrop(ref, stay)}
      >
        {saved === null ? null : (
          <div className="charge-panel">
            <span className="charge-grabber" aria-hidden />
            <Berry mood="happy" behaviour="idle" sizePx={72} reducedMotion={reducedMotion} />
            {title !== "" ? <p className="charge-title">{title}</p> : null}
            <h2 id="leave-sheet-title" className="charge-headline">
              Your progress is saved
            </h2>
            <p className="resume-prompt__saved" data-leave="saved">
              <SavedMark />
              <span>
                {plural(saved, "question", "questions")} done and saved
              </span>
            </p>
            <p className="charge-line">Open this lesson again and you pick up right where you stopped.</p>
            <p className="charge-line" data-leave="rewards">
              {leaveRewardLine(progress.getSnapshot().economy.firstClears[node] === true)}
            </p>
            <Press block size="lg" onClick={stay} data-leave="stay">
              Keep going
            </Press>
            <Press block variant="ghost" onClick={onLeave} data-leave="leave">
              Leave for now
            </Press>
          </div>
        )}
      </dialog>
    </>
  );
}
