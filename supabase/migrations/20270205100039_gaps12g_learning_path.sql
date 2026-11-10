/*
 * Migration: the learning path on the Writers' hub (bundle GAPS-12g; board WritersHub, "Learning
 * path · Your first chapter in 7 days · A short lesson and a small task each day · Continue day
 * 3"). Part 7 of GAPS-12.
 *
 * How it works: the path is seven days, each with a title, a short lesson and a small task, in
 * Romanian and English. The seven days ship here with draft text and staff can change every word
 * at /staff/hub (CLAUDE.md, Conventions: templates ship with draft text and are editable from
 * day one). A writer reads a day at /hub/path and marks it done; the hub's card shows the seven
 * titles with a tick on the finished ones and "Continue day N" for the first one still open.
 * What it adds:
 * - learning_path_steps: the seven days (staff content, no personal data);
 * - learning_path_progress: which days a writer finished;
 * - writers_hub_learning_path(): the days with the caller's own ticks;
 * - mark_learning_step(): the writer ticks a day, or takes the tick off;
 * - admin_save_learning_step(): staff with the contests area change a day's words, logged.
 * Who calls it: src/features/hub/ (HubPath on the hub, LearningPathPage at /hub/path, and the
 * staff page at /staff/hub).
 * Rules:
 * - Always seven days: staff change the words, never the count, so "in 7 days" stays true.
 * - A writer's ticks are their own: nobody else reads them and nothing is ranked.
 * - The days can be done in any order and a tick can come off again.
 */

create table public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  -- Which day of the path, 1 to 7.
  day_number integer not null,
  title_ro text not null,
  title_en text not null,
  -- The day's short lesson: plain text, a blank line between paragraphs.
  lesson_ro text not null,
  lesson_en text not null,
  -- The day's small task, one or two sentences.
  task_ro text not null,
  task_en text not null,
  -- The staff member who last saved it; null for the draft text this migration ships.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_path_steps_day_in_path check (day_number between 1 and 7),
  constraint learning_path_steps_one_per_day unique (day_number),
  constraint learning_path_steps_title_ro_length check (char_length(btrim(title_ro)) between 1 and 80),
  constraint learning_path_steps_title_en_length check (char_length(btrim(title_en)) between 1 and 80),
  constraint learning_path_steps_lesson_ro_length check (char_length(btrim(lesson_ro)) between 1 and 1500),
  constraint learning_path_steps_lesson_en_length check (char_length(btrim(lesson_en)) between 1 and 1500),
  constraint learning_path_steps_task_ro_length check (char_length(btrim(task_ro)) between 1 and 300),
  constraint learning_path_steps_task_en_length check (char_length(btrim(task_en)) between 1 and 300)
);

comment on table public.learning_path_steps is
  'kind: platform
The seven days of the Writers'' hub learning path: a title, a short lesson and a small task each, in Romanian and English, shipped as draft text and changed by staff (GAPS-12g). No personal data.';

create trigger learning_path_steps_set_updated_at
  before update on public.learning_path_steps
  for each row execute function public.set_updated_at();
alter table public.learning_path_steps enable row level security;

/**
 * learning_path_steps_select_members: anyone signed in reads the seven days. They are staff's
 * own teaching text with nothing personal in them, and the hub shows them to every writer.
 * Writes go through admin_save_learning_step().
 */
create policy learning_path_steps_select_members
  on public.learning_path_steps for select to authenticated
  using (true);
comment on policy learning_path_steps_select_members on public.learning_path_steps is
  'Allows anyone signed in to read the learning path''s seven days: staff-written teaching text, nothing personal (GAPS-12g).';

grant select on public.learning_path_steps to authenticated;

create table public.learning_path_progress (
  id uuid primary key default gen_random_uuid(),
  -- The writer.
  user_id uuid not null references public.profiles (id),
  -- The day they finished, 1 to 7.
  day_number integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_path_progress_day_in_path check (day_number between 1 and 7),
  constraint learning_path_progress_one_per_day unique (user_id, day_number)
);

comment on table public.learning_path_progress is
  'kind: user_action
Which days of the Writers'' hub learning path a writer marked done, and when (GAPS-12g). Personal data: the person''s own progress; nobody else reads it.';

create trigger learning_path_progress_set_updated_at
  before update on public.learning_path_progress
  for each row execute function public.set_updated_at();
