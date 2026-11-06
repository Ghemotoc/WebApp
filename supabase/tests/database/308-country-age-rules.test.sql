-- Database tests for the age rules by country (bundle MARKETS-1, stories S1-E2-20 to S1-E2-22;
-- Robert, 6 Nov 2026: Romanian and English speakers everywhere, each country's own ages).
-- What it proves:
-- - the 57 seeded rules load; a region's rule wins over its country's, an unlisted country gets
--   the strictest default ("ZZ");
-- - age_rule_outcome(): a 14-year-old is fine in the UK and in Quebec, needs a parent in Romania
--   and is blocked in Australia;
-- - the year of birth needs the month also at a country's own ages (Quebec 14);
-- - sign-up: the chosen country is checked and never "ZZ"; Australia refuses a 14-year-old;
-- - policy country_age_rules_select_public: anyone may read the rules, nobody writes them directly;
-- - admin_save_age_rule(): owner and admin only, with a reason, audited with before and after;
-- - set_my_country(): the new country's rule decides, a refused change saves nothing, and a new
--   need for a parent's consent starts 14 days' grace; so does a rule change by staff;
-- - after the grace the account waits for a parent, read-only.
-- Personas: kid_14_waiting (…04, born 14 years ago, Romania), admin (…09), moderator (…10).
-- Test data: rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- After March: minors may join, so adults_only is off; parental consent stays on.
update public.feature_flags set is_enabled = false where key in ('adults_only', 'invite_only');
update public.feature_flags set is_enabled = true where key = 'parental_consent';
-- The kid is 14 by the year alone, wherever the test runs in the year.
update public.profiles set birth_year = extract(year from now())::integer - 15, birth_month = null
  where id = '00000000-0000-4000-8000-000000000004';

/* ---------- 1. The rules ---------- */

select is((select count(*)::integer from public.country_age_rules), 57, 'the 57 researched rules are seeded');
select is((public.age_rule_for('CA', 'QC')).parental_consent_below, 14::smallint,
  'a region''s rule wins over its country''s (Quebec: 14)');
select is((public.age_rule_for('CA', 'ON')).parental_consent_below, 13::smallint,
  'a region without its own rule follows the country (Canada: 13)');
select is((public.age_rule_for('BR', '')).country_code, 'ZZ',
  'an unlisted country gets the strictest default');
select is(array[public.age_rule_outcome(extract(year from now())::integer - 15, null, 'GB', ''),
                public.age_rule_outcome(extract(year from now())::integer - 15, null, 'CA', 'QC'),
                public.age_rule_outcome(extract(year from now())::integer - 15, null, 'RO', ''),
                public.age_rule_outcome(extract(year from now())::integer - 15, null, 'AU', '')],
  array['ok', 'ok', 'consent_needed', 'blocked'],
  'a 14-year-old: fine in the UK and Quebec, needs a parent in Romania, blocked in Australia');
select ok(public.birth_year_needs_month_where(extract(year from now())::integer - 14, current_date, 'CA', 'QC'),
  'born 14 years ago: the month matters in Quebec (14)');
select ok(not public.birth_year_needs_month_where(extract(year from now())::integer - 14, current_date, 'RO', ''),
  'and not in Romania, whose ages are 13 and 16');

/* ---------- 2. Sign-up ---------- */

select is(public.sign_up_country('{"country": " ca ", "legal_region": "qc"}'::jsonb),
  '{"country": "CA", "region": "QC"}'::jsonb, 'the chosen country and region are tidied and kept');
select is(public.sign_up_country('{"country": "ZZ"}'::jsonb) ->> 'country', null,
  'the default rule''s code is never a country');
select is(public.sign_up_country('{"country": "RO", "legal_region": "B"}'::jsonb) ->> 'region', '',
  'a region without its own rule is not kept');
update public.markets set status = 'open' where country_code in ('AU', 'GB');
select is(public.sign_up_market_outcome('AU', extract(year from now())::integer - 15, null, ''),
  'under_market_age', 'Australia refuses a 14-year-old at sign-up');
select is(public.sign_up_market_outcome('GB', extract(year from now())::integer - 15, null, ''),
  'ok', 'the UK takes them');

/* ---------- 3. Who may read and write the rules ---------- */

select pg_temp.sign_out();
select ok((select count(*) from public.country_age_rules) = 57,
  'allowed: country_age_rules_select_public lets a visitor read every rule');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select throws_ok($$ update public.country_age_rules set minimum_age = 10 $$, '42501', null,
  'denied: country_age_rules_select_public gives a member no way to change a rule');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(
  $$ select public.admin_save_age_rule('{"country_code": "GB", "name": "United Kingdom", "minimum_age": 13, "parental_consent_below": 16}'::jsonb, 'test') $$,
  '42501', null, 'admin_save_age_rule(): a moderator is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok(
  $$ select public.admin_save_age_rule('{"country_code": "GB", "name": "United Kingdom", "minimum_age": 13, "parental_consent_below": 16}'::jsonb, ' ') $$,
  '23514', null, 'admin_save_age_rule(): a change needs a reason');

/* ---------- 4. A member changes country ---------- */

select pg_temp.as_postgres();
select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'in Romania a 14-year-old waits for a parent');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000004');
select throws_ok($$ select public.set_my_country('AU') $$, '23514', null,
  'set_my_country(): Australia refuses someone this young');
select is((select country_code from public.profiles where id = '00000000-0000-4000-8000-000000000004'), 'RO',
  'and the refused change is not saved');
select throws_ok($$ select public.set_my_country('Romania') $$, '23514', null,
  'set_my_country(): a code that isn''t one is refused');
select is(public.set_my_country('gb') ->> 'consent_needed', 'false', 'set_my_country(): the UK asks for no parent at 14');
select pg_temp.as_postgres();
select isnt(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'so the account no longer waits for one');

/* ---------- 5. Staff change a rule: 14 days' grace ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select lives_ok(
  $$ select public.admin_save_age_rule('{"country_code": "GB", "name": "United Kingdom", "minimum_age": 13, "parental_consent_below": 16, "legal_basis": "UK GDPR art. 8", "confidence": "high"}'::jsonb, 'tested change') $$,
  'admin_save_age_rule(): an admin changes the UK''s consent age');
select pg_temp.as_postgres();
select ok((select (after_values ->> 'members_given_grace')::integer >= 1 and before_values ->> 'parental_consent_below' = '13'
           from public.audit_log where action = 'age_rule.saved' order by created_at desc limit 1),
  'the change is audited with the values before and after and how many members got the grace');
select ok((select consent_grace_until > now() + interval '13 days' from public.profiles
           where id = '00000000-0000-4000-8000-000000000004'),
  'a member the new rule asks for a parent''s consent gets 14 days');
select isnt(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'and keeps writing during them');
update public.profiles set consent_grace_until = now() - interval '1 minute'
  where id = '00000000-0000-4000-8000-000000000004';
select is(public.account_state('00000000-0000-4000-8000-000000000004'), 'awaiting_parental_consent',
  'after the grace the account waits for a parent, read-only');

select * from finish();
rollback;
