import { cn } from "@/lib/utils";

/**
 * The site's logo, drawn inline.
 *
 * The same art as `public/favicon.svg`, kept as a component so it can be
 * rendered at any size without a network request and without a second file that
 * can 404. Every other illustration on the site is held as markup for the same
 * reason.
 *
 * The gradient ids are shared across instances on purpose. They are identical
 * definitions, so a duplicate id resolves to the same paint; giving each
 * instance its own would mean threading a unique suffix through for no visible
 * difference.
 */
export function BlueberryMark({
  className,
  eyes = false,
  loved = false,
}: {
  className?: string;
  /**
   * Two blinking eyes on the berry, borrowed from the robot: rounded brackets
   * rather than dots, which is what makes them read as a face without turning
   * the logo into a cartoon.
   *
   * Off by default. The favicon and the nav mark are identity, and a blinking
   * favicon is a distraction; the places that want a face ask for one.
   */
  eyes?: boolean;
  /** Swaps the eyes for hearts, e.g. while the mark is being pressed. */
  loved?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Blueberry" className={cn("block", className)}>
      <defs>
        <radialGradient id="bb-berry" cx="33%" cy="27%" r="84%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="28%" stopColor="#4f86f7" />
          <stop offset="66%" stopColor="#6d3fe0" />
          <stop offset="100%" stopColor="#3b1d8f" />
        </radialGradient>
        <linearGradient id="bb-calyx" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#3350d8" />
          <stop offset="100%" stopColor="#1c1668" />
        </linearGradient>
      </defs>

      <circle cx="32" cy="34" r="23" fill="url(#bb-berry)" />

      <ellipse
        cx="19"
        cy="26"
        rx="6"
        ry="4.1"
        fill="#ffffff"
        opacity="0.26"
        transform="rotate(-30 19 26)"
      />

      {/* The calyx sits on top and points up, squashed vertically because a
          crown lying flat on a sphere is foreshortened seen from the side. */}
      <g fill="url(#bb-calyx)" transform="translate(32 15.5) scale(1 0.62)">
        <path d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z" />
        <path
          d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z"
          transform="rotate(72)"
        />
        <path
          d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z"
          transform="rotate(144)"
        />
        <path
          d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z"
          transform="rotate(216)"
        />
        <path
          d="M0 -11 C2.8 -6.7 3.7 -2.8 2.6 0 C1.6 2.2 -1.6 2.2 -2.6 0 C-3.7 -2.8 -2.8 -6.7 0 -11 Z"
          transform="rotate(288)"
        />
        <circle r="3.6" fill="#241f7a" />
      </g>

      {/* Drawn last so they sit over the berry's shading rather than under it.
          The blink is a scaleY on the pair, which is what an eyelid does; fading
          them out instead reads as the face disappearing. */}
      {eyes && (
        <g className={cn("bb-eyes", loved && "bb-eyes-loved")} fill="none" stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round">
          {loved ? (
            <>
              <path d="M22 33 C22 30.5 25.5 30.5 25.5 33 C25.5 30.5 29 30.5 29 33 C29 36 25.5 38.5 25.5 38.5 C25.5 38.5 22 36 22 33 Z" fill="#fb7185" stroke="none" />
              <path d="M35 33 C35 30.5 38.5 30.5 38.5 33 C38.5 30.5 42 30.5 42 33 C42 36 38.5 38.5 38.5 38.5 C38.5 38.5 35 36 35 33 Z" fill="#fb7185" stroke="none" />
            </>
          ) : (
            <>
              <path d="M22.5 30.5 L22.5 35.5 M22.5 30.5 Q22.5 29 24 29 L27 29 Q28.5 29 28.5 30.5 L28.5 35.5" />
              <path d="M35.5 30.5 L35.5 35.5 M35.5 30.5 Q35.5 29 37 29 L40 29 Q41.5 29 41.5 30.5 L41.5 35.5" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

export default BlueberryMark;
