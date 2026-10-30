/*
 * Migration: editing the safety contacts and the monthly check (story S1-E10-13, part b; split
 * decided 17 Oct 2026, 12:44; Robert's canvas comment on 7.3: "create a task for the support team
 * every month to check the numbers are up to date").
 *
 * What it adds:
 *   staff area safety_contacts      owner, admin and support edit and confirm; moderators read
 *   safety_contacts.opening_hours_ro  the opening hours in Romanian (the label is the official
 *                                   name, a proper noun, so it is the same in both languages)
 *   safety_contacts.last_checked_by_user_id  who last confirmed or changed it (criterion 6)
 *   safety_contact_checks           one row per market country per month (criterion 7); it closes
 *                                   when every contact of the country is confirmed or changed
 *   admin_save_safety_contact(), admin_remove_safety_contact(), admin_confirm_safety_contact()
 *                                   each logged with before and after values
 *   create_monthly_safety_checks()  pg_cron at 06:00 on the 1st of each month
 *   admin_safety_contact_checks()   the checks, open ones first
 *   admin_safety_contact_warnings() contacts not confirmed for 45 days (criterion 8, proposal)
 * Decision (rule 8): until the support tickets exist (S1-E11-13, ADMIN-2), the monthly check is a
 * check row on Staff › Safety contacts, not a ticket; that story links the two.
 * Rules (the story's legal note): numbers are safety-critical, so a saved contact always records
 * who checked it and when, and a link must be https.
 */

insert into public.staff_role_areas (area, role, access, required_permission) values
  ('safety_contacts', 'owner', 'act', null), ('safety_contacts', 'admin', 'act', null),
  ('safety_contacts', 'support', 'act', null), ('safety_contacts', 'moderator', 'view', null)
on conflict (role, area) do nothing;

insert into public.settings (key, value, is_public, description) values
  ('safety_contact_warning_days', '45'::jsonb, false,
   'After how many days without a check a safety contact shows a warning to the owner (S1-E10-13b; proposal).')
on conflict (key) do nothing;

alter table public.safety_contacts
  add column opening_hours_ro text,
  add column last_checked_by_user_id uuid references public.profiles (id) on delete set null,
  add constraint safety_contacts_link_is_https check (link is null or link ~ '^https://');

comment on column public.safety_contacts.opening_hours_ro is
  'The opening hours in Romanian; the block falls back to opening_hours (S1-E10-13b).';
comment on column public.safety_contacts.last_checked_by_user_id is
  'The staff member who last confirmed or changed the contact (S1-E10-13b criterion 6).';

/* ---------- The monthly checks ---------- */

create table public.safety_contact_checks (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  -- The first day of the month the check is for.
  check_month date not null,
  closed_at timestamptz,
  closed_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_contact_checks_one_per_country_and_month unique (country_code, check_month),
  constraint safety_contact_checks_country_code_is_iso check (country_code ~ '^[A-Z]{2}$'),
  constraint safety_contact_checks_month_starts_on_the_first check (extract(day from check_month) = 1)
);

comment on table public.safety_contact_checks is
  'kind: platform
The monthly check of each market''s safety contacts: open until every contact is confirmed or changed (S1-E10-13b).';

create trigger safety_contact_checks_set_updated_at
  before update on public.safety_contact_checks
  for each row execute function public.set_updated_at();

alter table public.safety_contact_checks enable row level security;

/**
 * safety_contact_checks_select_staff: staff with the safety contacts area read the checks, so the
 * support team sees what is due (criterion 7).
 */
create policy safety_contact_checks_select_staff
  on public.safety_contact_checks for select to authenticated
  using ((select public.staff_may('safety_contacts', 'view')));

comment on policy safety_contact_checks_select_staff on public.safety_contact_checks is
  'Allows owner, admin, support and moderators to read the monthly safety contact checks (S1-E10-13b).';

grant select on public.safety_contact_checks to authenticated;

/**
 * create_monthly_safety_checks: opens this month's check for every market country (criterion 7).
 * Returns: how many checks it opened (none when they already exist, so running it twice is safe).
 * Called by pg_cron at 06:00 on the 1st of each month; a test may call it directly.
 */
