-- Database tests for pictures and Featured stories on landing pages (story S1-E11-14 criteria 5, 7
-- and 9; bundle CONTESTS-13a2a; CLAUDE.md rules 1, 18 and 19).
-- What it proves:
-- - owner and admin upload to `landing-pictures` (landing_pictures_insert_website_staff allowed),
--   a moderator can't (denied); register_landing_picture() records it pending, for owner and admin
--   only; a landing page picture skips the moderator step, because staff upload it (picture_needs_person(),
--   bundle G12a), while the automatic checks still run;
-- - visitors read a picture's file only once approved (landing_pictures_select_visible allowed
--   and denied); the uploader reads it at every stage and a member doesn't
--   (landing_pictures_select_uploader_and_staff allowed and denied);
-- - publishing is refused for a picture without alt text, or not yet approved, and for a Featured
--   block with no stories, an unknown story or an unknown tag;
-- - visitors get the approved picture's file and each Featured block's cards, only stories rated
--   for the page's youngest age group, and a story hidden by moderation drops off at once.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A visitor who isn't signed in: the anon role and no user in the claims.
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid, value text) on commit drop;
grant all on kept to authenticated, anon;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';
-- One story is 16+ for this test, so the age filter has something to leave out.
update public.stories set rating = '16_plus' where slug = 'the-girl-who-fixed-radios-seed02';
-- The two stories get a published chapter each, so the public lists hold them.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'land0001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'land0002', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now());

/* ---------- Uploading ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('page', public.admin_create_landing_page('poezie-test', 'campaign'));
insert into kept (label, value)
select 'path', id::text || '/' || gen_random_uuid()::text || '.png' from kept where label = 'page';

select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('landing-pictures', %L, '00000000-0000-4000-8000-000000000009') $$, (select value from kept where label = 'path')),
  'allowed: landing_pictures_insert_website_staff lets an admin upload under a page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('landing-pictures', %L, '00000000-0000-4000-8000-000000000010') $$,
  (select id::text from kept where label = 'page') || '/' || gen_random_uuid()::text || '.png'),
  '42501', null, 'denied: landing_pictures_insert_website_staff refuses a moderator');
select throws_ok(format($$ select public.register_landing_picture(%L) $$, (select value from kept where label = 'path')),
  '42501', null, 'a moderator can''t register a landing page picture');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('picture', public.register_landing_picture((select value from kept where label = 'path')));
reset role;
select is((select status::text from public.picture_checks where id = (select id from kept where label = 'picture')),
  'pending', 'the picture is recorded as pending its check');
select ok(not public.picture_needs_person((select picture_checks from public.picture_checks where id = (select id from kept where label = 'picture'))),
  'a landing page picture skips the moderator step once the automatic checks pass: staff uploaded it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.admin_landing_picture_states((select id from kept where label = 'page'))
  #>> array[(select id::text from kept where label = 'picture'), 'state'], 'checking',
  'the editor reads the picture''s state: being checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ select public.admin_landing_picture_states(%L) $$, (select id from kept where label = 'page')),
  '42501', null, 'a moderator can''t read the editor''s picture states');
reset role;

/* ---------- Who reads the file ---------- */

select pg_temp.as_visitor();
select is((select count(*)::integer from storage.objects where bucket_id = 'landing-pictures'), 0,
  'denied: landing_pictures_select_visible hides a picture still being checked from visitors');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from storage.objects where bucket_id = 'landing-pictures'), 1,
  'allowed: landing_pictures_select_uploader_and_staff lets the uploader read it while it is checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'landing-pictures'), 0,
  'denied: landing_pictures_select_uploader_and_staff hides it from a member');

