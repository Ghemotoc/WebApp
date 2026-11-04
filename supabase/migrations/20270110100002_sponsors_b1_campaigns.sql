/*
 * Migration: sponsor campaigns, the minors check and "Sponsored" ads (bundle SPONSORS, part b1;
 * story S1-E12-02).
 *
 * What it adds:
 * - ad_blocked_categories: what we never advertise, for any age. Gambling and betting, tobacco and
 *   every nicotine product, alcohol and politics are fixed (Robert, 2 Nov 2026: staff can add
 *   categories but never remove these four); dating is fixed too, because the published terms
 *   already promise it (legal v0.1, "Ads and sponsors"). Weight loss (board AdminSponsors) is
 *   seeded as one staff may remove. Part d passes the list to the ad network;
 * - sponsors: the companies or public bodies that pay for a campaign. A name and a website, no
 *   personal data;
 * - sponsor_campaigns (criterion 1): the sponsor, a picture with alt text in both languages, one
 *   line of text, a link, a placement (a banner below the chapter, in story lists or between
 *   shelves on Discover; "Sponsored by" on a category or a contest; or a featured slot), the
 *   pages it may show on (category, tag and language only, never anything about the reader) and
 *   its dates. A bookshop deal may carry a discount code, shown as text; links with tracking or
 *   affiliate parameters are refused (Robert, 2 Nov 2026: "never affiliate or tracking links");
 * - the review (criterion 2): a campaign goes live only after a member of staff ticks every check,
 *   the first being "suitable for under-18s: no alcohol, gambling, tobacco, dating or similar",
 *   and its picture passed the picture check and a moderator's approval. Any later change sends it
 *   back to draft, so nothing unreviewed reaches a page;
 * - page_ads() now fills each slot with a live, matching sponsor campaign first (labelled
 *   "sponsored", with the sponsor's name), then our own house ads, never the same ad twice;
 * - sponsor_credit() (criterion 3): the sponsor of a category or contest, for the "Sponsored by"
 *   line. It only names the sponsor; it never changes which stories are listed or their order;
 * - class spaces (criterion 4, Q70): no placement can point at a space, and page_ads() still
 *   returns nothing in a class space or on a class-only story.
 * Who calls it: Staff › Sponsors (part b2) through the admin_* functions; the ad slots
 * (src/features/ads/) through page_ads(); the category and contest pages (part b3) through
 * sponsor_credit(). Tests: supabase/tests/database/271-sponsor-campaigns.test.sql.
 */

/* ---------- 1. Types ---------- */

-- Where a campaign shows (criterion 1; board AdminSponsors "Placement").
create type public.sponsor_placement as enum (
  'chapter_banner', 'list_banner', 'discover_banner', 'category', 'contest', 'featured_slot');
comment on type public.sponsor_placement is
  'Where a sponsor campaign shows: a banner below the chapter, in story lists or between shelves on Discover; "Sponsored by" on a category or contest; or a featured slot (S1-E12-02).';

-- A campaign's place in the review (criterion 2).
create type public.sponsor_campaign_state as enum ('draft', 'in_review', 'approved', 'sent_back', 'ended');
comment on type public.sponsor_campaign_state is
  'Draft, waiting for review, approved (live between its dates), sent back with a note, or ended early (S1-E12-02).';

/* ---------- 2. What we never advertise ---------- */

