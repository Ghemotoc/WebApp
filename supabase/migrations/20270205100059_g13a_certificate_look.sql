/*
 * G13a: the certificate look (bundle G13 of the liquid glass rebuild; the canvas's
 * SpaceCertificates and Certificate boards, "Certificate look: colour and pattern").
 *
 * What it adds:
 * - certificates.look_colour and certificates.look_pattern: the colour of the certificate's frame
 *   and the faint pattern behind its text. The teacher picks them for a programme and they are
 *   saved on each certificate when it is signed, so a certificate never changes its look later
 *   (build plan G13: "look saved at signing"). Contest certificates keep the default, Plum with no
 *   pattern.
 * - issue_class_certificates() takes the look as a fourth, optional argument (null keeps the
 *   default). Signing again with a different look re-signs the certificates whose look or result
 *   changed, so the student's certificate and its PDF follow the teacher's latest choice.
 * - my_certificates() and class_certificates() return the look: the student's sheet draws it, and
 *   the teacher's page starts from the look last used in the class.
 *
 * The colours are the board's eight (Plum, Ember, Sea glass, Pistachio, Candy, Crimson, Cobalt,
 * Autumn); the patterns are the cover patterns the board names, plus none. The school crest in
 * the seal comes in part G13b.
 * Who calls it: src/features/certificates/api/classCertificates.ts and certificates.ts.
 */

/* ---------- The look on each certificate ---------- */

alter table public.certificates
  add column look_colour text not null default 'plum',
  add column look_pattern text not null default 'none',
  add constraint certificates_look_colour_is_known check (look_colour in
    ('plum', 'ember', 'sea_glass', 'pistachio', 'candy', 'crimson', 'cobalt', 'autumn')),
  add constraint certificates_look_pattern_is_known check (look_pattern in
    ('none', 'stripes', 'dots', 'grid', 'waves', 'starry', 'arches', 'rings', 'forestwaves'));

comment on column public.certificates.look_colour is
  'The colour of the certificate''s frame, chosen by the teacher and saved at signing (G13a).';
comment on column public.certificates.look_pattern is
  'The faint pattern behind the certificate''s text, or none; saved at signing (G13a).';

/**
 * certificate_look_from: reads and checks the look the teacher sent.
 * Input: look, a JSON object {colour, pattern}, or null for the default (Plum, no pattern).
 * Returns: the colour and the pattern.
 * Errors: check_violation with the hint certificate:look for an unknown colour or pattern, or for
 *   anything that isn't an object.
 * Where it fits: issue_class_certificates() calls it before writing any certificate.
 */
create or replace function public.certificate_look_from(look jsonb, out colour text, out pattern text)
language plpgsql
immutable
set search_path = ''
as $$
begin
  -- Step 1: no look means the default.
  if look is null or look = 'null'::jsonb then
    colour := 'plum';
    pattern := 'none';
    return;
  end if;
  if jsonb_typeof(look) <> 'object' then
    raise exception 'Choose a colour and a pattern from the list.' using errcode = 'check_violation', hint = 'certificate:look';
  end if;
  -- Step 2: each part is one of the known names; a missing part keeps its default.
  colour := coalesce(look ->> 'colour', 'plum');
  pattern := coalesce(look ->> 'pattern', 'none');
  if colour not in ('plum', 'ember', 'sea_glass', 'pistachio', 'candy', 'crimson', 'cobalt', 'autumn')
     or pattern not in ('none', 'stripes', 'dots', 'grid', 'waves', 'starry', 'arches', 'rings', 'forestwaves') then
    raise exception 'Choose a colour and a pattern from the list.' using errcode = 'check_violation', hint = 'certificate:look';
  end if;
end;
$$;

comment on function public.certificate_look_from(jsonb) is
  'Internal: the certificate look a teacher sent, checked; the default for null (G13a).';

revoke execute on function public.certificate_look_from(jsonb) from public, anon, authenticated;

/* ---------- Signing with a look ---------- */

drop function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text);

/**
 * write_class_certificate: writes one student's class certificate, or re-signs it when its result
 * or its look changed.
 * Input: the class, the student, the programme, the result, the teacher's display name and the
 *   look (colour and pattern).
 * Returns: the certificate's ID when it was written or changed, null when nothing changed (or it
 *   was revoked).
 * Where it fits: issue_class_certificates() calls it once for each student named.
 */
