/*
 * Migration: a quiet "You're now a Storyteller" notification (bundle IDEAS-3, part a; idea
 * IDEA-20261102-1, approved by Robert on 2 Nov 2026, 22:01).
 *
 * Ranks are worked out again by refresh_writer_rank() each time a writer's published chapters
 * change (S1-E8-09, …_forums2_e_ranks.sql), but they used to change silently. Now, when a writer
 * reaches a rank higher than any they had before, they get one in-app notification,
 * 'rank_reached', with the rank's sticker and a link to their own profile (criterion 1). It goes
 * to nobody else and sends no email.
 * profiles.highest_rank_notified remembers the highest rank already announced, so a rank that
 * drops (a story hidden by a moderator) and comes back is not announced again (criterion 2).
 * Writers who already hold a rank today start with it as announced, so nobody gets a pile of old
 * news when this goes live.
 * The rank pill on story cards (idea IDEA-20261102-2): story_card_json() gains the writer's
 * rank, left out for a public-domain classic, a writer who blocked the reader or a private
 * profile. The story page's writer card reads profile_rank() and needs nothing new.
 * No new table: one column on profiles (written only by refresh_writer_rank(); profiles has no
 * update grant) and one on notifications.
 * Tests: supabase/tests/database/284-rank-notifications.test.sql.
 */

/* ---------- 1. Columns ---------- */

alter table public.profiles add column highest_rank_notified public.writer_rank;
comment on column public.profiles.highest_rank_notified is
  'The highest rank the writer was already told about; a rank reached again after a drop is not announced twice (IDEAS-3a).';

alter table public.notifications add column writer_rank public.writer_rank;
comment on column public.notifications.writer_rank is
  'For rank_reached: the rank the writer reached (IDEAS-3a).';

-- Writers who hold a rank today: already "told", so going live sends nothing.
update public.profiles set highest_rank_notified = writer_ranks.rank
from public.writer_ranks where writer_ranks.user_id = profiles.id;

/* ---------- 2. Telling a writer about a new rank ---------- */

/**
 * announce_writer_rank: sends the rank_reached notification when a writer reaches a rank higher
 *   than any they were told about before, and remembers it. New writer, the rank every first
 *   chapter gives, is remembered but never announced: the idea is a milestone worked for ("from
 *   Writer to Storyteller", IDEA-20261102-1), and a first chapter already has its own moment.
 * Inputs: person_id, reached (the rank just saved). Returns: nothing.
 * Internal: refresh_writer_rank() calls it.
 */
create or replace function public.announce_writer_rank(person_id uuid, reached public.writer_rank)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: remember the new highest rank, only when it is higher than before (enum order is
  -- the ladder's order, lowest first). No row changes means nothing new to say.
  update public.profiles set highest_rank_notified = reached
  where profiles.id = person_id
    and (profiles.highest_rank_notified is null or profiles.highest_rank_notified < reached);
  if not found or reached = 'new_writer' then
    return;
  end if;
  -- Step 2: one quiet in-app row with no actor; it can be switched off like other story news.
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, writer_rank, is_required)
  values (person_id, 'rank_reached', '{}'::uuid[], 0, reached, false);
end;
$$;
comment on function public.announce_writer_rank(uuid, public.writer_rank) is
  'Internal: tells a writer once about each rank higher than any they reached before (IDEAS-3a).';
revoke execute on function public.announce_writer_rank(uuid, public.writer_rank) from public, anon, authenticated;

/**
 * refresh_writer_rank: as in FORUMS-2e, and a rank higher than any before is announced
 *   (announce_writer_rank()). Inputs, return and callers are unchanged.
 */
