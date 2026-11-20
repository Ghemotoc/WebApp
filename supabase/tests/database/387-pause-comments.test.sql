-- Database tests for pausing new comments for a while (bundle CALM-8; IDEA-20261109-8; story
-- S1-E6-01; the design handover's Step 4, "Pausing new comments", point 14).
-- What it proves:
-- - the writer pauses new comments for 24 hours, 3 days or 7 days through update_my_story(), the
--   end worked out on the database's clock, in hours, so a summer-time change can't shift it;
--   any other length is refused;
-- - another member can't pause or resume someone else's story, and a signed-out visitor can't
--   either (denied);
-- - during a pause a reader's comment, reply and paragraph comment are refused with the hint
--   'paused_until:<end>', and so is the writer's own (the idea says "nobody");
-- - the comment lists carry the end while the pause runs, with "Resume now" for the writer only,
--   and so does the story page, for its Comments row, except to a reader the writer blocks;
-- - reactions, a report and a moderator's decision carry on during a pause;
-- - once the time has passed, comments are allowed again, even before the job runs;
-- - end_comment_pauses() clears the pause and sends the writer one comments_resumed note, in the
--   app only (no email, never in a digest), and it runs every 5 minutes; members can't run it;
-- - 'off', "Resume now" and Nobody end a pause, and saving other settings keeps it;
-- - a language edition shares its story's pause, and the job sends one note for the story;
-- - Download my data carries the pause with the story row.
-- Personas: adult_writer (…01, the writer), teacher (…07, a reader), moderator (…10), blocker
-- (…15, who reports), blocked (…16, whom the writer blocks for one test).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(65);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Comments and labels the tests come back to.
create temp table named (label text primary key, id uuid);
grant select, insert on named to authenticated;

-- adult_writer's first seed story gets a published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'pau00001', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Primul paragraf.', 2, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. Before a pause, then the writer pauses ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'before', (public.post_comment('statia-meteo-seed01', 'pau00001', 'Înainte de pauză.') ->> 'id')::uuid;
select isnt((select id from named where label = 'before'), null, 'before a pause, a reader comments');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$select public.update_my_story('statia-meteo-seed01', '{"comments_pause": "2w"}')$$,
  '23514', null, 'a length other than 24 hours, 3 days or 7 days is refused');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "24h"}') ->> 'outcome', 'ok',
  'the writer pauses new comments for 24 hours');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'),
  now() + interval '24 hours', 'the pause ends 24 hours from now, on the database''s clock');

/* ---------- 2. Only the writer pauses or resumes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "7d"}') ->> 'outcome', 'not_found',
  'denied: another member can''t pause someone else''s story');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "off"}') ->> 'outcome', 'not_found',
  'denied: nor end its pause through the settings');
select is(public.end_my_comment_pause('statia-meteo-seed01') ->> 'outcome', 'not_found',
  'denied: nor through "Resume now"');
select pg_temp.sign_out();
select throws_ok($$select public.end_my_comment_pause('statia-meteo-seed01')$$, '42501', null,
  'denied: a signed-out visitor can''t resume comments');
reset role;
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'),
  now() + interval '24 hours', 'the writer''s pause is unchanged');

/* ---------- 3. Nobody adds a comment during the pause ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$select public.post_comment('statia-meteo-seed01', 'pau00001', 'În pauză?')$$,
  '55000', null, 'a reader''s comment is refused during the pause');
select is(pg_temp.error_hint($$select public.post_comment('statia-meteo-seed01', 'pau00001', 'În pauză?')$$),
  'paused_until:' || (to_jsonb(now() + interval '24 hours') #>> '{}'),
  'the refusal says until when, for the page');
select alike(pg_temp.error_hint(format($$select public.post_comment('statia-meteo-seed01', 'pau00001', 'Un răspuns?', false, %L)$$,
    (select id from named where label = 'before'))),
  'paused_until:%', 'a reply is refused too');
select alike(pg_temp.error_hint($$select public.post_paragraph_comment('statia-meteo-seed01', 'pau00001', 1, 'Pe paragraf?')$$),
  'paused_until:%', 'and a comment on a paragraph');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select alike(pg_temp.error_hint($$select public.post_comment('statia-meteo-seed01', 'pau00001', 'Eu pot?')$$),
  'paused_until:%', 'the writer is refused too: the idea says nobody');

/* ---------- 4. The lists say a pause runs ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.chapter_comments('statia-meteo-seed01', 'pau00001') ->> 'comments_paused_until')::timestamptz,
  now() + interval '24 hours', 'the chapter''s comment list carries the end, for the paused line');
select is(public.chapter_comments('statia-meteo-seed01', 'pau00001') ->> 'can_resume_comments', 'false',
  'a reader gets no "Resume now"');
select is(public.chapter_comments('statia-meteo-seed01', 'pau00001') #>> '{comments,0,body}', 'Înainte de pauză.',
  'the comments already posted stay');
select ok(public.paragraph_comments('statia-meteo-seed01', 'pau00001', 1) ? 'comments_paused_until',
  'the paragraph thread carries the end too');
select ok(public.paragraph_comment_counts('statia-meteo-seed01', 'pau00001') ? 'comments_paused_until',
  'and the paragraph counts, so a paragraph without comments offers no new thread');
select is((public.get_story_page('statia-meteo-seed01') ->> 'comments_paused_until')::timestamptz,
  now() + interval '24 hours', 'the story page carries the end too, for its Comments row');
select pg_temp.sign_out();
select is((public.get_story_page('statia-meteo-seed01') ->> 'comments_paused_until')::timestamptz,
  now() + interval '24 hours', 'and so does a signed-out visitor''s story page');

-- A reader the writer blocks gets no story page at all, so the end doesn't reach them either.
reset role;
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000016');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is(public.get_story_page('statia-meteo-seed01'), null,
  'a reader the writer blocks gets no story page, so no end (denied)');
reset role;
delete from public.blocks
where user_id = '00000000-0000-4000-8000-000000000001' and blocked_user_id = '00000000-0000-4000-8000-000000000016';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.chapter_comments('statia-meteo-seed01', 'pau00001') ->> 'can_resume_comments', 'true',
  'the writer gets "Resume now"');

/* ---------- 5. Reactions, reports and moderators carry on ---------- */

