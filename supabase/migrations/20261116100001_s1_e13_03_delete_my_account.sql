/*
 * Delete my account (story S1-E13-03; board Settings 6.3, the Delete account tab; GDPR art. 17;
 * Apple guideline 5.1.1(v) and Google Play's account deletion rule).
 *
 * How it works:
 * - request_account_deletion() closes the account at once: the profile is marked deleted, so it
 *   is hidden everywhere (every public read checks profiles.deleted_at) and the account gate says
 *   "deleted", so nothing can be written. The person's live stories and comments are marked
 *   deleted at the same moment, so readers stop seeing them too. The person must have signed in
 *   within the last few minutes (setting account_deletion_fresh_sign_in_minutes), the board's
 *   "Log in again to confirm".
 * - For 14 days (setting account_deletion_days) the person can log in and cancel:
 *   cancel_account_deletion() brings back the profile and exactly the stories and comments the
 *   request hid (they carry the request's own time in deleted_at).
 * - The nightly job purge-closed-accounts (purge_closed_accounts()) then deletes the account for
 *   good through delete_account_data(): stories, chapters, comments, messages and every other row
 *   in the one list account_deletion_rules(). Only content under an open case or an authority's
 *   preservation order is kept, until the case ends; the usual purges remove it after that.
 * - The user ID is never given to another account: the profile stays as an empty tombstone, the
 *   login row stays (no email, no password, no way in), and the username stays reserved, never
 *   shown, because the profile is hidden (proposal, docs/retention.md). Moderation records (reports, cases,
 *   statements of reasons, appeals) and the audit log keep pointing at it.
 * - Forum posts are kept, shown as "Deleted user" (decided 16 Oct 2026, Q47); forums come with
 *   S1-E8, which adds them to account_deletion_rules() as kept.
 * Who calls it: src/features/account-deletion/ (Settings › Delete account, the closing-account
 * page and /delete-account).
 */

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('account_deletion_days', '14'::jsonb, false,
   'Days between asking to delete an account and deleting it for good; the person can cancel until then (S1-E13-03).'),
  ('account_deletion_fresh_sign_in_minutes', '10'::jsonb, false,
   'Minutes after a log-in during which the person may confirm deleting their account (S1-E13-03, proposal).')
on conflict (key) do nothing;

/* ---------- A comment erased because its writer left ---------- */

-- A deleted comment with replies under it keeps its row so the replies stay in place, but its
-- words go when the account is deleted for good (Q47), so an empty body is allowed once deleted.
alter table public.comments drop constraint comments_body_is_written;
alter table public.comments add constraint comments_body_is_written check (
  (btrim(body) <> '' or deleted_at is not null) and char_length(body) <= 2000);

/* ---------- The requests ---------- */

create table public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  -- Whose account it is (CLAUDE.md rule 15). The row stays after the deletion as the record that
  -- it happened, with no personal data in it.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- When the person asked; the stories and comments the request hid carry this time.
  requested_at timestamptz not null default now(),
  -- When the nightly job deletes the account for good (requested_at + account_deletion_days).
  delete_after timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletions_ends_once check (cancelled_at is null or completed_at is null),
  constraint account_deletions_after_request check (delete_after > requested_at)
);

comment on table public.account_deletions is
  'kind: user_action
A person''s request to delete their account: closed at once, deleted for good after delete_after unless cancelled (S1-E13-03; GDPR art. 17). Kept after the deletion as its record.';
comment on column public.account_deletions.user_id is
  'The account being deleted; never shown publicly (rule 15).';

-- One open request per account at a time.
create unique index account_deletions_one_open on public.account_deletions (user_id)
  where cancelled_at is null and completed_at is null;
create index account_deletions_due on public.account_deletions (delete_after)
  where cancelled_at is null and completed_at is null;

create trigger account_deletions_set_updated_at
  before update on public.account_deletions
  for each row execute function public.set_updated_at();

create trigger account_deletions_refuse_user_id_change
  before update on public.account_deletions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.account_deletions enable row level security;

