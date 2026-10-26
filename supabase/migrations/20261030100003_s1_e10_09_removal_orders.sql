-- Migration: acting on terrorist content removal orders within one hour (story S1-E10-09;
-- Regulation (EU) 2021/784 (TCO): remove within one hour of receiving an order, art. 3(3);
-- preserve what was removed for six months, art. 6; tell the uploader unless the order says
-- not to, art. 11; decided 16 Oct 2026, late evening: the founding team rotates on call).
--
-- What it adds:
--   on_call_rota                     who is on call when: shifts never overlap, and only people
--                                    holding the on-call permission take one (criterion 2)
--   on_call_alerts (more columns)    the alert names who was on call, when it went out, who
--                                    acknowledged it and when it was escalated. The phone call
--                                    itself is still a logging stub (docs/mocks.md)
--   escalate_on_call_alerts()        every minute (pg_cron): an alert nobody acknowledged within
--                                    on_call_escalation_minutes (15, proposal) is escalated to
--                                    the rest of the founding team (a logging stub too)
--   cases.disabled_at, preserve_until  set when an order's item comes down; the purge keeps the
--                                    item for six months (content_is_held_for_moderation())
--   admin_emergency_disable()        "Emergency disable": the item is removed everywhere in one
--                                    action, the case decided, the uploader told unless the
--                                    order forbids it, every timestamp logged (criteria 3 to 5)
--   admin_order_timeline()           the order's times, for the case page and as proof
-- Who calls it: the on-call rota page (/staff/on-call), the moderation queue (acknowledge) and
-- the case page's removal-order panel (src/features/moderation/).

/* ---------- Settings ---------- */

insert into public.settings (key, value, description) values
  ('on_call_escalation_minutes', '15'::jsonb,
   'Minutes before an unacknowledged removal-order alert goes to the rest of the founding team (proposal; S1-E10-09).'),
  ('removal_order_preserve_months', '6'::jsonb,
   'Months an item removed on an authority order is preserved (Regulation (EU) 2021/784 art. 6; canvas 8.4; S1-E10-09).')
on conflict (key) do nothing;

/* ---------- The on-call rota ---------- */

-- The rota page's area (architecture 1.8.3 gives the rota to the people who grant the on-call
-- permission): owners and admins set it, moderators and support read it, so anyone on the queue
-- knows who to call.
insert into public.staff_role_areas (area, role, access, required_permission) values
  ('on_call_rota', 'owner', 'act', null), ('on_call_rota', 'admin', 'act', null),
  ('on_call_rota', 'moderator', 'view', null), ('on_call_rota', 'support', 'view', null)
on conflict (role, area) do nothing;

