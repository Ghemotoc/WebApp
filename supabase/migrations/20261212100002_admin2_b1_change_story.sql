-- Migration: staff open and change a story (bundle ADMIN-2, part b1; story S1-E11-08, part 08a;
-- screen 8.11; architecture 1.8.4 and 1.8.5).
-- What it adds:
--   story_revisions             every staff change to a story: who, when, the reason, before and after
--   story_restrictions          stories staff restricted: still open from a link, left out of lists
--   is_story_restricted()       the shared check, used by listed_stories()
--   admin_change_story_settings()  rating, finished or ongoing, comments, category, tags, language
--                                  and content labels, with a reason
--   admin_set_story_visibility()   shown, restricted or hidden, with a reason
--   admin_set_chapter_visibility() one chapter shown or hidden, with a reason
--   notifications.story_revision_id, so "story_changed_by_staff" can say what changed and why
--   admin_story_overview()      now also carries the settings and the visibility
-- The rules (decided 16 Oct 2026, late evening, Q14; architecture 1.8.5): staff may hide or
-- restrict a story, change its settings and visibility and fix its details; they never edit the
-- writer's words, so nothing here touches a title, a blurb, a content note or a chapter's text.
-- Every change needs a reason (a list plus free text), is stored as a version, is in the audit log
-- with the owner's user ID, and tells the writer: a statement of reasons when it restricts
-- content (hiding, restricting, a raised rating; DSA art. 17), a notification otherwise.
-- Who may change (architecture 1.8.3): owner, admin and moderator (staff_may('story_changes'));
-- support and the content editor are refused by the server.
-- Called by: src/features/staff/api/staffStoryChanges.ts.

/* ---------- 1. The version of every staff change ---------- */

