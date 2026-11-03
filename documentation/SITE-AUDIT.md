# Site audit, 29 Oct 2026

Read-only synthesis of the five notes in `documentation/audit-notes/` (`site-pages.md`, `app-pages.md`, `spacing-grid.md`, `motion.md`, `admin-viewer.md`). Nothing was edited in source. Method of the notes: source reads, plus live computed values at 1600px for the site routes in `spacing-grid.md` only. App values are from CSS, not measured pixels; nothing here was seen on a phone. Words: "the website" is the public site (`src/components`, `src/App.tsx`), "the practice" is the app at `#/app` (`src/game`), the owner's name for it.

## 1. Grid: pages by text, format, distance, hierarchy

Legend: OK = follows the page's family rule. DRIFT = visibly off its siblings. Numbers are CSS px.

### The website

| Page | Text (face, title size) | Format (container, colour) | Distance (header to content) | Hierarchy |
|---|---|---|---|---|
| Home | Nunito, h1 clamp 32 to 64, w900. Section h2 24 to 40, close 32 to 56 (bigger than the demo title) | Own layout, 7fr/5fr hero at 1024. Tokens OK | Hero to demo is 24 on a phone (the one cramped joint). Loader holds are 1010/680/1000 magic heights, real band is about 250 to 330 | OK, one picture, one line, one button. Hero CTA near y=690 on 390x844, below the fold on a 640px phone |
| Learn | Nunito h1 over Fraunces h2s (about 35 site headings still Fraunces). h2s 36, 22, 17, 24 on one page | `max-w-7xl`, 2-col from 1024 with sticky rail | DRIFT: 24 above the title, 16 below (others 48 and 32) | OK, decision card then rail. No subtitle, on purpose |
| Lessons, Unit | Nunito h1, Fraunces h2, h2 24 and 20 | `max-w-7xl` | `pb-10`. Lessons section gaps 32, Unit uses its own head | Mixed h2 ladder |
| Review (study-decks) | Nunito h1 48, h2 24, two-sentence subtitle | `max-w-7xl`, `pb-8` | 48 / 32 (the default). `mt-10` then `mt-12` between sections, h2 to content `mb-4` | OK |
| Folder, Deck | PageHeader or own | `pb-8`, DeckPage `pb-16` | DeckPage gaps 56 and 48 | Longest page, widest gaps |
| Schedule | h1 48, h2 20 | `max-w-7xl` typed again, not imported | 48 / 32 | DRIFT: h2 20 where Review is 24 |
| Tutors | h1 48, h2 20, Fraunces desk titles | `max-w-5xl`, so the left edge jumps | 48 / 32 | DRIFT: width and h2 |
| Contact | h1 36 to 48, mono 12px caps eyebrow, `text-slate-500` | `max-w-5xl px-6`, own back link | 56 to the title, own header | DRIFT: no PageHeader, back link says "All decks" but goes home |
| Terms | h1 36, h2 18 semibold, inherited face not Nunito | `max-w-3xl`, no `lg:px-8`, `bg-white`, `#ccd5ea` | 73 to the title (card inside `py-5`) | DRIFT: white card on lavender, amber "not finished" box |
| FAQ | Visible title is 172px slit-type display (3.5x any title), real h1 is sr-only | `max-w-7xl` with no own padding, 0 to 48 inboard of the header edge | none | DRIFT: loudest text on the site, third type scale |
| Sign in | "Blueberry" 30 to 36 is the h1, not "Sign in" | `max-w-5xl`, `gradient-button rounded-xl` | `py-6` | DRIFT: page job has no heading |
| 404 | "404" at 72 to 96, h 24 to 30, `text-slate-*` | `rounded-lg` button | own | DRIFT: slate-400 on lavender is about 2.4:1, fails AA |
| Workspace, Me | h1 30, `mb-8` | own | own | DRIFT: bypasses PageHeader |
| Reaction add/draw | h1 36, hard-coded `#5a3fd8`, `stone-950` | `py-5` | back link then `mt-5` | DRIFT |
| Start funnel | h1 30 to 36 Fraunces | `max-w-2xl px-5` | frame | Own frame by design |

