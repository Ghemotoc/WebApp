/*
 * Certificates from class competition results (bundle CLASS-POINTS, part 3; story S1-E8-17;
 * Robert, 13 Nov 2026).
 *
 * What it does:
 * 1. A competition result is Winner, Finalist or Contestant; "Readers' choice" stays a flag
 *    beside it and can never be the result itself.
 * 2. A pupil may hold two class certificates for one programme: their result, and Readers'
 *    choice (decision 16). The one-per-programme rule becomes one per programme and slot.
 * 3. certificate_result_from() takes 'readers_choice' from the teacher's list.
 * 4. check_class_certificate_result(): what a class certificate may say. Below the 8th grade
 *    nobody is Winner or Finalist (decision 10); Readers' choice comes only from a confirmed
 *    competition; and a certificate named after a confirmed competition says what the teacher
 *    confirmed there, so the certificate and the Winner card always agree.
 * 5. issue_class_certificates() runs that check for every line before it signs anything.
 *
 * Who calls it: the teacher's Certificates page (ClassResultsForm), which the Winner card opens
 * with the competition's results filled in. Nothing changes for staff contests' certificates.
 * No new table, so no new policy: certificates keep their RLS (S1-E8-12).
 */

/* ---------- 1. Readers' choice is never a competition result ---------- */

alter table public.class_competition_results
  add constraint class_competition_results_result_is_placing
  check (result in ('winner', 'finalist', 'participant'));
comment on constraint class_competition_results_result_is_placing on public.class_competition_results is
  'A competition result is Winner, Finalist or Contestant; Readers'' choice is the flag beside it (S1-E8-15).';

/* ---------- 2. Two class certificates for one programme: the result and Readers' choice ---------- */

-- The slot a certificate fills for its programme: 1 for the result, 2 for Readers' choice.
alter table public.certificates
  add column award_slot smallint not null
  generated always as (case when result = 'readers_choice' then 2 else 1 end) stored;
comment on column public.certificates.award_slot is
  'Worked out from the result: 1 for Winner, Finalist or Contestant, 2 for Readers'' choice, so one pupil can hold both for one programme (S1-E8-17).';

-- Same name as before, so write_class_certificate()'s "on conflict on constraint" keeps working:
-- a second approval still changes the certificate in its own slot instead of adding one.
alter table public.certificates drop constraint certificates_one_per_programme;
alter table public.certificates
  add constraint certificates_one_per_programme unique (user_id, space_id, programme_name, award_slot);

/* ---------- 3. The teacher's list may name Readers' choice ---------- */

/**
 * certificate_result_from: a certificate result from the teacher's list.
 * Input: typed, the result as text.
 * Returns: the result.
 * Errors: check_violation with hint 'certificate:result' for anything but the four results.
 * Internal: issue_class_certificates(). Since CLASS-POINTS part 3 it also takes 'readers_choice';
 *   check_class_certificate_result() decides whether a pupil may have it.
 */
create or replace function public.certificate_result_from(typed text)
returns public.certificate_result
language plpgsql
immutable
set search_path = ''
as $$
begin
  if typed is null or typed not in ('participant', 'finalist', 'winner', 'readers_choice') then
    raise exception 'Choose Contestant, Finalist, Winner or Readers'' choice.'
      using errcode = 'check_violation', hint = 'certificate:result';
  end if;
  return typed::public.certificate_result;
end;
$$;

/* ---------- 4. What a class certificate may say ---------- */

/**
 * check_class_certificate_result: refuses a class certificate line that the class's school year
 * or its competition results don't allow.
 * Inputs: space, the class; student_id, the pupil; clean_programme, the programme's name;
 *   wanted_result, what the certificate would say.
 * What it checks:
 *   - below the 8th grade nobody is Winner or Finalist (Robert, 13 Nov 2026, decision 10);
 *   - Readers' choice needs a confirmed competition of this class with this name in which the
 *     pupil is Readers' choice (decision 16: never typed by hand);
 *   - when the programme is the name of a confirmed competition of this class, the certificate
 *     says what the teacher confirmed for that pupil there, and a pupil who didn't enter gets
 *     none (decision 17: only entrants get results).
 * Returns: nothing.
 * Errors: check_violation with hint 'certificate:no_winners', 'certificate:readers_choice' or
 *   'certificate:competition_result'.
 * Internal: issue_class_certificates().
 */
create function public.check_class_certificate_result(
  space public.spaces, student_id uuid, clean_programme text, wanted_result public.certificate_result)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  has_competition boolean;
  is_confirmed boolean;
