/*
 * Migration: writer of the week on the Writers' hub (bundle GAPS-12e; board WritersHub, "Writer
 * of the week · staff pick": the writer's picture and name, a line about them and Follow). Part 5
 * of GAPS-12.
 *
 * How it works: staff pick a writer for a week and write one line, in Romanian and English, on
 * why. Nothing shows until the writer agrees: the invitation appears on the writer's own hub with
 * "Agree" and "Decline". Once agreed, the hub shows the writer to every signed-in member for 7
 * days, with a Follow button and a link to the profile. The writer can change the answer at any
 * time; declining takes the card down at once.
 * What it adds:
 * - writer_spotlights: one row per pick, with the writer's answer and when they gave it;
 * - writers_hub_spotlight(): this week's agreed pick, for the hub;
 * - my_writer_spotlights(): the caller's own invitations that haven't ended;
 * - answer_writer_spotlight(): the writer agrees or declines;
 * - admin_writer_spotlights(), admin_invite_writer_spotlight() and
 *   admin_delete_writer_spotlight(): staff with the contests area (owner and admin, architecture
 *   1.8.3), each change in the audit log.
 * Who calls it: src/features/hub/ (the hub cards and the staff page at /staff/hub).
 * Rules:
 * - The writer's agreement is recorded before anyone else sees the pick (GAPS-12 brief: "staff
 *   pick with the writer's agreement recorded"; GDPR art. 7(3): as easy to withdraw as to give).
 * - Adults only: a minor is never put forward on a page every member sees (under-18s are private
 *   by default, architecture 1.10).
 * - Staff can't change the line after inviting: the writer agreed to those words. To change it,
 *   staff delete the pick and invite again.
 * - No new kind of user content: the card shows the writer's public profile and staff's own
 *   words, so there is nothing new to report (CLAUDE.md rule 6). Blocks are respected.
 */

create table public.writer_spotlights (
  id uuid primary key default gen_random_uuid(),
  -- The writer staff picked.
  user_id uuid not null references public.profiles (id),
  -- The first of the 7 days the pick shows, in Romanian time.
  starts_on date not null,
  -- Staff's one line on why this writer, in both languages.
  reason_ro text not null,
  reason_en text not null,
  -- When the writer agreed to be shown; null until then and after declining.
  agreed_at timestamptz,
  -- When the writer declined; null until then and after agreeing.
  declined_at timestamptz,
  -- The staff member who invited the writer.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting takes it off the hub; the audit log keeps what it said.
  deleted_at timestamptz,
  constraint writer_spotlights_reason_ro_length check (char_length(btrim(reason_ro)) between 1 and 300),
  constraint writer_spotlights_reason_en_length check (char_length(btrim(reason_en)) between 1 and 300),
  -- One answer at a time: agreed or declined, never both.
  constraint writer_spotlights_one_answer check (agreed_at is null or declined_at is null)
);

comment on table public.writer_spotlights is
  'kind: user_action
Writer of the week on the Writers'' hub: the writer staff picked, the first day, staff''s line on why in Romanian and English, and the writer''s own answer with its time (GAPS-12e). Personal data: that the person was picked and whether they agreed.';

-- One pick starts on any one day.
create unique index writer_spotlights_one_per_day on public.writer_spotlights (starts_on) where deleted_at is null;
create index writer_spotlights_by_writer on public.writer_spotlights (user_id) where deleted_at is null;

create trigger writer_spotlights_set_updated_at
  before update on public.writer_spotlights
  for each row execute function public.set_updated_at();
create trigger writer_spotlights_refuse_user_id_change
  before update on public.writer_spotlights
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.writer_spotlights enable row level security;

/**
 * writer_spotlights_select_own: the picked writer reads their own invitations, so Download my
 * data and the hub can show them. Answers go through answer_writer_spotlight().
 */
create policy writer_spotlights_select_own
  on public.writer_spotlights for select to authenticated
  using (deleted_at is null and user_id = (select auth.uid()));
