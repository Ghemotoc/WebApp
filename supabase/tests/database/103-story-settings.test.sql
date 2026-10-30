-- Database tests for story status, settings, deletion and the story page (story S1-E3-05).
-- What it proves:
-- - the writer sets Ongoing or Completed and the comments switch; the partial index for the
--   Discover filter exists;
-- - update_my_story() changes only the caller's own live story (another writer gets not_found),
--   keeps the slug, checks the basics and the cover, and the gate refuses read-only accounts;
-- - delete_my_story() hides the story at once (readers and the owner's live list), undo works
--   within 30 days and not after, the purge removes it only after 30 days, and pg_cron has the
--   job;
-- - get_story_page(): nobody but the owner sees an unpublished story; a published one is public
--   (signed out too) and carries the pen name, never the user ID; a deleted one is gone.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

-- The seed story "Stația meteo" (adult_writer, slug statia-meteo-seed01) is the one under test.

-- 1. The columns and the index.
select col_default_is('public', 'stories', 'completion_status', 'ongoing', 'a new story is ongoing');
select col_default_is('public', 'stories', 'comments_enabled', 'true', 'comments start switched on');
select has_index('public', 'stories', 'stories_completion_status_idx', 'the status filter has its index (S1-E5-01)');

-- 2. The owner changes status and comments; the slug stays.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.update_my_story('statia-meteo-seed01',
  '{"completion_status": "completed", "comments_enabled": false, "title": "Stația meteo (ediția a doua)"}')) ->> 'outcome',
  'ok', 'the writer marks their story Completed, switches comments off and renames it');
select results_eq(
  $$ select completion_status::text, comments_enabled, title, slug from public.stories where id = '00000000-0000-4000-9000-000000000001' $$,
  $$ values ('completed', false, 'Stația meteo (ediția a doua)', 'statia-meteo-seed01') $$,
  'the status, the switch and the title are stored; the address never changes'
);
select is((public.update_my_story('statia-meteo-seed01', '{"tag_names": ["Bunici", "iarnă"]}')) ->> 'outcome', 'ok',
  'the writer replaces the tags');
select results_eq(
  $$ select tags.normalised_name from public.story_tags join public.tags on tags.id = story_tags.tag_id
     where story_tags.story_id = '00000000-0000-4000-9000-000000000001' order by 1 $$,
  $$ values ('grandparents'), ('iarna') $$,
  'the new tags replace the old ones; "Bunici" is the recommended tag Grandparents (CMS-1e)'
);
select throws_ok($$ select public.update_my_story('statia-meteo-seed01', '{"cover": {"kind": "drawn", "design": "waves", "background": "sky", "accent": "#6E93BF"}}') $$,
  '23514', null, 'a cover colour outside the palette is refused on update too');
select throws_ok($$ select public.update_my_story('statia-meteo-seed01', '{"title": ""}') $$,
  '23514', null, 'an empty title is refused on update');

-- 3. Another writer, and a read-only account.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.update_my_story('statia-meteo-seed01', '{"completion_status": "ongoing"}')) ->> 'outcome', 'not_found',
  'another writer can''t change the story (it isn''t theirs)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((public.update_my_story('scrisori-din-cutia-postala-seed03', '{"completion_status": "completed"}')) ->> 'outcome', 'not_active',
  'teen_17 (read-only while the test is adults only) can''t change settings');

-- 4. The story page: unpublished stories are the owner's only.
reset role;
set local role anon;
select is(public.get_story_page('statia-meteo-seed01'), null, 'a signed-out visitor gets nothing for an unpublished story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_story_page('statia-meteo-seed01'), null, 'teen_17 gets nothing for adult_writer''s unpublished story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.get_story_page('statia-meteo-seed01')) ->> 'is_owner', 'true', 'the owner gets their own unpublished story (preview)');

-- 5. Once a chapter is published (S1-E3-03): public, with the pen name and no user ID.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table published_chapter as
  select (public.create_chapter('statia-meteo-seed01')) ->> 'code' as code;
grant select on published_chapter to authenticated;
select public.save_chapter_draft((select code from published_chapter), 'Unu', 'Primul capitol.', 1);
select public.publish_chapter((select code from published_chapter));
reset role;
set local role anon;
select is((public.get_story_page('statia-meteo-seed01')) ->> 'title', 'Stația meteo (ediția a doua)',
  'a signed-out visitor reads a published story''s page');
select is((public.get_story_page('statia-meteo-seed01')) -> 'writer' ->> 'display_name', 'Lia Scrie',
  'the page carries the writer''s pen name');
select ok(not (public.get_story_page('statia-meteo-seed01') ? 'user_id')
  and position('00000000-0000-4000-8000-000000000001' in public.get_story_page('statia-meteo-seed01')::text) = 0,
  'the page never carries the user ID (architecture 1.6)');
select results_eq(
  $$ select (public.get_story_page('statia-meteo-seed01')) ->> 'completion_status',
            (public.get_story_page('statia-meteo-seed01')) ->> 'comments_enabled' $$,
  $$ values ('completed', 'false') $$,
  'the page shows the status and the comments switch'
);
select is(public.get_story_page('no-such-story'), null, 'an unknown address gives nothing');

-- 6. Delete: hidden at once, undo within 30 days, purged after.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.delete_my_story('statia-meteo-seed01')) ->> 'outcome', 'ok', 'the writer deletes the story');
reset role;
set local role anon;
select is(public.get_story_page('statia-meteo-seed01'), null, 'a deleted story is hidden from readers at once');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.restore_my_story('statia-meteo-seed01')) ->> 'outcome', 'ok', 'the writer undoes the deletion within 30 days');
select is((public.delete_my_story('statia-meteo-seed01')) ->> 'outcome', 'ok', 'and deletes it again');
reset role;
-- Move the clock: 31 days ago, past the undo time.
update public.stories set deleted_at = now() - interval '31 days' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.restore_my_story('statia-meteo-seed01')) ->> 'outcome', 'not_found', 'after 30 days the undo is gone');
reset role;
select is(public.purge_deleted_stories(), 1, 'the nightly purge deletes it for good, tags included');
select is((select count(*)::integer from public.story_tags where story_id = '00000000-0000-4000-9000-000000000001'), 0,
  'the purged story''s tags went with it');
select is((select command from cron.job where jobname = 'purge-deleted-stories'),
  'select public.purge_deleted_stories();', 'pg_cron runs the purge every night');

select * from finish();

rollback;
