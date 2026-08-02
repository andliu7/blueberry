# Grignard LCTA Master List

An interactive study guide for the Grignard synthesis lab practical, built as a
single-page web app.

**Live site:** https://andliu7.github.io/grignard_LCTA/

> 44 questions, four reading modes, self-rating with saved progress, light and
> dark themes, and a great deal of animation work. React, TypeScript, Vite,
> Tailwind.

**Contents**
[Why this exists](#why-this-exists) ·
[Features](#features) ·
[Every element, in order](#every-element-in-order) ·
[Every animation](#every-animation) ·
[How it was built](#how-it-was-built) ·
[Every bug, and what it turned out to be](#every-bug-and-what-it-turned-out-to-be) ·
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

Much of what follows is a record of those lessons as much as a feature list. The
[bug log](#every-bug-and-what-it-turned-out-to-be) is deliberately the longest
section, because that is where nearly all of the learning actually happened.

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
- Expand All and Collapse All, which merge into one another as they become
  redundant
- Draggable sticky notes that persist between sessions
- Progress saved automatically to the browser

**Four reading modes**, cycled from a single control:

| Mode | Best for |
|---|---|
| **List** | Scanning everything at once (default) |
| **Carousel** | Focused drilling, one question at a time, drag or swipe |
| **Scroll** | Relaxed read-through with cards animating into focus |
| **Stack** | A rolling deck where each card pins in the same place as you scroll |

**Chemistry rendering.** Formulas are written in LaTeX and rendered by MathJax,
so `CaCl_2` and `Mg(OH)X` display properly instead of as raw text.

**Themes.** Dark by default, with a light theme one click away. The choice is
remembered and applied before the first paint.

---

## Every element, in order

This section walks the page from top to bottom, then covers the controls that
float above it. Each entry names the file it lives in.

### 1. Hero title page

`src/components/ui/hero-title.tsx`

A full-viewport opening scene that holds the title alone, so the app introduces
itself before showing 44 cards. It is `sticky`, so the content below scrolls up
over it rather than pushing it away, which gives the transition into the question
list without a scroll library.

- **Left aligned rather than centred.** Centring read as a splash screen; setting
  the title against the left margin, on the same left edge the cards below use,
  made the two halves of the page feel like one document.
- **`variant="art"`** draws faint chemistry line art behind the title.
  `variant="ghost"` is the alternative, kept reachable, which stamps oversized
  translucent words instead.
- **`align`** and the art layout are props, so the arrangement is data rather
  than markup.
- A small **scroll cue** sits under the subtitle rather than centred on the
  viewport, so it belongs to the title block instead of floating loose.

### 2. Reaction line art

`src/data/testimonialArt.ts`

Every illustration in the project is a hand-written SVG stored as a data URI, so
the cards render offline, on GitHub Pages, and with no request that can 404 out
from under the layout. There are eight motifs: an Erlenmeyer flask, a benzene
ring, a reflux condenser, a separatory funnel, an IR trace, an NMR spectrum, the
reaction itself, and a smiling flask mascot.

`motifMarkup()` swaps the baked-in white for a caller-supplied colour, because
the cards draw these on a saturated wash where white reads well, while the hero
draws them on pale paper where white would be invisible.

The reaction motif went through several rounds:

1. A benzene ring, which had nothing to do with a carbonyl addition.
2. A Grignard attacking a carbonyl, with R groups.
3. R groups replaced by methyl dashes, arrows redrawn as a hemisphere into the
   oxygen, and cartoon faces added to the carbon and oxygen.
4. Faces removed, because they pulled the eye away from the reaction. The circles
   that held them went too, since they were reading as atoms that are not there.
5. Cut back to just the two reagents. Curly arrows, partial charges and lone
   pairs all competed with the title in a backdrop meant to be read at a glance.
6. Carbonyl geometry corrected to proper trigonal planar, with substituents 120
   degrees off the C=O rather than one hanging straight down, and each fragment
   given its own small rotation so the two read as drifting past one another.

### 3. Sticky header toolbar

`src/App.tsx`, `src/components/ui/floating-action-button.tsx`

A single rounded pill, modelled on the header in a notes app: a compact strip of
status and controls that stays put while everything scrolls beneath it.

- **Progress cluster:** three coloured dots with counts, an `n / 44 reviewed`
  readout, and a progress bar along the bottom edge.
- **Show filter:** All or Needs Review.
- **Order select:** Number, Hardest first, Easiest first.
- **Expandable tool cluster** on the right, holding Expand All, Collapse All,
  Shuffle, the view-mode cycler, Jump to bottom, and Hold to reset.
- **Theme toggle** pinned to the far right.

The cluster's actions drop into an **overlay panel** below the header rather than
laying out inline. This is deliberate: an inline row changed the header's height
when it opened, which shoved the whole page down. The panel floats, so the header
stays a fixed 82px whatever the state.

### 4. Question cards

`src/components/QuestionCard.tsx`

One card definition serves all four view modes. A card is a button that toggles
its own answer, a status colour drawn from the rating, and a rating row.

- Multiple choice options highlight green or red the moment one is chosen, and
  the written explanation appears underneath afterwards.
- Cards get a **spotlight glow in light mode** and a **3D tilt in dark mode**.
  This is not decoration for its own sake: a soft indigo glow reads beautifully
  on pale paper and vanishes entirely on a near-black card, so the dark theme
  needed a different effect rather than the same one dimmed.
- Open state is owned by the parent, not the card, which is what makes Expand All
  possible at all.

### 5. The four view modes

| Mode | File | Mechanism |
|---|---|---|
| List | `src/App.tsx` | Plain column |
| Carousel | `src/components/ui/snap-carousel.tsx` | Drag, swipe, arrows, dots |
| Scroll | `src/components/ui/scroll-tilted-grid.tsx` | Scroll-linked blur, depth, tilt |
| Stack | `src/components/ui/stacked-cards.tsx` | Rolling sticky deck |

**Carousel** supports mouse drag and touch swipe, with arrows and a counter below
and dots above. With 44 questions a full dot strip ran about 700px wide and was
useless, so the dots are windowed to four either side of the current one, scaling
and fading toward the edges. The track edges are masked so neighbouring cards
peek rather than being cut off.

**Scroll** drives each card's blur, opacity, depth and tilt from its own position
in the viewport, so cards resolve into focus as they arrive and soften as they
leave.

**Stack** pins every card at the same line near the top of the viewport, so the
newest card is always in the same place. As the next one rides up over it, the
cards already stacked recede ten pixels each, and the one that has fallen five
places back fades out. The visible deck is therefore always about five cards
deep, wherever you are in the list, and the whole deck releases together at the
bottom and scrolls away into the testimonials.

Its pin points are **measured rather than assumed**, which is the whole trick.
See the [bug log](#every-bug-and-what-it-turned-out-to-be) for why the obvious
version does not work.

### 6. Testimonial fan

`src/components/ui/card-fan-carousel.tsx`, `src/App.tsx`

A 3D fan of illustrated cards built with GSAP, advancing on its own, pausing on
hover, and stopping for good once you take control. The active card's quote is
rendered below it in a `figure` and `blockquote` with an avatar, name and role.

An oversized serif quote mark sits on the card's top border, cut in half by it,
so it reads as popping out of the edge. It is a sibling of the tilt wrapper
rather than a child, because that wrapper clips with `overflow-hidden` and would
otherwise slice off everything above the edge.

### 7. Footer

`src/App.tsx`

A closing message, a reminder line, and a GitHub link whose underline sweeps in
as a gradient while its arrow flies outward.

### 8. Floating controls

| Control | File | What it does |
|---|---|---|
| Sticky notes | `src/components/StickyNote.tsx` | A scratch pad you can drag anywhere on the page. Position and open state persist separately from study progress |
| Feedback | `src/components/ui/feedback-widget.tsx` | A form that saves locally and optionally POSTs to a private Google Sheet |
| Scroll to top | `src/components/ui/scroll-to-top.tsx` | Appears past the last card |
| Liquid glass | `src/components/ui/liquid-glass-button.tsx` | Layered highlight and refraction, used on the feedback button only |

---

## Every animation

Grouped by what drives them.

### Pointer-driven

| Effect | Where | How |
|---|---|---|
| **Magnetic pull** | `+` toolbar toggle | The button drifts toward the cursor on a spring, released when the pointer leaves |
| **Spotlight** | Cards, light mode | A radial indigo gradient tracks the cursor across the card |
| **3D tilt** | Cards in dark mode, testimonial quote in both | Rotation on two axes from cursor offset, sprung, with a glare sweep. The glare is white on dark cards and indigo on pale ones, since white washes out on paper |
| **Expanding pills** | Every toolbar action | A 36px circle widens into a labelled pill on hover, the icon scaling to zero as the label scales in behind a 150ms delay, with a 45 degree gradient fill and a blurred glow beneath |
| **Press depth** | Rating buttons | The button depresses and tilts toward the exact point you clicked |
| **Link sweep** | Footer GitHub link | A gradient underline draws in while the arrow flies out along the diagonal |
| **Title hover** | Hero title | Each letter scales, lifts and thickens in a staggered wave |

### Click-driven

| Effect | Where | How |
|---|---|---|
| **Particle burst** | `+` toggle and the view-mode button | Fourteen glowing dots thrown outward in a full circle, portaled to `document.body` |
| **Idle sparkle** | `+` toggle | A gentler five-dot burst every 2.8 seconds, retiring permanently after the first click |
| **Gooey droplet merge** | Expand All and Collapse All | Described below |
| **Toolbar unfurl** | Tool cluster | Actions scale and blur out of the trigger, staggered 45ms apart, the one nearest the trigger leading so the row unfurls outward |
| **Trigger rotation** | `+` toggle | Springs 45 degrees into an `×` |
| **Theme morph** | Theme toggle | A sun morphs into a crescent moon, the crescent carved by an animated SVG mask |
| **Theme crossfade** | Whole page | Every surface transitions together for 260ms |
| **Hold to reset** | Reset button | Requires a 1.2 second hold with a fill showing progress. Releasing early cancels |
| **Confetti** | On completion | Fires once when all 44 questions have been reviewed |

### Scroll-driven

| Effect | Where | How |
|---|---|---|
| **Hero hand-off** | Title page | The hero is sticky, so the content below rides up over it |
| **Card choreography** | Scroll mode | Blur, opacity, depth and tilt all interpolated from each card's viewport position |
| **Rolling stack** | Stack mode | Every card's depth in the deck comes from one shared motion value: the continuous index of the card currently arriving at the pin line |
| **Scroll to top** | Bottom of page | Fades in past the last card |

### The gooey droplet merge

`src/components/ui/gooey-toggle-pair.tsx`

Expand All and Collapse All are not always both useful. When every card is
already open, Expand All does nothing. Rather than grey it out, it dissolves into
its sibling like a droplet being absorbed, and separates back out when the state
becomes mixed again.

Three things make it work:

1. **Visibility is derived from the cards, never from the buttons.** Opening the
   last collapsed card by hand retires Expand All exactly as clicking it would,
   and changing the filter can change which cards count with neither button
   touched. All three states (`expand`, `collapse`, `both`) are computed from the
   open map every render.
2. **An SVG gooey filter** over the pair. Blurring both shapes and then hard
   thresholding the alpha channel makes their edges fuse as they approach, and
   `feComposite atop` lays the untouched original back over the blob so labels
   and icons stay crisp.
3. **Choreography.** The exiting button springs toward its sibling while scaling
   through 0.55 to zero, staying opaque most of the way across so the filter has
   two solid shapes to fuse. The survivor gets a jelly squash, scaling through
   1.15, 0.95 and 1.03, delayed 300ms so it lands as the droplet arrives.

The filter is only worn during the merge. Left on permanently it fuses the two
resting buttons into a single peanut, because an 8px gap is well inside a 5px
blur radius.

The fallbacks are real, not decorative. Safari and iOS Chrome render SVG filters
over HTML unreliably and stutter on animated blur, so they get a plain elastic
shrink. `prefers-reduced-motion` skips the choreography entirely. And if the
focused button is the one animating out, focus moves to the survivor rather than
falling to the body.

---

## How it was built

### React

**State placement decides what is possible.** Question cards originally owned
their own open and closed state, which made Expand All impossible to build.
Lifting that state into a parent map made the feature trivial, and later made the
gooey merge possible for free, since button visibility is just a function of that
same map. The multiple choice selection stayed behind and quietly broke Reset,
which is the same lesson arriving a third time: state that any other control
needs to read or clear does not belong inside the component that displays it. The same applied to the toolbar: once the parent knew it was open, it
could lay the filter hint out beside it.

**Controlled and uncontrolled components.** Several components take an optional
value prop and fall back to internal state when it is missing, so the same
component works standalone or driven by a parent.

**Dependency arrays are not a formality.** A carousel bug traced back to an array
rebuilt on every render, which changed a callback's identity, which re-ran an
effect constantly and left an animation lock stuck on. Memoizing the array fixed
it.

**Keys are identity, not labels.** Keying a list by a title that changes on click
tells React the element was replaced, and it throws away everything the old one
was doing.

**Refs for things React does not own.** GSAP animation, MathJax typesetting, and
scroll measurement all reach into real DOM nodes.

**One observer, not forty-four.** A hook that reads the dark class started out
creating a `MutationObserver` per card. It is now a shared singleton that every
consumer subscribes to.

### TypeScript

Types caught real mistakes, especially around optional props. Turning the view
mode from a boolean into a union of four string literals made it impossible to be
in two modes at once, removing a whole class of bug at compile time rather than
through testing.

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
portaled to `document.body` to land in the right place. A `filter` does the same
thing.

**Sticky is constrained by its parent.** A sticky element cannot outlive its
parent's content box, which is why the stack needs a trailing spacer: without
one, the last card would unpin at the exact moment it pinned.

**Custom CSS** covers the paper grid background, three display typefaces, the
card-fan geometry, and the theme crossfade.

### HTML and accessibility

Semantic structure got real attention: `figure` and `blockquote` for
testimonials, `aria-expanded` on collapsible cards, `aria-pressed` on toggles,
labels on every icon-only button, `aria-live` on the feedback panel, and
screen-reader text behind decorative letter animations. Buttons that animate away
are removed from the tab order rather than merely hidden, and focus is moved
deliberately when that happens.

The theme is applied by a small inline script in `index.html` that runs before
first paint. Doing it in React instead means a flash of the wrong theme on every
load. It reads a stored choice and otherwise defaults to dark. The operating
system preference is deliberately not consulted, so the first impression is the
same for everyone.

### Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion, GSAP, MathJax 3, and
lucide-react. **No dependency was added at any point during the interface work.**
Every component described here was either written from scratch or adapted onto
what was already installed.

---

## Every bug, and what it turned out to be

The symptom is almost never the cause. That is the through line of this section.

### Silent data loss

**Saved progress was wiped on every page load.** A save effect ran on mount with
empty initial state and overwrote the restore that was still in flight. Nothing
errored, nothing logged. The first fix, a `loaded` ref guard, did not work
either: the load effect set the flag before the save effect ran in the same
commit, so the guard was already open. React StrictMode's double mount made the
loss permanent rather than intermittent. The real fix was to read from storage
inside the `useState` initialisers, which removes the window entirely rather than
trying to police it.

### State in the wrong place

**Hold to reset cleared everything except the multiple choice answer.** Ratings,
notes and open cards all reset; the chosen option stayed highlighted green or
red. The chosen option was the one piece of card state still living inside
`QuestionCard`, so `doReset` had no way to reach it. Lifting it into a map beside
`openMap` fixed it, and is the third time this exact shape of bug has appeared:
Expand All was impossible for the same reason, and the gooey merge only works
because that state had already been lifted.

Worth noting the small trap in the fix. The controlled and uncontrolled fallback
cannot be `selectedProp ?? internal`, because `null` is the meaningful "nothing
chosen yet" value and `??` would swallow it. Only an *absent* prop should fall
through, so the check is `!== undefined`.

### Things that rendered but did nothing

Several components looked correct in the browser and were completely inert:

- A **particle button** that swallowed the caller's `onClick`, so the burst fired
  and the actual action never ran.
- A **hold-and-release button** that never fired on completion.
- A **bold-on-hover** effect animating a variable font axis the font does not
  have. Measuring a single character showed it was **25.59px wide at weight 700
  and 25.59px wide at weight 900**. The fix was to add scale and lift, which read
  on any font.
- A **liquid glass** effect built on `backdrop-filter: url(#...)`, which Chrome
  ignores outright.
- A **magnetic button** holding a document-level pointer listener for its entire
  lifetime rather than only while hovered.
- The **card fan** had no `.fan-card` CSS at all, so the cards had zero height
  and were invisible.

### Layout and positioning

**Particles were invisible.** They were rendered inside the magnetic wrapper, and
a transformed ancestor becomes the containing block for `position: fixed`, so
"fixed to the viewport" meant "fixed to a 36px button". Portaling to
`document.body` fixed it.

**Particles on the view button did not fire at all**, while the identical code on
the toolbar trigger emitted 28 particles. A differential test isolated it: the
list was keyed by `item.title`, and the view button relabels itself on click, so
React unmounted and remounted it, discarding the burst state before it could
render. Keying by position fixed it.

**Notes and Feedback were thrown off screen.** Measuring put the Feedback button
at x = -128, y = 5168. The cause was `fixed` and `relative` on the same element,
added while layering glass effects.

**The sticky notes could not be moved.** The drag constraints were all `>= 0` and
were measured from the element's own position, so a panel anchored bottom-right
was only permitted to travel further right and further down, both already off
screen. Replaced with a viewport-sized bounds container.

**The toolbar trigger snapped left when closing.** The wrapper reverted to
`display: contents` while the buttons were still mid-exit, overfilling the first
row. Giving the cluster a permanent row helped; moving the actions into a
floating overlay panel fixed it properly, since the header's height then never
changes.

**The even-count fan was asymmetric**, because slot positions were computed with
`totalCards >> 1` instead of `(totalCards - 1) / 2`.

### Rendering and performance

**Expand All froze the tab.** Each card triggered a full-document MathJax pass,
so opening all 44 ran 44 whole-page typesets. Scoping each typeset to that card's
own subtree fixed it.

**Raw LaTeX appeared in cards**, showing `$\approx 0.71\ g/mL$` as literal text.
Instrumenting `typesetPromise` showed it reporting success (`done, mjx: 2`) while
the same card queried a moment later had zero rendered nodes. React was restoring
its `dangerouslySetInnerHTML` value over MathJax's output, since MathJax mutates
DOM React believes it owns. The fix was a small `MathHtml` component that writes
`innerHTML` in an effect and hands the node to MathJax, so React never fights it.

**The carousel rendered 44 dots** in a strip about 700px wide. Windowed to nine
with a scale and opacity fade toward the edges.

### The stack

**The stack gathered five cards and then dumped all five at once**, over and
over. Two causes compounded:

1. Sticky offsets were assigned `(index % depth) * peek`, so card 5 landed at the
   same offset card 0 had, and the deck appeared to reset rather than roll.
2. More fundamentally, the maths assumed every card owned an equal slice of the
   container's scroll progress, while the actual layout gave each card a slot the
   size of its own height. Measuring found **two distinct slot heights**, so the
   arithmetic was out of step with the layout from the first card onward.

The rewrite fixes both. Every card now pins at the same line and derives its
depth from one shared value: the continuous index of the card currently arriving.
That index is computed by binary searching **measured** pin points, so a card
that has been expanded gets scroll room proportional to its real height. Cards
recede rather than march down the page, and only the one falling out the back
fades.

Measuring pin points has its own trap: a sticky wrapper's own rectangle reports
where it is parked, not where it belongs. Each card therefore gets a zero-height
marker sibling in normal flow, which never moves, and that is what gets measured.

**The stack caught at the bottom** on the way back up, from a 40vh tail of empty
space. The tail is now 24vh, which is enough for the last card to hold for a beat
before the whole deck releases, and leaves about 109px before the testimonials
begin.

### Typography and theming

**The theme swap was staggered.** The header changed a fraction of a second
before the rest of the page, because `body` had a 250ms transition and everything
else snapped. A `.theme-transition` class applied for 260ms during the swap made
every surface move together.

**The dark toggle did nothing at all** until `@custom-variant dark` was declared,
because Tailwind v4 binds `dark:` to the OS preference by default.

**The quote mark floated clear of the card** instead of straddling its border.
`-translate-y-1/2` centres the *line box*, but a quote glyph's ink sits high
within it. Measuring the actual rendered font gave the numbers: in a 72px line
box the ink occupies rows 7 to 26, so centring the box left the glyph about 19px
clear of the border. Offsetting by 0.23em instead puts the ink itself on the
border, verified at 9.6px above and 9.4px below.

**The gooey filter fused the resting buttons** into a single peanut when left on
permanently, since the 8px gap between them is well inside a 5px blur radius. It
is now applied only for the 900ms of the merge, which has the pleasant side
effect of adding a beat of liquid tension right before the buttons move.

### Infrastructure

**GitHub Pages served the raw source** for a while, showing a blank page. Pages
was publishing from `main` at `/docs`, and `docs/` had been deleted during an
unrelated cleanup. A source branch has exactly one script tag, pointing at a
TypeScript file no browser can execute.

**The Apps Script endpoint returned null** from `getActiveSpreadsheet()`, because
it was a standalone script rather than one bound to the spreadsheet. Switching to
`openById` fixed it.

**A commit message ate a word**, because backticks inside a double-quoted bash
string are command substitution. Heredocs since.

### The testing environment itself

The browser tab used for verification reported `visibilityState: "hidden"`, which
freezes `requestAnimationFrame` and throttles timers to roughly one tick per
second. Scroll-linked and spring animation simply does not run under those
conditions, and reading the DOM mid-animation returns whatever the last frame
happened to be.

This produced repeated false negatives before it was understood. The working rule
that came out of it: **structure, geometry and DOM state are verifiable there;
motion is not.** Where an animation could not be observed, the underlying maths
was verified instead by replaying the same formula against real measured DOM
geometry, which is how the rolling stack was checked.

---

## Takeaways

**A component that renders is not a component that works.** Half a dozen drop-in
components looked right and did nothing at all: an effect animating a font axis
the font did not have, a glare built on a CSS variable that was never defined, a
button that ignored the click handler passed to it. Rendering proves layout, not
behaviour.

**Check the surrounding assumptions before pasting code in.** Almost every
supplied component assumed a shadcn project, built on tokens like `--foreground`
and `--primary` inside `color-mix()`, which this project never defines. They
would all have rendered invisible. Adapting each one to the existing styling beat
importing a second design system for one button, and the project finished the
entire interface without adding a single dependency.

**Say no to the thing that would fight your architecture.** Two supplied
components wanted `lenis`, which replaces the page's native scrolling globally.
This app already runs three independent scroll-driven systems. Taking the
mechanic and leaving the dependency got the same result without the class of bug
that had already cost the most time.

**Silent data loss is the worst kind.** Nothing errored when saved progress was
destroyed on every load. The lesson is not "be careful with effects" but
something sharper: prefer designs where the bad state is unrepresentable. Reading
from storage during state initialisation does not police the race, it deletes it.

**Derive state, do not mirror it.** The gooey merge works because button
visibility is computed from the cards every render. Had it been a `useState`
updated in the click handlers, expanding the last card by hand would have left
the interface lying about itself.

**Measure instead of assuming, and measure the real thing.** The stack broke
because the maths assumed uniform card heights the layout never had. The quote
mark floated because the code centred a line box when the ink is what matters.
Both were solved in minutes once something got measured rather than reasoned
about.

**Symptoms point away from causes.** Invisible particles were a containing-block
rule. A dead click handler was a React key. A missing hover effect was a font
without a bold axis. Every one of them was found by testing the difference
between the working case and the broken one, rather than by rereading the code
that looked wrong.

**Animation is a system, not a decoration.** Adding a transition to one element
made theme switching look broken, because everything else still snapped.
Consistency mattered more than the quality of any single effect.

**Effects should be theme-aware, not theme-agnostic.** A spotlight glow that
reads beautifully on paper is invisible on near-black. Dark mode got a tilt
instead. Reusing one effect everywhere would have been less code and a worse
result.

**Discoverability beats cleverness.** Collapsing the toolbar by default tidied
the interface and instantly hid a useful feature. The fix was not to undo it but
to point at it, which is what the arrow, the magnetic pull and the intermittent
sparkle are for. The sparkle stops permanently after the first click, because a
hint that keeps nagging after it has been taken is just noise.

**Know what your tools cannot tell you.** A hidden browser tab cannot verify
animation. Recognising that turned a string of confusing false negatives into a
clear rule about which claims the environment can and cannot support.

**Deployment is part of the project.** The site served a blank page for a while
because Pages was publishing the source branch, where the only script tag points
at a TypeScript file no browser can run.

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