comment on policy writer_spotlights_select_own on public.writer_spotlights is
  'Allows the picked writer to read their own writer-of-the-week invitations that aren''t deleted (GAPS-12e).';

/**
 * writer_spotlights_select_contest_staff: staff with the contests area read every pick that isn't
 * deleted, for the staff page. Other members never read the table: they get this week's agreed
 * pick through writers_hub_spotlight(). Writes go through the functions below.
 */
create policy writer_spotlights_select_contest_staff
  on public.writer_spotlights for select to authenticated
  using (deleted_at is null and (select public.staff_may('contests', 'view')));
comment on policy writer_spotlights_select_contest_staff on public.writer_spotlights is
  'Allows staff with the contests area to read the writer-of-the-week picks that aren''t deleted (GAPS-12e).';

grant select on public.writer_spotlights to authenticated;

/**
 * writer_spotlight_answer: the writer's answer in one word.
 * Input: one pick. Returns: 'agreed', 'declined' or 'waiting'. Internal.
 */
create function public.writer_spotlight_answer(spotlight public.writer_spotlights)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when spotlight.agreed_at is not null then 'agreed'
    when spotlight.declined_at is not null then 'declined'
    else 'waiting'
  end;
$$;

comment on function public.writer_spotlight_answer(public.writer_spotlights) is
  'Internal: a writer-of-the-week pick''s answer as agreed, declined or waiting (GAPS-12e).';
revoke all on function public.writer_spotlight_answer(public.writer_spotlights) from public, anon;
grant execute on function public.writer_spotlight_answer(public.writer_spotlights) to authenticated;

/**
 * writers_hub_spotlight: this week's writer of the week, for the hub.
 * Inputs: none. Returns: no row or one: the writer's username and shown name, staff's line in
 *   both languages and whether the caller is that writer. Only a pick the writer agreed to, during its 7 days, while the writer's
 *   account is active and adult, and not when the caller and the writer block each other.
 *   Nothing for a signed-out caller. Never the user ID.
 * Flow: HubSpotlight → useHubSpotlight → api/hubSpotlight.ts → this function.
 */
