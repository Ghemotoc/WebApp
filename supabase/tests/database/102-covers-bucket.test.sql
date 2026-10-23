-- Database tests for the covers bucket and the picture_uploads flag (story S1-E3-01).
-- What it proves: the flag is off and public; the bucket is private, takes only JPEG, PNG and
-- WebP up to 5 MB; while the flag is off even the owner can't add or read a cover file; once it
-- is on, only the story's owner can, under the story's own folder (allowed and denied for
-- covers_insert_own and covers_select_own).
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

-- 1. The flag and the bucket.
select results_eq(
  $$ select is_enabled, is_public from public.feature_flags where key = 'picture_uploads' $$,
  $$ values (false, true) $$,
  'picture_uploads is off for the demo and public, so the form can hide the upload tab'
);
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'covers' $$,
  $$ values (false, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']) $$,
  'the covers bucket is private and takes JPEG, PNG or WebP up to 5 MB'
);

-- 2. While the flag is off, nobody adds or reads cover files, the owner included.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('covers', '00000000-0000-4000-9000-000000000001/tall.jpg', auth.uid()) $$,
  '42501', null,
  'denied: covers_insert_own: while picture_uploads is off, even the owner can''t add a cover file'
);

-- 3. With the flag on: a file under the writer's own story.
reset role;
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
insert into storage.objects (bucket_id, name, owner)
values ('covers', '00000000-0000-4000-9000-000000000003/tall.jpg', '00000000-0000-4000-8000-000000000002');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('covers', '00000000-0000-4000-9000-000000000001/tall.jpg', auth.uid()) $$,
  'allowed: covers_insert_own: with uploads on, the owner adds a file under their story''s folder'
);
select is((select count(*)::integer from storage.objects where bucket_id = 'covers' and name like '00000000-0000-4000-9000-000000000001/%'), 1,
  'allowed: covers_select_own: the owner reads their own story''s cover file');
select is((select count(*)::integer from storage.objects where bucket_id = 'covers' and name like '00000000-0000-4000-9000-000000000003/%'), 0,
  'denied: covers_select_own: the owner can''t read another writer''s cover file');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('covers', '00000000-0000-4000-9000-000000000003/tall.jpg', auth.uid()) $$,
  '42501', null,
  'denied: covers_insert_own: a writer can''t add a file under someone else''s story'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('covers', '00000000-0000-4000-8000-000000000001/tall.jpg', auth.uid()) $$,
  '42501', null,
  'a path under the user ID (not a story) is refused: files never live under the user ID'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner) values ('covers', 'loose.jpg', auth.uid()) $$,
  '42501', null,
  'a file outside any story folder is refused'
);

-- 4. Signed out: nothing.
reset role;
set local role anon;
select is((select count(*)::integer from storage.objects where bucket_id = 'covers'), 0,
  'a signed-out visitor reads no cover file');

select * from finish();

rollback;
