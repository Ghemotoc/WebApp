-- Migration: the safeguarding path for a young person in danger (story S1-E10-10; DSA art. 18:
-- tell the authorities about a suspected crime that threatens someone's life or safety; Romanian
-- Law 50/2024 art. 31, to verify, on the lawyer's list).
--
-- Already in place (S1-E10-03a): reports of child sexual content, a threat to a minor or self-harm
-- open a safeguarding case, and only staff with the safeguarding permission see it
-- (may_see_case()). This migration adds:
--   admin_mark_safeguarding()        moderation staff move any other case into the safeguarding
--                                    lane (for example harassment of a child), logged
--   admin_case_support_contacts()    the child helpline and emergency numbers for the country of
--                                    the account in the case, Romania's when there are none
--                                    (criterion 1; Romania: 116 111, research G4, S1-E10-13a)
--   admin_build_evidence_pack()      content, account data and timestamps as one JSON document for
--                                    police or prosecutors (criterion 2), logged as a sensitive read
--   safeguarding_referrals           each referral to an authority: who, to whom, their reference
--   admin_log_referral(), admin_case_referrals()
-- Who calls it: the case page's safeguarding panel (src/features/moderation/).

/* ---------- Moving a case into the safeguarding lane ---------- */

/**
 * admin_mark_safeguarding: puts an open case in the safeguarding lane, so from now on only staff
 * with the safeguarding permission see it (criterion 3). There is no way back from the screen.
 * Inputs: target_case_id; reason_given (required). Returns: true.
 * Errors: insufficient_privilege unless the caller may act on moderation and see the case;
 *   check_violation for a blank reason, a decided case or one already in the lane.
 * Logged as case.safeguarding_marked.
 */
create or replace function public.admin_mark_safeguarding(target_case_id uuid, reason_given text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where id = target_case_id for update;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('moderation', 'act') then
    raise exception 'You can''t change this case.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write a reason.' using errcode = 'check_violation';
  end if;
  if target.status <> 'open' or target.is_safeguarding then
    raise exception 'Only an open case outside the safeguarding lane can be moved into it.' using errcode = 'check_violation';
  end if;
  update public.cases set is_safeguarding = true where id = target.id;
  perform public.log_staff_action('case.safeguarding_marked', 'cases', target.id::text, target.user_id,
    btrim(reason_given), jsonb_build_object('is_safeguarding', false), jsonb_build_object('is_safeguarding', true));
  return true;
end;
$$;

comment on function public.admin_mark_safeguarding(uuid, text) is
  'Moderation staff move an open case into the safeguarding lane; logged (S1-E10-10).';
revoke execute on function public.admin_mark_safeguarding(uuid, text) from public, anon;
grant execute on function public.admin_mark_safeguarding(uuid, text) to authenticated;

/* ---------- Support resources ---------- */

/**
 * admin_case_support_contacts: the safety contacts a safeguarding moderator needs for the person
 * in the case: the child helpline, the emergency number and the youth crisis line for the
 * country of the account whose item it is (S1-E10-13a's table), or Romania's when that country
 * has none (and the gap is noted for staff).
 * Input: the case's ID. Returns: {country_code, is_fallback, contacts: [{kind, label,
 *   phone_number, link, opening_hours, note}]}.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_support_contacts(target_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  wanted_country text;
  found_country text;
begin
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 1: the person's country, or Romania; a country without contacts falls back to Romania.
  select coalesce(profiles.country_code, 'RO') into wanted_country from public.profiles where profiles.id = target.user_id;
  found_country := wanted_country;
  if not exists (select 1 from public.safety_contacts where safety_contacts.country_code = wanted_country) then
    perform public.note_safety_contact_gap(wanted_country);
    found_country := 'RO';
  end if;
  -- Step 2: the contacts that help a young person in danger.
  return jsonb_build_object(
    'country_code', found_country,
    'is_fallback', found_country <> wanted_country,
    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object('kind', safety_contacts.kind, 'label', safety_contacts.label,
          'phone_number', safety_contacts.phone_number, 'link', safety_contacts.link,
          'opening_hours', safety_contacts.opening_hours, 'note', safety_contacts.note)
        order by safety_contacts.kind, safety_contacts.position)
      from public.safety_contacts
      where safety_contacts.country_code = found_country
        and safety_contacts.kind in ('child_helpline', 'emergency', 'crisis_youth', 'police_online_child')), '[]'::jsonb));
end;
$$;

comment on function public.admin_case_support_contacts(uuid) is
  'Staff: the child helpline and emergency contacts for the country of the account in a case (S1-E10-10, S1-E10-13a).';
revoke execute on function public.admin_case_support_contacts(uuid) from public, anon;
grant execute on function public.admin_case_support_contacts(uuid) to authenticated;

/* ---------- The evidence pack ---------- */

/**
 * case_item_content: the full content of a case's item, for the evidence pack: a story's title and
 * blurb, a chapter's published title and text, a comment's text, a profile's handle, pen name and
 * bio. Staff never change it; this is a read.
 * Internal: admin_build_evidence_pack().
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
  end;
$$;

comment on function public.case_item_content(public.cases) is 'Internal: the full content of a case''s item, for the evidence pack (S1-E10-10).';
revoke execute on function public.case_item_content(public.cases) from public, anon, authenticated;

/**
 * admin_build_evidence_pack: one JSON document for police or prosecutors (criterion 2): the case,
 * its reports and notices, the item's content, the account's data (user ID, handle, pen name,
 * email, country, age group, when it joined) and every timestamp, plus when and by whom it was
 * built.
 * Inputs: target_case_id; reason_given (required: why a pack is needed). Returns: the pack.
 * Errors: insufficient_privilege unless the caller holds the safeguarding permission and may see
 *   the case; check_violation for a blank reason.
 * Logged as safeguarding.evidence_pack_built, a sensitive read (architecture 1.8.3): the pack
 * holds the email address.
 */
create or replace function public.admin_build_evidence_pack(target_case_id uuid, reason_given text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  owner public.profiles;
begin
  -- Step 1: the safeguarding permission, a case the caller may see, a reason.
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('safeguarding', 'act') then
    raise exception 'Only safeguarding staff can build an evidence pack.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(reason_given, '')) = '' then
    raise exception 'Write why the pack is needed.' using errcode = 'check_violation';
  end if;
  select * into owner from public.profiles where profiles.id = target.user_id;
  -- Step 2: the sensitive read is logged before anything is returned.
  perform public.log_staff_action('safeguarding.evidence_pack_built', 'cases', target.id::text, target.user_id,
    btrim(reason_given), null, jsonb_build_object('built_at', now()));
  -- Step 3: the pack.
  return jsonb_build_object(
    'built_at', now(),
    'built_by', (select profiles.handle from public.profiles where profiles.id = (select auth.uid())),
    'case', jsonb_build_object('reference', target.reference, 'source', target.source, 'tier', target.tier,
      'top_reason', target.top_reason, 'received_at', target.received_at, 'deadline_at', target.deadline_at,
      'status', target.status, 'decision', target.decision, 'decided_at', target.decided_at),
    'item', jsonb_build_object('type', target.item_type, 'id', target.item_id,
      'summary', public.reportable_item_summary(target.item_type, target.item_id),
      'content', public.case_item_content(target),
      'moderated_state', public.moderated_state_of(target.item_type, target.item_id)),
    'account', jsonb_build_object('user_id', owner.id, 'handle', owner.handle, 'pen_name', owner.pen_name,
      'email', (select users.email from auth.users where users.id = owner.id),
      'country_code', owner.country_code, 'joined_at', owner.created_at,
      'age_band', public.age_band_from_birth(owner.birth_year, owner.birth_month, owner.age_check_result, current_date)),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('reference', reports.reference, 'reason', reports.reason,
        'details', reports.details, 'reporter_handle', reporter.handle, 'reporter_age_band', reports.reporter_age_band,
        'created_at', reports.created_at) order by reports.created_at)
      from public.reports join public.profiles as reporter on reporter.id = reports.user_id
      where reports.case_id = target.id), '[]'::jsonb),
    'notices', coalesce((select jsonb_agg(jsonb_build_object('reference', public_notices.reference,
        'kind', public_notices.kind, 'reason', public_notices.reason, 'explanation', public_notices.explanation,
        'received_at', public_notices.received_at) order by public_notices.received_at)
      from public.public_notices where public_notices.case_id = target.id), '[]'::jsonb),
    'decisions', coalesce((select jsonb_agg(jsonb_build_object('action', case_actions.action, 'note', case_actions.note,
        'created_at', case_actions.created_at) order by case_actions.created_at)
      from public.case_actions where case_actions.case_id = target.id), '[]'::jsonb));
