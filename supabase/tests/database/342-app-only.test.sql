-- Database tests for app only stories behind their switch (bundle GAPS-15; stories S1-E3-08 and
-- S1-E4-09; decisions of 16 Oct 2026 and Q35: off until the apps exist).
-- What it proves:
-- - a new story reads on the web and in the app, and the 'app_only_stories' flag starts off;
-- - only the writer can set the choice: another member gets 'not_found', a visitor is refused;
-- - while the flag is off the choice changes nothing: readers get the chapter text, no label,
--   no notice, and shared passages still work;
-- - once the flag is on, readers and visitors get no chapter text (the answer says 'app_only'),
--   shared passages stop, the card and the story page say 'app_only', and the writer still
--   reads their own chapter.
-- No new table or policy: stories' policies are tested elsewhere; set_my_story_app_only() checks
-- the owner itself (my_live_story_id).
-- Personas: adult_writer (…01, the seed story's writer), teacher (…07, a reader), teacher (…07) also as the other member.
-- Test data: one published chapter of the seed story, inserted directly; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- Turns the switch on or off (as the table's owner, the way staff flip it in settings).
create function pg_temp.set_switch(wanted boolean) returns void language sql security definer as $$
  update public.feature_flags set is_enabled = wanted where key = 'app_only_stories';
$$;
-- The card's label, the way the shelf functions build cards (story_card_json is internal).
create function pg_temp.card_app_only() returns boolean language sql security definer as $$
  select (public.story_card_json('00000000-0000-4000-9000-000000000001') ->> 'app_only')::boolean;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'apponly1',
  95, 'Doar în aplicație', 'x', 3, 'published', 'Doar în aplicație', 'Primul paragraf al capitolului.', 4, now());
-- Published chapters normally set this through publishing; the direct insert sets it here.
update public.stories set first_published_at = now()
where id = '00000000-0000-4000-9000-000000000001' and first_published_at is null;

-- The defaults.
select is(
  (select is_app_only from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  false,
  'a story reads on the web and in the app by default');
select is(
  (select is_enabled from public.feature_flags where key = 'app_only_stories'),
  false,
  'the app only switch starts off, so no story becomes unreadable before the apps exist');

-- Who may set it.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(
  public.set_my_story_app_only('statia-meteo-seed01', true) ->> 'outcome',
  'not_found',
  'another member can''t set someone else''s story to app only');
select pg_temp.sign_out();
select throws_ok(
  $$select public.set_my_story_app_only('statia-meteo-seed01', true)$$,
  '42501', null,
  'a visitor who isn''t signed in can''t set a story to app only');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  public.set_my_story_app_only('statia-meteo-seed01', true) ->> 'outcome',
  'ok',
  'the writer sets their story to app only');
reset role;
select is(
  (select is_app_only from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  true,
  'the choice is saved even while the switch is off');

-- While the switch is off: nothing changes for readers.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(
  public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'body',
  'Primul paragraf al capitolului.',
  'with the switch off, a reader still reads the chapter of an app only story on the web');
select is(
  pg_temp.card_app_only(),
  false,
  'with the switch off, the card has no "In the app only" label');
select isnt(
  public.get_shared_passage('statia-meteo-seed01', 'apponly1', 1, 1),
  null,
  'with the switch off, a shared passage still shows');

-- Once the switch is on.
select pg_temp.set_switch(true);
select is(
  public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'body',
  '',
  'with the switch on, a reader gets no chapter text of an app only story on the web');
select is(
  (public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'app_only')::boolean,
  true,
  'the chapter answer says app only, so the reader shows the notice');
select is(
  pg_temp.card_app_only(),
  true,
  'the card carries the "In the app only" label');
select is(
  (public.get_story_page('statia-meteo-seed01') ->> 'app_only')::boolean,
  true,
  'the story page says app only, and still lists the story for the reader');
select is(
  public.get_shared_passage('statia-meteo-seed01', 'apponly1', 1, 1),
  null,
  'no shared passage comes from an app only story');
select pg_temp.sign_out();
select is(
  public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'body',
  '',
  'a visitor gets no teaser of an app only story either');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(
  public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'body',
  'Primul paragraf al capitolului.',
  'the writer still reads their own app only chapter');

-- Back on the web.
select public.set_my_story_app_only('statia-meteo-seed01', false);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(
  public.get_chapter('statia-meteo-seed01', 'apponly1') ->> 'body',
  'Primul paragraf al capitolului.',
  'when the writer switches back, readers read the chapter again');

select * from finish();
rollback;
