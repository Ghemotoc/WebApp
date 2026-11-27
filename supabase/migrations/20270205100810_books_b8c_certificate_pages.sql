/*
 * Migration: the winner's notice and the public check's answer (bundle BOOKS-8, part 8c; boards
 * G13 and G17, user stories 8.13 and 8.17).
 *
 * Why:
 * - G13 (user story 8.13): "Shown the first time they open the class after the results came out.
 *   Done closes it." The database remembers when the Winner closed the notice
 *   (class_competition_results.winner_notice_seen_at), so it shows once on any device.
 *   class_winner_notice() gives the Winner the notice that is still due; dismiss_class_winner_notice()
 *   closes it.
 * - G17 (user story 8.17): "Real: the result and programme, who it was given to (first name and
 *   the first letter of the last name, or the pen name), the class and school, who signed it and
 *   when. A withdrawn certificate says so, with the date." verify_certificate() adds
 *   'class_name', 'teacher_name', 'is_contest' and 'revoked_at'. It still answers no pupil's name
 *   at all: story S1-E8-12's criterion ("never the student's name") wins over the board
 *   (CLAUDE.md, Designs), so "who it was given to" waits for Robert (docs/board-fixes.md, G17).
 * Privacy: no name of the pupil, real or pen, reaches a visitor (CLAUDE.md rule 5; GDPR art.
 *   5(1)(c)); the class, the school and the teacher already print on the certificate.
 * Who calls it: src/features/class-competitions/api/winnerNotice.ts (the notice) and
 *   src/features/certificates/api/certificates.ts (the check).
 * Tests: supabase/tests/database/417-certificate-pages.test.sql.
 */

/* ---------- 1. The winner's notice (G13) ---------- */

alter table public.class_competition_results
  add column winner_notice_seen_at timestamp with time zone;

comment on column public.class_competition_results.winner_notice_seen_at is
  'When the Winner closed the "You''re the winner" notice; null until then (BOOKS-8c, user story 8.13).';

/**
 * class_winner_notice: the "You're the winner" notice the caller still has to see in one class.
 * Input: slug, the class's address.
 * Returns: JSON {competition_id, name, teacher_name, winner_name, story_title, story_slug,
 *   chapter_code} for the
 *   newest published competition the caller won and hasn't closed the notice of; null when there
 *   is none, when the caller isn't an active member, or when signed out.
 * Errors: none; anything the caller may not see answers null.
 * Flow: the class page (WinnerNotice → useWinnerNotice) → here; Done calls
 *   dismiss_class_winner_notice().
 */
create function public.class_winner_notice(slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  space public.spaces;
  notice jsonb;
begin
  -- Step 1: only a signed-in, active member of a live class.
  if caller_id is null then
    return null;
  end if;
  select * into space from public.spaces
  where spaces.slug = class_winner_notice.slug and spaces.kind = 'class' and spaces.deleted_at is null;
  if space.id is null or not exists (
      select 1 from public.space_members as members
      where members.space_id = space.id and members.user_id = caller_id and members.status = 'active') then
    return null;
  end if;
  -- Step 2: the newest published competition the caller won whose notice is still open, with the
  -- teacher's name, the caller's own pen name ("by …") and the winning chapter's address (no score
  -- or point, user story 8.13).
  select jsonb_build_object(
           'competition_id', competitions.id,
           'name', competitions.name,
           'teacher_name', public.display_name(teacher.handle, teacher.pen_name),
           'winner_name', public.display_name(winner.handle, winner.pen_name),
           'story_title', stories.title,
           'story_slug', stories.slug,
           'chapter_code', chapters.code)
  into notice
  from public.class_competition_results as results
  join public.class_competitions as competitions on competitions.id = results.competition_id
  join public.profiles as teacher on teacher.id = space.user_id
  join public.profiles as winner on winner.id = results.pupil_user_id
  left join public.chapters on chapters.id = results.winning_chapter_id and chapters.deleted_at is null
  left join public.stories on stories.id = chapters.story_id and stories.deleted_at is null
  where competitions.space_id = space.id
    and competitions.published_at is not null
    and results.pupil_user_id = caller_id
    and results.result = 'winner'
    and results.winner_notice_seen_at is null
  order by competitions.published_at desc
  limit 1;
  return notice;
end;
$$;

comment on function public.class_winner_notice(text) is
  'The "You''re the winner" notice the caller still has to see in a class, or null (BOOKS-8c, user story 8.13).';
revoke execute on function public.class_winner_notice(text) from public, anon;
grant execute on function public.class_winner_notice(text) to authenticated;

/**
 * dismiss_class_winner_notice: the Winner closes the notice; it never shows again.
 * Input: target_competition_id, the competition the notice is about.
 * Returns: true when the caller's own Winner notice was closed now, false when there was none
 *   open (already closed, not the Winner, or signed out).
 * Errors: none.
 * Flow: WinnerNotice's Done (and its Close ×) → useWinnerNotice → here.
 */
create function public.dismiss_class_winner_notice(target_competition_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  closed_count integer;
begin
  -- Only the caller's own Winner row, and only once.
  update public.class_competition_results set winner_notice_seen_at = now()
  where class_competition_results.competition_id = target_competition_id
    and class_competition_results.pupil_user_id = caller_id
    and class_competition_results.result = 'winner'
    and class_competition_results.winner_notice_seen_at is null;
  get diagnostics closed_count = row_count;
  return closed_count > 0;
end;
$$;

comment on function public.dismiss_class_winner_notice(uuid) is
  'The Winner closes the "You''re the winner" notice, once (BOOKS-8c, user story 8.13).';
revoke execute on function public.dismiss_class_winner_notice(uuid) from public, anon;
grant execute on function public.dismiss_class_winner_notice(uuid) to authenticated;

/* ---------- 2. The public check (G17) ---------- */

/**
 * verify_certificate: anyone checks a certificate's code (S1-E8-12; BOOKS-8c, user story 8.17).
 * Input: code, as typed: case and spaces don't matter.
 * Returns: JSON {status} with 'valid', 'revoked', 'retired' or 'unknown'. A known certificate adds
 *   programme_name, result, school_name, class_name, teacher_name, is_contest, signed_at and
 *   revoked_at (null unless revoked); never the pupil's name (S1-E8-12 criterion 6).
 * Errors: none.
 * Flow: VerifyCertificatePage → useCertificateCheck → here.
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
  -- Step 1: a certificate with this code: what it says and who signed it, never the pupil's name.
  select * into target from public.certificates where certificates.code = clean_code;
  if target.id is not null then
    return jsonb_build_object('status', public.certificate_status(target),
      'programme_name', target.programme_name, 'result', target.result,
      'school_name', target.school_name, 'class_name', target.class_name,
      'teacher_name', target.teacher_name, 'is_contest', target.contest_id is not null,
      'signed_at', target.signed_at, 'revoked_at', target.revoked_at);
  end if;
  -- Step 2: a deleted certificate's code, kept so it never says "unknown" by mistake.
  if exists (select 1 from public.retired_certificate_codes where retired_certificate_codes.code = clean_code) then
    return jsonb_build_object('status', 'retired');
  end if;
  return jsonb_build_object('status', 'unknown');
end;
$$;

comment on function public.verify_certificate(text) is
  'Public: whether a certificate code is valid, revoked or no longer available, with the programme, result, class, school, teacher and dates; never the pupil''s name (S1-E8-12; BOOKS-8c, user story 8.17).';
