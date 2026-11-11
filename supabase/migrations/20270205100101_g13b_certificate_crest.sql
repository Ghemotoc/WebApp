/*
 * G13b: the school's crest in a certificate's seal (bundle G13 of the liquid glass rebuild; the
 * canvas's SpaceCertificates and Certificate boards, "In the seal" and "Crest colours").
 *
 * What it adds:
 * - spaces.crest_picture_id: the crest or logo a class's teacher uploaded for its certificates. It
 *   goes through the picture check like every other upload (CLAUDE.md rule 19) and shows only once
 *   the check passed; until then the Ghemotoc cat shows.
 * - register_certificate_crest(), set_class_certificate_crest() and class_certificate_crest(): the
 *   teacher's upload, choice and read. Only the class's own teacher, the person who signs.
 * - certificates.look_seal ('cat' or 'crest'), look_crest_colours ('own' on a white seal, or
 *   'white' on the certificate colour) and crest_picture_id: saved at signing like the colour and
 *   pattern (G13a), so a certificate keeps the crest it was signed with even after the teacher
 *   changes it. A crest a signed certificate still shows is never marked deleted.
 * - issue_class_certificates() reads the seal and the crest colours from the look; a crest seal
 *   needs an uploaded crest (hint certificate:crest).
 * - my_certificates() and class_certificates() return the seal, the crest colours and the crest's
 *   state (picture_state_json(): its file only to whoever may see it).
 * Who calls it: src/features/certificates/api/certificateCrest.ts, classCertificates.ts and
 * certificates.ts.
 */

/* ---------- 1. Where the crest is kept ---------- */

alter table public.spaces
  add column crest_picture_id uuid references public.picture_checks (id) on delete set null;
comment on column public.spaces.crest_picture_id is
  'The school crest the class''s teacher uploaded for its certificates (G13b); shown once its check passed.';
create index spaces_crest_picture on public.spaces (crest_picture_id) where crest_picture_id is not null;

-- A crest sits in the space-banners bucket, beside the class's banner and logo.
alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind in ('space_banner', 'space_logo', 'certificate_crest') and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or (kind = 'landing_picture' and bucket = 'landing-pictures')
  or (kind = 'sponsor_creative' and bucket = 'sponsor-creatives')
  or (kind = 'brand_asset' and bucket = 'brand-assets')
  or (kind = 'quote_card' and bucket = 'quote-card-pictures'));

/* ---------- 2. The seal on each certificate ---------- */

alter table public.certificates
  add column look_seal text not null default 'cat',
  add column look_crest_colours text not null default 'own',
  add column crest_picture_id uuid references public.picture_checks (id) on delete set null,
  add constraint certificates_look_seal_is_known check (look_seal in ('cat', 'crest')),
  add constraint certificates_look_crest_colours_is_known check (look_crest_colours in ('own', 'white')),
  -- A cat seal never names a crest. A crest seal names one, unless the crest's picture was later
  -- deleted for good (the foreign key sets it to null); the seal then shows the cat.
  add constraint certificates_crest_matches_seal check (look_seal = 'crest' or crest_picture_id is null);

comment on column public.certificates.look_seal is
  'What the seal shows: the Ghemotoc cat or the school''s crest; saved at signing (G13b).';
comment on column public.certificates.look_crest_colours is
  'A crest in its own colours on a white seal, or in white on the certificate colour (G13b).';
comment on column public.certificates.crest_picture_id is
  'The crest the certificate was signed with, when the seal shows one (G13b).';

/* ---------- 3. Uploading and choosing the crest ---------- */

/**
 * certificate_class_for_teacher: the live class whose own teacher is the caller.
 * Input: slug. Returns: the space.
 * Errors: as space_for_power() (the settings power) and check_certificate_class() (a live class);
 *   insufficient_privilege (certificate:teacher_only) for a co-teacher, because only the teacher
 *   signs.
 * Where it fits: the crest functions below, the same rule issue_class_certificates() applies.
 */
create or replace function public.certificate_class_for_teacher(slug text)
returns public.spaces
language plpgsql
-- Volatile, not stable: space_for_power() locks the class's row (select … for update), which
-- PostgREST refuses in the read-only transaction it runs a stable function in.
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
begin
  perform public.check_certificate_class(space);
  if space.user_id is distinct from (select auth.uid()) then
    raise exception 'Only the class''s teacher signs its certificates.'
      using errcode = 'insufficient_privilege', hint = 'certificate:teacher_only';
  end if;
  return space;
end;
$$;
comment on function public.certificate_class_for_teacher(text) is
  'Internal: the live class whose own teacher is the caller (G13b).';
