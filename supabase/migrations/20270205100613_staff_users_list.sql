-- Migration: the full list of accounts in Staff › Users (Robert, 26 Nov 2026: "I actually want to
-- be able to see the full list of users in the backend"; architecture 1.8.2 to 1.8.4, screen 8.5).
-- What it adds (no new tables, so no new policies; the function checks the caller itself):
--   admin_list_accounts()   one page of every account, newest first, for the owner and admins
-- Who may use it: the owner and admins only, in a staff session (the coordinator's brief for
-- Robert's ask; minors' data, GDPR art. 5(1)(c) data minimisation). Moderators and support keep
-- the search (admin_user_lookup(), S1-E11-02), which finds one account at a time.
-- Least privilege (architecture 1.8.3): the age group, never the year of birth; the email masked
-- until "Show", which admin_reveal_email() logs; every page read is itself logged as a sensitive
-- read, so the audit log shows who looked through the members and when. No export.
-- Called by: src/features/staff/api/accountList.ts.

/**
 * admin_list_accounts: one page of every account for the Users area's full list.
 * Input: page_number (from 1) and page_size (1 to 100; the screen asks for 50).
 * Returns: one row per account, newest first: user ID (staff may see IDs, architecture 1.6),
 *   username, pen name, the email masked ("r***@gmail.com"), country, the age group (the younger
 *   possible age, as age_band() works it out), when it joined, the last day it was used, the
 *   account status, the kinds of sanction it has had, how many open cases are about it that the
 *   caller may see, and the total number of accounts (the same on every row) for the pager.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is the owner or an admin in
 *   a staff session; invalid_parameter_value (hint refused) for a page number under 1 or a page
 *   size outside 1 to 100.
 * Logging: each page read writes one audit row (sensitive_read.account_list) naming the page,
 *   never any account's details.
 * Where it fits: /staff/users → useAccountList → api/accountList.ts → here.
 */
create or replace function public.admin_list_accounts(page_number integer default 1, page_size integer default 50)
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
  every_account bigint;
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

  -- Step 3: the list itself is a sensitive read: who looked, which page (architecture 1.8.3).
  perform public.log_staff_action('sensitive_read.account_list', 'profiles',
    'page ' || page_number::text);

  -- Step 4: one page, newest first; deleted accounts too, so staff can still find them.
  select count(*) into every_account from public.profiles;
  return query
    select profiles.id,
           profiles.handle,
           profiles.pen_name,
           public.mask_email(users.email),
           profiles.country_code,
           coalesce(public.age_band_from_birth(profiles.birth_year, profiles.birth_month,
             profiles.age_check_result, today), 'unknown'::public.age_band),
           profiles.created_at,
           public.account_last_used_on(profiles.id),
           public.account_state(profiles.id),
           coalesce((select array_agg(distinct sanctions.kind) from public.sanctions
                     where sanctions.user_id = profiles.id), '{}'),
           (select count(*)::integer from public.cases
            where cases.user_id = profiles.id and cases.status = 'open'
              and public.may_see_case(cases.is_safeguarding)),
           every_account
    from public.profiles
    left join auth.users on users.id = profiles.id
    order by profiles.created_at desc, profiles.id
    limit page_size
    offset (page_number - 1) * page_size;
end;
$$;

comment on function public.admin_list_accounts(integer, integer) is
  'Every account, a page at a time, newest first, for the owner and admins; each page read logged (Staff › Users full list, 26 Nov 2026).';
revoke execute on function public.admin_list_accounts(integer, integer) from public, anon;
grant execute on function public.admin_list_accounts(integer, integer) to authenticated;
