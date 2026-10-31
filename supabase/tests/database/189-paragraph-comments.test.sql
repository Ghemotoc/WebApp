-- Database tests for comments on one paragraph (story S1-E6-06; CLAUDE.md rules 1, 6, 12 and 15).
-- What it proves:
-- - a member comments on one paragraph; its marker counts it, and its thread shows it with its
--   replies and nothing from other paragraphs (criterion 1);
-- - a reply takes its comment's paragraph, so it counts and shows in the same thread;
-- - the writer moves the paragraph: its comments move with it (the stable fingerprint); the
--   writer changes its words: they go to "comments on an earlier version" (criterion 2);
-- - the main list says which paragraph each comment is on, or that it is on an earlier version;
-- - the same rules as other comments: visitors can't post, comments off refuse and count nothing,
--   a block hides a paragraph comment from the count, no such paragraph is refused;
-- - nothing answers a user ID, and the paragraph's words are never stored with the comment.
-- No new table or policy: comments' policies are tested in 149-comments.test.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets a published chapter of three paragraphs.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'para0001', 1, 'Unu',
  'x', 12, 'published', 'Unu', E'Primul paragraf.\n\nAl doilea paragraf, cel cu liftul.\n\nAl treilea.', 12, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

-- IDs the test names later, kept where every role can read them.
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. A comment on one paragraph ---------- */

-- teacher (…07) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'on_two', (public.post_paragraph_comment('statia-meteo-seed01', 'para0001', 2,
  'Liftul m-a speriat.') ->> 'id')::uuid;
insert into named select 'whole', (public.post_comment('statia-meteo-seed01', 'para0001',
  'Un capitol bun.') ->> 'id')::uuid;
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001'),
  '{"comments_enabled": true, "paragraphs": [{"block": 2, "count": 1}], "earlier": 0}'::jsonb,
  'paragraph 2''s marker counts its comment; a comment on the whole chapter isn''t counted on a paragraph');
select is(public.paragraph_comments('statia-meteo-seed01', 'para0001', 2) #>> '{comments,0,body}',
  'Liftul m-a speriat.', 'the thread for paragraph 2 shows it (criterion 1)');
select is(jsonb_array_length(public.paragraph_comments('statia-meteo-seed01', 'para0001', 1) -> 'comments'), 0,
  'and the thread for paragraph 1 shows nothing from paragraph 2');
select is((select paragraph_number from public.comments where id = (select id from named where label = 'on_two')), 2,
  'the comment keeps the paragraph''s place');
select is((select paragraph_key from public.comments where id = (select id from named where label = 'on_two')),
  md5('Al doilea paragraf, cel cu liftul.'), 'and a fingerprint of its words, never the words themselves');
select ok(public.paragraph_comments('statia-meteo-seed01', 'para0001', 2)::text not like '%00000000-0000-4000-8000-%',
  'the thread never answers a user ID');

-- adult_writer replies through the ordinary reply call.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok(format($$ select public.post_comment('statia-meteo-seed01', 'para0001', 'Și pe mine.', false, %L) $$,
  (select id from named where label = 'on_two')), 'the writer replies to the paragraph comment');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001') -> 'paragraphs',
  '[{"block": 2, "count": 2}]'::jsonb, 'the reply counts on the same paragraph');
select is(jsonb_array_length(public.paragraph_comments('statia-meteo-seed01', 'para0001', 2) #> '{comments,0,replies}'), 1,
  'and sits under its comment in the thread');
select is((public.paragraph_comments('statia-meteo-seed01', 'para0001', 2) ->> 'total')::integer, 2,
  'the thread''s total counts the comment and its reply');

/* ---------- 2. The main list says where ---------- */

select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'para0001'),
  '$.comments[*] ? (@.body == "Liftul m-a speriat.")')) -> 'paragraph', '2'::jsonb,
  'the main list says the comment is on paragraph 2');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'para0001'),
  '$.comments[*] ? (@.body == "Un capitol bun.")')) -> 'paragraph', 'null'::jsonb,
  'and a comment on the whole chapter is on no paragraph');

/* ---------- 3. The writer edits the chapter (criterion 2) ---------- */

-- A new paragraph goes in first: paragraph 2 is now paragraph 3, and its comments follow it.
reset role;
update public.chapters
set published_body = E'Un paragraf nou.\n\nPrimul paragraf.\n\nAl doilea paragraf, cel cu liftul.\n\nAl treilea.'
where code = 'para0001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001') -> 'paragraphs',
  '[{"block": 3, "count": 2}]'::jsonb, 'a moved paragraph keeps its comments by its fingerprint');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'para0001'),
  '$.comments[*] ? (@.body == "Liftul m-a speriat.")')) -> 'paragraph', '3'::jsonb,
  'the main list follows it to paragraph 3');
-- Only the line breaks change: still the same paragraph.
reset role;
update public.chapters
set published_body = E'Un paragraf nou.\n\nPrimul paragraf.\n\nAl doilea paragraf,\ncel cu liftul.\n\nAl treilea.'
where code = 'para0001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001') -> 'paragraphs',
  '[{"block": 3, "count": 2}]'::jsonb, 'a new line break inside the paragraph keeps its comments');
-- The words change: the comments go to an earlier version.
reset role;
update public.chapters
set published_body = E'Un paragraf nou.\n\nPrimul paragraf.\n\nAl doilea paragraf, cel cu scara.\n\nAl treilea.'
where code = 'para0001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001'),
  '{"comments_enabled": true, "paragraphs": [], "earlier": 2}'::jsonb,
  'a changed paragraph''s comments move to an earlier version');
select is(public.paragraph_comments('statia-meteo-seed01', 'para0001', null) #>> '{comments,0,body}',
  'Liftul m-a speriat.', 'where the earlier-version thread shows them');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'para0001'),
  '$.comments[*] ? (@.body == "Liftul m-a speriat.")')) ->> 'paragraph', 'earlier',
  'and the main list says so');

/* ---------- 4. The same rules as other comments ---------- */

select throws_ok($$ select public.post_paragraph_comment('statia-meteo-seed01', 'para0001', 9, 'Unde?') $$,
  'P0002', null, 'a paragraph that isn''t there is refused');
-- blocked (…16) is read-only, so their paragraph comment is put in by hand; blocker blocks them.
reset role;
insert into public.comments (user_id, chapter_id, body, paragraph_key, paragraph_number)
select '00000000-0000-4000-8000-000000000016', id, 'Nimeni nu te-a întrebat.', md5('Primul paragraf.'), 2
from public.chapters where code = 'para0001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001') -> 'paragraphs', '[]'::jsonb,
  'blocker''s markers don''t count a comment by someone they block');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001') -> 'paragraphs',
  '[{"block": 2, "count": 1}]'::jsonb, 'while teacher''s markers do');
reset role;
update public.stories set comments_enabled = false where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'para0001'),
  '{"comments_enabled": false, "paragraphs": [], "earlier": 0}'::jsonb, 'with comments off, nothing is counted');
select throws_ok($$ select public.post_paragraph_comment('statia-meteo-seed01', 'para0001', 1, 'Hei') $$,
  '55000', null, 'and nothing can be posted');
reset role;
update public.stories set comments_enabled = true where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select throws_ok($$ select public.post_paragraph_comment('statia-meteo-seed01', 'para0001', 1, 'Hei') $$,
  '42501', null, 'a visitor can''t comment on a paragraph');

select * from finish();
rollback;
