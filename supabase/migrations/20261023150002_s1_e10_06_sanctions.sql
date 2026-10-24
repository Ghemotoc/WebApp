-- Migration: sanctions and what a decision does to an item (story S1-E10-06; architecture 1.6,
-- 1.7.8 the account gate, 1.7.11 the shared contract; decided 23 Oct 2026, Q3, Q7 and Q8).
--
-- What it adds:
--   sanctions              a warning, a suspension (1, 7 or 30 days), a ban or a reporting pause
--                          (30 days) on an account, with who applied it, why and when it ends
--   banned_email_hashes    a keyed hash of each banned account's email, so the address can't sign
--                          up again even after the account is deleted (Q8); the key is a Vault
--                          secret, set by hand on each environment
--   moderated_items        what staff hid or removed: is_moderated_away() reads it (1.7.11)
--   account_state()        now answers banned and suspended (architecture 1.7.8)
--   handle_new_auth_user() now refuses a banned email at sign-up
--   report_item()          now refuses a reporter whose reporting is paused
--   admin_decide_case()    now carries the decision out: warn, suspend (with the days), ban, hide
--                          or remove; restrict waits for S1-E11-08 (Q3)
--   admin_apply_sanction(), admin_lift_sanction(), admin_pause_reporting(),
--   admin_restore_item(), admin_account_sanctions(), my_sanctions(), is_moderated_away(),
--   moderated_state_of()
-- Who calls them: the case page (src/features/moderation/), the sanction notice
-- (src/features/account/), every public read policy on user content (Lane A adds the clause),
-- the sign-up trigger, and the database tests (045).
-- Legal: DSA art. 23 (measures against misuse) as good practice; a suspended person can still
-- sign in, read and download their data (the story's criterion).
-- Retention: sanctions stay with the account (the sanction history, board 8.5); the deletion job
-- (S1-E13-04) removes them with the account, except the email hash of a ban.

/* ---------- Settings (proposals, decided 23 Oct 2026, Q7) ---------- */

insert into public.settings (key, value, is_public, description) values
  ('suspension_day_choices', '[1, 7, 30]'::jsonb, false,
   'The suspension lengths a moderator may pick, in days (proposal, decided 23 Oct 2026, Q7; S1-E10-06).'),
  ('suspension_default_days', '7'::jsonb, false,
   'The suspension length when none is given (proposal; S1-E10-06).'),
  ('reporting_pause_days', '30'::jsonb, false,
   'How long a reporting pause lasts, in days (proposal, decided 23 Oct 2026, Q7; S1-E10-06).');

/* ---------- Tables ---------- */

create table public.sanctions (
  id uuid primary key default gen_random_uuid(),
  -- The account the sanction is on (the "owner" of the row; CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  kind public.sanction_kind not null,
  -- The case that led to it, when there was one.
  case_id uuid references public.cases (id),
  -- The staff member who applied it, and the note for the case log (staff only).
  applied_by_user_id uuid not null references public.profiles (id),
  note text not null,
  starts_at timestamptz not null default now(),
  -- Null for a warning (a record only) and a ban (for good).
  ends_at timestamptz,
  lifted_at timestamptz,
  lifted_by_user_id uuid references public.profiles (id),
  lift_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sanctions_note_is_written check (btrim(note) <> '' and char_length(note) <= 4000),
  constraint sanctions_timed_kinds_end check (
    (kind in ('suspension', 'reporting_pause')) = (ends_at is not null)
  ),
  constraint sanctions_lift_fields_go_together check ((lifted_at is null) = (lifted_by_user_id is null))
);

comment on table public.sanctions is
  'kind: staff
A warning, suspension, ban or reporting pause on an account: who applied it, why, when it ends and whether it was lifted (S1-E10-06; DSA art. 23).';
comment on column public.sanctions.note is 'The staff note: only staff read it; the account gets a statement of reasons (S1-E10-04).';

create index sanctions_by_account on public.sanctions (user_id, kind) where lifted_at is null;

create trigger sanctions_set_updated_at
  before update on public.sanctions
  for each row execute function public.set_updated_at();

create trigger sanctions_refuse_user_id_change
  before update on public.sanctions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.sanctions enable row level security;

/**
 * Policy sanctions_select_moderation: owner, admin and moderator (user_sanctions area) read
 * sanctions. Members never read rows: my_sanctions() gives them their own, without the note.
 */
create policy sanctions_select_moderation
  on public.sanctions
  for select
  to authenticated
  using ((select public.staff_may('user_sanctions', 'view')));

comment on policy sanctions_select_moderation on public.sanctions is
  'Allows owner, admin and moderator, in a staff session, to read sanctions; nobody else (S1-E10-06).';

create table public.banned_email_hashes (
  id uuid primary key default gen_random_uuid(),
  -- HMAC-SHA256 of the lower-cased email with the Vault secret banned_email_secret (Q8), never
  -- the email itself, so the list reveals nothing on its own.
  email_hash text not null unique,
  sanction_id uuid not null references public.sanctions (id),
  created_at timestamptz not null default now(),
  constraint banned_email_hashes_shape check (email_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.banned_email_hashes is
  'kind: platform
Keyed hashes of banned accounts'' emails, so the address can''t sign up again (S1-E10-06, Q8). No user ID: the row outlives the account.';

alter table public.banned_email_hashes enable row level security;

/**
 * Policy banned_email_hashes_select_moderation: owner, admin and moderator may read the rows (a
 * hash and a sanction ID, nothing more), for the account page's "Matches a banned email" line.
 */
create policy banned_email_hashes_select_moderation
  on public.banned_email_hashes
  for select
  to authenticated
  using ((select public.staff_may('user_sanctions', 'view')));

comment on policy banned_email_hashes_select_moderation on public.banned_email_hashes is
  'Allows owner, admin and moderator, in a staff session, to read the hashes; nobody else (S1-E10-06).';

create table public.moderated_items (
  id uuid primary key default gen_random_uuid(),
  -- The account that owns the item (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  item_type public.reportable_type not null,
  item_id uuid not null,
  state public.moderated_state not null,
  case_id uuid references public.cases (id),
  -- The staff member and the note (staff only).
  moderated_by_user_id uuid not null references public.profiles (id),
  note text not null,
  restored_at timestamptz,
  restored_by_user_id uuid references public.profiles (id),
  restore_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderated_items_note_is_written check (btrim(note) <> '' and char_length(note) <= 4000),
  constraint moderated_items_restore_fields_go_together check ((restored_at is null) = (restored_by_user_id is null))
);

comment on table public.moderated_items is
  'kind: staff
What staff hid or removed (S1-E10-06, Q3): hidden stays visible to the writer and staff, removed to staff only. Read by is_moderated_away() in every public read policy (architecture 1.7.11).';

-- One live row per item: a second hide or remove replaces nothing, it is refused.
create unique index moderated_items_one_live_per_item
  on public.moderated_items (item_type, item_id) where restored_at is null;

create trigger moderated_items_set_updated_at
  before update on public.moderated_items
  for each row execute function public.set_updated_at();

create trigger moderated_items_refuse_user_id_change
  before update on public.moderated_items
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.moderated_items enable row level security;

/** Policy moderated_items_select_moderation: moderation staff read what was hidden or removed. */
create policy moderated_items_select_moderation
  on public.moderated_items
  for select
  to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy moderated_items_select_moderation on public.moderated_items is
  'Allows owner, admin and moderator, in a staff session, to read moderated items; nobody else (S1-E10-06).';

revoke all on public.sanctions from anon, authenticated;
revoke all on public.banned_email_hashes from anon, authenticated;
revoke all on public.moderated_items from anon, authenticated;
grant select on public.sanctions to authenticated;
grant select on public.banned_email_hashes to authenticated;
grant select on public.moderated_items to authenticated;

/* ---------- The shared contract: is an item hidden or removed? ---------- */

/**
 * moderated_state_of: what staff did to an item, if anything.
 * Inputs: item_type, item_id. Returns: hidden, removed, or null when the item is untouched (or
 *   was restored). Errors: none.
 * Where it fits: screens show "[Removed by the moderation team]" for removed; the owner's own
 *   screens may show "hidden by moderation" for hidden.
 */
create or replace function public.moderated_state_of(item_type public.reportable_type, item_id uuid)
returns public.moderated_state
language sql
stable
security definer
set search_path = ''
as $$
  select moderated_items.state from public.moderated_items
  where moderated_items.item_type = moderated_state_of.item_type
    and moderated_items.item_id = moderated_state_of.item_id
    and moderated_items.restored_at is null;
$$;

comment on function public.moderated_state_of(public.reportable_type, uuid) is
  'hidden, removed or null for an item (S1-E10-06).';

/**
 * is_moderated_away: true when staff hid or removed the item (architecture 1.7.11, the shared
 * contract between lanes, decided 23 Oct 2026, Q2 and Q3).
 * Inputs: item_type, item_id. Returns: true for a live hidden or removed row.
 * Where it fits: every public read policy on user content adds
 *   `and not public.is_moderated_away('<type>', id)`; the owner's own-rows policy stays as it is,
 *   so the writer still sees a hidden item; staff policies don't call it, so staff see everything.
 */
create or replace function public.is_moderated_away(item_type public.reportable_type, item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.moderated_state_of(item_type, item_id) is not null;
$$;

comment on function public.is_moderated_away(public.reportable_type, uuid) is
  'True when staff hid or removed the item; every public read policy on user content asks it (S1-E10-06; architecture 1.7.11).';

revoke execute on function public.moderated_state_of(public.reportable_type, uuid) from public;
revoke execute on function public.is_moderated_away(public.reportable_type, uuid) from public;
grant execute on function public.moderated_state_of(public.reportable_type, uuid) to anon, authenticated;
grant execute on function public.is_moderated_away(public.reportable_type, uuid) to anon, authenticated;

/* ---------- Sanctions in the account gate ---------- */

/**
 * active_sanction: the live sanction of one kind on an account, if any.
 * Inputs: target_user_id, wanted_kind. Returns: the row, or null fields when there is none.
 * Live means: not lifted, and (for timed kinds) not yet ended.
 */
create or replace function public.active_sanction(target_user_id uuid, wanted_kind public.sanction_kind)
returns public.sanctions
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.sanctions
  where sanctions.user_id = target_user_id and sanctions.kind = wanted_kind
    and sanctions.lifted_at is null
    and (sanctions.ends_at is null or sanctions.ends_at > now())
  order by sanctions.starts_at desc
  limit 1;
$$;

comment on function public.active_sanction(uuid, public.sanction_kind) is
  'Internal: the live sanction of one kind on an account, if any (S1-E10-06).';
revoke execute on function public.active_sanction(uuid, public.sanction_kind) from public, anon, authenticated;

/**
 * account_state: why an account can or can't write (architecture 1.7.8). As in S1-E2-07a, plus:
 * a banned account answers banned and a suspended one suspended, right after the email check,
 * before anything else (S1-E10-06). A suspended person can still sign in, read and download
 * their data: only writing stops (the story's criterion).
 */
create or replace function public.account_state(target_user_id uuid)
returns public.account_status
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles;
  email_confirmed_on timestamptz;
  band public.age_band;
  adults_only boolean := public.is_feature_enabled('adults_only');
begin
  -- Step 1: no live profile, no account.
  select * into profile_row from public.profiles where profiles.id = target_user_id;
  if not found or profile_row.deleted_at is not null then
    return 'deleted';
  end if;

  -- Step 2: the email must be confirmed (S1-E2-01).
  select users.email_confirmed_at into email_confirmed_on
  from auth.users where users.id = target_user_id;
  if email_confirmed_on is null then
    return 'email_unconfirmed';
  end if;

  -- Step 3: a ban or a suspension stops every write (S1-E10-06; DSA art. 23).
  if (public.active_sanction(target_user_id, 'ban')).id is not null then
    return 'banned';
  end if;
  if (public.active_sanction(target_user_id, 'suspension')).id is not null then
    return 'suspended';
  end if;

  -- Step 4: a staff account never writes as a member; a writer account stays separate (Q14a).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    return 'staff_account';
  end if;

  -- Step 5: the age rules (S1-E2-02, S1-E2-08, S1-E2-03).
  if profile_row.age_check_result = 'failed' then
    return 'age_check_failed';
  end if;
  band := public.age_band_from_birth(
    profile_row.birth_year,
    profile_row.birth_month,
    profile_row.age_check_result,
    (now() at time zone 'Europe/Bucharest')::date
  );
  if band = 'under_13' or (adults_only and band <> '18_plus') then
    return 'minor_not_admitted';
  end if;
  if band = '13_to_15' then
    return 'awaiting_parental_consent';
  end if;
  if profile_row.age_check_result = 'pending' and not (adults_only and band = '18_plus') then
    return 'age_check_pending';
  end if;

  -- Step 6: a username, so what the person writes can be shown with a name (S1-E2-04).
  if profile_row.handle is null then
    return 'handle_missing';
  end if;

  -- Step 7: a new important version of the terms or privacy notice must be accepted (S1-E14-01).
  if public.needs_legal_acceptance(target_user_id) then
    return 'legal_acceptance_required';
  end if;

  return 'active';
end;
$$;

/**
 * my_sanctions: the signed-in person's own live sanctions, without the staff note.
 * Returns: kind, starts_at, ends_at (null for a warning or a ban). Signed out: no rows.
 * Where it fits: the sanction notice at the top of every page (src/features/account/).
 */
create or replace function public.my_sanctions()
returns table (kind public.sanction_kind, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select sanctions.kind, sanctions.starts_at, sanctions.ends_at
  from public.sanctions
  where sanctions.user_id = (select auth.uid())
    and sanctions.lifted_at is null
    and (sanctions.ends_at is null or sanctions.ends_at > now())
  order by sanctions.starts_at desc;
$$;

comment on function public.my_sanctions() is
  'The caller''s own live sanctions: kind and dates, never the staff note (S1-E10-06).';
revoke execute on function public.my_sanctions() from public, anon;
grant execute on function public.my_sanctions() to authenticated;

/* ---------- Banned emails (Q8) ---------- */

/**
 * banned_email_hash: the keyed hash of an email, with the Vault secret banned_email_secret.
 * Input: email. Returns: 64 hex characters, or null when the secret isn't set (then no email can
 *   be banned or checked, and the by-hand step in supabase/README.md is still to do).
 * Why keyed: a plain hash of an email can be guessed from a list of addresses; with a secret only
 *   the database can make the hash (decided 23 Oct 2026, Q8).
 */
create or replace function public.banned_email_hash(email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'banned_email_secret';
  if secret is null or secret = '' or coalesce(btrim(email), '') = '' then
    return null;
  end if;
  return encode(extensions.hmac(lower(btrim(email)), secret, 'sha256'), 'hex');
end;
$$;

comment on function public.banned_email_hash(text) is
  'Internal: HMAC-SHA256 of an email with the Vault secret banned_email_secret, or null without the secret (S1-E10-06, Q8).';
revoke execute on function public.banned_email_hash(text) from public, anon, authenticated;

/**
 * is_email_banned: whether an email belongs to a banned account.
 * Input: email. Returns: true when its keyed hash is on the list; false otherwise, and false when
 *   the secret isn't set (nothing can be checked then).
 */
create or replace function public.is_email_banned(email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.banned_email_hashes
    where banned_email_hashes.email_hash = public.banned_email_hash(email)
  );
$$;

comment on function public.is_email_banned(text) is 'Internal: true when the email''s keyed hash is on the banned list (S1-E10-06).';
revoke execute on function public.is_email_banned(text) from public, anon, authenticated;

/**
 * handle_new_auth_user: as in S1-E2-10, plus step 2b: a banned email can't sign up again
 * (S1-E10-06, the story's second criterion). The whole sign-up is undone, nothing is stored.
 */
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sign_up_data jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_locale text := sign_up_data ->> 'locale';
  birth_year smallint;
  birth_month smallint;
  country text;
  outcome text;
begin
  -- Step 1: the seed personas are created by supabase/seed.sql, with their own profiles.
  if coalesce((new.raw_app_meta_data ->> 'seed_persona')::boolean, false) then
    return new;
  end if;

  -- Step 2: a banned account's email can't come back (S1-E10-06; DSA art. 23).
  if public.is_email_banned(new.email) then
    raise exception 'This email address can''t be used to sign up.' using errcode = 'check_violation';
  end if;

  -- Step 3: the year (and, where needed, the month) of birth and the age rules (S1-E2-02).
  birth_year := public.sign_up_birth_year(sign_up_data);
  birth_month := public.sign_up_birth_month(sign_up_data, birth_year);
  outcome := public.sign_up_age_outcome(birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the age rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 4: the country from the signed token, and the market rules (S1-E2-10).
  country := public.verified_signup_country(sign_up_data ->> 'signup_context');
  outcome := public.sign_up_market_outcome(country, birth_year, birth_month);
  if outcome <> 'ok' then
    raise exception 'Sign-up refused by the market rules: %.', outcome using errcode = 'check_violation';
  end if;

  -- Step 5: the profile, with the language the form was in and the country.
  insert into public.profiles (id, birth_year, birth_month, locale, country_code)
  values (
    new.id,
    birth_year,
    birth_month,
    case when chosen_locale in ('ro', 'en') then chosen_locale else 'ro' end,
    country
  );

  -- Step 6: the March test is invite only (decided 17 Oct 2026, 12:44). After the profile, so the
  -- invite's audit row can name the new account (S1-E11-17); a refused invite still undoes it all.
  if public.is_feature_enabled('invite_only') then
    perform public.use_platform_invite(sign_up_data ->> 'invite_code', new.id);
  end if;

  -- Step 7: which terms and privacy notice the person accepted, and when (Q15).
  perform public.record_sign_up_consent(new.id, 'terms', sign_up_data ->> 'accepted_terms_version_id');
  perform public.record_sign_up_consent(new.id, 'privacy', sign_up_data ->> 'accepted_privacy_version_id');

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger on auth.users: checks a sign-up (banned email, age, market, invite) and creates the profile and consents, or refuses it all (S1-E2-01, S1-E2-10, S1-E11-17, S1-E10-06).';

/* ---------- Applying and lifting sanctions ---------- */

/**
 * sign_out_everywhere: ends every session of an account (decided 23 Oct 2026, Q7: a ban signs the
 * person out everywhere). A token already issued lasts until it expires, at most an hour, as with
 * Supabase's own "sign out other devices" (S1-E2-05).
 * Input: target_user_id. Returns: nothing.
 */
create or replace function public.sign_out_everywhere(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where sessions.user_id = target_user_id;
$$;

comment on function public.sign_out_everywhere(uuid) is 'Internal: ends every session of an account (S1-E10-06).';
revoke execute on function public.sign_out_everywhere(uuid) from public, anon, authenticated;

/**
 * sanction_end: when a new sanction of a kind ends.
 * Inputs: the kind; days (a suspension's length, one of suspension_day_choices; null means
 *   suspension_default_days). Returns: the end time, or null for a warning or a ban.
 * Errors: check_violation for a suspension length that isn't offered.
 */
create or replace function public.sanction_end(wanted_kind public.sanction_kind, days integer)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen_days integer := days;
  choices jsonb := coalesce(public.setting_value('suspension_day_choices'), '[1, 7, 30]'::jsonb);
begin
  if wanted_kind = 'suspension' then
    if chosen_days is null then
      chosen_days := coalesce(public.setting_value('suspension_default_days'), '7'::jsonb)::text::integer;
    end if;
    if not choices @> to_jsonb(chosen_days) then
      raise exception 'A suspension lasts 1, 7 or 30 days.' using errcode = 'check_violation';
    end if;
    return now() + make_interval(days => chosen_days);
  end if;
  if wanted_kind = 'reporting_pause' then
    return now() + make_interval(days => coalesce(public.setting_value('reporting_pause_days'), '30'::jsonb)::text::integer);
  end if;
  return null;
end;
$$;

comment on function public.sanction_end(public.sanction_kind, integer) is 'Internal: when a new sanction ends (S1-E10-06).';
revoke execute on function public.sanction_end(public.sanction_kind, integer) from public, anon, authenticated;

/**
 * admin_apply_sanction: puts a sanction on an account.
 * Inputs: target_user_id; wanted_kind; days (suspensions only: 1, 7 or 30; null for the default);
 *   source_case_id (the case it comes from, or null); note_text (required, staff only).
 * Returns: the sanction's ID.
 * Errors: insufficient_privilege unless the caller may act on user sanctions (owner, admin,
 *   moderator in a staff session); check_violation for a staff account, a blank note, a wrong
 *   length, or a live sanction of the same kind already on the account (warnings excepted).
 * What a ban does (decided 23 Oct 2026, Q7 and Q8): Supabase's own ban (auth.users.banned_until,
 *   so sign-in is refused), every session ended, and the email's keyed hash kept so the address
 *   can't sign up again. Everything is logged as sanction.applied in the same transaction.
 */
create or replace function public.admin_apply_sanction(
  target_user_id uuid,
  wanted_kind public.sanction_kind,
  days integer default null,
  source_case_id uuid default null,
  note_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_sanction public.sanctions;
  target_email text;
  hash text;
begin
  -- Step 1: may act, and never on a staff account (staff powers are removed first, S1-E2-07a).
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only moderation staff can apply a sanction.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    raise exception 'A staff account can''t be sanctioned; remove its role first.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the sanction.' using errcode = 'check_violation';
  end if;
  -- Step 2: one live sanction of a kind at a time (a warning is only a record, so any number).
  if wanted_kind <> 'warning' and (public.active_sanction(target_user_id, wanted_kind)).id is not null then
    raise exception 'This account already has a live % .', wanted_kind using errcode = 'check_violation';
  end if;
  -- Step 3: the row.
  insert into public.sanctions (user_id, kind, case_id, applied_by_user_id, note, ends_at)
  values (target_user_id, wanted_kind, source_case_id, (select auth.uid()), btrim(note_text),
          public.sanction_end(wanted_kind, days))
  returning * into new_sanction;
  -- Step 4: a ban reaches Supabase Auth, ends every session and blocks the email (Q7, Q8).
  if wanted_kind = 'ban' then
    update auth.users set banned_until = now() + interval '100 years' where users.id = target_user_id
      returning users.email into target_email;
    perform public.sign_out_everywhere(target_user_id);
    hash := public.banned_email_hash(target_email);
    if hash is not null then
      insert into public.banned_email_hashes (email_hash, sanction_id) values (hash, new_sanction.id)
        on conflict (email_hash) do nothing;
    end if;
  end if;
  -- Step 5: the audit row, in the same transaction.
  perform public.log_staff_action(
    'sanction.applied', 'sanctions', new_sanction.id::text, target_user_id, btrim(note_text),
    null,
    jsonb_build_object('kind', wanted_kind, 'ends_at', new_sanction.ends_at, 'case_id', source_case_id,
                       'email_blocked', hash is not null)
  );
  -- S1-E10-04 sends the statement of reasons for the sanction here.
  return new_sanction.id;
end;
$$;

comment on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text) is
  'Warns, suspends (1, 7 or 30 days), bans (Supabase ban, sessions ended, email blocked) or pauses reporting (30 days), logged (S1-E10-06).';

/**
 * admin_lift_sanction: ends a sanction early.
 * Inputs: target_sanction_id; reason_given (required). Returns: true.
 * Errors: insufficient_privilege unless the caller may act on user sanctions; check_violation for
 *   a blank reason or a sanction already lifted.
 * What lifting a ban does: clears Supabase's ban and removes the email's hash, so the person can
 *   sign in and the address can sign up again. Logged as sanction.lifted.
 */
create or replace function public.admin_lift_sanction(target_sanction_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sanctions;
begin
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only moderation staff can lift a sanction.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.sanctions where id = target_sanction_id for update;
  if target.id is null or target.lifted_at is not null then
    raise exception 'There is no live sanction to lift.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Say why the sanction is lifted.' using errcode = 'check_violation';
  end if;
  update public.sanctions set lifted_at = now(), lifted_by_user_id = (select auth.uid()),
    lift_reason = btrim(reason_given)
  where id = target.id;
  if target.kind = 'ban' then
    update auth.users set banned_until = null where users.id = target.user_id;
    delete from public.banned_email_hashes where sanction_id = target.id;
  end if;
  perform public.log_staff_action(
    'sanction.lifted', 'sanctions', target.id::text, target.user_id, btrim(reason_given),
    jsonb_build_object('kind', target.kind, 'ends_at', target.ends_at), jsonb_build_object('lifted', true)
  );
  return true;
end;
$$;

comment on function public.admin_lift_sanction(uuid, text) is
  'Ends a sanction early, with a reason; a lifted ban clears Supabase''s ban and the email hash (S1-E10-06).';

/**
 * admin_pause_reporting: pauses one reporter's reporting for reporting_pause_days (the story's
 * third criterion, Q83: when their reports are repeatedly unfounded).
 * Inputs: reporter_handle (a username: staff act on people by handle, architecture 1.6);
 *   source_case_id; note_text (required). Returns: the sanction's ID.
 * Errors: as admin_apply_sanction, plus check_violation for an unknown username.
 */
create or replace function public.admin_pause_reporting(
  reporter_handle text,
  source_case_id uuid default null,
  note_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid;
begin
  select id into reporter_id from public.profiles
    where profiles.handle = reporter_handle and profiles.deleted_at is null;
  if reporter_id is null then
    raise exception 'No account has the username %.', reporter_handle using errcode = 'check_violation';
  end if;
  return public.admin_apply_sanction(reporter_id, 'reporting_pause', null, source_case_id, note_text);
end;
$$;

comment on function public.admin_pause_reporting(text, uuid, text) is
  'Pauses a reporter''s reporting for reporting_pause_days, by username, logged (S1-E10-06, Q83).';

/**
 * admin_account_sanctions: an account's sanctions, for the case page and (S1-E11-02) the account
 * page's sanction history.
 * Input: target_user_id. Returns: each sanction with its dates, the staff note, who applied it,
 *   the case's reference and whether it is live now (a warning never is); newest first.
 * Errors: insufficient_privilege unless the caller may view user sanctions.
 */
create or replace function public.admin_account_sanctions(target_user_id uuid)
returns table (
  id uuid, kind public.sanction_kind, starts_at timestamptz, ends_at timestamptz, lifted_at timestamptz,
  note text, applied_by_handle text, case_reference text, is_live boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('user_sanctions', 'view') then
    raise exception 'Only moderation staff can see sanctions.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select sanctions.id, sanctions.kind, sanctions.starts_at, sanctions.ends_at, sanctions.lifted_at,
           sanctions.note, staff.handle, cases.reference,
           -- A warning is a record, never "live"; the others are live until they end or are lifted.
           sanctions.kind <> 'warning' and sanctions.lifted_at is null
             and (sanctions.ends_at is null or sanctions.ends_at > now())
    from public.sanctions
    join public.profiles as staff on staff.id = sanctions.applied_by_user_id
    left join public.cases on cases.id = sanctions.case_id
    where sanctions.user_id = target_user_id
    order by sanctions.starts_at desc;
end;
$$;

comment on function public.admin_account_sanctions(uuid) is 'An account''s sanction history, for staff (S1-E10-06).';

revoke execute on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text) from public, anon;
revoke execute on function public.admin_lift_sanction(uuid, text) from public, anon;
revoke execute on function public.admin_pause_reporting(text, uuid, text) from public, anon;
revoke execute on function public.admin_account_sanctions(uuid) from public, anon;
grant execute on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text) to authenticated;
grant execute on function public.admin_lift_sanction(uuid, text) to authenticated;
grant execute on function public.admin_pause_reporting(text, uuid, text) to authenticated;
grant execute on function public.admin_account_sanctions(uuid) to authenticated;

/* ---------- Hiding and removing an item ---------- */

/**
 * moderate_item: hides or removes an item (internal; admin_decide_case() calls it).
 * Inputs: item_type, item_id, owner_user_id, wanted_state, source_case_id, note_text.
 * Returns: the moderated_items row's ID.
 * Errors: check_violation when the item already has a live hide or remove.
 * Staff never edit a writer's words (architecture 1.8.5): removing leaves the marker
 *   "[Removed by the moderation team]" where the item was; the screens draw it from
 *   moderated_state_of().
 */
create or replace function public.moderate_item(
  item_type public.reportable_type,
  item_id uuid,
  owner_user_id uuid,
  wanted_state public.moderated_state,
  source_case_id uuid,
  note_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  if public.moderated_state_of(item_type, item_id) is not null then
    raise exception 'This item is already hidden or removed.' using errcode = 'check_violation';
  end if;
  insert into public.moderated_items (user_id, item_type, item_id, state, case_id, moderated_by_user_id, note)
  values (owner_user_id, item_type, item_id, wanted_state, source_case_id, (select auth.uid()), btrim(note_text))
  returning id into new_row_id;
  perform public.log_staff_action(
    'item.' || wanted_state::text, item_type::text, item_id::text, owner_user_id, btrim(note_text),
    null, jsonb_build_object('state', wanted_state, 'case_id', source_case_id)
  );
  return new_row_id;
end;
$$;

comment on function public.moderate_item(public.reportable_type, uuid, uuid, public.moderated_state, uuid, text) is
  'Internal: hides or removes an item for admin_decide_case(), logged as item.hidden or item.removed (S1-E10-06).';
revoke execute on function public.moderate_item(public.reportable_type, uuid, uuid, public.moderated_state, uuid, text) from public, anon, authenticated;

/**
 * admin_restore_item: brings a hidden or removed item back (every change can be restored,
 * architecture 1.8.5).
 * Inputs: target_item_id (the moderated_items row); reason_given (required). Returns: true.
 * Errors: insufficient_privilege unless the caller may act on moderation; check_violation for a
 *   blank reason or an item already restored. Logged as item.restored.
 */
create or replace function public.admin_restore_item(target_item_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.moderated_items;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderation staff can restore an item.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.moderated_items where id = target_item_id for update;
  if target.id is null or target.restored_at is not null then
    raise exception 'There is nothing to restore.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Say why the item is restored.' using errcode = 'check_violation';
  end if;
  update public.moderated_items set restored_at = now(), restored_by_user_id = (select auth.uid()),
    restore_reason = btrim(reason_given)
  where id = target.id;
  perform public.log_staff_action(
    'item.restored', target.item_type::text, target.item_id::text, target.user_id, btrim(reason_given),
    jsonb_build_object('state', target.state), jsonb_build_object('restored', true)
  );
  return true;
end;
$$;

comment on function public.admin_restore_item(uuid, text) is 'Brings a hidden or removed item back, with a reason, logged (S1-E10-06).';
revoke execute on function public.admin_restore_item(uuid, text) from public, anon;
grant execute on function public.admin_restore_item(uuid, text) to authenticated;

/* ---------- The decision carries the action out ---------- */

-- The signature grows a parameter, so the old one goes first (an overload would be ambiguous).
drop function public.admin_decide_case(uuid, public.moderation_action, text);

/**
 * admin_decide_case: as in S1-E10-03a, and now carries the decision out (S1-E10-06).
 * Inputs: target_case_id; chosen_action; note_text (required); suspension_days (1, 7 or 30 for
 *   suspend; null means suspension_default_days; ignored otherwise).
 * Returns: true. Errors: as before, plus check_violation from the sanction rules and
 *   feature_not_supported for restrict, which waits for S1-E11-08 (decided 23 Oct 2026, Q3).
 * What each action does: no_action nothing; warn a warning on the account; suspend a suspension;
 *   ban a ban (Supabase ban, sessions ended, email blocked); hide and remove a moderated_items
 *   row (hidden: the writer and staff still see it; removed: staff only, a marker for the rest).
 * Hook: S1-E10-04 sends the statement of reasons at the end, in the same transaction.
 */
create or replace function public.admin_decide_case(
  target_case_id uuid,
  chosen_action public.moderation_action,
  note_text text,
  suspension_days integer default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  -- Step 1: may act, and may see this case.
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('moderation', 'act') then
    raise exception 'You can''t decide this case.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a note is required; a decided case stays decided; restrict isn't built yet.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  if chosen_action = 'restrict' then
    raise exception 'Restricting an item comes with S1-E11-08.' using errcode = 'feature_not_supported';
  end if;
  -- Step 3: the decision, the case and its reports.
  insert into public.case_actions (case_id, user_id, action, note)
  values (target.id, (select auth.uid()), chosen_action, btrim(note_text));
  update public.cases set status = 'decided', decision = chosen_action, decided_at = now(),
    decided_by_user_id = (select auth.uid())
  where id = target.id;
  update public.reports set closed_at = now() where case_id = target.id and closed_at is null;
  -- Step 4: the audit row, in the same transaction.
  perform public.log_staff_action(
    'case.decided', 'cases', target.id::text, target.user_id, btrim(note_text),
    jsonb_build_object('status', 'open', 'tier', target.tier, 'top_reason', target.top_reason),
    jsonb_build_object('status', 'decided', 'action', chosen_action, 'suspension_days', suspension_days)
  );
  -- Step 5: carry the action out (S1-E10-06).
  if chosen_action = 'warn' then
    perform public.admin_apply_sanction(target.user_id, 'warning', null, target.id, note_text);
  elsif chosen_action = 'suspend' then
    perform public.admin_apply_sanction(target.user_id, 'suspension', suspension_days, target.id, note_text);
  elsif chosen_action = 'ban' then
    perform public.admin_apply_sanction(target.user_id, 'ban', null, target.id, note_text);
  elsif chosen_action = 'hide' then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id, 'hidden', target.id, note_text);
  elsif chosen_action = 'remove' then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id, 'removed', target.id, note_text);
  end if;
  -- S1-E10-04 sends the statement of reasons here, and tells the reporters the outcome.
  return true;
end;
$$;

comment on function public.admin_decide_case(uuid, public.moderation_action, text, integer) is
  'Saves a decision (an action, a required note and, for suspend, the days), closes the case and its reports, logs it and carries the action out (S1-E10-03a, S1-E10-06).';
revoke execute on function public.admin_decide_case(uuid, public.moderation_action, text, integer) from public, anon;
grant execute on function public.admin_decide_case(uuid, public.moderation_action, text, integer) to authenticated;

/* ---------- The reporting pause in report_item() ---------- */

/**
 * report_item: as in S1-E10-03a, plus step 1b: a reporter whose reporting is paused is refused
 * with SQLSTATE 55000 (object_not_in_prerequisite_state), which the dialog explains (S1-E10-06).
 */
create or replace function public.report_item(
  item_type public.reportable_type,
  item_reference text,
  reason public.report_reason,
  details text default null
)
returns table (report_reference text, received_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid := (select auth.uid());
  pause public.sanctions;
  item record;
  existing public.reports;
  new_report public.reports;
  hourly_limit integer := coalesce(public.setting_value('report_hourly_limit'), '20')::text::integer;
begin
  -- Step 1: signed in, whatever the account's state.
  if reporter_id is null then
    raise exception 'Log in to report something.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1b: a paused reporter waits (S1-E10-06, Q83).
  pause := public.active_sanction(reporter_id, 'reporting_pause');
  if pause.id is not null then
    raise exception 'Your reporting is paused until %.', pause.ends_at using errcode = 'object_not_in_prerequisite_state';
  end if;
  -- Step 2: the item, and whose it is; never one's own.
  select * into item from public.reportable_item_owner(item_type, item_reference);
  if item.owner_user_id = reporter_id then
    raise exception 'You can''t report your own %.', item_type using errcode = 'check_violation';
  end if;
  -- Step 3: the same report twice within a day gives the same reference.
  select * into existing from public.reports
    where reports.user_id = reporter_id and reports.item_type = report_item.item_type
      and reports.item_id = item.item_id and reports.created_at > now() - interval '24 hours'
    order by reports.created_at desc limit 1;
  if existing.id is not null then
    return query select existing.reference, existing.created_at;
    return;
  end if;
  -- Step 4: the hourly limit (proposal), so one account can't flood the queue.
  if (select count(*) from public.reports
      where reports.user_id = reporter_id and reports.created_at > now() - interval '1 hour') >= hourly_limit then
    raise exception 'Too many reports in an hour; try again later.' using errcode = 'program_limit_exceeded';
  end if;
  -- Step 5: the row, with the reporter's age group and a reference to quote.
  insert into public.reports (user_id, item_type, item_id, reported_user_id, reason, details,
                              reporter_age_band, reference)
  values (reporter_id, item_type, item.item_id, item.owner_user_id, reason, nullif(btrim(details), ''),
          public.age_band(), 'R-' || lpad(nextval('public.report_reference_seq')::text, 6, '0'))
  returning * into new_report;
  -- Step 6: the case: opened, or joined when the item already has one (S1-E10-03a).
  update public.reports set case_id = public.attach_report_to_case(new_report)
    where reports.id = new_report.id;
  return query select new_report.reference, new_report.created_at;
end;
$$;

/* ---------- The queue row carries the reported account's ID ---------- */

-- The case page needs the account's ID to list its sanctions (admin_account_sanctions()); staff
-- may see IDs (architecture 1.6). A composite type grows by one attribute; the function that fills
-- it is recreated with the same body plus the one column.
alter type public.moderation_queue_row add attribute reported_user_id uuid;

/**
 * admin_moderation_queue: as in S1-E10-03a, plus the reported account's ID (S1-E10-06).
 */
create or replace function public.admin_moderation_queue(
  tier_filter public.case_tier default null,
  status_filter public.case_status default null,
  under_18_filter boolean default null,
  source_filter public.case_source default null,
  case_id uuid default null
)
returns setof public.moderation_queue_row
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff can see the queue.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      cases.id, cases.reference, cases.source, cases.tier, cases.status, cases.item_type, cases.item_id,
      public.reportable_item_summary(cases.item_type, cases.item_id),
      reported.handle,
      public.age_band_from_birth(reported.birth_year::integer, reported.birth_month::integer, reported.age_check_result, current_date),
      cases.top_reason, cases.report_count, cases.reporter_under_18, cases.is_safeguarding,
      cases.received_at, cases.deadline_at, cases.decision, cases.decided_at, decider.handle,
      cases.user_id
    from public.cases
    join public.profiles as reported on reported.id = cases.user_id
    left join public.profiles as decider on decider.id = cases.decided_by_user_id
    where public.may_see_case(cases.is_safeguarding)
      and (admin_moderation_queue.case_id is null or cases.id = admin_moderation_queue.case_id)
      and (tier_filter is null or cases.tier = tier_filter)
      and (status_filter is null or cases.status = status_filter)
      and (under_18_filter is null or cases.reporter_under_18 = under_18_filter)
      and (source_filter is null or cases.source = source_filter)
    order by cases.status, cases.deadline_at, cases.decided_at desc;
end;
$$;
