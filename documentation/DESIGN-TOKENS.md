# Design tokens, inherited from Blueberry

Extracted from `andliu7/blueberry`, chiefly `src/index.css` and `src/components/ui/*`. This app is
a sibling, not a fork, so it re-declares these rather than importing them. Keep them in sync by
hand and note any divergence here with a reason.

The point is that a student who uses Blueberry and then opens Mechanisms should not feel they
changed products.

## Color

**THE LAVENDER TURN IS ITSELF SUPERSEDED, 2026-09-01, by the warm cream regime; see the
Supersession entry at the end of this file. The block below stands as the record of what it
was and why it moved.**

**THE LAVENDER TURN, recorded here 2026-09-01 by the S3 design pass, and it supersedes the
divergence paragraph below.** The paragraph below says cream ground, purple led, roughly the
`#7c3aed` to `#8b5cf6` range as the working centre. That is not what `apps/web/src/theme.css`
has shipped since 2026-08-29. This file is named as authoritative for what Blueberry may look
like, so the two disagreeing about the app's ground colour is a defect in the record, and
CLAUDE.md's own rule is that the record moves in the same turn as the change. It did not. It
does now.

What actually ships, measured in `theme.css` and re-measured by
`apps/web/measurements/contrast-audit.mjs` on the built app:

| Token | Was, in the table below | Ships |
|---|---|---|
| `--background` light | `#f6f4ef` cream | `#a3aee2` lavender |
| `--card` light | `#ffffff` | `#fbf3e6` warm cream |
| `--foreground` light | `#1e293b` | `#2a2a42` |
| `--primary` light | `#0f172a`, then `#7c3aed` per the divergence | `#3f4286` deep navy |
| `--background` dark | `#0c0a09` stone-950 | `#171a2e` indigo night |
| `--card` dark | `#1c1917` stone-900 | `#232741`, which LIFTS off the ground |

Three consequences worth carrying, because they are structural rather than cosmetic:

- **A cream card on the lavender ground is 1.96:1, so every card carries a border.** That is
  sticker rule 3 arriving by arithmetic. `--border` `#55597f` is derived to clear 3:1 against
  both surfaces it separates: 6.11:1 on the card, 3.11:1 on the ground.
- **`--muted-foreground` is `#394153`, not slate-600.** Slate-600 measures 3.50:1 on the
  lavender ground, under the 4.5:1 body floor. `#394153` is 4.73:1 on the ground and 9.28:1 on
  the card. That 4.73 is the thinnest margin in the app and it is the whole reason body copy
  belongs on a card rather than on the bare ground wherever there is a choice.
- **`--primary` left `#7c3aed` because that hex was also the mascot's cape** in
  `MASCOT_PALETTE`, and the sticker audit's rule 9 was failing 247 rows on that one collision.
  It is 0 now without anyone having to rule on which palette owns the hex.

**THE PROVENANCE CANNOT BE VERIFIED IN THIS REPOSITORY, and that is an owner item, not a
builder's.** `theme.css` cites "five approved concept images (blueberry_reaction-deck-swipe,
-card-faces, blueberry_pathway-hand, -lesson-hand, -reward-hand)" and samples modal pixels
from them. Those files are not in `docs/reference/`, which holds only `alchemie/` and
`competitors/`, and a repository wide search for those names returns nothing. CLAUDE.md's bar
rule is explicit that a critic which cannot open its reference reports that and stops rather
than reconstructing it from a description, so no critic can check the sampled values against
the source they claim. Two ways to close it, and both are the owner's call: commit the five
images to `docs/reference/` so the sampling is checkable, or record that the palette is an
owner direction taken without a committed reference. The S3 pass did not revert anything on
its own judgement, because a builder reverting a recorded owner direction on a missing file is
the worse of the two errors.


**OWNER DIVERGENCE, recorded 2026-08-20, and it wins over everything below.** The app is LIGHT MODE
FIRST. The inherited Blueberry default of dark-unless-stored-light is reversed: default light, dark
available as a choice. The palette moves toward Duolingo's brightness and saturation but purple led
rather than green led: the primary is the purple family the existing indigo accent already points
toward, roughly the #7c3aed to #8b5cf6 violet range as the working centre, with the indigo to
fuchsia gradient kept as its natural companion. Cream and stone stay as the warm neutral ground so
the sibling app is still recognisable. Exact values are set in Phase 4 and run through the contrast
gate like everything else; what is fixed now is light first, purple led, Duolingo bright.

