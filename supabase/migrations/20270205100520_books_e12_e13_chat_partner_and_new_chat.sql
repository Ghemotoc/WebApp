/*
 * Migration: the chat header's writer line, the line that says why the message box is gone, and
 * New chat's list of people (user stories 4.2 and 4.3, boards E12-Messages and E13-Chat of
 * "Build: the full design as user stories"; Robert, 25 Nov 2026: "ensure that there are no
 * missing widgets between the pages from the canvas versus the one on the live site").
 *
 * Why:
 * - Board E13 draws a line under the other person's name: "Fiction writer · The Salt Mine Choir,
 *   15 chapters". Nothing gave a chat the person's latest story.
 * - Story 4.3: "When the rules change (an adult and a 16-year-old whose adult messages are off),
 *   the field is replaced by a line saying why and Change for the member who can change it."
 *   conversation_with() never says why sending is off (S1-E9-03); the member whose own switch
 *   stops the chat may now be told, because the reason is their own setting.
 * - Story 4.2: "New chat lists writers the member follows (and who allow messages); nobody else
 *   can be found from here." New chat used to open any username typed.
 * What it changes: chat_partner_story() (new, internal), conversation_with() (two new keys,
 * everything else as before) and new_chat_people() (new).
 * No rule is loosened: can_message(), blocks, message requests and the under-18 defaults are
 * read, never changed.
 * Who calls it: src/features/messages/api/messages.ts (fetchConversation, fetchNewChatPeople).
 * Tests: supabase/tests/database/412-chat-partner-and-new-chat.test.sql.
 */

/**
 * chat_partner_story: the other person's latest story the caller may read, for the chat header.
 * Input: partner_id, the other person's profile ID (never shown).
 * Returns: { title, category_slug, chapter_count } of their most recently updated first-edition
 *   story with at least one chapter the caller may open, or null when there is none. The story
 *   rules come from reader_visible_story(): ratings above the caller's age, blocks, moderation,
 *   private and class-only stories and hidden countries stay out, so the line never names a story
 *   the caller couldn't open.
 * Errors: none.
 * Where it fits: conversation_with(), for board E13's "Fiction writer · The Salt Mine Choir, 15
 *   chapters".
 */
create or replace function public.chat_partner_story(partner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('title', card ->> 'title', 'category_slug', card ->> 'category_slug',
    'chapter_count', (card ->> 'chapter_count')::integer)
  from (
    -- Step 1: the writer's first editions, newest chapter first, that the caller may open.
    select public.story_card_json(stories.id) as card, stories.last_chapter_published_at
    from public.stories
    where stories.user_id = partner_id
      and stories.deleted_at is null
      and stories.edition_of_story_id is null
      and stories.last_chapter_published_at is not null
      and exists (select 1 from public.reader_visible_story(stories.slug))
  ) as candidates
  -- Step 2: only a story with a chapter the caller can read counts.
  where (card ->> 'chapter_count')::integer > 0
  order by candidates.last_chapter_published_at desc
  limit 1;
$$;

comment on function public.chat_partner_story(uuid) is
  'Internal: the other person''s latest story the caller may read, for the chat header (user story 4.3, board E13).';

revoke all on function public.chat_partner_story(uuid) from public;

/**
 * my_adults_switch_stops_chat: whether the caller's own "Let adults message me" switch is what
 * stops them writing in a chat.
 * Input: caller_id and partner_id (profile IDs, never shown).
 * Returns: true when the caller is 16 or 17, their switch is off and the other person is an
 *   adult; false otherwise. It reads only the caller's own setting and age group plus whether the
 *   other is an adult, which the caller's switch is about (Q6, Q13; S1-E9-03).
 * Errors: none.
 * Where it fits: conversation_with(), so the chat can say why and offer Change to the one member
 *   who can change it (user story 4.3). The other person still reads the neutral line.
 */
create or replace function public.my_adults_switch_stops_chat(caller_id uuid, partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.message_age_group(caller) = 'teen'
      and not coalesce(caller.adults_may_message, false)
      and public.message_age_group(partner) = 'adult'
    from public.profiles as caller, public.profiles as partner
    where caller.id = caller_id and partner.id = partner_id), false);
$$;

comment on function public.my_adults_switch_stops_chat(uuid, uuid) is
  'Internal: true when the caller''s own adults switch (16 and 17) is what stops a chat with an adult (user story 4.3).';

revoke all on function public.my_adults_switch_stops_chat(uuid, uuid) from public;

