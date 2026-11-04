-- Database tests for sponsor campaigns, the minors check and "Sponsored" ads (story S1-E12-02;
-- bundle SPONSORS-b1).
-- What it proves:
-- - anyone reads what we never advertise (ad_blocked_categories_select_all, allowed and denied);
--   the fixed categories can't be removed, a staff-added one can, and only owner and admin
--   change the list;
-- - only owner and admin read sponsors and campaigns (sponsors_select_sponsor_staff and
--   sponsor_campaigns_select_sponsor_staff, allowed and denied) and manage them;
-- - criterion 1: a campaign holds the sponsor, a creative with alt text, a link, a placement and
--   dates; a tracking link, a missing picture or missing dates keep it out of review;
-- - the creative's upload and who reads it (sponsor_creatives_insert_sponsor_staff,
--   sponsor_creatives_select_visible and sponsor_creatives_select_uploader_and_staff, allowed
--   and denied), and a moderator approves every creative;
-- - criterion 2: approval needs every check, the minors check included, and an approved picture;
--   any later change sends it back to draft;
-- - the approved campaign fills its slot labelled "sponsored", only on pages that match the
--   page's context, the same for a visitor and a signed-in teenager, never twice on a page;
-- - criterion 3: "Sponsored by" names the sponsor of a category;
-- - criterion 4: no placement can point at a class space.
-- Personas: adult_writer (…01), teen_17 (…02), admin (…09), moderator (…10).
-- Test data: made here; rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- A visitor who isn't signed in: the anon role and no user in the claims.
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "anon"}', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

create temporary table kept (label text primary key, id uuid, value text) on commit drop;
grant all on kept to authenticated, anon;

update public.feature_flags set is_enabled = true where key = 'picture_uploads';
-- No other live landing page, so the house ads are the built-in ones.
update public.landing_pages set archived_at = now() where archived_at is null;

/* ---------- 1. What we never advertise ---------- */

select pg_temp.as_visitor();
select ok((select count(*) from public.ad_blocked_categories where category_key in
  ('gambling', 'tobacco_nicotine', 'alcohol', 'politics', 'dating') and is_fixed) = 5,
  'allowed: ad_blocked_categories_select_all (a visitor reads what we never advertise)');
select throws_ok($$ insert into public.ad_blocked_categories (category_key, label_ro, label_en) values ('crypto', 'Cripto', 'Crypto') $$,
  '42501', null, 'denied: ad_blocked_categories_select_all (nobody adds a category directly)');
reset role;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_remove_ad_blocked_category('alcohol', 'A brewery asked') $$,
  '23514', null, 'alcohol can never be removed from the list');
select lives_ok($$ select public.admin_remove_ad_blocked_category('weight_loss', 'Covered by health rules') $$,
  'an admin removes a category staff added');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_add_ad_blocked_category('crypto', 'Cripto', 'Crypto') $$,
  '42501', null, 'a moderator can''t change what we never advertise');

/* ---------- 2. Sponsors ---------- */

select throws_ok($$ select public.admin_save_sponsor(null, 'Librăria Test', 'https://librarie.example') $$,
  '42501', null, 'a moderator can''t add a sponsor');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('sponsor', public.admin_save_sponsor(null, 'Librăria Test', 'https://librarie.example'));
select is((select name from public.sponsors where id = (select id from kept where label = 'sponsor')), 'Librăria Test',
  'allowed: sponsors_select_sponsor_staff (an admin reads the sponsor they added)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.sponsors), 0,
  'denied: sponsors_select_sponsor_staff (a moderator sees no sponsors)');

