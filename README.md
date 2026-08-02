# Grignard LCTA Master List

An interactive study guide for the Grignard synthesis lab practical, built as a
single-page web app.

**Live site:** https://andliu7.github.io/grignard_LCTA/

> 44 questions, three reading modes, self-rating with saved progress, light and
> dark themes, and a pile of animation work. React, TypeScript, Vite, Tailwind.

**Contents**
[Why this exists](#why-this-exists) ·
[Features](#features) ·
[Animations](#animations-and-interactions) ·
[How it was built](#how-it-was-built) ·
[Takeaways](#takeaways) ·
[Development](#development) ·
[Deployment](#deployment)

---

## Why this exists

### Studying the LCTA anywhere

All 44 questions live in one page that loads fast and works on a phone. Answers
stay hidden until you ask for them, so you can quiz yourself on the bus, in the
car, or in the ten minutes before walking into lab.

Ratings and notes save automatically, so you pick up where you left off. The
Needs Review filter narrows the set to whatever you have not locked in yet, which
means a short session is still a useful one.

The question set and the features around it came out of talking to classmates
about what they actually wanted while revising. The Needs Review filter, the
shuffle, and the carousel all exist because people asked for them.

### Learning web development and UI/UX

Every feature was also an excuse to learn something concrete: how state flows
through a React tree, how scroll-linked animation works, how to build a dark
theme that is not an afterthought, and how to tell an effect that helps from one
that gets in the way.

Much of what follows is a record of those lessons as much as a feature list.

---

## Features

**Studying**

- 44 questions covering the full experiment, from oven-drying glassware through
  extraction, washing, drying, and IR and NMR interpretation
- Expandable answers, so you can test yourself before revealing
- Multiple choice with instant right and wrong feedback
- Self-rating: mark each question Review, Almost, or Got It, tracked by a counter
  and progress bar
- Needs Review filter hides anything already marked green
- Sort by question number, hardest first, or easiest first
- Shuffle and unshuffle with one button
- Expand All and Collapse All
- Draggable sticky notes that persist between sessions
- Progress saved automatically to the browser

**Three reading modes**, cycled from a single control:

| Mode | Best for |
|---|---|
| **List** | Scanning everything at once (default) |
| **Carousel** | Focused drilling, one question at a time |
| **Scroll** | Relaxed read-through with cards animating into focus |

**Chemistry rendering.** Formulas are written in LaTeX and rendered by MathJax,
so `CaCl_2` and `Mg(OH)X` display properly instead of as raw text.

---

## Animations and interactions

Most of the learning happened here.

| Feature | What it does |
|---|---|
| **Magnetic toolbar button** | The `+` toggle drifts toward your cursor, pulled by a spring |
| **Particle burst** | Clicking `+` throws fourteen glowing dots outward in a full circle |
| **Click here hint** | A handwritten label and bouncing curved arrow point at `+` while the toolbar is collapsed |
| **Expanding pill buttons** | Circular buttons widen into labelled pills on hover, gradient sweeping in |
| **Fanned testimonial cards** | Chemistry illustrations in a 3D fan built with GSAP, leaning and lifting on hover |
| **Autoplay carousel** | The fan advances itself, pauses on hover, and stops for good once you take control |
| **Spotlight cards** | Light mode: a soft indigo glow follows your cursor across each card |
| **3D tilt cards** | Dark mode: cards lean in three dimensions with a spring, plus a glare sweep |
| **Scroll choreography** | Scroll view drives each card's blur, opacity, depth, and tilt from its scroll position |
| **Animated theme toggle** | A sun morphs into a crescent moon, with an SVG mask carving the crescent |
| **Title hover** | Each letter scales, lifts, and thickens in a staggered wave |
| **Hold to reset** | Requires a 1.2 second hold, with a fill showing progress. Releasing early cancels |
| **Press depth buttons** | Rating buttons depress and tilt toward where you clicked |
| **Confetti** | Fires once when all 44 questions are reviewed |
| **Theme crossfade** | Every surface transitions together over 220ms instead of snapping |
| **Link underline sweep** | The footer link draws a gradient underline while its arrow flies outward |

Two effects are deliberately theme-specific. A spotlight glow reads well on pale
cards and vanishes on dark ones, so dark mode gets the tilt instead.

---

## How it was built

### React

**State placement decides what is possible.** Question cards originally owned
their own open and closed state, which made Expand All impossible to build.
Lifting that state to the parent made the feature trivial. The same applied to
the toolbar: once the parent knew it was open, it could lay the filter hint out
beside it.

**Controlled and uncontrolled components.** Several components take an optional
value prop and fall back to internal state when it is missing, so the same
component works standalone or driven by a parent.

**Dependency arrays are not a formality.** A carousel bug traced back to an array
rebuilt on every render, which changed a callback's identity, which re-ran an
effect constantly and left an animation lock stuck on. Memoizing the array fixed
it.

**Refs for things React does not own.** GSAP animation, MathJax typesetting, and
scroll measurement all reach into real DOM nodes.

### TypeScript

Types caught real mistakes, especially around optional props. Turning the view
mode from a boolean into the union `"list" | "carousel" | "scroll"` made it
impossible to be in two modes at once, removing a whole class of bug at compile
time rather than through testing.

Components brought in from outside often had loose typing that hid problems, such
as a timer id force-cast into a ref typed as `null`. Tightening those surfaced
genuine issues.

### CSS and Tailwind

**Tailwind v4 changed dark mode.** It maps `dark:` to the operating system
preference by default, so class-based theming needs an explicit
`@custom-variant dark` declaration. Without it a theme toggle appears to do
nothing at all.

**Conflicting utilities break silently.** Putting `fixed` and `relative` on the
same element depends on stylesheet order to decide the winner. This shipped once
and threw two floating buttons off screen.

**Transforms have side effects.** A transformed ancestor becomes the containing
block for `position: fixed` children, which is why the particle burst had to be
portaled to `document.body` to land in the right place.

**Custom CSS** covers the paper grid background, three display typefaces, the
card-fan geometry, and the theme crossfade.

### HTML

Semantic structure and accessibility got real attention: `figure` and
`blockquote` for testimonials, `aria-expanded` on collapsible cards,
`aria-pressed` on toggles, labels on every icon-only button, `aria-live` on the
feedback panel, and screen-reader text behind decorative letter animations.

The theme is applied by a small inline script in `index.html` that runs before
first paint. Doing it in React instead means dark-mode users see a flash of white
on every load.

### Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion, GSAP, MathJax 3, and
lucide-react.

---

## Takeaways

**A component that renders is not a component that works.** Several drop-in
components looked right and did nothing: an effect animating a font axis the font
did not have, a glare built on a CSS variable that was never defined, a button
that ignored the click handler passed to it.

**Check the surrounding assumptions before pasting code in.** Most components
assumed theme tokens like `bg-primary` that this project never defined, so they
rendered invisible. Adapting to the existing styling beat importing a second
design system for one button.

**Silent data loss is the worst kind.** Saved progress was wiped on every page
load, because a save effect ran on mount with empty state and overwrote the
restore still in flight. Nothing errored. Reading from storage during state
initialization removed the window entirely.

**Animation is a system, not a decoration.** Adding a transition to one element
made theme switching look broken, because everything else still snapped.
Consistency mattered more than the quality of any single effect.

**Discoverability beats cleverness.** Collapsing the toolbar by default tidied
the interface and instantly hid a useful feature. The fix was not to undo it but
to point at it, which is what the arrow and the magnetic pull are for.

**Deployment is part of the project.** The site served a blank page for a while
because GitHub Pages was publishing the source branch, where the only script tag
points at a TypeScript file no browser can run.

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

The feedback form always keeps a copy in the visitor's browser under
`grignard_lcta_feedback_v1`. When `VITE_FEEDBACK_ENDPOINT` is set, it also POSTs
each submission to a Google Apps Script web app that appends a row to a private
Google Sheet.

Copy `.env.example` to `.env.local` (gitignored) and set the URL. With it unset,
nothing is transmitted anywhere.

The endpoint is compiled into the client bundle and is therefore public on the
deployed site. It grants write access to the script only, never read access to
the sheet.

## Deployment

GitHub Pages serves the **`main` branch, `/docs` folder**:

```bash
npm run build
rm -rf docs && cp -r dist docs && touch docs/.nojekyll
git add docs && git commit -m "Publish" && git push
```

`.nojekyll` stops Pages running the output through Jekyll, and `vite.config.ts`
sets `base: './'` so the build works from a subpath. A `gh-pages` branch carries
an identical copy.
