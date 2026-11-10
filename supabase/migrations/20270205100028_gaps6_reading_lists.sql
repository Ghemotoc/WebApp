/**
 * GAPS-6: reading lists in the Library.
 *
 * Why: the liquid glass Library board draws "Your lists": lists of stories a reader makes and
 * names ("Rainy day reads"), each saying how many stories it holds and who sees it. Until now a
 * reader had only the three shelves (Reading, Saved, Finished). Robert, 10 Nov 2026: where a
 * board asks for something the data does not support, create the data.
 *
 * What it adds:
 *   reading_lists                    new table: a list's name, its owner and whether it is public
 *   reading_list_stories             new table: which stories are in which list
 *   reading_list_is_visible()        internal: may the caller see this list
 *   reading_list_json()              internal: a list as the screens show it
 *   my_reading_lists()               the caller's lists, for the Library
 *   reading_list()                   one list, for its own page
 *   story_reading_lists()            the caller's lists with whether a story is in each
 *   create_reading_list()            makes a list
 *   update_reading_list()            renames a list or changes who sees it
 *   delete_reading_list()            deletes a list
 *   set_story_in_reading_list()      puts a story in a list or takes it out
 *   browse_stories('reading_list')   a new list kind, so a list's stories follow every rule the
 *                                    other story lists follow (rating, blocks, moderation,
 *                                    unlisted and private stories)
 *   reportable type 'reading_list'   with its branches in reportable_item_owner(),
 *                                    reportable_item_summary(), case_item_content() and
 *                                    notification_item_json() (CLAUDE.md rule 6)
 *   data_export_tables() and account_deletion_rules() list both tables
 *
 * Who reads what: a list is private until its owner makes it public ("Only you" on the board).
 * The owner reads their own rows (the tables' one policy each, for Download my data). Everyone
 * else reads a public list only through reading_list() and browse_stories(), which leave out a
 * list moderators took away and a list whose owner is blocked either way. Writes go only through
 * the functions below.
 * Builder's choices (unattended, 10 Nov 2026): at most 30 lists per person and 200 stories per
 * list (settings); a name is one line of 1 to 60 characters, once per person, capitals aside;
 * making a list public needs an active account, because its name is then text others read.
 * Called by: src/features/library/api/readingLists.ts.
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('reading_lists_max', '30'::jsonb, false,
   'The most reading lists one person can have (GAPS-6; builder proposal).'),
  ('reading_list_stories_max', '200'::jsonb, false,
   'The most stories one reading list can hold (GAPS-6; builder proposal).')
on conflict (key) do nothing;

/* ---------- The lists ---------- */

