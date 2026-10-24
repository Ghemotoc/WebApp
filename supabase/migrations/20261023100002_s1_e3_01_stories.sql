-- Migration: stories (story S1-E3-01, Create a story; architecture B13, section 1.6).
--
-- What it adds: the stories table (one row per story, owned by the writer's user ID), the
-- story_tags link table, the drawn and automatic cover columns, the open story languages, and
-- create_story(), the only way a story is made.
-- Who uses it: the new story form (src/features/writing/) through create_story(); the writer's
-- own list through stories_select_own; readers never touch this table (ADR 0004: they read
-- through get_story_page() and get_chapter(), added in S1-E3-05 and S1-E4-01a).
-- Decisions:
--   - The owner is the writer's user ID (user_id), unchanged if the handle or pen name changes
--     (architecture 1.6; rule 15). It is never shown publicly, so the public address uses `slug`.
--   - Drawn covers: 16 approved backgrounds (9 plain, 7 patterns) recolourable within the
--     9-colour palette (16 Oct 2026). A story without its own cover gets an automatic one drawn
--     from its ID, so nothing is stored for it (S1-E3-13).
--   - No picture uploads in the demo (Robert, 23 Oct 2026): the upload columns exist, but
--     create_story() refuses an upload cover while the `picture_uploads` flag is off (next
--     migration adds the flag and the bucket).
--   - A story with no published chapter is hidden from everyone but the writer: readers have no
--     policy here at all, and get_story_page() (S1-E3-05) requires first_published_at, which only
--     publish_chapter() (S1-E3-03) ever sets.
--   - Every write goes through a function: there is no insert or update policy, so a person
--     can't change their story's owner, slug or publish date through the Data API.

/* ---------- Enums ---------- */

/** cover_kind: where a story's cover comes from (S1-E3-01, S1-E3-13). */
create type public.cover_kind as enum ('automatic', 'drawn', 'upload');

comment on type public.cover_kind is
  'automatic (drawn from the story ID, nothing stored), drawn (a chosen design and colours) or upload (a picture, behind picture_uploads).';

/* ---------- The open story languages ---------- */

/**
 * open_story_languages: the languages a story may be written in today.
 * Returns: the languages of every open market, as BCP 47 codes (ro, en), each once.
 * Why from markets: a language opens only when moderators who read it are on the rota, which is
 *   what opening a market means (architecture 1.2, S1-E2-10); S1-E11-05 gives it a screen.
 * Where it fits: create_story() refuses any other language; the form shows these as choices.
 */
create or replace function public.open_story_languages()
returns setof text
language sql
stable
set search_path = ''
as $$
  select distinct unnest(markets.languages)
  from public.markets
  where markets.is_open
  order by 1;
$$;

comment on function public.open_story_languages() is
  'The languages of the open markets, the only ones a story may be written in (S1-E3-01).';
grant execute on function public.open_story_languages() to anon, authenticated;

/* ---------- Stories ---------- */

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  -- The owner: the writer's user ID (architecture 1.6; CLAUDE.md rule 15). Never shown publicly.
  user_id uuid not null references public.profiles (id),
  -- The public address: the title's web form plus six random characters, fixed at creation so a
  -- shared link survives a rename (for example "statia-meteo-k3x9qa").
  slug text not null unique,
  title text not null,
  blurb text not null default '',
  -- The language the story is written in, one of open_story_languages() when created.
  language_code text not null,
  category_id uuid not null references public.categories (id),
  -- Covers (S1-E3-01, S1-E3-13): automatic stores nothing; drawn stores a design key and two
  -- palette keys; upload stores the storage paths (behind picture_uploads, S1-E10-05).
  cover_kind public.cover_kind not null default 'automatic',
  cover_design text,
  cover_background text,
  cover_accent text,
  cover_tall_path text,
  cover_square_path text,
  -- Set once by publish_chapter() (S1-E3-03); null means only the writer can see the story.
  first_published_at timestamptz,
  -- The story's "last updated" date: moves whenever a chapter is published (S1-E3-03).
  last_chapter_published_at timestamptz,
  -- Soft delete (CLAUDE.md conventions); the 30-day purge comes with S1-E3-05.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint stories_blurb_length check (char_length(blurb) <= 500),
  constraint stories_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  constraint stories_language_code_shape check (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  -- The 16 approved drawn backgrounds (16 Oct 2026): 9 plain colours and 7 patterns.
  constraint stories_cover_design_is_approved check (cover_design is null or cover_design in (
    'plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper',
    'stripes', 'dots', 'grid', 'waves', 'starry', 'doodles', 'twotone')),
  -- The 9-colour palette drawn covers may use (16 Oct 2026).
  constraint stories_cover_colours_are_in_the_palette check (
    (cover_background is null or cover_background in ('plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper'))
    and (cover_accent is null or cover_accent in ('plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper'))),
  -- Each cover kind stores exactly what it needs and nothing else (S1-E3-13: automatic stores no file).
  constraint stories_cover_columns_match_kind check (
    case cover_kind
      when 'automatic' then cover_design is null and cover_background is null and cover_accent is null
        and cover_tall_path is null and cover_square_path is null
      when 'drawn' then cover_design is not null and cover_background is not null and cover_accent is not null
        and cover_tall_path is null and cover_square_path is null
      when 'upload' then cover_design is null and cover_background is null and cover_accent is null
        and cover_tall_path is not null
    end)
);

comment on table public.stories is
  'kind: user_content; reportable: story
One row per story, owned by the writer''s user ID; made only by create_story() (S1-E3-01).';

comment on column public.stories.user_id is
  'The writer''s permanent user ID (architecture 1.6). Never shown publicly: screens use slug and the pen name.';
comment on column public.stories.slug is
  'The public address, fixed at creation so shared links survive a rename (S1-E3-01).';
comment on column public.stories.first_published_at is
  'Set once by publish_chapter() (S1-E3-03); null means only the writer sees the story.';

-- The writer's own list, and (S1-E3-05) a filter by status, read only live rows.
create index stories_user_id_idx on public.stories (user_id) where deleted_at is null;

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

create trigger stories_refuse_user_id_change
  before update on public.stories
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.stories enable row level security;

/**
 * Policy stories_select_own: a writer reads their own stories, deleted ones included (for undo,
 * S1-E3-05). Why only the owner: readers get stories through get_story_page() and get_chapter(),
 * which leave the user ID out and apply the rating and publish rules (ADR 0004).
 */
create policy stories_select_own
  on public.stories
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy stories_select_own on public.stories is
  'Allows a writer to read only their own stories; readers go through get_story_page() and get_chapter() (ADR 0004).';

-- Table privileges, exactly what the policy needs (CLAUDE.md, Conventions): the owner may read.
-- Every write goes through create_story() and, later, update_my_story() (S1-E3-05), so nobody
-- gets a write privilege.
revoke all on public.stories from anon, authenticated;
grant select on public.stories to authenticated;  -- stories_select_own

/* ---------- Story tags ---------- */

create table public.story_tags (
  story_id uuid not null references public.stories (id) on delete cascade,
  tag_id uuid not null references public.tags (id),
  -- The story's owner, copied here so the policy and rule 15 read one column.
  user_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id, tag_id)
);

