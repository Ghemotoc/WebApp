/*
 * Migration: remembered places (design books review, item 17, "Don't start from zero"; Saffer's
 * rule and Tidwell's "Changes in Midstream": people come back later and expect their place).
 *
 * What it adds:
 * - remembered_place_kind: what is remembered. story_edition (the language edition a reader last
 *   chose for a story), atlas_section (the Story Atlas section a writer last had open for a story),
 *   write_caret (where the caret was in Write, per story) and atlas_hint (how many times a writer
 *   has seen an Atlas hint, for item 18, so a hint can fold away after three visits).
 * - remembered_places: one small row per person, kind and item (a story's address or a hint's
 *   name), so a signed-in person finds the same place on every device. A signed-out visitor's
 *   places stay in the browser (src/lib/remembered/); nothing is stored for them here.
 * - remember_place(): the one way to write a row (create or replace).
 * - The two account registries learn the new table: Download my data includes it, and deleting
 *   the account deletes it (account_deletion_rules and data_export_tables, re-declared as they
 *   stand with one row added each).
 * Reading settings are not here: they already follow the account (reading_settings, S1-E4-02).
 * Privacy: which language someone reads in, where their caret was and which Atlas section they
 *   had open are personal data of a mild kind; each row is readable by its owner only, never shown
 *   to anyone else, and the values are small (a 2 KB cap) so nobody can use it as storage.
 * Who calls it: src/lib/remembered/rememberedPlaces.ts.
 * Tests: supabase/tests/database/400-remembered-places.test.sql.
 */

/* ---------- What is remembered ---------- */

create type public.remembered_place_kind as enum ('story_edition', 'atlas_section', 'write_caret', 'atlas_hint');
comment on type public.remembered_place_kind is
  'What a remembered place holds: a story''s last edition, Atlas section or caret in Write, or an Atlas hint''s visits (design books item 17).';

/* ---------- Table ---------- */

create table public.remembered_places (
  id uuid primary key default gen_random_uuid(),
  -- The person (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  kind public.remembered_place_kind not null,
  -- The item it is about: a story's address (slug) or a hint's name. Never a user ID.
  item_key text not null check (char_length(item_key) between 1 and 200),
  -- The place itself, small: an edition's address, a section's name, a caret position, a count.
  place jsonb not null check (pg_column_size(place) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, item_key)
);
comment on table public.remembered_places is
  'kind: user_action
Where a person was, per story or hint, so they come back to the same place on every device (design books item 17). Private.';
create trigger remembered_places_set_updated_at
  before update on public.remembered_places
  for each row execute function public.set_updated_at();
alter table public.remembered_places enable row level security;

-- Who: the person. Why: their own places, read on every device they log in on (design books
-- item 17); nobody else needs to know where someone was. Writes go only through remember_place().
create policy remembered_places_select_own on public.remembered_places
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.remembered_places to authenticated;

/* ---------- Saving ---------- */

/*
 * remember_place: keeps one place for the caller (design books item 17).
 * Inputs: the kind, the item's key (a story's address or a hint's name) and the place (small JSON).
 * Returns: nothing.
 * Errors: 42501 when signed out; 23514 (check_violation) for an empty or over-long key or a
 *   place over 2 KB.
 * Flow: rememberedPlaces.ts (a reader picks a language, a writer opens an Atlas section or moves
 *   the caret) → this function → remembered_places, read back on every device.
 */
create function public.remember_place(
  place_kind public.remembered_place_kind,
  place_key text,
  place_value jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in person has places to keep; a visitor's stay in the browser.
  if caller is null then
    raise exception 'Log in to keep your place.' using errcode = '42501';
  end if;
  -- Step 2: one row per kind and item, created the first time and replaced after that.
  insert into public.remembered_places (user_id, kind, item_key, place)
  values (caller, place_kind, place_key, place_value)
  on conflict (user_id, kind, item_key) do update
    set place = excluded.place;
end;
$$;
comment on function public.remember_place is
  'Keeps one of the caller''s places (a story''s edition, Atlas section or caret, or a hint''s visits) for every device (design books item 17).';

revoke all on function public.remember_place from public, anon;
grant execute on function public.remember_place to authenticated;

/* ---------- The account registries ---------- */

/*
 * account_deletion_rules: as it stands, plus remembered_places, deleted with the account
 * (S1-E13-03; design books item 17).
 */
CREATE OR REPLACE FUNCTION "public"."account_deletion_rules"() RETURNS TABLE("table_name" "text", "action" "text", "step" integer, "why" "text")
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('account_last_used', 'delete', 1, null),
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
    ('class_chapter_opens', 'delete', 1, null),
    ('class_competition_criteria', 'delete', 2, null),
    ('class_competition_entrants', 'delete', 1, null),
    ('class_competition_results', 'delete', 1, null),
    ('class_competition_scores', 'delete', 1, null),
    ('class_competitions', 'delete', 3, null),
    ('class_criteria_templates', 'delete', 1, null),
    ('class_point_gifts', 'delete', 1, null),
    ('class_teacher_points', 'delete', 1, null),
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
    ('forum_post_votes', 'delete', 1, null),
    ('forum_thread_follows', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('home_comment_picks', 'delete', 1, null),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('landing_page_reminders', 'delete', 1, null),
    ('learning_path_progress', 'delete', 1, null),
    ('library_entries', 'delete', 1, null),
    ('live_session_reminders', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('member_last_active', 'delete', 1, null),
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
    ('remembered_places', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('space_join_notes', 'delete', 1, null),
    ('space_members', 'delete', 1, null),
    ('space_moderation_log', 'kept', 0, 'a record of moderation in the space, kept while the space exists, the moderator shown as a deleted account'),
    ('spaces', 'kept', 0, 'the space stays for its members, its owner shown as a deleted account (a question for Robert, FORUMS-2a)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_archives', 'kept', 0, 'the archive of an unused account''s stories, kept story_archive_years so the writer can bring them back (ARCHIVE-1)'),
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

/*
 * data_export_tables: as it stands, plus remembered_places, included in Download my data
 * (S1-E13-02; design books item 17).
 */
CREATE OR REPLACE FUNCTION "public"."data_export_tables"() RETURNS TABLE("table_name" "text", "is_included" boolean, "why_left_out" "text")
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  values
    ('account_deletions', true, null),
    ('account_last_used', true, null),
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
    ('class_chapter_opens', true, null),
    ('class_competition_criteria', true, null),
    ('class_competition_entrants', true, null),
    ('class_competition_results', true, null),
    ('class_competition_scores', true, null),
    ('class_competitions', true, null),
    ('class_criteria_templates', true, null),
    ('class_point_gifts', true, null),
    ('class_teacher_points', true, null),
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
    ('forum_post_votes', true, null),
    ('forum_thread_follows', true, null),
    ('forum_thread_reads', true, null),
    ('forum_threads', true, null),
    ('home_comment_picks', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('landing_page_reminders', true, null),
    ('learning_path_progress', true, null),
    ('library_entries', true, null),
    ('live_session_reminders', true, null),
    ('manual_age_checks', true, null),
    ('member_last_active', true, null),
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
    ('remembered_places', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('space_join_notes', true, null),
    ('space_members', true, null),
    ('space_moderation_log', true, null),
    ('spaces', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_archives', false, 'the stories of a closed account, kept for their writer; a person who brings them back gets them as their own stories'),
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
