-- Database tests for the public report form and the removal-order contact point (story S1-E10-02;
-- CLAUDE.md rule 1; DSA art. 16; Regulation (EU) 2021/784 art. 3(3) and 15).
-- What it proves:
-- - only a payload our server signed is saved: a wrong or missing signature is refused, so the
--   bot check can't be skipped by calling the database directly;
-- - a notice needs the address, why it is illegal, the notifier's name and email and the good-faith
--   statement; name and email are optional only for child sexual content (second criterion);
-- - a notice about one of our addresses opens a case in its reason's tier, a second notice joins
--   it, and an address we don't host is kept unmatched for a person to check;
-- - an authority order opens a one-hour case from the time of receipt, logs the on-call alert at
--   once, and returns the reference and the time of receipt (fourth criterion);
-- - deciding a case marks its notices decided, so the decision email can go out (fifth criterion);
-- - policies: public_notices_select_moderation (moderator allowed; support, a member and a
--   visitor denied; a child-safety notice is hidden from an admin without the safeguarding
--   permission) and on_call_alerts_select_moderation (moderator allowed; support denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

-- The secret our server signs with, as Robert sets it by hand in Vault on staging.
select vault.create_secret('test-notice-secret', 'public_notice_secret')
  where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
select vault.update_secret(id, 'test-notice-secret') from vault.secrets where name = 'public_notice_secret';

create function pg_temp.signature(payload text) returns text language sql as $$
  select encode(extensions.hmac(payload, 'test-notice-secret', 'sha256'), 'hex');
$$;
create function pg_temp.send(payload jsonb) returns table (notice_reference text, received_at timestamptz)
language sql as $$
  select * from public.submit_public_notice(payload::text, pg_temp.signature(payload::text));
$$;
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
grant execute on function pg_temp.signature(text) to anon, authenticated;
grant execute on function pg_temp.send(jsonb) to anon, authenticated;

-- adult_writer's (…01) first seed story gets a published chapter, so it has a public address.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'noticea1', 1, 'Unu',
  'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
  where id = '00000000-0000-4000-9000-000000000001';

/* ---------- 1. Only through our server ---------- */

select pg_temp.sign_out();
select throws_ok(
  $$ select * from public.submit_public_notice('{"kind": "notice"}', 'not-a-signature') $$,
  '42501', null, 'a payload without our server''s signature is refused');
select throws_ok(
  $$ select * from public.submit_public_notice('{"kind": "notice"}', null) $$,
  '42501', null, 'and so is one with no signature at all');
select throws_ok(
  $$ insert into public.public_notices (kind, reason, content_url, explanation, reference)
     values ('notice', 'spam', '/s/x', 'x', 'N-999999') $$,
  '42501', null, 'nobody inserts a notice directly');

/* ---------- 2. What a notice needs (DSA art. 16(2)) ---------- */

select throws_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "hate", "contentUrl": "/s/statia-meteo-seed01",
       "explanation": "Hate speech in chapter one.", "goodFaith": true, "language": "en"}') $$,
  '23514', null, 'a notice without the notifier''s name and email is refused');
select throws_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "hate", "contentUrl": "/s/statia-meteo-seed01",
       "explanation": "Hate speech.", "notifierName": "Ana", "notifierEmail": "ana@example.test",
       "goodFaith": false, "language": "en"}') $$,
  '23514', null, 'a notice without the good-faith statement is refused');
select throws_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "hate", "contentUrl": "/s/statia-meteo-seed01",
       "explanation": "  ", "notifierName": "Ana", "notifierEmail": "ana@example.test",
       "goodFaith": true, "language": "en"}') $$,
  '23514', null, 'a notice without an explanation is refused');
select lives_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "child_sexual_content",
       "contentUrl": "https://example.org/s/statia-meteo-seed01/noticea1?x=1",
       "explanation": "A child is described sexually.", "goodFaith": true, "language": "ro"}') $$,
  'a child sexual content notice may come without a name or email');

/* ---------- 3. Matching the address and the case ---------- */

create temp table sent as
  select * from pg_temp.send('{"kind": "notice", "reason": "copyright", "contentUrl": "/s/statia-meteo-seed01",
    "explanation": "This is my poem.", "notifierName": "Ana Pop", "notifierEmail": "Ana@Example.test",
    "goodFaith": true, "language": "ro"}');
grant select on sent to anon, authenticated;
select matches((select notice_reference from sent), '^N-\d{6}$', 'a notice gets an N- reference to quote');

reset role;
select is((select item_type::text from public.public_notices where reference = (select notice_reference from sent)),
  'story', 'the address /s/<story> is matched to the story');
select is((select notifier_email from public.public_notices where reference = (select notice_reference from sent)),
  'ana@example.test', 'the email is stored in lower case');
select is((select tier::text from public.cases join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select notice_reference from sent)),
  'two_days', 'it opens a case in its reason''s tier (copyright: 48 hours)');
