/**
 * Migration: handing a space over to one of its moderators (bundle 14d IDEAS-3, part e; idea
 * IDEA-20261102-7). Robert decided on 4 Nov 2026 at 12:53 that a space's owner may change, but
 * only through a hand-over the new owner accepts.
 *
 * How it works:
 * 1. The owner offers the space to one of its moderators (offer_space_handover()). The moderator
 *    must be an active moderator in the space's age group (S1-E8-06: only under-16 accounts run an
 *    under-16 space, only 16+ accounts a 16+ one); a class space also needs a teacher badge
 *    (S1-E2-11), because a class is always run by a teacher. The offer is kept on the space
 *    (handover_to_user_id, handover_offered_at), the moderator gets a notification, and the log
 *    says "offered the space to".
 * 2. The owner may take the offer back (cancel_space_handover()); the moderator may decline it or
 *    accept it (answer_space_handover()). Each step is in the space's log (criterion 2: who handed
 *    over to whom, and when).
 * 3. On accepting, the moderator becomes the owner and the old owner becomes a moderator with
 *    every power (criterion 1).
 *
 * The owner column (architecture 1.6): spaces.user_id was protected by refuse_user_id_change().
 * It is now protected by refuse_space_owner_change(), which refuses every change except the one
 * answer_space_handover() makes while it accepts an offer: it sets a transaction-local flag naming
 * the space, and the new owner must be the person the offer was for. No other path can change it.
 *
 * No new table and no new policy: the two columns sit on spaces, whose policies are unchanged.
 * Called by: src/features/spaces/api/spaceHandover.ts.
 */

/* ---------- 1. The offer, kept on the space ---------- */

alter table public.spaces add column handover_to_user_id uuid references public.profiles (id) on delete set null;
alter table public.spaces add column handover_offered_at timestamptz;
comment on column public.spaces.handover_to_user_id is
  'The moderator the owner offered the space to, while the offer is open; null for none (IDEA-20261102-7).';
comment on column public.spaces.handover_offered_at is
  'When the owner made the open offer; null for none (IDEA-20261102-7).';

/**
 * refuse_space_owner_change: the owner column guard for spaces. As refuse_user_id_change('user_id')
 *   (architecture 1.6: owner columns never change), with one exception: an accepted hand-over.
 * Allowed only when answer_space_handover() set the transaction-local flag 'app.space_handover' to
 *   this space's ID, and the new owner is the moderator the open offer was for.
 * Errors: check_violation for any other change of user_id.
 * Where it fits: the BEFORE UPDATE trigger on spaces.
 */
create or replace function public.refuse_space_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Step 1: nothing to check while the owner stays the same.
  if new.user_id is not distinct from old.user_id then
    return new;
  end if;
  -- Step 2: the one exception: the hand-over being accepted, to the person it was offered to.
  if current_setting('app.space_handover', true) = old.id::text
     and old.handover_to_user_id is not null and new.user_id = old.handover_to_user_id then
    return new;
  end if;
  raise exception 'The owner of a space changes only through a hand-over the new owner accepts (architecture 1.6; IDEA-20261102-7).'
    using errcode = 'check_violation';
end;
$$;
comment on function public.refuse_space_owner_change() is
  'Trigger: refuses any change to spaces.user_id except an accepted hand-over (IDEAS-3e).';
revoke execute on function public.refuse_space_owner_change() from public, anon, authenticated;

drop trigger spaces_refuse_user_id_change on public.spaces;
create trigger spaces_refuse_owner_change
  before update on public.spaces
  for each row execute function public.refuse_space_owner_change();

/* ---------- 2. Who may take a space over ---------- */

/**
 * space_handover_refusal: why a person may not take a space over, or null when they may.
 * Inputs: the space; the person. Returns: 'not_moderator' (not an active moderator of it), 'age'
 *   (outside its age group) or 'not_teacher' (a class space, and no teacher badge); null when
 *   they may.
 * Internal: offer_space_handover(), answer_space_handover() and space_handover_json().
 */
create or replace function public.space_handover_refusal(target public.spaces, person_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.space_members
                     where space_members.space_id = target.id and space_members.user_id = person_id
                       and space_members.role = 'moderator' and space_members.status = 'active')
      then 'not_moderator'
    -- S1-E8-06: only under-16 accounts run an under-16 space, only 16+ accounts a 16+ one.
    when public.space_age_group_of_person(person_id) is distinct from target.age_group then 'age'
    -- S1-E2-11: a class is run by a teacher with the badge.
    when target.kind = 'class'
         and (select profiles.teacher_badge_since from public.profiles where profiles.id = person_id) is null
      then 'not_teacher'
  end;
$$;
comment on function public.space_handover_refusal(public.spaces, uuid) is
  'Internal: why a person may not take a space over, or null (IDEAS-3e).';
revoke execute on function public.space_handover_refusal(public.spaces, uuid) from public, anon, authenticated;

