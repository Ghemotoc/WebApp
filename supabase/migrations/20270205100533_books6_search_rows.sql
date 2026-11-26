-- books6_search_rows: the search results as board E34 draws them (user stories bundle 6, story
-- 6.15: "each result links to where it is", "Chapter 14: The register" with only the sentence
-- around the match under it).
--
-- What it changes:
-- - search_story() hands back each chapter's number ("number"), so the screen can write
--   "Chapter 14: The register" in the reader's language;
-- - the snippet leaves out the item's own title when the match is also in the rest of its text,
--   so a row no longer repeats its title under itself ("Mrs Dobre Mrs Dobre keeps …").
-- Who calls it: src/features/atlas/api/search.ts (AtlasSearchPage). No table changes.

/**
 * search_snippet_source: the text a result's snippet is cut from (story 6.15).
 * Inputs: haystack, the item's searchable text, which starts with its title
 *   (story_search_texts()); title; wanted, the trimmed query.
 * Returns: the haystack without its leading title when the query is also found after it; the
 *   whole haystack otherwise (a match in the title alone still shows the title).
 * Internal: search_story().
 */
create or replace function public.search_snippet_source(haystack text, title text, wanted text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(title, '') <> ''
      and left(public.atlas_fold(haystack), char_length(title)) = public.atlas_fold(title)
      and strpos(public.atlas_fold(regexp_replace(substr(haystack, char_length(title) + 1), '\s+', ' ', 'g')),
                 public.atlas_fold(wanted)) > 0
      then btrim(substr(haystack, char_length(title) + 1))
    else haystack
  end;
$$;

comment on function public.search_snippet_source(text, text, text) is
  'Internal: a search result''s text without its own title when the match is also elsewhere (story 6.15).';
revoke execute on function public.search_snippet_source(text, text, text) from public, anon, authenticated;

/**
 * search_story: one search across the open story (S1-E17-30; story 6.15).
 * Inputs: story_slug; query, what the writer typed (at least 2 letters once trimmed; anything
 *   past 200 characters is ignored). Matching ignores capitals and common accents.
 * Returns: { outcome: 'ok', results: [{ kind, ref, title, chapter, number, snippet }] }, grouped
 *   by kind in the order characters, entries, chapters, scenes, ideas, events, marketing, then by
 *   title; at most 20 per kind; an empty list for a query under 2 letters. "number" is a
 *   chapter's place in the story (null for every other kind); the snippet is cut from the text
 *   after the item's title when the match is there too. { outcome: 'not_found' } when the story
 *   isn't the caller's. Never a user ID (rule 15).
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/search.ts.
 */
create or replace function public.search_story(story_slug text, query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  -- One space between words, as atlas_snippet() reads the text.
  wanted text := left(btrim(regexp_replace(coalesce(query, ''), '\s+', ' ', 'g')), 200);
begin
  -- Step 1: a signed-in writer and their own story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to search your story.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: one letter would match nearly everything; the screen asks for two.
  if char_length(wanted) < 2 then
    return jsonb_build_object('outcome', 'ok', 'results', '[]'::jsonb);
  end if;
  -- Step 3: every match, grouped by kind, with a chapter's number and a snippet that doesn't
  -- repeat the title.
  return jsonb_build_object('outcome', 'ok', 'results', coalesce((
    select jsonb_agg(jsonb_build_object('kind', ranked.kind, 'ref', ranked.ref,
        'title', ranked.title, 'chapter', ranked.chapter,
        'number', case when ranked.kind = 'chapter' then (
          select chapters.position from public.chapters
          where chapters.code = ranked.ref and chapters.story_id = target_story_id) end,
        'snippet', public.atlas_snippet(
          public.search_snippet_source(ranked.haystack, ranked.title, wanted), wanted))
      order by array_position(array['character', 'entry', 'chapter', 'scene', 'idea', 'event',
        'marketing'], ranked.kind), ranked.place)
    from (
      select texts.*, row_number() over (partition by texts.kind
        order by public.atlas_fold(texts.title), texts.ref) as place
      from public.story_search_texts(target_story_id) as texts
      where strpos(public.atlas_fold(regexp_replace(texts.haystack, '\s+', ' ', 'g')),
        public.atlas_fold(wanted)) > 0
    ) as ranked
    where ranked.place <= 20
  ), '[]'::jsonb));
end;
$$;

comment on function public.search_story(text, text) is
  'One search across the caller''s story: characters, bible, chapters, scenes, ideas, events, marketing, with a chapter''s number (S1-E17-30; story 6.15).';
revoke execute on function public.search_story(text, text) from public, anon;
grant execute on function public.search_story(text, text) to authenticated;
