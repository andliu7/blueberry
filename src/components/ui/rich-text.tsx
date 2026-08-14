import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Markdown-lite to React nodes. Four markers, nothing else.
 *
 * `**bold**`, `*italic*`, `` `code` ``, `[text](url)`.
 *
 * Built as React elements, never with `dangerouslySetInnerHTML`. This text is
 * written by a TA, stored on a server, and served to a whole class, which is
 * precisely the shape of a stored XSS: one `<img onerror=...>` in a lesson
 * paragraph would run for every student who opened the page. Constructing nodes
 * means a stray tag renders as the characters it is.
 */

/**
 * Only these schemes become links.
 *
 * `javascript:` is the obvious one to keep out, but `data:` deserves the same
 * treatment: a `data:text/html` URL opens an attacker-controlled document on
 * this origin. An unrecognised scheme renders as plain text rather than
 * silently disappearing, so a TA who mistypes a URL can see what they typed.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith("#/") || trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  return null;
}

/** In-app hash routes stay in the tab; anything else opens away from it. */
function Anchor({ href, children }: { href: string; children: ReactNode }) {
  const internal = href.startsWith("#/") || href.startsWith("/");
  return (
    <a
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noreferrer noopener" })}
      className="font-semibold text-indigo-700 underline decoration-indigo-400 underline-offset-2 hover:decoration-2 dark:text-indigo-300"
    >
      {children}
    </a>
  );
}

/**
 * One pass, alternation ordered longest-first.
 *
 * `**` has to be tried before `*` or bold text comes out as an italic asterisk
 * wrapping the word. Links come first because their label can itself contain
 * the other markers.
 */
const TOKEN =
  /(\[[^\]\n]*\]\([^)\s]+\))|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(`[^`\n]+`)/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = safeHref(token.slice(split + 2, -1));
      // No usable scheme: show what they typed, do not make it clickable.
      out.push(
        href ? (
          <Anchor key={key} href={href}>
            {renderInline(label, key)}
          </Anchor>
        ) : (
          <Fragment key={key}>{token}</Fragment>
        ),
      );
    } else if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      out.push(
        <code
          key={key}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[.85em] dark:bg-stone-800"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * A block of body text. Blank lines separate paragraphs; single newlines are
 * left alone, so a TA pressing return once does not silently split a sentence
 * into two paragraphs.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim() !== "");
  if (paragraphs.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="leading-7">
          {renderInline(paragraph, `p${i}`)}
        </p>
      ))}
    </div>
  );
}

export default RichText;
