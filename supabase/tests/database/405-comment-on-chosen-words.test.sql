-- Database tests for comments on words a reader chose (bundle READER-SELECT; boards B12 to B14;
-- CLAUDE.md rules 1, 12 and 15).
-- What it proves:
-- - a reader comments on two lines of a stanza: the comment counts on that stanza, keeps the words
--   and where they are, and the counts carry the part for its underline (B12, B13 4);
-- - every list shows the words above the comment, and a whole-paragraph comment has none (B13 5);
-- - a reply takes its comment's words, so the part counts it too;
-- - a selection may cross stanzas: it counts on the stanza where it starts (B14 7);
-- - over 1,000 characters, words that aren't there, a selection that runs backwards, a paragraph
--   that isn't there, signed out and comments off are refused (B14 8, the rules of S1-E6-06);
-- - Markdown in the chapter doesn't stop a match;
-- - the writer moves the stanza: the part moves with it; the writer changes its words: the comment
--   goes to the earlier-version list and the part's underline goes (B13);
-- - the table refuses words on a comment that isn't on a paragraph, and nothing answers a user ID.
-- No new table or policy: comments' policies are tested in 149-comments.test.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets a published poem of three stanzas; the second has a word
-- in Markdown italics.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'sel00001', 1, 'Bucătăria',
  'x', 20, 'published', 'Bucătăria',
  E'Bunica se trezește devreme.\n\nTaie pâinea la piept,\ncuțitul spre *inimă*\ncum a învățat-o mama.\n\nȘi nimeni nu sângerează.',
  20, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

-- IDs the test names later, kept where every role can read them.
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

/* ---------- 1. Two lines of a stanza ---------- */

-- teacher (…07) is an active adult; the two lines start 22 characters into stanza 2.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'lines', (public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 22, 2, 63,
  E'cuțitul spre inimă\ncum a învățat-o mama.', 'Și bunica mea face așa!') ->> 'id')::uuid;
select is((select row(paragraph_number, quote_text, quote_start_offset, quote_end_block, quote_end_offset)::text
           from public.comments where id = (select id from named where label = 'lines')),
  row(2, E'cuțitul spre inimă\ncum a învățat-o mama.', 22, 2, 63)::text,
  'the comment keeps its stanza, the words and where they start and end (B12)');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') -> 'paragraphs',
  '[{"block": 2, "count": 1}]'::jsonb, 'it counts on its stanza''s marker like any paragraph comment');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') -> 'parts',
  jsonb_build_array(jsonb_build_object('block', 2, 'end_block', 2, 'start_offset', 22, 'end_offset', 63,
    'quote', E'cuțitul spre inimă\ncum a învățat-o mama.', 'count', 1)),
  'and the counts carry the part for its underline, though the chapter writes "inimă" in italics (B13, 4)');
select is(public.paragraph_comments('statia-meteo-seed01', 'sel00001', 2) #>> '{comments,0,quote,text}',
  E'cuțitul spre inimă\ncum a învățat-o mama.', 'the stanza''s thread shows the words above the comment (B13, 5)');
select is((jsonb_path_query_first(public.chapter_comments('statia-meteo-seed01', 'sel00001'),
  '$.comments[*] ? (@.body == "Și bunica mea face așa!")')) #>> '{quote,start_offset}', '22',
  'and so does the main list');

-- A comment on the whole stanza, as before, has no words.
insert into named select 'whole', (public.post_paragraph_comment('statia-meteo-seed01', 'sel00001', 2,
  'Toată strofa e bunica mea.') ->> 'id')::uuid;
select is((jsonb_path_query_first(public.paragraph_comments('statia-meteo-seed01', 'sel00001', 2),
  '$.comments[*] ? (@.body == "Toată strofa e bunica mea.")')) -> 'quote', 'null'::jsonb,
  'a comment on the whole stanza has no words');

-- adult_writer replies to the comment on the two lines.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok(format($$ select public.post_comment('statia-meteo-seed01', 'sel00001', 'Mulțumesc!', false, %L) $$,
  (select id from named where label = 'lines')), 'the writer replies to it');
