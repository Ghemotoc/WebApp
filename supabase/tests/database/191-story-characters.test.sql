-- Database tests for characters in Story Atlas (stories S1-E17-08 to S1-E17-11 and S1-E17-13;
-- CLAUDE.md rules 1, 15 and 19).
-- What it proves:
-- - "New character" makes a character in the writer's own story; the sheet's text and the
--   writer's own fields save by themselves, one field at a time, and unknown fields, other
--   stories' chapters and over-long text are refused (S1-E17-08, S1-E17-09);
-- - a custom field shows on every sheet; removing it hides it and keeps its values (S1-E17-10);
-- - policies story_characters_select_own and story_character_fields_select_own: allowed (the
--   writer) and denied (another member, a moderator);
-- - a character picture goes through the picture check and shows only once it passed; only the
--   writer reads its file; removing it frees the file (S1-E17-11; policies atlas_images_insert_own,
--   atlas_images_select_uploader_and_staff and atlas_images_delete_own, allowed and denied);
-- - deleting a character takes its picture with it (S1-E17-13);
-- - story_plan() counts the cast (S1-E17-06), and nothing answers a user ID.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) is another member;
-- moderator (…10) is staff. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

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

-- Uploads on, the signing secret in Vault, and one chapter to appear in.
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
  't191cast', 1, 'Furtuna', 'Vântul bate.');

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. New character and its sheet (S1-E17-08, S1-E17-09) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('ana', (public.create_story_character('statia-meteo-seed01', 'Ana', 'protagonist') ->> 'id')::uuid),
  ('vali', (public.create_story_character('statia-meteo-seed01', ' Vali ', 'antagonist') ->> 'id')::uuid);
select is((select count(*)::integer from public.story_characters), 2,
  'allowed: story_characters_select_own: the writer reads the characters they made');
select is(public.story_cast('statia-meteo-seed01') #>> '{characters,1,name}', 'Vali',
  'the cast comes by name, the name trimmed');
select is(pg_temp.refusal($$ select public.create_story_character('statia-meteo-seed01', 'X', 'villain') $$),
  '23514', 'a role that isn''t one of the six is refused');

select is(public.update_story_character((select id from named where label = 'ana'),
  '{"sheet": {"pronouns": "ea", "wants": "Să afle cine a stins farul."}}') ->> 'outcome', 'ok',
  'two sheet fields save together');
select is(public.update_story_character((select id from named where label = 'ana'),
  '{"sheet": {"secrets": "Știe codul."}, "first_appearance": "t191cast"}') ->> 'outcome', 'ok',
  'then another field and the first appearance, on their own');
select is(public.story_cast('statia-meteo-seed01') -> 'characters' -> 0 -> 'sheet',
  '{"pronouns": "ea", "wants": "Să afle cine a stins farul.", "secrets": "Știe codul."}'::jsonb,
  'each change is merged into the sheet, keeping the fields not given');
select is(public.story_cast('statia-meteo-seed01') #>> '{characters,0,first_appearance}', 't191cast',
  'and the first appearance is the chapter picked');
select is(pg_temp.refusal($$ select public.update_story_character((select id from named where label = 'ana'),
  '{"sheet": {"favourite_colour": "albastru"}}') $$), '23514:unknown_field',
  'a sheet field that isn''t on the sheet is refused');
select is(pg_temp.refusal($$ select public.update_story_character((select id from named where label = 'ana'),
  jsonb_build_object('sheet', jsonb_build_object('notes', repeat('a', 20001)))) $$), '23514:too_long',
  'a field over 20,000 characters is refused');
select is(pg_temp.refusal($$ select public.update_story_character((select id from named where label = 'ana'),
  '{"first_appearance": "nuexista"}') $$), '23514:unknown_chapter',
  'a first appearance must be one of the story''s own chapters');

/* ---------- 2. The writer's own fields (S1-E17-10) ---------- */

insert into named values ('turned_by',
  (public.add_character_field('statia-meteo-seed01', 'Transformat de') ->> 'id')::uuid);
select is((select count(*)::integer from public.story_character_fields), 1,
  'allowed: story_character_fields_select_own: the writer reads their own fields');
select is(public.update_story_character((select id from named where label = 'vali'),
  jsonb_build_object('custom', jsonb_build_object((select id from named where label = 'turned_by')::text, 'Ana'))) ->> 'outcome',
  'ok', 'a value is written in the custom field');
select is(pg_temp.refusal($$ select public.update_story_character((select id from named where label = 'vali'),
  '{"custom": {"00000000-0000-4000-8000-000000000099": "x"}}') $$), '23514:unknown_field',
  'a value for a field that isn''t the story''s own is refused');
