/**
 * The button and heading sheet, a development surface at #/app/gallery/buttons.
 *
 * One screen that shows every Press variant at every size, disabled and busy,
 * plus the heading scale, on the real game ground, in whichever theme is on.
 * It exists so a reviewer can judge the system in one place instead of
 * hunting for each state across the app. Lazy-loaded from App.tsx like the
 * other galleries, so it never reaches a student's payload.
 */

import { useEffect, useState } from "react";
import { Press, type PressSize, type PressVariant } from "./Press";
import { ChipPress } from "../../beats/ChipPress";
import { AnswerTray } from "../../beats/AnswerTray";
import { setTheme, useTheme } from "../hooks";

const VARIANTS: readonly PressVariant[] = ["primary", "success", "secondary", "danger", "ghost"];
const SIZES: readonly PressSize[] = ["sm", "md", "lg"];
const SIZE_NAME: Record<PressSize, string> = { sm: "Small", md: "Medium", lg: "Large" };
const LABEL: Record<PressVariant, string> = {
  primary: "Continue",
  success: "Keep going",
  secondary: "Review",
  danger: "Reset deck",
  ghost: "Skip",
};

export default function ButtonGallery() {
  const theme = useTheme();
  const [presses, setPresses] = useState(0);
  const [busy, setBusy] = useState(false);

  // The busy demo lets go of itself after a moment, the way a real save would.
  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => setBusy(false), 1200);
    return () => window.clearTimeout(id);
  }, [busy]);

  const count = () => setPresses((n) => n + 1);

  return (
    <div className="bb-ground min-h-dvh px-4 py-8 md:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="bb-eyebrow">Blueberry design system</p>
          <h1 className="bb-h-display text-bb-foreground">Buttons and headings</h1>
          <p className="text-bb-muted-foreground">
            Press and hold any key: the face drops onto its lip. Presses so far: <strong>{presses}</strong>
          </p>
          <div>
            <Press variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Day theme" : "Night theme"}
            </Press>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-5">
          <p className="bb-eyebrow">Heading scale</p>
          <p className="bb-h-display text-bb-foreground">Display, 32</p>
          <p className="bb-h1 text-bb-foreground">Screen title, 24</p>
          <p className="bb-h2 text-bb-foreground">Section title, 20</p>
          <p className="bb-h3 text-bb-foreground">Card title, 17</p>
          <p className="text-bb-muted-foreground">Body copy stays in the system face at 16.</p>
        </section>

        {/* THE ANSWER MOMENT, the screens these keys are used on most: CHECK
            as a flat grey slab with nothing picked, CHECK live in green, and
            the shared tray green and red (A2 round 4). Each tray sits in its
            own wrapper so its sticky footer has nowhere to travel here. */}
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-5">
          <h2 className="bb-h2 text-bb-foreground">The answer moment</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="bb-eyebrow">Nothing picked</span>
              <ChipPress disabled>Check</ChipPress>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="bb-eyebrow">Ready</span>
              <ChipPress onClick={count}>Check</ChipPress>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <AnswerTray tone="right" title="Nice!" combo={3} actionLabel="Continue" onAction={count}>
              <p>Three carbons on the charged carbon feed its empty p orbital.</p>
            </AnswerTray>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <AnswerTray tone="wrong" title="Not quite" actionLabel="Continue" onAction={count}>
              {/* The same words the u1-kvt lesson shows (HBr at -80 degrees). */}
              <p className="answer-tray__label">Correct answer:</p>
              <p className="answer-tray__answer answer-tray__answer--big">The 1,2 product</p>
              <p>Cold locks in whichever product forms fastest, and bromide is captured at the carbon closest to where the cation is born.</p>
            </AnswerTray>
          </div>
        </section>

        {VARIANTS.map((variant) => (
          <section key={variant} className="flex flex-col gap-3 rounded-2xl border-2 border-bb-border bg-bb-card p-5">
            <h2 className="bb-h2 text-bb-foreground">{variant[0].toUpperCase() + variant.slice(1)}</h2>
            {/* A fixed grid, one labelled cell per state, so every variant
                lines up as the same clean scale (2 across on a phone, 4 on a
                wider screen) instead of wrapping raggedly. */}
            <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-4">
              {SIZES.map((size) => (
                <div key={size} className="flex flex-col gap-1.5">
                  <span className="bb-eyebrow">{SIZE_NAME[size]}</span>
                  <Press variant={variant} size={size} block onClick={count}>
                    {LABEL[variant]}
                  </Press>
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <span className="bb-eyebrow">Disabled</span>
                <Press variant={variant} block disabled>
                  {LABEL[variant]}
                </Press>
              </div>
            </div>
            <Press variant={variant} block busy={busy} onClick={() => setBusy(true)}>
              {busy ? "Saving" : "Full width, tap for busy"}
            </Press>
          </section>
        ))}
      </div>
    </div>
  );
}
