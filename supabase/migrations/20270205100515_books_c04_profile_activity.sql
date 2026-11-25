/*
 * Migration: what a writer's profile needs to look as drawn on boards C04 to C06 (bundle 3 of
 * "Build: the full design as user stories"; Robert, 25 Nov 2026, 09:50 UTC: "ensure that there
 * are no missing widgets between the pages from the canvas versus the one on the live site ...
 * And also how they could be editable from the backend").
 *
 * What it adds:
 *   - profile_activity(handle, language): the numbers and lines the profile draws beyond
 *     get_writer_profile(): how many accounts the person follows, how many public bookshelves
 *     they keep, how many forum posts the caller can read, the three latest of those posts
 *     ("Recent posts in Together") and the open spaces they run ("Also on").
 *   - profile_bookshelves(handle): the person's public bookshelves, for the profile's
 *     bookshelves page (board C06), in the same shape as my_reading_lists().
 *   - one ad slot, profile_side: the profile's side box under the safety card (board C04). The
 *     profile keeps its wide banner as position 1, so it stays within two slots a page; staff
 *     switch it on and book it in Sponsors › Placements like every other slot.
 * Privacy: both functions answer only what the profile itself would show the caller: nothing
 * for an unknown, removed or hidden profile, for a person who blocks the caller, or for one the
 * caller blocks; nothing either when the owner keeps their profile from this caller
 * (profile_is_open_to, S1-E13-01). Posts count and list only what the caller may read
 * (forum_thread_is_shown and forum_post_state_for_caller, so private and class spaces stay
 * private). Never the user ID.
 * Who calls them: src/features/people/api/profileActivity.ts (useProfileActivity,
 * useProfileBookshelves) for WriterProfilePage and ProfileBookshelvesPage.
 * Tests: supabase/tests/database/414-profile-activity.test.sql.
 */

/**
 * profile_is_shown_to_caller: whether a profile's extra parts may be shown to the caller.
 * Internal. Input: the profile row. Returns true only when the profile is live, not moderated
 * away (for anyone but its owner), neither side blocks the other and its owner's privacy choice
 * lets the caller in. Same rules as get_writer_profile() and profile_signature().
 */
