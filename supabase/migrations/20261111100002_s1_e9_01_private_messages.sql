/*
 * Migration: one-to-one private messages and message requests (story S1-E9-01;
 * docs/stories/s1-e09-private-messages.md; bundle MESSAGES, part b; board Messages 5.5).
 *
 * How it works, from the top:
 * - conversations: one row per pair of people, who started it (user_id) and who it went to
 *   (recipient_user_id), and where it stands (conversation_status). A pair has at most one;
 * - conversation_members: one row per person in a chat, with when they last read it, so the top
 *   bar can count unread chats. Part d adds "Delete chat" here;
 * - messages: the words, text only (images in messages are OPEN; the story's proposal is off),
 *   at most 2,000 characters (a proposal). Kind user_content, reportable as 'message';
 * - the first message: send_message() asks can_message() (S1-E9-03). When the recipient follows
 *   the sender the chat starts accepted; otherwise it waits in their "Message requests" and the
 *   sender can't send more until it is accepted (criterion 2). "Delete request" declines it, and
 *   the sender is never told (proposal: they can't send another to that person either). Writing
 *   back to a request accepts it, as Accept does (proposal);
 * - later messages in an accepted chat ask again for what must never lapse: the sender is active,
 *   there is no block either way, and the age rules still allow it. The recipient's "who can
 *   message me" setting only gates new chats, so turning 18 or changing a setting never cuts off
 *   a chat already going (S1-E9-03 criterion 6);
 * - no special limit for new accounts (decided 16 Oct 2026, Q61); the general hourly limits apply
 *   (S1-E10-12): new_conversation and message, the same for new and older accounts (proposals);
 * - reporting: the person a message was sent to can report it (rule 6). A hidden or removed
 *   message shows as removed to the other person; its writer still sees a hidden one;
 * - nothing here is end-to-end encrypted, because reported messages must be reviewable; staff
 *   read a message only through a case about it (the story's legal note; architecture 1.6).
 * Screens: src/features/messages/ (/messages and /messages/:handle). They read and write only
 * through the functions below; the select policies exist for the person's own rows.
 * Personal data: who talks to whom, when, and the words. Kept until both delete the chat (part d,
 * S1-E9-04) or the account goes (S1-E13-03); docs/retention.md.
 * Tests: supabase/tests/database/206-private-messages.test.sql.
 */

/* ---------- The tables ---------- */

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Who started the chat (CLAUDE.md rule 15); never shown publicly.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Who the first message went to.
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  status public.conversation_status not null default 'request',
  accepted_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_two_people check (user_id <> recipient_user_id)
);

comment on table public.conversations is
  'kind: user_action
A one-to-one chat between two people: who started it, who it went to and whether it is a request, accepted or declined (S1-E9-01). Read only through the messaging functions.';
comment on column public.conversations.user_id is 'Who started the chat; never shown publicly (rule 15).';
comment on column public.conversations.recipient_user_id is 'Who the first message went to.';

-- One chat per pair, whichever of the two started it.
create unique index conversations_one_per_pair on public.conversations
  (least(user_id, recipient_user_id), greatest(user_id, recipient_user_id));
create index conversations_recipient on public.conversations (recipient_user_id, last_message_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger conversations_refuse_user_id_change
  before update on public.conversations
  for each row execute function public.refuse_user_id_change('user_id');
create trigger conversations_refuse_recipient_change
  before update on public.conversations
  for each row execute function public.refuse_user_id_change('recipient_user_id');

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- The person in the chat (rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- When they last opened the chat; messages from the other person after it are unread.
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_members_once unique (conversation_id, user_id)
);

comment on table public.conversation_members is
  'kind: user_action
One row per person in a chat, with when they last read it (S1-E9-01). Read only through the messaging functions.';

create index conversation_members_user on public.conversation_members (user_id);

create trigger conversation_members_set_updated_at
  before update on public.conversation_members
  for each row execute function public.set_updated_at();
create trigger conversation_members_refuse_user_id_change
  before update on public.conversation_members
  for each row execute function public.refuse_user_id_change('user_id');

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Who wrote it (rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Plain text, shown as written and never as HTML or Markdown; at most 2,000 characters (proposal).
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.messages is
  'kind: user_content; reportable: message
Private messages, text only (S1-E9-01). Not end-to-end encrypted: staff read one only through a case about it. Read only through the messaging functions.';

create index messages_conversation_newest on public.messages (conversation_id, created_at desc);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();
create trigger messages_refuse_user_id_change
  before update on public.messages
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- A person reads only their own chats; every write goes through the functions below.
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant select on public.messages to authenticated;

/**
 * conversations_select_member: each of the two people reads their own chat, nobody else. Why:
 * messages are private (S1-E9-01); staff see a message only through a case.
 */
create policy conversations_select_member
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_id, recipient_user_id));

