/*
 * Migration: contest certificates (bundle CONTESTS, part b2c; story S1-E11-15 criterion 9,
 * through S1-E8-12).
 *
 * What it adds:
 * - certificates.contest_id: a certificate now comes from a class programme (space_id, as in
 *   CLASSES-e) or from a contest (contest_id), never both. A contest certificate has no class and
 *   no teacher, so class_name and teacher_name are only required for class certificates;
 * - admin_issue_contest_certificates(): once a contest's results are published, the owner or an
 *   admin issues a certificate to every valid entry: winners and finalists by their placing, every
 *   other valid entry as a participant. Running it again only changes a certificate whose placing
 *   changed; each writer gets one notification per certificate made or changed;
 * - my_certificates() also returns the contest's name in both languages (so the sheet prints it in
 *   the language the writer picks) and is_contest;
 * - set_certificate_printed_name() already refuses a certificate without a class: a contest
 *   certificate prints the pen name only, because a real name is stored only with a class
 *   certificate (CLAUDE.md rule 5; decided 17 Oct 2026, 12:44).
 * Who calls it: src/features/contests/ (Staff › Contests, the results panel) and
 *   src/features/certificates/ (My certificates and the sheet).
 * What comes next: the admin epic check (part 13b2d).
 */

/* ---------- 1. A certificate can come from a contest ---------- */

alter table public.certificates
  -- The contest it came from (S1-E11-15). A contest that issued certificates can't be deleted,
  -- because the certificate's code must keep checking out.
  add column contest_id uuid references public.contests (id) on delete restrict,
  alter column class_name drop not null,
  alter column teacher_name drop not null,
  -- A certificate comes from a class or from a contest, never both.
  add constraint certificates_class_or_contest
    check (contest_id is null or space_id is null),
  -- A class certificate prints its class and its teacher (S1-E8-12); a contest certificate prints
  -- neither.
  add constraint certificates_class_prints_class_and_teacher
    check (contest_id is not null or (class_name is not null and teacher_name is not null));

comment on column public.certificates.contest_id is
  'The contest a certificate came from; null for a class certificate (S1-E11-15 criterion 9).';

-- One certificate per writer and contest: issuing again changes the result, never adds a second.
create unique index certificates_one_per_contest
  on public.certificates (user_id, contest_id) where contest_id is not null;

/* ---------- 2. Issuing a contest's certificates ---------- */

/**
 * write_contest_certificate: writes or updates one writer's certificate for a contest. A revoked
 * certificate stays revoked, and an unchanged result changes nothing.
 * Inputs: contest, entry (a valid entry). Returns: the certificate's ID when it was made or
 *   changed, or null. Internal: admin_issue_contest_certificates().
 */
create or replace function public.write_contest_certificate(contest public.contests, entry public.contest_entries)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted_result public.certificate_result := coalesce(entry.award, 'participant')::public.certificate_result;
  programme text;
  written_id uuid;
begin
  -- Step 1: the programme's name in the writer's own language, for the public check page.
  select case when profiles.locale = 'en' then contest.name_en else contest.name_ro end into programme
  from public.profiles where profiles.id = entry.user_id;
  -- Step 2: one certificate per writer and contest; a second run only changes the result.
  insert into public.certificates (user_id, contest_id, programme_name, result, code)
  values (entry.user_id, contest.id, left(coalesce(programme, contest.name_ro), 120), wanted_result,
    public.new_certificate_code())
  on conflict (user_id, contest_id) where contest_id is not null do update
    set result = excluded.result, signed_at = now()
    where certificates.revoked_at is null and certificates.result is distinct from excluded.result
  returning certificates.id into written_id;
  return written_id;
end;
$$;
comment on function public.write_contest_certificate(public.contests, public.contest_entries) is
  'Internal: writes one writer''s contest certificate (S1-E11-15 criterion 9).';
revoke execute on function public.write_contest_certificate(public.contests, public.contest_entries) from public, anon, authenticated;

/**
 * admin_issue_contest_certificates: "Issue certificates" in the contest's results panel
 *   (criterion 9). Every valid entry gets a certificate: winner, finalist or participant.
 * Inputs: target_contest_id. Returns: { issued } (how many certificates were made or changed).
 * Errors (each with a hint the screen turns into words): insufficient_privilege (not owner or
 *   admin); no_data_found (no_contest); check_violation (not_published: the results must be out
 *   first, so a certificate never says more than the public page).
 * Effects: a certificate_issued notification per certificate made or changed, pointing at the
 *   contest's page; the audit log, in the same transaction.
 */
create or replace function public.admin_issue_contest_certificates(target_contest_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  contest public.contests;
  entry public.contest_entries;
  issued_count integer := 0;
begin
  -- Step 1: only the owner and admins, and only after the results are published.
  perform public.require_contest_staff();
  select * into contest from public.contests where contests.id = target_contest_id for update;
  if contest.id is null then
    raise exception 'There is no such contest.' using errcode = 'no_data_found', hint = 'no_contest';
  end if;
  if contest.results_published_at is null then
    raise exception 'Publish the results first.' using errcode = 'check_violation', hint = 'not_published';
  end if;
  -- Step 2: one certificate per valid entry; withdrawn and disqualified entries get none.
  for entry in
    select * from public.contest_entries
    where contest_entries.contest_id = contest.id and contest_entries.status = 'valid'
  loop
    if public.write_contest_certificate(contest, entry) is not null then
      issued_count := issued_count + 1;
      perform public.notify(entry.user_id, 'certificate_issued', null,
        jsonb_build_object('landing_page_id', contest.landing_page_id));
    end if;
  end loop;
  -- Step 3: the audit row.
  perform public.log_staff_action('contest.certificates_issued', 'contests', contest.id::text, null,
    null, null, jsonb_build_object('count', issued_count));
  return jsonb_build_object('issued', issued_count);
end;
$$;
comment on function public.admin_issue_contest_certificates(uuid) is
  'Owner and admins: issue certificates to a contest''s valid entries once its results are out (S1-E11-15 criterion 9).';
revoke execute on function public.admin_issue_contest_certificates(uuid) from public, anon;
grant execute on function public.admin_issue_contest_certificates(uuid) to authenticated;

/* ---------- 3. The writer's list knows contest certificates ---------- */

/**
 * my_certificates: as in CLASSES-e, plus is_contest and contest_name ({ro, en}, the contest's name
 *   in both languages, or null for a class certificate), so the sheet prints a contest certificate
 *   in the language the writer picks, with one signature and no class.
 * Returns: a JSON array, newest first, of {id, code, programme_name, result, class_name,
 *   school_name, teacher_name, signed_at, is_revoked, printed_name, pen_name, name_deleted_on,
 *   signatory_name, is_contest, contest_name}.
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
  -- Step 1: only a signed-in person has certificates.
  if caller_id is null then
    raise exception 'Log in to see your certificates.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: their own certificates, class and contest alike.
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
                                where settings.key = 'certificate_signatory_name'),
             'is_contest', certificates.contest_id is not null,
             'contest_name', (select jsonb_build_object('ro', contests.name_ro, 'en', contests.name_en)
                              from public.contests where contests.id = certificates.contest_id))
           order by certificates.signed_at desc)
    from public.certificates join public.profiles on profiles.id = certificates.user_id
    where certificates.user_id = caller_id), '[]'::jsonb);
end;
$$;