create trigger learning_path_progress_refuse_user_id_change
  before update on public.learning_path_progress
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.learning_path_progress enable row level security;

/**
 * learning_path_progress_select_own: a writer reads their own ticks, for the hub and Download my
 * data. Nobody else reads them, staff included. Ticks are written by mark_learning_step().
 */
create policy learning_path_progress_select_own
  on public.learning_path_progress for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy learning_path_progress_select_own on public.learning_path_progress is
  'Allows a writer to read which learning path days they marked done; nobody else reads them (GAPS-12g).';

grant select on public.learning_path_progress to authenticated;

/**
 * writers_hub_learning_path: the seven days in order, each with whether the caller finished it.
 * Inputs: none. Returns: seven rows: the day's number, title, lesson and task in both languages
 *   and is_done. Nothing for a signed-out caller.
 * Flow: HubPath and LearningPathPage → useLearningPath → api/hubPath.ts → this function.
 */
create function public.writers_hub_learning_path()
returns table (
  day_number integer,
  title_ro text,
  title_en text,
  lesson_ro text,
  lesson_en text,
  task_ro text,
  task_en text,
  is_done boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    steps.day_number,
    steps.title_ro,
    steps.title_en,
    steps.lesson_ro,
    steps.lesson_en,
    steps.task_ro,
    steps.task_en,
    exists (
      select 1 from public.learning_path_progress as progress
      where progress.user_id = (select auth.uid()) and progress.day_number = steps.day_number
    )
  from public.learning_path_steps as steps
  where (select auth.uid()) is not null
  order by steps.day_number;
$$;

comment on function public.writers_hub_learning_path() is
  'The learning path''s seven days in order, each with whether the caller marked it done (GAPS-12g).';
revoke all on function public.writers_hub_learning_path() from public, anon;
grant execute on function public.writers_hub_learning_path() to authenticated;

/**
 * mark_learning_step: the caller ticks a day of the learning path, or takes the tick off.
 * Inputs: target_day (1 to 7) and is_done.
 * Returns: true when the day is now ticked, false when it isn't.
 * Errors: insufficient_privilege for a signed-out caller; check_violation for a day outside the
 *   path.
 * Reading and ticking a lesson is open to every signed-in account, a read-only one included:
 * it publishes nothing and nobody else sees it.
 */
create function public.mark_learning_step(target_day integer, is_done boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null then
    raise exception 'Log in to follow the learning path.' using errcode = 'insufficient_privilege';
  end if;
  if target_day is null or target_day not between 1 and 7 then
    raise exception 'The learning path has days 1 to 7.' using errcode = 'check_violation';
  end if;
  -- Taking the tick off removes the row; ticking twice changes nothing.
  if not coalesce(is_done, false) then
    delete from public.learning_path_progress where user_id = caller_id and day_number = target_day;
    return false;
  end if;
  insert into public.learning_path_progress (user_id, day_number) values (caller_id, target_day)
  on conflict on constraint learning_path_progress_one_per_day do nothing;
  return true;
end;
$$;

comment on function public.mark_learning_step(integer, boolean) is
  'The caller marks a learning path day done, or not done again (GAPS-12g).';
revoke all on function public.mark_learning_step(integer, boolean) from public, anon;
grant execute on function public.mark_learning_step(integer, boolean) to authenticated;

/**
 * admin_save_learning_step: staff change one day's words.
 * Inputs: target_day (1 to 7) and step, a JSON object with title_ro, title_en (1 to 80
 *   characters), lesson_ro, lesson_en (1 to 1,500) and task_ro, task_en (1 to 300).
 * Returns: true.
 * Errors: insufficient_privilege unless the caller may act on contests; check_violation for an
 *   empty or long text; no_data_found for a day outside the path.
 * Logged as learning_step.saved with the before and after values.
 */
create function public.admin_save_learning_step(target_day integer, step jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.learning_path_steps;
  saved public.learning_path_steps;
begin
  -- Step 1: staff with the contests area only (the server decides, architecture 1.8.1).
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change the learning path.' using errcode = 'insufficient_privilege';
  end if;
  if step is null then
    raise exception 'A day needs its texts.' using errcode = 'check_violation';
  end if;
  -- Step 2: the day as it was, held while it changes.
  select * into before_row from public.learning_path_steps where day_number = target_day for update;
  if before_row.id is null then
    raise exception 'The learning path has days 1 to 7.' using errcode = 'no_data_found';
  end if;
  -- Step 3: the new words. The table's checks refuse an empty or long text.
  update public.learning_path_steps set
    title_ro = btrim(coalesce(step ->> 'title_ro', '')), title_en = btrim(coalesce(step ->> 'title_en', '')),
    lesson_ro = btrim(coalesce(step ->> 'lesson_ro', '')), lesson_en = btrim(coalesce(step ->> 'lesson_en', '')),
    task_ro = btrim(coalesce(step ->> 'task_ro', '')), task_en = btrim(coalesce(step ->> 'task_en', '')),
    updated_by_user_id = (select auth.uid())
  where id = before_row.id returning * into saved;
  -- Step 4: the audit log keeps what changed, in the same transaction.
  perform public.log_staff_action('learning_step.saved', 'learning_path_steps', saved.id::text, null, null,
    to_jsonb(before_row) - array['id', 'updated_by_user_id', 'created_at', 'updated_at'],
    to_jsonb(saved) - array['id', 'updated_by_user_id', 'created_at', 'updated_at']);
  return true;
end;
$$;

comment on function public.admin_save_learning_step(integer, jsonb) is
  'Contest staff change one learning path day''s title, lesson and task; logged with before and after (GAPS-12g).';
revoke all on function public.admin_save_learning_step(integer, jsonb) from public, anon;
grant execute on function public.admin_save_learning_step(integer, jsonb) to authenticated;

/* ---------- The seven days, as draft text for staff to change ---------- */

insert into public.learning_path_steps (day_number, title_en, title_ro, lesson_en, lesson_ro, task_en, task_ro) values
(1, 'Find your idea', 'Găsește ideea',
 E'A story starts with a question you want answered. What if the lift stopped between floors and a stranger knew your name? What if the letter was never meant for you?\n\nYou don''t need a whole plot today. You need one situation that makes you curious, with a person in it who wants something.',
 E'O poveste începe cu o întrebare la care vrei un răspuns. Ce-ar fi dacă liftul s-ar opri între etaje și un necunoscut ți-ar ști numele? Ce-ar fi dacă scrisoarea n-ar fi fost pentru tine?\n\nAzi nu ai nevoie de toată intriga. Ai nevoie de o situație care te face curios, cu un om în ea care vrea ceva.',
 'Write three "what if" questions. Pick the one you keep thinking about.',
 'Scrie trei întrebări care încep cu „ce-ar fi dacă”. Alege-o pe cea la care te tot gândești.'),
(2, 'Meet your main character', 'Cunoaște personajul principal',
 E'Readers follow people, not events. Before you write, learn three things about the person at the centre: what they want, what they are afraid of, and one small habit nobody else has.\n\nA want gives the story its direction. A fear gives it something to push against. A habit makes the person feel real on the first page.',
 E'Cititorii urmăresc oameni, nu întâmplări. Înainte să scrii, află trei lucruri despre omul din centru: ce vrea, de ce se teme și un obicei mărunt pe care nu-l mai are nimeni.\n\nDorința dă direcția poveștii. Frica îi dă ceva de înfruntat. Obiceiul face personajul să pară viu de la prima pagină.',
 'Write five lines about your main character: a name, a want, a fear, a habit and one secret.',
 'Scrie cinci rânduri despre personajul principal: un nume, o dorință, o frică, un obicei și un secret.'),
(3, 'Pick where it starts', 'Alege unde începe',
 E'Start as close as you can to the moment things change. Not the morning alarm and breakfast: the knock on the door.\n\nA good opening scene has a place the reader can see, the main character doing something, and one thing that is not as it should be.',
 E'Începe cât mai aproape de clipa în care lucrurile se schimbă. Nu cu alarma de dimineață și micul dejun, ci cu bătaia în ușă.\n\nO scenă bună de început are un loc pe care cititorul îl poate vedea, personajul principal care face ceva și un lucru care nu e cum ar trebui.',
 'Write one sentence that says where the story opens, who is there and what is wrong.',
 'Scrie o propoziție care spune unde începe povestea, cine e acolo și ce nu e în regulă.'),
(4, 'Write 500 words', 'Scrie 500 de cuvinte',
 E'Today you write, and you don''t go back. A first draft only has to exist. Clumsy sentences are fine: you will fix them on day 6.\n\nSet a timer for 25 minutes and keep the scene moving: what does the character do next, and what gets in the way?',
 E'Azi scrii și nu te întorci. O primă ciornă trebuie doar să existe. Propozițiile stângace sunt în regulă: le repari în ziua 6.\n\nPune un cronometru la 25 de minute și ține scena în mișcare: ce face personajul mai departe și ce îi stă în cale?',
 'Open a new chapter and write 500 words of the opening scene without editing.',
 'Deschide un capitol nou și scrie 500 de cuvinte din scena de început, fără să corectezi.'),
(5, 'Reach the end of the chapter', 'Ajungi la finalul capitolului',
 E'A chapter ends when something has changed: the character has learned a thing, lost a thing or made a choice. It doesn''t need a twist.\n\nKeep writing from where you stopped until that change happens. Then stop on a line that makes the reader want the next page.',
 E'Un capitol se termină când ceva s-a schimbat: personajul a aflat ceva, a pierdut ceva sau a făcut o alegere. Nu e nevoie de o răsturnare de situație.\n\nScrie mai departe de unde te-ai oprit, până apare schimbarea. Apoi oprește-te la un rând care îl face pe cititor să vrea pagina următoare.',
 'Write on to the end of the scene and finish with a line that leaves a question open.',
 'Scrie până la finalul scenei și încheie cu un rând care lasă o întrebare deschisă.'),
(6, 'Read it aloud and tidy', 'Citește cu voce tare și aranjează',
 E'Read the chapter aloud, slowly. Where you stumble, the sentence is too long. Where you get bored, something can go.\n\nCut what repeats, swap a vague word for a precise one, and check that every paragraph of speech makes clear who is talking. Leave the rest alone: done is better than perfect.',
 E'Citește capitolul cu voce tare, fără grabă. Unde te împiedici, propoziția e prea lungă. Unde te plictisești, ceva poate să dispară.\n\nTaie ce se repetă, schimbă un cuvânt vag cu unul precis și verifică dacă în fiecare replică e limpede cine vorbește. Restul lasă-l așa: terminat e mai bine decât perfect.',
 'Read the chapter aloud once and make ten small fixes.',
 'Citește capitolul o dată cu voce tare și fă zece corecturi mici.'),
(7, 'Give it a title and publish', 'Pune un titlu și publică',
 E'A title is a promise: it tells the reader what kind of story this is. A short description does the rest: who, where and what is at stake, in two sentences, without giving away the end.\n\nPick the rating and labels honestly so the right readers find it. Then publish. A first chapter that is out in the world teaches you more than ten in a drawer.',
 E'Titlul e o promisiune: îi spune cititorului ce fel de poveste e aceasta. O descriere scurtă face restul: cine, unde și ce e în joc, în două propoziții, fără să dezvăluie finalul.\n\nAlege cu sinceritate categoria de vârstă și etichetele, ca să te găsească cititorii potriviți. Apoi publică. Un prim capitol ajuns în lume te învață mai mult decât zece ținute în sertar.',
 'Give the story a title and a two-sentence description, then publish the chapter.',
 'Pune poveștii un titlu și o descriere de două propoziții, apoi publică capitolul.');

/* ---------- Download my data and account deletion ---------- */

-- Unchanged except for the new table, which is in Download my data.
CREATE OR REPLACE FUNCTION public.data_export_tables()
 RETURNS TABLE(table_name text, is_included boolean, why_left_out text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('certificates', true, null),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_moves', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('contest_entries', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_list_stories', true, null),
    ('reading_lists', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile'),
    ('waitlist_entries', true, null),
    ('writer_spotlights', true, null),
    ('writing_days', true, null),
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g).';

-- Unchanged except for the new table: the ticks go with the account.
CREATE OR REPLACE FUNCTION public.account_deletion_rules()
 RETURNS TABLE(table_name text, action text, step integer, why text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('certificates', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_moves', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('contest_entries', 'delete', 1, null),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_list_stories', 'delete', 1, null),
    ('reading_lists', 'delete', 2, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null),
    ('waitlist_entries', 'delete', 1, null),
    ('writer_ranks', 'delete', 1, null),
    ('writer_spotlights', 'delete', 1, null),
    ('writing_days', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g).';