create or replace function public.refresh_writer_rank(person_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapters_published integer;
  words_published integer;
  new_rank public.writer_rank;
begin
  -- Step 1: what readers can read today.
  select count(*), coalesce(sum(coalesce(chapters.published_word_count, chapters.word_count)), 0)
  into chapters_published, words_published
  from public.chapters
  join public.stories on stories.id = chapters.story_id
  where chapters.user_id = person_id and chapters.status = 'published' and chapters.deleted_at is null
    and stories.deleted_at is null
    and not public.is_moderated_away('chapter', chapters.id)
    and not public.is_moderated_away('story', stories.id);
  -- Step 2: the rank on the ladder.
  new_rank := public.rank_for(chapters_published, words_published);
  -- Step 3: saved, or taken away when nothing counts any more.
  if new_rank is null then
    delete from public.writer_ranks where writer_ranks.user_id = person_id;
    return;
  end if;
  insert into public.writer_ranks (user_id, rank, chapter_count, word_count)
  values (person_id, new_rank, chapters_published, words_published)
  on conflict (user_id) do update set rank = excluded.rank, chapter_count = excluded.chapter_count,
    word_count = excluded.word_count, updated_at = now();
  -- Step 4 (IDEAS-3a): a rank higher than ever before gets one quiet notification.
  perform public.announce_writer_rank(person_id, new_rank);
end;
$$;

/* ---------- 3. The notifications page ---------- */

/**
 * notification_category: as in CONTESTS-13a2b, plus rank_reached under stories.
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    when 'data_request_confirm' then 'staff'
    when 'data_request_extended' then 'staff'
    when 'data_request_copy_ready' then 'staff'
    when 'picture_opened_by_staff' then 'staff'
    when 'landing_entries_open' then 'stories'
    when 'rank_reached' then 'stories'
    else 'replies'
  end;
$$;

/**
 * notification_json: as in CONTESTS-13a2b, plus the rank a writer reached ('writer_rank') and
 *   their own handle ('own_handle') for the link to their profile, on rank_reached rows.
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    -- ADMIN-2b3: the title as the recipient may see it (S1-E11-08).
    'story', (select jsonb_build_object('slug', stories.slug, 'title', (public.story_as_shown(stories)).title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    -- ADMIN-2b1: what staff changed about the writer's story, and why (S1-E11-08 criterion 4).
    'staff_change', case when target.kind = 'story_changed_by_staff'
                      then public.notification_staff_change_json(target.story_revision_id) end,
    -- ADMIN-2c1: the data request a notice is about: its reference, deadline and why it moved.
    'data_request', (select jsonb_build_object('reference', data_requests.reference,
                       'deadline', public.data_request_deadline(data_requests),
                       'extension_reason', data_requests.extension_reason)
                     from public.data_requests where data_requests.id = target.data_request_id),
    -- CONTESTS-13a2b: the landing page whose entries opened, with its title in each language,
    -- while the page is still up (an archived page gives null, and the row has no link).
    'landing_page', (select jsonb_build_object('slug', pages.slug,
                       'title_ro', live.content #>> '{blocks,0,ro,title}',
                       'title_en', live.content #>> '{blocks,0,en,title}')
                     from public.landing_pages as pages
                     cross join lateral public.landing_page_live_version(pages.id) as live
                     where pages.id = target.landing_page_id and pages.archived_at is null
                       and live.id is not null),
    -- IDEAS-3a: the rank a writer just reached, and their own handle for the link to their profile.
    'writer_rank', case when target.kind = 'rank_reached' then target.writer_rank end,
    'own_handle', case when target.kind = 'rank_reached'
                    then (select profiles.handle from public.profiles where profiles.id = target.user_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/* ---------- 4. The rank pill on story cards (IDEA-20261102-2) ---------- */

/**
 * story_card_writer_rank: the writer's rank as a story card shows it.
 * Inputs: writer (the story's owner), target_story_id.
 * Returns: the rank's name, or null before the first chapter, for a public-domain classic (its
 *   real author has no rank here), when the writer blocked the reader (criterion 2) or keeps their
 *   profile private from them, the same checks as profile_rank(). Never a user ID.
 * Internal: story_card_json().
 */
create or replace function public.story_card_writer_rank(writer public.profiles, target_story_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.rank_of(writer.id)
  where public.story_classic_author(target_story_id) is null
    and public.profile_is_open_to(writer, (select auth.uid()))
    and not exists (select 1 from public.blocks
                    where blocks.user_id = writer.id and blocks.blocked_user_id = (select auth.uid()));
$$;
comment on function public.story_card_writer_rank(public.profiles, uuid) is
  'Internal: the writer''s rank on a story card, null for classics, blocks and private profiles (IDEAS-3a).';
revoke execute on function public.story_card_writer_rank(public.profiles, uuid) from public, anon, authenticated;

/**
 * story_card_json: as in ADMIN-2b3, plus the writer's rank (writer.rank, from
 *   story_card_writer_rank()) for the card's pill. Inputs, return and callers are unchanged.
 */
create or replace function public.story_card_json(target_story_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', stories.id,
    'slug', stories.slug,
    'title', stories.title,
    'blurb', stories.blurb,
    'writer', jsonb_build_object(
      'handle', profiles.handle,
      'display_name', public.story_writer_name(stories.id, profiles.handle, profiles.pen_name),
      'classic_author', public.story_classic_author(stories.id),
      -- IDEAS-3a: the writer's rank for the card's pill, when the reader may see it.
      'rank', public.story_card_writer_rank(profiles, stories.id)),
    'category_slug', categories.slug,
    'language_code', stories.language_code,
    'completion_status', stories.completion_status,
    'rating', stories.rating,
    'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
      'background', stories.cover_background, 'accent', stories.cover_accent),
    'chapter_count', (select count(*) from public.chapters
      where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
    'last_chapter_published_at', stories.last_chapter_published_at)
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked).
  from (select (public.story_as_shown(raw)).* from public.stories as raw
        where raw.id = target_story_id) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
$function$;
