/*
 * Migration: the prompt of the week on the Writers' hub (bundle GAPS-12c; board WritersHub,
 * "Prompt of the week": the prompt, "412 writers tried it · ends Sunday", "Write from this
 * prompt" and "Another prompt"). Part 3 of GAPS-12.
 *
 * How it works: staff write a prompt in Romanian and English and give it a start day. It is the
 * prompt of the week from that day for 7 days. The hub shows it with how many writers started a
 * story from it; "Another prompt" pages through the earlier ones. "Write from this prompt" opens
 * the new-story screen, and the story made there remembers its prompt.
 * What it adds:
 * - writing_prompts: the prompts (staff content, no personal data);
 * - stories.writing_prompt_id: the prompt a story was started from, if any;
 * - writers_hub_prompts(): the prompts that have started, newest first, for signed-in writers;
 * - start_story_from_prompt(): the writer ties their own new story to a prompt;
 * - admin_save_writing_prompt() and admin_delete_writing_prompt(): staff with the contests area
 *   (owner and admin, architecture 1.8.3), each change in the audit log.
 * Who calls it: src/features/hub/ (the hub card and the staff page at /staff/hub) and
 * src/features/writing/ (the new-story screen).
 * Left out: the board's "the best three go on Discover" has no picking behind it yet, so the
 * card doesn't promise it (docs/board-fixes.md).
 */

create table public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_ro text not null,
  prompt_en text not null,
  -- The first of its 7 days, in Romanian time.
  starts_on date not null,
  -- The staff member who last saved it.
  updated_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting takes it off the hub; stories started from it keep their link.
  deleted_at timestamptz,
  constraint writing_prompts_prompt_ro_length check (char_length(btrim(prompt_ro)) between 1 and 300),
  constraint writing_prompts_prompt_en_length check (char_length(btrim(prompt_en)) between 1 and 300)
);

comment on table public.writing_prompts is
  'kind: platform
The prompt of the week on the Writers'' hub: staff-written words in Romanian and English with a start day (GAPS-12c). No personal data.';

-- One prompt per start day, so "the prompt of the week" is never two prompts.
create unique index writing_prompts_one_per_start_day
  on public.writing_prompts (starts_on) where deleted_at is null;

create trigger writing_prompts_set_updated_at
  before update on public.writing_prompts
  for each row execute function public.set_updated_at();
alter table public.writing_prompts enable row level security;

/**
 * writing_prompts_select_contest_staff: staff with the contests area read every prompt that isn't
 * deleted, upcoming ones included, for the staff page. Members never read the table: they get
 * the started prompts through writers_hub_prompts(). Writes go through the admin functions.
 */
create policy writing_prompts_select_contest_staff
  on public.writing_prompts for select to authenticated
  using (deleted_at is null and (select public.staff_may('contests', 'view')));
comment on policy writing_prompts_select_contest_staff on public.writing_prompts is
  'Allows staff with the contests area to read the writing prompts that aren''t deleted, upcoming ones included (GAPS-12c).';

grant select on public.writing_prompts to authenticated;

-- The prompt a story was started from. Kept when the prompt is deleted from the hub (soft
-- delete); it only says which staff-written prompt the writer picked, nothing about a person.
alter table public.stories
  add column writing_prompt_id uuid references public.writing_prompts (id);
comment on column public.stories.writing_prompt_id is
  'The writing prompt this story was started from, or null (GAPS-12c).';
create index stories_writing_prompt_id on public.stories (writing_prompt_id)
  where writing_prompt_id is not null;

/**
 * writers_hub_prompts: the prompts that have started, newest first, for the hub card.
 * Inputs: none. Returns: up to 8 rows: the prompt's ID and words, its first and last day, whether
 *   it is this week's (today is one of its 7 days) and how many writers have a story started
 *   from it (a number only; deleted stories don't count). Nothing for a signed-out caller.
 * Flow: HubPrompt → useHubPrompts → api/hubPrompts.ts → this function.
 */
