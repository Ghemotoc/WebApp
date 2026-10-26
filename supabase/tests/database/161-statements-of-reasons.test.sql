-- Database tests for statements of reasons (story S1-E10-04; CLAUDE.md rule 1; DSA art. 17 and
-- art. 16(5)).
-- What it proves:
-- - a decision other than no_action sends the person a statement in their language with the
--   action, the facts, whether automated means were used, the rule relied on and until when it
--   can be challenged (criterion 1), linked from their notification;
-- - each reporter is told the outcome, never someone else's sanction (criterion 2);
-- - the statement is stored with the case and the case page reads it (criterion 3);
-- - a sanction from the account page sends its own statement; one from a case shares the case's;
-- - a raised rating (S1-E3-06's queued job) becomes a statement at once;
-- - a notifier who used the public form is queued for the decision email until it is sent;
-- - policies: statements_of_reasons_select_own (the person allowed, another member denied) and
--   statements_of_reasons_select_moderation (a moderator allowed, support denied); nobody writes
--   a statement directly.
begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
-- The newest notification of a kind in the caller's list, as the screen gets it.
create function pg_temp.newest(kind text) returns jsonb language sql as $$
  select notification from jsonb_array_elements(public.my_notifications() -> 'notifications') as notification
  where notification ->> 'kind' = kind limit 1;
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- The signed public form, as in test 145.
select vault.create_secret('test-notice-secret', 'public_notice_secret')
  where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
select vault.update_secret(id, 'test-notice-secret') from vault.secrets where name = 'public_notice_secret';

-- The seed's cases on the accounts this test decides are cleared, so it starts from a known state.
create temp table cleared as select id from public.cases where user_id in ((select teacher from ids), (select blocker from ids));
delete from public.banned_email_hashes where sanction_id in (select id from public.sanctions where case_id in (select id from cleared));
delete from public.notifications where case_id in (select id from cleared);
delete from public.sanctions where case_id in (select id from cleared);
delete from public.moderated_items where case_id in (select id from cleared);
delete from public.case_actions where case_id in (select id from cleared);
delete from public.public_notices where case_id in (select id from cleared);
delete from public.on_call_alerts where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);
update public.profiles set locale = 'en' where id = (select teacher from ids);

/* ---------- 1. A decision sends a statement (criterion 1) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'teacher', 'harassment', 'Insults in the bio') $$,
  'adult_writer reports teacher''s profile');
-- A notice from the public form joins the same case.
select lives_ok($$ select * from public.submit_public_notice(
    '{"kind": "notice", "reason": "harassment", "contentUrl": "/u/teacher", "explanation": "Insults.",
      "notifierName": "Ana", "notifierEmail": "ana@example.test", "goodFaith": true, "language": "ro"}',
    encode(extensions.hmac('{"kind": "notice", "reason": "harassment", "contentUrl": "/u/teacher", "explanation": "Insults.",
      "notifierName": "Ana", "notifierEmail": "ana@example.test", "goodFaith": true, "language": "ro"}',
      'test-notice-secret', 'sha256'), 'hex')) $$,
  'and someone writes about it through the public form');

reset role;
create temp table first_case as
  select id, reference from public.cases where user_id = (select teacher from ids) and status = 'open';
grant select on first_case to authenticated;
set local role authenticated;

select pg_temp.sign_in_as((select moderator from ids));
select lives_ok(
  $$ select public.admin_decide_case((select id from first_case), 'warn', 'Repeated insults, first warning.', null,
       'Your bio calls other writers names. Please change it.') $$,
  'the moderator warns, with a message to the person');

reset role;
select is((select count(*)::integer from public.statements_of_reasons where case_id = (select id from first_case)), 1,
  'one statement is stored with the case (criterion 3)');
select is((select action::text from public.statements_of_reasons where case_id = (select id from first_case)), 'warn',
  'it names the action');
select is((select facts from public.statements_of_reasons where case_id = (select id from first_case)),
  'Your bio calls other writers names. Please change it.', 'and the facts in the moderator''s words');
select is((select ground::text || ':' || ground_key from public.statements_of_reasons where case_id = (select id from first_case)),
  'terms:harassment', 'and the rule relied on (our terms: harassment)');
select is((select automated_detection or automated_decision from public.statements_of_reasons where case_id = (select id from first_case)),
  false, 'and says no automated means were used');
select is((select language from public.statements_of_reasons where case_id = (select id from first_case)), 'en',
  'in the person''s language');
select ok((select appeal_until between now() + interval '179 days' and now() + interval '185 days'
           from public.statements_of_reasons where case_id = (select id from first_case)),
  'and can be challenged for six months');
select is((select count(*)::integer from public.statements_of_reasons
           where sanction_id = (select id from public.sanctions where case_id = (select id from first_case))), 1,
  'the warning from the case shares the case''s statement: one, not two');

/* ---------- 2. The person reads it (policies) ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select teacher from ids));
select is((select count(*)::integer from public.statements_of_reasons), 1,
  'allowed: statements_of_reasons_select_own, the person reads their own statement');
select is(pg_temp.newest('moderation_decision') -> 'statement' ->> 'action', 'warn',
  'the decision''s notification links to the statement');
select is(public.my_statements() -> 0 ->> 'facts',
  'Your bio calls other writers names. Please change it.', 'and My reports and decisions shows it');
select is(public.my_statements() -> 0 ->> 'can_challenge', 'true', 'with the appeal still open');
select throws_ok($$ update public.statements_of_reasons set facts = 'Changed' $$, '42501', null,
  'denied: nobody changes a statement, not even its owner');
select throws_ok($$ insert into public.statements_of_reasons (reference, user_id, action, ground, ground_key, language, appeal_until)
                    values ('S-999999', (select teacher from ids), 'warn', 'terms', 'x', 'en', now()) $$, '42501', null,
  'denied: nor writes one directly');

select pg_temp.sign_in_as((select adult_writer from ids));
select is((select count(*)::integer from public.statements_of_reasons where user_id = (select teacher from ids)), 0,
  'denied: statements_of_reasons_select_own, another member reads none of them');
select is(jsonb_array_length(public.my_statements()), 0,
  'and their own list of decisions is empty');

select pg_temp.sign_in_as((select moderator from ids));
select is((select count(*)::integer from public.statements_of_reasons where case_id = (select id from first_case)), 1,
  'allowed: statements_of_reasons_select_moderation, a moderator reads it');
select is(jsonb_array_length(public.admin_case_statements((select id from first_case))), 1,
  'and the case page shows the stored statement');
select pg_temp.sign_in_as((select support from ids));
select is((select count(*)::integer from public.statements_of_reasons), 0,
  'denied: statements_of_reasons_select_moderation, support reads none');
select throws_ok($$ select public.admin_case_statements((select id from first_case)) $$, '42501', null,
  'nor the case''s statements');

/* ---------- 3. The reporters are told (criterion 2) ---------- */