create table public.story_revisions (
  id uuid primary key default gen_random_uuid(),
  -- The story's owner, so the history follows the writer's user ID (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  -- Set when the change was to one chapter (hidden or shown again).
  chapter_id uuid references public.chapters (id) on delete cascade,
  changed_by_user_id uuid not null references public.profiles (id),
  change_kind text not null constraint story_revisions_change_kind_is_known
    check (change_kind in ('settings', 'visibility', 'chapter_visibility')),
  -- The reason from the list (S1-E11-08 criterion 2), also the rule a statement of reasons names.
  reason_code text not null constraint story_revisions_reason_code_is_known
    check (reason_code in ('rating_rules', 'story_details', 'community_rules', 'illegal_content',
                           'personal_data', 'copyright', 'writer_asked', 'other')),
  reason_text text not null constraint story_revisions_reason_text_is_written
    check (btrim(reason_text) <> '' and char_length(reason_text) <= 1000),
  -- Only the fields that changed, before and after.
  before_values jsonb not null,
  after_values jsonb not null,
  audit_log_id uuid references public.audit_log (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.story_revisions is
  'kind: staff
Every staff change to a story''s settings or visibility: who, when, the reason and the before and after (S1-E11-08 criterion "a new version is stored"). Written only by the admin_* change functions.';

create index story_revisions_story on public.story_revisions (story_id, created_at desc);
create index story_revisions_user on public.story_revisions (user_id);

create trigger story_revisions_set_updated_at
  before update on public.story_revisions
  for each row execute function public.set_updated_at();

create trigger story_revisions_refuse_user_id_change
  before update on public.story_revisions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_revisions enable row level security;

/** Policy story_revisions_select_staff: staff with the Stories area read a story's history. */
create policy story_revisions_select_staff
  on public.story_revisions
  for select
  to authenticated
  using ((select public.staff_may('stories', 'view')));

comment on policy story_revisions_select_staff on public.story_revisions is
  'Allows owner, admin, moderator and support, in a staff session, to read the history of staff changes to stories; nobody else (S1-E11-08).';

revoke all on public.story_revisions from anon, authenticated;
grant select on public.story_revisions to authenticated;

/* ---------- 2. Restricted stories ---------- */

create table public.story_restrictions (
  id uuid primary key default gen_random_uuid(),
  -- The story's owner (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  story_id uuid not null references public.stories (id) on delete cascade,
  restricted_by_user_id uuid not null references public.profiles (id),
  reason text not null constraint story_restrictions_reason_is_written
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  lifted_at timestamptz,
  lifted_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_restrictions_lift_fields_go_together check ((lifted_at is null) = (lifted_by_user_id is null))
);

comment on table public.story_restrictions is
  'kind: staff
Stories staff restricted (S1-E11-08, proposal for Robert): the story still opens from its link, in libraries and on the writer''s profile, but is left out of Discover, shelves, search and tag lists. Read by is_story_restricted().';

-- One live restriction per story.
create unique index story_restrictions_one_live_per_story
  on public.story_restrictions (story_id) where lifted_at is null;
create index story_restrictions_user on public.story_restrictions (user_id);

create trigger story_restrictions_set_updated_at
  before update on public.story_restrictions
  for each row execute function public.set_updated_at();

create trigger story_restrictions_refuse_user_id_change
  before update on public.story_restrictions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.story_restrictions enable row level security;

/** Policy story_restrictions_select_staff: staff with the Stories area see what is restricted. */
create policy story_restrictions_select_staff
  on public.story_restrictions
  for select
  to authenticated
  using ((select public.staff_may('stories', 'view')));

comment on policy story_restrictions_select_staff on public.story_restrictions is
  'Allows owner, admin, moderator and support, in a staff session, to read story restrictions (S1-E11-08).';

/** Policy story_restrictions_select_own: the writer sees that their own story is restricted. */
create policy story_restrictions_select_own
  on public.story_restrictions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy story_restrictions_select_own on public.story_restrictions is
  'Allows the writer to read the restrictions on their own stories, so nothing is done to their work out of their sight (S1-E11-08; DSA art. 17); nobody else''s.';

revoke all on public.story_restrictions from anon, authenticated;
grant select on public.story_restrictions to authenticated;

/**
 * is_story_restricted: true while staff have a story restricted.
 * Input: target_story_id. Returns: boolean. Raises nothing.
 * Where it fits: listed_stories() leaves restricted stories out of public lists.
 */
create or replace function public.is_story_restricted(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.story_restrictions
    where story_restrictions.story_id = target_story_id and story_restrictions.lifted_at is null);
$$;
comment on function public.is_story_restricted(uuid) is
  'True while staff have the story restricted: it stays out of Discover, shelves, search and tags (S1-E11-08).';
grant execute on function public.is_story_restricted(uuid) to anon, authenticated;

/**
 * listed_stories: as in S1-E2-06, plus: a restricted story is left out of every public list
 *   except the reader's own library, someone's library they may see and the writer's profile, and
 *   the writer still sees it in their own lists (S1-E11-08, proposal).
 */
create or replace function public.listed_stories(
  list_kind text, list_key text, category_slug text, completion public.completion_status, language text
)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select stories.* from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = (select auth.uid()))
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer')
         or stories.user_id = (select auth.uid())
         or not public.is_story_restricted(stories.id))
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    )
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    and public.list_holds_story(stories, list_kind, list_key);
$$;

/* ---------- 3. Shared steps of every change ---------- */

/**
 * admin_story_change_target: the checks every staff change to a story starts with.
 * Input: target_story_id, reason_code (from the list), reason_text (free text).
 * Returns: the story row.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may change stories (owner,
 *   admin, moderator in a staff session); check_violation with hint reason_needed when the reason
 *   is missing or unknown, or no_such_story when the story doesn't exist or its writer deleted it.
 * Internal: the three admin_* change functions below.
 */
create or replace function public.admin_story_change_target(
  target_story_id uuid, reason_code text, reason_text text
)
returns public.stories
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story_row public.stories;
begin
  -- Step 1: the server decides who may change a story, never the menu (architecture 1.8.1).
  if not public.staff_may('story_changes', 'act') then
    raise exception 'Only owner, admin and moderator staff can change a story.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: a reason from the list plus a few words (S1-E11-08 criterion 2).
  if reason_code is null or reason_code not in ('rating_rules', 'story_details', 'community_rules',
       'illegal_content', 'personal_data', 'copyright', 'writer_asked', 'other')
     or btrim(coalesce(reason_text, '')) = '' or char_length(reason_text) > 1000 then
    raise exception 'Pick a reason and say why, in at most 1000 characters.'
      using errcode = 'check_violation', hint = 'reason_needed';
  end if;
  -- Step 3: a live story.
  select * into story_row from public.stories
  where stories.id = target_story_id and stories.deleted_at is null;
  if not found then
    raise exception 'There is no such story.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  return story_row;