The pre-paint theme script still ships, with its default flipped. The reason it exists, no flash of
wrong theme, is unchanged.

### Inherited palette, now the DARK variant and the source of the neutrals


Class-based dark mode, not `prefers-color-scheme`. Tailwind v4 variant is repointed with
`@custom-variant dark (&:where(.dark, .dark *));`. An inline script in `index.html` runs pre-paint,
reads `localStorage['theme']`, and toggles `.dark` on `<html>`, defaulting to dark unless the
stored value is explicitly `"light"`. Copy that script or you will ship a flash of wrong theme.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f6f4ef` cream | `#0c0a09` stone-950 |
| `--foreground` | `#1e293b` slate-800 | `#e7e5e4` stone-200 |
| `--card`, `--popover` | `#ffffff` | `#1c1917` stone-900 |
| `--card-foreground` | `#0f172a` | `#f5f5f4` |
| `--primary` | `#0f172a` | `#f5f5f4` |
| `--primary-foreground` | `#ffffff` | `#1c1917` |
| `--secondary`, `--muted`, `--accent` | `#f1f5f9` slate-100 | `#292524` stone-800 |
| `--muted-foreground` | `#64748b` slate-500 | `#a8a29e` stone-400 |
| `--destructive` | `#e11d48` rose-600 | `#f43f5e` rose-500 |
| `--border`, `--input` | `#e2e8f0` slate-200 | `#44403c` stone-700 |
| `--ring` | `#818cf8` indigo-400 | `#818cf8` |

Accent gradient, used for sheen borders and glow: `#6366f1` indigo-500 to `#d946ef` fuchsia-500.
Blueberry mark gradient: `#bdefff` to `#3fa9ff` to `#3d63f5` to `#2b2fb0`.

Body carries a 28 by 28 px hairline grid, `rgba(15,23,42,0.025)` light and
`rgba(255,255,255,0.035)` dark. That 28 px is the app's soft spatial unit.

**Gap closed, 2026-08-27.** The success and non-binary outcome tokens exist in `theme.css`:
`--good` / `--good-ink` / `--good-soft`, `--alt-route`, `--not-requested`, and the warning family
`--warn` / `--warn-soft-solid` / `--warn-ink-strong`. None of them is red.

**The contrast gate is a script now: `apps/web/measurements/contrast-audit.mjs`.**

Run it after `npm run build`. It walks the BUILT app on every tab in both themes and measures every
composed pair the browser actually drew, rather than the pairs this table declares. That distinction
is the whole point: this table was right about the charge chip and the component drew a literal
`#ffffff` anyway, so a token table cannot be the gate. It exits nonzero on any pair under its floor.

Floors are WCAG 2.1: 4.5 for body text, 3.0 for large text and for graphics and interface
components under 1.4.11. Two rules in it are worth knowing before reading its output:

- **A shape is one component.** A shape's fill and its boundary collapse to the better of the two,
  because 1.4.11 asks whether a component is identifiable, not whether every colour in it clears the
  floor. `--bond-joint` is why: it must stay lighter than the rod it sits on, so no fill value can
  also clear a near white ground, and `--bond-joint-ring` in the rod's colour is what identifies it
- **What it cannot resolve, it refuses to score.** A mark sitting on another mark rather than on a
  styled box is reported UNRESOLVED and listed for a person, never counted either way. 175 marks are
  in that bucket today, nearly all of them mascot internals, where a white specular highlight is
  inside an illustration and is not an interface component at all

**Six failures it found on its first run, all fixed, each recorded with its reason in `theme.css`:**

