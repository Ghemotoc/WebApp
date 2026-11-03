-- Database tests for pictures in chapters (story S1-E3-09; CLAUDE.md rules 1, 6, 8, 19).
-- What it proves:
-- - a writer uploads a picture only into their own chapter's folder, only while uploads are on
--   (criterion 1; the rights tick box was removed on 2 Nov 2026, bundle ADMIN-2 part e1);
-- - the chapter text may hold only the writer's own chapter pictures, each with alt text, and a
--   picture's address and alt text are not counted as words (criterion 1; rule 8);
-- - the picture check decides who sees it: a clean picture shows to readers, a flagged one is
--   "being checked" with no file for anyone but the writer and staff (criterion 3);
-- - readers can report a chapter picture, and its summary and notification name the chapter
--   (criterion 4);
-- - policies chapter_images_insert_own, chapter_images_select_visible and
--   chapter_images_select_uploader_and_staff: allowed and denied.
-- Test data: adult_writer (…01) and their seed story "Stația meteo"; blocker (…15) as another
-- member and reader. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- A result as server/picture-check.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-picture-secret', 'sha256'), 'hex');
$$;
-- The SQLSTATE a statement raises, or null; with the hint when there is one.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return sqlstate || coalesce(':' || nullif(error_hint, ''), '');
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Uploads on, the signing secret in Vault, and a draft chapter on adult_writer's seed story.
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, status)
values ('18500000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-8000-000000000001', 't185pics', 1, 'Harta', 'Bunica a desenat o hartă.', 'draft');

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. Uploading and registering (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ insert into storage.objects (bucket_id, name) values
    ('chapter-images', '18500000-0000-4000-8000-000000000001/11111111-1111-4111-8111-185000000001.webp'),
    ('chapter-images', '18500000-0000-4000-8000-000000000001/22222222-2222-4222-8222-185000000002.webp'),
    ('chapter-images', '18500000-0000-4000-8000-000000000001/33333333-3333-4333-8333-185000000003.webp') $$,
  'allowed: chapter_images_insert_own: the writer adds pictures to their own chapter''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('chapter-images', '18500000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000001.webp') $$,
  '42501', null, 'a file named after the user ID is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('chapter-images', '18500000-0000-4000-8000-000000000001/44444444-4444-4444-8444-185000000004.webp') $$,
  '42501', null, 'denied: chapter_images_insert_own: another member can''t add a picture to someone else''s chapter');

select pg_temp.as_postgres();
update public.feature_flags set is_enabled = false where key = 'picture_uploads';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('chapter-images', '18500000-0000-4000-8000-000000000001/55555555-5555-4555-8555-185000000005.webp') $$,
  '42501', null, 'nothing can be uploaded while picture_uploads is off');
select pg_temp.as_postgres();
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
-- Storage's own API stamps the uploader on the file; a plain insert in a test doesn't.
update storage.objects set owner_id = '00000000-0000-4000-8000-000000000001'
where bucket_id = 'chapter-images' and name like '18500000-%';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('clean', public.register_chapter_picture('18500000-0000-4000-8000-000000000001/11111111-1111-4111-8111-185000000001.webp')),
  ('flagged', public.register_chapter_picture('18500000-0000-4000-8000-000000000001/22222222-2222-4222-8222-185000000002.webp'));
select is(
  (select status::text || ' ' || kind::text
   from public.picture_checks where id = (select id from named where label = 'clean')),
  'pending chapter_picture',
  'a registered chapter picture starts pending, with no rights tick box (Robert, 2 Nov 2026)');
select is(
  (select chapter_id from public.picture_checks where id = (select id from named where label = 'clean')),
  '18500000-0000-4000-8000-000000000001'::uuid,
  'and it knows its chapter');

select pg_temp.as_postgres();

-- blocker uploads a profile picture of their own, used below as "someone else's picture".
insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', '66666666-6666-4666-8666-185000000006.png', '00000000-0000-4000-8000-000000000015');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into named values ('other', public.register_picture('avatars', '66666666-6666-4666-8666-185000000006.png', 'avatar'));
select throws_ok($$ select public.register_chapter_picture(
    '18500000-0000-4000-8000-000000000001/33333333-3333-4333-8333-185000000003.webp') $$,
  '23514', null, 'nobody can register a picture in someone else''s chapter');

/* ---------- 2. The check (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table payloads (label text primary key, body text) on commit drop;
grant all on payloads to anon, authenticated;
insert into payloads values
  ('clean', json_build_object('pictureId', (select id from named where label = 'clean'), 'outcome', 'passed',
     'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text),
  ('flagged', json_build_object('pictureId', (select id from named where label = 'flagged'), 'outcome', 'flagged',
     'provider', 'stub', 'flags', json_build_object('gore', 0.97))::text);
select is(public.record_picture_check((select body from payloads where label = 'clean'),
    pg_temp.signed((select body from payloads where label = 'clean')))::text, 'passed',
  'a clean chapter picture passes straight away');
select is(public.record_picture_check((select body from payloads where label = 'flagged'),
    pg_temp.signed((select body from payloads where label = 'flagged')))::text, 'held',
  'a flagged one is held for a person');

/* ---------- 3. The text (criterion 1, rule 8) ---------- */

