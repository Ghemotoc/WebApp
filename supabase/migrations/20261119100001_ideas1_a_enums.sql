/*
 * Migration: the enum value the reading comfort part needs (bundle IDEAS-1, part a; idea
 * IDEA-20261031-6, Robert's pick of 31 Oct 2026).
 *
 * What it adds: reading_font 'atkinson_hyperlegible', the Braille Institute's font made so
 * letters that look alike (I, l and 1; O and 0) are easy to tell apart. It sits in its own file
 * because Postgres can't use a new enum value in the transaction that adds it.
 * Who uses it: the next migration (save_reading_settings()) and the reader's settings panel.
 */
alter type public.reading_font add value if not exists 'atkinson_hyperlegible';

comment on type public.reading_font is
  'The reader''s font: the app''s sans (Inter), a serif, a dyslexia-friendly one or Atkinson Hyperlegible (S1-E4-02; IDEA-20261031-6).';
