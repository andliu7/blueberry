import { ArrowLeft } from "lucide-react";
import { DECKS } from "@/data/decks";
import { DECK_GROUPS } from "@/data/types";
import { NavPill, type NavPillItem } from "@/components/ui/nav-pill";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Contact2 } from "@/components/ui/contact-2";
import { FeedbackButton } from "@/components/FeedbackButton";

/**
 * About and contact, at `#/about`. One page rather than two, because the
 * introduction and the reason to get in touch are the same subject.
 */
export function AboutPage() {
  const navItems: NavPillItem[] = [
    { id: "home", label: "Home", href: "#/home" },
    ...DECK_GROUPS.filter((g) => DECKS.some((d) => (d.group ?? "lab") === g.id)).map((g) => ({
      id: g.id,
      label: g.title.replace(/\[[^\]]*\]\s*/, ""),
      href: `#/folder/${g.id}`,
    })),
  ];

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 dark:bg-[#0c0a09]">
      <div className="mx-auto flex max-w-5xl flex-col">
        <div className="flex items-start justify-between gap-4">
          <NavPill items={navItems} activeId="home" />
          <AnimatedThemeToggler />
        </div>

        <a
          href="#/home"
          className="group mt-14 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          All decks
        </a>

        <Contact2
          title="About me"
          email="andliu@terpmail.umd.edu"
          about={
            <>
              <p>
                I'm an undergraduate at the University of Maryland studying Computer Science on a
                pre-dental track. My dream is to start my own practice and pursue a specialty, and
                all of it points at the same thing, which is helping people.
              </p>
              <p>
                That is also why this site exists. I hope anyone using it comes away with something
                more than memorised organic chemistry.
              </p>
              <p className="text-base">
                If you spot a mistake, want a deck for another lab, or just want to say hello, the
                form is the fastest way to reach me.
              </p>
            </>
          }
        />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          <a
            href="https://github.com/andliu7/grignard_LCTA"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-4 hover:text-slate-600 dark:hover:text-stone-300"
          >
            Source on GitHub
          </a>
        </footer>
      </div>

      <FeedbackButton />
    </main>
  );
}

export default AboutPage;
