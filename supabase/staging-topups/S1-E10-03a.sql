-- Staging top-up for story S1-E10-03a (moderation queue), 23 Oct 2026.
--
-- What it adds: the part of supabase/seed.sql that arrived after the test personas were loaded on
-- staging: the safeguarding permission for the owner and moderator personas, and the 20 moderation
-- cases across the tiers (14 open, 6 decided) that the queue shows at the demo.
-- Rules (supabase/staging-topups/README.md): adds no accounts, touches only persona rows and is
-- safe to run twice: it stops when the order TCO-0001 already exists.
-- How to check it worked: the last query shows open_cases 14 and decided_cases 6.
begin;

-- The safeguarding permission for owner and moderator (S1-E10-03a; decided 23 Oct 2026, Q6), so
-- the safeguarding cases below are visible to them and hidden from the admin persona, which lets
-- tests and hand checks see both sides.
insert into public.staff_permissions (user_id, permission, granted_by_user_id)
values
  ('00000000-0000-4000-8000-000000000008', 'safeguarding', '00000000-0000-4000-8000-000000000008'),
  ('00000000-0000-4000-8000-000000000010', 'safeguarding', '00000000-0000-4000-8000-000000000008')
on conflict (user_id, permission) do nothing;

-- Twenty moderation cases across the tiers (S1-E10-03a, Robert, 23 Oct 2026): 14 open (one
-- authority order on the one-hour clock, four same-day cases, three 48-hour cases and six 7-day
-- cases) and 6 decided. Report cases are made the real way, through report_item() as each
-- reporter, so they carry the reporter's age group and group onto one case per item (Q4); the
-- order and the two picture checks are inserted directly, as S1-E10-09 and S1-E10-05 will do.
-- Every item is a persona's profile (the one reportable type today, Q1). The teacher persona's
-- profile is left without an open case for the end-to-end test to report. Afterwards the cases
-- are re-dated so the queue shows a spread of deadlines, one of them past.
do $$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000008';
  admin_id constant uuid := '00000000-0000-4000-8000-000000000009';
  moderator_id constant uuid := '00000000-0000-4000-8000-000000000010';
  one_case record;
  one_report record;
  decided record;
  dated record;
