-- Database tests for readers to writers (bundle IDEAS-1, part c; ideas IDEA-20261031-3 and -10).
-- What it proves, by the ideas' criteria:
-- - "I finished it": only for a story on the reader's Finished shelf, never one's own, once per
--   story, nothing across a block either way, a fixed notification with no email, and the
--   story page's state says "sent" afterwards (idea 3);
-- - the writer's card colour: one of the nine palette colours or our default, saved through
--   update_my_story() and handed to the reader's cards by share_options() (idea 10);
-- - finished_thanks_select_own: allowed and denied;
-- - Download my data and account deletion both name finished_thanks.
-- Personas: adult_writer (…01, writes statia-meteo-seed01), teacher (…07, an adult reader),
-- blocker (…15, another reader). Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.outcome(answer jsonb) returns text language sql as $$
  select answer ->> 'outcome';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

delete from public.notifications where kind = 'story_finished';
-- A published chapter of the writer's story, for the cards' options.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select stories.id, stories.user_id, 'thank001', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Ploua.', 1, now()
from public.stories where stories.slug = 'statia-meteo-seed01';
delete from public.library_entries
where user_id = '00000000-0000-4000-8000-000000000007'
  and story_id = (select id from public.stories where slug = 'statia-meteo-seed01');

/* ---------- 1. "I finished it" ---------- */

select set_config('role', 'anon', true);
select throws_ok($$ select public.send_finished_thanks('statia-meteo-seed01') $$, '42501', null,
  'a visitor who isn''t logged in can''t thank a writer');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.outcome(public.send_finished_thanks('statia-meteo-seed01')), 'not_finished',
  'a reader can''t send it before the story is on their Finished shelf');
select is(public.story_library_state('statia-meteo-seed01') ->> 'thanks_sent', 'false',
  'the story page says nothing was sent yet');

select pg_temp.as_owner();
insert into public.library_entries (user_id, story_id, shelf)
select '00000000-0000-4000-8000-000000000007', stories.id, 'finished'
from public.stories where stories.slug = 'statia-meteo-seed01';

-- A block either way stops it: the writer blocks the reader for a moment.
insert into public.blocks (user_id, blocked_user_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000007');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.outcome(public.send_finished_thanks('statia-meteo-seed01')), 'not_found',
  'nothing is sent to a writer who blocked the reader');
select pg_temp.as_owner();
delete from public.blocks
where user_id = '00000000-0000-4000-8000-000000000001'
  and blocked_user_id = '00000000-0000-4000-8000-000000000007';
select is((select count(*) from public.finished_thanks
  where user_id = '00000000-0000-4000-8000-000000000007'), 0::bigint,
  'and nothing was recorded across the block');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.outcome(public.send_finished_thanks('statia-meteo-seed01')), 'ok',
  'a reader who finished the story tells the writer');
select is(pg_temp.outcome(public.send_finished_thanks('statia-meteo-seed01')), 'already_sent',
  'they can only do it once per story');
select is(public.story_library_state('statia-meteo-seed01') ->> 'thanks_sent', 'true',
  'the story page now says it was sent');

select pg_temp.as_owner();
select is((select count(*) from public.notifications
  where kind = 'story_finished' and user_id = '00000000-0000-4000-8000-000000000001'), 1::bigint,
  'the writer gets one notification');
select is((select count(*) from public.email_outbox
  where email_outbox.notification_ids && array(select id from public.notifications where kind = 'story_finished')),
  0::bigint, 'and no email');
select is(public.notification_category('story_finished'), 'replies',
  'it sits with replies and reactions in the writer''s notifications');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.outcome(public.send_finished_thanks('statia-meteo-seed01')), 'own_story',
  'a writer can''t thank themselves');

/* ---------- 2. finished_thanks_select_own ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*) from public.finished_thanks), 1::bigint,
  'allowed: the reader sees their own thank-you');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.finished_thanks), 0::bigint,
  'denied: the writer can''t list who thanked them (only the notification says so)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*) from public.finished_thanks), 0::bigint,
  'denied: another reader sees none');
select throws_ok($$ insert into public.finished_thanks (user_id, story_id)
  select '00000000-0000-4000-8000-000000000015', id from public.stories limit 1 $$, '42501', null,
  'denied: nobody writes the table directly');

/* ---------- 3. The writer's card colour ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01',
    'thank001') -> 'card_colour', 'null'::jsonb,
  'a story with no colour of its own gives the cards our default');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.outcome(public.update_my_story('statia-meteo-seed01', '{"card_colour": "sage"}')), 'ok',
  'the writer picks one of our palette colours');
select throws_ok($$ select public.update_my_story('statia-meteo-seed01', '{"card_colour": "neon"}') $$,
  '23514', null, 'a colour off the palette is refused');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01',
    'thank001') ->> 'card_colour', 'sage',
  'the reader''s new cards start in the writer''s colour');

/* ---------- 4. Download my data and account deletion ---------- */

select pg_temp.as_owner();
select is((select is_included from public.data_export_tables() where table_name = 'finished_thanks'),
  true, 'Download my data includes the stories the person thanked');
select is((select action from public.account_deletion_rules() where table_name = 'finished_thanks'),
  'delete', 'deleting the account deletes them');

select * from finish();
rollback;
