/*
 * Migration: an upheld moderation case can restrict a story (QA-9; Robert, 8 Nov 2026, build plan
 * open questions: "A moderation case that is upheld can restrict a story").
 *
 * Until now admin_decide_case() refused "restrict" with "comes with S1-E11-08". S1-E11-08 then built
 * story restrictions (migration 20261212100002_admin2_b1_change_story.sql: the story_restrictions
 * table and is_story_restricted(); a restricted story still opens from a link but is left out of
 * every list), but only for staff working on the story's own admin page. This migration lets a case
 * about a story end in the same restriction, so a moderator doesn't have to leave the case.
 *
 * What changes (no table, column, policy or grant changes, so RLS stays; the generated types gain
 * only the new helper function):
 * 1. admin_decide_case(): "restrict" is allowed on a case about a story, and refused with a plain
 *    message on any other item, on a story that is already restricted, and on one a moderator hid
 *    or removed (restricting it would change nothing a reader sees).
 * 2. decide_case(): carrying out "restrict" adds a story_restrictions row with the case note as its
 *    reason. The statement of reasons (DSA art. 17) is sent as for every other action, with the
 *    action "restrict", which statement_action already has.
 * 3. undo_decision_for_appeal(): when an appeal overturns a "restrict" decision, the story's live
 *    restriction is lifted, as hidden and removed items are restored and sanctions lifted.
 * Who calls them: the case page's DecisionForm (src/features/moderation) through
 * admin_decide_case(), and the appeals page through admin_decide_appeal().
 * Tests: supabase/tests/database/312-case-restricts-story.test.sql (and 045-sanctions, whose
 * profile case now gets the plain refusal instead of "not built yet").
 */

/**
 * require_story_restrictable_by_case: refuses "restrict" unless the case is about a story that is
 * shown to readers and not already restricted (QA-9).
 *
 * Input: the case being decided. Returns nothing.
 * Errors: check_violation with a plain message for each refusal, so the case page can show it.
 * Who calls it: admin_decide_case(), before anything changes.
 */
create or replace function public.require_story_restrictable_by_case(target public.cases)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: only a story can be restricted; a chapter, comment or profile has no such state.
  if target.item_type <> 'story' then
    raise exception 'Only a story can be restricted.' using errcode = 'check_violation';
  end if;
  -- Step 2: a hidden or removed story is already out of sight, so restricting it changes nothing.
  if public.is_moderated_away('story', target.item_id) then
    raise exception 'This story is hidden or removed, so it can''t be restricted.' using errcode = 'check_violation';
  end if;
  -- Step 3: one live restriction at a time (the index story_restrictions_one_live_per_story).
  if public.is_story_restricted(target.item_id) then
    raise exception 'This story is already restricted.' using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.require_story_restrictable_by_case(public.cases) is
  'Refuses a case''s "restrict" unless it is about a shown story that is not restricted yet (QA-9).';

-- Only the deciding function calls it; nobody calls it directly.
revoke all on function public.require_story_restrictable_by_case(public.cases) from public, anon, authenticated;

/**
 * admin_decide_case: a moderator decides an open case; the action is carried out, the statement of
 * reasons sent and the reporters told (S1-E10-03a, 06, 08, 04; restrict on a story from QA-9).
 *
 * Inputs: the case, the action, the staff note (required), the suspension length for "suspend",
 * and the message to the person (the plain-words facts in the statement of reasons).
 * Returns: true.
 * Errors: insufficient_privilege when the caller may not act on moderation or see this case;
 * check_violation for a missing note, a message over 4,000 characters, a decided case, a public
 * note on anything but a story or chapter, and "restrict" on anything but a shown, unrestricted
 * story.
 * Where it fits: the case page's "Send decision" calls it; decide_case() does the shared work.
 */
