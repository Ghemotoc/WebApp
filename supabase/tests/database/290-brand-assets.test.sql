-- Database tests for brand pictures: the logos and emblems staff upload (bundle BRAND-1, part a;
-- Robert, 4 Nov 2026, 14:25 UTC).
-- What it proves:
-- - only owner and admin upload a logo or emblem, and only under a slot's folder
--   (brand_assets_insert_website_staff, allowed and denied);
-- - the picture goes through the check and a moderator approves it before anyone else sees it
--   (CLAUDE.md rule 19; brand_assets_select_visible and brand_assets_select_uploader_and_staff,
--   allowed and denied);
-- - only owner and admin read and change the slots (brand_assets_select_website_staff, allowed
--   and denied), a picture can't go in another slot, and every change is in the audit log;
-- - brand_assets_published() shows a slot only once its picture is approved; a newer picture
--   waiting for a moderator leaves the approved one up; a removed picture drops off at once, and
--   a cleared slot shows the default again.
-- Personas: adult_writer (…01), admin (…09), moderator (…10).
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A visitor who isn't signed in: the anon role and no user in the claims.
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid, value text) on commit drop;
grant all on kept to authenticated, anon;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';
-- Start from empty slots, so the defaults show.
delete from public.brand_assets;

/* ---------- 1. The upload ---------- */

insert into kept (label, value) values ('path', 'logo_light/' || gen_random_uuid()::text || '.png');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('brand-assets', %L, '00000000-0000-4000-8000-000000000009') $$, (select value from kept where label = 'path')),
  'allowed: brand_assets_insert_website_staff lets an admin upload a light-theme logo');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('brand-assets', %L, '00000000-0000-4000-8000-000000000009') $$, 'banner/' || gen_random_uuid()::text || '.png'),
  '42501', null, 'an admin can''t upload outside the four slot folders');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('brand-assets', %L, '00000000-0000-4000-8000-000000000010') $$, 'emblem_dark/' || gen_random_uuid()::text || '.png'),
  '42501', null, 'denied: brand_assets_insert_website_staff refuses a moderator');
select throws_ok($$ select public.register_brand_picture('emblem_dark/x.png') $$,
  '42501', null, 'a moderator can''t register a brand picture');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('picture', public.register_brand_picture((select value from kept where label = 'path')));
reset role;
select ok(public.picture_needs_person((select picture_checks from public.picture_checks where id = (select id from kept where label = 'picture'))),
  'every brand picture waits for a moderator, because the logo is on every screen');

/* ---------- 2. Who reads the file while it is checked ---------- */

select pg_temp.as_visitor();
select is((select count(*)::integer from storage.objects where bucket_id = 'brand-assets'), 0,
  'denied: brand_assets_select_visible hides a logo still being checked from visitors');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from storage.objects where bucket_id = 'brand-assets'), 1,
  'allowed: brand_assets_select_uploader_and_staff lets the uploader read it while it is checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'brand-assets'), 0,
  'denied: brand_assets_select_uploader_and_staff hides it from a member');

/* ---------- 3. Putting it in a slot ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ select public.admin_set_brand_asset('logo_light', %L) $$, (select id from kept where label = 'picture')),
  '42501', null, 'a moderator can''t change the logo');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok(format($$ select public.admin_set_brand_asset('emblem_dark', %L) $$, (select id from kept where label = 'picture')),
  '23514', null, 'a light-theme logo can''t be used as the night-theme emblem');
select lives_ok(format($$ select public.admin_set_brand_asset('logo_light', %L) $$, (select id from kept where label = 'picture')),
  'an admin puts the new logo in its slot while it is still being checked');
select is((select count(*)::integer from public.brand_assets), 1,
  'allowed: brand_assets_select_website_staff lets an admin read the slots');
select is(public.admin_brand_assets() #>> '{logo_light,state}', 'checking',
  'the staff page shows the logo as being checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.brand_assets), 0,
  'denied: brand_assets_select_website_staff hides the slots from a moderator');

/* ---------- 4. What everyone sees ---------- */

select pg_temp.as_visitor();
select is((select count(*)::integer from public.brand_assets_published()), 0,
  'a logo still waiting for a moderator isn''t shown: the default stays');
reset role;
update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'picture');
select pg_temp.as_visitor();
select is((select slot::text || ' ' || bucket from public.brand_assets_published()), 'logo_light brand-assets',
  'once approved, every visitor gets the new light-theme logo');
select is((select count(*)::integer from storage.objects where bucket_id = 'brand-assets'), 1,
  'allowed: brand_assets_select_visible lets a visitor read the approved logo');
reset role;

-- A newer logo waits for its check; the approved one stays up meanwhile.
insert into kept (label, value) values ('newer path', 'logo_light/' || gen_random_uuid()::text || '.webp');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into storage.objects (bucket_id, name, owner_id)
values ('brand-assets', (select value from kept where label = 'newer path'), '00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('newer', public.register_brand_picture((select value from kept where label = 'newer path')));
select public.admin_set_brand_asset('logo_light', (select id from kept where label = 'newer'));
select is(public.admin_brand_assets() #>> '{logo_light,shows_earlier}', 'true',
  'the staff page says the earlier logo shows while the newer one is checked');
select pg_temp.as_visitor();
select is((select path from public.brand_assets_published()), (select value from kept where label = 'path'),
  'a newer logo waiting for a moderator doesn''t replace the approved one');
reset role;
update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'newer');
select pg_temp.as_visitor();
select is((select path from public.brand_assets_published()), (select value from kept where label = 'newer path'),
  'once the newer logo is approved, it replaces the earlier one');
reset role;
update public.picture_checks set status = 'removed' where id = (select id from kept where label = 'newer');
select pg_temp.as_visitor();
select is((select path from public.brand_assets_published()), (select value from kept where label = 'path'),
  'if moderation removes the newer logo, the earlier approved one shows again');
reset role;
update public.picture_checks set status = 'removed' where id = (select id from kept where label = 'picture');
select pg_temp.as_visitor();
select is((select count(*)::integer from public.brand_assets_published()), 0,
  'with both removed, the default shows');
reset role;

/* ---------- 5. Back to the default, and the audit log ---------- */

update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'picture');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_clear_brand_asset('logo_light');
select public.admin_clear_brand_asset('logo_light');
select is((select count(*)::integer from public.brand_assets_published()), 0,
  'clearing the slot brings the default back');
reset role;
select is((select array_agg(action order by created_at, action) from public.audit_log
           where target_type = 'brand_assets' and target_id = 'logo_light'),
  array['website.brand_asset_cleared', 'website.brand_asset_set', 'website.brand_asset_set'],
  'each choice and the clearing are logged, and clearing an empty slot logs nothing');

select * from finish();
rollback;
