# Combining Blueberry and blueberry_game

Draft, 2026-09-07. Owner task: bring the shipped flashcard site and the game together
without losing anything.

## The finding that changes the job

**The seam already exists, and it was built on purpose.** This is not a merge of two
codebases. `grignard-app-source/src/data/site.ts` carries one constant:

```ts
export const TRAINER_URL = "https://andliu7.github.io/mechanism_trainer/";
```

with its own note: *"Named here rather than in whichever component happened to link it
first ... and the day it moves in there should be one line to change."*

Five surfaces already point at it: the home page's Concepts tile, the Dashboard's Concepts
panel, the StartPage funnel, and the site footer. **Repointing that constant at
blueberry_game's deploy URL wires every entrance at once.**

Two more slots are already shaped:

- **The Concepts tile's caption literally reads "A separate app, for now."** It is a
  placeholder waiting to be retired.
- **`StartPage.tsx` reserves the ending**: *"When the mechanism-drawing trainer moves in,
  its drawing exercise replaces the teaser card at the end; the slot is already shaped for
  it."*

So "without losing anything" is the easy half. Nothing is deleted; the game lands in slots
the site already left open.

## What already exists, so we do not rebuild it

The site carries **137 UI primitives**. Three of the owner's notes are already built:

| Asked for | Already there |
|---|---|
| "animated terminal / messy text scramble" | `ui/text-scramble.tsx`, already hardened: `motion.create` is memoised because calling it in the render body remounted the node every tick |
| light / dark mode | `ui/animated-theme-toggler.tsx`, and every component carries `dark:` variants |
| "device interface or not" | `ui/animated-macbook.tsx` and `ui/window-chrome.tsx` |
| the notifications bar | `ui/notifications.tsx` and `ui/notification-bell.tsx` |

Also present and worth knowing about: `tetris.tsx`, `shader-animation.tsx`,
`spotlight-cursor.tsx`, `blueberry-bot-3d.tsx`, `stacked-cards.tsx`, `snap-carousel.tsx`.

## The one thing in the brief I would change

**The brief puts a settings page between "Get Started" and the app. I think that loses the
funnel, and the funnel is the site's best asset.**

`StartPage.tsx` states its strategy plainly: *"Get Started does not open a price list. It
opens this. The order is the whole strategy: by the time anybody is asked to sign in they
will have set a goal and answered real course questions, and the question will have changed
from 'is this worth it' to 'am I willing to walk away from what I just did'."*

A settings screen asking about theme and device frame before anything has been earned is
friction ahead of value, and it is the same mistake that file already refuses about
accounts: *"An account offered on arrival is an account offered to somebody with nothing to
protect."* Theme has an obvious default (`prefers-color-scheme`) and the device frame is a
preference nobody has an opinion about until they have seen the thing.

**What to do instead, and it uses the owner's own reference.** Do not build a settings
page. Build the **first system prompt**, in the Solo Leveling voice the brief names:

```
        ⌬  SYSTEM

   A CHALLENGE HAS APPEARED
   Organic Chemistry II · Unit 1

   [ ENTER ]        [ CONFIGURE ]
```

`ENTER` goes straight into the first real question. `CONFIGURE` opens theme and device
frame for the one person in fifty who wants them. Same two settings, no step spent on the
other forty-nine, and the moment now belongs to the game rather than to a preferences form.
The text resolves in with `text-scramble.tsx`, which is what that component is for.

If the settings page is wanted anyway, it should sit **after** the first lesson, framed as
"make it yours", where the student has something to keep.

## The home page, restructured

Today the bento grid is five equal tiles: Lessons, Study Decks, Calendar, Concepts, Focus
timer. The brief promotes the app and demotes flashcards.

```
┌───────────────────────────────────────────────┬───────────────┐
│                                               │  STUDY DECKS  │
│   BLUEBERRY                                   │  flashcards   │
│   the game                                    ├───────────────┤
│   Draw the mechanism. Push the electrons.     │   LESSONS     │
│   [ START ]        Unit 1 · 6 topics          ├───────────────┤
│                                               │   CALENDAR    │
└───────────────────────────────────────────────┴───────────────┘
```

- The game is the **hero tile**, spanning two rows, carrying the live pathway or a looping
  capture rather than an icon.
- **Study Decks keeps its tile**, smaller. Nothing is lost. Cards are still the thing a
  student reaches for the night before, and CLAUDE.md's own Cards tab exists because the
  AAMC data says flashcard use is rising.
- The Concepts tile is **retired**, because the thing it linked to is now the hero. Its
  caption "A separate app, for now" is the note that says this was always the plan.

## The notifications bar

The brief asks for a full description of the game there. `ui/notifications.tsx` is today a
record of what the focus timer did while you were away. Adding a product announcement is a
second kind of thing in one surface, so it needs a **kind** on each entry: `timer` for what
exists, `release` for this. One list, two sources, sorted by time.

The description itself is a writing job, not a code job, and it is the highest-leverage copy
on the site after the funnel. It should say what the game **is** (you draw the mechanism,
the engine names what went wrong), not that it is new.

## The six topics

The brief names the spine: **Alkenes and π bonds · Dienes and conjugation · Dienophiles and
the Diels-Alder · HOMO and LUMO · Aromaticity · Carbonyls.**

Checked against `demo/pathwayMap.ts`: Unit 1 is Conjugation, Resonance and Dienes and
already carries Diels-Alder and inverse/hetero Diels-Alder; Unit 2 is Aromaticity. **HOMO
and LUMO is the gap** and it is also, per CLAUDE.md's real-world application rule, the one
that explains why fruit and leaves have their colours. It is the natural first application
lesson.

## Button style, gamified

The brief wants Solo Leveling: a button that announces itself, with an interaction sound.

The game already ships the mechanics — `chip3d` carries a hard lip (`0 3px 0 0`, no blur)
and presses down on pointer down, which is CLAUDE.md's press contract. What it does not
have is **arrival** (a control that animates in rather than being there) or **sound**.

Sound is not free and should be decided rather than added: it needs a mute that persists, it
must never be the only signal for anything, and it must not fire on a surface a student
opens forty times a day. A press sound on START and on a rank-up is a moment. A press sound
on every option chip is a reason to close the tab.

## Order of work

1. **Repoint `TRAINER_URL`.** One line, five entrances, nothing else moves. Do this first
   so everything after it is measurable against a real link.
2. **The home hero tile.** Promote the game, keep Study Decks, retire Concepts.
3. **The system prompt** replacing the settings page, using `text-scramble.tsx`.
4. **The notifications entry**, once the copy exists.
5. **Sound and arrival animations**, last, behind a persisted mute.

## What is explicitly not lost

Study Decks, Lessons, Reactions, Calendar, Tutoring, the focus timer, the workspace, the
admin and feedback tooling, and all 137 primitives stay exactly where they are. The game
takes a slot that was reserved for it and one that was already a link to it.
