/*
 * Forum search (bundle FORUMS-1, part f; story S1-E8-10; board 5.1's search field).
 *
 * What it adds:
 * - forum_post_search_text(): what a post is found by, folded: its words, and for post #1 its
 *   thread's title too, so a thread is found by its title.
 * - search_forum_posts(term, forum_slug, author_handle, skip): threads and posts that match, the
 *   closest first (criterion 1). It reuses the story search's helpers (S1-E5-04): search_fold()
 *   drops diacritics, so "povesti" finds "povești", and search_query() stems in Romanian and
 *   English, so "povestea" finds "povești". A word typed only in part still finds a post that
 *   contains it (search_like_pattern()).
 * - Filters: a forum (with the forums inside it) and an author's username. The story asks for
 *   "space"; spaces arrive with S1-E8-06 (FORUMS-2), which adds that filter here.
 * - What is never found (criterion 2): deleted, hidden or removed posts, posts in a thread or forum
 *   the caller can't open, and posts by anyone the caller blocks or who blocks them. All of it
 *   goes through forum_post_state_for_caller() and forum_thread_is_shown(), the same checks the
 *   thread page uses, so search never shows what the thread wouldn't.
 * No index yet: each search reads the forum's live posts, which is fine at Stage 1's size. A
 *   stored tsvector with a GIN index replaces forum_post_search_text() when the forums grow
 *   (the same follow-up as story search).
 * Who calls it: src/features/forums/api/forumSearch.ts (ForumSearchPage).
 * Tests: supabase/tests/database/226-forum-search.test.sql, e2e/forum-search.spec.ts.
 */

/**
 * forum_post_search_text: what a post is found by, folded (lower case, no diacritics).
 * Inputs: target, the post; thread_title, its thread's title (used only for post #1).
 * Returns: the folded text.
 * Internal: search_forum_posts().
 */
create or replace function public.forum_post_search_text(target public.forum_posts, thread_title text)
returns text
language sql
stable
set search_path = ''
as $$
  select public.search_fold(concat_ws(' ', case when target.post_number = 1 then thread_title end, target.body));
$$;
comment on function public.forum_post_search_text(public.forum_posts, text) is
  'Internal: a forum post''s words (and #1''s thread title), folded for search (S1-E8-10).';
revoke execute on function public.forum_post_search_text(public.forum_posts, text) from public, anon, authenticated;

/**
 * forum_search_snippet: the start of a post's words for a result, without Markdown marks.
 * Input: the post's body. Returns: at most 240 characters, "…" when cut.
 * Internal: search_forum_posts().
 */
create or replace function public.forum_search_snippet(body text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Step 1: drop the Markdown subset's marks (bold, italic, quotes, lists, link brackets) and
  -- join the lines, so the result reads as plain text.
  -- Step 2: cut at 240 characters.
  select case when char_length(plain.text) > 240 then left(plain.text, 239) || '…' else plain.text end
  from (select btrim(regexp_replace(regexp_replace(body, '[*_`>#\[\]]', '', 'g'), '\s+', ' ', 'g')) as text) as plain;
$$;
comment on function public.forum_search_snippet(text) is 'Internal: a forum post''s words as a short plain result line (S1-E8-10).';
revoke execute on function public.forum_search_snippet(text) from public, anon, authenticated;

/**
 * search_forum_posts: threads and posts that match a search, the closest first.
 * Inputs: term (as typed; at least 2 characters once trimmed); forum_slug (null for every forum;
 *   a forum includes the forums inside it); author_handle (null for anyone; a username, with or
 *   without "@"); skip (how many results the page already shows, for "Show more results");
 *   language_code (for the forum's name, default 'ro').
 * Returns: JSON {"results": [{"kind" ('thread' when the thread's title matches, else 'post'),
 *   "thread_number", "thread_title", "forum_slug", "forum_name", "post_number", "author"
 *   (forum_person_json()), "created_at", "snippet"}], "has_more"}. Never a user ID.
 *   An empty list for a term shorter than 2 characters.
 * Order: thread titles that match first, then by how closely the words match, then newest.
 * Who may call it: anyone, signed out included (anyone can read the forums).
 */
create or replace function public.search_forum_posts(
  term text,
  forum_slug text default null,
  author_handle text default null,
  skip integer default 0,
  language_code text default 'ro'
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
  scope_id uuid;
  found jsonb;
  found_count integer;
begin
  -- Step 1: a term of under 2 characters finds nothing (a single letter matches everything).
  if char_length(public.search_fold(coalesce(term, ''))) < 2 then
    return jsonb_build_object('results', '[]'::jsonb, 'has_more', false);
  end if;
  -- Step 2: the forum to search in, if one was picked; an unknown one finds nothing.
  if forum_slug is not null then
    select forums.id into scope_id from public.forums
    where forums.slug = search_forum_posts.forum_slug and forums.deleted_at is null;
    if scope_id is null then
      return jsonb_build_object('results', '[]'::jsonb, 'has_more', false);
    end if;
  end if;
  -- Step 3: every live post the caller may read that matches, in its thread and forum, ranked
  -- (one extra, to know whether there is more).
  with candidates as (
    select forum_posts.id as post_id, forum_posts.post_number, forum_posts.user_id, forum_posts.created_at,
           forum_posts.body, forum_threads.thread_number, forum_threads.title, forums.id as forum_id,
           forums.slug, public.forum_post_search_text(forum_posts, forum_threads.title) as text
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
           ts_rank(to_tsvector('pg_catalog.romanian', candidates.text) || to_tsvector('pg_catalog.english', candidates.text), query) as closeness
    from candidates
    where (to_tsvector('pg_catalog.romanian', candidates.text) || to_tsvector('pg_catalog.english', candidates.text)) @@ query
       or candidates.text like pattern
  ), page as (
    select * from matched
    order by matched.title_matches desc, matched.closeness desc, matched.created_at desc
    offset greatest(coalesce(skip, 0), 0)
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
           'snippet', public.forum_search_snippet(page.body))
         order by page.title_matches desc, page.closeness desc, page.created_at desc), '[]'::jsonb),
         count(*)::integer
  into found, found_count
  from page;
  -- Step 4: the answer; the extra result only says there is more.
  if found_count > page_size then
    found := found - page_size;
  end if;
  return jsonb_build_object('results', found, 'has_more', found_count > page_size);
end;
$$;
comment on function public.search_forum_posts(text, text, text, integer, text) is
  'Threads and posts matching a search, by forum and author, without removed posts or blocked people; never a user ID (S1-E8-10).';
grant execute on function public.search_forum_posts(text, text, text, integer, text) to anon, authenticated;

/* ---------- The search page's address ---------- */

-- The search page lives at /forums/search, so no forum may take "search" as its address: the
-- page would hide it. No forum has it today (the seeded ones are checked by this constraint).
alter table public.forums
  add constraint forums_slug_not_search check (slug <> 'search');
