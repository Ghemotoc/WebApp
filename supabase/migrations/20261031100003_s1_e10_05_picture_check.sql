/*
 * Migration: the picture check on upload (story S1-E10-05; architecture B15; decided 16 Oct 2026,
 * late evening, 22:59: picture uploads on from launch, Sightengine and Arachnid Shield).
 *
 * How a picture travels:
 *   1. the uploader puts the file in a private bucket (covers or avatars) while picture_uploads
 *      is on, and calls register_picture(): the picture is "pending" and only they and staff see
 *      it (criterion 1: checked before anyone else can see it);
 *   2. the screen asks the Pages Function POST /api/picture-check (server/picture-check.ts), which
 *      reads the file with the uploader's own sign-in, sends it to Sightengine (nudity, gore) and
 *      Arachnid Shield (hash matching), signs the answer with PICTURE_CHECK_SECRET and calls
 *      record_picture_check(); a script calling the database directly can't sign (Vault:
 *      picture_check_secret), so nobody can mark their own picture as passed;
 *   3. both pass: "passed", and everyone may see it (criterion 2). Either flags it: "held", a
 *      picture_check case opens in the queue and a person decides (criterion 3): the tools only
 *      hold, they never approve or remove. An Arachnid Shield match is a same-day safeguarding
 *      case, its file is preserved six months for the authorities and only staff with the
 *      safeguarding permission see it (criterion 4, S1-E10-10). A service that is down leaves the
 *      picture pending, private, to be tried again;
 *   4. the moderator's decision: no action approves it; any other action removes it, and the
 *      uploader gets the statement of reasons (S1-E10-04).
 * What it adds: the picture_checks table, the avatars bucket, profiles.avatar_picture_id, the
 *   storage read rules, register_picture(), record_picture_check(), my_pending_pictures(),
 *   story_cover_picture(), profile_avatar_picture(), admin_case_picture(), the picture branches
 *   in the shared reporting contract and the decision trigger.
 * Files stay where they were uploaded: a held or removed picture is simply never readable by
 *   anyone but staff, which keeps it as private as an evidence bucket would (decision, rule 8).
 */

/* ---------- The table ---------- */