select lives_ok(format($$select public.react_to_comment(%L, 'heart')$$, (select id from named where label = 'before')),
  'a reaction on a comment carries on during a pause');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok(format($$select * from public.report_item('comment', %L, 'spam')$$, (select id from named where label = 'before')),
  'a comment can still be reported during a pause');
reset role;
insert into named select 'case', id from public.cases
where item_type = 'comment' and item_id = (select id from named where label = 'before') and status = 'open';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(public.admin_decide_case((select id from named where label = 'case'), 'hide', 'Spam, hidden during a pause'),
  'a moderator still decides on a comment during a pause');
reset role;
select is((select state::text from public.moderated_items
  where item_type = 'comment' and item_id = (select id from named where label = 'before')),
  'hidden', 'and the comment is hidden');

/* ---------- 6. Once the time has passed ---------- */

reset role;
update public.stories set comments_paused_until = now() - interval '1 minute'
where id = '00000000-0000-4000-9000-000000000001';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.post_comment('statia-meteo-seed01', 'pau00001', 'Iar se poate.') ->> 'id' is not null,
  'once the time has passed, a reader comments again, even before the job runs');
select ok(not (public.chapter_comments('statia-meteo-seed01', 'pau00001') ? 'comments_paused_until'),
  'and the list no longer says paused');
select is(public.get_story_page('statia-meteo-seed01') ->> 'comments_paused_until', null,
  'nor does the story page''s Comments row');

/* ---------- 7. The job ends the pause with one quiet note ---------- */

select throws_ok($$select public.end_comment_pauses()$$, '42501', null,
  'denied: a member can''t run the job');

reset role;
select is(public.end_comment_pauses(), 1, 'the job ends the one pause whose time has passed');
select is((select comments_paused_until from public.stories where id = '00000000-0000-4000-9000-000000000001'), null,
  'and clears it');
select is((select count(*)::integer from public.notifications
  where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'comments_resumed'
    and story_id = '00000000-0000-4000-9000-000000000001'), 1,
  'the writer gets one note');
select is((select count(*)::integer from public.email_outbox
  where notification_ids && array(select id from public.notifications where kind = 'comments_resumed')), 0,
  'in the app only: no email is queued');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'comments_resumed'), null,
  'and it never goes in a daily digest');
select is(public.end_comment_pauses(), 0, 'run again, the job finds nothing and sends no second note');
select is((select schedule from cron.job where jobname = 'end-comment-pauses'), '*/5 * * * *',
  'the job runs every 5 minutes');
select is(public.notification_category('comments_resumed'), 'stories',
  'the note sits under Stories on the Notifications page, not under Replies');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(jsonb_path_query_first(public.my_notifications(null, 50),
    '$.notifications[*] ? (@.kind == "comments_resumed")') #>> '{story,title}',
  (select title from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'the note is in the writer''s list, naming the story');

/* ---------- 8. The writer ends a pause early ---------- */

select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "3d"}') ->> 'outcome', 'ok',
  'the writer pauses for 3 days');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'),
  now() + interval '3 days', 'the pause ends 3 days from now');
