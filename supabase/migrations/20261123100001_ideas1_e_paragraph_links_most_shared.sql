/*
 * Bundle 8b IDEAS-1, part e: ideas IDEA-20261031-2 (notifications open the paragraph's thread)
 * and IDEA-20261031-9 ("Most shared this week").
 *
 * What it adds:
 * - notification_json() gains comment_place: where the notification's comment sits today, so the
 *   app can link straight to that paragraph's thread, or to "on an earlier version" when the
 *   writer has since changed the paragraph (comment_paragraph_json(), S1-E6-06).
 * - The story list 'shared': stories with at least one chapter share in the last 7 days, ordered
 *   by those shares (the new sort 'shared'). Only totals from chapter_shares; never who shared.
 *   browse_stories() keeps every reader rule (rating, blocks, moderation) through listed_stories().
 * - The Discover setting discover_shelves gains 'shared' after 'rising', when staff haven't
 *   changed it.
 * Who calls it: the notifications page (src/features/notifications/) and Discover
 *   (src/features/discovery/).
 */

/* ---------- Notifications link to the paragraph ---------- */

/**
 * notification_json: as in S1-E10-07, plus comment_place for a comment, a reply or reactions on a
 * comment: the paragraph's number today, "earlier", or null for a comment on the whole chapter
 * (IDEAS-1e). Never a user ID. Internal.
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/* ---------- "Most shared this week" ---------- */

/**
 * story_shares_this_week: how many times a story's chapters were shared in the last 7 days.
 * Input: the story's ID. Returns: the total from chapter_shares (today and the 6 days before, by
 *   the Romanian date, as chapter_shares counts them); 0 when none. Never who shared.
 * Internal: list_holds_story() and browse_stories() for the 'shared' list.
 */
create or replace function public.story_shares_this_week(target_story_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(chapter_shares.total), 0)::integer
  from public.chapter_shares
  join public.chapters on chapters.id = chapter_shares.chapter_id
  where chapters.story_id = target_story_id
    and chapter_shares.shared_on > (now() at time zone 'Europe/Bucharest')::date - 7;
$$;
comment on function public.story_shares_this_week(uuid) is
  'Internal: a story''s chapter shares in the last 7 days, a total only (IDEAS-1e).';
revoke execute on function public.story_shares_this_week(uuid) from public, anon, authenticated;

/**
 * is_story_list_kind: whether browse_stories() knows a list.
 * As in S1-E13-01, plus 'shared' (IDEAS-1e). Internal: browse_stories().
 */
create or replace function public.is_story_list_kind(list_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics', 'library', 'picked', 'reader_library', 'shared');
$$;

/**
 * list_holds_story: whether a story belongs to a list.
 * As in S1-E13-01, plus 'shared' (IDEAS-1e): a story shared at least once in the last 7 days.
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
    -- IDEAS-1e: shared at least once in the last 7 days.
    when 'shared' then public.story_shares_this_week(target.id) > 0
    else false
  end;
$$;

/**
 * list_default_sort: a list's own order when the reader hasn't picked one.
 * As in S1-E4-03, plus 'shared' (IDEAS-1e): by this week's shares. Internal: browse_stories().
 */
create or replace function public.list_default_sort(list_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case list_kind
    when 'new' then 'newest'
    when 'updated' then 'updated'
    when 'following' then 'updated'
    when 'library' then 'updated'
    when 'search' then 'relevance'
    when 'shared' then 'shared'
    else 'popular'
  end;
$$;

/**
 * browse_stories: one page of a story list and how many it holds.
 * As in S1-E5-06, plus the sort 'shared' (IDEAS-1e), only on the 'shared' list: the stories
 *   shared most in the last 7 days first. Every reader rule (rating, blocks, moderation) still
 *   comes from listed_stories().
 * Returns: JSON {total, stories: [story_card_json(), ...]}.
 * Errors: invalid_parameter_value for an unknown list_kind or sort_order, a missing list_key,
 *   'relevance' on a list that isn't a search, 'shared' on a list that isn't 'shared', or a
 *   negative page_offset.
 * Where it fits: every shelf on Discover, every See all page and the search page's stories.
 */
create or replace function public.browse_stories(
  list_kind text,
  list_key text default null,
  category_slug text default null,
  completion public.completion_status default null,
  language text default null,
  sort_order text default null,
  page_size integer default 21,
  page_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_rows integer := least(greatest(coalesce(page_size, 21), 1), 60);
  ordering text := coalesce(sort_order, public.list_default_sort(list_kind));
  total integer;
  page jsonb;
begin
  -- Step 1: check what was asked for.
  if list_kind is null or not public.is_story_list_kind(list_kind) then
    raise exception 'Unknown list.' using errcode = 'invalid_parameter_value';
  end if;
  if list_kind in ('category', 'tag', 'writer', 'search') and coalesce(btrim(list_key), '') = '' then
    raise exception 'This list needs a key.' using errcode = 'invalid_parameter_value';
  end if;
  if ordering not in ('popular', 'updated', 'newest', 'oldest', 'title_az', 'title_za', 'writer', 'relevance', 'shared')
      or (ordering = 'relevance' and list_kind <> 'search')
      or (ordering = 'shared' and list_kind <> 'shared') then
    raise exception 'Unknown sort.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(page_offset, 0) < 0 then
    raise exception 'The page can''t start before the first story.' using errcode = 'invalid_parameter_value';
  end if;
  -- Step 2: how many the list holds for this reader, for "24 stories" and "View all 24".
  select count(*) into total from public.listed_stories(list_kind, list_key, category_slug, completion, language);
  -- Step 3: the page, in the chosen order. Only one of the sort lines below is switched on (the
  -- others are null for every row); the last two lines break ties: the newer story, then the
  -- address, so pages never overlap. A story the job hasn't scored yet counts as 0.
  select coalesce(jsonb_agg(public.story_card_json(ordered.id) order by ordered.position), '[]'::jsonb) into page
  from (
    select listed.id, row_number() over (order by
        case when ordering = 'relevance' then public.story_search_rank(listed, list_key) end desc,
        -- IDEAS-1e: "Most shared this week", by the last 7 days' chapter shares.
        case when ordering = 'shared' then public.story_shares_this_week(listed.id) end desc,
        case when ordering in ('popular', 'relevance') then coalesce(scores.score, 0) end desc,
        case when ordering = 'updated' then listed.last_chapter_published_at end desc nulls last,
        case when ordering = 'newest' then listed.first_published_at end desc nulls last,
        case when ordering = 'oldest' then listed.first_published_at end asc nulls last,
        case when ordering = 'title_az' then listed.title collate "ro-x-icu" end asc,
        case when ordering = 'title_za' then listed.title collate "ro-x-icu" end desc,
        case when ordering = 'writer'
          then public.display_name(profiles.handle, profiles.pen_name) collate "ro-x-icu" end asc,
        listed.first_published_at desc nulls last,
        listed.slug) as position
    from public.listed_stories(list_kind, list_key, category_slug, completion, language) as listed
    join public.profiles on profiles.id = listed.user_id
    left join public.story_scores as scores on scores.story_id = listed.id
    order by position
    limit wanted_rows offset coalesce(page_offset, 0)
  ) as ordered;
  return jsonb_build_object('total', total, 'stories', page);
end;
$$;

-- The shelf goes after "New and rising", unless staff already changed the order.
update public.settings
set value = '["following", "picked", "popular", "rising", "shared", "new", "completed", "updated", "classics", "categories"]'::jsonb
where key = 'discover_shelves'
  and value = '["following", "picked", "popular", "rising", "new", "completed", "updated", "classics", "categories"]'::jsonb;
