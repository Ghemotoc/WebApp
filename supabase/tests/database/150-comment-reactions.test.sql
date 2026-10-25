-- Database tests for reactions on comments (story S1-E6-02; CLAUDE.md rules 1, 15 and 18).
-- What it proves:
-- - a member picks one of the six reactions; picking another changes it, picking the same one
--   again takes it away; the counts update and say which one is the caller's (criterion 1);
-- - chapter_comments() answers the reactions with every comment, and never who reacted;
-- - visitors and read-only accounts can't react; a read-only account can take a reaction back;
-- - a 16+ chapter's comments can't be reacted to by a 14-year-old (rule 18), nor a comment by
--   someone either side blocks, nor a hidden or deleted one;
-- - policy comment_reactions_select_own: the member reads their own reaction (allowed); another
--   member reads none (denied); nobody writes the table directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- adult_writer's (…01) two seed stories get a published chapter each; the second is made 16+.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'reaca001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'reacb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002');
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';

-- IDs the test names later, kept where every role can read them.
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- teacher (…07) comments on the first chapter; adult_writer on the 16+ one.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'teacher', (public.post_comment('statia-meteo-seed01', 'reaca001',
  'Ce final!') ->> 'id')::uuid;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named select 'older', (public.post_comment('the-girl-who-fixed-radios-seed02', 'reacb001',
  'A note from the writer.') ->> 'id')::uuid;

/* ---------- 1. Pick, change, take away ---------- */

-- blocker (…15) is an active adult.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'heart'),
  '{"counts": {"heart": 1}, "mine": "heart"}'::jsonb, 'blocker picks Heart: one heart, and it''s theirs');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'fire'),
  '{"counts": {"fire": 1}, "mine": "fire"}'::jsonb, 'picking Fire changes it: one reaction per person');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'fire'),
  '{"counts": {"fire": 2}, "mine": "fire"}'::jsonb, 'the writer adds a second Fire');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'star') -> 'counts',
  '{"fire": 1, "star": 1}'::jsonb, 'each kind is counted on its own');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'star'),
  '{"counts": {"fire": 1}, "mine": null}'::jsonb, 'picking the same one again takes it away');
select is(public.react_to_comment((select id from named where label = 'teacher'), null) ->> 'mine', null,
  'taking away when there is none changes nothing');
select throws_ok($$ select public.react_to_comment(gen_random_uuid(), 'heart') $$, 'P0002', null,
  'an unknown comment is refused');

/* ---------- 2. Shown with every comment ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.chapter_comments('statia-meteo-seed01', 'reaca001') #> '{comments,0,reactions}',
  '{"counts": {"fire": 1}, "mine": "fire"}'::jsonb, 'chapter_comments() answers the counts and the caller''s own');
select pg_temp.sign_out();
select is(public.chapter_comments('statia-meteo-seed01', 'reaca001') #> '{comments,0,reactions}',
  '{"counts": {"fire": 1}, "mine": null}'::jsonb, 'a visitor sees the counts only');
select ok(public.chapter_comments('statia-meteo-seed01', 'reaca001')::text not like '%00000000-0000-4000-8000-000000000015%',
  'and never who reacted');

/* ---------- 3. Visitors and read-only accounts ---------- */

select throws_ok($$ select public.react_to_comment((select id from named where label = 'teacher'), 'heart') $$,
  '42501', null, 'a visitor can''t react');
-- teen_17 (…02) is read-only while the test is adults only; a reaction made earlier is put in by hand.
reset role;
insert into public.comment_reactions (user_id, comment_id, kind)
select '00000000-0000-4000-8000-000000000002', id, 'wow' from named where label = 'teacher';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'teacher'), 'sad') $$,
  '42501', null, 'a read-only account can''t react or change a reaction (the account gate)');
select is(public.react_to_comment((select id from named where label = 'teacher'), 'wow') ->> 'mine', null,
  'but it can take its reaction away');

/* ---------- 4. Ratings, blocks, moderation, deletion ---------- */

-- kid_14_ok (…03) can't read the 16+ story.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'older'), null) $$,
  'P0002', null, 'a 14-year-old can''t reach a comment on a 16+ chapter (rule 18)');

-- blocker blocks teacher: neither side can react to the other's comments.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select lives_ok($$ select public.set_block('teacher', true) $$, 'blocker blocks teacher');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'teacher'), 'heart') $$,
  'P0002', null, 'a comment by someone you block can''t be reacted to');
select lives_ok($$ select public.set_block('teacher', false) $$, 'and unblocks again');

-- A moderator hides teacher's comment: nobody can react to it.
reset role;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
select '00000000-0000-4000-8000-000000000007', 'comment', id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Test hide'
from named where label = 'teacher';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'teacher'), 'heart') $$,
  'P0002', null, 'a hidden comment can''t be reacted to');
reset role;
delete from public.moderated_items where item_type = 'comment';

-- teacher deletes their comment: it can't be reacted to either.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select lives_ok($$ select public.delete_comment((select id from named where label = 'teacher')) $$,
  'teacher deletes their comment');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.react_to_comment((select id from named where label = 'teacher'), 'heart') $$,
  'P0002', null, 'a deleted comment can''t be reacted to');

/* ---------- 5. The policy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.comment_reactions), 1,
  'allowed: comment_reactions_select_own, the member reads their own reaction');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.comment_reactions), 0,
  'denied: comment_reactions_select_own, another member reads nobody else''s reaction');
-- (Writes: the table has no insert, update or delete grant, checked by test 003.)

select * from finish();
rollback;