/**
 * Policy account_deletions_select_own: a signed-in person reads only their own requests.
 * Who: the account's owner. Why: the closing-account page shows when the deletion happens. Every
 * write goes through request_account_deletion(), cancel_account_deletion() and the nightly job.
 */
create policy account_deletions_select_own
  on public.account_deletions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy account_deletions_select_own on public.account_deletions is
  'Allows a signed-in person to read only their own deletion requests (S1-E13-03).';

grant select on public.account_deletions to authenticated;

/* ---------- Download my data lists the new table ---------- */

/**
 * data_export_tables: as in S1-E13-02, with account_deletions added (a person's own requests are
 * part of their data). Database test 210 checks every user table is in this list.
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
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
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
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
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: which user tables Download my data includes, and why any is left out (S1-E13-02, S1-E13-03).';
revoke execute on function public.data_export_tables() from public, anon, authenticated;

/* ---------- What the deletion does to each table ---------- */

/**
 * account_deletion_rules: every table that holds a person's content or actions, and what
 * deleting their account does to it. The one list: database test 211 fails when a table whose
 * comment says "kind: user_content" or "kind: user_action" is missing from it, so each later
 * content type says what happens to it (forum posts, S1-E8, are 'kept').
 * - 'delete': delete_account_data() deletes every row whose user_id is the account, in the order
 *   of step (children before parents);
 * - 'own_step': a step of its own in delete_account_data(), because content under an open case is
 *   kept or other people's rows depend on it (stories, chapters, comments, messages and so on);
 * - 'kept': not deleted, for the reason given (moderation records with their own retention, and
 *   proof the law asks for).
 * Returns: table_name, action, step and why. Internal: delete_account_data().
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
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
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
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
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03).';
revoke execute on function public.account_deletion_rules() from public, anon, authenticated;

/* ---------- The person's side ---------- */

/**
 * account_signed_in_recently: did the signed-in person log in within the last few minutes?
 * Returns: true when the newest sign-in in the token's "amr" claim is within the setting
 *   account_deletion_fresh_sign_in_minutes (10, a proposal). A refreshed token keeps the original
 *   sign-in time, so this means a new log-in (password, provider, passkey or link), not a refresh.
 * Where it fits: the board's "Log in again to confirm" before deleting an account; the same rule
 *   as staff_signed_in_recently() (S1-E11-01).
 */
create or replace function public.account_signed_in_recently()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select max(to_timestamp((method ->> 'timestamp')::double precision))
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    ) > now() - make_interval(
      mins => coalesce(public.setting_value('account_deletion_fresh_sign_in_minutes'), '10')::text::integer
    ),
    false
  );
$$;

comment on function public.account_signed_in_recently() is
  'True when the person logged in within account_deletion_fresh_sign_in_minutes, from the token''s amr claim (S1-E13-03).';
revoke execute on function public.account_signed_in_recently() from public, anon, authenticated;

/**
 * my_account_deletion: what Settings › Delete account and the closing-account page show.
 * Works while the account is closing (the profile is marked deleted), so the person can cancel.
 * Returns: { state: 'closing', requested_at, delete_after } while a request is open, otherwise
 *   { state: 'open', signed_in_recently, deletion_days } (whether "Delete my account" can be
 *   pressed now, and the number of days for the line on the board).
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_account_deletion()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request public.account_deletions;
begin
  if caller_id is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  -- Step 1: an open request means the account is closing.
  select * into request from public.account_deletions
  where account_deletions.user_id = caller_id
    and account_deletions.cancelled_at is null and account_deletions.completed_at is null;
  if found then
    return jsonb_build_object('state', 'closing', 'requested_at', request.requested_at,
      'delete_after', request.delete_after);
  end if;
  -- Step 2: otherwise the account is open; say whether the log-in is fresh enough to confirm.
  return jsonb_build_object('state', 'open',
    'signed_in_recently', public.account_signed_in_recently(),
    'deletion_days', coalesce((public.setting_value('account_deletion_days'))::integer, 14));
end;
$$;

comment on function public.my_account_deletion() is
  'The caller''s account deletion state: closing with its date, or open with whether they may confirm now (S1-E13-03).';
revoke execute on function public.my_account_deletion() from public, anon;
grant execute on function public.my_account_deletion() to authenticated;

/**
 * request_account_deletion: closes the caller's account at once and deletes it for good after
 * account_deletion_days (criterion 1).
 * Steps: the profile is marked deleted (hidden everywhere, nothing can be written), the live
 * stories and comments are marked deleted at the same moment, and the request is saved.
 * Returns: { delete_after }.
 * Errors: insufficient_privilege (hint signed_out) when signed out or already closed;
 *   check_violation with hint sign_in_again when the last log-in is older than
 *   account_deletion_fresh_sign_in_minutes; hint staff_account for a staff account (an owner
 *   removes the staff role first, so staff powers never sit on a closing account).
 */
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  deletion_days integer := coalesce((public.setting_value('account_deletion_days'))::integer, 14);
  closes_on timestamptz := now() + make_interval(days => deletion_days);
