-- Database tests for forum signatures and moderators' requests to change a signature or a space
-- banner (bundle FORUMS-2, part d; story S1-E8-08).
-- What it proves:
-- - a signature is at most 300 characters and three lines (criterion 1); a read-only account
--   can't set one; blank removes it;
-- - it travels with every post in a thread and shows on the profile, never with a user ID;
-- - its one picture is added only by a member who may write, is read by others only once its
--   check passed, and its file may go once replaced (policies signature_pictures_insert_own,
--   signature_pictures_select_visible, signature_pictures_select_uploader_and_staff and
--   signature_pictures_delete_own, allowed and denied);
-- - a moderator asks for a change: the person is told (it can't be switched off), sees it in
--   Settings, and changing in time closes it; unchanged after 24 hours, the job removes it with a
--   statement of reasons (criterion 3, Q29); the same for a space's banner picture;
-- - only the person asked and moderation staff read a request (policy
--   customisation_change_requests_select_own_or_staff, allowed and denied).
-- Personas: adult_writer (…01), suspended_user (…13), teacher (…07), moderator (…10). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

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
-- adult_writer's signature, and the outcome of the request with a given reason, read past the policies.
-- (Both requests are made in one transaction, so they share created_at: pick by reason, not by time.)
create function pg_temp.signature_of_writer() returns text language sql security definer as $$
  select coalesce(profiles.signature, '(none)') from public.profiles where profiles.id = '00000000-0000-4000-8000-000000000001';
$$;
create function pg_temp.outcome_of(wanted_reason text) returns text language sql security definer as $$
  select coalesce(requests.outcome, 'open') from public.customisation_change_requests as requests
  where requests.reason = wanted_reason;
$$;
create temporary table named (label text primary key, id uuid) on commit drop;
grant all on named to anon, authenticated;
create temporary table payloads (body text) on commit drop;
grant all on payloads to anon, authenticated;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';
select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

/* ---------- 1. The words (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.hint_of($$select public.set_my_signature(repeat('a', 301))$$), 'signature:too_long',
  'a signature over 300 characters is refused');
select is(pg_temp.hint_of($$select public.set_my_signature(E'one\ntwo\nthree\nfour')$$), 'signature:too_many_lines',
  'a signature over three lines is refused');
select is(pg_temp.hint_of($$select public.set_my_signature(E'  Writing Statia meteo.\nNew chapter most Fridays.  ')$$), 'ok',
  'three lines or fewer within 300 characters are saved');
select is(pg_temp.signature_of_writer(), E'Writing Statia meteo.\nNew chapter most Fridays.',
  'the spaces around it are trimmed');
select is(public.my_signature() #>> '{signature,text}', E'Writing Statia meteo.\nNew chapter most Fridays.',
  'Settings reads it back');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select is(pg_temp.hint_of($$select public.set_my_signature('Hello')$$), 'Your account can''t change its signature right now.',
  'a read-only account can''t set a signature');

/* ---------- 2. Where it shows ---------- */

select pg_temp.sign_out();
select is(public.profile_signature('adult_writer') ->> 'text', E'Writing Statia meteo.\nNew chapter most Fridays.',
  'the profile shows it to anyone, signed out included');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
create temporary table thread_numbers (value bigint) on commit drop;
grant all on thread_numbers to anon, authenticated;
insert into thread_numbers select (public.start_forum_thread('first-chapters', 'Semnături de test', 'Primul.') ->> 'thread_number')::bigint;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.forum_thread((select value from thread_numbers)) #>> '{posts,0,signature,text}',
  E'Writing Statia meteo.\nNew chapter most Fridays.', 'a post carries its author''s signature');
select is(public.forum_thread((select value from thread_numbers))::text like '%00000000-0000-4000-8000%', false,
  'the thread never shows a user ID');

