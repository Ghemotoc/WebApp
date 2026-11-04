/*
 * Migration: a kind "No thanks" for message requests (bundle IDEAS-2, part c2; idea
 * IDEA-20261101-7, approved by Robert on 2 Nov 2026, 22:00).
 *
 * Today the recipient of a request can accept it or delete it; a deleted request is never told
 * and the sender can't write again. "No thanks" is a third answer:
 * - the request closes (status 'declined') and conversations.said_no_thanks_at records when;
 * - the sender sees a fixed, polite message in the chat ("Thanks for writing, but I'd rather not
 *   chat right now"), drawn by the app from its locale files, so it needs no moderation and no
 *   row in messages;
 * - the sender can't send another request for 30 days; after that they may write once more, which
 *   opens a new request (criterion 1).
 * "Delete request" stays as it was: the sender isn't told (criterion 2).
 * Who calls it: RequestActions ("No thanks") through say_no_thanks_to_request(); ChatPanel and
 *   ChatListItem read said_no_thanks and ask_again_from.
 * Tests: supabase/tests/database/281-no-thanks.test.sql.
 */

alter table public.conversations add column said_no_thanks_at timestamptz;
comment on column public.conversations.said_no_thanks_at is
  'When the recipient answered the request with "No thanks" (IDEAS-2 idea 7); the sender may ask again 30 days later.';

/**
 * no_thanks_pause_ends: when a sender told "No thanks" may ask again.
 * Input: the chat. Returns: 30 days after the answer, or null when it wasn't "No thanks".
 * Internal: conversation_can_send(), conversation_with() and my_conversations().
 */
create or replace function public.no_thanks_pause_ends(chat public.conversations)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select case when chat.status = 'declined' then chat.said_no_thanks_at + interval '30 days' end;
$$;
comment on function public.no_thanks_pause_ends(public.conversations) is
  'Internal: when a sender told "No thanks" may send a new request: 30 days on (IDEAS-2 idea 7).';
revoke execute on function public.no_thanks_pause_ends(public.conversations) from public, anon, authenticated;

/**
 * conversation_can_send: as in S1-E9-01, plus "No thanks": once its 30 days are over, the sender
 *   may write again as if there were no chat (can_message(), never to staff), which opens a new
 *   request. A request or a declined one otherwise: only the recipient may write (which accepts it).
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
    -- "No thanks" pauses the sender for 30 days, then they may ask once more (IDEAS-2 idea 7).
    when chat.user_id = writer_id and public.no_thanks_pause_ends(chat) is not null then
      public.no_thanks_pause_ends(chat) <= now()
      and public.can_message(writer_id, other_id)
      and public.account_state(other_id) <> 'staff_account'
    else chat.recipient_user_id = writer_id and public.may_keep_writing(writer_id, other_id)
  end;
$$;
comment on function public.conversation_can_send(public.conversations, uuid, uuid) is
  'Internal: whether someone may send the next message in a chat, or start one (S1-E9-01, IDEAS-2 idea 7).';
revoke execute on function public.conversation_can_send(public.conversations, uuid, uuid) from public, anon, authenticated;

/**
 * say_no_thanks_to_request: the recipient answers a request with "No thanks": it closes, the
 *   sender sees the fixed polite message and can't send another request for 30 days.
 * Input: the sender's username. Returns: JSON {status: 'declined'}.
 * Errors: insufficient_privilege signed out; no_data_found when there is no request from that
 *   person to the caller. Where it fits: "No thanks" under a request (RequestActions).
 */
create or replace function public.say_no_thanks_to_request(sender_handle text)
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
  -- Step 2: closed with "No thanks"; reading it counts as reading the request.
  update public.conversations
    set status = 'declined', accepted_at = null, said_no_thanks_at = now()
    where conversations.id = chat.id returning * into chat;
  update public.conversation_members set last_read_at = now()
    where conversation_members.conversation_id = chat.id and conversation_members.user_id = caller_id;
  -- Step 3: a message email still waiting for the caller about it is no longer news.
  update public.email_outbox set sent_at = now()
    where email_outbox.conversation_id = chat.id and email_outbox.user_id = caller_id
      and email_outbox.sent_at is null;
  return jsonb_build_object('status', chat.status);
end;
$$;
comment on function public.say_no_thanks_to_request(text) is
  'The recipient answers a message request with "No thanks": the sender sees a fixed message and waits 30 days (IDEAS-2 idea 7).';
revoke execute on function public.say_no_thanks_to_request(text) from public, anon;
grant execute on function public.say_no_thanks_to_request(text) to authenticated;

