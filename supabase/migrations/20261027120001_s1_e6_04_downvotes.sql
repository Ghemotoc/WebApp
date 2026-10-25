/*
 * Migration: private downvotes on comments (story S1-E6-04; decided 16 Oct 2026, Q22: downvotes
 * are private and feed moderation only).
 *
 * What it adds:
 * - comment_downvotes: one per person per comment. Nobody sees a count, the comment's author
 *   included (criterion 1); the voter sees only their own row, so the button shows it; moderation
 *   staff read them (architecture 1.6: "downvotes are readable only by staff").
 * - downvote_comment(comment_id, should_downvote): the only write. On a comment the caller may
 *   read, never their own; adding one goes through the account gate. A vote from an account less
 *   than downvote_new_account_hours old (24, proposal) is kept but not counted (criterion 3).
 * - The threshold: when downvote_case_threshold (5, proposal) counted accounts have downvoted a
 *   comment, it enters the moderation queue at the lowest tier (seven_days), as a case whose
 *   source is 'downvotes' (criterion 2). A comment with an open case gets no second one.
 * - comment_json() adds downvoted_by_me, the caller's own vote only.
 * Downvotes never reach ranking (Q22): nothing outside moderation reads this table.
 * Forum posts get theirs with the forums (S1-E8, after March).
 * Who calls it: src/features/comments/api/downvotes.ts (DownvoteButton).
 * Tests: supabase/tests/database/153-comment-downvotes.test.sql.
 */

/* ---------- Settings and the case source ---------- */

insert into public.settings (key, value, is_public, description) values
  ('downvote_case_threshold', '5'::jsonb, false,
   'Counted downvotes from different accounts that put a comment in the moderation queue (proposal; S1-E6-04).'),
  ('downvote_new_account_hours', '24'::jsonb, false,
   'An account younger than this, in hours, downvotes without being counted (proposal; S1-E6-04).');

alter type public.case_source add value if not exists 'downvotes';

-- References for downvote cases: D-000001.
create sequence public.downvote_case_reference_seq;

/* ---------- Table ---------- */