comment on policy conversations_select_member on public.conversations is
  'Allows the two people in a chat to read it, nobody else (S1-E9-01).';

/**
 * conversation_members_select_own: a person reads their own membership rows (when they last read
 * each chat), never the other person's.
 */
create policy conversation_members_select_own
  on public.conversation_members for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy conversation_members_select_own on public.conversation_members is
  'Allows a person to read their own chat memberships, nobody else''s (S1-E9-01).';

/**
 * messages_select_member: the two people in a chat read its messages. A message staff hid or
 * removed is gone for the other person, while its writer still sees their own (architecture
 * 1.7.11); a deleted one is gone for both.
 */
create policy messages_select_member
  on public.messages for select to authenticated
  using (
    deleted_at is null
    and exists (select 1 from public.conversations
                where conversations.id = messages.conversation_id
                  and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id))
    and (user_id = (select auth.uid()) or not public.is_moderated_away('message', id))
  );

comment on policy messages_select_member on public.messages is
  'Allows the two people in a chat to read its messages; a moderated one only its writer (S1-E9-01).';

/* ---------- The hourly limits ---------- */

-- No new-account limit (Q61): new and older accounts get the same numbers (proposals).
update public.settings
  set value = value || '{"new_conversation": {"new_account": 20, "older_account": 20},
                         "message": {"new_account": 200, "older_account": 200}}'::jsonb
  where key = 'rate_limits';

/* ---------- Small internal pieces ---------- */

/**
 * conversation_between: the chat between two people, whichever of them started it.
 * Inputs: the two user IDs. Returns: the row, or an empty row when they have none. Internal.
 */
create or replace function public.conversation_between(first_user_id uuid, second_user_id uuid)
returns public.conversations
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.conversations
  where least(conversations.user_id, conversations.recipient_user_id) = least(first_user_id, second_user_id)
    and greatest(conversations.user_id, conversations.recipient_user_id) = greatest(first_user_id, second_user_id);
$$;

comment on function public.conversation_between(uuid, uuid) is
  'Internal: the chat between two people, if any (S1-E9-01).';
revoke execute on function public.conversation_between(uuid, uuid) from public, anon, authenticated;

/**
 * may_keep_writing: whether someone may write in a chat that already exists. Asks what must never
 * lapse: the writer is active, there is no block either way and the age rules allow it (Q6, Q13).
 * The recipient's "who can message me" setting gates only new chats (S1-E9-03 criterion 6).
 * Inputs: the writer's and the other person's IDs. Returns: true or false. Internal.
 */
