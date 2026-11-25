/*
 * Migration: "To follow this week" in the Read page's Writers box, picked by staff, with an
 * automatic list when staff pick nobody (user story 1.4, board A04; Robert, 25 Nov 2026: build
 * every widget the boards draw and make it editable from the admin site).
 *
 * The board splits the Writers box into "To follow this week" and "New and rising". New and rising
 * already exists (rising_writers(), S1-E5-11). This adds the first list:
 *
 *   writer_follow_picks            the writers staff put in "To follow this week", in order (1 to 3)
 *   suggested_writer_card()        one writer's card, the same shape rising_writers() returns
 *   admin_writer_follow_picks()    Stories › Featured: the current picks with whether each may show
 *   admin_set_writer_follow_picks() replaces the picks by username, logged with before and after
 *   writers_to_follow_now()        the list for whoever is reading: the picks, or, with no pick that
 *                                  may show, the writers who gained the most followers in 7 days
 *   data_export_held_tables()      gains writer_follow_picks (its user_id is the staff member)
 *
 * Who calls it: Stories › Featured (src/features/staff/components/featured/WriterFollowSection.tsx)
 * and the Read page's Writers box (src/features/discovery/components/ReadWritersBox.tsx), through
 * src/features/staff/api/writerFollowPicks.ts and src/features/discovery/api/writersToFollow.ts.
 *
 * Rules it follows:
 *   - CLAUDE.md rule 1: RLS on, a select policy for staff with the Featured area; writes only
 *     through admin_set_writer_follow_picks(), so no write privilege is granted.
 *   - Rule 15: user_id is the staff member who picked; the writer is writer_user_id.
 *   - Rule 6 and S1-E5-11: a list never shows a writer across a block, the reader themself, or a
 *     writer may_spotlight_writer() refuses (suspended, switch off, under 16 without the parent's
 *     separate yes). Checked when staff pick and again on every read, so a later suspension takes
 *     the writer out at once.
 *   - Architecture 1.8.1: the staff write checks the area and the staff session and logs in the
 *     same transaction.
 *   - Never a user ID in what readers get: cards carry the handle and pen name.
 */

/* ---------- 1. The picks ---------- */

create table public.writer_follow_picks (
  id uuid primary key default gen_random_uuid(),
  -- The writer staff picked.
  writer_user_id uuid not null references public.profiles (id) on delete cascade,
  -- The place in the list, 1 first.
  position integer not null,
  -- The staff member who picked the writer.
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set when a later save took the writer out; the row stays as a record.
  removed_at timestamptz,
  constraint writer_follow_picks_position_range check (position between 1 and 3)
);

comment on table public.writer_follow_picks is
  'kind: staff
The writers staff put in "To follow this week" on the Read page, in order. A save replaces the list: old rows get removed_at, new rows are added (user story 1.4, board A04).';
comment on column public.writer_follow_picks.user_id is 'The staff member who picked the writer.';
comment on column public.writer_follow_picks.writer_user_id is 'The writer shown in the list.';

-- One writer per place and each writer once, among the current picks.
create unique index writer_follow_picks_current_position_idx on public.writer_follow_picks (position)
  where removed_at is null;
create unique index writer_follow_picks_current_writer_idx on public.writer_follow_picks (writer_user_id)
  where removed_at is null;
create index writer_follow_picks_user_idx on public.writer_follow_picks (user_id);

alter table public.writer_follow_picks enable row level security;

/**
 * Policy writer_follow_picks_select_featured_staff: admins and the owner, in a staff session, read
 * the picks and their history. Readers get the list only through writers_to_follow_now(), which
 * never returns who picked or any user ID.
 */
create policy writer_follow_picks_select_featured_staff
  on public.writer_follow_picks
  for select
  to authenticated
  using ((select public.staff_may('featured', 'view')));
comment on policy writer_follow_picks_select_featured_staff on public.writer_follow_picks is
  'Allows staff with the Featured area (owner, admin) to read the writer picks (user story 1.4).';

revoke all on public.writer_follow_picks from anon, authenticated;
grant select on public.writer_follow_picks to authenticated;  -- writer_follow_picks_select_featured_staff

/* ---------- 2. One writer's card ---------- */

/**
 * suggested_writer_card: one writer's card for a list of suggested writers, in the shape
 * rising_writers() returns, for whoever is reading.
 * Inputs: person_id, the writer; followers_gained, how many people followed them in 7 days.
 * Returns: jsonb with handle, display_name (pen name, else the handle), category_slug (their most
 *   used category among stories anyone may find), latest_story (the newest such story this reader
 *   may read, as story_card_json(), or null), followers_this_week (only when 5 or more, the writer
 *   stats' "fewer than 5" rule; else null) and is_following. Null when the person has no handle.
 * Errors: none. It doesn't check may_spotlight_writer() or blocks: the caller does, once per list.
 * Where it fits: writers_to_follow_now() below.
 */
