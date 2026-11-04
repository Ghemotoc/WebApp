/*
 * Migration: booking a sponsor into an ad slot, our own house ads and the fill order (story
 * S1-E12-05; bundle SPONSORS-e1).
 *
 * What it adds:
 * - `ad_bookings`: an approved campaign booked into one ad slot for some days, with the page
 *   context it should match (category, tags, language). One sponsor per slot per day (proposal in
 *   the story): a booking that overlaps another live booking of the same slot is refused, and the
 *   refusal names the clashing campaign.
 * - `house_ads`: our own ads written by staff, in Romanian and English, leading to one of our own
 *   pages, between two dates, for one slot or any slot (criterion 6).
 * - admin_book_ad_slot(), admin_change_ad_booking(), admin_cancel_ad_booking(),
 *   admin_save_house_ad() and admin_archive_house_ad(): owner and admin only, each logged in the
 *   audit log in the same transaction (criterion 7).
 * - admin_ad_placements(): every slot on every public page against the next six weeks, each week
 *   Booked, House ad, Ad network or Free (criterion 1). Class spaces have no slots (Q70).
 * - page_ads() fills each slot in the story's order (criterion 3): 1. the sponsor booked for that
 *   slot and day whose context matches; a booked slot is that sponsor's alone, so no other sponsor
 *   takes it that day (when the context doesn't match, it goes on to step 2). Unbooked slots still
 *   take a live campaign by its placement, as since part b1 (proposal). 2. a house ad: staff's
 *   own first, then our landing pages (contests and campaigns). 3. the ad network when it is on
 *   (S1-E12-04). 4. our built-in house ads, so the space is never blank.
 * Nothing about the reader is read anywhere (criterion 4): the network ad still carries only the
 * account and the ad unit.
 * Who calls it: Staff › Sponsors › Placements (part e2) through the admin_* functions; every
 * public page through page_ads() (usePageAds()). Tests: 275-ad-bookings.test.sql.
 */

/* ---------- 1. Bookings ---------- */

create table public.ad_bookings (
  id uuid primary key default gen_random_uuid(),
  -- The admin who made the booking. Staff-written platform data.
  user_id uuid references public.profiles (id) on delete set null,
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete restrict,
  slot_key text not null references public.ad_slots (slot_key) on delete restrict,
  -- The days it runs, both included, in Romanian time.
  starts_on date not null,
  ends_on date not null,
  -- The pages it matches: category slugs, normalised tags and language codes; empty means any.
  target_categories text[] not null default '{}',
  target_tags text[] not null default '{}',
  target_languages text[] not null default '{}',
  -- A cancelled booking stays for the record and frees the slot.
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_bookings_dates_in_order check (ends_on >= starts_on)
);
comment on table public.ad_bookings is
  'kind: platform
A sponsor campaign booked into one ad slot for some days, with the page context it matches (S1-E12-05). No personal data; user_id is the admin who booked it.';
create trigger ad_bookings_set_updated_at
  before update on public.ad_bookings
  for each row execute function public.set_updated_at();
alter table public.ad_bookings enable row level security;
grant select on public.ad_bookings to authenticated;
create index ad_bookings_slot_days_idx on public.ad_bookings (slot_key, starts_on, ends_on)
  where cancelled_at is null;
create index ad_bookings_campaign_idx on public.ad_bookings (campaign_id);

/**
 * Policy ad_bookings_select_sponsor_staff: owner and admin in a staff session read every booking.
 * Readers never read bookings; page_ads() reads them for the page.
 */
create policy ad_bookings_select_sponsor_staff
  on public.ad_bookings for select to authenticated
  using (public.staff_may('sponsors', 'view'));
comment on policy ad_bookings_select_sponsor_staff on public.ad_bookings is
  'Allows owner and admin in a staff session to read slot bookings (S1-E12-05, architecture 1.8.3).';

/* ---------- 2. Our own house ads ---------- */

create table public.house_ads (
  id uuid primary key default gen_random_uuid(),
  -- The admin who wrote it. Staff-written platform data.
  user_id uuid references public.profiles (id) on delete set null,
  title_ro text not null constraint house_ads_title_ro_length check (char_length(btrim(title_ro)) between 1 and 80),
  title_en text not null constraint house_ads_title_en_length check (char_length(btrim(title_en)) between 1 and 80),
  text_ro text not null default '' constraint house_ads_text_ro_length check (char_length(text_ro) <= 140),
  text_en text not null default '' constraint house_ads_text_en_length check (char_length(text_en) <= 140),
  -- One of our own pages: a path such as /c/poetry-week, never another site (criterion 6).
  link_path text not null constraint house_ads_link_is_ours
    check (link_path ~ '^/[A-Za-z0-9._~/?=&%-]*$' and link_path !~ '^//' and char_length(link_path) <= 200),
  -- One slot, or null for any slot.
  slot_key text references public.ad_slots (slot_key) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint house_ads_dates_in_order check (ends_on >= starts_on)
);
comment on table public.house_ads is
  'kind: platform
