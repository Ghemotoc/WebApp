/*
 * Migration: writing certificates for class programmes (bundle CLASSES, part e; story S1-E8-12;
 * boards Certificate-Participation and Certificate-Winner).
 *
 * What it adds:
 * - certificates: one row per student and programme, with the result, a unique code, the class's
 *   school and teacher as printed, and the student's real name only when they typed one for a class
 *   certificate (the one exception to "store no legal names", CLAUDE.md rule 5; decided 17 Oct
 *   2026, 12:44);
 * - retired_certificate_codes: the codes of certificates deleted with their account, with nothing
 *   else, so the verification page can say "no longer available" (criterion 8);
 * - issue_class_certificates(): the teacher approves the results list in the class space; the
 *   approval is the teacher's signature (how the signature is captured is OPEN, Q71: proposal, the
 *   approval itself, logged, printed with "signed electronically");
 * - class_certificates(), my_certificates(), set_certificate_printed_name(), verify_certificate();
 * - staff: admin_certificate() and admin_revoke_certificate() (criterion 7), with the audit log;
 * - archive_class_space() now tells the teacher in the app and by email (criterion 3);
 * - purge_class_certificate_names(), run nightly by run_retention_jobs(): deletes printed names 30
 *   days after the class is archived (docs/retention.md); the certificate then prints the pen name
 *   (proposal: criterion 3 leaves it to Robert).
 * Contests (S1-E12-02) don't exist yet, so only class programmes issue certificates for now.
 * Who calls it: src/features/certificates/ and src/features/staff/ (Schools › Certificates).
 */

/* ---------- 1. The tables ---------- */

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  -- The student the certificate belongs to (CLAUDE.md rule 15). Deleted with their account.
  user_id uuid not null references public.profiles (id),
  -- The class it came from. A deleted class leaves the certificate with its printed details.
  space_id uuid references public.spaces (id) on delete set null,
  -- The teacher who approved the results and signs second (Q23, Q71). Their account may go; the
  -- signed certificate keeps the name it printed.
  teacher_user_id uuid references public.profiles (id) on delete set null,
  -- The programme as the teacher named it, for example "Cercul de scriere 2026–2027".
  programme_name text not null
    constraint certificates_programme_length check (char_length(programme_name) between 1 and 120),
  result public.certificate_result not null,
  -- What prints on the certificate, copied when the teacher signs, so a later rename changes nothing.
  class_name text not null,
  school_name text,
  teacher_name text not null,
  -- The code anyone can check on the verification page, e.g. "CL27-7K4M-Q9".
  code text not null unique,
  -- GDPR art. 5(1)(c): the student's real name, only on a class certificate, only if they typed
  -- one; deleted 30 days after the class is archived (decided 17 Oct 2026, 12:44).
  printed_name text
    constraint certificates_printed_name_length check (printed_name is null or char_length(printed_name) between 1 and 80),
  signed_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text
    constraint certificates_revoke_reason_length check (revoke_reason is null or char_length(revoke_reason) between 1 and 500),
  revoked_by_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificates_one_per_programme unique (user_id, space_id, programme_name)
);
comment on table public.certificates is
  'kind: user_action
A student''s writing certificate from a class programme; the real name only with it, deleted 30 days after the class is archived (S1-E8-12).';
create index certificates_space_id on public.certificates (space_id);
create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();
alter table public.certificates enable row level security;
grant select on public.certificates to authenticated;

/**
 * Policy certificates_select_own: the student reads their own certificates. Teachers, staff and
 * the verification page read only through functions that never show the user ID or, to anyone but
 * the student, the printed name.
 */
create policy certificates_select_own
  on public.certificates for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy certificates_select_own on public.certificates is
  'Allows a student to read their own certificates; everyone else reads through functions (S1-E8-12).';

