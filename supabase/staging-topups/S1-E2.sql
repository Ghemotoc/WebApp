-- Staging top-up for epic S1-E2 (stories S1-E14-01, S1-E2-01 and S1-E2-04), 18 Oct 2026.
--
-- What it adds: the three parts of supabase/seed.sql that arrived after the test personas were
-- loaded on staging: each persona's acceptance of the terms and privacy notice v0.1, the four test
-- invite codes, and each persona's username (plus adult_writer's pen name).
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only @personas.test rows and
-- seed invites, and is safe to run twice (each part skips rows that already exist).
-- How to check it worked: the last query should show consents 32, invites 4 and
-- test_accounts_with_username 16.
begin;

-- 1. Every test account (@personas.test) accepted version 0.1 of the terms and the privacy notice
--    in English, as seed.sql step 5 does, so signing in doesn't stop at "accept the new terms".
insert into public.consents (user_id, legal_document_version_id, method)
select users.id, versions.id, 'sign_up'
from auth.users as users
cross join public.legal_document_versions as versions
join public.legal_documents as documents on documents.id = versions.document_id
where users.email like '%@personas.test'
  and documents.needs_acceptance and versions.version_label = '0.1' and versions.language = 'en'
  and not exists (
    select 1 from public.consents as existing
    where existing.user_id = users.id and existing.legal_document_version_id = versions.id
  );

-- 2. The four test invite codes from seed.sql (one that works, one expired, one used up, one
--    revoked), made by the admin test account. The codes are in supabase/README.md.
insert into public.invites (user_id, code_hash, max_uses, use_count, expires_at, revoked_at, note)
select '00000000-0000-4000-8000-000000000009', public.invite_code_hash(seed.code),
       seed.max_uses, seed.use_count, seed.expires_at::timestamptz, seed.revoked_at::timestamptz, seed.note
from (values
  ('PERSONAS-TEST-INVITE', 1000, 0, '2100-01-01', null, 'Seed: works for every test sign-up'),
  ('EXPIRED-TEST-INVITE', 5, 0, '2026-01-01', null, 'Seed: expired'),
  ('USED-UP-TEST-INVITE', 1, 1, '2100-01-01', null, 'Seed: used up'),
  ('REVOKED-TEST-INVITE', 5, 0, '2100-01-01', '2026-10-17', 'Seed: revoked')
) as seed (code, max_uses, use_count, expires_at, revoked_at, note)
where not exists (
  select 1 from public.invites where invites.code_hash = public.invite_code_hash(seed.code)
);

-- 3. Every test account gets its username: its persona name, as seed.sql step 3 does since
--    S1-E2-04, and adult_writer also gets the pen name "Lia Scrie". Without a username the account
--    gate stops the persona at "choose a username". Only accounts with no username yet change; the
--    profiles_derive_handle_forms trigger fills in the web-address and look-alike forms.
update public.profiles as profiles
set handle = split_part(users.email, '@', 1),
    pen_name = case when split_part(users.email, '@', 1) = 'adult_writer' then 'Lia Scrie' end
from auth.users as users
where users.id = profiles.id
  and users.email like '%@personas.test'
  and profiles.handle is null;

commit;

select json_build_object(
  'consents', (select count(*) from public.consents),
  'invites', (select count(*) from public.invites),
  'test_accounts_with_username', (select count(*) from public.profiles where handle is not null)
)::text as after_top_up;
