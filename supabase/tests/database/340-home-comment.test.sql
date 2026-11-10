-- Database tests for the staff-picked reader comment on the home page (bundle GAPS-13; story
-- S1-E5-13; board Website-Home).
-- What it proves:
-- - home_comment_can_show(): a short live comment by an adult who may be put on show, on a public
--   story rated All ages or 13+; never a minor's, a spoiler, one over 200 characters, one on a
--   16+ story, a deleted one, a reply or one with a web address;
-- - only staff with the featured area see the candidates and the picks, invite and take down,
--   each in the audit log; a comment that can't be shown and one already picked are refused;
-- - the reader gets one 'home_comment_invited' notification (under staff messages), sees the
--   invitation, and only they can answer it;
-- - home_comment_picks_select_own and home_comment_picks_select_featured_staff: the reader and
--   featured staff read the pick, another member and a moderator read none, a visitor is refused;
-- - home_comment_card(): nothing until the reader agrees; then the reader's name, the comment,
--   the story and the chapter; the most recently agreed pick wins; blocks are respected; a
--   withdrawn, spoiler-marked or taken-down pick is gone at once;
-- - the picks are in Download my data and go with the account.
-- Personas: adult_writer (…01), teen_17 (…02), teacher (…07), admin (…09), moderator (…10),
-- blocker (…15) and blocked (…16).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

-- The comments and picks this test makes, by a short label.
create temporary table named (label text primary key, id uuid) on commit drop;

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or 'ok' when it runs.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;
-- How many audit-log rows have an action (the audit log is read only by owners and admins).
create function pg_temp.audit_count(wanted text) returns integer language sql security definer as $$
  select count(*)::integer from public.audit_log where audit_log.action = wanted;
$$;
-- How many 'home_comment_invited' notifications a persona has (read as the table's owner).
create function pg_temp.invited_count(persona_id text) returns integer language sql security definer as $$
  select count(*)::integer from public.notifications
  where notifications.user_id = persona_id::uuid and notifications.kind = 'home_comment_invited';
$$;
-- The rule itself, which no client role may call.
create function pg_temp.can_show(label text) returns boolean language sql security definer as $$
  select public.home_comment_can_show((select id from named where named.label = can_show.label));
$$;
-- Moves a pick's agreement in time, so two agreements in one transaction have an order.
create function pg_temp.agreed_later(target_pick uuid, later interval) returns void language sql security definer as $$
  update public.home_comment_picks set agreed_at = now() + later where id = target_pick;
$$;
-- Marks a comment as a spoiler or not (the comment table has no client update).
create function pg_temp.set_spoiler(label text, wanted boolean) returns void language sql security definer as $$
  update public.comments set is_spoiler = wanted where id = (select id from named where named.label = set_spoiler.label);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The audit log is append-only, so the test counts from what was there before it.
create temporary table audit_before on commit drop as
  select pg_temp.audit_count('home_comment.invited') as invited, pg_temp.audit_count('home_comment.removed') as removed;
grant select on audit_before to authenticated;
grant select, insert on named to anon, authenticated;
delete from public.home_comment_picks;

-- One published chapter on an All ages story and one on a story this test rates 16+.
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000002';
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'homca001', 1, 'Unu',
   'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'homcb001', 1, 'One',
   'x', 3, 'published', 'One', 'The first chapter.', 3, now());
-- The comments, written as the table's owner: who, on which chapter, the words and the flags.
with wanted (label, writer, code, body, is_spoiler, is_deleted) as (values
    ('good', '00000000-0000-4000-8000-000000000007', 'homca001', '  Am citit pe nerăsuflate zq.  ', false, false),
    ('second', '00000000-0000-4000-8000-000000000015', 'homca001', 'I missed my stop reading this zq.', false, false),
    ('minor', '00000000-0000-4000-8000-000000000002', 'homca001', 'A teen wrote this zq.', false, false),
    ('spoiler', '00000000-0000-4000-8000-000000000007', 'homca001', 'The tram never comes zq.', true, false),
    ('long', '00000000-0000-4000-8000-000000000007', 'homca001', repeat('z', 201), false, false),
    ('sixteen', '00000000-0000-4000-8000-000000000007', 'homcb001', 'On an older story zq.', false, false),
    ('link', '00000000-0000-4000-8000-000000000007', 'homca001', 'More at WWW.example.com zq.', false, false),
    ('deleted', '00000000-0000-4000-8000-000000000007', 'homca001', 'Taken back zq.', false, true)),
