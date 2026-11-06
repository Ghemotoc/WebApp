-- Migration: an appeal decided by the moderator who made the original decision is marked and
-- flagged for the owner to review (QA-7, finding M1; CTO decision, 6 Nov 2026, under Robert's
-- standing go-ahead of 5 Nov 2026, 21:10; lawyer to confirm against DSA art. 20).
--
-- Why: S1-E10-07 sends an appeal to a different moderator "where possible". When nobody else may
-- decide appeals (a team of one or two), the original decider decides it too. That suits a small
-- team and stays, but DSA art. 20(6) expects appeals decided "under the supervision of
-- appropriately qualified staff", so each such appeal is now recorded as such, said in the audit
-- log, and shown to the owner until they have reviewed it. The appeals page says so too.
--
-- What it changes:
--   appeals.decided_by_original_decider   true when the same person decided both
--   appeals.owner_reviewed_at, appeals.owner_reviewed_by_user_id   the owner's review
--   admin_decide_appeal()                 sets the mark and logs same_decider in the audit row
--   admin_appeals_queue()                 adds decided_by_original_decider, needs_owner_review
--                                         and may_mark_reviewed
--   admin_mark_appeal_reviewed()          the owner marks one such appeal reviewed (logged)
-- Who calls them: the staff Appeals page (src/features/moderation).

/* ---------- Step 1: the columns ---------- */

alter table public.appeals
  add column decided_by_original_decider boolean not null default false,
  add column owner_reviewed_at timestamptz,
  add column owner_reviewed_by_user_id uuid references public.profiles (id),
  -- A review only of an appeal that needs one, and the reviewer and the time go together.
  add constraint appeals_owner_review_fields_go_together check (
    (owner_reviewed_at is null) = (owner_reviewed_by_user_id is null)
    and (owner_reviewed_at is null or decided_by_original_decider)
  );

comment on column public.appeals.decided_by_original_decider is
  'True when the moderator who made the original decision also decided the appeal, because nobody else could; the owner reviews it (QA-7; DSA art. 20(6)).';
comment on column public.appeals.owner_reviewed_at is
  'When the owner reviewed an appeal decided by the original decider (QA-7).';
comment on column public.appeals.owner_reviewed_by_user_id is
  'The owner who reviewed it; staff only, never shown publicly (rule 15; QA-7).';

/* ---------- Step 2: deciding marks it ---------- */

/**
 * admin_decide_appeal: a moderator upholds or overturns an appeal (S1-E10-07; DSA art. 20).
 * Inputs: target_appeal_id; outcome ('upheld' or 'overturned'); note_text (for the team);
 *   message_to_person (what the person reads, up to 4,000 characters).
 * Returns: true.
 * Errors: insufficient_privilege (no permission, can't see the case, or the original decider
 *   while someone else could decide); check_violation (decided already, or a missing field).
 * Since QA-7: when the original decider decides it (nobody else could), the appeal is marked
 *   decided_by_original_decider and the audit row says same_decider, for the owner to review.
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
  is_same_decider boolean;
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
  -- Step 2: a different moderator where possible (criterion 2); otherwise the same one, marked.
  is_same_decider := appeal.original_decider_user_id = (select auth.uid());
  if is_same_decider and public.another_appeals_decider_exists() then
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
  -- Step 4: the appeal, the person told, the audit row (with same_decider, QA-7).
  update public.appeals set status = outcome, decided_by_user_id = (select auth.uid()), decided_at = now(),
    decision_note = btrim(note_text), message_to_person = btrim(admin_decide_appeal.message_to_person),
    decided_by_original_decider = coalesce(is_same_decider, false)
  where id = appeal.id;
  perform public.notify(appeal.user_id, 'appeal_decided', null,
    jsonb_build_object('appeal_id', appeal.id, 'statement_id', statement.id));
  perform public.log_staff_action('appeal.decided', 'appeals', appeal.id::text, appeal.user_id, btrim(note_text),
    jsonb_build_object('status', 'open'),
    jsonb_build_object('status', outcome, 'statement', statement.reference,
      'same_decider', coalesce(is_same_decider, false)));
  return true;
end;
$$;

/* ---------- Step 3: the queue shows the mark ---------- */

drop function public.admin_appeals_queue(public.appeal_status);

