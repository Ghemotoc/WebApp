-- QA-5: one shared HTML tag rule for every kind of member text (independent QA check, 5 Nov 2026,
-- finding R3; CLAUDE.md rule 8).
--
-- What it does:
-- - Adds has_html_tag(), the rule the four text checks each carried a copy of: any "<letter",
--   "</", "<!" or "<?" is a tag, a plain "<" between numbers ("3 < 4") is not, and escaped text
--   ("\<script\>") is the literal words. It sits beside has_unsafe_link() (QA-1a), so the two
--   safety rules for member text each live in one place.
-- - Redefines check_chapter_text(), check_comment_text(), check_bible_text() and
--   check_forum_post_text() to call it. Each was copied from its live text (supabase/schema.sql)
--   and only its HTML step changed, so their limits, messages and hints are exactly as before and
--   no screen changes.
-- Decided by the CTO (5 Nov 2026, QA-5): the report proposed one check_user_text(kind, body), but
-- the four checks differ in their limits, messages and hints, which the screens read; two shared
-- rules called by four small checks keep those differences visible and the safety rules single.
-- check_space_text() keeps its own stricter rule (it refuses a tag even when escaped, because space
-- names and rules are plain text, not Markdown).
-- Who calls it: the four check_*_text() functions, which the save functions call before storing.

/* ---------- The shared tag rule ---------- */

/**
 * has_html_tag: true when Markdown text holds a raw HTML tag.
 * Inputs: body, the text as it will be stored (already normalised).
 * Returns: true when the text, with every backslash pair taken out first, has a "<" followed by a
 *   letter, "/", "!" or "?". Taking the pairs out first means "\<b\>" (escaped, the literal words)
 *   passes, while "\\<script>" (an escaped backslash and then a real tag) is still caught. False
 *   for null or empty text and for a "<" between numbers.
 * Raises: nothing.
 * Where it fits: the four check_*_text() functions below call it before they store any text; the
 *   Markdown subset never needs a tag (CLAUDE.md rule 8, ADR 0005).
 */
create or replace function public.has_html_tag(body text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(regexp_replace(body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]', false);
$$;

comment on function public.has_html_tag(text) is
  'True when Markdown text holds a raw HTML tag; escaped text and "3 < 4" are fine (QA-5, CLAUDE.md rule 8).';

-- Internal, like has_unsafe_link(): only the functions that save text call it.
revoke all on function public.has_html_tag(text) from public, anon, authenticated;

/* ---------- Chapters ---------- */

-- check_chapter_text(): unchanged except Step 2, which now calls has_html_tag().
create or replace function public.check_chapter_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $function$
declare
  clean_body text := public.normalise_romanian_letters(body);
  longest integer := coalesce((public.setting_value('chapter_max_characters'))::integer, 100000);
begin
  -- Step 1: the length limit (a setting; proposal 100,000 characters).
  if char_length(clean_body) > longest then
    raise exception 'A chapter can have at most % characters (S1-E3-02a).', longest using errcode = 'check_violation';
  end if;
  -- Step 2: no raw HTML (has_html_tag(): a "<" between numbers and escaped text are fine).
  if public.has_html_tag(clean_body) then
    raise exception 'HTML tags are not allowed in a chapter (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: link addresses may not be javascript:, data: or vbscript: (has_unsafe_link()); the
  -- same words in a sentence ("Data: 12 martie") are fine.
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$function$;

/* ---------- Comments ---------- */

-- check_comment_text(): unchanged except Step 2, which now calls has_html_tag().
create or replace function public.check_comment_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $function$
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
  if public.has_html_tag(clean_body) then
    raise exception 'HTML tags are not allowed in a comment (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$function$;

/* ---------- Story world entries ---------- */

-- check_bible_text(): unchanged except Step 2, which now calls has_html_tag().
create or replace function public.check_bible_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $function$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
begin
  -- Step 1: the length limit.
  if char_length(clean_body) > 100000 then
    raise exception 'An entry holds at most 100,000 characters.' using errcode = 'check_violation', hint = 'too_long';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words, as for chapters and comments.
  if public.has_html_tag(clean_body) then
    raise exception 'HTML tags are not allowed in an entry (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'html';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).'
      using errcode = 'check_violation', hint = 'script_link';
  end if;
  return clean_body;
end;
$function$;

/* ---------- Forum posts ---------- */

-- check_forum_post_text(): unchanged except Step 2, which now calls has_html_tag().
create or replace function public.check_forum_post_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $function$
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
  if public.has_html_tag(clean_body) then
    raise exception 'HTML tags are not allowed in a post (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:html';
  end if;
  -- Step 3: no unsafe link addresses (has_unsafe_link()).
  if public.has_unsafe_link(clean_body) then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:link';
  end if;
  return clean_body;
end;
$function$;