### The practice (app)

| Screen | Text (title size) | Format (column, side padding) | Distance (title to content) | Hierarchy |
|---|---|---|---|---|
| Path | Unit card is the only title; divider title 17 (smallest title, biggest break). h1 is `hidden lg:block`, so no h1 below lg | Full width, chip rows, chest rows | Divider eyebrow 12 | Good |
| Train | h1 32/900 (forced by `h1.text-scale-2xl`), card h2 18, unit h3 14, badges 10 | `max-w-2xl`, `p-4 md:p-6`, `gap-4` | 16, card title and blurb touch | DRIFT: 32, 18, 14 is a steep uneven jump |
| Courses | h1 32/900 | same wrapper as Train, `gap-6` | 24 (Train is 16) | DRIFT |
| Cards | hero number 32, shelf titles 18, eyebrow 12 | bottom pad 96 | | Clear |
| Feed | h1 28, sr-only at md+, section 22, no HUD | card stream plus right rail | gap from wrapper, no margin | DRIFT: md to lg has no visible title |
| Leaderboards, Messages | h1/h2 28, `text-lg` and `!text-xl` | Messages `max-w-5xl` | | DRIFT |
| Me | profile 28, `me-h2` 20, group title 13 caps, row 16 | 640, consistent inside | `me-h2` mb 12 | OK inside, odd against others. Sub-screens title 24 centred |
| Shop | title 20 centred, section 24 (bigger than the title), own close X and second balance | `max-w-512`, bottom 32 | 12 | DRIFT: worst title/section inversion; dangling `aria-labelledby="shop-freeze"` |
| Glossary | bar title 20, section 22 | 704, bottom 64 | 4 and 8 | DRIFT |
| Search, Focus, Periodic | no title | 640 / own | | DRIFT: tool screens with no heading, Focus on site tokens |
| Admin | `bb-h1` 24 | `--ah-pad` | | OK, own family |

## 2. The one style Blueberry already uses

The owner rules (STATUS.md, 29 Oct block, plus standing memory) and the tokens already agree. The drift is in screens that do not reach for the tokens, not in a missing style.

### The website
- Ground: lavender (`#efeaf8` family), cards on `--card`, borders `--site-border`, quiet text `--site-quiet`, deep `--bb-deep`. Primary blue-violet `#5a3fd8`.
- Type: Nunito for display (`--site-display`, tokens.css:85), system stack for body (`--font-sans`). Inter is what `body` actually uses (index.css:319) and Fraunces still renders about 35 headings through `.title-face`; both are drift from the rule, not part of the style.
- Page frame: `SiteChrome`, then `PageHeader` (`ui/page-header.tsx`): h1 36 mobile / 48 from md, w800, `pt-8 pb-6 md:pt-12 md:pb-8`, one-line subtitle `mt-2`, inside `SITE_CONTAINER` (`max-w-7xl px-4 sm:px-6 lg:px-8`).
- Heading ladder to hold: page h1 36/48, section h2 24, card title 18.
- Spacing: 4px grid. Dominant gaps `gap-2/3`, section gap 40, bottom padding `pb-10`, card radius 20 (CSS) or 24 (Tailwind), border 2px, ledge `0 4px 0` to `0 6px 0`.
- Buttons: the pill with the 3-D roll and ledge (`.home-btn`). Five implementations exist; the pill is the one to keep.
- Motion: tokens in `src/tokens.css:58-72` (press 60, release 160, ui 200, enter 320, roll 750, wipe 720), `--bb-ease-out` as the ease-out, spring for a pressed-and-released button. `html[data-motion=reduced]` is the in-app switch.

