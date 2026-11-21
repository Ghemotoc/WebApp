-- Database tests for the trial's "Report a bug" button and the computers-only gate (TRIAL-1;
-- migration 20270205100414_trial1_feedback_and_desktop.sql).
-- What it proves:
-- - the two flags exist, start off, and anyone (signed out too) can read them, as the app's
--   front end needs them before anyone signs in;
-- - a bug report our server signed becomes a ticket under Bug, with its own subject in the
--   sender's language, and the page details stay in its first message;
-- - an unsigned bug report is refused, like any Contact us message;
-- - the other topics keep their subjects and categories.
begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- A payload signed as server/contact.ts signs it.
create function pg_temp.signed(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-support-secret', 'sha256'), 'hex');
$$;

delete from vault.secrets where name = 'support_ticket_secret';
select vault.create_secret('test-support-secret', 'support_ticket_secret');

/* ---------- 1. The flags ---------- */

select is((select count(*)::integer from public.feature_flags
           where key in ('trial_feedback', 'desktop_only') and not is_enabled and is_public), 2,
  'trial_feedback and desktop_only exist, public and off');
select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
select is((select count(*)::integer from public.feature_flags where key in ('trial_feedback', 'desktop_only')), 2,
  'a signed-out visitor reads both flags, so the gate can work before anyone signs in');

/* ---------- 2. A bug report ---------- */

select throws_ok($$ select public.submit_contact_ticket('{"topic": "bug_report", "message": "Kind: Something broke", "email": "a@b.test", "language": "en", "sentAt": "2099-01-01T00:00:00Z"}', 'bad') $$,
  '42501', null, 'an unsigned bug report isn''t saved');
create temporary table report_numbers on commit drop as
  select public.submit_contact_ticket(payloads.payload, pg_temp.signed(payloads.payload)) as number, payloads.who
  from (values
    ('english', json_build_object('topic', 'bug_report',
       'message', E'Kind: Something broke\nPage: /stories/turnul\nBrowser: Firefox 133 on Windows\nScreen: 1440 × 900 window, 1920 × 1080 screen\n\nThe Like button does nothing.',
       'email', 'Adult_Writer@personas.test', 'language', 'en', 'sentAt', now())::text),
    ('romanian', json_build_object('topic', 'bug_report', 'message', E'Kind: An idea\nPage: /\nBrowser: Chrome 131 on macOS\nScreen: 1280 × 800 window, 1280 × 800 screen\n\nO idee.',
       'email', 'stranger@example.test', 'language', 'ro', 'sentAt', now())::text),
    ('question', json_build_object('topic', 'question', 'message', 'Is it free?', 'email', 'stranger@example.test',
       'language', 'en', 'sentAt', now())::text)) as payloads (who, payload);
reset role;
select is((select subject || ' / ' || category::text from public.support_tickets
           where number = (select number from report_numbers where who = 'english')),
  'Bug report / bug', 'a signed bug report is a ticket called Bug report, under Bug');
select is((select subject from public.support_tickets
           where number = (select number from report_numbers where who = 'romanian')),
  'Raport de eroare', 'its subject is in the sender''s language');
select is((select requester_user_id from public.support_tickets
           where number = (select number from report_numbers where who = 'english')),
  '00000000-0000-4000-8000-000000000001'::uuid, 'a tester''s report joins their account');
select ok((select body like E'Kind: Something broke\nPage: /stories/turnul%' from public.support_ticket_messages
           where ticket_id = (select id from public.support_tickets
                              where number = (select number from report_numbers where who = 'english'))),
  'the page details stay at the top of the first message');
select is((select subject || ' / ' || category::text from public.support_tickets
           where number = (select number from report_numbers where who = 'question')),
  'Question / other', 'a question keeps its subject and category');

select * from finish();
rollback;
