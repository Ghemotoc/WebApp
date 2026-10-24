-- Migration: categories and tags (story S1-E3-01, Create a story; architecture B13).
--
-- What it adds: the fixed list of story categories, the shared list of tags with the rule that
-- makes "Fantezie" and "fantezie" one tag, and the 'story' reportable type.
-- Who uses it: create_story() (next migration) writes tags; the new story form (src/features/
-- writing/) reads categories; Discover (S1-E5-01) filters by both.
-- Decisions: launch categories are fiction, poetry and nonfiction essays, no journalism (Q52,
-- 16 Oct 2026); up to 10 tags per story; tags are lower-cased, trimmed and diacritic-normalised
-- (S1-E3-01 acceptance criteria). Categories change only by migration until S1-E11-03.

/* ---------- The reportable type ---------- */

-- Every user-content table registers with the reporting system (CLAUDE.md rule 6). "if not
-- exists" keeps this safe if the reporting lane (S1-E10-01) adds the same value in parallel.
alter type public.reportable_type add value if not exists 'story';

/* ---------- Categories ---------- */

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- The fixed key the app translates: fiction, poetry, nonfiction_essays. Labels are interface
  -- text (src/locales/*/writing.json), never stored here.
  slug text not null unique,
  -- The order the form shows them in.
  position smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_is_a_key check (slug ~ '^[a-z_]{2,40}$')
);

comment on table public.categories is
  'kind: platform
The fixed story categories: fiction, poetry, nonfiction essays (Q52). Changed by migration until S1-E11-03.';

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

/**
 * Policy categories_select_public: anyone, signed out included, reads the categories.
 * Why: Discover and the public story page show the category; nothing in it is personal.
 */
create policy categories_select_public
  on public.categories
  for select
  to anon, authenticated
  using (true);

comment on policy categories_select_public on public.categories is
  'Allows anyone, signed out included, to read the category list; nothing in it is personal (S1-E3-01).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): anyone may read.
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;  -- categories_select_public

insert into public.categories (slug, position) values
  ('fiction', 1),
  ('poetry', 2),
  ('nonfiction_essays', 3);

/* ---------- Tags ---------- */

/**
 * normalise_tag: the one form of a tag, so "Fantezie", " fantezie " and "fantézie" are one tag.
 * Input: a tag as typed. Returns: trimmed, spaces collapsed, ş/ţ corrected, lower case, accents
 *   and other marks removed ("set in Romania" → "set in romania", "Fantezie" → "fantezie").
 * Errors: none. Where it fits: create_story() and the form's own preview use the same rule
 *   (src/features/writing/lib/tags.ts mirrors it).
 */
create or replace function public.normalise_tag(tag_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(
    public.strip_combining_marks(
      regexp_replace(btrim(coalesce(tag_name, '')), '\s+', ' ', 'g')
    )
  );
$$;

comment on function public.normalise_tag(text) is
  'Trimmed, lower-cased, diacritic-normalised form of a tag, so look-alikes are one tag (S1-E3-01).';

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  -- The tag as the first writer typed it, shown on screens ("Fantezie").
  name text not null,
  -- The one form every look-alike shares; unique, so look-alikes join this row.
  normalised_name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(name) between 1 and 40),
  constraint tags_normalised_name_matches check (normalised_name = public.normalise_tag(name))
);

comment on table public.tags is
  'kind: platform
Every tag writers have used, once per normalised form; written only by create_story() (S1-E3-01).';

create trigger tags_set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;

/**
 * Policy tags_select_public: anyone, signed out included, reads the tags.
 * Why: tags show on public story pages and Discover filters by them; a tag is never personal.
 */
create policy tags_select_public
  on public.tags
  for select
  to anon, authenticated
  using (true);

comment on policy tags_select_public on public.tags is
  'Allows anyone, signed out included, to read the tag list; tags are never personal (S1-E3-01).';

-- Table privileges, exactly what the policy needs: anyone may read. New tags are written only
-- by create_story() (security definer), so nobody gets a write privilege.
revoke all on public.tags from anon, authenticated;
grant select on public.tags to anon, authenticated;  -- tags_select_public