create table public.comment_downvotes (
  id uuid primary key default gen_random_uuid(),
  -- The person downvoting (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  comment_id uuid not null references public.comments (id) on delete cascade,
  -- False when the account was under downvote_new_account_hours old when it voted (criterion 3).
  is_counted boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_downvotes_one_per_person unique (user_id, comment_id)
);
comment on table public.comment_downvotes is
  'kind: user_action
One private downvote per person per comment (S1-E6-04). Read by the voter (their own) and moderation staff only.';
create index comment_downvotes_comment_id on public.comment_downvotes (comment_id);
create trigger comment_downvotes_set_updated_at
  before update on public.comment_downvotes
  for each row execute function public.set_updated_at();
create trigger comment_downvotes_refuse_user_id_change
  before update on public.comment_downvotes
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.comment_downvotes enable row level security;

-- Who: the person who downvoted. Why: so their own button shows it; nobody else, the comment's
-- author included, sees a downvote (S1-E6-04, criterion 1). Writes go only through
-- downvote_comment().
create policy comment_downvotes_select_own on public.comment_downvotes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Who: owner, admin and moderator in a staff session. Why: downvotes feed moderation only
-- (architecture 1.6, Q22).
create policy comment_downvotes_select_moderation on public.comment_downvotes
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

grant select on public.comment_downvotes to authenticated;

/* ---------- The threshold ---------- */

/**
 * open_downvote_case: puts a comment in the moderation queue once enough accounts downvoted it.
 * Input: the comment. Returns: nothing.
 * Rules: counts distinct counted downvotes from live accounts; at downvote_case_threshold or more,
 *   and with no open case for the comment, it opens one at the lowest tier (seven_days), source
 *   'downvotes', no reason and no reports (criterion 2).
 * Internal: downvote_comment().
 */
create or replace function public.open_downvote_case(target public.comments)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  threshold integer := coalesce(public.setting_value('downvote_case_threshold'), '5')::text::integer;
  counted integer;
begin
  -- Step 1: how many accounts count.
  select count(*) into counted
  from public.comment_downvotes
  join public.profiles on profiles.id = comment_downvotes.user_id
  where comment_downvotes.comment_id = target.id and comment_downvotes.is_counted
    and profiles.deleted_at is null;
  if counted < threshold then
    return;
  end if;
  -- Step 2: one open case per item; a report may already have opened it.
  if exists (select 1 from public.cases
             where cases.item_type = 'comment' and cases.item_id = target.id and cases.status = 'open') then
    return;
  end if;
  insert into public.cases (reference, user_id, item_type, item_id, source, tier, received_at, deadline_at)
  values ('D-' || lpad(nextval('public.downvote_case_reference_seq')::text, 6, '0'), target.user_id,
          'comment', target.id, 'downvotes', 'seven_days', now(),
          now() + make_interval(hours => public.tier_hours('seven_days')));
end;
$$;
comment on function public.open_downvote_case(public.comments) is
  'Internal: opens a lowest-tier case once a comment has enough counted downvotes (S1-E6-04).';
revoke execute on function public.open_downvote_case(public.comments) from public, anon, authenticated;

/* ---------- Downvoting ---------- */

/**
 * downvote_comment: adds or takes away the caller's private downvote on a comment.
 * Inputs: comment_id; should_downvote (true to add, false to take away).
 * Returns: true when the caller has a downvote on it afterwards. Never a count.
 * Rules: the comment must be one the caller may read (its chapter readable, the comment live);
 *   never the caller's own; taking a downvote away always works; adding one goes through the
 *   account gate (architecture 1.7.8). A vote from an account younger than
 *   downvote_new_account_hours is kept uncounted (criterion 3). Adding one may open a case.
 * Errors: insufficient_privilege when signed out or the account may not write; no_data_found
 *   when the caller may not read the comment; check_violation for one's own comment.
 */
create or replace function public.downvote_comment(comment_id uuid, should_downvote boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.comments;
  address record;
  new_account_hours integer := coalesce(public.setting_value('downvote_new_account_hours'), '24')::text::integer;
begin
  -- Step 1: signed in, and a live comment on a chapter this reader may open.
  if caller_id is null then
    raise exception 'Log in to downvote.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.comments where comments.id = comment_id;
  select stories.slug, chapters.code into address
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = target.chapter_id;
  if target.id is null
     or not exists (select 1 from public.readable_chapter(address.slug, address.code))
     or public.comment_state_for_caller(target) is distinct from 'live' then
    raise exception 'That comment isn''t there any more.' using errcode = 'no_data_found';
  end if;
  if target.user_id = caller_id then
    raise exception 'You can''t downvote your own comment.' using errcode = 'check_violation';
  end if;
  -- Step 2: taking it away is always allowed.
  if not coalesce(should_downvote, false) then
    delete from public.comment_downvotes
    where comment_downvotes.comment_id = target.id and comment_downvotes.user_id = caller_id;
    return false;
  end if;
  -- Step 3: adding one is a write, so the account gate applies; a new account isn't counted.
  if not public.is_active_member() then
    raise exception 'Your account can''t downvote right now.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.comment_downvotes (user_id, comment_id, is_counted)
  select caller_id, target.id, profiles.created_at <= now() - make_interval(hours => new_account_hours)
  from public.profiles where profiles.id = caller_id
  on conflict on constraint comment_downvotes_one_per_person do nothing;
  -- Step 4: enough accounts put the comment in the queue.
  perform public.open_downvote_case(target);
  return true;
end;
$$;
comment on function public.downvote_comment(uuid, boolean) is
  'Adds or takes away the caller''s private downvote on a comment they may read; never answers a count (S1-E6-04).';
revoke execute on function public.downvote_comment(uuid, boolean) from public, anon;
grant execute on function public.downvote_comment(uuid, boolean) to authenticated;

/* ---------- Each comment says whether the caller downvoted it ---------- */

/**
 * comment_json: as in S1-E6-02, plus 'downvoted_by_me' (the caller's own vote; false for a
 * visitor). Never a downvote count, for anyone (S1-E6-04, criterion 1).
 */
create or replace function public.comment_json(target public.comments, story_writer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.comment_state_for_caller(target);
  author public.profiles;
begin
  select * into author from public.profiles where profiles.id = target.user_id;
  return jsonb_build_object(
    'id', target.id,
    'author', jsonb_build_object(
      'handle', author.handle,
      'display_name', public.display_name(author.handle, author.pen_name)),
    'is_writer', target.user_id = story_writer_id,
    'is_mine', target.user_id = caller_id,
    'created_at', target.created_at,
    'is_spoiler', target.is_spoiler,
    'state', state,
    'body', case when state in ('live', 'hidden') then target.body end,
    'can_delete', target.deleted_at is null and caller_id is not null
      and (target.user_id = caller_id or story_writer_id = caller_id),
    'reactions', case when state in ('live', 'hidden') then public.comment_reactions_json(target.id)
      else jsonb_build_object('counts', '{}'::jsonb, 'mine', null) end,
    'downvoted_by_me', caller_id is not null and exists (
      select 1 from public.comment_downvotes
      where comment_downvotes.comment_id = target.id and comment_downvotes.user_id = caller_id));
end;
$$;
comment on function public.comment_json(public.comments, uuid) is
  'Internal: one comment as the comments area draws it, with its reactions and the caller''s own downvote, never a user ID or a downvote count (S1-E6-01, S1-E6-02, S1-E6-04).';