/**
 * admin_appeals_queue: appeals for staff, open ones oldest first, then decided ones newest first.
 * Inputs: status_filter (open, upheld, overturned; null for all).
 * Returns: one row per appeal the caller may see, with who may decide each and, since QA-7,
 *   whether the original decider decided it, whether the owner still has to review it and
 *   whether the caller (an owner) may mark it reviewed.
 * Errors: insufficient_privilege for anyone who doesn't decide appeals.
 */
create function public.admin_appeals_queue(status_filter public.appeal_status default null)
returns table (
  id uuid, reference text, status public.appeal_status, statement_reference text,
  statement_action public.statement_action, item_summary text, case_reference text,
  appellant_handle text, explanation text, created_at timestamptz, original_decider_handle text,
  may_decide boolean, decided_by_handle text, decided_at timestamptz, decision_note text,
  message_to_person text, decided_by_original_decider boolean, needs_owner_review boolean,
  may_mark_reviewed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_owner boolean;
begin
  -- Step 1: only staff who decide appeals.
  if not public.staff_may('appeals', 'act') then
    raise exception 'Only staff who decide appeals can see them.' using errcode = 'insufficient_privilege';
  end if;
  caller_is_owner := public.is_staff('owner');
  -- Step 2: the appeals the caller may see (safeguarding ones need that permission).
  return query
    select appeals.id, appeals.reference, appeals.status, statements_of_reasons.reference,
      statements_of_reasons.action, statements_of_reasons.item_summary, cases.reference,
      appellant.handle, appeals.explanation, appeals.created_at, original.handle,
      appeals.status = 'open' and (appeals.original_decider_user_id is distinct from (select auth.uid())
                                   or not public.another_appeals_decider_exists()),
      decider.handle, appeals.decided_at, appeals.decision_note, appeals.message_to_person,
      appeals.decided_by_original_decider,
      appeals.decided_by_original_decider and appeals.owner_reviewed_at is null,
      caller_is_owner and appeals.decided_by_original_decider and appeals.owner_reviewed_at is null
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
  'Appeals for staff: open ones oldest first, with who may decide each and whether the owner must review a same-moderator decision (S1-E10-07; QA-7).';
revoke execute on function public.admin_appeals_queue(public.appeal_status) from public, anon;
grant execute on function public.admin_appeals_queue(public.appeal_status) to authenticated;

/* ---------- Step 4: the owner's review ---------- */

/**
 * admin_mark_appeal_reviewed: the owner marks an appeal that the original decider decided as
 * reviewed (QA-7; DSA art. 20(6), supervision by qualified staff).
 * Inputs: target_appeal_id.
 * Returns: true.
 * Errors: insufficient_privilege unless the caller is an owner who may act on appeals and see
 *   the case; check_violation when the appeal doesn't need a review or already had one.
 * Logging: appeal.owner_reviewed, same transaction.
 */
create function public.admin_mark_appeal_reviewed(target_appeal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  appeal public.appeals;
begin
  -- Step 1: an owner who decides appeals and may see this one.
  select * into appeal from public.appeals where id = target_appeal_id for update;
  if appeal.id is null or not public.staff_may('appeals', 'act') or not public.is_staff('owner')
     or not public.may_see_case(coalesce((select cases.is_safeguarding from public.cases
       join public.statements_of_reasons on statements_of_reasons.case_id = cases.id
       where statements_of_reasons.id = appeal.statement_id), false)) then
    raise exception 'Only an owner can review this appeal.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only an appeal the original decider decided, reviewed once.
  if not appeal.decided_by_original_decider or appeal.owner_reviewed_at is not null then
    raise exception 'This appeal doesn''t need a review.' using errcode = 'check_violation';
  end if;
  -- Step 3: the review and its audit row, in the same transaction.
  update public.appeals set owner_reviewed_at = now(), owner_reviewed_by_user_id = (select auth.uid())
    where id = appeal.id;
  perform public.log_staff_action('appeal.owner_reviewed', 'appeals', appeal.id::text, appeal.user_id,
    null, jsonb_build_object('owner_reviewed', false), jsonb_build_object('owner_reviewed', true));
  return true;
end;
$$;

comment on function public.admin_mark_appeal_reviewed(uuid) is
  'The owner marks a same-moderator appeal decision as reviewed, logged (QA-7; DSA art. 20(6)).';
revoke execute on function public.admin_mark_appeal_reviewed(uuid) from public, anon;
grant execute on function public.admin_mark_appeal_reviewed(uuid) to authenticated;
