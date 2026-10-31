/*
 * Migration: questions and ideas, and marketing notes, in Story Atlas (stories S1-E17-27 to
 * S1-E17-29; docs/stories/s1-e17-story-atlas.md; bundle ATLAS, part g).
 *
 * What it adds:
 * - story_ideas: the writer's quick notes on a story: a question, an idea, a to-do or a
 *   decision, each with its text, an "Action or outcome" and the date it was ticked done
 *   (S1-E17-27, S1-E17-28).
 * - story_marketing: one row of marketing notes per story: back-cover blurb, comparable titles,
 *   hooks and keywords, query pitch and launch notes (S1-E17-29). The logline, genre, audience
 *   and publishing route already live on the plan and the story, so the Marketing page edits
 *   those in place instead of copying them. The row is made on the first save.
 * - story_ideas() and story_marketing() to read them; add_story_idea(), update_story_idea(),
 *   delete_story_idea() and update_story_marketing() to change them.
 * The [[name]] links in an item's text (S1-E17-28) come with the cross-links in part h
 * (S1-E17-31); until then the text is plain.
 * Private by default (Robert, 31 Oct 2026, 08:02): only the writer reads or changes any of it.
 * Personal data: the writer's own planning notes, read only by them; no new processor.
 * Who calls it: src/features/atlas/api/ideas.ts and src/features/atlas/api/marketing.ts.
 * Tests: supabase/tests/database/196-ideas-and-marketing.test.sql.
 */

/* ---------- Questions and ideas ---------- */

create table public.story_ideas (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- S1-E17-27: Question, Idea, To-do or Decision.
  kind text not null default 'idea',
  body text not null,
  -- S1-E17-28: "Action or outcome", what the writer decided or did.
  outcome text not null default '',
  -- Set when the item is ticked done, cleared when it is ticked open again.
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_ideas_kind_known check (kind in ('question', 'idea', 'todo', 'decision')),
  constraint story_ideas_body_length check (char_length(btrim(body)) between 1 and 1000),
  constraint story_ideas_outcome_length check (char_length(outcome) <= 2000)
);

comment on table public.story_ideas is
  'kind: user_content; reportable: story
The writer''s questions, ideas, to-dos and decisions on one story (S1-E17-27, S1-E17-28). Only the writer reads them.';
comment on column public.story_ideas.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create index story_ideas_story_id_idx on public.story_ideas (story_id, created_at);

create trigger story_ideas_set_updated_at
  before update on public.story_ideas
  for each row execute function public.set_updated_at();

create trigger story_ideas_refuse_user_id_change
  before update on public.story_ideas
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_ideas enable row level security;

grant select on public.story_ideas to authenticated;

/**
 * story_ideas_select_own: the writer reads the questions and ideas of their own stories. Nobody
 * else reads them through the app (private by default).
 */
create policy story_ideas_select_own
  on public.story_ideas for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_ideas_select_own on public.story_ideas is
  'Allows a writer to read the questions and ideas of their own stories, and nobody else (S1-E17-27).';

/* ---------- Marketing notes ---------- */

create table public.story_marketing (
  -- One row per story; it goes with the plan.
  story_id uuid primary key references public.story_plans (story_id) on delete cascade,
  -- The writer (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id) on delete cascade,
  back_cover_blurb text not null default '',
  comparable_titles text not null default '',
  hooks_keywords text not null default '',
  query_pitch text not null default '',
  launch_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_marketing_blurb_length check (char_length(back_cover_blurb) <= 3000),
  constraint story_marketing_comparable_titles_length check (char_length(comparable_titles) <= 1000),
  constraint story_marketing_hooks_keywords_length check (char_length(hooks_keywords) <= 1000),
  constraint story_marketing_query_pitch_length check (char_length(query_pitch) <= 3000),
  constraint story_marketing_launch_notes_length check (char_length(launch_notes) <= 5000)
);

comment on table public.story_marketing is
  'kind: user_content; reportable: story
The writer''s marketing notes on one story (S1-E17-29): back-cover blurb, comparable titles, hooks and keywords, query pitch and launch notes. Only the writer reads them.';
comment on column public.story_marketing.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';

create trigger story_marketing_set_updated_at
  before update on public.story_marketing
  for each row execute function public.set_updated_at();

create trigger story_marketing_refuse_user_id_change
  before update on public.story_marketing
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_marketing enable row level security;

grant select on public.story_marketing to authenticated;

/**
 * story_marketing_select_own: the writer reads the marketing notes of their own stories. Nobody
 * else reads them through the app (private by default).
 */
create policy story_marketing_select_own
  on public.story_marketing for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_marketing_select_own on public.story_marketing is
  'Allows a writer to read the marketing notes of their own stories, and nobody else (S1-E17-29).';

/* ---------- Helpers ---------- */

/**
 * my_planned_story_id: the ID of the caller's own live story that has a plan.
 * Input: the story's slug. Returns: the ID, or null when it isn't the caller's or has no plan.
 * Internal: the functions below.
 */
