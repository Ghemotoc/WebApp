-- Invites for the March test (story S1-E2-01; the table is shared with S1-E11-17 and, later, class
-- spaces in S1-E8-11a).
--
-- What it adds:
--   invites                      one row per invite link or code. The code is never stored, only
--                                its SHA-256 hash, so nobody can read a code back after it is made.
--   normalise_invite_code(code)  the one way a typed code is compared: upper case, letters and
--                                digits only, so "abcd-efgh" and "ABCDEFGH" are the same code
--   check_invite(code)           the sign-up form's question "is this code still good?"
--   use_platform_invite(code)    takes one place, in the sign-up transaction (internal)
-- Why: the March test is invited adults only (decided 17 Oct 2026, 12:44); while the flag
-- invite_only is on, sign-up needs an invite made by an admin (S1-E11-17, decided 17 Oct 2026,
-- 13:01: the same logic as class-space invites, one shared table). Until S1-E11-17 builds the
-- admin screen, test invites are seeded by supabase/seed.sql (local and staging only).

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  purpose text not null default 'platform',
  space_id uuid,
  code_hash text not null unique,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  expires_at timestamptz not null default now() + interval '14 days',
  revoked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invites_purpose_is_known check (purpose in ('platform', 'class_space')),
  -- Only class-space invites name a space; spaces arrive with S1-E8, which adds the foreign key.
  constraint invites_space_only_for_class_spaces
    check ((purpose = 'class_space') = (space_id is not null)),
  constraint invites_uses_are_counted check (max_uses >= 1 and use_count between 0 and max_uses)
);

comment on table public.invites is
  'kind: user_action
Invite links and codes, stored hashed; user_id is the staff member or teacher who made it (S1-E2-01, S1-E11-17).';
comment on column public.invites.user_id is
  'Who made the invite (an admin for the March test; a teacher for class spaces later). Never who used it.';
comment on column public.invites.code_hash is
  'SHA-256 of the normalised code, in hex; the code itself is shown once and never stored.';
comment on column public.invites.note is
  'A private note for the admin ("for Ana, beta tester"): a first name or a role only (S1-E11-17).';

create trigger invites_set_updated_at
  before update on public.invites
  for each row execute function public.set_updated_at();

create trigger invites_refuse_user_id_change
  before update on public.invites
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.invites enable row level security;

/**
 * Policy invites_select_admin: owner and admin read platform invites.
 * Why: only admins make and manage invites for the March test (S1-E11-17); nobody else needs to
 * see them. Codes can't be read back by anyone, because only their hashes are stored.
 */
create policy invites_select_admin
  on public.invites
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy invites_select_admin on public.invites is
  'Allows owner and admin to read invites (never the codes, which are stored hashed) (S1-E11-17).';

-- Invites change only through functions (the sign-up trigger here, admin_* functions in S1-E11-17).
revoke insert, update, delete, truncate on public.invites from anon, authenticated;

/**
 * normalise_invite_code: the form a code is compared in.
 * Input: code as typed or pasted. Returns: upper case, letters and digits only; '' for null.
 * Why: people copy codes with spaces or dashes, and type them in lower case.
 */
create or replace function public.normalise_invite_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

comment on function public.normalise_invite_code(text) is
  'Upper case, letters and digits only: the form an invite code is hashed and compared in (S1-E2-01).';

/**
 * invite_code_hash: the hash stored for a code.
 * Input: code. Returns: SHA-256 of the normalised code, in hex.
 */
create or replace function public.invite_code_hash(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(public.normalise_invite_code(code), 'sha256'), 'hex');
$$;

comment on function public.invite_code_hash(text) is
  'SHA-256 (hex) of a normalised invite code; only the hash is ever stored (S1-E2-01).';

/**
 * check_invite: is this platform invite code still good?
 * Input: code as typed. Returns: 'valid', 'ended' (expired, revoked or used up) or 'unknown'.
 * Who may call it: anyone, signed out included: the sign-up form asks before showing the form.
 * It never returns the invite itself, who made it or how many places are left.
 * Errors: none.
 */
create or replace function public.check_invite(code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when invites.revoked_at is not null
          or invites.expires_at <= now()
          or invites.use_count >= invites.max_uses then 'ended'
        else 'valid'
      end
      from public.invites
      where invites.code_hash = public.invite_code_hash(code) and invites.purpose = 'platform'
    ),
    'unknown'
  );
$$;

comment on function public.check_invite(text) is
  'Answers valid, ended or unknown for a platform invite code; never the invite itself (S1-E2-01).';

/**
 * use_platform_invite: takes one place on a platform invite, or refuses.
 * Input: code. Returns: nothing.
 * Errors: raises check_violation when the code is unknown, expired, revoked or used up. The
 *   update counts and checks in one statement, so two people can never both take the last place.
 * Where it fits: the sign-up trigger (…_s1_e2_01_sign_up_trigger.sql), inside the transaction that
 *   creates the account, so a refused invite leaves no account behind (S1-E11-17 criterion).
 */
create or replace function public.use_platform_invite(code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invites
    set use_count = use_count + 1
    where invites.code_hash = public.invite_code_hash(code)
      and invites.purpose = 'platform'
      and invites.revoked_at is null
      and invites.expires_at > now()
      and invites.use_count < invites.max_uses;
  if not found then
    raise exception 'This invitation is not valid any more.' using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.use_platform_invite(text) is
  'Internal: takes one place on a platform invite in the sign-up transaction, or refuses (S1-E2-01).';

revoke execute on function public.use_platform_invite(text) from public, anon, authenticated;
revoke execute on function public.check_invite(text) from public;
grant execute on function public.check_invite(text) to anon, authenticated;