/**
 * space_handover_json: the open offer, for the two people it concerns.
 * Input: the space. Returns: {"to" (forum_person_json() of the moderator), "from" (the owner),
 *   "offered_at", "is_for_me"} for the owner and for the moderator the offer is for, while that
 *   moderator may still take the space over; null for everyone else and when there is none.
 * Internal: space_viewer_json().
 */
create or replace function public.space_handover_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target.handover_to_user_id is not null
         and (select auth.uid()) in (target.user_id, target.handover_to_user_id)
         and public.space_handover_refusal(target, target.handover_to_user_id) is null
    then jsonb_build_object('to', public.forum_person_json(target.handover_to_user_id),
                            'from', public.forum_person_json(target.user_id),
                            'offered_at', target.handover_offered_at,
                            'is_for_me', target.handover_to_user_id = (select auth.uid()))
  end;
$$;
comment on function public.space_handover_json(public.spaces) is
  'Internal: a space''s open hand-over offer, for the owner and the moderator it is for (IDEAS-3e).';
revoke execute on function public.space_handover_json(public.spaces) from public, anon, authenticated;

/* ---------- 3. Offering, taking back and answering ---------- */

/**
 * offer_space_handover: the owner offers the space to one of its moderators ("Hand over").
 * Inputs: slug; handle, the moderator's username.
 * Returns: {"offered_to"}: forum_person_json() of the moderator.
 * Rules: only the owner; the moderator must be able to take it over (space_handover_refusal()).
 *   A new offer replaces an open one. The moderator gets a notification; the log says who offered
 *   it to whom (criterion 2).
 * Errors: owned_space_for_change()'s; no_data_found (hint 'member:missing') for an unknown
 *   handle; check_violation (hint 'handover:not_moderator', 'handover:age' or
 *   'handover:not_teacher').
 */