create table public.reading_lists (
  id uuid primary key default gen_random_uuid(),
  -- Whose list it is (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- One line, no HTML; create_reading_list() and update_reading_list() clean it first.
  name text not null check (char_length(name) between 1 and 60 and name !~ '[\n\r]'),
  -- Private by default: the board's "Only you".
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set only when the owner deletes a list a moderation case still holds; otherwise the row goes.
  deleted_at timestamptz
);
comment on table public.reading_lists is
  'kind: user_content; reportable: reading_list
A list of stories a reader makes and names in their Library; private until they make it public (GAPS-6).';
create index reading_lists_owner on public.reading_lists (user_id);
-- One name once per person, capitals aside, so two rows in the Library never look the same.
create unique index reading_lists_one_name_per_person
  on public.reading_lists (user_id, lower(name)) where deleted_at is null;
create trigger reading_lists_set_updated_at
  before update on public.reading_lists
  for each row execute function public.set_updated_at();
create trigger reading_lists_refuse_user_id_change
  before update on public.reading_lists
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.reading_lists enable row level security;

-- Allows: the owner, reading their own lists (Download my data). Why: they are their own.
-- Everyone else reads a public list through reading_list() and browse_stories(), which apply
-- blocks and moderation, never the table. Writes go only through the functions below.
create policy reading_lists_select_own on public.reading_lists
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.reading_lists to authenticated;

/* ---------- The stories in each list ---------- */

create table public.reading_list_stories (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.reading_lists (id) on delete cascade,
  -- Who put the story in: always the list's owner (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- Gone with the story when it is deleted for good, like a library entry.
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_list_stories_once_per_list unique (list_id, story_id)
);
comment on table public.reading_list_stories is
  'kind: user_action
Which stories a reader put in which of their reading lists, and when (GAPS-6).';
create index reading_list_stories_person_story on public.reading_list_stories (user_id, story_id);
create index reading_list_stories_story on public.reading_list_stories (story_id);
create trigger reading_list_stories_set_updated_at
  before update on public.reading_list_stories
  for each row execute function public.set_updated_at();
create trigger reading_list_stories_refuse_user_id_change
  before update on public.reading_list_stories
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.reading_list_stories enable row level security;

-- Allows: the owner, reading what they put in their own lists (Download my data). Why: it is
-- their own choice of stories. A public list's stories reach others through browse_stories(),
-- which applies every reader rule, never the table. Writes go only through
-- set_story_in_reading_list().
create policy reading_list_stories_select_own on public.reading_list_stories
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.reading_list_stories to authenticated;

/* ---------- Who may see a list ---------- */

/**
 * reading_list_is_visible: may the caller see this reading list.
 *
 * Inputs: the list's row.
 * Returns: true for the owner's own list; for anyone else only when the list is public,
 *   moderators haven't hidden or removed it and neither person blocked the other (CLAUDE.md
 *   rule 6). False for a deleted list.
 * Errors: none.
 * Where it fits: the one gate behind reading_list(), browse_stories('reading_list') and the
 *   report form, so a private list never shows anywhere.
 */
create function public.reading_list_is_visible(target public.reading_lists)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.deleted_at is null
    and (
      target.user_id = (select auth.uid())
      or (target.is_public
          and not public.is_moderated_away('reading_list', target.id)
          and not public.is_blocked_with(target.user_id))
    );
$$;

comment on function public.reading_list_is_visible(public.reading_lists) is
  'Internal: the caller may see this reading list: their own, or a public one not moderated away or blocked (GAPS-6).';

revoke all on function public.reading_list_is_visible(public.reading_lists) from public;

/* ---------- Story lists learn the new kind ---------- */

-- Unchanged except for the new kind, reading_list.
CREATE OR REPLACE FUNCTION public.is_story_list_kind(list_kind text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  select list_kind in ('updated', 'new', 'popular', 'rising', 'completed', 'category', 'tag',
    'following', 'writer', 'search', 'classics', 'library', 'picked', 'reader_library', 'shared', 'reading_list');
$$;

comment on function public.is_story_list_kind(text) is
  'Internal: the story lists browse_stories() accepts (S1-E5-06, GAPS-6).';

-- Unchanged except that a reading list, like a Library shelf, shows the story updated last first.
CREATE OR REPLACE FUNCTION public.list_default_sort(list_kind text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  select case list_kind
    when 'new' then 'newest'
    when 'updated' then 'updated'
    when 'following' then 'updated'
    when 'library' then 'updated'
    when 'reading_list' then 'updated'
    when 'search' then 'relevance'
    when 'shared' then 'shared'
    else 'popular'
  end;
$$;

comment on function public.list_default_sort(text) is
  'Internal: a list''s own order (S1-E5-02, S1-E5-03, GAPS-6).';

-- Unchanged except that an unlisted story shows in a reading list on the same terms as in
-- someone's library, and that keeping it in one's own list counts as keeping it.
CREATE OR REPLACE FUNCTION public.story_listing_allows(target stories, list_kind text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select target.visibility = 'public'
    or target.user_id = (select auth.uid())
    or (target.visibility = 'unlisted' and (
      list_kind = 'library'
      -- GAPS-6: in a reading list as in someone's library: only for a reader who already keeps
      -- the story (in their library, their follows or one of their own lists).
      or (list_kind in ('reader_library', 'reading_list') and (
        exists (select 1 from public.library_entries
                where library_entries.user_id = (select auth.uid()) and library_entries.story_id = target.id)
        or exists (select 1 from public.reading_list_stories
                   where reading_list_stories.user_id = (select auth.uid()) and reading_list_stories.story_id = target.id)
        or exists (select 1 from public.follows_stories
                   where follows_stories.user_id = (select auth.uid()) and follows_stories.story_id = target.id)))));
$$;

comment on function public.story_listing_allows(public.stories, text) is
  'Internal: unlisted stories show only in libraries, private ones nowhere but the writer''s own (NEW-1, GAPS-6).';

-- Unchanged except for the reading_list branch at the end.
CREATE OR REPLACE FUNCTION public.list_holds_story(target stories, list_kind text, list_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- GAPS-6: one reading list, by its ID, when the caller may see the list (their own, or a
    -- public one that moderators haven't taken away and whose owner isn't blocked either way).
    when 'reading_list' then exists (
      select 1 from public.reading_list_stories as entries
      join public.reading_lists on reading_lists.id = entries.list_id
      where entries.story_id = target.id
        and reading_lists.id::text = list_key
        and public.reading_list_is_visible(reading_lists))
    else false
  end;
$$;

comment on function public.list_holds_story(public.stories, text, text) is
  'Internal: does a story belong to a list, before the reader''s rules (S1-E5-01, GAPS-6).';

-- Unchanged except for three things: a reading list's stories are found through the list's own
-- rows first; like a Library shelf, a reading list still shows a restricted story; and
-- story_listing_allows() is asked about the new kind.
CREATE OR REPLACE FUNCTION public.listed_stories(list_kind text, list_key text, category_slug text, completion completion_status, language text)
 RETURNS SETOF stories
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  caller_id uuid := (select auth.uid());
  -- The ratings this caller may see, from rating_allows() itself, asked once per rating.
  allowed_ratings public.story_rating[] := array(
    select rating from unnest(enum_range(null::public.story_rating)) as rating
    where public.rating_allows(rating));
  -- Everyone the caller blocked or who blocked the caller (CLAUDE.md rule 6).
  blocked_ids uuid[] := array(
    select blocks.blocked_user_id from public.blocks where blocks.user_id = caller_id
    union
    select blocks.user_id from public.blocks where blocks.blocked_user_id = caller_id);
  is_search boolean := list_kind = 'search';
  -- GAPS-6: a reading list's ID, so its few stories are found through the list's own index
  -- instead of asking every story whether it is in the list. Null for every other list.
  reading_list_id uuid := case
    when list_kind = 'reading_list'
      and list_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then list_key::uuid end;
  search_terms tsquery;
  search_pattern text;
begin
  -- Step 1: for a search, the stories that answer it, found through the two indexes.
  if is_search then
    if char_length(public.search_fold(list_key)) < 2 then
      return;
    end if;
    search_terms := public.search_query(list_key);
    search_pattern := public.search_like_pattern(list_key);
  end if;

  -- Step 2: the list, with each rule as a join or a test on the whole set.
  -- story_as_shown() sits in FROM, so it runs once per story: written as
  -- "(story_as_shown(stories)).*" it ran once per column, about forty times per story.
  return query
  select shown.*
  from public.stories
  join public.categories on categories.id = stories.category_id
  cross join lateral public.story_as_shown(stories) as shown
  where stories.deleted_at is null
    -- At least one published chapter that moderators haven't removed (story_has_readable_chapter()).
    and exists (
      select 1 from public.chapters
      where chapters.story_id = stories.id
        and chapters.status = 'published'
        and chapters.deleted_at is null
        and not exists (
          select 1 from public.moderated_items
          where moderated_items.item_type = 'chapter' and moderated_items.item_id = chapters.id
            and moderated_items.restored_at is null))
    -- The story itself isn't removed or hidden by moderators (is_moderated_away()).
    and not exists (
      select 1 from public.moderated_items
      where moderated_items.item_type = 'story' and moderated_items.item_id = stories.id
        and moderated_items.restored_at is null)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = caller_id)
    -- NEW-1: unlisted stories are in no public list, only in libraries (story_listing_allows()).
    -- A public story always passes, so that common case is answered without the function.
    and (stories.visibility = 'public' or public.story_listing_allows(stories, list_kind))
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer', 'reading_list')
         or stories.user_id = caller_id
         or not exists (
           select 1 from public.story_restrictions
           where story_restrictions.story_id = stories.id and story_restrictions.lifted_at is null))
    -- CLAUDE.md rules 18 and 6: the rating, and blocks, unless it is the caller's own story.
    and (stories.user_id = caller_id
         or (stories.rating = any (allowed_ratings) and not (stories.user_id = any (blocked_ids))))
    -- GAPS-6: for a reading list, only the stories in it are looked at.
    and (list_kind <> 'reading_list' or stories.id in (
          select entries.story_id from public.reading_list_stories as entries
          where entries.list_id = reading_list_id))
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    -- The list's own rule: the three open lists hold every story; search uses the indexes; the
    -- rest ask list_holds_story().
    and (
      list_kind in ('updated', 'new', 'popular')
      or (is_search and stories.id in (
            select documents.story_id from public.story_search_documents as documents
            where documents.document @@ search_terms or documents.search_text like search_pattern))
      or (list_kind not in ('updated', 'new', 'popular', 'search')
          and public.list_holds_story(stories, list_kind, list_key)));
end;
$$;

comment on function public.listed_stories(text, text, text, public.completion_status, text) is
  'Internal: the stories in a list this reader may see, after the filters (S1-E5-01, GAPS-6).';

/* ---------- A list as the screens show it ---------- */

/**
 * reading_list_json: one reading list as the Library and the list's page show it.
 *
 * Inputs: the list's row (the caller checked that it is visible).
 * Returns: { id, name, is_public, is_own, owner: { handle, pen_name }, story_count, covers }:
 *   the count is of the stories this caller may see, and covers are the cards of the three added
 *   last, for the row's stacked covers.
 * Errors: none.
 * Where it fits: called by my_reading_lists() and reading_list(); the stories come from
 *   listed_stories(), so the count always matches the list's page.
 */
create function public.reading_list_json(target public.reading_lists)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with listed as (
    select shown.id, entries.created_at as added_at
    from public.listed_stories('reading_list', target.id::text, null, null, null) as shown
    join public.reading_list_stories as entries
      on entries.list_id = target.id and entries.story_id = shown.id
  )
  select jsonb_build_object(
    'id', target.id,
    'name', target.name,
    'is_public', target.is_public,
    'is_own', target.user_id = (select auth.uid()),
    'owner', (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name)
              from public.profiles where profiles.id = target.user_id),
    'story_count', (select count(*) from listed),
    'covers', (select coalesce(jsonb_agg(public.story_card_json(latest.id) order by latest.added_at desc), '[]'::jsonb)
               from (select listed.id, listed.added_at from listed order by listed.added_at desc limit 3) as latest));
$$;

comment on function public.reading_list_json(public.reading_lists) is
  'Internal: a reading list with its owner, its count and its three latest covers, as this caller may see them (GAPS-6).';

revoke all on function public.reading_list_json(public.reading_lists) from public;

/* ---------- The caller's lists ---------- */

/**
 * my_reading_lists: the caller's own reading lists, for "Reading lists" in the Library.
 *
 * Inputs: none.
 * Returns: a list of reading_list_json() objects, the list changed last first.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: useReadingLists() on the Library page.
 */
create function public.my_reading_lists()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to see your reading lists.' using errcode = 'insufficient_privilege';
  end if;
  return (
    select coalesce(jsonb_agg(public.reading_list_json(reading_lists)
      order by reading_lists.updated_at desc, reading_lists.id), '[]'::jsonb)
    from public.reading_lists
    where reading_lists.user_id = caller_id and reading_lists.deleted_at is null);
end;
$$;

comment on function public.my_reading_lists() is
  'The caller''s own reading lists with their counts and covers, for the Library (GAPS-6).';

revoke all on function public.my_reading_lists() from public, anon;
grant execute on function public.my_reading_lists() to authenticated;

/* ---------- One list ---------- */

/**
 * reading_list: one reading list, for its own page.
 *
 * Inputs: the list's ID.
 * Returns: the reading_list_json() object, plus for the owner "entries": [{ slug, title }] of the
 *   stories in it, added last first, so each can be taken out. Null when there is no such list
 *   or the caller may not see it (a private list looks the same as none).
 * Errors: none.
 * Where it fits: useReadingList() on /library/lists/:listId. The stories themselves come from
 *   browse_stories('reading_list', <id>).
 */
create function public.reading_list(list_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.reading_list_json(reading_lists)
    || case when reading_lists.user_id = (select auth.uid()) then jsonb_build_object('entries', (
        select coalesce(jsonb_agg(jsonb_build_object('slug', shown.slug, 'title', shown.title)
          order by entries.created_at desc), '[]'::jsonb)
        from public.listed_stories('reading_list', reading_lists.id::text, null, null, null) as shown
        join public.reading_list_stories as entries
          on entries.list_id = reading_lists.id and entries.story_id = shown.id))
      else '{}'::jsonb end
  from public.reading_lists
  where reading_lists.id = list_id and public.reading_list_is_visible(reading_lists);
$$;

comment on function public.reading_list(uuid) is
  'One reading list the caller may see (their own, or a public one), for its page; null otherwise (GAPS-6).';

revoke all on function public.reading_list(uuid) from public;
grant execute on function public.reading_list(uuid) to anon, authenticated;

/* ---------- A story's place in the caller's lists ---------- */

/**
 * story_reading_lists: the caller's reading lists, each saying whether one story is in it.
 *
 * Inputs: the story's address.
 * Returns: [{ id, name, is_public, has_story }], by name. An empty list when signed out.
 * Errors: none.
 * Where it fits: "Add to a list" on the story page (useStoryReadingLists).
 */
create function public.story_reading_lists(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', reading_lists.id,
      'name', reading_lists.name,
      'is_public', reading_lists.is_public,
      'has_story', exists (
        select 1 from public.reading_list_stories as entries
        join public.stories on stories.id = entries.story_id
        where entries.list_id = reading_lists.id and stories.slug = story_slug))
    order by lower(reading_lists.name), reading_lists.id), '[]'::jsonb)
  from public.reading_lists
  where reading_lists.user_id = (select auth.uid()) and reading_lists.deleted_at is null;
$$;

comment on function public.story_reading_lists(text) is
  'The caller''s reading lists with whether a story is in each, for "Add to a list" on the story page (GAPS-6).';

revoke all on function public.story_reading_lists(text) from public, anon;
grant execute on function public.story_reading_lists(text) to authenticated;

/* ---------- Checking a name ---------- */

/**
 * clean_reading_list_name: a typed list name made ready to save, or an error saying what is wrong.
 *
 * Inputs: the name as typed.
 * Returns: the name trimmed, on one line, with Romanian letters in their correct form.
 * Errors: check_violation with hint name_length (empty or over 60 characters) or name_html (it
 *   holds an HTML tag; CLAUDE.md rule 8).
 * Where it fits: create_reading_list() and update_reading_list().
 */
create function public.clean_reading_list_name(typed_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  clean_name text := public.normalise_romanian_letters(
    regexp_replace(btrim(coalesce(typed_name, '')), '\s+', ' ', 'g'));
begin
  if char_length(clean_name) not between 1 and 60 then
    raise exception 'A list''s name has 1 to 60 characters.'
      using errcode = 'check_violation', hint = 'name_length';
  end if;
  if public.has_html_tag(clean_name) then
    raise exception 'A list''s name is plain text.'
      using errcode = 'check_violation', hint = 'name_html';
  end if;
  return clean_name;
end;
$$;

comment on function public.clean_reading_list_name(text) is
  'Internal: a reading list''s name trimmed to one line, or an error for an empty, over-long or HTML name (GAPS-6).';

revoke all on function public.clean_reading_list_name(text) from public;

/* ---------- Make a list ---------- */

/**
 * create_reading_list: makes a reading list for the caller, private and empty.
 *
 * Inputs: the list's name.
 * Returns: { id }.
 * Errors: insufficient_privilege when signed out; check_violation with hint name_length,
 *   name_html, name_taken (the caller has a list with that name, capitals aside) or
 *   too_many_lists (the reading_lists_max setting).
 * Where it fits: "New list" in the Library and in "Add to a list" on the story page
 *   (useReadingListActions.createList).
 */
create function public.create_reading_list(list_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_name text;
  most_lists integer := coalesce(public.setting_value('reading_lists_max') #>> '{}', '30')::integer;
  new_id uuid;
begin
  -- Step 1: signed in, with a real name.
  if caller_id is null then
    raise exception 'Log in to make a reading list.' using errcode = 'insufficient_privilege';
  end if;
  clean_name := public.clean_reading_list_name(list_name);
  -- Step 2: one change to this person's lists at a time, so two presses of "Create" at the same
  -- moment can't both pass the checks below.
  perform pg_advisory_xact_lock(hashtext('reading_lists:' || caller_id::text));
  if exists (select 1 from public.reading_lists
             where user_id = caller_id and deleted_at is null and lower(name) = lower(clean_name)) then
    raise exception 'You already have a list with that name.'
      using errcode = 'check_violation', hint = 'name_taken';
  end if;
  if (select count(*) from public.reading_lists where user_id = caller_id and deleted_at is null) >= most_lists then
    raise exception 'You can have at most % reading lists.', most_lists
      using errcode = 'check_violation', hint = 'too_many_lists';
  end if;
  -- Step 3: the list, private until its owner says otherwise.
  insert into public.reading_lists (user_id, name) values (caller_id, clean_name)
  returning id into new_id;
  return jsonb_build_object('id', new_id);
end;
$$;

comment on function public.create_reading_list(text) is
  'Makes a private, empty reading list for the caller (GAPS-6).';

revoke all on function public.create_reading_list(text) from public, anon;
grant execute on function public.create_reading_list(text) to authenticated;

/* ---------- Rename a list or change who sees it ---------- */

/**
 * update_reading_list: renames one of the caller's reading lists, or makes it public or private.
 *
 * Inputs: the list's ID; a new name (null to keep it); make_public (null to keep it).
 * Returns: { outcome: 'ok', name, is_public } or { outcome: 'not_found' } for a list that isn't
 *   the caller's.
 * Errors: insufficient_privilege when signed out, or with hint not_active when the list would be
 *   public and the account isn't active (suspended, or its email not confirmed): a public list's
 *   name is text others read, so it follows the account gate like every other public text;
 *   check_violation with hint name_length, name_html or name_taken.
 * Where it fits: the list's page (useReadingListActions.renameList and setListPublic).
 */
create function public.update_reading_list(list_id uuid, new_name text default null, make_public boolean default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.reading_lists;
  clean_name text;
  will_be_public boolean;
begin
  -- Step 1: signed in, and one change to this person's lists at a time.
  if caller_id is null then
    raise exception 'Log in to change a reading list.' using errcode = 'insufficient_privilege';
  end if;
  perform pg_advisory_xact_lock(hashtext('reading_lists:' || caller_id::text));
  select * into target from public.reading_lists
  where id = list_id and user_id = caller_id and deleted_at is null;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the name, when it changes: valid, and not another of the caller's lists' (a list may
  -- change its own capitals).
  clean_name := case when new_name is null then target.name else public.clean_reading_list_name(new_name) end;
  if exists (select 1 from public.reading_lists
             where user_id = caller_id and deleted_at is null and id <> target.id
               and lower(name) = lower(clean_name)) then
    raise exception 'You already have a list with that name.'
      using errcode = 'check_violation', hint = 'name_taken';
  end if;
  -- Step 3: a public list needs an active account.
  will_be_public := coalesce(make_public, target.is_public);
  if will_be_public and (make_public is true or new_name is not null) and not public.is_active_member() then
    raise exception 'Your account can''t make a list public right now.'
      using errcode = 'insufficient_privilege', hint = 'not_active';
  end if;
  -- Step 4: save.
  update public.reading_lists set name = clean_name, is_public = will_be_public where id = target.id;
  return jsonb_build_object('outcome', 'ok', 'name', clean_name, 'is_public', will_be_public);
end;
$$;

comment on function public.update_reading_list(uuid, text, boolean) is
  'Renames one of the caller''s reading lists or makes it public or private (GAPS-6).';

revoke all on function public.update_reading_list(uuid, text, boolean) from public, anon;
grant execute on function public.update_reading_list(uuid, text, boolean) to authenticated;

/* ---------- Delete a list ---------- */

/**
 * delete_reading_list: deletes one of the caller's reading lists. The stories themselves, and the
 * Library's shelves, are untouched.
 *
 * Inputs: the list's ID.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } for a list that isn't the caller's.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: "Delete list" on the list's page (useReadingListActions.deleteList); the screen
 *   asks first. A list an open moderation case or an authority's order holds is only marked
 *   deleted, so the moderators can still look at it (docs/retention.md); any other list goes at
 *   once, with what was in it.
 */
create function public.delete_reading_list(list_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to delete a reading list.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.reading_lists
                 where id = list_id and user_id = caller_id and deleted_at is null) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if public.content_is_held_for_moderation('reading_list', list_id) then
    update public.reading_lists set deleted_at = now(), is_public = false where id = list_id;
  else
    delete from public.reading_lists where id = list_id;
  end if;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_reading_list(uuid) is
  'Deletes one of the caller''s reading lists; one held by a moderation case is only marked deleted (GAPS-6).';

revoke all on function public.delete_reading_list(uuid) from public, anon;
grant execute on function public.delete_reading_list(uuid) to authenticated;

/* ---------- Put a story in a list, or take it out ---------- */

/**
 * set_story_in_reading_list: puts a story in one of the caller's reading lists, or takes it out.
 *
 * Inputs: the list's ID, the story's address and is_in (true to add, false to take out).
 * Returns: { outcome: 'ok', in_list } or { outcome: 'not_found' } for a list that isn't the
 *   caller's.
 * Errors: insufficient_privilege when signed out; no_data_found when adding a story the caller
 *   may not read or that has nothing published (the same rule as a Library shelf);
 *   check_violation with hint too_many_stories (the reading_list_stories_max setting).
 * Where it fits: "Add to a list" on the story page and "Remove" on the list's page
 *   (useReadingListActions.setStoryInList). Adding twice or taking out twice changes nothing.
 */
create function public.set_story_in_reading_list(list_id uuid, story_slug text, is_in boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  most_stories integer := coalesce(public.setting_value('reading_list_stories_max') #>> '{}', '200')::integer;
begin
  -- Step 1: signed in, and the caller's own list. The lock makes two presses at the same moment
  -- wait for each other, so the count below is true.
  if caller_id is null then
    raise exception 'Log in to keep reading lists.' using errcode = 'insufficient_privilege';
  end if;
  perform pg_advisory_xact_lock(hashtext('reading_lists:' || caller_id::text));
  if not exists (select 1 from public.reading_lists
                 where id = list_id and user_id = caller_id and deleted_at is null) then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: taking a story out works on any story in the list.
  if is_in is not true then
    delete from public.reading_list_stories as entries
    using public.stories
    where stories.id = entries.story_id and stories.slug = story_slug and entries.list_id = set_story_in_reading_list.list_id;
    update public.reading_lists set updated_at = now() where id = list_id;
    return jsonb_build_object('outcome', 'ok', 'in_list', false);
  end if;
  -- Step 3: a story the caller may read, with something published.
  select story.id into target_story_id from public.reader_visible_story(story_slug) as story;
  if target_story_id is null or not public.story_has_readable_chapter(target_story_id) then
    raise exception 'There is no such story.' using errcode = 'no_data_found';
  end if;
  -- Step 4: room in the list, unless the story is already in it.
  if not exists (select 1 from public.reading_list_stories as entries
                 where entries.list_id = set_story_in_reading_list.list_id and entries.story_id = target_story_id)
     and (select count(*) from public.reading_list_stories as entries
          where entries.list_id = set_story_in_reading_list.list_id) >= most_stories then
    raise exception 'A reading list holds at most % stories.', most_stories
      using errcode = 'check_violation', hint = 'too_many_stories';
  end if;
  -- Step 5: in, once; the list counts as changed, so it moves to the top of the Library's rows.
  insert into public.reading_list_stories (list_id, user_id, story_id)
  values (list_id, caller_id, target_story_id)
  on conflict on constraint reading_list_stories_once_per_list do nothing;
  update public.reading_lists set updated_at = now() where id = list_id;
  return jsonb_build_object('outcome', 'ok', 'in_list', true);
end;
$$;

comment on function public.set_story_in_reading_list(uuid, text, boolean) is
  'Puts a story in one of the caller''s reading lists or takes it out (GAPS-6).';

revoke all on function public.set_story_in_reading_list(uuid, text, boolean) from public, anon;
grant execute on function public.set_story_in_reading_list(uuid, text, boolean) to authenticated;

/* ---------- Reporting, moderation, Download my data and account deletion ---------- */

-- Unchanged except for the reading_list branch at the end.
CREATE OR REPLACE FUNCTION public.reportable_item_owner(item_type reportable_type, item_reference text)
 RETURNS TABLE(item_id uuid, owner_user_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
    -- A private message only for the two people in its chat, so its existence never leaks to
    -- anyone else (S1-E9-01). Deleted ones can't be reported.
    when 'message' then
      return query
        select messages.id, messages.user_id from public.messages
        join public.conversations on conversations.id = messages.conversation_id
        where is_row_id and messages.id = item_reference::uuid
          and messages.deleted_at is null
          and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id);
    -- A forum thread or post only while readers can see it: not deleted, in a live thread and
    -- forum, so a deleted one's existence never leaks (S1-E8-02).
    when 'forum_thread' then
      return query
        select forum_threads.id, forum_threads.user_id from public.forum_threads
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_threads.id = item_reference::uuid
          and forum_threads.deleted_at is null and forums.deleted_at is null;
    when 'forum_post' then
      return query
        select forum_posts.id, forum_posts.user_id from public.forum_posts
        join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_posts.id = item_reference::uuid
          and forum_posts.deleted_at is null and forum_threads.deleted_at is null
          and forums.deleted_at is null;
    -- A space only while the reporter may see that it exists, so a hidden under-16 space never
    -- leaks to an adult through the report form (S1-E8-06).
    when 'space' then
      return query
        select spaces.id, spaces.user_id from public.spaces
        where is_row_id and spaces.id = item_reference::uuid and public.space_card_visible(spaces);
    -- A note with a request to join only for the people who decide that space's requests, so a
    -- note never reaches anyone else through the report form (IDEA-20261102-9).
    when 'space_join_note' then
      return query
        select space_join_notes.id, space_join_notes.user_id from public.space_join_notes
        join public.spaces on spaces.id = space_join_notes.space_id
        where is_row_id and space_join_notes.id = item_reference::uuid
          and space_join_notes.deleted_at is null and spaces.deleted_at is null
          and public.space_may_act(spaces, 'members');
    -- A reading list only while the reporter may see it: someone else's public list, so a private
    -- list's existence never leaks through the report form (GAPS-6).
    when 'reading_list' then
      return query
        select reading_lists.id, reading_lists.user_id from public.reading_lists
        where is_row_id and reading_lists.id = item_reference::uuid
          and reading_lists.is_public and public.reading_list_is_visible(reading_lists);
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34; message S1-E9-01; forum_thread and forum_post S1-E8-02; space S1-E8-06; space_join_note IDEA-20261102-9, GAPS-6).';

-- Unchanged except for the reading_list branch at the end.
CREATE OR REPLACE FUNCTION public.reportable_item_summary(item_type reportable_type, item_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
    when 'message' then
      select format('Private message from @%s: %s', coalesce(profiles.handle, '…'),
          case when char_length(messages.body) > 80 then left(messages.body, 80) || '…' else messages.body end)
        into summary
      from public.messages
      left join public.profiles on profiles.id = messages.user_id
      where messages.id = item_id;
    when 'forum_thread' then
      select format('Forum thread "%s"', forum_threads.title) into summary
      from public.forum_threads where forum_threads.id = item_id;
    when 'forum_post' then
      select format('Post #%s in "%s": %s', forum_posts.post_number, forum_threads.title,
          case when char_length(forum_posts.body) > 80 then left(forum_posts.body, 80) || '…' else forum_posts.body end)
        into summary
      from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_posts.id = item_id;
    when 'space' then
      select format('Space "%s"', spaces.name) into summary from public.spaces where spaces.id = item_id;
    when 'space_join_note' then
      select format('Note asking to join "%s": %s', spaces.name,
          case when char_length(space_join_notes.note) > 80 then left(space_join_notes.note, 80) || '…' else space_join_notes.note end)
        into summary
      from public.space_join_notes join public.spaces on spaces.id = space_join_notes.space_id
      where space_join_notes.id = item_id;
    when 'reading_list' then
      select format('Reading list "%s"', reading_lists.name) into summary
      from public.reading_lists where reading_lists.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

comment on function public.reportable_item_summary(public.reportable_type, uuid) is
  'A few words saying what was reported, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05, GAPS-6).';

-- Unchanged except for the reading_list branch at the end.
CREATE OR REPLACE FUNCTION public.case_item_content(target cases)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then public.picture_item_content(target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
    -- A thread's title with its first post; a post's words, when it was written and edited, and
    -- its earlier versions (S1-E8-02 criterion 4).
    when 'forum_thread' then (select jsonb_build_object('title', forum_threads.title,
        'started_at', forum_threads.created_at,
        'text', (select first_post.body from public.forum_posts as first_post
                 where first_post.thread_id = forum_threads.id and first_post.post_number = 1))
        from public.forum_threads where forum_threads.id = target.item_id)
    when 'forum_post' then (select jsonb_build_object('text', forum_posts.body, 'number', forum_posts.post_number,
        'posted_at', forum_posts.created_at, 'edited_at', forum_posts.edited_at,
        'earlier_versions', (select coalesce(jsonb_agg(jsonb_build_object('text', revisions.body,
            'title', revisions.title, 'written_at', revisions.written_at) order by revisions.written_at), '[]'::jsonb)
          from public.forum_post_revisions as revisions where revisions.post_id = forum_posts.id))
        from public.forum_posts where forum_posts.id = target.item_id)
    -- A space's name, description and rules, as its page shows them (S1-E8-06).
    when 'space' then (select jsonb_build_object('name', spaces.name, 'description', spaces.description,
        'rules', spaces.rules, 'started_at', spaces.created_at)
        from public.spaces where spaces.id = target.item_id)
    -- A note with a request to join, with the space it was for (IDEA-20261102-9).
    when 'space_join_note' then (select jsonb_build_object('text', space_join_notes.note,
        'space', spaces.name, 'created_at', space_join_notes.created_at)
        from public.space_join_notes join public.spaces on spaces.id = space_join_notes.space_id
        where space_join_notes.id = target.item_id)
    -- A reading list's name, whether it is public and the titles in it (GAPS-6).
    when 'reading_list' then (select jsonb_build_object('name', reading_lists.name,
        'is_public', reading_lists.is_public, 'created_at', reading_lists.created_at,
        'stories', (select coalesce(jsonb_agg(stories.title order by entries.created_at), '[]'::jsonb)
          from public.reading_list_stories as entries
          join public.stories on stories.id = entries.story_id
          where entries.list_id = reading_lists.id))
        from public.reading_lists where reading_lists.id = target.item_id)
  end;
$$;

comment on function public.case_item_content(public.cases) is
  'Internal: the full content of a case''s item, for the evidence pack (S1-E10-10, GAPS-6).';

-- Unchanged except for the reading_list branch at the end.
CREATE OR REPLACE FUNCTION public.notification_item_json(case_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
      when 'embed' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapter_embeds join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id where chapter_embeds.id = cases.item_id)
      when 'atlas_item' then public.plan_item_address(cases.item_id)
      -- A chat's address differs for each of the two people, so a message links to Messages.
      when 'message' then '/messages'
      -- A thread's address, and a post's permalink (S1-E8-02).
      when 'forum_thread' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
        from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
        where forum_threads.id = cases.item_id)
      when 'forum_post' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
          || '?post=' || forum_posts.post_number
        from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id where forum_posts.id = cases.item_id)
      when 'space' then (select '/spaces/' || spaces.slug from public.spaces where spaces.id = cases.item_id)
      -- A reading list's own page (GAPS-6).
      when 'reading_list' then '/library/lists/' || cases.item_id
    end)
  from public.cases where cases.id = case_id;
$$;

comment on function public.notification_item_json(uuid) is
  'Internal: a decided case''s item type, reference and address for its notification (S1-E7-01, GAPS-6).';

-- Unchanged except for the two new tables, both in Download my data.
CREATE OR REPLACE FUNCTION public.data_export_tables()
 RETURNS TABLE(table_name text, is_included boolean, why_left_out text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
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
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
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
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6).';

-- Unchanged except for the two new tables: what is in the lists goes first, then the lists.
CREATE OR REPLACE FUNCTION public.account_deletion_rules()
 RETURNS TABLE(table_name text, action text, step integer, why text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
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
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
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
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6).';