create or replace function public.may_keep_writing(writer_id uuid, other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.account_state(writer_id) = 'active'
    and not exists (select 1 from public.blocks
                    where (blocks.user_id = writer_id and blocks.blocked_user_id = other_id)
                       or (blocks.user_id = other_id and blocks.blocked_user_id = writer_id))
    and coalesce((select public.ages_allow_messages(writer, other)
                  from public.profiles as writer, public.profiles as other
                  where writer.id = writer_id and other.id = other_id
                    and writer.deleted_at is null and other.deleted_at is null), false);
$$;

comment on function public.may_keep_writing(uuid, uuid) is
  'Internal: whether someone may keep writing in an existing chat: active, no block, ages allowed (S1-E9-01).';
revoke execute on function public.may_keep_writing(uuid, uuid) from public, anon, authenticated;

/**
 * conversation_can_send: whether the writer may send the next message to the other person now.
 * No chat yet: can_message() (S1-E9-03), and never to a staff account. Accepted: may_keep_writing(). A request or a declined
 * one: only the recipient may write (which accepts it); the sender waits (criterion 2).
 * Inputs: the chat (or an empty row), the writer's and the other person's IDs. Internal.
 */
create or replace function public.conversation_can_send(chat public.conversations, writer_id uuid, other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- A staff account isn't a member's inbox: people write to the team through moderator mail.
    when chat.id is null then public.can_message(writer_id, other_id)
      and public.account_state(other_id) <> 'staff_account'
    when chat.status = 'accepted' then public.may_keep_writing(writer_id, other_id)
    else chat.recipient_user_id = writer_id and public.may_keep_writing(writer_id, other_id)
  end;
$$;

comment on function public.conversation_can_send(public.conversations, uuid, uuid) is
  'Internal: whether someone may send the next message in a chat, or start one (S1-E9-01).';
revoke execute on function public.conversation_can_send(public.conversations, uuid, uuid) from public, anon, authenticated;

/**
 * message_body_for: a message's words as one person may see them: null when staff hid or removed
 * it and they didn't write it, or when it was removed (only staff see a removed one).
 * Inputs: the message and the reader's ID. Returns: the words or null. Internal.
 */
create or replace function public.message_body_for(message public.messages, reader_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.moderated_state_of('message', message.id) is null then message.body
    when message.user_id = reader_id and public.moderated_state_of('message', message.id) = 'hidden' then message.body
    else null
  end;
$$;

comment on function public.message_body_for(public.messages, uuid) is
  'Internal: a message''s words for one reader, or null when moderated away for them (S1-E9-01).';
revoke execute on function public.message_body_for(public.messages, uuid) from public, anon, authenticated;

/**
 * messaging_partner: the live profile behind a username that the caller may see in Messages:
 * not themselves, not someone who blocks them and not a profile staff hid or removed.
 * Input: the username. Returns: the profile row, or an empty row. Internal.
 */
create or replace function public.messaging_partner(wanted_handle text)
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  partner public.profiles;
begin
  select * into partner from public.profile_for_handle(wanted_handle);
  if partner.id is null or partner.id = caller_id
     or public.is_moderated_away('profile', partner.id)
     or exists (select 1 from public.blocks where blocks.user_id = partner.id and blocks.blocked_user_id = caller_id) then
    return null;
  end if;
  return partner;
end;
$$;

comment on function public.messaging_partner(text) is
  'Internal: the person behind a username, when the caller may see them in Messages (S1-E9-01).';
revoke execute on function public.messaging_partner(text) from public, anon, authenticated;

/**
 * require_messaging_caller: the caller's user ID, or insufficient_privilege when signed out. Internal.
 */
create or replace function public.require_messaging_caller()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Log in to use Messages.' using errcode = 'insufficient_privilege';
  end if;
  return (select auth.uid());
end;
$$;

comment on function public.require_messaging_caller() is
  'Internal: the signed-in caller, or an error when signed out (S1-E9-01).';
revoke execute on function public.require_messaging_caller() from public, anon, authenticated;

/* ---------- The list ---------- */

/**
 * my_conversations: the caller's chats for the list, newest first.
 * Returns: per chat the other person's username and display name, the status, whether it is a
 *   request waiting for the caller, the last message's first 120 characters (null when moderated
 *   away for the caller), whether the caller wrote it, when, and whether something is unread.
 * Left out: requests the caller declined, chats with someone either of them blocks (part c makes
 *   blocking from a chat) and people who deleted their account.
 * Errors: insufficient_privilege when signed out. Where it fits: the Chats list and Requests tab.
 */
create or replace function public.my_conversations()
returns table (
  other_handle text,
  other_display_name text,
  status public.conversation_status,
  is_request_to_me boolean,
  last_message_preview text,
  last_message_from_me boolean,
  last_message_at timestamptz,
  has_unread boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (select public.require_messaging_caller() as id),
  mine as (
    select chats.*, case when chats.user_id = caller.id then chats.recipient_user_id else chats.user_id end as other_id,
      caller.id as me
    from public.conversations as chats, caller
    where caller.id in (chats.user_id, chats.recipient_user_id)
      and not (chats.status = 'declined' and chats.recipient_user_id = caller.id)
  )
  select other.handle, public.display_name(other.handle, other.pen_name), mine.status,
    mine.status = 'request' and mine.recipient_user_id = mine.me,
    left(public.message_body_for(latest, mine.me), 120),
    latest.user_id = mine.me,
    mine.last_message_at,
    exists (select 1 from public.messages
            join public.conversation_members as membership
              on membership.conversation_id = mine.id and membership.user_id = mine.me
            where messages.conversation_id = mine.id and messages.user_id = mine.other_id
              and messages.deleted_at is null
              and messages.created_at > coalesce(membership.last_read_at, '-infinity'::timestamptz))
  from mine
  join public.profiles as other on other.id = mine.other_id and other.deleted_at is null
  left join lateral (select * from public.messages
                     where messages.conversation_id = mine.id and messages.deleted_at is null
                     order by messages.created_at desc limit 1) as latest on true
  where other.handle is not null
    and not exists (select 1 from public.blocks
                    where (blocks.user_id = mine.me and blocks.blocked_user_id = mine.other_id)
                       or (blocks.user_id = mine.other_id and blocks.blocked_user_id = mine.me))
  order by mine.last_message_at desc;
$$;

comment on function public.my_conversations() is
  'The caller''s chats and requests for the Messages list, newest first (S1-E9-01).';
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

/**
 * unread_message_count: the number on Messages in the top bar: chats with a message from the
 * other person the caller hasn't read, requests to them included.
 * Returns: a whole number; 0 when signed out. Where it fits: the top bar, every minute.
 */
create or replace function public.unread_message_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then 0
    else (select count(*)::integer from public.my_conversations() where has_unread) end;
$$;

comment on function public.unread_message_count() is
  'How many of the caller''s chats have an unread message, for the top bar (S1-E9-01).';
revoke execute on function public.unread_message_count() from public, anon;
grant execute on function public.unread_message_count() to authenticated;

/* ---------- One chat ---------- */

/**
 * conversation_messages_json: a chat's last 200 messages, oldest first, as one person sees them.
 * Inputs: the chat's ID and the reader's. Returns: a JSON array of
 *   {id, from_me, body (null when removed for them), at}. Internal.
 */
create or replace function public.conversation_messages_json(chat_id uuid, reader_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', recent.id, 'from_me', recent.user_id = reader_id,
      'body', public.message_body_for(recent, reader_id), 'at', recent.created_at)
    order by recent.created_at), '[]'::jsonb)
  from (select * from public.messages
        where messages.conversation_id = chat_id and messages.deleted_at is null
        order by messages.created_at desc limit 200) as recent;
$$;

comment on function public.conversation_messages_json(uuid, uuid) is
  'Internal: a chat''s last 200 messages for one reader (S1-E9-01).';
revoke execute on function public.conversation_messages_json(uuid, uuid) from public, anon, authenticated;

/**
 * conversation_with: one chat, by the other person's username, for the chat panel.
 * Input: the username. Returns: JSON {handle, display_name, status (null before the first
 *   message), is_request_to_me, is_waiting (the caller's request isn't accepted yet), can_send,
 *   i_follow, they_follow, messages}; null when there is no such person the caller may see.
 *   can_send false never says why (S1-E9-03): the screen shows the neutral note.
 *   A request the caller declined shows no messages until one of them writes again.
 * Errors: insufficient_privilege when signed out. Where it fits: /messages/:handle.
 */
create or replace function public.conversation_with(other_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  other public.profiles := public.messaging_partner(other_handle);
  chat public.conversations;
begin
  -- Step 1: someone the caller may see in Messages.
  if other.id is null then
    return null;
  end if;
  -- Step 2: their chat, if they have one.
  chat := public.conversation_between(caller_id, other.id);
  -- Step 3: the answer.
  return jsonb_build_object(
    'handle', other.handle,
    'display_name', public.display_name(other.handle, other.pen_name),
    'status', chat.status,
    'is_request_to_me', chat.status = 'request' and chat.recipient_user_id = caller_id,
    'is_waiting', chat.status in ('request', 'declined') and chat.user_id = caller_id,
    'can_send', public.conversation_can_send(chat, caller_id, other.id),
    'i_follow', exists (select 1 from public.follows_users
                        where follows_users.user_id = caller_id and follows_users.followed_user_id = other.id),
    'they_follow', exists (select 1 from public.follows_users
                           where follows_users.user_id = other.id and follows_users.followed_user_id = caller_id),
    'messages', case when chat.id is null or (chat.status = 'declined' and chat.recipient_user_id = caller_id)
                     then '[]'::jsonb else public.conversation_messages_json(chat.id, caller_id) end);
end;
$$;

comment on function public.conversation_with(text) is
  'One chat by the other person''s username, as the caller sees it; never says why sending is off (S1-E9-01).';
revoke execute on function public.conversation_with(text) from public, anon;
grant execute on function public.conversation_with(text) to authenticated;

/* ---------- Writing ---------- */

/**
 * start_conversation: creates the chat for a first message. Accepted at once when the recipient
 * follows the sender; otherwise a request (criterion 2). Takes the new_conversation limit.
 * Inputs: the sender's and the recipient's IDs. Returns: the new row. Internal: send_message().
 */
create or replace function public.start_conversation(sender_id uuid, recipient_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_followed boolean := exists (select 1 from public.follows_users
                                 where follows_users.user_id = recipient_id and follows_users.followed_user_id = sender_id);
  chat public.conversations;
begin
  perform public.take_rate_limit('new_conversation');
  insert into public.conversations (user_id, recipient_user_id, status, accepted_at)
  values (sender_id, recipient_id,
          case when is_followed then 'accepted'::public.conversation_status else 'request'::public.conversation_status end,
          case when is_followed then now() end)
  returning * into chat;
  insert into public.conversation_members (conversation_id, user_id, last_read_at)
  values (chat.id, sender_id, now()), (chat.id, recipient_id, null);
  return chat;
end;
$$;

comment on function public.start_conversation(uuid, uuid) is
  'Internal: creates a chat for a first message, accepted or a request (S1-E9-01).';
revoke execute on function public.start_conversation(uuid, uuid) from public, anon, authenticated;

/**
 * send_message: sends one message to a person, starting the chat when there is none.
 * Inputs: the recipient's username and the words (text only, 1 to 2,000 characters).
 * Returns: JSON {status} of the chat afterwards: 'accepted' or 'request'.
 * Steps: the caller and the words; the person; whether the caller may write (can_message() for a
 *   new chat, the request rule, the lasting rules); the hourly limits; the row. A recipient who
 *   writes back to a request accepts it.
 * Errors: insufficient_privilege signed out, or 'not_taking' when the caller may not write (the
 *   same for every reason, S1-E9-03); check_violation for empty or long words; no_data_found for
 *   an unknown username; program_limit_exceeded with wait_minutes:<n> for the hourly limits.
 */
create or replace function public.send_message(recipient_handle text, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  words text := btrim(coalesce(body, ''));
  other public.profiles := public.messaging_partner(recipient_handle);
  chat public.conversations;
begin
  -- Step 1: the words: text only, 1 to 2,000 characters.
  if char_length(words) not between 1 and 2000 then
    raise exception 'Write between 1 and 2,000 characters.' using errcode = 'check_violation';
  end if;
  -- Step 2: someone the caller may see.
  if other.id is null then
    raise exception 'There is nobody with that username.' using errcode = 'no_data_found';
  end if;
  -- Step 3: may the caller write to them now? One neutral answer for every reason.
  chat := public.conversation_between(caller_id, other.id);
  if not public.conversation_can_send(chat, caller_id, other.id) then
    raise exception 'This person isn''t taking messages right now.' using errcode = 'insufficient_privilege', hint = 'not_taking';
  end if;
  -- Step 4: the limits, then the chat: new, or a request the recipient now answers.
  perform public.take_rate_limit('message');
  if chat.id is null then
    chat := public.start_conversation(caller_id, other.id);
  elsif chat.status <> 'accepted' then
    update public.conversations set status = 'accepted', accepted_at = now()
      where conversations.id = chat.id returning * into chat;
  end if;
  -- Step 5: the message, and the chat moves to the top of both lists.
  insert into public.messages (conversation_id, user_id, body) values (chat.id, caller_id, words);
  update public.conversations set last_message_at = now() where conversations.id = chat.id;
  update public.conversation_members set last_read_at = now()
    where conversation_members.conversation_id = chat.id and conversation_members.user_id = caller_id;
  return jsonb_build_object('status', chat.status);
end;
$$;

comment on function public.send_message(text, text) is
  'Sends a private message, starting the chat or a request when there is none (S1-E9-01, S1-E9-03).';
revoke execute on function public.send_message(text, text) from public, anon;
grant execute on function public.send_message(text, text) to authenticated;

/**
 * answer_message_request: the recipient accepts a request (both can write) or deletes it (it
 * leaves their lists; the sender is never told and still can't send more).
 * Inputs: the sender's username; should_accept. Returns: JSON {status}.
 * Errors: insufficient_privilege signed out; no_data_found when there is no request from that
 *   person to the caller. Where it fits: "Accept request" and "Delete request".
 */
create or replace function public.answer_message_request(sender_handle text, should_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  other public.profiles := public.messaging_partner(sender_handle);
  chat public.conversations;
begin
  -- Step 1: a request from that person to the caller.
  if other.id is not null then
    chat := public.conversation_between(caller_id, other.id);
  end if;
  if chat.id is null or chat.status <> 'request' or chat.recipient_user_id <> caller_id then
    raise exception 'There is no message request from that person.' using errcode = 'no_data_found';
  end if;
  -- Step 2: accepting asks the lasting rules again, so a block since then still counts.
  if should_accept and not public.may_keep_writing(caller_id, other.id) then
    raise exception 'This person isn''t taking messages right now.' using errcode = 'insufficient_privilege', hint = 'not_taking';
  end if;
  -- Step 3: the answer; reading it counts as reading the request.
  update public.conversations
    set status = case when should_accept then 'accepted'::public.conversation_status else 'declined'::public.conversation_status end,
        accepted_at = case when should_accept then now() end
    where conversations.id = chat.id returning * into chat;
  update public.conversation_members set last_read_at = now()
    where conversation_members.conversation_id = chat.id and conversation_members.user_id = caller_id;
  return jsonb_build_object('status', chat.status);
end;
$$;

comment on function public.answer_message_request(text, boolean) is
  'The recipient accepts or deletes a message request; the sender is never told (S1-E9-01).';
revoke execute on function public.answer_message_request(text, boolean) from public, anon;
grant execute on function public.answer_message_request(text, boolean) to authenticated;

/**
 * mark_conversation_read: the caller has read their chat with this person up to now.
 * Input: the username. Returns: nothing; does nothing when there is no chat.
 * Where it fits: opening a chat, and each time new messages arrive while it is open.
 */
create or replace function public.mark_conversation_read(other_handle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  other public.profiles := public.messaging_partner(other_handle);
begin
  if other.id is null then
    return;
  end if;
  update public.conversation_members set last_read_at = now()
    where conversation_members.user_id = caller_id
      and conversation_members.conversation_id = (public.conversation_between(caller_id, other.id)).id;
end;
$$;

comment on function public.mark_conversation_read(text) is
  'Marks the caller''s chat with someone as read up to now (S1-E9-01).';
revoke execute on function public.mark_conversation_read(text) from public, anon;
grant execute on function public.mark_conversation_read(text) to authenticated;

/**
 * my_message_settings: what the Messages page says about who may message the caller.
 * Returns: JSON {audience (with the age default filled in), age_group (adult, teen or child: the
 *   caller's own, never anyone else's), adults_may_message}.
 * Errors: insufficient_privilege when signed out. Where it fits: the notice over the list and
 *   "About this chat"; part d (S1-E9-04) adds the settings to change them.
 */
create or replace function public.my_message_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'audience', public.message_audience_of(profiles),
    'age_group', public.message_age_group(profiles),
    'adults_may_message', profiles.adults_may_message)
  from public.profiles where profiles.id = public.require_messaging_caller();
$$;

comment on function public.my_message_settings() is
  'The caller''s own message setting and age group, for the Messages page (S1-E9-01).';
revoke execute on function public.my_message_settings() from public, anon;
grant execute on function public.my_message_settings() to authenticated;

/* ---------- Reporting (rule 6; shared contract, architecture 1.7.11) ---------- */

/**
 * reportable_item_owner: as in S1-E17-34, plus the 'message' branch: a message in one of the
 * caller's own chats, by its row ID. Anyone else gets "no such item", so a private message's
 * existence never leaks (S1-E9-01).
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
    -- A private message only for the two people in its chat, so its existence never leaks to
    -- anyone else (S1-E9-01). Deleted ones can't be reported.
    when 'message' then
      return query
        select messages.id, messages.user_id from public.messages
        join public.conversations on conversations.id = messages.conversation_id
        where is_row_id and messages.id = item_reference::uuid
          and messages.deleted_at is null
          and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id);
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34; message S1-E9-01).';

/**
 * reportable_item_summary: as in S1-E17-34, and a message says whose it is and its first words,
 * for the moderation queue (S1-E9-01).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
    when 'message' then
      select format('Private message from @%s: %s', coalesce(profiles.handle, '…'),
          case when char_length(messages.body) > 80 then left(messages.body, 80) || '…' else messages.body end)
        into summary
      from public.messages
      left join public.profiles on profiles.id = messages.user_id
      where messages.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in S1-E17-34, and a reported message's words and when it was sent
 * (S1-E9-01). Part c (S1-E9-02) adds up to 20 messages before it as context.
 */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at)
        from public.messages where messages.id = target.item_id)
  end;
$$;

/**
 * notification_item_json: as in S1-E17-34, and a message links to Messages (S1-E9-01).
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
      when 'embed' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapter_embeds join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id where chapter_embeds.id = cases.item_id)
      when 'atlas_item' then public.plan_item_address(cases.item_id)
      -- A chat's address differs for each of the two people, so a message links to Messages.
      when 'message' then '/messages'
    end)
  from public.cases where cases.id = case_id;
$$;
