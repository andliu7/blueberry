# Spacing and layout grid audit, 29 Oct 2026

Read-only. Method: Tailwind class histograms over `src/components` (site) and `src/game` (game), CSS declaration histograms per file, live computed values at 1600px on `localhost:5173` for site routes. Game routes were NOT measured live (sign-in gate); game values are from source. Counts are occurrences, so read them as "what authors reach for".

## 0. Verdict

- Both halves share a 4px grid and Nunito/Fraunces faces, but neither enforces its own tokens. Game defines `--space-*`, `--radius-*`, `--text-*`, `--h-*` (`src/game/tokens.css:32-81`, `src/game/theme.css:162-168, 292-296`), yet page CSS is almost all raw rem/px.
- Biggest outliers: (1) game screen-title size, five sizes; (2) site page top/bottom padding and hand-rolled headers vs `PageHeader`; (3) site section h2 20px vs 24px; (4) card radius spread 14-28px; (5) ledge depth 2-8px; (6) sub-12px type on the site staff side.

## 1. Dominant values (the "grid")

| Token | Site dominant | Game dominant |
|---|---|---|
| Gap | gap-2 (208), gap-3 (109), gap-1.5 (82) | gap-2 (115), gap-3 (107), gap-1 (32) |
| Padding | px-3 (94), px-4 (78), py-2 (54), p-5 (43) | px-4 (61), px-3 (44), py-2 (30), p-4 (26) |
| Stack margin | mt-3 (87), mt-1 (86), mt-2 (78), mt-4 (69) | mt-2 (38), mt-1 (35), mt-3 (25) |
| Radius, control | rounded-full 167, rounded-xl 134 | rounded-2xl 57, rounded-full 49 |
| Radius, card | 20px (`.lrn-card` learn.css:25, `.rv-card-box` review.css:97) and 24px (`rounded-3xl` on `bb-glow`, 8 of 10) | 16px (`rounded-2xl`; `--radius-card` tokens.css:80); `.card-paper` 20px (cards.css:188) |
| Border | 2px (49 css, 52 tw) | 2px (174 css, 65 tw) |
| Ledge shadow | `0 4px 0` (14), `0 6px 0` (12), `0 5px 0` (8) | `0 4px 0` (31), `0 3px 0` (27), `0 5px 0` (11) |
| Body type | text-sm 410, text-xs 201 | text-sm 22, text-xs 17, text-base 10 (rest in CSS) |

## 2. Page header to first content (site, measured live, 1600px, site header bottom = 61px)

| Route | h1 px | h1 top (gap under header) | Header pad top / bottom | Source |
|---|---|---|---|---|
| #/study-decks | 48 | 109 (48) | 48 / 32 | `PageHeader` default, `ui/page-header.tsx:47` (`pt-8 pb-6 md:pt-12 md:pb-8`) |
| #/schedule | 48 | 109 (48) | 48 / 32 | SchedulePage.tsx:251 |
| #/tutors | 48 | 109 (48) | 48 / 32 | BookTutorPage.tsx:140 |
| #/learn (and lessons layout) | 48 | 85 (24) OUTLIER | 24 / 16 | `pt-5 pb-3 md:pt-6 md:pb-4` LearnPage.tsx:154 |
| #/contact | 48 | 117 (56) OUTLIER | none, own header, `mb-3` | `ui/contact-2.tsx:92` |
| #/terms | 36 (`text-4xl`) | 134 (73) OUTLIER | card `p-6` inside `py-5` | TermsPage.tsx:19-25, hand-rolled `rounded-3xl` header |
| #/faq | sr-only h1; 172px display headline in SlitTypeFaq | n/a | none | FaqPage.tsx:138-139 |
| Workspace | 30 (`text-3xl`) | own, `mb-8` | none | WorkspacePage.tsx:562 |
| Reaction add/draw | 36 (`text-4xl leading-none`) | `py-5` + back link + `mt-5` card | none | ReactionComposerPage.tsx:156-169, ReactionDrawPage.tsx:108-123 |

Dominant: 48px under the site header, 32px to the first block, subtitle `mt-2 text-base` (page-header.tsx:59). Outliers:
- Learn compresses to 24/16 on purpose, but its title sits 24px higher than Review, Schedule and Tutors, a visible jump when switching tabs.
- Subtitle gap is four values for one relationship: PageHeader `mt-2 text-base`; Workspace `mt-1 text-sm`; FolderPage inner `mt-1 text-sm` (FolderPage.tsx:47); Terms `mt-4 leading-7`; Reaction pages `mt-3`.
- Hand-rolled headers (Terms, ReactionComposer, ReactionDraw, Workspace, Contact) are 36px or 30px titles where PageHeader is 48px at md+. Terms/Reaction hard-code `#ccd5ea`, `#5a3fd8`, `stone-950` instead of tokens.