create table public.retired_certificate_codes (
  id uuid primary key default gen_random_uuid(),
  -- Only the code: no person, no programme, nothing that points back to the student.
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.retired_certificate_codes is
  'kind: platform
Codes of certificates deleted with their account, so the check page says "no longer available" (S1-E8-12 criterion 8).';
create trigger retired_certificate_codes_set_updated_at
  before update on public.retired_certificate_codes
  for each row execute function public.set_updated_at();
-- Only verify_certificate() reads it for the check page; admins may read it to answer a school.
alter table public.retired_certificate_codes enable row level security;
grant select on public.retired_certificate_codes to authenticated;

/**
 * retired_certificate_codes_select_admin: the owner and admins read the retired codes (to answer a
 * school asking about one); nobody else reads them directly. No one writes: only the trigger adds.
 */
create policy retired_certificate_codes_select_admin
  on public.retired_certificate_codes
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));
comment on policy retired_certificate_codes_select_admin on public.retired_certificate_codes is
  'Allows the owner and admins to read retired certificate codes; everyone else uses verify_certificate() (S1-E8-12).';

/**
 * retire_certificate_code: when a certificate row is deleted (with its account), keeps its code
 * alone in retired_certificate_codes. Internal trigger.
 */
create or replace function public.retire_certificate_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.retired_certificate_codes (code) values (old.code) on conflict (code) do nothing;
  return old;
end;
$$;
comment on function public.retire_certificate_code() is
  'Internal: keeps a deleted certificate''s code so the check page says "no longer available" (S1-E8-12).';
revoke execute on function public.retire_certificate_code() from public, anon, authenticated;

create trigger certificates_retire_code
  after delete on public.certificates
  for each row execute function public.retire_certificate_code();

/* ---------- 2. Settings ---------- */

-- Who signs first for us (board Certificate-Winner). A setting, so a new signatory is one change.
insert into public.settings (key, value, is_public, description) values
  ('certificate_signatory_name', to_jsonb('Robert-Marian Stănescu'::text), false,
   'The name that signs certificates first, for the company (S1-E8-12; board Certificate-Winner).')
on conflict (key) do nothing;

/* ---------- 3. Helpers ---------- */

/**
 * new_certificate_code: a fresh unique code, "CL" plus the year's last two digits, then six
 *   characters from an alphabet without 0, 1, I, L and O, which read alike: "CL27-7K4M-Q9".
 * Returns: the code. Internal: issue_class_certificates().
 */
create or replace function public.new_certificate_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  random_bytes bytea;
  characters text;
  candidate text;
begin
  loop
    -- Step 1: six random characters (31 letters each: about 887 million codes a year).
    random_bytes := extensions.gen_random_bytes(6);
    characters := '';
    for position in 0..5 loop
      characters := characters || substr(alphabet, (get_byte(random_bytes, position) % 31) + 1, 1);
    end loop;
    candidate := 'CL' || to_char(now(), 'YY') || '-' || substr(characters, 1, 4) || '-' || substr(characters, 5, 2);
    -- Step 2: never a code in use or one retired with a deleted account.
    exit when not exists (select 1 from public.certificates where certificates.code = candidate)
      and not exists (select 1 from public.retired_certificate_codes where retired_certificate_codes.code = candidate);
  end loop;
  return candidate;
end;
$$;
comment on function public.new_certificate_code() is
  'Internal: a fresh unique certificate code such as CL27-7K4M-Q9 (S1-E8-12).';
revoke execute on function public.new_certificate_code() from public, anon, authenticated;

/**
 * clean_certificate_code: what someone typed, as a code: upper case, spaces taken out.
 * Internal: verify_certificate() and admin_certificate().
 */
create or replace function public.clean_certificate_code(typed text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(typed, ''), '\s', '', 'g'));
$$;
comment on function public.clean_certificate_code(text) is
  'Internal: a typed certificate code in upper case without spaces (S1-E8-12).';
revoke execute on function public.clean_certificate_code(text) from public, anon, authenticated;

/**
 * certificate_name_deleted_on: when a class certificate's printed name is deleted, 30 days after
 *   its class was archived (decided 17 Oct 2026, 12:44); null while the class isn't archived.
 * Internal: my_certificates() and purge_class_certificate_names().
 */
create or replace function public.certificate_name_deleted_on(target public.certificates)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select spaces.archived_at + interval '30 days'
  from public.spaces where spaces.id = target.space_id;
$$;
comment on function public.certificate_name_deleted_on(public.certificates) is
  'Internal: when a class certificate''s printed name is deleted (S1-E8-12).';
