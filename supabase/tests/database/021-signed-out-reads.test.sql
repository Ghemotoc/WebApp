-- Database test: what a signed-out visitor can read (story S1-E1-02 acceptance criterion
-- "Given a signed-out client, when it queries any table directly, then it receives only rows a
-- public-read policy allows").
-- Walks every table in public as the anon role and compares what comes back with the rows the
-- public-read policies allow. A new table that leaks rows to signed-out visitors fails here.
-- A table anon holds no select grant on counts as 0 rows: the Data API refuses it outright
-- (S1-E1-02 fix, 17 Oct 2026; 003-table-grants-match-policies checks the grants themselves).
begin;

create extension if not exists pgtap with schema extensions;

select plan(1);

-- Count, for every public table, the rows a signed-out visitor can see.
create function pg_temp.rows_visible_to_anon()
returns table (table_name text, visible_rows bigint)
language plpgsql
as $$
declare
  public_table record;
begin
  for public_table in
    select tables.relname::text as name
    from pg_class as tables
    join pg_namespace as schemas on schemas.oid = tables.relnamespace
    where schemas.nspname = 'public' and tables.relkind in ('r', 'p')
    order by 1
  loop
    table_name := public_table.name;
    -- Without a select grant, the API refuses the whole table: nothing is visible.
    if not has_table_privilege('anon', format('public.%I', public_table.name), 'SELECT') then
      visible_rows := 0;
      return next;
      continue;
    end if;
    -- Run the count as the anon role, exactly as an API request would.
    set local role anon;
    execute format('select count(*) from public.%I', public_table.name) into visible_rows;
    reset role;
    return next;
  end loop;
end;
$$;

-- Expected: only the public flags and settings, and the published legal documents (S1-E14-01);
-- nothing from any other table. Each story that adds a table adds its line here.
select results_eq(
  $$ select table_name, visible_rows from pg_temp.rows_visible_to_anon() order by table_name $$,
  $$ select * from (values
       -- Evidence about suspected child abuse images: safeguarding staff only (ADMIN-2e2b).
       ('abuse_image_evidence', 0::bigint),
       -- Delete my account: each person's own requests (S1-E13-03).
       ('account_deletions', 0::bigint),
       ('age_check_attempts', 0::bigint),
       ('age_check_sessions', 0::bigint),
       ('appeals', 0::bigint),
       ('audit_log', 0::bigint),
       ('banned_email_hashes', 0::bigint),
       ('blocks', 0::bigint),
       ('case_actions', 0::bigint),
       -- Possible returning user links: moderation staff only (ADMIN-2f2).
       ('case_account_links', 0::bigint),
       ('cases', 0::bigint),
       ('categories', (select count(*) from public.categories)),
       -- Music and video cards reach readers only through get_chapter() (S1-E3-10).
       ('canva_connections', 0::bigint),
       -- Certificates: the student's own, read through functions (S1-E8-12).
       ('certificates', 0::bigint),
      ('chapter_embeds', 0::bigint),
       ('chapter_likes', 0::bigint),
       ('chapter_plan_characters', 0::bigint),
       ('chapter_plans', 0::bigint),
       ('chapter_reads', 0::bigint),
       ('chapter_revisions', 0::bigint),
       ('chapter_scenes', 0::bigint),
       ('chapter_shares', 0::bigint),
       ('chapters', 0::bigint),
       -- The real authors of public-domain classics, public on every byline (S1-E5-06).
       ('classic_authors', (select count(*) from public.classic_authors)),
       -- Classics' public-domain details are staff-only (S1-E11-16); readers get the source
       -- through the story page.
       ('classic_works', 0::bigint),
       ('client_errors', 0::bigint),
       ('cms_versions', 0::bigint),
       ('comment_downvotes', 0::bigint),
       ('comment_reactions', 0::bigint),
       ('comment_nudge_words', 0::bigint),
       ('comments', 0::bigint),
       -- The compliance log is for the owner and admins (S1-E11-04).
       ('compliance_log_entries', 0::bigint),
       ('confusable_characters', 0::bigint),
       ('consents', 0::bigint),
       ('customisation_change_requests', 0::bigint),
       -- Private messages are the two people's only (S1-E9-01).
       ('conversation_members', 0::bigint),
       ('conversations', 0::bigint),
       ('copied_work_notes', 0::bigint),
       ('daily_metrics', 0::bigint),
       ('data_requests', 0::bigint),
       -- Throwaway email domains: staff who may view the settings only (ADMIN-2f1).
       ('disposable_email_domains', 0::bigint),
       -- Notification emails: each person's own (S1-E7-02).
       ('email_outbox', 0::bigint),
       ('email_unsubscribe_keys', 0::bigint),
       -- Download my data: each person's own (S1-E13-02).
       ('exports', 0::bigint),
       ('feature_flags', (select count(*) from public.feature_flags where is_public)),
       ('finished_thanks', 0::bigint),
       ('follows_stories', 0::bigint),
       ('follows_users', 0::bigint),
       -- Forum categories, forums and subforums with their names: public (FORUMS-1a), but never
       -- a space's hidden forum (FORUMS-2a).
       ('forum_names', (select count(*) from public.forum_names join public.forums on forums.id = forum_names.forum_id
                        where forums.space_id is null and forums.deleted_at is null)),
       -- Forum threads, posts and earlier versions: read only through functions (FORUMS-1b).
       ('forum_post_revisions', 0::bigint),
       ('forum_posts', 0::bigint),
       -- Read marks and thread reads: only one's own (FORUMS-1d).
       ('forum_read_marks', 0::bigint),
       ('forum_thread_reads', 0::bigint),
       ('forum_threads', 0::bigint),
       ('forums', (select count(*) from public.forums where deleted_at is null and space_id is null)),
       ('identity_link_requests', 0::bigint),
       ('interface_text_overrides', 0::bigint),
       ('invites', 0::bigint),
       ('jobs', 0::bigint),
       ('languages', (select count(*) from public.languages)),
       -- A reader's library and places are theirs only (S1-E4-03).
       ('library_entries', 0::bigint),
       ('legal_document_versions',
        (select count(*) from public.legal_document_versions where published_at <= now())),
       ('legal_documents', (select count(*) from public.legal_documents)),
       ('manual_age_checks', 0::bigint),
       ('markets', (select count(*) from public.markets)),
       ('messages', 0::bigint),
       ('moderated_items', 0::bigint),
       ('moderator_mail_messages', 0::bigint),
       ('moderator_mail_threads', 0::bigint),
       ('notification_email_settings', 0::bigint),
       ('notifications', 0::bigint),
       ('on_call_alerts', 0::bigint),
       ('on_call_rota', 0::bigint),
       ('paragraph_shares', 0::bigint),
       ('parental_consents', 0::bigint),
       ('picture_checks', 0::bigint),
       ('profiles', 0::bigint),
       ('public_notices', 0::bigint),
       ('quote_cards', 0::bigint),
       -- A private reading streak is the reader's only (IDEAS-1b).
       ('reading_habits', 0::bigint),
       ('reading_minutes', 0::bigint),
       ('reading_positions', 0::bigint),
       -- What someone said they like is theirs only (S1-E2-06).
       ('reading_preferences', 0::bigint),
       -- How someone likes to read is theirs only (S1-E4-02).
       ('reading_settings', 0::bigint),
       ('rate_limit_events', 0::bigint),
       -- The counties are reference data for the onboarding drop-down (S1-E2-06).
       ('regions', 42::bigint),
       ('removed_passages', 0::bigint),
       ('report_detail_requests', 0::bigint),
       ('report_reason_tiers', 0::bigint),
       ('reports', 0::bigint),
       ('reserved_names', 0::bigint),
       -- The record of each night's clean-up is for owner and admin only (S1-E13-04).
       ('retention_runs', 0::bigint),
       ('retired_certificate_codes', 0::bigint),
       ('safeguarding_referrals', 0::bigint),
       ('safety_contact_checks', 0::bigint),
       ('safety_contact_gaps', 0::bigint),
       ('safety_contacts', (select count(*) from public.safety_contacts)),
       ('sanctions', 0::bigint),
       ('seasonal_occasions', 0::bigint),
       ('settings', (select count(*) from public.settings where is_public)),
       ('sign_in_failures', 0::bigint),
       -- Scrambled sign-up IPs: moderation staff only (ADMIN-2f2).
       ('sign_up_ips', 0::bigint),
       -- Spaces and their members: read only through functions, by the age rules (FORUMS-2a).
       ('space_members', 0::bigint),
       ('space_moderation_log', 0::bigint),
       ('spaces', 0::bigint),
       ('staff_interns', 0::bigint),
       ('staff_languages', 0::bigint),
       ('staff_permissions', 0::bigint),
       ('staff_role_areas', 0::bigint),
       ('staff_roles', 0::bigint),
       ('statements_of_reasons', 0::bigint),
       ('stories', 0::bigint),
       ('story_bible_entries', 0::bigint),
       ('story_bible_sections', 0::bigint),
       ('story_character_fields', 0::bigint),
       ('story_character_relationships', 0::bigint),
       ('story_characters', 0::bigint),
       ('story_events', 0::bigint),
       ('story_ideas', 0::bigint),
       ('story_marketing', 0::bigint),
       ('story_plan_acts', 0::bigint),
       ('story_plans', 0::bigint),
       ('story_restrictions', 0::bigint),
       ('story_revisions', 0::bigint),
       ('story_scores', 0::bigint),
       ('story_tags', 0::bigint),
       -- Support tickets: support staff only, members through functions (ADMIN-2h1).
       ('support_ticket_events', 0::bigint),
       ('support_ticket_messages', 0::bigint),
       ('support_tickets', 0::bigint),
       ('tag_names', (select count(*) from public.tag_names)),
       ('tags', (select count(*) from public.tags where status = 'approved')),
       ('teacher_checks', 0::bigint),
       ('username_approvals', 0::bigint),
       ('username_word_lists', 0::bigint),
       ('writer_ranks', 0::bigint)
     ) as expected (table_name, visible_rows) order by 1 $$,
  'a signed-out visitor sees only public flags, settings, markets, published legal documents, languages, categories, tags and counties, nothing else'
);

select * from finish();

rollback;