select is((public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') #>> '{parts,0,count}')::integer, 2,
  'the reply takes the comment''s words, so the part counts it');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') -> 'paragraphs',
  '[{"block": 2, "count": 3}]'::jsonb, 'and the stanza''s marker counts every comment on it, whole or part');

/* ---------- 2. Across stanzas ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'across', (public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 42, 3, 24,
  E'cum a învățat-o mama.\n\nȘi nimeni nu sângerează.', 'Ce final!') ->> 'id')::uuid;
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') -> 'paragraphs',
  '[{"block": 2, "count": 4}]'::jsonb, 'a selection across stanzas counts on the stanza where it starts (B14, 7)');
select is(jsonb_path_query_first(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001'),
  '$.parts[*] ? (@.end_block == 3)') ->> 'block', '2', 'and its part runs from stanza 2 to stanza 3');

/* ---------- 3. What is refused ---------- */

select throws_ok(format($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 1, 0, 3, 24, %L, 'Prea mult') $$,
  repeat('a', 1001)), '23514', 'Select less to comment.', 'more than 1,000 characters is refused (B14, 8)');
select throws_ok($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 0, 2, 10,
  'un cuvânt care nu e acolo', 'Hm') $$,
  '23514', 'Those words aren''t in the chapter.', 'words that aren''t in those stanzas are refused');
select throws_ok($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 3, 0, 2, 10,
  'mama', 'Hm') $$,
  '23514', 'Those words aren''t in the chapter.', 'a selection that runs backwards is refused');
select throws_ok($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 0, 9, 4,
  'mama', 'Hm') $$,
  'P0002', null, 'a stanza that isn''t there is refused');
select pg_temp.sign_out();
select throws_ok($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 0, 2, 4,
  'Taie', 'Hm') $$,
  '42501', null, 'a visitor who isn''t signed in can''t post');
reset role;
update public.stories set comments_enabled = false where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.post_passage_comment('statia-meteo-seed01', 'sel00001', 2, 0, 2, 4,
  'Taie', 'Hm') $$,
  '55000', null, 'with comments off nothing can be posted');
reset role;
update public.stories set comments_enabled = true where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 4. The writer edits the chapter ---------- */

-- A new first stanza: the stanzas move down one, and the parts move with them.
update public.chapters
set published_body = E'O strofă nouă.\n\nBunica se trezește devreme.\n\nTaie pâinea la piept,\ncuțitul spre *inimă*\ncum a învățat-o mama.\n\nȘi nimeni nu sângerează.'
where code = 'sel00001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(jsonb_path_query_first(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001'),
  '$.parts[*] ? (@.start_offset == 22)') ->> 'block', '3', 'a moved stanza takes its part with it');

-- The writer changes the two lines' words: the comments go to an earlier version, the parts go.
reset role;
update public.chapters
set published_body = E'O strofă nouă.\n\nBunica se trezește devreme.\n\nTaie pâinea în aer.\n\nȘi nimeni nu sângerează.'
where code = 'sel00001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') -> 'parts', '[]'::jsonb,
  'changed words lose their underline (B13)');
select is((public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001') ->> 'earlier')::integer, 4,
  'and their comments, with the whole-stanza one, are kept on the earlier version');
select is(jsonb_path_query_first(public.paragraph_comments('statia-meteo-seed01', 'sel00001', null),
  '$.comments[*] ? (@.body == "Ce final!")') #>> '{quote,text}',
  E'cum a învățat-o mama.\n\nȘi nimeni nu sângerează.', 'where each still shows the words it was on');
select ok(public.paragraph_comment_counts('statia-meteo-seed01', 'sel00001')::text not like '%00000000-0000-4000-8000-%',
  'the counts never answer a user ID');

/* ---------- 5. The table's own rules ---------- */

reset role;
select throws_ok($$ insert into public.comments (user_id, chapter_id, body, quote_text, quote_start_offset,
    quote_end_block, quote_end_key, quote_end_offset)
  select '00000000-0000-4000-8000-000000000007', id, 'Fără strofă', 'mama', 0, 1, 'x', 4
  from public.chapters where code = 'sel00001' $$,
  '23514', null, 'words on a comment that isn''t on a paragraph are refused');

select * from finish();
rollback;
