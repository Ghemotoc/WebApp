-- Database tests for a quote card's picture backgrounds (bundle GAPS-7, parts b and c; story
-- S1-E4-07, fourth criterion; board 3.6 Share: "Story cover" and "Your own picture").
-- What it proves:
-- - share_options() hands the card the story's cover: the drawn design and colours, or
--   "automatic" with the story's ID; a cover staff hid counts as automatic; a visitor and a
--   chapter that can't be read get no cover at all;
-- - a reader's own background picture is added only by a member who may write, under a random
--   name (policy quote_card_pictures_insert_own, allowed and denied);
-- - only the uploader and picture reviewers ever read it, before and after its check: there is
--   no policy for anyone else (policy quote_card_pictures_select_uploader_and_staff, allowed and
--   denied);
-- - register_quote_card_picture() records it as pending, refuses a file that isn't the caller's
--   and keeps one picture per person; my_quote_card_picture() follows its check;
-- - remove_my_quote_card_picture() retires it and its file may then go, but a file whose picture
--   is still live may not (policy quote_card_pictures_delete_own, allowed and denied);
-- - a picture from an uploader under 16 waits for a person (the picture rules, ADMIN-2e1b).
-- Personas: adult_writer (…01), kid_14_ok (…03), teacher (…07), moderator (…10),
-- suspended_user (…13). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

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
-- How many files of the bucket the caller can read.
create function pg_temp.files_seen() returns integer language sql as $$
  select count(*)::integer from storage.objects where bucket_id = 'quote-card-pictures';
$$;
-- How many live background pictures a person has, read past the policies.
create function pg_temp.live_pictures(person uuid) returns integer language sql security definer as $$
  select count(*)::integer from public.picture_checks
  where picture_checks.user_id = person and picture_checks.kind = 'quote_card'
    and picture_checks.deleted_at is null;
$$;
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
create temporary table payloads (body text) on commit drop;
grant all on payloads to anon, authenticated;
create temporary table discarded (answer jsonb) on commit drop;
grant all on discarded to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';
update public.feature_flags set is_enabled = false where key = 'adults_only';
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

-- adult_writer's story with one published chapter and a drawn cover.
insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id,
  completion_status, rating, first_published_at, last_chapter_published_at,
  cover_kind, cover_design, cover_background, cover_accent)
values ('32900000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  'quote-backgrounds-329', 'Fundaluri', 'x', 'ro',
  (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now(),
  'drawn', 'stripes', 'sage', 'plum');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('32900000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
  'qcb1ch01', 1, 'Unu', 'x', 10, 'published', 'Unu', 'Un paragraf.', 10, now());

/* ---------- 1. The story's cover, for the card ---------- */

select pg_temp.sign_out();
select is(public.share_options('quote-backgrounds-329', 'qcb1ch01') -> 'cover', 'null'::jsonb,
  'a signed-out visitor gets no cover for a card');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('quote-backgrounds-329', 'nosuch01') -> 'cover', 'null'::jsonb,
  'a chapter that doesn''t exist gets no cover');
select is(public.share_options('quote-backgrounds-329', 'qcb1ch01') -> 'cover',
  '{"kind": "drawn", "story_id": "32900000-0000-4000-8000-000000000001", "design": "stripes", "background": "sage", "accent": "plum"}'::jsonb,
  'a reader gets the drawn cover''s design and colours');
select is(public.share_options('quote-backgrounds-329', 'qcb1ch01')::text like '%00000000-0000-4000-8000-000000000001%', false,
  'and never the writer''s user ID');
select pg_temp.as_postgres();
update public.stories set cover_hidden_at = now() where slug = 'quote-backgrounds-329';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('quote-backgrounds-329', 'qcb1ch01') -> 'cover',
  '{"kind": "automatic", "story_id": "32900000-0000-4000-8000-000000000001", "design": null, "background": null, "accent": null}'::jsonb,
  'a cover staff hid counts as the automatic one');
select pg_temp.as_postgres();
update public.stories set cover_hidden_at = null, cover_kind = 'automatic', cover_design = null,
  cover_background = null, cover_accent = null where slug = 'quote-backgrounds-329';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('quote-backgrounds-329', 'qcb1ch01') #>> '{cover,kind}', 'automatic',
  'an automatic cover says so, and the card draws it from the story''s ID');

