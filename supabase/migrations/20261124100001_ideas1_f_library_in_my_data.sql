/*
 * Bundle 8b IDEAS-1, part f: library shelves in Download my data (idea IDEA-20261031-12).
 *
 * What it adds:
 * - export_library_of(): the reader's shelves as a list they can read and keep: the shelf, the
 *   story's title, its writer's name, the story's address on the website and when it was put
 *   there. tables.library_entries already holds the raw rows (S1-E13-02), but only with story IDs.
 * - my_data_export() gains that list as "library". The browser adds the full links and a
 *   spreadsheet copy, library.csv (src/features/data-export/lib/libraryForExport.ts).
 * GDPR art. 15 and 20: the shelves are the reader's personal data. No new data is stored.
 * Who calls it: Settings › Download my data (src/features/data-export/).
 */

/**
 * export_library_of: the reader's library shelves for Download my data (IDEAS-1f).
 * Input: the reader's user ID.
 * Returns: a JSON list of {shelf, title, writer, path, added_at, moved_at}, shelf by shelf
 *   (Reading, Saved for later, Finished) and the oldest first; never a user ID. A story the
 *   reader may no longer open (deleted, hidden by moderators, or a writer either side blocks)
 *   keeps its title, as the reader saved it, but has no path.
 * Internal: my_data_export().
 */
create or replace function public.export_library_of(owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'shelf', library_entries.shelf,
      'title', stories.title,
      'writer', public.display_name(profiles.handle, profiles.pen_name),
      -- The address only while the story is there to read; the browser makes it a full link.
      'path', case when exists (select 1 from public.reader_visible_story(stories.slug))
                   then '/s/' || stories.slug end,
      'added_at', library_entries.created_at,
      'moved_at', library_entries.updated_at)
    order by library_entries.shelf, library_entries.created_at), '[]'::jsonb)
  from public.library_entries
  join public.stories on stories.id = library_entries.story_id
  join public.profiles on profiles.id = stories.user_id
  where library_entries.user_id = owner_id;
$$;
comment on function public.export_library_of(uuid) is
  'Internal: the reader''s library shelves with titles and addresses, for Download my data (IDEAS-1f).';
revoke execute on function public.export_library_of(uuid) from public, anon, authenticated;

/**
 * my_data_export: as in S1-E13-02, plus "library": the reader's shelves with titles and addresses
 * (IDEAS-1f; idea IDEA-20261031-12).
 * Returns: { format: 'data-export/1', made_at, user_id, account, library, tables }.
 * Errors: insufficient_privilege (hint signed_out) when signed out.
 * Where it fits: the first step of makeDataExport() in src/features/data-export/.
 */
create or replace function public.my_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  return jsonb_build_object(
    'format', 'data-export/1',
    'made_at', now(),
    'user_id', caller_id,
    'account', public.export_account_of(caller_id),
    'library', public.export_library_of(caller_id),
    'tables', public.export_tables_of(caller_id));
end;
$$;
