/*
 * Migration: appeals against moderation decisions (story S1-E10-07; DSA art. 20, the internal
 * complaint-handling system; art. 17(3)(f): the statement of reasons says how to challenge it).
 *
 * How it works: on a statement of reasons (S1-E10-04) the person taps "Appeal" within six months
 * and explains why the decision is wrong (criterion 1). A moderator who didn't make the decision
 * reviews it where there is one (criterion 2; art. 20(6): not solely automated, by qualified
 * staff), upholds or overturns it, and the person is told the outcome with the reasons (art.
 * 20(5)). Overturning restores the item, lifts the sanction and approves a removed picture. A
 * raised rating stays (decision, rule 8): the writer can ask again through moderator mail.
 * What it adds:
 *   appeal_status, appeals                 the appeals
 *   notifications.appeal_id,               the outcome notification and the moderator mail reply
 *   notifications.mail_thread_id           notification (S1-E10-11) link to what they are about
 *   submit_appeal()                        the person's side (rate-limited, S1-E10-12)
 *   admin_appeals_queue(), admin_decide_appeal()   the staff side, logged
 *   statement_json()                       each statement now carries its newest appeal
 *   notify(), notification_category(), notification_json()   the two new notification kinds;
 *                                          an appeal's outcome is required, like a decision
 * Who calls it: src/features/statements/ (the person) and src/features/moderation/ (staff).
 */

/* ---------- The table ---------- */

/** appeal_status: open while waiting; upheld (the decision stands) or overturned (S1-E10-07). */
create type public.appeal_status as enum ('open', 'upheld', 'overturned');

comment on type public.appeal_status is 'Where an appeal is: open, upheld or overturned (S1-E10-07).';

create sequence public.appeal_reference_seq;
comment on sequence public.appeal_reference_seq is 'Numbers appeals: A-000123 (S1-E10-07).';

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  -- The person appealing: the statement's owner (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  statement_id uuid not null references public.statements_of_reasons (id) on delete cascade,
  explanation text not null,
  status public.appeal_status not null default 'open',
  -- Who made the decision appealed against, so a different moderator decides where possible.
  original_decider_user_id uuid references public.profiles (id),
  decided_by_user_id uuid references public.profiles (id),
  -- Staff's own note, and what the person reads with the outcome (art. 20(5)).
  decision_note text,
  message_to_person text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appeals_explanation_length check (char_length(btrim(explanation)) between 1 and 4000),
  constraint appeals_decided_fields_go_together check (
    (status = 'open') = (decided_by_user_id is null and decided_at is null and decision_note is null))
);

comment on table public.appeals is
  'kind: user_action
Appeals against moderation decisions, decided by a different moderator where possible (S1-E10-07; DSA art. 20).';

-- One open appeal per statement at a time.
create unique index appeals_one_open_per_statement on public.appeals (statement_id) where status = 'open';
create index appeals_user_id_idx on public.appeals (user_id, created_at desc);
create index appeals_status_idx on public.appeals (status, created_at);
create trigger appeals_refuse_user_id_change
  before update on public.appeals
  for each row execute function public.refuse_user_id_change('user_id');
create trigger appeals_set_updated_at
  before update on public.appeals
  for each row execute function public.set_updated_at();

alter table public.appeals enable row level security;

/**
 * appeals_select_own: the person reads their own appeals and their outcomes (art. 20(5)). The
 * decider's ID is in the row, but the screens read appeals through statement_json(), which never
 * returns an ID.
 */
create policy appeals_select_own
  on public.appeals for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy appeals_select_own on public.appeals is
  'Allows the person to read their own appeals and outcomes (S1-E10-07).';

/**
 * appeals_select_staff: staff who decide appeals read them; one about a safeguarding case only
 * with that permission (S1-E10-10).
 */
create policy appeals_select_staff
  on public.appeals for select to authenticated
  using (
    (select public.staff_may('appeals', 'act'))
    and public.may_see_case(coalesce((
      select cases.is_safeguarding from public.statements_of_reasons
      join public.cases on cases.id = statements_of_reasons.case_id
      where statements_of_reasons.id = appeals.statement_id), false))
  );

comment on policy appeals_select_staff on public.appeals is
  'Allows staff who decide appeals to read them; safeguarding ones need that permission (S1-E10-07).';

-- Reads only; every write goes through the functions below.
grant select on public.appeals to authenticated;

/* ---------- Notifications link to what they're about ---------- */

alter table public.notifications
  add column appeal_id uuid references public.appeals (id) on delete cascade,
  add column mail_thread_id uuid references public.moderator_mail_threads (id) on delete cascade;

comment on column public.notifications.appeal_id is 'The appeal an appeal_decided notification is about (S1-E10-07).';
comment on column public.notifications.mail_thread_id is 'The thread a moderator_mail_reply notification is about (S1-E10-11).';