/* ---------- 3. A campaign and what it needs (criterion 1) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, value) values ('fields', jsonb_build_object(
  'sponsor_id', (select id from kept where label = 'sponsor'), 'name', 'Săptămâna permisului de bibliotecă',
  'placement', 'discover_banner', 'target_categories', jsonb_build_array('fiction'),
  'target_languages', jsonb_build_array('ro'),
  'text_ro', 'Permis de bibliotecă gratuit săptămâna aceasta.', 'text_en', 'Get a free library card this week.',
  'link_url', 'https://librarie.example/permis?utm_source=app',
  'starts_on', public.romania_today()::text, 'ends_on', (public.romania_today() + 7)::text)::text);
insert into kept (label, id, value)
select 'campaign', (saved ->> 'id')::uuid, saved ->> 'problems'
from (select public.admin_save_sponsor_campaign(null, (select value::jsonb from kept where label = 'fields')) as saved) as result;
select is((select value::jsonb from kept where label = 'campaign'), '["picture:missing", "link:tracking"]'::jsonb,
  'a banner needs a picture, and a link with tracking parameters is refused');
select is(pg_temp.hint_of(format($$ select public.admin_submit_sponsor_campaign(%L) $$, (select id from kept where label = 'campaign'))),
  'picture:missing,link:tracking', 'an incomplete campaign can''t go to review');
select is(public.sponsor_link_problem('https://shop.example/p?aff=42'), 'link:tracking', 'an affiliate link is refused');
select is(public.sponsor_link_problem('http://shop.example/'), 'link:not_https', 'a link must be https');

/* ---------- 4. The creative's picture ---------- */

insert into kept (label, value)
select 'path', id::text || '/' || gen_random_uuid()::text || '.png' from kept where label = 'campaign';
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('sponsor-creatives', %L, '00000000-0000-4000-8000-000000000009') $$, (select value from kept where label = 'path')),
  'allowed: sponsor_creatives_insert_sponsor_staff lets an admin upload under a draft campaign');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner_id)
  values ('sponsor-creatives', %L, '00000000-0000-4000-8000-000000000010') $$,
  (select id::text from kept where label = 'campaign') || '/' || gen_random_uuid()::text || '.png'),
  '42501', null, 'denied: sponsor_creatives_insert_sponsor_staff refuses a moderator');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into kept (label, id) values ('picture', public.register_sponsor_creative((select value from kept where label = 'path')));
reset role;
select ok(public.picture_needs_person((select picture_checks from public.picture_checks where id = (select id from kept where label = 'picture'))),
  'every sponsor creative waits for a moderator, because ads reach every age');

select pg_temp.as_visitor();
select is((select count(*)::integer from storage.objects where bucket_id = 'sponsor-creatives'), 0,
  'denied: sponsor_creatives_select_visible hides a creative still being checked from visitors');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from storage.objects where bucket_id = 'sponsor-creatives'), 1,
  'allowed: sponsor_creatives_select_uploader_and_staff lets the uploader read it while it is checked');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'sponsor-creatives'), 0,
  'denied: sponsor_creatives_select_uploader_and_staff hides it from a member');

/* ---------- 5. The review (criterion 2) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
-- The admin adds alt text and a clean link; the picture stays on the campaign.
select public.admin_save_sponsor_campaign((select id from kept where label = 'campaign'),
  (select value::jsonb from kept where label = 'fields') || jsonb_build_object(
    'alt_ro', 'O fată citește într-o bibliotecă.', 'alt_en', 'A girl reading in a library.',
    'link_url', 'https://librarie.example/permis'));
select public.admin_submit_sponsor_campaign((select id from kept where label = 'campaign'));
select is((select state::text from public.sponsor_campaigns where id = (select id from kept where label = 'campaign')),
  'in_review', 'allowed: sponsor_campaigns_select_sponsor_staff (an admin reads the campaign in review)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.sponsor_campaigns), 0,
  'denied: sponsor_campaigns_select_sponsor_staff (a moderator sees no campaigns)');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of(format($$ select public.admin_review_sponsor_campaign(%L, 'approve',
  array['alt_text_describes', 'link_goes_to_sponsor', 'text_makes_sense'], '') $$, (select id from kept where label = 'campaign'))),
  'checks:missing', 'approval needs the minors check ticked with the others');
select is(pg_temp.hint_of(format($$ select public.admin_review_sponsor_campaign(%L, 'approve', public.sponsor_review_checks(), '') $$,
  (select id from kept where label = 'campaign'))),
  'picture:not_checked', 'approval waits until a moderator has approved the picture');
reset role;
update public.picture_checks set status = 'approved' where id = (select id from kept where label = 'picture');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_review_sponsor_campaign((select id from kept where label = 'campaign'), 'approve', public.sponsor_review_checks(), '');

/* ---------- 6. On the pages ---------- */

