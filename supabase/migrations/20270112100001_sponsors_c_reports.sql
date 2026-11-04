/*
 * Migration: sponsor reports, daily impressions and clicks per campaign (story S1-E12-03;
 * bundle SPONSORS-c).
 *
 * Criterion 1: a live campaign's impressions and clicks are counted per day on the server, with no
 * cookie and no user ID: the page calls record_sponsor_event() with the ad's key, and one row per
 * campaign and day keeps two totals. Nothing about the reader is stored or read.
 * Criterion 2: owner and admin read a campaign's report (every day of its run so far, days with
 * nothing counted as zeros) through admin_sponsor_campaign_report(); the screen turns it into a
 * CSV of daily totals.
 * sponsor_credit() now also returns the campaign's key, so a "Sponsored by" line counts too.
 * Who calls it: src/features/ads/ (counting) and src/features/sponsors/ (the report).
 */

/* ---------- 1. The daily totals ---------- */

create table public.campaign_daily_stats (
  campaign_id uuid not null references public.sponsor_campaigns (id) on delete cascade,
  -- The day in Romania (Q7), the same calendar as the campaign's dates.
  counted_on date not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  primary key (campaign_id, counted_on),
  constraint campaign_daily_stats_not_negative check (impressions >= 0 and clicks >= 0)
);
comment on table public.campaign_daily_stats is
  'kind: platform. Each sponsor campaign''s impressions and clicks per day: totals only, never who saw or clicked (S1-E12-03).';
alter table public.campaign_daily_stats enable row level security;

/**
 * Policy campaign_daily_stats_select_sponsor_staff: owner and admin read every campaign's totals,
 * the same people who manage campaigns. Nobody else sees them; writes go only through
 * record_sponsor_event().
 */
create policy campaign_daily_stats_select_sponsor_staff
  on public.campaign_daily_stats for select to authenticated
  using (public.staff_may('sponsors', 'view'));
comment on policy campaign_daily_stats_select_sponsor_staff on public.campaign_daily_stats is
  'Allows owner and admin in a staff session to read sponsor campaign totals (S1-E12-03).';
grant select on public.campaign_daily_stats to authenticated;

/* ---------- 2. Counting ---------- */

/**
 * record_sponsor_event: adds one impression or one click to a live campaign's total for today.
 * Inputs: ad_key ('campaign:<campaign ID>', as page_ads() and sponsor_credit() give it) and
 *   event_kind ('impression' or 'click').
 * Returns: nothing. A key that isn't a live campaign, or an unknown kind, is ignored without an
 *   error, so the page never has to handle one and nothing about other campaigns leaks.
 * Errors: none.
 * Where it fits: AdBox and SponsoredByLine call it when a sponsor's ad or credit is shown and when
 *   its link is followed (criterion 1: no cookie, no user ID; the caller isn't read).
 */
