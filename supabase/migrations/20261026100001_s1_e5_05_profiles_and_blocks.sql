/*
 * Migration: the writer profile page and blocks (story S1-E5-05; board 6.1, Profile.dc.html).
 *
 * What it adds:
 * - profiles.bio: up to 300 characters of plain text the person writes about themselves (the
 *   story's proposal, kept as written: decided by the builder, 24 Oct 2026, rule 8), and
 *   profiles.shows_online_status, the opt-in for online status: off for everyone, nothing shows
 *   online status in March, and the privacy settings that switch it come with S1-E13-01 (Q50).
 * - set_my_bio(new_bio): saves the signed-in person's bio (the account gate applies).
 * - blocks: who blocks whom (B21, architecture 1.7.3). Read only by the person who blocked;
 *   written only through set_block(handle, should_block).
 * - is_blocked_with(other_user_id): the real check, replacing Lane A's stub (S1-E4-01a). Every
 *   reader path already asks it (get_chapter(), record_chapter_read(), the link preview), and
 *   get_story_page() asks it from now on too.
 * - get_writer_profile(handle): the public profile, the one way a reader reaches it (ADR 0004).
 *   It never answers the user ID, the year of birth, the age check, the email or online status.
 * - my_blocked_accounts(): the accounts the caller blocks, for Settings' "Blocked accounts" list.
 * Rules: CLAUDE.md rule 6 (blocks respected everywhere), rule 15 (no user ID in public),
 * architecture 1.6 (actions on a person take a handle), Q50 (no profile banners).
 * Who calls it: src/features/profiles/api, src/features/account (the bio and the list).
 * Tests: supabase/tests/database/143-writer-profile-and-blocks.test.sql.
 */

/* ---------- Profile columns ---------- */

alter table public.profiles
  add column bio text not null default '',
  add column shows_online_status boolean not null default false,
  -- Story S1-E5-05: "a bio of up to 300 characters (proposal)".
  add constraint profiles_bio_length check (char_length(bio) <= 300);

comment on column public.profiles.bio is
  'What the person writes about themselves, plain text, at most 300 characters; public on the profile (S1-E5-05).';
comment on column public.profiles.shows_online_status is
  'The opt-in to show online status; off by default and for minors (Q50). Nothing shows it yet (S1-E13-01).';

/**
 * set_my_bio: saves the signed-in person's bio.
 * Input: new_bio, plain text. It is trimmed, ş/ţ become ș/ț (rule 4) and an empty bio is fine.
 * Returns: the bio as saved.
 * Errors: insufficient_privilege when the account may not write (the account gate,
 *   is_active_member()); check_violation when it is longer than 300 characters.
 * Where it fits: Settings › Account, the bio field (src/features/account).
 */
create or replace function public.set_my_bio(new_bio text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_bio text := btrim(public.normalise_romanian_letters(new_bio));
begin
  -- Step 1: only an account that may write (architecture 1.7.8).
  if not public.is_active_member() then
    raise exception 'Your account can''t change its profile right now.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the length rule, with a plain message (the table's check would say the same).
  if char_length(cleaned_bio) > 300 then
    raise exception 'A bio is at most 300 characters.' using errcode = 'check_violation';
  end if;
  -- Step 3: save it.
  update public.profiles set bio = cleaned_bio where profiles.id = (select auth.uid());
  return cleaned_bio;
end;
$$;
comment on function public.set_my_bio(text) is
  'Saves the signed-in person''s bio, at most 300 characters (S1-E5-05).';
revoke execute on function public.set_my_bio(text) from public, anon;
grant execute on function public.set_my_bio(text) to authenticated;

/* ---------- Blocks ---------- */

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  -- The person who blocks (CLAUDE.md rule 15: the owner column is user_id).
  user_id uuid not null references public.profiles (id),
  -- The person they block.
  blocked_user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocks_one_per_pair unique (user_id, blocked_user_id),
  constraint blocks_not_yourself check (user_id <> blocked_user_id)
);

comment on table public.blocks is
  'kind: user_action
Who blocks whom (S1-E5-05, B21). A block hides each side from the other everywhere; the blocked person is never told.';

