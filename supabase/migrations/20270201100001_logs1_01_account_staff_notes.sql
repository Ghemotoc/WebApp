-- Migration: staff notes on every account (bundle LOGS-1, part a).
--
-- Asked for by Robert, 6 Nov 2026, 06:48 UTC: "for any profile that we have created … a log …
-- for whatever action our staff has done, and also a place for them to leave comments."
-- The log of staff actions already exists (audit_log, S1-E11-01); part b shows all of it on the
-- account page. This part adds the place for comments.
--
-- What it adds:
--   account_staff_notes            one row per note a staff member left on an account; never
--                                  edited or deleted by anyone (append-only), so the notes are a
--                                  record, like the audit log
--   admin_add_account_note()       the only way in: any staff member who may open the account
--                                  (the Users area, view or act) adds a note; it is logged
--   admin_account_notes()          one page of an account's notes, newest first
--   purge_old_account_staff_notes() deletes notes older than the audit log's 3 years, nightly
--   data_export_held_tables()      gains a row saying why Download my data leaves notes out
--
-- Who calls it: the account page (src/features/staff/components/users/AccountNotes.tsx through
-- hooks/useAccountNotes.ts and api/accountNotes.ts).
--
-- Rules it follows:
--   - CLAUDE.md rule 1: RLS on, one select policy for staff with the Users area; writes only
--     through admin_add_account_note(), so no write privilege is granted.
--   - Rule 15: user_id is the account the note is about (not null, references profiles);
--     author_user_id is the staff member who wrote it (a role name, CLAUDE.md "Conventions").
--   - Rule 12: the audit row says a note was added, never its words.
--   - Architecture 1.8.1: every staff write goes through a function that checks the role and the
--     staff session and writes the audit log in the same transaction.

/* ---------- Table ---------- */