end;
$$;
comment on function public.admin_story_change_target(uuid, text, text) is
  'Internal: the staff, reason and story checks every story change starts with (S1-E11-08).';
revoke execute on function public.admin_story_change_target(uuid, text, text) from public, anon, authenticated;

/**
 * admin_story_reason_ground: whether a reason rests on the law or on our terms (DSA art. 17(3)(d)
 *   and (e)): illegal content, someone's personal data and copyright are the law.
 * Input: reason_code. Returns: statement_ground. Internal.
 */
create or replace function public.admin_story_reason_ground(reason_code text)
returns public.statement_ground
language sql
immutable
set search_path = ''
as $$
  select case when reason_code in ('illegal_content', 'personal_data', 'copyright')
    then 'law' else 'terms' end::public.statement_ground;
$$;
comment on function public.admin_story_reason_ground(text) is
  'Internal: law for illegal content, personal data and copyright, terms otherwise (S1-E11-08; DSA art. 17).';
revoke execute on function public.admin_story_reason_ground(text) from public, anon, authenticated;

/**
 * admin_record_story_change: stores the version, writes the audit log and tells the writer, all in
 *   the caller's transaction (architecture 1.8.5).
 * Input: story_row (before the change), the chapter when one chapter changed, change_kind, the
 *   reason, the changed fields before and after, and statement_action: the action of the statement
 *   of reasons when the change restricts content ('hide', 'restrict', 'rating_raised'), or null
 *   for a change that restricts nothing (the writer then gets a notification instead).
 * Returns: the new story_revisions id. Internal.
 */