create or replace function public.suggested_writer_card(person_id uuid, followers_gained bigint)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with open_stories as (
    -- The writer's stories anyone may find, the same test rising_writers() uses.
    select stories.* from public.stories
    where stories.user_id = person_id
      and stories.deleted_at is null and stories.visibility = 'public' and not stories.class_only
      and public.story_has_readable_chapter(stories.id)
      and not public.is_moderated_away('story', stories.id)
      and not exists (select 1 from public.story_restrictions
                      where story_restrictions.story_id = stories.id and story_restrictions.lifted_at is null)
  )
  select jsonb_build_object(
      'handle', profiles.handle,
      'display_name', coalesce(nullif(profiles.pen_name, ''), profiles.handle),
      'category_slug', (select categories.slug from open_stories
                        join public.categories on categories.id = open_stories.category_id
                        group by categories.slug order by count(*) desc, categories.slug limit 1),
      'latest_story', (select public.story_card_json(open_stories.id) from open_stories
                       where public.rating_allows(open_stories.rating)
                       order by open_stories.last_chapter_published_at desc nulls last limit 1),
      'followers_this_week', case when followers_gained >= 5 then followers_gained end,
      'is_following', exists (select 1 from public.follows_users
                              where follows_users.user_id = (select auth.uid())
                                and follows_users.followed_user_id = person_id))
  from public.profiles
  where profiles.id = person_id and profiles.deleted_at is null and profiles.handle is not null;
$$;

comment on function public.suggested_writer_card(uuid, bigint) is
  'Internal: one suggested writer''s card for this reader, the rising_writers() shape; never a user ID (user story 1.4).';
revoke execute on function public.suggested_writer_card(uuid, bigint) from public, anon, authenticated;

/* ---------- 3. Staff: read and save the picks ---------- */

/**
 * admin_writer_follow_picks: the current picks for Stories › Featured.
 * Inputs: none. Returns: a jsonb array in order of { handle, display_name, may_show }, where
 *   may_show is false when may_spotlight_writer() refuses the writer today (they are then left
 *   out of the list readers see).
 * Errors: insufficient_privilege (42501) without the Featured area.
 * Where it fits: WriterFollowSection → api/writerFollowPicks.ts → here.
 */
create or replace function public.admin_writer_follow_picks()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: admins and the owner, in a staff session.
  if not public.staff_may('featured', 'view') then
    raise exception 'Only admins can see the writers to follow.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the current picks, in order, with whether each may show today.
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'handle', profiles.handle,
        'display_name', coalesce(nullif(profiles.pen_name, ''), profiles.handle),
        'may_show', public.may_spotlight_writer(profiles.id))
      order by writer_follow_picks.position), '[]'::jsonb)
    from public.writer_follow_picks
    join public.profiles on profiles.id = writer_follow_picks.writer_user_id
    where writer_follow_picks.removed_at is null
  );
end;
$$;

comment on function public.admin_writer_follow_picks() is
  'Admins and the owner: the current "To follow this week" picks with whether each may show (user story 1.4).';
revoke execute on function public.admin_writer_follow_picks() from public, anon;
grant execute on function public.admin_writer_follow_picks() to authenticated;

/**
 * admin_set_writer_follow_picks: replaces "To follow this week" with these writers, in order.
 * Inputs: handles, the writers' usernames in order (0 to 3; an empty list clears the picks, and the
 *   automatic list shows); reason, why (required).
 * Returns: nothing.
 * Errors: insufficient_privilege (42501) without the Featured area to act; check_violation (23514)
 *   with hint reason_missing, too_many, duplicate, unknown_writer or may_not_show.
 * Logged as featured.writers_set with the before and after lists of handles.
 * Where it fits: the Save button in WriterFollowSection → api/writerFollowPicks.ts → here.
 */
