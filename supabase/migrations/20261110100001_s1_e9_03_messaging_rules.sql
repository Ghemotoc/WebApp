/*
 * Migration: who may message whom (story S1-E9-03; docs/stories/s1-e09-private-messages.md;
 * bundle MESSAGES, part a; board Messages 5.5, "What an adult sees on your profile").
 *
 * How it works, from the top:
 * - can_message(sender, recipient) is the one rule every later messaging function asks before a
 *   new conversation or message request (parts b to d). No client calls it directly;
 * - the age rules (decided 16 Oct 2026, Q6 and Q13): an under-16 and an adult can never message
 *   each other, teachers included, and no setting changes that; a 16 or 17-year-old and an adult
 *   only when the teen has turned "Let adults message me" on (profiles.adults_may_message, off by
 *   default, S1-E2-06). Proposal: that holds both ways, so a teen with the switch off can't open
 *   a chat an adult then answers in. Under-18s with each other follow the normal rules. An age we
 *   can't work out counts as under 16, the safest reading;
 * - a block either way stops it (S1-E5-05);
 * - the recipient's own setting, profiles.messages_from: everyone, people they follow, or nobody.
 *   Empty means the default for their age group (the story's proposal: people they follow for
 *   under-18s; everyone for adults, a proposal). Settings to change it come with part d
 *   (S1-E9-04);
 * - the sender must be an active member (account_state() active);
 * - get_writer_profile() now says can_message for the signed-in visitor, and nothing about why:
 *   a false shows "<name> isn't taking messages right now", the same note for an age rule, a
 *   setting or a block, so no screen or answer tells an adult anyone's age (Robert, canvas
 *   comment, 17 Oct 2026).
 * Turning 18 needs no job: the age group is worked out from the year each time, so new
 * conversations follow the new rule the day it changes, and part b lets existing ones continue.
 * Personal data: one setting per account (who may message them).
 * Who calls it: parts b to d, and src/features/people/ (the profile's note).
 * Tests: supabase/tests/database/205-messaging-rules.test.sql.
 */

/* ---------- Who a person takes messages from ---------- */

create type public.message_audience as enum ('everyone', 'people_i_follow', 'nobody');

comment on type public.message_audience is
  'Who may start a private chat with a person: everyone, people they follow, or nobody (S1-E9-03, S1-E9-04).';

alter table public.profiles add column messages_from public.message_audience;

comment on column public.profiles.messages_from is
  'Who may message this person; empty means the default for their age group (S1-E9-03). Never public.';

/**
 * message_audience_of: who a person takes messages from, with the age group's default filled in.
 * Input: the profile row. Returns: their setting, or people_i_follow under 18 and everyone for
 * adults when they haven't chosen (the story's proposal for under-18s; a proposal for adults).
 * Internal: can_message().
 */
create or replace function public.message_audience_of(person public.profiles)
returns public.message_audience
language sql
stable
set search_path = ''
as $$
  select coalesce(
    person.messages_from,
    case
      when public.age_band_from_birth(person.birth_year, person.birth_month, person.age_check_result,
        (now() at time zone 'Europe/Bucharest')::date) = '18_plus' then 'everyone'::public.message_audience
      else 'people_i_follow'::public.message_audience
    end);
$$;

comment on function public.message_audience_of(public.profiles) is
  'Internal: a person''s message setting with the age group''s default (S1-E9-03).';
revoke execute on function public.message_audience_of(public.profiles) from public, anon, authenticated;

/**
 * message_age_group: the age group the messaging rules use: adult, teen (16 or 17) or child.
 * Input: the profile row. Returns: 'adult', 'teen' or 'child'; an under-13 or an age we can't work
 * out counts as a child, the safest reading (S1-E9-03).
 * Internal: ages_allow_messages().
 */
create or replace function public.message_age_group(person public.profiles)
returns text
language sql
stable
set search_path = ''
as $$
  select case public.age_band_from_birth(person.birth_year, person.birth_month,
                person.age_check_result, (now() at time zone 'Europe/Bucharest')::date)
    when '18_plus' then 'adult'
    when '16_to_17' then 'teen'
    else 'child'
  end;
$$;

comment on function public.message_age_group(public.profiles) is
  'Internal: adult, teen (16 or 17) or child (anything younger or unknown) for the messaging rules (S1-E9-03).';
revoke execute on function public.message_age_group(public.profiles) from public, anon, authenticated;

/**
 * ages_allow_messages: whether two people's ages let them message each other, either way round.
 * Input: the two profile rows. Returns: true or false.
 * Rules (decided 16 Oct 2026, Q6 and Q13): a child (under 16) and an adult never; a teen (16 or
 * 17) and an adult only when the teen has turned adults_may_message on; anyone else yes.
 * Internal: can_message().
 */
create or replace function public.ages_allow_messages(first_person public.profiles, second_person public.profiles)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  first_group text := public.message_age_group(first_person);
  second_group text := public.message_age_group(second_person);
begin
  -- Step 1: two adults, or two people under 18, follow the normal rules.
  if (first_group = 'adult') = (second_group = 'adult') then
    return true;
  end if;
  -- Step 2: an under-16 and an adult: never, and no setting changes it.
  if first_group = 'child' or second_group = 'child' then
    return false;
  end if;
  -- Step 3: a 16 or 17-year-old and an adult: only with the teen's own switch on.
  if first_group = 'teen' then
    return first_person.adults_may_message;
  end if;
  return second_person.adults_may_message;
