/*
 * Migration: forum categories, forums and subforums (bundle FORUMS-1, part a; story S1-E8-01;
 * board 5.1 Forums).
 *
 * What it adds:
 *   forum_accent         the colour of a category's bar on the forum index (plum, sky, blush, sage, gold)
 *   forums               one table for the three levels: a category (no parent, level 0), a forum
 *                        inside a category (level 1) and a subforum inside a forum (level 2). So the
 *                        forums go "up to two levels deep" below their category (S1-E8-01, first
 *                        criterion, a proposal). Staff set the order; a category can be pinned.
 *   forum_names          each forum's name and description in each interface language, as tag names
 *                        are (CMS-1e): forums are staff content, so they are not in the locale files.
 *   forum_index()        the forum index for one language: every live category, forum and subforum
 *                        with its name, its numbers and the latest post. Threads and posts arrive in
 *                        part b (S1-E8-02), which redefines it to count them; until then every count
 *                        is 0 and there is no latest post.
 *   admin_list_forums(), admin_save_forum(), admin_delete_forum()
 *                        the staff page /staff/forums: owner and admin (the settings area,
 *                        architecture 1.8.3), every change in the audit log in the same transaction.
 *   The starting categories and forums from board 5.1, pinned in the board's order, with draft
 *   Romanian and English names (Robert reads all new Romanian text, decided 17 Oct 2026, 19:33).
 *
 * Rules:
 *   - Forums sort by latest activity, with the starting categories pinned (Q45, 16 Oct 2026).
 *   - Threads never close or archive on their own (S1-E8-01, third criterion). Nothing here or in
 *     any job archives a forum or a thread; test 221 checks that no pg_cron job touches forums.
 *   - Names, never the product's name: "Questions about the app", not the brand (CLAUDE.md).
 */

/* ---------- Types ---------- */

create type public.forum_accent as enum ('plum', 'sky', 'blush', 'sage', 'gold');

comment on type public.forum_accent is
  'The colour of a forum category''s bar on the forum index, from the pill palette (FORUMS-1a).';

/* ---------- Forums ---------- */