| Token | Was | Now | Why |
|---|---|---|---|
| `--bond-stroke` light | `#8e9aab`, 2.37:1 | `#75839a`, 3.19:1 | A bond is the object a student grabs |
| `--bond-joint` light | `#c8d0da`, 1.29:1 | `#eef2f6` plus `--bond-joint-ring` | The ring carries it; see above |
| `--scene-faint` dark | alpha 0.55, 2.80:1 | alpha 0.72, 3.4:1 | The light half had been raised by hand; the dark half was missed |
| `--diamond` light | `#0ea5e9`, 2.77:1 | `#0284c7`, 4.10:1 | An icon that carries meaning |
| `--primary` dark | `#8b5cf6`, white on it 4.23:1 | `#8250f0`, 4.82:1 | The most pressed control in the app |
| `--primary` dark as TEXT | 4.39:1 on the card | new `--primary-ink` `#a78bfa`, 6.81:1 | See the split below |

**`--primary` carries two roles and one value cannot serve both.** As a surface it has white on it,
so it must be dark enough; as ink it sits on the near black page, so it must be light enough. The
two pull in opposite directions and there is no compromise value that clears both. `--primary` is
now the surface and `--primary-ink` is the ink, the same split `--good` and `--good-ink` already
use. Light mode needs no split and defines the token anyway so a component names one thing in both
themes.

**`--tab-active`, the selected object.** `#f1eafe` light, `#2e233e` dark. One token for every
place the interface says "you are here as an object rather than as a colour": the tab bar's active
chip, the chosen half of the theme segment, the tinted disc behind a tool glyph. It is a FLAT value
and not an alpha over whatever is behind it, because the chip sits on the white bar and on the cream
page, and an alpha composites to two different colours in those two places, which is two different
measured contrasts for one token.

Measured where it is composed, because the label inside it is 12px and 12px is body text under
WCAG AA: `--primary-ink` on it is 4.87:1 light and 5.44:1 dark, and the 2px border of the same ink
on the bar's ground is 5.70:1 light and 6.44:1 dark, over the 3:1 an interface component needs
under WCAG 1.4.11. The two values are derived separately rather than one being the other darkened,
because `--primary-ink` is a different hue in each theme.

The glyph INSIDE a `--tab-active` disc is `--muted-foreground`, not the primary. The fill is where
the colour goes; the line work recedes so the fill is what leads. See sticker-ui rules 5 and 6.

**Do not use red for a wrong answer.** Per the game shell rules, an incorrect arrow snaps back and
a leaving group that will not leave wobbles. `--destructive` is for destructive actions, such as
deleting saved work, not for a student learning.

## Typography

Re-pointed 2026-09-01 by the design-goals adoption (see the Supersession entry). The split is
by ROLE, per `docs/DESIGN-GOALS.md`: content is neutral, chrome carries the personality.

- Content (question stems, answer options, flashcard faces, guidebook body, chemical labels),
  token `--font-sans`: the SYSTEM STACK,
  `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
  SF on iOS, Roboto on Android, Segoe on Windows; Helvetica Neue is not licensed and appears
  only where a platform ships it natively
- Chrome (buttons, celebration numbers, streak counts, mascot speech), token `--font-display`,
  class `.title-face`: the ROUNDED display stack,
  `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Baloo 2", Quicksand, "Varela Round", ui-sans-serif, system-ui, sans-serif`.
  No webfont ships in this phase, so the stack reaches the platform's own rounded face and
  falls back to the content stack
- The earlier faces are out: Inter and Fraunces are gone from the live stacks, and the Caveat
  handwritten accent (`.playful-face`) left the source tree. Sticker rule 8's needles point at
  the rounded stack (needle "rounded") with the floor armed at 16px

**This app defines one**, in `theme.css` under `@theme inline`: seven steps, roughly a 1.25 ratio,
snapped to whole pixels, used as `text-scale-xs` through `text-scale-display`.

| Step | Value | | Step | Value |
|---|---|---|---|---|
| `scale-xs` | 0.75rem | | `scale-xl` | 1.375rem |
| `scale-sm` | 0.875rem | | `scale-2xl` | 1.75rem |
| `scale-base` | 1rem | | `scale-display` | 2.5rem |
| `scale-lg` | 1.125rem | | | |

## Shape, depth, glass

- House radius is `rounded-xl`, 12 px. Deliberately not mapped onto Tailwind's `--radius-md`, so
  unrelated `rounded-md` usage is not reshaped