create table public.picture_checks (
  id uuid primary key default gen_random_uuid(),
  -- The uploader (CLAUDE.md rule 15); never shown publicly.
  user_id uuid not null references public.profiles (id),
  -- Where the file is: the bucket and the path inside it.
  bucket text not null,
  path text not null,
  kind public.picture_kind not null,
  -- A cover's story, so its case and its decision link to it.
  story_id uuid references public.stories (id) on delete set null,
  status public.picture_status not null default 'pending',
  -- What each service said: labels and scores only, never the picture (rule 12).
  flags jsonb not null default '{}'::jsonb,
  -- stub, or sightengine+arachnid when the real services answered.
  provider text,
  -- How many times the check was tried (a service down counts one).
  attempts integer not null default 0,
  checked_at timestamptz,
  -- The case a flagged picture opened.
  case_id uuid references public.cases (id),
  -- An Arachnid Shield match is kept six months for the authorities (S1-E10-10).
  preserve_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint picture_checks_one_row_per_file unique (bucket, path),
  constraint picture_checks_bucket_is_known check (bucket in ('covers', 'avatars')),
  constraint picture_checks_kind_matches_bucket check (
    (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
    or kind not in ('cover', 'avatar'))
);

comment on table public.picture_checks is
  'kind: user_content; reportable: picture
Every uploaded picture and its check: pending, passed, held, approved or removed (S1-E10-05).';

create index picture_checks_user_id_idx on public.picture_checks (user_id, created_at desc);
create index picture_checks_story_id_idx on public.picture_checks (story_id);
create trigger picture_checks_refuse_user_id_change
  before update on public.picture_checks
  for each row execute function public.refuse_user_id_change('user_id');
create trigger picture_checks_set_updated_at
  before update on public.picture_checks
  for each row execute function public.set_updated_at();

alter table public.picture_checks enable row level security;

/**
 * picture_checks_select_own: the uploader reads their own pictures' checks, so the settings
 * screens can say "Waiting for a check" or "Waiting for a person" (criterion 3).
 */
create policy picture_checks_select_own
  on public.picture_checks for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy picture_checks_select_own on public.picture_checks is
  'Allows the uploader to read their own pictures'' checks (S1-E10-05).';

/**
 * picture_checks_select_moderation: moderation staff read every check; a picture whose case is a
 * safeguarding case (an Arachnid Shield match) only with that permission (S1-E10-10).
 */
create policy picture_checks_select_moderation
  on public.picture_checks for select to authenticated
  using (
    (select public.staff_may('moderation', 'view'))
    and (case_id is null or public.may_see_case(
      (select cases.is_safeguarding from public.cases where cases.id = picture_checks.case_id)))
  );

comment on policy picture_checks_select_moderation on public.picture_checks is
  'Allows moderation staff to read picture checks; safeguarding ones need that permission (S1-E10-05, S1-E10-10).';

-- Reads only; every write goes through the functions below.
grant select on public.picture_checks to authenticated;

/* ---------- The avatar ---------- */

alter table public.profiles add column avatar_picture_id uuid references public.picture_checks (id) on delete set null;
comment on column public.profiles.avatar_picture_id is
  'The profile picture people see: set only once its check passed or a moderator approved it (S1-E10-05, S1-E5-05).';

-- Private: served only through signed URLs; 2 MB; the three picture types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * avatar_upload_allowed: may the signed-in person add this avatar file?
 * Input: object_name, the path inside the bucket. Returns: true only while picture_uploads is on,
 *   for an account that may write (the account gate), and for a name that is a fresh random ID
 *   with a picture ending ("<uuid>.webp"), never the user ID itself (architecture 1.6: the user ID
 *   is never public, and a file name ends up in a signed URL).
 * Where it fits: the avatars_insert_own policy.
 */
create or replace function public.avatar_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('picture_uploads')
    and public.is_active_member()
    and coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    and split_part(object_name, '.', 1) <> (select auth.uid())::text;
$$;

comment on function public.avatar_upload_allowed(text) is
  'True for an account that may write, a random-ID file name and picture_uploads on (S1-E10-05).';
revoke execute on function public.avatar_upload_allowed(text) from public, anon;
grant execute on function public.avatar_upload_allowed(text) to authenticated;

/**
 * Policy avatars_insert_own: a member adds a profile picture under a random name while uploads
 * are on. Why: the file is private until its check passes (criterion 1).
 */
create policy avatars_insert_own
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.avatar_upload_allowed(name));

comment on policy avatars_insert_own on storage.objects is
  'Allows a member to add a profile picture under a random name while picture_uploads is on (S1-E10-05).';

/* ---------- Who may read a file ---------- */

/**
 * picture_is_visible: may anyone see this file? True only when its check passed or a moderator
 * approved it, it isn't deleted and no moderator hid it later (criterion 2). A file nobody
 * registered is never visible.
 * Inputs: bucket and path. Where it fits: the storage read policy and the picture functions.
 */
create or replace function public.picture_is_visible(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = picture_is_visible.bucket and picture_checks.path = picture_is_visible.path
      and picture_checks.status in ('passed', 'approved')
      and picture_checks.deleted_at is null
      and not public.is_moderated_away('picture', picture_checks.id));
$$;

comment on function public.picture_is_visible(text, text) is
  'True when a picture passed its check or was approved, and isn''t deleted or hidden (S1-E10-05).';
revoke execute on function public.picture_is_visible(text, text) from public;
grant execute on function public.picture_is_visible(text, text) to anon, authenticated;

/**
 * picture_reader_may_see: may the signed-in person read this file even though others can't? The
 * uploader always may; moderation staff may, a safeguarding case's picture only with that
 * permission (S1-E10-10).
 * Inputs: bucket and path. Where it fits: the storage read policy.
 */
create or replace function public.picture_reader_may_see(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    left join public.cases on cases.id = picture_checks.case_id
    where picture_checks.bucket = picture_reader_may_see.bucket and picture_checks.path = picture_reader_may_see.path
      and (picture_checks.user_id = (select auth.uid())
           or (public.staff_may('moderation', 'view') and public.may_see_case(coalesce(cases.is_safeguarding, false)))));
$$;

comment on function public.picture_reader_may_see(text, text) is
  'True for the uploader and for moderation staff allowed to see the picture''s case (S1-E10-05).';