create or replace function public.create_monthly_safety_checks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  opened integer;
begin
  insert into public.safety_contact_checks (country_code, check_month)
  select markets.country_code, date_trunc('month', now() at time zone 'Europe/Bucharest')::date
  from public.markets
  on conflict (country_code, check_month) do nothing;
  get diagnostics opened = row_count;
  return opened;
end;
$$;

comment on function public.create_monthly_safety_checks() is
  'Opens this month''s safety contact check for every market country; safe to run twice (S1-E10-13b).';
revoke execute on function public.create_monthly_safety_checks() from public, anon, authenticated;

select cron.schedule('monthly-safety-contact-checks', '0 6 1 * *', 'select public.create_monthly_safety_checks()');

/**
 * close_finished_safety_checks: closes a country's open checks once every one of its contacts was
 * confirmed or changed since the check opened. Input: the country. Internal: the save and confirm
 * functions.
 */
create or replace function public.close_finished_safety_checks(target_country text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.safety_contact_checks set closed_at = now(), closed_by_user_id = (select auth.uid())
  where safety_contact_checks.country_code = target_country and safety_contact_checks.closed_at is null
    and not exists (
      select 1 from public.safety_contacts
      where safety_contacts.country_code = target_country
        and safety_contacts.last_checked_on < safety_contact_checks.created_at::date);
$$;

comment on function public.close_finished_safety_checks(text) is
  'Internal: closes a country''s open checks once every contact is confirmed or changed (S1-E10-13b).';
revoke execute on function public.close_finished_safety_checks(text) from public, anon, authenticated;

/* ---------- Editing ---------- */

/**
 * require_safety_contacts_staff: refuses anyone who may not edit safety contacts. Internal.
 * Errors: insufficient_privilege.
 */
create or replace function public.require_safety_contacts_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('safety_contacts', 'act') then
    raise exception 'Only staff who look after the safety contacts can change them.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_safety_contacts_staff() is 'Internal: refuses anyone who may not edit safety contacts (S1-E10-13b).';
revoke execute on function public.require_safety_contacts_staff() from public, anon, authenticated;

/**
 * safety_contact_values: the logged values of a contact (before or after a change). Internal.
 */
create or replace function public.safety_contact_values(target public.safety_contacts)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when target.id is null then null else jsonb_build_object(
    'country_code', target.country_code, 'kind', target.kind, 'position', target.position,
    'label', target.label, 'phone_number', target.phone_number, 'link', target.link,
    'opening_hours', target.opening_hours, 'opening_hours_ro', target.opening_hours_ro,
    'note', target.note, 'confidence', target.confidence, 'last_checked_on', target.last_checked_on) end;
$$;

comment on function public.safety_contact_values(public.safety_contacts) is 'Internal: a safety contact''s values for the audit log (S1-E10-13b).';
revoke execute on function public.safety_contact_values(public.safety_contacts) from public, anon, authenticated;

/**
 * admin_save_safety_contact: adds a contact or changes one (criterion 6). Saving counts as a check:
 *   the contact is marked checked today by the caller.
 * Input: contact JSON {id (to change one; absent to add), country_code, kind, position, label,
 *   phone_number, link (https), opening_hours, opening_hours_ro, note, confidence (High, Medium,
 *   Low)}. Returns: the contact's ID.
 * Errors: insufficient_privilege (require_safety_contacts_staff()); no_data_found for an unknown ID;
 *   check_violation from the table's rules (a number or a link, https, a two-letter country).
 * Logged as safety_contact.saved with before and after values.
 */
create or replace function public.admin_save_safety_contact(contact jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.safety_contacts;
  after_row public.safety_contacts;
begin
  perform public.require_safety_contacts_staff();
  -- Step 1: the row being changed, if any.
  if contact ? 'id' then
    select * into before_row from public.safety_contacts where id = (contact ->> 'id')::uuid for update;
    if before_row.id is null then
      raise exception 'There is no such contact.' using errcode = 'no_data_found';
    end if;
  end if;
  -- Step 2: insert or update with the same values; the table's constraints check them.
  insert into public.safety_contacts as saved (id, country_code, kind, position, label, phone_number, link,
    opening_hours, opening_hours_ro, note, confidence, last_checked_on, checked_by, last_checked_by_user_id)
  values (coalesce(before_row.id, gen_random_uuid()), upper(btrim(contact ->> 'country_code')),
    (contact ->> 'kind')::public.safety_contact_kind, coalesce((contact ->> 'position')::integer, 1),
    btrim(contact ->> 'label'), nullif(btrim(contact ->> 'phone_number'), ''), nullif(btrim(contact ->> 'link'), ''),
    nullif(btrim(contact ->> 'opening_hours'), ''), nullif(btrim(contact ->> 'opening_hours_ro'), ''),
    nullif(btrim(contact ->> 'note'), ''), coalesce(nullif(btrim(contact ->> 'confidence'), ''), 'High'),
    current_date, coalesce((select profiles.handle from public.profiles where profiles.id = (select auth.uid())), 'staff'),
    (select auth.uid()))
  on conflict (id) do update set country_code = excluded.country_code, kind = excluded.kind,
    position = excluded.position, label = excluded.label, phone_number = excluded.phone_number,
    link = excluded.link, opening_hours = excluded.opening_hours, opening_hours_ro = excluded.opening_hours_ro,
    note = excluded.note, confidence = excluded.confidence, last_checked_on = excluded.last_checked_on,
    checked_by = excluded.checked_by, last_checked_by_user_id = excluded.last_checked_by_user_id
  returning * into after_row;
  -- Step 3: the log, and a finished monthly check closes.
  perform public.log_staff_action('safety_contact.saved', 'safety_contacts', after_row.id::text, null, null,
    public.safety_contact_values(before_row), public.safety_contact_values(after_row));
  perform public.close_finished_safety_checks(after_row.country_code);
  return after_row.id;
end;
$$;

comment on function public.admin_save_safety_contact(jsonb) is
  'Adds or changes a safety contact, marking it checked today by the caller; logged (S1-E10-13b).';
revoke execute on function public.admin_save_safety_contact(jsonb) from public, anon;
grant execute on function public.admin_save_safety_contact(jsonb) to authenticated;

/**
 * admin_confirm_safety_contact: records that staff checked a contact against its official source
 * and it is still right (criterion 7). Input: target_contact_id. Returns: true.
 * Errors: insufficient_privilege; no_data_found for an unknown ID. Logged as safety_contact.confirmed.
 */
create or replace function public.admin_confirm_safety_contact(target_contact_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.safety_contacts;
begin
  perform public.require_safety_contacts_staff();
  update public.safety_contacts set last_checked_on = current_date,
    checked_by = coalesce((select profiles.handle from public.profiles where profiles.id = (select auth.uid())), 'staff'),
    last_checked_by_user_id = (select auth.uid())
  where id = target_contact_id
  returning * into target;
  if target.id is null then
    raise exception 'There is no such contact.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('safety_contact.confirmed', 'safety_contacts', target.id::text, null, null,
    null, jsonb_build_object('last_checked_on', target.last_checked_on));
  perform public.close_finished_safety_checks(target.country_code);
  return true;
end;
$$;

comment on function public.admin_confirm_safety_contact(uuid) is
  'Records that a safety contact was checked and is still right; logged (S1-E10-13b).';
revoke execute on function public.admin_confirm_safety_contact(uuid) from public, anon;
grant execute on function public.admin_confirm_safety_contact(uuid) to authenticated;

/**
 * admin_remove_safety_contact: removes a contact that no longer exists (a closed helpline).
 * Inputs: target_contact_id; reason_given (required). Returns: true.
 * Errors: insufficient_privilege; check_violation for a blank reason; no_data_found for an unknown
 *   ID. Logged as safety_contact.removed with the values it had.
 */
create or replace function public.admin_remove_safety_contact(target_contact_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.safety_contacts;
begin
  perform public.require_safety_contacts_staff();
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Say why the contact is removed.' using errcode = 'check_violation';
  end if;
  delete from public.safety_contacts where id = target_contact_id returning * into target;
  if target.id is null then
    raise exception 'There is no such contact.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('safety_contact.removed', 'safety_contacts', target.id::text, null,
    btrim(reason_given), public.safety_contact_values(target), null);
  perform public.close_finished_safety_checks(target.country_code);
  return true;
end;
$$;

comment on function public.admin_remove_safety_contact(uuid, text) is
  'Removes a safety contact that no longer exists, with a reason; logged (S1-E10-13b).';
revoke execute on function public.admin_remove_safety_contact(uuid, text) from public, anon;
grant execute on function public.admin_remove_safety_contact(uuid, text) to authenticated;

/* ---------- What staff read ---------- */

/**
 * admin_safety_contact_checks: the monthly checks, open ones first, then the last 12 closed.
 * Returns: country_code, check_month, how many contacts the country has, how many are still to
 *   confirm this month, closed_at and who closed it.
 * Errors: insufficient_privilege unless the caller may view the safety contacts area.
 */
create or replace function public.admin_safety_contact_checks()
returns table (
  country_code text, check_month date, contact_count integer, still_to_confirm integer,
  closed_at timestamptz, closed_by_handle text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('safety_contacts', 'view') then
    raise exception 'Only staff can see the safety contact checks.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select checks.country_code, checks.check_month,
      (select count(*)::integer from public.safety_contacts where safety_contacts.country_code = checks.country_code),
      (select count(*)::integer from public.safety_contacts where safety_contacts.country_code = checks.country_code
         and safety_contacts.last_checked_on < checks.created_at::date),
      checks.closed_at, closer.handle
    from public.safety_contact_checks as checks
    left join public.profiles as closer on closer.id = checks.closed_by_user_id
    where checks.closed_at is null or checks.closed_at > now() - interval '12 months'
    order by (checks.closed_at is not null), checks.check_month desc, checks.country_code;
end;
$$;

comment on function public.admin_safety_contact_checks() is
  'The monthly safety contact checks, open ones first (S1-E10-13b).';
revoke execute on function public.admin_safety_contact_checks() from public, anon;
grant execute on function public.admin_safety_contact_checks() to authenticated;

/**
 * admin_safety_contact_warnings: contacts not confirmed for safety_contact_warning_days (45), so the
 * owner sees a warning in the admin site until they are checked (criterion 8).
 * Returns: id, country_code, label, last_checked_on, days_since. Errors: insufficient_privilege
 *   unless the caller may view the safety contacts area.
 */
create or replace function public.admin_safety_contact_warnings()
returns table (id uuid, country_code text, label text, last_checked_on date, days_since integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  warning_days integer := coalesce((public.setting_value('safety_contact_warning_days'))::text::integer, 45);
begin
  if not public.staff_may('safety_contacts', 'view') then
    raise exception 'Only staff can see the safety contact warnings.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select safety_contacts.id, safety_contacts.country_code, safety_contacts.label, safety_contacts.last_checked_on,
      (current_date - safety_contacts.last_checked_on)::integer
    from public.safety_contacts
    where safety_contacts.last_checked_on < current_date - warning_days
    order by safety_contacts.last_checked_on, safety_contacts.country_code;
end;
$$;

comment on function public.admin_safety_contact_warnings() is
  'Safety contacts not confirmed for 45 days, for the owner''s warning (S1-E10-13b).';
revoke execute on function public.admin_safety_contact_warnings() from public, anon;
grant execute on function public.admin_safety_contact_warnings() to authenticated;

/* ---------- The admin menu's access, per person ---------- */

/**
 * my_staff_areas: as in S1-E11-01, but the access is now the caller's own: "act" when one of the
 * caller's roles may act there, "view" otherwise. Before, the highest access of any role was
 * returned, so support saw "view" for an area its own role may act on (found while adding the
 * safety contacts area, S1-E10-13b).
 * Returns: one row per area the caller may use; empty outside a staff session.
 */
create or replace function public.my_staff_areas()
returns table (area text, access text)
language sql
stable
security definer
set search_path = ''
as $$
  select areas.area, case when public.staff_may(areas.area, 'act') then 'act' else 'view' end
  from (select distinct staff_role_areas.area from public.staff_role_areas) as areas
  where public.staff_may(areas.area, 'view')
  order by areas.area;
$$;
