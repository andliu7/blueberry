import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
                I'm a Computer Science major at the University of Maryland, and I'm
                on the pre-dental track! My dream is to start my own practice and
                pursue a specialty, all with the purpose of helping others.
              </p>
              <p>
                I really hope that the people using this site are able to take
                something away from it beyond just organic chemistry memorization!
              </p>
              <p className="text-base">
                Found a mistake? Want a deck for a lab that isn't here yet? Just
                want to say hi? The form is the fastest way to reach me!
              </p>
            </>
          }
        />

        <footer className="mt-16 text-center text-sm text-slate-400 dark:text-stone-500">
          {/* Keeps the dotted underline a link is expected to have, and adds the
              sweep the deck footer's GitHub link already uses, so the two do not
              behave differently for no reason. */}
          <a
            href="https://github.com/andliu7/grignard_LCTA"
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

export default AboutPage;