select pg_temp.as_visitor();
select is((select count(*)::integer from storage.objects where bucket_id = 'sponsor-creatives'), 1,
  'allowed: sponsor_creatives_select_visible lets a visitor read the approved creative');
insert into kept (label, value) values ('visitor', public.page_ads('discover', '{"category": "fiction", "language": "ro"}')::text);
select is((select value::jsonb #>> '{0,ad,label}' || ' · ' || (value::jsonb #>> '{0,ad,sponsor_name}') from kept where label = 'visitor'),
  'sponsored · Librăria Test', 'the approved campaign fills Discover''s banner, labelled Sponsored with the sponsor''s name');
select is((select value::jsonb #>> '{1,ad,label}' from kept where label = 'visitor'), 'house',
  'the other slot gets one of our own ads, never the same campaign twice');
select is(public.page_ads('discover', '{"category": "fiction", "language": "en"}') #>> '{0,ad,label}', 'house',
  'a page in another language doesn''t match the campaign');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.page_ads('discover', '{"category": "fiction", "language": "ro"}'),
  (select value::jsonb from kept where label = 'visitor'), 'a signed-in teenager sees exactly what a visitor sees');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_save_sponsor_campaign((select id from kept where label = 'campaign'),
  (select value::jsonb from kept where label = 'fields') || jsonb_build_object(
    'alt_ro', 'O fată citește.', 'alt_en', 'A girl reading.', 'link_url', 'https://librarie.example/permis'));
select is(public.page_ads('discover', '{"category": "fiction", "language": "ro"}') #>> '{0,ad,label}', 'house',
  'changing an approved campaign takes it off the pages until it is reviewed again');

/* ---------- 7. "Sponsored by" and class spaces (criteria 3 and 4) ---------- */

insert into kept (label, id)
select 'credit', (public.admin_save_sponsor_campaign(null, jsonb_build_object(
  'sponsor_id', (select id from kept where label = 'sponsor'), 'name', 'Poezia, sponsorizată',
  'placement', 'category', 'category_slug', 'poetry',
  'starts_on', public.romania_today()::text, 'ends_on', (public.romania_today() + 30)::text)) ->> 'id')::uuid;
select public.admin_submit_sponsor_campaign((select id from kept where label = 'credit'));
select public.admin_review_sponsor_campaign((select id from kept where label = 'credit'), 'approve', public.sponsor_review_checks(), '');
select pg_temp.as_visitor();
select is(public.sponsor_credit('category', 'poetry') ->> 'sponsor_name', 'Librăria Test',
  'the poetry category shows "Sponsored by" with the sponsor''s name');
select is(public.sponsor_credit('category', 'fiction'), null, 'a category nobody sponsors has no credit');
reset role;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok(format($$ select public.admin_save_sponsor_campaign(null, %L) $$, jsonb_build_object(
  'sponsor_id', (select id from kept where label = 'sponsor'), 'name', 'In a class', 'placement', 'class_space')),
  '22P02', null, 'no placement can put a sponsor or a credit in a class space');
select throws_ok(format($$ select public.admin_review_sponsor_campaign(%L, 'send_back', '{}', '') $$, (select id from kept where label = 'campaign')),
  '23514', null, 'a campaign that isn''t in review can''t be decided on');

select * from finish();
rollback;
