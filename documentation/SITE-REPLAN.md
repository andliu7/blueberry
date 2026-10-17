# Site replan, 2026-10-07

**Status: a proposal waiting on the owner.** Nothing here is built, and nothing gets rebuilt
until Andrew has answered the questions at the end. Where this file and
`CLAUDE-blueberry-game.md` disagree, the rulebook wins and the conflict is listed as a question.

The brief, in his words (7 Oct): "be creative and replan the entire website. it'll be like an
online version of what we have, including the features already included but just more
cohesive. for example the lessons and reactions can kind of go together. the calendar and office
hours too. also just the navigation. also the mechanism thing can be removed." Plus: fun
animations like the portfolio, every page better, the home page most of all. From 27 Sep: an
interactive phone demo on home, Reference Sheets and Carbonyls under Lessons, the Calendar remade
like his Focusment technical instructions page and combined with Tutoring, more settings.

Inputs: the design audit of 7 Oct (scratchpad `audit/AUDIT.md`, 37 routes at 390 and 1440 px),
the research report `grignard/reports/Blueberry redesign design references.md` (its notes folder
was not on disk), the `andliu`, `duolingo` and `sticker-ui` skills, the portfolio's motion
source, and the design documents in this folder. The design rules that come out of it are a
skill, `~/.claude/skills/blueberry/`, so every later build reads the same tokens.

## In one paragraph

Blueberry already owns almost every part it needs. What it lacks is one of each: one ground,
one header, one onboarding, one place for a reaction, one place for a date. Twelve loosely linked
sections become five destinations (Learn, Practice, Review, Schedule, Me) shown the same way on
every page. Reactions stop being a second library and live inside the lessons that teach them.
Office hours stop being a separate page and become bookable slots on the calendar. The three
onboardings become the game's one. The mechanism-trainer promo goes. The motion comes from the
portfolio and costs almost nothing, because nearly all of it is CSS.

## 1. Information architecture

### The choice: Learn, Practice, Review, Schedule, plus Me

Two candidates were on the table.

| | Research report | Audit |
|---|---|---|
| Destinations | Home, Learn, Schedule, Profile | Learn, Practice, Review, Schedule (plus the avatar) |
| Where the game sits | inside Home, as "today's next action" | its own destination, Practice |
| Where decks sit | inside Learn | their own destination, Review |

**Chosen: the audit's four, with Me as the fifth item.** Why:

1. **It is the owner's own grouping.** "Lessons and reactions together" is Learn. "Calendar and
   office hours together" is Schedule. Nothing in his brief folds decks into lessons or the game
   into a home feed.
2. **The game is the crown jewel and deserves a door with its name on it.** The rulebook calls
   the mechanism trainer "the reason the engine exists". Burying it inside Home, as the research
   set does, copies Duolingo, where the path is the whole product. Here it is one of four.
3. **Decks are what a student reaches for the night before.** The current home comments say it
   in his voice: "the board is not allowed to lose things." Review keeps them one tap away.
   Folding them into Learn would make Learn three libraries deep.
4. **Home stays the front door.** Most visitors to `#/` are strangers. A personal "today" screen
   belongs inside Practice (the path already is one) and on Me, not on the page that has to
   explain what Blueberry is.
5. **Five fits the limit.** Five is the mobile-ui hard limit the rulebook already cites, Material
   allows two to five on a phone bar, and NN/g found hidden navigation cut discoverability by more
   than 20 percent. The research's own count, four or five, agrees.

What the research set got right survives: Me is its Profile (settings, account, sign-in state,
the motion switch), and onboarding and sign-in are flows, not destinations.

### Five destinations, every page

| Destination | Holds | Today's surfaces it absorbs |
|---|---|---|
| **Learn** | the units; each unit's lessons with their reactions inline; reference sheets; reaction search | Lessons, Reactions, Unit pages, Reference Sheets, the Carbonyls lessons |
| **Practice** | the game: the path, the trainer, the arrow pushing | `#/app` and everything under it |
| **Review** | due today, my decks, the deck library | Study Decks, folders, decks, (later) the game's Cards tab |
| **Schedule** | course dates, office hours as bookable slots, the focus timer | Calendar, Tutoring, the Focus tile, the corner timer |
| **Me** | your own numbers, one settings page, notifications, staff tools | the Dashboard and its eleven sections, the game's Me settings |

### One taxonomy

The audit found four different counts for the same course (6 topics, 12 sections, 15 units,
208 nodes). The game's fifteen units become the one spine: every lesson section, reaction, deck
and path node hangs off a unit, and every count on the site is generated from that one table.
Mapping the twelve lesson sections onto the fifteen units is content work Andrew reserved for
himself on 17 Sep, so the build produces the mapping table for his approval and touches no
lesson content (question 9).

## 2. Sitemap: every current route

Every route in `src/App.tsx` as of 7 Oct, and where it goes. The rulebook's rule holds
throughout: **every route resolves.** A retired address redirects; nothing that is in a
student's history becomes a 404.

| Current route | What it is today | New home | How |
|---|---|---|---|
| `#/`, `#/home` | home | **Home** | rebuilt, section 7 |
| `#/enter` | the entry gate | deleted | redirect to `#/app/start` |
| `#/start` | site funnel, welcome | deleted | redirect to `#/app/start` |
| `#/start/course`, `/exam`, `/topics`, `/lesson`, `/finish` | site funnel steps | deleted | each redirects to the matching step of `#/app/start` |
| `#/app` and every `#/app/...` | the game | **Practice** | unchanged addresses; the game parses its own tail |
| (new) `#/learn` | | **Learn** index | the units, reference sheets, reaction search |
| `#/lessons` | lessons hub | **Learn** | redirect to `#/learn` |
| `#/lessons/<section>` | a lesson section | **Learn**, lesson page | address kept; opens on its own title with a breadcrumb |
| `#/lessons/<section>/<reaction>` | a reaction inside a section | **Learn**, reaction opened in place | address kept; scrolls to and opens the reaction |
| `#/unit`, `#/unit/<id>` | orphaned unit pages | **Learn**, the unit hub | address kept; becomes the page every lesson and node of that unit hangs from |
| `#/reactions` | the second reactions library | **Learn**, reaction search | redirect to `#/learn` with search open |
| `#/draw/<id>` | draw the product of a reaction | **Learn**, from the reaction card | address kept; back link returns to the reaction |
| `#/new-reaction` | staff reaction composer | **Me**, staff tools | address kept; signed-out visitors see "Adding reactions is for course staff." and a sign-in button |
| `#/study-decks` | deck hub | **Review** | address kept, page renamed Review |
| `#/folder/<id>` | a deck folder | **Review** | address kept |
| `#/deck/<id>` | a deck | **Review** | address kept; opens on the first card |
| `#/calendar` | calendar | **Schedule** | address kept, rebuilt, section 4 |
| `#/tutoring` | office hours | **Schedule** | redirect to `#/calendar?view=hours` (query inside the hash, per `routes.ts`) |
| `#/d` | dashboard front | **Me** | address kept; your own numbers |
| `#/d/settings`, `#/d/appearance` | two settings pages | **Me**, Settings | `#/d/settings` is the one page; `#/d/appearance` redirects to it |
| `#/d/notifications` | notifications | **Me** | kept |
| `#/d/profile` | profile | **Me** | kept |
| `#/d/subscriptions` | plans | **Me** | kept, linked only once a paid tier exists (question 13) |
| `#/d/lessons`, `#/d/decks`, `#/d/categories` | library views inside the dashboard | Learn and Review | redirect to `#/learn` and `#/study-decks` |
| `#/d/concepts` | "the mechanism trainer will land here" | deleted | redirect to `#/app` |
| `#/d/imports` | unbuilt imports | **Review** | redirect to `#/study-decks`; the import ticket already lives at the foot of the hub |
| `#/d/home` (via `viewHref`) | dashboard front | **Me** | same as `#/d` |
| `#/workspace` | staff workspace | **Me**, staff tools | address kept, unlinked from student navigation as today |
| `#/signin`, `#/signup`, `#/staff` | sign-in flows | flows, not destinations | kept; no forced dark mode |
| `#/contact`, `#/about` | contact | footer | kept; `#/about` already redirects |
| `#/terms` | terms | footer | kept |
| anything else | 404 | 404 | kept, with Home as its first exit |

