-- Migration: the home page's missing bands, the footer note and the forums highlight (bundle
-- LOOK-3, the design catch-up; board Website-Home; Robert's go, 6 Nov 2026, 06:43 UTC).
--
-- What it adds:
--   cms_band_problems()          the checks for one optional band of the home page: all empty
--                                hides it; once one field has words, the small label, heading,
--                                text and button are needed (30, 60, 300, 30 characters), the
--                                second button may stay empty, and the writers' band needs its
--                                four points (60 and 200)
--   cms_home_page_problems()     also checks writeBand, communityBand, firstStoryBand, appsBand
--                                and the optional footerNote (300)
--   cms_versions                 version 1 of the Romanian market's home page (user_id null) gains
--                                the bands and the footer note in ro and en, when it doesn't have
--                                them yet; a version an admin saved is never touched
--   public_forum_highlights()    for anyone, visitors included: the busiest threads this week in
--                                the platform's own forums and a few public spaces, for the
--                                home page's forums band
--
-- Who reads it: the home page (src/features/website/components/HomeBands.tsx, ForumsBand.tsx and
-- HomeFooter.tsx) and the staff Home page editor.
-- Rules it follows: website page text comes only from the CMS (CLAUDE.md rule 4; decided
-- 17 Oct 2026, 19:14), with {{productName}} for the product's name (names are settings). Claims
-- are true for the invited March test: no line about under-16 consent while S1-E2-03 is off
-- (consumer law, Law 363/2007). The forums highlight never lists a class space, a private space,
-- an under-16 space or anything inside a space, and never puts a person on show whom
-- may_spotlight_writer() would not (LOOK-4c's one rule; D4). The Romanian copy is a first draft
-- for Robert to read (Definition of Done).

/* ---------- 1. The checks ---------- */

/**
 * cms_band_problems: the checks for one optional home page band (LOOK-3). Internal.
 * Inputs: band, the band's content; field_prefix, its name in the content ("writeBand");
 *   has_points, whether it holds the four short points (the writers' band).
 * Returns: the problems, 'field:problem', in the editor's order; none when the band is empty.
 * Errors: none. Where it fits: cms_home_page_problems().
 */
create or replace function public.cms_band_problems(band jsonb, field_prefix text, has_points boolean)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := array[]::text[];
  every_word text := '';
  position integer;
begin
  -- Step 1: an empty band (every field blank) is hidden on the page, so nothing is needed.
  every_word := coalesce(band ->> 'eyebrow', '') || coalesce(band ->> 'heading', '')
    || coalesce(band ->> 'lede', '') || coalesce(band ->> 'button', '')
    || coalesce(band ->> 'secondaryButton', '');
  if has_points then
    for position in 0..3 loop
      every_word := every_word || coalesce(band -> 'points' -> position ->> 'title', '')
        || coalesce(band -> 'points' -> position ->> 'body', '');
    end loop;
  end if;
  if btrim(every_word) = '' then return problems; end if;
  -- Step 2: the band's own fields, so it never shows half written.
  problems := problems
    || public.cms_text_problem(band ->> 'eyebrow', field_prefix || '.eyebrow', 30)
    || public.cms_text_problem(band ->> 'heading', field_prefix || '.heading', 60)
    || public.cms_text_problem(band ->> 'lede', field_prefix || '.lede', 300)
    || public.cms_text_problem(band ->> 'button', field_prefix || '.button', 30);
  -- Step 3: the second button is optional, but has a limit.
  if char_length(coalesce(band ->> 'secondaryButton', '')) > 30 then
    problems := problems || (field_prefix || '.secondaryButton:too_long');
  end if;
  -- Step 4: the writers' band's four points.
  if has_points then
    for position in 0..3 loop
      problems := problems
        || public.cms_text_problem(band -> 'points' -> position ->> 'title', field_prefix || '.points.' || position || '.title', 60)
        || public.cms_text_problem(band -> 'points' -> position ->> 'body', field_prefix || '.points.' || position || '.body', 200);
    end loop;
  end if;
  return array_remove(problems, null);
end;
$$;

comment on function public.cms_band_problems(jsonb, text, boolean) is 'Internal: the checks for one optional home page band (LOOK-3).';
revoke execute on function public.cms_band_problems(jsonb, text, boolean) from public, anon, authenticated;

/**
 * cms_home_page_problems: the home page's field checks (S1-E11-06 criterion 5), with the "Your
 * rights" card (LOOK-2) and the four bands and the footer note (LOOK-3). Internal.
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
  -- Step 3: the "Your rights" card (LOOK-2): all empty hides it, otherwise all three are needed.
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
  -- Step 6: the four bands (LOOK-3), each optional, in the page's order.
  problems := problems
    || public.cms_band_problems(page -> 'writeBand', 'writeBand', true)
    || public.cms_band_problems(page -> 'communityBand', 'communityBand', false)
    || public.cms_band_problems(page -> 'firstStoryBand', 'firstStoryBand', false)
    || public.cms_band_problems(page -> 'appsBand', 'appsBand', false);
  -- Step 7: the footer note (LOOK-3), optional.
  if char_length(coalesce(page ->> 'footerNote', '')) > 300 then
    problems := problems || 'footerNote:too_long'::text;
  end if;
  return array_remove(problems, null);
end;
$$;

comment on function public.cms_home_page_problems(jsonb) is 'Internal: the home page''s field checks (S1-E11-06), with the optional "Your rights" card (LOOK-2), four bands and the footer note (LOOK-3).';
revoke execute on function public.cms_home_page_problems(jsonb) from public, anon, authenticated;

/* ---------- 2. The copy on version 1 ---------- */

-- Only version 1 (no admin, user_id null), and only where the bands are missing, so running the
-- migration on a database where staff already wrote their own changes nothing.
update public.cms_versions
set content = content || jsonb_build_object(
  'writeBand', jsonb_build_object(
    'eyebrow', 'Write here',
    'heading', 'Post your story one chapter at a time.',
    'lede', 'Write stories, poems or essays in your browser. Your draft saves as you type, and you choose when each chapter goes live. Use your own name or a pen name.',
    'button', 'Start writing',
    'secondaryButton', '',
    'points', jsonb_build_array(
      jsonb_build_object('title', 'Readers comment on paragraphs',
        'body', 'They comment on the exact paragraph they liked or didn’t understand, so you see what worked.'),
      jsonb_build_object('title', 'Spaces for your group',
        'body', 'Start a space for your writing group or book club. Teachers can start a private class space that only their class sees.'),
      jsonb_build_object('title', 'Ratings and labels',
        'body', 'Give your story a rating and content labels, so it reaches the right readers and nobody too young.'),
      jsonb_build_object('title', 'App only, if you want',
        'body', 'When the apps arrive, you can share a story in the apps only. That gives you more privacy and makes copying harder.'))),
  'communityBand', jsonb_build_object(
    'eyebrow', 'Community',
    'heading', 'Talk about stories in the forums.',
    'lede', 'The forums have categories and subforums for every kind of writing. Ask for feedback, swap chapters and talk about the books you’re reading. You can also start a space for your writing group or book club.',
    'button', 'Browse the forums',
    'secondaryButton', ''),
  'firstStoryBand', jsonb_build_object(
    'eyebrow', 'For new writers',
    'heading', 'Start your first story',
    'lede', 'Write chapter one of something new, in Romanian or English. Your draft saves as you type, and nobody sees it until you publish. It’s free, and you keep every right in your story.',
    'button', 'Join for free',
    'secondaryButton', 'Read the community guidelines'),
  'appsBand', jsonb_build_object(
    'eyebrow', 'The apps',
    'heading', 'Desktop and phone apps come later',
    'lede', '{{productName}} starts on the web, so you can read and write in your browser from day one. Free desktop and phone apps come after the web launch. They’ll let you read offline, use any font on your device and open the stories writers share in the apps only.',
    'button', 'Start on the web',
    'secondaryButton', ''),
  'footerNote', 'A free website for writing and reading stories, poems and essays. Apps come after the web launch. Writers keep the rights to their work, and there are no tracking ads. In Romanian and English.')
where content_kind = 'home_page' and entry_key = 'home' and market_code = 'RO'
  and language_code = 'en' and user_id is null and not content ? 'writeBand';

update public.cms_versions
set content = content || jsonb_build_object(
  'writeBand', jsonb_build_object(
    'eyebrow', 'Scrie aici',
    'heading', 'Publică-ți povestea capitol cu capitol.',
    'lede', 'Scrie povești, poezii sau eseuri în browser. Ciorna se salvează pe măsură ce scrii și tu alegi când apare fiecare capitol. Folosește numele tău sau un pseudonim.',
    'button', 'Începe să scrii',
    'secondaryButton', '',
    'points', jsonb_build_array(
      jsonb_build_object('title', 'Cititorii comentează pe paragrafe',
        'body', 'Comentează exact paragraful care le-a plăcut sau pe care nu l-au înțeles, așa că vezi ce a mers.'),
      jsonb_build_object('title', 'Spații pentru grupul tău',
        'body', 'Pornește un spațiu pentru grupul tău de scris sau clubul de carte. Profesorii pot porni un spațiu privat, pe care îl vede doar clasa lor.'),
      jsonb_build_object('title', 'Clasificări și etichete',
        'body', 'Dă-i poveștii o clasificare și etichete de conținut, ca să ajungă la cititorii potriviți și la nimeni prea tânăr.'),
      jsonb_build_object('title', 'Doar în aplicații, dacă vrei',
        'body', 'Când apar aplicațiile, poți publica o poveste doar acolo. Așa ai mai multă intimitate și e mai greu de copiat.'))),
  'communityBand', jsonb_build_object(
    'eyebrow', 'Comunitate',
    'heading', 'Vorbește despre povești pe forumuri.',
    'lede', 'Forumurile au categorii și subforumuri pentru orice fel de scris. Cere păreri, schimbă capitole și vorbește despre cărțile pe care le citești. Poți porni și un spațiu pentru grupul tău de scris sau clubul de carte.',
    'button', 'Vezi forumurile',
    'secondaryButton', ''),
  'firstStoryBand', jsonb_build_object(
    'eyebrow', 'Pentru scriitori noi',
    'heading', 'Începe prima ta poveste',
    'lede', 'Scrie primul capitol al unei povești noi, în română sau engleză. Ciorna se salvează pe măsură ce scrii și nimeni nu o vede până nu o publici. E gratuit și toate drepturile asupra poveștii rămân ale tale.',
    'button', 'Creează-ți cont gratuit',
    'secondaryButton', 'Citește regulile comunității'),
  'appsBand', jsonb_build_object(
    'eyebrow', 'Aplicațiile',
    'heading', 'Aplicațiile pentru desktop și telefon vin mai târziu',
    'lede', '{{productName}} pornește pe web, așa că poți citi și scrie în browser din prima zi. Aplicațiile gratuite pentru desktop și telefon vin după lansarea pe web. Cu ele vei putea citi offline, folosi orice font de pe dispozitiv și deschide poveștile publicate doar în aplicații.',
    'button', 'Începe pe web',
    'secondaryButton', ''),
  'footerNote', 'Un site gratuit pentru scris și citit povești, poezii și eseuri. Aplicațiile vin după lansarea pe web. Scriitorii păstrează drepturile asupra textelor lor și nu avem reclame care te urmăresc. În română și engleză.')
where content_kind = 'home_page' and entry_key = 'home' and market_code = 'RO'
  and language_code = 'ro' and user_id is null and not content ? 'writeBand';

/* ---------- 3. The forums highlight ---------- */

/**
 * public_forum_highlights: the home page's forums band, for anyone (LOOK-3; board Website-Home,
 * "Community").
 * Inputs: wanted_language, the page's language ('ro' or 'en'), for the forums' names.
 * Returns: JSON {
 *   threads: up to 4 of the busiest threads this week, each {forum_slug, forum_name, number,
 *     title, starter: {handle, display_name}, reply_count};
 *   spaces: up to 4 public spaces, each {slug, name}
 * }.
 * Only the platform's own forums count: never a thread inside any space, so never a class,
 * private or under-16 space. A space is listed only when it is open (not a class), everybody may
 * read it and it is for 16 and over. A thread or space is left out when its starter may not be put
 * on show (may_spotlight_writer(): active, their "Suggest me" switch on, 16 or over or the
 * parent's separate yes), when it is moderated away or deleted, and when the reader and the
 * starter block each other. No user ID leaves the function.
 * Errors: none. Where it fits: src/features/website/api/forumHighlights.ts.
 */
create or replace function public.public_forum_highlights(wanted_language text default 'ro')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    -- Step 1: threads in the platform's forums, busiest this week first.
    'threads', coalesce((
      select jsonb_agg(picked.card order by picked.recent_posts desc, picked.last_post_at desc)
      from (
        select jsonb_build_object(
            'forum_slug', forums.slug,
            'forum_name', (select names.name from public.forum_name_in(forums.id, wanted_language) as names),
            'number', threads.thread_number,
            'title', threads.title,
            'starter', public.forum_person_json(threads.user_id) - 'is_staff',
            'reply_count', greatest(public.forum_live_post_count(threads.id) - 1, 0)) as card,
          (select count(*) from public.forum_posts as posts
           where posts.thread_id = threads.id and posts.deleted_at is null
             and posts.created_at > now() - interval '7 days') as recent_posts,
          threads.last_post_at
        from public.forum_threads as threads
        join public.forums on forums.id = threads.forum_id
          and forums.deleted_at is null and forums.space_id is null
        where public.forum_thread_is_shown(threads)
          and not public.is_moderated_away('forum_thread', threads.id)
          and public.may_spotlight_writer(threads.user_id)
        order by recent_posts desc, threads.last_post_at desc
        limit 4
      ) as picked), '[]'::jsonb),
    -- Step 2: public spaces for 16 and over, most recently active first.
    'spaces', coalesce((
      select jsonb_agg(jsonb_build_object('slug', listed.slug, 'name', listed.name)
                       order by listed.active_at desc)
      from (
        select spaces.slug, spaces.name, public.space_latest_activity(spaces) as active_at
        from public.spaces
        where spaces.deleted_at is null and spaces.archived_at is null
          and spaces.kind = 'open' and spaces.readers = 'everybody' and spaces.age_group = '16_plus'
          and not public.is_moderated_away('space', spaces.id)
          and not public.is_blocked_with(spaces.user_id)
          and public.may_spotlight_writer(spaces.user_id)
        order by active_at desc nulls last
        limit 4
      ) as listed), '[]'::jsonb));
$$;

comment on function public.public_forum_highlights(text) is
  'The home page''s forums band for anyone: busy threads in the platform''s own forums and public 16+ spaces, never a class, private or under-16 space (LOOK-3).';
revoke execute on function public.public_forum_highlights(text) from public;
grant execute on function public.public_forum_highlights(text) to anon, authenticated;