end;
$$;

comment on function public.ages_allow_messages(public.profiles, public.profiles) is
  'Internal: whether two people''s ages allow messages either way (S1-E9-03; Q6, Q13).';
revoke execute on function public.ages_allow_messages(public.profiles, public.profiles) from public, anon, authenticated;

/**
 * can_message: whether sender may start a conversation or a message request with recipient.
 * Inputs: the two user IDs. Returns: true or false, never why (Robert, 17 Oct 2026: nothing may
 * tell an adult someone's age).
 * Checks, in order: two different live profiles; the sender is an active member; no block either
 * way; the age rules; the recipient's setting (nobody, people they follow, or everyone).
 * Where it fits: every messaging function of parts b to d asks it first, and
 * get_writer_profile() shows its answer as the profile's note. Internal: no client calls it.
 */
create or replace function public.can_message(sender_id uuid, recipient_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  sender public.profiles;
  recipient public.profiles;
  audience public.message_audience;
begin
  -- Step 1: two different people, both with a live profile.
  if sender_id is null or recipient_id is null or sender_id = recipient_id then
    return false;
  end if;
  select * into sender from public.profiles where id = sender_id and deleted_at is null;
  select * into recipient from public.profiles where id = recipient_id and deleted_at is null;
  if sender.id is null or recipient.id is null then
    return false;
  end if;
  -- Step 2: only an active member starts a conversation (the account gate, architecture 1.7.8).
  if public.account_state(sender_id) <> 'active' then
    return false;
  end if;
  -- Step 3: a block either way ends it (S1-E5-05).
  if exists (select 1 from public.blocks
             where (blocks.user_id = sender_id and blocks.blocked_user_id = recipient_id)
                or (blocks.user_id = recipient_id and blocks.blocked_user_id = sender_id)) then
    return false;
  end if;
  -- Step 4: the age rules (Q6, Q13).
  if not public.ages_allow_messages(sender, recipient) then
    return false;
  end if;
  -- Step 5: the recipient's own setting.
  audience := public.message_audience_of(recipient);
  if audience = 'nobody' then
    return false;
  end if;
  if audience = 'people_i_follow' then
    return exists (select 1 from public.follows_users
                   where follows_users.user_id = recipient_id and follows_users.followed_user_id = sender_id);
  end if;
  return true;
end;
$$;

comment on function public.can_message(uuid, uuid) is
  'Internal: whether one member may start a conversation with another; never says why (S1-E9-03).';
revoke execute on function public.can_message(uuid, uuid) from public, anon, authenticated;

/* ---------- The profile's note ---------- */

/**
 * get_writer_profile: as in S1-E2-11, plus can_message for the signed-in visitor (S1-E9-03): true
 * or false for someone else's profile, null signed out or on one's own. A false shows the
 * neutral "isn't taking messages right now" note, whatever the reason.
 * Input: the username. Returns: the profile as JSON, or null when there is none to show.
 */
create or replace function public.get_writer_profile(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  writer public.profiles;
  is_me boolean;
  i_blocked boolean;
  story_cards jsonb;
begin
  -- Step 1: the live profile behind the username.
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found then
    return null;
  end if;
  is_me := caller_id is not null and caller_id = writer.id;
  -- Step 2: hidden or removed by a moderator: gone for everyone but its owner.
  if not is_me and public.is_moderated_away('profile', writer.id) then
    return null;
  end if;
  -- Step 3: this person blocks the caller: as if there were no such profile.
  if exists (select 1 from public.blocks where blocks.user_id = writer.id and blocks.blocked_user_id = caller_id) then
    return null;
  end if;
  -- Step 4: the caller blocks this person: the header only, so they can unblock.
  i_blocked := exists (select 1 from public.blocks where blocks.user_id = caller_id and blocks.blocked_user_id = writer.id);
  story_cards := case when i_blocked then '[]'::jsonb else public.profile_story_cards(writer.id, is_me) end;
  -- Step 5: the answer, from the public columns only; can_message never says why (S1-E9-03).
  return jsonb_build_object(
    'handle', writer.handle,
    'display_name', public.display_name(writer.handle, writer.pen_name),
    'pen_name', nullif(btrim(coalesce(writer.pen_name, '')), ''),
    'bio', writer.bio,
    'joined_at', writer.created_at,
    'is_me', is_me,
    'i_blocked', i_blocked,
    'is_teacher', writer.teacher_badge_since is not null,
    'can_message', case when caller_id is null or is_me then null
                        else public.can_message(caller_id, writer.id) end,
    'counts', jsonb_build_object(
      'stories', jsonb_array_length(story_cards),
      'chapters', (select coalesce(sum((story ->> 'chapter_count')::integer), 0) from jsonb_array_elements(story_cards) as story),
      'reads', (select coalesce(sum(chapter_reads.total), 0)
        from public.chapter_reads
        join public.chapters on chapters.id = chapter_reads.chapter_id
        where chapters.story_id in (select (story ->> 'id')::uuid from jsonb_array_elements(story_cards) as story)
          and public.chapter_is_readable(chapters.id))),
    'stories', story_cards
  );
end;
$$;
