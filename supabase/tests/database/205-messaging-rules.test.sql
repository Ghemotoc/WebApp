-- Database tests for who may message whom (story S1-E9-03; decided 16 Oct 2026, Q6 and Q13).
-- What it proves:
-- - an under-16 and an adult can never message each other, either way, whatever the settings;
-- - a 16 or 17-year-old and an adult only when the teen turned "Let adults message me" on, both
--   ways; under-18s with each other and adults with each other follow the normal rules;
-- - a block either way, a recipient who takes messages from nobody or only from people they
--   follow, a sender who isn't active and messaging oneself all say no;
-- - the defaults: people I follow under 18, everyone for adults;
-- - the profile says only true, false or nothing (signed out, one's own), never why or an age.
-- can_message() is internal, so these tests call it as the database owner; the personas are
-- adult_writer (…01), teen_17 (…02, 17), kid_14_ok (…03, 14, a parent agreed), teacher (…07,
-- adult) and suspended_user (…13). adults_only is switched off inside this test, as it will be
-- when minors join.
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.may(sender_suffix text, recipient_suffix text) returns boolean language sql as $$
  select public.can_message(('00000000-0000-4000-8000-0000000000' || sender_suffix)::uuid,
                            ('00000000-0000-4000-8000-0000000000' || recipient_suffix)::uuid);
$$;
create function pg_temp.follows(follower_suffix text, followed_suffix text) returns void language sql as $$
  insert into public.follows_users (user_id, followed_user_id)
  values (('00000000-0000-4000-8000-0000000000' || follower_suffix)::uuid,
          ('00000000-0000-4000-8000-0000000000' || followed_suffix)::uuid)
  on conflict do nothing;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.feature_flags set is_enabled = false where key = 'adults_only';
delete from public.follows_users where user_id in (select id from public.profiles where handle in
  ('adult_writer', 'teen_17', 'kid_14_ok', 'teacher'));
delete from public.blocks where user_id in (select id from public.profiles where handle in ('adult_writer', 'teacher'));
update public.profiles set adults_may_message = false, messages_from = null
  where handle in ('adult_writer', 'teen_17', 'kid_14_ok', 'teacher');

/* ---------- 1. The defaults ---------- */

select is(public.message_audience_of(profiles), 'everyone'::public.message_audience,
  'an adult takes messages from everyone unless they choose otherwise')
  from public.profiles where handle = 'teacher';
select is(public.message_audience_of(profiles), 'people_i_follow'::public.message_audience,
  'an under-18 takes messages only from people they follow unless they choose otherwise')
  from public.profiles where handle = 'teen_17';
select ok(pg_temp.may('01', '07'), 'one adult may message another');

/* ---------- 2. 16 and 17-year-olds and adults ---------- */

select pg_temp.follows('02', '01');
select ok(not pg_temp.may('01', '02'), 'an adult can''t message a 17-year-old whose switch is off');
select ok(not pg_temp.may('02', '01'), 'a 17-year-old whose switch is off can''t message an adult either');
update public.profiles set adults_may_message = true where handle = 'teen_17';
select ok(pg_temp.may('01', '02'), 'with the switch on, an adult the teen follows may message them');
select ok(pg_temp.may('02', '01'), 'with the switch on, the teen may message an adult');
select ok(not pg_temp.may('07', '02'), 'the teen''s own setting still counts: an adult they don''t follow can''t');

/* ---------- 3. Under-16s and adults: never ---------- */

select pg_temp.follows('03', '01');
update public.profiles set adults_may_message = true where handle = 'kid_14_ok';
select ok(not pg_temp.may('01', '03'), 'an adult can never message a 14-year-old, even one who follows them');
select ok(not pg_temp.may('03', '01'), 'a 14-year-old can never message an adult');
select ok(not pg_temp.may('07', '03'), 'a teacher can''t message a 14-year-old either');
update public.profiles set messages_from = 'everyone' where handle = 'kid_14_ok';
select ok(not pg_temp.may('01', '03'), 'no setting opens a 14-year-old''s messages to adults');

/* ---------- 4. Under-18s with each other ---------- */

update public.profiles set messages_from = null where handle = 'kid_14_ok';
select ok(not pg_temp.may('03', '02'), 'a 14-year-old can''t message a 17-year-old who doesn''t follow them');
select pg_temp.follows('02', '03');
select ok(pg_temp.may('03', '02'), 'a 14-year-old may message a 17-year-old who follows them');
select pg_temp.follows('03', '02');
select ok(pg_temp.may('02', '03'), 'and the 17-year-old may message the 14-year-old who follows them');

/* ---------- 5. Settings, blocks and who is sending ---------- */

update public.profiles set messages_from = 'nobody' where handle = 'teacher';
select ok(not pg_temp.may('01', '07'), 'nobody may message someone who takes messages from nobody');
update public.profiles set messages_from = 'people_i_follow' where handle = 'teacher';
select ok(not pg_temp.may('01', '07'), 'only people they follow may message someone who chose that');
select pg_temp.follows('07', '01');
select ok(pg_temp.may('01', '07'), 'someone they follow may');
insert into public.blocks (user_id, blocked_user_id)
  values ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');
select ok(not pg_temp.may('01', '07'), 'a block by the recipient stops it');
select ok(not pg_temp.may('07', '01'), 'and the one who blocked can''t message either');
delete from public.blocks where user_id = '00000000-0000-4000-8000-000000000007';
select ok(not pg_temp.may('13', '01'), 'a suspended account can''t start a conversation');
select ok(not pg_temp.may('01', '01'), 'nobody messages themselves');

/* ---------- 6. The profile says only yes or no ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_writer_profile('teen_17') -> 'can_message', 'false'::jsonb,
  'an adult the teen doesn''t follow sees only "not taking messages" on the teen''s profile');
select ok(not (public.get_writer_profile('teen_17') ?| array['age_band', 'birth_year', 'adults_may_message', 'messages_from']),
  'the profile never carries an age or the reason');
select is(public.get_writer_profile('teacher') -> 'can_message', 'null'::jsonb, 'one''s own profile says nothing');
select pg_temp.as_owner();
set local role anon;
select is(public.get_writer_profile('teen_17') -> 'can_message', 'null'::jsonb, 'a signed-out visitor sees nothing');

select * from finish();
rollback;