create table public.account_staff_notes (
  id uuid primary key default gen_random_uuid(),
  -- The account the note is about.
  user_id uuid not null references public.profiles (id),
  -- The staff member who wrote it.
  author_user_id uuid not null references public.profiles (id),
  -- The note itself, plain text (shown as text, never as HTML or Markdown).
  body text not null,
  created_at timestamptz not null default now(),
  -- Notes are never edited; the column is here because every table has one.
  updated_at timestamptz not null default now(),
  constraint account_staff_notes_body_length check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.account_staff_notes is
  'kind: staff
Notes staff leave on an account for each other: plain text, never edited or deleted, kept 3 years like the audit log (LOGS-1a; Robert, 6 Nov 2026).';
comment on column public.account_staff_notes.user_id is 'The account the note is about.';
comment on column public.account_staff_notes.author_user_id is 'The staff member who wrote the note.';

-- The account page reads one account's notes, newest first; the purge reads by age.
create index account_staff_notes_account_idx on public.account_staff_notes (user_id, created_at desc);
create index account_staff_notes_created_at_idx on public.account_staff_notes (created_at);

alter table public.account_staff_notes enable row level security;

/**
 * Policy account_staff_notes_select_staff: staff who may open an account (owner, admin and
 * moderator act on Users; support views it) read its notes. Members never read them: not their
 * own account's, not anyone's.
 */
create policy account_staff_notes_select_staff
  on public.account_staff_notes
  for select
  to authenticated
  using ((select public.staff_may('users', 'view')));
comment on policy account_staff_notes_select_staff on public.account_staff_notes is
  'Allows staff with the Users area (owner, admin, moderator, support), in a staff session, to read the notes on any account (LOGS-1a).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): authenticated may
-- read and the policy keeps it to staff. Notes arrive only through admin_add_account_note() and
-- leave only through purge_old_account_staff_notes(), so nobody gets a write privilege, which is
-- what makes them append-only.
revoke all on public.account_staff_notes from anon, authenticated;
grant select on public.account_staff_notes to authenticated;  -- account_staff_notes_select_staff

/* ---------- Writing ---------- */

/**
 * admin_add_account_note: a staff member leaves a note on an account.
 * Inputs: target_user_id, the account; body, the note (1 to 2,000 characters after trimming).
 * Returns: the new note's ID.
 * Errors: insufficient_privilege (42501) without the Users area in a staff session;
 *   no_data_found (P0002) when there is no such account; check_violation (23514) for an empty or
 *   too long note.
 * Logged as account.note_added, naming the account and the note's ID, never its words (rule 12).
 * Where it fits: the account page's "Staff notes" form → api/accountNotes.ts → here.
 */
create or replace function public.admin_add_account_note(target_user_id uuid, body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  clean_body text;
  new_note_id uuid;
begin
  -- Step 1: only staff who may open accounts, in a staff session.
  if not public.staff_may('users', 'view') then
    raise exception 'Only staff with the Users area can leave notes on an account.'
      using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the account must exist.
  if not exists (select 1 from public.profiles where profiles.id = target_user_id) then
    raise exception 'There is no such account.' using errcode = 'no_data_found';
  end if;
  -- Step 3: trim the note and refuse an empty or too long one, with a plain message.
  clean_body := public.clean_mail_text(body, 2000);
  -- Step 4: store it, with the signed-in staff member as its author.
  insert into public.account_staff_notes (user_id, author_user_id, body)
  values (target_user_id, (select auth.uid()), clean_body)
  returning id into new_note_id;
  -- Step 5: the audit row, in the same transaction, without the words.
  perform public.log_staff_action('account.note_added', 'account_staff_notes',
    new_note_id::text, target_user_id, null, null, null);
  return new_note_id;
end;
$$;

comment on function public.admin_add_account_note(uuid, text) is
  'Staff with the Users area leave a note on an account; logged without the words (LOGS-1a).';
revoke execute on function public.admin_add_account_note(uuid, text) from public, anon;
grant execute on function public.admin_add_account_note(uuid, text) to authenticated;

/* ---------- Reading ---------- */

/**
 * admin_account_notes: one page of an account's notes, newest first.
 * Inputs: target_user_id, the account; page_number, from 1; page_size, 1 to 50 (default 20).
 * Returns: one row per note: its ID, the words, the author's username (null when the author has
 *   none yet), the first 8 characters of the author's user ID (staff screens never show a full ID,
 *   architecture 1.6), when it was written, and how many notes the account has in all, so the
 *   screen can say how many pages there are.
 * Errors: insufficient_privilege (42501) without the Users area in a staff session.
 * Where it fits: hooks/useAccountNotes.ts → api/accountNotes.ts → here.
 */
create or replace function public.admin_account_notes(
  target_user_id uuid,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id uuid,
  body text,
  author_handle text,
  author_user_id_short text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  -- Step 1: keep the page size and number sensible whatever the screen sends.
  rows_per_page integer := least(greatest(coalesce(page_size, 20), 1), 50);
  rows_to_skip integer := (greatest(coalesce(page_number, 1), 1) - 1) * rows_per_page;
begin
  -- Step 2: only staff who may open accounts, in a staff session.
  if not public.staff_may('users', 'view') then
    raise exception 'Only staff with the Users area can read notes on an account.'
      using errcode = 'insufficient_privilege';
  end if;
  -- Step 3: the page, with the count of every note on the account beside each row.
  return query
    select notes.id, notes.body, authors.handle, left(notes.author_user_id::text, 8),
           notes.created_at, count(*) over ()
    from public.account_staff_notes as notes
    left join public.profiles as authors on authors.id = notes.author_user_id
    where notes.user_id = target_user_id
    order by notes.created_at desc, notes.id
    limit rows_per_page offset rows_to_skip;
end;
$$;

comment on function public.admin_account_notes(uuid, integer, integer) is
  'One page of the staff notes on an account, newest first, for staff with the Users area (LOGS-1a).';
revoke execute on function public.admin_account_notes(uuid, integer, integer) from public, anon;
grant execute on function public.admin_account_notes(uuid, integer, integer) to authenticated;

/* ---------- Retention ---------- */

/**
 * purge_old_account_staff_notes: deletes notes older than the audit log is kept
 * (audit_log_keep_years, 3 years; decided 17 Oct 2026, 17:41). A note and the audit row that
 * says it was written go at about the same time.
 * Returns: how many notes it deleted. Where it fits: pg_cron runs it every night (below); tests
 *   call it directly. Nobody else may run it.
 */
create or replace function public.purge_old_account_staff_notes()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  keep_years integer := coalesce((public.setting_value('audit_log_keep_years'))::integer, 3);
  deleted_rows integer;
begin
  delete from public.account_staff_notes as notes
  where notes.created_at < now() - make_interval(years => keep_years);
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

comment on function public.purge_old_account_staff_notes() is
  'Nightly: deletes staff notes older than audit_log_keep_years (3), as the audit log (LOGS-1a).';
revoke execute on function public.purge_old_account_staff_notes() from public, anon, authenticated;

-- Every night at 03:53 UTC, a minute no other job uses. cron.schedule replaces a job of the same
-- name, so running this again is safe.
select cron.schedule('purge-old-account-staff-notes', '53 3 * * *',
  'select public.purge_old_account_staff_notes();');

/* ---------- Download my data ---------- */

/**
 * data_export_held_tables: as in QA-7 (20270131100007), plus account_staff_notes, which "what we
 * hold about you" leaves out with the reason below. Database test 298 fails when a staff table
 * with a user_id is missing here.
 */
create or replace function public.data_export_held_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('abuse_image_evidence', false, 'evidence kept for the police about a suspected child abuse image; handing it out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('account_staff_notes', false, 'staff notes can name other people (a reporter, a linked account) or a safeguarding concern, so they are not in the automatic file; when the person asks for their data, staff copy the notes in by hand after taking out other people''s details (GDPR art. 15(4) and art. 23; lawyer to check)'),
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
  'Internal: every staff table with a user_id and whether Download my data''s "held_about_you" includes it, or why not (QA-7, LOGS-1a; GDPR art. 15).';
revoke execute on function public.data_export_held_tables() from public, anon, authenticated;
