# Grignard LCTA Master List

An interactive study guide for the Grignard synthesis lab practical (LCTA), built
as a single-page web app.

**Live site:** https://andliu7.github.io/grignard_LCTA/

---

## Why this exists

**To help my Orgo classmates.** The Grignard lab has a lot of small "why" details
that are easy to nod along to and impossible to recall under pressure: why the
glassware goes in the oven, which layer the product ends up in, what the iodine
chips are actually doing. This collects 44 of those questions in one place, with
answers you can hide, self-rate, and drill until they stick. The goal was
something you could open on your phone the morning of the practical and actually
get value from in ten minutes.

**To teach myself web development and UI/UX.** The second goal was just as
important. Every feature here was an excuse to learn something concrete: how
component state flows through a React tree, how scroll-linked animation works,
how to make a dark theme that does not look like an afterthought, how to tell
the difference between an effect that delights and one that gets in the way.
A lot of what is documented below is as much a record of lessons learned as it
is a feature list.

---

## What it does

### Studying

- **44 questions** covering the full experiment, from oven-drying glassware
  through extraction, washing, drying, and IR and NMR interpretation
- **Expandable answers.** Every card opens and closes on click, so you can test
  yourself before revealing
- **Multiple choice** with instant right and wrong feedback on the sample LCTA
  question
- **Self-rating.** Mark each question Review, Almost, or Got It. A counter and
  progress bar track how far through you are
- **Needs Review filter** hides everything already marked green, so revision
  narrows as you improve
- **Sorting** by question number, hardest first, or easiest first
- **Shuffle and unshuffle.** One click randomizes the order, another restores it
- **Expand All and Collapse All** for sweeping through everything at once
- **Scratch notes** in a draggable sticky panel that persists between sessions
- **Progress is saved automatically** to the browser, so closing the tab does not
  lose your ratings

### Three ways to read

One control cycles between them:

- **List.** All questions stacked, the default
- **Carousel.** One question at a time with prev and next, for focused drilling
- **Scroll.** Cards rise into focus as they reach the middle of the viewport and
  tilt away as they leave, for a relaxed read-through

### Chemistry rendering

Formulas are written in LaTeX and rendered by MathJax, so `CaCl_2` and
`Mg(OH)X` display properly rather than as raw text.

---

## The animations and interactions

This is where most of the learning happened. Each one is listed with what it
does and what it taught me.

| Feature | What it does |
|---|---|
| **Magnetic toolbar button** | The `+` toggle drifts toward your cursor as you approach it, pulled by a spring. Makes a small target feel alive and inviting |
| **Particle burst** | Clicking the `+` throws fourteen glowing dots outward in a full circle. Pure feedback, no function, and it makes the toolbar feel responsive |
| **Click here hint** | A handwritten label and a curved bouncing arrow point at the `+` while the toolbar is collapsed, so a hidden feature is still discoverable |
| **Expanding pill buttons** | Toolbar buttons are circles that widen into labelled pills on hover, with a gradient fill sweeping in. Icons stay compact until you need the words |
| **Fanned testimonial cards** | Chemistry illustrations arranged in a 3D fan using GSAP, with cards leaning, scaling, and lifting on hover |
| **Autoplay carousel** | The testimonial fan advances itself every few seconds, pauses when hovered, and stops permanently once you take control |
| **Spotlight cards** | In light mode, a soft indigo glow follows your cursor across each question card |
| **3D tilt cards** | In dark mode, cards lean in three dimensions toward your cursor with a spring, plus a glare sweep. Different effect per theme because a soft glow disappears on a dark surface |
| **Scroll-linked choreography** | In Scroll view, each card's blur, opacity, depth, and tilt are driven directly by its scroll position |
| **Animated theme toggle** | A sun morphs into a crescent moon: rays shrink and rotate away, the center circle swells, and an SVG mask carves the crescent. Plays a soft click |
| **Title hover** | Each letter of the title scales, lifts, and thickens in a staggered wave |
| **Hold to reset** | Destructive reset requires holding for 1.2 seconds, with a fill sweeping across to show progress. Releasing early cancels |
| **Press depth buttons** | Rating buttons physically depress and tilt toward where you clicked |
| **Confetti** | Fires once when all 44 questions are reviewed |
| **Theme crossfade** | Switching themes transitions every surface together over 220ms instead of snapping |
| **Link underline sweep** | The footer GitHub link draws a gradient underline from the left while the icon tilts and the arrow flies outward |

---

## How it was built

### React

The whole interface is React components. The main lessons:

- **State placement matters more than anything.** Whether a piece of state lives
  inside a component or in its parent decides what is possible. Question cards
  originally owned their own open and closed state, which meant Expand All could
  not exist. Lifting that state into the parent made the feature trivial. The
  same happened with the toolbar: once the parent knew whether it was open, it
  could lay the filter hint out beside it.
- **Controlled and uncontrolled components.** Several components accept an
  optional value prop and fall back to internal state when it is absent. That
  pattern lets the same component work standalone or be driven by a parent.