/**
 * notify: as in S1-E10-04, plus the appeal and the moderator mail thread a notification is about,
 * and an appeal's outcome is required, like a decision (it can't be switched off; DSA art. 20(5)).
 * Internal.
 */
create or replace function public.notify(
  recipient_id uuid,
  notification_kind public.notification_kind,
  actor_id uuid,
  about jsonb,
  group_key text default null,
  group_window interval default null
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
  -- Step 3: a new row; a decision or an appeal's outcome can't be switched off (DSA art. 17, 20).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    notify.group_key, notification_kind in ('moderation_decision', 'appeal_decided'));
end;
$$;

/**
 * notification_category: as in S1-E10-04; an appeal's outcome and a moderator mail reply sit under
 * staff, beside decisions. Internal.
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
    else 'replies'
  end;
$$;

/**
 * notification_json: as in S1-E10-04, plus appeal {reference, outcome, statement_reference} for an
 * appeal's outcome and mail {reference, subject} for a moderator mail reply. Never a user ID.
 * Internal.
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
    'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
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
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/* ---------- The person's side ---------- */

/**
 * decider_of_statement: who made the decision a statement is about: the moderator who decided its
 * case or applied its sanction; null for a story change (a raised rating, the AI label).
 * Input: the statement. Internal: submit_appeal().
 */
create or replace function public.decider_of_statement(target public.statements_of_reasons)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select cases.decided_by_user_id from public.cases where cases.id = target.case_id),
    (select sanctions.applied_by_user_id from public.sanctions where sanctions.id = target.sanction_id));
$$;

comment on function public.decider_of_statement(public.statements_of_reasons) is
  'Internal: the moderator who made the decision a statement is about (S1-E10-07).';
revoke execute on function public.decider_of_statement(public.statements_of_reasons) from public, anon, authenticated;

/**
 * submit_appeal: the person appeals a decision on one of their statements of reasons (criterion 1).
 * Inputs: statement_reference (S-000123); explanation (why the decision is wrong, up to 4,000
 *   characters). Returns: {reference} of the appeal.
 * Errors: insufficient_privilege when signed out; no_data_found when the statement isn't theirs;
 *   check_violation when the six months are over, an appeal on it is still open, or the text is
 *   empty or too long; program_limit_exceeded over the hourly limit (S1-E10-12).
 * Any signed-in account may appeal, a suspended one included: that is often exactly who needs to.
 */
create or replace function public.submit_appeal(statement_reference text, explanation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  statement public.statements_of_reasons;
  clean_explanation text := btrim(coalesce(explanation, ''));
  new_reference text;
begin
  -- Step 1: their own statement, within six months (DSA art. 20(1)).
  if caller_id is null then
    raise exception 'Log in to appeal.' using errcode = 'insufficient_privilege';
  end if;
  select * into statement from public.statements_of_reasons
  where reference = upper(btrim(statement_reference)) and user_id = caller_id;
  if statement.id is null then
    raise exception 'There is no such decision on your account.' using errcode = 'no_data_found';
  end if;
  if statement.appeal_until <= now() then
    raise exception 'The six months to appeal this decision are over.' using errcode = 'check_violation';
  end if;
  -- Step 2: the explanation, and one open appeal at a time.
  if clean_explanation = '' or char_length(clean_explanation) > 4000 then
    raise exception 'Explain why the decision is wrong, in at most 4,000 characters.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.appeals where appeals.statement_id = statement.id and appeals.status = 'open') then
    raise exception 'You already appealed this decision; we''ll tell you the outcome.' using errcode = 'check_violation';
  end if;
  -- Step 3: the limit (S1-E10-12), then the appeal.
  perform public.take_rate_limit('appeal');
  new_reference := 'A-' || lpad(nextval('public.appeal_reference_seq')::text, 6, '0');
  insert into public.appeals (reference, user_id, statement_id, explanation, original_decider_user_id)
  values (new_reference, caller_id, statement.id, clean_explanation, public.decider_of_statement(statement));
  return jsonb_build_object('reference', new_reference);
end;
$$;

comment on function public.submit_appeal(text, text) is
  'The person appeals a decision on one of their statements of reasons within six months (S1-E10-07).';
revoke execute on function public.submit_appeal(text, text) from public, anon;
grant execute on function public.submit_appeal(text, text) to authenticated;

/**
 * statement_json: as in S1-E10-04, plus appeal: the newest appeal on the statement {reference,
 * status, created_at, decided_at, message} (the decider's note and name are never included), and
 * can_appeal: inside the six months with no open appeal. Internal.
 */
create or replace function public.statement_json(target public.statements_of_reasons)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', target.reference,
    'action', target.action,
    'item_type', target.item_type,
    'item_summary', target.item_summary,
    'facts', target.facts,
    'ground', target.ground,
    'ground_key', target.ground_key,
    'automated_detection', target.automated_detection,
    'automated_decision', target.automated_decision,
    'restriction_ends_at', target.restriction_ends_at,
    'appeal_until', target.appeal_until,
    'can_challenge', target.appeal_until > now(),
    'can_appeal', target.appeal_until > now()
      and not exists (select 1 from public.appeals where appeals.statement_id = target.id and appeals.status = 'open'),
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'status', appeals.status,
                 'created_at', appeals.created_at, 'decided_at', appeals.decided_at,
                 'message', appeals.message_to_person)
               from public.appeals where appeals.statement_id = target.id
               order by appeals.created_at desc limit 1),
    'issued_at', target.issued_at,
    'case_reference', (select cases.reference from public.cases where cases.id = target.case_id));
