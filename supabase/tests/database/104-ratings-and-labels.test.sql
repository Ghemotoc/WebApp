-- Database tests for ratings and labels (story S1-E3-06; CLAUDE.md rule 18).
-- What it proves:
-- - a story must have a rating; abuse or coercion needs 16+ or 18+ and a content note; the
--   fan fiction, parody and AI labels are stored and served;
-- - the rating rule for every age group, through rating_allows() and get_story_page():
--   kid_14_ok (13 to 15) sees All ages and 13+; teen_17 (16 to 17) up to 16+; adult_writer
--   (18+, Yoti "18 or over") everything; a signed-out visitor All ages and 13+ (counts as under
--   16, a proposal); pending_check (18 by year, no Yoti result) sees 18+ while adults_only is on
--   and not once it is off (a proposal pending the lawyer, 23 Oct 2026);
-- - staff raise a rating (allowed), never lower it; support and the writer can't; the change is
--   logged and a statement of reasons is queued; the AI label works the same way;
-- - the jobs queue is readable by staff who view Stories and by nobody else (allowed, denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

-- Signed out: the anon role with no claims left over (set_config lasts the whole transaction).
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

create function pg_temp.labels(rating text, extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('rating', rating, 'ai_disclosure', 'no_ai') || extra;
$$;

/* Four published stories by adult_writer, one per rating, plus an abuse-themed one. */
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((public.create_story('Rated all ages', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}',
  '00000000-0000-4000-9000-00000000a000', pg_temp.labels('all_ages'))) ->> 'outcome', 'ok', 'an All ages story');
select is((public.create_story('Rated 13 plus', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}',
  '00000000-0000-4000-9000-00000000a013', pg_temp.labels('13_plus', '{"is_fan_fiction": true}'))) ->> 'outcome', 'ok', 'a 13+ fan fiction');
select is((public.create_story('Rated 16 plus', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}',
  '00000000-0000-4000-9000-00000000a016', pg_temp.labels('16_plus',
  '{"deals_with_abuse_or_coercion": true, "content_note": "Abuz în familie, povestit cu grijă.", "ai_disclosure": "ai_brainstorming"}'))) ->> 'outcome', 'ok',
  'a 16+ story about abuse, with a content note and the AI answer');
select is((public.create_story('Rated 18 plus', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}',
  '00000000-0000-4000-9000-00000000a018', pg_temp.labels('18_plus', '{"is_parody": true}'))) ->> 'outcome', 'ok', 'an 18+ parody');

-- 1. The rules on the labels themselves.
select throws_ok($$ select public.create_story('No rating', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, '{"ai_disclosure": "no_ai"}') $$,
  '23514', null, 'a story without a rating is refused: the writer must pick one');
select throws_ok($$ select public.create_story('No AI answer', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null, '{"rating": "all_ages"}') $$,
  '23514', null, 'a story without the AI answer is refused');
select throws_ok($$ select public.create_story('Abuse at 13', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null,
  pg_temp.labels('13_plus', '{"deals_with_abuse_or_coercion": true, "content_note": "x"}')) $$,
  '23514', null, 'abuse or coercion needs 16+ or 18+ (17 Oct 2026)');
select throws_ok($$ select public.create_story('Abuse no note', '', 'ro', 'fiction', '{}', '{"kind": "automatic"}', null,
  pg_temp.labels('16_plus', '{"deals_with_abuse_or_coercion": true}')) $$,
  '23514', null, 'abuse or coercion needs a content note');
select throws_ok($$ select public.update_my_story('statia-meteo-seed01', '{"labels": {"rating": "mature"}}') $$,
  '23514', null, 'an unknown rating is refused on update');
select is((public.update_my_story('statia-meteo-seed01', '{"labels": {"rating": "13_plus", "is_fan_fiction": true}}')) ->> 'outcome', 'ok',
  'the writer changes the rating and a label in settings');
