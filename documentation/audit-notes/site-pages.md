# Audit: public website pages (read-only, source audit, 2026-10-29)

Method: source read of every `src/App.tsx` route, the shell (`SiteChrome`, `site-nav`, `site-footer`, `site-shell.css`), home and each content page, plus their CSS. No dev server or screenshots were run, so every size below comes from CSS/Tailwind classes, not measured pixels. No source edited. Paths are relative to `grignard-app-source/`.

## 1. Route map (src/App.tsx:119-205)
| Route | Component | Frame | Notes |
|---|---|---|---|
| `""`, `home` | HomePage | framed | not lazy |
| `enter`, `start/*` | EntryGate, StartPage | flow (no frame) | funnel |
| `app`, `app/*` | AppGate -> game | game | out of scope |
| `learn` | LearnPage | framed | `lessons` and bare `unit` redirect here (lib/redirects.ts) |
| `lessons/<s>[/<r>]` | LessonsPage | framed | only with a slash |
| `unit/<id>` | UnitPage | framed | |
| `study-decks` (Review) | StudyDecksPage | framed | |
| `folder/<id>`, `deck/<id>` | FolderPage, DeckPage/ReferenceApp | framed | |
| `schedule`, `tutors` | SchedulePage, BookTutorPage | framed | `calendar`, `tutoring` redirect |
| `contact`/`about`, `terms`, `faq`, `phone` | ContactPage, TermsPage, FaqPage, PhonePage | framed | `phone` unlinked |
| `d/*`, `workspace` | DashboardPage, WorkspaceRoute | framed | Me tab |
| `signin`, `signup`, `staff` | SignInPage | flow | |
| `new-reaction`, `draw/<id>` | Ketcher pages | framed | lazy, 19 MB |
| anything else | NotFoundPage | framed | |

Dead in the router: the `route === "unit"` branch (App.tsx ~line 166) can never run because REDIRECTS maps `unit` to `#/learn`; its comment ("bare #/unit falls to the first") is false.

## 2. Typography: the biggest consistency gap
Owner rule: Nunito titles, system body, lavender ground. Reality: four families ship (`src/index.css:19-25`): Inter (body, index.css:319), Fraunces (`.title-face`, index.css:403), Caveat (`.playful-face`), Nunito (`--site-display`, tokens.css:85).
- **Fraunces serif still renders on about 35 site headings/labels** via `.title-face` (home.css:12 even says "still Fraunces until the owner moves every page"). Sites: LearnPage.tsx:212,274,318,336,354,434; LessonsPage.tsx:264,306,328,368; UnitPage.tsx:248,325,358,363,407,444; SchedulePage.tsx:470,545,576; BookTutorPage.tsx:185,259; TutorDesk.tsx:226-485; TutorAdminPanel.tsx:86,193,346; BookingSheet.tsx and TutorBookingSheet.tsx dialog titles; WorkspacePage.tsx:562 (h1); StartPage.tsx:279 (h1); UploadedFolderView.tsx:185,220. A Learn page shows a Nunito h1 (`page-title`) over Fraunces h2s. Fix: point `.title-face` at `var(--site-display)` (one line, index.css:403) and drop its `letter-spacing:.02em` (Nunito titles use -.01em in `.page-title`, site-shell.css:137).
- Body is Inter (index.css:319) while home.css:12 and the owner rule say "system stack"; `--font-sans` is the system stack (index.css:1352) but `body` does not use it. PageHeader's subtitle forces `font-sans` (system) while Terms, Contact and 404 inherit Inter, so body text is two faces across pages. Pick one.
- Caveat survives only in `ui/contact-2.tsx` and `ReferenceApp`; two font downloads (Fraunces, Caveat) for few uses.
- Terms h2 is inherited face, semibold, not Nunito (TermsPage.tsx:86).