create or replace function public.admin_decide_case(
  target_case_id uuid,
  chosen_action public.moderation_action,
  note_text text,
  suspension_days integer default null,
  message_to_person text default null
) returns boolean
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
  -- Step 2: a note is required; a decided case stays decided; a public note goes on a story or a
  -- chapter only.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(message_to_person, '')) > 4000 then
    raise exception 'The message to the person is too long.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' then
    raise exception 'This case is already decided.' using errcode = 'check_violation';
  end if;
  if chosen_action = 'public_note' and target.item_type not in ('story', 'chapter') then
    raise exception 'A public note goes on a story or a chapter only.' using errcode = 'check_violation';
  end if;
  -- Step 3: "restrict" (QA-9) is for a story readers can still see, and not already restricted.
  if chosen_action = 'restrict' then
    perform public.require_story_restrictable_by_case(target);
  end if;
  -- Step 4: the shared steps, with the statement of reasons.
  perform public.decide_case(target, chosen_action, note_text, message_to_person, suspension_days, true);
  return true;
end;
$$;

comment on function public.admin_decide_case(uuid, public.moderation_action, text, integer, text) is
  'Moderators decide an open case; the action is carried out, the statement of reasons sent and the reporters told (S1-E10-03a, 06, 08, 04; restrict on a story from QA-9).';

/**
 * decide_case: the steps every case decision shares: the decision row, carrying the action out,
 * the statement of reasons, closing the case and its reports, and the audit row (S1-E10-03a, 04,
 * 06, 08; restrict from QA-9).
 *
 * Inputs: the case row, the action, the staff note, the message to the person, the suspension
 * length and whether to send a statement of reasons. Returns nothing.
 * Errors: whatever the action's own function raises (a sanction on staff, for example).
 * Who calls it: admin_decide_case() and the other deciding functions (picture checks, copied work).
 */
create or replace function public.decide_case(
  target public.cases,
  chosen_action public.moderation_action,
  note_text text,
  message_to_person text,
  suspension_days integer,
  send_statement boolean
) returns void
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
  -- Step 2: carry the action out (S1-E10-06, S1-E10-08, QA-9). A sanction from a case gets no
  -- statement of its own: the case's statement covers it.
  if chosen_action in ('warn', 'suspend', 'ban') then
    sanction_id := public.admin_apply_sanction(target.user_id,
      case chosen_action when 'warn' then 'warning' when 'suspend' then 'suspension' else 'ban' end::public.sanction_kind,
      suspension_days, target.id, note_text, null);
  elsif chosen_action in ('hide', 'remove') then
    perform public.moderate_item(target.item_type, target.item_id, target.user_id,
      case chosen_action when 'hide' then 'hidden' else 'removed' end::public.moderated_state, target.id, note_text);
  elsif chosen_action = 'restrict' then
    -- A restricted story still opens from a link but leaves every list (S1-E11-08); the case
    -- note is the reason staff see on the story's admin page (the column allows 1,000 characters).
    insert into public.story_restrictions (user_id, story_id, restricted_by_user_id, reason)
    values (target.user_id, target.item_id, (select auth.uid()), left(btrim(note_text), 1000));
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

/**
 * undo_decision_for_appeal: undoes what a case decided when an appeal overturns it (S1-E10-07;
 * contests S1-E11-15; restrict from QA-9).
 *
 * Inputs: the statement of reasons the appeal was about, and the appeal's reference for the
 * reason text. Returns nothing.
 * Errors: whatever the restore or lift functions raise.
 * Who calls it: admin_decide_appeal(), when the outcome is "overturned".
 */
create or replace function public.undo_decision_for_appeal(
  statement public.statements_of_reasons,
  appeal_reference text
) returns void
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
  -- Step 4: a disqualified contest entry is valid again (S1-E11-15).
  update public.contest_entries
  set status = 'valid', disqualified_at = null, disqualified_by_user_id = null
  where contest_entries.statement_id = statement.id and contest_entries.status = 'disqualified';
  -- Step 5: a story the case restricted shows in lists again (QA-9). A story has at most one live
  -- restriction, so the story's live one is the case's.
  if statement.action = 'restrict' then
    update public.story_restrictions
    set lifted_at = now(), lifted_by_user_id = (select auth.uid())
    where story_restrictions.story_id = (select cases.item_id from public.cases
                                         where cases.id = statement.case_id and cases.item_type = 'story')
      and story_restrictions.lifted_at is null;
  end if;
end;
$$;
