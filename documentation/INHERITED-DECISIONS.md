# Inherited decisions

Read this before Phase 0. Every item here is a decision already made, on evidence, in
`andliu7/blueberry` or in its `MECHANISM_TRAINER_PROMPT.md`. Reopening one costs time and, in
two cases, costs a repository. If you believe one is wrong, say so and stop. Do not work
around it quietly.

Source for all of it: https://github.com/andliu7/blueberry

---

## D1. This is a separate repository, and that is measured, not stylistic

`MECHANISM_TRAINER_PROMPT.md` in the Blueberry repo gives two numbers:

- `ketcher-standalone/dist/main.js` is 15.5 MB and `ketcher-react` a further 3.1 MB, because
  standalone mode inlines the entire Indigo WASM engine. Blueberry's heaviest existing chunk is
  890 kB and already had to be made lazy.
- Blueberry commits its build output to git. `docs/` is not in `.gitignore`, 84 commits already
  touch it, and Vite content-hashes filenames, so every build writes new blobs that never
  delta-compress. Its `.git` is 34 MB against a packed size of 862 KiB.

Consequence for this repo, from the first commit:

- `dist/` is in `.gitignore` on day one. Never commit build output.
- Deploy through a GitHub Actions workflow that builds on push, not a committed folder.
- Every heavy import goes behind `React.lazy` plus `Suspense` with a real loading state.

The earlier draft of the build prompt said `apps/web` was "the existing Blueberry app." That was
wrong and is corrected. `apps/web` is a new app in this repository that shares Blueberry's visual
language. Blueberry itself is a read-only reference.

## D2. Ketcher is the editor, and it is enormous, so it is route-gated

Blueberry already ships `ketcher-core`, `ketcher-react`, and `ketcher-standalone` at 3.14.0,
verified building clean against React 19 with no polyfills and no `--legacy-peer-deps`.

Two failures already paid for, quoted from `src/components/ui/molecule-canvas.tsx`, both of which
a fresh builder will otherwise rediscover the expensive way:

- One `StandaloneStructServiceProvider` per editor instance, created in `useMemo`, never at module
  scope. Sharing one across three editors deadlocked: `setMolecule` on the first never resolved
  and never rejected, and the editor sat on its spinner forever. The Indigo engine is not
  reentrant across editors.
- `disableMacromoleculesEditor` is required. Without it, mounting a second editor threw
  "Cannot read properties of undefined (reading 'events')" out of Ketcher's own `EditorEvents`
  and took the page into the error boundary. Nothing in this course is a peptide.

## D3. Three chemistry engines are in play and each needs a stated job

This is the decision most likely to be made inconsistently across files if it is not fixed now.

| Engine | Where it runs | Job | Never used for |
|---|---|---|---|
| `chem-core`, pure TypeScript | Browser, every interaction | Valence, mass, formal charge, electron bookkeeping, arrow legality. Must answer inside the 100 ms budget | Canonicalization, CIP labelling, aromaticity perception |
| Indigo, via `ketcher-standalone` | Browser, already loaded on editor routes | Canonical SMILES for structure equivalence, as `src/lib/checkAnswer.ts` already does | Per-keystroke checks. It is behind a lazy route and may not be loaded |
| RDKit | CI only, Python sidecar | The oracle that grades chem-core's TypeScript against a reference implementation. CIP descriptors, meso detection | Shipping. It never enters a bundle |

Do not add `@rdkit/rdkit` WASM to the client. `MECHANISM_TRAINER_PROMPT.md` proposed it for
canonical SMILES comparison, which was sound before Indigo was already in the bundle. Loading a
second multi-megabyte chemistry engine to do a job the first one already does, and that
`checkAnswer.ts` already does with it, is a payload for nothing. If you disagree, measure both
and report the numbers before choosing.

## D4. The mascot behaviour machine exists and is the architectural precedent

`src/lib/berryBehaviour.ts` in Blueberry, 402 lines. Read it before writing `chem-core`, because
it already solves the problem this repo has to solve again.

