-- Migration: statements of reasons, and telling reporters and notifiers the outcome (story
-- S1-E10-04; DSA art. 17: a statement of reasons to the person whose content or account was
-- restricted; DSA art. 16(5): the notifier is told the decision).
--
-- What it adds:
--   statements_of_reasons            the stored copy of every statement (criterion 3): what was
--                                    done, to what, the facts staff wrote, the rule or law, whether
--                                    automated means were used and until when it can be challenged
--   notifications.statement_id       the decision's notification links to its statement
--   issue_statement_of_reasons()     writes one statement (internal)
--   decide_case()                    the steps of deciding a case, shared by admin_decide_case()
--                                    and Emergency disable (S1-E10-09); now issues the statement
--   admin_decide_case()              gains message_to_person: the facts the person reads
--   admin_apply_sanction()           gains message_to_person; a sanction from the account page
--                                    gets its own statement, one from a case shares the case's
--   statement_from_job()             a raised rating or the undisclosed-AI label (S1-E3-06 queues a
--                                    statement_of_reasons_needed job) becomes a statement at once
--   notify_case_decided()            also tells each reporter the outcome (criterion 2), as
--                                    "removed", "acted on" or "no breach found", never someone
--                                    else's sanction
--   admin_due_decision_emails(),     the decision emails to people who used the public form,
--   admin_mark_decision_emails_sent()  sent by the Pages Function /api/decision-emails
--   my_statements(), my_reports()   "My reports and decisions" (board 6.5): the person's
--                                    statements and the reports they sent, with the outcome
--   admin_case_statements()          the statement stored with a case, for the case page
-- Who calls it: the case page (src/features/moderation/), the account page
-- (src/features/staff/components/users/), My reports and decisions (src/features/statements/) and the
-- notifications page (src/features/notifications/).

/* ---------- The table ---------- */

create sequence public.statement_reference_seq;
comment on sequence public.statement_reference_seq is 'Numbers the statements of reasons: S-000123 (S1-E10-04).';

