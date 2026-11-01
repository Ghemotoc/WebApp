-- Staging top-up for story S1-E13-04 (retention jobs), 1 Nov 2026.
--
-- What it changes: the seed's expired and revoked test invites now ended "yesterday", because the
-- nightly retention job deletes an invite 90 days after it ends and the old fixed dates
-- (1 Jan 2026 and 17 Oct 2026) would make it delete them. Run it before the job's first night on
-- staging, and again whenever the sign-up tests say EXPIRED-TEST-INVITE or REVOKED-TEST-INVITE is
-- missing (it puts them back).
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only the two seed invites
-- and is safe to run twice.
-- How to check it worked: the last query shows both codes with an end date of yesterday.
begin;

-- 1. Put either invite back if the job already removed it (the admin persona made them).
insert into public.invites (user_id, code_hash, max_uses, use_count, expires_at, revoked_at, note)
select '00000000-0000-4000-8000-000000000009', public.invite_code_hash(seed.code), 5, 0,
       seed.expires_at, seed.revoked_at, seed.note
from (values
  ('EXPIRED-TEST-INVITE', now() - interval '1 day', null::timestamptz, 'Seed: expired'),
  ('REVOKED-TEST-INVITE', timestamptz '2100-01-01', now() - interval '1 day', 'Seed: revoked')
) as seed (code, expires_at, revoked_at, note)
on conflict (code_hash) do nothing;

-- 2. Move the end dates of the existing rows to yesterday.
update public.invites set expires_at = now() - interval '1 day'
where code_hash = public.invite_code_hash('EXPIRED-TEST-INVITE');
update public.invites set revoked_at = now() - interval '1 day'
where code_hash = public.invite_code_hash('REVOKED-TEST-INVITE');

commit;

select note, expires_at::date, revoked_at::date from public.invites
where code_hash in (public.invite_code_hash('EXPIRED-TEST-INVITE'), public.invite_code_hash('REVOKED-TEST-INVITE'));
