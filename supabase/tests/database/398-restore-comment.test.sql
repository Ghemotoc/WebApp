-- Database tests for restore_comment(), the "Comment deleted. Undo" note (design books item 14).
-- What it proves:
-- - the author undoes their own delete, and the comment is back as it was;
-- - the story's writer undoes their own delete of a comment on their story;
-- - nobody else can: not the author after the writer deleted it, not a third member, not a
--   visitor, not a sanctioned account;
-- - a delete more than 10 minutes old can't be undone; a live comment can't be "restored".
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer's (…01) seed story gets a published chapter.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'undo0001', 1,
  'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id = '00000000-0000-4000-9000-000000000001';

create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;

-- teacher (…07) writes two comments.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
insert into named select 'own', (public.post_comment('statia-meteo-seed01', 'undo0001', 'Primul.') ->> 'id')::uuid;
insert into named select 'other', (public.post_comment('statia-meteo-seed01', 'undo0001', 'Al doilea.') ->> 'id')::uuid;

/* ---------- The author undoes their own delete ---------- */

select public.delete_comment((select id from named where label = 'own'));
select ok(public.restore_comment((select id from named where label = 'own')),
  'the author undoes their own delete');
select is((select deleted_at is null and deleted_by is null from public.comments
           where id = (select id from named where label = 'own')), true,
  'and the comment is back as it was');
select throws_ok($$ select public.restore_comment((select id from named where label = 'own')) $$,
  'P0002', null, 'a live comment can''t be restored');

/* ---------- The writer undoes their own delete; nobody else can ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.delete_comment((select id from named where label = 'other'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.restore_comment((select id from named where label = 'other')) $$,
  '42501', null, 'the author can''t undo a delete the writer made');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select throws_ok($$ select public.restore_comment((select id from named where label = 'other')) $$,
  '42501', null, 'a third member can''t undo it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select throws_ok($$ select public.restore_comment((select id from named where label = 'other')) $$,
  '42501', null, 'a suspended account can''t undo anything');
select pg_temp.sign_out();
select throws_ok($$ select public.restore_comment((select id from named where label = 'other')) $$,
  '42501', null, 'a visitor can''t call it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok(public.restore_comment((select id from named where label = 'other')),
  'the writer undoes their own delete');

/* ---------- Too late ---------- */

select public.delete_comment((select id from named where label = 'other'));
reset role;
update public.comments set deleted_at = now() - interval '11 minutes'
where id = (select id from named where label = 'other');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.restore_comment((select id from named where label = 'other')) $$,
  'P0002', null, 'a delete more than 10 minutes old can''t be undone');
reset role;
select is((select deleted_at is not null from public.comments
           where id = (select id from named where label = 'other')), true,
  'and the comment stays deleted');

select * from finish();
rollback;
