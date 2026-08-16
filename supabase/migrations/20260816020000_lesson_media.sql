-- ============================================================
-- LESSON MEDIA
--
-- Somewhere for a TA to drop a picture and have every student see it.
--
-- The alternative Kai suggested was pasting a file link, and that works only if
-- the link is publicly reachable. Most are not: a Google Drive "anyone with the
-- link" URL serves an HTML viewer page rather than the image bytes and refuses
-- to be embedded, so it renders as a broken image for every student while
-- looking fine to the person who pasted it because their browser is signed into
-- Drive. A bucket removes that whole failure mode - the URL is the file.
--
-- Pasted links stay supported for YouTube, which is the right home for video.
-- See the note on egress at the foot of this file.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  -- Public read. This is course material shown on pages that do not require an
  -- account, so putting it behind signed URLs would mean every lesson image
  -- needing a round trip and expiring mid-read.
  true,
  -- 10 MB. Comfortably more than any diagram or photograph and small enough
  -- that nobody uploads a lecture recording by accident.
  10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ------------------------------------------------------------
-- POLICIES
-- ------------------------------------------------------------
--
-- `storage.objects` has RLS on by default, so without these the bucket being
-- public still would not let anyone read it. Public on the bucket controls
-- whether the object URL needs signing; the policy controls who may select.

drop policy if exists "lesson_media_read_all" on storage.objects;
create policy "lesson_media_read_all"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'lesson-media');

-- Writing is staff only, reusing the same helper the lesson tables use, so
-- there is one answer to "who is staff" and not a second copy to drift.
drop policy if exists "lesson_media_insert_staff" on storage.objects;
create policy "lesson_media_insert_staff"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lesson-media' and public.is_staff());

drop policy if exists "lesson_media_update_staff" on storage.objects;
create policy "lesson_media_update_staff"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_staff())
  with check (bucket_id = 'lesson-media' and public.is_staff());

drop policy if exists "lesson_media_delete_staff" on storage.objects;
create policy "lesson_media_delete_staff"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_staff());


-- ------------------------------------------------------------
-- ON VIDEO, WHICH IS DELIBERATELY NOT UPLOADED HERE
-- ------------------------------------------------------------
--
-- mp4 and webm are in the mime list because a ten second clip of a mechanism is
-- genuinely useful and small. Full lecture recordings are not, and the reason is
-- egress rather than storage.
--
-- The free tier allows 5 GB of egress a month. One 100 MB recording watched by
-- fifty students is 5 GB - the entire month's budget, from one video, in one
-- lecture. Storage would be fine; the bandwidth is what runs out, and when it
-- does every image on the site stops loading too.
--
-- So the editor offers a YouTube field alongside the uploader, and YouTube
-- serves the bytes. That is not a workaround, it is the correct division: they
-- are better at video delivery than any bucket is going to be.