create table public.statements_of_reasons (
  id uuid primary key default gen_random_uuid(),
  -- The reference the person quotes when they challenge it: S-000123.
  reference text not null unique,
  -- The account the statement is for (the "owner" of the row; CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- Where it came from: a case, a sanction from the account page or a story change by staff.
  -- It lives as long as its case or sanction (docs/retention.md), so it goes with them; a story's
  -- purge keeps the statement, which already holds the item's summary.
  case_id uuid references public.cases (id) on delete cascade,
  sanction_id uuid references public.sanctions (id) on delete cascade,
  story_id uuid references public.stories (id) on delete set null,
  action public.statement_action not null,
  -- What it was about, copied at the time so the statement still reads right if the item goes.
  item_type public.reportable_type,
  item_summary text,
  -- The facts and circumstances, in staff's words to the person (DSA art. 17(3)(b)).
  facts text,
  -- The rule or law relied on (art. 17(3)(d) and (e)): a report reason, authority_order,
  -- picture_check, community_rules, rating_rules or undisclosed_ai.
  ground public.statement_ground not null,
  ground_key text not null,
  -- Art. 17(3)(c): whether automated means found the item, and whether they decided. Today only
  -- the picture check finds anything automatically; a person always decides.
  automated_detection boolean not null default false,
  automated_decision boolean not null default false,
  -- When a timed restriction ends (a suspension, a reporting pause); null otherwise.
  restriction_ends_at timestamptz,
  -- The person's language when it was issued.
  language text not null,
  -- How long the person can challenge it: six months (DSA art. 20(1); S1-E10-07).
  appeal_until timestamptz not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Nobody edits a statement; this changes only when a purged story's link is cleared.
  updated_at timestamptz not null default now(),
  constraint statements_of_reasons_language_is_known check (language in ('ro', 'en')),
  constraint statements_of_reasons_facts_length check (facts is null or char_length(facts) <= 4000),
  constraint statements_of_reasons_ground_key_is_named check (btrim(ground_key) <> '')
);

comment on table public.statements_of_reasons is
  'kind: staff
Every statement of reasons sent to an account: the stored copy (S1-E10-04; DSA art. 17). Append-only; kept 6 months after its appeal window ends.';

create index statements_of_reasons_user_id_idx on public.statements_of_reasons (user_id, issued_at desc);
create index statements_of_reasons_case_id_idx on public.statements_of_reasons (case_id);
create trigger statements_of_reasons_refuse_user_id_change
  before update on public.statements_of_reasons
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.statements_of_reasons enable row level security;

/**
 * statements_of_reasons_select_own: the person reads the statements sent to them, so the
 * statement page and their own data export can show them (DSA art. 17).
 */
create policy statements_of_reasons_select_own
  on public.statements_of_reasons for select to authenticated
  using (user_id = (select auth.uid()));

/**
 * statements_of_reasons_select_moderation: moderation staff read the statement stored with a case
 * they may see (a safeguarding case needs the permission, may_see_case()), and every statement
 * that has no case (a sanction from the account page, a story change).
 */
create policy statements_of_reasons_select_moderation
  on public.statements_of_reasons for select to authenticated
  using (
    (select public.staff_may('moderation', 'view'))
    and (case_id is null or public.may_see_case(
      (select cases.is_safeguarding from public.cases where cases.id = statements_of_reasons.case_id)))
  );

-- Read only: statements are written by issue_statement_of_reasons() and never changed.
grant select on public.statements_of_reasons to authenticated;

alter table public.notifications add column statement_id uuid references public.statements_of_reasons (id) on delete set null;
comment on column public.notifications.statement_id is 'The statement of reasons a decision links to (S1-E10-04).';

/* ---------- Writing a statement ---------- */

/**
 * statement_ground_for_case: the rule or law a case's decision rests on.
 * Input: the case. Returns: (ground, ground_key): an authority order rests on the law that issued
 *   it; a report of illegal content (child sexual content, terrorism, a threat to a minor,
 *   copyright, a copied published work, other illegal content) on the law; a flagged picture and
 *   every other reason on our community rules (DSA art. 17(3)(d) and (e)).
 * Internal: decide_case().
 */
create or replace function public.statement_ground_for_case(target public.cases)
returns table (ground public.statement_ground, ground_key text)
language sql
immutable
set search_path = ''
as $$
  select
    case
      when target.source = 'authority_order' then 'law'::public.statement_ground
      when target.top_reason in ('illegal_content', 'child_sexual_content', 'terrorism', 'threat_to_minor',
                                 'copyright', 'copied_published_work') then 'law'::public.statement_ground
      else 'terms'::public.statement_ground
    end,
    case
      when target.source = 'authority_order' then 'authority_order'
      when target.source = 'picture_check' then 'picture_check'
      else coalesce(target.top_reason::text, 'community_rules')
    end;
$$;

comment on function public.statement_ground_for_case(public.cases) is
  'Internal: the rule or law a case''s decision rests on, for its statement (S1-E10-04; DSA art. 17(3)(d), (e)).';
revoke execute on function public.statement_ground_for_case(public.cases) from public, anon, authenticated;

/**
 * issue_statement_of_reasons: writes one statement of reasons and, unless a case's own
 * notification will carry it, the person's required notification.
 * Inputs: recipient_id (the account told); chosen_action; ground and ground_key (the rule or law);
 *   facts (staff's words to the person, may be null); about: {case_id, sanction_id, story_id,
 *   item_type, item_id, automated_detection, restriction_ends_at}, each optional.
 * Returns: the statement's ID.
 * Rules: written in the person's language; challengeable for six months (DSA art. 20(1)); a case's
 *   statement is linked by notify_case_decided() when the case is marked decided, so the person
 *   gets one notification, not two.
 * Internal: decide_case(), admin_apply_sanction(), statement_from_job(), admin_emergency_disable().
 */
create or replace function public.issue_statement_of_reasons(
  recipient_id uuid,
  chosen_action public.statement_action,
  ground public.statement_ground,
  ground_key text,
  facts text,
  about jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_statement public.statements_of_reasons;
  item_type public.reportable_type := (about ->> 'item_type')::public.reportable_type;
  item_id uuid := (about ->> 'item_id')::uuid;
begin
  -- Step 1: the stored copy, with a summary of the item made now.
  insert into public.statements_of_reasons (reference, user_id, case_id, sanction_id, story_id, action,
    item_type, item_summary, facts, ground, ground_key, automated_detection, restriction_ends_at,
    language, appeal_until)
  values (
    'S-' || lpad(nextval('public.statement_reference_seq')::text, 6, '0'),
    recipient_id, (about ->> 'case_id')::uuid, (about ->> 'sanction_id')::uuid, (about ->> 'story_id')::uuid,
    chosen_action, item_type,
    case when item_type is not null and item_id is not null then public.reportable_item_summary(item_type, item_id) end,
    nullif(btrim(coalesce(facts, '')), ''), ground, ground_key,
    coalesce((about ->> 'automated_detection')::boolean, false),
    (about ->> 'restriction_ends_at')::timestamptz,
    coalesce((select case when profiles.locale = 'en' then 'en' else 'ro' end
              from public.profiles where profiles.id = recipient_id), 'ro'),
    now() + interval '6 months')
  returning * into new_statement;
  -- Step 2: a statement without a case tells the person now; a case's notification links it.
  if new_statement.case_id is null then
    perform public.notify(recipient_id, 'moderation_decision', null,
      jsonb_build_object('statement_id', new_statement.id, 'story_id', new_statement.story_id));
  end if;
  return new_statement.id;
end;
$$;

comment on function public.issue_statement_of_reasons(uuid, public.statement_action, public.statement_ground, text, text, jsonb) is
  'Internal: writes one statement of reasons and, outside a case, its required notification (S1-E10-04; DSA art. 17).';
revoke execute on function public.issue_statement_of_reasons(uuid, public.statement_action, public.statement_ground, text, text, jsonb)
  from public, anon, authenticated;

/* ---------- Notifications carry the statement ---------- */

/**
 * notify: as in S1-E7-01, plus about.statement_id, so a decision's notification links to its
 * statement of reasons (S1-E10-04). Internal.
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
  -- Step 3: a new row; a decision about the person can't be switched off (DSA art. 17).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid,
    notify.group_key, notification_kind = 'moderation_decision');
end;
$$;

/**
 * report_outcome_of: what a reporter is told about a decision: "removed" (hidden or removed),
 * "acted" (any other action) or "no_action". Never which sanction someone else got.
 * Internal: notification_json() and admin_due_decision_emails().
 */
create or replace function public.report_outcome_of(decision public.moderation_action)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when decision is null then null
    when decision in ('hide', 'remove') then 'removed'
    when decision = 'no_action' then 'no_action'
    else 'acted'
  end;
$$;

comment on function public.report_outcome_of(public.moderation_action) is
  'Internal: what a reporter or notifier is told: removed, acted or no_action, never a sanction (S1-E10-04).';
revoke execute on function public.report_outcome_of(public.moderation_action) from public, anon, authenticated;

/**
 * notify_case_decided: a decided case tells the account whose item it was, with the link to its
 * statement of reasons when there is one (S1-E7-01, S1-E10-04), unless a removal order forbids
 * telling them (S1-E10-09), and tells each reporter the
 * outcome (S1-E10-04 criterion 2; DSA art. 16(5)). A reporter who is also the owner is told once,
 * as the owner. Trigger: after update of status on cases.
 */
create or replace function public.notify_case_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid;
  statement_id uuid;
begin
  if new.status = 'decided' and old.status is distinct from 'decided' then
    -- Step 1: the owner, with the newest statement stored with the case. A removal order that
    -- forbids telling the uploader (TCO art. 11(3); S1-E10-09) leaves them with no statement and
    -- no notification.
    select statements_of_reasons.id into statement_id from public.statements_of_reasons
    where statements_of_reasons.case_id = new.id order by statements_of_reasons.issued_at desc limit 1;
    if not (new.source = 'authority_order' and new.decision <> 'no_action' and statement_id is null) then
      perform public.notify(new.user_id, 'moderation_decision', null,
        jsonb_build_object('case_id', new.id, 'decision', new.decision, 'statement_id', statement_id));
    end if;
    -- Step 2: each reporter once.
    for reporter_id in
      select distinct reports.user_id from public.reports
      where reports.case_id = new.id and reports.user_id <> new.user_id
    loop
      perform public.notify(reporter_id, 'report_outcome', null,
        jsonb_build_object('case_id', new.id, 'decision', new.decision));
    end loop;
  end if;
  return null;
end;
$$;

/**
 * notification_category: as in S1-E7-01; a report's outcome sits under staff, beside decisions.
 * Internal.
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
    else 'replies'
  end;
$$;

/**
 * notification_json: as in S1-E7-01, plus statement {reference, action} for a decision with a
 * statement of reasons and outcome for a report's outcome (S1-E10-04). A reporter's item link is
 * left out, so the reporter isn't sent to an item that may be gone. Never a user ID. Internal.
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
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;

/* ---------- Deciding a case ---------- */

drop function public.admin_decide_case(uuid, public.moderation_action, text, integer);

/**
 * decide_case: the steps of deciding one case, shared by admin_decide_case() and Emergency
 * disable (S1-E10-09). The caller has already checked who may decide and locked the case.
 * Inputs: target (the open case); chosen_action; note_text (staff only, required);
 *   message_to_person (the facts the person reads; may be null); suspension_days;
 *   send_statement (false only when a removal order forbids telling the uploader, TCO art. 11(3)).
 * Steps: the decision row, the action carried out, the statement of reasons (every action except
 *   no_action, DSA art. 17), then the case marked decided, which notifies the owner with the
 *   statement and each reporter with the outcome (notify_case_decided()), the reports closed and
 *   the audit row, all in one transaction.
 * Internal.
 */
create or replace function public.decide_case(
  target public.cases,
  chosen_action public.moderation_action,
  note_text text,
  message_to_person text,
  suspension_days integer,
  send_statement boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sanction_id uuid;
  case_ground record;
begin
  -- Step 1: the decision row.
  insert into public.case_actions (case_id, user_id, action, note)
  values (target.id, (select auth.uid()), chosen_action, btrim(note_text));
  -- Step 2: carry the action out (S1-E10-06, S1-E10-08). A sanction from a case gets no
  -- statement of its own: the case's statement covers it.
  if chosen_action in ('warn', 'suspend', 'ban') then
    sanction_id := public.admin_apply_sanction(target.user_id,
      case chosen_action when 'warn' then 'warning' when 'suspend' then 'suspension' else 'ban' end::public.sanction_kind,
      suspension_days, target.id, note_text, null);
  elsif chosen_action in ('hide', 'remove') then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id,
      case chosen_action when 'hide' then 'hidden' else 'removed' end::public.moderated_state, target.id, note_text);
  elsif chosen_action = 'public_note' then
    perform public.add_copied_work_note(target);
  end if;
  -- Step 3: the statement of reasons (S1-E10-04), stored with the case.
  if chosen_action <> 'no_action' and send_statement then
    select * into case_ground from public.statement_ground_for_case(target);
    perform public.issue_statement_of_reasons(target.user_id, chosen_action::text::public.statement_action,
      case_ground.ground, case_ground.ground_key, message_to_person,
      jsonb_build_object('case_id', target.id, 'sanction_id', sanction_id, 'item_type', target.item_type,
        'item_id', target.item_id, 'automated_detection', target.source = 'picture_check',
        'restriction_ends_at', (select sanctions.ends_at from public.sanctions where sanctions.id = sanction_id)));
  end if;
  -- Step 4: the case and its reports; marking it decided tells the owner and the reporters.
  update public.cases set status = 'decided', decision = chosen_action, decided_at = now(),
    decided_by_user_id = (select auth.uid())
  where id = target.id;
  update public.reports set closed_at = now() where case_id = target.id and closed_at is null;
  -- Step 5: the audit row, in the same transaction.
  perform public.log_staff_action(
    'case.decided', 'cases', target.id::text, target.user_id, btrim(note_text),
    jsonb_build_object('status', 'open', 'tier', target.tier, 'top_reason', target.top_reason),
    jsonb_build_object('status', 'decided', 'action', chosen_action, 'suspension_days', suspension_days,
      'statement_sent', chosen_action <> 'no_action' and send_statement)
  );
end;
$$;

comment on function public.decide_case(public.cases, public.moderation_action, text, text, integer, boolean) is
  'Internal: decides one case: the action, the statement of reasons, the notifications and the audit row (S1-E10-03a, 06, 08, 04).';
revoke execute on function public.decide_case(public.cases, public.moderation_action, text, text, integer, boolean)
  from public, anon, authenticated;

/**
 * admin_decide_case: a moderator decides an open case (S1-E10-03a, S1-E10-06, S1-E10-08), and
 * the person gets a statement of reasons (S1-E10-04).
 * Inputs: target_case_id; chosen_action; note_text (required, staff only); suspension_days (a
 *   suspension: 1, 7 or 30); message_to_person (what happened, in words the person reads; the
 *   case page asks for it with every action except no_action).
 * Returns: true.
 * Errors: insufficient_privilege unless the caller may act on moderation and see the case;
 *   check_violation for a blank note, a case already decided, or a public note on anything but
 *   a story or chapter; feature_not_supported for restrict (S1-E11-08).
 */
create or replace function public.admin_decide_case(
  target_case_id uuid,
  chosen_action public.moderation_action,
  note_text text,
  suspension_days integer default null,
  message_to_person text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  -- Step 1: may act, and may see this case.
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('moderation', 'act') then
    raise exception 'You can''t decide this case.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: a note is required; a decided case stays decided; restrict isn't built yet; a public
  -- note goes on a story or a chapter only.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(message_to_person, '')) > 4000 then
    raise exception 'The message to the person is too long.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  if chosen_action = 'restrict' then
    raise exception 'Restricting an item comes with S1-E11-08.' using errcode = 'feature_not_supported';
  end if;
  if chosen_action = 'public_note' and target.item_type not in ('story', 'chapter') then
    raise exception 'A public note goes on a story or a chapter only.' using errcode = 'check_violation';
  end if;
  -- Step 3: the shared steps, with the statement of reasons.
  perform public.decide_case(target, chosen_action, note_text, message_to_person, suspension_days, true);
  return true;
end;
$$;

comment on function public.admin_decide_case(uuid, public.moderation_action, text, integer, text) is
  'Moderators decide an open case; the action is carried out, the statement of reasons sent and the reporters told (S1-E10-03a, 06, 08, 04).';
revoke execute on function public.admin_decide_case(uuid, public.moderation_action, text, integer, text) from public, anon;
grant execute on function public.admin_decide_case(uuid, public.moderation_action, text, integer, text) to authenticated;

/* ---------- Sanctions from the account page ---------- */

drop function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text);

/**
 * admin_apply_sanction: puts a sanction on an account (S1-E10-06) and, outside a case, sends the
 * statement of reasons (S1-E10-04).
 * Inputs: target_user_id; wanted_kind; days (suspensions only: 1, 7 or 30; null for the default);
 *   source_case_id (the case it comes from, or null); note_text (required, staff only);
 *   message_to_person (the facts the person reads; the account page asks for it).
 * Returns: the sanction's ID.
 * Errors: insufficient_privilege unless the caller may act on user sanctions (owner, admin,
 *   moderator in a staff session); check_violation for a staff account, a blank note, a wrong
 *   length, or a live sanction of the same kind already on the account (warnings excepted).
 * What a ban does (decided 23 Oct 2026, Q7 and Q8): Supabase's own ban (auth.users.banned_until,
 *   so sign-in is refused), every session ended, and the email's keyed hash kept so the address
 *   can't sign up again. Everything is logged as sanction.applied in the same transaction.
 */
create or replace function public.admin_apply_sanction(
  target_user_id uuid,
  wanted_kind public.sanction_kind,
  days integer default null,
  source_case_id uuid default null,
  note_text text default null,
  message_to_person text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_sanction public.sanctions;
  target_email text;
  hash text;
begin
  -- Step 1: may act, and never on a staff account (staff powers are removed first, S1-E2-07a).
  if not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only moderation staff can apply a sanction.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.staff_roles where staff_roles.user_id = target_user_id) then
    raise exception 'A staff account can''t be sanctioned; remove its role first.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the sanction.' using errcode = 'check_violation';
  end if;
  -- Step 2: one live sanction of a kind at a time (a warning is only a record, so any number).
  if wanted_kind <> 'warning' and (public.active_sanction(target_user_id, wanted_kind)).id is not null then
    raise exception 'This account already has a live % .', wanted_kind using errcode = 'check_violation';
  end if;
  -- Step 3: the row.
  insert into public.sanctions (user_id, kind, case_id, applied_by_user_id, note, ends_at)
  values (target_user_id, wanted_kind, source_case_id, (select auth.uid()), btrim(note_text),
          public.sanction_end(wanted_kind, days))
  returning * into new_sanction;
  -- Step 4: a ban reaches Supabase Auth, ends every session and blocks the email (Q7, Q8).
  if wanted_kind = 'ban' then
    update auth.users set banned_until = now() + interval '100 years' where users.id = target_user_id
      returning users.email into target_email;
    perform public.sign_out_everywhere(target_user_id);
    hash := public.banned_email_hash(target_email);
    if hash is not null then
      insert into public.banned_email_hashes (email_hash, sanction_id) values (hash, new_sanction.id)
        on conflict (email_hash) do nothing;
    end if;
  end if;
  -- Step 5: the audit row, in the same transaction.
  perform public.log_staff_action(
    'sanction.applied', 'sanctions', new_sanction.id::text, target_user_id, btrim(note_text),
    null,
    jsonb_build_object('kind', wanted_kind, 'ends_at', new_sanction.ends_at, 'case_id', source_case_id,
                       'email_blocked', hash is not null)
  );
  -- Step 6: outside a case, the statement of reasons (S1-E10-04); a case sends its own.
  if source_case_id is null then
    perform public.issue_statement_of_reasons(target_user_id,
      case wanted_kind when 'warning' then 'warn' when 'suspension' then 'suspend'
        when 'ban' then 'ban' else 'reporting_pause' end::public.statement_action,
      'terms', 'community_rules', message_to_person,
      jsonb_build_object('sanction_id', new_sanction.id, 'item_type', 'profile', 'item_id', target_user_id,
        'restriction_ends_at', new_sanction.ends_at));
  end if;
  return new_sanction.id;
end;
$$;

comment on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text, text) is
  'Warns, suspends, bans or pauses reporting, logged; outside a case it sends the statement of reasons (S1-E10-06, S1-E10-04).';