/* ---------- 2. Adding the picture ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ insert into storage.objects (bucket_id, name) values
    ('quote-card-pictures', '32900000-0000-4000-8000-0000000000a1.webp'),
    ('quote-card-pictures', '32900000-0000-4000-8000-0000000000a2.webp') $$,
  'allowed: quote_card_pictures_insert_own: a member adds background pictures under random names');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('quote-card-pictures', 'my holiday.webp') $$,
  '42501', null, 'denied: quote_card_pictures_insert_own: a name that isn''t a random ID is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('quote-card-pictures', '32900000-0000-4000-8000-0000000000a3.webp') $$,
  '42501', null, 'denied: quote_card_pictures_insert_own: a read-only account can''t add one');
select pg_temp.sign_out();
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('quote-card-pictures', '32900000-0000-4000-8000-0000000000a4.webp') $$,
  '42501', null, 'denied: quote_card_pictures_insert_own: a signed-out visitor can''t add one');
select pg_temp.as_postgres();
-- Storage's own API stamps the uploader on the file; a plain insert in a test doesn't.
update storage.objects set owner_id = '00000000-0000-4000-8000-000000000007'
where bucket_id = 'quote-card-pictures' and name like '329%';

/* ---------- 3. Registering it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.register_quote_card_picture('32900000-0000-4000-8000-0000000000a1.webp') $$,
  '23514', null, 'someone else''s file can''t be registered');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.register_quote_card_picture('32900000-0000-4000-8000-0000000000ff.webp') $$,
  '23514', null, 'a file that isn''t there can''t be registered');
select is(public.my_quote_card_picture(), null, 'before any upload there is no background picture');
insert into named values
  ('first', public.register_quote_card_picture('32900000-0000-4000-8000-0000000000a1.webp'));
select is(public.my_quote_card_picture() ->> 'state', 'checking',
  'a registered picture waits for its check');
select throws_ok($$ select public.register_quote_card_picture('32900000-0000-4000-8000-0000000000a1.webp') $$,
  '23514', null, 'the same file can''t be registered twice');

/* ---------- 4. Who reads it ---------- */

select is(pg_temp.files_seen(), 1,
  'allowed: quote_card_pictures_select_uploader_and_staff: the uploader reads their registered file');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.files_seen(), 1,
  'allowed: quote_card_pictures_select_uploader_and_staff: a picture reviewer reads it too');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.files_seen(), 0,
  'denied: quote_card_pictures_select_uploader_and_staff: another member reads none while it is checked');
insert into payloads values (json_build_object('pictureId', (select id from named where label = 'first'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads))) $$,
  'the picture check records that it passed');
select is(public.my_quote_card_picture() ->> 'state', 'visible', 'once passed, the card may use it');
select is(public.my_quote_card_picture() ->> 'path', '32900000-0000-4000-8000-0000000000a1.webp',
  'and the uploader is told where the file is');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.files_seen(), 0,
  'denied: quote_card_pictures_select_uploader_and_staff: another member reads none after it passed either');
select is(public.my_quote_card_picture(), null, 'and my_quote_card_picture() only ever answers about the caller''s own');
select pg_temp.sign_out();
select is(pg_temp.files_seen(), 0,
  'denied: quote_card_pictures_select_uploader_and_staff: a signed-out visitor reads none');

/* ---------- 5. One picture per person, and taking it away ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named values
  ('second', public.register_quote_card_picture('32900000-0000-4000-8000-0000000000a2.webp'));
select is(pg_temp.live_pictures('00000000-0000-4000-8000-000000000007'), 1,
  'a new picture retires the one before it');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'quote-card-pictures';
select is(pg_temp.files_seen(), 1,
  'quote_card_pictures_delete_own: the retired file goes (allowed), the live one stays (denied)');
insert into discarded select public.remove_my_quote_card_picture();
select is((select answer #>> '{old_file,path}' from discarded), '32900000-0000-4000-8000-0000000000a2.webp',
  'removing the picture says which file to delete');
select is(public.my_quote_card_picture(), null, 'and there is no background picture any more');
delete from storage.objects where bucket_id = 'quote-card-pictures';
select is(pg_temp.files_seen(), 0, 'allowed: quote_card_pictures_delete_own: its file may now go');
select pg_temp.sign_out();
select throws_ok($$ select public.remove_my_quote_card_picture() $$, '42501', null,
  'a signed-out visitor is refused');

/* ---------- 6. An uploader under 16 waits for a person ---------- */

select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id) values
  ('quote-card-pictures', '32900000-0000-4000-8000-0000000000b1.webp', '00000000-0000-4000-8000-000000000003');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
insert into named values
  ('kid', public.register_quote_card_picture('32900000-0000-4000-8000-0000000000b1.webp'));
delete from payloads;
insert into payloads values (json_build_object('pictureId', (select id from named where label = 'kid'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads)));
select is(public.my_quote_card_picture() ->> 'state', 'waiting_for_person',
  'a 14-year-old''s picture waits for a moderator even when the automatic check passed');

select * from finish();
rollback;