comment on table public.story_tags is
  'kind: user_content; reportable: story
Which tags a story carries (at most 10); written only by create_story() and update_my_story() (S1-E3-01).';

create index story_tags_tag_id_idx on public.story_tags (tag_id);

create trigger story_tags_set_updated_at
  before update on public.story_tags
  for each row execute function public.set_updated_at();

create trigger story_tags_refuse_user_id_change
  before update on public.story_tags
  for each row execute function public.refuse_user_id_change('user_id');

/**
 * Trigger function: refuses an eleventh tag on a story (S1-E3-01: up to 10 tags).
 * Inputs: the row being added. Returns: the row. Errors: check_violation past 10 tags.
 */
create or replace function public.refuse_eleventh_story_tag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.story_tags where story_tags.story_id = new.story_id) >= 10 then
    raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.refuse_eleventh_story_tag() is
  'Trigger: a story keeps at most 10 tags (S1-E3-01).';
revoke execute on function public.refuse_eleventh_story_tag() from public, anon, authenticated;

create trigger story_tags_at_most_ten
  before insert on public.story_tags
  for each row execute function public.refuse_eleventh_story_tag();

alter table public.story_tags enable row level security;

/**
 * Policy story_tags_select_own: a writer reads the tags of their own stories.
 * Why: the same rule as stories; public pages read tags through get_story_page() (ADR 0004).
 */
create policy story_tags_select_own
  on public.story_tags
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy story_tags_select_own on public.story_tags is
  'Allows a writer to read the tags of their own stories; public pages use get_story_page() (ADR 0004).';

revoke all on public.story_tags from anon, authenticated;
grant select on public.story_tags to authenticated;  -- story_tags_select_own

/* ---------- Helpers for create_story() ---------- */

/**
 * story_slug_for: a fresh public address for a title.
 * Input: title. Returns: the title's web form (name_slug(), non-letters turned into dashes, at
 *   most 60 characters) plus six random lower-case letters and digits; "" titles in another
 *   script give "story-<random>". Not unique on its own: create_story() retries on a clash.
 */
