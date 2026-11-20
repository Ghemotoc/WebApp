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
