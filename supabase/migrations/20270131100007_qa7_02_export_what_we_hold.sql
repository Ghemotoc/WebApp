-- Migration: Download my data also gives "what we hold about you" (QA-7, finding P2; CTO
-- decision, 6 Nov 2026, under Robert's standing go-ahead of 5 Nov 2026, 21:10; lawyer to confirm).
--
-- Why: GDPR art. 15 gives a person a copy of the personal data held about them, not only what
-- they made. Until now the export left out the staff tables about the person: sanctions on their
-- account, staff decisions about their content, staff changes to their stories, restrictions,
-- copied-work notes, their own data requests, their staff roles and the scrambled sign-up IP.
--
-- What it adds:
--   data_export_held_tables()     every staff table with a user_id, and whether the export
--                                 includes its rows about the person or why it leaves them out
--   export_held_about_of(owner)   those rows, without staff names or IDs and without internal notes
--   export_tables_of(owner)       now also carries the group "held_about_you"
-- Both Download my data (my_data_export()) and staff answering a data request
-- (admin_data_request_export()) call export_tables_of(), so both get the new group.
-- What is left out and why is in data_export_held_tables(), so the lawyer can check each one.

/**
 * data_export_held_tables: every staff table ("kind: staff") with a user_id column, and whether
 * "what we hold about you" includes its rows about the person. One list, so a new staff table
 * can't be forgotten: database test 298 fails when a staff table with a user_id is missing here.
 * Returns: one row per table; why_left_out is filled in only when is_included is false.
 * Internal (QA-7).
 */
create function public.data_export_held_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('abuse_image_evidence', false, 'evidence kept for the police about a suspected child abuse image; handing it out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('audit_log', false, 'the record of what staff did; the changes it records about the person are in the groups below'),
    ('brand_assets', false, 'user_id is the staff member who chose a logo, not data about their account'),
    ('case_account_links', false, 'a moderator''s note that two accounts may be one person, kept to spot banned accounts coming back; telling the person would defeat it (GDPR art. 23; lawyer to check)'),
    ('case_actions', false, 'user_id is the staff member who decided; the decisions reach the person as statements of reasons, which are included'),
    ('cases', false, 'open moderation cases; decisions reach the person as statements of reasons, which are included, and an open case may be held back while it is looked into (GDPR art. 23; lawyer to check)'),
    ('compliance_log_entries', false, 'user_id is the staff member who logged an authority order, not data about their account'),
    ('copied_work_notes', true, null),
    ('data_requests', true, null),
    ('interface_text_overrides', false, 'user_id is the admin who edited interface text, not data about their account'),
    ('moderated_items', true, null),
    ('on_call_rota', true, null),
    ('removed_passages', false, 'the exact words staff removed, which may be someone else''s personal data removed to protect them; the removal itself is in story_revisions'),
    ('safeguarding_referrals', false, 'referrals to the police or a prosecutor; handing them out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('sanctions', true, null),
    ('sign_up_ips', true, null),
    ('staff_interns', true, null),
    ('staff_permissions', true, null),
    ('staff_roles', true, null),
    ('story_restrictions', true, null),
    ('story_revisions', true, null);
$$;

comment on function public.data_export_held_tables() is
  'Internal: every staff table with a user_id and whether Download my data''s "held_about_you" includes it, or why not (QA-7, GDPR art. 15).';
revoke execute on function public.data_export_held_tables() from public, anon, authenticated;

/**
 * export_held_about_of: the rows staff tables hold about one person, for their data export.
 * Inputs: owner_id, the person the export is for.
 * Returns: one key per included table of data_export_held_tables(), each a list of rows (oldest
 *   first). Each list names its columns on purpose: never a staff member's ID or name, never an
 *   internal note (sanctions.note, moderated_items.note, data_requests.note), never a secret.
 * Where it fits: export_tables_of() → my_data_export() and admin_data_request_export(). Internal.
 */
create function public.export_held_about_of(owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    -- Warnings, suspensions, bans and reporting pauses on the account (DSA art. 23).
    'sanctions', coalesce((select jsonb_agg(jsonb_build_object(
        'kind', held.kind, 'starts_at', held.starts_at, 'ends_at', held.ends_at,
        'lifted_at', held.lifted_at, 'created_at', held.created_at) order by held.created_at)
      from public.sanctions as held where held.user_id = owner_id), '[]'::jsonb),
    -- What staff hid or removed of theirs, and when it was put back.
    'moderated_items', coalesce((select jsonb_agg(jsonb_build_object(
        'item_type', held.item_type, 'item_id', held.item_id, 'state', held.state,
        'restored_at', held.restored_at, 'created_at', held.created_at) order by held.created_at)
      from public.moderated_items as held where held.user_id = owner_id), '[]'::jsonb),
    -- Staff changes to their stories with the reason they were given. A removed passage's
    -- before and after are left out: they may hold the words removed to protect someone else.
    'story_revisions', coalesce((select jsonb_agg(jsonb_build_object(
        'story_id', held.story_id, 'chapter_id', held.chapter_id, 'change_kind', held.change_kind,
        'reason_code', held.reason_code, 'reason_text', held.reason_text,
        'before_values', case when held.change_kind = 'passage' then null else held.before_values end,
        'after_values', case when held.change_kind = 'passage' then null else held.after_values end,
        'created_at', held.created_at) order by held.created_at)
      from public.story_revisions as held where held.user_id = owner_id), '[]'::jsonb),
    -- Stories staff left out of Discover, shelves and search.
    'story_restrictions', coalesce((select jsonb_agg(jsonb_build_object(
        'story_id', held.story_id, 'reason', held.reason, 'lifted_at', held.lifted_at,
        'created_at', held.created_at) order by held.created_at)
      from public.story_restrictions as held where held.user_id = owner_id), '[]'::jsonb),
    -- The public "copies a published work" notes on their stories.
    'copied_work_notes', coalesce((select jsonb_agg(jsonb_build_object(
        'story_id', held.story_id, 'created_at', held.created_at) order by held.created_at)
      from public.copied_work_notes as held where held.user_id = owner_id), '[]'::jsonb),
    -- Their own requests to see, move, correct or delete their data.
    'data_requests', coalesce((select jsonb_agg(jsonb_build_object(
        'reference', held.reference, 'request_type', held.request_type, 'channel', held.channel,
        'received_on', held.received_on, 'due_on', held.due_on, 'extended_to', held.extended_to,
        'extension_reason', held.extension_reason, 'state', held.state, 'outcome', held.outcome,
        'closed_at', held.closed_at, 'created_at', held.created_at) order by held.created_at)
      from public.data_requests as held where held.user_id = owner_id), '[]'::jsonb),
    -- The scrambled sign-up address (a keyed hash, never the address; kept 30 days, Q48).
    'sign_up_ips', coalesce((select jsonb_agg(jsonb_build_object(
        'ip_scrambled', held.ip_scrambled, 'ip_period', held.ip_period,
        'created_at', held.created_at) order by held.created_at)
      from public.sign_up_ips as held where held.user_id = owner_id), '[]'::jsonb),
    -- For someone who works for us: their staff roles, permissions, intern mark and on-call turns.
    'staff_roles', coalesce((select jsonb_agg(jsonb_build_object(
        'role', held.role, 'created_at', held.created_at) order by held.created_at)
      from public.staff_roles as held where held.user_id = owner_id), '[]'::jsonb),
    'staff_permissions', coalesce((select jsonb_agg(jsonb_build_object(
        'permission', held.permission, 'created_at', held.created_at) order by held.created_at)
      from public.staff_permissions as held where held.user_id = owner_id), '[]'::jsonb),
    'staff_interns', coalesce((select jsonb_agg(jsonb_build_object(
        'created_at', held.created_at) order by held.created_at)
      from public.staff_interns as held where held.user_id = owner_id), '[]'::jsonb),
    'on_call_rota', coalesce((select jsonb_agg(jsonb_build_object(
        'starts_at', held.starts_at, 'ends_at', held.ends_at) order by held.starts_at)
      from public.on_call_rota as held where held.user_id = owner_id), '[]'::jsonb));
$$;

comment on function public.export_held_about_of(uuid) is
  'Internal: what staff tables hold about one person, without staff names or internal notes, for their data export (QA-7, GDPR art. 15).';
revoke execute on function public.export_held_about_of(uuid) from public, anon, authenticated;

/**
 * export_tables_of: the person's rows of every table Download my data includes (S1-E13-02), then
 * their support tickets (S1-E11-13) and, since QA-7, what staff tables hold about them.
 * Inputs: owner_id. Returns: one key per group. Internal.
 */
create or replace function public.export_tables_of(owner_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  entry record;
  table_rows jsonb;
begin
  -- Step 1: every included table of data_export_tables(), the person's own rows.
  for entry in select listed.table_name from public.data_export_tables() as listed
               where listed.is_included order by listed.table_name loop
    execute format(
      'select coalesce(jsonb_agg(public.export_row_for_owner(to_jsonb(owned)) order by owned.created_at), ''[]''::jsonb)
       from public.%I as owned where owned.user_id = $1', entry.table_name)
      into table_rows using owner_id;
    result := result || jsonb_build_object(entry.table_name, table_rows);
  end loop;
  -- Step 2: the support tickets, then what staff tables hold about them (QA-7).
  result := result || jsonb_build_object('support_tickets', public.export_support_tickets_of(owner_id));
  return result || jsonb_build_object('held_about_you', public.export_held_about_of(owner_id));
end;
$$;

comment on function public.export_tables_of(uuid) is
  'Internal: the person''s rows of every table Download my data includes, their support tickets and what staff tables hold about them (S1-E13-02, QA-7).';