select is(public.update_my_story('statia-meteo-seed01', '{"comment_audience": "everyone"}') ->> 'outcome', 'ok',
  'the writer saves another setting');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'),
  now() + interval '3 days', 'and the pause stays as it was');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "off"}') ->> 'outcome', 'ok',
  'the writer turns the switch off');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'), null,
  'which ends the pause');

select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "7d"}') ->> 'outcome', 'ok',
  'the writer pauses for 7 days');
select is(public.end_my_comment_pause('statia-meteo-seed01') ->> 'outcome', 'ok',
  'then uses "Resume now" under a chapter');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'), null,
  'which ends the pause at once, with no note');

select is(public.update_my_story('statia-meteo-seed01', '{"comments_pause": "24h"}') ->> 'outcome', 'ok',
  'the writer pauses again');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_enabled": false}') ->> 'outcome', 'ok',
  'then chooses Nobody under Who can comment');
select is((select comments_paused_until from public.stories where slug = 'statia-meteo-seed01'), null,
  'which ends the pause, so an old one can''t come back when comments are turned on again');
select is(public.update_my_story('statia-meteo-seed01', '{"comments_enabled": true}') ->> 'outcome', 'ok',
  'the writer turns comments back on');

/* ---------- 9. Language editions share the pause (TRANSLATE-1) ---------- */

select is(public.add_story_language('statia-meteo-seed01', 'en', 'The Weather Station', 'A grandmother notes the weather.') ->> 'outcome',
  'ok', 'the writer adds English to the story');
insert into named select 'edition', id from public.stories
where edition_of_story_id = '00000000-0000-4000-9000-000000000001' and language_code = 'en';
select public.update_my_story('statia-meteo-seed01', '{"comments_pause": "24h"}');
select is((select comments_paused_until from public.stories where id = (select id from named where label = 'edition')),
  now() + interval '24 hours', 'a pause on the story pauses its English edition too, like comments on or off');
select is((public.get_story_page((select slug from public.stories where id = (select id from named where label = 'edition')))
    ->> 'comments_paused_until')::timestamptz,
  now() + interval '24 hours', 'and the English edition''s page shows the same end');
select is(public.update_my_story((select slug from public.stories where id = (select id from named where label = 'edition')),
    '{"comments_pause": "off"}') ->> 'outcome', 'ok',
  'a change sent to the English edition alone is taken');
select is((select comments_paused_until from public.stories where id = (select id from named where label = 'edition')),
  now() + interval '24 hours', 'but the edition keeps the story''s pause: it is a shared setting');
select is(public.end_my_comment_pause((select slug from public.stories where id = (select id from named where label = 'edition'))) ->> 'outcome',
  'ok', '"Resume now" under an English chapter');
select is((select count(*)::integer from public.stories
  where (id = '00000000-0000-4000-9000-000000000001' or edition_of_story_id = '00000000-0000-4000-9000-000000000001')
    and comments_paused_until is not null), 0,
  'ends the pause in every language');

-- A pause that ends by itself sends one note for the story, not one per language.
select public.update_my_story('statia-meteo-seed01', '{"comments_pause": "24h"}');
reset role;
update public.stories set comments_paused_until = now() - interval '1 minute'
where id = '00000000-0000-4000-9000-000000000001';
select is(public.end_comment_pauses(), 1, 'the job ends the story''s pause once');
select is((select count(*)::integer from public.notifications
  where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'comments_resumed'), 2,
  'one more note, not one per language');

/* ---------- 10. Lengths are hours, whatever the session's time zone ---------- */

-- Romania moves its clocks forward at 03:00 on 28 March 2027. Three days from 18:00 UTC on 26 March
-- is 72 hours later, as the switch shows the writer, even in a session on Romania time.
set local timezone = 'Europe/Bucharest';
select is(public.comment_pause_end('3d', '2027-03-26 18:00+00'), '2027-03-29 18:00+00'::timestamptz,
  'a 3-day pause across the summer-time change lasts 72 hours, as the switch showed');
select is(public.comment_pause_end('7d', '2027-10-29 18:00+00'), '2027-11-05 18:00+00'::timestamptz,
  'and a 7-day pause across the change back lasts 168 hours');
reset timezone;

/* ---------- 11. Download my data ---------- */

select ok(public.export_tables_of('00000000-0000-4000-8000-000000000001') -> 'stories' -> 0 ? 'comments_paused_until',
  'Download my data carries the pause with each story');

select * from finish();
rollback;
