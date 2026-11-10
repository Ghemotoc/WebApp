-- GAPS-12b: "This week" on the Writers' hub (board WritersHub, "Your week"; gap bundles in the
-- build plan). Part 2 of GAPS-12.
--
-- What it adds: one function, my_week_numbers(), that answers four numbers about the signed-in
-- writer's last 7 days: chapters posted, reads, comments and new followers.
-- Where it fits: the hub's side column (src/features/hub/components/HubWeek.tsx) calls it through
-- src/features/hub/api/hubWeek.ts.
-- No new table, column or policy: every number is counted from rows that already exist, and only
-- about the caller. Nothing about any reader, commenter or follower leaves the function.

/**
 * The signed-in writer's last 7 days in four numbers.
 *
 * Inputs: none; the caller is auth.uid().
 * Returns: {"chapters_posted", "reads", "comments", "followers"}. chapters_posted is exact,
 *   because it is the writer's own doing. The other three follow the dashboard's "fewer than 5"
 *   rule (S1-E3-07 criterion 2, shown_count()): 0 stays 0, 1 to 4 answer null, so one reader,
 *   commenter or follower can't be picked out.
 * Errors: insufficient_privilege when nobody is signed in.
 * Flow: hub side column → hubWeek.ts → this function → writer_chapter_numbers() and the
 *   writer's own chapters and follower rows.
 */
create function public.my_week_numbers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  since timestamptz := now() - interval '7 days';
  chapters_posted integer;
  totals record;
  new_followers integer;
begin
  -- Step 1: only a signed-in writer has a week.
  if caller_id is null then
    raise exception 'Log in to see your numbers.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: chapters the writer published for the first time in the last 7 days that readers
  -- can still open (a chapter taken back to draft or deleted since doesn't count).
  select count(*)::integer into chapters_posted
  from public.chapters
  join public.stories on stories.id = chapters.story_id
  where stories.user_id = caller_id
    and stories.deleted_at is null
    and chapters.deleted_at is null
    and chapters.status = 'published'
    and chapters.first_published_at >= since;
  -- Step 3: reads and comments, from the same per-chapter totals the dashboard uses, so the
  -- two screens never disagree (the writer's own comments and hidden comments don't count).
  select coalesce(sum(numbers.reads), 0) as reads, coalesce(sum(numbers.comments), 0) as comments
  into totals
  from public.writer_chapter_numbers(caller_id, since) as numbers;
  -- Step 4: people who started following the writer in the last 7 days.
  select count(*)::integer into new_followers
  from public.follows_users
  where follows_users.followed_user_id = caller_id
    and follows_users.created_at >= since;
  -- Step 5: the answer, with other people's numbers rounded by the "fewer than 5" rule.
  return jsonb_build_object(
    'chapters_posted', chapters_posted,
    'reads', public.shown_count(totals.reads),
    'comments', public.shown_count(totals.comments),
    'followers', public.shown_count(new_followers)
  );
end;
$$;

comment on function public.my_week_numbers() is
  'The signed-in writer''s last 7 days: chapters posted (exact), reads, comments and new followers (null when from fewer than 5) (GAPS-12b).';

-- Only signed-in members may call it; the function itself refuses a call with nobody signed in.
revoke all on function public.my_week_numbers() from public, anon;
grant execute on function public.my_week_numbers() to authenticated;