create or replace function public.profile_is_shown_to_caller(writer public.profiles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select writer.id is not null
    and (writer.id = (select auth.uid()) or not public.is_moderated_away('profile', writer.id))
    and not public.is_blocked_with(writer.id)
    and public.profile_is_open_to(writer, (select auth.uid()));
$$;
comment on function public.profile_is_shown_to_caller(public.profiles) is
  'Internal: a profile''s extra parts (activity, bookshelves) show only where the profile itself shows (board C04).';
revoke execute on function public.profile_is_shown_to_caller(public.profiles) from public;

/**
 * profile_recent_posts_json: the person's latest forum posts the caller may read. Internal.
 * Inputs: the person's ID, the caller's language (for the forum's name) and how many. Returns a
 * JSON array of {thread_title, forum_slug, forum_name, thread_number, post_number, posted_at},
 * newest first.
 */
create or replace function public.profile_recent_posts_json(
  writer_id uuid, wanted_language text, how_many integer
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(recent.item order by recent.posted_at desc), '[]'::jsonb)
  from (
    select forum_posts.created_at as posted_at,
      jsonb_build_object(
        'thread_title', forum_threads.title,
        'forum_slug', forums.slug,
        'forum_name', (select names.name from public.forum_name_in(forums.id, wanted_language) as names),
        'thread_number', forum_threads.thread_number,
        'post_number', forum_posts.post_number,
        'posted_at', forum_posts.created_at) as item
    from public.forum_posts
    join public.forum_threads on forum_threads.id = forum_posts.thread_id
    join public.forums on forums.id = forum_threads.forum_id
    where forum_posts.user_id = writer_id
      and public.forum_thread_is_shown(forum_threads)
      and public.forum_post_state_for_caller(forum_posts) = 'live'
    order by forum_posts.created_at desc
    limit how_many
  ) as recent;
$$;
comment on function public.profile_recent_posts_json(uuid, text, integer) is
  'Internal: a person''s latest forum posts that the caller may read (board C04, Recent posts in Together).';
revoke execute on function public.profile_recent_posts_json(uuid, text, integer) from public;

/**
 * profile_activity: the profile's extra numbers and lines (board C04).
 * Inputs: the username, and the caller's language code for forum names ('ro', 'en').
 * Returns: {following, public_bookshelves, post_count, recent_posts, spaces} or null when the
 *   profile isn't shown to the caller. following counts live accounts only; post_count counts
 *   only posts the caller may read; spaces are the open spaces the person runs that the caller
 *   may see, as {name, slug}, by name.
 * Errors: none; an unknown username answers null.
 * Where it fits: WriterProfilePage → useProfileActivity → here.
 */
create or replace function public.profile_activity(wanted_handle text, wanted_language text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  writer public.profiles;
begin
  -- Step 1: the live profile behind the username, shown to this caller.
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found or not public.profile_is_shown_to_caller(writer) then
    return null;
  end if;
  -- Step 2: the numbers and lines, each limited to what the caller may see.
  return jsonb_build_object(
    'following', (select count(*) from public.follows_users
      join public.profiles as followed on followed.id = follows_users.followed_user_id
      where follows_users.user_id = writer.id and followed.deleted_at is null),
    'public_bookshelves', (select count(*) from public.reading_lists
      where reading_lists.user_id = writer.id and reading_lists.is_public
        and public.reading_list_is_visible(reading_lists)),
    'post_count', (select count(*) from public.forum_posts
      join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_posts.user_id = writer.id
        and public.forum_thread_is_shown(forum_threads)
        and public.forum_post_state_for_caller(forum_posts) = 'live'),
    'recent_posts', public.profile_recent_posts_json(writer.id, wanted_language, 3),
    'spaces', (select coalesce(jsonb_agg(jsonb_build_object('name', spaces.name, 'slug', spaces.slug)
        order by spaces.name), '[]'::jsonb)
      from public.spaces
      where spaces.user_id = writer.id and spaces.kind = 'open' and spaces.archived_at is null
        and public.space_card_visible(spaces)));
end;
$$;
comment on function public.profile_activity(text, text) is
  'A profile''s following count, public bookshelves, readable forum posts and open spaces; never the user ID (board C04).';
revoke execute on function public.profile_activity(text, text) from public;
grant execute on function public.profile_activity(text, text) to anon, authenticated;

/**
 * profile_bookshelves: a person's public bookshelves, the one changed last first (board C06).
 * Input: the username. Returns: a JSON array in the shape of my_reading_lists() (name, who sees
 *   it, the stories on it the caller may see), or null when the profile isn't shown to the
 *   caller. Private bookshelves never appear, even on one's own profile: this is the public view.
 * Errors: none; an unknown username answers null.
 * Where it fits: ProfileBookshelvesPage → useProfileBookshelves → here.
 */
create or replace function public.profile_bookshelves(wanted_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  writer public.profiles;
begin
  -- Step 1: the live profile behind the username, shown to this caller.
  select * into writer from public.profile_for_handle(wanted_handle);
  if not found or not public.profile_is_shown_to_caller(writer) then
    return null;
  end if;
  -- Step 2: the public bookshelves the caller may see.
  return (
    select coalesce(jsonb_agg(public.reading_list_json(reading_lists)
      order by reading_lists.updated_at desc, reading_lists.id), '[]'::jsonb)
    from public.reading_lists
    where reading_lists.user_id = writer.id and reading_lists.is_public
      and public.reading_list_is_visible(reading_lists));
end;
$$;
comment on function public.profile_bookshelves(text) is
  'A person''s public bookshelves for their profile, in the my_reading_lists() shape (board C06).';
revoke execute on function public.profile_bookshelves(text) from public;
grant execute on function public.profile_bookshelves(text) to anon, authenticated;

-- The profile's side box under the safety card (board C04). Position 2 keeps the page within
-- two slots (docs/decisions.md, S1-E12-01).
insert into public.ad_slots (slot_key, page_key, position, format)
values ('profile_side', 'profile', 2, 'side_box')
on conflict (slot_key) do nothing;