create table public.ad_blocked_categories (
  id uuid primary key default gen_random_uuid(),
  -- A fixed key, for example alcohol; part d maps it to the ad network's own category list.
  category_key text not null unique
    constraint ad_blocked_categories_key_shape check (category_key ~ '^[a-z][a-z_]{2,40}$'),
  -- The label staff and the public see, in both languages.
  label_ro text not null constraint ad_blocked_categories_label_ro check (char_length(btrim(label_ro)) between 1 and 80),
  label_en text not null constraint ad_blocked_categories_label_en check (char_length(btrim(label_en)) between 1 and 80),
  -- Fixed categories can never be removed (Robert, 2 Nov 2026).
  is_fixed boolean not null default false,
  -- The admin who added it; null for the ones seeded here. Staff-written platform data.
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ad_blocked_categories is
  'kind: platform
What no ad or sponsor may promote, for any age (S1-E12-02; Robert, 2 Nov 2026). No personal data; user_id is the admin who added a row.';
create trigger ad_blocked_categories_set_updated_at
  before update on public.ad_blocked_categories
  for each row execute function public.set_updated_at();
alter table public.ad_blocked_categories enable row level security;
grant select on public.ad_blocked_categories to anon, authenticated;

/**
 * Policy ad_blocked_categories_select_all: anyone may read what we never advertise; the terms
 * already say it in words, and the list holds no personal data. Staff change it only through
 * admin_add_ad_blocked_category() and admin_remove_ad_blocked_category().
 */
create policy ad_blocked_categories_select_all
  on public.ad_blocked_categories for select to anon, authenticated
  using (true);
comment on policy ad_blocked_categories_select_all on public.ad_blocked_categories is
  'Allows everyone to read what we never advertise; no personal data (S1-E12-02).';

insert into public.ad_blocked_categories (category_key, label_ro, label_en, is_fixed) values
  ('gambling', 'Jocuri de noroc și pariuri', 'Gambling and betting', true),
  ('tobacco_nicotine', 'Tutun, vape și orice produs cu nicotină', 'Tobacco, vaping and every nicotine product', true),
  ('alcohol', 'Alcool', 'Alcohol', true),
  ('politics', 'Politică', 'Politics', true),
  ('dating', 'Întâlniri romantice', 'Dating', true),
  ('weight_loss', 'Slăbit', 'Weight loss', false);

/* ---------- 3. Sponsors ---------- */

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  -- The admin who added it. Staff-written platform data, so it may outlive their account.
  user_id uuid references public.profiles (id) on delete set null,
  -- The name shown on "Sponsored by …" and on every sponsored ad.
  name text not null constraint sponsors_name_length check (char_length(btrim(name)) between 1 and 80),
  -- The sponsor's own site, for staff; never a tracking link.
  website_url text not null default ''
    constraint sponsors_website_shape check (website_url = '' or website_url ~ '^https://[^/@\s]+(/\S*)?$'),
  -- An archived sponsor keeps its past campaigns but gets no new ones.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.sponsors is
  'kind: platform
Companies and public bodies that sponsor campaigns (S1-E12-02). No personal data; user_id is the admin who added it.';
create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function public.set_updated_at();
alter table public.sponsors enable row level security;
grant select on public.sponsors to authenticated;

/**
 * Policy sponsors_select_sponsor_staff: owner and admin (the Sponsors area) read the sponsor list.
 * Readers see a sponsor's name only inside an ad or a "Sponsored by" line, through page_ads()
 * and sponsor_credit().
 */
create policy sponsors_select_sponsor_staff
  on public.sponsors for select to authenticated
  using (public.staff_may('sponsors', 'view'));
comment on policy sponsors_select_sponsor_staff on public.sponsors is
  'Allows owner and admin in a staff session to read sponsors (S1-E12-02, architecture 1.8.3).';

/* ---------- 4. Campaigns ---------- */

create table public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors (id) on delete restrict,
  -- The admin who created it. Staff-written platform data.
  user_id uuid references public.profiles (id) on delete set null,
  name text not null default '' constraint sponsor_campaigns_name_length check (char_length(name) <= 100),
  placement public.sponsor_placement not null,
  -- For "Sponsored by" on a category: which one.
  category_slug text references public.categories (slug) on delete restrict,
  -- For "Sponsored by" on a contest: which one.
  contest_id uuid references public.contests (id) on delete restrict,
  -- The pages it may show on: category slugs, normalised tags and language codes; empty means any.
  target_categories text[] not null default '{}',
  target_tags text[] not null default '{}',
  target_languages text[] not null default '{}',
  -- The creative: a checked picture, its alt text and one line of text, in both languages.
  picture_id uuid references public.picture_checks (id) on delete set null,
  alt_ro text not null default '',
  alt_en text not null default '',
  text_ro text not null default '',
  text_en text not null default '',
  -- Where a click goes: the sponsor's own page, https only, no tracking or affiliate parameters.
  link_url text not null default '',
  -- A bookshop's discount code, shown as text with a copy button.
  discount_code text not null default '',
  -- The days it runs, both included, in Romanian time. A flat fee for the period, no view targets.
  starts_on date,
  ends_on date,
  state public.sponsor_campaign_state not null default 'draft',
  submitted_at timestamptz,
  -- The review: who decided, when, which checks they ticked and the note sent back.
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_checks text[] not null default '{}',
  review_note text not null default '' constraint sponsor_campaigns_note_length check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A category credit names its category, a contest credit its contest; banners name neither.
  constraint sponsor_campaigns_category_matches check ((placement = 'category') = (category_slug is not null)),
  constraint sponsor_campaigns_contest_matches check ((placement = 'contest') = (contest_id is not null)),
  constraint sponsor_campaigns_dates_in_order check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
comment on table public.sponsor_campaigns is
  'kind: platform
Sponsor campaigns: creative, link, placement, page targeting and dates, reviewed before going live (S1-E12-02). No personal data; user_id is the admin who created it.';
create trigger sponsor_campaigns_set_updated_at
  before update on public.sponsor_campaigns
  for each row execute function public.set_updated_at();
alter table public.sponsor_campaigns enable row level security;
grant select on public.sponsor_campaigns to authenticated;
create index sponsor_campaigns_live_idx on public.sponsor_campaigns (placement, starts_on, ends_on)
  where state = 'approved';

/**
 * Policy sponsor_campaigns_select_sponsor_staff: owner and admin read every campaign, at every
 * stage of its review. Readers get only live campaigns, through page_ads() and sponsor_credit().
 */
create policy sponsor_campaigns_select_sponsor_staff
  on public.sponsor_campaigns for select to authenticated
  using (public.staff_may('sponsors', 'view'));
comment on policy sponsor_campaigns_select_sponsor_staff on public.sponsor_campaigns is
  'Allows owner and admin in a staff session to read every sponsor campaign (S1-E12-02).';

/* ---------- 5. The creative's picture ---------- */

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners',
                    'signature-pictures', 'landing-pictures', 'sponsor-creatives'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind = 'space_banner' and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or (kind = 'landing_picture' and bucket = 'landing-pictures')
  or (kind = 'sponsor_creative' and bucket = 'sponsor-creatives')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner',
                  'signature_picture', 'landing_picture', 'sponsor_creative'));

-- Private: served only once the check passed and a moderator approved it; 5 MB; three types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-creatives', 'sponsor-creatives', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * sponsor_creative_upload_allowed: may the signed-in person add this file to `sponsor-creatives`?
 * Input: object_name, "<campaign ID>/<random ID>.<ending>". Returns: true only while
 *   picture_uploads is on, for owner and admin (the Sponsors area), under a campaign that is a
 *   draft or was sent back (an approved creative is never swapped without a new review).
 * Where it fits: the sponsor_creatives_insert_sponsor_staff policy and register_sponsor_creative().
 */
create or replace function public.sponsor_creative_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('picture_uploads')
    and public.staff_may('sponsors', 'act')
    and coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    and exists (
      select 1 from public.sponsor_campaigns
      where sponsor_campaigns.id = split_part(object_name, '/', 1)::uuid
        and sponsor_campaigns.state in ('draft', 'sent_back'));
$$;
comment on function public.sponsor_creative_upload_allowed(text) is
  'True for owner and admin, a random file name under a draft or sent-back campaign and picture_uploads on (SPONSORS-b1).';
revoke execute on function public.sponsor_creative_upload_allowed(text) from public, anon;
grant execute on function public.sponsor_creative_upload_allowed(text) to authenticated;

/**
 * Policy sponsor_creatives_insert_sponsor_staff: owner and admin add a creative under a draft
 * campaign's folder while picture uploads are on.
 */
create policy sponsor_creatives_insert_sponsor_staff
  on storage.objects for insert to authenticated
  with check (bucket_id = 'sponsor-creatives' and public.sponsor_creative_upload_allowed(name));
comment on policy sponsor_creatives_insert_sponsor_staff on storage.objects is
  'Allows owner and admin to add a creative under a draft campaign while picture_uploads is on (SPONSORS-b1).';

/**
 * Policy sponsor_creatives_select_visible: anyone, signed in or not, reads a creative once its
 * check passed and a moderator approved it (S1-E10-05 criterion 2).
 */
create policy sponsor_creatives_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'sponsor-creatives' and public.picture_is_visible(bucket_id, name));
comment on policy sponsor_creatives_select_visible on storage.objects is
  'Allows anyone to read a sponsor creative once it passed its check and was approved (SPONSORS-b1).';

/**
 * Policy sponsor_creatives_select_uploader_and_staff: the uploader reads the creative at every
 * stage, and moderation staff read the pictures they decide on (S1-E10-05 criterion 3).
 */
create policy sponsor_creatives_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'sponsor-creatives' and public.picture_reader_may_see(bucket_id, name));
comment on policy sponsor_creatives_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a sponsor creative at any stage of its check (SPONSORS-b1).';

