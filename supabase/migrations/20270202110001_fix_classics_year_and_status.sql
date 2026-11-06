-- Migration: classics are always Completed, and every story can show the year it was first
-- published (Robert, 6 Nov 2026, 10:58 and 11:00 UTC: "classics should be not showing as ongoing
-- because they are completed"; "in the labels from the writer, we should also have a year
-- published … for classics, they should be the year it was published").
--
-- What it changes:
--   stories.first_published_year   new: the year a work was first published anywhere. Filled for
--                                  classics only; a writer's own story shows the year of its first
--                                  chapter here instead (first_published_at), so it needs nothing
--   classic_works → stories        a trigger copies classic_works.first_published_year (what staff
--                                  type in the classics editor, S1-E11-16) onto the story, so the
--                                  editor stays the one place to change it; existing rows are copied
--   story_classic_author()         also returns first_published_year, for the story page
--   stories (classics account)     every classic not yet marked Completed becomes Completed: its
--                                  author is dead, so no chapter will ever follow. New classics were
--                                  already saved as completed (classic_upsert_story); the demo
--                                  classics were not, which is why staging showed "Ongoing"
--
-- Who reads it: get_story_page() through story_classic_author(), shown in "Labels from the
-- writer" (src/features/reading/components/StorySideColumn.tsx).
-- Personal data: none; a year of publication of a public-domain work.

/* ---------- 1. The year a work was first published ---------- */

alter table public.stories
  add column first_published_year integer
  constraint stories_first_published_year_range check (first_published_year between 1 and 2100);

comment on column public.stories.first_published_year is
  'The year the work was first published anywhere; set for classics from classic_works (copied by a trigger). Null for a writer''s own story, whose first chapter''s year is shown instead.';

-- Copy what staff already typed for each classic.
update public.stories
set first_published_year = works.first_published_year
from public.classic_works as works
where works.story_id = stories.id
  and works.first_published_year is not null
  and stories.first_published_year is distinct from works.first_published_year;

/**
 * copy_classic_first_published_year: keeps stories.first_published_year equal to what staff saved
 * for the classic in classic_works, so the classics editor stays the only place to change it.
 * Trigger function, after insert or update of first_published_year on classic_works.
 * Returns: the new row. Errors: none.
 * Where it fits: admin_save_classic_work() and the research-list import → this → the story page.
 */
create or replace function public.copy_classic_first_published_year()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stories
  set first_published_year = new.first_published_year
  where stories.id = new.story_id
    and stories.first_published_year is distinct from new.first_published_year;
  return new;
end;
$$;

comment on function public.copy_classic_first_published_year() is
  'Trigger: copies a classic''s first publication year from classic_works onto its story (6 Nov 2026).';
revoke execute on function public.copy_classic_first_published_year() from public, anon, authenticated;

create trigger classic_works_copy_first_published_year
  after insert or update of first_published_year on public.classic_works
  for each row execute function public.copy_classic_first_published_year();

/* ---------- 2. The story page reads it ---------- */

/**
 * story_classic_author: a classic's real author, its source edition and, since 6 Nov 2026, the
 * year it was first published, for the story page's author card and labels. Internal.
 * Input: target_story_id. Returns: {name, died_year, source_title, source_url, translator_name,
 *   first_published_year}, or null for a writer's own story. Errors: none.
 * Where it fits: get_story_page(), get_chapter() and story_card_json().
 */
create or replace function public.story_classic_author(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('name', classic_authors.name, 'died_year', classic_authors.died_year,
    'source_title', works.source_title, 'source_url', works.source_url,
    'translator_name', works.translator_name,
    'first_published_year', stories.first_published_year)
  from public.stories
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  left join public.classic_works as works on works.story_id = stories.id
  where stories.id = target_story_id;
$$;

comment on function public.story_classic_author(uuid) is
  'Internal: a classic''s real author {name, died_year, source, first_published_year}, or null (S1-E5-06; 6 Nov 2026).';
revoke execute on function public.story_classic_author(uuid) from public, anon, authenticated;

/* ---------- 3. Classics are always Completed ---------- */

-- Every story of the classics account: the work is finished, its author long dead. The account
-- is found by its handle in settings, as classics_account_id() does; that function raises when
-- the account doesn't exist yet (a fresh local database before the demo top-up), so it isn't
-- called here and the update simply finds nothing.
update public.stories
set completion_status = 'completed'
from public.profiles
where profiles.id = stories.user_id
  and profiles.handle = (public.setting_value('classics_account_handle') #>> '{}')
  and profiles.deleted_at is null
  and stories.completion_status <> 'completed';
