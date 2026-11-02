-- Database tests for a story's version history, Restore and removing a passage (bundle ADMIN-2,
-- part b2; story S1-E11-08, part 08b).
-- What it proves:
-- - staff who may change stories read a published chapter's words; support, the content editor
--   and a member can't, and a draft's words are never returned (criterion "chapter text");
-- - a moderator cuts one exact passage: the marker in the story's language takes its place, the
--   rest of the chapter is untouched and the writer's draft loses it too (criterion "remove");
-- - the same words twice: the copy staff selected is the one cut;
-- - words the writer has since changed are refused, so staff never cut the wrong place;
-- - the removal sends the writer a statement of reasons and goes in the audit log; the version
--   carries no words, the original sits in removed_passages (criterion "original stays");
-- - only staff who may change stories read the original, and the read is logged; a passage cut
--   for a safeguarding case needs the safeguarding permission;
-- - Restore brings back what a change replaced, as a new version pointing at it, and tells the
--   writer: settings, a story's visibility, a chapter's visibility and a removed passage;
-- - support can't restore; the overview carries the history, newest first;
-- - policy removed_passages_select_staff: allowed and denied.
-- Personas: adult_writer (…01), admin (…09, no safeguarding permission), moderator (…10, with
-- it), support (…11), editor (…12). Seed stories: …9000…01 (Romanian) by adult_writer.
-- Seed cases: P-0002 (not safeguarding), R-000007 (safeguarding). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Test data, written as postgres: one published chapter whose draft matches it, one whose draft
-- has moved on, and one never published. Story 1 is Romanian, so the marker is too.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'his24001', 1,
   'Unu', 'Prima frază. Adresa: Strada Lungă 5. Ultima frază.', 8, 'published', 'Unu',
   'Prima frază. Adresa: Strada Lungă 5. Ultima frază.', 8, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'his24002', 2,
   'Doi', 'Ciornă nouă cu ecou.', 4, 'published', 'Doi', 'ecou unu, ecou doi.', 4, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'his24003', 3,
   'Trei', 'Ciornă secretă.', 2, 'draft', null, null, 0, null);
update public.stories set first_published_at = now(), last_chapter_published_at = now(), language_code = 'ro'
where id = '00000000-0000-4000-9000-000000000001';
create temp table test_chapters as select code, id from public.chapters where code like 'his240%';
grant select on test_chapters to authenticated;
create temp table test_revisions (name text primary key, id uuid);
grant select, insert on test_revisions to authenticated;

/* ---------- 1. A chapter's words, for staff only ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_chapter_text((select id from test_chapters where code = 'his24001')) ->> 'text',
  'Prima frază. Adresa: Strada Lungă 5. Ultima frază.', 'a moderator reads a published chapter''s words');
select throws_ok($$ select public.admin_chapter_text((select id from test_chapters where code = 'his24003')) $$,
  '23514', null, 'a draft''s words are never returned');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_chapter_text((select id from test_chapters where code = 'his24001')) $$,
  '42501', null, 'support staff can''t read a chapter here');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_chapter_text((select id from test_chapters where code = 'his24001')) $$,
  '42501', null, 'the content editor can''t read a chapter here');

/* ---------- 2. Who may remove a passage, and when ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24001'),
  'Strada Lungă 5', 0, null, 'personal_data', 'A real address.') $$, '42501', null, 'support staff can''t remove a passage');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24001'),
  'Strada Lungă 5', 0, null, 'personal_data', 'A real address.') $$, '42501', null, 'a writer can''t use the staff removal');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24001'),
  'Strada Lungă 5', 0, null, 'personal_data', '  ') $$, '23514', null, 'a removal without a reason is refused');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24001'),
  'Strada Scurtă 9', 0, null, 'personal_data', 'A real address.') $$, '23514', 'Those words are no longer in the chapter; open it again.',
  'words that aren''t in the chapter are refused, so the wrong place is never cut');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24001'),
  'Strada Lungă 5', 0, 'R-999999', 'personal_data', 'A real address.') $$, '23514', 'There is no such case.',
  'a case reference that names no case is refused');
select throws_ok($$ select public.admin_remove_chapter_passage((select id from test_chapters where code = 'his24003'),
  'secretă', 0, null, 'personal_data', 'Test') $$, '23514', 'This chapter has never been published.',
  'a chapter never published has no words to cut');

/* ---------- 3. The cut ---------- */

