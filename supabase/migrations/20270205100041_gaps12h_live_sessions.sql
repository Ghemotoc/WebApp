/*
 * Migration: live sessions on the Writers' hub (bundle GAPS-12h; board WritersHub, "Live
 * sessions · Nov 13 · Ask a published author · Thursday 18:00 · Romanian · 13+ · Remind me").
 * Part 8 of GAPS-12, the last one.
 *
 * How it works: staff with the contests area list the sessions coming up at /staff/hub: a title,
 * when it starts, its language, the youngest age group it is for, one line on where it happens
 * and, when there is one, a link to it. The hub shows the next sessions that fit the member's
 * age group. "Remind me" keeps one reminder per member and session; a job that runs every ten
 * minutes sends each reminder once, as an in-app notification, in the hour before the start.
 * What it adds:
 * - live_sessions: the sessions (staff content, no personal data);
 * - live_session_reminders: who asked to be reminded of which session;
 * - notifications.live_session_id: the session a 'live_session_soon' notification is about;
 * - rating_fits_band(): whether an age group may see something with a rating;
 * - writers_hub_sessions(): the sessions coming up, with the caller's own reminders;
 * - set_live_session_reminder(): the member asks for a reminder, or cancels it;
 * - send_live_session_reminders(): the job;
 * - admin_save_live_session() and admin_delete_live_session(): staff, logged.
 * Who calls it: src/features/hub/ (HubSessions on the hub and the staff page at /staff/hub) and
 * src/features/notifications/ (the notification's words).
 * Rules:
 * - A session never shows to a member younger than its age group, and no reminder is sent to
 *   one (ratings hide things from anyone younger, CLAUDE.md rule 18).
 * - A reminder is the member's own: nobody else reads it and no count of reminders is shown.
 * - In-app only: no email and no push (the same as the landing page reminder, S1-E11-14).
 */

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title_ro text not null,
  title_en text not null,
  -- The moment it starts. The hub shows it in Romanian time, like every other date.
  starts_at timestamptz not null,
  -- The language the session is held in: a BCP 47 code of an interface language.
  language_code text not null,
  -- The youngest age group it is for; younger members never see it.
  rating public.story_rating not null default 'all_ages',
  -- One line on where it happens ("Forum voice room").
  place_ro text not null,
  place_en text not null,
  -- The address to join, when there is one yet.
  link_url text,
  -- The staff member who last saved it.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting takes it off the hub; the audit log keeps what it said.
  deleted_at timestamptz,
  constraint live_sessions_title_ro_length check (char_length(btrim(title_ro)) between 1 and 120),
  constraint live_sessions_title_en_length check (char_length(btrim(title_en)) between 1 and 120),
  constraint live_sessions_place_ro_length check (char_length(btrim(place_ro)) between 1 and 80),
  constraint live_sessions_place_en_length check (char_length(btrim(place_en)) between 1 and 80),
  constraint live_sessions_language_known check (language_code in ('ro', 'en')),
  -- https only, no spaces or quotes, so the address can't carry a script or break out of a link.
  constraint live_sessions_link_is_https check (
    link_url is null or (link_url ~ '^https://[^\s"''<>]+$' and char_length(link_url) between 12 and 500)
  )
);

comment on table public.live_sessions is
  'kind: platform
Live sessions listed on the Writers'' hub: staff-written title and place in Romanian and English, the start, the language, the youngest age group and an optional link (GAPS-12h). No personal data.';

create index live_sessions_coming_up on public.live_sessions (starts_at) where deleted_at is null;

create trigger live_sessions_set_updated_at
  before update on public.live_sessions
  for each row execute function public.set_updated_at();
alter table public.live_sessions enable row level security;

/**
 * live_sessions_select_contest_staff: staff with the contests area read every session that isn't
 * deleted, past ones included, for the staff page. Members never read the table: they get the
 * sessions coming up that fit their age group through writers_hub_sessions(). Writes go through
 * the admin functions.
 */
