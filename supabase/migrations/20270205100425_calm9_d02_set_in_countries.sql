-- Migration: "Set in", the countries a story takes place in, as its own field (CALM-9, board D02
-- New story, step 2 "Category, tags and setting"; Robert approved the CALM-9 page list, 23 Nov 2026).
--
-- What it adds:
-- - stories.set_in_countries: up to five two-letter country codes. Until now writers said where a
--   story happens with a tag such as "Set in Romania"; board D02: "'Set in Romania' is no longer a
--   tag. Store Set in as its own field (country codes), not as tags."
-- - set_my_story_set_in_countries(): the writer's own setting, from the new story wizard and from
--   story settings, written to every edition of the story (TRANSLATE-1a: editions are one story).
-- - A one-off move of today's "set in <country>" tags into the new field. A tag whose country we
--   can't name with certainty stays a tag, so no writer loses words.
--
-- Who calls it: src/features/writing/api/stories.ts (createStory() and updateMyStory(), after the
-- story itself is saved). Personal data: none; it describes the story, not the writer.

-- Step 1: the column. ISO 3166-1 alpha-2 codes in capitals, at most five (the board's limit).
alter table public.stories
  add column set_in_countries text[] not null default '{}',
  add constraint stories_set_in_countries_are_codes check (
    cardinality(set_in_countries) <= 5
    and array_to_string(set_in_countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');

comment on column public.stories.set_in_countries is
  'The countries the story takes place in, at most five, shown as "Set in" (CALM-9, board D02).';

/**
 * set_my_story_set_in_countries: the writer says which countries their story is set in.
 *
 * Inputs: the story's address and the countries (an empty list clears it).
 * Returns: {"outcome": "ok" | "not_active" | "not_found"}.
 * Raises insufficient_privilege when signed out; check_violation for a bad code (hint
 *   'invalid_country', from clean_country_codes()) or more than five (hint 'too_many_countries').
 * Where it fits: createStory() and updateMyStory() in src/features/writing/api/stories.ts.
 */
create or replace function public.set_my_story_set_in_countries(story_slug text, countries text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  family_story_id uuid;
  -- clean_country_codes() makes capitals, drops repeats and refuses anything not two letters.
  cleaned text[] := public.clean_country_codes(countries);
begin
  -- Step 1: at most five countries (board D02).
  if cardinality(cleaned) > 5 then
    raise exception 'Choose at most 5 countries.' using errcode = 'check_violation', hint = 'too_many_countries';
  end if;
  -- Step 2: a signed-in writer who may write, and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 3: save it on the original and every edition, so each language says the same.
  select coalesce(stories.edition_of_story_id, stories.id) into family_story_id
  from public.stories where stories.id = target_story_id;
  update public.stories set set_in_countries = cleaned
  where stories.id = family_story_id or stories.edition_of_story_id = family_story_id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_my_story_set_in_countries(text, text[]) is
  'The writer sets the countries their story takes place in, at most five (CALM-9, board D02).';
revoke all on function public.set_my_story_set_in_countries(text, text[]) from public;
grant execute on function public.set_my_story_set_in_countries(text, text[]) to authenticated;

-- Step 4: move today's "set in <country>" tags into the field. Tags are kept in their normalised
-- form (normalise_tag(): lower case, no accents), so "Set in Romania" is "set in romania". The
-- names below are the English names writers use most, the launch markets first (UK, IE, US, CA,
-- AU, NZ, SE, DK, NO, RO, MD), and the Romanian names of the Nordic markets and Moldova. Anything else stays a tag; the writer can move it by hand in story settings.
-- The same list is used twice (Step 4a adds, Step 4b removes), so it is a small function for this
-- migration only; pg_temp drops it when the migration's session ends.
create function pg_temp.set_in_tag_moves()
returns table (story_id uuid, tag_id uuid, country_code text)
language sql
stable
as $$
  with country_names (tag_country, country_code) as (values
  ('romania', 'RO'), ('moldova', 'MD'), ('republica moldova', 'MD'), ('republic of moldova', 'MD'),
  ('united kingdom', 'GB'), ('the uk', 'GB'), ('uk', 'GB'), ('britain', 'GB'), ('great britain', 'GB'),
  ('england', 'GB'), ('scotland', 'GB'), ('wales', 'GB'), ('northern ireland', 'GB'),
  ('ireland', 'IE'), ('united states', 'US'), ('the united states', 'US'), ('usa', 'US'),
  ('the usa', 'US'), ('america', 'US'), ('canada', 'CA'), ('australia', 'AU'),
  ('new zealand', 'NZ'), ('sweden', 'SE'), ('suedia', 'SE'), ('denmark', 'DK'), ('danemarca', 'DK'),
  ('norway', 'NO'), ('norvegia', 'NO'), ('finland', 'FI'), ('iceland', 'IS'), ('germany', 'DE'),
  ('france', 'FR'), ('italy', 'IT'), ('spain', 'ES'), ('portugal', 'PT'), ('greece', 'GR'),
  ('hungary', 'HU'), ('bulgaria', 'BG'), ('serbia', 'RS'), ('ukraine', 'UA'), ('poland', 'PL'),
  ('austria', 'AT'), ('switzerland', 'CH'), ('the netherlands', 'NL'), ('netherlands', 'NL'),
  ('belgium', 'BE'), ('russia', 'RU'), ('turkey', 'TR'), ('japan', 'JP'), ('china', 'CN'),
  ('india', 'IN'), ('egypt', 'EG'), ('mexico', 'MX'), ('brazil', 'BR'), ('argentina', 'AR'))
  select story_tags.story_id, story_tags.tag_id, country_names.country_code
  from public.story_tags
  join public.tags on tags.id = story_tags.tag_id
  join country_names
    on country_names.tag_country = btrim(substring(tags.normalised_name from '^set in (.+)$'));
$$;

-- Step 4a: add the countries to each story, keeping the first five in alphabetical order.
update public.stories
set set_in_countries = (
  select coalesce(array_agg(code order by code), '{}'::text[])
  from (
    select distinct moves.country_code as code
    from pg_temp.set_in_tag_moves() as moves where moves.story_id = stories.id
    order by 1 limit 5
  ) as chosen)
where stories.id in (select moves.story_id from pg_temp.set_in_tag_moves() as moves);

-- Step 4b: a tag whose country is now in the field comes off the story (a sixth country keeps its
-- tag, so nothing is lost). The tag itself stays in the catalogue.
delete from public.story_tags
using pg_temp.set_in_tag_moves() as moves, public.stories
where story_tags.story_id = moves.story_id
  and story_tags.tag_id = moves.tag_id
  and stories.id = moves.story_id
  and moves.country_code = any(stories.set_in_countries);
