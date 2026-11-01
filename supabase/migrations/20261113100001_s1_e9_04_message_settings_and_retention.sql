/*
 * Migration: message settings, Delete chat and how long messages are kept (story S1-E9-04;
 * docs/stories/s1-e09-private-messages.md; bundle MESSAGES, part d; board Messages 5.5).
 *
 * How it works, from the top:
 * - who may message you: set_message_audience() saves everyone, people I follow or nobody in
 *   profiles.messages_from (S1-E9-03 reads it; empty means the age group's default: everyone for
 *   adults, people I follow for under-18s, a proposal). Anyone may pick any of the three; the age
 *   rules still apply on top. 16 and 17-year-olds also have "Let adults message me"
 *   (set_adults_may_message(), S1-E2-06), off by default (criterion 1);
 * - Delete chat: delete_conversation() stamps conversation_members.deleted_at for the caller only.
 *   The chat leaves their list and its earlier messages are gone for them; if someone writes
 *   again the chat comes back with only the new messages. The other person isn't told;
 * - the clean-up (criterion 2): purge_deleted_chats(), nightly by pg_cron, permanently deletes
 *   every message sent before both people deleted the chat, then the chat itself once nothing
 *   is left (a declined request is kept, so its sender still can't write again, S1-E9-01);
 * - reported messages (criterion 3): a message a case is about, and the up to 20 before it that
 *   staff read with it (S1-E9-02), are kept while the case is open, while an authority order
 *   preserves it, and for reported_messages_keep_days after the decision (180, a proposal while
 *   the reports' own retention is OPEN); the next clean-up after that deletes them.
 * Screens: Settings › Messages (MessageSettingsSection), "Change" links on /messages and in About
 * this chat, and Delete chat in About this chat (src/features/messages/).
 * Personal data: one new timestamp per person per chat (when they deleted it); docs/retention.md.
 * Tests: supabase/tests/database/208-message-settings-and-retention.test.sql.
 */

/* ---------- Delete chat: the column ---------- */

alter table public.conversation_members add column deleted_at timestamptz;
comment on column public.conversation_members.deleted_at is
  'When this person last deleted the chat: messages before it are gone for them (S1-E9-04).';