select results_eq(
  $$ select rating::text, is_fan_fiction, ai_disclosure::text from public.stories where slug = 'statia-meteo-seed01' $$,
  $$ values ('13_plus', true, 'no_ai') $$,
  'labels left out of the change keep their value'
);

-- Publish the four: one published chapter each, made the way the app makes them (S1-E3-03).
reset role;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
  published_title, published_body, first_published_at, last_published_at)
select stories.id, stories.user_id, substr(md5(stories.id::text), 1, 8), 1, 'Unu', 'Text.', 'published',
  'Unu', 'Text.', now(), now()
from public.stories where stories.id in (
  '00000000-0000-4000-9000-00000000a000', '00000000-0000-4000-9000-00000000a013',
  '00000000-0000-4000-9000-00000000a016', '00000000-0000-4000-9000-00000000a018');
-- The slug of one of the four stories. Security definer, because a reader can't read the
-- stories table (owner-only select, ADR 0004): only the page function is theirs to call.
create function pg_temp.slug_of(id_part text) returns text language sql security definer as $$
  select slug from public.stories where id = ('00000000-0000-4000-9000-00000000' || id_part)::uuid;
$$;
create function pg_temp.sees(id_part text) returns boolean language sql as $$
  select public.get_story_page(pg_temp.slug_of(id_part)) is not null;
$$;

-- 2. kid_14_ok: 13 to 15.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select results_eq($$ select pg_temp.sees('a000'), pg_temp.sees('a013'), pg_temp.sees('a016'), pg_temp.sees('a018') $$,
  $$ values (true, true, false, false) $$, 'a 14-year-old sees All ages and 13+ stories, never 16+ or 18+');

-- 3. teen_17: 16 to 17.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select results_eq($$ select pg_temp.sees('a000'), pg_temp.sees('a013'), pg_temp.sees('a016'), pg_temp.sees('a018') $$,
  $$ values (true, true, true, false) $$, 'a 17-year-old sees up to 16+, never 18+');

-- 4. adult_writer: 18+ with the Yoti result (and the owner anyway); use teacher (18+, Yoti) to test as a reader.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select results_eq($$ select pg_temp.sees('a000'), pg_temp.sees('a013'), pg_temp.sees('a016'), pg_temp.sees('a018') $$,
  $$ values (true, true, true, true) $$, 'an adult with an "18 or over" result sees everything');

-- 5. Signed out: counts as under 16 (a proposal, L14).
select pg_temp.sign_out();
select results_eq($$ select pg_temp.sees('a000'), pg_temp.sees('a013'), pg_temp.sees('a016'), pg_temp.sees('a018') $$,
  $$ values (true, true, false, false) $$, 'a signed-out visitor sees All ages and 13+ only');
select is(public.rating_allows('16_plus'), false, 'rating_allows() says no to 16+ for a visitor');

-- 6. pending_check: 18 by year, no Yoti result. March: yes. After March (flag off): no 18+.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(pg_temp.sees('a018'), true, 'while adults_only is on, 18 by birth year is enough for 18+ (proposal, 23 Oct 2026)');
reset role;
update public.feature_flags set is_enabled = false where key = 'adults_only';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000005');
select is(public.rating_allows('18_plus'), false, 'once adults_only is off, 18+ needs the Yoti "18 or over" result');
select is(public.rating_allows('16_plus'), true, 'but 16+ still only needs the age by year');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.rating_allows('18_plus'), true, 'an adult with the Yoti result still sees 18+ once the flag is off');
reset role;
update public.feature_flags set is_enabled = true where key = 'adults_only';

