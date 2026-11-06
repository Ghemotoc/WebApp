-- Migration: Discover's "pick up where you left off" cards and its five shelves (story S1-E5-12,
-- bundle LOOK-4b; Robert, 6 Nov 2026, D5: "5" shelves, not 10).
--
-- What it adds:
--   discover_shelves        becomes the board's five: following, popular, rising, classics,
--                           writers. Category shelves move to the category chips above them.
--                           Staff can change it back without a release (Q46).
--   my_discover_cards()     for a signed-in member: their latest unfinished story (only one they
--                           can still read, with "chapter n of N", how far in, and whether a new
--                           chapter came out since they last read), their latest saved draft
--                           chapter, and whether they may write (for the gold "Start a new story"
--                           card).
--
-- Who calls it: Discover (src/features/discovery/components/DiscoverCards.tsx).
-- Rules it follows: no reading history leaves the reader's own account (it reads only
-- auth.uid()'s rows); stories the reader may no longer read are left out (rule 18, blocks,
-- moderation, through listed_stories() and chapter_is_readable()).

/* ---------- 1. The five shelves ---------- */

update public.settings
set value = '["following", "popular", "rising", "classics", "writers"]'::jsonb,
    description = 'Discover''s shelves, top to bottom (S1-E5-03, Q46; five since LOOK-4b, Robert 6 Nov 2026, D5). Words: following, picked, popular, rising, shared, new, completed, updated, classics, writers, categories.',
    updated_at = now()
where key = 'discover_shelves';

/* ---------- 2. The cards ---------- */

/**
 * my_discover_cards: what Discover's three cards need for the signed-in member.
 * Returns: JSON {
 *   continue_reading: {story: story_card_json(), place: {chapter_code, number, total, percent,
 *     saved_at, next_code}, new_chapter_number: the number of a chapter that came out after the
 *     reader last read, or null} or null;
 *   draft: {story_slug, story_title, chapter_code, title, number, word_count, saved_at} or null;
 *   may_write: true when the member may publish (is_active_member())
 * }.
 * Errors: insufficient_privilege when signed out.
 * Where it fits: src/features/discovery/api/discoverCards.ts.
 */
create or replace function public.my_discover_cards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  continuing jsonb;
  draft jsonb;
begin
  if caller_id is null then
    raise exception 'Log in to see your cards.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the unfinished story read most recently, among those the reader may still read.
  select jsonb_build_object(
      'story', public.story_card_json(found.id),
      'place', found.place,
      -- "Chapter n is out": the next readable chapter came out after the reader last read.
      'new_chapter_number', case
        when exists (select 1 from public.chapters as later
                     where later.code = found.place ->> 'next_code'
                       and later.first_published_at > (found.place ->> 'saved_at')::timestamptz)
        then (found.place ->> 'number')::integer + 1
      end)
  into continuing
  from (
    select listed.id, public.latest_place_json(listed.id) as place
    from public.listed_stories('library', 'reading', null, null, null) as listed
  ) as found
  where found.place is not null
    -- A story read to the end of its last chapter is finished, not unfinished (95%, the same
    -- line the Library uses for a finished chapter: src/features/library/lib/places.ts).
    and not ((found.place ->> 'percent')::numeric >= 95 and found.place ->> 'next_code' is null)
  order by found.place ->> 'saved_at' desc
  limit 1;
  -- Step 2: the draft chapter saved most recently, in a story the member still has.
  select jsonb_build_object(
      'story_slug', stories.slug,
      'story_title', stories.title,
      'chapter_code', chapters.code,
      'title', chapters.draft_title,
      'number', (select count(*) from public.chapters as earlier
                 where earlier.story_id = chapters.story_id and earlier.deleted_at is null
                   and earlier.position <= chapters.position),
      'word_count', chapters.word_count,
      'saved_at', chapters.updated_at)
  into draft
  from public.chapters
  join public.stories on stories.id = chapters.story_id and stories.deleted_at is null
  where chapters.user_id = caller_id and chapters.status = 'draft' and chapters.deleted_at is null
  order by chapters.updated_at desc
  limit 1;
  -- Step 3: the three answers together.
  return jsonb_build_object('continue_reading', continuing, 'draft', draft,
    'may_write', public.is_active_member());
end;
$$;

comment on function public.my_discover_cards() is
  'Discover''s cards for the caller: the latest unfinished story, the latest draft chapter and whether they may write (S1-E5-12).';
revoke execute on function public.my_discover_cards() from public, anon;
grant execute on function public.my_discover_cards() to authenticated;
