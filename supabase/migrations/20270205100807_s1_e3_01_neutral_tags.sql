/*
 * Migration: only neutral tags are suggested; a place belongs in "Set in" (story S1-E3-01;
 * Robert, 26 Nov 2026, 20:35 UTC: "Also, from tags, remove setting Romania. Keep only neutral
 * tags. Because, for example, the country can be selected in Set In, which is a section in the
 * wizard.").
 *
 * What it does:
 * - Step 1: "Set in Romania", and any other "set in <place>" tag, is no longer a recommended
 *   tag, so the tag box doesn't suggest it and onboarding doesn't offer it as a topic. The tag
 *   stays approved in the catalogue, so no story loses a tag it carries and its page keeps
 *   working. The other recommended tags are neutral (City and Village name a kind of place, not
 *   a place) and stay as they are.
 * - Step 2: a story that still carries a "set in <country>" tag (added after CALM-9 moved the
 *   first ones, 20270205100425) gets that country in stories.set_in_countries and loses the
 *   tag, with the same country names as CALM-9. A story is changed only when every country fits
 *   in the field (at most five, counting the ones already there); otherwise it is left alone and
 *   keeps its tags, so nothing is lost or guessed.
 *
 * Who it affects: TagSuggestions (the recommended tags under the tag box), onboarding's topics
 * (s1_e2_06_onboarding: approved and recommended tags) and the stories moved in Step 2.
 * Tests: supabase/tests/database/421-neutral-tags.test.sql.
 */

-- Step 1: no place tag is suggested. normalise_tag() makes every look-alike "set in <place>".
update public.tags
set is_recommended = false
where is_recommended and normalised_name ~ '^set in ';

-- Step 2: the tags still on stories that name a country, as (story, tag, country). The list is
-- the one CALM-9 used (20270205100425, Step 4); pg_temp drops the function when this
-- migration's session ends.
create function pg_temp.place_tag_moves()
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

-- Step 2a: each story's countries after the move: the ones it has plus the ones its tags name,
-- in alphabetical order, worked out once into a temporary table.
create temporary table place_tag_targets as
select stories.id as story_id,
  array(
    select distinct code from (
      select unnest(stories.set_in_countries) as code
      union
      select moves.country_code from pg_temp.place_tag_moves() as moves
      where moves.story_id = stories.id) as both_lists
    order by code) as countries
from public.stories
where stories.id in (select moves.story_id from pg_temp.place_tag_moves() as moves);

-- Step 2b: only where everything fits in "Set in" (five at most); the rest stay as they are.
delete from place_tag_targets where cardinality(place_tag_targets.countries) > 5;

update public.stories
set set_in_countries = place_tag_targets.countries
from place_tag_targets
where stories.id = place_tag_targets.story_id;

-- Step 2c: the moved tags come off those stories. The tags stay in the catalogue.
delete from public.story_tags
using pg_temp.place_tag_moves() as moves, place_tag_targets
where story_tags.story_id = moves.story_id
  and story_tags.tag_id = moves.tag_id
  and place_tag_targets.story_id = moves.story_id;

-- The working table isn't needed any more.
drop table place_tag_targets;
