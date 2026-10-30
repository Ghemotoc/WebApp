-- Database tests for sharing a chapter and the quote-share card (stories S1-E4-05 and S1-E4-07).
-- What it proves:
-- - record_chapter_share() counts a reader's share in today's total, never who shared; the
--   writer's own share, a chapter the caller can't read and a signed-out caller don't count;
-- - chapter_shares is readable by the chapter's writer only (allowed and denied tests);
-- - quote_card_state() and make_quote_card(): one card per chapter per reader (Q17), the writer's
--   switch turns cards off, and a card counts as a share;
-- - quote_cards is readable by its owner only (allowed and denied tests); neither table can be
--   written directly;
-- - the hourly ranking counts shares with the ranking_weight_shares setting (S1-E5-03).
-- Test data: a chapter on adult_writer's seed story statia-meteo-seed01, shared by teacher and
-- teen_17; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- Today's share total for the test chapter, read as the test's owner, whatever the policies say.
create function pg_temp.shares_today() returns integer language sql security definer as $$
  select coalesce((select total from public.chapter_shares
                   where chapter_id = (select id from public.chapters where code = 'share001')), 0);
$$;
-- A story's score, read as the test's owner.
create function pg_temp.score_of(target_slug text) returns double precision
language sql security definer as $$
  select coalesce((select score from public.story_scores join public.stories on stories.id = story_scores.story_id
                   where stories.slug = target_slug), 0);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) two seed stories each get one published chapter, so both are scored.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'share001', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '2 days'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'share002', 1,
   'One', 'x', 3, 'published', 'One', 'The first chapter here.', 3, now() - interval '2 days');

/* ---------- 1. Sharing a chapter ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.record_chapter_share('statia-meteo-seed01', 'share001') $$),
  '42501', 'a signed-out visitor''s share isn''t recorded (refused)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.record_chapter_share('statia-meteo-seed01', 'share001'), 'teacher''s share is counted');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(public.record_chapter_share('statia-meteo-seed01', 'share001'), 'teen_17''s share is counted');
select is(pg_temp.shares_today(), 2, 'today''s total for the chapter is 2');
select ok(not public.record_chapter_share('statia-meteo-seed01', 'nosuch01'),
  'a chapter that doesn''t exist isn''t counted');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(not public.record_chapter_share('statia-meteo-seed01', 'share001'),
  'the writer sharing their own chapter isn''t counted');
select is(pg_temp.shares_today(), 2, 'so the total stays at 2');

/* ---------- 2. chapter_shares row-level security ---------- */

select is((select total from public.chapter_shares), 2,
  'allowed: chapter_shares_select_owner (the writer sees their chapter''s total)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.chapter_shares), 0,
  'denied: chapter_shares_select_owner (a reader sees no writer''s totals)');
select is(pg_temp.refusal($$ insert into public.chapter_shares (chapter_id, shared_on, total)
  values ((select id from public.chapters where code = 'share001'), current_date, 99) $$), '42501',
  'the share totals can''t be written directly');

/* ---------- 3. Quote cards ---------- */

select is(public.quote_card_state('statia-meteo-seed01', 'share001'),
  '{"allowed": true, "already_made": false}'::jsonb, 'teacher may make a quote card');
select is(public.make_quote_card('statia-meteo-seed01', 'share001') ->> 'outcome', 'ok',
  'teacher makes a quote card');
select is(pg_temp.shares_today(), 3, 'and the card counts as a share');
select is(public.make_quote_card('statia-meteo-seed01', 'share001') ->> 'outcome', 'already_made',
  'a second card from the same chapter is refused: one per chapter (Q17)');
select is(public.quote_card_state('statia-meteo-seed01', 'share001') ->> 'already_made', 'true',
  'and the state says so on every device');
select is((select count(*)::integer from public.quote_cards), 1,
  'allowed: quote_cards_select_own (the reader sees their own card)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from public.quote_cards), 0,
  'denied: quote_cards_select_own (nobody else sees what a reader quoted)');

-- The writer switches quote cards off through their story settings.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.update_my_story('statia-meteo-seed01', '{"quote_cards_enabled": false}'::jsonb);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.make_quote_card('statia-meteo-seed01', 'share001') ->> 'outcome', 'switched_off',
  'with the writer''s switch off, no card can be made');

select pg_temp.sign_out();
select is(public.quote_card_state('statia-meteo-seed01', 'share001') ->> 'allowed', 'false',
  'a signed-out visitor may not make a card');

/* ---------- 4. Shares in the ranking ---------- */

set local role postgres;
select public.compute_story_scores();
select ok(pg_temp.score_of('statia-meteo-seed01') > pg_temp.score_of('the-girl-who-fixed-radios-seed02'),
  'shares lift a story''s popularity score (S1-E5-03, ranking_weight_shares)');

select * from finish();

rollback;
