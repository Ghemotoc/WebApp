/*
 * Migration: suspected child sexual abuse images (bundle ADMIN-2, part e2b; Robert's brief of
 * 2 Nov 2026, section 4, 08:23 and 08:26).
 *
 * It applies when a picture reviewer rejects a picture as "Sexual image of a minor", or when
 * Arachnid Shield matches a picture against its list of known images. Then:
 * - the image is never kept: its file is deleted from Storage at once (the uploader's or the
 *   reviewer's own sign-in removes it straight away, and the storage sweep is started as well);
 *   there is no quarantine bucket, and the six months' preservation S1-E10-10 gave a match ends;
 * - the evidence is kept in abuse_image_evidence: the case, the account, the times, the scrambled
 *   IP address of the upload, the SHA-256 hash of the file and a few words from the moderator
 *   describing it for the police. It is kept 5 years ([lawyer to check]), longer under a legal
 *   hold that safeguarding staff set when the police ask;
 * - the uploader's account is closed for good (a ban, section 6), with its own statement of
 *   reasons: at once when a reviewer rejects, and by a safeguarding moderator from the case page
 *   for a match (an automatic match is never the only reason an account is closed).
 * The picture check (server/picture-check.ts) now sends the file's hash and the scrambled IP in
 * its signed verdict; picture_checks keeps them, and the scrambled IP is blanked after 30 days
 * (decided 16 Oct 2026, Q48) unless it was copied into the evidence.
 * Who calls the functions: RejectPictureForm and AbuseImageEvidencePanel (src/features/moderation),
 * server/picture-check.ts; the nightly run_retention_jobs().
 */

/* ---------- 1. The file's hash and the scrambled IP on each picture ---------- */

alter table public.picture_checks
  -- SHA-256 of the file as the check read it, hex; null for pictures checked before part e2b.
  add column file_sha256 text,
  -- The uploader's IP address scrambled with a keyed hash whose key changes every month
  -- (server/scrambled-ip.ts); blanked after 30 days (Q48) by blank_old_scrambled_ips().
  add column uploader_ip_scrambled text,
  -- Which month's key scrambled it ("2026-11"), so the police can be helped to match an address.
  add column uploader_ip_period text,
  add constraint picture_checks_file_sha256_shape check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint picture_checks_ip_shape check (uploader_ip_scrambled is null or uploader_ip_scrambled ~ '^[0-9a-f]{64}$'),
  add constraint picture_checks_ip_period_shape check (uploader_ip_period is null or uploader_ip_period ~ '^[0-9]{4}-[0-9]{2}$');

comment on column public.picture_checks.file_sha256 is
  'SHA-256 of the file as the picture check read it (ADMIN-2e2b); copied into abuse_image_evidence when needed.';
comment on column public.picture_checks.uploader_ip_scrambled is
  'The uploader''s IP address, scrambled with a monthly key; blanked after 30 days (Q48, ADMIN-2e2b).';

insert into public.settings (key, value, is_public, description) values
  ('abuse_image_evidence_keep_years', '5'::jsonb, false,
   'Years the evidence about a suspected child sexual abuse image is kept, unless a legal hold keeps it longer (Robert, 2 Nov 2026; [lawyer to check]).'),
  ('scrambled_ip_keep_days', '30'::jsonb, false,
   'Days a scrambled IP address is kept on a picture (decided 16 Oct 2026, Q48).')
on conflict (key) do nothing;

/* ---------- 2. The evidence ---------- */