Inside `#/app`, the game's own routes (`start/<step>`, `lesson/<node>`, `review`, `gallery/<name>`,
and the tabs `pathway`, `trainer`, `cards`, `feed`, `me`, `periodic`, `search`, `courses`,
`leaderboards`, `chat`, `messages`) are untouched by this replan except as section 6 describes.
A new route also needs its row in `src/lib/useDocumentTitle.ts` (repo `CLAUDE.md`).

## 3. Lessons and reactions, together

Today a reaction exists twice: nested inside its lesson section (drawn properly) and again on
`#/reactions` (with SMILES strings and typed formulas, against the draw-structures rule). The
audit also found four aromatic reactions filed under Carbonyls. The merge:

- **The unit hub is the spine.** `#/unit/<id>` lists that unit's lessons in order. Under each
  lesson, its reactions appear as cards in the lesson's own order, then a "Practise this unit"
  strip of the unit's path nodes (deep links into `#/app`), then the unit's decks.
- **A lesson page opens on its own title**, with a breadcrumb (Learn, the unit, the lesson). The
  big CHEM241 header card with the boxed berry appears on the Learn index only. A deep link to a
  reaction scrolls to it and opens it.
- **A reaction is a card, then a sheet.** In the lesson, the card shows the scheme drawn by
  RDKit (substrate, reagents over the arrow, product). Tapping it opens the reaction sheet: the
  three sides from `DESIGN-GOALS.md` (Setup, Conditions, Product, switched by a segmented pill),
  the staged conditions and "How this was checked" carried over from the old Reactions page, and
  two actions: "Draw the product" (`#/draw/<id>`) and "Practise this" (its path node).
- **The flat library survives as search.** Learn's index has a search field that finds a
  reaction by name, reagent or reactant (the rulebook's "reaction search", the lookup a student
  does the night before an exam) and filters by unit. Results open the same sheet. This is the
  same search the game exposes as a header tool, so it is built once.
- **Reference Sheets and Carbonyls go under Learn** (owner, 28 Sep). Reference sheets (pKa, IR,
  NMR) are a "Reference" shelf on the Learn index, one tap from any lesson. The nine generated
  Carbonyls decks stay decks, and appear on the carbonyl units' hubs.
- **Filing follows the course's unit table**, `COURSE-OUTLINE-ORGO2.md`, checked by a chemistry
  checker before it ships (question 10).
- **Phone layout.** The twelve-row section menu becomes a horizontal chip row under the title;
  on desktop the sidebar labels wrap to two lines instead of truncating.

## 4. Calendar and office hours, together

Modelled on the Focusment technical instructions page (`ff_technical_instructions/repo2`): a
month title in the display face, a Month, Week and List switch, a search field, category chips,
an active-filter line, and events as soft chips with a coloured left rule; and beside it the
"Find a time" panel. Notion Calendar is the precedent for booking living inside the calendar.

- **One page, `#/calendar`, titled Schedule.** Categories: Exams, Deadlines, Office hours,
  My sessions. Colours: violet for a date you must meet, the blue touch for a time you can take,
  green for done. Each chip carries its words, so colour never carries meaning alone.
- **Signed out, it is not empty.** Public course dates (exams, deadlines) show to everyone. The
  current page says "nothing" three times to a signed-out visitor; the new one shows the
  semester and one line: "Sign in for your own sessions" (question 14).
- **Office hours are events.** Open slots draw in the week view as outlined blue slots and list
  in the "Find a time" panel (the side column on desktop, a tab on phone). Tapping one opens the
  booking sheet: pick the time, add what you want to go over, confirm. The confirmation offers
  "Add to my calendar" and "Change the time". A booked session becomes a My sessions event.
- **Empty hours, once.** "No hours posted this week." and one button, "Ask for a time", which
  opens the existing contact path with the week prefilled.
- **The tutor side is not student navigation.** Posting availability (the existing availability
  grid, minus its em dash) moves to Me, staff tools, for roster tutors only (question 12).
- **Focus moves here.** The study timer is a card on Schedule ("Focus for 25 minutes"). While it
  runs, a small pill shows in the header on every page, replacing the corner dock that covered
  the funnel's buttons.
- **Money and access stay server side.** Booking writes go through RLS or an Edge Function,
  never a client check (non-negotiables).

## 5. One onboarding

Today a stranger can meet three: the entry gate (`#/enter`), the site funnel (`#/start`, six
indigo steps on photographs) and the game's capture (`#/app/start`, the right shape, with
"[HUMAN GATE]" placeholder copy). Keep one.

- **The game's flow is the one,** because it has the Duolingo shape the rulebook names as the
  bar for onboarding: one question per screen, one progress bar, the berry, one button.
- **It takes the site funnel's three real questions** (course, exam date, topics) and the site
  funnel's real first lesson question, and ends by placing the student on their first path node,
  not on a site page. Under three minutes, the rulebook budget.
- **The home CTA goes straight to it.** No gate in between; the gate's two settings (appearance,
  motion) move to Settings.
- **The finish screen agrees with the score** ("Two of three on the first try. Nice."), and the
  device-and-account explanation is one line plus "Save my progress".
- **The words are Andrew's.** The eight placeholder strings in `src/game/onboarding/copy.ts` are
  his to write or approve (question 11). This phase edits `src/game/`, so it waits until the
  session working there has finished.

## 6. Navigation

**One destination list, rendered three ways:** Learn, Practice, Review, Schedule, Me.