begin
  -- Step 1: the board's "Log in again to confirm".
  if not public.account_signed_in_recently() then
    raise exception 'Log in again to confirm.' using errcode = 'check_violation', hint = 'sign_in_again';
  end if;
  -- Step 2: a staff account keeps its staff powers off a closing account (architecture 1.8.1).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = caller_id) then
    raise exception 'A staff account can''t be deleted here.' using errcode = 'check_violation', hint = 'staff_account';
  end if;
  -- Step 3: the account closes: hidden everywhere, and online status forgotten.
  update public.profiles set deleted_at = now(), last_active_at = null where profiles.id = caller_id;
  -- Step 4: the live stories and comments go out of sight with the same time, so a cancel
  -- brings back exactly these (chapters follow their story).
  update public.stories set deleted_at = now()
  where stories.user_id = caller_id and stories.deleted_at is null;
  update public.comments set deleted_at = now(), deleted_by = 'author'
  where comments.user_id = caller_id and comments.deleted_at is null;
  -- Step 5: the request, for the closing page and the nightly job.
  insert into public.account_deletions (user_id, delete_after) values (caller_id, closes_on);
  return jsonb_build_object('delete_after', closes_on);
end;
$$;

comment on function public.request_account_deletion() is
  'Closes the caller''s account now and deletes it for good after account_deletion_days; needs a fresh log-in (S1-E13-03).';
revoke execute on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

/**
 * cancel_account_deletion: keeps the caller's account (the board's "Keep my account"), while the
 * request is still open.
 * Steps: the profile comes back, then exactly the stories and comments the request hid (their
 * deleted_at is the request's time); anything the person deleted themselves stays deleted.
 * Returns: { outcome: 'ok' } or { outcome: 'not_found' } when nothing is waiting.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request public.account_deletions;
begin
  if caller_id is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  -- Step 1: the open request, if any.
  select * into request from public.account_deletions
  where account_deletions.user_id = caller_id
    and account_deletions.cancelled_at is null and account_deletions.completed_at is null
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the account, its stories and its comments come back.
  update public.profiles set deleted_at = null where profiles.id = caller_id;
  update public.stories set deleted_at = null
  where stories.user_id = caller_id and stories.deleted_at = request.requested_at;
  update public.comments set deleted_at = null, deleted_by = null
  where comments.user_id = caller_id and comments.deleted_at = request.requested_at;
  -- Step 3: the request is closed as cancelled.
  update public.account_deletions set cancelled_at = now() where account_deletions.id = request.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.cancel_account_deletion() is
  'Keeps the caller''s closing account: brings back the profile and what the request hid (S1-E13-03).';
revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

/* ---------- Deleting for good ---------- */

/**
 * delete_account_stories: the stories and chapters of an account being deleted (criterion 2).
 * A chapter under an open case or an authority's preservation order is kept
 * (content_is_held_for_moderation(), criterion 4); a story is kept while it or a kept chapter is
 * held, marked deleted, so the usual story purge removes it once the case ends.
 * Input: the user ID. Internal: delete_account_data().
 */