## 3. Page container padding

| Page | Container | Source |
|---|---|---|
| Dominant `SITE_CONTAINER` | `max-w-7xl px-4 sm:px-6 lg:px-8` | `ui/site-nav.tsx:15` |
| Dashboard | pb-5 | DashboardPage.tsx:85 |
| Folder, StudyDecks | pb-8 | FolderPage.tsx:39, StudyDecksPage.tsx:58 |
| Learn, Lessons, Schedule, BookTutor | pb-10 | LearnPage.tsx:151, LessonsPage.tsx:179, SchedulePage.tsx:249, BookTutorPage.tsx:139 |
| DeckPage | pb-16 | review/DeckPage.tsx:212 |
| Terms | `max-w-3xl px-4 py-5 sm:px-6` (no lg:px-8) | TermsPage.tsx:19 |
| ReactionComposer | error branch `py-16`, main `py-5` | ReactionComposerPage.tsx:135, :156 |
| Contact | `max-w-5xl px-6` fixed | ContactPage.tsx:30 |
| Start funnel | `max-w-2xl px-5 sm:px-6` | start/Frame.tsx:80, :119 |
| Sign-in | `max-w-5xl px-4 py-6 sm:px-6` | SignInPage.tsx:74 |

Schedule and BookTutor retype the container string instead of importing `SITE_CONTAINER`; BookTutor is `max-w-5xl`, Schedule `max-w-7xl`. Bottom padding spreads 20/32/40/64px; dominant is pb-10 (4 pages).

Section gaps on the site: Learn `mt-10` (LearnPage.tsx:333), Lessons `mt-8` x2 and `mt-10` (LessonsPage.tsx:305/327/358), StudyDecks `mt-10` then `mt-12` (StudyDecksPage.tsx:64/69/86), DeckPage `mt-14` x2 and `mt-12` (DeckPage.tsx:316/368/370). Dominant 40px; outliers 32 (Lessons), 48 (StudyDecks folders), 56 (DeckPage).

Game (source): Courses `p-4 pb-10 md:p-6` gap-6 (CoursesTab.tsx:87); Train `p-4 pb-10 md:p-6` gap-4 (TrainerTab.tsx:237); Cards Home `px-4 pb-8 pt-4` gap-6 (cards/ui/Home.tsx:77); Me `1rem 1rem 3rem` / `1.5rem 1.5rem 3rem` (me.css); Courses css `1rem 1rem 3rem`; Admin `1rem var(--ah-pad) 3rem`; Shop `1rem 1rem 2rem` (shop.css); Glossary `1rem 1rem 4rem` (glossary.css); Cards tab `1rem 1rem 6rem` (cardsTab.css); Messages `md:p-6 max-w-5xl` (MessagesTab.tsx:111).
Dominant: 16px sides, 24px at md, bottom 40-48px. Outliers: Cards tab 96px, Glossary 64px, Shop and Cards Home 32px. Courses (gap-6) and Train (gap-4) share an identical `max-w-2xl p-4 md:p-6` wrapper. Game top padding: 16px (Cards Home `pt-4`) against 0 on others.

## 4. Type scale

Site page titles: 48px (PageHeader md+), 36px (Terms, Reaction), 30px (Workspace, Start, SignIn `text-3xl sm:text-4xl`), Learn decide-title 28/36px (learn.css:415-416), Home section title `clamp(1.5rem,4.2vw,2.5rem)` (home.css:179). Dominant 48.

Site section h2 (live and source): 24px `text-2xl` in LessonsPage 306/328, UnitPage 325/358, StudyDecks 70/89, DeckPage 318, DeckFolders 110. 20px `text-xl` in SchedulePage 470/545/576, BookTutorPage 185/259, UploadedFolderView 185/220, TutorOnboarding 82. Schedule/Tutors are 20px, Review/Learn/Unit are 24px. Learn live h2s are 36, 22, 17 and 24px on one page (lrn-decide-title, lrn-rail-big, lrn-rail-title).
Site eyebrows: `rv-eyebrow` 12.8px/800 (review.css:98), contact 12px mono, hover-deck `text-xs tracking-[0.14em]` (hover-deck.tsx:185). Three styles.
Site micro type: `text-[0.65rem]` x24, `[0.7rem]` x21, `[0.6rem]` x11, `[11px]` x8, `[10px]` x5, `[13px]` x11, `[0.95rem]` x15. Concentrated in workspace-sidebar, Dashboard, group-chat, study-timer, reference-cards, WorkspacePage, WorkspaceActivity, FeedbackInbox. The game's own `--text-caption` floor is 12px (tokens.css:37).

Game screen titles (h1):