create policy live_sessions_select_contest_staff
  on public.live_sessions for select to authenticated
  using (deleted_at is null and (select public.staff_may('contests', 'view')));
comment on policy live_sessions_select_contest_staff on public.live_sessions is
  'Allows staff with the contests area to read the live sessions that aren''t deleted, past ones included (GAPS-12h).';

grant select on public.live_sessions to authenticated;

create table public.live_session_reminders (
  id uuid primary key default gen_random_uuid(),
  -- The member who asked to be reminded.
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  -- When the notification went out; null while the reminder waits.
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_session_reminders_one_per_session unique (user_id, session_id)
);

comment on table public.live_session_reminders is
  'kind: user_action
Which live sessions a member asked to be reminded of: one row per member and session, deleted 30 days after the session (GAPS-12h). Personal data: the link between a member and a session.';

create index live_session_reminders_session_id_fk_idx on public.live_session_reminders (session_id);
create index live_session_reminders_waiting on public.live_session_reminders (session_id)
  where notified_at is null;

create trigger live_session_reminders_set_updated_at
  before update on public.live_session_reminders
  for each row execute function public.set_updated_at();
create trigger live_session_reminders_refuse_user_id_change
  before update on public.live_session_reminders
  for each row execute function public.refuse_user_id_change();
alter table public.live_session_reminders enable row level security;

/**
 * live_session_reminders_select_own: a member reads their own reminders only. Nobody else does,
 * staff included, so who plans to come to a session is never shown. Writes go through
 * set_live_session_reminder().
 */
create policy live_session_reminders_select_own
  on public.live_session_reminders for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy live_session_reminders_select_own on public.live_session_reminders is
  'Allows a member to read their own live session reminders only (GAPS-12h).';

grant select on public.live_session_reminders to authenticated;

alter table public.notifications
  add column live_session_id uuid references public.live_sessions (id) on delete cascade;
comment on column public.notifications.live_session_id is
  'The live session a live_session_soon notification is about (GAPS-12h).';
create index notifications_live_session_id_fk_idx on public.notifications (live_session_id)
  where live_session_id is not null;

/**
 * rating_fits_band: whether a member in an age group may see something with a rating.
 * Inputs: rating and band (the member's age group). Returns: true when the group is old enough.
 *   An unknown age sees only what is for all ages.
 * Used by the hub's list and by the reminder job, which has no caller to ask age_band() about.
 */
create function public.rating_fits_band(rating public.story_rating, band public.age_band)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case rating
    when 'all_ages' then true
    when '13_plus' then band in ('13_to_15', '16_to_17', '18_plus')
    when '16_plus' then band in ('16_to_17', '18_plus')
    else band = '18_plus'
  end;
$$;

comment on function public.rating_fits_band(public.story_rating, public.age_band) is
  'Internal: whether an age group may see something with a rating; an unknown age sees only all ages (GAPS-12h).';
revoke all on function public.rating_fits_band(public.story_rating, public.age_band) from public, anon, authenticated;

/**
 * writers_hub_sessions: the live sessions coming up, soonest first, for the hub.
 * Inputs: none. Returns: up to 6 rows: the session's ID, title and place in both languages, the
 *   start, the language, the age group, the link (or null) and whether the caller asked to be
 *   reminded. Only sessions that haven't started and that fit the caller's age group. Nothing
 *   for a signed-out caller.
 * Flow: HubSessions → useHubSessions → api/hubSessions.ts → this function.
 */
