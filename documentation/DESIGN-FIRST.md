# Design first: the Elephant-Goldfish process for Blueberry

Source: the `egm` plugin (google/elephant-goldfish-model), installed as `egm@egm`.
This file is how that plugin plugs into Blueberry. The plugin's own docs live in
`~/.claude/plugins/marketplaces/egm/docs/`.

## The idea in one paragraph

A session that brainstorms, designs and codes in one thread ends up agreeing with
itself. So split the roles. The **Elephant** is this session: it remembers
everything and drafts. A **Goldfish** is a fresh subagent that sees only the draft
spec and the live code, with no chat history, so it cannot be talked into the
author's mistakes. You are the **human**: you own every decision. Code is written
only after the Goldfish swarm has failed to break the design.

## When it applies (and when it does not)

Use it for work where a wrong design costs more than a wrong line of code.
This matches the rulebook's "Loop discipline" split, so the two do not fight.

| Work | Use EGM? |
|---|---|
| New feature, new table, new route, new trainer type, new Edge Function | Yes, full flow |
| Anything touching money, access, RLS, entitlements (Phases 0-3, 6-8) | Yes, full flow, no shortcuts |
| Bug fix, typo, copy tweak, restyle | No, just do it |
| Visual feel, pacing, onboarding copy (Phases 4, 5, 9) | Brainstorm only. Taste is a human gate, a critic loops on it forever |

## The flow

```
/egm:egm-brainstorm  ->  /egm:egm-draft  ->  /egm:egm-review  ->  /egm:egm-resolve  ->  build
   concepts_brief.md      design_draft.md      review reports        fixed spec          gauntlet loop
```

Every stage writes a file. Nothing long is pasted into chat.

1. **Brainstorm.** You describe the idea. Claude asks open questions over several
   turns, then you confirm "Review with Goldfishes". Six fresh lenses attack it:
   YAGNI, cost and quota, ergonomics, migration, observability, tech debt.
   Output: `concepts_brief.md`.
2. **Draft.** Claude writes the design section by section. You approve each
   section before the next. Output: `documentation/designs/<feature>.md`.
3. **Review.** The Goldfish pipeline runs in a fixed order, because each stage
   assumes the one before is clean:

   | Stage | Goldfish | Question it answers |
   |---|---|---|
   | 5 | Zoom Out | Is this the simplest thing? Does it reuse what we have? |
   | 6 | Comprehension | Can a stranger understand it without background? |
   | 7 | Design Critic | Does it scale, and what breaks first? |
   | 8 | Implementation Readiness | Are file paths, signatures and tests specified? |
   | 9 | Final check | Did the fixes hold? |

4. **Resolve.** You triage each finding: accept, reject, or defer. Claude patches
   the spec for accepted ones.
5. **Build.** Only now. Implement against the approved spec, using the existing
   builder / validator / adversary loop from the rulebook (Loop discipline).
6. **Drift check.** Occasionally run `/egm:egm-drift-report` to see if the code
   moved away from its spec.

## Blueberry rules layered on top

- **Spec home:** `documentation/designs/<feature>.md`. Prose never goes in `docs/`
  (wiped on publish). The artifact directory line in `AGENTS.md` points here.
- **Goldfish cannot see our rulebook.** Reviewers run with `omitClaudeMd`, so they
  do not read `AGENTS.md`, `CLAUDE.md` or this file. That is the point, but it
  means constraints must be passed in. When running `/egm:egm-review`, give it
  this GoldfishContext (absolute paths under `grignard/grignard-app-source/`):
  - `documentation/CLAUDE-blueberry-game.md` (budgets, non-negotiables, chemistry rules)
  - `documentation/DATA-MODEL.md` (any feature that stores data)
  - `documentation/STATUS.md` (what exists now)
  - `documentation/INHERITED-DECISIONS.md` (decisions already settled)
- **Security is a design question, not a build question.** Every spec for a feature
  that stores data or gates access must have a section stating: which table, which
  RLS policy, which column GRANT, which server-side check enforces money or access.
  If the spec cannot name them, it fails Stage 8.
- **Chemistry in a spec must say how it is derived.** "RDKit computes X", never
  "the lesson states X".
- **Budgets are in the spec.** Bundle size, lazy-loaded imports (Ketcher), and
  token cost per interaction, taken from the rulebook's Budgets section.
- **Never weaken a check to pass review.** If a Goldfish finding is rejected,
  write the reason in the spec. Do not reword the spec to dodge the finding.
- **Feature freeze:** if one is declared, brainstorm may run but draft does not.
  New ideas go to a parked list.

## How the plugin behaves in Claude Code (gotchas)

- These skills are **user-typed only**. Claude cannot launch them with the Skill
  tool. You type the slash command; Claude reads the SKILL.md and follows it.
- Use the `/egm:` prefix: `/egm:egm-brainstorm`, not `/egm-brainstorm`.
- Needs Claude Code 2.1.271 or later, or the Goldfish is not truly isolated.
- Review stages run in order. Reviewers within one stage run in parallel.
- Goldfish cannot open URLs. Save a page to a file and pass the path.
- A swarm costs real tokens (6 reviewers per stage). Do not run full review on a
  small change.

## Skill cheat sheet

| Type this | Does | Use when |
|---|---|---|
| `/egm:egm-brainstorm` | Interview, then 6-lens Goldfish shootdown, writes `concepts_brief.md` | Idea is half-baked |
| `/egm:egm-draft` | Section-by-section design doc, you approve each | Brief is settled |
| `/egm:egm-review <path>` | Full Goldfish pipeline. Pick interactive or consolidated | Draft is complete |
| `/egm:egm-review <path> feature_spec` | Design quality only, skips implementation checks | Early draft |
| `/egm:egm-review <path> implementation` | Readiness only | Design is solid, checking buildability |
| `/egm:egm-resolve` | Triage findings, apply patches | After any review |
| `/egm:egm-review-loop` | Review dispatch engine, used by review itself | Rarely called directly |
| `/egm:egm-drift-report` | Compares specs to live code | Weekly, or before a release |
| `/egm:egm-bootstrap` | Generates README docs for a codebase folder by folder | One-off, on `src/game/` |
