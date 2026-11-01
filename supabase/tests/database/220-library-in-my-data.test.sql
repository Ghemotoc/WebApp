-- Database tests for the library shelves in Download my data (bundle IDEAS-1, part f; idea
-- IDEA-20261031-12; GDPR art. 15 and 20).
-- What it proves:
-- - the data file holds the reader's shelves with each story's title, writer and address, shelf
--   by shelf, and never a user ID (the idea's criterion);
-- - a story the reader can no longer open (deleted, or a writer they block) keeps its title but
--   has no address;
-- - only the reader's own shelves; the helper isn't callable from the app.
-- Personas: blocker (…15) keeps the library; adult_writer (…01) and blocked (…16) write; teacher
-- (…07) has a library of their own. Rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- blocked (…16) writes a story; blocker (…15) blocks them in the seed. A third story by
-- adult_writer is deleted.
insert into public.stories (id, user_id, slug, title, language_code, category_id, rating)
values
  ('22000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000016', 'banca-seed220',
   'Pe bancă', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages'),
  ('22000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'sters-seed220',
   'Ștearsă', 'ro', (select id from public.categories where slug = 'fiction'), 'all_ages');
update public.stories set deleted_at = now() where id = '22000000-0000-4000-9000-000000000002';
-- blocker's shelves, a day apart so the order is known; teacher's own entry.
insert into public.library_entries (user_id, story_id, shelf, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9000-000000000002', 'finished', now() - interval '3 days', now()),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-9000-000000000001', 'reading', now() - interval '2 days', now()),
  ('00000000-0000-4000-8000-000000000015', '22000000-0000-4000-9000-000000000001', 'reading', now() - interval '1 day', now()),
  ('00000000-0000-4000-8000-000000000015', '22000000-0000-4000-9000-000000000002', 'saved', now(), now()),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-9000-000000000003', 'saved', now(), now());

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');

select is(jsonb_path_query_array(public.my_data_export() -> 'library', '$[*].shelf'),
  '["reading", "reading", "saved", "finished"]'::jsonb,
  'the data file lists the reader''s shelves, Reading first, the oldest first on each');
select is(public.my_data_export() -> 'library' -> 0,
  jsonb_build_object('shelf', 'reading', 'title', 'Stația meteo', 'writer', 'Lia Scrie',
    'path', '/s/statia-meteo-seed01',
    'added_at', (select created_at from public.library_entries
                 where user_id = '00000000-0000-4000-8000-000000000015'
                   and story_id = '00000000-0000-4000-9000-000000000001'),
    'moved_at', (select updated_at from public.library_entries
                 where user_id = '00000000-0000-4000-8000-000000000015'
                   and story_id = '00000000-0000-4000-9000-000000000001')),
  'each entry has the title, the writer, the address and when it was put there');
select is(public.my_data_export() #>> '{library,1,title}', 'Pe bancă',
  'a story by a writer the reader blocks keeps its title');
select is(public.my_data_export() #> '{library,1,path}', 'null'::jsonb, 'but has no address');
select is(public.my_data_export() #> '{library,2,path}', 'null'::jsonb,
  'nor does a deleted story');
select ok((public.my_data_export() -> 'library')::text not like '%00000000-0000-4000-8000-%'
    and (public.my_data_export() -> 'library')::text not like '%Scrisori%',
  'never a user ID, and only the reader''s own shelves');
select throws_ok($$ select public.export_library_of('00000000-0000-4000-8000-000000000007') $$,
  '42501', null, 'the helper isn''t callable from the app');

select * from finish();
rollback;
