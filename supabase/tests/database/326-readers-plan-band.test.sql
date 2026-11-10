-- Database tests for the band at the top of the readers' plan pages (GAPS-4; story S1-E17-33;
-- CLAUDE.md rules 15 and 19).
-- What it proves:
-- - the public plan's answer carries the story's ID, cover and writer's name, for readers and
--   visitors alike, and so does the writer's "Preview as a reader";
-- - the writer's name is the pen name, else the username;
-- - a cover staff hid reads as the automatic cover for readers and as it is for the writer;
-- - the answer carries no user ID (rule 15);
-- - a story nobody may read answers nothing at all, band included.
-- Personas: adult_writer (…01) writes "Stația meteo"; teacher (…07) reads. Rolled back at the end.
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
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;
-- The story part of the readers' answer.
create function pg_temp.band() returns jsonb language sql as $$
  select public.get_public_story_plan('statia-meteo-seed01') -> 'story';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The writer's story with one chapter out and a drawn cover.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                             published_title, published_body, first_published_at, last_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'c326aaaa', 1,
        'Unu', 'Unu.', 'published', 'Unu', 'Unu.', now(), now());
update public.stories
set first_published_at = now(), cover_kind = 'drawn', cover_design = 'waves',
    cover_background = 'sky', cover_accent = 'violet', cover_tall_path = null, cover_square_path = null
where id = '00000000-0000-4000-9000-000000000001';
update public.profiles set pen_name = 'Lia Scrie' where id = '00000000-0000-4000-8000-000000000001';

/* ---------- 1. Readers and visitors ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.band() ->> 'id', '00000000-0000-4000-9000-000000000001',
  'a reader''s answer carries the story''s ID, for the automatic cover');
select is(pg_temp.band() -> 'cover',
  '{"kind": "drawn", "design": "waves", "background": "sky", "accent": "violet"}'::jsonb,
  'and the cover the writer chose');
select is(pg_temp.band() ->> 'writer_name', 'Lia Scrie', 'and the writer''s pen name');
select ok(position('00000000-0000-4000-8000-000000000001' in public.get_public_story_plan('statia-meteo-seed01')::text) = 0,
  'and never the writer''s user ID');

select pg_temp.sign_out();
select is(pg_temp.band() ->> 'writer_name', 'Lia Scrie', 'a visitor who isn''t signed in gets the same band');

/* ---------- 2. Without a pen name ---------- */

select pg_temp.as_owner();
update public.profiles set pen_name = null where id = '00000000-0000-4000-8000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.band() ->> 'writer_name', 'adult_writer',
  'without a pen name the band says the username');

/* ---------- 3. A cover staff hid (S1-E11-08) ---------- */

select pg_temp.as_owner();
update public.stories set cover_hidden_at = now() where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.band() -> 'cover' ->> 'kind', 'automatic', 'a hidden cover reads as the automatic one for a reader');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.preview_story_plan('statia-meteo-seed01') -> 'story' -> 'cover' ->> 'kind', 'drawn',
  'the writer''s preview still shows the cover as it is');

/* ---------- 4. Nothing for a story nobody may read ---------- */

select pg_temp.as_owner();
update public.chapters set status = 'draft', published_title = null, published_body = null,
       first_published_at = null, last_published_at = null where code = 'c326aaaa';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_public_story_plan('statia-meteo-seed01') ->> 'outcome', 'not_found',
  'a story with no readable chapter answers not_found');
select is(pg_temp.band(), null, 'and no band');

select * from finish();

rollback;