create or replace function public.record_sponsor_event(ad_key text, event_kind text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted_id uuid;
  campaign public.sponsor_campaigns;
begin
  -- Step 1: the campaign behind the key; anything else is not ours to count.
  if ad_key !~ '^campaign:[0-9a-f-]{36}$' or event_kind not in ('impression', 'click') then
    return;
  end if;
  wanted_id := substring(ad_key from 10)::uuid;
  select * into campaign from public.sponsor_campaigns where id = wanted_id;
  -- Step 2: only a campaign that is live today counts, so a stale page can't add to an ended one.
  if not found or not public.sponsor_campaign_is_live(campaign) then
    return;
  end if;
  -- Step 3: one more on today's row, made if it isn't there yet.
  insert into public.campaign_daily_stats as stats (campaign_id, counted_on, impressions, clicks)
  values (wanted_id, public.romania_today(),
          case when event_kind = 'impression' then 1 else 0 end,
          case when event_kind = 'click' then 1 else 0 end)
  on conflict (campaign_id, counted_on) do update
    set impressions = stats.impressions + excluded.impressions,
        clicks = stats.clicks + excluded.clicks;
end;
$$;
comment on function public.record_sponsor_event(text, text) is
  'Public: counts one impression or click of a live sponsor campaign for today, with nothing about the reader (S1-E12-03).';
revoke execute on function public.record_sponsor_event(text, text) from public;
grant execute on function public.record_sponsor_event(text, text) to anon, authenticated;

/* ---------- 3. The report ---------- */

/**
 * admin_sponsor_campaign_report: a campaign's daily totals, for the screen and its CSV.
 * Input: target_campaign_id.
 * Returns: a JSON array of {day, impressions, clicks}, one entry per day from the campaign's start
 *   to its end or today, whichever comes first, oldest first; days with nothing counted are zeros.
 *   Empty before the campaign starts or when it has no dates.
 * Errors: insufficient_privilege for anyone but owner and admin; no_data_found for an unknown
 *   campaign.
 * Where it fits: the campaign editor's Report section (criterion 2). Totals only, so reading it
 *   isn't logged.
 */
create or replace function public.admin_sponsor_campaign_report(target_campaign_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  campaign public.sponsor_campaigns;
begin
  -- Step 1: only the people who manage sponsors.
  perform public.require_sponsor_staff();
  select * into campaign from public.sponsor_campaigns where id = target_campaign_id;
  if not found then
    raise exception 'There is no such campaign.' using errcode = 'no_data_found';
  end if;
  -- Step 2: every day of the run so far, with its totals or zeros.
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'day', days.day::date,
        'impressions', coalesce(stats.impressions, 0),
        'clicks', coalesce(stats.clicks, 0)) order by days.day)
    from generate_series(campaign.starts_on::timestamp,
                         least(campaign.ends_on, public.romania_today())::timestamp,
                         interval '1 day') as days (day)
    left join public.campaign_daily_stats as stats
      on stats.campaign_id = campaign.id and stats.counted_on = days.day::date
  ), '[]'::jsonb);
end;
$$;
comment on function public.admin_sponsor_campaign_report(uuid) is
  'Owner and admin: a sponsor campaign''s impressions and clicks per day of its run so far (S1-E12-03).';
revoke execute on function public.admin_sponsor_campaign_report(uuid) from public, anon;
grant execute on function public.admin_sponsor_campaign_report(uuid) to authenticated;

/* ---------- 4. "Sponsored by" carries its campaign's key ---------- */

/**
 * sponsor_credit: as in part b3, plus ad_key ('campaign:<ID>') so the line's impressions and
 * clicks can be counted with record_sponsor_event().
 * Inputs: credit_kind ('category', 'contest' or 'contest_page') and credit_key.
 * Returns {sponsor_name, link_url, ad_key}, or null when nobody sponsors it today.
 * Errors: none.
 */
create or replace function public.sponsor_credit(credit_kind text, credit_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- The earliest-starting live campaign wins, so the line doesn't flip between two sponsors.
  select jsonb_build_object('sponsor_name', sponsors.name, 'link_url', nullif(campaigns.link_url, ''),
                            'ad_key', 'campaign:' || campaigns.id)
  from public.sponsor_campaigns as campaigns
  join public.sponsors on sponsors.id = campaigns.sponsor_id
  left join public.contests on contests.id = campaigns.contest_id
  left join public.landing_pages on landing_pages.id = contests.landing_page_id
  where public.sponsor_campaign_is_live(campaigns)
    and ((credit_kind = 'category' and campaigns.placement = 'category' and campaigns.category_slug = credit_key)
      or (credit_kind = 'contest' and campaigns.placement = 'contest' and campaigns.contest_id::text = credit_key)
      or (credit_kind = 'contest_page' and campaigns.placement = 'contest'
          and landing_pages.slug = credit_key and landing_pages.archived_at is null))
  order by campaigns.starts_on, campaigns.id
  limit 1;
$$;
comment on function public.sponsor_credit(text, text) is
  'Public: the live sponsor of a category, contest or contest page, for "Sponsored by"; never changes lists or ranking (S1-E12-02).';
revoke execute on function public.sponsor_credit(text, text) from public;
grant execute on function public.sponsor_credit(text, text) to anon, authenticated;
