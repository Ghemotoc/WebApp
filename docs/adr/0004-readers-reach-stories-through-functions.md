# ADR 0004: Readers reach stories and chapters only through database functions

- **Date:** 23 October 2026
- **Status:** Accepted (Robert, chat, Q2 of the Lane A plan)

## Decision

The `stories`, `story_tags` and (S1-E3-02a) `chapters` tables have row-level security policies for **the owner only**: a writer reads their own rows, and every write goes through a function (`create_story()`, later `update_my_story()`, `save_chapter_draft()`, `publish_chapter()` and so on). Readers, signed in or out, never select from these tables. They read through `security definer` functions, `get_story_page()` (S1-E3-05) and `get_chapter()` (S1-E4-01a), which apply every rule in one place:

- the story is published (`first_published_at` set by `publish_chapter()`) and not deleted;
- the reader's age allows the rating, through `rating_allows(story_rating, age_band())` (S1-E3-06);
- the item is not hidden or removed by a moderator, through `is_moderated_away(type, id)` (the shared contract with Lane C, S1-E10-01; a stub answering false until then);
- the reader is not blocked by the writer, through `blocks_hide_content()` (a stub until S1-E5-05);

and they return the pen name or username, never the user ID.

## Why

- **The user ID is never shown publicly** (architecture 1.6; CLAUDE.md rule 15). A public select policy on `stories` would let anyone read `user_id` through the Data API. Column-level grants could hide it, but `supabase/tests/database/003-table-grants-match-policies.test.sql` checks table-level grants and column grants are easy to get wrong in a later migration.
- **One place for the rating rule.** CLAUDE.md rule 18 says ratings are "enforced in RLS through `age_band()`". The rule lives in the database and reads `age_band()`, as asked; it sits in `rating_allows()`, called by both reader functions, rather than in a policy, because no reader query can reach the tables without going through those functions. Discover's lists (S1-E5-01) reuse `rating_allows()` in their own function or view.
- **Writes can't change what they shouldn't.** Without an update policy a writer can't change their story's owner, address or publish date through the API; the functions change only what each story allows.

## Consequences

- Every reader-facing story or chapter query is a function with its own pgTAP tests for every persona age group and for signed-out visitors.
- A new reader surface (search, shelves, the teaser) adds a function or a view built on the same helpers; it never adds a public policy on these tables.
- Staff reads of stories go through `admin_*` functions (S1-E11-07), not through policies on these tables.