create or replace function public.admin_record_story_change(
  story_row public.stories, target_chapter_id uuid, change_kind text, reason_code text,
  reason_text text, values_before jsonb, values_after jsonb, statement_action public.statement_action
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
  revision_id uuid;
  item_type public.reportable_type := case when target_chapter_id is null then 'story' else 'chapter' end;
  item_id uuid := coalesce(target_chapter_id, story_row.id);
begin
  -- Step 1: the audit log, with the owner's user ID (S1-E11-08 criterion "any change").
  audit_id := public.log_staff_action('story.' || change_kind || '_changed', item_type::text, item_id::text,
    story_row.user_id, reason_code || ': ' || btrim(reason_text), values_before, values_after);
  -- Step 2: the version.
  insert into public.story_revisions (user_id, story_id, chapter_id, changed_by_user_id, change_kind,
    reason_code, reason_text, before_values, after_values, audit_log_id)
  values (story_row.user_id, story_row.id, target_chapter_id, (select auth.uid()), change_kind,
    reason_code, btrim(reason_text), values_before, values_after, audit_id)
  returning id into revision_id;
  -- Step 3: the writer is told: a statement of reasons when content is restricted (criterion 3),
  -- otherwise a notification saying what changed and why (criterion 4).
  if statement_action is not null then
    perform public.issue_statement_of_reasons(story_row.user_id, statement_action,
      public.admin_story_reason_ground(reason_code), reason_code, reason_text,
      jsonb_build_object('story_id', story_row.id, 'item_type', item_type, 'item_id', item_id));
  else
    perform public.notify(story_row.user_id, 'story_changed_by_staff', null,
      jsonb_build_object('story_id', story_row.id, 'chapter_id', target_chapter_id,
        'story_revision_id', revision_id));
  end if;
  return revision_id;
end;
$$;
comment on function public.admin_record_story_change(public.stories, uuid, text, text, text, jsonb, jsonb, public.statement_action) is
  'Internal: version, audit log and the writer''s statement of reasons or notification for one staff change (S1-E11-08).';
revoke execute on function public.admin_record_story_change(public.stories, uuid, text, text, text, jsonb, jsonb, public.statement_action)
  from public, anon, authenticated;

/* ---------- 4. Settings and details ---------- */

/**
 * admin_story_settings_json: the settings staff may change, as one JSON object: rating, finished
 *   or ongoing, comments, category, language, the three content labels and the tags (sorted names).
 * Input: target, the story row. Returns: jsonb. Internal (and admin_story_overview()).
 */
create or replace function public.admin_story_settings_json(target public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', target.rating,
    'completion_status', target.completion_status,
    'comments_enabled', target.comments_enabled,
    'category_slug', (select categories.slug from public.categories where categories.id = target.category_id),
    'language_code', target.language_code,
    'is_fan_fiction', target.is_fan_fiction,
    'is_parody', target.is_parody,
    'deals_with_abuse_or_coercion', target.deals_with_abuse_or_coercion,
    'tag_names', coalesce((
      select jsonb_agg(tags.name order by tags.name)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      where story_tags.story_id = target.id), '[]'::jsonb));
$$;
comment on function public.admin_story_settings_json(public.stories) is
  'Internal: the settings staff may change on a story, as JSON (S1-E11-08).';
revoke execute on function public.admin_story_settings_json(public.stories) from public, anon, authenticated;

/**
 * admin_apply_story_settings: checks and saves the settings in `changes`; anything left out keeps
 *   its value. Uses the writer's own checks (check_story_basics(), check_story_labels()), so staff
 *   can't save a story the writer couldn't. The title, blurb and content note are the writer's
 *   words and are never read from `changes` (Q14).
 * Input: story_row, changes. Returns nothing. Errors: check_violation from the shared checks, or
 *   for more than 10 tags. Internal.
 */
create or replace function public.admin_apply_story_settings(story_row public.stories, changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_language text := coalesce(changes ->> 'language_code', story_row.language_code);
  new_category_id uuid;
  new_labels jsonb;
begin
  -- Step 1: category and language, checked as when the writer saves (S1-E3-01).
  new_category_id := public.check_story_basics(story_row.title, story_row.blurb, new_language,
    coalesce(changes ->> 'category_slug',
      (select categories.slug from public.categories where categories.id = story_row.category_id)));
  -- Step 2: the labels, filled from the row and checked together (S1-E3-06).
  new_labels := jsonb_build_object('rating', story_row.rating, 'is_fan_fiction', story_row.is_fan_fiction,
    'is_parody', story_row.is_parody, 'deals_with_abuse_or_coercion', story_row.deals_with_abuse_or_coercion,
    'content_note', story_row.content_note, 'ai_disclosure', story_row.ai_disclosure)
    || jsonb_strip_nulls(jsonb_build_object('rating', changes -> 'rating',
      'is_fan_fiction', changes -> 'is_fan_fiction', 'is_parody', changes -> 'is_parody',
      'deals_with_abuse_or_coercion', changes -> 'deals_with_abuse_or_coercion'));
  perform public.check_story_labels(new_labels);
  -- Step 3: save.
  update public.stories set
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean
  where stories.id = story_row.id;
  -- Step 4: the tags, when given, through the writer's own tag rules (new names wait for staff).
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(story_row.id, story_row.user_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;
end;
$$;
comment on function public.admin_apply_story_settings(public.stories, jsonb) is
  'Internal: checks and saves the settings staff changed, never the writer''s words (S1-E11-08).';
revoke execute on function public.admin_apply_story_settings(public.stories, jsonb) from public, anon, authenticated;

/**
 * admin_change_story_settings: staff change a story's settings and details with a reason.
 * Input: target_story_id; changes, any of rating, completion_status, comments_enabled,
 *   category_slug, language_code, is_fan_fiction, is_parody, deals_with_abuse_or_coercion and
 *   tag_names (an array); reason_code and reason_text.
 * Returns: { revision_id, changed: [field names], statement_sent: boolean }.
 * Errors: as admin_story_change_target(); check_violation from the writer's checks; check_violation
 *   (hint nothing_changed) when the changes match what is saved.
 * The writer gets a statement of reasons when the rating went up (younger readers lose it,
 *   S1-E11-08 criterion 3), otherwise a notification (criterion 4).
 * Where it fits: StaffStorySettingsForm → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_change_story_settings(
  target_story_id uuid, changes jsonb, reason_code text, reason_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_row public.stories := public.admin_story_change_target(target_story_id, reason_code, reason_text);
  settings_before jsonb := public.admin_story_settings_json(story_row);
  settings_after jsonb;
  changed_fields text[];
  revision_id uuid;
  rating_went_up boolean;
begin
  -- Step 1: save, then read back what is saved now.
  perform public.admin_apply_story_settings(story_row, coalesce(changes, '{}'::jsonb));
  select public.admin_story_settings_json(stories) into settings_after
  from public.stories where stories.id = story_row.id;
  -- Step 2: only the fields that really changed go into the version.
  select array_agg(field order by field) into changed_fields
  from jsonb_object_keys(settings_after) as field
  where settings_after -> field is distinct from settings_before -> field;
  if changed_fields is null then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'nothing_changed';
  end if;
  -- Step 3: a raised rating restricts who can read it, so it needs a statement of reasons.
  rating_went_up := (settings_after ->> 'rating')::public.story_rating > story_row.rating;
  revision_id := public.admin_record_story_change(story_row, null, 'settings', reason_code, reason_text,
    (select jsonb_object_agg(field, settings_before -> field) from unnest(changed_fields) as field),
    (select jsonb_object_agg(field, settings_after -> field) from unnest(changed_fields) as field),
    case when rating_went_up then 'rating_raised'::public.statement_action end);
  return jsonb_build_object('revision_id', revision_id, 'changed', to_jsonb(changed_fields),
    'statement_sent', rating_went_up);
end;
$$;
comment on function public.admin_change_story_settings(uuid, jsonb, text, text) is
  'Staff change a story''s settings and details with a reason; versioned, audited, the writer told (S1-E11-08).';
revoke execute on function public.admin_change_story_settings(uuid, jsonb, text, text) from public, anon;
grant execute on function public.admin_change_story_settings(uuid, jsonb, text, text) to authenticated;

/* ---------- 5. Visibility ---------- */

/**
 * admin_story_visibility: 'removed' or 'hidden' while a moderator's decision stands, 'restricted'
 *   while staff have it restricted, otherwise 'shown'.
 * Input: target_story_id. Returns: text. Internal (and admin_story_overview()).
 */
create or replace function public.admin_story_visibility(target_story_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.moderated_state_of('story', target_story_id)::text,
    case when public.is_story_restricted(target_story_id) then 'restricted' else 'shown' end);
$$;
comment on function public.admin_story_visibility(uuid) is
  'Internal: shown, restricted, hidden or removed, as staff see a story (S1-E11-08).';
revoke execute on function public.admin_story_visibility(uuid) from public, anon, authenticated;

/**
 * admin_end_story_visibility_state: ends a hide or a restriction before the story moves on.
 * Input: item_type and item_id (a story or a chapter), the state it leaves, the reason.
 * Returns nothing. Internal: the two visibility functions below; their own audit row covers it.
 */
create or replace function public.admin_end_story_visibility_state(
  item_type public.reportable_type, item_id uuid, leaving_state text, reason_text text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if leaving_state = 'hidden' then
    update public.moderated_items set restored_at = now(), restored_by_user_id = (select auth.uid()),
      restore_reason = btrim(reason_text)
    where moderated_items.item_type = admin_end_story_visibility_state.item_type
      and moderated_items.item_id = admin_end_story_visibility_state.item_id
      and moderated_items.restored_at is null;
  elsif leaving_state = 'restricted' then
    update public.story_restrictions set lifted_at = now(), lifted_by_user_id = (select auth.uid())
    where story_restrictions.story_id = admin_end_story_visibility_state.item_id
      and story_restrictions.lifted_at is null;
  end if;
end;
$$;
comment on function public.admin_end_story_visibility_state(public.reportable_type, uuid, text, text) is
  'Internal: ends a staff hide or restriction before a story or chapter changes visibility (S1-E11-08).';
revoke execute on function public.admin_end_story_visibility_state(public.reportable_type, uuid, text, text)
  from public, anon, authenticated;

/**
 * admin_set_story_visibility: staff show, restrict or hide a story, with a reason.
 * Input: target_story_id; wanted_visibility, 'shown', 'restricted' or 'hidden'; the reason.
 * Returns: the new story_revisions id.
 * Errors: as admin_story_change_target(); check_violation with hint removed_by_case when a case
 *   removed the story (an appeal or the case puts it back, S1-E10-07), nothing_changed when it is
 *   already so, or bad_visibility for anything else.
 * Hidden: only the writer and staff see it (S1-E10-06). Restricted: it still opens from its link
 *   but no list promotes it (proposal). Both send a statement of reasons; shown again sends a
 *   notification.
 * Where it fits: StaffStoryVisibilityForm → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_set_story_visibility(
  target_story_id uuid, wanted_visibility text, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_row public.stories := public.admin_story_change_target(target_story_id, reason_code, reason_text);
  current_visibility text := public.admin_story_visibility(target_story_id);
begin
  -- Step 1: a move staff may make here.
  if wanted_visibility is null or wanted_visibility not in ('shown', 'restricted', 'hidden') then
    raise exception 'Pick shown, restricted or hidden.' using errcode = 'check_violation', hint = 'bad_visibility';
  end if;
  if current_visibility = 'removed' then
    raise exception 'A case removed this story; only the case or an appeal can bring it back.'
      using errcode = 'check_violation', hint = 'removed_by_case';
  end if;
  if current_visibility = wanted_visibility then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'nothing_changed';
  end if;
  -- Step 2: leave the current state, then enter the new one.
  perform public.admin_end_story_visibility_state('story', story_row.id, current_visibility, reason_text);
  if wanted_visibility = 'hidden' then
    insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
    values (story_row.user_id, 'story', story_row.id, 'hidden', (select auth.uid()), btrim(reason_text));
  elsif wanted_visibility = 'restricted' then
    insert into public.story_restrictions (user_id, story_id, restricted_by_user_id, reason)
    values (story_row.user_id, story_row.id, (select auth.uid()), btrim(reason_text));
  end if;
  -- Step 3: the version, the audit log and the writer's statement or notification.
  return public.admin_record_story_change(story_row, null, 'visibility', reason_code, reason_text,
    jsonb_build_object('visibility', current_visibility), jsonb_build_object('visibility', wanted_visibility),
    case wanted_visibility when 'hidden' then 'hide' when 'restricted' then 'restrict' end::public.statement_action);
end;
$$;
comment on function public.admin_set_story_visibility(uuid, text, text, text) is
  'Staff show, restrict or hide a story with a reason; versioned, audited, the writer told (S1-E11-08).';
revoke execute on function public.admin_set_story_visibility(uuid, text, text, text) from public, anon;
grant execute on function public.admin_set_story_visibility(uuid, text, text, text) to authenticated;

/**
 * admin_set_chapter_visibility: staff hide one chapter, or show it again, with a reason.
 * Input: target_chapter_id; wanted_visibility, 'shown' or 'hidden'; the reason.
 * Returns: the new story_revisions id.
 * Errors: as admin_story_change_target() (no_such_story also for a missing or deleted chapter);
 *   check_violation with hint removed_by_case, nothing_changed or bad_visibility, as above.
 * Where it fits: StaffStoryChapters → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_set_chapter_visibility(
  target_chapter_id uuid, wanted_visibility text, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owning_story_id uuid := (select chapters.story_id from public.chapters
                           where chapters.id = target_chapter_id and chapters.deleted_at is null);
  story_row public.stories := public.admin_story_change_target(owning_story_id, reason_code, reason_text);
  current_visibility text := coalesce(public.moderated_state_of('chapter', target_chapter_id)::text, 'shown');
begin
  -- Step 1: a move staff may make here.
  if wanted_visibility is null or wanted_visibility not in ('shown', 'hidden') then
    raise exception 'Pick shown or hidden.' using errcode = 'check_violation', hint = 'bad_visibility';
  end if;
  if current_visibility = 'removed' then
    raise exception 'A case removed this chapter; only the case or an appeal can bring it back.'
      using errcode = 'check_violation', hint = 'removed_by_case';
  end if;
  if current_visibility = wanted_visibility then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'nothing_changed';
  end if;
  -- Step 2: hide it, or end the hide.
  if wanted_visibility = 'hidden' then
    insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
    values (story_row.user_id, 'chapter', target_chapter_id, 'hidden', (select auth.uid()), btrim(reason_text));
  else
    perform public.admin_end_story_visibility_state('chapter', target_chapter_id, 'hidden', reason_text);
  end if;
  -- Step 3: the version, the audit log and the writer's statement or notification.
  return public.admin_record_story_change(story_row, target_chapter_id, 'chapter_visibility', reason_code,
    reason_text, jsonb_build_object('visibility', current_visibility),
    jsonb_build_object('visibility', wanted_visibility),
    case when wanted_visibility = 'hidden' then 'hide'::public.statement_action end);
end;
$$;
comment on function public.admin_set_chapter_visibility(uuid, text, text, text) is
  'Staff hide one chapter or show it again with a reason; versioned, audited, the writer told (S1-E11-08).';
revoke execute on function public.admin_set_chapter_visibility(uuid, text, text, text) from public, anon;
grant execute on function public.admin_set_chapter_visibility(uuid, text, text, text) to authenticated;

/* ---------- 6. The writer's notification ---------- */

alter table public.notifications
  add column story_revision_id uuid references public.story_revisions (id) on delete cascade;
comment on column public.notifications.story_revision_id is
  'For story_changed_by_staff: the staff change the writer is told about (S1-E11-08 criterion 4).';

/**
 * notify: as in FORUMS-2d, plus story_revision_id from `about`; story_changed_by_staff can't be
 *   switched off, like a moderation decision, because it is staff acting on the writer's work.
 */
create or replace function public.notify(
  recipient_id uuid, notification_kind public.notification_kind, actor_id uuid, about jsonb,
  group_key text default null, group_window interval default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grouped public.notifications;
begin
  -- Step 1: never one's own action, never across a block.
  if recipient_id is null or recipient_id = actor_id then
    return;
  end if;
  if actor_id is not null and exists (
      select 1 from public.blocks
      where (blocks.user_id = recipient_id and blocks.blocked_user_id = actor_id)
         or (blocks.user_id = actor_id and blocks.blocked_user_id = recipient_id)) then
    return;
  end if;
  -- Step 2: a fresh grouped row takes the new person instead of a new row.
  if notify.group_key is not null then
    select * into grouped from public.notifications
    where notifications.user_id = recipient_id and notifications.group_key = notify.group_key
      and notifications.created_at > now() - group_window
    order by notifications.created_at desc limit 1
    for update;
    if grouped.id is not null then
      if actor_id = any (grouped.actor_user_ids) then
        return;
      end if;
      update public.notifications set
        actor_user_ids = (array[actor_id] || grouped.actor_user_ids)[1:50],
        actor_count = grouped.actor_count + 1,
        read_at = null,
        updated_at = now()
      where notifications.id = grouped.id;
      return;
    end if;
  end if;
  -- Step 3: a new row; a decision, an appeal's outcome or a staff change can't be switched off
  -- (DSA art. 17, 20; S1-E11-08).
  insert into public.notifications (user_id, kind, actor_user_ids, actor_count, story_id, chapter_id,
    comment_id, case_id, decision, statement_id, appeal_id, mail_thread_id, space_id, change_request_id,
    story_revision_id, group_key, is_required)
  values (recipient_id, notification_kind,
    case when actor_id is null then '{}'::uuid[] else array[actor_id] end,
    case when actor_id is null then 0 else 1 end,
    (about ->> 'story_id')::uuid, (about ->> 'chapter_id')::uuid, (about ->> 'comment_id')::uuid,
    (about ->> 'case_id')::uuid, (about ->> 'decision')::public.moderation_action,
    (about ->> 'statement_id')::uuid, (about ->> 'appeal_id')::uuid, (about ->> 'mail_thread_id')::uuid,
    (about ->> 'space_id')::uuid, (about ->> 'change_request_id')::uuid,
    (about ->> 'story_revision_id')::uuid, notify.group_key,
    notification_kind in ('moderation_decision', 'appeal_decided', 'customisation_change_requested',
                          'story_changed_by_staff'));
end;
$$;

/**
 * notification_category: as in CLASSES-e; a staff change to a story is a notice from the team.
 */
create or replace function public.notification_category(kind public.notification_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case kind
    when 'new_chapter' then 'stories'
    when 'new_follower' then 'follows'
    when 'moderation_decision' then 'staff'
    when 'report_outcome' then 'staff'
    when 'appeal_decided' then 'staff'
    when 'moderator_mail_reply' then 'staff'
    when 'tag_rejected' then 'staff'
    when 'age_check_decided' then 'staff'
    when 'age_check_18_invite' then 'staff'
    when 'parental_consent_agreed' then 'staff'
    when 'parental_consent_withdrawn' then 'staff'
    when 'login_method_added' then 'staff'
    when 'login_method_removed' then 'staff'
    when 'teacher_check_decided' then 'staff'
    when 'teacher_badge_removed' then 'staff'
    when 'data_export_ready' then 'staff'
    when 'stories_export_ready' then 'staff'
    when 'reading_reminder' then 'staff'
    when 'space_join_request' then 'follows'
    when 'space_join_approved' then 'follows'
    when 'customisation_change_requested' then 'staff'
    when 'certificate_issued' then 'staff'
    when 'class_archived' then 'staff'
    when 'story_changed_by_staff' then 'staff'
    else 'replies'
  end;
$$;

/**
 * notification_staff_change_json: what staff changed and why, for a story_changed_by_staff row.
 * Input: target_revision_id. Returns: { fields: [changed field names], after: {field: value},
 *   reason_code, reason_text }, or null. The writer sees the reason, never who on the staff
 *   made the change. Internal: notification_json().
 */
create or replace function public.notification_staff_change_json(target_revision_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'fields', (select coalesce(jsonb_agg(field order by field), '[]'::jsonb)
               from jsonb_object_keys(story_revisions.after_values) as field),
    'after', story_revisions.after_values,
    'reason_code', story_revisions.reason_code,
    'reason_text', story_revisions.reason_text)
  from public.story_revisions where story_revisions.id = target_revision_id;
$$;
comment on function public.notification_staff_change_json(uuid) is
  'Internal: what staff changed and why, for the writer''s notification (S1-E11-08).';
revoke execute on function public.notification_staff_change_json(uuid) from public, anon, authenticated;

/**
 * notification_json: as in FORUMS-2d, plus 'staff_change' for story_changed_by_staff (S1-E11-08).
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    'story', (select jsonb_build_object('slug', stories.slug, 'title', stories.title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    -- ADMIN-2b1: what staff changed about the writer's story, and why (S1-E11-08 criterion 4).
    'staff_change', case when target.kind = 'story_changed_by_staff'
                      then public.notification_staff_change_json(target.story_revision_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;


/* ---------- 7. One story's overview, with what staff may change ---------- */

/**
 * admin_story_overview: as in S1-E11-07, plus the settings staff may change
 *   (admin_story_settings_json()), the visibility (shown, restricted, hidden or removed) and each
 *   chapter's moderated state, so screen 8.11 shows every setting (S1-E11-08 criterion 1).
 * Input: target_story_id. Returns: JSON, never chapter text, a year of birth or an email.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Stories;
 *   check_violation (hint no_such_story) when there is no such story.
 * Where it fits: /staff/stories/:storyId → useStaffStory → api/staffStories.ts → here.
 */
create or replace function public.admin_story_overview(target_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story_row public.stories;
begin
  -- Step 1: the same staff as the list.
  if not public.staff_may('stories', 'view') then
    raise exception 'Only staff with the Stories area can open a story.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the story, even one its writer deleted (staff may need it for a case).
  select * into story_row from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'There is no such story.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  -- Step 3: the details, the settings and the chapter list, never the words.
  return public.admin_story_row(story_row) || jsonb_build_object(
    'blurb', story_row.blurb,
    'created_at', story_row.created_at,
    'first_published_at', story_row.first_published_at,
    'deleted_at', story_row.deleted_at,
    'comments_enabled', story_row.comments_enabled,
    'settings', public.admin_story_settings_json(story_row),
    'visibility', public.admin_story_visibility(story_row.id),
    'can_change', public.staff_may('story_changes', 'act'),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', chapters.id,
          'number', chapters.position,
          'title', case when chapters.status = 'published' then chapters.published_title end,
          'status', chapters.status,
          'is_hidden', public.is_moderated_away('chapter', chapters.id),
          'moderated_state', public.moderated_state_of('chapter', chapters.id),
          'words', coalesce(chapters.published_word_count, 0),
          'published_at', chapters.last_published_at,
          'updated_at', chapters.updated_at)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = story_row.id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;

/**
 * admin_story_status: as in S1-E11-07, plus 'restricted' while staff have the story restricted,
 *   so the Stories list and its status filter show it (S1-E11-08).
 */
create or replace function public.admin_story_status(target public.stories)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.moderated_state_of('story', target.id)::text,
    case when public.is_story_restricted(target.id) then 'restricted' end,
    case when target.first_published_at is null then 'draft' else 'published' end);
$$;
