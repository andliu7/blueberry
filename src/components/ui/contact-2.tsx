import { useState } from "react";
import { Mail, Send, Check, AlertTriangle } from "lucide-react";
import { endpointFor, postToAppsScript } from "@/lib/appsScript";
import { cn } from "@/lib/utils";

/**
 * About and contact, on one page.
 *
 * Adapted rather than pasted. The original leaned on shadcn's Button, Input,
 * Label and Textarea, which would have pulled in @radix-ui/react-slot,
 * class-variance-authority and @radix-ui/react-label, and all four are built on
 * CSS variables (`bg-primary`, `border-input`, `ring-offset-background`) that
 * this project never defines, so they would have rendered unstyled. The fields
 * here are plain elements in the site's own palette.
 *
 * Its `max-w-screen-xl` and `max-w-screen-md` were also dead classes: Tailwind
 * v4 dropped the breakpoint-based max-width utilities, so they set no width at
 * all.
 *
 * Submissions POST to the shared Apps Script backend when one is configured. With it
 * unset the form still validates and tells you it is not connected, rather than
 * pretending to send.
 */


const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500";

const labelClass = "text-sm font-semibold text-slate-700 dark:text-stone-300";

export interface Contact2Props {
  title?: string;
  about?: React.ReactNode;
  email?: string;
  phone?: string;
  web?: { label: string; url: string };
  /** Profile links, shown above the address list. */
  links?: React.ReactNode;
}

export const Contact2 = ({
  title = "Contact me",
  about,
  email = "andliu@terpmail.umd.edu",
  phone,
  web,
  links,
}: Contact2Props) => {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!endpointFor("contact")) {
      setStatus("failed");
      setMessage(`This form is not connected yet. Email me directly at ${email}.`);
      return;
    }

    setStatus("sending");
    const body = await postToAppsScript("contact", data);
    if (body.ok) {
      setStatus("sent");
      setMessage("Thanks, that reached me. I will get back to you.");
      form.reset();
    } else {
      setStatus("failed");
      setMessage(
        body.error === "unreachable"
          ? `That did not send. Email me directly at ${email}.`
          : (body.error ?? "That did not send. Try emailing me instead."),
      );
    }
  };

  return (
    <section className="py-10">
      <div className="mx-auto flex max-w-5xl flex-col justify-between gap-12 lg:flex-row lg:gap-16">
        <div className="flex max-w-md flex-col gap-8">
          <div>
            <h1 className="title-face mb-3 text-4xl leading-[1.05] text-slate-900 sm:text-5xl dark:text-stone-100">
              {title}
            </h1>
            <div className="playful-face space-y-3 text-lg leading-relaxed text-slate-500 dark:text-stone-400">
              {about}
            </div>
          </div>

          <div>
            {/* Above the address list on purpose: the profiles are where most
                people will actually go, and an email row is a poor thing to
                make them read past first. */}
            {links && <div className="mb-6 flex flex-wrap items-center gap-2.5">{links}</div>}

            <h2 className="mb-3 font-mono text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-300">
              Where to find me
            </h2>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-stone-300">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-slate-400 dark:text-stone-500" />
                <a
                  href={`mailto:${email}`}
                  className="underline decoration-dotted underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  {email}
                </a>
              </li>
              {phone && <li>{phone}</li>}
              {web && (
                <li>
                  <a href={web.url} target="_blank" rel="noreferrer" className="underline">
                    {web.label}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-slate-200 bg-white/60 p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/50"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-4">
            <div className="grid w-full gap-1.5">
              <label className={labelClass} htmlFor="firstname">
                First name
              </label>
              <input className={fieldClass} type="text" id="firstname" name="firstname" required />
            </div>
            <div className="grid w-full gap-1.5">
              <label className={labelClass} htmlFor="lastname">
                Last name
              </label>
              <input className={fieldClass} type="text" id="lastname" name="lastname" />
            </div>
          </div>

          <div className="grid w-full gap-1.5">
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input className={fieldClass} type="email" id="email" name="email" required />
          </div>

          <div className="grid w-full gap-1.5">
            <label className={labelClass} htmlFor="subject">
              Subject
            </label>
            <input className={fieldClass} type="text" id="subject" name="subject" />
          </div>

          <div className="grid w-full gap-1.5">
            <label className={labelClass} htmlFor="message">
              Message
            </label>
            <textarea
              className={cn(fieldClass, "min-h-[120px] resize-y")}
              id="message"
              name="message"
              placeholder="Anything you like."
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {status === "sending" ? "Sending…" : "Send message"}
          </button>

          {message && (
            <p
              className={cn(
                "flex items-start gap-2 text-sm",
                status === "sent"
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400",
              )}
            >
              {status === "sent" ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default Contact2;
