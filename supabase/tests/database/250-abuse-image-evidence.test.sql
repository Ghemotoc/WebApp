-- Database tests for suspected child sexual abuse images (bundle ADMIN-2, part e2b; Robert's
-- brief of 2 Nov 2026, section 4).
-- What it proves:
-- - the picture check keeps the file's SHA-256 and the uploader's scrambled IP, never a staff
--   member's;
-- - rejecting with "Sexual image of a minor" needs words for the police, then keeps the evidence,
--   lists the file for deletion at once, moves the case to safeguarding and closes the account
--   with its own statement of reasons;
-- - an Arachnid Shield match keeps the evidence and no longer preserves the file; a safeguarding
--   moderator closes the account and describes the image from the case page;
-- - only the uploader or the rejecting reviewer may reach the file to delete it;
-- - the legal hold, the 5-year purge and the 30-day blanking of scrambled IPs; an account with
--   evidence is never deleted;
-- - the evidence's read policy, and the evidence pack carries it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": staff changes need one.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
                                                     'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;
-- A result as server/picture-check.ts signs it, with the test secret below: the hash and the
-- scrambled IP are fixed test values.
create function pg_temp.answer(picture_id uuid, outcome text, is_match boolean) returns public.picture_status
language plpgsql as $$
declare
  body text := '{"pictureId": "' || picture_id || '", "outcome": "' || outcome || '", "provider": "stub", "flags": {}, '
    || '"isKnownAbuseMatch": ' || is_match::text || ', "fileSha256": "' || repeat('a', 64) || '", '
    || '"uploaderIp": {"value": "' || repeat('b', 64) || '", "period": "2026-11"}}';
begin
  return public.record_picture_check(body, encode(extensions.hmac(body, 'test-picture-secret', 'sha256'), 'hex'));
end;
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.error_code(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-picture-secret', 'picture_check_secret')
  where not exists (select 1 from vault.secrets where name = 'picture_check_secret');
select vault.update_secret(id, 'test-picture-secret') from vault.secrets where name = 'picture_check_secret';

update public.feature_flags set is_enabled = true where key = 'picture_uploads';

-- The files: a cover by adult_writer (…01) in their All ages seed story, which waits for a
-- reviewer; a profile picture by blocker (…15) that Arachnid matches; a second cover by
-- adult_writer that a moderator re-checks.
insert into storage.objects (bucket_id, name, owner_id) values
  ('covers', '00000000-0000-4000-9000-000000000001/t250a.png', '00000000-0000-4000-8000-000000000001'),
  ('avatars', '25025025-0250-4250-8250-250250250250.png', '00000000-0000-4000-8000-000000000015'),
  ('covers', '00000000-0000-4000-9000-000000000001/t250c.png', '00000000-0000-4000-8000-000000000001');
create temporary table named (label text primary key, id uuid);
grant all on named to authenticated;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
insert into named values ('cover', public.register_picture('covers', '00000000-0000-4000-9000-000000000001/t250a.png', 'cover'));
insert into named values ('recheck', public.register_picture('covers', '00000000-0000-4000-9000-000000000001/t250c.png', 'cover'));
select pg_temp.answer((select id from named where label = 'cover'), 'passed', false);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
insert into named values ('match', public.register_picture('avatars', '25025025-0250-4250-8250-250250250250.png', 'avatar'));
select pg_temp.answer((select id from named where label = 'match'), 'flagged', true);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select pg_temp.answer((select id from named where label = 'recheck'), 'passed', false);
reset role;
insert into named select 'cover_case', case_id from public.picture_checks where id = (select id from named where label = 'cover');
insert into named select 'match_case', case_id from public.picture_checks where id = (select id from named where label = 'match');

/* ---------- 1. What the check keeps ---------- */

select results_eq(
  $$ select file_sha256 = repeat('a', 64), uploader_ip_scrambled = repeat('b', 64), uploader_ip_period
     from public.picture_checks where id = (select id from named where label = 'cover') $$,
  $$ values (true, true, '2026-11') $$,
  'the check keeps the file''s hash and the uploader''s scrambled IP');
select results_eq(
  $$ select file_sha256 is not null, uploader_ip_scrambled is null
     from public.picture_checks where id = (select id from named where label = 'recheck') $$,
  $$ values (true, true) $$,
  'a moderator''s re-check keeps the hash but never the staff member''s IP');

/* ---------- 2. Red with "Sexual image of a minor" ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.error_hint($$select public.admin_reject_picture((select id from named where label = 'cover_case'),
    'sexual_image_of_minor', 'We removed your picture.', 'Clear case.')$$), 'police_description_missing',
  'rejecting as a sexual image of a minor needs words for the police');
select is(public.admin_reject_picture((select id from named where label = 'cover_case'), 'sexual_image_of_minor',
    'We removed your picture.', 'Clear case.', 'A drawing of a child in a sexual pose.',
    'We closed your account for good.'), true,
  'a picture reviewer rejects it with the description');
reset role;
select results_eq(
  $$ select source, description, file_sha256 = repeat('a', 64), uploader_ip_scrambled = repeat('b', 64),
            keep_until > now() + interval '59 months', legal_hold
     from public.abuse_image_evidence where picture_id = (select id from named where label = 'cover') $$,
  $$ values ('moderator', 'A drawing of a child in a sexual pose.', true, true, true, false) $$,
  'the evidence is kept 5 years with the hash, the scrambled IP and the description');
select is((select is_safeguarding from public.cases where id = (select id from named where label = 'cover_case')), true,
  'the case moves to safeguarding');
select isnt((public.active_sanction('00000000-0000-4000-8000-000000000001', 'ban')).id, null,
  'the uploader''s account is closed for good');
select results_eq(
  $$ select action::text, ground::text, ground_key from public.statements_of_reasons
     where user_id = '00000000-0000-4000-8000-000000000001' and created_at >= now() order by action::text $$,
  $$ values ('ban', 'law', 'child_sexual_content'), ('remove', 'law', 'child_sexual_content') $$,
  'the uploader gets a statement for the picture and one for the account, both on the law');
select is((select count(*)::integer from public.audit_log where action = 'safeguarding.abuse_image_evidence_kept'
           and target_user_id = '00000000-0000-4000-8000-000000000001'), 1,
  'keeping the evidence is in the audit log');
select is((select count(*)::integer from public.storage_files_to_sweep(1000)
           where name = '00000000-0000-4000-9000-000000000001/t250a.png'), 1,
  'the storage sweep lists the file at once, without the grace time');

/* ---------- 3. Who may reach the file to delete it ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from storage.objects where name = '00000000-0000-4000-9000-000000000001/t250a.png'), 1,
  'allowed: abuse_image_files_select_to_delete: the reviewer who rejected it reaches the file');
select is(public.abuse_image_file_may_go('covers', '00000000-0000-4000-9000-000000000001/t250a.png'), true,
  'allowed: abuse_image_files_delete: and may delete it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from storage.objects where name = '00000000-0000-4000-9000-000000000001/t250a.png'), 0,
  'denied: abuse_image_files_select_to_delete: another reviewer doesn''t reach it');
select is(public.abuse_image_file_may_go('covers', '00000000-0000-4000-9000-000000000001/t250a.png'), false,
  'denied: abuse_image_files_delete: nor may delete it');

/* ---------- 4. The evidence's read policy ---------- */

select is((select count(*)::integer from public.abuse_image_evidence), 0,
  'denied: abuse_image_evidence_select_safeguarding: an admin without the safeguarding permission reads none');
select is(pg_temp.error_code($$select public.admin_abuse_image_evidence((select id from named where label = 'cover_case'))$$),
  '42501', 'nor sees it on the case page');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.abuse_image_evidence
           where picture_id in (select id from named)), 2,
  'allowed: abuse_image_evidence_select_safeguarding: a safeguarding moderator reads both');