## 3. Heading scale per page
| Page | h1 | section h2 | Source |
|---|---|---|---|
| Home | clamp 32 to 64px, w900, lh 1.04 | demo clamp 24 to 40px; close clamp 32 to 56px | home.css:50,179; home-sections.css:22 |
| PageHeader pages (Learn, Review, Schedule, Tutors, Lessons, Unit, Folder, Me) | 36px / 48px from md, w800 | see ladder below | ui/page-header.tsx |
| Learn decision card | h2 28px / 36px at 1024, w900 | | learn.css:415-416 |
| FAQ | visible title is slit-type display `clamp(44px,14.6cqi,172px)` uppercase, lh .84; real h1 is `sr-only` | | slit-type-faq.tsx:365; FaqPage.tsx:138 |
| Terms | 36px fixed, lh 1, inside a card | 18px semibold | TermsPage.tsx:25,86 |
| Sign in | 30/36px "Blueberry" | | SignInPage.tsx:89 |
| Contact | 36/48 (Contact2) | mono 12px uppercase | ui/contact-2.tsx:92,111 |
| 404 | 24/30px, "404" above at 72/96px | | 404-page-not-found.tsx:57 |
| Funnel | 30/36 Fraunces | | StartPage.tsx:279 |

Section h2 ladder across sibling pages has no rule: Review 24px (StudyDecksPage.tsx:70,89), Learn 24, Lessons 24, Unit 24 and 20 (UnitPage.tsx:407), Schedule 20, Tutors 20, Tutor desk h3 18, Terms 18. Suggest three tokens (page h1 36/48, section h2 24, card title 18) and use them everywhere.
- Home close title (56px max) is bigger than the demo title (40px) and nearly the hero h1 (64px). The close is the sign-off; keep it at demo size.
- The FAQ's 172px display is a third scale and the loudest text on the site, 3.5x any other page title.

## 4. Spacing and rhythm
- PageHeader: `pt-8 pb-6 md:pt-12 md:pb-8`, subtitle `mt-2 max-w-2xl`. Overrides: Learn `pt-5 pb-3 md:pt-6 md:pb-4` (LearnPage.tsx:154), Unit `pb-4` plus `.lrn-hub-head`. Learn's title sits 12 to 24px higher than every other page, breaking the "same air above the title" promise in page-header.tsx's own header comment.
- Pages not using PageHeader: Home, FAQ, Terms (own card header), Contact (own back link `mt-8`), Sign in, 404. Their title tops land at different y positions.
- Container widths differ, so the left edge jumps against the header berry (page-header.tsx promises they align). Header, Learn, Review, Schedule, Me: `max-w-7xl` (SITE_CONTAINER, site-nav.tsx:15). Tutors `max-w-5xl` (BookTutorPage.tsx ~138). Contact `max-w-5xl px-6` (ContactPage.tsx:30). Terms `max-w-3xl` (TermsPage.tsx:18). Sign in `max-w-5xl`. FAQ wrapper is `max-w-7xl` with no side padding of its own (FaqPage.tsx:139); the component's `--stf-gutter: clamp(16px,4cqi,64px)` (slit-type-faq.tsx:335) supplies it, so the FAQ left edge sits 0 to 48px inboard of the header's.
- Section gaps: Review `mt-10` (My decks) vs `mt-12` (search folders); h2-to-content `mb-4` (Review) vs `mt-3`/`mt-1` (Learn). Pick one.
- Home rhythm: hero bottom 8px (mobile) + demo top 16px = 24px between hero and the next section, tight (home.css:48,178); desktop 40+16. Close top 16/24, bottom 40/56 (home-sections.css:16,27). Owner asked to halve space (S2 round 1), so this is intentional, but the hero-to-demo seam on a phone is the one cramped joint.
- Layout-shift placeholders are magic numbers: `.home-demo__hold` 1010px mobile / 680px desktop (home.css:182,200) and `.home-sections__hold` min-height 1000px (home.css:222), while the real close band is about 330px mobile / 250px desktop. When the close chunk arrives the footer jumps up about 700px under a user who may already be scrolling. Size the hold to the real band.
- Hero stage is 284px tall on mobile between headline and CTA (home.css:152). On a 390x844 phone the CTA lands near y=690 (estimate); on a 640px-tall phone it is below the fold, against the "one picture, one sentence, one button" bar.

