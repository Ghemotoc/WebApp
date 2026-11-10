-- Database tests for who may comment on a story (bundle MUST-1, part a; IDEA-20261106-2; story
-- S1-E6-01).
-- What it proves:
-- - on Followers only, someone who doesn't follow the writer is refused (hint followers_only) and
--   the comment list tells the page so; a follower and the writer comment as before;
-- - changing the setting keeps the comments already posted;
-- - paragraph comments follow the same setting;
-- - the writer saves the setting through update_my_story(); an unknown value is refused;
-- - a writer aged 13 to 17 starts at Followers only, an adult at Everyone.
-- Personas: adult_writer (…01, the writer), teen_17 (…02, who follows the writer in the seed and
-- is a writer aged 16 to 17), teacher (…07, not a follower).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
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

-- The minors' launch gate is open here, so teen_17 is an active member (adults_only is on in March).
update public.feature_flags set is_enabled = false where key = 'adults_only';
-- adult_writer's first seed story gets a published chapter; teen_17 follows the writer (seed).
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'aud00001', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Primul paragraf.', 2, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';
delete from public.follows_users where followed_user_id = '00000000-0000-4000-8000-000000000001'
  and user_id = '00000000-0000-4000-8000-000000000007';

/* ---------- 1. Everyone, then Followers only ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select ok(public.post_comment('statia-meteo-seed01', 'aud00001', 'Înainte de schimbare.') ->> 'id' is not null,
  'on Everyone, someone who doesn''t follow the writer comments');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.update_my_story('statia-meteo-seed01', '{"comment_audience": "followers"}') ->> 'outcome', 'ok',
  'the writer sets Followers only');
select is((select comment_audience from public.stories where slug = 'statia-meteo-seed01'), 'followers',
  'the setting is saved');
select throws_ok($$select public.update_my_story('statia-meteo-seed01', '{"comment_audience": "friends"}')$$,
  '23514', null, 'an unknown value is refused by the column''s check');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.error_hint($$select public.post_comment('statia-meteo-seed01', 'aud00001', 'Pot și eu?')$$),
  'followers_only', 'someone who doesn''t follow the writer is refused');
select is(pg_temp.error_hint($$select public.post_paragraph_comment('statia-meteo-seed01', 'aud00001', 1, 'Și aici?')$$),
  'followers_only', 'on a paragraph too');
select is(public.chapter_comments('statia-meteo-seed01', 'aud00001') ->> 'audience_allows_me', 'false',
  'the list tells the page to show the followers-only line');
select is(public.chapter_comments('statia-meteo-seed01', 'aud00001') #>> '{comments,0,body}', 'Înainte de schimbare.',
  'a comment posted before the change stays');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.chapter_comments('statia-meteo-seed01', 'aud00001') ->> 'audience_allows_me', 'true',
  'a follower sees the comment box');
select ok(public.post_comment('statia-meteo-seed01', 'aud00001', 'Eu urmăresc.') ->> 'id' is not null,
  'and comments');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.post_comment('statia-meteo-seed01', 'aud00001', 'Mulțumesc!') ->> 'id' is not null,
  'the writer always comments on their own story');

/* ---------- 2. Where a new story starts ---------- */

select ok((public.create_story('Pornire adult', 'Un rezumat.', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, '{"rating": "all_ages", "ai_disclosure": "no_ai"}') ->> 'outcome') = 'ok',
  'an adult makes a story');
select is((select comment_audience from public.stories where title = 'Pornire adult'), 'everyone',
  'an adult''s new story starts at Everyone');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok((public.create_story('Pornire adolescent', 'Un rezumat.', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, '{"rating": "all_ages", "ai_disclosure": "no_ai"}') ->> 'outcome') = 'ok',
  'a 17-year-old makes a story');
select is((select comment_audience from public.stories where title = 'Pornire adolescent'), 'followers',
  'a writer under 18 starts at Followers only');

select * from finish();
rollback;