create table public.on_call_rota (
  id uuid primary key default gen_random_uuid(),
  -- The person on call for this shift (the "owner" of the row; CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- The owner or admin who set it.
  created_by_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint on_call_rota_ends_after_start check (ends_at > starts_at),
  -- Exactly one person on call at any time (criterion 2): shifts never overlap.
  constraint on_call_rota_no_overlap exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
);

comment on table public.on_call_rota is
  'kind: staff
Who in the founding team is on call for removal orders, shift by shift; shifts never overlap (S1-E10-09; Regulation (EU) 2021/784).';

create trigger on_call_rota_set_updated_at
  before update on public.on_call_rota
  for each row execute function public.set_updated_at();
create trigger on_call_rota_refuse_user_id_change
  before update on public.on_call_rota
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.on_call_rota enable row level security;

/**
 * on_call_rota_select_staff: every staff member reads the rota, so anyone on the queue knows
 * who to call. Members never see it. Changes go only through admin_set_on_call_shift() and
 * admin_remove_on_call_shift().
 */
create policy on_call_rota_select_staff
  on public.on_call_rota for select to authenticated
  using ((select public.staff_may('on_call_rota', 'view')));

grant select on public.on_call_rota to authenticated;

/**
 * on_call_now: who is on call at a moment (now by default), or null when nobody is.
 * Internal: the alert trigger and admin_on_call_rota().
 */
create or replace function public.on_call_now(at_time timestamptz default now())
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select on_call_rota.user_id from public.on_call_rota
  where on_call_rota.starts_at <= at_time and on_call_rota.ends_at > at_time
  limit 1;
$$;

comment on function public.on_call_now(timestamptz) is 'Internal: who is on call at a moment, or null (S1-E10-09).';
revoke execute on function public.on_call_now(timestamptz) from public, anon, authenticated;

/**
 * admin_set_on_call_shift: an owner or admin puts someone on call for a shift.
 * Inputs: on_call_user_id (must hold the on-call permission); shift_starts_at, shift_ends_at;
 *   reason_given (required). Returns: the shift's ID.
 * Errors: insufficient_privilege unless the caller may act on the rota (owner, admin);
 *   check_violation for a person without the on-call permission, an end before the start, a
 *   shift that has already ended or a blank reason; exclusion_violation when it overlaps
 *   another shift. Logged as on_call.shift_set.
 */
create or replace function public.admin_set_on_call_shift(
  on_call_user_id uuid,
  shift_starts_at timestamptz,
  shift_ends_at timestamptz,
  reason_given text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_shift_id uuid;
begin
  -- Step 1: only owners and admins set the rota (architecture 1.8.3: they grant the permission).
  if not public.staff_may('on_call_rota', 'act') then
    raise exception 'Only an owner or admin can set the on-call rota.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the person holds the on-call permission, the shift makes sense, a reason is given.
  if not exists (select 1 from public.staff_permissions
                 where staff_permissions.user_id = on_call_user_id and staff_permissions.permission = 'on_call') then
    raise exception 'This person doesn''t hold the on-call permission.' using errcode = 'check_violation';
  end if;
  if shift_ends_at is null or shift_starts_at is null or shift_ends_at <= shift_starts_at or shift_ends_at <= now() then
    raise exception 'The shift must end after it starts, and in the future.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason.' using errcode = 'check_violation';
  end if;
  -- Step 3: the shift (the table refuses an overlap) and the audit row.
  insert into public.on_call_rota (user_id, starts_at, ends_at, created_by_user_id)
  values (on_call_user_id, shift_starts_at, shift_ends_at, (select auth.uid()))
  returning id into new_shift_id;
  perform public.log_staff_action('on_call.shift_set', 'on_call_rota', new_shift_id::text, on_call_user_id,
    btrim(reason_given), null, jsonb_build_object('starts_at', shift_starts_at, 'ends_at', shift_ends_at));
  return new_shift_id;
end;
$$;

comment on function public.admin_set_on_call_shift(uuid, timestamptz, timestamptz, text) is
  'Owners and admins put someone with the on-call permission on call; no overlaps; logged (S1-E10-09).';
revoke execute on function public.admin_set_on_call_shift(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_set_on_call_shift(uuid, timestamptz, timestamptz, text) to authenticated;

/**
 * admin_remove_on_call_shift: an owner or admin removes a shift that hasn't ended.
 * Inputs: shift_id; reason_given (required). Returns: true.
 * Errors: insufficient_privilege as above; check_violation for a blank reason or a shift that
 *   has ended (past shifts are the record of who was on call). Logged as on_call.shift_removed.
 */
create or replace function public.admin_remove_on_call_shift(shift_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  shift public.on_call_rota;
begin
  if not public.staff_may('on_call_rota', 'act') then
    raise exception 'Only an owner or admin can change the on-call rota.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason.' using errcode = 'check_violation';
  end if;
  select * into shift from public.on_call_rota where on_call_rota.id = shift_id for update;
  if shift.id is null or shift.ends_at <= now() then
    raise exception 'Only a shift that hasn''t ended can be removed.' using errcode = 'check_violation';
  end if;
  delete from public.on_call_rota where on_call_rota.id = shift.id;
  perform public.log_staff_action('on_call.shift_removed', 'on_call_rota', shift.id::text, shift.user_id,
    btrim(reason_given), jsonb_build_object('starts_at', shift.starts_at, 'ends_at', shift.ends_at), null);
  return true;
end;
$$;

comment on function public.admin_remove_on_call_shift(uuid, text) is
  'Owners and admins remove a shift that hasn''t ended; logged (S1-E10-09).';
revoke execute on function public.admin_remove_on_call_shift(uuid, text) from public, anon;
grant execute on function public.admin_remove_on_call_shift(uuid, text) to authenticated;

/**
 * admin_on_call_rota: the rota page: the shifts that haven't ended, the gaps nobody covers in the
 * next 14 days, and the people who may take a shift.
 * Returns: JSON {can_edit, on_call_now {handle}, shifts: [{id, handle, starts_at, ends_at,
 *   is_now}], gaps: [{starts_at, ends_at}], people: [{user_id, handle}]}. Staff see user IDs in
 *   the admin site (architecture 1.6).
 * Errors: insufficient_privilege for anyone outside the rota's area (every staff role).
 */
create or replace function public.admin_on_call_rota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  window_end timestamptz := now() + interval '14 days';
begin
  if not public.staff_may('on_call_rota', 'view') then
    raise exception 'Only staff see the on-call rota.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'can_edit', public.staff_may('on_call_rota', 'act'),
    'on_call_now', (select jsonb_build_object('handle', profiles.handle) from public.profiles
                    where profiles.id = public.on_call_now()),
    'shifts', coalesce((
      select jsonb_agg(jsonb_build_object('id', on_call_rota.id, 'handle', profiles.handle,
          'starts_at', on_call_rota.starts_at, 'ends_at', on_call_rota.ends_at,
          'is_now', on_call_rota.starts_at <= now() and on_call_rota.ends_at > now())
        order by on_call_rota.starts_at)
      from public.on_call_rota join public.profiles on profiles.id = on_call_rota.user_id
      where on_call_rota.ends_at > now()), '[]'::jsonb),
    'gaps', public.on_call_gaps(now(), window_end),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', profiles.id, 'handle', profiles.handle) order by profiles.handle)
      from public.staff_permissions join public.profiles on profiles.id = staff_permissions.user_id
      where staff_permissions.permission = 'on_call'), '[]'::jsonb));
end;
$$;

comment on function public.admin_on_call_rota() is
  'Staff: the on-call rota, its gaps in the next 14 days and who may take a shift (S1-E10-09).';
revoke execute on function public.admin_on_call_rota() from public, anon;
grant execute on function public.admin_on_call_rota() to authenticated;

/**
 * on_call_gaps: the stretches between from_time and to_time that no shift covers, so the rota
 * page can warn "Nobody is on call" (criterion 2: someone always is).
 * Returns: a JSON array of {starts_at, ends_at}. Internal: admin_on_call_rota().
 */
create or replace function public.on_call_gaps(from_time timestamptz, to_time timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shift record;
  cursor_time timestamptz := from_time;
  gaps jsonb := '[]'::jsonb;
begin
  -- Walk the shifts in order; any space before the next shift starts is a gap.
  for shift in
    select starts_at, ends_at from public.on_call_rota
    where ends_at > from_time and starts_at < to_time order by starts_at
  loop
    if shift.starts_at > cursor_time then
      gaps := gaps || jsonb_build_object('starts_at', cursor_time, 'ends_at', shift.starts_at);
    end if;
    cursor_time := greatest(cursor_time, shift.ends_at);
  end loop;
  if cursor_time < to_time then
    gaps := gaps || jsonb_build_object('starts_at', cursor_time, 'ends_at', to_time);
  end if;
  return gaps;
end;
$$;

comment on function public.on_call_gaps(timestamptz, timestamptz) is 'Internal: the stretches no on-call shift covers (S1-E10-09).';
revoke execute on function public.on_call_gaps(timestamptz, timestamptz) from public, anon, authenticated;

/* ---------- The alert ---------- */

alter table public.on_call_alerts
  add column on_call_user_id uuid references public.profiles (id),
  add column alerted_at timestamptz,
  add column acknowledged_by_user_id uuid references public.profiles (id),
  add column escalated_at timestamptz;

comment on column public.on_call_alerts.on_call_user_id is 'Who was on call when the order arrived; null when nobody was (S1-E10-09).';
comment on column public.on_call_alerts.alerted_at is 'When the phone alert went out (a logging stub until a provider is chosen; S1-E10-09).';
comment on column public.on_call_alerts.escalated_at is 'When the rest of the founding team was alerted, after on_call_escalation_minutes (S1-E10-09).';

/**
 * send_on_call_alert: fills in who is on call and when the phone alert went out, as each alert is
 * logged (criterion 1: within five minutes; here, at once). The phone call itself is a stub that
 * only logs (docs/mocks.md). Nobody on call means the alert goes straight to the whole founding
 * team, so escalated_at is set too.
 * Trigger: before insert on on_call_alerts.
 */
create or replace function public.send_on_call_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.on_call_user_id := public.on_call_now(new.created_at);
  new.alerted_at := now();
  if new.on_call_user_id is null then
    new.escalated_at := now();
  end if;
  return new;
end;
$$;

comment on function public.send_on_call_alert() is
  'Trigger: names who is on call and logs the (stub) phone alert as an on-call alert is made (S1-E10-09).';
revoke execute on function public.send_on_call_alert() from public, anon, authenticated;

create trigger on_call_alerts_send
  before insert on public.on_call_alerts
  for each row execute function public.send_on_call_alert();

/**
 * escalate_on_call_alerts: alerts the rest of the founding team about every alert nobody has
 * acknowledged within on_call_escalation_minutes (criterion 2). Stub: it marks escalated_at.
 * Returns: how many it escalated. Runs every minute (pg_cron); tests call it directly.
 */
create or replace function public.escalate_on_call_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  escalated integer;
begin
  update public.on_call_alerts set escalated_at = now()
  where acknowledged_at is null and escalated_at is null
    and created_at <= now() - make_interval(mins => coalesce(public.setting_value('on_call_escalation_minutes'), '15'::jsonb)::text::integer);
  get diagnostics escalated = row_count;
  return escalated;
end;
$$;

comment on function public.escalate_on_call_alerts() is
  'Every minute: escalates removal-order alerts nobody acknowledged in time (S1-E10-09).';
revoke execute on function public.escalate_on_call_alerts() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('escalate-on-call-alerts', '* * * * *', 'select public.escalate_on_call_alerts()');

/**
 * admin_acknowledge_on_call_alert: the person on call (or anyone with the on-call permission)
 * says they have it, which stops the escalation.
 * Input: alert_id. Returns: true. Errors: insufficient_privilege without the on-call permission;
 *   check_violation for an alert already acknowledged. Logged as on_call.alert_acknowledged.
 */
create or replace function public.admin_acknowledge_on_call_alert(alert_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  alert public.on_call_alerts;
begin
  if not public.staff_may('removal_orders', 'act') then
    raise exception 'Only someone with the on-call permission can acknowledge an alert.' using errcode = 'insufficient_privilege';
  end if;
  select * into alert from public.on_call_alerts where on_call_alerts.id = alert_id for update;
  if alert.id is null or alert.acknowledged_at is not null then
    raise exception 'This alert is already acknowledged.' using errcode = 'check_violation';
  end if;
  update public.on_call_alerts set acknowledged_at = now(), acknowledged_by_user_id = (select auth.uid())
  where on_call_alerts.id = alert.id;
  perform public.log_staff_action('on_call.alert_acknowledged', 'on_call_alerts', alert.id::text, null, null,
    null, jsonb_build_object('case_id', alert.case_id, 'acknowledged_at', now()));
  return true;
end;
$$;

comment on function public.admin_acknowledge_on_call_alert(uuid) is
  'On-call staff acknowledge a removal-order alert, which stops its escalation; logged (S1-E10-09).';
revoke execute on function public.admin_acknowledge_on_call_alert(uuid) from public, anon;
grant execute on function public.admin_acknowledge_on_call_alert(uuid) to authenticated;

-- The queue's list of alerts gains who was on call and the acknowledgement; the returned
-- columns change, so the function is dropped and made again.
drop function public.admin_on_call_alerts();

/**
 * admin_on_call_alerts: the logged on-call alerts, newest first, for the queue page.
 * Returns: when, the case and its reference, who was on call, when it was acknowledged and
 *   escalated. Errors: insufficient_privilege outside moderation.
 */
create or replace function public.admin_on_call_alerts()
returns table (
  alert_id uuid, kind text, case_id uuid, case_reference text, notice_reference text, created_at timestamptz,
  on_call_handle text, acknowledged_at timestamptz, escalated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderation staff see on-call alerts.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select on_call_alerts.id, on_call_alerts.kind, on_call_alerts.case_id, cases.reference,
           public_notices.reference, on_call_alerts.created_at, on_call.handle,
           on_call_alerts.acknowledged_at, on_call_alerts.escalated_at
    from public.on_call_alerts
    left join public.cases on cases.id = on_call_alerts.case_id
    left join public.public_notices on public_notices.id = on_call_alerts.notice_id
    left join public.profiles as on_call on on_call.id = on_call_alerts.on_call_user_id
    order by on_call_alerts.created_at desc
    limit 20;
end;
$$;

comment on function public.admin_on_call_alerts() is
  'Staff: the latest on-call alerts with who was on call, the acknowledgement and the escalation (S1-E10-02, S1-E10-09).';
revoke execute on function public.admin_on_call_alerts() from public, anon;
grant execute on function public.admin_on_call_alerts() to authenticated;

/* ---------- Taking the item down and keeping it ---------- */

alter table public.cases
  add column disabled_at timestamptz,
  add column preserve_until timestamptz;

comment on column public.cases.disabled_at is 'When an authority order''s item came down (S1-E10-09; TCO art. 3(3)).';
comment on column public.cases.preserve_until is 'Until when the removed item is kept for the authorities (TCO art. 6; S1-E10-09).';

/**
 * mark_order_item_disabled: when an authority-order case is decided with hide or remove, records
 * when the item came down and keeps it for removal_order_preserve_months (TCO art. 6), whichever
 * way it was decided (Emergency disable or the ordinary decision form).
 * Trigger: before update of status on cases.
 */
create or replace function public.mark_order_item_disabled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source = 'authority_order' and new.status = 'decided' and old.status = 'open'
     and new.decision in ('hide', 'remove') then
    new.disabled_at := now();
    new.preserve_until := now() + make_interval(
      months => coalesce(public.setting_value('removal_order_preserve_months'), '6'::jsonb)::text::integer);
  end if;
  return new;
end;
$$;

comment on function public.mark_order_item_disabled() is
  'Trigger: an authority order''s item that comes down gets its time and six months'' preservation (S1-E10-09).';
revoke execute on function public.mark_order_item_disabled() from public, anon, authenticated;

create trigger cases_mark_order_item_disabled
  before update of status on public.cases
  for each row execute function public.mark_order_item_disabled();

/**
 * content_is_held_for_moderation: as in S1-E10-03a (true while an open case is about the item),
 * plus while an authority order's preservation lasts (TCO art. 6), so no purge job deletes it.
 * Internal: the purge jobs (S1-E3-04, S1-E3-05, S1-E6-01).
 */
create or replace function public.content_is_held_for_moderation(item_type public.reportable_type, item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cases
    where cases.item_type = content_is_held_for_moderation.item_type
      and cases.item_id = content_is_held_for_moderation.item_id
      and (cases.status = 'open' or cases.preserve_until > now())
  );
$$;

comment on function public.content_is_held_for_moderation(public.reportable_type, uuid) is
  'True while an open case is about the item or an authority order''s preservation lasts, so the purge keeps it (S1-E10-03a, S1-E10-09).';

/**
 * admin_emergency_disable: "Emergency disable" on an authority-order case (criteria 3 to 5): the
 * item comes down everywhere at once (removed, so only staff see it), the alert is acknowledged,
 * the case decided and the item preserved for six months; the uploader gets a statement of
 * reasons unless the order forbids telling them (TCO art. 11(3)).
 * Inputs: target_case_id; note_text (staff only, required); message_to_person (what the uploader
 *   reads); tell_uploader. Returns: the time the item came down.
 * Errors: insufficient_privilege without the on-call permission or the right to see the case;
 *   check_violation for a case that isn't an open authority order, or a blank note.
 * Logged as case.decided and removal_order.disabled, with every timestamp (criterion 4).
 */
create or replace function public.admin_emergency_disable(
  target_case_id uuid,
  note_text text,
  message_to_person text,
  tell_uploader boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  decided public.cases;
begin
  -- Step 1: the on-call permission, and an open authority order.
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('removal_orders', 'act') then
    raise exception 'Only someone with the on-call permission can use Emergency disable.' using errcode = 'insufficient_privilege';
  end if;
  if target.source <> 'authority_order' or target.status <> 'open' then
    raise exception 'Emergency disable is for an open removal order.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  -- Step 2: acting on the order acknowledges its alert.
  update public.on_call_alerts set acknowledged_at = now(), acknowledged_by_user_id = (select auth.uid())
  where on_call_alerts.case_id = target.id and on_call_alerts.acknowledged_at is null;
  -- Step 3: removed everywhere, decided, preserved (mark_order_item_disabled()), told or not.
  perform public.decide_case(target, 'remove', note_text, message_to_person, null, coalesce(tell_uploader, true));
  -- Step 4: the proof, with every timestamp.
  select * into decided from public.cases where id = target.id;
  perform public.log_staff_action('removal_order.disabled', 'cases', target.id::text, target.user_id, btrim(note_text),
    null, public.order_timeline_json(decided));
  return decided.disabled_at;
end;
$$;

comment on function public.admin_emergency_disable(uuid, text, text, boolean) is
  'On-call staff take an authority order''s item down everywhere in one action, preserved six months, logged (S1-E10-09; TCO).';
revoke execute on function public.admin_emergency_disable(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_emergency_disable(uuid, text, text, boolean) to authenticated;

/**
 * order_timeline_json: every time that proves how an order was handled: received, alerted (and to
 * whom), acknowledged, escalated, disabled, preserved until, the authority told, the uploader told.
 * Internal: admin_emergency_disable() and admin_order_timeline().
 */
create or replace function public.order_timeline_json(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'received_at', target.received_at,
    'deadline_at', target.deadline_at,
    'alerted_at', alert.alerted_at,
    'on_call_handle', (select profiles.handle from public.profiles where profiles.id = alert.on_call_user_id),
    'acknowledged_at', alert.acknowledged_at,
    'escalated_at', alert.escalated_at,
    'disabled_at', target.disabled_at,
    'preserve_until', target.preserve_until,
    'authority_told_at', (select max(public_notices.decision_emailed_at) from public.public_notices
                          where public_notices.case_id = target.id and public_notices.kind = 'removal_order'),
    'uploader_told', exists (select 1 from public.statements_of_reasons where statements_of_reasons.case_id = target.id),
    'authority_name', (select public_notices.authority_name from public.public_notices
                       where public_notices.case_id = target.id and public_notices.kind = 'removal_order'
                       order by public_notices.received_at limit 1))
  from (select 1) as one
  left join lateral (
    select on_call_alerts.alerted_at, on_call_alerts.on_call_user_id, on_call_alerts.acknowledged_at,
           on_call_alerts.escalated_at
    from public.on_call_alerts where on_call_alerts.case_id = target.id
    order by on_call_alerts.created_at limit 1
  ) as alert on true;
$$;

comment on function public.order_timeline_json(public.cases) is 'Internal: a removal order''s timestamps, as proof (S1-E10-09).';
revoke execute on function public.order_timeline_json(public.cases) from public, anon, authenticated;

/**
 * admin_order_timeline: a removal order's timestamps for its case page.
 * Input: the case's ID. Returns: order_timeline_json(). Errors: insufficient_privilege unless
 * the caller may see the case.
 */
create or replace function public.admin_order_timeline(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  return public.order_timeline_json(target);
end;
$$;

comment on function public.admin_order_timeline(uuid) is 'Staff: a removal order''s timestamps, for its case page (S1-E10-09).';
revoke execute on function public.admin_order_timeline(uuid) from public, anon;
grant execute on function public.admin_order_timeline(uuid) to authenticated;
