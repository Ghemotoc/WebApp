-- Database tests for staff changing a story (bundle ADMIN-2, part b1; story S1-E11-08, part 08a).
-- What it proves:
-- - only owner, admin and moderator change a story; support, the content editor and a member are
--   refused by the server (criterion "support or content editor");
-- - every change needs a reason from the list and a few words (criterion 2);
-- - a change that restricts nothing (a corrected category, tags, comments) tells the writer with
--   a notification saying what changed and why (criterion 4); a raised rating, a restriction or a
--   hide sends a statement of reasons (criterion 3);
-- - every change is stored as a version and in the audit log with the owner's user ID;
-- - staff can't change the writer's words: a title in the changes is ignored (Q14);
-- - a restricted story leaves the public lists but still opens from its link; a hidden one is
--   gone for readers; showing it again tells the writer;
-- - a story a case removed can't be brought back here, and one chapter can be hidden and shown;
-- - the overview carries the settings and the visibility (criterion 1);
-- - policies story_revisions_select_staff, story_restrictions_select_staff and
--   story_restrictions_select_own: allowed and denied.
-- Personas: adult_writer (…01), teen_17 (…02), owner (…08), moderator (…10), support (…11),
-- editor (…12). Seed stories: …9000…01 and …02 by adult_writer, …03 by teen_17. Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The slugs a public list shows the signed-in caller.
create function pg_temp.listed(list_kind text) returns text[] language sql as $$
  select coalesce(array_agg(story ->> 'slug' order by story ->> 'slug'), '{}')
  from jsonb_array_elements(public.browse_stories(list_kind) -> 'stories') as story;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data, written as postgres: one published chapter on each seed story, so they show in lists,
-- and a second chapter on story 1 to hide.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'chg23901', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'chg23902', 2, 'Doi', 'x', 1, 'published', 'Doi', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'chg23903', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'chg23904', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now()
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000002',
             '00000000-0000-4000-9000-000000000003');
create temp table hidden_chapter as select id from public.chapters where code = 'chg23902';
grant select on hidden_chapter to authenticated;

/* ---------- 1. Who may change a story ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"comments_enabled": false}', 'other', 'Test') $$, '42501', null, 'support staff can''t change a story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001',
  'hidden', 'other', 'Test') $$, '42501', null, 'the content editor can''t change a story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"comments_enabled": false}', 'other', 'Test') $$, '42501', null, 'a writer can''t use the staff change, even on their own story');

/* ---------- 2. A reason, every time ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"comments_enabled": false}', 'other', '   ') $$, '23514', null, 'a change without words of reason is refused');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"comments_enabled": false}', 'because', 'Test') $$, '23514', null, 'a reason that isn''t on the list is refused');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-0000000000ff',
  '{"comments_enabled": false}', 'other', 'Test') $$, '23514', null, 'a story that doesn''t exist is refused');

/* ---------- 3. Settings that restrict nothing: a notification ---------- */

select is(public.admin_change_story_settings('00000000-0000-4000-9000-000000000003',
    '{"category_slug": "fiction"}', 'story_details', 'This is a short story, not a poem.') -> 'changed',
  '["category_slug"]'::jsonb, 'a moderator corrects the category and only that field counts as changed');
select pg_temp.as_postgres();
select is((select categories.slug from public.stories join public.categories on categories.id = stories.category_id
           where stories.id = '00000000-0000-4000-9000-000000000003'), 'fiction', 'the new category is saved at once');
select is((select before_values ->> 'category_slug' || ' > ' || (after_values ->> 'category_slug')
           from public.story_revisions where story_id = '00000000-0000-4000-9000-000000000003'),
  'poetry > fiction', 'the version keeps the before and after');
select is((select changed_by_user_id::text || ' ' || reason_code from public.story_revisions
           where story_id = '00000000-0000-4000-9000-000000000003'),
  '00000000-0000-4000-8000-000000000010 story_details', 'the version keeps who and the reason');
select is((select target_user_id::text from public.audit_log where action = 'story.settings_changed'
           and target_id = '00000000-0000-4000-9000-000000000003'),
  '00000000-0000-4000-8000-000000000002', 'the audit log carries the owner''s user ID');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000002' and kind = 'story_changed_by_staff'), 1,
  'the writer gets a notification about the change');
select is((select public.notification_json(notifications) -> 'staff_change' ->> 'reason_text'
           from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000002' and kind = 'story_changed_by_staff'),
  'This is a short story, not a poem.', 'the notification says why');
select is((select public.notification_json(notifications) -> 'staff_change' -> 'fields'
           from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000002' and kind = 'story_changed_by_staff'),
  '["category_slug"]'::jsonb, 'and what changed');
select ok((select public.notification_json(notifications)::text not like '%00000000-0000-4000-8000-000000000010%'
           from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000002' and kind = 'story_changed_by_staff'),
  'the notification never says which staff member made the change');
select is((select count(*)::integer from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000002'), 0,
  'a change that restricts nothing sends no statement of reasons');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
    '{"tag_names": ["bunici"], "comments_enabled": false}', 'writer_asked', 'The writer asked us.') -> 'changed',
  '["comments_enabled", "tag_names"]'::jsonb, 'tags and comments change together in one version');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') #> '{settings,tag_names}',
  '["Grandparents"]'::jsonb, 'the overview shows the tag staff left, by its stored name');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"title": "A new title", "blurb": "New words"}', 'other', 'Test') $$, '23514', null,
  'a title or blurb in the changes is ignored, so nothing changes');
