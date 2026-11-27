-- Migration: Plays, the fourth form (bundle FORMS-1).
--
-- What it adds: the 'plays' row in public.categories, placed last, after fiction, poetry and
-- nonfiction_essays. The app shows the four as Fiction, Poems, Non-fiction and Plays; labels are
-- interface text in src/locales/*/writing.json, never stored here.
-- Why: Robert, 27 Nov 2026 (project chat): the site's categories become four forms, Fiction,
-- Non-fiction, Poems and Plays; folk tales and essays are tags, not forms. The nonfiction_essays
-- key stays as it is, so no story moves; only its label changes to Non-fiction.
-- Who uses it: every screen that lists categories reads this table (the new story form, story
-- settings, Discover's filters, the staff settings and sponsor screens), so Plays shows up there
-- with no other change. The classics that are plays are re-filed by hand afterwards (CONTENT).
-- Safe to run twice: the insert skips a row that is already there.

insert into public.categories (slug, position)
select 'plays', coalesce(max(position), 0) + 1
from public.categories
where not exists (select 1 from public.categories where slug = 'plays');

comment on table public.categories is
  'kind: platform
The fixed story forms: fiction, poetry, nonfiction essays (shown as Non-fiction) and plays (Q52; FORMS-1, 27 Nov 2026). Staff reorder them from Settings (S1-E11-03).';