create or replace function public.delete_account_stories(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: every chapter not held goes (its revisions, embeds, comments and likes with it).
  delete from public.chapters
  where chapters.user_id = target_user_id
    and not public.content_is_held_for_moderation('chapter', chapters.id);
  -- Step 2: the public "copies a published work" notes on stories that are going.
  delete from public.copied_work_notes
  using public.stories
  where stories.id = copied_work_notes.story_id and stories.user_id = target_user_id
    and not public.content_is_held_for_moderation('story', stories.id)
    and not exists (select 1 from public.chapters where chapters.story_id = stories.id);
  -- Step 3: every story not held and with no kept chapter goes (tags, follows, plans with it).
  delete from public.stories
  where stories.user_id = target_user_id
    and not public.content_is_held_for_moderation('story', stories.id)
    and not exists (select 1 from public.chapters where chapters.story_id = stories.id);
  -- Step 4: a kept story stays out of sight.
  update public.stories set deleted_at = coalesce(stories.deleted_at, now())
  where stories.user_id = target_user_id;
end;
$$;

comment on function public.delete_account_stories(uuid) is
  'Internal: deletes an account''s stories and chapters, keeping only what a case holds (S1-E13-03).';
revoke execute on function public.delete_account_stories(uuid) from public, anon, authenticated;

/**
 * delete_account_conversation: the comments, messages and pictures of an account being deleted.
 * - Comments go (Q47), except those a case holds; one with other people's replies keeps its row
 *   with its words erased, so the replies stay in place (purge_deleted_comments() removes it
 *   once they are gone).
 * - The person's own messages go, except reported ones still held (held_message_ids()); the
 *   person leaves each chat, so the chat clean-up removes it once the other person deletes it.
 * - Pictures go, except one a case or an authority's order keeps (preserve_until).
 * Input: the user ID. Internal: delete_account_data().
 */
create or replace function public.delete_account_conversation(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: comments with replies under them lose their words; the rest go.
  update public.comments
  set body = '', is_spoiler = false, deleted_at = coalesce(comments.deleted_at, now()),
      deleted_by = coalesce(comments.deleted_by, 'author')
  where comments.user_id = target_user_id
    and not public.content_is_held_for_moderation('comment', comments.id)
    and exists (select 1 from public.comments as replies where replies.parent_comment_id = comments.id);
  delete from public.comments
  where comments.user_id = target_user_id
    and not public.content_is_held_for_moderation('comment', comments.id)
    and not exists (select 1 from public.comments as replies where replies.parent_comment_id = comments.id);
  -- Step 2: the person's messages, and their place in each chat.
  delete from public.messages
  where messages.user_id = target_user_id
    and messages.id not in (select held.message_id from public.held_message_ids() as held);
  update public.conversation_members set deleted_at = coalesce(conversation_members.deleted_at, now())
  where conversation_members.user_id = target_user_id;
  -- Step 3: pictures, once nothing holds them; the profile stops pointing at its avatar first.
  update public.profiles set avatar_picture_id = null where profiles.id = target_user_id;
  delete from public.picture_checks
  where picture_checks.user_id = target_user_id
    and coalesce(picture_checks.preserve_until, '-infinity'::timestamptz) <= now()
    and not public.content_is_held_for_moderation('picture', picture_checks.id);
end;
$$;

comment on function public.delete_account_conversation(uuid) is
  'Internal: deletes an account''s comments, messages and pictures, keeping only what a case holds (S1-E13-03).';
revoke execute on function public.delete_account_conversation(uuid) from public, anon, authenticated;

/**
 * erase_closed_account: the account itself, once its content is gone. The profile becomes an
 * empty tombstone (marked deleted, no year or month of birth, age check, pen name, bio, birthday,
 * county, country or settings); its username stays reserved, never shown (proposal).
 * The login keeps its row, so the user ID can never be given to another account (criterion 3),
 * but loses its email, password, identities, passkeys and sessions.
 * Input: the user ID. Internal: delete_account_data().
 */
create or replace function public.erase_closed_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: the profile: deleted, with its personal details gone.
  update public.profiles
  set deleted_at = coalesce(profiles.deleted_at, now()), birth_year = null, birth_month = null,
      age_checked_at = null, age_check_method = null, pen_name = null, pen_name_changed_at = null,
      bio = '', birthday_day = null, birthday_month = null, region_code = null, country_code = null,
      shows_online_status = false, last_active_at = null, marketing_email_opt_in = false,
      teacher_badge_since = null, messages_from = null, profile_visible_to = null
  where profiles.id = target_user_id;
  -- Step 2: the login: no email, no password, no passkeys, no way back in.
  delete from auth.refresh_tokens where refresh_tokens.user_id = target_user_id::text;
  delete from auth.sessions where sessions.user_id = target_user_id;
  delete from auth.identities where identities.user_id = target_user_id;
  delete from auth.webauthn_credentials where webauthn_credentials.user_id = target_user_id;
  update auth.users
  set email = target_user_id::text || '@deleted.invalid', encrypted_password = '',
      raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = now() + interval '100 years'
  where users.id = target_user_id;
end;
$$;

comment on function public.erase_closed_account(uuid) is
  'Internal: empties a deleted account''s profile and login, keeping the user ID so it is never reused (S1-E13-03).';
revoke execute on function public.erase_closed_account(uuid) from public, anon, authenticated;

/**
 * delete_account_data: deletes one account for good (criteria 2 to 4).
 * Steps: stories and chapters, then comments, messages and pictures (both keep only what a case
 * holds), then both sides of follows and blocks, then every 'delete' table of
 * account_deletion_rules() in step order, then the profile and login.
 * Input: the user ID. Internal: purge_closed_accounts() (and database test 211).
 */
create or replace function public.delete_account_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule record;
begin
  -- Step 1: the content, keeping only what a case holds.
  perform public.delete_account_stories(target_user_id);
  perform public.delete_account_conversation(target_user_id);
  -- Step 2: follows and blocks, both ways.
  delete from public.follows_users
  where follows_users.user_id = target_user_id or follows_users.followed_user_id = target_user_id;
  delete from public.blocks
  where blocks.user_id = target_user_id or blocks.blocked_user_id = target_user_id;
  -- Step 3: every other row of the person's, children before parents.
  for rule in
    select rules.table_name from public.account_deletion_rules() as rules
    where rules.action = 'delete' order by rules.step, rules.table_name
  loop
    execute format('delete from public.%I where user_id = $1', rule.table_name) using target_user_id;
  end loop;
  -- Step 4: the account itself.
  perform public.erase_closed_account(target_user_id);
end;
$$;

comment on function public.delete_account_data(uuid) is
  'Internal: deletes an account for good, keeping only what a case holds and the moderation records (S1-E13-03).';
revoke execute on function public.delete_account_data(uuid) from public, anon, authenticated;

/**
 * purge_closed_accounts: the nightly job. Every request whose delete_after has passed, not
 * cancelled, is carried out and marked completed.
 * Returns: how many accounts were deleted. Runs nightly (job purge-closed-accounts).
 */
create or replace function public.purge_closed_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request record;
  deleted_count integer := 0;
begin
  for request in
    select account_deletions.id, account_deletions.user_id from public.account_deletions
    where account_deletions.delete_after <= now()
      and account_deletions.cancelled_at is null and account_deletions.completed_at is null
    order by account_deletions.delete_after
  loop
    perform public.delete_account_data(request.user_id);
    update public.account_deletions set completed_at = now() where account_deletions.id = request.id;
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;

comment on function public.purge_closed_accounts() is
  'Nightly: deletes for good every account whose 14 days have passed (S1-E13-03).';
revoke execute on function public.purge_closed_accounts() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('purge-closed-accounts', '5 3 * * *', 'select public.purge_closed_accounts()');