select is(public.update_character_field((select id from named where label = 'turned_by'), '{"is_hidden": true}') ->> 'outcome',
  'ok', 'the writer removes the field');
select is(public.story_cast('statia-meteo-seed01') #>> '{fields,0,is_hidden}', 'true',
  'it is hidden, not deleted');
select is(public.story_cast('statia-meteo-seed01') #>> array['characters', '1', 'custom_values',
  (select id from named where label = 'turned_by')::text], 'Ana',
  'and the value already written is kept, so bringing it back shows it again');

/* ---------- 3. Nobody else reads a character ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.story_characters), 0,
  'denied: story_characters_select_own: another member can''t read someone else''s characters');
select is((select count(*)::integer from public.story_character_fields), 0,
  'denied: story_character_fields_select_own: nor their fields');
select is(public.story_cast('statia-meteo-seed01'), '{"outcome": "not_found"}'::jsonb,
  'story_cast() answers not_found for someone else''s story');
select is(public.update_story_character((select id from named where label = 'ana'), '{"name": "Furat"}'),
  '{"outcome": "not_found"}'::jsonb, 'and nobody else can change a character');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.story_characters), 0,
  'a moderator can''t read anyone''s characters through the app either');

/* ---------- 4. The picture (S1-E17-11) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ insert into storage.objects (bucket_id, name) values
    ('atlas-images', '00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000001.webp'),
    ('atlas-images', '00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000002.webp') $$,
  'allowed: atlas_images_insert_own: the writer adds pictures under their own story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('atlas-images', '00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000003.webp') $$,
  '42501', null, 'denied: atlas_images_insert_own: another member can''t add a picture under someone else''s story');
select pg_temp.as_postgres();
-- Storage's own API stamps the uploader on the file; a plain insert in a test doesn't.
update storage.objects set owner_id = '00000000-0000-4000-8000-000000000001'
where bucket_id = 'atlas-images' and name like '00000000-0000-4000-9000-000000000001/191%';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('portrait', public.register_atlas_picture('00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000001.webp')),
  ('second', public.register_atlas_picture('00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000002.webp'));
select is(public.set_character_picture((select id from named where label = 'ana'), (select id from named where label = 'portrait')) ->> 'outcome',
  'ok', 'the picture goes on Ana''s sheet');
select is(public.story_cast('statia-meteo-seed01') #>> '{characters,0,picture,state}', 'checking',
  'until its check answers, the sheet says it is being checked');
create temporary table payloads (body text) on commit drop;
grant all on payloads to anon, authenticated;
insert into payloads values (json_build_object('pictureId', (select id from named where label = 'portrait'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select lives_ok($$ select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads))) $$,
  'the picture check records that the portrait passed');
select is(public.story_cast('statia-meteo-seed01') #>> '{characters,0,picture,state}', 'visible',
  'once it passed, it shows on the sheet');
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'), 2,
  'allowed: atlas_images_select_uploader_and_staff: the writer reads their pictures');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'), 0,
  'denied: atlas_images_select_uploader_and_staff: nobody else reads them, even after the check passed');

-- Removing the picture frees its file: the writer may delete it, but not a live one.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.remove_character_picture((select id from named where label = 'ana')) #>> '{removed,path}',
  '00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000001.webp',
  'removing the picture says which file to delete, and the initials show again');
-- The Storage API sets this flag for its own deletes; the test stands in for the API.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'atlas-images';
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'
           and name like '%000000000002.webp'), 1,
  'denied: atlas_images_delete_own: a file a registered picture still uses stays');
select is((select count(*)::integer from storage.objects where bucket_id = 'atlas-images'
           and name like '%000000000001.webp'), 0,
  'allowed: atlas_images_delete_own: the removed picture''s file is deleted');

/* ---------- 5. Deleting a character, and the cast count ---------- */

select is(public.set_character_picture((select id from named where label = 'vali'), (select id from named where label = 'second')) ->> 'outcome',
  'ok', 'the second picture goes on Vali''s sheet');
select is(public.delete_story_character((select id from named where label = 'vali')) #>> '{picture,path}',
  '00000000-0000-4000-9000-000000000001/19100000-0000-4000-8000-000000000002.webp',
  'deleting a character takes its picture with it (S1-E17-13)');
select is(public.story_plan('statia-meteo-seed01') #>> '{cast,count}', '1',
  'the at-a-glance page counts the cast that is left (S1-E17-06)');
select ok(public.story_cast('statia-meteo-seed01')::text not like '%00000000-0000-4000-8000-000000000001%',
  'story_cast() never answers a user ID');

select * from finish();
rollback;
