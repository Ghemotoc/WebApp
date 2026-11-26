/*
 * Migration: footnotes are not counted as a chapter's words (BOOKS-D05b, user story 5.5; boards
 * D13-EditorFootnotes and B15-ReaderFootnotes, approved by Robert "as drawn").
 *
 * How a footnote is stored: the chapter text keeps it where its number sits, as an inline link
 * with the address "footnote:" and the note as the link's words, `[The note.](footnote:)`
 * (src/lib/chapter-footnotes.ts; src/features/writing/lib/chapterMarkdown.ts writes it). No new
 * table or column: the note travels with the text through saves, revisions, translations, the
 * teaser and every export, and has_unsafe_link() already accepts the address (it is not
 * javascript:, data: or vbscript:).
 * Why this migration: board D13 says "262 words · notes not counted". count_words() counted a
 * note's words as the chapter's, so the minutes to read, the ranks and the writing days would
 * have grown with every note.
 * What it changes: count_words(), as in 20261103110002_s1_e3_10_music_and_video.sql, now also
 * drops every footnote before counting. Saved chapters keep their stored counts until their next
 * save (no chapter held a footnote before this migration).
 * Who calls it: save_chapter_draft(), publish and the staff passage functions (unchanged).
 * Tests: supabase/tests/database/416-chapter-footnotes.test.sql.
 */

/**
 * count_words: the words in a chapter body, Markdown marks ignored. A chapter picture or a music
 * or video card counts nothing (S1-E3-09, S1-E3-10), and neither does a footnote: its words are
 * the writer's aside, not the chapter's (BOOKS-D05b, board D13 "notes not counted").
 * Input: body (the Markdown). Returns: the number of runs of letters, digits or apostrophes.
 * Errors: none. Where it fits: every function that stores word_count or published_word_count.
 */
create or replace function public.count_words(body text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(
    array_remove(regexp_split_to_array(regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(body, ''),
          '!\[((?:[^]\\]|\\.)*)\]\((picture|embed):[0-9a-f-]{36}\)', ' ', 'g'),
        -- A footnote: "[" then its words (any escaped character allowed) then "](footnote:)".
        '\[((?:[^]\\]|\\.)*)\]\(footnote:\)', ' ', 'g'),
      '[^[:alnum:]'']+', ' ', 'g'), '\s+'), ''),
    1), 0);
$$;

comment on function public.count_words(text) is
  'Words in a chapter body, Markdown marks, pictures, cards and footnotes ignored (S1-E3-02a, BOOKS-D05b).';