Its own header states the rule: "No `three`, no `react`, no DOM. Pure data and numbers, so the
same machine can drive a React Native renderer later without carrying a WebGL dependency across."
That is exactly the `chem-core` contract, already proven in this codebase by the same author.

Its second idea is worth stealing directly. Mood and behaviour are two composing axes rather than
one flat list, because a mood is a face that persists and a behaviour is a motion with a
lifecycle, and flattening them would mean the berry cannot be stressed and bounce at once. The
mechanism engine has the same shape: what a step *is* and what a student's attempt *resolved to*
are two axes, not one enum.

Behaviours available: `idle`, `sleepy`, `leanIn`, `squash`, `bounce`, `wideEyed`, `celebrate`,
`stressed`, `drag`, `wave`. Families: `ambient`, `reactive`, `event`. Every behaviour blends
rather than snaps, and a blend can be retargeted mid-flight, so feedback never queues up behind
a finishing animation. Do not rebuild any of this. Import it.

## D5. Auth is solved, including the part that looks like a bug

Blueberry uses Google OAuth plus email OTP as a six digit code, not a magic link. The reason is
recorded and is not arbitrary: GitHub Pages serves from a subpath with no server to rewrite
anything, and the app routes on the hash, so a confirmation link carrying its own
`#access_token=...` and a router that owns the hash fight over one field. A code sidesteps the
category. This requires the Supabase email template to send `{{ .Token }}` rather than
`{{ .ConfirmationURL }}`.

Also settled: `flowType: "pkce"`, `persistSession: true`, `detectSessionInUrl: true`, and
`prompt: "select_account"` on the OAuth call so Google shows the chooser instead of silently
reusing whatever session the browser has. And one rule that reads like superstition and is not:
never `await` a Supabase call inside `onAuthStateChange`, it deadlocks the internal lock.

## D6. The RLS pattern is already correct and is the template

Blueberry's migrations are a working model. Reuse the shape.

- `mechanism_attempts` already exists: `user_id`, `reaction_id`, `is_correct`, `steps_taken`,
  `attempted_at`, indexed on `user_id`, with select-own, insert-own, and select-staff policies and
  deliberately **no update or delete policy for anyone**, on the stated ground that a student
  editing their own history is not a feature.
- `is_staff()` and `current_user_role()` are `security definer stable` SQL functions reused in
  every policy rather than reimplemented per table.
- `staff_roster`, keyed by lowercase email, is the authorization source of truth. A trigger
  assigns role at signup and propagates demotions live.

One thing to carry forward as a permanent adversary fixture. A real privilege escalation existed
and was fixed with a **column-level GRANT**, not a policy:

```sql
revoke update on public.profiles from authenticated;
grant update (full_name, institution) on public.profiles to authenticated;
```

RLS filters rows, not columns. Without that grant, a student could `UPDATE profiles SET
role='owner'` on their own row and pass every row-level policy. Any table in this repo with an
entitlement or progress column has the same exposure, and reasoning about the policy will not
find it. The adversary must attempt the write.

## D7. Two real gaps in the existing app, inherited as work

**Progress is localStorage only.** `src/lib/progress.ts` writes to
`grignard_lcta_progress_v1` and never touches Supabase, even though `mechanism_attempts` exists
in the schema for exactly that purpose. It is also a mutable status map, not append-only. This
repo writes progress server-side and append-only from the start.

**The AI spend gate is unverifiable from the code.** Blueberry's "Ask Blueberry" chat posts to a
Google Apps Script endpoint. The Anthropic key correctly lives in Apps Script properties and never
in a `VITE_` variable. But the rate limit and token budget, if any, live in `apps-script/grignard.gs`
outside the inspectable client, and no limiting is visible from this side. Treat the existing gate
as unproven, not as absent, and do not copy its architecture without reading that script.

Decision needed before Phase 6: Supabase Edge Function or Apps Script. Edge Function is the
recommendation, because the budget counter needs a transaction against the same Postgres that
holds the usage rows, and a race between two concurrent requests is exactly the failure an HTTP
endpoint with separate storage loses. State the choice and the reason before writing the feature.

## D8. Environment variables, settled