### The practice
- Ground and colour: lavender ground, primary `#5a3fd8` via `--bb-primary` and `--bb-primary-lip` (theme.css:207), Nunito via `--font-display` (game tokens.css:28). Calculator: none, tools hidden in challenge and test is not verified in `ReviewRun`/`TestOutRun`.
- Titles: the scale exists and is correct: `--h-1` 24 screen title, `--h-2` 20 section, `--h-3` 17 card (theme.css:293-296), class `.bb-h1`. Left aligned. Screens that use it today: Shell label, Admin, LessonRecap, Me sub-screens.
- Spacing: 16 side padding (24 at md), column 640 to 672, title to content 12, title to subtext 4, bottom 40 to 48.
- Radius and ledge: cards 16 (`--radius-card`), sheets `24 24 0 0`, ledge `0 3px 0` to `0 4px 0`, border 2px.
- Press: `.btn3d` in `app/ui/press.css` (90ms, sinks by the lip). Focus and Search each redeclare it.
- Motion: calm, shared easing from game tokens; sheets 260ms quint with no overshoot.

The two halves differ on purpose in three places (card radius 16 vs 20/24, ledge 3-4 vs 4-6, sheet motion quint vs spring). Nothing else should differ.

## 3. Differences ranked by how visible they are

Header and text distances, between pages, and animations, with the most noticeable first. "Seen" means a user flips between the two screens and notices without measuring.

1. Page titles across the practice: five sizes, 18, 20, 24, 28, 32, centred on some screens and left on others. Switching Train to Shop to Me shows it on every tap. (`theme.css:893-901`, `shop.css:54`, `glossary.css:59`, `me.css:234`.)
2. Website title position: Learn sits 24px higher than Review, Schedule and Tutors; Contact is 56, Terms 73. Visible on every tab switch in the header.
3. Fraunces serif h2s under Nunito h1s on Learn, Lessons, Unit, Schedule, Tutors (about 35 places). One-line fix at `index.css:403`.
4. FAQ: a 172px headline, 3.5x any other title, and a ticker that ignores the footer Reduce motion switch.
5. The Shop: section heading (24) bigger than page title (20), plus its own close X and second balance counter.
6. Off-palette colour: practice side tabs use `#6d4fd6`/`#8b6df2` (16 hits) instead of `#5a3fd8`; 404, Terms, Contact, Dashboard on slate/white instead of site tokens.
7. Container width jump: Tutors, Contact, Sign in at 5xl, Terms at 3xl, FAQ gutter, against 7xl. The left edge moves against the header berry.
8. Section h2: 20 vs 24 (Schedule, Tutors vs Learn, Unit, Review).
9. Three entrance beats stacked on first home visit (loader wipe, letter rise, glass splash at 1.2s over the headline), then four infinite loops.
10. Section gaps 32/40/48/56 and bottom padding 20 to 96.
11. Card radius 16/18/20/24/28 on the site, 14 to 26 in the app; ledge depth strays at 1, 2, 7, 8.
12. Off-scale type: 10 to 11px micro text (60+ uses on the staff side), game literals 11/13/15/17/19 (about 190).
13. Animation internals: three ease-outs, four reduced-motion switches, three press durations (60/90/120), sheet 220/260/320, six answer-tray-like curves. Low visibility individually, high as a feel.

Titles with no h1 (Search, Focus, Periodic; Path below lg because `hidden lg:block` removes it from the accessibility tree) are an accessibility finding rather than a visible one.

## 4. The radical animation diagnosis

The radical Bloom splits in half and reads as an electron pair. Source: `mascot/berryState.ts:164` (`split:true, haloKind:"unpaired", haloStrength:0.9, badge:"•"`), `Berry.tsx:519-553`, `mascot.css:224-243, 287-315, 413-440, 450-488`. Four things stack, each fine alone:

1. Split: the same face rendered twice, clipped `inset(0 50% 0 0)` and `inset(0 0 0 50%)`, each half drifting 3 to 7% and rotating 1.5 to 3.5 degrees in anti-phase, 2400ms. Each half has one eye, one cheek, half a mouth.
2. A halo dot on the seam, 11% wide, glowing, bobbing and scaling at 1600ms.
3. A second "•" in a badge chip top right.
4. The two loops (2400 vs 1600ms) never sync.

