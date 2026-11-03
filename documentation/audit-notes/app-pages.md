# Audit: the APP half (src/game), read-only, 2026-10-29

Method: source read (TSX + CSS), no dev server, no screenshots. Paths are under `src/game/`. Not seen in a browser; spacing numbers are from CSS, not measured.

## 1. Headline: page titles have no single scale
The scale exists (`theme.css:293-296`: --h-1 24px screen title, --h-2 20px section, --h-3 17px card; `.bb-h1` at `theme.css:903`). Screens do not use it. Page-title size by screen:

| Screen | Element | Size | Where |
|---|---|---|---|
| Train | h1 `text-scale-2xl` | 32px (forced up by `.bb-game h1.text-scale-2xl`, `theme.css:893-901`, weight 900) | `tabs/trainer/TrainerTab.tsx:237` |
| Courses | h1 `text-scale-2xl` | 32px (same override) | `tabs/courses/CoursesTab.tsx:88,212` |
| Feed | h1 `text-[1.75rem]` | 28px, sr-only at md+ | `tabs/feed/FeedTab.tsx:718` |
| Leaderboards, Messages | h1/h2 `text-[1.75rem]` | 28px | `LeaderboardsTab.tsx:385,405`, `MessagesTab.tsx:118` |
| Me sub-screens (Settings, pKa) | `.me-subhead-title` | 24px, centred | `tabs/me/me.css:82`, `MeTab.tsx:777` |
| Shop | `.shop-title` | 20px, centred | `shop/shop.css:50`, `ShopPage.tsx:337` |
| Glossary | `.gl-bar__title` | 20px | `glossary/glossary.css:57` |
| Shell label (Path only, lg+) | `.bb-h1` | 24px | `app/Shell.tsx:467` |
| Not-open stub | h2 `.bb-h1` | 24px | `app/ui/NotOpenYet.tsx:34` |

So the same kind of element is 20, 24, 28 and 32px, centred on some screens and left on others. Fix: pick --h-1 (24) or the 32 display step for every screen title, route all through `.bb-h1`, delete the `h1.text-scale-2xl` override and the `text-[1.75rem]` one-offs.

Section headings are just as loose: Feed `.feed-heading` 22px (`feed/feed.css:201`), Me `.me-h2` 20px (`me.css:117`), Shop `.shop-h2` 24px (`shop.css:97`) which is larger than Shop's own page title (20px), Glossary section 22px (`glossary.css:145`), Cards shelf title 18px (`cardsTab.css:184-193`, shared by set/done/learn/import titles), pchal 20px (`pathSideTabs.css:42`), Search group 13px caps, Leaderboards/Chat `text-lg` 18px and `!text-xl`. Shop is the worst: section heading (24) bigger than page title (20).

## 2. Header, subtext, content spacing
- No shared pattern for "title, then subtext, then content". Train: h1 then `ProblemBrowser`, no subtext, gap 16px (`gap-4`, `TrainerTab.tsx:236`); the card's own header has an 18px title and 12px blurb with no gap set (`ProblemBrowser.tsx:37-40`, `p-4`), so they touch at line-height.
- Heading margins: `.me-h2` bottom 12px, `.shop-h2` 12px, `.gl-section__title` 4px, `.gl-group__title` 8px, `.sr-group__title` 8px, `.pchal__h` 12px, `.cs-lede` 4px. `.feed-heading` sets no margin; spacing comes from `gap-3` on the wrapping section (`FeedTab.tsx:766`). Pick one: title to first content 12px, title to subtext 4px.
- Column widths differ per screen: Train 672px (`max-w-2xl`), Search 640 (`search.css:15`), Settings 640 (`me.css`), Glossary 704 (`glossary.css:68`), Shop 512 (`shop.css` `.shop-main`), pchal 448, Courses `max-w-xl`. Side padding is 16px nearly everywhere; Train/Courses use `p-4 md:p-6`.
- Dead CSS: `.cs-title`, `.cs-lede`, `.cs-kicker` (`courses.css:27-45`) are not used by any TSX; they say 32px while CoursesTab renders utility classes. A trap for the next editor.

