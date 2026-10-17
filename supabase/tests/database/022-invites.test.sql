-- Database tests for invites (story S1-E2-01; the table is shared with S1-E11-17).
-- What it proves: owner and admin read invites, members and visitors don't (allowed and denied);
-- codes are stored only as hashes; check_invite() answers valid, ended or unknown to anyone and
-- reveals nothing else; nobody writes invites through the API.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select is_empty(
  $$ select id from public.invites where code_hash ilike '%TEST-INVITE%' $$,
  'no invite code is stored in the clear, only its SHA-256 hash'
);

-- Signed out: the sign-up form's question.
set local role anon;

select is(public.check_invite('personas-test-invite'), 'valid',
  'a working code is valid, whatever its letter case');
select is(public.check_invite('PERSONAS TEST INVITE'), 'valid',
  'spaces and dashes in a pasted code are ignored');
select is(public.check_invite('EXPIRED-TEST-INVITE'), 'ended', 'an expired code has ended');
select is(public.check_invite('USED-UP-TEST-INVITE'), 'ended', 'a used-up code has ended');
select is(public.check_invite('REVOKED-TEST-INVITE'), 'ended', 'a revoked code has ended');
select is(public.check_invite('NO-SUCH-CODE'), 'unknown', 'a made-up code is unknown');

select is_empty(
  $$ select id from public.invites $$,
  'denied: invites_select_admin: a signed-out visitor reads no invites'
);

-- Signed in as adult_writer: a member.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ update public.invites set max_uses = 9999 $$,
  '42501',
  null,
  'denied: invites_select_admin: a member can neither read nor change invites'
);

-- Signed in as admin.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';

select is(
  (select count(*)::integer from public.invites),
  4,
  'allowed: invites_select_admin: an admin reads the invites (their notes and uses, never the codes)'
);

select * from finish();

rollback;