Client, all inlined into the public bundle at build time, all non-secret by design:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_CLIENT_ID`.

Server only, never `VITE_` prefixed, never in the repo: the Supabase `sb_secret_...` key and the
Anthropic API key.

## D9. Author profile, which changes how you write, not just what you write

From `MECHANISM_TRAINER_PROMPT.md`, in the author's words: strong in Python and Java, weak in React
and TypeScript, able to read code and follow along but not yet able to write idiomatic React from
scratch or reliably tell normal patterns from exotic ones. The stated goal is to understand the
codebase, not to accumulate diffs that cannot be maintained.

So:

- Explain the why of a structural decision before writing the code for it.
- When you use a React pattern that is not obvious, name it in one line and say what it is for.
  Refs, context, portals, `useSyncExternalStore`, custom hooks, render props.
- If the request is a bad idea, say it is a bad idea and why, then say what you would do instead.
  Do not just build it.
- Prefer boring and well maintained over clever. This has to be debuggable alone at 1am before an
  exam.

## D10. Windows, and the specific aliases that bite

PowerShell 5.1. `&&` is a parse error. `curl` is aliased to `Invoke-WebRequest`, so real curl is
`curl.exe`. `rm -rf` is `Remove-Item -Recurse -Force` and `cp -r` is `Copy-Item -Recurse`.

## D11. iPad and stylus are targets, not afterthoughts

`MECHANISM_TRAINER_PROMPT.md` names iPad Safari as a target and Apple Pencil as first class,
via `pointerType === 'pen'`, `e.pressure`, and `touch-action: none` for palm rejection. The
earlier build prompt omitted stylus entirely. The interaction state machine in Phase 2 must model
pen as a distinct pointer type from touch and mouse, not fold it into touch.

## D12. Two Vite settings that are not optional, both found by running it

From `vite.config.ts` in the sibling repo, both with the failure recorded next to them.

```ts
define: {
  global: 'globalThis',
  'process.env': JSON.stringify({ NODE_ENV: mode }),
},
server: { port: 5173, strictPort: true },
```

**The `define` block.** Ketcher reads `process.env` at runtime and `process` does not exist in a
browser. Vite does not shim it, because that was a webpack convention. Without this the drawing
route throws `ReferenceError: process is not defined` the moment it loads, React unmounts the tree,
and you get a blank page with nothing in the console pointing at the cause. The comment notes this
was carried from `mechanism_trainer/vite.config.ts` and that bringing `MoleculeCanvas` across
without it reproduced the same failure. The two files are a pair. This is also flagged as the single
most likely thing to break on a Ketcher upgrade.

**The pinned port.** Google Identity Services matches the page origin against the OAuth client's
authorised list exactly, port included, and that list holds `http://localhost:5173`. Vite's default
is to shrug when a port is busy and take the next free one, so a stray dev server left running moved
the site to 5176 and sign-in started failing on an origin Google had never heard of. `strictPort`
turns that into an error at startup instead of a broken sign-in half an hour later.

## D13. Phase gating conflicts with the stated preference, and here is the resolution

`MECHANISM_TRAINER_PROMPT.md` asks for phases where "each phase ends in something I can click on,"
and says Phase 1 should be the smallest thing that proves the hardest assumption.

The gauntlet phases in `BUILD-PROMPT.md` do not do that. Phase 0 ends in a green validator suite and
Phase 1 ends in a passing corpus. Neither is clickable. That is deliberate, because a loop with no
numeric exit does not terminate, but it is a real cost and it should not be discovered as a surprise
three days in.

The resolution is to run the spike the trainer prompt already specifies, in parallel, on a branch,
as an explicit throwaway that is deleted rather than merged:

> Render Ketcher, subscribe to `ketcher.editor.subscribe('change', ...)`, pull live atom coordinates
> out, and keep a plain SVG dot glued to one specific carbon while the structure is dragged around.

That is the assumption that, if wrong, makes the architecture wrong, because curved arrows have to
anchor to atom 7 rather than to pixel (240, 180). It is worth knowing in week one rather than in
November. It is not gauntleted, it is not validated, and it does not gate Phase 0. It exists to
answer one question and then be thrown away.
