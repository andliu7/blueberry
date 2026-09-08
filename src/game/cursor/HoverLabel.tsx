/**
 * The hover label: a small chip that follows a fine pointer and names what is
 * under it in one or two words.
 *
 * WHY IT DOES NOT REPLACE THE CURSOR. The reference implementations this came
 * from set `document.body.style.cursor = "none"` and draw their own pointer.
 * That is an accessibility regression: a student who has raised their OS cursor
 * size, inverted it, or turned on a high contrast pointer loses all of it, and
 * we would be substituting our own guess for a setting they chose deliberately.
 * So the system cursor stays exactly as the operating system draws it and this
 * chip rides ALONGSIDE it. Nothing is taken away; a label is added.
 *
 * WHY THE LABEL IS NOT ITS OWN VOCABULARY. The obvious build is a
 * `data-cursor-label` attribute on every control, which would immediately be a
 * second name for every element, free to drift from the one a screen reader
 * reads. Instead this reads the ACCESSIBLE NAME that is already there:
 * aria-label first, then title, then the element's own short text. One source
 * of truth, so the sighted hover and the announced name cannot disagree, and
 * every control that gains a label gains a hover chip for free. The
 * `data-hover-label` override exists only for the case where the accessible
 * name is a full sentence and the chip wants its noun.
 *
 * WHY NO ANIMATION LIBRARY. This is one transform per animation frame. The
 * references pull in a spring library for it, which is tens of kilobytes
 * against the 400 KB route budget to interpolate two numbers. A CSS transition
 * on opacity plus a direct transform is the whole effect.
 *
 * WHY TOUCH IS UNAFFECTED. It mounts only when `(pointer: fine)` matches, so on
 * a phone this file costs one media query and renders nothing. That matters
 * because this product is iOS first and a cursor affordance is, by definition,
 * a desktop enhancement rather than a feature anything may depend on.
 */

import { useEffect, useRef, useState } from "react";

/** Elements worth naming. Everything here is either interactive or a readout. */
const NAMEABLE =
  "[data-hover-label], button, a[href], summary, [role='button'], [role='progressbar'], [role='tab'], input, select";

/** The accessible name, trimmed to the one or two words a chip can hold. */
function labelFor(el: HTMLElement): string | null {
  const explicit = el.dataset.hoverLabel;
  const aria = el.getAttribute("aria-label");
  const title = el.getAttribute("title");
  /*
    innerText, NOT textContent, and the difference is a bug the owner found:
    hovering Train read "Train Train".

    A tab renders BOTH labels and hides one per breakpoint in CSS, the short
    one above `md` and the full one below it (Shell.tsx TabLink). textContent
    concatenates every text node in the subtree whether or not it is displayed,
    so it returned both and the two collapsed into a doubled word. innerText is
    the rendered text: it honours `display: none` and returns only the label a
    reader can actually see, which is by definition the right name for a chip
    that names what the pointer is over.

    It costs a layout flush, which is why textContent is the usual advice. Here
    it runs once per hovered element rather than per frame, and being wrong is
    more expensive than being slow.
  */
  const text = el.innerText ?? "";
  const raw = (explicit ?? aria ?? title ?? text).trim();
  if (raw === "") return null;
  // One or two words. A comma or a full stop ends the phrase early, because an
  // aria-label is often a sentence ("Daily goal, 14 of 20 XP today") whose
  // useful part is its head.
  const head = (raw.split(/[,.;:]/)[0] ?? raw).trim();
  const words = head.split(/\s+/).slice(0, 2).join(" ");
  return words.length > 24 ? words.slice(0, 24) : words;
}

export function HoverLabel() {
  const [label, setLabel] = useState<string | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);

  useEffect(() => {
    // Desktop only, and only where a pointer can actually hover.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let lastX = 0;
    let lastY = 0;

    const paint = () => {
      frame.current = 0;
      const chip = chipRef.current;
      if (chip === null) return;
      // translate3d keeps this on the compositor, so following the pointer
      // never competes with the 60 fps budget the animations are held to.
      chip.style.transform = `translate3d(${lastX + 16}px, ${lastY + 18}px, 0)`;
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (frame.current === 0) frame.current = requestAnimationFrame(paint);

      const target = e.target as HTMLElement | null;
      const named = target?.closest<HTMLElement>(NAMEABLE) ?? null;
      setLabel(named === null ? null : labelFor(named));
    };

    const onLeave = () => setLabel(null);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (frame.current !== 0) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={chipRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 60,
        pointerEvents: "none",
        opacity: label === null ? 0 : 1,
        transition: "opacity 120ms ease-out",
        padding: "3px 9px",
        borderRadius: "999px",
        border: "1px solid var(--bb-border, rgba(0,0,0,.12))",
        background: "var(--bb-card, #fff)",
        color: "var(--ink-muted, #555)",
        font: "500 12px/1.2 var(--font-content, system-ui, sans-serif)",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
}