/**
 * require_sponsor_staff: refuses anyone who may not act in Sponsors. Internal.
 * Errors: insufficient_privilege unless the caller is owner or admin in a staff session
 *   (architecture 1.8.3: Sponsors is owner and admin only).
 */
create or replace function public.require_sponsor_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('sponsors', 'act') then
    raise exception 'Only the owner and admins can manage sponsors.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;
comment on function public.require_sponsor_staff() is 'Internal: refuses anyone who may not manage sponsors (S1-E12-02).';
revoke execute on function public.require_sponsor_staff() from public, anon, authenticated;

/**
 * register_sponsor_creative: records a creative an admin just uploaded, as pending its check, and
 * puts it on the campaign.
 * Input: target_path ("<campaign ID>/<random ID>.<ending>" in `sponsor-creatives`).
 * Returns: the picture's ID, which the screen sends to /api/picture-check.
 * Errors: insufficient_privilege for anyone but owner and admin; feature_not_supported while
 *   picture_uploads is off; check_violation when the file isn't there, isn't the caller's or the
 *   campaign can't take a new picture; program_limit_exceeded over the hourly upload limit.
 * Where it fits: uploadSponsorCreative() (part b2), straight after the upload.
 */
create or replace function public.register_sponsor_creative(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: owner or admin, while uploads are on.
  perform public.require_sponsor_staff();
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, under a draft campaign.
  if not public.sponsor_creative_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'sponsor-creatives'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a draft campaign.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row, then the campaign points at it.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'sponsor-creatives', target_path, 'sponsor_creative')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  update public.sponsor_campaigns set picture_id = new_id
  where id = split_part(target_path, '/', 1)::uuid;
  return new_id;
end;
$$;
comment on function public.register_sponsor_creative(text) is
  'Records a just-uploaded sponsor creative as pending its check; owner and admin only (SPONSORS-b1).';
revoke execute on function public.register_sponsor_creative(text) from public, anon;
grant execute on function public.register_sponsor_creative(text) to authenticated;

/**
 * picture_needs_person: must a moderator approve this picture before anyone else sees it?
 * Input: the picture. Returns: true for a picture in a story rated All ages or 13+, for any
 *   picture uploaded by someone under 16 (brief section 2), for every landing page picture
 *   (CONTESTS-a2a) and, from part b1, for every sponsor creative, because ads reach every age.
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
    or picture.kind in ('landing_picture', 'sponsor_creative')
    or exists (select 1 from public.stories
               where stories.id = picture.story_id and stories.rating in ('all_ages', '13_plus'));
$$;

/* ---------- 6. What a campaign needs before review ---------- */

/**
 * sponsor_review_checks: the checks a reviewer ticks before approving (criterion 2; board
 * AdminSponsors "Check the creative"). Internal; the screen shows each with its words.
 * Returns: suitable_for_minors (no alcohol, gambling, tobacco, dating or anything in
 *   ad_blocked_categories), alt_text_describes, link_goes_to_sponsor and text_makes_sense.
 */
create or replace function public.sponsor_review_checks()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['suitable_for_minors', 'alt_text_describes', 'link_goes_to_sponsor', 'text_makes_sense'];
$$;
comment on function public.sponsor_review_checks() is
  'The four checks every sponsor creative needs before approval (S1-E12-02 criterion 2).';
grant execute on function public.sponsor_review_checks() to authenticated;

/**
 * sponsor_link_problem: what is wrong with a campaign's link, or null. Internal.
 * Input: the link. Returns: link:empty, link:not_https (only https, no user name in the
 *   address, at most 500 characters) or link:tracking (utm_*, gclid, fbclid, msclkid, ref, aff,
 *   affiliate, tag and similar: Robert, 2 Nov 2026, "never affiliate or tracking links").
 */
create or replace function public.sponsor_link_problem(link text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(link, '')) = '' then 'link:empty'
    when char_length(link) > 500 or link !~ '^https://[^/?#@\s]+([/?#]\S*)?$' then 'link:not_https'
    when link ~* '[?&#](utm_[a-z_]+|gclid|fbclid|msclkid|dclid|yclid|mc_cid|mc_eid|ref|aff|affid|aff_id|affiliate|affiliate_id|tag|clickid|click_id|partner|irclickid)='
      then 'link:tracking'
  end;
$$;
comment on function public.sponsor_link_problem(text) is
  'Internal: a sponsor link must be https with no tracking or affiliate parameters (S1-E12-02).';

/**
 * sponsor_creative_problems: what a campaign's picture and words still need. Internal.
 * Input: the campaign. Returns: problems such as picture:missing, en.alt:empty, ro.text:too_long.
 *   Banners and featured slots need a picture, alt text and one line of text in both languages;
 *   a "Sponsored by" credit needs none, but a picture it has needs alt text.
 */
create or replace function public.sponsor_creative_problems(campaign public.sponsor_campaigns)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  problems text[] := '{}';
  is_credit boolean := campaign.placement in ('category', 'contest');
  language_code text;
  alt_text text;
  line_text text;
begin
  -- Step 1: a banner or featured slot has a picture.
  if campaign.picture_id is null and not is_credit then
    problems := problems || 'picture:missing'::text;
  end if;
  -- Step 2: alt text for any picture, and the line of text for a banner, in both languages.
  foreach language_code in array array['ro', 'en'] loop
    alt_text := btrim(case language_code when 'ro' then campaign.alt_ro else campaign.alt_en end);
    line_text := btrim(case language_code when 'ro' then campaign.text_ro else campaign.text_en end);
    if campaign.picture_id is not null and alt_text = '' then
      problems := problems || (language_code || '.alt:empty');
    elsif char_length(alt_text) > 200 then
      problems := problems || (language_code || '.alt:too_long');
    end if;
    if line_text = '' and not is_credit then
      problems := problems || (language_code || '.text:empty');
    elsif char_length(line_text) > 140 then
      problems := problems || (language_code || '.text:too_long');
    end if;
  end loop;
  return problems;
end;
$$;
comment on function public.sponsor_creative_problems(public.sponsor_campaigns) is
  'Internal: a campaign''s picture, alt text and line of text problems (S1-E12-02 criterion 1).';

/**
 * sponsor_campaign_problems: everything a campaign still needs before it can be sent for review
 * or approved (criterion 1). Internal, and read by the staff screen through admin_* functions.
 * Input: the campaign. Returns: a list of problem codes, empty when it is complete:
 *   name:empty, sponsor:archived, the creative's problems, link problems (banners and featured
 *   slots need a link; a credit's link is optional), discount_code:bad, dates:missing,
 *   dates:past and targets:unknown_category.
 */