create table public.abuse_image_evidence (
  id uuid primary key default gen_random_uuid(),
  -- The account that uploaded the picture (rule 15's owner column: whom the evidence is about).
  -- Restrict: the evidence outlives nothing it needs, and a closed account is never deleted (section 6).
  user_id uuid not null references public.profiles (id) on delete restrict,
  -- The case; the reference is copied so the evidence still names it if the case is purged.
  case_id uuid references public.cases (id) on delete set null,
  case_reference text not null,
  -- The picture's row and kind; the file itself is gone.
  picture_id uuid references public.picture_checks (id) on delete set null,
  picture_kind public.picture_kind not null,
  -- When it was uploaded and when it was found.
  uploaded_at timestamptz not null,
  reported_at timestamptz not null default now(),
  -- How it was found: a picture reviewer's red decision, or Arachnid Shield's list.
  source text not null,
  file_sha256 text,
  uploader_ip_scrambled text,
  uploader_ip_period text,
  -- A few words for the police, from the moderator (the image is never kept).
  description text not null,
  described_by_user_id uuid references public.profiles (id),
  -- 5 years from when it was found, unless a legal hold keeps it.
  keep_until timestamptz not null,
  legal_hold boolean not null default false,
  legal_hold_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint abuse_image_evidence_source_known check (source in ('moderator', 'known_image_match')),
  constraint abuse_image_evidence_description_length check (btrim(description) <> '' and char_length(description) <= 500),
  constraint abuse_image_evidence_hold_has_reason check (not legal_hold or btrim(coalesce(legal_hold_reason, '')) <> ''),
  constraint abuse_image_evidence_hold_reason_length check (legal_hold_reason is null or char_length(legal_hold_reason) <= 1000)
);

comment on table public.abuse_image_evidence is
  'kind: staff
What is kept about a suspected child sexual abuse image after its file is deleted: the case, the account, the times, the scrambled IP, the SHA-256 hash and a description for the police. Kept 5 years, longer under a legal hold (ADMIN-2e2b; [lawyer to check]).';

create unique index abuse_image_evidence_picture_id_idx on public.abuse_image_evidence (picture_id);
create index abuse_image_evidence_case_id_idx on public.abuse_image_evidence (case_id);
create index abuse_image_evidence_user_id_idx on public.abuse_image_evidence (user_id);

create trigger abuse_image_evidence_set_updated_at
  before update on public.abuse_image_evidence
  for each row execute function public.set_updated_at();

create trigger abuse_image_evidence_refuse_user_id_change
  before update on public.abuse_image_evidence
  for each row execute function public.refuse_user_id_change();

alter table public.abuse_image_evidence enable row level security;

/**
 * abuse_image_evidence_select_safeguarding: only staff with the safeguarding permission read the
 * evidence (S1-E10-10: safeguarding cases are theirs alone). Nobody writes it directly: the
 * functions below do, and log it.
 */
create policy abuse_image_evidence_select_safeguarding
  on public.abuse_image_evidence for select to authenticated
  using ((select public.staff_may('safeguarding', 'view')));

grant select on public.abuse_image_evidence to authenticated;

/* ---------- 3. Keeping the evidence and deleting the file ---------- */

/**
 * record_abuse_image_evidence: keeps the evidence about one picture and starts deleting its file.
 * Inputs: the picture's row; the case it belongs to; source ('moderator' or 'known_image_match');
 *   description (the words for the police); described_by (the moderator, or null for a match).
 * Returns: the evidence row's ID (an existing one for the same picture is updated, not doubled).
 * Steps: the row (copying the hash and the scrambled IP), the file no longer preserved, the
 *   storage sweep started at once (it deletes the file with the service key on staging and
 *   production; the screens also delete it with the person's own sign-in), and the audit log when
 *   a staff member did it.
 * Internal: record_picture_check(), admin_reject_picture().
 */
create function public.record_abuse_image_evidence(
  picture public.picture_checks,
  found_case public.cases,
  found_by text,
  description_text text,
  described_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_id uuid;
begin
  -- Step 1: the evidence row, kept 5 years (setting abuse_image_evidence_keep_years).
  insert into public.abuse_image_evidence (user_id, case_id, case_reference, picture_id, picture_kind,
      uploaded_at, source, file_sha256, uploader_ip_scrambled, uploader_ip_period, description,
      described_by_user_id, keep_until)
  values (picture.user_id, found_case.id, found_case.reference, picture.id, picture.kind, picture.created_at,
      found_by, picture.file_sha256, picture.uploader_ip_scrambled, picture.uploader_ip_period,
      btrim(description_text), described_by,
      now() + make_interval(years => public.keep_setting('abuse_image_evidence_keep_years', 5)))
  on conflict (picture_id) do update set
    description = excluded.description,
    described_by_user_id = excluded.described_by_user_id
  returning id into evidence_id;
  -- Step 2: the file is never kept, so nothing preserves it any more (replaces S1-E10-10's six months).
  update public.picture_checks set preserve_until = null where id = picture.id;
  -- Step 3: start the storage sweep now; it lists this file at once (storage_files_to_sweep).
  perform public.run_storage_sweep();
  -- Step 4: the audit log, when a staff member decided it (a match is the check's own doing).
  if public.is_staff_session() then
    perform public.log_staff_action('safeguarding.abuse_image_evidence_kept', 'abuse_image_evidence',
      evidence_id::text, picture.user_id, btrim(description_text), null,
      jsonb_build_object('case_reference', found_case.reference, 'source', found_by,
                         'has_hash', picture.file_sha256 is not null,
                         'has_scrambled_ip', picture.uploader_ip_scrambled is not null));
  end if;
  return evidence_id;
end;
$$;

comment on function public.record_abuse_image_evidence(public.picture_checks, public.cases, text, text, uuid) is
  'Internal: keeps the evidence about a suspected child sexual abuse image and starts deleting its file (ADMIN-2e2b).';
revoke execute on function public.record_abuse_image_evidence(public.picture_checks, public.cases, text, text, uuid)
  from public, anon, authenticated;

/**
 * abuse_image_file_may_go: true for a picture file whose evidence is kept, for its uploader or
 * the picture reviewer who rejected it; Storage then lets them read it for the moment it takes to
 * delete it (Storage needs both to remove a file) and delete it. Nobody else gains a read.
 * Inputs: the bucket and the file's path. Where it fits: the storage policies below.
 */
create function public.abuse_image_file_may_go(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    join public.abuse_image_evidence on abuse_image_evidence.picture_id = picture_checks.id
    where picture_checks.bucket = abuse_image_file_may_go.bucket and picture_checks.path = abuse_image_file_may_go.path
      and (picture_checks.user_id = (select auth.uid())
           or (abuse_image_evidence.described_by_user_id = (select auth.uid())
               and public.is_picture_reviewer((select auth.uid())))));
$$;

comment on function public.abuse_image_file_may_go(text, text) is
  'True for the uploader or the rejecting picture reviewer when the file is a suspected abuse image whose evidence is kept (ADMIN-2e2b).';
revoke execute on function public.abuse_image_file_may_go(text, text) from public, anon;
grant execute on function public.abuse_image_file_may_go(text, text) to authenticated;

/**
 * abuse_image_files_select_to_delete: lets the uploader or the rejecting picture reviewer reach a
 * suspected abuse image's file only so it can be deleted (Storage reads a file before removing it).
 */
create policy abuse_image_files_select_to_delete
  on storage.objects for select to authenticated
  using (bucket_id in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners', 'signature-pictures')
         and public.abuse_image_file_may_go(bucket_id, name));

/**
 * abuse_image_files_delete: the uploader or the rejecting picture reviewer deletes a suspected abuse image's
 * file at once (brief section 4: the image is never kept).
 */
create policy abuse_image_files_delete
  on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners', 'signature-pictures')
         and public.abuse_image_file_may_go(bucket_id, name));

/**
 * storage_files_to_sweep: as in S1-E13-04, plus every file of a suspected abuse image, in any
 * picture bucket and without the grace time, so the sweep deletes it at once (ADMIN-2e2b).
 */
create or replace function public.storage_files_to_sweep(max_files integer default 500)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select objects.bucket_id, objects.name from storage.objects
  where (
      objects.created_at < now() - make_interval(hours => public.keep_setting('storage_sweep_grace_hours', 24))
      and (
        (objects.bucket_id in ('covers', 'avatars', 'chapter-images', 'atlas-images')
          and not exists (select 1 from public.picture_checks
                          where picture_checks.bucket = objects.bucket_id
                            and picture_checks.path = objects.name))
        or (objects.bucket_id = 'exports'
          and not exists (select 1 from public.exports
                          where exports.file_name = objects.name
                            and (exports.state = 'building'
                                 or (exports.state = 'ready' and exports.expires_at > now()))))
        or (objects.bucket_id = 'teacher-proofs'
          and not exists (select 1 from public.teacher_checks
                          where teacher_checks.proof_path = objects.name
                            and teacher_checks.decided_at is null))))
    -- A suspected abuse image goes at once, whatever its age (ADMIN-2e2b).
    or exists (select 1 from public.picture_checks
               join public.abuse_image_evidence on abuse_image_evidence.picture_id = picture_checks.id
               where picture_checks.bucket = objects.bucket_id and picture_checks.path = objects.name)
  order by objects.created_at
  limit least(greatest(max_files, 1), 1000);
$$;

/* ---------- 4. A match from Arachnid Shield ---------- */

/**
 * record_picture_check: as in ADMIN-2e1b, plus (ADMIN-2e2b) it keeps the file's hash and the
 *   scrambled IP from the signed verdict, and a match keeps the evidence and starts deleting the
 *   file at once instead of preserving it.
 * Inputs: payload (JSON text: {"pictureId", "outcome", "provider", "flags", "isKnownAbuseMatch",
 *   "fileSha256", "uploaderIp": {"value", "period"} | null}) and signature (hex HMAC-SHA256 of
 *   the payload with PICTURE_CHECK_SECRET).
 * Returns: the picture's status after the answer.
 * Errors: insufficient_privilege for a wrong signature, or a caller who is neither the uploader
 *   nor moderation staff; no_data_found for an unknown picture.
 * Where it fits: server/picture-check.ts calls it with the caller's own sign-in, then deletes the
 *   file itself when the answer is a match.
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
  is_uploader boolean;
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
  is_uploader := picture.user_id = (select auth.uid());
  if not is_uploader and not public.staff_may('moderation', 'act') then
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
  -- Step 3: passed and allowed to go live shows it; anything else is held for a person. The hash
  -- is kept, and the scrambled IP only when the uploader's own upload sent it (never a staff IP).
  is_match := coalesce((answer ->> 'isKnownAbuseMatch')::boolean, false);
  is_passed := answer ->> 'outcome' = 'passed';
  update public.picture_checks set
    status = case when is_passed and not public.picture_needs_person(picture) then 'passed' else 'held' end::public.picture_status,
    flags = coalesce(answer -> 'flags', '{}'::jsonb),
    provider = left(answer ->> 'provider', 40),
    attempts = attempts + 1,
    checked_at = now(),
    file_sha256 = case when answer ->> 'fileSha256' ~ '^[0-9a-f]{64}$' then answer ->> 'fileSha256' end,
    uploader_ip_scrambled = case when is_uploader and answer #>> '{uploaderIp,value}' ~ '^[0-9a-f]{64}$'
                                 then answer #>> '{uploaderIp,value}' end,
    uploader_ip_period = case when is_uploader and answer #>> '{uploaderIp,value}' ~ '^[0-9a-f]{64}$'
                                   and answer #>> '{uploaderIp,period}' ~ '^[0-9]{4}-[0-9]{2}$'
                              then answer #>> '{uploaderIp,period}' end
  where id = picture.id
  returning * into picture;
  -- Step 4: show it, or open the case: a flag is a picture_check case, a rule a picture_review one.
  if picture.status = 'passed' then
    perform public.show_passed_avatar(picture);
  elsif is_passed then
    update public.picture_checks set case_id = public.open_picture_review_case(picture) where id = picture.id;
  else
    update public.picture_checks set case_id = public.open_picture_case(picture, is_match) where id = picture.id
      returning * into picture;
  end if;
  -- Step 5: a match keeps the evidence and the file goes at once (brief section 4).
  if is_match then
    perform public.record_abuse_image_evidence(picture, (select cases from public.cases where cases.id = picture.case_id),
      'known_image_match', 'Matched a known image on Arachnid Shield’s list. A safeguarding moderator adds a description.',
      null);
  end if;
  return picture.status;
end;
$$;

comment on function public.record_picture_check(text, text) is
  'Saves the signed picture check result with the file''s hash; a match keeps the evidence and deletes the file (S1-E10-05, ADMIN-2e1b, ADMIN-2e2b).';

/**
 * open_picture_case: as in S1-E10-05, except a match's case no longer preserves the file: the
 * image is never kept, only the evidence (ADMIN-2e2b, brief section 4).
 */
create or replace function public.open_picture_case(picture public.picture_checks, is_match boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  case_tier public.case_tier := case when is_match then 'same_day' else 'two_days' end;
  new_case_id uuid;
begin
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at, is_safeguarding)
  values ('P-' || lpad(nextval('public.picture_case_reference_seq')::text, 6, '0'), picture.user_id,
          'picture', picture.id, 'picture_check', case_tier,
          now() + make_interval(hours => public.tier_hours(case_tier)), is_match)
  returning id into new_case_id;
  return new_case_id;
end;
$$;

/* ---------- 5. Closing the account ---------- */

/**
 * close_account_for_abuse_image: closes the uploader's account for good (a ban, brief sections 4
 *   and 6) and sends its own statement of reasons on the law (Criminal Code art. 374).
 * Inputs: the case; note_text (staff only); account_message (what the person reads, in their
 *   language, with how to appeal).
 * Returns: true when the account was closed now; false when it was already closed or is a staff
 *   account (staff powers are removed first, S1-E2-07a: the case page says so).
 * Internal: admin_reject_picture(), admin_close_account_for_abuse_image().
 */
create function public.close_account_for_abuse_image(found_case public.cases, note_text text, account_message text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.staff_roles where staff_roles.user_id = found_case.user_id)
     or (public.active_sanction(found_case.user_id, 'ban')).id is not null then
    return false;
  end if;
  perform public.admin_apply_sanction(found_case.user_id, 'ban', null, found_case.id, note_text, null);
  perform public.issue_statement_of_reasons(found_case.user_id, 'ban', 'law', 'child_sexual_content',
    account_message, jsonb_build_object('case_id', found_case.id, 'item_type', 'profile',
      'item_id', found_case.user_id, 'automated_detection', false));
  return true;
end;
$$;

comment on function public.close_account_for_abuse_image(public.cases, text, text) is
  'Internal: bans the uploader of a suspected abuse image, with its statement of reasons (ADMIN-2e2b).';
revoke execute on function public.close_account_for_abuse_image(public.cases, text, text) from public, anon, authenticated;

/* ---------- 6. The red decision with "Sexual image of a minor" ---------- */

drop function public.admin_reject_picture(uuid, text, text, text);

/**
 * admin_reject_picture: red (Reject). The picture is removed and the uploader gets a statement of
 *   reasons (DSA art. 17) with its notification and email, which they can appeal (S1-E10-07).
 *   For "Sexual image of a minor" (ADMIN-2e2b, brief section 4) it also keeps the evidence with
 *   the moderator's words for the police, deletes the file, moves the case to safeguarding and
 *   closes the account for good.
 * Inputs: target_case_id; reason_key (one of the picture_reject_reasons setting); message_to_person
 *   (the admin-editable template, in the uploader's language, required); note_text (staff only,
 *   required); police_description and account_message (both required for "Sexual image of a
 *   minor", ignored otherwise).
 * Returns: true.
 * Errors: as picture_review_case(); check_violation for an unknown reason, a blank message or
 *   note, or a missing description or account message for "Sexual image of a minor".
 * Where it fits: PicturesToCheckPage, which then deletes the file with the moderator's sign-in.
 */
create function public.admin_reject_picture(
  target_case_id uuid,
  reason_key text,
  message_to_person text,
  note_text text,
  police_description text default null,
  account_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases := public.picture_review_case(target_case_id);
  is_minor boolean := reason_key = 'sexual_image_of_minor';
  picture public.picture_checks;
begin
  -- Step 1: a known reason, a message for the person and a note for staff; for a minor, the
  -- words for the police and the account message too.
  if not exists (select 1 from public.settings, jsonb_array_elements_text(settings.value) as allowed(reason)
                 where settings.key = 'picture_reject_reasons' and allowed.reason = reason_key) then
    raise exception 'Choose what the picture shows.' using errcode = 'check_violation';
  end if;
  if btrim(coalesce(message_to_person, '')) = '' or btrim(coalesce(note_text, '')) = ''
     or char_length(message_to_person) > 4000 then
    raise exception 'Write the message and the note.' using errcode = 'check_violation';
  end if;
  if is_minor and (btrim(coalesce(police_description, '')) = '' or char_length(police_description) > 500
                   or btrim(coalesce(account_message, '')) = '' or char_length(account_message) > 4000) then
    raise exception 'Describe the image for the police.' using errcode = 'check_violation',
      hint = 'police_description_missing';
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
  if not is_minor then
    return true;
  end if;
  -- Step 4 (a minor): the evidence, the file deleted, the case to safeguarding, the account closed.
  select * into picture from public.picture_checks where id = target.item_id;
  perform public.record_abuse_image_evidence(picture, target, 'moderator', police_description, (select auth.uid()));
  update public.cases set is_safeguarding = true where id = target.id;
  perform public.close_account_for_abuse_image(target, note_text, account_message);
  return true;
end;
$$;

comment on function public.admin_reject_picture(uuid, text, text, text, text, text) is
  'Staff: rejects a waiting picture with a reason; for a sexual image of a minor also keeps the evidence, deletes the file and closes the account (ADMIN-2e1b, ADMIN-2e2b).';
revoke execute on function public.admin_reject_picture(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.admin_reject_picture(uuid, text, text, text, text, text) to authenticated;

/* ---------- 7. The safeguarding case page ---------- */

/**
 * safeguarding_evidence_target: the evidence row a safeguarding staff member acts on, locked.
 * Errors: insufficient_privilege unless the caller may act on safeguarding; no_data_found for an
 * unknown row. Internal: the admin_* functions below.
 */
create function public.safeguarding_evidence_target(evidence_id uuid)
returns public.abuse_image_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.abuse_image_evidence;
begin
  if not public.staff_may('safeguarding', 'act') then
    raise exception 'Only safeguarding staff can do this.' using errcode = 'insufficient_privilege';
  end if;
  select * into found from public.abuse_image_evidence where id = evidence_id for update;
  if found.id is null then
    raise exception 'There is no such evidence.' using errcode = 'no_data_found';
  end if;
  return found;
end;
$$;

revoke execute on function public.safeguarding_evidence_target(uuid) from public, anon, authenticated;

/**
 * admin_abuse_image_evidence: the evidence about a case's picture, for the safeguarding case page.
 * Input: target_case_id. Returns: one JSON object, or null when the case has none.
 * Errors: insufficient_privilege unless the caller may view safeguarding.
 */
create function public.admin_abuse_image_evidence(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('safeguarding', 'view') then
    raise exception 'Only safeguarding staff can see this.' using errcode = 'insufficient_privilege';
  end if;
  return (select jsonb_build_object(
      'id', evidence.id, 'source', evidence.source, 'uploadedAt', evidence.uploaded_at,
      'reportedAt', evidence.reported_at, 'fileSha256', evidence.file_sha256,
      'hasScrambledIp', evidence.uploader_ip_scrambled is not null, 'ipPeriod', evidence.uploader_ip_period,
      'description', evidence.description,
      'describedBy', (select profiles.handle from public.profiles where profiles.id = evidence.described_by_user_id),
      'keepUntil', evidence.keep_until, 'legalHold', evidence.legal_hold,
      'legalHoldReason', evidence.legal_hold_reason,
      'accountClosed', (public.active_sanction(evidence.user_id, 'ban')).id is not null,
      'uploaderIsStaff', exists (select 1 from public.staff_roles where staff_roles.user_id = evidence.user_id),
      'uploaderLocale', (select profiles.locale from public.profiles where profiles.id = evidence.user_id))
    from public.abuse_image_evidence as evidence where evidence.case_id = target_case_id);
end;
$$;

comment on function public.admin_abuse_image_evidence(uuid) is
  'Safeguarding staff: the evidence about a case''s suspected abuse image (ADMIN-2e2b).';
revoke execute on function public.admin_abuse_image_evidence(uuid) from public, anon;
grant execute on function public.admin_abuse_image_evidence(uuid) to authenticated;

/**
 * admin_describe_abuse_image: replaces the words for the police (a match starts with a stand-in).
 * Inputs: evidence_id; description_text (1 to 500 characters). Returns: true.
 * Errors: as safeguarding_evidence_target(); check_violation for a blank or long text. Logged.
 */
create function public.admin_describe_abuse_image(evidence_id uuid, description_text text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.abuse_image_evidence := public.safeguarding_evidence_target(evidence_id);
begin
  if btrim(coalesce(description_text, '')) = '' or char_length(description_text) > 500 then
    raise exception 'Describe the image in a few words.' using errcode = 'check_violation';
  end if;
  update public.abuse_image_evidence
    set description = btrim(description_text), described_by_user_id = (select auth.uid())
    where id = found.id;
  perform public.log_staff_action('safeguarding.abuse_image_described', 'abuse_image_evidence', found.id::text,
    found.user_id, null, jsonb_build_object('description', found.description),
    jsonb_build_object('description', btrim(description_text)));
  return true;
end;
$$;

comment on function public.admin_describe_abuse_image(uuid, text) is
  'Safeguarding staff: replaces the description for the police of a suspected abuse image (ADMIN-2e2b).';
revoke execute on function public.admin_describe_abuse_image(uuid, text) from public, anon;
grant execute on function public.admin_describe_abuse_image(uuid, text) to authenticated;

/**
 * admin_set_evidence_hold: puts a legal hold on the evidence (the police asked within the 5
 *   years), or lifts it; while held, the nightly purge leaves it.
 * Inputs: evidence_id; should_hold; reason_given (required). Returns: true.
 * Errors: as safeguarding_evidence_target(); check_violation for a blank reason. Logged.
 */
create function public.admin_set_evidence_hold(evidence_id uuid, should_hold boolean, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.abuse_image_evidence := public.safeguarding_evidence_target(evidence_id);
begin
  if btrim(coalesce(reason_given, '')) = '' or char_length(reason_given) > 1000 then
    raise exception 'Write why.' using errcode = 'check_violation';
  end if;
  update public.abuse_image_evidence
    set legal_hold = should_hold, legal_hold_reason = case when should_hold then btrim(reason_given) end
    where id = found.id;
  perform public.log_staff_action(
    case when should_hold then 'safeguarding.legal_hold_set' else 'safeguarding.legal_hold_lifted' end,
    'abuse_image_evidence', found.id::text, found.user_id, btrim(reason_given),
    jsonb_build_object('legal_hold', found.legal_hold), jsonb_build_object('legal_hold', should_hold));
  return true;
end;
$$;

comment on function public.admin_set_evidence_hold(uuid, boolean, text) is
  'Safeguarding staff: sets or lifts the legal hold on suspected abuse image evidence (ADMIN-2e2b).';
revoke execute on function public.admin_set_evidence_hold(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_evidence_hold(uuid, boolean, text) to authenticated;

/**
 * admin_close_account_for_abuse_image: for a match, a safeguarding moderator closes the uploader's
 *   account for good from the case page (a person decides; the match alone never does).
 * Inputs: target_case_id; note_text (staff only); account_message (what the person reads).
 * Returns: true when it was closed now, false when it already was or is a staff account.
 * Errors: insufficient_privilege unless the caller may act on safeguarding and on sanctions;
 *   no_data_found for a case without evidence; check_violation for a blank note or message.
 */
create function public.admin_close_account_for_abuse_image(
  target_case_id uuid,
  note_text text,
  account_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  if not public.staff_may('safeguarding', 'act') or not public.staff_may('user_sanctions', 'act') then
    raise exception 'Only safeguarding staff can close the account.' using errcode = 'insufficient_privilege';
  end if;
  select cases.* into target from public.cases
    join public.abuse_image_evidence on abuse_image_evidence.case_id = cases.id
    where cases.id = target_case_id;
  if target.id is null then
    raise exception 'This case has no suspected abuse image.' using errcode = 'no_data_found';
  end if;
  if btrim(coalesce(note_text, '')) = '' or btrim(coalesce(account_message, '')) = ''
     or char_length(account_message) > 4000 then
    raise exception 'Write the note and the message.' using errcode = 'check_violation';
  end if;
  return public.close_account_for_abuse_image(target, note_text, account_message);
end;
$$;

comment on function public.admin_close_account_for_abuse_image(uuid, text, text) is
  'Safeguarding staff: closes the account that uploaded a matched abuse image for good (ADMIN-2e2b).';
revoke execute on function public.admin_close_account_for_abuse_image(uuid, text, text) from public, anon;
grant execute on function public.admin_close_account_for_abuse_image(uuid, text, text) to authenticated;

/* ---------- 8. The evidence pack carries it ---------- */

/**
 * picture_item_content: a picture's details for the evidence pack (S1-E10-10), with the kept
 * evidence (ADMIN-2e2b): the hash, the scrambled IP and its month, and the description.
 * Internal: case_item_content().
 */
create function public.picture_item_content(picture_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
      'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
      'checked_at', picture_checks.checked_at, 'file_sha256', picture_checks.file_sha256,
      'abuse_image_evidence', (select jsonb_build_object('source', evidence.source,
          'reported_at', evidence.reported_at, 'file_sha256', evidence.file_sha256,
          'uploader_ip_scrambled', evidence.uploader_ip_scrambled, 'uploader_ip_period', evidence.uploader_ip_period,
          'description', evidence.description, 'keep_until', evidence.keep_until,
          'legal_hold', evidence.legal_hold)
        from public.abuse_image_evidence as evidence where evidence.picture_id = picture_checks.id))
  from public.picture_checks where picture_checks.id = picture_item_content.picture_id;
$$;

revoke execute on function public.picture_item_content(uuid) from public, anon, authenticated;

/** case_item_content: as in FORUMS-2a, with the picture's evidence (ADMIN-2e2b). */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then public.picture_item_content(target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
    -- A thread's title with its first post; a post's words, when it was written and edited, and
    -- its earlier versions (S1-E8-02 criterion 4).
    when 'forum_thread' then (select jsonb_build_object('title', forum_threads.title,
        'started_at', forum_threads.created_at,
        'text', (select first_post.body from public.forum_posts as first_post
                 where first_post.thread_id = forum_threads.id and first_post.post_number = 1))
        from public.forum_threads where forum_threads.id = target.item_id)
    when 'forum_post' then (select jsonb_build_object('text', forum_posts.body, 'number', forum_posts.post_number,
        'posted_at', forum_posts.created_at, 'edited_at', forum_posts.edited_at,
        'earlier_versions', (select coalesce(jsonb_agg(jsonb_build_object('text', revisions.body,
            'title', revisions.title, 'written_at', revisions.written_at) order by revisions.written_at), '[]'::jsonb)
          from public.forum_post_revisions as revisions where revisions.post_id = forum_posts.id))
        from public.forum_posts where forum_posts.id = target.item_id)
    -- A space's name, description and rules, as its page shows them (S1-E8-06).
    when 'space' then (select jsonb_build_object('name', spaces.name, 'description', spaces.description,
        'rules', spaces.rules, 'started_at', spaces.created_at)
        from public.spaces where spaces.id = target.item_id)
  end;
$$;

/* ---------- 9. The nightly clean-ups ---------- */

/**
 * purge_abuse_image_evidence: deletes evidence past its 5 years that no legal hold keeps.
 * Returns: how many rows went. Called by run_retention_jobs() each night.
 */
create function public.purge_abuse_image_evidence()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  delete from public.abuse_image_evidence where keep_until < now() and not legal_hold;
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

comment on function public.purge_abuse_image_evidence() is
  'Job: deletes suspected abuse image evidence past its keep time without a legal hold (ADMIN-2e2b).';
revoke execute on function public.purge_abuse_image_evidence() from public, anon, authenticated;

/**
 * blank_old_scrambled_ips: blanks the scrambled IP on pictures older than 30 days (Q48); the
 * evidence keeps its own copy. Returns: how many pictures were changed. Run each night.
 */
create function public.blank_old_scrambled_ips()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  update public.picture_checks set uploader_ip_scrambled = null, uploader_ip_period = null
    where uploader_ip_scrambled is not null
      and created_at < now() - make_interval(days => public.keep_setting('scrambled_ip_keep_days', 30));
  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

comment on function public.blank_old_scrambled_ips() is
  'Job: blanks scrambled IP addresses on pictures after 30 days (Q48, ADMIN-2e2b).';
revoke execute on function public.blank_old_scrambled_ips() from public, anon, authenticated;

/** run_retention_jobs: as in S1-E13-04, plus the two clean-ups above (ADMIN-2e2b). */
create or replace function public.run_retention_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_name text;
  removed_count integer;
  total_removed integer := 0;
begin
  -- Accounts first, so their exports and pictures are caught by the purges after them.
  foreach job_name in array array[
    'purge_unconfirmed_accounts', 'purge_expired_exports', 'purge_deleted_pictures',
    'purge_old_staff_records', 'purge_old_audit_log', 'fold_old_daily_totals',
    'purge_abuse_image_evidence', 'blank_old_scrambled_ips']
  loop
    execute format('select public.%I()', job_name) into removed_count;
    perform public.record_retention_run(job_name, removed_count);
    total_removed := total_removed + removed_count;
  end loop;
  return total_removed;
end;
$$;