## 3. Missing or hidden page headings (a11y plus hierarchy)
- Search (`tabs/search/SearchTab.tsx`): no h1 or title; the screen opens on a speech bubble. Focus (`tabs/focus/FocusTab.tsx:52`) and Periodic (`PeriodicTab.tsx:224`, toolbar only): no heading. Chat has h1 `sr-only` only (`ChatTab.tsx:163`).
- Shell h1 for the Path is `hidden lg:block` (`Shell.tsx:467`): `display:none` removes it from the accessibility tree, so below lg the home screen has NO h1, the defect the comment at `Shell.tsx:458-463` says was fixed. Use `sr-only` below lg.
- Feed h1 is visible below md and sr-only at md+ (`FeedTab.tsx:718`), but the Shell label that replaces it only shows at lg, so md to lg shows no visible title.
- Shop: `<section aria-labelledby="shop-freeze">` (`ShopPage.tsx:345`) points at an id that exists nowhere in `shop/*.tsx`. Dangling label.
- Heading order: Path's only heading is an h2 wrapping the unit picker button (`PathwayTab.tsx:2280`); Cards hero uses an h2 for the caption eyebrow "Today's review" (`CardsShelf.tsx:79`) while the big number is a `<p>`.

## 4. Owner rules of 29 Oct vs the code (STATUS.md owner block)
- Side tabs: owner wants Shop, Challenges, Tasks, Quests down the LEFT edge, each with an icon. Today `PathSideTabs` is a horizontal 3-column strip under the header: Path, Challenges, Shop (`tabs/pathway/PathwaySideTabs.tsx:20-32`, `pathSideTabs.css:1-9`). No Tasks tab; Quests are a section inside Challenges (`PathwaySideTabs.tsx:110,132`). It is not at the left edge and it costs vertical space (sticky, measured into `--pside-h`, lines 41-55).
- Off-palette colours in that file: `#6d4fd6`, `#8b6df2` (`pathSideTabs.css:27-29,108,130-131,181-182`; also comments in `pathway.css:157,249,300,721`). Primary is `#5a3fd8` (`theme.css:207`). 16 hits in total. Tokens `--bb-primary` and `--bb-primary-lip` exist and the unit card already uses them (`pathway.css:1715-1717`).
- Top-right HUD (`app/ui/Hud.tsx:659`): readouts are streak, diamonds, charge; XP is a separate stage badge (`XpStage`), not a counter in the group. Focus ring is `outline: 2px --bb-primary, offset 1px` (`hud.css:198-201`) and hover and focus-visible share one ground (`hud.css:186-189`), so keyboard focus is just a thin ring on a transparent cell in a flex row that may clip it. Needs a 3px ring with 2px offset, visible overflow on `.hud-row`, and a one-tap-target-per-counter check at 390px (header budget comment, `Shell.tsx:445-455`).
- Bottom bar: NAV_TABS is Path, Train, Cards, Feed, Me, so Shop, Glossary and XP are not in it. That part of the rule holds. Shop still has its own close-X header and a second balance counter when not embedded (`ShopPage.tsx:333-340`).
- Notices pushing the page: the Focus eye-rest banner is `position: fixed` (`focus/focus.css:5-21`), fine. The "feedback saved" notice was not audited.
- Focus screen uses unprefixed site tokens (`--primary`, `--border`, `--card`, `--muted-foreground`, `focus.css`) from `index.css:54-90`, not the game's `--bb-*`. They resolve to the violet via a scope override at `index.css:1635`; outside it they are slate-900. Move to `--bb-*`.
- Fonts: Nunito display via `--font-display` (`tokens.css:28`); two hard-coded `Nunito, system-ui` stacks bypass the variable (one in a `.ch-*` SVG rule, one other).

