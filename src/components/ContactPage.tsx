import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Contact2 } from "@/components/ui/contact-2";
import { GradientMenuButton } from "@/components/ui/gradient-menu";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { SiteHeader } from "@/components/ui/site-header";
import { FeedbackButton } from "@/components/FeedbackButton";
import { EMAIL, GITHUB_URL, LINKEDIN_URL, REPO_URL } from "@/data/site";
import { SURFACE } from "@/lib/hubSurface";
import { useIsDark } from "@/lib/useIsDark";

/**
 * Contact, at `#/contact`.
 *
 * This was half of a combined about-and-contact page. The introduction is now a
 * card that comes up over whatever you were looking at, which left this page
 * with one job: the form, and the other ways of reaching the same person.
 *
 * `#/about` still lands here rather than 404ing, since that was the old address
 * and it is the closest thing to what an old link was asking for.
 */
export function ContactPage() {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;

  return (
    <main
      className="relative min-h-screen pb-8"
      style={{ backgroundColor: surface.base, backgroundImage: surface.gradient }}
    >
      {/* No spotlight here, deliberately. The hub and the folder pages are
          things you scan, where a light tracking the cursor gives the eye
          something to follow. This one is a form you sit and fill in, and the
          card carries its own border shine as feedback, so a second moving light
          was one too many. */}
      {/* No Browse here: this page has no course tree beside it. No Contact
          button either, since it would link to the page you are on. */}
      <SiteHeader showContact={false} />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-6">
        <a
          href="#/home"
          className="group mt-8 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          All decks
        </a>

        <Contact2
          title="Contact me"
          email={EMAIL}
          about={
            <p>
              Found a mistake? Want a deck for a lab that isn't here yet? Just want to
              say hi? The form is the fastest way to reach me! I'll try to get back
              within a few business days!
            </p>
          }
          links={
            <>
              {/* The same pill as the deck toolbars: a circle that widens into a
                  labelled tab on hover. `href` makes it a real link rather than a
                  button that opens a window. */}
              <GradientMenuButton
                title="GitHub"
                icon={<GithubMark />}
                href={GITHUB_URL}
                gradientFrom="#334155"
                gradientTo="#0f172a"
              />
              <GradientMenuButton
                title="LinkedIn"
                icon={<LinkedinMark />}
                href={LINKEDIN_URL}
                gradientFrom="#0a66c2"
                gradientTo="#004182"
              />
            </>
          }
        />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          {/* Keeps the dotted underline a link is expected to have, and adds the
              sweep the deck footer's GitHub link already uses, so the two do not
              behave differently for no reason. */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="group/gh inline-flex items-center gap-1.5 outline-none transition-colors hover:text-slate-600 dark:hover:text-stone-300"
          >
            <span className="relative">
              Source on GitHub
              <span className="absolute right-0 -bottom-1 left-0 border-b border-dotted border-current" />
              <span
                aria-hidden
                className="absolute right-0 -bottom-1 left-0 h-[2px] origin-left scale-x-0 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-transform duration-300 ease-out group-hover/gh:scale-x-100"
              />
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/gh:translate-x-0.5 group-hover/gh:-translate-y-0.5" />
          </a>
        </footer>
      </div>

      <FeedbackButton />
    </main>
  );
}

export default ContactPage;
