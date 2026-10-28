/**
 * The study timer's row in Settings: what it is set to, and a way in.
 *
 * The timer itself is a header tool (tabs/focus/FocusTab.tsx) and its settings
 * (focus length, break length, the 20-20-20 eye rest) are changed there, where
 * the clock is, so there is one place to change them. This row is the second
 * door the owner asked for (28 Oct: "one of the tools in the toolbar and
 * settings"): it states the current setup and links to the timer's page.
 */
import { hrefForTab } from "../app/routes";
import { useFocus } from "../tabs/focus/FocusProvider";

export function FocusSetting() {
  const t = useFocus();
  const { focusMinutes, breakMinutes, eyeEveryMinutes } = t?.settings ?? { focusMinutes: 25, breakMinutes: 5, eyeEveryMinutes: 20 };
  const eye = eyeEveryMinutes < 9999 ? `eye rest every ${eyeEveryMinutes} min` : "eye rest off";
  return (
    <a href={hrefForTab("focus")} className="me-row" data-focus-setting>
      <span className="me-row-text">
        <span className="me-row-title">Focus timer</span>
        <span className="me-row-detail">
          {focusMinutes} min focus, {breakMinutes} min break, {eye}
        </span>
      </span>
      <span className="me-row-chevron" aria-hidden>
        {"›"}
      </span>
    </a>
  );
}

export default FocusSetting;