| Size | Where |
|---|---|
| 18px | `.spage-title` streak-page.css:41, `.signoff__title` |
| 20px | `.shop-title` shop.css:54 (22px again at :931, same selector), `.gl-bar__title` glossary.css:59 |
| 24px `--h-1` | `bb-h1`: Shell label (Shell.tsx:467), AdminActivity, AdminViewer, LessonRecap, `.me-subhead-title` me.css:87 |
| 28px | `.me-name` me.css:234, Feed/Leaderboards/Messages `text-[1.75rem]` (md:sr-only), `ah-hello__title` |
| 32px `--h-display` | any `h1.text-scale-2xl` is forced to 32px/900 by theme.css:896-902: Courses, Train, Cards New/Deck, Guidebook, `ug-title` |

Five sizes for a screen title. Shop and Glossary sit at 20px, which is the token for section titles (`--h-2`).
Game section h2: `bb-h2` 20px (me-h2 me.css:120), `text-scale-xl` 22px (Cards Home 122/134, Guidebook 451/482, `gl-section__title` and `nm-h` 1.375rem), `ah-card__title` 18px, `--h-3` 17px. Dominant 20-22; outlier 18.
Game CSS font-size literals: 13px x78, 12px x54, 14px x50, 15px x46, 16px x39, 17px x34, 20px x27, 11px x21, 19px x9. Tokens exist for 12/14/16/18/22/28/40 only, so 13, 15, 17, 11, 19 (about 190 declarations) bypass the scale.

## 5. Radii

Site cards: 16px (glass-folder-cards.css, home-destinations), 18px x3, 20px (learn x10, `rv-card-box`), 24px (`rounded-3xl` x26, `rv-tile`, schedule sheet), 28px (home-sections.css). Five card radii from 16 to 28. Dominant: 20px in CSS and 24px in Tailwind, which disagree.
Game cards: 16px dominant (cards x9, rounded-2xl 57), 20px (`card-paper`), shop 0.875/1.125/1.25/1rem, feed 14/16/20/22/26px, me 0.625/0.75/0.875/1rem, cards tab 0.8/0.9rem. Outliers: shop 18px, feed 22px and 26px, me 14px.
Sheets are consistent: `24px 24px 0 0` in learn.css, schedule.css, shop.css, streak-page.css.

## 6. Shadows and ledges

Ledge depth `0 Npx 0` in game CSS: 4px x31, 3px x27, 5px x11, 6px x9, 2px x6, 1px x2, 7px x1. Site: 4px x14, 6px x12, 5px x8, 8px x2. The site favours 5-6px; the game 3-4px. Strays: 7px (game), 8px (site), `inset 0 -4px 0 #c98a00` (hard-coded), `shadow-[0_4px_0_rgba(0,0,0,0.18)]` x2 (no token).
Soft shadows: site Tailwind `shadow` 66, `shadow-sm` 34, `shadow-lg` 11, `shadow-xl` 10, plus `shadow-[0_28px_90px_rgba(0,0,0,0.48)]` x2 and neumorphic inset pairs x4. Game has `--shadow-1..4` (tokens.css:199-205, 295-298, 346-349) but Tailwind `shadow` (34) does not map to them. Soft drops conflict with the flat ledge idiom.
Two mechanisms for the same ledge: `border-b-4` rows (LeaderboardsTab.tsx:268, FeedTab.tsx:496/660) against `box-shadow 0 Npx 0` elsewhere.

## 7. Flagged list, by visible impact

1. Game screen title: five sizes (18/20/24/28/32). Movers: shop.css:54/931, glossary.css:59, me.css:234; theme.css:896 sends `text-scale-2xl` h1 to 32 while `bb-h1` is 24.
2. Site header top spacing: Learn 24/16 against 48/32; Contact 56 and Terms 73 differ again. Terms, Reaction pages, Workspace bypass `PageHeader`.
3. Site section h2: 20 vs 24px (Schedule, BookTutor, UploadedFolder vs Learn, Unit, Review).
4. Card radius: site 16/18/20/24/28; game 14-26.
5. Bottom padding: site 20/32/40/64; game 32/40/48/64/96. Section gaps 32/40/48/56.
6. Ledge depth: game 3-4, site 4-6; strays at 1, 2, 7, 8.
7. Off-scale type: game 11/13/15/17/19px literals; site 10-11px and 0.6-0.7rem micro type (60+ uses).
8. Courses vs Train gap-6 vs gap-4 on identical wrappers (CoursesTab.tsx:87, TrainerTab.tsx:237).
9. Schedule/BookTutor retype the container; Terms drops `lg:px-8`.
10. `.shop-title` defined twice (shop.css:54 and :931).

## 8. Not covered

Game routes measured live (auth gate), dark theme, mobile widths (only `PageHeader` breakpoints read from source), lesson runner and beat screens (bespoke raw values), `documentation/` HTML. No source was edited.
