-- Database tests for space banner pictures, the join notifications and the space forum guard
-- (bundle FORUMS-2, part c; stories S1-E8-06 and S1-E8-07).
-- What it proves:
-- - whoever holds a space's settings power adds a banner picture under the space's folder, and
--   nobody else does (policy space_banners_insert_settings allowed and denied);
-- - the banner shows only once its check passed; until then only its uploader and moderation
--   staff read the file (policies space_banners_select_visible and
--   space_banners_select_uploader_and_staff, allowed and denied; CLAUDE.md rule 19);
-- - choosing another banner hands back the old file, which may then go, while the live banner's
--   file stays (policy space_banners_delete_own allowed and denied); the change is in the log;
-- - a request to join notifies the owner and moderators with the members power, grouped per space;
--   being let in notifies the person with no name attached; both sit under Follows and never show
--   a user ID;
-- - staff's forum tools can't move, pin or remove a space's hidden forum.
-- Seed: "fantasy-writers-circle" (16+, owned by adult_writer, approve to join, teacher a member).
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07), moderator (…10), blocker (…15).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

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
-- A person's notifications of one kind, read past the policies: "<count> <actor_count>".
create function pg_temp.notes_of(persona_id text, wanted text) returns text language sql security definer as $$
  select count(*)::text || ' ' || coalesce(max(notifications.actor_count), 0)::text from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind::text = wanted;
$$;
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
create temporary table payloads (body text) on commit drop;
grant all on payloads to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Uploads on, the signing secret in Vault, and the full app (the March flag keeps under-18s
-- read-only; this test is about the full app).
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
update public.feature_flags set is_enabled = false where key in ('adults_only', 'parental_consent');
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

/* ---------- 1. Uploading a banner (S1-E8-06 criterion 1; rule 19) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ insert into storage.objects (bucket_id, name) values
    ('space-banners', '00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000001.webp'),
    ('space-banners', '00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000002.webp') $$,
  'allowed: space_banners_insert_settings: the owner adds banner pictures under their space');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('space-banners', '00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000003.webp') $$,
  '42501', null, 'denied: space_banners_insert_settings: a plain member can''t add a banner');
select is(public.space_banner_upload_allowed('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000003.webp'),
  false, 'a plain member may not upload a banner');
select pg_temp.as_postgres();
update public.space_members set role = 'moderator', powers = array['settings']::public.space_power[]
where space_id = '00000000-0000-4000-a000-000000000a01' and user_id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.space_banner_upload_allowed('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000003.webp'),
  true, 'a moderator given the settings power may upload a banner');
select pg_temp.as_postgres();
update public.feature_flags set is_enabled = false where key = 'picture_uploads';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_banner_upload_allowed('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000003.webp'),
  false, 'nobody uploads while picture uploads are off');
select pg_temp.as_postgres();
update public.feature_flags set is_enabled = true where key = 'picture_uploads';
-- Storage's own API stamps the uploader on the file; a plain insert in a test doesn't.
update storage.objects set owner_id = '00000000-0000-4000-8000-000000000001'
where bucket_id = 'space-banners' and name like '00000000-0000-4000-a000-000000000a01/229%';

/* ---------- 2. Choosing it, and its check ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('first', public.register_space_banner('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000001.webp')),
  ('second', public.register_space_banner('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000002.webp'));
select is(pg_temp.hint_of($$select public.register_space_banner('00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000001.webp')$$),
  'That picture is already registered.', 'a picture is registered once');
select is(public.set_space_banner_picture('fantasy-writers-circle', (select id from named where label = 'first')) -> 'old_file',
  'null'::jsonb, 'the owner makes the picture the banner; there was none before');
select is(pg_temp.last_log(), 'banner_picture_changed', 'changing the banner is in the space''s log');
select is(public.space_page('fantasy-writers-circle') #>> '{banner_picture,state}', 'checking',
  'until its check answers, the owner sees "being checked"');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'), 2,
  'allowed: space_banners_select_uploader_and_staff: the uploader reads their banners while they are checked');
select is(pg_temp.hint_of(format($$select public.set_space_banner_picture('fantasy-writers-circle', %L)$$, gen_random_uuid())),
  'picture:not_yours', 'only a banner the caller uploaded for this space can be chosen');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'), 0,
  'denied: space_banners_select_visible: nobody else reads a banner before its check passed');
select is(public.space_page('fantasy-writers-circle') #>> '{banner_picture,path}', null,
  'nor does the space hand them its file');
select is(pg_temp.hint_of($$select public.set_space_banner_picture('fantasy-writers-circle', null)$$),
  'space:not_allowed', 'someone without the settings power can''t change the banner');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'), 2,
  'allowed: space_banners_select_uploader_and_staff: moderation staff read banners being checked');

insert into payloads values (json_build_object('pictureId', (select id from named where label = 'first'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select lives_ok($$ select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads))) $$,
  'the picture check records that the banner passed');

select pg_temp.sign_out();
select is(public.space_page('fantasy-writers-circle') #>> '{banner_picture,state}', 'visible',
  'once it passed, everyone sees the banner, signed out included');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'), 1,
  'allowed: space_banners_select_visible: anyone reads the banner that passed, and only that one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'), 1,
  'denied: space_banners_select_uploader_and_staff: another member reads only the passed banner, not the one still checked');

/* ---------- 3. Replacing it, and deleting the old file ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_space_banner_picture('fantasy-writers-circle', (select id from named where label = 'second')) #>> '{old_file,path}',
  '00000000-0000-4000-a000-000000000a01/22900000-0000-4000-8000-000000000001.webp',
  'choosing another banner says which file to delete');
-- The Storage API sets this flag for its own deletes; the test stands in for the API.
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'space-banners';
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'
           and name like '%000000000002.webp'), 1,
  'denied: space_banners_delete_own: the live banner''s file stays');
select is((select count(*)::integer from storage.objects where bucket_id = 'space-banners'
           and name like '%000000000001.webp'), 0,
  'allowed: space_banners_delete_own: the replaced banner''s file is deleted');

/* ---------- 4. Join notifications (board 5.3) ---------- */