create function public.write_class_certificate(
  space public.spaces, student_id uuid, clean_programme text,
  wanted_result public.certificate_result, teacher_display text, wanted_look text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  written_id uuid;
begin
  -- One certificate per student and programme; a revoked one is never brought back.
  insert into public.certificates (user_id, space_id, teacher_user_id, programme_name, result,
    class_name, school_name, teacher_name, code, look_colour, look_pattern)
  values (student_id, space.id, space.user_id, clean_programme, wanted_result,
    space.name, space.school_name, teacher_display, public.new_certificate_code(),
    wanted_look[1], wanted_look[2])
  on conflict on constraint certificates_one_per_programme do update
    set result = excluded.result, teacher_name = excluded.teacher_name,
        school_name = excluded.school_name, look_colour = excluded.look_colour,
        look_pattern = excluded.look_pattern, signed_at = now()
    where certificates.revoked_at is null
      and (certificates.result is distinct from excluded.result
           or certificates.look_colour is distinct from excluded.look_colour
           or certificates.look_pattern is distinct from excluded.look_pattern)
  returning certificates.id into written_id;
  return written_id;
end;
$$;

comment on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text, text[]) is
  'Internal: writes one student''s class certificate with its look, or re-signs it when the result or look changed (S1-E8-12, G13a).';

revoke execute on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text, text[]) from public, anon, authenticated;

drop function public.issue_class_certificates(text, text, jsonb);

/**
 * issue_class_certificates: the class's teacher approves and signs a programme's results.
 * Input: slug (the class's address), programme_name, results (a list of {handle, result}) and
 *   look ({colour, pattern}, optional: null keeps Plum with no pattern).
 * Returns: {issued: how many certificates were made or changed}.
 * Errors: insufficient_privilege (certificate:teacher_only) for anyone but the teacher;
 *   check_violation for a bad programme name, an empty list, an unknown student or result, or an
 *   unknown look (certificate:look).
 * Where it fits: the teacher's Certificates page in a class space signs through it; each student
 * is told by a notification.
 */
create function public.issue_class_certificates(slug text, programme_name text, results jsonb, look jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  clean_programme text := btrim(coalesce(programme_name, ''));
  chosen record;
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
  -- Step 2: the look, checked before anything is written (G13a).
  select * into chosen from public.certificate_look_from(look);
  select public.display_name(profiles.handle, profiles.pen_name) into teacher_display
  from public.profiles where profiles.id = space.user_id;
  -- Step 3: one certificate per student named; a second approval changes the result or the look.
  for entry in select value from jsonb_array_elements(results) loop
    student_id := public.certificate_student_id(space, entry ->> 'handle');
    wanted_result := public.certificate_result_from(entry ->> 'result');
    issued_id := public.write_class_certificate(space, student_id, clean_programme, wanted_result,
      teacher_display, array[chosen.colour, chosen.pattern]);
    if issued_id is not null then
      issued_count := issued_count + 1;
      perform public.notify(student_id, 'certificate_issued', null, jsonb_build_object('space_id', space.id));
    end if;
  end loop;
  -- Step 4: the class's log, with the look.
  perform public.log_space_action(space, 'certificates_issued', null, null, null,
    jsonb_build_object('programme_name', clean_programme, 'count', issued_count,
      'look_colour', chosen.colour, 'look_pattern', chosen.pattern));
  return jsonb_build_object('issued', issued_count);
end;
$$;

comment on function public.issue_class_certificates(text, text, jsonb, jsonb) is
  'The class''s teacher approves and signs a programme''s results with a look; each student gets a certificate (S1-E8-12, G13a).';

revoke execute on function public.issue_class_certificates(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.issue_class_certificates(text, text, jsonb, jsonb) to authenticated;

/* ---------- Reading the look ---------- */

/**
 * my_certificates: the caller's own certificates, newest first, with the printed name only they
 * see and, since G13a, the look saved at signing.
 * Returns: a JSON list.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: My certificates and the certificate page.
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
                              from public.contests where contests.id = certificates.contest_id),
             'look_colour', certificates.look_colour, 'look_pattern', certificates.look_pattern)
           order by certificates.signed_at desc)
    from public.certificates join public.profiles on profiles.id = certificates.user_id
    where certificates.user_id = caller_id), '[]'::jsonb);
end;
$$;

/**
 * class_certificates: a class's certificates for its teacher, without printed names, and since
 * G13a with each one's look, so the page can start from the look last used.
 * Input: slug, the class's address.
 * Returns: a JSON list, newest first.
 * Errors: as space_for_power() (not the class's teacher or co-teacher with settings).
 * Where it fits: the teacher's Certificates page.
 */
create or replace function public.class_certificates(slug text)
returns jsonb
language plpgsql
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
             'is_revoked', certificates.revoked_at is not null,
             'look_colour', certificates.look_colour, 'look_pattern', certificates.look_pattern)
           order by certificates.signed_at desc, certificates.programme_name)
    from public.certificates where certificates.space_id = space.id), '[]'::jsonb);
end;
$$;