made as (
  insert into public.comments (user_id, chapter_id, body, is_spoiler, deleted_at, deleted_by)
  select wanted.writer::uuid, chapters.id, wanted.body, wanted.is_spoiler,
    case when wanted.is_deleted then now() end, case when wanted.is_deleted then 'author'::public.comment_deleted_by end
  from wanted join public.chapters on chapters.code = wanted.code
  returning id, body)
insert into named select wanted.label, made.id from made join wanted on wanted.body = made.body;
-- A reply to the good comment, short and by an adult, which still isn't a comment of its own.
with made as (
  insert into public.comments (user_id, chapter_id, parent_comment_id, body)
  select '00000000-0000-4000-8000-000000000015', comments.chapter_id, comments.id, 'Me too zq.'
  from public.comments where comments.id = (select id from named where label = 'good')
  returning id)
insert into named select 'reply', id from made;

/* ---------- 1. Which comments may be shown ---------- */

select ok(pg_temp.can_show('good'), 'a short comment by an adult on an All ages story can be shown');
select ok(not pg_temp.can_show('minor'), 'a minor''s comment can''t');
select ok(not pg_temp.can_show('spoiler'), 'nor a spoiler');
select ok(not pg_temp.can_show('long'), 'nor one over 200 characters');
select ok(not pg_temp.can_show('sixteen'), 'nor one on a 16+ story');
select ok(not pg_temp.can_show('deleted'), 'nor a deleted one');
select ok(not pg_temp.can_show('reply'), 'nor a reply to another comment');
select ok(not pg_temp.can_show('link'), 'nor one with a web address');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.refusal($$ select public.home_comment_can_show(gen_random_uuid()) $$), '42501',
  'the rule itself isn''t callable from the app');

/* ---------- 2. Who may pick ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select count(*) from public.home_comment_picks $$), '42501',
  'denied: home_comment_picks_select_own: a visitor who isn''t logged in can''t read the picks');
select is(pg_temp.refusal($$ select * from public.admin_home_comment_candidates() $$), '42501', 'nor the candidates');
select is(pg_temp.refusal($$ select public.answer_home_comment_pick(gen_random_uuid(), true) $$), '42501', 'nor answer one');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select * from public.admin_home_comment_candidates() $$), '42501',
  'a writer can''t see the candidates');
select is(pg_temp.refusal($$ select public.admin_invite_home_comment((select id from named where label = 'good')) $$),
  '42501', 'nor invite a reader');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is(pg_temp.refusal($$ select * from public.admin_home_comment_picks() $$), '42501',
  'a moderator, who doesn''t have the featured area, can''t see the picks');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select string_agg(body, '|' order by body) from public.admin_home_comment_candidates() where body like '%zq.'),
  'Am citit pe nerăsuflate zq.|I missed my stop reading this zq.',
  'an admin sees the two comments that can be shown, trimmed, and none of the others');
select is(pg_temp.refusal($$ select public.admin_invite_home_comment((select id from named where label = 'minor')) $$),
  '23514', 'inviting a minor''s comment is refused');
select is(pg_temp.refusal($$ select public.admin_invite_home_comment(null) $$), '23514', 'so is no comment');
insert into named select 'pick', public.admin_invite_home_comment((select id from named where label = 'good'));
select is(pg_temp.audit_count('home_comment.invited') - (select invited from audit_before), 1,
  'the invitation is in the audit log');
select is(pg_temp.invited_count('00000000-0000-4000-8000-000000000007'), 1, 'the reader gets one notification');
select is(public.notification_category('home_comment_invited'), 'staff', 'filed under staff messages');
select is(pg_temp.refusal($$ select public.admin_invite_home_comment((select id from named where label = 'good')) $$),
  '23505', 'the same comment can''t be picked twice');
select is((select count(*)::integer from public.admin_home_comment_candidates() where body like '%zq.'), 1,
  'a picked comment leaves the candidates');
select is((select count(*)::integer from public.home_comment_picks), 1,
  'allowed: home_comment_picks_select_featured_staff: an admin reads the pick');
select is((select answer || '|' || can_show::text || '|' || is_on_home_page::text from public.admin_home_comment_picks()),
  'waiting|true|false', 'and sees it waiting, not on the home page');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.home_comment_picks), 0,
  'denied: home_comment_picks_select_featured_staff: a moderator reads none');

/* ---------- 3. The reader answers ---------- */