revoke execute on function public.certificate_name_deleted_on(public.certificates) from public, anon, authenticated;

/**
 * certificate_status: 'valid' or 'revoked'. Internal.
 */
create or replace function public.certificate_status(target public.certificates)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when target.revoked_at is null then 'valid' else 'revoked' end;
$$;
comment on function public.certificate_status(public.certificates) is
  'Internal: a certificate''s state on the check page (S1-E8-12).';
revoke execute on function public.certificate_status(public.certificates) from public, anon, authenticated;

/* ---------- 4. The teacher issues and signs ---------- */

/**
 * issue_class_certificates: the teacher approves a programme's results in their class; each
 *   student named gets (or keeps, with the new result) a certificate under "My certificates"
 *   (criteria 1 and 5).
 * Inputs: slug (the class), programme_name (1 to 120 characters), results (a JSON array of
 *   {handle, result}, result one of participant, finalist, winner).
 * Returns: { issued } (how many certificates were made or changed).
 * Errors: no_data_found (hint space:missing); insufficient_privilege (hint space:not_allowed)
 *   without the settings power, (hint certificate:teacher_only) for anyone but the class's teacher,
 *   who alone signs (Q23, Q71); check_violation with hint space:not_class, space:archived,
 *   certificate:programme, certificate:empty, certificate:result or certificate:not_member.
 * Effects: signed_at is the approval (the teacher's electronic signature, proposal for OPEN Q71);
 *   a notification per student; one line in the class's log.
 */
