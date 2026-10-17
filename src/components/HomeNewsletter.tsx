import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import { Check } from "lucide-react";
import "./home-newsletter.css";

/**
 * The newsletter band: BLUEBERRY across the full width in heavy capitals, cut off by the
 * band's bottom edge like a shop sign, with the signup card sitting on top of it. Adapted
 * from a 21st.dev "wordmark newsletter signup"; the design is ported, its Tailwind and its
 * own palette are not (colours are the site tokens, the face is the site's Nunito).
 *
 * Where the addresses go is NOT decided, so this component sends nothing itself. It hands
 * the signup to `onSubscribe` and shows whatever that promise says. HomePage mounts it in
 * the dev server only, with a stub that keeps nothing (see the TODO there).
 *
 * The wordmark is measured, not guessed: a canvas measures each letter at 100px in the real
 * font, and the font size is scaled so the letters add up to the band's width exactly. Each
 * letter is its own inline-block span (so it can drop on its own), which is why the letters
 * are measured one by one: kerning does not apply across separate spans.
 */

export type NewsletterTopic = "lessons" | "exams" | "game";
export interface NewsletterSignup {
  email: string;
  topics: NewsletterTopic[];
}

const TOPICS: { id: NewsletterTopic; label: string }[] = [
  { id: "lessons", label: "New lessons" },
  { id: "exams", label: "Exam season tips" },
  { id: "game", label: "Game updates" },
];

const BRAND = "BLUEBERRY";
const SUCCESS = "SEE YOU SOON";
/** Letters leaving: 300ms each, 24ms apart. Letters arriving wait for the last one to go. */
const OUT_MS = 300;
const OUT_STAGGER = 24;
/** How much of the letters' height the band's bottom edge cuts off. */
const CROP = 0.16;
const EMAIL_MAX = 28;
const EMAIL_MIN = 16; // under 16px iOS zooms the page on focus
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "pending" | "error" | "success";

/** One canvas for every measurement on the page; null under jsdom, which has no canvas. */
let canvas: HTMLCanvasElement | null = null;
function context(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  canvas ??= document.createElement("canvas");
  return canvas.getContext("2d");
}

function displayFamily(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--site-display").trim() || "sans-serif";
}

/** Width of `text` at 100px, letter by letter. */
function widthAt100(ctx: CanvasRenderingContext2D, text: string): number {
  let sum = 0;
  for (const ch of text) sum += ctx.measureText(ch === " " ? " " : ch).width;
  return sum;
}

interface Fit {
  width: number;
  brandSize: number;
  successSize: number;
  /** Cap height, and the cap's top inside a line-height 1 box, both in em. */
  cap: number;
  capTop: number;
}

/**
 * Measures the band and refits on every resize and once the font has arrived. A custom hook
 * (a function named `use...` that calls other hooks), so the measuring lives in one place.
 */