create table public.forums (
  id uuid primary key default gen_random_uuid(),
  -- The category or forum this one sits in; null for a category.
  parent_id uuid references public.forums (id) on delete restrict,
  -- 0 a category, 1 a forum, 2 a subforum. Set by forums_set_level from the parent, never by hand.
  level smallint not null default 0,
  -- The address: /forums/<slug>. Lowercase words joined by hyphens.
  slug text not null,
  -- Staff's order among the forum's siblings: lower first.
  position integer not null default 0,
  -- Pinned categories come first, in staff's order (Q45). Only categories are pinned.
  is_pinned boolean not null default false,
  accent public.forum_accent not null default 'plum',
  -- The decorative doodle beside a category's name, by its file name ("fountain-pen"); the app
  -- shows nothing for a name it doesn't know.
  doodle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Staff removed it. Kept for the audit trail; nobody but staff sees it.
  deleted_at timestamptz,
  constraint forums_slug_unique unique (slug),
  constraint forums_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  constraint forums_level_range check (level between 0 and 2),
  constraint forums_position_range check (position between 0 and 10000),
  constraint forums_only_categories_pinned check (not is_pinned or parent_id is null),
  constraint forums_doodle_format check (doodle is null or doodle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint forums_not_own_parent check (parent_id is distinct from id)
);

comment on table public.forums is
  'kind: platform
Forum categories (level 0), forums (level 1) and subforums (level 2), made by staff (S1-E8-01).';

create index forums_parent_id on public.forums (parent_id) where deleted_at is null;

create trigger forums_set_updated_at
  before update on public.forums
  for each row execute function public.set_updated_at();

/**
 * forums_set_level: works out a forum's level from its parent and refuses a third level below a
 * category (S1-E8-01: "up to two levels deep", a proposal).
 * Fires: before a forum is added or its parent changes.
 * Errors: check_violation with hint "parent:too_deep" (the parent is a subforum),
 *   "parent:missing" (no live parent with that id) or "parent:has_children" (a forum that holds
 *   forums can't move, because their levels would change too).
 */
create or replace function public.forums_set_level()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_level smallint;
begin
  -- Step 1: a forum with forums inside it keeps its place in the tree.
  if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id
     and exists (select 1 from public.forums where forums.parent_id = new.id and forums.deleted_at is null) then
    raise exception 'Move the forums inside it first.' using errcode = 'check_violation', hint = 'parent:has_children';
  end if;
  -- Step 2: a category has no parent.
  if new.parent_id is null then
    new.level := 0;
    return new;
  end if;
  -- Step 3: one level below a live parent, never below a subforum.
  select forums.level into parent_level from public.forums
  where forums.id = new.parent_id and forums.deleted_at is null;
  if parent_level is null then
    raise exception 'The forum it should sit in doesn''t exist.' using errcode = 'check_violation', hint = 'parent:missing';
  end if;
  if parent_level >= 2 then
    raise exception 'A subforum can''t hold forums.' using errcode = 'check_violation', hint = 'parent:too_deep';
  end if;
  new.level := parent_level + 1;
  return new;
end;
$$;

comment on function public.forums_set_level() is
  'Trigger: sets a forum''s level from its parent; at most category, forum, subforum (FORUMS-1a).';

create trigger forums_set_level
  before insert or update of parent_id on public.forums
  for each row execute function public.forums_set_level();

alter table public.forums enable row level security;

/**
 * Policy forums_select_public: anyone, signed out included, reads the live forums.
 * Why: "Anyone can read the forums. You need an account to post." (board 5.1). A forum is staff
 * content and holds nothing personal. Removed forums stay for staff, who read them through
 * admin_list_forums().
 */
create policy forums_select_public
  on public.forums
  for select
  to anon, authenticated
  using (deleted_at is null);

comment on policy forums_select_public on public.forums is
  'Allows anyone to read live forum categories, forums and subforums (S1-E8-01).';

-- Table privileges, exactly what the policy needs. Staff write only through the admin_* functions.
revoke all on public.forums from anon, authenticated;
grant select on public.forums to anon, authenticated;  -- forums_select_public

/* ---------- Names in each language ---------- */

create table public.forum_names (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.forums (id) on delete cascade,
  -- A BCP 47 code from languages ("ro", "en").
  language_code text not null references public.languages (code) on delete cascade,
  name text not null,
  -- One line under the name on the index; may be empty (categories have none on the board).
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_names_one_per_language unique (forum_id, language_code),
  constraint forum_names_name_length check (char_length(name) between 1 and 80),
  constraint forum_names_description_length check (char_length(description) <= 200)
);

comment on table public.forum_names is
  'kind: platform
A forum''s name and description in one language; staff write one per interface language (FORUMS-1a).';

create trigger forum_names_set_updated_at
  before update on public.forum_names
  for each row execute function public.set_updated_at();

alter table public.forum_names enable row level security;

/**
 * Policy forum_names_select_public: anyone reads the names of live forums.
 * Why: the index shows every forum in the reader's language; the names are staff content.
 */
create policy forum_names_select_public
  on public.forum_names
  for select
  to anon, authenticated
  using (exists (
    select 1 from public.forums where forums.id = forum_names.forum_id and forums.deleted_at is null));

comment on policy forum_names_select_public on public.forum_names is
  'Allows anyone to read the names of live forums in every language (FORUMS-1a).';

revoke all on public.forum_names from anon, authenticated;
grant select on public.forum_names to anon, authenticated;  -- forum_names_select_public

/* ---------- The forum index ---------- */

/**
 * forum_name_in: a forum's name and description in one language, falling back to Romanian (the
 * language the interface opens in for everyone) and then to any name it has.
 * Inputs: the forum and the wanted language code.
 * Returns: one row: name and description.
 */
create or replace function public.forum_name_in(target_forum_id uuid, wanted_language text)
returns table (name text, description text)
language sql
stable
set search_path = ''
as $$
  select forum_names.name, forum_names.description
  from public.forum_names
  where forum_names.forum_id = target_forum_id
  order by (forum_names.language_code = wanted_language) desc,
    (forum_names.language_code = 'ro') desc, forum_names.language_code
  limit 1;
$$;

comment on function public.forum_name_in(uuid, text) is
  'A forum''s name and description in a language, else Romanian, else any (FORUMS-1a).';
grant execute on function public.forum_name_in(uuid, text) to anon, authenticated;

/**
 * forum_index: the forum index for one language (board 5.1; S1-E8-01, second criterion).
 * Input: language_code, the reader's interface language ("ro" or "en").
 * Returns: one row per live category, forum and subforum: its id, parent, level, address, order,
 *   pin, colour and doodle, its name and description in that language, the number of threads and
 *   posts, when the latest post was written and the latest post itself as
 *   {"thread_title", "thread_address", "writer_handle", "writer_name", "is_staff", "posted_at"}.
 *   Until part b adds threads, the counts are 0 and the latest post is null.
 * Order is left to the app: pinned categories by position, then the rest by latest activity.
 * Errors: none; anyone may call it.
 */
create or replace function public.forum_index(language_code text)
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  name text,
  description text,
  thread_count bigint,
  post_count bigint,
  latest_activity_at timestamptz,
  latest_post jsonb
)
language sql
stable
set search_path = ''
as $$
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, forums.doodle, names.name, names.description,
    -- Part b (S1-E8-02) counts the forum's threads and posts here.
    0::bigint, 0::bigint, null::timestamptz, null::jsonb
  from public.forums
  cross join lateral public.forum_name_in(forums.id, forum_index.language_code) as names
  where forums.deleted_at is null;
