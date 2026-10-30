-- Database tests for the rank badges on a story's cover (CMS-1g; Robert, 30 Oct 2026, 10:44 to 10:48).
-- What it proves:
-- - story_tag_ranks() ranks a story in each tag by the tag page's popular order (the same formula);
-- - ranks count only the stories the reader may see: a 16+ story ahead of it counts for an adult,
--   not for a visitor or a 14-year-old; a reader who may not see the story gets nothing;
-- - a tag with fewer than rank_badge_min_stories stories, or a story with no score, shows no rank;
-- - the cover shows the 3 best ranks by default, or the writer's picks (only those with a rank);
-- - set_rank_badge_tags() takes up to 3 of the story's approved tags, from its writer only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- A story's ranks as one line: "tag #rank/total" for each tag ('-' when no rank), in tag order.
create function pg_temp.ranks(target_slug text) returns text language sql as $$
  select coalesce(string_agg(ranks.tag_name || ' ' || coalesce('#' || ranks.tag_rank || '/' || ranks.stories_in_tag, '-'), ', '), '')
  from public.story_tag_ranks(target_slug) as ranks;
$$;
-- The tags the cover shows as badges, in the order shown.
create function pg_temp.badges(target_slug text) returns text language sql as $$
  select coalesce(string_agg(ranks.tag_name, ',' order by ranks.tag_rank, ranks.stories_in_tag desc, ranks.tag_name), '')
  from public.story_tag_ranks(target_slug) as ranks where ranks.is_badge;
$$;
-- The SQLSTATE and hint a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
declare
  raised_state text;
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_state = returned_sqlstate, raised_hint = pg_exception_hint;
  return raised_state || ' ' || coalesce(raised_hint, '');
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Seven readable stories. adult_writer (…01) owns r1; teacher (…07) the rest. r7 is 16+ and the
-- most popular; r5 has no score yet.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating, first_published_at, last_chapter_published_at)
select ('00000000-0000-4000-9176-00000000000' || number)::uuid,
  case when number = 1 then '00000000-0000-4000-8000-000000000001' else '00000000-0000-4000-8000-000000000007' end::uuid,
  'r' || number, 'Rank ' || number, 'ro', (select id from public.categories where slug = 'fiction'),
  case when number = 7 then '16_plus' else 'all_ages' end::public.story_rating,
  now() - make_interval(days => number), now() - make_interval(days => number)
from generate_series(1, 7) as number;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
select id, user_id, 'rnk0000' || right(slug, 1), 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()
from public.stories where id::text like '00000000-0000-4000-9176-%';
insert into public.story_scores (story_id, score)
select ('00000000-0000-4000-9176-00000000000' || number)::uuid, score
from (values (1, 50), (2, 60), (3, 70), (4, 80), (6, 40), (7, 100)) as scores (number, score);

-- Tags: ranka, rankd and ranke on every story; rankb on r1, r5, r6 and r7; rankc on r1 and r2;
-- rankwait (not approved yet) on r1.
insert into public.tags (name, normalised_name, status) values
  ('ranka', 'ranka', 'approved'), ('rankb', 'rankb', 'approved'), ('rankc', 'rankc', 'approved'),
  ('rankd', 'rankd', 'approved'), ('ranke', 'ranke', 'approved'), ('rankwait', 'rankwait', 'waiting');
insert into public.story_tags (story_id, tag_id, user_id)
select stories.id, tags.id, stories.user_id from public.stories join public.tags on
  (tags.name in ('ranka', 'rankd', 'ranke'))
  or (tags.name = 'rankb' and stories.slug in ('r1', 'r5', 'r6', 'r7'))
  or (tags.name = 'rankc' and stories.slug in ('r1', 'r2'))
  or (tags.name = 'rankwait' and stories.slug = 'r1')
where stories.id::text like '00000000-0000-4000-9176-%';
update public.settings set value = '3'::jsonb where key = 'rank_badge_min_stories';

/* ---------- 1. The same formula, counted per reader ---------- */

select pg_temp.sign_out();
select is(pg_temp.ranks('r1'), 'ranka #4/6, rankb #1/3, rankc -, rankd #4/6, ranke #4/6',
  'a visitor: r1 is 4th of the 6 stories they may see, after r4, r3 and r2 (the tag page''s popular order)');
select is(pg_temp.badges('r1'), 'rankb,ranka,rankd',
  'the cover shows the 3 best ranks; ties go to the bigger tag, then the name');
select ok(not exists (select 1 from public.story_tag_ranks('r1') where tag_name = 'rankwait'),
  'a tag staff haven''t approved has no rank');
select is(pg_temp.ranks('r7'), '', 'a visitor gets nothing for a 16+ story');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is(pg_temp.ranks('r1'), 'ranka #4/6, rankb #1/3, rankc -, rankd #4/6, ranke #4/6',
  'a 14-year-old: the 16+ story ahead of r1 doesn''t count');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.ranks('r1'), 'ranka #5/7, rankb #2/4, rankc -, rankd #5/7, ranke #5/7',
  'an adult: the 16+ story counts, so r1 is one place lower');
select is(pg_temp.ranks('r5'), 'ranka -, rankb -, rankd -, ranke -', 'a story with no score yet shows no rank');

/* ---------- 2. The writer picks ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_rank_badge_tags('r1', array['RankE', 'rankc']) ->> 'outcome', 'ok',
  'the writer picks two of the story''s tags, typed in any case');
select is(pg_temp.badges('r1'), 'ranke', 'the cover shows the picked tags that have a rank, and only those');
select is((select string_agg(tag_name, ',') from public.story_tag_ranks('r1') where is_picked), 'rankc,ranke',
  'both picks are remembered for the picker');
select is(pg_temp.refusal($$ select public.set_rank_badge_tags('r1', array['ranka', 'rankb', 'rankd', 'ranke']) $$),
  '22023 too_many', 'more than 3 picks are refused');
select is(pg_temp.refusal($$ select public.set_rank_badge_tags('r1', array['rankwait']) $$),
  '22023 not_on_story', 'a tag waiting for approval can''t be picked');
select is(pg_temp.refusal($$ select public.set_rank_badge_tags('r2', array['nosuchtag']) $$),
  null, 'another writer''s story isn''t found, before any name is checked');
select is(public.set_rank_badge_tags('r2', array['ranka']) ->> 'outcome', 'not_found',
  'and nothing changes on it');
select is(public.set_rank_badge_tags('r1', array[]::text[]) ->> 'outcome', 'ok', 'an empty pick means automatic');
select is(pg_temp.badges('r1'), 'rankb,ranka,rankd', 'so the 3 best ranks are back');

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select public.set_rank_badge_tags('r1', array['ranka']) $$), '42501 ',
  'a visitor can''t pick for anyone');

select * from finish();
rollback;