-- The reverse lookup ("does anyone block me?") is as common as the forward one.
create index blocks_blocked_user_id on public.blocks (blocked_user_id);

create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

alter table public.blocks enable row level security;

-- Who: the person who blocked. Why: Settings lists their own blocks; nobody else may learn who
-- blocks them (the blocked person is never told, board 6.1: "the other person isn't told").
-- Writes go only through set_block(), so there are no insert, update or delete policies.
create policy blocks_select_own on public.blocks
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.blocks to authenticated;

/**
 * is_blocked_with: does the caller block this person, or does this person block the caller?
 * Input: other_user_id. Returns: true when a block exists in either direction; false for a
 *   signed-out visitor (nobody to block) and for oneself.
 * Replaces Lane A's stub (S1-E4-01a) with the same signature, so every reader path that already
 * asks it starts respecting blocks now (decided 23 Oct 2026, Q8; CLAUDE.md rule 6).
 */
create or replace function public.is_blocked_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocks.user_id = (select auth.uid()) and blocks.blocked_user_id = other_user_id)
       or (blocks.user_id = other_user_id and blocks.blocked_user_id = (select auth.uid()))
  );
$$;
comment on function public.is_blocked_with(uuid) is
  'True when the caller and this person block each other in either direction (S1-E5-05).';
revoke execute on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

/**
 * profile_for_handle: the live profile behind a username, or nothing.
 * Input: wanted_handle, with or without the "@"; look-alike letters match (username_skeleton(),
 *   S1-E2-04). Internal: set_block(), get_writer_profile() and the follow functions.
 */
create or replace function public.profile_for_handle(wanted_handle text)
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles
  where profiles.handle_skeleton = public.username_skeleton(btrim(coalesce(wanted_handle, ''), ' @'))
    and profiles.handle is not null
    and profiles.deleted_at is null;
$$;
comment on function public.profile_for_handle(text) is
  'Internal: the live profile behind a username (S1-E5-05).';
revoke execute on function public.profile_for_handle(text) from public, anon, authenticated;

/**
 * set_block: blocks or unblocks a person by their username.
 * Inputs: target_handle; should_block (true to block, false to unblock).
 * Returns: JSON {"blocked": true|false}, the state afterwards.
 * Rules: any signed-in account may block, even a read-only one (blocking is a safety tool, like
 *   reporting, S1-E10-01). Blocking is instant and the other person isn't told (board 6.1).
 *   Blocking also ends any follow between the two, both ways (S1-E6-05 adds the follow tables;
 *   the step is in that migration's copy of this function).
 * Errors: insufficient_privilege when signed out; no_data_found for an unknown username;
 *   check_violation for one's own username.
 * Where it fits: the profile's "Block" button and Settings' "Blocked accounts" list.
 */