revoke execute on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text, text) from public, anon;
grant execute on function public.admin_apply_sanction(uuid, public.sanction_kind, integer, uuid, text, text) to authenticated;

/* ---------- Story changes queued by S1-E3-06 ---------- */

/**
 * statement_from_job: turns a statement_of_reasons_needed job (a raised rating, the
 * undisclosed-AI label; S1-E3-06) into a statement of reasons to the writer at once, with the
 * reason staff gave in the audit log as the facts, and marks the job done.
 * Trigger: before insert on jobs.
 */
create or replace function public.statement_from_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_owner_id uuid;
  staff_reason text;
  is_ai_label boolean := new.payload ->> 'action' = 'ai_undisclosed_labelled';
begin
  if new.kind <> 'statement_of_reasons_needed' then
    return new;
  end if;
  -- Step 1: whose story, and why staff changed it.
  select stories.user_id into story_owner_id from public.stories where stories.id = (new.payload ->> 'story_id')::uuid;
  select audit_log.reason into staff_reason from public.audit_log where audit_log.id = (new.payload ->> 'audit_log_id')::uuid;
  -- Step 2: the statement, and the job is done.
  if story_owner_id is not null then
    perform public.issue_statement_of_reasons(story_owner_id,
      case when is_ai_label then 'ai_label_added' else 'rating_raised' end::public.statement_action,
      'terms', case when is_ai_label then 'undisclosed_ai' else 'rating_rules' end, staff_reason,
      jsonb_build_object('story_id', new.payload ->> 'story_id', 'item_type', 'story', 'item_id', new.payload ->> 'story_id'));
  end if;
  new.processed_at := now();
  return new;