/* ---------- 5. An Arachnid Shield match ---------- */

select results_eq(
  $$ select evidence ->> 'source', (evidence ->> 'accountClosed')::boolean
     from (select public.admin_abuse_image_evidence((select id from named where label = 'match_case')) as evidence) as found $$,
  $$ values ('known_image_match', false) $$,
  'a match keeps the evidence, and the account stays open until a person decides');
reset role;
select is((select preserve_until from public.picture_checks where id = (select id from named where label = 'match')), null,
  'the matched file is no longer preserved');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.abuse_image_file_may_go('avatars', '25025025-0250-4250-8250-250250250250.png'), true,
  'the uploader''s own sign-in may delete the matched file, as the check does at once');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.error_code($$select public.admin_close_account_for_abuse_image((select id from named where label = 'match_case'),
    'Known image.', 'We closed your account for good.')$$), '42501',
  'only safeguarding staff close the account');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_close_account_for_abuse_image((select id from named where label = 'match_case'),
    'Known image.', 'We closed your account for good.'), true,
  'a safeguarding moderator closes the account from the case page');
select is(public.admin_close_account_for_abuse_image((select id from named where label = 'match_case'),
    'Known image.', 'We closed your account for good.'), false,
  'closing it again changes nothing');
select is(public.admin_describe_abuse_image((select id from public.abuse_image_evidence
    where picture_id = (select id from named where label = 'match')), 'A photograph of a young child.'), true,
  'a safeguarding moderator writes the description for a match');
select is(public.admin_build_evidence_pack((select id from named where label = 'match_case'), 'For the police.')
    #>> '{item,content,abuse_image_evidence,description}', 'A photograph of a young child.',
  'the evidence pack carries the description');

/* ---------- 6. Legal hold and the clean-ups ---------- */

select is(pg_temp.error_code($$select public.admin_set_evidence_hold((select id from public.abuse_image_evidence
    where picture_id = (select id from named where label = 'match')), true, ' ')$$), '23514',
  'a legal hold needs a reason');
select is(public.admin_set_evidence_hold((select id from public.abuse_image_evidence
    where picture_id = (select id from named where label = 'match')), true, 'The police asked on 3 Nov 2031.'), true,
  'a safeguarding moderator puts a legal hold on the evidence');
reset role;
update public.abuse_image_evidence set keep_until = now() - interval '1 day' where picture_id in (select id from named);
select is(public.purge_abuse_image_evidence(), 1, 'the purge deletes evidence past its 5 years');
select is((select count(*)::integer from public.abuse_image_evidence where legal_hold), 1,
  'but keeps evidence under a legal hold');
update public.picture_checks set created_at = now() - interval '31 days' where id = (select id from named where label = 'cover');
select is(public.blank_old_scrambled_ips() >= 1, true, 'scrambled IPs older than 30 days are blanked');
insert into public.account_deletions (user_id, requested_at, delete_after)
  values ('00000000-0000-4000-8000-000000000015', now() - interval '15 days', now() - interval '1 day');
select public.purge_closed_accounts();
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000015'), 1,
  'an account with evidence is never deleted by the nightly purge: it stays closed');

select * from finish();
rollback;
