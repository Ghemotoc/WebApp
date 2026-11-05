-- QA-1a: the text checks refuse unsafe link addresses, not ordinary words (independent QA check,
-- 5 Nov 2026, finding A1; CLAUDE.md rule 8).
--
-- What it does:
-- - Adds has_unsafe_link(), one shared rule for every kind of user text: it looks only at the
--   addresses of Markdown links and pictures ("[words](address)", "![words](address)") and of
--   reference definitions ("[name]: address"), and is true when one of them starts with a
--   javascript:, data: or vbscript: address (or hides one behind an HTML character code).
-- - Redefines the four text checks (chapters, comments, Story world entries and forum posts) to use
--   it. Until now each one refused "javascript", "data" or "vbscript" followed by a colon anywhere
--   in the text, so ordinary Romanian and English sentences such as "Data: 12 martie" or
--   "Metadata: none" could not be saved.
-- - check_comment_text() falls back to 3,000 characters when the setting is missing, the length
--   decided on 19 Dec 2026 (migration 20261219100001); its old fallback and comment still said 2,000.
-- The screens already show only http, https and mailto links (src/lib/safe-links.ts), so this
-- check is the second line of defence; its messages and hints are unchanged, so no screen changes.
-- Who calls it: save_chapter_draft() and the other chapter writers (check_chapter_text), the
-- comment functions (check_comment_text), the Story world functions (check_bible_text) and the
-- forum functions (check_forum_post_text).

/* ---------- The shared link rule ---------- */

/**
 * has_unsafe_link: true when Markdown text links to a script or an inline data address.
 * Inputs: body, the text as it will be stored (already normalised).
 * Returns: true when any link, picture or reference address starts with javascript:, data: or
 *   vbscript:, ignoring case, spaces and control characters inside the address (browsers drop tabs
 *   and new lines from an address), or starts with an HTML character code ("&#106;avascript:"),
 *   which no honest address needs. False for null or empty text and for the words in a sentence.
 * Raises: nothing.
 * Where it fits: the four check_*_text() functions below call it before they store any text.
 *   Raw HTML (so "<javascript:...>" autolinks too) is refused separately by those functions.
 */