$$;

comment on function public.forum_index(text) is
  'The forum index in one language: every live forum with its numbers and latest post (S1-E8-01).';
grant execute on function public.forum_index(text) to anon, authenticated;

/* ---------- Staff: list, save and remove ---------- */

/**
 * require_forum_staff: refuses anyone who may not change the forums: owner and admin, the
 * settings area (architecture 1.8.2 and 1.8.3: "Settings … categories, forums"). Internal.
 * Errors: insufficient_privilege.
 */
create or replace function public.require_forum_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('settings', 'act') then
    raise exception 'Only the owner and admins can change the forums.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_forum_staff() is 'Internal: refuses anyone who may not change the forums (FORUMS-1a).';
revoke execute on function public.require_forum_staff() from public, anon, authenticated;

/**
 * admin_list_forums: every live forum for the staff page, in tree order.
 * Returns: one row per forum: id, parent, level, slug, position, pin, colour, doodle, its names as
 *   {"ro": {"name": "...", "description": "..."}, "en": {...}} and the interface languages it has
 *   no name in, so a new market's names are easy to fill in.
 * Errors: insufficient_privilege unless owner or admin.
 */
create or replace function public.admin_list_forums()
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  names jsonb,
  missing_languages text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_forum_staff();
  return query
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, forums.doodle,
    coalesce((select jsonb_object_agg(forum_names.language_code,
        jsonb_build_object('name', forum_names.name, 'description', forum_names.description))
      from public.forum_names where forum_names.forum_id = forums.id), '{}'::jsonb),
    array(select languages.code from public.languages
      where languages.is_interface and not exists (
        select 1 from public.forum_names
        where forum_names.forum_id = forums.id and forum_names.language_code = languages.code)
      order by languages.code)
  from public.forums
  where forums.deleted_at is null
  order by forums.level, forums.position, forums.slug;
end;
$$;

comment on function public.admin_list_forums() is 'Every live forum with its names, for staff (FORUMS-1a).';
revoke execute on function public.admin_list_forums() from public, anon;
grant execute on function public.admin_list_forums() to authenticated;

/**
 * forum_name_problems: what is wrong with the names staff gave a forum. Internal.
 * Input: names as {"ro": {"name": "...", "description": "..."}, ...}.
 * Returns: hint words, one per problem: "ro:empty" (every interface language needs a name),
 *   "en:too_long" (over 80 characters), "en:description_too_long" (over 200),
 *   "fr:unknown_language".
 */
create or replace function public.forum_name_problems(names jsonb)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array(
    select languages.code || ':empty' from public.languages
    where languages.is_interface and coalesce(btrim(names -> languages.code ->> 'name'), '') = ''
    union all
    select given.key || ':unknown_language' from jsonb_each(coalesce(names, '{}')) as given
    where not exists (select 1 from public.languages where languages.code = given.key)
    union all
    select given.key || ':too_long' from jsonb_each(coalesce(names, '{}')) as given
    where char_length(btrim(coalesce(given.value ->> 'name', ''))) > 80
    union all
    select given.key || ':description_too_long' from jsonb_each(coalesce(names, '{}')) as given
    where char_length(btrim(coalesce(given.value ->> 'description', ''))) > 200
  );
$$;

comment on function public.forum_name_problems(jsonb) is 'Internal: what is wrong with a forum''s names (FORUMS-1a).';
revoke execute on function public.forum_name_problems(jsonb) from public, anon, authenticated;