## 5. Grid and hierarchy per tab (brief)
- Path: unit card is the only title; chip rows, a divider (`.path-divider__title` 17px, eyebrow 12px, `pathway.css:2246-2262`), chest rows. Good hierarchy, but the 17px divider is the smallest title on any screen yet marks the biggest structural break.
- Train: accordion list; unit headings are h3 at 14px in buttons (`ProblemBrowser.tsx:55`) under a 32px h1 and an 18px h2: 32, 18, 14 is a steep, uneven jump. Badge text is 10px (`text-[10px]`, line 74), below the 12px caption floor (`tokens.css:37`).
- Cards: hero number 32px/900 (`cardsTab.css:85`), shelf titles 18px; hero eyebrow and weekday labels share one 12px caps rule (`cardsTab.css:73-83`). Clear.
- Feed: card stream, heading 22px, quests below, right rail "More" on wide screens. The Feed hides the HUD entirely (`Shell.tsx` near line 476), so diamonds and energy vanish on the one screen that lists quests.
- Me: profile, week, badges, calendar, stats; `.me-h2` 20px, `.me-group-title` 13px caps, `.me-row-title` 16px. Consistent inside, unlike every other screen.
- Periodic, Search, Focus: tool screens with no title and their own widths.
- Admin screens (`admin/`): not audited here.

## 6. Animations
Keyframes per file: theme.css 21, chestOpening 10, hud 8, pathway 7, pathUnlock 7, backdrop 7, pathStars 6, shop 6, then cards, feed, preview, startpop, bloom-tray 3 to 4 each.
- Reduced motion is honoured two ways: `@media (prefers-reduced-motion)` and `html[data-motion="reduced"]` (pathStars, focus). `pathStars.css` uses only the attribute for 6 keyframes (`pathStars.css:181-189`); confirm the attribute is also set from the OS query, or users whose OS asks for none still get the star field. `course-chip.css`, `courses.css`, `search.css` have only transitions with no guard (low risk).
- Path header reveal: per-letter rise on every unit page turn (`PathwayTab.tsx:2295-2310`, `.path-reveal`); has a `--still` variant. It replays on every unit switch; owner wants calm, so consider once per session.
- Pathway layers star field, Bloom, chest, unlock celebration and the reveal at once; no frame budget measured here.
- Press feedback is shared (`press.css`, `.btn3d`), but Focus (`focus.css:34-40`) and Search each re-declare their own lip and sink: three implementations of one effect.
- Easing is mixed: `cubic-bezier(.2,.9,.25,1)` (focus), `ease-out` (pathStars), `cubic-bezier(0.3,0.6,0.4,1)` (shoot). No shared motion tokens.

## 7. Rule checks
- Calculator: none in game TSX (case-insensitive grep, no hit). Good.
- Tools hidden during challenges and tests: Periodic and Search are header tools (`TOOL_TABS`); not verified that the rail hides in `ReviewRun`/`TestOutRun` (the latter is an uncommitted file I did not open).
- Lavender ground, Nunito, `#5a3fd8`: tokens agree (`theme.css:207`, `tokens.css:28`). Only the side tabs break it.

## 8. Fix list, ordered by value
1. One page-title step (`.bb-h1`, left aligned) on Train, Courses, Feed, Leaderboards, Messages, Shop, Glossary, Me sub-screens; delete the `h1.text-scale-2xl` override (`theme.css:893-901`).
2. Give Search, Focus, Periodic a title (visible or sr-only); change `hidden lg:block` to `sr-only` at `Shell.tsx:467`.
3. Fix `aria-labelledby="shop-freeze"` (`ShopPage.tsx:345`).
4. One heading-to-content spacing rule (title 12px to content, 4px to subtext); stop Shop section titles outranking the page title.
5. Rebuild PathSideTabs as a left rail with Shop, Challenges, Tasks, Quests plus icons, using `--bb-primary`; remove `#6d4fd6`/`#8b6df2`.
6. HUD: put XP in the counter group; stronger focus ring (3px, 2px offset); unclip.
7. Move Focus to `--bb-*`; delete dead `.cs-*` rules; raise the 10px badge to 12px.
8. Shared motion tokens (duration, easing) and one reduced-motion guard covering both the media query and `data-motion`.

Files touched: only this note. No source edited.