-- 7. The page serves the labels, never the user ID.
select pg_temp.sign_out();
select results_eq(
  $$ select (public.get_story_page(pg_temp.slug_of('a013'))) -> 'labels' ->> 'rating',
            (public.get_story_page(pg_temp.slug_of('a013'))) -> 'labels' ->> 'is_fan_fiction' $$,
  $$ values ('13_plus', 'true') $$, 'the page carries the rating and the fan fiction label');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select results_eq(
  $$ select (public.get_story_page(pg_temp.slug_of('a016'))) -> 'labels' ->> 'deals_with_abuse_or_coercion',
            (public.get_story_page(pg_temp.slug_of('a016'))) -> 'labels' ->> 'content_note',
            (public.get_story_page(pg_temp.slug_of('a016'))) -> 'labels' ->> 'ai_disclosure' $$,
  $$ values ('true', 'Abuz în familie, povestit cu grijă.', 'ai_brainstorming') $$,
  'the page carries the abuse note and the AI answer');

-- 8. Staff raise a rating, never lower it; logged and queued.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '16_plus', 'Reported: a scene too strong for 13+') $$,
  'allowed: a moderator raises 13+ to 16+');
reset role;
select is((select rating::text from public.stories where id = '00000000-0000-4000-9000-00000000a013'), '16_plus', 'the rating is 16+ now');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '13_plus', 'Lower it') $$,
  '23514', null, 'a rating is never lowered, not even by staff');
select throws_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '16_plus', 'Same') $$,
  '23514', null, 'the same rating is not a raise');
select throws_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '18_plus', '') $$,
  '23514', null, 'a reason is required');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'story.rating_raised' and target_id = '00000000-0000-4000-9000-00000000a013'),
  1, 'the raise is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.jobs where kind = 'statement_of_reasons_needed'
  and payload ->> 'story_id' = '00000000-0000-4000-9000-00000000a013' and payload ->> 'action' = 'rating_raised'),
  1, 'a statement of reasons is queued for S1-E10-04');
-- S1-E10-04 turns the job into a statement at once, so the moderator finds it already done.
select is((select count(*)::integer from public.jobs where kind = 'statement_of_reasons_needed'
  and payload ->> 'story_id' = '00000000-0000-4000-9000-00000000a013' and processed_at is not null),
  1, 'allowed: jobs_select_staff: the moderator reads the queue, with the statement already sent');

-- 9. Support (view only) and the writer can't.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '18_plus', 'x') $$,
  '42501', null, 'support can''t raise a rating');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_raise_story_rating('00000000-0000-4000-9000-00000000a013', '18_plus', 'x') $$,
  '42501', null, 'the writer can''t use the staff function');
select is((select count(*)::integer from public.jobs), 0, 'denied: jobs_select_staff: a writer reads no jobs');
select throws_ok($$ insert into public.jobs (kind) values ('x') $$, '42501', null, 'nobody writes jobs through the API');

-- 10. The AI label: staff only, logged, queued; the setting exists.
reset role;
select is((public.setting_value('ai_label_confirmed_reports'))::integer, 3, 'the label needs 3 confirmed reports (a setting)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_set_ai_undisclosed_label('00000000-0000-4000-9000-00000000a000', 'Three reports confirmed true') $$,
  'a moderator adds the "AI-written, not disclosed" label');
select is((select (public.get_story_page(pg_temp.slug_of('a000'))) -> 'labels' ->> 'ai_undisclosed_labelled'),
  'true', 'the page shows the label');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'story.ai_undisclosed_labelled'), 1, 'the label is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.update_my_story('statia-meteo-seed01', '{"labels": {"ai_undisclosed_labelled_at": null}}') $$,
  'a writer sending the staff label''s key is not an error: the key is ignored');
reset role;
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select lives_ok($$ select public.admin_set_ai_undisclosed_label('00000000-0000-4000-9000-000000000001', 'Three reports confirmed true') $$,
  'the label is set on the seed story to prove the writer can''t clear it');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.update_my_story('statia-meteo-seed01', '{"labels": {"ai_undisclosed_labelled_at": null, "rating": "all_ages"}}') $$,
  'the writer saves settings with the staff key in the payload');
reset role;
select isnt((select ai_undisclosed_labelled_at from public.stories where slug = 'statia-meteo-seed01'), null,
  'a writer can''t clear the staff label through settings: the key is ignored');

select * from finish();

rollback;