- **Desktop and tablet (768 px and up): a slim top header.** Left, the berry mark, which always
  goes home. Centre, the five destinations as text tabs with the highlight-bar hover. Right,
  search (an icon that opens the reaction and deck search) and the avatar, or "Sign in". Nothing
  else: the theme toggle moves to Settings, Contact to the footer, and the fake window chrome,
  the corner dock, the photo caption and the floating sign-in pill all go. The header hides on
  scroll down and returns on any small scroll up, like the portfolio's.
- **Phone (under 768 px): a bottom bar** with the same five as icons over labels, on a white or
  card ground, never purple. The top of a phone page is just the page title and, where useful,
  the back link and search.
- **The way between site and game.** Practice is a destination like the others, so entering the
  game is pressing Practice. Inside `#/app`:
  - **Now (phase 9):** the game's own bar (Path, Train, Cards, Feed, Me) stays, because it is
    the rulebook's five-tab bar. Two edits make it a part of the site: the berry mark in the
    game's header and at the top of its desktop rail links to `#/`, and the site header, shown
    above the game on desktop, marks Practice as current. A student is never stranded again.
  - **Proposed (phase 10, needs the owner and a rulebook amendment):** one bar everywhere. The
    game's Path becomes Practice's front page, with Train and Feed reached from a segmented
    switch at the top of Practice; Cards merges into Review (the audit's two flashcard systems
    become one); the game's Me settings merge into Me. The rulebook already says Train should
    leave the bar once its surfaces have a home; this gives them one (questions 2 and 3).
- **Footer, every page:** Contact, Terms, the GitHub link, and the five destinations again.

## 7. The home page, beat by beat

The current home has a flat loader, a static hero, a board, then a GSAP-pinned phone that sells
the same three things again with a mechanism-trainer button, then a desert photograph that turns
the headings unreadable at night, then three Plans boxes that all say free. The new one tells one
story once, top to bottom, on one lavender ground.

**Beat 0. The loader (first visit in a session, 900 ms at most).** The portfolio's wipe: two
sheets in the deep violets slide off to the left, 70 ms apart, while the berry drops in from
above, squashes on landing and settles. Reduced motion: the sheets fade where they stand. It
replaces the flat violet disc. (motion.md 1; portfolio `app/globals.css:440-460`)

**Beat 1. The hero, inside the first screen on a phone.** Left: the headline, letters rising
in with a 30 ms stagger, then one sell line, then one primary button, "Start the first lesson",
with the ledge and the two-face pill roll on hover, then a quiet text link, "I already have an
account". Right (top-right at 390 px, about 120 px): the berry, which idles with a slow bob and
hops when tapped. Under the button, one line of proof: "Every structure drawn by RDKit. Every
wrong step named." The 3.2 s pulse on the button goes. The headline is Andrew's to choose;
"Organic chemistry that actually sticks." is a claim any competitor could make (question 8).
(motion.md 2, 3, 4, 5, 16)

**Beat 2. The phone demo (his 27 Sep request), with no scroll pin.** A flat phone frame in the
centre with four tabs above it: Learn, Practice, Review, Schedule. Each tab plays a short, real
moment built from the site's own assets:
- *Learn:* a lesson card opens into a reaction card, the scheme drawn, the product appearing.
- *Practice:* a three-node path strip, the START bubble bobbing; an arrow draws from a lone pair
  to a carbonyl carbon, and a "Correct, nucleophilic addition" chip springs in after it (the
  question first, then the answer; the old gate showed the answer before the question).
- *Review:* a card flips, then tilts toward the finger on a long press without showing its back.
- *Schedule:* a week view, one office-hours slot lights, and the booking sheet slides up.

Tabs auto-advance every six seconds while the phone is on screen and nobody is touching it, and
each screen has a link to the real page. On desktop the phone follows the pointer by a few
degrees (TiltFrame). Reduced motion: each tab shows its last frame, still. The demo loads lazily
as it nears the viewport, so it costs the first paint nothing. It replaces `CinematicHero` and
its pinned scroll. (motion.md 6, 7, 17, 18; question 7)

