/**
 * Final check, part 2 (security): one internal function answered about other people (bundle
 * FINAL-2; unattended run, 11 Nov 2026).
 *
 * chat_cleared_at(chat, person) says when a person last deleted a chat. It runs with the
 * database's own rights, and every signed-in member, and a visitor, could call it for any chat
 * and any person. The answer is small (a time, for two IDs nobody is shown), yet it is about
 * someone else's private messages (architecture 1.6: messages are readable by their two members
 * only).
 * What changes:
 * 1. A visitor can no longer call it at all.
 * 2. A member still can, because the policy messages_select_member uses it for the member's own
 *    row, but it now answers only about the caller. The database's own jobs (the email worker,
 *    which has no signed-in caller) are answered as before.
 */

/**
 * chat_cleared_at: when a person last deleted a chat.
 *
 * @param chat_id - the conversation
 * @param person_id - whose deletion to look up
 * @returns the time, or null when they never deleted it, or when the caller is a signed-in
 *   person asking about someone else
 * Where it fits: messages_select_member, my_conversations() and conversation_messages_json()
 * hide the messages from before that time; message_email_items() does the same for the email
 * worker (S1-E9-04).
 */
create or replace function public.chat_cleared_at(chat_id uuid, person_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select conversation_members.deleted_at from public.conversation_members
  where conversation_members.conversation_id = chat_id and conversation_members.user_id = person_id
    -- A signed-in caller is answered about themselves only; a database job has no caller.
    and ((select auth.uid()) is null or person_id = (select auth.uid()));
$$;

comment on function public.chat_cleared_at(uuid, uuid) is
  'Internal: when a person last deleted a chat, or null; a signed-in caller is answered about themselves only (S1-E9-04; FINAL-2).';
revoke execute on function public.chat_cleared_at(uuid, uuid) from public, anon;
grant execute on function public.chat_cleared_at(uuid, uuid) to authenticated;