## 5. Text content findings
- Hero copy (data/site.ts:23-62) is clear and in Andrew's voice. The flip to "Weed-out class? Not this time." happens every 4.5s forever; screen readers hear line 1 only. Fine.
- `HERO.course` says "UMD CHEM 241/242" while FAQ and footer say "CHEM 241 and 242". Nit.
- FAQ answers may be stale (FaqPage.tsx:49-57): "Nothing is on sale and no price is set" and "Plans coming soon" vs Stripe checkout code (`startCheckout`, ui/subscription-plans.tsx:9) and the sign-in page's "Blueberry Pro ... See Pro" box (SignInPage.tsx ~line 190). Both cannot be true; confirm what is purchasable. "Can I practice drawing structures? Not in the lessons yet" while `#/draw/<id>` and `#/new-reaction` exist.
- Terms ships an amber "This page is not finished." box and a "Still to be written" section (TermsPage.tsx:29-34,68), linked from the footer. Finish it or retitle it a draft.
- 404 line "Or search for it from the home page" (404-page-not-found.tsx ~l.84) is stale; search is global (`/`, ctrl+k, header icon).
- Contact back link says "All decks" but goes to `#/home` (ContactPage.tsx:31-37). Sign in "Back to Blueberry" also `#/home`.
- Signed-in card: "Open the lessons editor" links `#/lessons`, which redirects to `#/learn` (SignInPage.tsx ~l.255): staff land on the student page.
- Subtitle policy: Review has a two-sentence subtitle (StudyDecksPage.tsx:60) though PageHeader says one line; Learn has none (intentional, S3 round 5).
- Standing rules check: no calculator, NMR/IR or periodic table on public pages seen. Skeletal structures on hero board and phone demo come from RDKit art (ThemedArt); not re-verified.

## 6. Colour and token drift (lavender ground rule)
Pages still on hard-coded slate/stone Tailwind instead of site tokens, so they look like another site on the lavender ground and in dark mode:
- 404: `text-slate-900/500/400`, primary button `rounded-lg` not the pill ledge button; `text-slate-400` on `#efeaf8` is about 2.4:1, fails AA (404-page-not-found.tsx:57-90).
- Terms: `bg-white`, `border-[#ccd5ea]`, `text-slate-600` (TermsPage.tsx:20-47).
- Contact `text-slate-500`; Dashboard shell `border-slate-200 bg-white/95 backdrop-blur-sm` and drawer `bg-slate-950/45` (DashboardPage.tsx ~96-130).
- Header logo border `#2a1d7a` hard-coded (site-nav.tsx ~125).
Swap to `--site-border`, `--card`, `--site-quiet`, `--bb-deep`.
- Primary button implementations: `.home-btn` (home.css:93, pill, 3-D roll), `.sch-btn`, `.rv-btn`, `.lrn-btn`, and Tailwind `gradient-button rounded-xl` (SignInPage) — five buttons, three radii. Unify.

## 7. Hierarchy and grid
- Home: single column on mobile, 7fr/5fr hero at 1024 (home.css:58), demo 24rem + 1fr at 1024 (home.css:195). Clear and documented.
- Learn: 2-col from 1024 with sticky rail; Review rv-row + DeckFolders; Folder rv-grid. Fine.
- Footer: h3 "The site / Settings / Find me" with no h2 before it on any page (site-footer.tsx:139,153,176) -> heading-outline skip.
- FAQ: only page whose h1 is `sr-only`; visible title is a styled non-h1.
- Sign in: left column leads with "Blueberry" brand h1, not "Sign in"; the page's job has no heading, the tablist is the first label. Card is `order-1` on mobile (good).

