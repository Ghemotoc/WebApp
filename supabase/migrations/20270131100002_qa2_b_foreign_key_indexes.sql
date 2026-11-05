-- QA-2b: indexes for the foreign keys that deletes and joins use (independent QA check,
-- 5 Nov 2026, finding S3; fix bundle QA-2).
--
-- What it does: adds a plain index on every foreign key that is deleted or cleared with its
-- parent row (ON DELETE CASCADE or SET NULL), plus three that most reads join on
-- (stories.user_id, chapters.user_id, comments.parent_comment_id). Without one, deleting a
-- story or an account reads the whole child table (a million notifications) while holding its
-- locks; and a query whose filter Postgres can't match to a partial index (chapters.story_id
-- has only partial ones) read every chapter: that is what made each story card take 36 seconds
-- on the volume seed (finding S1). Foreign keys to rows that are never deleted (most "who did it"
-- columns that point to profiles with no action) are left as they are.
-- The list came from pg_constraint on 5 Nov 2026 (scripts/volume/ times the result).
-- Who calls it: nobody; Postgres uses the indexes by itself.

create index if not exists account_deletions_user_id_fk_idx on public.account_deletions (user_id);
create index if not exists ad_blocked_categories_user_id_fk_idx on public.ad_blocked_categories (user_id);
create index if not exists ad_bookings_user_id_fk_idx on public.ad_bookings (user_id);
create index if not exists appeals_statement_id_fk_idx on public.appeals (statement_id);
create index if not exists case_account_links_case_id_fk_idx on public.case_account_links (case_id);
create index if not exists certificates_revoked_by_user_id_fk_idx on public.certificates (revoked_by_user_id);
create index if not exists certificates_teacher_user_id_fk_idx on public.certificates (teacher_user_id);
create index if not exists chapter_plan_characters_user_id_fk_idx on public.chapter_plan_characters (user_id);
create index if not exists chapter_plans_user_id_fk_idx on public.chapter_plans (user_id);
create index if not exists chapter_scenes_user_id_fk_idx on public.chapter_scenes (user_id);
create index if not exists chapters_story_id_fk_idx on public.chapters (story_id);
create index if not exists chapters_user_id_fk_idx on public.chapters (user_id);
create index if not exists cms_versions_language_code_fk_idx on public.cms_versions (language_code);
create index if not exists cms_versions_market_code_fk_idx on public.cms_versions (market_code);
create index if not exists cms_versions_user_id_fk_idx on public.cms_versions (user_id);
create index if not exists comments_chapter_id_fk_idx on public.comments (chapter_id);
create index if not exists comments_parent_comment_id_fk_idx on public.comments (parent_comment_id);
create index if not exists contest_entries_contest_id_fk_idx on public.contest_entries (contest_id);
create index if not exists contest_entries_disqualified_by_user_id_fk_idx on public.contest_entries (disqualified_by_user_id);
create index if not exists contests_user_id_fk_idx on public.contests (user_id);
create index if not exists conversations_user_id_fk_idx on public.conversations (user_id);
create index if not exists customisation_change_requests_requested_by_user_id_fk_idx on public.customisation_change_requests (requested_by_user_id);
create index if not exists customisation_change_requests_space_id_fk_idx on public.customisation_change_requests (space_id);
create index if not exists data_requests_support_ticket_id_fk_idx on public.data_requests (support_ticket_id);
create index if not exists email_outbox_conversation_id_fk_idx on public.email_outbox (conversation_id);
create index if not exists exports_data_request_id_fk_idx on public.exports (data_request_id);
create index if not exists exports_story_id_fk_idx on public.exports (story_id);
create index if not exists finished_thanks_story_id_fk_idx on public.finished_thanks (story_id);
create index if not exists forum_names_language_code_fk_idx on public.forum_names (language_code);
create index if not exists forum_read_marks_forum_id_fk_idx on public.forum_read_marks (forum_id);
create index if not exists forum_threads_answer_post_id_fk_idx on public.forum_threads (answer_post_id);
create index if not exists house_ads_user_id_fk_idx on public.house_ads (user_id);
create index if not exists interface_text_overrides_locale_fk_idx on public.interface_text_overrides (locale);
create index if not exists invites_space_id_fk_idx on public.invites (space_id);
create index if not exists landing_page_reminders_page_id_fk_idx on public.landing_page_reminders (page_id);
create index if not exists landing_page_versions_page_id_fk_idx on public.landing_page_versions (page_id);
create index if not exists landing_page_versions_user_id_fk_idx on public.landing_page_versions (user_id);
create index if not exists landing_pages_user_id_fk_idx on public.landing_pages (user_id);
create index if not exists manual_age_checks_user_id_fk_idx on public.manual_age_checks (user_id);
create index if not exists messages_user_id_fk_idx on public.messages (user_id);
create index if not exists moderated_items_sanction_id_fk_idx on public.moderated_items (sanction_id);
create index if not exists moderator_mail_threads_statement_id_fk_idx on public.moderator_mail_threads (statement_id);
create index if not exists notifications_appeal_id_fk_idx on public.notifications (appeal_id);
create index if not exists notifications_case_id_fk_idx on public.notifications (case_id);
create index if not exists notifications_change_request_id_fk_idx on public.notifications (change_request_id);
create index if not exists notifications_chapter_id_fk_idx on public.notifications (chapter_id);
create index if not exists notifications_comment_id_fk_idx on public.notifications (comment_id);
create index if not exists notifications_data_request_id_fk_idx on public.notifications (data_request_id);
create index if not exists notifications_landing_page_id_fk_idx on public.notifications (landing_page_id);
create index if not exists notifications_mail_thread_id_fk_idx on public.notifications (mail_thread_id);
create index if not exists notifications_space_id_fk_idx on public.notifications (space_id);
create index if not exists notifications_statement_id_fk_idx on public.notifications (statement_id);
create index if not exists notifications_story_id_fk_idx on public.notifications (story_id);
create index if not exists notifications_story_revision_id_fk_idx on public.notifications (story_revision_id);
create index if not exists profiles_avatar_picture_id_fk_idx on public.profiles (avatar_picture_id);
create index if not exists profiles_signature_picture_id_fk_idx on public.profiles (signature_picture_id);
create index if not exists public_notices_support_ticket_id_fk_idx on public.public_notices (support_ticket_id);
create index if not exists reading_preferences_category_id_fk_idx on public.reading_preferences (category_id);
create index if not exists reading_preferences_tag_id_fk_idx on public.reading_preferences (tag_id);
create index if not exists removed_passages_case_id_fk_idx on public.removed_passages (case_id);
create index if not exists removed_passages_chapter_id_fk_idx on public.removed_passages (chapter_id);
create index if not exists safety_contact_checks_closed_by_user_id_fk_idx on public.safety_contact_checks (closed_by_user_id);
create index if not exists safety_contacts_last_checked_by_user_id_fk_idx on public.safety_contacts (last_checked_by_user_id);
create index if not exists seasonal_occasions_user_id_fk_idx on public.seasonal_occasions (user_id);
create index if not exists space_moderation_log_thread_id_fk_idx on public.space_moderation_log (thread_id);
create index if not exists spaces_banner_picture_id_fk_idx on public.spaces (banner_picture_id);
create index if not exists spaces_handover_to_user_id_fk_idx on public.spaces (handover_to_user_id);
create index if not exists sponsor_campaigns_picture_id_fk_idx on public.sponsor_campaigns (picture_id);
create index if not exists sponsor_campaigns_reviewer_user_id_fk_idx on public.sponsor_campaigns (reviewer_user_id);
create index if not exists sponsor_campaigns_user_id_fk_idx on public.sponsor_campaigns (user_id);
create index if not exists sponsors_user_id_fk_idx on public.sponsors (user_id);
create index if not exists staff_languages_language_code_fk_idx on public.staff_languages (language_code);
create index if not exists statements_of_reasons_sanction_id_fk_idx on public.statements_of_reasons (sanction_id);
create index if not exists statements_of_reasons_story_id_fk_idx on public.statements_of_reasons (story_id);
create index if not exists stories_class_space_id_fk_idx on public.stories (class_space_id);
create index if not exists stories_user_id_fk_idx on public.stories (user_id);
create index if not exists story_bible_entries_show_from_chapter_id_fk_idx on public.story_bible_entries (show_from_chapter_id);
create index if not exists story_bible_entries_user_id_fk_idx on public.story_bible_entries (user_id);
create index if not exists story_bible_sections_user_id_fk_idx on public.story_bible_sections (user_id);
create index if not exists story_character_fields_user_id_fk_idx on public.story_character_fields (user_id);
create index if not exists story_character_relationships_user_id_fk_idx on public.story_character_relationships (user_id);
create index if not exists story_characters_first_appearance_chapter_id_fk_idx on public.story_characters (first_appearance_chapter_id);
create index if not exists story_characters_picture_id_fk_idx on public.story_characters (picture_id);
create index if not exists story_characters_show_from_chapter_id_fk_idx on public.story_characters (show_from_chapter_id);
create index if not exists story_characters_user_id_fk_idx on public.story_characters (user_id);
create index if not exists story_events_show_from_chapter_id_fk_idx on public.story_events (show_from_chapter_id);
create index if not exists story_events_user_id_fk_idx on public.story_events (user_id);
create index if not exists story_ideas_user_id_fk_idx on public.story_ideas (user_id);
create index if not exists story_marketing_user_id_fk_idx on public.story_marketing (user_id);
create index if not exists story_plan_acts_user_id_fk_idx on public.story_plan_acts (user_id);
create index if not exists story_plans_user_id_fk_idx on public.story_plans (user_id);
create index if not exists story_restrictions_story_id_fk_idx on public.story_restrictions (story_id);
create index if not exists story_revisions_chapter_id_fk_idx on public.story_revisions (chapter_id);
create index if not exists story_revisions_restores_revision_id_fk_idx on public.story_revisions (restores_revision_id);
create index if not exists support_ticket_emails_message_id_fk_idx on public.support_ticket_emails (message_id);
create index if not exists support_tickets_follow_up_of_ticket_id_fk_idx on public.support_tickets (follow_up_of_ticket_id);
create index if not exists support_tickets_merged_into_ticket_id_fk_idx on public.support_tickets (merged_into_ticket_id);
create index if not exists tag_names_named_by_user_id_fk_idx on public.tag_names (named_by_user_id);
create index if not exists tags_decided_by_user_id_fk_idx on public.tags (decided_by_user_id);
