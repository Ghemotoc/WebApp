-- Migration: the gold "Your rights" card on the home page's cover wall (bundle LOOK-2, the design
-- catch-up; board Website-Home; Robert gave the go on 6 Nov 2026, 06:43 UTC).
--
-- What it changes:
--   cms_home_page_problems()   also checks the optional rightsCard (small label, title and line):
--                              all three empty hides the card; otherwise all three are needed,
--                              within 30, 60 and 60 characters
--   cms_versions               version 1 of the Romanian market's home page (user_id null, the
--                              copy seeded by 20261101100004) gains the card in ro and en, when it
--                              doesn't have one yet; a version an admin saved is never touched
--
-- Who reads it: the home page (src/features/website/components/HeroCollage.tsx) through the
-- published CMS view, and the staff Home page editor, which shows the three fields.
-- Rules it follows: website page text comes only from the CMS (CLAUDE.md rule 4; decided
-- 17 Oct 2026, 19:14); the product name stays the {{productName}} placeholder. The Romanian
-- copy is a first draft for Robert to read (Definition of Done).

/**
 * cms_home_page_problems: the home page's field checks (S1-E11-06 criterion 5, with the
 * proposed limits), now with the "Your rights" card (LOOK-2). Internal.
 * Inputs: page, the content. Returns: the problems, 'field:problem', in the editor's order.
 * Errors: none. Where it fits: cms_content_problems() → admin_publish_cms_version().
 */
create or replace function public.cms_home_page_problems(page jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := array[]::text[];
  headline text := coalesce(page ->> 'headlineFirst', '') || ' ' || coalesce(page ->> 'headlineSecond', '');
  rights_card jsonb := coalesce(page -> 'rightsCard', '{}'::jsonb);
  position integer;
begin
  -- Step 1: the hero (limits proposed in S1-E11-06: 50, 40 across both lines, 170, 20, 30).
  problems := problems || public.cms_text_problem(page ->> 'eyebrow', 'eyebrow', 50)
    || public.cms_text_problem(page ->> 'headlineFirst', 'headlineFirst', 40)
    || public.cms_text_problem(page ->> 'headlineSecond', 'headlineSecond', 40);
  if char_length(btrim(headline)) > 40 then problems := problems || 'headlineSecond:too_long'::text; end if;
  if position(coalesce(page ->> 'underlinedWord', '') in headline) = 0 or coalesce(page ->> 'underlinedWord', '') = '' then
    problems := problems || 'underlinedWord:not_in_headline'::text;
  end if;
  problems := problems || public.cms_text_problem(page ->> 'lede', 'lede', 170)
    || public.cms_text_problem(page ->> 'primaryButton', 'primaryButton', 20)
    || public.cms_text_problem(page ->> 'secondaryButton', 'secondaryButton', 20);
  -- Step 2: the three short points.
  for position in 0..2 loop
    problems := problems || public.cms_text_problem(page -> 'points' ->> position, 'points.' || position, 30);
  end loop;
  -- Step 3: the "Your rights" card (LOOK-2). Optional: all three empty means no card; once one
  -- field has words, all three are needed, so the card never shows half written.
  if btrim(coalesce(rights_card ->> 'eyebrow', '') || coalesce(rights_card ->> 'title', '')
       || coalesce(rights_card ->> 'body', '')) <> '' then
    problems := problems
      || public.cms_text_problem(rights_card ->> 'eyebrow', 'rightsCard.eyebrow', 30)
      || public.cms_text_problem(rights_card ->> 'title', 'rightsCard.title', 60)
      || public.cms_text_problem(rights_card ->> 'body', 'rightsCard.body', 60);
  end if;
  -- Step 4: why write here, four cards.
  problems := problems || public.cms_text_problem(page ->> 'whyHeading', 'whyHeading', 60);
  for position in 0..3 loop
    problems := problems
      || public.cms_text_problem(page -> 'whyCards' -> position ->> 'title', 'whyCards.' || position || '.title', 60)
      || public.cms_text_problem(page -> 'whyCards' -> position ->> 'body', 'whyCards.' || position || '.body', 260);
  end loop;
  -- Step 5: the safety block and the questions heading.
  problems := problems || public.cms_text_problem(page ->> 'safetyHeading', 'safetyHeading', 60);
  for position in 0..1 loop
    problems := problems || public.cms_text_problem(page -> 'safetyLines' ->> position, 'safetyLines.' || position, 200);
  end loop;
  problems := problems || public.cms_text_problem(page ->> 'questionsHeading', 'questionsHeading', 60);
  return array_remove(problems, null);
end;
$$;

comment on function public.cms_home_page_problems(jsonb) is 'Internal: the home page''s field checks (S1-E11-06), with the optional "Your rights" card (LOOK-2).';
revoke execute on function public.cms_home_page_problems(jsonb) from public, anon, authenticated;

/* ---------- The card's copy on version 1 ---------- */

-- Only version 1 (no admin, user_id null), and only where the card is missing, so running the
-- migration on a database where staff already wrote their own card changes nothing.
update public.cms_versions
set content = content || jsonb_build_object('rightsCard', jsonb_build_object(
  'eyebrow', 'Your rights',
  'title', 'You keep all the rights to your work',
  'body', 'Publish it anywhere else too'))
where content_kind = 'home_page' and entry_key = 'home' and market_code = 'RO'
  and language_code = 'en' and user_id is null and not content ? 'rightsCard';

update public.cms_versions
set content = content || jsonb_build_object('rightsCard', jsonb_build_object(
  'eyebrow', 'Drepturile tale',
  'title', 'Toate drepturile asupra textelor tale rămân ale tale',
  'body', 'Le poți publica și oriunde altundeva'))
where content_kind = 'home_page' and entry_key = 'home' and market_code = 'RO'
  and language_code = 'ro' and user_id is null and not content ? 'rightsCard';
