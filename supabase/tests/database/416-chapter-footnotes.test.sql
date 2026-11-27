-- Database tests for footnotes in a chapter (BOOKS-D05b; boards D13-EditorFootnotes and
-- B15-ReaderFootnotes). A footnote is stored in the text as `[The note.](footnote:)`.
-- What it proves:
-- - count_words() leaves a footnote's words out ("notes not counted", board D13), with escaped
--   characters inside the note, and still counts the words around it;
-- - the chapter text check accepts a footnote (it is not an unsafe link) and keeps it as written;
-- - a "footnote:" address is not taken for an unsafe link, while a javascript: one still is.
-- No table or policy changes, so there is no allowed and denied pair here.
begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select is(
  public.count_words('In March the lift was painted green again[The lifts are painted every spring.](footnote:), the colour of the folder.'),
  13,
  'a footnote''s words are not counted as the chapter''s'
);

select is(
  public.count_words('One two[A note with \[brackets\] and \*stars\*.](footnote:) three.'),
  3,
  'a footnote with escaped characters inside is left out whole'
);

select is(
  public.count_words('First[One.](footnote:) and second[Two more words.](footnote:) end.'),
  4,
  'every footnote in a paragraph is left out'
);

select is(
  public.count_words('A [real link](https://example.org) stays counted.'),
  8,
  'an ordinary link''s words (and its address, as before) are still counted'
);

select is(
  public.check_chapter_text('Text[The note.](footnote:) here.'),
  'Text[The note.](footnote:) here.',
  'the chapter text check accepts a footnote and keeps it as written'
);

select ok(
  not public.has_unsafe_link('Text[The note.](footnote:) here.'),
  'a footnote address is not an unsafe link'
);

select ok(
  public.has_unsafe_link('Text[The note.](javascript:alert(1)) here.'),
  'a javascript: address in the same place is still refused'
);

select * from finish();
rollback;
