/*
 * TRIAL-WALL: signed-out visitors see the home page and Read as a preview, then sign in
 * (Robert, 23 Nov 2026, 10:47 to 10:51 UTC: "If I'm not logged in, I should only be able to see
 * the main page where it says get in"; then "we can have read ... similar to how Facebook or
 * Reddit have it. You can see a preview, but then you have to sign in or sign up").
 *
 * What it does:
 * 1. Adds one public feature flag, members_only, off (staff switch it on in Staff › Settings, so
 *    local test data and every end-to-end test keep today's open site). While it is on, the app sends a signed-out
 *    visitor who opens any page but the home page (with "Get in"), Read (Discover, a story's page
 *    and its chapters), signing in and up, the Legal centre, Contact us, the public report form
 *    and the email-link pages back to the home page (src/features/trial/components/
 *    SignedOutGate.tsx). It is a front door, not a lock:
 *    no policy changes, so the database's rules stay as they are.
 * 2. Shortens the preview a signed-out visitor reads from 600 words (23 Oct 2026) to 40, a few
 *    lines (Robert, 23 Nov 2026, 11:02 UTC: "150 is too many. I would rather have 40"). The
 *    setting changes only while it still holds the old default, so a length staff chose in
 *    Staff › Settings stays.
 * 3. teaser_of() never hands over a whole chapter: the preview stops at half the chapter's words
 *    when that comes first, so a short chapter ends at "Sign in to keep reading" too.
 * Privacy: no new column, no new table, no personal data.
 * Who calls it: get_public_flags() through src/features/flags/ (useFeatureFlags); get_chapter()
 *   calls teaser_of() for signed-out visitors.
 * Tests: supabase/tests/database/397-members-only-flag.test.sql and 142-teaser.test.sql.
 */

-- Step 1: the members-only switch, off until staff switch it on for the trial.
insert into public.feature_flags (key, is_enabled, is_public, description)
values
  ('members_only', false, true,
   'While on, signed-out visitors see only the home page with Get in, Read as a preview (Discover, story pages, the first part of a chapter) and the sign-in, legal, contact and report pages; every other page sends them home (TRIAL-WALL).')
on conflict (key) do nothing;

-- Step 2: a shorter preview, unless staff already chose a length of their own.
update public.settings
set value = '40'::jsonb
where key = 'teaser_length' and value = '600'::jsonb;

/**
 * teaser_of: the first whole paragraphs of a chapter for a signed-out visitor (S1-E4-04).
 * Inputs: chapter_body (the published Markdown), word_limit (the teaser_length setting).
 * Returns: whole paragraphs while they fit within the limit, or within half the chapter's words
 *   when that is smaller (TRIAL-WALL: the preview never is the whole chapter); a first paragraph
 *   longer than that is cut and ends with "…". An empty chapter gives ''.
 * Errors: none.
 * Where it fits: get_chapter() for signed-out visitors. Cutting here, on the server, means the
 *   rest of the text never reaches their browser (S1-E4-04).
 */
create or replace function public.teaser_of(chapter_body text, word_limit integer)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  paragraphs text[] := regexp_split_to_array(btrim(coalesce(chapter_body, ''), E' \t\n\r'), E'\n[ \t]*\n');
  paragraph text;
  paragraph_words integer;
  words_so_far integer := 0;
  kept text[] := '{}';
  first_words text[];
  -- TRIAL-WALL: the smaller of the setting and half the chapter, at least one word.
  allowed_words integer := greatest(1, least(word_limit, public.word_total(coalesce(chapter_body, '')) / 2));
begin
  foreach paragraph in array paragraphs loop
    paragraph_words := public.word_total(paragraph);
    -- Step 1: skip empty blocks (several blank lines in a row).
    if paragraph_words = 0 then
      continue;
    end if;
    -- Step 2: keep the whole paragraph while it still fits.
    if words_so_far + paragraph_words <= allowed_words then
      kept := kept || btrim(paragraph, E' \t\n\r');
      words_so_far := words_so_far + paragraph_words;
      continue;
    end if;
    -- Step 3: the first paragraph alone is too long: cut it at the limit and mark the cut.
    if words_so_far = 0 then
      first_words := regexp_split_to_array(btrim(paragraph, E' \t\n\r'), E'\\s+');
      kept := kept || (array_to_string(first_words[1:allowed_words], ' ') || '…');
    end if;
    -- Step 4: stop at the first paragraph that doesn't fit.
    exit;
  end loop;
  return array_to_string(kept, E'\n\n');
end;
$$;

comment on function public.teaser_of(text, integer) is
  'The first whole paragraphs of a chapter up to a word limit or half the chapter, for signed-out visitors (S1-E4-04, TRIAL-WALL).';
revoke execute on function public.teaser_of(text, integer) from public, anon, authenticated;