create or replace function public.issue_class_certificates(slug text, programme_name text, results jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  clean_programme text := btrim(coalesce(programme_name, ''));
  teacher_display text;
  entry jsonb;
  student_id uuid;
  wanted_result public.certificate_result;
  issued_id uuid;
  issued_count integer := 0;
begin
  -- Step 1: a live class, and only its own teacher signs.
  perform public.check_certificate_class(space);
  if space.user_id is distinct from (select auth.uid()) then
    raise exception 'Only the class''s teacher signs its certificates.'
      using errcode = 'insufficient_privilege', hint = 'certificate:teacher_only';
  end if;
  if char_length(clean_programme) not between 1 and 120 then
    raise exception 'Name the programme in 1 to 120 characters.' using errcode = 'check_violation', hint = 'certificate:programme';
  end if;
  if jsonb_typeof(results) is distinct from 'array' or jsonb_array_length(results) = 0 then
    raise exception 'Choose a result for at least one student.' using errcode = 'check_violation', hint = 'certificate:empty';
  end if;
  select public.display_name(profiles.handle, profiles.pen_name) into teacher_display
  from public.profiles where profiles.id = space.user_id;
  -- Step 2: one certificate per student named; a second approval changes the result.
  for entry in select value from jsonb_array_elements(results) loop
    student_id := public.certificate_student_id(space, entry ->> 'handle');
    wanted_result := public.certificate_result_from(entry ->> 'result');
    issued_id := public.write_class_certificate(space, student_id, clean_programme, wanted_result, teacher_display);
    if issued_id is not null then
      issued_count := issued_count + 1;
      perform public.notify(student_id, 'certificate_issued', null, jsonb_build_object('space_id', space.id));
    end if;
  end loop;
  -- Step 3: the class's log.
  perform public.log_space_action(space, 'certificates_issued', null, null, null,
    jsonb_build_object('programme_name', clean_programme, 'count', issued_count));
  return jsonb_build_object('issued', issued_count);
end;
$$;
comment on function public.issue_class_certificates(text, text, jsonb) is
  'The class''s teacher approves and signs a programme''s results; each student gets a certificate (S1-E8-12).';
revoke execute on function public.issue_class_certificates(text, text, jsonb) from public, anon;
grant execute on function public.issue_class_certificates(text, text, jsonb) to authenticated;

/**
 * check_certificate_class: refuses a space that isn't a live class (hint space:not_class or
 * space:archived). Internal: issue_class_certificates().
 */
create or replace function public.check_certificate_class(space public.spaces)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if space.kind <> 'class' then
    raise exception 'Only a class issues certificates.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if space.archived_at is not null then
    raise exception 'This class is archived.' using errcode = 'check_violation', hint = 'space:archived';
  end if;
end;
$$;
comment on function public.check_certificate_class(public.spaces) is
  'Internal: refuses a space that isn''t a live class (S1-E8-12).';
revoke execute on function public.check_certificate_class(public.spaces) from public, anon, authenticated;

/**
 * certificate_student_id: the active student with this username (with or without "@") in the
 * class (never the teacher).
 * Errors: check_violation (hint certificate:not_member). Internal.
 */
create or replace function public.certificate_student_id(space public.spaces, typed_handle text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  student_id uuid;
begin
  select space_members.user_id into student_id
  from public.space_members join public.profiles on profiles.id = space_members.user_id
  where space_members.space_id = space.id and space_members.status = 'active'
    and space_members.role <> 'owner'
    and profiles.handle = ltrim(lower(btrim(coalesce(typed_handle, ''))), '@');
  if student_id is null then
    raise exception 'Only the class''s students get its certificates.' using errcode = 'check_violation', hint = 'certificate:not_member';
  end if;
  return student_id;
end;
$$;
comment on function public.certificate_student_id(public.spaces, text) is
  'Internal: an active student of the class by username (S1-E8-12).';
revoke execute on function public.certificate_student_id(public.spaces, text) from public, anon, authenticated;

/**
 * certificate_result_from: the result named in the list. Errors: check_violation (hint
 * certificate:result). Internal.
 */
create or replace function public.certificate_result_from(typed text)
returns public.certificate_result
language plpgsql
immutable
set search_path = ''
as $$
begin
  if typed is null or typed not in ('participant', 'finalist', 'winner') then
    raise exception 'Choose taking part, finalist or winner.' using errcode = 'check_violation', hint = 'certificate:result';
  end if;
  return typed::public.certificate_result;
end;
$$;
comment on function public.certificate_result_from(text) is
  'Internal: a certificate result from the teacher''s list (S1-E8-12).';
revoke execute on function public.certificate_result_from(text) from public, anon, authenticated;

/**
 * write_class_certificate: makes the student's certificate, or changes its result and signature
 *   when the teacher approves again. A revoked certificate stays revoked.
 * Returns: the certificate's ID, or null when nothing changed. Internal.
 */
create or replace function public.write_class_certificate(
  space public.spaces,
  student_id uuid,
  clean_programme text,
  wanted_result public.certificate_result,
  teacher_display text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  written_id uuid;
begin
  insert into public.certificates (user_id, space_id, teacher_user_id, programme_name, result,
    class_name, school_name, teacher_name, code)
  values (student_id, space.id, space.user_id, clean_programme, wanted_result,
    space.name, space.school_name, teacher_display, public.new_certificate_code())
  on conflict on constraint certificates_one_per_programme do update
    set result = excluded.result, teacher_name = excluded.teacher_name,
        school_name = excluded.school_name, signed_at = now()
    where certificates.revoked_at is null and certificates.result is distinct from excluded.result
  returning certificates.id into written_id;
  return written_id;
end;
$$;
comment on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text) is
  'Internal: writes one student''s class certificate (S1-E8-12).';
revoke execute on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text) from public, anon, authenticated;

/**
 * class_certificates: every certificate issued in a class, for its teacher's page. Never the
 *   student's printed name or user ID.
 * Input: slug. Returns: a JSON array of {student (forum_person_json), programme_name, result,
 *   code, signed_at, is_revoked}, newest first.
 * Errors: as space_for_power(slug, 'settings').
 */
create or replace function public.class_certificates(slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('student', public.forum_person_json(certificates.user_id),
             'programme_name', certificates.programme_name, 'result', certificates.result,
             'code', certificates.code, 'signed_at', certificates.signed_at,
             'is_revoked', certificates.revoked_at is not null)
           order by certificates.signed_at desc, certificates.programme_name)
    from public.certificates where certificates.space_id = space.id), '[]'::jsonb);
end;
$$;
comment on function public.class_certificates(text) is
  'A class''s certificates for its teacher, without printed names (S1-E8-12).';
