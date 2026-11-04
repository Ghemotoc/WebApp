-- Database tests for handing a space over (bundle 14d IDEAS-3, part e; idea IDEA-20261102-7).
-- What it proves:
-- - the owner offers the space to one of its moderators, who is told and sees the offer; nobody
--   else sees it, and a plain member can't be offered it;
-- - the moderator may decline, the owner may take the offer back, and someone else can't accept;
-- - accepting makes the moderator the owner and the old owner a moderator with every power
--   (criterion 1); the log says who handed over to whom (criterion 2);
-- - the owner column changes through nothing else: a direct update is refused, even with an open
--   offer, and so is one to anyone but the person it was offered to;
-- - a class needs a teacher, and the new owner must be in the space's age group.
-- No new table or policy. Personas: adult_writer (…01, the owner), teacher (…07, the moderator),
-- blocker (…15, a member). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

update public.settings set value = value || '{"space_create": {"new_account": 20, "older_account": 20}}'::jsonb
where key = 'rate_limits';

/* ---------- Set-up: an open space with a moderator and a member ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.create_space('Cercul predarii zq', 'Un spațiu deschis.', '', 'members', 'open', 'members', 'plum');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select public.join_space('cercul-predarii-zq');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.join_space('cercul-predarii-zq');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.set_space_moderator('cercul-predarii-zq', 'teacher', '{posts}');

/* ---------- 1. The offer ---------- */

select is(pg_temp.hint_of($$select public.offer_space_handover('cercul-predarii-zq', 'blocker')$$),
  'handover:not_moderator', 'a plain member can''t be offered the space');
select is(public.offer_space_handover('cercul-predarii-zq', 'teacher') -> 'offered_to' ->> 'handle', 'teacher',
  'the owner offers the space to a moderator');
select is((public.space_page('cercul-predarii-zq') -> 'viewer' -> 'handover' -> 'to' ->> 'handle'), 'teacher',
  'the owner sees the open offer');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000007' and kind = 'space_handover_offered'), 1,
  'the moderator is told');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((public.space_page('cercul-predarii-zq') -> 'viewer' -> 'handover' ->> 'is_for_me')::boolean, true,
  'the moderator sees the offer is for them');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.space_page('cercul-predarii-zq') -> 'viewer' -> 'handover', 'null'::jsonb,
  'nobody else sees it');
select is(pg_temp.hint_of($$select public.answer_space_handover('cercul-predarii-zq', true)$$),
  'handover:missing', 'someone else can''t accept it');

/* ---------- 2. The owner column changes through nothing else ---------- */

select pg_temp.as_postgres();
select throws_ok($$update public.spaces set user_id = '00000000-0000-4000-8000-000000000007' where slug = 'cercul-predarii-zq'$$,
  '23514', null, 'a direct change of owner is refused, even with an open offer');
select throws_ok($$select set_config('app.space_handover', (select id::text from public.spaces where slug = 'cercul-predarii-zq'), true);
    update public.spaces set user_id = '00000000-0000-4000-8000-000000000015' where slug = 'cercul-predarii-zq'$$,
  '23514', null, 'and so is a change to anyone but the person it was offered to');
select set_config('app.space_handover', '', true);

/* ---------- 3. Declining and taking back ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.answer_space_handover('cercul-predarii-zq', false) ->> 'outcome', 'declined', 'the moderator may decline');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.space_page('cercul-predarii-zq') -> 'viewer' -> 'handover', 'null'::jsonb, 'a declined offer is gone');
select public.offer_space_handover('cercul-predarii-zq', 'teacher');
select is(public.cancel_space_handover('cercul-predarii-zq') ->> 'cancelled', 'true', 'the owner may take an offer back');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(pg_temp.hint_of($$select public.answer_space_handover('cercul-predarii-zq', true)$$),
  'handover:missing', 'a taken-back offer can''t be accepted');

/* ---------- 4. Accepting (criteria 1 and 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.offer_space_handover('cercul-predarii-zq', 'teacher');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.answer_space_handover('cercul-predarii-zq', true) ->> 'outcome', 'accepted', 'the moderator accepts');

select pg_temp.as_postgres();
select is((select user_id::text from public.spaces where slug = 'cercul-predarii-zq'),
  '00000000-0000-4000-8000-000000000007', 'they are the owner now (criterion 1)');
select is((select role::text || ':' || cardinality(powers) from public.space_members
           where user_id = '00000000-0000-4000-8000-000000000001'
             and space_id = (select id from public.spaces where slug = 'cercul-predarii-zq')),
  'moderator:4', 'the old owner is a moderator with every power (criterion 1)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select jsonb_agg(entry ->> 'action' || ':' || (entry -> 'actor' ->> 'handle') || '>' || (entry -> 'target' ->> 'handle')
                            order by ordinality)
           from jsonb_array_elements(public.space_log('cercul-predarii-zq') -> 'entries') with ordinality as entries(entry, ordinality)
           where entry ->> 'action' like 'handover%'),
  '["handover_accepted:teacher>adult_writer", "handover_offered:adult_writer>teacher", "handover_cancelled:adult_writer>teacher", "handover_offered:adult_writer>teacher", "handover_declined:teacher>adult_writer", "handover_offered:adult_writer>teacher"]'::jsonb,
  'the log says who handed over to whom, newest first (criterion 2)');

/* ---------- 5. Who may take a space over ---------- */

select pg_temp.as_postgres();
select is(public.space_handover_refusal(jsonb_populate_record(spaces, '{"kind": "class"}'), '00000000-0000-4000-8000-000000000001'),
  'not_teacher', 'a class needs a teacher')
from public.spaces where slug = 'cercul-predarii-zq';
select is(public.space_handover_refusal(jsonb_populate_record(spaces, '{"age_group": "under_16"}'), '00000000-0000-4000-8000-000000000001'),
  'age', 'the new owner must be in the space''s age group')
from public.spaces where slug = 'cercul-predarii-zq';

select * from finish();
rollback;
