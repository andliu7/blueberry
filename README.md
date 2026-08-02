# Grignard LCTA Master List

An interactive study app for reviewing Grignard reaction lab concepts (LCTA). It presents 44 review questions — short-answer and multiple-choice — with expandable answers, LaTeX chemistry notation rendered by MathJax, and a self-rating system (Review / Almost / Got It) whose progress persists in the browser via localStorage.

## Features

- 44 Grignard lab questions with expandable answer cards
- Multiple-choice questions with instant right/wrong feedback
- Recall self-rating (red / yellow / green) with a progress tracker
- "Needs Review" filter, sort by number or difficulty, and shuffle
- Carousel study mode and confetti when you finish
- MathJax rendering for chemical formulas and math notation

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Motion/GSAP · MathJax 3 (CDN)

## Development

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # type-check and build production bundle to dist/
npm run preview  # preview the production build
npm run lint     # run oxlint
```

## Branches

- `main` — application source code
- `gh-pages` — built production output (deployable static site)