revoke execute on function public.class_certificates(text) from public, anon;
grant execute on function public.class_certificates(text) to authenticated;

/* ---------- 5. The student ---------- */

/**
 * my_certificates: the signed-in student's certificates, for "My certificates" and the printable
 *   certificate.
 * Returns: a JSON array, newest first, of {id, code, programme_name, result, class_name,
 *   school_name, teacher_name, signed_at, is_revoked, printed_name, pen_name, name_deleted_on,
 *   signatory_name}. printed_name falls back to nothing; the page prints pen_name instead.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_certificates()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to see your certificates.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', certificates.id, 'code', certificates.code,
             'programme_name', certificates.programme_name, 'result', certificates.result,
             'class_name', certificates.class_name, 'school_name', certificates.school_name,
             'teacher_name', certificates.teacher_name, 'signed_at', certificates.signed_at,
             'is_revoked', certificates.revoked_at is not null,
             'printed_name', certificates.printed_name,
             'pen_name', public.display_name(profiles.handle, profiles.pen_name),
             'name_deleted_on', public.certificate_name_deleted_on(certificates),
             'signatory_name', (select settings.value #>> '{}' from public.settings
                                where settings.key = 'certificate_signatory_name'))
           order by certificates.signed_at desc)
    from public.certificates join public.profiles on profiles.id = certificates.user_id
    where certificates.user_id = caller_id), '[]'::jsonb);
end;
$$;
comment on function public.my_certificates() is
  'The caller''s own certificates, with the printed name only they see (S1-E8-12).';
revoke execute on function public.my_certificates() from public, anon;
grant execute on function public.my_certificates() to authenticated;

/**
 * set_certificate_printed_name: the student types the real name their class certificate prints
 *   with the school's name, or clears it (criterion 2). Stored only on this certificate.
 * Inputs: certificate_id, printed_name (1 to 80 characters; empty clears it).
 * Returns: { printed_name }.
 * Errors: insufficient_privilege when signed out; no_data_found (hint certificate:missing) for a
 *   certificate that isn't the caller's; check_violation with hint certificate:revoked,
 *   certificate:name_deleted (more than 30 days after the class was archived) or
 *   certificate:name_length.
 */