create function public.writers_hub_sessions()
returns table (
  session_id uuid,
  title_ro text,
  title_en text,
  starts_at timestamptz,
  language_code text,
  rating public.story_rating,
  place_ro text,
  place_en text,
  link_url text,
  is_reminded boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    live_sessions.id,
    live_sessions.title_ro,
    live_sessions.title_en,
    live_sessions.starts_at,
    live_sessions.language_code,
    live_sessions.rating,
    live_sessions.place_ro,
    live_sessions.place_en,
    live_sessions.link_url,
    exists (select 1 from public.live_session_reminders as reminders
            where reminders.session_id = live_sessions.id
              and reminders.user_id = (select auth.uid()))
  from public.live_sessions
  where (select auth.uid()) is not null
    and live_sessions.deleted_at is null
    and live_sessions.starts_at > now()
    -- Never to a member younger than the session's age group (CLAUDE.md rule 18).
    and public.rating_fits_band(live_sessions.rating, (select public.age_band()))
  order by live_sessions.starts_at, live_sessions.created_at
  limit 6;
$$;

comment on function public.writers_hub_sessions() is
  'The live sessions coming up that fit the caller''s age group, soonest first, with the caller''s own reminders (GAPS-12h).';
revoke all on function public.writers_hub_sessions() from public, anon;
grant execute on function public.writers_hub_sessions() to authenticated;

/**
 * set_live_session_reminder: the caller asks to be reminded of a session, or cancels it.
 * Inputs: target_session (the session's ID) and wanted (true to be reminded, false to cancel).
 * Returns: true when a reminder is set afterwards, false when there is none.
 * Errors: insufficient_privilege for a signed-out caller; no_data_found for a session that is
 *   unknown, deleted, already started or for an older age group (one answer for all four, so
 *   the function never says a session for older members exists).
 * Asking twice changes nothing. A reminder that already went out is left as it is.
 */
create function public.set_live_session_reminder(target_session uuid, wanted boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: only a signed-in member.
  if caller_id is null then
    raise exception 'Sign in to be reminded.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: cancelling needs no session check: the row is the caller's own.
  if not coalesce(wanted, false) then
    delete from public.live_session_reminders
    where live_session_reminders.user_id = caller_id
      and live_session_reminders.session_id = target_session
      and live_session_reminders.notified_at is null;
    return false;
  end if;
  -- Step 3: a session the caller can see on the hub: coming up and for their age group.
  if not exists (
      select 1 from public.live_sessions
      where live_sessions.id = target_session and live_sessions.deleted_at is null
        and live_sessions.starts_at > now()
        and public.rating_fits_band(live_sessions.rating, public.age_band())) then
    raise exception 'There is no such live session.' using errcode = 'no_data_found';
  end if;
  -- Step 4: one reminder per member and session.
  insert into public.live_session_reminders (user_id, session_id) values (caller_id, target_session)
  on conflict on constraint live_session_reminders_one_per_session do nothing;
  return true;
end;
$$;

comment on function public.set_live_session_reminder(uuid, boolean) is
  'A member asks for, or cancels, one in-app notification shortly before a live session starts (GAPS-12h).';
revoke all on function public.set_live_session_reminder(uuid, boolean) from public, anon;
grant execute on function public.set_live_session_reminder(uuid, boolean) to authenticated;

/**
 * send_live_session_reminders: the job. Sends each waiting reminder once, in the hour before its
 * session starts.
 * Inputs: none. Returns: how many notifications went out.
 * A reminder whose member is no longer old enough for the session, for example after staff
 * raised its age group, is deleted instead of sent.
 * Called by pg_cron every ten minutes; tests call it directly.
 */
create function public.send_live_session_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder record;
  sent integer := 0;
begin
  -- Step 1: each waiting reminder for a session that starts within the hour.
  for reminder in
    select reminders.id, reminders.user_id, reminders.session_id, sessions.rating
    from public.live_session_reminders as reminders
    join public.live_sessions as sessions on sessions.id = reminders.session_id
    where reminders.notified_at is null and sessions.deleted_at is null
      and sessions.starts_at > now() and sessions.starts_at <= now() + interval '1 hour'
    for update of reminders skip locked
  loop
    if public.rating_fits_band(reminder.rating, public.age_band_of(reminder.user_id)) then
      -- Step 2: one in-app notification, with no actor, then mark the reminder as sent.
      perform public.notify(reminder.user_id, 'live_session_soon', null,
        jsonb_build_object('live_session_id', reminder.session_id));
      update public.live_session_reminders set notified_at = now()
      where live_session_reminders.id = reminder.id;
      sent := sent + 1;
    else
      -- The session is no longer for this member's age group: no notification, no reminder.
      delete from public.live_session_reminders where live_session_reminders.id = reminder.id;
    end if;
  end loop;
  -- Step 3: a reminder isn't needed 30 days after its session (docs/retention.md).
  delete from public.live_session_reminders as reminders
  using public.live_sessions as sessions
  where sessions.id = reminders.session_id and sessions.starts_at < now() - interval '30 days';
  return sent;
end;
$$;

comment on function public.send_live_session_reminders() is
  'Every ten minutes: sends each live session reminder once, in the hour before the start (GAPS-12h).';
revoke all on function public.send_live_session_reminders() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('send-live-session-reminders', '*/10 * * * *', 'select public.send_live_session_reminders();');

/**
 * admin_save_live_session: adds a live session, or changes one.
 * Inputs: session_id (null to add one) and session, a JSON object with title_ro, title_en (1 to
 *   120 characters), starts_at (a timestamp with its time zone), language_code (ro or en),
 *   rating (all_ages when left out), place_ro, place_en (1 to 80) and link_url (https, or left
 *   out).
 * Returns: the session's ID.
 * Errors: insufficient_privilege unless the caller may act on contests; check_violation for an
 *   empty or long text, an unknown language, a link that isn't https or a missing start;
 *   invalid_text_representation for an unknown rating; no_data_found for an unknown session.
 * Logged as live_session.saved with the before and after values.
 */
create function public.admin_save_live_session(session_id uuid, session jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.live_sessions;
  saved public.live_sessions;
begin
  -- Step 1: staff with the contests area only (the server decides, architecture 1.8.1).
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change live sessions.' using errcode = 'insufficient_privilege';
  end if;
  if session is null or nullif(session ->> 'starts_at', '') is null then
    raise exception 'A live session needs its start.' using errcode = 'check_violation';
  end if;
  -- Step 2: a new session, or the change to one that exists. The table's checks refuse bad values.
  if session_id is null then
    insert into public.live_sessions (title_ro, title_en, starts_at, language_code, rating, place_ro,
      place_en, link_url, updated_by_user_id)
    values (btrim(session ->> 'title_ro'), btrim(session ->> 'title_en'),
      (session ->> 'starts_at')::timestamptz, session ->> 'language_code',
      coalesce((session ->> 'rating')::public.story_rating, 'all_ages'),
      btrim(session ->> 'place_ro'), btrim(session ->> 'place_en'),
      nullif(btrim(session ->> 'link_url'), ''), (select auth.uid()))
    returning * into saved;
  else
    select * into before_row from public.live_sessions
    where live_sessions.id = session_id and deleted_at is null for update;
    if before_row.id is null then
      raise exception 'There is no such live session.' using errcode = 'no_data_found';
    end if;
    update public.live_sessions set
      title_ro = btrim(session ->> 'title_ro'), title_en = btrim(session ->> 'title_en'),
      starts_at = (session ->> 'starts_at')::timestamptz, language_code = session ->> 'language_code',
      rating = coalesce((session ->> 'rating')::public.story_rating, 'all_ages'),
      place_ro = btrim(session ->> 'place_ro'), place_en = btrim(session ->> 'place_en'),
      link_url = nullif(btrim(session ->> 'link_url'), ''),
      updated_by_user_id = (select auth.uid())
    where id = session_id returning * into saved;
  end if;
  -- Step 3: the audit log keeps what changed, in the same transaction.
  perform public.log_staff_action('live_session.saved', 'live_sessions', saved.id::text, null, null,
    case when before_row.id is null then null
         else to_jsonb(before_row) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at'] end,
    to_jsonb(saved) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at']);
  return saved.id;
end;
$$;

comment on function public.admin_save_live_session(uuid, jsonb) is
  'Contest staff add or change a live session; logged with before and after (GAPS-12h).';
revoke all on function public.admin_save_live_session(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_live_session(uuid, jsonb) to authenticated;

/**
 * admin_delete_live_session: takes a session off the hub and the staff list, with the reminders
 * that still wait for it; the audit log keeps what it said.
 * Input: session_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on contests; no_data_found for an
 *   unknown session.
 */
create function public.admin_delete_live_session(session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.live_sessions;
begin
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change live sessions.' using errcode = 'insufficient_privilege';
  end if;
  update public.live_sessions set deleted_at = now(), updated_by_user_id = (select auth.uid())
  where id = session_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such live session.' using errcode = 'no_data_found';
  end if;
  -- A session that won't happen needs no reminders.
  delete from public.live_session_reminders
  where live_session_reminders.session_id = deleted.id and live_session_reminders.notified_at is null;
  perform public.log_staff_action('live_session.deleted', 'live_sessions', deleted.id::text, null, null,
    to_jsonb(deleted) - array['id', 'updated_by_user_id', 'created_at', 'updated_at', 'deleted_at'], null);
  return true;
end;
$$;

comment on function public.admin_delete_live_session(uuid) is
  'Contest staff delete a live session and its waiting reminders; logged (GAPS-12h).';
revoke all on function public.admin_delete_live_session(uuid) from public, anon;
grant execute on function public.admin_delete_live_session(uuid) to authenticated;

/* ---------- Notifications ---------- */

/**
 * notification_category: as before, plus live_session_soon under stories (the group the landing
 *   page reminder is in), so the same switch in Settings covers both reminders.
 */
CREATE OR REPLACE FUNCTION public.notification_category(kind notification_kind)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $$
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
    when 'live_session_soon' then 'stories'
    when 'rank_reached' then 'stories'
    when 'space_handover_offered' then 'follows'
    when 'story_featured' then 'stories'
    when 'spotlight_consent_agreed' then 'staff'
    when 'spotlight_consent_withdrawn' then 'staff'
    when 'waitlist_admitted' then 'staff'
    else 'replies'
  end;
$$;

/**
 * notification_json: as before, plus the live session a live_session_soon row is about.
 *   Inputs, return and callers are unchanged.
 */
CREATE OR REPLACE FUNCTION public.notification_json(target notifications)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- GAPS-12h: the live session about to start, with its title in each language, while it is
    -- still listed (a deleted session gives null, and the row has no link).
    'live_session', (select jsonb_build_object('title_ro', live_sessions.title_ro,
                       'title_en', live_sessions.title_en, 'starts_at', live_sessions.starts_at)
                     from public.live_sessions
                     where live_sessions.id = target.live_session_id and live_sessions.deleted_at is null),
    -- IDEAS-3a: the rank a writer just reached, and their own handle for the link to their profile.
    'writer_rank', case when target.kind = 'rank_reached' then target.writer_rank end,
    'own_handle', case when target.kind = 'rank_reached'
                    then (select profiles.handle from public.profiles where profiles.id = target.user_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/**
 * notify: as before, plus the live session a notification is about (about.live_session_id).
 *   Inputs, return and callers are unchanged.
 */
CREATE OR REPLACE FUNCTION public.notify(recipient_id uuid, notification_kind notification_kind, actor_id uuid, about jsonb, group_key text DEFAULT NULL::text, group_window interval DEFAULT NULL::interval)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    story_revision_id, data_request_id, landing_page_id, live_session_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, (about ->> 'data_request_id')::uuid,
    (about ->> 'landing_page_id')::uuid, (about ->> 'live_session_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff', 'data_request_confirm',
                          'data_request_extended', 'data_request_copy_ready', 'picture_opened_by_staff'));
end;
$$;

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
    ('live_session_reminders', true, null),
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
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h).';

-- Unchanged except for the new table: the reminders go with the account.
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
    ('live_session_reminders', 'delete', 1, null),
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
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, GAPS-6, GAPS-11, GAPS-12e, GAPS-12f, GAPS-12g, GAPS-12h).';