end;
$$;

comment on function public.statement_from_job() is
  'Trigger: a queued statement_of_reasons_needed job becomes a statement of reasons to the writer at once (S1-E3-06, S1-E10-04).';
revoke execute on function public.statement_from_job() from public, anon, authenticated;

create trigger jobs_statement_of_reasons
  before insert on public.jobs
  for each row when (new.kind = 'statement_of_reasons_needed')
  execute function public.statement_from_job();

/* ---------- Reading statements ---------- */

/**
 * statement_json: one statement as My reports and decisions and the case page draw it: reference,
 * action, item_type, item_summary, facts, ground, ground_key, automated_detection,
 * automated_decision, restriction_ends_at, appeal_until, issued_at and the case's reference.
 * Never a user ID. Internal.
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
    'issued_at', target.issued_at,
    'case_reference', (select cases.reference from public.cases where cases.id = target.case_id));
$$;

comment on function public.statement_json(public.statements_of_reasons) is
  'Internal: one statement of reasons as the screens draw it, never a user ID (S1-E10-04).';
revoke execute on function public.statement_json(public.statements_of_reasons) from public, anon, authenticated;

/**
 * my_statements: the caller's own statements of reasons, newest first, for "My reports and
 * decisions" (board 6.5, MyReports).
 * Returns: a JSON array of statement_json(). Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_statements()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Log in to see your decisions.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select jsonb_agg(public.statement_json(statements_of_reasons) order by statements_of_reasons.issued_at desc)
                   from public.statements_of_reasons
                   where statements_of_reasons.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;

comment on function public.my_statements() is
  'The caller''s own statements of reasons, newest first, for My reports and decisions (S1-E10-04).';
revoke execute on function public.my_statements() from public, anon;
grant execute on function public.my_statements() to authenticated;

/**
 * my_reports: the reports the caller sent, newest first, with what came of each (S1-E10-04
 * criterion 2; board 6.5): reference, reason, what was reported (as the reporter saw it), when it
 * was sent, whether a moderator has decided, the outcome (removed, acted or no_action, never a
 * sanction) and when.
 * Returns: a JSON array. Errors: insufficient_privilege when signed out.
 */