create or replace function public.set_certificate_printed_name(certificate_id uuid, printed_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.certificates;
  clean_name text := nullif(btrim(regexp_replace(coalesce(printed_name, ''), '\s+', ' ', 'g')), '');
begin
  if caller_id is null then
    raise exception 'Log in to change your certificate.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.certificates
  where certificates.id = certificate_id and certificates.user_id = caller_id for update;
  if target.id is null or target.space_id is null then
    raise exception 'There is no such certificate.' using errcode = 'no_data_found', hint = 'certificate:missing';
  end if;
  if target.revoked_at is not null then
    raise exception 'This certificate was revoked.' using errcode = 'check_violation', hint = 'certificate:revoked';
  end if;
  if public.certificate_name_deleted_on(target) < now() then
    raise exception 'Printed names are deleted 30 days after the class is archived.' using errcode = 'check_violation', hint = 'certificate:name_deleted';
  end if;
  if char_length(clean_name) > 80 then
    raise exception 'Write the name in 80 characters or fewer.' using errcode = 'check_violation', hint = 'certificate:name_length';
  end if;
  update public.certificates set printed_name = clean_name where certificates.id = target.id;
  return jsonb_build_object('printed_name', clean_name);
end;
$$;
comment on function public.set_certificate_printed_name(uuid, text) is
  'The student writes or clears the real name their class certificate prints (S1-E8-12 criterion 2).';
revoke execute on function public.set_certificate_printed_name(uuid, text) from public, anon;
grant execute on function public.set_certificate_printed_name(uuid, text) to authenticated;

/* ---------- 6. Anyone checks a code ---------- */

/**
 * verify_certificate: the public check page (criteria 6 to 8). Never the student's name.
 * Input: code, as typed (spaces and case don't matter).
 * Returns: { status } with 'valid', 'revoked', 'retired' (deleted with its account: "no longer
 *   available") or 'unknown'; for valid and revoked also programme_name, result, school_name and
 *   signed_at.
 */
create or replace function public.verify_certificate(code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_code text := public.clean_certificate_code(code);
  target public.certificates;
begin
  select * into target from public.certificates where certificates.code = clean_code;
  if target.id is not null then
    return jsonb_build_object('status', public.certificate_status(target),
      'programme_name', target.programme_name, 'result', target.result,
      'school_name', target.school_name, 'signed_at', target.signed_at);
  end if;
  if exists (select 1 from public.retired_certificate_codes where retired_certificate_codes.code = clean_code) then
    return jsonb_build_object('status', 'retired');
  end if;
  return jsonb_build_object('status', 'unknown');
end;
$$;
comment on function public.verify_certificate(text) is
  'Public: whether a certificate code is valid, revoked or no longer available, never the name (S1-E8-12).';
revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

/* ---------- 7. Staff ---------- */

/**
 * admin_certificate: staff with Schools access look a certificate up by its code. No printed name.
 * Returns: {code, status, programme_name, result, class_name, school_name, teacher_name, signed_at,
 *   revoked_at, revoke_reason, student (forum_person_json)} or null when there is none.
 * Errors: insufficient_privilege (hint not_allowed).
 */
create or replace function public.admin_certificate(code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.certificates;
begin
  perform public.require_teacher_checks_access();
  select * into target from public.certificates
  where certificates.code = public.clean_certificate_code(admin_certificate.code);
  if target.id is null then
    return null;
  end if;
  return jsonb_build_object('code', target.code, 'status', public.certificate_status(target),
    'programme_name', target.programme_name, 'result', target.result,
    'class_name', target.class_name, 'school_name', target.school_name,
    'teacher_name', target.teacher_name, 'signed_at', target.signed_at,
    'revoked_at', target.revoked_at, 'revoke_reason', target.revoke_reason,
    'student', public.forum_person_json(target.user_id));
end;
$$;
comment on function public.admin_certificate(text) is
  'Staff (Schools): one certificate by its code, without the printed name (S1-E8-12).';
revoke execute on function public.admin_certificate(text) from public, anon;
grant execute on function public.admin_certificate(text) to authenticated;

/**
 * admin_revoke_certificate: staff revoke a certificate made in error or after a rule breach
 *   (criterion 7). The check page then says "revoked".
 * Inputs: code, reason (1 to 500 characters). Returns: { status: 'revoked' }.
 * Errors: insufficient_privilege (hint not_allowed); no_data_found (hint certificate:missing);
 *   check_violation (hint certificate:reason or certificate:revoked).
 * Effects: the audit log, in the same transaction.
 */
create or replace function public.admin_revoke_certificate(code text, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.certificates;
  clean_reason text := btrim(coalesce(reason, ''));
begin
  perform public.require_teacher_checks_access();
  select * into target from public.certificates
  where certificates.code = public.clean_certificate_code(admin_revoke_certificate.code) for update;
  if target.id is null then
    raise exception 'There is no such certificate.' using errcode = 'no_data_found', hint = 'certificate:missing';
  end if;
  if char_length(clean_reason) not between 1 and 500 then
    raise exception 'Say why, in 1 to 500 characters.' using errcode = 'check_violation', hint = 'certificate:reason';
  end if;
  if target.revoked_at is not null then
    raise exception 'This certificate is already revoked.' using errcode = 'check_violation', hint = 'certificate:revoked';
  end if;
  update public.certificates
  set revoked_at = now(), revoke_reason = clean_reason, revoked_by_user_id = (select auth.uid())
  where certificates.id = target.id;
  perform public.log_staff_action('certificate.revoked', 'certificates', target.id::text, target.user_id,
    clean_reason, jsonb_build_object('status', 'valid'), jsonb_build_object('status', 'revoked'));
  return jsonb_build_object('status', 'revoked');
end;
$$;
comment on function public.admin_revoke_certificate(text, text) is
  'Staff (Schools): revokes a certificate; logged (S1-E8-12 criterion 7).';
revoke execute on function public.admin_revoke_certificate(text, text) from public, anon;
grant execute on function public.admin_revoke_certificate(text, text) to authenticated;

/* ---------- 8. Archiving tells the teacher ---------- */

/**
 * archive_class_space: as in CLASSES-d, plus a notification to the teacher, in the app and by
 *   email, to keep their own copies of the class's certificates within 30 days (criterion 3).
 */
create or replace function public.archive_class_space(slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  -- Step 1: only a class, and only once.
  if space.kind <> 'class' then
    raise exception 'Only a class space is archived.' using errcode = 'check_violation', hint = 'space:not_class';
  end if;
  if space.archived_at is not null then
    raise exception 'This class is already archived.' using errcode = 'check_violation', hint = 'space:archived';
  end if;
  -- Step 2: archived now, and locked from now if the lock date is still ahead.
  update public.spaces
  set archived_at = now(), locks_at = least(coalesce(spaces.locks_at, now()), now())
  where spaces.id = space.id
  returning * into space;
  -- Step 3: the space's log (and the audit log when staff did it).
  perform public.log_space_action(space, 'class_archived', null, null, null,
    jsonb_build_object('archived_at', space.archived_at));
  -- Step 4: the teacher keeps copies before the printed names go (decided 17 Oct 2026, 12:44).
  perform public.notify(space.user_id, 'class_archived', null, jsonb_build_object('space_id', space.id));
  return jsonb_build_object('is_archived', true, 'archived_at', space.archived_at,
    'is_locked', public.space_is_locked(space));
end;
$$;

/**
 * email_delivery_for: as in S1-E2-09, plus 'class_archived', always sent: the teacher must be told
 * by email (S1-E8-12 criterion 3).
 */
create or replace function public.email_delivery_for(target_user_id uuid, kind public.notification_kind)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kind in ('moderation_decision', 'login_method_added', 'login_method_removed', 'class_archived') then 'required'
    else coalesce(
      (select settings.delivery from public.notification_email_settings as settings
       where settings.user_id = target_user_id and settings.kind = email_delivery_for.kind),
      public.default_email_delivery(kind))::text
  end;
$$;

/**
 * notification_category: as in FORUMS-2d; a certificate and an archived class are notices from us.
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
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    else 'replies'
  end;
$$;

/* ---------- 9. Retention ---------- */

/**
 * purge_class_certificate_names: deletes the printed real names of class certificates 30 days
 *   after their class was archived, or once the class itself is gone (decided 17 Oct 2026, 12:44;
 *   docs/retention.md). The certificate then prints the pen name (proposal).
 * Returns: how many names were deleted. Internal: run_retention_jobs().
 */
create or replace function public.purge_class_certificate_names()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  update public.certificates set printed_name = null
  where certificates.printed_name is not null
    and (certificates.space_id is null
         or exists (select 1 from public.spaces where spaces.id = certificates.space_id
                    and spaces.archived_at < now() - interval '30 days'));
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;
comment on function public.purge_class_certificate_names() is
  'Internal retention job: deletes class certificates'' printed names 30 days after archiving (S1-E8-12).';
revoke execute on function public.purge_class_certificate_names() from public, anon, authenticated;

/**
 * run_retention_jobs: as in IDEAS-1b, plus purge_class_certificate_names (S1-E8-12).
 */
create or replace function public.run_retention_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name text;
  removed_count integer;
  total_removed integer := 0;
begin
  -- Accounts first, so their exports and pictures are caught by the purges after them.
  foreach job_name in array array[
    'purge_unconfirmed_accounts', 'purge_expired_exports', 'purge_deleted_pictures',
    'purge_old_staff_records', 'purge_old_audit_log', 'fold_old_daily_totals',
    'purge_old_reading_minutes', 'purge_class_certificate_names']
  loop
    execute format('select public.%I()', job_name) into removed_count;
    perform public.record_retention_run(job_name, removed_count);
    total_removed := total_removed + removed_count;
  end loop;
  return total_removed;
end;
$$;

/* ---------- 10. Data rights ---------- */

/**
 * data_export_tables: as in FORUMS-2e, plus certificates, with the printed name (S1-E8-12).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as in FORUMS-2e, plus certificates, deleted with the account; their
 * codes then show "no longer available" (S1-E8-12 criterion 8).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null);
$$;