create temporary table bodies (label text primary key, body text) on commit drop;
grant all on bodies to anon, authenticated;
insert into bodies values
  ('good', format(E'Bunica a desenat o hartă.\n\n![Harta dealurilor \\] cu râul](picture:%s)\n\n![O furtună](picture:%s)',
     (select id from named where label = 'clean'), (select id from named where label = 'flagged'))),
  ('no_alt', format(E'Text\n\n![  ](picture:%s)', (select id from named where label = 'clean'))),
  ('long_alt', format(E'Text\n\n![%s](picture:%s)', repeat('a', 301), (select id from named where label = 'clean'))),
  ('not_mine', format(E'Text\n\n![Altcineva](picture:%s)', (select id from named where label = 'other')));

select is(public.save_chapter_draft('t185pics', 'Harta', (select body from bodies where label = 'good'), 1) ->> 'status',
  'saved', 'the writer saves a chapter with two pictures and their alt text');
select is((select word_count from public.chapters where code = 't185pics'), 5,
  'a picture''s address and alt text aren''t counted as words');
select is(pg_temp.refusal($$ select public.save_chapter_draft('t185pics', 'Harta', (select body from bodies where label = 'no_alt'), 2) $$),
  '23514:picture_needs_alt', 'a picture without alt text is refused');
select is(pg_temp.refusal($$ select public.save_chapter_draft('t185pics', 'Harta', (select body from bodies where label = 'long_alt'), 2) $$),
  '23514:alt_too_long', 'alt text over 300 characters is refused');
select is(pg_temp.refusal($$ select public.save_chapter_draft('t185pics', 'Harta', (select body from bodies where label = 'not_mine'), 2) $$),
  '23514:picture_unknown', 'a text can''t show someone else''s picture');
select is(public.publish_chapter('t185pics') ->> 'outcome', 'ok', 'the writer publishes the chapter');

/* ---------- 4. Reading (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(
  public.get_chapter('statia-meteo-seed01', 't185pics') #>> array['pictures', (select id::text from named where label = 'clean'), 'state'],
  'visible', 'a reader sees the clean picture');
select is(
  (public.get_chapter('statia-meteo-seed01', 't185pics') -> 'pictures' -> (select id::text from named where label = 'flagged'))
    - 'state',
  '{"bucket": null, "path": null}'::jsonb,
  'the flagged one comes without its file, so the reader shows "Picture being checked"');
select is((select count(*)::integer from storage.objects
           where name = '18500000-0000-4000-8000-000000000001/11111111-1111-4111-8111-185000000001.webp'), 1,
  'allowed: chapter_images_select_visible: a reader reads the clean picture''s file');
select is((select count(*)::integer from storage.objects
           where name = '18500000-0000-4000-8000-000000000001/22222222-2222-4222-8222-185000000002.webp'), 0,
  'denied: chapter_images_select_visible: a reader can''t read the held picture''s file');
select is(public.my_picture_states(array[(select id from named where label = 'clean')]), '{}'::jsonb,
  'my_picture_states tells nobody about another person''s pictures');

select pg_temp.sign_out();
select is(
  public.get_chapter('statia-meteo-seed01', 't185pics') #>> array['pictures', (select id::text from named where label = 'clean'), 'state'],
  'visible', 'a signed-out visitor sees the clean picture inside the teaser');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects
           where name = '18500000-0000-4000-8000-000000000001/22222222-2222-4222-8222-185000000002.webp'), 1,
  'allowed: chapter_images_select_uploader_and_staff: the writer reads their held picture');
select is(
  public.my_picture_states(array[(select id from named where label = 'flagged')])
    #>> array[(select id::text from named where label = 'flagged'), 'state'],
  'waiting_for_person', 'the editor tells the writer the picture waits for a person');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is((select count(*)::integer from storage.objects
           where name = '18500000-0000-4000-8000-000000000001/22222222-2222-4222-8222-185000000002.webp'), 0,
  'denied: chapter_images_select_uploader_and_staff: another member can''t read the held picture');

/* ---------- 5. Reporting (criterion 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(format($$ select * from public.report_item('picture', %L, 'other', 'Not the writer''s picture') $$,
    (select id from named where label = 'clean')),
  'a reader reports a chapter picture');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('picture', (select id from named where label = 'clean')),
  'Picture in chapter 1 of Stația meteo', 'the queue says which chapter the picture is in');
select is(
  public.notification_item_json((select case_id from public.picture_checks where id = (select id from named where label = 'flagged')))
    ->> 'address',
  '/s/statia-meteo-seed01/t185pics', 'a notice about the picture links to its chapter');

select * from finish();
rollback;
