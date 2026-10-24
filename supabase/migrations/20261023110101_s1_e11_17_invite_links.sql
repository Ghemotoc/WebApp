-- Invite links made by admins (story S1-E11-17; decided 17 Oct 2026, 13:01: the same mechanism
-- class spaces will use, one shared invites table from S1-E2-01).
--
-- What it adds:
--   the 'invites' admin area           owner and admin act (architecture 1.8.3); the invites read
--                                      policy moves onto it
--   generate_invite_code()             a random 12-character code, internal
--   admin_create_invite()              makes a link: how many it admits, when it expires, a private
--                                      note; returns the code once (only its hash is stored)
--   admin_revoke_invite()              ends a link early, with a reason
--   admin_list_invites()               the list: note, uses, expiry, status, who made it; never who
--                                      used it
--   use_platform_invite()              as before (one conditional UPDATE, so two people can't both
--                                      take the last place), now also writing invite.used_up to
--                                      the audit log when the last place goes
-- Every make, revoke and used-up goes to the audit log (the story's criterion). The private note
-- goes into the audit row's values (decided 23 Oct 2026, Q12), so it is kept to a first name or a
-- role; an "@" in it is refused, because an email address never belongs on an invite.
-- Retention: the note is deleted with the invite 90 days after expiry (proposal, S1-E13-04).

/* ---------- The admin area ---------- */

insert into public.staff_role_areas (area, role, access, required_permission) values
  ('invites', 'owner', 'act', null), ('invites', 'admin', 'act', null);

alter policy invites_select_admin on public.invites
  using ((select public.staff_may('invites', 'view')));
comment on policy invites_select_admin on public.invites is
  'Allows owner and admin, in a staff session, to read invites (never the codes, stored hashed) (S1-E11-17).';

/* ---------- Making a code ---------- */

/**
 * generate_invite_code: a new random code.
 * Returns: 12 characters from an alphabet without look-alikes (no 0, O, 1, I), in three groups of
 *   four, for example "K7PQ-M3XW-R9TV". Each byte picks one of the 32 letters evenly (256 is a
 *   multiple of 32), so no letter is more likely than another.
 * Internal: admin_create_invite() calls it; the code is hashed before it is stored.
 */
create or replace function public.generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  with letters as (
    select get_byte(extensions.gen_random_bytes(12), position - 1) % 32 as index, position
    from generate_series(1, 12) as position
  ),
  code as (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', index + 1, 1), '' order by position) as text
    from letters
  )
  select substr(text, 1, 4) || '-' || substr(text, 5, 4) || '-' || substr(text, 9, 4) from code;
$$;

comment on function public.generate_invite_code() is
  'Internal: a random 12-character invite code without look-alike letters (S1-E11-17).';
revoke execute on function public.generate_invite_code() from public, anon, authenticated;

/* ---------- Admin functions ---------- */

/**
 * admin_create_invite: makes a platform invite link.
 * Inputs: admits (how many people may sign up with it, 1 to 50, default 1); valid_days (1 to 90,
 *   default 14); private_note (optional, at most 80 characters, no "@": a first name or a role,
 *   never an email).
 * Returns: the invite's ID, the code (shown once: only its hash is stored) and when it expires.
 * Errors: insufficient_privilege unless the caller may act on invites (owner and admin, in a staff
 *   session); check_violation for a number out of range or a note with an "@" or too long.
 * Where it fits: /staff/invites → useInviteLinks → api/inviteLinks.ts → here; the link the screen
 *   shows is <site address from the brand config>/join/<code>, which opens sign-up (S1-E2-01).
 *   Logged as invite.created with the admits, the expiry and the note.
 */
create or replace function public.admin_create_invite(
  admits integer default 1,
  valid_days integer default 14,
  private_note text default null
)
returns table (invite_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
  new_invite public.invites;
  trimmed_note text := nullif(btrim(coalesce(private_note, '')), '');
begin
  -- Step 1: only owner and admin, in a staff session.
  if not public.staff_may('invites', 'act') then
    raise exception 'Only an owner or admin can make invite links.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the limits (decided 23 Oct 2026, Q12).
  if admits is null or admits not between 1 and 50 then
    raise exception 'A link admits between 1 and 50 people.' using errcode = 'check_violation';
  end if;
  if valid_days is null or valid_days not between 1 and 90 then
    raise exception 'A link lasts between 1 and 90 days.' using errcode = 'check_violation';
  end if;
  if trimmed_note is not null and (char_length(trimmed_note) > 80 or trimmed_note like '%@%') then
    raise exception 'The note is at most 80 characters and never an email address.'
      using errcode = 'check_violation';
  end if;
  -- Step 3: a fresh code, stored only as its hash.
  new_code := public.generate_invite_code();
  insert into public.invites (user_id, purpose, code_hash, max_uses, expires_at, note)
  values (
    (select auth.uid()), 'platform', public.invite_code_hash(new_code), admits,
    now() + make_interval(days => valid_days), trimmed_note
  )
  returning * into new_invite;
  -- Step 4: the audit row, in the same transaction.
  perform public.log_staff_action(
    'invite.created', 'invites', new_invite.id::text, null, null, null,
    jsonb_build_object('admits', admits, 'expires_at', new_invite.expires_at, 'note', trimmed_note)
  );
  return query select new_invite.id, new_code, new_invite.expires_at;
end;
$$;

comment on function public.admin_create_invite(integer, integer, text) is
  'Makes a platform invite link (owner and admin); returns the code once; logged as invite.created (S1-E11-17).';

/**
 * admin_revoke_invite: ends a platform invite link early.
 * Inputs: target_invite_id; reason_given (required). Returns: true when revoked now, false when
 *   it was already revoked (nothing changes, nothing is logged).
 * Errors: insufficient_privilege unless the caller may act on invites; check_violation for a blank
 *   reason or an invite that doesn't exist. Logged as invite.revoked with the reason.
 */
create or replace function public.admin_revoke_invite(target_invite_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.invites;
begin
  if not public.staff_may('invites', 'act') then
    raise exception 'Only an owner or admin can revoke invite links.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Give a reason.' using errcode = 'check_violation';
  end if;
  select * into target from public.invites
    where invites.id = target_invite_id and invites.purpose = 'platform';
  if target.id is null then
    raise exception 'There is no such invite link.' using errcode = 'check_violation';
  end if;
  if target.revoked_at is not null then
    return false;
  end if;
  update public.invites set revoked_at = now() where invites.id = target_invite_id;
  perform public.log_staff_action(
    'invite.revoked', 'invites', target.id::text, null, reason_given,
    jsonb_build_object('revoked_at', null, 'note', target.note),
    jsonb_build_object('revoked_at', now(), 'note', target.note)
  );
  return true;
end;
$$;

comment on function public.admin_revoke_invite(uuid, text) is
  'Revokes a platform invite link with a reason (owner and admin); logged as invite.revoked (S1-E11-17).';

/**
 * admin_list_invites: every platform invite link, newest first.
 * Returns: one row per invite: ID, note, how many it admits, how many used it, when it expires,
 *   when it was revoked, its status (active, used_up, expired, revoked) and the username of the
 *   staff member who made it. Never who used it: an invite doesn't record that.
 * Errors: insufficient_privilege unless the caller may view invites (owner and admin).
 */
create or replace function public.admin_list_invites()
returns table (
  id uuid,
  note text,
  max_uses integer,
  use_count integer,
  expires_at timestamptz,
  revoked_at timestamptz,
  status text,
  made_by_handle text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('invites', 'view') then
    raise exception 'Only an owner or admin can see invite links.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      invites.id,
      invites.note,
      invites.max_uses,
      invites.use_count,
      invites.expires_at,
      invites.revoked_at,
      case
        when invites.revoked_at is not null then 'revoked'
        when invites.use_count >= invites.max_uses then 'used_up'
        when invites.expires_at <= now() then 'expired'
        else 'active'
      end,
      maker.handle,
      invites.created_at
    from public.invites
    join public.profiles as maker on maker.id = invites.user_id
    where invites.purpose = 'platform'
    order by invites.created_at desc;
end;
$$;

comment on function public.admin_list_invites() is
  'Every platform invite link with its status and maker, never who used it (owner and admin; S1-E11-17).';

revoke execute on function public.admin_create_invite(integer, integer, text) from public, anon;
revoke execute on function public.admin_revoke_invite(uuid, text) from public, anon;
revoke execute on function public.admin_list_invites() from public, anon;
grant execute on function public.admin_create_invite(integer, integer, text) to authenticated;
grant execute on function public.admin_revoke_invite(uuid, text) to authenticated;
grant execute on function public.admin_list_invites() to authenticated;

/* ---------- Using the last place ---------- */

/**
 * use_platform_invite: takes one place on a platform invite, or refuses (S1-E2-01), now also
 *   writing invite.used_up to the audit log when the last place goes (S1-E11-17).
 * Input: code. Returns: nothing.
 * Errors: raises check_violation when the code is unknown, expired, revoked or used up. The
 *   update counts and checks in one statement, so two people can never both take the last place.
 * The audit row is written on behalf of the invite's maker (the only account the invite names):
 *   an invite never records who used it, so the new account is deliberately not named.
 * Where it fits: the sign-up trigger, inside the transaction that creates the account, so a
 *   refused invite leaves no account behind.
 */
create or replace function public.use_platform_invite(code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  used public.invites;
begin
  update public.invites
    set use_count = use_count + 1
    where invites.code_hash = public.invite_code_hash(code)
      and invites.purpose = 'platform'
      and invites.revoked_at is null
      and invites.expires_at > now()
      and invites.use_count < invites.max_uses
    returning * into used;
  if used.id is null then
    raise exception 'This invitation is not valid any more.' using errcode = 'check_violation';
  end if;
  -- The last place: say so in the audit log, as the invite's maker, without naming the new account.
  if used.use_count >= used.max_uses then
    insert into public.audit_log (user_id, action, target_type, target_id, reason, after_values)
    values (
      used.user_id, 'invite.used_up', 'invites', used.id::text,
      'Automatic: the last place was taken at sign-up.',
      jsonb_build_object('admits', used.max_uses, 'note', used.note)
    );
  end if;
end;
$$;

comment on function public.use_platform_invite(text) is
  'Internal: takes one place on a platform invite in the sign-up transaction, or refuses; logs invite.used_up (S1-E2-01, S1-E11-17).';