/**
 * conversation_with: one chat by the other person's username, as the caller sees it.
 * Input: other_handle, the other person's username.
 * Returns: as before (S1-E9-01, IDEAS-2 idea 7), plus
 *   - latest_story: the other person's latest story the caller may read (chat_partner_story()),
 *     or null;
 *   - adults_switch_stops: true only when sending is off because of the caller's own "Let adults
 *     message me" switch, so the chat can say so and offer Change (user story 4.3). In every other
 *     case the reason stays unsaid (S1-E9-03).
 *   Null when the person can't be found or blocked the caller.
 * Errors: insufficient_privilege when signed out (require_messaging_caller()).
 * Where it fits: the chat page, /messages/:handle (boards E13).
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
  can_send boolean;
begin
  -- Step 1: someone the caller may see in Messages.
  if other.id is null then
    return null;
  end if;
  -- Step 2: their chat, if they have one, and whether it closed with "No thanks" to the caller.
  chat := public.conversation_between(caller_id, other.id);
  said_no_thanks := chat.user_id = caller_id and public.no_thanks_pause_ends(chat) is not null;
  can_send := public.conversation_can_send(chat, caller_id, other.id);
  -- Step 3: the answer.
  return jsonb_build_object(
    'handle', other.handle,
    'display_name', public.display_name(other.handle, other.pen_name),
    'status', chat.status,
    'is_request_to_me', chat.status = 'request' and chat.recipient_user_id = caller_id,
    'is_waiting', chat.status in ('request', 'declined') and chat.user_id = caller_id and not coalesce(said_no_thanks, false),
    'said_no_thanks', coalesce(said_no_thanks, false),
    'ask_again_from', case when said_no_thanks then public.no_thanks_pause_ends(chat) end,
    'can_send', can_send,
    -- User story 4.3: the caller's own adults switch is the one reason a chat may say.
    'adults_switch_stops', not can_send and public.my_adults_switch_stops_chat(caller_id, other.id),
    'latest_story', public.chat_partner_story(other.id),
    'i_follow', exists (select 1 from public.follows_users
                        where follows_users.user_id = caller_id and follows_users.followed_user_id = other.id),
    'they_follow', exists (select 1 from public.follows_users
                           where follows_users.user_id = other.id and follows_users.followed_user_id = caller_id),
    'messages', case when chat.id is null or (chat.status = 'declined' and chat.recipient_user_id = caller_id)
                     then '[]'::jsonb else public.conversation_messages_json(chat.id, caller_id) end);
end;
$$;

comment on function public.conversation_with(text) is
  'One chat by the other person''s username, as the caller sees it; says why sending is off only when the caller''s own adults switch stops it (S1-E9-01, IDEAS-2 idea 7, user story 4.3).';

revoke all on function public.conversation_with(text) from public;
grant execute on function public.conversation_with(text) to authenticated;

/**
 * new_chat_people: the people New chat offers (user story 4.2).
 * Input: none; the caller is the signed-in member.
 * Returns: a JSON array of { handle, display_name } for the people the caller follows whom the
 *   caller may write to now: can_message() says yes (an active caller, no block either way, the
 *   age rules and the other person's own "who can message me"), or the two already have an
 *   accepted chat the caller may keep writing in. Staff accounts and deleted or moderated profiles
 *   stay out. Ordered by name. Nobody else can be found from here.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: New chat on /messages (board E12).
 */
create or replace function public.new_chat_people()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_messaging_caller();
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object('handle', found.handle,
      'display_name', found.display_name) order by lower(found.display_name), found.handle), '[]'::jsonb)
    from (
      -- Step 1: the people the caller follows, still live and not moderated away.
      select profiles.handle, public.display_name(profiles.handle, profiles.pen_name) as display_name
      from public.follows_users
      join public.profiles on profiles.id = follows_users.followed_user_id
      where follows_users.user_id = caller_id
        and profiles.deleted_at is null
        and profiles.handle is not null
        and not public.is_moderated_away('profile', profiles.id)
        and public.account_state(profiles.id) <> 'staff_account'
        -- Step 2: only those the caller may write to now (the same check as the message box).
        and public.conversation_can_send(public.conversation_between(caller_id, profiles.id),
                                         caller_id, profiles.id)
    ) as found);
end;
$$;

comment on function public.new_chat_people() is
  'The people the caller follows whom they may write to now, for New chat (user story 4.2, board E12).';

revoke all on function public.new_chat_people() from public;
grant execute on function public.new_chat_people() to authenticated;
