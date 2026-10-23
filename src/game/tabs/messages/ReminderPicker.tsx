/**
 * The daily reminder, set right where it is promised. Four times of day as
 * pressable chips plus Off; a tap writes a settings event to the journal
 * (progress.setSettings), which is the same field the Study reminders thread
 * reads, so the thread updates the moment a chip is pressed.
 *
 * Honest about delivery: the reminder lands in the Study reminders thread.
 * Texts and push are not switched on yet (messageStore.ts, THE DELIVERY SEAM).
 */

import { progress } from "../../app/progress";
import { hourLabel } from "./messagesModel";

/** The offered times. Hours are 0 to 23, the journal's own range. */
const REMINDER_HOURS = [
  { hour: 8, label: "Morning" },
  { hour: 13, label: "Afternoon" },
  { hour: 19, label: "Evening" },
  { hour: 21, label: "Night" },
] as const;

export function ReminderPicker({ hour }: { readonly hour: number | null }) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Daily reminder time">
        {REMINDER_HOURS.map((option) => {
          const on = hour === option.hour;
          return (
            <li key={option.hour}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => progress.setSettings({ reminderHour: on ? null : option.hour })}
                className={`mb-[3px] flex min-h-12 w-full flex-col items-center justify-center rounded-xl border-2 px-2 py-1 font-display leading-tight transition-transform active:translate-y-[3px] active:shadow-none ${
                  on
                    ? "border-bb-primary bg-bb-primary text-white shadow-[0_3px_0_var(--bb-primary-lip)]"
                    : "border-[color:var(--btn-line)] bg-bb-card text-bb-foreground shadow-[0_3px_0_var(--btn-line)]"
                }`}
              >
                <span className="text-sm font-black">{hourLabel(option.hour)}</span>
                <span className={`text-xs font-bold ${on ? "text-white/90" : "text-bb-muted-foreground"}`}>{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-semibold text-bb-muted-foreground" role="status">
        {hour === null
          ? "Pick a time. Reminders land in Study reminders."
          : `Set for ${hourLabel(hour)}. Tap it again to turn it off.`}
      </p>
    </div>
  );
}
