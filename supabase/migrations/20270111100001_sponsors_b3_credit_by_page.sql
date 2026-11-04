/*
 * Migration: "Sponsored by" on a contest's own page (story S1-E12-02 criterion 3; bundle
 * SPONSORS-b3).
 *
 * Part b1 made sponsor_credit('category' | 'contest', key), where a contest's key is its ID. A
 * visitor's contest page only knows its own address (/c/<slug>), and the contest's ID isn't part
 * of the public page, so this adds a third kind, 'contest_page', keyed by the landing page's slug.
 * Nothing else changes: the credit still only names a sponsor and never touches lists or ranking.
 * Who calls it: the app's useSponsorCredit() on story list pages and landing pages.
 * What it calls: sponsor_campaign_is_live() (part b1).
 */

/**
 * sponsor_credit: the live sponsor of a category, a contest or a contest's page, for the
 * "Sponsored by" line (S1-E12-02 criterion 3).
 * Inputs: credit_kind ('category', 'contest' or 'contest_page'), credit_key (the category's slug,
 * the contest's ID as text, or the contest's landing page slug).
 * Returns {sponsor_name, link_url}, or null when nobody sponsors it today.
 * Errors: none; an unknown kind or key gives null.
 * Where it fits: public, read by visitors and members alike; nothing about the reader is used.
 */
create or replace function public.sponsor_credit(credit_kind text, credit_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- The earliest-starting live campaign wins, so the line doesn't flip between two sponsors.
  select jsonb_build_object('sponsor_name', sponsors.name, 'link_url', nullif(campaigns.link_url, ''))
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
