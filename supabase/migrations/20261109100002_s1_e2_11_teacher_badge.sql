/*
 * Migration: the Teacher badge (story S1-E2-11; docs/stories/s1-e02-accounts-age-gate-and-
 * onboarding.md; bundle ACCOUNTS-2, part f; boards Onboarding 2.5 step 3 and AdminSchools 8.9
 * "Verify teachers").
 *
 * How it works, from the top:
 * - an adult who may write (account_state() active, 18 or over) asks for the badge in onboarding
 *   step 3 or later in Settings, one of two ways (criterion 1);
 * - the school email way: our Pages Function (server/teacher-check.ts) makes a random token, keeps
 *   it out of the person's hands and stores only its SHA-256 here through
 *   begin_teacher_email_check(), signed with the Vault secret teacher_check_secret; the link goes
 *   to the school address. Only the address's domain is kept, never the address (the story's
 *   proposal). A personal domain is refused (criterion 2). Opening the link calls
 *   confirm_teacher_email(): a .edu.ro domain gets the badge at once, any other waits for staff
 *   (criterion 3). The link lasts teacher_link_hours (a setting; the expiry is OPEN);
 * - the proof way: the file goes to the private teacher-proofs bucket under a random name, and
 *   submit_teacher_proof() puts it in the staff queue (criterion 4). Only staff with Schools
 *   access open or delete it; nobody else ever sees it (CLAUDE.md rule 19: the same exception the
 *   picture check makes for moderation staff);
 * - staff (owner, admin, and moderators with the teacher checks permission) see the queue in
 *   Schools › Teacher checks, open a proof (a logged sensitive read), delete it, then decide with
 *   a reason. A decision on a proof is refused while the file is still there, so every decision
 *   means the proof is gone; only the way, the decision, the date and, in the audit log, the
 *   staff member are kept (criterion 6);
 * - the person is notified (teacher_check_decided) and reads the outcome and reason in Settings;
 *   an approved badge shows "Teacher" on the public profile (criterion 7); staff can remove a
 *   badge, which is logged and notified (criterion 8).
 * OPEN for Robert (rule 13): how staff confirm a non-.edu.ro domain, the link expiry, the proof's
 * largest size (10 MB proposed) and when a badge is reviewed again.
 * Personal data: the domain, the way, the dates and the reason; a proof file only until the
 * decision. Who calls it: server/teacher-check.ts, src/features/teacher-badge/ and
 * src/features/staff/ (Schools).
 * Tests: supabase/tests/database/204-teacher-badge.test.sql.
 */

/* ---------- The setting and the badge ---------- */

insert into public.settings (key, value, is_public, description) values
  ('teacher_link_hours', '48'::jsonb, false,
   'Hours a school email link for the Teacher badge works (S1-E2-11). The expiry is OPEN; 48 is a proposal.')
on conflict (key) do nothing;

alter table public.profiles add column teacher_badge_since timestamptz;

comment on column public.profiles.teacher_badge_since is
  'When the Teacher badge was granted; empty without one (S1-E2-11). Shown publicly only as "Teacher".';

/* ---------- The requests ---------- */