create or replace function public.my_reports()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Log in to see your reports.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'reference', reports.reference,
        'reason', reports.reason,
        'item_type', cases.item_type,
        'item_summary', public.reportable_item_summary(cases.item_type, cases.item_id),
        'sent_at', reports.created_at,
        'is_decided', cases.status = 'decided',
        'outcome', public.report_outcome_of(cases.decision),
        'decided_at', cases.decided_at)
      order by reports.created_at desc)
    from public.reports
    left join public.cases on cases.id = reports.case_id
    where reports.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;

comment on function public.my_reports() is
  'The caller''s own reports with their outcome, never a sanction, for My reports and decisions (S1-E10-04).';
revoke execute on function public.my_reports() from public, anon;
grant execute on function public.my_reports() to authenticated;

/**
 * admin_case_statements: the statements stored with a case, for the case page (criterion 3).
 * Input: the case's ID. Returns: a JSON array of statement_json(), oldest first.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_statements(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cases where id = target_case_id and public.may_see_case(is_safeguarding)) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select jsonb_agg(public.statement_json(statements_of_reasons) order by statements_of_reasons.issued_at)
                   from public.statements_of_reasons where statements_of_reasons.case_id = target_case_id), '[]'::jsonb);
end;
$$;

comment on function public.admin_case_statements(uuid) is
  'Staff: the statements of reasons stored with a case, for its page (S1-E10-04).';
revoke execute on function public.admin_case_statements(uuid) from public, anon;
grant execute on function public.admin_case_statements(uuid) to authenticated;

/* ---------- The decision emails to people who used the public form ---------- */