revoke execute on function public.certificate_class_for_teacher(text) from public, anon, authenticated;

/**
 * register_certificate_crest: records a crest the class's teacher just uploaded, as pending its
 *   check.
 * Input: target_path ("<space ID>/<random ID>.png" in `space-banners`; the browser redraws an SVG
 *   as a PNG first, so no SVG markup is ever stored).
 * Returns: the picture's ID, which the screen sends to /api/picture-check and then gives to
 *   set_class_certificate_crest().
 * Errors: insufficient_privilege when signed out, when the account may not write or when the
 *   caller isn't the class's teacher; feature_not_supported while picture_uploads is off;
 *   check_violation when the file isn't there or isn't the caller's; program_limit_exceeded over
 *   the hourly upload limit (S1-E10-12).
 * Where it fits: uploadCertificateCrest(), straight after the upload; the same steps as
 *   register_space_logo() (G8b).
 */
create or replace function public.register_certificate_crest(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: a member who may write, while uploads are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add pictures right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there and the caller uploaded it, under a class they teach.
  if not public.space_banner_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'space-banners'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a space you can change.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.spaces
                 where spaces.id = split_part(target_path, '/', 1)::uuid
                   and spaces.kind = 'class' and spaces.user_id = caller_id) then
    raise exception 'Only the class''s teacher signs its certificates.'
      using errcode = 'insufficient_privilege', hint = 'certificate:teacher_only';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'space-banners', target_path, 'certificate_crest')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_certificate_crest(text) is
  'Records a just-uploaded school crest for a class''s certificates as pending its check (G13b).';
revoke execute on function public.register_certificate_crest(text) from public, anon;
grant execute on function public.register_certificate_crest(text) to authenticated;

/**
 * set_class_certificate_crest: makes an uploaded crest the class's crest, or (with null) takes it
 *   off.
 * Inputs: slug; picture_id, a certificate_crest the caller registered under this class, or null.
 * Returns: JSON {"old_file": {bucket, path} or null}: the replaced crest's file for the screen to
 *   delete, only when no signed certificate still shows it (a certificate keeps the crest it was
 *   signed with; build plan G13, "look saved at signing").
 * Errors: certificate_class_for_teacher()'s; check_violation (hint 'picture:not_yours') for a
 *   picture that isn't the caller's crest for this class.
 * Logged: 'certificate_crest_changed' in the class's log.
 */