/**
 * forum_as_json: a forum and its names as one JSON value, for the audit log's before and after.
 * Internal.
 */
create or replace function public.forum_as_json(target_forum_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(forums) - 'created_at' - 'updated_at'
    || jsonb_build_object('names', coalesce((select jsonb_object_agg(forum_names.language_code,
        jsonb_build_object('name', forum_names.name, 'description', forum_names.description))
      from public.forum_names where forum_names.forum_id = forums.id), '{}'::jsonb))
  from public.forums where forums.id = target_forum_id;
$$;

comment on function public.forum_as_json(uuid) is 'Internal: a forum and its names as JSON for the audit log (FORUMS-1a).';
revoke execute on function public.forum_as_json(uuid) from public, anon, authenticated;

/**
 * write_forum_names: stores the names staff gave a forum, one row per language. Internal.
 * Inputs: the forum and names as {"ro": {"name", "description"}, ...}.
 */
create or replace function public.write_forum_names(target_forum_id uuid, names jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.forum_names (forum_id, language_code, name, description)
  select target_forum_id, given.key,
    regexp_replace(btrim(given.value ->> 'name'), '\s+', ' ', 'g'),
    btrim(coalesce(given.value ->> 'description', ''))
  from jsonb_each(coalesce(names, '{}')) as given
  on conflict on constraint forum_names_one_per_language do update
    set name = excluded.name, description = excluded.description;
$$;

comment on function public.write_forum_names(uuid, jsonb) is 'Internal: writes a forum''s names (FORUMS-1a).';
revoke execute on function public.write_forum_names(uuid, jsonb) from public, anon, authenticated;

/**
 * admin_save_forum: adds a category, forum or subforum, or changes one (S1-E8-01, first
 * criterion: "staff set name, description, order and parent").
 * Inputs: forum_id (null to add one), parent_id (null for a category), slug, sort_position,
 *   is_pinned (categories only), accent, doodle (or null) and names as
 *   {"ro": {"name": "...", "description": "..."}, "en": {...}}; every interface language needs a name.
 * Returns: the forum's id.
 * Errors: insufficient_privilege unless owner or admin; no_data_found for an unknown forum;
 *   check_violation with the problems as the hint ("ro:empty", "parent:too_deep",
 *   "parent:has_children", "slug:format", "slug:taken" (another forum, even a removed one, has
 *   that address), "pin:not_category").
 * Logged as forum.created or forum.changed, with before and after.
 */
create or replace function public.admin_save_forum(
  forum_id uuid,
  parent_id uuid,
  slug text,
  sort_position integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  names jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  problems text[];
  before_forum jsonb;
  saved_id uuid;
begin
  perform public.require_forum_staff();
  -- Step 1: the names, the address and the pin, before anything is written.
  problems := public.forum_name_problems(names);
  if admin_save_forum.slug is null or admin_save_forum.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(admin_save_forum.slug) not between 2 and 60 then
    problems := array_append(problems, 'slug:format');
  end if;
  -- An address stays taken by a removed forum too, so an old link never leads somewhere new.
  if exists (select 1 from public.forums where forums.slug = admin_save_forum.slug
             and forums.id is distinct from admin_save_forum.forum_id) then
    problems := array_append(problems, 'slug:taken');
  end if;
  if coalesce(admin_save_forum.is_pinned, false) and admin_save_forum.parent_id is not null then
    problems := array_append(problems, 'pin:not_category');
  end if;
  if cardinality(problems) > 0 then
    raise exception 'Fix the forum before saving.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 2: add it, or change the one staff opened (the level trigger checks the parent).
  if admin_save_forum.forum_id is null then
    insert into public.forums (parent_id, slug, position, is_pinned, accent, doodle)
    values (admin_save_forum.parent_id, admin_save_forum.slug, greatest(coalesce(sort_position, 0), 0),
      coalesce(admin_save_forum.is_pinned, false), coalesce(admin_save_forum.accent, 'plum'),
      nullif(btrim(admin_save_forum.doodle), ''))
    returning forums.id into saved_id;
  else
    before_forum := public.forum_as_json(admin_save_forum.forum_id);
    update public.forums
    set parent_id = admin_save_forum.parent_id, slug = admin_save_forum.slug,
      position = greatest(coalesce(sort_position, 0), 0),
      is_pinned = coalesce(admin_save_forum.is_pinned, false),
      accent = coalesce(admin_save_forum.accent, 'plum'), doodle = nullif(btrim(admin_save_forum.doodle), '')
    where forums.id = admin_save_forum.forum_id and forums.deleted_at is null
    returning forums.id into saved_id;
    if saved_id is null then
      raise exception 'There is no forum with that id.' using errcode = 'no_data_found';
    end if;
  end if;
  -- Step 3: the names, then the audit log in the same transaction.
  perform public.write_forum_names(saved_id, names);
  perform public.log_staff_action(
    case when before_forum is null then 'forum.created' else 'forum.changed' end,
    'forums', saved_id::text, null, null, before_forum, public.forum_as_json(saved_id));
  return saved_id;
end;
$$;

comment on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, text, jsonb) is
  'Adds or changes a forum category, forum or subforum; owner and admin; logged (S1-E8-01).';
revoke execute on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, text, jsonb)
  from public, anon;
grant execute on function public.admin_save_forum(uuid, uuid, text, integer, boolean, public.forum_accent, text, jsonb)
  to authenticated;

/**
 * admin_delete_forum: removes an empty forum (it stays in the table, marked removed, for the
 * audit trail). Part b also refuses a forum that has threads.
 * Inputs: forum_id and reason (1 to 300 characters, for the audit log).
 * Returns: nothing.
 * Errors: insufficient_privilege unless owner or admin; no_data_found for an unknown forum;
 *   check_violation with hint "forum:has_children" or "reason:empty" or "reason:too_long".
 * Logged as forum.removed with the reason.
 */
create or replace function public.admin_delete_forum(forum_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_forum jsonb;
begin
  perform public.require_forum_staff();
  -- Step 1: a reason for the audit log.
  if coalesce(btrim(reason), '') = '' then
    raise exception 'Say why the forum is removed.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 300 then
    raise exception 'Keep the reason under 300 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  -- Step 2: the forum must exist and hold no live forums.
  before_forum := public.forum_as_json(admin_delete_forum.forum_id);
  if before_forum is null or before_forum ->> 'deleted_at' is not null then
    raise exception 'There is no forum with that id.' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.forums
             where forums.parent_id = admin_delete_forum.forum_id and forums.deleted_at is null) then
    raise exception 'Remove or move the forums inside it first.' using errcode = 'check_violation', hint = 'forum:has_children';
  end if;
  -- Step 3: mark it removed, then log it.
  update public.forums set deleted_at = now() where forums.id = admin_delete_forum.forum_id;
  perform public.log_staff_action('forum.removed', 'forums', admin_delete_forum.forum_id::text, null,
    btrim(reason), before_forum, public.forum_as_json(admin_delete_forum.forum_id));
end;
$$;

comment on function public.admin_delete_forum(uuid, text) is 'Removes an empty forum; owner and admin; logged (FORUMS-1a).';
revoke execute on function public.admin_delete_forum(uuid, text) from public, anon;
grant execute on function public.admin_delete_forum(uuid, text) to authenticated;

/* ---------- The starting forums (board 5.1) ---------- */

-- The four starting categories, pinned in the board's order (Q45), each with its colour and doodle.
insert into public.forums (slug, position, is_pinned, accent, doodle) values
  ('writing-craft', 1, true, 'plum', 'fountain-pen'),
  ('reading', 2, true, 'sky', 'owl-reading-glasses'),
  ('essays-and-true-stories', 3, true, 'blush', 'ideas-notepad'),
  ('community', 4, true, 'sage', 'heart-balloon');

-- The forums inside them, in the board's order.
insert into public.forums (parent_id, slug, position)
select categories.id, starting.slug, starting.position
from (values
  ('writing-craft', 'first-chapters', 1), ('writing-craft', 'worldbuilding', 2),
  ('writing-craft', 'language-help', 3), ('writing-craft', 'feedback-swap', 4),
  ('reading', 'book-talk', 1), ('reading', 'school-reading-list', 2),
  ('essays-and-true-stories', 'true-stories-and-memoir', 1),
  ('essays-and-true-stories', 'essays-and-opinion', 2),
  ('community', 'introductions', 1), ('community', 'help-and-ideas', 2), ('community', 'contests', 3)
) as starting (category_slug, slug, position)
join public.forums as categories on categories.slug = starting.category_slug;

-- The subforums the board shows under First chapters and Feedback swap.
insert into public.forums (parent_id, slug, position)
select parents.id, starting.slug, starting.position
from (values
  ('first-chapters', 'fantasy-and-sci-fi-openings', 1), ('first-chapters', 'school-and-everyday-life', 2),
  ('feedback-swap', 'poetry-swaps', 1), ('feedback-swap', 'long-reads', 2)
) as starting (parent_slug, slug, position)
join public.forums as parents on parents.slug = starting.parent_slug;

-- Names in Romanian and English (draft copy; staff change it on /staff/forums).
insert into public.forum_names (forum_id, language_code, name, description)
select forums.id, named.language_code, named.name, named.description
from (values
  ('writing-craft', 'en', 'Writing craft', ''),
  ('writing-craft', 'ro', 'Meșteșugul scrisului', ''),
  ('first-chapters', 'en', 'First chapters', 'Openings and the first 1,000 words of a story'),
  ('first-chapters', 'ro', 'Primele capitole', 'Începuturi și primele 1.000 de cuvinte ale unei povești'),
  ('fantasy-and-sci-fi-openings', 'en', 'Fantasy and sci-fi openings', ''),
  ('fantasy-and-sci-fi-openings', 'ro', 'Începuturi fantasy și SF', ''),
  ('school-and-everyday-life', 'en', 'School and everyday life', ''),
  ('school-and-everyday-life', 'ro', 'Școala și viața de zi cu zi', ''),
  ('worldbuilding', 'en', 'Worldbuilding', 'Maps, magic systems and invented places'),
  ('worldbuilding', 'ro', 'Construirea lumilor', 'Hărți, sisteme de magie și locuri inventate'),
  ('language-help', 'en', 'Language help', 'Grammar, diacritics and writing in Romanian or English'),
  ('language-help', 'ro', 'Ajutor cu limba', 'Gramatică, diacritice și scrisul în română sau în engleză'),
  ('feedback-swap', 'en', 'Feedback swap', 'Swap chapters and give each other honest feedback'),
  ('feedback-swap', 'ro', 'Schimb de păreri', 'Faceți schimb de capitole și spuneți-vă sincer părerea'),
  ('poetry-swaps', 'en', 'Poetry swaps', ''),
  ('poetry-swaps', 'ro', 'Schimburi de poezie', ''),
  ('long-reads', 'en', 'Long reads (over 3,000 words)', ''),
  ('long-reads', 'ro', 'Texte lungi (peste 3.000 de cuvinte)', ''),
  ('reading', 'en', 'Reading', ''),
  ('reading', 'ro', 'Lectură', ''),
  ('book-talk', 'en', 'Book talk', 'What you’re reading and what you think of it'),
  ('book-talk', 'ro', 'Despre cărți', 'Ce citești și ce crezi despre ce citești'),
  ('school-reading-list', 'en', 'School reading list', 'Talk about the books you have to read for school'),
  ('school-reading-list', 'ro', 'Lecturi școlare', 'Despre cărțile pe care trebuie să le citești pentru școală'),
  ('essays-and-true-stories', 'en', 'Essays and true stories', ''),
  ('essays-and-true-stories', 'ro', 'Eseuri și povești adevărate', ''),
  ('true-stories-and-memoir', 'en', 'True stories and memoir', 'Writing about your own life, your family and the places you know'),
  ('true-stories-and-memoir', 'ro', 'Povești adevărate și memorii', 'Despre viața ta, familia ta și locurile pe care le cunoști'),
  ('essays-and-opinion', 'en', 'Essays and opinion', 'Personal essays, opinion pieces and how to make an argument'),
  ('essays-and-opinion', 'ro', 'Eseuri și opinii', 'Eseuri personale, articole de opinie și cum construiești un argument'),
  ('community', 'en', 'Community', ''),
  ('community', 'ro', 'Comunitate', ''),
  ('introductions', 'en', 'Introductions', 'Say hello and tell us what you write'),
  ('introductions', 'ro', 'Prezentări', 'Salută și spune-ne ce scrii'),
  ('help-and-ideas', 'en', 'Help and ideas', 'Questions about the app, bug reports and ideas for new features'),
  ('help-and-ideas', 'ro', 'Ajutor și idei', 'Întrebări despre aplicație, erori găsite și idei pentru funcții noi'),
  ('contests', 'en', 'Contests', 'Writing contests, prompts and challenges'),
  ('contests', 'ro', 'Concursuri', 'Concursuri de scris, teme și provocări')
) as named (slug, language_code, name, description)
join public.forums on forums.slug = named.slug;