- Glass card: `rounded-[2rem]` outer with a `rounded-[1.75rem]` inner inset
- Pressable buttons: `rounded-[9px]`
- Glass surfaces: `backdrop-blur-sm` or `-md`, `bg-white/40 dark:bg-white/[0.06]`, plus layered
  inset box-shadows for the bevel. An SVG `feTurbulence` and `feDisplacementMap` filter adds
  refraction as progressive enhancement, never as a requirement
- Buttons are `h-11`, 44 px, one step taller than stock shadcn, explicitly for the touch target
  floor. That is the same 44 pt floor this app's accessibility budget names, so it is already
  consistent

## Motion

Two libraries, with a division of labour worth keeping.

- `motion` (the Framer successor) drives interaction: springs on buttons, toggles, toasts, nav.
  Typical spring `{ stiffness: 300 to 520, damping: 22 to 34, mass: 0.45 to 0.7 }`. Simple fades
  use `duration: 0.25 to 0.35s` with cubic-bezier `[0.4, 0, 0.2, 1]`
- `gsap` drives timeline-heavy sequences, such as the card fan carousel
- Plain CSS keyframes handle passive loops: shine borders at 2.6s linear, spotlight pulse at 1.8s
- Theme swap forces a 220 ms ease transition on color properties for 260 ms around the toggle

`prefers-reduced-motion` is respected pervasively, and correctly: animations drop to 1 ms or
freeze to a representative static frame, never simply vanish leaving no state. Match that
standard. A stereocenter inversion with reduced motion still has to show that inversion happened.

## The mascot

Both 2D and 3D, progressively enhanced, and already built. Do not rebuild any of it.

- `blueberry-mark.tsx`: flat inline SVG, viewBox `0 0 64 64`, radial-gradient sphere with a five
  lobed calyx crown. Animated eyes, blush, and smile driven by CSS classes and a `data-mood`
  attribute. Thirteen moods including curious, focused, thinking, shy, cheer, happy, proud, sleepy
- `blueberry.tsx`: renders the flat mark first for cheap first paint, then lazy loads the WebGL
  version only when the element is near viewport, WebGL is confirmed, and reduced motion is off.
  Cross-fades in over a 600 ms `berry-arrive` keyframe
- `berry-geometry.ts`: pure THREE geometry, an oblate spheroid at `OBLATE = 1.12` with a sculpted
  five lobed calyx depression. No mood or behaviour logic
- `berryBehaviour.ts`: the behaviour machine. See `docs/INHERITED-DECISIONS.md` D4

Mood and behaviour compose. Wire game events to behaviours, not to moods: correct resolves to
`bounce`, wrong to `squash`, streak milestones to `celebrate`. A student can be `stressed` during
exam week and still bounce on a correct answer, and that combination is the whole reason the two
axes are separate.

## Layout

- Practical breakpoints, from existing media queries: 480, 640, 768, 1024
- Radius ladder in practice: `rounded-xl` default, `rounded-2xl` for tiles and toasts, `rounded-full`
  for pills and avatars
- No global container convention. Widths are set per component, for example
  `w-[min(24rem,calc(100vw-2.5rem))]` on the toast stack

## Duolingo, as a second reference

Named as inspiration for the game shell only, not for the chemistry. What is worth taking is the
shape of the reward moment: a large single number for the session result, a full-bleed celebration
state that is visually distinct from the working state, and a tiered badge that means something
because it was scarce.

**Amended 2026-08-27.** The paragraph that stood here rejected the streak-loss anxiety loop
outright. Owner direction now ships a streak, a charge limiter and a decaying mastery score. Its
reasoning was not wrong and is preserved in `docs/ECONOMY.md`: this is a study tool used before
exams by people who are already stressed, and a mechanic built on fear of losing a number is the
wrong tool for that audience. What answers it is the mitigation set in that file. For token
purposes the consequence is narrow: a streak, charge or mastery surface never uses the critical
or error ramp, never counts down, and never animates a number falling. Loss states in this
product are rendered in the calm ramp, not the alarm one.

## Amendment, 2026-09-01, from the design-goals adoption

Recorded at the calibration gate, values still land here only through the contrast gate.

- GREEN IS THE PROGRESS SEMANTIC: light green (working centre `#7ed957`) means forward
  motion everywhere: completed nodes, filled bars, correct states, checkmarks. Violet stays
  identity. FILL-ONLY, on measured contrast: 1.60:1 as text on cream, 9.66:1 as a fill
  under dark ink, so the green never appears as text or hairline, only as a fill carrying
  dark ink or a white mark on a large shape, each pairing measured not assumed