create or replace function public.admin_set_writer_follow_picks(handles text[], reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted text[] := coalesce(handles, '{}');
  writer_ids uuid[];
  before_list text[];
  missing text;
  refused text;
  pick_position integer;
begin
  -- Step 1: admins and the owner only, in a staff session, with a reason.
  if not public.staff_may('featured', 'act') then
    raise exception 'Only admins can change the writers to follow.' using errcode = 'insufficient_privilege';
  end if;
  if reason is null or btrim(reason) = '' then
    raise exception 'Say why you are changing the writers to follow.'
      using errcode = 'check_violation', hint = 'reason_missing';
  end if;
  -- Step 2: at most three, the number the board draws in the box.
  if cardinality(wanted) > 3 then
    raise exception 'To follow this week holds at most 3 writers.' using errcode = 'check_violation', hint = 'too_many';
  end if;
  -- Step 3: every username must be a live account; "@" and look-alike letters are fine, as on
  -- every other username search (profile_for_handle(), S1-E5-05).
  select handle into missing from unnest(wanted) as handle
  where not exists (select 1 from public.profile_for_handle(handle))
  limit 1;
  if missing is not null then
    raise exception 'There is no writer called @%.', btrim(missing, ' @')
      using errcode = 'check_violation', hint = 'unknown_writer';
  end if;
  select coalesce(array_agg(found.id order by wanted_handles.ordinality), '{}') into writer_ids
  from unnest(wanted) with ordinality as wanted_handles (handle, ordinality)
  cross join lateral public.profile_for_handle(wanted_handles.handle) as found;
  -- Nobody twice, however the username was typed.
  if cardinality(writer_ids) <> (select count(distinct writer_id) from unnest(writer_ids) as writer_id) then
    raise exception 'A writer is in the list twice.' using errcode = 'check_violation', hint = 'duplicate';
  end if;
  -- Step 4: every writer must be one we may suggest to strangers (S1-E5-11: active, their switch
  -- on, 16 or over or the parent's separate yes).
  select profiles.handle into refused from unnest(writer_ids) as writer_id
  join public.profiles on profiles.id = writer_id
  where not public.may_spotlight_writer(writer_id)
  limit 1;
  if refused is not null then
    raise exception '@% can''t be suggested: the account isn''t active, the writer turned suggestions off, or they are under 16.',
      refused using errcode = 'check_violation', hint = 'may_not_show';
  end if;
  -- Step 5: take the old list out (kept as a record) and put the new one in, in order.
  select coalesce(array_agg(profiles.handle order by writer_follow_picks.position), '{}') into before_list
  from public.writer_follow_picks
  join public.profiles on profiles.id = writer_follow_picks.writer_user_id
  where writer_follow_picks.removed_at is null;
  update public.writer_follow_picks set removed_at = now(), updated_at = now() where removed_at is null;
  for pick_position in 1 .. cardinality(writer_ids) loop
    insert into public.writer_follow_picks (writer_user_id, position, user_id)
    values (writer_ids[pick_position], pick_position, (select auth.uid()));
  end loop;
  -- Step 6: the audit row with both lists, in the same transaction.
  perform public.log_staff_action('featured.writers_set', 'writer_follow_picks', null, null, reason,
    jsonb_build_object('handles', to_jsonb(before_list)),
    jsonb_build_object('handles', to_jsonb((select coalesce(array_agg(profiles.handle order by ids.ordinality), '{}')
                                            from unnest(writer_ids) with ordinality as ids (id, ordinality)
                                            join public.profiles on profiles.id = ids.id))));
end;
$$;

comment on function public.admin_set_writer_follow_picks(text[], text) is
  'Admins and the owner: replace "To follow this week" by username, logged with before and after (user story 1.4).';
revoke execute on function public.admin_set_writer_follow_picks(text[], text) from public, anon;
grant execute on function public.admin_set_writer_follow_picks(text[], text) to authenticated;

/* ---------- 4. The list readers see ---------- */

/**
 * writers_to_follow_now: "To follow this week" for whoever is reading.
 * Inputs: none.
 * Returns: { source, writers }: source is 'picked' when staff picked at least one writer who may
 *   show to this reader, else 'automatic'; writers is a jsonb array of at most 3 cards
 *   (suggested_writer_card()). The automatic list is the writers with a story anyone may find who
 *   gained the most followers in the last 7 days (at least one), then by username.
 *   Both leave out the reader themself, anyone blocked either way and anyone may_spotlight_writer()
 *   refuses. An empty array hides the list. Never a user ID. Open to visitors and members.
 * Where it fits: ReadWritersBox → hooks/useWritersToFollow.ts → api/writersToFollow.ts → here.
 */
create or replace function public.writers_to_follow_now()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  reader_id uuid := (select auth.uid());
  picked jsonb;
begin
  -- Step 1: the staff picks this reader may see, in staff order.
  select coalesce(jsonb_agg(card order by position), '[]'::jsonb) into picked
  from (
    select writer_follow_picks.position,
      public.suggested_writer_card(writer_follow_picks.writer_user_id,
        (select count(*) from public.follows_users
         where follows_users.followed_user_id = writer_follow_picks.writer_user_id
           and follows_users.created_at > now() - interval '7 days')) as card
    from public.writer_follow_picks
    where writer_follow_picks.removed_at is null
      and writer_follow_picks.writer_user_id is distinct from reader_id
      and not public.is_blocked_with(writer_follow_picks.writer_user_id)
      and public.may_spotlight_writer(writer_follow_picks.writer_user_id)
  ) as picks
  where card is not null;
  if jsonb_array_length(picked) > 0 then
    return jsonb_build_object('source', 'picked', 'writers', picked);
  end if;
  -- Step 2: no pick may show, so the writers who gained the most followers this week.
  return jsonb_build_object('source', 'automatic', 'writers', (
    select coalesce(jsonb_agg(public.suggested_writer_card(gainers.followed_user_id, gainers.gained)
                              order by gainers.gained desc, gainers.handle), '[]'::jsonb)
    from (
      select follows_users.followed_user_id, count(*) as gained, profiles.handle
      from public.follows_users
      join public.profiles on profiles.id = follows_users.followed_user_id
        and profiles.deleted_at is null and profiles.handle is not null
      where follows_users.created_at > now() - interval '7 days'
        and follows_users.followed_user_id is distinct from reader_id
        and not public.is_blocked_with(follows_users.followed_user_id)
        and public.may_spotlight_writer(follows_users.followed_user_id)
        -- A writer, not only a reader: at least one story anyone may find.
        and exists (select 1 from public.stories
                    where stories.user_id = follows_users.followed_user_id
                      and stories.deleted_at is null and stories.visibility = 'public' and not stories.class_only
                      and public.story_has_readable_chapter(stories.id)
                      and not public.is_moderated_away('story', stories.id))
      group by follows_users.followed_user_id, profiles.handle
      order by gained desc, profiles.handle
      limit 3
    ) as gainers
  ));
end;
$$;

comment on function public.writers_to_follow_now() is
  '"To follow this week" for this reader: staff picks, else the week''s biggest follower gains; never a user ID (user story 1.4).';
revoke execute on function public.writers_to_follow_now() from public;
grant execute on function public.writers_to_follow_now() to anon, authenticated;

/* ---------- 5. Download my data: what we hold ---------- */

create or replace function public.data_export_held_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('abuse_image_evidence', false, 'evidence kept for the police about a suspected child abuse image; handing it out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('account_staff_notes', false, 'staff notes can name other people (a reporter, a linked account) or a safeguarding concern, so they are not in the automatic file; when the person asks for their data, staff copy the notes in by hand after taking out other people''s details (GDPR art. 15(4) and art. 23; lawyer to check)'),
    ('audit_log', false, 'the record of what staff did; the changes it records about the person are in the groups below'),
    ('brand_assets', false, 'user_id is the staff member who chose a logo, not data about their account'),
    ('case_account_links', false, 'a moderator''s note that two accounts may be one person, kept to spot banned accounts coming back; telling the person would defeat it (GDPR art. 23; lawyer to check)'),
    ('case_actions', false, 'user_id is the staff member who decided; the decisions reach the person as statements of reasons, which are included'),
    ('cases', false, 'open moderation cases; decisions reach the person as statements of reasons, which are included, and an open case may be held back while it is looked into (GDPR art. 23; lawyer to check)'),
    ('compliance_log_entries', false, 'user_id is the staff member who logged an authority order, not data about their account'),
    ('copied_work_notes', true, null),
    ('data_requests', true, null),
    ('featured_picks', false, 'user_id is the staff member who picked a story for Featured this week, not data about their account; the writer is told by a notification, which is in their export'),
    ('interface_text_overrides', false, 'user_id is the admin who edited interface text, not data about their account'),
    ('list_page_backgrounds', false, 'user_id is the admin who chose a genre or tag page background, not data about their account'),
    ('moderated_items', true, null),
    ('on_call_rota', true, null),
    ('removed_passages', false, 'the exact words staff removed, which may be someone else''s personal data removed to protect them; the removal itself is in story_revisions'),
    ('safeguarding_referrals', false, 'referrals to the police or a prosecutor; handing them out could harm an investigation (GDPR art. 23; lawyer to check)'),
    ('sanctions', true, null),
    ('sign_up_ips', true, null),
    ('staff_custom_role_areas', false, 'user_id is the admin who set an area in a custom role, not data about their account'),
    ('staff_custom_role_holders', true, null),
    ('staff_custom_roles', false, 'user_id is the admin who made the custom role; the roles someone holds are in staff_custom_role_holders'),
    ('staff_interns', true, null),
    ('staff_permissions', true, null),
    ('staff_roles', true, null),
    ('story_restrictions', true, null),
    ('story_revisions', true, null),
    ('writer_follow_picks', false, 'user_id is the admin who put a writer in To follow this week, not data about their account; the writer''s place in the list is shown publicly on the Read page');
$$;

comment on function public.data_export_held_tables() is
  'Internal: every staff table with a user_id and whether Download my data''s "held_about_you" includes it, or why not (QA-7, LOGS-1a, LOOK-4a, S1-E11-33, user story 1.4; GDPR art. 15).';
revoke execute on function public.data_export_held_tables() from public, anon, authenticated;
