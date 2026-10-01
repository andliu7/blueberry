# Cinematic phone section

Adapted from the supplied CinematicHero for Blueberry. The phone is an interactive preview, not a screenshot of a signed-in account. Learn, Practice, and Review switch the preview; each links to the corresponding real route. No fictional streaks, sobriety data, store downloads, or account statistics.

Blueberry uses React, TypeScript, Tailwind 4, GSAP, and Lucide already. Components live in `src/components/ui`, utilities in `src/lib/utils.ts`, and global styles in `src/index.css`. `@` points to `src`. A `components.json` file makes these paths explicit to the shadcn CLI. Run `npx shadcn@latest add <component>` from the project root to add another primitive. No framework initialization is needed.

The portfolio uses TypeScript, Tailwind 4, and shadcn already. Components live in `components/ui`, global styles in `app/globals.css`, and `@` points to the project root. Its existing `components.json` declares these aliases. GSAP is the only added dependency.

Keeping this component in the existing UI folder preserves the `@/components/ui/cinematic-landing-hero` import and the shadcn CLI conventions. Creating a second root-level UI folder in Blueberry would break that alias.

`cinematic-landing-hero.css` is scoped to `.cinema-showcase` so it cannot restyle other cards, headings, or progress rings. There are no external image requests or context providers. `cinematic-hero-demo.tsx` shows basic usage without replacing an existing demo route.

Props: `brandName`, `cardHeading`, `cardDescription`, `lessonHref`, `practiceHref`, `reviewHref`, and native section attributes. Defaults are Blueberry's local routes. Portfolio supplies absolute Blueberry URLs.

GSAP and ScrollTrigger load when the section approaches the viewport. Desktop scroll rotates and raises the phone inside a short pinned section. Small screens flow normally; reduced motion has no scroll or pointer animation. MatchMedia reverts timelines and listeners on preference changes and unmount. Tabs support arrows, Home, End, and keyboard focus.

The integration sits after Blueberry's feature board, preserving direct access to the app. On the portfolio it replaces the existing Blueberry browser screenshot and preserves the project description and source links. No whole-page animation or recovery-app copy is added.
