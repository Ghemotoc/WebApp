-- Database tests for staff hiding a story's title or cover (bundle ADMIN-2, part b3; story
-- S1-E11-08, criterion "hide the cover or the title").
-- What it proves:
-- - only staff who may change stories hide or show a title or cover, always with a reason; support,
--   the content editor and the writer are refused; an automatic cover has nothing to hide;
-- - a hidden title shows readers "Titlu ascuns de echipa de moderare" (the story is Romanian) on
--   cards, the story page, lists, the reader, link previews and notifications, and isn't found by
--   search; the writer and staff still see the real title;
-- - a hidden cover shows readers the automatic cover; a hidden uploaded cover isn't served from
--   Storage (picture_is_visible(), used by the policy pictures_select_visible: allowed and denied);
-- - hiding sends the writer a statement of reasons (title_hidden, cover_hidden), is a version of
--   kind 'presentation' and is in the audit log with the owner's user ID; showing again sends a
--   notification instead;
-- - the writer changing the title, or picking another cover, shows it again;
-- - Restore puts a title back the way it was; the overview says what is hidden and has the cover.
-- Personas: adult_writer (…01), teacher (…07, an adult reader), moderator (…10), support (…11),
-- editor (…12). Seed stories: …9000…01 (Romanian, drawn cover) and …02 (automatic cover), both by
-- adult_writer. Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- Internal functions (story_card_json() and the like) aren't granted to members, so they are called
-- as postgres with a member's claims: auth.uid() is still that member.
create function pg_temp.server_for(persona_id text) returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data, written as postgres: one published chapter, so story 1 is in lists and opens.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'hid24101', 1,
  'Unu', 'Prima frază.', 2, 'published', 'Unu', 'Prima frază.', 2, now(), now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';
create temp table test_revisions (name text primary key, id uuid);
grant select, insert on test_revisions to authenticated;

/* ---------- 1. Who may hide, and what ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'hidden', 'community_rules', 'An insult in the title.') $$, '42501', null,
  'support staff can''t hide a title');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'hidden', 'community_rules', 'An insult in the title.') $$, '42501', null,
  'the content editor can''t hide a title');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'hidden', 'community_rules', 'An insult in the title.') $$, '42501', null,
  'a writer can''t use the staff function');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'hidden', 'community_rules', ' ') $$, '23514', null, 'hiding without a reason is refused');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'blurb', 'hidden', 'community_rules', 'An insult.') $$, '23514', null, 'only the title or the cover can be hidden');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000002',
  'cover', 'hidden', 'community_rules', 'Nothing to hide.') $$, '23514', null,
  'an automatic cover has nothing to hide');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'shown', 'community_rules', 'Already shown.') $$, '23514', null,
  'showing a title that already shows changes nothing and is refused');

/* ---------- 2. A moderator hides the title ---------- */

insert into test_revisions values ('hide_title', public.admin_set_story_presentation(
  '00000000-0000-4000-9000-000000000001', 'title', 'hidden', 'community_rules', 'An insult in the title.'));
select pg_temp.as_postgres();
select isnt((select title_hidden_at from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  null, 'the title is hidden');
select is((select title from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'Stația meteo', 'the writer''s title itself is unchanged: staff never write a new one');
select is((select change_kind || before_values::text || after_values::text from public.story_revisions
           where id = (select id from test_revisions where name = 'hide_title')),
  'presentation{"title": "shown"}{"title": "hidden"}', 'it is a version of kind presentation, with before and after');
select is((select string_agg(action::text, ',') from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001'),
  'title_hidden', 'the writer gets a statement of reasons saying the title was hidden');
select is((select target_user_id from public.audit_log where action = 'story.presentation_changed'
           order by created_at desc limit 1),
  '00000000-0000-4000-8000-000000000001'::uuid, 'the audit log carries the owner''s user ID');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'title', 'hidden', 'community_rules', 'Again.') $$, '23514', null, 'hiding a hidden title again is refused');

/* ---------- 3. What readers see, and what the writer and staff see ---------- */

select pg_temp.server_for('00000000-0000-4000-8000-000000000007');
select is(public.story_card_json('00000000-0000-4000-9000-000000000001') ->> 'title',
  'Titlu ascuns de echipa de moderare', 'a reader''s story card shows the marker in the story''s language');
select is((select title from public.listed_stories('new', null, null, null, null)
           where id = '00000000-0000-4000-9000-000000000001'),
  'Titlu ascuns de echipa de moderare', 'lists show the marker');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_story_page('statia-meteo-seed01') ->> 'title',
  'Titlu ascuns de echipa de moderare', 'a reader''s story page shows the marker');