-- teacher now helps with members; the owner and teacher hear about requests.
select pg_temp.as_postgres();
update public.space_members set powers = array['members']::public.space_power[]
where space_id = '00000000-0000-4000-a000-000000000a01' and user_id = '00000000-0000-4000-8000-000000000007';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.join_space('fantasy-writers-circle') ->> 'status', 'pending', 'teen_17 asks to join');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.join_space('fantasy-writers-circle') ->> 'status', 'pending', 'blocker asks to join too');
select is(pg_temp.notes_of('00000000-0000-4000-8000-000000000001', 'space_join_request'), '1 2',
  'the owner gets one notification for both requests');
select is(pg_temp.notes_of('00000000-0000-4000-8000-000000000007', 'space_join_request'), '1 2',
  'so does the moderator with the members power');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select entry ->> 'category' || ' ' || (entry #>> '{space,slug}')
           from jsonb_array_elements(public.my_notifications() -> 'notifications') as entry
           where entry ->> 'kind' = 'space_join_request'),
  'follows fantasy-writers-circle', 'the request sits under Follows and links to the space');
select is(public.decide_space_join_request('fantasy-writers-circle', 'teen_17', true) ->> 'outcome', 'approved',
  'the owner lets teen_17 in');
select is(public.decide_space_join_request('fantasy-writers-circle', 'blocker', false) ->> 'outcome', 'declined',
  'and says no to blocker');
select is(pg_temp.notes_of('00000000-0000-4000-8000-000000000002', 'space_join_approved'), '1 0',
  'teen_17 is told they are in, with no name attached');
select is(pg_temp.notes_of('00000000-0000-4000-8000-000000000015', 'space_join_approved'), '0 0',
  'a declined request sends nothing');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is((select count(*)::integer from jsonb_array_elements(public.my_notifications() -> 'notifications') as entry
           where entry ->> 'kind' = 'space_join_approved' and entry::text not like '%00000000-0000-4000-%'),
  1, 'the approval shows the space and never a user ID');

/* ---------- 5. Staff's forum tools leave space forums alone ---------- */

select pg_temp.as_postgres();
select is(pg_temp.hint_of($$update public.forums set is_pinned = true where slug = 'space-fantasy-writers-circle'$$),
  'forum:space', 'a space''s forum can''t be pinned, moved or removed from the forum tools');

select * from finish();
rollback;
