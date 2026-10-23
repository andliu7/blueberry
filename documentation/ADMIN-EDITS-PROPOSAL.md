# Admin edits in place: proposal (not applied)

Queue item 23 asks for staff to edit lesson text in place, saved server side.
The viewer shipped on 23 Oct is read only (`src/game/admin/`, `#/app/admin`).
Saving needs a table and RLS first. This file is the proposed server change.
**Nothing here has been applied.** No file was added under `supabase/migrations/`.

## Recommendation: extend `public.course_overrides`

The table already exists (`supabase/migrations/20260815182000_course_content.sql`)
and has the shape this needs:

- primary key `(kind, entity_id, field)`, a `value`, `updated_at`, `updated_by`
- read policy for `anon, authenticated` (lesson text is published content)
- three staff-only write policies (insert, update, delete), each on `public.is_staff()`
- grants already in place

So the only change is to let it hold lesson text as well as topic and reaction
text, and to make sure it can only ever hold wording.

```sql
-- Proposed migration: lesson text overrides on course_overrides.
-- Not applied. The owner reviews, then it goes in as a new file under
-- supabase/migrations/ and runs on a local stack with the RLS test first.

alter table public.course_overrides
  drop constraint course_overrides_kind_check;

alter table public.course_overrides
  add constraint course_overrides_kind_check
  check (kind in ('topic', 'reaction', 'beat', 'pool'));

-- Wording only. A beat or pool override may name the prompt, the brief, the
-- explanation, an option's text or an option's why. It can never name the
-- correct option, a SMILES, an InChI or an ordering, so chemistry stays
-- RDKit-derived in the bundle and an edit cannot change an answer.
alter table public.course_overrides
  add constraint course_overrides_lesson_field_check
  check (
    kind not in ('beat', 'pool')
    or field ~ '^(prompt|brief|explanation|option:[a-z0-9_-]+|why:[a-z0-9_-]+)$'
  );
```

Meaning of the new rows:

| kind | entity_id | field |
|---|---|---|
| `beat` | an authored beat id (`MCQ_BEATS`, `MATCH_BOARDS`, sort ladders) | `prompt`, `brief`, `explanation`, `option:<id>`, `why:<id>` |
| `pool` | a pool entry id (`content/uN` pools) | same list |

The existing policies cover the new kinds unchanged: anyone may read, only
`is_staff()` may write. `updated_by` should be set by the client to
`auth.uid()`; a `with check (updated_by = auth.uid())` on the insert and update
policies would enforce it, and is worth adding in the same migration if the
owner wants a trustworthy "who changed this".

### Alternative: a dedicated table

`public.lesson_text_overrides (entity_kind, entity_id, field, value, updated_at,
updated_by)` with the same read-all policy and the same three staff write
policies, plus the same field check. Cleaner separation, one more table to
grant and test. Prefer it only if lesson edits will grow fields that topic and
reaction overrides never need (history, review state).

## Client follow-ups (after the migration is applied)

1. In the admin chunk only: fetch `course_overrides` rows for `kind in
   ('beat','pool')` when the viewer opens, overlay them on the slides, and add
   an edit affordance on each wording field in the Admin view. Supabase is
   already loaded for a signed-in staff member, so this costs students nothing.
2. Later, for students to see the edits: fetch overrides on lesson load. That
   is a network read on every lesson and puts query code on the lesson path,
   so measure the `#/app` first-open payload (budget 400 KB gz) before and
   after, and keep it lazy.
3. Add `supabase/rls-tests/course_overrides_lesson.sql` in the shape of
   `office_hours.sql`: anon can read; a member's insert is refused; a staff
   insert of `field = 'prompt'` succeeds; a staff insert of `field =
   'correctOptionId'` or `field = 'smiles'` is refused by the check.

## Owner questions

- Wording only, as proposed, or should staff also be able to change which
  option is correct? (Recommendation: no; an answer change is a content change
  that goes through the RDKit scripts and a new beat id.)
- Who besides admin and owner may edit? Today `is_staff()` is exactly those two.
- Is an audit history wanted (every edit kept), or is last-write-wins with
  `updated_by` enough?
- The plan preview's free rule (Unit 0 and Unit 1 free, quizzes and
  checkpoints open, everything else Pro) is provisional in
  `src/game/admin/planView.ts`. Confirm or correct it.