create or replace function public.my_planned_story_id(story_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select story_plans.story_id from public.story_plans
  where story_plans.story_id = public.my_live_story_id(story_slug);
$$;

comment on function public.my_planned_story_id(text) is
  'Internal: the caller''s own live story with a plan, by slug, or null (S1-E17-27, S1-E17-29).';
revoke execute on function public.my_planned_story_id(text) from public, anon, authenticated;

/**
 * my_story_idea: one of the caller's questions or ideas on a live story.
 * Input: the item's ID. Returns: the row, or a row of nulls when it isn't the caller's.
 * Internal: update_story_idea() and delete_story_idea().
 */
create or replace function public.my_story_idea(target_idea_id uuid)
returns public.story_ideas
language sql
stable
security definer
set search_path = ''
as $$
  select ideas.* from public.story_ideas as ideas
  join public.stories on stories.id = ideas.story_id
  where ideas.id = target_idea_id
    and ideas.user_id = (select auth.uid())
    and stories.deleted_at is null;
$$;

comment on function public.my_story_idea(uuid) is
  'Internal: one of the caller''s questions or ideas on a live story, or nulls (S1-E17-28).';
revoke execute on function public.my_story_idea(uuid) from public, anon, authenticated;

/* ---------- Reading ---------- */

/**
 * story_ideas: a story's questions and ideas, newest first (S1-E17-27, S1-E17-28).
 * Input: the story's slug.
 * Returns: { outcome: 'ok', title, items: [{ id, kind, body, outcome, done_at, created_at }] },
 *   or { outcome: 'not_found' }. Never a user ID (rule 15). The screen filters Open, Done or All.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/ideas.ts.
 */
create or replace function public.story_ideas(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your notes.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  return jsonb_build_object(
    'outcome', 'ok',
    'title', (select stories.title from public.stories where stories.id = target_story_id),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', ideas.id, 'kind', ideas.kind,
        'body', ideas.body, 'outcome', ideas.outcome, 'done_at', ideas.done_at,
        'created_at', ideas.created_at) order by ideas.created_at desc, ideas.id)
      from public.story_ideas as ideas where ideas.story_id = target_story_id), '[]'::jsonb));
end;
$$;

comment on function public.story_ideas(text) is
  'The caller''s questions, ideas, to-dos and decisions on one story, newest first (S1-E17-27).';
revoke execute on function public.story_ideas(text) from public, anon;
grant execute on function public.story_ideas(text) to authenticated;

/**
 * story_marketing: a story's marketing notes (S1-E17-29); empty fields until the first save.
 * Input: the story's slug.
 * Returns: { outcome: 'ok', notes: { back_cover_blurb, comparable_titles, hooks_keywords,
 *   query_pitch, launch_notes } }, or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 * Who calls it: src/features/atlas/api/marketing.ts.
 */