create table public.teacher_checks (
  id uuid primary key default gen_random_uuid(),
  -- The person asking for the badge (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- school_email or proof (criterion 1).
  way text not null,
  -- The school address's domain only, never the address (the story's proposal).
  school_domain text,
  -- The proof's name in the teacher-proofs bucket, only until the decision (criterion 6).
  proof_path text,
  -- Only the SHA-256 of the link's token, until the link is opened.
  token_hash text unique,
  link_expires_at timestamptz,
  -- link_sent → waiting_for_staff or approved; waiting_for_staff → approved or rejected;
  -- link_sent → replaced when a new request is made.
  status text not null,
  -- Staff's reason, which the person reads with the outcome. Who decided is in the audit log.
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_checks_way_known check (way in ('school_email', 'proof')),
  constraint teacher_checks_status_known check (
    status in ('link_sent', 'waiting_for_staff', 'approved', 'rejected', 'replaced')),
  constraint teacher_checks_way_has_its_part check (
    (way = 'school_email' and school_domain is not null and proof_path is null)
    or (way = 'proof' and school_domain is null)),
  constraint teacher_checks_proof_only_while_waiting check (
    proof_path is null or status = 'waiting_for_staff'),
  constraint teacher_checks_decided_together check (
    (status in ('approved', 'rejected')) = (decided_at is not null)),
  constraint teacher_checks_reason_length check (
    decision_reason is null or char_length(decision_reason) between 1 and 1000),
  constraint teacher_checks_domain_looks_right check (
    school_domain is null or school_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$')
);

comment on table public.teacher_checks is
  'kind: user_action
A request for the Teacher badge: the way, the school domain (never the address), the proof only until the decision, and the outcome with its reason (S1-E2-11). Who decided is in the audit log only.';
comment on column public.teacher_checks.user_id is
  'The person asking; never shown publicly (rule 15).';

-- One live request per person.
create unique index teacher_checks_one_live on public.teacher_checks (user_id)
  where status in ('link_sent', 'waiting_for_staff');
create index teacher_checks_waiting on public.teacher_checks (created_at) where status = 'waiting_for_staff';
create index teacher_checks_user_id on public.teacher_checks (user_id, created_at desc);

create trigger teacher_checks_set_updated_at
  before update on public.teacher_checks
  for each row execute function public.set_updated_at();

create trigger teacher_checks_refuse_user_id_change
  before update on public.teacher_checks
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.teacher_checks enable row level security;

-- The person reads their own requests; every write goes through the functions below.
grant select on public.teacher_checks to authenticated;

/**
 * teacher_checks_select_own: the person reads their own requests and outcomes (data access, GDPR
 * art. 15). Staff read the queue only through admin_teacher_checks().
 */
create policy teacher_checks_select_own
  on public.teacher_checks for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy teacher_checks_select_own on public.teacher_checks is
  'Allows a person to read their own Teacher badge requests and outcomes (S1-E2-11).';

/* ---------- Small rules ---------- */

/**
 * teacher_check_is_signed: true when our server signed the payload with the Vault secret
 * teacher_check_secret (the same value as Cloudflare's TEACHER_CHECK_SECRET).
 * Inputs: the payload text and its hex HMAC-SHA256. Returns: true or false; false when no secret
 * is set, so nothing can be stored until it is. Internal.
 */
create or replace function public.teacher_check_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'teacher_check_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;

comment on function public.teacher_check_is_signed(text, text) is
  'Internal: true when our server signed a Teacher badge payload (S1-E2-11).';
revoke execute on function public.teacher_check_is_signed(text, text) from public, anon, authenticated;

/**
 * is_personal_email_domain: true for the personal email services the board lists (Onboarding
 * 2.5, step 3: "Personal addresses like Gmail don't count"). Keep it in step with
 * personalEmailDomains in src/schemas/teacherCheck.ts, which only drives the live hint.
 * Input: a domain. Returns: true or false.
 */
create or replace function public.is_personal_email_domain(domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(domain, '')) in ('gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.ro',
    'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com');
$$;

comment on function public.is_personal_email_domain(text) is
  'True for the personal email services the Teacher badge refuses (S1-E2-11).';
revoke execute on function public.is_personal_email_domain(text) from public;
grant execute on function public.is_personal_email_domain(text) to anon, authenticated;

/**
 * is_school_domain_trusted: true for a Romanian school domain, which gets the badge as soon as
 * its link is opened (criterion 3: ".edu.ro"). Input: a domain. Returns: true or false.
 */
create or replace function public.is_school_domain_trusted(domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(domain, '')) like '%.edu.ro';
$$;

comment on function public.is_school_domain_trusted(text) is
  'Internal: true for a .edu.ro domain, whose link gives the Teacher badge at once (S1-E2-11).';
revoke execute on function public.is_school_domain_trusted(text) from public, anon, authenticated;

/**
 * teacher_check_can_ask: may this profile ask for the badge now? A live adult who may write
 * (criterion 1: step 3 is for "18 or over"), without the badge, with no request waiting for staff.
 * A link already sent may be replaced by a new request.
 * Input: the profile row. Returns: true or false. Internal.
 */
create or replace function public.teacher_check_can_ask(person public.profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select person.id is not null
    and person.deleted_at is null
    and person.teacher_badge_since is null
    and public.account_state(person.id) = 'active'
    and public.age_band_from_birth(person.birth_year, person.birth_month, person.age_check_result,
      (now() at time zone 'Europe/Bucharest')::date) = '18_plus'
    and not exists (
      select 1 from public.teacher_checks
      where teacher_checks.user_id = person.id and teacher_checks.status = 'waiting_for_staff');
$$;

comment on function public.teacher_check_can_ask(public.profiles) is
  'Internal: whether a profile may ask for the Teacher badge now (S1-E2-11).';
revoke execute on function public.teacher_check_can_ask(public.profiles) from public, anon, authenticated;

/**
 * caller_profile_for_teacher_check: the signed-in person's live profile, locked for a change.
 * Returns: the row, or an empty row. Errors: insufficient_privilege when signed out. Internal.
 */
create or replace function public.caller_profile_for_teacher_check()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  person public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to ask for a Teacher badge.' using errcode = 'insufficient_privilege';
  end if;
  select * into person from public.profiles
  where profiles.id = (select auth.uid()) and profiles.deleted_at is null
  for update;
  return person;
end;
$$;

comment on function public.caller_profile_for_teacher_check() is
  'Internal: the signed-in person''s profile, locked, for a Teacher badge request (S1-E2-11).';
revoke execute on function public.caller_profile_for_teacher_check() from public, anon, authenticated;

/**
 * grant_teacher_badge: gives a profile the badge and tells them. Internal: the .edu.ro link and
 * admin_decide_teacher_check(). Input: the user ID.
 */
create or replace function public.grant_teacher_badge(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set teacher_badge_since = now()
  where profiles.id = target_user_id and profiles.teacher_badge_since is null;
$$;

comment on function public.grant_teacher_badge(uuid) is
  'Internal: gives a profile the Teacher badge (S1-E2-11).';
revoke execute on function public.grant_teacher_badge(uuid) from public, anon, authenticated;

/* ---------- The person's side ---------- */

/**
 * my_teacher_check: what onboarding step 3 and Settings › Teacher badge show.
 * Returns: { outcome: 'ok', can_ask, is_teacher, badge_since, latest } where latest is the newest
 *   request ({ way, status, school_domain, requested_at, decided_at, reason, link_expires_at })
 *   or null; or { outcome: 'not_found' } without a live profile.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_teacher_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  person public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your Teacher badge.' using errcode = 'insufficient_privilege';
  end if;
  select * into person from public.profiles
  where profiles.id = (select auth.uid()) and profiles.deleted_at is null;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object(
    'outcome', 'ok',
    'can_ask', public.teacher_check_can_ask(person),
    'is_teacher', person.teacher_badge_since is not null,
    'badge_since', person.teacher_badge_since,
    'latest', (
      select jsonb_build_object(
        'way', checks.way, 'status', checks.status, 'school_domain', checks.school_domain,
        'requested_at', checks.created_at, 'decided_at', checks.decided_at,
        'reason', checks.decision_reason, 'link_expires_at', checks.link_expires_at)
      from public.teacher_checks as checks
      where checks.user_id = person.id and checks.status <> 'replaced'
      -- A live request first, then the newest.
      order by checks.status in ('link_sent', 'waiting_for_staff') desc, checks.created_at desc
      limit 1));
end;
$$;

comment on function public.my_teacher_check() is
  'The signed-in person''s Teacher badge and latest request (S1-E2-11).';
revoke execute on function public.my_teacher_check() from public, anon;
grant execute on function public.my_teacher_check() to authenticated;

/**
 * replace_sent_teacher_link: a new request makes an earlier unopened link stop working.
 * Input: the user ID. Internal: begin_teacher_email_check() and submit_teacher_proof().
 */
create or replace function public.replace_sent_teacher_link(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.teacher_checks set status = 'replaced', token_hash = null
  where teacher_checks.user_id = target_user_id and teacher_checks.status = 'link_sent';
$$;

comment on function public.replace_sent_teacher_link(uuid) is
  'Internal: an earlier unopened Teacher badge link stops working (S1-E2-11).';
revoke execute on function public.replace_sent_teacher_link(uuid) from public, anon, authenticated;

/**
 * begin_teacher_email_check: stores a signed school email request for the signed-in person
 * (criteria 2 and 3). Our server sends the link; only the domain is kept here.
 * Inputs: the school address's domain, the token's SHA-256 (hex) and the signature: HMAC-SHA256
 *   of 'teacher|<user ID>|<domain>|<hash>' with the Vault secret teacher_check_secret.
 * Returns: { outcome: 'ok', link_expires_at }.
 * Errors: insufficient_privilege when signed out or unsigned; check_violation with hint
 *   personal_address (Gmail and the like), not_available (not an adult who may write, already a
 *   teacher, or a request waiting for staff) or too_soon (a link sent less than a minute ago).
 */
create or replace function public.begin_teacher_email_check(
  school_domain text,
  token_hash text,
  signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person public.profiles;
  wanted_domain text := lower(btrim(coalesce(begin_teacher_email_check.school_domain, '')));
  expires_at timestamptz;
begin
  -- Step 1: signed in, and the request came from our server.
  person := public.caller_profile_for_teacher_check();
  if not public.teacher_check_is_signed(
      'teacher|' || (select auth.uid()) || '|' || wanted_domain || '|' || lower(begin_teacher_email_check.token_hash),
      signature) then
    raise exception 'This request wasn''t signed by our server.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: never a personal address (board 2.5, step 3).
  if public.is_personal_email_domain(wanted_domain) then
    raise exception 'Use your school address, or upload proof instead.'
      using errcode = 'check_violation', hint = 'personal_address';
  end if;
  -- Step 3: only for an adult who may write and has no badge or request waiting.
  if not public.teacher_check_can_ask(person) then
    raise exception 'A Teacher badge can''t be asked for now.' using errcode = 'check_violation', hint = 'not_available';
  end if;
  -- Step 4: no flood of emails to a school address.
  if exists (select 1 from public.teacher_checks
             where teacher_checks.user_id = person.id and teacher_checks.status = 'link_sent'
               and teacher_checks.created_at > now() - interval '1 minute') then
    raise exception 'Wait a minute before sending again.' using errcode = 'check_violation', hint = 'too_soon';
  end if;
  -- Step 5: the old link stops working, the new one counts for teacher_link_hours.
  perform public.replace_sent_teacher_link(person.id);
  expires_at := now() + make_interval(hours => coalesce((public.setting_value('teacher_link_hours'))::integer, 48));
  insert into public.teacher_checks (user_id, way, school_domain, token_hash, link_expires_at, status)
  values (person.id, 'school_email', wanted_domain, lower(begin_teacher_email_check.token_hash), expires_at, 'link_sent');
  return jsonb_build_object('outcome', 'ok', 'link_expires_at', expires_at);
end;
$$;

comment on function public.begin_teacher_email_check(text, text, text) is
  'Stores a signed school email request for the Teacher badge; only the domain is kept (S1-E2-11).';
revoke execute on function public.begin_teacher_email_check(text, text, text) from public, anon;
grant execute on function public.begin_teacher_email_check(text, text, text) to authenticated;

/**
 * confirm_teacher_email: the school address's owner opened the link (criterion 3). Callable
 * signed out: the token is the key, and only someone with the school mailbox has it.
 * Input: the raw token from the link.
 * Returns: { outcome: 'approved' } for a .edu.ro domain (the badge is granted at once and the
 *   person notified), { outcome: 'waiting_for_staff' } for any other domain, { outcome: 'expired' }
 *   once teacher_link_hours have passed, or { outcome: 'gone' } for an unknown, used or replaced
 *   link, or an account that can't have the badge any more.
 */
create or replace function public.confirm_teacher_email(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.teacher_checks;
  person public.profiles;
begin
  -- Step 1: the waiting link behind the token.
  select * into request from public.teacher_checks
  where teacher_checks.token_hash = encode(extensions.digest(coalesce(token, ''), 'sha256'), 'hex')
    and teacher_checks.status = 'link_sent'
  for update;
  if not found then
    return jsonb_build_object('outcome', 'gone');
  end if;
  if request.link_expires_at <= now() then
    return jsonb_build_object('outcome', 'expired');
  end if;
  -- Step 2: the account must still be able to have the badge.
  select * into person from public.profiles where profiles.id = request.user_id for update;
  if person.teacher_badge_since is not null or public.account_state(person.id) <> 'active' then
    return jsonb_build_object('outcome', 'gone');
  end if;
  -- Step 3: a .edu.ro address gets the badge at once; any other waits for staff (criterion 3).
  if public.is_school_domain_trusted(request.school_domain) then
    update public.teacher_checks set status = 'approved', token_hash = null, decided_at = now()
    where teacher_checks.id = request.id;
    perform public.grant_teacher_badge(person.id);
    perform public.notify(person.id, 'teacher_check_decided', null, '{}'::jsonb);
    return jsonb_build_object('outcome', 'approved');
  end if;
  update public.teacher_checks set status = 'waiting_for_staff', token_hash = null
  where teacher_checks.id = request.id;
  return jsonb_build_object('outcome', 'waiting_for_staff');
end;
$$;

comment on function public.confirm_teacher_email(text) is
  'A school email link was opened: the badge for .edu.ro, the staff queue otherwise (S1-E2-11).';
revoke execute on function public.confirm_teacher_email(text) from public;
grant execute on function public.confirm_teacher_email(text) to anon, authenticated;

/* ---------- The proof's bucket ---------- */

-- Private: only staff with Schools access ever read it; 10 MB (OPEN, a proposal). People pick a
-- JPG, PNG or PDF; a picture is redrawn without its metadata first, which the browser may save as
-- WebP (src/features/pictures/lib/preparePicture.ts), so WebP is accepted too.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-proofs', 'teacher-proofs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

/**
 * teacher_proof_upload_allowed: may the signed-in person add this proof file? Only someone who
 * may ask for the badge now, under a fresh random name with a known ending ("<uuid>.pdf"), never
 * the user ID (architecture 1.6).
 * Input: the path inside the bucket. Where it fits: the teacher_proofs_insert_own policy.
 */
create or replace function public.teacher_proof_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp|pdf)$'
    and split_part(object_name, '.', 1) <> (select auth.uid())::text
    and public.teacher_check_can_ask(
      (select profiles from public.profiles where profiles.id = (select auth.uid())));
$$;

comment on function public.teacher_proof_upload_allowed(text) is
  'True for someone who may ask for the Teacher badge, under a random file name (S1-E2-11).';
revoke execute on function public.teacher_proof_upload_allowed(text) from public, anon;
grant execute on function public.teacher_proof_upload_allowed(text) to authenticated;

/**
 * Policy teacher_proofs_insert_own: an adult asking for the badge adds their proof. Why: staff
 * need it to check that they teach (criterion 4). The person can't read it back, list or change it.
 */
create policy teacher_proofs_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'teacher-proofs' and public.teacher_proof_upload_allowed(name));

comment on policy teacher_proofs_insert_own on storage.objects is
  'Allows someone who may ask for the Teacher badge to add a proof under a random name (S1-E2-11).';

/**
 * Policy teacher_proofs_select_staff: staff with Schools access (owner, admin, moderators with
 * the teacher checks permission) read a proof. Why: they decide the request; nobody else ever
 * sees it (criterion 4; architecture 1.8.3).
 */
create policy teacher_proofs_select_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'teacher-proofs' and (select public.staff_may('schools', 'act')));

comment on policy teacher_proofs_select_staff on storage.objects is
  'Allows staff with Schools access to read Teacher badge proofs (S1-E2-11).';

/**
 * Policy teacher_proofs_delete_staff: the same staff delete a proof. Why: it is deleted as soon as
 * the request is decided (criterion 6); admin_decide_teacher_check() refuses until it is gone.
 */
create policy teacher_proofs_delete_staff
  on storage.objects for delete to authenticated
  using (bucket_id = 'teacher-proofs' and (select public.staff_may('schools', 'act')));

comment on policy teacher_proofs_delete_staff on storage.objects is
  'Allows staff with Schools access to delete a Teacher badge proof once they decide (S1-E2-11).';

/**
 * submit_teacher_proof: puts an uploaded proof in the staff queue (criterion 4).
 * Input: the file's name in the teacher-proofs bucket, which the caller uploaded.
 * Returns: { outcome: 'ok' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint not_available (as in
 *   begin_teacher_email_check()) or no_file (no such file of the caller's).
 */
create or replace function public.submit_teacher_proof(proof_path text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  person public.profiles;
begin
  -- Step 1: an adult who may ask now.
  person := public.caller_profile_for_teacher_check();
  if not public.teacher_check_can_ask(person) then
    raise exception 'A Teacher badge can''t be asked for now.' using errcode = 'check_violation', hint = 'not_available';
  end if;
  -- Step 2: the file is there and is the caller's own.
  if not exists (select 1 from storage.objects
                 where objects.bucket_id = 'teacher-proofs' and objects.name = submit_teacher_proof.proof_path
                   and objects.owner_id = person.id::text) then
    raise exception 'Upload the proof first.' using errcode = 'check_violation', hint = 'no_file';
  end if;
  -- Step 3: an unopened link stops working; the proof waits for staff.
  perform public.replace_sent_teacher_link(person.id);
  insert into public.teacher_checks (user_id, way, proof_path, status)
  values (person.id, 'proof', submit_teacher_proof.proof_path, 'waiting_for_staff');
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.submit_teacher_proof(text) is
  'Puts an uploaded proof that someone teaches in the staff queue (S1-E2-11).';
revoke execute on function public.submit_teacher_proof(text) from public, anon;
grant execute on function public.submit_teacher_proof(text) to authenticated;

/* ---------- Staff: the queue, the proof, the decision, the badge ---------- */

/**
 * require_teacher_checks_access: refuses anyone but staff with Schools access (owner, admin, and
 * moderators with the teacher checks permission; architecture 1.8.3) in a staff session.
 * Errors: insufficient_privilege (hint not_allowed). Internal.
 */
create or replace function public.require_teacher_checks_access()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('schools', 'act') then
    raise exception 'Only staff who check teachers may do this.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
end;
$$;

comment on function public.require_teacher_checks_access() is
  'Internal: refuses anyone without Schools access in a staff session (S1-E2-11).';
revoke execute on function public.require_teacher_checks_access() from public, anon, authenticated;

/**
 * admin_teacher_checks: the requests waiting for staff, oldest first (board AdminSchools 8.9,
 * "Verify teachers"; criterion 5).
 * Returns: per request: check_id, handle, display_name, way, school_domain (email way), has_proof
 *   and requested_at. Never the user ID, an email address or the proof itself.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access.
 * Where it fits: /staff/schools/teachers → useTeacherChecks → api/teacherChecks.ts → here.
 */
create or replace function public.admin_teacher_checks()
returns table (
  check_id uuid,
  handle text,
  display_name text,
  way text,
  school_domain text,
  has_proof boolean,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_teacher_checks_access();
  return query
    select checks.id, profiles.handle, public.display_name(profiles.handle, profiles.pen_name),
      checks.way, checks.school_domain, checks.proof_path is not null, checks.created_at
    from public.teacher_checks as checks
    join public.profiles on profiles.id = checks.user_id and profiles.deleted_at is null
    where checks.status = 'waiting_for_staff'
    order by checks.created_at;
end;
$$;

comment on function public.admin_teacher_checks() is
  'Staff: the Teacher badge requests waiting for a decision (S1-E2-11).';
revoke execute on function public.admin_teacher_checks() from public, anon;
grant execute on function public.admin_teacher_checks() to authenticated;

/**
 * admin_teachers: everyone with the badge, newest first, so staff can remove one (criterion 8).
 * Returns: handle, display_name and badge_since. Errors: as admin_teacher_checks().
 */
create or replace function public.admin_teachers()
returns table (handle text, display_name text, badge_since timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_teacher_checks_access();
  return query
    select profiles.handle, public.display_name(profiles.handle, profiles.pen_name), profiles.teacher_badge_since
    from public.profiles
    where profiles.teacher_badge_since is not null and profiles.deleted_at is null
    order by profiles.teacher_badge_since desc;
end;
$$;

comment on function public.admin_teachers() is
  'Staff: everyone with the Teacher badge (S1-E2-11).';
revoke execute on function public.admin_teachers() from public, anon;
grant execute on function public.admin_teachers() to authenticated;

/**
 * admin_open_teacher_proof: the proof's name in the bucket, for a short signed address; opening it
 * is a sensitive read in the audit log (architecture 1.8.3; S1-E11-01 teacher_proof_opened).
 * Input: the request. Returns: the file's name in teacher-proofs.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access; check_violation (hint
 *   no_proof) for a request with no proof waiting.
 */
create or replace function public.admin_open_teacher_proof(check_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.teacher_checks;
begin
  perform public.require_teacher_checks_access();
  select * into request from public.teacher_checks
  where teacher_checks.id = admin_open_teacher_proof.check_id and teacher_checks.proof_path is not null;
  if not found then
    raise exception 'There is no proof to open.' using errcode = 'check_violation', hint = 'no_proof';
  end if;
  perform public.log_sensitive_read('teacher_proof_opened', 'teacher_checks', request.id::text, request.user_id);
  return request.proof_path;
end;
$$;

comment on function public.admin_open_teacher_proof(uuid) is
  'Staff: a Teacher badge proof''s file name; each opening is logged (S1-E2-11).';
revoke execute on function public.admin_open_teacher_proof(uuid) from public, anon;
grant execute on function public.admin_open_teacher_proof(uuid) to authenticated;

/**
 * admin_decide_teacher_check: approves or turns down one waiting request, with a reason the
 * person reads (criteria 5 and 6). For the proof way the file must already be deleted (the
 * screen deletes it first), so a decision always means the proof is gone.
 * Inputs: the request, 'approved' or 'rejected', and the reason.
 * Returns: { outcome: 'ok' }.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access; check_violation with
 *   hint unknown_decision, reason_needed, not_waiting or proof_not_deleted.
 * Effects: the badge on approval; the audit log gets the decision, the way, the domain and the
 *   reason; the person is notified (teacher_check_decided), with no staff name.
 */
create or replace function public.admin_decide_teacher_check(check_id uuid, decision text, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.teacher_checks;
  clean_reason text := btrim(coalesce(reason, ''));
begin
  -- Step 1: who may decide, and a known decision with a reason (board 8.9).
  perform public.require_teacher_checks_access();
  if decision is null or decision not in ('approved', 'rejected') then
    raise exception 'Unknown decision.' using errcode = 'check_violation', hint = 'unknown_decision';
  end if;
  if char_length(clean_reason) not between 1 and 1000 then
    raise exception 'Write a reason (up to 1,000 characters).' using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 2: the request must still wait, and its proof must already be deleted.
  select * into request from public.teacher_checks
  where teacher_checks.id = admin_decide_teacher_check.check_id and teacher_checks.status = 'waiting_for_staff'
  for update;
  if not found then
    raise exception 'This request is already decided.' using errcode = 'check_violation', hint = 'not_waiting';
  end if;
  if request.proof_path is not null and exists (
      select 1 from storage.objects
      where objects.bucket_id = 'teacher-proofs' and objects.name = request.proof_path) then
    raise exception 'Delete the proof first.' using errcode = 'check_violation', hint = 'proof_not_deleted';
  end if;
  -- Step 3: the decision, with only the way, the outcome and the date kept (criterion 6).
  update public.teacher_checks
  set status = decision, decision_reason = clean_reason, decided_at = now(), proof_path = null
  where teacher_checks.id = request.id;
  if decision = 'approved' then
    perform public.grant_teacher_badge(request.user_id);
  end if;
  -- Step 4: the audit log and the person's notification.
  perform public.log_staff_action('teacher_check.decided', 'teacher_checks', request.id::text,
    request.user_id, clean_reason, null,
    jsonb_build_object('decision', decision, 'way', request.way, 'school_domain', request.school_domain));
  perform public.notify(request.user_id, 'teacher_check_decided', null, '{}'::jsonb);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.admin_decide_teacher_check(uuid, text, text) is
  'Staff: approves or turns down a Teacher badge request with a reason; logged and the person told (S1-E2-11).';
revoke execute on function public.admin_decide_teacher_check(uuid, text, text) from public, anon;
grant execute on function public.admin_decide_teacher_check(uuid, text, text) to authenticated;

/**
 * admin_remove_teacher_badge: takes a badge away, with a reason (criterion 8).
 * Inputs: the teacher's username and the reason. Returns: { outcome: 'ok' }.
 * Errors: insufficient_privilege (hint not_allowed) without Schools access; check_violation with
 *   hint reason_needed or not_a_teacher.
 * Effects: the badge goes; the audit log gets the reason and the date it was granted; the person
 *   is notified (teacher_badge_removed).
 */
create or replace function public.admin_remove_teacher_badge(teacher_handle text, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  teacher public.profiles;
  clean_reason text := btrim(coalesce(reason, ''));
begin
  perform public.require_teacher_checks_access();
  if char_length(clean_reason) not between 1 and 1000 then
    raise exception 'Write a reason (up to 1,000 characters).' using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  select * into teacher from public.profile_for_handle(teacher_handle);
  if not found or teacher.teacher_badge_since is null then
    raise exception 'This account has no Teacher badge.' using errcode = 'check_violation', hint = 'not_a_teacher';
  end if;
  update public.profiles set teacher_badge_since = null where profiles.id = teacher.id;
  perform public.log_staff_action('teacher_badge.removed', 'profiles', teacher.id::text, teacher.id,
    clean_reason, jsonb_build_object('teacher_badge_since', teacher.teacher_badge_since),
    jsonb_build_object('teacher_badge_since', null));
  perform public.notify(teacher.id, 'teacher_badge_removed', null, '{}'::jsonb);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.admin_remove_teacher_badge(text, text) is
  'Staff: removes a Teacher badge with a reason; logged and the person told (S1-E2-11).';
revoke execute on function public.admin_remove_teacher_badge(text, text) from public, anon;
grant execute on function public.admin_remove_teacher_badge(text, text) to authenticated;

/* ---------- The badge on the profile ---------- */

/**
 * get_writer_profile: as in S1-E5-05, plus is_teacher, which shows "Teacher" on the profile
 * (criterion 7). Never the date it was granted, the user ID, age, email or online status.
 */
create or replace function public.get_writer_profile(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writer public.profiles;
  is_me boolean;
  i_blocked boolean;
  story_cards jsonb;
begin
  -- Step 1: the live profile behind the username.
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found then
    return null;
  end if;
  is_me := caller_id is not null and caller_id = writer.id;
  -- Step 2: hidden or removed by a moderator: gone for everyone but its owner.
  if not is_me and public.is_moderated_away('profile', writer.id) then
    return null;
  end if;
  -- Step 3: this person blocks the caller: as if there were no such profile.
  if exists (select 1 from public.blocks where blocks.user_id = writer.id and blocks.blocked_user_id = caller_id) then
    return null;
  end if;
  -- Step 4: the caller blocks this person: the header only, so they can unblock.
  i_blocked := exists (select 1 from public.blocks where blocks.user_id = caller_id and blocks.blocked_user_id = writer.id);
  story_cards := case when i_blocked then '[]'::jsonb else public.profile_story_cards(writer.id, is_me) end;
  -- Step 5: the answer, from the public columns only.
  return jsonb_build_object(
    'handle', writer.handle,
    'display_name', public.display_name(writer.handle, writer.pen_name),
    'pen_name', nullif(btrim(coalesce(writer.pen_name, '')), ''),
    'bio', writer.bio,
    'joined_at', writer.created_at,
    'is_me', is_me,
    'i_blocked', i_blocked,
    'is_teacher', writer.teacher_badge_since is not null,
    'counts', jsonb_build_object(
      'stories', jsonb_array_length(story_cards),
      'chapters', (select coalesce(sum((story ->> 'chapter_count')::integer), 0) from jsonb_array_elements(story_cards) as story),
      'reads', (select coalesce(sum(chapter_reads.total), 0)
        from public.chapter_reads
        join public.chapters on chapters.id = chapter_reads.chapter_id
        where chapters.story_id in (select (story ->> 'id')::uuid from jsonb_array_elements(story_cards) as story)
          and public.chapter_is_readable(chapters.id))),
    'stories', story_cards
  );
end;
$$;

/* ---------- Notifications ---------- */

/**
 * notification_category: as in S1-E2-09, with the two Teacher badge kinds under the moderation
 * team's chip ("staff"): both come from us, not from another member (S1-E2-11).
 * Input: the kind. Returns: 'stories', 'follows', 'staff' or 'replies'. Internal: my_notifications().
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    else 'replies'
  end;
$$;
