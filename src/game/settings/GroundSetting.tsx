/**
 * The page colour control: Lavender (the current look), Deep blue, or a colour of
 * the student's own from a picker. The rule behind it lives in groundTheme.ts;
 * this only renders it.
 *
 * The picker is the owner's pasted Apple-style dialog (ui/apple-color-picker),
 * loaded with React.lazy so it costs nothing until "Pick" is pressed. Only its
 * HUE is used (see groundTheme.ts), so no pick can make text unreadable.
 *
 * REACT PATTERN, named: `useSyncExternalStore` subscribes to the module scope
 * store, the same as ArrowStyleSetting.
 */

import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import { DEEP_BLUE_HUE, groundFor, groundSetting, hueOf, type GroundPreset } from "./groundTheme";

const AppleColorPicker = lazy(() => import("@/components/ui/apple-color-picker"));

const OPTIONS: readonly { readonly id: GroundPreset; readonly label: string }[] = [
  { id: "lavender", label: "Lavender" },
  { id: "deepblue", label: "Deep blue" },
  { id: "custom", label: "Pick" },
];

/** A 40 by 24 chip showing the gradient the option would paint. */
function Chip({ id, custom }: { readonly id: GroundPreset; readonly custom: string }) {
  const light =
    id === "lavender"
      ? { top: "#ece4ff", bottom: "#d8e6ff" }
      : groundFor(id === "deepblue" ? DEEP_BLUE_HUE : hueOf(custom)).light;
  return (
    <span
      aria-hidden
      className="shrink-0"
      style={{
        width: 40,
        height: 24,
        borderRadius: 8,
        border: "1.5px solid currentColor",
        background: `linear-gradient(180deg, ${light.top}, ${light.bottom})`,
      }}
    />
  );
}

export function GroundSetting() {
  const choice = useSyncExternalStore(groundSetting.subscribe, groundSetting.getSnapshot, groundSetting.getSnapshot);
  const [open, setOpen] = useState(false);
  const detail =
    choice.preset === "lavender"
      ? "The soft lavender and blue you have now"
      : choice.preset === "deepblue"
        ? "A cooler blue behind every screen"
        : "Your own colour, kept pale so text stays readable";

  return (
    <div data-ground-setting>
      <div className="me-row me-row-static">
        <span className="me-row-text">
          <span className="me-row-title">Page colour</span>
          <span className="me-row-detail">{detail}</span>
        </span>
      </div>
      <div className="me-seg-wrap">
        <div className="me-seg me-seg--stack" role="group" aria-label="Page colour">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={choice.preset === option.id}
              data-ground={option.id}
              onClick={() => {
                if (option.id === "custom") setOpen(true);
                groundSetting.set({ preset: option.id, custom: choice.custom });
              }}
            >
              <Chip id={option.id} custom={choice.custom} />
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <Suspense fallback={null}>
          <AppleColorPicker
            isOpen
            title="Page colour"
            initialColor={choice.custom}
            onClose={() => setOpen(false)}
            onChange={(hex) => groundSetting.set({ preset: "custom", custom: hex })}
          />
        </Suspense>
      )}
    </div>
  );
}

export default GroundSetting;