function useFit(ref: RefObject<HTMLElement | null>): Fit | null {
  const [fit, setFit] = useState<Fit | null>(null);
  useEffect(() => {
    const el = ref.current;
    const ctx = context();
    if (!el || !ctx) return;
    const family = displayFamily();
    const font = `900 100px ${family}`;
    const measure = () => {
      const width = el.clientWidth;
      if (width === 0) return;
      ctx.font = font;
      const caps = ctx.measureText("B");
      const ascent = caps.fontBoundingBoxAscent / 100 || 0.95;
      const descent = caps.fontBoundingBoxDescent / 100 || 0.3;
      const cap = caps.actualBoundingBoxAscent / 100 || 0.7;
      // In a line-height 1 box the baseline sits at half the leftover leading plus the ascent.
      const baseline = (1 - ascent - descent) / 2 + ascent;
      setFit({
        width,
        brandSize: (100 * width) / widthAt100(ctx, BRAND),
        successSize: (100 * width) / widthAt100(ctx, SUCCESS),
        cap,
        capTop: baseline - cap,
      });
    };
    measure();
    let alive = true;
    document.fonts?.load(font).then(() => alive && measure(), () => {});
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [ref]);
  return fit;
}

export default function HomeNewsletter({ onSubscribe }: { onSubscribe: (signup: NewsletterSignup) => Promise<void> }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const fit = useFit(fieldRef);

  const [email, setEmail] = useState("");
  const [topics, setTopics] = useState<NewsletterTopic[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [emailSize, setEmailSize] = useState(EMAIL_MAX);
  // False until the first swap, so the page does not open on a drop animation.
  const [swapped, setSwapped] = useState(false);

  // The address shrinks to fit as it grows, between 28px and 16px. useLayoutEffect, so the
  // new size is applied before the browser paints the longer address at the old one.
  useLayoutEffect(() => {
    const input = emailRef.current;
    const ctx = context();
    if (!input || !ctx) return;
    const style = getComputedStyle(input);
    const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    ctx.font = `800 100px ${displayFamily()}`;
    const needed = ctx.measureText(email || "you@school.edu").width;
    setEmailSize(Math.max(EMAIL_MIN, Math.min(EMAIL_MAX, (100 * room) / needed)));
  }, [email, fit?.width]);

  // Focus follows the card: to the "on the list" heading on success, and back to the address
  // after "Use a different email". After the render, because a hidden form cannot take focus.
  const backToEmail = useRef(false);
  useEffect(() => {
    if (status === "success") doneRef.current?.focus();
    if (status === "idle" && backToEmail.current) {
      backToEmail.current = false;
      emailRef.current?.focus();
    }
  }, [status]);

  const toggleTopic = (id: NewsletterTopic) =>
    setTopics((on) => (on.includes(id) ? on.filter((t) => t !== id) : [...on, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "pending") return;
    const address = email.trim();
    if (!EMAIL_SHAPE.test(address)) {
      setStatus("error");
      setError("That address does not look finished. Check it and try again.");
      emailRef.current?.focus();
      return;
    }
    if (!consent) {
      setStatus("error");
      setError("Tick the box first, so I know you want these emails.");
      consentRef.current?.focus();
      return;
    }
    setStatus("pending");
    setError("");
    try {
      await onSubscribe({ email: address, topics });
      setSwapped(true);
      setStatus("success");
    } catch {
      setStatus("error");
      setError("That did not go through, and nothing was saved. Try again in a minute.");
    }
  };

  const startOver = () => {
    setEmail("");
    setConsent(false);
    setStatus("idle");
    backToEmail.current = true;
  };

  // The fit above needs the input mounted, so on success the form is hidden, not removed.
  const done = status === "success";
  const showing = done ? "success" : "brand";

  let fieldStyle: CSSProperties | undefined;
  let brandStyle: CSSProperties | undefined;
  let successStyle: CSSProperties | undefined;
  if (fit) {
    const height = fit.cap * fit.brandSize * (1 - CROP);
    // Each word's cap top sits so that the same share of it falls below the bottom edge.
    const top = (size: number) => height - fit.cap * size * (1 - CROP) - fit.capTop * size;
    fieldStyle = { "--hn-h": `${height}px` } as CSSProperties;
    brandStyle = {
      fontSize: fit.brandSize,
      top: top(fit.brandSize),
      "--wait": `${OUT_MS + (SUCCESS.length - 1) * OUT_STAGGER}ms`,
    } as CSSProperties;
    successStyle = {
      fontSize: fit.successSize,
      top: top(fit.successSize),
      "--wait": `${OUT_MS + (BRAND.length - 1) * OUT_STAGGER}ms`,
    } as CSSProperties;
  }

  return (
    <section className="hn" aria-labelledby={done ? "hn-done" : "hn-title"}>
      <div ref={fieldRef} className="hn__field" style={fieldStyle} data-ready={fit ? "" : undefined} aria-hidden>
        <Word text={BRAND} state={showing === "brand" ? "in" : "out"} animate={swapped} style={brandStyle} />
        <Word text={SUCCESS} state={showing === "success" ? "in" : "out"} animate={swapped} style={successStyle} />
      </div>

      <div className="hn__card">
        {done ? (
          <div className="hn__done">
            <h2 id="hn-done" ref={doneRef} tabIndex={-1} className="hn__title">
              You are on the list.
            </h2>
            <p className="hn__lede">I will write when there is something new. Every email has a way out at the bottom.</p>
            <button type="button" className="hn__again" onClick={startOver}>
              Use a different email
            </button>
          </div>
        ) : null}

        <form className="hn__form" onSubmit={submit} noValidate hidden={done}>
          <h2 id="hn-title" className="hn__title">
            Hear from me when something changes.
          </h2>
          <p className="hn__lede">
            One short email when a new lesson or a game update is out. Nothing else, and you can leave any time.
          </p>

          <label className="hn__label" htmlFor="hn-email">
            Your email
          </label>
          <input
            ref={emailRef}
            id="hn-email"
            className="hn__email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontSize: emailSize }}
            aria-invalid={status === "error" && !EMAIL_SHAPE.test(email.trim()) ? true : undefined}
            aria-describedby="hn-error"
          />

          <fieldset className="hn__topics">
            <legend className="hn__label">What to hear about. Pick any, or none for all of it.</legend>
            <div className="hn__chips">
              {TOPICS.map((t) => {
                const on = topics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="hn__chip"
                    aria-pressed={on}
                    onClick={() => toggleTopic(t.id)}
                  >
                    {on && <Check aria-hidden className="hn__tick" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="hn__consent">
            <input
              ref={consentRef}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>Yes, send me these emails.</span>
          </label>

          <p id="hn-error" className="hn__error" role="status" aria-live="polite">
            {status === "error" ? error : ""}
          </p>

          {/* The site's primary button (home.css .home-btn): ledge press plus the label roll. */}
          <button type="submit" className="home-btn hn__submit" aria-busy={status === "pending"} disabled={status === "pending"}>
            <span className="home-btn__face">{status === "pending" ? "Signing you up" : "Sign me up"}</span>
            <span className="home-btn__face home-btn__face--back" aria-hidden>
              {status === "pending" ? "Signing you up" : "Sign me up"}
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}

/** One word of the field, a span per letter so each can drop on its own (`--i` is its place). */
function Word({ text, state, animate, style }: { text: string; state: "in" | "out"; animate: boolean; style?: CSSProperties }) {
  return (
    <span className="hn__word" data-state={state} data-anim={animate ? "" : undefined} style={style}>
      {[...text].map((ch, i) => (
        <span key={i} className="hn__letter" style={{ "--i": i } as CSSProperties}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