create or replace function public.story_slug_for(title text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text;
  random_part text := '';
  alphabet text := 'abcdefghijklmnopqrstuvwxyz0123456789';
begin
  -- Step 1: the title's web form, dashes between words, nothing else.
  base := regexp_replace(public.name_slug(title), '[^a-z0-9]+', '-', 'g');
  base := btrim(left(base, 60), '-');
  if base = '' then
    base := 'story';
  end if;
  -- Step 2: six random characters, so two stories with one title get two addresses.
  for position in 1..6 loop
    random_part := random_part || substr(alphabet, 1 + floor(random() * 36)::integer, 1);
  end loop;
  return base || '-' || random_part;
end;
$$;

comment on function public.story_slug_for(text) is
  'A public address for a story title: its web form plus six random characters (S1-E3-01).';
revoke execute on function public.story_slug_for(text) from public, anon, authenticated;

/**
 * set_story_tags: replaces a story's tags with the given names.
 * Inputs: target_story_id, owner_id (copied into story_tags.user_id), tag_names as typed.
 * Rules: each name is trimmed, empty ones dropped, look-alikes merged by normalise_tag(), at most
 *   10 kept (the trigger refuses more), each at most 40 characters. A new tag row keeps the name
 *   as first typed; an existing one is reused.
 * Errors: check_violation for more than 10 tags or a tag over 40 characters.
 * Internal: called by create_story() and (S1-E3-05) update_my_story().
 */
create or replace function public.set_story_tags(target_story_id uuid, owner_id uuid, tag_names text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  tag_name text;
  normalised text;
  seen text[] := '{}';
  tag_row_id uuid;
begin
  -- Step 1: start from a clean list, so the order and the merging are the same every time.
  delete from public.story_tags where story_tags.story_id = target_story_id;

  foreach tag_name in array coalesce(tag_names, '{}') loop
    -- Step 2: the one shared form; empty names and look-alikes of an earlier name are skipped.
    normalised := public.normalise_tag(tag_name);
    if normalised = '' or normalised = any (seen) then
      continue;
    end if;
    if char_length(normalised) > 40 then
      raise exception 'A tag can have at most 40 characters (S1-E3-01).' using errcode = 'check_violation';
    end if;
    seen := seen || normalised;

    -- Step 3: reuse the tag if anyone used it before, else keep it as this writer typed it.
    select tags.id into tag_row_id from public.tags where tags.normalised_name = normalised;
    if tag_row_id is null then
      insert into public.tags (name, normalised_name)
      values (regexp_replace(btrim(tag_name), '\s+', ' ', 'g'), normalised)
      returning tags.id into tag_row_id;
    end if;

    -- Step 4: link it; the trigger refuses an eleventh tag.
    insert into public.story_tags (story_id, tag_id, user_id) values (target_story_id, tag_row_id, owner_id);
  end loop;
end;
$$;

comment on function public.set_story_tags(uuid, uuid, text[]) is
  'Internal: replaces a story''s tags, merging look-alikes and keeping at most 10 (S1-E3-01).';
revoke execute on function public.set_story_tags(uuid, uuid, text[]) from public, anon, authenticated;

/**
 * check_story_cover: makes sure a cover choice is one the database accepts.
 * Input: cover, as JSON: {"kind": "automatic"} | {"kind": "drawn", "design", "background",
 *   "accent"} | {"kind": "upload", "tall_path", "square_path"?}.
 * Returns: nothing. Errors: check_violation for an unknown kind, a design or colour outside the
 *   approved lists, or an upload while picture_uploads is off (no picture uploads in the demo,
 *   decided 23 Oct 2026; the upload screen is its own story once S1-E10-05 exists).
 * Internal: the table constraints check the columns again, so this only gives plainer messages.
 */
create or replace function public.check_story_cover(cover jsonb)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  kind text := cover ->> 'kind';
begin
  if kind = 'automatic' then
    return;
  end if;
  if kind = 'drawn' then
    if cover ->> 'design' is null or cover ->> 'background' is null or cover ->> 'accent' is null then
      raise exception 'A drawn cover needs a design, a background colour and an accent colour (S1-E3-01).'
        using errcode = 'check_violation';
    end if;
    return;
  end if;
  if kind = 'upload' then
    if not public.is_feature_enabled('picture_uploads') then
      raise exception 'Picture uploads are switched off (picture_uploads flag; decided 23 Oct 2026).'
        using errcode = 'feature_not_supported';
    end if;
    if cover ->> 'tall_path' is null then
      raise exception 'An uploaded cover needs its tall picture first (S1-E3-01).' using errcode = 'check_violation';
    end if;
    return;
  end if;
  raise exception 'Unknown cover kind "%".', coalesce(kind, 'none') using errcode = 'check_violation';
end;
$$;

comment on function public.check_story_cover(jsonb) is
  'Internal: refuses a cover choice the rules don''t allow, with a plain message (S1-E3-01).';
revoke execute on function public.check_story_cover(jsonb) from public, anon, authenticated;

/* ---------- create_story() ---------- */

/**
 * create_story: makes a new story for the signed-in writer.
 * Inputs: title (1 to 120 characters), blurb (up to 500), language_code (one of
 *   open_story_languages()), category_slug, tag_names (up to 10, as typed), cover (see
 *   check_story_cover()).
 * Returns: {"outcome": "ok", "slug": "<public address>"} when the story was made, or
 *   {"outcome": "not_active"} when the account may not write yet (the account gate: email
 *   unconfirmed, no username, read-only while the test is adults only, and so on;
 *   architecture 1.7.8). Everything else is a mistake the form already prevents, so it raises:
 * Errors: insufficient_privilege when signed out; check_violation for a bad title, blurb,
 *   language, category, tag or cover; feature_not_supported for an upload while uploads are off.
 * Where it fits: NewStoryPage → useCreateStory → supabase.rpc('create_story') → here → the
 *   stories and story_tags rows → the writer's list (stories_select_own).
 */
create or replace function public.create_story(
  title text,
  blurb text,
  language_code text,
  category_slug text,
  tag_names text[],
  cover jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  chosen_category_id uuid;
  new_story_id uuid;
  new_slug text;
begin
  -- Step 1: a signed-in person who may write (the account gate; every write checks it).
  if caller_id is null then
    raise exception 'Sign in to create a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;

  -- Step 2: the basics, with messages a developer can act on (the form stops these earlier).
  if char_length(clean_title) not between 1 and 120 then
    raise exception 'A title needs 1 to 120 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  if char_length(clean_blurb) > 500 then
    raise exception 'A blurb can have at most 500 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  if language_code is null or language_code not in (select public.open_story_languages()) then
    raise exception 'Stories can be written only in an open language (S1-E3-01, architecture 1.7.9).'
      using errcode = 'check_violation';
  end if;
  select categories.id into chosen_category_id from public.categories where categories.slug = category_slug;
  if chosen_category_id is null then
    raise exception 'Unknown category "%" (S1-E3-01).', coalesce(category_slug, 'none') using errcode = 'check_violation';
  end if;
  if cardinality(coalesce(tag_names, '{}')) > 10 then
    raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
  end if;
  perform public.check_story_cover(cover);

  -- Step 3: the row, with a fresh address; a one-in-two-billion clash just picks another.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (
    user_id, slug, title, blurb, language_code, category_id,
    cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, cover_square_path
  ) values (
    caller_id, new_slug, clean_title, clean_blurb, language_code, chosen_category_id,
    (cover ->> 'kind')::public.cover_kind, cover ->> 'design', cover ->> 'background', cover ->> 'accent',
    cover ->> 'tall_path', cover ->> 'square_path'
  )
  returning stories.id into new_story_id;

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;

comment on function public.create_story(text, text, text, text, text[], jsonb) is
  'Makes a story for the signed-in writer: {outcome: ok, slug} or {outcome: not_active} (S1-E3-01).';
revoke execute on function public.create_story(text, text, text, text, text[], jsonb) from public, anon;
grant execute on function public.create_story(text, text, text, text, text[], jsonb) to authenticated;

/* ---------- Shared contract with the safety lane: is_moderated_away() ---------- */

/**
 * is_moderated_away: has a moderator hidden or removed this item? (Shared contract between
 * lanes, Lane C, S1-E10-01 onwards.) Every public read function for stories and chapters adds
 * "and not public.is_moderated_away(<type>, <id>)", so hide and remove work the day the
 * moderation tools land.
 * Inputs: item_type (a reportable_type), item_id. Returns: false for everything in this stub.
 * Guarded: created only when no function of that name exists yet, so Lane C's real one, whether
 * it lands before or after this migration, is never overwritten. Lane C replaces this stub with
 * `create or replace function public.is_moderated_away(public.reportable_type, uuid)`.
 */
do $$
begin
  if not exists (select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
                 where pg_namespace.nspname = 'public' and pg_proc.proname = 'is_moderated_away') then
    create function public.is_moderated_away(item_type public.reportable_type, item_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as 'select false';
    comment on function public.is_moderated_away(public.reportable_type, uuid) is
      'Stub (Lane A, S1-E3-01): nothing is moderated away yet; Lane C (S1-E10-01) replaces it.';
    revoke execute on function public.is_moderated_away(public.reportable_type, uuid) from public, anon;
    grant execute on function public.is_moderated_away(public.reportable_type, uuid) to authenticated;
  end if;
end;
$$;
