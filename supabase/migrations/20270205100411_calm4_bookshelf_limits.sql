/*
 * CALM-4: bookshelf limits (the simplified design; Robert, 20 Nov 2026, 08:47 to 10:16 UTC;
 * handover "Build: handover for the simplified design", Step 2, Bookshelves).
 *
 * Reading lists are called bookshelves in the interface now ("bookshelf", "bookshelves";
 * Romanian "raft", "rafturi"); the tables keep their names (reading_lists,
 * reading_list_stories). A free member keeps 3 bookshelves of 10 books each, down from the
 * builder's proposal of 30 lists of 200 stories (GAPS-6). A small, visible number is the point:
 * a bookshelf shows its empty places, so 10 reads as a shelf someone fills, not a database.
 * A member who already has more keeps every bookshelf and every book: create_reading_list() and
 * add_to_reading_list() only refuse a new one while they are at or over the limit, and the sheet
 * says so in words.
 * Both settings are public now, because the Library and the Add to a bookshelf sheet write the
 * limits in words ("2 of 3 bookshelves", "7 of 10 books"); they say nothing about anyone.
 * Who reads it: create_reading_list() and add_to_reading_list() through setting_value(), and the
 * Library and the sheet through usePublicSettings().
 */

update public.settings
set value = '3'::jsonb,
    is_public = true,
    description = 'The most bookshelves (reading lists) one member keeps on the free plan (CALM-4; Robert, 20 Nov 2026).'
where key = 'reading_lists_max';

update public.settings
set value = '10'::jsonb,
    is_public = true,
    description = 'The most books one bookshelf (reading list) holds on the free plan (CALM-4; Robert, 20 Nov 2026).'
where key = 'reading_list_stories_max';

/*
 * reading_list_json(): a bookshelf now draws every book it holds, up to the limit, beside its
 * empty places, so the covers list grows from the three latest to as many as one bookshelf holds
 * (reading_list_stories_max, 10 today). A member over the limit still keeps every book; the
 * bookshelf draws the latest ones and its count says how many there are. Everything else is as
 * GAPS-6 built it.
 * Inputs: the reading list row. Returns: the list as jsonb (id, name, is_public, is_own, owner,
 * story_count, covers). Who calls it: my_reading_lists(), reading_list_page() and the sheet's
 * story_reading_lists().
 */
create or replace function public.reading_list_json(target public.reading_lists)
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
  ),
  shelf_size as (
    -- How many places one bookshelf has (CALM-4); 10 when the setting is missing.
    select coalesce(public.setting_value('reading_list_stories_max') #>> '{}', '10')::integer as places
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
               from (select listed.id, listed.added_at from listed
                     order by listed.added_at desc
                     limit (select places from shelf_size)) as latest));
$$;

comment on function public.reading_list_json(public.reading_lists) is
  'Internal: a bookshelf (reading list) with its owner, its count and its latest covers up to the places one bookshelf has, as this caller may see them (GAPS-6; CALM-4).';

/*
 * story_reading_lists(): each bookshelf in the Add to a bookshelf sheet now also says how many
 * books it holds ('book_count'), so a row can read "7 of 10" or "10 of 10 · Full" (CALM-4). It
 * counts every entry, as set_story_in_reading_list() does when it refuses a full bookshelf.
 * Inputs: the story's slug. Returns: the caller's bookshelves as a jsonb array (id, name,
 * is_public, has_story, book_count). Who calls it: the sheet (AddToReadingList).
 */
create or replace function public.story_reading_lists(story_slug text)
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
        where entries.list_id = reading_lists.id and stories.slug = story_slug),
      'book_count', (select count(*) from public.reading_list_stories as entries
                     where entries.list_id = reading_lists.id))
    order by lower(reading_lists.name), reading_lists.id), '[]'::jsonb)
  from public.reading_lists
  where reading_lists.user_id = (select auth.uid()) and reading_lists.deleted_at is null;
$$;

comment on function public.story_reading_lists(text) is
  'The caller''s bookshelves (reading lists) with whether a story is on each and how many books each holds, for "Add to a bookshelf" on the story page (GAPS-6; CALM-4).';