**Beat 3. The four destinations.** Four outlined cards, Learn, Practice, Review, Schedule, each
with one count generated from the single taxonomy (for example "15 units, 43 reactions", "18
decks", "Next office hours Tuesday at 3"; never a hand-typed number) and a small picture of what
is inside. They swing
in from the side as they enter view and sink on press. (motion.md 6, 4)

**Beat 4. How it is checked.** A short band with one real example: a wrong arrow, and the named
reason it comes back with ("attacked the wrong site"), next to the three promises: you draw the
arrows, every wrong step is named, every structure is derived by RDKit. The title rises line by
line. This is the one place on home that argues, and it argues with the product itself.
(motion.md 12)

**Beat 5. The close.** The berry again, small, with "Start the first lesson" once more, then the
footer. No Plans section until a paid tier exists (question 13). No marquee, no curtain.

Everything on home sits on the lavender ground with white outlined cards; there is no photograph
behind any text (question 5).

## 8. Every other page

**Learn index (`#/learn`).** The CHEM241 header with the berry (the only page that keeps it),
reaction search, the Reference shelf, then the fifteen units as cards with their progress and
lesson counts. Section titles rise line by line.

**Unit hub (`#/unit/<id>`).** Section 3. Plain-language description in one sentence and one tag
(Core or Optional), never the syllabus jargon ("Gates Unit 9's control logic"). Real previous and
next buttons replace the 10 px "swipe or use the arrow keys" hint.

**Lesson (`#/lessons/<section>`).** Title, breadcrumb, reading text in the content face, reaction
cards inline. No placeholder video until a video exists. One primary colour: the old blue
gradient on "Open study deck" goes. The breadcrumb's current section rolls in as you scroll.

**Draw (`#/draw/<id>`).** Opened from a reaction card, back link to that reaction. Reagents drawn
once, as structures; `H3O+` stops appearing twice.

**Practice (`#/app`).** The game keeps its own design work, which another session owns right
now. This replan asks only for the bridge (section 6), the developer copy out of student view
("90 of 208 nodes playable", "Phase 6 data"), unbuilt nodes collapsed into one "More soon" marker
per unit instead of dashed holes, one currency name, and the loader shared with home.

**Review (`#/study-decks`).** Opens on the decision, as the game's Cards design already does:
"Due today" with one big number that counts up and a Review button, then My decks, then the
library by folder as Quizlet-style tiles (a tinted shell around a white panel), in a carousel on
phone. No empty "Organic Chemistry I, nothing here yet" group, no promo card, no gradients.

**Folder (`#/folder/<id>`).** The tiles of one folder, a breadcrumb back to Review, and a
pressed state on every tile.

**Deck (`#/deck/<id>`).** Opens on the first card, with the title in a compact header. Progress
in words ("Got it 4, Unsure 2, Missed 1, 44 cards"), not traffic-light dots. The card flips, and
tilts on a long press. No watermark Grignard spelled as text. Keyboard hints only on devices with
a keyboard.

**Schedule (`#/calendar`).** Section 4.

**Me (`#/d`).** Your own numbers only, from the game's journal and your deck reviews ("12 cards
this week", "3 units started"), never site inventory. One row of navigation, not three. Sections:
Settings, Notifications, Profile, Plans (when one exists), Staff tools (staff only).

**Settings (`#/d/settings`).** One page for the site and the game, replacing three. The options
he asked for more of, grouped:
- *Look:* theme (Light, Dark, System), text size, app device mode (bottom tabs, pop-up sheets,
  swipe between screens; from the 30 Sep brief).
- *Motion and sound:* motion (Full or Reduced, writing `data-motion`), sound effects, haptics on
  phones.
- *Chemistry:* arrow style (drag a curved arrow, or drag a straight dashed bond; ordered 29 Sep),
  show the product as you scroll, show lone pairs.
- *Study:* daily goal, exam date, reminder time, week starts on, time zone.
- *Account:* name, email, sign out, delete account (the one red button).

**Sign in.** Follows the visitor's theme instead of forcing dark. One primary button. The em
dash in its copy goes.

**Contact.** Back link to Home. His voice, one line: "Found a mistake or want a deck that is not
here? Write to me. I reply within a few days."

**Terms.** On the paper ground, readable, with the "not finished" note as one line.

**404.** Already the calmest page on the site; it becomes the template for empty states, with
Home as its first exit instead of "All decks".

**New reaction and Workspace (staff).** Under Me, staff tools. A signed-out visitor sees one card
that says what the page is for and offers sign-in, not an empty dashed box on a photograph.

## 9. What is removed

1. **The mechanism-trainer promo, everywhere.** The home game tile's "Opens the mechanism trainer,
   a separate app, for now"; the `CinematicHero` block and its "Try a mechanism" button
   (`src/components/ui/cinematic-landing-hero.tsx`, its CSS and its demo file); the
   `mechanism-trainer` entry in `src/data/releases.ts`, which drives the "Try the first lesson /
   Not now" banner on Study Decks and a long entry in the focus timer; the Dashboard's Concepts
   panel ("This is where the mechanism trainer will land") and its blurb; the "mechanism trainer"
   wording beside the `TRAINER_URL` links in `EntryGate.tsx` and `StartPage.tsx` (both retired
   anyway). The in-game arrow-pushing trainer stays; it is Practice. `TRAINER_URL` already points
   at `#/app`; renaming it is a separate, mechanical change.
2. **The entry gate** (`#/enter`) and **the site funnel** (`#/start`), once the one onboarding
   is live.
3. **The second reactions library** (`#/reactions`), once the reaction sheet carries its content.
4. **Photographs behind text**, site-wide (`PageBackground`'s hourly draw).
5. **The window chrome** (traffic lights and counters), the corner dock, the floating sign-in
   pill and the photo caption.
6. **The Plans section on home**, until a paid tier exists.
7. **The CTA pulse, the 38 s marquee, the page curtain and the GSAP scroll pin.**
8. **Developer copy in student view:** TEMPLATE video, "[HUMAN GATE]" (replaced by his words),
   "Phase 6 data", "spine 87 of 100", "Gates Unit 9's control logic", "a separate app, for now".
9. **Three type looks:** Fraunces headlines, Caveat handwriting and the slab serif on decks, plus
   mono eyebrows (question 4).

Named and left for the owner, because this change does not orphan them: `MECHANISM_TRAINER_PROMPT.md`
at the repository root, a starting prompt for the separate project (question 15).

## 10. The palette and type call, briefly

Full reasoning, every value and its source: `~/.claude/skills/blueberry/references/tokens.css`.

- **Keep `#5a3fd8` as the one filled action colour.** It is measured, committed, and white on it
  (6.69:1) beats the guide's `#6B4EA8` (6.40:1).
- **Bring the lavender back as the ground**, `#efeaf8`: his Technical Instructions lavender
  `#F4F0FB` one step darker, which is the 30 Sep wording ("keep lavender as the general colour,
  darken it slightly"). Not the retired `#a3aee2`, which forced every card to carry a border and
  muted text down to 4.73:1. On `#efeaf8` every text token stays at 5.2:1 or better.
- **Darker purple** `#2e2b45` for headings and `#33208c` for ledges; **some blue** from the
  existing `#4779ee` for fills plus a derived `#3a5fd0` (4.77:1) when blue carries words.
- **One cost, measured:** the warn amber `#b45309` falls to 4.26:1 on the new ground, so warn text
  sits on cards or uses the darker `#92400e`. The game's ground moves in its own phase, with
  `contrast:audit`, because the 23 Sep sweep measured everything against `#f5f7fb`.
- **Type:** Nunito for chrome, the system stack for content, as `DESIGN-GOALS.md` already decided
  for the game. The site drops Fraunces, Caveat and Inter, which also removes three font files.
- **Motion:** one set of six easings and six durations from the portfolio. Today `src/` holds 19
  distinct curves in 99 places.

## 11. Build order

Each phase is one reviewable change with one check that has to pass before the next starts.
Numbers before and after go in the commit message. Two standing gates run on every phase:
`check_tokens.py` adds no curve and no hex, and `bundle_gate.py` does not rise
(`~/.claude/skills/blueberry/references/checks.md`). Baselines on 7 Oct, on a working tree that
carried another session's uncommitted game edits: entry alone 466.8 kB gzipped, entry plus game
709.5 kB, against a 400 kB budget; 99 curve uses in 19 distinct curves; 1,078 raw hex in `.tsx`.

The order follows the ranking in Appendix A. Its top eleven are unreadable text on photographs,
contradictory counts, the misfiled reactions and the missing header; phases 1 to 3 close most of
them before any page is redesigned, because a beautiful page nobody can read or reach is not
progress.

**Phases 0 to 8 touch only the site.** `src/game/` is being edited by another session, so the
three phases that need it (9 to 11) wait until that work is committed.

| # | Phase | Size | The check that closes it |
|---|---|---|---|
| 0 | **Tokens and gates.** Add the token file (motion set and the new colour names, nothing repainted yet); record both baselines | one CSS file, no visual change | `npm run build` green; `npm test` at its baseline (bootLoader red on purpose); both scripts print the baseline numbers |
| 1 | **Remove the mechanism promo and the developer copy on site pages** (section 9, items 1 and 8 outside `src/game/`); hide Plans | deletions and copy | A search of `src/` outside `src/game/` and `src/data/decks/` for "mechanism trainer", "separate app" and "Try a mechanism" finds nothing; `#/d/concepts` resolves; the entry bundle goes down (GSAP leaves with `CinematicHero`) |
| 2 | **One ground.** Photographs out from behind text; site pages on the lavender ground; sign-in follows the theme | `PageBackground` and page wrappers | `npm run contrast:audit` reports zero failing pairs on site routes; the audit's H1, F2, S1, T1, TE1 and NR1 screenshots, re-shot at night, pass by eye |
| 3 | **Shared header, phone bar, footer**; the window chrome, dock, caption and sign-in pill go; the focus timer becomes a header pill while running | one header component on every site page | `npm run hit:targets` at 0 under the floor; no horizontal scroll at 390 px on all 37 audited routes (the audit's `shoot.mjs` reports `overflowX` 0); a route test asserts the five links and `aria-current` |
| 4a | **Home: loader and hero** (beats 0 and 1) | `HomePage`, `HomeHero` | Reduced-motion and full-motion screenshots both complete; the first phone viewport ends inside beat 2; entry bundle not above phase 1's number |
| 4b | **Home: the phone demo** (beat 2), lazy | one new lazy component | Its chunk is not in the entry (`bundle_gate.py --route index.html` unchanged); each tab's link resolves |
| 4c | **Home: board, proof, close** (beats 3 to 5); counts generated from one table | home sections | A unit test asserts every count on home comes from the taxonomy module, none typed |
| 4d | **Entry diet.** `Dashboard` and `useSession` off the entry; GSAP only by dynamic import | imports only | Entry bundle lower than phase 4c's, toward 400 kB |
| 5 | **Learn.** `#/learn`, the unit hub, lesson pages on their own title, reactions as cards and a sheet, reaction search, the Reference shelf; `#/lessons` and `#/reactions` redirect | the biggest site phase; may split by page | A route test walks every old Learn address in section 2 and asserts each lands on a page; a test asserts no reaction view renders a SMILES string as text; the filing fix waits on question 10 |
| 6 | **Schedule.** Tutoring merged into the calendar, public dates, booking sheet, focus card; `#/tutoring` redirects | calendar page, booking sheet, one RLS-guarded write | Signed-out render shows course dates; a test proves the booking write is refused without a session (RLS, not the client); `#/tutoring` resolves |
| 7 | **Review.** Due today, tiles, decks open on the first card, labelled progress, flip and hold tilt | study decks, folder, deck pages | A 390 px screenshot of `#/deck/grignard` shows a card in the first viewport; no unlabelled counters remain |
| 8 | **Me and one Settings page**, with the new options; `#/d/appearance` redirects | dashboard sections | Each setting persists across reload (test); every `#/d/...` address in section 2 resolves |
| 9 | **Game, part 1** (after the other session): the bridge (berry links home, Practice marked current), developer copy out, the "More soon" marker, one currency name, the one onboarding with his words; `#/enter` and `#/start/...` redirect | `src/game/` shell and onboarding | `shellRoutes.test.ts` extended for the home link; no "[HUMAN GATE]" string left in `src/`; onboarding finished inside the 3 minute budget in a timed run; game bundle not up |
| 10 | **One bar everywhere** (only if question 2 is yes): Path, Train and Feed under Practice, Cards into Review, Me merged; the rulebook's tab section amended in the same commit | `routes.ts` placements, shell | Every game hash still resolves (existing route tests plus one per moved tab); `hit:targets` passes; the rulebook and this file agree |
| 11 | **Game ground and motion sweep.** The game moves to the lavender ground and the token curves | `src/game/theme.css` and game CSS | `check_tokens.py` reports zero curves outside tokens; `lavender.test.ts` inputs updated with the colours, thresholds untouched; `contrast:audit` zero failing pairs |

The Rive character from the research report is not in this list on purpose: it is the one item
with a real budget cost (222 kB), and it gets judged later against the CSS berry, not assumed.

## 12. Questions for Andrew

Each has my recommendation. A one-word answer is enough.

1. **Shall the site's five destinations be Learn, Practice, Review, Schedule and Me?**
   Recommend yes. It is your own grouping, and it keeps the game and the decks one tap away.
2. **Shall the phone show one bottom bar everywhere, game included, with Train and Feed moving
   inside Practice and the Cards tab merging into Review?** Recommend yes, but only after the
   bridge ships (phase 9), and with the rulebook's five-tab section amended in the same commit.
   It changes a rule you set on 1 Sep, so it is yours to say.
3. **Until then, is it fine for the game to keep its own bar, with the berry linking back home?**
   Recommend yes. It ends the stranding without touching the rulebook.
4. **May the site drop Fraunces, Caveat and the slab serif, and use Nunito for titles and the
   system font for reading, as the game already does?** Recommend yes. It ends the four visual
   languages the audit found and removes three font downloads.
5. **May every photograph come out from behind text?** Recommend yes. If you want one photo to
   stay, it goes inside a single framed panel on home, never behind words.
6. **Palette: keep `#5a3fd8` for buttons and bring the lavender back as the page ground
   (`#efeaf8`), with your guide's deep purple for headings and a touch of blue?** Recommend yes.
   The other reading of 30 Sep, moving the buttons to your guide's `#6B4EA8`, is slightly worse
   on contrast and costs a full sweep. Night mode stays the measured navy.
7. **Shall the home phone demo show Learn, Practice, Review and Schedule, instead of Lessons,
   Concepts, Study Decks and Reactions?** Recommend yes: reactions now live in Learn, and
   Concepts was always the game.
8. **Will you write the home headline, or pick from drafts?** Recommend you write it. Drafts, if
   useful: "Draw the arrows. Find out which step went wrong." or "Orgo II, one mechanism at a
   time."
9. **May I draft a table mapping the twelve lesson sections onto the game's fifteen units, for
   you to approve, so every count on the site comes from one place?** Recommend yes. I would not
   touch any lesson content; you reserved that on 17 Sep.
10. **May Friedel-Crafts acylation, nitration, diazonium formation and Sandmeyer move from
    Carbonyls to Aromatics, following `COURSE-OUTLINE-ORGO2.md` and checked by a chemistry
    checker?** Recommend yes. A student will notice the current filing.
11. **Will you write the eight onboarding lines now marked "[HUMAN GATE]", or approve drafts? And
    is the mascot "Berry" while the product is "Blueberry"?** Recommend drafts in your voice for
    you to edit, and yes to the names; today the site says "Blueberry" and the game says "Berry".
12. **Who can post office hours, and who can book?** Recommend: tutors on the roster post; any
    signed-in student books; booking is free and enforced by RLS.
13. **Hide Plans everywhere until a paid tier exists?** Recommend yes. Three boxes that all say
    free tell a stranger nothing.
14. **May signed-out visitors see the course's exam dates on Schedule?** Recommend yes, unless the
    dates are private to your section.
15. **`MECHANISM_TRAINER_PROMPT.md` sits at this repository's root. Move it to the
    `mechanism_trainer` repository, delete it, or leave it?** Recommend move it; it belongs to
    the side project.
16. **The bundle is over budget twice (entry 466.8 kB, game route 709.5 kB, against 400 kB). Is
    400 kB still the goal for both, measured with CSS included?** Recommend yes, with phase 4d as
    the first cut. The 527.7 kB in `PHASE-6-VERDICT.md` was measured another way; I would not
    move the budget to meet either number.
17. **Shall the Cards tab and the site's decks become one library now, or after Review is
    rebuilt?** Recommend after, with phase 10. Card saving stays local, as you decided on 17 Sep.
18. **Are these the right new settings: text size, app device mode, motion, sound, haptics, arrow
    style, product on scroll, lone pairs, daily goal, exam date, reminder time, week start, time
    zone?** Recommend yes, and nothing more until these are used.

## Appendix A. The audit's findings, ranked

The 77 findings in the 7 Oct audit, each sent to Jev (TypeSafe jev-1.13) as its own request with
two questions: a severity score for a first-time student (cosmetic, annoying, confusing, blocks a
task, misleading or unreadable) and an area choice (navigation, palette and type, motion, layout,
copy, content correctness, other). The requests and answers are in the session scratchpad,
`jev/requests/` and `jev/results.json`; total cost $0.0021. The tutor's name in Tutoring 4 was
redacted before sending.

Where Jev's confidence was under 0.6, or its top two areas were within 0.15, I decided myself:
that is "unsure" in the last column, with Jev's own answer kept beside it. Three times Jev was
confident and I overrode it, marked "override":
- **G2** (developer copy in the game) Jev 1.75, annoying. I read it as blocks a task: the
  onboarding is placeholder text on every line, so a stranger cannot get through it as written.
- **C3** (no shared header) Jev 2.24, confusing. I read it as blocks a task: Calendar, Tutoring
  and Reactions are reachable only from a profile dropdown, so a student cannot find them.
- **T3** (seven rows of "No availability") Jev said content correctness. It is a layout problem:
  the content is true, there is just too much of it.

Ranked by severity, then by how many first-time students reach the page (home and cross-site
first, staff pages last). The first column is the rank; the second is the audit's own id.

| Rank | ID | Page | Finding | Severity | Area | Jev | Decided by |
|---|---|---|---|---|---|---|---|
| 1 | H1 | Home | The home page hard-cuts from a cream hero to a full-bleed night desert photo at the first scroll, and headings stay... | misleading or unreadable | palette and type | 3.64 (0.71); palette and type (1.00) | Jev |
| 2 | H6 | Home | Counts disagree across the site: Lessons tile says 6 topics across 2 units, Lessons page 12 sections, unit page 1 of... | misleading or unreadable | content correctness | 2.68 (0.39); content correctness (0.99) | severity unsure, Jev 2.68 at 0.39 |
| 3 | F2 | Onboarding funnel | Onboarding body text (subtitle, hints, 'Saved on this device') is grey on a night sky photo and fails contrast; the... | misleading or unreadable | palette and type | 3.27 (0.40); palette and type (1.00) | severity unsure, Jev 3.27 at 0.40 |
| 4 | G6 | Game | Game readouts contradict each other: the header shows 2025 gems while Me says '0 Diamonds' (two names for one... | misleading or unreadable | copy | 3.53 (0.60); content correctness (0.53) | area unsure, Jev content correctness at 0.53 |
| 5 | R2 | Reactions | Friedel-Crafts acylation, nitration, diazonium salt formation and Sandmeyer are filed under 'Carbonyls' while... | misleading or unreadable | content correctness | 2.83 (0.58); content correctness (0.98) | severity unsure, Jev 2.83 at 0.58 |
| 6 | S1 | Study decks | The Study Decks title breaks mid-word as 'STUDY DECK / S' on mobile, navy on a night sky, and the handwriting... | misleading or unreadable | layout | 3.08 (0.24); layout (0.63) | severity unsure, Jev 3.08 at 0.24 |
| 7 | D1 | Dashboard | The Dashboard shows site inventory ('18 Decks', '581 Cards') as if it were the student's stats, then '0 Cards you've... | misleading or unreadable | content correctness | 2.87 (0.22); content correctness (0.78) | severity unsure, Jev 2.87 at 0.22 |
| 8 | T1 | Tutoring | The tutoring intro collapses into a one-word-per-line column at 390px beside the title, grey on a night sky | misleading or unreadable | layout | 1.92 (0.21); layout (1.00) | severity unsure, Jev 1.92 at 0.21 |
| 9 | NR1 | New reaction | A signed-out visitor on New reaction sees an empty dashed box over a full-screen photo with unreadable text, so the... | misleading or unreadable | layout | 3.84 (0.87); layout (0.70) | Jev |
| 10 | TE1 | Terms | The Terms page shows an amber 'This page is not finished' box over an unreadable night sky photo | misleading or unreadable | palette and type | 3.74 (0.77); layout (0.50) | area unsure, Jev layout at 0.50 |
| 11 | C3 | Cross-site | There is no shared header: five pages use one header with different contents, eight use a lone Home link, and three... | blocks a task | navigation | 2.24 (0.77); navigation (1.00) | severity override, Jev 2.24 at 0.77 |
| 12 | C5 | Cross-site | Honesty has become dev notes in the UI: TEMPLATE video, 'Phase 6 data', '[HUMAN GATE]', 'a separate app, for now',... | blocks a task | copy | 2.71 (0.67); copy (1.00) | Jev |
| 13 | H4 | Home | The sticky header is a pile of unrelated widgets: fake macOS traffic lights with 0 counters, Dashboard, berry,... | blocks a task | layout | 2.67 (0.68); layout (0.61) | Jev |
| 14 | F1 | Onboarding funnel | On every onboarding step at 390px the floating corner dock covers the primary Continue button and the secondary link | blocks a task | layout | 2.99 (0.97); layout (1.00) | Jev |
| 15 | G1 | Game | There is no way back from the game (#/app) to the site: the header is the course name and readouts, the desktop rail... | blocks a task | navigation | 2.90 (0.91); navigation (1.00) | Jev |
| 16 | G2 | Game | Developer copy is visible to students in the game: '90 of 208 nodes playable, spine 87 of 100', 'Gates Unit 9's... | blocks a task | copy | 1.75 (0.72); copy (1.00) | severity override, Jev 1.75 at 0.72 |
| 17 | L1 | Lessons | On every lesson sub-page a header card with a boxed 3-D berry takes a full phone screen, so a deep-linked reaction... | blocks a task | layout | 2.65 (0.70); layout (0.99) | Jev |
| 18 | CA1 | Calendar | The calendar is empty for anyone not signed in and says so three times: 'Nothing scheduled yet', 'Sign in to see the... | blocks a task | copy | 2.85 (0.88); copy (0.45) | area unsure, Jev copy at 0.45 |
| 19 | T3 | Tutoring | Tutoring shows seven rows of 'No availability' | blocks a task | layout | 2.80 (0.80); content correctness (0.67) | area override, Jev content correctness at 0.67 |
| 20 | U1 | Unit page | The unit page is an orphan: nothing links to it except its own previous and next links, and its topic cards are not... | blocks a task | navigation | 2.51 (0.60); navigation (1.00) | Jev |
| 21 | C2 | Cross-site | Crossing from the site into the game changes the ground, the type, the mascot and its name, the navigation (top... | confusing | palette and type | 1.93 (0.88); navigation (0.45) | area unsure, Jev navigation at 0.45 |
| 22 | C4 | Cross-site | Three onboardings coexist: the entry gate, the site funnel at #/start (six screens), and the game's own onboarding... | confusing | navigation | 1.94 (0.88); navigation (1.00) | Jev |
| 23 | H3 | Home | Home has two promo surfaces selling the same things (a feature board, then a pinned phone mockup with its own CTA... | confusing | layout | 2.15 (0.74); layout (1.00) | Jev |
| 24 | H5 | Home | Buttons and tiles do not respond to hover: the CTA has blurred glows and no hover lift, the feature tiles have... | confusing | motion | 1.82 (0.29); motion (0.88) | severity unsure, Jev 1.82 at 0.29 |
| 25 | E1 | Entry gate | The entry gate after Get Started is a third visual language: a 'SYSTEM' window frame, square blue button and mono... | confusing | palette and type | 1.59 (0.63); palette and type (0.87) | Jev |
| 26 | E3 | Entry gate | The demo on the gate shows a 'Correct' chip under an arrow already drawn, so it shows an answer without a question | confusing | motion | 2.44 (0.52); copy (0.31) | severity unsure, Jev 2.44 at 0.52; area unsure, Jev copy at 0.31 |
| 27 | F3 | Onboarding funnel | The finish screen says 'That's a real start.' over '0 of 3 first-try answers', then a long paragraph about devices... | confusing | copy | 2.11 (0.67); copy (0.76) | Jev |
| 28 | G3 | Game | Half the game pathway is 'Coming soon': five of the first ten nodes are dashed placeholder circles | confusing | layout | 2.14 (0.60); copy (0.29) | area unsure, Jev copy at 0.29 |
| 29 | G4 | Game | Two flashcard systems that do not know about each other: the game's Cards tab and the site's 18 decks with 581 cards | confusing | navigation | 2.13 (0.64); navigation (0.73) | Jev |
| 30 | G5 | Game | The lesson canvas uses ball-and-stick spheres while the rest of the site draws skeletal structures; in dark mode... | confusing | palette and type | 2.34 (0.56); palette and type (0.92) | severity unsure, Jev 2.34 at 0.56 |
| 31 | K3 | Deck | Deck progress counters reuse red, yellow and green traffic-light dots ('0 0 0, 0 / 44 reviewed') with no labels | confusing | copy | 1.97 (0.79); copy (0.93) | Jev |
| 32 | L2 | Lessons | The first content on the Lessons overview is a fake video player labelled 'TEMPLATE | confusing | copy | 1.81 (0.49); copy (0.89) | severity unsure, Jev 1.81 at 0.49 |
| 33 | L5 | Lessons | Reactions are already nested inside lesson sections and then duplicated on a separate Reactions page | confusing | layout | 1.59 (0.60); layout (0.73) | Jev |
| 34 | R1 | Reactions | The Reactions page is a second copy of Lessons with a different detail card that shows SMILES strings like... | confusing | content correctness | 1.85 (0.67); layout (0.39) | area unsure, Jev layout at 0.39 |
| 35 | CA2 | Calendar | 'Office hours' is a filter chip on the calendar while office hours themselves live on a separate Tutoring page | confusing | navigation | 1.91 (0.65); navigation (0.82) | Jev |
| 36 | D4 | Dashboard | There are two settings systems: the game's Me tab (theme, language, arrow style) and the site's #/d/settings and... | confusing | navigation | 1.66 (0.67); navigation (0.85) | Jev |
| 37 | T2 | Tutoring | The tutoring route says tutoring, the eyebrow says 'TUTORING / CHEM241', and the title says 'Office hours': three... | confusing | copy | 1.80 (0.67); copy (0.96) | Jev |
| 38 | U2 | Unit page | The unit page shows internal syllabus jargon to students: 'Gates Unit 9's control logic and all of Unit 12', and... | confusing | copy | 1.85 (0.87); copy (1.00) | Jev |
| 39 | U3 | Unit page | The unit page header collides at 390px: Contact, the theme toggle and two Sign in controls stack on each other, and... | confusing | layout | 2.12 (0.60); layout (0.86) | Jev |
| 40 | U4 | Unit page | Unit navigation is only a 10px mono hint 'SWIPE OR USE THE ARROW KEYS' with no real previous and next buttons | confusing | navigation | 2.02 (0.60); navigation (1.00) | Jev |
| 41 | NF1 | 404 | The 404 page's only exits are 'All decks' and 'Grignard deck'; there is no Home link | confusing | navigation | 2.04 (0.74); navigation (1.00) | Jev |
| 42 | C1 | Cross-site | Four visual languages in one product: photo or cream grounds, five font stacks, a violet primary plus an old blue... | annoying | palette and type | 1.33 (0.72); palette and type (1.00) | Jev |
| 43 | H2 | Home | The hero is static and sparse: 500ms blank, 2s of a flat violet disc loader, one opacity fade, 250px of dead space,... | annoying | motion | 1.50 (0.59); motion (0.45) | severity unsure, Jev 1.50 at 0.59; area unsure, Jev motion at 0.45 |
| 44 | E2 | Entry gate | The entry gate is a fourth screen before any learning: home CTA, gate, welcome, course, exam, topics, then lesson | annoying | navigation | 1.68 (0.43); navigation (1.00) | severity unsure, Jev 1.68 at 0.43 |
| 45 | F4 | Onboarding funnel | Onboarding choice tiles have an outline but no press lip and do not sink, and quiz feedback is not a bottom sheet | annoying | motion | 1.00 (0.71); motion (1.00) | Jev |
| 46 | F5 | Onboarding funnel | The mascot is called 'Blueberry' in the site onboarding and 'Berry' in the game | annoying | copy | 0.63 (0.47); copy (1.00) | severity unsure, Jev 0.63 at 0.47 |
| 47 | G7 | Game | The game takes over 5s to load in dev: a blank grid at 1s, then the same flat-disc loader as home | annoying | motion | 1.51 (0.52); motion (0.85) | severity unsure, Jev 1.51 at 0.52 |
| 48 | K1 | Deck | A deck opens on a full-screen title page with a slab serif title, handwriting subtitle and a 'click here!' doodle;... | annoying | layout | 1.26 (0.76); layout (0.99) | Jev |
| 49 | K2 | Deck | The deck page uses a fifth type stack: slab serif, handwriting, 9px mono uppercase labels and Inter | annoying | palette and type | 1.31 (0.45); palette and type (1.00) | severity unsure, Jev 1.31 at 0.45 |
| 50 | K4 | Deck | The deck background watermark draws a Grignard reagent as text ('BrMg', 'CH3') on a bond line instead of a drawn... | annoying | content correctness | 1.14 (0.68); content correctness (0.39) | area unsure, Jev content correctness at 0.39 |
| 51 | K5 | Deck | Keyboard hints '(press /)' show on touch devices | annoying | copy | 1.17 (0.60); copy (0.76) | Jev |
| 52 | L3 | Lessons | Two primary button colours in one view: an old blue gradient 'Open study deck' beside the violet 'Draw the product' | annoying | palette and type | 0.89 (0.81); palette and type (1.00) | Jev |
| 53 | L4 | Lessons | On mobile a twelve-row section menu comes before any content; on desktop the sidebar labels are truncated ('Grignard... | annoying | layout | 2.03 (0.46); layout (0.77) | severity unsure, Jev 2.03 at 0.46 |
| 54 | R3 | Reactions | The reactions menu is a 43-row list on mobile with no search | annoying | navigation | 1.45 (0.63); navigation (0.71) | Jev |
| 55 | R4 | Reactions | A floating 'Sign in' pill rides over the content while scrolling | annoying | layout | 1.39 (0.47); layout (0.94) | severity unsure, Jev 1.39 at 0.47 |
| 56 | S2 | Study decks | Another mechanism trainer promo card ('Try the first lesson / Not now') sits between the title and the decks | annoying | layout | 1.16 (0.77); layout (0.99) | Jev |
| 57 | S3 | Study decks | An empty category 'Organic Chemistry I | annoying | layout | 2.50 (0.58); copy (0.57) | severity unsure, Jev 2.50 at 0.58; area unsure, Jev copy at 0.57 |
| 58 | S4 | Study decks | Folder tiles are saturated violet gradients with white text and a grey folder illustration that looks like a... | annoying | palette and type | 1.01 (0.77); palette and type (0.84) | Jev |
| 59 | S5 | Study decks | The Study Decks header differs from every other page and Contact overlaps the berry at 390px | annoying | layout | 1.78 (0.34); layout (0.95) | severity unsure, Jev 1.78 at 0.34 |
| 60 | CA3 | Calendar | The 'Today' button runs past the card edge at 390px | annoying | layout | 0.88 (0.68); layout (1.00) | Jev |
| 61 | CA4 | Calendar | The calendar uses a different page background from its neighbours (plain grid versus photos) | annoying | palette and type | 0.65 (0.68); palette and type (1.00) | Jev |
| 62 | D3 | Dashboard | The dashboard uses a third background, a forest photo | annoying | palette and type | 0.79 (0.62); palette and type (1.00) | Jev |
| 63 | FO2 | Folder | The folder back link says 'All decks' and the header is the overlapping one | annoying | layout | 2.27 (0.29); layout (0.79) | severity unsure, Jev 2.27 at 0.29 |
| 64 | FO3 | Folder | Folder cards are links with no pressed state | annoying | motion | 0.95 (0.54); motion (1.00) | severity unsure, Jev 0.95 at 0.54 |
| 65 | SI1 | Sign in | The sign-in page forces dark mode, so a light-mode visitor flips to a purple-black page and back | annoying | palette and type | 1.24 (0.78); palette and type (0.92) | Jev |
| 66 | SI3 | Sign in | The secondary Sign in button is a lavender pill with a glow, unlike the primary button everywhere else | annoying | palette and type | 0.81 (0.60); palette and type (1.00) | Jev |
| 67 | T4 | Tutoring | The tutor tab is a filled violet chip with no lip beside a near-invisible second tab | annoying | palette and type | 2.12 (0.35); palette and type (0.33) | severity unsure, Jev 2.12 at 0.35; area unsure, Jev palette and type at 0.33 |
| 68 | CO1 | Contact | The Contact page's back link says 'All decks' | annoying | navigation | 0.86 (0.27); navigation (0.44) | severity unsure, Jev 0.86 at 0.27; area unsure, Jev navigation at 0.44 |
| 69 | CO3 | Contact | Contact has a third header variant: About with a caret, theme toggle, Sign in | annoying | navigation | 1.11 (0.17); navigation (0.96) | severity unsure, Jev 1.11 at 0.17 |
| 70 | NR2 | Draw | The Draw page shows H3O+ twice, once drawn and once as text, and CH3MgBr as a formula instead of a structure | annoying | content correctness | 1.40 (0.65); layout (0.30) | area unsure, Jev layout at 0.30 |
| 71 | NR3 | Draw | The Draw page back link says 'Lessons' while other pages say 'Home' or 'All decks' | annoying | navigation | 1.42 (0.49); navigation (0.45) | severity unsure, Jev 1.42 at 0.49; area unsure, Jev navigation at 0.45 |
| 72 | C6 | Cross-site | Em dashes appear in shipped copy on the sign-in page, dashboard and availability grid | cosmetic | copy | 0.29 (0.77); copy (0.96) | Jev |
| 73 | D2 | Dashboard | The dashboard's first row has three navigation controls: Menu, Home and Sign in | cosmetic | navigation | 0.37 (0.69); navigation (0.77) | Jev |
| 74 | FO1 | Folder | Folder deck cards are violet gradients with white text and big radial glows | cosmetic | palette and type | 0.80 (0.36); palette and type (1.00) | severity unsure, Jev 0.80 at 0.36 |
| 75 | SI2 | Sign in | The sign-in copy contains an em dash, against the house style | cosmetic | copy | 0.01 (0.99); copy (1.00) | Jev |
| 76 | CO2 | Contact | Contact copy is gushy: three exclamation marks in four sentences | cosmetic | copy | 0.42 (0.65); copy (1.00) | Jev |
| 77 | NF2 | 404 | The 404 page uses a different ground and handwriting body copy | cosmetic | palette and type | 0.69 (0.42); palette and type (1.00) | severity unsure, Jev 0.69 at 0.42 |

## Appendix B. Sources

- Audit: session scratchpad `audit/AUDIT.md`, screenshots in `audit/shots/` (7 Oct 2026)
- Research: `grignard/reports/Blueberry redesign design references.md`
- Owner words: the 7 Oct brief above; memory notes `visual-reconstruction-brief-sept-30`,
  `design-brief-sept-2026`, `blueberry-palette-blue-violet`, `arrow-pusher-is-the-bar`
- Rules: `CLAUDE-blueberry-game.md` (budgets, the five-tab bar, non-negotiables),
  `DESIGN-GOALS.md`, `DESIGN-TOKENS.md`, `STATUS.md`
- Motion source: `andliu-portfolio/app/globals.css` and the files named in the skill's
  `references/motion.md`
- Calendar reference: `ff_technical_instructions/repo2/index.html` (its month view and the
  "Find a time" panel)
- Design rules for every phase: `~/.claude/skills/blueberry/`