-- The proposal for how long a reported message is kept after its case is decided (OPEN: the
-- reports' own retention). Change it by migration until the settings screen (S1-E11-03).
insert into public.settings (key, value, is_public, description) values
  ('reported_messages_keep_days', '180'::jsonb, false,
   'Days a reported private message and its context are kept after the case is decided, when both people deleted the chat (S1-E9-04, proposal).')
on conflict (key) do nothing;

/**
 * chat_cleared_at: when a person last deleted a chat, or null when they never did.
 * Inputs: the chat's ID and the person's. Internal: the list, the chat and the select policy.
 */
create or replace function public.chat_cleared_at(chat_id uuid, person_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select conversation_members.deleted_at from public.conversation_members
  where conversation_members.conversation_id = chat_id and conversation_members.user_id = person_id;
$$;

comment on function public.chat_cleared_at(uuid, uuid) is
  'Internal: when a person last deleted a chat, or null (S1-E9-04).';
revoke execute on function public.chat_cleared_at(uuid, uuid) from public, anon;
-- The select policy below calls it as the reader, so the signed-in role may run it.
grant execute on function public.chat_cleared_at(uuid, uuid) to authenticated;

/**
 * messages_select_member: as in S1-E9-01, and a person no longer reads the messages from before
 * they deleted the chat (S1-E9-04).
 */
drop policy messages_select_member on public.messages;
create policy messages_select_member
  on public.messages for select to authenticated
  using (
    deleted_at is null
    and exists (select 1 from public.conversations
                where conversations.id = messages.conversation_id
                  and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id))
    and (user_id = (select auth.uid()) or not public.is_moderated_away('message', id))
    and created_at > coalesce(public.chat_cleared_at(conversation_id, (select auth.uid())), '-infinity'::timestamptz)
  );

comment on policy messages_select_member on public.messages is
  'Allows the two people in a chat to read its messages, a moderated one only its writer, none from before the reader deleted the chat (S1-E9-01, S1-E9-04).';

/* ---------- The list and the chat leave out what was deleted ---------- */

/**
 * my_conversations: as in S1-E9-01, and a chat the caller deleted stays out of their list until a
 * message comes after it; the preview never shows a message from before (S1-E9-04).
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

/**
 * conversation_messages_json: as in S1-E9-01, and only the messages after the reader last
 * deleted the chat (S1-E9-04).
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
          -- Only what came after the reader last deleted the chat (S1-E9-04).
          and messages.created_at > coalesce(public.chat_cleared_at(chat_id, reader_id), '-infinity'::timestamptz)
        order by messages.created_at desc limit 200) as recent;
$$;

/* ---------- The settings ---------- */

/**
 * set_message_audience: who may start a chat with the caller: everyone, people they follow or
 * nobody (S1-E9-04 criterion 1). Chats already going carry on (S1-E9-03 criterion 6).
 * Input: audience. Errors: insufficient_privilege when signed out or the account is gone.
 * Where it fits: Settings › Messages.
 */
create or replace function public.set_message_audience(audience public.message_audience)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := public.require_live_profile();
begin
  -- An empty choice keeps the age group's default rather than saving nothing.
  if audience is null then
    raise exception 'Pick who may message you.' using errcode = 'check_violation';
  end if;
  update public.profiles set messages_from = audience where id = caller;
end;
$$;

comment on function public.set_message_audience(public.message_audience) is
  'The caller chooses who may start a chat with them: everyone, people they follow or nobody (S1-E9-04).';
revoke execute on function public.set_message_audience(public.message_audience) from public, anon;
grant execute on function public.set_message_audience(public.message_audience) to authenticated;

/* ---------- Delete chat ---------- */

/**
 * delete_conversation: "Delete chat": removes the chat for the caller only (S1-E9-04). Its
 * messages so far are gone for them, and the clean-up deletes them for good once the other person
 * deletes it too. The other person isn't told.
 * Input: the other person's username. Returns: JSON {deleted_at}.
 * Errors: insufficient_privilege when signed out; no_data_found when there is no chat with that
 *   person; check_violation (hint answer_request) for a request waiting for the caller's answer,
 *   which has its own Delete request (S1-E9-01).
 */
create or replace function public.delete_conversation(other_handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
  other public.profiles;
  chat public.conversations;
begin
  -- Step 1: the person and the chat, even when a block hides them from each other.
  select * into other from public.profile_for_handle(other_handle);
  if other.id is not null then
    chat := public.conversation_between(caller_id, other.id);
  end if;
  if chat.id is null then
    raise exception 'There is no chat with that person.' using errcode = 'no_data_found';
  end if;
  -- Step 2: a request to the caller is answered, not deleted.
  if chat.status = 'request' and chat.recipient_user_id = caller_id then
    raise exception 'Answer the request instead.' using errcode = 'check_violation', hint = 'answer_request';
  end if;
  -- Step 3: the caller's own stamp; nothing changes for the other person.
  update public.conversation_members set deleted_at = now(), last_read_at = now()
    where conversation_members.conversation_id = chat.id and conversation_members.user_id = caller_id;
  return jsonb_build_object('deleted_at', now());
end;
$$;

comment on function public.delete_conversation(text) is
  'Delete chat: removes a chat for the caller only; gone for good once both delete it (S1-E9-04).';
revoke execute on function public.delete_conversation(text) from public, anon;
grant execute on function public.delete_conversation(text) to authenticated;

/* ---------- The clean-up ---------- */

/**
 * held_message_ids: the messages the clean-up must keep for moderation: each message a case is
 * about while the case is open, an authority order preserves it, or it was decided less than
 * reported_messages_keep_days ago, with the up to 20 messages before it (S1-E9-02, S1-E9-04
 * criterion 3). Internal: purge_deleted_chats().
 */
create or replace function public.held_message_ids()
returns table (message_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct (context.item ->> 'id')::uuid
  from public.cases
  cross join lateral jsonb_array_elements(public.message_with_context(cases.item_id)) as context (item)
  where cases.item_type = 'message'
    and (cases.status = 'open'
      or cases.preserve_until > now()
      or cases.decided_at > now() - make_interval(days => coalesce((public.setting_value('reported_messages_keep_days'))::integer, 180)));
$$;

comment on function public.held_message_ids() is
  'Internal: reported messages and their context the clean-up keeps for moderation (S1-E9-04).';
revoke execute on function public.held_message_ids() from public, anon, authenticated;

/**
 * purge_deleted_chats: the nightly clean-up (S1-E9-04 criterion 2). For every chat both people
 * deleted, it permanently deletes the messages sent before the earlier of the two deletions,
 * except those held_message_ids() keeps; then it deletes a chat with no messages left, unless it
 * is a declined request (kept so its sender still can't write again).
 * Returns: how many messages were deleted. Run by pg_cron ('purge-deleted-chats').
 */
create or replace function public.purge_deleted_chats()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  -- Step 1: the messages both people have deleted, less those held for moderation.
  with cleared as (
    select conversation_members.conversation_id, min(conversation_members.deleted_at) as cleared_at
    from public.conversation_members
    group by conversation_members.conversation_id
    having count(*) = count(conversation_members.deleted_at)
  )
  delete from public.messages
  using cleared
  where messages.conversation_id = cleared.conversation_id
    and messages.created_at <= cleared.cleared_at
    and messages.id not in (select held.message_id from public.held_message_ids() as held);
  get diagnostics deleted_count = row_count;
  -- Step 2: an empty chat both deleted goes too (its members with it), except a declined request.
  delete from public.conversations
  where conversations.status <> 'declined'
    and not exists (select 1 from public.messages where messages.conversation_id = conversations.id)
    and not exists (select 1 from public.conversation_members
                    where conversation_members.conversation_id = conversations.id
                      and conversation_members.deleted_at is null);
  return deleted_count;
end;
$$;

comment on function public.purge_deleted_chats() is
  'Nightly: deletes for good the messages of chats both people deleted, keeping reported ones while needed (S1-E9-04).';
revoke execute on function public.purge_deleted_chats() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-deleted-chats', '35 3 * * *', 'select public.purge_deleted_chats()');
