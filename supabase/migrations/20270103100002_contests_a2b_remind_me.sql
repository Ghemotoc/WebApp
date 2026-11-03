/*
 * Migration: Remind me on landing pages (bundle CONTESTS, part a2b; story S1-E11-14 criterion 8).
 *
 * What it adds:
 * - A Remind me block (a heading and an optional introduction in both languages). A page may have
 *   one, and only with a Key dates block, because the reminder is for the day entries open.
 * - landing_page_reminders: who asked to be reminded about which page (a user action, so it has
 *   user_id; CLAUDE.md rule 15). The reader sets or cancels it with set_landing_reminder(); nobody
 *   writes the table directly.
 * - send_landing_reminders(), every hour: on the day entries open (Romanian time), each reader
 *   who asked gets one in-app notification, 'landing_entries_open', and nothing else (no email,
 *   no second reminder). Reminders are deleted 30 days after they were sent (docs/retention.md).
 * - landing_page() returns the Remind me state for the reader: when entries open, whether they
 *   are open already and whether this reader asked.
 * - The notification functions learn the new kind and the landing page it is about; Download my
 *   data includes the reminders and deleting an account deletes them.
 * Who calls it: the landing page store (src/features/landing-pages/api/landingPages.ts) and the
 * notifications page. Tests: supabase/tests/database/263-landing-remind-me.test.sql.
 */

/* ---------- 1. The reminders ---------- */

create table public.landing_page_reminders (
  id uuid primary key default gen_random_uuid(),
  -- The reader who asked to be reminded.
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid not null references public.landing_pages (id) on delete cascade,
  -- When the notification went; null until then. One notification per reminder (criterion 8).
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_page_reminders_one_per_page unique (user_id, page_id)
);
comment on table public.landing_page_reminders is
  'kind: user_action
A reader''s request for one notification when a landing page''s entries open (S1-E11-14 criterion 8).';
create index landing_page_reminders_waiting on public.landing_page_reminders (page_id) where notified_at is null;
alter table public.landing_page_reminders enable row level security;
grant select on public.landing_page_reminders to authenticated;  -- landing_page_reminders_select_own

/**
 * Policy landing_page_reminders_select_own: a reader sees only their own reminders (for Download
 * my data and the page's button). Nobody writes directly: set_landing_reminder() and the job do.
 */
create policy landing_page_reminders_select_own
  on public.landing_page_reminders for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy landing_page_reminders_select_own on public.landing_page_reminders is
  'Allows a reader to read their own landing page reminders only (S1-E11-14).';

alter table public.notifications
  add column landing_page_id uuid references public.landing_pages (id) on delete cascade;
comment on column public.notifications.landing_page_id is
  'The landing page an "entries are open" notification is about (S1-E11-14).';

/* ---------- 2. The block ---------- */

/**
 * landing_block_field_rules: the text fields of each block kind, with their limits. Internal.
 * Part a2b adds Remind me (a heading and an optional introduction).
 */
create or replace function public.landing_block_field_rules()
returns table (block_kind text, field_name text, longest integer, is_required boolean)
language sql
immutable
set search_path = ''
as $$
  values
    ('hero', 'title', 80, true), ('hero', 'intro', 300, false),
    ('text', 'heading', 80, true), ('text', 'body', 4000, true),
    ('key_dates', 'heading', 80, true), ('key_dates', 'note', 300, false),
    ('who_can_enter', 'heading', 80, true), ('who_can_enter', 'body', 1000, true),
    ('prize', 'heading', 80, true), ('prize', 'body', 1000, true),
    ('how_to_enter', 'heading', 80, true), ('how_to_enter', 'body', 2000, true),
    ('rules', 'heading', 80, true), ('rules', 'body', 1000, false), ('rules', 'link_label', 80, true),
    ('questions', 'heading', 80, true),
    ('featured', 'heading', 80, true), ('featured', 'intro', 300, false),
    ('remind_me', 'heading', 80, true), ('remind_me', 'intro', 300, false);
$$;