select pg_temp.sign_out();
select is((select count(*)::integer from public.home_comment_card()), 0, 'nothing is on the home page before the reader agrees');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.home_comment_picks), 0,
  'denied: home_comment_picks_select_own: another member reads none');
select is(pg_temp.refusal($$ select public.answer_home_comment_pick((select id from named where label = 'pick'), true) $$),
  'P0002', 'and can''t answer for the reader');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is((select count(*)::integer from public.home_comment_picks), 1,
  'allowed: home_comment_picks_select_own: the reader reads their own pick');
select is((select body || '|' || story_title || '|' || chapter_position || '|' || answer from public.my_home_comment_invitations()),
  'Am citit pe nerăsuflate zq.|Stația meteo|1|waiting', 'and sees the invitation with the comment and where it was left');
select is(public.answer_home_comment_pick((select id from named where label = 'pick'), true), 'agreed', 'the reader agrees');

/* ---------- 4. The card ---------- */

select pg_temp.sign_out();
select is((select handle || '|' || body || '|' || story_title || '|' || chapter_position from public.home_comment_card()),
  'teacher|Am citit pe nerăsuflate zq.|Stația meteo|1', 'a visitor now sees the card: who, the comment, the story and the chapter');

-- A second reader agrees later: the newest agreement is the one shown.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into named select 'pick2', public.admin_invite_home_comment((select id from named where label = 'second'));
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select public.answer_home_comment_pick((select id from named where label = 'pick2'), true);
select pg_temp.agreed_later((select id from named where label = 'pick2'), '1 minute');
select pg_temp.sign_out();
select is((select handle from public.home_comment_card()), 'blocker', 'the comment agreed to most recently is the one shown');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000016');
select is((select handle from public.home_comment_card()), 'teacher',
  'someone the reader blocked sees the next one instead');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is((select string_agg(handle, ',' order by handle) from public.admin_home_comment_picks() where is_on_home_page),
  'blocker', 'staff see which pick is on the home page');

-- The reader takes the agreement back: gone at once.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000015');
select is(public.answer_home_comment_pick((select id from named where label = 'pick2'), false), 'declined',
  'a reader who agreed can withdraw');
select pg_temp.sign_out();
select is((select handle from public.home_comment_card()), 'teacher', 'and the card goes back to the other comment at once');

-- The comment becomes a spoiler: no longer shown, and the invitation goes too.
select pg_temp.set_spoiler('good', true);
select is((select count(*)::integer from public.home_comment_card()), 0, 'a comment marked as a spoiler leaves the home page');
select pg_temp.set_spoiler('good', false);

/* ---------- 5. Staff take a pick down ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(pg_temp.refusal($$ select public.admin_delete_home_comment_pick((select id from named where label = 'pick')) $$),
  '42501', 'a writer can''t take a pick down');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_delete_home_comment_pick((select id from named where label = 'pick'));
select is(pg_temp.audit_count('home_comment.removed') - (select removed from audit_before), 1,
  'an admin takes it down, in the audit log');
select is(pg_temp.refusal($$ select public.admin_delete_home_comment_pick((select id from named where label = 'pick')) $$),
  'P0002', 'taking it down twice is refused');
select pg_temp.sign_out();
select is((select count(*)::integer from public.home_comment_card()), 0, 'and the home page shows no comment');

reset role;
select is((select is_included::text from public.data_export_tables() where table_name = 'home_comment_picks')
    || '|' || (select action from public.account_deletion_rules() where table_name = 'home_comment_picks'),
  'true|delete', 'the picks are in Download my data and go with the account');

select * from finish();
rollback;