begin
  -- Safe to run twice: the order TCO-0001 exists only once this block has run.
  if exists (select 1 from public.cases where reference = 'TCO-0001') then
    raise notice 'S1-E10-03a top-up already applied; nothing changed.';
    return;
  end if;
  -- Step 1: the six decided cases, each one report decided by the moderator or the admin.
  for decided in
    select * from (values
      ('adult_writer',   'teacher',      'other'::public.report_reason,      'Bio says they sell essays. Not clearly against a rule.',  moderator_id, 'no_action'::public.moderation_action, 'Looked at the bio: an offer of writing help, no sale. Nothing to act on.'),
      ('blocked',        'blocker',      'harassment',                       'Keeps calling me a copycat in replies.',                  moderator_id, 'warn',      'First upheld case. Warned about name-calling; the reply was removed by the writer meanwhile.'),
      ('teen_17',        'adult_writer', 'spam',                             'Posted the same link in six threads.',                    admin_id,     'no_action', 'The link is to their own story on this site; not spam under our rule.'),
      ('suspended_user', 'teacher',      'harassment',                       'Threatening private replies after I reported them.',      moderator_id, 'suspend',   'Second upheld case in 30 days. Next step on the ladder: a 7-day suspension.'),
      ('banned_user',    'teacher',      'hate',                             'Profile text attacks an ethnic group.',                   admin_id,     'ban',       'Repeat hate speech after a suspension. Ban; the email can''t be used to sign up again.'),
      ('kid_14_ok',      'teacher',      'illegal_content',                  'Posted someone''s home address.',                         moderator_id, 'remove',    'Personal data of another member. Removed the passage; the writer was told.')
    ) as rows (reported_handle, reporter_handle, reason, details, decided_by, action, note)
  loop
    perform set_config('request.jwt.claims', json_build_object(
      'sub', (select id from public.profiles where handle = decided.reporter_handle), 'role', 'authenticated')::text, true);
    perform public.report_item('profile', decided.reported_handle, decided.reason, decided.details);
    perform set_config('request.jwt.claims', json_build_object('sub', decided.decided_by, 'role', 'authenticated')::text, true);
    perform public.admin_decide_case(
      (select cases.id from public.cases join public.profiles on profiles.id = cases.user_id
        where profiles.handle = decided.reported_handle and cases.status = 'open'),
      decided.action, decided.note, case when decided.action = 'suspend' then 7 end);
  end loop;

  -- Step 2: the open report cases, one row per report; reports of one profile join one case.
  for one_report in
    select * from (values
      ('failed_check',   'kid_14_ok',      'child_sexual_content'::public.report_reason, 'An adult asked me for my phone number and photos.'),
      ('pending_check',  'teen_17',        'self_harm',             'Their bio says they want to hurt themselves tonight.'),
      ('banned_user',    'adult_writer',   'terrorism',             'The bio links to a group that calls for attacks.'),
      ('suspended_user', 'adult_writer',   'copied_published_work', 'Their bio is the back cover text of a published novel, word for word.'),
      ('suspended_user', 'blocker',        'copied_published_work', 'Copied from a book I own.'),
      ('editor',         'teacher',        'copyright',             'The profile picture is a photographer''s copyrighted work.'),
      ('blocked',        'adult_writer',   'harassment',            'Replies "nobody asked for your opinion, your chapters are cringe".'),
      ('blocked',        'teacher',        'harassment',            'Keeps replying to the same member with insults.'),
      ('blocked',        'kid_14_waiting', 'harassment',            'This is the third time they replied to me like this. I just want it to stop.'),
      ('teen_17',        'blocker',        'hate',                  'Bio calls another member "a talentless copycat" and worse.'),
      ('admin',          'blocked',        'spam',                  '"Get 1,000 readers free, click my link"'),
      ('admin',          'kid_14_ok',      'spam',                  'Same link again.'),
      ('admin',          'teen_17',        'spam',                  'Spam link in the bio.'),
      ('admin',          'adult_writer',   'spam',                  'Promotional link, posted everywhere.'),
      ('moderator',      'teacher',        'undisclosed_ai',        'Readers say the bio and the stories are AI-written; the profile says "No AI".'),
      ('kid_14_ok',      'suspended_user', 'harassment',            'Mocked my pen name in three replies.'),
      ('adult_writer',   'blocker',        'spam',                  'Bio is one long advert.')
    ) as rows (reported_handle, reporter_handle, reason, details)
  loop
    perform set_config('request.jwt.claims', json_build_object(
      'sub', (select id from public.profiles where handle = one_report.reporter_handle), 'role', 'authenticated')::text, true);
    perform public.report_item('profile', one_report.reported_handle, one_report.reason, one_report.details);
  end loop;
  perform set_config('request.jwt.claims', '', true);

  -- Step 3: the authority order (one-hour clock, TCO regulation art. 3(3); the removal orders
  -- screen is S1-E10-09) and the two picture checks (S1-E10-05: a known-abuse-image match is a
  -- same-day safeguarding case, nudity a 48-hour one), inserted as those stories will.
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'TCO-0001', id, 'profile', id, 'authority_order', 'one_hour', now() + interval '1 hour', false
  from public.profiles where handle = 'blocker';
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'P-0001', id, 'profile', id, 'picture_check', 'same_day', now() + interval '24 hours', true
  from public.profiles where handle = 'support';
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  select 'P-0002', id, 'profile', id, 'picture_check', 'two_days', now() + interval '48 hours', false
  from public.profiles where handle = 'kid_14_waiting';

  -- Step 4: re-date the open cases so the queue shows a spread: hours ago each was received, and
  -- its deadline from that moment. The same-day case on failed_check is already past its deadline.
  for dated in
    select * from (values
      ('blocker', 20), ('failed_check', 30), ('pending_check', 17), ('banned_user', 14), ('support', 15),
      ('suspended_user', 1), ('editor', 3), ('kid_14_waiting', 5),
      ('blocked', 1), ('teen_17', 2), ('admin', 4), ('moderator', 6), ('kid_14_ok', 8), ('adult_writer', 26)
    ) as rows (reported_handle, hours_ago)
  loop
    update public.cases set
      received_at = now() - make_interval(hours => dated.hours_ago),
      deadline_at = now() - make_interval(hours => dated.hours_ago) + make_interval(hours => public.tier_hours(tier))
    where status = 'open' and user_id = (select id from public.profiles where handle = dated.reported_handle);
  end loop;
  update public.reports set created_at = cases.received_at
  from public.cases where cases.id = reports.case_id and cases.status = 'open';
  -- The decided cases were received nine days ago and decided three days ago.
  update public.cases set received_at = now() - interval '9 days', deadline_at = now() - interval '2 days',
    decided_at = now() - interval '3 days' where status = 'decided';
  update public.reports set created_at = cases.received_at, closed_at = cases.decided_at
  from public.cases where cases.id = reports.case_id and cases.status = 'decided';
  update public.case_actions set created_at = cases.decided_at
  from public.cases where cases.id = case_actions.case_id;
end;
$$;

select
  count(*) filter (where status = 'open') as open_cases,
  count(*) filter (where status = 'decided') as decided_cases
from public.cases;

commit;
