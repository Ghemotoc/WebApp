-- Database tests for picture links showing the picture in chat previews (bundle IDEAS-2, part f;
-- idea IDEA-20261101-12).
-- What it proves:
-- - get_shared_picture() gives a visitor the file of a passed picture a link points to
--   (criterion 1), with the chapter-ID path and never a user ID;
-- - it gives nothing for a picture still in its check, a removed picture, text, a music card, a
--   16+ story or with the writer's picture switch off (criterion 2);
-- - a visitor may read the passed picture's file through the existing storage policy, and not
--   the one still in its check.
-- No new table or policy. Test data: a chapter on adult_writer's seed story statia-meteo-seed01
-- (All ages) with two pictures; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The picture for one block of the test chapter, as the caller sees it.
create function pg_temp.picture(block integer) returns jsonb language sql as $$
  select public.get_shared_picture('statia-meteo-seed01', 'pict0001', block);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The chapter: text, a passed picture, a picture still being checked, a music card.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('28300000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'pict0001', 1, 'Unu', 'x', 3, 'published', 'Unu',
   E'Ploua peste oraș.\n\n![Un far în ceață](picture:28300000-0000-4000-8000-0000000000a1)\n\n'
   || E'![Încă la verificat](picture:28300000-0000-4000-8000-0000000000a2)\n\n'
   || E'![Cântec](embed:spotify:track:4uLU6hMCjMI75M1A2tKUQC)',
   3, now() - interval '2 days');
update public.stories set first_published_at = now() - interval '2 days' where slug = 'statia-meteo-seed01';
insert into public.picture_checks (id, user_id, bucket, path, kind, story_id, chapter_id, status, rights_confirmed_at)
values
  ('28300000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'chapter-images',
   '28300000-0000-4000-8000-000000000001/a1.webp', 'chapter_picture', '00000000-0000-4000-9000-000000000001',
   '28300000-0000-4000-8000-000000000001', 'passed', now()),
  ('28300000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'chapter-images',
   '28300000-0000-4000-8000-000000000001/a2.webp', 'chapter_picture', '00000000-0000-4000-9000-000000000001',
   '28300000-0000-4000-8000-000000000001', 'pending', now());
-- The files themselves, so the storage policy can be asked about them.
insert into storage.objects (bucket_id, name, owner_id)
values ('chapter-images', '28300000-0000-4000-8000-000000000001/a1.webp', '00000000-0000-4000-8000-000000000001'),
       ('chapter-images', '28300000-0000-4000-8000-000000000001/a2.webp', '00000000-0000-4000-8000-000000000001');

/* ---------- 1. A passed picture ---------- */

select pg_temp.sign_out();
select is(pg_temp.picture(2),
  jsonb_build_object('bucket', 'chapter-images', 'path', '28300000-0000-4000-8000-000000000001/a1.webp',
    'alt', 'Un far în ceață'),
  'a visitor gets the passed picture''s file and alt text (criterion 1)');
select ok(pg_temp.picture(2) ->> 'path' not like '%00000000-0000-4000-8000-000000000001%',
  'the path holds the chapter''s ID, never the writer''s');
select is((select count(*) from storage.objects
           where bucket_id = 'chapter-images' and name = '28300000-0000-4000-8000-000000000001/a1.webp'),
  1::bigint, 'a visitor may read that file through the existing storage policy');

/* ---------- 2. Nothing else ---------- */

select is(pg_temp.picture(3), null, 'nothing for a picture still in its check (criterion 2)');
select is((select count(*) from storage.objects
           where bucket_id = 'chapter-images' and name = '28300000-0000-4000-8000-000000000001/a2.webp'),
  0::bigint, 'and a visitor can''t read its file');
select is(pg_temp.picture(1), null, 'nothing for a paragraph of text');
select is(pg_temp.picture(4), null, 'nothing for a music card');

select pg_temp.as_postgres();
update public.stories set picture_sharing_enabled = false where slug = 'statia-meteo-seed01';
select pg_temp.sign_out();
select is(pg_temp.picture(2), null, 'nothing while the writer''s picture switch is off');

select pg_temp.as_postgres();
update public.stories set picture_sharing_enabled = true, rating = '16_plus' where slug = 'statia-meteo-seed01';
select pg_temp.sign_out();
select is(pg_temp.picture(2), null, 'nothing from a 16+ story');

select pg_temp.as_postgres();
update public.stories set rating = 'all_ages' where slug = 'statia-meteo-seed01';
update public.picture_checks set deleted_at = now() where id = '28300000-0000-4000-8000-0000000000a1';
select pg_temp.sign_out();
select is(pg_temp.picture(2), null, 'nothing once the picture is removed');

select * from finish();
rollback;
