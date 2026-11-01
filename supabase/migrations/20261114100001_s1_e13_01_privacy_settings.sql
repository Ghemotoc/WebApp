/*
 * Privacy settings (story S1-E13-01; board Settings 6.3, the Privacy tab; GDPR art. 25(2), privacy
 * by default; Q50).
 *
 * What it adds:
 * - profiles.profile_visible_to: who sees the whole profile (everyone, people with an account, or
 *   people the owner follows). Null means the age group's default: everyone for an adult, people
 *   the owner follows for an under-18 (criterion 2: the most private value). The pen name and the
 *   published stories always show; the bio and the month someone joined follow the choice (the
 *   board's help line). Forum activity and followers lists follow it once they exist (S1-E8).
 * - profiles.library_visible_to: who sees the stories on someone's library shelves on their
 *   profile: only them (everyone's default, the most private), people they follow, or everyone.
 * - profiles.last_active_at: when the person last had the app open, kept only while "Show when I'm
 *   online" (profiles.shows_online_status, S1-E5-05) is on, and cleared the moment it goes off
 *   and every night once a day old (data minimisation, GDPR art. 5(1)(c)).
 * - my_privacy_settings() and the setters set_profile_audience(), set_library_audience() and
 *   set_shows_online_status(); note_i_am_online() and who_is_online() for the small dot.
 * - get_writer_profile(): the limited view, and whether the visitor may see the library shelf.
 * - get_story_page() and search_writers(): the writer's bio follows the same choice.
 * - The story list 'reader_library' (key: a username), for the profile's library shelf and its
 *   See all page at /u/<username>/library.
 * No new table, so no new policy: every read and write goes through these functions.
 * Who calls it: src/features/privacy/ (Settings › Privacy, the dot, the heartbeat) and
 * src/features/people/ (the profile).
 */

/* ---------- The choices ---------- */

create type public.profile_audience as enum ('everyone', 'members', 'people_i_follow');
comment on type public.profile_audience is
  'Who sees someone''s whole profile: everyone, people with an account, or people they follow (S1-E13-01).';

create type public.library_audience as enum ('only_me', 'people_i_follow', 'everyone');
comment on type public.library_audience is
  'Who sees someone''s library shelves on their profile (S1-E13-01).';

alter table public.profiles
  add column profile_visible_to public.profile_audience,
  add column library_visible_to public.library_audience not null default 'only_me',
  add column last_active_at timestamptz;

comment on column public.profiles.profile_visible_to is
  'Who sees the whole profile; null is the age group''s default: everyone for adults, people_i_follow under 18 (S1-E13-01).';
comment on column public.profiles.library_visible_to is
  'Who sees the person''s library shelves on their profile; only_me for everyone at first (S1-E13-01).';
comment on column public.profiles.last_active_at is
  'When the person last had the app open; kept only while shows_online_status is on, cleared when it goes off and nightly after a day (S1-E13-01).';
comment on column public.profiles.shows_online_status is
  'The opt-in to show online status: off by default (Q50). While on, the people this person follows see a dot by their name (S1-E13-01).';

/* ---------- Who may see what ---------- */

/**
 * profile_audience_of: someone's profile choice, with the age group's default when they haven't
 * chosen.
 * Input: the profile row. Returns: everyone for an adult, people_i_follow for anyone younger or
 * whose age we can't work out (criterion 2: under-18s start on the most private value; an unknown
 * age is read the safest way, as in message_audience_of()).
 * Internal: profile_is_open_to().
 */
create or replace function public.profile_audience_of(person public.profiles)
returns public.profile_audience
language sql
stable
set search_path = ''
as $$
  select coalesce(
    person.profile_visible_to,
    case
      when public.age_band_from_birth(person.birth_year, person.birth_month, person.age_check_result,
        (now() at time zone 'Europe/Bucharest')::date) = '18_plus' then 'everyone'::public.profile_audience
      else 'people_i_follow'::public.profile_audience
    end);
$$;

comment on function public.profile_audience_of(public.profiles) is
  'Internal: a person''s profile choice with the age group''s default (S1-E13-01).';
