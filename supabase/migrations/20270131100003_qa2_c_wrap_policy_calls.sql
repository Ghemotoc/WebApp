-- QA-2c: policies that call a function once per query, not once per row (QA report finding S6).
--
-- Story: QA-2 (independent QA check, 5 Nov 2026, finding S6). Who calls it: nobody directly;
-- Postgres runs these policies on every read of the twelve tables below.
--
-- Why: a policy written as `staff_may('sponsors', 'view')` or `user_id = auth.uid()` makes
-- Postgres call the function again for every row it looks at. Wrapped in a sub-select,
-- `(select public.staff_may(...))`, the planner works the answer out once per query and reuses
-- it (Supabase's RLS performance guidance). The rules themselves don't change: each policy still
-- lets in exactly the same people, so the existing allowed and denied tests for these tables
-- still apply. ALTER POLICY keeps each policy's comment (who it allows and why).

-- Step 1: the moderation team's on-call alerts.
alter policy on_call_alerts_select_moderation on public.on_call_alerts
  using ((select public.staff_may('moderation', 'view')));

-- Step 2: a member's own requests to connect a Google account.
alter policy identity_link_requests_select_own on public.identity_link_requests
  using (user_id = (select auth.uid()));

-- Step 3: a space's moderation log, for its owner and for moderators.
alter policy space_moderation_log_select_owner_or_staff on public.space_moderation_log
  using ((select public.staff_may('moderation', 'view'))
    or exists (select 1 from public.spaces
               where spaces.id = space_moderation_log.space_id and spaces.user_id = (select auth.uid())));

-- Step 4: a member's own customisation change requests, and moderators.
alter policy customisation_change_requests_select_own_or_staff on public.customisation_change_requests
  using (user_id = (select auth.uid()) or (select public.staff_may('moderation', 'view')));

-- Step 5: data requests, for staff who handle them.
alter policy data_requests_select_staff on public.data_requests
  using ((select public.staff_may('data_requests', 'act')));

-- Step 6: the intern list, for staff who manage roles.
alter policy staff_interns_select_roles on public.staff_interns
  using ((select public.staff_may('roles', 'view')));

-- Step 7: the sponsor area's five tables, for staff who may view sponsors.
alter policy sponsors_select_sponsor_staff on public.sponsors
  using ((select public.staff_may('sponsors', 'view')));
alter policy sponsor_campaigns_select_sponsor_staff on public.sponsor_campaigns
  using ((select public.staff_may('sponsors', 'view')));
alter policy campaign_daily_stats_select_sponsor_staff on public.campaign_daily_stats
  using ((select public.staff_may('sponsors', 'view')));
alter policy ad_bookings_select_sponsor_staff on public.ad_bookings
  using ((select public.staff_may('sponsors', 'view')));
alter policy house_ads_select_sponsor_staff on public.house_ads
  using ((select public.staff_may('sponsors', 'view')));

-- Step 8: brand assets, for staff who edit the website.
alter policy brand_assets_select_website_staff on public.brand_assets
  using ((select public.staff_may('website_cms', 'act')));
