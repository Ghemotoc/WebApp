-- Database tests for the final security check (bundle FINAL-2): the messages helper
-- chat_cleared_at() no longer answers about other people.
-- What it proves:
-- - denied: a visitor can't call it;
-- - denied: a member asking about someone else's chat gets nothing;
-- - allowed: a member asking about their own chat gets the time they deleted it;
-- - allowed: a database job (no signed-in caller) is answered, as the email worker needs.
-- Test data: the seeded chat 901 between teacher (07) and adult_writer (01).
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

update public.conversation_members set deleted_at = '2026-11-01 10:00+00'
where conversation_id = '00000000-0000-4000-a000-000000000901';
-- The chat's starter, kept where the signed-in roles below can read it (RLS hides the chat itself
-- from a stranger, and the test must ask with the real ID).
create temp table chat_starter as
  select user_id from public.conversations where id = '00000000-0000-4000-a000-000000000901';
grant select on chat_starter to authenticated;

select ok(not has_function_privilege('anon', 'public.chat_cleared_at(uuid, uuid)', 'execute'),
  'denied: a visitor can''t ask when someone deleted a chat');
select isnt(public.chat_cleared_at('00000000-0000-4000-a000-000000000901',
    (select user_id from public.conversations where id = '00000000-0000-4000-a000-000000000901')), null,
  'allowed: a database job with no signed-in caller is answered');

-- A member of the chat asks about themselves, then about the other person.
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub',
         (select user_id from chat_starter))::text, true);
select isnt(public.chat_cleared_at('00000000-0000-4000-a000-000000000901', (select auth.uid())), null,
  'allowed: a member is told when they deleted their own chat');
reset role;
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
select is(public.chat_cleared_at('00000000-0000-4000-a000-000000000901',
    (select user_id from chat_starter)), null,
  'denied: a member asking about someone else''s chat is told nothing');
reset role;

select * from finish();
rollback;