insert into test_revisions values ('address', public.admin_remove_chapter_passage(
  (select id from test_chapters where code = 'his24001'), 'Strada Lungă 5', 0, 'P-0002',
  'personal_data', 'A real home address.'));
select pg_temp.as_postgres();
select is((select published_body from public.chapters where code = 'his24001'),
  'Prima frază. Adresa: [Eliminat de echipa de moderare]. Ultima frază.',
  'the marker, in the story''s language, takes the passage''s place and the rest is untouched');
select is((select draft_body from public.chapters where code = 'his24001'),
  'Prima frază. Adresa: [Eliminat de echipa de moderare]. Ultima frază.',
  'a draft that matched the published words loses the passage too, so publishing can''t bring it back');
select is((select draft_version from public.chapters where code = 'his24001'), 2,
  'the draft''s version goes up, so an open editor sees the change instead of saving over it');
select is((select before_values::text || after_values::text from public.story_revisions
           where id = (select id from test_revisions where name = 'address')),
  '{"passage": {"characters": 14}}{"passage": "removed"}', 'the version names no words, only how many characters went');
select is((select removed_text from public.removed_passages
           where story_revision_id = (select id from test_revisions where name = 'address')),
  'Strada Lungă 5', 'the original words are kept with the version');
select is((select string_agg(action::text || ':' || ground::text, ',') from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001'),
  'remove:law', 'the writer gets a statement of reasons: removed, on the law (personal data)');
select is((select target_user_id from public.audit_log where action = 'story.passage_changed'
           order by created_at desc limit 1),
  '00000000-0000-4000-8000-000000000001'::uuid, 'the audit log carries the owner''s user ID');

-- The same words twice: the second copy is the one staff selected.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('second_echo', public.admin_remove_chapter_passage(
  (select id from test_chapters where code = 'his24002'), 'ecou', 1, null, 'community_rules', 'Spam.'));
select pg_temp.as_postgres();
select is((select published_body from public.chapters where code = 'his24002'),
  'ecou unu, [Eliminat de echipa de moderare] doi.', 'with the same words twice, only the selected copy is cut');
select is((select draft_body from public.chapters where code = 'his24002'),
  'Ciornă nouă cu [Eliminat de echipa de moderare].', 'a draft that moved on has the words swapped wherever they are');

/* ---------- 4. Reading the original ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_removed_passage((select id from test_revisions where name = 'address')) ->> 'text',
  'Strada Lungă 5', 'a moderator reads the removed words');
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'story.removed_passage_read'
           and target_user_id = '00000000-0000-4000-8000-000000000001'), 1,
  'reading the removed words is logged, with the writer''s user ID');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_removed_passage((select id from test_revisions where name = 'address')) $$,
  '42501', null, 'support staff can''t read the removed words');

-- Policy removed_passages_select_staff.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.removed_passages), 2,
  'allowed: removed_passages_select_staff: a moderator reads removed passages');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.removed_passages), 0,
  'denied: removed_passages_select_staff: support staff read none');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.removed_passages), 0,
  'denied: removed_passages_select_staff: the writer reads none, not even from their own chapter');

-- A passage cut for a safeguarding case: only with the safeguarding permission.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('safeguarding', public.admin_remove_chapter_passage(
  (select id from test_chapters where code = 'his24001'), 'Ultima frază.', 0, 'r-000007',
  'illegal_content', 'Grooming.'));
select is((select count(*)::integer from public.removed_passages where case_is_safeguarding), 1,
  'allowed: removed_passages_select_staff: a moderator with the safeguarding permission reads a safeguarding passage');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select count(*)::integer from public.removed_passages where case_is_safeguarding), 0,
  'denied: removed_passages_select_staff: an admin without the safeguarding permission doesn''t');
select throws_ok($$ select public.admin_removed_passage((select id from test_revisions where name = 'safeguarding')) $$,
  '42501', null, 'nor can that admin read its words through the function');

/* ---------- 5. Restore ---------- */

-- Support can look at the history but not restore.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'address'),
  'other', 'Test') $$, '42501', null, 'support staff can''t restore');

-- A removed passage goes back where its marker is.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('put_back', public.admin_restore_story_revision(
  (select id from test_revisions where name = 'second_echo'), 'other', 'Not spam after all.'));
