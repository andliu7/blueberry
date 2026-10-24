/**
 * Where to find Andrew, in one place.
 *
 * These are referenced from the about card and the contact page, and were about
 * to be written out twice.
 */

/**
 * The site's name. Named for the fruit, in the manner of a certain computer
 * company, and it happens to be the colour the whole thing was already wearing.
 *
 * The opening spells this out in particles, so it is uppercased there. Changing
 * it here changes the last word of the intro and the footer sign-off.
 */
export const SITE_NAME = "Blueberry";

/**
 * THE HOME HEADLINE IS ANDREW'S (owner, 15 Oct 2026), and this is the one place
 * it lives. The hero flips between these lines letter by letter, the way
 * andliu.dev's FlipHeading does; the first is what loads first, what screen
 * readers hear, and what HOME_HEADLINE names. Edit the strings, not the hero.
 */
export const HOME_HEADLINE_FLIPS = [
  "The class everyone warns you about, one arrow at a time.",
  "Weed-out class? Not this time.",
] as const;
export const HOME_HEADLINE = HOME_HEADLINE_FLIPS[0];

/**
 * The front door's copy, and it is Andrew's to rewrite.
 *
 * It lives here rather than inline in the hero for one reason: this is the
 * paragraph that decides whether a stranger stays, so it is going to be edited
 * far more often than the component around it, and hunting it down inside two
 * hundred lines of layout every time is how copy stops getting edited.
 *
 * `sell` has one job, which is to say what you get, not what the site believes
 * about learning. `ctaNote` is the friction remover: every clause in it removes
 * a reason to hesitate, so if a clause stops being true, cut it rather than
 * soften it. There was a `motto` here; Andrew cut it.
 */
export const HERO = {
  /**
   * One sentence, display size. The blind panel's finding was blunt: the
   * largest text on the screen was the word "blueberry.", which tells a
   * stranger nothing, while the answer to "what is this?" hid in body copy.
   * The old line, "Organic chemistry that actually sticks.", is retired: the
   * replan (question 8) found it a claim any competitor could make.
   */
  headline: HOME_HEADLINE,
  sell: "Lessons that explain it properly, mechanisms you draw yourself, and flashcards that hunt down the one thing you keep getting wrong.",
  /** SITE-REPLAN.md section 7, beat 1: a verb that says what happens. */
  cta: "Start the first lesson",
  /** The quiet second door, Duolingo's "I already have an account". */
  haveAccount: "I already have an account",
  ctaNote: "Free to start. No card. About two minutes.",
} as const;

export const GITHUB_URL = "https://github.com/andliu7";
export const LINKEDIN_URL = "https://www.linkedin.com/in/andrew-liu-06154225b/";
export const EMAIL = "andliu@terpmail.umd.edu";
/**
 * The footer's Find me email, taken from andliu.dev (andliu-portfolio/lib/site.ts EMAIL) as
 * item 22 asks. The contact page and office hours keep EMAIL above.
 */
export const FIND_ME_EMAIL = "zeus.andrewliu@gmail.com";

/** The project's own repository, which is not the same link as the profile. */
export const REPO_URL = "https://github.com/andliu7/blueberry";

/**
 * The game. It has moved in, so this is a route on this site rather than a link
 * off it, and this is the one line that note promised.
 *
 * It used to be https://andliu7.github.io/mechanism_trainer/, a separate deploy
 * of an older app. The game now lives at src/game and renders at "#/app", so
 * every entrance this constant feeds (the home page's hero tile, the
 * dashboard's panel, the funnel's ending and the site footer) opens the real
 * thing without leaving the page. The `external` and `target="_blank"` at those
 * call sites went with it: an in-page hash route is not a new tab.
 *
 * The game namespaces its own routes under this prefix, so "#/app/pathway" and
 * "#/app/lesson/<node>" are its addresses and neither router can shadow the
 * other. See `GAME_HREF` in src/game/app/routes.ts.
 */
export const TRAINER_URL = "#/app";

/**
 * Where "Start the first lesson" goes: the first lesson itself, not the Path
 * (audit 23 Oct, section 5 #9: the button promised a lesson in about two
 * minutes and landed on the map). Signed out, the app gate sends the visitor
 * to sign in and brings them back here. A literal so the site bundle does not
 * load the game's router; firstLessonLink.test.ts holds it to the first node
 * on the Unit 1 path.
 */
export const FIRST_LESSON_URL = "#/app/lesson/u1-allylic";

/** Where the about card's two tags point: the college, and the advising programme. */
export const CMNS_URL = "https://cmns.umd.edu/";
export const PREHEALTH_URL =
  "https://academiccatalog.umd.edu/undergraduate/campus-administration-resources-student-services/academic-resources-services/pre-health-professions-advising-programs/";