create or replace function public.set_class_certificate_crest(slug text, picture_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.certificate_class_for_teacher(slug);
  old_file jsonb;
begin
  -- Step 1: the new picture is the caller's own crest, under this class's folder.
  if set_class_certificate_crest.picture_id is not null and not exists (
      select 1 from public.picture_checks
      where picture_checks.id = set_class_certificate_crest.picture_id
        and picture_checks.kind = 'certificate_crest' and picture_checks.deleted_at is null
        and picture_checks.user_id = (select auth.uid())
        and split_part(picture_checks.path, '/', 1) = space.id::text) then
    raise exception 'That picture isn''t a crest you uploaded for this class.' using errcode = 'check_violation', hint = 'picture:not_yours';
  end if;
  -- Step 2: the old crest is marked deleted and its file handed back, unless a certificate shows it.
  if space.crest_picture_id is not null
     and space.crest_picture_id is distinct from set_class_certificate_crest.picture_id
     and not exists (select 1 from public.certificates
                     where certificates.crest_picture_id = space.crest_picture_id) then
    update public.picture_checks set deleted_at = coalesce(deleted_at, now())
    where picture_checks.id = space.crest_picture_id
    returning jsonb_build_object('bucket', picture_checks.bucket, 'path', picture_checks.path) into old_file;
  end if;
  -- Step 3: the change, then the class's log.
  update public.spaces set crest_picture_id = set_class_certificate_crest.picture_id, updated_at = now()
  where spaces.id = space.id;
  perform public.log_space_action(space, 'certificate_crest_changed', null, null, null,
    jsonb_build_object('has_picture', set_class_certificate_crest.picture_id is not null));
  return jsonb_build_object('old_file', old_file);
end;
$$;
comment on function public.set_class_certificate_crest(text, uuid) is
  'Makes an uploaded crest a class''s certificate crest, or takes it off; the class''s teacher; logged (G13b).';
revoke execute on function public.set_class_certificate_crest(text, uuid) from public, anon;
grant execute on function public.set_class_certificate_crest(text, uuid) to authenticated;

/**
 * class_certificate_crest: the class's crest as the teacher's page draws it.
 * Input: slug. Returns: picture_state_json() of the crest, or null when the class has none.
 * Errors: certificate_class_for_teacher()'s.
 * Where it fits: the teacher's Certificates page, under "In the seal".
 */
create or replace function public.class_certificate_crest(slug text)
returns jsonb
language sql
-- Volatile, not stable: it reads the class through certificate_class_for_teacher(), which locks
-- the class's row; PostgREST refuses a lock in a stable function's read-only transaction.
volatile
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.picture_checks
  where picture_checks.id = (public.certificate_class_for_teacher(slug)).crest_picture_id
    and picture_checks.deleted_at is null;
$$;
comment on function public.class_certificate_crest(text) is
  'The class''s certificate crest for its teacher, as picture_state_json() (G13b).';
revoke execute on function public.class_certificate_crest(text) from public, anon;
grant execute on function public.class_certificate_crest(text) to authenticated;

/* ---------- 4. Reading the seal from the look ---------- */

drop function public.certificate_look_from(jsonb);

/**
 * certificate_look_from: reads and checks the look the teacher sent.
 * Input: look, a JSON object {colour, pattern, seal, crest_colours}, or null for the default
 *   (Plum, no pattern, the cat on its seal). A missing part keeps its default.
 * Returns: the colour, the pattern, the seal ('cat' or 'crest') and the crest colours ('own' or
 *   'white').
 * Errors: check_violation with the hint certificate:look for an unknown name, or for anything
 *   that isn't an object.
 * Where it fits: issue_class_certificates() calls it before writing any certificate.
 */
create function public.certificate_look_from(look jsonb, out colour text, out pattern text,
  out seal text, out crest_colours text)
language plpgsql
immutable
set search_path = ''
as $$
begin
  -- Step 1: no look means the default.
  colour := 'plum';
  pattern := 'none';
  seal := 'cat';
  crest_colours := 'own';
  if look is null or look = 'null'::jsonb then
    return;
  end if;
  if jsonb_typeof(look) <> 'object' then
    raise exception 'Choose a colour and a pattern from the list.' using errcode = 'check_violation', hint = 'certificate:look';
  end if;
  -- Step 2: each part is one of the known names; a missing part keeps its default.
  colour := coalesce(look ->> 'colour', colour);
  pattern := coalesce(look ->> 'pattern', pattern);
  seal := coalesce(look ->> 'seal', seal);
  crest_colours := coalesce(look ->> 'crest_colours', crest_colours);
  if colour not in ('plum', 'ember', 'sea_glass', 'pistachio', 'candy', 'crimson', 'cobalt', 'autumn')
     or pattern not in ('none', 'stripes', 'dots', 'grid', 'waves', 'starry', 'arches', 'rings', 'forestwaves')
     or seal not in ('cat', 'crest') or crest_colours not in ('own', 'white') then
    raise exception 'Choose a colour and a pattern from the list.' using errcode = 'check_violation', hint = 'certificate:look';
  end if;
end;
$$;
comment on function public.certificate_look_from(jsonb) is
  'Internal: the certificate look a teacher sent, checked; the default for null (G13a, G13b).';
revoke execute on function public.certificate_look_from(jsonb) from public, anon, authenticated;

/* ---------- 5. Signing with the seal ---------- */

/**
 * write_class_certificate: writes one student's class certificate, or re-signs it when its
 *   result or its look changed.
 * Input: the class, the student, the programme, the result, the teacher's display name and the
 *   look: colour, pattern, seal and crest colours, in that order. A crest seal takes the class's
 *   current crest.
 * Returns: the certificate's ID when it was written or changed, null when nothing changed (or it
 *   was revoked).
 * Where it fits: issue_class_certificates() calls it once for each student named.
 */
create or replace function public.write_class_certificate(
  space public.spaces, student_id uuid, clean_programme text,
  wanted_result public.certificate_result, teacher_display text, wanted_look text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted_seal text := coalesce(wanted_look[3], 'cat');
  wanted_crest uuid := case when coalesce(wanted_look[3], 'cat') = 'crest' then space.crest_picture_id end;
  written_id uuid;
begin
  -- One certificate per student and programme; a revoked one is never brought back.
  insert into public.certificates (user_id, space_id, teacher_user_id, programme_name, result,
    class_name, school_name, teacher_name, code, look_colour, look_pattern, look_seal,
    look_crest_colours, crest_picture_id)
  values (student_id, space.id, space.user_id, clean_programme, wanted_result,
    space.name, space.school_name, teacher_display, public.new_certificate_code(),
    wanted_look[1], wanted_look[2], wanted_seal, coalesce(wanted_look[4], 'own'), wanted_crest)
  on conflict on constraint certificates_one_per_programme do update
    set result = excluded.result, teacher_name = excluded.teacher_name,
        school_name = excluded.school_name, look_colour = excluded.look_colour,
        look_pattern = excluded.look_pattern, look_seal = excluded.look_seal,
        look_crest_colours = excluded.look_crest_colours,
        crest_picture_id = excluded.crest_picture_id, signed_at = now()
    where certificates.revoked_at is null
      and (certificates.result is distinct from excluded.result
           or certificates.look_colour is distinct from excluded.look_colour
           or certificates.look_pattern is distinct from excluded.look_pattern
           or certificates.look_seal is distinct from excluded.look_seal
           or certificates.look_crest_colours is distinct from excluded.look_crest_colours
           or certificates.crest_picture_id is distinct from excluded.crest_picture_id)
  returning certificates.id into written_id;
  return written_id;
end;
$$;
comment on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text, text[]) is
  'Internal: writes one student''s class certificate with its look and seal, or re-signs it when the result or look changed (S1-E8-12, G13a, G13b).';
revoke execute on function public.write_class_certificate(public.spaces, uuid, text, public.certificate_result, text, text[]) from public, anon, authenticated;

/**
 * issue_class_certificates: the class's teacher approves and signs a programme's results.
 * Input: slug (the class's address), programme_name, results (a list of {handle, result}) and
 *   look ({colour, pattern, seal, crest_colours}, optional: null keeps Plum, no pattern and the
 *   cat).
 * Returns: {issued: how many certificates were made or changed}.
 * Errors: insufficient_privilege (certificate:teacher_only) for anyone but the teacher;
 *   check_violation for a bad programme name, an empty list, an unknown student or result, an
 *   unknown look (certificate:look) or a crest seal in a class with no crest (certificate:crest).
 * Where it fits: the teacher's Certificates page in a class space signs through it; each student
 * is told by a notification.
 */
create or replace function public.issue_class_certificates(slug text, programme_name text, results jsonb, look jsonb default null)
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
  -- Step 2: the look, checked before anything is written (G13a); a crest seal needs a crest (G13b).
  select * into chosen from public.certificate_look_from(look);
  if chosen.seal = 'crest' and space.crest_picture_id is null then
    raise exception 'Upload the school''s crest first, or choose the cat.' using errcode = 'check_violation', hint = 'certificate:crest';
  end if;
  select public.display_name(profiles.handle, profiles.pen_name) into teacher_display
  from public.profiles where profiles.id = space.user_id;
  -- Step 3: one certificate per student named; a second approval changes the result or the look.
  for entry in select value from jsonb_array_elements(results) loop
    student_id := public.certificate_student_id(space, entry ->> 'handle');
    wanted_result := public.certificate_result_from(entry ->> 'result');
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

/* ---------- 6. Reading the seal ---------- */

/**
 * certificate_crest_json: a certificate's crest, as picture_state_json() draws it, or null for a
 *   cat seal. The file goes only to whoever may see it (everyone once the check passed).
 * Where it fits: my_certificates() and class_certificates().
 */
create or replace function public.certificate_crest_json(target public.certificates)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks) from public.picture_checks
  where picture_checks.id = target.crest_picture_id and picture_checks.deleted_at is null;
