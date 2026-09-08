import type { ReactNode } from "react";
import { LIGHTS } from "@/components/ui/window-lights";
import { cn } from "@/lib/utils";

/**
 * A framed panel in the voice of Solo Leveling's system windows.
 *
 * Drawn against the actual stills rather than a description of them, and what
 * the stills give you is four things and no more:
 *
 * 1. **Square corners with the rule doubled.** One hairline on the edge and a
 *    second a few pixels inside it. Nothing in that interface is rounded, and
 *    rounding it is the single change that turns it back into an ordinary card.
 * 2. **The glow is on the line, not on the fill.** The panel body is a near
 *    black navy at about 80 percent; the light lives in the border, the corner
 *    ticks and the text, so the panel reads as projected rather than painted.
 * 3. **Corner ticks.** Short brackets sitting proud of each corner. They are
 *    what says "this was drawn by a machine" more than any amount of glow.
 * 4. **A labelled header band**, centred, uppercase, tracked wide, with a rule
 *    under it.
 *
 * **The three lights are this site's own**, imported from `window-chrome`
 * rather than re-declared, because they are the same object: the app lives
 * inside a window and this is that window announcing itself before the app is
 * open. They render small and dimmed here, which is the difference between a
 * signature and a title bar.
 *
 * Light theme is not a tint of the dark one, it is the same geometry with the
 * ink and the ground swapped, because the gate carries the theme switch and a
 * switch that visibly does nothing is worse than no switch.
 */

export interface SystemWindowProps {
  /** The band across the top. Uppercased by the style, so pass it in prose. */
  label: string;
  /** Sits at the right of the header band. The theme toggle, on the gate. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

const CORNERS = [
  "top-0 left-0 border-t-2 border-l-2",
  "top-0 right-0 border-t-2 border-r-2",
  "bottom-0 left-0 border-b-2 border-l-2",
  "bottom-0 right-0 border-b-2 border-r-2",
];

export function SystemWindow({ label, aside, children, className }: SystemWindowProps) {
  return (
    <>
      <style>{`
        .sysw{
          --sysw-fill:rgba(255,255,255,0.86);
          --sysw-line:rgba(28,74,128,0.42);
          --sysw-line-soft:rgba(28,74,128,0.20);
          --sysw-edge:#1d6fd0;
          --sysw-glow:rgba(29,111,208,0.18);
          --sysw-ink:#0d2038;
          --sysw-dim:rgba(13,32,56,0.62);
        }
        .dark .sysw{
          --sysw-fill:rgba(6,14,27,0.78);
          --sysw-line:rgba(150,225,255,0.52);
          --sysw-line-soft:rgba(150,225,255,0.22);
          --sysw-edge:#8fdcff;
          --sysw-glow:rgba(90,190,255,0.30);
          --sysw-ink:#e9f7ff;
          --sysw-dim:rgba(206,236,255,0.66);
        }
        /* The second rule, inset. A single border reads as a card; two read as
           a projection, and it costs one pseudo element. */
        .sysw::before{
          content:"";position:absolute;inset:5px;pointer-events:none;
          border:1px solid var(--sysw-line-soft);
        }
        /* Scan lines, at the threshold of visible, and only in the dark. Any
           stronger and body copy starts to strobe against them on a phone; on
           the light ground they are grey banding on white rather than a
           projection, so there they are simply off. */
        .sysw::after{
          content:"";position:absolute;inset:0;pointer-events:none;opacity:0;
          background:repeating-linear-gradient(
            to bottom,
            rgba(140,215,255,0.055) 0 1px,
            transparent 1px 3px
          );
        }
        .dark .sysw::after{ opacity:0.5; }
        .sysw-edge{ text-shadow:0 0 12px var(--sysw-glow); }
      `}</style>

      <div
        className={cn(
          "sysw relative isolate backdrop-blur-sm",
          "border border-[color:var(--sysw-line)] bg-[color:var(--sysw-fill)]",
          "text-[color:var(--sysw-ink)]",
          "shadow-[0_0_60px_-12px_var(--sysw-glow),0_24px_60px_-30px_rgba(0,0,0,0.7)]",
          className,
        )}
      >
        {CORNERS.map((corner) => (
          <span
            key={corner}
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-10 size-3.5 border-[color:var(--sysw-edge)]",
              corner,
            )}
          />
        ))}

        <div className="relative flex items-center gap-3 border-b border-[color:var(--sysw-line-soft)] px-4 py-2.5">
          <div aria-hidden className="flex shrink-0 items-center gap-1.5 opacity-55">
            {LIGHTS.map((light) => (
              <span
                key={light.key}
                className="size-1.5 rounded-full"
                style={{ backgroundColor: light.dot }}
              />
            ))}
          </div>

          {/* Absolutely centred rather than flex-centred, so the band's label
              sits on the window's true centre whatever the aside weighs. A
              flex-1 label splits the leftover space instead, which walks the
              word off centre the moment the right hand side is wider than the
              three lights. */}
          <span className="sysw-edge pointer-events-none absolute inset-x-0 text-center font-mono text-[0.62rem] tracking-[0.42em] text-[color:var(--sysw-dim)] uppercase">
            {label}
          </span>

          <span aria-hidden className="min-w-0 flex-1" />

          <div className="relative flex shrink-0 items-center justify-end">
            {aside ?? <span aria-hidden className="block h-2 w-[30px]" />}
          </div>
        </div>

        <div className="relative">{children}</div>
      </div>
    </>
  );
}

export default SystemWindow;
