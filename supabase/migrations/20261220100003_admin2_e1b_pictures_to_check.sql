/*
 * Migration: Moderation › Pictures to check (bundle ADMIN-2, part e1b; Robert's brief of 2 Nov
 * 2026, 08:39, kept in /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md,
 * sections 2 and 3).
 *
 * What changes:
 * - Who waits for a person (section 2, Robert 08:41, 08:48 and 08:50): every picture in a story
 *   rated All ages or 13+, whoever uploaded it, and every picture uploaded by someone under 16.
 *   Once Arachnid Shield passes such a picture it is "held" instead of "passed", and a
 *   picture_review case opens: nobody but the uploader and staff sees it until a moderator
 *   approves it. Adults' pictures in 16+ and 18+ stories still go live once the check passes.
 * - Lowering a story's rating to All ages or 13+ sends its visible pictures back to a moderator,
 *   because they were only allowed under the higher rating.
 * - The review page's three buttons (section 3):
 *     admin_approve_picture()  green, Approve; or yellow, Approve and raise the rating (through
 *                              admin_raise_story_rating(), which sends the writer a statement of
 *                              reasons; only up, never down)
 *     admin_reject_picture()   red, Reject: a reason from the admin-editable list
 *                              picture_reject_reasons, the picture removed, and the uploader's
 *                              statement of reasons, notification and email (DSA art. 17)
 *   Both decide the picture's case through decide_case(), so the audit log, the notifications
 *   and appeals work as for any other case.
 * - admin_pictures_to_check(): the page's list.
 * Who calls it: record_picture_check() (from server/picture-check.ts), the stories rating trigger
 * and src/features/moderation/ (PicturesToCheckPage). Tests:
 * supabase/tests/database/248-pictures-to-check.test.sql.
 * Not here yet: the suspected child abuse steps and the picture review permission (part e2).
 */

/* ---------- The reasons a moderator can give for rejecting a picture ---------- */

insert into public.settings (key, value, is_public, description) values
  ('picture_reject_reasons',
   '["photograph", "photographic_sexual_image", "real_person", "celebrity", "sexual_image_of_minor", "gore", "hate", "other"]'::jsonb,
   false,
   'What a rejected picture showed: the choices on Moderation › Pictures to check (Robert, 2 Nov 2026, 08:21). Labels are interface text (moderation.pictures.reasons).');

/* ---------- Who waits for a person ---------- */

/**
 * picture_needs_person: must a moderator approve this picture before anyone else sees it?
 * Input: the picture. Returns: true for a picture in a story rated All ages or 13+, and for any
 *   picture uploaded by someone under 16 (brief section 2, Robert 08:41 and 08:50).
 * Internal: record_picture_check(), admin_pictures_to_check().
 */
