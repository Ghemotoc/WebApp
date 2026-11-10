-- Database tests for contests taking original work only (bundle GAPS-14; Robert, 7 Nov 2026:
-- fan fiction is welcome on the platform, but no contests unless the story is original).
-- What it proves:
-- - a story labelled fan fiction can't be entered: enter_contest() refuses it with the hint
--   'fan_fiction', and the story's contest card lists 'fan_fiction' as the reason beforehand;
-- - the same story, once its label says it is original, can be entered;
-- - a story relabelled as fan fiction after it was entered keeps its entry (staff decide), and
--   the staff entries list says it is labelled fan fiction now.
-- No new policies or tables: the contest tables' policies are tested in 265.
-- Personas: adult_writer (…01), admin (…09).
-- Test data: an open contest on its own landing page and one published chapter of the seed story,
-- inserted directly; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or 'ok' when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
-- Sets the seed story's fan fiction label (as the table's owner, the way the label form saves it).
create function pg_temp.set_fan_fiction(wanted boolean) returns void language sql security definer as $$
  update public.stories set is_fan_fiction = wanted where id = '00000000-0000-4000-9000-000000000001';
$$;
grant execute on all functions in schema pg_temp to authenticated;

create temporary table kept (label text primary key, id uuid) on commit drop;
grant all on kept to authenticated;

-- An open contest for adults in Romania, in Romanian, taking entries today.
with page as (
  insert into public.landing_pages (slug, page_type) values ('concurs-fan-fiction', 'contest') returning id
), contest as (
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select page.id, 'Concursul original', 'The original contest', public.romania_today() - 1, public.romania_today() + 5,
    public.romania_today() + 10, array['18_plus'], array['RO'], array['ro'], now()
  from page
  returning id
)
insert into kept (label, id) select 'contest', contest.id from contest;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ff140001',
  1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());

/* ---------- 1. Fan fiction can't be entered ---------- */

select pg_temp.set_fan_fiction(true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(
  (select bool_or(option -> 'problems' ? 'fan_fiction')
   from jsonb_array_elements(public.contest_entry_options('statia-meteo-seed01')) as option
   where option ->> 'id' = (select id::text from kept where label = 'contest')),
  'the story''s contest card says fan fiction can''t be entered, before the writer tries');
select is(pg_temp.hint_of($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$),
  'fan_fiction', 'entering a story labelled fan fiction is refused with the reason');
reset role;
select is((select count(*)::integer from public.contest_entries where contest_id = (select id from kept where label = 'contest')),
  0, 'and no entry is saved');

/* ---------- 2. The same story, labelled original, can ---------- */

select pg_temp.set_fan_fiction(false);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$ select public.enter_contest((select id from kept where label = 'contest'), 'statia-meteo-seed01') $$),
  'ok', 'once the label says the story is original, it can be entered');

/* ---------- 3. Relabelled after entering: staff see it ---------- */

select pg_temp.set_fan_fiction(true);
reset role;
select is((select status::text from public.contest_entries where contest_id = (select id from kept where label = 'contest')),
  'valid', 'relabelling the story as fan fiction doesn''t drop the entry by itself');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(
  (select item ->> 'is_fan_fiction'
   from jsonb_array_elements(public.admin_contest_entries((select id from kept where label = 'contest'))) as item),
  'true', 'the staff entries list says the story is labelled fan fiction now');

select * from finish();
rollback;