revoke execute on function public.picture_reader_may_see(text, text) from public, anon;
grant execute on function public.picture_reader_may_see(text, text) to authenticated;

/**
 * Policy pictures_select_visible: anyone, signed in or not, reads a picture once its check passed
 * or a moderator approved it (criterion 2). The screens ask for a signed URL, which needs this.
 */
create policy pictures_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('covers', 'avatars') and public.picture_is_visible(bucket_id, name));

comment on policy pictures_select_visible on storage.objects is
  'Allows anyone to read a cover or profile picture once it passed its check or was approved (S1-E10-05).';

/**
 * Policy pictures_select_uploader_and_staff: the uploader reads their own picture at every stage
 * and moderation staff read the pictures they decide on (criterion 3).
 */
create policy pictures_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id in ('covers', 'avatars') and public.picture_reader_may_see(bucket_id, name));

comment on policy pictures_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a picture at any stage of its check (S1-E10-05).';

/* ---------- Registering an upload ---------- */

/**
 * register_picture: records a file the signed-in person just uploaded, as pending.
 * Inputs: target_bucket ('covers' or 'avatars'), target_path (the path inside it), picture_kind.
 * Returns: the picture's ID, which the screen sends to /api/picture-check.
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while picture_uploads is off; check_violation when the file isn't there,
 *   isn't the caller's, or the path doesn't fit the kind (a cover under one of the caller's own
 *   stories); program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: CoverUpload and AvatarUpload, straight after the upload.
 */
create or replace function public.register_picture(target_bucket text, target_path text, picture_kind public.picture_kind)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  cover_story_id uuid;
  new_id uuid;
begin
  -- Step 1: a member who may write, while uploads are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add pictures right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there and the caller uploaded it.
  if not exists (select 1 from storage.objects where objects.bucket_id = target_bucket
                 and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded yet.' using errcode = 'check_violation';
  end if;
  -- Step 3: the path fits the kind: a cover sits under one of the caller's stories.
  if picture_kind = 'cover' then
    if target_bucket <> 'covers' or not public.cover_upload_allowed(target_path) then
      raise exception 'A cover goes under one of your own stories.' using errcode = 'check_violation';
    end if;
    cover_story_id := split_part(target_path, '/', 1)::uuid;
  elsif picture_kind = 'avatar' and target_bucket <> 'avatars' then
    raise exception 'A profile picture goes in the avatars bucket.' using errcode = 'check_violation';
  end if;
  -- Step 4: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind, story_id)
  values (caller_id, target_bucket, target_path, picture_kind, cover_story_id)
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;

comment on function public.register_picture(text, text, public.picture_kind) is
  'Records a just-uploaded picture as pending, private until its check (S1-E10-05).';
revoke execute on function public.register_picture(text, text, public.picture_kind) from public, anon;
grant execute on function public.register_picture(text, text, public.picture_kind) to authenticated;

/* ---------- The signed result ---------- */

/**
 * picture_check_is_signed: true when the payload was signed by our server with the Vault secret
 * picture_check_secret (the same value as PICTURE_CHECK_SECRET in Cloudflare); always false while
 * the secret isn't set. Internal: record_picture_check().
 */