create or replace function public.sponsor_campaign_problems(campaign public.sponsor_campaigns)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := public.sponsor_creative_problems(campaign);
  link_problem text := public.sponsor_link_problem(campaign.link_url);
begin
  -- Step 1: a name, and a sponsor that is still active.
  if btrim(campaign.name) = '' then
    problems := 'name:empty'::text || problems;
  end if;
  if exists (select 1 from public.sponsors where sponsors.id = campaign.sponsor_id and sponsors.archived_at is not null) then
    problems := problems || 'sponsor:archived'::text;
  end if;
  -- Step 2: the link; a credit may go without one.
  if link_problem is not null
     and not (link_problem = 'link:empty' and campaign.placement in ('category', 'contest')) then
    problems := problems || link_problem;
  end if;
  -- Step 3: a discount code is letters, digits and hyphens.
  if campaign.discount_code <> '' and campaign.discount_code !~ '^[A-Za-z0-9-]{3,40}$' then
    problems := problems || 'discount_code:bad'::text;
  end if;
  -- Step 4: both dates, and not over before it starts.
  if campaign.starts_on is null or campaign.ends_on is null then
    problems := problems || 'dates:missing'::text;
  elsif campaign.ends_on < public.romania_today() then
    problems := problems || 'dates:past'::text;
  end if;
  -- Step 5: the categories it targets exist.
  if exists (select 1 from unnest(campaign.target_categories) as wanted (slug)
             where not exists (select 1 from public.categories where categories.slug = wanted.slug)) then
    problems := problems || 'targets:unknown_category'::text;
  end if;
  return problems;
end;
$$;
comment on function public.sponsor_campaign_problems(public.sponsor_campaigns) is
  'Internal: what a sponsor campaign still needs before review (S1-E12-02 criterion 1).';
revoke execute on function public.sponsor_campaign_problems(public.sponsor_campaigns) from public, anon, authenticated;

/* ---------- 7. Staff: sponsors and blocked categories ---------- */

/**
 * admin_save_sponsor: adds a sponsor, or renames one or changes its website.
 * Inputs: target_sponsor_id (null to add), sponsor_name, website (https or empty).
 * Returns: the sponsor's ID. Errors: insufficient_privilege for anyone but owner and admin;
 *   check_violation for an empty name or a website that isn't https; no_data_found for an
 *   unknown sponsor. Where it fits: Staff › Sponsors (part b2). Logged in the audit log.
 */