end;
$$;

comment on function public.admin_build_evidence_pack(uuid, text) is
  'Safeguarding staff: the case, item, account and timestamps as one JSON pack for the authorities; a logged sensitive read (S1-E10-10).';
revoke execute on function public.admin_build_evidence_pack(uuid, text) from public, anon;
grant execute on function public.admin_build_evidence_pack(uuid, text) to authenticated;

/* ---------- Referrals ---------- */

create table public.safeguarding_referrals (
  id uuid primary key default gen_random_uuid(),
  -- Kept as long as its case (docs/retention.md).
  case_id uuid not null references public.cases (id) on delete cascade,
  -- The staff member who made the referral (rule 15's owner column for a staff action).
  user_id uuid not null references public.profiles (id),
  -- Which authority, and the reference it gave us.
  authority_name text not null,
  authority_reference text,
  note text,
  referred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safeguarding_referrals_authority_is_named check (btrim(authority_name) <> '' and char_length(authority_name) <= 200),
  constraint safeguarding_referrals_reference_length check (authority_reference is null or char_length(authority_reference) <= 200),
  constraint safeguarding_referrals_note_length check (note is null or char_length(note) <= 4000)
);

comment on table public.safeguarding_referrals is
  'kind: staff
Each referral of a safeguarding case to the police or a prosecutor (S1-E10-10; DSA art. 18). Append-only; kept 3 years after the case closes.';

create index safeguarding_referrals_case_id_idx on public.safeguarding_referrals (case_id);

alter table public.safeguarding_referrals enable row level security;

/**
 * safeguarding_referrals_select_safeguarding: only staff with the safeguarding permission read
 * referrals (criterion 3), and only for a case they may see. Written through admin_log_referral().
 */
create policy safeguarding_referrals_select_safeguarding
  on public.safeguarding_referrals for select to authenticated
  using (
    (select public.staff_may('safeguarding', 'view'))
    and exists (select 1 from public.cases
                where cases.id = safeguarding_referrals.case_id and public.may_see_case(cases.is_safeguarding))
  );

grant select on public.safeguarding_referrals to authenticated;

/**
 * admin_log_referral: records that a case was referred to an authority (criterion 2).
 * Inputs: target_case_id; authority_name (required); authority_reference and note_text (optional).
 * Returns: the referral's ID.
 * Errors: insufficient_privilege unless the caller holds the safeguarding permission and may see
 *   the case; check_violation for a blank authority. Logged as safeguarding.referred.
 */
create or replace function public.admin_log_referral(
  target_case_id uuid,
  authority_name text,
  authority_reference text default null,
  note_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.cases;
  new_referral_id uuid;
begin
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.may_see_case(target.is_safeguarding) or not public.staff_may('safeguarding', 'act') then
    raise exception 'Only safeguarding staff can log a referral.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(authority_name, '')) = '' then
    raise exception 'Name the authority.' using errcode = 'check_violation';
  end if;
  insert into public.safeguarding_referrals (case_id, user_id, authority_name, authority_reference, note)
  values (target.id, (select auth.uid()), btrim(authority_name), nullif(btrim(coalesce(authority_reference, '')), ''),
          nullif(btrim(coalesce(note_text, '')), ''))
  returning id into new_referral_id;
  perform public.log_staff_action('safeguarding.referred', 'safeguarding_referrals', new_referral_id::text, target.user_id,
    nullif(btrim(coalesce(note_text, '')), ''), null,
    jsonb_build_object('case_id', target.id, 'authority_name', btrim(authority_name), 'authority_reference', authority_reference));
  return new_referral_id;
end;
$$;

comment on function public.admin_log_referral(uuid, text, text, text) is
  'Safeguarding staff log a referral of a case to an authority; logged (S1-E10-10; DSA art. 18).';
revoke execute on function public.admin_log_referral(uuid, text, text, text) from public, anon;
grant execute on function public.admin_log_referral(uuid, text, text, text) to authenticated;

/**
 * admin_case_referrals: a case's referrals, oldest first, with who made each.
 * Input: the case's ID. Returns: a JSON array of {authority_name, authority_reference, note,
 * referred_at, referred_by}. Errors: insufficient_privilege as admin_log_referral().
 */
create or replace function public.admin_case_referrals(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.cases where id = target_case_id and public.may_see_case(is_safeguarding))
     or not public.staff_may('safeguarding', 'view') then
    raise exception 'Only safeguarding staff see referrals.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('authority_name', referrals.authority_name,
        'authority_reference', referrals.authority_reference, 'note', referrals.note,
        'referred_at', referrals.referred_at, 'referred_by', profiles.handle) order by referrals.referred_at)
    from public.safeguarding_referrals as referrals
    join public.profiles on profiles.id = referrals.user_id
    where referrals.case_id = target_case_id), '[]'::jsonb);
end;
$$;

comment on function public.admin_case_referrals(uuid) is 'Safeguarding staff: a case''s referrals to authorities (S1-E10-10).';
revoke execute on function public.admin_case_referrals(uuid) from public, anon;
grant execute on function public.admin_case_referrals(uuid) to authenticated;