/* ---------- Publishing checks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, value) values ('content', format($json${"theme": "plum", "blocks": [
  {"id": "h", "kind": "hero", "picture_id": "%s", "ro": {"title": "Săptămâna poeziei", "intro": "", "alt": ""},
   "en": {"title": "Poetry week", "intro": "", "alt": "A quill over an open notebook"}},
  {"id": "w", "kind": "who_can_enter", "ro": {"heading": "Cine", "body": "Toți"}, "en": {"heading": "Who", "body": "Everyone"},
   "age_groups": ["13_to_15", "18_and_over"]},
  {"id": "f", "kind": "featured", "mode": "hand", "story_slugs": ["statia-meteo-seed01", "the-girl-who-fixed-radios-seed02"],
   "ro": {"heading": "Povești", "intro": ""}, "en": {"heading": "Stories", "intro": ""}}]}$json$,
  (select id from kept where label = 'picture')));
select is(public.landing_page_problems('campaign', (select value::jsonb from kept where label = 'content')),
  array['blocks.0.ro.alt:empty', 'blocks.0.picture:not_checked'],
  'a picture needs alt text in both languages and an approval before publishing');
select is(public.landing_page_problems('campaign', jsonb_set((select value::jsonb from kept where label = 'content'),
  '{blocks,2,story_slugs}', '[]')) @> array['blocks.2.stories:how_many'], true,
  'a Featured block picked by hand needs at least one story');
select is(public.landing_page_problems('campaign', jsonb_set((select value::jsonb from kept where label = 'content'),
  '{blocks,2,story_slugs}', '["no-such-story"]')) @> array['blocks.2.stories:unknown'], true,
  'a Featured block refuses a story that doesn''t exist');
select is(public.landing_page_problems('campaign', jsonb_set(jsonb_set((select value::jsonb from kept where label = 'content'),
  '{blocks,2,mode}', '"tag"'), '{blocks,2,tag}', '"No such tag"')) @> array['blocks.2.tag:unknown'], true,
  'a Featured block by tag refuses a tag that doesn''t exist');
select is(public.landing_page_problems('campaign', jsonb_set(jsonb_set((select value::jsonb from kept where label = 'content'),
  '{blocks,2,mode}', '"tag"'), '{blocks,2,tag}', '"Family"')) @> array['blocks.2.tag:unknown'], false,
  'a Featured block by a known tag passes');
select is(public.landing_page_problems('campaign', jsonb_set((select value::jsonb from kept where label = 'content'),
  '{blocks,1,picture_id}', to_jsonb((select id::text from kept where label = 'picture')))) @> array['blocks.1.picture:not_allowed'], true,
  'only a Hero or Text block carries a picture');

-- The alt text is written and a moderator approves the picture.
update kept set value = jsonb_set(value::jsonb, '{blocks,0,ro,alt}', '"O pană deasupra unui caiet deschis"')::text where label = 'content';
reset role;
update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'picture');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.landing_page_problems('campaign', (select value::jsonb from kept where label = 'content')), '{}'::text[],
  'with alt text and the approval, the page may be published');
select public.admin_save_landing_page_draft((select id from kept where label = 'page'), (select value::jsonb from kept where label = 'content'));
select ok(public.admin_publish_landing_page((select id from public.landing_page_versions
  where page_id = (select id from kept where label = 'page') and status = 'draft')) is not null, 'the admin publishes it');

/* ---------- What visitors see ---------- */

select pg_temp.as_visitor();
select is(public.landing_page('poezie-test') #>> array['pictures', (select id::text from kept where label = 'picture'), 'state'],
  'visible', 'a visitor gets the approved picture');
select is((select count(*)::integer from storage.objects where bucket_id = 'landing-pictures'), 1,
  'allowed: landing_pictures_select_visible lets a visitor read the approved file');
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.landing_page('poezie-test') #> '{featured,f}') as card),
  array['statia-meteo-seed01'], 'the page is for 13 to 15 too, so the 16+ story is left out');
reset role;

-- The same page for 16 and over shows the 16+ story to an adult reader.
update public.landing_page_versions
set content = jsonb_set(content, '{blocks,1,age_groups}', '["16_to_17", "18_and_over"]')
where page_id = (select id from kept where label = 'page') and status = 'published';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.landing_page('poezie-test') #> '{featured,f}') as card),
  array['statia-meteo-seed01', 'the-girl-who-fixed-radios-seed02'], 'a page for 16 and over shows a 16+ story, in the order picked');
-- Moderation hides a story: it drops off at once.
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select stories.user_id, 'story', stories.id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test'
from public.stories where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select array_agg(card ->> 'slug') from jsonb_array_elements(public.landing_page('poezie-test') #> '{featured,f}') as card),
  array['the-girl-who-fixed-radios-seed02'], 'a story hidden by moderation drops off the page at once');
-- A removed picture is no longer handed out.
reset role;
update public.picture_checks set status = 'removed' where id = (select id from kept where label = 'picture');
select pg_temp.as_visitor();
select is(public.landing_page('poezie-test') #>> array['pictures', (select id::text from kept where label = 'picture'), 'path'],
  null, 'a removed picture''s file is no longer given to visitors');
reset role;

select * from finish();
rollback;
