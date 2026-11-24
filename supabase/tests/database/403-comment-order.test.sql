-- Database tests for the order of a chapter's comments (BOOKS B05, user story 2.5; board
-- B05-ReaderEnd: "Newest first / Oldest first" beside the comments heading).
-- What it proves:
-- - chapter_comments() lists newest first by default, and oldest first when asked;
-- - page_after carries on from the last comment shown, in the order picked, so "Show more
--   comments" never repeats or skips one;
-- - the older three-argument version is gone, so no call can be ambiguous.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The bodies of one page, in the order the function listed them.
create function pg_temp.bodies(page jsonb) returns text[] language sql as $$
  select coalesce(array_agg(item ->> 'body' order by position), '{}')
  from jsonb_array_elements(page -> 'comments') with ordinality as listed(item, position);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Two comments a page, so paging shows.
update public.settings set value = '2'::jsonb where key = 'comment_page_size';

-- adult_writer's (…01) seed story gets a published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'order001',
  1, 'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

-- teacher (…07) leaves three comments; they get an hour apart, first to third.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.post_comment('statia-meteo-seed01', 'order001', 'Primul.');
select public.post_comment('statia-meteo-seed01', 'order001', 'Al doilea.');
select public.post_comment('statia-meteo-seed01', 'order001', 'Al treilea.');
reset role;
update public.comments set created_at = now() - interval '3 hours' where body = 'Primul.';
update public.comments set created_at = now() - interval '2 hours' where body = 'Al doilea.';
update public.comments set created_at = now() - interval '1 hour' where body = 'Al treilea.';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.bodies(public.chapter_comments('statia-meteo-seed01', 'order001')),
  array['Al treilea.', 'Al doilea.'], 'newest first by default');
select is(pg_temp.bodies(public.chapter_comments('statia-meteo-seed01', 'order001',
    now() - interval '2 hours', false)),
  array['Primul.'], 'the next newest-first page starts after the last one shown');
select is(pg_temp.bodies(public.chapter_comments('statia-meteo-seed01', 'order001', null, true)),
  array['Primul.', 'Al doilea.'], 'oldest first when asked');
select is((public.chapter_comments('statia-meteo-seed01', 'order001', null, true) ->> 'has_more'),
  'true', 'with more to show after the first oldest-first page');
select is(pg_temp.bodies(public.chapter_comments('statia-meteo-seed01', 'order001',
    now() - interval '2 hours', true)),
  array['Al treilea.'], 'the next oldest-first page starts after the last one shown');
select is((public.chapter_comments('statia-meteo-seed01', 'order001') ->> 'total')::integer, 3,
  'the total counts every comment, whatever the order');
reset role;

select hasnt_function('public', 'chapter_comments', array['text', 'text', 'timestamp with time zone'],
  'the three-argument version is gone');

select * from finish();
rollback;