Our own ads, written by staff in Romanian and English, leading to one of our own pages between two dates (S1-E12-05). No personal data; user_id is the admin who wrote it.';
create trigger house_ads_set_updated_at
  before update on public.house_ads
  for each row execute function public.set_updated_at();
alter table public.house_ads enable row level security;
grant select on public.house_ads to authenticated;

/**
 * Policy house_ads_select_sponsor_staff: owner and admin in a staff session read every house ad.
 * Readers get only live ones, through page_ads().
 */
create policy house_ads_select_sponsor_staff
  on public.house_ads for select to authenticated
  using (public.staff_may('sponsors', 'view'));
comment on policy house_ads_select_sponsor_staff on public.house_ads is
  'Allows owner and admin in a staff session to read house ads (S1-E12-05, architecture 1.8.3).';

/* ---------- 3. Booking, changing and cancelling ---------- */

/**
 * ad_booking_clash: the live booking of the same slot that overlaps the given days. Internal.
 * Inputs: the slot, the days and the booking to leave out (when changing one; null otherwise).
 * Returns: the clashing campaign's name and dates as "Name (2027-02-01 to 2027-02-14)", or null.
 *   A booking whose campaign has ended no longer holds the slot.
 */
create or replace function public.ad_booking_clash(
  wanted_slot_key text, first_day date, last_day date, leave_out_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select campaigns.name || ' (' || bookings.starts_on || ' to ' || bookings.ends_on || ')'
  from public.ad_bookings as bookings
  join public.sponsor_campaigns as campaigns on campaigns.id = bookings.campaign_id
  where bookings.slot_key = wanted_slot_key
    and bookings.cancelled_at is null
    and campaigns.state <> 'ended'
    and bookings.id is distinct from leave_out_id
    and bookings.starts_on <= last_day and bookings.ends_on >= first_day
  order by bookings.starts_on
  limit 1;
$$;
comment on function public.ad_booking_clash(text, date, date, uuid) is
  'Internal: the live booking of a slot that overlaps some days, named for the refusal (S1-E12-05).';
revoke execute on function public.ad_booking_clash(text, date, date, uuid) from public, anon, authenticated;

/**
 * require_free_ad_slot: locks the slot and refuses days another booking already holds. Internal.
 * Inputs: the slot, the days, the booking to leave out. The lock makes two admins booking the same
 *   slot at once wait for each other, so both can't pass the check.
 * Errors: no_data_found for an unknown slot; check_violation for days in the wrong order or
 *   before today; exclusion_violation when the days clash (hint 'clash', the campaign in the detail).
 */
create or replace function public.require_free_ad_slot(
  wanted_slot_key text, first_day date, last_day date, leave_out_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clash text;
begin
  -- Step 1: the slot exists; locking it queues any other booking of the same slot behind this one.
  perform 1 from public.ad_slots where slot_key = wanted_slot_key for update;
  if not found then
    raise exception 'No such ad slot.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the days make sense and haven't passed.
  if first_day is null or last_day is null or last_day < first_day then
    raise exception 'Pick a first and a last day, in that order.' using errcode = 'check_violation';
  elsif last_day < public.romania_today() then
    raise exception 'Those days have passed.' using errcode = 'check_violation';
  end if;
  -- Step 3: one sponsor per slot per day (S1-E12-05 criterion 2, proposal).
  clash := public.ad_booking_clash(wanted_slot_key, first_day, last_day, leave_out_id);
  if clash is not null then
    raise exception 'That slot is already booked on some of those days.'
      using errcode = 'exclusion_violation', hint = 'clash', detail = clash;
  end if;
end;
$$;
comment on function public.require_free_ad_slot(text, date, date, uuid) is
  'Internal: locks an ad slot and refuses days another live booking holds (S1-E12-05).';
revoke execute on function public.require_free_ad_slot(text, date, date, uuid) from public, anon, authenticated;

/**
 * ad_booking_targets: the targeting lists from a booking's fields, cleaned. Internal.
 * Input: fields {categories, tags, languages}, each a JSON array of text; missing means any.
 * Returns: one row (categories, tags, languages); tags are normalised as campaign tags are.
 */
create or replace function public.ad_booking_targets(fields jsonb)
returns table (categories text[], tags text[], languages text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select array_agg(distinct value) from jsonb_array_elements_text(coalesce(fields -> 'categories', '[]')) as value
              where value in (select slug from public.categories)), '{}'),
    coalesce((select array_agg(distinct public.normalise_tag(value)) from jsonb_array_elements_text(coalesce(fields -> 'tags', '[]')) as value
              where public.normalise_tag(value) <> ''), '{}'),
    coalesce((select array_agg(distinct value) from jsonb_array_elements_text(coalesce(fields -> 'languages', '[]')) as value
              where value in ('ro', 'en')), '{}');
$$;
comment on function public.ad_booking_targets(jsonb) is
  'Internal: cleans a booking''s category, tag and language lists (S1-E12-05).';
revoke execute on function public.ad_booking_targets(jsonb) from public, anon, authenticated;

/**
 * admin_book_ad_slot: books an approved campaign into one slot for some days (criterion 2).
 * Inputs: target_campaign_id; fields {slot_key, starts_on, ends_on, categories, tags, languages}
 *   (the three lists are optional; empty means any page).
 * Returns: the booking's ID.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found for an unknown
 *   campaign or slot; check_violation when the campaign isn't approved, is a "Sponsored by"
 *   credit, or the days fall outside its own dates; exclusion_violation on a clash (the clashing
 *   campaign in the detail). Logged as 'ad_booking.made'.
 */
create or replace function public.admin_book_ad_slot(target_campaign_id uuid, fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
  first_day date := (fields ->> 'starts_on')::date;
  last_day date := (fields ->> 'ends_on')::date;
  targets record;
  new_id uuid;
begin
  -- Step 1: only owner and admin, and only an approved banner campaign.
  perform public.require_sponsor_staff();
  campaign := public.locked_sponsor_campaign(target_campaign_id, array['approved']::public.sponsor_campaign_state[]);
  if campaign.placement in ('category', 'contest') then
    raise exception 'A "Sponsored by" credit doesn''t go in an ad slot.' using errcode = 'check_violation';
  end if;
  -- Step 2: the booking stays inside the campaign's own dates.
  if first_day < campaign.starts_on or last_day > campaign.ends_on then
    raise exception 'Book days inside the campaign''s own dates.' using errcode = 'check_violation',
      detail = campaign.starts_on || ' to ' || campaign.ends_on;
  end if;
  -- Step 3: the slot is free on those days, then the booking is saved and logged.
  perform public.require_free_ad_slot(fields ->> 'slot_key', first_day, last_day, null);
  select * into targets from public.ad_booking_targets(fields);
  insert into public.ad_bookings (user_id, campaign_id, slot_key, starts_on, ends_on,
    target_categories, target_tags, target_languages)
  values (auth.uid(), campaign.id, fields ->> 'slot_key', first_day, last_day,
    targets.categories, targets.tags, targets.languages)
  returning id into new_id;
  perform public.log_staff_action('ad_booking.made', 'ad_bookings', new_id::text, null, null, null,
    (select to_jsonb(bookings) from public.ad_bookings as bookings where bookings.id = new_id));
  return new_id;
end;
$$;
comment on function public.admin_book_ad_slot(uuid, jsonb) is
  'Books an approved campaign into one ad slot for some days, refusing clashes; owner and admin only; logged (S1-E12-05).';
revoke execute on function public.admin_book_ad_slot(uuid, jsonb) from public, anon;
grant execute on function public.admin_book_ad_slot(uuid, jsonb) to authenticated;

/**
 * admin_change_ad_booking: moves a booking's days or changes the pages it matches (criterion 7).
 * Inputs: target_booking_id; fields {starts_on, ends_on, categories, tags, languages}. The slot
 *   and the campaign stay; to move slot, cancel and book again.
 * Returns: nothing.
 * Errors: insufficient_privilege; no_data_found for an unknown booking; check_violation for a
 *   cancelled booking or days outside the campaign's; exclusion_violation on a clash. Logged as
 *   'ad_booking.changed' with the before and after values.
 */
create or replace function public.admin_change_ad_booking(target_booking_id uuid, fields jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.ad_bookings;
  campaign public.sponsor_campaigns;
  first_day date := (fields ->> 'starts_on')::date;
  last_day date := (fields ->> 'ends_on')::date;
  targets record;
begin
  -- Step 1: only owner and admin, and only a booking that still stands.
  perform public.require_sponsor_staff();
  select * into booking from public.ad_bookings where id = target_booking_id for update;
  if booking.id is null then
    raise exception 'No such booking.' using errcode = 'no_data_found';
  elsif booking.cancelled_at is not null then
    raise exception 'That booking was cancelled.' using errcode = 'check_violation';
  end if;
  -- Step 2: the new days sit inside the campaign's dates and clash with no other booking.
  select * into campaign from public.sponsor_campaigns where id = booking.campaign_id;
  if first_day < campaign.starts_on or last_day > campaign.ends_on then
    raise exception 'Book days inside the campaign''s own dates.' using errcode = 'check_violation',
      detail = campaign.starts_on || ' to ' || campaign.ends_on;
  end if;
  perform public.require_free_ad_slot(booking.slot_key, first_day, last_day, booking.id);
  -- Step 3: save and log the before and after.
  select * into targets from public.ad_booking_targets(fields);
  update public.ad_bookings
  set starts_on = first_day, ends_on = last_day, target_categories = targets.categories,
      target_tags = targets.tags, target_languages = targets.languages
  where id = booking.id;
  perform public.log_staff_action('ad_booking.changed', 'ad_bookings', booking.id::text, null, null,
    to_jsonb(booking), (select to_jsonb(bookings) from public.ad_bookings as bookings where bookings.id = booking.id));
end;
$$;
comment on function public.admin_change_ad_booking(uuid, jsonb) is
  'Changes a slot booking''s days or pages, refusing clashes; owner and admin only; logged (S1-E12-05).';
revoke execute on function public.admin_change_ad_booking(uuid, jsonb) from public, anon;
grant execute on function public.admin_change_ad_booking(uuid, jsonb) to authenticated;

/**
 * admin_cancel_ad_booking: cancels a booking with a reason, freeing the slot (criterion 7).
 * Inputs: target_booking_id, reason. Returns: nothing.
 * Errors: insufficient_privilege; no_data_found; check_violation for an empty reason or a booking
 *   already cancelled. Logged as 'ad_booking.cancelled'.
 */
create or replace function public.admin_cancel_ad_booking(target_booking_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.ad_bookings;
begin
  perform public.require_sponsor_staff();
  if btrim(coalesce(reason, '')) = '' then
    raise exception 'Say why it is cancelled.' using errcode = 'check_violation';
  end if;
  select * into booking from public.ad_bookings where id = target_booking_id for update;
  if booking.id is null then
    raise exception 'No such booking.' using errcode = 'no_data_found';
  elsif booking.cancelled_at is not null then
    raise exception 'That booking was already cancelled.' using errcode = 'check_violation';
  end if;
  update public.ad_bookings set cancelled_at = now() where id = booking.id;
  perform public.log_staff_action('ad_booking.cancelled', 'ad_bookings', booking.id::text, null, btrim(reason),
    jsonb_build_object('cancelled_at', null), jsonb_build_object('cancelled_at', now()));
end;
$$;
comment on function public.admin_cancel_ad_booking(uuid, text) is
  'Cancels a slot booking with a reason, freeing the slot; owner and admin only; logged (S1-E12-05).';
revoke execute on function public.admin_cancel_ad_booking(uuid, text) from public, anon;
grant execute on function public.admin_cancel_ad_booking(uuid, text) to authenticated;

/* ---------- 4. Saving our own house ads ---------- */

/**
 * admin_save_house_ad: adds a house ad, or changes one (criterion 6).
 * Inputs: target_house_ad_id (null for a new one); fields {title_ro, title_en, text_ro, text_en,
 *   link_path, slot_key (null or missing for any slot), starts_on, ends_on}.
 * Returns: the house ad's ID.
 * Errors: insufficient_privilege; no_data_found for an unknown or archived house ad;
 *   check_violation for a missing title in either language, a link that isn't one of our own
 *   pages, an unknown slot or days in the wrong order (the table's checks). Logged as
 *   'house_ad.saved' with the before and after values.
 */
create or replace function public.admin_save_house_ad(target_house_ad_id uuid, fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_values jsonb;
  saved_id uuid;
begin
  perform public.require_sponsor_staff();
  -- Step 1: a change starts from a house ad that exists and isn't archived.
  if target_house_ad_id is not null then
    select to_jsonb(house_ads) into before_values from public.house_ads
    where id = target_house_ad_id and archived_at is null for update;
    if before_values is null then
      raise exception 'No such house ad.' using errcode = 'no_data_found';
    end if;
  end if;
  -- Step 2: save; the table's checks refuse a missing title, someone else's link or bad days.
  if target_house_ad_id is null then
    insert into public.house_ads (user_id, title_ro, title_en, text_ro, text_en, link_path, slot_key, starts_on, ends_on)
    values (auth.uid(), btrim(fields ->> 'title_ro'), btrim(fields ->> 'title_en'),
      btrim(coalesce(fields ->> 'text_ro', '')), btrim(coalesce(fields ->> 'text_en', '')),
      btrim(fields ->> 'link_path'), nullif(fields ->> 'slot_key', ''),
      (fields ->> 'starts_on')::date, (fields ->> 'ends_on')::date)
    returning id into saved_id;
  else
    update public.house_ads
    set title_ro = btrim(fields ->> 'title_ro'), title_en = btrim(fields ->> 'title_en'),
        text_ro = btrim(coalesce(fields ->> 'text_ro', '')), text_en = btrim(coalesce(fields ->> 'text_en', '')),
        link_path = btrim(fields ->> 'link_path'), slot_key = nullif(fields ->> 'slot_key', ''),
        starts_on = (fields ->> 'starts_on')::date, ends_on = (fields ->> 'ends_on')::date
    where id = target_house_ad_id
    returning id into saved_id;
  end if;
  -- Step 3: the audit log keeps the before and after.
  perform public.log_staff_action('house_ad.saved', 'house_ads', saved_id::text, null, null, before_values,
    (select to_jsonb(house_ads) from public.house_ads where id = saved_id));
  return saved_id;
end;
$$;
comment on function public.admin_save_house_ad(uuid, jsonb) is
  'Adds or changes one of our own house ads; owner and admin only; logged (S1-E12-05).';
revoke execute on function public.admin_save_house_ad(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_house_ad(uuid, jsonb) to authenticated;

/**
 * admin_archive_house_ad: takes a house ad off every page for good, keeping it for the record.
 * Input: target_house_ad_id. Returns: nothing.
 * Errors: insufficient_privilege; no_data_found for an unknown or already archived house ad.
 *   Logged as 'house_ad.archived'.
 */
create or replace function public.admin_archive_house_ad(target_house_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_sponsor_staff();
  update public.house_ads set archived_at = now() where id = target_house_ad_id and archived_at is null;
  if not found then
    raise exception 'No such house ad.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('house_ad.archived', 'house_ads', target_house_ad_id::text, null, null,
    jsonb_build_object('archived_at', null), jsonb_build_object('archived_at', now()));
end;
$$;
comment on function public.admin_archive_house_ad(uuid) is
  'Takes one of our house ads off every page, keeping it for the record; owner and admin only; logged (S1-E12-05).';
revoke execute on function public.admin_archive_house_ad(uuid) from public, anon;
grant execute on function public.admin_archive_house_ad(uuid) to authenticated;

/* ---------- 5. Filling a slot ---------- */

/**
 * ad_network_is_ready: is the ad network switched on and set up? Internal.
 * Returns: true when the flag `ad_network` is on and both settings look right (ADR 0014).
 */
create or replace function public.ad_network_is_ready()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('ad_network')
    and coalesce(public.setting_value('ad_network_publisher_id') #>> '{}', '') ~ '^ca-pub-[0-9]{16}$'
    and coalesce(public.setting_value('ad_network_slot_id') #>> '{}', '') ~ '^[0-9]{6,12}$';
$$;
comment on function public.ad_network_is_ready() is
  'Internal: the ad network is switched on and its account and ad unit look right (S1-E12-04, S1-E12-05).';
revoke execute on function public.ad_network_is_ready() from public, anon, authenticated;

/**
 * ad_slot_is_booked: does a live booking hold this slot today? Internal.
 * Input: the slot. Returns: true when a booking that isn't cancelled covers today and its
 *   campaign is live, so no other sponsor takes the slot today (one sponsor per slot per day).
 */
create or replace function public.ad_slot_is_booked(wanted_slot_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ad_bookings as bookings
    join public.sponsor_campaigns as campaigns on campaigns.id = bookings.campaign_id
    where bookings.slot_key = wanted_slot_key and bookings.cancelled_at is null
      and public.romania_today() between bookings.starts_on and bookings.ends_on
      and public.sponsor_campaign_is_live(campaigns));
$$;
comment on function public.ad_slot_is_booked(text) is
  'Internal: a live booking holds this ad slot today (S1-E12-05).';
revoke execute on function public.ad_slot_is_booked(text) from public, anon, authenticated;

/**
 * booked_sponsor_ad_for_slot: the sponsor booked into this slot today whose context matches the
 * page, or null. Internal.
 * Inputs: the slot, the page's context and the ads already on the page.
 * Returns: the same JSON as sponsor_ad_for_slot() (label 'sponsored'). Matching reads only the
 *   page's category, tag and language (criterion 4).
 */
create or replace function public.booked_sponsor_ad_for_slot(
  wanted_slot_key text, context jsonb, used_keys text[]
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
  from public.ad_bookings as bookings
  join public.sponsor_campaigns as campaigns on campaigns.id = bookings.campaign_id
  join public.sponsors on sponsors.id = campaigns.sponsor_id
  left join public.picture_checks on picture_checks.id = campaigns.picture_id
  where bookings.slot_key = wanted_slot_key and bookings.cancelled_at is null
    and public.romania_today() between bookings.starts_on and bookings.ends_on
    and public.sponsor_campaign_is_live(campaigns)
    and not ('campaign:' || campaigns.id) = any (coalesce(used_keys, '{}'))
    and (cardinality(bookings.target_categories) = 0 or context ->> 'category' = any (bookings.target_categories))
    and (cardinality(bookings.target_tags) = 0
         or public.normalise_tag(coalesce(context ->> 'tag', '')) = any (bookings.target_tags))
    and (cardinality(bookings.target_languages) = 0 or context ->> 'language' = any (bookings.target_languages))
  limit 1;
$$;
comment on function public.booked_sponsor_ad_for_slot(text, jsonb, text[]) is
  'Internal: the sponsor booked into a slot today, when the page''s context matches (S1-E12-05).';
revoke execute on function public.booked_sponsor_ad_for_slot(text, jsonb, text[]) from public, anon, authenticated;

/**
 * staff_house_ad_for_slot: one of staff's own house ads for this slot (or any slot) today, not
 * yet on the page, or null. Internal.
 * Inputs: the slot, the page and the ads already on the page.
 * Returns: {key 'house_ad:<id>', label 'house', kind 'staff', title_ro, title_en, text_ro,
 *   text_en, link_path}; among several, a hash of the ad, the page and the day picks, never the
 *   reader. One written for this slot comes before one written for any slot.
 */
create or replace function public.staff_house_ad_for_slot(
  wanted_slot_key text, wanted_page_key text, used_keys text[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('key', 'house_ad:' || house_ads.id, 'label', 'house', 'kind', 'staff',
      'page_slug', null, 'title_ro', house_ads.title_ro, 'title_en', house_ads.title_en,
      'text_ro', nullif(house_ads.text_ro, ''), 'text_en', nullif(house_ads.text_en, ''),
      'link_path', house_ads.link_path)
  from public.house_ads
  where house_ads.archived_at is null
    and public.romania_today() between house_ads.starts_on and house_ads.ends_on
    and (house_ads.slot_key is null or house_ads.slot_key = wanted_slot_key)
    and not ('house_ad:' || house_ads.id) = any (coalesce(used_keys, '{}'))
  order by house_ads.slot_key is null,
    md5(house_ads.id::text || wanted_page_key || public.romania_today()::text)
  limit 1;
$$;
comment on function public.staff_house_ad_for_slot(text, text, text[]) is
  'Internal: staff''s own house ad for a slot today, not yet on the page (S1-E12-05).';
revoke execute on function public.staff_house_ad_for_slot(text, text, text[]) from public, anon, authenticated;

/**
 * fill_ad_slot: the ad for one slot, in the story's fill order (criterion 3). Internal.
 * Inputs: the slot's key and format, the page, its context and the ads already on the page.
 * Returns: the ad as JSON, never null while a built-in house ad is left.
 *   1. the booked sponsor whose context matches; an unbooked slot takes a live campaign by its
 *      placement (part b1, proposal); a booked slot never goes to another sponsor that day;
 *   2. staff's own house ad, then our landing pages; 3. the ad network when it is on;
 *   4. a built-in house ad.
 */
create or replace function public.fill_ad_slot(
  wanted_slot_key text, slot_format public.ad_format, wanted_page_key text, context jsonb, used_keys text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen jsonb;
begin
  -- Step 1: the sponsor booked into this slot today, when the page matches its booking.
  chosen := public.booked_sponsor_ad_for_slot(wanted_slot_key, context, used_keys);
  -- Step 1b: an unbooked slot can still take a live campaign by its placement.
  if chosen is null and not public.ad_slot_is_booked(wanted_slot_key) then
    chosen := public.sponsor_ad_for_slot(wanted_slot_key, wanted_page_key, context, used_keys);
  end if;
  -- Steps 2 to 4: our own house ads, the network, then our built-in ads.
  return coalesce(chosen,
    public.staff_house_ad_for_slot(wanted_slot_key, wanted_page_key, used_keys),
    public.landing_house_ad_for_slot(wanted_page_key, used_keys),
    public.network_ad_for_slot(slot_format, used_keys),
    public.house_ad_for_slot(wanted_page_key, used_keys));
end;
$$;
comment on function public.fill_ad_slot(text, public.ad_format, text, jsonb, text[]) is
  'Internal: one ad slot''s ad in the fill order booked sponsor, house ad, network, built-in (S1-E12-05).';
revoke execute on function public.fill_ad_slot(text, public.ad_format, text, jsonb, text[]) from public, anon, authenticated;

/**
 * network_ad_for_slot: unchanged in what it returns (part d); it now asks ad_network_is_ready().
 */
create or replace function public.network_ad_for_slot(slot_format public.ad_format, used_keys text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: off unless the flag is on and the account's two values look right (ADR 0014).
  if not public.ad_network_is_ready() then
    return null;
  end if;
  -- Step 2: only the wide banner, and only once per page (S1-E12-04 criterion 2).
  if slot_format <> 'wide' or 'network' = any (coalesce(used_keys, '{}')) then
    return null;
  end if;
  return jsonb_build_object('key', 'network', 'label', 'ad', 'kind', 'network',
    'page_slug', null, 'title_ro', null, 'title_en', null,
    'publisher_id', public.setting_value('ad_network_publisher_id') #>> '{}',
    'slot_id', public.setting_value('ad_network_slot_id') #>> '{}');
end;
$$;

/**
 * page_ads: every slot of one public page with the ad that fills it (S1-E12-01, S1-E12-02,
 * S1-E12-04, S1-E12-05).
 * Inputs: page_key and context, as before (category, tag and language choose; space_slug and
 *   story_slug only keep class spaces and class-only stories free of ads). Nothing about the
 *   reader is read.
 * Returns: a JSON array in slot order of {slot_key, position, format, matched, ad}; each slot is
 *   filled by fill_ad_slot() in the story's order; never the same ad twice on a page. Empty for a
 *   page with no slots, a class space or a class-only story (Q70).
 * Errors: none. Where it fits: usePageAds() on every public page.
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
  -- Step 1: class spaces and class-only stories show no ad at all, of any kind (Q70).
  if public.ads_are_barred(clean_context) then
    return '[]'::jsonb;
  end if;
  -- Step 2: only the page's own context explains the choice; nothing else is kept or returned.
  matched := jsonb_strip_nulls(jsonb_build_object('category', clean_context ->> 'category',
    'tag', clean_context ->> 'tag', 'language', clean_context ->> 'language'));
  -- Step 3: each slot in order, filled in the story's order.
  for slot in
    select ad_slots.slot_key, ad_slots.position, ad_slots.format from public.ad_slots
    where ad_slots.page_key = page_ads.page_key and ad_slots.is_on
    order by ad_slots.position
  loop
    chosen := public.fill_ad_slot(slot.slot_key, slot.format, page_ads.page_key, clean_context, used_keys);
    if chosen is not null then
      used_keys := used_keys || (chosen ->> 'key');
    end if;
    filled := filled || jsonb_build_array(jsonb_build_object('slot_key', slot.slot_key, 'position', slot.position,
      'format', slot.format, 'matched', matched, 'ad', chosen));
  end loop;
  return filled;
end;
$$;

/* ---------- 6. Placements for staff ---------- */

/**
 * ad_placement_week: what fills one slot in one week, for Placements. Internal.
 * Inputs: the slot's key and format, the week's Monday and whether the network is ready.
 * Returns: {week_start, state, booking_id, campaign_name, sponsor_name, house_title} where state
 *   is 'booked' (a live booking covers some of the week), 'house' (one of staff's house ads
 *   does), 'network' (the network would fill this wide slot) or 'free' (our built-in ads fill it).
 */
create or replace function public.ad_placement_week(
  wanted_slot_key text, slot_format public.ad_format, week_start date, network_ready boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booked record;
  house_title text;
begin
  -- Step 1: a booking that stands and whose campaign hasn't ended.
  select bookings.id, campaigns.name as campaign_name, sponsors.name as sponsor_name into booked
  from public.ad_bookings as bookings
  join public.sponsor_campaigns as campaigns on campaigns.id = bookings.campaign_id
  join public.sponsors on sponsors.id = campaigns.sponsor_id
  where bookings.slot_key = wanted_slot_key and bookings.cancelled_at is null and campaigns.state <> 'ended'
    and bookings.starts_on <= week_start + 6 and bookings.ends_on >= week_start
  order by bookings.starts_on limit 1;
  if booked.id is not null then
    return jsonb_build_object('week_start', week_start, 'state', 'booked', 'booking_id', booked.id,
      'campaign_name', booked.campaign_name, 'sponsor_name', booked.sponsor_name);
  end if;
  -- Step 2: one of staff's own house ads for this slot or any slot.
  select house_ads.title_en into house_title from public.house_ads
  where house_ads.archived_at is null and (house_ads.slot_key is null or house_ads.slot_key = wanted_slot_key)
    and house_ads.starts_on <= week_start + 6 and house_ads.ends_on >= week_start
  order by house_ads.slot_key is null, house_ads.starts_on limit 1;
  if house_title is not null then
    return jsonb_build_object('week_start', week_start, 'state', 'house', 'house_title', house_title);
  end if;
  -- Step 3: the network for a wide slot when it is on, else our built-in ads.
  return jsonb_build_object('week_start', week_start,
    'state', case when network_ready and slot_format = 'wide' then 'network' else 'free' end);
end;
$$;
comment on function public.ad_placement_week(text, public.ad_format, date, boolean) is
  'Internal: what fills one ad slot in one week, for Staff › Sponsors › Placements (S1-E12-05).';
revoke execute on function public.ad_placement_week(text, public.ad_format, date, boolean) from public, anon, authenticated;

/**
 * admin_ad_placements: every ad slot on every public page against the next weeks (criterion 1).
 * Input: week_count, how many weeks from this week's Monday (default 6, at most 12).
 * Returns: {weeks: [Monday dates], network_ready, slots: [{slot_key, page_key, position, format,
 *   is_on, weeks: [ad_placement_week()]}], bookings: [every booking that stands and hasn't
 *   ended, with its campaign and sponsor names]}. Class spaces have no slots of their own (Q70).
 * Errors: insufficient_privilege for anyone but owner and admin.
 */
create or replace function public.admin_ad_placements(week_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_monday date := date_trunc('week', public.romania_today())::date;
  weeks date[];
  network_ready boolean := public.ad_network_is_ready();
begin
  perform public.require_sponsor_staff();
  -- Step 1: the Mondays shown, 1 to 12 of them.
  select array_agg(first_monday + 7 * step order by step) into weeks
  from generate_series(0, least(greatest(coalesce(week_count, 6), 1), 12) - 1) as step;
  -- Step 2: each slot with each week's state, then the bookings for the list under the grid.
  return jsonb_build_object(
    'weeks', to_jsonb(weeks),
    'network_ready', network_ready,
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object('slot_key', ad_slots.slot_key, 'page_key', ad_slots.page_key,
          'position', ad_slots.position, 'format', ad_slots.format, 'is_on', ad_slots.is_on,
          'weeks', (select jsonb_agg(public.ad_placement_week(ad_slots.slot_key, ad_slots.format, monday, network_ready)
                                     order by monday) from unnest(weeks) as monday))
        order by ad_slots.page_key, ad_slots.position)
      from public.ad_slots), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(to_jsonb(bookings) || jsonb_build_object('campaign_name', campaigns.name,
          'sponsor_name', sponsors.name) order by bookings.starts_on, bookings.slot_key)
      from public.ad_bookings as bookings
      join public.sponsor_campaigns as campaigns on campaigns.id = bookings.campaign_id
      join public.sponsors on sponsors.id = campaigns.sponsor_id
      where bookings.cancelled_at is null and campaigns.state <> 'ended'
        and bookings.ends_on >= public.romania_today()), '[]'::jsonb));
end;
$$;
comment on function public.admin_ad_placements(integer) is
  'Every ad slot against the next weeks (Booked, House ad, Ad network or Free) and the bookings; owner and admin only (S1-E12-05).';
revoke execute on function public.admin_ad_placements(integer) from public, anon;
grant execute on function public.admin_ad_placements(integer) to authenticated;

/**
 * admin_house_ads: every house ad that isn't archived, newest first, for Staff › Sponsors.
 * Returns: a JSON array of house_ads rows. Errors: insufficient_privilege for anyone but owner
 *   and admin.
 */
create or replace function public.admin_house_ads()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_sponsor_staff();
  return coalesce((select jsonb_agg(to_jsonb(house_ads) order by house_ads.created_at desc)
                   from public.house_ads where house_ads.archived_at is null), '[]'::jsonb);
end;
$$;
comment on function public.admin_house_ads() is
  'Every house ad that isn''t archived; owner and admin only (S1-E12-05).';
revoke execute on function public.admin_house_ads() from public, anon;
grant execute on function public.admin_house_ads() to authenticated;