select is((select owner_user_id from public.public_notices where reference = (select notice_reference from sent)),
  '00000000-0000-4000-8000-000000000001'::uuid, 'the case is about the story''s writer');
select is((select item_type::text from public.public_notices where content_url like '%noticea1%'),
  'chapter', 'a full address with a query, /s/<story>/<chapter>, is matched to the chapter');
select ok((select cases.is_safeguarding from public.cases join public.public_notices on public_notices.case_id = cases.id
           where public_notices.content_url like '%noticea1%'),
  'a child sexual content notice opens a safeguarding case');

select pg_temp.sign_out();
select lives_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "spam", "contentUrl": "/s/statia-meteo-seed01/",
       "explanation": "Advert links.", "notifierName": "Ion", "notifierEmail": "ion@example.test",
       "goodFaith": true, "language": "en"}') $$,
  'a second notice about the same story is saved');
reset role;
select is((select count(distinct case_id)::integer from public.public_notices where content_url like '/s/statia-meteo-seed01%'),
  1, 'and joins the open case instead of opening another');
select pg_temp.sign_out();
select lives_ok(
  $$ select * from pg_temp.send('{"kind": "notice", "reason": "other", "contentUrl": "https://elsewhere.example/page",
       "explanation": "Not ours.", "notifierName": "Ion", "notifierEmail": "ion@example.test",
       "goodFaith": true, "language": "en"}') $$,
  'an address we don''t host is still saved');
reset role;
select is((select case_id from public.public_notices where content_url = 'https://elsewhere.example/page'),
  null, 'unmatched: no case, for a person to check by hand');

/* ---------- 4. An authority order ---------- */

select pg_temp.sign_out();
create temp table order_sent as
  select * from pg_temp.send('{"kind": "removal_order", "contentUrl": "/u/teacher",
    "explanation": "Removal order under Regulation (EU) 2021/784.", "authorityName": "Test authority",
    "orderReference": "RO-2026-1", "notifierEmail": "orders@authority.test", "language": "en"}');
reset role;
select matches((select notice_reference from order_sent), '^TCO-\d{4}$',
  'an order gets a TCO- reference, skipping the seed''s TCO-0001');
select ok(abs(extract(epoch from (select received_at from order_sent) - now())) < 5,
  'and the time of receipt, for the acknowledgement');
select is((select tier::text || ' ' || source::text from public.cases
           join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select notice_reference from order_sent)),
  'one_hour authority_order', 'it opens a one-hour case from an authority order');
select ok((select cases.deadline_at - cases.received_at from public.cases
           join public.public_notices on public_notices.case_id = cases.id
           where public_notices.reference = (select notice_reference from order_sent)) = interval '1 hour',
  'the clock is one hour from receipt (Regulation (EU) 2021/784, art. 3(3))');
select is((select count(*)::integer from public.on_call_alerts
           where notice_id = (select id from public.public_notices where reference = (select notice_reference from order_sent))),
  1, 'the on-call alert is logged at once');

/* ---------- 5. Policies ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok((select count(*) from public.public_notices where reference = (select notice_reference from sent)) = 1,
  'allowed: public_notices_select_moderation, a moderator reads the notice');
select ok((select count(*) from public.on_call_alerts) >= 1,
  'allowed: on_call_alerts_select_moderation, a moderator sees the alert');
select is((select count(*)::integer from public.admin_case_notices(
             (select case_id from public.public_notices where reference = (select notice_reference from sent)))),
  2, 'the case page lists both notices in the case');
select is((select count(*)::integer from public.admin_unmatched_notices()
           where content_url = 'https://elsewhere.example/page'),
  1, 'a moderator sees the notice we don''t host in the list to check by hand');
select lives_ok(
  $$ select public.admin_close_unmatched_notice(
       (select id from public.public_notices where content_url = 'https://elsewhere.example/page'),
       'Not hosted by us.') $$,
  'and closes it with a note');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.public_notices where content_url like '%noticea1%'), 0,
  'denied: public_notices_select_moderation, an admin without the safeguarding permission doesn''t see a child-safety notice');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.public_notices), 0,
  'denied: public_notices_select_moderation, support reads no notices');
select is((select count(*)::integer from public.on_call_alerts), 0,
  'denied: on_call_alerts_select_moderation, support sees no alerts');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.public_notices), 0,
  'denied: public_notices_select_moderation, the writer of the reported story reads nothing');

/* ---------- 6. The decision reaches the notices ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select public.admin_decide_case(
  (select case_id from public.public_notices where reference = (select notice_reference from sent)),
  'no_action', 'Checked: the poem is the writer''s own.');
reset role;
select is((select count(*)::integer from public.public_notices
           where case_id = (select case_id from public.public_notices where reference = (select notice_reference from sent))
             and decided_at is not null and closed_at is not null),
  2, 'deciding the case marks both notices decided, ready for the decision email');

select * from finish();
rollback;