select is(public.get_chapter('statia-meteo-seed01', 'hid24101') -> 'story' ->> 'title',
  'Titlu ascuns de echipa de moderare', 'the reader shows the marker');
select pg_temp.as_visitor();
select is(public.get_link_preview('statia-meteo-seed01') ->> 'title',
  'Titlu ascuns de echipa de moderare', 'a link preview shows the marker to a visitor');
select pg_temp.as_postgres();
select ok(public.story_search_text('00000000-0000-4000-9000-000000000001') not like '%meteo%',
  'a hidden title can''t be searched for');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.get_story_page('statia-meteo-seed01') ->> 'title', 'Stația meteo',
  'the writer still sees their own title');
select pg_temp.server_for('00000000-0000-4000-8000-000000000011');
select is(public.story_card_json('00000000-0000-4000-9000-000000000001') ->> 'title', 'Stația meteo',
  'staff with the Stories area see the real title');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'title_hidden')::boolean,
  true, 'the overview says the title is hidden');

/* ---------- 4. Showing again, Restore and the writer changing the title ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('show_title', public.admin_set_story_presentation(
  '00000000-0000-4000-9000-000000000001', 'title', 'shown', 'other', 'The title was fine.'));
select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications
           where kind = 'story_changed_by_staff' and story_revision_id = (select id from test_revisions where name = 'show_title')),
  1, 'showing again sends the writer a notification');
select is((select count(*)::integer from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001'),
  1, 'showing again sends no new statement of reasons');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('restore', public.admin_restore_story_revision(
  (select id from test_revisions where name = 'show_title'), 'community_rules', 'It was an insult after all.'));
select pg_temp.as_postgres();
select isnt((select title_hidden_at from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  null, 'Restore on "shown again" hides the title once more');
select is((select restores_revision_id from public.story_revisions where id = (select id from test_revisions where name = 'restore')),
  (select id from test_revisions where name = 'show_title'), 'the new version points at the change it undid');
update public.stories set title = 'Stația meteo nouă' where id = '00000000-0000-4000-9000-000000000001';
select is((select title_hidden_at from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  null, 'once the writer changes the title, it shows again');

/* ---------- 5. A hidden cover ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_set_story_presentation('00000000-0000-4000-9000-000000000001',
  'cover', 'hidden', 'community_rules', 'A rude drawing on the cover.') $$, 'a moderator hides a drawn cover');
select pg_temp.server_for('00000000-0000-4000-8000-000000000007');
select is(public.story_card_json('00000000-0000-4000-9000-000000000001') -> 'cover' ->> 'kind', 'automatic',
  'readers see the automatic cover instead');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.get_story_page('statia-meteo-seed01') -> 'cover' ->> 'kind', 'drawn',
  'the writer still sees their own cover');
select pg_temp.as_postgres();
select is((select string_agg(action::text, ',' order by issued_at, action::text) from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001' and action = 'cover_hidden'),
  'cover_hidden', 'the writer gets a statement of reasons saying the cover was hidden');
update public.stories set cover_background = 'gold' where id = '00000000-0000-4000-9000-000000000001';
select is((select cover_hidden_at from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  null, 'once the writer picks another cover, it shows again');

/* ---------- 6. An uploaded cover isn't served while hidden (pictures_select_visible) ---------- */

update public.stories set cover_kind = 'upload', cover_design = null, cover_background = null, cover_accent = null,
  cover_tall_path = 'test/hid241-tall.webp', cover_square_path = 'test/hid241-square.webp'
where id = '00000000-0000-4000-9000-000000000001';
insert into public.picture_checks (user_id, bucket, path, kind, story_id, status)
values ('00000000-0000-4000-8000-000000000001', 'covers', 'test/hid241-tall.webp', 'cover',
  '00000000-0000-4000-9000-000000000001', 'passed');
select ok(public.picture_is_visible('covers', 'test/hid241-tall.webp'),
  'allowed: pictures_select_visible: a passed cover that shows is served');
update public.stories set cover_hidden_at = now() where id = '00000000-0000-4000-9000-000000000001';
select ok(not public.picture_is_visible('covers', 'test/hid241-tall.webp'),
  'denied: pictures_select_visible: a cover staff hid isn''t served');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.story_cover_picture('statia-meteo-seed01'), null,
  'a reader gets no uploaded cover while it is hidden, so the app draws the automatic one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.story_cover_picture('statia-meteo-seed01'), null, 'staff still see the hidden picture');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'cover' ->> 'kind', 'upload',
  'the overview carries the real cover');

select * from finish();
rollback;
