/*
 * Migration: the picture rules (bundle ADMIN-2, part e1; Robert's brief of 2 Nov 2026, 08:39,
 * sections 1 and 2, kept in /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md).
 *
 * - Drawings and illustrations only: the allowed kinds of picture are a public setting,
 *   picture_allowed_kinds, which every upload screen reads for its "no photos" line, so a later
 *   change is a list edit (brief section 1).
 * - No rights tick box: a chapter picture no longer asks "I have the right to use this picture"
 *   (brief section 1: "There is no rights tick box and no proof upload"). register_chapter_picture()
 *   loses its second input; rights_confirmed_at stays for the pictures confirmed before today.
 * - Ratings by the writer's age (brief section 2, Robert 08:48 and 08:50): a writer under 16 may
 *   rate a story All ages or 13+ only; writers aged 16 and 17 may rate up to 18+ (only readers of
 *   18 or over read an 18+ story, which rating_allows() already enforces). A trigger refuses
 *   anything higher, whoever sets it, staff included.
 * Who calls it: register_chapter_picture() from src/features/pictures/api/pictures.ts; the rating
 * trigger runs on every write to stories.rating (the story settings form, classics, staff).
 * Tests: supabase/tests/database/247-picture-rules.test.sql and 185-chapter-pictures.test.sql.
 */

/* ---------- The allowed kinds of picture ---------- */

insert into public.settings (key, value, is_public, description) values
  ('picture_allowed_kinds', '["drawing", "illustration", "non_photographic_ai"]'::jsonb, true,
   'The kinds of picture anyone may upload; every upload screen lists them. No photographs, real people or celebrities anywhere (Robert, 2 Nov 2026, 08:33).');

/* ---------- No rights tick box on chapter pictures ---------- */

alter table public.picture_checks drop constraint picture_checks_chapter_picture_rights_confirmed;
comment on column public.picture_checks.rights_confirmed_at is
  'When the writer ticked "I have the right to use this picture" (S1-E3-09); null for pictures added after the tick box was removed (Robert, 2 Nov 2026).';

drop function public.register_chapter_picture(text, boolean);

/**
 * register_chapter_picture: records a just-uploaded chapter picture as pending, so its check can
 *   run (S1-E3-09; the rights tick box removed in bundle ADMIN-2, part e1).
 * Input: target_path, "<chapter id>/<file name>" in the chapter-images bucket.
 * Returns: the picture's ID, which the chapter text refers to.
 * Errors: insufficient_privilege when the account can't write; feature_not_supported while
 *   picture_uploads is off; check_violation when the file isn't the caller's, isn't under one of
 *   their chapters or is already registered; 54000 over the hourly upload limit.
 * Called by: src/features/pictures/api/pictures.ts (uploadChapterPicture).
 */
create function public.register_chapter_picture(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  new_id uuid;
begin
  -- Step 1: a member who may write, while uploads are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add pictures right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, and it sits under one of their chapters.
  if not public.chapter_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'chapter-images'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to one of your chapters.' using errcode = 'check_violation';
  end if;
  select * into chapter from public.chapters where chapters.id = split_part(target_path, '/', 1)::uuid;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind, story_id, chapter_id)
  values (caller_id, 'chapter-images', target_path, 'chapter_picture', chapter.story_id, chapter.id)
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;

comment on function public.register_chapter_picture(text) is
  'Records a just-uploaded chapter picture as pending, so its check can run (S1-E3-09; no rights tick box since ADMIN-2e1).';
revoke execute on function public.register_chapter_picture(text) from public, anon;
grant execute on function public.register_chapter_picture(text) to authenticated;

/* ---------- Ratings by the writer's age ---------- */

/**
 * age_band_of: one person's age group today, by Romania's calendar, from their year of birth and
 *   age check (the same rule as age_band(), which answers for the caller).
 * Input: person_id. Returns: the age group, or 'unknown' for no such person.
 * Internal: story_rating_fits_writer().
 */
create function public.age_band_of(person_id uuid)
returns public.age_band
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
       profiles.age_check_result, (now() at time zone 'Europe/Bucharest')::date)
     from public.profiles where profiles.id = person_id),
    'unknown');
$$;

comment on function public.age_band_of(uuid) is
  'Internal: one person''s age group today, as age_band() works it out for the caller (ADMIN-2e1).';
revoke execute on function public.age_band_of(uuid) from public, anon, authenticated;

/**
 * story_rating_fits_writer: refuses a rating the writer is too young to give.
 * Trigger: before insert or update of rating on stories.
 * Rule (Robert, 2 Nov 2026, 08:50): a writer under 16 rates All ages or 13+ only. Writers aged
 *   16 and 17 may rate up to 18+. An account whose age is unknown isn't refused here: sign-up
 *   always asks the year of birth, and the account gate keeps such accounts read-only.
 * Errors: check_violation with the hint "rating_too_high_for_age".
 */
create function public.story_rating_fits_writer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rating in ('16_plus', '18_plus')
     and public.age_band_of(new.user_id) in ('under_13', '13_to_15') then
    raise exception 'A writer under 16 can rate a story All ages or 13+ only.'
      using errcode = 'check_violation', hint = 'rating_too_high_for_age';
  end if;
  return new;
end;
$$;

comment on function public.story_rating_fits_writer() is
  'Trigger: a writer under 16 rates a story All ages or 13+ only (Robert, 2 Nov 2026, 08:50).';

create trigger stories_rating_fits_writer
  before insert or update of rating on public.stories
  for each row execute function public.story_rating_fits_writer();
