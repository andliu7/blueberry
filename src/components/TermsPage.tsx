import { ChevronLeft } from "lucide-react";
import { SiteFooter } from "@/components/ui/site-footer";
import { PageBackground } from "@/components/ui/page-background";
import { SITE_NAME } from "@/data/site";

/**
 * Terms and policies.
 *
 * The profile menu asks for this item, and a menu row that goes nowhere is
 * worse than one that is missing. So the route is real.
 *
 * **The text below is a placeholder and says so on the page.** Writing terms
 * that sound authoritative but were invented by an assistant is the failure mode
 * to avoid here: someone reads them, believes them, and they describe a policy
 * nobody agreed to. What is stated below is only what is already observably
 * true of the site — where data is held, what is collected, who can see it —
 * and everything that needs a decision is marked as needing one.
 */
export function TermsPage() {
  return (
    <main className="relative min-h-screen text-slate-900 dark:text-stone-100">
      <PageBackground />
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <a
          href="#/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300"
        >
          <ChevronLeft className="size-4" />
          Home
        </a>

        <header className="mt-5 rounded-3xl border border-indigo-200/80 bg-white/75 p-6 shadow-sm dark:border-indigo-400/20 dark:bg-stone-950/70">
          <p className="font-mono text-xs font-semibold tracking-[.18em] text-indigo-600 uppercase dark:text-indigo-300">
            {SITE_NAME}
          </p>
          <h1 className="title-face mt-3 text-4xl leading-none">Terms &amp; policies</h1>
          <p className="mt-4 leading-7 text-slate-600 dark:text-stone-300">
            What this site does with what you give it.
          </p>
        </header>

        <div className="mt-5 rounded-3xl border border-amber-300 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">This page is not finished.</p>
          <p className="mt-2">
            The sections below describe how {SITE_NAME} actually behaves today, which is
            checkable. They are not a substitute for terms of service, and nothing here has
            been reviewed by anyone qualified to review it.
          </p>
        </div>

        <article className="mt-5 space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-950/70">
          <Section title="What is stored about you">
            <p>
              Signing in creates a row holding your email address, the name your provider
              supplies, and a role. Course staff can see that row; other students cannot.
            </p>
            <p>
              Ratings, notes, the focus timer and your display picture are kept in your own
              browser and are not sent anywhere.
            </p>
          </Section>

          <Section title="Who can edit the course content">
            <p>
              Lessons, reactions and calendar dates can be edited by course staff. Who counts
              as staff is a list held on the server, not something this page can be told.
            </p>
          </Section>

          <Section title="Where it is held">
            <p>
              Accounts and course content are held by Supabase. Some older features still run
              through Google Apps Script and a Google Sheet.
            </p>
          </Section>

          <Section title="Still to be written">
            <p>
              Acceptable use, how to ask for your account to be deleted, how long anything is
              kept, what happens to the site at the end of a semester, and who to contact
              about any of it.{" "}
              <a href="#/contact" className="font-semibold underline underline-offset-4">
                Contact
              </a>{" "}
              is the way to ask in the meantime.
            </p>
          </Section>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 leading-7 text-slate-600 dark:text-stone-300">{children}</div>
    </section>
  );
}

export default TermsPage;