create or replace function public.story_marketing(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  notes public.story_marketing;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your marketing notes.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into notes from public.story_marketing where story_marketing.story_id = target_story_id;
  return jsonb_build_object('outcome', 'ok', 'notes', jsonb_build_object(
    'back_cover_blurb', coalesce(notes.back_cover_blurb, ''),
    'comparable_titles', coalesce(notes.comparable_titles, ''),
    'hooks_keywords', coalesce(notes.hooks_keywords, ''),
    'query_pitch', coalesce(notes.query_pitch, ''),
    'launch_notes', coalesce(notes.launch_notes, '')));
end;
$$;

comment on function public.story_marketing(text) is
  'The caller''s marketing notes on one story (S1-E17-29).';
revoke execute on function public.story_marketing(text) from public, anon;
grant execute on function public.story_marketing(text) to authenticated;

/* ---------- Changing ---------- */

/**
 * add_story_idea: the quick-add box: one line as a question, idea, to-do or decision
 * (S1-E17-27).
 * Inputs: story_slug; idea_kind; idea_body (1 to 1,000 characters).
 * Returns: { outcome: 'ok', id } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation for an empty or over-long
 *   line or an unknown type, and with hint too_many_ideas past 1,000 in one story (a bound).
 */
create or replace function public.add_story_idea(story_slug text, idea_kind text, idea_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a note.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if (select count(*) from public.story_ideas where story_ideas.story_id = target_story_id) >= 1000 then
    raise exception 'A story can hold at most 1,000 notes.' using errcode = 'check_violation', hint = 'too_many_ideas';
  end if;
  insert into public.story_ideas (story_id, user_id, kind, body)
  values (target_story_id, (select auth.uid()), idea_kind, public.plan_text(idea_body))
  returning id into new_id;
  return jsonb_build_object('outcome', 'ok', 'id', new_id);
end;
$$;

comment on function public.add_story_idea(text, text, text) is
  'Adds a question, idea, to-do or decision to one of the caller''s stories (S1-E17-27).';
revoke execute on function public.add_story_idea(text, text, text) from public, anon;
grant execute on function public.add_story_idea(text, text, text) to authenticated;

/**
 * update_story_idea: changes one of the caller's items; each field saves by itself (S1-E17-28).
 * Inputs: idea_id; changes, an object with any of kind, body, outcome and is_done (true records
 *   today's date as the date it was done, false clears it).
 * Returns: { outcome: 'ok', done_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for a
 *   key it doesn't know, bad_flag when is_done isn't true or false, and from the table's checks.
 */
create or replace function public.update_story_idea(idea_id uuid, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_idea public.story_ideas;
  saved_done_at timestamptz;
begin
  -- Step 1: a signed-in writer, their own item and only known changes.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your notes.' using errcode = 'insufficient_privilege';
  end if;
  target_idea := public.my_story_idea(idea_id);
  if target_idea.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('kind', 'body', 'outcome', 'is_done')) then
    raise exception 'Unknown change to a note.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  if changes ? 'is_done' and jsonb_typeof(changes -> 'is_done') <> 'boolean' then
    raise exception 'Done is true or false.' using errcode = 'check_violation', hint = 'bad_flag';
  end if;
  -- Step 2: change only what was given. Ticking done keeps the first date it was done.
  update public.story_ideas set
    kind = case when changes ? 'kind' then changes ->> 'kind' else kind end,
    body = case when changes ? 'body' then public.plan_text(changes ->> 'body') else body end,
    outcome = case when changes ? 'outcome' then public.plan_text(changes ->> 'outcome') else outcome end,
    done_at = case
      when not changes ? 'is_done' then done_at
      when (changes ->> 'is_done')::boolean then coalesce(done_at, now())
      else null end
  where story_ideas.id = target_idea.id
  returning done_at into saved_done_at;
  return jsonb_build_object('outcome', 'ok', 'done_at', saved_done_at);
end;
$$;

comment on function public.update_story_idea(uuid, jsonb) is
  'Changes one of the caller''s questions or ideas: type, text, outcome or done (S1-E17-28).';
revoke execute on function public.update_story_idea(uuid, jsonb) from public, anon;
grant execute on function public.update_story_idea(uuid, jsonb) to authenticated;

/**
 * delete_story_idea: deletes one of the caller's items, after the screen's second, confirming
 * click.
 * Input: idea_id. Returns: { outcome: 'ok' } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.delete_story_idea(idea_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_idea public.story_ideas;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your notes.' using errcode = 'insufficient_privilege';
  end if;
  target_idea := public.my_story_idea(idea_id);
  if target_idea.id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  delete from public.story_ideas where story_ideas.id = target_idea.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.delete_story_idea(uuid) is
  'Deletes one of the caller''s questions or ideas (S1-E17-28).';
revoke execute on function public.delete_story_idea(uuid) from public, anon;
grant execute on function public.delete_story_idea(uuid) to authenticated;

/**
 * update_story_marketing: changes the caller's marketing notes on a story; each field saves by
 * itself (S1-E17-29). The row is made on the first save.
 * Inputs: story_slug; changes, an object with any of back_cover_blurb, comparable_titles,
 *   hooks_keywords, query_pitch and launch_notes.
 * Returns: { outcome: 'ok', updated_at } or { outcome: 'not_found' }.
 * Errors: insufficient_privilege when signed out; check_violation with hint unknown_change for a
 *   key it doesn't know, and from the table's length checks.
 */
create or replace function public.update_story_marketing(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  saved_at timestamptz;
begin
  -- Step 1: a signed-in writer, their own planned story and only known changes.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change your marketing notes.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_planned_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  if exists (select 1 from jsonb_object_keys(coalesce(changes, '{}'::jsonb)) as change_key
             where change_key not in ('back_cover_blurb', 'comparable_titles', 'hooks_keywords',
                                      'query_pitch', 'launch_notes')) then
    raise exception 'Unknown change to marketing notes.' using errcode = 'check_violation', hint = 'unknown_change';
  end if;
  -- Step 2: the row, made empty on the first save, then only the fields given.
  insert into public.story_marketing (story_id, user_id) values (target_story_id, (select auth.uid()))
  on conflict (story_id) do nothing;
  update public.story_marketing set
    back_cover_blurb = case when changes ? 'back_cover_blurb' then public.plan_text(changes ->> 'back_cover_blurb') else back_cover_blurb end,
    comparable_titles = case when changes ? 'comparable_titles' then public.plan_text(changes ->> 'comparable_titles') else comparable_titles end,
    hooks_keywords = case when changes ? 'hooks_keywords' then public.plan_text(changes ->> 'hooks_keywords') else hooks_keywords end,
    query_pitch = case when changes ? 'query_pitch' then public.plan_text(changes ->> 'query_pitch') else query_pitch end,
    launch_notes = case when changes ? 'launch_notes' then public.plan_text(changes ->> 'launch_notes') else launch_notes end
  where story_marketing.story_id = target_story_id
  returning updated_at into saved_at;
  return jsonb_build_object('outcome', 'ok', 'updated_at', saved_at);
end;
$$;

comment on function public.update_story_marketing(text, jsonb) is
  'Changes the caller''s marketing notes on one story (S1-E17-29).';
revoke execute on function public.update_story_marketing(text, jsonb) from public, anon;
grant execute on function public.update_story_marketing(text, jsonb) to authenticated;