- LESSON NODES are periwinkle (working centre `#9BA8F5`), 3D pressable chips with a darker
  bottom edge and a real pressed-down state inside the 100 ms budget; five states per the
  committed states sheet in `docs/reference/design-goals/`
- TYPOGRAPHY splits by role: the SYSTEM STACK (SF / Roboto / Segoe) for content (question
  stems, options, flashcard faces, guidebook body, chemical labels), the rounded display
  face for chrome and celebration. No Helvetica licence. Sticker rule 8's needles must be
  re-pointed when the faces change, or it audits ghosts
- REPORTED CONFLICT, owner's to settle, not resolved here: the lavender turn of 2026-08-29
  (this file's own regime above, ground `#a3aee2`, card cream) against the warm cream
  ground of `docs/DESIGN-GOALS.md` (2026-09-01). Two owner directions point at different
  grounds. The S3 verdict review is the natural place to pick; whichever loses gets a
  dated supersession here, and the near-floor 4.73:1 body-text-on-lavender group (x534,
  the thinnest margin in the app) is evidence in that decision, not a verdict on it.
  SETTLED: see the Supersession entry below

## Supersession, 2026-09-01: the warm cream regime replaces the lavender turn

The conflict reported above is settled for the warm cream ground, and this entry is the
dated supersession the amendment promised. What decided it: `docs/DESIGN-GOALS.md` is the
owner's newer word and gives the ground twice ("warm tech ground: cream paper" under
Palette and surfaces, and the cream-or-white tab bar rule), against the lavender turn of
2026-08-29 whose five source images were never committed and whose provenance this file
already flagged as unverifiable. The design-goals reference set IS committed, in
`docs/reference/design-goals/`. The team runthrough gate can overrule.

What it replaces: the lavender turn's shipped values at the top of this file, namely
ground `#a3aee2` lavender with card `#fbf3e6` cream and primary `#3f4286` deep navy.
What ships now, in `apps/web/src/theme.css`, every pairing re-run through
`measurements/contrast-audit.mjs`:

| Token | Lavender turn | Warm cream regime |
|---|---|---|
| `--background` light | `#a3aee2` lavender | `#fbf3e6` warm cream, the goals' cream paper |
| `--card` light | `#fbf3e6` warm cream | `#ffffff`, lifting off the cream |
| `--primary` light | `#3f4286` deep navy | `#6d3fd4` identity violet (not the mascot's `#7c3aed`) |
| `--primary-ink` light | `#33367a` | `#5b2fc0`, 7.30:1 on the ground |
| dark theme | unchanged | unchanged; it was derived, not inverted, and never depended on which light surface was which |

Structural notes that travel with it:

- The cream that was the card is now the ground, so every ink derived to clear the cream
  card still clears its surface, and everything that had to clear the darker lavender
  ground now clears an easier one. The near-floor 4.73:1 body-on-lavender group (x534,
  the thinnest margin in the app) is gone with the ground that caused it
- White card on cream ground is 1.10:1, so EVERY CARD STILL CARRIES A BORDER; the
  structural-border rule survives the regime change with the same `--border #55597f`
- New token families, per the goals: `--chip-*` (the periwinkle `#9ba8f5` 3D pressable
  chip, thick darker bottom edge, pressed state), and `--progress-*` (the goal green
  `#7ed957`, FILL ONLY). Measured, not assumed: white on `#7ed957` is 1.76:1, UNDER the
  3.0 graphics floor, so even a white checkmark may not sit on the goal green itself;
  `--progress-deep #43a047` (white at 3.30:1) is the only green a white mark may sit on,
  and dark ink `--progress-ink #163a26` (7.17:1) is the default mark on the fill
- Typography splits per the goals: `--font-sans` is the system stack (content),
  `--font-display` is the rounded display stack (chrome). Fraunces and Caveat leave the
  app; sticker rule 8's needles were re-pointed in the same turn and its floor armed at
  16px, derived from this file's own type scale (the steps below scale-base are body and
  caption sizes, which belong to the content face)