select pg_temp.as_postgres();
select is((select title from public.stories where id = '00000000-0000-4000-9000-000000000001'), 'Stația meteo',
  'staff never change the writer''s title (Q14)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_change_story_settings('00000000-0000-4000-9000-000000000001',
  '{"deals_with_abuse_or_coercion": true}', 'story_details', 'Test') $$, '23514', null,
  'the writer''s own label rules apply to staff too');

/* ---------- 4. A raised rating: a statement of reasons ---------- */

select is(public.admin_change_story_settings('00000000-0000-4000-9000-000000000002',
    '{"rating": "16_plus"}', 'rating_rules', 'Graphic violence in chapter 1.') ->> 'statement_sent', 'true',
  'raising the rating says a statement of reasons went out');
select pg_temp.as_postgres();
select is((select action::text || ' ' || ground::text || ' ' || ground_key from public.statements_of_reasons
           where story_id = '00000000-0000-4000-9000-000000000002'),
  'rating_raised terms rating_rules', 'the writer gets a statement naming the rule');

/* ---------- 5. Restricted: out of lists, still opens ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001',
  'restricted', 'community_rules', 'Spam links in the blurb.'), null, 'a moderator restricts a story');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'visibility', 'restricted',
  'the overview shows it restricted');
select is((public.admin_search_stories('', story_status => 'restricted') ->> 'total')::integer, 1,
  'the Stories list finds it under Restricted');
select throws_ok($$ select public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001',
  'restricted', 'other', 'Again') $$, '23514', null, 'restricting it twice is refused: nothing changes');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select ok(not ('statia-meteo-seed01' = any (pg_temp.listed('new'))), 'a reader no longer finds it in a list');
select ok('scrisori-din-cutia-postala-seed03' = any (pg_temp.listed('new')),
  'other stories stay in the lists');
select isnt(public.get_story_page('statia-meteo-seed01'), null,
  'a reader still opens it from its link');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select ok('statia-meteo-seed01' = any (pg_temp.listed('new')), 'the writer still sees it in their own lists');
select is((select count(*)::integer from public.story_restrictions), 1,
  'allowed: story_restrictions_select_own: the writer sees the restriction on their story');
select pg_temp.as_postgres();
select is((select action::text from public.statements_of_reasons
           where story_id = '00000000-0000-4000-9000-000000000001'), 'restrict',
  'restricting sends the writer a statement of reasons');

/* ---------- 6. Hidden, then shown again ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select isnt(public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001',
  'hidden', 'community_rules', 'Spam links in every chapter.'), null, 'the owner hides the restricted story');
select is(public.moderated_state_of('story', '00000000-0000-4000-9000-000000000001')::text, 'hidden',
  'it is hidden');
select ok(not public.is_story_restricted('00000000-0000-4000-9000-000000000001'),
  'and the restriction it had ended, so there is one state at a time');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.get_story_page('statia-meteo-seed01'), null,
  'a reader can''t open a hidden story');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.admin_set_story_visibility('00000000-0000-4000-9000-000000000001',
  'shown', 'other', 'The writer took the links out.'), null, 'a moderator shows it again');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications n
           join public.story_revisions r on r.id = n.story_revision_id
           where n.user_id = '00000000-0000-4000-8000-000000000001' and r.after_values ->> 'visibility' = 'shown'), 1,
  'showing it again tells the writer with a notification');
select is((select count(*)::integer from public.story_revisions where story_id = '00000000-0000-4000-9000-000000000001'), 4,
  'every change made a version: settings, restricted, hidden, shown');

/* ---------- 7. One chapter, and a story a case removed ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select isnt(public.admin_set_chapter_visibility((select id from hidden_chapter), 'hidden', 'personal_data',
  'A classmate''s full name and address.'), null, 'a moderator hides one chapter');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') #>> '{chapters,1,moderated_state}', 'hidden',
  'the overview shows that chapter hidden and the other untouched');
select pg_temp.as_postgres();
select is((select ground::text from public.statements_of_reasons where item_type = 'chapter'), 'law',
  'someone''s personal data is a ground in law in the statement');
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
values ('00000000-0000-4000-8000-000000000002', 'story', '00000000-0000-4000-9000-000000000003',
        'removed', '00000000-0000-4000-8000-000000000010', 'Removed by a case');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_set_story_visibility('00000000-0000-4000-9000-000000000003',
  'shown', 'other', 'Test') $$, '23514', null, 'a story a case removed can only come back through the case or an appeal');

/* ---------- 8. Who reads the history and the restrictions ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok((select count(*) from public.story_revisions) > 0,
  'allowed: story_revisions_select_staff: support staff read the history');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.story_revisions), 0,
  'denied: story_revisions_select_staff: a writer can''t read staff history');
select pg_temp.as_postgres();
insert into public.story_restrictions (user_id, story_id, restricted_by_user_id, reason)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-9000-000000000003',
        '00000000-0000-4000-8000-000000000010', 'Test restriction');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.story_restrictions where lifted_at is null), 1,
  'allowed: story_restrictions_select_staff: support staff see live restrictions');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select is((select count(*)::integer from public.story_restrictions), 0,
  'denied: story_restrictions_select_staff: the content editor, who has no Stories area, sees none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.story_restrictions
           where story_id = '00000000-0000-4000-9000-000000000003'), 0,
  'denied: story_restrictions_select_own: a writer can''t see another writer''s restriction');

select * from finish();
rollback;
