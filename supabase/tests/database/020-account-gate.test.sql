-- Database tests for the account gate skeleton (story S1-E1-02; architecture 1.7.8, B02).
-- Proves: the age group rules at 13, 16 and 18 with and without a birth month (S1-E2-02); the
-- account state of the seed personas with adults_only on and off; is_active_member(), is_staff()
-- and is_staff_session() for the signed-in user; and that clients can't ask about other people.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- Age group: year only uses the younger possible age (birthday counted as 31 December).
select is(public.age_band_from_birth(2014, null, 'pending', '2027-06-15'), 'under_13',
  'born 2014, year only: counts as 12 in 2027, so under 13');
select is(public.age_band_from_birth(2013, null, 'pending', '2027-06-15'), '13_to_15',
  'born 2013, year only: counts as 13 in 2027');
select is(public.age_band_from_birth(2011, null, 'pending', '2027-12-31'), '13_to_15',
  'born 2011, year only: still 15 on 31 December 2027');
select is(public.age_band_from_birth(2010, null, 'pending', '2027-01-01'), '16_to_17',
  'born 2010, year only: 16 from 1 January 2027');
select is(public.age_band_from_birth(2009, null, '18_or_over', '2027-12-31'), '16_to_17',
  'born 2009, year only: still 17 on 31 December 2027');
select is(public.age_band_from_birth(2009, null, '18_or_over', '2028-01-01'), '18_plus',
  'born 2009, year only: 18 from 1 January 2028');

-- Year and month: the new age starts on the first day of the month after the birthday month.
select is(public.age_band_from_birth(2011, 5, 'pending', '2027-05-31'), '13_to_15',
  'born May 2011: still 15 on 31 May 2027 (S1-E2-02 example)');
select is(public.age_band_from_birth(2011, 5, 'pending', '2027-06-01'), '16_to_17',
  'born May 2011: 16 from 1 June 2027 (S1-E2-02 example)');
select is(public.age_band_from_birth(2014, 3, 'pending', '2027-04-01'), '13_to_15',
  'born March 2014: 13 from 1 April 2027');

-- A "13 or over" check result keeps under-18 protections on.
select is(public.age_band_from_birth(1990, null, '13_or_over', '2027-06-15'), '16_to_17',
  'an adult by year with only a 13_or_over result is treated as under 18 (S1-E2-08)');
select is(public.age_band_from_birth(null, null, 'pending', '2027-06-15'), 'unknown',
  'no year of birth gives an unknown age group');

-- Account states with adults_only on (the March test).
select results_eq(
  $$ select public.account_state(id)::text from public.profiles
     where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
                  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005',
                  '00000000-0000-4000-8000-000000000006')
     order by id $$,
  $$ values ('active'), ('minor_not_admitted'), ('minor_not_admitted'), ('active'), ('age_check_failed') $$,
  'adults_only on: adult_writer and pending_check active, teen_17 and kid_14_ok not admitted, failed_check read-only'
);

-- An unconfirmed email blocks everything (S1-E2-01).
update auth.users set email_confirmed_at = null where id = '00000000-0000-4000-8000-000000000001';
select is(public.account_state('00000000-0000-4000-8000-000000000001'), 'email_unconfirmed',
  'an account with an unconfirmed email cannot write');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-8000-000000000001';

-- A deleted profile cannot write.
select is(public.account_state(gen_random_uuid()), 'deleted',
  'an account with no profile counts as deleted');

-- Account states with adults_only off (after March, before the consent and age check stories).
update public.feature_flags set is_enabled = false where key = 'adults_only';
select results_eq(
  $$ select public.account_state(id)::text from public.profiles
     where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
                  '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004',
                  '00000000-0000-4000-8000-000000000005')
     order by id $$,
  $$ values ('active'), ('active'), ('active'), ('awaiting_parental_consent'), ('age_check_pending') $$,
  'adults_only off: teen_17 and kid_14_ok (a parent agreed, S1-E2-03) active, kid_14_waiting waits for a parent, pending_check needs the age check'
);
update public.feature_flags set is_enabled = true where key = 'adults_only';

-- The signed-in user's own view.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select ok(public.is_active_member(), 'adult_writer is an active member in March');
select is(public.age_band(), '18_plus', 'adult_writer''s age group is 18 plus');
select ok(not public.is_staff(), 'adult_writer is not staff');
select ok(not public.is_staff_session(), 'adult_writer has no staff session');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000004", "role": "authenticated"}';
select ok(not public.is_active_member(), 'kid_14_waiting is read-only');
select is(public.age_band(), '13_to_15', 'kid_14_waiting''s age group is 13 to 15');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';
select ok(public.is_staff('moderator'), 'the moderator holds the moderator role');
select ok(not public.is_staff('admin'), 'the moderator does not hold the admin role');
select ok(public.is_staff_session(), 'in March any staff-role session counts as a staff session');

-- Clients can't ask about other people's status.
select throws_ok(
  $$ select public.account_state('00000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'a client cannot read another person''s account state'
);

-- Signed out: the anon role with no user in the claims, as for a visitor's API request.
reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is(public.age_band(), 'unknown', 'a signed-out visitor has an unknown age group');

select * from finish();

rollback;