begin
  -- Step 1: the school year's rule.
  if wanted_result in ('winner', 'finalist') and space.class_grade is not null
     and not public.class_winners_allowed(space.class_grade) then
    raise exception 'In this school year nobody is Winner or Finalist.'
      using errcode = 'check_violation', hint = 'certificate:no_winners';
  end if;
  -- Step 2: is the programme a confirmed competition of this class, and what did the teacher
  -- confirm for this pupil there?
  select count(*) > 0,
         coalesce(bool_or(results.pupil_user_id is not null and (
           (wanted_result = 'readers_choice' and results.readers_choice)
           or (wanted_result <> 'readers_choice' and results.result = wanted_result))), false)
    into has_competition, is_confirmed
  from public.class_competitions as competitions
  left join public.class_competition_results as results
    on results.competition_id = competitions.id and results.pupil_user_id = student_id
  where competitions.space_id = space.id and competitions.published_at is not null
    and competitions.name = clean_programme;
  -- Step 3: Readers' choice comes only from a competition.
  if wanted_result = 'readers_choice' and not is_confirmed then
    raise exception 'Readers'' choice comes from a class competition''s results.'
      using errcode = 'check_violation', hint = 'certificate:readers_choice';
  end if;
  -- Step 4: a competition's certificate says what was confirmed.
  if has_competition and not is_confirmed then
    raise exception 'This certificate must match the competition''s confirmed results.'
      using errcode = 'check_violation', hint = 'certificate:competition_result';
  end if;
end;
$$;
comment on function public.check_class_certificate_result(public.spaces, uuid, text, public.certificate_result) is
  'Internal: a class certificate follows the school year''s rule and, for a competition, its confirmed results (S1-E8-17).';
revoke execute on function public.check_class_certificate_result(public.spaces, uuid, text, public.certificate_result) from public, anon, authenticated;

/* ---------- 5. The teacher approves and signs ---------- */

/**
 * issue_class_certificates: the class's teacher approves a programme's results and signs them;
 * each student named gets a certificate.
 * Inputs: slug, the class's address; programme_name; results, a JSON list of {handle, result}
 *   (a pupil may appear twice: once with their result and once with 'readers_choice'); look,
 *   JSON {colour, pattern, seal, crest_colours} or null for the default.
 * Returns: JSON {issued}, how many certificates were made or changed.
 * Errors: as space_for_power() and check_certificate_class(); insufficient_privilege with hint
 *   'certificate:teacher_only'; check_violation with hint 'certificate:programme',
 *   'certificate:empty', 'certificate:crest', 'certificate:result', a look hint, or, since
 *   CLASS-POINTS part 3, 'certificate:no_winners', 'certificate:readers_choice' or
 *   'certificate:competition_result' (check_class_certificate_result()). One refused line
 *   refuses the whole list, so nothing is half signed.
 * Where it fits: ClassResultsForm on the teacher's Certificates page (S1-E8-12, G13a, G13b); the
 *   Winner card of a class competition opens it with the confirmed results filled in (S1-E8-17).
 *   Each student is notified and the class's log gets a line.
 */
create or replace function public.issue_class_certificates(slug text, programme_name text, results jsonb, look jsonb default null)
returns jsonb
language plpgsql
volatile
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
  -- Step 2: the look, checked before anything is written (G13a); a crest seal needs a crest (G13b).
  select * into chosen from public.certificate_look_from(look);
  if chosen.seal = 'crest' and space.crest_picture_id is null then
    raise exception 'Upload the school''s crest first, or choose the cat.' using errcode = 'check_violation', hint = 'certificate:crest';
  end if;
  select public.display_name(profiles.handle, profiles.pen_name) into teacher_display
  from public.profiles where profiles.id = space.user_id;
  -- Step 3: one certificate per student and slot; a second approval changes the result or the
  -- look. Each line must fit the school year and the competition's results (S1-E8-17).
  for entry in select value from jsonb_array_elements(results) loop
    student_id := public.certificate_student_id(space, entry ->> 'handle');
    wanted_result := public.certificate_result_from(entry ->> 'result');
    perform public.check_class_certificate_result(space, student_id, clean_programme, wanted_result);
    issued_id := public.write_class_certificate(space, student_id, clean_programme, wanted_result,
      teacher_display, array[chosen.colour, chosen.pattern, chosen.seal, chosen.crest_colours]);
    if issued_id is not null then
      issued_count := issued_count + 1;
      perform public.notify(student_id, 'certificate_issued', null, jsonb_build_object('space_id', space.id));
    end if;
  end loop;
  -- Step 4: the class's log, with the look.
  perform public.log_space_action(space, 'certificates_issued', null, null, null,
    jsonb_build_object('programme_name', clean_programme, 'count', issued_count,
      'look_colour', chosen.colour, 'look_pattern', chosen.pattern, 'look_seal', chosen.seal));
  return jsonb_build_object('issued', issued_count);
end;
$$;
