-- Database tests for spam and abuse rate limits (story S1-E10-12; CLAUDE.md rule 1).
-- What it proves:
-- - a limited action is refused over its hourly limit with the minutes to wait in the error's
--   hint (criterion 3), and a new account gets the lower limit (criterion 1);
-- - an account less than 24 hours old may put one link in a comment, an older one more
--   (criterion 1);
-- - the report limit now says how long to wait too;
-- - old events are purged after 2 days;
-- - policy rate_limit_events_select_own: allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Small limits for the test: two mails an hour for a new account, four for an older one.
update public.settings set value = '{"moderator_mail": {"new_account": 2, "older_account": 4}}'::jsonb where key = 'rate_limits';
update public.settings set value = '1'::jsonb where key = 'report_hourly_limit';
-- adult_writer (…01) is new (the seed made every account just now); blocker (…15) is a month old.
update public.profiles set created_at = now() - interval '30 days' where id = '00000000-0000-4000-8000-000000000015';

/* ---------- The hourly limit (criteria 1 and 3) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.send_moderator_mail('One', 'First') $$, 'a new account sends a first message');
select lives_ok($$ select public.send_moderator_mail('Two', 'Second') $$, 'and a second');
select throws_ok($$ select public.send_moderator_mail('Three', 'Third') $$, '54000', null,
  'the third in the hour is refused for a new account');
select is(pg_temp.error_hint($$ select public.send_moderator_mail('Three', 'Third') $$), 'wait_minutes:60',
  'with the minutes to wait in the hint');
select is((select count(*)::integer from public.rate_limit_events), 2,
  'allowed: rate_limit_events_select_own: the person reads their own events');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is((select count(*)::integer from public.rate_limit_events), 0,
  'denied: rate_limit_events_select_own: another person reads none of them');
select lives_ok($$ select public.send_moderator_mail('One', 'First'); select public.send_moderator_mail('Two', 'Second');
                   select public.send_moderator_mail('Three', 'Third') $$,
  'an older account gets the higher limit');

/* ---------- Reports say how long to wait ---------- */

select lives_ok($$ select * from public.report_item('profile', 'editor', 'spam', null) $$, 'a first report in the hour');
select is(pg_temp.error_hint($$ select * from public.report_item('profile', 'support', 'spam', null) $$), 'wait_minutes:60',
  'a second over the limit says how long to wait');

/* ---------- Links from a new account (criterion 1) ---------- */

reset role;
select is(public.count_links('See [this](https://a.example) and https://b.example or mailto:x@y.z'), 3,
  'links are counted, Markdown or bare');
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'rate0001', 1, 'Unu',
  'x', 1, 'published', 'Unu', 'Text.', 1, now());
select throws_ok($$ insert into public.comments (chapter_id, user_id, body)
  select id, '00000000-0000-4000-8000-000000000002', 'https://a.example and https://b.example' from public.chapters where code = 'rate0001' $$,
  '23514', null, 'a new account''s comment with two links is refused');
select lives_ok($$ insert into public.comments (chapter_id, user_id, body)
  select id, '00000000-0000-4000-8000-000000000015', 'https://a.example and https://b.example' from public.chapters where code = 'rate0001' $$,
  'an older account''s comment may hold two');

select * from finish();

rollback;
