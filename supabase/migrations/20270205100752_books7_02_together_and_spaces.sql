/**
 * Migration: the widgets boards F01 to F12 draw that the forums and spaces didn't have yet
 * (bundle 7, "Together and spaces"; Robert's request of 25 Nov 2026: build every widget a board
 * draws, with its logic).
 *
 * 1. Sorting a forum's threads (F03, F08): Latest activity, Newest threads or Most replies, with
 *    the number of threads for "7 of 312 threads". forum_thread_list() takes the sort and a skip.
 * 2. Sorting the forum search (F02): Best match, Newest first or Most replies, with the number of
 *    results ("48 results for …") and each thread's replies. search_forum_posts() takes the sort.
 * 3. Sorting the spaces (F06): Latest activity, Most members or Newest, and the joined spaces apart
 *    from the others ("Joined", then "More spaces"). space_list() takes the sort and "joined".
 * 4. Filtering a space's moderation log by who acted (F12): space_log() takes "who" and lists
 *    the people who appear in the log for the drop-down.
 * 5. Moderator invitations (F07, F10, F11: "they must accept the invitation before the powers
 *    start"): the owner's choice of powers for a member waits on the member's row until the member
 *    accepts or declines on the space's page. space_members gets two columns; set_space_moderator()
 *    invites a member who isn't a moderator yet; answer_space_moderator_invite() is new.
 * 6. Blocking someone from a space (F11, More › Block: "they can't ask again or see members-only
 *    posts"): a new table, space_blocks, and block_space_member(), unblock_space_member() and
 *    space_blocked_members(). space_may_join() and join_space() refuse a blocked person.
 *
 * Who calls it: src/features/forums/api/forumThreads.ts and forumSearch.ts,
 * src/features/spaces/api/spaces.ts, spaceModeration.ts and spaceBlocks.ts.
 * Tests: supabase/tests/database/420-together-and-spaces.test.sql.
 */

/* ---------- 1. Sorting a forum's threads (F03, F08) ---------- */

/**
 * forum_thread_list: one page of a forum's threads, sticky first on the first page, then in the
 *   order the reader picked.
 * Inputs: forum_slug; older_than (latest activity only: the bumped_at of the last thread shown,
 *   kept for the older callers); sort ('latest', 'newest' or 'replies'; anything else reads as
 *   'latest'); skip (how many non-sticky threads are already shown).
 * Returns: {"threads": [...], "has_more": bool, "total": the threads the caller may open}, or
 *   null for an unknown forum. Never a user ID.
 * Where it fits: ThreadList on a forum's page and a space's page (user stories 7.3 and 7.8).
 */
