-- DASH-1: the staff dashboard's numbers and the "sign in again" message (bundle DASH-1; Robert,
-- 6 Nov 2026, 18:32 to 18:34 UTC: "There's not like a real dashboard where I can see things at a
-- glance").
--
-- What it adds:
--   - staff_dashboard(): the numbers the admin front page shows at a glance, one entry per area
--     the caller may open (staff_may(area, 'view')): reports waiting and overdue, pictures to
--     check, open appeals, teacher checks waiting, open and overdue data requests, open support
--     tickets, sign-ups in the last 7 days, and failed calls and crashes in the last 24 hours.
--     Counts only: no row, name, email or text leaves the function, so reading it is not a
--     sensitive read and writes nothing to the audit log.
--   - my_staff_session_ended(): true when the caller holds a staff role but their staff session
--     is older than staff_session_hours (12), so the front page can say "Sign in again" instead
--     of "No area is open to you" (the empty page Robert saw on 6 Nov 2026, 18:32 UTC).
-- Who calls it: src/features/staff/api/staffDashboard.ts (StaffHomePage) and
--   src/features/staff/api/staffAccess.ts (StaffLayout).
-- Rules: no new table, so no new policy (CLAUDE.md rule 1); both functions are security definer
--   with an empty search_path, refuse visitors, and give a member nothing (architecture 1.8.1:
--   the server decides, not the menu).

/**
 * my_staff_session_ended: whether the caller is staff whose staff session has run out.
 *
 * Inputs: none; it reads the caller's JWT (auth.uid(), its session_id) and auth.sessions.
 * Returns: true only for a person with a staff role, a Google Workspace sign-in where one is
 *   needed (S1-E2-07b), and a session that began more than staff_session_hours ago (S1-E11-01);
 *   false for a member, for a fresh staff session and for a session with no session_id claim
 *   (is_staff_session() doesn't time-limit those either).
 * Errors: none; a visitor can't call it (no grant to anon).
 * Where it fits: StaffLayout asks it once, with my_staff_areas(), to choose between the staff
 *   pages and the "Your staff session has ended" page.
 */
create function public.my_staff_session_ended()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- The same three tests as is_staff_session(), with the time test turned round.
  select public.is_staff()
    and public.workspace_sign_in_holds()
    and coalesce(
      public.staff_session_started_at()
        <= now() - make_interval(hours => coalesce(public.setting_value('staff_session_hours'), '12')::text::integer),
      false
    );
$$;

comment on function public.my_staff_session_ended() is
  'For the admin shell: true when the caller holds a staff role but their staff session is older than staff_session_hours, so the page can ask them to sign in again (DASH-1).';
revoke execute on function public.my_staff_session_ended() from public, anon;
grant execute on function public.my_staff_session_ended() to authenticated;

/**
 * staff_dashboard: the admin front page's numbers, for the areas the caller may open.
 *
 * Inputs: none; it reads the caller's staff roles through staff_may().
 * Returns: a JSON object with one key per area the caller may view, for example
 *   { "moderation": { "waiting": 4, "overdue": 1, "pictures": 2 }, "appeals": { "open": 0 } }.
 *   A key is left out when the caller may not open that area, so a support person never learns
 *   how many reports wait for moderators. Safeguarding cases count only with the safeguarding
 *   permission (S1-E10-10).
 * Errors: insufficient_privilege (42501) for anyone outside a staff session.
 * Where it fits: StaffHomePage shows these as tiles above the area cards; each tile links to its
 *   area, where the full list lives.
 */
create function public.staff_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  numbers jsonb := '{}'::jsonb;
  may_see_safeguarding boolean := public.staff_may('safeguarding', 'view');
begin
  -- Step 1: only a live staff session gets numbers (architecture 1.8.1).
  if not public.is_staff_session() then
    raise exception 'Only staff in a staff session can see the dashboard.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Step 2: moderation: reports waiting for a decision, those past their deadline, and the
  -- pictures waiting for a reviewer (the same cases admin_pictures_to_check() lists, counted
  -- here without opening any file).
  if public.staff_may('moderation', 'view') then
    numbers := numbers || jsonb_build_object('moderation', jsonb_build_object(
      'waiting', (select count(*) from public.cases
        where cases.status = 'open' and cases.item_type <> 'picture'
          and (not cases.is_safeguarding or may_see_safeguarding)),
      'overdue', (select count(*) from public.cases
        where cases.status = 'open' and cases.item_type <> 'picture' and cases.deadline_at < now()
          and (not cases.is_safeguarding or may_see_safeguarding)),
      'pictures', (select count(*) from public.cases
        join public.picture_checks as picture on picture.id = cases.item_id
        where cases.item_type = 'picture' and cases.status = 'open' and not cases.is_safeguarding
          and cases.source in ('picture_review', 'picture_check') and picture.status = 'held')));
  end if;

  -- Step 3: appeals waiting for a second moderator (S1-E10-07).
  if public.staff_may('appeals', 'view') then
    numbers := numbers || jsonb_build_object('appeals', jsonb_build_object(
      'open', (select count(*) from public.appeals where appeals.status = 'open')));
  end if;

  -- Step 4: teacher checks waiting for staff (S1-E2-11).
  if public.staff_may('schools', 'view') then
    numbers := numbers || jsonb_build_object('schools', jsonb_build_object(
      'teacherChecks', (select count(*) from public.teacher_checks
        where teacher_checks.status = 'waiting_for_staff')));
  end if;

  -- Step 5: data requests still open, and those past their legal deadline (GDPR art. 12(3):
  -- one month, extendable by two; S1-E11-09).
  if public.staff_may('data_requests', 'view') then
    numbers := numbers || jsonb_build_object('dataRequests', jsonb_build_object(
      'open', (select count(*) from public.data_requests where data_requests.state = 'open'),
      'overdue', (select count(*) from public.data_requests
        where data_requests.state = 'open'
          and coalesce(data_requests.extended_to, data_requests.due_on) < current_date)));
  end if;

  -- Step 6: support tickets that still need the team (new or open; S1-E11-13).
  if public.staff_may('support_tickets', 'view') then
    numbers := numbers || jsonb_build_object('supportTickets', jsonb_build_object(
      'open', (select count(*) from public.support_tickets
        where support_tickets.status in ('new', 'open'))));
  end if;

  -- Step 7: sign-ups in the last 7 days, an aggregate the metrics area already shows (S1-E11-04).
  if public.staff_may('metrics', 'view') then
    numbers := numbers || jsonb_build_object('metrics', jsonb_build_object(
      'signUpsThisWeek', (select count(*) from public.profiles
        where profiles.created_at > now() - interval '7 days' and profiles.deleted_at is null)));
  end if;

  -- Step 8: calls that failed on our side or the network, and browser crashes, in the last
  -- 24 hours (LOGS-1). A refused call (client_error) is often the rules working, so it isn't
  -- counted as a failure here.
  if public.staff_may('call_log', 'view') then
    numbers := numbers || jsonb_build_object('logs', jsonb_build_object(
      'failedCalls', (select count(*) from public.call_log
        where call_log.created_at > now() - interval '24 hours'
          and call_log.outcome in ('server_error', 'network_error')),
      'crashes', (select count(*) from public.client_errors
        where client_errors.created_at > now() - interval '24 hours')));
  end if;

  return numbers;
end;
$$;

comment on function public.staff_dashboard() is
  'Staff: the admin front page''s numbers, one entry per area the caller may view; counts only, nothing personal (DASH-1).';
revoke execute on function public.staff_dashboard() from public, anon;
grant execute on function public.staff_dashboard() to authenticated;