revoke execute on function public.profile_audience_of(public.profiles) from public, anon, authenticated;

/**
 * profile_is_open_to: whether a visitor sees someone's whole profile (the bio and the join month).
 * Inputs: owner, the profile row; viewer_id, the visitor's user ID or null when signed out.
 * Returns: true for the owner themselves; otherwise as the owner chose: everyone, anyone signed
 * in, or only people the owner follows.
 * Internal: get_writer_profile(), bio_for_caller().
 */
create or replace function public.profile_is_open_to(owner public.profiles, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when viewer_id is not null and viewer_id = owner.id then true
    else case public.profile_audience_of(owner)
      when 'everyone' then true
      when 'members' then viewer_id is not null
      else exists (select 1 from public.follows_users
                   where follows_users.user_id = owner.id and follows_users.followed_user_id = viewer_id)
    end
  end;
$$;

comment on function public.profile_is_open_to(public.profiles, uuid) is
  'Internal: whether a visitor sees someone''s whole profile (S1-E13-01).';
revoke execute on function public.profile_is_open_to(public.profiles, uuid) from public, anon, authenticated;

/**
 * library_is_open_to: whether a visitor sees someone's library shelves on their profile.
 * Inputs: owner, the profile row; viewer_id, the visitor's user ID or null when signed out.
 * Returns: true for the owner themselves; otherwise as the owner chose: nobody else, people the
 * owner follows, or everyone.
 * Internal: get_writer_profile(), list_holds_story().
 */
create or replace function public.library_is_open_to(owner public.profiles, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when viewer_id is not null and viewer_id = owner.id then true
    else case owner.library_visible_to
      when 'everyone' then true
      when 'people_i_follow' then exists (
        select 1 from public.follows_users
        where follows_users.user_id = owner.id and follows_users.followed_user_id = viewer_id)
      else false
    end
  end;
$$;

comment on function public.library_is_open_to(public.profiles, uuid) is
  'Internal: whether a visitor sees someone''s library shelves (S1-E13-01).';
revoke execute on function public.library_is_open_to(public.profiles, uuid) from public, anon, authenticated;

/**
 * bio_for_caller: someone's bio as the caller may see it.
 * Input: the profile row. Returns: the bio, or '' when the owner keeps their profile from the
 * caller, so every screen that shows a bio follows the one choice (the board's help line).
 * Internal: get_writer_profile(), get_story_page(), search_writers().
 */
create or replace function public.bio_for_caller(person public.profiles)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.profile_is_open_to(person, (select auth.uid())) then person.bio else '' end;
$$;

comment on function public.bio_for_caller(public.profiles) is
  'Internal: the bio, or nothing when the owner keeps their profile from the caller (S1-E13-01).';
revoke execute on function public.bio_for_caller(public.profiles) from public, anon, authenticated;

/* ---------- Settings › Privacy ---------- */

/**
 * my_privacy_settings: the caller's own privacy choices, for Settings › Privacy.
 * Returns: JSON {profile_audience, library_audience, shows_online_status, message_audience,
 *   is_under_18}; each value already has the age group's default filled in, and is_under_18 shows
 *   the note "every setting here started at its most private choice".
 * Errors: insufficient_privilege (hint signed_out) when signed out.
 * Where it fits: usePrivacySettings → this function.
 */
create or replace function public.my_privacy_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile_audience', public.profile_audience_of(profiles),
    'library_audience', profiles.library_visible_to,
    'shows_online_status', profiles.shows_online_status,
    'message_audience', public.message_audience_of(profiles),
    'is_under_18', public.message_age_group(profiles) <> 'adult')
  from public.profiles where profiles.id = public.require_live_profile();
$$;

comment on function public.my_privacy_settings() is
  'The caller''s own privacy choices with the defaults filled in (S1-E13-01).';
revoke execute on function public.my_privacy_settings() from public, anon;
grant execute on function public.my_privacy_settings() to authenticated;

/**
 * set_profile_audience: saves who sees the caller's whole profile.
 * Input: audience. Returns: nothing.
 * Errors: insufficient_privilege (hint signed_out); check_violation for an empty choice.
 * Rules: any signed-in member may make their profile more or less private, read-only accounts
 * included, because hiding oneself is a protection (GDPR art. 25).
 */
create or replace function public.set_profile_audience(audience public.profile_audience)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  -- Step 1: a choice is needed.
  if audience is null then
    raise exception 'Choose who can see your profile.' using errcode = 'check_violation';
  end if;
  -- Step 2: save it.
  update public.profiles set profile_visible_to = audience where profiles.id = caller_id;
end;
$$;

comment on function public.set_profile_audience(public.profile_audience) is
  'Saves who sees the caller''s whole profile (S1-E13-01).';
revoke execute on function public.set_profile_audience(public.profile_audience) from public, anon;
grant execute on function public.set_profile_audience(public.profile_audience) to authenticated;

/**
 * set_library_audience: saves who sees the caller's library shelves on their profile.
 * Input: audience. Returns: nothing.
 * Errors: insufficient_privilege (hint signed_out); check_violation for an empty choice.
 */
create or replace function public.set_library_audience(audience public.library_audience)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  -- Step 1: a choice is needed.
  if audience is null then
    raise exception 'Choose who can see your library.' using errcode = 'check_violation';
  end if;
  -- Step 2: save it.
  update public.profiles set library_visible_to = audience where profiles.id = caller_id;
end;
$$;

comment on function public.set_library_audience(public.library_audience) is
  'Saves who sees the caller''s library shelves (S1-E13-01).';
revoke execute on function public.set_library_audience(public.library_audience) from public, anon;
grant execute on function public.set_library_audience(public.library_audience) to authenticated;

/**
 * set_shows_online_status: turns "Show when I'm online" on or off.
 * Input: should_show. Returns: nothing.
 * Errors: insufficient_privilege (hint signed_out); check_violation for an empty choice.
 * Rules: turning it off forgets when the person was last active at once (GDPR art. 5(1)(c)).
 */
create or replace function public.set_shows_online_status(should_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  -- Step 1: a choice is needed.
  if should_show is null then
    raise exception 'Choose whether to show when you''re online.' using errcode = 'check_violation';
  end if;
  -- Step 2: save it; switched off, the last active time goes too.
  update public.profiles
  set shows_online_status = should_show,
      last_active_at = case when should_show then last_active_at end
  where profiles.id = caller_id;
end;
$$;

comment on function public.set_shows_online_status(boolean) is
  'Turns online status on or off; off forgets the last active time (S1-E13-01).';
revoke execute on function public.set_shows_online_status(boolean) from public, anon;
grant execute on function public.set_shows_online_status(boolean) to authenticated;

/* ---------- The online dot ---------- */

/**
 * note_i_am_online: records that the caller has the app open, only while their online status is
 * on; otherwise it keeps nothing.
 * Returns: nothing. Errors: insufficient_privilege (hint signed_out).
 * Where it fits: PresenceHeartbeat calls it once a minute while the tab is in front.
 */
create or replace function public.note_i_am_online()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  update public.profiles set last_active_at = now()
  where profiles.id = caller_id and profiles.shows_online_status;
end;
$$;

comment on function public.note_i_am_online() is
  'Records that the caller is online, only while their online status is on (S1-E13-01).';
revoke execute on function public.note_i_am_online() from public, anon;
grant execute on function public.note_i_am_online() to authenticated;

/**
 * who_is_online: which of some usernames show as online to the caller.
 * Input: wanted_handles, up to 100 usernames (more are ignored). Returns: the usernames, as
 *   stored, of the people who are online for the caller; empty when signed out.
 * Rules (the board's help line): the person turned online status on, follows the caller, was
 *   active in the last 5 minutes, neither blocks the other and their profile isn't moderated away.
 * Where it fits: useOnlineHandles → this function, every minute.
 */
create or replace function public.who_is_online(wanted_handles text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(person.handle order by person.handle), '{}')
  from (select distinct candidate from unnest(wanted_handles[1:100]) as candidate) as wanted
  cross join lateral public.profile_for_handle(wanted.candidate) as person
  where (select auth.uid()) is not null
    and person.shows_online_status
    and person.last_active_at > now() - interval '5 minutes'
    and exists (select 1 from public.follows_users
                where follows_users.user_id = person.id and follows_users.followed_user_id = (select auth.uid()))
    and not exists (select 1 from public.blocks
                    where (blocks.user_id = person.id and blocks.blocked_user_id = (select auth.uid()))
                       or (blocks.user_id = (select auth.uid()) and blocks.blocked_user_id = person.id))
    and not public.is_moderated_away('profile', person.id);
$$;

comment on function public.who_is_online(text[]) is
  'Which of some usernames show as online to the caller (S1-E13-01).';
revoke execute on function public.who_is_online(text[]) from public, anon;
grant execute on function public.who_is_online(text[]) to authenticated;

/**
 * forget_old_activity: clears last active times more than a day old, so nobody's habits build up
 * (GDPR art. 5(1)(e)). Returns: how many were cleared. Called by: the nightly job below.
 */
create or replace function public.forget_old_activity()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleared integer;
begin
  update public.profiles set last_active_at = null
  where last_active_at < now() - interval '1 day';
  get diagnostics cleared = row_count;
  return cleared;
end;
$$;

comment on function public.forget_old_activity() is
  'Clears last active times more than a day old (S1-E13-01).';
revoke execute on function public.forget_old_activity() from public, anon, authenticated;

select cron.schedule('forget-old-activity', '40 3 * * *', 'select public.forget_old_activity();');

/* ---------- The profile ---------- */

/**
 * get_writer_profile: as in S1-E9-03, plus the privacy choices (S1-E13-01):
 * - is_limited: true when the owner keeps their whole profile from this visitor; the bio is then
 *   empty and joined_at null (the pen name, the stories and the numbers still show);
 * - library_open: whether the visitor sees the owner's library shelf;
 * - library_audience: the owner's own choice, only on their own profile (null for anyone else).
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
  is_open boolean;
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
  -- Step 5: the owner's privacy choice (S1-E13-01).
  is_open := public.profile_is_open_to(writer, caller_id);
  -- Step 6: the answer, from the public columns only; can_message never says why (S1-E9-03).
  return jsonb_build_object(
    'handle', writer.handle,
    'display_name', public.display_name(writer.handle, writer.pen_name),
    'pen_name', nullif(btrim(coalesce(writer.pen_name, '')), ''),
    'bio', case when is_open then writer.bio else '' end,
    'joined_at', case when is_open then writer.created_at end,
    'is_limited', not is_open,
    'is_me', is_me,
    'i_blocked', i_blocked,
    'is_teacher', writer.teacher_badge_since is not null,
    'can_message', case when caller_id is null or is_me then null
                        else public.can_message(caller_id, writer.id) end,
    'library_open', not i_blocked and public.library_is_open_to(writer, caller_id),
    'library_audience', case when is_me then writer.library_visible_to end,
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

/* ---------- Story lists: someone's library ---------- */

/**
 * is_story_list_kind: whether browse_stories() knows a list.
 * As in S1-E2-06, plus 'reader_library' (S1-E13-01). Internal: browse_stories().
 */
create or replace function public.is_story_list_kind(list_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics', 'library', 'picked', 'reader_library');
$$;

/**
 * list_holds_story: whether a story belongs to a list.
 * As in S1-E2-06, plus 'reader_library' (S1-E13-01): a story on any shelf of the person whose
 * username is the key, only when they let the caller see their library (library_is_open_to()).
 * Internal: listed_stories().
 */
create or replace function public.list_holds_story(target public.stories, list_kind text, list_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case list_kind
    when 'updated' then true
    when 'new' then true
    when 'popular' then true
    when 'rising' then (
      select min(earlier.first_published_at) from public.stories as earlier
      where earlier.user_id = target.user_id and earlier.deleted_at is null
    ) >= now() - make_interval(days => coalesce(public.setting_value('rising_writer_days') #>> '{}', '90')::integer)
    when 'completed' then target.completion_status = 'completed'
    when 'category' then exists (
      select 1 from public.categories where categories.id = target.category_id and categories.slug = list_key)
    -- CMS-1e: the tag a name stands for in any language ("fantezie" is Fantasy), approved only.
    when 'tag' then exists (
      select 1 from public.story_tags
      where story_tags.story_id = target.id and story_tags.tag_id = public.tag_for_name(list_key))
    when 'following' then exists (
      select 1 from public.follows_users
      where follows_users.user_id = (select auth.uid()) and follows_users.followed_user_id = target.user_id)
    when 'writer' then target.user_id = (select profile.id from public.profile_for_handle(list_key) as profile)
    -- S1-E5-04: the stories that answer the search term.
    when 'search' then public.story_matches_search(target, list_key)
    -- S1-E5-06: the public-domain classics.
    when 'classics' then target.classic_author_id is not null
    -- S1-E4-03: one shelf of the caller's own library.
    when 'library' then exists (
      select 1 from public.library_entries
      where library_entries.user_id = (select auth.uid()) and library_entries.story_id = target.id
        and library_entries.shelf::text = list_key)
    -- S1-E2-06: the caller's own likes.
    when 'picked' then exists (
      select 1 from public.reading_preferences
      where reading_preferences.user_id = (select auth.uid())
        and ((reading_preferences.preference_kind = 'read' and reading_preferences.category_id = target.category_id)
          or (reading_preferences.preference_kind = 'topic' and exists (
            select 1 from public.story_tags
            where story_tags.story_id = target.id and story_tags.tag_id = reading_preferences.tag_id))))
    -- S1-E13-01: someone's library, by their username, when they let the caller see it.
    when 'reader_library' then exists (
      select 1 from public.profile_for_handle(list_key) as owner
      join public.library_entries on library_entries.user_id = owner.id
      where library_entries.story_id = target.id
        and public.library_is_open_to(owner, (select auth.uid())))
    else false
  end;
$$;

/* ---------- The bio follows the profile choice everywhere ---------- */

/**
 * get_story_page: as in CMS-1e, with the writer's bio from bio_for_caller(), so a writer who keeps
 * their profile to fewer people shows no bio on the story page either (S1-E13-01).
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', public.bio_for_caller(profiles),
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner,
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;

/**
 * search_writers: as in S1-E5-04, with each writer's bio from bio_for_caller() (S1-E13-01).
 */
create or replace function public.search_writers(term text, page_size integer default 21, page_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  folded text := public.search_fold(term);
  total integer;
  page jsonb;
begin
  -- Step 1: a term of at least 2 letters and a page that starts at 0 or later.
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first writer.' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(folded) < 2 then
    return jsonb_build_object('total', 0, 'writers', '[]'::jsonb);
  end if;
  -- Step 2: the writers of the stories this reader may see, whose names contain the term; then
  -- the count and one page, best match first.
  with found_writers as (
    select profiles.handle, public.display_name(profiles.handle, profiles.pen_name) as display_name,
      public.bio_for_caller(profiles) as bio, count(*)::integer as story_count,
      (public.search_fold(profiles.handle) like folded || '%'
        or public.search_fold(profiles.pen_name) like folded || '%') as starts_with
    from public.listed_stories('popular', null, null, null, null) as visible
    join public.profiles on profiles.id = visible.user_id
    where not public.is_moderated_away('profile', profiles.id)
      and (public.search_fold(profiles.handle) like public.search_like_pattern(term)
        or public.search_fold(profiles.pen_name) like public.search_like_pattern(term))
    group by profiles.id
  ),
  ordered as (
    select found_writers.*, row_number() over (order by found_writers.starts_with desc,
      found_writers.story_count desc, found_writers.handle) as position
    from found_writers
  )
  select (select count(*)::integer from found_writers),
    coalesce((select jsonb_agg(jsonb_build_object('handle', ordered.handle, 'display_name', ordered.display_name,
        'bio', ordered.bio, 'story_count', ordered.story_count) order by ordered.position)
      from ordered where ordered.position > coalesce(page_offset, 0)
        and ordered.position <= coalesce(page_offset, 0) + wanted_rows), '[]'::jsonb)
  into total, page;
  return jsonb_build_object('total', total, 'writers', page);
end;
$$;
