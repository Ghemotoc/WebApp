-- Migration: the new story form chooses the story's ID (story S1-E3-13, Automatic covers).
--
-- What it changes: create_story() takes an optional story_id, made by the form with
-- crypto.randomUUID(), so the form can show the automatic cover the story will get ("Right now:
-- Sky, picked for you automatically", board 4.2) before the story exists: the design is drawn
-- from the ID (src/components/covers/automaticCover.ts) and nothing is stored for it.
-- Why safe: a UUID from the browser is as random as one from the database, and the function
-- refuses one that is already taken (a unique violation becomes a plain error), so nobody can
-- take over another story's ID. Without a story_id the database makes one, as before.
-- Who calls it: useNewStoryForm → api/stories.ts → create_story(); test 101 covers both paths.

-- Postgres can't change a function's arguments in place, so the old one goes first.
drop function public.create_story(text, text, text, text, text[], jsonb);

/**
 * create_story: makes a new story for the signed-in writer.
 * Inputs: title (1 to 120 characters), blurb (up to 500), language_code (one of
 *   open_story_languages()), category_slug, tag_names (up to 10, as typed), cover (see
 *   check_story_cover()), story_id (optional: the form's UUID, so the automatic cover is known
 *   before the story exists, S1-E3-13).
 * Returns: {"outcome": "ok", "slug": "<public address>"} when the story was made, or
 *   {"outcome": "not_active"} when the account may not write yet (the account gate: email
 *   unconfirmed, no username, read-only while the test is adults only, and so on;
 *   architecture 1.7.8). Everything else is a mistake the form already prevents, so it raises:
 * Errors: insufficient_privilege when signed out; check_violation for a bad title, blurb,
 *   language, category, tag or cover, or a story_id already in use; feature_not_supported for an
 *   upload while uploads are off.
 * Where it fits: NewStoryPage → useCreateStory → supabase.rpc('create_story') → here → the
 *   stories and story_tags rows → the writer's list (stories_select_own).
 */
create or replace function public.create_story(
  title text,
  blurb text,
  language_code text,
  category_slug text,
  tag_names text[],
  cover jsonb,
  story_id uuid default null
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
  new_story_id uuid := coalesce(story_id, gen_random_uuid());
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
  -- The form's ID must be new: an ID in use (even of a deleted story) is refused, never reused.
  if exists (select 1 from public.stories where stories.id = new_story_id) then
    raise exception 'That story ID is already in use (S1-E3-13).' using errcode = 'check_violation';
  end if;

  -- Step 3: the row, with a fresh address; a one-in-two-billion clash just picks another.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (
    id, user_id, slug, title, blurb, language_code, category_id,
    cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, cover_square_path
  ) values (
    new_story_id, caller_id, new_slug, clean_title, clean_blurb, language_code, chosen_category_id,
    (cover ->> 'kind')::public.cover_kind, cover ->> 'design', cover ->> 'background', cover ->> 'accent',
    cover ->> 'tall_path', cover ->> 'square_path'
  );

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;

comment on function public.create_story(text, text, text, text, text[], jsonb, uuid) is
  'Makes a story for the signed-in writer: {outcome: ok, slug} or {outcome: not_active}; the form may choose the ID (S1-E3-01, S1-E3-13).';
revoke execute on function public.create_story(text, text, text, text, text[], jsonb, uuid) from public, anon;
grant execute on function public.create_story(text, text, text, text, text[], jsonb, uuid) to authenticated;