## 8. Animations inventory
| Where | What | Time | Reduced-motion? |
|---|---|---|---|
| HomeLoader (home.css:21-40) | two violet sheets wipe + berry drop, first arrival per tab | 900ms | yes, 120ms fade |
| Glass splash (main.tsx:26-30, lib/glassSplash.tsx) | liquid-glass logo over landing page, once per session | starts 1200ms after load, up to 2500ms | yes (guard skips) |
| Hero letters (home.css:71-75) | letter rise, stagger capped 160ms | .4s | yes |
| Flip headline (HomeHero.tsx) | rolls every 4.5s forever | 380ms out, .45s in | instant swap, still flips |
| Bloom bob | 8px, infinite alternate (home.css:160) | 4.6s | yes |
| Demo section reveal (home.css:82-87) | opacity + 24px rise after headline | .6s | yes |
| HomePhoneDemo (home-phone.css) | ~20 keyframes + auto-advance clock per row | cycling | yes (home-phone.css:149) |
| Close band (home-sections.css:43-48) | rise, Bloom hop once at 450ms, Bloom bob infinite | .7s | yes |
| Buttons | 3-D face roll, ledge press | 750-850ms | yes |
| Learn / Schedule sheets | slide-up/side | 320ms spring | yes (fade 120ms) |
| Review Due today | count-up | 700ms | yes |
| FAQ | letter cut intro, 38s ticker, flood clip-paths, plus rotate | long | `@media (prefers-reduced-motion)` only (slit-type-faq.tsx:738, JS at 848); NOT `html[data-motion=reduced]` so the footer Reduce motion switch does not stop it |
| Sign in tabs / Dashboard drawer | framer layout spring, crossfade, 250ms slide | | `useReducedMotion` (OS only) |
| 404 | GlitchText "404" | | check glitch-text.css |

Findings:
1. **First visit stacks three entrance beats on home**: loader wipe (0-0.9s), letter rise, then the glass splash overlays the page at 1.2s for up to 2.5s on top of the headline the visitor has begun reading, then the headline flips at 4.5s. The loader uses `blueberry_intro_seen` (lib/intro.ts:15), the splash a different key (`bb-glass-splash`), so nothing stops both. Owner wants calm: play one. Easiest: skip the splash when HomeLoader played, or retire the splash.
2. Four infinite loops run at once on home (headline flip, Bloom bob, 3-D Bloom WebGL, phone-demo auto-advance). Only the demo clock pauses off-screen. Pause flip and bob off-screen and while the headline is hovered or focused.
3. FAQ and Sign in ignore the site motion switch although SiteChrome points motion/react at `data-motion` (SiteChrome.tsx:82).
4. Stale comments: home.css:148 and home-sections.css:11 mention a hop "WAAPI in HomeHero.tsx" that no longer exists.

## 9. Dead or unused code on the site half
- `src/components/HomeIntro.tsx` (692 lines): no importer.
- `ui/auth-card.tsx`, `ui/sign-in-card-2.tsx`, `ui/registration.tsx`: import only each other; SignInPage renders its own card. Their white-on-dark styling would be unreadable on lavender.
- `HomeNewsletter` is DEV-only with an open TODO for where addresses go (HomePage.tsx:29). Confirm intent before it ships.

## 10. Prioritised fix list (smallest effort first)
1. `.title-face` -> Nunito (index.css:403): fixes about 35 headings at once; then drop Fraunces/Caveat imports if unused.
2. FAQ ticker/flood: add `html[data-motion="reduced"]` selectors beside the media query.
3. Skip the glass splash when the home loader played (or cut the splash).
4. Size `.home-sections__hold` and `.home-demo__hold` to the real bands.
5. One heading scale (h1 36/48, section h2 24, card h3 18) on Schedule, Tutors, Tutor desk, Terms, Unit.
6. Return Learn's PageHeader to default padding or document why.
7. Terms, 404, Contact, Dashboard onto site tokens (404 slate-400 fails AA).
8. Align Tutors, Contact, Sign in, Terms, FAQ container to SITE_CONTAINER, or accept narrow centred columns and fix PageHeader's claim.
9. Fix labels: Contact "All decks"; staff "Open the lessons editor" target.
10. Verify FAQ pricing and drawing answers; finish or label Terms as a draft.
11. Delete HomeIntro.tsx, auth-card.tsx, sign-in-card-2.tsx, registration.tsx after confirming no test imports.
12. Footer h3 -> h2.
