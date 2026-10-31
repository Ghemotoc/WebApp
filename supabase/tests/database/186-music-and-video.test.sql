-- Database tests for music and video cards in chapters (story S1-E3-10; CLAUDE.md rules 1, 6, 8).
-- What it proves:
-- - a writer adds a card only to their own chapter, only while media_embeds is on, and only in
--   the shapes the allowed services use (criterion 1);
-- - the chapter text may hold only the writer's own cards, at most chapter_max_embeds, and a card
--   isn't counted as words (rule 8);
-- - readers get each card's service, what to play and its title with the chapter, and nothing for
--   a card someone else made (criterion 2);
-- - a reader reports a card; a moderator removes that one card and the chapter stays readable,
--   showing only "removed" in its place (criterion 4);
-- - policies chapter_embeds_select_own and chapter_embeds_select_moderation: allowed and denied.
-- Test data: adult_writer (…01) and their seed story "Stația meteo"; blocker (…15) as another
-- member and reader; moderator (…10); support (…11). Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

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

-- A draft chapter on adult_writer's seed story.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, status)
values ('18600000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
  '00000000-0000-4000-8000-000000000001', 't186film', 1, 'Prognoza', 'Bunica ascultă radioul.', 'draft');

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. Adding a card (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
    'youtube', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'A video', 'A channel') $$),
  '0A000', 'nothing is added while media_embeds is off');

select pg_temp.as_postgres();
update public.feature_flags set is_enabled = true where key = 'media_embeds';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named
select 'video', public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
  'youtube', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '  How a forecast is made ', 'Weather school');
insert into named
select 'song', public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
  'spotify', 'track/4uLU6hMCjMI75M1A2tKUQC', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', null, null);
select is((select title from public.chapter_embeds where id = (select id from named where label = 'video')),
  'How a forecast is made', 'the writer adds a YouTube card; its oEmbed title is kept, trimmed');
select is(pg_temp.refusal($$ select public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
    'youtube', 'javascript:x', 'https://www.youtube.com/watch?v=javascript:x', null, null) $$),
  '23514', 'a media path in any other shape is refused');
select is(pg_temp.refusal($$ select public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
    'vimeo', '123456', 'https://evil.example/vimeo.com/123456', null, null) $$),
  '23514', 'a link from another host is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.refusal($$ select public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
    'loom', '0123456789abcdef0123456789abcdef', 'https://www.loom.com/share/0123456789abcdef0123456789abcdef', null, null) $$),
  '23514', 'another member can''t add a card to someone else''s chapter');
select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.register_chapter_embed('18600000-0000-4000-8000-000000000001',
    'youtube', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', null, null) $$),
  '42501', 'a signed-out visitor can''t add a card');