create or replace function public.admin_save_sponsor(target_sponsor_id uuid, sponsor_name text, website text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.sponsors;
  saved_id uuid;
begin
  -- Step 1: owner or admin only.
  perform public.require_sponsor_staff();
  -- Step 2: add, or change the existing row (the table's checks refuse a bad name or website).
  if target_sponsor_id is null then
    insert into public.sponsors (user_id, name, website_url)
    values ((select auth.uid()), btrim(coalesce(sponsor_name, '')), btrim(coalesce(website, '')))
    returning id into saved_id;
  else
    select * into before_row from public.sponsors where id = target_sponsor_id for update;
    if before_row.id is null then
      raise exception 'No such sponsor.' using errcode = 'no_data_found';
    end if;
    update public.sponsors set name = btrim(coalesce(sponsor_name, '')), website_url = btrim(coalesce(website, ''))
    where id = target_sponsor_id returning id into saved_id;
  end if;
  -- Step 3: the audit log, with before and after.
  perform public.log_staff_action('sponsor.saved', 'sponsors', saved_id::text, null, null,
    case when before_row.id is null then null else jsonb_build_object('name', before_row.name, 'website_url', before_row.website_url) end,
    jsonb_build_object('name', btrim(coalesce(sponsor_name, '')), 'website_url', btrim(coalesce(website, ''))));
  return saved_id;
end;
$$;
comment on function public.admin_save_sponsor(uuid, text, text) is
  'Adds or changes a sponsor; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_save_sponsor(uuid, text, text) from public, anon;
grant execute on function public.admin_save_sponsor(uuid, text, text) to authenticated;

/**
 * admin_add_ad_blocked_category: adds something no ad may promote.
 * Inputs: new_key (lower case, underscores), label_ro, label_en.
 * Returns: nothing. Errors: insufficient_privilege for anyone but owner and admin;
 *   check_violation for a bad key or label; unique_violation when it is already listed.
 * Where it fits: Staff › Sponsors (part b2). Logged.
 */
create or replace function public.admin_add_ad_blocked_category(new_key text, label_ro text, label_en text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_sponsor_staff();
  insert into public.ad_blocked_categories (category_key, label_ro, label_en, user_id)
  values (coalesce(new_key, ''), btrim(coalesce(label_ro, '')), btrim(coalesce(label_en, '')), (select auth.uid()));
  perform public.log_staff_action('ad_blocked_category.added', 'ad_blocked_categories', new_key, null, null, null,
    jsonb_build_object('label_ro', btrim(label_ro), 'label_en', btrim(label_en)));
end;
$$;
comment on function public.admin_add_ad_blocked_category(text, text, text) is
  'Adds a category no ad may promote; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_add_ad_blocked_category(text, text, text) from public, anon;
grant execute on function public.admin_add_ad_blocked_category(text, text, text) to authenticated;

/**
 * admin_remove_ad_blocked_category: removes a category staff added earlier.
 * Inputs: target_key, reason (required). Returns: nothing.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found for an unknown
 *   key; check_violation for a fixed category (gambling, tobacco and nicotine, alcohol, politics
 *   and dating can never be removed: Robert, 2 Nov 2026) or an empty reason. Logged.
 */
create or replace function public.admin_remove_ad_blocked_category(target_key text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.ad_blocked_categories;
begin
  -- Step 1: owner or admin, with a reason.
  perform public.require_sponsor_staff();
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Say why it is removed.' using errcode = 'check_violation';
  end if;
  -- Step 2: never a fixed category.
  select * into removed from public.ad_blocked_categories where category_key = target_key for update;
  if removed.id is null then
    raise exception 'No such category.' using errcode = 'no_data_found';
  elsif removed.is_fixed then
    raise exception 'This category can never be removed.' using errcode = 'check_violation';
  end if;
  -- Step 3: remove it and log it.
  delete from public.ad_blocked_categories where id = removed.id;
  perform public.log_staff_action('ad_blocked_category.removed', 'ad_blocked_categories', target_key, null, btrim(reason),
    jsonb_build_object('label_ro', removed.label_ro, 'label_en', removed.label_en), null);
end;
$$;
comment on function public.admin_remove_ad_blocked_category(text, text) is
  'Removes a staff-added ad category, never a fixed one; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_remove_ad_blocked_category(text, text) from public, anon;
grant execute on function public.admin_remove_ad_blocked_category(text, text) to authenticated;

/* ---------- 8. Staff: campaigns and their review ---------- */

/**
 * sponsor_campaign_from_json: a campaign row filled from the editor's JSON. Internal.
 * Inputs: the row as it stands (or a new one) and the editor's fields: sponsor_id, name,
 *   placement, category_slug, contest_id, target_categories, target_tags (normalised here),
 *   target_languages, alt_ro, alt_en, text_ro, text_en, link_url, discount_code, starts_on,
 *   ends_on. The picture is set only by register_sponsor_creative().
 * Returns: the row with those fields, back in draft with the review cleared.
 */
create or replace function public.sponsor_campaign_from_json(campaign public.sponsor_campaigns, fields jsonb)
returns public.sponsor_campaigns
language plpgsql
stable
set search_path = ''
as $$
begin
  campaign.sponsor_id := (fields ->> 'sponsor_id')::uuid;
  campaign.name := btrim(coalesce(fields ->> 'name', ''));
  campaign.placement := (fields ->> 'placement')::public.sponsor_placement;
  -- A category or contest only for its own placement, so the table's checks hold.
  campaign.category_slug := case when campaign.placement = 'category' then nullif(fields ->> 'category_slug', '') end;
  campaign.contest_id := case when campaign.placement = 'contest' then nullif(fields ->> 'contest_id', '')::uuid end;
  -- Targeting: the page's category, tag and language only.
  campaign.target_categories := array(select jsonb_array_elements_text(coalesce(fields -> 'target_categories', '[]')));
  campaign.target_tags := array(select distinct public.normalise_tag(tag)
                                from jsonb_array_elements_text(coalesce(fields -> 'target_tags', '[]')) as tag);
  campaign.target_languages := array(select jsonb_array_elements_text(coalesce(fields -> 'target_languages', '[]')));
  -- The creative's words, the link and the code.
  campaign.alt_ro := btrim(coalesce(fields ->> 'alt_ro', ''));
  campaign.alt_en := btrim(coalesce(fields ->> 'alt_en', ''));
  campaign.text_ro := btrim(coalesce(fields ->> 'text_ro', ''));
  campaign.text_en := btrim(coalesce(fields ->> 'text_en', ''));
  campaign.link_url := btrim(coalesce(fields ->> 'link_url', ''));
  campaign.discount_code := btrim(coalesce(fields ->> 'discount_code', ''));
  campaign.starts_on := nullif(fields ->> 'starts_on', '')::date;
  campaign.ends_on := nullif(fields ->> 'ends_on', '')::date;
  -- Any change needs a new review (criterion 2).
  campaign.state := 'draft';
  campaign.submitted_at := null;
  campaign.reviewer_user_id := null;
  campaign.reviewed_at := null;
  campaign.review_checks := '{}';
  -- The note from a send-back stays, so the editor still sees what to fix.
  campaign.review_note := coalesce(campaign.review_note, '');
  return campaign;
end;
$$;
comment on function public.sponsor_campaign_from_json(public.sponsor_campaigns, jsonb) is
  'Internal: fills a campaign from the editor''s fields and puts it back in draft (S1-E12-02).';
revoke execute on function public.sponsor_campaign_from_json(public.sponsor_campaigns, jsonb) from public, anon, authenticated;

/**
 * admin_save_sponsor_campaign: creates a campaign or saves changes to one, as a draft.
 * Inputs: target_campaign_id (null to create) and fields (see sponsor_campaign_from_json()).
 * Returns: {id, problems}: the campaign's ID and what it still needs before review.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found for an unknown
 *   campaign; check_violation for an ended campaign, an unknown or archived sponsor, a bad
 *   placement or a category or contest that doesn't exist; invalid_text_representation for a
 *   badly formed date or ID. Saving an approved or waiting campaign sends it back to draft, so it
 *   needs a new review. Logged. Where it fits: Staff › Sponsors › New campaign (part b2).
 */
create or replace function public.admin_save_sponsor_campaign(target_campaign_id uuid, fields jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.sponsor_campaigns;
  saved public.sponsor_campaigns;
begin
  -- Step 1: owner or admin; an existing campaign that hasn't ended.
  perform public.require_sponsor_staff();
  if target_campaign_id is not null then
    select * into before_row from public.sponsor_campaigns where id = target_campaign_id for update;
    if before_row.id is null then
      raise exception 'No such campaign.' using errcode = 'no_data_found';
    elsif before_row.state = 'ended' then
      raise exception 'An ended campaign can''t change.' using errcode = 'check_violation';
    end if;
  end if;
  -- Step 2: the fields, for an active sponsor.
  saved := public.sponsor_campaign_from_json(before_row, coalesce(fields, '{}'));
  if not exists (select 1 from public.sponsors where id = saved.sponsor_id and archived_at is null) then
    raise exception 'Pick an active sponsor.' using errcode = 'check_violation';
  end if;
  -- Step 3: write it (the table's checks refuse a placement without its category or contest).
  if before_row.id is null then
    saved.id := gen_random_uuid();
    saved.user_id := (select auth.uid());
    saved.created_at := now();
    saved.updated_at := now();
    insert into public.sponsor_campaigns select saved.*;
  else
    update public.sponsor_campaigns set (sponsor_id, name, placement, category_slug, contest_id, target_categories,
      target_tags, target_languages, alt_ro, alt_en, text_ro, text_en, link_url, discount_code, starts_on, ends_on,
      state, submitted_at, reviewer_user_id, reviewed_at, review_checks) =
      (saved.sponsor_id, saved.name, saved.placement, saved.category_slug, saved.contest_id, saved.target_categories,
      saved.target_tags, saved.target_languages, saved.alt_ro, saved.alt_en, saved.text_ro, saved.text_en,
      saved.link_url, saved.discount_code, saved.starts_on, saved.ends_on, saved.state, saved.submitted_at,
      saved.reviewer_user_id, saved.reviewed_at, saved.review_checks)
    where id = saved.id;
  end if;
  -- Step 4: the audit log, then what it still needs.
  perform public.log_staff_action('sponsor_campaign.saved', 'sponsor_campaigns', saved.id::text, null, null,
    case when before_row.id is null then null else to_jsonb(before_row) end, to_jsonb(saved));
  return jsonb_build_object('id', saved.id, 'problems', to_jsonb(public.sponsor_campaign_problems(saved)));
end;
$$;
comment on function public.admin_save_sponsor_campaign(uuid, jsonb) is
  'Creates or saves a sponsor campaign as a draft; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_save_sponsor_campaign(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_sponsor_campaign(uuid, jsonb) to authenticated;

/**
 * locked_sponsor_campaign: the campaign, locked for a change, in one of the wanted states.
 * Internal. Inputs: the campaign's ID and the states the action may start from.
 * Errors: no_data_found for an unknown campaign; check_violation in any other state.
 */
create or replace function public.locked_sponsor_campaign(
  target_campaign_id uuid, allowed_states public.sponsor_campaign_state[]
)
returns public.sponsor_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
begin
  select * into campaign from public.sponsor_campaigns where id = target_campaign_id for update;
  if campaign.id is null then
    raise exception 'No such campaign.' using errcode = 'no_data_found';
  elsif not campaign.state = any (allowed_states) then
    raise exception 'The campaign can''t do that now.' using errcode = 'check_violation',
      hint = 'state:' || campaign.state::text;
  end if;
  return campaign;
end;
$$;
comment on function public.locked_sponsor_campaign(uuid, public.sponsor_campaign_state[]) is
  'Internal: locks a sponsor campaign that is in one of the given states (S1-E12-02).';
revoke execute on function public.locked_sponsor_campaign(uuid, public.sponsor_campaign_state[]) from public, anon, authenticated;

/**
 * admin_submit_sponsor_campaign: sends a complete draft (or a campaign sent back and fixed) to
 * the review queue.
 * Input: target_campaign_id. Returns: nothing.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found; check_violation
 *   when it isn't a draft or sent back, or when something is missing (hint incomplete, with the
 *   problems in the detail, comma separated, as Staff › Contests does). Logged.
 */
create or replace function public.admin_submit_sponsor_campaign(target_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
  problems text[];
begin
  -- Step 1: owner or admin; a draft or a sent-back campaign.
  perform public.require_sponsor_staff();
  campaign := public.locked_sponsor_campaign(target_campaign_id, array['draft', 'sent_back']::public.sponsor_campaign_state[]);
  -- Step 2: nothing missing.
  problems := public.sponsor_campaign_problems(campaign);
  if cardinality(problems) > 0 then
    raise exception 'The campaign isn''t complete.' using errcode = 'check_violation',
      hint = 'incomplete', detail = array_to_string(problems, ',');
  end if;
  -- Step 3: into the queue, logged.
  update public.sponsor_campaigns set state = 'in_review', submitted_at = now() where id = campaign.id;
  perform public.log_staff_action('sponsor_campaign.submitted', 'sponsor_campaigns', campaign.id::text, null, null,
    jsonb_build_object('state', campaign.state), jsonb_build_object('state', 'in_review'));
end;
$$;
comment on function public.admin_submit_sponsor_campaign(uuid) is
  'Sends a complete sponsor campaign to review; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_submit_sponsor_campaign(uuid) from public, anon;
grant execute on function public.admin_submit_sponsor_campaign(uuid) to authenticated;

/**
 * admin_review_sponsor_campaign: approves a campaign waiting for review, or sends it back.
 * Inputs: target_campaign_id; decision, 'approve' or 'send_back'; confirmed_checks, the checks
 *   the reviewer ticked (sponsor_review_checks()); note, required to send back.
 * Returns: nothing. Errors: insufficient_privilege for anyone but owner and admin; no_data_found;
 *   check_violation when it isn't waiting for review, for an unknown decision, when approving
 *   without every check ticked (hint checks:missing), with something missing (hint incomplete,
 *   the problems in the detail) or before its picture passed the check and a moderator's approval (hint
 *   picture:not_checked), or when sending back without a note.
 * Where it fits: Staff › Sponsors › Review queue (part b2). Logged with the reviewer's name and
 *   time on the campaign (board: "Your name and the time go on the campaign").
 */
create or replace function public.admin_review_sponsor_campaign(
  target_campaign_id uuid, decision text, confirmed_checks text[], note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
  new_state public.sponsor_campaign_state;
begin
  -- Step 1: owner or admin; a campaign in the queue; a known decision.
  perform public.require_sponsor_staff();
  campaign := public.locked_sponsor_campaign(target_campaign_id, array['in_review']::public.sponsor_campaign_state[]);
  if decision not in ('approve', 'send_back') then
    raise exception 'Approve or send back.' using errcode = 'check_violation';
  end if;
  -- Step 2: approving needs every check, nothing missing and a picture anyone may see.
  if decision = 'approve' then
    perform public.require_sponsor_approval_ready(campaign, confirmed_checks);
    new_state := 'approved';
  elsif btrim(coalesce(note, '')) = '' then
    raise exception 'Say what needs to change.' using errcode = 'check_violation';
  else
    new_state := 'sent_back';
  end if;
  -- Step 3: the decision, with the reviewer and the time, logged.
  update public.sponsor_campaigns
  set state = new_state, reviewer_user_id = (select auth.uid()), reviewed_at = now(),
      review_checks = case when new_state = 'approved' then public.sponsor_review_checks() else '{}' end,
      review_note = btrim(coalesce(note, ''))
  where id = campaign.id;
  perform public.log_staff_action('sponsor_campaign.' || decision, 'sponsor_campaigns', campaign.id::text, null,
    nullif(btrim(coalesce(note, '')), ''), jsonb_build_object('state', campaign.state),
    jsonb_build_object('state', new_state, 'checks', to_jsonb(coalesce(confirmed_checks, '{}'))));
end;
$$;
comment on function public.admin_review_sponsor_campaign(uuid, text, text[], text) is
  'Approves a sponsor campaign after every check, or sends it back with a note; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_review_sponsor_campaign(uuid, text, text[], text) from public, anon;
grant execute on function public.admin_review_sponsor_campaign(uuid, text, text[], text) to authenticated;

/**
 * require_sponsor_approval_ready: refuses an approval that isn't safe yet. Internal.
 * Inputs: the campaign and the checks the reviewer ticked.
 * Errors: check_violation with hint checks:missing, incomplete (problems in the detail) or
 *   picture:not_checked.
 */
create or replace function public.require_sponsor_approval_ready(campaign public.sponsor_campaigns, confirmed_checks text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := public.sponsor_campaign_problems(campaign);
begin
  -- Step 1: every check ticked, the minors check first among them (criterion 2).
  if not coalesce(confirmed_checks, '{}') @> public.sponsor_review_checks() then
    raise exception 'Tick every check before you approve.' using errcode = 'check_violation', hint = 'checks:missing';
  end if;
  -- Step 2: nothing missing.
  if cardinality(problems) > 0 then
    raise exception 'The campaign isn''t complete.' using errcode = 'check_violation', hint = 'incomplete',
      detail = array_to_string(problems, ',');
  end if;
  -- Step 3: the picture passed its check and a moderator approved it (CLAUDE.md rule 19).
  if campaign.picture_id is not null and not exists (
    select 1 from public.picture_checks
    where picture_checks.id = campaign.picture_id
      and public.picture_is_visible(picture_checks.bucket, picture_checks.path)) then
    raise exception 'The picture is still being checked.' using errcode = 'check_violation', hint = 'picture:not_checked';
  end if;
end;
$$;
comment on function public.require_sponsor_approval_ready(public.sponsor_campaigns, text[]) is
  'Internal: every check, nothing missing and an approved picture before a sponsor campaign goes live (S1-E12-02).';
revoke execute on function public.require_sponsor_approval_ready(public.sponsor_campaigns, text[]) from public, anon, authenticated;

/**
 * admin_end_sponsor_campaign: stops a campaign before its end date, or withdraws one in review.
 * Inputs: target_campaign_id, reason (required). Returns: nothing.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found; check_violation
 *   for an empty reason or a campaign already ended. Logged.
 */
create or replace function public.admin_end_sponsor_campaign(target_campaign_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
begin
  perform public.require_sponsor_staff();
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Say why it ends.' using errcode = 'check_violation';
  end if;
  campaign := public.locked_sponsor_campaign(target_campaign_id,
    array['draft', 'in_review', 'approved', 'sent_back']::public.sponsor_campaign_state[]);
  update public.sponsor_campaigns set state = 'ended' where id = campaign.id;
  perform public.log_staff_action('sponsor_campaign.ended', 'sponsor_campaigns', campaign.id::text, null, btrim(reason),
    jsonb_build_object('state', campaign.state), jsonb_build_object('state', 'ended'));
end;
$$;
comment on function public.admin_end_sponsor_campaign(uuid, text) is
  'Ends a sponsor campaign early, with a reason; owner and admin only; logged (S1-E12-02).';
revoke execute on function public.admin_end_sponsor_campaign(uuid, text) from public, anon;
grant execute on function public.admin_end_sponsor_campaign(uuid, text) to authenticated;

/**
 * admin_sponsor_campaigns: every campaign for Staff › Sponsors, newest first.
 * Returns: a JSON array of campaigns with their sponsor's name, the picture's check state
 *   (picture_state_json()), what each still needs (problems), whether it is live today and the
 *   reviewer's handle. Errors: insufficient_privilege for anyone but owner and admin.
 */
create or replace function public.admin_sponsor_campaigns()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_sponsor_staff();
  return coalesce((
    select jsonb_agg(to_jsonb(campaigns) || jsonb_build_object(
        'sponsor_name', sponsors.name,
        'picture', (select public.picture_state_json(picture_checks) from public.picture_checks
                    where picture_checks.id = campaigns.picture_id),
        'problems', to_jsonb(public.sponsor_campaign_problems(campaigns)),
        'is_live', public.sponsor_campaign_is_live(campaigns),
        'reviewer_handle', (select profiles.handle from public.profiles where profiles.id = campaigns.reviewer_user_id))
      order by campaigns.created_at desc)
    from public.sponsor_campaigns as campaigns
    join public.sponsors on sponsors.id = campaigns.sponsor_id), '[]'::jsonb);
end;
$$;

/* ---------- 9. Live campaigns on the pages ---------- */

/**
 * sponsor_campaign_is_live: is this campaign showing today? Internal.
 * Input: the campaign. Returns: true when approved, between its dates (Romanian time) and, when
 *   it has a picture, the picture is visible to everyone.
 */
create or replace function public.sponsor_campaign_is_live(campaign public.sponsor_campaigns)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select campaign.state = 'approved'
    and public.romania_today() between campaign.starts_on and campaign.ends_on
    and (campaign.picture_id is null or exists (
      select 1 from public.picture_checks
      where picture_checks.id = campaign.picture_id
        and public.picture_is_visible(picture_checks.bucket, picture_checks.path)));
$$;
comment on function public.sponsor_campaign_is_live(public.sponsor_campaigns) is
  'Internal: approved, within its dates and with a visible picture (S1-E12-02).';
revoke execute on function public.sponsor_campaign_is_live(public.sponsor_campaigns) from public, anon, authenticated;

comment on function public.admin_sponsor_campaigns() is
  'Every sponsor campaign with its sponsor, picture state and problems; owner and admin only (S1-E12-02).';
revoke execute on function public.admin_sponsor_campaigns() from public, anon;
grant execute on function public.admin_sponsor_campaigns() to authenticated;

/**
 * sponsor_placement_slots: the ad slots a banner placement may fill. Internal.
 * Input: the placement. Returns: slot keys. Below the chapter: the chapter's end; in story
 *   lists: the cards and banners on Discover's list card, See all, Classics, Search and Library;
 *   between shelves on Discover: Discover's wide banner. "Sponsored by" credits and featured slots
 *   fill no ad slot. Part e lets staff book a campaign into any slot instead.
 */
create or replace function public.sponsor_placement_slots(placement public.sponsor_placement)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case placement
    when 'chapter_banner' then array['chapter_end']
    when 'list_banner' then array['discover_card', 'see_all_card', 'classics_wide', 'search_wide', 'library_wide']
    when 'discover_banner' then array['discover_wide']
    else '{}'::text[]
  end;
$$;
comment on function public.sponsor_placement_slots(public.sponsor_placement) is
  'Internal: which ad slots each banner placement fills (S1-E12-02).';

/**
 * sponsor_ad_for_slot: the live sponsor campaign that fills one slot, or null. Internal.
 * Inputs: the slot's key, the page, the page's context (category, tag, language) and the ads
 *   already on the page. Returns: the ad as JSON ({key, label 'sponsored', kind 'sponsor',
 *   sponsor_name, text and alt in both languages, picture_bucket, picture_path, link_url,
 *   discount_code}). Matching uses only the page's context; among several, the order is a hash of
 *   the campaign, the page and the Romanian date, never anything about the reader (criterion 2 of
 *   S1-E12-01).
 */
create or replace function public.sponsor_ad_for_slot(
  wanted_slot_key text, wanted_page_key text, context jsonb, used_keys text[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
      'key', 'campaign:' || campaigns.id, 'label', 'sponsored', 'kind', 'sponsor',
      'page_slug', null, 'title_ro', null, 'title_en', null,
      'sponsor_name', sponsors.name, 'text_ro', campaigns.text_ro, 'text_en', campaigns.text_en,
      'alt_ro', campaigns.alt_ro, 'alt_en', campaigns.alt_en,
      'picture_bucket', picture_checks.bucket, 'picture_path', picture_checks.path,
      'link_url', campaigns.link_url, 'discount_code', nullif(campaigns.discount_code, ''))
  from public.sponsor_campaigns as campaigns
  join public.sponsors on sponsors.id = campaigns.sponsor_id
  left join public.picture_checks on picture_checks.id = campaigns.picture_id
  where wanted_slot_key = any (public.sponsor_placement_slots(campaigns.placement))
    and public.sponsor_campaign_is_live(campaigns)
    and not ('campaign:' || campaigns.id) = any (coalesce(used_keys, '{}'))
    and (cardinality(campaigns.target_categories) = 0 or context ->> 'category' = any (campaigns.target_categories))
    and (cardinality(campaigns.target_tags) = 0
         or public.normalise_tag(coalesce(context ->> 'tag', '')) = any (campaigns.target_tags))
    and (cardinality(campaigns.target_languages) = 0 or context ->> 'language' = any (campaigns.target_languages))
  order by md5(campaigns.id::text || wanted_page_key || public.romania_today()::text)
  limit 1;
$$;
comment on function public.sponsor_ad_for_slot(text, text, jsonb, text[]) is
  'Internal: the live sponsor campaign matching a slot and the page''s context only (S1-E12-02).';
revoke execute on function public.sponsor_ad_for_slot(text, text, jsonb, text[]) from public, anon, authenticated;

/**
 * house_ad_for_slot: the first of our own ads not yet on the page, or null. Internal.
 * Inputs: the page and the ads already on it. Returns: the ad as JSON ({key, label 'house', kind,
 *   page_slug, title_ro, title_en}), from house_ad_candidates() in its order.
 */
create or replace function public.house_ad_for_slot(wanted_page_key text, used_keys text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('key', candidates.ad_key, 'label', 'house', 'kind', candidates.kind,
      'page_slug', candidates.page_slug, 'title_ro', candidates.title_ro, 'title_en', candidates.title_en)
  from public.house_ad_candidates(wanted_page_key) as candidates
  where not candidates.ad_key = any (coalesce(used_keys, '{}'))
  order by candidates.ad_rank
  limit 1;
$$;
comment on function public.house_ad_for_slot(text, text[]) is
  'Internal: the next house ad not yet on the page (S1-E12-01, S1-E12-02).';
revoke execute on function public.house_ad_for_slot(text, text[]) from public, anon, authenticated;

/**
 * page_ads: every slot of one public page with the ad that fills it (S1-E12-01, S1-E12-02).
 * Inputs: page_key and context, as before (category, tag and language choose; space_slug and
 *   story_slug only keep class spaces and class-only stories free of ads). Nothing about the
 *   reader is read.
 * Returns: a JSON array in slot order of {slot_key, position, format, matched, ad}. From part b1
 *   each slot takes a live sponsor campaign that matches the page first (label 'sponsored'), then
 *   our own house ads; never the same ad twice on a page. Empty for a page with no slots, a class
 *   space or a class-only story (Q70).
 * Errors: none. Where it fits: usePageAds() on every public page; part d adds the ad network and
 *   part e staff bookings.
 */
create or replace function public.page_ads(page_key text, context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_context jsonb := coalesce(context, '{}'::jsonb);
  matched jsonb;
  slot record;
  chosen jsonb;
  used_keys text[] := '{}';
  filled jsonb := '[]'::jsonb;
begin
  -- Step 1: class spaces and class-only stories show no ad at all, sponsored or not (Q70).
  if public.ads_are_barred(clean_context) then
    return '[]'::jsonb;
  end if;
  -- Step 2: only the page's own context explains the choice; nothing else is kept or returned.
  matched := jsonb_strip_nulls(jsonb_build_object('category', clean_context ->> 'category',
    'tag', clean_context ->> 'tag', 'language', clean_context ->> 'language'));
  -- Step 3: each slot in order takes a matching sponsor, else the next house ad not yet shown.
  for slot in
    select ad_slots.slot_key, ad_slots.position, ad_slots.format from public.ad_slots
    where ad_slots.page_key = page_ads.page_key and ad_slots.is_on
    order by ad_slots.position
  loop
    chosen := coalesce(public.sponsor_ad_for_slot(slot.slot_key, page_ads.page_key, clean_context, used_keys),
                       public.house_ad_for_slot(page_ads.page_key, used_keys));
    if chosen is not null then
      used_keys := used_keys || (chosen ->> 'key');
    end if;
    filled := filled || jsonb_build_array(jsonb_build_object('slot_key', slot.slot_key, 'position', slot.position,
      'format', slot.format, 'matched', matched, 'ad', chosen));
  end loop;
  return filled;
end;
$$;

/**
 * sponsor_credit: the sponsor of a category or a contest, for the line "Sponsored by <sponsor>"
 * (criterion 3).
 * Inputs: credit_kind, 'category' or 'contest'; credit_key, the category's slug or the contest's
 *   ID. Returns: {sponsor_name, link_url} for a live campaign, or null. It only names the sponsor:
 *   no list, ranking or search reads it, so a sponsor never changes which stories are listed or
 *   in what order (Q7, Q16). There is no credit for a space, so a class space can never carry one
 *   (Q70). Errors: none. Where it fits: the category and contest pages (part b3).
 */
create or replace function public.sponsor_credit(credit_kind text, credit_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('sponsor_name', sponsors.name, 'link_url', nullif(campaigns.link_url, ''))
  from public.sponsor_campaigns as campaigns
  join public.sponsors on sponsors.id = campaigns.sponsor_id
  where public.sponsor_campaign_is_live(campaigns)
    and ((credit_kind = 'category' and campaigns.placement = 'category' and campaigns.category_slug = credit_key)
      or (credit_kind = 'contest' and campaigns.placement = 'contest' and campaigns.contest_id::text = credit_key))
  order by campaigns.starts_on, campaigns.id
  limit 1;
$$;
comment on function public.sponsor_credit(text, text) is
  'Public: the live sponsor of a category or contest, for "Sponsored by"; never changes lists or ranking (S1-E12-02).';
revoke execute on function public.sponsor_credit(text, text) from public;
grant execute on function public.sponsor_credit(text, text) to anon, authenticated;