create function public.writers_hub_spotlight()
returns table (handle text, display_name text, reason_ro text, reason_en text, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profiles.handle,
    public.display_name(profiles.handle, profiles.pen_name),
    writer_spotlights.reason_ro,
    writer_spotlights.reason_en,
    -- The picked writer sees their own card without Follow.
    profiles.id = (select auth.uid())
  from public.writer_spotlights
  join public.profiles on profiles.id = writer_spotlights.user_id
  where (select auth.uid()) is not null
    and writer_spotlights.deleted_at is null
    -- The writer's agreement comes first (GAPS-12 brief).
    and writer_spotlights.agreed_at is not null
    -- Its 7 days, the first and the last included.
    and public.romania_today() between writer_spotlights.starts_on and writer_spotlights.starts_on + 6
    -- A deleted, suspended or banned account is never put forward.
    and profiles.deleted_at is null
    and public.account_state(profiles.id) = 'active'
    -- Adults only (architecture 1.10: under-18s are private by default).
    and public.age_band_of(profiles.id) = '18_plus'
    -- Blocks are respected (CLAUDE.md rule 6).
    and not public.is_blocked_with(profiles.id)
  order by writer_spotlights.starts_on desc
  limit 1;
$$;

comment on function public.writers_hub_spotlight() is
  'This week''s writer of the week, only once the writer agreed and while the account is active and adult; blocks respected (GAPS-12e).';
revoke all on function public.writers_hub_spotlight() from public, anon;
grant execute on function public.writers_hub_spotlight() to authenticated;

/**
 * my_writer_spotlights: the caller's own invitations whose 7 days haven't ended, soonest first.
 * Inputs: none. Returns: the pick's ID, its first and last day, staff's line in both languages
 *   and the caller's answer (agreed, declined or waiting).
 * Flow: HubSpotlightInvitation → useMySpotlights → api/hubSpotlight.ts → this function.
 */
create function public.my_writer_spotlights()
returns table (spotlight_id uuid, starts_on date, ends_on date, reason_ro text, reason_en text, answer text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    writer_spotlights.id,
    writer_spotlights.starts_on,
    writer_spotlights.starts_on + 6,
    writer_spotlights.reason_ro,
    writer_spotlights.reason_en,
    public.writer_spotlight_answer(writer_spotlights)
  from public.writer_spotlights
  where writer_spotlights.user_id = (select auth.uid())
    and writer_spotlights.deleted_at is null
    and writer_spotlights.starts_on + 6 >= public.romania_today()
  order by writer_spotlights.starts_on
  limit 4;
$$;

comment on function public.my_writer_spotlights() is
  'The caller''s own writer-of-the-week invitations that haven''t ended, with their answer (GAPS-12e).';
revoke all on function public.my_writer_spotlights() from public, anon;
grant execute on function public.my_writer_spotlights() to authenticated;

/**
 * answer_writer_spotlight: the picked writer agrees to be shown, or declines. The answer can be
 * changed at any time before the 7 days end (GDPR art. 7(3)); declining takes the card down at
 * once.
 * Inputs: spotlight_id and agrees. Returns: the new answer, 'agreed' or 'declined'.
 * Errors: no_data_found when the pick isn't the caller's, was deleted or has ended.
 */
create function public.answer_writer_spotlight(spotlight_id uuid, agrees boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.writer_spotlights;
begin
  -- Only the picked writer, only a pick that still exists and hasn't ended.
  update public.writer_spotlights set
    agreed_at = case when coalesce(agrees, false) then now() else null end,
    declined_at = case when coalesce(agrees, false) then null else now() end
  where id = spotlight_id
    and user_id = (select auth.uid())
    and deleted_at is null
    and starts_on + 6 >= public.romania_today()
  returning * into saved;
  if saved.id is null then
    raise exception 'There is no such invitation.' using errcode = 'no_data_found';
  end if;
  return public.writer_spotlight_answer(saved);
end;
$$;

comment on function public.answer_writer_spotlight(uuid, boolean) is
  'The picked writer agrees to be writer of the week or declines; changeable until the week ends (GAPS-12e).';
revoke all on function public.answer_writer_spotlight(uuid, boolean) from public, anon;
grant execute on function public.answer_writer_spotlight(uuid, boolean) to authenticated;

/**
 * admin_writer_spotlights: the picks for the staff page, newest first.
 * Inputs: none. Returns: up to 30 rows: the pick's ID, the writer's username and shown name, the
 *   first day, staff's line in both languages and the writer's answer.
 * Errors: insufficient_privilege unless the caller may view contests.
 */
create function public.admin_writer_spotlights()
returns table (
  spotlight_id uuid,
  handle text,
  display_name text,
  starts_on date,
  reason_ro text,
  reason_en text,
  answer text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('contests', 'view') then
    raise exception 'Only contest staff can see the picks.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select writer_spotlights.id, profiles.handle,
      public.display_name(profiles.handle, profiles.pen_name),
      writer_spotlights.starts_on, writer_spotlights.reason_ro, writer_spotlights.reason_en,
      public.writer_spotlight_answer(writer_spotlights)
    from public.writer_spotlights
    join public.profiles on profiles.id = writer_spotlights.user_id
    where writer_spotlights.deleted_at is null
    order by writer_spotlights.starts_on desc
    limit 30;
end;
$$;

comment on function public.admin_writer_spotlights() is
  'Contest staff list the writer-of-the-week picks with each writer''s answer (GAPS-12e).';
revoke all on function public.admin_writer_spotlights() from public, anon;
grant execute on function public.admin_writer_spotlights() to authenticated;

/**
 * admin_invite_writer_spotlight: staff pick a writer for the 7 days from a day and write why. The
 * writer sees the invitation on their own hub; nobody else sees anything until they agree.
 * Inputs: target_handle (the writer's username), first_day, reason_ro and reason_en (1 to 300
 *   characters).
 * Returns: the pick's ID.
 * Errors: insufficient_privilege unless the caller may act on contests; check_violation for an
 *   unknown username, a writer who isn't an active adult, a missing day or an empty or long line;
 *   unique_violation when another pick starts that day.
 * Logged as writer_spotlight.invited (the writer as the target, never the line's reader).
 */
create function public.admin_invite_writer_spotlight(target_handle text, first_day date, reason_ro text, reason_en text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer public.profiles;
  saved public.writer_spotlights;
begin
  -- Step 1: staff with the contests area only (the server decides, architecture 1.8.1).
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can pick the writer of the week.' using errcode = 'insufficient_privilege';
  end if;
  if first_day is null then
    raise exception 'A pick needs its first day.' using errcode = 'check_violation';
  end if;
  -- Step 2: the writer exists, can write and is an adult.
  select * into writer from public.profile_for_handle(btrim(coalesce(target_handle, '')));
  if writer.id is null or public.account_state(writer.id) <> 'active' then
    raise exception 'There is no active account with that username.' using errcode = 'check_violation';
  end if;
  if public.age_band_of(writer.id) <> '18_plus' then
    raise exception 'Only an adult can be writer of the week.' using errcode = 'check_violation';
  end if;
  -- Step 3: the pick, waiting for the writer's answer. The table's checks refuse bad lines.
  insert into public.writer_spotlights (user_id, starts_on, reason_ro, reason_en, updated_by_user_id)
  values (writer.id, first_day, btrim(reason_ro), btrim(reason_en), (select auth.uid()))
  returning * into saved;
  -- Step 4: the audit log, in the same transaction.
  perform public.log_staff_action('writer_spotlight.invited', 'writer_spotlights', saved.id::text, writer.id, null,
    null, jsonb_build_object('starts_on', saved.starts_on, 'reason_ro', saved.reason_ro, 'reason_en', saved.reason_en));
  return saved.id;
end;
$$;

comment on function public.admin_invite_writer_spotlight(text, date, text, text) is
  'Contest staff invite an adult writer to be writer of the week; shown only once the writer agrees; logged (GAPS-12e).';
revoke all on function public.admin_invite_writer_spotlight(text, date, text, text) from public, anon;
grant execute on function public.admin_invite_writer_spotlight(text, date, text, text) to authenticated;

/**
 * admin_delete_writer_spotlight: takes a pick off the hub, the writer's invitations and the staff
 * list; the audit log keeps what it said.
 * Input: spotlight_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on contests; no_data_found for an
 *   unknown pick.
 */
create function public.admin_delete_writer_spotlight(spotlight_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.writer_spotlights;
begin
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can pick the writer of the week.' using errcode = 'insufficient_privilege';
  end if;
  update public.writer_spotlights set deleted_at = now(), updated_by_user_id = (select auth.uid())
  where id = spotlight_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such pick.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('writer_spotlight.deleted', 'writer_spotlights', deleted.id::text, deleted.user_id, null,
    jsonb_build_object('starts_on', deleted.starts_on, 'reason_ro', deleted.reason_ro, 'reason_en', deleted.reason_en,
      'answer', public.writer_spotlight_answer(deleted)), null);
  return true;
end;
$$;

comment on function public.admin_delete_writer_spotlight(uuid) is
  'Contest staff delete a writer-of-the-week pick; logged (GAPS-12e).';
revoke all on function public.admin_delete_writer_spotlight(uuid) from public, anon;
grant execute on function public.admin_delete_writer_spotlight(uuid) to authenticated;

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
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e).';

-- Unchanged except for the new table: the picks go with the account.
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
    ('writer_spotlights', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e).';