create or replace function public.has_unsafe_link(body text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  link_address text;
begin
  -- Step 1: nothing to look at.
  if body is null or body = '' then
    return false;
  end if;

  -- Step 2: walk every link address. The first pattern finds "](address" (links and pictures);
  -- the second finds reference definitions, a line that starts with "[name]:". An address may sit
  -- in angle brackets, so a leading "<" is skipped.
  for link_address in
    select matched[1]
    from regexp_matches(body, '\]\(\s*<?([^)>]*)', 'g') as matched
    union all
    select matched[1]
    from regexp_matches(body, '(?:^|\n)[ \t]*\[[^\]\n]*\]:[ \t]*<?([^\n>]*)', 'g') as matched
  loop
    -- Step 3: browsers ignore spaces and control characters inside an address, so take them out
    -- before reading the scheme ("java\tscript:" is still javascript:).
    link_address := lower(regexp_replace(link_address, '[\x01-\x20\x7f]', '', 'g'));

    -- Step 4: the refused schemes, and any address that starts with an HTML character code.
    if link_address ~ '^(javascript|data|vbscript):' or link_address like '&%' then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

comment on function public.has_unsafe_link(text) is
  'True when a Markdown link, picture or reference address is javascript:, data: or vbscript: (QA-1a, CLAUDE.md rule 8).';

-- Internal, like the check_*_text() functions: only the security definer functions that save text
-- call it, so nobody else may.
revoke all on function public.has_unsafe_link(text) from public, anon, authenticated;

/* ---------- Chapters ---------- */

/**
 * check_chapter_text: cleans and checks a chapter before it is stored.
 * Inputs: body, the chapter's Markdown.
 * Returns: the text with Romanian letters normalised (ş/ţ to ș/ț).
 * Raises: check_violation when the text is too long, holds raw HTML or links to an unsafe address.
 * Where it fits: every function that saves chapter text (S1-E3-02a).
 */
create or replace function public.check_chapter_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := public.normalise_romanian_letters(body);
  longest integer := coalesce((public.setting_value('chapter_max_characters'))::integer, 100000);
begin
  -- Step 1: the length limit (a setting; proposal 100,000 characters).
  if char_length(clean_body) > longest then
    raise exception 'A chapter can have at most % characters (S1-E3-02a).', longest using errcode = 'check_violation';
  end if;
  -- Step 2: no raw HTML. The Markdown subset never needs a tag, so any "<letter" or "</" is refused;
  -- a plain "<" between numbers ("3 < 4") is fine, and so is escaped text ("\<script\>" is the
  -- literal words): the backslash pairs are taken out before looking, so "\\<script>" (an escaped
  -- backslash and then a real tag) is still caught.
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a chapter (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: link addresses may not be javascript:, data: or vbscript: (has_unsafe_link()); the
  -- same words in a sentence ("Data: 12 martie") are fine.
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$$;

/* ---------- Comments ---------- */

/**
 * check_comment_text: cleans and checks a comment before it is stored.
 * Inputs: body, the comment's Markdown.
 * Returns: the text trimmed, with Romanian letters normalised.
 * Raises: check_violation when the text is empty, too long, holds raw HTML or links to an unsafe
 *   address.
 * Where it fits: the comment functions (S1-E6-01).
 */
create or replace function public.check_comment_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
  -- 3,000 characters when the setting is missing (comment_max_characters, raised from 2,000 in
  -- migration 20261219100001).
  longest integer := coalesce((public.setting_value('comment_max_characters'))::integer, 3000);
begin
  -- Step 1: something to say, and not too much.
  if clean_body = '' then
    raise exception 'Write something first.' using errcode = 'check_violation';
  end if;
  if char_length(clean_body) > longest then
    raise exception 'A comment can have at most % characters.', longest using errcode = 'check_violation';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words (as check_chapter_text()).
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a comment (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$$;

/* ---------- Story world entries ---------- */

/**
 * check_bible_text: cleans and checks a Story world entry before it is stored.
 * Inputs: body, the entry's Markdown (may be empty).
 * Returns: the text trimmed, with Romanian letters normalised.
 * Raises: check_violation with hint too_long, html or script_link.
 * Where it fits: the Story world functions (S1-E17-17).
 */
create or replace function public.check_bible_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
begin
  -- Step 1: the length limit.
  if char_length(clean_body) > 100000 then
    raise exception 'An entry holds at most 100,000 characters.' using errcode = 'check_violation', hint = 'too_long';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words, as for chapters and comments.
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in an entry (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'html';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).'
      using errcode = 'check_violation', hint = 'script_link';
  end if;
  return clean_body;
end;
$$;

/* ---------- Forum posts ---------- */

/**
 * check_forum_post_text: cleans and checks a forum post before it is stored.
 * Inputs: body, the post's Markdown.
 * Returns: the text trimmed, with Romanian letters normalised.
 * Raises: check_violation with hint body:empty, body:too_long, body:html or body:link.
 * Where it fits: the forum thread and post functions (FORUMS-1b).
 */
create or replace function public.check_forum_post_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
  longest integer := coalesce((public.setting_value('forum_post_max_characters'))::integer, 15000);
begin
  -- Step 1: something to say, and not too much.
  if clean_body = '' then
    raise exception 'Write something first.' using errcode = 'check_violation', hint = 'body:empty';
  end if;
  if char_length(clean_body) > longest then
    raise exception 'A post can have at most % characters.', longest using errcode = 'check_violation', hint = 'body:too_long';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words (as check_comment_text()).
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a post (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:html';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:link';
  end if;
  return clean_body;
end;
$$;