Why it reads as a pair, in order:
- (a) Two dots at the same height at the top of the berry. Students are taught two dots is a lone pair. The site already draws ":" for Thinking (`bloomMotion.ts:80-86`).
- (b) Two near-identical one-eyed lobes moving in anti-phase is the homolysis picture, but the berry is the species, not the bond. A radical is one unpaired electron.
- (c) The glow fills the gap with light, so the cut looks like two bright orbitals.
- (d) `drop-shadow-md` sits inside the clipped span, so the shadow is cut hard at the seam.
- (e) Reduced motion freezes the widest pose (plus or minus 5%, 2.5deg), so the person who asked for less motion gets the most pair-like frame for good.

Fix direction, not applied: keep exactly one dot (drop the badge), shrink the split to a 2 to 3% crack with no rotation, or use one half-shaded berry; clip the shadow outside the seam; freeze reduced motion on the closed pose. Chemistry check before shipping: derive the species (one unpaired electron) from RDKit rather than from memory, as the owner rule requires.

Related collision: the Thinking lone-pair animation (`bloom-answers.css:106`) uses the same dot language.

## 5. Admin numbers: real or not

From `admin-viewer.md`. Real means a query through RLS that returns user rows; sample means a constant in code.

### Real
- New sign-ups, growth line, funnel "Signed up": `profiles.created_at`, real if the query succeeds.
- Active learners, the Today block (learning now = event in the last 15 minutes, signups today, lessons finished today, active today), Recent activity feed: `progress_events`.
- Funnel started / finished / came back another day: `progress_events` (`node_started`, `node_cleared`, two or more days).
- Funnel Visited: `analytics_events` `screen_view`, real only if rows return, else the stage is dropped.
- Activity page (`#/app/admin/activity`): fully real, last 48 hours, limit 500, 15 second refresh.
- Funnel Went Pro and Paying learners: real only after the owner applies `20261029120000_entitlements_staff_read.sql` (not applied), and a genuine single payer reads as not applied.

### Not real (sample)
- Monthly revenue stat, hero revenue and sparkline, Billing table (INV-1037 to 1042), CSV, Payouts, System status, incidents, uptime ticks, paying sparkline (flat line).
- "Needs you" list: mixed. Payment-retry and service-slow alerts come from invented data.
- Learners board (`#/app/admin/stats`, tab 1) and Growth board (tab 2): 100% sample.
- Task board: not metrics, per-browser localStorage, not shared.

### Breaks against the owner rule
- The rule is "real or labelled No data, example, with an example graph". The app says "Sample data, not live" and draws the sample as if populated.
- In mixed mode the Hero revenue, Billing and System cards carry no sample tag, so invented money and uptime sit beside live counts.
- Zero live signups draws a flat line with no "No data" message.
- `fetchAll` caps 8000 rows and Activity caps 500, silently.
- `sampleView` scales funnel counts by date range, so invented numbers move with the picker.

### Could be real, not wired
CAC (`marketing_spend` has staff RLS, nothing reads it), retention day 1/7/30, median days to first lesson, attempts per unit, device split and sessions by hour. Only revenue, payouts, invoices and uptime need a labelled example, because Stripe holds the amounts.

## Fix list, smallest first

1. `.title-face` to `var(--site-display)`, drop its letter-spacing.
2. Practice: all screen titles through `.bb-h1`, delete the `h1.text-scale-2xl` override; fix `Shell.tsx:467` to `sr-only` below lg.
3. Tag Hero revenue, Billing, System and Needs you as example; adopt "No data, example".
4. Radical: one dot, small crack.
5. FAQ ticker honours `data-motion="reduced"`; skip the glass splash when the home loader played.
6. One PageHeader padding, one container, one h2 step on every site page.
7. Side tabs rebuilt on `--bb-primary` as the owner's left rail (Shop, Challenges, Tasks, Quests).
8. Shared motion tokens and one reduced-motion guard for both mechanisms.