$$;
comment on function public.certificate_crest_json(public.certificates) is
  'Internal: a certificate''s crest as picture_state_json(), or null (G13b).';
revoke execute on function public.certificate_crest_json(public.certificates) from public, anon, authenticated;

/**
 * my_certificates: the caller's own certificates, newest first, with the printed name only they
 * see and the look saved at signing (G13a), seal and crest included (G13b).
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
             'look_colour', certificates.look_colour, 'look_pattern', certificates.look_pattern,
             'look_seal', certificates.look_seal, 'look_crest_colours', certificates.look_crest_colours,
             'crest', public.certificate_crest_json(certificates))
           order by certificates.signed_at desc)
    from public.certificates join public.profiles on profiles.id = certificates.user_id
    where certificates.user_id = caller_id), '[]'::jsonb);
end;
$$;

/**
 * class_certificates: a class's certificates for its teacher, without printed names, with each
 * one's look (G13a) and seal (G13b), so the page can start from the look last used.
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
             'look_colour', certificates.look_colour, 'look_pattern', certificates.look_pattern,
             'look_seal', certificates.look_seal, 'look_crest_colours', certificates.look_crest_colours)
           order by certificates.signed_at desc, certificates.programme_name)
    from public.certificates where certificates.space_id = space.id), '[]'::jsonb);
end;
$$;