select pg_temp.sign_in_as((select adult_writer from ids));
select is(pg_temp.newest('report_outcome') ->> 'outcome', 'acted',
  'the reporter is told the report was acted on');
select is(pg_temp.newest('report_outcome') ->> 'decision', null,
  'but not that the account was warned');
select is(pg_temp.newest('report_outcome') -> 'statement', 'null'::jsonb,
  'and never sees the person''s statement');
select is(pg_temp.newest('report_outcome') ->> 'category', 'staff', 'it sits under the staff filter');
select is(public.my_reports() -> 0 ->> 'outcome', 'acted', 'and My reports and decisions shows the same outcome');

select pg_temp.sign_in_as((select moderator from ids));
select is((select count(*)::integer from public.admin_due_decision_emails()
           where reference in (select reference from public.public_notices where case_id = (select id from first_case))), 1,
  'the notifier from the public form is waiting for the decision email (DSA art. 16(5))');
select is((select outcome from public.admin_due_decision_emails()
           where reference in (select reference from public.public_notices where case_id = (select id from first_case))), 'acted',
  'with the outcome only');
select is(public.admin_mark_decision_emails_sent(array(
    select notice_id from public.admin_due_decision_emails()
    where reference in (select reference from public.public_notices where case_id = (select id from first_case)))), 1,
  'marking it sent');
select is(public.admin_waiting_decision_email_count(), 0, 'leaves nothing waiting');
select pg_temp.sign_in_as((select support from ids));
select throws_ok($$ select * from public.admin_due_decision_emails() $$, '42501', null,
  'support can''t read the decision emails');

/* ---------- 4. No action, a law ground, and a hidden item ---------- */

select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'blocker', 'illegal_content', 'Selling something illegal') $$,
  'a second report, on blocker, for illegal content');
reset role;
create temp table second_case as select id from public.cases where user_id = (select blocker from ids) and status = 'open';
grant select on second_case to authenticated;
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select lives_ok($$ select public.admin_decide_case((select id from second_case), 'hide', 'Illegal offer in the bio.', null,
                    'Your profile offered something that is illegal to sell.') $$, 'the moderator hides it');
reset role;
select is((select ground::text || ':' || ground_key from public.statements_of_reasons where case_id = (select id from second_case)),
  'law:illegal_content', 'an illegal-content decision rests on the law (DSA art. 17(3)(d))');
select is((select item_type::text from public.statements_of_reasons where case_id = (select id from second_case)), 'profile',
  'and names what it was about');
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
-- Both decisions fall in one transaction, so their times tie: look for this outcome among them.
select ok(exists(select 1 from jsonb_array_elements(public.my_notifications() -> 'notifications') as notification
                 where notification ->> 'kind' = 'report_outcome' and notification ->> 'outcome' = 'removed'),
  'the reporter is told it came down');

/* ---------- 5. Outside a case ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select lives_ok($$ select public.admin_apply_sanction((select teacher from ids), 'suspension', 7, null,
                    'Kept insulting after the warning.', 'You kept insulting writers after our warning.') $$,
  'a suspension from the account page');
reset role;
select ok((select restriction_ends_at is not null and case_id is null and action = 'suspend'
           from public.statements_of_reasons where sanction_id = (select id from public.sanctions
             where user_id = (select teacher from ids) and kind = 'suspension')),
  'sends its own statement, with when the suspension ends');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select lives_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-000000000001', '18_plus',
                    'Graphic violence in chapter two.') $$, 'a moderator raises a story''s rating (S1-E3-06)');
reset role;
select is((select facts from public.statements_of_reasons
           where story_id = '00000000-0000-4000-9000-000000000001' and action = 'rating_raised'),
  'Graphic violence in chapter two.', 'the writer gets a statement at once, with the reason given');
select ok((select processed_at is not null from public.jobs where kind = 'statement_of_reasons_needed'
           order by created_at desc limit 1), 'and the queued job is done');

select * from finish();
rollback;