/**
 * landing_page_problems: what stops a version from being published (criterion 9), as in part
 * a2a, plus: at most one Remind me block, and only on a page with a Key dates block.
 * Inputs, return and callers are unchanged.
 */
create or replace function public.landing_page_problems(page_type text, content jsonb)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
  blocks jsonb := coalesce(content -> 'blocks', '[]'::jsonb);
  block jsonb;
  block_number integer := 0;
  rule record;
  language_code text;
  text_problem text;
begin
  -- Step 1: the page as a whole.
  if coalesce(content ->> 'theme', '') not in ('plum', 'gold', 'sage', 'sky') then
    problems := problems || 'theme:unknown'::text;
  end if;
  if jsonb_typeof(blocks) <> 'array' or jsonb_array_length(blocks) not between 2 and 30 then
    return problems || 'blocks:count'::text;
  end if;
  if blocks -> 0 ->> 'kind' is distinct from 'hero'
     or (select count(*) from jsonb_array_elements(blocks) as each_block where each_block ->> 'kind' = 'hero') <> 1 then
    problems := problems || 'blocks:hero_first'::text;
  end if;
  -- Part a2b: one Remind me block at most, and only on a page with key dates to remind about.
  if (select count(*) from jsonb_array_elements(blocks) as each_block where each_block ->> 'kind' = 'remind_me') > 1 then
    problems := problems || 'blocks:one_remind_me'::text;
  elsif blocks @> '[{"kind": "remind_me"}]' and not blocks @> '[{"kind": "key_dates"}]' then
    problems := problems || 'blocks:remind_me_needs_dates'::text;
  end if;
  if page_type = 'contest' and not (blocks @> '[{"kind": "key_dates"}]' and blocks @> '[{"kind": "rules"}]') then
    problems := problems || 'blocks:contest_needs_dates_and_rules'::text;
  end if;
  -- Step 2: every block, its text in both languages and its own rules.
  for block in select value from jsonb_array_elements(blocks) loop
    if not exists (select 1 from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind') then
      problems := problems || ('blocks.' || block_number || ':unknown_kind');
    end if;
    for rule in select * from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind' loop
      foreach language_code in array array['ro', 'en'] loop
        text_problem := public.landing_text_problem(block, language_code, rule.field_name,
          'blocks.' || block_number, rule.longest, rule.is_required);
        if text_problem is not null then
          problems := problems || text_problem;
        end if;
      end loop;
    end loop;
    problems := problems || public.landing_block_extra_problems(block, 'blocks.' || block_number);
    -- Part a2a: a picture's alt text and check, and a Featured stories block's picks.
    problems := problems || public.landing_picture_problems(block, 'blocks.' || block_number)
      || public.landing_featured_problems(block, 'blocks.' || block_number);
    block_number := block_number + 1;
  end loop;
  return problems;
end;
$$;

/* ---------- 3. What the reader sees ---------- */

/**
 * landing_entries_open_on: the day a version's entries open, from its Key dates block. Internal.
 * Input: the version's content. Returns: the date, or null when there is no valid one.
 */
create or replace function public.landing_entries_open_on(content jsonb)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  open_text text;
begin
  select each_block #>> '{dates,entries_open}' into open_text
  from jsonb_array_elements(coalesce(content -> 'blocks', '[]')) as each_block
  where each_block ->> 'kind' = 'key_dates'
  limit 1;
  -- Publishing checks the dates, so a broken one only comes from an old version: treat it as none.
  if open_text is null or open_text !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return open_text::date;
exception when others then
  return null;
end;
$$;
comment on function public.landing_entries_open_on(jsonb) is
  'Internal: the day a landing page version''s entries open, or null (CONTESTS-13a2b).';
revoke execute on function public.landing_entries_open_on(jsonb) from public, anon, authenticated;

/**
 * landing_reminder_json: the Remind me state for the reader. Internal.
 * Inputs: the page and its live content. Returns: {opens_on, is_open, is_set}, or null when the
 *   page has no Remind me block. is_set is false for a visitor who isn't signed in.
 */
create or replace function public.landing_reminder_json(target_page_id uuid, content jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce(content -> 'blocks', '[]') @> '[{"kind": "remind_me"}]' then
    jsonb_build_object(
      'opens_on', public.landing_entries_open_on(content),
      'is_open', coalesce(public.landing_entries_open_on(content) <= public.romania_today(), false),
      'is_set', exists (select 1 from public.landing_page_reminders as reminders
                        where reminders.page_id = target_page_id
                          and reminders.user_id = (select auth.uid())))
  end;
$$;
comment on function public.landing_reminder_json(uuid, jsonb) is
  'Internal: a landing page''s Remind me state for the reader (CONTESTS-13a2b).';
revoke execute on function public.landing_reminder_json(uuid, jsonb) from public, anon, authenticated;

/**
 * landing_page: the public read of /c/<slug>, as in part a2a, plus 'reminder': the Remind me
 *   state for this reader (null when the page has no Remind me block). Input and callers are
 *   unchanged; it never returns a draft, a scheduled version or who wrote it.
 */
create or replace function public.landing_page(page_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', pages.slug,
    'type', pages.page_type,
    'state', case when live.take_down_on is not null and live.take_down_on <= public.romania_today()
                  then 'ended' else 'live' end,
    'show_from', live.show_from,
    'take_down_on', live.take_down_on,
    'content', live.content,
    -- Part a2a: the pictures visitors may see, and each Featured stories block's story cards.
    'pictures', public.landing_page_pictures(live.content),
    'featured', public.landing_featured_cards(live.content),
    -- Part a2b: the Remind me block's state for this reader (null when the page has none).
    'reminder', public.landing_reminder_json(pages.id, live.content))
  from public.landing_pages as pages
  cross join lateral public.landing_page_live_version(pages.id) as live
  where pages.slug = lower(btrim(page_slug)) and pages.archived_at is null and live.id is not null;
$$;

/* ---------- 4. Setting and cancelling ---------- */

/**
 * set_landing_reminder: a signed-in reader asks for, or cancels, the notification when a page's
 *   entries open (criterion 8).
 * Inputs: page_slug (the address after /c/); wanted (true to ask, false to cancel).
 * Returns: the Remind me state after the change ({opens_on, is_open, is_set}).
 * Errors: insufficient_privilege (hint sign_in) for a visitor who isn't signed in;
 *   check_violation with hint no_reminder (no live page with a Remind me block) or already_open
 *   (entries are open already, so there is nothing to remind about).
 * Where it fits: RemindMeBlock → useLandingReminder() → setLandingReminder() → here.
 */
create or replace function public.set_landing_reminder(page_slug text, wanted boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  page public.landing_pages;
  live public.landing_page_versions;
  opens_on date;
begin
  -- Step 1: only a signed-in reader; a visitor is asked to sign in.
  if caller_id is null then
    raise exception 'Sign in to be reminded.' using errcode = 'insufficient_privilege', hint = 'sign_in';
  end if;
  -- Step 2: a live page with a Remind me block, whose entries haven't opened yet.
  select * into page from public.landing_pages
  where landing_pages.slug = lower(btrim(page_slug)) and landing_pages.archived_at is null;
  live := public.landing_page_live_version(page.id);
  if page.id is null or live.id is null
     or not coalesce(live.content -> 'blocks', '[]') @> '[{"kind": "remind_me"}]' then
    raise exception 'This page has no reminder.' using errcode = 'check_violation', hint = 'no_reminder';
  end if;
  opens_on := public.landing_entries_open_on(live.content);
  if wanted and (opens_on is null or opens_on <= public.romania_today()) then
    raise exception 'Entries are open already.' using errcode = 'check_violation', hint = 'already_open';
  end if;
  -- Step 3: add or remove the reader's one reminder; asking twice changes nothing.
  if wanted then
    insert into public.landing_page_reminders (user_id, page_id) values (caller_id, page.id)
    on conflict (user_id, page_id) do nothing;
  else
    delete from public.landing_page_reminders
    where landing_page_reminders.user_id = caller_id and landing_page_reminders.page_id = page.id;
  end if;
  return public.landing_reminder_json(page.id, live.content);
end;
$$;
comment on function public.set_landing_reminder(text, boolean) is
  'A signed-in reader asks for, or cancels, one notification when a landing page''s entries open (S1-E11-14).';
revoke execute on function public.set_landing_reminder(text, boolean) from public, anon;
grant execute on function public.set_landing_reminder(text, boolean) to authenticated;

/* ---------- 5. The hourly job ---------- */

/**
 * send_landing_reminders: sends each waiting reminder whose entries opened today or earlier
 *   (Romanian time), once, and deletes reminders sent more than 30 days ago (docs/retention.md).
 * Returns: how many notifications went. A page that is archived, taken down or has no live
 *   version sends nothing; its reminders wait or go with the page.
 * Where it fits: pg_cron, every hour, so a reminder arrives within the hour after midnight.
 */
create or replace function public.send_landing_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder record;
  sent integer := 0;
begin
  -- Step 1: each waiting reminder for a live page whose entries are open now.
  for reminder in
    select reminders.id, reminders.user_id, reminders.page_id
    from public.landing_page_reminders as reminders
    join public.landing_pages as pages on pages.id = reminders.page_id and pages.archived_at is null
    cross join lateral public.landing_page_live_version(pages.id) as live
    where reminders.notified_at is null and live.id is not null
      and (live.take_down_on is null or live.take_down_on > public.romania_today())
      and public.landing_entries_open_on(live.content) <= public.romania_today()
    for update of reminders skip locked
  loop
    -- Step 2: one in-app notification, with no actor, then mark the reminder as sent.
    perform public.notify(reminder.user_id, 'landing_entries_open', null,
      jsonb_build_object('landing_page_id', reminder.page_id));
    update public.landing_page_reminders set notified_at = now(), updated_at = now()
    where landing_page_reminders.id = reminder.id;
    sent := sent + 1;
  end loop;
  -- Step 3: a sent reminder isn't needed after 30 days.
  delete from public.landing_page_reminders where notified_at < now() - interval '30 days';
  return sent;
end;
$$;
comment on function public.send_landing_reminders() is
  'Hourly: sends each landing page reminder once, when entries open (S1-E11-14).';
revoke execute on function public.send_landing_reminders() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('send-landing-reminders', '5 * * * *', 'select public.send_landing_reminders();');

/* ---------- 6. Notifications, Download my data and deleting an account ---------- */

/**
 * notify: as in ADMIN-2e2a, plus the landing page a notification is about (about.landing_page_id).
 *   Inputs, return and callers are unchanged.
 */
create or replace function public.notify(
  recipient_id uuid, notification_kind public.notification_kind, actor_id uuid, about jsonb,
  group_key text default null, group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08), nor can a data request's notice (GDPR art. 12; S1-E11-09) or
  -- the alert that staff opened an uploaded picture (ADMIN-2e2a).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, data_request_id, landing_page_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid,
    (about ->> 'landing_page_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended', 'data_request_copy_ready', 'picture_opened_by_staff'));
end;
$$;

/**
 * notification_json: as in ADMIN-2c1, plus the landing page whose entries opened ('landing_page':
 *   its address and title in each language, or null once the page is archived).
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
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/**
 * notification_category: as in ADMIN-2e2a, plus landing_entries_open under stories.
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
    else 'replies'
  end;
$$;

/**
 * data_export_tables: as before, plus landing_page_reminders (included).
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
    ('certificates', true, null),
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
    ('customisation_change_requests', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
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
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
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
    ('writer_ranks', false, 'worked out from the person''s published chapters, which are in the export; the rank itself shows on the profile');
$$;

/**
 * account_deletion_rules: as before, plus landing_page_reminders (deleted row by row).
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
    ('certificates', 'delete', 1, null),
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
    ('customisation_change_requests', 'delete', 1, null),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
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
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
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
    ('writer_ranks', 'delete', 1, null);
$$;
