# Grignard LCTA Master List

An interactive study guide for the Grignard synthesis lab (LCTA). 44 review
questions — short answer and multiple choice — with expandable answers, LaTeX
chemistry rendered by MathJax, and a self-rating system whose progress persists
in the browser.

**Live:** https://andliu7.github.io/grignard_LCTA/

## Features

- 44 questions with expandable answers; multiple choice gives instant feedback
- Rate your recall (Review / Almost / Got It) with a progress bar, and a
  "Needs Review" filter that hides anything already marked green
- Sort by number or difficulty, shuffle and unshuffle
- Three views, cycled from one control: **List**, **Carousel** (one at a time),
  and **Scroll** (cards rise into focus and tilt away as you pass them)
- Expand All / Collapse All, jump to bottom, and a hold-to-confirm reset, all in
  an expandable toolbar
- Light and dark themes with an animated sun/moon toggle
- Cards react to the cursor: a spotlight glow in light mode, a 3D tilt in dark
- Draggable scratch notes, and a feedback form
- Progress and notes survive a reload via `localStorage`

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Motion · GSAP · MathJax 3 (CDN)

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Feedback collection

The feedback form always keeps a copy in the visitor's browser under
`grignard_lcta_feedback_v1`. If `VITE_FEEDBACK_ENDPOINT` is set it also POSTs
each submission there — a Google Apps Script web app that appends a row to a
private sheet.

Copy `.env.example` to `.env.local` (gitignored) and set the URL. With it unset,
nothing is transmitted anywhere.

Note that the endpoint is compiled into the client bundle and is therefore
public on the deployed site. It grants write access to the script only, never
read access to the sheet.

## Deployment

GitHub Pages serves the **`main` branch, `/docs` folder**. To publish:

```bash
npm run build
rm -rf docs && cp -r dist docs && touch docs/.nojekyll
git add docs && git commit -m "Publish" && git push
```

`.nojekyll` stops Pages running the output through Jekyll. `vite.config.ts` sets
`base: './'` so the build works from a subpath.

A `gh-pages` branch also carries an identical copy of the build, kept for the
history and for anyone who prefers branch-based publishing.
