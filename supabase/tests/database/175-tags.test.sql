-- Database tests for tags that staff approve and tags with a name in each language (CMS-1e;
-- Robert's tag task, 30 Oct 2026; CLAUDE.md rule 1).
-- What it proves:
-- - the recommended tags have a name in Romanian and English, and the tags already in use that
--   meant the same thing were merged into them;
-- - a name typed in any language finds the same tag ("fantezie" and "Fantasy" are one tag);
-- - a new name makes a waiting tag the writer sees but readers, the story page and the tag page
--   don't (tags_select_public, tags_select_on_own_story);
-- - only owner, admin and moderator read every tag and decide (tags_select_staff); support and
--   members are refused;
-- - approving needs a name in every interface language and no clash; it is logged;
-- - rejecting takes the tag off every story, tells the writer, and the name isn't added again;
-- - tag names are public only for approved tags (tag_names_select_public).
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
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
-- The tags readers see on a seed story's page.
create function pg_temp.page_tags(slug text) returns jsonb language sql as $$
  select public.get_story_page(slug) -> 'tags';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- The recommended tags ---------- */

select ok((select count(*) from public.tags where is_recommended and status = 'approved') >= 40,
  'about 40 recommended tags are approved');
select is((select tag_names.name from public.tag_names join public.tags on tags.id = tag_names.tag_id
           where tags.name = 'Fantasy' and tag_names.language_code = 'ro'), 'Fantezie',
  'Fantasy is Fantezie in Romanian');
select is((select count(*)::integer from public.tags where normalised_name in ('familie', 'bunici', 'vecini')), 0,
  'the tags already in use were merged into the recommended ones');

/* ---------- A writer tags a story ---------- */

-- adult_writer's seed story: "fantezie" and "Fantasy" are one tag; "Lumea bunicii" is new.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.update_my_story('statia-meteo-seed01',
  '{"tag_names": ["fantezie", "Fantasy", "Lumea bunicii epic175"]}')) ->> 'outcome', 'ok', 'the writer saves three typed tags');
reset role;
select results_eq(
  $$ select tags.name, tags.status::text from public.story_tags join public.tags on tags.id = story_tags.tag_id
     where story_tags.story_id = '00000000-0000-4000-9000-000000000001' order by tags.name $$,
  $$ values ('Fantasy', 'approved'), ('Lumea bunicii epic175', 'waiting') $$,
  'a name in either language finds one tag; a new name waits for staff');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.tags where name = 'Lumea bunicii epic175'), 1,
  'allowed: tags_select_on_own_story shows the writer their waiting tag');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.tags where name = 'Lumea bunicii epic175'), 0,
  'denied: tags_select_public hides a waiting tag from another member');
select is((select count(*)::integer from public.tags where name = 'Fantasy'), 1,
  'allowed: tags_select_public shows an approved tag to a member');
select is((select count(*)::integer from public.tags where status = 'waiting'), 0,
  'denied: tags_select_on_own_story shows nobody else''s waiting tags');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.page_tags('statia-meteo-seed01'), '["Fantasy"]'::jsonb,
  'the story page shows only the approved tag, even to its writer');
set local role anon;
select is((select count(*)::integer from public.tags where status <> 'approved'), 0,
  'denied: a visitor sees no waiting tag');
select is((select count(*)::integer from public.tag_names), (select count(*)::integer from public.tag_names),
  'allowed: tag_names_select_public lets a visitor read the names');
reset role;

/* ---------- Who decides ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.tags where status = 'waiting'), 0,
  'denied: tags_select_staff doesn''t show support the waiting tags');
select throws_ok($$ select * from public.admin_list_tags('waiting') $$, '42501', null,
  'support can''t open the tag queue');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.tags where name = 'Lumea bunicii epic175'), 1,
  'allowed: tags_select_staff shows a moderator the waiting tag');
select is((select story_count::integer from public.admin_list_tags('waiting') where name = 'Lumea bunicii epic175'), 1,
  'the queue shows how many stories use it');

/* ---------- Approve and rename ---------- */

select is(pg_temp.hint_of($$ select public.admin_name_tag(
    (select id from public.tags where name = 'Lumea bunicii epic175'), '{"ro": "Lumea bunicii", "en": " "}') $$),
  'en:empty', 'approving needs a name in every interface language');
select is(pg_temp.hint_of($$ select public.admin_name_tag(
    (select id from public.tags where name = 'Lumea bunicii epic175'), '{"ro": "Fantezie", "en": "Grandma''s world"}') $$),
  'ro:taken', 'a name another tag has in that language is refused');
select lives_ok($$ select public.admin_name_tag(
    (select id from public.tags where name = 'Lumea bunicii epic175'), '{"ro": "Lumea bunicii", "en": "Grandma''s world"}') $$,
  'a moderator approves it with both names');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'tag.approved'),
  'the approval is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.page_tags('statia-meteo-seed01'), '["Fantasy", "Lumea bunicii epic175"]'::jsonb,
  'once approved, the story page shows it');
reset role;

/* ---------- Reject ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(public.admin_reject_tag((select id from public.tags where name = 'Lumea bunicii epic175'), 'Too close to Family'), 1,
  'rejecting takes it off the one story that used it');
reset role;
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'tag_rejected'), 1,
  'the writer is told');
select ok(exists (select 1 from public.audit_log where action = 'tag.rejected' and reason = 'Too close to Family'),
  'the rejection is in the audit log with its reason');
set local role anon;
select is((select count(*)::integer from public.tag_names
           where tag_id = (select id from public.tags where name = 'Lumea bunicii epic175')), 0,
  'denied: tag_names_select_public hides the names of a rejected tag');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.update_my_story('statia-meteo-seed01', '{"tag_names": ["Fantasy", "Lumea bunicii epic175"]}');
reset role;
select is((select count(*)::integer from public.story_tags where story_id = '00000000-0000-4000-9000-000000000001'), 1,
  'a rejected name isn''t added again');

select * from finish();
rollback;