create or replace function public.picture_check_is_signed(payload text, signature text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'picture_check_secret';
  if secret is null or secret = '' or signature is null then
    return false;
  end if;
  return encode(extensions.hmac(payload, secret, 'sha256'), 'hex') = lower(signature);
end;
$$;

comment on function public.picture_check_is_signed(text, text) is
  'Internal: checks a picture check result''s signature against the Vault secret picture_check_secret (S1-E10-05).';
revoke execute on function public.picture_check_is_signed(text, text) from public, anon, authenticated;

create sequence public.picture_case_reference_seq;
comment on sequence public.picture_case_reference_seq is 'Numbers the picture check cases: P-000123 (S1-E10-05).';

/**
 * open_picture_case: opens the case for a held picture (criterion 3). An Arachnid Shield match is
 * a same-day safeguarding case and the file is preserved six months (criterion 4, S1-E10-10);
 * anything else waits two days, like other illegal content (S1-E10-03 tiers).
 * Input: the held picture. Returns: the case's ID. Internal: record_picture_check().
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
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at,
                            is_safeguarding, preserve_until)
  values ('P-' || lpad(nextval('public.picture_case_reference_seq')::text, 6, '0'), picture.user_id,
          'picture', picture.id, 'picture_check', case_tier,
          now() + make_interval(hours => public.tier_hours(case_tier)), is_match,
          case when is_match then now() + interval '6 months' end)
  returning id into new_case_id;
  return new_case_id;
end;
$$;

comment on function public.open_picture_case(public.picture_checks, boolean) is
  'Internal: opens the moderation case for a held picture; a match is same-day safeguarding (S1-E10-05).';
revoke execute on function public.open_picture_case(public.picture_checks, boolean) from public, anon, authenticated;

/**
 * show_passed_avatar: a profile picture that passed or was approved becomes the profile's picture,
 * replacing the old one. Input: the picture. Internal: record_picture_check() and the decision
 * trigger.
 */
create or replace function public.show_passed_avatar(picture public.picture_checks)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set avatar_picture_id = picture.id
  where profiles.id = picture.user_id and picture.kind = 'avatar';
$$;

comment on function public.show_passed_avatar(public.picture_checks) is
  'Internal: makes a passed or approved profile picture the profile''s picture (S1-E10-05).';
revoke execute on function public.show_passed_avatar(public.picture_checks) from public, anon, authenticated;

/**
 * record_picture_check: saves the services' answer for one picture.
 * Inputs: payload (JSON text: {"pictureId", "outcome": "passed" | "flagged" | "unavailable",
 *   "provider", "flags": {...labels and scores}, "isKnownAbuseMatch": boolean}) and signature (hex
 *   HMAC-SHA256 of the payload with PICTURE_CHECK_SECRET).
 * Returns: the picture's status after the answer.
 * Errors: insufficient_privilege when the signature is wrong, or the caller is neither the uploader
 *   nor moderation staff (staff can run the check again); no_data_found for an unknown picture.
 * Rules: only a pending picture changes; a held, passed, approved or removed one keeps its status
 *   (the tools never approve or remove, criterion 3). Nothing about the picture or the person is
 *   logged.
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
  -- Step 2: only a pending picture moves on.
  if picture.status <> 'pending' then
    return picture.status;
  end if;
  -- Step 3: a service that didn't answer leaves it pending and private.
  if answer ->> 'outcome' = 'unavailable' then
    update public.picture_checks set attempts = attempts + 1 where id = picture.id;
    return 'pending';
  end if;
  -- Step 4: passed shows it; flagged holds it and opens a case for a person.
  is_match := coalesce((answer ->> 'isKnownAbuseMatch')::boolean, false);
  update public.picture_checks set
    status = case when answer ->> 'outcome' = 'passed' then 'passed' else 'held' end::public.picture_status,
    flags = coalesce(answer -> 'flags', '{}'::jsonb),
    provider = left(answer ->> 'provider', 40),
    attempts = attempts + 1,
    checked_at = now(),
    preserve_until = case when is_match then now() + interval '6 months' end
  where id = picture.id
  returning * into picture;
  if picture.status = 'passed' then
    perform public.show_passed_avatar(picture);
  else
    update public.picture_checks set case_id = public.open_picture_case(picture, is_match) where id = picture.id;
  end if;
  return picture.status;
end;
$$;

comment on function public.record_picture_check(text, text) is
  'Saves the signed picture check result: passed shows it, flagged holds it and opens a case (S1-E10-05).';
revoke execute on function public.record_picture_check(text, text) from public, anon;
grant execute on function public.record_picture_check(text, text) to authenticated;

/* ---------- The decision ---------- */

/**
 * apply_picture_decision: when a picture case is decided, no action approves the picture (it
 * shows) and any other action removes it (criterion 3: a person decides). Trigger: after update
 * of status on cases.
 */
create or replace function public.apply_picture_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  picture public.picture_checks;
begin
  if new.item_type = 'picture' and new.status = 'decided' and old.status is distinct from 'decided' then
    update public.picture_checks set
      status = case when new.decision = 'no_action' then 'approved' else 'removed' end::public.picture_status
    where id = new.item_id
    returning * into picture;
    if picture.status = 'approved' then
      perform public.show_passed_avatar(picture);
    end if;
  end if;
  return null;
end;
$$;

comment on function public.apply_picture_decision() is
  'Trigger: a decided picture case approves (no action) or removes (any other action) the picture (S1-E10-05).';
revoke execute on function public.apply_picture_decision() from public, anon, authenticated;

create trigger cases_apply_picture_decision
  after update of status on public.cases
  for each row execute function public.apply_picture_decision();

/* ---------- What the screens read ---------- */

/**
 * picture_state_json: one picture as a screen draws it.
 * Returns: {state: visible | checking | waiting_for_person | removed, bucket, path}; bucket and
 *   path only when the caller may read the file (everyone once visible; the uploader and staff
 *   always), so a reader learns nothing about a held picture but "Picture being checked".
 * Internal: story_cover_picture(), profile_avatar_picture(), my_pending_pictures().
 */
create or replace function public.picture_state_json(picture public.picture_checks)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when picture.id is null then null else jsonb_build_object(
    'state', case
      when picture.status = 'removed' or public.is_moderated_away('picture', picture.id) then 'removed'
      when picture.status in ('passed', 'approved') then 'visible'
      when picture.status = 'held' then 'waiting_for_person'
      else 'checking' end,
    'bucket', case when public.picture_is_visible(picture.bucket, picture.path)
                     or public.picture_reader_may_see(picture.bucket, picture.path) then picture.bucket end,
    'path', case when public.picture_is_visible(picture.bucket, picture.path)
                   or public.picture_reader_may_see(picture.bucket, picture.path) then picture.path end) end;
$$;

comment on function public.picture_state_json(public.picture_checks) is
  'Internal: a picture''s state and, when the caller may read it, its file (S1-E10-05).';
revoke execute on function public.picture_state_json(public.picture_checks) from public, anon, authenticated;

/**
 * story_cover_picture: the uploaded cover of a story the caller can see.
 * Input: story_slug. Returns: picture_state_json() of the story's cover, or null when the story
 *   has no uploaded cover or the caller can't see the story.
 * Where it fits: the story card, the story page and the teaser draw "Picture being checked" or
 *   the picture from it (useUploadedCover).
 */
create or replace function public.story_cover_picture(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.stories
  join public.picture_checks on picture_checks.bucket = 'covers' and picture_checks.path = stories.cover_tall_path
  where stories.slug = story_slug and stories.cover_kind = 'upload' and stories.deleted_at is null
    and (stories.user_id = (select auth.uid())
         or (stories.first_published_at is not null and public.rating_allows(stories.rating)));
$$;

comment on function public.story_cover_picture(text) is
  'A story''s uploaded cover: its check state and, when the caller may see it, the file (S1-E10-05).';
grant execute on function public.story_cover_picture(text) to anon, authenticated;

/**
 * profile_avatar_picture: a profile's picture.
 * Input: profile_handle. Returns: picture_state_json() of the profile's picture (only ever a passed
 *   or approved one) or, for the caller's own profile, of their newest picture still in its check;
 *   null when there is none. Never a user ID.
 * Where it fits: the writer profile header and Settings › Profile (useAvatar).
 */
create or replace function public.profile_avatar_picture(profile_handle text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.profiles
  join public.picture_checks on picture_checks.id = coalesce(
    case when profiles.id = (select auth.uid()) then (
      select newest.id from public.picture_checks as newest
      where newest.user_id = profiles.id and newest.kind = 'avatar' and newest.deleted_at is null
        and newest.status in ('pending', 'held') and newest.id is distinct from profiles.avatar_picture_id
        and newest.created_at >= coalesce(
          (select shown.created_at from public.picture_checks as shown where shown.id = profiles.avatar_picture_id),
          '-infinity'::timestamptz)
      order by newest.created_at desc limit 1) end,
    profiles.avatar_picture_id)
  where profiles.handle = profile_handle and profiles.deleted_at is null;
$$;

comment on function public.profile_avatar_picture(text) is
  'A profile''s picture: the shown one, or for one''s own profile the newest still in its check (S1-E10-05).';
grant execute on function public.profile_avatar_picture(text) to anon, authenticated;

/**
 * my_pending_pictures: the caller's pictures still waiting for the services, so the screen can
 * ask for the check again on the next visit (a service was down).
 * Returns: one row per pending picture: id, kind, attempts.
 */
create or replace function public.my_pending_pictures()
returns table (picture_id uuid, kind public.picture_kind, attempts integer)
language sql
stable
security definer
set search_path = ''
as $$
  select picture_checks.id, picture_checks.kind, picture_checks.attempts
  from public.picture_checks
  where picture_checks.user_id = (select auth.uid()) and picture_checks.status = 'pending'
    and picture_checks.deleted_at is null
  order by picture_checks.created_at;
$$;

comment on function public.my_pending_pictures() is
  'The caller''s pictures still waiting for the services, to try again (S1-E10-05).';
revoke execute on function public.my_pending_pictures() from public, anon;
grant execute on function public.my_pending_pictures() to authenticated;

/**
 * admin_case_picture: the picture a picture case is about, for the case page: what was flagged and
 * where the file is (the case page asks storage for a signed URL with the moderator's sign-in).
 * Input: target_case_id. Returns: {id, kind, bucket, path, status, flags, provider, attempts,
 *   checked_at, story {slug, title}} or null when the case isn't about a picture.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_picture(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.staff_may('moderation', 'view') or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  if target.item_type <> 'picture' then
    return null;
  end if;
  return (select jsonb_build_object('id', picture_checks.id, 'kind', picture_checks.kind,
      'bucket', picture_checks.bucket, 'path', picture_checks.path, 'status', picture_checks.status,
      'flags', picture_checks.flags, 'provider', picture_checks.provider, 'attempts', picture_checks.attempts,
      'checked_at', picture_checks.checked_at,
      'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
                from public.stories where stories.id = picture_checks.story_id))
    from public.picture_checks where picture_checks.id = target.item_id);
end;
$$;

comment on function public.admin_case_picture(uuid) is
  'The picture a picture case is about, with what was flagged, for the case page (S1-E10-05).';
revoke execute on function public.admin_case_picture(uuid) from public, anon;
grant execute on function public.admin_case_picture(uuid) to authenticated;

/* ---------- An uploaded cover must be a registered picture ---------- */

/**
 * check_story_cover: as in S1-E3-01, and an uploaded cover must be a picture the caller registered
 * (register_picture()) that a moderator hasn't removed, so a story can't point at someone else's
 * file or one that skipped the check (S1-E10-05).
 */
create or replace function public.check_story_cover(cover jsonb)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  kind text := cover ->> 'kind';
begin
  if kind = 'automatic' then
    return;
  end if;
  if kind = 'drawn' then
    if cover ->> 'design' is null or cover ->> 'background' is null or cover ->> 'accent' is null then
      raise exception 'A drawn cover needs a design, a background colour and an accent colour (S1-E3-01).'
        using errcode = 'check_violation';
    end if;
    return;
  end if;
  if kind = 'upload' then
    if not public.is_feature_enabled('picture_uploads') then
      raise exception 'Picture uploads are switched off (picture_uploads flag; decided 23 Oct 2026).'
        using errcode = 'feature_not_supported';
    end if;
    if not exists (select 1 from public.picture_checks
                   where picture_checks.bucket = 'covers' and picture_checks.path = cover ->> 'tall_path'
                     and picture_checks.user_id = (select auth.uid()) and picture_checks.status <> 'removed') then
      raise exception 'Upload the cover picture first (S1-E10-05).' using errcode = 'check_violation';
    end if;
    return;
  end if;
  raise exception 'Unknown cover kind "%".', coalesce(kind, 'none') using errcode = 'check_violation';
end;
$$;

/* ---------- The shared reporting contract ---------- */

/**
 * reportable_item_owner: as in S1-E6-01, plus the 'picture' branch (S1-E10-05): a picture by its
 * ID, and only once people can see it, so a held picture's existence never leaks.
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05).';

/**
 * reportable_item_summary: as in S1-E6-01, plus the 'picture' branch: "Cover picture of <story>"
 * or "Profile picture of @handle".
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

comment on function public.reportable_item_summary(public.reportable_type, uuid) is
  'A few words saying what was reported, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05).';

/**
 * notification_item_json: as in S1-E7-01, plus a picture: a cover links to its story, a profile
 * picture to the profile.
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;

/**
 * case_item_content: as in S1-E10-10, plus a picture: its kind, where the file is, what was
 * flagged and when it was uploaded, for the evidence pack (an Arachnid Shield match).
 */
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
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
  end;
$$;