create function public.writers_hub_prompts()
returns table (
  prompt_id uuid,
  prompt_ro text,
  prompt_en text,
  starts_on date,
  ends_on date,
  is_current boolean,
  writer_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    writing_prompts.id,
    writing_prompts.prompt_ro,
    writing_prompts.prompt_en,
    writing_prompts.starts_on,
    writing_prompts.starts_on + 6,
    public.romania_today() <= writing_prompts.starts_on + 6,
    (select count(distinct stories.user_id)::integer from public.stories
      where stories.writing_prompt_id = writing_prompts.id and stories.deleted_at is null)
  from public.writing_prompts
  where (select auth.uid()) is not null
    and writing_prompts.deleted_at is null
    -- An upcoming prompt stays hidden until its first day.
    and writing_prompts.starts_on <= public.romania_today()
  order by writing_prompts.starts_on desc
  limit 8;
$$;

comment on function public.writers_hub_prompts() is
  'The writing prompts that have started, newest first, each with how many writers started a story from it, for the Writers'' hub (GAPS-12c).';
revoke all on function public.writers_hub_prompts() from public, anon;
grant execute on function public.writers_hub_prompts() to authenticated;

/**
 * start_story_from_prompt: ties one of the caller's own stories to a prompt, once.
 * Inputs: story_slug (the caller's story), prompt_id (a prompt that has started).
 * Returns: true when the story now remembers the prompt; false when the story isn't the
 *   caller's, is deleted or already has a prompt, or the prompt isn't on the hub. It answers
 *   false rather than raising, so a new story is never lost over its prompt.
 * Errors: insufficient_privilege when nobody is signed in.
 * Flow: the new-story screen calls it right after create_story().
 */
create function public.start_story_from_prompt(story_slug text, prompt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  changed_rows integer;
begin
  -- Step 1: a signed-in writer only.
  if caller_id is null then
    raise exception 'Log in to write from a prompt.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the prompt must be one the hub shows (started, not deleted).
  if not exists (select 1 from public.writing_prompts
                 where writing_prompts.id = prompt_id and writing_prompts.deleted_at is null
                   and writing_prompts.starts_on <= public.romania_today()) then
    return false;
  end if;
  -- Step 3: the caller's own live story, and only if it has no prompt yet.
  update public.stories set writing_prompt_id = prompt_id
  where stories.slug = story_slug and stories.user_id = caller_id
    and stories.deleted_at is null and stories.writing_prompt_id is null;
  get diagnostics changed_rows = row_count;
  return changed_rows = 1;
end;
$$;

comment on function public.start_story_from_prompt(text, uuid) is
  'The signed-in writer ties their own story to a started writing prompt, once; false when it can''t (GAPS-12c).';
revoke all on function public.start_story_from_prompt(text, uuid) from public, anon;
grant execute on function public.start_story_from_prompt(text, uuid) to authenticated;

/**
 * admin_save_writing_prompt: adds a writing prompt, or changes one.
 * Inputs: prompt_id (null to add one), prompt_ro and prompt_en (1 to 300 characters each),
 *   starts_on (the first of its 7 days).
 * Returns: the prompt's ID.
 * Errors: insufficient_privilege unless the caller may act on contests; check_violation for an
 *   empty or long text or a missing day; unique_violation when another prompt starts that day;
 *   no_data_found for an unknown prompt.
 * Logged as writing_prompt.saved with the before and after values.
 */
create function public.admin_save_writing_prompt(prompt_id uuid, prompt_ro text, prompt_en text, starts_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.writing_prompts;
  saved public.writing_prompts;
begin
  -- Step 1: staff with the contests area only (the server decides, architecture 1.8.1).
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change writing prompts.' using errcode = 'insufficient_privilege';
  end if;
  if starts_on is null then
    raise exception 'A prompt needs a start day.' using errcode = 'check_violation';
  end if;
  -- Step 2: a new prompt, or the change to one that exists.
  if prompt_id is null then
    insert into public.writing_prompts (prompt_ro, prompt_en, starts_on, updated_by_user_id)
    values (btrim(prompt_ro), btrim(prompt_en), starts_on, (select auth.uid()))
    returning * into saved;
  else
    select * into before_row from public.writing_prompts
    where writing_prompts.id = prompt_id and deleted_at is null for update;
    if before_row.id is null then
      raise exception 'There is no such writing prompt.' using errcode = 'no_data_found';
    end if;
    update public.writing_prompts set prompt_ro = btrim(admin_save_writing_prompt.prompt_ro),
      prompt_en = btrim(admin_save_writing_prompt.prompt_en),
      starts_on = admin_save_writing_prompt.starts_on,
      updated_by_user_id = (select auth.uid())
    where id = prompt_id returning * into saved;
  end if;
  -- Step 3: the audit log keeps what changed, in the same transaction.
  perform public.log_staff_action('writing_prompt.saved', 'writing_prompts', saved.id::text, null, null,
    case when before_row.id is null then null
         else jsonb_build_object('prompt_ro', before_row.prompt_ro, 'prompt_en', before_row.prompt_en,
                                 'starts_on', before_row.starts_on) end,
    jsonb_build_object('prompt_ro', saved.prompt_ro, 'prompt_en', saved.prompt_en, 'starts_on', saved.starts_on));
  return saved.id;
end;
$$;

comment on function public.admin_save_writing_prompt(uuid, text, text, date) is
  'Contest staff add or change a writing prompt; logged with before and after (GAPS-12c).';
revoke all on function public.admin_save_writing_prompt(uuid, text, text, date) from public, anon;
grant execute on function public.admin_save_writing_prompt(uuid, text, text, date) to authenticated;

/**
 * admin_delete_writing_prompt: takes a writing prompt off the hub and the staff list. Stories
 * started from it keep their link; the audit log keeps what it said.
 * Input: prompt_id. Returns: true.
 * Errors: insufficient_privilege unless the caller may act on contests; no_data_found for an
 *   unknown prompt.
 */
create function public.admin_delete_writing_prompt(prompt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted public.writing_prompts;
begin
  if not public.staff_may('contests', 'act') then
    raise exception 'Only contest staff can change writing prompts.' using errcode = 'insufficient_privilege';
  end if;
  update public.writing_prompts set deleted_at = now(), updated_by_user_id = (select auth.uid())
  where id = prompt_id and deleted_at is null returning * into deleted;
  if deleted.id is null then
    raise exception 'There is no such writing prompt.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('writing_prompt.deleted', 'writing_prompts', deleted.id::text, null, null,
    jsonb_build_object('prompt_ro', deleted.prompt_ro, 'prompt_en', deleted.prompt_en, 'starts_on', deleted.starts_on),
    null);
  return true;
end;
$$;

comment on function public.admin_delete_writing_prompt(uuid) is
  'Contest staff delete a writing prompt; logged (GAPS-12c).';
revoke all on function public.admin_delete_writing_prompt(uuid) from public, anon;
grant execute on function public.admin_delete_writing_prompt(uuid) to authenticated;