/**
 * admin_due_decision_emails: the decided public notices whose notifier gave an email and hasn't
 * been sent the decision yet (DSA art. 16(5)), for the Pages Function /api/decision-emails, which
 * calls it with the moderator's own sign-in.
 * Returns: notice_id, reference, kind (notice or removal_order), language, notifier_email,
 *   outcome (removed, acted or no_action, never a sanction) and decided_at.
 * Errors: insufficient_privilege unless the caller may act on moderation; a safeguarding case's
 *   notices only with the permission (may_see_case()).
 */
create or replace function public.admin_due_decision_emails()
returns table (
  notice_id uuid, reference text, kind text, language text, notifier_email text,
  outcome text, decided_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderation staff can send decision emails.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select public_notices.id, public_notices.reference, public_notices.kind, public_notices.language,
           public_notices.notifier_email, public.report_outcome_of(cases.decision), public_notices.decided_at
    from public.public_notices
    join public.cases on cases.id = public_notices.case_id
    where public_notices.decided_at is not null and public_notices.decision_emailed_at is null
      and public_notices.notifier_email is not null and public.may_see_case(cases.is_safeguarding)
    order by public_notices.decided_at
    limit 50;
end;
$$;

comment on function public.admin_due_decision_emails() is
  'Staff: decided public notices still waiting for their decision email (S1-E10-04; DSA art. 16(5)).';
revoke execute on function public.admin_due_decision_emails() from public, anon;
grant execute on function public.admin_due_decision_emails() to authenticated;

/**
 * admin_mark_decision_emails_sent: marks the notices whose decision email left.
 * Input: the notices' IDs. Returns: how many were marked. Errors: as admin_due_decision_emails().
 */
create or replace function public.admin_mark_decision_emails_sent(notice_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  marked integer;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderation staff can send decision emails.' using errcode = 'insufficient_privilege';
  end if;
  update public.public_notices set decision_emailed_at = now()
  where public_notices.id = any(notice_ids) and public_notices.decided_at is not null
    and public_notices.decision_emailed_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

comment on function public.admin_mark_decision_emails_sent(uuid[]) is
  'Staff: marks public notices whose decision email was sent (S1-E10-04).';
revoke execute on function public.admin_mark_decision_emails_sent(uuid[]) from public, anon;
grant execute on function public.admin_mark_decision_emails_sent(uuid[]) to authenticated;

/**
 * admin_waiting_decision_email_count: how many decision emails are waiting, for the queue's
 * "Send waiting decision emails" button. Returns 0 for anyone who may not send them.
 */
create or replace function public.admin_waiting_decision_email_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when not public.staff_may('moderation', 'act') then 0 else (
    select count(*)::integer from public.public_notices
    join public.cases on cases.id = public_notices.case_id
    where public_notices.decided_at is not null and public_notices.decision_emailed_at is null
      and public_notices.notifier_email is not null and public.may_see_case(cases.is_safeguarding)) end;
$$;

comment on function public.admin_waiting_decision_email_count() is
  'Staff: how many decision emails wait to be sent (S1-E10-04).';
revoke execute on function public.admin_waiting_decision_email_count() from public, anon;
grant execute on function public.admin_waiting_decision_email_count() to authenticated;