/**
 * answer_message_request: as in S1-E9-01 (Accept or Delete); Delete clears any earlier "No thanks",
 *   so a deleted request is never shown to the sender as one.
 * Inputs: the sender's username; should_accept. Returns: JSON {status}.
 * Errors: insufficient_privilege signed out; no_data_found when there is no request from that
 *   person to the caller.
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
        accepted_at = case when should_accept then now() end,
        said_no_thanks_at = null
    where conversations.id = chat.id returning * into chat;
  update public.conversation_members set last_read_at = now()
    where conversation_members.conversation_id = chat.id and conversation_members.user_id = caller_id;
  return jsonb_build_object('status', chat.status);
end;
$$;
comment on function public.answer_message_request(text, boolean) is
  'The recipient accepts or deletes a message request; a deleted one is never told (S1-E9-01).';
revoke execute on function public.answer_message_request(text, boolean) from public, anon;
grant execute on function public.answer_message_request(text, boolean) to authenticated;

/**
 * send_message: as in S1-E9-01, and a sender writing after a "No thanks" pause opens a new request
 *   (IDEAS-2 idea 7) rather than accepting the chat.
 * Inputs: the recipient's username and the words. Returns: JSON {status}.
 * Errors: check_violation for empty or too long words; no_data_found for an unknown username;
 *   insufficient_privilege (hint not_taking) when the caller may not write now; the rate limits.
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
  -- Step 4: the limits, then the chat: new, a new request after "No thanks", or a request the
  -- recipient now answers.
  perform public.take_rate_limit('message');
  if chat.id is null then
    chat := public.start_conversation(caller_id, other.id);
  elsif chat.status = 'declined' and chat.user_id = caller_id then
    update public.conversations set status = 'request', said_no_thanks_at = null
      where conversations.id = chat.id returning * into chat;
  elsif chat.status <> 'accepted' then
    update public.conversations set status = 'accepted', accepted_at = now(), said_no_thanks_at = null
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
  'Sends a private message, starting the chat or a request when there is none (S1-E9-01, S1-E9-03, IDEAS-2 idea 7).';

/**
 * conversation_with: as in S1-E9-01, plus said_no_thanks (the other person answered the caller's
 *   request with "No thanks") and ask_again_from (when the caller may write again).
 * Input: the username. Returns: JSON {handle, display_name, status, is_request_to_me, is_waiting,
 *   said_no_thanks, ask_again_from, can_send, i_follow, they_follow, messages}; null when there is
 *   no such person the caller may see.
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
  said_no_thanks boolean;
begin
  -- Step 1: someone the caller may see in Messages.
  if other.id is null then
    return null;
  end if;
  -- Step 2: their chat, if they have one, and whether it closed with "No thanks" to the caller.
  chat := public.conversation_between(caller_id, other.id);
  said_no_thanks := chat.user_id = caller_id and public.no_thanks_pause_ends(chat) is not null;
  -- Step 3: the answer.
  return jsonb_build_object(
    'handle', other.handle,
    'display_name', public.display_name(other.handle, other.pen_name),
    'status', chat.status,
    'is_request_to_me', chat.status = 'request' and chat.recipient_user_id = caller_id,
    'is_waiting', chat.status in ('request', 'declined') and chat.user_id = caller_id and not coalesce(said_no_thanks, false),
    'said_no_thanks', coalesce(said_no_thanks, false),
    'ask_again_from', case when said_no_thanks then public.no_thanks_pause_ends(chat) end,
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
  'One chat by the other person''s username, as the caller sees it; never says why sending is off (S1-E9-01, IDEAS-2 idea 7).';
revoke execute on function public.conversation_with(text) from public, anon;
grant execute on function public.conversation_with(text) to authenticated;

/**
 * my_conversations: as in S1-E9-04, plus said_no_thanks, so the list says "Said no thanks" instead
 *   of "Waiting for them to accept" (IDEAS-2 idea 7). The return type grows, so it is dropped first.
 */
drop function public.my_conversations();
create function public.my_conversations()
returns table (
  other_handle text,
  other_display_name text,
  status public.conversation_status,
  is_request_to_me boolean,
  said_no_thanks boolean,
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
    mine.user_id = mine.me and mine.status = 'declined' and mine.said_no_thanks_at is not null,
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
                       and messages.created_at > coalesce(public.chat_cleared_at(mine.id, mine.me), '-infinity'::timestamptz)
                     order by messages.created_at desc limit 1) as latest on true
  -- A chat the caller deleted stays out of their list until someone writes again (S1-E9-04).
  where other.handle is not null
    and mine.last_message_at > coalesce(public.chat_cleared_at(mine.id, mine.me), '-infinity'::timestamptz)
    and not exists (select 1 from public.blocks
                    where (blocks.user_id = mine.me and blocks.blocked_user_id = mine.other_id)
                       or (blocks.user_id = mine.other_id and blocks.blocked_user_id = mine.me))
  order by mine.last_message_at desc;
$$;
comment on function public.my_conversations() is
  'The caller''s chats and requests for the Messages list, newest first (S1-E9-01, S1-E9-04, IDEAS-2 idea 7).';
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