$$;

/* ---------- The staff side ---------- */

/**
 * another_appeals_decider_exists: is there someone besides the caller who may decide appeals?
 * Returns: true when another staff member holds a role that may act on appeals. Internal:
 * admin_decide_appeal() and admin_appeals_queue() ("a different moderator where possible").
 */
create or replace function public.another_appeals_decider_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles
    join public.staff_role_areas on staff_role_areas.role = staff_roles.role
      and staff_role_areas.area = 'appeals' and staff_role_areas.access = 'act'
    where staff_roles.user_id <> (select auth.uid()));
$$;

comment on function public.another_appeals_decider_exists() is
  'Internal: true when someone besides the caller may decide appeals (S1-E10-07).';
revoke execute on function public.another_appeals_decider_exists() from public, anon, authenticated;

/**
 * admin_appeals_queue: appeals, open ones oldest first, then decided ones newest first.
 * Input: status_filter (optional). Returns: one row per appeal the caller may see: id, reference,
 *   status, the statement's reference, action and summary, the case reference, the appellant's
 *   username, the explanation, when it came in, who made the original decision, whether the
 *   caller may decide it (not their own decision while someone else can), and the outcome fields.
 * Errors: insufficient_privilege unless the caller may act on appeals.
 */
create or replace function public.admin_appeals_queue(status_filter public.appeal_status default null)
returns table (
  id uuid, reference text, status public.appeal_status, statement_reference text,
  statement_action public.statement_action, item_summary text, case_reference text,
  appellant_handle text, explanation text, created_at timestamptz, original_decider_handle text,
  may_decide boolean, decided_by_handle text, decided_at timestamptz, decision_note text,
  message_to_person text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('appeals', 'act') then
    raise exception 'Only staff who decide appeals can see them.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select appeals.id, appeals.reference, appeals.status, statements_of_reasons.reference,
      statements_of_reasons.action, statements_of_reasons.item_summary, cases.reference,
      appellant.handle, appeals.explanation, appeals.created_at, original.handle,
      appeals.status = 'open' and (appeals.original_decider_user_id is distinct from (select auth.uid())
                                   or not public.another_appeals_decider_exists()),
      decider.handle, appeals.decided_at, appeals.decision_note, appeals.message_to_person
    from public.appeals
    join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
    join public.profiles as appellant on appellant.id = appeals.user_id
    left join public.cases on cases.id = statements_of_reasons.case_id
    left join public.profiles as original on original.id = appeals.original_decider_user_id
    left join public.profiles as decider on decider.id = appeals.decided_by_user_id
    where public.may_see_case(coalesce(cases.is_safeguarding, false))
      and (status_filter is null or appeals.status = status_filter)
    order by (appeals.status <> 'open'), case when appeals.status = 'open' then appeals.created_at end,
      appeals.decided_at desc;
end;
$$;

comment on function public.admin_appeals_queue(public.appeal_status) is
  'Appeals for staff: open ones oldest first, with who may decide each (S1-E10-07).';
revoke execute on function public.admin_appeals_queue(public.appeal_status) from public, anon;
grant execute on function public.admin_appeals_queue(public.appeal_status) to authenticated;

/**
 * undo_decision_for_appeal: carries out an overturned appeal: restores every item the decision
 * hid or removed, lifts every sanction it applied that is still live and approves a removed
 * picture. A raised rating stays (decision, rule 8). Each step is logged by the function it calls.
 * Inputs: the statement and the appeal's reference (the reason in the log). Internal.
 */
create or replace function public.undo_decision_for_appeal(statement public.statements_of_reasons, appeal_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reason_given text := format('Appeal %s overturned the decision.', appeal_reference);
  item_id uuid;
  sanction_id uuid;
  picture public.picture_checks;
begin
  -- Step 1: the items the case hid or removed come back.
  for item_id in
    select moderated_items.id from public.moderated_items
    where moderated_items.case_id = statement.case_id and moderated_items.restored_at is null
  loop
    perform public.admin_restore_item(item_id, reason_given);
  end loop;
  -- Step 2: the case's sanctions, or the statement's own sanction, are lifted.
  for sanction_id in
    select sanctions.id from public.sanctions
    where (sanctions.case_id = statement.case_id or sanctions.id = statement.sanction_id)
      and sanctions.lifted_at is null
  loop
    perform public.admin_lift_sanction(sanction_id, reason_given);
  end loop;
  -- Step 3: a removed picture is approved and shows again (S1-E10-05).
  update public.picture_checks set status = 'approved'
  where picture_checks.case_id = statement.case_id and picture_checks.status = 'removed'
  returning * into picture;
  if picture.id is not null then
    perform public.show_passed_avatar(picture);
  end if;
end;
$$;

comment on function public.undo_decision_for_appeal(public.statements_of_reasons, text) is
  'Internal: restores items, lifts sanctions and approves a removed picture when an appeal is overturned (S1-E10-07).';
revoke execute on function public.undo_decision_for_appeal(public.statements_of_reasons, text) from public, anon, authenticated;

/**
 * admin_decide_appeal: a moderator upholds or overturns an appeal (criterion 2).
 * Inputs: target_appeal_id; outcome ('upheld' or 'overturned'); note_text (staff only, required);
 *   message_to_person (the reasons the person reads, required: art. 20(5)).
 * Returns: true.
 * Errors: insufficient_privilege unless the caller may act on appeals and see its case, or when the
 *   caller made the original decision and someone else could decide; check_violation for an appeal
 *   already decided, an outcome other than upheld or overturned, or a blank note or message.
 * What happens: overturned undoes the decision (undo_decision_for_appeal()); the person gets an
 *   appeal_decided notification; logged as appeal.decided, all in one transaction.
 */
create or replace function public.admin_decide_appeal(
  target_appeal_id uuid,
  outcome public.appeal_status,
  note_text text,
  message_to_person text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  appeal public.appeals;
  statement public.statements_of_reasons;
begin
  -- Step 1: may decide appeals, may see this one, and it's open.
  select * into appeal from public.appeals where id = target_appeal_id for update;
  select * into statement from public.statements_of_reasons where id = appeal.statement_id;
  if appeal.id is null or not public.staff_may('appeals', 'act') or not public.may_see_case(coalesce(
      (select cases.is_safeguarding from public.cases where cases.id = statement.case_id), false)) then
    raise exception 'You can''t decide this appeal.' using errcode = 'insufficient_privilege';
  end if;
  if appeal.status <> 'open' then
    raise exception 'This appeal is already decided.' using errcode = 'check_violation';
  end if;
  -- Step 2: a different moderator where possible (criterion 2).
  if appeal.original_decider_user_id = (select auth.uid()) and public.another_appeals_decider_exists() then
    raise exception 'You made this decision, so another moderator decides the appeal.' using errcode = 'insufficient_privilege';
  end if;
  if outcome not in ('upheld', 'overturned') or btrim(coalesce(note_text, '')) = ''
     or btrim(coalesce(admin_decide_appeal.message_to_person, '')) = ''
     or char_length(admin_decide_appeal.message_to_person) > 4000 then
    raise exception 'Choose upheld or overturned, and write a note and a message to the person.' using errcode = 'check_violation';
  end if;
  -- Step 3: an overturned decision is undone.
  if outcome = 'overturned' then
    perform public.undo_decision_for_appeal(statement, appeal.reference);
  end if;
  -- Step 4: the appeal, the person told, the audit row.
  update public.appeals set status = outcome, decided_by_user_id = (select auth.uid()), decided_at = now(),
    decision_note = btrim(note_text), message_to_person = btrim(admin_decide_appeal.message_to_person)
  where id = appeal.id;
  perform public.notify(appeal.user_id, 'appeal_decided', null,
    jsonb_build_object('appeal_id', appeal.id, 'statement_id', statement.id));
  perform public.log_staff_action('appeal.decided', 'appeals', appeal.id::text, appeal.user_id, btrim(note_text),
    jsonb_build_object('status', 'open'), jsonb_build_object('status', outcome, 'statement', statement.reference));
  return true;
end;
$$;

comment on function public.admin_decide_appeal(uuid, public.appeal_status, text, text) is
  'A moderator upholds or overturns an appeal; overturning undoes the decision; the person is told (S1-E10-07).';
revoke execute on function public.admin_decide_appeal(uuid, public.appeal_status, text, text) from public, anon;
grant execute on function public.admin_decide_appeal(uuid, public.appeal_status, text, text) to authenticated;