- **Effects and dependencies.** A carousel bug turned out to be an array rebuilt
  on every render, which changed a callback's identity, which re-ran an effect
  constantly and left an animation lock stuck on. Memoizing the array fixed it.
  Dependency arrays are not a formality.
- **Refs for things React does not own.** GSAP animations, MathJax typesetting,
  and scroll measurement all reach into real DOM nodes through refs.

### TypeScript

Types caught genuine mistakes throughout, especially around optional props and
union types like `"list" | "carousel" | "scroll"`. Turning the view mode from a
boolean into a union made it impossible to be in two modes at once, which is a
whole category of bug removed by the compiler rather than by testing.

Several components pulled in from outside had loose typing that hid problems,
such as a timer id being force-cast into a ref typed as `null`. Tightening those
surfaced real issues.

### CSS and Tailwind

Nearly all styling is Tailwind utility classes, with a small amount of custom CSS
for things utilities cannot express.

- **Tailwind v4 changed how dark mode works.** It maps `dark:` to the operating
  system preference by default. Class-based theming needs an explicit
  `@custom-variant dark` declaration. Without it, a theme toggle appears to do
  nothing at all.
- **Conflicting utilities are a real hazard.** Putting `fixed` and `relative` on
  the same element silently breaks positioning, because both set the `position`
  property and the winner depends on stylesheet order. This shipped once and
  threw two floating buttons off screen.
- **Transforms and perspective.** The 3D tilts and the scroll choreography are
  CSS transforms with `perspective` and `transform-style: preserve-3d`. Moving an
  element toward the viewer magnifies it, which is fine for a small image and
  overflows the container for a full-width card.
- **Custom CSS** covers the paper grid background, the three display typefaces,
  the card-fan geometry, and the theme crossfade.

### HTML

Semantic structure and accessibility got real attention: `figure` and
`blockquote` for testimonials, `aria-expanded` on collapsible cards,
`aria-pressed` on toggles, labels on every icon-only button, `aria-live` on the
feedback panel, and screen-reader text behind decorative letter animations.

One HTML detail worth calling out: the theme is applied by a small inline script
in `index.html` that runs before the page paints. Doing it in React instead means
dark-mode users see a flash of white on every single load.

---

## Tech stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion (Framer Motion's successor),
GSAP, MathJax 3, and lucide-react icons.

---

## Takeaways from building this

**A component that renders is not a component that works.** Several
drop-in components looked correct and did nothing: an effect animating
`font-variation-settings` on a font with no variable axis, a glare built from a
CSS variable that was never defined, a button that never called the click handler
it was given. Verifying behavior beats verifying that something appears.

**Check the surrounding assumptions before pasting code in.** Most components
assumed a shadcn project with theme tokens like `bg-primary` and `ring-ring`.
Dropped into a project without those, they render invisible. Adapting to the
existing styling was almost always better than importing an entire second design
system for one button.

**Silent data loss is the worst kind.** Saved progress was being wiped on every
page load, because a save effect ran on mount with empty initial state and
overwrote the restore that was still in flight. Nothing errored. The fix was to
read from storage during state initialization so there is no window where empty
state can be written.

**Animation is a system, not a decoration.** Adding a transition to one element
made the theme switch look broken, because everything else changed instantly.
Consistency across surfaces mattered more than the quality of any single effect.

**Match the effect to the surface.** A spotlight glow that looks great on a pale
card is invisible on a dark one. Two different effects for two themes reads as
intentional. One effect used everywhere reads as a bug in half the cases.

**Discoverability beats cleverness.** Collapsing the toolbar by default cleaned
up the interface and immediately made a useful feature invisible. The fix was not
to undo it but to point at it, which is what the arrow and the magnetic pull are
for.

**Deployment is part of the project.** The site served a blank page for a while
because GitHub Pages was publishing the source branch, where the only script tag
points at a TypeScript file no browser can run. Understanding the difference
between source and built output is not optional.

---

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the production build locally
npm run lint     # oxlint
```

## Feedback collection

The feedback form always keeps a copy in the visitor's own browser under
`grignard_lcta_feedback_v1`. When `VITE_FEEDBACK_ENDPOINT` is set, it also POSTs
each submission to a Google Apps Script web app that appends a row to a private
Google Sheet.

Copy `.env.example` to `.env.local` (gitignored) and set the URL. With it unset,
nothing is transmitted anywhere.

The endpoint is compiled into the client bundle and is therefore public on the
deployed site. It grants write access to the script only, never read access to
the sheet.

## Deployment

GitHub Pages serves the **`main` branch, `/docs` folder**. To publish:

```bash
npm run build
rm -rf docs && cp -r dist docs && touch docs/.nojekyll
git add docs && git commit -m "Publish" && git push
```

`.nojekyll` stops Pages running the output through Jekyll, and `vite.config.ts`
sets `base: './'` so the build works from a subpath. A `gh-pages` branch carries
an identical copy of the build.