/* ---------- 3. The one still picture ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ insert into storage.objects (bucket_id, name) values
    ('signature-pictures', '23000000-0000-4000-8000-000000000001.webp'),
    ('signature-pictures', '23000000-0000-4000-8000-000000000002.webp') $$,
  'allowed: signature_pictures_insert_own: a member adds signature pictures under random names');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000013');
select throws_ok($$ insert into storage.objects (bucket_id, name) values
    ('signature-pictures', '23000000-0000-4000-8000-000000000003.webp') $$,
  '42501', null, 'denied: signature_pictures_insert_own: a read-only account can''t add one');
select pg_temp.as_postgres();
-- Storage's own API stamps the uploader on the file; a plain insert in a test doesn't.
update storage.objects set owner_id = '00000000-0000-4000-8000-000000000001'
where bucket_id = 'signature-pictures' and name like '230%';

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values
  ('first', public.register_signature_picture('23000000-0000-4000-8000-000000000001.webp')),
  ('second', public.register_signature_picture('23000000-0000-4000-8000-000000000002.webp'));
select is(pg_temp.hint_of(format($$select public.set_my_signature('Cu poză', %L)$$, gen_random_uuid())),
  'picture:not_yours', 'only the caller''s own signature picture can be used');
select is(public.set_my_signature('Cu poză', (select id from named where label = 'first')) -> 'old_file', 'null'::jsonb,
  'the picture goes on the signature');
select is(public.my_signature() #>> '{signature,picture,state}', 'checking',
  'until its check answers, the owner sees "being checked"');
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures'), 2,
  'allowed: signature_pictures_select_uploader_and_staff: the uploader reads their pictures while they are checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures'), 0,
  'denied: signature_pictures_select_visible: nobody else reads a picture before its check passed');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures'), 2,
  'allowed: signature_pictures_select_uploader_and_staff: moderation staff read pictures being checked');
insert into payloads values (json_build_object('pictureId', (select id from named where label = 'first'),
  'outcome', 'passed', 'provider', 'stub', 'flags', json_build_object('nudity', 0.01))::text);
select lives_ok($$ select public.record_picture_check((select body from payloads), pg_temp.signed((select body from payloads))) $$,
  'the picture check records that it passed');
select pg_temp.sign_out();
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures'), 1,
  'allowed: signature_pictures_select_visible: anyone reads the picture that passed, and only that one');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures'), 1,
  'denied: signature_pictures_select_uploader_and_staff: another member never reads the one still checked');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_signature('Cu poză', (select id from named where label = 'second')) #>> '{old_file,path}',
  '23000000-0000-4000-8000-000000000001.webp', 'choosing another picture says which file to delete');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'signature-pictures';
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures' and name like '%2.webp'), 1,
  'denied: signature_pictures_delete_own: the live picture''s file stays');
select is((select count(*)::integer from storage.objects where bucket_id = 'signature-pictures' and name like '%1.webp'), 0,
  'allowed: signature_pictures_delete_own: the replaced picture''s file is deleted');

/* ---------- 4. A moderator asks for a change (criterion 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.admin_request_customisation_change('signature', 'adult_writer', 'Prea mult.')$$),
  'Only moderators can do that.', 'a member can''t ask anyone to change their signature');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.hint_of($$select public.admin_request_customisation_change('signature', 'teacher', 'Nimic.')$$),
  'change:nothing', 'there must be a signature to change');
insert into named select 'request', public.admin_request_customisation_change('signature', 'adult_writer', 'Fără reclame, te rog.');
select is(pg_temp.hint_of($$select public.admin_request_customisation_change('signature', 'adult_writer', 'Iar.')$$),
  'change:open', 'one open request at a time');
select is((select count(*)::integer from public.customisation_change_requests), 1,
  'allowed: customisation_change_requests_select_own_or_staff: moderation staff read the requests');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select entry ->> 'is_required' || ' ' || (entry #>> '{change_request,reason}')
           from jsonb_array_elements(public.my_notifications() -> 'notifications') as entry
           where entry ->> 'kind' = 'customisation_change_requested'),
  'true Fără reclame, te rog.', 'the person is told why, and it can''t be switched off');
select is(public.my_signature() #>> '{change_request,reason}', 'Fără reclame, te rog.',
  'Settings shows what to change');
select is((select count(*)::integer from public.customisation_change_requests), 1,
  'allowed: customisation_change_requests_select_own_or_staff: the person reads their own request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.customisation_change_requests), 0,
  'denied: customisation_change_requests_select_own_or_staff: nobody else reads it');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.set_my_signature('Scriu Statia meteo.') $$, 'the person changes it in time');
select is(pg_temp.outcome_of('Fără reclame, te rog.'), 'changed', 'changing it closes the request');

-- A second request, left unchanged past its 24 hours.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_request_customisation_change('signature', 'adult_writer', 'Tot nu e bine.');
select pg_temp.as_postgres();
update public.customisation_change_requests set due_at = now() - interval '1 minute' where resolved_at is null;
select is(public.remove_unchanged_customisations(), 1, 'the job finds the unchanged signature');
select is(pg_temp.signature_of_writer() || ' ' || pg_temp.outcome_of('Tot nu e bine.'), '(none) removed',
  'it is removed, and the request says so');
select is((select count(*)::integer from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001' and action = 'remove' and facts = 'Tot nu e bine.'),
  1, 'the person gets a statement of reasons (DSA art. 17)');

-- A space's banner picture, the same way.
insert into public.picture_checks (id, user_id, bucket, path, kind, status)
values ('23000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'space-banners',
  '00000000-0000-4000-a000-000000000a01/23000000-0000-4000-8000-0000000000b1.webp', 'space_banner', 'passed');
update public.spaces set banner_picture_id = '23000000-0000-4000-8000-0000000000b1' where slug = 'fantasy-writers-circle';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_request_customisation_change('space_banner', 'fantasy-writers-circle', 'Bannerul nu e potrivit.');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_banner_change_request('fantasy-writers-circle') ->> 'reason', 'Bannerul nu e potrivit.',
  'the space''s owner sees what to change on the settings page');
select pg_temp.as_postgres();
update public.customisation_change_requests set due_at = now() - interval '1 minute' where resolved_at is null;
select public.remove_unchanged_customisations();
select is((select banner_picture_id from public.spaces where slug = 'fantasy-writers-circle'), null,
  'an unchanged banner picture is removed after 24 hours, and the colour shows again');

select * from finish();
rollback;