drop function public.forum_thread_list(text, timestamptz);
create function public.forum_thread_list(
  forum_slug text,
  older_than timestamptz default null,
  sort text default 'latest',
  skip integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  forum public.forums;
  page_size integer := coalesce((public.setting_value('forum_threads_page_size'))::integer, 25);
  wanted_sort text := case when sort in ('newest', 'replies') then sort else 'latest' end;
  first_page boolean := older_than is null and coalesce(skip, 0) <= 0;
  pinned jsonb := '[]'::jsonb;
  page jsonb;
  page_count integer;
  total integer;
begin
  -- Step 1: the forum, if it is live.
  select * into forum from public.forums where forums.slug = forum_thread_list.forum_slug and forums.deleted_at is null;
  if forum.id is null then
    return null;
  end if;
  -- Step 2: on the first page only, every sticky thread the caller may open, latest first.
  if first_page then
    select coalesce(jsonb_agg(public.forum_thread_summary_json(forum_threads) order by forum_threads.bumped_at desc), '[]'::jsonb)
    into pinned
    from public.forum_threads
    where forum_threads.forum_id = forum.id and forum_threads.is_sticky
      and public.forum_thread_is_shown(forum_threads);
  end if;
  -- Step 3: one page of the other threads in the order picked (one extra, to know whether there
  -- is more). Latest activity follows the bump time, so "Don't bump" keeps a thread in place.
  select coalesce(jsonb_agg(public.forum_thread_summary_json(listed.row_data)
                            order by listed.sort_key desc, listed.bumped_at desc, listed.thread_number desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from (
    select forum_threads as row_data,
           forum_threads.bumped_at,
           forum_threads.thread_number,
           case wanted_sort when 'newest' then extract(epoch from forum_threads.created_at)
                            when 'replies' then forum_threads.last_post_number::numeric
                            else extract(epoch from forum_threads.bumped_at) end as sort_key
    from public.forum_threads
    where forum_threads.forum_id = forum.id
      and not forum_threads.is_sticky
      and (older_than is null or forum_threads.bumped_at < older_than)
      and public.forum_thread_is_shown(forum_threads)
    order by sort_key desc, forum_threads.bumped_at desc, forum_threads.thread_number desc
    offset greatest(coalesce(skip, 0), 0)
    limit page_size + 1
  ) as listed;
  -- Step 4: how many threads the caller may open here, sticky ones included (F03's "7 of 312").
  select count(*)::integer into total
  from public.forum_threads
  where forum_threads.forum_id = forum.id and public.forum_thread_is_shown(forum_threads);
  -- Step 5: the answer; the extra thread only says there is more.
  if page_count > page_size then
    page := page - page_size;
  end if;
  return jsonb_build_object('threads', pinned || page, 'has_more', page_count > page_size, 'total', total);
end;
$$;
comment on function public.forum_thread_list(text, timestamptz, text, integer) is
  'One page of a forum''s threads, sticky first, then by latest activity, newest or most replies, with the total; never a user ID (S1-E8-02, S1-E8-05, BOOKS-7).';
grant execute on function public.forum_thread_list(text, timestamptz, text, integer) to anon, authenticated;

/* ---------- 2. Sorting the forum search (F02) ---------- */

/**
 * search_forum_posts: as in FORUMS-1f, with the order the reader picked, the number of results
 *   and each result's replies.
 * Inputs: as before, plus sort: 'best' (thread titles first, then the closest match, the default),
 *   'newest' or 'replies' (the thread with the most replies first).
 * Returns: {"results": [... each with "reply_count"], "has_more": bool, "total": int}.
 * Where it fits: ForumSearchPage (user story 7.2).
 */
drop function public.search_forum_posts(text, text, text, integer, text);
create function public.search_forum_posts(
  term text,
  forum_slug text default null,
  author_handle text default null,
  skip integer default 0,
  language_code text default 'ro',
  sort text default 'best'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page_size constant integer := 20;
  query tsquery := public.search_query(term);
  pattern text := public.search_like_pattern(term);
  wanted_handle text := lower(ltrim(btrim(coalesce(author_handle, '')), '@'));
  wanted_sort text := case when sort in ('newest', 'replies') then sort else 'best' end;
  scope_id uuid;
  found jsonb;
  found_count integer;
  total integer;
begin
  -- Step 1: a term of under 2 characters finds nothing (a single letter matches everything).
  if char_length(public.search_fold(coalesce(term, ''))) < 2 then
    return jsonb_build_object('results', '[]'::jsonb, 'has_more', false, 'total', 0);
  end if;
  -- Step 2: the forum to search in, if one was picked; an unknown one finds nothing.
  if forum_slug is not null then
    select forums.id into scope_id from public.forums
    where forums.slug = search_forum_posts.forum_slug and forums.deleted_at is null;
    if scope_id is null then
      return jsonb_build_object('results', '[]'::jsonb, 'has_more', false, 'total', 0);
    end if;
  end if;
  -- Step 3: every live post the caller may read that matches, in its thread and forum. Class
  -- spaces and spaces the caller can't read fall out in forum_thread_is_shown(), and posts by
  -- blocked members in forum_post_state_for_caller() (user story 7.2).
  with candidates as (
    select forum_posts.id as post_id, forum_posts.post_number, forum_posts.user_id, forum_posts.created_at,
           forum_posts.body, forum_threads.id as thread_id, forum_threads.thread_number, forum_threads.title,
           forums.id as forum_id, forums.slug, public.forum_post_search_text(forum_posts, forum_threads.title) as text
    from public.forum_posts
    join public.forum_threads on forum_threads.id = forum_posts.thread_id
    join public.forums on forums.id = forum_threads.forum_id and forums.deleted_at is null
    where (scope_id is null or forums.id in (select public.forum_and_children(scope_id)))
      and (wanted_handle = '' or forum_posts.user_id in
            (select profiles.id from public.profiles where lower(profiles.handle) = wanted_handle))
      and public.forum_thread_is_shown(forum_threads)
      and public.forum_post_state_for_caller(forum_posts) = 'live'
  ), matched as (
    select candidates.*,
           candidates.post_number = 1 and public.search_fold(candidates.title) like pattern as title_matches,
           ts_rank(to_tsvector('pg_catalog.romanian', candidates.text) || to_tsvector('pg_catalog.english', candidates.text), query) as closeness,
           greatest(public.forum_live_post_count(candidates.thread_id) - 1, 0) as reply_count
    from candidates
    where (to_tsvector('pg_catalog.romanian', candidates.text) || to_tsvector('pg_catalog.english', candidates.text)) @@ query
       or candidates.text like pattern
  ), ordered as (
    -- The picked order becomes one row number, so the page and the list below agree.
    select matched.*,
           row_number() over (order by
             case when wanted_sort = 'best' then matched.title_matches end desc nulls last,
             case when wanted_sort = 'best' then matched.closeness end desc nulls last,
             case when wanted_sort = 'replies' then matched.reply_count end desc nulls last,
             matched.created_at desc, matched.post_id) as place,
           count(*) over () as matched_count
    from matched
  ), page as (
    select * from ordered
    where ordered.place > greatest(coalesce(skip, 0), 0)
    order by ordered.place
    limit page_size + 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', case when page.title_matches then 'thread' else 'post' end,
           'thread_number', page.thread_number,
           'thread_title', page.title,
           'forum_slug', page.slug,
           'forum_name', (select names.name from public.forum_name_in(page.forum_id, search_forum_posts.language_code) as names),
           'post_number', page.post_number,
           'author', public.forum_person_json(page.user_id),
           'created_at', page.created_at,
           'reply_count', page.reply_count,
           'snippet', public.forum_search_snippet(page.body))
         order by page.place), '[]'::jsonb),
         count(*)::integer,
         coalesce(max(page.matched_count), 0)::integer
  into found, found_count, total
  from page;
  -- Step 4: past the last page there is no row to carry the total, so count again.
  if found_count = 0 and coalesce(skip, 0) > 0 then
    total := null;
  end if;
  -- Step 5: the answer; the extra result only says there is more.
  if found_count > page_size then
    found := found - page_size;
  end if;
  return jsonb_build_object('results', found, 'has_more', found_count > page_size, 'total', total);
end;
$$;
comment on function public.search_forum_posts(text, text, text, integer, text, text) is
  'Searches the threads and posts the caller may read, best match, newest or most replies first, with the total (S1-E8-10, BOOKS-7).';
grant execute on function public.search_forum_posts(text, text, text, integer, text, text) to anon, authenticated;

/* ---------- 3. Sorting the spaces (F06) ---------- */

/**
 * space_list: the spaces the caller may see, in the order picked, optionally only the ones the
 *   caller joined or only the others.
 * Inputs: skip, how_many (1 to 50); sort ('latest' activity, 'members' or 'newest'); joined (true:
 *   only spaces the caller is an active member of, class spaces included; false: only the others,
 *   never a class, as "More spaces" shows; null: every space, as before).
 * Returns: {"spaces": [...], "total": int, "has_more": bool}.
 * Where it fits: SpacesPage's "Joined" and "More spaces" and the Spaces card on Together.
 */
drop function public.space_list(integer, integer);
create function public.space_list(
  skip integer default 0,
  how_many integer default 20,
  sort text default 'latest',
  joined boolean default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  page_size integer := least(greatest(coalesce(how_many, 20), 1), 50);
  wanted_sort text := case when sort in ('members', 'newest') then sort else 'latest' end;
  found jsonb;
  total integer;
begin
  -- Step 1: every live space whose card the caller may see, split by "joined" when asked. Class
  -- spaces never show among the others (user story 7.6: only their pupils and teacher see them,
  -- under Joined).
  with seen as (
    select spaces as row_data,
           case wanted_sort
             when 'members' then (select count(*) from public.space_members
                                  where space_members.space_id = spaces.id and space_members.status = 'active')::numeric
             when 'newest' then extract(epoch from spaces.created_at)
             else extract(epoch from public.space_latest_activity(spaces)) end as sort_key
    from public.spaces
    where spaces.deleted_at is null and public.space_card_visible(spaces)
      and (joined is null
           or (joined and public.space_is_member(spaces.id))
           or (not joined and not public.space_is_member(spaces.id) and spaces.kind = 'open'))
  ), page as (
    select seen.* from seen order by seen.sort_key desc nulls last, (seen.row_data).name
    offset greatest(coalesce(skip, 0), 0) limit page_size
  )
  select coalesce((select jsonb_agg(public.space_json(page.row_data) order by page.sort_key desc nulls last, (page.row_data).name)
                   from page), '[]'::jsonb),
         (select count(*)::integer from seen)
  into found, total;
  -- Step 2: the answer.
  return jsonb_build_object('spaces', found, 'total', total,
    'has_more', greatest(coalesce(skip, 0), 0) + page_size < total);
end;
$$;
comment on function public.space_list(integer, integer, text, boolean) is
  'The spaces the caller may see, by latest activity, members or newest, joined or not (S1-E8-06, BOOKS-7).';
grant execute on function public.space_list(integer, integer, text, boolean) to anon, authenticated;

/* ---------- 4. Filtering a space's moderation log (F12) ---------- */

/**
 * space_log: a space's moderation log, newest first, 50 at a time, optionally only one person's
 *   actions or only our moderation team's.
 * Inputs: slug; skip; who (null for anyone, 'platform' for the moderation team, or a handle).
 * Returns: {"entries": [...], "has_more": bool, "people": [the people who acted in this space's
 *   log, for the Who drop-down], "platform_acted": bool}.
 * Errors: as before (no_data_found 'space:missing', insufficient_privilege 'space:not_owner').
 * Where it fits: SpaceLogPage (user story 7.12). Nothing here edits the log: it has no update or
 *   delete path at all.
 */
drop function public.space_log(text, integer);
create function public.space_log(slug text, skip integer default 0, who text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  space public.spaces;
  page_size constant integer := 50;
  wanted text := nullif(lower(ltrim(btrim(coalesce(who, '')), '@')), '');
  wanted_id uuid;
begin
  -- Step 1: the space, for its owner or platform moderators only (the table's policy says the same).
  select * into space from public.spaces where spaces.slug = space_log.slug and spaces.deleted_at is null;
  if space.id is null or not (public.space_card_visible(space) or public.staff_may('moderation', 'view')) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  if space.user_id is distinct from (select auth.uid()) and not public.staff_may('moderation', 'view') then
    raise exception 'Only the space''s owner can read its log.' using errcode = 'insufficient_privilege', hint = 'space:not_owner';
  end if;
  -- Step 2: the person picked in "Who", by handle.
  if wanted is not null and wanted <> 'platform' then
    select profiles.id into wanted_id from public.profiles where lower(profiles.handle) = wanted;
  end if;
  -- Step 3: one page, one row more to know whether there is another.
  return (
    with filtered as (
      select log.* from public.space_moderation_log as log
      where log.space_id = space.id
        and (wanted is null
             or (wanted = 'platform' and log.by_platform)
             or (wanted <> 'platform' and not log.by_platform and log.user_id = wanted_id))
    ), page as (
      select filtered.* from filtered
      order by filtered.created_at desc, filtered.id
      offset greatest(coalesce(skip, 0), 0) limit page_size + 1
    )
    select jsonb_build_object(
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'actor', case when page.by_platform then null else public.forum_person_json(page.user_id) end,
                 'action', page.action,
                 'target', public.forum_person_json(page.target_user_id),
                 'thread', (select jsonb_build_object('number', forum_threads.thread_number, 'title', forum_threads.title)
                            from public.forum_threads where forum_threads.id = page.thread_id),
                 'note', page.note,
                 'details', page.details,
                 'created_at', page.created_at) order by page.created_at desc, page.id)
        from (select * from page order by page.created_at desc, page.id limit page_size) as page), '[]'::jsonb),
      'has_more', (select count(*) > page_size from page),
      'people', coalesce((
        select jsonb_agg(person order by person ->> 'handle')
        from (select distinct public.forum_person_json(log.user_id) as person
              from public.space_moderation_log as log
              where log.space_id = space.id and not log.by_platform) as actors
        where person is not null), '[]'::jsonb),
      'platform_acted', exists (select 1 from public.space_moderation_log as log
                                where log.space_id = space.id and log.by_platform)));
end;
$$;
comment on function public.space_log(text, integer, text) is
  'A space''s moderation log, for its owner and platform moderators, optionally by who acted (S1-E8-07, BOOKS-7).';
revoke execute on function public.space_log(text, integer, text) from public, anon;
grant execute on function public.space_log(text, integer, text) to authenticated;

/* ---------- 5. Moderator invitations (F07, F10, F11) ---------- */

alter table public.space_members add column moderator_invite_powers public.space_power[];
alter table public.space_members add column moderator_invited_at timestamptz;
alter table public.space_members add constraint space_members_invite_only_members check (
  moderator_invite_powers is null
  or (role = 'member' and status = 'active' and cardinality(moderator_invite_powers) > 0
      and moderator_invited_at is not null));
comment on column public.space_members.moderator_invite_powers is
  'The powers the owner offered this member, waiting for the member to accept; null for none (BOOKS-7).';
comment on column public.space_members.moderator_invited_at is
  'When the owner sent the open moderator invitation; null for none (BOOKS-7).';

/**
 * set_space_moderator: the owner changes who helps run the space.
 * Inputs: slug, handle, powers (an empty list takes the powers away).
 * Rules (user stories 7.7, 7.10, 7.11: "they must accept the invitation before the powers
 *   start"): a member who isn't a moderator yet gets an invitation with these powers, a
 *   notification, and becomes a moderator only by accepting it (answer_space_moderator_invite());
 *   an empty list takes a waiting invitation back. A moderator's powers change at once, and an
 *   empty list makes them a member again. The person must be in the space's age group (S1-E8-06).
 * Returns: {"outcome": "invited" | "invite_cancelled" | "changed" | "removed"}.
 * Errors: owned_space_for_change()'s; no_data_found (hint 'member:missing'); check_violation
 *   (hint 'member:owner' or 'member:age').
 */
create or replace function public.set_space_moderator(slug text, handle text, powers public.space_power[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(set_space_moderator.slug);
  member public.space_members := public.space_member_by_handle(space.id, set_space_moderator.handle);
  chosen public.space_power[] := (select coalesce(array_agg(distinct power order by power), '{}')
                                  from unnest(coalesce(set_space_moderator.powers, '{}')) as power);
  outcome text;
begin
  -- Step 1: an active member who isn't the owner.
  if member.id is null or member.status <> 'active' then
    raise exception 'That person isn''t a member of this space.' using errcode = 'no_data_found', hint = 'member:missing';
  end if;
  if member.role = 'owner' then
    raise exception 'The owner already has every power.' using errcode = 'check_violation', hint = 'member:owner';
  end if;
  -- Step 2: a new or changed moderator must still be in the space's age group.
  if cardinality(chosen) > 0 and public.space_age_group_of_person(member.user_id) is distinct from space.age_group then
    raise exception 'This person is in another age group.' using errcode = 'check_violation', hint = 'member:age';
  end if;
  -- Step 3: a member gets an invitation (or loses a waiting one); a moderator changes at once.
  if member.role = 'member' then
    outcome := case when cardinality(chosen) = 0 then 'invite_cancelled' else 'invited' end;
    if outcome = 'invite_cancelled' and member.moderator_invite_powers is null then
      return jsonb_build_object('outcome', outcome);
    end if;
    update public.space_members
    set moderator_invite_powers = case when cardinality(chosen) = 0 then null else chosen end,
        moderator_invited_at = case when cardinality(chosen) = 0 then null else now() end
    where space_members.id = member.id;
  else
    outcome := case when cardinality(chosen) = 0 then 'removed' else 'changed' end;
    update public.space_members
    set role = (case when cardinality(chosen) = 0 then 'member' else 'moderator' end)::public.space_member_role,
        powers = chosen
    where space_members.id = member.id;
  end if;
  -- Step 4: the log (S1-E8-07 criterion 2) and, for an invitation, the member's notification.
  perform public.log_space_action(space, 'moderator_' || outcome, member.user_id, null, null,
    jsonb_build_object('powers_before', to_jsonb(coalesce(member.moderator_invite_powers, member.powers)),
                       'powers_after', to_jsonb(chosen)));
  if outcome = 'invited' then
    perform public.notify(member.user_id, 'space_moderator_invited', (select auth.uid()),
      jsonb_build_object('space_id', space.id));
  end if;
  return jsonb_build_object('outcome', outcome);
end;
$$;
comment on function public.set_space_moderator(text, text, public.space_power[]) is
  'The owner invites a member to moderate (they accept first), changes a moderator''s powers or takes them away; logged (S1-E8-07, BOOKS-7).';

/**
 * answer_space_moderator_invite: the invited member accepts or declines.
 * Inputs: slug; accept (true to take the powers, false to say no).
 * Rules: only the member the invitation is for; on accepting they must still be in the space's age
 *   group. Each answer is in the log.
 * Returns: {"outcome": "accepted" | "declined"}.
 * Errors: no_data_found (hint 'invite:missing') when there is no open invitation; check_violation
 *   (hint 'member:age').
 * Where it fits: the invitation note on the space's page (SpaceModeratorInviteNote).
 */
create or replace function public.answer_space_moderator_invite(slug text, accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  space public.spaces;
  member public.space_members;
begin
  -- Step 1: the space and the caller's open invitation in it.
  select * into space from public.spaces where spaces.slug = answer_space_moderator_invite.slug and spaces.deleted_at is null;
  select * into member from public.space_members
  where space_members.space_id = space.id and space_members.user_id = caller_id
    and space_members.moderator_invite_powers is not null;
  if caller_id is null or space.id is null or member.id is null then
    raise exception 'There is no invitation to answer.' using errcode = 'no_data_found', hint = 'invite:missing';
  end if;
  -- Step 2: declining only clears it.
  if not coalesce(accept, false) then
    update public.space_members set moderator_invite_powers = null, moderator_invited_at = null
    where space_members.id = member.id;
    perform public.log_space_action(space, 'moderator_invite_declined', caller_id, null, null, '{}'::jsonb);
    return jsonb_build_object('outcome', 'declined');
  end if;
  -- Step 3: accepting needs the age group still (S1-E8-06), then the powers start.
  if public.space_age_group_of_person(caller_id) is distinct from space.age_group then
    raise exception 'This person is in another age group.' using errcode = 'check_violation', hint = 'member:age';
  end if;
  update public.space_members
  set role = 'moderator', powers = member.moderator_invite_powers,
      moderator_invite_powers = null, moderator_invited_at = null
  where space_members.id = member.id;
  perform public.log_space_action(space, 'moderator_invite_accepted', caller_id, null, null,
    jsonb_build_object('powers_after', to_jsonb(member.moderator_invite_powers)));
  return jsonb_build_object('outcome', 'accepted');
end;
$$;
comment on function public.answer_space_moderator_invite(text, boolean) is
  'The invited member accepts or declines becoming a space moderator; logged (BOOKS-7).';
revoke execute on function public.answer_space_moderator_invite(text, boolean) from public, anon;
grant execute on function public.answer_space_moderator_invite(text, boolean) to authenticated;

/**
 * space_member_list: as in FORUMS-2b, plus each member's waiting invitation ("invited_powers").
 * Where it fits: SpaceMembersPage and the settings page's Moderators card.
 */
create or replace function public.space_member_list(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(space_member_list.slug, 'members');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_members.user_id),
                       'role', space_members.role, 'powers', to_jsonb(space_members.powers),
                       'invited_powers', to_jsonb(space_members.moderator_invite_powers),
                       'joined_at', space_members.joined_at)
                     order by case space_members.role when 'owner' then 0 when 'moderator' then 1 else 2 end,
                              space_members.joined_at)
    from public.space_members
    where space_members.space_id = space.id and space_members.status = 'active'
      and public.forum_person_json(space_members.user_id) is not null), '[]'::jsonb);
end;
$$;

/* ---------- 6. Blocking someone from a space (F11) ---------- */

create table public.space_blocks (
  id uuid primary key default gen_random_uuid(),
  -- Who blocked: the owner or a moderator with the members power (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  space_id uuid not null references public.spaces (id) on delete cascade,
  -- The person kept out of the space.
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint space_blocks_once unique (space_id, blocked_user_id)
);
comment on table public.space_blocks is
  'kind: user_action
The people a space''s owner or moderators blocked: they can''t ask to join again or read members-only posts (BOOKS-7, user story 7.11).';
create index space_blocks_user_id on public.space_blocks (user_id);
create index space_blocks_blocked_user_id on public.space_blocks (blocked_user_id);
create trigger space_blocks_set_updated_at
  before update on public.space_blocks
  for each row execute function public.set_updated_at();
create trigger space_blocks_keep_user_id
  before update on public.space_blocks
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.space_blocks enable row level security;

/**
 * space_blocks_readable: whether the caller may see a space's blocks: its owner, a moderator with
 *   the members power, or our moderation team (space_may_act() says which).
 * Input: the space's ID. Returns: true or false. Used by the policy below only.
 */
create function public.space_blocks_readable(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.spaces
                 where spaces.id = target_space_id and public.space_may_act(spaces, 'members'));
$$;
comment on function public.space_blocks_readable(uuid) is
  'Internal: whether the caller runs a space (or is our moderation team), for the space_blocks policy (BOOKS-7).';
revoke execute on function public.space_blocks_readable(uuid) from public, anon;
grant execute on function public.space_blocks_readable(uuid) to authenticated;

-- Who: the space's owner, its moderators with the members power and our moderation team. Why:
-- they keep the space safe and need to see whom they blocked to undo it; the blocked person and
-- other members never see the list. Writes go only through block_space_member() and
-- unblock_space_member(), so there are no write policies.
create policy space_blocks_select_runners on public.space_blocks
  for select to authenticated
  using ((select public.space_blocks_readable(space_blocks.space_id)));
comment on policy space_blocks_select_runners on public.space_blocks is
  'Allows a space''s owner, its moderators with the members power and platform moderators to read who the space blocked (BOOKS-7).';

grant select on public.space_blocks to authenticated;

/**
 * space_blocks_caller: whether the space blocked the signed-in caller.
 * Input: the space's ID. Returns: true or false (false signed out). Internal.
 */
create or replace function public.space_blocks_caller(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.space_blocks
                 where space_blocks.space_id = target_space_id
                   and space_blocks.blocked_user_id = (select auth.uid()));
$$;
comment on function public.space_blocks_caller(uuid) is
  'Internal: whether a space blocked the caller (BOOKS-7).';
revoke execute on function public.space_blocks_caller(uuid) from public, anon, authenticated;

/** space_may_join: as in CLASSES-a, and never for someone the space blocked (BOOKS-7). */
create or replace function public.space_may_join(target public.spaces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and target.kind = 'open'
    and public.space_card_visible(target)
    and public.is_active_member()
    and public.space_age_group_of_caller() = target.age_group
    and (public.space_membership_of_caller(target.id)).id is null
    and not public.space_blocks_caller(target.id);
$$;

/**
 * join_space: as in IDEAS-3d, and a blocked person is told so (hint 'space:blocked', BOOKS-7).
 */
create or replace function public.join_space(slug text, note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  space public.spaces;
  membership public.space_members;
  clean_note text := nullif(public.check_space_text(note, 'join_note'), '');
begin
  -- Step 1: a space the caller may know about.
  select * into space from public.spaces where spaces.slug = join_space.slug and spaces.deleted_at is null;
  if space.id is null or not public.space_card_visible(space) then
    raise exception 'There is no such space.' using errcode = 'no_data_found', hint = 'space:missing';
  end if;
  -- Step 2: already in, or already asked.
  membership := public.space_membership_of_caller(space.id);
  if membership.id is not null then
    return jsonb_build_object('status', membership.status);
  end if;
  -- Step 3 (S1-E8-11): a class space takes its teacher's code instead.
  if space.kind = 'class' then
    raise exception 'Join a class with your teacher''s code.' using errcode = 'insufficient_privilege', hint = 'space:class';
  end if;
  -- Step 4 (BOOKS-7, user story 7.11): someone the space blocked can't ask again.
  if public.space_blocks_caller(space.id) then
    raise exception 'This space blocked your account.' using errcode = 'insufficient_privilege', hint = 'space:blocked';
  end if;
  -- Step 5: only people in the space's age group join it.
  if not public.space_may_join(space) then
    raise exception 'This space is for another age group.' using errcode = 'insufficient_privilege', hint = 'space:age';
  end if;
  perform public.take_rate_limit('space_join');
  -- Step 6: in straight away, or waiting for the owner.
  insert into public.space_members (user_id, space_id, status, joined_at)
  values (caller_id, space.id,
          case when space.joining = 'open' then 'active'::public.space_member_status else 'pending' end,
          case when space.joining = 'open' then now() end)
  returning * into membership;
  -- Step 7 (IDEAS-3d): the note goes with a request only.
  if membership.status = 'pending' and clean_note is not null then
    insert into public.space_join_notes (user_id, space_id, note) values (caller_id, space.id, clean_note);
  end if;
  return jsonb_build_object('status', membership.status);
end;
$$;

/**
 * block_space_member: takes someone out of an open space and keeps them out.
 * Inputs: slug; handle (a member or someone waiting to join); reason (optional, at most 500
 *   characters, kept in the log only).
 * Rules (user story 7.11): the owner and moderators with the members power; never the owner; only
 *   the owner blocks a moderator; a class space has no Block (its teacher removes pupils). The
 *   membership or request goes, the block stays until unblocked; logged.
 * Returns: {"blocked": true}.
 * Errors: space_for_power()'s; no_data_found ('member:missing'); check_violation ('member:owner',
 *   'reason:too_long'); insufficient_privilege ('space:not_allowed', 'space:class').
 */
create or replace function public.block_space_member(slug text, handle text, reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(block_space_member.slug, 'members');
  member public.space_members := public.space_member_by_handle(space.id, block_space_member.handle);
begin
  -- Step 1: someone in the space or waiting to join it, who may be blocked by the caller.
  if space.kind = 'class' then
    raise exception 'A class space has no Block.' using errcode = 'insufficient_privilege', hint = 'space:class';
  end if;
  if member.id is null then
    raise exception 'That person isn''t a member of this space.' using errcode = 'no_data_found', hint = 'member:missing';
  end if;
  if member.role = 'owner' then
    raise exception 'The owner can''t be blocked.' using errcode = 'check_violation', hint = 'member:owner';
  end if;
  if member.role = 'moderator' and space.user_id is distinct from (select auth.uid())
     and not public.staff_may('moderation', 'act') then
    raise exception 'Only the owner can block a moderator.' using errcode = 'insufficient_privilege', hint = 'space:not_allowed';
  end if;
  if char_length(btrim(coalesce(reason, ''))) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  -- Step 2: out of the space, and kept out.
  delete from public.space_members where space_members.id = member.id;
  insert into public.space_blocks (user_id, space_id, blocked_user_id)
  values ((select auth.uid()), space.id, member.user_id)
  on conflict (space_id, blocked_user_id) do nothing;
  -- Step 3: the log.
  perform public.log_space_action(space, 'member_blocked', member.user_id, null, nullif(btrim(coalesce(reason, '')), ''));
  return jsonb_build_object('blocked', true);
end;
$$;
comment on function public.block_space_member(text, text, text) is
  'Takes someone out of an open space and keeps them from asking again; logged (BOOKS-7).';
revoke execute on function public.block_space_member(text, text, text) from public, anon;
grant execute on function public.block_space_member(text, text, text) to authenticated;

/**
 * unblock_space_member: lets a blocked person ask to join again.
 * Inputs: slug, handle. Returns: {"unblocked": bool} (false when they weren't blocked).
 * Errors: space_for_power()'s.
 */
create or replace function public.unblock_space_member(slug text, handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(unblock_space_member.slug, 'members');
  person_id uuid;
  removed integer;
begin
  -- Step 1: the person, by handle.
  select profiles.id into person_id from public.profiles
  where profiles.handle_skeleton = public.username_skeleton(btrim(unblock_space_member.handle, ' @'));
  -- Step 2: the block goes, and the log says so.
  delete from public.space_blocks
  where space_blocks.space_id = space.id and space_blocks.blocked_user_id = person_id;
  get diagnostics removed = row_count;
  if removed > 0 then
    perform public.log_space_action(space, 'member_unblocked', person_id, null, null);
  end if;
  return jsonb_build_object('unblocked', removed > 0);
end;
$$;
comment on function public.unblock_space_member(text, text) is
  'Lets someone a space blocked ask to join again; logged (BOOKS-7).';
revoke execute on function public.unblock_space_member(text, text) from public, anon;
grant execute on function public.unblock_space_member(text, text) to authenticated;

/**
 * space_blocked_members: the people a space blocked, newest first, for the members page.
 * Input: slug. Returns: [{"person", "blocked_at"}].
 * Errors: space_for_power()'s.
 */
create or replace function public.space_blocked_members(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(space_blocked_members.slug, 'members');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('person', public.forum_person_json(space_blocks.blocked_user_id),
                                        'blocked_at', space_blocks.created_at)
                     order by space_blocks.created_at desc)
    from public.space_blocks
    where space_blocks.space_id = space.id
      and public.forum_person_json(space_blocks.blocked_user_id) is not null), '[]'::jsonb);
end;
$$;
comment on function public.space_blocked_members(text) is
  'The people a space blocked, for its owner and moderators with the members power (BOOKS-7).';
revoke execute on function public.space_blocked_members(text) from public, anon;
grant execute on function public.space_blocked_members(text) to authenticated;

/** space_viewer_json: as in IDEAS-3e, plus the caller's waiting "moderator_invite" (BOOKS-7). */
create or replace function public.space_viewer_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership', case
      when membership.role = 'owner' then 'owner'
      when membership.role = 'moderator' then 'moderator'
      when membership.status = 'active' then 'member'
      when membership.status = 'pending' then 'pending' end,
    'can_read', public.space_may_read(target),
    'can_join', public.space_may_join(target),
    'can_post', public.space_may_post(target),
    'can_manage', public.space_may_act(target, 'settings'),
    'can_appoint', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'act'),
    'can_read_log', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'view'),
    'can_invite', target.kind = 'class' and public.space_may_act(target, 'members'),
    'waits_for_account', public.space_is_in_class(target) and not public.space_may_read(target),
    'powers', to_jsonb(public.space_powers_of_caller(target)),
    'welcome_note', case when membership.status = 'active' or public.space_may_act(target, 'settings')
                         then target.welcome_note end,
    'show_welcome', coalesce(target.welcome_note is not null and membership.status = 'active'
                             and membership.role <> 'owner' and membership.welcome_seen_at is null, false),
    'can_hand_over', target.user_id = (select auth.uid()),
    'handover', public.space_handover_json(target),
    -- BOOKS-7: the owner's open invitation to moderate, shown only to the member it is for.
    'moderator_invite', to_jsonb(membership.moderator_invite_powers),
    -- BOOKS-7: whether the space blocked the caller, so the page says why there is no Join.
    'is_blocked', public.space_blocks_caller(target.id))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;

/* ---------- 7. Download my data, account deletion and the notification filter ---------- */

/**
 * data_export_tables: as in BOOKS A06 to A09, plus space_blocks (the people the person blocked
 * from a space they run; GDPR art. 15).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('class_chapter_opens', true, null),
    ('class_competition_criteria', true, null),
    ('class_competition_entrants', true, null),
    ('class_competition_results', true, null),
    ('class_competition_scores', true, null),
    ('class_competitions', true, null),
    ('class_criteria_templates', true, null),
    ('class_point_gifts', true, null),
    ('class_teacher_points', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('remembered_places', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('space_blocks', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_archives', false, 'the stories of a closed account, kept for their writer; a person who brings them back gets them as their own stories'),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_likes', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('topic_follows', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as in BOOKS A06 to A09, plus space_blocks, kept so a space stays safe
 * after the moderator who blocked someone leaves (GDPR art. 17(3)(e): a moderation record).
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('class_chapter_opens', 'delete', 1, null),
    ('class_competition_criteria', 'delete', 2, null),
    ('class_competition_entrants', 'delete', 1, null),
    ('class_competition_results', 'delete', 1, null),
    ('class_competition_scores', 'delete', 1, null),
    ('class_competitions', 'delete', 3, null),
    ('class_criteria_templates', 'delete', 1, null),
    ('class_point_gifts', 'delete', 1, null),
    ('class_teacher_points', 'delete', 1, null),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('remembered_places', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_blocks', 'kept', 0, 'keeps the space safe after the moderator who blocked leaves, shown as a deleted account; deleted with the space or with the blocked account'),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_archives', 'kept', 0, 'the archive of an unused account''s stories, kept story_archive_years so the writer can bring them back (ARCHIVE-1)'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_likes', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('topic_follows', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;

/**
 * notification_category: as in BOOKS B06, plus space_moderator_invited under Follows, next to
 * the other space invitations (user story 7.10).
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'live_session_soon' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'space_moderator_invited' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    when 'home_comment_invited' then 'staff'
    when 'account_unused_month' then 'staff'
    when 'account_unused_week' then 'staff'
    when 'account_unused_nudge' then 'staff'
    when 'account_unused_closed' then 'staff'
    when 'class_competition_won' then 'staff'
    when 'class_competition_results' then 'staff'
    when 'class_readers_choice' then 'staff'
    when 'comments_resumed' then 'stories'
    when 'story_completed' then 'stories'
    else 'replies'
  end;
$$;
