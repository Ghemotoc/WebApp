-- Database tests for a space's logo and the board's banner colours (bundle G8b of the liquid glass
-- redesign; stories S1-E8-06 and S1-E8-07; migration …_g8b_space_logo_and_banners.sql).
-- What it proves:
-- - whoever holds a space's settings power registers and chooses a logo, and nobody else does
--   (register_space_logo() and set_space_logo_picture(), allowed and denied);
-- - a banner picture can't be chosen as the logo, and a logo can't be a banner;
-- - the logo shows only once its check passed; until then nobody but its uploader and staff gets
--   its file (CLAUDE.md rule 19), as for the banner picture (229 tests the bucket's policies);
-- - replacing or taking off the logo hands back the old file and is in the space's log;
-- - spaces use the fourteen board colours; the retired night and gold are refused.
-- Seed: "fantasy-writers-circle" (16+, owned by adult_writer, teacher a member).
-- Personas: adult_writer (…01), teacher (…07), blocker (…15).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- A result as server/picture-check.ts signs it, with the test secret below.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-picture-secret', 'sha256'), 'hex');
$$;
-- The hint a statement raises, 'ok' when it runs, or the message when there is no hint.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
  raised_message text;
begin
  execute statement;
  return 'ok';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint, raised_message = message_text;
  return coalesce(nullif(raised_hint, ''), raised_message);
end;
$$;
-- The newest action in the space's log, read past the policies.
create function pg_temp.last_log() returns text language sql security definer as $$
  select log.action from public.space_moderation_log as log
  where log.space_id = '00000000-0000-4000-a000-000000000a01' order by log.created_at desc, log.id desc limit 1;
$$;
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
create temporary table payloads (body text) on commit drop;
grant all on payloads to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Uploads on, the signing secret in Vault, and the full app.
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

-- Three files in the space's folder, as the owner's uploads (Storage's API stamps the owner).
insert into storage.objects (bucket_id, name, owner_id) values
  ('space-banners', '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png', '00000000-0000-4000-8000-000000000001'),
  ('space-banners', '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000002.png', '00000000-0000-4000-8000-000000000001'),
  ('space-banners', '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000003.webp', '00000000-0000-4000-8000-000000000001');

/* ---------- 1. Registering a logo ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.register_space_logo('00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png') $$,
  '23514', null, 'denied: a member without the settings power can''t register a logo');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('first', public.register_space_logo('00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png')),
  ('second', public.register_space_logo('00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000002.png')),
  ('banner', public.register_space_banner('00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000003.webp'));
select is((select kind::text from public.picture_checks where id = (select id from named where label = 'first')),
  'space_logo', 'allowed: the owner registers a logo, kept as its own kind of picture');
select is(pg_temp.hint_of($$select public.register_space_logo('00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png')$$),
  'That picture is already registered.', 'a logo is registered once');

/* ---------- 2. Choosing it, and its check ---------- */

select is(pg_temp.hint_of(format($$select public.set_space_logo_picture('fantasy-writers-circle', %L)$$,
    (select id from named where label = 'banner'))),
  'picture:not_yours', 'a banner picture can''t be chosen as the logo');
select is(pg_temp.hint_of(format($$select public.set_space_banner_picture('fantasy-writers-circle', %L)$$,
    (select id from named where label = 'first'))),
  'picture:not_yours', 'nor can a logo be chosen as the banner');
select is(public.set_space_logo_picture('fantasy-writers-circle', (select id from named where label = 'first')) -> 'old_file',
  'null'::jsonb, 'allowed: the owner makes the picture the logo; there was none before');
select is(pg_temp.last_log(), 'logo_picture_changed', 'changing the logo is in the space''s log');
select is(public.space_page('fantasy-writers-circle') #>> '{logo_picture,state}', 'checking',
  'until its check answers, the owner sees "being checked"');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.space_page('fantasy-writers-circle') #>> '{logo_picture,path}', null,
  'nobody else gets the logo''s file before its check passed');
select is(pg_temp.hint_of($$select public.set_space_logo_picture('fantasy-writers-circle', null)$$),
  'space:not_allowed', 'denied: someone without the settings power can''t change the logo');

-- The uploader's own sign-in sends the check's result (server/picture-check.ts).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into payloads values (json_build_object('pictureId', (select id from named where label = 'first'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select lives_ok($$ select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads))) $$,
  'the picture check records that the logo passed');

select pg_temp.sign_out();
select is(public.space_page('fantasy-writers-circle') #>> '{logo_picture,state}', 'visible',
  'once it passed, everyone sees the logo, signed out included');
select is(public.space_page('fantasy-writers-circle') #>> '{logo_picture,path}',
  '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png',
  'and gets its file to draw');

/* ---------- 3. Replacing it and taking it off ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_space_logo_picture('fantasy-writers-circle', (select id from named where label = 'second')) #>> '{old_file,path}',
  '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000001.png',
  'choosing another logo says which file to delete');
select is(public.set_space_logo_picture('fantasy-writers-circle', null) #>> '{old_file,path}',
  '00000000-0000-4000-a000-000000000a01/31500000-0000-4000-8000-000000000002.png',
  'taking the logo off says which file to delete');
select is(public.space_page('fantasy-writers-circle') -> 'logo_picture', 'null'::jsonb,
  'a space without a logo shows no picture at all');

/* ---------- 4. Banner colours ---------- */

select is(public.update_space('fantasy-writers-circle', 'Fantasy writers’ circle', 'Fantasy.', '', 'members',
    'approve', 'everybody', 'sky_mist') ->> 'banner', 'sky_mist',
  'the owner picks one of the board''s pastels');
select throws_ok($$ select public.update_space('fantasy-writers-circle', 'Fantasy writers’ circle', 'Fantasy.', '',
    'members', 'approve', 'everybody', 'night') $$,
  '23514', null, 'the retired night colour is refused');
select pg_temp.as_postgres();
select throws_ok($$ update public.spaces set banner = 'gold' where slug = 'young-poets' $$,
  '23514', null, 'and so is gold, however it is written');
select is((select count(*)::integer from public.spaces where banner in ('night', 'gold')), 0,
  'no space is left on a retired colour');

select * from finish();
rollback;
