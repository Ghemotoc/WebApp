-- Migration: a status filter and a smaller page for the Members list in Staff › Users, with
-- deleted accounts left out unless asked for (Robert, 26 Nov 2026, 20:17 UTC: "remove everybody
-- that has a deleted account … add a filter to see who's active, who's banned, and so on … the
-- user list should cap at 5", with a choice of how many a page).
-- Story: S1-E11-02 (follow-up to the full list, 20270205100613_staff_users_list.sql).
-- What it changes (no new tables, so no new policies; the function checks the caller itself):
--   admin_list_accounts()   gains status_filter; with none, deleted accounts are left out.
-- Nothing is deleted or purged: a deleted account's rows stay as the retention rules say (banned
-- accounts and evidence must be kept), and the "Deleted" filter still finds it.
-- The statuses are account_state()'s own (active, banned, suspended, waiting for an email, an
-- age check, a parent, a place, the terms and so on); no new state is made up here.
-- Who may use it, the masking and the logging stay as they were: the owner and admins only, in
-- a staff session; each page read is a logged sensitive read.
-- Called by: src/features/staff/api/accountList.ts.

-- The old two-argument version goes, so there is one function with one meaning.
drop function if exists public.admin_list_accounts(integer, integer);

/**
 * admin_list_accounts: one page of accounts for the Users area's Members list.
 * Input: page_number (from 1), page_size (1 to 100; the screen offers 5, 10, 25 and 50 and opens
 *   on 5), and status_filter: one account_state() value, or null for every account that isn't
 *   deleted (Robert, 26 Nov 2026: deleted accounts aren't useful in the list).
 * Returns: one row per account, newest first: user ID (staff may see IDs, architecture 1.6),
 *   username, pen name, the email masked ("r***@gmail.com"), country, the age group (the younger
 *   possible age, as age_band() works it out), when it joined, the last day it was used, the
 *   account status, the kinds of sanction it has had, how many open cases are about it that the
 *   caller may see, and the number of accounts that match the filter (the same on every row) for
 *   the pager.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is the owner or an admin in
 *   a staff session; invalid_parameter_value (hint refused) for a page number under 1 or a page
 *   size outside 1 to 100.
 * Logging: each page read writes one audit row (sensitive_read.account_list) naming the page, the
 *   page size and the filter, never any account's details.
 * Where it fits: /staff/users → useAccountList → api/accountList.ts → here.
 */
create function public.admin_list_accounts(
  page_number integer default 1,
  page_size integer default 5,
  status_filter public.account_status default null
)
returns table (
  user_id uuid,
  handle text,
  pen_name text,
  email_masked text,
  country_code text,
  age_band public.age_band,
  joined_at timestamptz,
  last_used_on date,
  account_status public.account_status,
  sanction_kinds public.sanction_kind[],
  open_case_count integer,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Today in Romania, so the age group matches what age_band() says elsewhere.
  today date := (now() at time zone 'Europe/Bucharest')::date;
begin
  -- Step 1: the owner and admins only, in a staff session (staff_may checks the session).
  if not (public.staff_may('users', 'view')
          and (public.is_staff('owner') or public.is_staff('admin'))) then
    raise exception 'Only the owner and admins can list every account.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: a page that makes sense; a huge page would be an export by another name.
  if page_number is null or page_number < 1 or page_size is null or page_size not between 1 and 100 then
    raise exception 'Ask for page 1 or later, with 1 to 100 accounts a page.'
      using errcode = 'invalid_parameter_value', hint = 'refused';
  end if;

  -- Step 3: the list itself is a sensitive read: who looked, which page and which filter
  -- (architecture 1.8.3).
  perform public.log_staff_action('sensitive_read.account_list', 'profiles',
    'page ' || page_number::text || ', ' || page_size::text || ' a page'
      || coalesce(', status ' || status_filter::text, ''));

  -- Step 4: work out each account's status once, keep the ones the filter asks for (no filter:
  -- everything but deleted), count them for the pager, and return one page, newest first.
  return query
    with stated as (
      select profiles.*, public.account_state(profiles.id) as state
      from public.profiles
    ),
    matching as (
      select stated.*, count(*) over () as matching_count
      from stated
      where (status_filter is null and stated.state <> 'deleted')
         or stated.state = status_filter
    )
    select matching.id,
           matching.handle,
           matching.pen_name,
           public.mask_email(users.email),
           matching.country_code,
           coalesce(public.age_band_from_birth(matching.birth_year, matching.birth_month,
             matching.age_check_result, today), 'unknown'::public.age_band),
           matching.created_at,
           public.account_last_used_on(matching.id),
           matching.state,
           coalesce((select array_agg(distinct sanctions.kind) from public.sanctions
                     where sanctions.user_id = matching.id), '{}'),
           (select count(*)::integer from public.cases
            where cases.user_id = matching.id and cases.status = 'open'
              and public.may_see_case(cases.is_safeguarding)),
           matching.matching_count
    from matching
    left join auth.users on users.id = matching.id
    order by matching.created_at desc, matching.id
    limit page_size
    offset (page_number - 1) * page_size;
end;
$$;

comment on function public.admin_list_accounts(integer, integer, public.account_status) is
  'Accounts a page at a time, newest first, by status (deleted left out unless asked for), for the owner and admins; each page read logged (Staff › Users, 26 Nov 2026).';
revoke execute on function public.admin_list_accounts(integer, integer, public.account_status) from public, anon;
grant execute on function public.admin_list_accounts(integer, integer, public.account_status) to authenticated;
