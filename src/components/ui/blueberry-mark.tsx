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
        <g className={cn("bb-eyes", loved && "bb-eyes-loved")}>
          {/* Blush, under everything else so the face sits on top of it. Only
              visible on hover, which is also when the eyes close: the two
              together read as one expression rather than two effects. */}
          <g className="bb-blush" fill="#fb7185">
            <ellipse cx="19.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
            <ellipse cx="44.5" cy="40" rx="4.2" ry="2.6" opacity="0.5" />
          </g>

          {loved ? (
            <>
              <path
                d="M19.5 32 C19.5 28.9 24.1 28.9 24.1 32 C24.1 28.9 28.7 28.9 28.7 32 C28.7 35.7 24.1 38.8 24.1 38.8 C24.1 38.8 19.5 35.7 19.5 32 Z"
                fill="#fb7185"
              />
              <path
                d="M35.3 32 C35.3 28.9 39.9 28.9 39.9 32 C39.9 28.9 44.5 28.9 44.5 32 C44.5 35.7 39.9 38.8 39.9 38.8 C39.9 38.8 35.3 35.7 35.3 32 Z"
                fill="#fb7185"
              />
            </>
          ) : (
            <>
              {/* Open: tall black ovals with a shine high on the left, so the
                  light on the eyes comes from where the light on the fruit
                  already does. Set a little wider apart than the first pass,
                  which had them crowding the middle of the face. */}
              <g className="bb-eye-open">
                <ellipse cx="23.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
                <ellipse cx="40.5" cy="33" rx="3.2" ry="5.7" fill="#0b0b14" />
                <ellipse cx="22.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
                <ellipse cx="39.4" cy="30.4" rx="1" ry="1.5" fill="#ffffff" opacity="0.9" />
              </g>

              {/* Closed: arcs bulging upward, the shape a face makes when it is
                  pleased rather than when it is blinking. */}
              <g
                className="bb-eye-kind"
                fill="none"
                stroke="#0b0b14"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M19.2 34.6 Q23.5 29.5 27.8 34.6" />
                <path d="M36.2 34.6 Q40.5 29.5 44.8 34.6" />
              </g>
            </>
          )}

          {/* The smile: a shallow U, much wider than it is deep. A deeper curve
              turns the berry into a cartoon mouth; this reads as contentment. */}
          <path
            className="bb-smile"
            d="M26.5 42.4 Q32 46.2 37.5 42.4"
            fill="none"
            stroke="#0b0b14"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

export default BlueberryMark;