/* ---------- 2. Who reads the table ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.chapter_embeds
           where chapter_id = '18600000-0000-4000-8000-000000000001'), 2,
  'allowed: chapter_embeds_select_own: the writer reads their own cards');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.chapter_embeds
           where chapter_id = '18600000-0000-4000-8000-000000000001'), 0,
  'denied: chapter_embeds_select_own: another member can''t read someone else''s cards');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.chapter_embeds
           where chapter_id = '18600000-0000-4000-8000-000000000001'), 2,
  'allowed: chapter_embeds_select_moderation: a moderator reads every card');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.chapter_embeds
           where chapter_id = '18600000-0000-4000-8000-000000000001'), 0,
  'denied: chapter_embeds_select_moderation: support staff can''t (no moderation access)');

/* ---------- 3. Saving the text (rule 8) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table bodies (label text primary key, body text) on commit drop;
grant all on bodies to anon, authenticated;
insert into bodies values
  ('good', format(E'Bunica ascultă radioul.\n\n![How a forecast is made](embed:%s)\n\n![](embed:%s)',
     (select id from named where label = 'video'), (select id from named where label = 'song'))),
  ('unknown', E'Bunica.\n\n![x](embed:99999999-9999-4999-8999-186000000099)');
select is(public.save_chapter_draft('t186film', 'Prognoza', (select body from bodies where label = 'good'), 1) ->> 'status',
  'saved', 'the writer saves a chapter with a video and a song');
select is((select word_count from public.chapters where code = 't186film'), 3,
  'a card''s address and title aren''t counted as words');
select is(pg_temp.refusal($$ select public.save_chapter_draft('t186film', 'Prognoza', (select body from bodies where label = 'unknown'), 2) $$),
  '23514:embed_unknown', 'a text can''t hold a card that isn''t the writer''s');
select pg_temp.as_postgres();
update public.settings set value = '1'::jsonb where key = 'chapter_max_embeds';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.save_chapter_draft('t186film', 'Prognoza', (select body from bodies where label = 'good'), 2) $$),
  '23514:too_many_embeds', 'more cards than chapter_max_embeds are refused');
select pg_temp.as_postgres();
update public.settings set value = '10'::jsonb where key = 'chapter_max_embeds';

/* ---------- 4. Reporting needs a published chapter ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.refusal(format($$ select * from public.report_item('embed', %L, 'other') $$,
    (select id from named where label = 'video'))),
  '23514', 'a card in a draft can''t be reported (or found out about)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.publish_chapter('t186film') ->> 'outcome', 'ok', 'the writer publishes the chapter');

/* ---------- 5. Reading (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(
  public.get_chapter('statia-meteo-seed01', 't186film') -> 'embeds' -> (select id::text from named where label = 'video'),
  '{"state": "visible", "service": "youtube", "media_path": "dQw4w9WgXcQ", "title": "How a forecast is made", "author_name": "Weather school"}'::jsonb,
  'a reader gets the card''s service, what to play and its title');
select is(public.my_embeds(array[(select id from named where label = 'video')]), '{}'::jsonb,
  'my_embeds tells nobody about another person''s cards');
select pg_temp.sign_out();
select is(
  public.get_chapter('statia-meteo-seed01', 't186film') #>> array['embeds', (select id::text from named where label = 'song'), 'service'],
  'spotify', 'a signed-out visitor sees the card inside the teaser');

/* ---------- 6. Reporting and removing one card (criterion 4) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(format($$ select * from public.report_item('embed', %L, 'other', 'Not suitable') $$,
    (select id from named where label = 'video')),
  'a reader reports a video card');
select pg_temp.as_postgres();
select is(public.reportable_item_summary('embed', (select id from named where label = 'video')),
  'Video from YouTube in chapter 1 of Stația meteo', 'the queue says what the card is and where');
insert into named
select 'case', cases.id from public.cases where cases.item_type = 'embed' and cases.item_id = (select id from named where label = 'video');
select is(public.notification_item_json((select id from named where label = 'case')) ->> 'address',
  '/s/statia-meteo-seed01/t186film', 'a notice about the card links to its chapter');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_case_embed((select id from named where label = 'case')) ->> 'source_url',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'the case page shows the moderator the writer''s link');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(pg_temp.refusal(format($$ select public.admin_case_embed(%L) $$, (select id from named where label = 'case'))),
  '42501', 'a member can''t read the case''s card');

select pg_temp.as_postgres();
insert into public.moderated_items (user_id, item_type, item_id, state, case_id, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000001', 'embed', (select id from named where label = 'video'), 'removed',
  (select id from named where label = 'case'), '00000000-0000-4000-8000-000000000010', 'Test removal');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(
  public.get_chapter('statia-meteo-seed01', 't186film') -> 'embeds' -> (select id::text from named where label = 'video'),
  '{"state": "removed"}'::jsonb, 'a removed card says only that');
select is(
  public.get_chapter('statia-meteo-seed01', 't186film') #>> array['embeds', (select id::text from named where label = 'song'), 'state'],
  'visible', 'the chapter and its other card stay up');

select * from finish();
rollback;
