-- BOOKS-A10: the campaign landing page as on board A10 (user story 1.10, Robert's request of
-- 25 Nov 2026 to build every bundle of the user stories).
--
-- What it adds:
-- 1. Four optional hero fields, in each language: a kicker line above the title ("Writing month
--    · 1 to 30 November"), the title's second line drawn in violet ("in November."), the
--    visitor's button ("Join for free") and the member's button ("Join writing month"). The
--    hero also takes a shared link (where the member's button goes, and where a new member lands
--    after joining) and a shared "live_count" switch; neither needs a text rule.
-- 2. A hero with a button needs a link that is one of our pages or an https address, the same
--    rule the Rules block and the call to action follow (S1-E11-34).
-- 3. landing_words_this_month(): the words every writer wrote this month, for the hero's live
--    count ("21.6M words written so far this month"). A total only, never one writer's words: it
--    says nothing while fewer than five writers wrote this month, the same "fewer than 5" rule as
--    the writer's numbers (architecture 1.7.4, 4.1).
-- Who calls it: landing_page_problems() calls the field rules and the block checks; the public
-- landing page calls landing_words_this_month() through the API.

/* ---------- 1. The hero's new fields ---------- */

/**
 * landing_block_field_rules: the text fields of every block kind with their limits (S1-E11-14),
 * now with the hero's kicker, the title's second line and its two buttons (BOOKS-A10). The same
 * table is landingFieldRules in src/schemas/landingPages.ts.
 * Inputs: none. Returns one row per kind and field. Called by landing_page_problems().
 */
create or replace function public.landing_block_field_rules()
returns table (block_kind text, field_name text, longest integer, is_required boolean)
language sql
immutable
set search_path = ''
as $$
  values
    ('hero', 'title', 80, true), ('hero', 'intro', 300, false),
    -- BOOKS-A10: the kicker, the violet second line and the two buttons, all optional.
    ('hero', 'kicker', 80, false), ('hero', 'title_accent', 80, false),
    ('hero', 'button_label', 40, false), ('hero', 'member_button_label', 40, false),
    ('text', 'heading', 80, true), ('text', 'body', 4000, true),
    ('key_dates', 'heading', 80, true), ('key_dates', 'note', 300, false),
    ('who_can_enter', 'heading', 80, true), ('who_can_enter', 'body', 1000, true),
    ('prize', 'heading', 80, true), ('prize', 'body', 1000, true),
    ('how_to_enter', 'heading', 80, true), ('how_to_enter', 'body', 2000, true),
    ('rules', 'heading', 80, true), ('rules', 'body', 1000, false), ('rules', 'link_label', 80, true),
    ('questions', 'heading', 80, true),
    ('featured', 'heading', 80, true), ('featured', 'intro', 300, false),
    ('remind_me', 'heading', 80, true), ('remind_me', 'intro', 300, false),
    ('picture_text', 'heading', 80, true), ('picture_text', 'body', 2000, true),
    ('cards', 'heading', 80, true),
    ('steps', 'heading', 80, true),
    ('quote', 'quote', 300, true), ('quote', 'source', 80, false),
    ('call_to_action', 'heading', 80, true), ('call_to_action', 'body', 300, false),
    ('call_to_action', 'button_label', 40, true);
$$;

/* ---------- 2. A hero's buttons need a link ---------- */

-- The block checks so far keep their body under a new name; the old name now adds the hero's
-- check on top, so landing_page_problems() needs no change.
alter function public.landing_block_extra_problems(jsonb, text)
  rename to landing_block_extra_problems_before_hero;

comment on function public.landing_block_extra_problems_before_hero(jsonb, text) is
  'Internal: a landing page block''s problems beyond its text fields, before the hero''s buttons (S1-E11-14 to S1-E11-34).';

/**
 * landing_block_extra_problems: a block's problems beyond its text fields (S1-E11-14), now also
 * a hero whose button has no safe link (BOOKS-A10).
 * Inputs: the block as JSON and its path ("blocks.0"). Returns problem codes such as
 * "blocks.0.link:empty". Raises nothing. Called by landing_page_problems().
 */
create or replace function public.landing_block_extra_problems(block jsonb, block_path text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := public.landing_block_extra_problems_before_hero(block, block_path);
  hero_link text := btrim(coalesce(block ->> 'link', ''));
  has_button boolean;
begin
  if block ->> 'kind' <> 'hero' then
    return problems;
  end if;
  -- Step 1: a hero needs a link only when either language shows a button.
  has_button := btrim(coalesce(block #>> '{ro,button_label}', '')) <> ''
    or btrim(coalesce(block #>> '{en,button_label}', '')) <> ''
    or btrim(coalesce(block #>> '{ro,member_button_label}', '')) <> ''
    or btrim(coalesce(block #>> '{en,member_button_label}', '')) <> '';
  if not has_button then
    return problems;
  end if;
  -- Step 2: the same rule as a call to action: one of our pages or an https address, never "//".
  if hero_link = '' then
    problems := problems || (block_path || '.link:empty');
  elsif hero_link !~ '^(/([a-z0-9_-][a-z0-9/_-]*)?|https://[^\s]+)$' then
    problems := problems || (block_path || '.link:bad_link');
  end if;
  return problems;
end;
$$;

comment on function public.landing_block_extra_problems(jsonb, text) is
  'Internal: a landing page block''s problems beyond its text fields, a hero''s button link included (S1-E11-14, BOOKS-A10).';

revoke all on function public.landing_block_extra_problems(jsonb, text) from public;
revoke all on function public.landing_block_extra_problems_before_hero(jsonb, text) from public;

/* ---------- 3. The live count ---------- */

/**
 * landing_words_this_month: the words every writer wrote this month, Romanian time, for a
 * landing page's live count (BOOKS-A10, board A10 "Live count").
 * Inputs: none. Returns the total, or null while fewer than five writers wrote this month, so
 * the number never stands for one writer's words. Raises nothing.
 * Who calls it: the public landing page (fetchLandingWordsThisMonth), every minute.
 * It reads writing_days, which only its writer may read, so it runs as its owner and returns a
 * total only.
 */
create or replace function public.landing_words_this_month()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(distinct writing_days.user_id) < 5 then null
              else coalesce(sum(writing_days.words), 0)::bigint end
  from public.writing_days
  where writing_days.day >= date_trunc('month', public.romania_today())::date;
$$;

comment on function public.landing_words_this_month() is
  'The words every writer wrote this month, for a landing page''s live count; null under five writers (BOOKS-A10).';

revoke all on function public.landing_words_this_month() from public;
grant execute on function public.landing_words_this_month() to anon, authenticated;