create or replace function public.picture_needs_person(picture public.picture_checks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.age_band_of(picture.user_id) in ('under_13', '13_to_15')
    or exists (select 1 from public.stories
               where stories.id = picture.story_id and stories.rating in ('all_ages', '13_plus'));
$$;

comment on function public.picture_needs_person(public.picture_checks) is
  'Internal: true when a moderator must approve the picture first: All ages or 13+ stories, and uploaders under 16 (ADMIN-2e1b).';
revoke execute on function public.picture_needs_person(public.picture_checks) from public, anon, authenticated;

/**
 * open_picture_review_case: opens the case for a picture waiting for a moderator. It waits two
 * days like other non-urgent pictures (S1-E10-03 tiers) and is never a safeguarding case.
 * Input: the held picture. Returns: the case's ID. Internal: record_picture_check() and
 * send_story_pictures_to_review().
 */
create or replace function public.open_picture_review_case(picture public.picture_checks)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_case_id uuid;
begin
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  values ('P-' || lpad(nextval('public.picture_case_reference_seq')::text, 6, '0'), picture.user_id,
          'picture', picture.id, 'picture_review', 'two_days',
          now() + make_interval(hours => public.tier_hours('two_days')), false)
  returning id into new_case_id;
  return new_case_id;
end;
$$;

comment on function public.open_picture_review_case(public.picture_checks) is
  'Internal: opens the picture_review case for a picture a moderator must approve first (ADMIN-2e1b).';
revoke execute on function public.open_picture_review_case(public.picture_checks) from public, anon, authenticated;

/**
 * record_picture_check: as in S1-E10-05, with one change (ADMIN-2e1b): a picture the services
 *   passed but that a moderator must approve first (picture_needs_person) is held, with a
 *   picture_review case, instead of passed.
 * Inputs: payload (JSON text: {"pictureId", "outcome": "passed" | "flagged" | "unavailable",
 *   "provider", "flags", "isKnownAbuseMatch"}) and signature (hex HMAC-SHA256 of the payload with
 *   PICTURE_CHECK_SECRET).
 * Returns: the picture's status after the answer.
 * Errors: insufficient_privilege for a wrong signature, or a caller who is neither the uploader
 *   nor moderation staff; no_data_found for an unknown picture.
 * Where it fits: server/picture-check.ts calls it with the caller's own sign-in.
 */
create or replace function public.record_picture_check(payload text, signature text)
returns public.picture_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer jsonb;
  picture public.picture_checks;
  is_match boolean;
  is_passed boolean;
begin
  -- Step 1: only a result our server signed, about a picture the caller may check.
  if not public.picture_check_is_signed(payload, signature) then
    raise exception 'This result didn''t come from the picture check.' using errcode = 'insufficient_privilege';
  end if;
  answer := payload::jsonb;
  select * into picture from public.picture_checks where id = (answer ->> 'pictureId')::uuid for update;
  if picture.id is null then
    raise exception 'There is no such picture.' using errcode = 'no_data_found';
  end if;
  if picture.user_id <> (select auth.uid()) and not public.staff_may('moderation', 'act') then
    raise exception 'You can''t check this picture.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: only a pending picture moves on; a service that didn't answer leaves it pending.
  if picture.status <> 'pending' then
    return picture.status;
  end if;
  if answer ->> 'outcome' = 'unavailable' then
    update public.picture_checks set attempts = attempts + 1 where id = picture.id;
    return 'pending';
  end if;
  -- Step 3: passed and allowed to go live shows it; anything else is held for a person.
  is_match := coalesce((answer ->> 'isKnownAbuseMatch')::boolean, false);
  is_passed := answer ->> 'outcome' = 'passed';
  update public.picture_checks set
    status = case when is_passed and not public.picture_needs_person(picture) then 'passed' else 'held' end::public.picture_status,
    flags = coalesce(answer -> 'flags', '{}'::jsonb),
    provider = left(answer ->> 'provider', 40),
    attempts = attempts + 1,
    checked_at = now(),
    preserve_until = case when is_match then now() + interval '6 months' end
  where id = picture.id
  returning * into picture;
  -- Step 4: show it, or open the case: a flag is a picture_check case, a rule a picture_review one.
  if picture.status = 'passed' then
    perform public.show_passed_avatar(picture);
  elsif is_passed then
    update public.picture_checks set case_id = public.open_picture_review_case(picture) where id = picture.id;
  else
    update public.picture_checks set case_id = public.open_picture_case(picture, is_match) where id = picture.id;
  end if;
  return picture.status;
end;
$$;

comment on function public.record_picture_check(text, text) is
  'Saves the signed picture check result: passed shows it unless a moderator must approve it first; flagged holds it and opens a case (S1-E10-05, ADMIN-2e1b).';

/* ---------- A lower rating sends pictures back to a moderator ---------- */

/**
 * send_story_pictures_to_review: when a story's rating goes down to All ages or 13+, every
 * picture of it that is live (passed or approved under the higher rating) is held again with a
 * picture_review case, so a moderator checks it fits the new rating (brief section 2).
 * Trigger: after update of rating on stories.
 */
create or replace function public.send_story_pictures_to_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  picture public.picture_checks;
begin
  if new.rating >= old.rating or new.rating not in ('all_ages', '13_plus') then
    return null;
  end if;
  for picture in
    update public.picture_checks set status = 'held'
    where picture_checks.story_id = new.id and picture_checks.status in ('passed', 'approved')
      and picture_checks.deleted_at is null
    returning *
  loop
    update public.picture_checks set case_id = public.open_picture_review_case(picture) where id = picture.id;
  end loop;
  return null;
end;
$$;

comment on function public.send_story_pictures_to_review() is
  'Trigger: lowering a story to All ages or 13+ holds its live pictures for a moderator again (ADMIN-2e1b).';
revoke execute on function public.send_story_pictures_to_review() from public, anon, authenticated;

create trigger stories_send_pictures_to_review
  after update of rating on public.stories
  for each row execute function public.send_story_pictures_to_review();

/* ---------- The statement's rule for a picture held by the rules ---------- */

/**
 * statement_ground_for_case: as in S1-E10-04, plus a picture_review case rests on the picture
 * rules (ground_key picture_check) like a picture the check flagged.
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
      when target.source in ('picture_check', 'picture_review') then 'picture_check'
      else coalesce(target.top_reason::text, 'community_rules')
    end;
$$;

/* ---------- The review page ---------- */

/**
 * picture_review_case: the open, non-safeguarding picture case a review button acts on, locked.
 * Input: target_case_id. Returns: the case.
 * Errors: insufficient_privilege unless the caller may act on moderation; check_violation when the
 *   case isn't an open picture case, or is a safeguarding case (those go through S1-E10-10).
 * Internal: admin_approve_picture(), admin_reject_picture().
 */
create or replace function public.picture_review_case(target_case_id uuid)
returns public.cases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team can check pictures.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.cases where cases.id = target_case_id for update;
  if target.id is null or target.item_type <> 'picture' or target.status <> 'open' or target.is_safeguarding then
    raise exception 'This isn''t a picture waiting for a decision.' using errcode = 'check_violation';
  end if;
  return target;
end;
$$;

comment on function public.picture_review_case(uuid) is
  'Internal: the open, non-safeguarding picture case a review button acts on (ADMIN-2e1b).';
revoke execute on function public.picture_review_case(uuid) from public, anon, authenticated;

/**
 * admin_pictures_to_check: the pictures waiting for a moderator, oldest first.
 * Returns: one JSON object per picture: caseId, pictureId, kind, bucket, path, uploaderHandle,
 *   uploaderAgeBand (the age group only, never the year of birth), uploaderLocale, story
 *   ({id, title, slug, rating} or null), ownerAgeBand (the story owner's age group, which limits
 *   the yellow button), waitingSince and source (picture_review or picture_check).
 * Errors: insufficient_privilege unless the caller may act on moderation.
 * Safeguarding cases are left out: they are handled with the safeguarding permission (S1-E10-10).
 * Where it fits: PicturesToCheckPage (src/features/moderation/).
 */
create or replace function public.admin_pictures_to_check()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team can check pictures.' using errcode = 'insufficient_privilege';
  end if;
  return query
    select jsonb_build_object(
      'caseId', cases.id, 'pictureId', picture.id, 'kind', picture.kind, 'bucket', picture.bucket,
      'path', picture.path, 'uploaderHandle', uploader.handle,
      'uploaderAgeBand', public.age_band_of(picture.user_id), 'uploaderLocale', uploader.locale,
      'story', case when story.id is null then null else jsonb_build_object(
        'id', story.id, 'title', story.title, 'slug', story.slug, 'rating', story.rating) end,
      'ownerAgeBand', case when story.id is null then null else public.age_band_of(story.user_id) end,
      'waitingSince', cases.created_at, 'source', cases.source)
    from public.cases
    join public.picture_checks as picture on picture.id = cases.item_id
    join public.profiles as uploader on uploader.id = picture.user_id
    left join public.stories as story on story.id = picture.story_id
    where cases.item_type = 'picture' and cases.status = 'open' and not cases.is_safeguarding
      and cases.source in ('picture_review', 'picture_check') and picture.status = 'held'
    order by cases.created_at;
end;
$$;

comment on function public.admin_pictures_to_check() is
  'Staff: the pictures waiting for a moderator, oldest first, without safeguarding cases (ADMIN-2e1b).';
revoke execute on function public.admin_pictures_to_check() from public, anon;
grant execute on function public.admin_pictures_to_check() to authenticated;

/**
 * raise_rating_for_picture: the yellow button's rating step. Raises the picture's story to
 * new_rating through admin_raise_story_rating() (statement of reasons, audit), unless the story
 * is already at or above it.
 * Inputs: the picture, new_rating (16_plus or 18_plus), reason_given.
 * Errors: check_violation for a picture outside a story, any other rating, or 18+ for a picture
 *   uploaded by someone under 18 (builder's proposal, brief section 2: such a picture is red).
 *   A story owned by someone under 16 can't go above 13+ (stories_rating_fits_writer).
 * Internal: admin_approve_picture().
 */
create or replace function public.raise_rating_for_picture(
  picture public.picture_checks,
  new_rating public.story_rating,
  reason_given text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_rating public.story_rating;
begin
  select stories.rating into current_rating from public.stories where stories.id = picture.story_id;
  if current_rating is null or new_rating not in ('16_plus', '18_plus') then
    raise exception 'Only a picture in a story can raise its rating, to 16+ or 18+.' using errcode = 'check_violation';
  end if;
  if new_rating = '18_plus' and public.age_band_of(picture.user_id) <> '18_plus' then
    raise exception 'A picture from someone under 18 can''t make a story 18+.' using errcode = 'check_violation',
      hint = 'uploader_under_18';
  end if;
  if new_rating > current_rating then
    perform public.admin_raise_story_rating(picture.story_id, new_rating, reason_given);
  end if;
end;
$$;

comment on function public.raise_rating_for_picture(public.picture_checks, public.story_rating, text) is
  'Internal: the yellow button raises the picture''s story to 16+ or 18+, never down (ADMIN-2e1b).';
revoke execute on function public.raise_rating_for_picture(public.picture_checks, public.story_rating, text)
  from public, anon, authenticated;

/**
 * admin_approve_picture: green (Approve) or yellow (Approve and raise the rating).
 * Inputs: target_case_id; note_text (the staff note, required); new_rating (null for green;
 *   16_plus or 18_plus for yellow).
 * Returns: true. The picture shows at once wherever it was used (apply_picture_decision()).
 * Errors: as picture_review_case() and raise_rating_for_picture(); check_violation for a blank note.
 * Where it fits: PicturesToCheckPage.
 */
create or replace function public.admin_approve_picture(
  target_case_id uuid,
  note_text text,
  new_rating public.story_rating default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.picture_review_case(target_case_id);
  picture public.picture_checks;
begin
  -- Step 1: a note, and the picture the case is about.
  if btrim(coalesce(note_text, '')) = '' then
    raise exception 'Write a note with the decision.' using errcode = 'check_violation';
  end if;
  select * into picture from public.picture_checks where picture_checks.id = target.item_id;
  -- Step 2: yellow raises the story first (its own statement of reasons and audit row).
  if new_rating is not null then
    perform public.raise_rating_for_picture(picture, new_rating, note_text);
  end if;
  -- Step 3: no action on the case approves the picture; decide_case() writes the audit row.
  perform public.decide_case(target, 'no_action', note_text, null, null, false);
  return true;
end;
$$;

comment on function public.admin_approve_picture(uuid, text, public.story_rating) is
  'Staff: approves a waiting picture, optionally raising its story to 16+ or 18+ first (ADMIN-2e1b).';
revoke execute on function public.admin_approve_picture(uuid, text, public.story_rating) from public, anon;
grant execute on function public.admin_approve_picture(uuid, text, public.story_rating) to authenticated;

/**
 * admin_reject_picture: red (Reject). The picture is removed and the uploader gets a statement of
 *   reasons (DSA art. 17) with its notification and email, which they can appeal (S1-E10-07).
 * Inputs: target_case_id; reason_key (one of the picture_reject_reasons setting); message_to_person
 *   (the admin-editable template, in the uploader's language, required); note_text (staff only,
 *   required).
 * Returns: true.
 * Errors: as picture_review_case(); check_violation for an unknown reason or a blank message or note.
 * Rules: "Sexual image of a minor" rests on the law (Criminal Code art. 374); every other reason on
 *   the community guidelines' picture rules. Part e2 adds the evidence steps for the first.
 * Where it fits: PicturesToCheckPage.
 */
create or replace function public.admin_reject_picture(
  target_case_id uuid,
  reason_key text,
  message_to_person text,
  note_text text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.picture_review_case(target_case_id);
  is_minor boolean := reason_key = 'sexual_image_of_minor';
begin
  -- Step 1: a known reason, a message for the person and a note for staff.
  if not exists (select 1 from public.settings, jsonb_array_elements_text(settings.value) as allowed(reason)
                 where settings.key = 'picture_reject_reasons' and allowed.reason = reason_key) then
    raise exception 'Choose what the picture shows.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(message_to_person, '')) = '' or btrim(coalesce(note_text, '')) = ''
     or char_length(message_to_person) > 4000 then
    raise exception 'Write the message and the note.' using errcode = 'check_violation';
  end if;
  -- Step 2: the statement first, so the case's notification links it when the case is decided.
  perform public.issue_statement_of_reasons(target.user_id, 'remove',
    case when is_minor then 'law' else 'terms' end::public.statement_ground,
    case when is_minor then 'child_sexual_content' else 'picture_check' end, message_to_person,
    jsonb_build_object('case_id', target.id, 'item_type', 'picture', 'item_id', target.item_id,
      'automated_detection', target.source = 'picture_check'));
  -- Step 3: remove it through the case (moderate_item, the decision trigger, notifications, audit).
  perform public.decide_case(target, 'remove', note_text, message_to_person, null, false);
  perform public.log_staff_action('picture.rejected', 'picture_checks', target.item_id::text, target.user_id,
    note_text, jsonb_build_object('status', 'held'), jsonb_build_object('status', 'removed', 'reason', reason_key));
  return true;
end;
$$;

comment on function public.admin_reject_picture(uuid, text, text, text) is
  'Staff: rejects a waiting picture with a reason; removed, with a statement of reasons to the uploader (ADMIN-2e1b).';
revoke execute on function public.admin_reject_picture(uuid, text, text, text) from public, anon;
grant execute on function public.admin_reject_picture(uuid, text, text, text) to authenticated;

/**
 * admin_picture_reject_reasons: the reasons a moderator can give for rejecting a picture, from the
 * picture_reject_reasons setting (admin-editable on Staff › Settings).
 * Returns: a JSON array of reason keys. Errors: insufficient_privilege unless the caller may act
 * on moderation. Where it fits: the Reject form on PicturesToCheckPage.
 */
create or replace function public.admin_picture_reject_reasons()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only the moderation team can check pictures.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select settings.value from public.settings where settings.key = 'picture_reject_reasons'),
                  '[]'::jsonb);
end;
$$;

comment on function public.admin_picture_reject_reasons() is
  'Staff: the reasons a moderator can give for rejecting a picture (ADMIN-2e1b).';
revoke execute on function public.admin_picture_reject_reasons() from public, anon;
grant execute on function public.admin_picture_reject_reasons() to authenticated;