select pg_temp.as_postgres();
select is((select published_body from public.chapters where code = 'his24002'), 'ecou unu, ecou doi.',
  'Restore puts the removed words back where the marker was');
select is((select restores_revision_id from public.story_revisions where id = (select id from test_revisions where name = 'put_back')),
  (select id from test_revisions where name = 'second_echo'), 'the new version points at the change it undid');
select is((select kind::text from public.notifications where story_revision_id = (select id from test_revisions where name = 'put_back')),
  'story_changed_by_staff', 'the writer is told the words are back');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'second_echo'),
  'other', 'Again.') $$, '23514', 'Nothing changed.', 'a passage already back can''t be put back twice');
select throws_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'put_back'),
  'other', 'Again.') $$, '23514', 'These words are already back.', 'a put-back can''t be "restored" into a new cut');

-- The writer edits the chapter after a cut: the words can't go back by themselves.
select pg_temp.as_postgres();
update public.chapters set published_body = 'Totul rescris.' where code = 'his24001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'address'),
  'other', 'Test') $$, '23514', null, 'a chapter the writer has rewritten since refuses the put-back');

-- Settings: the category goes back.
insert into test_revisions values ('category', (public.admin_change_story_settings(
  '00000000-0000-4000-9000-000000000001', '{"category_slug": "poetry"}', 'story_details', 'Wrong shelf.') ->> 'revision_id')::uuid);
insert into test_revisions values ('category_back', public.admin_restore_story_revision(
  (select id from test_revisions where name = 'category'), 'other', 'It was right before.'));
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'settings' ->> 'category_slug',
  'fiction', 'Restore brings the earlier category back');
select throws_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'category'),
  'other', 'Again.') $$, '23514', 'Nothing changed.', 'restoring values the story already holds changes nothing');

-- Visibility: a hidden story is shown again, and a statement goes when Restore hides again.
insert into test_revisions values ('hide', public.admin_set_story_visibility(
  '00000000-0000-4000-9000-000000000001', 'hidden', 'community_rules', 'Spam links.'));
insert into test_revisions values ('show', public.admin_restore_story_revision(
  (select id from test_revisions where name = 'hide'), 'other', 'The links are gone.'));
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') ->> 'visibility', 'shown',
  'Restore on a hide shows the story again');
select is((select restores_revision_id from public.story_revisions where id = (select id from test_revisions where name = 'show')),
  (select id from test_revisions where name = 'hide'), 'the showing version points at the hide it undid');
insert into test_revisions values ('hide_again', public.admin_restore_story_revision(
  (select id from test_revisions where name = 'show'), 'community_rules', 'The links are back.'));
select pg_temp.as_postgres();
select is((select count(*)::integer from public.statements_of_reasons
           where user_id = '00000000-0000-4000-8000-000000000001' and action = 'hide'),
  2, 'Restore that hides again sends a statement of reasons, as the first hide did');

-- One chapter's visibility.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
insert into test_revisions values ('chapter_hide', public.admin_set_chapter_visibility(
  (select id from test_chapters where code = 'his24002'), 'hidden', 'community_rules', 'Spam.'));
select lives_ok($$ select public.admin_restore_story_revision((select id from test_revisions where name = 'chapter_hide'),
  'other', 'Fine now.') $$, 'Restore on a hidden chapter shows it again');
select is(public.moderated_state_of('chapter', (select id from test_chapters where code = 'his24002')), null,
  'the chapter is shown');

/* ---------- 6. The history on the staff page ---------- */

select is(jsonb_array_length(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'history'),
  (select count(*)::integer from public.story_revisions where story_id = '00000000-0000-4000-9000-000000000001'),
  'the overview carries every version');
select is(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'history' -> 0 ->> 'restores_revision_id',
  (select id::text from test_revisions where name = 'chapter_hide'), 'newest first, with what each restore undid');
select is((select count(*)::integer from jsonb_array_elements(
    public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'history') as version
  where version::text like '%Strada%'), 0, 'the history never carries a removed passage''s words');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select ok(jsonb_array_length(public.admin_story_overview('00000000-0000-4000-9000-000000000001') -> 'history') > 0,
  'support staff see the history too (without the removed words)');

select * from finish();
rollback;