create or replace function public.offer_space_handover(slug text, handle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(offer_space_handover.slug);
  member public.space_members := public.space_member_by_handle(space.id, offer_space_handover.handle);
  refusal text;
begin
  -- Step 1: someone in the space.
  if member.id is null then
    raise exception 'That person isn''t a member of this space.' using errcode = 'no_data_found', hint = 'member:missing';
  end if;
  -- Step 2: a moderator who may run it (age group, and a teacher for a class).
  refusal := public.space_handover_refusal(space, member.user_id);
  if refusal is not null then
    raise exception 'This person can''t take the space over.' using errcode = 'check_violation', hint = 'handover:' || refusal;
  end if;
  -- Step 3: the offer, the log and the notification.
  update public.spaces set handover_to_user_id = member.user_id, handover_offered_at = now()
  where spaces.id = space.id;
  perform public.log_space_action(space, 'handover_offered', member.user_id, null, null, '{}'::jsonb);
  perform public.notify(member.user_id, 'space_handover_offered', (select auth.uid()),
    jsonb_build_object('space_id', space.id));
  return jsonb_build_object('offered_to', public.forum_person_json(member.user_id));
end;
$$;
comment on function public.offer_space_handover(text, text) is
  'The owner offers a space to one of its moderators; logged and notified (IDEA-20261102-7).';
revoke execute on function public.offer_space_handover(text, text) from public, anon;
grant execute on function public.offer_space_handover(text, text) to authenticated;

/**
 * cancel_space_handover: the owner takes an open offer back.
 * Input: slug. Returns: {"cancelled": true}, or false when there was no open offer.
 * Errors: owned_space_for_change()'s.
 */
create or replace function public.cancel_space_handover(slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.owned_space_for_change(cancel_space_handover.slug);
begin
  if space.handover_to_user_id is null then
    return jsonb_build_object('cancelled', false);
  end if;
  update public.spaces set handover_to_user_id = null, handover_offered_at = null where spaces.id = space.id;
  perform public.log_space_action(space, 'handover_cancelled', space.handover_to_user_id, null, null, '{}'::jsonb);
  return jsonb_build_object('cancelled', true);
end;
$$;
comment on function public.cancel_space_handover(text) is
  'The owner takes back an offer to hand a space over; logged (IDEA-20261102-7).';
revoke execute on function public.cancel_space_handover(text) from public, anon;
grant execute on function public.cancel_space_handover(text) to authenticated;

/**
 * space_for_handover_answer: the space an offer to the caller is about, locked for the answer.
 * Input: slug. Returns: the row.
 * Errors: no_data_found (hint 'handover:missing') when there is no open offer to the caller, or
 *   check_violation (hint 'handover:<reason>') when they may no longer take it over.
 * Internal: answer_space_handover().
 */
create or replace function public.space_for_handover_answer(target_slug text)
returns public.spaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces;
  refusal text;
begin
  select * into space from public.spaces
  where spaces.slug = target_slug and spaces.deleted_at is null
  for update;
  if space.id is null or space.handover_to_user_id is distinct from (select auth.uid()) then
    raise exception 'There is no offer to hand this space over to you.' using errcode = 'no_data_found', hint = 'handover:missing';
  end if;
  refusal := public.space_handover_refusal(space, (select auth.uid()));
  if refusal is not null then
    raise exception 'You can''t take this space over.' using errcode = 'check_violation', hint = 'handover:' || refusal;
  end if;
  return space;
end;
$$;
comment on function public.space_for_handover_answer(text) is
  'Internal: a space with an open hand-over offer to the caller, locked (IDEAS-3e).';
revoke execute on function public.space_for_handover_answer(text) from public, anon, authenticated;

/**
 * answer_space_handover: the moderator the space was offered to accepts or declines.
 * Inputs: slug; accept, true to take the space over.
 * Returns: {"outcome"}: 'accepted' or 'declined'.
 * On accepting (criterion 1): the caller becomes the owner and the old owner a moderator with
 *   every power; the log says who handed over to whom (criterion 2). Declining clears the offer
 *   and is logged too.
 * Errors: space_for_handover_answer()'s; insufficient_privilege (hint 'signed_out' or
 *   'not_active') through require_space_starter() for an account that may not act.
 */
create or replace function public.answer_space_handover(slug text, accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  space public.spaces := public.space_for_handover_answer(answer_space_handover.slug);
  every_power constant public.space_power[] := enum_range(null::public.space_power);
begin
  -- Step 1: declining clears the offer and says so in the log.
  if not coalesce(accept, false) then
    update public.spaces set handover_to_user_id = null, handover_offered_at = null where spaces.id = space.id;
    perform public.log_space_action(space, 'handover_declined', space.user_id, null, null, '{}'::jsonb);
    return jsonb_build_object('outcome', 'declined');
  end if;
  -- Step 2: the old owner becomes a moderator with every power, then the caller the owner.
  update public.space_members set role = 'moderator', powers = every_power
  where space_members.space_id = space.id and space_members.user_id = space.user_id;
  update public.space_members set role = 'owner', powers = '{}'
  where space_members.space_id = space.id and space_members.user_id = caller_id;
  -- Step 3: the owner column, through the one exception refuse_space_owner_change() allows.
  perform set_config('app.space_handover', space.id::text, true);
  update public.spaces set user_id = caller_id, handover_to_user_id = null, handover_offered_at = null
  where spaces.id = space.id;
  perform set_config('app.space_handover', '', true);
  -- Step 4: the log: the new owner accepted the space from the old one (criterion 2).
  perform public.log_space_action(space, 'handover_accepted', space.user_id, null, null,
    jsonb_build_object('previous_owner_powers', to_jsonb(every_power)));
  return jsonb_build_object('outcome', 'accepted');
end;
$$;
comment on function public.answer_space_handover(text, boolean) is
  'The moderator a space was offered to accepts (becoming its owner) or declines; logged (IDEA-20261102-7).';
revoke execute on function public.answer_space_handover(text, boolean) from public, anon;
grant execute on function public.answer_space_handover(text, boolean) to authenticated;

/* ---------- 4. What the screens get ---------- */

/** space_viewer_json: as in IDEAS-3d, plus "can_hand_over" and the open "handover" (IDEAS-3e). */
create or replace function public.space_viewer_json(target public.spaces)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'membership', case
      when membership.role = 'owner' then 'owner'
      when membership.role = 'moderator' then 'moderator'
      when membership.status = 'active' then 'member'
      when membership.status = 'pending' then 'pending' end,
    'can_read', public.space_may_read(target),
    'can_join', public.space_may_join(target),
    'can_post', public.space_may_post(target),
    'can_manage', public.space_may_act(target, 'settings'),
    'can_appoint', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'act'),
    'can_read_log', target.user_id = (select auth.uid()) or public.staff_may('moderation', 'view'),
    'can_invite', target.kind = 'class' and public.space_may_act(target, 'members'),
    'waits_for_account', public.space_is_in_class(target) and not public.space_may_read(target),
    'powers', to_jsonb(public.space_powers_of_caller(target)),
    -- IDEAS-3d: the welcome note, for members and the people who run the space only.
    'welcome_note', case when membership.status = 'active' or public.space_may_act(target, 'settings')
                         then target.welcome_note end,
    'show_welcome', coalesce(target.welcome_note is not null and membership.status = 'active'
                             and membership.role <> 'owner' and membership.welcome_seen_at is null, false),
    -- IDEAS-3e: the owner may offer the space to a moderator; an open offer is shown to the owner
    -- and to the moderator it is for, never to anyone else.
    'can_hand_over', target.user_id = (select auth.uid()),
    'handover', public.space_handover_json(target))
  from (select (public.space_membership_of_caller(target.id)).*) as membership;
$$;


/* ---------- 5. The notification ---------- */

/** notification_category: as in IDEAS-3a, plus space_handover_offered under follows. */
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
    when 'space_handover_offered' then 'follows'
    else 'replies'
  end;
$$;