create or replace function public.set_block(target_handle text, should_block boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.profiles;
begin
  -- Step 1: signed in.
  if caller_id is null then
    raise exception 'Log in to block someone.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the person, never oneself.
  select * into target from public.profile_for_handle(target_handle);
  if not found then
    raise exception 'There is no account with that username.' using errcode = 'no_data_found';
  end if;
  if target.id = caller_id then
    raise exception 'You can''t block yourself.' using errcode = 'check_violation';
  end if;
  -- Step 3: add or remove the block; doing it twice changes nothing.
  if should_block then
    insert into public.blocks (user_id, blocked_user_id) values (caller_id, target.id)
    on conflict on constraint blocks_one_per_pair do nothing;
  else
    delete from public.blocks where blocks.user_id = caller_id and blocks.blocked_user_id = target.id;
  end if;
  return jsonb_build_object('blocked', should_block);
end;
$$;
comment on function public.set_block(text, boolean) is
  'Blocks or unblocks a person by username; the other person isn''t told (S1-E5-05).';
revoke execute on function public.set_block(text, boolean) from public, anon;
grant execute on function public.set_block(text, boolean) to authenticated;

/**
 * my_blocked_accounts: the accounts the signed-in person blocks, newest first.
 * Returns: rows of handle, display_name and blocked_at; never a user ID.
 * Where it fits: Settings › Account, "Blocked accounts", with an Unblock button on each row.
 */
create or replace function public.my_blocked_accounts()
returns table (handle text, display_name text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select profiles.handle, public.display_name(profiles.handle, profiles.pen_name), blocks.created_at
  from public.blocks
  join public.profiles on profiles.id = blocks.blocked_user_id
  where blocks.user_id = (select auth.uid())
    and profiles.deleted_at is null
  order by blocks.created_at desc;
$$;
comment on function public.my_blocked_accounts() is
  'The accounts the caller blocks, for Settings (S1-E5-05).';
revoke execute on function public.my_blocked_accounts() from public, anon;
grant execute on function public.my_blocked_accounts() to authenticated;

/* ---------- The public profile ---------- */

/**
 * profile_story_cards: the stories a reader may see on a writer's profile, newest update first.
 * Inputs: writer_id; is_owner (the writer looking at their own profile sees every published
 *   story, whatever its rating).
 * Returns: a JSON array; each item: id (the story's, never the writer's; it draws the automatic
 *   cover), slug, title, blurb, category_slug, completion_status, rating, cover, chapter_count
 *   (readable chapters) and last_chapter_published_at.
 * Rules: published (a readable chapter), not deleted, not hidden by a moderator, and the reader's
 *   age allows the rating (rule 18). Blocks are checked by the caller, once for the whole profile.
 * Internal: get_writer_profile().
 */
create or replace function public.profile_story_cards(writer_id uuid, is_owner boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', stories.id,
      'slug', stories.slug,
      'title', stories.title,
      'blurb', stories.blurb,
      'category_slug', categories.slug,
      'completion_status', stories.completion_status,
      'rating', stories.rating,
      'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
        'background', stories.cover_background, 'accent', stories.cover_accent),
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.user_id = writer_id
    and stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    and (is_owner or public.rating_allows(stories.rating));
$$;
comment on function public.profile_story_cards(uuid, boolean) is
  'Internal: the stories a reader may see on a profile (S1-E5-05).';
revoke execute on function public.profile_story_cards(uuid, boolean) from public, anon, authenticated;

/**
 * get_writer_profile: a writer's public profile, screen 6.1.
 * Input: wanted_handle, with or without the "@".
 * Returns: JSON with handle, display_name, pen_name (null when none), bio, joined_at (the month
 *   is what the screen shows), is_me, i_blocked (the caller blocks this person: the page offers
 *   Unblock and shows no stories), counts {stories, chapters, reads} and stories (see
 *   profile_story_cards()). Reads are the lifetime total of every readable chapter's daily totals
 *   (never who read, architecture 1.7.9).
 *   Never: the user ID, the year of birth, the age check, the email or online status (story
 *   S1-E5-05's second criterion; rule 15).
 *   Null when there is no such live username, a moderator hid or removed the profile, or this
 *   person blocks the caller (the blocked person can't tell a block from a missing profile).
 * Errors: none.
 * Where it fits: the profile page's only call (src/features/profiles/api/writerProfile.ts).
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
  -- Step 5: the answer, from the public columns only.
  return jsonb_build_object(
    'handle', writer.handle,
    'display_name', public.display_name(writer.handle, writer.pen_name),
    'pen_name', nullif(btrim(coalesce(writer.pen_name, '')), ''),
    'bio', writer.bio,
    'joined_at', writer.created_at,
    'is_me', is_me,
    'i_blocked', i_blocked,
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
comment on function public.get_writer_profile(text) is
  'A writer''s public profile by username; never the user ID, age, email or online status (S1-E5-05).';
grant execute on function public.get_writer_profile(text) to anon, authenticated;

/* ---------- The story page respects blocks ---------- */

/**
 * get_story_page: as in S1-E3-03, with one change from S1-E5-05: a reader and a writer who block
 * each other (either way) can't see each other's story pages (rule 6). The owner always sees
 * their own. Everything else is unchanged; see …_s1_e3_03_publish.sql for the full description.
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

  -- Step 3: the page, with the writer's pen name or username and never the user ID.
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
      where story_tags.story_id = story.id), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object('display_name', public.display_name(profiles.handle, profiles.pen_name),
      'handle', profiles.handle, 'bio', profiles.bio) from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner
  );
end;
$$;
